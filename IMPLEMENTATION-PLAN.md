# BBOX CrossFit — Performance & Features Implementation Plan

## Context

The app has grown to production use but carries tech debt that will degrade with scale: photos stored as base64 strings bloat every query, no pagination means all WODs/results load at boot, and mutations trigger full data reloads. Additionally, users need profile editing, data export, and PWA support. Push notifications are deferred to a future iteration.

---

## Phase 1: Photo Migration (base64 → Supabase Storage)

**Why:** Base64 photos inflate every query that touches `wods` or `results`, even when photos aren't needed. This is the single biggest performance bottleneck.

### 1A. Supabase Storage bucket setup

Create a `workout-photos` public bucket with RLS policies:
- Authenticated users upload to their own folder (`{userId}/{uuid}.{ext}`)
- All authenticated users can view photos
- Users can delete their own photos

Run via Supabase SQL Editor or new migration file.

### 1B. New photo upload utility

**New file:** `src/lib/photo-storage.js`

- `uploadPhoto(file, userId)` → uploads to Storage, returns public URL
- `deletePhoto(storagePath)` → removes from Storage
- `isBase64(url)` → returns true if string starts with `data:image/`

### 1C. Modify upload handlers

**`src/hooks/useResults.js`** (lines 30-39): Replace `FileReader.readAsDataURL` with:
1. Store raw `File` object in state
2. Use `URL.createObjectURL(file)` for preview
3. In `logResult`, call `uploadPhoto(file, userId)` and pass the URL as `photoData`

**`src/hooks/useWorkouts.js`** (lines 37-46): Same pattern for `handleWodPhotoUpload` → used in `postWOD`/`editWOD`.

### 1D. No changes needed to database.js or display components

The `photo_url` column just stores a different string (URL instead of base64). Both formats work as `<img src>`. Transform functions (`wodToAppFormat` line 645, `resultToAppFormat` line 663) pass through as-is.

### 1E. Cleanup on delete

When deleting a result/WOD that has a Storage photo (not base64), also call `deletePhoto()` to remove the file from the bucket. Add to `deleteWorkout` in `useResults.js` and `deleteWOD` in `useWorkouts.js`.

### 1F. Batch migration script for existing photos

**New file:** `scripts/migrate-photos.js` (Node.js, run once)

1. Query all `results` and `wods` where `photo_url LIKE 'data:image/%'`
2. For each row: decode base64 → upload to Storage → update row with new URL
3. Process in batches of 10 to avoid timeouts

---

## Phase 2: Pagination

**Why:** `getAllWods()` and `getAllResults()` load entire tables at boot. This will degrade as data grows.

### 2A. Add paginated queries to database.js

**`src/lib/database.js`**

Modify `getAllWods()` (line 116) and `getAllResults()` (line 270) to accept `{ page, pageSize }` params. Use Supabase `.range(from, to)` with `{ count: 'exact' }`. Default pageSize = 50.

Keep unpaginated variants available for views that genuinely need all data (benchmark PR calculation, coach athlete grouping).

### 2B. Add pagination state to hooks

**`src/hooks/useWorkouts.js`** — Add `wodsPage`, `hasMoreWods` state. `loadAllWODs` loads first page. New `loadMoreWODs` appends next page.

**`src/hooks/useResults.js`** — Add `resultsPage`, `hasMoreResults` state for `allAthleteResults`. `loadMyResults` stays unpaginated (individual athlete data is bounded).

### 2C. "Load More" UI in history views

**`src/components/athlete/AthleteHistoryView.jsx`** and **`src/components/coach/CoachHistoryView.jsx`**

Add a "Load More Workouts" button at the bottom of the results list when `hasMore` is true. Mobile-friendly infinite scroll pattern.

### 2D. Coach Athletes tab

Keep using unpaginated `getAllResults` for this view specifically — it needs all results to group by athlete. Acceptable for a small gym. Alternatively, add a `getResultsGroupedByAthlete()` DB function later if needed.

---

## Phase 3: Caching & Data Reload Optimization

**Why:** Every mutation (log, edit, delete) triggers full `loadMyResults()` + `loadAllResults()` reloads. Expensive computations recalculate on every render.

### 3A. Optimistic updates after mutations

**`src/hooks/useResults.js`**

After `logResult` (line 112+) and `logCustomWorkout`: the saved row is already returned from `db.createResult`/`db.updateResult`. Update local state directly (prepend/replace in arrays) instead of reloading everything. Same for `deleteWorkout` — remove by ID from local arrays.

### 3B. Memoize expensive computations

- **Dashboard stats:** Wrap `calculateStats()` calls in `useMemo` keyed on `[workoutResults, currentUser]`
- **`src/hooks/useBenchmarkPRs.js`:** Memoize `calculateBenchmarkPRs` result
- Both coach and athlete dashboards benefit

### 3C. Lazy-load social data

**`src/components/athlete/AthleteHistoryView.jsx`** (lines 33-39): Currently loads reactions/comments for ALL results on mount. Change to load only for the visible page of results. Load more social data when user clicks "Load More".

---

