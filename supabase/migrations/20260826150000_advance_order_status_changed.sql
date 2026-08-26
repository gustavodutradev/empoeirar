-- =============================================================================
-- Empoeirar — advance_order_status passa a RETORNAR se houve transicao real.
--
-- POR QUE: o webhook do Mercado Pago REENVIA notificacoes. A funcao ja e
-- idempotente (se o pedido ja esta no status alvo, nao recria o evento). Mas
-- quem chama precisa saber se HOUVE mudanca de verdade para nao disparar
-- e-mail transacional DUPLICADO ao cliente num reenvio. Retorno:
--   true  = transicionou agora (envie a notificacao)
--   false = ja estava no status (no-op; nao notifique)
--
-- A serializacao (`for update`) continua sendo o ponto unico de verdade: dois
-- webhooks concorrentes do mesmo pedido nao conseguem os dois retornar true.
--
-- Precisa de DROP porque o Postgres nao troca o tipo de retorno (void->boolean)
-- via CREATE OR REPLACE. Logica interna preservada 1:1.
-- =============================================================================

drop function if exists public.advance_order_status(uuid, text, text, text);

create function public.advance_order_status(
  p_order_id      uuid,
  p_status        text,
  p_note          text default null,
  p_mp_payment_id text default null
)
returns boolean
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

  -- Ja esta no status alvo: nada a fazer (idempotencia). Nao transicionou.
  if v_current = p_status then
    return false;
  end if;

  update public.customer_order set status = p_status where id = p_order_id;

  insert into public.order_status_event (order_id, status, note)
  values (p_order_id, p_status, p_note);

  return true;
end;
$$;

revoke all     on function public.advance_order_status(uuid, text, text, text) from public, anon, authenticated;
grant  execute on function public.advance_order_status(uuid, text, text, text) to service_role;
