-- ================================================================
-- BBOX CrossFit — Production Schema (consolidated)
-- Run this once in the Supabase SQL Editor for a fresh project.
-- ================================================================


-- ==================== 1. TABLES ====================

-- 1a. Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('coach', 'athlete')),
  group_type TEXT CHECK (group_type IN ('mens', 'womens')),
  streak_weeks INTEGER DEFAULT 0,
  best_streak_weeks INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== STRENGTH PROGRAM TABLES ====================

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

-- 1b. WODs (Workouts of the Day)
CREATE TABLE IF NOT EXISTS wods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  date DATE NOT NULL,
  type TEXT NOT NULL,
  group_type TEXT NOT NULL CHECK (group_type IN ('combined', 'mens', 'womens')),
  movements JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  photo_url TEXT,
  posted_by UUID REFERENCES profiles(id),
  posted_by_name TEXT NOT NULL,
  strength_program_id UUID REFERENCES strength_programs(id) ON DELETE SET NULL,
  program_session_override INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, group_type)
);

-- 1c. Results (Athlete Workout Results)
CREATE TABLE IF NOT EXISTS results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wod_id UUID REFERENCES wods(id) ON DELETE SET NULL,
  athlete_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  athlete_name TEXT NOT NULL,
  athlete_email TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT,
  movements JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  photo_url TEXT,
  custom_wod_name TEXT,
  custom_wod_type TEXT,
  rx TEXT DEFAULT 'rx',
  strength_score TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(athlete_id, date)
);

-- 1d. Result Reactions (fist bumps, fire, etc.)
CREATE TABLE IF NOT EXISTS result_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id UUID NOT NULL REFERENCES results(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT 'fist_bump'
    CHECK (reaction_type IN ('fist_bump', 'fire', 'strong', 'trophy')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(result_id, user_id, reaction_type)
);

-- 1e. Result Comments
CREATE TABLE IF NOT EXISTS result_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id UUID NOT NULL REFERENCES results(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL CHECK (author_role IN ('coach', 'athlete')),
  body TEXT NOT NULL CHECK (char_length(body) <= 500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1f. User Badges
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_key)
);

-- 1g. Body Measurements
CREATE TABLE IF NOT EXISTS body_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  measured_at DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kgs DECIMAL(5,1),
  body_fat_pct DECIMAL(4,1),
  chest_in DECIMAL(4,1),
  waist_in DECIMAL(4,1),
  hips_in DECIMAL(4,1),
  left_arm_in DECIMAL(4,1),
  right_arm_in DECIMAL(4,1),
  left_thigh_in DECIMAL(4,1),
  right_thigh_in DECIMAL(4,1),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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


-- ==================== 2. ROW LEVEL SECURITY ====================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wods ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE result_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE result_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE strength_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE athlete_enrollments ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Profiles viewable by all authenticated users"
  ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- WODs
CREATE POLICY "WODs viewable by all authenticated users"
  ON wods FOR SELECT TO authenticated USING (true);
CREATE POLICY "Coaches can insert WODs"
  ON wods FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));
CREATE POLICY "Coaches can update WODs"
  ON wods FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));
CREATE POLICY "Coaches can delete WODs"
  ON wods FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));

-- Results
CREATE POLICY "Results viewable by all authenticated users"
  ON results FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own results"
  ON results FOR INSERT TO authenticated WITH CHECK (auth.uid() = athlete_id);
CREATE POLICY "Users can update own results"
  ON results FOR UPDATE TO authenticated USING (auth.uid() = athlete_id);
CREATE POLICY "Users can delete own results"
  ON results FOR DELETE TO authenticated USING (auth.uid() = athlete_id);

-- Reactions
CREATE POLICY "Reactions viewable by authenticated"
  ON result_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own reactions"
  ON result_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own reactions"
  ON result_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Comments
CREATE POLICY "Comments viewable by authenticated"
  ON result_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own comments"
  ON result_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users delete own comments"
  ON result_comments FOR DELETE TO authenticated USING (auth.uid() = author_id);

-- Badges
CREATE POLICY "Badges viewable by authenticated"
  ON user_badges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own badges"
  ON user_badges FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Body Measurements
CREATE POLICY "Users can manage their own measurements"
  ON body_measurements FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Coaches can view athlete measurements"
  ON body_measurements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles coach, profiles athlete
      WHERE coach.id = auth.uid() AND coach.role = 'coach'
      AND athlete.id = body_measurements.user_id AND athlete.role = 'athlete'
    )
  );

