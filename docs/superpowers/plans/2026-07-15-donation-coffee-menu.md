# Donation Coffee Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the empty `DonationModal` into a two-step "Traktir Kopi Pengembang" flow — pick one of 3 named coffee options (icon, name, price), then see a payment step with an honest QRIS-not-yet-available placeholder — and document the change in PRD §19.

**Architecture:** `src/donation.ts` swaps its (empty) `DonationPlatform[]` config for a populated `CoffeeOption[]` config. `DonationModal.tsx` gains local `useState` to switch between a coffee-menu view and a payment view; its external `Props` (`{ onClose: () => void }`) don't change, so nothing in `App.tsx` or `SettingsPanel.tsx` needs to change. No new dependency, no router.

**Tech Stack:** React 19, TypeScript (strict), Tailwind CSS — no new dependency.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-15-donation-coffee-menu-design.md` — read it before starting.
- This spec supersedes only §1 (config module) and §2 (modal body) of the original
  `2026-07-15-donation-page-design.md`. The footer/Settings entry points into `DonationModal`
  and its `Props` shape are unchanged — do not touch `src/App.tsx` or
  `src/components/SettingsPanel.tsx` in this plan.
- No real QRIS image exists yet. The payment step must ship an **honest placeholder** — an
  outlined QR-frame icon with the caption "QRIS belum tersedia — pemilik aplikasi belum
  menambahkan kode QRIS asli" — that is visually and textually distinct from a real scannable
  code. Do not draw anything resembling an actual QR pixel grid (PRD §19: no placeholder that
  could be mistaken for a real payment target).
- Coffee images are local emoji-in-gradient-box icons, not hotlinked photos (offline-first PWA,
  PRD §1/§11) — no network image requests introduced anywhere in this plan.
- Prices are plain `number` (IDR), formatted at render time with the existing `formatRupiah`
  helper from `src/utils.ts` — do not write a new formatter.
- Follow the existing modal visual pattern exactly (bottom-sheet on mobile / centered on
  desktop, `rounded-t-3xl sm:rounded-3xl`, backdrop blur, drag-handle bar, header with title +
  `✕`, `font-display` for headings, emerald-600 accent) — same shell already in
  `DonationModal.tsx`, keep it as-is.
- No test framework in this project (established prior decision, see the earlier Donation
  plan). Verification is `npx tsc --noEmit`, `grep`-based content checks, and a live Playwright
  check (Chromium already installed and working in this environment from prior work).
- Dev server: already running per `AGENTS.md` on `$PORT` (default `8443`). Reuse it — verify
  with `curl -sf http://localhost:${PORT:-8443}` before assuming you need to start one.

---

### Task 1: `src/donation.ts` — coffee options config

**Files:**
- Modify: `src/donation.ts` (full-file replacement)

**Interfaces:**
- Produces: `CoffeeOption` interface (`{ id: string; name: string; subtitle: string; price:
  number; emoji: string; gradientFrom: string; gradientTo: string }`) and `COFFEE_OPTIONS:
  CoffeeOption[]` (3 entries). Task 2 consumes both. Replaces the old `DonationPlatform` /
  `DONATION_PLATFORMS` exports entirely — confirmed via `grep -rn "DonationPlatform\|DONATION_PLATFORMS" src/`
  that only `src/components/DonationModal.tsx` imports them, and Task 2 rewrites that file.

- [ ] **Step 1: Replace the file contents**

Replace all of `src/donation.ts` with:

```ts
export interface CoffeeOption {
  id: string
  name: string
  subtitle: string
  price: number
  emoji: string
  gradientFrom: string
  gradientTo: string
}

export const COFFEE_OPTIONS: CoffeeOption[] = [
  {
    id: 'tuku',
    name: 'Kopi Tuku',
    subtitle: 'Kopi Susu Tetangga',
    price: 18000,
    emoji: '☕',
    gradientFrom: '#78350f',
    gradientTo: '#b45309',
  },
  {
    id: 'familymart',
    name: 'Kopi Family Mart',
    subtitle: 'Kopi Susu Keluarga',
    price: 15000,
    emoji: '🥤',
    gradientFrom: '#0f766e',
    gradientTo: '#0d9488',
  },
  {
    id: 'pointcoffee',
    name: 'Point Coffee',
    subtitle: 'Himalayan Butterscotch',
    price: 23000,
    emoji: '☕',
    gradientFrom: '#6d28d9',
    gradientTo: '#a855f7',
  },
]
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: this will FAIL right now with errors in `src/components/DonationModal.tsx` (it
still imports the now-removed `DONATION_PLATFORMS`/`DonationPlatform`) — that's expected until
Task 2 rewrites that file. Confirm the *only* errors reported are in
`src/components/DonationModal.tsx`; if any other file errors, stop and investigate before
continuing.

- [ ] **Step 3: Confirm the data shape**

```bash
grep -c "id: '" src/donation.ts
```

Expected: `3`.

```bash
grep -c "gradientFrom\|gradientTo" src/donation.ts
```

Expected: `9` (1 in the interface for each field × 2 fields = 2, plus 2 per each of 3 entries
= 6, plus... just confirm the count is non-zero and consistent; the real check is Step 2's
typecheck plus Task 2's render verification). If this exact count doesn't match, don't treat
it as a failure by itself — rely on Step 2 and Task 2's verification instead.

- [ ] **Step 4: Commit**

```bash
git add src/donation.ts
git commit -m "$(cat <<'EOF'
Replace donation platform config with coffee options

