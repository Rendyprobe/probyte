import type { IncomingMessage, ServerResponse } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { adminDb, getUserFromBearer } from "../repositories/supabase";
import { assertXenditConfigured, env } from "../config/env";
import { setCors } from "../middleware/cors";
import { enforceRateLimit } from "../middleware/rate-limit";
import {
  credentialHash,
  decryptSecret,
  encryptSecret,
  maskEmail,
  signAdminToken,
  verifyAdminToken,
  verifyPassword
} from "../security/crypto";
import { createXenditInvoice, isPaidXenditInvoiceStatus, verifyXenditCallbackToken, type XenditInvoiceWebhook } from "../services/xendit";

type Json = Record<string, unknown>;
type ApiHandler = (req: IncomingMessage, res: ServerResponse, ctx: RequestContext) => Promise<void>;
type RequestContext = {
  url: URL;
  ip: string;
  params: Record<string, string>;
};
type AdminIdentity = { id: string; username: string };
type NormalizedXenditInvoice = {
  externalId: string;
  xenditInvoiceId: string;
  status: string;
  paymentId: string | null;
  amount: number | null;
  paidAmount: number | null;
};

export async function route(req: IncomingMessage, res: ServerResponse) {
  setCors(res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  let url: URL;
  try {
    url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  } catch {
    sendJson(res, 400, { error: "INVALID_URL" });
    return;
  }

  const ctx: RequestContext = {
    url,
    ip: getIp(req),
    params: {}
  };

  const routes: Array<[string, RegExp, ApiHandler]> = [
    ["GET", /^\/api\/health$/, health],
    ["GET", /^\/api\/products$/, products],
    ["POST", /^\/api\/checkout$/, checkout],
    ["POST", /^\/api\/xendit\/webhook$/, xenditWebhook],
    ["POST", /^\/api\/wallet\/topup$/, walletTopup],
    ["GET", /^\/api\/wallet\/ledger$/, walletLedger],
    ["GET", /^\/api\/invoices\/([^/]+)$/, invoice],
    ["POST", /^\/api\/invoices\/([^/]+)\/receipt$/, sendInvoiceReceipt],
    ["GET", /^\/api\/reviews$/, publicReviews],
    ["POST", /^\/api\/reviews$/, createReview],
    ["GET", /^\/api\/account\/reviews$/, accountReviews],
    ["POST", /^\/api\/warranty-claims$/, createWarrantyClaim],
    ["POST", /^\/api\/admin\/login$/, adminLogin],
    ["GET", /^\/api\/admin\/products$/, adminProducts],
    ["GET", /^\/api\/admin\/orders$/, adminOrders],
    ["GET", /^\/api\/admin\/warranty-claims$/, adminWarrantyClaims],
    ["GET", /^\/api\/admin\/analytics$/, adminAnalytics],
    ["GET", /^\/api\/admin\/wallet-summary$/, adminWalletSummary],
    ["GET", /^\/api\/admin\/wallet-ledger$/, adminWalletLedger],
    ["POST", /^\/api\/admin\/wallet-adjustments$/, adminWalletAdjustment],
    ["GET", /^\/api\/admin\/promos$/, adminPromos],
    ["POST", /^\/api\/admin\/promos$/, adminCreatePromo],
    ["PATCH", /^\/api\/admin\/promos\/([^/]+)$/, adminUpdatePromo],
    ["GET", /^\/api\/admin\/audit-logs$/, adminAuditLogs],
    ["POST", /^\/api\/admin\/stocks$/, adminStocks],
    ["POST", /^\/api\/admin\/products$/, adminCreateProduct],
    ["PATCH", /^\/api\/admin\/products\/([^/]+)$/, adminUpdateProduct],
    ["POST", /^\/api\/admin\/variants$/, adminCreateVariant],
    ["PATCH", /^\/api\/admin\/variants\/([^/]+)$/, adminUpdateVariant],
    ["POST", /^\/api\/admin\/orders\/([^/]+)\/replace-account$/, adminReplaceOrderAccounts],
    ["POST", /^\/api\/admin\/warranty-claims\/([^/]+)\/review$/, adminReviewWarranty],
    ["POST", /^\/api\/admin\/warranty-claims\/([^/]+)\/reject$/, adminRejectWarranty],
    ["POST", /^\/api\/admin\/warranty-claims\/([^/]+)\/refund$/, adminRefundWarranty],
    ["POST", /^\/api\/admin\/restock-alerts\/send$/, adminSendRestockAlerts]
  ];

  try {
    for (const [method, pattern, handler] of routes) {
      const match = url.pathname.match(pattern);
      if (req.method === method && match) {
        ctx.params = Object.fromEntries(match.slice(1).map((value, index) => [String(index), safeDecodePathParam(value)]));
        await handler(req, res, ctx);
        return;
      }
    }
  } catch (error) {
    const { status, message } = normalizeRouteError(error);
    if (status === 500) console.error(error);
    sendJson(res, status, { error: message });
    return;
  }

  sendJson(res, 404, { error: "NOT_FOUND" });
}

async function health(_req: IncomingMessage, res: ServerResponse) {
  sendJson(res, 200, { ok: true });
}

async function products(_req: IncomingMessage, res: ServerResponse) {
  const { data, error } = await adminDb
    .from("products")
    .select("*, product_variants(*)")
    .eq("is_active", true)
    .order("name");

  if (error) throw error;

  const { data: stockRows, error: stockError } = await adminDb
    .from("account_stocks")
    .select("product_variant_id,status")
    .eq("status", "AVAILABLE");
  if (stockError) throw stockError;

  const stockCounts = new Map<string, number>();
  for (const row of stockRows ?? []) {
    stockCounts.set(row.product_variant_id, (stockCounts.get(row.product_variant_id) ?? 0) + 1);
  }

  sendJson(res, 200, {
    products: (data ?? []).map((product: any) => ({
      ...product,
      variants: (product.product_variants ?? []).map((variant: any) => ({
        ...variant,
        stock: stockCounts.get(variant.id) ?? 0
      }))
    }))
  });
}

async function checkout(req: IncomingMessage, res: ServerResponse, ctx: RequestContext) {
  enforceRateLimit(ctx.ip, "checkout", 20, 60_000);
  const body = await readJson(req);
  const qty = Math.floor(Number(body.qty) || 1);
  const variantId = stringBody(body.variantId);
  const whatsapp = stringBody(body.whatsapp);
  const customerEmail = stringBody(body.email);
  const rawPromoCode = stringBody(body.promoCode);
  const promoCode = rawPromoCode ? normalizePromoCode(rawPromoCode) : null;
  const paymentMethod = stringBody(body.paymentMethod) || "XENDIT_INVOICE";

  if (!isSafeTextId(variantId)) return sendJson(res, 400, { error: "INVALID_VARIANT" });
  if (!Number.isInteger(qty) || qty < 1 || qty > 50) return sendJson(res, 400, { error: "INVALID_QTY" });
  if (rawPromoCode && !promoCode) return sendJson(res, 400, { error: "INVALID_PROMO" });
  if (!["XENDIT_INVOICE", "WALLET"].includes(paymentMethod)) return sendJson(res, 400, { error: "INVALID_PAYMENT_METHOD" });
  if (!isValidPhone(whatsapp)) return sendJson(res, 400, { error: "INVALID_WHATSAPP" });
  if (customerEmail && !isValidEmail(customerEmail)) return sendJson(res, 400, { error: "INVALID_EMAIL" });

  const user = await getUserFromBearer(req.headers.authorization);
  const pricing = await calculateCheckout(variantId, qty, promoCode, paymentMethod);
  const invoiceNumber = createInvoiceNumber();
  const orderId = uid("ord");
  const invoiceToken = randomToken(24);
  const history = [{ at: new Date().toISOString(), text: paymentMethod === "WALLET" ? "Invoice dibuat dan dibayar memakai saldo" : "Invoice dibuat" }];
  const expiredAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  if (paymentMethod === "WALLET") {
    if (!user) return sendJson(res, 401, { error: "AUTH_REQUIRED" });

    const { data, error } = await adminDb.rpc("create_wallet_order", {
      p_order_id: orderId,
      p_invoice_number: invoiceNumber,
      p_invoice_token: invoiceToken,
      p_user_id: user.id,
      p_product_id: pricing.product.id,
      p_product_name: pricing.product.name,
      p_variant_id: pricing.variant.id,
      p_variant_name: pricing.variant.name,
      p_qty: qty,
      p_customer_whatsapp: whatsapp,
      p_customer_email: customerEmail || user.email || "",
      p_subtotal: pricing.subtotal,
      p_discount: pricing.discount,
      p_payment_fee: pricing.paymentFee,
      p_total: pricing.total,
      p_promo_code: promoCode,
      p_history: history,
      p_expired_at: expiredAt
    });

    if (error) return sendRpcError(res, error.message);

    sendJson(res, 201, {
      invoice_number: invoiceNumber,
      invoice_token: invoiceToken,
      payment_status: "PAID",
      delivery_status: "DELIVERED",
      total: pricing.total,
      accounts: decryptDeliveredRows(data ?? [])
    });
    return;
  }

  assertXenditConfigured();
  let orderReserved = false;

  try {
    const { error: reserveError } = await adminDb.rpc("create_gateway_order_with_reservation", {
      p_order_id: orderId,
      p_invoice_number: invoiceNumber,
      p_invoice_token: invoiceToken,
      p_user_id: user?.id ?? null,
      p_product_id: pricing.product.id,
      p_product_name: pricing.product.name,
      p_variant_id: pricing.variant.id,
      p_variant_name: pricing.variant.name,
      p_qty: qty,
      p_customer_whatsapp: whatsapp,
      p_customer_email: customerEmail || user?.email || "",
      p_subtotal: pricing.subtotal,
      p_discount: pricing.discount,
      p_payment_fee: pricing.paymentFee,
      p_total: pricing.total,
      p_promo_code: promoCode,
      p_history: history,
      p_expired_at: expiredAt
    });
    if (reserveError) return sendRpcError(res, reserveError.message);
    orderReserved = true;

    const xenditInvoice = await createXenditInvoice(env.xenditSecretKey, {
      external_id: invoiceNumber,
      amount: pricing.total,
      description: `ProByte ${pricing.product.name} - ${pricing.variant.name}`,
      invoice_duration: 30 * 60,
      currency: "IDR",
      customer: {
        email: customerEmail || user?.email || undefined,
        mobile_number: whatsapp
      },
      success_redirect_url: `${env.publicAppUrl}/#invoice=${encodeURIComponent(invoiceNumber)}&token=${invoiceToken}`,
      failure_redirect_url: `${env.publicAppUrl}/#invoice=${encodeURIComponent(invoiceNumber)}`,
      metadata: {
        order_id: orderId,
        invoice_token: invoiceToken,
        type: "ORDER"
      }
    });
    const { error: updateError } = await adminDb
      .from("orders")
      .update({ xendit_invoice_id: xenditInvoice.id, xendit_invoice_url: xenditInvoice.invoice_url })
      .eq("id", orderId);
    if (updateError) throw updateError;

    sendJson(res, 201, {
      invoice_number: invoiceNumber,
      invoice_token: invoiceToken,
      payment_url: xenditInvoice.invoice_url,
      total: pricing.total
    });
  } catch (error) {
    if (orderReserved) {
      const { error: releaseError } = await adminDb.rpc("release_gateway_order_reservation", {
        p_order_id: orderId,
        p_payment_status: "FAILED",
        p_history_text: "Invoice gagal dibuat"
      });
      if (releaseError) console.error("Failed to release gateway reservation", releaseError);
    }
    throw error;
  }
}

async function xenditWebhook(req: IncomingMessage, res: ServerResponse) {
  assertXenditConfigured();
  if (!verifyXenditCallbackToken(headerMap(req), env.xenditWebhookToken)) {
    return sendJson(res, 401, { error: "INVALID_CALLBACK_TOKEN" });
  }

  const payload = (await readJson(req)) as XenditInvoiceWebhook & { data?: any; event?: string };
  const invoice = normalizeXenditPayload(payload);
  if (!invoice.externalId || !invoice.xenditInvoiceId) {
    return sendJson(res, 400, { error: "INVALID_WEBHOOK_PAYLOAD" });
  }
  const webhookId = req.headers["webhook-id"]?.toString() || `invoice-${invoice.xenditInvoiceId}-${invoice.status}-${invoice.paymentId ?? "none"}`;

  const { error: webhookError } = await adminDb.from("webhook_events").insert({
    id: uid("wh"),
    provider: "XENDIT",
    webhook_id: webhookId,
    external_id: invoice.externalId,
    event_type: payload.event ?? "invoice",
    status: "RECEIVED",
    payload_json: payload as Json
  });

  if (webhookError?.code === "23505") {
    const { data: existing, error: existingError } = await adminDb
      .from("webhook_events")
      .select("status")
      .eq("provider", "XENDIT")
      .eq("webhook_id", webhookId)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing?.status !== "FAILED") {
      return sendJson(res, 200, { ok: true, duplicate: true, status: existing?.status ?? "UNKNOWN" });
    }

    const { error: retryError } = await adminDb
      .from("webhook_events")
      .update({
        external_id: invoice.externalId,
        event_type: payload.event ?? "invoice",
        status: "RECEIVED",
        payload_json: payload as Json,
        processed_at: null
      })
      .eq("provider", "XENDIT")
      .eq("webhook_id", webhookId)
      .eq("status", "FAILED");
    if (retryError) throw retryError;
  }
  if (webhookError && webhookError.code !== "23505") throw webhookError;

  try {
    if (isPaidXenditInvoiceStatus({ status: invoice.status } as XenditInvoiceWebhook)) {
      if (invoice.externalId.startsWith("TOPUP-")) {
        await assertTopupWebhookMatches(invoice);
        await adminDb.rpc("settle_wallet_topup", {
          p_xendit_invoice_id: invoice.xenditInvoiceId,
          p_payment_reference: invoice.paymentId
        });
      } else {
        const order = await assertGatewayWebhookMatches(invoice);
        const { data, error } = await adminDb.rpc("mark_gateway_order_paid_and_deliver", {
          p_invoice_number: order.invoice_number,
          p_xendit_invoice_id: invoice.xenditInvoiceId,
          p_xendit_payment_id: invoice.paymentId
        });
        if (error) throw error;
        console.log("Delivered account count", Array.isArray(data) ? data.length : 0);
      }
    } else if (invoice.status === "EXPIRED" || invoice.status === "FAILED") {
      await markInvoiceExpiredOrFailed(invoice);
    }

    await adminDb.from("webhook_events").update({ status: "PROCESSED", processed_at: new Date().toISOString() }).eq("provider", "XENDIT").eq("webhook_id", webhookId);
    sendJson(res, 200, { ok: true });
  } catch (error) {
    await adminDb.from("webhook_events").update({ status: "FAILED", processed_at: new Date().toISOString() }).eq("provider", "XENDIT").eq("webhook_id", webhookId);
    throw error;
  }
}

