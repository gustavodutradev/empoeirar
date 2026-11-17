-- =============================================================================
-- Empoeirar — codigo de rastreio do pedido.
--
-- O admin registra o codigo da etiqueta (Melhor Envio/transportadora) e o
-- cliente ve um link para o Melhor Rastreio na pagina do pedido e no e-mail de
-- "enviado". Pedido com entrega local nao tem codigo.
--
-- Escrita SO por set_order_tracking (SECURITY DEFINER com gate is_admin()):
-- a tabela de pedidos continua sem UPDATE direto para ninguem.
-- =============================================================================

alter table public.customer_order
  add column tracking_code text
  check (tracking_code ~ '^[A-Z0-9]{5,40}$');

comment on column public.customer_order.tracking_code is
  'Codigo de rastreio (so A-Z e 0-9, normalizado pelo app). Gravado por set_order_tracking.';

create or replace function public.set_order_tracking(
  p_order_id uuid,
  p_code     text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  -- null ou vazio = remover o codigo.
  v_code := nullif(upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')), '');

  if v_code is not null and v_code !~ '^[A-Z0-9]{5,40}$' then
    raise exception 'invalid_tracking_code';
  end if;

  update public.customer_order
     set tracking_code = v_code
   where id = p_order_id;

  if not found then
    raise exception 'order_not_found';
  end if;
end;
$$;

revoke all     on function public.set_order_tracking(uuid, text) from public, anon;
grant  execute on function public.set_order_tracking(uuid, text) to authenticated;
