import { hasPermission, ROLE_HIERARCHY } from "../config/permissions.js";

export const requirePermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const userPermissions = req.user.permissions || [];
    const userRole = req.user.role;

    if (userRole === "super_admin") {
      return next();
    }

    const hasAccess = permissions.some((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
        requiredPermissions: permissions,
        yourPermissions: userPermissions,
      });
    }

    next();
  };
};

export const requireRoleManagement = (req, res, next) => {
  const userRole = req.user.role;
  const targetRole = req.body.role || req.params.role;

  if (!targetRole) {
    return next();
  }

  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const targetLevel = ROLE_HIERARCHY[targetRole] || 0;

  if (userLevel <= targetLevel) {
    return res.status(403).json({
      success: false,
      message: `You cannot assign or manage users with the role: ${targetRole}`,
    });
  }

  next();
};

export const requireUserAccess = (req, res, next) => {
  const currentUser = req.user;
  const targetUserId = req.params.userId || req.body.userId;

  if (targetUserId && currentUser._id.toString() === targetUserId.toString()) {
    return next();
  }

  if (
    currentUser.permissions.includes("manage_users") ||
    currentUser.permissions.includes("view_users")
  ) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "You do not have permission to access this user's data",
  });
};

export const requireProjectAccess = (action) => {
  return async (req, res, next) => {
    const projectId = req.params.id || req.params.projectId || req.body.project;

    if (!projectId) {
      return next();
    }

    try {
      const Project = (await import("../models/Project.js")).default;
      const project = await Project.findById(projectId);

      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }

      if (project.workspace.toString() !== req.workspace._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      if (["super_admin", "company_admin"].includes(req.user.role)) {
        return next();
      }

      if (req.user.role === "project_manager") {
        return next();
      }

      const isTeamMember = project.team?.some(
        (member) => member.user.toString() === req.user._id.toString(),
      );

      const isClient = project.client?.toString() === req.user._id.toString();

      if (action === "view" && (isTeamMember || isClient)) {
        return next();
      }

      if (action === "edit" && isTeamMember) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: "You do not have access to this project",
      });
    } catch (error) {
      next(error);
    }
  };
};

export const roleBasedRateLimit = (limits) => {
  return (req, res, next) => {
    const userRole = req.user?.role || "anonymous";
    const limit = limits[userRole] || limits.default || 100;

    req.rateLimit = limit;
    next();
  };
};
