import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { EmptyState, LoadingSpinner } from './ui';

const CHART_EMPTY =
  'No execution data yet for this range — run some collections first';

export function ChartCard({
  title,
  description,
  loading,
  empty,
  emptyMessage,
  children,
  height = 280,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
      {loading ? (
        <div style={{ minHeight: height }} className="flex items-center justify-center">
          <LoadingSpinner label="Loading chart…" />
        </div>
      ) : empty ? (
        <EmptyState title={emptyMessage || CHART_EMPTY} />
      ) : (
        children
      )}
    </div>
  );
}

function passRateColor(rate) {
  if (rate == null) return '#94a3b8';
  if (rate < 70) return '#dc2626';
  if (rate < 90) return '#d97706';
  return '#059669';
}

export function PassRateTrendChart({ data, height = 280, sparkline = false }) {
  if (sparkline) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
          <Line
            type="monotone"
            dataKey="passRate"
            stroke="#0f172a"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#94a3b8" unit="%" width={40} />
          <Tooltip
            formatter={(value, name) => {
              if (name === 'passRate') return [`${value}%`, 'Pass rate'];
              return [value, name];
            }}
          />
          <Line
            type="monotone"
            dataKey="passRate"
            stroke="#0f172a"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ResponseTimeChart({ data, height = 280 }) {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
          <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" unit=" ms" width={56} />
          <Tooltip formatter={(value) => [`${value} ms`, 'Avg response']} />
          <Line
            type="monotone"
            dataKey="avgResponseTimeMs"
            stroke="#0369a1"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EndpointReliabilityChart({ data }) {
  const chartData = data.map((d) => ({
    ...d,
    label: d.endpoint.length > 40 ? `${d.endpoint.slice(0, 37)}…` : d.endpoint,
  }));
  const height = Math.max(280, chartData.length * 36);

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
          <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(value, _name, props) => [
              `${value}% (${props.payload.passed}/${props.payload.totalRuns})`,
              'Pass rate',
            ]}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.endpoint || ''}
          />
          <Bar dataKey="passRate" radius={[0, 4, 4, 0]}>
            {chartData.map((entry) => (
              <Cell key={entry.endpoint} fill={passRateColor(entry.passRate)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SchemaValidationChart({ data, height = 280 }) {
  const chartData = data.map((d) => ({
    ...d,
    label: d.endpoint.length > 28 ? `${d.endpoint.slice(0, 25)}…` : d.endpoint,
  }));

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 48 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10 }}
            interval={0}
            angle={-25}
            textAnchor="end"
            height={60}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
          <Tooltip
            formatter={(value, name) => [value, name === 'schemaValid' ? 'Valid' : 'Invalid']}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.endpoint || ''}
          />
          <Bar dataKey="schemaValid" stackId="schema" fill="#059669" name="schemaValid" />
          <Bar dataKey="schemaInvalid" stackId="schema" fill="#dc2626" name="schemaInvalid" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
