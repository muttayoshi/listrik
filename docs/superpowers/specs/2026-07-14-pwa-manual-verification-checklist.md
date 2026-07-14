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
