import { useState } from 'react';
import { Lock, Save, CheckCircle, XCircle } from 'lucide-react';
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
import { useDispatch } from 'react-redux';
import { setCredentials } from '../../store/slices/authSlice';

const SecuritySettings = () => {
  const dispatch = useDispatch();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState(0);

  const checkStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
    if (password.match(/\d/)) strength++;
    if (password.match(/[^a-zA-Z\d]/)) strength++;
    return strength;
  };

  const handleNewPasswordChange = (value) => {
    setForm({ ...form, newPassword: value });
    setPasswordStrength(checkStrength(value));
    if (errors.newPassword) setErrors({ ...errors, newPassword: '' });
  };

  const validate = () => {
    const newErrors = {};
    if (!form.currentPassword)
      newErrors.currentPassword = 'Current password is required';
    if (!form.newPassword) newErrors.newPassword = 'New password is required';
    else if (form.newPassword.length < 8)
      newErrors.newPassword = 'Must be at least 8 characters';
    else if (passwordStrength < 3)
      newErrors.newPassword = 'Password is too weak';
    if (form.newPassword !== form.confirmPassword)
      newErrors.confirmPassword = 'Passwords do not match';
    if (form.currentPassword === form.newPassword)
      newErrors.newPassword = 'New password must be different from current';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const { data } = await axios.put('/auth/update-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });

      if (data.data?.accessToken) {
        dispatch(
          setCredentials({
            accessToken: data.data.accessToken,
            refreshToken: data.data.refreshToken,
          })
        );
      }

      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordStrength(0);
      setErrors({});
      toast.success('Password updated successfully');
    } catch (err) {
      const message =
        err.response?.data?.message || 'Failed to update password';
      toast.error(message);

      if (err.response?.status === 401) {
        setErrors({ currentPassword: 'Current password is incorrect' });
      }
    } finally {
      setSaving(false);
    }
  };

  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-blue-500',
    'bg-green-500',
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-primary-600" />
          Change Password
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 max-w-lg">
        {/* Current Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Current Password
          </label>
          <div className="relative">
            <Input
              type="password"
              value={form.currentPassword}
              onChange={(e) => {
                setForm({ ...form, currentPassword: e.target.value });
                if (errors.currentPassword)
                  setErrors({ ...errors, currentPassword: '' });
              }}
              placeholder="Enter your current password"
              error={errors.currentPassword}
            />
          </div>
        </div>

        {/* New Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            New Password
          </label>
          <div className="relative">
            <Input
              type="password"
              value={form.newPassword}
              onChange={(e) => handleNewPasswordChange(e.target.value)}
              placeholder="Enter new password"
              error={errors.newPassword}
            />
          </div>

          {/* Password Strength Meter */}
          {form.newPassword && (
            <div className="mt-2">
              <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={`h-1.5 flex-1 rounded-full transition-all ${
                      passwordStrength >= level
                        ? strengthColors[passwordStrength - 1]
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                ))}
              </div>
              <p
                className={`text-xs ${
                  passwordStrength >= 4
                    ? 'text-green-600'
                    : passwordStrength >= 3
                      ? 'text-blue-600'
                      : passwordStrength >= 2
                        ? 'text-yellow-600'
                        : 'text-red-600'
                }`}
              >
                {strengthLabels[Math.min(passwordStrength, 4)]}
              </p>
            </div>
          )}

          {/* Password Requirements */}
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-1.5">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password must contain:
            </p>
            {[
              {
                check: form.newPassword.length >= 8,
                label: 'At least 8 characters',
              },
              {
                check:
                  /[A-Z]/.test(form.newPassword) &&
                  /[a-z]/.test(form.newPassword),
                label: 'Upper and lowercase letters',
              },
              {
                check: /\d/.test(form.newPassword),
                label: 'At least one number',
              },
              {
                check: /[^a-zA-Z\d]/.test(form.newPassword),
                label: 'At least one special character',
              },
            ].map(({ check, label }, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                {check ? (
                  <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-gray-400" />
                )}
                <span
                  className={
                    check
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-500'
                  }
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Confirm New Password
          </label>
          <Input
            type="password"
            value={form.confirmPassword}
            onChange={(e) => {
              setForm({ ...form, confirmPassword: e.target.value });
              if (errors.confirmPassword)
                setErrors({ ...errors, confirmPassword: '' });
            }}
            placeholder="Confirm your new password"
            error={errors.confirmPassword}
          />
          {form.newPassword &&
            form.confirmPassword &&
            form.newPassword === form.confirmPassword && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Passwords match
              </p>
            )}
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-2">
          <Button onClick={handleSave} icon={Save} loading={saving}>
            Update Password
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SecuritySettings;
