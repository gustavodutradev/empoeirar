-- =============================================================================
-- Empoeirar — Rate limiting no banco (janela fixa).
--
-- Por que no banco: no Vercel (serverless) não há memória compartilhada entre
-- invocações, então um limiter em memória não segura de verdade. Já temos
-- Postgres; uma função atômica resolve sem depender de Redis/Upstash. Para o
-- volume da loja, o custo por request é desprezível.
--
-- A tabela só é tocada pela função (SECURITY DEFINER); ninguém acessa direto.
-- =============================================================================

create table public.rate_limit (
  key          text primary key,
  count        int not null default 0,
  window_start timestamptz not null default now()
);

alter table public.rate_limit enable row level security; -- sem policies: só a função definer acessa
revoke all on public.rate_limit from anon, authenticated;

-- Registra um "hit" para a chave e diz se está DENTRO do limite. Janela fixa:
-- quando a janela expira, zera o contador. Atômico (upsert) — sem corrida.
-- Retorna true = permitido; false = estourou o limite.
create or replace function public.rate_limit_hit(
  p_key             text,
  p_limit           int,
  p_window_seconds  int
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  insert into public.rate_limit as r (key, count, window_start)
  values (p_key, 1, now())
  on conflict (key) do update
    set count = case
                  when r.window_start < now() - make_interval(secs => p_window_seconds) then 1
                  else r.count + 1
                end,
        window_start = case
                  when r.window_start < now() - make_interval(secs => p_window_seconds) then now()
                  else r.window_start
                end
  returning r.count into v_count;

  return v_count <= p_limit;
end;
$$;

revoke all     on function public.rate_limit_hit(text, int, int) from public;
grant  execute on function public.rate_limit_hit(text, int, int) to anon, authenticated, service_role;
