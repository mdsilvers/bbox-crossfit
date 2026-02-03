# CLAUDE.md - BBOX CrossFit App

## Project Overview

BBOX CrossFit is a React-based gym management app for CrossFit boxes. Coaches program WODs (Workouts of the Day) and athletes log their results.

**Status:** Production Ready
**Lines of Code:** ~3,600
**Main File:** `src/crossfit-box-app.jsx`

---

## Tech Stack

- **Framework:** React 18 with Hooks (useState, useEffect)
- **Styling:** Tailwind CSS v4 (utility classes only)
- **Icons:** lucide-react
- **Backend:** Supabase (Auth + PostgreSQL + Row Level Security)
- **Build:** Vite

---

## Quick Commands

```bash
# Development
npm run dev              # Start dev server at localhost:5173

# Production
npm run build            # Build to dist/
npm run preview          # Preview production build

# Dependencies
npm install              # Install all deps
```

---

## Architecture

### Component Structure
Single-file React app with role-based rendering:
- Login/Signup/Forgot Password screens (unauthenticated)
- Coach Dashboard (role === 'coach')
- Athlete Dashboard (role === 'athlete')

### State Management
```javascript
// CRITICAL: Two separate result states
workoutResults      // Current user's results only (personal stats)
allAthleteResults   // All results (coach views like Athletes tab)
```

This separation is essential - using `workoutResults` for coach views will show incomplete data.

### Database Schema (Supabase)
```sql
-- profiles: User accounts (extends Supabase auth.users)
profiles (id, email, name, role, group_type, created_at, updated_at)

-- wods: Workouts of the Day
wods (id, name, date, type, group_type, movements, notes, posted_by, posted_by_name, created_at, updated_at)
-- Unique constraint: (date, group_type)

-- results: Athlete workout results
results (id, wod_id, athlete_id, athlete_name, athlete_email, date, time, movements, notes, photo_url, custom_wod_name, custom_wod_type, created_at, updated_at)
-- Unique constraint: (athlete_id, date)
-- custom_wod_name/type: For athlete-created workouts when not doing coach WOD
```

### Row Level Security
- **profiles:** All authenticated can read, users can only update own
- **wods:** All authenticated can read, only coaches can write
- **results:** All authenticated can read, users can only write own

---

## File Locations

```
src/
├── crossfit-box-app.jsx  # Main React app (~4000 lines)
├── main.jsx              # React entry point
├── index.css             # Tailwind imports + custom utilities
└── lib/
    ├── supabase.js       # Supabase client initialization
    ├── database.js       # Database service layer (all CRUD operations)
    └── benchmarks.js     # Benchmark WOD definitions (46 workouts)

supabase-schema.sql       # Database schema with RLS policies
```

### Key sections in crossfit-box-app.jsx:
- Lines 1-50: Imports, constants, logo component
- Lines 50-130: State declarations (including custom workout states)
- Lines 130-350: Auth functions (signup, login, logout, forgot password)
- Lines 350-600: Data loading functions (WODs, results, missed WODs)
- Lines 600-850: Coach functions (postWOD, editWOD, deleteWOD)
- Lines 850-1000: Custom workout functions (startCustomWorkout, logCustomWorkout, etc.)
- Lines 1000-1300: Login/Signup/Forgot Password UI
- Lines 1300-2700: Coach Dashboard UI
- Lines 2700-3600: Athlete Dashboard UI (including custom workout form)

---

## Key Patterns

### Date-Based Uniqueness
Results use `(athlete_id, date)` as unique constraint ensuring one entry per user per day. Logging again on same day updates existing entry.

### WOD Groups
- `combined` - All athletes
- `mens` - Men's group
- `womens` - Women's group

Athletes see WODs matching their group OR combined. Conflict validation prevents posting combined WOD when group-specific exists (and vice versa).

### Role-Based Views
```javascript
if (currentUser.role === 'coach') {
  // Show coach dashboard with 5 tabs: Dashboard, Workout, Program, Athletes, History
} else {
  // Show athlete dashboard with 3 tabs: Dashboard, Workout, History
}
```

### History Sorting
All workout history views are sorted by WOD date (latest first), not by logged/created timestamp.

---

## Features

