-- ========================================
-- SCRIPT DE EXPORTAÇÃO PARA NEON SQL EDITOR
-- ========================================
-- Execute este script no SQL Editor do banco ORIGEM (nexogeo_manus)
-- Copie o resultado e salve como arquivo .sql
-- ========================================

-- PASSO 1: EXPORTAR USUÁRIOS
SELECT
  'INSERT INTO usuarios (usuario, senha_hash, role, created_at, updated_at) VALUES (' ||
  '''' || usuario || ''', ' ||
  '''' || senha_hash || ''', ' ||
  '''' || role || ''', ' ||
  '''' || created_at || ''', ' ||
  '''' || updated_at || ''');' as sql_command
FROM usuarios
ORDER BY id;

-- PASSO 2: EXPORTAR CONFIGURAÇÕES
SELECT
  'INSERT INTO configuracoes_emissora (nome, logo_url, tema_cor, website, telefone, endereco, instagram, facebook, youtube, linkedin, twitter, whatsapp, email, descricao, updated_at) VALUES (' ||
  COALESCE('''' || REPLACE(nome, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(logo_url, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || tema_cor || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(website, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || telefone || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(endereco, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(instagram, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(facebook, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(youtube, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(linkedin, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(twitter, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || whatsapp || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(email, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(descricao, '''', '''''') || '''', 'NULL') || ', ' ||
  '''' || updated_at || ''');' as sql_command
FROM configuracoes_emissora
LIMIT 1;

-- PASSO 3: EXPORTAR PROMOÇÕES
SELECT
  'INSERT INTO promocoes (nome, descricao, status, data_inicio, data_fim, participantes_count, created_at, updated_at) VALUES (' ||
  '''' || REPLACE(nome, '''', '''''') || ''', ' ||
  COALESCE('''' || REPLACE(descricao, '''', '''''') || '''', 'NULL') || ', ' ||
  '''' || status || ''', ' ||
  COALESCE('''' || data_inicio || '''', 'NULL') || ', ' ||
  COALESCE('''' || data_fim || '''', 'NULL') || ', ' ||
  COALESCE(participantes_count::text, '0') || ', ' ||
  '''' || created_at || ''', ' ||
  '''' || updated_at || ''');' as sql_command
FROM promocoes
ORDER BY id;

-- PASSO 4: EXPORTAR PARTICIPANTES
SELECT
  'INSERT INTO participantes (nome, email, telefone, bairro, cidade, promocao_id, data_cadastro, origem_source, origem_medium) VALUES (' ||
  '''' || REPLACE(nome, '''', '''''') || ''', ' ||
  COALESCE('''' || REPLACE(email, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || telefone || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(bairro, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(cidade, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE(promocao_id::text, 'NULL') || ', ' ||
  '''' || data_cadastro || ''', ' ||
  COALESCE('''' || REPLACE(origem_source, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(origem_medium, '''', '''''') || '''', 'NULL') || ');' as sql_command
FROM participantes
ORDER BY id;

-- PASSO 5: EXPORTAR PATROCINADORES (se existir)
SELECT
  'INSERT INTO sponsors (name, created_at) VALUES (' ||
  '''' || REPLACE(name, '''', '''''') || ''', ' ||
  '''' || created_at || ''');' as sql_command
FROM sponsors
ORDER BY id;

-- PASSO 6: EXPORTAR PRODUTOS (se existir)
SELECT
  'INSERT INTO products (sponsor_id, name, clues, created_at) VALUES (' ||
  sponsor_id || ', ' ||
  '''' || REPLACE(name, '''', '''''') || ''', ' ||
  'ARRAY[' || array_to_string(ARRAY(SELECT '''' || REPLACE(unnest(clues), '''', '''''') || ''''), ', ') || '], ' ||
  '''' || created_at || ''');' as sql_command
FROM products
ORDER BY id;

-- PASSO 7: EXPORTAR JOGOS (se existir)
SELECT
  'INSERT INTO games (product_id, status, revealed_clues_count, winner_submission_id, created_at, ended_at) VALUES (' ||
  product_id || ', ' ||
  '''' || status || ''', ' ||
  revealed_clues_count || ', ' ||
  COALESCE(winner_submission_id::text, 'NULL') || ', ' ||
  '''' || created_at || ''', ' ||
  COALESCE('''' || ended_at || '''', 'NULL') || ');' as sql_command
FROM games
ORDER BY id;

-- PASSO 8: EXPORTAR PALPITES (se existir)
SELECT
  'INSERT INTO submissions (game_id, user_name, user_phone, user_neighborhood, user_city, guess, is_correct, created_at, public_participant_id, submission_number) VALUES (' ||
  game_id || ', ' ||
  '''' || REPLACE(user_name, '''', '''''') || ''', ' ||
  '''' || user_phone || ''', ' ||
  '''' || REPLACE(user_neighborhood, '''', '''''') || ''', ' ||
  '''' || REPLACE(user_city, '''', '''''') || ''', ' ||
  '''' || REPLACE(guess, '''', '''''') || ''', ' ||
  is_correct || ', ' ||
  '''' || created_at || ''', ' ||
  COALESCE(public_participant_id::text, 'NULL') || ', ' ||
  COALESCE(submission_number::text, '1') || ');' as sql_command
FROM submissions
ORDER BY id;

-- PASSO 9: EXPORTAR PARTICIPANTES PÚBLICOS (se existir)
SELECT
  'INSERT INTO public_participants (name, phone, neighborhood, city, latitude, longitude, referral_code, referred_by_id, own_referral_code, extra_guesses, created_at) VALUES (' ||
  '''' || REPLACE(name, '''', '''''') || ''', ' ||
  '''' || phone || ''', ' ||
  '''' || REPLACE(neighborhood, '''', '''''') || ''', ' ||
  '''' || REPLACE(city, '''', '''''') || ''', ' ||
  COALESCE(latitude::text, 'NULL') || ', ' ||
  COALESCE(longitude::text, 'NULL') || ', ' ||
  COALESCE('''' || referral_code || '''', 'NULL') || ', ' ||
  COALESCE(referred_by_id::text, 'NULL') || ', ' ||
  COALESCE('''' || own_referral_code || '''', 'NULL') || ', ' ||
  COALESCE(extra_guesses::text, '0') || ', ' ||
  '''' || created_at || ''');' as sql_command
FROM public_participants
ORDER BY id;

-- ========================================
-- ESTATÍSTICAS DO BANCO
-- ========================================
SELECT
  'usuarios' as tabela,
  COUNT(*) as total_registros
FROM usuarios
UNION ALL
SELECT 'configuracoes_emissora', COUNT(*) FROM configuracoes_emissora
UNION ALL
SELECT 'promocoes', COUNT(*) FROM promocoes
UNION ALL
SELECT 'participantes', COUNT(*) FROM participantes
UNION ALL
SELECT 'sponsors', COUNT(*) FROM sponsors
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'games', COUNT(*) FROM games
UNION ALL
SELECT 'submissions', COUNT(*) FROM submissions
UNION ALL
SELECT 'public_participants', COUNT(*) FROM public_participants
ORDER BY total_registros DESC;
