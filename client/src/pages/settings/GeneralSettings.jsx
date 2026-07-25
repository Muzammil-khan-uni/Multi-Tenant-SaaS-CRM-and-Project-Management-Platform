import { useState, useEffect } from 'react';
import {
  Globe,
  Save,
  Building2,
  Briefcase,
  Users,
  CheckCircle,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { useWorkspace } from '../../hooks/useWorkspace';
import toast from 'react-hot-toast';

const GeneralSettings = () => {
  const { workspace, fetchWorkspace, updateWorkspace } = useWorkspace();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  const [form, setForm] = useState({
    name: workspace?.name || '',
    description: workspace?.description || '',
    industry: workspace?.industry || '',
    size: workspace?.size || '',
    timezone: workspace?.settings?.timezone || 'UTC',
    dateFormat: workspace?.settings?.dateFormat || 'MM/DD/YYYY',
    currency: workspace?.settings?.currency || 'USD',
    language: workspace?.settings?.language || 'en',
  });

  const [initialized, setInitialized] = useState(false);

  if (!initialized && workspace) {
    setInitialized(true);
    setForm({
      name: workspace.name || '',
      description: workspace.description || '',
      industry: workspace.industry || '',
      size: workspace.size || '',
      timezone: workspace.settings?.timezone || 'UTC',
      dateFormat: workspace.settings?.dateFormat || 'MM/DD/YYYY',
      currency: workspace.settings?.currency || 'USD',
      language: workspace.settings?.language || 'en',
    });
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Workspace name is required');
      return;
    }
    setSaving(true);
    try {
      await updateWorkspace({
        name: form.name.trim(),
        description: form.description.trim(),
        industry: form.industry || undefined,
        size: form.size || undefined,
        settings: {
          timezone: form.timezone,
          dateFormat: form.dateFormat,
          currency: form.currency,
          language: form.language,
        },
      });
      toast.success('Settings saved successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    form.name !== (workspace?.name || '') ||
    form.description !== (workspace?.description || '') ||
    form.industry !== (workspace?.industry || '') ||
    form.size !== (workspace?.size || '') ||
    form.timezone !== (workspace?.settings?.timezone || 'UTC') ||
    form.dateFormat !== (workspace?.settings?.dateFormat || 'MM/DD/YYYY') ||
    form.currency !== (workspace?.settings?.currency || 'USD') ||
    form.language !== (workspace?.settings?.language || 'en');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Form */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary-600" />
                Workspace Information
              </CardTitle>
              {hasChanges && (
                <Badge variant="warning" size="sm">
                  Unsaved changes
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Workspace Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Workspace Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your company or organization name"
                icon={Building2}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="input-field"
                rows={3}
                placeholder="Brief description of your workspace and what you do..."
                maxLength={500}
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">
                {form.description?.length || 0}/500 characters
              </p>
            </div>

            {/* Industry & Company Size */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Industry */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  <Briefcase className="w-4 h-4 inline mr-1" />
                  Industry
                </label>
                <select
                  value={form.industry}
                  onChange={(e) =>
                    setForm({ ...form, industry: e.target.value })
                  }
                  className="input-field"
                >
                  <option value="">Select industry</option>
                  <option value="technology">Technology</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="finance">Finance & Banking</option>
                  <option value="education">Education</option>
                  <option value="retail">Retail & E-commerce</option>
                  <option value="manufacturing">Manufacturing</option>
                  <option value="consulting">Consulting</option>
                  <option value="marketing">Marketing & Advertising</option>
                  <option value="real_estate">Real Estate</option>
                  <option value="legal">Legal Services</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Company Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  <Users className="w-4 h-4 inline mr-1" />
                  Company Size
                </label>
                <select
                  value={form.size}
                  onChange={(e) => setForm({ ...form, size: e.target.value })}
                  className="input-field"
                >
                  <option value="">Select size</option>
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-500">201-500 employees</option>
                  <option value="500+">500+ employees</option>
                </select>
              </div>
            </div>

            {/* Separator */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Regional Settings{' '}
                <Badge variant="primary" size="sm">
                  Available in future updates
                </Badge>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Timezone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Timezone
                  </label>
                  <select
                    value={form.timezone}
                    onChange={(e) =>
                      setForm({ ...form, timezone: e.target.value })
                    }
                    className="input-field"
                  >
                    <option value="UTC">
                      UTC - Coordinated Universal Time
                    </option>
                    <option value="America/New_York">
                      EST - Eastern Standard Time
                    </option>
                    <option value="America/Chicago">
                      CST - Central Standard Time
                    </option>
                    <option value="America/Denver">
                      MST - Mountain Standard Time
                    </option>
                    <option value="America/Los_Angeles">
                      PST - Pacific Standard Time
                    </option>
                    <option value="Europe/London">
                      GMT - Greenwich Mean Time
                    </option>
                    <option value="Europe/Paris">
                      CET - Central European Time
                    </option>
                    <option value="Asia/Dubai">GST - Gulf Standard Time</option>
                    <option value="Asia/Karachi">
                      PKT - Pakistan Standard Time
                    </option>
                    <option value="Asia/Kolkata">
                      IST - India Standard Time
                    </option>
                    <option value="Asia/Singapore">SGT - Singapore Time</option>
                    <option value="Australia/Sydney">
                      AEST - Australian Eastern Time
                    </option>
                  </select>
                </div>

                {/* Date Format */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Date Format
                  </label>
                  <select
                    value={form.dateFormat}
                    onChange={(e) =>
                      setForm({ ...form, dateFormat: e.target.value })
                    }
                    className="input-field"
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY (UK/EU)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                  </select>
                </div>

                {/* Currency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Currency
                  </label>
                  <select
                    value={form.currency}
                    onChange={(e) =>
                      setForm({ ...form, currency: e.target.value })
                    }
                    className="input-field"
                  >
                    <option value="USD">USD ($) - US Dollar</option>
                    <option value="EUR">EUR (€) - Euro</option>
                    <option value="GBP">GBP (£) - British Pound</option>
                    <option value="PKR">PKR (₨) - Pakistani Rupee</option>
                    <option value="INR">INR (₹) - Indian Rupee</option>
                    <option value="AED">AED (د.إ) - UAE Dirham</option>
                    <option value="SAR">SAR (﷼) - Saudi Riyal</option>
                  </select>
                </div>

                {/* Language */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Language
                  </label>
                  <select
                    value={form.language}
                    onChange={(e) =>
                      setForm({ ...form, language: e.target.value })
                    }
                    className="input-field"
                  >
                    <option value="en">English</option>
                    <option value="es">Español (Spanish)</option>
                    <option value="fr">Français (French)</option>
                    <option value="de">Deutsch (German)</option>
                    <option value="ar">العربية (Arabic)</option>
                    <option value="ur">اردو (Urdu)</option>
                    <option value="zh">中文 (Chinese)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Changes are saved immediately for all workspace members
              </p>
              <Button
                onClick={handleSave}
                icon={hasChanges ? Save : CheckCircle}
                loading={saving}
                disabled={!hasChanges}
                variant={hasChanges ? 'primary' : 'secondary'}
              >
                {hasChanges ? 'Save Changes' : 'Up to Date'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workspace Info Sidebar */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary-600" />
              Workspace Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Name */}
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
              <p className="text-xs text-blue-500 dark:text-blue-400 font-medium mb-0.5">
                Workspace Name
              </p>
              <p className="font-semibold text-blue-700 dark:text-blue-300">
                {workspace?.name || 'Not set'}
              </p>
            </div>

            {/* Slug */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-0.5">
                Slug / URL
              </p>
              <p className="font-mono text-sm text-gray-700 dark:text-gray-300">
                {workspace?.slug || 'N/A'}
              </p>
            </div>

            {/* Description */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-0.5">
                Description
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {workspace?.description || 'No description added yet'}
              </p>
            </div>

            {/* Industry */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-0.5">
                Industry
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                {workspace?.industry
                  ? workspace.industry.replace('_', ' ')
                  : 'Not specified'}
              </p>
            </div>

            {/* Company Size */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-0.5">
                Company Size
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {workspace?.size || 'Not specified'}
              </p>
            </div>

            {/* Created */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-0.5">
                Created
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {workspace?.createdAt
                  ? new Date(workspace.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'N/A'}
              </p>
            </div>

            {/* Member Count */}
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
              <p className="text-xs text-green-500 dark:text-green-400 font-medium mb-0.5">
                Members
              </p>
              <p className="font-semibold text-green-700 dark:text-green-300">
                {workspace?.memberCount || 0} active members
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Tips */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">💡 Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-primary-500 mt-0.5">•</span>
                Your workspace slug is used in URLs and cannot be changed.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-500 mt-0.5">•</span>
                Timezone and currency affect how dates and amounts are
                displayed.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-500 mt-0.5">•</span>
                Changes apply to all workspace members immediately.
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GeneralSettings;
