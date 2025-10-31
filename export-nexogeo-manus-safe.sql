-- ========================================
-- SCRIPT DE EXPORTAÇÃO SEGURO: nexogeo_manus → neondb
-- Versão com tratamento defensivo de tipos de dados
-- Data: 2025-10-18
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
  'EXPORTANDO DADOS (MODO SEGURO)' as status,
  (SELECT COUNT(*) FROM usuarios) as total_usuarios,
  (SELECT COUNT(*) FROM promocoes) as total_promocoes,
  (SELECT COUNT(*) FROM participantes) as total_participantes;

-- ========================================
-- USUÁRIOS (usuarios)
-- Mapping: senha → senha_hash, criado_em → created_at
-- ========================================

SELECT '-- Exportando ' || COUNT(*) || ' usuários' FROM usuarios;
SELECT 'TRUNCATE TABLE usuarios RESTART IDENTITY CASCADE;';

SELECT
  'INSERT INTO usuarios (id, usuario, senha_hash, papel, ativo, created_at) VALUES (' ||
  id || ', ' ||
  '''' || REPLACE(COALESCE(usuario, 'user'), '''', '''''') || ''', ' ||
  '''' || REPLACE(COALESCE(senha, ''), '''', '''''') || ''', ' ||
  '''' || REPLACE(COALESCE(papel, 'user'), '''', '''''') || ''', ' ||
  CASE WHEN COALESCE(ativo, true) THEN 'true' ELSE 'false' END || ', ' ||
  CASE
    WHEN criado_em IS NULL THEN '''2025-01-01 00:00:00'''
    WHEN pg_typeof(criado_em)::text LIKE '%timestamp%' THEN '''' || TO_CHAR(criado_em, 'YYYY-MM-DD HH24:MI:SS') || ''''
    ELSE '''2025-01-01 00:00:00'''
  END ||
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
  COALESCE(id, 1) || ', ' ||
  COALESCE('''' || REPLACE(nome_emissora, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(slogan, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(telefone, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(email, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(endereco, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(cidade, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(estado, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(logo_url, '''', '''''') || '''', 'NULL') || ', ' ||
  CASE
    WHEN criado_em IS NULL THEN '''2025-01-01 00:00:00'''
    WHEN pg_typeof(criado_em)::text LIKE '%timestamp%' THEN '''' || TO_CHAR(criado_em, 'YYYY-MM-DD HH24:MI:SS') || ''''
    ELSE '''2025-01-01 00:00:00'''
  END || ', ' ||
  CASE
    WHEN atualizado_em IS NULL THEN '''2025-01-01 00:00:00'''
    WHEN pg_typeof(atualizado_em)::text LIKE '%timestamp%' THEN '''' || TO_CHAR(atualizado_em, 'YYYY-MM-DD HH24:MI:SS') || ''''
    ELSE '''2025-01-01 00:00:00'''
  END ||
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
  '''' || REPLACE(COALESCE(titulo, 'Promoção'), '''', '''''') || ''', ' ||
  COALESCE('''' || REPLACE(descricao, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(regulamento, '''', '''''') || '''', 'NULL') || ', ' ||
  CASE
    WHEN data_inicio IS NULL THEN 'NULL'
    WHEN pg_typeof(data_inicio)::text LIKE '%date%' OR pg_typeof(data_inicio)::text LIKE '%timestamp%'
      THEN '''' || TO_CHAR(data_inicio, 'YYYY-MM-DD') || ''''
    ELSE 'NULL'
  END || ', ' ||
  CASE
    WHEN data_fim IS NULL THEN 'NULL'
    WHEN pg_typeof(data_fim)::text LIKE '%date%' OR pg_typeof(data_fim)::text LIKE '%timestamp%'
      THEN '''' || TO_CHAR(data_fim, 'YYYY-MM-DD') || ''''
    ELSE 'NULL'
  END || ', ' ||
  CASE WHEN COALESCE(ativa, false) THEN 'true' ELSE 'false' END || ', ' ||
  COALESCE('''' || REPLACE(tipo_sorteio, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(premios, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(patrocinador, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(imagem_url, '''', '''''') || '''', 'NULL') || ', ' ||
  CASE
    WHEN criado_em IS NULL THEN '''2025-01-01 00:00:00'''
    WHEN pg_typeof(criado_em)::text LIKE '%timestamp%' THEN '''' || TO_CHAR(criado_em, 'YYYY-MM-DD HH24:MI:SS') || ''''
    ELSE '''2025-01-01 00:00:00'''
  END ||
  ');'
FROM promocoes
ORDER BY id;

-- ========================================
-- PARTICIPANTES
-- Mapping: participou_em → data_cadastro
-- TRATAMENTO DEFENSIVO DE DATAS E TIPOS
-- ========================================

SELECT '-- Exportando ' || COUNT(*) || ' participantes' FROM participantes;
SELECT 'TRUNCATE TABLE participantes RESTART IDENTITY CASCADE;';

SELECT
  'INSERT INTO participantes (id, nome, telefone, email, cpf, cidade, bairro, promocao_id, origem, utm_source, utm_medium, utm_campaign, data_cadastro, latitude, longitude, aceita_termos) VALUES (' ||
  id || ', ' ||
  '''' || REPLACE(COALESCE(nome, 'Participante'), '''', '''''') || ''', ' ||
  '''' || REPLACE(COALESCE(telefone, '00000000000'), '''', '''''') || ''', ' ||
  COALESCE('''' || REPLACE(email, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(cpf, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(cidade, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(bairro, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE(promocao_id, 1) || ', ' ||
  COALESCE('''' || REPLACE(origem, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(utm_source, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(utm_medium, '''', '''''') || '''', 'NULL') || ', ' ||
  COALESCE('''' || REPLACE(utm_campaign, '''', '''''') || '''', 'NULL') || ', ' ||
  CASE
    WHEN participou_em IS NULL THEN '''2025-01-01 00:00:00'''
    WHEN pg_typeof(participou_em)::text LIKE '%timestamp%' THEN '''' || TO_CHAR(participou_em, 'YYYY-MM-DD HH24:MI:SS') || ''''
    WHEN pg_typeof(participou_em)::text LIKE '%date%' THEN '''' || TO_CHAR(participou_em, 'YYYY-MM-DD') || ' 00:00:00'''
    ELSE '''2025-01-01 00:00:00'''
  END || ', ' ||
  COALESCE(ROUND(latitude::numeric, 6)::text, 'NULL') || ', ' ||
  COALESCE(ROUND(longitude::numeric, 6)::text, 'NULL') || ', ' ||
  CASE WHEN COALESCE(aceita_termos, true) THEN 'true' ELSE 'false' END ||
  ');'
FROM participantes
ORDER BY id;

-- ========================================
-- RESUMO FINAL
-- ========================================
SELECT
  '-- ======================================' as resultado
UNION ALL
SELECT '-- EXPORTAÇÃO CONCLUÍDA (MODO SEGURO)'
UNION ALL
SELECT '-- Total de registros:'
UNION ALL
SELECT '--   Usuários: ' || COUNT(*) FROM usuarios
UNION ALL
SELECT '--   Promoções: ' || COUNT(*) FROM promocoes
UNION ALL
SELECT '--   Participantes: ' || COUNT(*) FROM participantes
UNION ALL
SELECT '-- ======================================'
UNION ALL
SELECT '-- ⚠️  IMPORTANTE: Verifique os dados antes de confirmar a importação!'
UNION ALL
SELECT '-- Execute: node verify-migration.js após importar';
