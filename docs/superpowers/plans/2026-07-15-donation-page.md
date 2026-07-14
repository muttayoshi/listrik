# Donation Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Dukung Pengembang" (support the developer) entry point in the dashboard footer that opens a modal listing donation platforms — shipping with an honest empty state since no real platforms/links exist yet — and document the feature in the PRD, closing the "Halaman/bagian Donasi" item in `TODO-PRD-GAPS.md`.

**Architecture:** A small config module (`src/donation.ts`) holds the (currently empty) list of donation platforms. A new modal component (`src/components/DonationModal.tsx`) follows this codebase's existing modal pattern (same shape as `RoomForm.tsx`/`SettingsPanel.tsx`) and renders either the platform list or an empty state. `src/App.tsx` gets one new footer element and one new entry in its `Modal` union. No new dependency, no router — this app has none and doesn't need one for a single modal.

**Tech Stack:** React 19, TypeScript (strict), Tailwind CSS — no new dependency.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-15-donation-page-design.md` — read it before starting.
- `DONATION_PLATFORMS` in `src/donation.ts` ships **empty** (`[]`). Do not add any placeholder
  URL, account number, or QR image that could look like a real donation destination — the
  empty state ("Tautan donasi belum ditambahkan") is the correct shipped behavior right now.
- The donation entry point is a footer element inside `<main>` in `src/App.tsx`, rendered
  **unconditionally** — it must appear whether `rooms.length` is `0` or not (unlike the FAB,
  which is intentionally conditional on `rooms.length > 0`).
- Follow the existing modal pattern exactly (see `src/components/RoomForm.tsx` for the
  reference shape): `fixed inset-0` backdrop wrapper with click-outside-to-close, bottom-sheet
  on mobile / centered modal on desktop (`rounded-t-3xl sm:rounded-3xl`), drag-handle bar
  (`sm:hidden`), header with title + `✕` close button matching the existing style.
- No test framework in this project (established prior decision). Verification is
  `npx tsc --noEmit`, `grep`-based content checks for plain documentation edits, and a live
  Playwright check (Chromium already installed and working in this environment from prior
  work) for interactive/visual behavior.
- The PRD edit (Task 4) must explicitly state that this is a static page linking to external
  platforms — not an in-app payment flow — and must clarify that non-goal §3.3 ("Pembayaran,
  top-up token") refers to PLN/electricity transactions, not app-support donations. This
  clarification is the specific thing `TODO-PRD-GAPS.md` calls out as necessary.

---

### Task 1: `src/donation.ts` — donation platform config

**Files:**
- Create: `src/donation.ts`

**Interfaces:**
- Produces: `DonationPlatform` interface (`{ name: string; url: string; qrImage?: string }`),
  `DONATION_PLATFORMS: DonationPlatform[]` (empty array). Task 2 consumes both.

- [ ] **Step 1: Write the file**

Create `src/donation.ts`:

```ts
export interface DonationPlatform {
  name: string
  url: string
  qrImage?: string
}

export const DONATION_PLATFORMS: DonationPlatform[] = []
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: no output, exit code 0.

```bash
grep -c "DONATION_PLATFORMS: DonationPlatform\[\] = \[\]" src/donation.ts
```

Expected: `1` — confirms the array is genuinely empty, not pre-filled with any placeholder
entry (the one behavior this task must get right, per the Global Constraints).

- [ ] **Step 3: Commit**

```bash
git add src/donation.ts
git commit -m "$(cat <<'EOF'
Add donation platform config module

Ships empty (DONATION_PLATFORMS: []) — no real donation links/QR
codes exist yet, and inventing placeholder ones risks looking like a
real payment destination. Filling this in later is a data-only
change; no component code needs to change when real platforms are
added.
EOF
)"
```

---

### Task 2: `src/components/DonationModal.tsx`

**Files:**
- Create: `src/components/DonationModal.tsx`

