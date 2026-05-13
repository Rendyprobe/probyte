# Supabase

Schema source is now migration-based:

- `supabase/migrations/20260513000000_initial_schema.sql`
- `supabase/seed.sql`
- `supabase/schema.sql` is retained as a compatibility snapshot.

Apply the migration in Supabase SQL editor or with Supabase CLI when it is installed, then run `supabase/seed.sql` for catalog and promo seed data.

Security notes:

- RLS is enabled on public tables.
- Service-role-only tables are revoked from `anon` and `authenticated`.
- New Supabase projects may require explicit Data API exposure/grants; keep the grants in the migration with RLS enabled.
