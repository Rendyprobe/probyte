# ProByte

ProByte adalah storefront digital untuk menjual akun aplikasi premium secara cepat, terstruktur, dan aman. Aplikasi ini mencakup katalog produk, checkout, invoice, pengiriman akun otomatis setelah pembayaran berhasil, serta panel admin untuk mengelola produk, varian, stok, pesanan, saldo, dan audit operasional.

## Fitur Utama

- Katalog produk dengan pencarian, filter kategori, detail produk, dan halaman SEO produk.
- Checkout tanpa login dengan invoice dan pengecekan transaksi.
- Integrasi pembayaran Xendit untuk invoice dan top up saldo.
- Delivery akun otomatis setelah pembayaran tervalidasi.
- Manajemen stok akun dengan alokasi atomic agar stok tidak oversold.
- Panel admin untuk produk, varian, stok, order, saldo, refund garansi, dan kontrol operasional.
- Penyimpanan kredensial akun produk dengan enkripsi server-side.
- Rate limit, validasi webhook Xendit, audit log, dan token invoice untuk data sensitif.

## Tech Stack

- React 19
- Vite 7
- TypeScript
- Supabase
- Xendit
- Node.js dengan `tsx` untuk backend lokal

## Prasyarat

- Node.js 20 atau lebih baru
- npm
- Project Supabase aktif
- Akun Xendit untuk mode pembayaran gateway

## Setup Lokal

1. Install dependency.

   ```bash
   npm ci
   ```

2. Salin environment example.

   ```bash
   cp .env.example .env
   ```

3. Isi nilai environment utama:

   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `XENDIT_SECRET_KEY`
   - `XENDIT_WEBHOOK_TOKEN`
   - `ACCOUNT_ENCRYPTION_KEY`
   - `ADMIN_SESSION_SECRET`
   - `PUBLIC_APP_URL`
   - `CORS_ORIGIN`

4. Terapkan migration Supabase dari folder `supabase/migrations`, lalu jalankan seed data dari `supabase/seed.sql` jika dibutuhkan.

5. Jalankan backend dan frontend.

   ```bash
   npm run api:dev
   npm run dev
   ```

Frontend lokal berjalan di `http://localhost:5173`, sedangkan API lokal berjalan di `http://localhost:8787`.

## Script

- `npm run dev` - menjalankan Vite frontend.
- `npm run api:dev` - menjalankan backend API dengan watch mode.
- `npm run api:start` - menjalankan backend API tanpa watch mode.
- `npm run admin:create` - membuat akun admin.
- `npm run stock:seed-demo` - mengisi stok demo.
- `npm run typecheck` - menjalankan TypeScript check.
- `npm test` - menjalankan test.
- `npm run build` - menjalankan typecheck dan build produksi.
- `npm run preview` - menjalankan preview build Vite.

## Struktur Proyek

```text
src/                 Frontend React
server/              Backend API dan service server-side
supabase/            Schema, migration, dan seed database
docs/                Dokumentasi setup, deployment, Supabase, dan Xendit
tests/               Test aplikasi
public/              Asset publik
```

## Dokumentasi Tambahan

- `docs/setup.md` - langkah setup lokal dan production notes.
- `docs/deployment.md` - catatan deployment, domain, Cloudflare, dan CORS.
- `docs/supabase.md` - migration, seed, dan catatan keamanan Supabase.
- `docs/xendit.md` - environment dan webhook Xendit.
- `PRD.md` - product requirements.
- `SRS.md` - software requirements.

## Keamanan

Jangan commit file `.env` atau secret produksi. Secret seperti `SUPABASE_SERVICE_ROLE_KEY`, `XENDIT_SECRET_KEY`, `XENDIT_WEBHOOK_TOKEN`, `ACCOUNT_ENCRYPTION_KEY`, dan `ADMIN_SESSION_SECRET` harus tetap server-only dan tidak boleh memakai prefix `VITE_`.

Untuk produksi, pastikan `VITE_DEMO_MODE=false`, webhook Xendit memakai token callback yang benar, dan semua origin publik (`PUBLIC_APP_URL`, `VITE_APP_PUBLIC_URL`, `CORS_ORIGIN`, `VITE_API_BASE_URL`) sesuai domain deployment.
