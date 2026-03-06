-- 1. Normalização de telefones na tabela participantes
UPDATE participantes 
SET telefone = REGEXP_REPLACE(telefone, '[^0-9]', '', 'g')
WHERE telefone ~ '[^0-9]';

-- 2. Normalização de telefones na tabela public_participants
UPDATE public_participants 
SET phone = REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
WHERE phone ~ '[^0-9]';

-- 3. Adicionar coluna updated_at na tabela usuarios se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'usuarios' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE usuarios ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- 4. Criar índice unique para evitar duplicidade por promoção (se não existir)
-- Nota: Isso requer que os dados já estejam normalizados para evitar falhas por duplicatas existentes incompatíveis.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_participante_unico_por_promocao'
    ) THEN
        CREATE UNIQUE INDEX idx_participante_unico_por_promocao 
        ON participantes(promocao_id, telefone) 
        WHERE deleted_at IS NULL AND promocao_id IS NOT NULL;
    END IF;
END $$;
