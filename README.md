# Pose Corrector App

Single folder containing the full **Pose Corrector AI** stack: **frontend** (Silky) and **backend** (Prakriti) with auth, video upload, and live pose analysis connected.

## Structure

```
Pose-Corrector-App/
├── frontend/     # React app (Silky) – UI, auth, upload, live camera
├── backend/      # Django + ML (Prakriti) – API, pose models, exercise detection
└── README.md     # This file
```

## Quick start

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
# Configure database in backend/exercise_correction/settings.py (e.g. MySQL)
python manage.py migrate
python manage.py runserver 8000
```

API base: `http://localhost:8000` (e.g. `/api/auth/signin`, `/api/video/stream`, `/api/video/upload`).

### 2. Frontend

```bash
cd frontend
cp .env.example .env
# Set REACT_APP_API_URL=http://localhost:8000 in .env
npm install
npm start
```

App: `http://localhost:3000`. It will call the backend at the URL set in `.env`.

## What’s included

- **Auth:** Sign up / Sign in → backend `api` app and DB.
- **Upload:** Video file → `POST /api/video/upload` → accuracy, message, reps.
- **Live:** Camera + MediaPipe Pose in browser → landmarks → `POST /api/video/stream` → real-time feedback and rep count.

Exercise IDs are mapped automatically (e.g. `tree-pose` → `tree_pose`, `pushup` → `push_up`).

## Backend requirements

- Python 3.8+
- Database (e.g. MySQL) and settings in `backend/exercise_correction/settings.py`
- ML model files in `backend/static/model/` (e.g. `*_model.pkl`, `*_input_scaler.pkl`) if you use the full detection pipeline.

## Frontend requirements

- Node 18+
- `REACT_APP_API_URL` in `frontend/.env` pointing at the backend (e.g. `http://localhost:8000`).

## Sign up / Sign in (404)

If you see **"Sign up failed (404)"** or **"This site can't be reached"** when creating an account or signing in, the frontend is not talking to the backend. Do both:

1. **Backend must be running:** `cd backend && python manage.py migrate && python manage.py runserver 8000`
2. **Frontend must use backend URL:** `frontend/.env` must contain `REACT_APP_API_URL=http://localhost:8000` (then restart the frontend with `npm start`).
