-- ============================================================
-- SCHEMA COMPLETO - NexoGeo Database (PostgreSQL/Neon)
-- ============================================================
-- Versão: 2.3.0
-- Data: 2025-11-16
-- Descrição: Schema consolidado para replicação em novo ambiente
-- ============================================================

BEGIN;

-- ============================================================
-- 1. TABELA DE USUÁRIOS (AUTENTICAÇÃO)
-- ============================================================

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    usuario VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user', -- 'admin', 'moderator', 'editor', 'viewer', 'user'
    google_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE usuarios IS 'Usuários do sistema com autenticação e controle de acesso baseado em roles';
COMMENT ON COLUMN usuarios.role IS 'Papel do usuário: admin, moderator, editor, viewer, user';

-- ============================================================
-- 2. CONFIGURAÇÕES DA EMISSORA
-- ============================================================

CREATE TABLE IF NOT EXISTS configuracoes_emissora (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    logo_url TEXT,
    tema_cor VARCHAR(50) DEFAULT 'branco',
    website VARCHAR(500),
    telefone VARCHAR(50),
    endereco TEXT,
    cidade VARCHAR(255),
    instagram VARCHAR(500),
    facebook VARCHAR(500),
    youtube VARCHAR(500),
    linkedin VARCHAR(500),
    twitter VARCHAR(500),
    whatsapp VARCHAR(50),
    email VARCHAR(255),
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE configuracoes_emissora IS 'Configurações gerais da emissora/empresa';

-- ============================================================
-- 3. TABELA DE PROMOÇÕES
-- ============================================================

CREATE TABLE IF NOT EXISTS promocoes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    descricao TEXT,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'ativa', -- 'ativa', 'encerrada', 'cancelada'
    link_participacao TEXT,
    emissora_id INT,
    numero_ganhadores INT DEFAULT 1,
    is_drawing BOOLEAN DEFAULT false,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by INT,
    CONSTRAINT check_datas_validas CHECK (data_fim >= data_inicio)
);

COMMENT ON TABLE promocoes IS 'Promoções/Sorteios. Suporta soft delete via deleted_at.';
COMMENT ON COLUMN promocoes.is_drawing IS 'Flag para prevenir sorteios simultâneos';

-- ============================================================
-- 4. TABELA DE PARTICIPANTES (PROMOÇÕES REGULARES)
-- ============================================================

CREATE TABLE IF NOT EXISTS participantes (
    id SERIAL PRIMARY KEY,
    promocao_id INT, -- NULL para participantes públicos
    nome VARCHAR(255) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    bairro VARCHAR(255),
    cidade VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    origem_source VARCHAR(100), -- 'facebook', 'instagram', 'whatsapp', 'direto'
    origem_medium VARCHAR(100), -- 'social', 'messaging', 'link', 'qrcode'
    participou_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by INT,
    CONSTRAINT participantes_promocao_id_fkey FOREIGN KEY (promocao_id)
        REFERENCES promocoes(id) ON DELETE SET NULL
);

COMMENT ON TABLE participantes IS 'Participantes de promoções. Suporta soft delete via deleted_at.';
COMMENT ON COLUMN participantes.promocao_id IS 'ID da promoção (NULL para participantes públicos)';
COMMENT ON COLUMN participantes.deleted_at IS 'Timestamp de soft delete (NULL se ativo)';
COMMENT ON COLUMN participantes.telefone IS 'Telefone único por promoção (constraint única)';

-- ============================================================
-- 5. TABELA DE GANHADORES
-- ============================================================

CREATE TABLE IF NOT EXISTS ganhadores (
    id SERIAL PRIMARY KEY,
    promocao_id INT NOT NULL,
    participante_id INT NOT NULL,
    posicao INT DEFAULT 1,
    video_url TEXT,
    cancelado BOOLEAN DEFAULT false,
    cancelado_em TIMESTAMP WITH TIME ZONE,
    cancelado_por INT,
    motivo_cancelamento TEXT,
    sorteado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT ganhadores_promocao_id_fkey FOREIGN KEY (promocao_id)
        REFERENCES promocoes(id),
    CONSTRAINT ganhadores_participante_id_fkey FOREIGN KEY (participante_id)
        REFERENCES participantes(id)
);

