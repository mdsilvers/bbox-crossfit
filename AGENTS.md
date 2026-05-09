# BBOX CrossFit App

## Project Overview

BBOX CrossFit is a React-based gym management app for CrossFit boxes. Coaches program WODs (Workouts of the Day) and athletes log their results. Includes social features (reactions, comments, leaderboard), gamification (badges, streaks), and analytics (progress charts, body composition tracking).

**Status:** Production Ready
**Lines of Code:** ~13,200 (58 source files)
**Architecture:** Modular components + custom hooks

---

## Tech Stack

- **Framework:** React 19 with Hooks (useState, useEffect, useContext, useCallback, useRef)
- **Styling:** Tailwind CSS v4 (utility classes only)
- **Icons:** lucide-react
- **Charts:** Recharts
- **Drag & Drop:** @dnd-kit (core, sortable, utilities)
- **Dates:** date-fns
- **Backend:** Supabase (Auth + PostgreSQL + Row Level Security + Realtime)
- **Build:** Vite 7

---

## Quick Commands

```bash
# Development
npm run dev              # Start dev server at localhost:5173 (production DB)
npx vite --mode test     # Start dev server with test DB (.env.test)

# Production
npm run build            # Build to dist/
npm run preview          # Preview production build

# Testing
npm run test             # Run unit tests (Vitest)
npm run test:e2e         # Run E2E tests (Playwright, headless)
npm run test:e2e:headed  # Run E2E tests (visible browser)
npm run test:all         # Run unit + E2E tests
npm run test:regression  # Same as test:all with pass/fail summary
npm run test:seed        # Create test users in test database
npm run test:cleanup     # Remove test data (preserves users)

# Dependencies
npm install              # Install all deps
```

---

## Architecture

### Entry Point
```
main.jsx → AuthProvider → App.jsx → SplashScreen (while auth initializing)
                                  → CoachDashboard | AthleteDashboard | AuthScreen
```

### Component Structure
Modular component tree with role-based routing in `App.jsx`:
- **Unauthenticated:** AuthScreen (Login, Signup, ForgotPassword, ResetPassword)
- **Coach:** CoachDashboard with tabs: Dashboard, Workout, Program, Athletes, History, Progress
- **Athlete:** AthleteDashboard with tabs: Dashboard, Workout, History, Progress

### State Management
Business logic lives in custom hooks, consumed by dashboard components:
- `useWorkouts` — WOD CRUD, movement management, coach operations
- `useResults` — Result CRUD, custom workouts, edit/delete flows
- `useSocial` — Reactions + comments with optimistic updates
- `useBadges` — Badge checking, awarding, streak tracking
- `useLeaderboard` — Realtime leaderboard with Supabase subscriptions
- `useBenchmarkPRs` — PR calculation from benchmark WOD results
- `useStrengthProgram` — Program CRUD, enrollment, session resolution, 1RM management

```javascript
// CRITICAL: Two separate result states (in useResults hook)
workoutResults      // Current user's results only (personal stats)
allAthleteResults   // All results (coach views like Athletes tab)
```
This separation is essential — using `workoutResults` for coach views will show incomplete data.

### Database Schema (Supabase)
```sql
-- Core tables
profiles (id, email, name, role, group_type, streak_weeks, best_streak_weeks, created_at, updated_at)
wods (id, name, date, type, group_type, movements, notes, photo_url, posted_by, posted_by_name, strength_program_id, program_session_override, created_at, updated_at)
results (id, wod_id, athlete_id, athlete_name, athlete_email, date, time, movements, notes, photo_url, custom_wod_name, custom_wod_type, rx, strength_score, created_at, updated_at)

-- Strength program tables
strength_programs (id, name, exercise, duration_weeks, sessions_per_week, total_sessions, status, created_by, created_by_name, notes, created_at, updated_at)
program_sessions (id, program_id, session_number, sets, reps, percentage, notes)
athlete_enrollments (id, program_id, athlete_id, one_rep_max, current_session, enrolled_at, updated_at)

-- Social tables
result_reactions (id, result_id, user_id, reaction_type, created_at)
result_comments (id, result_id, author_id, author_name, author_role, body, created_at)
user_badges (id, user_id, badge_key, earned_at)

-- Body composition (not yet in schema file — needs migration)
body_measurements (id, user_id, measured_at, weight_kgs, body_fat_pct, chest_in, waist_in, hips_in, left_arm_in, right_arm_in, left_thigh_in, right_thigh_in, notes)

-- Key constraints
-- wods: UNIQUE(date, group_type)
-- results: UNIQUE(athlete_id, date)
-- result_reactions: UNIQUE(result_id, user_id, reaction_type)
-- user_badges: UNIQUE(user_id, badge_key)
```

