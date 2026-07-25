import axios from './axios';

export const usersAPI = {
  updateProfile: (data) => axios.put('/users/profile/update', data),
  getById: (id) => axios.get(`/users/${id}`),
};
