# Design — Share Feature (Bagikan Link Data)

Status: Approved for planning
Date: 2026-07-15
Source: `TODO-PRD-GAPS.md`, section "Fitur baru — belum tercakup di PRD sama sekali" ("Tombol Share")
Related PRD sections: none yet — this feature requires a new PRD section (§20), part of this spec's scope.
It also touches §1, §3.3, §11 (core "fully local, no backend" principle) and §7.6/§9 (reuses the
Export/Import payload shape and validation).

## Why this scope, why now

Genuinely new feature, not in the PRD at all, and the TODO doc explicitly flags that it must be
added to the PRD before being built because it brushes up against the app's core architecture
principle ("fully local... no server, no data sent out"). The design below resolves the two open
questions the TODO doc raised, plus a third (URL-too-long handling) that came up during
brainstorming:

1. **No backend.** Encode the full payload (rooms + devices + settings) into the URL itself,
   compressed. Nothing is ever sent to, or stored on, any server the app controls. The link is
   just a self-contained blob of data; whatever channel the user pastes it into (WhatsApp, email,
   etc.) is the user's own choice, not something the app does automatically — this is why it does
   **not** conflict with §3.3's non-goal on cross-device sync/cloud backup (that non-goal is about
   the app silently syncing data between devices on its own; this feature is a manual,
   user-initiated, one-time export via a link, closer in spirit to Export/Import §7.6 than to sync).
2. **Read-only preview + optional import.** Opening a share link never silently overwrites the
   viewer's own data. It shows a read-only preview first; only if the viewer explicitly taps
   "Import ke perangkat ini" (with the same overwrite confirmation used by JSON import today) does
   it touch their local IndexedDB.
3. **Oversized data → deterministic trim, not truncation.** If the compressed payload exceeds a
   safe URL-length threshold, whole devices are dropped (never a raw string cut, which would break
   decoding) starting with the **lowest monthly-cost devices first** — preserving the
   highest-value information (the priciest, most "boros" devices) in a link that must be shortened.
   Rooms left with zero devices after trimming are dropped too. The share modal shows a warning
   when this happens.

## Context worth remembering while implementing

- No router in this app (confirmed in the Donation spec too) — all "pages" are either modals in
  `src/App.tsx`'s `Modal` union, or (new for this feature) a full-screen swap driven by
  `location.hash`, checked once on mount. No `react-router` dependency needed.
- `src/exportImport.ts` already defines `ExportPayload` (`{ schemaVersion: 1, exportedAt, rooms,
  devices, settings }`), `buildExportPayload`, and `validateImportPayload`. The share feature reuses
  all three directly — the share payload *is* an `ExportPayload`, just delivered via URL instead of
  a downloaded file.
- `store.ts`'s `importData(payload: ExportPayload)` already does the full replace-all-with-transaction
  import. `SettingsPanel.tsx`'s import flow already establishes the UX convention: validate → if
  invalid show inline error → `window.confirm('Ini akan mengganti semua data yang ada saat ini.
  Lanjutkan?')` → `importData(...)`. `ShareView`'s import button follows the exact same convention.
- `RoomCard.tsx` is interactive-only (requires `onAddDevice`/`onEditDevice`/`onEditRoom` callbacks) —
  it is not reused as-is for the read-only preview. `ShareView` renders its own simplified read-only
  list directly from `calcDevice`/`formatRupiah`/`formatKwh` (already exported from `db.ts`/`utils.ts`),
  rather than adding optional-callback branches to `RoomCard` for a one-off read-only mode.
- New dependency: `lz-string` (small, no transitive deps) — use
  `compressToEncodedURIComponent`/`decompressFromEncodedURIComponent`, which are already
  URL-safe, so no extra `encodeURIComponent` layer is needed.

## 1. `src/share.ts` — pure logic module (mirrors `exportImport.ts`'s style)

```ts
export const MAX_SHARE_URL_LENGTH = 4000 // chars, compressed payload portion only

export interface BuildShareLinkResult {
  url: string
  truncated: boolean
  droppedDeviceCount: number
}

export function buildShareLink(payload: ExportPayload, origin: string): BuildShareLinkResult
export function parseShareHash(hash: string): ValidationResult // reuses exportImport's ValidationResult
```

- `buildShareLink`:
  - Serializes payload with `JSON.stringify`, compresses with
    `LZString.compressToEncodedURIComponent`.
  - If the compressed string's length is within `MAX_SHARE_URL_LENGTH`, returns
    `{ url: \`${origin}/#share=${compressed}\`, truncated: false, droppedDeviceCount: 0 }`.
  - Otherwise: build a sorted-ascending-by-monthly-cost list of all devices (using `calcDevice`),
    repeatedly drop the single cheapest remaining device, drop any room left with no devices, and
    re-serialize/re-compress after each drop, until the result fits or zero devices remain. Returns
    the fitting URL plus `truncated: true` and how many devices were dropped.
  - This is a hard cap on iterations bounded by device count, so it's not unbounded work even for
    large households.
