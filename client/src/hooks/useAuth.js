import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  loginUser,
  registerUser,
  selectWorkspaceThunk,
  logout,
  clearPendingWorkspaces,
} from '../store/slices/authSlice';
import toast from 'react-hot-toast';

export const useAuth = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    user,
    workspace,
    isAuthenticated,
    loading,
    error,
    pendingWorkspaces,
    tempToken,
    pendingVerificationEmail,
  } = useSelector((state) => state.auth);

  const login = async (credentials) => {
    try {
      const result = await dispatch(loginUser(credentials)).unwrap();

      if (result.requiresWorkspaceSelection) {
        navigate('/select-workspace');
        return result;
      }

      if (result.requiresEmailVerification) {
        toast.error(
          'Please verify your email before logging in. Check your inbox.'
        );
        navigate('/verify-email');
        return result;
      }

      const isSuperAdmin = result.isSuperAdmin || result.user?.isSuperAdmin;
      if (isSuperAdmin) {
        toast.success(`Welcome, Super Admin ${result.user?.firstName || ''}!`);
        navigate('/super-admin/dashboard');
        return result;
      }

      toast.success(`Welcome back, ${result.user?.firstName || ''}!`);
      navigate(`/${result.user?.workspace?.slug}/dashboard`);
      return result;
    } catch (error) {
      toast.error(error || 'Login failed');
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const result = await dispatch(registerUser(userData)).unwrap();
      toast.success(
        'Account created! Please check your email to verify your address.'
      );
      navigate('/verify-email');
      return result;
    } catch (error) {
      toast.error(error || 'Registration failed');
      throw error;
    }
  };

  const selectWorkspace = async (workspaceId) => {
    if (!tempToken) {
      toast.error('Session expired. Please log in again.');
      navigate('/login');
      return;
    }
    try {
      const result = await dispatch(
        selectWorkspaceThunk({ tempToken, workspaceId })
      ).unwrap();
      toast.success(
        `Welcome to ${result.user?.workspace?.name || 'your workspace'}!`
      );
      navigate(`/${result.user?.workspace?.slug}/dashboard`);
      return result;
    } catch (error) {
      toast.error(error || 'Failed to select workspace');
      throw error;
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const cancelWorkspaceSelection = () => {
    dispatch(clearPendingWorkspaces());
    navigate('/login');
  };

  return {
    user,
    workspace,
    isAuthenticated,
    loading,
    error,
    workspaces: pendingWorkspaces,
    tempToken,
    pendingVerificationEmail,

    isSuperAdmin: user?.isSuperAdmin || false,

    login,
    register,
    selectWorkspace,
    cancelWorkspaceSelection,
    logout: handleLogout,
  };
};
