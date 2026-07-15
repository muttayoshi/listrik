# Share Feature (Bagikan Link Data) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user generate a link that, when opened by anyone else, shows a read-only preview of their full data snapshot (rooms + devices + settings), with an explicit opt-in "Import ke perangkat ini" action — closing the "Tombol Share" gap in `TODO-PRD-GAPS.md` without adding a backend.

**Architecture:** A new pure-logic module (`src/share.ts`) compresses an `ExportPayload` (already defined in `src/exportImport.ts`) into a URL hash fragment using `lz-string`, with deterministic cheapest-device-first trimming when the result is too long, and decodes/validates a hash back into a payload (reusing `validateImportPayload`). Two new components — `ShareModal.tsx` (generate + copy/share the link) and `ShareView.tsx` (read-only preview + import) — plug into `src/App.tsx`'s existing `Modal` union and a new hash-based early-return (no router; this app has none and doesn't need one for one full-screen view).

**Tech Stack:** React 19, TypeScript (strict), Zustand, Dexie. One new dependency: `lz-string` (`^1.5.0`) — ships its own `.d.ts` (via its `typings` field), no `@types/lz-string` needed under this project's `moduleResolution: "bundler"` (confirmed during planning: `import LZString from 'lz-string'` typechecks and runs correctly in both Vite and plain Node).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-15-share-feature-design.md` — read it before starting.
- No backend, ever. The entire payload lives in the URL hash fragment (`#share=<compressed>`), never sent to or read from any server.
- `MAX_SHARE_URL_LENGTH = 4000` (chars, compressed-payload portion only, not counting origin/prefix). Below this, share links are untouched. Above it, whole devices are dropped (never a raw string truncation) — **cheapest monthly-cost device first**, and any room left with zero devices is dropped too.
- Opening a share link is **read-only by default**. Local data is only ever touched if the viewer explicitly taps "Import ke Perangkat Ini", and only after the same `window.confirm('Ini akan mengganti semua data yang ada saat ini. Lanjutkan?')` used by JSON import today (`src/components/SettingsPanel.tsx`) — reuse this exact string, don't rephrase it.
- Reuse existing pieces, don't reimplement: `ExportPayload`, `ValidationResult`, `buildExportPayload`, `validateImportPayload` from `src/exportImport.ts`; `importData` from the store (`src/store.ts`); `calcDevice`, `Device`, `Room`, `Settings` types from `src/db.ts`; `formatRupiah`, `formatKwh` from `src/utils.ts`.
- No router. `App.tsx` checks `location.hash` once on mount (`useState` initializer) and renders `ShareView` instead of the normal dashboard when it starts with `#share=` — same "no new route" philosophy as every other modal in this app.
- No test framework in this project (established prior decision, see `docs/superpowers/plans/2026-07-14-export-import-json.md`). Pure-logic verification (`src/share.ts`) uses Node's built-in TypeScript type-stripping (`node <file>.ts`) + `node:assert/strict`, run from the **repo root** (not `/tmp`) so Node's module resolution can find the real `lz-string` in `node_modules` — this differs from the exportImport.ts precedent, which had no runtime dependency and could run from anywhere. UI/integration verification is a live Playwright script (Chromium already installed and working in this environment from prior verification work).
- Follow existing modal visual conventions exactly (see `src/components/DonationModal.tsx`/`RoomForm.tsx`): `fixed inset-0` backdrop with click-outside-to-close, bottom-sheet on mobile / centered on desktop (`rounded-t-3xl sm:rounded-3xl`), drag-handle bar (`sm:hidden`), header with title + `✕` close button.
- Package manager is `pnpm` (there's a `pnpm-lock.yaml`, no other lockfile) — use `pnpm add`, not `npm install`.

---

### Task 1: `src/share.ts` — compression, trimming, and hash parsing

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml` (via `pnpm add`)
- Create: `src/share.ts`

**Interfaces:**
- Consumes: `type { ExportPayload, ValidationResult }` and `validateImportPayload` from `./exportImport` (both already exist); `type { Device }` and `calcDevice` from `./db` (both already exist).
- Produces: `SHARE_HASH_PREFIX: string`, `MAX_SHARE_URL_LENGTH: number`, `BuildShareLinkResult` type (`{ url: string; truncated: boolean; droppedDeviceCount: number }`), `buildShareLink(payload: ExportPayload, origin: string): BuildShareLinkResult`, `parseShareHash(hash: string): ValidationResult`. Task 2 (`ShareModal`) consumes `buildShareLink`. Task 3 (`ShareView`) consumes `parseShareHash`. Task 4 (`App.tsx`) consumes `SHARE_HASH_PREFIX`.

- [ ] **Step 1: Add the `lz-string` dependency**

```bash
pnpm add lz-string@^1.5.0
```

- [ ] **Step 2: Confirm it's typed correctly with this project's tsconfig (sanity check, not part of the committed diff)**

`lz-string`'s package.json sets `"typings": "typings/lz-string.d.ts"` but declares only named exports (`export function compressToEncodedURIComponent...`), no default export. Confirmed during planning that with this project's `moduleResolution: "bundler"` (see `tsconfig.json`), `import LZString from 'lz-string'` (default import) typechecks with **zero** errors and resolves correctly at runtime in plain Node — a **named** import (`import { compressToEncodedURIComponent } from 'lz-string'`) does NOT work at runtime under plain Node (it's a CommonJS module; Node's ESM/CJS interop doesn't statically detect its named exports), so **always use the default-import form** in this file and in the verification script below.

- [ ] **Step 3: Write `src/share.ts`**

```ts
import LZString from 'lz-string'
import type { ExportPayload, ValidationResult } from './exportImport'
import { validateImportPayload } from './exportImport'
import { calcDevice } from './db'

export const SHARE_HASH_PREFIX = '#share='
export const MAX_SHARE_URL_LENGTH = 4000

export interface BuildShareLinkResult {
  url: string
  truncated: boolean
  droppedDeviceCount: number
}

function compressPayload(payload: ExportPayload): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(payload))
}

