import axios from './axios';

export const invoicesAPI = {
  getAll: (params) => axios.get('/invoices', { params }),
  getById: (id) => axios.get(`/invoices/${id}`),
  create: (data) => axios.post('/invoices', data),
  update: (id, data) => axios.put(`/invoices/${id}`, data),
  delete: (id) => axios.delete(`/invoices/${id}`),
  send: (id) => axios.post(`/invoices/${id}/send`),
  recordPayment: (id, data) => axios.post(`/invoices/${id}/payments`, data),
  download: (id) =>
    axios.get(`/invoices/${id}/download`, { responseType: 'blob' }),
};
