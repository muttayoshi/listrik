# PRD — Kalkulator Biaya Listrik Rumah (PWA)

**Nama kode produk:** ListrikKu (placeholder — bisa diganti)
**Jenis:** Progressive Web App (PWA), offline-first, tanpa backend
**Platform:** Mobile & Desktop (browser)
**Versi dokumen:** 1.0
**Tanggal:** 14 Juli 2026
**Status:** Draft untuk pengembangan MVP

---

## 1. Ringkasan Produk

ListrikKu adalah aplikasi web (PWA) yang membantu pengguna rumah tangga menghitung estimasi total pengeluaran listrik bulanan berdasarkan daftar perangkat elektronik di rumah. Pengguna cukup memasukkan nama barang, daya (watt), dan durasi pemakaian per hari; aplikasi otomatis menghitung konsumsi kWh dan biaya rupiah per perangkat serta totalnya.

Ciri utama produk:

- **Sepenuhnya lokal.** Semua data disimpan di browser pengguna (IndexedDB). Tidak ada akun, tidak ada server, tidak ada data yang dikirim keluar. Selama pengguna memakai browser yang sama di perangkat yang sama, datanya tetap ada.
- **Offline-first.** Setelah dibuka sekali, aplikasi berjalan penuh tanpa koneksi internet.
- **Installable.** Bisa dipasang ke home screen (mobile) atau desktop layaknya aplikasi native.
- **CRUD sederhana.** Tambah, ubah, dan hapus perangkat kapan saja, hasil hitungan langsung diperbarui.

---

## 2. Latar Belakang & Masalah

Tagihan listrik (atau saldo token yang cepat habis) sering mengejutkan pengguna karena mereka tidak punya gambaran perangkat mana yang paling boros dan berapa estimasi biaya bulanannya. Perhitungan manual (watt × jam × hari ÷ 1000 × tarif) merepotkan, apalagi jika perangkat banyak dan durasinya beda-beda.

Solusi yang ada umumnya berupa kalkulator satu-kali di halaman web (tidak menyimpan daftar), atau aplikasi native yang harus diinstal dari store. Peluangnya: kalkulator yang **menyimpan daftar perangkat secara persisten**, **jalan offline**, dan **tidak butuh install dari store maupun bikin akun**.

---

## 3. Tujuan & Sasaran

### 3.1 Tujuan produk
- Memberi estimasi biaya listrik bulanan yang cepat dan cukup akurat untuk kebutuhan rumah tangga.
- Membantu pengguna mengidentifikasi perangkat paling boros agar bisa mengambil keputusan hemat energi.
- Menghilangkan friksi: tanpa login, tanpa install store, tanpa koneksi.

### 3.2 Sasaran yang terukur (MVP)
- Pengguna bisa menambahkan perangkat pertama dan melihat estimasi biaya dalam **< 30 detik** sejak membuka aplikasi.
- Aplikasi lolos **Lighthouse PWA (installable + offline)**.
- **100% fungsi inti berjalan tanpa internet** setelah load pertama.
- Data bertahan setelah browser ditutup dan dibuka kembali (persistensi terverifikasi).

### 3.3 Non-goals (di luar cakupan, minimal untuk MVP)
- Sinkronisasi antar-perangkat / cloud backup (data hanya lokal per-browser).
- Akun pengguna / autentikasi.
- Pembayaran, top-up token, atau integrasi PLN resmi.
- Pembacaan otomatis meteran / IoT.
- Akurasi tingkat tagihan resmi (aplikasi memberi **estimasi**, bukan angka final PLN).

---

## 4. Target Pengguna

| Persona | Deskripsi | Kebutuhan utama |
|---|---|---|
| **Ibu/Bapak rumah tangga** | Ingin tahu perangkat mana yang bikin tagihan naik | Input cepat, hasil rupiah yang jelas |
| **Anak kos / penyewa** | Bayar listrik terpisah, ingin kontrol anggaran | Estimasi bulanan, bisa tambah/hapus perangkat |
| **Pengguna hemat energi** | Ingin membandingkan konsumsi antar perangkat | Ranking perangkat boros, kontribusi biaya |

**Asumsi konteks:** pasar Indonesia, mata uang Rupiah (IDR), tarif mengacu golongan PLN.

---

## 5. User Stories

