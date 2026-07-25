import React, { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from '../../hooks/useTheme';

const COLORS = {
  planning: '#3b82f6', // Blue
  active: '#10b981', // Green
  on_hold: '#f59e0b', // Yellow
  completed: '#8b5cf6', // Purple
  cancelled: '#ef4444', // Red
};

const STATUS_LABELS = {
  planning: 'Planning',
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const RADIAN = Math.PI / 180;

const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.65;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null; // Don't show label for very small slices

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={600}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const CustomTooltip = ({ active, payload, isDark }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const total = payload[0].payload.total || 1;
    const percent = ((data.value / total) * 100).toFixed(1);

    return (
      <div
        style={{
          backgroundColor: isDark ? '#1f2937' : '#ffffff',
          border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        }}
      >
        <p
          style={{
            fontWeight: 600,
            marginBottom: '4px',
            color: isDark ? '#f9fafb' : '#111827',
          }}
        >
          {data.name}
        </p>
        <p style={{ fontSize: '14px', color: isDark ? '#d1d5db' : '#4b5563' }}>
          Projects: <strong>{data.value}</strong>
        </p>
        <p style={{ fontSize: '12px', color: isDark ? '#9ca3af' : '#6b7280' }}>
          {percent}% of total
        </p>
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ payload, isDark }) => {
  if (!payload) return null;

  return (
    <ul
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '16px',
        listStyle: 'none',
        padding: 0,
        marginTop: '8px',
        flexWrap: 'wrap',
      }}
    >
      {payload.map((entry, index) => (
        <li
          key={`legend-${index}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            color: isDark ? '#d1d5db' : '#4b5563',
            cursor: 'default',
          }}
        >
          <span
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '3px',
              backgroundColor: entry.color,
              display: 'inline-block',
            }}
          />
          {entry.value}
        </li>
      ))}
    </ul>
  );
};

const ProjectChart = ({ data }) => {
  const { isDark } = useTheme();

  const chartData = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];

    const filtered = data
      .filter((item) => (item.value || item.count || 0) > 0)
      .map((item) => ({
        name:
          STATUS_LABELS[item.name || item._id] ||
          item.name ||
          item._id ||
          'Unknown',
        value: item.value || item.count || 0,
        originalName: item.name || item._id,
      }));

    const total = filtered.reduce((sum, item) => sum + item.value, 0);

    return filtered.map((item) => ({
      ...item,
      total,
    }));
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500">
        <div className="text-center">
          <svg
            className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
            />
          </svg>
          <p className="text-sm">No project data available</p>
          <p className="text-xs mt-1">Create projects to see distribution</p>
        </div>
      </div>
    );
  }

  // Only one status - show simple display
  if (chartData.length === 1) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{
              backgroundColor:
                (COLORS[chartData[0].originalName] || '#3b82f6') + '20',
            }}
          >
            <span
              className="text-3xl font-bold"
              style={{ color: COLORS[chartData[0].originalName] || '#3b82f6' }}
            >
              {chartData[0].value}
            </span>
          </div>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {chartData[0].name}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            All projects are in this status
          </p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomizedLabel}
          outerRadius={100}
          innerRadius={55}
          fill="#8884d8"
          dataKey="value"
          paddingAngle={2}
          animationBegin={0}
          animationDuration={800}
          animationEasing="ease-out"
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[entry.originalName] || '#3b82f6'}
              stroke={isDark ? '#1f2937' : '#ffffff'}
              strokeWidth={2}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip isDark={isDark} />} />
        <Legend content={<CustomLegend isDark={isDark} />} />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default React.memo(ProjectChart);