### Row Level Security
- **profiles:** All authenticated can read, users can only update own
- **wods:** All authenticated can read, only coaches can write
- **results:** All authenticated can read, users can only write own
- **result_reactions:** All authenticated can read, users can only insert/delete own
- **result_comments:** All authenticated can read, users can only insert/delete own
- **user_badges:** All authenticated can read, users can only insert own
- **strength_programs:** All authenticated can read, only coaches can write
- **program_sessions:** All authenticated can read, only coaches can write
- **athlete_enrollments:** All authenticated can read, users can only insert/update own

---

## File Locations

```
src/
├── App.jsx                         # Root router (auth/coach/athlete)
├── main.jsx                        # React entry point + AuthProvider
├── index.css                       # Tailwind imports + custom utilities
│
├── contexts/
│   └── AuthContext.jsx             # Auth state, login/signup/password flows
│
├── hooks/
│   ├── useWorkouts.js              # WOD CRUD, movement management
│   ├── useResults.js               # Result CRUD, custom workouts
│   ├── useSocial.js                # Reactions + comments (optimistic)
│   ├── useBadges.js                # Badge checking + awarding
│   ├── useLeaderboard.js           # Realtime leaderboard
│   ├── useBenchmarkPRs.js          # PR calculation
│   └── useStrengthProgram.js       # Program CRUD, enrollment, session resolution
│
├── components/
│   ├── auth/
│   │   ├── AuthScreen.jsx          # Auth container (routes login/signup/forgot/reset)
│   │   ├── LoginForm.jsx
│   │   ├── SignupForm.jsx
│   │   ├── ForgotPassword.jsx
│   │   └── ResetPasswordForm.jsx
│   │
│   ├── coach/
│   │   ├── CoachDashboard.jsx      # Coach shell (tabs, hooks, data loading)
│   │   ├── CoachHomeDash.jsx       # Coach home: today's WOD, stats, feed
│   │   ├── CoachWorkoutView.jsx    # Log own workout
│   │   ├── CoachProgramView.jsx    # Post/edit/delete WODs
│   │   ├── CoachAthleteList.jsx    # All athletes + their history
│   │   ├── CoachHistoryView.jsx    # Coach workout history
│   │   └── StrengthProgramManager.jsx # Program creation/management UI
│   │
│   ├── athlete/
│   │   ├── AthleteDashboard.jsx    # Athlete shell (tabs, hooks, data loading)
│   │   ├── AthleteHomeDash.jsx     # Today's WOD, stats, missed WODs, PRs, feed
│   │   ├── AthleteWorkoutView.jsx  # Log workout / custom workout
│   │   ├── AthleteHistoryView.jsx  # Workout history
│   │   └── OneRepMaxPrompt.jsx     # 1RM enrollment/update prompt
│   │
│   ├── shared/
│   │   ├── BBoxLogo.jsx            # App logo
│   │   ├── PhotoModal.jsx          # Full-screen photo viewer
│   │   ├── PhotoUpload.jsx         # Photo upload with preview
│   │   ├── PostWodSummary.jsx      # Post-log summary / workout detail modal
│   │   ├── DeleteConfirmDialog.jsx # Confirmation dialog
│   │   ├── RxToggle.jsx            # RX / Scaled toggle
│   │   └── StrengthPartDisplay.jsx # Part A strength program display
│   │
│   ├── social/
│   │   ├── ActivityFeed.jsx        # Recent activity feed
│   │   ├── Leaderboard.jsx         # Daily leaderboard
│   │   ├── LeaderboardRow.jsx      # Single leaderboard entry
│   │   ├── ReactionBar.jsx         # Emoji reactions (fist bump, fire, etc.)
│   │   ├── CommentBubble.jsx       # Comment count indicator
│   │   ├── CommentThread.jsx       # Comment list + input
│   │   ├── BadgeDisplay.jsx        # Badge grid display
│   │   ├── BadgeIcons.jsx          # Badge icon components
│   │   ├── BadgeToast.jsx          # New badge notification
│   │   └── StreakBadge.jsx         # Streak display
│   │
│   ├── wod/
│   │   └── MovementAutocomplete.jsx # Movement name autocomplete
│   │
│   ├── ScoreInput.jsx              # Type-aware score entry (time/AMRAP/weight/rounds)
│   ├── ProgressDashboard.jsx       # Charts and analytics
│   ├── BodyComposition.jsx         # Body measurement tracking
│   ├── BenchmarkHistory.jsx        # Benchmark attempt history
│   ├── WeeklySummary.jsx           # Weekly workout summary
│   └── PercentileRank.jsx          # Percentile ranking display
│
└── lib/
    ├── database.js                 # All Supabase CRUD + format transformers
    ├── supabase.js                 # Supabase client + password recovery detection
    ├── benchmarks.js               # 46 benchmark WOD definitions
    ├── score-utils.js              # Score parsing/formatting/comparison
    ├── badges.js                   # 8 badge definitions + streak calculation
    ├── stats.js                    # Workout statistics calculation
    └── constants.js                # STANDARD_MOVEMENTS list, getLocalToday()

supabase-schema.sql                 # Database schema (legacy, with migration comments)
supabase-schema-prod.sql            # Consolidated production schema (authoritative)
supabase-migration-strength-programs.sql  # Migration script for strength program tables
```

