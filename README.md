# School-website-software

Enterprise-ready modular school management baseline with Vanilla JS frontend and FastAPI backend.

## Structure

- `frontend/` SPA UI (12 primary tabs, editable labels, tokenized theme system, offline-safe fallback rendering)
- `backend/` FastAPI API, modular routes/controllers/services/middleware


## Windows one-click start

- Double-click `start_app.bat` from the project root.
- It will create `.venv` if missing, install dependencies, start backend + frontend in separate terminals, and open `http://127.0.0.1:5173`.

## 1) Environment setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

## 2) Run backend API

```bash
source .venv/bin/activate
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

## 3) Run frontend

```bash
python -m http.server 5173 -d frontend
```

Open `http://localhost:5173`.

## 4) Quick runtime checks

```bash
curl -sS http://127.0.0.1:8000/health | jq .
curl -sS http://127.0.0.1:8000/api/settings | jq .
curl -sS http://127.0.0.1:8000/api/dashboard/stats | jq .
curl -sS -X POST http://127.0.0.1:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin1234"}' | jq .
```

## Initial auth

- username: `admin`
- password: `admin1234`

## Implemented foundations

- Standard API response envelope
- Login endpoint setting httpOnly cookie
- Dashboard stats + notices + analytics APIs
- Settings engine with instant persistence and editable tab labels
- Dynamic navigation tab rendering for required primary modules
- Design token system and interactive state styling
- API resilience strategy with retries + offline fallback data for controlled UX when backend is unavailable

## Dependency note

- `bcrypt==3.2.2` is pinned for compatibility with `passlib==1.7.4` in this codebase.
