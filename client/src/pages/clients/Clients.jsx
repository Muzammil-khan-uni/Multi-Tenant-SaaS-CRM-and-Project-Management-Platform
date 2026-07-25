import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useWorkspaceNavigate as useNavigate } from '../../hooks/useWorkspaceNavigate';
import {
  Users,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  Star,
  DollarSign,
  TrendingUp,
  Calendar,
  Briefcase,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { usePermissions } from '../../hooks/usePermissions';
import axios from '../../api/axios';
import toast from 'react-hot-toast';

const statusColors = {
  active: 'green',
  inactive: 'gray',
  lead: 'blue',
  prospect: 'yellow',
  churned: 'red',
  on_hold: 'orange',
};
const statusLabels = {
  active: 'Active',
  inactive: 'Inactive',
  lead: 'Lead',
  prospect: 'Prospect',
  churned: 'Churned',
  on_hold: 'On Hold',
};
const statusIcons = {
  active: TrendingUp,
  lead: Star,
  prospect: Users,
  churned: Trash2,
  on_hold: Calendar,
};

const Clients = () => {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');

  const [page, setPage] = useState(1);
  const limit = 9;

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const { data } = await axios.get(`/clients?${params.toString()}`);
      setClients(Array.isArray(data.data) ? data.data : []);
      setTotalCount(data.pagination?.totalCount || data.count || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, statusFilter]);

  if (!initialized) {
    setInitialized(true);
    fetchClients();
  }

  const [prevParams, setPrevParams] = useState({});
  const currentParams = { page, searchTerm, statusFilter };
  if (JSON.stringify(currentParams) !== JSON.stringify(prevParams)) {
    setPrevParams(currentParams);
    fetchClients();
  }

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await axios.delete(`/clients/${deleteTarget._id}`);
      toast.success('Client deleted');
      setDeleteTarget(null);
      fetchClients();
    } catch {
      toast.error('Failed');
    } finally {
      setDeleteLoading(false);
    }
  };

  const hasActiveFilters = searchTerm || statusFilter !== 'all';
  const totalPages = Math.ceil(totalCount / limit);

  const activeClients = clients.filter((c) => c.status === 'active').length;
  const leadClients = clients.filter(
    (c) => c.status === 'lead' || c.status === 'prospect'
  ).length;
  const totalRevenue = clients.reduce(
    (sum, c) => sum + (c.totalRevenue || 0),
    0
  );
  const avgProjects =
    clients.length > 0
      ? Math.round(
          clients.reduce((sum, c) => sum + (c.totalProjects || 0), 0) /
            clients.length
        )
      : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Clients" description={`${totalCount} total clients`}>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchClients}
            icon={RefreshCw}
            loading={loading}
          >
            Refresh
          </Button>
          {hasPermission('create_clients') && (
            <Button icon={Plus} onClick={() => navigate('/clients/new')}>
              Add Client
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
            <p className="text-xs text-green-500 font-medium">Active Clients</p>
          </div>
          <p className="text-xl font-bold text-green-700 dark:text-green-300">
            {activeClients}
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-200 dark:bg-blue-700 flex items-center justify-center">
              <Star className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xs text-blue-500 font-medium">
              Leads & Prospects
            </p>
          </div>
          <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
            {leadClients}
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4 border border-purple-200 dark:border-purple-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-200 dark:bg-purple-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-xs text-purple-500 font-medium">Total Revenue</p>
          </div>
          <p className="text-xl font-bold text-purple-700 dark:text-purple-300">
            ${totalRevenue.toLocaleString()}
          </p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-4 border border-orange-200 dark:border-orange-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-orange-200 dark:bg-orange-700 flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-xs text-orange-500 font-medium">Avg Projects</p>
          </div>
          <p className="text-xl font-bold text-orange-700 dark:text-orange-300">
            {avgProjects}
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
                placeholder="Search by name, email, city, industry..."
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
                  setPage(1);
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Clients Grid/List */}
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
              <Button onClick={fetchClients} icon={RefreshCw}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : clients.length === 0 ? (
        <Card>
          <CardContent>
            <div className="p-6">
              <EmptyState
                icon={Users}
                title={hasActiveFilters ? 'No clients match' : 'No clients yet'}
                description={
                  hasActiveFilters
                    ? 'Try adjusting filters'
                    : 'Add your first client'
                }
                action={
                  hasActiveFilters
                    ? {
                        label: 'Clear Filters',
                        onClick: () => {
                          setSearchTerm('');
                          setStatusFilter('all');
                        },
                      }
                    : hasPermission('create_clients')
                      ? {
                          label: 'Add Client',
                          icon: Plus,
                          onClick: () => navigate('/clients/new'),
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
            {clients.map((client, i) => {
              const StatusIcon = statusIcons[client.status] || Building2;
              const primaryContact =
                client.contacts?.find((c) => c.isPrimary) ||
                client.contacts?.[0];

              return (
                <motion.div
                  key={client._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-600 transition-all cursor-pointer overflow-hidden"
                  onClick={() => navigate(`/clients/${client._id}`)}
                >
                  {/* Status Bar */}
                  <div
                    className={`h-1.5 bg-${statusColors[client.status] || 'gray'}-500`}
                  />

                  <div className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-primary-600 transition-colors">
                            {client.company?.name || 'Unnamed'}
                          </h3>
                          {client.company?.industry && (
                            <p className="text-xs text-gray-500">
                              {client.company.industry}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Badge variant={statusColors[client.status]} size="sm">
                          <StatusIcon className="w-3 h-3 mr-1 inline" />
                          {statusLabels[client.status]}
                        </Badge>
                        {hasPermission('delete_clients') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(client);
                            }}
                            className="p-1 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-1.5 mb-4">
                      {primaryContact?.email && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">
                            {primaryContact.email}
                          </span>
                        </div>
                      )}
                      {primaryContact?.phone && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{primaryContact.phone}</span>
                        </div>
                      )}
                      {client.address?.city && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">
                            {client.address.city}
                            {client.address.country
                              ? `, ${client.address.country}`
                              : ''}
                          </span>
                        </div>
                      )}
                      {client.company?.website && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate text-primary-500">
                            {client.company.website}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                      <div className="text-center">
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {client.totalProjects || 0}
                        </p>
                        <p className="text-xs text-gray-500">Projects</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-green-600">
                          ${(client.totalRevenue || 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">Revenue</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {client.contacts?.length || 0}
                        </p>
                        <p className="text-xs text-gray-500">Contacts</p>
                      </div>
                    </div>

                    {/* Tags */}
                    {client.tags?.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        {client.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="primary" size="sm">
                            {tag}
                          </Badge>
                        ))}
                        {client.tags.length > 3 && (
                          <Badge variant="gray" size="sm">
                            +{client.tags.length - 3}
                          </Badge>
                        )}
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
        title="Delete Client"
        message={`Delete "${deleteTarget?.company?.name}"? This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default Clients;
