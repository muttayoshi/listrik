# Dark Mode — Design

**Tanggal:** 15 Juli 2026
**Status:** Disetujui, siap masuk tahap plan implementasi
**Terkait:** [`TODO-PRD-GAPS.md`](../../../TODO-PRD-GAPS.md) P2 — Dark mode (belum ada, PRD §6)

## 1. Ringkasan

Menambahkan dark mode ke Listrikku (React + Vite + Tailwind CSS v4). Cakupan **menyeluruh**: semua layar
dan modal (dashboard, `RoomCard`/`DeviceCard`, semua form, `SettingsPanel`, `ShareModal`/`ShareView`,
`InstallBanner`, `DonationModal`) mendapat varian dark yang konsisten.

Pendekatan yang dipilih: **Tailwind `dark:` variant per-class** (bukan refactor ke CSS custom-property/token
semantik) — sejalan dengan konvensi proyek di `AGENTS.md` ("gunakan Tailwind utility classes langsung").

## 2. Mekanisme aktivasi & penyimpanan

- Tiga mode: **Sistem** (default, ikut `prefers-color-scheme` OS/browser) / **Terang** / **Gelap** —
  segmented control 3 opsi, bukan toggle on/off, supaya user bisa kembali ke "ikut sistem" kapan saja
  setelah pernah override.
- Disimpan di **`localStorage`** (key `listrikku-theme`), **bukan** di tabel `Settings` Dexie. Alasan:
  tema adalah preferensi tampilan UI murni; kalau ikut disimpan di `Settings` maka akan otomatis
  ter-export/import/share bersama data listrik (lewat `exportImport.ts`/`share.ts`), yang berarti
  penerima share-link "dipaksa" memakai tema pengirim. Ini eksplisit di luar cakupan.
- Nilai yang disimpan: `'system' | 'light' | 'dark'`. Saat `'system'`, aplikasi mendengarkan perubahan
  `matchMedia('(prefers-color-scheme: dark)')` secara live (user ganti tema OS tanpa reload → ikut berubah).

## 3. Implementasi teknis

### 3.1 Tailwind strategy
- `src/index.css`: tambah `@custom-variant dark (&:where(.dark, .dark *));` — mengaktifkan strategi
  class-based Tailwind v4 (bukan cuma media-query bawaan), supaya `dark:` class merespons class `.dark`
  di `<html>`, bukan cuma OS preference.
- Tambah `color-scheme: light;` di `:root` dan `color-scheme: dark;` di bawah `.dark` — supaya native
  form control (spinner number input, tombol file picker di Import Data) ikut menyesuaikan tanpa perlu
  styling manual.

### 3.2 Modul state tema — `src/theme.ts` (baru)
- `getStoredTheme(): 'system' | 'light' | 'dark'` — baca `localStorage`, fallback `'system'` kalau kosong
  atau `localStorage` tidak bisa diakses (try/catch, mis. Safari private mode saat `setItem` throw).
- `resolveEffectiveTheme(theme)` — kalau `'system'`, evaluasi `matchMedia('(prefers-color-scheme: dark)')`
  (guard `typeof window.matchMedia === 'function'`, fallback `'light'` kalau tidak didukung).
- `applyTheme(theme)` — toggle class `.dark` di `document.documentElement` sesuai hasil resolve.
- `useTheme()` hook — state React yang membungkus 3 fungsi di atas, plus efek untuk subscribe/unsubscribe
  listener `matchMedia` change hanya saat mode aktif `'system'`, dan persist ke `localStorage` (try/catch)
  setiap kali user ganti pilihan.

### 3.3 Anti-flash (FOUC)
- Tambah inline `<script>` kecil di `<head>` `index.html`, dieksekusi sebelum React mount, yang membaca
  `localStorage` + `matchMedia` lalu langsung set class `.dark` di `<html>` secara sinkron. Diperlukan
  karena `main.tsx`/React mount secara async — tanpa ini akan ada kedipan tema salah sesaat saat load.

### 3.4 Lokasi toggle UI
- Section baru "Tampilan" di `SettingsPanel.tsx`, ditempatkan sebelum atau sesudah section tarif —
  segmented control Sistem/Terang/Gelap, memanggil `useTheme()`.

## 4. Pemetaan class dark: per pola

Semua 11 file komponen (`App.tsx`, `RoomCard.tsx`, `DeviceCard.tsx`, `RoomForm.tsx`, `DeviceForm.tsx`,
`SettingsPanel.tsx`, `SummaryCards.tsx`, `ShareModal.tsx`, `ShareView.tsx`, `InstallBanner.tsx`,
`DonationModal.tsx`) mendapat varian `dark:` untuk pola berulang berikut:

| Light (existing) | Dark tambahan |
|---|---|
| `bg-white` (card/modal shell) | `dark:bg-emerald-950` |
| `border-gray-100` / `border-gray-200` | `dark:border-emerald-900` / `dark:border-emerald-800` |
| `divide-gray-50` | `dark:divide-emerald-900` |
| `text-gray-900` / `text-gray-700` / `text-gray-600` | `dark:text-gray-100` / `dark:text-gray-300` / `dark:text-gray-400` |
| `text-gray-400` / `text-gray-300` (muted / ikon) | `dark:text-gray-500` / `dark:text-gray-600` |
| `bg-gray-50` / `bg-gray-100` (hover, pill, track) | `dark:bg-emerald-900/40` |
| `bg-emerald-50` / `bg-emerald-100`, `border-emerald-100` / `border-emerald-200`, `text-emerald-600` / `text-emerald-700` | `dark:bg-emerald-950/40`, `dark:border-emerald-800`, `dark:text-emerald-400` / `dark:text-emerald-300` |
| `bg-amber-50` / `border-amber-200` / `text-amber-700` (kotak peringatan) | `dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300` |
| `text-red-500` / `border-red-400` / `bg-red-500` (danger/hapus) | `dark:text-red-400` / `dark:border-red-500` / `dark:bg-red-600` |
| `focus:ring-emerald-100` | `dark:focus:ring-emerald-900/40` |

Card/border dark dipetakan ke keluarga **emerald-950/900** (bukan gray-900/800 netral) supaya senada
dengan page background `--color-canvas: #0d2a1f` (hijau tua) yang sudah ada — tetap stock Tailwind
palette, hanya beda pilihan hue supaya tidak ada gray netral polos bertabrakan dengan canvas hijau.
Warna teks tetap netral (gray-100/300/400) karena keterbacaan tidak butuh tint brand.

### Dikecualikan (tetap sama di kedua tema — keputusan desain, bukan lupa)
- Semua gradient brand hijau inline (`linear-gradient(135deg, #059669, #047857)` dan variannya): header
  logo, FAB "Tambah Ruangan", tombol simpan di semua form, tombol "Bagikan"/"Import ke Perangkat Ini",
  kartu ringkasan biaya utama di `SummaryCards`/`ShareView`. Warna jenuh + teks putih di atasnya tetap
  kontras baik di canvas terang maupun gelap.
- Bar indikator intensitas biaya di `DeviceCard.tsx` (`hsl(hue, ...)`, hijau→oranye berdasar rasio biaya):
  ini data-visualization color, bukan warna netral tema — tidak diubah.
- Overlay modal `bg-black/40 backdrop-blur-sm`: berfungsi sama baik di atas konten terang maupun gelap.
- Ikon empty-state gradient hijau muda (`#d1fae5, #a7f3d0`) di `App.tsx`: dekoratif, dibiarkan.

### Kasus khusus — inline style (bukan Tailwind class)
- Header translucent (`background: rgba(248, 255, 254, 0.9)`) di `App.tsx` dan `ShareView.tsx`: diubah
  jadi Tailwind arbitrary-value class dengan varian dark, `bg-[rgba(248,255,254,0.9)]
  dark:bg-[rgba(13,42,31,0.85)]`, supaya tetap konsisten "semua styling lewat class Tailwind" (bukan
  menambah CSS variable baru).
- `var(--color-surface)` (page background) di `App.tsx`/`ShareView.tsx`: variable ini **sudah ada** di
  `index.css` sejak awal (`--color-surface: #f8fffe`) berikut `--color-canvas: #0d2a1f` yang belum pernah
  dipakai. Cukup isi override `.dark { --color-surface: #0d2a1f; }` di `index.css` — tidak perlu
  mengubah JSX yang sudah memakai `var(--color-surface)`. Ini bukan bagian dari "approach token", hanya
  menuntaskan scaffolding variable yang memang sudah lebih dulu ada.

## 5. Error handling & edge case

- `localStorage.setItem`/`getItem` dibungkus try/catch — kalau throw (mis. Safari private mode, storage
  penuh), toggle tetap berfungsi untuk sesi berjalan tapi tidak persisten ke reload berikutnya.
- `window.matchMedia` di-guard dengan `typeof window.matchMedia === 'function'`; kalau tidak tersedia,
  mode `'system'` fallback ke `'light'`.
- Tema **tidak** ikut dalam `ExportPayload`, tidak tervalidasi di `validateImportPayload`, dan tidak
  tersimpan di hash link Share — tidak ada perubahan di `exportImport.ts`/`share.ts`.

## 6. Testing (manual — proyek ini tidak punya test suite otomatis)

- Toggle Sistem/Terang/Gelap di Settings mengubah seluruh layar & semua modal (dashboard, RoomForm,
  DeviceForm, ShareModal, ShareView, DonationModal, InstallBanner).
- Reload browser → pilihan tema tetap tersimpan.
- Emulasi `prefers-color-scheme: dark` di devtools saat mode `'system'` aktif → ikut berubah otomatis
  tanpa reload.
- Tidak ada flash tema salah (FOUC) saat reload/refresh.
- `pnpm build` lolos tanpa error TypeScript.

## 7. Di luar cakupan

- Warna `theme_color`/`background_color` di Web App Manifest (`vite.config.ts` → `VitePWA`) — statis,
  dipakai OS saat install/splash screen, tidak bisa berubah dinamis mengikuti toggle in-app. Tetap warna
  brand hijau seperti sekarang.
- Meta `theme-color` untuk warna chrome browser (address bar) saat belum ter-install sebagai PWA — di
  luar cakupan spec ini; bisa ditambah terpisah via `<meta name="theme-color" media="(prefers-color-scheme: dark)">` kalau dibutuhkan nanti, tapi itu hanya ikut OS preference, tidak bisa mengikuti override manual in-app (keterbatasan platform, bukan bug).