function buildUrl(origin: string, compressed: string): string {
  return `${origin}${SHARE_HASH_PREFIX}${compressed}`
}

export function buildShareLink(payload: ExportPayload, origin: string): BuildShareLinkResult {
  const full = compressPayload(payload)
  if (full.length <= MAX_SHARE_URL_LENGTH || payload.devices.length === 0) {
    return { url: buildUrl(origin, full), truncated: false, droppedDeviceCount: 0 }
  }

  // Drop whole devices, cheapest monthly cost first, until the compressed link fits.
  const byCostAscending = [...payload.devices].sort(
    (a, b) => calcDevice(a, payload.settings).monthlyCost - calcDevice(b, payload.settings).monthlyCost
  )

  for (let dropped = 1; dropped <= byCostAscending.length; dropped++) {
    const remaining = byCostAscending.slice(dropped)
    const keptRoomIds = new Set(remaining.map((d) => d.roomId))
    const rooms = payload.rooms.filter((r) => keptRoomIds.has(r.id))
    const devices = [...remaining].sort((a, b) => a.createdAt - b.createdAt)
    const compressed = compressPayload({ ...payload, rooms, devices })
    if (compressed.length <= MAX_SHARE_URL_LENGTH || dropped === byCostAscending.length) {
      return { url: buildUrl(origin, compressed), truncated: true, droppedDeviceCount: dropped }
    }
  }

  // Unreachable: the loop above always returns on its last iteration. Kept for TypeScript's
  // control-flow analysis (a function typed to return BuildShareLinkResult on every path).
  return { url: buildUrl(origin, full), truncated: false, droppedDeviceCount: 0 }
}

export function parseShareHash(hash: string): ValidationResult {
  if (!hash.startsWith(SHARE_HASH_PREFIX)) {
    return { ok: false, error: 'Link tidak valid.' }
  }

  const compressed = hash.slice(SHARE_HASH_PREFIX.length)
  let json: string
  try {
    json = LZString.decompressFromEncodedURIComponent(compressed) ?? ''
  } catch {
    return { ok: false, error: 'Link rusak atau tidak bisa dibaca.' }
  }
  if (!json) {
    return { ok: false, error: 'Link rusak atau tidak bisa dibaca.' }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { ok: false, error: 'Link rusak atau tidak bisa dibaca.' }
  }

  return validateImportPayload(parsed)
}
```

- [ ] **Step 4: Write and run a standalone verification script**

Create `verify-share.ts` **at the repo root** (`/Users/karadigital/Mufakat/listrik/verify-share.ts` — NOT under `src/`, and NOT under `/tmp`, so Node's module resolution finds the real `lz-string` in `node_modules`; do not commit it):

```ts
import assert from 'node:assert/strict'
import { buildExportPayload } from './src/exportImport.ts'
import { buildShareLink, parseShareHash, SHARE_HASH_PREFIX, MAX_SHARE_URL_LENGTH } from './src/share.ts'

const ORIGIN = 'https://example.com/'
const settings = { id: 1 as const, tariffPerKwh: 1444.7, daysPerMonth: 30, ppjPercent: 0 }

// --- Small payload: no trimming needed, round-trips exactly ---
const room = { id: 'r1', name: 'Dapur', icon: '🍳', order: 0, createdAt: 1000 }
const device = { id: 'd1', roomId: 'r1', name: 'Kulkas', watt: 100, hoursPerDay: 24, quantity: 1, createdAt: 1000, updatedAt: 1000 }
const payload = buildExportPayload([room], [device], settings)

const result = buildShareLink(payload, ORIGIN)
assert.equal(result.truncated, false)
assert.equal(result.droppedDeviceCount, 0)
assert.ok(result.url.startsWith(ORIGIN + SHARE_HASH_PREFIX))
console.log('PASS buildShareLink: small payload is not truncated')

const hash = result.url.slice(ORIGIN.length)
const parsed = parseShareHash(hash)
assert.equal(parsed.ok, true)
if (parsed.ok) {
  assert.equal(parsed.data.rooms.length, 1)
  assert.equal(parsed.data.devices[0].name, 'Kulkas')
}
console.log('PASS parseShareHash: round-trips the exact payload')

// --- Rejection paths ---
assert.equal(parseShareHash('#nope=abc').ok, false)
console.log('PASS parseShareHash: rejects a hash without the share prefix')

assert.equal(parseShareHash(SHARE_HASH_PREFIX + '###garbage###').ok, false)
console.log('PASS parseShareHash: rejects undecodable garbage')

const wrongSchemaLink = buildShareLink({ ...payload, schemaVersion: 2 as any }, ORIGIN)
const wrongSchemaHash = wrongSchemaLink.url.slice(ORIGIN.length)
assert.equal(parseShareHash(wrongSchemaHash).ok, false)
console.log('PASS parseShareHash: rejects wrong schemaVersion')

