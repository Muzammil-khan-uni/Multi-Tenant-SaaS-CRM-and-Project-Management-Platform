import { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { authAPI } from '../../api/auth.api';
import toast from 'react-hot-toast';

export const ChangePasswordModal = ({ isOpen, onClose }) => {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const reset = () => {
    setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setErrors({});
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const validate = () => {
    const next = {};
    if (!form.currentPassword) next.currentPassword = 'Current password is required';
    if (!form.newPassword) {
      next.newPassword = 'New password is required';
    } else if (form.newPassword.length < 8) {
      next.newPassword = 'Must be at least 8 characters';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(form.newPassword)) {
      next.newPassword =
        'Must include uppercase, lowercase, number and special character';
    }
    if (form.confirmPassword !== form.newPassword) {
      next.confirmPassword = 'Passwords do not match';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      await authAPI.updatePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast.success('Password updated successfully');
      handleClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Change Password" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Current Password"
          type="password"
          value={form.currentPassword}
          onChange={(e) => update('currentPassword', e.target.value)}
          error={errors.currentPassword}
        />
        <Input
          label="New Password"
          type="password"
          value={form.newPassword}
          onChange={(e) => update('newPassword', e.target.value)}
          error={errors.newPassword}
        />
        <Input
          label="Confirm New Password"
          type="password"
          value={form.confirmPassword}
          onChange={(e) => update('confirmPassword', e.target.value)}
          error={errors.confirmPassword}
        />
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Update Password
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ChangePasswordModal;