async function walletTopup(req: IncomingMessage, res: ServerResponse, ctx: RequestContext) {
  enforceRateLimit(ctx.ip, "wallet_topup", 20, 60_000);
  assertXenditConfigured();
  const user = await requireUser(req, res);
  if (!user) return;

  const body = await readJson(req);
  const amount = Math.floor(Number(body.amount) || 0);
  if (amount < 10000) return sendJson(res, 400, { error: "MIN_TOPUP_10000" });

  const ledgerId = uid("wlt");
  const externalId = `TOPUP-${ledgerId}`;
  let ledgerInserted = false;

  try {
    const { error } = await adminDb.from("wallet_ledger").insert({
      id: ledgerId,
      user_id: user.id,
      kind: "TOPUP",
      amount,
      status: "PENDING",
      payment_reference: externalId,
      note: "Top up saldo via Xendit"
    });
    if (error) throw error;
    ledgerInserted = true;

    const invoice = await createXenditInvoice(env.xenditSecretKey, {
      external_id: externalId,
      amount,
      description: "Top up saldo ProByte",
      invoice_duration: 30 * 60,
      currency: "IDR",
      customer: { email: user.email ?? undefined },
      success_redirect_url: `${env.publicAppUrl}/#account`,
      failure_redirect_url: `${env.publicAppUrl}/#account`,
      metadata: { type: "TOPUP", ledger_id: ledgerId }
    });

    const { error: updateError } = await adminDb.from("wallet_ledger").update({ xendit_invoice_id: invoice.id }).eq("id", ledgerId);
    if (updateError) throw updateError;

    sendJson(res, 201, { id: ledgerId, payment_url: invoice.invoice_url, amount });
  } catch (error) {
    if (ledgerInserted) {
      await adminDb
        .from("wallet_ledger")
        .update({ status: "FAILED", note: "Top up gagal dibuat. Silakan ulangi." })
        .eq("id", ledgerId)
        .eq("status", "PENDING");
    }
    throw error;
  }
}

