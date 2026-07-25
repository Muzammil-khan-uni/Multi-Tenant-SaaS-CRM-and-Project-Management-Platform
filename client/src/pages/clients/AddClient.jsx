import { useState } from 'react';
import { useWorkspaceNavigate as useNavigate } from '../../hooks/useWorkspaceNavigate';
import {
  ArrowLeft,
  Building2,
  Globe,
  MapPin,
  Phone,
  Mail,
  Save,
  FileText,
  Users,
  DollarSign,
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
import axios from '../../api/axios';
import toast from 'react-hot-toast';

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

const initialFormData = {
  companyName: '',
  companyLegalName: '',
  companyWebsite: '',
  companyIndustry: '',
  companySize: '',
  companyTaxId: '',

  status: 'active',
  source: '',
  type: '',

  street: '',
  city: '',
  state: '',
  zipCode: '',
  country: '',

  billingStreet: '',
  billingCity: '',
  billingState: '',
  billingZipCode: '',
  billingCountry: '',

  paymentTerms: '',
  creditLimit: '',
  creditCurrency: 'USD',

  contactFirstName: '',
  contactLastName: '',
  contactEmail: '',
  contactPhone: '',
  contactMobile: '',
  contactPosition: '',
  contactDepartment: '',
  contactIsPrimary: true,
  contactIsDecisionMaker: false,

  tags: '',
  initialNote: '',
};

const AddClient = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [useSeparateBilling, setUseSeparateBilling] = useState(false);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }

    if (!formData.companyLegalName.trim()) {
      newErrors.companyLegalName = 'Legal name is required';
    }

    if (!formData.companySize) {
      newErrors.companySize = 'Company size is required';
    }

    if (!formData.type) {
      newErrors.type = 'Client type is required';
    }

    if (!formData.status) {
      newErrors.status = 'Status is required';
    }

    if (!formData.street.trim()) {
      newErrors.street = 'Street address is required';
    }
    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }
    if (!formData.country.trim()) {
      newErrors.country = 'Country is required';
    }

    if (!formData.contactFirstName.trim()) {
      newErrors.contactFirstName = 'Contact first name is required';
    }

    if (!formData.contactLastName.trim()) {
      newErrors.contactLastName = 'Contact last name is required';
    }

    if (!formData.contactEmail.trim()) {
      newErrors.contactEmail = 'Contact email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.contactEmail)) {
      newErrors.contactEmail = 'Enter a valid email address';
    }

    if (!formData.contactPhone.trim()) {
      newErrors.contactPhone = 'Contact phone is required';
    }

    if (
      formData.companyWebsite &&
      !/^https?:\/\/.+\..+/.test(formData.companyWebsite)
    ) {
      newErrors.companyWebsite =
        'Enter a valid URL (e.g., https://example.com)';
    }

    if (formData.creditLimit && isNaN(Number(formData.creditLimit))) {
      newErrors.creditLimit = 'Enter a valid number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fill in all required fields *');

      const firstError = document.querySelector('.border-red-500');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setLoading(true);
    try {
      const payload = {
        company: {
          name: formData.companyName.trim(),
          legalName: formData.companyLegalName.trim(),
          website: formData.companyWebsite.trim() || undefined,
          industry: formData.companyIndustry.trim() || undefined,
          size: formData.companySize,
          taxId: formData.companyTaxId.trim() || undefined,
        },
        status: formData.status,
        source: formData.source || undefined,
        type: formData.type,
        address: {
          street: formData.street.trim(),
          city: formData.city.trim(),
          state: formData.state.trim() || undefined,
          zipCode: formData.zipCode.trim() || undefined,
          country: formData.country.trim(),
        },
        billingAddress: useSeparateBilling
          ? {
              street: formData.billingStreet.trim() || undefined,
              city: formData.billingCity.trim() || undefined,
              state: formData.billingState.trim() || undefined,
              zipCode: formData.billingZipCode.trim() || undefined,
              country: formData.billingCountry.trim() || undefined,
            }
          : undefined,
        paymentTerms: formData.paymentTerms.trim() || undefined,
        creditLimit: formData.creditLimit
          ? Number(formData.creditLimit)
          : undefined,
        creditCurrency: formData.creditCurrency || 'USD',
        contacts: [
          {
            firstName: formData.contactFirstName.trim(),
            lastName: formData.contactLastName.trim(),
            email: formData.contactEmail.trim(),
            phone: formData.contactPhone.trim(),
            mobile: formData.contactMobile.trim() || undefined,
            position: formData.contactPosition.trim() || undefined,
            department: formData.contactDepartment.trim() || undefined,
            isPrimary: true,
            isDecisionMaker: formData.contactIsDecisionMaker,
          },
        ],
        notes: formData.initialNote.trim()
          ? [
              {
                content: formData.initialNote.trim(),
                isPrivate: false,
              },
            ]
          : [],
        tags: formData.tags.trim()
          ? formData.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
      };

      const { data } = await axios.post('/clients', payload);
      toast.success('Client created successfully!');
      navigate(`/clients/${data.data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add New Client"
        description="Create a new client record with all details"
      >
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate('/clients')}
            icon={ArrowLeft}
          >
            Back to Clients
          </Button>
          <Button
            type="submit"
            form="add-client-form"
            loading={loading}
            icon={Save}
          >
            Create Client
          </Button>
        </div>
      </PageHeader>

      <form id="add-client-form" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2 space-y-6">
            {/* Company Information */}
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Company Name *"
                  icon={Building2}
                  placeholder="Enter legal company name"
                  value={formData.companyName}
                  onChange={(e) => updateField('companyName', e.target.value)}
                  error={errors.companyName}
                />
                <Input
                  label="Legal Name *"
                  icon={FileText}
                  placeholder="Registered legal name"
                  value={formData.companyLegalName}
                  onChange={(e) =>
                    updateField('companyLegalName', e.target.value)
                  }
                  error={errors.companyLegalName}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Website"
                    icon={Globe}
                    placeholder="https://example.com"
                    value={formData.companyWebsite}
                    onChange={(e) =>
                      updateField('companyWebsite', e.target.value)
                    }
                    error={errors.companyWebsite}
                  />
                  <Input
                    label="Industry"
                    placeholder="e.g., Technology, Healthcare"
                    value={formData.companyIndustry}
                    onChange={(e) =>
                      updateField('companyIndustry', e.target.value)
                    }
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Company Size *
                    </label>
                    <select
                      value={formData.companySize}
                      onChange={(e) =>
                        updateField('companySize', e.target.value)
                      }
                      className={`input-field ${errors.companySize ? 'border-red-500' : ''}`}
                    >
                      <option value="">Select company size</option>
                      {Object.entries(sizeLabels).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                    {errors.companySize && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.companySize}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Client Type *
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => updateField('type', e.target.value)}
                      className={`input-field ${errors.type ? 'border-red-500' : ''}`}
                    >
                      <option value="">Select client type</option>
                      {Object.entries(typeLabels).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                    {errors.type && (
                      <p className="text-sm text-red-500 mt-1">{errors.type}</p>
                    )}
                  </div>
                </div>
                <Input
                  label="Tax ID / VAT Number"
                  placeholder="Tax identification number"
                  value={formData.companyTaxId}
                  onChange={(e) => updateField('companyTaxId', e.target.value)}
                />
              </CardContent>
            </Card>

            {/* Main Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Main Address *
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Street Address *"
                  placeholder="123 Business Ave, Suite 100"
                  value={formData.street}
                  onChange={(e) => updateField('street', e.target.value)}
                  error={errors.street}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="City *"
                    placeholder="City"
                    value={formData.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    error={errors.city}
                  />
                  <Input
                    label="State / Province"
                    placeholder="State"
                    value={formData.state}
                    onChange={(e) => updateField('state', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="ZIP / Postal Code"
                    placeholder="Postal code"
                    value={formData.zipCode}
                    onChange={(e) => updateField('zipCode', e.target.value)}
                  />
                  <Input
                    label="Country *"
                    placeholder="Country"
                    value={formData.country}
                    onChange={(e) => updateField('country', e.target.value)}
                    error={errors.country}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Billing Address */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Billing Address
                  </CardTitle>
                  <label className="flex items-center gap-2 text-sm font-normal cursor-pointer whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={useSeparateBilling}
                      onChange={(e) => setUseSeparateBilling(e.target.checked)}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                    <span>Different from main address</span>
                  </label>
                </div>
              </CardHeader>
              {useSeparateBilling && (
                <CardContent className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                  <Input
                    label="Street Address"
                    placeholder="Billing street address"
                    value={formData.billingStreet}
                    onChange={(e) =>
                      updateField('billingStreet', e.target.value)
                    }
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="City"
                      placeholder="City"
                      value={formData.billingCity}
                      onChange={(e) =>
                        updateField('billingCity', e.target.value)
                      }
                    />
                    <Input
                      label="State / Province"
                      placeholder="State"
                      value={formData.billingState}
                      onChange={(e) =>
                        updateField('billingState', e.target.value)
                      }
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="ZIP / Postal Code"
                      placeholder="Postal code"
                      value={formData.billingZipCode}
                      onChange={(e) =>
                        updateField('billingZipCode', e.target.value)
                      }
                    />
                    <Input
                      label="Country"
                      placeholder="Country"
                      value={formData.billingCountry}
                      onChange={(e) =>
                        updateField('billingCountry', e.target.value)
                      }
                    />
                  </div>
                </CardContent>
              )}
              {!useSeparateBilling && (
                <CardContent className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Billing address is the same as the main address. Check the
                    box above to enter a different billing address.
                  </p>
                </CardContent>
              )}
            </Card>
          </div>

          {/* Sidebar - Right Side */}
          <div className="space-y-6">
            {/* Classification & Status */}
            <Card>
              <CardHeader>
                <CardTitle>Classification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => updateField('status', e.target.value)}
                    className={`input-field ${errors.status ? 'border-red-500' : ''}`}
                  >
                    <option value="lead">Lead</option>
                    <option value="prospect">Prospect</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                  {errors.status && (
                    <p className="text-sm text-red-500 mt-1">{errors.status}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Source
                  </label>
                  <select
                    value={formData.source}
                    onChange={(e) => updateField('source', e.target.value)}
                    className="input-field"
                  >
                    <option value="">Select source</option>
                    <option value="website">Website</option>
                    <option value="referral">Referral</option>
                    <option value="social_media">Social Media</option>
                    <option value="email">Email Campaign</option>
                    <option value="cold_call">Cold Call</option>
                    <option value="event">Event</option>
                    <option value="partner">Partner</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <Input
                  label="Payment Terms"
                  placeholder="e.g., Net 30, Net 60"
                  value={formData.paymentTerms}
                  onChange={(e) => updateField('paymentTerms', e.target.value)}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Credit Limit
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input
                      type="number"
                      icon={DollarSign}
                      placeholder="0.00"
                      value={formData.creditLimit}
                      onChange={(e) =>
                        updateField('creditLimit', e.target.value)
                      }
                      error={errors.creditLimit}
                    />
                    <select
                      value={formData.creditCurrency || 'USD'}
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
                  label="Tags"
                  placeholder="e.g., vip, enterprise, priority (comma separated)"
                  value={formData.tags}
                  onChange={(e) => updateField('tags', e.target.value)}
                />
              </CardContent>
            </Card>

            {/* Primary Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Primary Contact *
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="First Name *"
                    placeholder="John"
                    value={formData.contactFirstName}
                    onChange={(e) =>
                      updateField('contactFirstName', e.target.value)
                    }
                    error={errors.contactFirstName}
                  />
                  <Input
                    label="Last Name *"
                    placeholder="Doe"
                    value={formData.contactLastName}
                    onChange={(e) =>
                      updateField('contactLastName', e.target.value)
                    }
                    error={errors.contactLastName}
                  />
                </div>
                <Input
                  label="Email *"
                  type="email"
                  icon={Mail}
                  placeholder="john@example.com"
                  value={formData.contactEmail}
                  onChange={(e) => updateField('contactEmail', e.target.value)}
                  error={errors.contactEmail}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Phone *"
                    icon={Phone}
                    placeholder="+04 (55) 000-0000"
                    value={formData.contactPhone}
                    onChange={(e) =>
                      updateField('contactPhone', e.target.value)
                    }
                    error={errors.contactPhone}
                  />
                  <Input
                    label="Mobile"
                    icon={Phone}
                    placeholder="+92 (345) 000-0000"
                    value={formData.contactMobile}
                    onChange={(e) =>
                      updateField('contactMobile', e.target.value)
                    }
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Position"
                    placeholder="e.g., CEO, Manager"
                    value={formData.contactPosition}
                    onChange={(e) =>
                      updateField('contactPosition', e.target.value)
                    }
                  />
                  <Input
                    label="Department"
                    placeholder="e.g., Sales, Engineering"
                    value={formData.contactDepartment}
                    onChange={(e) =>
                      updateField('contactDepartment', e.target.value)
                    }
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.contactIsDecisionMaker}
                    onChange={(e) =>
                      updateField('contactIsDecisionMaker', e.target.checked)
                    }
                    className="rounded"
                  />
                  <span className="text-sm">
                    This contact is a decision maker
                  </span>
                </label>
              </CardContent>
            </Card>

            {/* Initial Note */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Initial Note
                </CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  value={formData.initialNote}
                  onChange={(e) => updateField('initialNote', e.target.value)}
                  placeholder="Add any initial notes about this client..."
                  className="input-field"
                  rows={3}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddClient;
