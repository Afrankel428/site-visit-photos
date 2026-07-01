import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProperties, addProperty } from '../storage'
import { PROPERTIES, getProperty } from '../properties'
import { loadVisit, clearVisit } from '../visitStore'

export default function PropertyUnit() {
  const navigate = useNavigate()
  const [customProps, setCustomProps] = useState(getProperties)
  const [selected, setSelected] = useState('')
  const [newProperty, setNewProperty] = useState('')
  const [unit, setUnit] = useState('')        // typed unit (fallback properties)
  const [unitSelect, setUnitSelect] = useState('') // chosen unit (onboarded properties)
  const [bedrooms, setBedrooms] = useState(null)   // 2BR/3BR answer (fallback only)
  const [inProgress, setInProgress] = useState(null) // a saved, unfinished visit

  // Look for an in-progress visit to offer resuming.
  useEffect(() => {
    loadVisit().then(setInProgress)
  }, [])

  function discardInProgress() {
    clearVisit().then(() => setInProgress(null))
  }

  // The active property is either the tapped chip or the freshly typed name.
  const property = newProperty.trim() || selected
  const onboarded = getProperty(property)

  // Chips: onboarded properties first, then any custom ones the user typed
  // before (skipping names already covered by onboarded data).
  const onboardedNames = PROPERTIES.map(p => p.name)
  const chipNames = [
    ...onboardedNames,
    ...customProps.filter(n => !onboardedNames.some(o => o.toLowerCase() === n.toLowerCase())),
  ]

  const canContinue = onboarded
    ? !!unitSelect
    : property && unit.trim() && bedrooms

  function selectChip(name) {
    setSelected(name)
    setNewProperty('')
    setUnit('')
    setUnitSelect('')
    setBedrooms(null)
  }

  function next() {
    // Remember a newly typed (non-onboarded) property for next time.
    if (newProperty.trim() && !getProperty(newProperty)) {
      setCustomProps(addProperty(newProperty))
    }
    if (onboarded) {
      const u = onboarded.units.find(x => x.number === unitSelect)
      navigate('/visit-type', {
        state: { property, unit: u.number, bedrooms: u.bedrooms, bathrooms: u.bathrooms },
      })
    } else {
      navigate('/visit-type', { state: { property, unit: unit.trim(), bedrooms } })
    }
  }

  return (
    <div className="screen">
      <header className="screen-header">
        <h2>Property &amp; Unit</h2>
      </header>
      <div className="screen-content">
        {inProgress && (
          <div className="resume-banner">
            <p className="resume-title">
              You're in the middle of Unit {inProgress.unit}
              {inProgress.property ? ` at ${inProgress.property}` : ''}.
            </p>
            <p className="resume-sub">
              {(inProgress.photos?.length ?? 0)} photo{(inProgress.photos?.length ?? 0) === 1 ? '' : 's'} saved. Finish it?
            </p>
            <div className="resume-actions">
              <button
                className="btn btn-primary"
                onClick={() => navigate('/camera', { state: { resume: true } })}
              >
                Resume Unit {inProgress.unit}
              </button>
              <button className="btn btn-secondary" onClick={discardInProgress}>
                Discard
              </button>
            </div>
          </div>
        )}

        {chipNames.length > 0 && (
          <div className="field-group">
            <label>Pick a property</label>
            <div className="chip-list">
              {chipNames.map(p => (
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
            {chipNames.length > 0 ? 'Or add a new property' : 'Property name'}
          </label>
          <input
            id="new-property"
            type="text"
            placeholder="e.g. Maple Grove Apartments"
            value={newProperty}
            onChange={e => {
              setNewProperty(e.target.value)
              if (e.target.value) {
                setSelected('')
                setUnitSelect('')
              }
            }}
          />
        </div>

        {onboarded ? (
          // Onboarded property: choose from its known units.
          <div className="field-group">
            <label htmlFor="unit-select">Unit</label>
            <select
              id="unit-select"
              className="unit-select"
              value={unitSelect}
              onChange={e => setUnitSelect(e.target.value)}
            >
              <option value="" disabled>Select a unit…</option>
              {onboarded.units.map(u => (
                <option key={u.number} value={u.number}>
                  {u.number} ({u.bedrooms} bed / {u.bathrooms} bath)
                </option>
              ))}
            </select>
            <p className="note">{onboarded.units.length} units · {onboarded.address}</p>
          </div>
        ) : (
          // Fallback property: type the unit and answer the 2BR/3BR question.
          <>
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

            <div className="field-group">
              <label>Unit size</label>
              <div className="chip-list">
                <button
                  className={`chip ${bedrooms === 2 ? 'chip-active' : ''}`}
                  onClick={() => setBedrooms(2)}
                >
                  2-bedroom
                </button>
                <button
                  className={`chip ${bedrooms === 3 ? 'chip-active' : ''}`}
                  onClick={() => setBedrooms(3)}
                >
                  3-bedroom
                </button>
              </div>
            </div>
          </>
        )}

        <button className="btn btn-primary" disabled={!canContinue} onClick={next}>
          Next
        </button>
      </div>
    </div>
  )
}