**Interfaces:**
- Consumes: `DONATION_PLATFORMS`, `DonationPlatform` from `src/donation.ts` (Task 1).
- Produces: default export `DonationModal({ onClose: () => void })`, consumed by Task 3's
  `src/App.tsx`.

- [ ] **Step 1: Write the file**

Create `src/components/DonationModal.tsx`:

```tsx
import { DONATION_PLATFORMS } from '../donation'

interface Props {
  onClose: () => void
}

export default function DonationModal({ onClose }: Props) {
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
            Dukung Pengembang
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">✕</button>
        </div>

        <div className="px-5 py-6">
          {DONATION_PLATFORMS.length === 0 ? (
            <div className="flex flex-col items-center text-center py-4">
              <div className="text-4xl mb-3">❤️</div>
              <p className="text-sm text-gray-400 leading-relaxed">
                Tautan donasi belum ditambahkan.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {DONATION_PLATFORMS.map((platform) => (
                <a
                  key={platform.name}
                  href={platform.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors"
                >
                  <span className="text-sm font-semibold text-gray-700" style={{ fontFamily: 'var(--font-display)' }}>
                    {platform.name}
                  </span>
                  {platform.qrImage && (
                    <img src={platform.qrImage} alt={`QR ${platform.name}`} className="w-10 h-10 rounded-lg" />
                  )}
                </a>
              ))}
            </div>
          )}
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

- [ ] **Step 3: Verify both render branches**

The shipped app only ever exercises the empty-state branch (`DONATION_PLATFORMS` is `[]` per
Task 1) — but both branches are real code paths that need to be proven correct now, not left
unverified. Do this as a temporary, uncommitted local check:

1. Temporarily edit `src/donation.ts` (in your working tree only — do not commit this) to add
   one fake entry:
   ```ts
   export const DONATION_PLATFORMS: DonationPlatform[] = [
     { name: 'Test Platform', url: 'https://example.com' },
   ]
   ```
2. Start the dev server if one isn't already running (`pnpm dev &`, or reuse the one from
   `AGENTS.md` if present — check with `curl -sf http://localhost:${PORT:-8443}` first).
3. Open the app, trigger the donation modal (there's no entry point yet until Task 3 — for
   this isolated check, temporarily add `<DonationModal onClose={() => {}} />` directly to
   `src/App.tsx`'s render output, or use a Playwright script that imports and mounts the
   component in isolation if that's easier — either way, this is a throwaway verification
   step, not something to commit).
4. Confirm the populated-list branch renders the fake entry as a card with a link.
5. **Revert `src/donation.ts` back to the empty array** (and remove any temporary mount code
   in `App.tsx`) before moving on. Confirm with `git diff src/donation.ts` that it's back to
   exactly what Task 1 committed (no diff).
6. Separately, with `src/donation.ts` back to its committed empty state, confirm the empty-state
   branch (❤️ + "Tautan donasi belum ditambahkan") renders instead.

Report both observations (populated branch renders a card with the fake entry; empty branch
shows the honest empty state) in this task's report.

- [ ] **Step 4: Commit**

```bash
git add src/components/DonationModal.tsx
git commit -m "$(cat <<'EOF'
Add DonationModal component

Follows the existing modal pattern (see RoomForm.tsx): bottom-sheet
on mobile, centered on desktop. Renders the DONATION_PLATFORMS list
when populated, or an honest empty state when it isn't (which is the
shipped state right now).
EOF
)"
```

Confirm `git status` shows only `src/components/DonationModal.tsx` as new/staged — the
temporary edits from Step 3 must not be part of this commit.

---

### Task 3: Wire into `src/App.tsx`

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `DonationModal` default export from `src/components/DonationModal.tsx` (Task 2).

- [ ] **Step 1: Add the import**

