-- ========================================
-- MIGRAÇÃO: Adicionar coluna cancelado à tabela ganhadores
-- Data: 02/Nov/2025
-- Prioridade: CRÍTICA
-- ========================================
-- Problema: Endpoints de sorteio falhavam porque g.cancelado não existia
-- Solução: Adicionar coluna cancelado BOOLEAN com default false
-- Contexto: A tabela ganhadores precisa dessa coluna para queries funcionar

-- 1️⃣ Adicionar coluna cancelado à tabela ganhadores
ALTER TABLE ganhadores ADD COLUMN IF NOT EXISTS cancelado BOOLEAN DEFAULT false;

-- 2️⃣ Criar índice para performance (filtros por cancelado)
CREATE INDEX IF NOT EXISTS idx_ganhadores_cancelado ON ganhadores(cancelado);

-- 3️⃣ Adicionar comentário para documentação
COMMENT ON COLUMN ganhadores.cancelado IS 'Boolean: true se o ganhador foi cancelado, false se ativo. Mantido para compatibilidade com soft delete.';

-- Note:
-- - Essa coluna trabalha em conjunto com deleted_at (soft delete)
-- - cancelado = false significa registro ativo
-- - As queries utilizam "WHERE g.cancelado = false" para filtrar ganhadores ativos
-- - Ver também: deleted_at, deleted_by (colunas de soft delete)
