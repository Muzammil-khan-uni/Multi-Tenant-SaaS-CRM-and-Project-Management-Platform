import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useWorkspaceNavigate as useNavigate } from '../../hooks/useWorkspaceNavigate';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Edit,
  Save,
  Trash2,
  Plus,
  Calendar,
  DollarSign,
  Clock,
  Users,
  Building2,
  Target,
  X,
  UserPlus,
  Flag,
  AlertCircle,
  TrendingUp,
  History,
  FileText,
  CheckSquare,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Avatar } from '../../components/common/Avatar';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import { usePermissions } from '../../hooks/usePermissions';
import axios from '../../api/axios';
import toast from 'react-hot-toast';
import { formatDate, timeAgo } from '../../utils/helpers';

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

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({
    title: '',
    description: '',
    dueDate: '',
  });
  const [initialized, setInitialized] = useState(false);

  const loadProject = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`/projects/${id}`);
      setProject(data.data);
    } catch {
      toast.error('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const { data } = await axios.get('/workspaces/members');
      setMembers(data.data || []);
    } catch (err) {
      console.error('Failed to fetch members:', err);
    }
  };

  if (!initialized) {
    setInitialized(true);
    loadProject();
    fetchMembers();
  }

  const handleEdit = () => {
    setFormData({
      name: project?.name || '',
      description: project?.description || '',
      status: project?.status || 'planning',
      priority: project?.priority || 'medium',
      type: project?.type || 'fixed_price',
      startDate: project?.timeline?.startDate
        ? new Date(project.timeline.startDate).toISOString().split('T')[0]
        : '',
      deadline: project?.timeline?.deadline
        ? new Date(project.timeline.deadline).toISOString().split('T')[0]
        : '',
      estimatedBudget: project?.budget?.estimated || 0,
      estimatedHours: project?.timeline?.estimatedHours || '',
      actualBudget: project?.budget?.actual || 0,
      currency: project?.budget?.currency || 'USD',
      tags: project?.tags?.join(', ') || '',
    });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`/projects/${id}`, {
        name: formData.name,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
        type: formData.type,
        timeline: {
          startDate: formData.startDate || undefined,
          deadline: formData.deadline || undefined,
          estimatedHours: Number(formData.estimatedHours) || undefined,
        },
        budget: {
          estimated: Number(formData.estimatedBudget),
          actual: Number(formData.actualBudget) || 0,
          currency: formData.currency || 'USD',
        },
        tags: formData.tags
          ? formData.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
      });
      toast.success('Updated');
      setEditing(false);
      loadProject();
    } catch {
      toast.error('Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await axios.delete(`/projects/${id}`);
      toast.success('Deleted');
      navigate('/projects');
    } catch {
      toast.error('Failed');
    } finally {
      setDeleting(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedMember) return;
    try {
      await axios.post(`/projects/${id}/team`, {
        user: selectedMember,
        role: 'Member',
      });
      toast.success('Added');
      setShowAddMember(false);
      setSelectedMember('');
      loadProject();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      await axios.delete(`/projects/${id}/team/${userId}`);
      toast.success('Removed');
      loadProject();
    } catch {
      toast.error('Failed');
    }
  };

  const handleAddMilestone = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`/projects/${id}/milestones`, milestoneForm);
      toast.success('Added');
      setShowAddMilestone(false);
      setMilestoneForm({ title: '', description: '', dueDate: '' });
      loadProject();
    } catch {
      toast.error('Failed');
    }
  };

  const handleMilestoneStatus = async (milestoneId, status) => {
    try {
      await axios.put(`/projects/${id}/milestones/${milestoneId}`, { status });
      loadProject();
    } catch {
      toast.error('Failed');
    }
  };

  if (loading)
    return (
      <div className="space-y-6">
        <PageHeader title="Project" />
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        </div>
      </div>
    );
  if (!project)
    return (
      <div className="space-y-6">
        <PageHeader title="Not Found" />
        <Card>
          <CardContent>
            <p className="text-center py-8">Project not found</p>
            <Button onClick={() => navigate('/projects')} icon={ArrowLeft}>
              Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );

  const completedMilestones =
    project.milestones?.filter((m) => m.status === 'completed').length || 0;
  const totalMilestones = project.milestones?.length || 0;
  const isOverdue =
    project.timeline?.deadline &&
    new Date(project.timeline.deadline) < new Date() &&
    project.status !== 'completed';

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={project.name}
        description={`Created ${timeAgo(project.createdAt)}`}
      >
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() =>
              editing
                ? (setEditing(false), setFormData({}))
                : navigate('/projects')
            }
            icon={ArrowLeft}
          >
            {editing ? 'Cancel' : 'Back'}
          </Button>
          {editing ? (
            <Button onClick={handleSave} icon={Save} loading={saving}>
              Save
            </Button>
          ) : (
            <>
              {hasPermission('update_projects') && (
                <Button onClick={handleEdit} icon={Edit}>
                  Edit
                </Button>
              )}
              {hasPermission('delete_projects') && (
                <Button
                  variant="danger"
                  onClick={() => setShowDelete(true)}
                  icon={Trash2}
                >
                  Delete
                </Button>
              )}
            </>
          )}
        </div>
      </PageHeader>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-200 dark:bg-blue-700 flex items-center justify-center">
              <Flag className="w-4 h-4 text-blue-600 dark:text-blue-300" />
            </div>
            <p className="text-xs text-blue-500 font-medium">Status</p>
          </div>
          <Badge variant={statusColors[project.status]} size="md">
            {statusLabels[project.status]}
          </Badge>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-xl p-4 border border-amber-200 dark:border-amber-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-200 dark:bg-amber-700 flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-300" />
            </div>
            <p className="text-xs text-amber-500 font-medium">Priority</p>
          </div>
          <Badge variant={priorityColors[project.priority]} size="md">
            {priorityLabels[project.priority]}
          </Badge>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4 border border-purple-200 dark:border-purple-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-200 dark:bg-purple-700 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-300" />
            </div>
            <p className="text-xs text-purple-500 font-medium">Deadline</p>
          </div>
          <p
            className={`text-sm font-semibold ${isOverdue ? 'text-red-600' : 'text-purple-700 dark:text-purple-300'}`}
          >
            {project.timeline?.deadline
              ? formatDate(project.timeline.deadline)
              : 'Not set'}
          </p>
          {isOverdue && (
            <p className="text-xs text-red-500 mt-0.5">⚠ Overdue</p>
          )}
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-200 dark:bg-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
            </div>
            <p className="text-xs text-emerald-500 font-medium">Progress</p>
          </div>
          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
            {project.progress || 0}%
          </p>
          <div className="w-full bg-emerald-200 dark:bg-emerald-700 rounded-full h-2 mt-1">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${project.progress || 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Second Row Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
          <DollarSign className="w-5 h-5 text-green-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {project.budget?.currency || 'USD'}{' '}
            {project.budget?.estimated?.toLocaleString() || 0}
          </p>
          <p className="text-xs text-gray-500">Budget</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
          <Clock className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {project.timeline?.estimatedHours || 'N/A'}
          </p>
          <p className="text-xs text-gray-500">Est. Hours</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
          <Users className="w-5 h-5 text-purple-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {project.team?.length || 0}
          </p>
          <p className="text-xs text-gray-500">Team Members</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
          <Target className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {completedMilestones}/{totalMilestones}
          </p>
          <p className="text-xs text-gray-500">Milestones</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 overflow-x-auto">
        {[
          { id: 'overview', icon: FileText, label: 'Overview' },
          {
            id: 'team',
            icon: Users,
            label: `Team (${project.team?.length || 0})`,
          },
          {
            id: 'milestones',
            icon: Target,
            label: `Milestones (${completedMilestones}/${totalMilestones})`,
          },
          {
            id: 'tasks',
            icon: CheckSquare,
            label: `Tasks (${project.tasks?.length || 0})`,
          },
          { id: 'activity', icon: History, label: 'Activity' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {editing ? (
                      <textarea
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        className="input-field"
                        rows={4}
                      />
                    ) : (
                      <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                        {project.description || 'No description provided.'}
                      </p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Client</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {project.client ? (
                      <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {project.client.company?.name}
                          </p>
                          {project.client.contacts?.[0]?.email && (
                            <p className="text-sm text-gray-500">
                              {project.client.contacts[0].email}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500">No client assigned</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Project Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {editing ? (
                      <>
                        <Input
                          label="Name"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                        />

                        {/* Status Buttons */}
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Status
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {Object.entries(statusLabels).map(([k, v]) => (
                              <button
                                key={k}
                                type="button"
                                onClick={() =>
                                  setFormData({ ...formData, status: k })
                                }
                                className={`p-2 rounded-lg text-xs font-medium border-2 transition-all ${formData.status === k ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700'}`}
                              >
                                {v}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Priority Buttons */}
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Priority
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {Object.entries(priorityLabels).map(([k, v]) => (
                              <button
                                key={k}
                                type="button"
                                onClick={() =>
                                  setFormData({ ...formData, priority: k })
                                }
                                className={`p-2 rounded-lg text-xs font-medium border-2 transition-all ${formData.priority === k ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700'}`}
                              >
                                {v}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Project Type */}
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Project Type
                          </label>
                          <select
                            value={formData.type}
                            onChange={(e) =>
                              setFormData({ ...formData, type: e.target.value })
                            }
                            className="input-field"
                          >
                            <option value="fixed_price">Fixed Price</option>
                            <option value="hourly">Hourly</option>
                            <option value="retainer">Retainer</option>
                            <option value="internal">Internal</option>
                          </select>
                        </div>

                        {/* Dates */}
                        <Input
                          label="Start Date"
                          type="date"
                          value={formData.startDate}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              startDate: e.target.value,
                            })
                          }
                        />
                        <Input
                          label="Deadline"
                          type="date"
                          value={formData.deadline}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              deadline: e.target.value,
                            })
                          }
                        />

                        {/* Budget Section */}
                        <div className="border-t pt-3 mt-2">
                          <h4 className="text-sm font-semibold mb-3">Budget</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            <Input
                              label="Estimated"
                              type="number"
                              value={formData.estimatedBudget}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  estimatedBudget: e.target.value,
                                })
                              }
                            />
                            <Input
                              label="Actual Cost"
                              type="number"
                              value={formData.actualBudget}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  actualBudget: e.target.value,
                                })
                              }
                            />
                            <div>
                              <label className="block text-sm font-medium mb-1">
                                Currency
                              </label>
                              <select
                                value={formData.currency}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    currency: e.target.value,
                                  })
                                }
                                className="input-field"
                              >
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                                <option value="GBP">GBP</option>
                                <option value="PKR">PKR</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <Input
                          label="Est. Hours"
                          type="number"
                          value={formData.estimatedHours}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              estimatedHours: e.target.value,
                            })
                          }
                        />

                        {/* Tags */}
                        <Input
                          label="Tags"
                          placeholder="comma separated (e.g., web, mobile, urgent)"
                          value={formData.tags}
                          onChange={(e) =>
                            setFormData({ ...formData, tags: e.target.value })
                          }
                        />
                      </>
                    ) : (
                      <div className="space-y-3">
                        {/* Project Type */}
                        <div className="flex justify-between items-center p-2">
                          <span className="text-sm text-gray-500">Type</span>
                          <span className="text-sm font-medium capitalize">
                            {project.type?.replace('_', ' ') || 'N/A'}
                          </span>
                        </div>

                        {/* Dates */}
                        <div className="flex justify-between items-center p-2">
                          <span className="text-sm text-gray-500">
                            Start Date
                          </span>
                          <span className="text-sm font-medium">
                            {project.timeline?.startDate
                              ? formatDate(project.timeline.startDate)
                              : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2">
                          <span className="text-sm text-gray-500">
                            Deadline
                          </span>
                          <span
                            className={`text-sm font-medium ${isOverdue ? 'text-red-500' : ''}`}
                          >
                            {project.timeline?.deadline
                              ? formatDate(project.timeline.deadline)
                              : 'N/A'}
                          </span>
                        </div>

                        {/* Budget */}
                        <div className="border-t pt-3 mt-2">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                            Budget
                          </h4>
                          <div className="flex justify-between items-center p-2">
                            <span className="text-sm text-gray-500">
                              Estimated
                            </span>
                            <span className="text-sm font-medium">
                              {project.budget?.currency || 'USD'}{' '}
                              {project.budget?.estimated?.toLocaleString() || 0}
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-2">
                            <span className="text-sm text-gray-500">
                              Actual Cost
                            </span>
                            <span className="text-sm font-medium">
                              {project.budget?.currency || 'USD'}{' '}
                              {project.budget?.actual?.toLocaleString() || 0}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center p-2">
                          <span className="text-sm text-gray-500">
                            Est. Hours
                          </span>
                          <span className="text-sm font-medium">
                            {project.timeline?.estimatedHours || 'N/A'}
                          </span>
                        </div>

                        {/* Tags */}
                        <div className="border-t pt-3 mt-2">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                            Tags
                          </h4>
                          {project.tags?.length > 0 ? (
                            <div className="flex gap-1.5 flex-wrap">
                              {project.tags.map((tag, i) => (
                                <Badge key={i} variant="primary" size="sm">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400">No tags</p>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Team Tab */}
          {activeTab === 'team' && (
            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
                {hasPermission('assign_project_team') && (
                  <Button
                    size="sm"
                    icon={UserPlus}
                    onClick={() => setShowAddMember(true)}
                  >
                    Add Member
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {project.team?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {project.team.map((t) => (
                      <div
                        key={t.user?._id}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={`${t.user?.firstName} ${t.user?.lastName}`}
                            size="md"
                          />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {t.user?.firstName} {t.user?.lastName}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Badge variant="blue" size="sm">
                                {t.role || 'Member'}
                              </Badge>
                              <span>
                                {t.hoursWorked || 0}/{t.hoursAllocated || 0} hrs
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(t.user._id)}
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Users}
                    title="No team members"
                    description="Add members to collaborate"
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Milestones Tab */}
          {activeTab === 'milestones' && (
            <Card>
              <CardHeader>
                <CardTitle>Milestones</CardTitle>
                <Button
                  size="sm"
                  icon={Plus}
                  onClick={() => setShowAddMilestone(true)}
                >
                  Add
                </Button>
              </CardHeader>
              <CardContent>
                {project.milestones?.length > 0 ? (
                  <div className="space-y-3">
                    {project.milestones.map((m, i) => (
                      <motion.div
                        key={m._id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                          m.status === 'completed'
                            ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() =>
                              handleMilestoneStatus(
                                m._id,
                                m.status === 'completed'
                                  ? 'pending'
                                  : 'completed'
                              )
                            }
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              m.status === 'completed'
                                ? 'bg-green-500 border-green-500'
                                : 'border-gray-300 dark:border-gray-600'
                            }`}
                          >
                            {m.status === 'completed' && (
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
                          </button>
                          <div>
                            <p
                              className={`font-medium ${m.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}
                            >
                              {m.title}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                              {m.dueDate && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(m.dueDate)}
                                </span>
                              )}
                              {m.description && <span>{m.description}</span>}
                            </div>
                          </div>
                        </div>
                        <Badge
                          variant={
                            m.status === 'completed'
                              ? 'green'
                              : m.status === 'in_progress'
                                ? 'blue'
                                : 'gray'
                          }
                          size="sm"
                        >
                          {m.status}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Target}
                    title="No milestones"
                    description="Add milestones to track progress"
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <Card>
              <CardHeader>
                <CardTitle>Tasks ({project.tasks?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {project.tasks?.length > 0 ? (
                  <div className="space-y-2">
                    {project.tasks.map((t) => (
                      <div
                        key={t._id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-sm cursor-pointer transition-all"
                        onClick={() => navigate(`/tasks/${t._id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={t.status === 'completed'}
                            readOnly
                            className="rounded"
                          />
                          <div>
                            <p
                              className={`font-medium ${t.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}
                            >
                              {t.title}
                            </p>
                            <p className="text-xs text-gray-500">
                              {t.dueDate
                                ? formatDate(t.dueDate)
                                : 'No due date'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={priorityColors[t.priority]} size="sm">
                            {t.priority}
                          </Badge>
                          <Badge
                            variant={
                              t.status === 'completed'
                                ? 'green'
                                : t.status === 'in_progress'
                                  ? 'blue'
                                  : 'gray'
                            }
                            size="sm"
                          >
                            {t.status?.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={CheckSquare}
                    title="No tasks"
                    description="Create tasks for this project"
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <Card>
              <CardHeader>
                <CardTitle>Activity Log</CardTitle>
              </CardHeader>
              <CardContent>
                {project.activityLog?.length > 0 ? (
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                    <div className="space-y-4 ml-10">
                      {[...project.activityLog].reverse().map((a, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="relative"
                        >
                          <div className="absolute -left-10 mt-1 w-4 h-4 rounded-full border-2 border-primary-500 bg-white dark:bg-gray-800" />
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {a.description}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDate(a.timestamp)} by{' '}
                              {a.performedBy?.firstName || 'System'}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyState icon={History} title="No activity yet" />
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Add Member Modal */}
      <Modal
        isOpen={showAddMember}
        onClose={() => setShowAddMember(false)}
        title="Add Team Member"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Select Member
            </label>
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="input-field"
            >
              <option value="">Select...</option>
              {members
                .filter(
                  (m) => !project.team?.find((t) => t.user?._id === m._id)
                )
                .map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.firstName} {m.lastName}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowAddMember(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button onClick={handleAddMember} className="flex-1">
              Add
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Milestone Modal */}
      <Modal
        isOpen={showAddMilestone}
        onClose={() => setShowAddMilestone(false)}
        title="Add Milestone"
        size="sm"
      >
        <form onSubmit={handleAddMilestone} className="space-y-4">
          <Input
            label="Title *"
            value={milestoneForm.title}
            onChange={(e) =>
              setMilestoneForm({ ...milestoneForm, title: e.target.value })
            }
            required
          />
          <Input
            label="Description"
            value={milestoneForm.description}
            onChange={(e) =>
              setMilestoneForm({
                ...milestoneForm,
                description: e.target.value,
              })
            }
          />
          <Input
            label="Due Date"
            type="date"
            value={milestoneForm.dueDate}
            onChange={(e) =>
              setMilestoneForm({ ...milestoneForm, dueDate: e.target.value })
            }
          />
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowAddMilestone(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Add
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Project"
        message={`Delete "${project.name}"? All tasks will also be deleted.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default ProjectDetail;
