# API Automation Platform

Full-stack platform for automating REST API testing with **Postman collections** and **Newman**.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React (Vite), Tailwind CSS, Recharts, React Router, Axios |
| Backend | Node.js, Express |
| Database | PostgreSQL on Neon (serverless) |
| Test runner | Postman collections + Newman + newman-reporter-htmlextra |
| Validation | JSON Schema (Ajv) |
| CI | GitHub Actions |
| Deploy | Frontend → Vercel, Backend → Render, DB → Neon |

## Project Structure

```
/
├── backend/          # Express API
├── frontend/         # React (Vite) app
├── .github/workflows # CI (Phase 6)
└── README.md
```

## Data Model

- **users** — id, email, password_hash, created_at
- **collections** — id, user_id, name, postman_json, created_at
- **environments** — id, user_id, name, variables_json
- **executions** — id, collection_id, environment_id, status, started_at, finished_at, report_url, summary_json
- **schemas** — id, collection_id, endpoint, schema_json

## Phase Plan

| Phase | Scope |
|-------|--------|
| **1. Scaffold** | Monorepo layout, Express + Vite apps, Neon connection, health checks, migrations |
| **2. Auth** | JWT register/login, protected routes |
| **3. Collections & environments** | Upload/parse/store Postman collections + envs, CRUD APIs |
| **4. Newman execution engine** | Run collections, capture results, HTML reports |
| **5. JSON Schema validation** | Validate API responses against schemas |
| **6. GitHub Actions** | Trigger runs, webhook results back |
| **7. Frontend core** | Auth pages, dashboard shell, collection/env UI |
| **8. Execution history & reports** | History list and HTML report viewer |
| **9. Dashboards** | Pass/fail trends, response time charts (Recharts) |
| **10. Deployment** | Render + Vercel, CORS, seed data |
| **11. Polish** | README polish, demo data, error handling |

## Local Development

### Prerequisites

- Node.js 18+
- A free Neon Postgres database ([neon.tech](https://neon.tech))

### 1. Neon connection string

1. Sign up / log in at [https://console.neon.tech](https://console.neon.tech)
2. Create a new project (pick a region close to you)
3. After creation, open the project → **Connection Details**
4. Copy the connection string (URI). It looks like:
   `postgres://user:password@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require`
5. Paste it into `backend/.env` as `DATABASE_URL`

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env: set DATABASE_URL and JWT_SECRET
npm install
npm run migrate
npm run dev
```

Backend runs at `http://localhost:5000`.

### 3. Frontend

```bash
cd frontend
cp .env.example .env
# VITE_API_URL=http://localhost:5000 is usually fine as-is
npm install
npm run dev
```

Frontend runs at `http://localhost:5173` (Vite default).

### Environment variables

**Backend (`backend/.env`)**

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon Postgres connection URI |
| `JWT_SECRET` | Yes (Phase 2+) | Long random string used to sign JWTs |
| `PORT` | No | Defaults to `5000` |

**Frontend (`frontend/.env`)**

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Backend base URL, e.g. `http://localhost:5000` |

## License

Private / TBD
