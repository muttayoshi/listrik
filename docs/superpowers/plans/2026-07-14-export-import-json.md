# Export / Import JSON Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users export all their data (rooms + devices + settings) to a `.json` file and import it back, with replace-total semantics and pre-apply validation — closing the P1 "Export/Import JSON" gap in `TODO-PRD-GAPS.md`.

**Architecture:** A new pure-logic module (`src/exportImport.ts`) owns payload building, filename generation, the download trigger, and structural+referential validation of an imported file. `src/store.ts` gets one new Zustand action (`importData`) that does the actual Dexie replace-total transaction. `src/components/SettingsPanel.tsx` wires both together behind two new buttons.

**Tech Stack:** React 19, TypeScript (strict), Zustand, Dexie — no new npm dependency. Browser-native `Blob`/`URL.createObjectURL`/`FileReader`/`<input type="file">`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-14-export-import-json-design.md` — read it before starting.
- Export file schema: `{ schemaVersion: 1, exportedAt: <ISO string>, rooms: Room[], devices: Device[], settings: Settings }`. `Room`/`Device`/`Settings` types are defined in `src/db.ts` — do not redefine them, import as types.
- Import is **replace-total**: on a valid, confirmed import, all existing `rooms`/`devices`/`settings` are cleared and replaced by the file's contents. No merge logic.
- Import must validate the file **before** touching any existing data: structural validation (required fields, correct types) AND referential integrity (every `device.roomId` must match a `room.id` present in the same file). On any validation failure, show an error and leave existing data completely untouched.
- A destructive import requires a confirmation step before being applied (a native `window.confirm(...)` dialog is sufficient — no custom modal component needed, per the spec's "lightweight" requirement).
- No test framework in this project (by established prior decision) — pure-logic verification uses Node's built-in TypeScript type-stripping to run `.ts` files directly (`node path/to/file.ts`, using `import type` for any type-only imports so side-effecting modules like `src/db.ts`'s Dexie instantiation are never evaluated) plus `node:assert/strict`. UI/integration verification is manual via the dev server and, where useful, an ad hoc Playwright script (already installed and working in this environment from prior verification work) — not committed to the repo.
- Follow existing `SettingsPanel.tsx` visual conventions: Tailwind utility classes, `style={{ fontFamily: 'var(--font-display)' }}` on labels, `border-gray-200` / `hover:border-emerald-300 hover:bg-emerald-50/50` outlined-button style (matches the existing preset-tariff buttons in the same file).

---

### Task 1: `src/exportImport.ts` — payload building, filename, download, validation

**Files:**
- Create: `src/exportImport.ts`

**Interfaces:**
- Produces: `ExportPayload` type, `buildExportPayload(rooms: Room[], devices: Device[], settings: Settings): ExportPayload`, `exportFilename(date?: Date): string`, `downloadJson(payload: ExportPayload, filename: string): void`, `ValidationResult` type (`{ ok: true; data: ExportPayload } | { ok: false; error: string }`), `validateImportPayload(raw: unknown): ValidationResult`. Task 2 (store) consumes `ExportPayload`. Task 3 (UI) consumes all five exports.
- Consumes: `type { Room, Device, Settings }` from `src/db.ts` (type-only import — this module must never trigger `src/db.ts`'s Dexie side effects when run standalone under plain Node).

- [ ] **Step 1: Write the file**

Create `src/exportImport.ts`:

```ts
import type { Room, Device, Settings } from './db'

export interface ExportPayload {
  schemaVersion: 1
  exportedAt: string
  rooms: Room[]
  devices: Device[]
  settings: Settings
}

export function buildExportPayload(rooms: Room[], devices: Device[], settings: Settings): ExportPayload {
  return { schemaVersion: 1, exportedAt: new Date().toISOString(), rooms, devices, settings }
}

export function exportFilename(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `listrikku-backup-${y}-${m}-${d}.json`
}

