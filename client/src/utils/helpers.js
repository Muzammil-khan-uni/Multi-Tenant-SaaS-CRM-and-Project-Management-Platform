import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';

export const formatDate = (date, formatStr = 'MMM dd, yyyy') => {
  if (!date) return 'N/A';

  const parsedDate = typeof date === 'string' ? parseISO(date) : date;

  if (!isValid(parsedDate)) return 'Invalid date';

  return format(parsedDate, formatStr);
};

export const formatDateTime = (date) => {
  return formatDate(date, 'MMM dd, yyyy HH:mm');
};

export const timeAgo = (date) => {
  if (!date) return 'N/A';

  const parsedDate = typeof date === 'string' ? parseISO(date) : date;

  if (!isValid(parsedDate)) return 'Invalid date';

  return formatDistanceToNow(parsedDate, { addSuffix: true });
};

export const getInitials = (firstName, lastName) => {
  if (!firstName && !lastName) return '?';
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
};

export const getFullName = (firstName, lastName) => {
  return [firstName, lastName].filter(Boolean).join(' ');
};

export const formatCurrency = (amount, currency = 'USD') => {
  if (amount === null || amount === undefined) return '$0.00';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

export const generateId = () => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const getStatusColor = (status) => {
  const colors = {
    active: 'green',
    inactive: 'gray',
    lead: 'blue',
    prospect: 'yellow',
    churned: 'red',
    planning: 'blue',
    on_hold: 'yellow',
    completed: 'green',
    cancelled: 'red',
    todo: 'gray',
    in_progress: 'blue',
    review: 'yellow',
    blocked: 'red',
    draft: 'gray',
    sent: 'blue',
    paid: 'green',
    overdue: 'red',
    low: 'gray',
    medium: 'blue',
    high: 'yellow',
    urgent: 'red',
  };
  return colors[status] || 'gray';
};

export const getStatusLabel = (status) => {
  if (!status) return 'Unknown';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};
