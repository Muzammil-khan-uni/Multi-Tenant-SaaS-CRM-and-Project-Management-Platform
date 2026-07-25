import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useWorkspaceNavigate as useNavigate } from '../../hooks/useWorkspaceNavigate';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Edit,
  Save,
  Trash2,
  DollarSign,
  Calendar,
  Plus,
  Building2,
  FileText,
  Send,
  CreditCard,
  History,
  Download,
  XCircle,
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
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import { usePermissions } from '../../hooks/usePermissions';
import axios from '../../api/axios';
import toast from 'react-hot-toast';
import { formatDate, timeAgo } from '../../utils/helpers';
import {
  formatCurrency,
  getCurrencySymbol,
  getCurrencyOptions,
} from '../../utils/currency';

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

const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    method: 'bank_transfer',
    transactionId: '',
    notes: '',
  });
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [initialized, setInitialized] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const loadInvoice = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`/invoices/${id}`);
      setInvoice(data.data);
    } catch {
      toast.error('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  if (!initialized) {
    setInitialized(true);
    loadInvoice();
  }
  const handleEdit = () => {
    setFormData({
      status: invoice?.status || 'draft',
      currency: invoice?.currency || 'USD',
      dueDate: invoice?.dueDate
        ? new Date(invoice.dueDate).toISOString().split('T')[0]
        : '',
      paymentTerms: invoice?.paymentTerms || '',
      notes: invoice?.notes || '',
      terms: invoice?.termsAndConditions || '',

      items:
        invoice?.items?.length > 0
          ? invoice.items.map((item) => ({
              description: item.description || '',
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice || 0,
            }))
          : [{ description: '', quantity: 1, unitPrice: 0 }],
      discount: invoice?.discount || 0,
      discountType: invoice?.discountType || 'fixed',
    });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`/invoices/${id}`, {
        status: formData.status,
        currency: formData.currency,
        dueDate: formData.dueDate,
        paymentTerms: formData.paymentTerms,
        notes: formData.notes?.trim() || undefined,
        termsAndConditions: formData.terms?.trim() || undefined,

        items: formData.items.map((item) => ({
          description: item.description.trim(),
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
        discount: Number(formData.discount) || 0,
        discountType: formData.discountType,
      });
      toast.success('Invoice updated');
      setEditing(false);
      loadInvoice();
    } catch {
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handlePermanentDelete = async () => {
    setDeleting(true);
    try {
      await axios.delete(`/invoices/${id}/permanent`);
      toast.success('Invoice permanently deleted');
      navigate('/invoices');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete invoice');
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleCancelInvoice = async () => {
    setCancelling(true);
    try {
      await axios.put(`/invoices/${id}/cancel`);
      toast.success('Invoice cancelled');
      setShowCancelDialog(false);
      loadInvoice(); // Refresh the invoice data
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel invoice');
    } finally {
      setCancelling(false);
    }
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unitPrice: 0 }],
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateItem = (index, field, value) => {
    setFormData((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const handleSend = async () => {
    try {
      await axios.post(`/invoices/${id}/send`);
      toast.success('Invoice sent');
      loadInvoice();
    } catch {
      toast.error('Failed to send');
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setPaymentLoading(true);
    try {
      await axios.post(`/invoices/${id}/payments`, {
        amount: Number(paymentForm.amount),
        method: paymentForm.method,
        transactionId: paymentForm.transactionId,
        notes: paymentForm.notes,
      });
      toast.success('Payment recorded');
      setShowPayment(false);
      setPaymentForm({
        amount: 0,
        method: 'bank_transfer',
        transactionId: '',
        notes: '',
      });
      loadInvoice();
    } catch {
      toast.error('Failed to record payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      toast.loading('Generating PDF...');

      const response = await axios.get(`/invoices/${id}/download`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(
        new Blob([response.data], { type: 'application/pdf' })
      );
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice-${invoice.number}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.dismiss();
      toast.success('Invoice downloaded as PDF');
    } catch (error) {
      console.error('Download failed:', error);
      toast.dismiss();
      toast.error('Failed to download invoice');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Invoice Details" />
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="space-y-6">
        <PageHeader title="Not Found" />
        <Card>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">
                Invoice not found
              </p>
              <Button
                onClick={() => navigate('/invoices')}
                icon={ArrowLeft}
                className="mt-4"
              >
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const paymentProgress =
    invoice.total > 0
      ? Math.min(
          100,
          Math.round(((invoice.amountPaid || 0) / invoice.total) * 100)
        )
      : 0;
  const isOverdue =
    invoice.dueDate &&
    new Date(invoice.dueDate) < new Date() &&
    !['paid', 'cancelled'].includes(invoice.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={`Invoice ${invoice.number}`}
        description={`Created ${timeAgo(invoice.createdAt)}`}
      >
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="secondary"
            onClick={() =>
              editing
                ? (setEditing(false), setFormData({}))
                : navigate('/invoices')
            }
            icon={ArrowLeft}
          >
            {editing ? 'Cancel' : 'Back'}
          </Button>
          {editing ? (
            <Button onClick={handleSave} icon={Save} loading={saving}>
              Save Changes
            </Button>
          ) : (
            <>
              {hasPermission('update_invoices') && (
                <Button onClick={handleEdit} icon={Edit}>
                  Edit
                </Button>
              )}
              {hasPermission('send_invoices') && invoice.status === 'draft' && (
                <Button onClick={handleSend} icon={Send} variant="primary">
                  Send
                </Button>
              )}
              {hasPermission('record_payments') &&
                !['paid', 'cancelled'].includes(invoice.status) && (
                  <Button
                    onClick={() => setShowPayment(true)}
                    icon={CreditCard}
                    variant="success"
                  >
                    Record Payment
                  </Button>
                )}
              <Button
                onClick={handleDownload}
                icon={Download}
                variant="secondary"
              >
                Download
              </Button>
              {/* Cancel Button - Only show for non-cancelled invoices */}
              {hasPermission('delete_invoices') &&
                invoice.status !== 'cancelled' && (
                  <Button
                    variant="warning"
                    onClick={() => setShowCancelDialog(true)}
                    icon={XCircle}
                  >
                    Cancel Invoice
                  </Button>
                )}

              {/* Delete Button - Permanent deletion */}
              {hasPermission('delete_invoices') && (
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

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
          <p className="text-xs text-blue-500 dark:text-blue-400 font-medium mb-1">
            Status
          </p>
          <Badge variant={statusColors[invoice.status]} size="md">
            {statusLabels[invoice.status]}
          </Badge>
          {isOverdue && <p className="text-xs text-red-500 mt-1">⚠ Overdue</p>}
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-700">
          <p className="text-xs text-emerald-500 dark:text-emerald-400 font-medium mb-1">
            Total Amount
          </p>
          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
            {formatCurrency(invoice.total, invoice.currency)}
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4 border border-purple-200 dark:border-purple-700">
          <p className="text-xs text-purple-500 dark:text-purple-400 font-medium mb-1">
            Amount Paid
          </p>
          <p className="text-lg font-bold text-purple-700 dark:text-purple-300">
            {formatCurrency(invoice.amountPaid || 0, invoice.currency)}
          </p>
        </div>
        <div
          className={`bg-gradient-to-br rounded-xl p-4 border ${
            invoice.balanceDue > 0
              ? 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-700'
              : 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700'
          }`}
        >
          <p
            className={`text-xs font-medium mb-1 ${invoice.balanceDue > 0 ? 'text-red-500' : 'text-green-500'}`}
          >
            Balance Due
          </p>
          <p
            className={`text-lg font-bold ${invoice.balanceDue > 0 ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}
          >
            {formatCurrency(invoice.balanceDue || 0, invoice.currency)}
          </p>
        </div>
      </div>

      {/* Payment Progress */}
      <Card>
        <CardContent>
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Payment Progress
              </span>
              <span className="text-sm text-gray-500 ml-2">
                {formatCurrency(invoice.amountPaid || 0, invoice.currency)} /{' '}
                {formatCurrency(invoice.total, invoice.currency)}
              </span>
            </div>
            <span
              className={`text-sm font-bold ${paymentProgress >= 100 ? 'text-green-600' : 'text-blue-600'}`}
            >
              {paymentProgress}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                paymentProgress >= 100 ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${paymentProgress}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 overflow-x-auto">
        {[
          { id: 'details', icon: FileText, label: 'Details' },
          { id: 'items', icon: DollarSign, label: 'Items' },
          {
            id: 'payments',
            icon: CreditCard,
            label: `Payments (${invoice.payments?.length || 0})`,
          },
          { id: 'activity', icon: History, label: 'Activity' },
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
          transition={{ duration: 0.2 }}
        >
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Invoice Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {editing ? (
                      <div className="space-y-6">
                        {/* Basic Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Status
                            </label>
                            <select
                              value={formData.status}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  status: e.target.value,
                                })
                              }
                              className="input-field"
                            >
                              {Object.entries(statusLabels).map(([k, v]) => (
                                <option key={k} value={k}>
                                  {v}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Currency
                            </label>
                            <select
                              value={formData.currency}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  currency: e.target.value,
                                })
                              }
                              className="input-field"
                            >
                              {getCurrencyOptions().map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Input
                            label="Due Date"
                            type="date"
                            icon={Calendar}
                            value={formData.dueDate}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                dueDate: e.target.value,
                              })
                            }
                          />
                          <Input
                            label="Payment Terms"
                            value={formData.paymentTerms}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                paymentTerms: e.target.value,
                              })
                            }
                            placeholder="e.g., Net 30"
                          />
                        </div>

                        {/* Discount */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">
                              Discount
                            </label>
                            <input
                              type="number"
                              value={formData.discount}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  discount: Math.max(0, Number(e.target.value)),
                                })
                              }
                              className="input-field"
                              min="0"
                            />
                          </div>
                          <div className="w-24">
                            <label className="block text-sm font-medium mb-1">
                              Type
                            </label>
                            <select
                              value={formData.discountType}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  discountType: e.target.value,
                                })
                              }
                              className="input-field"
                            >
                              <option value="fixed">
                                {getCurrencySymbol(formData.currency)}
                              </option>
                              <option value="percentage">%</option>
                            </select>
                          </div>
                        </div>

                        {/* Invoice Items Section */}
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-semibold">
                              Invoice Items
                            </h4>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={addItem}
                              icon={Plus}
                            >
                              Add Item
                            </Button>
                          </div>

                          <div className="space-y-3">
                            {formData.items.map((item, index) => (
                              <div
                                key={index}
                                className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                              >
                                <div className="flex-1">
                                  <input
                                    type="text"
                                    placeholder="Item description"
                                    value={item.description}
                                    onChange={(e) =>
                                      updateItem(
                                        index,
                                        'description',
                                        e.target.value
                                      )
                                    }
                                    className="input-field"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-20">
                                    <input
                                      type="number"
                                      placeholder="Qty"
                                      value={item.quantity}
                                      min="1"
                                      onChange={(e) =>
                                        updateItem(
                                          index,
                                          'quantity',
                                          Math.max(1, Number(e.target.value))
                                        )
                                      }
                                      className="input-field text-center"
                                    />
                                  </div>
                                  <div className="w-32">
                                    <div className="relative">
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                                        {getCurrencySymbol(formData.currency)}
                                      </span>
                                      <input
                                        type="number"
                                        placeholder="0.00"
                                        value={item.unitPrice}
                                        min="0"
                                        step="0.01"
                                        onChange={(e) =>
                                          updateItem(
                                            index,
                                            'unitPrice',
                                            Number(e.target.value)
                                          )
                                        }
                                        className="input-field pl-7 text-right"
                                      />
                                    </div>
                                  </div>
                                  <div className="w-24 text-right">
                                    <p className="text-sm font-medium">
                                      {formatCurrency(
                                        item.quantity * item.unitPrice,
                                        formData.currency
                                      )}
                                    </p>
                                  </div>
                                  {formData.items.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeItem(index)}
                                      className="p-2 text-red-500 hover:bg-red-50 rounded"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Items Summary */}
                          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Subtotal</span>
                              <span className="font-medium">
                                {formatCurrency(
                                  formData.items.reduce(
                                    (sum, item) =>
                                      sum + item.quantity * item.unitPrice,
                                    0
                                  ),
                                  formData.currency
                                )}
                              </span>
                            </div>
                            {formData.discount > 0 && (
                              <div className="flex justify-between text-sm mt-1">
                                <span className="text-gray-500">Discount</span>
                                <span className="text-red-500">
                                  -
                                  {formatCurrency(
                                    formData.discountType === 'percentage'
                                      ? formData.items.reduce(
                                          (sum, item) =>
                                            sum +
                                            item.quantity * item.unitPrice,
                                          0
                                        ) *
                                          (formData.discount / 100)
                                      : formData.discount,
                                    formData.currency
                                  )}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between text-sm font-semibold border-t pt-2 mt-2">
                              <span>Total</span>
                              <span>
                                {formatCurrency(
                                  Math.max(
                                    0,
                                    formData.items.reduce(
                                      (sum, item) =>
                                        sum + item.quantity * item.unitPrice,
                                      0
                                    ) -
                                      (formData.discountType === 'percentage'
                                        ? formData.items.reduce(
                                            (sum, item) =>
                                              sum +
                                              item.quantity * item.unitPrice,
                                            0
                                          ) *
                                          (formData.discount / 100)
                                        : formData.discount)
                                  ),
                                  formData.currency
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Notes & Terms */}
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              Notes
                            </label>
                            <textarea
                              value={formData.notes}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  notes: e.target.value,
                                })
                              }
                              className="input-field"
                              rows={2}
                              placeholder="Notes..."
                            />
                          </div>
                          <div className="mt-3">
                            <label className="block text-sm font-medium mb-1">
                              Terms & Conditions
                            </label>
                            <textarea
                              value={formData.terms}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  terms: e.target.value,
                                })
                              }
                              className="input-field"
                              rows={2}
                              placeholder="Terms..."
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Invoice Number
                          </p>
                          <p className="font-semibold text-gray-900 dark:text-white text-lg">
                            {invoice.number}
                          </p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Status
                          </p>
                          <Badge
                            variant={statusColors[invoice.status]}
                            size="md"
                          >
                            {statusLabels[invoice.status]}
                          </Badge>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Currency
                          </p>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {invoice.currency}
                          </p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Type
                          </p>
                          <p className="font-semibold text-gray-900 dark:text-white capitalize">
                            {invoice.type?.replace('_', ' ') || 'N/A'}
                          </p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Issue Date
                          </p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {formatDate(invoice.issueDate)}
                          </p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Due Date
                          </p>
                          <p
                            className={`font-medium ${isOverdue ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}
                          >
                            {formatDate(invoice.dueDate)}
                            {isOverdue && (
                              <span className="text-xs ml-2">(Overdue)</span>
                            )}
                          </p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Payment Terms
                          </p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {invoice.paymentTerms || 'Not specified'}
                          </p>
                        </div>
                        {invoice.notes && (
                          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 md:col-span-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Notes
                            </p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap mt-1">
                              {invoice.notes}
                            </p>
                          </div>
                        )}
                        {invoice.termsAndConditions && (
                          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 md:col-span-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Terms & Conditions
                            </p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap mt-1">
                              {invoice.termsAndConditions}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Client Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Client</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {invoice.client ? (
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {invoice.client.company?.name}
                          </p>
                          {invoice.client.contacts?.[0]?.email && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {invoice.client.contacts[0].email}
                            </p>
                          )}
                          {invoice.client.address?.city && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {invoice.client.address.city},{' '}
                              {invoice.client.address.country}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400">
                        No client assigned
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Summary Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">
                        Subtotal
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(
                          invoice.subtotal || 0,
                          invoice.currency
                        )}
                      </span>
                    </div>
                    {invoice.discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">
                          Discount (
                          {invoice.discountType === 'percentage'
                            ? `${invoice.discount}%`
                            : 'Fixed'}
                          )
                        </span>
                        <span className="font-medium text-red-500">
                          -
                          {formatCurrency(
                            invoice.discount || 0,
                            invoice.currency
                          )}
                        </span>
                      </div>
                    )}
                    {invoice.taxTotal > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">
                          Tax
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(
                            invoice.taxTotal || 0,
                            invoice.currency
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm border-t border-gray-200 dark:border-gray-700 pt-3">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        Total
                      </span>
                      <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                        {formatCurrency(invoice.total || 0, invoice.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">
                        Amount Paid
                      </span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {formatCurrency(
                          invoice.amountPaid || 0,
                          invoice.currency
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-gray-200 dark:border-gray-700 pt-3">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        Balance Due
                      </span>
                      <span
                        className={`text-lg font-bold ${
                          (invoice.balanceDue || 0) > 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}
                      >
                        {formatCurrency(
                          invoice.balanceDue || 0,
                          invoice.currency
                        )}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Items Tab */}
          {activeTab === 'items' && (
            <Card>
              <CardHeader>
                <CardTitle>Line Items</CardTitle>
                <Badge variant="gray" size="sm">
                  {invoice.items?.length || 0} items
                </Badge>
              </CardHeader>
              <CardContent>
                {invoice.items?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-3 px-2 font-medium text-gray-500 dark:text-gray-400">
                            #
                          </th>
                          <th className="text-left py-3 px-2 font-medium text-gray-500 dark:text-gray-400">
                            Description
                          </th>
                          <th className="text-center py-3 px-2 font-medium text-gray-500 dark:text-gray-400">
                            Qty
                          </th>
                          <th className="text-right py-3 px-2 font-medium text-gray-500 dark:text-gray-400">
                            Unit Price
                          </th>
                          <th className="text-right py-3 px-2 font-medium text-gray-500 dark:text-gray-400">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoice.items.map((item, index) => (
                          <tr
                            key={index}
                            className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                          >
                            <td className="py-3 px-2 text-gray-400">
                              {index + 1}
                            </td>
                            <td className="py-3 px-2 font-medium text-gray-900 dark:text-white">
                              {item.description}
                            </td>
                            <td className="text-center py-3 px-2 text-gray-600 dark:text-gray-300">
                              {item.quantity}
                            </td>
                            <td className="text-right py-3 px-2 text-gray-600 dark:text-gray-300">
                              {formatCurrency(item.unitPrice, invoice.currency)}
                            </td>
                            <td className="text-right py-3 px-2 font-semibold text-gray-900 dark:text-white">
                              {formatCurrency(
                                item.quantity * item.unitPrice,
                                invoice.currency
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td
                            colSpan={4}
                            className="text-right py-4 px-2 font-semibold text-gray-900 dark:text-white"
                          >
                            Total
                          </td>
                          <td className="text-right py-4 px-2 font-bold text-lg text-primary-600 dark:text-primary-400">
                            {formatCurrency(
                              invoice.total || 0,
                              invoice.currency
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <EmptyState
                    icon={DollarSign}
                    title="No line items"
                    description="This invoice has no items"
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                {!['paid', 'cancelled'].includes(invoice.status) && (
                  <Button
                    size="sm"
                    icon={CreditCard}
                    variant="success"
                    onClick={() => setShowPayment(true)}
                  >
                    Record Payment
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {invoice.payments?.length > 0 ? (
                  <div className="space-y-3">
                    {invoice.payments.map((payment, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {formatCurrency(payment.amount, invoice.currency)}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              <span className="capitalize">
                                {payment.method?.replace('_', ' ')}
                              </span>
                              {payment.transactionId && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono">
                                    {payment.transactionId}
                                  </span>
                                </>
                              )}
                            </div>
                            {payment.notes && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                {payment.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(payment.date)}
                          </p>
                          {payment.recordedBy && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                              by {payment.recordedBy?.firstName || 'System'}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={CreditCard}
                    title="No payments recorded"
                    description="Record a payment to track invoice payments"
                    action={
                      !['paid', 'cancelled'].includes(invoice.status)
                        ? {
                            label: 'Record Payment',
                            icon: CreditCard,
                            onClick: () => setShowPayment(true),
                          }
                        : undefined
                    }
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <Card>
              <CardHeader>
                <CardTitle>Activity Log</CardTitle>
              </CardHeader>
              <CardContent>
                {invoice.activityLog?.length > 0 ? (
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                    <div className="space-y-4 ml-10">
                      {[...invoice.activityLog]
                        .reverse()
                        .map((activity, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="relative"
                          >
                            <div className="absolute -left-10 mt-1 w-4 h-4 rounded-full border-2 border-primary-500 bg-white dark:bg-gray-800" />
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {activity.description}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatDate(activity.timestamp)}
                                </p>
                                <span className="text-gray-300 dark:text-gray-600">
                                  •
                                </span>
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                  {activity.performedBy?.firstName || 'System'}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    icon={History}
                    title="No activity yet"
                    description="Actions will be logged here"
                  />
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Record Payment Modal */}
      <Modal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        title="Record Payment"
        size="md"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <Input
            label="Amount *"
            type="number"
            icon={DollarSign}
            value={paymentForm.amount}
            onChange={(e) =>
              setPaymentForm({ ...paymentForm, amount: e.target.value })
            }
            placeholder="0.00"
            required
            min="0"
            step="0.01"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Payment Method
            </label>
            <select
              value={paymentForm.method}
              onChange={(e) =>
                setPaymentForm({ ...paymentForm, method: e.target.value })
              }
              className="input-field"
            >
              <option value="bank_transfer">Bank Transfer</option>
              <option value="credit_card">Credit Card</option>
              <option value="paypal">PayPal</option>
              <option value="check">Check</option>
              <option value="cash">Cash</option>
              <option value="other">Other</option>
            </select>
          </div>
          <Input
            label="Transaction ID"
            value={paymentForm.transactionId}
            onChange={(e) =>
              setPaymentForm({ ...paymentForm, transactionId: e.target.value })
            }
            placeholder="Optional reference number"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={paymentForm.notes}
              onChange={(e) =>
                setPaymentForm({ ...paymentForm, notes: e.target.value })
              }
              className="input-field"
              rows={2}
              placeholder="Payment notes..."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowPayment(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={paymentLoading}
              className="flex-1"
              icon={CreditCard}
            >
              Record Payment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Cancel Invoice Confirmation */}
      <ConfirmDialog
        isOpen={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={handleCancelInvoice}
        loading={cancelling}
        title="Cancel Invoice"
        message={`Are you sure you want to cancel invoice ${invoice.number}? The invoice will be marked as cancelled but kept in your records.`}
        confirmText="Cancel Invoice"
        variant="warning"
      />

      {/* Delete Invoice Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handlePermanentDelete}
        loading={deleting}
        title="Delete Invoice Permanently"
        message={`Are you sure you want to permanently delete invoice ${invoice.number}? This action cannot be undone. All data will be lost.`}
        confirmText="Delete Permanently"
        variant="danger"
      />
    </div>
  );
};

export default InvoiceDetail;
