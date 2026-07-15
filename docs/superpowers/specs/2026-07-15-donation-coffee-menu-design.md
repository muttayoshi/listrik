# Design — Donation Coffee Menu

Status: Approved for planning
Date: 2026-07-15
Source: User request ("lengkapi fitur donasi... traktir kopi... 3 pilihan kopi... gambar & harga")
Supersedes: `2026-07-15-donation-page-design.md` §1 and §2 (config module and modal body only —
the footer/Settings entry points and PRD principles from that spec are unchanged and stay in place).
Related PRD sections: §19 "Donasi" (will be updated, not replaced).

## Why this scope, why now

The original Donation spec shipped `DonationModal` deliberately empty
(`DONATION_PLATFORMS: DonationPlatform[] = []`) because no real donation platform/QR existed
yet, and PRD §19 explicitly forbids placeholder links or QR images that could be mistaken for
a real payment destination. That constraint hasn't changed — there is still no real QRIS
image to ship. What's changing is the *menu* the user sees before reaching that honest
not-yet-available state: instead of a flat list of donation platforms, present a themed
"traktir kopi" menu of 3 specific coffee choices with icon, name, subtitle, and price, then
route to a payment step that is honest about QRIS not being available yet.

This is a content/UX layer on top of the existing modal-in-`App.tsx` pattern — no new
architectural decisions (no router, no backend, no real external links), consistent with
PRD §1/§11 "fully local, no server."

## Decisions from user Q&A

- **Payment mechanism:** static QRIS image, scanned manually by the user. Not a URL redirect
  (rules out Saweria/Trakteer-style `?amount=` links).
- **QRIS image:** no real QRIS file exists yet. Ship an honest placeholder — an outlined
  QR-frame icon, visually and textually distinct from a real scannable code (per PRD §19's
  "no placeholder that could be mistaken for a real payment target" rule) — with an obvious
  swap-in point in code for when a real QRIS image is supplied.
- **Coffee images:** local flat-style icon (emoji in a brand-colored gradient box), not
  hotlinked photos. This app is an offline-first PWA (§1/§11); external image URLs risk
  breaking or failing to load offline, so no network image fetching is introduced.
- **Prices:** approximate current market prices, clearly usable/editable data, not fabricated
  precision. Values used below are reasonable public estimates for these named products (July
  2026): Kopi Tuku Kopi Susu Tetangga Rp18.000, Kopi Family Mart Kopi Susu Keluarga Rp15.000,
  Point Coffee Himalayan Butterscotch Rp23.000.

## 1. Data module — `src/donation.ts`

Replace `DonationPlatform`/`DONATION_PLATFORMS` with a coffee-menu shape. Nothing else in the
codebase imports the old exports (confirmed via grep), so this is a clean replacement, not an
addition alongside the old shape.

```ts
export interface CoffeeOption {
  id: string
  name: string        // "Kopi Tuku"
  subtitle: string     // "Kopi Susu Tetangga"
  price: number         // in IDR, e.g. 18000
  emoji: string
  gradientFrom: string  // hex
  gradientTo: string    // hex
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

Prices are plain numbers (same convention as the rest of the app, e.g. device wattage) and
formatted at render time with the existing `formatRupiah` helper from `src/utils.ts` — no new
formatting logic.

## 2. `src/components/DonationModal.tsx` — two-step flow

Same outer modal shell as today (bottom-sheet on mobile / centered on desktop, backdrop,
drag-handle, header with title + ✕). Internal content becomes stateful:

```ts
const [selected, setSelected] = useState<CoffeeOption | null>(null)
```

**Step 1 — coffee menu** (`selected === null`):
- Header title stays "Traktir Kopi Pengembang".
- `COFFEE_OPTIONS.map(...)` rendered as tappable cards, one per row (mirrors the current
  platform-list layout: rounded-xl border, hover state, `px-4 py-3`):
  - Left: icon box — rounded-xl, `background: linear-gradient(135deg, gradientFrom, gradientTo)`,
    emoji centered, white text-shadow if needed for contrast. Same visual weight as the FAB
    button's gradient treatment already used in `App.tsx`.
  - Middle: `name` (bold, `font-display`) above `subtitle` (smaller, gray-400).
  - Right: price via `formatRupiah(price)`, bold, emerald-600 (matches app's accent color).
  - `onClick={() => setSelected(option)}`.
- No empty-state branch needed here — `COFFEE_OPTIONS` is never empty (unlike the old
  `DONATION_PLATFORMS`), so step 1 always renders the 3 cards.

**Step 2 — payment / QRIS** (`selected !== null`):
- Back control: `← Pilih kopi lain` text button at the top, `onClick={() => setSelected(null)}`.
- Selected-coffee recap: same icon-box + name/subtitle + price treatment as the step-1 row,
  centered, slightly larger, to confirm what was chosen.
- QRIS placeholder block below the recap:
  - Square area (e.g. `w-40 h-40`), dashed gray border (`border-2 border-dashed
    border-gray-200`), rounded-2xl, centered outlined QR-frame icon (simple inline SVG: four
    corner brackets, no scannable pixel pattern — must not resemble a functional QR code).
  - Caption under the box, gray-400, small: "QRIS belum tersedia — pemilik aplikasi belum
    menambahkan kode QRIS asli." This mirrors the honest-empty-state tone of the original
    "Tautan donasi belum ditambahkan" copy and satisfies PRD §19's constraint against
    placeholder payment targets.
  - One-line code comment directly above the placeholder JSX marking the swap-in point, e.g.
    `{/* Replace this placeholder block with <img src={qrisImage} /> once a real QRIS PNG is available */}`,
    so wiring in a real image later is a small, obvious, self-contained edit.

No routing, no new modal, no new entry in the `App.tsx` `Modal` union — `{ type: 'donation' }`
continues to mount the same `DonationModal`, which now internally manages its own two-step
view state. `SettingsPanel.tsx`'s existing `DonationModal` usage is unaffected (no prop
changes).

## 3. PRD update — §19 "Donasi"

Amend (not rewrite) §19 to describe the coffee-menu step as the concrete form of "daftar
platform donasi" mentioned there, and add the QRIS-placeholder honesty rule as a named
sub-point (extending the existing "Status data platform" bullet rather than duplicating it):
selection step (3 coffee options with name/subtitle/price) leads to a payment step showing a
QRIS placeholder with explicit "not yet available" messaging until a real QRIS image is
supplied — same non-goal clarification (§3.3) and "no fake payment target" principle already
established in §19 continue to apply unchanged.

## Out of scope

- Sourcing or hotlinking real product photos for the coffee items — local icon/gradient
  treatment only, per the offline-first decision above.
- Obtaining or embedding a real QRIS image — ships as an honest placeholder; swapping in a
  real image is a future, self-contained content change (single image import + one JSX swap).
- Editable/configurable prices from within the UI (e.g. a settings field to change coffee
  prices) — `COFFEE_OPTIONS` is static data in source, same convention as the old
  `DONATION_PLATFORMS` array.
- Any amount-linked external redirect (Saweria/Trakteer `?amount=` style) — ruled out by the
  QRIS-scan decision above.
