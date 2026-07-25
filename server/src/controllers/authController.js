import crypto from "crypto";
import jwt from "jsonwebtoken";
import { validationResult } from "express-validator";
import User from "../models/User.js";
import Workspace from "../models/Workspace.js";
import emailService from "../services/emailService.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { getRolePermissions } from "../config/permissions.js";

const formatWorkspace = (workspace) => ({
  id: workspace._id,
  name: workspace.name,
  slug: workspace.slug,
  plan: workspace.plan,
  branding: workspace.branding,
});

const formatUserForWorkspace = (user, workspace, membership) => ({
  id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  role: membership.role,
  permissions: membership.permissions || [],
  isEmailVerified: user.isEmailVerified,
  preferences: user.preferences,
  avatar: user.avatar,
  workspace: formatWorkspace(workspace),
});

export const register = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      errors: errors.array(),
    });
  }

  const { workspaceName, workspaceSlug, firstName, lastName, email, password } =
    req.body;

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: "An account with this email already exists",
    });
  }

  const workspaceData = {
    name: workspaceName,
    plan: "free",
    subscription: {
      status: "trial",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
    settings: {
      timezone: req.body.timezone || "UTC",
      currency: req.body.currency || "USD",
    },
  };

  if (workspaceSlug) {
    workspaceData.slug = workspaceSlug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  if (req.body.company) {
    workspaceData.company = req.body.company;
  }
  if (req.body.industry) workspaceData.industry = req.body.industry;
  if (req.body.size) workspaceData.size = req.body.size;

  const workspace = await Workspace.create(workspaceData);

  const adminPermissions = getRolePermissions("company_admin");

  const user = await User.create({
    firstName,
    lastName,
    email: email.toLowerCase(),
    password,
    workspaceMemberships: [
      {
        workspace: workspace._id,
        role: "company_admin",
        permissions: adminPermissions,
        isActive: true,
        joinedAt: new Date(),
      },
    ],
  });

  workspace.owner = user._id;
  workspace.admins = [user._id];
  workspace.createdBy = user._id;
  await workspace.save({ validateBeforeSave: false });

  const verificationToken = user.generateEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  try {
    await emailService.sendVerificationEmail(user, verificationToken);
    await emailService.sendWelcomeEmail(user);
  } catch (emailError) {
    console.warn(
      "[Auth] Email sending failed during registration:",
      emailError.message,
    );
  }

  return res.status(201).json({
    success: true,
    message:
      "Registration successful! Please check your email to verify your account.",
    data: {
      requiresEmailVerification: true,
      email: user.email,
    },
  });
});