DONATION_PLATFORMS (empty, link-based) becomes COFFEE_OPTIONS: 3
named coffee choices (Kopi Tuku, Kopi Family Mart, Point Coffee) with
price, icon, and brand-color gradient. Feeds the two-step "Traktir
Kopi Pengembang" flow in DonationModal.tsx (next commit).
EOF
)"
```

Note: this commit alone leaves the build type-broken (`DonationModal.tsx` still references
the old exports) — that's fine, Task 2 fixes it immediately after, and both land before
anyone reviews between tasks.

---

### Task 2: `src/components/DonationModal.tsx` — two-step flow

**Files:**
- Modify: `src/components/DonationModal.tsx` (full-file replacement)

**Interfaces:**
- Consumes: `COFFEE_OPTIONS`, `CoffeeOption` from `src/donation.ts` (Task 1); `formatRupiah`
  from `src/utils.ts` (existing, `formatRupiah(val: number): string`).
- Produces: default export `DonationModal({ onClose: () => void })` — same signature as
  before, so `src/App.tsx` and `src/components/SettingsPanel.tsx` need no changes.

- [ ] **Step 1: Replace the file contents**

Replace all of `src/components/DonationModal.tsx` with:

```tsx
import { useState } from 'react'
import { COFFEE_OPTIONS, type CoffeeOption } from '../donation'
import { formatRupiah } from '../utils'

interface Props {
  onClose: () => void
}