### Authentication
- Email/password signup with email confirmation
- Login with session persistence
- Forgot password flow (Supabase sends reset email)
- Auto-logout on session expiration

### Coach Features
- Post WODs (named or unnamed, with workout type)
- Edit/delete WODs
- View all athletes and their workout history
- Log own workouts
- WOD conflict validation
- Benchmark WOD templates (quick-fill from 46 standard CrossFit benchmarks)

### Athlete Features
- View today's WOD
- Log workout results with time, weights, notes, photo
- Log custom workouts (when traveling or doing different programming)
- View workout history
- Log missed WODs (past 7 days)
- Edit/delete own results
- Personal Records tracking for benchmark WODs

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
- Custom workouts block benchmark names (validation)
- Athlete dashboard shows Personal Records section with top 5 PRs

### UI Features
- Photo modal (click to view full-screen)
- Workout type badges on all history views (red for coach WODs, violet for custom)
- Custom workout indicator badges in history
- Benchmark badges (yellow) in history for benchmark WODs
- Responsive design (mobile-first)

---

## Common Tasks

### Adding a New Movement
Edit `STANDARD_MOVEMENTS` array at top of file (alphabetically sorted).

### Changing Logo
Update URL in `BBoxLogo` component (~line 43):
```javascript
src="https://www.antarescatamarans.com/wp-content/uploads/2026/01/BBOX-New-BarBell-smallest.png"
```

### Adding New WOD Type
1. Add to type dropdown in WOD form
2. Type badge displays automatically in history views

### Adding New Tailwind Utilities
Add to `src/index.css` - Tailwind v4 requires explicit utility definitions for some classes.

---

## Known Issues / Technical Debt

### Performance
- [ ] Photos stored as base64 in database → migrate to Supabase Storage
- [ ] No pagination → will slow with many results
- [ ] Full data reload on navigation → add caching

### Missing Features
- [ ] Push notifications
- [ ] Offline/PWA support
- [ ] Data export
- [ ] Profile editing (name, group change)

---

## Testing

### Critical Test Paths
1. **Auth:** Signup → Check email → Confirm → Login → Session persists on refresh
2. **Forgot Password:** Click link → Enter email → Check email → Reset password
3. **Coach WOD:** Create WOD → Edit → Delete (with/without athlete results)
4. **Athlete Log:** Log workout → Edit → Delete → Verify in History
5. **Custom Workout:** Log custom WOD (no coach WOD) → Verify violet badge + "Custom" label in history
6. **Missed WODs:** Verify past WODs appear, can log them
7. **Athletes Tab:** Must show ALL athletes, not just coach (including custom workouts)
8. **Benchmark WOD (Coach):** Select "Fran" from dropdown → Verify auto-fill → Post → Verify yellow badge
9. **Benchmark PR (Athlete):** Log result for benchmark WOD → Verify PR appears in Dashboard
10. **Custom Workout Validation:** Try naming custom workout "Fran" → Should show error and block submission

---

## Deployment

### Vercel (recommended)
1. Push to GitHub
2. Connect repo to Vercel
3. Auto-deploys on push to main

### Supabase Setup
1. Create Supabase project
2. Run `supabase-schema.sql` in SQL Editor
3. Update credentials in `src/lib/supabase.js`
4. Disable email confirmation in Auth settings (or configure SMTP)

---

## Code Style

- Functional components with hooks only
- Tailwind utility classes (custom utilities in index.css)
- Async/await for all database operations
- Try/catch around all Supabase calls
- Optional chaining for potentially null values (`currentUser?.email`)
- Use `.maybeSingle()` instead of `.single()` for queries that might return no results

---

## Don't Forget

1. **State separation:** `workoutResults` vs `allAthleteResults`
2. **Database is async:** Always `await` Supabase operations
3. **Date format:** Use `toISOString().split('T')[0]` for consistent YYYY-MM-DD
4. **Role checks:** `currentUser.role === 'coach'` before coach-only operations
5. **Reload data:** Call appropriate load functions after mutations
6. **RLS:** Supabase Row Level Security handles authorization

---

## Related Files

| File | Purpose |
|------|---------|
| `supabase-schema.sql` | Database schema and RLS policies |
| `src/lib/database.js` | All database CRUD operations |
| `src/lib/supabase.js` | Supabase client configuration |