export const login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      errors: errors.array(),
    });
  }

  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select(
    "+password",
  );

  if (!user) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid email or password" });
  }

  if (user.isAccountLocked()) {
    const remainingMinutes = user.getRemainingLockTime();
    return res.status(423).json({
      success: false,
      message: `Account is locked. Please try again in ${remainingMinutes} minutes or reset your password.`,
      lockedUntil: user.lockUntil,
    });
  }

  const isPasswordCorrect = await user.comparePassword(password);

  if (!isPasswordCorrect) {
    const attempts = await user.incrementLoginAttempts();

    if (user.isAccountLocked()) {
      try {
        await emailService.sendAccountLockedEmail(user);
      } catch {}
      return res.status(423).json({
        success: false,
        message:
          "Account locked due to multiple failed attempts. Please try again in 30 minutes or reset your password.",
        lockedUntil: user.lockUntil,
      });
    }

    return res.status(401).json({
      success: false,
      message: `Invalid email or password. ${5 - attempts} attempts remaining.`,
    });
  }

  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      message:
        "Your account has been deactivated. Please contact your administrator.",
    });
  }

  if (!user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      requiresEmailVerification: true,
      email: user.email,
      message:
        "Please verify your email address before logging in. Check your inbox for the verification link.",
    });
  }

  if (user.isSuperAdmin) {
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    user.lastLoginIp = req.ip || req.connection?.remoteAddress || "unknown";

    const _saIp = req.ip || req.connection?.remoteAddress || "unknown";
    const _saUa = req.headers["user-agent"] || "unknown";
    const _saAccessToken = user.generateAuthToken();
    const _saRefreshToken = user.generateRefreshToken();
    user.addSession(_saAccessToken, _saIp, _saUa);
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      data: {
        isSuperAdmin: true,
        user: {
          _id: user._id,
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          isSuperAdmin: true,
          avatar: user.avatar,
          preferences: user.preferences,
          isEmailVerified: user.isEmailVerified,
          createdAt: user.createdAt,
        },
        accessToken: _saAccessToken,
        refreshToken: _saRefreshToken,
      },
    });
  }

  const activeMemberships = (user.workspaceMemberships || []).filter(
    (m) => m.isActive,
  );

  if (activeMemberships.length === 0) {
    return res.status(403).json({
      success: false,
      message:
        "Your account does not belong to any active workspace. Please contact your administrator.",
    });
  }

  const workspaceIds = activeMemberships.map((m) => m.workspace);
  const workspaces = await Workspace.find({
    _id: { $in: workspaceIds },
    isActive: true,
  }).select("name slug plan branding");

  if (workspaces.length === 0) {
    return res.status(403).json({
      success: false,
      message: "No active workspaces found for your account.",
    });
  }

  user.loginAttempts = 0;
  user.lockUntil = undefined;
  user.lastLogin = new Date();
  user.lastLoginIp = req.ip || req.connection?.remoteAddress || "unknown";

  const ip = req.ip || req.connection?.remoteAddress || "unknown";
  const userAgent = req.headers["user-agent"] || "unknown";

  if (workspaces.length === 1) {
    const workspace = workspaces[0];
    const membership = activeMemberships.find(
      (m) => m.workspace.toString() === workspace._id.toString(),
    );

    const accessToken = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();
    user.addSession(accessToken, ip, userAgent);
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      data: {
        user: formatUserForWorkspace(user, workspace, membership),
        accessToken,
        refreshToken,
      },
    });
  }

  const tempToken = jwt.sign(
    { id: user._id, email: user.email, purpose: "workspace_selection" },
    process.env.JWT_SECRET,
    { expiresIn: "5m" },
  );

  await user.save({ validateBeforeSave: false });

  const workspaceList = workspaces.map((ws) => {
    const membership = activeMemberships.find(
      (m) => m.workspace.toString() === ws._id.toString(),
    );
    return {
      id: ws._id,
      name: ws.name,
      slug: ws.slug,
      plan: ws.plan,
      branding: ws.branding,
      role: membership?.role,
    };
  });

  return res.status(200).json({
    success: true,
    data: {
      requiresWorkspaceSelection: true,
      workspaces: workspaceList,
      tempToken,
    },
  });
});

export const selectWorkspace = asyncHandler(async (req, res) => {
  const { tempToken, workspaceId } = req.body;

  if (!tempToken || !workspaceId) {
    return res.status(400).json({
      success: false,
      message: "tempToken and workspaceId are required",
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({
      success: false,
      message:
        "Workspace selection token is invalid or has expired. Please log in again.",
    });
  }

  if (decoded.purpose !== "workspace_selection") {
    return res.status(401).json({
      success: false,
      message: "Invalid token type.",
    });
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) {
    return res.status(401).json({
      success: false,
      message: "User not found or account is deactivated.",
    });
  }

  const membership = user.getMembership(workspaceId);
  if (!membership || !membership.isActive) {
    return res.status(403).json({
      success: false,
      message: "You are not an active member of this workspace.",
    });
  }

  const workspace = await Workspace.findOne({
    _id: workspaceId,
    isActive: true,
  });
  if (!workspace) {
    return res.status(404).json({
      success: false,
      message: "Workspace not found or is no longer active.",
    });
  }

  const accessToken = user.generateAuthToken();
  const refreshToken = user.generateRefreshToken();

  const ip = req.ip || req.connection?.remoteAddress || "unknown";
  const userAgent = req.headers["user-agent"] || "unknown";
  user.addSession(accessToken, ip, userAgent);
  user.lastLogin = new Date();
  user.lastLoginIp = ip;
  await user.save({ validateBeforeSave: false });

  return res.status(200).json({
    success: true,
    data: {
      user: formatUserForWorkspace(user, workspace, membership),
      accessToken,
      refreshToken,
    },
  });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid or expired verification link. Please request a new one.",
    });
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  return res.status(200).json({
    success: true,
    message: "Email verified successfully! You can now log in.",
  });
});

