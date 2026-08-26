-- =============================================================================
-- Empoeirar — GRANT de leitura para o service_role nas tabelas de pedido.
--
-- POR QUE ISTO EXISTE (armadilha sutil de Postgres/Supabase):
-- "service_role BYPASSA a RLS" NAO significa "service_role pode tudo". RLS e
-- seguranca em nivel de LINHA; alem dela, o Postgres ainda exige o GRANT de
-- tabela (nivel de OBJETO), checado ANTES da RLS. O service_role pula as
-- POLICIES de RLS, mas se nao tiver GRANT SELECT na tabela, a query falha com
-- "42501 permission denied for table ...".
--
-- A migracao de checkout (20260820180000) revogou tudo de anon/authenticated e
-- concedeu SELECT a authenticated — mas nunca concedeu explicitamente ao
-- service_role, e o auto-grant padrao do Supabase nao cobriu estas tabelas
-- (criadas via CLI). Resultado: o webhook do Mercado Pago (admin.ts /
-- service_role) recebia "permission denied" ao ler customer_order na
-- conferencia de valor; o erro era engolido como "pedido nao encontrado" e o
-- pedido nunca avancava para "pago".
--
-- A ESCRITA continua exclusiva das funcoes SECURITY DEFINER
-- (advance_order_status roda como o dono do objeto, entao nao depende destes
-- grants). Aqui concedemos apenas o SELECT que o backend confiavel legitimamente
-- precisa para ler pedidos.
--
-- Idempotente: reconceder um privilegio que ja existe e no-op.
-- =============================================================================

grant select on public.customer_order     to service_role;
grant select on public.order_item         to service_role;
grant select on public.order_status_event to service_role;
