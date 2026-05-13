# PRD ProByte

## 1. Ringkasan Produk
ProByte adalah toko digital untuk menjual akun aplikasi premium yang legal dan terotorisasi, seperti Netflix, Spotify, Canva, Bstation, Grok, Viu, CapCut, Duolingo, YouTube, Vidio, Scribd, iQIYI, dan GetContact.

Produk dikirim sebagai kredensial akun, yaitu email dan password, setelah pembayaran berhasil. Karena produk berupa kredensial, ProByte wajib menerapkan penyimpanan terenkripsi, masking data sensitif, audit log, dan prosedur penggantian akun jika terjadi masalah.

## 2. Tujuan
- Menyediakan storefront yang cepat, rapi, dan mudah dipakai untuk membeli akun premium.
- Menampilkan stok akun secara jelas sebelum checkout.
- Menerima pembayaran melalui Xendit.
- Mengirim akun otomatis setelah pembayaran berhasil.
- Memberikan halaman invoice dan cek transaksi.
- Menyediakan admin panel untuk kelola produk, varian, stok akun, pesanan, dan status transaksi.

## 3. Non-Goals MVP
- Tidak membangun marketplace multi-seller.
- Tidak membangun aplikasi mobile native.
- Tidak membangun sistem referral/affiliate.
- Tidak membangun loyalty point.
- Tidak memakai logo, aset, warna brand, atau copywriting situs referensi secara literal.
- Tidak menyimpan akun premium secara plaintext di produksi.

## 4. Target Pengguna
- Pembeli yang ingin mendapatkan akun premium secara cepat.
- Pembeli repeat order yang ingin cek transaksi dan bukti pembelian.
- Admin ProByte yang mengelola stok akun dan order.
- Admin yang menangani penggantian akun, refund saldo, atau order bermasalah.

## 5. Kategori Produk
- Streaming: Netflix, Viu, Vidio, iQIYI, Bstation.
- Music: Spotify.
- Productivity: Canva, Scribd.
- AI: Grok.
- Editing: CapCut.
- Learning: Duolingo.
- Video Platform: YouTube Premium.
- Utility: GetContact.

## 6. MVP Scope
- Beranda dengan katalog produk.
- Pencarian produk.
- Filter kategori.
- Detail produk dan varian.
- Sistem stok akun.
- Checkout tanpa login.
- Payment method Xendit.
- Invoice.
- Cek transaksi.
- Auto delivery akun setelah pembayaran sukses.
- Admin panel dasar.
- Halaman syarat dan kebijakan.
- Saldo pelanggan untuk top up, pembayaran, dan refund garansi.
- Voucher atau kode promo.
- Backend API produksi untuk checkout, invoice, saldo, admin, stok, Xendit webhook, dan garansi.
- Rate limit untuk endpoint publik dan admin.
- Token invoice agar detail akun tidak bisa ditebak hanya dari nomor invoice.

## 7. Phase 2
- Login user.
- Riwayat pembelian per akun user.
- Dashboard pelanggan untuk melihat akun yang pernah dibeli dan riwayat saldo.
- Leaderboard pembelian.
- Export laporan transaksi.
- Analytics admin: omzet harian, produk laris, stok menipis, dan conversion checkout.
- Restock alert ke email admin.
- SEO page per produk.
- Sitemap, robots.txt, canonical URL, dan metadata Open Graph.

## 8. Phase 3
- Supplier/restock workflow.
- Analytics dashboard.
- Sistem replacement otomatis.
- Integrasi chat admin.

## 9. User Journey Utama
1. User membuka ProByte.
2. User mencari produk, misalnya Netflix.
3. User memilih varian, misalnya Netflix Premium 1 Bulan.
4. Sistem menampilkan harga dan stok tersedia.
5. User mengisi nomor WhatsApp dan email opsional.
6. User memilih pembayaran Xendit.
7. User dapat memakai voucher/kode promo jika valid.
8. Sistem membuat invoice dan payment request.
9. User membayar via Xendit atau saldo akun jika saldo cukup.
10. Xendit mengirim callback ke backend ProByte jika memakai payment gateway.
11. Backend memverifikasi `x-callback-token` dari Xendit.
12. Backend menolak webhook duplikat memakai `webhook-id` Xendit secara idempotent.
13. Sistem mengubah status pembayaran menjadi `PAID`.
14. Sistem mengambil stok akun `AVAILABLE` dengan locking atomic.
15. Sistem mengirim email dan password akun ke invoice pembeli.
16. Stok berubah menjadi `DELIVERED`.

