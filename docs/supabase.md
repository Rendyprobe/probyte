# Supabase

Schema source is now migration-based:

- `supabase/migrations/20260513000000_initial_schema.sql`
- `supabase/migrations/20260513212015_normalize_monthly_variants.sql`
- `supabase/migrations/20260514000000_security_hardening.sql`
- `supabase/migrations/20260515000000_customer_reviews.sql`
- `supabase/migrations/20260516000000_admin_ops_replacement.sql`
- `supabase/migrations/20260516010000_wallet_admin_controls.sql`
- `supabase/migrations/20260517000000_reserve_gateway_stock.sql`
- `supabase/seed.sql`
- `supabase/schema.sql` is retained as a compatibility snapshot.

Apply the migration in Supabase SQL editor or with Supabase CLI when it is installed, then run `supabase/seed.sql` for catalog and promo seed data.

Security notes:

- RLS is enabled on public tables.
- Service-role-only tables are revoked from `anon` and `authenticated`.
- New Supabase projects may require explicit Data API exposure/grants; keep the grants in the migration with RLS enabled.
