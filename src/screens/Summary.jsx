import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Thumb from '../Thumb'
import ExtraPhotoCapture from '../ExtraPhotoCapture'
import { visitAreas } from '../areas'
import { loadPhotos, savePhoto, deletePhotoRec, deleteVisit } from '../visitStore'
import { uploadVisit, sharePointConfigured } from '../graph'

export default function Summary() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const visitId = state?.visitId
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  // Photos come straight from durable storage — they survive app closes.
  const [photos, setPhotos] = useState([])
  const [status, setStatus] = useState('idle') // idle | uploading | done | error
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('')
  const [errorText, setErrorText] = useState('')
  const [addingExtra, setAddingExtra] = useState(false)

  const areas = visitAreas({ mode: state?.mode, bedrooms: state?.bedrooms })

  useEffect(() => {
    if (!visitId) return
    let cancelled = false
    loadPhotos(visitId).then(stored => {
      if (!cancelled) setPhotos(stored)
    })
    return () => { cancelled = true }
  }, [visitId])

  const flaggedCount = photos.filter(p => p.issue?.flagged).length
  // Count flagged issues grouped by type (custom "Other" types use their text).
  const issuesByType = photos.reduce((acc, p) => {
    if (!p.issue?.flagged) return acc
    const label = p.issue.customType?.trim() || p.issue.label || 'Issue'
    acc[label] = (acc[label] || 0) + 1
    return acc
  }, {})
  const busy = status === 'uploading'

  function deletePhoto(id) {
    deletePhotoRec(id)
    setPhotos(prev => prev.filter(p => p.id !== id))
  }

  // Save a labeled extra photo added from the summary into the same visit.
  async function addExtra(file, { subject, label }) {
    const rec = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      visitId,
      room: 'Extra',
      subject,
      label,
      issue: { flagged: false, note: '' },
      blob: file,
      takenAt: Date.now(),
    }
    try {
      await savePhoto(rec)
      setPhotos(prev => [...prev, rec])
    } catch (err) {
      console.error('Failed to save extra photo', err)
    }
  }

  async function runUpload() {
    setStatus('uploading')
    setErrorText('')
    setProgress(0)
    try {
      await uploadVisit({
        meta: {
          property: state.property,
          unit: state.unit,
          visitType: state.visitType,
          bedrooms: state.bedrooms,
          bathrooms: state.bathrooms,
          mode: state.mode,
          shortName: state.shortName,
        },
        photos,
        onProgress: setProgress,
        onStatus: setStatusText,
      })
      // Only now that SharePoint confirmed everything: free the local copy.
      await deleteVisit(visitId)
      setStatus('done')
    } catch (err) {
      setErrorText(err?.message || 'Upload failed. Please try again.')
      setStatus('error')
    }
  }

  return (
    <div className="screen">
      <header className="screen-header">
        {/* Back goes home so it can never disturb the finished visit's photos. */}
        <button className="btn-back" onClick={() => navigate('/')} disabled={busy}>← Home</button>
        <h2>Summary</h2>
      </header>
      <div className="screen-content">
        <div className="summary-card">
          <div className="summary-row"><span>Property</span><strong>{state?.property}</strong></div>
          {state?.mode === 'grounds'
            ? <div className="summary-row"><span>Scope</span><strong>Whole property (grounds)</strong></div>
            : <div className="summary-row"><span>Unit</span><strong>{state?.unit}</strong></div>}
          <div className="summary-row"><span>Visit Type</span><strong>{state?.visitType}</strong></div>
          <div className="summary-row"><span>Date</span><strong>{today}</strong></div>
          <div className="summary-row"><span>Photos</span><strong>{photos.length}</strong></div>
          <div className="summary-row"><span>⚠️ Issues flagged</span><strong>{flaggedCount}</strong></div>
          {Object.entries(issuesByType).map(([label, count]) => (
            <div className="summary-row summary-row-sub" key={label}>
              <span>— {label}</span><strong>{count}</strong>
            </div>
          ))}
        </div>

        {status === 'done' ? (
          <div className="placeholder-box">
            <div className="placeholder-icon">✅</div>
            <p><strong>Uploaded to SharePoint</strong></p>
            <p>All photos and the visit details were saved to the shared library.</p>
          </div>
        ) : (
          <>
            {photos.length > 0 && (
              <>
                <p className="context-line">Review photos — tap × to delete any before uploading.</p>
                <div className="photo-grid">
                  {photos.map(p => {
                    const flagged = p.issue?.flagged
                    const cls = ['photo-thumb', flagged ? 'photo-flagged' : ''].join(' ').trim()
                    const badge = flagged ? (p.issue.customType?.trim() || p.issue.label) : ''
                    return (
                      <Thumb key={p.id} file={p.blob} className={cls}>
                        {!busy && (
                          <button
                            className="photo-remove"
                            onClick={() => deletePhoto(p.id)}
                            aria-label="Delete photo"
                          >
                            ×
                          </button>
                        )}
                        {badge
                          ? <span className="photo-issue-badge">{badge}</span>
                          : p.label && <span className="photo-label-badge">{p.label}</span>}
                      </Thumb>
                    )
                  })}
                </div>
              </>
            )}

            {/* Add more off-checklist photos right from the summary. */}
            {!busy && (
              addingExtra ? (
                <ExtraPhotoCapture
                  areas={areas}
                  onSave={addExtra}
                  onClose={() => setAddingExtra(false)}
                />
              ) : (
                <button className="btn btn-secondary" onClick={() => setAddingExtra(true)}>
                  ➕ Add extra photo
                </button>
              )
            )}

            {status === 'uploading' && (
              <div className="upload-box">
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
                </div>
                <p className="upload-status">{statusText} ({Math.round(progress * 100)}%)</p>
              </div>
            )}

            {status === 'error' && <p className="upload-err">⚠️ {errorText}</p>}

            {!sharePointConfigured && (
              <p className="upload-err">
                SharePoint isn’t configured yet — add the site environment variables in Vercel and redeploy.
              </p>
            )}

            <button
              className="btn btn-primary"
              disabled={busy || photos.length === 0 || !sharePointConfigured}
              onClick={runUpload}
            >
              {status === 'error' ? '☁️ Retry upload' : '☁️ Upload to SharePoint'}
            </button>
          </>
        )}

        <button className="btn btn-secondary" disabled={busy} onClick={() => navigate('/')}>
          {status === 'done' ? 'Start New Visit' : 'Done for now'}
        </button>
      </div>
    </div>
  )
}