Current (`src/App.tsx:1-9`):

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
```

Add one line after the `InstallBanner` import:

```tsx
import DonationModal from './components/DonationModal'
```

- [ ] **Step 2: Add to the `Modal` union**

Current (`src/App.tsx:11-17`):

```tsx
type Modal =
  | { type: 'addRoom' }
  | { type: 'editRoom'; room: Room }
  | { type: 'addDevice'; roomId: string }
  | { type: 'editDevice'; device: Device }
  | { type: 'settings' }
  | null
```

Add one variant before `| null`:

```tsx
  | { type: 'donation' }
```

- [ ] **Step 3: Add the footer**

Current (`src/App.tsx:116-119`):

```tsx
            </div>
          </>
        )}
      </main>
```

Insert a footer between the closing `)}` of the room-list conditional and `</main>`:

```tsx
            </div>
          </>
        )}

        <footer className="mt-8 text-center">
          <button
            onClick={() => setModal({ type: 'donation' })}
            className="text-xs text-gray-400 hover:text-emerald-600 transition-colors"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            ❤️ Dukung Pengembang
          </button>
        </footer>
      </main>
```

This sits inside `<main>`, as a sibling to the `{rooms.length === 0 ? (...) : (...)}` block —
it renders on every path (empty state or populated list), satisfying the "unconditional"
requirement from the Global Constraints.

- [ ] **Step 4: Render the modal**

Current (`src/App.tsx:150-152`):

```tsx
      {modal?.type === 'settings' && (
        <SettingsPanel onClose={() => setModal(null)} />
      )}
```

Add immediately after:

```tsx
      {modal?.type === 'donation' && (
        <DonationModal onClose={() => setModal(null)} />
      )}
```

- [ ] **Step 5: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no output, exit code 0.

- [ ] **Step 6: Live verification with Playwright**

Confirm the footer appears in BOTH the empty state and the populated state, and that the
modal opens/closes correctly. Chromium/Playwright is already installed and working in this
environment from prior verification work in this project — re-running
`npx playwright install chromium` is a harmless no-op if already present.

Ensure a dev server is reachable first: `curl -sf http://localhost:${PORT:-8443}` — if that
fails, start one (`pnpm dev &`) and remember to stop it when done.

Create a scratch script (outside the repo, e.g. `/tmp/verify-donation-footer.mjs` — do not
commit it):

```js
import { chromium } from 'playwright'
import assert from 'node:assert/strict'

const PORT = process.env.PORT || '8443'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 800 } })
await page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' })

// Empty-state case: footer must be visible even with no rooms.
const isEmptyState = await page.locator('text=Mulai dari ruangan').isVisible().catch(() => false)
if (isEmptyState) {
  await assert.doesNotReject(
    page.locator('button:has-text("Dukung Pengembang")').waitFor({ state: 'visible', timeout: 3000 }),
  )
  console.log('PASS footer visible in empty state')
} else {
  console.log('SKIP empty-state check (app already has rooms in this profile) — seeding one to test the populated-state case')
}

// Seed a room so we can also confirm the footer survives into the populated-list case.
if (isEmptyState) {
  await page.locator('text=Tambah Ruangan Pertama').click()
  await page.waitForSelector('text=Nama Ruangan', { timeout: 5000 })
  await page.locator('input[type="text"]').first().fill('Ruang Tes Donasi')
  await page.locator('button:has-text("Buat Ruangan")').click()
  await page.waitForTimeout(400)
  const closeX = page.locator('button:has-text("✕")').first()
  if (await closeX.isVisible().catch(() => false)) await closeX.click()
}

await page.waitForSelector('button:has-text("Dukung Pengembang")', { timeout: 5000 })
console.log('PASS footer visible with rooms present')

// Open the modal, confirm the empty-state message (DONATION_PLATFORMS is [] in the committed code).
await page.locator('button:has-text("Dukung Pengembang")').click()
await page.waitForSelector('text=Dukung Pengembang', { timeout: 5000 })
await page.waitForSelector('text=Tautan donasi belum ditambahkan', { timeout: 5000 })
console.log('PASS modal opens and shows the honest empty state')

// Close via the X button, confirm it's gone.
await page.locator('button:has-text("✕")').first().click()
await page.waitForTimeout(300)
const stillOpen = await page.locator('text=Tautan donasi belum ditambahkan').isVisible().catch(() => false)
assert.equal(stillOpen, false)
console.log('PASS modal closes')

const consoleErrors = []
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
assert.equal(consoleErrors.length, 0)

await browser.close()
console.log('ALL CHECKS PASSED')
```

