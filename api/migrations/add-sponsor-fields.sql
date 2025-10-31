-- Migration: Adicionar campos adicionais à tabela sponsors
-- Data: 05/10/2025
-- Descrição: Adiciona campos para logo, redes sociais, whatsapp e endereço

-- Adicionar novos campos à tabela sponsors
ALTER TABLE sponsors
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS facebook_url TEXT,
ADD COLUMN IF NOT EXISTS instagram_url TEXT,
ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(20),
ADD COLUMN IF NOT EXISTS address TEXT;

-- Comentários sobre os campos
COMMENT ON COLUMN sponsors.logo_url IS 'URL da logo/marca do patrocinador';
COMMENT ON COLUMN sponsors.facebook_url IS 'URL da página do Facebook do patrocinador';
COMMENT ON COLUMN sponsors.instagram_url IS 'URL do perfil do Instagram do patrocinador';
COMMENT ON COLUMN sponsors.whatsapp IS 'Número de WhatsApp do patrocinador (formato: 5511999999999)';
COMMENT ON COLUMN sponsors.address IS 'Endereço completo do patrocinador';
