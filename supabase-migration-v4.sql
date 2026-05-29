-- =============================================
-- FitTrack Migration v4
-- Im Supabase SQL Editor ausführen
-- =============================================

-- goy_score: KI-bewertete Lebensmittelqualität (1–100, 100 = roh/bio/natürlich)
ALTER TABLE calories ADD COLUMN IF NOT EXISTS goy_score INTEGER;
