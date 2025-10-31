-- Migration: Normalizar formatação de telefones na tabela public_participants
-- Data: 2025-10-04
-- Objetivo: Remover formatação de telefones, mantendo apenas dígitos

-- Mostrar registros que serão alterados
SELECT
    id,
    name,
    phone AS phone_antes,
    REGEXP_REPLACE(phone, '[^0-9]', '', 'g') AS phone_depois,
    LENGTH(phone) AS tamanho_antes,
    LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) AS tamanho_depois
FROM public_participants
WHERE phone ~ '[^0-9]'
ORDER BY id;

-- Atualizar todos os registros com telefones formatados
UPDATE public_participants
SET phone = REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
WHERE phone ~ '[^0-9]';

-- Verificar se há telefones com tamanho inválido (diferente de 10 ou 11 dígitos)
SELECT
    id,
    name,
    phone,
    LENGTH(phone) AS tamanho
FROM public_participants
WHERE LENGTH(phone) NOT IN (10, 11)
ORDER BY id;

-- Resumo da migração
SELECT
    COUNT(*) AS total_registros,
    COUNT(CASE WHEN LENGTH(phone) = 10 THEN 1 END) AS telefones_10_digitos,
    COUNT(CASE WHEN LENGTH(phone) = 11 THEN 1 END) AS telefones_11_digitos,
    COUNT(CASE WHEN LENGTH(phone) NOT IN (10, 11) THEN 1 END) AS telefones_invalidos
FROM public_participants;
