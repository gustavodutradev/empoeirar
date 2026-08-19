-- =============================================================================
-- Empoeirar — Seguranca da Fase 1: funcoes, trigger de signup, RLS e grants.
--
-- Modelo mental:
--   * RLS decide QUAIS LINHAS cada role enxerga/escreve.
--   * GRANT decide QUAIS OPERACOES/COLUNAS cada role pode tentar.
--   As duas camadas juntas: mesmo que um bug abra uma query, a RLS filtra a
--   linha; mesmo que uma policy seja permissiva demais, o grant de coluna
--   impede a escrita indevida (ex.: auto-elevacao de role).
--
--   * anon           = visitante nao logado
--   * authenticated  = usuario logado (sujeito a RLS)
--   * service_role   = backend confiavel (BYPASSA a RLS) — usado pelo admin.ts
-- =============================================================================

-- -----------------------------------------------------------------------------
-- is_admin(): o usuario atual e admin?
-- SECURITY DEFINER de proposito: le a tabela profile ignorando a RLS dela.
-- Isso (a) evita recursao (policies que chamam is_admin lendo profile) e
-- (b) permite a checagem sem expor profile. search_path travado por seguranca.
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profile
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- -----------------------------------------------------------------------------
-- handle_new_user(): cria o profile automaticamente quando nasce um auth.users.
-- SECURITY DEFINER para conseguir inserir em profile (que tem RLS). role sempre
-- entra como 'customer' (o default) — promocao a admin nunca acontece aqui.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profile (id, full_name, phone)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- =============================================================================
-- GRANTS — parte-se do minimo. anon/authenticated so recebem o explicitado.
-- service_role mantem seus privilegios padrao (bypassa RLS).
-- =============================================================================

revoke all on public.profile        from anon, authenticated;
revoke all on public.category       from anon, authenticated;
revoke all on public.product        from anon, authenticated;
revoke all on public.product_image  from anon, authenticated;
revoke all on public.audit_log      from anon, authenticated;

-- profile: le/atualiza (a RLS restringe a propria linha). UPDATE so nas colunas
-- full_name e phone => a coluna role fica IMUTAVEL para o usuario (anti-escalada).
grant select                         on public.profile to authenticated;
grant update (full_name, phone)      on public.profile to authenticated;

-- category: leitura publica; escrita so admin (barrada pela RLS).
grant select                         on public.category to anon, authenticated;
grant insert, update, delete         on public.category to authenticated;

-- product: leitura publica; escrita so admin.
grant select                         on public.product to anon, authenticated;
grant insert, update, delete         on public.product to authenticated;

-- product_image: leitura publica; escrita so admin.
grant select                         on public.product_image to anon, authenticated;
grant insert, update, delete         on public.product_image to authenticated;

-- audit_log: append-only e admin-read. Escrita fica com o backend (service_role)
-- ou funcoes SECURITY DEFINER; authenticated so pode LER (e a RLS filtra a admin).
grant select                         on public.audit_log to authenticated;

-- =============================================================================
-- RLS — habilitada em todas as tabelas.
-- =============================================================================
alter table public.profile       enable row level security;
alter table public.category      enable row level security;
alter table public.product       enable row level security;
alter table public.product_image enable row level security;
alter table public.audit_log     enable row level security;

-- -------------------------- profile ------------------------------------------
-- Sem policy de INSERT: o profile nasce pelo trigger (SECURITY DEFINER).
-- Sem policy de DELETE: some junto com o auth.users (on delete cascade).
create policy "profile_select_own"
  on public.profile for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profile_update_own"
  on public.profile for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- -------------------------- category -----------------------------------------
create policy "category_select_public"
  on public.category for select
  to anon, authenticated
  using (true);

create policy "category_write_admin"
  on public.category for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -------------------------- product ------------------------------------------
-- Publico ve so 'published'. Admin ve tudo (coberto pelo for all abaixo).
create policy "product_select_published"
  on public.product for select
  to anon, authenticated
  using (status = 'published');

create policy "product_write_admin"
  on public.product for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -------------------------- product_image ------------------------------------
create policy "product_image_select_published"
  on public.product_image for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.product p
      where p.id = product_id
        and p.status = 'published'
    )
  );

create policy "product_image_write_admin"
  on public.product_image for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -------------------------- audit_log ----------------------------------------
-- So leitura, e so para admin. Nao ha policy de escrita para authenticated.
create policy "audit_log_select_admin"
  on public.audit_log for select
  to authenticated
  using (public.is_admin());
