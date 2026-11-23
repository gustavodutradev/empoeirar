-- =============================================================================
-- Empoeirar — preco no Pix e preco no cartao.
--
-- O Jane define os dois valores por variante (nao e desconto fixo). Por isso o
-- cliente escolhe a forma de pagamento NO NOSSO checkout, antes do pedido
-- existir: o total do pedido depende dela, e o Checkout Pro cobra um valor so.
--
--   product_variant.price_cents  -> price_card_cents (renomeada: era o "Valor")
--   product_variant.price_pix_cents (nova; comeca igual ao cartao)
--   customer_order.payment_method ('pix' | 'card'; null nos pedidos antigos)
--
-- create_order ganha p_payment_method (assinatura nova: DROP + CREATE, para
-- nao ficar um overload antigo que o PostgREST nao distingue).
-- create_product mantem a assinatura e passa a ler os dois precos.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Precos da variante.
-- -----------------------------------------------------------------------------
alter table public.product_variant
  rename column price_cents to price_card_cents;

alter table public.product_variant
  add column price_pix_cents int;

update public.product_variant
   set price_pix_cents = price_card_cents
 where price_pix_cents is null;

alter table public.product_variant
  alter column price_pix_cents set not null,
  add constraint product_variant_price_pix_cents_check check (price_pix_cents >= 0),
  -- Pix mais caro que cartao e quase sempre erro de digitacao.
  add constraint product_variant_pix_not_above_card check (price_pix_cents <= price_card_cents);

comment on column public.product_variant.price_card_cents is
  'Preco no cartao, em centavos.';
comment on column public.product_variant.price_pix_cents is
  'Preco no Pix, em centavos. Nunca maior que o do cartao.';

-- -----------------------------------------------------------------------------
-- 2. Forma de pagamento escolhida no checkout. Define o preco dos itens e quais
--    meios o Mercado Pago oferece. Null = pedido anterior a esta mudanca.
-- -----------------------------------------------------------------------------
alter table public.customer_order
  add column payment_method text check (payment_method in ('pix', 'card'));

comment on column public.customer_order.payment_method is
  'pix | card, escolhida no checkout. Gravada por create_order.';

-- -----------------------------------------------------------------------------
-- 3. create_order com a forma de pagamento.
-- -----------------------------------------------------------------------------
drop function public.create_order(jsonb, jsonb, jsonb, int, text);

create function public.create_order(
  p_items            jsonb,
  p_customer         jsonb,
  p_shipping         jsonb,
  p_payment_method   text,
  p_shipping_cents   int  default null,
  p_shipping_service text default null
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
  v_unit     int;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_payment_method is null or p_payment_method not in ('pix', 'card') then
    raise exception 'invalid_payment_method';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_cart';
  end if;

  if p_shipping_cents is not null and p_shipping_cents < 0 then
    raise exception 'invalid_shipping';
  end if;

  insert into public.customer_order (
    user_id, status, payment_method, subtotal_cents, shipping_cents, shipping_service, total_cents,
    customer_name, customer_cpf, customer_phone, customer_email,
    ship_cep, ship_street, ship_number, ship_complement, ship_district, ship_city, ship_state
  )
  values (
    v_uid, 'pending_payment', p_payment_method, 0, p_shipping_cents, p_shipping_service, 0,
    p_customer ->> 'full_name', p_customer ->> 'cpf', p_customer ->> 'phone', p_customer ->> 'email',
    p_shipping ->> 'cep', p_shipping ->> 'street', p_shipping ->> 'number',
    p_shipping ->> 'complement', p_shipping ->> 'district', p_shipping ->> 'city', p_shipping ->> 'state'
  )
  returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := coalesce((v_item ->> 'quantity')::int, 0);
    if v_qty < 1 then
      raise exception 'invalid_quantity';
    end if;

    select pv.id, pv.label, pv.price_pix_cents, pv.price_card_cents, pr.name as product_name
      into v_variant
      from public.product_variant pv
      join public.product pr on pr.id = pv.product_id
      where pv.id = (v_item ->> 'variant_id')::uuid
        and pr.status = 'published';

    if not found then
      raise exception 'variant_not_found';
    end if;

    -- Preco do banco, pela forma escolhida. O cliente nunca manda preco.
    v_unit := case p_payment_method
                when 'pix' then v_variant.price_pix_cents
                else v_variant.price_card_cents
              end;

    insert into public.order_item (
      order_id, variant_id, product_name, variant_label,
      unit_price_cents, quantity, line_total_cents
    )
    values (
      v_order_id, v_variant.id, v_variant.product_name, v_variant.label,
      v_unit, v_qty, v_unit * v_qty
    );

    v_subtotal := v_subtotal + v_unit * v_qty;
  end loop;

  update public.customer_order
     set subtotal_cents = v_subtotal,
         total_cents    = v_subtotal + coalesce(p_shipping_cents, 0)
   where id = v_order_id;

  insert into public.order_status_event (order_id, status, note)
  values (v_order_id, 'pending_payment', 'Pedido recebido, aguardando pagamento.');

  update public.profile
     set full_name = coalesce(p_customer ->> 'full_name', full_name),
         phone     = coalesce(p_customer ->> 'phone', phone),
         cpf       = coalesce(p_customer ->> 'cpf', cpf)
   where id = v_uid;

  return v_order_id;
end;
$$;

revoke all     on function public.create_order(jsonb, jsonb, jsonb, text, int, text) from public, anon;
grant  execute on function public.create_order(jsonb, jsonb, jsonb, text, int, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 4. create_product: mesma assinatura (grants preservados), dois precos.
-- -----------------------------------------------------------------------------
create or replace function public.create_product(
  p_name          text,
  p_slug          text,
  p_description   text,
  p_material_care text,
  p_status        text,
  p_category_id   uuid,
  p_variants      jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product_id uuid;
  v_variant    jsonb;
  v_first      boolean := true;
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;

  if p_variants is null or jsonb_array_length(p_variants) < 1 then
    raise exception 'no_variants';
  end if;

  insert into public.product
    (category_id, name, slug, description, material_care, status)
  values
    (p_category_id, p_name, p_slug, p_description, p_material_care, p_status)
  returning id into v_product_id;

  for v_variant in select * from jsonb_array_elements(p_variants)
  loop
    insert into public.product_variant
      (product_id, label, price_pix_cents, price_card_cents, weight_grams,
       length_mm, width_mm, height_mm, is_default, sort_order)
    values (
      v_product_id,
      v_variant ->> 'label',
      (v_variant ->> 'price_pix_cents')::int,
      (v_variant ->> 'price_card_cents')::int,
      nullif(v_variant ->> 'weight_grams', '')::int,
      nullif(v_variant ->> 'length_mm', '')::int,
      nullif(v_variant ->> 'width_mm', '')::int,
      nullif(v_variant ->> 'height_mm', '')::int,
      v_first,
      (v_variant ->> 'sort_order')::int
    );
    v_first := false;
  end loop;

  return v_product_id;
end;
$$;
