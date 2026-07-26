import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/Layout';
import ExecutionRow from '../components/ExecutionRow';
import { Button, Card, EmptyState, LoadingSpinner } from '../components/ui';
import * as executionsApi from '../api/executions';
import * as collectionsApi from '../api/collections';
import * as environmentsApi from '../api/environments';

const FILTER_KEYS = [
  'status',
  'collectionId',
  'environmentId',
  'startDate',
  'endDate',
  'search',
  'page',
];

function readFilters(searchParams) {
  return {
    status: searchParams.get('status') || '',
    collectionId: searchParams.get('collectionId') || '',
    environmentId: searchParams.get('environmentId') || '',
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
    search: searchParams.get('search') || '',
    page: searchParams.get('page') || '1',
  };
}

function countActiveFilters(filters) {
  let n = 0;
  if (filters.status) n += 1;
  if (filters.collectionId) n += 1;
  if (filters.environmentId) n += 1;
  if (filters.startDate) n += 1;
  if (filters.endDate) n += 1;
  if (filters.search) n += 1;
  return n;
}

function writeParams(filters) {
  const next = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = filters[key];
    if (!value || (key === 'page' && String(value) === '1')) continue;
    next.set(key, String(value));
  }
  return next;
}

export default function ExecutionHistory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);
  const activeFilterCount = countActiveFilters(filters);

  const [searchInput, setSearchInput] = useState(filters.search);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [collections, setCollections] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [deletingId, setDeletingId] = useState(null);

  const debounceRef = useRef(null);

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  useEffect(() => {
    let cancelled = false;
    async function loadOptions() {
      try {
        const [cols, envs] = await Promise.all([
          collectionsApi.listCollections(),
          environmentsApi.listEnvironments(),
        ]);
        if (!cancelled) {
          setCollections(cols);
          setEnvironments(envs);
        }
      } catch {
        // Dropdowns stay empty; list still works
      }
    }
    loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateFilters = useCallback(
    (patch, { resetPage = true } = {}) => {
      const next = {
        ...filters,
        ...patch,
      };
      if (resetPage && patch.page === undefined) {
        next.page = '1';
      }
      setSearchParams(writeParams(next), { replace: true });
    },
    [filters, setSearchParams]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (searchInput === filters.search) return;
      updateFilters({ search: searchInput });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput, filters.search, updateFilters]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await executionsApi.listExecutions({
        status: filters.status || undefined,
        collectionId: filters.collectionId || undefined,
        environmentId: filters.environmentId || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        search: filters.search || undefined,
        page: Number(filters.page) || 1,
        limit: 20,
      });
      setItems(data.executions || []);
      setTotal(data.total ?? 0);
      setPage(data.page ?? 1);
      setTotalPages(data.totalPages ?? 1);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load executions');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  // Live-update rows that are still running
  useEffect(() => {
    const runningIds = items.filter((item) => item.status === 'running').map((item) => item.id);
    if (runningIds.length === 0) return undefined;

    const timer = setInterval(async () => {
      let changed = false;
      await Promise.all(
        runningIds.map(async (id) => {
          try {
            const { status } = await executionsApi.getExecutionStatus(id);
            if (status !== 'running') changed = true;
          } catch {
            // ignore single-row poll errors
          }
        })
      );
      if (changed) {
        load();
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [items, load]);

  function clearFilters() {
    setSearchInput('');
    setSearchParams(new URLSearchParams(), { replace: true });
  }

  async function handleDelete(execution) {
    const label = `#${execution.id} (${execution.collection_name})`;
    if (
      !window.confirm(
        `Delete execution ${label}? This permanently removes it and its report from the database.`
      )
    ) {
      return;
    }
    setDeletingId(execution.id);
    setError('');
    try {
      await executionsApi.deleteExecution(execution.id);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to delete execution');
    } finally {
      setDeletingId(null);
    }
  }

  const selectClass =
    'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500';
  const inputClass =
    'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500';

  return (
    <>
      <PageHeader
        title="Execution History"
        description={total > 0 ? `${total} total execution${total === 1 ? '' : 's'}` : undefined}
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="text-sm font-medium text-slate-800">Filters</p>
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">
                {activeFilterCount} active filter{activeFilterCount === 1 ? '' : 's'}
              </span>
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Status</span>
            <select
              className={`w-full ${selectClass}`}
              value={filters.status}
              onChange={(e) => updateFilters({ status: e.target.value })}
            >
              <option value="">All</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
              <option value="running">Running</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Collection</span>
            <select
              className={`w-full ${selectClass}`}
              value={filters.collectionId}
              onChange={(e) => updateFilters({ collectionId: e.target.value })}
            >
              <option value="">All</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Environment</span>
            <select
              className={`w-full ${selectClass}`}
              value={filters.environmentId}
              onChange={(e) => updateFilters({ environmentId: e.target.value })}
            >
              <option value="">All</option>
              {environments.map((env) => (
                <option key={env.id} value={env.id}>
                  {env.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Start date</span>
            <input
              type="date"
              className={`w-full ${inputClass}`}
              value={filters.startDate}
              onChange={(e) => updateFilters({ startDate: e.target.value })}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">End date</span>
            <input
              type="date"
              className={`w-full ${inputClass}`}
              value={filters.endDate}
              onChange={(e) => updateFilters({ endDate: e.target.value })}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Search</span>
            <input
              type="search"
              placeholder="Collection name…"
              className={`w-full ${inputClass}`}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </label>
        </div>
      </Card>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <LoadingSpinner label="Loading executions…" />
      ) : items.length === 0 ? (
        <EmptyState
          title={activeFilterCount > 0 ? 'No executions match these filters' : 'No executions yet'}
          description={
            activeFilterCount > 0
              ? 'Try clearing filters or adjusting the date range.'
              : 'Open a collection and click Run to start one.'
          }
          actionLabel={activeFilterCount > 0 ? 'Clear filters' : 'Go to Collections'}
          onAction={activeFilterCount > 0 ? clearFilters : undefined}
          actionHref={activeFilterCount > 0 ? undefined : '/collections'}
        />
      ) : (
        <>
          <Card padding={false}>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Collection</th>
                    <th className="px-4 py-3 font-medium">Environment</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Started</th>
                    <th className="px-4 py-3 font-medium">Duration</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <ExecutionRow
                      key={item.id}
                      execution={item}
                      onDelete={handleDelete}
                      deleting={deletingId === item.id}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => updateFilters({ page: String(page - 1) }, { resetPage: false })}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => updateFilters({ page: String(page + 1) }, { resetPage: false })}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
