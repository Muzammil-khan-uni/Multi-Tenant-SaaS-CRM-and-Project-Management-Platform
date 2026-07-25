import { useState, useRef } from 'react';
import { Plus, Trash2, Camera, Loader2, X } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Avatar } from '../../components/common/Avatar';
import { useFileUpload } from '../../hooks/useFileUpload';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];

export const EditProfileModal = ({ isOpen, onClose, user, onSave, saving }) => {
  const fileInputRef = useRef(null);
  const { uploadFile, uploading } = useFileUpload();

  const [form, setForm] = useState(() => ({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    position: user?.position || '',
    department: user?.department || '',
    bio: user?.bio || '',
    avatar: user?.avatar || null,
    address: {
      street: user?.address?.street || '',
      city: user?.address?.city || '',
      state: user?.address?.state || '',
      zipCode: user?.address?.zipCode || '',
      country: user?.address?.country || '',
    },
    skills:
      user?.skills?.length > 0
        ? user.skills.map((s) => ({
            name: s.name || '',
            level: s.level || 'intermediate',
          }))
        : [],
  }));

  const update = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));
  const updateAddress = (field, value) =>
    setForm((prev) => ({
      ...prev,
      address: { ...prev.address, [field]: value },
    }));

  const addSkill = () =>
    setForm((prev) => ({
      ...prev,
      skills: [...prev.skills, { name: '', level: 'intermediate' }],
    }));

  const updateSkill = (index, field, value) =>
    setForm((prev) => ({
      ...prev,
      skills: prev.skills.map((s, i) =>
        i === index ? { ...s, [field]: value } : s
      ),
    }));

  const removeSkill = (index) =>
    setForm((prev) => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index),
    }));

  const handleAvatarPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await uploadFile(file);
      update('avatar', result);
      toast.success('Photo uploaded successfully');
    } catch {
      // useFileUpload already toasts the error
    }
  };

  const handleDeleteAvatar = () => {
    update('avatar', null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.success('Photo removed');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('First and last name are required');
      return;
    }
    const cleanedSkills = form.skills
      .map((s) => ({ name: s.name.trim(), level: s.level }))
      .filter((s) => s.name);
    onSave({ ...form, skills: cleanedSkills });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Avatar Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Profile Photo
          </label>
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="relative group">
              <Avatar
                src={form.avatar?.url}
                name={`${form.firstName} ${form.lastName}`}
                size="2xl"
                className="w-20 h-20 sm:w-24 sm:h-24 ring-4 ring-gray-100 dark:ring-gray-700"
              />

              {/* Delete button - shows when avatar exists */}
              {form.avatar && (
                <motion.button
                  type="button"
                  onClick={handleDeleteAvatar}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                  title="Remove photo"
                >
                  <X className="w-3.5 h-3.5" />
                </motion.button>
              )}

              {/* Upload button */}
              <motion.button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="absolute -bottom-1 -right-1 p-1.5 sm:p-2 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-colors ring-2 ring-white dark:ring-gray-800"
                title="Upload new photo"
              >
                {uploading ? (
                  <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
              </motion.button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarPick}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Upload a new profile photo or remove the existing one.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="text-xs sm:text-sm"
                  >
                    <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" />
                    {uploading
                      ? 'Uploading...'
                      : form.avatar
                        ? 'Change Photo'
                        : 'Upload Photo'}
                  </Button>

                  {form.avatar && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteAvatar}
                      className="text-xs sm:text-sm text-red-600 hover:text-red-700 border-red-300 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" />
                      Remove Photo
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Recommended: Square image, at least 400x400px. Max size: 5MB
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Basic info */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Basic Information
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={form.firstName}
              onChange={(e) => update('firstName', e.target.value)}
              required
              placeholder="Enter your first name"
            />
            <Input
              label="Last Name"
              value={form.lastName}
              onChange={(e) => update('lastName', e.target.value)}
              required
              placeholder="Enter your last name"
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="+1 234 567 8900"
              type="tel"
            />
            <Input
              label="Position"
              value={form.position}
              onChange={(e) => update('position', e.target.value)}
              placeholder="e.g. Senior Product Designer"
            />
            <Input
              label="Department"
              value={form.department}
              onChange={(e) => update('department', e.target.value)}
              placeholder="e.g. Engineering"
              className="sm:col-span-2"
            />
          </div>
        </div>

        {/* About me */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            About Me
          </label>
          <div className="relative">
            <textarea
              className="input-field min-h-[90px] sm:min-h-[100px] resize-none pr-16"
              maxLength={500}
              value={form.bio}
              onChange={(e) => update('bio', e.target.value)}
              placeholder="Tell your team a bit about yourself, your interests, and what you're passionate about..."
            />
            <div className="absolute bottom-2 right-3">
              <span
                className={`text-xs font-medium ${
                  form.bio.length > 450
                    ? 'text-amber-500'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {form.bio.length}/500
              </span>
            </div>
          </div>
        </div>

        {/* Address */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Address
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Street"
              value={form.address.street}
              onChange={(e) => updateAddress('street', e.target.value)}
              className="sm:col-span-2"
              placeholder="123 Main Street"
            />
            <Input
              label="City"
              value={form.address.city}
              onChange={(e) => updateAddress('city', e.target.value)}
              placeholder="San Francisco"
            />
            <Input
              label="State / Province"
              value={form.address.state}
              onChange={(e) => updateAddress('state', e.target.value)}
              placeholder="California"
            />
            <Input
              label="Zip Code"
              value={form.address.zipCode}
              onChange={(e) => updateAddress('zipCode', e.target.value)}
              placeholder="94105"
            />
            <Input
              label="Country"
              value={form.address.country}
              onChange={(e) => updateAddress('country', e.target.value)}
              placeholder="United States"
              className="sm:col-span-2"
            />
          </div>
        </div>

        {/* Skills */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              Skills & Expertise
            </h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={Plus}
              onClick={addSkill}
              className="text-xs sm:text-sm"
            >
              Add Skill
            </Button>
          </div>
          {form.skills.length === 0 && (
            <div className="text-center py-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <p className="text-sm text-gray-400 dark:text-gray-500">
                No skills added yet. Click "Add Skill" to showcase your
                expertise.
              </p>
            </div>
          )}
          <div className="space-y-3">
            {form.skills.map((skill, index) => (
              <motion.div
                key={index}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Input
                  value={skill.name}
                  onChange={(e) => updateSkill(index, 'name', e.target.value)}
                  placeholder="e.g. React, Project Management"
                  className="flex-1"
                />
                <div className="flex items-center gap-2">
                  <select
                    className="input-field w-full sm:w-40"
                    value={skill.level}
                    onChange={(e) =>
                      updateSkill(index, 'level', e.target.value)
                    }
                  >
                    {SKILL_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                      </option>
                    ))}
                  </select>
                  <motion.button
                    type="button"
                    onClick={() => removeSkill(index)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                    title="Remove skill"
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={saving}
            className="w-full sm:w-auto order-1 sm:order-2 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700"
          >
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EditProfileModal;