export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: incomingRefreshToken } = req.body;
  if (!incomingRefreshToken) {
    return res
      .status(400)
      .json({ success: false, message: "Refresh token is required" });
  }

  const decoded = jwt.verify(
    incomingRefreshToken,
    process.env.JWT_REFRESH_SECRET,
  );
  const hashedToken = crypto
    .createHash("sha256")
    .update(incomingRefreshToken)
    .digest("hex");

  const user = await User.findById(decoded.id);

  if (!user || user.refreshToken !== hashedToken) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid refresh token" });
  }

  if (user.refreshTokenExpires < Date.now()) {
    return res.status(401).json({
      success: false,
      message: "Refresh token expired. Please log in again.",
    });
  }

  const newAccessToken = user.generateAuthToken();
  const newRefreshToken = user.generateRefreshToken();
  await user.save({ validateBeforeSave: false });

  return res.status(200).json({
    success: true,
    data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
  });
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  req.user.refreshToken = undefined;
  req.user.refreshTokenExpires = undefined;
  if (token) req.user.removeSession(token);

  await req.user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json({ success: true, message: "Logged out successfully" });
});

export const logoutAll = asyncHandler(async (req, res) => {
  req.user.refreshToken = undefined;
  req.user.refreshTokenExpires = undefined;
  req.user.activeSessions = [];

  await req.user.save({ validateBeforeSave: false });

  return res.status(200).json({
    success: true,
    message: "Logged out from all devices successfully",
  });
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  const userData = {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    avatar: user.avatar,
    phone: user.phone,
    position: user.position,
    department: user.department,
    bio: user.bio,
    skills: user.skills,
    address: user.address,
    isEmailVerified: user.isEmailVerified,
    isSuperAdmin: user.isSuperAdmin || false,
    preferences: user.preferences,

    role: req.user.role,
    permissions: req.user.permissions || [],
    twoFactorEnabled: user.twoFactorEnabled,
    createdAt: user.createdAt,
  };

  if (req.workspace) {
    userData.workspace = {
      id: req.workspace._id,
      name: req.workspace.name,
      slug: req.workspace.slug,
      plan: req.workspace.plan,
      description: req.workspace.description,
      industry: req.workspace.industry,
      size: req.workspace.size,
      settings: req.workspace.settings,
      branding: req.workspace.branding,
      createdAt: req.workspace.createdAt,
    };
  }

  return res.status(200).json({ success: true, data: userData });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email?.toLowerCase() });

  if (!user) {
    return res.status(200).json({
      success: true,
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
  }

  const resetToken = user.generatePasswordResetToken();
  await user.save({ validateBeforeSave: false });

  try {
    await emailService.sendPasswordResetEmail(user, resetToken);
  } catch (emailError) {
    console.warn("[Auth] Password reset email failed:", emailError.message);
  }

  return res.status(200).json({
    success: true,
    message:
      "If an account with that email exists, a password reset link has been sent.",
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid or expired reset token. Please request a new password reset.",
    });
  }

  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.loginAttempts = 0;
  user.lockUntil = undefined;
  user.refreshToken = undefined;
  user.activeSessions = [];

  await user.save();

  const accessToken = user.generateAuthToken();
  const newRefreshToken = user.generateRefreshToken();
  await user.save({ validateBeforeSave: false });

  return res.status(200).json({
    success: true,
    message: "Password reset successful! You are now logged in.",
    data: { accessToken, refreshToken: newRefreshToken },
  });
});

export const resendVerification = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email?.toLowerCase() });

  if (!user) {
    return res.status(200).json({
      success: true,
      message:
        "If an account exists with that email, a verification link has been sent.",
    });
  }

  if (user.isEmailVerified) {
    return res.status(400).json({
      success: false,
      message: "Email is already verified. Please log in.",
    });
  }

  const verificationToken = user.generateEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  try {
    await emailService.sendVerificationEmail(user, verificationToken);
  } catch (emailError) {
    console.warn("[Auth] Verification email failed:", emailError.message);
  }

  return res.status(200).json({
    success: true,
    message: "Verification email sent! Please check your inbox.",
  });
});

