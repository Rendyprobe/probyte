export type ProductCategory =
  | "Streaming"
  | "Music"
  | "Productivity"
  | "AI"
  | "Editing"
  | "Learning"
  | "Video Platform"
  | "Utility";

export type ProductVariant = {
  id: string;
  name: string;
  duration: string;
  price: number;
  seed: number;
  stock?: number;
  lowStockThreshold?: number;
};

export type Product = {
  id: string;
  name: string;
  initials: string;
  category: ProductCategory;
  description: string;
  imageUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  tags: string[];
  variants: ProductVariant[];
};

export type StockStatus = "AVAILABLE" | "DELIVERED" | "DISABLED";

export type AccountStock = {
  id: string;
  variantId: string;
  email: string;
  password: string;
  status: StockStatus;
  createdAt: string;
  deliveredAt: string | null;
  soldOrderId: string | null;
};

export type PaymentStatus = "WAITING_PAYMENT" | "PAID" | "EXPIRED" | "FAILED" | "REFUNDED";

export type DeliveryStatus = "PENDING" | "PROCESSING" | "DELIVERED" | "NEED_RESTOCK" | "FAILED_DELIVERY" | "REPLACED";

export type DeliveredAccount = {
  stockId: string;
  email: string;
  password: string;
};

export type Order = {
  id: string;
  userId: string | null;
  invoiceNumber: string;
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  qty: number;
  customerWhatsapp: string;
  customerEmail: string;
  paymentMethod: string;
  paymentSource: "GATEWAY" | "WALLET";
  paymentStatus: PaymentStatus;
  deliveryStatus: DeliveryStatus;
  subtotal: number;
  discount: number;
  paymentFee: number;
  total: number;
  promoCode: string | null;
  accounts: DeliveredAccount[];
  createdAt: string;
  paidAt: string | null;
  expiredAt: string;
  history: Array<{ at: string; text: string }>;
};

export type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type WalletLedgerKind = "TOPUP" | "PAYMENT" | "REFUND" | "ADJUSTMENT";
export type WalletLedgerStatus = "PENDING" | "SETTLED" | "FAILED" | "VOID";

export type WalletLedgerEntry = {
  id: string;
  userId: string;
  kind: WalletLedgerKind;
  amount: number;
  status: WalletLedgerStatus;
  invoiceNumber: string | null;
  paymentReference: string | null;
  note: string;
  createdAt: string;
  settledAt: string | null;
};

export type PromoCode = {
  code: string;
  label: string;
  type: "PERCENT" | "FIXED";
  value: number;
  minSubtotal: number;
  maxDiscount: number | null;
  active: boolean;
};

export type WarrantyClaimStatus = "OPEN" | "IN_REVIEW" | "REFUNDED_TO_BALANCE" | "REJECTED";

export type WarrantyClaim = {
  id: string;
  invoiceNumber: string;
  userId: string;
  customerWhatsapp: string;
  issueSummary: string;
  status: WarrantyClaimStatus;
  refundWalletLedgerId: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export type ProductReview = {
  id: string;
  orderId: string;
  userId: string;
  invoiceNumber: string;
  productId: string;
  productName: string;
  variantName: string;
  rating: number;
  comment: string;
  displayName: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PublicReview = {
  id: string;
  productId: string;
  productName: string;
  variantName: string;
  rating: number;
  comment: string;
  displayName: string;
  createdAt: string;
};

export type DemoState = {
  stocks: AccountStock[];
  orders: Order[];
  audits: AuditLog[];
  walletLedger: WalletLedgerEntry[];
  warrantyClaims: WarrantyClaim[];
  createdAt: string;
};
