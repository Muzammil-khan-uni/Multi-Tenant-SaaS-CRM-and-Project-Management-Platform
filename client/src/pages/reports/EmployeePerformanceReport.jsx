import { motion } from 'framer-motion';
import { Users, TrendingUp, Award, Star, Target } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';

const EmployeePerformanceReport = ({ data }) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No data"
        description="No employee performance data available"
      />
    );
  }

  const totalTasks = data.reduce((sum, e) => sum + (e.totalTasks || 0), 0);
  const totalCompleted = data.reduce(
    (sum, e) => sum + (e.completedTasks || 0),
    0
  );
  const totalOverdue = data.reduce((sum, e) => sum + (e.overdueTasks || 0), 0);
  const avgCompletionRate = Math.round(
    data.reduce((sum, e) => sum + (e.completionRate || 0), 0) / data.length
  );

  const sorted = [...data].sort(
    (a, b) => (b.completionRate || 0) - (a.completionRate || 0)
  );
  const topPerformers = sorted.slice(0, 3);
  const needsImprovement = sorted.filter((e) => (e.completionRate || 0) < 50);

  const getRating = (rate) => {
    if (rate >= 90)
      return {
        label: 'Excellent',
        color: 'green',
        bgColor: 'bg-green-500',
        lightBg: 'bg-green-100',
        textColor: 'text-green-600',
        icon: Star,
      };
    if (rate >= 75)
      return {
        label: 'Good',
        color: 'blue',
        bgColor: 'bg-blue-500',
        lightBg: 'bg-blue-100',
        textColor: 'text-blue-600',
        icon: Award,
      };
    if (rate >= 50)
      return {
        label: 'Average',
        color: 'yellow',
        bgColor: 'bg-yellow-500',
        lightBg: 'bg-yellow-100',
        textColor: 'text-yellow-600',
        icon: Target,
      };
    return {
      label: 'Needs Improvement',
      color: 'red',
      bgColor: 'bg-red-500',
      lightBg: 'bg-red-100',
      textColor: 'text-red-600',
      icon: TrendingUp,
    };
  };

  const getProgressColor = (rate) => {
    if (rate >= 90) return 'bg-green-500';
    if (rate >= 75) return 'bg-blue-500';
    if (rate >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="text-center py-4">
            <Users className="w-6 h-6 text-blue-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{data.length}</p>
            <p className="text-xs text-gray-500">Employees</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-4">
            <Target className="w-6 h-6 text-indigo-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{totalTasks}</p>
            <p className="text-xs text-gray-500">Total Tasks Assigned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-4">
            <Target className="w-6 h-6 text-green-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{totalCompleted}</p>
            <p className="text-xs text-gray-500">Completed Assigned Tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-4">
            <TrendingUp className="w-6 h-6 text-orange-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{avgCompletionRate}%</p>
            <p className="text-xs text-gray-500">Avg Completion</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-4">
            <Award className="w-6 h-6 text-red-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{totalOverdue}</p>
            <p className="text-xs text-gray-500">Overdue Tasks</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      {topPerformers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {topPerformers.map((emp, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-xl border-2 text-center ${
                    i === 0
                      ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10'
                      : i === 1
                        ? 'border-gray-300 bg-gray-50 dark:bg-gray-800'
                        : 'border-orange-300 bg-orange-50 dark:bg-orange-900/10'
                  }`}
                >
                  <div className="text-2xl mb-1">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                  </div>
                  <p className="font-semibold">{emp.name}</p>
                  <p className="text-2xl font-bold text-primary-600 my-2">
                    {emp.completionRate}%
                  </p>
                  {/* Color-coded progress bar */}
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div
                      className={`${getProgressColor(emp.completionRate)} h-2.5 rounded-full transition-all`}
                      style={{ width: `${Math.min(100, emp.completionRate)}%` }}
                    />
                  </div>
                  <div className="flex justify-center gap-2 text-xs text-gray-500 mt-2">
                    <span>{emp.completedTasks} completed</span>
                    <span>•</span>
                    <span>{emp.totalTasks} total</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Employees Detail */}
      <Card>
        <CardHeader>
          <CardTitle>All Employees</CardTitle>
          <Badge variant="gray" size="sm">
            {data.length} employees
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.map((emp, i) => {
              const rating = getRating(emp.completionRate);
              const progressColor = getProgressColor(emp.completionRate);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${rating.lightBg} ${rating.textColor}`}
                      >
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold">{emp.name}</p>
                        <p className="text-xs text-gray-500">{emp.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-13 md:ml-0">
                      <Badge variant={rating.color} size="sm">
                        <rating.icon className="w-3 h-3 mr-1 inline" />
                        {rating.label}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                    <div>
                      <p className="text-xs text-gray-500">
                        Tasks ({emp.completionRate}%)
                      </p>
                      {/* COLOR-CODED PROGRESS BAR */}
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-1">
                        <div
                          className={`${progressColor} h-2.5 rounded-full transition-all duration-500`}
                          style={{
                            width: `${Math.min(100, emp.completionRate)}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs mt-0.5">
                        {emp.completedTasks}/{emp.totalTasks} completed
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Hours Logged</p>
                      <p className="text-sm font-bold">
                        {emp.totalHours || 0}h
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Overdue</p>
                      <p
                        className={`text-sm font-bold ${emp.overdueTasks > 0 ? 'text-red-500' : 'text-green-500'}`}
                      >
                        {emp.overdueTasks || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">
                        High Priority Done
                      </p>
                      <p className="text-sm font-bold text-purple-600">
                        {emp.highPriority || 0}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Needs Improvement */}
      {needsImprovement.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <TrendingUp className="w-5 h-5" />
              Needs Improvement ({needsImprovement.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {needsImprovement.map((emp, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/10 rounded-lg"
                >
                  <span className="text-sm font-medium">{emp.name}</span>
                  <div className="flex items-center gap-3">
                    {/* COLOR-CODED PROGRESS BAR */}
                    <div className="w-32 bg-red-200 dark:bg-red-800 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full"
                        style={{
                          width: `${Math.min(100, emp.completionRate)}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm text-red-600">
                      {emp.completionRate}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EmployeePerformanceReport;