async function walletLedger(req: IncomingMessage, res: ServerResponse) {
  const user = await requireUser(req, res);
  if (!user) return;
  const { data, error } = await adminDb.from("wallet_ledger").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  if (error) throw error;
  sendJson(res, 200, { ledger: data ?? [] });
}

async function invoice(req: IncomingMessage, res: ServerResponse, ctx: RequestContext) {
  enforceRateLimit(ctx.ip, "invoice", 60, 60_000);
  const invoiceNumber = ctx.params[0];
  const token = ctx.url.searchParams.get("token") ?? "";

  if (!isSafeInvoiceNumber(invoiceNumber)) return sendJson(res, 400, { error: "INVALID_INVOICE" });
  if (token && !isSafeToken(token)) return sendJson(res, 403, { error: "INVALID_INVOICE_TOKEN" });

  const user = await getUserFromBearer(req.headers.authorization);
  const { data: order, error } = await adminDb.from("orders").select("*").eq("invoice_number", invoiceNumber).maybeSingle();
  if (error) throw error;
  if (!order) return sendJson(res, 404, { error: "INVOICE_NOT_FOUND" });

  const authorized = Boolean((user && order.user_id === user.id) || (token && order.invoice_token === token));
  const response: Json = { order: publicOrder(order, authorized) };

  if (authorized && order.payment_status === "PAID" && order.delivery_status === "DELIVERED") {
    const { data, error: accountsError } = await adminDb.from("delivered_accounts").select("*").eq("order_id", order.id);
    if (accountsError) throw accountsError;
    response.accounts = decryptDeliveredRows(data ?? []);
  }

  sendJson(res, 200, response);
}

async function sendInvoiceReceipt(req: IncomingMessage, res: ServerResponse, ctx: RequestContext) {
  enforceRateLimit(ctx.ip, "invoice_receipt", 10, 60_000);
  const invoiceNumber = ctx.params[0];
  const body = await readJson(req);
  const token = stringBody(body.invoiceToken);

  if (!isSafeInvoiceNumber(invoiceNumber)) return sendJson(res, 400, { error: "INVALID_INVOICE" });
  if (token && !isSafeToken(token)) return sendJson(res, 403, { error: "INVALID_INVOICE_TOKEN" });

  const user = await getUserFromBearer(req.headers.authorization);
  const { data: order, error } = await adminDb.from("orders").select("*").eq("invoice_number", invoiceNumber).maybeSingle();
  if (error) throw error;
  if (!order) return sendJson(res, 404, { error: "INVOICE_NOT_FOUND" });

  const authorized = Boolean((user && order.user_id === user.id) || (token && safeStringEqual(token, order.invoice_token)));
  if (!authorized) return sendJson(res, 403, { error: "FORBIDDEN" });
  if (!order.customer_email) return sendJson(res, 400, { error: "CUSTOMER_EMAIL_REQUIRED" });

  let accountRows: any[] = [];
  if (order.payment_status === "PAID" && order.delivery_status === "DELIVERED") {
    const { data, error: accountsError } = await adminDb.from("delivered_accounts").select("*").eq("order_id", order.id);
    if (accountsError) throw accountsError;
    accountRows = data ?? [];
  }

  const accounts = decryptDeliveredRows(accountRows);
  const invoiceUrl = `${env.publicAppUrl}/#invoice=${encodeURIComponent(order.invoice_number)}&token=${order.invoice_token}`;
  const accountHtml = accounts.length
    ? `<h3>Detail akun</h3><ul>${accounts
        .map((account) => `<li><strong>${escapeHtml(account.email)}</strong><br/>Password: ${escapeHtml(account.password)}</li>`)
        .join("")}</ul>`
    : "<p>Detail akun akan muncul setelah pembayaran berhasil dan delivery selesai.</p>";

  const sent = await sendEmailTo(
    order.customer_email,
    `Invoice ProByte ${order.invoice_number}`,
    `<p>Halo, berikut ringkasan transaksi ProByte.</p>
    <ul>
      <li>Invoice: <strong>${escapeHtml(order.invoice_number)}</strong></li>
      <li>Produk: ${escapeHtml(order.product_name)} - ${escapeHtml(order.variant_name)}</li>
      <li>Status pembayaran: ${escapeHtml(order.payment_status)}</li>
      <li>Status pengiriman: ${escapeHtml(order.delivery_status)}</li>
      <li>Total: Rp ${Number(order.total).toLocaleString("id-ID")}</li>
    </ul>
    <p>Link invoice: <a href="${escapeHtml(invoiceUrl)}">${escapeHtml(invoiceUrl)}</a></p>
    ${accountHtml}
    <p>Simpan email ini untuk cek invoice dan klaim garansi.</p>`
  );

  if (!sent) return sendJson(res, 503, { error: "EMAIL_CONFIGURATION_REQUIRED" });
  sendJson(res, 200, { sent: true });
}

async function publicReviews(_req: IncomingMessage, res: ServerResponse, ctx: RequestContext) {
  const limit = Math.min(Math.max(Math.floor(Number(ctx.url.searchParams.get("limit")) || 12), 1), 50);
  const productId = ctx.url.searchParams.get("productId")?.trim();
  if (productId && !isSafeTextId(productId)) return sendJson(res, 400, { error: "INVALID_REQUEST" });

  let query = adminDb
    .from("product_reviews")
    .select("id,product_id,product_name,variant_name,rating,comment,display_name,created_at")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (productId) query = query.eq("product_id", productId);

  const { data, error } = await query;
  if (isMissingProductReviewsTable(error)) return sendJson(res, 200, { reviews: [] });
  if (error) throw error;
  sendJson(res, 200, { reviews: data ?? [] });
}

async function accountReviews(req: IncomingMessage, res: ServerResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  const { data, error } = await adminDb
    .from("product_reviews")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (isMissingProductReviewsTable(error)) return sendJson(res, 200, { reviews: [] });
  if (error) throw error;
  sendJson(res, 200, { reviews: data ?? [] });
}

async function createReview(req: IncomingMessage, res: ServerResponse, ctx: RequestContext) {
  enforceRateLimit(ctx.ip, "review", 10, 60_000);
  const user = await requireUser(req, res);
  if (!user) return;

  const body = await readJson(req);
  const orderId = stringBody(body.orderId);
  const rating = Math.floor(Number(body.rating));
  const comment = stringBody(body.comment).replace(/\s+/g, " ");
  if (!isSafeTextId(orderId)) return sendJson(res, 400, { error: "INVALID_REVIEW" });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return sendJson(res, 400, { error: "INVALID_RATING" });
  if (comment.length < 4 || comment.length > 800) return sendJson(res, 400, { error: "INVALID_REVIEW_COMMENT" });

  const { data: order, error } = await adminDb
    .from("orders")
    .select("id,user_id,invoice_number,product_id,product_name,variant_name,payment_status,delivery_status")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;
  if (!order) return sendJson(res, 404, { error: "INVOICE_NOT_FOUND" });
  if (order.user_id !== user.id) return sendJson(res, 403, { error: "FORBIDDEN" });
  if (order.payment_status !== "PAID" || order.delivery_status !== "DELIVERED") {
    return sendJson(res, 400, { error: "REVIEW_NOT_ALLOWED" });
  }

  const { data: existing, error: existingError } = await adminDb.from("product_reviews").select("id").eq("order_id", order.id).maybeSingle();
  if (isMissingProductReviewsTable(existingError)) return sendJson(res, 503, { error: "REVIEW_SCHEMA_REQUIRED" });
  if (existingError) throw existingError;

  const now = new Date().toISOString();
  const displayName = publicDisplayName(user);
  const { data, error: upsertError } = await adminDb
    .from("product_reviews")
    .upsert(
      {
        id: existing?.id ?? uid("rev"),
        order_id: order.id,
        user_id: user.id,
        invoice_number: order.invoice_number,
        product_id: order.product_id,
        product_name: order.product_name,
        variant_name: order.variant_name,
        rating,
        comment,
        display_name: displayName,
        is_public: true,
        updated_at: now
      },
      { onConflict: "order_id" }
    )
    .select("*")
    .single();
  if (isMissingProductReviewsTable(upsertError)) return sendJson(res, 503, { error: "REVIEW_SCHEMA_REQUIRED" });
  if (upsertError) throw upsertError;

  sendJson(res, existing ? 200 : 201, { review: data });
}

