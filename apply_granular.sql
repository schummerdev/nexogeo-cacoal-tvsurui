-- 1. Tabelas de Auditoria (LGPD)
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

CREATE TABLE IF NOT EXISTS system_logs (
    id SERIAL PRIMARY KEY,
    level VARCHAR(10) NOT NULL,
    component VARCHAR(50),
    message TEXT NOT NULL,
    error_code VARCHAR(20),
    stack_trace TEXT,
    additional_data JSONB,
    user_id INTEGER,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Índices Críticos para Participantes (Preservando dados)
CREATE INDEX IF NOT EXISTS idx_participantes_telefone ON participantes(telefone);
CREATE INDEX IF NOT EXISTS idx_participantes_promocao_id ON participantes(promocao_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_participantes_criado_em ON participantes(participou_em DESC) WHERE deleted_at IS NULL;

-- 3. Tabelas de Enquetes (Novas Funcionalidades)
CREATE TABLE IF NOT EXISTS enquetes (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(100) NOT NULL,
    pergunta VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'inativa' CHECK (status IN ('inativa', 'ativa', 'encerrada')),
    cor_tema VARCHAR(50) DEFAULT 'nexogeo',
    data_inicio TIMESTAMP WITH TIME ZONE,
    data_fim TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    mostrar_votos BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS enquete_opcoes (
    id SERIAL PRIMARY KEY,
    enquete_id INTEGER REFERENCES enquetes(id) ON DELETE CASCADE,
    texto_opcao VARCHAR(100) NOT NULL,
    cor_grafico VARCHAR(50) DEFAULT '#4F46E5',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS enquete_votos (
    id SERIAL PRIMARY KEY,
    enquete_id INTEGER REFERENCES enquetes(id) ON DELETE CASCADE,
    opcao_id INTEGER REFERENCES enquete_opcoes(id) ON DELETE CASCADE,
    participante_id INTEGER NOT NULL REFERENCES participantes(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    session_cookie VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'unq_voto_por_participante'
    ) THEN
        CREATE UNIQUE INDEX unq_voto_por_participante ON enquete_votos(enquete_id, participante_id);
    END IF;
END $$;