---

## Key Patterns

### Date-Based Uniqueness
Results use `(athlete_id, date)` as unique constraint ensuring one entry per user per day. Logging again on same day updates existing entry.

### WOD Groups
- `combined` — All athletes
- `mens` — Men's group
- `womens` — Women's group

Athletes see WODs matching their group OR combined. Conflict validation prevents posting combined WOD when group-specific exists (and vice versa).

### Role-Based Views
```javascript
// App.jsx
if (!currentUser) return <AuthScreen />;
if (currentUser.role === 'coach') return <CoachDashboard />;
return <AthleteDashboard />;
```

### Score System
Scores stored as TEXT in `results.time`, with type-aware handling in `score-utils.js`:
- **For Time / Chipper / Metcon** → MM:SS (lower is better)
- **AMRAP** → rounds+reps format (higher is better)
- **Strength** → weight in kgs (higher is better)
- **EMOM / Rounds** → round count (higher is better)
- **Freeform** → any text

### Optimistic Updates
`useSocial` hook uses optimistic updates for reactions and comments — UI updates immediately, reverts on server error.

### Realtime Subscriptions
`useLeaderboard` subscribes to Supabase Realtime for live leaderboard updates when results are added/modified.

### Multi-Part WODs (Strength Programs)
WODs can have a strength program attached as Part A. When `wod.strengthProgramId` is set:
- Part A displays the strength exercise with sets/reps/percentage and calculated working weight
- Part B is the regular WOD (movements, score)
- Results store `strength_score` (Part A) separately from `time` (Part B)
- When editing a workout, look up the WOD from `allWODs` (the `editingWorkout` is a result object, not a WOD — it has `wodId` but not `strengthProgramId`)

### Progressive Dashboard Loading
Dashboards render after just `loadTodayWOD()` + `loadMyResults()` (2-3 queries, ~300ms). All other data (allWODs, allResults, badges, social, missed WODs) loads in the background via fire-and-forget `Promise.all().then()`. This prevents the blank screen while heavy queries complete.

### Auth Initialization
`App.jsx` shows a splash screen (logo + spinner) while `AuthContext` checks for an existing session. This prevents the flash of the login form before auto-redirecting returning users to their dashboard.

### History Sorting
All workout history views are sorted by WOD date (latest first), not by logged/created timestamp.

---

## Features

### Authentication
- Email/password signup with email confirmation
- Login with session persistence (auto-refresh tokens)
- Splash screen during auth initialization (no flash of login form for returning users)
- Forgot password flow (Supabase sends reset email)
- Password recovery redirect detection (captures URL hash before Supabase clears it)
- Auto-logout on session expiration

