# Mobile FAB Speed Dial — Design

**Tanggal:** 16 Juli 2026
**Status:** Disetujui, siap masuk tahap plan implementasi

## 1. Ringkasan

Floating action button (FAB) mobile-only di `src/App.tsx` saat ini selalu berlabel "+ Tambah
Ruangan" dan langsung membuka `RoomForm`. Diubah menjadi tombol ikon "+" saja yang, saat di-tap,
mekar (expand) menjadi speed dial vertikal berisi dua pilihan: **Tambah Perangkat** dan **Tambah
Ruangan**.

Scope: hanya `src/App.tsx`. Tidak ada perubahan pada `RoomForm.tsx`/`DeviceForm.tsx` — keduanya
tetap dipakai apa adanya, cuma dipicu dari entry point baru. Tampilan desktop (tombol inline
"Tambah Ruangan" di bawah daftar ruangan) tidak berubah sama sekali.

## 2. State

Tambah satu state boolean baru di `App()`: `const [fabOpen, setFabOpen] = useState(false)`.

- Direset ke `false` setiap kali salah satu opsi dipilih (sebelum membuka modal terkait) atau
  backdrop/tombol utama di-tap saat sedang terbuka.
- Tidak perlu disimpan/persisten — cukup state lokal komponen, hilang saat FAB ditutup atau
  komponen re-render karena alasan lain (mis. modal lain terbuka).

## 3. Struktur & interaksi

Blok FAB (`{rooms.length > 0 && (...)}"`, tetap dengan guard yang sama — tidak tampil saat
`rooms.length === 0`, karena empty state punya tombol besarnya sendiri) diubah dari satu `<button>`
menjadi:

1. **Backdrop transparan** — hanya render saat `fabOpen === true`. `fixed inset-0 z-20` tanpa
   warna/blur (beda dengan overlay modal biasa yang pakai `bg-black/40 backdrop-blur-sm`), `onClick`
   menutup speed dial (`setFabOpen(false)`). Ditempatkan di belakang (z-index lebih rendah dari)
   tombol-tombol speed dial tapi di depan konten halaman, supaya tap di luar area FAB menutupnya
   tanpa menggelapkan layar.
2. **Dua mini-tombol pil**, hanya render saat `fabOpen === true`, ditempatkan `absolute` relatif ke
   container FAB, muncul vertikal di atas tombol utama dengan jarak bertingkat:
   - **Tambah Perangkat** — posisi paling dekat ke tombol utama (aksi lebih sering dipakai).
     `onClick`: `setFabOpen(false); setModal({ type: 'addDevice', roomId: rooms[0].id })`.
   - **Tambah Ruangan** — posisi paling atas/jauh dari tombol utama.
     `onClick`: `setFabOpen(false); setModal({ type: 'addRoom' })`.
   - Styling: pil kecil, background putih/kartu (`bg-white dark:bg-emerald-950`), teks + ikon "+"
     kecil, shadow (`shadow-lg`), konsisten dengan warna teks/border yang sudah dipakai di komponen
     lain (`text-gray-700 dark:text-gray-300` untuk label, ikon "+" mewarisi warna teks).
3. **Tombol utama** — tetap gradient hijau bulat (`linear-gradient(135deg, #059669, #047857)`),
   sekarang ikon-only (tanpa label teks "Tambah Ruangan"). `onClick`: toggle `setFabOpen((o) => !o)`.
   Ikon "+" di-rotate 45° jadi bentuk "×" saat `fabOpen === true` (`transition-transform` pada
   elemen svg, `className` kondisional `rotate-45` saat terbuka).

Posisi visual diatur lewat `absolute` positioning (bukan urutan JSX) relatif ke container FAB yang
sudah ada (`fixed bottom-6 right-4 sm:hidden z-30`): mini-tombol "Tambah Ruangan" diberi offset
`bottom` terbesar (paling atas/jauh), "Tambah Perangkat" offset `bottom` lebih kecil (paling dekat
ke tombol utama). Backdrop dikecualikan dari `sm:hidden` karena hanya pernah dirender saat FAB
mobile terbuka (state `fabOpen` cuma relevan di konteks tombol yang memang mobile-only), jadi
otomatis tidak pernah muncul di desktop.

## 4. Aksi "Tambah Perangkat" dari FAB global

Tidak ada perubahan pada `DeviceForm.tsx` atau tipe `Modal`. FAB global membuka `DeviceForm` yang
sama persis dengan yang dipakai di tempat lain, dengan `roomId: rooms[0].id` (ruangan pertama sesuai
urutan `rooms`, yang sudah terurut oleh `order` — lihat `store.ts` `load()`) sebagai default room
yang terpilih. `DeviceForm` sudah punya pemilih ruangan (room-chip selector) di dalam form sendiri,
jadi user bisa mengganti ke ruangan lain sebelum menyimpan — perilaku ini sudah ada, tidak perlu
kode baru.

Catatan: `rooms[0]` selalu ada di titik ini karena blok FAB hanya di-render saat `rooms.length > 0`
(guard yang sudah ada, tidak diubah).

## 5. Animasi & transisi

Pakai Tailwind transition utilities yang sudah jadi pola di codebase ini (mis. `transition-transform
duration-200` pada chevron `RoomCard`), tidak menambah library animasi baru:
- Mini-tombol: `transition-all duration-200`, fade + slide kecil (opacity 0→1, translate-y kecil)
  saat muncul/hilang berdasarkan `fabOpen`.
- Ikon FAB utama: `transition-transform duration-200`, rotate 0→45deg.

## 6. Dark mode

Mini-tombol pil mengikuti family warna yang sudah dipakai di seluruh app (dari fitur dark mode
sebelumnya): `bg-white dark:bg-emerald-950`, `text-gray-700 dark:text-gray-300`, `shadow-lg`.
Backdrop transparan tidak butuh varian dark (tidak berwarna). Tombol utama (gradient hijau) tidak
berubah di kedua tema, konsisten dengan semua tombol gradient lain di app.

## 7. Testing (manual — proyek ini tidak punya test suite otomatis)

- Tap "+" → berubah jadi "×", dua mini-tombol muncul dengan animasi halus.
- Tap "Tambah Perangkat" → `DeviceForm` terbuka dengan ruangan pertama terpilih, speed dial
  tertutup.
- Tap "Tambah Ruangan" → `RoomForm` (mode tambah) terbuka, speed dial tertutup.
- Tap di luar area FAB (backdrop) saat terbuka → speed dial tertutup, tidak ada modal yang terbuka.
- Tap tombol utama lagi saat terbuka → speed dial tertutup.
- Cek di halaman dengan 1 ruangan dan dengan banyak ruangan — "Tambah Perangkat" tetap konsisten
  default ke ruangan pertama.
- Cek tampilan gelap & terang.
- Cek desktop tidak terpengaruh sama sekali (FAB tetap `sm:hidden`).
- `pnpm build` lolos tanpa error TypeScript.

## 8. Di luar cakupan

- Tidak mengubah `RoomForm.tsx` atau `DeviceForm.tsx`.
- Tidak mengubah tombol inline desktop "Tambah Ruangan" di bawah daftar ruangan.
- Tidak menambah opsi ketiga atau lebih ke speed dial.
