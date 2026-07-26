import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/ui';

export default function Register() {
  const { register, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!authLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await register(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <div className="relative w-full max-w-md rounded-xl border border-border bg-surface p-8 shadow-sm">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <h1 className="text-2xl font-bold text-fg">Create account</h1>
        <p className="mt-1 text-sm text-fg-muted">
          API Automation Platform
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-fg-secondary">Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-border-strong bg-page px-3 py-2 text-fg outline-none focus:border-border-strong focus:ring-1 focus:ring-border-strong"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-fg-secondary">Password</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-border-strong bg-page px-3 py-2 text-fg outline-none focus:border-border-strong focus:ring-1 focus:ring-border-strong"
            />
            <span className="mt-1 block text-xs text-fg-muted">At least 8 characters</span>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? 'Creating account…' : 'Register'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-fg-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-fg underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
