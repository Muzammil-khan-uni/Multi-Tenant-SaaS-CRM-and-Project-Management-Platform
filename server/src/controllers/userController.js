import User from "../models/User.js";
import { AppError, asyncHandler } from "../middleware/errorHandler.js";
import { getRolePermissions } from "../config/permissions.js";

export const getUsers = asyncHandler(async (req, res) => {
  const workspaceId = req.workspace._id;

  const users = await User.find({
    workspaceMemberships: {
      $elemMatch: { workspace: workspaceId, isActive: true },
    },
    isActive: true,
  }).select(
    "-password -refreshToken -passwordHistory -activeSessions -twoFactorSecret -passwordResetToken -emailVerificationToken",
  );

  const data = users.map((user) => {
    const obj = user.toObject();
    const membership = user.workspaceMemberships.find(
      (m) => m.workspace.toString() === workspaceId.toString() && m.isActive,
    );
    obj.role = membership?.role || null;
    obj.permissions = membership?.permissions || [];
    return obj;
  });

  res.status(200).json({ success: true, count: data.length, data });
});

export const getUserById = asyncHandler(async (req, res) => {
  const workspaceId = req.workspace._id;

  const user = await User.findOne({
    _id: req.params.id,
    workspaceMemberships: {
      $elemMatch: { workspace: workspaceId, isActive: true },
    },
  }).select(
    "-password -refreshToken -passwordHistory -activeSessions -twoFactorSecret -passwordResetToken -emailVerificationToken",
  );

  if (!user) throw new AppError("User not found", 404);

  const obj = user.toObject();
  const membership = user.workspaceMemberships.find(
    (m) => m.workspace.toString() === workspaceId.toString() && m.isActive,
  );
  obj.role = membership?.role || null;
  obj.permissions = membership?.permissions || [];

  res.status(200).json({ success: true, data: obj });
});

export const createUser = asyncHandler(async (req, res) => {
  const {
    email,
    password,
    firstName,
    lastName,
    role = "employee",
    ...rest
  } = req.body;
  const workspaceId = req.workspace._id;

  const existingUser = await User.findOne({
    email: email?.toLowerCase(),
    workspaceMemberships: {
      $elemMatch: { workspace: workspaceId, isActive: true },
    },
  });
  if (existingUser)
    throw new AppError("A user with this email is already a member", 400);

  const permissions = getRolePermissions(role);

  let user = await User.findOne({ email: email?.toLowerCase() });

  if (user) {
    user.addOrUpdateMembership({ workspace: workspaceId, role, permissions });
    await user.save({ validateBeforeSave: false });
  } else {
    user = await User.create({
      email: email?.toLowerCase(),
      password,
      firstName: firstName || "New",
      lastName: lastName || "User",
      ...rest,
      workspaceMemberships: [
        {
          workspace: workspaceId,
          role,
          permissions,
          isActive: true,
          joinedAt: new Date(),
        },
      ],
    });
  }

  const membership = user.getMembership(workspaceId);

  res.status(201).json({
    success: true,
    data: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: membership?.role,
    },
  });
});

export const updateUser = asyncHandler(async (req, res) => {
  const workspaceId = req.workspace._id;

  const target = await User.findOne({
    _id: req.params.id,
    workspaceMemberships: {
      $elemMatch: { workspace: workspaceId, isActive: true },
    },
  });
  if (!target) throw new AppError("User not found in this workspace", 404);

  const allowed = [
    "firstName",
    "lastName",
    "phone",
    "position",
    "department",
    "avatar",
    "preferences",
  ];
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) target[field] = req.body[field];
  });

  await target.save({ validateBeforeSave: false });

  const obj = target.toObject();
  const membership = target.workspaceMemberships.find(
    (m) => m.workspace.toString() === workspaceId.toString() && m.isActive,
  );
  obj.role = membership?.role || null;
  obj.permissions = membership?.permissions || [];
  delete obj.password;
  delete obj.refreshToken;

  res.status(200).json({ success: true, data: obj });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const workspaceId = req.workspace._id;

  const user = await User.findOne({
    _id: req.params.id,
    workspaceMemberships: {
      $elemMatch: { workspace: workspaceId, isActive: true },
    },
  });
  if (!user) throw new AppError("User not found in this workspace", 404);

  user.deactivateMembership(workspaceId);
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: "User deactivated from this workspace successfully",
  });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const allowed = [
    "firstName",
    "lastName",
    "phone",
    "department",
    "position",
    "avatar",
    "preferences",
    "bio",
    "skills",
    "address",
  ];
  const updateData = {};

  allowed.forEach((field) => {
    if (req.body[field] !== undefined) updateData[field] = req.body[field];
  });

  const user = await User.findByIdAndUpdate(req.user._id, updateData, {
    new: true,
    runValidators: true,
  }).select(
    "-password -refreshToken -passwordHistory -activeSessions -twoFactorSecret",
  );

  res.status(200).json({ success: true, data: user });
});

export const inviteUser = asyncHandler(async (req, res) => {
  const { email, role } = req.body;

  if (!email) throw new AppError("Email is required", 400);

  const normalizedEmail = email.toLowerCase().trim();
  const workspaceId = req.workspace._id;

  const existing = await User.findOne({
    email: normalizedEmail,
    workspaceMemberships: {
      $elemMatch: { workspace: workspaceId, isActive: true },
    },
  });
  if (existing)
    throw new AppError("User is already a member of this workspace", 400);

  const crypto = await import("crypto");
  const token = crypto.randomBytes(32).toString("hex");
  const Workspace = (await import("../models/Workspace.js")).default;

  req.workspace.invitations.push({
    email: normalizedEmail,
    role: role || "employee",
    token,
    invitedBy: req.user._id,
    status: "pending",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  await req.workspace.save();

  const invitationUrl = `${process.env.CLIENT_URL}/join/${token}`;
  try {
    const emailService = (await import("../services/emailService.js")).default;
    await emailService.sendTeamInvitation(
      normalizedEmail,
      req.workspace.name,
      invitationUrl,
      role,
    );
  } catch {}

  res.status(201).json({
    success: true,
    message: `Invitation sent to ${normalizedEmail}`,
  });
});
