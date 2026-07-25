# API Automation Platform

Full-stack platform for automating REST API testing with **Postman collections** and **Newman**. Upload collections and environments, run tests (including CI via API keys), validate responses with JSON Schema, browse execution history and HTML reports, and monitor pass-rate / performance trends.

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React (Vite), Tailwind CSS, Recharts, React Router, Axios |
| Backend | Node.js, Express |
| Database | PostgreSQL on Neon (serverless) |
| Test runner | Postman collections + Newman + newman-reporter-htmlextra |
| Validation | JSON Schema (Ajv) |
| CI | GitHub Actions (workflow template) + API-key CI endpoints |
| Deploy | Frontend → **Vercel**, Backend → **Render**, DB → **Neon** |

## Production architecture

```
  Browser
     │
     ▼
┌─────────────┐     HTTPS / JSON      ┌──────────────────┐
│   Vercel    │ ───────────────────►  │  Render (Node)   │
│  (React SPA)│ ◄───────────────────  │  Express + Newman│
└─────────────┘   JWT / X-API-Key     └────────┬─────────┘
                                               │
                                               │ SQL (pg)
                                               ▼
                                      ┌──────────────────┐
                                      │  Neon Postgres   │
                                      └──────────────────┘
```

- **Vercel** hosts the static Vite build; `VITE_API_URL` points at the Render API.
- **Render** runs `npm start`, serves `/api/*` and `/health`, executes Newman in-process.
- **Neon** stores users, collections, environments, executions, schemas, and API keys.

### Live demo (fill in after deploy)

| | URL |
|--|-----|
| Frontend | _https://your-app.vercel.app_ |
| Backend | _https://your-api.onrender.com_ |
| Health | _https://your-api.onrender.com/health_ |

## Project structure

```
/
├── backend/                 # Express API (Render)
│   ├── render.yaml          # Render Blueprint placeholders
│   ├── REPORTS.md           # Ephemeral report storage note
│   └── src/
├── frontend/                # React Vite app (Vercel)
│   └── vercel.json          # SPA rewrite for client routes
├── .github/workflows/       # CI workflow template (Phase 6)
└── README.md
```

## Data model

- **users** — id, email, password_hash, created_at
- **collections** — id, user_id, name, postman_json, created_at
- **environments** — id, user_id, name, variables_json
- **executions** — id, collection_id, environment_id, status, started_at, finished_at, report_url, summary_json
- **schemas** — id, collection_id, endpoint, schema_json
- **api_keys** — hashed keys for CI (`X-API-Key`)

## Phase plan

| Phase | Scope | Status |
|-------|--------|--------|
| **1. Scaffold** | Monorepo, Express + Vite, Neon, health, migrations | Complete |
| **2. Auth** | JWT register/login, protected routes | Complete |
| **3. Collections & environments** | Upload/parse/store Postman JSON, CRUD | Complete |
| **4. Newman execution engine** | Async runs, summaries, HTML reports | Complete |
| **5. JSON Schema validation** | Ajv validation during Newman runs | Complete |
| **6. GitHub Actions / CI API** | API keys, CI execution endpoints, workflow template | Complete |
| **7. Unified layout & dashboard** | Sidebar shell, summary home | Complete |
| **8. Execution history & reports** | Filters, pagination, download, report polish | Complete |
| **9. Analytics** | Pass/fail & response-time charts (Recharts) | Complete |
| **10. Deployment prep** | Render + Vercel config, CORS, docs | Complete |
| **11. Polish** | README polish, demo data, error handling | Pending |

## Local development

### Prerequisites

- Node.js 18+ (20 recommended)
- A free Neon Postgres database ([neon.tech](https://neon.tech))

### 1. Database

1. Create a Neon project and copy the connection URI (prefer the **pooled** host, `…-pooler…`, with `?sslmode=require`).
2. Put it in `backend/.env` as `DATABASE_URL`.

### 2. Backend

```bash
cd backend
cp .env.example .env
# Set DATABASE_URL, JWT_SECRET, optional FRONTEND_URL=http://localhost:5173
npm install
npm run migrate
npm run dev
```

- Dev: `npm run dev` (nodemon)
- Prod-like: `npm start` (plain `node`)
- Migrate anytime: `npm run migrate`

API: `http://localhost:5000` — check `GET /health` and `GET /health/db`.

### 3. Frontend

```bash
cd frontend
cp .env.example .env
# VITE_API_URL=http://localhost:5000
npm install
npm run dev
```

App: `http://localhost:5173`.

### Environment variables

**Backend (`backend/.env`)**

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon Postgres URI (pooled + `sslmode=require`) |
| `JWT_SECRET` | Yes | Long random string for signing JWTs |
| `PORT` | No | Defaults to `5000`; Render sets this automatically |
| `FRONTEND_URL` | Prod | Comma-separated allowed CORS origins (e.g. Vercel URLs) |

**Frontend (`frontend/.env`)**

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Backend base URL, no trailing slash |

## Deployment (summary)

Full click-by-click steps are in the Phase 10 handoff (Neon → Render → Vercel → wire CORS). Order matters:

1. Confirm Neon `DATABASE_URL` (pooled).
2. Deploy **backend** on Render → get `https://….onrender.com`.
3. Run `npm run migrate` against Neon (local or Render shell).
4. Deploy **frontend** on Vercel with `VITE_API_URL` = Render URL.
5. Set Render `FRONTEND_URL` to the Vercel origin(s), then redeploy backend if needed.

Blueprint / config files:

- `backend/render.yaml` — Render service placeholders
- `frontend/vercel.json` — SPA rewrites (`/dashboard` etc. → `index.html`)

## Known limitations

- **Ephemeral HTML reports on Render** — Newman writes files under `backend/reports/`. Render’s disk can wipe on restart/redeploy, so report preview/download may 404 afterward even though execution rows and analytics summaries remain in Neon. See `backend/REPORTS.md`. No S3/object storage yet.
- **In-process Newman (Phase 4)** — Runs execute inside the web process (no job queue). Long collections block that instance; if the server dies mid-run, an execution can stay stuck in `running`.
- **Timeouts** — Collection runs and per-request timeouts are capped in the Newman service (order of ~10 minutes / ~30s request); very large suites may fail or need splitting.
- **Free-tier cold starts** — Render free web services sleep; the first request after idle can be slow.
- **CI from GitHub Actions** — Needs a publicly reachable `BACKEND_URL` and secrets; the repo ships a workflow **example** until you rename/enable it for a deployed API.
- **No rate limiting** yet on auth or API keys.

## License

Private / TBD
