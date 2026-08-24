-- =============================================================================
-- Empoeirar — Schema da Fase 1
-- Tabelas de catalogo, perfil de usuario e trilha de auditoria.
-- A SEGURANCA (RLS, policies, grants, triggers de auth) vive na migration
-- seguinte (security_rls). Aqui e so estrutura.
-- gen_random_uuid() e nativo no Postgres >= 13; nenhuma extensao necessaria.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profile — dados de aplicacao do usuario (1:1 com auth.users)
-- A identidade/senha fica no auth do Supabase; aqui so o que e nosso.
-- -----------------------------------------------------------------------------
create table public.profile (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text,
  phone      text,
  role       text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

comment on table public.profile is
  'Dados de aplicacao do usuario, 1:1 com auth.users.';
comment on column public.profile.role is
  'customer | admin. Alteracao bloqueada por grant de coluna (migration de RLS) para impedir auto-elevacao.';

-- -----------------------------------------------------------------------------
-- category — categorias do catalogo
-- -----------------------------------------------------------------------------
create table public.category (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  slug             text not null unique,
  description      text,
  sort_order       int not null default 0,
  is_custom_funnel boolean not null default false,
  created_at       timestamptz not null default now()
);

comment on column public.category.is_custom_funnel is
  'true = categoria redireciona ao funil de moldes personalizados (regra do Jane).';

-- -----------------------------------------------------------------------------
-- product — produtos
-- -----------------------------------------------------------------------------
create table public.product (
  id            uuid primary key default gen_random_uuid(),
  category_id   uuid not null references public.category (id) on delete restrict,
  name          text not null,
  slug          text not null unique,
  description   text,
  price_cents   int  not null check (price_cents >= 0),
  status        text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  stock         int  not null default 0,
  weight_grams  int  check (weight_grams >= 0),
  length_mm     int  check (length_mm >= 0),
  width_mm      int  check (width_mm >= 0),
  height_mm     int  check (height_mm >= 0),
  curvature     text,
  material_care text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on column public.product.price_cents is
  'Preco em centavos (inteiro). Nunca float para dinheiro.';
comment on column public.product.status is
  'draft | published | archived. Controla a visibilidade, nao a quantidade.';
comment on column public.product.stock is
  'Informativo no admin; NAO aplicado na venda na Fase 1/2 (modelo sempre disponivel).';

create index product_category_id_idx on public.product (category_id);
create index product_status_idx on public.product (status);

-- -----------------------------------------------------------------------------
-- product_image — imagens do produto (1:N)
-- -----------------------------------------------------------------------------
create table public.product_image (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.product (id) on delete cascade,
  storage_path text not null,
  alt_text     text,
  sort_order   int  not null default 0,
  is_primary   boolean not null default false,
  created_at   timestamptz not null default now()
);

comment on column public.product_image.storage_path is
  'Caminho no Supabase Storage (nunca o binario; nunca um path vindo do usuario sem sanitizacao).';

create index product_image_product_id_idx on public.product_image (product_id);
-- No maximo uma imagem principal por produto.
create unique index product_image_one_primary_idx
  on public.product_image (product_id)
  where is_primary;

-- -----------------------------------------------------------------------------
-- audit_log — trilha de acoes de admin (append-only)
-- -----------------------------------------------------------------------------
create table public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references auth.users (id) on delete set null,
  action      text not null,
  entity_type text,
  entity_id   uuid,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create index audit_log_actor_id_idx on public.audit_log (actor_id);
create index audit_log_entity_idx  on public.audit_log (entity_type, entity_id);

-- -----------------------------------------------------------------------------
-- Trigger utilitario: manter product.updated_at
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger product_set_updated_at
  before update on public.product
  for each row
  execute function public.set_updated_at();