// --- Trimming: oversized payload, cheapest devices dropped first ---
const manyRooms = Array.from({ length: 10 }, (_, i) => ({
  id: `room-${i}`, name: `Ruangan ${i}`, icon: '🏠', order: i, createdAt: i,
}))
const manyDevices = Array.from({ length: 150 }, (_, i) => ({
  id: `device-${i}`,
  roomId: `room-${i % 10}`,
  name: `Perangkat Panjang Namanya Sekali Nomor ${i}`,
  watt: 10 + i, // strictly ascending -> strictly ascending cost; device-0 is cheapest, device-149 priciest
  hoursPerDay: 5,
  quantity: 1,
  createdAt: i,
  updatedAt: i,
}))
const bigPayload = buildExportPayload(manyRooms, manyDevices, settings)
const bigResult = buildShareLink(bigPayload, ORIGIN)
assert.equal(bigResult.truncated, true)
assert.ok(bigResult.droppedDeviceCount > 0)
console.log(`PASS buildShareLink: oversized payload (${manyDevices.length} devices) truncated, dropped ${bigResult.droppedDeviceCount}`)

const bigHash = bigResult.url.slice(ORIGIN.length)
const bigParsed = parseShareHash(bigHash)
assert.equal(bigParsed.ok, true)
if (bigParsed.ok) {
  assert.equal(bigParsed.data.devices.length, manyDevices.length - bigResult.droppedDeviceCount)
  const remainingIds = new Set(bigParsed.data.devices.map((d) => d.id))
  assert.equal(remainingIds.has(`device-${manyDevices.length - 1}`), true) // priciest kept
  assert.equal(remainingIds.has('device-0'), false) // cheapest dropped
  console.log('PASS buildShareLink: trims cheapest devices first, keeps priciest')

  const finalCompressedLength = bigHash.length - SHARE_HASH_PREFIX.length
  assert.ok(finalCompressedLength <= MAX_SHARE_URL_LENGTH)
  console.log('PASS buildShareLink: trimmed link fits within MAX_SHARE_URL_LENGTH')
}

// --- Room removal: a room whose only device is the single cheapest gets dropped entirely ---
const cheapRoom = { id: 'cheap-room', name: 'Cheap Room', icon: '💤', order: 0, createdAt: 0 }
const expensiveRoom = { id: 'expensive-room', name: 'Expensive Room', icon: '💰', order: 1, createdAt: 1 }
const cheapDevice = { id: 'cheap-device', roomId: 'cheap-room', name: 'Lampu Kecil', watt: 1, hoursPerDay: 1, quantity: 1, createdAt: 0, updatedAt: 0 }
const expensiveDevices = Array.from({ length: 200 }, (_, i) => ({
  id: `expensive-device-${i}`,
  roomId: 'expensive-room',
  name: `AC Sangat Boros Nomor Panjang Sekali ${i}`,
  watt: 5000 + i,
  hoursPerDay: 24,
  quantity: 1,
  createdAt: 10 + i,
  updatedAt: 10 + i,
}))
const roomRemovalPayload = buildExportPayload([cheapRoom, expensiveRoom], [cheapDevice, ...expensiveDevices], settings)
const roomRemovalResult = buildShareLink(roomRemovalPayload, ORIGIN)
assert.equal(roomRemovalResult.truncated, true)
const roomRemovalHash = roomRemovalResult.url.slice(ORIGIN.length)
const roomRemovalParsed = parseShareHash(roomRemovalHash)
assert.equal(roomRemovalParsed.ok, true)
if (roomRemovalParsed.ok) {
  const roomIds = new Set(roomRemovalParsed.data.rooms.map((r) => r.id))
  assert.equal(roomIds.has('cheap-room'), false)
  assert.equal(roomIds.has('expensive-room'), true)
  console.log('PASS buildShareLink: a room whose only device got trimmed away is itself removed')
}

console.log('ALL CHECKS PASSED')
```

Run it from the repo root:

```bash
node verify-share.ts
```

Expected output: nine `PASS ...` lines followed by `ALL CHECKS PASSED`, no errors.

If `parseShareHash` on the small payload fails, double check the default-import usage from Step 2. If any assertion about which devices got dropped fails, check the sort direction in `buildShareLink` (`byCostAscending` — ascending, so `.slice(dropped)` after sorting removes the `dropped` cheapest from the front).

Delete the scratch file when done:

```bash
rm verify-share.ts
```

- [ ] **Step 5: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no output, exit code 0.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml src/share.ts
git commit -m "$(cat <<'EOF'
Add share.ts: URL-encoded payload compression, trimming, and parsing

Compresses an ExportPayload into a URL hash fragment with lz-string
(no backend involved at any point). When the compressed payload
exceeds MAX_SHARE_URL_LENGTH, whole devices are dropped -- cheapest
monthly cost first, never a raw string truncation -- and any room
left with zero devices is dropped too, preserving the highest-value
information in a link that has to be shortened. parseShareHash
reverses the process and reuses exportImport.ts's validateImportPayload
so a corrupted or foreign hash is rejected the same way a bad import
file already is.
EOF
)"
```

---

### Task 2: `src/components/ShareModal.tsx` — generate and present the link

**Files:**
- Create: `src/components/ShareModal.tsx`

**Interfaces:**
- Consumes: `useStore` from `../store` (for `rooms`/`devices`/`settings`); `buildExportPayload` from `../exportImport`; `buildShareLink` from `../share`.
- Produces: default export `ShareModal({ onClose: () => void })`, consumed by Task 4's `src/App.tsx`.

- [ ] **Step 1: Write the file**

