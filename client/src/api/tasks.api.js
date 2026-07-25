import axios from './axios';

export const tasksAPI = {
  getAll: (params) => axios.get('/tasks', { params }),
  getById: (id) => axios.get(`/tasks/${id}`),
  create: (data) => axios.post('/tasks', data),
  update: (id, data) => axios.put(`/tasks/${id}`, data),
  delete: (id) => axios.delete(`/tasks/${id}`),
  updateStatus: (id, status) => axios.put(`/tasks/${id}/status`, { status }),
  assign: (id, userIds) => axios.post(`/tasks/${id}/assign`, { userIds }),
  addComment: (id, data) => axios.post(`/tasks/${id}/comments`, data),
  addTimeEntry: (id, data) => axios.post(`/tasks/${id}/time-entries`, data),
  addSubtask: (id, data) => axios.post(`/tasks/${id}/subtasks`, data),
  toggleSubtask: (id, subtaskId, completed) =>
    axios.put(`/tasks/${id}/subtasks/${subtaskId}`, { completed }),
};
