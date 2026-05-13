import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { assertServerConfigured, env } from "../config/env";

assertServerConfigured();

export const adminDb = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  realtime: {
    transport: WebSocket as any
  }
});

export async function getUserFromBearer(authHeader: string | undefined) {
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
  if (!token) return null;

  const { data, error } = await adminDb.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}
