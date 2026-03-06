-- ============================================================================
-- SCRIPT DE CORREÇÃO FINAL: COLUNAS DE AUDITORIA E SOFT DELETE
-- ============================================================================

DO $$
BEGIN
    -- 1. ADICIONAR deleted_by EM participantes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'participantes' AND column_name = 'deleted_by') THEN
        ALTER TABLE participantes ADD COLUMN deleted_by INTEGER REFERENCES usuarios(id);
    END IF;

    -- 2. ADICIONAR deleted_by EM public_participants
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'public_participants' AND column_name = 'deleted_by') THEN
        ALTER TABLE public_participants ADD COLUMN deleted_by INTEGER REFERENCES usuarios(id);
    END IF;

    -- 3. GARANTIR QUE deleted_at EXISTE E É COERENTE
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'participantes' AND column_name = 'deleted_at') THEN
        ALTER TABLE participantes ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'public_participants' AND column_name = 'deleted_at') THEN
        ALTER TABLE public_participants ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    END IF;

END $$;

-- 4. RE-VERIFICAÇÃO DE VIEWS (Caso deleted_by fosse necessário nelas futuramente)
-- O handler atual não usa as views para o list, mas as views são úteis para auditoria.
-- DROP VIEW IF EXISTS participantes_unificados CASCADE; -- Já realizado anteriormente
