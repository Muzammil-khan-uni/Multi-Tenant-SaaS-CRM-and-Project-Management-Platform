import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useWorkspaceNavigate as useNavigate } from '../../hooks/useWorkspaceNavigate';
import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  Trash2,
  Briefcase,
  Building2,
  Mail,
  Calendar,
  Clock,
  TrendingUp,
  Shield,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Avatar } from '../../components/common/Avatar';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { usePermissions } from '../../hooks/usePermissions';
import axios from '../../api/axios';
import toast from 'react-hot-toast';

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
const statusIcons = {
  active: TrendingUp,
  inactive: Clock,
  on_leave: Calendar,
  terminated: Shield,
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
};
const levelLabels = {
  junior: 'Junior',
  mid: 'Mid-Level',
  senior: 'Senior',
  lead: 'Team Lead',
  manager: 'Manager',
  director: 'Director',
};

const Employees = () => {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');

  const [page, setPage] = useState(1);
  const limit = 9;

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const [departments, setDepartments] = useState([]);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (departmentFilter !== 'all')
        params.append('department', departmentFilter);

      const { data } = await axios.get(`/employees?${params.toString()}`);
      const empList = data.data || data || [];
      setEmployees(Array.isArray(empList) ? empList : []);
      setTotalCount(
        data.pagination?.totalCount || data.count || empList.length || 0
      );

      const depts = [
        ...new Set(empList.map((e) => e.department?.name).filter(Boolean)),
      ];
      setDepartments(depts);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, statusFilter, departmentFilter]);

  if (!initialized) {
    setInitialized(true);
    fetchEmployees();
  }

  const [prevParams, setPrevParams] = useState({});
  const currentParams = { page, searchTerm, statusFilter, departmentFilter };
  if (JSON.stringify(currentParams) !== JSON.stringify(prevParams)) {
    setPrevParams(currentParams);
    fetchEmployees();
  }

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await axios.delete(`/employees/${deleteTarget._id}`);
      toast.success('Employee deleted');
      setDeleteTarget(null);
      fetchEmployees();
    } catch {
      toast.error('Failed');
    } finally {
      setDeleteLoading(false);
    }
  };

  const hasActiveFilters =
    searchTerm || statusFilter !== 'all' || departmentFilter !== 'all';
  const totalPages = Math.ceil(totalCount / limit);

  const activeCount = employees.filter((e) => e.status === 'active').length;
  const onLeaveCount = employees.filter((e) => e.status === 'on_leave').length;
  const presentToday = employees.filter(
    (e) => e.attendance?.status === 'present'
  ).length;
  const departmentsCount = departments.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        description={`${totalCount} total employees`}
      >
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchEmployees}
            icon={RefreshCw}
            loading={loading}
          >
            Refresh
          </Button>
          {hasPermission('create_users') && (
            <Button icon={UserPlus} onClick={() => navigate('/employees/new')}>
              Add Employee
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4 border border-green-200 dark:border-green-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-200 dark:bg-green-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-xs text-green-500 font-medium">Active</p>
          </div>
          <p className="text-xl font-bold text-green-700 dark:text-green-300">
            {activeCount}
          </p>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-yellow-200 dark:bg-yellow-700 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-yellow-600" />
            </div>
            <p className="text-xs text-yellow-500 font-medium">On Leave</p>
          </div>
          <p className="text-xl font-bold text-yellow-700 dark:text-yellow-300">
            {onLeaveCount}
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-200 dark:bg-blue-700 flex items-center justify-center">
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xs text-blue-500 font-medium">Present Today</p>
          </div>
          <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
            {presentToday}
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4 border border-purple-200 dark:border-purple-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-200 dark:bg-purple-700 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-xs text-purple-500 font-medium">Departments</p>
          </div>
          <p className="text-xl font-bold text-purple-700 dark:text-purple-300">
            {departmentsCount}
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, ID..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-9 pr-4 py-2.5 border rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-600"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="border rounded-lg text-sm px-3 py-2.5 dark:bg-gray-800 dark:border-gray-600"
            >
              <option value="all">All Status</option>
              {Object.entries(statusLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <select
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value);
                setPage(1);
              }}
              className="border rounded-lg text-sm px-3 py-2.5 dark:bg-gray-800 dark:border-gray-600"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg border ${viewMode === 'grid' ? 'bg-primary-50 border-primary-300 dark:bg-primary-900/20' : 'border-gray-300 dark:border-gray-600'}`}
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg border ${viewMode === 'list' ? 'bg-primary-50 border-primary-300 dark:bg-primary-900/20' : 'border-gray-300 dark:border-gray-600'}`}
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z" />
                </svg>
              </button>
            </div>
            {hasActiveFilters && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setDepartmentFilter('all');
                  setPage(1);
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Employees Grid/List */}
      {loading ? (
        <div
          className={`grid grid-cols-1 ${viewMode === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : ''} gap-4`}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl h-48"
            />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent>
            <div className="text-center py-12">
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={fetchEmployees} icon={RefreshCw}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : employees.length === 0 ? (
        <Card>
          <CardContent>
            <div className="p-6">
              <EmptyState
                icon={Users}
                title={
                  hasActiveFilters ? 'No employees match' : 'No employees yet'
                }
                description={
                  hasActiveFilters
                    ? 'Try adjusting filters'
                    : 'Add your first employee'
                }
                action={
                  hasActiveFilters
                    ? {
                        label: 'Clear Filters',
                        onClick: () => {
                          setSearchTerm('');
                          setStatusFilter('all');
                          setDepartmentFilter('all');
                        },
                      }
                    : hasPermission('create_users')
                      ? {
                          label: 'Add Employee',
                          icon: UserPlus,
                          onClick: () => navigate('/employees/new'),
                        }
                      : undefined
                }
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div
            className={`grid grid-cols-1 ${viewMode === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : ''} gap-4`}
          >
            {employees.map((emp, i) => {
              const StatusIcon = statusIcons[emp.status] || Users;
              const attendanceStatus = emp.attendance?.status;

              return (
                <motion.div
                  key={emp._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-600 transition-all cursor-pointer overflow-hidden"
                  onClick={() => navigate(`/employees/${emp._id}`)}
                >
                  {/* Status Bar */}
                  <div
                    className={`h-1.5 bg-${statusColors[emp.status] || 'gray'}-500`}
                  />

                  <div className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar
                          name={`${emp.user?.firstName} ${emp.user?.lastName}`}
                          size="md"
                        />
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-primary-600 transition-colors">
                            {emp.user?.firstName} {emp.user?.lastName}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {emp.employeeId}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {attendanceStatus && (
                          <div
                            className={`w-2 h-2 rounded-full bg-${attendanceColors[attendanceStatus] || 'gray'}-500`}
                            title={attendanceLabels[attendanceStatus]}
                          />
                        )}
                        <Badge variant={statusColors[emp.status]} size="sm">
                          <StatusIcon className="w-3 h-3 mr-1 inline" />
                          {statusLabels[emp.status]}
                        </Badge>
                        {hasPermission('delete_users') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(emp);
                            }}
                            className="p-1 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="space-y-1.5 mb-4">
                      {emp.user?.email && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{emp.user.email}</span>
                        </div>
                      )}
                      {emp.position?.title && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Briefcase className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{emp.position.title}</span>
                          <Badge
                            variant={levelColors[emp.position.level]}
                            size="sm"
                          >
                            {levelLabels[emp.position.level] ||
                              emp.position.level}
                          </Badge>
                        </div>
                      )}
                      {emp.department?.name && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{emp.department.name}</span>
                        </div>
                      )}
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                      <div className="text-center">
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {emp.workInfo?.hireDate
                            ? new Date(emp.workInfo.hireDate).getFullYear()
                            : '—'}
                        </p>
                        <p className="text-xs text-gray-500">Hired</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-primary-600">
                          {emp.workInfo?.salary?.currency || '$'}{' '}
                          {(emp.workInfo?.salary?.amount || 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">Salary</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold capitalize text-gray-900 dark:text-white">
                          {emp.employmentType?.replace('_', ' ') || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500">Type</p>
                      </div>
                    </div>

                    {/* Attendance Status */}
                    {attendanceStatus && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <div
                          className={`w-2 h-2 rounded-full bg-${attendanceColors[attendanceStatus]}-500`}
                        />
                        <span className="text-xs text-gray-500">Today:</span>
                        <Badge
                          variant={attendanceColors[attendanceStatus]}
                          size="sm"
                        >
                          {attendanceLabels[attendanceStatus]}
                        </Badge>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
                        p === page
                          ? 'bg-primary-600 text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Delete Employee"
        message={`Delete ${deleteTarget?.user?.firstName} ${deleteTarget?.user?.lastName}? This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default Employees;