### Coach Features
- Post WODs (named or unnamed, with workout type)
- Edit/delete WODs (delete blocked if athletes have logged results)
- Coach selector (multiple coaches can post WODs)
- Drag-and-drop movement reordering (@dnd-kit)
- Section headers in movements
- View all athletes and their workout history
- Log own workouts
- WOD conflict validation (combined vs group-specific)
- Benchmark WOD templates (quick-fill from 46 standard CrossFit benchmarks)
- Photo upload for WODs

### Athlete Features
- View today's WOD
- Log workout results with score, weights, notes, photo
- RX / Scaled toggle
- Log custom workouts (when traveling or doing different programming)
- View workout history
- Log missed WODs (past 7 days)
- Edit/delete own results
- Personal Records tracking for benchmark WODs

### Social Features
- **Reactions:** Fist bump, fire, strong, trophy on any workout result
- **Comments:** Threaded comments on workout results (500 char limit)
- **Activity Feed:** Recent workouts and badge earnings across the box
- **Leaderboard:** Daily realtime leaderboard with gender filtering
- **Badges:** 8 achievements (First Blood, Week Warrior, Century Club, Iron Will, Benchmark Beast, PR Machine, The Murph, Sub-7 Fran)
- **Streaks:** Weekly consistency tracking (3+ workouts/week = streak)

### Analytics
- **Progress Dashboard:** Workout frequency charts (Recharts)
- **Body Composition:** Track weight, body fat, measurements over time
- **Weekly Summary:** Week-over-week workout comparison
- **Percentile Rank:** How you compare to other athletes
- **Benchmark History:** All attempts for a given benchmark WOD

### Benchmark WODs
46 standard CrossFit benchmarks stored in `src/lib/benchmarks.js`:
- **Girl WODs** (30): Fran, Cindy, Diane, Grace, Helen, etc.
- **Strength** (10): 3RM Deadlift, 3RM Back Squat, etc.
- **Cardio** (6): 500m Row, 2K Row, 50 Cal Bike, etc.

Coach workflow:
1. In WOD form, select benchmark from dropdown
2. Name, type, and movements auto-fill
3. Yellow "Benchmark" badge displays in history

PR tracking:
- Only coach-posted benchmark WODs count toward PRs
- Custom workouts block benchmark names (validation in `useResults`)
- Athlete dashboard shows Personal Records section

### Strength Programs
- Coach defines multi-week programs (e.g., Old School Squat Routine) with sessions specifying sets x reps x percentage
- One active program at a time, whole box participates
- Athletes enter 1RM, app calculates working weights (rounded to nearest 2.5 kg)
- Completion-based progression through sessions
- Coach can override all athletes to a specific session
- Programs attach as Part A of daily WODs, Part B is the regular WOD
- Two-part scoring: strength_score (Part A weight) + time (Part B score)
- Emerald color scheme distinguishes strength program UI from WOD red and custom violet

### UI Features
- Photo modal (click to view full-screen)
- Workout type badges on all history views (red for coach WODs, violet for custom)
- Benchmark badges (yellow) in history
- Post-workout summary modal
- Movement autocomplete
- Responsive design (mobile-first)

---

## Common Tasks

### Adding a New Movement
Edit `STANDARD_MOVEMENTS` array in `src/lib/constants.js` (auto-sorted alphabetically).

### Changing Logo
Update URL in `src/components/shared/BBoxLogo.jsx`.

### Adding New WOD Type
1. Add to type dropdown in coach WOD form (`CoachProgramView.jsx`)
2. Add score category mapping in `src/lib/score-utils.js` → `getScoreCategory()`
3. Type badge displays automatically in history views

### Adding a New Badge
Add badge definition to `BADGES` array in `src/lib/badges.js` with `key`, `name`, `description`, `icon`, `color`, `bgColor`, and `check` function.

### Adding New Tailwind Utilities
Add to `src/index.css` — Tailwind v4 requires explicit utility definitions for some classes.

### Adding a New Database Table
1. Add CREATE TABLE + RLS policies to `supabase-schema.sql`
2. Add CRUD functions to `src/lib/database.js`
3. Create a hook in `src/hooks/` if needed

---

## Known Issues / Technical Debt

See `IMPLEMENTATION-PLAN.md` and `docs/superpowers/plans/` for detailed plans.

