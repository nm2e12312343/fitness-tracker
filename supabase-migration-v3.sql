-- =============================================
-- FitTrack Migration v3
-- Im Supabase SQL Editor ausführen
-- =============================================

-- 1. is_archived Spalte auf exercises (für eigene Übungen, die noch Logs haben)
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

-- 2. UPDATE Policy fehlt noch (wird für Umbenennen + Archivieren benötigt)
DROP POLICY IF EXISTS "exercises: update own" ON exercises;
CREATE POLICY "exercises: update own" ON exercises
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
