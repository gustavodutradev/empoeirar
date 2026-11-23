-- =============================================================================
-- Empoeirar — importa a planilha do Jane (23/11/2026): preço Pix, preço cartão,
-- peso e medidas reais. NÃO é migration: rode UMA vez no SQL Editor do Supabase,
-- DEPOIS de aplicar a migration 20261123120000_pix_card_prices.
--
-- O que faz, numa transação só (se algo falhar, nada muda):
--   0. Backup de product_variant em backup.product_variant_20261123 (schema fora
--      da API, sem acesso de anon/authenticated).
--   1. Atualiza as variantes que casam por (slug do produto, rótulo da variante).
--      Peso e medidas vazios na planilha NÃO apagam o que já está no banco.
--   2. Cria variantes novas em produtos que já existem (Bowl P/M/G, Copo conjunto).
--   3. Cria produtos novos como RASCUNHO (não aparecem na loja até o Jane revisar
--      descrição, categoria e fotos e publicar pelo admin).
--   4. Mostra um relatório: o que não casou, o que ficou fora da planilha, o que
--      precisa de confirmação e o que está sem peso ou sem foto.
--
-- Medidas: planilha em cm -> banco em mm. Maior medida = comprimento, menor =
-- largura, altura = altura. São as medidas da PEÇA, não da caixa.
-- Gerado a partir de Planilha_Dimensoes_e_nome_de_todos_os_itens.xlsx.
-- =============================================================================

begin;

-- 0. Backup ------------------------------------------------------------------
create schema if not exists backup;
revoke all on schema backup from public, anon, authenticated;
create table if not exists backup.product_variant_20261123 as
  table public.product_variant;

-- Planilha -------------------------------------------------------------------
create temp table planilha (
  linha     int primary key,
  nome      text not null,
  tipo      text not null,   -- update | new_variant | new_product | ask
  slug      text,
  rotulo    text,
  produto   text,            -- nome do produto novo
  categoria text,            -- slug da categoria do produto novo
  pix       int,             -- centavos
  cartao    int,             -- centavos
  peso      int,             -- gramas
  comp      int,             -- mm
  larg      int,             -- mm
  alt       int,             -- mm
  tem_foto  boolean not null,
  obs       text
);

insert into planilha
  (linha, nome, tipo, slug, rotulo, produto, categoria, pix, cartao, peso, comp, larg, alt, tem_foto, obs)
