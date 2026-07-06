import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProperties, addProperty, removeProperty } from '../storage'
import { PROPERTIES, getProperty } from '../properties'
import { getInProgressVisit, deleteVisit, loadPhotos } from '../visitStore'
import { getActiveAccount, signOutUser } from '../auth'

export default function PropertyUnit() {
  const navigate = useNavigate()
  const account = getActiveAccount()
  const [customProps, setCustomProps] = useState(getProperties)
  const [selected, setSelected] = useState('')
  const [newProperty, setNewProperty] = useState('')
  const [unit, setUnit] = useState('')        // typed unit (fallback properties)
  const [unitSelect, setUnitSelect] = useState('') // chosen unit (onboarded properties)
  const [bedrooms, setBedrooms] = useState(null)   // 2BR/3BR answer (fallback only)
  const [inProgress, setInProgress] = useState(null) // a saved, unfinished visit
  const [inProgressCount, setInProgressCount] = useState(0)
  const [confirmNew, setConfirmNew] = useState(false) // discard-unfinished prompt
  const [pendingAction, setPendingAction] = useState('unit') // 'unit' | 'grounds'

  // Look for an in-progress visit to offer resuming.
  useEffect(() => {
    getInProgressVisit().then(async v => {
      setInProgress(v)
      if (v) setInProgressCount((await loadPhotos(v.id)).length)
    })
  }, [])

  function discardInProgress() {
    deleteVisit(inProgress.id).then(() => setInProgress(null))
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

  // Delete a typed (non-onboarded) property from this device's list.
  function removeCustom(name) {
    setCustomProps(removeProperty(name))
    if (selected === name) {
      setSelected('')
      setUnitSelect('')
      setBedrooms(null)
    }
  }

  // Ask before discarding an unfinished visit, then run the chosen action.
  // action is 'unit' (normal unit walk) or 'grounds' (property-wide walk).
  function requestStart(action) {
    setPendingAction(action)
    if (inProgress) {
      setConfirmNew(true)
    } else {
      run(action)
    }
  }

  const next = () => requestStart('unit')
  const startGrounds = () => requestStart('grounds')

  function run(action) {
    if (action === 'grounds') {
      proceedGrounds()
    } else {
      proceed()
    }
  }

  // Actually start the new UNIT visit (after any confirmation).
  function proceed() {
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

  // Start the property-wide Grounds Walkthrough (no unit, no visit-type screen).
  function proceedGrounds() {
    navigate('/camera', {
      state: {
        property: onboarded.name,
        shortName: onboarded.shortName || onboarded.name,
        mode: 'grounds',
        visitType: 'Grounds Walkthrough',
      },
    })
  }

  // Confirmed "start new": discard the unfinished visit, then run the action.
  function discardAndProceed() {
    const id = inProgress.id
    setConfirmNew(false)
    deleteVisit(id).then(() => {
      setInProgress(null)
      run(pendingAction)
    })
  }

  return (
    <div className="screen">
      <header className="screen-header">
        <h2>Property &amp; Unit</h2>
      </header>
      <div className="screen-content">
        {account && (
          <div className="account-bar">
            <span>Signed in as <strong>{account.username}</strong></span>
            <button className="btn-link" onClick={() => signOutUser()}>Sign out</button>
          </div>
        )}

        {inProgress && (
          <div className="resume-banner">
            <p className="resume-title">
              {inProgress.mode === 'grounds'
                ? `You're in the middle of a Grounds Walkthrough${inProgress.property ? ` at ${inProgress.property}` : ''}.`
                : `You're in the middle of Unit ${inProgress.unit}${inProgress.property ? ` at ${inProgress.property}` : ''}.`}
            </p>
            <p className="resume-sub">
              {inProgressCount} photo{inProgressCount === 1 ? '' : 's'} saved. Finish it?
            </p>
            <div className="resume-actions">
              <button
                className="btn btn-primary"
                onClick={() => navigate('/camera', { state: { resume: true } })}
              >
                {inProgress.mode === 'grounds' ? 'Resume Grounds Walkthrough' : `Resume Unit ${inProgress.unit}`}
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
              {chipNames.map(p => {
                const active = selected === p && !newProperty
                const isCustom = !onboardedNames.some(o => o.toLowerCase() === p.toLowerCase())
                if (!isCustom) {
                  return (
                    <button
                      key={p}
                      className={`chip ${active ? 'chip-active' : ''}`}
                      onClick={() => selectChip(p)}
                    >
                      {p}
                    </button>
                  )
                }
                return (
                  <span key={p} className={`chip chip-removable ${active ? 'chip-active' : ''}`}>
                    <button className="chip-text" onClick={() => selectChip(p)}>{p}</button>
                    <button
                      className="chip-x"
                      onClick={() => removeCustom(p)}
                      aria-label={`Remove ${p}`}
                    >
                      ×
                    </button>
                  </span>
                )
              })}
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

        {onboarded?.grounds && (
          <div className="grounds-block">
            <p className="grounds-or">— or —</p>
            <button className="btn btn-secondary grounds-btn" onClick={startGrounds}>
              🌳 Grounds Walkthrough (whole property)
            </button>
            <p className="note">A guided walk of the property grounds — no unit needed.</p>
          </div>
        )}
      </div>

      {confirmNew && inProgress && (
        <div className="modal-backdrop" onClick={() => setConfirmNew(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Discard unfinished visit?</h3>
            <p className="note">
              You have an unfinished visit at Unit {inProgress.unit}
              {inProgress.property ? ` (${inProgress.property})` : ''} with{' '}
              {inProgressCount} photo{inProgressCount === 1 ? '' : 's'}. Starting a new one
              will discard it. Continue?
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setConfirmNew(false)}>
                Keep it
              </button>
              <button className="btn btn-primary" onClick={discardAndProceed}>
                Discard &amp; start new
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