**Manajemen perangkat**
- Sebagai pengguna, saya ingin menambahkan perangkat dengan nama, watt, dan jam pemakaian per hari, agar bisa dihitung biayanya.
- Sebagai pengguna, saya ingin mengubah data perangkat yang sudah ada, agar bisa mengoreksi kesalahan input.
- Sebagai pengguna, saya ingin menghapus perangkat, agar daftar tetap relevan.
- Sebagai pengguna, saya ingin mengatur jumlah unit perangkat identik (mis. 5 lampu), agar tidak perlu menambah satu per satu.

**Perhitungan & wawasan**
- Sebagai pengguna, saya ingin melihat total konsumsi (kWh) dan total biaya (Rp) per bulan, agar tahu estimasi pengeluaran.
- Sebagai pengguna, saya ingin melihat biaya per perangkat, agar tahu mana yang paling boros.

**Pengaturan tarif**
- Sebagai pengguna, saya ingin memilih golongan tarif PLN atau memasukkan tarif per kWh sendiri, agar hitungan sesuai kondisi rumah saya.

**Persistensi & offline**
- Sebagai pengguna, saya ingin data saya tetap tersimpan saat membuka aplikasi lagi di browser yang sama, tanpa login.
- Sebagai pengguna, saya ingin aplikasi tetap bisa dipakai tanpa internet.
- Sebagai pengguna, saya ingin memasang aplikasi ke home screen agar mudah diakses.

---

## 6. Ruang Lingkup & Prioritas

| Fitur | MVP (P0) | Fase 2 (P1) | Fase 3+ (P2) |
|---|:---:|:---:|:---:|
| Tambah/ubah/hapus perangkat | ✅ | | |
| Jumlah unit per perangkat | ✅ | | |
| Perhitungan kWh & biaya (harian/bulanan) | ✅ | | |
| Total keseluruhan (dashboard) | ✅ | | |
| Tarif per kWh manual | ✅ | | |
| Preset golongan tarif PLN | | ✅ | |
| Persistensi lokal (IndexedDB) | ✅ | | |
| PWA installable + offline | ✅ | | |
| Responsive mobile & desktop | ✅ | | |
| Export / Import data (JSON) | | ✅ | |
| PPJ (pajak) & hari/bulan yang dapat diatur | | ✅ | |
| Ranking perangkat boros / grafik kontribusi | | ✅ | |
| Kategori / ruangan | | | ✅ |
| Dark mode | | | ✅ |
| Multi-profil (beberapa rumah) | | | ✅ |
| Tips hemat per perangkat | | | ✅ |

---

## 7. Kebutuhan Fungsional

### 7.1 Manajemen perangkat (CRUD)
- **Create:** form dengan field: Nama (wajib), Daya/Watt (wajib, angka > 0), Durasi jam/hari (wajib, 0–24, boleh desimal mis. 0,5), Jumlah unit (opsional, default 1, ≥ 1).
- **Read:** daftar semua perangkat menampilkan nama, watt, jam/hari, unit, dan biaya bulanan per perangkat.
- **Update:** membuka form yang sama dengan nilai terisi; menyimpan memperbarui data & total.
- **Delete:** menghapus perangkat dengan konfirmasi singkat (mencegah kehilangan tak sengaja).
- Setiap perubahan langsung memicu **rekalkulasi total** secara reaktif.

### 7.2 Validasi input
- Watt & jam & unit: hanya angka positif; jam ≤ 24; tampilkan pesan error inline.
- Nama tidak boleh kosong; batasi panjang (mis. 50 karakter).
- Toleransi format lokal Indonesia untuk desimal (koma) di UI, tapi disimpan sebagai number.

### 7.3 Perhitungan biaya
Untuk tiap perangkat:
```
kWh_harian   = (watt × jumlah_unit × jam_per_hari) ÷ 1000
kWh_bulanan  = kWh_harian × hari_per_bulan          (default 30)
biaya_bulan  = kWh_bulanan × tarif_per_kWh × (1 + PPJ%)   (PPJ default 0)
```
Total dashboard = penjumlahan seluruh perangkat untuk kWh dan biaya (harian & bulanan).

### 7.4 Pengaturan (Settings)
- **Tarif per kWh** (angka, Rupiah) — bisa diisi manual.
- **Preset golongan PLN** (Fase 2) — memilih golongan otomatis mengisi tarif; tetap bisa di-override.
- **Hari per bulan** (Fase 2, default 30).
- **PPJ / pajak %** (Fase 2, default 0) — sebagian daerah mengenakan Pajak Penerangan Jalan.
- Pengaturan juga tersimpan lokal.

