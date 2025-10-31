-- Adicionar coluna slug à tabela promocoes
ALTER TABLE promocoes ADD COLUMN slug VARCHAR(255) UNIQUE;

-- Atualizar registros existentes para terem slugs
UPDATE promocoes SET slug = LOWER(REPLACE(nome, ' ', '-')) WHERE slug IS NULL;

-- Criar índice para melhorar performance na busca por slug
CREATE INDEX IF NOT EXISTS idx_promocoes_slug ON promocoes (slug);