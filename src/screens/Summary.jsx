import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { loadPhotos, deletePhotoRec } from '../visitStore'

export default function Summary() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const visitId = state?.visitId
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  // Photos come straight from durable storage — they survive app closes.
  const [photos, setPhotos] = useState([])

  useEffect(() => {
    if (!visitId) return
    let cancelled = false
    loadPhotos(visitId).then(stored => {
      if (cancelled) return
      setPhotos(stored.map(p => ({ ...p, url: URL.createObjectURL(p.blob) })))
    })
    return () => { cancelled = true }
  }, [visitId])

  const flaggedCount = photos.filter(p => p.damage?.flagged).length
  const moldCount = photos.filter(p => p.mold?.flagged).length

  function deletePhoto(id) {
    deletePhotoRec(id)
    setPhotos(prev => {
      const target = prev.find(p => p.id === id)
      if (target?.url) URL.revokeObjectURL(target.url)
      return prev.filter(p => p.id !== id)
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
          <p><strong>Upload to SharePoint coming next</strong></p>
          <p>This visit is saved on your phone and will stay saved until it uploads.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          Start New Visit
        </button>
      </div>
    </div>
  )
}
