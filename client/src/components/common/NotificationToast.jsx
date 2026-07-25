import { X, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { withWorkspaceSlug } from '../../utils/workspacePath';

const notificationConfig = {
  task_assigned: {
    icon: '📋',
    color: '#3b82f6',
    bgLight: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-700',
    iconBg: 'bg-blue-100 dark:bg-blue-800',
  },
  task_updated: {
    icon: '🔄',
    color: '#8b5cf6',
    bgLight: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-700',
    iconBg: 'bg-purple-100 dark:bg-purple-800',
  },
  mention: {
    icon: '💬',
    color: '#ec4899',
    bgLight: 'bg-pink-50 dark:bg-pink-900/20',
    borderColor: 'border-pink-200 dark:border-pink-700',
    iconBg: 'bg-pink-100 dark:bg-pink-800',
  },
  project_assignment: {
    icon: '📁',
    color: '#10b981',
    bgLight: 'bg-emerald-50 dark:bg-emerald-900/20',
    borderColor: 'border-emerald-200 dark:border-emerald-700',
    iconBg: 'bg-emerald-100 dark:bg-emerald-800',
  },
  project_update: {
    icon: '📊',
    color: '#f59e0b',
    bgLight: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-200 dark:border-amber-700',
    iconBg: 'bg-amber-100 dark:bg-amber-800',
  },
  invoice_generated: {
    icon: '📄',
    color: '#06b6d4',
    bgLight: 'bg-cyan-50 dark:bg-cyan-900/20',
    borderColor: 'border-cyan-200 dark:border-cyan-700',
    iconBg: 'bg-cyan-100 dark:bg-cyan-800',
  },
  payment_received: {
    icon: '💰',
    color: '#22c55e',
    bgLight: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-700',
    iconBg: 'bg-green-100 dark:bg-green-800',
  },
  comment: {
    icon: '💭',
    color: '#6366f1',
    bgLight: 'bg-indigo-50 dark:bg-indigo-900/20',
    borderColor: 'border-indigo-200 dark:border-indigo-700',
    iconBg: 'bg-indigo-100 dark:bg-indigo-800',
  },
  default: {
    icon: '🔔',
    color: '#6b7280',
    bgLight: 'bg-gray-50 dark:bg-gray-800',
    borderColor: 'border-gray-200 dark:border-gray-700',
    iconBg: 'bg-gray-100 dark:bg-gray-700',
  },
};

const NotificationToast = ({ t, notification }) => {
  const workspaceSlug = useSelector((state) => state.auth.workspace?.slug);
  const config =
    notificationConfig[notification.type] || notificationConfig.default;

  return (
    <div className="max-w-md w-full pointer-events-auto">
      <div
        className={`relative overflow-hidden rounded-2xl border-2 ${config.borderColor} bg-white dark:bg-gray-800 shadow-2xl`}
      >
        {/* Subtle Gradient Overlay */}
        <div className={`absolute inset-0 ${config.bgLight} opacity-50`} />

        {/* Progress Bar */}
        <div
          className="absolute bottom-0 left-0 h-1 rounded-full"
          style={{
            animation: 'shrink 4s linear forwards',
            width: '100%',
            backgroundColor: config.color,
            opacity: 0.6,
          }}
        />

        {/* Content */}
        <div className="relative p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div
              className={`relative flex-shrink-0 w-11 h-11 rounded-xl ${config.iconBg} flex items-center justify-center text-2xl shadow-sm`}
            >
              <span>{config.icon}</span>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: config.color + '15',
                    color: config.color,
                    border: `1px solid ${config.color}30`,
                  }}
                >
                  {notification.type?.replace(/_/g, ' ') || 'Notification'}
                </span>
                <span className="text-xs text-gray-400">just now</span>
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                {notification.title}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                {notification.message}
              </p>
              {notification.sender && (
                <div className="flex items-center gap-2 mt-2">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundColor: config.color + '20',
                      color: config.color,
                    }}
                  >
                    {notification.sender.firstName?.[0]}
                    {notification.sender.lastName?.[0]}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {notification.sender.firstName}{' '}
                    {notification.sender.lastName}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
              </button>
              {notification.metadata?.taskId && (
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                    window.location.href = withWorkspaceSlug(
                      `/tasks/${notification.metadata.taskId}`,
                      workspaceSlug
                    );
                  }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="View Task"
                >
                  <ChevronRight className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                </button>
              )}
              {notification.metadata?.projectId && (
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                    window.location.href = withWorkspaceSlug(
                      `/projects/${notification.metadata.projectId}`,
                      workspaceSlug
                    );
                  }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="View Project"
                >
                  <ChevronRight className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationToast;
