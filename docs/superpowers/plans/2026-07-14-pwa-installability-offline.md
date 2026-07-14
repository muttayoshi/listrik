# PWA Installability & Offline + PPJ% Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Listrikku installable and fully offline-capable (manifest, service worker, install banner) and add the missing PPJ% settings input, closing all P0 gaps in `TODO-PRD-GAPS.md`.

**Architecture:** `vite-plugin-pwa` (Workbox `generateSW` strategy) generates the manifest and service worker at build time from config in `vite.config.ts`; icons are pre-generated placeholder PNGs produced by a one-off Node script; a new `InstallBanner` component surfaces `beforeinstallprompt` (Android/desktop) or static instructions (iOS); `SettingsPanel.tsx` gets one more input wired into the already-existing `ppjPercent` field.

**Tech Stack:** Vite 8, React 19, TypeScript (strict), `vite-plugin-pwa@^1.3.0` (Workbox), Zustand, Dexie — no new test framework.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-14-pwa-installability-offline-design.md` — read it before starting; this plan implements it exactly.
- `vite-plugin-pwa@^1.3.0` — confirmed compatible with `vite@^8.0.0` (peer range `^3.1.0 || ^4.0.0 || ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0`).
- Manifest: `name: "Listrikku — Kalkulator Biaya Listrik"`, `short_name: "Listrikku"`, `theme_color: "#059669"`, `background_color: "#f8fffe"`, `display: "standalone"`.
- **Base-path awareness is mandatory**: this app's `base` is dynamic (`vite.config.ts` reads `process.env.FIGMA_PUBLIC_URL`). Manifest `start_url`/`scope` must be relative (`"."`), and any hardcoded asset path added to `index.html` must use Vite's `%BASE_URL%` placeholder — never a literal leading `/`.
- Do not add content between the exact strings `<!-- figma:head-start -->` and `<!-- figma:head-end -->` in `index.html` — that span is string-replaced by the `figma-site-configuration` plugin in `vite.config.ts`. New tags go after `<!-- figma:head-end -->`, still inside `<head>`.
- `registerType: 'autoUpdate'` with default `injectRegister: 'auto'` — the SW self-registers and self-updates with no custom React code needed. This is a deliberate deviation from PRD §10.2 (which specifies a manual "reload" prompt) — already documented as accepted in the design spec.
- `devOptions.enabled: false` — the SW must never activate under `vite dev` (AGENTS.md: a dev server with HMR is always running on `$PORT`); it only builds into production output (`vite build` / `vite preview`).
- **Testing strategy for this plan (approved deviation from the skill's default TDD-with-a-framework flow):** this project has zero test framework (no vitest/jest/RTL) and AGENTS.md's existing convention is manual verification through the preview panel. Per explicit user decision, this plan does **not** introduce a new test framework. Pure-logic pieces (the icon generator, the built manifest JSON) are verified with small inline `node -e` assertion scripts (real pass/fail, just no framework). UI pieces (banner, settings input, SW registration) are verified by running `pnpm build && pnpm preview` and inspecting output/DevTools by hand — each such task still includes a concrete, runnable check (`tsc --noEmit`, `grep`, build output inspection), just not a component-level unit test.
- Automated Lighthouse scoring is out of reach in this environment (no Chrome/Lighthouse CLI here) — the final task produces a manual checklist instead; a human must run the real audit before treating PRD §16 as fully satisfied.

---

### Task 1: Icon generator script + generated icon files

**Files:**
- Create: `scripts/generate-icons.mjs`
- Create (generated output, committed as static assets): `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/icon-512-maskable.png`, `public/icons/apple-touch-icon.png`

**Interfaces:**
- Produces: four PNG files at `public/icons/` referenced by Task 2's manifest config (`icons/icon-192.png`, `icons/icon-512.png`, `icons/icon-512-maskable.png`) and Task 3's `apple-touch-icon` link (`icons/apple-touch-icon.png`). Vite serves everything under `public/` at the site root, so these resolve to `<base>/icons/<file>.png`.

- [ ] **Step 1: Write the failing check**

Run this from the repo root — it should fail because the icon files don't exist yet:

```bash
node -e "
const fs = require('fs');
const files = ['public/icons/icon-192.png','public/icons/icon-512.png','public/icons/icon-512-maskable.png','public/icons/apple-touch-icon.png'];
for (const f of files) {
  if (!fs.existsSync(f)) throw new Error('missing ' + f);
}
console.log('all icon files present');
"
```

Expected: throws `Error: missing public/icons/icon-192.png` (FAIL).

- [ ] **Step 2: Write the icon generator script**

Create `scripts/generate-icons.mjs`:

```js
import { deflateSync, crc32 } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const GRADIENT_START = [5, 150, 105] // #059669
const GRADIENT_END = [4, 120, 87] // #047857
const BOLT_COLOR = [255, 255, 255]

