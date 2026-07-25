import { createElement } from 'react';
import toast from 'react-hot-toast';
import NotificationToast from '../components/common/NotificationToast';

export const showNotificationToast = (notification) => {
  toast.custom((t) => createElement(NotificationToast, { t, notification }), {
    duration: 4000,
    position: 'top-right',
  });
};
