# HTML execution reports

Newman writes per-execution HTML reports under `backend/reports/` (e.g. `123.html`)
and the API also stores the same HTML in Neon Postgres (`executions.report_html`).

Served by:
- `GET /api/executions/:id/report`
- `GET /api/executions/:id/report/download`

## Persistence (Neon)

Render’s disk is **ephemeral** — local `reports/` files disappear after
restart/redeploy. To keep reports available:

1. After each run, the HTML is saved to `executions.report_html`
2. If the local file is missing, the API serves the copy from Neon

No extra cloud account or payment method is required beyond your existing
Neon database.

After deploying this change, run migrations on the backend:

```bash
npm run migrate
```

(On Render: one-off shell / release command, or include migrate in the start
command if you already do.)

## Reports created before this change

Older executions that never stored `report_html` (and whose local files were
already wiped) cannot be recovered. Re-run the collection to generate a new
report that is persisted in the database.

## Local development

Locally, reports also remain on disk under `backend/reports/` (gitignored).
The DB copy is still written so local and production behave the same.
