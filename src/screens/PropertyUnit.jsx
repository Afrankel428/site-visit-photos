import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProperties, addProperty } from '../storage'

export default function PropertyUnit() {
  const navigate = useNavigate()
  const [properties, setProperties] = useState(getProperties)
  const [selected, setSelected] = useState('')
  const [newProperty, setNewProperty] = useState('')
  const [unit, setUnit] = useState('')

  // The active property is either the tapped chip or the freshly typed name.
  const property = newProperty.trim() || selected
  const canContinue = property && unit.trim()

  function selectChip(name) {
    setSelected(name)
    setNewProperty('')
  }

  function next() {
    // Remember a newly typed property for next time.
    if (newProperty.trim()) {
      setProperties(addProperty(newProperty))
    }
    navigate('/visit-type', { state: { property, unit: unit.trim() } })
  }

  return (
    <div className="screen">
      <header className="screen-header">
        <h2>Property &amp; Unit</h2>
      </header>
      <div className="screen-content">
        {properties.length > 0 && (
          <div className="field-group">
            <label>Pick a property</label>
            <div className="chip-list">
              {properties.map(p => (
                <button
                  key={p}
                  className={`chip ${selected === p && !newProperty ? 'chip-active' : ''}`}
                  onClick={() => selectChip(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="field-group">
          <label htmlFor="new-property">
            {properties.length > 0 ? 'Or add a new property' : 'Property name'}
          </label>
          <input
            id="new-property"
            type="text"
            placeholder="e.g. Maple Grove Apartments"
            value={newProperty}
            onChange={e => {
              setNewProperty(e.target.value)
              if (e.target.value) setSelected('')
            }}
          />
        </div>

        <div className="field-group">
          <label htmlFor="unit">Unit Number</label>
          <input
            id="unit"
            type="text"
            inputMode="numeric"
            placeholder="e.g. 101"
            value={unit}
            onChange={e => setUnit(e.target.value)}
          />
        </div>

        <button className="btn btn-primary" disabled={!canContinue} onClick={next}>
          Next
        </button>
      </div>
    </div>
  )
}
