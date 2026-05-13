"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { apiGet, apiPost } from "@/lib/api";
import { getProduct, getVariant, products } from "@/lib/catalog";
import type { DemoState, Order, Product } from "@/lib/types";
import { supabase } from "@/utils/supabase";
import { ADMIN_SESSION_KEY, emptyState, MIN_TOP_UP, rupiah, STORAGE_KEY } from "./constants";
import type { AdminLoginResponse, AdminOrdersResponse, AdminWarrantyClaimsResponse, AuthMode, CheckoutResponse, CloudSyncState, InvoiceResponse, OrderRow, Toast, ViewName } from "./types";
import { availableStock, calculatePromoDiscount, calculateWalletBalance, copyToClipboard, createAudit, createSeedState, deliverOrder, findOrder, findPromo, isValidEmail, isValidPhone, loadState, mostSoldProductName, orderFromInvoiceResponse, orderFromRow, productStock, setCanonical, setMeta, uid, warrantyClaimFromRow } from "./state";
import { Icon, LogoMark, MetricRow, NavButton } from "@/components/common";
import { ProductSeoPage } from "@/features/store/ProductSeoPage";
import { AccountView } from "@/features/account/AccountView";
import { InvoiceResult } from "@/features/invoice/InvoiceResult";
import { OrdersTable, RestockAlertPanel, StockTable, WarrantyClaimsTable } from "@/features/admin/AdminTables";