Create `src/components/ShareModal.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { buildExportPayload } from '../exportImport'
import { buildShareLink } from '../share'

interface Props {
  onClose: () => void
}

export default function ShareModal({ onClose }: Props) {
  const { rooms, devices, settings } = useStore()
  const [copied, setCopied] = useState(false)

  const result = useMemo(
    () => buildShareLink(buildExportPayload(rooms, devices, settings), window.location.origin + window.location.pathname),
    [rooms, devices, settings]
  )

  async function handleCopy() {
    await navigator.clipboard.writeText(result.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleNativeShare() {
    await navigator.share({ title: 'Data Listrikku', url: result.url })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl">
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="px-5 pt-3 pb-2 flex items-center justify-between border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
            Bagikan Data
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">✕</button>
        </div>

        <div className="px-5 py-5">
          <p className="text-xs text-gray-400 mb-3 leading-relaxed">
            Siapa pun yang membuka link ini bisa melihat seluruh data ruangan, perangkat, dan hasil hitungan yang sudah kamu buat.
          </p>

          {result.truncated && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 mb-3 text-xs text-amber-700">
              {result.droppedDeviceCount} perangkat tidak disertakan karena link jadi terlalu panjang. Perangkat dengan biaya bulanan terkecil yang dihilangkan duluan.
            </div>
          )}

          <input
            readOnly
            aria-label="Link Share"
            value={result.url}
            onFocus={(e) => e.target.select()}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-600 mb-3"
            style={{ fontFamily: 'var(--font-mono)' }}
          />

          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50/50 transition-colors"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {copied ? 'Tersalin!' : 'Salin Link'}
            </button>
            {typeof navigator !== 'undefined' && !!navigator.share && (
              <button
                onClick={handleNativeShare}
                className="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #059669, #047857)', fontFamily: 'var(--font-display)' }}
              >
                Bagikan
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/ShareModal.tsx
git commit -m "$(cat <<'EOF'
Add ShareModal component

Builds a share link from the current rooms/devices/settings via
buildShareLink, shows it in a copyable read-only field, and surfaces
navigator.share() as a second option when the browser supports it
(mobile). Shows an inline warning when the link had to be trimmed.
Not wired into the app yet -- Task 4 adds the entry point.
EOF
)"
```

---

### Task 3: `src/components/ShareView.tsx` — read-only preview + opt-in import

**Files:**
- Create: `src/components/ShareView.tsx`

**Interfaces:**
- Consumes: `parseShareHash` from `../share`; `calcDevice` from `../db`; `formatRupiah`, `formatKwh` from `../utils`; `useStore` from `../store` (for the `importData` action only).
- Produces: default export `ShareView({ hash: string, onExit: () => void })`, consumed by Task 4's `src/App.tsx`.

- [ ] **Step 1: Write the file**

Create `src/components/ShareView.tsx`:

```tsx
import { useMemo } from 'react'
import { useStore } from '../store'
import { calcDevice } from '../db'
import { formatRupiah, formatKwh } from '../utils'
import { parseShareHash } from '../share'

interface Props {
  hash: string
  onExit: () => void
}

export default function ShareView({ hash, onExit }: Props) {
  const { importData } = useStore()
  const result = useMemo(() => parseShareHash(hash), [hash])

  async function handleImport() {
    if (!result.ok) return
    if (!window.confirm('Ini akan mengganti semua data yang ada saat ini. Lanjutkan?')) return
    await importData(result.data)
    onExit()
  }

  if (!result.ok) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--color-surface)' }}>
        <div className="text-center max-w-xs">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-sm text-gray-500 mb-4">{result.error}</p>
          <button onClick={onExit} className="text-sm font-semibold text-emerald-600 hover:text-emerald-700">
            Kembali ke aplikasi
          </button>
        </div>
      </div>
    )
  }

  const { rooms, devices, settings } = result.data
  const totals = devices.reduce(
    (acc, d) => {
      const { monthlyKwh, monthlyCost } = calcDevice(d, settings)
      acc.monthlyKwh += monthlyKwh
      acc.monthlyCost += monthlyCost
      return acc
    },
    { monthlyKwh: 0, monthlyCost: 0 }
  )

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-surface)' }}>
      <header
        className="sticky top-0 z-40 backdrop-blur-md border-b border-emerald-100/60"
        style={{ background: 'rgba(248, 255, 254, 0.9)' }}
      >
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center">
          <span className="font-extrabold text-gray-900 text-base tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            👁️ Pratinjau Data Dibagikan
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-5 pb-28">
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 mb-5 text-xs text-amber-700">
          Ini pratinjau data yang dibagikan orang lain — bukan data kamu sendiri.
        </div>

        <div
          className="rounded-2xl p-5 text-white relative overflow-hidden mb-5"
          style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 60%, #064e3b 100%)' }}
        >
          <p className="text-xs font-medium uppercase tracking-widest opacity-70 mb-1" style={{ fontFamily: 'var(--font-display)' }}>
            Estimasi Biaya / Bulan
          </p>
          <p className="text-3xl font-bold leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
            {formatRupiah(totals.monthlyCost)}
          </p>
          <p className="text-xs opacity-60 mt-1" style={{ fontFamily: 'var(--font-mono)' }}>
            {formatKwh(totals.monthlyKwh)} kWh/bulan
          </p>
          <p className="text-xs opacity-50 mt-2">
            {rooms.length} ruangan · {devices.length} perangkat · tarif {formatRupiah(settings.tariffPerKwh)}/kWh
          </p>
        </div>

        <div className="space-y-3">
          {rooms.map((room) => {
            const roomDevices = devices.filter((d) => d.roomId === room.id)
            const roomCost = roomDevices.reduce((sum, d) => sum + calcDevice(d, settings).monthlyCost, 0)
            return (
              <div key={room.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-50">
                  <span className="text-xl leading-none">{room.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm" style={{ fontFamily: 'var(--font-display)' }}>{room.name}</p>
                    <p className="text-xs text-gray-400">{roomDevices.length} perangkat</p>
                  </div>
                  <p className="font-bold text-emerald-700 text-sm" style={{ fontFamily: 'var(--font-display)' }}>{formatRupiah(roomCost)}</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {roomDevices.map((device) => {
                    const { monthlyKwh, monthlyCost } = calcDevice(device, settings)
                    return (
                      <div key={device.id} className="flex items-center justify-between px-4 py-2.5">
                        <div>
                          <p className="text-sm font-semibold text-gray-700">{device.name}</p>
                          <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-mono)' }}>
                            {device.watt} W · {device.hoursPerDay} jam/hari · {formatKwh(monthlyKwh)} kWh
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">{formatRupiah(monthlyCost)}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4">
        <div className="max-w-2xl mx-auto flex gap-2">
          <button
            onClick={onExit}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:border-gray-300 transition-colors"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Tutup Pratinjau
          </button>
          <button
            onClick={handleImport}
            className="flex-1 py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #059669, #047857)', fontFamily: 'var(--font-display)' }}
          >
            Import ke Perangkat Ini
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/ShareView.tsx
git commit -m "$(cat <<'EOF'
Add ShareView component

Read-only preview of a shared payload decoded from a URL hash
(parseShareHash) -- shows totals, per-room and per-device costs.
Never touches local data unless the viewer explicitly taps "Import ke
Perangkat Ini", which reuses the same replace-all confirm dialog as
JSON import. An invalid/corrupted hash renders an error state instead
of crashing. Not wired into the app yet -- Task 4 adds the hash-based
routing that renders this.
EOF
)"
```

