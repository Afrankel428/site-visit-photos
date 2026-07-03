// Durable on-phone storage (IndexedDB) for visits and photos.
//
// Design: every photo is its OWN record, written the instant it's captured —
// we never rewrite the whole photo set. Visit details (property/unit/step)
// are a separate tiny record, cheap to update on every step change.
// Finishing a visit marks it status:'completed' but KEEPS it and its photos
// stored until they are actually uploaded — so a finished visit can never be
// lost from memory.
//
//   visits: { id, property, unit, visitType, bedrooms, bathrooms,
//             stepIndex, status: 'in-progress' | 'completed', updatedAt }
//   photos: { id, visitId, room, subject, damage, mold, blob, takenAt }

const DB_NAME = 'svp'
const DB_VERSION = 2
const VISITS = 'visits'
const PHOTOS = 'photos'

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      // Old v1 store (whole-visit blob rewrites) is obsolete.
      if (db.objectStoreNames.contains('inProgress')) db.deleteObjectStore('inProgress')
      if (!db.objectStoreNames.contains(VISITS)) {
        db.createObjectStore(VISITS, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(PHOTOS)) {
        const store = db.createObjectStore(PHOTOS, { keyPath: 'id' })
        store.createIndex('byVisit', 'visitId')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx(db, store, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode)
    const result = fn(t.objectStore(store))
    t.oncomplete = () => resolve(result?.result ?? result)
    t.onerror = () => reject(t.error)
  })
}

// ---- visit metadata (tiny record, safe to write often) ----

export async function saveVisitMeta(visit) {
  const db = await openDB()
  return tx(db, VISITS, 'readwrite', s => s.put(visit))
}

export async function getVisit(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const t = db.transaction(VISITS, 'readonly')
    const req = t.objectStore(VISITS).get(id)
    req.onsuccess = () => resolve(req.result || null)
    req.onerror = () => reject(req.error)
  })
}

// The single in-progress visit, if any (most recently updated wins).
export async function getInProgressVisit() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const t = db.transaction(VISITS, 'readonly')
    const req = t.objectStore(VISITS).getAll()
    req.onsuccess = () => {
      const open = (req.result || [])
        .filter(v => v.status === 'in-progress')
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      resolve(open[0] || null)
    }
    req.onerror = () => reject(req.error)
  })
}

// Mark a visit completed — photos and record stay stored until uploaded.
export async function completeVisit(id) {
  const v = await getVisit(id)
  if (!v) return
  return saveVisitMeta({ ...v, status: 'completed', updatedAt: Date.now() })
}

// Remove a visit AND all its photos (used by Discard, and after upload).
export async function deleteVisit(id) {
  const db = await openDB()
  const photos = await loadPhotos(id)
  return new Promise((resolve, reject) => {
    const t = db.transaction([VISITS, PHOTOS], 'readwrite')
    t.objectStore(VISITS).delete(id)
    const ps = t.objectStore(PHOTOS)
    photos.forEach(p => ps.delete(p.id))
    t.oncomplete = () => resolve()
    t.onerror = () => reject(t.error)
  })
}

// ---- photos (one record each; written the instant they're captured) ----

export async function savePhoto(photo) {
  const db = await openDB()
  return tx(db, PHOTOS, 'readwrite', s => s.put(photo))
}

export async function deletePhotoRec(id) {
  const db = await openDB()
  return tx(db, PHOTOS, 'readwrite', s => s.delete(id))
}

export async function updatePhotoRec(id, patch) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const t = db.transaction(PHOTOS, 'readwrite')
    const store = t.objectStore(PHOTOS)
    const req = store.get(id)
    req.onsuccess = () => {
      if (req.result) store.put({ ...req.result, ...patch })
    }
    t.oncomplete = () => resolve()
    t.onerror = () => reject(t.error)
  })
}

export async function loadPhotos(visitId) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const t = db.transaction(PHOTOS, 'readonly')
    const req = t.objectStore(PHOTOS).index('byVisit').getAll(visitId)
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
}
