import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import axios from '../api/axios';
import toast from 'react-hot-toast';
import { setWorkspace } from '../store/slices/authSlice';

export const useWorkspace = () => {
  const dispatch = useDispatch();
  const workspace = useSelector((state) => state.auth.workspace);

  const fetchWorkspace = useCallback(async () => {
    try {
      const { data } = await axios.get('/workspaces');

      dispatch(setWorkspace(data.data));
      return data.data;
    } catch (error) {
      toast.error('Failed to load workspace');
      throw error;
    }
  }, [dispatch]);

  const updateWorkspace = useCallback(
    async (updateData) => {
      try {
        const { data } = await axios.put('/workspaces', updateData);

        dispatch(setWorkspace(data.data));
        toast.success('Workspace updated successfully');
        return data.data;
      } catch (error) {
        toast.error(
          error.response?.data?.message || 'Failed to update workspace'
        );
        throw error;
      }
    },
    [dispatch]
  );

  const updateSettings = useCallback(
    async (settings) => {
      try {
        const { data } = await axios.put('/workspaces/settings', settings);

        dispatch(setWorkspace({ ...workspace, settings: data.data }));
        toast.success('Settings updated');
        return data.data;
      } catch (error) {
        toast.error('Failed to update settings');
        throw error;
      }
    },
    [dispatch, workspace]
  );

  const updateBranding = useCallback(
    async (branding) => {
      try {
        const { data } = await axios.put('/workspaces/branding', branding);
        dispatch(setWorkspace({ ...workspace, branding: data.data }));
        toast.success('Branding updated');
        return data.data;
      } catch (error) {
        toast.error('Failed to update branding');
        throw error;
      }
    },
    [dispatch, workspace]
  );

  const inviteMember = useCallback(async (email, role) => {
    try {
      const { data } = await axios.post('/workspaces/invite', { email, role });
      toast.success(data.message || 'Invitation sent successfully!');
      return data;
    } catch (error) {
      const message =
        error.response?.data?.message || 'Failed to send invitation';
      toast.error(message);
      throw error;
    }
  }, []);

  const removeMember = useCallback(async (userId) => {
    try {
      const { data } = await axios.delete(`/workspaces/members/${userId}`);
      toast.success(data.message || 'Member removed successfully');
      return data;
    } catch (error) {
      const message =
        error.response?.data?.message || 'Failed to remove member';
      toast.error(message);
      throw error;
    }
  }, []);

  const updateMemberRole = useCallback(async (userId, role) => {
    try {
      const { data } = await axios.put(`/workspaces/members/${userId}/role`, {
        role,
      });
      toast.success('Member role updated');
      return data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update role');
      throw error;
    }
  }, []);

  const getStats = useCallback(async () => {
    const { data } = await axios.get('/workspaces/stats');
    return data.data;
  }, []);

  const getSubscription = useCallback(async () => {
    const { data } = await axios.get('/workspaces/subscription');
    return data.data;
  }, []);

  const cancelInvitation = useCallback(async (invitationId) => {
    try {
      await axios.delete(`/workspaces/invitations/${invitationId}`);
      toast.success('Invitation cancelled');
    } catch (error) {
      toast.error('Failed to cancel invitation');
      throw error;
    }
  }, []);

  const transferOwnership = useCallback(async (newOwnerId) => {
    try {
      const { data } = await axios.post('/workspaces/transfer-ownership', {
        newOwnerId,
      });
      toast.success(data.message || 'Ownership transferred');
      return data;
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to transfer ownership'
      );
      throw error;
    }
  }, []);

  return {
    workspace,
    fetchWorkspace,
    updateWorkspace,
    updateSettings,
    updateBranding,
    inviteMember,
    removeMember,
    updateMemberRole,
    getStats,
    getSubscription,
    cancelInvitation,
    transferOwnership,
  };
};
