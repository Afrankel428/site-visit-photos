import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { buildChecklist } from '../checklist'
import { GROUNDS_CHECKLIST } from '../groundsChecklist'
import { ISSUE_TYPES, getIssueType } from '../issueTypes'
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
const INTRO_SEEN_KEY = 'svp.cameraIntroSeen.v2'

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
  // photos: { id, file, room, subject, issue:{flagged,typeId,label,code,customType,note}, takenAt }
  const [photos, setPhotos] = useState([])
  const [camStatus, setCamStatus] = useState('starting')
  const [camError, setCamError] = useState('')

  // Flash/torch: only offered when the device+browser support it.
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  // After a dark capture we offer a quick retake ({ id } of the saved photo).
  const [darkPromptId, setDarkPromptId] = useState(null)

  // Issue editor (opened by the red ⚠️ shutter or a thumbnail's flag button).
  const [editingId, setEditingId] = useState(null)
  const [issueType, setIssueType] = useState('')   // chosen issue-type id
  const [customType, setCustomType] = useState('') // typed type when "Other"
  const [noteDraft, setNoteDraft] = useState('')
  const [advanceAfter, setAdvanceAfter] = useState(false) // advance once note saved

  // One-time intro overlay explaining the two shutter buttons.
  const [showIntro, setShowIntro] = useState(() => {
    try { return !localStorage.getItem(INTRO_SEEN_KEY) } catch { return false }
  })

  const isGrounds = meta?.mode === 'grounds'
  const checklist = meta ? (isGrounds ? GROUNDS_CHECKLIST : buildChecklist(meta.bedrooms)) : []
  const currentRoom = checklist[stepIndex]
  const isLastStep = stepIndex === checklist.length - 1
  const roomPhotos = currentRoom ? photos.filter(p => p.room === currentRoom.label) : []
  const flaggedCount = photos.filter(p => p.issue?.flagged).length

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
      // Detect flash/torch support (many devices/browsers have none).
      try {
        const track = stream.getVideoTracks?.()[0]
        const caps = track?.getCapabilities?.() || {}
        setTorchSupported(!!caps.torch)
      } catch { setTorchSupported(false) }
      setTorchOn(false)
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

  function dismissIntro() {
    try { localStorage.setItem(INTRO_SEEN_KEY, '1') } catch { /* ignore */ }
    setShowIntro(false)
  }

  // Save the photo to durable storage FIRST, then update the screen.
  // Every prompt accepts MULTIPLE photos: each shot is added (never replaces an
  // earlier one) and the walk never auto-advances — the manager taps Next/Skip
  // when they're done with the prompt. asFlag=true (red ⚠️ shutter) opens the
  // issue editor for the just-taken photo to capture its required note.
  async function addPhoto(file, { asExtra = false, asFlag = false, dark = false } = {}) {
    const photo = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      visitId: visitIdRef.current,
      file,
      room: asExtra ? 'Extra' : currentRoom.label,
      subject: asExtra ? 'Extra' : currentRoom.id,
      issue: { flagged: false, note: '' },
      takenAt: Date.now(),
    }

    try {
      await savePhoto({
        id: photo.id,
        visitId: photo.visitId,
        room: photo.room,
        subject: photo.subject,
        issue: photo.issue,
        blob: file,
        takenAt: photo.takenAt,
      })
    } catch (err) {
      console.error('Failed to save photo', err)
      setCamError('Could not save that photo — please try again.')
    }

    setPhotos(prev => [...prev, photo])

    if (asFlag) {
      // A flagged photo needs its type + required note; never auto-advances.
      openIssueEditor(photo, false)
    } else if (dark) {
      // Non-flagged but dark: offer a quick retake (works even with no torch).
      setDarkPromptId(photo.id)
    }
  }

  // Rough average brightness (0–255) of the captured frame, sampled sparsely.
  function frameBrightness(ctx, w, h) {
    try {
      const { data } = ctx.getImageData(0, 0, w, h)
      let sum = 0
      let n = 0
      // Sample every ~40th pixel (stride of 160 bytes) — plenty for an average.
      for (let i = 0; i < data.length; i += 160) {
        sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
        n++
      }
      return n ? sum / n : 255
    } catch {
      return 255 // if we can't read pixels, don't nag the user
    }
  }

  function shoot(kind) {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    // Only warn on genuinely dark frames, and not for issue shots (they already
    // open the note editor — we avoid stacking two prompts).
    const dark = kind !== 'issue' && frameBrightness(ctx, canvas.width, canvas.height) < 45
    canvas.toBlob(
      blob => {
        if (!blob) return
        const file = new File([blob], `${currentRoom.id || 'photo'}.jpg`, { type: 'image/jpeg' })
        addPhoto(file, { asExtra: kind === 'extra', asFlag: kind === 'issue', dark })
      },
      'image/jpeg',
      0.9
    )
  }

  // Manual flash/torch toggle. Fails gracefully by hiding itself if the device
  // rejects the constraint (support can be reported but not actually work).
  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks?.()[0]
    if (!track) return
    const next = !torchOn
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] })
      setTorchOn(next)
    } catch {
      setTorchSupported(false)
      setTorchOn(false)
    }
  }

  // Dark-photo prompt actions.
  function keepDarkPhoto() {
    setDarkPromptId(null)
  }
  function retakeDarkPhoto() {
    if (darkPromptId) removePhoto(darkPromptId)
    setDarkPromptId(null)
  }

  function removePhoto(id) {
    deletePhotoRec(id)
    setPhotos(prev => prev.filter(p => p.id !== id))
    if (editingId === id) closeIssueEditor()
  }

  // Open the issue editor for a photo, preloading any existing flag details.
  function openIssueEditor(photo, advance = false) {
    setEditingId(photo.id)
    setIssueType(photo.issue?.typeId || '')
    setCustomType(photo.issue?.customType || '')
    setNoteDraft(photo.issue?.note || '')
    setAdvanceAfter(advance)
  }

  function closeIssueEditor() {
    setEditingId(null)
    setIssueType('')
    setCustomType('')
    setNoteDraft('')
    setAdvanceAfter(false)
  }

  const chosenType = getIssueType(issueType)
  const issueValid =
    !!chosenType &&
    noteDraft.trim().length >= MIN_NOTE_LENGTH &&
    (!chosenType.custom || customType.trim().length > 0)

  function saveIssue() {
    if (!issueValid) return
    const issue = {
      flagged: true,
      typeId: chosenType.id,
      label: chosenType.label,
      code: chosenType.code,
      customType: chosenType.custom ? customType.trim() : '',
      note: noteDraft.trim(),
    }
    updatePhotoRec(editingId, { issue })
    setPhotos(prev => prev.map(p => (p.id === editingId ? { ...p, issue } : p)))
    const shouldAdvance = advanceAfter
    closeIssueEditor()
    if (shouldAdvance) goNext()
  }

  // Remove the flag but keep the photo (turns it back into a normal photo).
  function clearIssue() {
    const issue = { flagged: false, note: '' }
    updatePhotoRec(editingId, { issue })
    setPhotos(prev => prev.map(p => (p.id === editingId ? { ...p, issue } : p)))
    const shouldAdvance = advanceAfter
    closeIssueEditor()
    if (shouldAdvance) goNext()
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
    const flagged = p.issue?.flagged
    const cls = ['photo-thumb', flagged ? 'photo-flagged' : ''].join(' ').trim()
    const badge = flagged ? (p.issue.customType?.trim() || p.issue.label) : ''
    return (
      <Thumb key={p.id} file={p.file} className={cls}>
        <button className="photo-remove" onClick={() => removePhoto(p.id)} aria-label="Remove photo">×</button>
        <button
          className={`photo-flag ${flagged ? 'photo-flag-on' : ''}`}
          onClick={() => openIssueEditor(p, false)}
          aria-label={flagged ? 'Edit issue' : 'Flag an issue'}
        >
          ⚠️
        </button>
        {badge && <span className="photo-issue-badge">{badge}</span>}
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

        <p className="multi-hint">
          📸 Take as many photos as you need here, then tap {isLastStep ? 'Finish' : 'Next'}.
        </p>

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
          {/* Flash/torch toggle — only shown when the device supports it. */}
          {camStatus === 'ready' && torchSupported && (
            <button
              className={`torch-toggle ${torchOn ? 'torch-on' : ''}`}
              onClick={toggleTorch}
              aria-label={torchOn ? 'Turn flashlight off' : 'Turn flashlight on'}
            >
              🔦 {torchOn ? 'On' : 'Off'}
            </button>
          )}
        </div>

        {roomPhotos.length > 0 && <div className="photo-grid">{roomPhotos.map(renderThumb)}</div>}

        <button
          className="btn btn-secondary"
          disabled={camStatus !== 'ready'}
          onClick={() => shoot('extra')}
        >
          ➕ Add extra (off-checklist) photo
        </button>

        <p className="context-line">
          {photos.length} photo{photos.length === 1 ? '' : 's'} so far
          {flaggedCount > 0 && ` · ⚠️ ${flaggedCount} issue${flaggedCount === 1 ? '' : 's'} flagged`}
        </p>
      </div>

      {/* Pinned control row. The two shutters sit side by side so a problem can
          be flagged in one tap. Back and Skip flank them. Never moves. */}
      <div className="camera-footer">
        <div className="camera-controls">
          <button
            className="ctrl-btn"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex(i => i - 1)}
          >
            ← Back
          </button>

          <div className="shutter-pair">
            <div className="shutter-cell">
              <button
                className="shutter"
                disabled={camStatus !== 'ready'}
                onClick={() => shoot('photo')}
                aria-label="Take a normal photo"
              >
                <span className="shutter-ring" />
              </button>
              <span className="shutter-label">Photo</span>
            </div>
            <div className="shutter-cell">
              <button
                className="shutter shutter-issue"
                disabled={camStatus !== 'ready'}
                onClick={() => shoot('issue')}
                aria-label="Take a photo and flag a problem"
              >
                <span className="shutter-issue-icon">⚠️</span>
              </button>
              <span className="shutter-label shutter-label-issue">Issue</span>
            </div>
          </div>

          <button className="ctrl-btn" onClick={() => goNext(photos)}>
            {isLastStep ? 'Finish →' : roomPhotos.length > 0 ? 'Next →' : 'Skip →'}
          </button>
        </div>
      </div>

      {/* One-time intro explaining the two shutters. */}
      {showIntro && (
        <div className="modal-backdrop" onClick={dismissIntro}>
          <div className="modal intro-modal" onClick={e => e.stopPropagation()}>
            <h3>Two buttons, two jobs</h3>
            <p className="intro-line">
              <span className="intro-swatch intro-swatch-green" />
              <span><strong>Green button</strong> = take a normal photo.</span>
            </p>
            <p className="intro-line">
              <span className="intro-swatch intro-swatch-red">⚠️</span>
              <span>
                <strong>Red ⚠️ button</strong> = flag a problem (mold, damage,
                hole, etc.) — you'll pick the type and add a note.
              </span>
            </p>
            <button className="btn btn-primary" onClick={dismissIntro}>Got it</button>
          </div>
        </div>
      )}

      {/* Dark-photo prompt — offered after a dark capture (torch or not). */}
      {darkPromptId && (
        <div className="modal-backdrop" onClick={keepDarkPhoto}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>🌒 This photo looks dark</h3>
            <p className="note">
              {torchSupported
                ? 'Turn on the flashlight (🔦 in the corner of the camera) and retake, or keep this one.'
                : 'Add more light if you can, then retake — or keep this one.'}
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={keepDarkPhoto}>Keep it</button>
              <button className="btn btn-primary" onClick={retakeDarkPhoto}>Retake</button>
            </div>
          </div>
        </div>
      )}

      {/* Issue editor: pick a type + required note. */}
      {editingId && (
        <div className="modal-backdrop" onClick={closeIssueEditor}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>⚠️ Flag a problem</h3>
            <p className="note">Pick the type of problem and add a short note.</p>

            <div className="issue-type-grid">
              {ISSUE_TYPES.map(t => (
                <button
                  key={t.id}
                  className={`issue-type-chip ${issueType === t.id ? 'issue-type-chip-on' : ''}`}
                  onClick={() => setIssueType(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {chosenType?.custom && (
              <input
                className="note-input"
                type="text"
                placeholder="Type the problem (e.g. Loose railing)"
                value={customType}
                onChange={e => setCustomType(e.target.value)}
              />
            )}

            <textarea
              className="note-input"
              rows={3}
              placeholder="e.g. Cracked tile under sink, water stain on ceiling"
              value={noteDraft}
              onChange={e => setNoteDraft(e.target.value)}
            />

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={clearIssue}>
                Not an issue
              </button>
              <button className="btn btn-primary" disabled={!issueValid} onClick={saveIssue}>
                Save issue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
