import express from 'express';
import { body } from 'express-validator';
import {
  register,
  login,
  selectWorkspace,
  checkEmailAvailability,
  checkWorkspaceSlug,
  getMyWorkspaces,
  switchWorkspace,
  verifyEmail,
  resendVerification,
  refreshToken,
  logout,
  logoutAll,
  getMe,
  forgotPassword,
  resetPassword,
  updatePassword,
  getSessions
} from '../controllers/authController.js';
import { authenticate, authLimiter, passwordResetLimiter } from '../middleware/auth.js';

const router = express.Router();

// Validation rules
const registerValidation = [
  body('workspaceName')
    .trim()
    .notEmpty()
    .withMessage('Workspace name is required')
    .isLength({ min: 2, max: 100 }),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must contain uppercase, lowercase, number and special character')
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
];

const resetPasswordValidation = [
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must contain uppercase, lowercase, number and special character')
];

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', authLimiter, loginValidation, login);
router.post('/select-workspace', authLimiter, selectWorkspace);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/reset-password/:token', resetPasswordValidation, resetPassword);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerification);
router.get('/check-email', checkEmailAvailability);
router.get('/check-workspace-slug', checkWorkspaceSlug);

// Protected routes
router.post('/logout', authenticate, logout);
router.post('/logout-all', authenticate, logoutAll);
router.get('/me', authenticate, getMe);
router.put('/update-password', authenticate, updatePassword);
router.get('/sessions', authenticate, getSessions);
router.get('/my-workspaces', authenticate, getMyWorkspaces);
router.post('/switch-workspace', authenticate, switchWorkspace);

export default router;