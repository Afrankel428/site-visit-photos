import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const RECENT_PROPERTIES = ['Maple Grove Apartments', 'Riverside Commons', 'Sunset Plaza']

export default function PropertyUnit() {
  const navigate = useNavigate()
  const [property, setProperty] = useState('')
  const [unit, setUnit] = useState('')

  const canContinue = property.trim() && unit.trim()

  return (
    <div className="screen">
      <header className="screen-header">
        <h2>Property &amp; Unit</h2>
      </header>
      <div className="screen-content">
        <div className="field-group">
          <label htmlFor="property">Property Name</label>
          <input
            id="property"
            type="text"
            placeholder="e.g. Maple Grove Apartments"
            value={property}
            onChange={e => setProperty(e.target.value)}
            list="property-suggestions"
          />
          <datalist id="property-suggestions">
            {RECENT_PROPERTIES.map(p => <option key={p} value={p} />)}
          </datalist>
        </div>
        <div className="field-group">
          <label htmlFor="unit">Unit Number</label>
          <input
            id="unit"
            type="text"
            placeholder="e.g. 101"
            value={unit}
            onChange={e => setUnit(e.target.value)}
          />
        </div>
        <button
          className="btn btn-primary"
          disabled={!canContinue}
          onClick={() => navigate('/visit-type', { state: { property, unit } })}
        >
          Next
        </button>
      </div>
    </div>
  )
}
