import express from 'express';
import {
  getWorkspace, createWorkspace, updateWorkspace,
  updateSettings, updateBranding,
  getMembers, inviteMember, acceptInvitation, previewInvitation,
  cancelInvitation, removeMember, updateMemberRole,
  getSubscription, getWorkspaceStats,
  transferOwnership, deleteWorkspace,
  getInvitations, resendInvitation, terminateMember,
  reactivateMember,  
} from '../controllers/workspaceController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { workspaceAudit } from '../middleware/tenant.js';

const router = express.Router();

// Public routes - no auth required
router.get('/join/:token', previewInvitation);
router.post('/join/:token', acceptInvitation);

// All routes below require authentication
router.use(authenticate);

// Workspace CRUD
router.route('/')
  .get(getWorkspace)
  .put(authorize('super_admin', 'company_admin', 'admin', 'owner'), updateWorkspace)
  .delete(authorize('super_admin', 'company_admin', 'owner'), deleteWorkspace);

router.post('/create', createWorkspace);

// Settings & Branding
router.put('/settings', authorize('super_admin', 'company_admin', 'admin', 'owner'), updateSettings);
router.put('/branding', authorize('super_admin', 'company_admin', 'admin', 'owner'), updateBranding);

// Members
router.get('/members', getMembers);
router.post('/invite', authorize('super_admin', 'company_admin', 'admin', 'owner'), workspaceAudit('INVITE_MEMBER'), inviteMember);
router.delete('/members/:userId', authorize('super_admin', 'company_admin', 'admin', 'owner'), removeMember);
router.put('/members/:userId/role', authorize('super_admin', 'company_admin', 'admin', 'owner'), updateMemberRole);
router.post('/transfer-ownership', authorize('super_admin', 'company_admin', 'owner'), transferOwnership);

// Invitations
router.get('/invitations', authorize('super_admin', 'company_admin', 'admin', 'owner'), getInvitations);
router.delete('/invitations/:invitationId', authorize('super_admin', 'company_admin', 'admin', 'owner'), cancelInvitation);
router.post('/invitations/:invitationId/resend', authorize('super_admin', 'company_admin', 'admin', 'owner'), resendInvitation);

// Subscription & Stats
router.get('/subscription', getSubscription);
router.get('/stats', getWorkspaceStats);

router.put('/members/:userId/terminate', 
  authorize('super_admin', 'company_admin', 'admin', 'owner'), 
  terminateMember
);

router.put('/members/:userId/reactivate', 
  authorize('super_admin', 'company_admin', 'admin', 'owner'), 
  reactivateMember
);

export default router;