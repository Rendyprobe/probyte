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
  where id in (select id from selected_stocks);

  insert into public.delivered_accounts (id, order_id, account_stock_id, account_email_encrypted, account_password_encrypted)
  select encode(gen_random_bytes(12), 'hex'), target_order.id, id, account_email_encrypted, account_password_encrypted
  from selected_stocks;

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
    select target_order.id, id, selected_stocks.account_email_encrypted, selected_stocks.account_password_encrypted
    from selected_stocks;
end;
$$;

revoke all on function public.replace_order_accounts(text, uuid) from public, anon, authenticated;
grant execute on function public.replace_order_accounts(text, uuid) to service_role;
