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


-- ==================== 2. ROW LEVEL SECURITY ====================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wods ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE result_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE result_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;

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


-- ==================== 5. AUTO-CREATE PROFILE ON SIGNUP ====================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, group_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'athlete'),
    NEW.raw_user_meta_data->>'group_type'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
