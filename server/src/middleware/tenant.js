import Workspace from "../models/Workspace.js";
import { AppError } from "./errorHandler.js";

export const resolveWorkspace = async (req, res, next) => {
  try {
    let workspace = req.workspace || null;

    if (!workspace && req.headers["x-workspace-slug"]) {
      workspace = await Workspace.findOne({
        slug: req.headers["x-workspace-slug"].toLowerCase(),
        isActive: true,
      });
    }

    if (!workspace && req.headers["x-workspace-id"]) {
      workspace = await Workspace.findById(req.headers["x-workspace-id"]);
    }

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message:
          "Workspace not found. Please check your workspace URL or contact support.",
      });
    }

    if (!workspace.isActive) {
      return res.status(403).json({
        success: false,
        message:
          "This workspace has been deactivated. Please contact your administrator.",
      });
    }

    req.workspace = workspace;
    req.workspaceId = workspace._id;

    next();
  } catch (error) {
    next(error);
  }
};

export const tenantIsolation = (req, res, next) => {
  req.workspaceFilter = { workspace: req.workspaceId };

  const originalJson = res.json.bind(res);

  res.json = function (data) {
    if (data && data.data) {
      const wid = req.workspaceId?.toString();

      const belongsToWorkspace = (item) => {
        if (!item || !wid) return true;

        if (item.workspace) {
          return item.workspace.toString() === wid;
        }

        if (Array.isArray(item.workspaceMemberships)) {
          return item.workspaceMemberships.some(
            (m) => m.workspace?.toString() === wid && m.isActive !== false,
          );
        }

        return true;
      };

      if (Array.isArray(data.data)) {
        data.data = data.data.filter(belongsToWorkspace);
      } else if (!belongsToWorkspace(data.data)) {
        return originalJson({
          success: false,
          message: "Resource not found in your workspace",
          statusCode: 404,
        });
      }
    }
    return originalJson(data);
  };

  next();
};

export const validateWorkspaceMembership = (req, res, next) => {
  if (!req.user || !req.workspace) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const membership = req.user.getMembership(req.workspace._id);

  if (!membership) {
    return res.status(403).json({
      success: false,
      message: "You do not belong to this workspace",
    });
  }

  if (!membership.isActive) {
    return res.status(403).json({
      success: false,
      message:
        "Your membership in this workspace has been deactivated. Please contact the workspace administrator.",
    });
  }

  req.user.role = membership.role;
  req.user.permissions = membership.permissions || [];

  next();
};

export const workspaceAudit = (action) => {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = function (data) {
      if (data && data.success) {
        console.info(
          `[WORKSPACE AUDIT] ${new Date().toISOString()} | ${action} | Workspace: ${req.workspaceId} | User: ${req.user?._id} | IP: ${req.ip}`,
        );
      }
      return originalJson(data);
    };

    next();
  };
};

export const getWorkspaceFilter = (req) => ({ workspace: req.workspaceId });
