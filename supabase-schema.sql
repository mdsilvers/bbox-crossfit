-- BBOX CrossFit Supabase Schema
-- Run this in your Supabase SQL Editor to set up the database

-- ==================== TABLES ====================

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('coach', 'athlete')),
  group_type TEXT CHECK (group_type IN ('mens', 'womens')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- WODs table (Workouts of the Day)
CREATE TABLE IF NOT EXISTS wods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  date DATE NOT NULL,
  type TEXT NOT NULL,
  group_type TEXT NOT NULL CHECK (group_type IN ('combined', 'mens', 'womens')),
  movements JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  posted_by UUID REFERENCES profiles(id),
  posted_by_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, group_type)
);

-- Results table (Athlete Workout Results)
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(athlete_id, date)
);

-- Migration: Add custom WOD fields to existing results table
-- ALTER TABLE results ADD COLUMN IF NOT EXISTS custom_wod_name TEXT;
-- ALTER TABLE results ADD COLUMN IF NOT EXISTS custom_wod_type TEXT;

-- Migration: Add rx column to results
-- ALTER TABLE results ADD COLUMN IF NOT EXISTS rx BOOLEAN DEFAULT true;

-- ==================== SOCIAL ENGAGEMENT TABLES ====================

-- Reactions on workout results (fist bumps, fire, etc.)
CREATE TABLE IF NOT EXISTS result_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id UUID NOT NULL REFERENCES results(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT 'fist_bump'
    CHECK (reaction_type IN ('fist_bump', 'fire', 'strong', 'trophy')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(result_id, user_id, reaction_type)
);

-- Comments on workout results
CREATE TABLE IF NOT EXISTS result_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id UUID NOT NULL REFERENCES results(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL CHECK (author_role IN ('coach', 'athlete')),
  body TEXT NOT NULL CHECK (char_length(body) <= 500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Badges earned by users
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_key)
);

-- Migration: Add streak columns to profiles
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS streak_weeks INTEGER DEFAULT 0;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS best_streak_weeks INTEGER DEFAULT 0;

-- ==================== ROW LEVEL SECURITY ====================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wods ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles viewable by all authenticated users"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- WODs policies
CREATE POLICY "WODs viewable by all authenticated users"
  ON wods FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Coaches can insert WODs"
  ON wods FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

CREATE POLICY "Coaches can update WODs"
  ON wods FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

CREATE POLICY "Coaches can delete WODs"
  ON wods FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

-- Results policies
CREATE POLICY "Results viewable by all authenticated users"
  ON results FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own results"
  ON results FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = athlete_id);

CREATE POLICY "Users can update own results"
  ON results FOR UPDATE
  TO authenticated
  USING (auth.uid() = athlete_id);

CREATE POLICY "Users can delete own results"
  ON results FOR DELETE
  TO authenticated
  USING (auth.uid() = athlete_id);

-- Social engagement tables RLS
ALTER TABLE result_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE result_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reactions viewable by authenticated"
  ON result_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own reactions"
  ON result_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own reactions"
  ON result_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Comments viewable by authenticated"
  ON result_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own comments"
  ON result_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users delete own comments"
  ON result_comments FOR DELETE TO authenticated USING (auth.uid() = author_id);

CREATE POLICY "Badges viewable by authenticated"
  ON user_badges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own badges"
  ON user_badges FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ==================== INDEXES ====================

-- Improve query performance
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

-- ==================== TRIGGERS ====================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wods_updated_at
  BEFORE UPDATE ON wods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_results_updated_at
  BEFORE UPDATE ON results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==================== AUTO-CREATE PROFILE ON SIGNUP ====================

-- This function automatically creates a profile when a new user signs up
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

-- Trigger to call the function when a new user is created in auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
