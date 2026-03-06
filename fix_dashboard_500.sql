-- ============================================================================
-- SCRIPT DE CORREÇÃO DEFINITIVA: DASHBOARD 500 ERRORS
-- ============================================================================

DO $$
BEGIN
    -- 1. ADICIONAR COLUNAS FALTANTES EM GANHADORES
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ganhadores' AND column_name = 'cancelado') THEN
        ALTER TABLE ganhadores ADD COLUMN cancelado BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ganhadores' AND column_name = 'video_url') THEN
        ALTER TABLE ganhadores ADD COLUMN video_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ganhadores' AND column_name = 'deleted_at') THEN
        ALTER TABLE ganhadores ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ganhadores' AND column_name = 'deleted_by') THEN
        ALTER TABLE ganhadores ADD COLUMN deleted_by INTEGER REFERENCES usuarios(id);
    END IF;

    -- 2. ADICIONAR COLUNAS FALTANTES EM PROMOCOES
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'promocoes' AND column_name = 'updated_at') THEN
        ALTER TABLE promocoes ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'promocoes' AND column_name = 'deleted_at') THEN
        ALTER TABLE promocoes ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'promocoes' AND column_name = 'deleted_by') THEN
        ALTER TABLE promocoes ADD COLUMN deleted_by INTEGER REFERENCES usuarios(id);
    END IF;

    -- 3. ADICIONAR COLUNAS FALTANTES EM PARTICIPANTES
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'participantes' AND column_name = 'deleted_at') THEN
        ALTER TABLE participantes ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'participantes' AND column_name = 'updated_at') THEN
        ALTER TABLE participantes ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;

    -- 4. ADICIONAR COLUNAS FALTANTES EM PUBLIC_PARTICIPANTS
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'public_participants' AND column_name = 'deleted_at') THEN
        ALTER TABLE public_participants ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'public_participants' AND column_name = 'updated_at') THEN
        ALTER TABLE public_participants ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;

END $$;

-- 5. RECRIAÇÃO DE VIEWS CRÍTICAS
-- View: participantes_unificados (Combina participantes regulares e públicos)
DROP VIEW IF EXISTS participantes_unificados CASCADE;
CREATE VIEW participantes_unificados AS
SELECT 
    id, 
    nome, 
    telefone, 
    cidade, 
    bairro, 
    participou_em as criado_em, 
    'regular' as tipo,
    promocao_id,
    deleted_at
FROM participantes
UNION ALL
SELECT 
    id, 
    name as nome, 
    phone as telefone, 
    city as cidade, 
    neighborhood as bairro, 
    created_at as criado_em, 
    'publico' as tipo,
    NULL as promocao_id,
    deleted_at
FROM public_participants;

-- View: participantes_unicos (Agrupados por telefone)
DROP VIEW IF EXISTS participantes_unicos CASCADE;
CREATE VIEW participantes_unicos AS
SELECT DISTINCT ON (telefone)
    id,
    nome,
    telefone,
    cidade,
    bairro,
    criado_em,
    tipo
FROM participantes_unificados
WHERE deleted_at IS NULL
ORDER BY telefone, criado_em DESC;

-- 5. ÍNDICES ADICIONAIS PARA GANHADORES
CREATE INDEX IF NOT EXISTS idx_ganhadores_cancelado ON ganhadores(cancelado) WHERE deleted_at IS NULL;
