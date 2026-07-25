import crypto from "crypto";
import mongoose from "mongoose";
import Workspace from "../models/Workspace.js";
import User from "../models/User.js";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import Employee from "../models/Employee.js";
import { AppError, asyncHandler } from "../middleware/errorHandler.js";
import emailService from "../services/emailService.js";
import { getRolePermissions } from "../config/permissions.js";

const getMembersForWorkspace = async (workspaceId, filter = {}) => {
  const query = {
    workspaceMemberships: {
      $elemMatch: { workspace: workspaceId, isActive: true },
    },
    isActive: true,
    ...filter,
  };

  const users = await User.find(query).select(
    "-password -refreshToken -passwordHistory -activeSessions -twoFactorSecret -passwordResetToken -emailVerificationToken",
  );

  return users.map((user) => {
    const obj = user.toObject();
    const membership = user.workspaceMemberships.find(
      (m) => m.workspace.toString() === workspaceId.toString() && m.isActive,
    );
    obj.role = membership?.role || null;
    obj.permissions = membership?.permissions || [];
    return obj;
  });
};

export const getWorkspace = asyncHandler(async (req, res) => {
  const workspace = await Workspace.findById(req.workspace._id)
    .populate("owner", "firstName lastName email avatar")
    .populate("admins", "firstName lastName email avatar");

  if (!workspace) throw new AppError("Workspace not found", 404);

  const memberCount = await User.countDocuments({
    workspaceMemberships: {
      $elemMatch: { workspace: workspace._id, isActive: true },
    },
    isActive: true,
  });

  const workspaceData = workspace.toObject();
  workspaceData.memberCount = memberCount;

  res.status(200).json({ success: true, data: workspaceData });
});

