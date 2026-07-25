import { useState } from 'react';
import { useWorkspaceNavigate as useNavigate } from '../../hooks/useWorkspaceNavigate';
import {
  ArrowLeft,
  FolderKanban,
  Calendar,
  DollarSign,
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

const statusOptions = [
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
];

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const AddProject = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [initialized, setInitialized] = useState(false);
  const [clientList, setClientList] = useState([]);
  const [memberList, setMemberList] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);

  if (!initialized) {
    setInitialized(true);
    axios
      .get('/clients?limit=100')
      .then(({ data }) => setClientList(data.data || []))
      .catch(() => {});
    axios
      .get('/workspaces/members')
      .then(({ data }) => setMemberList(data.data || []))
      .catch(() => {});
  }

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'planning',
    priority: 'medium',
    type: 'fixed_price',
    client: '',
    startDate: '',
    deadline: '',
    estimatedBudget: '',
    actualBudget: '0',
    estimatedHours: '',
    currency: 'USD',
    tags: '',
  });

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!formData.name.trim()) e.name = 'Project name is required';
    if (!formData.client) e.client = 'Client is required';
    if (!formData.deadline) e.deadline = 'Deadline is required';
    if (!formData.estimatedBudget) e.estimatedBudget = 'Budget is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const toggleMember = (userId) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };
  const selectAllMembers = () => {
    setSelectedMembers(memberList.map((m) => m._id));
  };

  const clearAllMembers = () => {
    setSelectedMembers([]);
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
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        status: formData.status,
        priority: formData.priority,
        type: formData.type,
        client: formData.client,
        timeline: {
          startDate: formData.startDate || undefined,
          deadline: formData.deadline,
          estimatedHours: formData.estimatedHours
            ? Number(formData.estimatedHours)
            : undefined,
        },
        budget: {
          estimated: Number(formData.estimatedBudget),
          actual: Number(formData.actualBudget) || 0,
          currency: formData.currency,
        },
        tags: formData.tags
          ? formData.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        team: selectedMembers.map((userId) => ({
          user: userId,
          role: 'Member',
          hoursAllocated: 0,
        })),
      };
      const { data } = await axios.post('/projects', payload);
      toast.success('Project created!');
      navigate(`/projects/${data.data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Add New Project" description="Create a new project">
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate('/projects')}
            icon={ArrowLeft}
          >
            Back
          </Button>
          <Button
            form="add-project-form"
            type="submit"
            loading={loading}
            icon={Save}
          >
            Create Project
          </Button>
        </div>
      </PageHeader>

      <form id="add-project-form" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Project Name *"
                  icon={FolderKanban}
                  placeholder="Enter project name"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  error={errors.name}
                />
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    className="input-field"
                    rows={3}
                    placeholder="Project description..."
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Client *
                    </label>
                    <select
                      value={formData.client}
                      onChange={(e) => updateField('client', e.target.value)}
                      className={`input-field ${errors.client ? 'border-red-500' : ''}`}
                    >
                      <option value="">Select client</option>
                      {clientList.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.company?.name}
                        </option>
                      ))}
                    </select>
                    {errors.client && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.client}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Project Type
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => updateField('type', e.target.value)}
                      className="input-field"
                    >
                      <option value="fixed_price">Fixed Price</option>
                      <option value="hourly">Hourly</option>
                      <option value="retainer">Retainer</option>
                      <option value="internal">Internal</option>
                    </select>
                  </div>
                </div>
                <Input
                  label="Tags"
                  placeholder="comma separated"
                  value={formData.tags}
                  onChange={(e) => updateField('tags', e.target.value)}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Timeline & Budget</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Start Date"
                    type="date"
                    icon={Calendar}
                    value={formData.startDate}
                    onChange={(e) => updateField('startDate', e.target.value)}
                  />
                  <Input
                    label="Deadline *"
                    type="date"
                    icon={Calendar}
                    value={formData.deadline}
                    onChange={(e) => updateField('deadline', e.target.value)}
                    error={errors.deadline}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Input
                    label="Budget *"
                    type="number"
                    icon={DollarSign}
                    placeholder="0"
                    value={formData.estimatedBudget}
                    onChange={(e) =>
                      updateField('estimatedBudget', e.target.value)
                    }
                    error={errors.estimatedBudget}
                  />
                  <Input
                    label="Actual Cost"
                    type="number"
                    value={formData.actualBudget}
                    onChange={(e) =>
                      updateField('actualBudget', e.target.value)
                    }
                  />
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Currency
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => updateField('currency', e.target.value)}
                      className="input-field"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="PKR">PKR</option>
                    </select>
                  </div>
                </div>
                <Input
                  label="Estimated Hours"
                  type="number"
                  placeholder="0"
                  value={formData.estimatedHours}
                  onChange={(e) =>
                    updateField('estimatedHours', e.target.value)
                  }
                />
              </CardContent>
            </Card>
            {/* Assign Team Members Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-500" />
                    Assign Team Members
                  </span>
                  {selectedMembers.length > 0 && (
                    <Badge variant="primary" size="sm">
                      {selectedMembers.length} selected
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {memberList.length === 0 ? (
                  <div className="text-center py-6">
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
                        onClick={selectAllMembers}
                        className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Select All
                      </button>
                      <span className="text-gray-300 dark:text-gray-600">
                        |
                      </span>
                      <button
                        type="button"
                        onClick={clearAllMembers}
                        className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 font-medium"
                      >
                        Clear All
                      </button>
                    </div>

                    {/* Selected Members Preview */}
                    {selectedMembers.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        {memberList
                          .filter((m) => selectedMembers.includes(m._id))
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
                                {m.firstName}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleMember(m._id)}
                                className="ml-0.5 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full"
                              >
                                <X className="w-3 h-3 text-gray-400" />
                              </button>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Scrollable Member List */}
                    <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                      {memberList.map((m) => {
                        const isSelected = selectedMembers.includes(m._id);
                        return (
                          <button
                            key={m._id}
                            type="button"
                            onClick={() => toggleMember(m._id)}
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

                            {/* Avatar with online indicator */}
                            <div className="relative flex-shrink-0">
                              <Avatar
                                name={`${m.firstName} ${m.lastName}`}
                                size="md"
                              />
                              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
                            </div>

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
                                  m.role === 'company_admin' ||
                                  m.role === 'admin'
                                    ? 'purple'
                                    : m.role === 'project_manager' ||
                                        m.role === 'manager'
                                      ? 'blue'
                                      : m.role === 'team_lead'
                                        ? 'green'
                                        : 'gray'
                                }
                                size="sm"
                              >
                                {m.role?.replace('_', ' ') || 'member'}
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
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                      <span>{memberList.length} team members available</span>
                      <span>{selectedMembers.length} selected</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Status & Priority Card */}
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
                    {statusOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateField('status', option.value)}
                        className={`p-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                          formData.status === option.value
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 shadow-sm'
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
                    {priorityOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateField('priority', option.value)}
                        className={`p-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                          formData.priority === option.value
                            ? (() => {
                                const colors = {
                                  low: 'border-gray-500 bg-gray-50 dark:bg-gray-900/20 text-gray-700',
                                  medium:
                                    'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700',
                                  high: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700',
                                  urgent:
                                    'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700',
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
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddProject;
