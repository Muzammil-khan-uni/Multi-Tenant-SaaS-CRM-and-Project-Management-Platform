import axios from './axios';

const BASE = '/super-admin';

export const superAdminAPI = {
  getAnalytics: () => axios.get(`${BASE}/analytics`),

  getAllWorkspaces: (params) => axios.get(`${BASE}/workspaces`, { params }),
  getWorkspaceById: (id) => axios.get(`${BASE}/workspaces/${id}`),
  approveWorkspace: (id) => axios.put(`${BASE}/workspaces/${id}/approve`),
  suspendWorkspace: (id) => axios.put(`${BASE}/workspaces/${id}/suspend`),
  reactivateWorkspace: (id) => axios.put(`${BASE}/workspaces/${id}/reactivate`),
  deleteWorkspace: (id) => axios.delete(`${BASE}/workspaces/${id}`),
  updateWorkspacePlan: (id, plan) =>
    axios.put(`${BASE}/workspaces/${id}/plan`, { plan }),

  getAllUsers: (params) => axios.get(`${BASE}/users`, { params }),

  getSettings: () => axios.get(`${BASE}/settings`),
  updateSettings: (data) => axios.put(`${BASE}/settings`, data),

  getLogs: (params) => axios.get(`${BASE}/logs`, { params }),

  getAnnouncements: (params) => axios.get(`${BASE}/announcements`, { params }),
  getActiveAnnouncements: () => axios.get(`${BASE}/announcements/active`),
  createAnnouncement: (data) => axios.post(`${BASE}/announcements`, data),
  updateAnnouncement: (id, data) =>
    axios.put(`${BASE}/announcements/${id}`, data),
  deleteAnnouncement: (id) => axios.delete(`${BASE}/announcements/${id}`),
};
