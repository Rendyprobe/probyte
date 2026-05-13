import { products } from "../src/lib/catalog";
import { adminDb } from "./repositories/supabase";
import { credentialHash, encryptSecret } from "./security/crypto";

const rows = products.flatMap((product) =>
  product.variants.flatMap((variant) =>
    Array.from({ length: variant.seed }, (_, index) => {
      const number = index + 1;
      const email = `${product.id}.${number}.${variant.id.replace(/[^a-z0-9]/gi, "")}@probyte.test`;
      const password = `PB-${product.initials}-${String(number).padStart(3, "0")}-${variant.id.toUpperCase().slice(0, 4)}`;

      return {
        id: `stk_seed_${variant.id}_${number}`,
        product_variant_id: variant.id,
        account_email_encrypted: encryptSecret(email),
        account_password_encrypted: encryptSecret(password),
        credential_hash: credentialHash(variant.id, email, password),
        display_hint: maskEmail(email),
        status: "AVAILABLE"
      };
    })
  )
);

void main();

async function main() {
  if (!rows.length) {
    console.log("No demo stock rows to seed.");
    return;
  }

  const { data, error } = await adminDb
    .from("account_stocks")
    .upsert(rows, { onConflict: "credential_hash", ignoreDuplicates: true })
    .select("id");

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  console.log(`Demo stock seed complete. Available rows requested: ${rows.length}. Rows returned: ${data?.length ?? 0}.`);
}

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!domain) return "****";
  return `${name.slice(0, 3)}${"*".repeat(Math.max(3, name.length - 3))}@${domain}`;
}
