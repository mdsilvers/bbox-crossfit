-- =====================================================
-- Audit fixes migration — June 2026
-- =====================================================
-- Additive and idempotent: safe to re-run, deletes nothing.
-- Run in the Supabase SQL Editor on the production project,
-- then on the test project used for E2E runs.
--
-- Fixes:
--   1. Privilege escalation: signup metadata could self-assign 'coach'
--   1b. Privilege escalation: own-profile UPDATE could self-assign 'coach'
--   2. Coach "override all athletes to session N" silently no-ops (RLS)
--   3. No DB invariant for "one active strength program"
--   4. Comment author name/role were client-supplied (spoofable)
--   5. has_photo generated columns (no-op if photo migration already ran)
-- =====================================================


-- ==================== 1. HARDEN SIGNUP TRIGGER ====================
-- raw_user_meta_data comes from the client signup call, so trusting its
-- 'role' key let anyone create a coach account. Everyone now starts as an
-- athlete; promote coaches manually:
--   UPDATE profiles SET role = 'coach' WHERE email = 'coach@example.com';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, group_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    'athlete',  -- never trust client-supplied role
    NEW.raw_user_meta_data->>'group_type'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==================== 1b. BLOCK ROLE SELF-PROMOTION ====================
-- The "Users can update own profile" policy has no column restriction, so an
-- athlete could still self-promote with a direct UPDATE on their own row.
-- auth.uid() is NULL in the SQL Editor / for service-role calls, so admin
-- promotions keep working.

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


-- ==================== 2. COACH ENROLLMENT OVERRIDE ====================
-- The only UPDATE policy on athlete_enrollments was "own row", so the coach
-- bulk override updated nothing (RLS filters rows silently, no error).
-- Permissive policies are OR'd, so this adds coach access without touching
-- the athletes' own-row policy.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'athlete_enrollments'
      AND policyname = 'Coaches update any enrollment'
  ) THEN
    CREATE POLICY "Coaches update any enrollment"
      ON athlete_enrollments FOR UPDATE TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));
  END IF;
END $$;


-- ==================== 3. ONE ACTIVE PROGRAM INVARIANT ====================
-- activateProgram is two sequential updates; a race can leave two programs
-- active, which used to crash getActiveProgram for everyone. Enforce the
-- invariant at the DB level.
--
-- If this CREATE INDEX fails with a uniqueness violation, two programs are
-- already active. Check with:
--   SELECT id, name, status, updated_at FROM strength_programs WHERE status = 'active';
-- and mark the stale one completed yourself before re-running:
--   UPDATE strength_programs SET status = 'completed' WHERE id = '<stale-id>';

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_program
  ON strength_programs (status)
  WHERE status = 'active';


-- ==================== 4. STAMP COMMENT AUTHOR SERVER-SIDE ====================
-- author_name and author_role were inserted verbatim from the client, so a
-- crafted request could post comments with a 'coach' badge or another name.
-- Stamp both from the caller's profile on insert.

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


-- ==================== 5. has_photo GENERATED COLUMNS ====================
-- Required by every list query in src/lib/database.js. Already present if
-- supabase-migration-photo-optimization.sql ran; no-op in that case.

ALTER TABLE wods
  ADD COLUMN IF NOT EXISTS has_photo BOOLEAN
  GENERATED ALWAYS AS (photo_url IS NOT NULL) STORED;

ALTER TABLE results
  ADD COLUMN IF NOT EXISTS has_photo BOOLEAN
  GENERATED ALWAYS AS (photo_url IS NOT NULL) STORED;
