import {
  CheckSquare,
  Clock,
  TrendingUp,
  FolderKanban,
  Target,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';

const priorityColors = {
  low: 'gray',
  medium: 'blue',
  high: 'yellow',
  urgent: 'red',
};

const TaskCompletionReport = ({ data }) => {
  if (!data) return <EmptyState icon={CheckSquare} title="No data" />;

  const totalByPriority =
    data.byPriority?.reduce((sum, p) => sum + p.count, 0) || 0;
  const totalCompleted =
    data.totalCompletedTasks ||
    data.byProject?.reduce((sum, p) => sum + p.count, 0) ||
    0;
  const totalTasks = data.totalTasks || totalByPriority; // Use totalTasks from backend
  const uniqueProjects = data.byProject?.length || 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="text-center py-4">
            <Target className="w-6 h-6 text-indigo-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{totalTasks}</p>
            <p className="text-xs text-gray-500">Total Tasks</p>
            <p className="text-xs text-gray-400 mt-1">Across all projects</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-4">
            <CheckSquare className="w-6 h-6 text-green-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{totalCompleted}</p>
            <p className="text-xs text-gray-500">Tasks Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-4">
            <FolderKanban className="w-6 h-6 text-blue-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{uniqueProjects}</p>
            <p className="text-xs text-gray-500">Projects</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-4">
            <Clock className="w-6 h-6 text-purple-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">
              {data.avgCompletionHours || 0}h
            </p>
            <p className="text-xs text-gray-500">Avg Completion Time</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-4">
            <TrendingUp className="w-6 h-6 text-orange-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">
              {totalTasks > 0
                ? Math.round((totalCompleted / totalTasks) * 100)
                : 0}
              %
            </p>
            <p className="text-xs text-gray-500">Completion Rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Priority Distribution & Top Projects */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By Priority */}
        <Card>
          <CardHeader>
            <CardTitle>Priority Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {data.byPriority?.length > 0 ? (
              <div className="space-y-4">
                {data.byPriority.map((p, i) => {
                  const percentage =
                    totalByPriority > 0
                      ? Math.round((p.count / totalByPriority) * 100)
                      : 0;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full bg-${priorityColors[p._id] || 'gray'}-500`}
                          />
                          <span className="text-sm font-medium capitalize">
                            {p._id}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {p.count} tasks ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div
                          className={`bg-${priorityColors[p._id] || 'gray'}-500 h-2.5 rounded-full`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No priority data</p>
            )}
          </CardContent>
        </Card>

        {/* Top Projects */}
        <Card>
          <CardHeader>
            <CardTitle>Top Projects by Completions</CardTitle>
          </CardHeader>
          <CardContent>
            {data.byProject?.length > 0 ? (
              <div className="space-y-3">
                {data.byProject.slice(0, 8).map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-600">
                        {i + 1}
                      </div>
                      <span className="text-sm truncate max-w-[200px]">
                        {p.projectName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div
                          className="bg-green-500 h-1.5 rounded-full"
                          style={{
                            width: `${data.byProject.length > 0 && data.byProject[0].count > 0 ? (p.count / data.byProject[0].count) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <Badge variant="green" size="sm">
                        {p.count}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No project data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Completion Time & Trends */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Completion Time Analysis</CardTitle>
          </CardHeader>
          <CardContent className="text-center py-6">
            <div className="relative w-32 h-32 mx-auto mb-4">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-gray-200 dark:text-gray-700"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-primary-500"
                  strokeDasharray={`${Math.min(100, ((data.avgCompletionHours || 0) / 48) * 100) * 3.52} 352`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary-600">
                    {data.avgCompletionHours || 0}
                  </p>
                  <p className="text-xs text-gray-500">hours</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Average time from task creation to completion
            </p>
            <div className="flex justify-center gap-4 mt-4 text-xs text-gray-500">
              <span>0h</span>
              <div className="w-48 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1.5">
                <div
                  className="bg-primary-500 h-1.5 rounded-full"
                  style={{
                    width: `${Math.min(100, ((data.avgCompletionHours || 0) / 48) * 100)}%`,
                  }}
                />
              </div>
              <span>48h+</span>
            </div>
          </CardContent>
        </Card>

        {/* Daily Completions */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Completions</CardTitle>
          </CardHeader>
          <CardContent>
            {data.completionOverTime?.length > 0 ? (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {data.completionOverTime.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-24 text-xs text-gray-500 flex-shrink-0">
                      {d._id}
                    </span>
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                      <div
                        className="bg-green-500 h-4 rounded-full flex items-center justify-end px-2"
                        style={{
                          width: `${Math.max(5, Math.min(100, d.count * 10))}%`,
                        }}
                      >
                        {d.count > 2 && (
                          <span className="text-xs text-white font-medium">
                            {d.count}
                          </span>
                        )}
                      </div>
                    </div>
                    {d.count <= 2 && (
                      <span className="text-xs text-gray-500 w-6">
                        {d.count}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm text-center py-8">
                No daily completion data
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TaskCompletionReport;
