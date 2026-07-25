import { useEffect, useState } from 'react';
import { getHealth, getHealthDb } from '../api/client';

function StatusCard({ title, loading, error, data }) {
  let badge = 'Checking…';
  let badgeClass = 'bg-slate-200 text-slate-700';

  if (!loading && error) {
    badge = 'Failed';
    badgeClass = 'bg-red-100 text-red-800';
  } else if (!loading && data) {
    const ok = data.status === 'ok';
    badge = ok ? 'OK' : 'Error';
    badgeClass = ok ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900';
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <span className={`rounded px-2.5 py-1 text-xs font-medium ${badgeClass}`}>
          {badge}
        </span>
      </div>
      {loading && <p className="text-sm text-slate-500">Loading…</p>}
      {error && (
        <pre className="overflow-x-auto rounded bg-red-50 p-3 text-xs text-red-800">
          {error}
        </pre>
      )}
      {!loading && !error && data && (
        <pre className="overflow-x-auto rounded bg-slate-50 p-3 text-xs text-slate-800">
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
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Phase 1 · Scaffold
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            API Automation Platform
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600">
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