async function createWarrantyClaim(req: IncomingMessage, res: ServerResponse, ctx: RequestContext) {
  enforceRateLimit(ctx.ip, "warranty", 15, 60_000);
  const user = await requireUser(req, res);
  if (!user) return;
  const body = await readJson(req);
  const invoiceNumber = stringBody(body.invoiceNumber);
  const invoiceToken = stringBody(body.invoiceToken);
  const issueSummary = stringBody(body.issueSummary);
  if (!isSafeInvoiceNumber(invoiceNumber)) return sendJson(res, 400, { error: "INVALID_INVOICE" });
  if (invoiceToken && !isSafeToken(invoiceToken)) return sendJson(res, 403, { error: "INVALID_INVOICE_TOKEN" });
  if (issueSummary.length < 8) return sendJson(res, 400, { error: "ISSUE_TOO_SHORT" });
  if (issueSummary.length > 1000) return sendJson(res, 400, { error: "INVALID_REQUEST" });

  const { data: order, error } = await adminDb.from("orders").select("*").eq("invoice_number", invoiceNumber).maybeSingle();
  if (error) throw error;
  if (!order || order.payment_status !== "PAID") return sendJson(res, 400, { error: "INVALID_INVOICE" });
  if (order.user_id && order.user_id !== user.id) return sendJson(res, 403, { error: "FORBIDDEN" });
  if (!order.user_id && (!invoiceToken || !safeStringEqual(invoiceToken, order.invoice_token))) {
    return sendJson(res, 403, { error: "INVALID_INVOICE_TOKEN" });
  }

  const claim = {
    id: uid("wrn"),
    invoice_number: order.invoice_number,
    user_id: user.id,
    customer_whatsapp: order.customer_whatsapp,
    issue_summary: issueSummary,
    status: "OPEN"
  };
  const { data, error: insertError } = await adminDb.from("warranty_claims").insert(claim).select("*").single();
  if (insertError) throw insertError;
  sendJson(res, 201, { claim: data });
}

async function adminLogin(req: IncomingMessage, res: ServerResponse, ctx: RequestContext) {
  enforceRateLimit(ctx.ip, "admin_login", 8, 60_000);
  const body = await readJson(req);
  const username = stringBody(body.username).trim();
  const password = stringBody(body.password);

  if (username.length > 80 || password.length > 200) return sendJson(res, 401, { error: "INVALID_CREDENTIALS" });

  const { data: admin } = await adminDb.from("admin_users").select("*").eq("username", username).eq("is_active", true).maybeSingle();
  const valid = admin ? await verifyPassword(password, admin.password_hash) : false;
  if (!valid || !admin) return sendJson(res, 401, { error: "INVALID_CREDENTIALS" });

  await adminDb.from("admin_users").update({ last_login_at: new Date().toISOString() }).eq("id", admin.id);
  sendJson(res, 200, { token: signAdminToken(admin.id, admin.username), admin: { id: admin.id, username: admin.username } });
}

async function adminProducts(req: IncomingMessage, res: ServerResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const { data, error } = await adminDb.from("products").select("*, product_variants(*)").order("name");
  if (error) throw error;

  const { data: stockRows, error: stockError } = await adminDb
    .from("account_stocks")
    .select("product_variant_id,status")
    .eq("status", "AVAILABLE");
  if (stockError) throw stockError;

  const stockCounts = new Map<string, number>();
  for (const row of stockRows ?? []) stockCounts.set(row.product_variant_id, (stockCounts.get(row.product_variant_id) ?? 0) + 1);

  sendJson(res, 200, {
    products: (data ?? []).map((product: any) => ({
      ...product,
      variants: (product.product_variants ?? []).map((variant: any) => ({
        ...variant,
        stock: stockCounts.get(variant.id) ?? 0
      }))
    }))
  });
}

async function adminOrders(req: IncomingMessage, res: ServerResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { data, error } = await adminDb.from("orders").select("*").order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  sendJson(res, 200, { orders: data ?? [] });
}

async function adminAnalytics(req: IncomingMessage, res: ServerResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const { data: orders, error } = await adminDb.from("orders").select("*");
  if (error) throw error;
  const { data: stockRows, error: stockError } = await adminDb.from("account_stocks").select("product_variant_id,status");
  if (stockError) throw stockError;
  const paidOrders = (orders ?? []).filter((order: any) => order.payment_status === "PAID" || order.payment_status === "REFUNDED");
  const totalRevenue = paidOrders.reduce((sum: number, order: any) => sum + Number(order.total), 0);
  const delivered = (orders ?? []).filter((order: any) => order.delivery_status === "DELIVERED").length;
  const conversion = orders?.length ? Math.round((delivered / orders.length) * 100) : 0;
  const availableStock = (stockRows ?? []).filter((stock: any) => stock.status === "AVAILABLE").length;
  const waitingPayment = (orders ?? []).filter((order: any) => order.payment_status === "WAITING_PAYMENT").length;
  const needRestock = (orders ?? []).filter((order: any) => order.delivery_status === "NEED_RESTOCK").length;
  const today = new Date().toISOString().slice(0, 10);
  const todayRevenue = paidOrders
    .filter((order: any) => String(order.paid_at ?? order.created_at).slice(0, 10) === today)
    .reduce((sum: number, order: any) => sum + Number(order.total), 0);
  sendJson(res, 200, { totalRevenue, todayRevenue, conversion, availableStock, orderCount: orders?.length ?? 0, waitingPayment, needRestock });
}

async function adminWalletSummary(req: IncomingMessage, res: ServerResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const { data, error } = await adminDb
    .from("wallet_ledger")
    .select("id,user_id,kind,amount,status,created_at,settled_at")
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) throw error;

  const summaries = new Map<
    string,
    {
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
    }
  >();

  for (const row of data ?? []) {
    const userId = String(row.user_id);
    const existing =
      summaries.get(userId) ??
      {
        user_id: userId,
        balance: 0,
        settled_credit: 0,
        settled_debit: 0,
        topup: 0,
        refund: 0,
        adjustment: 0,
        payment: 0,
        pending_topup: 0,
        failed_topup: 0,
        last_activity: String(row.created_at)
      };
    const amount = Number(row.amount) || 0;
    const kind = String(row.kind);
    const status = String(row.status);
    if (String(row.created_at).localeCompare(existing.last_activity) > 0) existing.last_activity = String(row.created_at);

    if (status === "SETTLED") {
      if (kind === "PAYMENT") {
        existing.payment += amount;
        existing.settled_debit += amount;
        existing.balance -= amount;
      } else {
        if (kind === "TOPUP") existing.topup += amount;
        if (kind === "REFUND") existing.refund += amount;
        if (kind === "ADJUSTMENT") existing.adjustment += amount;
        existing.settled_credit += amount;
        existing.balance += amount;
      }
    }
    if (kind === "TOPUP" && status === "PENDING") existing.pending_topup += amount;
    if (kind === "TOPUP" && status === "FAILED") existing.failed_topup += amount;
    summaries.set(userId, existing);
  }

  sendJson(res, 200, {
    customers: Array.from(summaries.values()).sort((left, right) => right.last_activity.localeCompare(left.last_activity))
  });
}

async function adminWalletLedger(req: IncomingMessage, res: ServerResponse, ctx: RequestContext) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const limit = Math.min(Math.max(Math.floor(Number(ctx.url.searchParams.get("limit")) || 300), 1), 1000);
  const { data, error } = await adminDb
    .from("wallet_ledger")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  sendJson(res, 200, { ledger: data ?? [] });
}

