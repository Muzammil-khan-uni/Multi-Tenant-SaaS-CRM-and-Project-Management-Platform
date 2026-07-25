import axios from './axios';

export const authAPI = {
  register: (userData) => axios.post('/auth/register', userData),
  login: (credentials) => axios.post('/auth/login', credentials),
  selectWorkspace: (tempToken, workspaceId) =>
    axios.post('/auth/select-workspace', { tempToken, workspaceId }),
  refreshToken: (refreshToken) =>
    axios.post('/auth/refresh-token', { refreshToken }),
  logout: () => axios.post('/auth/logout'),
  getMe: () => axios.get('/auth/me'),
  forgotPassword: (email) => axios.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) =>
    axios.post(`/auth/reset-password/${token}`, { password }),
  updatePassword: (data) => axios.put('/auth/update-password', data),
  getMyWorkspaces: () => axios.get('/auth/my-workspaces'),
  resendVerification: (email) =>
    axios.post('/auth/resend-verification', { email }),
};
