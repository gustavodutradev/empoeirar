-- =============================================================================
-- Empoeirar — correção da importação de 23/11/2026. Rode UMA vez no SQL Editor.
-- Gerado a partir do diagnóstico do catálogo (ids exatos do banco).
--
-- 1. Apaga o que o script de importação criou em duplicidade (só linhas que NÃO
--    estão no backup, ou seja, criadas por ele, e sem pedido):
--    rascunhos "Ovais" e "Base Giratória" e as variantes G/M/P do Conjunto de Bowls.
-- 2. Apaga variantes repetidas pelo bug do admin (Prato de Risoto e o rascunho
--    "Copo - Xícara - Caneca"), mantendo uma de cada. Nenhuma tem pedido.
-- 3. Aplica os dados da planilha aos produtos com rótulos diferentes do seed:
--    Corações, Sushi Reto, Bowls, Prato de Risoto, Oval e as 4 Bases Giratórias.
-- 4. Mostra as variantes alteradas para conferência.
--
-- Transação única: se qualquer passo falhar, nada muda.
-- =============================================================================

begin;

-- 1. Duplicatas criadas pelo script ------------------------------------------
delete from public.product_variant v
 where v.id in (
  '9f99b3ca-a84b-4566-ba69-f783e8dc3f9e'::uuid,
  '55cc018f-ae0a-479c-a89d-46e717f86bca'::uuid,
  '042217c2-22eb-4f9e-8726-3caee8e7d63a'::uuid,
  '243ce29c-a274-4ce6-b0b7-34702a21229a'::uuid,
  '30bf5543-26af-41ed-ae08-ff540ce8ebd8'::uuid,
  '61a0d091-135f-4a94-856c-776cd6d67cb3'::uuid,
  'd699b542-e610-4ba8-8309-f8d3345ccc9d'::uuid,
  '2ec59407-a4f4-4f7e-a1ac-52b16157ab67'::uuid,
  '60177838-f874-431b-ace2-5ec65938f402'::uuid,
  'abff68bd-f2e1-42a7-ab6c-e2689e0d5f1b'::uuid,
  '4f329d73-e50b-4b2f-8a77-5aa1ccd783a1'::uuid
 )
   and not exists (select 1 from backup.product_variant_20261123 b where b.id = v.id)
   and not exists (select 1 from public.order_item oi where oi.variant_id = v.id);

delete from public.product p
 where p.slug in ('ovais', 'base-giratoria')
   and p.status = 'draft'
   and not exists (select 1 from public.product_variant v where v.product_id = p.id);

-- 2. Duplicatas do bug do admin ----------------------------------------------
delete from public.product_variant v
 where v.id in (
  'c237f193-68e5-40ef-b7fa-ba67ffd94a92'::uuid,
  'cf498c25-cfa7-41bb-937e-1c6f7e9d5800'::uuid,
  'd973fe9a-3d29-4893-98f9-1c6d49155161'::uuid,
  'f71819a5-71a2-43b3-9cbd-5ef97e63fcf8'::uuid,
  'baa09584-2cb8-42e0-a5be-cde84759ef9d'::uuid,
  'c8337d14-b800-4ba4-9708-e87fc3ee2cb2'::uuid,
  '88d052ae-9957-401c-8a46-a03d941c2139'::uuid,
  'cea0e840-7c24-423c-a886-f81e8377f381'::uuid
 )
   and not v.is_default
   and not exists (select 1 from public.order_item oi where oi.variant_id = v.id);

-- 3. Dados da planilha nos rótulos reais -------------------------------------
create temp table correcao (
  variant_id uuid primary key, slug text, rotulo text,
  pix int, cartao int, peso int, comp int, larg int, alt int
);

