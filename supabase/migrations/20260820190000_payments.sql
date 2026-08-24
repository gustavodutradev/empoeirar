-- =============================================================================
-- Empoeirar — Estrutura de PAGAMENTO (Mercado Pago). Sem credenciais aqui: so
-- o esqueleto no banco. Quando o access token do Jane entrar nas envs, o fluxo
-- funciona sem mudar schema.
--
-- Modelo do fluxo:
--   1. Pedido nasce 'pending_payment' (checkout, ja pronto).
--   2. App cria uma "preference" no MP e guarda o id (attach_order_preference).
--   3. Cliente paga no MP e volta pro site.
--   4. MP chama nosso WEBHOOK (server-to-server). O webhook confirma o
--      pagamento e chama advance_order_status (via service_role), que muda o
--      status e adiciona o evento na linha do tempo — de forma IDEMPOTENTE.
-- =============================================================================

-- Rastreio do MP no proprio pedido (reconciliacao). external_reference no MP =
-- o id do pedido, entao o webhook sempre acha o pedido certo.
alter table public.customer_order
  add column mp_preference_id text,
  add column mp_payment_id    text;

comment on column public.customer_order.mp_preference_id is
  'ID da preference do Mercado Pago (a "intencao de pagamento" criada no checkout).';
comment on column public.customer_order.mp_payment_id is
  'ID do pagamento confirmado pelo webhook do Mercado Pago.';

-- -----------------------------------------------------------------------------
-- attach_order_preference — o DONO vincula a preference ao seu pedido.
-- SECURITY DEFINER (authenticated nao tem UPDATE direto em customer_order),
-- mas so mexe se o pedido for do proprio usuario e ainda estiver aguardando
-- pagamento. Impede vincular preference em pedido alheio (IDOR).
-- -----------------------------------------------------------------------------
create or replace function public.attach_order_preference(
  p_order_id      uuid,
  p_preference_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.customer_order
     set mp_preference_id = p_preference_id
   where id = p_order_id
     and user_id = (select auth.uid())
     and status = 'pending_payment';

  if not found then
    raise exception 'order_not_updatable';
  end if;
end;
$$;

revoke all     on function public.attach_order_preference(uuid, text) from public, anon;
grant  execute on function public.attach_order_preference(uuid, text) to authenticated;

-- -----------------------------------------------------------------------------
-- advance_order_status — muda o status do pedido e registra o evento.
-- Chamada pelo WEBHOOK (service_role). NAO e exposta a authenticated/anon: o
-- cliente jamais promove o proprio pedido a "pago".
--
-- Idempotente: MP reenvia webhooks; se o pedido ja esta no status alvo, nao
-- duplica o evento. `for update` serializa webhooks concorrentes do mesmo
-- pedido.
-- -----------------------------------------------------------------------------
create or replace function public.advance_order_status(
  p_order_id      uuid,
  p_status        text,
  p_note          text default null,
  p_mp_payment_id text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current text;
begin
  if p_status not in ('pending_payment', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled') then
    raise exception 'invalid_status';
  end if;

  select status into v_current
    from public.customer_order
    where id = p_order_id
    for update;

  if not found then
    raise exception 'order_not_found';
  end if;

  if p_mp_payment_id is not null then
    update public.customer_order set mp_payment_id = p_mp_payment_id where id = p_order_id;
  end if;

  -- Ja esta no status alvo: nada a fazer (idempotencia).
  if v_current = p_status then
    return;
  end if;

  update public.customer_order set status = p_status where id = p_order_id;

  insert into public.order_status_event (order_id, status, note)
  values (p_order_id, p_status, p_note);
end;
$$;

revoke all     on function public.advance_order_status(uuid, text, text, text) from public, anon, authenticated;
grant  execute on function public.advance_order_status(uuid, text, text, text) to service_role;
