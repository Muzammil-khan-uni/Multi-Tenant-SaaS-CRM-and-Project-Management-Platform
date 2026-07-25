import axios from './axios';

export const projectsAPI = {
  getAll: (params) => axios.get('/projects', { params }),
  getById: (id) => axios.get(`/projects/${id}`),
  create: (data) => axios.post('/projects', data),
  update: (id, data) => axios.put(`/projects/${id}`, data),
  delete: (id) => axios.delete(`/projects/${id}`),
  addTeamMember: (id, data) => axios.post(`/projects/${id}/team`, data),
  removeTeamMember: (id, userId) =>
    axios.delete(`/projects/${id}/team/${userId}`),
  addMilestone: (id, data) => axios.post(`/projects/${id}/milestones`, data),
  updateMilestone: (id, milestoneId, data) =>
    axios.put(`/projects/${id}/milestones/${milestoneId}`, data),
};
