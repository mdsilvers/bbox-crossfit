-- ================================================================
-- BBOX CrossFit — Strength Programs Migration
-- Run this in the Supabase SQL Editor for your PRODUCTION project.
-- Safe to run multiple times (all operations use IF NOT EXISTS).
-- This is ADDITIVE ONLY — no existing data is modified or deleted.
-- ================================================================

-- ==================== 1. NEW COLUMNS ON EXISTING TABLES ====================

-- Add strength program link to WODs
ALTER TABLE wods ADD COLUMN IF NOT EXISTS strength_program_id UUID;
ALTER TABLE wods ADD COLUMN IF NOT EXISTS program_session_override INTEGER;

-- Add strength score to results (Part A score)
ALTER TABLE results ADD COLUMN IF NOT EXISTS strength_score TEXT;

-- ==================== 2. NEW TABLES ====================

-- Strength programs (e.g., "Old School Squat Routine")
CREATE TABLE IF NOT EXISTS strength_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  exercise TEXT NOT NULL,
  duration_weeks INTEGER NOT NULL,
  sessions_per_week INTEGER NOT NULL,
  total_sessions INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  created_by UUID REFERENCES profiles(id),
  created_by_name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK from wods to strength_programs (after table exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'wods_strength_program_id_fkey'
  ) THEN
    ALTER TABLE wods ADD CONSTRAINT wods_strength_program_id_fkey
      FOREIGN KEY (strength_program_id) REFERENCES strength_programs(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Individual sessions within a program
CREATE TABLE IF NOT EXISTS program_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES strength_programs(id) ON DELETE CASCADE,
  session_number INTEGER NOT NULL,
  sets INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  percentage NUMERIC(5,1) NOT NULL,
  notes TEXT,
  UNIQUE(program_id, session_number)
);

-- Athlete enrollment in active program (1RM + progress)
CREATE TABLE IF NOT EXISTS athlete_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES strength_programs(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  one_rep_max NUMERIC(6,1) NOT NULL,
  current_session INTEGER NOT NULL DEFAULT 1,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(program_id, athlete_id)
);

-- ==================== 3. ROW LEVEL SECURITY ====================

ALTER TABLE strength_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE athlete_enrollments ENABLE ROW LEVEL SECURITY;

-- Strength programs: all read, coaches write
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Programs viewable by authenticated') THEN
    CREATE POLICY "Programs viewable by authenticated" ON strength_programs FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Coaches insert programs') THEN
    CREATE POLICY "Coaches insert programs" ON strength_programs FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Coaches update programs') THEN
    CREATE POLICY "Coaches update programs" ON strength_programs FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Coaches delete programs') THEN
    CREATE POLICY "Coaches delete programs" ON strength_programs FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));
  END IF;
END $$;

-- Program sessions: all read, coaches write
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Sessions viewable by authenticated') THEN
    CREATE POLICY "Sessions viewable by authenticated" ON program_sessions FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Coaches insert sessions') THEN
    CREATE POLICY "Coaches insert sessions" ON program_sessions FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Coaches update sessions') THEN
    CREATE POLICY "Coaches update sessions" ON program_sessions FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Coaches delete sessions') THEN
    CREATE POLICY "Coaches delete sessions" ON program_sessions FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));
  END IF;
END $$;

-- Athlete enrollments: all read, users write own
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enrollments viewable by authenticated') THEN
    CREATE POLICY "Enrollments viewable by authenticated" ON athlete_enrollments FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users insert own enrollment') THEN
    CREATE POLICY "Users insert own enrollment" ON athlete_enrollments FOR INSERT TO authenticated WITH CHECK (auth.uid() = athlete_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users update own enrollment') THEN
    CREATE POLICY "Users update own enrollment" ON athlete_enrollments FOR UPDATE TO authenticated USING (auth.uid() = athlete_id);
  END IF;
END $$;

-- ==================== 4. INDEXES ====================

CREATE INDEX IF NOT EXISTS idx_program_sessions_program ON program_sessions(program_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_program ON athlete_enrollments(program_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_athlete ON athlete_enrollments(athlete_id);
CREATE INDEX IF NOT EXISTS idx_wods_program ON wods(strength_program_id);

-- ==================== 5. TRIGGERS ====================

-- updated_at triggers (safe: CREATE OR REPLACE)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_strength_programs_updated_at') THEN
    CREATE TRIGGER update_strength_programs_updated_at
      BEFORE UPDATE ON strength_programs
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_enrollments_updated_at') THEN
    CREATE TRIGGER update_enrollments_updated_at
      BEFORE UPDATE ON athlete_enrollments
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ==================== 6. VERIFICATION ====================

-- Run these queries after migration to verify everything worked:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'wods' AND column_name IN ('strength_program_id', 'program_session_override');
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'results' AND column_name = 'strength_score';
-- SELECT table_name FROM information_schema.tables WHERE table_name IN ('strength_programs', 'program_sessions', 'athlete_enrollments');
-- SELECT policyname FROM pg_policies WHERE tablename IN ('strength_programs', 'program_sessions', 'athlete_enrollments');
