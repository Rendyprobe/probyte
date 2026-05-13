# SRS ProByte

## 1. Arsitektur Target
MVP produksi disarankan menggunakan:
- Frontend: React + Vite + TypeScript.
- Backend: Node.js/Express, NestJS, Laravel, atau framework setara.
- Database: PostgreSQL atau MySQL.
- Payment gateway: Xendit Payment Link/Invoice API.
- Storage secrets: encrypted database field atau secrets vault.
- Deployment: VPS atau cloud app dengan HTTPS.
- Runtime backend wajib memisahkan server secrets dari frontend build.

Prototype di repo ini dibuat sebagai static frontend dengan localStorage untuk simulasi. Prototype tidak boleh dipakai menyimpan kredensial akun asli.

## 2. Modul Sistem
- Product Catalog
- Product Variant
- Account Stock Management
- Checkout
- Xendit Payment
- Invoice
- Auto Delivery
- Transaction Checker
- Admin Panel
- Audit Log
- Customer Wallet / Saldo
- Promo Code
- Warranty Claim
- Restock Alert
- Product SEO Pages
- Rate Limiting & Security Audit

## 3. Functional Requirements
### Catalog
- FR-001: Sistem menampilkan daftar produk aplikasi premium.
- FR-002: Sistem menyediakan pencarian berdasarkan nama produk, kategori, dan tag.
- FR-003: Sistem menyediakan filter kategori.
- FR-004: Sistem menampilkan stok tersedia per produk.
- FR-005: Sistem menampilkan produk tidak aktif sebagai tersembunyi dari storefront.

### Product Variant
- FR-006: Setiap produk dapat memiliki beberapa varian.
- FR-007: Setiap varian memiliki harga jual, harga modal, durasi, status aktif, dan stok.
- FR-008: User hanya dapat membeli varian aktif dengan stok tersedia.

### Checkout
- FR-009: User dapat checkout tanpa login.
- FR-010: User wajib mengisi nomor WhatsApp.
- FR-011: User dapat mengisi email opsional.
- FR-012: User memilih produk, varian, dan jumlah pembelian.
- FR-013: Sistem menolak checkout jika qty melebihi stok.
- FR-014: Backend wajib menghitung ulang harga, fee, diskon, dan total.
- FR-015: Sistem membuat invoice unik.
- FR-015A: User login dapat membayar memakai saldo jika saldo mencukupi.
- FR-015B: User dapat memakai voucher/kode promo yang valid.
- FR-015C: Sistem membuat `invoice_token` random untuk akses aman detail invoice.
- FR-015D: Checkout gateway membuat Xendit invoice dan menyimpan `xendit_invoice_id` serta `invoice_url`.
- FR-015E: Checkout saldo wajib atomic: cek saldo, buat order, potong ledger saldo, reserve stok, dan deliver akun dalam satu transaksi database.

### Xendit Payment
- FR-016: Backend membuat Xendit invoice untuk checkout atau top up saldo.
- FR-017: Frontend membuka `invoice_url` dari Xendit.
- FR-018: Backend menerima callback Xendit.
- FR-019: Backend memverifikasi `x-callback-token`.
- FR-020: Callback harus idempotent memakai `webhook-id` Xendit.
- FR-021: Invoice berubah menjadi `PAID` hanya jika status Xendit valid.
- FR-021A: Top up saldo lewat payment gateway mengikuti verifikasi callback yang sama.
- FR-021B: Callback top up saldo hanya boleh menyelesaikan ledger `PENDING` yang cocok dengan Xendit invoice.

### Auto Delivery
- FR-022: Setelah pembayaran valid, sistem mengambil stok akun `AVAILABLE`.
- FR-023: Sistem harus mengunci stok secara atomic agar tidak oversold.
- FR-024: Sistem mengubah stok menjadi `RESERVED`, lalu `DELIVERED`.
- FR-025: Sistem menampilkan email dan password akun di invoice setelah payment sukses.
- FR-026: Sistem menyimpan delivery log.
- FR-027: Jika stok habis setelah pembayaran, invoice menjadi `NEED_RESTOCK`.

