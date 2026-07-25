import { usePermissions } from '../../hooks/usePermissions';
import { Lock } from 'lucide-react';

export const PermissionGuard = ({
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  showLocked = false,
  children,
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } =
    usePermissions();

  const hasAccess = (() => {
    if (permission) {
      return hasPermission(permission);
    }
    if (permissions && requireAll) {
      return hasAllPermissions(...permissions);
    }
    if (permissions) {
      return hasAnyPermission(...permissions);
    }

    return true;
  })();

  if (!hasAccess) {
    if (showLocked) {
      return (
        <div className="flex items-center justify-center p-8 text-gray-400 dark:text-gray-500">
          <div className="text-center">
            <Lock className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">
              You don't have permission to view this content
            </p>
          </div>
        </div>
      );
    }
    return fallback;
  }

  return children;
};

export const RoleGuard = ({ roles, fallback = null, children }) => {
  const { role } = usePermissions();

  if (!roles || roles.length === 0) {
    return children;
  }

  if (!roles.includes(role)) {
    return fallback;
  }

  return children;
};

export const FeatureGuard = ({ feature, fallback = null, children }) => {
  const { hasPermission } = usePermissions();

  const featurePermissions = {
    timeTracking: 'log_time',
    invoicing: 'view_invoices',
    reports: 'view_reports',
    clientPortal: 'view_clients',
    api: 'manage_api_keys',
  };

  const requiredPermission = featurePermissions[feature];

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return fallback;
  }

  return children;
};
