-- Supabase installs pgcrypto functions in the extensions schema. Several RPCs
-- set search_path to public, so unqualified gen_random_bytes() was hidden.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

do $$
declare
  target_function regprocedure;
begin
  for target_function in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  loop
    execute format('alter function %s set search_path = public, extensions', target_function);
  end loop;
end $$;
