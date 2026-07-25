import { Link, NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { withWorkspaceSlug } from '../../utils/workspacePath';

/**
 * Drop-in replacements for react-router-dom's <Link> / <NavLink> that
 * prefix an app-relative `to` ("/profile", "/dashboard") with the active
 * workspace's slug, so existing usages like <Link to="/profile"> keep
 * working under path-based multi-tenant routing.
 */
export const WorkspaceLink = ({ to, ...props }) => {
  const slug = useSelector((state) => state.auth.workspace?.slug);
  const target =
    typeof to === 'string' && to.startsWith('/')
      ? withWorkspaceSlug(to, slug)
      : to;
  return <Link to={target} {...props} />;
};

export const WorkspaceNavLink = ({ to, ...props }) => {
  const slug = useSelector((state) => state.auth.workspace?.slug);
  const target =
    typeof to === 'string' && to.startsWith('/')
      ? withWorkspaceSlug(to, slug)
      : to;
  return <NavLink to={target} {...props} />;
};
