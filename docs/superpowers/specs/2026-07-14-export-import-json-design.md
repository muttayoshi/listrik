# Design — Export / Import JSON

Status: Approved for planning
Date: 2026-07-14
Source gap: `TODO-PRD-GAPS.md` P1 item "Export / Import JSON"
Related PRD sections: §7.6, §12 (risk table), §14.1

## Why this scope, why now

With all P0 PWA-installability gaps closed, this is the next-highest-priority
item in `TODO-PRD-GAPS.md`. PRD §12 names it as the primary mitigation for
this app's biggest structural risk: all data lives in one browser's IndexedDB
with no backup — clearing site data, switching browsers, or switching devices
means total data loss. Export/Import is the escape hatch.

## Context worth remembering while implementing

- The PRD (§7.6) predates this app's `Room` entity — it only mentions
  "perangkat + settings". The actual data model (`src/db.ts`) has `Room`,
  `Device` (device.roomId is required, non-nullable), and `Settings` as three
  separate Dexie tables. A useful export must include all three — exporting
  devices without their rooms would produce a file that can't be re-imported
  cleanly, since the app's onboarding flow requires rooms to exist before
  devices can attach to them.
- This is fully client-side, offline-capable work — no network calls, no new
  npm dependency needed. `Blob` + `<a download>` for export, `FileReader` +
  `<input type="file">` for import are all browser-native APIs already
  available.
- Settings UI already exists at `src/components/SettingsPanel.tsx`. Recent
  changes to that file (the max-h-[85vh] + overflow-y-auto scroll fix) mean
  new buttons here will scroll along with the rest of the panel's content —
  no special handling needed, just add them in the scrollable middle section.

## 1. Export

- New "Export Data" button in `SettingsPanel.tsx`'s scrollable content area,
  positioned near the existing "Data tersimpan lokal" amber notice (both are
  about local-data awareness, so grouping them is coherent).
- On click: read all rows from `db.rooms`, `db.devices`, and the current
  `settings` (already available via `useStore()`), assemble into:

  ```json
  {
    "schemaVersion": 1,
    "exportedAt": "<ISO 8601 timestamp>",
    "rooms": [ ... ],
    "devices": [ ... ],
    "settings": { ... }
  }
  ```

  `schemaVersion` exists so a future format change has something to branch
  on during import — no migration logic is needed yet, just the field.
- Serialize to a `Blob` (`type: "application/json"`), trigger a download via
  a temporary `<a download="...">` element (`URL.createObjectURL` +
  `revokeObjectURL` after triggering), no server round-trip.
- Filename: `listrikku-backup-YYYY-MM-DD.json` (date = export date, local
  timezone, matches the `exportedAt` day).

## 2. Import

- New "Import Data" button next to Export, opens a hidden
  `<input type="file" accept=".json">` via a ref-triggered `.click()`.
- Selected file is read via `FileReader.readAsText`, then `JSON.parse`'d.
- **Validation before anything is applied** — reject and show a clear error
  message (data on the device is left completely untouched) if any of:
  - The file isn't valid JSON.
  - `rooms` or `devices` isn't an array, or `settings` isn't an object.
  - Any room is missing a required field or has a wrong type (`id`, `name`,
    `icon`, `order`, `createdAt` per the `Room` interface in `src/db.ts`).
  - Any device is missing a required field or has a wrong type (`id`,
    `roomId`, `name`, `watt`, `hoursPerDay`, `quantity`, `createdAt`,
    `updatedAt` per the `Device` interface).
  - Any `device.roomId` doesn't match an `id` present in the file's own
    `rooms` array (referential integrity — prevents importing an orphaned
    device that would violate this app's room-first invariant, where every
    device must belong to an existing room).
  - `settings` is missing `tariffPerKwh`, `daysPerMonth`, or `ppjPercent`,
    or any of those has the wrong type.
- If validation passes: show a lightweight confirmation dialog ("Ini akan
  mengganti semua data yang ada saat ini. Lanjutkan?") before applying
  anything, since this is a destructive replace.
- On confirm: **replace-total** semantics — clear `db.rooms`, `db.devices`,
  `db.settings` and write the imported data, inside a single Dexie
  transaction (`db.transaction('rw', db.rooms, db.devices, db.settings,
  async () => {...})`) so a mid-write failure can't leave the app in a
  half-old-half-new state.
- After a successful import, the in-memory Zustand store (`src/store.ts`)
  needs to be refreshed from the new IndexedDB contents (re-run the same
  loading logic `load()` already uses) so the UI reflects the imported data
  immediately without requiring a manual page reload.

## Out of scope

- Merge-on-import (only replace-total is being built, per explicit product
  decision — merging would require conflict/ID-collision handling that adds
  real complexity for a use case, "restore/move to a new device," where the
  destination is normally empty anyway).
- Schema migration logic for `schemaVersion` values other than `1` — the
  field is present for future use, but only `schemaVersion: 1` needs to be
  accepted right now; anything else should fail validation with a clear
  message rather than attempt a guess-based migration.
- Partial/selective import (e.g., "only import settings, not rooms") — not
  requested, not in PRD §7.6.
- Any other P1/P2/P4 item in `TODO-PRD-GAPS.md` (charts, dark mode,
  multi-profile, etc.) — separate future specs.