## 10. Admin Journey Utama
1. Admin login ke dashboard memakai username dan password.
2. Admin membuat produk dan varian.
3. Admin menambahkan stok akun berisi email dan password.
4. Admin melihat stok tersedia, terjual, dan bermasalah.
5. Admin memantau order.
6. Admin dapat memproses komplain garansi via chat berdasarkan invoice.
7. Admin dapat mengembalikan dana komplain dalam bentuk saldo pelanggan.
8. Semua aksi sensitif masuk audit log.

## 10.1 Garansi & Saldo
- Klaim garansi tidak memakai upload bukti di web.
- Pelanggan menghubungi admin lewat chat dan mengirim nomor invoice.
- Admin memverifikasi invoice, status pembayaran, dan masalah akun.
- Jika klaim disetujui, admin melakukan refund ke saldo pelanggan.
- Saldo dapat digunakan untuk pembelian berikutnya atau ditambah lewat payment gateway.
- Saldo dihitung dari ledger immutable, bukan angka saldo yang diedit langsung.
- Pembayaran saldo dan reservasi stok wajib terjadi dalam satu transaksi database.

## 10.2 Security & Operasional Produksi
- Semua secret server seperti `XENDIT_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ACCOUNT_ENCRYPTION_KEY`, dan `ADMIN_SESSION_SECRET` hanya boleh ada di server.
- Frontend hanya boleh memakai Supabase publishable key dan public URL.
- Admin login harus lewat backend dan menghasilkan session token bertanda tangan.
- Password admin wajib memakai hash satu arah.
- Kredensial akun produk wajib dienkripsi sebelum disimpan ke database.
- Webhook Xendit wajib memverifikasi `x-callback-token` dan `webhook-id`.
- Endpoint checkout, invoice, login admin, dan warranty claim wajib rate limited.
- Sistem tidak boleh menyimpan kredensial akun produk di localStorage pada mode produksi.

## 11. Branding
Nama toko: ProByte.

Logo awal: simbol huruf `PB` dengan bentuk byte/kapsul digital.

Palet utama:
- ProByte Orange: `#ff8a3d`
- ProByte Blue: `#2f80ed`
- Deep Navy: `#101828`
- Panel Navy: `#18243a`
- Soft Ice: `#eef6ff`
- Muted Text: `#8ea3bd`
- Success: `#35d07f`
- Warning: `#ffbf47`
- Danger: `#ff5a6a`

Karakter UI:
- Dark-first.
- Modern, padat, dan cepat discan.
- Aksen orange untuk CTA utama.
- Aksen biru untuk status, informasi, dan navigasi.
- Kartu produk compact.
- Checkout fokus pada stok, harga, dan status delivery.

## 12. Success Metrics
- User dapat menyelesaikan checkout dalam kurang dari 2 menit.
- Minimal 95% order sukses mendapat akun otomatis.
- Homepage load target di bawah 3 detik pada koneksi 4G.
- Admin dapat menambah stok akun dalam kurang dari 1 menit.
- Tidak ada oversold stok akun.
- Semua invoice punya status pembayaran dan status pengiriman yang jelas.
- Saldo pelanggan tercatat sebagai ledger, bukan angka yang diedit langsung.
- Admin mendapat alert ketika stok varian menipis.
- Xendit webhook duplikat tidak boleh menggandakan delivery, top up, atau ledger.
- Invoice detail akun hanya bisa dibuka oleh pemilik akun atau lewat token invoice yang benar.

## 13. Risiko Produk
- Penjualan akun aplikasi pihak ketiga dapat melanggar ToS jika tidak legal/terotorisasi.
- Akun dapat disalahgunakan pembeli jika tidak ada SOP.
- Stok dapat oversold jika locking tidak atomic.
- Payment callback dapat dipalsukan jika callback token Xendit tidak diverifikasi.
- Penyimpanan kredensial akun rawan bocor jika tidak terenkripsi.
- Password admin rawan bocor jika disimpan plaintext; password admin wajib disimpan sebagai hash.
- Secret API rawan bocor jika masuk frontend, git, log, atau pesan chat; secret yang terekspos wajib di-rotate.

## 14. Keputusan MVP
- Payment gateway: Xendit.
- Tipe produk utama: akun jadi, berupa email dan password.
- Delivery: otomatis setelah pembayaran valid.
- Admin panel: dibuat dari awal dengan fitur produk, varian, stok, order, refund saldo, analytics, restock alert, dan audit log dasar.
- Role aplikasi: hanya admin dan pelanggan.
- Mode produksi wajib memakai backend API, bukan simulasi frontend.
- UI: palet orange dan biru, diserasikan dengan logo ProByte.