Run it:

```bash
node /tmp/verify-donation-footer.mjs
```

Expected: the PASS lines followed by `ALL CHECKS PASSED`, no errors. Clean up afterward:

```bash
rm -f /tmp/verify-donation-footer.mjs
```

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx
git commit -m "$(cat <<'EOF'
Wire DonationModal into the dashboard footer

New unconditional footer element (renders whether rooms exist or
not) opens the donation modal via the existing Modal-union pattern
already used for Settings/Room/Device forms.
EOF
)"
```

---

### Task 4: PRD update + TODO-PRD-GAPS.md

**Files:**
- Modify: `PRD-Kalkulator-Listrik-PWA.md`
- Modify: `TODO-PRD-GAPS.md`

**Interfaces:** none (documentation only).

- [ ] **Step 1: Confirm the gap**

```bash
grep -c "^## 19" PRD-Kalkulator-Listrik-PWA.md
```

Expected: `0` (FAIL — section doesn't exist yet).

- [ ] **Step 2: Append the new PRD section**

`PRD-Kalkulator-Listrik-PWA.md` currently ends at line 350, right after §18's tariff table
and its closing note (`> Catatan: tarif dapat berubah tiap triwulan...`). Append a new
section after that final line:

```markdown

---

## 19. Donasi

Fitur dukungan sukarela bagi pengguna yang ingin memberi apresiasi ke pembuat aplikasi.

- **Titik akses:** tautan kecil "❤️ Dukung Pengembang" di footer dashboard (selalu terlihat,
  baik saat ada ruangan maupun saat empty state) — bukan entri di Settings.
- **Bentuk:** modal statis di dalam aplikasi, berisi daftar platform donasi (nama + tautan
  eksternal, opsional gambar QR). Konsisten dengan pola modal lain di aplikasi ini
  (Settings, Tambah Ruangan, dst.) — tidak ada halaman/route baru.
- **Bukan proses pembayaran in-app.** Aplikasi tidak memproses, menyimpan, atau meneruskan
  data pembayaran apa pun. Modal hanya menautkan keluar ke platform pihak ketiga (mis.
  Saweria, Trakteer, QRIS) yang dikelola pengguna sendiri di luar aplikasi ini — selaras
  dengan prinsip "sepenuhnya lokal, tanpa server" di **§1** dan **§11**.
- **Klarifikasi terhadap non-goal §3.3:** non-goal "Pembayaran, top-up token" pada §3.3
  merujuk pada transaksi listrik/PLN (mis. beli token listrik dalam aplikasi), **bukan**
  donasi dukungan ke pembuat aplikasi. Kedua hal ini berbeda konteks dan tidak saling
  bertentangan.
