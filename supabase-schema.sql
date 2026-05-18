-- =============================================
-- FitTrack – Supabase Schema
-- Führe dieses Script im Supabase SQL Editor aus
-- =============================================

-- Exercises: vordefinierte Übungen (keine user_id)
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL
);

-- Workouts: eine Session pro User/Tag/Split
CREATE TABLE IF NOT EXISTS workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  split_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Workout Logs: einzelne Sätze in einem Workout
CREATE TABLE IF NOT EXISTS workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id),
  weight NUMERIC(6,2) NOT NULL,
  reps INTEGER NOT NULL,
  sets INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Calories: Kalorien-Einträge per User/Tag
CREATE TABLE IF NOT EXISTS calories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  food_text TEXT NOT NULL,
  total_kcal INTEGER NOT NULL,
  protein INTEGER NOT NULL DEFAULT 0,
  carbs INTEGER NOT NULL DEFAULT 0,
  fat INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- Row Level Security
-- =============================================

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE calories ENABLE ROW LEVEL SECURITY;

-- exercises: alle eingeloggten User dürfen lesen
CREATE POLICY "exercises: authenticated read" ON exercises
  FOR SELECT TO authenticated USING (true);

-- workouts: nur eigene Daten
CREATE POLICY "workouts: own data" ON workouts
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- workout_logs: über workout_id auf eigene Daten beschränken
CREATE POLICY "workout_logs: own data" ON workout_logs
  FOR ALL TO authenticated
  USING (
    workout_id IN (
      SELECT id FROM workouts WHERE user_id = auth.uid()
    )
  );

-- calories: nur eigene Daten
CREATE POLICY "calories: own data" ON calories
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- =============================================
-- Seed: Beispiel-Übungen
-- =============================================

INSERT INTO exercises (name, category) VALUES
  -- Brust
  ('Bankdrücken', 'Brust'),
  ('Schrägbankdrücken', 'Brust'),
  ('Fliegende', 'Brust'),
  ('Kabelzüge Brust', 'Brust'),
  ('Dips', 'Brust'),

  -- Rücken
  ('Klimmzüge', 'Rücken'),
  ('Latzug', 'Rücken'),
  ('Rudern', 'Rücken'),
  ('T-Bar Rudern', 'Rücken'),
  ('Kreuzheben', 'Rücken'),

  -- Schultern
  ('Schulterdrücken', 'Schultern'),
  ('Seitheben', 'Schultern'),
  ('Frontheben', 'Schultern'),
  ('Face Pulls', 'Schultern'),

  -- Arme
  ('Bizeps Curls', 'Arme'),
  ('Hammer Curls', 'Arme'),
  ('Trizeps Pushdown', 'Arme'),
  ('Trizeps Dips', 'Arme'),
  ('Skull Crusher', 'Arme'),

  -- Beine
  ('Kniebeugen', 'Beine'),
  ('Beinpresse', 'Beine'),
  ('Beinstrecker', 'Beine'),
  ('Beinbeuger', 'Beine'),
  ('Wadenheben', 'Beine'),
  ('Romanian Deadlift', 'Beine'),

  -- Core
  ('Plank', 'Core'),
  ('Crunch', 'Core'),
  ('Leg Raises', 'Core'),
  ('Cable Crunch', 'Core')

ON CONFLICT DO NOTHING;
