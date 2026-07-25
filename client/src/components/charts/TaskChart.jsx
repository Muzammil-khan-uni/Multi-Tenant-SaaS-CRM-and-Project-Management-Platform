import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useTheme } from '../../hooks/useTheme';

const COLORS = {
  todo: '#9ca3af',
  in_progress: '#3b82f6',
  review: '#f59e0b',
  completed: '#10b981',
};

const STATUS_LABELS = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  completed: 'Completed',
};

const STATUS_ORDER = ['todo', 'in_progress', 'review', 'completed'];

const TaskChart = ({ data = [] }) => {
  const { isDark } = useTheme();

  const chartData = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];

    // Sort data in the correct order
    return STATUS_ORDER.map((status) => {
      const item = data.find((d) => d._id === status || d.name === status);
      return {
        name: STATUS_LABELS[status] || status,
        value: item?.count || item?.value || 0,
        originalName: status,
      };
    });
  }, [data]);

  if (chartData.length === 0 || chartData.every((d) => d.value === 0)) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500">
        <div className="text-center">
          <p className="text-sm">No task data available</p>
          <p className="text-xs mt-1">Create tasks to see distribution</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={chartData}
        margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={isDark ? '#374151' : '#e5e7eb'}
          vertical={false}
        />
        <XAxis
          dataKey="name"
          stroke={isDark ? '#9ca3af' : '#6b7280'}
          fontSize={12}
          tickLine={false}
        />
        <YAxis
          stroke={isDark ? '#9ca3af' : '#6b7280'}
          fontSize={12}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
            border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
            borderRadius: '8px',
          }}
          formatter={(value) => {
            const total = chartData.reduce((sum, item) => sum + item.value, 0);
            const percent = total > 0 ? Math.round((value / total) * 100) : 0;
            return [`${value} tasks (${percent}%)`, 'Count'];
          }}
        />
        <Legend />
        <Bar dataKey="value" name="Tasks" radius={[6, 6, 0, 0]} maxBarSize={60}>
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[entry.originalName] || COLORS.todo}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default React.memo(TaskChart);
