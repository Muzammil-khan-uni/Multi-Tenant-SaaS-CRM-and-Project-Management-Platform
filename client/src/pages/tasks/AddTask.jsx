import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWorkspaceNavigate as useNavigate } from '../../hooks/useWorkspaceNavigate';
import {
  ArrowLeft,
  CheckSquare,
  Calendar,
  Clock,
  Save,
  Users,
  Activity,
  X,
} from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { Avatar } from '../../components/common/Avatar';
import { PageHeader } from '../../components/common/PageHeader';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import axios from '../../api/axios';
import toast from 'react-hot-toast';

const AddTask = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('project');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [initialized, setInitialized] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project: projectId || '',
    priority: 'medium',
    status: 'todo',
    boardColumn: 'todo',
    dueDate: '',
    estimatedHours: '',
    labels: '',
    assignTo: [],
  });

  if (!initialized) {
    setInitialized(true);
    axios
      .get('/projects?limit=100')
      .then(({ data }) => setProjects(data.data || []))
      .catch(() => {});
    axios
      .get('/workspaces/members')
      .then(({ data }) => setMembers(data.data || []))
      .catch(() => {});
  }

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const toggleAssignee = (userId) => {
    setFormData((prev) => ({
      ...prev,
      assignTo: prev.assignTo.includes(userId)
        ? prev.assignTo.filter((id) => id !== userId)
        : [...prev.assignTo, userId],
    }));
  };

  const validate = () => {
    const e = {};
    if (!formData.title.trim()) e.title = 'Task title is required';
    if (!formData.project) e.project = 'Project is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Fill required fields');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        project: formData.project,
        priority: formData.priority,

        status: formData.status,
        boardColumn: formData.status,

        dueDate: formData.dueDate || undefined,
        estimatedHours: formData.estimatedHours
          ? Number(formData.estimatedHours)
          : undefined,
        labels: formData.labels
          ? formData.labels
              .split(',')
              .map((l) => ({ name: l.trim(), color: '#3b82f6' }))
              .filter((l) => l.name)
          : [],
        assignedTo: formData.assignTo.map((userId) => ({ user: userId })),
      };

      const { data } = await axios.post('/tasks', payload);
      toast.success('Task created!');
      navigate(`/tasks/${data.data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Add New Task" description="Create a new task">
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate('/tasks')}
            icon={ArrowLeft}
          >
            Back
          </Button>
          <Button
            form="add-task-form"
            type="submit"
            loading={loading}
            icon={Save}
          >
            Create Task
          </Button>
        </div>
      </PageHeader>

      <form id="add-task-form" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Task Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Task Title *"
                  icon={CheckSquare}
                  placeholder="Enter task title"
                  value={formData.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  error={errors.title}
                />
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    className="input-field"
                    rows={4}
                    placeholder="Task description..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Project *
                  </label>
                  <select
                    value={formData.project}
                    onChange={(e) => updateField('project', e.target.value)}
                    className={`input-field ${errors.project ? 'border-red-500' : ''}`}
                  >
                    <option value="">Select project</option>
                    {projects.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {errors.project && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.project}
                    </p>
                  )}
                </div>
                <Input
                  label="Labels"
                  placeholder="comma separated (e.g., bug, frontend, urgent)"
                  value={formData.labels}
                  onChange={(e) => updateField('labels', e.target.value)}
                />
              </CardContent>
            </Card>

            {/* Assign Team Members - Advanced */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-500" />
                    <span>Assign Team Members</span>
                  </CardTitle>
                  {formData.assignTo.length > 0 && (
                    <Badge variant="primary" size="sm">
                      {formData.assignTo.length} selected
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {members.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No team members available
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Quick Actions */}
                    <div className="flex gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            assignTo: members.map((m) => m._id),
                          }))
                        }
                        className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Select All
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, assignTo: [] }))
                        }
                        className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                      >
                        Clear All
                      </button>
                    </div>

                    {/* Selected Members Preview */}
                    {formData.assignTo.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        {members
                          .filter((m) => formData.assignTo.includes(m._id))
                          .map((m) => (
                            <div
                              key={m._id}
                              className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full px-2.5 py-1 shadow-sm"
                            >
                              <Avatar
                                name={`${m.firstName} ${m.lastName}`}
                                size="sm"
                              />
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                {m.firstName} {m.lastName}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleAssignee(m._id)}
                                className="ml-0.5 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full"
                              >
                                <X className="w-3 h-3 text-gray-400" />
                              </button>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Scrollable Member List */}
                    <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                      {members.map((m) => {
                        const isSelected = formData.assignTo.includes(m._id);
                        return (
                          <button
                            key={m._id}
                            type="button"
                            onClick={() => toggleAssignee(m._id)}
                            className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-all duration-200 ${
                              isSelected
                                ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700 shadow-sm'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-transparent'
                            }`}
                          >
                            {/* Checkbox */}
                            <div
                              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                isSelected
                                  ? 'bg-primary-600 border-primary-600'
                                  : 'border-gray-300 dark:border-gray-600'
                              }`}
                            >
                              {isSelected && (
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
                            </div>

                            {/* Avatar */}
                            <Avatar
                              name={`${m.firstName} ${m.lastName}`}
                              size="md"
                            />

                            {/* Info */}
                            <div className="flex-1 text-left min-w-0">
                              <p
                                className={`text-sm font-medium truncate ${
                                  isSelected
                                    ? 'text-primary-700 dark:text-primary-300'
                                    : 'text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                {m.firstName} {m.lastName}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {m.email}
                              </p>
                            </div>

                            {/* Role Badge */}
                            {m.role && (
                              <Badge
                                variant={
                                  m.role === 'admin'
                                    ? 'purple'
                                    : m.role === 'manager'
                                      ? 'blue'
                                      : 'gray'
                                }
                                size="sm"
                              >
                                {m.role.replace('_', ' ')}
                              </Badge>
                            )}

                            {/* Selection Indicator */}
                            {isSelected && (
                              <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 animate-pulse" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Footer Stats */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500">
                      <span>{members.length} team members available</span>
                      <span>{formData.assignTo.length} selected</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Status & Priority Card - Button Style */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Status & Priority
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { value: 'todo', label: 'To Do' },
                      { value: 'in_progress', label: 'In Progress' },
                      { value: 'review', label: 'Review' },
                      { value: 'completed', label: 'Completed' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateField('status', option.value)}
                        className={`p-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                          formData.status === option.value
                            ? (() => {
                                const colors = {
                                  todo: 'border-gray-500 bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300',
                                  in_progress:
                                    'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
                                  review:
                                    'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300',
                                  completed:
                                    'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
                                };
                                return colors[option.value] || '';
                              })() + ' shadow-sm'
                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Priority
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { value: 'low', label: 'Low' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'high', label: 'High' },
                      { value: 'urgent', label: 'Urgent' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateField('priority', option.value)}
                        className={`p-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                          formData.priority === option.value
                            ? (() => {
                                const colors = {
                                  low: 'border-gray-500 bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300',
                                  medium:
                                    'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
                                  high: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300',
                                  urgent:
                                    'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
                                };
                                return colors[option.value] || '';
                              })() + ' shadow-sm'
                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <span className="flex items-center justify-center gap-1.5">
                          {option.value === 'urgent' && (
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          )}
                          {option.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dates & Estimates Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Dates & Estimates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Due Date"
                  type="date"
                  icon={Calendar}
                  value={formData.dueDate}
                  onChange={(e) => updateField('dueDate', e.target.value)}
                />
                <Input
                  label="Estimated Hours"
                  type="number"
                  icon={Clock}
                  placeholder="0"
                  value={formData.estimatedHours}
                  onChange={(e) =>
                    updateField('estimatedHours', e.target.value)
                  }
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddTask;