### Invoice & Cek Transaksi
- FR-028: User dapat membuka invoice dari URL.
- FR-029: User dapat mencari invoice dari halaman Cek Transaksi.
- FR-030: Invoice menampilkan status pembayaran, status delivery, produk, varian, qty, total, dan waktu transaksi.
- FR-031: Detail akun hanya tampil setelah pembayaran sukses.
- FR-031F: Detail akun hanya dapat ditampilkan kepada user pemilik order atau pemegang `invoice_token`.

### Customer Account & Wallet
- FR-031A: Pelanggan dapat login dan melihat dashboard akun.
- FR-031B: Dashboard pelanggan menampilkan riwayat pembelian dan akun yang pernah dibeli.
- FR-031C: Saldo pelanggan dihitung dari ledger transaksi, bukan angka yang diedit langsung.
- FR-031D: Ledger saldo mencatat top up, pembayaran, refund, dan adjustment admin.
- FR-031E: Refund garansi masuk ke saldo pelanggan.

### Admin Panel
- FR-032: Admin dapat login ke dashboard.
- FR-032A: Admin login memakai username dan password.
- FR-032B: Password admin disimpan sebagai hash, bukan plaintext.
- FR-033: Admin dapat melihat ringkasan omzet, order, dan stok.
- FR-034: Admin dapat menambah stok akun.
- FR-035: Admin dapat import stok akun massal.
- FR-036: Admin dapat melihat stok dengan data sensitif dimasking.
- FR-037: Admin dapat melihat order dan invoice.
- FR-038: Admin dapat mengganti akun pada order bermasalah.
- FR-039: Admin dapat mengubah status order secara manual dengan alasan.
- FR-040: Setiap aksi admin pada stok/order masuk audit log.
- FR-041: Admin dapat melihat analytics omzet harian, produk laris, stok menipis, dan conversion checkout.
- FR-042: Sistem mengirim restock alert ke email admin saat stok varian menyentuh threshold.
- FR-043: Admin dapat memproses klaim garansi berdasarkan invoice yang dikirim pelanggan lewat chat.
- FR-044: Admin dapat menyetujui refund garansi ke saldo pelanggan.
- FR-047: Admin dapat CRUD produk dan varian dari backend API.
- FR-048: Admin bulk import stok wajib menolak duplikat akun berdasarkan hash rahasia.
- FR-049: Admin login wajib rate limited.

### Product SEO
- FR-045: Setiap produk memiliki halaman SEO dengan slug stabil, title, meta description, canonical URL, dan structured data.
- FR-046: Halaman produk menampilkan varian, harga, stok, FAQ ringkas, dan CTA checkout.

### Backend API
- FR-050: Backend menyediakan endpoint `/api/checkout`, `/api/xendit/webhook`, `/api/wallet/topup`, `/api/wallet/ledger`, `/api/invoices/:invoiceNumber`, `/api/admin/login`, `/api/admin/stocks`, `/api/admin/orders`, `/api/admin/analytics`, `/api/admin/products`, `/api/admin/variants`, `/api/admin/warranty-claims`, dan `/api/admin/warranty-claims/:id/refund`.
- FR-051: Backend mengembalikan error generik untuk auth gagal agar tidak membocorkan keberadaan username.
- FR-052: Backend tidak boleh mengirim secret, hash password, atau ciphertext akun ke frontend.

## 4. Data Model
### `products`
- `id`
- `name`
- `slug`
- `category`
- `description`
- `icon_label`
- `seo_title`
- `seo_description`
- `is_active`
- `created_at`
- `updated_at`

### `product_variants`
- `id`
- `product_id`
- `name`
- `duration_days`
- `cost_price`
- `sell_price`
- `is_active`
- `created_at`
- `updated_at`