export const createWorkspace = asyncHandler(async (req, res) => {
  const { name, industry, size, description, company, workspaceSlug } =
    req.body;

  const workspaceData = {
    name,
    description,
    industry,
    size,
    company: company || {},
    owner: req.user._id,
    admins: [req.user._id],
    createdBy: req.user._id,
    plan: "free",
    subscription: {
      status: "trial",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  };

  if (workspaceSlug) {
    workspaceData.slug = workspaceSlug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  const workspace = await Workspace.create(workspaceData);

  const adminPermissions = getRolePermissions("company_admin");
  req.user.addOrUpdateMembership({
    workspace: workspace._id,
    role: "company_admin",
    permissions: adminPermissions,
  });
  await req.user.save({ validateBeforeSave: false });

  res.status(201).json({ success: true, data: workspace });
});

export const updateWorkspace = asyncHandler(async (req, res) => {
  const workspace = await Workspace.findById(req.workspace._id);
  if (!workspace) throw new AppError("Workspace not found", 404);

  if (req.body.name !== undefined) workspace.name = req.body.name;
  if (req.body.description !== undefined)
    workspace.description = req.body.description;
  if (req.body.industry !== undefined) workspace.industry = req.body.industry;
  if (req.body.size !== undefined) workspace.size = req.body.size;

  if (req.body.company) {
    workspace.company = {
      ...workspace.company?.toObject(),
      ...req.body.company,
    };
    workspace.markModified("company");
  }

  if (req.body.branding) {
    workspace.branding = {
      ...workspace.branding?.toObject(),
      ...req.body.branding,
    };
    workspace.markModified("branding");
  }

  if (req.body.settings) {
    const s = req.body.settings;
    if (s.timezone !== undefined) workspace.settings.timezone = s.timezone;
    if (s.dateFormat !== undefined)
      workspace.settings.dateFormat = s.dateFormat;
    if (s.currency !== undefined) workspace.settings.currency = s.currency;
    if (s.language !== undefined) workspace.settings.language = s.language;
    workspace.markModified("settings");
  }

  await workspace.save();

  res
    .status(200)
    .json({ success: true, message: "Workspace updated", data: workspace });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const workspace = await Workspace.findById(req.workspace._id);
  if (!workspace) throw new AppError("Workspace not found", 404);

  const {
    timezone,
    dateFormat,
    currency,
    language,
    weekStartsOn,
    workingHours,
    features,
  } = req.body;

  if (timezone) workspace.settings.timezone = timezone;
  if (dateFormat) workspace.settings.dateFormat = dateFormat;
  if (currency) workspace.settings.currency = currency;
  if (language) workspace.settings.language = language;
  if (weekStartsOn) workspace.settings.weekStartsOn = weekStartsOn;
  if (workingHours) {
    workspace.settings.workingHours.start =
      workingHours.start || workspace.settings.workingHours.start;
    workspace.settings.workingHours.end =
      workingHours.end || workspace.settings.workingHours.end;
  }
  if (features) {
    Object.keys(features).forEach((key) => {
      workspace.settings.features[key] = features[key];
    });
  }
  workspace.markModified("settings");
  await workspace.save();

  res.status(200).json({ success: true, data: workspace.settings });
});

export const updateBranding = asyncHandler(async (req, res) => {
  const workspace = await Workspace.findById(req.workspace._id);
  if (!workspace) throw new AppError("Workspace not found", 404);

  const { logo, primaryColor, secondaryColor, customDomain } = req.body;
  if (logo) workspace.branding.logo = logo;
  if (primaryColor) workspace.branding.primaryColor = primaryColor;
  if (secondaryColor) workspace.branding.secondaryColor = secondaryColor;
  if (customDomain !== undefined)
    workspace.branding.customDomain = customDomain;
  workspace.markModified("branding");
  await workspace.save();

  res.status(200).json({ success: true, data: workspace.branding });
});

export const getMembers = asyncHandler(async (req, res) => {
  const { role, status, search } = req.query;
  const workspaceId = req.workspace._id;

  const matchQuery = {
    workspaceMemberships: {
      $elemMatch: { workspace: workspaceId },
    },
  };

  if (search) {
    matchQuery.$or = [
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const users = await User.find(matchQuery)
    .select(
      "-password -refreshToken -passwordHistory -activeSessions -twoFactorSecret -passwordResetToken -emailVerificationToken",
    )
    .sort("firstName lastName");

  let members = users
    .map((user) => {
      const obj = user.toObject();
      const membership = user.workspaceMemberships.find(
        (m) => m.workspace.toString() === workspaceId.toString(),
      );
      obj.role = membership?.role || null;
      obj.permissions = membership?.permissions || [];
      obj.isActive = membership?.isActive ?? false;
      return obj;
    })

    .filter((m) => {
      if (status === "active") return m.isActive === true;
      if (status === "inactive") return m.isActive === false;
      return true; // default: show both active and terminated members
    });

  if (role) {
    members = members.filter((m) => m.role === role);
  }

  res.status(200).json({ success: true, count: members.length, data: members });
});

export const inviteMember = asyncHandler(async (req, res) => {
  const { email, role } = req.body;
  if (!email || !email.match(/^\S+@\S+\.\S+$/))
    throw new AppError("Valid email required", 400);

  const normalizedEmail = email.toLowerCase().trim();
  const workspaceId = req.workspace._id;

  const canAdd = await req.workspace.canAddUser();
  if (!canAdd) throw new AppError("User limit reached for your plan", 403);

  const existingMember = await User.findOne({
    email: normalizedEmail,
    workspaceMemberships: {
      $elemMatch: { workspace: workspaceId, isActive: true },
    },
  });
  if (existingMember)
    throw new AppError("User is already a member of this workspace", 400);

  const existingInvitation = req.workspace.invitations.find(
    (inv) =>
      inv.email === normalizedEmail &&
      inv.status === "pending" &&
      inv.expiresAt > new Date(),
  );
  if (existingInvitation) {
    return res.status(409).json({
      success: false,
      message: "Invitation already sent",
      code: "INVITATION_EXISTS",
    });
  }

  const token = crypto.randomBytes(32).toString("hex");
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
    await emailService.sendTeamInvitation(
      normalizedEmail,
      req.workspace.name,
      invitationUrl,
      role,
    );
  } catch {}

  res
    .status(200)
    .json({ success: true, message: `Invitation sent to ${normalizedEmail}` });
});

export const acceptInvitation = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { firstName, lastName, password } = req.body;

  const workspace = await Workspace.findOne({
    "invitations.token": token,
    "invitations.status": "pending",
    "invitations.expiresAt": { $gt: new Date() },
  });
  if (!workspace) throw new AppError("Invalid or expired invitation", 400);

  const invitation = workspace.invitations.find((inv) => inv.token === token);
  const targetRole = invitation.role || "employee";
  const targetPermissions = getRolePermissions(targetRole);

  let user = await User.findOne({ email: invitation.email });

  if (user) {
    const alreadyMember = user.getMembership(workspace._id);
    if (alreadyMember) {
      throw new AppError("You are already a member of this workspace", 400);
    }

    user.addOrUpdateMembership({
      workspace: workspace._id,
      role: targetRole,
      permissions: targetPermissions,
      invitedBy: invitation.invitedBy,
    });

    if (!user.isEmailVerified) {
      user.isEmailVerified = true;

      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
    }

    await user.save({ validateBeforeSave: false });
  } else {
    if (!firstName || !lastName || !password) {
      throw new AppError(
        "First name, last name, and password are required for new accounts",
        400,
      );
    }

    user = await User.create({
      email: invitation.email,
      password,
      firstName,
      lastName,

      isEmailVerified: true,
      workspaceMemberships: [
        {
          workspace: workspace._id,
          role: targetRole,
          permissions: targetPermissions,
          isActive: true,
          joinedAt: new Date(),
          invitedBy: invitation.invitedBy,
        },
      ],
    });
  }

  invitation.status = "accepted";
  await workspace.save();

  const accessToken = user.generateAuthToken();
  const refreshToken = user.generateRefreshToken();
  user.addSession(accessToken, req.ip, req.headers["user-agent"] || "unknown");
  await user.save({ validateBeforeSave: false });

  const membership = user.getMembership(workspace._id);

  res.status(200).json({
    success: true,
    message: `Welcome to ${workspace.name}!`,
    data: {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: membership?.role,
        permissions: membership?.permissions || [],
        isEmailVerified: user.isEmailVerified,
        workspace: {
          id: workspace._id,
          name: workspace.name,
          slug: workspace.slug,
          plan: workspace.plan,
        },
      },
      accessToken,
      refreshToken,
    },
  });
});

