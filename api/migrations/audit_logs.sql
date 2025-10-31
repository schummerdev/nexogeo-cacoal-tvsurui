-- api/migrations/audit_logs.sql
-- Sistema de Auditoria completo conforme LGPD

-- Tabela principal de logs de auditoria
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES usuarios_admin(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT', 'LOGIN', 'LOGOUT'
    table_name VARCHAR(50) NOT NULL, -- 'participantes', 'promocoes', 'ganhadores', 'usuarios_admin'
    record_id INTEGER, -- ID do registro afetado
    old_values JSONB, -- Dados antes da alteração (UPDATE/DELETE)
    new_values JSONB, -- Dados após a alteração (CREATE/UPDATE)
    ip_address INET, -- IP do usuário
    user_agent TEXT, -- User agent do navegador
    session_id VARCHAR(255), -- ID da sessão
    request_method VARCHAR(10), -- GET, POST, PUT, DELETE
    request_url TEXT, -- URL da requisição
    response_status INTEGER, -- Status HTTP da resposta
    execution_time INTEGER, -- Tempo de execução em ms
    error_message TEXT, -- Mensagem de erro se houve falha
    additional_data JSONB, -- Dados adicionais específicos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela específica para acesso a dados pessoais (LGPD Art. 37)
CREATE TABLE IF NOT EXISTS data_access_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES usuarios_admin(id) ON DELETE SET NULL,
    participant_id INTEGER REFERENCES participantes(id) ON DELETE CASCADE,
    data_type VARCHAR(50) NOT NULL, -- 'phone', 'email', 'address', 'location', 'full_profile'
    access_reason VARCHAR(100), -- 'winner_notification', 'customer_service', 'audit', 'export'
    legal_basis VARCHAR(50), -- 'consent', 'legitimate_interest', 'legal_obligation', 'contract'
    masked_data BOOLEAN DEFAULT true, -- Se os dados foram mascarados
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para consentimentos LGPD
CREATE TABLE IF NOT EXISTS consent_logs (
    id SERIAL PRIMARY KEY,
    participant_id INTEGER REFERENCES participantes(id) ON DELETE CASCADE,
    consent_type VARCHAR(50) NOT NULL, -- 'marketing', 'analytics', 'notifications'
    consent_given BOOLEAN NOT NULL,
    consent_text TEXT, -- Texto do consentimento apresentado
    consent_version VARCHAR(20), -- Versão dos termos
    ip_address INET,
    user_agent TEXT,
    withdrawal_reason TEXT, -- Razão para retirada do consentimento
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para logs de sistema
CREATE TABLE IF NOT EXISTS system_logs (
    id SERIAL PRIMARY KEY,
    level VARCHAR(10) NOT NULL, -- 'ERROR', 'WARN', 'INFO', 'DEBUG'
    component VARCHAR(50), -- 'auth', 'database', 'api', 'email', 'backup'
    message TEXT NOT NULL,
    error_code VARCHAR(20),
    stack_trace TEXT,
    additional_data JSONB,
    user_id INTEGER REFERENCES usuarios_admin(id) ON DELETE SET NULL,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON audit_logs(record_id);

CREATE INDEX IF NOT EXISTS idx_data_access_logs_user_id ON data_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_participant_id ON data_access_logs(participant_id);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_created_at ON data_access_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_data_type ON data_access_logs(data_type);

CREATE INDEX IF NOT EXISTS idx_consent_logs_participant_id ON consent_logs(participant_id);
CREATE INDEX IF NOT EXISTS idx_consent_logs_consent_type ON consent_logs(consent_type);
CREATE INDEX IF NOT EXISTS idx_consent_logs_created_at ON consent_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_component ON system_logs(component);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);

-- Função para limpeza automática de logs antigos
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Limpar audit_logs mais antigos que 2 anos
    DELETE FROM audit_logs 
    WHERE created_at < NOW() - INTERVAL '2 years';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Limpar data_access_logs mais antigos que 1 ano
    DELETE FROM data_access_logs 
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    -- Limpar system_logs mais antigos que 6 meses (exceto ERRORs que ficam 1 ano)
    DELETE FROM system_logs 
    WHERE created_at < NOW() - INTERVAL '6 months' 
    AND level != 'ERROR';
    
    DELETE FROM system_logs 
    WHERE created_at < NOW() - INTERVAL '1 year' 
    AND level = 'ERROR';
    
    -- Limpar consent_logs mais antigos que 5 anos (obrigação legal)
    DELETE FROM consent_logs 
    WHERE created_at < NOW() - INTERVAL '5 years';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger para auditoria automática em tabelas críticas
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    action_type VARCHAR(10);
BEGIN
    -- Determinar tipo de ação
    IF TG_OP = 'DELETE' THEN
        old_data := row_to_json(OLD)::JSONB;
        new_data := NULL;
        action_type := 'DELETE';
    ELSIF TG_OP = 'UPDATE' THEN
        old_data := row_to_json(OLD)::JSONB;
        new_data := row_to_json(NEW)::JSONB;
        action_type := 'UPDATE';
    ELSIF TG_OP = 'INSERT' THEN
        old_data := NULL;
        new_data := row_to_json(NEW)::JSONB;
        action_type := 'CREATE';
    END IF;
    
    -- Inserir log de auditoria
    INSERT INTO audit_logs (
        user_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values,
        ip_address,
        additional_data
    ) VALUES (
        NULLIF(current_setting('app.current_user_id', true), '')::INTEGER,
        action_type,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        old_data,
        new_data,
        NULLIF(current_setting('app.client_ip', true), '')::INET,
        jsonb_build_object(
            'trigger_op', TG_OP,
            'trigger_table', TG_TABLE_NAME,
            'trigger_when', TG_WHEN,
            'timestamp', NOW()
        )
    );
    
    -- Retornar registro apropriado
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers nas tabelas críticas
DROP TRIGGER IF EXISTS audit_participantes ON participantes;
CREATE TRIGGER audit_participantes
    AFTER INSERT OR UPDATE OR DELETE ON participantes
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

DROP TRIGGER IF EXISTS audit_promocoes ON promocoes;
CREATE TRIGGER audit_promocoes
    AFTER INSERT OR UPDATE OR DELETE ON promocoes
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

DROP TRIGGER IF EXISTS audit_ganhadores ON ganhadores;
CREATE TRIGGER audit_ganhadores
    AFTER INSERT OR UPDATE OR DELETE ON ganhadores
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

DROP TRIGGER IF EXISTS audit_usuarios_admin ON usuarios_admin;
CREATE TRIGGER audit_usuarios_admin
    AFTER INSERT OR UPDATE OR DELETE ON usuarios_admin
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- Função para obter estatísticas de auditoria
CREATE OR REPLACE FUNCTION get_audit_stats(days_back INTEGER DEFAULT 30)
RETURNS TABLE(
    total_actions INTEGER,
    creates INTEGER,
    updates INTEGER,
    deletes INTEGER,
    views INTEGER,
    top_users TEXT[],
    top_tables TEXT[],
    recent_errors INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_actions,
        COUNT(*) FILTER (WHERE action = 'CREATE')::INTEGER as creates,
        COUNT(*) FILTER (WHERE action = 'UPDATE')::INTEGER as updates,
        COUNT(*) FILTER (WHERE action = 'DELETE')::INTEGER as deletes,
        COUNT(*) FILTER (WHERE action = 'VIEW')::INTEGER as views,
        ARRAY(
            SELECT u.nome || ' (' || COUNT(al.id) || ')'
            FROM audit_logs al
            JOIN usuarios_admin u ON u.id = al.user_id
            WHERE al.created_at >= NOW() - INTERVAL '1 day' * days_back
            GROUP BY u.nome, u.id
            ORDER BY COUNT(al.id) DESC
            LIMIT 5
        ) as top_users,
        ARRAY(
            SELECT table_name || ' (' || COUNT(*) || ')'
            FROM audit_logs
            WHERE created_at >= NOW() - INTERVAL '1 day' * days_back
            GROUP BY table_name
            ORDER BY COUNT(*) DESC
            LIMIT 5
        ) as top_tables,
        COUNT(*) FILTER (WHERE error_message IS NOT NULL)::INTEGER as recent_errors
    FROM audit_logs
    WHERE created_at >= NOW() - INTERVAL '1 day' * days_back;
END;
$$ LANGUAGE plpgsql;

-- Inserir log inicial
INSERT INTO system_logs (level, component, message, additional_data)
VALUES ('INFO', 'database', 'Sistema de auditoria inicializado', 
        jsonb_build_object('version', '1.0', 'lgpd_compliant', true));

-- Comentários para documentação
COMMENT ON TABLE audit_logs IS 'Log completo de todas as ações do sistema para auditoria e conformidade LGPD';
COMMENT ON TABLE data_access_logs IS 'Log específico de acesso a dados pessoais conforme Art. 37 da LGPD';
COMMENT ON TABLE consent_logs IS 'Registro de consentimentos e retiradas conforme LGPD';
COMMENT ON TABLE system_logs IS 'Logs técnicos do sistema para monitoramento e debugging';

COMMENT ON COLUMN audit_logs.legal_basis IS 'Base legal para processamento conforme Art. 7 da LGPD';
COMMENT ON COLUMN data_access_logs.data_type IS 'Tipo de dado pessoal acessado';
COMMENT ON COLUMN consent_logs.consent_version IS 'Versão dos termos de consentimento';