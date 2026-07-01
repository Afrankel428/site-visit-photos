import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { buildChecklist } from '../checklist'
import { saveVisit, clearVisit, loadVisit } from '../visitStore'
import { visitHandoff } from '../visitHandoff'

const MIN_NOTE_LENGTH = 3

export default function Camera() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const resuming = !!state?.resume
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  // Visit details: from the flow for a new visit, or loaded from storage on resume.
  const [meta, setMeta] = useState(
    resuming
      ? null
      : {
          property: state?.property,
          unit: state?.unit,
          visitType: state?.visitType,
          bedrooms: state?.bedrooms,
          bathrooms: state?.bathrooms,
        }
  )
  const [loaded, setLoaded] = useState(!resuming)
  const [stepIndex, setStepIndex] = useState(0)
  // photos: { id, url, file, room, subject, damage: { flagged, note }, mold: { flagged } }
  const [photos, setPhotos] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [camStatus, setCamStatus] = useState('starting')
  const [camError, setCamError] = useState('')

  const checklist = meta ? buildChecklist(meta.bedrooms) : []
  const currentRoom = checklist[stepIndex]
  const isLastStep = stepIndex === checklist.length - 1
  const roomPhotos = currentRoom ? photos.filter(p => p.room === currentRoom.label) : []
  const flaggedCount = photos.filter(p => p.damage?.flagged).length
  const moldCount = photos.filter(p => p.mold?.flagged).length

  // On resume, load the saved visit and rebuild photo previews from stored blobs.
  useEffect(() => {
    if (!resuming) return
    let cancelled = false
    loadVisit().then(v => {
      if (cancelled) return
      if (!v) { setLoaded(true); return }
      setMeta({
        property: v.property,
        unit: v.unit,
        visitType: v.visitType,
        bedrooms: v.bedrooms,
        bathrooms: v.bathrooms,
      })
      setPhotos(
        (v.photos || []).map(p => ({ ...p, file: p.blob, url: URL.createObjectURL(p.blob) }))
      )
      setStepIndex(v.stepIndex || 0)
      setLoaded(true)
    })
    return () => { cancelled = true }
  }, [resuming])

  // Auto-save the in-progress visit whenever photos or the step change.
  useEffect(() => {
    if (!loaded || !meta) return
    saveVisit({
      ...meta,
      stepIndex,
      photos: photos.map(p => ({
        id: p.id,
        room: p.room,
        subject: p.subject,
        damage: p.damage,
        mold: p.mold,
        blob: p.file,
      })),
      updatedAt: Date.now(),
    })
  }, [photos, stepIndex, loaded, meta])

  async function startCamera() {
    setCamStatus('starting')
    setCamError('')
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('This browser does not support in-app camera access.')
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setCamStatus('ready')
    } catch (err) {
      setCamStatus('error')
      setCamError(
        err?.name === 'NotAllowedError'
          ? 'Camera access is blocked. In Safari, tap the “aA” in the address bar → Website Settings → Camera → Allow, then tap “Enable camera”.'
          : 'Could not start the camera. Make sure no other app is using it, then tap “Enable camera”.'
      )
    }
  }

  useEffect(() => {
    startCamera()
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (asExtra) {
      // Off-checklist extras are kept alongside each other.
      setPhotos(prev => [...prev, photo])
    } else {
      // One photo per checklist prompt: re-shooting replaces the old one.
      setPhotos(prev => {
        prev
          .filter(p => p.room === currentRoom.label)
          .forEach(p => URL.revokeObjectURL(p.url))
        return [...prev.filter(p => p.room !== currentRoom.label), photo]
      })
      goNext()
    }
  }

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

  // Tap the top-left Back: the visit is already auto-saved, so just go home.
  function leaveToHome() {
    navigate('/')
  }

  async function finish() {
    await clearVisit() // visit completed — no longer "in progress"
    visitHandoff.photos = photos // hand the actual photos to the summary
    navigate('/summary', { state: { ...meta } })
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

  // Resuming but there was nothing saved — send them home.
  if (loaded && !meta) return <Navigate to="/" replace />
  // Still loading the saved visit.
  if (!loaded || !currentRoom) {
    return (
      <div className="screen">
        <div className="screen-content centered"><p>Loading visit…</p></div>
      </div>
    )
  }

  return (
    <div className="screen">
      <header className="screen-header">
        <button className="btn-back" onClick={leaveToHome}>← Back</button>
        <h2>Take Photos</h2>
      </header>
      <div className="screen-content">
        <p className="context-line">{meta.property} — Unit {meta.unit} — {meta.visitType}</p>

        <div className="step-banner">
          <span className="step-count">Step {stepIndex + 1} of {checklist.length}</span>
          <span className="step-room">{currentRoom.label}</span>
        </div>

        {currentRoom.reminder && <div className="reminder">💡 {currentRoom.reminder}</div>}

        <div className="viewfinder" style={{ display: camStatus === 'ready' ? 'block' : 'none' }}>
          <video ref={videoRef} playsInline muted autoPlay />
        </div>

        {camStatus === 'starting' && (
          <div className="viewfinder"><div className="viewfinder-hint">Starting camera…</div></div>
        )}

        {camStatus === 'error' && (
          <div className="placeholder-box">
            <div className="placeholder-icon">📷</div>
            <p><strong>Camera not started</strong></p>
            <p>{camError}</p>
            <button className="btn btn-primary" onClick={startCamera}>Enable camera</button>
          </div>
        )}

        {roomPhotos.length > 0 && <div className="photo-grid">{roomPhotos.map(renderThumb)}</div>}

        {/* One bottom row: step back · shutter · skip. */}
        <div className="camera-controls">
          <button
            className="ctrl-btn"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex(i => i - 1)}
          >
            ← Back
          </button>
          <button
            className="shutter"
            disabled={camStatus !== 'ready'}
            onClick={() => shoot(false)}
            aria-label="Take photo"
          >
            <span className="shutter-ring" />
          </button>
          <button className="ctrl-btn" onClick={goNext}>
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
