# Mobile FAB Speed Dial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the mobile-only "+ Tambah Ruangan" floating action button in `src/App.tsx` into an icon-only "+" that expands into a two-option speed dial (Tambah Perangkat / Tambah Ruangan).

**Architecture:** A single new boolean state (`fabOpen`) in `App()` controls: (1) a full-screen transparent tap-to-close backdrop, (2) two always-mounted, class-toggled pill mini-buttons that fade/slide in and out, and (3) the existing main FAB button, now icon-only, whose icon rotates 45° when open. No new files, no new components — this is a self-contained JSX block replacement inside `src/App.tsx`.

**Tech Stack:** React 19, Tailwind CSS v4 (no new dependencies, no animation library).

**Spec:** `docs/superpowers/specs/2026-07-16-mobile-fab-speed-dial-design.md` — read once before starting; this plan implements it exactly.

## Global Constraints

- Scope is **only** `src/App.tsx`. Do not modify `src/components/RoomForm.tsx`, `src/components/DeviceForm.tsx`, or the `Modal` type — all three are used exactly as they already exist.
- The FAB block keeps its existing guard: only rendered when `rooms.length > 0` (unchanged — empty state has its own separate "Tambah Ruangan Pertama" button).
- The FAB block keeps `sm:hidden` — mobile only. Desktop's inline "Tambah Ruangan" button in the room list is untouched.
- "Tambah Perangkat" from the FAB opens `DeviceForm` with `roomId: rooms[0].id` as the default — `rooms[0]` is guaranteed to exist here because of the `rooms.length > 0` guard above. `DeviceForm` already has its own room-picker inside the form; no new code is needed for reassignment.
- Dark mode classes use the same emerald-950/900/800 + neutral gray-100/300/400/500/600 family already established across this codebase (see any of `RoomCard.tsx`, `SettingsPanel.tsx`, etc. for reference) — do not invent a new palette.
- This repo has **no automated test framework** (no vitest/jest, no test script in `package.json`) — verification in this plan means `pnpm build` (TypeScript/build correctness) plus manual checks in the running dev server (a Vite dev server is always running per `AGENTS.md`).
- No new dependencies, no animation library — use Tailwind transition utilities only (`transition-all`, `transition-transform`, `duration-200`), the same pattern already used for `RoomCard.tsx`'s chevron rotation.

---

### Task 1: Replace the FAB with a speed dial

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add the `fabOpen` state**

Current top of `App()`:
```tsx
export default function App() {
  const { rooms, devices, settings, loaded, load } = useStore()
  const [theme, setTheme] = useTheme()
  const [modal, setModal] = useState<Modal>(null)
  const [shareHash, setShareHash] = useState(() =>
    location.hash.startsWith(SHARE_HASH_PREFIX) ? location.hash : null
  )
```

New:
```tsx
export default function App() {
  const { rooms, devices, settings, loaded, load } = useStore()
  const [theme, setTheme] = useTheme()
  const [modal, setModal] = useState<Modal>(null)
  const [fabOpen, setFabOpen] = useState(false)
  const [shareHash, setShareHash] = useState(() =>
    location.hash.startsWith(SHARE_HASH_PREFIX) ? location.hash : null
  )
```

- [ ] **Step 2: Replace the FAB block**

Current (the whole `{/* FAB ... */}` block, near the end of the main return, right before `{/* Modals */}`):
```tsx
      {/* FAB — mobile only; desktop uses the inline "Tambah Ruangan" button in the list */}
      {rooms.length > 0 && (
        <div className="fixed bottom-6 right-4 sm:hidden z-30">
          <button
            onClick={() => setModal({ type: 'addRoom' })}
            className="flex items-center gap-2.5 px-5 py-3.5 rounded-full text-white font-bold text-sm shadow-lg hover:shadow-xl active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg, #059669, #047857)', fontFamily: 'var(--font-display)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Tambah Ruangan
          </button>
        </div>
      )}
```

