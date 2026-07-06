// The property-wide "Grounds Walkthrough" checklist, in walking order.
// This is a SEPARATE walk from the unit checklists — it documents the whole
// property (signage, buildings, amenities), not a single apartment.
//
// EDIT THIS LIST to change the areas, their order, or the on-screen wording.
// The screens read straight from here, so nothing else needs changing.
//
// Each item has:
//   id       — the filename subject (no spaces), e.g. Building3_UpstairsBreezeway
//              → shows up in the photo's filename so it's identifiable by
//              browsing the SharePoint folder alone
//   label    — what the manager sees on screen
//   reminder — optional hint shown under the prompt
//   multi    — optional; true means "take as many photos as you want here"
//              (no auto-advance, nothing gets replaced) — used for problem areas

// Helper: builds the three standard prompts for one building.
// Change the count in GROUNDS_CHECKLIST below to add/remove buildings.
function building(n) {
  return [
    { id: `Building${n}_Exterior`, label: `Building ${n} — exterior` },
    { id: `Building${n}_DownstairsBreezeway`, label: `Building ${n} — downstairs breezeway` },
    { id: `Building${n}_UpstairsBreezeway`, label: `Building ${n} — upstairs breezeway` },
  ]
}

export const GROUNDS_CHECKLIST = [
  { id: 'MonumentSign', label: 'Front / monument sign' },
  { id: 'EntranceDriveGate', label: 'Entrance drive / gate' },
  { id: 'MailboxArea', label: 'Mailbox area' },
  { id: 'FrontLandscaping', label: 'Front landscaping' },
  { id: 'LeasingOfficeExterior', label: 'Leasing office exterior' },
  { id: 'LeasingOfficeBackRoom', label: 'Leasing office back room (maintenance area)' },
  { id: 'BehindLeasingOffice', label: 'Behind the leasing office' },
  { id: 'LaundryRoom', label: 'Laundry room' },
  { id: 'MaintenanceShed', label: 'Maintenance shed' },
  ...building(1),
  ...building(2),
  ...building(3),
  ...building(4),
  ...building(5),
  ...building(6),
  { id: 'DumpsterArea', label: 'Dumpster area' },
  { id: 'Playground', label: "Kids' playground" },
  { id: 'DogPark', label: 'Dog park' },
  { id: 'ParkingLots', label: 'Parking lots / general condition' },
  { id: 'GeneralLandscaping', label: 'General landscaping / grounds' },
  {
    id: 'ProblemAreas',
    label: 'Any problem areas',
    multi: true,
    reminder: 'Take as many photos as you need here, then tap Finish. Use the ⚠️ flag on anything that needs attention.',
  },
]
