-- ✅ SEGURANÇA (ALTO-005): Implementar Soft Delete
-- Adiciona colunas deleted_at e deleted_by para permitir soft delete em tabelas críticas
-- Isso permite recuperação de dados, auditabilidade e conformidade com LGPD

-- 1️⃣ Add soft delete to games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE games ADD COLUMN IF NOT EXISTS deleted_by INTEGER REFERENCES usuarios(id);
CREATE INDEX IF NOT EXISTS idx_games_deleted_at ON games(deleted_at);

-- 2️⃣ Add soft delete to submissions table
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS deleted_by INTEGER REFERENCES usuarios(id);
CREATE INDEX IF NOT EXISTS idx_submissions_deleted_at ON submissions(deleted_at);

-- 3️⃣ Add soft delete to promocoes table
ALTER TABLE promocoes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE promocoes ADD COLUMN IF NOT EXISTS deleted_by INTEGER REFERENCES usuarios(id);
CREATE INDEX IF NOT EXISTS idx_promocoes_deleted_at ON promocoes(deleted_at);

-- 4️⃣ For ganhadores, add soft delete columns
-- Note: We keep the 'cancelado' boolean column for backwards compatibility
-- but add deleted_at/deleted_by for audit tracking
ALTER TABLE ganhadores ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE ganhadores ADD COLUMN IF NOT EXISTS deleted_by INTEGER REFERENCES usuarios(id);
CREATE INDEX IF NOT EXISTS idx_ganhadores_deleted_at ON ganhadores(deleted_at);

-- Sync existing cancelado records to deleted_at
-- If cancelado = true and deleted_at is null, set deleted_at to sorteado_em (best guess)
UPDATE ganhadores
SET deleted_at = COALESCE(sorteado_em, CURRENT_TIMESTAMP)
WHERE cancelado = true AND deleted_at IS NULL;

-- Note: Run this migration manually after deploying to Vercel
-- See MIGRATIONS.md for instructions
