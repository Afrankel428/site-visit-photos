// Uploads a finished visit to SharePoint via Microsoft Graph.
//
// Folder tree (created on demand) under the site's default "Documents" library:
//   /<Property>/<Unit>/<YYYY-MM-DD — Visit Type>/
// Photos are named e.g. Unit1-101_MoveIn_2026-07-03_Kitchen_UnderSink_DAMAGE_001.jpg
// and a _visit.json details file is written into the same folder.
import { getGraphToken } from './auth'

const GRAPH = 'https://graph.microsoft.com/v1.0'
const HOST = import.meta.env.VITE_SHAREPOINT_HOST // eomanagementgroup.sharepoint.com
const SITE_PATH = import.meta.env.VITE_SHAREPOINT_SITE_PATH // /sites/UnitVisitPhotos
// Chunk size for upload sessions — must be a multiple of 320 KiB (Graph rule).
const CHUNK = 320 * 1024 * 16 // 5 MiB

export const sharePointConfigured = Boolean(HOST && SITE_PATH)

// ---- small helpers ----

function pad3(n) { return String(n).padStart(3, '0') }
function compact(s) { return String(s || 'Visit').replace(/[^a-zA-Z0-9]/g, '') }
function safeName(s) { return String(s).replace(/[\\/:*?"<>|]/g, '-').trim() }
function encPath(segments) { return segments.map(s => encodeURIComponent(s)).join('/') }

function ymd(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function gfetch(url, token, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`SharePoint error ${res.status}. ${text.slice(0, 300)}`)
  }
  return res
}

// Resolve the site's default document library ("Documents") drive id.
async function getDriveId(token) {
  const site = await (await gfetch(`${GRAPH}/sites/${HOST}:${SITE_PATH}`, token)).json()
  const drive = await (await gfetch(`${GRAPH}/sites/${site.id}/drive`, token)).json()
  return drive.id
}

// Create each folder in the path if it doesn't already exist.
async function ensureFolder(driveId, token, segments) {
  for (let i = 0; i < segments.length; i++) {
    const cumulative = segments.slice(0, i + 1)
    const check = await fetch(`${GRAPH}/drives/${driveId}/root:/${encPath(cumulative)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (check.ok) continue // already exists
    const parent = segments.slice(0, i)
    const childrenUrl = parent.length
      ? `${GRAPH}/drives/${driveId}/root:/${encPath(parent)}:/children`
      : `${GRAPH}/drives/${driveId}/root/children`
    await gfetch(childrenUrl, token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: segments[i],
        folder: {},
        '@microsoft.graph.conflictBehavior': 'fail',
      }),
    })
  }
}

// Upload one file using a chunked upload session.
async function uploadFileChunked(driveId, token, folderSegments, filename, blob, onFrac) {
  const path = encPath([...folderSegments, filename])
  const session = await (await gfetch(`${GRAPH}/drives/${driveId}/root:/${path}:/createUploadSession`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item: { '@microsoft.graph.conflictBehavior': 'rename' } }),
  })).json()

  const total = blob.size
  let start = 0
  // Browser sets Content-Length automatically; we only set Content-Range.
  while (start < total) {
    const end = Math.min(start + CHUNK, total)
    const res = await fetch(session.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Range': `bytes ${start}-${end - 1}/${total}` },
      body: blob.slice(start, end),
    })
    if (!res.ok && res.status !== 202) {
      const t = await res.text().catch(() => '')
      throw new Error(`Upload failed (${res.status}). ${t.slice(0, 200)}`)
    }
    start = end
    if (onFrac) onFrac(end / total)
  }
}

async function uploadJson(driveId, token, folderSegments, filename, obj) {
  const path = encPath([...folderSegments, filename])
  await gfetch(`${GRAPH}/drives/${driveId}/root:/${path}:/content`, token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj, null, 2),
  })
}

// Main entry: upload a whole visit. photos are the stored records ({blob,...}).
// onProgress(fraction 0..1), onStatus(text). Throws on any failure.
export async function uploadVisit({ meta, photos, onProgress, onStatus }) {
  if (!sharePointConfigured) {
    throw new Error('SharePoint isn’t configured (missing site environment variables).')
  }
  onStatus?.('Connecting to SharePoint…')
  const token = await getGraphToken()
  const driveId = await getDriveId(token)

  const sorted = [...photos].sort((a, b) => (a.takenAt || 0) - (b.takenAt || 0))
  const dateTs = sorted.length ? sorted[0].takenAt : Date.now()
  const dateStr = ymd(dateTs)
  const isGrounds = meta.mode === 'grounds'

  // Property-wide grounds walk skips the unit level:
  //   /<Property>/Grounds Walkthrough/<YYYY-MM-DD>/
  // Unit walk keeps the unit + "<date> — <type>" folder:
  //   /<Property>/<Unit>/<YYYY-MM-DD — Visit Type>/
  const folderSegments = isGrounds
    ? [safeName(meta.property), 'Grounds Walkthrough', safeName(dateStr)]
    : [safeName(meta.property), safeName(meta.unit), safeName(`${dateStr} — ${meta.visitType}`)]

  onStatus?.('Creating folders…')
  await ensureFolder(driveId, token, folderSegments)

  const typeC = compact(meta.visitType)
  // Filename prefix: "Milan" for grounds, "Unit1-101" for a unit walk.
  const prefix = isGrounds ? compact(meta.shortName || meta.property) : `Unit${safeName(meta.unit)}`
  const steps = sorted.length + 1 // photos + _visit.json
  const manifest = []

  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i]
    const seq = i + 1
    const flags = `${p.damage?.flagged ? '_DAMAGE' : ''}${p.mold?.flagged ? '_MOLD' : ''}`
    const filename = `${prefix}_${typeC}_${dateStr}_${p.subject || 'Photo'}${flags}_${pad3(seq)}.jpg`
    onStatus?.(`Uploading photo ${seq} of ${sorted.length}…`)
    await uploadFileChunked(driveId, token, folderSegments, filename, p.blob, frac => {
      onProgress?.((i + frac) / steps)
    })
    manifest.push({
      filename,
      room: p.room,
      subject: p.subject,
      takenAt: new Date(p.takenAt).toISOString(),
      damage: p.damage?.flagged ? { note: p.damage.note } : null,
      mold: !!p.mold?.flagged,
    })
  }

  onStatus?.('Saving visit details…')
  await uploadJson(driveId, token, folderSegments, '_visit.json', {
    property: meta.property,
    unit: isGrounds ? null : meta.unit,
    scope: isGrounds ? 'grounds' : 'unit',
    visitType: meta.visitType,
    bedrooms: meta.bedrooms ?? null,
    bathrooms: meta.bathrooms ?? null,
    date: dateStr,
    uploadedAt: new Date().toISOString(),
    photoCount: manifest.length,
    damageFlagged: manifest.filter(m => m.damage).length,
    moldFlagged: manifest.filter(m => m.mold).length,
    photos: manifest,
  })
  onProgress?.(1)
}
