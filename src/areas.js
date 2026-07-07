// Builds the list of areas/rooms for a visit, used to label off-checklist
// "extra" photos. Same source as the guided walk, so the choices always match.
import { buildChecklist } from './checklist'
import { GROUNDS_CHECKLIST } from './groundsChecklist'

export function visitAreas({ mode, bedrooms } = {}) {
  const list = mode === 'grounds' ? GROUNDS_CHECKLIST : buildChecklist(bedrooms)
  return list.map(c => ({ id: c.id, label: c.label }))
}

// Turn a human label into a filename-safe subject token (no spaces/punctuation).
export function labelToSubject(label) {
  return String(label || '').replace(/[^a-zA-Z0-9]/g, '') || 'Extra'
}
