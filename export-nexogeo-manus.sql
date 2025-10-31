-- ========================================
-- SCRIPT DE EXPORTAÇÃO: nexogeo_manus → neondb
-- Data: 2025-10-18
-- Mapping de schema antigo para novo
-- ========================================

-- INSTRUÇÕES:
-- 1. Conecte ao banco nexogeo_manus no Neon SQL Editor
-- 2. Execute este script completo
-- 3. Copie o resultado (INSERTs gerados)
-- 4. Execute no banco neondb (nexogeo-demo)

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

-- ========================================
-- ESTATÍSTICAS
-- ========================================
SELECT
  'EXPORTANDO DADOS' as status,
  (SELECT COUNT(*) FROM usuarios) as total_usuarios,
  (SELECT COUNT(*) FROM promocoes) as total_promocoes,
  (SELECT COUNT(*) FROM participantes) as total_participantes;

-- ========================================
-- USUÁRIOS (usuarios)
-- Mapping: senha → senha_hash
-- ========================================

SELECT '-- Exportando ' || COUNT(*) || ' usuários' FROM usuarios;
SELECT 'TRUNCATE TABLE usuarios RESTART IDENTITY CASCADE;';

SELECT
  'INSERT INTO usuarios (id, usuario, senha_hash, papel, ativo, created_at) VALUES (' ||
  id || ', ' ||
  '''' || REPLACE(usuario, '''', '''''') || ''', ' ||
  '''' || REPLACE(senha, '''', '''''') || ''', ' ||
  '''' || REPLACE(papel, '''', '''''') || ''', ' ||
  CASE WHEN ativo THEN 'true' ELSE 'false' END || ', ' ||
  '''' || TO_CHAR(criado_em, 'YYYY-MM-DD HH24:MI:SS') || ''' ' ||
  ');'
FROM usuarios
ORDER BY id;

-- ========================================
-- CONFIGURAÇÕES EMISSORA
-- ========================================

SELECT '-- Exportando configurações da emissora' as status;
SELECT 'TRUNCATE TABLE configuracoes_emissora RESTART IDENTITY CASCADE;';

SELECT
  'INSERT INTO configuracoes_emissora (id, nome_emissora, slogan, telefone, email, endereco, cidade, estado, logo_url, created_at, updated_at) VALUES (' ||
  id || ', ' ||
  COALESCE('''' || REPLACE(nome_emissora, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(slogan, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(telefone, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(email, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(endereco, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(cidade, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(estado, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(logo_url, '''', '''''') || '''', 'NULL') || ', ' ||
  '''' || TO_CHAR(COALESCE(criado_em, NOW()), 'YYYY-MM-DD HH24:MI:SS') || ''', ' ||
  '''' || TO_CHAR(COALESCE(atualizado_em, NOW()), 'YYYY-MM-DD HH24:MI:SS') || ''' ' ||
  ');'
FROM configuracoes_emissora
LIMIT 1;

-- ========================================
-- PROMOÇÕES (promocoes)
-- Mapping: criado_em → created_at
-- ========================================

SELECT '-- Exportando ' || COUNT(*) || ' promoções' FROM promocoes;
SELECT 'TRUNCATE TABLE promocoes RESTART IDENTITY CASCADE;';

SELECT
  'INSERT INTO promocoes (id, titulo, descricao, regulamento, data_inicio, data_fim, ativa, tipo_sorteio, premios, patrocinador, imagem_url, created_at) VALUES (' ||
  id || ', ' ||
  '''' || REPLACE(titulo, '''', '''''') || ''', ' ||
  COALESCE('''' || REPLACE(descricao, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(regulamento, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || TO_CHAR(data_inicio, 'YYYY-MM-DD') || '''', 'NULL') || ', ' ||
  COALESCE('''' || TO_CHAR(data_fim, 'YYYY-MM-DD') || '''', 'NULL') || ', ' ||
  CASE WHEN ativa THEN 'true' ELSE 'false' END || ', ' ||
  COALESCE('''' || REPLACE(tipo_sorteio, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(premios, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(patrocinador, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(imagem_url, '''', '''''') || '''', 'NULL') || ', ' ||
  '''' || TO_CHAR(criado_em, 'YYYY-MM-DD HH24:MI:SS') || ''' ' ||
  ');'
FROM promocoes
ORDER BY id;

-- ========================================
-- PARTICIPANTES
-- Mapping: participou_em → data_cadastro
-- ========================================

SELECT '-- Exportando ' || COUNT(*) || ' participantes' FROM participantes;
SELECT 'TRUNCATE TABLE participantes RESTART IDENTITY CASCADE;';

SELECT
  'INSERT INTO participantes (id, nome, telefone, email, cpf, cidade, bairro, promocao_id, origem, utm_source, utm_medium, utm_campaign, data_cadastro, latitude, longitude, aceita_termos) VALUES (' ||
  id || ', ' ||
  '''' || REPLACE(nome, '''', '''''') || ''', ' ||
  '''' || REPLACE(telefone, '''', '''''') || ''', ' ||
  COALESCE('''' || REPLACE(email, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(cpf, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(cidade, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(bairro, '''', '''''') || '''', 'NULL') || ', ' ||
  promocao_id || ', ' ||
  COALESCE('''' || REPLACE(origem, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(utm_source, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(utm_medium, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(utm_campaign, '''', '''''') || '''', 'NULL') || ', ' ||
  '''' || TO_CHAR(participou_em, 'YYYY-MM-DD HH24:MI:SS') || ''', ' ||
  COALESCE(latitude::text, 'NULL') || ', ' ||
  COALESCE(longitude::text, 'NULL') || ', ' ||
  CASE WHEN aceita_termos THEN 'true' ELSE 'false' END ||
  ');'
FROM participantes
ORDER BY id;

-- ========================================
-- RESUMO FINAL
-- ========================================
SELECT
  '-- ======================================' as separador
UNION ALL
SELECT '-- EXPORTAÇÃO CONCLUÍDA'
UNION ALL
SELECT '-- Total de registros:'
UNION ALL
SELECT '--   Usuários: ' || COUNT(*) FROM usuarios
UNION ALL
SELECT '--   Promoções: ' || COUNT(*) FROM promocoes
UNION ALL
SELECT '--   Participantes: ' || COUNT(*) FROM participantes;
