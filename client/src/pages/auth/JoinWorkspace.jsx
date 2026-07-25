import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  User,
  Lock,
  Shield,
  Users,
  Briefcase,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import apiClient from '../../api/axios';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import {
  setCredentials,
  setUser,
  setWorkspace,
} from '../../store/slices/authSlice';

const roleIcons = {
  owner: Shield,
  company_admin: Shield,
  project_manager: Briefcase,
};

const roleColors = {
  owner: 'purple',
  company_admin: 'purple',
  project_manager: 'blue',
  team_lead: 'green',
  employee: 'green',
  client: 'gray',
};

const roleLabels = {
  owner: 'Owner',
  company_admin: 'Company Admin',
  project_manager: 'Project Manager',
  team_lead: 'Team Lead',
  employee: 'Employee',
  client: 'Client',
};

const InvitationBanner = ({ preview }) => {
  const RoleIcon = roleIcons[preview.role] || Users;
  return (
    <div className="mb-6 p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl">
      <div className="flex items-center gap-3">
        {preview.workspaceLogo ? (
          <img
            src={preview.workspaceLogo}
            alt={preview.workspaceName}
            className="w-10 h-10 rounded-lg object-contain flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-800/50 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white truncate">
            {preview.workspaceName}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Invited by {preview.inviterName}
          </p>
        </div>
        <Badge
          variant={roleColors[preview.role] || 'gray'}
          className="ml-auto flex-shrink-0"
        >
          <RoleIcon className="w-3 h-3 mr-1 inline" />
          {roleLabels[preview.role] ||
            preview.role?.replace(/_/g, ' ') ||
            'Member'}
        </Badge>
      </div>
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Invitation sent to{' '}
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {preview.invitedEmail}
        </span>
      </p>
    </div>
  );
};

const JoinWorkspace = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setPreviewError('Missing invitation token.');
        setPreviewLoading(false);
        return;
      }
      try {
        const { data } = await apiClient.get(`/workspaces/join/${token}`);
        setPreview(data.data);
      } catch (err) {
        setPreviewError(
          err.response?.data?.message ||
            'This invitation link is invalid or has expired.'
        );
      } finally {
        setPreviewLoading(false);
      }
    };
    load();
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.firstName.trim()) errs.firstName = 'First name is required';
    if (!formData.lastName.trim()) errs.lastName = 'Last name is required';
    if (!formData.password) errs.password = 'Password is required';
    else if (formData.password.length < 8)
      errs.password = 'Password must be at least 8 characters';
    if (formData.password !== formData.confirmPassword)
      errs.confirmPassword = 'Passwords do not match';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const accept = async (extraPayload = {}) => {
    setSubmitting(true);
    try {
      const { data } = await apiClient.post(
        `/workspaces/join/${token}`,
        extraPayload
      );
      const { user, accessToken, refreshToken: rt } = data.data;

      dispatch(setCredentials({ accessToken, refreshToken: rt }));
      dispatch(setUser(user));
      dispatch(setWorkspace(user.workspace));

      toast.success(
        data.message ||
          `Welcome to ${user.workspace?.name || 'your workspace'}!`
      );
      navigate(
        user.workspace?.slug
          ? `/${user.workspace.slug}/dashboard`
          : '/select-workspace'
      );
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Failed to join workspace. The invitation link may be invalid or expired.';
      toast.error(msg);
      setFormErrors({ submit: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewUserSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    await accept({
      firstName: formData.firstName,
      lastName: formData.lastName,
      password: formData.password,
    });
  };

  if (previewLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-100 dark:from-gray-900 dark:to-gray-800">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (previewError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Invalid Invitation
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {previewError}
            </p>
            <Link
              to="/login"
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium text-sm"
            >
              Go to Login →
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (preview?.isExistingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle>You&apos;re invited!</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                You already have an account. Accept the invitation below to join{' '}
                <strong>{preview.workspaceName}</strong> as a new workspace.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <InvitationBanner preview={preview} />

            <Button
              className="w-full"
              loading={submitting}
              onClick={() => accept({})}
              type="button"
            >
              Accept Invitation &amp; Open Dashboard
            </Button>

            {formErrors.submit && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {formErrors.submit}
                </p>
              </div>
            )}

            <p className="text-center text-xs text-gray-500 dark:text-gray-400">
              Want to use a different account?{' '}
              <Link
                to="/login"
                className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
              >
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/20 mb-4">
              <Building2 className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
            <CardTitle>Join {preview.workspaceName}</CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Create your account to get started
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <InvitationBanner preview={preview} />

          <form onSubmit={handleNewUserSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First Name"
                name="firstName"
                icon={User}
                placeholder="Jane"
                value={formData.firstName}
                onChange={handleChange}
                error={formErrors.firstName}
                required
              />
              <Input
                label="Last Name"
                name="lastName"
                placeholder="Smith"
                value={formData.lastName}
                onChange={handleChange}
                error={formErrors.lastName}
                required
              />
            </div>

            <Input
              label="Password"
              type="password"
              name="password"
              icon={Lock}
              placeholder="Min. 8 characters"
              value={formData.password}
              onChange={handleChange}
              error={formErrors.password}
              required
            />

            <Input
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              icon={Lock}
              placeholder="Repeat your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={formErrors.confirmPassword}
              required
            />

            {formErrors.submit && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {formErrors.submit}
                </p>
              </div>
            )}

            <Button type="submit" loading={submitting} className="w-full">
              Create Account &amp; Join
            </Button>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Already have an account?{' '}
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

export default JoinWorkspace;