export const cancelInvitation = asyncHandler(async (req, res) => {
  const invitation = req.workspace.invitations.id(req.params.invitationId);
  if (!invitation) throw new AppError("Invitation not found", 404);
  invitation.status = "cancelled";
  await req.workspace.save();
  res.status(200).json({ success: true, message: "Invitation cancelled" });
});

export const removeMember = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const workspaceId = req.workspace._id;

  if (req.workspace.owner.toString() === userId) {
    throw new AppError(
      "Cannot remove the workspace owner. Transfer ownership first.",
      400,
    );
  }

  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);

  const membership = user.getMembership(workspaceId);
  if (!membership)
    throw new AppError("Member not found in this workspace", 404);

  const userName = `${user.firstName} ${user.lastName}`;

  user.removeMembership(workspaceId);

  req.workspace.admins = req.workspace.admins.filter(
    (admin) => admin.toString() !== userId,
  );

  await Promise.all([
    Project.updateMany(
      { workspace: workspaceId, "team.user": userId },
      { $pull: { team: { user: userId } } },
    ),
    Task.updateMany(
      { workspace: workspaceId, "assignedTo.user": userId },
      { $pull: { assignedTo: { user: userId } } },
    ),
    Task.updateMany(
      { workspace: workspaceId },
      { $pull: { watchers: userId } },
    ),

    Employee.findOneAndDelete({ workspace: workspaceId, user: userId }),
  ]);

  await Promise.all([
    user.save({ validateBeforeSave: false }),
    req.workspace.save(),
  ]);

  res.status(200).json({
    success: true,
    message: `${userName} has been removed from this workspace`,
  });
});