// Lightning bolt polygon, normalized to a 0..1 unit square.
const BOLT_POINTS = [
  [0.6, 0.05],
  [0.28, 0.55],
  [0.46, 0.55],
  [0.4, 0.95],
  [0.75, 0.4],
  [0.55, 0.4],
  [0.6, 0.05],
]

function scalePoints(points, factor) {
  return points.map(([x, y]) => [0.5 + (x - 0.5) * factor, 0.5 + (y - 0.5) * factor])
}

// Ray-casting point-in-polygon test.
function isInsidePolygon(px, py, points) {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i]
    const [xj, yj] = points[j]
    const intersects = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

function pixelColor(x, y, size, boltPoints) {
  const t = (x + y) / (2 * (size - 1))
  const bg = GRADIENT_START.map((c0, i) => Math.round(c0 + (GRADIENT_END[i] - c0) * t))
  const nx = (x + 0.5) / size
  const ny = (y + 0.5) / size
  return isInsidePolygon(nx, ny, boltPoints) ? BOLT_COLOR : bg
}

function crc32Buf(buf) {
  const c = crc32(buf) >>> 0
  const out = Buffer.alloc(4)
  out.writeUInt32BE(c, 0)
  return out
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcInput = Buffer.concat([typeBuf, data])
  return Buffer.concat([length, typeBuf, data, crc32Buf(crcInput)])
}

function encodePng(size, boltPoints) {
  const raw = Buffer.alloc(size * (1 + size * 3))
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 3)
    raw[rowStart] = 0 // filter type: None
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixelColor(x, y, size, boltPoints)
      const px = rowStart + 1 + x * 3
      raw[px] = r
      raw[px + 1] = g
      raw[px + 2] = b
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type: RGB
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const idat = deflateSync(raw)

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function writeIcon(path, size, boltPoints) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, encodePng(size, boltPoints))
  console.log(`wrote ${path} (${size}x${size})`)
}

const OUT_DIR = process.argv[2] ?? 'public/icons'

