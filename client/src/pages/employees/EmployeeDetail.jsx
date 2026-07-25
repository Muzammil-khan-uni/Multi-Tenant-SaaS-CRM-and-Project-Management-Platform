import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useWorkspaceNavigate as useNavigate } from '../../hooks/useWorkspaceNavigate';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Mail,
  Phone,
  Briefcase,
  Building2,
  Calendar,
  Clock,
  DollarSign,
  Edit,
  Save,
  Trash2,
  UserCheck,
  UserPlus,
  XCircle,
  MapPin,
  Shield,
  FileText,
  Star,
  TrendingUp,
  Heart,
  Target,
  Activity,
  User,
  CheckCircle,
} from 'lucide-react';
import { Avatar } from '../../components/common/Avatar';
import { PageHeader } from '../../components/common/PageHeader';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import { useApiData } from '../../hooks/useApiData';
import { usePermissions } from '../../hooks/usePermissions';
import axios from '../../api/axios';
import toast from 'react-hot-toast';
import { formatDate } from '../../utils/helpers';

const statusColors = {
  active: 'green',
  inactive: 'gray',
  on_leave: 'yellow',
  terminated: 'red',
};
const statusLabels = {
  active: 'Active',
  inactive: 'Inactive',
  on_leave: 'On Leave',
  terminated: 'Terminated',
};
const attendanceColors = {
  present: 'green',
  absent: 'red',
  late: 'yellow',
  half_day: 'orange',
  remote: 'blue',
};
const attendanceLabels = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  half_day: 'Half Day',
  remote: 'Remote',
};
const levelColors = {
  junior: 'gray',
  mid: 'blue',
  senior: 'green',
  lead: 'purple',
  manager: 'yellow',
  director: 'red',
  vp: 'orange',
  'c-level': 'pink',
};

const fetchEmployee = async (id) => {
  const { data } = await axios.get(`/employees/${id}`);
  return data.data;
};

const EmployeeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const {
    data: employee,
    loading,
    refetch,
  } = useApiData(() => fetchEmployee(id));

  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leaveType: 'annual',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [terminateLoading, setTerminateLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const handleEdit = () => {
    setFormData({
      firstName: employee?.user?.firstName || '',
      lastName: employee?.user?.lastName || '',
      phone: employee?.personalInfo?.phone || employee?.user?.phone || '',
      positionTitle: employee?.position?.title || '',
      positionLevel: employee?.position?.level || 'junior',
      departmentName: employee?.department?.name || '',
      employmentType: employee?.employmentType || 'full_time',
      hireDate: employee?.workInfo?.hireDate
        ? new Date(employee.workInfo.hireDate).toISOString().split('T')[0]
        : '',
      dateOfBirth: employee?.personalInfo?.dateOfBirth
        ? new Date(employee.personalInfo.dateOfBirth)
            .toISOString()
            .split('T')[0]
        : '',
      gender: employee?.personalInfo?.gender || '',
      probationEndDate: employee?.workInfo?.probationEndDate
        ? new Date(employee.workInfo.probationEndDate)
            .toISOString()
            .split('T')[0]
        : '',

      street: employee?.personalInfo?.address?.street || '',
      city: employee?.personalInfo?.address?.city || '',
      state: employee?.personalInfo?.address?.state || '',
      zipCode: employee?.personalInfo?.address?.zipCode || '',
      country: employee?.personalInfo?.address?.country || '',

      salaryAmount: employee?.workInfo?.salary?.amount || 0,
      salaryCurrency: employee?.workInfo?.salary?.currency || 'USD',
      salaryType: employee?.workInfo?.salary?.type || 'annual',
    });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        employmentType: formData.employmentType, // ADD THIS
        position: {
          title: formData.positionTitle,
          level: formData.positionLevel,
        },
        department: { name: formData.departmentName },
        personalInfo: {
          phone: formData.phone,
          dateOfBirth: formData.dateOfBirth || undefined,
          gender: formData.gender || undefined,
          address: {
            street: formData.street?.trim() || undefined,
            city: formData.city?.trim() || undefined,
            state: formData.state?.trim() || undefined,
            zipCode: formData.zipCode?.trim() || undefined,
            country: formData.country?.trim() || undefined,
          },
        },
        workInfo: {
          hireDate: formData.hireDate || undefined,
          probationEndDate: formData.probationEndDate || undefined,
          salary: {
            amount: Number(formData.salaryAmount) || 0,
            currency: formData.salaryCurrency || 'USD',
            type: formData.salaryType || 'annual',
          },
        },
      };

      await axios.put(`/employees/${id}`, payload);
      toast.success('Updated');
      setEditing(false);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await axios.delete(`/employees/${id}`);
      toast.success('Deleted');
      navigate('/employees');
    } catch {
      toast.error('Failed');
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const updateAttendance = async (status) => {
    try {
      await axios.put(`/employees/${id}/attendance`, { status });
      toast.success(`Marked ${status}`);
      refetch();
    } catch {
      toast.error('Failed');
    }
  };

  const handleMarkLeave = async (e) => {
    e.preventDefault();
    setLeaveLoading(true);
    try {
      const days = Math.ceil(
        (new Date(leaveForm.endDate) - new Date(leaveForm.startDate)) /
          (1000 * 60 * 60 * 24)
      );
      await axios.put(`/employees/${id}/leave`, {
        ...leaveForm,
        totalDays: days,
      });
      toast.success(`On leave for ${days} days`);
      setShowLeaveModal(false);
      setLeaveForm({
        leaveType: 'annual',
        startDate: '',
        endDate: '',
        reason: '',
      });
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setLeaveLoading(false);
    }
  };

  const handleReturnFromLeave = async () => {
    try {
      await axios.put(`/employees/${id}/return-from-leave`);
      toast.success('Returned');
      refetch();
    } catch {
      toast.error('Failed');
    }
  };

  const handleTerminate = async () => {
    setTerminateLoading(true);
    try {
      await axios.put(`/employees/${id}/terminate`, {
        reason: 'Terminated by admin',
        terminationDate: new Date().toISOString(),
      });
      toast.success('Terminated');
      setShowTerminateModal(false);
      refetch();
    } catch {
      toast.error('Failed');
    } finally {
      setTerminateLoading(false);
    }
  };

  const handleReactivate = async () => {
    try {
      await axios.put(`/employees/${id}/reactivate`);
      toast.success('Reactivated');
      refetch();
    } catch {
      toast.error('Failed');
    }
  };

  if (loading)
    return (
      <div className="space-y-6">
        <PageHeader title="Employee" />
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        </div>
      </div>
    );
  if (!employee)
    return (
      <div className="space-y-6">
        <PageHeader title="Not Found" />
        <Card>
          <CardContent>
            <p className="text-center py-8">Employee not found</p>
            <Button onClick={() => navigate('/employees')} icon={ArrowLeft}>
              Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={`${employee.user?.firstName} ${employee.user?.lastName}`}
        description={`ID: ${employee.employeeId}`}
      >
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="secondary"
            onClick={() =>
              editing
                ? (setEditing(false), setFormData({}))
                : navigate('/employees')
            }
            icon={ArrowLeft}
          >
            {editing ? 'Cancel' : 'Back'}
          </Button>
          {editing ? (
            <Button onClick={handleSave} icon={Save} loading={saving}>
              Save
            </Button>
          ) : (
            <>
              <Button onClick={handleEdit} icon={Edit}>
                Edit
              </Button>
              {employee.status === 'on_leave' ? (
                <Button
                  onClick={handleReturnFromLeave}
                  icon={UserCheck}
                  variant="success"
                >
                  Return from Leave
                </Button>
              ) : employee.status === 'terminated' ? (
                <Button
                  onClick={handleReactivate}
                  icon={UserPlus}
                  variant="primary"
                >
                  Reactivate
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => setShowLeaveModal(true)}
                    icon={Clock}
                    variant="warning"
                  >
                    Mark Leave
                  </Button>
                  <Button
                    onClick={() => setShowTerminateModal(true)}
                    icon={XCircle}
                    variant="danger"
                  >
                    Terminate
                  </Button>
                </>
              )}
              {hasPermission('delete_users') && (
                <Button
                  variant="danger"
                  onClick={() => setShowDeleteDialog(true)}
                  icon={Trash2}
                >
                  Delete
                </Button>
              )}
            </>
          )}
        </div>
      </PageHeader>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-200 dark:bg-blue-700 flex items-center justify-center">
              <Shield className="w-4 h-4 text-blue-600 dark:text-blue-300" />
            </div>
            <p className="text-xs text-blue-500 font-medium">Status</p>
          </div>
          <Badge variant={statusColors[employee.status]} size="md">
            {statusLabels[employee.status]}
          </Badge>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4 border border-purple-200 dark:border-purple-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-200 dark:bg-purple-700 flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-purple-600 dark:text-purple-300" />
            </div>
            <p className="text-xs text-purple-500 font-medium">Position</p>
          </div>
          <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">
            {employee.position?.title || 'N/A'}
          </p>
          <Badge
            variant={levelColors[employee.position?.level]}
            size="sm"
            className="mt-1"
          >
            {employee.position?.level}
          </Badge>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-200 dark:bg-emerald-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
            </div>
            <p className="text-xs text-emerald-500 font-medium">Salary</p>
          </div>
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            {employee.workInfo?.salary?.currency || 'USD'}{' '}
            {(employee.workInfo?.salary?.amount || 0).toLocaleString()}
          </p>
          <p className="text-xs text-emerald-500">
            {employee.workInfo?.salary?.type || 'annual'}
          </p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-xl p-4 border border-amber-200 dark:border-amber-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-200 dark:bg-amber-700 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-300" />
            </div>
            <p className="text-xs text-amber-500 font-medium">Hired</p>
          </div>
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
            {employee.workInfo?.hireDate
              ? formatDate(employee.workInfo.hireDate)
              : 'N/A'}
          </p>
        </div>
      </div>

      {/* Attendance Status */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Status</CardTitle>
          <Badge
            variant={attendanceColors[employee.attendance?.status] || 'gray'}
            size="md"
          >
            {attendanceLabels[employee.attendance?.status] || 'Not Set'}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(attendanceLabels).map(([k, v]) => (
              <Button
                key={k}
                variant={
                  employee.attendance?.status === k ? 'primary' : 'secondary'
                }
                size="sm"
                onClick={() => updateAttendance(k)}
                className="capitalize"
              >
                {v}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Leave Banner */}
      {employee.currentLeave && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-4 flex items-center gap-3">
          <Clock className="w-6 h-6 text-yellow-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-yellow-700 dark:text-yellow-300">
              Currently on {employee.currentLeave.leaveType} leave
            </p>
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              {formatDate(employee.currentLeave.startDate)} →{' '}
              {formatDate(employee.currentLeave.endDate)} (
              {employee.currentLeave.totalDays} days)
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 overflow-x-auto">
        {[
          { id: 'profile', icon: User, label: 'Profile' },
          { id: 'overview', icon: FileText, label: 'Overview' },
          { id: 'attendance', icon: Clock, label: 'Attendance' },
          {
            id: 'leave',
            icon: Calendar,
            label: `Leave (${employee.leaveBalance?.annual || 0}d)`,
          },
          { id: 'skills', icon: Star, label: 'Skills' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          {/* Profile Tab - Personal Information + Logo/Avatar */}
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Avatar/Logo Card */}
              <Card>
                <CardContent className="text-center py-8">
                  <Avatar
                    name={`${employee.user?.firstName} ${employee.user?.lastName}`}
                    size="xl"
                    className="mx-auto mb-4"
                  />
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {employee.user?.firstName} {employee.user?.lastName}
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">
                    {employee.position?.title || 'No position'}
                  </p>
                  <Badge
                    variant={statusColors[employee.status]}
                    size="md"
                    className="mt-3"
                  >
                    {statusLabels[employee.status]}
                  </Badge>
                  <div className="mt-4 text-left space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-300">
                        {employee.user?.email}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-300">
                        {employee.personalInfo?.phone ||
                          employee.user?.phone ||
                          'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-300">
                        {employee.personalInfo?.address
                          ? `${employee.personalInfo.address.city}, ${employee.personalInfo.address.country}`
                          : 'No address'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Personal Information Card */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent>
                  {editing ? (
                    <div className="space-y-4">
                      {/* Basic Info */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            First Name
                          </label>
                          <input
                            type="text"
                            value={formData.firstName}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                firstName: e.target.value,
                              })
                            }
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Last Name
                          </label>
                          <input
                            type="text"
                            value={formData.lastName}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                lastName: e.target.value,
                              })
                            }
                            className="input-field"
                          />
                        </div>
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Phone
                        </label>
                        <input
                          type="text"
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value })
                          }
                          className="input-field"
                        />
                      </div>

                      {/* Position & Level */}
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Position Title
                        </label>
                        <input
                          type="text"
                          value={formData.positionTitle}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              positionTitle: e.target.value,
                            })
                          }
                          className="input-field"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Level
                          </label>
                          <select
                            value={formData.positionLevel}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                positionLevel: e.target.value,
                              })
                            }
                            className="input-field"
                          >
                            <option value="junior">Junior</option>
                            <option value="mid">Mid</option>
                            <option value="senior">Senior</option>
                            <option value="lead">Lead</option>
                            <option value="manager">Manager</option>
                            <option value="director">Director</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Department
                          </label>
                          <input
                            type="text"
                            value={formData.departmentName}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                departmentName: e.target.value,
                              })
                            }
                            className="input-field"
                          />
                        </div>
                      </div>

                      {/* Employment Type */}
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Employment Type
                        </label>
                        <select
                          value={formData.employmentType}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              employmentType: e.target.value,
                            })
                          }
                          className="input-field"
                        >
                          <option value="full_time">Full Time</option>
                          <option value="part_time">Part Time</option>
                          <option value="contract">Contract</option>
                          <option value="intern">Intern</option>
                          <option value="consultant">Consultant</option>
                        </select>
                      </div>

                      {/* Hire Date & Probation End Date */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Hire Date
                          </label>
                          <input
                            type="date"
                            value={formData.hireDate}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                hireDate: e.target.value,
                              })
                            }
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Probation End Date
                          </label>
                          <input
                            type="date"
                            value={formData.probationEndDate}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                probationEndDate: e.target.value,
                              })
                            }
                            className="input-field"
                          />
                        </div>
                      </div>

                      {/* Date of Birth & Gender */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Date of Birth
                          </label>
                          <input
                            type="date"
                            value={formData.dateOfBirth}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                dateOfBirth: e.target.value,
                              })
                            }
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Gender
                          </label>
                          <select
                            value={formData.gender}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                gender: e.target.value,
                              })
                            }
                            className="input-field"
                          >
                            <option value="">Select</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>

                      {/* Address Section */}
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                          Address
                        </h4>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Street
                          </label>
                          <input
                            type="text"
                            value={formData.street}
                            placeholder="123 Main St"
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                street: e.target.value,
                              })
                            }
                            className="input-field"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              City
                            </label>
                            <input
                              type="text"
                              value={formData.city}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  city: e.target.value,
                                })
                              }
                              className="input-field"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              State
                            </label>
                            <input
                              type="text"
                              value={formData.state}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  state: e.target.value,
                                })
                              }
                              className="input-field"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              Zip Code
                            </label>
                            <input
                              type="text"
                              value={formData.zipCode}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  zipCode: e.target.value,
                                })
                              }
                              className="input-field"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              Country
                            </label>
                            <input
                              type="text"
                              value={formData.country}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  country: e.target.value,
                                })
                              }
                              className="input-field"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Salary Section */}
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                          Salary Information
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              Amount
                            </label>
                            <input
                              type="number"
                              value={formData.salaryAmount}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  salaryAmount: e.target.value,
                                })
                              }
                              className="input-field"
                              min="0"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              Currency
                            </label>
                            <select
                              value={formData.salaryCurrency}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  salaryCurrency: e.target.value,
                                })
                              }
                              className="input-field"
                            >
                              <option value="USD">USD</option>
                              <option value="EUR">EUR</option>
                              <option value="GBP">GBP</option>
                              <option value="PKR">PKR</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              Type
                            </label>
                            <select
                              value={formData.salaryType}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  salaryType: e.target.value,
                                })
                              }
                              className="input-field"
                            >
                              <option value="annual">Annual</option>
                              <option value="monthly">Monthly</option>
                              <option value="hourly">Hourly</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <User className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Full Name</p>
                          <p className="font-medium">
                            {employee.user?.firstName} {employee.user?.lastName}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <Mail className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Email</p>
                          <p className="font-medium">{employee.user?.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <Phone className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Phone</p>
                          <p className="font-medium">
                            {employee.personalInfo?.phone ||
                              employee.user?.phone ||
                              'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Address</p>
                          <p className="font-medium">
                            {employee.personalInfo?.address
                              ? `${employee.personalInfo.address.city}, ${employee.personalInfo.address.country}`
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Date of Birth</p>
                          <p className="font-medium">
                            {employee.personalInfo?.dateOfBirth
                              ? formatDate(employee.personalInfo.dateOfBirth)
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <Shield className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Gender</p>
                          <p className="font-medium">
                            {employee.personalInfo?.gender || 'N/A'}
                          </p>
                        </div>
                      </div>
                      {employee.personalInfo?.emergencyContact?.name && (
                        <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/10 rounded-lg col-span-2">
                          <Heart className="w-5 h-5 text-red-400 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-red-500">
                              Emergency Contact
                            </p>
                            <p className="font-medium">
                              {employee.personalInfo.emergencyContact.name} (
                              {
                                employee.personalInfo.emergencyContact
                                  .relationship
                              }
                              )
                            </p>
                            <p className="text-sm text-red-400">
                              {employee.personalInfo.emergencyContact.phone}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Address Card (if exists) */}
              {employee.personalInfo?.address && (
                <Card className="lg:col-span-3">
                  <CardHeader>
                    <CardTitle>Address Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-xs text-gray-500">Street</p>
                        <p className="font-medium">
                          {employee.personalInfo.address.street || 'N/A'}
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-xs text-gray-500">City</p>
                        <p className="font-medium">
                          {employee.personalInfo.address.city || 'N/A'}
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-xs text-gray-500">State</p>
                        <p className="font-medium">
                          {employee.personalInfo.address.state || 'N/A'}
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-xs text-gray-500">Country</p>
                        <p className="font-medium">
                          {employee.personalInfo.address.country || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Overview Tab - Employment Details */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Employment Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <Briefcase className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Position</p>
                        <p className="font-medium">
                          {employee.position?.title || 'N/A'}{' '}
                          <Badge
                            variant={levelColors[employee.position?.level]}
                            size="sm"
                          >
                            {employee.position?.level}
                          </Badge>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <Building2 className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Department</p>
                        <p className="font-medium">
                          {employee.department?.name || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <Target className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Employee ID</p>
                        <p className="font-medium">{employee.employeeId}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <Shield className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Status</p>
                        <Badge variant={statusColors[employee.status]}>
                          {statusLabels[employee.status]}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Hire Date</p>
                        <p className="font-medium">
                          {employee.workInfo?.hireDate
                            ? formatDate(employee.workInfo.hireDate)
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <Activity className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Employment Type</p>
                        <p className="font-medium capitalize">
                          {employee.employmentType?.replace('_', ' ') || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <DollarSign className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Salary</p>
                        <p className="font-medium">
                          {employee.workInfo?.salary?.currency || 'USD'}{' '}
                          {(
                            employee.workInfo?.salary?.amount || 0
                          ).toLocaleString()}{' '}
                          <span className="text-xs text-gray-400">
                            ({employee.workInfo?.salary?.type})
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Probation End</p>
                        <p className="font-medium">
                          {employee.workInfo?.probationEndDate
                            ? formatDate(employee.workInfo.probationEndDate)
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-6">
                {/* Department Info */}
                {employee.department?.manager && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Reports To</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={
                            employee.department.manager?.firstName
                              ? `${employee.department.manager.firstName} ${employee.department.manager.lastName}`
                              : 'Manager'
                          }
                          size="md"
                        />
                        <div>
                          <p className="font-medium">
                            {employee.department.manager?.firstName}{' '}
                            {employee.department.manager?.lastName}
                          </p>
                          <p className="text-xs text-gray-500">
                            Department Manager
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Attendance Tab */}
          {activeTab === 'attendance' && (
            <Card>
              <CardHeader>
                <CardTitle>Attendance Status</CardTitle>
                <Badge
                  variant={
                    attendanceColors[employee.attendance?.status] || 'gray'
                  }
                  size="md"
                >
                  {attendanceLabels[employee.attendance?.status] || 'Not Set'}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                  {Object.entries(attendanceLabels).map(([k, v]) => (
                    <button
                      key={k}
                      onClick={() => updateAttendance(k)}
                      className={`p-4 rounded-xl border-2 text-center transition-all ${
                        employee.attendance?.status === k
                          ? `border-${attendanceColors[k]}-500 bg-${attendanceColors[k]}-50 dark:bg-${attendanceColors[k]}-900/20 shadow-sm`
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full bg-${attendanceColors[k]}-100 dark:bg-${attendanceColors[k]}-900/30 flex items-center justify-center mx-auto mb-2`}
                      >
                        {k === 'present' ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : k === 'absent' ? (
                          <XCircle className="w-5 h-5 text-red-600" />
                        ) : k === 'late' ? (
                          <Clock className="w-5 h-5 text-yellow-600" />
                        ) : k === 'half_day' ? (
                          <Activity className="w-5 h-5 text-orange-600" />
                        ) : (
                          <Target className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      <p className="text-sm font-medium">{v}</p>
                    </button>
                  ))}
                </div>
                {employee.attendance?.lastCheckIn && (
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span>
                      Last Check-in:{' '}
                      {new Date(
                        employee.attendance.lastCheckIn
                      ).toLocaleTimeString()}
                    </span>
                    {employee.attendance.lastCheckOut && (
                      <span>
                        Last Check-out:{' '}
                        {new Date(
                          employee.attendance.lastCheckOut
                        ).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Leave Tab */}
          {activeTab === 'leave' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Leave Balance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center border border-blue-200 dark:border-blue-700">
                        <Heart className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                          {employee.leaveBalance?.annual || 0}
                        </p>
                        <p className="text-xs text-blue-500">Annual Leave</p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center border border-green-200 dark:border-green-700">
                        <Shield className="w-6 h-6 text-green-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                          {employee.leaveBalance?.sick || 0}
                        </p>
                        <p className="text-xs text-green-500">Sick Leave</p>
                      </div>
                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 text-center border border-purple-200 dark:border-purple-700">
                        <UserCheck className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                          {employee.leaveBalance?.personal || 0}
                        </p>
                        <p className="text-xs text-purple-500">
                          Personal Leave
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center border border-gray-200 dark:border-gray-700">
                        <TrendingUp className="w-6 h-6 text-gray-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                          {employee.leaveBalance?.used || 0}
                        </p>
                        <p className="text-xs text-gray-500">Total Used</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {employee.leaveHistory?.length > 0 && (
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle>Leave History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {employee.leaveHistory.map((l, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-yellow-600" />
                              </div>
                              <div>
                                <p className="font-medium capitalize">
                                  {l.leaveType} Leave
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatDate(l.startDate)} →{' '}
                                  {formatDate(l.endDate)} ({l.totalDays} days)
                                </p>
                              </div>
                            </div>
                            <Badge variant="green" size="sm">
                              Completed
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Skills Tab */}
          {activeTab === 'skills' && (
            <Card>
              <CardHeader>
                <CardTitle>Skills</CardTitle>
              </CardHeader>
              <CardContent>
                {employee.skills?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {employee.skills.map((s, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-center gap-3">
                          <Star className="w-5 h-5 text-yellow-500" />
                          <div>
                            <p className="font-medium">{s.name}</p>
                            <p className="text-xs text-gray-500">
                              {s.yearsOfExperience} years
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={
                            s.level === 'expert'
                              ? 'green'
                              : s.level === 'advanced'
                                ? 'blue'
                                : s.level === 'intermediate'
                                  ? 'yellow'
                                  : 'gray'
                          }
                          size="sm"
                        >
                          {s.level}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={Star} title="No skills listed" />
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Leave Modal */}
      <Modal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        title="Mark on Leave"
        size="md"
      >
        <form onSubmit={handleMarkLeave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Leave Type</label>
            <select
              value={leaveForm.leaveType}
              onChange={(e) =>
                setLeaveForm({ ...leaveForm, leaveType: e.target.value })
              }
              className="input-field"
            >
              <option value="annual">
                Annual ({employee?.leaveBalance?.annual || 0}d)
              </option>
              <option value="sick">
                Sick ({employee?.leaveBalance?.sick || 0}d)
              </option>
              <option value="personal">
                Personal ({employee?.leaveBalance?.personal || 0}d)
              </option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={leaveForm.startDate}
              onChange={(e) =>
                setLeaveForm({ ...leaveForm, startDate: e.target.value })
              }
              required
            />
            <Input
              label="End Date"
              type="date"
              value={leaveForm.endDate}
              onChange={(e) =>
                setLeaveForm({ ...leaveForm, endDate: e.target.value })
              }
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Reason</label>
            <textarea
              value={leaveForm.reason}
              onChange={(e) =>
                setLeaveForm({ ...leaveForm, reason: e.target.value })
              }
              className="input-field"
              rows={2}
            />
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowLeaveModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" loading={leaveLoading} className="flex-1">
              Mark Leave
            </Button>
          </div>
        </form>
      </Modal>

      {/* Terminate Confirmation */}
      <ConfirmDialog
        isOpen={showTerminateModal}
        onClose={() => setShowTerminateModal(false)}
        onConfirm={handleTerminate}
        loading={terminateLoading}
        title="Terminate Employee"
        message={`Terminate ${employee?.user?.firstName} ${employee?.user?.lastName}?`}
        confirmText="Terminate"
        variant="danger"
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Employee"
        message={`Permanently delete ${employee?.user?.firstName} ${employee?.user?.lastName}?`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default EmployeeDetail;
