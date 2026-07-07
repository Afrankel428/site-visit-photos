import { useState } from 'react'
import Thumb from './Thumb'

// A browsable gallery of a visit's photos. Thumbnails and the full-screen view
// both render from the STORED Blob via <Thumb> (FileReader data URLs), so they
// display correctly inside an installed iOS PWA. Tapping a photo opens it
// full-screen with optional Retake/Delete.
export default function PhotoGallery({ photos, onClose, onDelete, onRetake }) {
  const [openId, setOpenId] = useState(null)
  const open = photos.find(p => p.id === openId)
  const fileOf = p => p.blob || p.file

  function badgeFor(p) {
    if (p.issue?.flagged) {
      return { text: p.issue.customType?.trim() || p.issue.label, cls: 'photo-issue-badge' }
    }
    if (p.label) return { text: p.label, cls: 'photo-label-badge' }
    return null
  }

  return (
    <div className="gallery-overlay">
      <header className="screen-header gallery-header">
        <button className="btn-back" onClick={onClose}>← Close</button>
        <h2>Photos ({photos.length})</h2>
      </header>

      {photos.length === 0 ? (
        <p className="gallery-empty">No photos yet.</p>
      ) : (
        <div className="gallery-grid">
          {photos.map(p => {
            const badge = badgeFor(p)
            const flagged = p.issue?.flagged
            return (
              <button key={p.id} className="gallery-cell" onClick={() => setOpenId(p.id)}>
                <Thumb file={fileOf(p)} className={`photo-thumb ${flagged ? 'photo-flagged' : ''}`} />
                {badge && <span className={badge.cls}>{badge.text}</span>}
              </button>
            )
          })}
        </div>
      )}

      {open && (
        <div className="gallery-full" onClick={() => setOpenId(null)}>
          <div className="gallery-full-inner" onClick={e => e.stopPropagation()}>
            <Thumb file={fileOf(open)} className="gallery-full-img" />
            <div className="gallery-full-actions">
              <button className="btn btn-secondary" onClick={() => setOpenId(null)}>← Back</button>
              {onRetake && (
                <button
                  className="btn btn-secondary"
                  onClick={() => { onRetake(open.id); setOpenId(null) }}
                >
                  Retake
                </button>
              )}
              {onDelete && (
                <button
                  className="btn btn-danger"
                  onClick={() => { onDelete(open.id); setOpenId(null) }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