COMMENT ON TABLE ganhadores IS 'Registro de ganhadores de sorteios. Auditável via deleted_at.';
COMMENT ON COLUMN ganhadores.cancelado IS 'Boolean: true se o ganhador foi cancelado, false se ativo. Mantido para compatibilidade com soft delete.';

-- ============================================================
-- 6. TABELAS CAIXA MISTERIOSA
-- ============================================================

-- 6.1 PATROCINADORES
CREATE TABLE IF NOT EXISTS sponsors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    facebook_url TEXT,
    instagram_url TEXT,
    whatsapp VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE sponsors IS 'Patrocinadores de jogos Caixa Misteriosa';
COMMENT ON COLUMN sponsors.logo_url IS 'URL da logo/marca do patrocinador';
COMMENT ON COLUMN sponsors.whatsapp IS 'Número de WhatsApp do patrocinador (formato: 5511999999999)';

-- 6.2 PRODUTOS (CAIXAS MISTERIOSAS)
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    sponsor_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    clues TEXT[], -- Array de dicas
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT products_sponsor_id_fkey FOREIGN KEY (sponsor_id)
        REFERENCES sponsors(id) ON DELETE CASCADE
);

COMMENT ON TABLE products IS 'Produtos/Caixas misteriosas com dicas';
COMMENT ON COLUMN products.clues IS 'Array de dicas (TEXT[]) ordenadas por revelação';

-- 6.3 JOGOS (SESSÕES AO VIVO)
CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'active', 'finished'
    revealed_clues_count INT DEFAULT 0,
    winner_id INT, -- ID do participante vencedor
    winner_guess TEXT, -- Palpite vencedor
    finished_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT games_product_id_fkey FOREIGN KEY (product_id)
        REFERENCES products(id) ON DELETE CASCADE
);

COMMENT ON TABLE games IS 'Sessões de jogos Caixa Misteriosa ao vivo';

-- 6.4 PARTICIPANTES PÚBLICOS (CAIXA MISTERIOSA)
CREATE TABLE IF NOT EXISTS public_participants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    neighborhood VARCHAR(255),
    city VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    own_referral_code VARCHAR(50) UNIQUE, -- Código de referência próprio
    reference_code VARCHAR(50), -- Código usado para indicação
    extra_guesses INT DEFAULT 0, -- Palpites extras ganhos por indicação
    total_submissions INT DEFAULT 0,
    correct_guesses INT DEFAULT 0,
    game_id INT, -- Último jogo que participou
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE public_participants IS 'Participantes públicos de jogos Caixa Misteriosa';
COMMENT ON COLUMN public_participants.extra_guesses IS 'Palpites extras ganhos por indicação (1 base + extras)';
COMMENT ON COLUMN public_participants.own_referral_code IS 'Código único para indicar outros participantes';

-- 6.5 SUBMISSÕES (PALPITES)
CREATE TABLE IF NOT EXISTS submissions (
    id SERIAL PRIMARY KEY,
    game_id INT NOT NULL,
    public_participant_id INT,
    user_name VARCHAR(255),
    user_phone VARCHAR(20),
    user_neighborhood VARCHAR(255),
    user_city VARCHAR(255),
    guess TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT false,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT submissions_game_id_fkey FOREIGN KEY (game_id)
        REFERENCES games(id) ON DELETE CASCADE,
    CONSTRAINT submissions_participant_id_fkey FOREIGN KEY (public_participant_id)
        REFERENCES public_participants(id) ON DELETE SET NULL
);

COMMENT ON TABLE submissions IS 'Palpites enviados para jogos Caixa Misteriosa';

-- ============================================================
-- 7. TABELAS DE AUDITORIA (LGPD)
-- ============================================================

-- 7.1 LOGS DE AUDITORIA PRINCIPAL
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    action VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT', 'LOGIN', 'LOGOUT'
    table_name VARCHAR(50) NOT NULL,
    record_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    request_method VARCHAR(10),
    request_url TEXT,
    response_status INTEGER,
    execution_time INTEGER,
    error_message TEXT,
    additional_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE audit_logs IS 'Log completo de todas as ações do sistema para auditoria e conformidade LGPD';

-- 7.2 LOGS DE ACESSO A DADOS PESSOAIS (LGPD Art. 37)
CREATE TABLE IF NOT EXISTS data_access_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    participant_id INTEGER,
    data_type VARCHAR(50) NOT NULL,
    access_reason VARCHAR(100),
    legal_basis VARCHAR(50),
    masked_data BOOLEAN DEFAULT true,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE data_access_logs IS 'Log específico de acesso a dados pessoais conforme Art. 37 da LGPD';

