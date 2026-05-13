import { getProduct, products } from "@/lib/catalog";
import type { AccountStock, AuditLog, DemoState, Order, PromoCode, WalletLedgerEntry, WarrantyClaim } from "@/lib/types";
import { promoCodes, STORAGE_KEY } from "./constants";
import type { InvoiceResponse, OrderRow, WarrantyClaimRow } from "./types";

export function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as Partial<DemoState>;
      if (Array.isArray(parsed.stocks) && Array.isArray(parsed.orders)) return normalizeState(parsed);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  const seeded = createSeedState();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}

export function createSeedState(): DemoState {
  return {
    stocks: seedStocks(),
    orders: [],
    audits: [],
    walletLedger: [],
    warrantyClaims: [],
    createdAt: new Date().toISOString()
  };
}

function normalizeState(parsed: Partial<DemoState>): DemoState {
  return {
    stocks: parsed.stocks ?? [],
    orders: (parsed.orders ?? []).map(normalizeOrder),
    audits: parsed.audits ?? [],
    walletLedger: parsed.walletLedger ?? [],
    warrantyClaims: parsed.warrantyClaims ?? [],
    createdAt: parsed.createdAt ?? new Date().toISOString()
  };
}

function normalizeOrder(order: Partial<Order>): Order {
  return {
    id: order.id ?? uid("ord"),
    userId: order.userId ?? null,
    invoiceNumber: order.invoiceNumber ?? createInvoiceNumber(),
    productId: order.productId ?? products[0].id,
    productName: order.productName ?? products[0].name,
    variantId: order.variantId ?? products[0].variants[0].id,
    variantName: order.variantName ?? products[0].variants[0].name,
    qty: order.qty ?? 1,
    customerWhatsapp: order.customerWhatsapp ?? "",
    customerEmail: order.customerEmail ?? "",
    paymentMethod: order.paymentMethod ?? "XENDIT_INVOICE",
    paymentSource: order.paymentSource ?? (order.paymentMethod === "WALLET" ? "WALLET" : "GATEWAY"),
    paymentStatus: order.paymentStatus ?? "WAITING_PAYMENT",
    deliveryStatus: order.deliveryStatus ?? "PENDING",
    subtotal: order.subtotal ?? 0,
    discount: order.discount ?? 0,
    paymentFee: order.paymentFee ?? 0,
    total: order.total ?? 0,
    promoCode: order.promoCode ?? null,
    accounts: order.accounts ?? [],
    createdAt: order.createdAt ?? new Date().toISOString(),
    paidAt: order.paidAt ?? null,
    expiredAt: order.expiredAt ?? new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    history: order.history ?? []
  };
}

export function orderFromRow(row: OrderRow): Order {
  return {
    id: row.id,
    userId: row.user_id,
    invoiceNumber: row.invoice_number,
    productId: row.product_id,
    productName: row.product_name,
    variantId: row.variant_id,
    variantName: row.variant_name,
    qty: row.qty,
    customerWhatsapp: row.customer_whatsapp,
    customerEmail: row.customer_email ?? "",
    paymentMethod: row.payment_method,
    paymentSource: row.payment_source ?? (row.payment_method === "WALLET" ? "WALLET" : "GATEWAY"),
    paymentStatus: row.payment_status,
    deliveryStatus: row.delivery_status,
    subtotal: row.subtotal,
    discount: row.discount ?? 0,
    paymentFee: row.payment_fee,
    total: row.total,
    promoCode: row.promo_code ?? null,
    accounts: row.accounts ?? [],
    createdAt: row.created_at,
    paidAt: row.paid_at,
    expiredAt: row.expired_at,
    history: row.history ?? []
  };
}

export function orderFromInvoiceResponse(response: InvoiceResponse): Order {
  const order = response.order;
  return {
    id: order.id,
    userId: null,
    invoiceNumber: order.invoice_number,
    productId: "",
    productName: order.product_name,
    variantId: "",
    variantName: order.variant_name,
    qty: order.qty,
    customerWhatsapp: order.customer_whatsapp,
    customerEmail: "",
    paymentMethod: order.payment_method,
    paymentSource: order.payment_method === "WALLET" ? "WALLET" : "GATEWAY",
    paymentStatus: order.payment_status,
    deliveryStatus: order.delivery_status,
    subtotal: order.subtotal,
    discount: order.discount,
    paymentFee: order.payment_fee,
    total: order.total,
    promoCode: null,
    accounts: response.accounts ?? [],
    createdAt: order.created_at,
    paidAt: order.paid_at,
    expiredAt: order.expired_at,
    history: order.history ?? []
  };
}

export function warrantyClaimFromRow(row: WarrantyClaimRow): WarrantyClaim {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    userId: row.user_id,
    customerWhatsapp: row.customer_whatsapp,
    issueSummary: row.issue_summary,
    status: row.status,
    refundWalletLedgerId: row.refund_wallet_ledger_id,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at
  };
}

function seedStocks(): AccountStock[] {
  const stocks: AccountStock[] = [];
  products.forEach((product) => {
    product.variants.forEach((variant) => {
      for (let i = 1; i <= variant.seed; i += 1) {
        stocks.push({
          id: uid("stk"),
          variantId: variant.id,
          email: `${product.id}.${i}.${variant.id.replace(/[^a-z0-9]/gi, "")}@probyte.test`,
          password: `PB-${product.initials}-${String(i).padStart(3, "0")}-${randomCode(4)}`,
          status: "AVAILABLE",
          createdAt: new Date().toISOString(),
          deliveredAt: null,
          soldOrderId: null
        });
      }
    });
  });
  return stocks;
}

