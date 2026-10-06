-- =============================================================================
-- Empoeirar — advance_order_status com checagem atomica do status esperado
-- (item 46 das pendencias).
--
-- POR QUE: o webhook le o pedido, decide a transicao em codigo
-- (decidePaymentTransition) e so depois chama esta funcao. Entre a leitura e a
-- escrita, outro webhook (ex.: segundo pagamento aprovado do mesmo pedido) pode
-- ter mudado o pedido. Sem checagem, as duas execucoes "confirmavam" e o
-- mp_payment_id do segundo pagamento sobrescrevia o do primeiro, e ai o sistema
-- nao sabe mais qual pagamento estornar.
--
-- O QUE MUDA:
--   1. Novo parametro p_expected_status (opcional). Se informado e o status
--      atual (lido sob `for update`) for diferente, NADA e gravado e a funcao
--      retorna false. Quem chamou rele o pedido e decide de novo.
--      E um "compare-and-set": a decisao vale so se o mundo nao mudou.
--   2. mp_payment_id so e gravado JUNTO com a transicao, no mesmo UPDATE.
--      Antes era gravado antes de conferir o status, inclusive em no-op.
--   3. Retorno continua: true = transicionou agora; false = nao transicionou
--      (ja estava no status alvo, ou o status esperado nao bateu).
--
-- DROP + CREATE (e nao create or replace): mudar a lista de parametros com
-- create or replace criaria uma SEGUNDA funcao (overload), e o PostgREST nao
-- consegue escolher entre duas quando a chamada omite o parametro com default.
-- Chamadas antigas com 4 argumentos nomeados (admin) seguem funcionando.
-- =============================================================================

drop function if exists public.advance_order_status(uuid, text, text, text);

create function public.advance_order_status(
  p_order_id          uuid,
  p_status            text,
  p_note              text default null,
  p_mp_payment_id     text default null,
  p_expected_status   text default null
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

  -- Trava a linha: webhooks/admin concorrentes do MESMO pedido esperam aqui.
  select status into v_current
    from public.customer_order
    where id = p_order_id
    for update;

  if not found then
    raise exception 'order_not_found';
  end if;

  -- Compare-and-set: o pedido mudou desde que o chamador leu. Nao grava nada.
  if p_expected_status is not null and v_current <> p_expected_status then
    return false;
  end if;

  -- Ja esta no status alvo: nada a fazer (idempotencia).
  if v_current = p_status then
    return false;
  end if;

  update public.customer_order
     set status        = p_status,
         mp_payment_id = coalesce(p_mp_payment_id, mp_payment_id)
   where id = p_order_id;

  insert into public.order_status_event (order_id, status, note)
  values (p_order_id, p_status, p_note);

  return true;
end;
$$;

revoke all     on function public.advance_order_status(uuid, text, text, text, text) from public, anon, authenticated;
grant  execute on function public.advance_order_status(uuid, text, text, text, text) to service_role;
