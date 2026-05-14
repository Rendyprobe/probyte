import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export type ServerEnv = {
  apiPort: number;
  corsOrigin: string;
  trustProxy: boolean;
  publicAppUrl: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  xenditSecretKey: string;
  xenditWebhookToken: string;
  accountEncryptionKey: string;
  stockHashSecret: string;
  adminSessionSecret: string;
  adminAlertEmail: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
};

loadDotEnv();

export const env: ServerEnv = {
  apiPort: numberEnv("API_PORT", 8787),
  corsOrigin: stringEnv("CORS_ORIGIN", "http://localhost:5173"),
  trustProxy: booleanEnv("TRUST_PROXY", false),
  publicAppUrl: stringEnv("PUBLIC_APP_URL", "http://localhost:5173"),
  supabaseUrl: firstStringEnv(["VITE_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"], ""),
  supabaseServiceRoleKey: stringEnv("SUPABASE_SERVICE_ROLE_KEY", ""),
  xenditSecretKey: stringEnv("XENDIT_SECRET_KEY", ""),
  xenditWebhookToken: stringEnv("XENDIT_WEBHOOK_TOKEN", ""),
  accountEncryptionKey: stringEnv("ACCOUNT_ENCRYPTION_KEY", ""),
  stockHashSecret: stringEnv("STOCK_HASH_SECRET", ""),
  adminSessionSecret: stringEnv("ADMIN_SESSION_SECRET", ""),
  adminAlertEmail: stringEnv("ADMIN_ALERT_EMAIL", ""),
  smtpHost: stringEnv("SMTP_HOST", ""),
  smtpPort: numberEnv("SMTP_PORT", 587),
  smtpUser: stringEnv("SMTP_USER", ""),
  smtpPass: stringEnv("SMTP_PASS", "")
};

export function assertServerConfigured() {
  const missing = [
    ["VITE_SUPABASE_URL", env.supabaseUrl],
    ["SUPABASE_SERVICE_ROLE_KEY", env.supabaseServiceRoleKey],
    ["ACCOUNT_ENCRYPTION_KEY", env.accountEncryptionKey],
    ["STOCK_HASH_SECRET", env.stockHashSecret],
    ["ADMIN_SESSION_SECRET", env.adminSessionSecret]
  ].filter(([, value]) => !value);

  if (missing.length) {
    throw new Error(`Missing required server env: ${missing.map(([key]) => key).join(", ")}`);
  }
}

export function assertXenditConfigured() {
  if (!env.xenditSecretKey || !env.xenditWebhookToken) {
    throw configError("XENDIT_CONFIGURATION_REQUIRED");
  }

  if (env.xenditSecretKey.startsWith("xnd_public_")) {
    throw configError("XENDIT_SECRET_KEY_MUST_BE_SECRET_KEY");
  }
}

function configError(message: string) {
  const error = new Error(message) as Error & { status?: number };
  error.status = 503;
  return error;
}

function loadDotEnv() {
  const file = path.resolve(process.cwd(), ".env");
  if (!existsSync(file)) return;

  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function stringEnv(key: string, fallback: string) {
  return process.env[key] || fallback;
}

function firstStringEnv(keys: string[], fallback: string) {
  for (const key of keys) {
    if (process.env[key]) return process.env[key] as string;
  }
  return fallback;
}

function numberEnv(key: string, fallback: number) {
  const value = Number(process.env[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function booleanEnv(key: string, fallback: boolean) {
  const value = process.env[key]?.trim().toLowerCase();
  if (!value) return fallback;
  return value === "1" || value === "true" || value === "yes";
}
