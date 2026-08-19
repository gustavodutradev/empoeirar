-- =============================================================================
-- Seed da Fase 1 — Empoeirar
-- Idempotente (on conflict no slug): rodar `supabase db reset` nao duplica.
-- =============================================================================

-- ---- Categorias -------------------------------------------------------------
-- A ultima e o funil de moldes personalizados (is_custom_funnel = true).
insert into public.category (name, slug, description, sort_order, is_custom_funnel) values
  ('Conjuntos Orgânicos',          'conjuntos-organicos',  'Conjuntos de moldes de formas orgânicas, com nomes em homenagem ao Vale do Jequitinhonha.', 1, false),
  ('Moldes Geométricos',           'moldes-geometricos',   'Círculos, quadrados, retângulos e elipses, em conjuntos do PP ao GG.',                      2, false),
  ('Moldes Lúdicos',               'moldes-ludicos',       'Moldes de frutas, bichos e figuras para peças cheias de personalidade.',                    3, false),
  ('Especiais',                    'especiais',            'Moldes para peças de mesa: pratos de risoto, copos, bowls e conjuntos de sushi.',           4, false),
  ('Ferramentas',                  'ferramentas',          'Discos para torno, réguas niveladoras e acessórios em MDF naval, resistentes à água.',      5, false),
  ('Um molde para chamar de seu!', 'molde-personalizado',  'Desenhe, fotografe ou imagine: transformamos sua ideia num molde único e exclusivo.',       6, true)
on conflict (slug) do nothing;

-- ---- Produtos de exemplo (2 por categoria, extraidos do catalogo 2026) -------
-- Precos em centavos. Pesos e alturas sao ESTIMATIVAS ate termos os dados reais
-- (frete = Fase 2). Dimensoes em mm, a partir da maior peca de cada conjunto.
insert into public.product
  (category_id, name, slug, description, price_cents, status, stock,
   weight_grams, length_mm, width_mm, height_mm, material_care)
values
  -- Conjuntos Orgânicos
  ((select id from public.category where slug = 'conjuntos-organicos'),
   'Conjunto Turmalina', 'conjunto-turmalina',
   'Conjunto de três moldes orgânicos (P, M e G) com puxadores entalhados que facilitam o desmolde sem marcar a borda da peça. O nome é uma homenagem ao Vale do Jequitinhonha, referência em cerâmica artesanal.',
   14900, 'published', 5, 700, 280, 265, 18,
   'Feito à mão em MDF de 18 mm. Mantenha em local seco; limpe com pano levemente úmido, sem imergir em água.'),

  ((select id from public.category where slug = 'conjuntos-organicos'),
   'Conjunto Padre Paraíso', 'conjunto-padre-paraiso',
   'Conjunto de cinco moldes orgânicos (do PP ao GG) para compor pratos e travessas em vários tamanhos, com puxadores entalhados para um desmolde limpo. Nome em homenagem ao Vale do Jequitinhonha.',
   23800, 'published', 4, 1200, 310, 310, 18,
   'Feito à mão em MDF de 18 mm. Mantenha em local seco; limpe com pano levemente úmido, sem imergir em água.'),

  -- Moldes Geométricos
  ((select id from public.category where slug = 'moldes-geometricos'),
   'Círculos', 'circulos',
   'Conjunto de cinco moldes circulares (de 14 a 38 cm) para pratos e bases perfeitamente redondos, do PP ao GG.',
   23800, 'published', 6, 1300, 380, 380, 18,
   'Feito à mão em MDF de 18 mm. Mantenha em local seco; limpe com pano levemente úmido, sem imergir em água.'),

  ((select id from public.category where slug = 'moldes-geometricos'),
   'Quadrados', 'quadrados',
   'Conjunto de cinco moldes quadrados (de 14 a 38 cm) para travessas e bases de linhas retas, do PP ao GG.',
   23800, 'published', 6, 1300, 380, 380, 18,
   'Feito à mão em MDF de 18 mm. Mantenha em local seco; limpe com pano levemente úmido, sem imergir em água.'),

  -- Moldes Lúdicos
  ((select id from public.category where slug = 'moldes-ludicos'),
   'Ovos', 'ovos',
   'Trio de moldes em formato de ovo (P, M e G), ideais para pratinhos e petisqueiras — de Páscoa ou do dia a dia. Feitos à mão em MDF.',
   14900, 'published', 8, 650, 260, 190, 18,
   'Feito à mão em MDF de 18 mm. Mantenha em local seco; limpe com pano levemente úmido, sem imergir em água.'),

  ((select id from public.category where slug = 'moldes-ludicos'),
   'Pizza', 'pizza',
   'Molde em formato de fatia de pizza, em tamanho único, para peças divertidas e cheias de personalidade.',
   5500, 'published', 10, 350, 230, 190, 18,
   'Feito à mão em MDF de 18 mm. Mantenha em local seco; limpe com pano levemente úmido, sem imergir em água.'),

  -- Especiais
  ((select id from public.category where slug = 'especiais'),
   'Prato de Risoto', 'prato-de-risoto',
   'Molde para prato de risoto com aba larga e centro fundo: diâmetro superior de 31 cm e 7,2 cm de altura. Para peças de mesa com presença.',
   15000, 'published', 4, 800, 310, 310, 72,
   'Feito à mão em MDF de 18 mm. Mantenha em local seco; limpe com pano levemente úmido, sem imergir em água.'),

  ((select id from public.category where slug = 'especiais'),
   'Conjunto Sushi Arredondado', 'conjunto-sushi-arredondado',
   'Conjunto de três moldes (P, M e G) para pratos de sushi com cantos arredondados, do petisco à travessa.',
   14900, 'published', 5, 600, 330, 130, 18,
   'Feito à mão em MDF de 18 mm. Mantenha em local seco; limpe com pano levemente úmido, sem imergir em água.'),

  -- Ferramentas
  ((select id from public.category where slug = 'ferramentas'),
   'Disco para Torno Inteiriço', 'disco-para-torno-inteirico',
   'Disco de 31 cm em MDF naval (resistente à água), projetado para encaixar no torno sem folga que cause vibração nem aperto que dificulte a remoção. Preço por unidade; consulte valores para quantidades maiores.',
   3500, 'published', 20, 250, 310, 310, 6,
   'MDF naval, resistente à água. Seque após o uso e guarde em local ventilado.'),

  ((select id from public.category where slug = 'ferramentas'),
   'Régua Niveladora 6 mm (par)', 'regua-niveladora-6mm',
   'Par de réguas niveladoras de 6 mm em MDF naval, para nivelar a espessura da placa de argila com precisão. 40 cm de comprimento.',
   2500, 'published', 15, 120, 400, 60, 6,
   'MDF naval, resistente à água. Seque após o uso e guarde em local ventilado.')
on conflict (slug) do nothing;
