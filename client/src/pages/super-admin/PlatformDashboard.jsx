import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  Users,
  TrendingUp,
  CheckCircle,
  Globe,
  BarChart3,
  ArrowUp,
  RefreshCw,
} from 'lucide-react';
import { superAdminAPI } from '../../api/superAdmin.api';
import toast from 'react-hot-toast';

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const StatCard = ({ title, value, icon: Icon, color, sub }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm"
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
          {title}
        </p>
        <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">
          {value}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </motion.div>
);

const PlatformDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (signal) => {
    try {
      setLoading(true);
      const res = await superAdminAPI.getAnalytics({ signal });
      setData(res.data.data);
    } catch (error) {
      if (error.name !== 'AbortError' && error.name !== 'CanceledError') {
        toast.error('Failed to load analytics');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-28 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  const {
    overview,
    workspacesByPlan,
    workspacesByStatus,
    workspacesByIndustry,
    monthlyGrowth,
  } = data || {};

  const statusColor = {
    active: 'text-green-600',
    inactive: 'text-red-500',
    trial: 'text-yellow-500',
    cancelled: 'text-gray-400',
    past_due: 'text-orange-500',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Platform Overview
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            Real-time insights across all tenants
          </p>
        </div>
        <button
          onClick={() => fetchData()}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Workspaces"
          value={overview?.totalWorkspaces ?? '—'}
          icon={Building2}
          color="bg-purple-500"
          sub={`${overview?.newWorkspacesThisMonth ?? 0} new this month`}
        />
        <StatCard
          title="Active Workspaces"
          value={overview?.activeWorkspaces ?? '—'}
          icon={CheckCircle}
          color="bg-green-500"
          sub={`${overview?.suspendedWorkspaces ?? 0} suspended`}
        />
        <StatCard
          title="Total Users"
          value={overview?.totalUsers ?? '—'}
          icon={Users}
          color="bg-blue-500"
          sub={`${overview?.newUsersThisMonth ?? 0} new this month`}
        />
        <StatCard
          title="Monthly Growth"
          value={`+${overview?.newWorkspacesThisMonth ?? 0}`}
          icon={TrendingUp}
          color="bg-orange-500"
          sub="Workspaces created this month"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workspaces by Plan */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-500" />
            Workspaces by Plan
          </h3>
          <div className="space-y-3">
            {['enterprise', 'professional', 'starter', 'free'].map((plan) => {
              const count = workspacesByPlan?.[plan] || 0;
              const total = overview?.totalWorkspaces || 1;
              const pct = Math.round((count / total) * 100);
              const barColor = {
                enterprise: 'bg-purple-500',
                professional: 'bg-blue-500',
                starter: 'bg-green-500',
                free: 'bg-gray-400',
              }[plan];
              return (
                <div key={plan}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize text-gray-700 dark:text-gray-300">
                      {plan}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {count}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${barColor} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Subscription Status */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-500" />
            Subscription Status
          </h3>
          <div className="space-y-2">
            {Object.entries(workspacesByStatus || {}).map(([status, count]) => (
              <div
                key={status}
                className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      status === 'active'
                        ? 'bg-green-500'
                        : status === 'trial'
                          ? 'bg-yellow-500'
                          : status === 'cancelled'
                            ? 'bg-gray-400'
                            : status === 'past_due'
                              ? 'bg-orange-500'
                              : 'bg-red-500'
                    }`}
                  />
                  <span
                    className={`text-sm capitalize font-medium ${statusColor[status] || 'text-gray-500'}`}
                  >
                    {status.replace('_', ' ')}
                  </span>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Industries */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-green-500" />
            Top Industries
          </h3>
          <div className="space-y-2">
            {(workspacesByIndustry || []).slice(0, 6).map(({ _id, count }) => (
              <div key={_id} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                  {_id?.replace(/_/g, ' ') || 'Other'}
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Growth Chart (Fixed) */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <ArrowUp className="w-4 h-4 text-purple-500" />
          Monthly Workspace Growth (Last 6 Months)
        </h3>

        {!monthlyGrowth || monthlyGrowth.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">
            No growth data yet
          </p>
        ) : (
          <div className="flex items-end justify-between gap-4 h-48 mt-4">
            {(() => {
              const maxCount = Math.max(
                ...monthlyGrowth.map((m) => m?.count || 0),
                1
              );

              return monthlyGrowth.map((item, index) => {
                const month = item?._id?.month || item?.month;
                const year = item?._id?.year || item?.year || index;
                const count = item?.count || 0;

                const heightPct = Math.max((count / maxCount) * 100, 4);

                return (
                  <div
                    key={`${year}-${month}-${index}`}
                    className="flex-1 flex flex-col items-center justify-end h-full gap-2"
                  >
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {count}
                    </span>

                    {/* Flexible Chart Bar Track Container */}
                    <div className="w-full max-w-[3.5rem] bg-gray-50 dark:bg-gray-700/30 rounded-t-md flex items-end h-full relative">
                      <div
                        className="w-full bg-purple-500 dark:bg-purple-600 rounded-t-md transition-all duration-700 ease-out"
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>

                    <span className="text-xs text-gray-500 font-medium">
                      {month ? MONTH_NAMES[month - 1] : '—'}
                    </span>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlatformDashboard;
