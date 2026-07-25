export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
  CLIENT: 'client',
};

export const PROJECT_STATUS = {
  PLANNING: 'planning',
  ACTIVE: 'active',
  ON_HOLD: 'on_hold',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  REVIEW: 'review',
  COMPLETED: 'completed',
  BLOCKED: 'blocked',
};

export const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
};

export const INVOICE_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
};

export const CLIENT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  LEAD: 'lead',
  PROSPECT: 'prospect',
  CHURNED: 'churned',
};

export const STATUS_COLORS = {
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

export const ITEMS_PER_PAGE = 10;

export const DATE_FORMAT = 'MMM dd, yyyy';
export const DATETIME_FORMAT = 'MMM dd, yyyy HH:mm';
