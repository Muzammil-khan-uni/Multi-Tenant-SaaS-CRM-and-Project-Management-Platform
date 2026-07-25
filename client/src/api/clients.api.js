import axios from './axios';

export const clientsAPI = {
  getAll: (params) => axios.get('/clients', { params }),
  getById: (id) => axios.get(`/clients/${id}`),
  create: (data) => axios.post('/clients', data),
  update: (id, data) => axios.put(`/clients/${id}`, data),
  delete: (id) => axios.delete(`/clients/${id}`),
  addContact: (id, data) => axios.post(`/clients/${id}/contacts`, data),
  addNote: (id, data) => axios.post(`/clients/${id}/notes`, data),
};