writeIcon(`${OUT_DIR}/icon-192.png`, 192, scalePoints(BOLT_POINTS, 0.9))
writeIcon(`${OUT_DIR}/icon-512.png`, 512, scalePoints(BOLT_POINTS, 0.9))
writeIcon(`${OUT_DIR}/icon-512-maskable.png`, 512, scalePoints(BOLT_POINTS, 0.72))
writeIcon(`${OUT_DIR}/apple-touch-icon.png`, 180, scalePoints(BOLT_POINTS, 0.9))
```

Notes on this script (already validated during design):
- Uses only Node's built-in `zlib` (including `zlib.crc32`, available in this Node version) — no new dependency.
- Emits real, valid PNGs: signature + `IHDR` (8-bit RGB, no alpha — icons are fully opaque so no transparency is needed) + `IDAT` (zlib-deflated raw scanlines, filter type `None`) + `IEND`.
- The maskable icon (`0.72` scale factor) keeps the bolt glyph inside the ~80% "safe zone" circle maskable icons require, while the gradient background still bleeds to every edge.

- [ ] **Step 3: Run the generator**

```bash
node scripts/generate-icons.mjs
```

Expected output:
```
wrote public/icons/icon-192.png (192x192)
wrote public/icons/icon-512.png (512x512)
wrote public/icons/icon-512-maskable.png (512x512)
wrote public/icons/apple-touch-icon.png (180x180)
```

- [ ] **Step 4: Re-run the existence check from Step 1 — expect PASS**

Run the same command from Step 1 again. Expected: prints `all icon files present`, no error.

- [ ] **Step 5: Verify PNG signature and exact dimensions**

```bash
node -e "
const fs = require('fs');
const files = { 'public/icons/icon-192.png': 192, 'public/icons/icon-512.png': 512, 'public/icons/icon-512-maskable.png': 512, 'public/icons/apple-touch-icon.png': 180 };
const sig = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
for (const [f, expected] of Object.entries(files)) {
  const data = fs.readFileSync(f);
  if (!data.subarray(0, 8).equals(sig)) throw new Error(f + ': bad PNG signature');
  const width = data.readUInt32BE(16);
  const height = data.readUInt32BE(20);
  if (width !== expected || height !== expected) throw new Error(f + ': expected ' + expected + 'x' + expected + ', got ' + width + 'x' + height);
}
console.log('all icons valid');
"
```

Expected: prints `all icons valid`, no error.

- [ ] **Step 6: Commit**

```bash
git add scripts/generate-icons.mjs public/icons/icon-192.png public/icons/icon-512.png public/icons/icon-512-maskable.png public/icons/apple-touch-icon.png
git commit -m "$(cat <<'EOF'
Add placeholder PWA icon set via zero-dependency PNG generator

Generates 192/512/maskable/apple-touch-icon PNGs (emerald gradient +
bolt glyph, matching the existing header logo) using only Node's
built-in zlib — no image-conversion tooling is available in this
environment. Icons are drop-in replaceable once real brand assets
exist.
EOF
)"
```

---

### Task 2: `vite-plugin-pwa` dependency + manifest/service-worker config

**Files:**
- Modify: `package.json` (new devDependency, via `pnpm add`)
- Modify: `vite.config.ts`

**Interfaces:**
- Consumes: icon files from Task 1 at `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/icon-512-maskable.png`.
- Produces (build output): `dist/manifest.webmanifest`, `dist/sw.js`, and an auto-injected registration `<script>` in `dist/index.html`. Task 3, 4, 6 rely on `dist/manifest.webmanifest` and `dist/sw.js` existing after `pnpm build`.

- [ ] **Step 1: Confirm the gap (baseline build has no manifest/SW)**

```bash
pnpm build && ls dist | grep -E "manifest\.webmanifest|sw\.js" ; echo "exit:$?"
```

Expected: no matching filenames printed, `exit:1` (FAIL — grep found nothing, confirming the gap exists before this task's change).

- [ ] **Step 2: Add the dependency**

```bash
pnpm add -D vite-plugin-pwa
```

Expected: `package.json` gains `vite-plugin-pwa` under `devDependencies`, `pnpm-lock.yaml` updates.

- [ ] **Step 3: Configure the plugin in `vite.config.ts`**

Add the import near the top (after the existing `tailwindcss` import):

```ts
import { VitePWA } from 'vite-plugin-pwa'
```

In the `plugins` array, add the `VitePWA(...)` call right after `tailwindcss()`:

```ts
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: false },
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Listrikku — Kalkulator Biaya Listrik',
        short_name: 'Listrikku',
        description:
          'Hitung estimasi biaya listrik bulanan per ruangan & perangkat, tersimpan lokal di perangkatmu.',
        theme_color: '#059669',
        background_color: '#f8fffe',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'],
      },
      filename: 'sw.js',
    }),
    figmaSiteConfiguration(siteConfiguration),
    figmaErrorOverlayReplay(),
    figmaReactRefreshBoundaryFallback(),
    figmaMakeKitPlugin({ storiesGlob: '/src/**/*.stories.{ts,tsx,js,jsx}' }),
  ],
