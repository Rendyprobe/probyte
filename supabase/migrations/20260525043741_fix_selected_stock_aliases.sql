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
  where id in (select ss.id from selected_stocks ss);

  insert into public.delivered_accounts (id, order_id, account_stock_id, account_email_encrypted, account_password_encrypted)
  select encode(gen_random_bytes(12), 'hex'), p_order_id, ss.id, ss.account_email_encrypted, ss.account_password_encrypted
  from selected_stocks ss;

  return query
    select p_order_id, ss.id, ss.account_email_encrypted, ss.account_password_encrypted
    from selected_stocks ss;
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
  where id in (select ss.id from selected_stocks ss);

  insert into public.delivered_accounts (id, order_id, account_stock_id, account_email_encrypted, account_password_encrypted)
  select encode(gen_random_bytes(12), 'hex'), target_order.id, ss.id, ss.account_email_encrypted, ss.account_password_encrypted
  from selected_stocks ss;

  update public.orders
  set delivery_status = 'DELIVERED',
      updated_at = now(),
      history = history || jsonb_build_array(jsonb_build_object('at', now(), 'text', 'Akun dikirim otomatis'))
  where id = target_order.id;

  return query
    select target_order.id, 'DELIVERED'::text, ss.id, ss.account_email_encrypted, ss.account_password_encrypted
    from selected_stocks ss;
end;
$$;

create or replace function public.admin_adjust_wallet(
  p_admin_id uuid,
  p_user_id uuid,
  p_direction text,
  p_amount integer,
  p_note text
)
returns public.wallet_ledger
language plpgsql
set search_path = public
as $$
declare
  current_balance integer;
  created_ledger public.wallet_ledger%rowtype;
  normalized_direction text;
  ledger_kind text;
  ledger_reference text;
begin
  normalized_direction := upper(coalesce(p_direction, ''));

  if p_admin_id is null or p_user_id is null or p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_WALLET_ADJUSTMENT';
  end if;

  if normalized_direction not in ('CREDIT', 'DEBIT') then
    raise exception 'INVALID_WALLET_ADJUSTMENT';
  end if;

  perform pg_advisory_xact_lock(hashtext('wallet_order'), hashtext(p_user_id::text));

  select public.wallet_balance(p_user_id) into current_balance;
  if normalized_direction = 'DEBIT' and current_balance < p_amount then
    raise exception 'INSUFFICIENT_BALANCE';
  end if;

  ledger_kind := case when normalized_direction = 'DEBIT' then 'PAYMENT' else 'ADJUSTMENT' end;
  ledger_reference := case when normalized_direction = 'DEBIT' then 'ADMIN_DEBIT' else 'ADMIN_CREDIT' end;

  insert into public.wallet_ledger (
    id,
    user_id,
    kind,
    amount,
    status,
    payment_reference,
    note,
    settled_at
  )
  values (
    encode(gen_random_bytes(12), 'hex'),
    p_user_id,
    ledger_kind,
    p_amount,
    'SETTLED',
    ledger_reference,
    coalesce(nullif(trim(p_note), ''), 'Penyesuaian saldo admin'),
    now()
  )
  returning * into created_ledger;

  insert into public.audit_logs (id, admin_id, action, entity_type, entity_id, metadata_json)
  values (
    encode(gen_random_bytes(12), 'hex'),
    p_admin_id,
    'WALLET_ADJUSTMENT',
    'wallet',
    created_ledger.id,
    jsonb_build_object(
      'userId', p_user_id,
      'direction', normalized_direction,
      'amount', p_amount,
      'ledgerKind', ledger_kind
    )
  );

  return created_ledger;
end;
$$;

create or replace function public.replace_order_accounts(
  p_invoice_number text,
  p_admin_id uuid
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
  target_order public.orders%rowtype;
  locked_count integer;
begin
  select * into target_order
  from public.orders
  where invoice_number = p_invoice_number
  for update;

  if target_order.id is null then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if target_order.payment_status <> 'PAID'
    or target_order.delivery_status not in ('DELIVERED', 'NEED_RESTOCK', 'FAILED_DELIVERY', 'REPLACED') then
    raise exception 'REPLACEMENT_NOT_ALLOWED';
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
    raise exception 'REPLACEMENT_NOT_AVAILABLE';
  end if;

  update public.account_stocks
  set status = 'DISABLED',
      disabled_at = now()
  where id in (
    select account_stock_id
    from public.delivered_accounts
    where order_id = target_order.id
  )
    and status = 'DELIVERED';

  delete from public.delivered_accounts
  where order_id = target_order.id;

  update public.account_stocks
  set status = 'DELIVERED',
      sold_order_id = target_order.id,
      reserved_order_id = null,
      delivered_at = now()
  where id in (select ss.id from selected_stocks ss);

  insert into public.delivered_accounts (id, order_id, account_stock_id, account_email_encrypted, account_password_encrypted)
  select encode(gen_random_bytes(12), 'hex'), target_order.id, ss.id, ss.account_email_encrypted, ss.account_password_encrypted
  from selected_stocks ss;

  update public.orders
  set delivery_status = 'DELIVERED',
      updated_at = now(),
      history = history || jsonb_build_array(jsonb_build_object('at', now(), 'text', 'Akun diganti oleh admin'))
  where id = target_order.id;

  insert into public.audit_logs (id, admin_id, action, entity_type, entity_id, metadata_json)
  values (
    encode(gen_random_bytes(12), 'hex'),
    p_admin_id,
    'REPLACE_ORDER_ACCOUNTS',
    'order',
    target_order.id,
    jsonb_build_object('invoiceNumber', target_order.invoice_number, 'qty', target_order.qty)
  );

  return query
    select target_order.id, ss.id, ss.account_email_encrypted, ss.account_password_encrypted
    from selected_stocks ss;
end;
$$;

revoke all on function public.create_wallet_order(text, text, text, uuid, text, text, text, text, integer, text, text, integer, integer, integer, integer, text, jsonb, timestamptz) from public, anon, authenticated;
revoke all on function public.mark_gateway_order_paid_and_deliver(text, text, text) from public, anon, authenticated;
revoke all on function public.admin_adjust_wallet(uuid, uuid, text, integer, text) from public, anon, authenticated;
revoke all on function public.replace_order_accounts(text, uuid) from public, anon, authenticated;

grant execute on function public.create_wallet_order(text, text, text, uuid, text, text, text, text, integer, text, text, integer, integer, integer, integer, text, jsonb, timestamptz) to service_role;
grant execute on function public.mark_gateway_order_paid_and_deliver(text, text, text) to service_role;
grant execute on function public.admin_adjust_wallet(uuid, uuid, text, integer, text) to service_role;
grant execute on function public.replace_order_accounts(text, uuid) to service_role;
