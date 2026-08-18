import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  Pencil,
  KeyRound,
  Award,
  Users,
  CheckCircle2,
  FolderKanban,
  ShieldCheck,
  Sparkles,
  Copy,
  Check,
  LayoutGrid,
  Activity,
  Clock,
  AlertCircle,
  ArrowUpRight,
  Star,
  TrendingUp,
  Target,
  Zap,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Avatar } from '../../components/common/Avatar';
import { Button } from '../../components/common/Button';
import { DashboardSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import RadialProgress from '../../components/charts/RadialProgress';
import { useAuth } from '../../hooks/useAuth';
import { authAPI } from '../../api/auth.api';
import { usersAPI } from '../../api/users.api';
import { tasksAPI } from '../../api/tasks.api';
import { projectsAPI } from '../../api/projects.api';
import { EditProfileModal } from './EditProfileModal';
import { ChangePasswordModal } from './ChangePasswordModal';
import toast from 'react-hot-toast';

const SKILL_LEVEL_WIDTH = {
  beginner: '25%',
  intermediate: '55%',
  advanced: '80%',
  expert: '100%',
};

const SKILL_LEVEL_COLOR = {
  beginner: 'from-gray-400 to-gray-500',
  intermediate: 'from-blue-500 to-blue-600',
  advanced: 'from-primary-500 to-primary-600',
  expert: 'from-emerald-500 to-emerald-600',
};

const SKILL_LEVEL_GLOW = {
  beginner: 'shadow-gray-400/20',
  intermediate: 'shadow-blue-500/20',
  advanced: 'shadow-primary-500/30',
  expert: 'shadow-emerald-500/30',
};

const ROLE_BADGE_VARIANT = {
  owner: 'primary',
  admin: 'info',
  manager: 'warning',
  employee: 'default',
  client: 'default',
};

const TASK_STATUS_BADGE = {
  todo: 'default',
  in_progress: 'info',
  review: 'warning',
  completed: 'success',
};

const TASK_STATUS_LABEL = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  completed: 'Completed',
};

const PROJECT_STATUS_BADGE = {
  planning: 'info',
  active: 'success',
  on_hold: 'warning',
  completed: 'primary',
  cancelled: 'danger',
};

const formatDate = (date, opts) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString(
    undefined,
    opts || { year: 'numeric', month: 'long' }
  );
};

const TABS = [
  { key: 'overview', label: 'Overview', icon: LayoutGrid },
  { key: 'skills', label: 'Skills', icon: Award },
  { key: 'activity', label: 'Activity', icon: Activity },
  { key: 'workspaces', label: 'Workspaces', icon: Users },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      delay: i * 0.08,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
};

const CopyableRow = ({ icon: Icon, label, value, copyValue }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!copyValue) return;
    try {
      await navigator.clipboard.writeText(copyValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable — fail silently, non-critical
    }
  };

  return (
    <motion.div
      className="flex items-start gap-3 group relative"
      whileHover={{ x: 2 }}
      transition={{ duration: 0.2 }}
    >
      <div className="relative flex-shrink-0 mt-0.5">
        <div className="absolute inset-0 bg-current opacity-10 rounded-lg blur-sm" />
        <Icon className="w-4 h-4 text-gray-400 relative z-10" />
      </div>
      <div className="min-w-0 flex-1">
        <dt className="text-[10px] sm:text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          {label}
        </dt>
        <dd className="text-sm sm:text-base text-gray-900 dark:text-white break-all flex items-center gap-2 mt-0.5">
          <span className="truncate font-medium">
            {value || 'Not provided'}
          </span>
          {copyValue && (
            <motion.button
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all flex-shrink-0 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              title={`Copy ${label.toLowerCase()}`}
              whileTap={{ scale: 0.9 }}
            >
              {copied ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                </motion.div>
              ) : (
                <Copy className="w-3.5 h-3.5 text-gray-400 hover:text-primary-600 transition-colors" />
              )}
            </motion.button>
          )}
        </dd>
      </div>
    </motion.div>
  );
};