```

- [ ] **Step 4: Re-run the build check from Step 1 — expect PASS**

```bash
pnpm build && ls dist | grep -E "manifest\.webmanifest|sw\.js"
```

Expected output includes both:
```
manifest.webmanifest
sw.js
```

- [ ] **Step 5: Verify the manifest content is correct**

```bash
node -e "
const fs = require('fs');
const manifest = JSON.parse(fs.readFileSync('dist/manifest.webmanifest', 'utf8'));
const required = ['name','short_name','start_url','display','theme_color','background_color','icons'];
for (const key of required) {
  if (!(key in manifest)) throw new Error('manifest missing field: ' + key);
}
if (manifest.name !== 'Listrikku — Kalkulator Biaya Listrik') throw new Error('unexpected name: ' + manifest.name);
if (manifest.short_name !== 'Listrikku') throw new Error('unexpected short_name: ' + manifest.short_name);
if (manifest.display !== 'standalone') throw new Error('display should be standalone, got ' + manifest.display);
if (manifest.icons.length < 3) throw new Error('expected at least 3 icons, got ' + manifest.icons.length);
if (!manifest.icons.some((i) => i.purpose === 'maskable')) throw new Error('missing maskable icon');
console.log('manifest OK');
"
```

Expected: prints `manifest OK`, no error.

- [ ] **Step 6: Verify the service worker precaches the app shell**

```bash
grep -q "precacheAndRoute" dist/sw.js && echo "SW precache OK"
```

Expected: prints `SW precache OK` (confirms Workbox's precache manifest was injected into the generated SW).

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml vite.config.ts
git commit -m "$(cat <<'EOF'
Add vite-plugin-pwa: web app manifest + auto-updating service worker

Configures Workbox generateSW with the icon set from the previous
commit, relative start_url/scope so it respects this project's
dynamic base path (FIGMA_PUBLIC_URL), and registerType: autoUpdate so
the SW self-updates with no custom UI. devOptions.enabled stays false
so the SW never activates under the always-on dev server.
EOF
)"
```

---

### Task 3: iOS install meta tags in `index.html`

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: `public/icons/apple-touch-icon.png` from Task 1.
- Produces: nothing consumed by other tasks — this is a standalone HTML addition read by iOS Safari when a user does "Add to Home Screen".

- [ ] **Step 1: Confirm the gap**

```bash
grep -c "apple-mobile-web-app-capable" index.html
```