export const updateMemberRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;
  const workspaceId = req.workspace._id;

  if (req.workspace.owner.toString() === userId && role !== "company_admin") {
    throw new AppError(
      "Cannot change the workspace owner role without transferring ownership",
      400,
    );
  }

  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);

  const membership = user.getMembership(workspaceId);
  if (!membership)
    throw new AppError("Member not found in this workspace", 404);

  membership.role = role;
  membership.permissions = getRolePermissions(role);

  const isAdmin = ["company_admin", "super_admin"].includes(role);
  if (isAdmin) {
    req.workspace.admins.addToSet(userId);
  } else {
    req.workspace.admins.pull(userId);
  }

  await Promise.all([
    user.save({ validateBeforeSave: false }),
    req.workspace.save(),
  ]);

  const obj = user.toObject();
  obj.role = membership.role;
  obj.permissions = membership.permissions;

  res.status(200).json({ success: true, data: obj });
});

export const terminateMember = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const workspaceId = req.workspace._id;

  if (req.workspace.owner.toString() === userId) {
    throw new AppError("Cannot terminate the workspace owner", 400);
  }

  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);

  const membership = user.getMembership(workspaceId);
  if (!membership)
    throw new AppError("Member not found in this workspace", 404);

  user.deactivateMembership(workspaceId);

  req.workspace.admins = req.workspace.admins.filter(
    (admin) => admin.toString() !== userId,
  );

  await Promise.all([
    user.save({ validateBeforeSave: false }),
    req.workspace.save(),
  ]);

  res.status(200).json({
    success: true,
    message: `${user.firstName} ${user.lastName} has been terminated from this workspace`,
  });
});

export const reactivateMember = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const workspaceId = req.workspace._id;

  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);

  const membership = user.workspaceMemberships?.find(
    (m) => m.workspace.toString() === workspaceId.toString(),
  );
  if (!membership)
    throw new AppError(
      "No membership record found for this user in this workspace",
      404,
    );

  membership.isActive = true;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: `${user.firstName} ${user.lastName} has been reactivated`,
  });
});

export const transferOwnership = asyncHandler(async (req, res) => {
  const workspaceId = req.workspace._id;

  if (req.workspace.owner.toString() !== req.user._id.toString()) {
    throw new AppError("Only the workspace owner can transfer ownership", 403);
  }

  const newOwnerUser = await User.findById(req.body.newOwnerId);
  if (!newOwnerUser) throw new AppError("New owner not found", 404);

  const newOwnerMembership = newOwnerUser.getMembership(workspaceId);
  if (!newOwnerMembership) {
    throw new AppError(
      "The new owner must be an active member of this workspace",
      400,
    );
  }

  const oldOwner = await User.findById(req.workspace.owner);
  if (oldOwner) {
    const oldOwnerMembership = oldOwner.getMembership(workspaceId);
    if (oldOwnerMembership) {
      oldOwnerMembership.role = "company_admin";
      oldOwnerMembership.permissions = getRolePermissions("company_admin");
    }
    req.workspace.admins.addToSet(oldOwner._id);
    await oldOwner.save({ validateBeforeSave: false });
  }

  newOwnerMembership.role = "company_admin";
  newOwnerMembership.permissions = getRolePermissions("company_admin");
  req.workspace.owner = req.body.newOwnerId;
  req.workspace.admins.pull(req.body.newOwnerId);

  await Promise.all([
    newOwnerUser.save({ validateBeforeSave: false }),
    req.workspace.save(),
  ]);

  res
    .status(200)
    .json({ success: true, message: "Ownership transferred successfully" });
});

