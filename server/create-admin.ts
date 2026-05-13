import { adminDb } from "./repositories/supabase";
import { hashPassword } from "./security/crypto";

const username = process.env.ADMIN_USERNAME || process.argv[2];
const password = process.env.ADMIN_PASSWORD || process.argv[3];

if (!username || !password) {
  console.error("Usage: ADMIN_USERNAME=admin ADMIN_PASSWORD='strong-password' npm run admin:create");
  process.exit(1);
}

const password_hash = await hashPassword(password);
const { error } = await adminDb.from("admin_users").upsert({ username, password_hash, is_active: true }, { onConflict: "username" });

if (error) {
  console.error(error.message);
  process.exit(1);
}

console.log(`Admin user '${username}' is ready.`);
