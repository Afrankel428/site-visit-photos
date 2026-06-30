import { useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export default function Camera() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const fileInputRef = useRef(null)
  const [photos, setPhotos] = useState([])

  function addPhotos(e) {
    const files = Array.from(e.target.files || [])
    const newPhotos = files.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      url: URL.createObjectURL(file),
      file,
    }))
    setPhotos(prev => [...prev, ...newPhotos])
    // Reset so taking the same shot again still fires onChange.
    e.target.value = ''
  }

  function removePhoto(id) {
    setPhotos(prev => {
      const target = prev.find(p => p.id === id)
      if (target) URL.revokeObjectURL(target.url)
      return prev.filter(p => p.id !== id)
    })
  }

  function continueToSummary() {
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

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={addPhotos}
          style={{ display: 'none' }}
        />

        <button className="btn btn-primary" onClick={() => fileInputRef.current.click()}>
          📷 Take Photo
        </button>

        {photos.length === 0 ? (
          <div className="placeholder-box">
            <div className="placeholder-icon">🖼️</div>
            <p>No photos yet — tap “Take Photo” to add some.</p>
          </div>
        ) : (
          <>
            <p className="context-line">{photos.length} photo{photos.length === 1 ? '' : 's'}</p>
            <div className="photo-grid">
              {photos.map(p => (
                <div key={p.id} className="photo-thumb">
                  <img src={p.url} alt="" />
                  <button className="photo-remove" onClick={() => removePhoto(p.id)} aria-label="Remove photo">×</button>
                </div>
              ))}
            </div>
          </>
        )}

        <button
          className="btn btn-primary"
          disabled={photos.length === 0}
          onClick={continueToSummary}
        >
          Continue to Summary
        </button>
      </div>
    </div>
  )
}
