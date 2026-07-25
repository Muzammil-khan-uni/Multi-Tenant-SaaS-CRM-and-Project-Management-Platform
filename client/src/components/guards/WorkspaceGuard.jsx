import { useSelector } from 'react-redux';
import { useParams, useLocation, Navigate } from 'react-router-dom';
import {
  stripWorkspaceSlug,
  withWorkspaceSlug,
} from '../../utils/workspacePath';

export const WorkspaceGuard = ({ children }) => {
  const { workspaceSlug } = useParams();
  const location = useLocation();
  const workspace = useSelector((state) => state.auth.workspace);
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  if (!isAuthenticated || !workspace) {
    return children;
  }

  if (workspace.slug && workspace.slug !== workspaceSlug) {
    const remainder = stripWorkspaceSlug(location.pathname, workspaceSlug);
    const correctedPath = withWorkspaceSlug(remainder, workspace.slug);
    return <Navigate to={`${correctedPath}${location.search}`} replace />;
  }

  return children;
};
