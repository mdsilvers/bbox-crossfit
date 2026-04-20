-- =====================================================
-- Photo optimization migration
-- =====================================================
-- Adds a generated `has_photo` boolean column to `wods` and `results`
-- so list queries can select it without pulling the base64 `photo_url`
-- payload. The UI reads `has_photo` to decide whether to render a
-- lazy-load thumbnail (which fetches `photo_url` on demand).
--
-- Idempotent: safe to re-run.
-- =====================================================

ALTER TABLE wods
  ADD COLUMN IF NOT EXISTS has_photo BOOLEAN
  GENERATED ALWAYS AS (photo_url IS NOT NULL) STORED;

ALTER TABLE results
  ADD COLUMN IF NOT EXISTS has_photo BOOLEAN
  GENERATED ALWAYS AS (photo_url IS NOT NULL) STORED;
