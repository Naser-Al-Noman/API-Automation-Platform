import { useEffect, useState } from 'react';
import { getHealth, getHealthDb } from '../api/client';

function StatusCard({ title, loading, error, data }) {
  let badge = 'Checking…';
  let badgeClass = 'bg-surface-2 text-fg-secondary';

  if (!loading && error) {
    badge = 'Failed';
    badgeClass = 'bg-badge-failed-bg text-badge-failed-fg';
  } else if (!loading && data) {
    const ok = data.status === 'ok';
    badge = ok ? 'OK' : 'Error';
    badgeClass = ok
      ? 'bg-badge-passed-bg text-badge-passed-fg'
      : 'bg-badge-running-bg text-badge-running-fg';
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-fg">{title}</h2>
        <span className={`rounded px-2.5 py-1 text-xs font-medium ${badgeClass}`}>
          {badge}
        </span>
      </div>
      {loading && <p className="text-sm text-fg-muted">Loading…</p>}
      {error && (
        <pre className="overflow-x-auto rounded bg-danger-soft p-3 text-xs text-danger">
          {error}
        </pre>
      )}
      {!loading && !error && data && (
        <pre className="overflow-x-auto rounded bg-surface-2 p-3 text-xs text-fg-secondary">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </section>
  );
}

export default function HomePage() {
  const [health, setHealth] = useState({ loading: true, data: null, error: null });
  const [healthDb, setHealthDb] = useState({ loading: true, data: null, error: null });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getHealth();
        if (!cancelled) setHealth({ loading: false, data, error: null });
      } catch (err) {
        if (!cancelled) {
          setHealth({
            loading: false,
            data: null,
            error: err.response?.data
              ? JSON.stringify(err.response.data, null, 2)
              : err.message,
          });
        }
      }

      try {
        const data = await getHealthDb();
        if (!cancelled) setHealthDb({ loading: false, data, error: null });
      } catch (err) {
        if (!cancelled) {
          setHealthDb({
            loading: false,
            data: null,
            error: err.response?.data
              ? JSON.stringify(err.response.data, null, 2)
              : err.message,
          });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-page">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <p className="text-sm font-medium uppercase tracking-wide text-fg-muted">
            Phase 1 · Scaffold
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-fg">
            API Automation Platform
          </h1>
          <p className="mt-2 max-w-2xl text-fg-muted">
            Connectivity check: frontend → Express backend → Neon Postgres.
            Both health endpoints should report OK when your env is configured.
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-3xl gap-4 px-4 py-8">
        <StatusCard
          title="GET /health"
          loading={health.loading}
          error={health.error}
          data={health.data}
        />
        <StatusCard
          title="GET /health/db"
          loading={healthDb.loading}
          error={healthDb.error}
          data={healthDb.data}
        />
      </main>
    </div>
  );
}