values
  (2, 'Alça para caneca/xícara', 'new_product', 'alca-para-caneca-xicara', 'Único', 'Alça para Caneca/Xícara', 'especiais', 700, 800, null, null, null, null, false, null),
  (3, 'Araçuaí - conjunto', 'update', 'conjunto-aracuai', 'Conjunto', null, null, 14900, 16100, 1000, 300, 170, 54, true, null),
  (4, 'Araçuaí G', 'update', 'conjunto-aracuai', 'G', null, null, 6000, 6500, 470, 300, 170, 18, true, null),
  (5, 'Araçuaí M', 'update', 'conjunto-aracuai', 'M', null, null, 5500, 5900, 330, 250, 130, 18, true, null),
  (6, 'Araçuaí P', 'update', 'conjunto-aracuai', 'P', null, null, 5000, 5400, 200, 200, 105, 18, true, null),
  (7, 'Árvore de Natal', 'update', 'arvore-de-natal', 'Único', null, null, 5500, 5900, 550, 280, 270, 18, true, null),
  (8, 'Astros - conjunto', 'ask', null, null, null, null, 14900, 11700, 1000, 250, 250, 54, true, 'No banco existe ''Luas'' (conjunto de 2). Este conjunto tem 3 peças (com o Sol) e o valor Pix (149) está maior que o do cartão (117).'),
  (9, 'Astros Lua G', 'update', 'luas', 'G', null, null, 5500, 5900, 360, 230, 130, 18, true, null),
  (10, 'Astros Lua P', 'update', 'luas', 'P', null, null, 5000, 5400, 240, 250, 90, 18, true, null),
  (11, 'Astros Sol', 'ask', null, null, null, null, 6000, 6500, 400, 250, 250, 18, true, 'Não existe ''Sol'' no banco. Criar produto próprio ou juntar com Luas num conjunto ''Astros''?'),
  (12, 'Barco - conjunto', 'update', 'barcos', 'Conjunto', null, null, 10800, 11700, 1230, 420, 220, 36, true, null),
  (13, 'Barco G', 'update', 'barcos', 'G', null, null, 6000, 6500, 860, 420, 220, 18, true, null),
  (14, 'Barco P', 'update', 'barcos', 'P', null, null, 5500, 5900, 370, 275, 155, 18, true, null),
  (15, 'Barreira para Gesso', 'new_product', 'barreira-para-gesso', 'Único', 'Barreira para Gesso', 'ferramentas', 15000, 16300, null, null, null, null, false, null),
  (16, 'Base giratória G', 'new_product', 'base-giratoria', 'G', 'Base Giratória', 'ferramentas', 34000, 36700, 2700, 330, 330, 45, true, null),
  (17, 'Base giratória M', 'new_product', 'base-giratoria', 'M', 'Base Giratória', 'ferramentas', 28000, 30200, 1200, 220, 220, 45, true, null),
  (18, 'Base giratória M com Graminho', 'new_product', 'base-giratoria', 'M com Graminho', 'Base Giratória', 'ferramentas', 40000, 43200, 1350, 285, 220, 45, true, null),
  (19, 'Base giratória P', 'new_product', 'base-giratoria', 'P', 'Base Giratória', 'ferramentas', 24000, 25900, 450, 130, 130, 45, true, null),
  (20, 'Boneco de biscoito - conjunto', 'update', 'bonecos-de-biscoito', 'Conjunto', null, null, 14900, 16100, 800, 280, 210, 54, true, null),
  (21, 'Boneco de biscoito G', 'update', 'bonecos-de-biscoito', 'G', null, null, 6000, 6500, 370, 280, 210, 18, true, null),
  (22, 'Boneco de biscoito M', 'update', 'bonecos-de-biscoito', 'M', null, null, 5500, 5900, 260, 230, 180, 18, true, null),
  (23, 'Boneco de biscoito P', 'update', 'bonecos-de-biscoito', 'P', null, null, 5000, 5400, 170, 190, 145, 18, true, null),
  (24, 'Bowl - conjunto', 'update', 'conjunto-de-bowls', 'Conjunto', null, null, 40000, 43200, 2150, 250, 250, 216, true, null),
  (25, 'Bowl G', 'new_variant', 'conjunto-de-bowls', 'G', null, null, 19000, 20500, 1140, 250, 250, 90, true, null),
  (26, 'Bowl M', 'new_variant', 'conjunto-de-bowls', 'M', null, null, 14000, 15100, 670, 190, 190, 72, true, null),
  (27, 'Bowl P', 'new_variant', 'conjunto-de-bowls', 'P', null, null, 9000, 9700, 340, 140, 140, 54, true, null),
  (28, 'Canoa', 'update', 'canoa', 'Único', null, null, 5500, 5900, 270, 385, 90, 18, true, null),
  (29, 'Capivara - conjunto', 'update', 'capivaras', 'Conjunto', null, null, 10800, 11700, 470, 250, 160, 36, true, null),
  (30, 'Capivara G', 'update', 'capivaras', 'G', null, null, 6000, 6500, 320, 250, 160, 18, true, null),
  (31, 'Capivara P', 'update', 'capivaras', 'P', null, null, 5500, 5900, 150, 180, 120, 18, true, null),
  (32, 'Caraí - conjunto', 'update', 'conjunto-carai', 'Conjunto', null, null, 23800, 25700, 1970, 275, 260, 90, true, null),
  (33, 'Caraí G', 'update', 'conjunto-carai', 'G', null, null, 6000, 6500, 510, 250, 220, 18, true, null),
  (34, 'Caraí GG', 'update', 'conjunto-carai', 'GG', null, null, 6500, 7000, 700, 275, 260, 18, true, null),
  (35, 'Caraí M', 'update', 'conjunto-carai', 'M', null, null, 5500, 5900, 360, 210, 200, 18, true, null),
  (36, 'Caraí P', 'update', 'conjunto-carai', 'P', null, null, 5000, 5400, 270, 185, 170, 18, true, null),
  (37, 'Caraí PP', 'update', 'conjunto-carai', 'PP', null, null, 4500, 4900, 130, 140, 120, 18, true, null),
  (38, 'Círculo - conjunto', 'update', 'circulos', 'Conjunto', null, null, 23800, 25700, 3490, 380, 380, 90, true, null),
  (39, 'Círculo G', 'update', 'circulos', 'G', null, null, 6000, 6500, 1000, 320, 320, 18, true, null),
  (40, 'Círculo GG', 'update', 'circulos', 'GG', null, null, 6500, 7000, 1330, 380, 380, 18, true, null),
  (41, 'Círculo M', 'update', 'circulos', 'M', null, null, 5500, 5900, 630, 260, 260, 18, true, null),
  (42, 'Círculo P', 'update', 'circulos', 'P', null, null, 5000, 5400, 360, 200, 200, 18, true, null),
  (43, 'Círculo PP', 'update', 'circulos', 'PP', null, null, 4500, 4900, 170, 140, 140, 18, true, null),
  (44, 'Concha - conjunto', 'update', 'conchas', 'Conjunto', null, null, 14900, 16100, 1000, 280, 255, 54, true, null),
  (45, 'Concha G', 'update', 'conchas', 'G', null, null, 6000, 6500, 610, 280, 255, 18, true, null),
  (46, 'Concha M', 'update', 'conchas', 'M', null, null, 5500, 5900, 290, 200, 180, 18, true, null),
  (47, 'Concha P', 'update', 'conchas', 'P', null, null, 5000, 5400, 100, 120, 110, 18, true, null),
  (48, 'Cone Santinha', 'new_product', 'cone-santinha', 'Único', 'Cone Santinha', 'especiais', 17000, 18400, null, 250, 110, 110, false, null),
  (49, 'Copo - conjunto', 'new_variant', 'copo', 'Conjunto', null, null, 36000, 38900, 1700, 170, 90, 520, true, null),
  (50, 'Copo - Manteigueira francesa', 'ask', null, null, null, null, 25000, 27000, 750, 170, 90, 130, true, 'No banco, ''Manteigueira Francesa'' custa R$ 130 e mede 7,5×7,5×9 cm; a planilha diz R$ 250 e 17×9×13 cm. É o mesmo produto?'),
  (51, 'Copo G', 'update', 'copo', 'Grande', null, null, 15000, 16200, 440, 90, 90, 130, true, null),
  (52, 'Copo M', 'update', 'copo', 'Médio', null, null, 13000, 14000, 310, 75, 75, 130, true, null),
  (53, 'Copo P', 'update', 'copo', 'Pequeno', null, null, 11000, 11900, 200, 60, 60, 130, true, null),
  (54, 'Coração - conjunto', 'update', 'coracoes', 'Conjunto', null, null, 10800, 11700, 710, 260, 240, 36, true, null),
  (55, 'Coração G', 'update', 'coracoes', 'G', null, null, 6000, 6500, 460, 260, 240, 18, true, null),
  (56, 'Coração P', 'update', 'coracoes', 'P', null, null, 5500, 5900, 250, 180, 100, 18, true, null),
  (57, 'Descansos de 10x10cm', 'update', 'descanso-para-secagem', '10 × 10 cm', null, null, 500, 500, null, 100, 100, 6, false, null),
  (58, 'Descansos de 15x15cm', 'update', 'descanso-para-secagem', '15 × 15 cm', null, null, 700, 800, null, 150, 150, 6, false, null),
  (59, 'Descansos de 20x10cm', 'update', 'descanso-para-secagem', '20 × 10 cm', null, null, 600, 600, null, 200, 100, 6, false, null),
  (60, 'Descansos de 20x20cm', 'update', 'descanso-para-secagem', '20 × 20 cm', null, null, 1100, 1200, null, 200, 200, 6, false, null),
  (61, 'Descansos de 25x25cm', 'update', 'descanso-para-secagem', '25 × 25 cm', null, null, 1700, 1800, null, 250, 250, 6, false, null),
  (62, 'Descansos de 30x15cm', 'update', 'descanso-para-secagem', '30 × 15 cm', null, null, 1300, 1400, null, 300, 150, 6, false, null),
  (63, 'Descansos de 30x30cm', 'update', 'descanso-para-secagem', '30 × 30 cm', null, null, 2400, 2600, 450, 300, 300, 6, false, null),
  (64, 'Descansos de 35x35cm', 'update', 'descanso-para-secagem', '35 × 35 cm', null, null, 3200, 3500, null, 350, 350, 6, false, null),
  (65, 'Descansos de 40x20cm', 'update', 'descanso-para-secagem', '40 × 20 cm', null, null, 2200, 2400, null, 400, 200, 6, false, null),
  (66, 'Descansos de 40x40cm', 'update', 'descanso-para-secagem', '40 × 40 cm', null, null, 4000, 4300, null, 400, 400, 6, false, null),
  (67, 'Disco G + 1 miolo', 'update', 'disco-com-miolo-removivel-para-torno', '1 disco + 1 miolo', null, null, 5500, 5900, 390, 320, 320, 6, false, null),
  (68, 'Disco G + 5 miolos', 'update', 'disco-com-miolo-removivel-para-torno', '1 disco + 5 miolos', null, null, 14000, 15100, 1140, 320, 320, 6, false, null),
  (69, 'Disco G + 10 miolos', 'update', 'disco-com-miolo-removivel-para-torno', '1 disco + 10 miolos', null, null, 25000, 27000, 2100, 320, 320, 6, false, null),
  (70, 'Disco G + 15 miolos', 'update', 'disco-com-miolo-removivel-para-torno', '1 disco + 15 miolos', null, null, 34000, 36700, 3050, 320, 320, 6, false, null),
  (71, 'Disco G inteiro 1', 'update', 'disco-para-torno-inteirico', '1 unidade', null, null, 3500, 3800, 360, 310, 310, 6, false, null),
  (72, 'Disco G inteiro 3', 'update', 'disco-para-torno-inteirico', '3 unidades', null, null, 10000, 10800, 1080, 310, 310, 6, false, null),
  (73, 'Disco G inteiro 5', 'update', 'disco-para-torno-inteirico', '5 unidades', null, null, 16000, 17300, 1800, 310, 310, 6, false, null),
  (74, 'Disco G inteiro 10', 'update', 'disco-para-torno-inteirico', '10 unidades', null, null, 31000, 33500, 3600, 310, 310, 6, false, null),
  (75, 'Disco P + 1 miolo', 'ask', null, null, null, null, 4950, 5300, null, 250, 250, 6, false, 'Discos de 25 cm (P): criar como variantes do disco existente ou produto novo?'),
  (76, 'Disco P + 5 miolos', 'ask', null, null, null, null, 12600, 13600, null, 250, 250, 6, false, 'Discos de 25 cm (P): criar como variantes do disco existente ou produto novo?'),
  (77, 'Disco P + 10 miolos', 'ask', null, null, null, null, 22500, 24300, null, 250, 250, 6, false, 'Discos de 25 cm (P): criar como variantes do disco existente ou produto novo?'),
  (78, 'Disco P + 15 miolos', 'ask', null, null, null, null, 30600, 33000, null, 250, 250, 6, false, 'Discos de 25 cm (P): criar como variantes do disco existente ou produto novo?'),
  (79, 'Disco P inteiro 1', 'ask', null, null, null, null, 3150, 3400, null, 250, 250, 6, false, 'Discos de 25 cm (P): criar como variantes do disco existente ou produto novo?'),
  (80, 'Disco P inteiro 3', 'ask', null, null, null, null, 9000, 9700, null, 250, 250, 6, false, 'Discos de 25 cm (P): criar como variantes do disco existente ou produto novo?'),
  (81, 'Disco P inteiro 5', 'ask', null, null, null, null, 14400, 15600, null, 250, 250, 6, false, 'Discos de 25 cm (P): criar como variantes do disco existente ou produto novo?'),
  (82, 'Disco P inteiro 10', 'ask', null, null, null, null, 27900, 30100, null, 250, 250, 6, false, 'Discos de 25 cm (P): criar como variantes do disco existente ou produto novo?'),
  (83, 'Disco Saturno 1', 'ask', null, null, null, null, 3000, 3200, 180, 200, 200, 6, false, 'Disco Saturno (20 cm): produto novo? Em qual categoria?'),
  (84, 'Disco Saturno 3', 'ask', null, null, null, null, 8500, 9200, 530, 200, 200, 6, false, 'Disco Saturno (20 cm): produto novo? Em qual categoria?'),
  (85, 'Disco Saturno 5', 'ask', null, null, null, null, 13600, 14700, 900, 200, 200, 6, false, 'Disco Saturno (20 cm): produto novo? Em qual categoria?'),
  (86, 'Disco Saturno 10', 'ask', null, null, null, null, 26400, 28500, 1800, 200, 200, 6, false, 'Disco Saturno (20 cm): produto novo? Em qual categoria?'),
  (87, 'Estrela - conjunto', 'update', 'estrelas', 'Conjunto', null, null, 14900, 16100, 1250, 310, 300, 54, true, null),
  (88, 'Estrela G', 'update', 'estrelas', 'G', null, null, 6000, 6500, 580, 310, 300, 18, true, null),
  (89, 'Estrela M', 'update', 'estrelas', 'M', null, null, 5500, 5900, 410, 260, 250, 18, true, null),
  (90, 'Estrela P', 'update', 'estrelas', 'P', null, null, 5000, 5400, 260, 200, 200, 18, true, null),
  (91, 'Forma de Pão Inglês - conjunto', 'new_product', 'forma-de-pao-ingles', 'Conjunto', 'Forma de Pão Inglês', 'especiais', 36000, 38900, 2460, 280, 110, 216, true, null),
  (92, 'Forma de Pão Inglês G', 'new_product', 'forma-de-pao-ingles', 'G', 'Forma de Pão Inglês', 'especiais', 15000, 16200, 1100, 280, 110, 72, true, null),
  (93, 'Forma de Pão Inglês M', 'new_product', 'forma-de-pao-ingles', 'M', 'Forma de Pão Inglês', 'especiais', 13000, 14000, 800, 230, 100, 72, true, null),
  (94, 'Forma de Pão Inglês P', 'new_product', 'forma-de-pao-ingles', 'P', 'Forma de Pão Inglês', 'especiais', 11000, 11900, 560, 180, 90, 72, true, null),
  (95, 'Frutas - Conjunto', 'update', 'todas-as-frutas', 'Conjunto', null, null, 23800, 25700, 1460, 250, 205, 90, true, null),
  (96, 'Frutas Banana', 'update', 'banana', 'Único', null, null, 5500, 5900, 200, 250, 100, 18, true, null),
  (97, 'Frutas Limão Siciliano', 'update', 'limao-siciliano', 'Único', null, null, 5500, 5900, 380, 250, 190, 18, true, null),
  (98, 'Frutas Maçã', 'update', 'maca', 'Único', null, null, 5500, 5900, 480, 250, 205, 18, true, null),
  (99, 'Frutas Melancia', 'update', 'melancia', 'Único', null, null, 5500, 5900, null, 250, 150, 18, false, null),
  (100, 'Frutas Pêra', 'update', 'pera', 'Único', null, null, 5500, 5900, 400, 245, 200, 18, true, null),
  (101, 'Gatinho - Conjunto', 'update', 'gatinhos', 'Conjunto', null, null, 10800, 11700, 570, 230, 190, 36, true, null),
  (102, 'Gatinho G', 'update', 'gatinhos', 'G', null, null, 6000, 6500, 310, 230, 190, 18, true, null),
  (103, 'Gatinho P', 'update', 'gatinhos', 'P', null, null, 5500, 5900, 260, 180, 160, 18, true, null),
  (104, 'Itaobim - conjunto', 'update', 'conjunto-itaobim', 'Conjunto', null, null, 14900, 16100, 1050, 300, 180, 54, true, null),
  (105, 'Itaobim G', 'update', 'conjunto-itaobim', 'G', null, null, 6000, 6500, 480, 300, 180, 18, true, null),
  (106, 'Itaobim M', 'update', 'conjunto-itaobim', 'M', null, null, 5500, 5900, 340, 265, 145, 18, true, null),
  (107, 'Itaobim P', 'update', 'conjunto-itaobim', 'P', null, null, 5000, 5400, 230, 230, 115, 18, true, null),
  (108, 'Itinga - conjunto', 'update', 'conjunto-itinga', 'Conjunto', null, null, 14900, 16100, 1560, 310, 270, 54, true, null),
  (109, 'Itinga G', 'update', 'conjunto-itinga', 'G', null, null, 6000, 6500, 810, 310, 270, 18, true, null),
  (110, 'Itinga M', 'update', 'conjunto-itinga', 'M', null, null, 5500, 5900, 470, 245, 200, 18, true, null),
  (111, 'Itinga P', 'update', 'conjunto-itinga', 'P', null, null, 5000, 5400, 280, 190, 160, 18, true, null),
  (112, 'Joaíma - conjunto', 'update', 'conjunto-joaima', 'Conjunto', null, null, 14900, 16100, 880, 300, 200, 54, true, null),
  (113, 'Joaíma G', 'update', 'conjunto-joaima', 'G', null, null, 6000, 6500, 450, 300, 200, 18, true, null),
  (114, 'Joaíma M', 'update', 'conjunto-joaima', 'M', null, null, 5500, 5900, 270, 230, 160, 18, true, null),
  (115, 'Joaíma P', 'update', 'conjunto-joaima', 'P', null, null, 5000, 5400, 160, 180, 120, 18, true, null),
  (116, 'Minas Novas - conjunto', 'update', 'conjunto-minas-novas', 'Conjunto', null, null, 14900, 16100, 1150, 350, 185, 54, true, null),
  (117, 'Minas Novas G', 'update', 'conjunto-minas-novas', 'G', null, null, 6000, 6500, 560, 350, 185, 18, true, null),
  (118, 'Minas Novas M', 'update', 'conjunto-minas-novas', 'M', null, null, 5500, 5900, 370, 290, 150, 18, true, null),
  (119, 'Minas Novas P', 'update', 'conjunto-minas-novas', 'P', null, null, 5000, 5400, 220, 220, 120, 18, true, null),
  (120, 'Nuvem A', 'update', 'nuvens', 'Nuvem A', null, null, 5500, 5900, 280, 225, 160, 18, true, null),
  (121, 'Nuvem B', 'update', 'nuvens', 'Nuvem B', null, null, 5500, 5900, 270, 260, 145, 18, true, null),
  (122, 'Oval - conjunto', 'new_product', 'ovais', 'Conjunto', 'Ovais', 'moldes-geometricos', 14900, 16100, 1220, 300, 185, 54, true, null),
  (123, 'Oval G', 'new_product', 'ovais', 'G', 'Ovais', 'moldes-geometricos', 6000, 6500, 560, 300, 185, 18, true, null),
  (124, 'Oval M', 'new_product', 'ovais', 'M', 'Ovais', 'moldes-geometricos', 5500, 5900, 400, 250, 160, 18, true, null),
  (125, 'Oval P', 'new_product', 'ovais', 'P', 'Ovais', 'moldes-geometricos', 5000, 5400, 260, 210, 130, 18, true, null),
  (126, 'Ovo - conjunto', 'update', 'ovos', 'Conjunto', null, null, 14900, 16100, 950, 260, 190, 54, true, null),
  (127, 'Ovo Frito com Gema', 'update', 'ovo-frito-com-gema', 'Único', null, null, 7500, 8100, null, null, null, null, false, null),
  (128, 'Ovo G', 'update', 'ovos', 'G', null, null, 6000, 6500, 440, 260, 190, 18, true, null),
  (129, 'Ovo M', 'update', 'ovos', 'M', null, null, 5500, 5900, 310, 220, 160, 18, true, null),
  (130, 'Ovo P', 'update', 'ovos', 'P', null, null, 5000, 5400, 200, 180, 130, 18, true, null),
  (131, 'Padre Paraíso - conjunto', 'update', 'conjunto-padre-paraiso', 'Conjunto', null, null, 23800, 25700, 2140, 310, 310, 90, true, null),
  (132, 'Padre Paraíso G', 'update', 'conjunto-padre-paraiso', 'G', null, null, 6000, 6500, 590, 260, 260, 18, true, null),
  (133, 'Padre Paraíso GG', 'update', 'conjunto-padre-paraiso', 'GG', null, null, 6500, 7000, 900, 310, 310, 18, true, null),
  (134, 'Padre Paraíso M', 'update', 'conjunto-padre-paraiso', 'M', null, null, 5500, 5900, 350, 200, 200, 18, true, null),
  (135, 'Padre Paraíso P', 'update', 'conjunto-padre-paraiso', 'P', null, null, 5000, 5400, 200, 160, 160, 18, true, null),
  (136, 'Padre Paraíso PP', 'update', 'conjunto-padre-paraiso', 'PP', null, null, 4500, 4900, 100, 110, 110, 18, true, null),
  (137, 'Pão de Forma - conjunto', 'update', 'paes-de-forma', 'Conjunto', null, null, 10800, 11700, 800, 225, 215, 36, true, null),
  (138, 'Pão de Forma G', 'update', 'paes-de-forma', 'G', null, null, 6000, 6500, 500, 225, 215, 18, true, null),
  (139, 'Pão de Forma P', 'update', 'paes-de-forma', 'P', null, null, 5500, 5900, 300, 175, 160, 18, true, null),
  (140, 'Pasmado - conjunto', 'update', 'conjunto-pasmado', 'Conjunto', null, null, 23800, 25700, 1490, 310, 225, 90, true, null),
  (141, 'Pasmado G', 'update', 'conjunto-pasmado', 'G', null, null, 6000, 6500, 390, 270, 170, 18, true, null),
  (142, 'Pasmado GG', 'update', 'conjunto-pasmado', 'GG', null, null, 6500, 7000, 600, 310, 225, 18, true, null),
  (143, 'Pasmado M', 'update', 'conjunto-pasmado', 'M', null, null, 5500, 5900, 240, 220, 135, 18, true, null),
  (144, 'Pasmado P', 'update', 'conjunto-pasmado', 'P', null, null, 5000, 5400, 160, 180, 115, 18, true, null),
  (145, 'Pasmado PP', 'update', 'conjunto-pasmado', 'PP', null, null, 4500, 4900, 100, 135, 95, 18, true, null),
  (146, 'Pata de Pet', 'new_product', 'pata-de-pet', 'Único', 'Pata de Pet', 'moldes-ludicos', 7500, 8100, null, null, null, null, false, null),
  (147, 'Personalizado', 'ask', null, null, null, null, null, null, null, null, null, null, false, 'Ignorado (é o funil do molde personalizado, não tem preço).'),
  (148, 'Pizza', 'update', 'pizza', 'Único', null, null, 5500, 5900, 300, 230, 190, 18, true, null),
  (149, 'Prato de Risoto', 'update', 'prato-de-risoto', 'Único', null, null, 15000, 16200, 1100, 310, 310, 72, true, null),
  (150, 'Prato de Risoto - conjunto', 'ask', null, null, null, null, 27000, 29200, null, null, null, null, true, 'Produto novo sem medidas nem peso (zeros na planilha). Conjunto de Prato de Risoto + Mini?'),
  (151, 'Prato de Risoto Mini', 'update', 'risotinho', 'Único', null, null, 13000, 14000, 420, 200, 200, 54, true, null),
  (152, 'Quadrado - conjunto', 'update', 'quadrados', 'Conjunto', null, null, 23800, 25700, 4400, 380, 380, 90, true, null),
  (153, 'Quadrado G', 'update', 'quadrados', 'G', null, null, 6000, 6500, 1180, 320, 320, 18, true, null),
  (154, 'Quadrado GG', 'update', 'quadrados', 'GG', null, null, 6500, 7000, 1770, 380, 380, 18, true, null),
  (155, 'Quadrado M', 'update', 'quadrados', 'M', null, null, 5500, 5900, 800, 260, 260, 18, true, null),
  (156, 'Quadrado P', 'update', 'quadrados', 'P', null, null, 5000, 5400, 450, 200, 200, 18, true, null),
  (157, 'Quadrado PP', 'update', 'quadrados', 'PP', null, null, 4500, 4900, 200, 140, 140, 18, true, null),
  (158, 'Régua Niveladora 3 mm', 'update', 'regua-niveladora-3-mm-par', 'Único', null, null, 2500, 2700, 90, 400, 40, 3, true, null),
  (159, 'Régua Niveladora 6 mm', 'update', 'regua-niveladora-6-mm-par', 'Único', null, null, 2500, 2700, 160, 400, 40, 6, true, null),
  (160, 'Régua Niveladora 9 mm', 'update', 'regua-niveladora-9-mm-par', 'Único', null, null, 2500, 2700, 230, 400, 40, 9, true, null),
  (161, 'Réguas Niveladoras - conjunto', 'new_product', 'reguas-niveladoras-conjunto', 'Conjunto', 'Réguas Niveladoras (conjunto)', 'ferramentas', 5500, 5900, 480, 400, 40, 36, true, null),
  (162, 'Retângulo - conjunto', 'update', 'retangulos', 'Conjunto', null, null, 23800, 25700, null, 380, 130, 90, true, null),
  (163, 'Retângulo G', 'update', 'retangulos', 'G', null, null, 6000, 6500, null, 320, 110, 18, true, null),
  (164, 'Retângulo GG', 'update', 'retangulos', 'GG', null, null, 6500, 7000, null, 380, 130, 18, false, null),
  (165, 'Retângulo M', 'update', 'retangulos', 'M', null, null, 5500, 5900, null, 260, 90, 18, true, null),
  (166, 'Retângulo P', 'update', 'retangulos', 'P', null, null, 5000, 5400, null, 200, 70, 18, true, null),
  (167, 'Retângulo PP', 'update', 'retangulos', 'PP', null, null, 4500, 4900, null, 140, 50, 18, true, null),
  (168, 'Sushi Redondo - conjunto', 'update', 'conjunto-sushi-arredondado', 'Conjunto', null, null, 14900, 16100, 660, 330, 130, 36, true, null),
  (169, 'Sushi Redondo G', 'update', 'conjunto-sushi-arredondado', 'G', null, null, 6000, 6500, 420, 330, 130, 18, true, null),
  (170, 'Sushi Redondo M', 'update', 'conjunto-sushi-arredondado', 'M', null, null, 5500, 5900, 180, 200, 100, 18, true, null),
  (171, 'Sushi Redondo P', 'update', 'conjunto-sushi-arredondado', 'P', null, null, 5000, 5400, 60, 80, 80, 18, true, null),
  (172, 'Sushi Reto - conjunto', 'update', 'conjunto-sushi-reto', 'Conjunto', null, null, 14900, 16100, 780, 330, 130, 36, true, null),
  (173, 'Sushi Reto G', 'update', 'conjunto-sushi-reto', 'G', null, null, 6000, 6500, 500, 330, 130, 18, true, null),
  (174, 'Sushi Reto M', 'update', 'conjunto-sushi-reto', 'M', null, null, 5500, 5900, 220, 200, 100, 18, true, null),
  (175, 'Sushi Reto P', 'update', 'conjunto-sushi-reto', 'P', null, null, 5000, 5400, 60, 80, 80, 18, true, null),
  (176, 'Taiobeiras - conjunto', 'update', 'conjunto-taiobeiras', 'Conjunto', null, null, 14900, 16100, 1090, 310, 190, 54, true, null),
  (177, 'Taiobeiras G', 'update', 'conjunto-taiobeiras', 'G', null, null, 6000, 6500, 560, 310, 190, 18, true, null),
  (178, 'Taiobeiras M', 'update', 'conjunto-taiobeiras', 'M', null, null, 5500, 5900, 350, 240, 150, 18, true, null),
  (179, 'Taiobeiras P', 'update', 'conjunto-taiobeiras', 'P', null, null, 5000, 5400, 180, 175, 110, 18, true, null),
  (180, 'Turmalina - conjunto', 'update', 'conjunto-turmalina', 'Conjunto', null, null, 14900, 16100, 1210, 280, 265, 54, true, null),
  (181, 'Turmalina G', 'update', 'conjunto-turmalina', 'G', null, null, 6000, 6500, 710, 280, 265, 18, true, null),
  (182, 'Turmalina M', 'update', 'conjunto-turmalina', 'M', null, null, 5500, 5900, 330, 190, 190, 18, true, null),
  (183, 'Turmalina P', 'update', 'conjunto-turmalina', 'P', null, null, 5000, 5400, 170, 155, 145, 18, true, null),
  (184, 'Ursinho - conjunto', 'update', 'ursinhos', 'Conjunto', null, null, 10800, 11700, 680, 230, 195, 36, true, null),
  (185, 'Ursinho G', 'update', 'ursinhos', 'G', null, null, 6000, 6500, 430, 230, 195, 18, true, null),
  (186, 'Ursinho P', 'update', 'ursinhos', 'P', null, null, 5500, 5900, 250, 180, 155, 18, true, null);

