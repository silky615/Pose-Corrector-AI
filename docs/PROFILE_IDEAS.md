# Profile & Dashboard – What’s Included & What Else to Add

## What’s in the profile (current)

- **Profile header** — Avatar initial, name, email, age/height/weight pills, “Edit profile” button  
- **4 stat cards** — Total Workouts, This Week, Streak (days), Avg Score  
- **Recent Workouts** — Exercise name, date, reps, accuracy  
- **Weekly Activity** — Mon–Sun with checkmarks for days that have a workout  

## Code hints

- **Route:** `#profile` → `ProfilePage` (see `App.js`: `route === "profile"`).  
- **Entry:** Dashboard topbar has a “Profile” button → `onNavigate("profile")`.  
- **Data:** `api.getProfile(userId)` calls `GET /api/profile?user_id=<id>`. Backend returns the shape used in `ProfilePage` (name, email, stats, recentWorkouts, weeklyActivity). If the API fails, the frontend falls back to mock data in `getMockProfile()`.  
- **Backend:** `backend/api/views.py` defines `profile(request)` (GET); `backend/api/urls.py` adds `path("profile", views.profile)`.

## What else you can add

1. **Edit profile** — Form/modal to update name, age, height, weight; `PATCH /api/user/<id>` or `PUT /api/profile` and sync with `getProfile` response.  
2. **Exercise summary** — Per-exercise stats: e.g. “Tree Pose: 12 sessions, 140 total reps, 88% avg accuracy.” Backend can aggregate `Session` by `exercise_type`.  
3. **Goals** — “Work out 4x this week”, “Reach 100 reps this month.” Store in a `UserGoal` model or in `localStorage` for a quick front-end-only version.  
4. **Charts** — Line chart of “workouts per week” or “accuracy over time” using something like Chart.js or Recharts.  
5. **Personal records** — “Best rep count per exercise” from `Session.total_reps` and `exercise_type`.  
6. **Calendar view** — Small calendar with dots or highlights on days that have sessions (reuse `weeklyActivity` or a monthly API).  
7. **Notifications / reminders** — “You haven’t worked out in 3 days” (compare last session date with today).  
8. **Export data** — “Download my workout history” (CSV/JSON) from sessions and reps.

## Backend profile response shape (for reference)

```json
{
  "name": "Alex Johnson",
  "email": "alex@example.com",
  "age": 28,
  "height": 70,
  "weight": 165,
  "totalWorkouts": 24,
  "thisWeek": 4,
  "streakDays": 7,
  "avgScore": 87,
  "recentWorkouts": [
    { "exercise_type": "tree_pose", "date": "2025-03-03", "reps": 12, "accuracy": 92 }
  ],
  "weeklyActivity": [ true, true, false, true, true, false, true ]
}
```

`weeklyActivity` is ordered Mon→Sun for the current week.
