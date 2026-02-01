# BBOX CrossFit — Refactoring Plan (v2)

**Branch:** `refactor/component-architecture-v2`
**Goal:** Break the 4,485-line monolith into clean, maintainable components — zero functionality changes.

---

## Current State

One giant file (`crossfit-box-app.jsx`) contains everything:

| Section | Lines | What it does |
|---------|-------|-------------|
| Constants | 1–55 | `STANDARD_MOVEMENTS` array, `BBoxLogo` component |
| State declarations | 56–123 | ~35 `useState` calls for auth, coach, athlete, custom workout state |
| Auth effects | 124–171 | Session init, auth listener |
| Data-loading effect | 173–199 | Load WODs, results, PRs on user change |
| Auth handlers | 200–340 | Signup, login, logout, forgot password |
| Coach WOD functions | 342–445 | Add/update/remove movements, post/edit/delete WODs |
| Athlete functions | 447–596 | Load today's WOD, photo upload, log result, load results, missed WODs |
| Benchmark PR calc | 597–700 | PR calculation from history |
| Custom workout functions | 702–925 | Custom WOD creation, movement autocomplete |
| Stats calculation | 926–978 | User statistics (totals, streaks, top movements) |
| Edit/delete handlers | 979–1033 | Past workout editing, deletion |
| Photo modal | 1034–1060 | Inline modal component |
| **Login/Signup JSX** | **1061–1402** | **~340 lines** of auth UI |
| **Coach Dashboard JSX** | **1403–3250** | **~1,850 lines** — WOD management, athlete views, history |
| **Athlete Dashboard JSX** | **3251–4485** | **~1,235 lines** — Today's WOD, logging, history |

**Also already extracted (Phase 1):**
- `components/ProgressDashboard.jsx` (534 lines)
- `components/BenchmarkHistory.jsx` (257 lines)
- `components/WeeklySummary.jsx` (195 lines)
- `components/PercentileRank.jsx` (209 lines)
- `components/BodyComposition.jsx` (393 lines)
- `components/ScoreInput.jsx` (257 lines)
- `lib/score-utils.js`, `lib/benchmarks.js`, `lib/database.js`, `lib/supabase.js`

---

## Target Architecture

