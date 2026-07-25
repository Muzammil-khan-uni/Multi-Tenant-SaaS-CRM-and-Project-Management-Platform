import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, AlertTriangle, RefreshCw } from 'lucide-react';
import { superAdminAPI } from '../../api/superAdmin.api';
import toast from 'react-hot-toast';

const Toggle = ({ checked, onChange, label, description }) => (
  <div className="flex items-start justify-between py-3">
    <div className="flex-1 pr-6">
      <p className="text-sm font-medium text-gray-900 dark:text-white">
        {label}
      </p>
      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {description}
        </p>
      )}
    </div>
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex w-11 h-6 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${
        checked ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-700'
      }`}
    >
      <span
        className={`inline-block w-4 h-4 mt-1 ml-1 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

const PlatformSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await superAdminAPI.getSettings();
      setSettings(res.data.data);
      setDirty(false);
    } catch {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSettings();
  }, [fetchSettings]);

  const update = (key, value) => {
    setSettings((s) => ({ ...s, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await superAdminAPI.updateSettings(settings);
      toast.success('Platform settings saved');
      setDirty(false);
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-purple-500" />
            Platform Settings
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Configure global platform behaviour
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchSettings}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </button>
        </div>
      </div>

      {dirty && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-700 dark:text-amber-300 text-sm"
        >
          <AlertTriangle className="w-4 h-4" />
          You have unsaved changes
        </motion.div>
      )}

      {/* General */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
          General
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Platform Name
            </label>
            <input
              type="text"
              value={settings.platformName || ''}
              onChange={(e) => update('platformName', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Support Email
            </label>
            <input
              type="email"
              value={settings.supportEmail || ''}
              onChange={(e) => update('supportEmail', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Default Plan for New Workspaces
            </label>
            <select
              value={settings.defaultPlan || 'free'}
              onChange={(e) => update('defaultPlan', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              {['free', 'starter', 'professional', 'enterprise'].map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Max Workspaces per User
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={settings.maxWorkspacesPerUser || 10}
              onChange={(e) =>
                update('maxWorkspacesPerUser', Number(e.target.value))
              }
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Max File Upload Size (MB)
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={settings.maxFileUploadSizeMB || 10}
              onChange={(e) =>
                update('maxFileUploadSizeMB', Number(e.target.value))
              }
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
          Feature Toggles
        </h3>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          <Toggle
            checked={settings.registrationEnabled}
            onChange={(v) => update('registrationEnabled', v)}
            label="User Registration"
            description="Allow new users to self-register on the platform"
          />
          <Toggle
            checked={settings.emailNotificationsEnabled}
            onChange={(v) => update('emailNotificationsEnabled', v)}
            label="Email Notifications"
            description="Send transactional emails for invitations, alerts, etc."
          />
        </div>
      </div>

      {/* Maintenance Mode */}
      <div
        className={`bg-white dark:bg-gray-800 rounded-xl border p-5 ${settings.maintenanceMode ? 'border-orange-300 dark:border-orange-700' : 'border-gray-200 dark:border-gray-700'}`}
      >
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <AlertTriangle
            className={`w-4 h-4 ${settings.maintenanceMode ? 'text-orange-500' : 'text-gray-400'}`}
          />
          Maintenance Mode
        </h3>
        <div className="space-y-3">
          <Toggle
            checked={settings.maintenanceMode}
            onChange={(v) => update('maintenanceMode', v)}
            label="Enable Maintenance Mode"
            description="When enabled, all workspace users will see a maintenance notice"
          />
          {settings.maintenanceMode && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Maintenance Message
              </label>
              <textarea
                value={settings.maintenanceMessage || ''}
                onChange={(e) => update('maintenanceMessage', e.target.value)}
                rows={3}
                placeholder="We are performing scheduled maintenance. We'll be back shortly."
                className="w-full px-3 py-2 text-sm border border-orange-300 dark:border-orange-700 rounded-lg bg-orange-50 dark:bg-orange-900/10 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlatformSettings;
