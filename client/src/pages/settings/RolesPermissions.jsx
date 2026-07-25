import { useState } from 'react';
import { Shield, Save, Info } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { PermissionGuard } from '../../components/guards/PermissionGuard';
import { usePermissions } from '../../hooks/usePermissions';
import { useApiData } from '../../hooks/useApiData';
import axios from '../../api/axios';
import toast from 'react-hot-toast';

const roleInfo = {
  super_admin: {
    label: 'Super Admin',
    color: 'red',
    description: 'Full platform access.',
  },
  company_admin: {
    label: 'Company Admin',
    color: 'purple',
    description: 'Full workspace access.',
  },
  project_manager: {
    label: 'Project Manager',
    color: 'blue',
    description: 'Manages projects and tasks.',
  },
  team_lead: {
    label: 'Team Lead',
    color: 'green',
    description: 'Leads a team.',
  },
  employee: {
    label: 'Employee',
    color: 'yellow',
    description: 'Basic access.',
  },
  client: { label: 'Client', color: 'gray', description: 'Limited access.' },
};

const fetchPermissions = async () => {
  const { data } = await axios.get('/permissions');
  return data.data;
};

const RolesPermissions = () => {
  const { role } = usePermissions();
  const [selectedRole, setSelectedRole] = useState(role);
  const [saving, setSaving] = useState(false);
  const { data: permissionsData, loading } = useApiData(fetchPermissions);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put('/permissions/update', {
        role: selectedRole,
        permissions: permissionsData,
      });
      toast.success('Permissions updated successfully');
    } catch {
      toast.error('Failed to update permissions');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Roles & Permissions"
          description="Manage access control for your workspace"
        />
        <Card>
          <CardContent>
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-gray-200 dark:bg-gray-700 rounded"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Permissions"
        description="Manage access control for your workspace"
      >
        <PermissionGuard permission="manage_users">
          <Button onClick={handleSave} icon={Save} loading={saving}>
            Save Changes
          </Button>
        </PermissionGuard>
      </PageHeader>

      {/* Role Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Role</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(roleInfo).map(([roleKey, info]) => (
              <button
                key={roleKey}
                onClick={() => setSelectedRole(roleKey)}
                className={`p-4 rounded-lg border-2 transition-all text-center ${
                  selectedRole === roleKey
                    ? `border-${info.color}-500 bg-${info.color}-50 dark:bg-${info.color}-900/20`
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Shield
                  className={`w-6 h-6 mx-auto mb-2 text-${info.color}-500`}
                />
                <p className="text-sm font-medium">{info.label}</p>
              </button>
            ))}
          </div>

          {selectedRole && roleInfo[selectedRole] && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {roleInfo[selectedRole].description}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permissions Grid */}
      <PermissionGuard permission="manage_users" showLocked>
        <Card>
          <CardHeader>
            <CardTitle>
              Permissions for {roleInfo[selectedRole]?.label || selectedRole}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {permissionsData ? (
              <div className="space-y-6">
                {Object.entries(permissionsData).map(([category, perms]) => (
                  <div key={category}>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
                      {category}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {Array.isArray(perms) &&
                        perms.map((perm) => (
                          <label
                            key={perm}
                            className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              defaultChecked
                              className="rounded border-gray-300 dark:border-gray-600"
                            />
                            <span className="text-sm capitalize text-gray-700 dark:text-gray-300">
                              {perm.replace(/_/g, ' ')}
                            </span>
                          </label>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No permissions data available
              </div>
            )}
          </CardContent>
        </Card>
      </PermissionGuard>
    </div>
  );
};

export default RolesPermissions;
