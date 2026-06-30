// The standard room-by-room photo checklist.
// Edit this list to change the prompts or their order. Each entry has:
//   id    — short stable key used in filenames/data (no spaces)
//   label — what the manager sees on screen
//   only3BR — if true, the prompt only appears for 3-bedroom units
//
// All units have 2 bathrooms; the only difference between 2BR and 3BR is
// whether "Bedroom 3" is included.
export const CHECKLIST = [
  { id: 'LivingRoom', label: 'Living room' },
  { id: 'Kitchen', label: 'Kitchen' },
  { id: 'Dinette', label: 'Dinette' },
  { id: 'LaundryRoom', label: 'Laundry room' },
  { id: 'HVACWaterHeater', label: 'HVAC / water heater closet' },
  { id: 'Bathroom1', label: 'Bathroom 1' },
  { id: 'Bathroom2', label: 'Bathroom 2' },
  { id: 'Bedroom1', label: 'Bedroom 1' },
  { id: 'Bedroom2', label: 'Bedroom 2' },
  { id: 'Bedroom3', label: 'Bedroom 3', only3BR: true },
]

// Returns the checklist for the chosen unit size (2 or 3 bedrooms).
export function buildChecklist(bedrooms) {
  return CHECKLIST.filter(item => !item.only3BR || bedrooms === 3)
}