export const updatePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("+password");

  const isCorrect = await user.comparePassword(req.body.currentPassword);
  if (!isCorrect) {
    return res
      .status(401)
      .json({ success: false, message: "Current password is incorrect" });
  }

  if (req.body.currentPassword === req.body.newPassword) {
    return res.status(400).json({
      success: false,
      message: "New password must be different from current password",
    });
  }

  user.password = req.body.newPassword;

  const currentToken = req.headers.authorization?.split(" ")[1];
  if (currentToken) {
    const hashedToken = crypto
      .createHash("sha256")
      .update(currentToken)
      .digest("hex");
    user.activeSessions = user.activeSessions.filter(
      (s) => s.token === hashedToken,
    );
  }

  await user.save();

  const accessToken = user.generateAuthToken();
  const newRefreshToken = user.generateRefreshToken();
  await user.save({ validateBeforeSave: false });

  return res.status(200).json({
    success: true,
    message: "Password updated successfully",
    data: { accessToken, refreshToken: newRefreshToken },
  });
});

export const getSessions = asyncHandler(async (req, res) => {
  const currentToken = req.headers.authorization?.split(" ")[1];
  const currentHashedToken = currentToken
    ? crypto.createHash("sha256").update(currentToken).digest("hex")
    : null;

  const sessions = req.user.activeSessions.map((session) => ({
    id: session._id,
    ip: session.ip,
    userAgent: session.userAgent,
    createdAt: session.createdAt,
    isCurrent: session.token === currentHashedToken,
  }));

  return res.status(200).json({ success: true, data: sessions });
});

export const getMyWorkspaces = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate(
      "workspaceMemberships.workspace",
      "name slug branding subscription plan",
    )
    .lean();

  const workspaces = (user.workspaceMemberships || [])
    .filter((m) => m.isActive && m.workspace)
    .map((m) => ({
      _id: m.workspace._id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      logo: m.workspace.branding?.logo?.url || null,
      plan: m.workspace.subscription?.plan || m.workspace.plan || "free",
      role: m.role,
    }));

  return res.status(200).json({ success: true, data: { workspaces } });
});

export const switchWorkspace = asyncHandler(async (req, res) => {
  const { workspaceId } = req.body;

  if (!workspaceId) {
    return res
      .status(400)
      .json({ success: false, message: "workspaceId is required" });
  }

  const user = await User.findById(req.user._id);
  const membership = user.getMembership(workspaceId);

  if (!membership || !membership.isActive) {
    return res.status(403).json({
      success: false,
      message: "You do not have access to this workspace",
    });
  }

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    return res
      .status(404)
      .json({ success: false, message: "Workspace not found" });
  }

  const accessToken = user.generateAuthToken();
  const refreshToken = user.generateRefreshToken();

  const ip = req.ip || req.connection?.remoteAddress || "unknown";
  const userAgent = req.headers["user-agent"] || "unknown";
  user.addSession(accessToken, ip, userAgent);
  await user.save({ validateBeforeSave: false });

  if (workspace.slug) {
  }

  return res.status(200).json({
    success: true,
    message: `Switched to ${workspace.name}`,
    data: {
      user: formatUserForWorkspace(user, workspace, membership),
      workspace: formatWorkspace(workspace),
      accessToken,
      refreshToken,
    },
  });
});

export const checkEmailAvailability = asyncHandler(async (req, res) => {
  const email = req.query.email?.toLowerCase().trim();

  if (!email) {
    return res
      .status(400)
      .json({ success: false, message: "email query parameter is required" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid email format" });
  }

  const existing = await User.findOne({ email }).select("_id").lean();

  return res.status(200).json({
    success: true,
    data: { available: !existing },
  });
});

export const checkWorkspaceSlug = asyncHandler(async (req, res) => {
  const raw = req.query.slug?.trim();

  if (!raw) {
    return res
      .status(400)
      .json({ success: false, message: "slug query parameter is required" });
  }

  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (slug.length < 2) {
    return res.status(200).json({
      success: true,
      data: {
        available: false,
        slug,
        reason: "Slug must be at least 2 characters",
      },
    });
  }

  const existing = await Workspace.findOne({ slug }).select("_id").lean();

  return res.status(200).json({
    success: true,
    data: { available: !existing, slug },
  });
});
