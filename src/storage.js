// Small helpers for remembering the list of properties on this device.
// Stored in the browser's localStorage so it survives app restarts.

const PROPERTIES_KEY = 'svp.properties'

export function getProperties() {
  try {
    const raw = localStorage.getItem(PROPERTIES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addProperty(name) {
  const trimmed = name.trim()
  if (!trimmed) return getProperties()

  const existing = getProperties()
  // Case-insensitive de-dupe; keep the first spelling we saw.
  if (existing.some(p => p.toLowerCase() === trimmed.toLowerCase())) {
    return existing
  }
  const updated = [...existing, trimmed].sort((a, b) => a.localeCompare(b))
  localStorage.setItem(PROPERTIES_KEY, JSON.stringify(updated))
  return updated
}

// Remove a typed property from this device's saved list.
export function removeProperty(name) {
  const updated = getProperties().filter(p => p.toLowerCase() !== name.toLowerCase())
  localStorage.setItem(PROPERTIES_KEY, JSON.stringify(updated))
  return updated
}
