import express from "express";
import {
  getAllPermissions,
  getAllRoles,
  getAssignableRolesForUser,
  updateUserPermissions,
  getUserPermissions,
} from "../controllers/permissionController.js";
import { authenticate } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { PERMISSIONS } from "../config/permissions.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// View permissions and roles (any authenticated user)
router.get("/", getAllPermissions);
router.get("/roles", getAllRoles);
router.get("/assignable-roles", getAssignableRolesForUser);

// Manage user permissions (requires manage_users permission)
router.get(
  "/users/:userId",
  requirePermission(PERMISSIONS.VIEW_USERS),
  getUserPermissions,
);

router.put(
  "/users/:userId",
  requirePermission(PERMISSIONS.MANAGE_USERS),
  updateUserPermissions,
);

export default router;
