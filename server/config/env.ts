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
  resendApiKey: string;
  emailFrom: string;
};

type EnvSource = Record<string, string | number | boolean | undefined>;

loadDotEnv();

let envSource: EnvSource = readProcessEnv();

export let env: ServerEnv = buildEnv(envSource);

export function setRuntimeEnv(source: EnvSource) {
  envSource = { ...readProcessEnv(), ...source };
  env = buildEnv(envSource);
}

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

function buildEnv(source: EnvSource): ServerEnv {
  return {
    apiPort: numberEnv(source, "API_PORT", 8787),
    corsOrigin: stringEnv(source, "CORS_ORIGIN", "http://localhost:5173"),
    trustProxy: booleanEnv(source, "TRUST_PROXY", false),
    publicAppUrl: firstStringEnv(source, ["PUBLIC_APP_URL", "VITE_APP_PUBLIC_URL"], "http://localhost:5173"),
    supabaseUrl: firstStringEnv(source, ["VITE_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"], ""),
    supabaseServiceRoleKey: stringEnv(source, "SUPABASE_SERVICE_ROLE_KEY", ""),
    xenditSecretKey: stringEnv(source, "XENDIT_SECRET_KEY", ""),
    xenditWebhookToken: stringEnv(source, "XENDIT_WEBHOOK_TOKEN", ""),
    accountEncryptionKey: stringEnv(source, "ACCOUNT_ENCRYPTION_KEY", ""),
    stockHashSecret: stringEnv(source, "STOCK_HASH_SECRET", ""),
    adminSessionSecret: stringEnv(source, "ADMIN_SESSION_SECRET", ""),
    adminAlertEmail: stringEnv(source, "ADMIN_ALERT_EMAIL", ""),
    smtpHost: stringEnv(source, "SMTP_HOST", ""),
    smtpPort: numberEnv(source, "SMTP_PORT", 587),
    smtpUser: stringEnv(source, "SMTP_USER", ""),
    smtpPass: stringEnv(source, "SMTP_PASS", ""),
    resendApiKey: stringEnv(source, "RESEND_API_KEY", ""),
    emailFrom: stringEnv(source, "EMAIL_FROM", "")
  };
}

function readProcessEnv(): EnvSource {
  if (typeof process === "undefined" || !process.env) return {};
  return process.env as EnvSource;
}

function loadDotEnv() {
  if (typeof process === "undefined" || !process.versions?.node) return;

  let readFileSync: ((file: string, encoding: "utf8") => string) | null = null;
  let existsSync: ((file: string) => boolean) | null = null;
  let resolve: ((...paths: string[]) => string) | null = null;
  try {
    const nodeRequire = eval("require") as NodeRequire;
    ({ readFileSync, existsSync } = nodeRequire("node:fs"));
    ({ resolve } = nodeRequire("node:path"));
  } catch {
    return;
  }

  if (!readFileSync || !existsSync || !resolve) return;
  const file = resolve(process.cwd(), ".env");
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

function stringEnv(source: EnvSource, key: string, fallback: string) {
  return stringValue(source[key]) || fallback;
}

function firstStringEnv(source: EnvSource, keys: string[], fallback: string) {
  for (const key of keys) {
    const value = stringValue(source[key]);
    if (value) return value;
  }
  return fallback;
}

function numberEnv(source: EnvSource, key: string, fallback: number) {
  const value = Number(source[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function booleanEnv(source: EnvSource, key: string, fallback: boolean) {
  const raw = source[key];
  if (typeof raw === "boolean") return raw;
  const value = stringValue(raw)?.trim().toLowerCase();
  if (!value) return fallback;
  return value === "1" || value === "true" || value === "yes";
}

function stringValue(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}
