import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceNavigate as useNavigate } from '../../hooks/useWorkspaceNavigate';
import {
  List,
  Columns,
  Plus,
  Search,
  RefreshCw,
  CheckSquare,
  Trash2,
  MessageSquare,
  Paperclip,
  FolderKanban,
  AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Avatar, AvatarGroup } from '../../components/common/Avatar';
import { EmptyState } from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { usePermissions } from '../../hooks/usePermissions';
import axios from '../../api/axios';
import toast from 'react-hot-toast';
import KanbanBoard from './KanbanBoard';

const priorityColors = {
  low: 'gray',
  medium: 'blue',
  high: 'yellow',
  urgent: 'red',
};
const statusColors = {
  todo: 'gray',
  in_progress: 'blue',
  review: 'yellow',
  completed: 'green',
};

const priorityLabels = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

const Tasks = () => {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState(null);

  const [view, setView] = useState('kanban');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const [page, setPage] = useState(1);
  const limit = 50;

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [initialized, setInitialized] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));

      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);

      const { data } = await axios.get(`/tasks?${params.toString()}`);

      const taskList = data.data || data || [];
      setTasks(Array.isArray(taskList) ? taskList : []);
      setTotalCount(
        data.pagination?.totalCount || data.count || taskList.length || 0
      );
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setError(err.response?.data?.message || 'Failed to load tasks');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, statusFilter, priorityFilter]);

  if (!initialized) {
    setInitialized(true);
    fetchTasks();
  }

  const [prevParams, setPrevParams] = useState({});
  const currentParams = { page, searchTerm, statusFilter, priorityFilter };
  if (JSON.stringify(currentParams) !== JSON.stringify(prevParams)) {
    setPrevParams(currentParams);
    fetchTasks();
  }

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };
  const handleStatusFilter = (e) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };
  const handlePriorityFilter = (e) => {
    setPriorityFilter(e.target.value);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setPage(1);
  };

  const hasActiveFilters =
    searchTerm || statusFilter !== 'all' || priorityFilter !== 'all';

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await axios.delete(`/tasks/${deleteTarget._id}`);
      toast.success('Task deleted');
      setDeleteTarget(null);
      fetchTasks();
    } catch (err) {
      console.error('Failed to delete task:', err);
      toast.error(err.response?.data?.message || 'Failed to delete task');
    } finally {
      setDeleteLoading(false);
    }
  };

  const updateTaskLocally = useCallback((taskId, updates) => {
    setTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, ...updates } : t))
    );
  }, []);

  const silentRefresh = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);

      const { data } = await axios.get(`/tasks?${params.toString()}`);
      const taskList = data.data || data || [];
      setTasks(Array.isArray(taskList) ? taskList : []);
      setTotalCount(
        data.pagination?.totalCount || data.count || taskList.length || 0
      );
      setError(null);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  }, [page, limit, searchTerm, statusFilter, priorityFilter]);

  const filteredTasks = tasks;

  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  const showingFrom = totalCount === 0 ? 0 : (page - 1) * limit + 1;
  const showingTo = Math.min(page * limit, totalCount);

  const pageNumbers = [];
  const maxVisible = 5;
  let start = Math.max(1, page - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
  for (let i = start; i <= end; i++) pageNumbers.push(i);

  return (
    <div className="space-y-6">
      <PageHeader title="Tasks" description={`${totalCount} total tasks`}>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded transition-all ${view === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('kanban')}
              className={`p-2 rounded transition-all ${view === 'kanban' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
              title="Kanban View"
            >
              <Columns className="w-4 h-4" />
            </button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={fetchTasks}
            icon={RefreshCw}
            loading={loading}
          >
            Refresh
          </Button>
          {hasPermission('create_tasks') && (
            <Button icon={Plus} onClick={() => navigate('/tasks/new')}>
              Add Task
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Search & Filters */}
      <Card>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks by title, description, tags..."
                value={searchTerm}
                onChange={handleSearch}
                className="pl-9 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={handleStatusFilter}
              className="border border-gray-300 dark:border-gray-600 rounded-lg text-sm px-3 py-2.5 bg-white dark:bg-gray-800"
            >
              <option value="all">All Status</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="completed">Completed</option>
            </select>

            <select
              value={priorityFilter}
              onChange={handlePriorityFilter}
              className="border border-gray-300 dark:border-gray-600 rounded-lg text-sm px-3 py-2.5 bg-white dark:bg-gray-800"
            >
              <option value="all">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>

            {hasActiveFilters && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleClearFilters}
              >
                Clear Filters
              </Button>
            )}
          </div>

          {/* Active Filter Badges */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="text-xs text-gray-500">Active filters:</span>
              {searchTerm && (
                <Badge
                  variant="primary"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  Search: {searchTerm}
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setPage(1);
                    }}
                    className="ml-1"
                  >
                    ✕
                  </button>
                </Badge>
              )}
              {statusFilter !== 'all' && (
                <Badge
                  variant="primary"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  Status: {statusFilter.replace('_', ' ')}
                  <button
                    onClick={() => {
                      setStatusFilter('all');
                      setPage(1);
                    }}
                    className="ml-1"
                  >
                    ✕
                  </button>
                </Badge>
              )}
              {priorityFilter !== 'all' && (
                <Badge
                  variant="primary"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  Priority: {priorityFilter}
                  <button
                    onClick={() => {
                      setPriorityFilter('all');
                      setPage(1);
                    }}
                    className="ml-1"
                  >
                    ✕
                  </button>
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Count Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        {/* Total */}
        <div className="bg-gradient-to-br from-gray-100 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-4 border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md transition-all cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-gray-700 dark:text-gray-200">
                {totalCount}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
                Total Tasks
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-gray-500 dark:text-gray-300" />
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1 mt-3">
            <div
              className="bg-gray-500 h-1 rounded-full"
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* To Do */}
        <div
          className="bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-400 dark:to-slate-700 rounded-xl p-4 border border-slate-200 dark:border-slate-600 shadow-sm hover:shadow-md transition-all cursor-pointer"
          onClick={() => {
            setStatusFilter('todo');
            setView('kanban');
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-slate-600 dark:text-slate-300">
                {tasks.filter((t) => t.boardColumn === 'todo').length}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                To Do
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-1 mt-3">
            <div
              className="bg-slate-400 h-1 rounded-full transition-all duration-500"
              style={{
                width:
                  totalCount > 0
                    ? `${(tasks.filter((t) => t.boardColumn === 'todo').length / totalCount) * 100}%`
                    : '0%',
              }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {totalCount > 0
              ? Math.round(
                  (tasks.filter((t) => t.boardColumn === 'todo').length /
                    totalCount) *
                    100
                )
              : 0}
            % of total
          </p>
        </div>

        {/* In Progress */}
        <div
          className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-800 dark:to-blue-700 rounded-xl p-4 border border-blue-200 dark:border-blue-600 shadow-sm hover:shadow-md transition-all cursor-pointer"
          onClick={() => {
            setStatusFilter('in_progress');
            setView('kanban');
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-300">
                {tasks.filter((t) => t.boardColumn === 'in_progress').length}
              </p>
              <p className="text-xs text-blue-500 dark:text-blue-400 mt-1 font-medium">
                In Progress
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-200 dark:bg-blue-600 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-blue-500 dark:text-blue-200"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-600 rounded-full h-1 mt-3">
            <div
              className="bg-blue-400 h-1 rounded-full transition-all duration-500"
              style={{
                width:
                  totalCount > 0
                    ? `${(tasks.filter((t) => t.boardColumn === 'in_progress').length / totalCount) * 100}%`
                    : '0%',
              }}
            />
          </div>
          <p className="text-xs text-blue-400 mt-1">
            {totalCount > 0
              ? Math.round(
                  (tasks.filter((t) => t.boardColumn === 'in_progress').length /
                    totalCount) *
                    100
                )
              : 0}
            % of total
          </p>
        </div>

        {/* Review */}
        <div
          className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-800 dark:to-amber-700 rounded-xl p-4 border border-amber-200 dark:border-amber-600 shadow-sm hover:shadow-md transition-all cursor-pointer"
          onClick={() => {
            setStatusFilter('review');
            setView('kanban');
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-300">
                {tasks.filter((t) => t.boardColumn === 'review').length}
              </p>
              <p className="text-xs text-amber-500 dark:text-amber-400 mt-1 font-medium">
                In Review
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-200 dark:bg-amber-600 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-amber-500 dark:text-amber-200"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </div>
          </div>
          <div className="w-full bg-amber-200 dark:bg-amber-600 rounded-full h-1 mt-3">
            <div
              className="bg-amber-400 h-1 rounded-full transition-all duration-500"
              style={{
                width:
                  totalCount > 0
                    ? `${(tasks.filter((t) => t.boardColumn === 'review').length / totalCount) * 100}%`
                    : '0%',
              }}
            />
          </div>
          <p className="text-xs text-amber-400 mt-1">
            {totalCount > 0
              ? Math.round(
                  (tasks.filter((t) => t.boardColumn === 'review').length /
                    totalCount) *
                    100
                )
              : 0}
            % of total
          </p>
        </div>

        {/* Completed */}
        <div
          className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-800 dark:to-emerald-700 rounded-xl p-4 border border-emerald-200 dark:border-emerald-600 shadow-sm hover:shadow-md transition-all cursor-pointer"
          onClick={() => {
            setStatusFilter('completed');
            setView('kanban');
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-300">
                {tasks.filter((t) => t.boardColumn === 'completed').length}
              </p>
              <p className="text-xs text-emerald-500 dark:text-emerald-400 mt-1 font-medium">
                Completed
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-200 dark:bg-emerald-600 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-emerald-500 dark:text-emerald-200"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <div className="w-full bg-emerald-200 dark:bg-emerald-600 rounded-full h-1 mt-3">
            <div
              className="bg-emerald-400 h-1 rounded-full transition-all duration-500"
              style={{
                width:
                  totalCount > 0
                    ? `${(tasks.filter((t) => t.boardColumn === 'completed').length / totalCount) * 100}%`
                    : '0%',
              }}
            />
          </div>
          <p className="text-xs text-emerald-400 mt-1">
            {totalCount > 0
              ? Math.round(
                  (tasks.filter((t) => t.boardColumn === 'completed').length /
                    totalCount) *
                    100
                )
              : 0}
            % of total
          </p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <TableSkeleton rows={5} />
      ) : error ? (
        <Card>
          <CardContent>
            <div className="text-center py-12">
              <RefreshCw className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
              <Button onClick={fetchTasks} icon={RefreshCw}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <AnimatePresence mode="wait">
          {view === 'kanban' ? (
            <motion.div
              key="kanban"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <KanbanBoard
                tasks={filteredTasks}
                onUpdate={silentRefresh}
                onTaskMove={updateTaskLocally}
              />
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Card>
                <CardContent className="p-0">
                  {filteredTasks.length === 0 ? (
                    <div className="p-6">
                      <EmptyState
                        icon={CheckSquare}
                        title={
                          hasActiveFilters
                            ? 'No tasks match your filters'
                            : 'No tasks yet'
                        }
                        description={
                          hasActiveFilters
                            ? 'Try adjusting your search or filters'
                            : 'Create your first task to get started'
                        }
                        action={
                          hasActiveFilters
                            ? {
                                label: 'Clear Filters',
                                onClick: handleClearFilters,
                              }
                            : hasPermission('create_tasks')
                              ? {
                                  label: 'Add Task',
                                  icon: Plus,
                                  onClick: () => navigate('/tasks/new'),
                                }
                              : undefined
                        }
                      />
                    </div>
                  ) : (
                    <>
                      {/* Table Header - Better column spacing */}
                      <div className="hidden md:grid grid-cols-[1fr_100px_100px_120px_120px_100px_40px] gap-3 px-5 py-3 bg-gray-50 dark:bg-gray-800/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider rounded-t-lg border-b border-gray-200 dark:border-gray-700 items-center">
                        <div>Task</div>
                        <div className="text-center">Priority</div>
                        <div className="text-center">Status</div>
                        <div className="text-center">Due Date</div>
                        <div className="text-center">Assigned</div>
                        <div className="text-center">Progress</div>
                        <div></div>
                      </div>

                      {/* Task Rows */}
                      <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                        {filteredTasks.map((task, index) => {
                          const completedCount =
                            task.checklist?.filter((c) => c.completed).length ||
                            0;
                          const totalCount = task.checklist?.length || 0;
                          const checklistProgress =
                            totalCount > 0
                              ? Math.round((completedCount / totalCount) * 100)
                              : 0;
                          const isOverdue =
                            task.dueDate &&
                            new Date(task.dueDate) < new Date() &&
                            task.status !== 'completed';

                          return (
                            <motion.div
                              key={task._id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{
                                duration: 0.2,
                                delay: index * 0.03,
                              }}
                              className={`group grid grid-cols-[1fr_100px_100px_120px_120px_100px_40px] gap-3 items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-all ${
                                task.status === 'completed' ? 'opacity-75' : ''
                              }`}
                              onClick={() => navigate(`/tasks/${task._id}`)}
                            >
                              {/* Column 1: Task Info (flexible width) */}
                              <div className="flex items-center gap-3 min-w-0">
                                {/* Status Checkbox */}
                                <button
                                  onClick={(e) => e.stopPropagation()}
                                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                    task.status === 'completed'
                                      ? 'bg-green-500 border-green-500'
                                      : task.status === 'in_progress'
                                        ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                        : task.status === 'review'
                                          ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                                          : 'border-gray-300 dark:border-gray-600'
                                  }`}
                                >
                                  {task.status === 'completed' && (
                                    <svg
                                      className="w-3 h-3 text-white"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={3}
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                  )}
                                  {task.status === 'in_progress' && (
                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                  )}
                                </button>

                                {/* Task Content */}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <p
                                      className={`font-medium text-sm truncate ${
                                        task.status === 'completed'
                                          ? 'line-through text-gray-400 dark:text-gray-500'
                                          : 'text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors'
                                      }`}
                                    >
                                      {task.title || 'Untitled Task'}
                                    </p>
                                    <div
                                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                        task.priority === 'urgent'
                                          ? 'bg-red-500'
                                          : task.priority === 'high'
                                            ? 'bg-yellow-500'
                                            : task.priority === 'medium'
                                              ? 'bg-blue-500'
                                              : 'bg-gray-400'
                                      }`}
                                    />
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                                    {task.project?.name && (
                                      <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                                        <FolderKanban className="w-3 h-3" />
                                        {task.project.name}
                                      </span>
                                    )}
                                    {task.labels?.length > 0 && (
                                      <div className="flex gap-1">
                                        {task.labels.map((label, i) => (
                                          <span
                                            key={i}
                                            className="px-1.5 py-0.5 rounded text-xs font-medium"
                                            style={{
                                              backgroundColor:
                                                (label.color || '#3b82f6') +
                                                '15',
                                              color: label.color || '#3b82f6',
                                            }}
                                          >
                                            {label.name}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    <div className="flex items-center gap-3 text-xs text-gray-400">
                                      {task.comments?.length > 0 && (
                                        <span className="flex items-center gap-1">
                                          <MessageSquare className="w-3 h-3" />
                                          {task.comments.length}
                                        </span>
                                      )}
                                      {task.attachments?.length > 0 && (
                                        <span className="flex items-center gap-1">
                                          <Paperclip className="w-3 h-3" />
                                          {task.attachments.length}
                                        </span>
                                      )}
                                      {totalCount > 0 && (
                                        <span className="flex items-center gap-1">
                                          <CheckSquare className="w-3 h-3" />
                                          {completedCount}/{totalCount}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Column 2: Priority - 100px */}
                              <div className="flex justify-center">
                                <Badge
                                  variant={
                                    priorityColors[task.priority] || 'gray'
                                  }
                                  size="sm"
                                >
                                  {priorityLabels[task.priority] ||
                                    task.priority}
                                </Badge>
                              </div>

                              {/* Column 3: Status - 100px */}
                              <div className="flex justify-center">
                                <Badge
                                  variant={statusColors[task.status] || 'gray'}
                                  size="sm"
                                  className="capitalize"
                                >
                                  {task.status?.replace('_', ' ') || 'Unknown'}
                                </Badge>
                              </div>

                              {/* Column 4: Due Date - 120px */}
                              <div className="text-center">
                                {task.dueDate ? (
                                  <div>
                                    <span
                                      className={`text-sm font-medium ${isOverdue ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}
                                    >
                                      {new Date(
                                        task.dueDate
                                      ).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                      })}
                                    </span>
                                    {isOverdue && (
                                      <span className="text-xs text-red-500 flex items-center justify-center gap-1">
                                        <AlertTriangle className="w-2.5 h-2.5" />
                                        Overdue
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-400">
                                    —
                                  </span>
                                )}
                              </div>

                              {/* Column 5: Assigned - 120px */}
                              <div className="flex justify-center">
                                {task.assignedTo?.length > 0 ? (
                                  <AvatarGroup max={3}>
                                    {task.assignedTo.map((a) => (
                                      <Avatar
                                        key={a.user?._id || a._id}
                                        name={
                                          a.user?.firstName
                                            ? `${a.user.firstName} ${a.user.lastName}`
                                            : 'User'
                                        }
                                        size="sm"
                                      />
                                    ))}
                                  </AvatarGroup>
                                ) : (
                                  <span className="text-xs text-gray-400">
                                    Unassigned
                                  </span>
                                )}
                              </div>

                              {/* Column 6: Progress - 100px */}
                              <div>
                                {totalCount > 0 ? (
                                  <div>
                                    <div className="flex justify-end text-xs mb-0.5">
                                      <span className="text-gray-400">
                                        {checklistProgress}%
                                      </span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                      <div
                                        className={`h-1.5 rounded-full transition-all ${
                                          checklistProgress >= 100
                                            ? 'bg-green-500'
                                            : checklistProgress >= 50
                                              ? 'bg-blue-500'
                                              : 'bg-yellow-500'
                                        }`}
                                        style={{
                                          width: `${checklistProgress}%`,
                                        }}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400 text-center block">
                                    —
                                  </span>
                                )}
                              </div>

                              {/* Column 7: Actions - 40px */}
                              <div className="flex justify-end">
                                {hasPermission('delete_tasks') && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteTarget(task);
                                    }}
                                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                    title="Delete task"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </button>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>

                      {/* Pagination */}
                      {totalCount > limit && (
                        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              Showing {showingFrom} to {showingTo} of{' '}
                              {totalCount}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setPage(page - 1)}
                                disabled={!hasPrevPage}
                              >
                                Previous
                              </Button>
                              <div className="hidden sm:flex gap-1">
                                {pageNumbers.map((p) => (
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
                                ))}
                              </div>
                              <span className="sm:hidden text-sm">
                                Page {page} of {totalPages}
                              </span>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setPage(page + 1)}
                                disabled={!hasNextPage}
                              >
                                Next
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Delete Task"
        message={`Permanently delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default Tasks;