- `parseShareHash(hash)`: strips the `#share=` prefix, `decompressFromEncodedURIComponent`, parses
  JSON, and runs it through the existing `validateImportPayload` from `exportImport.ts` — so a
  corrupted/truncated/foreign hash is rejected with the same error-shaped result import already
  uses, no duplicate validation logic.

## 2. `src/components/ShareModal.tsx`

- Opened from a new `{ type: 'share' }` modal variant, follows the existing bottom-sheet/modal
  visual pattern (same as `DonationModal.tsx`/`SettingsPanel.tsx`).
- On open, calls `buildShareLink(buildExportPayload(rooms, devices, settings), window.location.origin + window.location.pathname)`.
- Body: read-only text input showing the generated link, "Salin Link" button (Clipboard API), and
  — if `navigator.share` exists (mobile) — a "Bagikan" button that calls it directly with the URL.
- If `result.truncated`, show a yellow inline warning: *"`{droppedDeviceCount}` perangkat tidak
  disertakan karena link jadi terlalu panjang. Perangkat dengan biaya bulanan terkecil yang
  dihilangkan duluan."*

## 3. `src/components/ShareView.tsx`

- Rendered by `App.tsx` in place of the normal dashboard when `location.hash` starts with
  `#share=` (checked once via `useState`/`useEffect` on mount, no router).
- Parses via `parseShareHash`. If invalid, shows a simple error state ("Link tidak valid atau
  rusak") with a link back to the normal app (clears the hash).
- If valid: banner "Ini pratinjau data yang dibagikan — bukan data Anda", read-only summary (total
  monthly cost/kWh) and per-room/per-device list (own lightweight rendering, see Context section
  above — not a reused `RoomCard`).
- Two actions at the bottom:
  - **"Import ke perangkat ini"** — same confirm text as existing JSON import
    (`window.confirm('Ini akan mengganti semua data yang ada saat ini. Lanjutkan?')`) → calls the
    store's existing `importData(payload)` → on success, clears `location.hash` (via
    `history.replaceState`) so the app re-renders the normal dashboard with the newly-imported data.
  - **"Tutup pratinjau"** — clears the hash without importing, returns to the viewer's own existing
    data untouched.

## 4. `src/App.tsx` changes

- Add `{ type: 'share' }` to the `Modal` union; new Share button near `SummaryCards` (dashboard,
  not just Settings) opening it.
- On mount, check `location.hash`; if it starts with `#share=`, render `<ShareView />` instead of
  the normal header/main/modal tree (early return, same idea as the existing `!loaded` early
  return).

## 5. PRD update

Add new **§20 "Fitur Share (Bagikan Data)"** to `PRD-Kalkulator-Listrik-PWA.md`, following the
§19 Donasi section's structure (goal, access point, mechanism, explicit boundary clarifications):

- Mechanism: full data snapshot compressed into a URL hash fragment; no server involved at any
  point; opened link shows a read-only preview, with an explicit opt-in "Import" action that reuses
  the existing Export/Import replace-all mechanism (§7.6).
- Explicit clarification (mirroring how Donation clarified §3.3's payment non-goal) that this does
  **not** contradict §3.3's "sinkronisasi antar-perangkat / cloud backup" non-goal: that non-goal
  refers to the app automatically keeping devices in sync; this feature is a manual, one-time,
  user-initiated data snapshot delivered via a link the user shares themselves, with no ongoing
  connection or automatic updates.
- Document the oversized-payload trim behavior (drop cheapest devices first, then empty rooms)
  and the `MAX_SHARE_URL_LENGTH` threshold, so future readers understand *why* a shared link might
  contain fewer devices than the sender's original data.

## 6. `TODO-PRD-GAPS.md` update

Move the "Tombol Share" bullet from the "Fitur baru — belum tercakup di PRD sama sekali" section to
checked `[x]`, referencing new **§20**, following the exact pattern used for the Donation entry
(bullet text + pointer to this spec + the implementation plan doc).

## Testing

- Unit tests for `share.ts`: compress/decompress round-trip produces an identical payload;
  `parseShareHash` rejects a corrupted/foreign/wrong-schemaVersion hash via the reused
  `validateImportPayload`; trimming logic drops lowest-cost devices first and removes emptied
  rooms, and terminates correctly even in the all-devices-dropped edge case.
- Manual end-to-end: generate a share link → open in a new tab/incognito → see read-only preview
  → import → confirm local data now matches the shared snapshot → confirm cancel path ("Tutup
  pratinjau") leaves the viewer's own existing data untouched.

## Out of scope

- Any backend/server-side storage for share links (explicitly rejected during brainstorming in
  favor of the fully-local URL-encoding approach).
- Selecting a subset of rooms/devices to share — the feature shares the full current snapshot,
  same granularity as Export/Import.
- Link expiration, revocation, or edit-after-share — links are static snapshots; there's no server
  to expire or revoke anything on.
