import type { DemoState, PromoCode } from "@/lib/types";

export const STORAGE_KEY = "probyte_vite_demo_state_v1";
export const ADMIN_SESSION_KEY = "probyte_admin_session_v1";
export const MIN_TOP_UP = 10000;
export const DEMO_MODE =
  String((import.meta as ImportMeta & { env?: Record<string, unknown> }).env?.VITE_DEMO_MODE ?? "").toLowerCase() === "true";

export const emptyState: DemoState = {
  stocks: [],
  orders: [],
  audits: [],
  walletLedger: [],
  warrantyClaims: [],
  createdAt: ""
};

export const promoCodes: PromoCode[] = [
  {
    code: "PROBYTE10",
    label: "Diskon 10%",
    type: "PERCENT",
    value: 10,
    minSubtotal: 25000,
    maxDiscount: 20000,
    active: true
  },
  {
    code: "HEMAT5K",
    label: "Potongan Rp5.000",
    type: "FIXED",
    value: 5000,
    minSubtotal: 50000,
    maxDiscount: null,
    active: true
  }
];

export const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0
});
