import type { Order, WarrantyClaim } from "@/lib/types";

export type ViewName = "store" | "invoice" | "account" | "admin" | "product";
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
  accounts: Order["accounts"];
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
    customer_whatsapp: string;
    payment_method: string;
    payment_status: Order["paymentStatus"];
    delivery_status: Order["deliveryStatus"];
    subtotal: number;
    discount: number;
    payment_fee: number;
    total: number;
    created_at: string;
    paid_at: string | null;
    expired_at: string;
    history: Order["history"];
    payment_url?: string;
  };
  accounts?: Order["accounts"];
};

export type AdminOrdersResponse = { orders: OrderRow[] };
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
