# CLAUDE.md — Site Visit Photos App

This file tells you (Claude Code) what we are building and how to work. Read it at the start of every session.

## What we're building

A mobile, installable app (a PWA) for a property management team to document site visits and unit walkthroughs with photos. Photos upload automatically into the company's shared Microsoft 365 storage (SharePoint / OneDrive for Business), organized into a tidy folder tree.

## Who I am

I am NOT a developer. Explain things in plain language. After each step, tell me exactly what to do to see or test the result. Never assume I know coding terms — define them simply when you must use them.

## How to work with me

- Build in the phases listed below, **one phase at a time.**
- After finishing a phase, **stop** and tell me how to review and test it before continuing.
- Keep changes small and explain what each one does in simple terms.

## The app flow (what a user does)

1. Sign in once with their Microsoft 365 work account.
2. Pick a property from a list that builds itself (type a new one the first time; tap it after that).
3. Type the unit number (e.g. 101).
4. Pick a visit type (Move-in, Move-out, Routine Inspection, Maintenance, General Site Visit).
5. Choose 2-bedroom or 3-bedroom (this only adds a third-bedroom prompt to the checklist; all units have 2 bathrooms).
6. Walk the room-by-room checklist, taking photos at each prompt (plus optional extra/off-checklist shots).
7. Optionally flag a photo as damage (⚠️) — a short note is then required for that photo.
8. Save — photos upload automatically; if there's no signal, they queue and upload later.

## Folder structure created in SharePoint/OneDrive

```
/Site Visit Photos/
  <Property Name>/
    <Unit>/
      <YYYY-MM-DD — Visit Type>/
        photos + a small _visit.json with the visit details
```

Example photo name: `Unit101_MoveIn_2026-06-29_001.jpg`
Flagged photo name (includes a plain-text DAMAGE marker so it's identifiable by browsing the folder alone):
`Unit204_MoveIn_2026-06-29_Bathroom1_DAMAGE_004.jpg`

The `_visit.json` records the visit details plus, for each photo: its room/checklist
label, its capture date-time (to the minute), and the damage note text for any flagged photo.

## Technical choices

- Frontend: React PWA (installable, works offline via a service worker).
- Sign-in: Microsoft Authentication Library (MSAL.js), work/school accounts.
- Storage: Microsoft Graph API, writing to a shared SharePoint document library.
- Offline: save photos locally first (IndexedDB), then sync when back online.
- Hosting: a static host (Vercel or Netlify) connected to this GitHub repo for live previews.

## Build phases (do one at a time, then stop)

1. **Scaffold** the React PWA — installable shell, basic screens, runs and shows a live preview. ✅ done
2. **Capture flow** — built one piece at a time (no Microsoft needed; fully testable on its own):
   - Self-building property pick-list ✅ done
   - Camera capture with thumbnails ✅ done
   - **Room-by-room checklist** — 2BR/3BR question, then guided prompts: living room,
     kitchen, dinette, laundry room, HVAC/water heater closet, bathroom 1, bathroom 2,
     bedroom 1, bedroom 2, and bedroom 3 only if 3BR. Each prompt allows 1+ photos; an
     "add extra photo" option covers off-checklist shots. Keep the checklist items in an
     easily editable list/config.
   - **Damage flag with required note** — tap a ⚠️ flag on any photo; a short note
     (enforce a small minimum length) is then REQUIRED before proceeding, but ONLY for
     flagged photos. Flagged filenames include a plain-text `DAMAGE` marker; note text is
     saved in `_visit.json`; show a flagged-photo count in the visit summary.
   - **Per-photo timestamp** — record each photo's actual capture date-time to the minute
     (filename and/or file metadata), reliable enough for tenant disputes. (May span Phase 2–3.)
3. **Offline queue** — save photos on the phone (IndexedDB) and show a "waiting to upload" count.
4. **Microsoft sign-in** — MSAL login with a work account. (Needs Client ID + Tenant ID from a Microsoft 365 admin.)
5. **Upload to SharePoint** — create the folder tree on demand and upload photos with correct names + `_visit.json`.
6. **Polish** — optional GPS, settings to edit visit types/properties/checklist, error handling, "update available" refresh banner.
7. **Optional video (later)** — managers can record a short video during a visit; it saves into the same visit folder as that visit's photos. Consider a length cap to keep file sizes manageable.
8. **AI anomaly review (future/advanced, after uploads work)** — optional end-of-visit step that analyzes a visit's photos and flags possible damage (cracked fixtures, water stains, visible damage) for human review. Depends on capture + storage being complete; has a per-photo cost; is a "flag for review" aid, not a guarantee; carries a privacy consideration about sending unit photos to an external AI service.

## Important note

The company is on AppFolio Core, which has no API, so photos go to SharePoint/OneDrive (not AppFolio) automatically. That decision is final — do not try to integrate AppFolio.

## Start here

Begin with Phase 1 only. Propose your plan first, in plain language, and wait for my go-ahead before writing code.
