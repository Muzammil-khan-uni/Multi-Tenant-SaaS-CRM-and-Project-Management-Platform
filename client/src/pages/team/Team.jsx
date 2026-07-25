import { useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserPlus,
  Mail,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  UserCheck,
  UserMinus,
  Send,
  Copy,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Avatar } from '../../components/common/Avatar';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { useWorkspace } from '../../hooks/useWorkspace';
import { usePermissions } from '../../hooks/usePermissions';
import axios from '../../api/axios';
import toast from 'react-hot-toast';

const roleLabels = {
  company_admin: 'Company Admin',
  project_manager: 'Project Manager',
  team_lead: 'Team Lead',
  employee: 'Employee',
  client: 'Client',
};

const roleColors = {
  company_admin: 'purple',
  project_manager: 'blue',
  team_lead: 'green',
  employee: 'green',
  client: 'gray',
};

const roleIcons = {
  company_admin: Shield,
  project_manager: UserCheck,
  team_lead: Users,
  employee: Users,
  client: Users,
};

const Team = () => {
  const { inviteMember, removeMember } = useWorkspace();
  const { hasPermission, canManageRole } = usePermissions();
  const currentUser = useSelector((state) => state.auth.user);

  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showTerminateDialog, setShowTerminateDialog] = useState(false);
  const [showInvitations, setShowInvitations] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  const [inviteForm, setInviteForm] = useState({ email: '', role: 'employee' });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [terminateLoading, setTerminateLoading] = useState(false);

  const [initialized, setInitialized] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await axios.get('/workspaces/members');
      setMembers(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load team');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInvitations = useCallback(async () => {
    try {
      const { data } = await axios.get('/workspaces/invitations');
      setInvitations(data.data || []);
    } catch {
      // Silent fail
    }
  }, []);

  if (!initialized) {
    setInitialized(true);
    fetchMembers();
    fetchInvitations();
  }

  const filteredMembers = members.filter((member) => {
    const name =
      `${member.firstName || ''} ${member.lastName || ''}`.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      name.includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && member.isActive) ||
      (statusFilter === 'inactive' && !member.isActive);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const activeMembers = members.filter((m) => m.isActive).length;
  const pendingInvitations = invitations.length;
  const totalTeam = members.length;

  const assignableRoles = [
    { value: 'company_admin', label: 'Company Admin' },
    { value: 'project_manager', label: 'Project Manager' },
    { value: 'team_lead', label: 'Team Lead' },
    { value: 'employee', label: 'Employee' },
    { value: 'client', label: 'Client' },
  ].filter((role) => canManageRole(role.value));

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteForm.email) return;
    setInviteLoading(true);
    try {
      await inviteMember(inviteForm.email, inviteForm.role);
      setShowInviteModal(false);
      setInviteForm({ email: '', role: 'employee' });
      fetchMembers();
      fetchInvitations();
    } catch {
      // Error handled in hook
    } finally {
      setInviteLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedMember) return;
    setDeleteLoading(true);
    try {
      await removeMember(selectedMember._id);
      toast.success(
        `${selectedMember.firstName} ${selectedMember.lastName} permanently deleted`
      );
      setShowDeleteDialog(false);
      setSelectedMember(null);
      fetchMembers();
    } catch {
      toast.error('Failed to delete member');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleTerminate = async () => {
    if (!selectedMember) return;
    setTerminateLoading(true);
    try {
      await axios.put(`/workspaces/members/${selectedMember._id}/terminate`);
      toast.success(
        `${selectedMember.firstName} ${selectedMember.lastName} terminated`
      );
      setShowTerminateDialog(false);
      setSelectedMember(null);
      fetchMembers();
    } catch {
      toast.error('Failed to terminate member');
    } finally {
      setTerminateLoading(false);
    }
  };

  const handleReactivate = async (memberId) => {
    try {
      await axios.put(`/workspaces/members/${memberId}/reactivate`);
      toast.success('Member reactivated');
      fetchMembers();
    } catch {
      toast.error('Failed to reactivate');
    }
  };

  const handleCopyInviteLink = (token) => {
    const link = `${window.location.origin}/join/${token}`;
    navigator.clipboard.writeText(link);
    toast.success('Invitation link copied!');
  };

  const handleResendInvitation = async (invitationId) => {
    try {
      await axios.post(`/workspaces/invitations/${invitationId}/resend`);
      toast.success('Invitation resent');
      fetchInvitations();
    } catch {
      toast.error('Failed to resend');
    }
  };

  const handleCancelInvitation = async (invitationId) => {
    try {
      await axios.delete(`/workspaces/invitations/${invitationId}`);
      toast.success('Invitation cancelled');
      fetchInvitations();
    } catch {
      toast.error('Failed to cancel');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description={`${totalTeam} members • ${activeMembers} active • ${pendingInvitations} pending`}
      >
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              fetchMembers();
              fetchInvitations();
            }}
            icon={RefreshCw}
            loading={loading}
          >
            Refresh
          </Button>
          {hasPermission('invite_users') && (
            <Button icon={UserPlus} onClick={() => setShowInviteModal(true)}>
              Invite Member
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-200 dark:bg-blue-700 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xs text-blue-500 font-medium">Total Members</p>
          </div>
          <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
            {totalTeam}
          </p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4 border border-green-200 dark:border-green-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-200 dark:bg-green-700 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-xs text-green-500 font-medium">Active</p>
          </div>
          <p className="text-xl font-bold text-green-700 dark:text-green-300">
            {activeMembers}
          </p>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-yellow-200 dark:bg-yellow-700 flex items-center justify-center">
              <Clock className="w-4 h-4 text-yellow-600" />
            </div>
            <p className="text-xs text-yellow-500 font-medium">Pending</p>
          </div>
          <p className="text-xl font-bold text-yellow-700 dark:text-yellow-300">
            {pendingInvitations}
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4 border border-purple-200 dark:border-purple-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-200 dark:bg-purple-700 flex items-center justify-center">
              <Shield className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-xs text-purple-500 font-medium">Roles</p>
          </div>
          <p className="text-xl font-bold text-purple-700 dark:text-purple-300">
            {new Set(members.map((m) => m.role)).size}
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg text-sm px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Roles</option>
              {Object.entries(roleLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg text-sm px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            {(searchTerm || roleFilter !== 'all' || statusFilter !== 'all') && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setRoleFilter('all');
                  setStatusFilter('all');
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card
          className={showInvitations ? '' : 'cursor-pointer'}
          onClick={() => !showInvitations && setShowInvitations(true)}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-500" />
                Pending Invitations ({invitations.length})
              </CardTitle>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowInvitations(!showInvitations);
                }}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                {showInvitations ? 'Hide' : 'Show'}
              </button>
            </div>
          </CardHeader>
          <AnimatePresence>
            {showInvitations && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <CardContent>
                  <div className="space-y-2">
                    {invitations.map((inv) => (
                      <div
                        key={inv._id || inv.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl border border-yellow-200 dark:border-yellow-700"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-800 flex items-center justify-center flex-shrink-0">
                            <Mail className="w-5 h-5 text-yellow-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {inv.email}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                              <Badge
                                variant={roleColors[inv.role] || 'gray'}
                                size="sm"
                              >
                                {roleLabels[inv.role] || inv.role}
                              </Badge>
                              <span>•</span>
                              <span>
                                Expires{' '}
                                {new Date(inv.expiresAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-14 sm:ml-0">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleCopyInviteLink(inv.token)}
                            icon={Copy}
                          >
                            Copy Link
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              handleResendInvitation(inv._id || inv.id)
                            }
                            icon={Send}
                          >
                            Resend
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleCancelInvitation(inv._id || inv.id)
                            }
                          >
                            <XCircle className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      )}

      {/* Members List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <TableSkeleton rows={5} />
          ) : error ? (
            <div className="p-6 text-center">
              <RefreshCw className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
              <Button onClick={fetchMembers} icon={RefreshCw}>
                Try Again
              </Button>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Users}
                title={
                  searchTerm || roleFilter !== 'all'
                    ? 'No members match your filters'
                    : 'No members yet'
                }
                description={
                  searchTerm || roleFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Invite team members to start collaborating'
                }
                action={
                  !searchTerm &&
                  roleFilter === 'all' &&
                  hasPermission('invite_users')
                    ? {
                        label: 'Invite Member',
                        icon: UserPlus,
                        onClick: () => setShowInviteModal(true),
                      }
                    : undefined
                }
              />
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredMembers.map((member, index) => {
                const RoleIcon = roleIcons[member.role] || Users;
                const isCurrentUser = member._id === currentUser?.id;
                const isCompanyAdmin = member.role === 'company_admin';
                const isProtected = isCompanyAdmin;
                const canManage =
                  !isCurrentUser &&
                  !isProtected &&
                  hasPermission('manage_users');

                return (
                  <motion.div
                    key={member._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="relative">
                        <Avatar
                          name={`${member.firstName} ${member.lastName}`}
                          size="md"
                        />
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${
                            member.isActive ? 'bg-green-500' : 'bg-gray-400'
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">
                            {member.firstName} {member.lastName}
                          </p>
                          {isCurrentUser && (
                            <Badge variant="info" size="sm">
                              You
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {member.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-14 sm:ml-0 flex-wrap">
                      <Badge
                        variant={roleColors[member.role] || 'gray'}
                        size="sm"
                      >
                        <RoleIcon className="w-3 h-3 mr-1 inline" />
                        {roleLabels[member.role] || member.role}
                      </Badge>
                      <Badge
                        variant={member.isActive ? 'green' : 'gray'}
                        size="sm"
                      >
                        {member.isActive ? 'Active' : 'Inactive'}
                      </Badge>

                      {canManage && (
                        <div className="flex items-center gap-1">
                          {member.isActive ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedMember(member);
                                  setShowTerminateDialog(true);
                                }}
                                title="Terminate"
                              >
                                <UserMinus className="w-4 h-4 text-orange-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedMember(member);
                                  setShowDeleteDialog(true);
                                }}
                                title="Delete Permanently"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReactivate(member._id)}
                              title="Reactivate"
                            >
                              <UserCheck className="w-4 h-4 text-green-500" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => {
          setShowInviteModal(false);
          setInviteForm({ email: '', role: 'employee' });
        }}
        title="Invite Team Member"
        size="md"
      >
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Email Address
            </label>
            <Input
              type="email"
              icon={Mail}
              placeholder="colleague@company.com"
              value={inviteForm.email}
              onChange={(e) =>
                setInviteForm({ ...inviteForm, email: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Role
            </label>
            <select
              value={inviteForm.role}
              onChange={(e) =>
                setInviteForm({ ...inviteForm, role: e.target.value })
              }
              className="input-field"
            >
              {assignableRoles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {inviteForm.role === 'company_admin' &&
                'Full access to workspace settings, members, and all features.'}
              {inviteForm.role === 'project_manager' &&
                'Can manage projects, tasks, and clients.'}
              {inviteForm.role === 'team_lead' &&
                'Can lead a team, manage tasks, and view project details.'}
              {inviteForm.role === 'employee' &&
                'Basic access to assigned tasks and projects.'}
              {inviteForm.role === 'client' &&
                'Limited access to view their own projects, tasks, and invoices only.'}
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowInviteModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={inviteLoading}
              className="flex-1"
              icon={Send}
            >
              Send Invitation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Terminate Confirmation */}
      <ConfirmDialog
        isOpen={showTerminateDialog}
        onClose={() => {
          setShowTerminateDialog(false);
          setSelectedMember(null);
        }}
        onConfirm={handleTerminate}
        loading={terminateLoading}
        title="Terminate Team Member"
        message={`Are you sure you want to terminate ${selectedMember?.firstName} ${selectedMember?.lastName}? They will be deactivated but their data will be preserved. You can reactivate them later.`}
        confirmText="Terminate"
        variant="warning"
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setSelectedMember(null);
        }}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Delete Team Member Permanently"
        message={`Are you sure you want to permanently delete ${selectedMember?.firstName} ${selectedMember?.lastName}? This action cannot be undone. All their data will be removed from the workspace.`}
        confirmText="Delete Permanently"
        variant="danger"
      />
    </div>
  );
};

export default Team;