async function adminWalletAdjustment(req: IncomingMessage, res: ServerResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const body = await readJson(req);
  const userId = stringBody(body.userId);
  const direction = (stringBody(body.direction) || stringBody(body.mode)).toUpperCase();
  const amount = Math.floor(Number(body.amount) || 0);
  const note = stringBody(body.note).slice(0, 500);

  if (!isUuid(userId)) return sendJson(res, 400, { error: "WALLET_USER_REQUIRED" });
  if (!["CREDIT", "DEBIT"].includes(direction) || amount <= 0) {
    return sendJson(res, 400, { error: "INVALID_WALLET_ADJUSTMENT" });
  }

  const { data: targetUser, error: userError } = await adminDb.auth.admin.getUserById(userId);
  if (userError || !targetUser.user) return sendJson(res, 404, { error: "WALLET_USER_NOT_FOUND" });

  const { data, error } = await adminDb.rpc("admin_adjust_wallet", {
    p_admin_id: admin.id,
    p_user_id: userId,
    p_direction: direction,
    p_amount: amount,
    p_note: note
  });
  if (error?.message.includes("INSUFFICIENT_BALANCE")) return sendJson(res, 409, { error: "INSUFFICIENT_BALANCE" });
  if (error?.message.includes("INVALID_WALLET_ADJUSTMENT")) return sendJson(res, 400, { error: "INVALID_WALLET_ADJUSTMENT" });
  if (error) throw error;

  sendJson(res, 201, { ledger: data });
}

async function adminPromos(req: IncomingMessage, res: ServerResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { data, error } = await adminDb.from("promo_codes").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  sendJson(res, 200, { promos: data ?? [] });
}

async function adminCreatePromo(req: IncomingMessage, res: ServerResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const body = await readJson(req);
  const row = promoPayload(body);
  if (!isValidPromoPayload(row)) return sendJson(res, 400, { error: "INVALID_PROMO" });
  const { data, error } = await adminDb.from("promo_codes").insert(row).select("*").single();
  if (error) throw error;
  await audit(admin.id, "CREATE_PROMO", "promo", row.code, {});
  sendJson(res, 201, { promo: data });
}

async function adminUpdatePromo(req: IncomingMessage, res: ServerResponse, ctx: RequestContext) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const body = await readJson(req);
  const code = ctx.params[0].toUpperCase();
  if (!isSafePromoCode(code)) return sendJson(res, 400, { error: "INVALID_PROMO" });
  const row = promoPayload(body, true);
  if (!isValidPromoPayload(row, true)) return sendJson(res, 400, { error: "INVALID_PROMO" });
  const { data, error } = await adminDb.from("promo_codes").update(row).eq("code", code).select("*").single();
  if (error) throw error;
  await audit(admin.id, "UPDATE_PROMO", "promo", code, {});
  sendJson(res, 200, { promo: data });
}

async function adminAuditLogs(req: IncomingMessage, res: ServerResponse, ctx: RequestContext) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const limit = Math.min(Math.max(Math.floor(Number(ctx.url.searchParams.get("limit")) || 200), 1), 500);
  const { data, error } = await adminDb
    .from("audit_logs")
    .select("id,admin_id,action,entity_type,entity_id,metadata_json,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  sendJson(res, 200, { logs: data ?? [] });
}

async function adminWarrantyClaims(req: IncomingMessage, res: ServerResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { data, error } = await adminDb.from("warranty_claims").select("*").order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  sendJson(res, 200, { claims: data ?? [] });
}

async function adminStocks(req: IncomingMessage, res: ServerResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const body = await readJson(req);
  const variantId = stringBody(body.variantId);
  if (!isSafeTextId(variantId)) return sendJson(res, 400, { error: "INVALID_VARIANT" });
  const rows = Array.isArray(body.rows) ? body.rows : [];
  const inserts = rows
    .map((row: any) => ({ email: String(row.email ?? "").trim(), password: String(row.password ?? "") }))
    .filter((row: { email: string; password: string }) => isValidEmail(row.email) && row.password.length >= 3)
    .map((row: { email: string; password: string }) => ({
      id: uid("stk"),
      product_variant_id: variantId,
      account_email_encrypted: encryptSecret(row.email),
      account_password_encrypted: encryptSecret(row.password),
      credential_hash: credentialHash(variantId, row.email, row.password),
      display_hint: maskEmail(row.email),
      status: "AVAILABLE"
    }));

  if (!inserts.length) return sendJson(res, 400, { error: "NO_VALID_STOCK_ROWS" });

  const { data, error } = await adminDb.from("account_stocks").insert(inserts).select("id");
  if (error?.code === "23505") return sendJson(res, 409, { error: "DUPLICATE_STOCK_DETECTED" });
  if (error) throw error;

  await audit(admin.id, "ADD_STOCK", "variant", variantId, { count: data?.length ?? inserts.length });
  sendJson(res, 201, { inserted: data?.length ?? inserts.length });
}

async function adminCreateProduct(req: IncomingMessage, res: ServerResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const body = await readJson(req);
  const row = productPayload(body);
  if (!isValidProductPayload(row)) return sendJson(res, 400, { error: "INVALID_REQUEST" });
  const { data, error } = await adminDb.from("products").insert(row).select("*").single();
  if (error) throw error;
  await audit(admin.id, "CREATE_PRODUCT", "product", row.id, {});
  sendJson(res, 201, { product: data });
}

async function adminUpdateProduct(req: IncomingMessage, res: ServerResponse, ctx: RequestContext) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const body = await readJson(req);
  if (!isSafeTextId(ctx.params[0])) return sendJson(res, 400, { error: "INVALID_REQUEST" });
  const row = productPayload(body, true);
  if (!isValidProductPayload(row, true)) return sendJson(res, 400, { error: "INVALID_REQUEST" });
  const { data, error } = await adminDb.from("products").update(row).eq("id", ctx.params[0]).select("*").single();
  if (error) throw error;
  await audit(admin.id, "UPDATE_PRODUCT", "product", ctx.params[0], {});
  sendJson(res, 200, { product: data });
}

async function adminCreateVariant(req: IncomingMessage, res: ServerResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const body = await readJson(req);
  const row = variantPayload(body);
  if (!isValidVariantPayload(row)) return sendJson(res, 400, { error: "INVALID_VARIANT" });
  const { data, error } = await adminDb.from("product_variants").insert(row).select("*").single();
  if (error) throw error;
  await audit(admin.id, "CREATE_VARIANT", "variant", row.id, {});
  sendJson(res, 201, { variant: data });
}

async function adminUpdateVariant(req: IncomingMessage, res: ServerResponse, ctx: RequestContext) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const body = await readJson(req);
  if (!isSafeTextId(ctx.params[0])) return sendJson(res, 400, { error: "INVALID_VARIANT" });
  const row = variantPayload(body, true);
  if (!isValidVariantPayload(row, true)) return sendJson(res, 400, { error: "INVALID_VARIANT" });
  const { data, error } = await adminDb.from("product_variants").update(row).eq("id", ctx.params[0]).select("*").single();
  if (error) throw error;
  await audit(admin.id, "UPDATE_VARIANT", "variant", ctx.params[0], {});
  sendJson(res, 200, { variant: data });
}

async function adminReplaceOrderAccounts(req: IncomingMessage, res: ServerResponse, ctx: RequestContext) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const invoiceNumber = ctx.params[0];
  if (!isSafeInvoiceNumber(invoiceNumber)) return sendJson(res, 400, { error: "INVALID_INVOICE" });
  const { data, error } = await adminDb.rpc("replace_order_accounts", {
    p_invoice_number: invoiceNumber,
    p_admin_id: admin.id
  });
  if (error?.message.includes("ORDER_NOT_FOUND")) return sendJson(res, 404, { error: "ORDER_NOT_FOUND" });
  if (error?.message.includes("REPLACEMENT_NOT_ALLOWED")) return sendJson(res, 400, { error: "REPLACEMENT_NOT_ALLOWED" });
  if (error?.message.includes("REPLACEMENT_NOT_AVAILABLE")) return sendJson(res, 409, { error: "REPLACEMENT_NOT_AVAILABLE" });
  if (error) throw error;
  sendJson(res, 200, { replaced: true, accounts: decryptDeliveredRows(data ?? []) });
}

async function adminReviewWarranty(req: IncomingMessage, res: ServerResponse, ctx: RequestContext) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const claimId = ctx.params[0];
  if (!isSafeTextId(claimId)) return sendJson(res, 400, { error: "INVALID_CLAIM" });
  const { data, error } = await adminDb
    .from("warranty_claims")
    .update({ status: "IN_REVIEW" })
    .eq("id", claimId)
    .in("status", ["OPEN", "IN_REVIEW"])
    .select("*")
    .single();
  if (error) throw error;
  await audit(admin.id, "REVIEW_WARRANTY_CLAIM", "warranty", claimId, { invoiceNumber: data.invoice_number });
  sendJson(res, 200, { claim: data });
}

