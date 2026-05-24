create or replace function public.create_gateway_order_with_reservation(
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
returns void
language plpgsql
set search_path = public
as $$
declare
  locked_count integer;
begin
  if p_qty is null or p_qty <= 0 then
    raise exception 'INSUFFICIENT_STOCK';
  end if;

  create temporary table selected_stocks on commit drop as
    select id
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
    delivery_status, subtotal, discount, payment_fee, total, promo_code, promo_reserved_at, history, expired_at
  ) values (
    p_order_id, p_user_id, p_invoice_number, p_invoice_token, p_product_id, p_product_name, p_variant_id, p_variant_name,
    p_qty, p_customer_whatsapp, p_customer_email, 'XENDIT_INVOICE', 'GATEWAY', 'WAITING_PAYMENT',
    'PENDING', p_subtotal, p_discount, p_payment_fee, p_total, p_promo_code,
    case when p_promo_code is null then null else now() end, p_history, p_expired_at
  );

  insert into public.order_items (id, order_id, product_id, product_variant_id, qty, unit_price, total_price)
  values (encode(gen_random_bytes(12), 'hex'), p_order_id, p_product_id, p_variant_id, p_qty, p_subtotal / p_qty, p_subtotal);

  update public.account_stocks
  set status = 'RESERVED',
      reserved_order_id = p_order_id,
      reserved_at = now()
  where id in (select id from selected_stocks);
end;
$$;

create or replace function public.release_gateway_order_reservation(
  p_order_id text,
  p_payment_status text,
  p_history_text text
)
returns void
language plpgsql
set search_path = public
as $$
declare
  target_order public.orders%rowtype;
  normalized_status text;
begin
  normalized_status := upper(coalesce(nullif(trim(p_payment_status), ''), 'FAILED'));
  if normalized_status not in ('EXPIRED', 'FAILED') then
    raise exception 'INVALID_PAYMENT_STATUS';
  end if;

  select * into target_order
  from public.orders
  where id = p_order_id
  for update;

  if target_order.id is null then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if target_order.payment_status <> 'WAITING_PAYMENT' then
    return;
  end if;

  update public.account_stocks
  set status = 'AVAILABLE',
      reserved_order_id = null,
      reserved_at = null
  where reserved_order_id = target_order.id
    and status = 'RESERVED';

  if target_order.promo_reserved_at is not null then
    perform public.release_promo_code(target_order.promo_code);
  end if;

  update public.orders
  set payment_status = normalized_status,
      delivery_status = 'PENDING',
      promo_reserved_at = null,
      updated_at = now(),
      history = history || jsonb_build_array(jsonb_build_object('at', now(), 'text', coalesce(nullif(trim(p_history_text), ''), 'Invoice dibatalkan')))
  where id = target_order.id;
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
        promo_reserved_at = null,
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

  create temporary table selected_stocks (
    id text primary key,
    account_email_encrypted text not null,
    account_password_encrypted text not null
  ) on commit drop;

  insert into selected_stocks (id, account_email_encrypted, account_password_encrypted)
    select id, account_email_encrypted, account_password_encrypted
    from public.account_stocks
    where reserved_order_id = target_order.id and status = 'RESERVED'
    order by reserved_at, id
    for update skip locked
    limit target_order.qty;

  select count(*) into locked_count from selected_stocks;
  if locked_count < target_order.qty then
    insert into selected_stocks (id, account_email_encrypted, account_password_encrypted)
      select id, account_email_encrypted, account_password_encrypted
      from public.account_stocks
      where product_variant_id = target_order.variant_id and status = 'AVAILABLE'
      order by created_at, id
      for update skip locked
      limit target_order.qty - locked_count
      on conflict (id) do nothing;

    select count(*) into locked_count from selected_stocks;
  end if;

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
  set status = 'DELIVERED',
      sold_order_id = target_order.id,
      reserved_order_id = null,
      delivered_at = now()
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
    select target_order.id, 'DELIVERED'::text, selected_stocks.id, selected_stocks.account_email_encrypted, selected_stocks.account_password_encrypted
    from selected_stocks;
end;
$$;

revoke all on function public.create_gateway_order_with_reservation(text, text, text, uuid, text, text, text, text, integer, text, text, integer, integer, integer, integer, text, jsonb, timestamptz) from public, anon, authenticated;
revoke all on function public.release_gateway_order_reservation(text, text, text) from public, anon, authenticated;
grant execute on function public.create_gateway_order_with_reservation(text, text, text, uuid, text, text, text, text, integer, text, text, integer, integer, integer, integer, text, jsonb, timestamptz) to service_role;
grant execute on function public.release_gateway_order_reservation(text, text, text) to service_role;
