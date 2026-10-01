-- ============================================
-- PATCH 07 (opcional): ALIMENTOS DE REFERÊNCIA
-- ============================================
-- ATENÇÃO: lista curta de alimentos comuns, com valores APROXIMADOS por 100 g,
-- só para você poder testar o montador de dietas logo de cara.
-- NÃO use estes números para atender pacientes sem conferir. O caminho correto é importar a
-- TACO (Tabela Brasileira de Composição de Alimentos, NEPA/Unicamp) pela tela
-- /admin/alimentos > "Importar CSV" e depois apagar estes alimentos (source = 'referencia').
-- ============================================

insert into public.foods (name, source, kcal, protein_g, fat_g, carb_g, fiber_g) values
  ('Arroz, tipo 1, cozido', 'referencia', 128, 2.5, 0.2, 28.1, 1.6),
  ('Arroz, integral, cozido', 'referencia', 124, 2.6, 1.0, 25.8, 2.7),
  ('Feijão, carioca, cozido', 'referencia', 76, 4.8, 0.5, 13.6, 8.5),
  ('Feijão, preto, cozido', 'referencia', 77, 4.5, 0.5, 14.0, 8.4),
  ('Ovo, de galinha, inteiro, cozido', 'referencia', 146, 13.3, 9.5, 0.6, 0),
  ('Frango, peito, sem pele, grelhado', 'referencia', 159, 32.0, 2.5, 0, 0),
  ('Carne bovina, patinho, grelhado', 'referencia', 219, 35.9, 7.3, 0, 0),
  ('Pão, francês', 'referencia', 300, 8.0, 3.1, 58.6, 2.3),
  ('Pão, de forma, integral', 'referencia', 253, 9.4, 3.7, 49.9, 6.9),
  ('Leite, de vaca, integral', 'referencia', 61, 3.2, 3.3, 4.7, 0),
  ('Leite, de vaca, desnatado', 'referencia', 35, 3.4, 0.5, 4.9, 0),
  ('Iogurte, natural', 'referencia', 51, 4.1, 3.0, 1.9, 0),
  ('Queijo, minas, frescal', 'referencia', 264, 17.4, 20.2, 3.2, 0),
  ('Queijo, mussarela', 'referencia', 330, 22.6, 25.2, 3.0, 0),
  ('Banana, prata', 'referencia', 98, 1.3, 0.1, 26.0, 2.0),
  ('Maçã', 'referencia', 56, 0.3, 0, 15.2, 1.3),
  ('Laranja, pera', 'referencia', 37, 1.0, 0.1, 8.9, 0.8),
  ('Mamão, papaia', 'referencia', 40, 0.5, 0.1, 10.4, 1.0),
  ('Batata, inglesa, cozida', 'referencia', 52, 1.2, 0, 11.9, 1.3),
  ('Batata, doce, cozida', 'referencia', 77, 0.6, 0.1, 18.4, 2.2),
  ('Mandioca, cozida', 'referencia', 125, 0.6, 0.3, 30.1, 1.6),
  ('Macarrão, cozido', 'referencia', 102, 3.4, 0.5, 19.9, 1.2),
  ('Aveia, flocos', 'referencia', 394, 13.9, 8.5, 66.6, 9.1),
  ('Azeite, de oliva', 'referencia', 884, 0, 100, 0, 0),
  ('Alface, crespa', 'referencia', 11, 1.3, 0.2, 1.7, 1.8),
  ('Tomate', 'referencia', 15, 1.1, 0.2, 3.1, 1.2),
  ('Cenoura, cozida', 'referencia', 30, 0.8, 0.2, 6.7, 2.6),
  ('Brócolis, cozido', 'referencia', 25, 2.1, 0.5, 4.4, 3.4),
  ('Amendoim, torrado', 'referencia', 606, 22.5, 54.0, 18.7, 7.8),
  ('Açúcar, refinado', 'referencia', 387, 0.3, 0, 99.6, 0)
on conflict do nothing;
