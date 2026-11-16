-- =============================================================================
-- Empoeirar — entrega local em Belo Horizonte, feita pelo proprio Jane.
--
-- POR QUE NO BANCO (e nao no codigo): a tarifa ("R$ 10 a principio") e a lista
-- de bairros vao mudar. No banco, o Jane edita pelo admin sem deploy.
--
-- REGRA DE ELEGIBILIDADE (aplicada no servidor, nunca no navegador): o bairro
-- e o da ViaCEP para o CEP informado, nao o que o cliente digitou no campo
-- "Bairro". Assim ninguem ganha entrega local digitando um bairro da lista.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Configuracao (uma linha so: id fixo = 1).
-- -----------------------------------------------------------------------------
create table public.local_delivery_config (
  id            int primary key default 1 check (id = 1),
  enabled       boolean not null default true,
  price_cents   int     not null check (price_cents >= 0),
  -- Dias uteis entre o pedido ficar pronto e a entrega na porta do cliente.
  delivery_days int     not null default 2 check (delivery_days between 0 and 30),
  updated_at    timestamptz not null default now()
);

comment on table public.local_delivery_config is
  'Entrega local em BH feita pelo Jane. Linha unica (id = 1). Editada pelo admin.';

create trigger local_delivery_config_set_updated_at
  before update on public.local_delivery_config
  for each row
  execute function public.set_updated_at();

insert into public.local_delivery_config (id, enabled, price_cents, delivery_days)
values (1, true, 1000, 2);

-- -----------------------------------------------------------------------------
-- Bairros atendidos. A comparacao com a ViaCEP ignora acento e maiusculas (no
-- codigo); o indice unico aqui so impede o mesmo nome cadastrado duas vezes.
-- -----------------------------------------------------------------------------
create table public.local_delivery_district (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(trim(name)) between 2 and 80),
  created_at timestamptz not null default now()
);

create unique index local_delivery_district_name_key
  on public.local_delivery_district (lower(trim(name)));

insert into public.local_delivery_district (name) values
  ('União'), ('Cidade Nova'), ('Renascença'), ('Ipiranga'), ('Silveira'),
  ('Nova Floresta'), ('Concórdia'), ('Fernão Dias'), ('Sagrada Família'),
  ('Horto'), ('Santa Cruz'), ('Palmares'), ('Savassi'), ('Funcionários');

-- -----------------------------------------------------------------------------
-- RLS. Leitura publica: tarifa e bairros nao sao segredo (aparecem na politica
-- de envio). Escrita so admin.
-- -----------------------------------------------------------------------------
alter table public.local_delivery_config   enable row level security;
alter table public.local_delivery_district enable row level security;

revoke all on public.local_delivery_config   from anon, authenticated;
revoke all on public.local_delivery_district from anon, authenticated;

grant select on public.local_delivery_config   to anon, authenticated;
grant select on public.local_delivery_district to anon, authenticated;
grant update (enabled, price_cents, delivery_days) on public.local_delivery_config to authenticated;
grant insert (name), delete on public.local_delivery_district to authenticated;

create policy "local_delivery_config_select_public"
  on public.local_delivery_config for select
  to anon, authenticated
  using (true);

create policy "local_delivery_config_update_admin"
  on public.local_delivery_config for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "local_delivery_district_select_public"
  on public.local_delivery_district for select
  to anon, authenticated
  using (true);

create policy "local_delivery_district_insert_admin"
  on public.local_delivery_district for insert
  to authenticated
  with check (public.is_admin());

create policy "local_delivery_district_delete_admin"
  on public.local_delivery_district for delete
  to authenticated
  using (public.is_admin());