export function downloadJson(payload: ExportPayload, filename: string) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export type ValidationResult = { ok: true; data: ExportPayload } | { ok: false; error: string }

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function isValidRoom(v: unknown): v is Room {
  return (
    isRecord(v) &&
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.icon === 'string' &&
    typeof v.order === 'number' &&
    typeof v.createdAt === 'number'
  )
}

function isValidDevice(v: unknown): v is Device {
  return (
    isRecord(v) &&
    typeof v.id === 'string' &&
    typeof v.roomId === 'string' &&
    typeof v.name === 'string' &&
    typeof v.watt === 'number' &&
    typeof v.hoursPerDay === 'number' &&
    typeof v.quantity === 'number' &&
    typeof v.createdAt === 'number' &&
    typeof v.updatedAt === 'number'
  )
}

function isValidSettings(v: unknown): v is Omit<Settings, 'id'> {
  return (
    isRecord(v) &&
    typeof v.tariffPerKwh === 'number' &&
    typeof v.daysPerMonth === 'number' &&
    typeof v.ppjPercent === 'number'
  )
}

export function validateImportPayload(raw: unknown): ValidationResult {
  if (!isRecord(raw)) return { ok: false, error: 'File bukan objek JSON yang valid.' }
  if (raw.schemaVersion !== 1) return { ok: false, error: 'Versi skema file tidak didukung.' }
  if (typeof raw.exportedAt !== 'string') return { ok: false, error: 'Field exportedAt tidak valid.' }

  if (!Array.isArray(raw.rooms) || !raw.rooms.every(isValidRoom)) {
    return { ok: false, error: 'Data ruangan tidak valid.' }
  }
  const rooms = raw.rooms as Room[]

  if (!Array.isArray(raw.devices) || !raw.devices.every(isValidDevice)) {
    return { ok: false, error: 'Data perangkat tidak valid.' }
  }
  const devices = raw.devices as Device[]

  if (!isValidSettings(raw.settings)) {
    return { ok: false, error: 'Data pengaturan tidak valid.' }
  }
  const settings: Settings = { id: 1, ...raw.settings }

  const roomIds = new Set(rooms.map((r) => r.id))
  if (devices.some((d) => !roomIds.has(d.roomId))) {
    return { ok: false, error: 'Ada perangkat yang menunjuk ke ruangan yang tidak ada di file.' }
  }

  return { ok: true, data: { schemaVersion: 1, exportedAt: raw.exportedAt, rooms, devices, settings } }
}
```

- [ ] **Step 2: Write and run a standalone verification script**

This project has no test framework; Node's built-in TypeScript type-stripping lets us run `.ts` files directly, and `import type` is fully elided at runtime — confirmed during planning that a module doing this never touches `src/db.ts`'s Dexie/IndexedDB code, so this works in plain Node with no browser and no `fake-indexeddb` dependency.

Create a scratch file (anywhere outside `src/`, e.g. `/tmp/verify-exportImport.ts` — do not commit it) with this content:

```ts
import assert from 'node:assert/strict'
import { buildExportPayload, exportFilename, validateImportPayload } from '<ABSOLUTE_OR_RELATIVE_PATH_TO>/src/exportImport.ts'

const room = { id: 'r1', name: 'Dapur', icon: '🍳', order: 0, createdAt: 1000 }
const device = { id: 'd1', roomId: 'r1', name: 'Kulkas', watt: 100, hoursPerDay: 24, quantity: 1, createdAt: 1000, updatedAt: 1000 }
const settings = { id: 1 as const, tariffPerKwh: 1444.7, daysPerMonth: 30, ppjPercent: 0 }

const payload = buildExportPayload([room], [device], settings)
assert.equal(payload.schemaVersion, 1)
assert.equal(payload.rooms.length, 1)
assert.equal(payload.devices.length, 1)
assert.equal(payload.settings.tariffPerKwh, 1444.7)
assert.ok(typeof payload.exportedAt === 'string' && !isNaN(Date.parse(payload.exportedAt)))
console.log('PASS buildExportPayload')