### 7.5 Dashboard / ringkasan
- Kartu ringkasan atas: **Total biaya/bulan**, **Total kWh/bulan** (opsional total/hari).
- Daftar perangkat di bawahnya, idealnya terurut dari biaya tertinggi (Fase 2).
- **Empty state** saat belum ada perangkat: ilustrasi + tombol "Tambah perangkat pertama".

### 7.6 Export / Import (Fase 2)
- Export seluruh data (perangkat + settings) ke file `.json`.
- Import dari file `.json` untuk memulihkan / memindahkan data ke perangkat lain.
- Ini adalah mitigasi utama risiko kehilangan data lokal (lihat §12).

---

## 8. Formula & Contoh Perhitungan

Menggunakan tarif contoh **R-1/1.300 VA = Rp1.444,70/kWh**, `hari_per_bulan = 30`, `PPJ = 0`:

| Perangkat | Watt | Unit | Jam/hari | kWh/hari | kWh/bulan | Biaya/bulan |
|---|---:|---:|---:|---:|---:|---:|
| Kulkas | 100 | 1 | 24 | 2,40 | 72,0 | Rp104.018 |
| AC 1 PK | 800 | 1 | 8 | 6,40 | 192,0 | Rp277.382 |
| Lampu LED | 10 | 5 | 12 | 0,60 | 18,0 | Rp26.005 |
| **Total** | | | | **9,40** | **282,0** | **Rp407.405** |

Contoh ini sebaiknya juga dimasukkan sebagai data seed opsional untuk demo, atau di dokumentasi/onboarding.

---

## 9. Model Data

Data disimpan lokal. Struktur logis:

### 9.1 Entitas `Device`
| Field | Tipe | Catatan |
|---|---|---|
| `id` | string (UUID) | primary key |
| `name` | string | wajib |
| `watt` | number | > 0 |
| `hoursPerDay` | number | 0–24, boleh desimal |
| `quantity` | number | default 1, ≥ 1 |
| `createdAt` | number (epoch ms) | |
| `updatedAt` | number (epoch ms) | |

### 9.2 Entitas `Settings` (single record)
| Field | Tipe | Default |
|---|---|---|
| `tariffPerKwh` | number | 1444.70 |
| `golonganId` | string \| null | null |
| `daysPerMonth` | number | 30 |
| `ppjPercent` | number | 0 |
| `currency` | string | "IDR" |

### 9.3 Nilai turunan (tidak disimpan, dihitung saat render)
`dailyKwh`, `monthlyKwh`, `monthlyCost` per perangkat, serta agregat total. Menyimpan hanya data mentah + settings menjaga sumber kebenaran tunggal dan menghindari data basi.

---

## 10. Kebutuhan PWA

### 10.1 Web App Manifest
- `name`, `short_name`, `description`
- `start_url: "/"`, `scope: "/"`
- `display: "standalone"`
- `theme_color`, `background_color`
- `icons`: minimal 192×192 dan 512×512 (PNG), plus `maskable` icon untuk Android
- `apple-touch-icon` untuk iOS

### 10.2 Service Worker
- Menggunakan strategi **precache app shell** (HTML/JS/CSS/ikon) → aplikasi bisa dibuka offline.
- **Cache-first** untuk aset statis; app ini tidak butuh data jaringan runtime sama sekali, jadi tidak ada dependensi API.
- Menangani update: tampilkan prompt "Versi baru tersedia — muat ulang" saat SW baru siap.
- Direkomendasikan memakai **Workbox** (via `vite-plugin-pwa`) agar tidak menulis SW manual.

### 10.3 Installability
- HTTPS wajib (hosting statis dengan TLS).
- Manifest + SW + ikon memenuhi kriteria install.
- Tangani event `beforeinstallprompt` untuk menampilkan tombol "Pasang aplikasi" kustom.
- **iOS/Safari:** dukungan PWA terbatas — tidak ada `beforeinstallprompt`; sediakan instruksi "Tambah ke Layar Utama" manual, dan set `apple-mobile-web-app-capable`.

### 10.4 Offline
- Seluruh alur (buka → tambah → hitung → simpan) berfungsi tanpa internet.
- Data pengguna hidup di IndexedDB, independen dari cache SW (menghapus cache SW tidak menghapus data pengguna).

---