Expected: `0` (FAIL — tag doesn't exist yet).

- [ ] **Step 2: Add the tags**

Edit `index.html`. Current content:

```html
<!doctype html>
<html lang="<!-- figma:lang -->">
  <head>
    <!-- figma:head-start -->
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title><!-- figma:title --></title>
    <!-- figma:head-end -->
  </head>
  <body>
    <!-- figma:body-start -->
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
    <!-- figma:body-end -->
  </body>
</html>
```

Replace it with (only the `<head>` block changes — new tags added right after `<!-- figma:head-end -->`, per the Global Constraints rule about not touching the comment span itself):

```html
<!doctype html>
<html lang="<!-- figma:lang -->">
  <head>
    <!-- figma:head-start -->
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title><!-- figma:title --></title>
    <!-- figma:head-end -->
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="Listrikku" />
    <link rel="apple-touch-icon" href="%BASE_URL%icons/apple-touch-icon.png" />
  </head>
  <body>
    <!-- figma:body-start -->
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
    <!-- figma:body-end -->
  </body>
</html>
```

(`%BASE_URL%` is a Vite built-in placeholder — Vite replaces it with the resolved `base` config at build time, so this stays correct whether `FIGMA_PUBLIC_URL` is set or not.)

- [ ] **Step 3: Re-run the check from Step 1 — expect PASS**

```bash
grep -c "apple-mobile-web-app-capable" index.html
```

Expected: `1`.

- [ ] **Step 4: Verify the built HTML has the resolved tag**

```bash
pnpm build && grep -o 'apple-touch-icon" href="[^"]*"' dist/index.html
```

Expected output (base defaults to `/` when `FIGMA_PUBLIC_URL` is unset):
```
apple-touch-icon" href="/icons/apple-touch-icon.png"
```

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
Add iOS Add-to-Home-Screen meta tags to index.html

iOS Safari has no beforeinstallprompt event, so it relies on these
meta tags plus manual user action (Share -> Add to Home Screen).
Added outside the figma:head-start/head-end span so the Figma Make
HTML templating plugin can't clobber them.
EOF
)"
```

---

### Task 4: Install banner (`beforeinstallprompt` + iOS instructions)

**Files:**
- Create: `src/components/InstallBanner.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: default export `InstallBanner` (no props) — a self-contained component that reads/writes `localStorage['installBannerDismissed']` and renders `null` when not applicable.
- Consumes: nothing from other tasks (works standalone; becomes meaningful once Task 2's manifest+SW make the app actually installable).

- [ ] **Step 1: Write `src/components/InstallBanner.tsx`**

```tsx
import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'installBannerDismissed'

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const nav = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(
    () => typeof localStorage !== 'undefined' && localStorage.getItem(DISMISSED_KEY) === '1',
  )

  useEffect(() => {
    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  if (dismissed || isStandalone()) return null

  const showIOSInstructions = isIOS() && !deferredPrompt
  if (!deferredPrompt && !showIOSInstructions) return null

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setDismissed(true)
  }

  async function handleInstallClick() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-3">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <p className="text-xs text-emerald-800 leading-relaxed" style={{ fontFamily: 'var(--font-display)' }}>
          {showIOSInstructions
            ? <>Pasang di layar utama: ketuk <strong>Bagikan</strong> lalu <strong>Tambah ke Layar Utama</strong>.</>
            : <>Pasang Listrikku sebagai aplikasi untuk akses lebih cepat.</>}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          {!showIOSInstructions && (
            <button
              onClick={handleInstallClick}
              className="px-3.5 py-2 rounded-xl text-white font-bold text-xs whitespace-nowrap transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #059669, #047857)', fontFamily: 'var(--font-display)' }}
            >
              Pasang aplikasi
            </button>
          )}
          <button
            onClick={handleDismiss}
            aria-label="Tutup"
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-emerald-100 text-emerald-700 transition-colors text-sm"
          >
            ✕
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

Expected: no output, exit code 0 (the custom `BeforeInstallPromptEvent` interface and `navigator.standalone` cast must compile cleanly under `strict: true`).

- [ ] **Step 3: Mount it in `src/App.tsx`**

Add the import near the other component imports (`src/App.tsx:8`, after the `SettingsPanel` import):

```tsx
import InstallBanner from './components/InstallBanner'
```

Mount it right after the closing `</header>` tag and before the `{/* Main */}` comment (`src/App.tsx:73-75`):

```tsx
      </header>

      <InstallBanner />

      {/* Main */}
```

- [ ] **Step 4: Typecheck again**

```bash
npx tsc --noEmit
```

Expected: no output, exit code 0.

- [ ] **Step 5: Manual check in the browser**

```bash
pnpm build && pnpm preview
```

Open the preview URL in Chrome, open DevTools → Application → Manifest, and use the "Add to homescreen" / install icon in the address bar to confirm the browser recognizes the app as installable and the banner's install button triggers the native prompt. (Chrome only fires real `beforeinstallprompt` when install criteria — HTTPS, valid manifest, registered SW — are met; on `localhost` this generally works. Note in the final task's checklist that a human should re-confirm this manually.)

- [ ] **Step 6: Commit**

```bash
git add src/components/InstallBanner.tsx src/App.tsx
git commit -m "$(cat <<'EOF'
Add install banner for beforeinstallprompt + iOS instructions

Dismissible banner above the dashboard: shows a native "Pasang
aplikasi" button when beforeinstallprompt fires (Android/desktop
Chrome), or static Add-to-Home-Screen instructions on iOS Safari
where that event doesn't exist. Never renders once the app is
already running standalone, and stays dismissed via localStorage.
EOF
)"
```

---

### Task 5: PPJ% input in Settings

**Files:**
- Modify: `src/components/SettingsPanel.tsx`

**Interfaces:**
- Consumes: `settings.ppjPercent` (already exists on the `Settings` type in `src/db.ts:26`, already consumed by `calcDevice` in `src/db.ts:84`).
- No new interfaces produced — this task only adds UI wired to an existing field.

- [ ] **Step 1: Confirm the gap**

```bash
grep -c "ppjPercent\|PPJ" src/components/SettingsPanel.tsx
```

Expected: `0` (FAIL — no PPJ handling in this file yet).

- [ ] **Step 2: Add state, validation, and the input**

In `src/components/SettingsPanel.tsx`, add a new state variable next to the existing `days` state (line 13):

```tsx
  const [tariff, setTariff] = useState(String(settings.tariffPerKwh))
  const [days, setDays] = useState(String(settings.daysPerMonth))
  const [ppj, setPpj] = useState(String(settings.ppjPercent))