---

### Task 4: Wire into `src/App.tsx`

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `ShareModal` default export (Task 2), `ShareView` default export (Task 3), `SHARE_HASH_PREFIX` from `src/share.ts` (Task 1).

- [ ] **Step 1: Add imports**

Current (`src/App.tsx:1-10`):

```tsx
import { useEffect, useState } from 'react'
import { useStore } from './store'
import type { Device, Room } from './db'
import SummaryCards from './components/SummaryCards'
import RoomCard from './components/RoomCard'
import RoomForm from './components/RoomForm'
import DeviceForm from './components/DeviceForm'
import SettingsPanel from './components/SettingsPanel'
import InstallBanner from './components/InstallBanner'
import DonationModal from './components/DonationModal'
```

Add three lines after the `DonationModal` import:

```tsx
import ShareModal from './components/ShareModal'
import ShareView from './components/ShareView'
import { SHARE_HASH_PREFIX } from './share'
```

- [ ] **Step 2: Add to the `Modal` union**

Current (`src/App.tsx:12-19`):

```tsx
type Modal =
  | { type: 'addRoom' }
  | { type: 'editRoom'; room: Room }
  | { type: 'addDevice'; roomId: string }
  | { type: 'editDevice'; device: Device }
  | { type: 'settings' }
  | { type: 'donation' }
  | null
```

Add one variant before `| null`:

```tsx
  | { type: 'share' }
```

- [ ] **Step 3: Add hash-based routing to `ShareView`**

Current (`src/App.tsx:21-36`):

```tsx
export default function App() {
  const { rooms, devices, settings, loaded, load } = useStore()
  const [modal, setModal] = useState<Modal>(null)

  useEffect(() => { load() }, [])

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin" />
          <p className="text-sm text-gray-400" style={{ fontFamily: 'var(--font-display)' }}>Memuat…</p>
        </div>
      </div>
    )
  }
```

Replace with:

```tsx
export default function App() {
  const { rooms, devices, settings, loaded, load } = useStore()
  const [modal, setModal] = useState<Modal>(null)
  const [shareHash, setShareHash] = useState(() =>
    location.hash.startsWith(SHARE_HASH_PREFIX) ? location.hash : null
  )

  useEffect(() => { load() }, [])

  if (shareHash) {
    return (
      <ShareView
        hash={shareHash}
        onExit={() => {
          history.replaceState(null, '', location.pathname + location.search)
          setShareHash(null)
        }}
      />
    )
  }

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin" />
          <p className="text-sm text-gray-400" style={{ fontFamily: 'var(--font-display)' }}>Memuat…</p>
        </div>
      </div>
    )
  }
```

This checks `location.hash` exactly once, in the `useState` initializer, on first render — matching this app's "no router" approach elsewhere. `ShareView`/`ShareModal` don't depend on `loaded`, so the check happens before that gate: a share link should render its preview immediately, without waiting for (or needing) the viewer's own local `IndexedDB` load.

- [ ] **Step 4: Add the header Share button**

Current (`src/App.tsx:65-76`):

```tsx
          <button
            onClick={() => setModal({ type: 'settings' })}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors"
            aria-label="Pengaturan"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>
```

