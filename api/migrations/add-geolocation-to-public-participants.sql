-- Migration: Adiciona colunas de geolocalização à tabela public_participants
-- Data: 2025-10-06
-- Descrição: Adiciona latitude e longitude para captura de localização dos participantes

-- Adiciona coluna latitude (permite NULL para cadastros antigos)
ALTER TABLE public_participants
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);

-- Adiciona coluna longitude (permite NULL para cadastros antigos)
ALTER TABLE public_participants
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Adiciona comentários nas colunas para documentação
COMMENT ON COLUMN public_participants.latitude IS 'Latitude da geolocalização do participante no momento do cadastro';
COMMENT ON COLUMN public_participants.longitude IS 'Longitude da geolocalização do participante no momento do cadastro';

-- Verifica se as colunas foram criadas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'public_participants'
AND column_name IN ('latitude', 'longitude');