### `account_stocks`
- `id`
- `product_variant_id`
- `account_email_encrypted`
- `account_password_encrypted`
- `display_hint`
- `credential_hash`
- `status`
- `reserved_order_id`
- `sold_order_id`
- `created_at`
- `reserved_at`
- `delivered_at`
- `disabled_at`

### `orders`
- `id`
- `invoice_number`
- `user_id`
- `customer_whatsapp`
- `customer_email`
- `payment_status`
- `delivery_status`
- `subtotal`
- `discount`
- `payment_fee`
- `total`
- `promo_code_id`
- `payment_source`
- `invoice_token`
- `xendit_invoice_url`
- `xendit_invoice_id`
- `xendit_payment_id`
- `created_at`
- `paid_at`
- `expired_at`

### `order_items`
- `id`
- `order_id`
- `product_id`
- `product_variant_id`
- `qty`
- `unit_price`
- `total_price`

### `delivered_accounts`
- `id`
- `order_id`
- `account_stock_id`
- `account_email_encrypted`
- `account_password_encrypted`
- `delivered_at`

### `audit_logs`
- `id`
- `admin_id`
- `action`
- `entity_type`
- `entity_id`
- `metadata_json`
- `created_at`

### `admin_users`
- `id`
- `username`
- `password_hash`
- `is_active`
- `last_login_at`
- `created_at`
- `updated_at`

### `wallet_ledger`
- `id`
- `user_id`
- `kind`
- `amount`
- `status`
- `invoice_number`
- `payment_reference`
- `xendit_invoice_id`
- `note`
- `created_at`
- `settled_at`

### `promo_codes`
- `id`
- `code`
- `type`
- `value`
- `min_subtotal`
- `max_discount`
- `usage_limit`
- `used_count`
- `starts_at`
- `ends_at`
- `is_active`
- `created_at`

### `warranty_claims`
- `id`
- `invoice_number`
- `user_id`
- `customer_whatsapp`
- `issue_summary`
- `status`
- `refund_wallet_ledger_id`
- `created_at`
- `resolved_at`

### `restock_alerts`
- `id`
- `product_variant_id`
- `threshold`
- `current_stock`
- `admin_email`
- `status`
- `sent_at`
- `created_at`

### `webhook_events`
- `id`
- `provider`
- `webhook_id`
- `external_id`
- `event_type`
- `status`
- `payload_json`
- `created_at`
- `processed_at`

## 5. Status
### Payment Status
- `CREATED`
- `WAITING_PAYMENT`
- `PAID`
- `FAILED`
- `EXPIRED`
- `REFUNDED`

### Wallet Ledger Kind
- `TOPUP`
- `PAYMENT`
- `REFUND`
- `ADJUSTMENT`

### Wallet Ledger Status
- `PENDING`
- `SETTLED`
- `FAILED`
- `VOID`

### Warranty Claim Status
- `OPEN`
- `IN_REVIEW`
- `REFUNDED_TO_BALANCE`
- `REJECTED`

### Delivery Status
- `PENDING`
- `PROCESSING`
- `DELIVERED`
- `NEED_RESTOCK`
- `FAILED_DELIVERY`
- `REPLACED`

### Stock Status
- `AVAILABLE`
- `RESERVED`
- `DELIVERED`
- `DISABLED`
- `EXPIRED`
- `REFUNDED`

## 6. Xendit Flow
1. Frontend mengirim checkout ke backend.
2. Backend membuat invoice.
3. Backend membuat Xendit invoice ke Xendit.
4. Backend mengembalikan `invoice_url`.
5. Frontend menjalankan `window.location.assign(invoice_url)`.
6. User membayar.
7. Xendit mengirim callback ke backend.
8. Backend verifikasi `x-callback-token`.
9. Backend mencatat `webhook-id` untuk idempotency.
10. Backend update payment status.
11. Backend menjalankan auto delivery.

