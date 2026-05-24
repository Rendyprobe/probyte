"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { products } from "@/lib/catalog";
import type { DemoState, Order, Product, ProductReview, ProductVariant, PublicReview, WalletLedgerEntry } from "@/lib/types";
import { supabase } from "@/utils/supabase";
import { ADMIN_SESSION_KEY, DEMO_MODE, emptyState, MIN_TOP_UP, promoCodes, rupiah, STORAGE_KEY } from "./constants";
import type { AccountReviewsResponse, AdminAnalyticsResponse, AdminAuditLogRow, AdminAuditLogsResponse, AdminLoginResponse, AdminOrdersResponse, AdminProductRow, AdminProductsResponse, AdminPromoRow, AdminPromosResponse, AdminWalletAdjustmentResponse, AdminWalletLedgerResponse, AdminWalletSummaryResponse, AdminWalletSummaryRow, AdminWarrantyClaimsResponse, AuthMode, CheckoutResponse, CloudSyncState, InvoiceResponse, OrderRow, PublicReviewsResponse, ReviewResponse, Toast, ViewName, WalletLedgerResponse, WarrantyClaimRow } from "./types";
import { calculatePromoDiscount, calculateWalletBalance, copyToClipboard, createAudit, createSeedState, deliverOrder, findOrder, findPromo, isValidEmail, isValidPhone, loadState, mostSoldProductName, orderFromInvoiceResponse, orderFromRow, publicReviewFromRow, reviewFromRow, setCanonical, setMeta, uid, walletLedgerFromRow, warrantyClaimFromRow } from "./state";
import {
  AdminSidebar,
  AdminDashboardShell,
  AppShell,
  DataTable,
  Icon,
  LogoMark,
  MobileBottomNav,
  MetricRow,
  type IconName
} from "@/components/common";
import { ProductSeoPage } from "@/features/store/ProductSeoPage";
import { TestimonialsPage } from "@/features/store/TestimonialsPage";
import { LegalPage } from "@/features/store/LegalPages";
import { AccountView } from "@/features/account/AccountView";
import { AuditLogTable, OrdersTable, ProductManager, PromoManager, RestockAlertPanel, StockTable, WalletAdminPanel, WarrantyClaimsTable } from "@/features/admin/AdminTables";
import {
  AppSidebar,
  AppTopbar,
  ContactPage,
  DepositPage,
  HomePage,
  InvoicePage,
  MobileSidebarDrawer,
  ProductPage,
  type ProductSortOption,
  ProfilePage,
  type RankingEntry,
  RankingPage,
  type SidebarCategoryItem,
  VoucherPage
} from "@/features/marketplace/MarketplaceViews";

type AdminTab = "overview" | "orders" | "stock" | "products" | "promos" | "wallet" | "warranty" | "audit" | "settings";
type CatalogSyncState = "loading" | "synced" | "fallback";
type ThemeMode = "light" | "dark";
type ProductsResponse = {
  products: Array<{
    id: string;
    slug?: string;
    name: string;
    category: Product["category"];
    description: string;
    icon_label?: string;
    seo_title?: string | null;
    seo_description?: string | null;
    variants?: Array<{
      id: string;
      name: string;
      duration_days: number;
      sell_price: number;
      stock?: number;
      low_stock_threshold?: number;
    }>;
  }>;
};

const THEME_STORAGE_KEY = "probyte-theme";

const adminTabs: Array<{ id: AdminTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "orders", label: "Orders" },
  { id: "stock", label: "Stock" },
  { id: "products", label: "Produk" },
  { id: "promos", label: "Promo" },
  { id: "wallet", label: "Saldo" },
  { id: "warranty", label: "Warranty" },
  { id: "audit", label: "Audit" },
  { id: "settings", label: "Settings" }
];

const adminTabIcons: Record<AdminTab, IconName> = {
  overview: "grid",
  orders: "invoice",
  stock: "box",
  products: "tag",
  promos: "spark",
  wallet: "wallet",
  warranty: "shield",
  audit: "lock",
  settings: "refresh"
};

