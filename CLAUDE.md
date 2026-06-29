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
5. Take photos (with optional caption per photo).
6. Save — photos upload automatically; if there's no signal, they queue and upload later.

## Folder structure created in SharePoint/OneDrive

```
/Site Visit Photos/
  <Property Name>/
    <Unit>/
      <YYYY-MM-DD — Visit Type>/
        photos + a small _visit.json with the visit details
```

Example photo name: `Unit101_MoveIn_2026-06-29_001.jpg`

## Technical choices

- Frontend: React PWA (installable, works offline via a service worker).
- Sign-in: Microsoft Authentication Library (MSAL.js), work/school accounts.
- Storage: Microsoft Graph API, writing to a shared SharePoint document library.
- Offline: save photos locally first (IndexedDB), then sync when back online.
- Hosting: a static host (Vercel or Netlify) connected to this GitHub repo for live previews.

## Build phases (do one at a time, then stop)

1. **Scaffold** the React PWA — installable shell, basic screens, runs and shows a live preview.
2. **Capture flow** — property pick-list, unit entry, visit-type selector, camera, captions. (No Microsoft needed yet — this can be fully tested on its own.)
3. **Offline queue** — save photos on the phone and show a "waiting to upload" count.
4. **Microsoft sign-in** — MSAL login with a work account. (Needs config values from a Microsoft 365 admin — I'll provide these when ready.)
5. **Upload to SharePoint** — create the folder tree on demand and upload photos with correct names.
6. **Polish** — metadata file, optional GPS, settings to edit visit types/properties, error handling.

## Important note

The company is on AppFolio Core, which has no API, so photos go to SharePoint/OneDrive (not AppFolio) automatically. That decision is final — do not try to integrate AppFolio.

## Start here

Begin with Phase 1 only. Propose your plan first, in plain language, and wait for my go-ahead before writing code.
