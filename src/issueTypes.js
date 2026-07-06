// The list of problem types a manager can flag with the red ⚠️ "Issue" shutter.
//
// EDIT THIS LIST to change the choices, wording, or order. Each item has:
//   id     — internal key (no spaces)
//   label  — what the manager sees on the button
//   code   — the ALL-CAPS marker put in the photo's filename so a flagged
//            photo is identifiable by browsing the SharePoint folder alone
//            (e.g. ..._Bedroom2_HOLE_003.jpg)
//   custom — optional; true means "let the manager type their own type"
//            (used by "Other"); its filename marker is the generic ISSUE and
//            the typed description is recorded in _visit.json.

export const ISSUE_TYPES = [
  { id: 'damage', label: 'Damage', code: 'DAMAGE' },
  { id: 'mold', label: 'Mold', code: 'MOLD' },
  { id: 'hole', label: 'Hole', code: 'HOLE' },
  { id: 'water', label: 'Water/Leak', code: 'WATER' },
  { id: 'stain', label: 'Stain', code: 'STAIN' },
  { id: 'broken', label: 'Broken fixture', code: 'BROKEN' },
  { id: 'missing', label: 'Missing item', code: 'MISSING' },
  { id: 'pest', label: 'Pest', code: 'PEST' },
  { id: 'pet', label: 'Unauthorized pet', code: 'PET' },
  { id: 'other', label: 'Other', code: 'ISSUE', custom: true },
]

export function getIssueType(id) {
  return ISSUE_TYPES.find(t => t.id === id) || null
}

// The label to show/record for a flagged photo — the custom text for "Other",
// otherwise the standard label.
export function issueLabel(issue) {
  if (!issue?.flagged) return ''
  return issue.customType?.trim() || issue.label || ''
}