```
src/
├── App.jsx                          # Root: AuthProvider → AppShell
├── main.jsx                         # Entry point (unchanged)
├── index.css                        # Styles (unchanged)
│
├── contexts/
│   └── AuthContext.jsx              # Auth state + login/signup/logout methods
│
├── hooks/
│   ├── useWorkouts.js               # WOD loading, posting, editing, deleting
│   ├── useResults.js                # Result loading, logging, editing, deleting
│   └── useBenchmarkPRs.js           # PR calculation from results + WODs
│
├── components/
│   ├── layout/
│   │   └── AppShell.jsx             # Role detection → CoachDashboard or AthleteDashboard
│   │
│   ├── auth/
│   │   ├── LoginForm.jsx            # Login form
│   │   ├── SignupForm.jsx           # Signup form
│   │   ├── ForgotPassword.jsx       # Password reset form
│   │   └── AuthScreen.jsx           # Container switching between login/signup/forgot
│   │
│   ├── coach/
│   │   ├── CoachDashboard.jsx       # View switcher (local coachView state) + CoachBottomNav
│   │   ├── CoachHomeDash.jsx        # Stats, PRs, today's WOD, missed WODs, recent workouts
│   │   ├── CoachWorkoutView.jsx     # Coach logging their own workout
│   │   ├── CoachHistoryView.jsx     # Coach workout history with search (local coachHistorySearch)
│   │   ├── CoachProgramView.jsx     # All WODs management list
│   │   └── CoachAthleteList.jsx     # Athlete roster with expandable cards (local expandedAthlete)
│   │
│   ├── athlete/
│   │   ├── AthleteDashboard.jsx     # View switcher (local currentView state) + inline tab nav
│   │   ├── AthleteHomeDash.jsx      # Stats, PRs, today's WOD, missed WODs, recent workouts
│   │   ├── AthleteWorkoutView.jsx   # Score logging form (today or past)
│   │   └── AthleteHistoryView.jsx   # Workout history with search (local historySearch)
│   │
│   ├── wod/
│   │   ├── WODCard.jsx              # Single WOD display card (reused by coach + athlete)
│   │   ├── WODEditor.jsx            # Create/edit WOD form with movement autocomplete
│   │   └── MovementAutocomplete.jsx # Movement name input with dropdown
│   │
│   ├── results/
│   │   ├── ResultForm.jsx           # Score logging form (wraps ScoreInput + movements)
│   │   ├── ResultCard.jsx           # Single result display card
│   │   ├── CustomWorkoutForm.jsx    # Custom WOD creation form
│   │   └── ScoreInput.jsx           # (existing) Score input by type
│   │
│   ├── progress/                    # (existing Phase 1 — unchanged)
│   │   ├── ProgressDashboard.jsx
│   │   ├── BenchmarkHistory.jsx
│   │   ├── WeeklySummary.jsx
│   │   ├── PercentileRank.jsx
│   │   └── BodyComposition.jsx
│   │
│   └── shared/
│       ├── BBoxLogo.jsx             # Logo component
│       ├── PhotoModal.jsx           # Full-screen photo viewer
│       ├── PhotoUpload.jsx          # Photo upload button + preview
│       └── DeleteConfirmDialog.jsx  # Reusable "are you sure?" dialog
│
└── lib/
    ├── supabase.js                  # (existing)
    ├── database.js                  # (existing)
    ├── score-utils.js               # (existing)
    ├── benchmarks.js                # (existing)
    ├── stats.js                     # NEW: calculateStats() pure function
    └── constants.js                 # NEW: STANDARD_MOVEMENTS + shared constants
```

---

## Key Architecture Decisions

### Navigation state is local
- `coachView` lives in `CoachDashboard.jsx` as local state
- `currentView` lives in `AthleteDashboard.jsx` as local state
- Functions that need to trigger navigation accept a `navigate` callback

### Dashboards consume hooks directly
- No `commonProps` mega-object passed from App.jsx
- Each dashboard calls `useWorkouts()`, `useResults()`, `useBenchmarkPRs()` directly
- Data-loading orchestration lives in `AppShell.jsx`

### Cross-hook coordination via callbacks
- `logResult()`, `logCustomWorkout()` accept an `onSuccess` callback for post-mutation actions (recalc PRs, reload missed WODs)
- `confirmDeleteWOD()` accepts `onSuccess` callback for reloading results
- `startLogMissedWOD()`, `cancelEdit()` accept a `navigate` callback to change views

### Coach uses bottom nav, athlete uses inline tabs
- `CoachDashboard.jsx` includes a fixed bottom nav bar (6 tabs: Home, History, Workout, Progress, Program, Athletes)
- `AthleteDashboard.jsx` includes inline tab buttons at the top (4 tabs: Home, History, Progress, Workout)

### Monolith stays until Step 8
- During Steps 1–7, the monolith remains as the running app
- Each step extracts code into new files but does NOT wire them into the app yet
- Step 8 does the final wiring + monolith deletion

---

## Execution Plan (8 Steps)

### Step 1: Extract constants + BBoxLogo
- Move `STANDARD_MOVEMENTS` array → `lib/constants.js`
- Move `BBoxLogo` → `components/shared/BBoxLogo.jsx`
- Update imports in monolith
- **Risk:** Zero — pure extractions, no logic changes

### Step 2: Extract AuthContext
- Create `contexts/AuthContext.jsx` with:
  - 15 auth state variables (`currentUser`, `loginEmail`, `loginPassword`, `signupEmail`, `signupPassword`, `signupConfirmPassword`, `signupName`, `signupRole`, `signupGroup`, `showSignup`, `showForgotPassword`, `resetEmail`, `authError`, `authSuccess`, `authLoading`)
  - Auth handlers (`handleSignup`, `handleLogin`, `handleLogout`, `handleForgotPassword`)
  - Auth session listener effect (lines 124–171 only)
  - `useAuth()` hook export
