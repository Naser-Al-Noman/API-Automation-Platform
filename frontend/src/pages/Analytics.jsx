import { useEffect, useState } from 'react';
import { PageHeader } from '../components/Layout';
import {
  ChartCard,
  EndpointReliabilityChart,
  PassRateTrendChart,
  ResponseTimeChart,
  SchemaValidationChart,
} from '../components/AnalyticsCharts';
import { Card, EmptyState } from '../components/ui';
import * as analyticsApi from '../api/analytics';
import * as collectionsApi from '../api/collections';

const DAY_OPTIONS = [7, 30, 90];

export default function Analytics() {
  const [collections, setCollections] = useState([]);
  const [collectionId, setCollectionId] = useState('');
  const [days, setDays] = useState(30);

  const [passTrend, setPassTrend] = useState([]);
  const [responseTimes, setResponseTimes] = useState([]);
  const [endpoints, setEndpoints] = useState([]);
  const [schemas, setSchemas] = useState([]);

  const [loadingTrend, setLoadingTrend] = useState(true);
  const [loadingResponse, setLoadingResponse] = useState(true);
  const [loadingEndpoints, setLoadingEndpoints] = useState(false);
  const [loadingSchemas, setLoadingSchemas] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadCollections() {
      try {
        const cols = await collectionsApi.listCollections();
        if (!cancelled) setCollections(cols);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || err.message || 'Failed to load collections');
        }
      }
    }
    loadCollections();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadTrends() {
      setLoadingTrend(true);
      setLoadingResponse(true);
      setError('');
      try {
        const params = {
          days,
          collectionId: collectionId || undefined,
        };
        const [trend, times] = await Promise.all([
          analyticsApi.getPassRateTrend(params),
          analyticsApi.getResponseTimes(params),
        ]);
        if (!cancelled) {
          setPassTrend(trend);
          setResponseTimes(times);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || err.message || 'Failed to load analytics');
          setPassTrend([]);
          setResponseTimes([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingTrend(false);
          setLoadingResponse(false);
        }
      }
    }

    loadTrends();
    return () => {
      cancelled = true;
    };
  }, [collectionId, days]);

  useEffect(() => {
    let cancelled = false;

    async function loadPerEndpoint() {
      if (!collectionId) {
        setEndpoints([]);
        setSchemas([]);
        setLoadingEndpoints(false);
        setLoadingSchemas(false);
        return;
      }

      setLoadingEndpoints(true);
      setLoadingSchemas(true);
      try {
        const [rel, schema] = await Promise.all([
          analyticsApi.getEndpointReliability({ collectionId }),
          analyticsApi.getSchemaValidationSummary({ collectionId }),
        ]);
        if (!cancelled) {
          setEndpoints(rel);
          setSchemas(schema);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || err.message || 'Failed to load endpoint analytics');
          setEndpoints([]);
          setSchemas([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingEndpoints(false);
          setLoadingSchemas(false);
        }
      }
    }

    loadPerEndpoint();
    return () => {
      cancelled = true;
    };
  }, [collectionId]);

  const selectClass =
    'rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-border-strong';

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Pass rate, performance, and reliability trends across your collections"
      />

      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <label className="block min-w-[200px] flex-1">
            <span className="mb-1 block text-xs font-medium text-fg-muted">Collection</span>
            <select
              className={`w-full ${selectClass}`}
              value={collectionId}
              onChange={(e) => setCollectionId(e.target.value)}
            >
              <option value="">All Collections</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-fg-muted">Time range</span>
            <div className="flex gap-2">
              {DAY_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  className={`rounded-md px-3 py-2 text-sm font-medium ${
                    days === d
                      ? 'bg-accent text-accent-fg'
                      : 'border border-border-strong bg-surface text-fg-secondary hover:bg-surface-2'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </label>
        </div>
      </Card>

      {error && (
        <div className="mb-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{error}</div>
      )}

      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard
            title="Pass rate trend"
            description={`Daily pass rate over the last ${days} days`}
            loading={loadingTrend}
            empty={!loadingTrend && passTrend.length === 0}
          >
            <PassRateTrendChart data={passTrend} />
          </ChartCard>

          <ChartCard
            title="Average response time"
            description="Mean response time (ms) from execution summaries"
            loading={loadingResponse}
            empty={!loadingResponse && responseTimes.length === 0}
          >
            <ResponseTimeChart data={responseTimes} />
          </ChartCard>
        </div>

        {!collectionId ? (
          <Card>
            <EmptyState
              title="Select a collection for endpoint charts"
              description="Endpoint reliability and schema validation need a specific collection."
            />
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard
              title="Endpoint reliability"
              description="Worst pass rates first — flaky endpoints rise to the top"
              loading={loadingEndpoints}
              empty={!loadingEndpoints && endpoints.length === 0}
              emptyMessage="No per-request data for this collection yet"
              height={Math.max(280, endpoints.length * 36)}
            >
              <EndpointReliabilityChart data={endpoints} />
            </ChartCard>

            <ChartCard
              title="Schema validation"
              description="Valid vs invalid schema checks per endpoint"
              loading={loadingSchemas}
              empty={!loadingSchemas && schemas.length === 0}
              emptyMessage="No schema validation results yet — define schemas on this collection and re-run"
            >
              <SchemaValidationChart data={schemas} />
            </ChartCard>
          </div>
        )}
      </div>
    </>
  );
}
