// Editable property + unit data.
// Add or edit properties and their units here — nothing about properties is
// hard-coded into the screens. Each unit knows its own layout (bedrooms /
// bathrooms) so the app can build the right checklist automatically, without
// asking the manager "2-bedroom or 3-bedroom?".
//
// A property that is NOT listed here still works: the app falls back to asking
// the 2BR/3BR question for it. List a property here once you've "onboarded" its
// real unit numbers and layouts.

// Helper: turn a list of unit numbers into unit records with a shared layout.
function units(numbers, bedrooms, bathrooms) {
  return numbers.map(number => ({ number, bedrooms, bathrooms }))
}

export const PROPERTIES = [
  {
    id: 'milan',
    name: 'Milan Luxury Apartments',
    shortName: 'Milan', // used as the filename prefix for grounds photos
    address: '4051 Reasons Boulevard, Milan, TN 38358',
    grounds: true, // offers a property-wide "Grounds Walkthrough" (no unit)
    units: [
      // 2 bedroom / 2 bath (32 units)
      ...units(
        [
          '1-101', '1-102', '1-103', '1-104', '1-105', '1-106', '1-107', '1-108',
          '2-201', '2-202', '2-203', '2-204', '2-205', '2-206', '2-207', '2-208',
          '5-501', '5-502', '5-503', '5-504', '5-505', '5-506', '5-507', '5-508',
          '6-601', '6-602', '6-603', '6-604', '6-605', '6-606', '6-607', '6-608',
        ],
        2, 2
      ),
      // 3 bedroom / 2 bath (16 units)
      ...units(
        [
          '3-301', '3-302', '3-303', '3-304', '3-305', '3-306', '3-307', '3-308',
          '4-401', '4-402', '4-403', '4-404', '4-405', '4-406', '4-407', '4-408',
        ],
        3, 2
      ),
    ],
  },
]

// Find an onboarded property by name (case-insensitive). Returns null if the
// property has no pre-loaded unit data yet (so the 2BR/3BR fallback applies).
export function getProperty(name) {
  if (!name) return null
  return PROPERTIES.find(p => p.name.toLowerCase() === name.toLowerCase()) || null
}