export function ProByteApp() {
  const hydratedUserIds = useRef<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<DemoState>(emptyState);
  const [view, setView] = useState<ViewName>("home");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Semua");
  const [productSort, setProductSort] = useState<ProductSortOption>("popular");
  const [visibleProductCount, setVisibleProductCount] = useState(9);
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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
  const [claimInvoiceToken, setClaimInvoiceToken] = useState("");
  const [claimIssue, setClaimIssue] = useState("");
  const [selectedInvoiceToken, setSelectedInvoiceToken] = useState("");
  const [remoteInvoiceOrder, setRemoteInvoiceOrder] = useState<Order | null>(null);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>(products);
  const [catalogSync, setCatalogSync] = useState<CatalogSyncState>("loading");
  const [adminTab, setAdminTab] = useState<AdminTab>("overview");
  const [accountReviews, setAccountReviews] = useState<ProductReview[]>([]);
  const [publicReviews, setPublicReviews] = useState<PublicReview[]>([]);
  const [promoCatalog, setPromoCatalog] = useState(promoCodes);
  const [adminProducts, setAdminProducts] = useState<AdminProductRow[]>([]);
  const [adminPromos, setAdminPromos] = useState<AdminPromoRow[]>([]);
  const [adminAuditLogs, setAdminAuditLogs] = useState<AdminAuditLogRow[]>([]);
  const [adminAnalytics, setAdminAnalytics] = useState<AdminAnalyticsResponse | null>(null);
  const [adminWalletSummary, setAdminWalletSummary] = useState<AdminWalletSummaryRow[]>([]);
  const [adminWalletLedger, setAdminWalletLedger] = useState<WalletLedgerEntry[]>([]);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getInitialThemeMode());

  useEffect(() => {
    const loaded = loadState(DEMO_MODE);
    const savedAdminToken = sessionStorage.getItem(ADMIN_SESSION_KEY);
    setState(loaded);
    setReady(true);
    setAdminToken(savedAdminToken);
    setAdminAuthed(Boolean(savedAdminToken));
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

  useEffect(() => {
    function syncRoute() {
      const productSlug = window.location.pathname.match(/^\/produk\/([^/?#]+)/)?.[1];
      if (productSlug) {
        const product = findCatalogProduct(catalogProducts, decodeURIComponent(productSlug));
        if (product) {
          selectProduct(product);
          setView("product-detail");
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
      } else if (hash) {
        if (hash === "store") {
          setView("home");
          return;
        }
        const supportedViews = new Set<ViewName>([
          "home",
          "product",
          "invoice",
          "account",
          "voucher",
          "ranking",
          "deposit",
          "contact",
          "admin",
          "testimonials",
          "terms",
          "privacy",
          "warranty"
        ]);
        if (supportedViews.has(hash as ViewName)) {
          setView(hash as ViewName);
        }
      }
    }

    syncRoute();
    window.addEventListener("hashchange", syncRoute);
    window.addEventListener("popstate", syncRoute);
    return () => {
      window.removeEventListener("hashchange", syncRoute);
      window.removeEventListener("popstate", syncRoute);
    };
  }, [catalogProducts]);

  useEffect(() => {
    void hydrateCatalog();
    void hydratePublicReviews();
    void hydratePromoCatalog();
  }, []);

  useEffect(() => {
    function queueHydrate(nextSession: Session | null) {
      if (!nextSession) {
        hydratedUserIds.current.clear();
        setAccountReviews([]);
        return;
      }

      const userId = nextSession.user.id;
      if (hydratedUserIds.current.has(userId)) return;
      hydratedUserIds.current.add(userId);
      window.setTimeout(() => void hydrateUserAccount(nextSession), 0);
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

  const selectedProduct = findCatalogProduct(catalogProducts, selectedProductId) ?? catalogProducts[0] ?? products[0];
  const selectedVariant = findCatalogVariant(catalogProducts, selectedVariantId) ?? selectedProduct.variants[0];
  const selectedVariantStockCount = variantStockCount(state, selectedVariant);
  const safeQty = Math.min(Math.max(qty || 1, 1), Math.max(selectedVariantStockCount, 1));
  const subtotal = selectedVariant.price * safeQty;
  const selectedPromo = findPromo(promoInput, subtotal, promoCatalog);
  const discount = selectedPromo ? calculatePromoDiscount(selectedPromo, subtotal) : 0;
  const payableSubtotal = Math.max(subtotal - discount, 0);
  const paymentFee = paymentMethod === "WALLET" || payableSubtotal === 0 ? 0 : Math.ceil(payableSubtotal * 0.012) + 750;
  const total = payableSubtotal + paymentFee;
  const walletBalance = session ? calculateWalletBalance(state.walletLedger, session.user.id) : 0;
  const currentUserOrders = session ? state.orders.filter((order) => order.userId === session.user.id) : [];
  const currentUserClaims = session ? state.warrantyClaims.filter((claim) => claim.userId === session.user.id) : [];
  const adminAlertEmail = import.meta.env.VITE_ADMIN_ALERT_EMAIL || "admin@probyte.local";

  const checkoutIssues = useMemo(() => {
    const issues: string[] = [];
    if (!isValidPhone(whatsapp)) issues.push("Masukkan nomor WhatsApp aktif.");
    if (email && !isValidEmail(email)) issues.push("Format email belum valid.");
    if (selectedVariantStockCount < safeQty) issues.push("Stok varian ini tidak cukup.");
    if (promoInput.trim() && !selectedPromo) issues.push("Kode promo tidak valid atau belum memenuhi minimal transaksi.");
    if (paymentMethod === "WALLET" && !session) issues.push("Masuk akun pelanggan dulu untuk memakai saldo.");
    if (paymentMethod === "WALLET" && session && walletBalance < total) issues.push("Saldo belum cukup.");
    return issues;
  }, [email, paymentMethod, promoInput, safeQty, selectedPromo, selectedVariantStockCount, session, total, walletBalance, whatsapp]);
  const canCheckout = checkoutIssues.length === 0;

  const categories = useMemo(() => ["Semua", ...Array.from(new Set(catalogProducts.map((product) => product.category)))], [catalogProducts]);

  const soldByProduct = useMemo(() => {
    const map = new Map<string, number>();
    state.orders
      .filter((order) => order.paymentStatus === "PAID" || order.deliveryStatus === "DELIVERED")
      .forEach((order) => {
        map.set(order.productId, (map.get(order.productId) ?? 0) + order.qty);
      });
    return map;
  }, [state.orders]);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = catalogProducts.filter((product) => {
      const matchesCategory = category === "Semua" || product.category === category;
      const haystack = `${product.name} ${product.category} ${product.tags.join(" ")} ${product.description}`.toLowerCase();
      return matchesCategory && haystack.includes(q);
    });

    result.sort((a, b) => {
      if (productSort === "name-asc") return a.name.localeCompare(b.name);
      if (productSort === "price-asc") return lowestProductPrice(a) - lowestProductPrice(b);
      if (productSort === "price-desc") return lowestProductPrice(b) - lowestProductPrice(a);
      if (productSort === "stock-desc") return productStockCount(state, b) - productStockCount(state, a);
      return (soldByProduct.get(b.id) ?? 0) - (soldByProduct.get(a.id) ?? 0);
    });
    return result;
  }, [catalogProducts, category, productSort, query, soldByProduct, state]);

  const visibleProducts = useMemo(() => filteredProducts.slice(0, visibleProductCount), [filteredProducts, visibleProductCount]);

  useEffect(() => {
    setVisibleProductCount(9);
  }, [category, productSort, query]);

  const adminStats = useMemo(() => {
    if (adminAnalytics) {
      return [
        { label: "Omzet Paid", value: rupiah.format(adminAnalytics.totalRevenue) },
        { label: "Omzet Hari Ini", value: rupiah.format(adminAnalytics.todayRevenue) },
        { label: "Order", value: adminAnalytics.orderCount },
        { label: "Conversion", value: `${adminAnalytics.conversion}%` }
      ];
    }

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
  }, [adminAnalytics, state]);

  const lowStockAlerts = useMemo(() => {
    return catalogProducts.flatMap((product) =>
      product.variants
        .map((variant) => ({
          product,
          variant,
          stock: variantStockCount(state, variant),
          threshold: variant.lowStockThreshold ?? 2
        }))
        .filter((item) => item.stock <= item.threshold)
    );
  }, [catalogProducts, state]);

  const rankingRows = useMemo<RankingEntry[]>(() => {
    const grouped = new Map<string, { id: string; totalAmount: number; transactionCount: number; points: number }>();
    state.orders
      .filter((order) => order.paymentStatus === "PAID" || order.deliveryStatus === "DELIVERED")
      .forEach((order) => {
        const key = order.userId || order.customerEmail || order.customerWhatsapp || `guest-${order.invoiceNumber}`;
        const current = grouped.get(key) ?? { id: key, totalAmount: 0, transactionCount: 0, points: 0 };
        current.totalAmount += order.total;
        current.transactionCount += 1;
        current.points += Math.max(1, Math.floor(order.total / 10000));
        grouped.set(key, current);
      });

    const ranked = Array.from(grouped.values())
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 20)
      .map((item, index) => ({
        rank: index + 1,
        name: anonymizeMember(item.id),
        totalAmount: item.totalAmount,
        transactionCount: item.transactionCount,
        points: item.points,
        badge: rankingBadge(index + 1, item.totalAmount)
      }));

    if (ranked.length) return ranked;
    return [
      { rank: 1, name: "Member A***", totalAmount: 785000, transactionCount: 12, points: 78, badge: "Top Buyer" },
      { rank: 2, name: "Member B***", totalAmount: 612000, transactionCount: 9, points: 61, badge: "Pro Member" },
      { rank: 3, name: "Member C***", totalAmount: 455000, transactionCount: 7, points: 45, badge: "Rising" }
    ];
  }, [state.orders]);

  useEffect(() => {
    if (view === "product-detail") {
      const title = selectedProduct.seoTitle ?? `${selectedProduct.name} Premium - ProByte`;
      const description =
        selectedProduct.seoDescription ??
        `${selectedProduct.description} Pilih varian, cek stok, dan checkout akun premium ${selectedProduct.name} di ProByte.`;
      document.title = title;
      setMeta("description", description);
      setCanonical(`${import.meta.env.VITE_APP_PUBLIC_URL || window.location.origin}/produk/${selectedProduct.id}`);
      return;
    }

    if (view === "product") {
      document.title = "Produk - ProByte";
      setMeta("description", "Katalog produk digital ProByte dengan filter kategori, sorting, dan status stok realtime.");
      setCanonical(`${import.meta.env.VITE_APP_PUBLIC_URL || window.location.origin}/#product`);
      return;
    }

    if (view === "testimonials") {
      document.title = "Testimoni Pelanggan - ProByte";
      setMeta("description", "Testimoni pelanggan ProByte untuk transaksi akun digital premium, invoice otomatis, stok real-time, dan garansi.");
      setCanonical(`${import.meta.env.VITE_APP_PUBLIC_URL || window.location.origin}/#testimonials`);
      return;
    }

    if (view === "terms" || view === "privacy" || view === "warranty") {
      const titles: Record<string, string> = {
        terms: "Syarat & Ketentuan - ProByte",
        privacy: "Kebijakan Privasi - ProByte",
        warranty: "Kebijakan Garansi - ProByte"
      };
      document.title = titles[view];
      setMeta("description", "Kebijakan layanan ProByte untuk transaksi akun premium, privasi, garansi, dan refund saldo pelanggan.");
      setCanonical(`${import.meta.env.VITE_APP_PUBLIC_URL || window.location.origin}/#${view}`);
      return;
    }

    const labels: Record<string, string> = {
      home: "Home",
      invoice: "Invoice",
      account: "Profil",
      voucher: "Voucher",
      ranking: "Peringkat",
      deposit: "Deposit",
      contact: "Bantuan",
      admin: "Admin"
    };
    document.title = `${labels[view] ?? "Marketplace"} - ProByte`;
    setMeta("description", "ProByte marketplace digital dengan halaman produk terpisah, invoice tracker, deposit wallet, dan fitur peringkat.");
    const hashPath = view === "home" ? "" : `/#${view}`;
    setCanonical(`${import.meta.env.VITE_APP_PUBLIC_URL || window.location.origin}${hashPath}`);
  }, [selectedProduct, view]);

  useEffect(() => {
    if (adminAuthed && adminToken) {
      void hydrateAdminData(adminToken);
    }
  }, [adminAuthed, adminToken]);

  useEffect(() => {
    if (view !== "invoice" || !selectedInvoice) return;
    void fetchInvoice(selectedInvoice, selectedInvoiceToken);
  }, [selectedInvoice, selectedInvoiceToken, session?.access_token, view]);

  useEffect(() => {
    if (view !== "invoice" || !selectedInvoice) return;
    const shouldPoll =
      !remoteInvoiceOrder ||
      remoteInvoiceOrder.paymentStatus === "WAITING_PAYMENT" ||
      remoteInvoiceOrder.deliveryStatus === "PENDING" ||
      remoteInvoiceOrder.deliveryStatus === "PROCESSING";
    if (!shouldPoll) return;

    const timer = window.setInterval(() => {
      void fetchInvoice(selectedInvoice, selectedInvoiceToken);
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [remoteInvoiceOrder, selectedInvoice, selectedInvoiceToken, view]);

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
      if (DEMO_MODE) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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

  async function hydrateCatalog() {
    setCatalogSync("loading");
    try {
      const result = await apiGet<ProductsResponse>("/api/products");
      const synced = catalogFromApi(result);
      setCatalogProducts(synced.length ? synced : products);
      setCatalogSync("synced");
    } catch {
      setCatalogProducts(products);
      setCatalogSync("fallback");
    }
  }

  async function hydratePublicReviews() {
    try {
      const result = await apiGet<PublicReviewsResponse>("/api/reviews?limit=12");
      setPublicReviews(result.reviews.map(publicReviewFromRow));
    } catch {
      setPublicReviews([]);
    }
  }

  async function hydratePromoCatalog() {
    try {
      const { data, error } = await supabase
        .from("promo_codes")
        .select("code,label,type,value,min_subtotal,max_discount,is_active")
        .eq("is_active", true);
      if (error) throw error;
      const mapped = ((data ?? []) as Array<{
        code: string;
        label: string;
        type: "PERCENT" | "FIXED";
        value: number;
        min_subtotal: number;
        max_discount: number | null;
        is_active: boolean;
      }>).map((promo) => ({
        code: promo.code,
        label: promo.label,
        type: promo.type,
        value: Number(promo.value),
        minSubtotal: Number(promo.min_subtotal),
        maxDiscount: promo.max_discount,
        active: promo.is_active
      }));
      if (mapped.length) setPromoCatalog(mapped);
    } catch {
      setPromoCatalog(promoCodes);
    }
  }

  async function hydrateUserAccount(nextSession: Session) {
    setCloudSync("syncing");
    try {
    const [{ data, error }, ledgerResult, { data: claimsData, error: claimsError }] = await Promise.all([
      supabase.from("orders").select("*").eq("user_id", nextSession.user.id).order("created_at", { ascending: false }),
      apiGet<WalletLedgerResponse>("/api/wallet/ledger", { token: nextSession.access_token }),
      supabase.from("warranty_claims").select("*").eq("user_id", nextSession.user.id).order("created_at", { ascending: false })
    ]);
    if (error) {
      setCloudSync("error");
      pushToast(`Sync order gagal: ${error.message}`, "fail");
      return;
    }
    if (claimsError) {
      setCloudSync("error");
      pushToast(`Sync klaim gagal: ${claimsError.message}`, "fail");
      return;
    }

    const cloudOrders = ((data ?? []) as OrderRow[]).map(orderFromRow);
    const cloudLedger = ledgerResult.ledger.map(walletLedgerFromRow);
    const cloudClaims = ((claimsData ?? []) as WarrantyClaimRow[]).map(warrantyClaimFromRow);
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
      draft.walletLedger = [...draft.walletLedger.filter((entry) => entry.userId !== nextSession.user.id), ...cloudLedger];
      draft.warrantyClaims = [...draft.warrantyClaims.filter((claim) => claim.userId !== nextSession.user.id), ...cloudClaims];
    });

    try {
      const result = await apiGet<AccountReviewsResponse>("/api/account/reviews", { token: nextSession.access_token });
      setAccountReviews(result.reviews.map(reviewFromRow));
    } catch (error) {
      pushToast((error as Error).message, "fail");
    }
    setCloudSync("idle");
    } catch (error) {
      setCloudSync("error");
      pushToast((error as Error).message, "fail");
    }
  }

  async function hydrateAdminData(token = adminToken) {
    if (!token) return;
    try {
      const [ordersResult, claimsResult, productsResult, promosResult, auditResult, analyticsResult, walletSummaryResult, walletLedgerResult] = await Promise.all([
        apiGet<AdminOrdersResponse>("/api/admin/orders", { adminToken: token }),
        apiGet<AdminWarrantyClaimsResponse>("/api/admin/warranty-claims", { adminToken: token }),
        apiGet<AdminProductsResponse>("/api/admin/products", { adminToken: token }),
        apiGet<AdminPromosResponse>("/api/admin/promos", { adminToken: token }),
        apiGet<AdminAuditLogsResponse>("/api/admin/audit-logs", { adminToken: token }),
        apiGet<AdminAnalyticsResponse>("/api/admin/analytics", { adminToken: token }),
        apiGet<AdminWalletSummaryResponse>("/api/admin/wallet-summary", { adminToken: token }),
        apiGet<AdminWalletLedgerResponse>("/api/admin/wallet-ledger", { adminToken: token })
      ]);
      setAdminProducts(productsResult.products);
      setAdminPromos(promosResult.promos);
      setPromoCatalog(promosResult.promos.map((promo) => ({
        code: promo.code,
        label: promo.label,
        type: promo.type,
        value: Number(promo.value),
        minSubtotal: Number(promo.min_subtotal),
        maxDiscount: promo.max_discount,
        active: promo.is_active
      })));
      setAdminAuditLogs(auditResult.logs);
      setAdminAnalytics(analyticsResult);
      setAdminWalletSummary(walletSummaryResult.customers);
      setAdminWalletLedger(walletLedgerResult.ledger.map(walletLedgerFromRow));
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
    setAccountReviews([]);
    pushToast("Keluar dari akun pelanggan.", "success");
  }

  function navigate(nextView: ViewName, invoice?: string, invoiceToken?: string) {
    setMobileNavOpen(false);
    setView(nextView);
    if (invoice) {
      setRemoteInvoiceOrder((current) => (current?.invoiceNumber === invoice ? current : null));
      setSelectedInvoice(invoice);
      setSelectedInvoiceToken(invoiceToken ?? "");
    } else if (nextView !== "invoice") {
      setRemoteInvoiceOrder(null);
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
    setView("product-detail");
    window.history.pushState({}, "", `/produk/${product.id}`);
  }

  function selectProduct(product: Product) {
    setSelectedProductId(product.id);
    const firstReadyVariant = product.variants.find((variant) => variantStockCount(state, variant) > 0);
    setSelectedVariantId((firstReadyVariant ?? product.variants[0]).id);
    setQty(1);
  }

  async function handleCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canCheckout) {
      pushToast(checkoutIssues[0] ?? "Lengkapi checkout dulu.", "fail");
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

    const deliveredAccounts = checkoutResult.accounts ?? [];
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
      accounts: deliveredAccounts,
      createdAt: now,
      paidAt: paymentMethod === "WALLET" ? now : null,
      expiredAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      history: [{ at: now, text: paymentMethod === "WALLET" ? "Invoice dibuat dan dibayar memakai saldo" : "Invoice dibuat" }]
    };

    const orderForState = DEMO_MODE ? order : { ...order, accounts: [] };
    persist((draft) => {
      draft.orders.unshift(orderForState);
      draft.audits.unshift(createAudit("CREATE_ORDER", "order", order.id, { invoiceNumber }));
    });
    if (deliveredAccounts.length) setRemoteInvoiceOrder(order);
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
      void hydrateAdminData();
      void hydrateCatalog();
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
      const invoiceToken = claimInvoiceToken.trim() || (invoiceNumber === selectedInvoice ? selectedInvoiceToken : "");
      await apiPost("/api/warranty-claims", { invoiceNumber, invoiceToken, issueSummary }, { token: session.access_token });
      setClaimInvoice("");
      setClaimInvoiceToken("");
      setClaimIssue("");
      void hydrateUserAccount(session);
      pushToast("Klaim dibuat. Lanjutkan chat admin dengan mengirim invoice.", "success");
    } catch (error) {
      pushToast((error as Error).message, "fail");
    }
  }

  async function handleReviewSubmit(order: Order, rating: number, comment: string) {
    if (!session) {
      pushToast("Masuk akun pelanggan dulu untuk mengirim ulasan.", "fail");
      navigate("account");
      return;
    }

    try {
      const result = await apiPost<ReviewResponse>(
        "/api/reviews",
        {
          orderId: order.id,
          rating,
          comment
        },
        { token: session.access_token }
      );
      const review = reviewFromRow(result.review);
      setAccountReviews((items) => [review, ...items.filter((item) => item.orderId !== review.orderId)]);
      void hydratePublicReviews();
      pushToast("Ulasan berhasil disimpan.", "success");
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

  async function reviewWarrantyClaim(claimId: string) {
    try {
      await apiPost(`/api/admin/warranty-claims/${encodeURIComponent(claimId)}/review`, {}, { adminToken });
      void hydrateAdminData();
      pushToast("Klaim masuk review.", "success");
    } catch (error) {
      pushToast((error as Error).message, "fail");
    }
  }

  async function rejectWarrantyClaim(claimId: string) {
    try {
      await apiPost(`/api/admin/warranty-claims/${encodeURIComponent(claimId)}/reject`, {}, { adminToken });
      void hydrateAdminData();
      pushToast("Klaim ditolak.", "success");
    } catch (error) {
      pushToast((error as Error).message, "fail");
    }
  }

  async function replaceOrderAccounts(invoiceNumber: string) {
    try {
      await apiPost(`/api/admin/orders/${encodeURIComponent(invoiceNumber)}/replace-account`, {}, { adminToken });
      await hydrateAdminData();
      void hydrateCatalog();
      if (selectedInvoice === invoiceNumber) void fetchInvoice(invoiceNumber, selectedInvoiceToken);
      pushToast("Akun order diganti dari stok baru.", "success");
    } catch (error) {
      pushToast((error as Error).message, "fail");
    }
  }

  async function sendRestockAlerts() {
    try {
      const result = await apiPost<{ sent: boolean; alerts: unknown[] }>("/api/admin/restock-alerts/send", {}, { adminToken });
      await hydrateAdminData();
      pushToast(result.sent ? "Restock alert dikirim ke email admin." : "Tidak ada alert atau SMTP belum aktif.", result.sent ? "success" : "");
    } catch (error) {
      pushToast((error as Error).message, "fail");
    }
  }

  async function adjustWallet(payload: { userId: string; direction: "CREDIT" | "DEBIT"; amount: number; note: string }) {
    try {
      await apiPost<AdminWalletAdjustmentResponse>("/api/admin/wallet-adjustments", payload, { adminToken });
      await hydrateAdminData();
      if (session?.user.id === payload.userId) void hydrateUserAccount(session);
      pushToast(payload.direction === "CREDIT" ? "Saldo pelanggan ditambah." : "Saldo pelanggan dikurangi.", "success");
    } catch (error) {
      pushToast((error as Error).message, "fail");
    }
  }

  async function createAdminProduct(payload: Record<string, unknown>) {
    try {
      await apiPost("/api/admin/products", payload, { adminToken });
      await hydrateAdminData();
      await hydrateCatalog();
      pushToast("Produk ditambahkan.", "success");
    } catch (error) {
      pushToast((error as Error).message, "fail");
    }
  }

  async function updateAdminProduct(productId: string, payload: Record<string, unknown>) {
    try {
      await apiPatch(`/api/admin/products/${encodeURIComponent(productId)}`, payload, { adminToken });
      await hydrateAdminData();
      await hydrateCatalog();
      pushToast("Produk diperbarui.", "success");
    } catch (error) {
      pushToast((error as Error).message, "fail");
    }
  }

  async function createAdminVariant(payload: Record<string, unknown>) {
    try {
      await apiPost("/api/admin/variants", payload, { adminToken });
      await hydrateAdminData();
      await hydrateCatalog();
      pushToast("Varian ditambahkan.", "success");
    } catch (error) {
      pushToast((error as Error).message, "fail");
    }
  }

  async function updateAdminVariant(variantId: string, payload: Record<string, unknown>) {
    try {
      await apiPatch(`/api/admin/variants/${encodeURIComponent(variantId)}`, payload, { adminToken });
      await hydrateAdminData();
      await hydrateCatalog();
      pushToast("Varian diperbarui.", "success");
    } catch (error) {
      pushToast((error as Error).message, "fail");
    }
  }

  async function createAdminPromo(payload: Record<string, unknown>) {
    try {
      await apiPost("/api/admin/promos", payload, { adminToken });
      await hydrateAdminData();
      pushToast("Promo ditambahkan.", "success");
    } catch (error) {
      pushToast((error as Error).message, "fail");
    }
  }

  async function updateAdminPromo(code: string, payload: Record<string, unknown>) {
    try {
      await apiPatch(`/api/admin/promos/${encodeURIComponent(code)}`, payload, { adminToken });
      await hydrateAdminData();
      pushToast("Promo diperbarui.", "success");
    } catch (error) {
      pushToast((error as Error).message, "fail");
    }
  }

  function exportOrdersCsv() {
    const headers = ["invoice", "product", "variant", "qty", "total", "payment_status", "delivery_status", "created_at"];
    const rows = state.orders.map((order) => [
      order.invoiceNumber,
      order.productName,
      order.variantName,
      String(order.qty),
      String(order.total),
      order.paymentStatus,
      order.deliveryStatus,
      order.createdAt
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `probyte-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function invoiceShareLink(invoiceNumber: string, token = selectedInvoiceToken) {
    const params = new URLSearchParams({ invoice: invoiceNumber });
    if (token) params.set("token", token);
    return `${window.location.origin}/#${params.toString()}`;
  }

  function copyInvoiceLink(invoiceNumber: string) {
    copyToClipboard(invoiceShareLink(invoiceNumber));
    pushToast("Link invoice disalin.", "success");
  }

  async function sendInvoiceReceipt(invoiceNumber: string) {
    try {
      await apiPost(`/api/invoices/${encodeURIComponent(invoiceNumber)}/receipt`, { invoiceToken: selectedInvoiceToken }, { token: session?.access_token });
      pushToast("Receipt invoice dikirim ke email pelanggan.", "success");
    } catch (error) {
      pushToast((error as Error).message, "fail");
    }
  }

  function openWhatsappSupport(order: Order) {
    const supportNumber = String(import.meta.env.VITE_SUPPORT_WHATSAPP || "").replace(/\D/g, "");
    const message = `Halo Admin ProByte, saya butuh bantuan untuk invoice ${order.invoiceNumber} (${order.productName} ${order.variantName}). Status: ${order.paymentStatus}/${order.deliveryStatus}.`;
    if (!supportNumber) {
      copyToClipboard(message);
      pushToast("Nomor support belum diset. Pesan bantuan disalin.", "");
      return;
    }
    window.open(`https://wa.me/${supportNumber}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  function resetDemo() {
    if (!DEMO_MODE) {
      pushToast("Reset demo hanya aktif saat VITE_DEMO_MODE=true.", "fail");
      return;
    }
    const seeded = createSeedState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    setState(seeded);
    setSelectedProductId(catalogProducts[0]?.id ?? products[0].id);
    setSelectedVariantId(catalogProducts[0]?.variants[0]?.id ?? products[0].variants[0].id);
    setSelectedInvoice("");
    pushToast("Data demo direset.", "success");
  }

  const invoiceOrder = selectedInvoice
    ? remoteInvoiceOrder?.invoiceNumber === selectedInvoice
      ? remoteInvoiceOrder
      : findOrder(state, selectedInvoice)
    : null;

  const appNavItems = [
    { id: "home", label: "Home", icon: "grid" as IconName, active: view === "home", onClick: () => navigate("home") },
    { id: "product", label: "Product", icon: "box" as IconName, active: view === "product" || view === "product-detail", onClick: () => navigate("product") },
    { id: "invoice", label: "Riwayat / Invoice", icon: "invoice" as IconName, active: view === "invoice", onClick: () => navigate("invoice") },
    { id: "account", label: "Akun / Profil", icon: "user" as IconName, active: view === "account", onClick: () => navigate("account") },
    { id: "voucher", label: "Voucher", icon: "tag" as IconName, active: view === "voucher", onClick: () => navigate("voucher") },
    { id: "ranking", label: "Peringkat", icon: "star" as IconName, active: view === "ranking", onClick: () => navigate("ranking") },
    { id: "deposit", label: "Deposit", icon: "wallet" as IconName, active: view === "deposit", onClick: () => navigate("deposit") },
    { id: "contact", label: "Contact / Bantuan", icon: "support" as IconName, active: view === "contact", onClick: () => navigate("contact") }
  ];
  const mobileNavItems = [
    { id: "home", label: "Home", icon: "grid" as IconName, active: view === "home", onClick: () => navigate("home") },
    { id: "product", label: "Product", icon: "box" as IconName, active: view === "product" || view === "product-detail", onClick: () => navigate("product") },
    { id: "invoice", label: "Invoice", icon: "invoice" as IconName, active: view === "invoice", onClick: () => navigate("invoice") },
    { id: "deposit", label: "Deposit", icon: "wallet" as IconName, active: view === "deposit", onClick: () => navigate("deposit") },
    { id: "account", label: "Profil", icon: "user" as IconName, active: view === "account", onClick: () => navigate("account") }
  ];
  const sidebarCategories: SidebarCategoryItem[] = [
    { key: "Semua", label: "Semua", icon: "grid", count: catalogProducts.length },
    ...categories
      .filter((item) => item !== "Semua")
      .map((item) => ({
        key: item,
        label: categoryLabel(item),
        icon: categoryIcon(item),
        count: catalogProducts.filter((product) => product.category === item).length
      }))
  ];
  const storefrontMetrics = [
    { label: "Produk", value: catalogProducts.length },
    { label: "Order", value: state.orders.length },
    { label: "Paid", value: state.orders.filter((order) => order.paymentStatus === "PAID").length },
    { label: "Promo Aktif", value: promoCatalog.filter((promo) => promo.active).length }
  ];
  const showStoreSidebar = view !== "admin";
  const userLedger = session ? state.walletLedger.filter((entry) => entry.userId === session.user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [];
  const topbarMap: Partial<Record<ViewName, { title: string; description: string }>> = {
    home: { title: "Home", description: "Ringkasan marketplace dan shortcut utama." },
    product: { title: "Produk", description: "Katalog produk digital dengan pencarian, filter, dan sorting." },
    "product-detail": { title: "Detail Produk", description: "Lihat detail varian, stok, dan lanjutkan checkout." },
    invoice: { title: "Riwayat / Invoice", description: "Pantau status pembayaran dan detail pesanan." },
    account: { title: "Akun / Profil", description: "Kelola data akun, riwayat, dan klaim." },
    voucher: { title: "Voucher", description: "Daftar kode promo aktif marketplace." },
    ranking: { title: "Peringkat", description: "Leaderboard pembeli berdasarkan transaksi." },
    deposit: { title: "Deposit", description: "Kelola saldo wallet untuk checkout instan." },
    contact: { title: "Contact / Bantuan", description: "Pusat bantuan dan informasi support." },
    testimonials: { title: "Testimoni", description: "Ulasan pelanggan ProByte." },
    terms: { title: "Syarat Layanan", description: "Informasi syarat penggunaan layanan." },
    privacy: { title: "Privasi", description: "Informasi kebijakan privasi pengguna." },
    warranty: { title: "Garansi", description: "Informasi garansi dan refund layanan." }
  };
  const topbarInfo = topbarMap[view] ?? { title: "ProByte", description: "Marketplace digital premium." };
  const invoiceHistory = session ? currentUserOrders : state.orders.slice(0, 10);
  const supportWhatsapp = String(import.meta.env.VITE_SUPPORT_WHATSAPP || "").replace(/\D/g, "");

  return (
    <AppShell
      sidebar={
        showStoreSidebar ? (
          <AppSidebar
            menuItems={appNavItems}
            onInvoice={() => navigate("invoice")}
          />
        ) : undefined
      }
      mobileNav={showStoreSidebar ? <MobileBottomNav items={mobileNavItems} /> : undefined}
      footer={
        <footer className="site-footer app-links">
          <button type="button" onClick={() => navigate("terms")}>
            Syarat & Ketentuan
          </button>
          <button type="button" onClick={() => navigate("privacy")}>
            Privasi
          </button>
          <button type="button" onClick={() => navigate("warranty")}>
            Garansi & Refund
          </button>
        </footer>
      }
      toasts={
        <div className="toast-stack" aria-live="polite">
          {toasts.map((toast) => (
            <div className={`toast ${toast.type}`} key={toast.id}>
              {toast.message}
            </div>
          ))}
        </div>
      }
    >
      {showStoreSidebar ? (
        <>
          <MobileSidebarDrawer
            open={mobileNavOpen}
            menuItems={appNavItems}
            onClose={() => setMobileNavOpen(false)}
          />
          <AppTopbar
            title={topbarInfo.title}
            description={topbarInfo.description}
            userLabel={session?.user.email ?? "Guest"}
            themeMode={themeMode}
            onOpenMenu={() => setMobileNavOpen(true)}
            onThemeToggle={() => setThemeMode((current) => (current === "dark" ? "light" : "dark"))}
          />
        </>
      ) : null}

      {view === "home" ? (
        <>
          <HomePage
            metrics={storefrontMetrics}
            highlights={[
              { title: "Belanja produk", caption: "Masuk ke katalog utama khusus produk digital.", actionLabel: "Buka Product", onClick: () => navigate("product") },
              { title: "Cek invoice", caption: "Lihat pembayaran dan status delivery order.", actionLabel: "Buka Invoice", onClick: () => navigate("invoice") },
              { title: "Isi saldo", caption: "Top up wallet untuk checkout cepat.", actionLabel: "Buka Deposit", onClick: () => navigate("deposit") }
            ]}
            onGoProduct={() => navigate("product")}
            onGoInvoice={() => navigate("invoice")}
            onGoDeposit={() => navigate("deposit")}
          />

          <section className="checkout-flow-shell">
            <aside className="checkout-flow-side">
              <p className="eyebrow">Quick Checkout</p>
              <h2>Checkout Instan</h2>
              <p>Form checkout tetap tersedia di Home sebagai jalur transaksi cepat.</p>
              <button className="ghost-btn" type="button" onClick={() => navigateProduct(selectedProduct)}>
                <Icon name="box" />
                Detail Produk
              </button>
            </aside>

            <form className="checkout-flow-form" onSubmit={handleCheckout}>
              <div className="checkout-selected">
                <ProductArtwork product={selectedProduct} />
                <div>
                  <strong>{selectedProduct.name}</strong>
                  <small>{categoryLabel(selectedProduct.category)}</small>
                </div>
                <span className={`stock-pill ${selectedVariantStockCount ? "" : "empty"}`}>
                  {selectedVariantStockCount ? `${selectedVariantStockCount} stok` : "Stok habis"}
                </span>
              </div>

              <label className="field">
                <span>Varian Produk</span>
                <select
                  value={selectedVariantId}
                  onChange={(event) => {
                    setSelectedVariantId(event.target.value);
                    setQty(1);
                  }}
                >
                  {selectedProduct.variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.name} | {rupiah.format(variant.price)} | {variantStockCount(state, variant)} stok
                    </option>
                  ))}
                </select>
              </label>

              <div className="split-fields two">
                <label className="field">
                  <span>Qty</span>
                  <input min={1} max={Math.max(selectedVariantStockCount, 1)} type="number" value={safeQty} onChange={(event) => setQty(Number(event.target.value))} />
                </label>
                <label className="field">
                  <span>WhatsApp</span>
                  <input value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} placeholder="08xxxxxxxxxx" type="tel" />
                  {whatsapp && !isValidPhone(whatsapp) ? <small className="field-error">Nomor WA belum valid.</small> : null}
                </label>
              </div>

              <div className="split-fields two">
                <label className="field">
                  <span>Email (Opsional)</span>
                  <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@email.com" type="email" />
                  {email && !isValidEmail(email) ? <small className="field-error">Format email belum valid.</small> : null}
                </label>
                <label className="field">
                  <span>Kode Promo</span>
                  <input value={promoInput} onChange={(event) => setPromoInput(event.target.value.toUpperCase())} placeholder="PROBYTE10" />
                </label>
              </div>

              <div className="payment-switcher" role="group" aria-label="Metode pembayaran">
                <button
                  className={`payment-option ${paymentMethod === "XENDIT_INVOICE" ? "is-active" : ""}`}
                  type="button"
                  onClick={() => setPaymentMethod("XENDIT_INVOICE")}
                >
                  <Icon name="card" />
                  <span>Xendit</span>
                </button>
                <button className={`payment-option ${paymentMethod === "WALLET" ? "is-active" : ""}`} type="button" onClick={() => setPaymentMethod("WALLET")}>
                  <Icon name="wallet" />
                  <span>Saldo</span>
                </button>
              </div>

              {checkoutIssues[0] ? <p className="checkout-hint">{checkoutIssues[0]}</p> : null}

              <button className="primary-btn" disabled={!canCheckout} type="submit">
                <Icon name="invoice" />
                Buat Invoice
              </button>
            </form>

            <aside className="checkout-flow-summary">
              <div className="summary-sticky-card">
                <p className="eyebrow">Ringkasan Pesanan</p>
                <h3>{selectedProduct.name}</h3>
                <div className="summary-row">
                  <span>Subtotal</span>
                  <strong>{rupiah.format(subtotal)}</strong>
                </div>
                <div className="summary-row">
                  <span>Diskon</span>
                  <strong>{discount ? `-${rupiah.format(discount)}` : "-"}</strong>
                </div>
                <div className="summary-row">
                  <span>Biaya</span>
                  <strong>{rupiah.format(paymentFee)}</strong>
                </div>
                {paymentMethod === "WALLET" ? (
                  <div className="summary-row">
                    <span>Saldo</span>
                    <strong>{session ? rupiah.format(walletBalance) : "Login dulu"}</strong>
                  </div>
                ) : null}
                <div className="summary-row total">
                  <span>Total</span>
                  <strong>{rupiah.format(total)}</strong>
                </div>
                <button className="ghost-btn" type="button" onClick={() => navigate("invoice")}>
                  <Icon name="search" />
                  Cek Invoice
                </button>
              </div>
            </aside>
          </section>
        </>
      ) : null}

      {view === "product" ? (
        <ProductPage
          syncState={catalogSync}
          products={visibleProducts}
          query={query}
          sort={productSort}
          categories={sidebarCategories}
          activeCategory={category}
          totalVisible={visibleProducts.length}
          totalAll={filteredProducts.length}
          canLoadMore={visibleProducts.length < filteredProducts.length}
          onLoadMore={() => setVisibleProductCount((count) => count + 9)}
          onQueryChange={setQuery}
          onQueryClear={() => setQuery("")}
          onCategoryPick={setCategory}
          onSortChange={setProductSort}
          getStock={(product) => productStockCount(state, product)}
          getSoldCount={(productId) => soldByProduct.get(productId) ?? 0}
          onOpenDetail={navigateProduct}
          onBuy={(product) => {
            selectProduct(product);
            navigate("home");
          }}
        />
      ) : null}

      {view === "product-detail" ? (
        <ProductSeoPage
          product={selectedProduct}
          state={state}
          onBack={() => navigate("product")}
          onCheckout={() => {
            selectProduct(selectedProduct);
            navigate("home");
          }}
        />
      ) : null}

      {view === "invoice" ? (
        <InvoicePage
          selectedInvoice={selectedInvoice}
          selectedInvoiceToken={selectedInvoiceToken}
          invoiceOrder={invoiceOrder}
          orders={invoiceHistory}
          onInvoiceChange={setSelectedInvoice}
          onTokenChange={setSelectedInvoiceToken}
          onSubmitSearch={(event) => {
            event.preventDefault();
            const invoice = selectedInvoice.trim();
            navigate("invoice", invoice, selectedInvoiceToken);
            void fetchInvoice(invoice);
          }}
          onPay={handlePay}
          onCopy={copyToClipboard}
          onOpenProfile={() => navigate("account")}
          onRefresh={(invoice) => void fetchInvoice(invoice)}
          onCopyLink={copyInvoiceLink}
          onSendReceipt={(invoice) => void sendInvoiceReceipt(invoice)}
          onWhatsAppSupport={openWhatsappSupport}
          onOpenInvoice={(invoice) => {
            setSelectedInvoice(invoice);
            navigate("invoice", invoice);
          }}
          onCopyInvoice={(invoice) => {
            copyToClipboard(invoice);
            pushToast("Invoice ID disalin.", "success");
          }}
        />
      ) : null}

      {view === "account" ? (
        <ProfilePage
          session={session}
          walletBalance={walletBalance}
          orderCount={currentUserOrders.length}
          reviewCount={accountReviews.length}
          onOpenInvoice={() => navigate("invoice")}
          onOpenDeposit={() => navigate("deposit")}
          onOpenRanking={() => navigate("ranking")}
        >
          <AccountView
            authEmail={authEmail}
            authMode={authMode}
            authName={authName}
            authPassword={authPassword}
            authReady={authReady}
            authSubmitting={authSubmitting}
            claimInvoice={claimInvoice}
            claimInvoiceToken={claimInvoiceToken}
            claimIssue={claimIssue}
            claims={currentUserClaims}
            cloudSync={cloudSync}
            ledger={session ? state.walletLedger.filter((entry) => entry.userId === session.user.id) : []}
            orders={currentUserOrders}
            reviews={accountReviews}
            session={session}
            topUpAmount={topUpAmount}
            walletBalance={walletBalance}
            onAuth={handleAuth}
            onClaimInvoiceChange={setClaimInvoice}
            onClaimInvoiceTokenChange={setClaimInvoiceToken}
            onClaimIssueChange={setClaimIssue}
            onLogout={handleLogout}
            onModeChange={setAuthMode}
            onNameChange={setAuthName}
            onEmailChange={setAuthEmail}
            onOpenInvoice={(invoice) => navigate("invoice", invoice)}
            onPasswordChange={setAuthPassword}
            onReviewSubmit={handleReviewSubmit}
            onTopUp={handleTopUp}
            onTopUpAmountChange={setTopUpAmount}
            onWarrantyClaim={handleWarrantyClaim}
          />
        </ProfilePage>
      ) : null}

      {view === "voucher" ? <VoucherPage promos={promoCatalog} onOpenProduct={() => navigate("product")} /> : null}

      {view === "ranking" ? <RankingPage rows={rankingRows} /> : null}

      {view === "deposit" ? (
        <DepositPage
          session={session}
          balance={walletBalance}
          topUpAmount={topUpAmount}
          ledger={userLedger}
          onTopUpAmountChange={setTopUpAmount}
          onTopUp={handleTopUp}
        />
      ) : null}

      {view === "contact" ? (
        <ContactPage supportWhatsapp={supportWhatsapp} supportEmail={adminAlertEmail} onOpenInvoice={() => navigate("invoice")} />
      ) : null}

      {view === "testimonials" ? <TestimonialsPage reviews={publicReviews} onBackToStore={() => navigate("home")} /> : null}

      {view === "terms" || view === "privacy" || view === "warranty" ? (
        <LegalPage kind={view} onBackToStore={() => navigate("home")} />
      ) : null}

      {view === "admin" ? (
        <section className="admin-layout">
          {!adminAuthed ? (
            <section className="admin-auth-shell">
              <article className="panel admin-login-panel">
                <div className="admin-login-brand">
                  <LogoMark />
                  <div>
                    <strong>ProByte Admin</strong>
                    <small>Control Center</small>
                  </div>
                </div>
                <h1>Kelola Operasional Marketplace</h1>
                <p>Masuk ke panel admin untuk monitor order, stok, promo, wallet, klaim garansi, dan audit log.</p>
                <p className="eyebrow">Admin Sign In</p>
                <h2>Masuk Dashboard</h2>
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
                    Masuk Admin
                  </button>
                </form>
                <p className="admin-login-note">Akses terbatas untuk operator internal ProByte.</p>
                <ul className="admin-login-points">
                  <li>
                    <Icon name="check" />
                    <span>Monitoring order dan invoice real-time</span>
                  </li>
                  <li>
                    <Icon name="check" />
                    <span>Manajemen produk, varian, dan promo</span>
                  </li>
                  <li>
                    <Icon name="check" />
                    <span>Kontrol klaim garansi serta saldo pelanggan</span>
                  </li>
                </ul>
              </article>
            </section>
          ) : (
            <AdminDashboardShell
              sidebar={
                <AdminSidebar
                  title="ProByte Admin"
                  subtitle="Control Center"
                  tabs={adminTabs.map((tab) => ({ id: tab.id, label: tab.label, icon: adminTabIcons[tab.id] }))}
                  activeTab={adminTab}
                  onTabChange={(tabId) => setAdminTab(tabId as AdminTab)}
                />
              }
            >
              <div className="admin-head">
                <div>
                  <p className="eyebrow">Dashboard</p>
                  <h1>Operasional ProByte</h1>
                  <p>Monitor omzet, order, stok, promo, klaim, dan audit dalam satu tampilan.</p>
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

              {adminTab === "overview" ? <RestockAlertPanel alerts={lowStockAlerts} adminEmail={adminAlertEmail} onSend={sendRestockAlerts} /> : null}

              {adminTab === "orders" ? (
                <OrdersTable
                  demoMode={DEMO_MODE}
                  orders={state.orders}
                  onOpen={(invoice) => navigate("invoice", invoice)}
                  onPay={() => pushToast("Status paid hanya boleh berubah dari webhook Xendit.", "fail")}
                  onDeliver={(invoice) => {
                    persist((draft) => deliverOrder(draft, invoice));
                    pushToast("Delivery diproses.", "success");
                  }}
                  onExpire={expireOrder}
                  onReplace={(invoice) => void replaceOrderAccounts(invoice)}
                  onExport={exportOrdersCsv}
                  onReset={resetDemo}
                />
              ) : null}

              {adminTab === "stock" ? (
                <>
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
                            {catalogProducts.flatMap((product) =>
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
                  </div>
                  <StockTable state={state} catalogProducts={catalogProducts} />
                </>
              ) : null}

              {adminTab === "products" ? (
                <ProductManager
                  products={adminProducts}
                  onCreateProduct={createAdminProduct}
                  onUpdateProduct={updateAdminProduct}
                  onCreateVariant={createAdminVariant}
                  onUpdateVariant={updateAdminVariant}
                />
              ) : null}

              {adminTab === "promos" ? <PromoManager promos={adminPromos} onCreatePromo={createAdminPromo} onUpdatePromo={updateAdminPromo} /> : null}

              {adminTab === "wallet" ? <WalletAdminPanel ledger={adminWalletLedger} summary={adminWalletSummary} onAdjustWallet={adjustWallet} /> : null}

              {adminTab === "warranty" ? (
                <WarrantyClaimsTable
                  claims={state.warrantyClaims}
                  orders={state.orders}
                  onReview={reviewWarrantyClaim}
                  onRefund={refundWarrantyClaim}
                  onReject={rejectWarrantyClaim}
                />
              ) : null}

              {adminTab === "audit" ? <AuditLogTable logs={adminAuditLogs} /> : null}

              {adminTab === "settings" ? (
                <div className="panel">
                  <div className="panel-title">
                    <div>
                      <p className="eyebrow">Integrasi</p>
                      <h2>Status Xendit</h2>
                    </div>
                    <span className="status-badge warning">Sandbox</span>
                  </div>
                  <DataTable>
                    <table>
                      <tbody>
                        <tr>
                          <th>Provider</th>
                          <td>Xendit</td>
                        </tr>
                        <tr>
                          <th>Checkout API</th>
                          <td>/api/checkout</td>
                        </tr>
                        <tr>
                          <th>Callback API</th>
                          <td>/api/xendit/webhook</td>
                        </tr>
                        <tr>
                          <th>Webhook Key</th>
                          <td>x-callback-token</td>
                        </tr>
                        <tr>
                          <th>Restock Alert</th>
                          <td>{adminAlertEmail}</td>
                        </tr>
                      </tbody>
                    </table>
                  </DataTable>
                </div>
              ) : null}
            </AdminDashboardShell>
          )}
        </section>
      ) : null}
    </AppShell>
  );
}

function catalogFromApi(response: ProductsResponse): Product[] {
  return response.products.map((remoteProduct) => {
    const local = products.find((product) => product.id === remoteProduct.id || product.id === remoteProduct.slug);
    const variants = (remoteProduct.variants ?? []).map((remoteVariant) => {
      const localVariant = local?.variants.find((variant) => variant.id === remoteVariant.id);
      return {
        id: remoteVariant.id,
        name: localVariant?.name ?? remoteVariant.name,
        duration: "30 hari",
        price: Number(remoteVariant.sell_price),
        seed: localVariant?.seed ?? 0,
        stock: Number(remoteVariant.stock ?? 0),
        lowStockThreshold: remoteVariant.low_stock_threshold ?? localVariant?.lowStockThreshold ?? 2
      };
    });

    return {
      id: remoteProduct.id,
      name: remoteProduct.name,
      initials: local?.initials ?? remoteProduct.icon_label ?? remoteProduct.name.slice(0, 2).toUpperCase(),
      category: remoteProduct.category,
      description: remoteProduct.description,
      imageUrl: local?.imageUrl,
      seoTitle: remoteProduct.seo_title ?? local?.seoTitle,
      seoDescription: remoteProduct.seo_description ?? local?.seoDescription,
      tags: local?.tags ?? [remoteProduct.category],
      variants: variants.length ? variants : local?.variants ?? []
    };
  });
}

function findCatalogProduct(catalog: Product[], productId: string) {
  return catalog.find((product) => product.id === productId);
}

function getInitialThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return "light";
}

function findCatalogVariant(catalog: Product[], variantId: string) {
  for (const product of catalog) {
    const variant = product.variants.find((item) => item.id === variantId);
    if (variant) return variant;
  }
  return null;
}

function variantStockCount(state: DemoState, variant: ProductVariant) {
  if (typeof variant.stock === "number") return variant.stock;
  return state.stocks.filter((stock) => stock.variantId === variant.id && stock.status === "AVAILABLE").length;
}

function productStockCount(state: DemoState, product: Product) {
  return product.variants.reduce((sum, variant) => sum + variantStockCount(state, variant), 0);
}

function lowestProductPrice(product: Product) {
  return product.variants.length ? Math.min(...product.variants.map((variant) => variant.price)) : 0;
}

function ProductArtwork({ product }: { product: Product }) {
  return (
    <span className="product-art" aria-hidden="true">
      {product.imageUrl ? (
        <img
          alt=""
          decoding="async"
          loading="eager"
          referrerPolicy="no-referrer"
          src={product.imageUrl}
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
    </span>
  );
}

function categoryLabel(category: string) {
  const labels: Record<string, string> = {
    AI: "AI Tools",
    Editing: "Design",
    Learning: "Education",
    Music: "Music",
    Productivity: "Productivity",
    Streaming: "Streaming",
    Utility: "Utility",
    "Video Platform": "Video"
  };

  return labels[category] ?? category;
}

function categoryIcon(category: string): IconName {
  const icons: Record<string, IconName> = {
    AI: "bolt",
    Editing: "spark",
    Learning: "help",
    Music: "star",
    Productivity: "grid",
    Streaming: "box",
    Utility: "grid",
    "Video Platform": "box"
  };
  return icons[category] ?? "box";
}

function anonymizeMember(identity: string) {
  if (!identity) return "Guest";
  if (identity.includes("@")) {
    const [name] = identity.split("@");
    if (name.length < 3) return `${name}***`;
    return `${name.slice(0, 2)}***`;
  }
  const digits = identity.replace(/\D/g, "");
  if (digits.length >= 8) return `${digits.slice(0, 3)}****${digits.slice(-2)}`;
  return `${identity.slice(0, 4)}***`;
}

function rankingBadge(rank: number, totalAmount: number) {
  if (rank === 1) return "Top 1";
  if (rank === 2) return "Top 2";
  if (rank === 3) return "Top 3";
  if (totalAmount >= 1_000_000) return "Elite Buyer";
  if (totalAmount >= 500_000) return "Pro Buyer";
  return "Active Buyer";
}
