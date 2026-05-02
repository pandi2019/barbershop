# Deploy Online YM-W HAIRCUT

Versi ini bisa di-hosting sebagai web app/PWA. Untuk multi-device, sambungkan ke Supabase.

## 1. Hosting Frontend

Upload semua file ini ke hosting static seperti Netlify, Vercel, Cloudflare Pages, atau hosting biasa:

- `index.html`
- `styles.css`
- `app.js`
- `config.js`
- `manifest.webmanifest`
- `sw.js`
- `icon.svg`

Setelah online, buka URL aplikasinya dari tablet/HP/laptop.

## 2. Database Supabase

1. Buat project Supabase.
2. Buka SQL Editor.
3. Jalankan isi file `supabase-schema.sql`.
4. Ambil Project URL dan anon public key.
5. Isi `config.js`:

```js
window.YMW_CONFIG = {
  appName: "YM-W HAIRCUT",
  outletName: "YM-W HAIRCUT Cabang Utama",
  supabaseUrl: "https://PROJECT.supabase.co",
  supabaseAnonKey: "ANON_PUBLIC_KEY"
};
```

## 3. Catatan Produksi

Untuk produksi serius, PIN sebaiknya diganti Supabase Auth atau backend sendiri agar credential tidak disimpan sebagai teks biasa. QRIS asli juga perlu gateway seperti Midtrans, Xendit, DOKU, atau provider bank.