- **NOT in AuthContext:** The data-loading effect (lines 173–199) stays in AppShell because it depends on workout/results hooks
- **`handleLogout` only resets auth state** — app-level state (WODs, results) gets reset by the consuming component's `onLogout` wrapper
- **What this removes from monolith:** 15 state vars + ~200 lines of auth logic
- **Risk:** Low — auth is self-contained

### Step 3: Extract custom hooks + stats utility
- **`useWorkouts.js`** — WOD loading/posting/editing/deleting:
  - State: `allWODs`, `todayWOD`, `missedWODs`, `showWODForm`, `newWOD`, `movementInput`, `showMovementDropdown`, `filteredMovements`, `editingWOD`, `showDeleteWODConfirm`
  - Functions: `loadTodayWOD()`, `loadAllWODs()`, `loadMissedWODs(userResults)`
  - Functions: `postWOD(onSuccess)`, `editWOD()`, `deleteWOD()`, `confirmDeleteWOD(onSuccess)`
  - Helpers: `addMovement`, `updateMovement`, `handleMovementInput`, `selectMovement`, `removeMovement`
  - Note: `loadMissedWODs` accepts results as a parameter to avoid circular dependency with useResults
  - Note: `postWOD` and `confirmDeleteWOD` accept `onSuccess` callbacks for cross-hook coordination

- **`useResults.js`** — Result loading/logging/editing/deleting:
  - State: `workoutResults`, `allAthleteResults`, `myResult`, `editingWorkout`, `showDeleteConfirm`, `isCustomWorkout`, `customWod`, `customMovementInput`, `showCustomMovementDropdown`, `customWodNameError`, `photoModalUrl`
  - Functions: `loadMyResults()`, `loadAllResults()`
  - Functions: `logResult(onSuccess)`, `logCustomWorkout(onSuccess)` — accept callbacks for PR recalc + missed WOD reload
  - Functions: `editPastWorkout(navigate)`, `deleteWorkout()`, `cancelEdit(navigate)` — navigation functions accept callbacks
  - Functions: `startLogMissedWOD(navigate)`, `startCustomWorkout(navigate)`, `cancelCustomWorkout(navigate)` — accept navigation callbacks
  - Custom workout helpers: `addCustomMovement`, `removeCustomMovement`, `updateCustomMovement`, `handleCustomMovementInput`, `selectCustomMovement`
  - Other: `handlePhotoUpload`, `updateMovementWeight`

- **`useBenchmarkPRs.js`** — PR calculation:
  - State: `benchmarkPRs`
  - Function: `calculateBenchmarkPRs(results, wods)` — pure function, called imperatively

- **`lib/stats.js`** — NEW: Pure utility function:
  - `calculateStats(workoutResults, currentUser)` — returns `{ totalWorkouts, thisMonth, thisWeek, thisYear, currentStreak, topMovements }`
  - Used by both coach and athlete dashboard home views

- **What this removes from monolith:** ~600 lines of business logic
- **Risk:** Medium — cross-hook dependencies resolved via callback pattern

### Step 4: Extract auth screens
- `AuthScreen.jsx` — container that switches between:
  - `LoginForm.jsx` — email/password form
  - `SignupForm.jsx` — registration form with role/group selection
  - `ForgotPassword.jsx` — password reset form
- All consume `useAuth()` context
- **What this removes from monolith:** ~340 lines of JSX
- **Risk:** Low — auth UI is isolated