async function adminRejectWarranty(req: IncomingMessage, res: ServerResponse, ctx: RequestContext) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const claimId = ctx.params[0];
  if (!isSafeTextId(claimId)) return sendJson(res, 400, { error: "INVALID_CLAIM" });
  const { data, error } = await adminDb
    .from("warranty_claims")
    .update({ status: "REJECTED", resolved_at: new Date().toISOString() })
    .eq("id", claimId)
    .in("status", ["OPEN", "IN_REVIEW"])
    .select("*")
    .single();
  if (error) throw error;
  await audit(admin.id, "REJECT_WARRANTY_CLAIM", "warranty", claimId, { invoiceNumber: data.invoice_number });
  sendJson(res, 200, { claim: data });
}

async function adminRefundWarranty(req: IncomingMessage, res: ServerResponse, ctx: RequestContext) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const claimId = ctx.params[0];
  if (!isSafeTextId(claimId)) return sendJson(res, 400, { error: "INVALID_CLAIM" });
  const { data, error } = await adminDb.rpc("refund_warranty_to_wallet", {
    p_claim_id: claimId,
    p_admin_id: admin.id
  });
  if (error?.message.includes("CLAIM_NOT_FOUND")) return sendJson(res, 404, { error: "CLAIM_NOT_FOUND" });
  if (error?.message.includes("INVALID_CLAIM")) return sendJson(res, 400, { error: "INVALID_CLAIM" });
  if (error) throw error;
  const refund = Array.isArray(data) ? data[0] : data;
  sendJson(res, 200, { refunded: true, amount: refund?.refund_amount ?? 0, invoice_number: refund?.invoice_number });
}

async function adminSendRestockAlerts(req: IncomingMessage, res: ServerResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const alerts = await collectLowStockAlerts();
  if (!alerts.length) return sendJson(res, 200, { sent: false, alerts: [] });

  const html = `<p>Stok menipis:</p><ul>${alerts.map((alert) => `<li>${alert.product_name} - ${alert.variant_name}: ${alert.stock}/${alert.threshold}</li>`).join("")}</ul>`;
  const sent = await sendEmail("Restock alert ProByte", html);
  for (const alert of alerts) {
    await adminDb.from("restock_alerts").insert({
      id: uid("rst"),
      product_variant_id: alert.variant_id,
      threshold: alert.threshold,
      current_stock: alert.stock,
      admin_email: env.adminAlertEmail,
      status: sent ? "SENT" : "PENDING",
      sent_at: sent ? new Date().toISOString() : null
    });
  }
  await audit(admin.id, "SEND_RESTOCK_ALERT", "stock", "low_stock", { count: alerts.length, sent });
  sendJson(res, 200, { sent, alerts });
}

async function assertGatewayWebhookMatches(invoice: NormalizedXenditInvoice) {
  const { data: order, error } = await adminDb
    .from("orders")
    .select("id,invoice_number,xendit_invoice_id,total")
    .eq("invoice_number", invoice.externalId)
    .maybeSingle();
  if (error) throw error;
  if (!order) throw httpError(400, "WEBHOOK_ORDER_NOT_FOUND");
  if (order.xendit_invoice_id !== invoice.xenditInvoiceId) throw httpError(400, "WEBHOOK_INVOICE_MISMATCH");
  assertWebhookAmount(Number(order.total), invoice);
  return order as { id: string; invoice_number: string; xendit_invoice_id: string; total: number };
}

async function assertTopupWebhookMatches(invoice: NormalizedXenditInvoice) {
  let { data: ledger, error } = await adminDb
    .from("wallet_ledger")
    .select("id,kind,amount,status,payment_reference,xendit_invoice_id")
    .eq("xendit_invoice_id", invoice.xenditInvoiceId)
    .eq("kind", "TOPUP")
    .maybeSingle();
  if (error) throw error;
  if (!ledger) {
    const fallback = await adminDb
      .from("wallet_ledger")
      .select("id,kind,amount,status,payment_reference,xendit_invoice_id")
      .eq("payment_reference", invoice.externalId)
      .eq("kind", "TOPUP")
      .maybeSingle();
    if (fallback.error) throw fallback.error;
    ledger = fallback.data;
  }
  if (!ledger) throw httpError(400, "WEBHOOK_TOPUP_NOT_FOUND");
  if (ledger.status === "PENDING" && ledger.payment_reference !== invoice.externalId) throw httpError(400, "WEBHOOK_INVOICE_MISMATCH");
  if (ledger.xendit_invoice_id && ledger.xendit_invoice_id !== invoice.xenditInvoiceId) throw httpError(400, "WEBHOOK_INVOICE_MISMATCH");
  assertWebhookAmount(Number(ledger.amount), invoice);
  if (!ledger.xendit_invoice_id) {
    const { error: updateError } = await adminDb
      .from("wallet_ledger")
      .update({ xendit_invoice_id: invoice.xenditInvoiceId })
      .eq("id", ledger.id)
      .is("xendit_invoice_id", null);
    if (updateError) throw updateError;
  }
}

async function markInvoiceExpiredOrFailed(invoice: NormalizedXenditInvoice) {
  if (invoice.externalId.startsWith("TOPUP-")) {
    await adminDb
      .from("wallet_ledger")
      .update({ status: "FAILED" })
      .eq("xendit_invoice_id", invoice.xenditInvoiceId)
      .eq("payment_reference", invoice.externalId)
      .eq("status", "PENDING");
    return;
  }

  const { data: order, error } = await adminDb
    .from("orders")
    .select("id")
    .eq("invoice_number", invoice.externalId)
    .eq("xendit_invoice_id", invoice.xenditInvoiceId)
    .maybeSingle();
  if (error) throw error;
  if (!order) throw httpError(400, "WEBHOOK_ORDER_NOT_FOUND");

  const { error: releaseError } = await adminDb.rpc("release_gateway_order_reservation", {
    p_order_id: order.id,
    p_payment_status: invoice.status,
    p_history_text: invoice.status === "EXPIRED" ? "Invoice expired dari Xendit" : "Invoice gagal dari Xendit"
  });
  if (releaseError) throw releaseError;
}

function assertWebhookAmount(expectedAmount: number, invoice: NormalizedXenditInvoice) {
  const receivedAmount = invoice.paidAmount ?? invoice.amount;
  if (receivedAmount === null || receivedAmount !== expectedAmount) {
    throw httpError(400, "WEBHOOK_AMOUNT_MISMATCH");
  }
}

