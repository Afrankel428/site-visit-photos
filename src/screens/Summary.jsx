import { useNavigate, useLocation } from 'react-router-dom'

export default function Summary() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

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
          <div className="summary-row"><span>Photos</span><strong>{state?.photoCount ?? 0}</strong></div>
          <div className="summary-row"><span>⚠️ Damage flagged</span><strong>{state?.flaggedCount ?? 0}</strong></div>
          <div className="summary-row"><span>🍄 Mold flagged</span><strong>{state?.moldCount ?? 0}</strong></div>
        </div>
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
