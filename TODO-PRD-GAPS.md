# TODO — Gap Implementasi vs PRD

Dokumen ini adalah ringkasan poin-poin yang **belum diimplementasikan** (atau belum lengkap) dibanding
[`PRD-Kalkulator-Listrik-PWA.md`](./PRD-Kalkulator-Listrik-PWA.md). Setiap poin mereferensikan nomor bagian
PRD — baca bagian tersebut untuk detail requirement, formula, dan alasan di baliknya sebelum mengerjakan.

Status implementasi lain (sudah sesuai/melebihi PRD) tidak diulang di sini — fokus dokumen ini murni pada gap.

---

## P0 — MVP, belum lolos kriteria penerimaan (PRD §16)

- [ ] **PWA Web App Manifest** — belum ada `manifest.json`, ikon 192×192/512×512, ikon `maskable`, atau
      `apple-touch-icon`. Lihat **PRD §10.1** untuk field yang wajib ada.
- [ ] **Service Worker** — belum ada precache app-shell / strategi cache-first. Rekomendasi PRD: pakai
      `vite-plugin-pwa` (Workbox) alih-alih SW manual. Lihat **PRD §10.2**.
- [ ] **Installability** — belum ada handler `beforeinstallprompt` (tombol "Pasang aplikasi") maupun instruksi
      manual "Add to Home Screen" untuk iOS/Safari. Lihat **PRD §10.3**.
- [ ] **Verifikasi offline & audit Lighthouse PWA** — belum bisa diverifikasi karena manifest & SW di atas
      belum ada; ini salah satu item kriteria penerimaan MVP. Lihat **PRD §16** (checklist penuh) dan **§10.4**.
- [ ] **Input PPJ% di Settings** — field `ppjPercent` sudah ada di model data (`db.ts`) dan sudah dipakai di
      formula `calcDevice`, tapi `SettingsPanel.tsx` belum punya input untuk mengubahnya dari UI. Lihat
      **PRD §7.4** dan model data **§9.2**.

## P1 — Fase 2 (kegunaan lebih)

- [ ] **Export / Import JSON** — belum ada. Ini juga mitigasi risiko utama kehilangan data lokal. Lihat
      **PRD §7.6** dan **§12** (tabel risiko).
- [ ] **Grafik / visualisasi ranking kontribusi biaya** — saat ini perangkat sudah terurut dari biaya
      tertinggi (teks), tapi belum ada representasi grafik/chart seperti disebut PRD. Lihat **PRD §6**
      (tabel prioritas fitur) dan **§14.2**.

## P2 — Fase 3+ (pengayaan)

- [ ] **Dark mode** — belum ada. Lihat **PRD §6**.
- [ ] **Multi-profil rumah** — belum ada. Lihat **PRD §6** dan **§17** (roadmap Fase 3).
- [ ] **Tips hemat energi per perangkat** — belum ada. Lihat **PRD §6** dan **§17**.
- [ ] **Mode perbandingan "sebelum vs sesudah"** — belum ada. Lihat **PRD §17**.

## P4 — Opsional (di luar cakupan saat ini)

- [ ] **Backup/sync cloud** — sengaja belum dikerjakan; PRD mencatat ini akan mengubah arsitektur ke
      butuh backend/auth. Lihat **PRD §17** (Fase 4).

---

## Fitur baru — belum tercakup di PRD sama sekali

- [ ] **Tombol Share (bagikan link berisi data)** — saat menekan tombol share, aplikasi membuat sebuah link
      yang jika dibuka orang lain, langsung menampilkan seluruh data (ruangan + perangkat + hasil hitungan)
      yang sudah dibuat, tanpa perlu input ulang.
      - Ini fitur baru, **belum ada di PRD manapun** (bukan P0/P1/P2) — perlu ditambahkan dulu ke PRD
        sebelum dikerjakan, karena berpotongan langsung dengan prinsip arsitektur inti di **PRD §1 dan §11**
        ("Sepenuhnya lokal... tidak ada server, tidak ada data yang dikirim keluar") dan non-goal di **§3.3**
        ("Sinkronisasi antar-perangkat / cloud backup").
      - Keputusan desain yang perlu diambil sebelum implementasi:
        - **Tanpa backend** (selaras §1/§11): encode seluruh data jadi string terkompresi di URL
          (query param/hash), halaman "view" membaca & render langsung dari URL tanpa butuh menyimpan ke
          IndexedDB penerima. Risiko: URL bisa sangat panjang kalau data (ruangan/perangkat) banyak — perlu
          strategi kompresi (mis. `lz-string`) dan batas ukuran wajar.
        - **Dengan backend ringan** (menyimpang dari §1/§11): data disimpan di server, link hanya berisi ID
          referensi. Lebih ringkas & tidak ada batas panjang URL, tapi mengubah "tanpa backend, offline-first"
          jadi asumsi produk yang harus direvisi total di PRD (§1, §11, §13 tech stack).
      - Perlu didefinisikan juga: apakah halaman hasil share **read-only** (sekadar dilihat), atau penerima
        bisa **import** data itu ke local storage miliknya sendiri (hubungannya dengan fitur Export/Import
        JSON Fase 2 di **PRD §7.6** — kemungkinan bisa reuse mekanisme yang sama).

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

## Catatan: PRD belum mencerminkan fitur Ruangan yang sudah diimplementasikan

Di luar gap implementasi di atas, ada arah sebaliknya: kode sudah **lebih maju** dari PRD dan PRD perlu
diperbarui untuk mencerminkannya.

- [ ] PRD menaruh "Kategori/ruangan" di **Fase 3+ (P2)** (§6) dan mendeskripsikan dashboard sebagai daftar
      perangkat langsung tanpa ruangan (§14.1). Implementasi aktual menjadikan `Room` sebagai entitas wajib:
      setiap `Device` harus punya `roomId`, dan alur onboarding mengharuskan user membuat ruangan dulu
      sebelum bisa menambah perangkat (lihat `App.tsx`, empty state "Mulai dari ruangan").
- [ ] PRD perlu update di **§6** (pindahkan ruangan dari P2 ke P0), **§9.1** (tambahkan entitas `Room` +
      field `roomId` wajib di `Device`), dan **§14.1** (deskripsikan alur room-first).
