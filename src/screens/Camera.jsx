import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { buildChecklist } from '../checklist'
import { GROUNDS_CHECKLIST } from '../groundsChecklist'
import Thumb from '../Thumb'
import {
  saveVisitMeta,
  getInProgressVisit,
  completeVisit,
  savePhoto,
  deletePhotoRec,
  updatePhotoRec,
  loadPhotos,
} from '../visitStore'

const MIN_NOTE_LENGTH = 3

export default function Camera() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const resuming = !!state?.resume
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  // Stable visit id for this walkthrough (new visits get a fresh one).
  const visitIdRef = useRef(`v-${Date.now()}-${Math.random().toString(36).slice(2)}`)

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
          mode: state?.mode,           // 'grounds' for the property-wide walk
          shortName: state?.shortName, // filename prefix for grounds photos
        }
  )
  const [loaded, setLoaded] = useState(!resuming)
  const [stepIndex, setStepIndex] = useState(0)
  // photos: { id, file, room, subject, damage, mold, takenAt }
  const [photos, setPhotos] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [camStatus, setCamStatus] = useState('starting')
  const [camError, setCamError] = useState('')

  const isGrounds = meta?.mode === 'grounds'
  const checklist = meta ? (isGrounds ? GROUNDS_CHECKLIST : buildChecklist(meta.bedrooms)) : []
  const currentRoom = checklist[stepIndex]
  const isLastStep = stepIndex === checklist.length - 1
  const roomPhotos = currentRoom ? photos.filter(p => p.room === currentRoom.label) : []
  const flaggedCount = photos.filter(p => p.damage?.flagged).length
  const moldCount = photos.filter(p => p.mold?.flagged).length

  // On resume, load the saved visit and its photos from durable storage.
  useEffect(() => {
    if (!resuming) return
    let cancelled = false
    getInProgressVisit().then(async v => {
      if (cancelled) return
      if (!v) { setLoaded(true); return }
      visitIdRef.current = v.id
      setMeta({
        property: v.property,
        unit: v.unit,
        visitType: v.visitType,
        bedrooms: v.bedrooms,
        bathrooms: v.bathrooms,
        mode: v.mode,
        shortName: v.shortName,
      })
      const stored = await loadPhotos(v.id)
      if (cancelled) return
      setPhotos(stored.map(p => ({ ...p, file: p.blob })))
      setStepIndex(v.stepIndex || 0)
      setLoaded(true)
    })
    return () => { cancelled = true }
  }, [resuming])

  // Keep the (tiny) visit record up to date — never rewrites photos.
  useEffect(() => {
    if (!loaded || !meta) return
    saveVisitMeta({
      id: visitIdRef.current,
      ...meta,
      stepIndex,
      status: 'in-progress',
      updatedAt: Date.now(),
    })
  }, [stepIndex, loaded, meta])

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

  function goNext(latestPhotos) {
    if (isLastStep) finish(latestPhotos)
    else setStepIndex(i => i + 1)
  }

  // Save the photo to durable storage FIRST, then update the screen/advance.
  async function addPhoto(file, asExtra) {
    // "multi" prompts (e.g. grounds "Any problem areas") keep every shot and
    // never auto-advance — the manager taps Finish when done.
    const isMulti = !asExtra && currentRoom.multi
    const append = asExtra || isMulti

    const photo = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      visitId: visitIdRef.current,
      file,
      room: asExtra ? 'Extra' : currentRoom.label,
      subject: asExtra ? 'Extra' : currentRoom.id,
      damage: { flagged: false, note: '' },
      mold: { flagged: false },
      takenAt: Date.now(),
    }

    // One photo per single prompt: re-shooting replaces the old one.
    // Extra and multi prompts append instead (nothing replaced).
    const replaced = append ? [] : photos.filter(p => p.room === currentRoom.label)

    try {
      await savePhoto({
        id: photo.id,
        visitId: photo.visitId,
        room: photo.room,
        subject: photo.subject,
        damage: photo.damage,
        mold: photo.mold,
        blob: file,
        takenAt: photo.takenAt,
      })
      for (const old of replaced) await deletePhotoRec(old.id)
    } catch (err) {
      console.error('Failed to save photo', err)
      setCamError('Could not save that photo — please try again.')
    }

    const next = append
      ? [...photos, photo]
      : [...photos.filter(p => p.room !== currentRoom.label), photo]
    setPhotos(next)
    if (!append) goNext(next)
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
        addPhoto(file, asExtra)
      },
      'image/jpeg',
      0.9
    )
  }

  function removePhoto(id) {
    deletePhotoRec(id)
    setPhotos(prev => prev.filter(p => p.id !== id))
    if (editingId === id) setEditingId(null)
  }

  function startFlag(photo) {
    setEditingId(photo.id)
    setNoteDraft(photo.damage?.note || '')
  }

  function saveNote() {
    const damage = { flagged: true, note: noteDraft.trim() }
    updatePhotoRec(editingId, { damage })
    setPhotos(prev => prev.map(p => (p.id === editingId ? { ...p, damage } : p)))
    setEditingId(null)
    setNoteDraft('')
  }

  function clearFlag() {
    const damage = { flagged: false, note: '' }
    updatePhotoRec(editingId, { damage })
    setPhotos(prev => prev.map(p => (p.id === editingId ? { ...p, damage } : p)))
    setEditingId(null)
    setNoteDraft('')
  }

  function toggleMold(id) {
    setPhotos(prev =>
      prev.map(p => {
        if (p.id !== id) return p
        const mold = { flagged: !p.mold?.flagged }
        updatePhotoRec(id, { mold })
        return { ...p, mold }
      })
    )
  }

  // Tap the top-left Back: everything is already saved, so just go home.
  function leaveToHome() {
    navigate('/')
  }

  // Mark the visit completed — it and its photos STAY stored until uploaded.
  async function finish() {
    await completeVisit(visitIdRef.current)
    navigate('/summary', { state: { ...meta, visitId: visitIdRef.current } })
  }

  function renderThumb(p) {
    const cls = [
      'photo-thumb',
      p.damage?.flagged ? 'photo-flagged' : '',
      p.mold?.flagged ? 'photo-molded' : '',
    ].join(' ').trim()
    return (
      <Thumb key={p.id} file={p.file} className={cls}>
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
      </Thumb>
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
    <div className="screen camera-screen">
      <header className="screen-header">
        <button className="btn-back" onClick={leaveToHome}>← Back</button>
        <h2>Take Photos</h2>
      </header>

      {/* Everything above the controls scrolls; the control row below stays pinned. */}
      <div className="camera-scroll">
        <p className="context-line">
          {isGrounds
            ? `${meta.property} — ${meta.visitType}`
            : `${meta.property} — Unit ${meta.unit} — ${meta.visitType}`}
        </p>

        <div className="step-banner">
          <span className="step-count">Step {stepIndex + 1} of {checklist.length}</span>
          <span className="step-room">{currentRoom.label}</span>
        </div>

        {currentRoom.reminder && <div className="reminder">💡 {currentRoom.reminder}</div>}

        <div className="viewfinder">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            style={{ display: camStatus === 'ready' ? 'block' : 'none' }}
          />
          {camStatus === 'starting' && <div className="viewfinder-hint">Starting camera…</div>}
          {camStatus === 'error' && (
            <div className="viewfinder-hint viewfinder-error">
              <div className="placeholder-icon">📷</div>
              <p><strong>Camera problem</strong></p>
              <p>{camError}</p>
              <button className="btn btn-primary" onClick={startCamera}>Enable camera</button>
            </div>
          )}
        </div>

        {roomPhotos.length > 0 && <div className="photo-grid">{roomPhotos.map(renderThumb)}</div>}

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

      {/* Pinned control row: step back · shutter · skip. Never moves between steps. */}
      <div className="camera-footer">
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
          <button className="ctrl-btn" onClick={() => goNext(photos)}>
            {isLastStep ? 'Finish →' : 'Skip →'}
          </button>
        </div>
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