New:
```tsx
      {/* FAB — mobile only; desktop uses the inline "Tambah Ruangan" button in the list */}
      {rooms.length > 0 && (
        <>
          {fabOpen && (
            <div className="fixed inset-0 z-20" onClick={() => setFabOpen(false)} />
          )}
          <div className="fixed bottom-6 right-4 sm:hidden z-30">
            <button
              onClick={() => {
                setFabOpen(false)
                setModal({ type: 'addRoom' })
              }}
              className={`absolute bottom-32 right-0 flex items-center gap-2 px-4 py-2.5 rounded-full bg-white dark:bg-emerald-950 text-gray-700 dark:text-gray-300 font-semibold text-sm shadow-lg whitespace-nowrap transition-all duration-200 ${
                fabOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'
              }`}
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Tambah Ruangan
            </button>
            <button
              onClick={() => {
                setFabOpen(false)
                setModal({ type: 'addDevice', roomId: rooms[0].id })
              }}
              className={`absolute bottom-16 right-0 flex items-center gap-2 px-4 py-2.5 rounded-full bg-white dark:bg-emerald-950 text-gray-700 dark:text-gray-300 font-semibold text-sm shadow-lg whitespace-nowrap transition-all duration-200 ${
                fabOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'
              }`}
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Tambah Perangkat
            </button>
            <button
              onClick={() => setFabOpen((o) => !o)}
              aria-label={fabOpen ? 'Tutup menu tambah' : 'Tambah'}
              className="flex items-center justify-center w-14 h-14 rounded-full text-white shadow-lg hover:shadow-xl active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
            >
              <svg
                width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                className={`transition-transform duration-200 ${fabOpen ? 'rotate-45' : ''}`}
              >
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        </>
      )}
```

Notes on this code:
- The backdrop (`fixed inset-0 z-20`) is conditionally rendered only when `fabOpen` — it doesn't need its own animation, so no class-toggle trick is needed there, unlike the mini-buttons.
- The two mini-buttons are **always mounted** (not conditionally rendered) so the `transition-all duration-200` on their opacity/translate classes actually animates — conditionally rendering them with `{fabOpen && ...}` would make them pop in/out instantly with no transition. `pointer-events-none` when closed prevents the invisible-but-present buttons from intercepting taps.
- `z-20` for the backdrop sits below the FAB container's `z-30`, so the speed-dial buttons stay tappable, and below the header's `z-40`, so the header stays clickable even with the backdrop present.
- The main button dropped its text label and fixed width/padding (`px-5 py-3.5`) in favor of a fixed circular size (`w-14 h-14`) — this is the "icon-only" requirement from the spec.

- [ ] **Step 3: Verify with `pnpm build`**

Run: `pnpm build`
Expected: succeeds with no TypeScript errors.

- [ ] **Step 4: Manual verification in the running dev server**

With at least one room already created in the app (the FAB only shows when `rooms.length > 0`), on a mobile-width viewport (devtools responsive mode or an actual phone):
1. Tap the "+" FAB — it should rotate into a "×", and two pill buttons ("Tambah Ruangan" above, "Tambah Perangkat" just above the main button) should fade/slide into view.
2. Tap "Tambah Perangkat" — `DeviceForm` should open with the first room already selected as the target room (check the room-chip selector at the top of the form); the speed dial should be closed underneath it.
3. Close that form, tap "+" again, tap "Tambah Ruangan" — `RoomForm` (add mode) should open; speed dial closed underneath.
4. Tap "+" to open the speed dial, then tap anywhere outside the two pills/main button (the backdrop) — the speed dial should close with no modal opening.
5. Tap "+" to open, then tap the main button again (now showing "×") — the speed dial should close.
6. Toggle dark mode (Settings → Tampilan → Gelap) and repeat step 1 — the two pill buttons should render with a dark emerald-950 background and light gray text, matching the rest of the app's modals.
7. Confirm on a desktop-width viewport the FAB (and speed dial) never appears at all — the existing inline "Tambah Ruangan" button below the room list is the only way to add a room there, unchanged.

Note: this is real interactive browser verification the person running this step should actually perform — unlike prior dark-mode plan verification which used curl/transform checks as a substitute, this is a small enough change that clicking through it directly is the right level of effort.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "$(cat <<'EOF'
Turn mobile FAB into a two-option speed dial

The single "+ Tambah Ruangan" FAB is now icon-only and expands into
Tambah Perangkat / Tambah Ruangan on tap, so adding a device no
longer requires scrolling to a specific room's card first.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