Replace with (wraps the existing settings button and adds a Share button before it, visible only once there's data worth sharing):

```tsx
          <div className="flex items-center gap-1">
            {rooms.length > 0 && (
              <button
                onClick={() => setModal({ type: 'share' })}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors"
                aria-label="Bagikan Data"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
              </button>
            )}
            <button
              onClick={() => setModal({ type: 'settings' })}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors"
              aria-label="Pengaturan"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        </div>
      </header>
```

- [ ] **Step 5: Render the modal**

Current (`src/App.tsx:165-167`):

```tsx
      {modal?.type === 'donation' && (
        <DonationModal onClose={() => setModal(null)} />
      )}
```

Add immediately after:

```tsx
      {modal?.type === 'share' && (
        <ShareModal onClose={() => setModal(null)} />
      )}
```

- [ ] **Step 6: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no output, exit code 0.

- [ ] **Step 7: Manual visual check**

(A dev server is already running per this project's `AGENTS.md`, on `$PORT`, default 8443 — reuse it, don't start a second one.) Open the app in a browser, add a room + device if there isn't one already, confirm the new share icon (three connected dots) appears in the header to the left of the gear icon, and clicking it opens the "Bagikan Data" modal with a link starting with the current origin and `#share=`. Full round-trip (opening that link, importing) is proven end-to-end in Task 6.

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx
git commit -m "$(cat <<'EOF'
Wire the Share feature into App.tsx

Adds a header Share button (visible once there's at least one room)
that opens ShareModal, and a location.hash check on mount that
renders ShareView full-screen instead of the normal dashboard when
the URL is a share link -- no router needed, following this app's
existing "no new route, just conditional rendering" pattern for
every other screen.
EOF
)"
```

---

### Task 5: PRD §20 + `TODO-PRD-GAPS.md`

**Files:**
- Modify: `PRD-Kalkulator-Listrik-PWA.md`
- Modify: `TODO-PRD-GAPS.md`

**Interfaces:** none (documentation only).

- [ ] **Step 1: Confirm the gap**

```bash
grep -c "^## 20" PRD-Kalkulator-Listrik-PWA.md
```

Expected: `0` (section doesn't exist yet).

- [ ] **Step 2: Append the new PRD section**

`PRD-Kalkulator-Listrik-PWA.md` currently ends with §19 "Donasi". Append a new section after its last line:

```markdown

---

## 20. Fitur Share (Bagikan Data)

Fitur yang memungkinkan pengguna membuat link berisi seluruh data (ruangan + perangkat +
pengaturan) miliknya, untuk dibagikan ke siapa pun lewat kanal apa pun (WhatsApp, email, dst.)
yang mereka pilih sendiri.

- **Mekanisme — tanpa backend.** Seluruh payload (format sama dengan Export/Import JSON §7.6)
  di-serialize ke JSON, dikompresi (`lz-string`), dan ditaruh di **hash fragment URL**
  (`#share=<data-terkompresi>`), bukan query param — supaya tidak pernah singgah di log server
  mana pun, termasuk hosting statis sekalipun. Tidak ada server yang menyimpan atau memproses
  data ini kapan pun; link hanya wadah data yang dipindahkan lewat kanal pilihan pengguna sendiri.
- **Klarifikasi terhadap non-goal §3.3:** non-goal "Sinkronisasi antar-perangkat / cloud backup"
  merujuk pada aplikasi yang **secara otomatis** menjaga data tetap sinkron antar-perangkat lewat
  infrastrukturnya sendiri. Fitur ini berbeda: satu link statis, dibuat manual oleh pengguna,
  sekali pakai, tanpa koneksi berkelanjutan apa pun ke aplikasi — jadi tidak bertentangan dengan
  non-goal tersebut, juga tidak dengan prinsip "sepenuhnya lokal, tanpa server" di **§1** dan
  **§11**.
- **Pratinjau read-only, import bersifat opsional.** Membuka link share **tidak pernah**
  mengubah data lokal penerima secara diam-diam. Penerima selalu melihat pratinjau (ruangan,
  perangkat, hasil hitungan) lebih dulu; hanya jika penerima menekan tombol eksplisit
  **"Import ke Perangkat Ini"**, data itu ditulis ke IndexedDB miliknya — memakai mekanisme
  replace-total yang sama dengan Import JSON (§7.6), termasuk konfirmasi sebelum menimpa.
- **Penanganan data yang terlalu besar.** Jika hasil kompresi melebihi ambang aman (4.000
  karakter), aplikasi **memotong perangkat, bukan string mentah** — perangkat dengan kontribusi
  biaya bulanan paling kecil dibuang lebih dulu, satu per satu, sampai link muat. Ruangan yang
  jadi kosong ikut dibuang. Pengguna diberi tahu berapa perangkat yang tidak disertakan sebelum
  membagikan link tersebut.
```

- [ ] **Step 3: Re-run the check from Step 1 — expect PASS**

```bash
grep -c "^## 20" PRD-Kalkulator-Listrik-PWA.md
```

Expected: `1`.

- [ ] **Step 4: Update `TODO-PRD-GAPS.md`**

Current (in the "Fitur baru — belum tercakup di PRD sama sekali" section):

```markdown
- [ ] **Tombol Share (bagikan link berisi data)** — saat menekan tombol share, aplikasi membuat sebuah link
      yang jika dibuka orang lain, langsung menampilkan seluruh data (ruangan + perangkat + hasil hitungan)
      yang sudah dibuat, tanpa perlu input ulang.
      - Ini fitur baru, **belum ada di PRD manapun** (bukan P0/P1/P2) — perlu ditambahkan dulu ke PRD
        sebelum dikerjakan, karena berpotongan langsung dengan prinsip arsitektur inti di **PRD §1 dan §11**
        ("Sepenuhnya lokal... tidak ada server, tidak ada data yang dikirim keluar") dan non-goal di **§3.3**
        ("Sinkronisasi antar-perangkat / cloud backup").
      - Keputusan desain yang perlu diambil sebelum implementasi:
        - **Tanpa backend** (selaras §1/§11): encode seluruh data jadi string terkompresi di URL
          (query param/hash), halaman "view" membaca & render langsung dari URL tanpa butuh menyimpan ke
          IndexedDB penerima. Risiko: URL bisa sangat panjang kalau data (ruangan/perangkat) banyak — perlu
          strategi kompresi (mis. `lz-string`) dan batas ukuran wajar.
        - **Dengan backend ringan** (menyimpang dari §1/§11): data disimpan di server, link hanya berisi ID
          referensi. Lebih ringkas & tidak ada batas panjang URL, tapi mengubah "tanpa backend, offline-first"
          jadi asumsi produk yang harus direvisi total di PRD (§1, §11, §13 tech stack).
      - Perlu didefinisikan juga: apakah halaman hasil share **read-only** (sekadar dilihat), atau penerima
        bisa **import** data itu ke local storage miliknya sendiri (hubungannya dengan fitur Export/Import
        JSON Fase 2 di **PRD §7.6** — kemungkinan bisa reuse mekanisme yang sama).
```

Replace with:

```markdown
- [x] **Tombol Share (bagikan link berisi data)** — selesai. Ditambahkan ke PRD sebagai **§20**.
      Tanpa backend: payload (format sama dengan Export/Import) dikompresi (`lz-string`) ke hash
      fragment URL (`src/share.ts`). Tombol share muncul di header dashboard (`src/App.tsx`) saat
      ada minimal satu ruangan, membuka `src/components/ShareModal.tsx` yang menampilkan link
      untuk disalin/dibagikan. Membuka link menampilkan pratinjau read-only
      (`src/components/ShareView.tsx`) — data lokal penerima baru berubah jika penerima menekan
      "Import ke Perangkat Ini" secara eksplisit, memakai mekanisme replace-total yang sama dengan
      Import JSON. Jika data melebihi batas panjang link, perangkat dengan biaya bulanan terkecil
      dibuang lebih dulu (bukan potongan string mentah), dengan peringatan ke pengguna.

  Spec & plan implementasi: `docs/superpowers/specs/2026-07-15-share-feature-design.md` dan
  `docs/superpowers/plans/2026-07-15-share-feature.md`.
```

- [ ] **Step 5: Commit**

```bash
git add PRD-Kalkulator-Listrik-PWA.md TODO-PRD-GAPS.md
git commit -m "$(cat <<'EOF'
Document the Share feature in the PRD (new §20) and TODO-PRD-GAPS

Adds the PRD section this feature required before being built (per
TODO-PRD-GAPS.md), including the explicit clarification that non-goal
§3.3 (cross-device sync/cloud backup) refers to automatic, ongoing
sync -- not a manual, one-time, user-initiated share link. Marks the
TODO item done now that the feature is merged.
EOF
)"
```

---

### Task 6: End-to-end verification (share → preview → import, cancel path, invalid link)

**Files:** none (verification only — no application code changes).

**Interfaces:**
- Consumes: the full feature built in Tasks 1-4, exercised through the real UI in a real browser across multiple isolated browser contexts (to simulate different people's devices/data).

- [ ] **Step 1: Confirm the dev server is reachable**

```bash
curl -sf http://localhost:${PORT:-8443} >/dev/null && echo "dev server OK"
```

Expected: `dev server OK`. (Per `AGENTS.md`, a dev server is always running — do not start a second one.)

- [ ] **Step 2: Write and run a Playwright script**

Chromium is already installed and working in this environment from prior verification work (`npx playwright install chromium` is a harmless no-op if already present). Create a scratch script (outside the repo, e.g. `/tmp/verify-share-feature.mjs` — do not commit it):

```js
import { chromium } from 'playwright'
import assert from 'node:assert/strict'

