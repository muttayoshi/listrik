# Listrikku — Kalkulator Biaya Listrik Rumah

Progressive Web App (PWA) untuk menghitung estimasi biaya listrik bulanan rumah tangga berdasarkan daftar ruangan dan perangkat elektronik. Sepenuhnya **offline-first** dan **tanpa backend** — semua data tersimpan lokal di browser pengguna (IndexedDB), tanpa akun dan tanpa data yang dikirim ke server mana pun.

## Kegunaan

Tagihan listrik (atau saldo token) sering mengejutkan karena sulit tahu perangkat mana yang paling boros. Listrikku membantu pengguna:

- Mencatat perangkat elektronik per ruangan (nama, daya watt, jam pemakaian/hari, jumlah unit).
- Melihat estimasi konsumsi (kWh) dan biaya (Rupiah) harian & bulanan secara otomatis.
- Membandingkan tarif PLN untuk memilih golongan yang sesuai.
- Membawa/memindahkan data lewat backup file atau link berbagi, tanpa perlu server.

## Fitur yang Sudah Diimplementasikan

### Manajemen ruangan & perangkat
- CRUD ruangan (tambah/ubah/hapus) dengan preset ikon & nama ruangan umum (Ruang Tamu, Kamar Tidur, Dapur, dll).
- CRUD perangkat per ruangan: nama, watt, jam pemakaian/hari, jumlah unit.
- Menghapus ruangan otomatis menghapus seluruh perangkat di dalamnya.

### Kalkulasi biaya
- Rumus: `watt × jumlah × jam/hari ÷ 1000` → kWh harian, dikalikan hari/bulan → kWh bulanan, dikalikan tarif (+ PPJ%) → estimasi Rupiah/bulan.
- Kartu ringkasan (`SummaryCards`) menampilkan total estimasi biaya/bulan, konsumsi harian, dan konsumsi bulanan di seluruh rumah.
- Rincian per ruangan dan per perangkat (`RoomCard`, `DeviceCard`).

### Pengaturan (`SettingsPanel`)
- Preset tarif golongan PLN (subsidi 450/900 VA, R-1 1.300–2.200 VA, R-2/R-3, dll) atau input tarif manual per kWh.
- Konfigurasi hari per bulan (1–31) dan PPJ (Pajak Penerangan Jalan, 0–10%).

### Backup & pemulihan data
- Export seluruh data (ruangan, perangkat, pengaturan) ke file JSON dengan versi skema.
- Import file JSON dengan validasi struktur data sebelum menimpa data yang ada (dengan konfirmasi).

### Berbagi data (Share)
- Membuat link berbagi berisi data terkompresi (LZ-string, URL-encoded) di hash URL — tanpa server.
- Jika data terlalu besar untuk muat di URL, perangkat termurah (estimasi biaya bulanan terendah) otomatis dibuang satu per satu hingga link muat.
- Halaman `ShareView` menampilkan data yang diterima dari link berbagi (read-only), dengan opsi keluar kembali ke aplikasi utama.

### PWA & offline
- Installable ke home screen (mobile) atau desktop, dengan banner instalasi (`InstallBanner`) — termasuk instruksi khusus iOS.
- Service worker (auto-update) via `vite-plugin-pwa`, berjalan penuh offline setelah dibuka sekali.
- Data persisten di IndexedDB (Dexie) dengan permintaan `storage.persist()`.

### Lainnya
- Modal "Traktir Kopi Pengembang" — placeholder untuk tautan donasi (belum ada platform yang dikonfigurasi).

## Stack Teknis

- **React 19** + **Vite** + **TypeScript**
- **Tailwind CSS v4** (via plugin Vite, tanpa PostCSS)
- **Zustand** — state management (`src/store.ts`)
- **Dexie** — wrapper IndexedDB (`src/db.ts`)
- **lz-string** — kompresi payload untuk link berbagi
- **vite-plugin-pwa** — manifest & service worker

## Struktur Kode Kunci

| File | Peran |
|---|---|
| `src/App.tsx` | Komponen utama, routing modal, deteksi link berbagi |
| `src/store.ts` | State global (rooms, devices, settings) + operasi CRUD ke Dexie |
| `src/db.ts` | Skema Dexie, tipe data, preset tarif/ruangan, fungsi kalkulasi |
| `src/exportImport.ts` | Bangun & validasi payload backup JSON |
| `src/share.ts` | Kompresi/parsing payload untuk link berbagi |
| `src/components/` | UI: `RoomCard`, `DeviceCard`, `RoomForm`, `DeviceForm`, `SettingsPanel`, `SummaryCards`, `ShareModal`, `ShareView`, `InstallBanner`, `DonationModal` |

## Menjalankan Proyek

```bash
pnpm install
pnpm dev      # dev server di $PORT (default 8443)
pnpm build    # build produksi
pnpm preview  # preview hasil build
```

## Catatan

- Ini adalah **estimasi**, bukan tagihan resmi PLN.
- Data hanya tersimpan di browser — ganti browser atau bersihkan data situs akan menghilangkan data (gunakan fitur Export/Import untuk backup).
- Lihat `PRD-Kalkulator-Listrik-PWA.md` untuk spesifikasi produk lengkap dan `TODO-PRD-GAPS.md` untuk gap yang belum diimplementasikan.