async function calculateCheckout(variantId: string, qty: number, promoCode: string | null, paymentMethod: string) {
  const { data: variant, error } = await adminDb
    .from("product_variants")
    .select("*, products(*)")
    .eq("id", variantId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  if (!variant || !variant.products?.is_active) throw httpError(400, "INVALID_VARIANT");

  const { count, error: countError } = await adminDb
    .from("account_stocks")
    .select("id", { count: "exact", head: true })
    .eq("product_variant_id", variantId)
    .eq("status", "AVAILABLE");
  if (countError) throw countError;
  if ((count ?? 0) < qty) throw httpError(409, "INSUFFICIENT_STOCK");

  const subtotal = Number(variant.sell_price) * qty;
  let discount = 0;
  if (promoCode) {
    const promo = await getValidPromo(promoCode, subtotal);
    if (!promo) throw httpError(400, "INVALID_PROMO");
    const raw = promo.type === "PERCENT" ? Math.floor((subtotal * Number(promo.value)) / 100) : Number(promo.value);
    discount = Math.min(raw, promo.max_discount ?? raw, subtotal);
  }

  const payableSubtotal = Math.max(subtotal - discount, 0);
  const paymentFee = paymentMethod === "WALLET" || payableSubtotal === 0 ? 0 : Math.ceil(payableSubtotal * 0.012) + 750;
  return {
    product: variant.products,
    variant,
    subtotal,
    discount,
    paymentFee,
    total: payableSubtotal + paymentFee
  };
}

async function getValidPromo(code: string, subtotal: number) {
  const { data, error } = await adminDb
    .from("promo_codes")
    .select("*")
    .eq("code", code)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (subtotal < Number(data.min_subtotal)) return null;
  if (data.usage_limit !== null && Number(data.used_count) >= Number(data.usage_limit)) return null;
  const now = Date.now();
  if (data.starts_at && new Date(data.starts_at).getTime() > now) return null;
  if (data.ends_at && new Date(data.ends_at).getTime() < now) return null;
  return data;
}

async function requireUser(req: IncomingMessage, res: ServerResponse) {
  const user = await getUserFromBearer(req.headers.authorization);
  if (!user) {
    sendJson(res, 401, { error: "AUTH_REQUIRED" });
    return null;
  }
  return user;
}

async function requireAdmin(req: IncomingMessage, res: ServerResponse) {
  const token = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice("Bearer ".length) : "";
  const tokenAdmin = verifyAdminToken(token);
  if (!tokenAdmin) {
    sendJson(res, 401, { error: "ADMIN_AUTH_REQUIRED" });
    return null;
  }

  const { data: admin, error } = await adminDb.from("admin_users").select("id,username").eq("id", tokenAdmin.id).eq("is_active", true).maybeSingle();
  if (error) throw error;
  if (!admin) {
    sendJson(res, 401, { error: "ADMIN_AUTH_REQUIRED" });
    return null;
  }
  return admin as AdminIdentity;
}

async function audit(adminId: string, action: string, entityType: string, entityId: string, metadata: Json) {
  await adminDb.from("audit_logs").insert({
    id: uid("aud"),
    admin_id: adminId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata_json: metadata
  });
}

async function collectLowStockAlerts() {
  const { data: variants, error } = await adminDb.from("product_variants").select("*, products(name)").eq("is_active", true);
  if (error) throw error;
  const { data: stocks, error: stockError } = await adminDb.from("account_stocks").select("product_variant_id,status").eq("status", "AVAILABLE");
  if (stockError) throw stockError;
  const counts = new Map<string, number>();
  for (const stock of stocks ?? []) counts.set(stock.product_variant_id, (counts.get(stock.product_variant_id) ?? 0) + 1);
  return (variants ?? [])
    .map((variant: any) => ({
      variant_id: variant.id,
      variant_name: variant.name,
      product_name: variant.products?.name ?? variant.product_id,
      threshold: Number(variant.low_stock_threshold),
      stock: counts.get(variant.id) ?? 0
    }))
    .filter((alert) => alert.stock <= alert.threshold);
}

async function sendEmail(subject: string, html: string) {
  if (!env.adminAlertEmail) return false;
  return sendEmailTo(env.adminAlertEmail, subject, html);
}

async function sendEmailTo(to: string, subject: string, html: string) {
  if (env.resendApiKey && (env.emailFrom || env.smtpUser) && to) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: env.emailFrom || env.smtpUser,
        to,
        subject,
        html
      })
    });
    return response.ok;
  }

  if (isCloudflareWorkerRuntime()) return false;
  if (!env.smtpHost || !env.smtpUser || !env.smtpPass || !to) return false;
  const nodemailer = await importNodemailer();
  const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: { user: env.smtpUser, pass: env.smtpPass }
  });
  await transporter.sendMail({ from: env.smtpUser, to, subject, html });
  return true;
}

async function importNodemailer() {
  const dynamicImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<typeof import("nodemailer")>;
  return dynamicImport("nodemailer");
}

function isCloudflareWorkerRuntime() {
  return typeof globalThis !== "undefined" && "WebSocketPair" in globalThis;
}

function decryptDeliveredRows(rows: any[]) {
  return rows
    .filter((row) => row.account_stock_id || row.account_email_encrypted)
    .map((row) => ({
      stockId: row.account_stock_id,
      email: decryptSecret(row.account_email_encrypted),
      password: decryptSecret(row.account_password_encrypted)
    }));
}

function publicOrder(order: any, authorized: boolean) {
  const safe = {
    id: order.id,
    invoice_number: order.invoice_number,
    product_name: order.product_name,
    variant_name: order.variant_name,
    qty: order.qty,
    customer_whatsapp: order.customer_whatsapp,
    payment_method: order.payment_method,
    payment_status: order.payment_status,
    delivery_status: order.delivery_status,
    subtotal: order.subtotal,
    discount: order.discount,
    payment_fee: order.payment_fee,
    total: order.total,
    created_at: order.created_at,
    paid_at: order.paid_at,
    expired_at: order.expired_at,
    history: order.history
  };
  if (!authorized) {
    const { customer_whatsapp: _customerWhatsapp, history: _history, ...publicSafe } = safe;
    return publicSafe;
  }
  return { ...safe, invoice_token: order.invoice_token, payment_url: order.xendit_invoice_url };
}

function normalizeXenditPayload(payload: XenditInvoiceWebhook & { data?: any }): NormalizedXenditInvoice {
  const data = payload.data ?? payload;
  return {
    externalId: String(data.external_id ?? data.reference_id ?? payload.external_id ?? ""),
    xenditInvoiceId: String(data.id ?? payload.id ?? ""),
    status: String(data.status ?? payload.status ?? ""),
    paymentId: nullableString(data.payment_id ?? data.payment_request_id ?? data.payment_method),
    amount: numberOrNull(data.amount ?? payload.amount),
    paidAmount: numberOrNull(data.paid_amount ?? payload.paid_amount)
  };
}

function productPayload(body: any, partial = false) {
  if (partial) {
    const row: any = {};
    if (body.id !== undefined) row.id = stringBody(body.id);
    if (body.slug !== undefined) row.slug = stringBody(body.slug);
    if (body.name !== undefined) row.name = stringBody(body.name);
    if (body.category !== undefined) row.category = stringBody(body.category);
    if (body.description !== undefined) row.description = stringBody(body.description);
    if (body.iconLabel !== undefined) row.icon_label = stringBody(body.iconLabel);
    if (body.seoTitle !== undefined) row.seo_title = stringBody(body.seoTitle);
    if (body.seoDescription !== undefined) row.seo_description = stringBody(body.seoDescription);
    if (body.isActive !== undefined) row.is_active = body.isActive !== false;
    for (const key of Object.keys(row)) if (row[key] === undefined) delete row[key];
    return row;
  }

  const row: any = {
    id: stringBody(body.id),
    slug: stringBody(body.slug),
    name: stringBody(body.name),
    category: stringBody(body.category),
    description: stringBody(body.description),
    icon_label: stringBody(body.iconLabel),
    seo_title: stringBody(body.seoTitle),
    seo_description: stringBody(body.seoDescription),
    is_active: body.isActive !== false
  };
  return row;
}

function variantPayload(body: any, partial = false) {
  if (partial) {
    const row: any = {};
    if (body.id !== undefined) row.id = stringBody(body.id);
    if (body.productId !== undefined) row.product_id = stringBody(body.productId);
    if (body.name !== undefined) row.name = stringBody(body.name);
    if (body.durationDays !== undefined) row.duration_days = Number(body.durationDays);
    if (body.costPrice !== undefined) row.cost_price = Number(body.costPrice);
    if (body.sellPrice !== undefined) row.sell_price = Number(body.sellPrice);
    if (body.lowStockThreshold !== undefined) row.low_stock_threshold = Number(body.lowStockThreshold);
    if (body.isActive !== undefined) row.is_active = body.isActive !== false;
    for (const key of Object.keys(row)) if (row[key] === "" || Number.isNaN(row[key])) delete row[key];
    return row;
  }

  const row: any = {
    id: stringBody(body.id),
    product_id: stringBody(body.productId),
    name: stringBody(body.name),
    duration_days: Number(body.durationDays),
    cost_price: Number(body.costPrice ?? 0),
    sell_price: Number(body.sellPrice),
    low_stock_threshold: Number(body.lowStockThreshold ?? 2),
    is_active: body.isActive !== false
  };
  return row;
}

function promoPayload(body: any, partial = false) {
  const row: any = {};
  const code = normalizePromoCode(stringBody(body.code));
  const label = stringBody(body.label);
  const type = stringBody(body.type).toUpperCase();

  if (!partial || code) row.code = code;
  if (!partial || label) row.label = label;
  if (!partial || type) row.type = type === "FIXED" ? "FIXED" : "PERCENT";
  if (!partial || body.value !== undefined) row.value = Number(body.value);
  if (!partial || body.minSubtotal !== undefined) row.min_subtotal = Number(body.minSubtotal ?? 0);
  if (!partial || body.maxDiscount !== undefined) row.max_discount = nullableNumber(body.maxDiscount);
  if (!partial || body.usageLimit !== undefined) row.usage_limit = nullableNumber(body.usageLimit);
  if (!partial || body.startsAt !== undefined) row.starts_at = nullableDate(body.startsAt);
  if (!partial || body.endsAt !== undefined) row.ends_at = nullableDate(body.endsAt);
  if (!partial || body.isActive !== undefined) row.is_active = body.isActive !== false;
  if (!partial) row.id = stringBody(body.id) || uid("promo");

  for (const key of Object.keys(row)) {
    const value = row[key];
    if (value === "" || Number.isNaN(value)) delete row[key];
  }
  return row;
}