Endpoint target:
- `POST /api/checkout`
- `GET /api/invoices/:invoiceNumber`
- `POST /api/xendit/webhook`
- `GET /api/products`
- `POST /api/admin/stocks`
- `GET /api/admin/orders`
- `GET /api/admin/analytics`
- `POST /api/admin/login`
- `GET /api/admin/warranty-claims`
- `POST /api/admin/products`
- `PATCH /api/admin/products/:id`
- `POST /api/admin/variants`
- `PATCH /api/admin/variants/:id`
- `POST /api/wallet/topup`
- `GET /api/wallet/ledger`
- `POST /api/warranty-claims`
- `POST /api/admin/warranty-claims/:id/refund`
- `GET /produk/:slug`

## 7. Security Requirements
- SR-001: Akun dan password produk wajib terenkripsi di database.
- SR-002: Password akun tidak boleh tampil penuh di admin list.
- SR-003: Detail akun hanya boleh tampil pada invoice yang sudah `PAID`.
- SR-004: Xendit callback wajib verifikasi `x-callback-token`.
- SR-005: Checkout dan cek invoice wajib rate limited.
- SR-006: Harga dari frontend tidak boleh dipercaya.
- SR-007: Admin action wajib diaudit.
- SR-008: Admin login wajib memakai password hash kuat, bukan plaintext atau reversible encryption.
- SR-009: Sistem harus memakai HTTPS di produksi.
- SR-010: Backup database wajib dijadwalkan.
- SR-011: Operasi saldo harus idempotent dan berbasis ledger.
- SR-012: Pembayaran memakai saldo harus dilakukan dalam transaksi database yang mengurangi saldo dan membuat order secara atomic.
- SR-013: Klaim garansi tidak menerima upload file; bukti dan komunikasi dilakukan via chat admin berdasarkan invoice.
- SR-014: Secret server tidak boleh memakai prefix `VITE_`, `NEXT_PUBLIC_`, atau prefix public lain.
- SR-015: Admin session token wajib signed, punya expiry, dan disimpan hanya di session storage frontend.
- SR-016: Akun produk wajib dienkripsi server-side memakai authenticated encryption.
- SR-017: Hash duplikat stok wajib memakai HMAC secret, bukan hash polos dari email/password.
- SR-018: Endpoint publik wajib rate limited per IP.
- SR-019: Webhook events wajib disimpan untuk audit dan idempotency.

## 8. Acceptance Criteria MVP
- AC-001: User dapat melihat semua produk premium.
- AC-002: User dapat mencari dan memfilter produk.
- AC-003: User dapat melihat stok tersedia.
- AC-004: User tidak dapat checkout jika stok kosong.
- AC-005: User dapat membuat invoice.
- AC-006: User dapat membayar via Xendit.
- AC-007: Sistem menerima callback Xendit valid.
- AC-008: Sistem mengirim akun setelah pembayaran sukses.
- AC-009: User dapat cek transaksi dengan invoice.
- AC-010: Admin dapat menambah stok akun.
- AC-011: Admin dapat melihat order dan status stok.
- AC-012: Sistem tidak mengirim stok yang sama ke dua order berbeda.
- AC-013: User login dapat top up saldo dan membayar memakai saldo.
- AC-014: Admin dapat refund klaim garansi ke saldo pelanggan.
- AC-015: Voucher valid mengurangi total, voucher invalid ditolak.
- AC-016: Admin dapat melihat analytics dasar dan daftar stok menipis.
- AC-017: Sistem dapat mengirim email restock alert ke email admin.
- AC-018: Setiap produk memiliki URL SEO sendiri.
- AC-019: Checkout gateway mengembalikan `payment_url` Xendit.
- AC-020: Webhook Xendit duplikat tidak membuat ledger atau delivery ganda.
- AC-021: Admin login client-side demo tidak dipakai sebagai mekanisme produksi.
- AC-022: Bulk import stok menyimpan ciphertext dan display hint, bukan plaintext.

## 9. Catatan Prototype
Prototype React/Vite di repo ini:
- Menggunakan data demo di localStorage.
- Menyimulasikan pembayaran Xendit.
- Menampilkan admin panel demo tanpa keamanan produksi.
- Tidak boleh digunakan untuk akun asli atau transaksi real.
