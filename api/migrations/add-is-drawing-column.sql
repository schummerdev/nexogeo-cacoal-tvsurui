-- Migration: Add is_drawing column to prevent race conditions in lottery draws
-- Severity: CRITICAL (CRÍTICO-002)
-- Purpose: Prevent multiple simultaneous lottery draws for same promotion

-- ✅ UP MIGRATION: Add column
ALTER TABLE promocoes
ADD COLUMN IF NOT EXISTS is_drawing BOOLEAN DEFAULT false;

-- Create index for optimized lock queries
CREATE INDEX IF NOT EXISTS idx_promocoes_is_drawing
ON promocoes(id, is_drawing)
WHERE is_drawing = true;

-- Add column comment for documentation
COMMENT ON COLUMN promocoes.is_drawing IS
'Flag to prevent race conditions in lottery draws (optimistic lock). Set to true when draw starts, false when complete.';

-- ✅ DOWN MIGRATION:
-- To revert, execute manually:
-- DROP INDEX IF EXISTS idx_promocoes_is_drawing;
-- ALTER TABLE promocoes DROP COLUMN IF EXISTS is_drawing;