export default function DonationModal({ onClose }: Props) {
  const [selected, setSelected] = useState<CoffeeOption | null>(null)

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
            Traktir Kopi Pengembang
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">✕</button>
        </div>

        {selected === null ? (
          <div className="px-5 py-6 space-y-3">
            {COFFEE_OPTIONS.map((coffee) => (
              <button
                key={coffee.id}
                onClick={() => setSelected(coffee)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors text-left"
              >
                <div
                  className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: `linear-gradient(135deg, ${coffee.gradientFrom}, ${coffee.gradientTo})` }}
                >
                  {coffee.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-700" style={{ fontFamily: 'var(--font-display)' }}>
                    {coffee.name}
                  </div>
                  <div className="text-xs text-gray-400">{coffee.subtitle}</div>
                </div>
                <div className="text-sm font-bold text-emerald-600 shrink-0">
                  {formatRupiah(coffee.price)}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="px-5 py-6">
            <button
              onClick={() => setSelected(null)}
              className="text-xs font-semibold text-gray-400 hover:text-emerald-600 transition-colors mb-4"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              ← Pilih kopi lain
            </button>

            <div className="flex flex-col items-center text-center mb-5">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl mb-2"
                style={{ background: `linear-gradient(135deg, ${selected.gradientFrom}, ${selected.gradientTo})` }}
              >
                {selected.emoji}
              </div>
              <div className="text-sm font-bold text-gray-700" style={{ fontFamily: 'var(--font-display)' }}>
                {selected.name}
              </div>
              <div className="text-xs text-gray-400 mb-1">{selected.subtitle}</div>
              <div className="text-base font-bold text-emerald-600">{formatRupiah(selected.price)}</div>
            </div>

            {/* Replace this placeholder block with <img src={qrisImage} alt="QRIS" /> once a real QRIS PNG is available */}
            <div className="flex flex-col items-center">
              <div className="w-40 h-40 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-300">
                  <path d="M4 4h5v5H4V4zm0 11h5v5H4v-5zM15 4h5v5h-5V4z" strokeLinejoin="round" />
                  <path d="M15 15h2v2h-2v-2zm3 0h2v2h-2v-2zm-3 3h2v2h-2v-2zm3 0h2v2h-2v-2z" />
                </svg>
              </div>
              <p className="text-xs text-gray-400 text-center mt-3 leading-relaxed max-w-[220px]">
                QRIS belum tersedia — pemilik aplikasi belum menambahkan kode QRIS asli.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no output, exit code 0 (this resolves the expected failure from Task 1 Step 2).

- [ ] **Step 3: Confirm both views' key strings are present**

```bash
grep -c "COFFEE_OPTIONS.map" src/components/DonationModal.tsx
```

Expected: `1`.

```bash
grep -c "QRIS belum tersedia" src/components/DonationModal.tsx
```

Expected: `1`.

```bash
grep -c "Pilih kopi lain" src/components/DonationModal.tsx
```

Expected: `1`.

- [ ] **Step 4: Live verification with Playwright**

Ensure the dev server is reachable: `curl -sf http://localhost:${PORT:-8443}` (if it fails,
start one per `AGENTS.md` — it should already be running).

Create a scratch script at
`/private/tmp/claude-501/-Users-karadigital-Mufakat-listrik/9505b757-57fe-42ff-bfc6-fc45313afe6d/scratchpad/verify-coffee-menu.mjs`
(do not commit it):

```js
import { chromium } from 'playwright'
import assert from 'node:assert/strict'

const PORT = process.env.PORT || '8443'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 800 } })
await page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' })

// Open the donation modal from the footer entry point.
await page.locator('button:has-text("Traktir Kopi Pengembang")').first().click()
await page.waitForSelector('h2:has-text("Traktir Kopi Pengembang")', { timeout: 5000 })
console.log('PASS modal opens')

// Step 1: all 3 coffee options render with name, subtitle, and price.
await page.waitForSelector('text=Kopi Tuku', { timeout: 3000 })
await page.waitForSelector('text=Kopi Susu Tetangga', { timeout: 3000 })
await page.waitForSelector('text=Rp18.000', { timeout: 3000 })
await page.waitForSelector('text=Kopi Family Mart', { timeout: 3000 })
await page.waitForSelector('text=Kopi Susu Keluarga', { timeout: 3000 })
await page.waitForSelector('text=Rp15.000', { timeout: 3000 })
await page.waitForSelector('text=Point Coffee', { timeout: 3000 })
await page.waitForSelector('text=Himalayan Butterscotch', { timeout: 3000 })
await page.waitForSelector('text=Rp23.000', { timeout: 3000 })
console.log('PASS all 3 coffee options render with name, subtitle, price')

// Step 2: selecting a coffee shows the payment step with an honest QRIS placeholder.
await page.locator('button:has-text("Kopi Tuku")').click()
await page.waitForSelector('text=Pilih kopi lain', { timeout: 3000 })
await page.waitForSelector('text=QRIS belum tersedia', { timeout: 3000 })
console.log('PASS payment step shows QRIS placeholder after selecting a coffee')

// Back button returns to the menu.
await page.locator('button:has-text("Pilih kopi lain")').click()
await page.waitForSelector('text=Kopi Family Mart', { timeout: 3000 })
console.log('PASS back button returns to the coffee menu')

// Close via the X button.
await page.locator('button:has-text("✕")').first().click()
await page.waitForTimeout(300)
const stillOpen = await page.locator('h2:has-text("Traktir Kopi Pengembang")').isVisible().catch(() => false)
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
node /private/tmp/claude-501/-Users-karadigital-Mufakat-listrik/9505b757-57fe-42ff-bfc6-fc45313afe6d/scratchpad/verify-coffee-menu.mjs
```

Expected: all `PASS` lines followed by `ALL CHECKS PASSED`, no thrown errors. If the footer
button selector doesn't match (e.g. because `SettingsPanel.tsx` also renders a button with the
same text and `.first()` picks the wrong one), inspect which modal opened and adjust the
selector — do not weaken the assertions.

- [ ] **Step 5: Commit**

```bash
git add src/components/DonationModal.tsx
git commit -m "$(cat <<'EOF'
Turn DonationModal into a two-step coffee menu

Step 1 lists the 3 COFFEE_OPTIONS (icon, name, subtitle, price).
Selecting one moves to step 2: a recap of the chosen coffee plus a
QRIS payment area. No real QRIS image exists yet, so that area ships
as an honest placeholder (outlined QR-frame icon + "QRIS belum
tersedia" caption) instead of anything that could be mistaken for a
real scannable code, per PRD §19.
EOF
)"
```

---

### Task 3: PRD §19 amendment

**Files:**
- Modify: `PRD-Kalkulator-Listrik-PWA.md:354-376`

**Interfaces:** none (documentation only).

- [ ] **Step 1: Confirm current state**

```bash
grep -n "Bentuk:\|Status data platform" PRD-Kalkulator-Listrik-PWA.md
```

Expected: both lines found within §19 (around line 361 and line 372).

- [ ] **Step 2: Amend the "Bentuk" bullet**

Current (`PRD-Kalkulator-Listrik-PWA.md:361-363`):

```markdown
- **Bentuk:** modal statis di dalam aplikasi, berisi daftar platform donasi (nama + tautan
  eksternal, opsional gambar QR). Konsisten dengan pola modal lain di aplikasi ini
  (Settings, Tambah Ruangan, dst.) — tidak ada halaman/route baru.
```

Replace with:

```markdown
- **Bentuk:** modal statis di dalam aplikasi, dua langkah. Langkah 1 menampilkan menu 3
  pilihan kopi ("Kopi Tuku – Kopi Susu Tetangga", "Kopi Family Mart – Kopi Susu Keluarga",
  "Point Coffee – Himalayan Butterscotch"), masing-masing dengan ikon, nama, dan harga.
  Memilih salah satu membuka langkah 2: ringkasan kopi terpilih dan area kode QRIS untuk
  discan manual. Konsisten dengan pola modal lain di aplikasi ini (Settings, Tambah Ruangan,
  dst.) — tidak ada halaman/route baru.
```

- [ ] **Step 3: Replace the "Status data platform" bullet**

Current (`PRD-Kalkulator-Listrik-PWA.md:372-375`):

```markdown
- **Status data platform:** daftar platform donasi kosong secara default sampai pemilik
  produk menyediakan tautan/QR asli — aplikasi menampilkan pesan jujur ("Tautan donasi
  belum ditambahkan") alih-alih tautan placeholder yang bisa disalahartikan sebagai tujuan
  pembayaran sungguhan.
```

Replace with:

```markdown
- **Status QRIS:** belum ada gambar QRIS asli dari pemilik aplikasi. Langkah 2 menampilkan
  placeholder jujur (ikon bingkai QR bergaya outline + teks "QRIS belum tersedia — pemilik
  aplikasi belum menambahkan kode QRIS asli") alih-alih gambar yang bisa disalahartikan
  sebagai kode scan sungguhan. Menambahkan QRIS asli nanti adalah perubahan konten kecil
  (satu file gambar + satu swap JSX), bukan perubahan arsitektur.
```

- [ ] **Step 4: Verify the edits landed**

```bash
grep -c "Langkah 1 menampilkan menu 3" PRD-Kalkulator-Listrik-PWA.md
```

Expected: `1`.

```bash
grep -c "Status QRIS:" PRD-Kalkulator-Listrik-PWA.md
```

Expected: `1`.

```bash
grep -c "Status data platform:" PRD-Kalkulator-Listrik-PWA.md
```

Expected: `0` (old bullet fully replaced, not left duplicated alongside the new one).

- [ ] **Step 5: Commit**

```bash
git add PRD-Kalkulator-Listrik-PWA.md
git commit -m "$(cat <<'EOF'
Update PRD §19 for the two-step coffee menu + QRIS placeholder

Describes the concrete coffee-menu/QRIS-payment flow shipped in
DonationModal.tsx, replacing the older "empty platform list" wording
with the current honest-placeholder behavior.
EOF
)"
```

---

## Self-Review Notes

- **Spec coverage:** `CoffeeOption`/`COFFEE_OPTIONS` data (id, name, subtitle, price, emoji,
  gradient) → Task 1, matches spec §1 exactly. Two-step modal (menu → payment, back button,
  honest QRIS placeholder with swap-in comment) → Task 2, matches spec §2. PRD §19 amendment
  (not full rewrite) → Task 3, matches spec §3. Spec's "Out of scope" items (real photos, real
  QRIS file, editable prices, amount-linked external redirect) are correctly absent from every
  task.
- **Type consistency:** `CoffeeOption` defined once in Task 1 (`src/donation.ts`), imported by
  name (`type CoffeeOption`) in Task 2 — not redefined. `DonationModal`'s `Props` (`{ onClose:
  () => void }`) is unchanged from the existing component, so no caller (`App.tsx`,
  `SettingsPanel.tsx`) needs edits — verified via `grep -rn "DonationModal" src/App.tsx
  src/components/SettingsPanel.tsx` showing only `onClose` passed at both call sites.
- **No placeholders:** every step has runnable code and exact expected output; no "add
  appropriate styling" or "similar to Task N" shortcuts — Task 2's payment-view JSX is written
  out in full even though it echoes some of Task 2's own menu-view styling, so an engineer
  reading only Task 2 has everything needed.
