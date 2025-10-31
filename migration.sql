-- Script SQL para adicionar colunas faltantes na tabela usuarios
-- Execute este script diretamente no banco de dados PostgreSQL

-- Adicionar coluna role (função/papel do usuário)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

-- Adicionar coluna google_id (para autenticação Google OAuth)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;

-- Adicionar coluna email (para autenticação e comunicação)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;

-- Adicionar coluna name (nome completo do usuário)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Adicionar coluna picture (URL da foto do perfil)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS picture TEXT;

-- Atualizar usuários existentes para terem role 'admin' se necessário
-- (descomente a linha abaixo se quiser definir usuários existentes como admin)
-- UPDATE usuarios SET role = 'admin' WHERE role IS NULL OR role = 'user';

-- Verificar estrutura final da tabela
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'usuarios' 
ORDER BY ordinal_position;

-- Verificar dados existentes
SELECT id, usuario, role, email, name, created_at FROM usuarios;