const Profile = () => {
  const { user: authUser } = useAuth();

  const [user, setUser] = useState(authUser);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const [workspaces, setWorkspaces] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [myProjects, setMyProjects] = useState([]);

  const loadProfileData = useCallback(async () => {
    try {
      const [meRes, workspacesRes] = await Promise.allSettled([
        authAPI.getMe(),
        authAPI.getMyWorkspaces(),
      ]);

      let currentUser = authUser;
      if (meRes.status === 'fulfilled') {
        currentUser = meRes.value.data.data;
        setUser(currentUser);
      }
      if (workspacesRes.status === 'fulfilled') {
        setWorkspaces(workspacesRes.value.data.data?.workspaces || []);
      }

      const userId = currentUser?.id || currentUser?._id;

      try {
        const { data } = await tasksAPI.getAll({
          assignedTo: userId,
          limit: 1000,
        });
        setMyTasks(data.data || []);
      } catch {
        setMyTasks([]);
      }

      try {
        const { data } = await projectsAPI.getAll({ limit: 1000 });
        const allProjects = data.data || [];
        const filtered = allProjects.filter((p) =>
          (p.team || []).some((t) => (t.user?._id || t.user) === userId)
        );
        setMyProjects(filtered);
      } catch {
        setMyProjects([]);
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  const taskStats = useMemo(() => {
    const total = myTasks.length;
    const completed = myTasks.filter((t) => t.status === 'completed').length;
    const overdue = myTasks.filter(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate) < new Date() &&
        t.status !== 'completed'
    ).length;
    return { total, completed, overdue };
  }, [myTasks]);

  const projectStats = useMemo(() => {
    const total = myProjects.length;
    const completed = myProjects.filter((p) => p.status === 'completed').length;
    const avgProgress =
      total > 0
        ? Math.round(
            myProjects.reduce((sum, p) => sum + (p.progress || 0), 0) / total
          )
        : 0;
    return { total, completed, avgProgress };
  }, [myProjects]);

  const taskCompletionPct =
    taskStats.total > 0
      ? Math.round((taskStats.completed / taskStats.total) * 100)
      : 0;
  const projectCompletionPct = projectStats.avgProgress;

  const profileCompleteness = useMemo(() => {
    if (!user) return 0;
    const fields = [
      user.firstName,
      user.lastName,
      user.email,
      user.phone,
      user.position,
      user.department,
      user.bio,
      user.avatar?.url,
      user.skills?.length > 0,
      user.address?.city,
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  }, [user]);

  const recentTasks = useMemo(
    () =>
      [...myTasks]
        .sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt) -
            new Date(a.updatedAt || a.createdAt)
        )
        .slice(0, 6),
    [myTasks]
  );

  const recentProjects = useMemo(
    () =>
      [...myProjects]
        .sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt) -
            new Date(a.updatedAt || a.createdAt)
        )
        .slice(0, 6),
    [myProjects]
  );

  const handleSaveProfile = async (formData) => {
    setSaving(true);
    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        position: formData.position,
        department: formData.department,
        bio: formData.bio,
        address: formData.address,
        skills: formData.skills,
      };

      if (formData.avatar) {
        payload.avatar = formData.avatar;
      } else if (formData.avatar === null && user?.avatar) {
        payload.avatar = null;
      }

      const { data } = await usersAPI.updateProfile(payload);
      setUser(data.data);
      toast.success('Profile updated successfully');
      setShowEditModal(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !user) {
    return <DashboardSkeleton />;
  }

  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
  const currentRole =
    user?.role ||
    workspaces.find((w) => w.slug === user?.workspace?.slug)?.role;

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 pb-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* ── Cover / Identity Header ─────────────────────────────────────── */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={fadeUp}
        custom={0}
        className="relative"
      >
        <Card
          padding={false}
          className="overflow-hidden border-0 shadow-xl shadow-primary-500/10 dark:shadow-primary-500/5"
        >
          <div className="relative bg-gradient-to-br from-primary-600 via-violet-600 to-indigo-600">
            {/* Signature accent line */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-white/60 via-white/20 to-transparent" />

            {/* Fine dot-grid texture — quiet, replaces the old blurred blobs */}
            <div
              className="absolute inset-0 opacity-[0.08] pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(circle, #ffffff 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.12),_transparent_55%)] pointer-events-none" />

            <div className="relative px-5 sm:px-8 lg:px-10 pt-8 sm:pt-10 pb-6 sm:pb-7">
              {/* Identity row */}
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                <motion.div
                  className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-5 text-center sm:text-left min-w-0"
                  variants={scaleIn}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar
                      src={user?.avatar?.url}
                      name={fullName}
                      size="2xl"
                      className="ring-[3px] sm:ring-4 ring-white/90 shadow-2xl w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28"
                    />
                    <motion.div
                      className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-1 ring-2 ring-white"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        delay: 0.3,
                        type: 'spring',
                        stiffness: 260,
                        damping: 20,
                      }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                    </motion.div>
                  </div>

                  <div className="min-w-0">
                    {/* Eyebrow */}
                    {(user?.position || user?.department) && (
                      <motion.p
                        className="flex items-center justify-center sm:justify-start gap-1.5 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.14em] text-white/75 mb-1"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                      >
                        <Briefcase className="w-3 h-3" />
                        <span className="truncate max-w-[220px]">
                          {[user?.position, user?.department]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </motion.p>
                    )}

                    <motion.h1
                      className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white truncate"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      {fullName || 'Your Profile'}
                    </motion.h1>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2.5">
                      {currentRole && (
                        <Badge
                          variant={ROLE_BADGE_VARIANT[currentRole] || 'default'}
                          size="sm"
                          className="capitalize shadow-sm"
                        >
                          {currentRole.replace('_', ' ')}
                        </Badge>
                      )}
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
                          user?.isEmailVerified
                            ? 'text-white border-white/30 bg-white/15'
                            : 'text-amber-100 border-amber-200/40 bg-amber-400/20'
                        }`}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        {user?.isEmailVerified ? 'Verified' : 'Unverified'}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white/70 px-2.5 py-1">
                        <Calendar className="w-3 h-3" />
                        Since{' '}
                        {formatDate(user?.createdAt, {
                          year: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* Actions */}
                <motion.div
                  className="flex flex-row items-stretch gap-2 sm:gap-2.5 w-full lg:w-auto flex-shrink-0"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    icon={KeyRound}
                    onClick={() => setShowPasswordModal(true)}
                    className="w-full sm:w-auto justify-center text-xs sm:text-sm !border-white/30 !text-white hover:!bg-white/10 !bg-transparent"
                  >
                    Change Password
                  </Button>
                  <Button
                    size="sm"
                    icon={Pencil}
                    onClick={() => setShowEditModal(true)}
                    className="w-full sm:w-auto justify-center bg-white !text-primary-700 hover:!bg-white/90 shadow-lg shadow-black/10 text-xs sm:text-sm"
                  >
                    Edit Profile
                  </Button>
                </motion.div>
              </div>

              {/* Vitals strip — real numbers, not decoration */}
              <motion.div
                className="mt-7 sm:mt-8 grid grid-cols-2 sm:grid-cols-4 rounded-xl overflow-hidden border border-white/15 bg-white/10 backdrop-blur-sm divide-x divide-y sm:divide-y-0 divide-white/15"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <HeaderVital
                  icon={CheckCircle2}
                  iconColor="text-white"
                  label="Tasks"
                  value={taskStats.total}
                  sub={`${taskStats.completed} done`}
                />
                <HeaderVital
                  icon={FolderKanban}
                  iconColor="text-white"
                  label="Projects"
                  value={projectStats.total}
                  sub={`${projectStats.avgProgress}% avg`}
                />
                <HeaderVital
                  icon={Users}
                  iconColor="text-white"
                  label="Workspaces"
                  value={workspaces.length}
                />
                <HeaderVital
                  icon={Sparkles}
                  iconColor="text-white"
                  label="Profile"
                  value={`${profileCompleteness}%`}
                  sub="complete"
                />
              </motion.div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ── Performance Charts ───────────────────────────────────────────── */}
      <motion.div initial="hidden" animate="show" variants={fadeUp} custom={1}>
        <Card className="border-0 shadow-lg shadow-gray-200/50 dark:shadow-gray-800/50 backdrop-blur-sm bg-white/80 dark:bg-gray-800/80">
          <CardHeader className="pb-2 sm:pb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-600" />
              <CardTitle className="text-lg sm:text-xl">
                Performance Overview
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 place-items-center">
              <motion.div
                className="w-full max-w-[200px] sm:max-w-[180px] lg:max-w-[200px]"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <RadialProgress
                  value={taskCompletionPct}
                  label="Task Completion"
                  sublabel={`${taskStats.completed}/${taskStats.total} tasks`}
                  color="#10b981"
                />
              </motion.div>
              <motion.div
                className="w-full max-w-[200px] sm:max-w-[180px] lg:max-w-[200px]"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <RadialProgress
                  value={projectCompletionPct}
                  label="Project Completion"
                  sublabel={`${projectStats.total} active project${projectStats.total === 1 ? '' : 's'}`}
                  color="#3b82f6"
                />
              </motion.div>
              <motion.div
                className="w-full max-w-[200px] sm:max-w-[180px] lg:max-w-[200px]"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <RadialProgress
                  value={profileCompleteness}
                  label="Profile Completeness"
                  sublabel="Keep your profile up to date"
                  color="#8b5cf6"
                />
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Tab Navigation ──────────────────────────────────────────────── */}
      <motion.div initial="hidden" animate="show" variants={fadeUp} custom={2}>
        <div className="relative">
          <div className="flex gap-0.5 sm:gap-1 overflow-x-auto no-scrollbar bg-gray-100 dark:bg-gray-800/50 rounded-xl p-1 -mx-1">
            {TABS.map(({ key, label, icon: Icon }) => (
              <motion.button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`relative flex items-center gap-1.5 sm:gap-2 whitespace-nowrap px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all flex-shrink-0 ${
                  activeTab === key
                    ? 'text-white shadow-lg'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
                whileTap={{ scale: 0.95 }}
              >
                {activeTab === key && (
                  <motion.div
                    layoutId="profile-tab-bg"
                    className="absolute inset-0 bg-gradient-to-r from-primary-600 to-indigo-600 rounded-lg shadow-lg shadow-primary-500/25"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 relative z-10" />
                <span className="relative z-10 hidden sm:inline">{label}</span>
                {activeTab === key && (
                  <motion.span
                    className="relative z-10 sm:hidden text-[10px] font-semibold"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {label}
                  </motion.span>
                )}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Tab Content ─────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -12, filter: 'blur(8px)' }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Main Content - 2/3 width on desktop */}
              <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                <motion.div variants={fadeUp} custom={0}>
                  <Card className="border-0 shadow-lg shadow-gray-200/50 dark:shadow-gray-800/50 hover:shadow-xl transition-shadow duration-300">
                    <CardHeader className="pb-3 sm:pb-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base sm:text-lg">
                          Contact & Personal Info
                        </CardTitle>
                        <motion.div
                          className="hidden sm:flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-3 py-1 rounded-full"
                          whileHover={{ scale: 1.05 }}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {user?.isEmailVerified ? 'Verified' : 'Unverified'}
                        </motion.div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
                        <CopyableRow
                          icon={Mail}
                          label="Email"
                          value={user?.email}
                          copyValue={user?.email}
                        />
                        <CopyableRow
                          icon={Phone}
                          label="Phone"
                          value={user?.phone}
                          copyValue={user?.phone}
                        />
                        <motion.div
                          className="flex items-start gap-3"
                          whileHover={{ x: 2 }}
                        >
                          <KeyRound className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
                          <div>
                            <dt className="text-[10px] sm:text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                              Password
                            </dt>
                            <dd className="text-sm sm:text-base text-gray-900 dark:text-white mt-0.5">
                              ••••••••••
                              <motion.button
                                onClick={() => setShowPasswordModal(true)}
                                className="ml-2 text-xs sm:text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                Change
                              </motion.button>
                            </dd>
                          </div>
                        </motion.div>
                        <motion.div
                          className="flex items-start gap-3"
                          whileHover={{ x: 2 }}
                        >
                          <Calendar className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
                          <div>
                            <dt className="text-[10px] sm:text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                              Member Since
                            </dt>
                            <dd className="text-sm sm:text-base text-gray-900 dark:text-white mt-0.5 font-medium">
                              {formatDate(user?.createdAt)}
                            </dd>
                          </div>
                        </motion.div>
                        <motion.div
                          className="flex items-start gap-3 sm:col-span-2"
                          whileHover={{ x: 2 }}
                        >
                          <MapPin className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <dt className="text-[10px] sm:text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                              Address
                            </dt>
                            <dd className="text-sm sm:text-base text-gray-900 dark:text-white break-words mt-0.5">
                              {[
                                user?.address?.street,
                                user?.address?.city,
                                user?.address?.state,
                                user?.address?.zipCode,
                                user?.address?.country,
                              ]
                                .filter(Boolean)
                                .join(', ') || 'Not provided'}
                            </dd>
                          </div>
                        </motion.div>
                      </dl>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={fadeUp} custom={1}>
                  <Card className="border-0 shadow-lg shadow-gray-200/50 dark:shadow-gray-800/50 hover:shadow-xl transition-shadow duration-300">
                    <CardHeader className="pb-3 sm:pb-4">
                      <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
                        About Me
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {user?.bio ? (
                        <motion.p
                          className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.2 }}
                        >
                          {user.bio}
                        </motion.p>
                      ) : (
                        <motion.div
                          className="text-center py-8"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          <p className="text-sm sm:text-base text-gray-400 dark:text-gray-500 italic">
                            No bio added yet.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={() => setShowEditModal(true)}
                          >
                            Introduce yourself to the team
                          </Button>
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Sidebar - 1/3 width on desktop */}
              <div className="space-y-4 sm:space-y-6">
                <motion.div variants={fadeUp} custom={2}>
                  <Card className="border-0 shadow-lg shadow-gray-200/50 dark:shadow-gray-800/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                        Quick Stats
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 sm:gap-3">
                        <StatPill
                          icon={CheckCircle2}
                          iconColor="text-emerald-500"
                          bgColor="bg-emerald-50 dark:bg-emerald-900/20"
                          label="Tasks Assigned"
                          value={taskStats.total}
                        />
                        <StatPill
                          icon={FolderKanban}
                          iconColor="text-blue-500"
                          bgColor="bg-blue-50 dark:bg-blue-900/20"
                          label="Projects"
                          value={projectStats.total}
                        />
                        <StatPill
                          icon={Users}
                          iconColor="text-purple-500"
                          bgColor="bg-purple-50 dark:bg-purple-900/20"
                          label="Workspaces"
                          value={workspaces.length}
                        />
                        <StatPill
                          icon={ShieldCheck}
                          iconColor="text-amber-500"
                          bgColor="bg-amber-50 dark:bg-amber-900/20"
                          label="Verified"
                          value={user?.isEmailVerified ? 'Yes' : 'No'}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={fadeUp} custom={3}>
                  <Card className="border-0 shadow-lg overflow-hidden bg-gradient-to-br from-primary-50 to-indigo-50 dark:from-primary-900/20 dark:to-indigo-900/20 border-l-4 border-primary-500">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <motion.div
                          className="flex-shrink-0 p-2 bg-primary-100 dark:bg-primary-900/30 rounded-xl"
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            repeatDelay: 3,
                          }}
                        >
                          <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
                        </motion.div>
                        <div>
                          <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                            Keep your profile fresh
                          </p>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1.5 sm:mt-2 leading-relaxed">
                            A complete profile helps your team find and
                            collaborate with you faster.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>
          )}

          {activeTab === 'skills' && (
            <motion.div variants={fadeUp} custom={0}>
              <Card className="border-0 shadow-lg shadow-gray-200/50 dark:shadow-gray-800/50">
                <CardHeader className="pb-4 sm:pb-6">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <Award className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600" />
                      Skills & Expertise
                    </CardTitle>
                    {user?.skills?.length > 0 && (
                      <Badge variant="primary" size="sm">
                        {user.skills.length} skill
                        {user.skills.length > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {user?.skills?.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {user.skills.map((skill, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 20, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ delay: i * 0.06, duration: 0.4 }}
                          whileHover={{ y: -4, scale: 1.02 }}
                          className={`relative p-4 sm:p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md hover:shadow-xl transition-all duration-300 ${SKILL_LEVEL_GLOW[skill.level] || ''}`}
                        >
                          <div className="flex items-center justify-between mb-3 sm:mb-4">
                            <div className="flex items-center gap-2 min-w-0">
                              <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                              <span className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-200 truncate">
                                {skill.name}
                              </span>
                            </div>
                            <Badge
                              variant={
                                skill.level === 'expert'
                                  ? 'success'
                                  : skill.level === 'advanced'
                                    ? 'primary'
                                    : 'default'
                              }
                              className="capitalize flex-shrink-0 ml-2"
                            >
                              {skill.level}
                            </Badge>
                          </div>
                          <div className="relative w-full h-2.5 sm:h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: SKILL_LEVEL_WIDTH[skill.level] || '50%',
                              }}
                              transition={{
                                duration: 0.8,
                                delay: i * 0.06,
                                ease: 'easeOut',
                              }}
                              className={`h-full rounded-full bg-gradient-to-r ${
                                SKILL_LEVEL_COLOR[skill.level] ||
                                SKILL_LEVEL_COLOR.intermediate
                              } relative`}
                            >
                              <div className="absolute inset-0 bg-white/20 animate-shimmer" />
                            </motion.div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={Award}
                      title="No skills listed yet"
                      description="Add your top skills so teammates know what you're great at."
                      action={{
                        label: 'Add Skills',
                        onClick: () => setShowEditModal(true),
                      }}
                    />
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === 'activity' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <motion.div variants={fadeUp} custom={0}>
                <Card className="border-0 shadow-lg shadow-gray-200/50 dark:shadow-gray-800/50">
                  <CardHeader className="pb-3 sm:pb-4">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                      </div>
                      Recent Tasks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recentTasks.length > 0 ? (
                      <ul className="space-y-2 sm:space-y-3">
                        {recentTasks.map((task, i) => {
                          const overdue =
                            task.dueDate &&
                            new Date(task.dueDate) < new Date() &&
                            task.status !== 'completed';
                          return (
                            <motion.li
                              key={task._id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              whileHover={{ x: 4 }}
                              className="flex items-start justify-between gap-3 p-3 sm:p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-transparent dark:hover:from-gray-700/30 dark:hover:to-transparent transition-all duration-300 cursor-pointer group"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                  {task.title}
                                </p>
                                <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                                  {task.project?.name && (
                                    <span className="truncate max-w-[100px] sm:max-w-[150px] bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                                      {task.project.name}
                                    </span>
                                  )}
                                  {task.dueDate && (
                                    <span
                                      className={`flex items-center gap-1 ${overdue ? 'text-red-500 font-medium' : ''}`}
                                    >
                                      {overdue ? (
                                        <AlertCircle className="w-3 h-3" />
                                      ) : (
                                        <Clock className="w-3 h-3" />
                                      )}
                                      {formatDate(task.dueDate, {
                                        month: 'short',
                                        day: 'numeric',
                                      })}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Badge
                                variant={
                                  TASK_STATUS_BADGE[task.status] || 'default'
                                }
                                className="flex-shrink-0 shadow-sm"
                              >
                                {TASK_STATUS_LABEL[task.status] || task.status}
                              </Badge>
                            </motion.li>
                          );
                        })}
                      </ul>
                    ) : (
                      <EmptyState
                        icon={CheckCircle2}
                        title="No tasks yet"
                        description="Tasks assigned to you will show up here."
                      />
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={fadeUp} custom={1}>
                <Card className="border-0 shadow-lg shadow-gray-200/50 dark:shadow-gray-800/50">
                  <CardHeader className="pb-3 sm:pb-4">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <FolderKanban className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                      </div>
                      My Projects
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recentProjects.length > 0 ? (
                      <ul className="space-y-2 sm:space-y-3">
                        {recentProjects.map((project, i) => (
                          <motion.li
                            key={project._id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            whileHover={{ x: 4 }}
                            className="p-3 sm:p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-transparent dark:hover:from-gray-700/30 dark:hover:to-transparent transition-all duration-300 cursor-pointer group"
                          >
                            <div className="flex items-center justify-between gap-3 mb-2 sm:mb-3">
                              <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white truncate flex items-center gap-1.5 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                {project.name}
                                <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-primary-500 transition-colors flex-shrink-0" />
                              </p>
                              <Badge
                                variant={
                                  PROJECT_STATUS_BADGE[project.status] ||
                                  'default'
                                }
                                className="flex-shrink-0 capitalize shadow-sm"
                              >
                                {project.status?.replace('_', ' ')}
                              </Badge>
                            </div>
                            <div className="relative w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${project.progress || 0}%` }}
                                transition={{ duration: 0.8, delay: i * 0.1 }}
                                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 relative"
                              >
                                <div className="absolute inset-0 bg-white/20 animate-shimmer" />
                              </motion.div>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500">
                                {project.progress || 0}% complete
                              </p>
                              <div className="flex items-center gap-1">
                                <Target className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-400">
                                  {project.progress >= 100
                                    ? 'Done!'
                                    : 'In progress'}
                                </span>
                              </div>
                            </div>
                          </motion.li>
                        ))}
                      </ul>
                    ) : (
                      <EmptyState
                        icon={FolderKanban}
                        title="No projects yet"
                        description="Projects you're a team member on will show up here."
                      />
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          )}

          {activeTab === 'workspaces' && (
            <motion.div variants={fadeUp} custom={0}>
              <Card className="border-0 shadow-lg shadow-gray-200/50 dark:shadow-gray-800/50">
                <CardHeader className="pb-4 sm:pb-6">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600" />
                      Workspaces & Roles
                    </CardTitle>
                    {workspaces.length > 0 && (
                      <Badge variant="primary" size="sm">
                        {workspaces.length} workspace
                        {workspaces.length > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {workspaces.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      {workspaces.map((ws, i) => (
                        <motion.div
                          key={ws._id}
                          initial={{ opacity: 0, y: 20, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ delay: i * 0.06 }}
                          whileHover={{ y: -6, scale: 1.02 }}
                          className="relative group flex items-center justify-between p-4 sm:p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer"
                        >
                          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                            <Avatar
                              src={ws.logo}
                              name={ws.name}
                              size="md"
                              className="flex-shrink-0 ring-2 ring-gray-100 dark:ring-gray-700"
                            />
                            <div className="min-w-0">
                              <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                {ws.name}
                              </p>
                              <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 capitalize mt-0.5">
                                {ws.plan} plan
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant={ROLE_BADGE_VARIANT[ws.role] || 'default'}
                            className="capitalize flex-shrink-0 ml-3 shadow-sm"
                          >
                            {ws.role.replace('_', ' ')}
                          </Badge>
                          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary-500/0 to-indigo-500/0 group-hover:from-primary-500/5 group-hover:to-indigo-500/5 transition-all duration-300 pointer-events-none" />
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={Users}
                      title="No workspace memberships found"
                      description="Workspaces you belong to will appear here."
                    />
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      <EditProfileModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        user={user}
        onSave={handleSaveProfile}
        saving={saving}
      />
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </div>
  );
};

const HeaderVital = ({ icon: Icon, iconColor, label, value, sub }) => (
  <div className="flex items-center gap-2.5 sm:gap-3 px-4 sm:px-5 py-3.5 sm:py-4">
    <Icon
      className={`w-4 h-4 sm:w-[18px] sm:h-[18px] flex-shrink-0 ${iconColor}`}
    />
    <div className="min-w-0">
      <div className="flex items-baseline gap-1.5">
        <span className="text-base sm:text-lg font-bold text-white leading-none">
          {value}
        </span>
        {sub && (
          <span className="text-[10px] sm:text-xs text-white/70 truncate">
            {sub}
          </span>
        )}
      </div>
      <p className="text-[10px] sm:text-xs text-white/70 uppercase tracking-wide mt-0.5">
        {label}
      </p>
    </div>
  </div>
);

const StatPill = ({ icon: Icon, iconColor, bgColor, label, value }) => (
  <motion.div
    className={`flex items-center justify-between p-3 sm:p-4 rounded-xl ${bgColor} hover:shadow-md transition-all duration-300`}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
  >
    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
      <div
        className={`p-1.5 sm:p-2 rounded-lg ${bgColor} ring-1 ring-current/10`}
      >
        <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${iconColor}`} />
      </div>
      <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
        {label}
      </span>
    </div>
    <motion.span
      className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white ml-2"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      {value}
    </motion.span>
  </motion.div>
);

export default Profile;
