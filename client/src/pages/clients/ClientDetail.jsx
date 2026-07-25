import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useWorkspaceNavigate as useNavigate } from '../../hooks/useWorkspaceNavigate';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  User,
  Edit,
  Save,
  Trash2,
  Plus,
  MessageSquare,
  DollarSign,
  FolderKanban,
  PhoneCall,
  Activity,
  FileText,
  Send,
  Users,
  Briefcase,
  History,
  X,
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
import { useApiData } from '../../hooks/useApiData';
import { usePermissions } from '../../hooks/usePermissions';
import axios from '../../api/axios';
import toast from 'react-hot-toast';
import { formatDate, timeAgo } from '../../utils/helpers';
import { formatCurrency } from '../../utils/currency';

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

const activityIcons = {
  note: MessageSquare,
  email: Mail,
  call: PhoneCall,
  meeting: User,
  project_created: FolderKanban,
  invoice_sent: FileText,
  payment_received: DollarSign,
  status_change: Activity,
};

const sizeLabels = {
  '1-10': '1-10 employees',
  '11-50': '11-50 employees',
  '51-200': '51-200 employees',
  '201-500': '201-500 employees',
  '500+': '500+ employees',
};

const typeLabels = {
  individual: 'Individual',
  small_business: 'Small Business',
  enterprise: 'Enterprise',
  government: 'Government',
  non_profit: 'Non-Profit',
};

