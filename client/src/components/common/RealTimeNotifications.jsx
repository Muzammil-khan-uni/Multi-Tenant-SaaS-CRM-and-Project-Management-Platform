import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  X,
  Check,
  MessageSquare,
  UserPlus,
  FolderKanban,
  CheckSquare,
  DollarSign,
  FileText,
} from 'lucide-react';
import socketService from '../../services/socketManager';
import axios from '../../api/axios';
import { formatDistanceToNow } from 'date-fns';

const notificationIcons = {
  task_assigned: CheckSquare,
  task_updated: CheckSquare,
  comment: MessageSquare,
  mention: MessageSquare,
  project_assignment: FolderKanban,
  project_update: FolderKanban,
  invoice_generated: FileText,
  payment_received: DollarSign,
  team_change: UserPlus,
  info: Bell,
};

const notificationColors = {
  task_assigned: 'blue',
  task_updated: 'blue',
  comment: 'purple',
  mention: 'purple',
  project_assignment: 'green',
  project_update: 'green',
  invoice_generated: 'yellow',
  payment_received: 'emerald',
  team_change: 'orange',
  info: 'gray',
};

const RealTimeNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load notifications from API on mount
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/notifications?limit=50');
      if (data.success) {
        const formattedNotifications = (data.data || []).map((n) => ({
          ...n,
          id: n._id,
          read: n.isRead || false,
        }));
        setNotifications(formattedNotifications);
        setUnreadCount(
          data.unreadCount ||
            formattedNotifications.filter((n) => !n.read).length
        );
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  const [initialized, setInitialized] = useState(false);
  if (!initialized) {
    setInitialized(true);
    fetchNotifications();
  }

  // Listen for real-time notifications
  useEffect(() => {
    const cleanup = socketService.onNotification((notification) => {
      setNotifications((prev) => [
        {
          ...notification,
          id: notification.id || notification._id || Date.now().toString(),
          read: false,
        },
        ...prev.slice(0, 49), // Keep last 50
      ]);
      setUnreadCount((prev) => prev + 1);
    });

    return cleanup;
  }, []);

  const markAsRead = async (id) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    // Update on server
    try {
      await axios.put(`/notifications/${id}/read`);
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    // Update on server
    try {
      await axios.put('/notifications/read-all');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const removeNotification = async (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await axios.put(`/notifications/${id}/archive`);
    } catch (error) {
      console.error('Failed to archive notification:', error);
    }
  };

  const displayedNotifications = showAll
    ? notifications
    : notifications.slice(0, 5);

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setShowAll(!showAll)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-1 font-medium animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Panel */}
      <AnimatePresence>
        {showAll && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 text-sm text-gray-500">
                    ({unreadCount} new)
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setShowAll(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Loading State */}
            {loading && notifications.length === 0 && (
              <div className="p-8 text-center">
                <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" />
                <p className="text-sm text-gray-500 mt-2">
                  Loading notifications...
                </p>
              </div>
            )}

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {!loading && notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No notifications yet</p>
                </div>
              ) : (
                displayedNotifications.map((notification) => {
                  const Icon = notificationIcons[notification.type] || Bell;
                  const color = notificationColors[notification.type] || 'gray';

                  return (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700/50 last:border-0 ${
                        !notification.read
                          ? 'bg-blue-50/50 dark:bg-blue-900/10'
                          : ''
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full bg-${color}-100 dark:bg-${color}-900/20 flex items-center justify-center flex-shrink-0`}
                      >
                        <Icon
                          className={`w-4 h-4 text-${color}-600 dark:text-${color}-400`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {notification.message}
                        </p>
                        {notification.sender && (
                          <p className="text-xs text-gray-400 mt-1">
                            {notification.sender.firstName}{' '}
                            {notification.sender.lastName}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatDistanceToNow(
                            new Date(
                              notification.timestamp || notification.createdAt
                            ),
                            { addSuffix: true }
                          )}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                            title="Mark as read"
                          >
                            <Check className="w-3 h-3 text-green-500" />
                          </button>
                        )}
                        <button
                          onClick={() => removeNotification(notification.id)}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                          title="Remove"
                        >
                          <X className="w-3 h-3 text-gray-400" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {notifications.length > 5 && !showAll && (
              <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-center">
                <button
                  onClick={() => setShowAll(true)}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  View all {notifications.length} notifications
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RealTimeNotifications;
