-- 1. ADICIONAR COLUNAS FALTANTES EM TABELAS EXISTENTES (SEGURO)
DO $$
BEGIN
    -- Participantes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'participantes' AND column_name = 'deleted_at') THEN
        ALTER TABLE participantes ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'participantes' AND column_name = 'updated_at') THEN
        ALTER TABLE participantes ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;

    -- Ganhadores
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ganhadores' AND column_name = 'deleted_at') THEN
        ALTER TABLE ganhadores ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ganhadores' AND column_name = 'updated_at') THEN
        ALTER TABLE ganhadores ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;

    -- Promoções
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'promocoes' AND column_name = 'deleted_at') THEN
        ALTER TABLE promocoes ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'promocoes' AND column_name = 'updated_at') THEN
        ALTER TABLE promocoes ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- 2. CRIAR TABELAS DA CAIXA MISTERIOSA (INCREMENTAL)
CREATE TABLE IF NOT EXISTS public_participants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    neighborhood VARCHAR(255),
    city VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    own_referral_code VARCHAR(50) UNIQUE,
    referral_code VARCHAR(50),
    referred_by_id INT,
    extra_guesses INT DEFAULT 0,
    used_guesses INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    FOREIGN KEY (referred_by_id) REFERENCES public_participants(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sponsors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    website VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    estimated_value DECIMAL(10, 2),
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'pending',
    max_clues INT DEFAULT 5,
    reveal_interval INT DEFAULT 300,
    last_reveal_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- 3. TABELAS DE ENQUETES (INCREMENTAL)
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

-- 4. ÍNDICES E CONSTRAINTS FINAIS (INCREMENTAL)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_participantes_telefone') THEN
        CREATE INDEX idx_participantes_telefone ON participantes(telefone);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_participante_unico_por_promocao') THEN
        CREATE UNIQUE INDEX idx_participante_unico_por_promocao 
        ON participantes(promocao_id, telefone) 
        WHERE deleted_at IS NULL AND promocao_id IS NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'unq_voto_por_participante') THEN
        CREATE UNIQUE INDEX unq_voto_por_participante ON enquete_votos(enquete_id, participante_id);
    END IF;
END $$;
