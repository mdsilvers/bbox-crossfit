# BBOX CrossFit

React/Vite gym-management app for BBOX CrossFit. Coaches program WODs and strength cycles; athletes log scores, photos, comments, reactions, badges, PRs, and body composition.

## Supabase Environments

- **Local test stack**: E2E tests, seed users, and schema experiments run against a
  local Supabase stack (`supabase start`, Docker required). Config lives in
  `supabase/config.toml` (API on port 55321, Postgres on 55322 — the 553xx range
  avoids clashing with other local Supabase projects). Migrations in
  `supabase/migrations/` mirror `supabase-schema-prod.sql`.
- **BBOX Production**: live production project. Treat this as protected production data.

Apply migrations deliberately to each environment. Do not assume a migration run
locally has also been run against **BBOX Production**.

## Environment Files

- `npm run dev` uses the default Vite environment, typically `.env`, and may point at production if configured that way.
- `npx vite --mode test` and Playwright use `.env.test`, which points at the local Supabase stack.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` select the active Supabase target.

Before running mutations, seed scripts, cleanup scripts, or E2E tests, confirm the environment points at the intended target.

## Commands

```bash
npm install
npm run dev
npm run build
npm run lint
npm run test
npm run test:e2e
npm run test:seed
npm run test:cleanup
```

## Database Setup

For a fresh Supabase project:

1. Run `supabase-schema-prod.sql`.
2. Run any migration files not already reflected in the target project.
3. Enable Realtime for `results` if leaderboard updates are needed.
4. Configure Auth email confirmation/SMTP as appropriate for that project.

`supabase-schema-prod.sql` is the consolidated schema for new projects. Migration files remain useful for bringing an existing project up to date without rebuilding it.

Use `docs/supabase-project-checks.sql` as the read-only verification checklist for comparing the local stack and **BBOX Production** before or after applying migrations.

## Production Safety

Never run cleanup, destructive SQL, seed resets, or test scripts against **BBOX Production**. For production data changes, prepare SQL for review and execute it manually in Supabase after confirming the target project.
