import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { withWorkspaceSlug } from '../utils/workspacePath';

export const useWorkspaceNavigate = () => {
  const navigate = useNavigate();
  const slug = useSelector((state) => state.auth.workspace?.slug);

  return useCallback(
    (to, options) => {
      if (typeof to === 'number') {
        return navigate(to);
      }
      const target = to.startsWith('/') ? withWorkspaceSlug(to, slug) : to;
      return navigate(target, options);
    },
    [navigate, slug]
  );
};