const fetchClient = async (id) => {
  const { data } = await axios.get(`/clients/${id}`);
  return data.data;
};

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { data: client, loading, refetch } = useApiData(() => fetchClient(id));

  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [contactForm, setContactForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    mobile: '',
    position: '',
    department: '',
    isPrimary: false,
    isDecisionMaker: false,
  });
  const [noteContent, setNoteContent] = useState('');
  const [notePrivate, setNotePrivate] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [noteLoading, setNoteLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const handleEdit = () => {
    setFormData({
      companyName: client?.company?.name || '',
      companyLegalName: client?.company?.legalName || '',
      companyWebsite: client?.company?.website || '',
      companyIndustry: client?.company?.industry || '',
      companySize: client?.company?.size || '',
      companyTaxId: client?.company?.taxId || '',
      status: client?.status || 'active',
      source: client?.source || '',
      type: client?.type || 'small_business',
      street: client?.address?.street || '',
      city: client?.address?.city || '',
      state: client?.address?.state || '',
      zipCode: client?.address?.zipCode || '',
      country: client?.address?.country || '',
      billingStreet: client?.billingAddress?.street || '',
      billingCity: client?.billingAddress?.city || '',
      billingState: client?.billingAddress?.state || '',
      billingZipCode: client?.billingAddress?.zipCode || '',
      billingCountry: client?.billingAddress?.country || '',
      paymentTerms: client?.paymentTerms || '',
      creditLimit: client?.creditLimit || '',
      creditCurrency: client?.creditCurrency || 'USD',
      tags: client?.tags?.join(', ') || '',
    });
    setEditing(true);
  };

  const cleanValue = (val) =>
    val === '' || val === undefined || val === null ? undefined : val;

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        company: {
          name: formData.companyName?.trim(),
          legalName: cleanValue(formData.companyLegalName?.trim()),
          website: cleanValue(formData.companyWebsite?.trim()),
          industry: cleanValue(formData.companyIndustry?.trim()),
          size: cleanValue(formData.companySize),
          taxId: cleanValue(formData.companyTaxId?.trim()),
        },
        status: formData.status,
        source: cleanValue(formData.source),
        type: formData.type,
        address: {
          street: formData.street?.trim(),
          city: formData.city?.trim(),
          state: cleanValue(formData.state?.trim()),
          zipCode: cleanValue(formData.zipCode?.trim()),
          country: formData.country?.trim(),
        },
        billingAddress: {
          street: cleanValue(formData.billingStreet?.trim()),
          city: cleanValue(formData.billingCity?.trim()),
          state: cleanValue(formData.billingState?.trim()),
          zipCode: cleanValue(formData.billingZipCode?.trim()),
          country: cleanValue(formData.billingCountry?.trim()),
        },
        paymentTerms: cleanValue(formData.paymentTerms?.trim()),
        creditLimit: formData.creditLimit
          ? Number(formData.creditLimit)
          : undefined,
        creditCurrency: formData.creditCurrency || 'USD',
        tags: formData.tags
          ? formData.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
      };
      const hasBilling = Object.values(payload.billingAddress).some(
        (v) => v !== undefined
      );
      if (!hasBilling) delete payload.billingAddress;
      Object.keys(payload.company).forEach((k) => {
        if (payload.company[k] === undefined) delete payload.company[k];
      });
      Object.keys(payload.address).forEach((k) => {
        if (payload.address[k] === undefined) delete payload.address[k];
      });
      await axios.put(`/clients/${id}`, payload);
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
      await axios.delete(`/clients/${id}`);
      toast.success('Deleted');
      navigate('/clients');
    } catch {
      toast.error('Failed');
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    setContactLoading(true);
    try {
      await axios.post(`/clients/${id}/contacts`, contactForm);
      toast.success('Added');
      setShowAddContact(false);
      setContactForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        mobile: '',
        position: '',
        department: '',
        isPrimary: false,
        isDecisionMaker: false,
      });
      refetch();
    } catch {
      toast.error('Failed');
    } finally {
      setContactLoading(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    setNoteLoading(true);
    try {
      await axios.post(`/clients/${id}/notes`, {
        content: noteContent,
        isPrivate: notePrivate,
      });
      toast.success('Added');
      setShowAddNote(false);
      setNoteContent('');
      setNotePrivate(false);
      refetch();
    } catch {
      toast.error('Failed');
    } finally {
      setNoteLoading(false);
    }
  };

  const handleDeleteContact = async (contactId) => {
    try {
      await axios.delete(`/clients/${id}/contacts/${contactId}`);
      toast.success('Removed');
      refetch();
    } catch {
      toast.error('Failed');
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await axios.delete(`/clients/${id}/notes/${noteId}`);
      toast.success('Deleted');
      refetch();
    } catch {
      toast.error('Failed');
    }
  };

  if (loading)
    return (
      <div className="space-y-6">
        <PageHeader title="Client" />
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        </div>
      </div>
    );
  if (!client)
    return (
      <div className="space-y-6">
        <PageHeader title="Not Found" />
        <Card>
          <CardContent>
            <p className="text-center py-8">Client not found</p>
            <Button onClick={() => navigate('/clients')} icon={ArrowLeft}>
              Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );

  const updateField = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={client.company?.name || 'Unnamed'}
        description={`Client since ${formatDate(client.createdAt)}`}
      >
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() =>
              editing
                ? (setEditing(false), setFormData({}))
                : navigate('/clients')
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
              {hasPermission('update_clients') && (
                <Button onClick={handleEdit} icon={Edit}>
                  Edit All
                </Button>
              )}
              {hasPermission('delete_clients') && (
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
              <Activity className="w-4 h-4 text-blue-600 dark:text-blue-300" />
            </div>
            <p className="text-xs text-blue-500 font-medium">Status</p>
          </div>
          <Badge variant={statusColors[client.status]} size="md">
            {statusLabels[client.status]}
          </Badge>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4 border border-purple-200 dark:border-purple-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-200 dark:bg-purple-700 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-300" />
            </div>
            <p className="text-xs text-purple-500 font-medium">Type</p>
          </div>
          <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">
            {typeLabels[client.type] || client.type || 'N/A'}
          </p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-200 dark:bg-emerald-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
            </div>
            <p className="text-xs text-emerald-500 font-medium">Revenue</p>
          </div>
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            ${(client.totalRevenue || 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-xl p-4 border border-amber-200 dark:border-amber-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-200 dark:bg-amber-700 flex items-center justify-center">
              <FolderKanban className="w-4 h-4 text-amber-600 dark:text-amber-300" />
            </div>
            <p className="text-xs text-amber-500 font-medium">Projects</p>
          </div>
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
            {client.totalProjects || 0}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 overflow-x-auto">
        {[
          { id: 'overview', icon: Building2, label: 'Overview' },
          {
            id: 'contacts',
            icon: Users,
            label: `Contacts (${client.contacts?.length || 0})`,
          },
          {
            id: 'notes',
            icon: MessageSquare,
            label: `Notes (${client.notes?.length || 0})`,
          },
          { id: 'activity', icon: History, label: 'Activity' },
          {
            id: 'projects',
            icon: FolderKanban,
            label: `Projects (${client.projects?.length || 0})`,
          },
          {
            id: 'invoices',
            icon: FileText,
            label: `Invoices (${client.invoices?.length || 0})`,
          },
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
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Company Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {editing ? (
                      <div className="space-y-3">
                        <Input
                          label="Company Name *"
                          value={formData.companyName}
                          onChange={(e) =>
                            updateField('companyName', e.target.value)
                          }
                        />
                        <Input
                          label="Legal Name"
                          value={formData.companyLegalName}
                          onChange={(e) =>
                            updateField('companyLegalName', e.target.value)
                          }
                        />
                        <Input
                          label="Website"
                          value={formData.companyWebsite}
                          onChange={(e) =>
                            updateField('companyWebsite', e.target.value)
                          }
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Input
                            label="Industry"
                            value={formData.companyIndustry}
                            onChange={(e) =>
                              updateField('companyIndustry', e.target.value)
                            }
                          />
                          <Input
                            label="Tax ID"
                            value={formData.companyTaxId}
                            onChange={(e) =>
                              updateField('companyTaxId', e.target.value)
                            }
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-center gap-3 p-2">
                          <Building2 className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-500">Company</p>
                            <p className="font-medium">
                              {client.company?.name}
                            </p>
                          </div>
                        </div>
                        {client.company?.legalName && (
                          <div className="flex items-center gap-3 p-2">
                            <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-gray-500">
                                Legal Name
                              </p>
                              <p className="font-medium">
                                {client.company.legalName}
                              </p>
                            </div>
                          </div>
                        )}
                        {client.company?.website && (
                          <div className="flex items-center gap-3 p-2">
                            <Globe className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-gray-500">Website</p>
                              <a
                                href={client.company.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-primary-600 hover:underline"
                              >
                                {client.company.website}
                              </a>
                            </div>
                          </div>
                        )}
                        {client.company?.industry && (
                          <div className="flex items-center gap-3 p-2">
                            <Briefcase className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-gray-500">Industry</p>
                              <p className="font-medium">
                                {client.company.industry}
                              </p>
                            </div>
                          </div>
                        )}
                        {client.company?.taxId && (
                          <div className="flex items-center gap-3 p-2">
                            <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-gray-500">Tax ID</p>
                              <p className="font-medium">
                                {client.company.taxId}
                              </p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-3 p-2">
                          <Users className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-500">Size</p>
                            <p className="font-medium">
                              {sizeLabels[client.company?.size] ||
                                client.company?.size ||
                                'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-2">
                          <Building2 className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-500">Type</p>
                            <p className="font-medium">
                              {typeLabels[client.type] || client.type || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Main Address</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {editing ? (
                        <div className="space-y-3">
                          <Input
                            label="Street"
                            value={formData.street}
                            onChange={(e) =>
                              updateField('street', e.target.value)
                            }
                          />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Input
                              label="City"
                              value={formData.city}
                              onChange={(e) =>
                                updateField('city', e.target.value)
                              }
                            />
                            <Input
                              label="State"
                              value={formData.state}
                              onChange={(e) =>
                                updateField('state', e.target.value)
                              }
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Input
                              label="Zip"
                              value={formData.zipCode}
                              onChange={(e) =>
                                updateField('zipCode', e.target.value)
                              }
                            />
                            <Input
                              label="Country"
                              value={formData.country}
                              onChange={(e) =>
                                updateField('country', e.target.value)
                              }
                            />
                          </div>
                        </div>
                      ) : client.address ? (
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium">
                              {client.address.street}
                            </p>
                            <p className="text-gray-500">
                              {client.address.city}, {client.address.state}{' '}
                              {client.address.zipCode}
                            </p>
                            <p className="text-gray-500">
                              {client.address.country}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500">No address</p>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Billing Address</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {editing ? (
                        <div className="space-y-3">
                          <Input
                            label="Street"
                            value={formData.billingStreet}
                            onChange={(e) =>
                              updateField('billingStreet', e.target.value)
                            }
                          />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Input
                              label="City"
                              value={formData.billingCity}
                              onChange={(e) =>
                                updateField('billingCity', e.target.value)
                              }
                            />
                            <Input
                              label="State"
                              value={formData.billingState}
                              onChange={(e) =>
                                updateField('billingState', e.target.value)
                              }
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Input
                              label="Zip"
                              value={formData.billingZipCode}
                              onChange={(e) =>
                                updateField('billingZipCode', e.target.value)
                              }
                            />
                            <Input
                              label="Country"
                              value={formData.billingCountry}
                              onChange={(e) =>
                                updateField('billingCountry', e.target.value)
                              }
                            />
                          </div>
                        </div>
                      ) : client.billingAddress ? (
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium">
                              {client.billingAddress.street}
                            </p>
                            <p className="text-gray-500">
                              {client.billingAddress.city},{' '}
                              {client.billingAddress.state}{' '}
                              {client.billingAddress.zipCode}
                            </p>
                            <p className="text-gray-500">
                              {client.billingAddress.country}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500">Same as main</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Classification</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {editing ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Status
                          </label>
                          <select
                            value={formData.status}
                            onChange={(e) =>
                              updateField('status', e.target.value)
                            }
                            className="input-field"
                          >
                            {Object.keys(statusColors).map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Source
                          </label>
                          <select
                            value={formData.source}
                            onChange={(e) =>
                              updateField('source', e.target.value)
                            }
                            className="input-field"
                          >
                            <option value="">Select</option>
                            <option value="website">Website</option>
                            <option value="referral">Referral</option>
                            <option value="social_media">Social Media</option>
                            <option value="email">Email</option>
                            <option value="event">Event</option>
                            <option value="partner">Partner</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              Size
                            </label>
                            <select
                              value={formData.companySize}
                              onChange={(e) =>
                                updateField('companySize', e.target.value)
                              }
                              className="input-field"
                            >
                              <option value="">Select</option>
                              {Object.entries(sizeLabels).map(([k, v]) => (
                                <option key={k} value={k}>
                                  {v}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              Type
                            </label>
                            <select
                              value={formData.type}
                              onChange={(e) =>
                                updateField('type', e.target.value)
                              }
                              className="input-field"
                            >
                              {Object.entries(typeLabels).map(([k, v]) => (
                                <option key={k} value={k}>
                                  {v}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <Input
                          label="Payment Terms"
                          value={formData.paymentTerms}
                          onChange={(e) =>
                            updateField('paymentTerms', e.target.value)
                          }
                          placeholder="e.g., Net 30"
                        />
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Credit Limit
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Input
                              type="number"
                              value={formData.creditLimit}
                              onChange={(e) =>
                                updateField('creditLimit', e.target.value)
                              }
                            />
                            <select
                              value={formData.creditCurrency}
                              onChange={(e) =>
                                updateField('creditCurrency', e.target.value)
                              }
                              className="input-field"
                            >
                              <option value="USD">USD</option>
                              <option value="EUR">EUR</option>
                              <option value="GBP">GBP</option>
                              <option value="PKR">PKR</option>
                            </select>
                          </div>
                        </div>
                        <Input
                          label="Tags (comma separated)"
                          value={formData.tags}
                          onChange={(e) => updateField('tags', e.target.value)}
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex justify-between p-2">
                          <span className="text-sm text-gray-500">Status</span>
                          <Badge variant={statusColors[client.status]}>
                            {statusLabels[client.status]}
                          </Badge>
                        </div>
                        {client.source && (
                          <div className="flex justify-between p-2">
                            <span className="text-sm text-gray-500">
                              Source
                            </span>
                            <span className="text-sm font-medium capitalize">
                              {client.source?.replace('_', ' ')}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between p-2">
                          <span className="text-sm text-gray-500">Size</span>
                          <span className="text-sm font-medium">
                            {sizeLabels[client.company?.size] || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between p-2">
                          <span className="text-sm text-gray-500">Type</span>
                          <span className="text-sm font-medium">
                            {typeLabels[client.type] || 'N/A'}
                          </span>
                        </div>
                        {client.paymentTerms && (
                          <div className="flex justify-between p-2">
                            <span className="text-sm text-gray-500">
                              Payment
                            </span>
                            <span className="text-sm font-medium">
                              {client.paymentTerms}
                            </span>
                          </div>
                        )}
                        {client.creditLimit > 0 && (
                          <div className="flex justify-between p-2">
                            <span className="text-sm text-gray-500">
                              Credit Limit
                            </span>
                            <span className="text-sm font-medium">
                              {client.creditCurrency || 'USD'}{' '}
                              {client.creditLimit?.toLocaleString()}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between p-2">
                          <span className="text-sm text-gray-500">Revenue</span>
                          <span className="text-sm font-medium text-emerald-600">
                            ${(client.totalRevenue || 0).toLocaleString()}
                          </span>
                        </div>
                        {client.tags?.length > 0 && (
                          <div className="p-2">
                            <p className="text-xs text-gray-500 mb-1">Tags</p>
                            <div className="flex gap-1 flex-wrap">
                              {client.tags.map((t) => (
                                <Badge key={t} variant="primary" size="sm">
                                  {t}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Contacts Tab */}
          {activeTab === 'contacts' && (
            <Card>
              <CardHeader>
                <CardTitle>Contacts</CardTitle>
                {hasPermission('update_clients') && (
                  <Button
                    size="sm"
                    icon={Plus}
                    onClick={() => setShowAddContact(true)}
                  >
                    Add
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {client.contacts?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {client.contacts.map((c) => (
                      <div
                        key={c._id}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar
                            name={`${c.firstName} ${c.lastName}`}
                            size="md"
                          />
                          <div className="min-w-0">
                            <p className="font-medium">
                              {c.firstName} {c.lastName}
                              {c.isPrimary && (
                                <Badge
                                  variant="primary"
                                  size="sm"
                                  className="ml-2"
                                >
                                  Primary
                                </Badge>
                              )}
                              {c.isDecisionMaker && (
                                <Badge
                                  variant="warning"
                                  size="sm"
                                  className="ml-2"
                                >
                                  DM
                                </Badge>
                              )}
                            </p>
                            <p className="text-xs text-gray-500">
                              {c.position}
                              {c.department ? ` • ${c.department}` : ''}
                            </p>
                            <div className="flex gap-2 text-xs text-gray-400 mt-1">
                              {c.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {c.email}
                                </span>
                              )}
                              {c.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {c.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteContact(c._id)}
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={User}
                    title="No contacts"
                    action={{
                      label: 'Add',
                      icon: Plus,
                      onClick: () => setShowAddContact(true),
                    }}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
                <Button
                  size="sm"
                  icon={Plus}
                  onClick={() => setShowAddNote(true)}
                >
                  Add
                </Button>
              </CardHeader>
              <CardContent>
                {client.notes?.length > 0 ? (
                  <div className="space-y-3">
                    {client.notes.map((n) => (
                      <div
                        key={n._id}
                        className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Avatar
                              name={n.createdBy?.firstName || 'User'}
                              size="sm"
                            />
                            <span className="text-sm font-medium">
                              {n.createdBy?.firstName} {n.createdBy?.lastName}
                            </span>
                            {n.isPrivate && (
                              <Badge variant="warning" size="sm">
                                Private
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">
                              {timeAgo(n.createdAt)}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteNote(n._id)}
                            >
                              <X className="w-3 h-3 text-red-500" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">
                          {n.content}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={MessageSquare} title="No notes" />
                )}
              </CardContent>
            </Card>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <Card>
              <CardHeader>
                <CardTitle>Activity Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                {client.activityTimeline?.length > 0 ? (
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                    <div className="space-y-4 ml-10">
                      {[...client.activityTimeline].reverse().map((a, i) => {
                        const Icon = activityIcons[a.type] || Activity;
                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="relative"
                          >
                            <div className="absolute -left-10 mt-1 w-4 h-4 rounded-full border-2 border-primary-500 bg-white dark:bg-gray-800" />
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                              <div className="flex items-center gap-2 mb-1">
                                <Icon className="w-4 h-4 text-gray-400" />
                                <p className="text-sm font-medium">{a.title}</p>
                              </div>
                              <p className="text-xs text-gray-500">
                                {a.description}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {timeAgo(a.timestamp)} by{' '}
                                {a.performedBy?.firstName || 'System'}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <EmptyState icon={History} title="No activity yet" />
                )}
              </CardContent>
            </Card>
          )}

          {/* Projects Tab */}
          {activeTab === 'projects' && (
            <Card>
              <CardHeader>
                <CardTitle>Projects</CardTitle>
              </CardHeader>
              <CardContent>
                {client.projects?.length > 0 ? (
                  <div className="space-y-2">
                    {client.projects.map((p) => (
                      <div
                        key={p._id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-sm cursor-pointer"
                        onClick={() => navigate(`/projects/${p._id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                            <FolderKanban className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{p.name}</p>
                            <p className="text-xs text-gray-500">
                              {p.timeline?.deadline
                                ? `Due: ${formatDate(p.timeline.deadline)}`
                                : 'No deadline'}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={p.status === 'active' ? 'green' : 'gray'}
                        >
                          {p.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={FolderKanban} title="No projects" />
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'invoices' && (
            <Card>
              <CardHeader>
                <CardTitle>Invoices ({client.invoices?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {client.invoices?.length > 0 ? (
                  <div className="space-y-2">
                    {client.invoices.map((inv) => (
                      <div
                        key={inv._id}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-sm cursor-pointer transition-all"
                        onClick={() => navigate(`/invoices/${inv._id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-semibold">{inv.number}</p>
                            <p className="text-xs text-gray-500">
                              {inv.dueDate
                                ? `Due: ${formatDate(inv.dueDate)}`
                                : 'No due date'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            {formatCurrency(inv.total, inv.currency)}
                          </p>
                          <Badge
                            variant={
                              inv.status === 'paid'
                                ? 'green'
                                : inv.status === 'overdue'
                                  ? 'red'
                                  : 'blue'
                            }
                            size="sm"
                          >
                            {inv.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={FileText}
                    title="No invoices"
                    description="No invoices have been created for this client yet"
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
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Add Contact Modal */}
      <Modal
        isOpen={showAddContact}
        onClose={() => setShowAddContact(false)}
        title="Add Contact"
        size="md"
      >
        <form onSubmit={handleAddContact} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name *"
              value={contactForm.firstName}
              onChange={(e) =>
                setContactForm({ ...contactForm, firstName: e.target.value })
              }
              required
            />
            <Input
              label="Last Name *"
              value={contactForm.lastName}
              onChange={(e) =>
                setContactForm({ ...contactForm, lastName: e.target.value })
              }
              required
            />
          </div>
          <Input
            label="Email"
            type="email"
            value={contactForm.email}
            onChange={(e) =>
              setContactForm({ ...contactForm, email: e.target.value })
            }
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone"
              value={contactForm.phone}
              onChange={(e) =>
                setContactForm({ ...contactForm, phone: e.target.value })
              }
            />
            <Input
              label="Mobile"
              value={contactForm.mobile}
              onChange={(e) =>
                setContactForm({ ...contactForm, mobile: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Position"
              value={contactForm.position}
              onChange={(e) =>
                setContactForm({ ...contactForm, position: e.target.value })
              }
            />
            <Input
              label="Department"
              value={contactForm.department}
              onChange={(e) =>
                setContactForm({ ...contactForm, department: e.target.value })
              }
            />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={contactForm.isPrimary}
                onChange={(e) =>
                  setContactForm({
                    ...contactForm,
                    isPrimary: e.target.checked,
                  })
                }
              />
              <span className="text-sm">Primary</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={contactForm.isDecisionMaker}
                onChange={(e) =>
                  setContactForm({
                    ...contactForm,
                    isDecisionMaker: e.target.checked,
                  })
                }
              />
              <span className="text-sm">Decision Maker</span>
            </label>
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowAddContact(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" loading={contactLoading} className="flex-1">
              Add
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Note Modal */}
      <Modal
        isOpen={showAddNote}
        onClose={() => setShowAddNote(false)}
        title="Add Note"
        size="md"
      >
        <form onSubmit={handleAddNote} className="space-y-4">
          <textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Enter note..."
            className="input-field"
            rows={4}
            required
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={notePrivate}
              onChange={(e) => setNotePrivate(e.target.checked)}
            />
            <span className="text-sm">Private</span>
          </label>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowAddNote(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={noteLoading}
              icon={Send}
              className="flex-1"
            >
              Add
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Client"
        message={`Delete ${client.company?.name}?`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default ClientDetail;