### Performance (partially addressed)
- [x] Query limits added to `getAllResults(100)`, `getAllWods(365)`, `getResultsByAthlete(100)`
- [x] Progressive dashboard loading (render after 2 queries, background-load rest)
- [x] Badge caching (5-minute TTL on `getAllUserBadges`)
- [x] Batch badge awards (single upsert instead of N individual inserts)
- [x] Parallel athlete WOD lookup (combined + group queries simultaneous)
- [ ] Photos stored as base64 in database → migrate to Supabase Storage
- [ ] No pagination on history views → add infinite scroll
- [ ] Full data reload on tab navigation → add caching/memoization

### Schema
- [ ] `body_measurements` table not in `supabase-schema.sql` — needs migration added

### Testing
- [ ] Strength program E2E tests have flaky selectors for session builder form — need `data-testid` attributes
- [ ] Intermittent athlete-log E2E test timeout — needs retry or longer timeout

### Missing Features
- [ ] Push notifications (deferred — requires server-side infrastructure)
- [ ] Offline/PWA support
- [ ] Data export
- [ ] Profile editing (name, group change)

---

## Testing

### Setup
- **Unit Tests:** Vitest — tests pure logic modules (score-utils, badges)
- **E2E Tests:** Playwright — tests full user flows against a dedicated test Supabase project
- **Test Database:** Separate Supabase project (credentials in `.env.test`, gitignored)
- **Test Users:** `testcoach@bbox.test` (coach) and `testathlete@bbox.test` (athlete), created by seed script

### Commands
```bash
npm run test              # Run unit tests (Vitest)
npm run test:watch        # Run unit tests in watch mode
npm run test:e2e          # Run E2E tests (Playwright, headless)
npm run test:e2e:headed   # Run E2E tests (visible browser)
npm run test:e2e:ui       # Run E2E tests in Playwright UI mode
npm run test:seed         # Create test users in test database
npm run test:cleanup      # Remove test data (preserves users)
npm run test:all          # Run unit + E2E tests
```

### Test File Locations
```
tests/
├── unit/
│   ├── score-utils.test.js    # Score parsing, formatting, comparison (73 tests)
│   ├── badges.test.js         # Badge checking, streak calculation (35 tests)
│   └── strength-program.test.js # Weight rounding, working weight calculation (13 tests)
├── e2e/
│   ├── auth.spec.js           # Login, error handling, signup/forgot forms (6 tests)
│   ├── coach-wod.spec.js      # Post, view, delete WODs (5 tests)
│   ├── athlete-log.spec.js    # Log workout, custom workout (4 tests)
│   ├── history.spec.js        # History, athletes, progress views (5 tests)
│   └── strength-program.spec.js # Program CRUD, enrollment, Part A display (10 tests)
├── helpers.js                 # Shared E2E helpers (login, navigate)
├── seed.js                    # Create test users
├── cleanup.js                 # Remove test data
├── global-setup.js            # Playwright pre-test setup
└── global-teardown.js         # Playwright post-test cleanup
```

### Critical Test Paths (Manual + E2E)
1. **Auth:** Signup → Check email → Confirm → Login → Session persists on refresh
2. **Forgot Password:** Click link → Enter email → Check email → Click reset link → Enter new password
3. **Coach WOD:** Create WOD → Edit → Delete (with/without athlete results)
4. **Athlete Log:** Log workout → Edit → Delete → Verify in History
5. **Custom Workout:** Log custom WOD → Verify violet badge + "Custom" label in history
6. **Missed WODs:** Verify past WODs appear, can log them
7. **Athletes Tab:** Must show ALL athletes, not just coach (including custom workouts)
8. **Benchmark WOD (Coach):** Select "Fran" from dropdown → Verify auto-fill → Post → Verify yellow badge
9. **Benchmark PR (Athlete):** Log result for benchmark WOD → Verify PR appears in Dashboard
10. **Custom Workout Validation:** Try naming custom workout "Fran" → Should show error and block
11. **Reactions:** Add/remove reactions on a result → Verify optimistic update + persistence
12. **Comments:** Post comment → Delete own comment → Verify thread updates
13. **Leaderboard:** Log result → Verify appears on leaderboard in realtime
14. **Badges:** Log first workout → Verify "First Blood" badge + toast notification
15. **Score Input:** Log For Time WOD → Verify MM:SS input; Log AMRAP → Verify rounds+reps input
16. **Strength Program (Coach):** Create program → Add sessions → Activate → Verify athletes prompted
17. **1RM Enrollment:** Enter 1RM → Verify working weight calculation → Update 1RM → Verify recalculation
18. **Two-Part WOD:** Post WOD with program → Log Part A + Part B → Verify both scores in history
19. **Session Progression:** Log result → Verify session advances → Log again → Verify next session
20. **Coach Override:** Override all to session 5 → Verify all athletes see session 5

