import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useWorkspaceNavigate as useNavigate } from '../../hooks/useWorkspaceNavigate';
import {
  FolderKanban,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building2,
  Target,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Avatar, AvatarGroup } from '../../components/common/Avatar';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { usePermissions } from '../../hooks/usePermissions';
import axios from '../../api/axios';
import toast from 'react-hot-toast';
import { formatDate } from '../../utils/helpers';

const statusColors = {
  planning: 'blue',
  active: 'green',
  on_hold: 'yellow',
  completed: 'purple',
  cancelled: 'red',
};
const statusLabels = {
  planning: 'Planning',
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
const statusIcons = {
  planning: Clock,
  active: TrendingUp,
  on_hold: AlertTriangle,
  completed: CheckCircle,
  cancelled: Target,
};
const priorityColors = {
  low: 'gray',
  medium: 'blue',
  high: 'yellow',
  urgent: 'red',
};
const priorityLabels = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

const Projects = () => {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // grid or list

  const [page, setPage] = useState(1);
  const limit = 9; // 3x3 grid

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);

      const { data } = await axios.get(`/projects?${params.toString()}`);
      setProjects(Array.isArray(data.data) ? data.data : []);
      setTotalCount(data.pagination?.totalCount || data.count || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, statusFilter, priorityFilter]);

  if (!initialized) {
    setInitialized(true);
    fetchProjects();
  }

  const [prevParams, setPrevParams] = useState({});
  const currentParams = { page, searchTerm, statusFilter, priorityFilter };
  if (JSON.stringify(currentParams) !== JSON.stringify(prevParams)) {
    setPrevParams(currentParams);
    fetchProjects();
  }

  const [stats, setStats] = useState({
    activeProjects: 0,
    completedProjects: 0,
    totalBudget: 0,
    avgProgress: 0,
  });

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await axios.get('/projects/stats');
      if (data.success && data.data) {
        setStats(data.data);
      }
    } catch {
      toast.error('Failed to fetch stats');
    }
  }, []);

  if (!initialized) {
    setInitialized(true);
    fetchProjects();
    fetchStats(); // CALL IT HERE
  }

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await axios.delete(`/projects/${deleteTarget._id}`);
      toast.success('Project deleted');
      setDeleteTarget(null);
      fetchProjects();
    } catch {
      toast.error('Failed');
    } finally {
      setDeleteLoading(false);
    }
  };

  const hasActiveFilters =
    searchTerm || statusFilter !== 'all' || priorityFilter !== 'all';
  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="space-y-6">
      <PageHeader title="Projects" description={`${totalCount} total projects`}>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchProjects}
            icon={RefreshCw}
            loading={loading}
          >
            Refresh
          </Button>
          {hasPermission('create_projects') && (
            <Button icon={Plus} onClick={() => navigate('/projects/new')}>
              New Project
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-200 dark:bg-blue-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xs text-blue-500 font-medium">Active</p>
          </div>
          <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
            {stats.activeProjects || 0}
          </p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4 border border-green-200 dark:border-green-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-200 dark:bg-green-700 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-xs text-green-500 font-medium">Completed</p>
          </div>
          <p className="text-xl font-bold text-green-700 dark:text-green-300">
            {stats.completedProjects || 0}
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4 border border-purple-200 dark:border-purple-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-200 dark:bg-purple-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-xs text-purple-500 font-medium">Total Budget</p>
          </div>
          <p className="text-xl font-bold text-purple-700 dark:text-purple-300">
            ${(stats.totalBudget || 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-4 border border-orange-200 dark:border-orange-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-orange-200 dark:bg-orange-700 flex items-center justify-center">
              <Target className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-xs text-orange-500 font-medium">Avg Progress</p>
          </div>
          <p className="text-xl font-bold text-orange-700 dark:text-orange-300">
            {stats.avgProgress || 0}%
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-9 pr-4 py-2.5 border rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-600"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="border rounded-lg text-sm px-3 py-2.5 dark:bg-gray-800 dark:border-gray-600"
            >
              <option value="all">All Status</option>
              {Object.entries(statusLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              className="border rounded-lg text-sm px-3 py-2.5 dark:bg-gray-800 dark:border-gray-600"
            >
              <option value="all">All Priority</option>
              {Object.entries(priorityLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg border ${viewMode === 'grid' ? 'bg-primary-50 border-primary-300 dark:bg-primary-900/20' : 'border-gray-300 dark:border-gray-600'}`}
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg border ${viewMode === 'list' ? 'bg-primary-50 border-primary-300 dark:bg-primary-900/20' : 'border-gray-300 dark:border-gray-600'}`}
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z" />
                </svg>
              </button>
            </div>
            {hasActiveFilters && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setPriorityFilter('all');
                  setPage(1);
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Projects Grid/List */}
      {loading ? (
        <div
          className={`grid grid-cols-1 ${viewMode === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : ''} gap-4`}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl h-48"
            />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent>
            <div className="text-center py-12">
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={fetchProjects} icon={RefreshCw}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent>
            <div className="p-6">
              <EmptyState
                icon={FolderKanban}
                title={
                  hasActiveFilters ? 'No projects match' : 'No projects yet'
                }
                description={
                  hasActiveFilters
                    ? 'Try adjusting filters'
                    : 'Create your first project'
                }
                action={
                  hasActiveFilters
                    ? {
                        label: 'Clear Filters',
                        onClick: () => {
                          setSearchTerm('');
                          setStatusFilter('all');
                          setPriorityFilter('all');
                        },
                      }
                    : hasPermission('create_projects')
                      ? {
                          label: 'New Project',
                          icon: Plus,
                          onClick: () => navigate('/projects/new'),
                        }
                      : undefined
                }
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div
            className={`grid grid-cols-1 ${viewMode === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : ''} gap-4`}
          >
            {projects.map((project, i) => {
              const StatusIcon = statusIcons[project.status] || Clock;
              const isOverdue =
                project.timeline?.deadline &&
                new Date(project.timeline.deadline) < new Date() &&
                project.status !== 'completed';

              return (
                <motion.div
                  key={project._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-600 transition-all cursor-pointer overflow-hidden"
                  onClick={() => navigate(`/projects/${project._id}`)}
                >
                  {/* Card Header */}
                  <div
                    className={`h-1.5 bg-${statusColors[project.status] || 'gray'}-500`}
                  />

                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-primary-600 transition-colors">
                          {project.name}
                        </h3>
                        {project.client?.company?.name && (
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3" />
                            {project.client.company.name}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Badge
                          variant={priorityColors[project.priority]}
                          size="sm"
                        >
                          {project.priority}
                        </Badge>
                        {hasPermission('delete_projects') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(project);
                            }}
                            className="p-1 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">Progress</span>
                        <span className="font-medium">
                          {project.progress || 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            (project.progress || 0) >= 100
                              ? 'bg-green-500'
                              : (project.progress || 0) >= 50
                                ? 'bg-blue-500'
                                : (project.progress || 0) >= 25
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                          }`}
                          style={{ width: `${project.progress || 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Meta Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="flex items-center gap-1.5">
                        <StatusIcon
                          className={`w-3.5 h-3.5 text-${statusColors[project.status]}-500`}
                        />
                        <span className="text-gray-600 dark:text-gray-400">
                          {statusLabels[project.status]}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span
                          className={`${isOverdue ? 'text-red-500 font-medium' : 'text-gray-600 dark:text-gray-400'}`}
                        >
                          {project.timeline?.deadline
                            ? formatDate(project.timeline.deadline)
                            : 'No deadline'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">
                          ${(project.budget?.estimated || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">
                          {project.team?.length || 0} members
                        </span>
                      </div>
                    </div>

                    {/* Team Avatars */}
                    {project.team?.length > 0 && (
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <AvatarGroup max={4}>
                          {project.team.map((t) => (
                            <Avatar
                              key={t.user?._id}
                              name={
                                t.user?.firstName
                                  ? `${t.user.firstName} ${t.user.lastName}`
                                  : 'User'
                              }
                              size="sm"
                            />
                          ))}
                        </AvatarGroup>
                        {isOverdue && (
                          <Badge variant="red" size="sm">
                            <AlertTriangle className="w-3 h-3 mr-1 inline" />
                            Overdue
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
                        p === page
                          ? 'bg-primary-600 text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Delete Project"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default Projects;
