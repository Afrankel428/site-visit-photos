import { useNavigate, useLocation } from 'react-router-dom'

export default function Camera() {
  const navigate = useNavigate()
  const { state } = useLocation()

  return (
    <div className="screen">
      <header className="screen-header">
        <button className="btn-back" onClick={() => navigate(-1)}>← Back</button>
        <h2>Take Photos</h2>
      </header>
      <div className="screen-content">
        <p className="context-line">{state?.property} — Unit {state?.unit} — {state?.visitType}</p>
        <div className="placeholder-box">
          <div className="placeholder-icon">📷</div>
          <p><strong>Camera coming in Phase 2</strong></p>
          <p>You'll be able to take photos and add captions here.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/summary', { state })}>
          Continue to Summary
        </button>
      </div>
    </div>
  )
}
