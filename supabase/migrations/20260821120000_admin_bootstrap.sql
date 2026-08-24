-- =============================================================================
-- Empoeirar — Bootstrap de admin.
--
-- A coluna profile.role e imutavel pelo usuario (grant de coluna na migration
-- de RLS impede auto-elevacao). Entao a promocao a admin so acontece por dentro
-- do banco, aqui.
--
-- Seguranca da abordagem por e-mail: so entra na conta quem recebe o codigo
-- OTP naquela caixa. Ou seja, promover por e-mail = promover quem PROVA ser
-- dono do e-mail. Nao ha como um estranho "virar" gustavo/bruno sem a caixa.
-- =============================================================================

-- 1) handle_new_user passa a nascer 'admin' para os e-mails da allowlist.
--    (Recria a funcao adicionando o role condicional; o resto e igual.)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profile (id, full_name, phone, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone',
    case
      when lower(new.email) in ('gustavo.dutra11@gmail.com', 'brunohaerdy@gmail.com')
        then 'admin'
      else 'customer'
    end
  );
  return new;
end;
$$;

-- 2) Promove quem JA existe (ja logou alguma vez) para admin.
update public.profile p
   set role = 'admin'
  from auth.users u
 where u.id = p.id
   and lower(u.email) in ('gustavo.dutra11@gmail.com', 'brunohaerdy@gmail.com');
