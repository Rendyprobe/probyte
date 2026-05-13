-- Compatibility snapshot only.
-- Prefer supabase/migrations/20260513000000_initial_schema.sql for schema
-- and supabase/seed.sql for catalog/demo seed data.

create extension if not exists pgcrypto;

create table if not exists public.products (
  id text primary key,
  slug text not null unique,
  name text not null,
  category text not null,
  description text not null,
  icon_label text not null,
  seo_title text,
  seo_description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id text primary key,
  product_id text not null references public.products(id) on delete cascade,
  name text not null,
  duration_days integer not null check (duration_days > 0),
  cost_price integer not null default 0 check (cost_price >= 0),
  sell_price integer not null check (sell_price >= 0),
  low_stock_threshold integer not null default 2 check (low_stock_threshold >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.promo_codes (
  id text primary key,
  code text not null unique,
  label text not null,
  type text not null check (type in ('PERCENT', 'FIXED')),
  value integer not null check (value > 0),
  min_subtotal integer not null default 0 check (min_subtotal >= 0),
  max_discount integer check (max_discount is null or max_discount >= 0),
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  used_count integer not null default 0 check (used_count >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  invoice_number text not null unique,
  invoice_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  product_id text not null references public.products(id) on delete restrict,
  product_name text not null,
  variant_id text not null references public.product_variants(id) on delete restrict,
  variant_name text not null,
  qty integer not null check (qty > 0),
  customer_whatsapp text not null,
  customer_email text,
  payment_method text not null,
  payment_source text not null default 'GATEWAY' check (payment_source in ('GATEWAY', 'WALLET')),
  payment_status text not null check (payment_status in ('WAITING_PAYMENT', 'PAID', 'EXPIRED', 'FAILED', 'REFUNDED')),
  delivery_status text not null check (delivery_status in ('PENDING', 'PROCESSING', 'DELIVERED', 'NEED_RESTOCK', 'FAILED_DELIVERY', 'REPLACED')),
  subtotal integer not null check (subtotal >= 0),
  discount integer not null default 0 check (discount >= 0),
  payment_fee integer not null check (payment_fee >= 0),
  total integer not null check (total >= 0),
  promo_code text references public.promo_codes(code) on delete set null,
  history jsonb not null default '[]'::jsonb,
  xendit_invoice_id text,
  xendit_invoice_url text,
  xendit_payment_id text,
  paid_at timestamptz,
  expired_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id text primary key,
  order_id text not null references public.orders(id) on delete cascade,
  product_id text not null references public.products(id) on delete restrict,
  product_variant_id text not null references public.product_variants(id) on delete restrict,
  qty integer not null check (qty > 0),
  unit_price integer not null check (unit_price >= 0),
  total_price integer not null check (total_price >= 0)
);

create table if not exists public.account_stocks (
  id text primary key,
  product_variant_id text not null references public.product_variants(id) on delete cascade,
  account_email_encrypted text not null,
  account_password_encrypted text not null,
  credential_hash text not null unique,
  display_hint text not null,
  status text not null check (status in ('AVAILABLE', 'RESERVED', 'DELIVERED', 'DISABLED', 'EXPIRED', 'REFUNDED')),
  reserved_order_id text references public.orders(id) on delete set null,
  sold_order_id text references public.orders(id) on delete set null,
  created_at timestamptz not null default now(),
  reserved_at timestamptz,
  delivered_at timestamptz,
  disabled_at timestamptz
);

create table if not exists public.delivered_accounts (
  id text primary key,
  order_id text not null references public.orders(id) on delete cascade,
  account_stock_id text not null unique references public.account_stocks(id) on delete restrict,
  account_email_encrypted text not null,
  account_password_encrypted text not null,
  delivered_at timestamptz not null default now()
);

create table if not exists public.wallet_ledger (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('TOPUP', 'PAYMENT', 'REFUND', 'ADJUSTMENT')),
  amount integer not null check (amount > 0),
  status text not null check (status in ('PENDING', 'SETTLED', 'FAILED', 'VOID')),
  invoice_number text,
  payment_reference text,
  xendit_invoice_id text,
  note text,
  created_at timestamptz not null default now(),
  settled_at timestamptz
);

create table if not exists public.warranty_claims (
  id text primary key,
  invoice_number text not null,
  user_id uuid references auth.users(id) on delete set null,
  customer_whatsapp text not null,
  issue_summary text not null,
  status text not null check (status in ('OPEN', 'IN_REVIEW', 'REFUNDED_TO_BALANCE', 'REJECTED')),
  refund_wallet_ledger_id text references public.wallet_ledger(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null check (password_hash <> ''),
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id text primary key,
  admin_id uuid references public.admin_users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.restock_alerts (
  id text primary key,
  product_variant_id text not null references public.product_variants(id) on delete cascade,
  threshold integer not null check (threshold >= 0),
  current_stock integer not null check (current_stock >= 0),
  admin_email text not null,
  status text not null check (status in ('PENDING', 'SENT', 'FAILED')),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.webhook_events (
  id text primary key,
  provider text not null,
  webhook_id text not null,
  external_id text,
  event_type text,
  status text not null check (status in ('RECEIVED', 'PROCESSED', 'DUPLICATE', 'FAILED')),
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, webhook_id)
);

create index if not exists product_variants_product_id_idx on public.product_variants (product_id);
create index if not exists orders_user_id_created_at_idx on public.orders (user_id, created_at desc);
create index if not exists orders_invoice_number_idx on public.orders (invoice_number);
create index if not exists orders_invoice_token_idx on public.orders (invoice_token);
create index if not exists orders_xendit_invoice_id_idx on public.orders (xendit_invoice_id);
create index if not exists account_stocks_variant_status_idx on public.account_stocks (product_variant_id, status);
create index if not exists wallet_ledger_user_id_created_at_idx on public.wallet_ledger (user_id, created_at desc);
create index if not exists wallet_ledger_xendit_invoice_id_idx on public.wallet_ledger (xendit_invoice_id);
create index if not exists warranty_claims_user_id_created_at_idx on public.warranty_claims (user_id, created_at desc);

alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.account_stocks enable row level security;
alter table public.delivered_accounts enable row level security;
alter table public.wallet_ledger enable row level security;
alter table public.promo_codes enable row level security;
alter table public.warranty_claims enable row level security;
alter table public.admin_users enable row level security;
alter table public.audit_logs enable row level security;
alter table public.restock_alerts enable row level security;
alter table public.webhook_events enable row level security;

revoke all on public.account_stocks, public.delivered_accounts, public.admin_users, public.audit_logs, public.webhook_events from anon, authenticated;

grant select on public.products, public.product_variants, public.promo_codes to anon, authenticated;
grant select on public.orders, public.order_items, public.wallet_ledger, public.warranty_claims to authenticated;
grant insert on public.warranty_claims to authenticated;

drop policy if exists "Anyone can read active products" on public.products;
create policy "Anyone can read active products" on public.products
  for select to anon, authenticated
  using (is_active = true);

drop policy if exists "Anyone can read active variants" on public.product_variants;
create policy "Anyone can read active variants" on public.product_variants
  for select to anon, authenticated
  using (is_active = true);

drop policy if exists "Anyone can read active promos" on public.promo_codes;
create policy "Anyone can read active promos" on public.promo_codes
  for select to anon, authenticated
  using (
    is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
    and (usage_limit is null or used_count < usage_limit)
  );

drop policy if exists "Users can read their own orders" on public.orders;
create policy "Users can read their own orders" on public.orders
  for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can read their own order items" on public.order_items;
create policy "Users can read their own order items" on public.order_items
  for select to authenticated
  using (exists (
    select 1 from public.orders
    where orders.id = order_items.order_id
      and orders.user_id = (select auth.uid())
  ));

drop policy if exists "Users can read their own wallet ledger" on public.wallet_ledger;
create policy "Users can read their own wallet ledger" on public.wallet_ledger
  for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can read their own warranty claims" on public.warranty_claims;
create policy "Users can read their own warranty claims" on public.warranty_claims
  for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can create their own warranty claims" on public.warranty_claims;
create policy "Users can create their own warranty claims" on public.warranty_claims
  for insert to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create or replace function public.wallet_balance(p_user_id uuid)
returns integer
language sql
stable
set search_path = public
as $$
  select coalesce(sum(
    case
      when kind in ('TOPUP', 'REFUND', 'ADJUSTMENT') and status = 'SETTLED' then amount
      when kind = 'PAYMENT' and status = 'SETTLED' then -amount
      else 0
    end
  ), 0)::integer
  from public.wallet_ledger
  where user_id = p_user_id;
$$;

create or replace function public.create_wallet_order(
  p_order_id text,
  p_invoice_number text,
  p_invoice_token text,
  p_user_id uuid,
  p_product_id text,
  p_product_name text,
  p_variant_id text,
  p_variant_name text,
  p_qty integer,
  p_customer_whatsapp text,
  p_customer_email text,
  p_subtotal integer,
  p_discount integer,
  p_payment_fee integer,
  p_total integer,
  p_promo_code text,
  p_history jsonb,
  p_expired_at timestamptz
)
returns table (
  order_id text,
  account_stock_id text,
  account_email_encrypted text,
  account_password_encrypted text
)
language plpgsql
set search_path = public
as $$
declare
  current_balance integer;
  locked_count integer;
begin
  if p_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select public.wallet_balance(p_user_id) into current_balance;
  if current_balance < p_total then
    raise exception 'INSUFFICIENT_BALANCE';
  end if;

  create temporary table selected_stocks on commit drop as
    select id, account_email_encrypted, account_password_encrypted
    from public.account_stocks
    where product_variant_id = p_variant_id and status = 'AVAILABLE'
    order by created_at, id
    for update skip locked
    limit p_qty;

  select count(*) into locked_count from selected_stocks;
  if locked_count < p_qty then
    raise exception 'INSUFFICIENT_STOCK';
  end if;

  insert into public.orders (
    id, user_id, invoice_number, invoice_token, product_id, product_name, variant_id, variant_name,
    qty, customer_whatsapp, customer_email, payment_method, payment_source, payment_status,
    delivery_status, subtotal, discount, payment_fee, total, promo_code, history, paid_at, expired_at
  ) values (
    p_order_id, p_user_id, p_invoice_number, p_invoice_token, p_product_id, p_product_name, p_variant_id, p_variant_name,
    p_qty, p_customer_whatsapp, p_customer_email, 'WALLET', 'WALLET', 'PAID',
    'DELIVERED', p_subtotal, p_discount, p_payment_fee, p_total, p_promo_code, p_history, now(), p_expired_at
  );

  insert into public.order_items (id, order_id, product_id, product_variant_id, qty, unit_price, total_price)
  values (encode(gen_random_bytes(12), 'hex'), p_order_id, p_product_id, p_variant_id, p_qty, p_subtotal / p_qty, p_subtotal);

  insert into public.wallet_ledger (id, user_id, kind, amount, status, invoice_number, note, settled_at)
  values (encode(gen_random_bytes(12), 'hex'), p_user_id, 'PAYMENT', p_total, 'SETTLED', p_invoice_number, 'Pembayaran order memakai saldo', now());

  update public.account_stocks
  set status = 'DELIVERED', sold_order_id = p_order_id, delivered_at = now()
  where id in (select id from selected_stocks);

  insert into public.delivered_accounts (id, order_id, account_stock_id, account_email_encrypted, account_password_encrypted)
  select encode(gen_random_bytes(12), 'hex'), p_order_id, id, account_email_encrypted, account_password_encrypted
  from selected_stocks;

  if p_promo_code is not null then
    update public.promo_codes set used_count = used_count + 1 where code = p_promo_code;
  end if;

  return query
    select p_order_id, id, selected_stocks.account_email_encrypted, selected_stocks.account_password_encrypted
    from selected_stocks;
end;
$$;

create or replace function public.mark_gateway_order_paid_and_deliver(
  p_invoice_number text,
  p_xendit_invoice_id text,
  p_xendit_payment_id text
)
returns table (
  order_id text,
  delivery_status text,
  account_stock_id text,
  account_email_encrypted text,
  account_password_encrypted text
)
language plpgsql
set search_path = public
as $$
declare
  target_order public.orders%rowtype;
  locked_count integer;
  should_count_promo boolean := false;
begin
  select * into target_order
  from public.orders
  where invoice_number = p_invoice_number or xendit_invoice_id = p_xendit_invoice_id
  for update;

  if target_order.id is null then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if target_order.payment_status <> 'PAID' then
    should_count_promo := target_order.promo_code is not null;
    update public.orders
    set payment_status = 'PAID',
        xendit_payment_id = coalesce(p_xendit_payment_id, xendit_payment_id),
        paid_at = now(),
        updated_at = now(),
        history = history || jsonb_build_array(jsonb_build_object('at', now(), 'text', 'Pembayaran diterima Xendit'))
    where id = target_order.id
    returning * into target_order;

    if should_count_promo then
      update public.promo_codes set used_count = used_count + 1 where code = target_order.promo_code;
    end if;
  end if;

  if target_order.delivery_status = 'DELIVERED' then
    return query
      select target_order.id, target_order.delivery_status, da.account_stock_id, da.account_email_encrypted, da.account_password_encrypted
      from public.delivered_accounts da
      where da.order_id = target_order.id;
    return;
  end if;

  create temporary table selected_stocks on commit drop as
    select id, account_email_encrypted, account_password_encrypted
    from public.account_stocks
    where product_variant_id = target_order.variant_id and status = 'AVAILABLE'
    order by created_at, id
    for update skip locked
    limit target_order.qty;

  select count(*) into locked_count from selected_stocks;
  if locked_count < target_order.qty then
    update public.orders
    set delivery_status = 'NEED_RESTOCK',
        updated_at = now(),
        history = history || jsonb_build_array(jsonb_build_object('at', now(), 'text', 'Stok tidak cukup setelah pembayaran'))
    where id = target_order.id;

    return query select target_order.id, 'NEED_RESTOCK'::text, null::text, null::text, null::text;
    return;
  end if;

  update public.account_stocks
  set status = 'DELIVERED', sold_order_id = target_order.id, delivered_at = now()
  where id in (select id from selected_stocks);

  insert into public.delivered_accounts (id, order_id, account_stock_id, account_email_encrypted, account_password_encrypted)
  select encode(gen_random_bytes(12), 'hex'), target_order.id, id, account_email_encrypted, account_password_encrypted
  from selected_stocks;

  update public.orders
  set delivery_status = 'DELIVERED',
      updated_at = now(),
      history = history || jsonb_build_array(jsonb_build_object('at', now(), 'text', 'Akun dikirim otomatis'))
  where id = target_order.id;

  return query
    select target_order.id, 'DELIVERED'::text, id, selected_stocks.account_email_encrypted, selected_stocks.account_password_encrypted
    from selected_stocks;
end;
$$;

create or replace function public.settle_wallet_topup(
  p_xendit_invoice_id text,
  p_payment_reference text
)
returns public.wallet_ledger
language plpgsql
set search_path = public
as $$
declare
  target_ledger public.wallet_ledger%rowtype;
begin
  select * into target_ledger
  from public.wallet_ledger
  where xendit_invoice_id = p_xendit_invoice_id
  for update;

  if target_ledger.id is null then
    raise exception 'TOPUP_NOT_FOUND';
  end if;

  if target_ledger.status = 'SETTLED' then
    return target_ledger;
  end if;

  update public.wallet_ledger
  set status = 'SETTLED',
      payment_reference = coalesce(p_payment_reference, payment_reference),
      settled_at = now()
  where id = target_ledger.id
  returning * into target_ledger;

  return target_ledger;
end;
$$;

create or replace function public.refund_warranty_to_wallet(
  p_claim_id text,
  p_admin_id uuid
)
returns table (
  ledger_id text,
  refund_amount integer,
  invoice_number text
)
language plpgsql
set search_path = public
as $$
declare
  target_claim public.warranty_claims%rowtype;
  target_order public.orders%rowtype;
  created_ledger_id text;
begin
  select * into target_claim
  from public.warranty_claims
  where id = p_claim_id
  for update;

  if target_claim.id is null then
    raise exception 'CLAIM_NOT_FOUND';
  end if;

  if target_claim.status = 'REFUNDED_TO_BALANCE' and target_claim.refund_wallet_ledger_id is not null then
    select * into target_order from public.orders where invoice_number = target_claim.invoice_number;
    return query select target_claim.refund_wallet_ledger_id, coalesce(target_order.total, 0), target_claim.invoice_number;
    return;
  end if;

  select * into target_order
  from public.orders
  where invoice_number = target_claim.invoice_number
  for update;

  if target_order.id is null or target_claim.user_id is null then
    raise exception 'INVALID_CLAIM';
  end if;

  created_ledger_id := encode(gen_random_bytes(12), 'hex');
  insert into public.wallet_ledger (id, user_id, kind, amount, status, invoice_number, note, settled_at)
  values (created_ledger_id, target_claim.user_id, 'REFUND', target_order.total, 'SETTLED', target_order.invoice_number, 'Refund garansi ke saldo', now());

  update public.warranty_claims
  set status = 'REFUNDED_TO_BALANCE',
      refund_wallet_ledger_id = created_ledger_id,
      resolved_at = now()
  where id = target_claim.id;

  update public.orders
  set payment_status = 'REFUNDED',
      updated_at = now(),
      history = history || jsonb_build_array(jsonb_build_object('at', now(), 'text', 'Refund garansi dikirim ke saldo pelanggan'))
  where id = target_order.id;

  insert into public.audit_logs (id, admin_id, action, entity_type, entity_id, metadata_json)
  values (
    encode(gen_random_bytes(12), 'hex'),
    p_admin_id,
    'REFUND_WARRANTY_TO_BALANCE',
    'warranty',
    target_claim.id,
    jsonb_build_object('invoiceNumber', target_order.invoice_number, 'amount', target_order.total)
  );

  return query select created_ledger_id, target_order.total, target_order.invoice_number;
end;
$$;

revoke all on function public.wallet_balance(uuid) from anon, authenticated;
revoke all on function public.create_wallet_order(text, text, text, uuid, text, text, text, text, integer, text, text, integer, integer, integer, integer, text, jsonb, timestamptz) from anon, authenticated;
revoke all on function public.mark_gateway_order_paid_and_deliver(text, text, text) from anon, authenticated;
revoke all on function public.settle_wallet_topup(text, text) from anon, authenticated;
revoke all on function public.refund_warranty_to_wallet(text, uuid) from anon, authenticated;
grant execute on function public.wallet_balance(uuid) to service_role;
grant execute on function public.create_wallet_order(text, text, text, uuid, text, text, text, text, integer, text, text, integer, integer, integer, integer, text, jsonb, timestamptz) to service_role;
grant execute on function public.mark_gateway_order_paid_and_deliver(text, text, text) to service_role;
grant execute on function public.settle_wallet_topup(text, text) to service_role;
grant execute on function public.refund_warranty_to_wallet(text, uuid) to service_role;

insert into public.promo_codes (id, code, label, type, value, min_subtotal, max_discount)
values
  ('promo_probyte10', 'PROBYTE10', 'Diskon 10%', 'PERCENT', 10, 25000, 20000),
  ('promo_hemat5k', 'HEMAT5K', 'Potongan Rp5.000', 'FIXED', 5000, 50000, null)
on conflict (code) do update set
  label = excluded.label,
  type = excluded.type,
  value = excluded.value,
  min_subtotal = excluded.min_subtotal,
  max_discount = excluded.max_discount;

insert into public.products (id, slug, name, category, description, icon_label, seo_title, seo_description)
values
  ('netflix', 'netflix', 'Netflix', 'Streaming', 'Akun premium siap pakai untuk streaming film dan series.', 'NF', 'Netflix Premium - ProByte', 'Beli akun Netflix premium dengan stok ready, invoice aman, dan pengiriman otomatis di ProByte.'),
  ('spotify', 'spotify', 'Spotify', 'Music', 'Akun premium untuk musik tanpa jeda dan kualitas audio tinggi.', 'SP', 'Spotify Premium - ProByte', 'Beli akun Spotify premium dengan saldo, voucher, dan invoice aman di ProByte.'),
  ('canva', 'canva', 'Canva', 'Productivity', 'Akun desain premium untuk template, elemen, dan tools kreatif.', 'CV', 'Canva Pro - ProByte', 'Beli akun Canva Pro premium dengan stok ready dan pengiriman otomatis.'),
  ('bstation', 'bstation', 'Bstation', 'Streaming', 'Akun premium untuk konten anime dan hiburan Asia.', 'BS', 'Bstation Premium - ProByte', 'Beli akun Bstation premium untuk anime dan hiburan Asia.'),
  ('grok', 'grok', 'Grok', 'AI', 'Akun AI premium untuk produktivitas, riset, dan percakapan cepat.', 'GK', 'Grok Premium - ProByte', 'Beli akun Grok premium untuk produktivitas dan riset AI.'),
  ('viu', 'viu', 'Viu', 'Streaming', 'Akun premium untuk drama, film, dan series Asia.', 'VU', 'Viu Premium - ProByte', 'Beli akun Viu premium dengan invoice dan garansi saldo.'),
  ('capcut', 'capcut', 'CapCut', 'Editing', 'Akun premium untuk editing video, template, dan ekspor konten.', 'CC', 'CapCut Pro - ProByte', 'Beli akun CapCut Pro untuk editing video dan template premium.'),
  ('duolingo', 'duolingo', 'Duolingo', 'Learning', 'Akun premium untuk belajar bahasa dengan latihan tanpa batas.', 'DL', 'Duolingo Super - ProByte', 'Beli akun Duolingo Super untuk belajar bahasa tanpa batas.'),
  ('youtube', 'youtube', 'YouTube', 'Video Platform', 'Akun premium untuk video dan musik dengan benefit premium.', 'YT', 'YouTube Premium - ProByte', 'Beli akun YouTube Premium dengan pengiriman akun otomatis.'),
  ('vidio', 'vidio', 'Vidio', 'Streaming', 'Akun premium untuk hiburan lokal, olahraga, dan series.', 'VD', 'Vidio Platinum - ProByte', 'Beli akun Vidio premium untuk hiburan lokal dan olahraga.'),
  ('scribd', 'scribd', 'Scribd', 'Productivity', 'Akun premium untuk dokumen, ebook, audiobook, dan referensi.', 'SC', 'Scribd Premium - ProByte', 'Beli akun Scribd premium untuk dokumen, ebook, dan referensi.'),
  ('iqiyi', 'iqiyi', 'iQIYI', 'Streaming', 'Akun premium untuk drama Asia, anime, dan film.', 'IQ', 'iQIYI VIP - ProByte', 'Beli akun iQIYI VIP untuk drama Asia, anime, dan film.'),
  ('getcontact', 'getcontact', 'GetContact', 'Utility', 'Akun premium untuk identifikasi kontak dan proteksi panggilan.', 'GC', 'GetContact Premium - ProByte', 'Beli akun GetContact premium untuk identifikasi kontak dan proteksi panggilan.')
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  icon_label = excluded.icon_label,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description,
  updated_at = now();

insert into public.product_variants (id, product_id, name, duration_days, sell_price, low_stock_threshold)
values
  ('netflix-7d', 'netflix', 'Sharing 7 Hari', 7, 18000, 2),
  ('netflix-30d', 'netflix', 'Private 1 Bulan', 30, 68000, 2),
  ('spotify-30d', 'spotify', 'Individual 1 Bulan', 30, 32000, 2),
  ('spotify-90d', 'spotify', 'Individual 3 Bulan', 90, 85000, 2),
  ('canva-30d', 'canva', 'Pro 1 Bulan', 30, 17000, 2),
  ('canva-365d', 'canva', 'Pro 1 Tahun', 365, 125000, 2),
  ('bstation-30d', 'bstation', 'Premium 1 Bulan', 30, 25000, 2),
  ('bstation-90d', 'bstation', 'Premium 3 Bulan', 90, 65000, 2),
  ('grok-7d', 'grok', 'Premium 7 Hari', 7, 45000, 2),
  ('grok-30d', 'grok', 'Premium 1 Bulan', 30, 145000, 2),
  ('viu-30d', 'viu', 'Premium 1 Bulan', 30, 21000, 2),
  ('viu-90d', 'viu', 'Premium 3 Bulan', 90, 54000, 2),
  ('capcut-30d', 'capcut', 'Pro 1 Bulan', 30, 39000, 2),
  ('capcut-365d', 'capcut', 'Pro 1 Tahun', 365, 245000, 2),
  ('duolingo-30d', 'duolingo', 'Super 1 Bulan', 30, 36000, 2),
  ('duolingo-180d', 'duolingo', 'Super 6 Bulan', 180, 155000, 2),
  ('youtube-30d', 'youtube', 'Premium 1 Bulan', 30, 39000, 2),
  ('youtube-90d', 'youtube', 'Premium 3 Bulan', 90, 105000, 2),
  ('vidio-30d', 'vidio', 'Platinum 1 Bulan', 30, 29000, 2),
  ('vidio-365d', 'vidio', 'Platinum 1 Tahun', 365, 215000, 2),
  ('scribd-30d', 'scribd', 'Premium 1 Bulan', 30, 27000, 2),
  ('scribd-90d', 'scribd', 'Premium 3 Bulan', 90, 72000, 2),
  ('iqiyi-30d', 'iqiyi', 'VIP 1 Bulan', 30, 26000, 2),
  ('iqiyi-90d', 'iqiyi', 'VIP 3 Bulan', 90, 66000, 2),
  ('getcontact-30d', 'getcontact', 'Premium 1 Bulan', 30, 22000, 2),
  ('getcontact-365d', 'getcontact', 'Premium 1 Tahun', 365, 165000, 2)
on conflict (id) do update set
  product_id = excluded.product_id,
  name = excluded.name,
  duration_days = excluded.duration_days,
  sell_price = excluded.sell_price,
  low_stock_threshold = excluded.low_stock_threshold,
  updated_at = now();

-- Create admin passwords server-side with a one-way hash. The Node API supports scrypt hashes.
