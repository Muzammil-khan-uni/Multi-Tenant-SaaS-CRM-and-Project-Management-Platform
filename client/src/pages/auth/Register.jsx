import { useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Mail,
  Lock,
  User,
  Globe,
  Briefcase,
  Users,
  CheckCircle,
  XCircle,
  Loader,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../../components/common/Card';
import apiClient from '../../api/axios';

function useDebounce(fn, delay = 500) {
  const timerRef = useRef(null);

  return useCallback(
    (...args) => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => fn(...args), delay);
    },
    [fn, delay]
  );
}

const AvailabilityHint = ({ status, available, message }) => {
  if (status === 'idle' || status === 'pending') return null;
  if (status === 'checking') {
    return (
      <span className="flex items-center gap-1 text-xs text-gray-400 mt-1">
        <Loader className="w-3 h-3 animate-spin" /> Checking…
      </span>
    );
  }
  if (available === true) {
    return (
      <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-1">
        <CheckCircle className="w-3 h-3" /> {message || 'Available'}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400 mt-1">
      <XCircle className="w-3 h-3" /> {message || 'Not available'}
    </span>
  );
};

const Register = () => {
  const { register, loading, error } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    workspaceName: '',
    workspaceSlug: '',
    industry: '',
    size: '',

    legalName: '',
    website: '',
    phone: '',
    address: { street: '', city: '', state: '', zipCode: '', country: '' },

    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [slugStatus, setSlugStatus] = useState({
    status: 'idle',
    available: null,
    slug: '',
  });
  const [emailStatus, setEmailStatus] = useState({
    status: 'idle',
    available: null,
  });

  const updateField = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const updateNestedField = (parent, field, value) =>
    setFormData((prev) => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value },
    }));

  const checkSlug = useCallback(async (slug) => {
    if (!slug || slug.length < 2) return;
    setSlugStatus((s) => ({ ...s, status: 'checking' }));
    try {
      const { data } = await apiClient.get(
        `/auth/check-workspace-slug?slug=${encodeURIComponent(slug)}`
      );
      setSlugStatus({
        status: 'done',
        available: data.data.available,
        slug: data.data.slug,
      });

      setFormData((prev) => ({ ...prev, workspaceSlug: data.data.slug }));
    } catch {
      setSlugStatus({ status: 'idle', available: null, slug });
    }
  }, []);

  const debouncedCheckSlug = useDebounce(checkSlug, 500);

  const handleWorkspaceNameChange = (value) => {
    updateField('workspaceName', value);
    const autoSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    updateField('workspaceSlug', autoSlug);
    setSlugStatus({ status: 'pending', available: null, slug: autoSlug });
    debouncedCheckSlug(autoSlug);
  };

  const handleSlugChange = (value) => {
    updateField('workspaceSlug', value);
    setSlugStatus({ status: 'pending', available: null, slug: value });
    debouncedCheckSlug(value);
  };

  const checkEmail = useCallback(async (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return;
    setEmailStatus({ status: 'checking', available: null });
    try {
      const { data } = await apiClient.get(
        `/auth/check-email?email=${encodeURIComponent(email)}`
      );
      setEmailStatus({ status: 'done', available: data.data.available });
    } catch {
      setEmailStatus({ status: 'idle', available: null });
    }
  }, []);

  const debouncedCheckEmail = useDebounce(checkEmail, 600);

  const handleEmailChange = (value) => {
    updateField('email', value);
    setEmailStatus({ status: 'pending', available: null });
    debouncedCheckEmail(value);
  };

  const canAdvanceStep1 = () => {
    if (!formData.workspaceName.trim()) return false;
    if (slugStatus.status === 'done' && slugStatus.available === false)
      return false;
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (step < 3) {
      if (step === 1 && !canAdvanceStep1()) return;
      setStep(step + 1);
      return;
    }

    if (formData.password !== formData.confirmPassword) return;
    if (emailStatus.status === 'done' && emailStatus.available === false)
      return;

    try {
      await register({
        workspaceName: formData.workspaceName,
        workspaceSlug: formData.workspaceSlug || undefined,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        industry: formData.industry,
        size: formData.size,
        company: {
          legalName: formData.legalName,
          website: formData.website,
          phone: formData.phone,
          address: formData.address,
        },
      });
    } catch {
      // Error surfaced via Redux `error` field
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/20 mb-4">
              <Building2 className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
            <CardTitle>
              {step === 1 && 'Create Workspace'}
              {step === 2 && 'Company Details'}
              {step === 3 && 'Company Admin Account'}
            </CardTitle>
            <p className="text-sm text-gray-500 mt-2">Step {step} of 3</p>
            <div className="flex gap-2 mt-4">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`flex-1 h-1.5 rounded-full transition-all ${
                    s <= step
                      ? 'bg-primary-500'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ── Step 1: Workspace ───────────────────────────────────────── */}
            {step === 1 && (
              <>
                <Input
                  label="Workspace Name *"
                  icon={Building2}
                  placeholder="Acme Corp"
                  value={formData.workspaceName}
                  onChange={(e) => handleWorkspaceNameChange(e.target.value)}
                  required
                />

                {/* Slug preview + manual override */}
                <div>
                  <Input
                    label="Workspace URL slug"
                    placeholder="acme-corp"
                    value={formData.workspaceSlug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    prefix="workspace/"
                  />
                  <AvailabilityHint
                    status={slugStatus.status}
                    available={slugStatus.available}
                    message={
                      slugStatus.available === true
                        ? `"${slugStatus.slug}" is available`
                        : `"${slugStatus.slug}" is already taken`
                    }
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Industry
                    </label>
                    <select
                      value={formData.industry}
                      onChange={(e) => updateField('industry', e.target.value)}
                      className="input-field"
                    >
                      <option value="">Select</option>
                      <option value="technology">Technology</option>
                      <option value="healthcare">Healthcare</option>
                      <option value="finance">Finance</option>
                      <option value="education">Education</option>
                      <option value="retail">Retail</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Company Size
                    </label>
                    <select
                      value={formData.size}
                      onChange={(e) => updateField('size', e.target.value)}
                      className="input-field"
                    >
                      <option value="">Select</option>
                      <option value="1-10">1–10</option>
                      <option value="11-50">11–50</option>
                      <option value="51-200">51–200</option>
                      <option value="201-500">201–500</option>
                      <option value="500+">500+</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* ── Step 2: Company Details ─────────────────────────────────── */}
            {step === 2 && (
              <>
                <Input
                  label="Legal Company Name"
                  icon={Briefcase}
                  placeholder="Acme Corporation Ltd."
                  value={formData.legalName}
                  onChange={(e) => updateField('legalName', e.target.value)}
                />
                <Input
                  label="Website"
                  icon={Globe}
                  placeholder="https://acme.com"
                  value={formData.website}
                  onChange={(e) => updateField('website', e.target.value)}
                />
                <Input
                  label="Phone"
                  icon={Users}
                  placeholder="+1 (555) 000-0000"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                />
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Address
                  </label>
                  <Input
                    placeholder="Street"
                    value={formData.address.street}
                    onChange={(e) =>
                      updateNestedField('address', 'street', e.target.value)
                    }
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    <Input
                      placeholder="City"
                      value={formData.address.city}
                      onChange={(e) =>
                        updateNestedField('address', 'city', e.target.value)
                      }
                    />
                    <Input
                      placeholder="State"
                      value={formData.address.state}
                      onChange={(e) =>
                        updateNestedField('address', 'state', e.target.value)
                      }
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    <Input
                      placeholder="Zip Code"
                      value={formData.address.zipCode}
                      onChange={(e) =>
                        updateNestedField('address', 'zipCode', e.target.value)
                      }
                    />
                    <Input
                      placeholder="Country"
                      value={formData.address.country}
                      onChange={(e) =>
                        updateNestedField('address', 'country', e.target.value)
                      }
                    />
                  </div>
                </div>
              </>
            )}

            {/* ── Step 3: Admin Account ───────────────────────────────────── */}
            {step === 3 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="First Name *"
                    icon={User}
                    value={formData.firstName}
                    onChange={(e) => updateField('firstName', e.target.value)}
                    required
                  />
                  <Input
                    label="Last Name *"
                    value={formData.lastName}
                    onChange={(e) => updateField('lastName', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Input
                    label="Email *"
                    type="email"
                    icon={Mail}
                    value={formData.email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    required
                  />
                  <AvailabilityHint
                    status={emailStatus.status}
                    available={emailStatus.available}
                    message={
                      emailStatus.available === true
                        ? 'Email is available'
                        : 'An account already exists with this email'
                    }
                  />
                </div>

                <Input
                  label="Password *"
                  type="password"
                  icon={Lock}
                  placeholder="Min. 8 characters"
                  value={formData.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  required
                />

                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                    Password Requirements:
                  </p>
                  <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                    <li>• At least 8 characters</li>
                    <li>• One uppercase letter</li>
                    <li>• One lowercase letter</li>
                    <li>• One number</li>
                    <li>• One special character (@$!%*?&)</li>
                  </ul>
                </div>

                <Input
                  label="Confirm Password *"
                  type="password"
                  icon={Lock}
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    updateField('confirmPassword', e.target.value)
                  }
                  required
                />
                {formData.password &&
                  formData.confirmPassword &&
                  formData.password !== formData.confirmPassword && (
                    <p className="text-sm text-red-500">
                      Passwords do not match
                    </p>
                  )}
              </>
            )}

            {/* Global error from Redux */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex gap-3 pt-2">
              {step > 1 && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setStep(step - 1)}
                  className="flex-1"
                >
                  Back
                </Button>
              )}
              <Button
                type="submit"
                loading={loading}
                className="flex-1"
                disabled={
                  (step === 1 &&
                    slugStatus.status === 'done' &&
                    slugStatus.available === false) ||
                  (step === 3 &&
                    emailStatus.status === 'done' &&
                    emailStatus.available === false)
                }
              >
                {step < 3 ? 'Continue' : 'Create Workspace'}
              </Button>
            </div>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Already have a workspace?{' '}
              <Link
                to="/login"
                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
              >
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
