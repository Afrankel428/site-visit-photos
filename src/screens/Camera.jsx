import { useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { buildChecklist } from '../checklist'

const MIN_NOTE_LENGTH = 3

export default function Camera() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const fileInputRef = useRef(null)

  // The list of prompts depends on 2BR vs 3BR.
  const checklist = buildChecklist(state?.bedrooms)
  const [stepIndex, setStepIndex] = useState(0)
  // photos: { id, url, file, room, damage: { flagged, note } }
  const [photos, setPhotos] = useState([])
  const [extraMode, setExtraMode] = useState(false)
  // The photo whose damage note is currently being edited, plus the draft text.
  const [editingId, setEditingId] = useState(null)
  const [noteDraft, setNoteDraft] = useState('')

  const currentRoom = checklist[stepIndex]
  const isLastStep = stepIndex === checklist.length - 1
  const roomPhotos = photos.filter(p => p.room === currentRoom.label)
  const flaggedCount = photos.filter(p => p.damage?.flagged).length

  function goNext() {
    if (isLastStep) finish()
    else setStepIndex(i => i + 1)
  }

  function openCamera(asExtra) {
    setExtraMode(asExtra)
    fileInputRef.current.click()
  }

  function addPhotos(e) {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length === 0) return // camera cancelled — stay on this prompt

    const asExtra = extraMode
    const room = asExtra ? 'Extra' : currentRoom.label
    const newPhotos = files.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      url: URL.createObjectURL(file),
      file,
      room,
      damage: { flagged: false, note: '' },
    }))
    setPhotos(prev => [...prev, ...newPhotos])
    // Zero-friction: taking a checklist photo auto-advances to the next prompt.
    // Extra (off-checklist) photos do NOT advance.
    if (!asExtra) goNext()
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

  function finish() {
    navigate('/summary', {
      state: { ...state, photoCount: photos.length, flaggedCount },
    })
  }

  function renderThumb(p) {
    return (
      <div key={p.id} className={`photo-thumb ${p.damage?.flagged ? 'photo-flagged' : ''}`}>
        <img src={p.url} alt="" />
        <button className="photo-remove" onClick={() => removePhoto(p.id)} aria-label="Remove photo">×</button>
        <button
          className={`photo-flag ${p.damage?.flagged ? 'photo-flag-on' : ''}`}
          onClick={() => startFlag(p)}
          aria-label={p.damage?.flagged ? 'Edit damage note' : 'Flag damage'}
        >
          ⚠️
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

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={addPhotos}
          style={{ display: 'none' }}
        />

        <button className="btn btn-primary" onClick={() => openCamera(false)}>
          📷 Take photo
        </button>

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

        <button className="btn btn-secondary" onClick={() => openCamera(true)}>
          ➕ Add extra (off-checklist) photo
        </button>

        <p className="context-line">
          {photos.length} photo{photos.length === 1 ? '' : 's'} so far
          {flaggedCount > 0 && ` · ⚠️ ${flaggedCount} flagged`}
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
