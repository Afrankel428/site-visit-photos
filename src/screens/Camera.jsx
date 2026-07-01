import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { buildChecklist } from '../checklist'

const MIN_NOTE_LENGTH = 3

export default function Camera() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const fallbackInputRef = useRef(null)

  // The list of prompts depends on 2BR vs 3BR.
  const checklist = buildChecklist(state?.bedrooms)
  const [stepIndex, setStepIndex] = useState(0)
  // photos: { id, url, file, room, subject, damage: { flagged, note }, mold: { flagged } }
  const [photos, setPhotos] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [noteDraft, setNoteDraft] = useState('')
  // Live-camera status: 'starting' | 'ready' | 'error'
  const [camStatus, setCamStatus] = useState('starting')

  const currentRoom = checklist[stepIndex]
  const isLastStep = stepIndex === checklist.length - 1
  const roomPhotos = photos.filter(p => p.room === currentRoom.label)
  const flaggedCount = photos.filter(p => p.damage?.flagged).length
  const moldCount = photos.filter(p => p.mold?.flagged).length

  // Start the live camera once when the screen opens; stop it on leaving.
  useEffect(() => {
    let cancelled = false
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
        setCamStatus('ready')
      } catch {
        setCamStatus('error')
      }
    }
    start()
    return () => {
      cancelled = true
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    }
  }, [])

  function goNext() {
    if (isLastStep) finish()
    else setStepIndex(i => i + 1)
  }

  function addPhoto(file, url, asExtra) {
    const photo = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      url,
      file,
      room: asExtra ? 'Extra' : currentRoom.label,
      subject: asExtra ? 'Extra' : currentRoom.id,
      damage: { flagged: false, note: '' },
      mold: { flagged: false },
    }
    setPhotos(prev => [...prev, photo])
    // Zero-friction: a checklist shot auto-advances. Extra shots do not.
    if (!asExtra) goNext()
  }

  // Capture the current live frame — no native "Use Photo / Retake" step.
  function shoot(asExtra) {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob(
      blob => {
        if (!blob) return
        const file = new File([blob], `${currentRoom.id || 'photo'}.jpg`, { type: 'image/jpeg' })
        addPhoto(file, URL.createObjectURL(blob), asExtra)
      },
      'image/jpeg',
      0.9
    )
  }

  // Fallback path (older devices / camera blocked): the native file picker.
  function onFallbackFiles(e) {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    files.forEach(file => addPhoto(file, URL.createObjectURL(file), false))
  }

  function removePhoto(id) {
    setPhotos(prev => {
      const target = prev.find(p => p.id === id)
      if (target) URL.revokeObjectURL(target.url)
      return prev.filter(p => p.id !== id)
    })
    if (editingId === id) setEditingId(null)
  }

  function startFlag(photo) {
    setEditingId(photo.id)
    setNoteDraft(photo.damage?.note || '')
  }

  function saveNote() {
    setPhotos(prev =>
      prev.map(p =>
        p.id === editingId ? { ...p, damage: { flagged: true, note: noteDraft.trim() } } : p
      )
    )
    setEditingId(null)
    setNoteDraft('')
  }

  function clearFlag() {
    setPhotos(prev =>
      prev.map(p => (p.id === editingId ? { ...p, damage: { flagged: false, note: '' } } : p))
    )
    setEditingId(null)
    setNoteDraft('')
  }

  function toggleMold(id) {
    setPhotos(prev =>
      prev.map(p => (p.id === id ? { ...p, mold: { flagged: !p.mold?.flagged } } : p))
    )
  }

  function finish() {
    navigate('/summary', {
      state: { ...state, photoCount: photos.length, flaggedCount, moldCount },
    })
  }

  function renderThumb(p) {
    const cls = [
      'photo-thumb',
      p.damage?.flagged ? 'photo-flagged' : '',
      p.mold?.flagged ? 'photo-molded' : '',
    ].join(' ').trim()
    return (
      <div key={p.id} className={cls}>
        <img src={p.url} alt="" />
        <button className="photo-remove" onClick={() => removePhoto(p.id)} aria-label="Remove photo">×</button>
        <button
          className={`photo-flag ${p.damage?.flagged ? 'photo-flag-on' : ''}`}
          onClick={() => startFlag(p)}
          aria-label={p.damage?.flagged ? 'Edit damage note' : 'Flag damage'}
        >
          ⚠️
        </button>
        <button
          className={`photo-mold ${p.mold?.flagged ? 'photo-mold-on' : ''}`}
          onClick={() => toggleMold(p.id)}
          aria-label={p.mold?.flagged ? 'Unflag mold' : 'Flag mold'}
        >
          🍄
        </button>
      </div>
    )
  }

  return (
    <div className="screen">
      <header className="screen-header">
        <button className="btn-back" onClick={() => navigate(-1)}>← Back</button>
        <h2>Take Photos</h2>
      </header>
      <div className="screen-content">
        <p className="context-line">{state?.property} — Unit {state?.unit} — {state?.visitType}</p>

        <div className="step-banner">
          <span className="step-count">Step {stepIndex + 1} of {checklist.length}</span>
          <span className="step-room">{currentRoom.label}</span>
        </div>

        {currentRoom.reminder && <div className="reminder">💡 {currentRoom.reminder}</div>}

        {/* Live viewfinder — tapping the shutter captures instantly, no confirmation. */}
        {camStatus !== 'error' ? (
          <div className="viewfinder">
            <video ref={videoRef} playsInline muted autoPlay />
            {camStatus === 'starting' && <div className="viewfinder-hint">Starting camera…</div>}
          </div>
        ) : (
          <div className="placeholder-box">
            <div className="placeholder-icon">📷</div>
            <p><strong>Camera unavailable</strong></p>
            <p>Allow camera access in your browser, or use the button below to take a photo.</p>
            <input
              ref={fallbackInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onFallbackFiles}
              style={{ display: 'none' }}
            />
            <button className="btn btn-secondary" onClick={() => fallbackInputRef.current.click()}>
              📷 Take photo
            </button>
          </div>
        )}

        {camStatus === 'ready' && (
          <button className="shutter" onClick={() => shoot(false)} aria-label="Take photo">
            <span className="shutter-ring" />
          </button>
        )}

        {/* Photos already taken for this prompt (visible if you step back to it). */}
        {roomPhotos.length > 0 && <div className="photo-grid">{roomPhotos.map(renderThumb)}</div>}

        <div className="step-nav">
          <button
            className="btn btn-secondary"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex(i => i - 1)}
          >
            ← Back
          </button>
          <button className="btn btn-secondary" onClick={goNext}>
            {isLastStep ? 'Finish →' : 'Skip →'}
          </button>
        </div>

        <hr className="divider" />

        <button
          className="btn btn-secondary"
          disabled={camStatus !== 'ready'}
          onClick={() => shoot(true)}
        >
          ➕ Add extra (off-checklist) photo
        </button>

        <p className="context-line">
          {photos.length} photo{photos.length === 1 ? '' : 's'} so far
          {flaggedCount > 0 && ` · ⚠️ ${flaggedCount} damage`}
          {moldCount > 0 && ` · 🍄 ${moldCount} mold`}
        </p>
      </div>

      {editingId && (
        <div className="modal-backdrop" onClick={() => setEditingId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>⚠️ Describe the damage</h3>
            <p className="note">A short note is required to flag this photo.</p>
            <textarea
              className="note-input"
              rows={3}
              placeholder="e.g. Cracked tile under sink, water stain on ceiling"
              value={noteDraft}
              autoFocus
              onChange={e => setNoteDraft(e.target.value)}
            />
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={clearFlag}>
                Remove flag
              </button>
              <button
                className="btn btn-primary"
                disabled={noteDraft.trim().length < MIN_NOTE_LENGTH}
                onClick={saveNote}
              >
                Save note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
