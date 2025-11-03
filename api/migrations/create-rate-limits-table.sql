-- api/migrations/create-rate-limits-table.sql
-- ✅ SEGURANÇA: Persistent rate limiting para prevenir ataques DDoS e brute force
-- Substitui o in-memory rate limiting que era perdido a cada restart do Vercel

-- Tabela de rate limits persistente
CREATE TABLE IF NOT EXISTS rate_limits (
    id SERIAL PRIMARY KEY,
    ip VARCHAR(45) NOT NULL,                    -- IP do cliente (IPv4 ou IPv6)
    user_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,  -- Usuário autenticado (NULL para anônimo)
    endpoint VARCHAR(100) NOT NULL,             -- Endpoint acessado (ex: 'auth_login', 'sorteio_sortear')
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP  -- Timestamp do request
);

COMMENT ON TABLE rate_limits IS 'Log de requisições para rate limiting persistente através de restarts do Vercel. Previne DDoS e brute force attacks.';
COMMENT ON COLUMN rate_limits.ip IS 'IP do cliente extraído de x-forwarded-for ou connection remoteAddress';
COMMENT ON COLUMN rate_limits.user_id IS 'ID do usuário autenticado, NULL para requisições anônimas';
COMMENT ON COLUMN rate_limits.endpoint IS 'Endpoint ou ação (ex: auth_login, sorteio_sortear, criar_participante)';
COMMENT ON COLUMN rate_limits.created_at IS 'Timestamp exato do request para cálculo de janelas de tempo';

-- Índice composto para lookup rápido: (ip, user_id, endpoint, created_at)
-- Usado em: SELECT COUNT(*) para verificar limite em janela temporal
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
    ON rate_limits (ip, user_id, endpoint, created_at DESC);

-- Índice para cleanup eficiente de registros antigos
-- Usado em: DELETE ... WHERE created_at < NOW() - INTERVAL '1 hour'
CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup
    ON rate_limits (created_at)
    WHERE created_at < NOW() - INTERVAL '1 hour';

-- Função PostgreSQL para limpeza automática de registros antigos
-- Executa probabilisticamente (10% chance) a cada request para evitar locks
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
        INSERT INTO system_logs (level, component, message, additional_data)
        VALUES ('INFO', 'rate_limiting', 'Limpeza automática de rate limits antigos',
                jsonb_build_object('deleted_records', deleted_count, 'older_than', '1 hour'));
    END IF;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_rate_limits() IS 'Remove automaticamente registros de rate limit com mais de 1 hora. Mantém a tabela compacta e melhora performance.';

-- Log inicial
INSERT INTO system_logs (level, component, message, additional_data)
VALUES ('INFO', 'database', 'Sistema de rate limiting persistente inicializado',
        jsonb_build_object('version', '1.0', 'persistence', 'postgresql', 'fallback_pattern', 'fail_open'));
