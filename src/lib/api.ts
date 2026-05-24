const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

type ApiOptions = {
  token?: string;
  adminToken?: string | null;
};

export async function apiGet<T>(path: string, options: ApiOptions = {}) {
  return apiRequest<T>(path, { method: "GET" }, options);
}

export async function apiPost<T>(path: string, body: unknown, options: ApiOptions = {}) {
  return apiRequest<T>(
    path,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    },
    options
  );
}

export async function apiPatch<T>(path: string, body: unknown, options: ApiOptions = {}) {
  return apiRequest<T>(
    path,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    },
    options
  );
}

async function apiRequest<T>(path: string, init: RequestInit, options: ApiOptions) {
  const headers = new Headers(init.headers);
  const token = options.adminToken || options.token;
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const apiUrl = new URL(path, API_BASE_URL || window.location.origin);
  const response = await fetch(apiUrl, { ...init, headers });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(readableApiError(payload.error, response.status));
  }
  return payload;
}

function readableApiError(error: string | undefined, status: number) {
  const messages: Record<string, string> = {
    AUTH_REQUIRED: "Masuk akun pelanggan dulu untuk melanjutkan.",
    ADMIN_AUTH_REQUIRED: "Sesi admin sudah habis. Masuk ulang.",
    DUPLICATE_STOCK_DETECTED: "Stok ini sudah pernah ditambahkan.",
    CUSTOMER_EMAIL_REQUIRED: "Invoice ini belum punya email pelanggan.",
    EMAIL_CONFIGURATION_REQUIRED: "SMTP belum dikonfigurasi untuk mengirim email.",
    FORBIDDEN: "Akses ke data ini tidak diizinkan.",
    INSUFFICIENT_BALANCE: "Saldo belum cukup untuk membayar order ini.",
    INSUFFICIENT_STOCK: "Stok varian ini tidak cukup.",
    INTERNAL_ERROR: "Layanan sedang bermasalah. Coba lagi sebentar.",
    INVALID_INVOICE_TOKEN: "Token invoice tidak cocok untuk klaim ini.",
    INVALID_CALLBACK_TOKEN: "Token webhook Xendit tidak valid.",
    INVALID_CLAIM: "Klaim garansi belum valid untuk diproses.",
    INVALID_CREDENTIALS: "Username atau password salah.",
    INVALID_EMAIL: "Format email belum valid.",
    INVALID_INVOICE: "Invoice tidak valid untuk klaim garansi.",
    INVALID_JSON: "Payload request tidak valid.",
    INVALID_PAYMENT_METHOD: "Metode pembayaran tidak valid.",
    INVALID_PROMO: "Kode promo tidak valid atau belum memenuhi minimal transaksi.",
    INVALID_RATING: "Pilih rating bintang 1 sampai 5.",
    INVALID_REVIEW: "Ulasan belum valid.",
    INVALID_REVIEW_COMMENT: "Isi ulasan minimal 4 karakter dan maksimal 800 karakter.",
    INVALID_VARIANT: "Varian produk tidak tersedia.",
    INVALID_WALLET_ADJUSTMENT: "Mutasi saldo admin belum valid.",
    INVALID_WHATSAPP: "Nomor WhatsApp belum valid.",
    INVOICE_NOT_FOUND: "Invoice tidak ditemukan.",
    ISSUE_TOO_SHORT: "Ringkasan masalah minimal 8 karakter.",
    MIN_TOPUP_10000: "Minimal top up saldo Rp 10.000.",
    NO_VALID_STOCK_ROWS: "Format stok belum valid.",
    ORDER_NOT_FOUND: "Order tidak ditemukan.",
    PAYLOAD_TOO_LARGE: "Payload request terlalu besar.",
    PAYMENT_LINK_UNAVAILABLE: "Payment link tidak tersedia. Buat invoice baru bila sudah expired.",
    RATE_LIMITED: "Terlalu banyak percobaan. Tunggu sebentar.",
    REPLACEMENT_NOT_ALLOWED: "Order ini belum bisa diganti akunnya.",
    REPLACEMENT_NOT_AVAILABLE: "Stok pengganti belum tersedia untuk varian ini.",
    REQUEST_FAILED: "Request gagal diproses.",
    REVIEW_NOT_ALLOWED: "Ulasan baru bisa dibuat setelah akun dibayar dan terkirim.",
    REVIEW_SCHEMA_REQUIRED: "Database review belum dimigrasi. Terapkan migrasi product_reviews dulu.",
    WALLET_USER_NOT_FOUND: "User saldo tidak ditemukan.",
    WALLET_USER_REQUIRED: "Masukkan User ID pelanggan yang valid.",
    XENDIT_CONFIGURATION_REQUIRED: "Pembayaran Xendit belum dikonfigurasi.",
    XENDIT_SECRET_KEY_MUST_BE_SECRET_KEY: "Xendit membutuhkan secret key, bukan public key."
  };

  if (error && messages[error]) return messages[error];
  if (status >= 500) return "Layanan sedang bermasalah. Coba lagi sebentar.";
  return error || `Request gagal (${status}).`;
}
