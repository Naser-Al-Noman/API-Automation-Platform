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
import { useTheme } from '../context/ThemeContext';
import { EmptyState, LoadingSpinner } from './ui';

const CHART_EMPTY =
  'No execution data yet for this range — run some collections first';

function cssVar(name, fallback) {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function useChartColors() {
  const { theme } = useTheme();
  // theme in deps so colors refresh after toggle
  void theme;
  return {
    grid: cssVar('--app-chart-grid', '#334155'),
    line: cssVar('--app-chart-line', '#38bdf8'),
    line2: cssVar('--app-chart-line-2', '#7dd3fc'),
    muted: cssVar('--app-fg-muted', '#94a3b8'),
    surface: cssVar('--app-surface', '#0f172a'),
    border: cssVar('--app-border', '#334155'),
    fg: cssVar('--app-fg-secondary', '#e2e8f0'),
  };
}

function tooltipStyle(colors) {
  return {
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    color: colors.fg,
  };
}

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
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-fg-secondary">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-fg-muted">{description}</p>}
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
  const colors = useChartColors();

  if (sparkline) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
          <Line
            type="monotone"
            dataKey="passRate"
            stroke={colors.line}
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
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke={colors.muted} />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11 }}
            stroke={colors.muted}
            unit="%"
            width={40}
          />
          <Tooltip
            contentStyle={tooltipStyle(colors)}
            formatter={(value, name) => {
              if (name === 'passRate') return [`${value}%`, 'Pass rate'];
              return [value, name];
            }}
          />
          <Line
            type="monotone"
            dataKey="passRate"
            stroke={colors.line}
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
  const colors = useChartColors();

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke={colors.muted} />
          <YAxis tick={{ fontSize: 11 }} stroke={colors.muted} unit=" ms" width={56} />
          <Tooltip
            contentStyle={tooltipStyle(colors)}
            formatter={(value) => [`${value} ms`, 'Avg response']}
          />
          <Line
            type="monotone"
            dataKey="avgResponseTimeMs"
            stroke={colors.line2}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EndpointReliabilityChart({ data }) {
  const colors = useChartColors();
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
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
          <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={tooltipStyle(colors)}
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
  const colors = useChartColors();
  const chartData = data.map((d) => ({
    ...d,
    label: d.endpoint.length > 28 ? `${d.endpoint.slice(0, 25)}…` : d.endpoint,
  }));

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 48 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
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
            contentStyle={tooltipStyle(colors)}
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