assert.equal(exportFilename(new Date(2026, 0, 5)), 'listrikku-backup-2026-01-05.json')
console.log('PASS exportFilename padding')

assert.equal(validateImportPayload(payload).ok, true)
console.log('PASS validateImportPayload valid case')

assert.equal(validateImportPayload('not json').ok, false)
assert.equal(validateImportPayload(null).ok, false)
console.log('PASS validateImportPayload rejects non-object')

assert.equal(validateImportPayload({ ...payload, schemaVersion: 2 }).ok, false)
console.log('PASS validateImportPayload rejects wrong schemaVersion')

assert.equal(validateImportPayload({ ...payload, rooms: 'nope' }).ok, false)
console.log('PASS validateImportPayload rejects non-array rooms')

assert.equal(validateImportPayload({ ...payload, rooms: [{ id: 'r1', name: 'x' }] }).ok, false)
console.log('PASS validateImportPayload rejects incomplete room')

const orphanDevice = { ...device, roomId: 'does-not-exist' }
assert.equal(validateImportPayload({ ...payload, devices: [orphanDevice] }).ok, false)
console.log('PASS validateImportPayload rejects orphaned device')

assert.equal(validateImportPayload({ ...payload, settings: { tariffPerKwh: 100 } }).ok, false)
console.log('PASS validateImportPayload rejects incomplete settings')

console.log('ALL CHECKS PASSED')
```

Update the import path to point at the real `src/exportImport.ts` (relative from wherever you place the scratch file), then run:

```bash
node /tmp/verify-exportImport.ts
```

Expected output: nine `PASS ...` lines followed by `ALL CHECKS PASSED`, no errors. (This exact script was already run successfully during planning — if any line fails, the implementation in Step 1 was transcribed incorrectly; compare against the code above.)

Delete the scratch file when done (`rm /tmp/verify-exportImport.ts`) — it must not be committed.

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no output, exit code 0.

- [ ] **Step 4: Commit**

```bash
git add src/exportImport.ts
git commit -m "$(cat <<'EOF'
Add export/import payload building and validation logic

Pure module: builds the {schemaVersion, exportedAt, rooms, devices,
settings} export payload, triggers a Blob download, and validates an
imported file's structure plus device->room referential integrity
before any data is touched. No new dependency — download uses
browser-native Blob/URL APIs.
EOF
)"
```

---

### Task 2: `src/store.ts` — `importData` action

**Files:**
- Modify: `src/store.ts`

**Interfaces:**
- Consumes: `ExportPayload` type from `src/exportImport.ts` (Task 1).
- Produces: `importData: (payload: ExportPayload) => Promise<void>` on the Zustand store, consumed by Task 3's `SettingsPanel.tsx`.

- [ ] **Step 1: Add the type import**

In `src/store.ts`, add below the existing `./db` import (line 3):

```ts
import type { ExportPayload } from './exportImport'
```

- [ ] **Step 2: Add to the `AppState` interface**

In the `AppState` interface, under the `// Settings` comment (after `updateSettings: (s: Settings) => Promise<void>` on line 20), add:

```ts
  importData: (payload: ExportPayload) => Promise<void>
```

- [ ] **Step 3: Add the action implementation**

After the existing `updateSettings` action (after line 88, `},` that closes it, before the final `}))` on line 89), add:

```ts
  importData: async (payload) => {
    await db.transaction('rw', db.rooms, db.devices, db.settings, async () => {
      await db.rooms.clear()
      await db.devices.clear()
      await db.settings.clear()
      await db.rooms.bulkAdd(payload.rooms)
      await db.devices.bulkAdd(payload.devices)
      await db.settings.put(payload.settings)
    })
    const rooms = [...payload.rooms].sort((a, b) => a.order - b.order)
    const devices = [...payload.devices].sort((a, b) => a.createdAt - b.createdAt)
    set({ rooms, devices, settings: payload.settings })
  },
```

