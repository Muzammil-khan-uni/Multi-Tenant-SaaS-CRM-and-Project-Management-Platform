import { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Mail,
  MessageSquare,
  CheckSquare,
  FolderKanban,
  DollarSign,
  Users,
  FileText,
  Save,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import axios from '../../api/axios';
import socketService from '../../services/socketManager';
import toast from 'react-hot-toast';

const notificationGroups = [
  {
    title: 'Email Notifications',
    icon: Mail,
    description: 'Receive notifications via email',
    settings: [
      {
        key: 'emailTaskAssigned',
        label: 'Task Assigned',
        desc: 'When someone assigns you a task',
        icon: CheckSquare,
      },
      {
        key: 'emailProjectUpdate',
        label: 'Project Updates',
        desc: 'When projects are updated',
        icon: FolderKanban,
      },
      {
        key: 'emailInvoiceGenerated',
        label: 'Invoice Generated',
        desc: 'When new invoices are created',
        icon: FileText,
      },
      {
        key: 'emailPaymentReceived',
        label: 'Payment Received',
        desc: 'When payments are recorded',
        icon: DollarSign,
      },
      {
        key: 'emailTeamChanges',
        label: 'Team Changes',
        desc: 'When members join or leave',
        icon: Users,
      },
      {
        key: 'emailWeeklyDigest',
        label: 'Weekly Digest',
        desc: 'Weekly summary of all activity',
        icon: Mail,
      },
    ],
  },
  {
    title: 'In-App Notifications',
    icon: Bell,
    description: 'Real-time notifications in the app',
    settings: [
      {
        key: 'inAppTaskAssigned',
        label: 'Task Assigned',
        desc: 'When someone assigns you a task',
        icon: CheckSquare,
      },
      {
        key: 'inAppProjectUpdate',
        label: 'Project Updates',
        desc: 'When projects are updated',
        icon: FolderKanban,
      },
      {
        key: 'inAppComment',
        label: 'Comments',
        desc: 'When someone comments on your tasks',
        icon: MessageSquare,
      },
      {
        key: 'inAppMention',
        label: 'Mentions',
        desc: 'When someone @mentions you',
        icon: MessageSquare,
      },
      {
        key: 'inAppInvoice',
        label: 'Invoice Updates',
        desc: 'Invoice status changes',
        icon: FileText,
      },
    ],
  },
  {
    title: 'Push Notifications',
    icon: Volume2,
    description: 'Browser push notifications',
    settings: [
      {
        key: 'pushTaskAssigned',
        label: 'Task Assigned',
        desc: 'When someone assigns you a task',
        icon: CheckSquare,
      },
      {
        key: 'pushComment',
        label: 'Comments',
        desc: 'When someone comments on your tasks',
        icon: MessageSquare,
      },
      {
        key: 'pushMention',
        label: 'Mentions',
        desc: 'When someone @mentions you',
        icon: MessageSquare,
      },
    ],
  },
];

const getDefaultSettings = () => ({
  emailTaskAssigned: true,
  emailProjectUpdate: true,
  emailInvoiceGenerated: true,
  emailPaymentReceived: true,
  emailTeamChanges: false,
  emailWeeklyDigest: false,
  inAppTaskAssigned: true,
  inAppProjectUpdate: true,
  inAppComment: true,
  inAppMention: true,
  inAppInvoice: false,
  pushTaskAssigned: true,
  pushComment: true,
  pushMention: true,
  muteAll: false,
});

const NotificationSettings = () => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/notifications/settings');
      if (data.success && data.data) {
        setSettings(data.data);
      } else {
        setSettings(getDefaultSettings());
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
      const saved = localStorage.getItem('notificationSettings');
      if (saved) {
        try {
          setSettings(JSON.parse(saved));
        } catch {
          setSettings(getDefaultSettings());
        }
      } else {
        setSettings(getDefaultSettings());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  if (!initialized) {
    setInitialized(true);
    loadSettings();
  }

  const handleToggle = (key) => {
    setSettings((prev) => {
      const updated = { ...prev, [key]: !prev[key] };

      if (key === 'muteAll' && updated.muteAll) {
        Object.keys(updated).forEach((k) => {
          if (k !== 'muteAll') updated[k] = false;
        });
      }

      if (key !== 'muteAll' && updated[key]) {
        updated.muteAll = false;
      }
      return updated;
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await axios.put('/notifications/settings', settings);
      if (data.success) {
        localStorage.setItem('notificationSettings', JSON.stringify(settings));
        toast.success('Notification settings saved');
        setHasChanges(false);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);

      localStorage.setItem('notificationSettings', JSON.stringify(settings));
      toast.success('Settings saved locally');
      setHasChanges(false);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (settings.muteAll) {
      socketService.removeAllListeners();
    } else if (!settings.muteAll && initialized) {
      socketService.connect();
    }
  }, [settings.muteAll, initialized]);

  const handleReset = () => {
    setSettings(getDefaultSettings());
    setHasChanges(true);
    toast.success('Settings reset to defaults');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent>
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                {[1, 2, 3].map((j) => (
                  <div
                    key={j}
                    className="h-10 bg-gray-100 dark:bg-gray-800 rounded"
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Notification Preferences{' '}
            <Badge variant="primary" size="sm">
              Available in future updates
            </Badge>
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Control how and when you receive notifications
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleReset}>
            Reset to Default
          </Button>
          <Button
            onClick={handleSave}
            icon={Save}
            loading={saving}
            disabled={!hasChanges}
          >
            {hasChanges ? 'Save Changes' : 'Saved'}
          </Button>
        </div>
      </div>

      {/* Mute All Toggle */}
      <Card
        className={`border-2 transition-all ${settings.muteAll ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10' : ''}`}
      >
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  settings.muteAll
                    ? 'bg-red-100 dark:bg-red-900/30'
                    : 'bg-gray-100 dark:bg-gray-700'
                }`}
              >
                {settings.muteAll ? (
                  <VolumeX className="w-5 h-5 text-red-600" />
                ) : (
                  <Volume2 className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  Mute All Notifications
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Temporarily disable all notifications
                </p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('muteAll')}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                settings.muteAll ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                  settings.muteAll ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          {settings.muteAll && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-3 flex items-center gap-1">
              <VolumeX className="w-3 h-3" />
              All notifications are currently muted. Toggle off to re-enable.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Notification Groups */}
      {notificationGroups.map((group, groupIndex) => {
        const GroupIcon = group.icon;
        const enabledCount = group.settings.filter(
          (s) => settings[s.key]
        ).length;
        const totalCount = group.settings.length;

        return (
          <Card
            key={groupIndex}
            className={settings.muteAll ? 'opacity-50 pointer-events-none' : ''}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center">
                    <GroupIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <CardTitle>{group.title}</CardTitle>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {group.description}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    enabledCount === totalCount
                      ? 'green'
                      : enabledCount > 0
                        ? 'blue'
                        : 'gray'
                  }
                  size="sm"
                >
                  {enabledCount}/{totalCount} active
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {group.settings.map(({ key, label, desc, icon: Icon }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          settings[key]
                            ? 'bg-primary-100 dark:bg-primary-900/20'
                            : 'bg-gray-100 dark:bg-gray-700'
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 ${
                            settings[key]
                              ? 'text-primary-600 dark:text-primary-400'
                              : 'text-gray-400'
                          }`}
                        />
                      </div>
                      <div>
                        <p
                          className={`text-sm font-medium ${
                            settings[key]
                              ? 'text-gray-900 dark:text-white'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {label}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {desc}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggle(key)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        settings[key]
                          ? 'bg-primary-600'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                          settings[key] ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Save Bar */}
      <AnimatePresence>
        {hasChanges && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center gap-4 z-50"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                You have unsaved changes
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={handleReset}>
                Discard
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                icon={Save}
                loading={saving}
              >
                Save Changes
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

import { motion, AnimatePresence } from 'framer-motion';

export default NotificationSettings;
