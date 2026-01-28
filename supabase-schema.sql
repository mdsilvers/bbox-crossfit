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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(athlete_id, date)
);

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

-- ==================== INDEXES ====================

-- Improve query performance
CREATE INDEX IF NOT EXISTS idx_wods_date ON wods(date);
CREATE INDEX IF NOT EXISTS idx_wods_group_type ON wods(group_type);
CREATE INDEX IF NOT EXISTS idx_wods_date_group ON wods(date, group_type);
CREATE INDEX IF NOT EXISTS idx_results_athlete_id ON results(athlete_id);
CREATE INDEX IF NOT EXISTS idx_results_date ON results(date);
CREATE INDEX IF NOT EXISTS idx_results_athlete_date ON results(athlete_id, date);

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
