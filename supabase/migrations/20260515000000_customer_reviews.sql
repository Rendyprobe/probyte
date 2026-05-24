create table if not exists public.product_reviews (
  id text primary key,
  order_id text not null unique references public.orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  invoice_number text not null,
  product_id text not null references public.products(id) on delete restrict,
  product_name text not null,
  variant_name text not null,
  rating integer not null check (rating between 1 and 5),
  comment text not null check (char_length(comment) between 4 and 800),
  display_name text not null check (char_length(display_name) between 1 and 60),
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_reviews_user_id_created_at_idx on public.product_reviews (user_id, created_at desc);
create index if not exists product_reviews_product_id_created_at_idx on public.product_reviews (product_id, created_at desc);
create index if not exists product_reviews_public_created_at_idx on public.product_reviews (is_public, created_at desc);

alter table public.product_reviews enable row level security;

revoke all on public.product_reviews from anon, authenticated;
grant select, insert, update on public.product_reviews to authenticated;
grant select, insert, update, delete on public.product_reviews to service_role;

drop policy if exists "Users can read their own reviews" on public.product_reviews;
create policy "Users can read their own reviews" on public.product_reviews
  for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can create reviews for delivered orders" on public.product_reviews;
create policy "Users can create reviews for delivered orders" on public.product_reviews
  for insert to authenticated
  with check (
    (select auth.uid()) is not null
    and (select auth.uid()) = user_id
    and exists (
      select 1
      from public.orders
      where orders.id = product_reviews.order_id
        and orders.user_id = (select auth.uid())
        and orders.payment_status = 'PAID'
        and orders.delivery_status = 'DELIVERED'
    )
  );

drop policy if exists "Users can update their own reviews" on public.product_reviews;
create policy "Users can update their own reviews" on public.product_reviews
  for update to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check (
    (select auth.uid()) is not null
    and (select auth.uid()) = user_id
    and exists (
      select 1
      from public.orders
      where orders.id = product_reviews.order_id
        and orders.user_id = (select auth.uid())
        and orders.payment_status = 'PAID'
        and orders.delivery_status = 'DELIVERED'
    )
  );
