import type { Order, Product, PromoCode, WalletLedgerEntry, WarrantyClaim } from "@/lib/types";

export type ViewName =
  | "home"
  | "product"
  | "invoice"
  | "account"
  | "voucher"
  | "ranking"
  | "deposit"
  | "contact"
  | "admin"
  | "product-detail"
  | "testimonials"
  | "terms"
  | "privacy"
  | "warranty";
export type Toast = { id: string; message: string; type: "success" | "fail" | "" };
export type AuthMode = "login" | "register";
export type CloudSyncState = "idle" | "syncing" | "error";

export type OrderRow = {
  id: string;
  user_id: string | null;
  invoice_number: string;
  product_id: string;
  product_name: string;
  variant_id: string;
  variant_name: string;
  qty: number;
  customer_whatsapp: string;
  customer_email: string | null;
  payment_method: string;
  payment_source?: Order["paymentSource"];
  payment_status: Order["paymentStatus"];
  delivery_status: Order["deliveryStatus"];
  subtotal: number;
  discount?: number | null;
  payment_fee: number;
  total: number;
  promo_code?: string | null;
  accounts?: Order["accounts"];
  history: Order["history"];
  paid_at: string | null;
  expired_at: string;
  created_at: string;
};

export type CheckoutResponse = {
  invoice_number: string;
  invoice_token: string;
  payment_url?: string;
  payment_status?: Order["paymentStatus"];
  delivery_status?: Order["deliveryStatus"];
  total: number;
  accounts?: Order["accounts"];
};

export type AdminLoginResponse = {
  token: string;
  admin: { id: string; username: string };
};

export type InvoiceResponse = {
  order: {
    id: string;
    invoice_number: string;
    product_name: string;
    variant_name: string;
    qty: number;
    customer_whatsapp?: string;
    payment_method: string;
    payment_status: Order["paymentStatus"];
    delivery_status: Order["deliveryStatus"];
    subtotal: number;
    discount: number;
    payment_fee: number;
    total: number;
    created_at: string;
    paid_at?: string | null;
    expired_at: string;
    history?: Order["history"];
    payment_url?: string;
  };
  accounts?: Order["accounts"];
};

export type AdminOrdersResponse = { orders: OrderRow[] };

export type WalletLedgerRow = {
  id: string;
  user_id: string;
  kind: WalletLedgerEntry["kind"];
  amount: number;
  status: WalletLedgerEntry["status"];
  invoice_number: string | null;
  payment_reference: string | null;
  xendit_invoice_id?: string | null;
  note: string | null;
  created_at: string;
  settled_at: string | null;
};
export type WalletLedgerResponse = { ledger: WalletLedgerRow[] };

export type AdminWalletSummaryRow = {
  user_id: string;
  balance: number;
  settled_credit: number;
  settled_debit: number;
  topup: number;
  refund: number;
  adjustment: number;
  payment: number;
  pending_topup: number;
  failed_topup: number;
  last_activity: string;
};
export type AdminWalletSummaryResponse = { customers: AdminWalletSummaryRow[] };
export type AdminWalletLedgerResponse = { ledger: WalletLedgerRow[] };
export type AdminWalletAdjustmentResponse = { ledger: WalletLedgerRow };

export type WarrantyClaimRow = {
  id: string;
  invoice_number: string;
  user_id: string;
  customer_whatsapp: string;
  issue_summary: string;
  status: WarrantyClaim["status"];
  refund_wallet_ledger_id: string | null;
  created_at: string;
  resolved_at: string | null;
};
export type AdminWarrantyClaimsResponse = { claims: WarrantyClaimRow[] };

export type AdminProductVariantRow = {
  id: string;
  product_id: string;
  name: string;
  duration_days: number;
  cost_price: number;
  sell_price: number;
  low_stock_threshold: number;
  is_active: boolean;
  stock?: number;
  created_at?: string;
  updated_at?: string;
};

export type AdminProductRow = {
  id: string;
  slug: string;
  name: string;
  category: Product["category"];
  description: string;
  icon_label: string;
  seo_title: string | null;
  seo_description: string | null;
  is_active: boolean;
  product_variants?: AdminProductVariantRow[];
  variants?: AdminProductVariantRow[];
  created_at?: string;
  updated_at?: string;
};
export type AdminProductsResponse = { products: AdminProductRow[] };

export type AdminPromoRow = {
  id: string;
  code: string;
  label: string;
  type: PromoCode["type"];
  value: number;
  min_subtotal: number;
  max_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
};
export type AdminPromosResponse = { promos: AdminPromoRow[] };

export type AdminAuditLogRow = {
  id: string;
  admin_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata_json: Record<string, unknown>;
  created_at: string;
};
export type AdminAuditLogsResponse = { logs: AdminAuditLogRow[] };

export type AdminAnalyticsResponse = {
  totalRevenue: number;
  todayRevenue: number;
  conversion: number;
  availableStock: number;
  orderCount: number;
  waitingPayment: number;
  needRestock: number;
};

export type ProductReviewRow = {
  id: string;
  order_id?: string;
  user_id?: string;
  invoice_number?: string;
  product_id: string;
  product_name: string;
  variant_name: string;
  rating: number;
  comment: string;
  display_name: string;
  is_public?: boolean;
  created_at: string;
  updated_at?: string;
};
export type AccountReviewsResponse = { reviews: ProductReviewRow[] };
export type PublicReviewsResponse = { reviews: ProductReviewRow[] };
export type ReviewResponse = { review: ProductReviewRow };