function normalizeRouteError(error: unknown) {
  const explicitStatus = typeof (error as { status?: unknown }).status === "number" ? (error as { status: number }).status : 0;
  if (explicitStatus >= 400 && explicitStatus <= 599) {
    return { status: explicitStatus, message: explicitStatus === 500 ? "INTERNAL_ERROR" : (error as Error).message };
  }

  const databaseStatus = databaseInputErrorStatus(error);
  if (databaseStatus) {
    return {
      status: databaseStatus,
      message: databaseStatus === 409 ? "REQUEST_CONFLICT" : "INVALID_REQUEST"
    };
  }

  return { status: 500, message: "INTERNAL_ERROR" };
}

function databaseInputErrorStatus(error: unknown) {
  if (!error || typeof error !== "object") return 0;
  const code = String((error as { code?: unknown }).code ?? "");
  if (code === "23505") return 409;
  if (["22P02", "22007", "22008", "23502", "23503", "23514", "PGRST100", "PGRST116"].includes(code)) return 400;
  return 0;
}

function sendRpcError(res: ServerResponse, message: string) {
  if (message.includes("INSUFFICIENT_BALANCE")) return sendJson(res, 409, { error: "INSUFFICIENT_BALANCE" });
  if (message.includes("INSUFFICIENT_STOCK")) return sendJson(res, 409, { error: "INSUFFICIENT_STOCK" });
  if (message.includes("INVALID_PROMO")) return sendJson(res, 400, { error: "INVALID_PROMO" });
  if (message.includes("AUTH_REQUIRED")) return sendJson(res, 401, { error: "AUTH_REQUIRED" });
  return sendJson(res, 400, { error: "REQUEST_FAILED" });
}

function isMissingProductReviewsTable(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { code?: unknown; message?: unknown };
  return maybeError.code === "PGRST205" && typeof maybeError.message === "string" && maybeError.message.includes("product_reviews");
}

function httpError(status: number, message: string) {
  const error = new Error(message) as Error & { status?: number };
  error.status = status;
  return error;
}

function safeDecodePathParam(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    throw httpError(400, "INVALID_URL");
  }
}

async function readJson(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    const buffer = Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > 1024 * 1024) throw httpError(413, "PAYLOAD_TOO_LARGE");
    chunks.push(buffer);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw httpError(400, "INVALID_JSON");
  }
}

function sendJson(res: ServerResponse, status: number, payload: Json) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

function getIp(req: IncomingMessage) {
  const remoteAddress = normalizeIp(req.socket.remoteAddress);
  if (!env.trustProxy) return remoteAddress;

  const cloudflare = req.headers["cf-connecting-ip"]?.toString().trim();
  const forwarded = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim();
  return normalizeIp(forwarded || cloudflare || remoteAddress);
}

function headerMap(req: IncomingMessage) {
  return Object.fromEntries(Object.entries(req.headers).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
}

function stringBody(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isSafeTextId(value: string) {
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
}

function isSafeInvoiceNumber(value: string) {
  return /^PBY-[0-9]{8}-[A-F0-9]{8}$/.test(value);
}

function isSafeToken(value: string) {
  return /^[a-f0-9]{48}$/i.test(value);
}

function normalizePromoCode(value: string) {
  const code = value.toUpperCase();
  return isSafePromoCode(code) ? code : "";
}

function isSafePromoCode(value: string) {
  return /^[A-Z0-9][A-Z0-9_-]{0,39}$/.test(value);
}

function isValidProductPayload(row: Record<string, unknown>, partial = false) {
  if (partial && !Object.keys(row).length) return false;
  if (typeof row.id === "string" && !isSafeTextId(row.id)) return false;
  if (!partial && typeof row.id !== "string") return false;
  if (typeof row.slug === "string" && !/^[a-z0-9][a-z0-9-]{0,79}$/.test(row.slug)) return false;
  if (!partial && typeof row.slug !== "string") return false;
  return requiredText(row, "name", partial, 1, 120)
    && requiredText(row, "category", partial, 1, 80)
    && requiredText(row, "description", partial, 1, 2000)
    && requiredText(row, "icon_label", partial, 1, 12)
    && optionalText(row, "seo_title", 120)
    && optionalText(row, "seo_description", 240);
}

function isValidVariantPayload(row: Record<string, unknown>, partial = false) {
  if (partial && !Object.keys(row).length) return false;
  if (typeof row.id === "string" && !isSafeTextId(row.id)) return false;
  if (!partial && typeof row.id !== "string") return false;
  if (typeof row.product_id === "string" && !isSafeTextId(row.product_id)) return false;
  if (!partial && typeof row.product_id !== "string") return false;
  return requiredText(row, "name", partial, 1, 120)
    && positiveInt(row, "duration_days", partial)
    && nonNegativeInt(row, "cost_price", partial)
    && nonNegativeInt(row, "sell_price", partial)
    && nonNegativeInt(row, "low_stock_threshold", partial);
}

function isValidPromoPayload(row: Record<string, unknown>, partial = false) {
  if (partial && !Object.keys(row).length) return false;
  if (typeof row.id === "string" && !isSafeTextId(row.id)) return false;
  if (typeof row.code === "string" && !isSafePromoCode(row.code)) return false;
  if (!partial && typeof row.code !== "string") return false;
  if (!["PERCENT", "FIXED", undefined].includes(row.type as string | undefined)) return false;
  return requiredText(row, "label", partial, 1, 120)
    && positiveInt(row, "value", partial)
    && nonNegativeInt(row, "min_subtotal", partial)
    && nullableNonNegativeInt(row, "max_discount")
    && nullablePositiveInt(row, "usage_limit")
    && nullableDateString(row, "starts_at")
    && nullableDateString(row, "ends_at");
}

function requiredText(row: Record<string, unknown>, key: string, partial: boolean, min: number, max: number) {
  if (row[key] === undefined) return partial;
  return typeof row[key] === "string" && row[key].length >= min && row[key].length <= max;
}

function optionalText(row: Record<string, unknown>, key: string, max: number) {
  if (row[key] === undefined || row[key] === null) return true;
  return typeof row[key] === "string" && row[key].length <= max;
}

function positiveInt(row: Record<string, unknown>, key: string, partial: boolean) {
  if (row[key] === undefined) return partial;
  return Number.isInteger(row[key]) && Number(row[key]) > 0;
}

function nonNegativeInt(row: Record<string, unknown>, key: string, partial: boolean) {
  if (row[key] === undefined) return partial;
  return Number.isInteger(row[key]) && Number(row[key]) >= 0;
}

function nullablePositiveInt(row: Record<string, unknown>, key: string) {
  if (row[key] === undefined || row[key] === null) return true;
  return Number.isInteger(row[key]) && Number(row[key]) > 0;
}

function nullableNonNegativeInt(row: Record<string, unknown>, key: string) {
  if (row[key] === undefined || row[key] === null) return true;
  return Number.isInteger(row[key]) && Number(row[key]) >= 0;
}

function nullableDateString(row: Record<string, unknown>, key: string) {
  if (row[key] === undefined || row[key] === null) return true;
  return typeof row[key] === "string" && !Number.isNaN(new Date(row[key]).getTime());
}

function publicDisplayName(user: { email?: string | null; user_metadata?: Record<string, unknown> }) {
  const fromMetadata = stringBody(user.user_metadata?.full_name) || stringBody(user.user_metadata?.name);
  const fromEmail = user.email?.split("@")[0]?.replace(/[._-]+/g, " ").trim() ?? "";
  const displayName = fromMetadata || fromEmail || "Pelanggan ProByte";
  return displayName.slice(0, 60);
}

function numberOrNull(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function nullableDate(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function nullableString(value: unknown) {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number") return String(value);
  return null;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeStringEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function normalizeIp(value: string | undefined) {
  return value?.replace(/^::ffff:/, "") || "unknown";
}

function createInvoiceNumber() {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  return `PBY-${date}-${randomToken(4).toUpperCase()}`;
}

function randomToken(bytes: number) {
  return randomBytes(bytes).toString("hex");
}

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${randomToken(5)}`;
}

function isValidPhone(phone: string) {
  return /^(\+?62|0)8[1-9][0-9]{6,12}$/.test(phone.replace(/\s|-/g, ""));
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
