# YM-W HAIRCUT

Aplikasi web final lokal untuk POS YM-W HAIRCUT dengan tiga role:

- Kasir: dashboard, POS split view, keranjang, dan pembayaran.
- Admin: dashboard desktop dengan sidebar, KPI, chart, dan tabel transaksi.
- Pelanggan: booking mobile berbentuk wizard 4 langkah.

## Cara Menjalankan

Buka file `index.html` di browser.

Tidak perlu `npm install` atau build step. Aplikasi dibuat dengan HTML, CSS, dan JavaScript murni.

Data akun, transaksi, booking, dan sesi login disimpan di `localStorage` browser. Data tetap ada setelah refresh selama storage browser tidak dihapus.

## File

- `index.html` - entry point aplikasi.
- `config.js` - konfigurasi nama outlet dan koneksi Supabase.
- `styles.css` - design system, responsive layout, komponen, animasi.
- `app.js` - state, render UI, alur transaksi, pembayaran, dan booking.
- `manifest.webmanifest`, `sw.js`, `icon.svg` - file PWA untuk install app dari browser saat online.
- `supabase-schema.sql` - struktur database online.
- `ONLINE_DEPLOY.md` - panduan upload ke hosting dan sambung Supabase.

## Akun Demo

- Kasir: `Sari Wulandari` / PIN `1234`
- Admin: `Budi Santoso` / PIN `1111`

## Versi Online

Baca `ONLINE_DEPLOY.md`. Setelah `config.js` diisi dengan Supabase URL dan anon key, aplikasi akan mencoba sinkron data online. Jika koneksi/database gagal, aplikasi tetap menyimpan data lokal.