const PORT = process.env.PORT || '8443'
const BASE_URL = `http://localhost:${PORT}`
const browser = await chromium.launch()

async function seedRoomAndDevice(page, roomName, deviceName) {
  await page.waitForSelector('text=Tambah Ruangan Pertama', { timeout: 5000 })
  await page.locator('text=Tambah Ruangan Pertama').click()
  await page.waitForSelector('text=Nama Ruangan', { timeout: 5000 })
  await page.locator('input[type="text"]').first().fill(roomName)
  await page.locator('button:has-text("Buat Ruangan")').click()
  await page.waitForTimeout(400)

  // App.tsx auto-opens "Tambah Perangkat" for the freshly created room.
  await page.waitForSelector('text=Nama Perangkat', { timeout: 5000 })
  await page.locator('input[type="text"]').first().fill(deviceName)
  await page.locator('input[type="number"]').nth(0).fill('100') // watt
  await page.locator('input[type="number"]').nth(1).fill('5')  // hours/day
  // "Tambah Perangkat" (exact, case-sensitive) is this submit button -- RoomCard's own
  // "add device" button in the dashboard behind this modal reads "Tambah perangkat" (lowercase
  // p), and Playwright's :has-text() is case-insensitive, so a plain has-text() match would be
  // ambiguous (2 elements) and throw in strict mode. The hasText RegExp below is case-sensitive.
  await page.locator('button', { hasText: /^Tambah Perangkat$/ }).click()
  await page.waitForTimeout(400)
}

// --- Context A: the sender. Seed data, generate a share link. ---
const senderContext = await browser.newContext({ viewport: { width: 390, height: 800 } })
const sender = await senderContext.newPage()
await sender.goto(BASE_URL, { waitUntil: 'networkidle' })
await seedRoomAndDevice(sender, 'Ruang Tes Share', 'Kulkas Tes Share')

await sender.locator('button[aria-label="Bagikan Data"]').click()
await sender.waitForSelector('text=Bagikan Data', { timeout: 5000 })
const shareLink = await sender.locator('input[aria-label="Link Share"]').inputValue()
assert.ok(shareLink.includes('#share='), 'share link must contain the #share= hash')
console.log('PASS ShareModal produced a link:', shareLink)
await senderContext.close()

// --- Context B: recipient with NO existing data, imports. ---
const importContext = await browser.newContext({ viewport: { width: 390, height: 800 } })
const importPage = await importContext.newPage()
importPage.on('dialog', (d) => d.accept())
await importPage.goto(shareLink, { waitUntil: 'networkidle' })

