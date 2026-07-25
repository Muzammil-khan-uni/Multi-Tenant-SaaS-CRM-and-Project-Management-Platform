import { useState, useRef } from 'react';
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
  MessageSquare,
  Paperclip,
  CheckSquare,
  Send,
  X,
  AlertCircle,
  Flag,
  FolderKanban,
  History,
  FileText,
  Search,
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
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import FileUpload from '../../components/common/FileUpload';
import { usePermissions } from '../../hooks/usePermissions';
import axios from '../../api/axios';
import toast from 'react-hot-toast';
import { formatDate, timeAgo } from '../../utils/helpers';

const statusColors = {
  todo: 'gray',
  in_progress: 'blue',
  review: 'yellow',
  completed: 'green',
};
const statusLabels = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'In Review',
  completed: 'Completed',
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

const TaskDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [newChecklist, setNewChecklist] = useState('');
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [initialized, setInitialized] = useState(false);
  const [showMentionPopup, setShowMentionPopup] = useState(false);
  const [mentionSearchTerm, setMentionSearchTerm] = useState('');
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const commentInputRef = useRef(null);

  if (!membersLoaded) {
    setMembersLoaded(true);
    axios
      .get('/workspaces/members')
      .then(({ data }) => setWorkspaceMembers(data.data || []))
      .catch(() => {});
  }

  const loadTask = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`/tasks/${id}`);
      setTask(data.data);
    } catch {
      toast.error('Failed to load task');
    } finally {
      setLoading(false);
    }
  };

  if (!initialized) {
    setInitialized(true);
    loadTask();
  }

  const handleEdit = () => {
    setFormData({
      title: task?.title || '',
      description: task?.description || '',
      status: task?.status || 'todo',
      priority: task?.priority || 'medium',
      dueDate: task?.dueDate
        ? new Date(task.dueDate).toISOString().split('T')[0]
        : '',
      estimatedHours: task?.estimatedHours || '',
    });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`/tasks/${id}`, formData);
      toast.success('Updated');
      setEditing(false);
      loadTask();
    } catch {
      toast.error('Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await axios.delete(`/tasks/${id}`);
      toast.success('Deleted');
      navigate('/tasks');
    } catch {
      toast.error('Failed');
    } finally {
      setDeleting(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setCommentLoading(true);

    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(commentText)) !== null) {
      const member = workspaceMembers.find(
        (m) => m.firstName?.toLowerCase() === match[1].toLowerCase()
      );
      if (member && !mentions.includes(member._id)) mentions.push(member._id);
    }

    try {
      await axios.post(`/tasks/${id}/comments`, {
        content: commentText,
        mentions,
      });
      setCommentText('');
      setShowMentionPopup(false);
      setMentionSearchTerm('');
      loadTask();
    } catch {
      toast.error('Failed');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleCommentChange = (e) => {
    const value = e.target.value;
    setCommentText(value);

    const lastAtSymbol = value.lastIndexOf('@');
    if (lastAtSymbol !== -1) {
      const textAfterAt = value.substring(lastAtSymbol + 1);
      if (!textAfterAt.includes(' ') && textAfterAt.length < 30) {
        setShowMentionPopup(true);
        setMentionSearchTerm(textAfterAt);
      } else {
        setShowMentionPopup(false);
        setMentionSearchTerm('');
      }
    } else {
      setShowMentionPopup(false);
      setMentionSearchTerm('');
    }
  };

  const handleMentionSelect = (member) => {
    const lastAt = commentText.lastIndexOf('@');
    const beforeAt = commentText.substring(0, lastAt);
    setCommentText(beforeAt + `@${member.firstName} `);
    setShowMentionPopup(false);
    setMentionSearchTerm('');
    commentInputRef.current?.focus();
  };

  const handleCommentKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowMentionPopup(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await axios.delete(`/tasks/${id}/comments/${commentId}`);
      loadTask();
    } catch {
      toast.error('Failed');
    }
  };

  const handleAddChecklist = async (e) => {
    e.preventDefault();
    if (!newChecklist.trim()) return;
    setChecklistLoading(true);
    try {
      await axios.post(`/tasks/${id}/checklist`, { title: newChecklist });
      setNewChecklist('');
      loadTask();
    } catch {
      toast.error('Failed');
    } finally {
      setChecklistLoading(false);
    }
  };

  const handleToggleChecklist = async (itemId, completed) => {
    try {
      await axios.put(`/tasks/${id}/checklist/${itemId}`, {
        completed: !completed,
      });
      loadTask();
    } catch {
      toast.error('Failed');
    }
  };

  const handleDeleteChecklist = async (itemId) => {
    try {
      await axios.delete(`/tasks/${id}/checklist/${itemId}`);
      loadTask();
    } catch {
      toast.error('Failed');
    }
  };

  const handleFileUpload = async (files) => {
    for (const file of files) {
      try {
        await axios.post(`/tasks/${id}/attachments`, file);
      } catch {
        toast.error('Failed to attach');
      }
    }
    loadTask();
  };

  const handleDeleteAttachment = async (attachmentId) => {
    try {
      await axios.delete(`/tasks/${id}/attachments/${attachmentId}`);
      loadTask();
    } catch {
      toast.error('Failed');
    }
  };

  if (loading)
    return (
      <div className="space-y-6">
        <PageHeader title="Task Details" />
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        </div>
      </div>
    );

  if (!task)
    return (
      <div className="space-y-6">
        <PageHeader title="Not Found" />
        <Card>
          <CardContent>
            <p className="text-center py-8">Task not found</p>
            <Button onClick={() => navigate('/tasks')} icon={ArrowLeft}>
              Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );

  const completedChecklist =
    task.checklist?.filter((c) => c.completed).length || 0;
  const totalChecklist = task.checklist?.length || 0;
  const checklistProgress =
    totalChecklist > 0
      ? Math.round((completedChecklist / totalChecklist) * 100)
      : 0;
  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== 'completed';

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={task.title}
        description={`Created ${timeAgo(task.createdAt)}`}
      >
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() =>
              editing
                ? (setEditing(false), setFormData({}))
                : navigate('/tasks')
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
              {hasPermission('update_tasks') && (
                <Button onClick={handleEdit} icon={Edit}>
                  Edit
                </Button>
              )}
              {hasPermission('delete_tasks') && (
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
            <p className="text-xs text-blue-500 dark:text-blue-400 font-medium">
              Status
            </p>
          </div>
          <Badge variant={statusColors[task.status]} size="md">
            {statusLabels[task.status]}
          </Badge>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-xl p-4 border border-amber-200 dark:border-amber-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-200 dark:bg-amber-700 flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-300" />
            </div>
            <p className="text-xs text-amber-500 dark:text-amber-400 font-medium">
              Priority
            </p>
          </div>
          <Badge variant={priorityColors[task.priority]} size="md">
            {priorityLabels[task.priority]}
          </Badge>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4 border border-purple-200 dark:border-purple-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-200 dark:bg-purple-700 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-300" />
            </div>
            <p className="text-xs text-purple-500 dark:text-purple-400 font-medium">
              Due Date
            </p>
          </div>
          <p
            className={`text-sm font-semibold ${isOverdue ? 'text-red-600' : 'text-purple-700 dark:text-purple-300'}`}
          >
            {task.dueDate ? formatDate(task.dueDate) : 'Not set'}
          </p>
          {isOverdue && (
            <p className="text-xs text-red-500 mt-0.5">⚠ Overdue</p>
          )}
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-200 dark:bg-emerald-700 flex items-center justify-center">
              <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
            </div>
            <p className="text-xs text-emerald-500 dark:text-emerald-400 font-medium">
              Checklist
            </p>
          </div>
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            {completedChecklist}/{totalChecklist}
          </p>
          {totalChecklist > 0 && (
            <div className="w-full bg-emerald-200 dark:bg-emerald-700 rounded-full h-1.5 mt-1">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all"
                style={{ width: `${checklistProgress}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {[
          { id: 'details', icon: FileText, label: 'Details' },
          {
            id: 'checklist',
            icon: CheckSquare,
            label: `Checklist (${completedChecklist}/${totalChecklist})`,
          },
          {
            id: 'comments',
            icon: MessageSquare,
            label: `Comments (${task.comments?.length || 0})`,
          },
          {
            id: 'attachments',
            icon: Paperclip,
            label: `Files (${task.attachments?.length || 0})`,
          },
          { id: 'activity', icon: History, label: 'Activity' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
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
          {/* Details Tab */}
          {activeTab === 'details' && (
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
                        rows={5}
                      />
                    ) : (
                      <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                        {task.description || 'No description provided.'}
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Labels</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {task.labels?.length > 0 ? (
                      <div className="flex gap-2 flex-wrap">
                        {task.labels.map((l, i) => (
                          <span
                            key={i}
                            className="px-3 py-1.5 rounded-full text-sm font-medium"
                            style={{
                              backgroundColor: (l.color || '#3b82f6') + '20',
                              color: l.color || '#3b82f6',
                              border: `1px solid ${l.color || '#3b82f6'}40`,
                            }}
                          >
                            {l.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No labels</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Assigned To</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {task.assignedTo?.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {task.assignedTo.map((a) => (
                          <div
                            key={a.user?._id}
                            className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
                          >
                            <Avatar
                              name={`${a.user?.firstName} ${a.user?.lastName}`}
                              size="md"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {a.user?.firstName} {a.user?.lastName}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {a.user?.email}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Unassigned</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Other Informations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {editing ? (
                      <>
                        <Input
                          label="Title"
                          value={formData.title}
                          onChange={(e) =>
                            setFormData({ ...formData, title: e.target.value })
                          }
                        />
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
                        <Input
                          label="Due Date"
                          type="date"
                          value={formData.dueDate}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              dueDate: e.target.value,
                            })
                          }
                        />
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
                      </>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-2">
                          <span className="text-sm text-gray-500">Project</span>
                          <span className="text-sm font-medium flex items-center gap-1">
                            <FolderKanban className="w-4 h-4 text-gray-400" />
                            {task.project?.name || 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-2">
                          <span className="text-sm text-gray-500">
                            Due Date
                          </span>
                          <span
                            className={`text-sm font-medium ${isOverdue ? 'text-red-500' : ''}`}
                          >
                            {task.dueDate
                              ? formatDate(task.dueDate)
                              : 'Not set'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-2">
                          <span className="text-sm text-gray-500">
                            Est. Hours
                          </span>
                          <span className="text-sm font-medium">
                            {task.estimatedHours || 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-2">
                          <span className="text-sm text-gray-500">Created</span>
                          <span className="text-sm font-medium">
                            {timeAgo(task.createdAt)}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Checklist Tab */}
          {activeTab === 'checklist' && (
            <Card>
              <CardHeader>
                <CardTitle>Checklist</CardTitle>
                {totalChecklist > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${checklistProgress === 100 ? 'bg-green-500' : 'bg-primary-500'}`}
                        style={{ width: `${checklistProgress}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {checklistProgress}%
                    </span>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddChecklist} className="flex gap-2 mb-6">
                  <input
                    type="text"
                    value={newChecklist}
                    onChange={(e) => setNewChecklist(e.target.value)}
                    placeholder="Add a new checklist item..."
                    className="input-field flex-1"
                  />
                  <Button type="submit" loading={checklistLoading} icon={Plus}>
                    Add
                  </Button>
                </form>
                {task.checklist?.length > 0 ? (
                  <div className="space-y-2">
                    {task.checklist.map((item, i) => (
                      <motion.div
                        key={item._id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                          item.completed
                            ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <button
                            onClick={() =>
                              handleToggleChecklist(item._id, item.completed)
                            }
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              item.completed
                                ? 'bg-green-500 border-green-500'
                                : 'border-gray-300 dark:border-gray-600'
                            }`}
                          >
                            {item.completed && (
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
                          <span
                            className={`text-sm ${item.completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}
                          >
                            {item.title}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteChecklist(item._id)}
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={CheckSquare}
                    title="No checklist items"
                    description="Add items to track progress"
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <Card>
              <CardHeader>
                <CardTitle>Comments ({task.comments?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddComment} className="flex gap-3 mb-8">
                  <Avatar
                    name={`${task.createdBy?.firstName || 'User'}`}
                    size="md"
                    className="flex-shrink-0 mt-1"
                  />
                  <div className="flex-1 space-y-2 relative">
                    <textarea
                      ref={commentInputRef}
                      value={commentText}
                      onChange={handleCommentChange}
                      onKeyDown={handleCommentKeyDown}
                      placeholder="Write a comment... Use @ to mention someone"
                      className="input-field"
                      rows={3}
                    />

                    {/* @Mention Popup - shows workspace members while typing @ */}
                    <AnimatePresence>
                      {showMentionPopup && workspaceMembers.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 5, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 5, scale: 0.95 }}
                          className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 w-64"
                        >
                          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                            <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
                              Mention a team member
                            </p>
                          </div>

                          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                            <div className="relative">
                              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                              <input
                                type="text"
                                placeholder="Search members..."
                                value={mentionSearchTerm}
                                onChange={(e) =>
                                  setMentionSearchTerm(e.target.value)
                                }
                                className="w-full pl-7 pr-2 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 rounded-lg border-0 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>

                          <div className="max-h-56 overflow-y-auto py-1">
                            {workspaceMembers
                              .filter((member) => {
                                if (!mentionSearchTerm) return true;
                                const name =
                                  `${member.firstName} ${member.lastName}`.toLowerCase();
                                return name.includes(
                                  mentionSearchTerm.toLowerCase()
                                );
                              })
                              .map((member) => (
                                <button
                                  key={member._id}
                                  type="button"
                                  onClick={() => handleMentionSelect(member)}
                                  className="flex items-center gap-3 w-full px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                                >
                                  <Avatar
                                    name={`${member.firstName} ${member.lastName}`}
                                    size="sm"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                      {member.firstName} {member.lastName}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                      {member.role?.replace('_', ' ') ||
                                        'Member'}
                                      {member.department?.name
                                        ? ` • ${member.department.name}`
                                        : ''}
                                    </p>
                                  </div>
                                </button>
                              ))}

                            {workspaceMembers.filter((member) => {
                              if (!mentionSearchTerm) return true;
                              const name =
                                `${member.firstName} ${member.lastName}`.toLowerCase();
                              return name.includes(
                                mentionSearchTerm.toLowerCase()
                              );
                            }).length === 0 && (
                              <p className="text-xs text-gray-400 text-center py-4">
                                No members found
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        loading={commentLoading}
                        icon={Send}
                        size="sm"
                      >
                        Send
                      </Button>
                    </div>
                  </div>
                </form>
                {task.comments?.length > 0 ? (
                  <div className="space-y-4">
                    {[...task.comments].reverse().map((c, i) => (
                      <motion.div
                        key={c._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex gap-3"
                      >
                        <Avatar
                          name={`${c.author?.firstName} ${c.author?.lastName}`}
                          size="md"
                          className="flex-shrink-0"
                        />
                        <div className="flex-1">
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {c.author?.firstName} {c.author?.lastName}
                                </span>
                                <span className="text-xs text-gray-400 ml-2">
                                  {timeAgo(c.createdAt)}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteComment(c._id)}
                              >
                                <X className="w-3 h-3 text-gray-400" />
                              </Button>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                              {c.content}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={MessageSquare}
                    title="No comments yet"
                    description="Start the conversation"
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Attachments Tab */}
          {activeTab === 'attachments' && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Attachments ({task.attachments?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6 p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl">
                  <FileUpload
                    onUploadComplete={handleFileUpload}
                    maxFiles={5}
                  />
                </div>
                {task.attachments?.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {task.attachments.map((a) => (
                      <div
                        key={a._id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-all"
                      >
                        <a
                          href={a.url}
                          download={a.name} // This forces download with original name
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 flex-1 min-w-0 group"
                          onClick={(e) => {
                            const extension = a.name
                              ?.split('.')
                              .pop()
                              ?.toLowerCase();
                            if (
                              [
                                'pdf',
                                'jpg',
                                'jpeg',
                                'png',
                                'gif',
                                'svg',
                              ].includes(extension)
                            ) {
                              e.preventDefault();
                              fetch(a.url)
                                .then((response) => response.blob())
                                .then((blob) => {
                                  const url = window.URL.createObjectURL(blob);
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.download = a.name;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  window.URL.revokeObjectURL(url);
                                })
                                .catch(() => {
                                  // Fallback: open in new tab
                                  window.open(a.url, '_blank');
                                });
                            }
                          }}
                        >
                          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                            <Paperclip className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-primary-600 group-hover:underline truncate">
                              {a.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(a.size / 1024).toFixed(1)} KB •{' '}
                              {timeAgo(a.uploadedAt)}
                            </p>
                          </div>
                        </a>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAttachment(a._id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
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
                {task.activityLog?.length > 0 ? (
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                    <div className="space-y-4 ml-10">
                      {[...task.activityLog].reverse().map((a, i) => (
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
                  <EmptyState
                    icon={History}
                    title="No activity yet"
                    description="Actions will be logged here"
                  />
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Task"
        message={`Delete "${task.title}"? This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default TaskDetail;
