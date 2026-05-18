-- =============================================
-- FitTrack Migration v2
-- Im Supabase SQL Editor ausführen
-- =============================================

-- 1. user_id auf exercises (für eigene Übungen)
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Bestehende globale Übungen haben user_id = NULL (öffentlich sichtbar)

-- 2. Körpergewicht
CREATE TABLE IF NOT EXISTS body_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 3. Trainingsvorlagen
CREATE TABLE IF NOT EXISTS workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Übungen in Vorlagen
CREATE TABLE IF NOT EXISTS template_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- =============================================
-- RLS
-- =============================================

ALTER TABLE body_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "body_weights: own data" ON body_weights
  FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "workout_templates: own data" ON workout_templates
  FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "template_exercises: own data" ON template_exercises
  FOR ALL TO authenticated
  USING (
    template_id IN (
      SELECT id FROM workout_templates WHERE user_id = auth.uid()
    )
  );

-- exercises: eigene + globale lesbar, eigene schreib-/löschbar
DROP POLICY IF EXISTS "exercises: authenticated read" ON exercises;

CREATE POLICY "exercises: read global and own" ON exercises
  FOR SELECT TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "exercises: insert own" ON exercises
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "exercises: delete own" ON exercises
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
