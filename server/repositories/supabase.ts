import { createClient } from "@supabase/supabase-js";
import { assertServerConfigured, env } from "../config/env";

import type { SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;
let cachedKey = "";

export const adminDb = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    const value = Reflect.get(getAdminDb(), property);
    return typeof value === "function" ? value.bind(getAdminDb()) : value;
  }
});

export async function getUserFromBearer(authHeader: string | undefined) {
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
  if (!token) return null;

  const { data, error } = await adminDb.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

function getAdminDb() {
  assertServerConfigured();
  const key = `${env.supabaseUrl}:${env.supabaseServiceRoleKey}`;
  if (cachedClient && cachedKey === key) return cachedClient;

  cachedKey = key;
  cachedClient = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    realtime: getRealtimeOptions()
  });
  return cachedClient;
}

function getRealtimeOptions() {
  const transport = getNodeWebSocket();
  return transport ? { transport: transport as any } : { params: { eventsPerSecond: 0 } };
}

function getNodeWebSocket() {
  if (typeof process === "undefined" || !process.versions?.node) return null;
  try {
    const nodeRequire = eval("require") as NodeRequire;
    const module = nodeRequire("ws") as { default?: unknown };
    return module.default ?? module;
  } catch {
    return null;
  }
}
