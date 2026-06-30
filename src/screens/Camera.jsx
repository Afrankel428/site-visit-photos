import { useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { buildChecklist } from '../checklist'

export default function Camera() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const fileInputRef = useRef(null)

  // The list of room prompts depends on 2BR vs 3BR.
  const checklist = buildChecklist(state?.bedrooms)
  const [stepIndex, setStepIndex] = useState(0)
  // photos: { id, url, file, room } — room is the checklist label or "Extra".
  const [photos, setPhotos] = useState([])
  // When true, the next captured photos are off-checklist "Extra" shots.
  const [extraMode, setExtraMode] = useState(false)

  const currentRoom = checklist[stepIndex]
  const isLastStep = stepIndex === checklist.length - 1
  const roomPhotos = photos.filter(p => p.room === currentRoom.label)
  const extraPhotos = photos.filter(p => p.room === 'Extra')

  function openCamera(asExtra) {
    setExtraMode(asExtra)
    fileInputRef.current.click()
  }

  function addPhotos(e) {
    const files = Array.from(e.target.files || [])
    const room = extraMode ? 'Extra' : currentRoom.label
    const newPhotos = files.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      url: URL.createObjectURL(file),
      file,
      room,
    }))
    setPhotos(prev => [...prev, ...newPhotos])
    e.target.value = ''
  }

  function removePhoto(id) {
    setPhotos(prev => {
      const target = prev.find(p => p.id === id)
      if (target) URL.revokeObjectURL(target.url)
      return prev.filter(p => p.id !== id)
    })
  }

  function finish() {
    navigate('/summary', { state: { ...state, photoCount: photos.length } })
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
          <span className="step-count">Room {stepIndex + 1} of {checklist.length}</span>
          <span className="step-room">{currentRoom.label}</span>
        </div>

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
          📷 {roomPhotos.length === 0 ? `Take ${currentRoom.label} photo` : 'Add another photo'}
        </button>

        {roomPhotos.length > 0 && (
          <div className="photo-grid">
            {roomPhotos.map(p => (
              <div key={p.id} className="photo-thumb">
                <img src={p.url} alt="" />
                <button className="photo-remove" onClick={() => removePhoto(p.id)} aria-label="Remove photo">×</button>
              </div>
            ))}
          </div>
        )}

        <div className="step-nav">
          <button
            className="btn btn-secondary"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex(i => i - 1)}
          >
            ← Previous room
          </button>
          {isLastStep ? (
            <button className="btn btn-primary" onClick={finish}>
              Continue to Summary
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => setStepIndex(i => i + 1)}>
              Next room →
            </button>
          )}
        </div>

        <hr className="divider" />

        <button className="btn btn-secondary" onClick={() => openCamera(true)}>
          ➕ Add extra (off-checklist) photo
        </button>
        {extraPhotos.length > 0 && (
          <>
            <p className="context-line">{extraPhotos.length} extra photo{extraPhotos.length === 1 ? '' : 's'}</p>
            <div className="photo-grid">
              {extraPhotos.map(p => (
                <div key={p.id} className="photo-thumb">
                  <img src={p.url} alt="" />
                  <button className="photo-remove" onClick={() => removePhoto(p.id)} aria-label="Remove photo">×</button>
                </div>
              ))}
            </div>
          </>
        )}

        <p className="context-line">{photos.length} photo{photos.length === 1 ? '' : 's'} total</p>
      </div>
    </div>
  )
}
