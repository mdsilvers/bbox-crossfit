-- Workout Mode Migration: boolean rx -> text workout mode (rx, train, sweat)
-- Run this in Supabase SQL Editor

-- Step 1: Add new text column
ALTER TABLE results ADD COLUMN IF NOT EXISTS rx_mode TEXT DEFAULT 'rx';

-- Step 2: Migrate existing boolean data
UPDATE results SET rx_mode = CASE
  WHEN rx = true THEN 'rx'
  WHEN rx = false THEN 'train'
  ELSE 'rx'
END;

-- Step 3: Drop old boolean column and rename new one
ALTER TABLE results DROP COLUMN IF EXISTS rx;
ALTER TABLE results RENAME COLUMN rx_mode TO rx;

-- Step 4: Set default
ALTER TABLE results ALTER COLUMN rx SET DEFAULT 'rx';
