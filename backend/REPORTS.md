# HTML execution reports (`backend/reports/`)

Newman writes per-execution HTML reports here (e.g. `123.html`), served by
`GET /api/executions/:id/report`.

## Ephemeral disk on Render

On Render’s free/standard web services the filesystem is **ephemeral**:

- Reports written during a run live only on that instance
- A **restart, redeploy, or scale event** can wipe `reports/`
- After that, report download/preview returns 404 even though the execution
  row (and `summary_json`) still exist in Neon

This is an accepted Phase 10 limitation. Persistent object storage (S3, R2,
etc.) is out of scope for now.

## Local development

Locally, reports persist on your machine until you delete them. The folder is
gitignored (`backend/reports/` in the root `.gitignore`).
