import User from "../models/User.js";
import { AppError, asyncHandler } from "../middleware/errorHandler.js";
import {
  PERMISSIONS,
  ROLES,
  getRolePermissions,
  getAssignableRoles,
  canManageRole,
  ROLE_HIERARCHY,
} from "../config/permissions.js";

export const getAllPermissions = asyncHandler(async (req, res) => {
  const groupedPermissions = {
    workspace: [
      PERMISSIONS.MANAGE_WORKSPACE,
      PERMISSIONS.VIEW_WORKSPACE,
      PERMISSIONS.UPDATE_WORKSPACE,
      PERMISSIONS.DELETE_WORKSPACE,
    ],
    users: [
      PERMISSIONS.MANAGE_USERS,
      PERMISSIONS.VIEW_USERS,
      PERMISSIONS.CREATE_USERS,
      PERMISSIONS.UPDATE_USERS,
      PERMISSIONS.DELETE_USERS,
      PERMISSIONS.INVITE_USERS,
    ],
    clients: [
      PERMISSIONS.MANAGE_CLIENTS,
      PERMISSIONS.VIEW_CLIENTS,
      PERMISSIONS.CREATE_CLIENTS,
      PERMISSIONS.UPDATE_CLIENTS,
      PERMISSIONS.DELETE_CLIENTS,
      PERMISSIONS.VIEW_CLIENT_DETAILS,
    ],
    projects: [
      PERMISSIONS.MANAGE_PROJECTS,
      PERMISSIONS.VIEW_PROJECTS,
      PERMISSIONS.CREATE_PROJECTS,
      PERMISSIONS.UPDATE_PROJECTS,
      PERMISSIONS.DELETE_PROJECTS,
      PERMISSIONS.VIEW_PROJECT_DETAILS,
      PERMISSIONS.ASSIGN_PROJECT_TEAM,
    ],
    tasks: [
      PERMISSIONS.MANAGE_TASKS,
      PERMISSIONS.VIEW_TASKS,
      PERMISSIONS.CREATE_TASKS,
      PERMISSIONS.UPDATE_TASKS,
      PERMISSIONS.DELETE_TASKS,
      PERMISSIONS.ASSIGN_TASKS,
      PERMISSIONS.UPDATE_TASK_STATUS,
      PERMISSIONS.ADD_TASK_COMMENTS,
      PERMISSIONS.LOG_TIME,
    ],
    invoices: [
      PERMISSIONS.MANAGE_INVOICES,
      PERMISSIONS.VIEW_INVOICES,
      PERMISSIONS.CREATE_INVOICES,
      PERMISSIONS.UPDATE_INVOICES,
      PERMISSIONS.DELETE_INVOICES,
      PERMISSIONS.SEND_INVOICES,
      PERMISSIONS.RECORD_PAYMENTS,
      PERMISSIONS.VIEW_FINANCIALS,
    ],
    reports: [
      PERMISSIONS.MANAGE_REPORTS,
      PERMISSIONS.VIEW_REPORTS,
      PERMISSIONS.EXPORT_REPORTS,
      PERMISSIONS.VIEW_ANALYTICS,
      PERMISSIONS.VIEW_DASHBOARD,
    ],
    settings: [
      PERMISSIONS.MANAGE_SETTINGS,
      PERMISSIONS.VIEW_SETTINGS,
      PERMISSIONS.UPDATE_SETTINGS,
      PERMISSIONS.MANAGE_BILLING,
      PERMISSIONS.MANAGE_INTEGRATIONS,
    ],
    communication: [
      PERMISSIONS.SEND_MESSAGES,
      PERMISSIONS.VIEW_MESSAGES,
      PERMISSIONS.MANAGE_NOTIFICATIONS,
    ],
    files: [
      PERMISSIONS.UPLOAD_FILES,
      PERMISSIONS.VIEW_FILES,
      PERMISSIONS.DELETE_FILES,
    ],
    api: [PERMISSIONS.MANAGE_API_KEYS, PERMISSIONS.VIEW_API_LOGS],
  };

  res.status(200).json({ success: true, data: groupedPermissions });
});

export const getAllRoles = asyncHandler(async (req, res) => {
  const rolesWithPermissions = Object.entries(ROLES).map(([key, value]) => ({
    name: key,
    role: value,
    permissions: getRolePermissions(value),
    hierarchy: ROLE_HIERARCHY[value],
  }));

  res.status(200).json({ success: true, data: rolesWithPermissions });
});

export const getAssignableRolesForUser = asyncHandler(async (req, res) => {
  const assignableRoles = getAssignableRoles(req.user.role);
  res.status(200).json({ success: true, data: assignableRoles });
});

export const updateUserPermissions = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { permissions, role } = req.body;
  const workspaceId = req.workspace._id;

  const targetUser = await User.findById(userId);
  if (!targetUser) throw new AppError("User not found", 404);

  const targetMembership = targetUser.getMembership(workspaceId);
  if (!targetMembership) {
    throw new AppError("User not found in your workspace", 404);
  }

  if (!canManageRole(req.user.role, targetMembership.role)) {
    throw new AppError("You cannot manage users with this role", 403);
  }

  if (role && !canManageRole(req.user.role, role)) {
    throw new AppError("You cannot assign this role", 403);
  }

  if (role) {
    targetMembership.role = role;

    targetMembership.permissions = getRolePermissions(role);
  }

  if (permissions && !role) {
    const validPermissions = Object.values(PERMISSIONS);
    const invalidPermissions = permissions.filter(
      (p) => !validPermissions.includes(p),
    );
    if (invalidPermissions.length > 0) {
      throw new AppError(
        `Invalid permissions: ${invalidPermissions.join(", ")}`,
        400,
      );
    }
    targetMembership.permissions = permissions;
  }

  await targetUser.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: "User permissions updated successfully",
    data: {
      id: targetUser._id,
      role: targetMembership.role,
      permissions: targetMembership.permissions,
    },
  });
});

export const getUserPermissions = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const workspaceId = req.workspace._id;

  const user = await User.findById(userId).select(
    "firstName lastName email workspaceMemberships",
  );
  if (!user) throw new AppError("User not found", 404);

  const membership = user.getMembership(workspaceId);
  if (!membership) throw new AppError("User not found in your workspace", 404);

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: membership.role,
      },
      permissions: membership.permissions,
      defaultPermissions: getRolePermissions(membership.role),
    },
  });
});
