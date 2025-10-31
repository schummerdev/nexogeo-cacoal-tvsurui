-- api/migrations/update_ganhadores_cancelamento.sql
-- Adicionar campos para cancelamento de ganhadores

-- Verificar se a tabela ganhadores existe e adicionar colunas se necessário
ALTER TABLE ganhadores 
ADD COLUMN IF NOT EXISTS cancelado_em TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS motivo_cancelamento TEXT,
ADD COLUMN IF NOT EXISTS cancelado_por INTEGER REFERENCES usuarios_admin(id) ON DELETE SET NULL;

-- Comentários para documentação
COMMENT ON COLUMN ganhadores.cancelado_em IS 'Data e hora em que o ganhador foi cancelado';
COMMENT ON COLUMN ganhadores.motivo_cancelamento IS 'Motivo do cancelamento do ganhador';
COMMENT ON COLUMN ganhadores.cancelado_por IS 'ID do usuário admin que cancelou o ganhador';

-- Criar índice para consultas por ganhadores cancelados
CREATE INDEX IF NOT EXISTS idx_ganhadores_cancelado_em ON ganhadores(cancelado_em);
CREATE INDEX IF NOT EXISTS idx_ganhadores_cancelado_por ON ganhadores(cancelado_por);

-- Atualizar trigger de auditoria para incluir campos de cancelamento
-- (O trigger audit_trigger já está configurado para capturar todas as mudanças)

-- Inserir log inicial
INSERT INTO system_logs (level, component, message, additional_data)
VALUES ('INFO', 'database', 'Campos de cancelamento adicionados à tabela ganhadores', 
        jsonb_build_object('version', '1.1', 'migration', 'update_ganhadores_cancelamento'));