export function availableStock(state: DemoState, variantId: string) {
  return state.stocks.filter((stock) => stock.variantId === variantId && stock.status === "AVAILABLE");
}

export function productStock(state: DemoState, productId: string) {
  const product = getProduct(productId);
  if (!product) return 0;
  return product.variants.reduce((sum, variant) => sum + availableStock(state, variant.id).length, 0);
}

export function findOrder(state: DemoState, invoiceNumber: string) {
  return state.orders.find((order) => order.invoiceNumber.toLowerCase() === invoiceNumber.toLowerCase()) ?? null;
}

export function deliverOrder(state: DemoState, invoiceNumber: string) {
  const order = state.orders.find((item) => item.invoiceNumber === invoiceNumber);
  if (!order || order.deliveryStatus === "DELIVERED") return;

  order.deliveryStatus = "PROCESSING";
  const stocks = availableStock(state, order.variantId);
  if (stocks.length < order.qty) {
    order.deliveryStatus = "NEED_RESTOCK";
    order.history.push({ at: new Date().toISOString(), text: "Stok tidak cukup" });
    state.audits.unshift(createAudit("NEED_RESTOCK", "order", order.id, { invoiceNumber }));
    return;
  }

  const selected = stocks.slice(0, order.qty);
  order.accounts = selected.map((stock) => ({
    stockId: stock.id,
    email: stock.email,
    password: stock.password
  }));

  selected.forEach((stock) => {
    stock.status = "DELIVERED";
    stock.soldOrderId = order.id;
    stock.deliveredAt = new Date().toISOString();
  });

  order.deliveryStatus = "DELIVERED";
  order.history.push({ at: new Date().toISOString(), text: "Akun dikirim otomatis" });
  state.audits.unshift(createAudit("DELIVER_ORDER", "order", order.id, { invoiceNumber, qty: order.qty }));
}

export function createAudit(action: string, entityType: string, entityId: string, metadata: Record<string, unknown>): AuditLog {
  return {
    id: uid("aud"),
    action,
    entityType,
    entityId,
    metadata,
    createdAt: new Date().toISOString()
  };
}

function createWalletEntry(
  userId: string,
  kind: WalletLedgerEntry["kind"],
  amount: number,
  status: WalletLedgerEntry["status"],
  invoiceNumber: string | null,
  note: string
): WalletLedgerEntry {
  return {
    id: uid("wlt"),
    userId,
    kind,
    amount,
    status,
    invoiceNumber,
    paymentReference: null,
    note,
    createdAt: new Date().toISOString(),
    settledAt: status === "SETTLED" ? new Date().toISOString() : null
  };
}

export function calculateWalletBalance(ledger: WalletLedgerEntry[], userId: string) {
  return ledger
    .filter((entry) => entry.userId === userId && entry.status === "SETTLED")
    .reduce((sum, entry) => {
      if (entry.kind === "PAYMENT") return sum - entry.amount;
      if (entry.kind === "TOPUP" || entry.kind === "REFUND" || entry.kind === "ADJUSTMENT") return sum + entry.amount;
      return sum;
    }, 0);
}

function createInvoiceNumber() {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  return `PBY-${date}-${randomCode(6)}`;
}

export function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function randomCode(length: number) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let output = "";
  for (let i = 0; i < length; i += 1) {
    output += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return output;
}

export function isValidPhone(phone: string) {
  return /^(\+?62|0)8[1-9][0-9]{6,12}$/.test(phone.replace(/\s|-/g, ""));
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function paymentLabel(method: string) {
  const labels: Record<string, string> = {
    XENDIT_INVOICE: "Xendit Payment Link",
    WALLET: "Saldo Akun"
  };
  return labels[method] ?? "Xendit";
}

export function findPromo(code: string, subtotal: number) {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  return promoCodes.find((promo) => promo.active && promo.code === normalized && subtotal >= promo.minSubtotal) ?? null;
}

export function calculatePromoDiscount(promo: PromoCode, subtotal: number) {
  const rawDiscount = promo.type === "PERCENT" ? Math.floor((subtotal * promo.value) / 100) : promo.value;
  return Math.min(rawDiscount, promo.maxDiscount ?? rawDiscount, subtotal);
}

export function mostSoldProductName(orders: Order[]) {
  const paidOrders = orders.filter((order) => order.paymentStatus === "PAID" || order.paymentStatus === "REFUNDED");
  if (!paidOrders.length) return "-";

  const counts = paidOrders.reduce<Record<string, number>>((acc, order) => {
    acc[order.productName] = (acc[order.productName] ?? 0) + order.qty;
    return acc;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function setMeta(name: string, content: string) {
  let meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = name;
    document.head.appendChild(meta);
  }
  meta.content = content;
}

export function setCanonical(href: string) {
  let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = href;
}

export function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!domain) return "****";
  return `${name.slice(0, 3)}${"*".repeat(Math.max(3, name.length - 3))}@${domain}`;
}

export function copyToClipboard(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}
