// The room-by-room photo checklist, in real walking order through the unit.
// Edit this list to change prompts, order, reminders, or filename subjects —
// the screens read from here, so nothing needs rewriting in the UI.
//
// Each prompt has:
//   id       — the filename subject (no spaces), e.g. Kitchen_UnderSink → used
//              so a flagged photo is identifiable just by browsing the folder
//   label    — what the manager sees on screen
//   reminder — optional hint shown under the prompt (e.g. unlock the closet)
//   mold     — optional; true for "under sink" prompts that should remind the
//              manager to check for mold (mold has its own flag, separate from
//              damage)

const MOLD_REMINDER = 'Check under the sink for mold.'

// The three extra prompts inserted only for 3-bedroom units, right after
// "Bedroom 1 — shades".
const BEDROOM2_BLOCK = [
  { id: 'Bedroom2', label: 'Bedroom 2' },
  { id: 'Bedroom2_Closet', label: 'Bedroom 2 — closet' },
  { id: 'Bedroom2_Shade', label: 'Bedroom 2 — shades' },
]

// The standard 2-bedroom walkthrough.
const WALKTHROUGH = [
  { id: 'LivingRoom', label: 'Living room' },
  { id: 'Dinette', label: 'Dinette' },
  { id: 'Kitchen_Overall', label: 'Kitchen — overall' },
  { id: 'Kitchen_Oven', label: 'Kitchen — oven' },
  { id: 'Kitchen_UnderSink', label: 'Kitchen — under sink', mold: true, reminder: MOLD_REMINDER },
  { id: 'Kitchen_Refrigerator', label: 'Kitchen — refrigerator' },
  { id: 'Kitchen_Dishwasher', label: 'Kitchen — dishwasher' },
  { id: 'HVAC_Unit', label: 'HVAC closet — HVAC unit', reminder: 'This closet is normally LOCKED — unlock it first.' },
  { id: 'HVAC_WaterHeater', label: 'HVAC closet — water heater' },
  { id: 'PublicBath_Tub', label: 'Public bathroom — tub' },
  { id: 'PublicBath_Toilet', label: 'Public bathroom — toilet' },
  { id: 'PublicBath_Vanity', label: 'Public bathroom — vanity' },
  { id: 'PublicBath_UnderSink', label: 'Public bathroom — under sink', mold: true, reminder: MOLD_REMINDER },
  { id: 'ElectricalPanel', label: 'Electrical panel' },
  { id: 'WasherDryerHookup', label: 'Washer & dryer hookup area', reminder: 'We provide hookups only, not machines — document the area and hookups, not appliances.' },
  { id: 'Bedroom1', label: 'Bedroom 1' },
  { id: 'Bedroom1_Closet', label: 'Bedroom 1 — closet' },
  { id: 'Bedroom1_Shade', label: 'Bedroom 1 — shades' },
  // ↑ For 3-bedroom units, the Bedroom 2 block is inserted here.
  { id: 'Master', label: 'Master bedroom' },
  { id: 'Master_Closet', label: 'Master — closet' },
  { id: 'Master_Shade', label: 'Master — shades' },
  { id: 'MasterBath_Tub', label: 'Master bathroom — tub' },
  { id: 'MasterBath_Toilet', label: 'Master bathroom — toilet' },
  { id: 'MasterBath_Vanity', label: 'Master bathroom — vanity' },
  { id: 'MasterBath_UnderSink', label: 'Master bathroom — under sink', mold: true, reminder: MOLD_REMINDER },
]

// Returns the checklist for the chosen unit size (2 or 3 bedrooms).
// 3-bedroom inserts the Bedroom 2 prompts right after "Bedroom 1 — shades".
export function buildChecklist(bedrooms) {
  if (bedrooms !== 3) return WALKTHROUGH
  const insertAt = WALKTHROUGH.findIndex(item => item.id === 'Bedroom1_Shade') + 1
  return [
    ...WALKTHROUGH.slice(0, insertAt),
    ...BEDROOM2_BLOCK,
    ...WALKTHROUGH.slice(insertAt),
  ]
}
