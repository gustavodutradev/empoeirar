-- =============================================================================
-- Empoeirar — Checkout: pedidos, itens, linha do tempo e a funcao create_order.
--
-- Principio de seguranca central desta migration (OWASP A04/A08 — falha de
-- design / integridade): o CLIENTE NUNCA DEFINE PRECO. O carrinho no browser
-- so carrega {variant_id, quantidade}. Todo valor monetario e recalculado no
-- servidor a partir de product_variant.price_cents. Garantimos isso na raiz:
--   * authenticated NAO recebe grant de INSERT em order/order_item;
--   * o unico caminho de criacao e a funcao create_order (SECURITY DEFINER),
--     que le os precos autoritativos do banco e insere de forma atomica.
-- Assim, mesmo que alguem chame o Postgres direto (fora do nosso app), nao
-- consegue inserir um pedido com preco forjado.
--
-- Obs.: a tabela se chama "customer_order" (e nao "order") de proposito: order
-- e palavra reservada em SQL e daria dor de cabeca de quoting.
-- =============================================================================

-- CPF entra no profile para reuso/prefill. E dado pessoal (LGPD): a RLS do
-- profile ja restringe cada linha ao seu dono. Guardamos so digitos (sem
-- pontuacao) — a validacao do digito verificador acontece na borda (Zod/TS).
alter table public.profile add column cpf text;

comment on column public.profile.cpf is
  'CPF (somente digitos). PII sob LGPD — protegido pela RLS de profile.';

