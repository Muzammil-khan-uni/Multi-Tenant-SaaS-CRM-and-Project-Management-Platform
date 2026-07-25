import express from "express";
import {
  getPlatformAnalytics,
  getAllWorkspaces,
  getWorkspaceById,
  approveWorkspace,
  suspendWorkspace,
  reactivateWorkspace,
  deleteWorkspacePermanently,
  updateWorkspacePlan,
  getPlatformSettings,
  updatePlatformSettings,
  getSecurityLogs,
  getAllUsers,
  createAnnouncement,
  getAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
  getActiveAnnouncements,
} from "../controllers/superAdminController.js";
import { authenticate, requireSuperAdmin } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticate);
router.use(requireSuperAdmin);

router.get("/analytics", getPlatformAnalytics);

// ── Workspaces ─────────────────────────────────────────────────────────────────
router.get("/workspaces", getAllWorkspaces);
router.get("/workspaces/:workspaceId", getWorkspaceById);
router.put("/workspaces/:workspaceId/approve", approveWorkspace);
router.put("/workspaces/:workspaceId/suspend", suspendWorkspace);
router.put("/workspaces/:workspaceId/reactivate", reactivateWorkspace);
router.put("/workspaces/:workspaceId/plan", updateWorkspacePlan);
router.delete("/workspaces/:workspaceId", deleteWorkspacePermanently);

// ── Users ──────────────────────────────────────────────────────────────────────
router.get("/users", getAllUsers);

// ── Platform Settings ──────────────────────────────────────────────────────────
router.get("/settings", getPlatformSettings);
router.put("/settings", updatePlatformSettings);

// ── Security Logs ──────────────────────────────────────────────────────────────
router.get("/logs", getSecurityLogs);

// ── Announcements ──────────────────────────────────────────────────────────────
router.get("/announcements/active", getActiveAnnouncements); // public-ish (for workspace UI)
router.get("/announcements", getAnnouncements);
router.post("/announcements", createAnnouncement);
router.put("/announcements/:id", updateAnnouncement);
router.delete("/announcements/:id", deleteAnnouncement);

export default router;