## 11. Strategi Penyimpanan Lokal

**Rekomendasi: IndexedDB melalui wrapper ringan (Dexie.js atau `idb-keyval`).**

Alasan memilih IndexedDB dibanding `localStorage`:

- **Kapasitas & tipe data:** `localStorage` hanya string, sinkron, dan berbatas ~5 MB. IndexedDB menyimpan objek terstruktur, asinkron (tidak memblokir UI), dan kapasitas jauh lebih besar — aman jika daftar perangkat bertambah banyak atau nanti ada fitur multi-profil.
- **Ketahanan:** lebih cocok untuk data yang diperlakukan sebagai "database aplikasi", bukan sekadar preferensi.

Kompromi praktis:
- Untuk **MVP paling sederhana**, `localStorage` sebenarnya cukup karena volume data kecil. Jika ingin cepat, ini opsi valid.
- Namun karena arahnya offline-first dengan potensi ekspansi (kategori, multi-profil, export/import), **IndexedDB + Dexie** lebih tahan jangka panjang dan tetap ringkas ditulis.

Catatan penting yang harus dikomunikasikan ke pengguna:
- Data terikat pada **browser + perangkat + origin** tertentu. Ganti browser, ganti HP, atau bersihkan data situs → data hilang.
- Karena itu **Export/Import JSON (Fase 2)** penting sebagai jaring pengaman, dan sebaiknya ada catatan kecil di UI Settings yang menjelaskan sifat penyimpanan lokal ini.

---

## 12. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Pengguna clear browser data → data hilang | Kehilangan daftar perangkat | Export/Import JSON; notifikasi edukatif di Settings |
| Tarif PLN berubah tiap triwulan | Estimasi jadi kurang akurat | Tarif dapat diedit; preset golongan dapat diperbarui manual |
| iOS PWA terbatas | Pengalaman install kurang mulus | Instruksi manual "Add to Home Screen"; pastikan tetap jalan di Safari |
| Pengguna mengira ini tagihan resmi | Ekspektasi salah | Label jelas "estimasi", bukan tagihan resmi PLN |
| Storage di-evict browser saat memori penuh | Data hilang | Panggil `navigator.storage.persist()` untuk minta penyimpanan persisten |

---

## 13. Rekomendasi Tech Stack

Karena aplikasi ini murni client-side (tanpa backend, tanpa auth, tanpa payment), stack yang biasa dipakai (Next.js + Supabase + Midtrans) tidak diperlukan untuk MVP — cukup app statis.

| Lapisan | Rekomendasi | Alternatif |
|---|---|---|
| Build/framework | **Vite + React + TypeScript** | Next.js (static export) — jika ingin stack yang sudah familiar |
| PWA | **`vite-plugin-pwa`** (Workbox) | Manual SW + manifest |
| Penyimpanan | **Dexie.js** (IndexedDB) | `idb-keyval` / `localStorage` |
| State | **Zustand** (ringan) | React Context / `useState` |
| Styling | **Tailwind CSS** | CSS Modules |
| Format angka/mata uang | `Intl.NumberFormat("id-ID")` | library format |
| Hosting | Static host + HTTPS (Vercel/Netlify/Cloudflare Pages/self-host) | — |

Vite dipilih karena app ini tidak butuh SSR/rute server; Vite lebih ringkas dan cepat untuk SPA/PWA murni. Next.js tetap opsi solid jika prefer ekosistem yang sudah dikuasai.

---

## 14. UI/UX

### 14.1 Layar utama
1. **Dashboard** — kartu total (biaya/bulan & kWh/bulan) di atas, daftar perangkat di bawah, FAB/tombol "Tambah".
2. **Form Tambah/Edit perangkat** — modal (mobile: bottom sheet) berisi Nama, Watt, Jam/hari, Jumlah unit; tombol Simpan & Batal; tombol Hapus saat mode edit.
3. **Settings** — input tarif, (Fase 2: preset golongan, hari/bulan, PPJ, export/import), catatan penyimpanan lokal.
4. **Empty state** — ajakan menambah perangkat pertama.

### 14.2 Prinsip UX
- **Mobile-first**, responsif hingga desktop (layout melebar jadi grid pada layar lebar).
- Hasil hitungan **real-time** saat mengetik (opsional preview di form).
- Format Rupiah konsisten (`Rp` + pemisah ribuan Indonesia).
- Aksi hapus diberi konfirmasi ringan; sediakan undo bila memungkinkan.
- Sertakan **library preset watt umum** (kulkas, AC, TV, dst.) sebagai saran (Fase 2/3) untuk mempercepat input.

