-- Migration: Add mostrar_votos to enquetes
-- Purpose: Permite ocultar o contador de votos na TV se desejado

ALTER TABLE enquetes 
ADD COLUMN IF NOT EXISTS mostrar_votos BOOLEAN DEFAULT true;