export const deleteWorkspace = asyncHandler(async (req, res) => {
  if (req.workspace.owner.toString() !== req.user._id.toString()) {
    throw new AppError(
      "Only the workspace owner can delete the workspace",
      403,
    );
  }

  const workspaceId = req.workspace._id;

  req.workspace.isActive = false;
  req.workspace.deletedAt = new Date();
  await req.workspace.save();

  await User.updateMany(
    { "workspaceMemberships.workspace": workspaceId },
    { $set: { "workspaceMemberships.$[elem].isActive": false } },
    { arrayFilters: [{ "elem.workspace": workspaceId }] },
  );

  res
    .status(200)
    .json({ success: true, message: "Workspace deleted successfully" });
});

export const getInvitations = asyncHandler(async (req, res) => {
  const invitations = req.workspace.invitations.filter(
    (inv) => inv.status === "pending",
  );
  res
    .status(200)
    .json({ success: true, count: invitations.length, data: invitations });
});

export const resendInvitation = asyncHandler(async (req, res) => {
  const invitation = req.workspace.invitations.id(req.params.invitationId);
  if (!invitation) throw new AppError("Invitation not found", 404);
  if (invitation.status === "accepted")
    throw new AppError("Invitation already accepted", 400);

  const newToken = crypto.randomBytes(32).toString("hex");
  invitation.token = newToken;
  invitation.status = "pending";
  invitation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await req.workspace.save();

  const invitationUrl = `${process.env.CLIENT_URL}/join/${newToken}`;
  try {
    await emailService.sendTeamInvitation(
      invitation.email,
      req.workspace.name,
      invitationUrl,
      invitation.role,
    );
  } catch {}

  res.status(200).json({
    success: true,
    message: `Invitation resent to ${invitation.email}`,
  });
});

export const getSubscription = asyncHandler(async (req, res) => {
  const workspace = await Workspace.findById(req.workspace._id).select(
    "plan subscription",
  );
  res.status(200).json({
    success: true,
    data: {
      plan: workspace.plan,
      subscription: workspace.subscription,
      limits: workspace.subscription.planLimits,
    },
  });
});

export const getWorkspaceStats = asyncHandler(async (req, res) => {
  const workspaceId = req.workspace._id;

  const [memberCount, clientCount, projectCount, taskCount, invoiceCount] =
    await Promise.all([
      User.countDocuments({
        workspaceMemberships: {
          $elemMatch: { workspace: workspaceId, isActive: true },
        },
        isActive: true,
      }),
      mongoose.model("Client").countDocuments({ workspace: workspaceId }),
      mongoose.model("Project").countDocuments({
        workspace: workspaceId,
        status: { $ne: "cancelled" },
      }),
      mongoose.model("Task").countDocuments({ workspace: workspaceId }),
      mongoose.model("Invoice").countDocuments({ workspace: workspaceId }),
    ]);

  res.status(200).json({
    success: true,
    data: {
      members: memberCount,
      clients: clientCount,
      projects: projectCount,
      tasks: taskCount,
      invoices: invoiceCount,
      limits: req.workspace.subscription?.planLimits,
    },
  });
});

export const previewInvitation = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const workspace = await Workspace.findOne({
    "invitations.token": token,
    "invitations.status": "pending",
    "invitations.expiresAt": { $gt: new Date() },
  }).select("name slug branding invitations");

  if (!workspace) {
    throw new AppError("This invitation link is invalid or has expired.", 400);
  }

  const invitation = workspace.invitations.find((inv) => inv.token === token);

  const existingUser = await User.findOne({ email: invitation.email })
    .select("firstName _id")
    .lean();

  let inviterName = "A team member";
  if (invitation.invitedBy) {
    const inviter = await User.findById(invitation.invitedBy)
      .select("firstName lastName")
      .lean();
    if (inviter)
      inviterName = `${inviter.firstName} ${inviter.lastName}`.trim();
  }

  return res.status(200).json({
    success: true,
    data: {
      workspaceName: workspace.name,
      workspaceSlug: workspace.slug,
      workspaceLogo: workspace.branding?.logo?.url || null,
      invitedEmail: invitation.email,
      role: invitation.role || "employee",
      inviterName,
      expiresAt: invitation.expiresAt,

      isExistingUser: !!existingUser,
    },
  });
});
