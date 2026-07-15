# TODO — Gap Implementasi vs PRD

Dokumen ini adalah ringkasan poin-poin yang **belum diimplementasikan** (atau belum lengkap) dibanding
[`PRD-Kalkulator-Listrik-PWA.md`](./PRD-Kalkulator-Listrik-PWA.md). Setiap poin mereferensikan nomor bagian
PRD — baca bagian tersebut untuk detail requirement, formula, dan alasan di baliknya sebelum mengerjakan.

Status implementasi lain (sudah sesuai/melebihi PRD) tidak diulang di sini — fokus dokumen ini murni pada gap.

---

## P0 — MVP, belum lolos kriteria penerimaan (PRD §16)

- [x] **PWA Web App Manifest** — selesai. `vite-plugin-pwa` (`generateSW`) menghasilkan `manifest.webmanifest`
      dengan `name`/`short_name`/`theme_color`/`background_color`/`display: standalone`, ikon 192×192, 512×512,
      512×512 `maskable`, dan `apple-touch-icon` (digenerate via `scripts/generate-icons.mjs`, placeholder —
      siap diganti aset brand final). Lihat **PRD §10.1**.
- [x] **Service Worker** — selesai. Workbox via `vite-plugin-pwa`, precache app-shell penuh, `registerType:
      'autoUpdate'` (SW baru aktif & reload otomatis — **catatan: ini menyimpang dari PRD §10.2** yang minta
      prompt manual "Versi baru tersedia"; keputusan disengaja, lihat spec di bawah). Lihat **PRD §10.2**.
- [x] **Installability** — selesai. `InstallBanner` menangani `beforeinstallprompt` (tombol "Pasang aplikasi")
      di Android/Chrome, dan menampilkan instruksi manual "Tambah ke Layar Utama" di iOS/Safari (tidak ada
      `beforeinstallprompt` di iOS). `apple-mobile-web-app-capable` dkk. ditambahkan ke `index.html`. Lihat
      **PRD §10.3**.
- [ ] **Verifikasi offline & audit Lighthouse PWA** — manifest, SW, dan build sudah diverifikasi otomatis
      (precache, field manifest, HTTP 200 pada `manifest.webmanifest`/`sw.js`). **Audit Lighthouse asli dan
      tes offline di browser sungguhan belum dijalankan** — environment pengerjaan tidak punya Chrome/Lighthouse
      CLI. Checklist manual ada di
      `docs/superpowers/specs/2026-07-14-pwa-manual-verification-checklist.md` — perlu dijalankan manual
      sebelum item ini dianggap lolos kriteria penerimaan MVP. Lihat **PRD §16** dan **§10.4**.
- [x] **Input PPJ% di Settings** — selesai. Input "PPJ (%)" ditambahkan di `SettingsPanel.tsx` (validasi 0–10),
      terhubung ke field `ppjPercent` yang sudah ada di model data (`db.ts`) dan formula `calcDevice`. Lihat
      **PRD §7.4** dan model data **§9.2**.

  Spec & plan implementasi: `docs/superpowers/specs/2026-07-14-pwa-installability-offline-design.md` dan
  `docs/superpowers/plans/2026-07-14-pwa-installability-offline.md`.

## P1 — Fase 2 (kegunaan lebih)

- [x] **Export / Import JSON** — selesai. Tombol "Export Data"/"Import Data" di `SettingsPanel.tsx`,
      logic murni di `src/exportImport.ts` (validasi struktur + integritas referensial `roomId`↔`room.id`),
      import bersifat **replace-total** (transaksi Dexie atomik di `store.ts`) dengan konfirmasi sebelum
      menimpa data. Lihat **PRD §7.6** dan **§12** (tabel risiko).

  Spec & plan implementasi: `docs/superpowers/specs/2026-07-14-export-import-json-design.md` dan
  `docs/superpowers/plans/2026-07-14-export-import-json.md`.
- [ ] **Grafik / visualisasi ranking kontribusi biaya** — saat ini perangkat sudah terurut dari biaya
      tertinggi (teks), tapi belum ada representasi grafik/chart seperti disebut PRD. Lihat **PRD §6**
      (tabel prioritas fitur) dan **§14.2**.

## P2 — Fase 3+ (pengayaan)

- [x] **Dark mode** — selesai. Toggle 3-way Sistem/Terang/Gelap di `SettingsPanel.tsx` (`src/theme.ts`),
      persisten di `localStorage` (bukan tabel `Settings` Dexie, supaya tidak ikut ter-export/import/share).
      Tailwind class-based `dark:` variant (`@custom-variant dark` di `src/index.css`) diterapkan menyeluruh
      di seluruh dashboard dan modal. Lihat **PRD §6**.

  Spec & plan implementasi: `docs/superpowers/specs/2026-07-15-dark-mode-design.md` dan
  `docs/superpowers/plans/2026-07-15-dark-mode.md`.
- [ ] **Multi-profil rumah** — belum ada. Lihat **PRD §6** dan **§17** (roadmap Fase 3).
- [ ] **Tips hemat energi per perangkat** — belum ada. Lihat **PRD §6** dan **§17**.
- [ ] **Mode perbandingan "sebelum vs sesudah"** — belum ada. Lihat **PRD §17**.

## P4 — Opsional (di luar cakupan saat ini)

- [ ] **Backup/sync cloud** — sengaja belum dikerjakan; PRD mencatat ini akan mengubah arsitektur ke
      butuh backend/auth. Lihat **PRD §17** (Fase 4).

---

## Fitur baru — belum tercakup di PRD sama sekali

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

- [x] **Halaman/bagian Donasi** — selesai. Ditambahkan ke PRD sebagai **§19**. Titik akses: tautan
      "❤️ Traktir Kopi Pengembang" di footer dashboard (`src/App.tsx`), selalu terlihat. Modal
      (`src/components/DonationModal.tsx`) menampilkan daftar platform dari
      `src/donation.ts` (`DONATION_PLATFORMS`) — **saat ini kosong**, menampilkan empty
      state jujur sampai tautan/QR platform asli tersedia dan diisi ke array tersebut.

  Spec & plan implementasi: `docs/superpowers/specs/2026-07-15-donation-page-design.md` dan
  `docs/superpowers/plans/2026-07-15-donation-page.md`.

## Catatan: PRD belum mencerminkan fitur Ruangan yang sudah diimplementasikan

Di luar gap implementasi di atas, ada arah sebaliknya: kode sudah **lebih maju** dari PRD dan PRD perlu
diperbarui untuk mencerminkannya.

- [ ] PRD menaruh "Kategori/ruangan" di **Fase 3+ (P2)** (§6) dan mendeskripsikan dashboard sebagai daftar
      perangkat langsung tanpa ruangan (§14.1). Implementasi aktual menjadikan `Room` sebagai entitas wajib:
      setiap `Device` harus punya `roomId`, dan alur onboarding mengharuskan user membuat ruangan dulu
      sebelum bisa menambah perangkat (lihat `App.tsx`, empty state "Mulai dari ruangan").
- [ ] PRD perlu update di **§6** (pindahkan ruangan dari P2 ke P0), **§9.1** (tambahkan entitas `Room` +
      field `roomId` wajib di `Device`), dan **§14.1** (deskripsikan alur room-first).
