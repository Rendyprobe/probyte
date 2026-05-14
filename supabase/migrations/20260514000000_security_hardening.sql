alter table public.orders
  add column if not exists promo_reserved_at timestamptz;

create or replace function public.reserve_promo_code(p_code text)
returns boolean
language plpgsql
set search_path = public
as $$
begin
  if p_code is null then
    return true;
  end if;

  update public.promo_codes
  set used_count = used_count + 1
  where code = p_code
    and is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
    and (usage_limit is null or used_count < usage_limit);

  return found;
end;
$$;

create or replace function public.release_promo_code(p_code text)
returns void
language plpgsql
set search_path = public
as $$
begin
  if p_code is null then
    return;
  end if;

  update public.promo_codes
  set used_count = greatest(used_count - 1, 0)
  where code = p_code;
end;
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

  perform pg_advisory_xact_lock(hashtext('wallet_order'), hashtext(p_user_id::text));

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

  if p_promo_code is not null and not public.reserve_promo_code(p_promo_code) then
    raise exception 'INVALID_PROMO';
  end if;

  insert into public.orders (
    id, user_id, invoice_number, invoice_token, product_id, product_name, variant_id, variant_name,
    qty, customer_whatsapp, customer_email, payment_method, payment_source, payment_status,
    delivery_status, subtotal, discount, payment_fee, total, promo_code, promo_reserved_at, history, paid_at, expired_at
  ) values (
    p_order_id, p_user_id, p_invoice_number, p_invoice_token, p_product_id, p_product_name, p_variant_id, p_variant_name,
    p_qty, p_customer_whatsapp, p_customer_email, 'WALLET', 'WALLET', 'PAID',
    'DELIVERED', p_subtotal, p_discount, p_payment_fee, p_total, p_promo_code,
    case when p_promo_code is null then null else now() end, p_history, now(), p_expired_at
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
begin
  select * into target_order
  from public.orders
  where invoice_number = p_invoice_number
    and xendit_invoice_id = p_xendit_invoice_id
  for update;

  if target_order.id is null then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if target_order.payment_status <> 'PAID' then
    update public.orders
    set payment_status = 'PAID',
        xendit_payment_id = coalesce(p_xendit_payment_id, xendit_payment_id),
        paid_at = now(),
        updated_at = now(),
        history = history || jsonb_build_array(jsonb_build_object('at', now(), 'text', 'Pembayaran diterima Xendit'))
    where id = target_order.id
    returning * into target_order;
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

revoke all on function public.wallet_balance(uuid) from public, anon, authenticated;
revoke all on function public.reserve_promo_code(text) from public, anon, authenticated;
revoke all on function public.release_promo_code(text) from public, anon, authenticated;
revoke all on function public.create_wallet_order(text, text, text, uuid, text, text, text, text, integer, text, text, integer, integer, integer, integer, text, jsonb, timestamptz) from public, anon, authenticated;
revoke all on function public.mark_gateway_order_paid_and_deliver(text, text, text) from public, anon, authenticated;
revoke all on function public.settle_wallet_topup(text, text) from public, anon, authenticated;
revoke all on function public.refund_warranty_to_wallet(text, uuid) from public, anon, authenticated;

grant execute on function public.wallet_balance(uuid) to service_role;
grant execute on function public.reserve_promo_code(text) to service_role;
grant execute on function public.release_promo_code(text) to service_role;
grant execute on function public.create_wallet_order(text, text, text, uuid, text, text, text, text, integer, text, text, integer, integer, integer, integer, text, jsonb, timestamptz) to service_role;
grant execute on function public.mark_gateway_order_paid_and_deliver(text, text, text) to service_role;
grant execute on function public.settle_wallet_topup(text, text) to service_role;
grant execute on function public.refund_warranty_to_wallet(text, uuid) to service_role;
