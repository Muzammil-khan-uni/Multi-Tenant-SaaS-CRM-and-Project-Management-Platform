import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2,
  Search,
  CheckCircle,
  XCircle,
  Eye,
  Ban,
  RefreshCw,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { superAdminAPI } from '../../api/superAdmin.api';
import toast from 'react-hot-toast';

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
];

const PLAN_OPTIONS = [
  { value: '', label: 'All Plans' },
  { value: 'free', label: 'Free' },
  { value: 'starter', label: 'Starter' },
  { value: 'professional', label: 'Professional' },
  { value: 'enterprise', label: 'Enterprise' },
];

const planColor = {
  enterprise:
    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  professional:
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  starter:
    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  free: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

const WorkspacesList = () => {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [setActionLoading] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [plan, setPlan] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const limit = 15;

  const fetchWorkspaces = useCallback(async () => {
    try {
      setLoading(true);
      const res = await superAdminAPI.getAllWorkspaces({
        search,
        status,
        plan,
        page,
        limit,
      });
      setWorkspaces(res.data.data);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch {
      toast.error('Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  }, [search, status, plan, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const handleAction = async (action, workspaceId, workspaceName) => {
    setActionLoading(workspaceId + action);
    setOpenMenu(null);
    try {
      if (action === 'approve') {
        await superAdminAPI.approveWorkspace(workspaceId);
        toast.success(`${workspaceName} approved`);
      } else if (action === 'suspend') {
        await superAdminAPI.suspendWorkspace(workspaceId);
        toast.success(`${workspaceName} suspended`);
      } else if (action === 'reactivate') {
        await superAdminAPI.reactivateWorkspace(workspaceId);
        toast.success(`${workspaceName} reactivated`);
      } else if (action === 'delete') {
        if (
          !window.confirm(
            `Permanently delete "${workspaceName}"? This cannot be undone.`
          )
        )
          return;
        await superAdminAPI.deleteWorkspace(workspaceId);
        toast.success(`${workspaceName} deleted`);
      }
      fetchWorkspaces();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            All Workspaces
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {total} total tenants on the platform
          </p>
        </div>
        <button
          onClick={fetchWorkspaces}
          className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={handleSearch}
            placeholder="Search workspaces…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
        >
          {STATUS_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={plan}
          onChange={(e) => {
            setPlan(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
        >
          {PLAN_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto" />
          </div>
        ) : workspaces.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No workspaces found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Workspace
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Owner
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Members
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {workspaces.map((ws, i) => (
                  <motion.tr
                    key={ws._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xs font-bold text-purple-600 dark:text-purple-300">
                          {ws.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {ws.name}
                          </p>
                          <p className="text-xs text-gray-400">{ws.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {ws.owner
                        ? `${ws.owner.firstName} ${ws.owner.lastName}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${planColor[ws.plan] || planColor.free}`}
                      >
                        {ws.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {ws.memberCount ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          ws.isActive
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                        }`}
                      >
                        {ws.isActive ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {ws.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(ws.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative flex items-center gap-1">
                        <button
                          onClick={() =>
                            navigate(`/super-admin/workspaces/${ws._id}`)
                          }
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-purple-600"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            setOpenMenu(openMenu === ws._id ? null : ws._id)
                          }
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {openMenu === ws._id && (
                          <div className="absolute right-0 top-8 z-20 w-44 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1">
                            {!ws.isVerified && (
                              <button
                                onClick={() =>
                                  handleAction('approve', ws._id, ws.name)
                                }
                                className="w-full text-left px-3 py-2 text-sm text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-2"
                              >
                                <CheckCircle className="w-4 h-4" /> Approve
                              </button>
                            )}
                            {ws.isActive ? (
                              <button
                                onClick={() =>
                                  handleAction('suspend', ws._id, ws.name)
                                }
                                className="w-full text-left px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 flex items-center gap-2"
                              >
                                <Ban className="w-4 h-4" /> Suspend
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  handleAction('reactivate', ws._id, ws.name)
                                }
                                className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2"
                              >
                                <RefreshCw className="w-4 h-4" /> Reactivate
                              </button>
                            )}
                            <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                            <button
                              onClick={() =>
                                handleAction('delete', ws._id, ws.name)
                              }
                              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                            >
                              <XCircle className="w-4 h-4" /> Delete Permanently
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of{' '}
            {total}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded font-medium">
              {page} / {pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspacesList;
