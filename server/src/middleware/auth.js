import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import User from "../models/User.js";
import Workspace from "../models/Workspace.js";

export const authenticate = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Please log in to access this resource",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "The user belonging to this token no longer exists",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message:
          "Your account has been deactivated. Please contact your administrator",
      });
    }

    if (
      process.env.REQUIRE_EMAIL_VERIFICATION === "true" &&
      !user.isEmailVerified
    ) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email address to access this resource",
        requiresVerification: true,
      });
    }

    if (user.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        success: false,
        message: "Password recently changed. Please log in again",
      });
    }

    req.user = user;

    if (user.isSuperAdmin) {
      req.user.role = "super_admin";
      req.user.permissions = [];
      return next();
    }

    const slug = req.headers["x-workspace-slug"];
    const workspaceId = req.headers["x-workspace-id"];

    if (slug || workspaceId) {
      try {
        const query = slug
          ? { slug: slug.toLowerCase(), isActive: true }
          : { _id: workspaceId };
        const workspace = await Workspace.findOne(query);

        if (workspace && workspace.isActive) {
          const membership = user.getMembership(workspace._id);
          if (membership) {
            req.workspace = workspace;
            req.workspaceId = workspace._id;

            req.user.role = membership.role;
            req.user.permissions = membership.permissions || [];
          }
        }
      } catch {}
    }

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ success: false, message: "Token has expired" });
    }
    return res.status(401).json({
      success: false,
      message: "Not authorized to access this route",
    });
  }
};

export const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res
      .status(401)
      .json({ success: false, message: "Authentication required" });
  }

  if (!req.user.isSuperAdmin) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Super Admin privileges required.",
    });
  }

  next();
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    if (req.user.isSuperAdmin || req.user.role === "super_admin") return next();

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this route. Required roles: ${roles.join(", ")}`,
      });
    }
    next();
  };
};

export const hasPermission = (...permissions) => {
  return (req, res, next) => {
    const userPermissions = req.user.permissions || [];

    if (req.user.isSuperAdmin || req.user.role === "super_admin") return next();

    const hasAccess = permissions.some((p) => userPermissions.includes(p));
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
    }
    next();
  };
};

export const requireEmailVerification = (req, res, next) => {
  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      message: "Please verify your email address first",
      requiresVerification: true,
    });
  }
  next();
};

export const requireActiveSubscription = (req, res, next) => {
  const workspace = req.workspace;

  if (!workspace) {
    return res
      .status(400)
      .json({ success: false, message: "Workspace context missing" });
  }

  if (workspace.plan === "free") return next();

  if (
    workspace.subscription.status === "active" ||
    workspace.subscription.status === "trial"
  ) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Your subscription is not active. Please upgrade your plan",
  });
};

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: "Too many attempts, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    message: "Too many password reset attempts, please try again later",
  },
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: {
    success: false,
    message: "Too many requests, please try again later",
  },
});