---

## 15. Kebutuhan Non-Fungsional

- **Performa:** first load ringan; interaksi instan (data lokal).
- **Offline:** fungsi inti 100% tanpa jaringan.
- **Responsif:** nyaman di layar ~320px hingga desktop.
- **Aksesibilitas:** label form, kontras memadai, target sentuh cukup besar, navigasi keyboard di desktop.
- **Privasi:** tidak ada pengumpulan data; semua tetap di perangkat. Nyatakan ini secara eksplisit di UI.
- **Kompatibilitas:** Chrome/Edge/Firefox/Safari versi modern (mobile & desktop), dengan catatan keterbatasan PWA iOS.
- **Integritas data:** tidak ada kehilangan data pada operasi CRUD normal; minta persistent storage.

---

## 16. Kriteria Penerimaan MVP

- [ ] Pengguna dapat menambah, mengubah, dan menghapus perangkat, dan total langsung diperbarui.
- [ ] Field jumlah unit berfungsi dan ikut terhitung.
- [ ] Perhitungan kWh & biaya bulanan sesuai formula pada §7.3 dan §8.
- [ ] Tarif per kWh dapat diubah dan memengaruhi seluruh hitungan.
- [ ] Data tetap ada setelah browser ditutup lalu dibuka lagi (browser & perangkat sama).
- [ ] Aplikasi dapat dipasang (installable) dan berjalan penuh offline setelah load pertama.
- [ ] Responsif di mobile dan desktop.
- [ ] Lolos audit Lighthouse PWA (installable + offline).

---

## 17. Roadmap Pengembangan

**Fase 0 — Setup**
Scaffold Vite + React + TS, Tailwind, Dexie, `vite-plugin-pwa` (manifest + SW), struktur folder, ikon.

**Fase 1 — MVP**
CRUD perangkat (termasuk unit), engine perhitungan, dashboard total, tarif manual, persistensi IndexedDB, PWA installable + offline, responsif, empty state, kriteria penerimaan §16.

**Fase 2 — Kegunaan lebih**
Preset golongan PLN (auto-isi tarif), hari/bulan & PPJ dapat diatur, export/import JSON, urutkan perangkat dari biaya tertinggi, grafik/kontribusi biaya, saran watt umum.

**Fase 3 — Pengayaan**
Kategori/ruangan, dark mode, multi-profil rumah, tips hemat per perangkat, mode perbandingan "sebelum vs sesudah".

**Fase 4 — Opsional**
Backup/sync cloud (jika suatu saat diperlukan — akan mengubah arsitektur menjadi butuh backend/auth), fitur berbagi ringkasan.

---

## 18. Lampiran — Tarif Referensi PLN (Q2 2026, non-subsidi)

Nilai default & preset yang disarankan (dapat diperbarui, karena tarif dievaluasi tiap triwulan berdasarkan Permen ESDM No. 7/2024):

| Golongan | Daya | Tarif per kWh |
|---|---|---:|
| R-1/TR | 900 VA (RTM/non-subsidi) | Rp1.352,00 |
| R-1/TR | 1.300 VA | Rp1.444,70 |
| R-1/TR | 2.200 VA | Rp1.444,70 |
| R-2/TR | 3.500–5.500 VA | Rp1.699,53 |
| R-3/TR | 6.600 VA ke atas | Rp1.699,53 |
| R-1/TR | 450 VA (subsidi) | Rp415,00 |
| R-1/TR | 900 VA (subsidi) | Rp605,00 |

> Catatan: tarif dapat berubah tiap triwulan. Aplikasi harus mengizinkan pengguna mengedit/override nilai ini, dan preset di atas sebaiknya mudah diperbarui saat ada penyesuaian tarif baru.

---

## 19. Donasi

Fitur dukungan sukarela bagi pengguna yang ingin memberi apresiasi ke pembuat aplikasi.

- **Titik akses:** tautan kecil "❤️ Traktir Kopi Pengembang" di footer dashboard (selalu terlihat,
  baik saat ada ruangan maupun saat empty state), dan tombol dengan teks sama di dalam panel
  Settings (`SettingsPanel.tsx`) — dua jalur ke modal yang sama.