```

Update `handleSave` (lines 15-21) to validate and include the new field:

```tsx
  async function handleSave() {
    const t = parseFloat(tariff)
    const d = parseInt(days)
    const p = parseFloat(ppj)
    if (isNaN(t) || t <= 0 || isNaN(d) || d < 1 || d > 31) return
    if (isNaN(p) || p < 0 || p > 10) return
    await updateSettings({ ...settings, tariffPerKwh: t, daysPerMonth: d, ppjPercent: p })
    onClose()
  }
```

Add the input block right after the "Days per month" block (after line 101, before the amber notice `<div className="rounded-xl bg-amber-50 ...">` on line 103):

```tsx
          {/* PPJ */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block" style={{ fontFamily: 'var(--font-display)' }}>
              PPJ (%)
            </label>
            <input
              type="number"
              value={ppj}
              onChange={(e) => setPpj(e.target.value)}
              min={0}
              max={10}
              step={0.1}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 font-mono"
            />
          </div>
```

- [ ] **Step 3: Re-run the check from Step 1 — expect PASS**

```bash
grep -c "ppjPercent\|PPJ" src/components/SettingsPanel.tsx
```

Expected: a number greater than `0`.

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no output, exit code 0.

- [ ] **Step 5: Manual check in the browser**

```bash
pnpm dev
```

Open Settings, set PPJ to e.g. `5`, save, and confirm a device's monthly cost updates to reflect the surcharge (matches `calcDevice`'s existing `monthlyCost = monthlyKwh * tariffPerKwh * (1 + ppjPercent / 100)` in `src/db.ts:84`). Also confirm saving with PPJ left blank/invalid does nothing (matches existing validation pattern for tariff/days).

- [ ] **Step 6: Commit**

```bash
git add src/components/SettingsPanel.tsx
git commit -m "$(cat <<'EOF'
Add PPJ% input to Settings panel

ppjPercent already existed on the Settings model and was already
used by calcDevice's cost formula — only the UI to change it was
missing. Follows the existing tariff/days input pattern exactly.
EOF
)"
```

---

### Task 6: Build verification + manual PWA checklist

**Files:**
- Create: `docs/superpowers/specs/2026-07-14-pwa-manual-verification-checklist.md`

**Interfaces:**
- Consumes: build output from Tasks 1-5 (`dist/manifest.webmanifest`, `dist/sw.js`, `dist/index.html`).
- Produces: a checklist artifact for the user to complete by hand (real Lighthouse run, real offline toggle in a real browser) — nothing else depends on this file programmatically.

- [ ] **Step 1: Full production build**

```bash
pnpm build
```

Expected: build succeeds with no errors, `dist/` contains `manifest.webmanifest`, `sw.js`, `index.html`, and `icons/*.png`.

- [ ] **Step 2: Re-verify manifest + SW together (regression check after all prior tasks' changes)**

```bash
node -e "
const fs = require('fs');
const manifest = JSON.parse(fs.readFileSync('dist/manifest.webmanifest', 'utf8'));
if (manifest.icons.length < 3) throw new Error('expected >= 3 icons, got ' + manifest.icons.length);
if (!fs.existsSync('dist/sw.js')) throw new Error('dist/sw.js missing');
if (!fs.readFileSync('dist/sw.js', 'utf8').includes('precacheAndRoute')) throw new Error('sw.js missing precacheAndRoute');
if (!fs.readFileSync('dist/index.html', 'utf8').includes('apple-touch-icon')) throw new Error('index.html missing apple-touch-icon link');
console.log('build verification OK');
"
```

Expected: prints `build verification OK`.

- [ ] **Step 3: Serve the production build and smoke-check it responds**

```bash
pnpm preview &
sleep 1
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:${PORT:-8443}/
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:${PORT:-8443}/manifest.webmanifest
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:${PORT:-8443}/sw.js
kill %1
```

Expected: `200` for all three requests.

- [ ] **Step 4: Write the manual verification checklist**

Create `docs/superpowers/specs/2026-07-14-pwa-manual-verification-checklist.md`:

```markdown
# Manual PWA Verification Checklist

Run this in a real Chrome browser against a production build
(`pnpm build && pnpm preview`) before treating PRD §16's PWA
acceptance criteria as fully satisfied. Automated checks in this
plan (build output inspection) cover as much as this environment
allows; the items below need an actual browser and cannot be
scripted here.

- [ ] DevTools → Application → Manifest: no errors/warnings, icons render correctly (192, 512, maskable).
- [ ] DevTools → Application → Service Workers: worker shows status "activated and is running".
- [ ] DevTools → Network → set to "Offline", reload the page: app shell loads, no network error page.
- [ ] With the app still offline, open a room, add a device, confirm totals calculate — proves IndexedDB (Dexie) works independently of network/SW state.
- [ ] Address bar shows an install icon (desktop Chrome) or the in-app "Pasang aplikasi" banner button opens the native install prompt.
- [ ] After installing, launch the installed app: opens standalone (no browser chrome), and the in-app install banner no longer appears.
- [ ] On an iOS Safari device (or simulator): confirm the banner shows the "Bagikan → Tambah ke Layar Utama" instructions instead of a button, and that Add to Home Screen produces a working standalone icon.
- [ ] Run an actual Lighthouse audit (Chrome DevTools → Lighthouse → PWA category, or `npx lighthouse <preview-url> --view`): installable and offline checks should both pass. Record the score.
```

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-07-14-pwa-manual-verification-checklist.md
git commit -m "$(cat <<'EOF'
Add manual PWA verification checklist

Automated checks in this environment stop at build-output inspection
(no Chrome/Lighthouse CLI available here). This checklist covers the
remaining installability/offline/Lighthouse items PRD §16 requires,
to be completed by hand in a real browser.
EOF
)"
```

---

## Self-Review Notes

- **Spec coverage:** §1 manifest/icons → Task 1 + Task 2. §2 service worker/offline → Task 2 (config) + Task 6 (verification). §3 install banner/iOS → Task 3 (meta tags) + Task 4 (banner component). §4 PPJ% → Task 5. §5 verification → Task 6. "Out of scope" items from the spec are correctly untouched by all tasks.
- **Type consistency:** `InstallBanner` is a default export with no props, imported as `import InstallBanner from './components/InstallBanner'` in both Task 4's interface note and its actual `App.tsx` edit. `ppjPercent` (not `ppj_percent` or similar) is used consistently — matches the existing `Settings` type in `src/db.ts:26`.
- **Base-path handling:** verified in both Task 2 (`start_url`/`scope: '.'`) and Task 3 (`%BASE_URL%` placeholder) — no task hardcodes a leading `/` for an asset path.
