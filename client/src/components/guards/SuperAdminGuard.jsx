import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

/**
 * SuperAdminGuard
 * ─────────────────────────────────────────────────────────────────────────────
 * Protects all /super-admin/* routes. Only users with isSuperAdmin === true
 * may pass. Anyone else is redirected to /login (or their workspace dashboard).
 */
export const SuperAdminGuard = ({ children }) => {
  const { user, isAuthenticated, workspace } = useSelector(
    (state) => state.auth
  );

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  if (!user.isSuperAdmin) {
    const fallback = workspace?.slug
      ? `/${workspace.slug}/dashboard`
      : '/login';
    return <Navigate to={fallback} replace />;
  }

  return children;
};
