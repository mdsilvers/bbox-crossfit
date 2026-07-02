# BBOX CrossFit

React/Vite gym-management app for BBOX CrossFit. Coaches program WODs and strength cycles; athletes log scores, photos, comments, reactions, badges, PRs, and body composition.

## Supabase Projects

There are two separate Supabase projects in normal use:

- **Bbox app**: development/test project. Use this for local testing, E2E seed users, schema experiments, and non-production verification.
- **bbox production**: live production project. Treat this as protected production data.

Use the same schema files for both projects, but apply migrations deliberately to each project. Do not assume a migration run against **Bbox app** has also been run against **bbox production**.

## Environment Files

- `npm run dev` uses the default Vite environment, typically `.env`, and may point at production if configured that way.
- `npx vite --mode test` and Playwright use `.env.test`, which should point at the Bbox app test/development Supabase project.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` select the active Supabase project.

Before running mutations, seed scripts, cleanup scripts, or E2E tests, confirm the environment points at the intended project.

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

Use `docs/supabase-project-checks.sql` as the read-only verification checklist for comparing **Bbox app** and **bbox production** before or after applying migrations.

## Production Safety

Never run cleanup, destructive SQL, seed resets, or test scripts against **bbox production**. For production data changes, prepare SQL for review and execute it manually in Supabase after confirming the target project.
