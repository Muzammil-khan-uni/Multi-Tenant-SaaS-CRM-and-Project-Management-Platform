import { useSelector } from 'react-redux';
import { useCallback, useMemo } from 'react';

export const usePermissions = () => {
  const user = useSelector((state) => state.auth.user);

  const permissions = useMemo(() => user?.permissions || [], [user]);
  const role = useMemo(() => user?.role || 'employee', [user]);

  const hasPermission = useCallback(
    (permission) => {
      if (role === 'super_admin') return true;
      return permissions.includes(permission);
    },
    [permissions, role]
  );

  const hasAnyPermission = useCallback(
    (...requiredPermissions) => {
      if (role === 'super_admin') return true;
      return requiredPermissions.some((p) => permissions.includes(p));
    },
    [permissions, role]
  );

  const hasAllPermissions = useCallback(
    (...requiredPermissions) => {
      if (role === 'super_admin') return true;
      return requiredPermissions.every((p) => permissions.includes(p));
    },
    [permissions, role]
  );

  const canManageRole = useCallback(
    (targetRole) => {
      const roleHierarchy = {
        super_admin: 100,
        company_admin: 80,
        project_manager: 60,
        team_lead: 40,
        employee: 20,
        client: 10,
      };
      return (roleHierarchy[role] || 0) > (roleHierarchy[targetRole] || 0);
    },
    [role]
  );

  const roleLevel = useMemo(() => {
    const hierarchy = {
      super_admin: 100,
      company_admin: 80,
      project_manager: 60,
      team_lead: 40,
      employee: 20,
      client: 10,
    };
    return hierarchy[role] || 0;
  }, [role]);

  return {
    permissions,
    role,
    roleLevel,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canManageRole,
    isSuperAdmin: role === 'super_admin',
    isCompanyAdmin: role === 'company_admin' || role === 'super_admin',
    isProjectManager:
      role === 'project_manager' ||
      role === 'company_admin' ||
      role === 'super_admin',
    isTeamLead: [
      'team_lead',
      'project_manager',
      'company_admin',
      'super_admin',
    ].includes(role),
    isClient: role === 'client',
  };
};
