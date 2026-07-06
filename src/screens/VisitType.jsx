import { useNavigate, useLocation } from 'react-router-dom'

const VISIT_TYPES = [
  { id: 'move-in', label: 'Move-In', icon: '🔑' },
  { id: 'move-out', label: 'Move-Out', icon: '📦' },
  { id: 'routine', label: 'Routine Inspection', icon: '🔍' },
  { id: 'maintenance', label: 'Maintenance', icon: '🔧' },
  // "General Site Visit" was removed — Routine Inspection already covers it
  // (e.g. pest control). The property-wide Grounds Walkthrough is separate and
  // lives on the Property screen, not here.
]

export default function VisitType() {
  const navigate = useNavigate()
  const { state } = useLocation()

  function select(type) {
    navigate('/camera', { state: { ...state, visitType: type } })
  }

  return (
    <div className="screen">
      <header className="screen-header">
        <button className="btn-back" onClick={() => navigate(-1)}>← Back</button>
        <h2>Visit Type</h2>
      </header>
      <div className="screen-content">
        <p className="context-line">{state?.property} — Unit {state?.unit}</p>
        <ul className="visit-type-list">
          {VISIT_TYPES.map(t => (
            <li key={t.id}>
              <button className="visit-type-btn" onClick={() => select(t.label)}>
                <span className="vt-icon">{t.icon}</span>
                <span className="vt-label">{t.label}</span>
                <span className="vt-arrow">›</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
