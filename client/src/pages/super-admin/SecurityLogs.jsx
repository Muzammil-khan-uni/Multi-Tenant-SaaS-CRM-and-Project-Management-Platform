import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Activity,
  User,
  Building2,
} from 'lucide-react';
import { superAdminAPI } from '../../api/superAdmin.api';
import toast from 'react-hot-toast';

const ACTION_TYPES = [
  'created',
  'updated',
  'deleted',
  'archived',
  'restored',
  'status_changed',
  'assigned',
  'unassigned',
  'commented',
  'login',
  'logout',
  'password_changed',
  'invited',
  'joined',
  'removed',
  'paid',
  'sent',
  'cancelled',
  'exported',
  'imported',
];

const ENTITIES = [
  'user',
  'workspace',
  'project',
  'task',
  'client',
  'invoice',
  'file',
  'comment',
  'notification',
  'report',
];

const actionColor = {
  created:
    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  updated: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  deleted: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  login:
    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  logout: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  password_changed:
    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  invited:
    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  removed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const SecurityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const limit = 50;

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit };
      if (action) params.action = action;
      if (entity) params.entity = entity;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await superAdminAPI.getLogs(params);
      setLogs(res.data.data);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch {
      toast.error('Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, [action, entity, startDate, endDate, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-500" />
            Security &amp; Activity Logs
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {total.toLocaleString()} total events across all workspaces
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
        >
          <option value="">All Actions</option>
          {ACTION_TYPES.map((a) => (
            <option key={a} value={a}>
              {a.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <select
          value={entity}
          onChange={(e) => {
            setEntity(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
        >
          <option value="">All Entities</option>
          {ENTITIES.map((e) => (
            <option key={e} value={e}>
              {e.charAt(0).toUpperCase() + e.slice(1)}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          placeholder="From"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => {
            setEndDate(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          placeholder="To"
        />
      </div>

      {/* Log Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Activity className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No logs found for these filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Workspace
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Entity
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    IP
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {logs.map((log, i) => (
                  <motion.tr
                    key={log._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.01 }}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30"
                  >
                    <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300 text-xs">
                          {log.performedBy
                            ? `${log.performedBy.firstName} ${log.performedBy.lastName}`
                            : '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-600 dark:text-gray-300 text-xs">
                          {log.workspace?.name || '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${actionColor[log.action] || 'bg-gray-100 text-gray-600'}`}
                      >
                        {log.action?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 capitalize">
                      {log.entity}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 max-w-xs truncate">
                      {log.description || log.entityName || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-400 font-mono">
                      {log.ipAddress || '—'}
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
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded font-medium">
              {page} / {pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityLogs;