The sort matches how `load()` already orders data (`db.rooms.orderBy('order')`, `db.devices.orderBy('createdAt')`) — without it, room/device list order after an import would depend on the file's array order instead of the app's normal ordering.

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no output, exit code 0.

Note: this action's actual behavior against real IndexedDB (the Dexie transaction, clear+bulkAdd, state refresh) cannot be verified in isolation without either a real browser or a `fake-indexeddb` dependency (not installed, and adding one is out of scope — no test framework decision applies here too). Typecheck is the only automated check for this task; Task 4 exercises this action for real, end-to-end, in a real browser via the UI built in Task 3.

- [ ] **Step 5: Commit**

```bash
git add src/store.ts
git commit -m "$(cat <<'EOF'
Add importData store action for replace-total data restore

Clears rooms/devices/settings and rewrites them from an ExportPayload
inside one Dexie transaction, so a mid-write failure can't leave the
app in a half-old-half-new state. Refreshes in-memory state with the
same ordering load() uses.
EOF
)"
```

---

### Task 3: Export/Import UI in `SettingsPanel.tsx`

**Files:**
- Modify: `src/components/SettingsPanel.tsx`

**Interfaces:**
- Consumes: `buildExportPayload`, `downloadJson`, `exportFilename`, `validateImportPayload` from `src/exportImport.ts` (Task 1); `importData` from the store (Task 2); `rooms`, `devices` from `useStore()` (already exist on the store, just not currently destructured in this file).

- [ ] **Step 1: Update imports**

Current imports (lines 1-4):

```tsx
import { useState } from 'react'
import { useStore } from '../store'
import { PLN_TARIFFS } from '../db'
import { formatRupiah } from '../utils'
```

Replace with:

```tsx
import { useRef, useState, type ChangeEvent } from 'react'
import { useStore } from '../store'
import { PLN_TARIFFS } from '../db'
import { formatRupiah } from '../utils'
import { buildExportPayload, downloadJson, exportFilename, validateImportPayload } from '../exportImport'
```

- [ ] **Step 2: Destructure `rooms`/`devices`/`importData`, add new state and handlers**

Current (lines 10-14):

```tsx
export default function SettingsPanel({ onClose }: Props) {
  const { settings, updateSettings } = useStore()
  const [tariff, setTariff] = useState(String(settings.tariffPerKwh))
  const [days, setDays] = useState(String(settings.daysPerMonth))
  const [ppj, setPpj] = useState(String(settings.ppjPercent))
```

Replace with:

```tsx
export default function SettingsPanel({ onClose }: Props) {
  const { rooms, devices, settings, updateSettings, importData } = useStore()
  const [tariff, setTariff] = useState(String(settings.tariffPerKwh))
  const [days, setDays] = useState(String(settings.daysPerMonth))
  const [ppj, setPpj] = useState(String(settings.ppjPercent))
  const [importError, setImportError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
```

- [ ] **Step 3: Add the export/import handler functions**

Immediately after the existing `handleSave` function (after its closing `}` — currently ends at line 24), add:

```tsx

  function handleExport() {
    const payload = buildExportPayload(rooms, devices, settings)
    downloadJson(payload, exportFilename())
  }

  function handleImportClick() {
    setImportError('')
    fileInputRef.current?.click()
  }

  async function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    let parsed: unknown
    try {
      parsed = JSON.parse(await file.text())
    } catch {
      setImportError('File bukan JSON yang valid.')
      return
    }

    const result = validateImportPayload(parsed)
    if (!result.ok) {
      setImportError(result.error)
      return
    }

    if (!window.confirm('Ini akan mengganti semua data yang ada saat ini. Lanjutkan?')) return

    await importData(result.data)
    onClose()
  }
```

