# Design — Donation Page

Status: Approved for planning
Date: 2026-07-15
Source: `TODO-PRD-GAPS.md`, section "Fitur baru — belum tercakup di PRD sama sekali" ("Halaman/bagian Donasi")
Related PRD sections: none yet — this feature requires a new PRD section (§19), part of this spec's scope.

## Why this scope, why now

This is a genuinely new feature, not in the PRD at all. Per the TODO doc, it must be added
to the PRD before being built (unlike the Share-link feature also listed in that section,
Donation does **not** conflict with the app's core "fully local, no backend" architecture —
it's a static page linking out to external donation platforms, so it can proceed without a
larger architectural decision).

## Context worth remembering while implementing

- This app has no router (`react-router` or similar) — all "pages" are modals/bottom-sheets
  mounted conditionally in `src/App.tsx`'s `Modal` union type (`SettingsPanel`, `RoomForm`,
  `DeviceForm` all follow this pattern). Donation follows the same pattern — a modal, not a
  new route.
- No real donation links/QR codes exist yet. **Do not fabricate placeholder URLs, account
  numbers, or QR images that could look like real payment destinations** — the safe path is
  an empty config array with an honest "not yet added" empty state, so nothing resembling a
  real donation target ships before the actual owner supplies one.
- The app currently has no footer at all (`src/App.tsx`: header, `<main>`, FAB, modals). The
  donation entry point is a new, always-visible footer link at the bottom of the dashboard
  content — not tied to the empty-state-only visibility some other apps use.

## 1. Config module — `src/donation.ts`

```ts
export interface DonationPlatform {
  name: string
  url: string
  qrImage?: string
}

export const DONATION_PLATFORMS: DonationPlatform[] = []
```

Empty by design right now. Filling in real platforms later is a data-only change — add
entries to this array, no component code changes needed.

## 2. `src/components/DonationModal.tsx`

- Follows the existing modal visual pattern used by `SettingsPanel.tsx`/`RoomForm.tsx`:
  bottom-sheet on mobile, centered modal on desktop, backdrop blur, drag-handle bar, header
  with title + ✕ close button.
- Body: if `DONATION_PLATFORMS` is empty, render an honest empty state (❤️ icon + "Tautan
  donasi belum ditambahkan" message) — no fake links, no fake QR.
- If populated (future state, not built now beyond making it render correctly): render each
  platform as a card with its name, an "Buka" link/button (`<a target="_blank"
  rel="noopener noreferrer">`) to `url`, and the QR image if `qrImage` is set.

## 3. Footer entry point — `src/App.tsx`

- New footer element inside `<main>`, rendered unconditionally (regardless of
  `rooms.length`) at the very bottom of the content — a small, unobtrusive text link ("❤️
  Dukung Pengembang"), not a prominent button. Opens `DonationModal` via the existing
  `Modal` union pattern (`{ type: 'donation' }` added alongside the existing variants).

## 4. PRD update

Add a new §19 "Donasi" section to `PRD-Kalkulator-Listrik-PWA.md` describing:
- The feature: a static in-app modal linking to external donation platforms, entry point in
  the dashboard footer.
- Explicitly not an in-app payment flow — no payment processing, no stored payment details,
  consistent with the app's "fully local, no backend" principle (§1/§11).
- Explicit clarification that non-goal §3.3 ("Pembayaran, top-up token") refers to
  PLN/electricity transactions, not app-support donations — so this feature doesn't
  contradict that non-goal (this exact clarification is called out as needed in
  `TODO-PRD-GAPS.md`).

## Out of scope

- Sourcing or inventing real donation platform links/QR codes — `DONATION_PLATFORMS` ships
  empty; populating it is a future content change, not part of this implementation.
- The Share-link feature (separate TODO item, separate architectural decision, not bundled
  here).
- Any interactive payment component (copy-account-number helpers, etc.) — the TODO doc
  raises this as an open question; per the "static link/QR modal" design above, none is
  being built now. Revisit only if/when real platforms are supplied and a specific platform
  needs it.
