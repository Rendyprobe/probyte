import { timingSafeEqual } from "node:crypto";

const XENDIT_API_BASE_URL = "https://api.xendit.co";

export type XenditInvoiceRequest = {
  external_id: string;
  amount: number;
  description: string;
  invoice_duration?: number;
  currency?: "IDR";
  customer?: {
    given_names?: string;
    email?: string;
    mobile_number?: string;
  };
  success_redirect_url?: string;
  failure_redirect_url?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export type XenditInvoiceResponse = {
  id: string;
  external_id: string;
  status: "PENDING" | "PAID" | "SETTLED" | "EXPIRED" | "FAILED";
  amount: number;
  invoice_url: string;
  expiry_date?: string;
};

export type XenditInvoiceWebhook = {
  id?: string;
  external_id?: string;
  status?: string;
  amount?: number;
  paid_amount?: number;
  paid_at?: string;
  payment_id?: string;
  payment_method?: string;
  payment_channel?: string;
};

export function createXenditAuthorization(secretKey: string) {
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

export async function createXenditInvoice(secretKey: string, payload: XenditInvoiceRequest, apiBaseUrl = XENDIT_API_BASE_URL) {
  const response = await fetch(`${apiBaseUrl}/v2/invoices`, {
    method: "POST",
    headers: {
      Authorization: createXenditAuthorization(secretKey),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Xendit invoice failed: ${response.status} ${body}`);
  }

  return (await response.json()) as XenditInvoiceResponse;
}

export function verifyXenditCallbackToken(headers: Headers | Record<string, string | undefined>, expectedToken: string) {
  const receivedToken = headers instanceof Headers ? headers.get("x-callback-token") : getHeader(headers, "x-callback-token");
  if (!receivedToken || !expectedToken) return false;

  const received = Buffer.from(receivedToken);
  const expected = Buffer.from(expectedToken);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function isPaidXenditInvoiceStatus(payload: XenditInvoiceWebhook) {
  return payload.status === "PAID" || payload.status === "SETTLED";
}

function getHeader(headers: Record<string, string | undefined>, name: string) {
  const lowerName = name.toLowerCase();
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === lowerName);
  return entry?.[1] ?? null;
}
