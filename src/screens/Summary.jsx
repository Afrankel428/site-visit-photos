import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { visitHandoff } from '../visitHandoff'

export default function Summary() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  // Photos are handed over from the camera screen (kept in memory, not history).
  const [photos, setPhotos] = useState(visitHandoff.photos)

  const flaggedCount = photos.filter(p => p.damage?.flagged).length
  const moldCount = photos.filter(p => p.mold?.flagged).length

  function deletePhoto(id) {
    setPhotos(prev => {
      const target = prev.find(p => p.id === id)
      if (target?.url) URL.revokeObjectURL(target.url)
      const next = prev.filter(p => p.id !== id)
      visitHandoff.photos = next // keep the shared copy in sync
      return next
    })
  }

  return (
    <div className="screen">
      <header className="screen-header">
        <button className="btn-back" onClick={() => navigate(-1)}>← Back</button>
        <h2>Summary</h2>
      </header>
      <div className="screen-content">
        <div className="summary-card">
          <div className="summary-row"><span>Property</span><strong>{state?.property}</strong></div>
          <div className="summary-row"><span>Unit</span><strong>{state?.unit}</strong></div>
          <div className="summary-row"><span>Visit Type</span><strong>{state?.visitType}</strong></div>
          <div className="summary-row"><span>Date</span><strong>{today}</strong></div>
          <div className="summary-row"><span>Photos</span><strong>{photos.length}</strong></div>
          <div className="summary-row"><span>⚠️ Damage flagged</span><strong>{flaggedCount}</strong></div>
          <div className="summary-row"><span>🍄 Mold flagged</span><strong>{moldCount}</strong></div>
        </div>

        {photos.length > 0 && (
          <>
            <p className="context-line">Review photos — tap × to delete any before saving.</p>
            <div className="photo-grid">
              {photos.map(p => {
                const cls = [
                  'photo-thumb',
                  p.damage?.flagged ? 'photo-flagged' : '',
                  p.mold?.flagged ? 'photo-molded' : '',
                ].join(' ').trim()
                return (
                  <div key={p.id} className={cls}>
                    <img src={p.url} alt="" />
                    <button
                      className="photo-remove"
                      onClick={() => deletePhoto(p.id)}
                      aria-label="Delete photo"
                    >
                      ×
                    </button>
                  </div>
                )
              })}
            </div>
          </>
        )}

        <div className="placeholder-box">
          <div className="placeholder-icon">☁️</div>
          <p><strong>Upload to SharePoint coming in Phase 4–5</strong></p>
          <p>Photos will upload automatically to your company's shared folder.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          Start New Visit
        </button>
      </div>
    </div>
  )
}