---

## Deployment

### Vercel (recommended)
1. Push to GitHub
2. Connect repo to Vercel
3. Auto-deploys on push to main

### Pre-push Hook
A git pre-push hook runs the full regression suite (unit + E2E) before every push. Skip with `git push --no-verify` if needed.

### Supabase Setup
1. Create Supabase project
2. Run `supabase-schema-prod.sql` in SQL Editor (authoritative schema)
3. Run `supabase-migration-strength-programs.sql` for strength program tables (if not in base schema)
4. Set env vars `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
5. Enable Realtime on `results` table (for leaderboard): `ALTER PUBLICATION supabase_realtime ADD TABLE results;`
6. Disable email confirmation in Auth settings (or configure SMTP)

### Test Supabase Project
A separate Supabase project is used for E2E testing. Credentials in `.env.test` (gitignored). Run the same schema + migration scripts on the test project. Test users created by `npm run test:seed`.

---

## Code Style

- Functional components with hooks only
- Business logic in custom hooks (`src/hooks/`), UI in components
- Tailwind utility classes (custom utilities in index.css)
- Async/await for all database operations
- Try/catch around all Supabase calls
- Optimistic updates for social interactions (reactions, comments)
- Optional chaining for potentially null values (`currentUser?.email`)
- Use `.maybeSingle()` instead of `.single()` for queries that might return no results
- Format transformers in `database.js` (`profileToUser`, `wodToAppFormat`, `resultToAppFormat`)

---

## Don't Forget

1. **State separation:** `workoutResults` vs `allAthleteResults` (in `useResults` hook)
2. **Database is async:** Always `await` Supabase operations
3. **Date format:** Use `getLocalToday()` from `constants.js` for consistent local YYYY-MM-DD
4. **Role checks:** `currentUser.role === 'coach'` before coach-only operations
5. **Reload data:** Call appropriate load functions after mutations
6. **RLS:** Supabase Row Level Security handles authorization
7. **Score types:** Use `score-utils.js` for all score parsing/formatting/comparison
8. **Benchmark validation:** Custom workouts cannot use benchmark WOD names
9. **Use `.maybeSingle()`** not `.single()` for queries that might return 0 rows (prevents "Cannot coerce" errors)
10. **Editing workout:** `editingWorkout` is a result object — look up WOD via `allWODs.find(w => w.id === editingWorkout.wodId)` to get `strengthProgramId`
11. **Progressive loading:** Dashboard renders after todayWOD + myResults; don't block render waiting for badges, social, or allResults
12. **camelCase in hooks/components, snake_case in database.js insert objects:** Format transformers bridge the gap

---

## Related Files

| File | Purpose |
|------|---------|
| `supabase-schema-prod.sql` | Authoritative database schema (use for new projects) |
| `supabase-schema.sql` | Legacy schema with migration comments |
| `supabase-migration-strength-programs.sql` | Idempotent migration for strength program tables |
| `src/lib/database.js` | All database CRUD + format transformers |
| `src/lib/supabase.js` | Supabase client + recovery detection |
| `src/lib/score-utils.js` | Score parsing, formatting, comparison |
| `src/lib/badges.js` | Badge definitions + streak calculation |
| `src/lib/benchmarks.js` | 46 benchmark WOD definitions |
| `src/lib/constants.js` | Movement list, date helpers |
| `src/lib/stats.js` | Workout statistics |
| `src/contexts/AuthContext.jsx` | Auth state provider (includes authInitializing) |
| `src/hooks/useStrengthProgram.js` | Strength program CRUD, enrollment, weight calculation |
| `vitest.config.js` | Unit test configuration |
| `playwright.config.js` | E2E test configuration (port 5174, Pixel 5 viewport) |
