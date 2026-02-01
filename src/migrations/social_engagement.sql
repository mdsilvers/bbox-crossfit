-- Social & Engagement Migration
-- Run this in Supabase SQL Editor

-- ==================== 1a. Add rx column to results ====================
ALTER TABLE results ADD COLUMN IF NOT EXISTS rx BOOLEAN DEFAULT true;

-- ==================== 1b. Create result_reactions table ====================
CREATE TABLE IF NOT EXISTS result_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id UUID NOT NULL REFERENCES results(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT 'fist_bump'
    CHECK (reaction_type IN ('fist_bump', 'fire', 'strong', 'trophy')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(result_id, user_id, reaction_type)
);

ALTER TABLE result_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reactions viewable by authenticated"
  ON result_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own reactions"
  ON result_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own reactions"
  ON result_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_reactions_result_id ON result_reactions(result_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON result_reactions(user_id);

-- ==================== 1c. Create result_comments table ====================
CREATE TABLE IF NOT EXISTS result_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id UUID NOT NULL REFERENCES results(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL CHECK (author_role IN ('coach', 'athlete')),
  body TEXT NOT NULL CHECK (char_length(body) <= 500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE result_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments viewable by authenticated"
  ON result_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own comments"
  ON result_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users delete own comments"
  ON result_comments FOR DELETE TO authenticated USING (auth.uid() = author_id);

CREATE INDEX IF NOT EXISTS idx_comments_result_id ON result_comments(result_id);

-- ==================== 1d. Create user_badges table ====================
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_key)
);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Badges viewable by authenticated"
  ON user_badges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own badges"
  ON user_badges FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_badges_user_id ON user_badges(user_id);

-- ==================== 1e. Add streak columns to profiles ====================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS streak_weeks INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS best_streak_weeks INTEGER DEFAULT 0;