create temp table casou (variant_id uuid, linha int);

-- 1. Atualiza variantes existentes --------------------------------------------
-- Preço só muda quando os dois valores vieram e o Pix não passa do cartão.
update public.product_variant pv
     set price_pix_cents  = case when p.obs is null and p.pix is not null and p.cartao is not null
                                 then p.pix else pv.price_pix_cents end,
         price_card_cents = case when p.obs is null and p.pix is not null and p.cartao is not null
                                 then p.cartao else pv.price_card_cents end,
         weight_grams     = coalesce(p.peso, pv.weight_grams),
         length_mm        = coalesce(p.comp, pv.length_mm),
         width_mm         = coalesce(p.larg, pv.width_mm),
         height_mm        = coalesce(p.alt,  pv.height_mm)
    from public.product pr, planilha p
   where pr.id = pv.product_id
     and pr.slug = p.slug
     and pv.label = p.rotulo
     and p.tipo = 'update';

-- 2. Variantes novas em produtos existentes -----------------------------------
insert into public.product_variant
    (product_id, label, price_pix_cents, price_card_cents, weight_grams,
     length_mm, width_mm, height_mm, is_default, sort_order)
  select pr.id, p.rotulo, p.pix, p.cartao, p.peso, p.comp, p.larg, p.alt, false,
         (select coalesce(max(v.sort_order), 0) from public.product_variant v where v.product_id = pr.id)
           + row_number() over (partition by pr.id order by p.linha)
    from planilha p
    join public.product pr on pr.slug = p.slug
   where p.tipo = 'new_variant'
     and p.pix is not null and p.cartao is not null and p.pix <= p.cartao
     and not exists (select 1 from public.product_variant v
                      where v.product_id = pr.id and v.label = p.rotulo);