- [ ] **Step 4: Add the UI block**

Insert this new block between the closing `</div>` of the PPJ field block and the existing amber "Data tersimpan lokal" notice div. Currently (lines 120-122):

```tsx
          </div>

          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
```

Replace with:

```tsx
          </div>

          {/* Export / Import */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block" style={{ fontFamily: 'var(--font-display)' }}>
              Cadangkan Data
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExport}
                className="py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50/50 transition-colors"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Export Data
              </button>
              <button
                onClick={handleImportClick}
                className="py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50/50 transition-colors"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Import Data
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              aria-label="Import Data"
              className="hidden"
              onChange={handleFileSelected}
            />
            {importError && <p className="text-xs text-red-500 mt-1.5">{importError}</p>}
          </div>

          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
```

- [ ] **Step 5: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no output, exit code 0.

- [ ] **Step 6: Manual visual check**

```bash
pnpm dev
```

(A dev server is already running per this project's `AGENTS.md`, on `$PORT`, default 8443 — reuse it rather than starting a second one.) Open Settings in the browser, confirm the "Cadangkan Data" section renders between the PPJ input and the amber notice, with two side-by-side buttons matching the visual style of the rest of the panel. Full interactive testing (actually exporting/importing) happens in Task 4.

- [ ] **Step 7: Commit**

```bash
git add src/components/SettingsPanel.tsx
git commit -m "$(cat <<'EOF'
Add Export/Import Data buttons to Settings panel

Export builds a payload from current rooms/devices/settings and
triggers a browser download. Import reads a selected file, validates
it (rejecting with an inline error and touching no existing data on
failure), confirms with the user before replacing anything, then
delegates to the store's importData action.
EOF
)"
```

---

### Task 4: End-to-end verification (export → import round trip, rejection path)

**Files:** none (verification only — no application code changes).

**Interfaces:**
- Consumes: the full feature built in Tasks 1-3, exercised through the real UI in a real browser.

- [ ] **Step 1: Confirm the dev server is reachable**

```bash
curl -sf http://localhost:${PORT:-8443} >/dev/null && echo "dev server OK"
```

Expected: `dev server OK`. (Per `AGENTS.md`, a dev server is always running — do not start a second one.)

- [ ] **Step 2: Write and run a Playwright round-trip script**

Playwright with a Chromium browser is already installed in this environment from prior verification work (`npx playwright install chromium` was already run once for this project — re-running is a harmless no-op if already present). If it's not present in the environment executing this task, install it first: `npx playwright install chromium`.

Create a scratch script (outside the repo, e.g. `/tmp/verify-export-import.mjs` — do not commit it):

```js
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const PORT = process.env.PORT || '8443'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 800 }, acceptDownloads: true })

// Auto-accept the native confirm() dialog import triggers.
page.on('dialog', (d) => d.accept())

await page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' })

// Seed one room + one device via the UI.
const hasEmptyState = await page.locator('text=Mulai dari ruangan').isVisible().catch(() => false)
if (hasEmptyState) {
  await page.locator('text=Tambah Ruangan Pertama').click()
  await page.waitForSelector('text=Nama Ruangan', { timeout: 5000 })
  await page.locator('input[type="text"]').first().fill('Ruang Tes Export')
  await page.locator('button:has-text("Buat Ruangan")').click()
  await page.waitForTimeout(400)
  const closeX = page.locator('button:has-text("✕")').first()
  if (await closeX.isVisible().catch(() => false)) await closeX.click()
}

// Open settings, export.
await page.locator('button[aria-label="Pengaturan"]').click()
await page.waitForSelector('text=Cadangkan Data', { timeout: 5000 })

const [download] = await Promise.all([
  page.waitForEvent('download'),
  page.locator('button:has-text("Export Data")').click(),
])
const exportPath = '/tmp/exported-listrikku.json'
await download.saveAs(exportPath)
const exported = JSON.parse(fs.readFileSync(exportPath, 'utf8'))
assert.equal(exported.schemaVersion, 1)
assert.equal(exported.rooms.length, 1)
assert.equal(exported.rooms[0].name, 'Ruang Tes Export')
console.log('PASS export produced a valid file with the seeded room')

// Craft a DIFFERENT payload to prove import actually replaces data (not a no-op).
const differentPayload = {
  schemaVersion: 1,
  exportedAt: new Date().toISOString(),
  rooms: [{ id: 'imported-room', name: 'Ruang Hasil Import', icon: '🛋️', order: 0, createdAt: Date.now() }],
  devices: [],
  settings: exported.settings,
}
const importPath = '/tmp/import-listrikku.json'
fs.writeFileSync(importPath, JSON.stringify(differentPayload))

await page.locator('input[aria-label="Import Data"]').setInputFiles(importPath)
await page.waitForTimeout(500)
// Settings panel closes itself (onClose() after a successful import) — confirm dashboard shows the new room.
await page.waitForSelector('text=Ruang Hasil Import', { timeout: 5000 })
const oldRoomGone = await page.locator('text=Ruang Tes Export').isVisible().catch(() => false)
assert.equal(oldRoomGone, false)
console.log('PASS import replaced old room with imported room (replace-total confirmed)')

// Rejection path: malformed JSON must not touch existing data.
await page.locator('button[aria-label="Pengaturan"]').click()
await page.waitForSelector('text=Cadangkan Data', { timeout: 5000 })
const badPath = '/tmp/bad-import.json'
fs.writeFileSync(badPath, '{not valid json')
await page.locator('input[aria-label="Import Data"]').setInputFiles(badPath)
await page.waitForSelector('text=File bukan JSON yang valid.', { timeout: 5000 })
console.log('PASS invalid JSON shows an inline error')

await page.locator('button:has-text("✕")').first().click()
await page.waitForSelector('text=Ruang Hasil Import', { timeout: 5000 })
console.log('PASS existing (imported) data still intact after the failed import attempt')

const consoleErrors = []
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
assert.equal(consoleErrors.length, 0)

await browser.close()
console.log('ALL CHECKS PASSED')
```

Run it:

```bash
node /tmp/verify-export-import.mjs
```

Expected output: the four `PASS ...` lines in order, followed by `ALL CHECKS PASSED`, no errors or timeouts.

If any step times out or fails, do not adjust the checklist to match — that indicates a real defect in Tasks 1-3 (most likely: `aria-label="Import Data"` missing or misspelled on the file input, the confirm dialog handler not registered before the click that triggers it, or the store's `importData` not actually replacing state). Investigate and fix the underlying task before proceeding.

Clean up scratch files when done:

```bash
rm -f /tmp/verify-export-import.mjs /tmp/exported-listrikku.json /tmp/import-listrikku.json /tmp/bad-import.json
```

- [ ] **Step 3: Report**

No commit for this task (no application code changed). Report the verification results in the task report so the reviewer can see the round-trip actually ran and passed.

---

## Self-Review Notes

- **Spec coverage:** Export payload shape + download → Task 1. Validation (structural + referential integrity) → Task 1. Replace-total transaction → Task 2. Confirmation dialog + error display + button placement → Task 3. Round-trip and rejection-path proof → Task 4. "Out of scope" items from the spec (merge import, schema migration, partial import) are correctly absent from every task.
- **Type consistency:** `ExportPayload`, `ValidationResult`, `validateImportPayload`, `buildExportPayload`, `downloadJson`, `exportFilename` are defined once in Task 1 and referenced with the same names/signatures in Tasks 2 and 3 — no renaming drift.
- **Verification honesty:** Task 2 explicitly states its own action isn't independently testable without a real browser (no `fake-indexeddb` dependency introduced) and defers real proof to Task 4 — this is stated rather than silently skipped.
