import { PermissionGuard, RoleGuard } from './PermissionGuard';

export const withPermission = (WrappedComponent, requiredPermission) => {
  const WithPermissionComponent = (props) => {
    return (
      <PermissionGuard permission={requiredPermission}>
        <WrappedComponent {...props} />
      </PermissionGuard>
    );
  };

  const wrappedName =
    WrappedComponent.displayName || WrappedComponent.name || 'Component';
  WithPermissionComponent.displayName = `withPermission(${wrappedName})`;

  return WithPermissionComponent;
};

export const withRole = (WrappedComponent, allowedRoles) => {
  const WithRoleComponent = (props) => {
    return (
      <RoleGuard roles={allowedRoles}>
        <WrappedComponent {...props} />
      </RoleGuard>
    );
  };

  const wrappedName =
    WrappedComponent.displayName || WrappedComponent.name || 'Component';
  WithRoleComponent.displayName = `withRole(${wrappedName})`;

  return WithRoleComponent;
};