### Step 5: Extract shared components
- `PhotoModal.jsx` — full-screen photo viewer (props: `url`, `onClose`)
- `PhotoUpload.jsx` — photo capture/upload with preview (unify 3 variants from monolith)
- `DeleteConfirmDialog.jsx` — reusable confirmation dialog (unify 6 inline variants)
- `WODCard.jsx` — single WOD display (flexible props for coach/athlete variants, action buttons, missed WOD styling)
- `ResultCard.jsx` — single result display (flexible props for coach/athlete, compact/expanded, with/without actions)
- `MovementAutocomplete.jsx` — movement name input with dropdown suggestions
- **What this removes from monolith:** ~600+ lines of duplicated/inline JSX
- **Risk:** Medium — WODCard and ResultCard need careful prop design to handle all variants

### Step 6: Extract WOD editor + result forms
- `WODEditor.jsx` — full WOD creation/editing form (coach-only)
  - Uses `MovementAutocomplete` for each movement row
  - Benchmark picker integration
  - Date, type, group selection

- `ResultForm.jsx` — unified score logging form (coach + athlete)
  - Wraps `ScoreInput` + movement weight fields + notes + photo upload
  - Handles both regular WOD logging and editing past workouts
  - Prop-driven differences for coach vs athlete (banner color, movement display)

- `CustomWorkoutForm.jsx` — custom WOD creation (coach + athlete)
  - WOD name (with benchmark validation), type selection
  - Movement entry with autocomplete
  - Score input + optional photo upload

- **What this removes from monolith:** ~400 lines of form JSX
- **Risk:** Medium — unifying coach/athlete variants

### Step 7: Extract dashboard views
- **Coach side:**
  - `CoachDashboard.jsx` — view switcher with local `coachView` state + bottom nav
  - `CoachHomeDash.jsx` — stats cards, benchmark PRs, today's WOD, missed WODs, top movements, recent workouts
  - `CoachHistoryView.jsx` — coach workout history with local `coachHistorySearch` state
  - `CoachWorkoutView.jsx` — coach logging their own workout (result form + custom workout form)
  - `CoachProgramView.jsx` — all WODs list with edit/delete + WOD editor
  - `CoachAthleteList.jsx` — athlete roster with local `expandedAthlete` state

- **Athlete side:**
  - `AthleteDashboard.jsx` — view switcher with local `currentView` state + inline tab nav
  - `AthleteHomeDash.jsx` — stats cards, benchmark PRs, today's WOD, missed WODs, top movements, recent workouts
  - `AthleteHistoryView.jsx` — workout history with local `historySearch` state
  - `AthleteWorkoutView.jsx` — logging form for current/past/custom workout

- **What this removes from monolith:** ~3,000 lines of JSX
- **Risk:** Medium — need to properly thread hooks and callbacks

### Step 8: Wire up App.jsx + AppShell, delete monolith
- `main.jsx` — wraps App in `AuthProvider`
- `App.jsx` — renders `AuthScreen` if no user, otherwise `AppShell`
- `AppShell.jsx` — instantiates hooks, orchestrates data loading, renders `CoachDashboard` or `AthleteDashboard`
- Dashboards consume hooks directly (no commonProps mega-object)
- Delete `crossfit-box-app.jsx`
- Verify build + manual test
- **Risk:** Low if Steps 1–7 are solid

---

## What Does NOT Change

- **No React Router** — keeping state-based tab navigation for now
- **No database schema changes** — zero SQL migrations
- **No new dependencies** — using only what's already installed
- **No UI changes** — pixel-identical output
- **No feature additions** — pure structure refactoring
- **Existing Phase 1 components untouched** — ProgressDashboard, BenchmarkHistory, etc. stay as-is
- **`lib/` modules untouched** — database.js, score-utils.js, benchmarks.js, supabase.js stay as-is

---

## Expected Outcome

| Metric | Before | After |
|--------|--------|-------|
| Largest file | 4,485 lines | ~200 lines |
| Total files (src/) | 12 | ~35 |
| Average component size | N/A | ~100–200 lines |
| State management | 35 useState in one function | Distributed across context + hooks |
| Testability | Impossible to unit test | Each component independently testable |
| Ready for Phase 2 | Painful | Clean insertion points for leaderboards, reactions, comments |
