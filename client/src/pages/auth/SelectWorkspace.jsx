import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2,
  ChevronRight,
  Shield,
  Users,
  Briefcase,
  LogOut,
} from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../hooks/useAuth';

const roleIcons = {
  owner: Shield,
  company_admin: Shield,
  project_manager: Briefcase,
  team_lead: Users,
  employee: Users,
  client: Users,
};

const roleColors = {
  owner: 'purple',
  company_admin: 'purple',
  project_manager: 'blue',
  team_lead: 'green',
  employee: 'green',
  client: 'gray',
};

const roleLabels = {
  owner: 'Owner',
  company_admin: 'Company Admin',
  project_manager: 'Project Manager',
  team_lead: 'Team Lead',
  employee: 'Employee',
  client: 'Client',
};

const SelectWorkspace = () => {
  const { user, workspaces, selectWorkspace, cancelWorkspaceSelection } =
    useAuth();
  const [loadingId, setLoadingId] = useState(null);

  if (!workspaces || workspaces.length === 0) {
    return <Navigate to="/login" replace />;
  }

  const handleSelect = async (workspaceId) => {
    if (loadingId) return; // prevent double-click
    setLoadingId(workspaceId);
    try {
      await selectWorkspace(workspaceId);
    } catch {
      setLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/50 mb-4">
            <Building2 className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Choose a Workspace
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {user?.firstName ? `Welcome back, ${user.firstName}! ` : ''}
            You have access to {workspaces.length} workspace
            {workspaces.length !== 1 ? 's' : ''}.
          </p>
        </div>

        {/* Workspace cards */}
        <div className="grid gap-4">
          {workspaces.map((ws) => {
            const wsId = ws.id || ws._id;
            const isLoading = loadingId === wsId;
            const RoleIcon = roleIcons[ws.role] || Users;

            return (
              <motion.button
                key={wsId}
                whileHover={{ scale: loadingId ? 1 : 1.01 }}
                whileTap={{ scale: loadingId ? 1 : 0.99 }}
                onClick={() => handleSelect(wsId)}
                disabled={!!loadingId}
                className={`w-full text-left group ${
                  loadingId ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md hover:border-primary-200 dark:hover:border-primary-800 transition-all flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Workspace logo / fallback */}
                    <div className="w-12 h-12 rounded-lg bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {ws.branding?.logo?.url ? (
                        <img
                          src={ws.branding.logo.url}
                          alt={ws.name}
                          className="w-8 h-8 object-contain"
                        />
                      ) : (
                        <Building2 className="w-6 h-6 text-gray-400" />
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        {ws.name || 'Unnamed Workspace'}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge variant={roleColors[ws.role] || 'gray'}>
                          <RoleIcon className="w-3 h-3 mr-1 inline" />
                          {roleLabels[ws.role] ||
                            ws.role?.replace(/_/g, ' ') ||
                            'Member'}
                        </Badge>
                        {ws.plan && (
                          <span className="text-xs text-gray-400 capitalize">
                            {ws.plan} plan
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isLoading ? (
                      <div className="animate-spin w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Back to login */}
        <div className="text-center">
          <button
            onClick={cancelWorkspaceSelection}
            disabled={!!loadingId}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectWorkspace;
