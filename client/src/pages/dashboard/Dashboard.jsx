import { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  FolderKanban,
  CheckSquare,
  DollarSign,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Clock,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../../components/common/Card';
import { DashboardSkeleton } from '../../components/common/LoadingSkeleton';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../hooks/useAuth';
import { useApiData } from '../../hooks/useApiData';
import axios from '../../api/axios';

const RevenueChart = lazy(() => import('../../components/charts/RevenueChart'));
const ProjectChart = lazy(() => import('../../components/charts/ProjectChart'));
const TaskChart = lazy(() => import('../../components/charts/TaskChart'));
const PerformanceChart = lazy(
  () => import('../../components/charts/PerformanceChart')
);

const fetchDashboardData = async () => {
  const { data } = await axios.get('/reports/dashboard');
  return data.data;
};

const StatCard = ({ title, value, icon: Icon, trend, color }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <Card hoverable>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {title}
            </p>
            <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
              {value}
            </p>
            {trend !== undefined && trend !== null && (
              <div className="flex items-center gap-1 mt-2">
                {trend > 0 ? (
                  <ArrowUp className="w-4 h-4 text-green-500" />
                ) : (
                  <ArrowDown className="w-4 h-4 text-red-500" />
                )}
                <span
                  className={`text-sm font-medium ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}
                >
                  {Math.abs(trend)}%
                </span>
              </div>
            )}
          </div>
          <div
            className={`p-3 rounded-lg bg-${color}-100 dark:bg-${color}-900/20`}
          >
            <Icon
              className={`w-6 h-6 text-${color}-600 dark:text-${color}-400`}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const ProgressBar = ({ value, max, color = 'blue', showLabel = true }) => (
  <div className="w-full">
    {showLabel && (
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600 dark:text-gray-400">
          {value}/{max}
        </span>
        <span className="text-gray-600 dark:text-gray-400">
          {max > 0 ? Math.round((value / max) * 100) : 0}%
        </span>
      </div>
    )}
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
      <div
        className={`bg-${color}-500 h-2 rounded-full transition-all duration-500`}
        style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }}
      />
    </div>
  </div>
);

const ChartFallback = () => (
  <div className="h-64 animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
    <p className="text-sm text-gray-500 dark:text-gray-400">Loading chart...</p>
  </div>
);

export const Dashboard = () => {
  const { user } = useAuth();
  const {
    data: stats,
    loading,
    error,
    refetch,
  } = useApiData(fetchDashboardData, { refreshInterval: 5 * 60 * 1000 });

  if (loading && !stats) return <DashboardSkeleton />;

  if (error && !stats) {
    return (
      <div className="space-y-6">
        <PageHeader title={`Welcome back, ${user?.firstName || 'User'}!`} />
        <Card>
          <CardContent>
            <div className="text-center py-12">
              <RefreshCw className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <Button onClick={refetch} icon={RefreshCw}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.firstName || 'User'}!`}
        description="Here's your workspace overview"
      >
        <Button
          variant="secondary"
          size="sm"
          onClick={refetch}
          icon={RefreshCw}
          loading={loading}
        >
          Refresh
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <StatCard
          title="Active Projects"
          value={stats.summary?.activeProjects || 0}
          icon={FolderKanban}
          color="blue"
        />
        <StatCard
          title="Pending Tasks"
          value={stats.summary?.pendingTasks || 0}
          icon={Clock}
          color="yellow"
        />
        <StatCard
          title="Completed Tasks"
          value={stats.summary?.completedTasks || 0}
          icon={CheckSquare}
          color="green"
        />
        <StatCard
          title="Active Clients"
          value={stats.summary?.activeClients || 0}
          icon={Users}
          color="purple"
        />
        <StatCard
          title="Revenue (MTD)"
          value={`$${(stats.summary?.revenueThisMonth || 0).toLocaleString()}`}
          icon={DollarSign}
          color="emerald"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent>
            <p className="text-sm font-medium mb-3">Task Completion Rate</p>
            <ProgressBar
              value={stats.summary?.completedTasks || 0}
              max={stats.summary?.totalTasks || 0}
              color="green"
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm font-medium mb-3">Project Completion Rate</p>
            <ProgressBar
              value={stats.summary?.completedProjects || 0}
              max={stats.summary?.totalProjects || 0}
              color="blue"
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm font-medium mb-3">Invoice Collection Rate</p>
            <ProgressBar
              value={stats.summary?.paidInvoices || 0}
              max={stats.summary?.totalInvoices || 0}
              color="emerald"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<ChartFallback />}>
              <RevenueChart data={stats.charts?.monthlyRevenue} />
            </Suspense>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Project Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<ChartFallback />}>
              <ProjectChart data={stats.charts?.projectsByStatus} />
            </Suspense>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Task Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<ChartFallback />}>
              <TaskChart
                data={
                  stats.charts?.tasksByStatus || stats.charts?.tasksByPriority
                }
              />
            </Suspense>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Team Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<ChartFallback />}>
              <PerformanceChart data={stats.teamPerformance} />
            </Suspense>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {stats.projectProgress?.map((project) => (
              <div key={project._id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{project.name}</p>
                  <ProgressBar
                    value={project.progress || 0}
                    max={100}
                    showLabel={false}
                    color={
                      project.daysLeft < 0
                        ? 'red'
                        : project.progress > 75
                          ? 'green'
                          : 'blue'
                    }
                  />
                </div>
                <Badge
                  variant={project.status === 'active' ? 'blue' : 'green'}
                  size="sm"
                >
                  {project.progress || 0}%
                </Badge>
              </div>
            ))}
            {(!stats.projectProgress || stats.projectProgress.length === 0) && (
              <p className="text-center text-gray-500 py-4">
                No active projects
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
          <p className="text-2xl font-bold text-red-600">
            {stats.summary?.overdueTasks || 0}
          </p>
          <p className="text-xs text-red-500">Overdue Tasks</p>
        </div>
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
          <p className="text-2xl font-bold text-blue-600">
            {stats.summary?.newClientsThisMonth || 0}
          </p>
          <p className="text-xs text-blue-500">New Clients (MTD)</p>
        </div>
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
          <p className="text-2xl font-bold text-green-600">
            {stats.summary?.teamMembers || 0}
          </p>
          <p className="text-xs text-green-500">Team Members</p>
        </div>
        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
          <p className="text-2xl font-bold text-purple-600">
            ${(stats.summary?.totalRevenue || 0).toLocaleString()}
          </p>
          <p className="text-xs text-purple-500">Total Revenue</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
