# CLAUDE.md - BBOX CrossFit App

## Project Overview

BBOX CrossFit is a React-based gym management app for CrossFit boxes. Coaches program WODs (Workouts of the Day) and athletes log their results.

**Status:** MVP Complete - Ready for Deployment  
**Lines of Code:** ~3,000  
**Main File:** `crossfit-box-app.jsx`

---

## Tech Stack

- **Framework:** React 18 with Hooks (useState, useEffect)
- **Styling:** Tailwind CSS (utility classes only)
- **Icons:** lucide-react
- **Storage:** Browser Persistent Storage API (`window.storage`)
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
npm install lucide-react # Required icon library
```

---

## Architecture

### Component Structure
Single-file React app with role-based rendering:
- Login/Signup screens (unauthenticated)
- Coach Dashboard (role === 'coach')
- Athlete Dashboard (role === 'athlete')

### State Management
```javascript
// CRITICAL: Two separate result states
workoutResults      // Current user's results only (personal stats)
allAthleteResults   // All results (coach views like Athletes tab)
```

This separation is essential - using `workoutResults` for coach views will show incomplete data.

### Storage Schema
```javascript
// Keys and their scope:
`user:${email}`           // Shared - user accounts
`current_user`            // Personal - session
`wod:${date}:${group}`    // Shared - workout definitions
`result:${email}:${date}` // Shared - workout results (one per user per day)
```

---

## Key Patterns

### Date-Based Uniqueness
Results use `${email}:${date}` as ID ensuring one entry per user per day. Logging again on same day updates existing entry.

### WOD Groups
- `combined` - All athletes
- `mens` - Men's group
- `womens` - Women's group

Athletes see WODs matching their group OR combined.

### Role-Based Views
```javascript
if (currentUser.role === 'coach') {
  // Show coach dashboard with 5 tabs
} else {
  // Show athlete dashboard with 3 tabs
}
```

---

## File Locations

```
src/
├── App.jsx          # Main app (crossfit-box-app.jsx content)
├── main.jsx         # React entry point
└── index.css        # Tailwind imports + base styles

Key sections in App.jsx:
- Lines 1-50:      Imports, constants, logo component
- Lines 50-100:    State declarations
- Lines 100-250:   Auth functions (signup, login, logout)
- Lines 250-400:   Coach functions (postWOD, loadWODs)
- Lines 400-650:   Athlete functions (logWorkout, loadResults)
- Lines 650-900:   Shared functions (stats, delete, edit)
- Lines 900-2000:  Coach UI components
- Lines 2000-3000: Athlete UI components
```

---

## Common Tasks

### Adding a New Movement
Edit `STANDARD_MOVEMENTS` array at top of file (alphabetically sorted).

### Changing Logo
Update URL in `BBoxLogo` component (~line 41):
```javascript
src="https://www.antarescatamarans.com/wp-content/uploads/2026/01/BBOX-New-BarBell-smallest.png"
```

### Adding New WOD Type
1. Add to type dropdown in WOD form
2. Update display logic where `wod.type` is rendered

### Adding New Stats
Modify `calculateStats()` function (~line 566).

---

## Known Issues / Technical Debt

### Security (Must Fix for Production)
- [ ] Passwords in plain text → implement bcrypt hashing
- [ ] No input sanitization → XSS risk
- [ ] No rate limiting → brute force risk

### Performance
- [ ] Photos stored as base64 → use cloud storage
- [ ] No pagination → will slow with many results
- [ ] Full data reload on navigation → add caching

### Missing Features
- [ ] Password reset flow
- [ ] Email verification
- [ ] Push notifications
- [ ] Offline/PWA support
- [ ] Data export

---

## Testing

### Test Accounts
```
Coach:   coach@test.com / password123
Athlete: athlete@test.com / password123
```

### Critical Test Paths
1. **Auth:** Signup → Logout → Login → Session persists on refresh
2. **Coach WOD:** Create WOD → Edit → Delete (with/without athlete results)
3. **Athlete Log:** Log workout → Edit → Delete → Verify in History
4. **Athletes Tab:** Must show ALL athletes, not just coach

---

## Deployment

Use Vercel (recommended):
1. Push to GitHub
2. Connect repo to Vercel
3. Auto-deploys on push to main

See `DEPLOYMENT_GUIDE.md` for detailed steps.

---

## Code Style

- Functional components with hooks only
- Tailwind utility classes (no custom CSS except index.css)
- Async/await for all storage operations
- Try/catch around all storage calls
- Optional chaining for potentially null values (`currentUser?.email`)

---

## Don't Forget

1. **State separation:** `workoutResults` vs `allAthleteResults`
2. **Storage is async:** Always `await` storage operations
3. **Date format:** Use `toISOString().split('T')[0]` for consistent YYYY-MM-DD
4. **Role checks:** `currentUser.role === 'coach'` before coach-only operations
5. **Reload data:** Call appropriate load functions after mutations

---

## Related Files

| File | Purpose |
|------|---------|
| `SESSION_CONTEXT.md` | Full project context and history |
| `DEPLOYMENT_GUIDE.md` | Step-by-step deployment |
| `MVP_TESTING_REPORT.md` | Test coverage documentation |
