import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Users,
  FolderKanban,
  CheckSquare,
  FileText,
  Ban,
  CheckCircle,
  RefreshCw,
  Trash2,
  Calendar,
  Globe,
  Mail,
  Crown,
} from 'lucide-react';
import { superAdminAPI } from '../../api/superAdmin.api';
import toast from 'react-hot-toast';

const PLANS = ['free', 'starter', 'professional', 'enterprise'];

const WorkspaceDetail = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await superAdminAPI.getWorkspaceById(workspaceId);
      setData(res.data.data);
      setSelectedPlan(res.data.data.plan);
    } catch {
      toast.error('Failed to load workspace');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const handleAction = async (action) => {
    setActionLoading(action);
    try {
      if (action === 'approve') {
        await superAdminAPI.approveWorkspace(workspaceId);
        toast.success('Workspace approved');
      } else if (action === 'suspend') {
        await superAdminAPI.suspendWorkspace(workspaceId);
        toast.success('Workspace suspended');
      } else if (action === 'reactivate') {
        await superAdminAPI.reactivateWorkspace(workspaceId);
        toast.success('Workspace reactivated');
      } else if (action === 'plan') {
        await superAdminAPI.updateWorkspacePlan(workspaceId, selectedPlan);
        toast.success('Plan updated');
      } else if (action === 'delete') {
        if (
          !window.confirm(
            'Permanently delete this workspace? This cannot be undone.'
          )
        )
          return;
        await superAdminAPI.deleteWorkspace(workspaceId);
        toast.success('Workspace deleted');
        navigate('/super-admin/workspaces');
        return;
      }
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) return null;

  const stats = data.stats || {};
  const ws = data;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back + header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/super-admin/workspaces')}
          className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-500" />
            {ws.name}
          </h1>
          <p className="text-sm text-gray-400">
            {ws.slug} · {ws.industry?.replace(/_/g, ' ') || 'No industry set'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${ws.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
          >
            {ws.isActive ? 'Active' : 'Suspended'}
          </span>
          {ws.isVerified && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
              Verified
            </span>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: Users,
            label: 'Members',
            value: stats.memberCount,
            color: 'text-blue-500',
          },
          {
            icon: FolderKanban,
            label: 'Projects',
            value: stats.projectCount,
            color: 'text-green-500',
          },
          {
            icon: CheckSquare,
            label: 'Tasks',
            value: stats.taskCount,
            color: 'text-orange-500',
          },
          {
            icon: FileText,
            label: 'Invoices',
            value: stats.invoiceCount,
            color: 'text-purple-500',
          },
        ].map(({ icon: Icon, label, value, color }) => (
          <div
            key={label}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
          >
            <Icon className={`w-5 h-5 ${color} mb-2`} />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {value ?? '—'}
            </p>
            <p className="text-xs text-gray-400">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workspace Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Workspace Info
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Crown className="w-4 h-4 text-yellow-500 mt-0.5" />
              <div>
                <p className="text-gray-500">Owner</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {ws.owner
                    ? `${ws.owner.firstName} ${ws.owner.lastName}`
                    : '—'}
                </p>
                <p className="text-gray-400 text-xs">{ws.owner?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-gray-500">Created</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {new Date(ws.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
            {ws.company?.email && (
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-gray-500">Company Email</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {ws.company.email}
                  </p>
                </div>
              </div>
            )}
            {ws.company?.website && (
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-gray-500">Website</p>
                  <a
                    href={ws.company.website}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-purple-600 hover:underline"
                  >
                    {ws.company.website}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Admin Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Admin Actions
          </h3>

          {/* Plan Change */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 font-medium">
              Subscription Plan
            </label>
            <div className="flex gap-2">
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {PLANS.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleAction('plan')}
                disabled={selectedPlan === ws.plan || actionLoading === 'plan'}
                className="px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                Update
              </button>
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-2">
            {!ws.isVerified && (
              <button
                onClick={() => handleAction('approve')}
                disabled={!!actionLoading}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                Approve &amp; Verify Workspace
              </button>
            )}
            {ws.isActive ? (
              <button
                onClick={() => handleAction('suspend')}
                disabled={!!actionLoading}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-orange-700 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-300 rounded-lg hover:bg-orange-100 disabled:opacity-50"
              >
                <Ban className="w-4 h-4" />
                Suspend Workspace
              </button>
            ) : (
              <button
                onClick={() => handleAction('reactivate')}
                disabled={!!actionLoading}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300 rounded-lg hover:bg-blue-100 disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" />
                Reactivate Workspace
              </button>
            )}
            <button
              onClick={() => handleAction('delete')}
              disabled={!!actionLoading}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-300 rounded-lg hover:bg-red-100 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Delete Permanently
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
          Recent Activity
        </h3>
        {!data.recentActivity || data.recentActivity.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            No recent activity
          </p>
        ) : (
          <div className="space-y-2">
            {data.recentActivity.map((log) => (
              <div
                key={log._id}
                className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xs font-bold text-purple-700">
                    {log.performedBy?.firstName?.[0] || '?'}
                  </div>
                  <div>
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      <span className="font-medium">
                        {log.performedBy?.firstName} {log.performedBy?.lastName}
                      </span>{' '}
                      <span className="text-gray-500">
                        {log.action} {log.entity}
                      </span>
                    </p>
                    {log.description && (
                      <p className="text-xs text-gray-400">{log.description}</p>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0 ml-4">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkspaceDetail;