-- -----------------------------------------------------------------------------
-- customer_order — o pedido. Snapshot dos dados do cliente e do endereco: um
-- pedido e registro (fiscal/legal), entao congela como estava na compra, mesmo
-- que o profile mude depois.
-- -----------------------------------------------------------------------------
create table public.customer_order (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete restrict,
  status         text not null default 'pending_payment'
                   check (status in ('pending_payment', 'paid', 'preparing',
                                     'shipped', 'delivered', 'cancelled')),
  subtotal_cents int  not null default 0 check (subtotal_cents >= 0),
  shipping_cents int  check (shipping_cents >= 0),   -- null = frete ainda nao calculado (Fase 2)
  total_cents    int  not null default 0 check (total_cents >= 0),

  -- snapshot do cliente
  customer_name  text not null,
  customer_cpf   text not null,
  customer_phone text not null,
  customer_email text not null,

  -- snapshot do endereco de entrega
  ship_cep        text not null,
  ship_street     text not null,
  ship_number     text not null,
  ship_complement text,
  ship_district   text not null,
  ship_city       text not null,
  ship_state      text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.customer_order is
  'Pedido do cliente. Valores monetarios sao autoritativos (calculados no servidor por create_order).';

create index customer_order_user_id_idx on public.customer_order (user_id);
create index customer_order_status_idx  on public.customer_order (status);

create trigger customer_order_set_updated_at
  before update on public.customer_order
  for each row
  execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- order_item — linhas do pedido. unit_price_cents e um SNAPSHOT do preco no
-- momento da compra (o preco da variante pode mudar depois; o pedido nao).
-- -----------------------------------------------------------------------------
create table public.order_item (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.customer_order (id) on delete cascade,
  variant_id       uuid not null references public.product_variant (id) on delete restrict,
  product_name     text not null,   -- snapshot
  variant_label    text not null,   -- snapshot
  unit_price_cents int  not null check (unit_price_cents >= 0),
  quantity         int  not null check (quantity >= 1),
  line_total_cents int  not null check (line_total_cents >= 0),
  created_at       timestamptz not null default now()
);

create index order_item_order_id_idx on public.order_item (order_id);

-- -----------------------------------------------------------------------------
-- order_status_event — a LINHA DO TEMPO do pedido (append-only). Cada mudanca
-- de status vira um evento; a pagina do pedido renderiza isso como o rastreio
-- que o cliente acompanha (do "recebido" ate "entregue").
-- -----------------------------------------------------------------------------
create table public.order_status_event (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.customer_order (id) on delete cascade,
  status     text not null
               check (status in ('pending_payment', 'paid', 'preparing',
                                 'shipped', 'delivered', 'cancelled')),
  note       text,
  created_at timestamptz not null default now()
);

create index order_status_event_order_id_idx on public.order_status_event (order_id);

-- =============================================================================
-- create_order — o UNICO caminho de criacao de pedido. SECURITY DEFINER: roda
-- com os privilegios do dono (postgres), entao insere mesmo sem o cliente ter
-- grant de INSERT. Recalcula todo preco a partir de product_variant.
--
-- Entradas (jsonb):
--   p_items    = [{"variant_id":"<uuid>","quantity":2}, ...]
--   p_customer = {"full_name","cpf","phone","email"}
--   p_shipping = {"cep","street","number","complement","district","city","state"}
-- Retorna: id do pedido criado.
-- =============================================================================
create or replace function public.create_order(
  p_items    jsonb,
  p_customer jsonb,
  p_shipping jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := (select auth.uid());
  v_order_id uuid;
  v_subtotal int := 0;
  v_item     jsonb;
  v_qty      int;
  v_variant  record;
begin
  -- Precisa estar logado (defesa extra alem do guard no app).
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_cart';
  end if;

  insert into public.customer_order (
    user_id, status, subtotal_cents, shipping_cents, total_cents,
    customer_name, customer_cpf, customer_phone, customer_email,
    ship_cep, ship_street, ship_number, ship_complement, ship_district, ship_city, ship_state
  )
  values (
    v_uid, 'pending_payment', 0, null, 0,
    p_customer ->> 'full_name', p_customer ->> 'cpf', p_customer ->> 'phone', p_customer ->> 'email',
    p_shipping ->> 'cep', p_shipping ->> 'street', p_shipping ->> 'number',
    p_shipping ->> 'complement', p_shipping ->> 'district', p_shipping ->> 'city', p_shipping ->> 'state'
  )
  returning id into v_order_id;

  -- Uma linha por item, com preco lido do banco (nunca do cliente).
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := coalesce((v_item ->> 'quantity')::int, 0);
    if v_qty < 1 then
      raise exception 'invalid_quantity';
    end if;

    select pv.id, pv.label, pv.price_cents, pr.name as product_name
      into v_variant
      from public.product_variant pv
      join public.product pr on pr.id = pv.product_id
      where pv.id = (v_item ->> 'variant_id')::uuid
        and pr.status = 'published';   -- so vende o que esta publicado

    if not found then
      raise exception 'variant_not_found';
    end if;

    insert into public.order_item (
      order_id, variant_id, product_name, variant_label,
      unit_price_cents, quantity, line_total_cents
    )
    values (
      v_order_id, v_variant.id, v_variant.product_name, v_variant.label,
      v_variant.price_cents, v_qty, v_variant.price_cents * v_qty
    );

    v_subtotal := v_subtotal + v_variant.price_cents * v_qty;
  end loop;

  -- Frete ainda nao calculado (Melhor Envio e Fase 2): total = subtotal por ora.
  update public.customer_order
     set subtotal_cents = v_subtotal,
         total_cents    = v_subtotal
   where id = v_order_id;

  -- Primeiro evento da linha do tempo.
  insert into public.order_status_event (order_id, status, note)
  values (v_order_id, 'pending_payment', 'Pedido recebido, aguardando pagamento.');

  -- Guarda os dados no profile para prefill em compras futuras.
  update public.profile
     set full_name = coalesce(p_customer ->> 'full_name', full_name),
         phone     = coalesce(p_customer ->> 'phone', phone),
         cpf       = coalesce(p_customer ->> 'cpf', cpf)
   where id = v_uid;

  return v_order_id;
end;
$$;

revoke all     on function public.create_order(jsonb, jsonb, jsonb) from public, anon;
grant  execute on function public.create_order(jsonb, jsonb, jsonb) to authenticated;

-- =============================================================================
-- GRANTS — minimo. authenticated so LE (a RLS filtra para os proprios pedidos).
-- Escrita de pedido: so via create_order. Mudanca de status (admin): via
-- service_role (admin.ts), que bypassa RLS.
-- =============================================================================
revoke all    on public.customer_order     from anon, authenticated;
revoke all    on public.order_item         from anon, authenticated;
revoke all    on public.order_status_event from anon, authenticated;

grant  select on public.customer_order     to authenticated;
grant  select on public.order_item         to authenticated;
grant  select on public.order_status_event to authenticated;

-- profile agora tem cpf: libera o usuario a editar o proprio cpf no futuro
-- (ainda restrito a propria linha pela RLS). role continua imutavel.
grant update (cpf) on public.profile to authenticated;

-- =============================================================================
-- RLS — dono le o proprio; admin le tudo. Sem policy de INSERT (writes vem da
-- funcao definer / service_role). Sem UPDATE/DELETE para authenticated.
-- =============================================================================
alter table public.customer_order     enable row level security;
alter table public.order_item         enable row level security;
alter table public.order_status_event enable row level security;

-- -------------------------- customer_order -----------------------------------
create policy "customer_order_select_own"
  on public.customer_order for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "customer_order_select_admin"
  on public.customer_order for select
  to authenticated
  using (public.is_admin());

-- -------------------------- order_item ---------------------------------------
create policy "order_item_select_own"
  on public.order_item for select
  to authenticated
  using (
    exists (
      select 1 from public.customer_order o
      where o.id = order_id
        and o.user_id = (select auth.uid())
    )
  );

create policy "order_item_select_admin"
  on public.order_item for select
  to authenticated
  using (public.is_admin());

-- -------------------------- order_status_event -------------------------------
create policy "order_status_event_select_own"
  on public.order_status_event for select
  to authenticated
  using (
    exists (
      select 1 from public.customer_order o
      where o.id = order_id
        and o.user_id = (select auth.uid())
    )
  );

create policy "order_status_event_select_admin"
  on public.order_status_event for select
  to authenticated
  using (public.is_admin());
