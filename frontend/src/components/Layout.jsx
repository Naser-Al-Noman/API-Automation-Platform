import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from './ui/Button';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', end: true },
  { to: '/analytics', label: 'Analytics' },
  { to: '/collections', label: 'Collections' },
  { to: '/environments', label: 'Environments' },
  { to: '/executions', label: 'Executions' },
  { to: '/api-keys', label: 'API Keys' },
];

function navClass({ isActive }) {
  return `block rounded-md px-3 py-2 text-sm font-medium ${
    isActive
      ? 'bg-slate-900 text-white'
      : 'text-slate-700 hover:bg-slate-100'
  }`;
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  function closeMobile() {
    setMobileOpen(false);
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 px-4 py-4">
        <Link
          to="/dashboard"
          onClick={closeMobile}
          className="text-base font-semibold text-slate-900"
        >
          API Automation Platform
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={navClass}
            onClick={closeMobile}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-slate-200 bg-white lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close menu"
            onClick={closeMobile}
          />
          <aside className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-800 lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                Menu
              </button>
              <span className="hidden text-sm text-slate-500 sm:inline lg:hidden">
                API Automation Platform
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="max-w-[200px] truncate text-sm text-slate-600 sm:max-w-none">
                {user?.email}
              </span>
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export function PageHeader({ title, actions, description }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