- **Bentuk:** modal statis di dalam aplikasi, dua langkah. Langkah 1 menampilkan menu 3
  pilihan kopi ("Kopi Tuku – Kopi Susu Tetangga", "Kopi Family Mart – Kopi Susu Keluarga",
  "Point Coffee – Himalayan Butterscotch"), masing-masing dengan ikon, nama, dan harga.
  Memilih salah satu membuka langkah 2: ringkasan kopi terpilih dan area kode QRIS untuk
  discan manual. Konsisten dengan pola modal lain di aplikasi ini (Settings, Tambah Ruangan,
  dst.) — tidak ada halaman/route baru.
- **Bukan proses pembayaran in-app.** Aplikasi tidak memproses, menyimpan, atau meneruskan
  data pembayaran apa pun. Modal hanya menautkan keluar ke platform pihak ketiga (mis.
  Saweria, Trakteer, QRIS) yang dikelola pengguna sendiri di luar aplikasi ini — selaras
  dengan prinsip "sepenuhnya lokal, tanpa server" di **§1** dan **§11**.
- **Klarifikasi terhadap non-goal §3.3:** non-goal "Pembayaran, top-up token" pada §3.3
  merujuk pada transaksi listrik/PLN (mis. beli token listrik dalam aplikasi), **bukan**
  donasi dukungan ke pembuat aplikasi. Kedua hal ini berbeda konteks dan tidak saling
  bertentangan.
- **Status QRIS:** belum ada gambar QRIS asli dari pemilik aplikasi. Langkah 2 menampilkan
  placeholder jujur (ikon bingkai QR bergaya outline + teks "QRIS belum tersedia — pemilik
  aplikasi belum menambahkan kode QRIS asli") alih-alih gambar yang bisa disalahartikan
  sebagai kode scan sungguhan. Menambahkan QRIS asli nanti adalah perubahan konten kecil
  (satu file gambar + satu swap JSX), bukan perubahan arsitektur.

---

## 20. Fitur Share (Bagikan Data)

Fitur yang memungkinkan pengguna membuat link berisi seluruh data (ruangan + perangkat +
pengaturan) miliknya, untuk dibagikan ke siapa pun lewat kanal apa pun (WhatsApp, email, dst.)
yang mereka pilih sendiri.

- **Mekanisme — tanpa backend.** Seluruh payload (format sama dengan Export/Import JSON §7.6)
  di-serialize ke JSON, dikompresi (`lz-string`), dan ditaruh di **hash fragment URL**
  (`#share=<data-terkompresi>`), bukan query param — supaya tidak pernah singgah di log server
  mana pun, termasuk hosting statis sekalipun. Tidak ada server yang menyimpan atau memproses
  data ini kapan pun; link hanya wadah data yang dipindahkan lewat kanal pilihan pengguna sendiri.
- **Klarifikasi terhadap non-goal §3.3:** non-goal "Sinkronisasi antar-perangkat / cloud backup"
  merujuk pada aplikasi yang **secara otomatis** menjaga data tetap sinkron antar-perangkat lewat
  infrastrukturnya sendiri. Fitur ini berbeda: satu link statis, dibuat manual oleh pengguna,
  sekali pakai, tanpa koneksi berkelanjutan apa pun ke aplikasi — jadi tidak bertentangan dengan
  non-goal tersebut, juga tidak dengan prinsip "sepenuhnya lokal, tanpa server" di **§1** dan
  **§11**.
- **Pratinjau read-only, import bersifat opsional.** Membuka link share **tidak pernah**
  mengubah data lokal penerima secara diam-diam. Penerima selalu melihat pratinjau (ruangan,
  perangkat, hasil hitungan) lebih dulu; hanya jika penerima menekan tombol eksplisit
  **"Import ke Perangkat Ini"**, data itu ditulis ke IndexedDB miliknya — memakai mekanisme
  replace-total yang sama dengan Import JSON (§7.6), termasuk konfirmasi sebelum menimpa.
- **Penanganan data yang terlalu besar.** Jika hasil kompresi melebihi ambang aman (4.000
  karakter), aplikasi **memotong perangkat, bukan string mentah** — perangkat dengan kontribusi
  biaya bulanan paling kecil dibuang lebih dulu, satu per satu, sampai link muat. Ruangan yang
  jadi kosong ikut dibuang. Pengguna diberi tahu berapa perangkat yang tidak disertakan sebelum
  membagikan link tersebut.
