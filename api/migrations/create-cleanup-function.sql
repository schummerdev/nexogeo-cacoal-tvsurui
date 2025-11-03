-- ========================================
-- MIGRAÇÃO: Criar função cleanup_old_rate_limits
-- Data: 03/Nov/2025
-- Prioridade: CRÍTICA
-- ========================================
-- Problema: Código tenta chamar função cleanup_old_rate_limits() que não existe no banco
-- Solução: Criar apenas a função (tabela rate_limits já existe)
-- Contexto: A função limpa automaticamente registros de rate limit antigos

-- ✅ Criar função PostgreSQL para limpeza automática de registros antigos
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Deletar registros mais antigos que 1 hora (protege memória do banco)
    DELETE FROM rate_limits
    WHERE created_at < NOW() - INTERVAL '1 hour';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Log de sucesso apenas se houver registros deletados
    IF deleted_count > 0 THEN
        -- Tenta inserir em system_logs se tabela existir
        BEGIN
            INSERT INTO system_logs (level, component, message, additional_data)
            VALUES ('INFO', 'rate_limiting', 'Limpeza automática de rate limits antigos',
                    jsonb_build_object('deleted_records', deleted_count, 'older_than', '1 hour'));
        EXCEPTION WHEN OTHERS THEN
            -- Ignora se system_logs não existir
            NULL;
        END;
    END IF;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_rate_limits() IS 'Remove automaticamente registros de rate limit com mais de 1 hora. Mantém a tabela compacta e melhora performance.';
