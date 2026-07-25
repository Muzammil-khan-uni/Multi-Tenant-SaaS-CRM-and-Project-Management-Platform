import { useState } from 'react';
import { useWorkspaceNavigate as useNavigate } from '../../hooks/useWorkspaceNavigate';
import {
  ArrowLeft,
  FileText,
  Calendar,
  Save,
  Plus,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import axios from '../../api/axios';
import toast from 'react-hot-toast';
import {
  formatCurrency,
  getCurrencyOptions,
  getCurrencySymbol,
} from '../../utils/currency';

const AddInvoice = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [clients, setClients] = useState([]);
  const [initialized, setInitialized] = useState(false);

  const [formData, setFormData] = useState({
    client: '',
    status: 'draft',
    type: 'one_time',
    currency: 'USD',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    paymentTerms: 'net30',
    notes: '',
    terms: '',
    items: [{ description: '', quantity: 1, unitPrice: 0 }],
    discount: 0,
    discountType: 'fixed',
  });

  if (!initialized) {
    setInitialized(true);
    axios
      .get('/clients?limit=100')
      .then(({ data }) => setClients(data.data || []))
      .catch(() => {});
  }

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
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

  const calculateSubtotal = () =>
    formData.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

  const calculateDiscount = () => {
    const subtotal = calculateSubtotal();
    if (formData.discountType === 'percentage') {
      return subtotal * (formData.discount / 100);
    }
    return formData.discount;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    return Math.max(0, subtotal - discount);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.client) newErrors.client = 'Client is required';
    if (!formData.dueDate) newErrors.dueDate = 'Due date is required';
    if (formData.items.length === 0)
      newErrors.items = 'At least one item is required';
    if (formData.items.some((item) => !item.description.trim()))
      newErrors.items = 'All items need a description';
    if (formData.items.some((item) => item.quantity < 1))
      newErrors.items = 'Quantity must be at least 1';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        client: formData.client,
        status: formData.status,
        type: formData.type,
        currency: formData.currency,
        issueDate: formData.issueDate,
        dueDate: formData.dueDate,
        paymentTerms: formData.paymentTerms || undefined,
        notes: formData.notes?.trim() || undefined,
        termsAndConditions: formData.terms?.trim() || undefined,
        items: formData.items.map((item) => ({
          description: item.description.trim(),
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
        discount: Number(formData.discount) || 0,
        discountType: formData.discountType,
      };

      const { data } = await axios.post('/invoices', payload);
      toast.success('Invoice created successfully!');
      navigate(`/invoices/${data.data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const subtotal = calculateSubtotal();
  const discount = calculateDiscount();
  const total = calculateTotal();

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Create Invoice"
        description="Create a new invoice for your client"
      >
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate('/invoices')}
            icon={ArrowLeft}
          >
            Back to Invoices
          </Button>
          <Button
            form="add-invoice-form"
            type="submit"
            loading={loading}
            icon={Save}
          >
            Create Invoice
          </Button>
        </div>
      </PageHeader>

      <form id="add-invoice-form" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invoice Items */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <CardTitle>Invoice Items</CardTitle>
                    <Badge variant="gray" size="sm">
                      {formData.items.length} items
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Currency Selector */}
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-500 dark:text-gray-400">
                        Currency:
                      </label>
                      <select
                        value={formData.currency}
                        onChange={(e) =>
                          updateField('currency', e.target.value)
                        }
                        className="border border-gray-300 dark:border-gray-600 rounded-lg text-sm px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        {getCurrencyOptions().map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={addItem}
                      icon={Plus}
                    >
                      Add Item
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {errors.items && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {errors.items}
                    </p>
                  </div>
                )}

                {/* Items Table Header */}
                <div className="hidden md:flex items-center gap-3 px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <div className="flex-1">Description</div>
                  <div className="w-20 text-center">Qty</div>
                  <div className="w-36 text-right">Unit Price</div>
                  <div className="w-28 text-right">Amount</div>
                  <div className="w-10"></div>
                </div>

                {/* Items List */}
                <div className="space-y-3">
                  {formData.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                    >
                      {/* Description */}
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 dark:text-gray-400 md:hidden mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          placeholder="Item description"
                          value={item.description}
                          onChange={(e) =>
                            updateItem(index, 'description', e.target.value)
                          }
                          className="input-field"
                        />
                      </div>

                      {/* Quantity & Price Row */}
                      <div className="flex items-center gap-2">
                        {/* Quantity */}
                        <div className="w-20">
                          <label className="text-xs text-gray-500 dark:text-gray-400 md:hidden mb-1">
                            Qty
                          </label>
                          <input
                            type="number"
                            placeholder="1"
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

                        {/* Unit Price */}
                        <div className="w-36">
                          <label className="text-xs text-gray-500 dark:text-gray-400 md:hidden mb-1">
                            Unit Price
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
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
                              className="input-field pl-8 text-right"
                            />
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="w-28">
                          <label className="text-xs text-gray-500 dark:text-gray-400 md:hidden mb-1">
                            Amount
                          </label>
                          <p className="text-sm font-medium text-right py-2.5 text-gray-900 dark:text-white">
                            {formatCurrency(
                              item.quantity * item.unitPrice,
                              formData.currency
                            )}
                          </p>
                        </div>

                        {/* Remove Button */}
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors self-start md:self-center"
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Empty State */}
                {formData.items.length === 0 && (
                  <div className="text-center py-8">
                    <FileText className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      No items added yet
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={addItem}
                      icon={Plus}
                    >
                      Add First Item
                    </Button>
                  </div>
                )}

                {/* Add Item Button at Bottom */}
                {formData.items.length > 0 && (
                  <div className="mt-4 text-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={addItem}
                      icon={Plus}
                    >
                      Add Another Item
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes & Terms */}
            <Card>
              <CardHeader>
                <CardTitle>Notes & Terms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    className="input-field"
                    rows={3}
                    placeholder="Any notes for the client..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Terms & Conditions
                  </label>
                  <textarea
                    value={formData.terms}
                    onChange={(e) => updateField('terms', e.target.value)}
                    className="input-field"
                    rows={3}
                    placeholder="Payment terms and conditions..."
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Right Side */}
          <div className="space-y-6">
            {/* Details Card */}
            <Card>
              <CardHeader>
                <CardTitle>Invoice Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Client Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Client *
                  </label>
                  <select
                    value={formData.client}
                    onChange={(e) => updateField('client', e.target.value)}
                    className={`input-field ${errors.client ? 'border-red-500' : ''}`}
                  >
                    <option value="">Select a client</option>
                    {clients.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.company?.name || 'Unnamed Client'}
                      </option>
                    ))}
                  </select>
                  {errors.client && (
                    <p className="text-sm text-red-500 mt-1">{errors.client}</p>
                  )}
                </div>

                {/* Status & Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => updateField('status', e.target.value)}
                      className="input-field"
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Type
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => updateField('type', e.target.value)}
                      className="input-field"
                    >
                      <option value="one_time">One Time</option>
                      <option value="recurring">Recurring</option>
                      <option value="retainer">Retainer</option>
                    </select>
                  </div>
                </div>

                {/* Dates */}
                <Input
                  label="Issue Date"
                  type="date"
                  icon={Calendar}
                  value={formData.issueDate}
                  onChange={(e) => updateField('issueDate', e.target.value)}
                />
                <Input
                  label="Due Date *"
                  type="date"
                  icon={Calendar}
                  value={formData.dueDate}
                  onChange={(e) => updateField('dueDate', e.target.value)}
                  error={errors.dueDate}
                />
                <Input
                  label="Payment Terms"
                  placeholder="e.g., Net 30, Due on Receipt"
                  value={formData.paymentTerms}
                  onChange={(e) => updateField('paymentTerms', e.target.value)}
                />
              </CardContent>
            </Card>

            {/* Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Subtotal */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    Subtotal
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(subtotal, formData.currency)}
                  </span>
                </div>

                {/* Discount */}
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">
                    Discount
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={formData.discount}
                      onChange={(e) =>
                        updateField(
                          'discount',
                          Math.max(0, Number(e.target.value))
                        )
                      }
                      className="input-field w-24"
                      min="0"
                      placeholder="0"
                    />
                    <select
                      value={formData.discountType}
                      onChange={(e) =>
                        updateField('discountType', e.target.value)
                      }
                      className="input-field w-24"
                    >
                      <option value="fixed">
                        {getCurrencySymbol(formData.currency)}
                      </option>
                      <option value="percentage">%</option>
                    </select>
                  </div>
                  {discount > 0 && (
                    <p className="text-xs text-red-500 mt-1">
                      -{formatCurrency(discount, formData.currency)}
                    </p>
                  )}
                </div>

                {/* Total */}
                <div className="flex justify-between items-center border-t border-gray-200 dark:border-gray-700 pt-3">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    Total
                  </span>
                  <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
                    {formatCurrency(total, formData.currency)}
                  </span>
                </div>

                {/* Quick Info */}
                <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300">
                  <p className="font-medium mb-1">Invoice Summary</p>
                  <p>
                    {formData.items.length} item(s) • {formData.currency}
                  </p>
                  {formData.discount > 0 && (
                    <p>
                      Discount: {formatCurrency(discount, formData.currency)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddInvoice;