-- 7.3 LOGS DE CONSENTIMENTO
CREATE TABLE IF NOT EXISTS consent_logs (
    id SERIAL PRIMARY KEY,
    participant_id INTEGER,
    consent_type VARCHAR(50) NOT NULL,
    consent_given BOOLEAN NOT NULL,
    consent_text TEXT,
    consent_version VARCHAR(20),
    ip_address INET,
    user_agent TEXT,
    withdrawal_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE consent_logs IS 'Registro de consentimentos e retiradas conforme LGPD';

-- 7.4 LOGS DE SISTEMA
CREATE TABLE IF NOT EXISTS system_logs (
    id SERIAL PRIMARY KEY,
    level VARCHAR(10) NOT NULL, -- 'ERROR', 'WARN', 'INFO', 'DEBUG'
    component VARCHAR(50),
    message TEXT NOT NULL,
    error_code VARCHAR(20),
    stack_trace TEXT,
    additional_data JSONB,
    user_id INTEGER,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE system_logs IS 'Logs técnicos do sistema para monitoramento e debugging';

-- ============================================================
-- 8. TABELA DE RATE LIMITING
-- ============================================================

CREATE TABLE IF NOT EXISTS rate_limits (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) NOT NULL, -- IP ou identificador único
    endpoint VARCHAR(255) NOT NULL,
    count INT DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE rate_limits IS 'Controle de rate limiting por IP/endpoint';

-- ============================================================
-- 9. ÍNDICES PARA PERFORMANCE
-- ============================================================

-- Índices para USUARIOS
CREATE INDEX IF NOT EXISTS idx_usuarios_role ON usuarios(role);
CREATE INDEX IF NOT EXISTS idx_usuarios_google_id ON usuarios(google_id);

-- Índices para PROMOCOES
CREATE INDEX IF NOT EXISTS idx_promocoes_status ON promocoes(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_promocoes_datas ON promocoes(data_inicio, data_fim) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_promocoes_criado_em ON promocoes(criado_em DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_promocoes_slug ON promocoes(slug) WHERE deleted_at IS NULL;

-- Índices para PARTICIPANTES
CREATE INDEX IF NOT EXISTS idx_participantes_telefone ON participantes(telefone);
CREATE INDEX IF NOT EXISTS idx_participantes_nome ON participantes(nome) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_participantes_cidade ON participantes(cidade) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_participantes_bairro ON participantes(bairro) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_participantes_criado_em ON participantes(participou_em DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_participantes_promocao_id ON participantes(promocao_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_participantes_soft_delete ON participantes(deleted_at);
CREATE INDEX IF NOT EXISTS idx_participantes_geolocalizacao ON participantes(latitude, longitude);

-- Índice UNIQUE para evitar duplicação de telefone por promoção
CREATE UNIQUE INDEX IF NOT EXISTS idx_participante_unico_por_promocao
  ON participantes(promocao_id, telefone)
  WHERE deleted_at IS NULL AND promocao_id IS NOT NULL;

-- Índices para GANHADORES
CREATE INDEX IF NOT EXISTS idx_ganhadores_participante_id ON ganhadores(participante_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ganhadores_promocao_id ON ganhadores(promocao_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ganhadores_sorteado_em ON ganhadores(sorteado_em DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ganhadores_cancelado ON ganhadores(cancelado);

-- Índices para CAIXA MISTERIOSA
CREATE INDEX IF NOT EXISTS idx_sponsors_deleted_at ON sponsors(deleted_at);
CREATE INDEX IF NOT EXISTS idx_products_sponsor_id ON products(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_games_product_id ON games(product_id);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_public_participants_phone ON public_participants(phone);
CREATE INDEX IF NOT EXISTS idx_public_participants_referral ON public_participants(own_referral_code);
CREATE INDEX IF NOT EXISTS idx_submissions_game_id ON submissions(game_id);
CREATE INDEX IF NOT EXISTS idx_submissions_participant_id ON submissions(public_participant_id);

-- Índices para AUDITORIA
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

-- Índice para RATE LIMITING
CREATE INDEX IF NOT EXISTS idx_rate_limits_key_endpoint ON rate_limits(key, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);

-- ============================================================
-- 10. VIEWS ÚTEIS PARA QUERIES
-- ============================================================

-- View para participantes unificados (regulares + públicos)
CREATE OR REPLACE VIEW participantes_unificados AS
SELECT
    id,
    promocao_id,
    nome AS name,
    telefone AS phone,
    bairro AS neighborhood,
    cidade AS city,
    latitude,
    longitude,
    email,
    origem_source,
    origem_medium,
    participou_em AS created_at,
    'regular' AS participant_type
FROM participantes
WHERE deleted_at IS NULL

UNION ALL

SELECT
    id,
    NULL AS promocao_id,
    name,
    phone,
    neighborhood,
    city,
    latitude,
    longitude,
    NULL AS email,
    'caixa_misteriosa' AS origem_source,
    'game' AS origem_medium,
    created_at,
    'public' AS participant_type
FROM public_participants
WHERE deleted_at IS NULL;

COMMENT ON VIEW participantes_unificados IS 'View combinada de participantes regulares e públicos';

-- View para participantes únicos (sem duplicação de telefone)
CREATE OR REPLACE VIEW participantes_unicos AS
SELECT DISTINCT ON (phone) *
FROM participantes_unificados
ORDER BY phone, created_at DESC;

COMMENT ON VIEW participantes_unicos IS 'Participantes únicos baseado no telefone (mais recente por telefone)';

-- ============================================================
-- 11. FUNÇÕES ÚTEIS
-- ============================================================

-- Função para limpeza automática de logs antigos
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '2 years';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    DELETE FROM data_access_logs WHERE created_at < NOW() - INTERVAL '1 year';
    DELETE FROM system_logs WHERE created_at < NOW() - INTERVAL '6 months' AND level != 'ERROR';
    DELETE FROM system_logs WHERE created_at < NOW() - INTERVAL '1 year' AND level = 'ERROR';
    DELETE FROM consent_logs WHERE created_at < NOW() - INTERVAL '5 years';

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_logs() IS 'Remove logs antigos conforme política de retenção';

-- ============================================================
-- 12. DADOS INICIAIS (OPCIONAL)
-- ============================================================

-- Criar usuário admin padrão (senha: admin123 - ALTERAR EM PRODUÇÃO!)
-- NOTA: O hash abaixo é para 'admin123' com bcrypt
-- Para gerar novo hash: node -e "console.log(require('bcryptjs').hashSync('SUA_SENHA', 10))"

-- INSERT INTO usuarios (usuario, senha_hash, role)
-- VALUES ('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin')
-- ON CONFLICT (usuario) DO NOTHING;

-- Inserir configuração inicial da emissora
-- INSERT INTO configuracoes_emissora (nome, logo_url, tema_cor)
-- VALUES ('Sua Emissora', '/logo.png', 'azul')
-- ON CONFLICT DO NOTHING;

COMMIT;

-- ============================================================
-- RESUMO DO SCHEMA
-- ============================================================
/*
TABELAS CRIADAS: 16
1. usuarios - Autenticação e roles
2. configuracoes_emissora - Configurações da empresa
3. promocoes - Promoções e sorteios
4. participantes - Participantes de promoções
5. ganhadores - Registro de ganhadores
6. sponsors - Patrocinadores Caixa Misteriosa
7. products - Produtos/Caixas misteriosas
8. games - Sessões de jogos ao vivo
9. public_participants - Participantes públicos
10. submissions - Palpites enviados
11. audit_logs - Auditoria principal
12. data_access_logs - Acesso a dados pessoais
13. consent_logs - Consentimentos LGPD
14. system_logs - Logs técnicos
15. rate_limits - Rate limiting

VIEWS CRIADAS: 2
1. participantes_unificados - Combinação de participantes regulares e públicos
2. participantes_unicos - Participantes únicos por telefone

ÍNDICES CRIADOS: 40+
- Otimizados para queries frequentes
- Suporte a soft delete (WHERE deleted_at IS NULL)
- Índices únicos para integridade de dados

FUNCIONALIDADES:
- Soft delete em todas as tabelas principais
- Sistema de auditoria completo (LGPD)
- Rate limiting por IP/endpoint
- Controle de acesso baseado em roles
- Sistema de indicação com palpites extras
- Geolocalização de participantes

COMPATÍVEL COM:
- PostgreSQL 12+
- Neon Database
- Vercel Serverless Functions
*/
