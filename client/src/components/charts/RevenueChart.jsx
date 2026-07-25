import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from '../../hooks/useTheme';

const RevenueChart = ({ data }) => {
  const { isDark } = useTheme();

  console.log('RevenueChart data:', data); // Debug log

  const rawData = Array.isArray(data) ? data : [];

  const chartData = rawData.map((item) => {
    const monthStr = item.month || item._id || '';
    // Format month like "2025-07" to "Jul"
    let label = monthStr;
    if (monthStr.match(/^\d{4}-\d{2}$/)) {
      const [year, month] = monthStr.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      label = date.toLocaleString('en-US', { month: 'short' });
    }

    return {
      month: label,
      revenue: Number(item.revenue) || 0,
      invoices: Number(item.invoices || item.count) || 0,
    };
  });

  const hasData = chartData.length > 0 && chartData.some((d) => d.revenue > 0);

  if (!hasData) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500">
        <div className="text-center">
          <p className="text-sm">No revenue data yet</p>
          <p className="text-xs mt-1">
            Revenue will appear once invoices are paid
          </p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart
        data={chartData}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={isDark ? '#374151' : '#e5e7eb'}
        />
        <XAxis
          dataKey="month"
          stroke={isDark ? '#9ca3af' : '#6b7280'}
          fontSize={12}
        />
        <YAxis
          stroke={isDark ? '#9ca3af' : '#6b7280'}
          fontSize={12}
          tickFormatter={(value) =>
            `$${value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value}`
          }
        />
        <Tooltip
          contentStyle={{
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
            border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
            borderRadius: '8px',
          }}
          formatter={(value, name) => {
            if (name === 'revenue')
              return [`$${Number(value).toLocaleString()}`, 'Revenue'];
            return [value, name];
          }}
          labelFormatter={(label) => `Month: ${label}`}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#3b82f6"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorRevenue)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default RevenueChart;
