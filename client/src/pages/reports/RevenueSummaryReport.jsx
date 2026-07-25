import {
  DollarSign,
  FileText,
  TrendingUp,
  Building2,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';

const RevenueSummaryReport = ({ data }) => {
  if (!data) return <EmptyState icon={DollarSign} title="No data" />;

  const totalRevenue = data.totalRevenue || 0;
  const avgInvoice = data.averageInvoice || 0;
  const monthsTracked = data.revenueOverTime?.length || 0;

  const monthlyData = data.revenueOverTime || [];
  const lastMonth = monthlyData[monthlyData.length - 1];
  const previousMonth = monthlyData[monthlyData.length - 2];
  const monthlyGrowth =
    previousMonth?.revenue > 0 && lastMonth?.revenue
      ? Math.round(
          ((lastMonth.revenue - previousMonth.revenue) /
            previousMonth.revenue) *
            100
        )
      : 0;

  const totalInvoices =
    data.byClient?.reduce((sum, c) => sum + (c.count || 0), 0) || 0;

  const estimatedProfit = Math.round(totalRevenue * 0.3);
  const profitMargin = 30;

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
              <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              ${totalRevenue.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 mt-1">Total Revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              ${avgInvoice.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 mt-1">Average Invoice</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {totalInvoices}
            </p>
            <p className="text-sm text-gray-500 mt-1">Total Invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="text-center py-6">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                monthlyGrowth >= 0
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : 'bg-red-100 dark:bg-red-900/30'
              }`}
            >
              {monthlyGrowth >= 0 ? (
                <ArrowUp className="w-6 h-6 text-green-600" />
              ) : (
                <ArrowDown className="w-6 h-6 text-red-600" />
              )}
            </div>
            <p
              className={`text-3xl font-bold ${monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {monthlyGrowth > 0 ? '+' : ''}
              {monthlyGrowth}%
            </p>
            <p className="text-sm text-gray-500 mt-1">Monthly Growth</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Monthly Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <div className="space-y-3">
                {monthlyData.map((m, i) => {
                  const maxRevenue = Math.max(
                    ...monthlyData.map((x) => x.revenue || 0),
                    1
                  );
                  const barWidth = Math.round(
                    ((m.revenue || 0) / maxRevenue) * 100
                  );
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-20">
                        {m._id}
                      </span>
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 relative overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-6 rounded-full flex items-center px-3 transition-all"
                          style={{
                            width: `${barWidth}%`,
                            minWidth: m.revenue > 0 ? '60px' : '0',
                          }}
                        >
                          {m.revenue > 0 && (
                            <span className="text-xs text-white font-medium">
                              ${m.revenue.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 w-16 text-right">
                        {m.count || 0} invoices
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-sm text-center py-8">
                No monthly data
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
              <p className="text-xs text-green-500">Estimated Profit</p>
              <p className="text-xl font-bold text-green-700">
                ${estimatedProfit.toLocaleString()}
              </p>
              <p className="text-xs text-green-500">~{profitMargin}% margin</p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
              <p className="text-xs text-blue-500">Average per Client</p>
              <p className="text-xl font-bold text-blue-700">
                $
                {data.byClient?.length > 0
                  ? Math.round(
                      totalRevenue / data.byClient.length
                    ).toLocaleString()
                  : 0}
              </p>
              <p className="text-xs text-blue-500">
                {data.byClient?.length || 0} clients
              </p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/10 rounded-lg">
              <p className="text-xs text-purple-500">Invoices per Month</p>
              <p className="text-xl font-bold text-purple-700">
                {monthsTracked > 0
                  ? Math.round(totalInvoices / monthsTracked)
                  : 0}
              </p>
              <p className="text-xs text-purple-500">{monthsTracked} months</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Clients by Revenue */}
      {data.byClient?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Revenue by Client
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.byClient.map((c, i) => {
                const maxClientRevenue = Math.max(
                  ...data.byClient.map((x) => x.total || 0),
                  1
                );
                const barWidth = Math.round(
                  ((c.total || 0) / maxClientRevenue) * 100
                );
                return (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {c.clientName}
                      </p>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                        <div
                          className="bg-green-500 h-1.5 rounded-full"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-green-600">
                        ${(c.total || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {c.count} invoices
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RevenueSummaryReport;
