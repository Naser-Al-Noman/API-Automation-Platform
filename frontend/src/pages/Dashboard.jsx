import { Link } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <AppShell title="Dashboard">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
          Phase 4 · Newman Execution
        </p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">
          Welcome, {user?.email}
        </h2>
        <p className="mt-2 text-slate-600">
          Upload collections and environments, then run them with Newman and review HTML reports.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Link
            to="/collections"
            className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-4 hover:border-slate-300 hover:bg-white"
          >
            <h3 className="font-semibold text-slate-900">Collections</h3>
            <p className="mt-1 text-sm text-slate-600">
              Upload Postman collections and start runs.
            </p>
          </Link>
          <Link
            to="/environments"
            className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-4 hover:border-slate-300 hover:bg-white"
          >
            <h3 className="font-semibold text-slate-900">Environments</h3>
            <p className="mt-1 text-sm text-slate-600">
              Manage variables used during Newman runs.
            </p>
          </Link>
          <Link
            to="/executions"
            className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-4 hover:border-slate-300 hover:bg-white"
          >
            <h3 className="font-semibold text-slate-900">Executions</h3>
            <p className="mt-1 text-sm text-slate-600">
              View run history, status, and HTML reports.
            </p>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
