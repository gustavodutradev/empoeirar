-- =============================================================================
-- Empoeirar — Frete (Melhor Envio). Fase A: gravar o frete escolhido no pedido.
--
-- Principio de seguranca (igual ao preco dos itens): o valor do frete e
-- AUTORITATIVO — recalculado no servidor (server action -> Melhor Envio) antes
-- de chegar aqui. O cliente so escolhe QUAL servico; nunca o preco.
--
-- create_order ganha dois parametros novos (frete em centavos + nome do
-- servico) e passa a somar o frete no total. Como a assinatura muda, dropamos a
-- versao antiga e recriamos.
-- =============================================================================

-- Nome do servico de frete escolhido (ex.: "PAC", "SEDEX", ".Package").
alter table public.customer_order add column shipping_service text;

comment on column public.customer_order.shipping_service is
  'Servico de frete escolhido no checkout (Melhor Envio). O valor esta em shipping_cents.';

-- Recria create_order com frete. (A versao antiga tinha 3 args.)
drop function if exists public.create_order(jsonb, jsonb, jsonb);

create or replace function public.create_order(
  p_items           jsonb,
  p_customer        jsonb,
  p_shipping        jsonb,
  p_shipping_cents  int  default null,
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
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_cart';
  end if;

  if p_shipping_cents is not null and p_shipping_cents < 0 then
    raise exception 'invalid_shipping';
  end if;

  insert into public.customer_order (
    user_id, status, subtotal_cents, shipping_cents, shipping_service, total_cents,
    customer_name, customer_cpf, customer_phone, customer_email,
    ship_cep, ship_street, ship_number, ship_complement, ship_district, ship_city, ship_state
  )
  values (
    v_uid, 'pending_payment', 0, p_shipping_cents, p_shipping_service, 0,
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

    select pv.id, pv.label, pv.price_cents, pr.name as product_name
      into v_variant
      from public.product_variant pv
      join public.product pr on pr.id = pv.product_id
      where pv.id = (v_item ->> 'variant_id')::uuid
        and pr.status = 'published';

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

  -- Total = itens + frete (frete pode ser null = ainda a calcular).
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

revoke all     on function public.create_order(jsonb, jsonb, jsonb, int, text) from public, anon;
grant  execute on function public.create_order(jsonb, jsonb, jsonb, int, text) to authenticated;
