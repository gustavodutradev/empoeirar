-- =============================================================================
-- product_variant — tamanhos/quantidades compraveis de um produto (o "SKU").
--
-- Decisao de modelagem: preco, peso e dimensoes moram na VARIANTE, nao no
-- product. Motivo: e a variante escolhida que o carrinho referencia e que o
-- frete (Melhor Envio, Fase 2) usa para calcular peso e dimensoes. Um produto
-- de tamanho unico tem exatamente uma variante ("Único").
-- =============================================================================

create table public.product_variant (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.product (id) on delete cascade,
  label        text not null,                       -- "Conjunto", "G", "M", "1 unidade", "Único"...
  price_cents  int  not null check (price_cents >= 0),
  weight_grams int  check (weight_grams >= 0),       -- para o frete (Fase 2)
  length_mm    int  check (length_mm >= 0),
  width_mm     int  check (width_mm >= 0),
  height_mm    int  check (height_mm >= 0),
  is_default   boolean not null default false,       -- variante pre-selecionada na pagina
  sort_order   int  not null default 0,
  created_at   timestamptz not null default now()
);

create index product_variant_product_id_idx on public.product_variant (product_id);
-- No maximo uma variante default por produto.
create unique index product_variant_one_default_idx
  on public.product_variant (product_id)
  where is_default;

-- Preco/peso/dimensoes deixam de viver no product (migraram para a variante).
alter table public.product
  drop column price_cents,
  drop column weight_grams,
  drop column length_mm,
  drop column width_mm,
  drop column height_mm;

-- -----------------------------------------------------------------------------
-- RLS: espelha o product. Publico le variantes de produtos publicados; admin
-- escreve. (Mesmo padrao de product_image.)
-- -----------------------------------------------------------------------------
alter table public.product_variant enable row level security;

revoke all           on public.product_variant from anon, authenticated;
grant select         on public.product_variant to anon, authenticated;
grant insert, update, delete on public.product_variant to authenticated;

create policy "product_variant_select_published"
  on public.product_variant for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.product p
      where p.id = product_id
        and p.status = 'published'
    )
  );

create policy "product_variant_write_admin"
  on public.product_variant for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
