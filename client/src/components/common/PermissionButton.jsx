import { Button } from './Button';
import { usePermissions } from '../../hooks/usePermissions';

export const PermissionButton = ({
  permission,
  children,
  onClick,
  ...buttonProps
}) => {
  const { hasPermission } = usePermissions();
  const canAccess = hasPermission(permission);

  if (!canAccess) {
    return null; // Don't render button if no permission
  }

  return (
    <Button onClick={onClick} {...buttonProps}>
      {children}
    </Button>
  );
};
