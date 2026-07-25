import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z.object({
  workspaceName: z
    .string()
    .min(1, 'Workspace name is required')
    .min(2, 'Workspace name must be at least 2 characters')
    .max(100, 'Workspace name must be less than 100 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
});

export const clientSchema = z.object({
  company: z.object({
    name: z.string().min(1, 'Company name is required'),
    website: z.string().url('Invalid URL').optional().or(z.literal('')),
    industry: z.string().optional(),
    size: z.string().optional(),
  }),
  contacts: z
    .array(
      z.object({
        firstName: z.string().min(1, 'First name is required'),
        lastName: z.string().min(1, 'Last name is required'),
        email: z.string().email('Invalid email'),
        phone: z.string().optional(),
        position: z.string().optional(),
        isPrimary: z.boolean().default(false),
      })
    )
    .min(1, 'At least one contact is required'),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
  status: z
    .enum(['active', 'inactive', 'lead', 'prospect', 'churned'])
    .default('lead'),
});

export const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  client: z.string().min(1, 'Client is required'),
  status: z
    .enum(['planning', 'active', 'on_hold', 'completed', 'cancelled'])
    .default('planning'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  type: z.enum(['fixed_price', 'hourly', 'retainer']),
  budget: z
    .object({
      estimated: z.number().min(0).optional(),
      currency: z.string().default('USD'),
    })
    .optional(),
  timeline: z
    .object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    })
    .optional(),
});

export const taskSchema = z.object({
  title: z.string().min(1, 'Task title is required'),
  description: z.string().optional(),
  project: z.string().min(1, 'Project is required'),
  status: z
    .enum(['todo', 'in_progress', 'review', 'completed', 'blocked'])
    .default('todo'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  dueDate: z.string().optional(),
  estimatedHours: z.number().min(0).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(1, 'New password is required')
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
