-- =============================================================================
-- Empoeirar — Carrinho persistido no banco (para usuário logado).
--
-- Visitante anônimo continua com o carrinho no localStorage. Ao logar, o app
-- faz o merge do carrinho local com o do banco (CartSync no cliente). Aqui só
-- guardamos {user_id, variant_id, quantity} — nada de preço: o valor é sempre
-- recalculado no checkout (create_order). O carrinho é conveniência, não fonte
-- de verdade de dinheiro.
-- =============================================================================

create table public.cart_item (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  variant_id uuid not null references public.product_variant (id) on delete cascade,
  quantity   int  not null check (quantity between 1 and 99),
  updated_at timestamptz not null default now(),
  primary key (user_id, variant_id)
);

comment on table public.cart_item is
  'Carrinho do usuário logado. Uma linha por variante. Sem preço (recalculado no checkout).';

create index cart_item_user_id_idx on public.cart_item (user_id);

create trigger cart_item_set_updated_at
  before update on public.cart_item
  for each row
  execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS: cada um só enxerga/mexe no PRÓPRIO carrinho. Diferente de order/product,
-- aqui o usuário escreve direto (carrinho não é sensível); a RLS trava por dono.
-- user_id nasce de auth.uid() (default) e o with-check garante que ninguém
-- grava no carrinho alheio.
-- -----------------------------------------------------------------------------
alter table public.cart_item enable row level security;

revoke all on public.cart_item from anon, authenticated;
grant select, insert, update, delete on public.cart_item to authenticated;

create policy "cart_item_select_own"
  on public.cart_item for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "cart_item_insert_own"
  on public.cart_item for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "cart_item_update_own"
  on public.cart_item for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "cart_item_delete_own"
  on public.cart_item for delete
  to authenticated
  using ((select auth.uid()) = user_id);
