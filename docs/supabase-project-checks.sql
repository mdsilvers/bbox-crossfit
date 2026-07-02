-- BBOX CrossFit Supabase project verification
-- Run these read-only checks separately in both Supabase SQL Editors:
--   1. Bbox app
--   2. bbox production
--
-- These statements do not mutate data.

select
  current_database() as database_name,
  current_user as checked_as,
  now() as checked_at;

select
  table_name,
  column_name,
  data_type,
  is_generated,
  generation_expression
from information_schema.columns
where table_schema = 'public'
  and table_name in ('wods', 'results')
  and column_name in ('photo_url', 'has_photo')
order by table_name, column_name;

select
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'profiles',
    'wods',
    'results',
    'result_reactions',
    'result_comments',
    'user_badges',
    'body_measurements',
    'strength_programs',
    'program_sessions',
    'athlete_enrollments'
  )
order by tablename;

select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('wods', 'results', 'strength_programs', 'program_sessions', 'athlete_enrollments')
order by tablename, indexname;

select
  status,
  count(*) as program_count
from public.strength_programs
group by status
order by status;

select
  id,
  name,
  exercise,
  created_at,
  updated_at
from public.strength_programs
where status = 'active'
order by updated_at desc nulls last, created_at desc;
