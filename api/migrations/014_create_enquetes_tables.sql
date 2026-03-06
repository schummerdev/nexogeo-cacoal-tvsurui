-- Migration: Online Polls Tables
-- Purpose: Crea as tabelas necessárias para o sistema de enquetes ao vivo (TV)

CREATE TABLE IF NOT EXISTS enquetes (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    pergunta TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'inativa', -- ativas / inativas / encerradas
    data_inicio TIMESTAMPTZ,
    data_fim TIMESTAMPTZ,
    cor_tema VARCHAR(50) DEFAULT 'nexogeo',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by VARCHAR(255) DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS enquete_opcoes (
    id SERIAL PRIMARY KEY,
    enquete_id INT NOT NULL REFERENCES enquetes(id) ON DELETE CASCADE,
    texto_opcao VARCHAR(255) NOT NULL,
    cor_grafico VARCHAR(50) DEFAULT '#4F46E5', -- Tailwind indigo-600
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS enquete_votos (
    id SERIAL PRIMARY KEY,
    enquete_id INT NOT NULL REFERENCES enquetes(id) ON DELETE CASCADE,
    opcao_id INT NOT NULL REFERENCES enquete_opcoes(id) ON DELETE CASCADE,
    ip_address VARCHAR(45) NOT NULL,
    session_cookie VARCHAR(255),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Índices para otimizar a contagem em tempo real e prevenção de fraude
CREATE INDEX IF NOT EXISTS idx_enquete_votos_enquete_id ON enquete_votos(enquete_id);
CREATE INDEX IF NOT EXISTS idx_enquete_votos_opcao_id ON enquete_votos(opcao_id);
CREATE INDEX IF NOT EXISTS idx_enquete_votos_ip ON enquete_votos(ip_address);
CREATE INDEX IF NOT EXISTS idx_enquete_status ON enquetes(status);

-- Função para garantir apenas um voto por IP por enquete (Opcional, mas recomendado para enquetes fechadas)
-- Adicionaremos como UNIQUE INDEX para prevenir duplicidade pesada de bots direto no banco
CREATE UNIQUE INDEX IF NOT EXISTS unq_voto_por_ip ON enquete_votos (enquete_id, ip_address) 
WHERE ip_address != '127.0.0.1' AND ip_address != '::1' AND ip_address != 'unknown';
