import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/Layout';
import { ExecutionRowCompact } from '../components/ExecutionRow';
import { PassRateTrendChart } from '../components/AnalyticsCharts';
import { Button, Card, EmptyState, LoadingSpinner } from '../components/ui';
import * as dashboardApi from '../api/dashboard';
import * as analyticsApi from '../api/analytics';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [passTrend, setPassTrend] = useState([]);
  const [trendLoading, setTrendLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await dashboardApi.getDashboardSummary();
        if (!cancelled) setSummary(data);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || err.message || 'Failed to load dashboard');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadTrend() {
      setTrendLoading(true);
      try {
        const data = await analyticsApi.getPassRateTrend({ days: 30 });
        if (!cancelled) setPassTrend(data);
      } catch {
        if (!cancelled) setPassTrend([]);
      } finally {
        if (!cancelled) setTrendLoading(false);
      }
    }

    loadTrend();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <LoadingSpinner label="Loading summary…" />
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <div className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{error}</div>
      </>
    );
  }

  const hasCollections = (summary?.totalCollections || 0) > 0;
  const passRateLabel =
    summary?.recentPassRate == null ? '—' : `${summary.recentPassRate}%`;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${user?.email}`}
      />

      {!hasCollections ? (
        <EmptyState
          title="Get started by uploading your first Postman collection"
          description="Once you have a collection and environment, you can run Newman tests and track results here."
          actionLabel="Upload Collection"
          onAction={() => navigate('/collections')}
        />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
                Collections
              </p>
              <p className="mt-2 text-3xl font-bold text-fg">
                {summary.totalCollections}
              </p>
            </Card>
            <Card>
              <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
                Environments
              </p>
              <p className="mt-2 text-3xl font-bold text-fg">
                {summary.totalEnvironments}
              </p>
            </Card>
            <Card>
              <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
                Executions
              </p>
              <p className="mt-2 text-3xl font-bold text-fg">
                {summary.totalExecutions}
              </p>
            </Card>
            <Card>
              <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
                Pass rate (last 20)
              </p>
              {summary.recentPassRateSampleSize != null && (
                <p className="mt-0.5 text-xs text-fg-muted">
                  Based on {summary.recentPassRateSampleSize} finished run
                  {summary.recentPassRateSampleSize === 1 ? '' : 's'}
                </p>
              )}
              <p className="mt-2 text-3xl font-bold text-fg">{passRateLabel}</p>
            </Card>
          </div>

          <Card>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-fg-secondary">Pass rate (30 days)</p>
                <p className="text-xs text-fg-muted">Sparkline from daily execution results</p>
              </div>
              <Link
                to="/analytics"
                className="text-sm font-medium text-fg-secondary underline-offset-2 hover:underline"
              >
                Open Analytics
              </Link>
            </div>
            {trendLoading ? (
              <LoadingSpinner label="Loading trend…" />
            ) : passTrend.length === 0 ? (
              <p className="py-6 text-center text-sm text-fg-muted">
                No execution data yet for this range — run some collections first
              </p>
            ) : (
              <div className="h-[72px] w-full">
                <PassRateTrendChart data={passTrend} sparkline height={72} />
              </div>
            )}
          </Card>

          <Card>
            <p className="text-sm font-medium text-fg-secondary">Quick actions</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={() => navigate('/collections')}>Upload Collection</Button>
              <Button variant="secondary" onClick={() => navigate('/collections')}>
                Run a Collection
              </Button>
              <Button variant="secondary" onClick={() => navigate('/api-keys')}>
                Generate API Key
              </Button>
            </div>
          </Card>

          <Card padding={false}>
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 className="text-sm font-semibold text-fg-secondary">Recent Executions</h2>
              <Link
                to="/executions"
                className="text-sm font-medium text-fg-secondary underline-offset-2 hover:underline"
              >
                View all
              </Link>
            </div>

            {!summary.recentExecutions?.length ? (
              <p className="px-5 py-8 text-sm text-fg-muted">
                No executions yet. Open a collection and click Run.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {summary.recentExecutions.map((item) => (
                  <ExecutionRowCompact key={item.id} execution={item} />
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
