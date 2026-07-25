import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const linkClass = ({ isActive }) =>
  `rounded-md px-3 py-1.5 text-sm font-medium ${
    isActive
      ? 'bg-slate-900 text-white'
      : 'text-slate-700 hover:bg-slate-100'
  }`;

export default function AppShell({ children, title, actions }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/dashboard" className="text-lg font-semibold text-slate-900">
              API Automation Platform
            </Link>
            <nav className="flex flex-wrap items-center gap-1">
              <NavLink to="/dashboard" className={linkClass} end>
                Dashboard
              </NavLink>
              <NavLink to="/collections" className={linkClass}>
                Collections
              </NavLink>
              <NavLink to="/environments" className={linkClass}>
                Environments
              </NavLink>
              <NavLink to="/executions" className={linkClass}>
                Executions
              </NavLink>
              <NavLink to="/api-keys" className={linkClass}>
                API Keys
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">{user?.email}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {(title || actions) && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            {title ? <h1 className="text-2xl font-bold text-slate-900">{title}</h1> : <div />}
            {actions}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
