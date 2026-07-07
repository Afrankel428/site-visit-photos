import { useEffect, useRef, useState } from 'react'
import { labelToSubject } from './areas'

// A self-contained live-camera panel for capturing an off-checklist "extra"
// photo and labeling it (pick an area or type a custom label). Used during the
// walk and on the Summary screen. Calls onSave(file, { subject, label }) for
// each labeled photo; onClose() stops the camera and hides the panel.
export default function ExtraPhotoCapture({ areas = [], onSave, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [status, setStatus] = useState('starting') // starting | ready | error
  const [errorText, setErrorText] = useState('')
  const [pending, setPending] = useState(null) // File awaiting a label
  const [choice, setChoice] = useState('')      // area id or 'custom'
  const [custom, setCustom] = useState('')

  useEffect(() => {
    let cancelled = false
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
        setStatus('ready')
      } catch {
        setStatus('error')
        setErrorText('Could not start the camera. Make sure no other app is using it.')
      }
    }
    start()
    return () => {
      cancelled = true
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    }
  }, [])

  function shoot() {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob(
      blob => {
        if (!blob) return
        setPending(new File([blob], 'extra.jpg', { type: 'image/jpeg' }))
        setChoice('')
        setCustom('')
      },
      'image/jpeg',
      0.9
    )
  }

  const area = choice && choice !== 'custom' ? areas.find(a => a.id === choice) : null
  const label = area ? area.label : custom.trim()
  const valid = !!pending && label.length > 0

  function save() {
    if (!valid) return
    onSave(pending, { subject: area ? area.id : labelToSubject(label), label })
    setPending(null)
    setChoice('')
    setCustom('')
  }

  return (
    <div className="extra-capture">
      <div className="viewfinder extra-viewfinder">
        <video ref={videoRef} playsInline muted autoPlay
          style={{ display: status === 'ready' ? 'block' : 'none' }} />
        {status === 'starting' && <div className="viewfinder-hint">Starting camera…</div>}
        {status === 'error' && <div className="viewfinder-hint">{errorText}</div>}
      </div>

      {!pending ? (
        <div className="extra-actions">
          <button className="btn btn-secondary" onClick={onClose}>Done</button>
          <button className="btn btn-primary" disabled={status !== 'ready'} onClick={shoot}>
            📷 Take extra photo
          </button>
        </div>
      ) : (
        <div className="extra-label">
          <p className="note">What/where is this photo? Pick an area or type a label.</p>
          <div className="issue-type-grid">
            {areas.map(a => (
              <button
                key={a.id}
                className={`issue-type-chip ${choice === a.id ? 'issue-type-chip-on' : ''}`}
                onClick={() => setChoice(a.id)}
              >
                {a.label}
              </button>
            ))}
            <button
              className={`issue-type-chip ${choice === 'custom' ? 'issue-type-chip-on' : ''}`}
              onClick={() => setChoice('custom')}
            >
              Custom…
            </button>
          </div>
          {choice === 'custom' && (
            <input
              className="note-input"
              type="text"
              placeholder="e.g. Balcony, storage closet, exterior meter"
              value={custom}
              onChange={e => setCustom(e.target.value)}
            />
          )}
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setPending(null)}>Discard</button>
            <button className="btn btn-primary" disabled={!valid} onClick={save}>Save photo</button>
          </div>
        </div>
      )}
    </div>
  )
}
