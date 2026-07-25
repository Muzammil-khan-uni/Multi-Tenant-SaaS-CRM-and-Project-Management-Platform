import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useWorkspaceNavigate as useNavigate } from '../../hooks/useWorkspaceNavigate';
import {
  FileText,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  Calendar,
  Building2,
  TrendingUp,
  TrendingDown,
  XCircle,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { usePermissions } from '../../hooks/usePermissions';
import { useInvoiceStats } from '../../hooks/useInvoiceStats';
import axios from '../../api/axios';
import toast from 'react-hot-toast';
import { formatDate } from '../../utils/helpers';
import { formatCurrency } from '../../utils/currency';

const statusColors = {
  draft: 'gray',
  sent: 'blue',
  paid: 'green',
  overdue: 'red',
  cancelled: 'red',
  refunded: 'purple',
};
const statusLabels = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

const Invoices = () => {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 10;
  const [initialized, setInitialized] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const { stats } = useInvoiceStats();

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (statusFilter !== 'all') params.append('status', statusFilter);
      const { data } = await axios.get(`/invoices?${params.toString()}`);
      setInvoices(Array.isArray(data.data) ? data.data : []);
      setTotalCount(data.pagination?.totalCount || data.count || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, statusFilter]);

  if (!initialized) {
    setInitialized(true);
    fetchInvoices();
  }

  const [prevParams, setPrevParams] = useState({});
  const currentParams = { page, searchTerm, statusFilter };
  if (JSON.stringify(currentParams) !== JSON.stringify(prevParams)) {
    setPrevParams(currentParams);
    fetchInvoices();
  }

  const handlePermanentDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await axios.delete(`/invoices/${deleteTarget._id}/permanent`);
      toast.success('Invoice permanently deleted');
      setDeleteTarget(null);
      fetchInvoices();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete invoice');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCancelInvoice = async () => {
    if (!cancelTarget) return;
    setCancelLoading(true);
    try {
      await axios.put(`/invoices/${cancelTarget._id}/cancel`);
      toast.success('Invoice cancelled');
      setCancelTarget(null);
      fetchInvoices();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel invoice');
    } finally {
      setCancelLoading(false);
    }
  };

  const hasActiveFilters = searchTerm || statusFilter !== 'all';
  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" description={`${totalCount} total invoices`}>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchInvoices}
            icon={RefreshCw}
            loading={loading}
          >
            Refresh
          </Button>
          {hasPermission('create_invoices') && (
            <Button icon={Plus} onClick={() => navigate('/invoices/new')}>
              Create Invoice
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Stats Cards - Uses stats from ALL invoices */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total Revenue Card */}
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-emerald-500 dark:text-emerald-400 font-medium">
              Total Revenue
            </p>
            <div className="w-8 h-8 rounded-lg bg-emerald-200 dark:bg-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
            </div>
          </div>
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
            ${stats.totalPaidUSD?.toLocaleString()}
          </p>
          <p className="text-xs text-emerald-500 mt-1">
            {stats.paidInvoices} paid invoices
          </p>
        </div>

        {/* Outstanding Card */}
        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-xl p-4 border border-red-200 dark:border-red-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-red-500 dark:text-red-400 font-medium">
              Outstanding
            </p>
            <div className="w-8 h-8 rounded-lg bg-red-200 dark:bg-red-700 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-300" />
            </div>
          </div>
          <p className="text-xl font-bold text-red-700 dark:text-red-300">
            ${stats.totalOutstandingUSD?.toLocaleString()}
          </p>
          <p className="text-xs text-red-500 mt-1">
            {stats.paymentRate}% collection rate
          </p>
        </div>

        {/* Total Invoices Card */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-blue-500 dark:text-blue-400 font-medium">
              Total Invoices
            </p>
            <div className="w-8 h-8 rounded-lg bg-blue-200 dark:bg-blue-700 flex items-center justify-center">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-300" />
            </div>
          </div>
          <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
            {stats.totalInvoices}
          </p>
          <div className="flex gap-2 mt-1">
            <Badge variant="green" size="sm">
              {stats.paidInvoices} paid
            </Badge>
            <Badge variant="blue" size="sm">
              {stats.sentInvoices} sent
            </Badge>
          </div>
        </div>

        {/* Overdue Card */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4 border border-purple-200 dark:border-purple-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-purple-500 dark:text-purple-400 font-medium">
              Overdue
            </p>
            <div className="w-8 h-8 rounded-lg bg-purple-200 dark:bg-purple-700 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-300" />
            </div>
          </div>
          <p className="text-xl font-bold text-purple-700 dark:text-purple-300">
            {stats.overdueInvoices}
          </p>
          <p className="text-xs text-purple-500 mt-1">Requires attention</p>
        </div>
      </div>

      {/* Currency Breakdown */}
      {stats.currencyTotals && Object.keys(stats.currencyTotals).length > 1 && (
        <Card>
          <CardContent>
            <p className="text-xs text-gray-500 mb-3">
              All stats shown in USD • Exchange rates updated hourly
            </p>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(stats.currencyTotals).map(([currency, data]) => (
                <div
                  key={currency}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <span className="text-sm font-medium">{currency}</span>
                  <span className="text-xs text-gray-500">
                    {data.count} invoices
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search & Filters */}
      <Card>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by invoice number, client name..."
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
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invoices List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <TableSkeleton rows={5} />
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={fetchInvoices} icon={RefreshCw}>
                Retry
              </Button>
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={FileText}
                title="No invoices"
                description="Create your first invoice"
                action={
                  hasPermission('create_invoices')
                    ? {
                        label: 'Create Invoice',
                        icon: Plus,
                        onClick: () => navigate('/invoices/new'),
                      }
                    : undefined
                }
              />
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {invoices.map((inv, i) => (
                  <motion.div
                    key={inv._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.03 }}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                    onClick={() => navigate(`/invoices/${inv._id}`)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{inv.number}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                            {inv.client?.company?.name && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {inv.client.company.name}
                              </span>
                            )}
                            {inv.dueDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Due: {formatDate(inv.dueDate)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-14 sm:ml-0">
                        <div className="text-right">
                          <p className="font-semibold">
                            {formatCurrency(inv.total, inv.currency)}
                          </p>
                          {inv.balanceDue > 0 && inv.status !== 'paid' && (
                            <p className="text-xs text-red-500">
                              Balance:{' '}
                              {formatCurrency(inv.balanceDue, inv.currency)}
                            </p>
                          )}
                        </div>
                        <Badge variant={statusColors[inv.status]} size="sm">
                          {statusLabels[inv.status]}
                        </Badge>
                        <div className="w-20">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${inv.status === 'paid' ? 'bg-green-500' : 'bg-blue-500'}`}
                              style={{
                                width: `${inv.total > 0 ? Math.min(100, Math.round(((inv.amountPaid || 0) / inv.total) * 100)) : 0}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {/* Cancel Button */}
                          {hasPermission('delete_invoices') &&
                            inv.status !== 'cancelled' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCancelTarget(inv);
                                }}
                                className="p-1 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded transition-colors"
                                title="Cancel invoice"
                              >
                                <XCircle className="w-4 h-4 text-yellow-600" />
                              </button>
                            )}

                          {/* Delete Button */}
                          {hasPermission('delete_invoices') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget(inv);
                              }}
                              className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                              title="Delete permanently"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              {totalCount > limit && (
                <div className="px-4 py-3 border-t flex justify-between items-center">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {page} of {totalPages}
                  </span>
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
        </CardContent>
      </Card>

      {/* Cancel Invoice Confirmation */}
      <ConfirmDialog
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancelInvoice}
        loading={cancelLoading}
        title="Cancel Invoice"
        message={`Cancel invoice ${cancelTarget?.number}? It will be marked as cancelled.`}
        confirmText="Cancel Invoice"
        variant="warning"
      />

      {/* Delete Invoice Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handlePermanentDelete}
        loading={deleteLoading}
        title="Delete Invoice Permanently"
        message={`Permanently delete invoice ${deleteTarget?.number}? This cannot be undone.`}
        confirmText="Delete Permanently"
        variant="danger"
      />
    </div>
  );
};

export default Invoices;