insert into correcao values
  ('9457aedc-d23d-4a54-831d-676de77137fe'::uuid, 'coracoes', 'Conjunto - 2 tamanhos', 10800, 11700, 710, 260, 240, 36),
  ('783aba88-ed0f-4588-be87-320904163023'::uuid, 'coracoes', 'Grande', 6000, 6500, 460, 260, 240, 18),
  ('5e509573-4ae7-4e97-962b-26ca1472684a'::uuid, 'coracoes', 'Pequeno', 5500, 5900, 250, null, null, 18),
  ('40a7a75f-da5f-41cd-85d8-f913930afd1a'::uuid, 'conjunto-sushi-reto', 'Grande', 6000, 6500, 500, 330, 130, 18),
  ('beb6b46a-66ea-4caa-a715-93d985ba314b'::uuid, 'conjunto-sushi-reto', 'Médio', 5500, 5900, 220, 200, 100, 18),
  ('b46a2287-7b8d-422c-a81c-795adfa446c9'::uuid, 'conjunto-sushi-reto', 'Pequeno', 5000, 5400, 60, 80, 80, 18),
  ('272a4e9e-b3da-483f-b13b-9c178345cf47'::uuid, 'conjunto-de-bowls', 'Conjunto de 3 Bowls', 40000, 43200, 2150, 250, 250, 216),
  ('481b7f46-bb63-4067-bf78-4aef6eda6841'::uuid, 'conjunto-de-bowls', 'Bowl Grande', 19000, 20500, 1140, 250, 250, 90),
  ('0661dfde-56de-41e1-a868-6dcc025cba57'::uuid, 'conjunto-de-bowls', 'Bowl Médio', 14000, 15100, 670, 190, 190, 72),
  ('56d3957d-05a1-46ed-a9e0-b3f4481dad10'::uuid, 'conjunto-de-bowls', 'Bowl Pequeno', 9000, 9700, 340, 140, 140, 54),
  ('125f6e7e-4164-4391-ac38-4fe7225a9a3d'::uuid, 'prato-de-risoto', 'Tradicional', 15000, 16200, 1100, 310, 310, 72),
  ('bed4511d-5c95-4068-8047-b283d48769d0'::uuid, 'prato-de-risoto', 'Mini', 13000, 14000, 420, 200, 200, 54),
  ('adf65867-158e-4264-918c-0e16725b709b'::uuid, 'prato-de-risoto', 'Conjunto - 2 tamanhos', 27000, 29200, 1520, 310, 310, 126),
  ('432cf297-4f1f-48bb-bfcc-8b1b29f909e4'::uuid, 'oval', 'Conjunto - 3 tamanhos', 14900, 16100, 1220, 300, 185, 54),
  ('0dfe1917-cede-4ba3-b217-59e21ec3fd93'::uuid, 'oval', 'Grande', 6000, 6500, 560, 300, 185, 18),
  ('e5ecaf0b-d0c9-490b-85cf-a210fcc0e9cb'::uuid, 'oval', 'Médio', 5500, 5900, 400, 250, 160, 18),
  ('7da887d8-6237-4cbb-9c9f-dd8e932ac68c'::uuid, 'oval', 'Pequeno', 5000, 5400, 260, 210, 130, 18),
  ('db757217-64ac-4ebd-82bf-fd42471fdae5'::uuid, 'base-giratoria-13-cm-pequena', 'Único', 24000, 25900, 450, 130, 130, 45),
  ('f621a606-6dd5-4e9e-b1c4-38b0bb3cd7f6'::uuid, 'base-giratoria-22-cm-media', 'Único', 28000, 30200, 1200, 220, 220, 45),
  ('6966e3b1-7d38-4d0d-a123-326f918fe016'::uuid, 'base-giratoria-33-cm-grande', 'Único', 34000, 36700, 2700, 330, 330, 45),
  ('a7580aae-2d8a-4298-a250-81cf09f28cf2'::uuid, 'base-giratoria-com-graminho-beijo-da-terra-22-cm', 'Único', 40000, 43200, 1350, 285, 220, 45);

update public.product_variant v
   set price_pix_cents  = c.pix,
       price_card_cents = c.cartao,
       weight_grams     = coalesce(c.peso, v.weight_grams),
       length_mm        = coalesce(c.comp, v.length_mm),
       width_mm         = coalesce(c.larg, v.width_mm),
       height_mm        = coalesce(c.alt,  v.height_mm)
  from correcao c
 where c.variant_id = v.id;

-- Trava: se algo não bateu (id sumiu, apagou o que não devia), desfaz tudo.
do $$
declare
  v_updates int;
  v_left    int;
begin
  select count(*) into v_updates
    from correcao c join public.product_variant v on v.id = c.variant_id;
  if v_updates <> 21 then
    raise exception 'esperava 21 variantes para atualizar, achei %', v_updates;
  end if;

  select count(*) into v_left from public.product where slug in ('ovais', 'base-giratoria');
  if v_left <> 0 then
    raise exception 'rascunhos duplicados não foram apagados (% restantes)', v_left;
  end if;
end;
$$;

commit;

-- 4. Conferência ----------------------------------------------------------------
select pr.name as produto, v.label as variante,
       (v.price_pix_cents / 100.0)::numeric(10, 2) as pix, (v.price_card_cents / 100.0)::numeric(10, 2) as cartao,
       v.weight_grams as peso_g, v.length_mm, v.width_mm, v.height_mm
  from public.product_variant v
  join public.product pr on pr.id = v.product_id
 where pr.slug in ('base-giratoria-13-cm-pequena', 'base-giratoria-22-cm-media', 'base-giratoria-33-cm-grande', 'base-giratoria-com-graminho-beijo-da-terra-22-cm', 'conjunto-de-bowls', 'conjunto-sushi-reto', 'coracoes', 'molde-de-copo-pequeno-6-cm', 'oval', 'prato-de-risoto')
 order by pr.name, v.sort_order, v.label;