-- 3. Produtos novos como rascunho ---------------------------------------------
insert into public.product (category_id, name, slug, status, material_care)
select distinct on (p.slug)
       c.id, p.produto, p.slug, 'draft',
       'Feito à mão. Mantenha em local seco; limpe com pano levemente úmido, sem imergir em água.'
  from planilha p
  join public.category c on c.slug = p.categoria
 where p.tipo = 'new_product'
   and not exists (select 1 from public.product x where x.slug = p.slug)
 order by p.slug, p.linha;

insert into public.product_variant
    (product_id, label, price_pix_cents, price_card_cents, weight_grams,
     length_mm, width_mm, height_mm, is_default, sort_order)
  select pr.id, p.rotulo, p.pix, p.cartao, p.peso, p.comp, p.larg, p.alt,
         -- primeira linha do produto vira a pré-selecionada, se ainda não houver uma
         row_number() over (partition by pr.id order by p.linha) = 1
           and not exists (select 1 from public.product_variant d
                            where d.product_id = pr.id and d.is_default),
         row_number() over (partition by pr.id order by p.linha) - 1
    from planilha p
    join public.product pr on pr.slug = p.slug
   where p.tipo = 'new_product'
     and p.pix is not null and p.cartao is not null and p.pix <= p.cartao
     and not exists (select 1 from public.product_variant v
                      where v.product_id = pr.id and v.label = p.rotulo);