await importPage.waitForSelector('text=Pratinjau Data Dibagikan', { timeout: 5000 })
await importPage.waitForSelector('text=Ruang Tes Share', { timeout: 5000 })
await importPage.waitForSelector('text=Kulkas Tes Share', { timeout: 5000 })
console.log('PASS ShareView renders the shared room and device read-only')

await importPage.locator('button:has-text("Import ke Perangkat Ini")').click()
await importPage.waitForTimeout(500)
assert.ok(!importPage.url().includes('#share='), 'hash must be cleared after import')
await importPage.waitForSelector('text=Ruang Tes Share', { timeout: 5000 })
console.log('PASS import replaces the empty recipient with the shared data, hash cleared')
await importContext.close()

// --- Context C: recipient with THEIR OWN existing data, opens the same link, cancels. ---
const cancelContext = await browser.newContext({ viewport: { width: 390, height: 800 } })
const cancelPage = await cancelContext.newPage()
cancelPage.on('dialog', (d) => d.accept())
await cancelPage.goto(BASE_URL, { waitUntil: 'networkidle' })
await seedRoomAndDevice(cancelPage, 'Ruang Asli Saya', 'Perangkat Asli Saya')

await cancelPage.goto(shareLink, { waitUntil: 'networkidle' })
await cancelPage.waitForSelector('text=Pratinjau Data Dibagikan', { timeout: 5000 })
await cancelPage.waitForSelector('text=Ruang Tes Share', { timeout: 5000 })
console.log('PASS preview shows shared data even though this recipient already has its own data')

await cancelPage.locator('button:has-text("Tutup Pratinjau")').click()
await cancelPage.waitForTimeout(500)
assert.ok(!cancelPage.url().includes('#share='), 'hash must be cleared after closing the preview')
await cancelPage.waitForSelector('text=Ruang Asli Saya', { timeout: 5000 })
const sharedRoomLeaked = await cancelPage.locator('text=Ruang Tes Share').isVisible().catch(() => false)
assert.equal(sharedRoomLeaked, false, 'closing the preview must NOT import the shared data')
console.log("PASS closing the preview (without importing) leaves the recipient's own data untouched")
await cancelContext.close()

// --- Context D: an invalid/corrupted share link. ---
const invalidContext = await browser.newContext({ viewport: { width: 390, height: 800 } })
const invalidPage = await invalidContext.newPage()
await invalidPage.goto(`${BASE_URL}/#share=###not-a-real-payload###`, { waitUntil: 'networkidle' })
await invalidPage.waitForSelector('text=Kembali ke aplikasi', { timeout: 5000 })
console.log('PASS an invalid share link shows an error state instead of crashing')
await invalidPage.locator('text=Kembali ke aplikasi').click()
await invalidPage.waitForTimeout(300)
assert.ok(!invalidPage.url().includes('#share='), 'hash must be cleared after leaving the error state')
console.log('PASS leaving the error state clears the hash and returns to the normal app')
await invalidContext.close()

await browser.close()
console.log('ALL CHECKS PASSED')
```

Run it:

```bash
node /tmp/verify-share-feature.mjs
```

Expected output: the `PASS ...` lines in order, followed by `ALL CHECKS PASSED`, no errors or timeouts.

If any step times out or fails, do not adjust the checklist to match — that indicates a real defect in Tasks 1-4. Likely culprits: the `aria-label="Bagikan Data"` or `aria-label="Link Share"` missing/misspelled, the header Share button not actually conditioned correctly on `rooms.length > 0`, the confirm-dialog handler not registered before the click that triggers it, or `ShareView`'s exit/import handlers not clearing `location.hash` via `history.replaceState`. Investigate and fix the underlying task before proceeding.

Clean up the scratch script when done:

```bash
rm -f /tmp/verify-share-feature.mjs
```

- [ ] **Step 3: Report**

No commit for this task (no application code changed). Report the verification results so the reviewer can see the full share → preview → import round trip, the cancel-without-importing path, and the invalid-link error path all actually ran and passed.

---

## Self-Review Notes

- **Spec coverage:** No-backend URL-hash mechanism → Task 1. Deterministic cheapest-first trimming + room removal → Task 1 (and directly exercised by its verification script). Read-only preview + explicit opt-in import (reusing the existing replace-all confirm) → Task 3. Header entry point conditioned on having data to share → Task 4. PRD §20 + non-goal §3.3 clarification + TODO checkbox → Task 5. Full round-trip, cancel-without-import, and invalid-link proof → Task 6. The spec's "Out of scope" items (server-side link storage, partial room/device selection, link expiration/revocation) are correctly absent from every task.
- **Type consistency:** `SHARE_HASH_PREFIX`, `MAX_SHARE_URL_LENGTH`, `BuildShareLinkResult`, `buildShareLink`, `parseShareHash` are defined once in Task 1 and referenced with the same names/signatures in Tasks 2-4 — no renaming drift. `ShareModal`'s props (`{ onClose: () => void }`) and `ShareView`'s props (`{ hash: string; onExit: () => void }`) match exactly how Task 4 renders them in `App.tsx`.
- **lz-string interop risk called out explicitly:** Task 1 documents (and its Step 2 sanity-checks) that only the **default import** form works at runtime under plain Node/this project's bundler resolution — a detail that would otherwise silently break the Node-based verification script or, worse, ship a runtime `TypeError` in the browser if someone reached for the more "natural"-looking named-import form.
- **Verification honesty:** Task 1's script exercises the real trimming algorithm against a genuinely oversized payload (150-200 real devices) rather than mocking `MAX_SHARE_URL_LENGTH` down to force the branch — the numbers were confirmed against real `lz-string` output during planning. Task 6 explicitly tests the cancel-without-import path with a recipient who already has their own different data, directly proving the "read-only by default" design decision rather than only testing the happy (import) path.
