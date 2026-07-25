import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Globe,
  Database,
  Shield,
  CheckCircle,
  ChevronRight,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardContent } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';

import GeneralSettings from './GeneralSettings';
import SecuritySettings from './SecuritySettings';
import NotificationSettings from './NotificationSettings';
import DataSettings from './DataSettings';

const tabs = [
  {
    id: 'general',
    label: 'General',
    icon: Globe,
    component: GeneralSettings,
    description: 'Workspace name, timezone, currency and date preferences',
    color: 'blue',
  },
  {
    id: 'security',
    label: 'Security',
    icon: Shield,
    component: SecuritySettings,
    description: 'Password management and authentication settings',
    color: 'red',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    component: NotificationSettings,
    description: 'Configure how and when you receive alerts',
    color: 'green',
  },
  {
    id: 'data',
    label: 'Data',
    icon: Database,
    component: DataSettings,
    description: 'Export your data or manage workspace lifecycle',
    color: 'gray',
  },
];

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [hoveredTab, setHoveredTab] = useState(null);

  const activeTabConfig = tabs.find((t) => t.id === activeTab);
  const ActiveComponent = activeTabConfig?.component;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your workspace preferences and configurations"
      />

      {/* Settings Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {tabs.map(({ id, label, icon: Icon, description, color }) => {
          const isActive = activeTab === id;
          const isHovered = hoveredTab === id;

          return (
            <motion.button
              key={id}
              onClick={() => setActiveTab(id)}
              onMouseEnter={() => setHoveredTab(id)}
              onMouseLeave={() => setHoveredTab(null)}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={`relative p-5 rounded-xl border-2 transition-all text-left overflow-hidden group ${
                isActive
                  ? `border-${color}-500 bg-gradient-to-br from-${color}-50 to-${color}-100 dark:from-${color}-900/20 dark:to-${color}-800/20 shadow-lg shadow-${color}-500/10`
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
              }`}
            >
              {/* Background Pattern */}
              <div className="absolute top-0 right-0 w-20 h-20 opacity-5">
                <Icon className="w-full h-full" />
              </div>

              {/* Active Indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className={`absolute top-3 right-3 w-2 h-2 rounded-full bg-${color}-500`}
                />
              )}

              {/* Icon Container */}
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-all ${
                  isActive
                    ? `bg-${color}-500 text-white shadow-lg shadow-${color}-500/30`
                    : `bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 group-hover:bg-${color}-100 dark:group-hover:bg-${color}-900/30 group-hover:text-${color}-600`
                }`}
              >
                <Icon className="w-6 h-6" />
              </div>

              {/* Label & Description */}
              <h3
                className={`font-semibold text-sm mb-1 transition-colors ${
                  isActive
                    ? `text-${color}-700 dark:text-${color}-300`
                    : 'text-gray-900 dark:text-white'
                }`}
              >
                {label}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                {description}
              </p>

              {/* Hover Arrow */}
              <motion.div
                animate={{
                  opacity: isHovered && !isActive ? 1 : 0,
                  x: isHovered && !isActive ? 0 : -10,
                }}
                className="absolute bottom-3 right-3"
              >
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </motion.div>

              {/* Active Check */}
              {isActive && (
                <div
                  className={`absolute bottom-3 right-3 w-5 h-5 rounded-full bg-${color}-500 flex items-center justify-center`}
                >
                  <CheckCircle className="w-3 h-3 text-white" />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Active Section Info */}
      <AnimatePresence mode="wait">
        {activeTabConfig && (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-1"
          >
            <div
              className={`w-1 h-6 rounded-full bg-${activeTabConfig.color}-500`}
            />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {activeTabConfig.label} Settings
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {activeTabConfig.description}
              </p>
            </div>
            <Badge
              variant={activeTabConfig.color}
              size="sm"
              className="ml-auto"
            >
              {tabs.findIndex((t) => t.id === activeTab) + 1} of {tabs.length}
            </Badge>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {ActiveComponent && <ActiveComponent />}
        </motion.div>
      </AnimatePresence>

      {/* Quick Actions Footer */}
      <Card>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Need help?
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Contact support or check our documentation
              </p>
            </div>
            <div className="flex gap-2">
              <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                Documentation
              </button>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                Support
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
