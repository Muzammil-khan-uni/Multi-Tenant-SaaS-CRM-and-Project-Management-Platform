import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Megaphone,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Pin,
  X,
  CheckCircle,
  AlertTriangle,
  Info,
  AlertCircle,
} from 'lucide-react';
import { superAdminAPI } from '../../api/superAdmin.api';
import toast from 'react-hot-toast';

const TYPE_CONFIG = {
  info: {
    icon: Info,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
  },
  success: {
    icon: CheckCircle,
    color:
      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
  },
  warning: {
    icon: AlertTriangle,
    color:
      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    border: 'border-yellow-200 dark:border-yellow-800',
  },
  danger: {
    icon: AlertCircle,
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
  },
};

const emptyForm = {
  title: '',
  message: '',
  type: 'info',
  targetAudience: 'all',
  isPinned: false,
  expiresAt: '',
};

const AnnouncementModal = ({ initial, onSave, onClose }) => {
  const [form, setForm] = useState(initial || emptyForm);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      toast.error('Title and message are required');
      return;
    }
    try {
      setSaving(true);
      await onSave(form);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save announcement');
    } finally {
      setSaving(false);
    }
  };

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {initial ? 'Edit Announcement' : 'New Announcement'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Title *
            </label>
            <input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Announcement title…"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Message *
            </label>
            <textarea
              value={form.message}
              onChange={(e) => set('message', e.target.value)}
              rows={4}
              placeholder="Write your platform-wide announcement here…"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Type
              </label>
              <select
                value={form.type}
                onChange={(e) => set('type', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                {['info', 'success', 'warning', 'danger'].map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Audience
              </label>
              <select
                value={form.targetAudience}
                onChange={(e) => set('targetAudience', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                <option value="all">All Users</option>
                <option value="admins">Admins Only</option>
                <option value="specific_plan">Specific Plan</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Expires At (optional)
            </label>
            <input
              type="datetime-local"
              value={form.expiresAt}
              onChange={(e) => set('expiresAt', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isPinned}
              onChange={(e) => set('isPinned', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-purple-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Pin this announcement to the top
            </span>
          </label>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : null}
            {initial ? 'Update' : 'Send Announcement'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const fetchAnnouncements = useCallback(async (signal) => {
    try {
      setLoading(true);
      const res = await superAdminAPI.getAnnouncements({ signal });
      setAnnouncements(res.data.data);
    } catch (error) {
      if (error.name !== 'AbortError' && error.name !== 'CanceledError') {
        toast.error('Failed to load announcements');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAnnouncements(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchAnnouncements]);

  const handleCreate = async (form) => {
    await superAdminAPI.createAnnouncement(form);
    toast.success('Announcement sent to all workspaces');
    fetchAnnouncements();
  };

  const handleEdit = async (form) => {
    await superAdminAPI.updateAnnouncement(editTarget._id, form);
    toast.success('Announcement updated');
    fetchAnnouncements();
  };

  const handleToggleActive = async (ann) => {
    try {
      await superAdminAPI.updateAnnouncement(ann._id, {
        isActive: !ann.isActive,
      });
      toast.success(
        ann.isActive ? 'Announcement deactivated' : 'Announcement activated'
      );
      fetchAnnouncements();
    } catch {
      toast.error('Action failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await superAdminAPI.deleteAnnouncement(id);
      toast.success('Announcement deleted');
      fetchAnnouncements();
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-purple-500" />
            Platform Announcements
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Send messages to all workspace users
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchAnnouncements()}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={() => {
              setEditTarget(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Plus className="w-4 h-4" />
            New Announcement
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center text-gray-400">
          <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No announcements yet</p>
          <p className="text-sm mt-1">
            Create one to broadcast messages to all tenants
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((ann, i) => {
            const cfg = TYPE_CONFIG[ann.type] || TYPE_CONFIG.info;
            const Icon = cfg.icon;
            return (
              <motion.div
                key={ann._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`bg-white dark:bg-gray-800 rounded-xl border p-5 ${cfg.border} ${!ann.isActive ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className={`p-2 rounded-lg flex-shrink-0 ${cfg.color}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {ann.title}
                        </h3>
                        {ann.isPinned && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300">
                            <Pin className="w-3 h-3" /> Pinned
                          </span>
                        )}
                        {!ann.isActive && (
                          <span className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-500">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 whitespace-pre-wrap">
                        {ann.message}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 flex-wrap">
                        <span>
                          Audience:{' '}
                          <span className="capitalize font-medium">
                            {ann.targetAudience?.replace(/_/g, ' ')}
                          </span>
                        </span>
                        <span>
                          By: {ann.sentBy?.firstName} {ann.sentBy?.lastName}
                        </span>
                        <span>
                          {new Date(ann.createdAt).toLocaleDateString()}
                        </span>
                        {ann.expiresAt && (
                          <span className="text-orange-500">
                            Expires:{' '}
                            {new Date(ann.expiresAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleToggleActive(ann)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600"
                      title={ann.isActive ? 'Deactivate' : 'Activate'}
                    >
                      <CheckCircle
                        className={`w-4 h-4 ${ann.isActive ? 'text-green-500' : 'text-gray-300'}`}
                      />
                    </button>
                    <button
                      onClick={() => {
                        setEditTarget(ann);
                        setShowModal(true);
                      }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-purple-600"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(ann._id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <AnnouncementModal
            initial={editTarget}
            onSave={editTarget ? handleEdit : handleCreate}
            onClose={() => {
              setShowModal(false);
              setEditTarget(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Announcements;