-- Strength programs RLS
CREATE POLICY "Programs viewable by authenticated" ON strength_programs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Coaches insert programs" ON strength_programs FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));
CREATE POLICY "Coaches update programs" ON strength_programs FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));
CREATE POLICY "Coaches delete programs" ON strength_programs FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));

-- Program sessions RLS
CREATE POLICY "Sessions viewable by authenticated" ON program_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Coaches insert sessions" ON program_sessions FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));
CREATE POLICY "Coaches update sessions" ON program_sessions FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));
CREATE POLICY "Coaches delete sessions" ON program_sessions FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));

-- Athlete enrollments RLS
CREATE POLICY "Enrollments viewable by authenticated" ON athlete_enrollments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own enrollment" ON athlete_enrollments FOR INSERT TO authenticated WITH CHECK (auth.uid() = athlete_id);
CREATE POLICY "Users update own enrollment" ON athlete_enrollments FOR UPDATE TO authenticated USING (auth.uid() = athlete_id);
-- Coaches can bulk-override sessions; without this the override silently no-ops
CREATE POLICY "Coaches update any enrollment" ON athlete_enrollments FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));


-- ==================== 3. INDEXES ====================

CREATE INDEX IF NOT EXISTS idx_wods_date ON wods(date);
CREATE INDEX IF NOT EXISTS idx_wods_group_type ON wods(group_type);
CREATE INDEX IF NOT EXISTS idx_wods_date_group ON wods(date, group_type);
CREATE INDEX IF NOT EXISTS idx_results_athlete_id ON results(athlete_id);
CREATE INDEX IF NOT EXISTS idx_results_date ON results(date);
CREATE INDEX IF NOT EXISTS idx_results_athlete_date ON results(athlete_id, date);
CREATE INDEX IF NOT EXISTS idx_reactions_result_id ON result_reactions(result_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON result_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_result_id ON result_comments(result_id);
CREATE INDEX IF NOT EXISTS idx_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_program_sessions_program ON program_sessions(program_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_program ON athlete_enrollments(program_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_athlete ON athlete_enrollments(athlete_id);
CREATE INDEX IF NOT EXISTS idx_wods_program ON wods(strength_program_id);

-- At most one active strength program (activateProgram is two updates; this
-- closes the race that could leave two active and break getActiveProgram)
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_program
  ON strength_programs (status)
  WHERE status = 'active';

-- Generated photo flags — list queries select has_photo instead of pulling
-- the base64 photo_url payload (see src/lib/database.js LIST_COLUMNS)
ALTER TABLE wods
  ADD COLUMN IF NOT EXISTS has_photo BOOLEAN
  GENERATED ALWAYS AS (photo_url IS NOT NULL) STORED;

ALTER TABLE results
  ADD COLUMN IF NOT EXISTS has_photo BOOLEAN
  GENERATED ALWAYS AS (photo_url IS NOT NULL) STORED;


-- ==================== 4. TRIGGERS ====================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wods_updated_at
  BEFORE UPDATE ON wods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_results_updated_at
  BEFORE UPDATE ON results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_strength_programs_updated_at
  BEFORE UPDATE ON strength_programs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enrollments_updated_at
  BEFORE UPDATE ON athlete_enrollments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ==================== 5. AUTO-CREATE PROFILE ON SIGNUP ====================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, group_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    'athlete',  -- never trust client-supplied role; promote coaches manually
    NEW.raw_user_meta_data->>'group_type'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Users can update their own profile but never their own role — promotions
-- happen via the SQL Editor / service role, where auth.uid() is NULL
CREATE OR REPLACE FUNCTION public.prevent_role_self_change()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'role can only be changed by an administrator';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_role_self_change ON profiles;
CREATE TRIGGER prevent_role_self_change
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_change();


-- ==================== 6. STAMP COMMENT AUTHOR SERVER-SIDE ====================
-- author_name/author_role come from the caller's profile, not the request
-- body — prevents spoofed coach badges and impersonated names

CREATE OR REPLACE FUNCTION public.set_comment_author()
RETURNS TRIGGER AS $$
BEGIN
  SELECT name, role INTO NEW.author_name, NEW.author_role
  FROM public.profiles WHERE id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_comment_author ON result_comments;
CREATE TRIGGER set_comment_author
  BEFORE INSERT ON result_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_comment_author();
