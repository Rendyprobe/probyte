import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual
} from "node:crypto";
import { promisify } from "node:util";
import { env } from "../config/env";

const scrypt = promisify(scryptCallback);
const TOKEN_TTL_SECONDS = 60 * 60 * 8;

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, encodedHash: string) {
  const [scheme, saltBase64, keyBase64] = encodedHash.split("$");
  if (scheme !== "scrypt" || !saltBase64 || !keyBase64) return false;

  const expected = Buffer.from(keyBase64, "base64");
  const actual = (await scrypt(password, Buffer.from(saltBase64, "base64"), expected.length)) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function signAdminToken(adminId: string, username: string) {
  const payload = {
    sub: adminId,
    username,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyAdminToken(token: string | null) {
  if (!token) return null;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;
  const expected = sign(encodedPayload);
  if (!safeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as { sub?: string; username?: string; exp?: number };
    if (!payload.sub || !payload.username || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { id: payload.sub, username: payload.username };
  } catch {
    return null;
  }
}

export function encryptSecret(plainText: string) {
  const key = getAccountEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptSecret(cipherText: string) {
  const [version, ivBase64, tagBase64, encryptedBase64] = cipherText.split(":");
  if (version !== "v1" || !ivBase64 || !tagBase64 || !encryptedBase64) {
    throw new Error("Invalid ciphertext");
  }

  const key = getAccountEncryptionKey();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivBase64, "base64"));
  decipher.setAuthTag(Buffer.from(tagBase64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedBase64, "base64")), decipher.final()]).toString("utf8");
}

export function credentialHash(variantId: string, email: string, password: string) {
  return createHmac("sha256", env.stockHashSecret)
    .update(`${variantId}\n${email.trim().toLowerCase()}\n${password}`)
    .digest("hex");
}

export function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!domain) return "****";
  return `${name.slice(0, 3)}${"*".repeat(Math.max(3, name.length - 3))}@${domain}`;
}

function getAccountEncryptionKey() {
  const raw = env.accountEncryptionKey;
  const base64 = Buffer.from(raw, "base64");
  if (base64.length === 32) return base64;

  const utf8 = Buffer.from(raw, "utf8");
  if (utf8.length === 32) return utf8;

  throw new Error("ACCOUNT_ENCRYPTION_KEY must be 32 bytes or base64 encoded 32 bytes");
}

function sign(value: string) {
  return createHmac("sha256", env.adminSessionSecret).update(value).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}
