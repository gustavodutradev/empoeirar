-- =============================================================================
-- Empoeirar — create_product: cria produto + variantes de forma ATÔMICA.
--
-- Por que uma função (e não inserts soltos no app): produto e variantes precisam
-- nascer juntos; um insert de produto que falhe nas variantes deixaria um
-- produto órfão sem preço/variante. Aqui é tudo numa transação — ou entra tudo,
-- ou nada. Mesmo padrão do create_order.
--
-- Segurança: SECURITY DEFINER (insere ignorando a necessidade de grants diretos),
-- mas com gate `is_admin()` no topo — quem não é admin recebe exceção. auth.uid()
-- continua sendo o do chamador dentro da função definer.
--
-- p_variants: array JSON de { label, price_cents, weight_grams, length_mm,
-- width_mm, height_mm, sort_order }. A PRIMEIRA vira is_default = true.
-- product.price_cents (legado, NOT NULL) recebe o preço da primeira variante.
-- =============================================================================

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
    (category_id, name, slug, description, material_care, status, price_cents)
  values
    (p_category_id, p_name, p_slug, p_description, p_material_care, p_status,
     (p_variants -> 0 ->> 'price_cents')::int)
  returning id into v_product_id;

  for v_variant in select * from jsonb_array_elements(p_variants)
  loop
    insert into public.product_variant
      (product_id, label, price_cents, weight_grams, length_mm, width_mm, height_mm,
       is_default, sort_order)
    values (
      v_product_id,
      v_variant ->> 'label',
      (v_variant ->> 'price_cents')::int,
      nullif(v_variant ->> 'weight_grams', '')::int,
      nullif(v_variant ->> 'length_mm', '')::int,
      nullif(v_variant ->> 'width_mm', '')::int,
      nullif(v_variant ->> 'height_mm', '')::int,
      v_first,                                   -- primeira variante = default
      (v_variant ->> 'sort_order')::int
    );
    v_first := false;
  end loop;

  return v_product_id;
end;
$$;

revoke all     on function public.create_product(text, text, text, text, text, uuid, jsonb) from public, anon;
grant  execute on function public.create_product(text, text, text, text, text, uuid, jsonb) to authenticated;