## Phase 4: Profile Editing

**Why:** Users cannot change their name or group after signup.

### 4A. New database function

**`src/lib/database.js`** — Add `updateProfile(userId, { name, group_type })` after `getProfile()` (line 73). RLS policy for self-update already exists in the schema.

### 4B. Auth context handler

**`src/contexts/AuthContext.jsx`** — Add `handleUpdateProfile(updates)` that calls `db.updateProfile`, then updates `currentUser` state via `setCurrentUser(db.profileToUser(updatedProfile))`. Add to context value.

### 4C. Profile edit UI

**New file:** `src/components/shared/ProfileEditModal.jsx`

Modal with:
- Name text input (editable)
- Group dropdown: Men's / Women's (editable)
- Email (read-only display)
- Role (read-only display)
- Save / Cancel buttons

Style: dark modal matching existing app (slate-800 bg, red-600 primary buttons).

### 4D. Integration

**`src/components/athlete/AthleteDashboard.jsx`** and **`src/components/coach/CoachDashboard.jsx`**

Add a gear/settings icon next to user name in header. Tapping opens `ProfileEditModal`.

---

## Phase 5: PWA Support

**Why:** Users already add the app to their home screen (there's a guide.html for this), but without a manifest or service worker it's not a true PWA.

### 5A. Install vite-plugin-pwa

`npm install -D vite-plugin-pwa`

### 5B. Configure Vite

**`vite.config.js`** — Add `VitePWA` plugin with:
- `registerType: 'autoUpdate'`
- Manifest: name "BBOX CrossFit", theme/bg color `#1c2027`, standalone display, portrait orientation
- Icons: 192x192 and 512x512 (generate from existing `public/bbox-logo.png`)
- Workbox runtime caching:
  - `NetworkFirst` for Supabase API calls (5s timeout, cache fallback)
  - `CacheFirst` for Storage photos (30-day expiration)

### 5C. PWA icons

**New files:** `public/icons/icon-192.png`, `public/icons/icon-512.png`

Generate from existing `public/bbox-logo.png`.

### 5D. HTML meta tags

**`index.html`** — Add to `<head>`:
- `theme-color` meta tag (#1c2027)
- `apple-mobile-web-app-capable` meta tag
- `apple-touch-icon` link
- App description meta tag

### 5E. Offline behavior

`NetworkFirst` for API means: try network, fall back to cache if offline. Users get read access to recent data when offline. Writes fail gracefully (existing try/catch + alert pattern handles this). Full offline-write-sync is out of scope.

---

## Phase 6: Data Export

**Why:** Athletes want to keep a record of their workout data.

### 6A. Export utility

**New file:** `src/lib/export.js`

- `exportResultsToCSV(results, allWODs)` — Generates CSV with columns: Date, Workout Name, Type, Score, Movements, Notes, Rx
- `exportResultsToJSON(results, allWODs)` — Full JSON dump
- Uses `Blob` + `URL.createObjectURL` + programmatic `<a>` click for download

### 6B. Export UI

**`src/components/athlete/AthleteHistoryView.jsx`** — Add "Export CSV" button (Download icon from lucide-react) in the history view header area.

Coach history view gets the same button.

---

## Files Modified Summary

| File | Phases |
|------|--------|
| `src/lib/database.js` | 2, 3, 4 |
| `src/hooks/useResults.js` | 1, 2, 3 |
| `src/hooks/useWorkouts.js` | 1, 2 |
| `src/hooks/useBenchmarkPRs.js` | 3 |
| `src/contexts/AuthContext.jsx` | 4 |
| `src/components/athlete/AthleteHistoryView.jsx` | 2, 3, 6 |
| `src/components/coach/CoachHistoryView.jsx` | 2, 6 |
| `src/components/athlete/AthleteDashboard.jsx` | 3, 4 |
| `src/components/coach/CoachDashboard.jsx` | 3, 4 |
| `vite.config.js` | 5 |
| `index.html` | 5 |
| `package.json` | 5 |

## New Files

| File | Phase |
|------|-------|
| `src/lib/photo-storage.js` | 1 |
| `scripts/migrate-photos.js` | 1 |
| `src/components/shared/ProfileEditModal.jsx` | 4 |
| `src/lib/export.js` | 6 |
| `public/icons/icon-192.png` | 5 |
| `public/icons/icon-512.png` | 5 |

## Verification

1. **Photos:** Upload a photo as athlete → verify it appears in Supabase Storage bucket → verify display in history, modal, coach athlete list → verify old base64 photos still render
2. **Pagination:** Load app with 50+ results → verify only first page loads → click "Load More" → verify next batch appends → verify search works on loaded data
3. **Caching:** Log a workout → verify it appears instantly without full reload → check browser DevTools Network tab for reduced API calls
4. **Profile:** Edit name → verify header updates immediately → change group → verify WODs update accordingly
5. **PWA:** `npm run build && npm run preview` → verify install prompt in Chrome → install → verify standalone mode → go offline → verify cached data loads
6. **Export:** Click Export CSV in history → open in spreadsheet → verify columns and data are correct
