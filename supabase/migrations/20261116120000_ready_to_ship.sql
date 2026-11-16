-- =============================================================================
-- Empoeirar — status "ready_to_ship" (Pronto para envio) + paid_at/shipped_at.
--
-- POR QUE:
--   1. O Jane precisa separar "peça em produção" (preparing) de "peça embalada,
--      esperando a coleta" (ready_to_ship). O fluxo passa a ser:
--        pending_payment -> paid -> preparing -> ready_to_ship -> shipped -> delivered
--   2. O painel mostra ha quantos dias o pedido foi pago e ainda nao saiu
--      (prazo de producao). Calcular isso a partir do log de eventos em toda
--      listagem exigiria um join/agregacao por pedido; duas colunas mantidas
--      pela propria advance_order_status sao mais simples e baratas.
--
-- O status e validado em TRES lugares no banco, e os tres mudam aqui:
--   - check de customer_order.status
--   - check de order_status_event.status
--   - lista dentro de advance_order_status
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Checks de status. Os checks foram criados inline (nome gerado pelo
--    Postgres), entao localizamos pelo conteudo em vez de confiar no nome.
-- -----------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select c.conrelid::regclass as tbl, c.conname
      from pg_constraint c
     where c.contype = 'c'
       and c.conrelid in ('public.customer_order'::regclass, 'public.order_status_event'::regclass)
       and pg_get_constraintdef(c.oid) like '%pending_payment%'
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
  end loop;
end;
$$;

alter table public.customer_order
  add constraint customer_order_status_check
  check (status in ('pending_payment', 'paid', 'preparing', 'ready_to_ship',
                    'shipped', 'delivered', 'cancelled'));

alter table public.order_status_event
  add constraint order_status_event_status_check
  check (status in ('pending_payment', 'paid', 'preparing', 'ready_to_ship',
                    'shipped', 'delivered', 'cancelled'));

-- -----------------------------------------------------------------------------
-- 2. Marcos de tempo do pedido.
--    paid_at    = PRIMEIRA confirmacao de pagamento (nao reinicia se o admin
--                 desfizer uma etapa e voltar para "pago").
--    shipped_at = quando saiu para entrega. Se o admin desfizer o envio, volta
--                 a null e o contador de dias segue correndo.
-- -----------------------------------------------------------------------------
alter table public.customer_order
  add column paid_at    timestamptz,
  add column shipped_at timestamptz;

comment on column public.customer_order.paid_at is
  'Primeira confirmacao de pagamento. Mantida por advance_order_status. Base do contador de prazo.';
comment on column public.customer_order.shipped_at is
  'Saida para entrega. Mantida por advance_order_status; volta a null se o envio for desfeito.';

-- Carga inicial a partir da linha do tempo (pedidos que ja existiam).
update public.customer_order o
   set paid_at = e.first_paid
  from (
    select order_id, min(created_at) as first_paid
      from public.order_status_event
     where status = 'paid'
     group by order_id
  ) e
 where e.order_id = o.id
   and o.paid_at is null;

update public.customer_order o
   set shipped_at = e.last_shipped
  from (
    select order_id, max(created_at) as last_shipped
      from public.order_status_event
     where status = 'shipped'
     group by order_id
  ) e
 where e.order_id = o.id
   and o.status in ('shipped', 'delivered')
   and o.shipped_at is null;

-- -----------------------------------------------------------------------------
-- 3. advance_order_status: mesma assinatura (create or replace nao cria
--    overload), lista de status nova e manutencao de paid_at/shipped_at.
--    Todo o resto (lock, compare-and-set, idempotencia) fica igual.
-- -----------------------------------------------------------------------------
create or replace function public.advance_order_status(
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
  if p_status not in ('pending_payment', 'paid', 'preparing', 'ready_to_ship',
                      'shipped', 'delivered', 'cancelled') then
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
         mp_payment_id = coalesce(p_mp_payment_id, mp_payment_id),
         paid_at       = case
                           when p_status = 'paid' then coalesce(paid_at, now())
                           else paid_at
                         end,
         shipped_at    = case
                           when p_status = 'shipped' then now()
                           when p_status in ('delivered', 'cancelled') then shipped_at
                           else null   -- desfez o envio: o prazo volta a correr
                         end
   where id = p_order_id;

  insert into public.order_status_event (order_id, status, note)
  values (p_order_id, p_status, p_note);

  return true;
end;
$$;

revoke all     on function public.advance_order_status(uuid, text, text, text, text) from public, anon, authenticated;
grant  execute on function public.advance_order_status(uuid, text, text, text, text) to service_role;