export function ProByteApp() {
  const hydratedUserIds = useRef<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<DemoState>(emptyState);
  const [view, setView] = useState<ViewName>("store");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Semua");
  const [selectedProductId, setSelectedProductId] = useState(products[0].id);
  const [selectedVariantId, setSelectedVariantId] = useState(products[0].variants[0].id);
  const [qty, setQty] = useState(1);
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("XENDIT_INVOICE");
  const [promoInput, setPromoInput] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState("");
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [stockVariantId, setStockVariantId] = useState(products[0].variants[0].id);
  const [stockRows, setStockRows] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [cloudSync, setCloudSync] = useState<CloudSyncState>("idle");
  const [topUpAmount, setTopUpAmount] = useState(50000);
  const [claimInvoice, setClaimInvoice] = useState("");
  const [claimIssue, setClaimIssue] = useState("");
  const [selectedInvoiceToken, setSelectedInvoiceToken] = useState("");
  const [remoteInvoiceOrder, setRemoteInvoiceOrder] = useState<Order | null>(null);

  useEffect(() => {
    const loaded = loadState();
    const savedAdminToken = sessionStorage.getItem(ADMIN_SESSION_KEY);
    setState(loaded);
    setReady(true);
    setAdminToken(savedAdminToken);
    setAdminAuthed(Boolean(savedAdminToken));
  }, []);

  useEffect(() => {
    function syncRoute() {
      const productSlug = window.location.pathname.match(/^\/produk\/([^/?#]+)/)?.[1];
      if (productSlug) {
        const product = getProduct(decodeURIComponent(productSlug));
        if (product) {
          selectProduct(product);
          setView("product");
          return;
        }
      }

      const hash = window.location.hash.replace(/^#/, "");
      const hashParams = new URLSearchParams(hash);
      if (hashParams.has("invoice")) {
        const invoice = hashParams.get("invoice") ?? "";
        const token = hashParams.get("token") ?? "";
        setSelectedInvoice(invoice);
        setSelectedInvoiceToken(token);
        setView("invoice");
      } else if (hash === "invoice" || hash === "account" || hash === "admin" || hash === "store") {
        setView(hash as ViewName);
      }
    }

    syncRoute();
    window.addEventListener("hashchange", syncRoute);
    window.addEventListener("popstate", syncRoute);
    return () => {
      window.removeEventListener("hashchange", syncRoute);
      window.removeEventListener("popstate", syncRoute);
    };
  }, []);

  useEffect(() => {
    function queueHydrate(nextSession: Session | null) {
      if (!nextSession) {
        hydratedUserIds.current.clear();
        return;
      }

      const userId = nextSession.user.id;
      if (hydratedUserIds.current.has(userId)) return;
      hydratedUserIds.current.add(userId);
      window.setTimeout(() => void hydrateUserOrders(userId), 0);
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        pushToast(error.message, "fail");
      }
      setSession(data.session);
      setAuthReady(true);
      queueHydrate(data.session);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
      queueHydrate(nextSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const selectedProduct = getProduct(selectedProductId) ?? products[0];
  const selectedVariant = getVariant(selectedVariantId) ?? selectedProduct.variants[0];
  const selectedVariantStock = availableStock(state, selectedVariant.id);
  const safeQty = Math.min(Math.max(qty || 1, 1), Math.max(selectedVariantStock.length, 1));
  const subtotal = selectedVariant.price * safeQty;
  const selectedPromo = findPromo(promoInput, subtotal);
  const discount = selectedPromo ? calculatePromoDiscount(selectedPromo, subtotal) : 0;
  const payableSubtotal = Math.max(subtotal - discount, 0);
  const paymentFee = paymentMethod === "WALLET" || payableSubtotal === 0 ? 0 : Math.ceil(payableSubtotal * 0.012) + 750;
  const total = payableSubtotal + paymentFee;
  const walletBalance = session ? calculateWalletBalance(state.walletLedger, session.user.id) : 0;
  const currentUserOrders = session ? state.orders.filter((order) => order.userId === session.user.id) : [];
  const currentUserClaims = session ? state.warrantyClaims.filter((claim) => claim.userId === session.user.id) : [];
  const adminAlertEmail = import.meta.env.VITE_ADMIN_ALERT_EMAIL || "admin@probyte.local";

  const categories = useMemo(() => ["Semua", ...Array.from(new Set(products.map((product) => product.category)))], []);

  const visibleProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = category === "Semua" || product.category === category;
      const haystack = `${product.name} ${product.category} ${product.tags.join(" ")} ${product.description}`.toLowerCase();
      return matchesCategory && haystack.includes(q);
    });
  }, [category, query]);

  const storeStats = useMemo(() => {
    const totalStock = state.stocks.filter((stock) => stock.status === "AVAILABLE").length;
    const deliveredOrders = state.orders.filter((order) => order.deliveryStatus === "DELIVERED").length;
    const lowStock = products.filter((product) => {
      const stock = productStock(state, product.id);
      return stock > 0 && stock <= 2;
    }).length;
    return [
      { label: "Produk", value: products.length },
      { label: "Stok Akun", value: totalStock },
      { label: "Order Sukses", value: deliveredOrders },
      { label: "Stok Menipis", value: lowStock }
    ];
  }, [state]);

  const adminStats = useMemo(() => {
    const totalRevenue = state.orders
      .filter((order) => order.paymentStatus === "PAID")
      .reduce((sum, order) => sum + order.total, 0);
    const today = new Date().toISOString().slice(0, 10);
    const todayRevenue = state.orders
      .filter((order) => order.paymentStatus === "PAID" && order.paidAt?.slice(0, 10) === today)
      .reduce((sum, order) => sum + order.total, 0);
    const topProduct = mostSoldProductName(state.orders);
    const checkoutCount = state.orders.length;
    const deliveredCount = state.orders.filter((order) => order.deliveryStatus === "DELIVERED").length;
    const conversion = checkoutCount ? `${Math.round((deliveredCount / checkoutCount) * 100)}%` : "0%";
    return [
      { label: "Omzet Paid", value: rupiah.format(totalRevenue) },
      { label: "Omzet Hari Ini", value: rupiah.format(todayRevenue) },
      { label: "Produk Laris", value: topProduct },
      { label: "Conversion", value: conversion }
    ];
  }, [state]);

  const lowStockAlerts = useMemo(() => {
    return products.flatMap((product) =>
      product.variants
        .map((variant) => ({
          product,
          variant,
          stock: availableStock(state, variant.id).length,
          threshold: variant.lowStockThreshold ?? 2
        }))
        .filter((item) => item.stock <= item.threshold)
    );
  }, [state]);

  useEffect(() => {
    if (view === "product") {
      const title = selectedProduct.seoTitle ?? `${selectedProduct.name} Premium - ProByte`;
      const description =
        selectedProduct.seoDescription ??
        `${selectedProduct.description} Pilih varian, cek stok, dan checkout akun premium ${selectedProduct.name} di ProByte.`;
      document.title = title;
      setMeta("description", description);
      setCanonical(`${import.meta.env.VITE_APP_PUBLIC_URL || window.location.origin}/produk/${selectedProduct.id}`);
      return;
    }

    document.title = "ProByte Premium Store";
    setMeta("description", "ProByte menyediakan katalog akun aplikasi premium, invoice, saldo pelanggan, dan pengiriman akun otomatis.");
    setCanonical(import.meta.env.VITE_APP_PUBLIC_URL || window.location.origin);
  }, [selectedProduct, view]);

  useEffect(() => {
    if (adminAuthed && adminToken) {
      void hydrateAdminData(adminToken);
    }
  }, [adminAuthed, adminToken]);

  if (!ready) {
    return (
      <main className="loading-screen">
        <LogoMark />
        <h1>Memuat ProByte</h1>
      </main>
    );
  }

  function persist(updater: (draft: DemoState) => void) {
    setState((previous) => {
      const next = structuredClone(previous) as DemoState;
      updater(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  function pushToast(message: string, type: Toast["type"] = "") {
    const id = uid("toast");
    setToasts((items) => [...items, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((items) => items.filter((item) => item.id !== id));
    }, 3200);
  }

  async function hydrateUserOrders(userId: string) {
    setCloudSync("syncing");
    const { data, error } = await supabase.from("orders").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (error) {
      setCloudSync("error");
      pushToast(`Sync order gagal: ${error.message}`, "fail");
      return;
    }

    const cloudOrders = ((data ?? []) as OrderRow[]).map(orderFromRow);
    persist((draft) => {
      cloudOrders.forEach((order) => {
        const index = draft.orders.findIndex((item) => item.invoiceNumber === order.invoiceNumber);
        if (index >= 0) {
          draft.orders[index] = { ...draft.orders[index], ...order };
        } else {
          draft.orders.push(order);
        }
      });
      draft.orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    });
    setCloudSync("idle");
  }

  async function hydrateAdminData(token = adminToken) {
    if (!token) return;
    try {
      const [ordersResult, claimsResult] = await Promise.all([
        apiGet<AdminOrdersResponse>("/api/admin/orders", { adminToken: token }),
        apiGet<AdminWarrantyClaimsResponse>("/api/admin/warranty-claims", { adminToken: token })
      ]);
      persist((draft) => {
        draft.orders = ordersResult.orders.map(orderFromRow);
        draft.warrantyClaims = claimsResult.claims.map(warrantyClaimFromRow);
      });
    } catch (error) {
      pushToast((error as Error).message, "fail");
    }
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthSubmitting(true);
    const emailValue = authEmail.trim();
    const passwordValue = authPassword;

    const result =
      authMode === "login"
        ? await supabase.auth.signInWithPassword({ email: emailValue, password: passwordValue })
        : await supabase.auth.signUp({
            email: emailValue,
            password: passwordValue,
            options: { data: { full_name: authName.trim() } }
          });

    setAuthSubmitting(false);
    if (result.error) {
      pushToast(result.error.message, "fail");
      return;
    }

    setAuthPassword("");
    pushToast(authMode === "login" ? "Berhasil masuk akun pelanggan." : "Akun pelanggan dibuat. Cek email jika konfirmasi aktif.", "success");
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      pushToast(error.message, "fail");
      return;
    }
    setSession(null);
    pushToast("Keluar dari akun pelanggan.", "success");
  }

  function navigate(nextView: ViewName, invoice?: string, invoiceToken?: string) {
    setView(nextView);
    if (invoice) {
      setSelectedInvoice(invoice);
      setSelectedInvoiceToken(invoiceToken ?? "");
    }
    const params = new URLSearchParams();
    if (invoice) {
      params.set("invoice", invoice);
      if (invoiceToken) params.set("token", invoiceToken);
    }
    window.history.pushState({}, "", invoice ? `/#${params.toString()}` : `/#${nextView}`);
  }

  function navigateProduct(product: Product) {
    selectProduct(product);
    setView("product");
    window.history.pushState({}, "", `/produk/${product.id}`);
  }

  function selectProduct(product: Product) {
    setSelectedProductId(product.id);
    const firstReadyVariant = product.variants.find((variant) => availableStock(state, variant.id).length > 0);
    setSelectedVariantId((firstReadyVariant ?? product.variants[0]).id);
    setQty(1);
  }

  async function handleCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isValidPhone(whatsapp)) {
      pushToast("Nomor WhatsApp belum valid.", "fail");
      return;
    }

    if (email && !isValidEmail(email)) {
      pushToast("Email belum valid.", "fail");
      return;
    }

    if (selectedVariantStock.length < safeQty) {
      pushToast("Stok varian tidak cukup.", "fail");
      return;
    }

    if (promoInput.trim() && !selectedPromo) {
      pushToast("Kode promo tidak valid atau belum memenuhi minimal transaksi.", "fail");
      return;
    }

    if (paymentMethod === "WALLET") {
      if (!session) {
        pushToast("Masuk akun pelanggan dulu untuk memakai saldo.", "fail");
        navigate("account");
        return;
      }

      if (walletBalance < total) {
        pushToast("Saldo belum cukup untuk membayar order ini.", "fail");
        navigate("account");
        return;
      }
    }

    let checkoutResult: CheckoutResponse;
    try {
      checkoutResult = await apiPost<CheckoutResponse>(
        "/api/checkout",
        {
          variantId: selectedVariant.id,
          qty: safeQty,
          whatsapp: whatsapp.trim(),
          email: email.trim(),
          promoCode: selectedPromo?.code ?? promoInput.trim(),
          paymentMethod
        },
        { token: session?.access_token }
      );
    } catch (error) {
      pushToast((error as Error).message, "fail");
      return;
    }

    const invoiceNumber = checkoutResult.invoice_number;
    const invoiceToken = checkoutResult.invoice_token;
    const now = new Date().toISOString();

    const order: Order = {
      id: uid("ord"),
      userId: session?.user.id ?? null,
      invoiceNumber,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      variantId: selectedVariant.id,
      variantName: selectedVariant.name,
      qty: safeQty,
      customerWhatsapp: whatsapp.trim(),
      customerEmail: email.trim() || session?.user.email || "",
      paymentMethod,
      paymentSource: paymentMethod === "WALLET" ? "WALLET" : "GATEWAY",
      paymentStatus: checkoutResult.payment_status ?? (paymentMethod === "WALLET" ? "PAID" : "WAITING_PAYMENT"),
      deliveryStatus: checkoutResult.delivery_status ?? "PENDING",
      subtotal,
      discount,
      paymentFee,
      total: checkoutResult.total,
      promoCode: selectedPromo?.code ?? (promoInput.trim() || null),
      accounts: checkoutResult.accounts ?? [],
      createdAt: now,
      paidAt: paymentMethod === "WALLET" ? now : null,
      expiredAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      history: [{ at: now, text: paymentMethod === "WALLET" ? "Invoice dibuat dan dibayar memakai saldo" : "Invoice dibuat" }]
    };

    persist((draft) => {
      draft.orders.unshift(order);
      draft.audits.unshift(createAudit("CREATE_ORDER", "order", order.id, { invoiceNumber }));
    });
    setSelectedInvoice(invoiceNumber);
    setSelectedInvoiceToken(invoiceToken);
    navigate("invoice", invoiceNumber, invoiceToken);
    if (checkoutResult.payment_url) {
      window.location.assign(checkoutResult.payment_url);
      return;
    }
    pushToast(paymentMethod === "WALLET" ? "Order dibayar memakai saldo dan delivery diproses." : "Invoice berhasil dibuat.", "success");
  }

  async function handlePay(invoiceNumber: string) {
    try {
      const params = new URLSearchParams();
      if (selectedInvoiceToken) params.set("token", selectedInvoiceToken);
      const result = await apiGet<InvoiceResponse>(`/api/invoices/${encodeURIComponent(invoiceNumber)}?${params.toString()}`, {
        token: session?.access_token
      });
      if (result.order.payment_url) {
        window.location.assign(result.order.payment_url);
        return;
      }
      pushToast("Payment link tidak tersedia. Buat invoice baru bila invoice sudah expired.", "fail");
    } catch (error) {
      pushToast((error as Error).message, "fail");
    }
  }

  async function fetchInvoice(invoiceNumber: string, token = selectedInvoiceToken) {
    try {
      const params = new URLSearchParams();
      if (token) params.set("token", token);
      const result = await apiGet<InvoiceResponse>(`/api/invoices/${encodeURIComponent(invoiceNumber)}?${params.toString()}`, {
        token: session?.access_token
      });
      setRemoteInvoiceOrder(orderFromInvoiceResponse(result));
    } catch (error) {
      setRemoteInvoiceOrder(null);
      pushToast((error as Error).message, "fail");
    }
  }

  function expireOrder(invoiceNumber: string) {
    persist((draft) => {
      const order = draft.orders.find((item) => item.invoiceNumber === invoiceNumber);
      if (!order) return;
      order.paymentStatus = "EXPIRED";
      order.deliveryStatus = "PENDING";
      order.history.push({ at: new Date().toISOString(), text: "Invoice expired oleh admin" });
      draft.audits.unshift(createAudit("EXPIRE_ORDER", "order", order.id, { invoiceNumber }));
    });
    pushToast("Invoice diubah menjadi expired.", "success");
  }

  async function handleAdminLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const result = await apiPost<AdminLoginResponse>("/api/admin/login", {
        username: adminUsername.trim(),
        password: adminPassword
      });
      sessionStorage.setItem(ADMIN_SESSION_KEY, result.token);
      setAdminToken(result.token);
      setAdminAuthed(true);
      void hydrateAdminData(result.token);
      setAdminUsername("");
      setAdminPassword("");
      pushToast("Dashboard admin terbuka.", "success");
    } catch {
      pushToast("Username atau password admin salah.", "fail");
      return;
    }
  }

  async function handleAddStock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = stockRows
      .split("\n")
      .map((row) => row.trim())
      .filter(Boolean)
      .map((row) => {
        const [accountEmail, password] = row.split(/[,|;]/).map((part) => part?.trim());
        return { email: accountEmail, password };
      })
      .filter((item): item is { email: string; password: string } => Boolean(isValidEmail(item.email ?? "") && item.password));

    if (!parsed.length) {
      pushToast("Format stok belum valid.", "fail");
      return;
    }

    try {
      const result = await apiPost<{ inserted: number }>(
        "/api/admin/stocks",
        { variantId: stockVariantId, rows: parsed },
        { adminToken }
      );
      setStockRows("");
      pushToast(`${result.inserted} stok terenkripsi ditambahkan.`, "success");
    } catch (error) {
      pushToast((error as Error).message, "fail");
    }
  }

  async function handleTopUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      pushToast("Masuk akun pelanggan dulu untuk top up saldo.", "fail");
      return;
    }

    const amount = Math.max(Number(topUpAmount) || 0, 0);
    if (amount < MIN_TOP_UP) {
      pushToast(`Minimal top up ${rupiah.format(MIN_TOP_UP)}.`, "fail");
      return;
    }

    try {
      const result = await apiPost<{ payment_url: string }>("/api/wallet/topup", { amount }, { token: session.access_token });
      window.location.assign(result.payment_url);
    } catch (error) {
      pushToast((error as Error).message, "fail");
    }
  }

  async function handleWarrantyClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      pushToast("Masuk akun pelanggan dulu untuk membuat klaim.", "fail");
      return;
    }

    const invoiceNumber = claimInvoice.trim();
    const order = findOrder(state, invoiceNumber);
    if (order?.userId && order.userId !== session.user.id) {
      pushToast("Invoice bukan milik akun ini.", "fail");
      return;
    }

    const issueSummary = claimIssue.trim();
    if (issueSummary.length < 8) {
      pushToast("Isi ringkasan masalah akun lebih jelas.", "fail");
      return;
    }

    try {
      await apiPost("/api/warranty-claims", { invoiceNumber, issueSummary }, { token: session.access_token });
      setClaimInvoice("");
      setClaimIssue("");
      pushToast("Klaim dibuat. Lanjutkan chat admin dengan mengirim invoice.", "success");
    } catch (error) {
      pushToast((error as Error).message, "fail");
    }
  }

  async function refundWarrantyClaim(claimId: string) {
    try {
      await apiPost(`/api/admin/warranty-claims/${encodeURIComponent(claimId)}/refund`, {}, { adminToken });
      void hydrateAdminData();
      pushToast("Refund garansi masuk ke saldo pelanggan.", "success");
    } catch (error) {
      pushToast((error as Error).message, "fail");
    }
  }

  function rejectWarrantyClaim(claimId: string) {
    persist((draft) => {
      const claim = draft.warrantyClaims.find((item) => item.id === claimId);
      if (!claim || claim.status === "REFUNDED_TO_BALANCE") return;
      claim.status = "REJECTED";
      claim.resolvedAt = new Date().toISOString();
      draft.audits.unshift(createAudit("REJECT_WARRANTY_CLAIM", "warranty", claim.id, { invoiceNumber: claim.invoiceNumber }));
    });
    pushToast("Klaim ditolak.", "success");
  }

  function resetDemo() {
    const seeded = createSeedState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    setState(seeded);
    setSelectedProductId(products[0].id);
    setSelectedVariantId(products[0].variants[0].id);
    setSelectedInvoice("");
    pushToast("Data demo direset.", "success");
  }

  const invoiceOrder = selectedInvoice ? remoteInvoiceOrder ?? findOrder(state, selectedInvoice) : null;
  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => navigate("store")}>
          <LogoMark />
          <span>
            <strong>ProByte</strong>
            <small>Premium Store</small>
          </span>
        </button>

        <nav className="nav" aria-label="Navigasi utama">
          <NavButton active={view === "store"} label="Store" icon="box" onClick={() => navigate("store")} />
          <NavButton active={view === "invoice"} label="Cek Invoice" icon="invoice" onClick={() => navigate("invoice")} />
          <NavButton active={view === "account"} label="Pelanggan" icon="user" onClick={() => navigate("account")} />
          <NavButton active={view === "admin"} label="Admin" icon="shield" onClick={() => navigate("admin")} />
        </nav>
      </header>

      <main className="page">
        {view === "store" ? (
          <section className="store-layout">
            <div className="market panel">
              <div className="store-head">
                <div>
                  <p className="eyebrow">Akun premium siap kirim</p>
                  <h1>Stok digital ProByte</h1>
                </div>
                <button
                  className="ghost-btn"
                  type="button"
                  onClick={() => {
                    const latest = state.orders[0];
                    if (!latest) {
                      pushToast("Belum ada invoice.", "fail");
                      return;
                    }
                    setSelectedInvoice(latest.invoiceNumber);
                    navigate("invoice", latest.invoiceNumber);
                  }}
                >
                  Invoice Terakhir
                </button>
              </div>

              <div className="toolbar">
                <label className="search-box">
                  <Icon name="search" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Cari Netflix, Canva, Grok..."
                    type="search"
                  />
                </label>
                <div className="category-tabs">
                  {categories.map((item) => (
                    <button
                      className={`category-tab ${item === category ? "is-active" : ""}`}
                      key={item}
                      type="button"
                      onClick={() => setCategory(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <MetricRow items={storeStats} />

              <div className="product-grid">
                {visibleProducts.length ? (
                  visibleProducts.map((product) => {
                    const stock = productStock(state, product.id);
                    return (
                      <button
                        className={`product-card ${product.id === selectedProduct.id ? "is-selected" : ""} ${stock ? "" : "is-empty"}`}
                        key={product.id}
                        type="button"
                        onClick={() => selectProduct(product)}
                      >
                        <div className="product-top">
                          <span className="product-mark">{product.initials}</span>
                          <span className={`stock-pill ${stock ? "" : "empty"}`}>{stock} stok</span>
                        </div>
                        <div className="product-info">
                          <h3>{product.name}</h3>
                          <p>{product.description}</p>
                        </div>
                        <div className="tag-row">
                          {product.tags.map((tag) => (
                            <span className="tag" key={tag}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="empty-results">Produk tidak ditemukan.</div>
                )}
              </div>
            </div>

            <aside className="checkout panel">
              <div className="panel-title">
                <div>
                  <p className="eyebrow">Checkout</p>
                  <h2>{selectedProduct.name}</h2>
                </div>
                <span className={`stock-pill ${productStock(state, selectedProduct.id) ? "" : "empty"}`}>
                  {productStock(state, selectedProduct.id)} stok
                </span>
              </div>

              <form className="checkout-form" onSubmit={handleCheckout}>
                <div className="product-summary">
                  <span className="product-mark">{selectedProduct.initials}</span>
                  <div>
                    <h3>{selectedProduct.name}</h3>
                    <p>
                      {selectedProduct.category} · {selectedProduct.tags.join(", ")}
                    </p>
                  </div>
                </div>
                <button className="ghost-btn" type="button" onClick={() => navigateProduct(selectedProduct)}>
                  Detail Produk
                </button>

                <label className="field">
                  <span>Varian</span>
                  <select
                    value={selectedVariantId}
                    onChange={(event) => {
                      setSelectedVariantId(event.target.value);
                      setQty(1);
                    }}
                  >
                    {selectedProduct.variants.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {variant.name} · {rupiah.format(variant.price)} · {availableStock(state, variant.id).length} stok
                      </option>
                    ))}
                  </select>
                </label>

                <div className="split-fields">
                  <label className="field">
                    <span>Qty</span>
                    <input
                      min={1}
                      max={Math.max(selectedVariantStock.length, 1)}
                      type="number"
                      value={safeQty}
                      onChange={(event) => setQty(Number(event.target.value))}
                    />
                  </label>
                  <label className="field">
                    <span>Metode</span>
	                    <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
	                      <option value="XENDIT_INVOICE">Xendit Payment Link</option>
	                      <option value="WALLET">Saldo Akun</option>
	                    </select>
	                  </label>
	                </div>

                <label className="field">
                  <span>WhatsApp</span>
                  <input value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} placeholder="08xxxxxxxxxx" type="tel" />
                </label>

                <label className="field">
                  <span>Email opsional</span>
	                  <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@email.com" type="email" />
	                </label>

	                <label className="field">
	                  <span>Kode promo</span>
	                  <input value={promoInput} onChange={(event) => setPromoInput(event.target.value.toUpperCase())} placeholder="PROBYTE10" />
	                </label>

	                <div className="price-box">
	                  <div>
	                    <span>Subtotal</span>
	                    <strong>{rupiah.format(subtotal)}</strong>
	                  </div>
	                  <div>
	                    <span>Diskon{selectedPromo ? ` · ${selectedPromo.label}` : ""}</span>
	                    <strong>{discount ? `-${rupiah.format(discount)}` : "-"}</strong>
	                  </div>
	                  <div>
	                    <span>{paymentMethod === "WALLET" ? "Biaya saldo" : "Biaya Xendit"}</span>
	                    <strong>{rupiah.format(paymentFee)}</strong>
	                  </div>
	                  {paymentMethod === "WALLET" ? (
	                    <div>
	                      <span>Saldo tersedia</span>
	                      <strong>{session ? rupiah.format(walletBalance) : "Login dulu"}</strong>
	                    </div>
	                  ) : null}
	                  <div className="total">
	                    <span>Total</span>
	                    <strong>{rupiah.format(total)}</strong>
                  </div>
                </div>

                <button className="primary-btn" disabled={!selectedVariantStock.length} type="submit">
                  <Icon name="card" />
                  Buat Invoice
                </button>
              </form>
            </aside>
          </section>
	        ) : null}

	        {view === "product" ? (
	          <ProductSeoPage
	            product={selectedProduct}
	            state={state}
	            onBack={() => navigate("store")}
	            onCheckout={() => {
	              selectProduct(selectedProduct);
	              navigate("store");
	            }}
	          />
	        ) : null}

	        {view === "account" ? (
	          <AccountView
	            authEmail={authEmail}
	            authMode={authMode}
	            authName={authName}
	            authPassword={authPassword}
	            authReady={authReady}
	            authSubmitting={authSubmitting}
	            claimInvoice={claimInvoice}
	            claimIssue={claimIssue}
	            claims={currentUserClaims}
	            cloudSync={cloudSync}
	            ledger={session ? state.walletLedger.filter((entry) => entry.userId === session.user.id) : []}
	            orders={currentUserOrders}
	            session={session}
	            topUpAmount={topUpAmount}
	            walletBalance={walletBalance}
	            onAuth={handleAuth}
	            onClaimInvoiceChange={setClaimInvoice}
	            onClaimIssueChange={setClaimIssue}
	            onLogout={handleLogout}
	            onModeChange={setAuthMode}
	            onNameChange={setAuthName}
	            onEmailChange={setAuthEmail}
	            onPasswordChange={setAuthPassword}
	            onTopUp={handleTopUp}
	            onTopUpAmountChange={setTopUpAmount}
	            onWarrantyClaim={handleWarrantyClaim}
	          />
	        ) : null}

	        {view === "invoice" ? (
	          <section className="invoice-layout">
            <div className="panel invoice-search">
              <p className="eyebrow">Cek transaksi</p>
              <h1>Invoice ProByte</h1>
              <form
                className="invoice-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  const invoice = selectedInvoice.trim();
                  navigate("invoice", invoice, selectedInvoiceToken);
                  void fetchInvoice(invoice);
                }}
              >
                <label className="field">
                  <span>Nomor invoice</span>
                  <input
                    value={selectedInvoice}
                    onChange={(event) => setSelectedInvoice(event.target.value)}
                    placeholder="PBY-20260512-8F3K2A"
                  />
                </label>
                <label className="field">
                  <span>Token invoice opsional</span>
                  <input
                    value={selectedInvoiceToken}
                    onChange={(event) => setSelectedInvoiceToken(event.target.value)}
                    placeholder="Token dari link invoice"
                  />
                </label>
                <button className="primary-btn" type="submit">
                  Cari Invoice
                </button>
              </form>
            </div>

            <InvoiceResult order={invoiceOrder} invoice={selectedInvoice} onPay={handlePay} onCopy={copyToClipboard} />
          </section>
        ) : null}

        {view === "admin" ? (
          <section className="admin-layout">
            {!adminAuthed ? (
              <div className="panel admin-login">
                <p className="eyebrow">Admin</p>
	                <h1>Masuk dashboard</h1>
	                <form className="admin-login-form" onSubmit={handleAdminLogin}>
	                  <label className="field">
	                    <span>Username</span>
	                    <input value={adminUsername} onChange={(event) => setAdminUsername(event.target.value)} placeholder="admin" />
	                  </label>
	                  <label className="field">
	                    <span>Password</span>
	                    <input value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} type="password" />
	                  </label>
	                  <button className="primary-btn" type="submit">
	                    Masuk
                  </button>
                </form>
              </div>
            ) : (
              <div className="admin-dashboard">
                <div className="admin-head">
                  <div>
                    <p className="eyebrow">Dashboard</p>
                    <h1>Operasional ProByte</h1>
                  </div>
                  <button
                    className="ghost-btn"
                    type="button"
                    onClick={() => {
                      sessionStorage.removeItem(ADMIN_SESSION_KEY);
                      setAdminToken(null);
                      setAdminAuthed(false);
                    }}
                  >
                    Keluar
                  </button>
                </div>

                <MetricRow items={adminStats} />

                <div className="admin-grid">
                  <div className="panel">
                    <div className="panel-title">
                      <div>
                        <p className="eyebrow">Stok</p>
                        <h2>Tambah akun</h2>
                      </div>
                    </div>
                    <form className="stock-form" onSubmit={handleAddStock}>
                      <label className="field">
                        <span>Varian produk</span>
                        <select value={stockVariantId} onChange={(event) => setStockVariantId(event.target.value)}>
                          {products.flatMap((product) =>
                            product.variants.map((variant) => (
                              <option key={variant.id} value={variant.id}>
                                {product.name} · {variant.name}
                              </option>
                            ))
                          )}
                        </select>
                      </label>
                      <label className="field">
                        <span>Daftar akun</span>
                        <textarea
                          rows={6}
                          value={stockRows}
                          onChange={(event) => setStockRows(event.target.value)}
                          placeholder={"email,password\nemail,password"}
                        />
                      </label>
                      <button className="primary-btn" type="submit">
                        Tambah Stok
                      </button>
                    </form>
                  </div>

                  <div className="panel">
                    <div className="panel-title">
                      <div>
	                        <p className="eyebrow">Xendit</p>
                        <h2>Status integrasi</h2>
                      </div>
                      <span className="status-badge wait">Sandbox</span>
                    </div>
                    <div className="integration-list">
                      <div>
                        <span>Provider</span>
	                        <strong>Xendit</strong>
                      </div>
                      <div>
                        <span>Checkout API</span>
                        <strong>/api/checkout</strong>
                      </div>
                      <div>
                        <span>Callback API</span>
	                        <strong>/api/xendit/webhook</strong>
                      </div>
	                      <div>
	                        <span>Webhook</span>
	                        <strong>x-callback-token</strong>
	                      </div>
	                      <div>
	                        <span>Restock alert</span>
	                        <strong>{adminAlertEmail}</strong>
	                      </div>
	                    </div>
	                  </div>
	                </div>

	                <RestockAlertPanel alerts={lowStockAlerts} adminEmail={adminAlertEmail} />
	                <WarrantyClaimsTable claims={state.warrantyClaims} orders={state.orders} onRefund={refundWarrantyClaim} onReject={rejectWarrantyClaim} />
	                <StockTable state={state} />
                <OrdersTable
                  orders={state.orders}
                  onOpen={(invoice) => navigate("invoice", invoice)}
                  onPay={() => pushToast("Status paid hanya boleh berubah dari webhook Xendit.", "fail")}
                  onDeliver={(invoice) => {
                    persist((draft) => deliverOrder(draft, invoice));
                    pushToast("Delivery diproses.", "success");
                  }}
                  onExpire={expireOrder}
                  onReset={resetDemo}
                />
              </div>
            )}
          </section>
        ) : null}
      </main>

	      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <div className={`toast ${toast.type}`} key={toast.id}>
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}
