import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Check, ChevronDown, Plus, Loader } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/axios';
import {
  setCredentials,
  setUser,
  setWorkspace,
} from '../../store/slices/authSlice';
import { Avatar } from './Avatar';
import { Badge } from './Badge';
import toast from 'react-hot-toast';

// ─── Role display ─────────────────────────────────────────────────────────────

const roleLabel = (role) =>
  role
    ? role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Member';

const roleVariant = (role) => {
  if (role === 'owner' || role === 'company_admin') return 'purple';
  if (role === 'project_manager' || role === 'team_lead') return 'blue';
  return 'gray';
};

// ─── Component ────────────────────────────────────────────────────────────────

const WorkspaceSwitcher = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { workspace: currentWorkspace, user } = useSelector(
    (state) => state.auth
  );

  const [isOpen, setIsOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [switchingId, setSwitchingId] = useState(null);

  // ── Load workspace list when dropdown opens ──────────────────────────────────
  const loadWorkspaces = async () => {
    setLoadingList(true);
    try {
      const { data } = await apiClient.get('/auth/my-workspaces');
      setWorkspaces(data.data.workspaces || []);
    } catch {
      toast.error('Could not load workspaces');
    } finally {
      setLoadingList(false);
    }
  };

  const handleToggle = () => {
    const opening = !isOpen;
    setIsOpen(opening);
    if (opening) loadWorkspaces();
  };

  // ── Switch workspace ──────────────────────────────────────────────────────────
  const handleSwitch = async (ws) => {
    if (ws._id === currentWorkspace?._id) {
      setIsOpen(false);
      return;
    }

    setSwitchingId(ws._id);
    try {
      const { data } = await apiClient.post('/auth/switch-workspace', {
        workspaceId: ws._id,
      });

      const {
        user: newUser,
        workspace: newWs,
        accessToken,
        refreshToken,
      } = data.data;

      // Persist data to localStorage
      localStorage.setItem('workspaceSlug', newWs.slug);
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      // Update Redux store
      dispatch(setCredentials({ accessToken, refreshToken }));
      dispatch(setUser(newUser));
      dispatch(setWorkspace(newWs));

      toast.success(`Switched to ${newWs.name}`);
      setIsOpen(false);
      setSwitchingId(null);

      // Force complete page reload to ensure all components update
      navigate(`/${newWs.slug}/dashboard`, { replace: true });
      window.location.reload();
    } catch {
      toast.error('Failed to switch workspace');
      setSwitchingId(null);
    }
  };

  // ── Current workspace role (shown under name in trigger) ─────────────────────
  const currentRole = user?.role || user?.workspaceData?.role;

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        onClick={handleToggle}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-full"
      >
        {currentWorkspace?.branding?.logo?.url ? (
          <img
            src={currentWorkspace.branding.logo.url}
            alt={currentWorkspace.name}
            className="w-8 h-8 rounded-lg object-contain flex-shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          </div>
        )}
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-semibold truncate text-gray-900 dark:text-white">
            {currentWorkspace?.name || 'Select Workspace'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {roleLabel(currentRole)}
          </p>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop to close on outside click */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              className="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="px-3 pt-2 pb-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Your Workspaces
                </p>
              </div>

              {/* Workspace list */}
              <div className="p-1.5 max-h-64 overflow-y-auto">
                {loadingList ? (
                  <div className="flex items-center justify-center py-4 text-gray-400">
                    <Loader className="w-4 h-4 animate-spin mr-2" />
                    <span className="text-sm">Loading…</span>
                  </div>
                ) : workspaces.length === 0 ? (
                  <p className="text-sm text-gray-400 px-3 py-2">
                    No workspaces found
                  </p>
                ) : (
                  workspaces.map((ws) => {
                    const isActive = ws._id === currentWorkspace?._id;
                    const isSwitching = switchingId === ws._id;

                    return (
                      <button
                        key={ws._id}
                        onClick={() => handleSwitch(ws)}
                        disabled={!!switchingId}
                        className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-colors text-left ${
                          isActive
                            ? 'bg-primary-50 dark:bg-primary-900/20'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        } disabled:opacity-60`}
                      >
                        {ws.logo ? (
                          <img
                            src={ws.logo}
                            alt={ws.name}
                            className="w-8 h-8 rounded-lg object-contain flex-shrink-0"
                          />
                        ) : (
                          <Avatar name={ws.name} size="sm" />
                        )}

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate text-gray-900 dark:text-white">
                            {ws.name}
                          </p>
                          <Badge variant={roleVariant(ws.role)} size="sm">
                            {roleLabel(ws.role)}
                          </Badge>
                        </div>

                        {isSwitching ? (
                          <Loader className="w-4 h-4 text-primary-500 animate-spin flex-shrink-0" />
                        ) : isActive ? (
                          <Check className="w-4 h-4 text-primary-600 flex-shrink-0" />
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Footer: create new workspace */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-1.5">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    navigate(
                      currentWorkspace?.slug
                        ? `/${currentWorkspace.slug}/workspaces/create`
                        : '/select-workspace'
                    );
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create New Workspace
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WorkspaceSwitcher;
