import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from '../../hooks/useTheme';

const PerformanceChart = ({ data = [] }) => {
  const { isDark } = useTheme();

  const chartData = useMemo(() => {
    if (Array.isArray(data) && data.length > 0) {
      return data.slice(0, 10).map((item) => ({
        name: item.name?.split(' ')[0] || 'Unknown',
        completed: item.completedTasks || 0,
        total: item.totalTasks || 0,
      }));
    }
    return [];
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500">
        <div className="text-center">
          <p className="text-sm">No performance data available</p>
          <p className="text-xs mt-1">
            Assign tasks to team members to see metrics
          </p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} barGap={2}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={isDark ? '#374151' : '#e5e7eb'}
        />
        <XAxis
          dataKey="name"
          stroke={isDark ? '#9ca3af' : '#6b7280'}
          fontSize={12}
        />
        <YAxis stroke={isDark ? '#9ca3af' : '#6b7280'} fontSize={12} />
        <Tooltip
          contentStyle={{
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
            border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
            borderRadius: '8px',
          }}
        />
        <Legend />
        <Bar
          dataKey="completed"
          fill="#10b981"
          radius={[4, 4, 0, 0]}
          name="Completed"
        />
        <Bar
          dataKey="total"
          fill="#3b82f6"
          radius={[4, 4, 0, 0]}
          name="Total"
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default PerformanceChart;
