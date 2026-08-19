-- Seed da Fase 1: as 6 categorias do catalogo Empoeirar.
-- Idempotente (on conflict no slug), entao rodar `supabase db reset` varias
-- vezes nao duplica. A ultima e o funil de moldes personalizados do Jane.
insert into public.category (name, slug, description, sort_order, is_custom_funnel) values
  ('Especiais',                    'especiais',            'Peças especiais.',                                    1, false),
  ('Ferramentas',                  'ferramentas',          'Ferramentas de madeira para cerâmica.',               2, false),
  ('Conjuntos Orgânicos',          'conjuntos-organicos',  'Conjuntos de formas orgânicas.',                      3, false),
  ('Moldes Lúdicos',               'moldes-ludicos',       'Moldes lúdicos.',                                     4, false),
  ('Moldes Geométricos',           'moldes-geometricos',   'Moldes geométricos.',                                 5, false),
  ('Um molde para chamar de seu!', 'molde-personalizado',  'Funil de moldes personalizados: redireciona para contato/orçamento.', 6, true)
on conflict (slug) do nothing;
