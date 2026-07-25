import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  CheckCircle,
  XCircle,
  Loader,
  ArrowLeft,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import apiClient from '../../api/axios';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import {
  setCredentials,
  setUser,
  setWorkspace,
} from '../../store/slices/authSlice';

const SlugHint = ({ status, available, slug }) => {
  if (!slug || status === 'idle') return null;
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
        <CheckCircle className="w-3 h-3" /> &ldquo;{slug}&rdquo; is available
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400 mt-1">
      <XCircle className="w-3 h-3" /> &ldquo;{slug}&rdquo; is already taken
    </span>
  );
};

let slugTimer = null;

const CreateWorkspace = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    industry: '',
    size: '',
  });
  const [slugStatus, setSlugStatus] = useState({
    status: 'idle',
    available: null,
    slug: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
      setFormData((prev) => ({ ...prev, slug: data.data.slug }));
    } catch {
      setSlugStatus({ status: 'idle', available: null, slug });
    }
  }, []);

  const scheduleSlugCheck = (slug) => {
    clearTimeout(slugTimer);
    slugTimer = setTimeout(() => checkSlug(slug), 500);
  };

  const handleNameChange = (e) => {
    const name = e.target.value;
    const autoSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    setFormData((prev) => ({ ...prev, name, slug: autoSlug }));
    setSlugStatus({ status: 'pending', available: null, slug: autoSlug });
    scheduleSlugCheck(autoSlug);
  };

  const handleSlugChange = (e) => {
    const slug = e.target.value;
    setFormData((prev) => ({ ...prev, slug }));
    setSlugStatus({ status: 'pending', available: null, slug });
    scheduleSlugCheck(slug);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    if (slugStatus.status === 'done' && slugStatus.available === false) return;
    setLoading(true);
    setError(null);
    let createdSlug = null;

    try {
      await apiClient.post('/workspaces/create', {
        name: formData.name,
        workspaceSlug: formData.slug || undefined,
        industry: formData.industry || undefined,
        size: formData.size || undefined,
      });

      const { data: slugData } = await apiClient.get(
        `/auth/check-workspace-slug?slug=${encodeURIComponent(formData.slug)}`
      );

      const { data: wsData } = await apiClient.get('/auth/my-workspaces');
      const newWorkspace = wsData.data.workspaces.find(
        (w) => w.slug === (slugData.data.slug || formData.slug)
      );

      if (newWorkspace) {
        const { data: switchData } = await apiClient.post(
          '/auth/switch-workspace',
          {
            workspaceId: newWorkspace._id,
          }
        );
        const {
          user,
          workspace: ws,
          accessToken,
          refreshToken,
        } = switchData.data;
        createdSlug = ws.slug;
        localStorage.setItem('workspaceSlug', ws.slug);
        dispatch(setCredentials({ accessToken, refreshToken }));
        dispatch(setUser(user));
        dispatch(setWorkspace(ws));
      }

      toast.success(`Workspace "${formData.name}" created!`);

      navigate(createdSlug ? `/${createdSlug}/dashboard` : '/select-workspace');
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Failed to create workspace. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const slugTaken =
    slugStatus.status === 'done' && slugStatus.available === false;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/20 mb-4">
              <Building2 className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
            <CardTitle>Create a New Workspace</CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Each workspace is a completely isolated environment with its own
              members, projects, and data.
            </p>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <Input
              label="Workspace Name *"
              icon={Building2}
              placeholder="Acme Corp"
              value={formData.name}
              onChange={handleNameChange}
              required
            />

            {/* Slug */}
            <div>
              <Input
                label="Workspace URL"
                placeholder="acme-corp"
                value={formData.slug}
                onChange={handleSlugChange}
                prefix="workspace/"
              />
              <SlugHint
                status={slugStatus.status}
                available={slugStatus.available}
                slug={slugStatus.slug}
              />
            </div>

            {/* Industry + Size */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Industry
                </label>
                <select
                  value={formData.industry}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, industry: e.target.value }))
                  }
                  className="input-field"
                >
                  <option value="">Select…</option>
                  <option value="technology">Technology</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="finance">Finance</option>
                  <option value="education">Education</option>
                  <option value="retail">Retail</option>
                  <option value="consulting">Consulting</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Company Size
                </label>
                <select
                  value={formData.size}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, size: e.target.value }))
                  }
                  className="input-field"
                >
                  <option value="">Select…</option>
                  <option value="1-10">1–10</option>
                  <option value="11-50">11–50</option>
                  <option value="51-200">51–200</option>
                  <option value="201-500">201–500</option>
                  <option value="500+">500+</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate(-1)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button
                type="submit"
                loading={loading}
                disabled={!formData.name.trim() || slugTaken}
                className="flex-1"
              >
                Create Workspace
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateWorkspace;
