import axios from './axios';

export const announcementsAPI = {
  getActive: () => axios.get('/announcements/active'),
  markRead: (id) => axios.post(`/announcements/${id}/read`),
};