- **Status data platform:** daftar platform donasi kosong secara default sampai pemilik
  produk menyediakan tautan/QR asli — aplikasi menampilkan pesan jujur ("Tautan donasi
  belum ditambahkan") alih-alih tautan placeholder yang bisa disalahartikan sebagai tujuan
  pembayaran sungguhan.
```

- [ ] **Step 3: Re-run the check from Step 1 — expect PASS**

```bash
grep -c "^## 19" PRD-Kalkulator-Listrik-PWA.md
```

Expected: `1`.

- [ ] **Step 4: Update `TODO-PRD-GAPS.md`**

Current (in the "Fitur baru — belum tercakup di PRD sama sekali" section):

```markdown
- [ ] **Halaman/bagian Donasi** — tempat bagi pengguna yang ingin memberi dukungan (donasi) ke pembuat
      aplikasi.
      - Fitur baru, **belum ada di PRD manapun** — perlu ditambahkan ke PRD (mis. bagian baru §19) sebelum
        dikerjakan.
      - Berbeda dari fitur share, ini **tidak bertentangan langsung** dengan prinsip "tanpa backend" di §1/§11,
        selama diimplementasikan sebagai **halaman statis berisi link/QR ke platform eksternal**
        (mis. Saweria, Trakteer, QRIS, PayPal), bukan sebagai proses pembayaran in-app. Non-goal **§3.3**
        ("Pembayaran, top-up token") merujuk ke transaksi listrik/PLN, jadi tidak relevan untuk kasus donasi
        dukungan aplikasi ini — tapi tetap perlu dicatat eksplisit di PRD supaya tidak rancu dengan non-goal
        tersebut.
      - Keputusan yang perlu diambil sebelum implementasi:
        - Titik akses: entri baru di menu Settings (ikon hati/donasi), atau tautan di footer/empty state?
        - Platform donasi apa saja yang mau ditampilkan (perlu link/kode QR dari pemilik produk).
        - Apakah cukup halaman statis (list link + QR image), atau perlu komponen interaktif (copy nomor
          rekening, dsb.) — tetap tanpa backend/pemrosesan pembayaran sendiri.
```

Replace with:

```markdown
- [x] **Halaman/bagian Donasi** — selesai. Ditambahkan ke PRD sebagai **§19**. Titik akses: tautan
      "❤️ Dukung Pengembang" di footer dashboard (`src/App.tsx`), selalu terlihat. Modal
      (`src/components/DonationModal.tsx`) menampilkan daftar platform dari
      `src/donation.ts` (`DONATION_PLATFORMS`) — **saat ini kosong**, menampilkan empty
      state jujur sampai tautan/QR platform asli tersedia dan diisi ke array tersebut.

  Spec & plan implementasi: `docs/superpowers/specs/2026-07-15-donation-page-design.md` dan
  `docs/superpowers/plans/2026-07-15-donation-page.md`.
```

- [ ] **Step 5: Commit**

```bash
git add PRD-Kalkulator-Listrik-PWA.md TODO-PRD-GAPS.md
git commit -m "$(cat <<'EOF'
Document the Donation feature in the PRD (new §19) and TODO-PRD-GAPS

Adds the PRD section this feature required before being built (per
TODO-PRD-GAPS.md), including the explicit clarification that non-goal
§3.3 (payment/top-up) refers to PLN transactions, not app-support
donations. Marks the TODO item done now that the feature is merged.
EOF
)"
```

---

## Self-Review Notes

- **Spec coverage:** Config module (empty, no fake data) → Task 1. Modal component (both
  render branches proven, only the empty one shipped) → Task 2. Footer entry point
  (unconditional visibility) → Task 3. PRD §19 + non-goal §3.3 clarification + TODO checkbox
  → Task 4. The spec's "Out of scope" items (real platform data, the Share-link feature,
  interactive payment components) are correctly absent from every task.
- **Type consistency:** `DonationPlatform`/`DONATION_PLATFORMS` defined once in Task 1,
  imported by name (not redefined) in Task 2. `DonationModal`'s props (`{ onClose: () => void
  }`) match exactly how Task 3 renders it (`<DonationModal onClose={() => setModal(null)} />`),
  mirroring the existing `SettingsPanel`/`RoomForm` call sites already in `App.tsx`.
- **Safety constraint enforced twice:** both Task 1's commit message and Task 2's verification
  step explicitly call out that the fake entry used to prove the populated-list branch renders
  must never reach the committed `src/donation.ts` — Task 2 Step 3 requires confirming
  `git diff src/donation.ts` is empty before committing.
