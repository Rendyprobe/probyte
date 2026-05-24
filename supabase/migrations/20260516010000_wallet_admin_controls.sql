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

revoke all on function public.admin_adjust_wallet(uuid, uuid, text, integer, text) from public, anon, authenticated;
grant execute on function public.admin_adjust_wallet(uuid, uuid, text, integer, text) to service_role;
