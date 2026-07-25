import { motion } from 'framer-motion';
import {
  FolderKanban,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Flag,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';

const phaseLabels = {
  planning: { label: 'Planning', color: 'blue', icon: Flag, order: 1 },
  active: { label: 'Execution', color: 'green', icon: TrendingUp, order: 2 },
  on_hold: { label: 'On Hold', color: 'yellow', icon: Clock, order: 3 },
  completed: {
    label: 'Completed',
    color: 'purple',
    icon: CheckCircle,
    order: 4,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'red',
    icon: AlertTriangle,
    order: 5,
  },
};

const ProjectProgressReport = ({ data }) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="No data"
        description="No project data available"
      />
    );
  }

  const totalProjects = data.length;
  const activeProjects = data.filter((p) => p.status === 'active').length;
  const completedProjects = data.filter((p) => p.status === 'completed').length;
  const delayedProjects = data.filter((p) => p.isOverdue).length;
  const avgProgress = Math.round(
    data.reduce((sum, p) => sum + (p.progress || 0), 0) / totalProjects
  );
  const totalTasks = data.reduce((sum, p) => sum + (p.totalTasks || 0), 0);
  const completedTasks = data.reduce(
    (sum, p) => sum + (p.completedTasks || 0),
    0
  );
  const atRiskProjects = data.filter(
    (p) => (p.progress || 0) < 25 && p.status === 'active'
  ).length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="text-center py-4">
            <FolderKanban className="w-6 h-6 text-blue-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{totalProjects}</p>
            <p className="text-xs text-gray-500">Total Projects</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-4">
            <TrendingUp className="w-6 h-6 text-green-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{activeProjects}</p>
            <p className="text-xs text-gray-500">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-4">
            <CheckCircle className="w-6 h-6 text-purple-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{completedProjects}</p>
            <p className="text-xs text-gray-500">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-4">
            <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{delayedProjects}</p>
            <p className="text-xs text-gray-500">Delayed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-4">
            <Target className="w-6 h-6 text-orange-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{avgProgress}%</p>
            <p className="text-xs text-gray-500">Avg Progress</p>
          </CardContent>
        </Card>
      </div>

      {/* At Risk Alert */}
      {atRiskProjects > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-700 dark:text-red-400">
              Risk Alert
            </p>
            <p className="text-sm text-red-600 dark:text-red-300">
              {atRiskProjects} project{atRiskProjects > 1 ? 's' : ''} at risk
              with less than 25% progress
            </p>
          </div>
        </div>
      )}

      {/* Overall Progress Bar */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Task Completion</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">All Projects Combined</span>
            <span className="text-sm font-bold">
              {totalTasks > 0
                ? Math.round((completedTasks / totalTasks) * 100)
                : 0}
              %
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
            <div
              className="bg-blue-500 h-4 rounded-full transition-all flex items-center justify-center text-xs text-white font-medium"
              style={{
                width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%`,
              }}
            >
              {totalTasks > 0 ? `${completedTasks}/${totalTasks} tasks` : ''}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project List */}
      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.map((project, i) => {
              const phase = phaseLabels[project.status] || phaseLabels.planning;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          project.isOverdue
                            ? 'bg-red-100 text-red-600'
                            : project.status === 'completed'
                              ? 'bg-green-100 text-green-600'
                              : 'bg-blue-100 text-blue-600'
                        }`}
                      >
                        <FolderKanban className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold">{project.name}</p>
                        <p className="text-xs text-gray-500">
                          {project.clientName || 'No client'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {project.isOverdue && (
                        <Badge variant="red" size="sm">
                          Overdue
                        </Badge>
                      )}
                      <Badge variant={phase.color} size="sm">
                        <phase.icon className="w-3 h-3 mr-1 inline" />
                        {phase.label}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Progress</p>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${project.progress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                          style={{ width: `${project.progress || 0}%` }}
                        />
                      </div>
                      <p className="text-xs text-right mt-0.5">
                        {project.progress || 0}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Tasks</p>
                      <p className="text-sm font-bold">
                        {project.taskCompletionRate}%
                      </p>
                      <p className="text-xs text-gray-400">
                        {project.completedTasks}/{project.totalTasks}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Milestones</p>
                      <p className="text-sm font-bold">
                        {project.milestoneCompletionRate}%
                      </p>
                      <p className="text-xs text-gray-400">
                        {project.completedMilestones}/{project.totalMilestones}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Budget Used</p>
                      <p
                        className={`text-sm font-bold ${project.budgetUtilization > 100 ? 'text-red-500' : 'text-gray-900'}`}
                      >
                        {project.budgetUtilization}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Team</p>
                      <p className="text-sm font-bold">{project.teamSize}</p>
                      <p className="text-xs text-gray-400">members</p>
                    </div>
                  </div>

                  {/* Delay/Risk Indicators */}
                  {project.isOverdue && (
                    <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/10 rounded-lg text-xs text-red-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Project is past deadline
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectProgressReport;