-- Liga cada linha da planilha à variante do banco (base do relatório). Feito
-- no fim, e não a partir do que cada passo gravou, para o relatório sair
-- igual se o script for rodado de novo.
insert into casou
select v.id, p.linha
  from planilha p
  join public.product pr on pr.slug = p.slug
  join public.product_variant v on v.product_id = pr.id and v.label = p.rotulo
 where p.tipo <> 'ask';

commit;

-- 4. Relatório (é o resultado que aparece no SQL Editor) ----------------------
select ordem, situacao, item, detalhe
  from (
    select 1 as ordem, 'NÃO ENCONTRADO NO BANCO' as situacao, p.nome as item,
           'Procurei ' || p.slug || ' / ' || p.rotulo || '. Nada foi alterado para esta linha.' as detalhe
      from planilha p
     where p.tipo in ('update', 'new_variant', 'new_product')
       and not exists (select 1 from casou c where c.linha = p.linha)
    union all
    select 2, 'CONFIRMAR COM O JANE', p.nome, p.obs
      from planilha p
     where p.tipo = 'ask' or p.obs is not null
    union all
    select 3, 'NO BANCO, FORA DA PLANILHA', pr.name || ' — ' || v.label,
           'Não estava na planilha. Preços e medidas não mudaram (Pix = cartão).'
      from public.product_variant v
      join public.product pr on pr.id = v.product_id
     where pr.status <> 'archived'
       and not exists (select 1 from casou c where c.variant_id = v.id)
    union all
    select 4, 'RASCUNHO CRIADO', pr.name, 'Revisar descrição, categoria e fotos e publicar no admin.'
      from public.product pr
     where pr.slug in (select slug from planilha where tipo = 'new_product')
       and pr.status = 'draft'
    union all
    select 5, 'SEM PESO', pr.name || ' — ' || v.label, 'Sem peso o frete usa um valor padrão.'
      from casou c
      join public.product_variant v on v.id = c.variant_id
      join public.product pr on pr.id = v.product_id
     where v.weight_grams is null
    union all
    select 6, 'SEM FOTO (segundo o Jane)', p.nome, 'Sem "ok" na coluna de foto da planilha.'
      from planilha p
     where not p.tem_foto and p.tipo <> 'ask'
  ) r
 order by ordem, item;
