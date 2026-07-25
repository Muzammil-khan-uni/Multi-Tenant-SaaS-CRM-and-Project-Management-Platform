import mongoose from "mongoose";
import Workspace from "../models/Workspace.js";
import User from "../models/User.js";
import ActivityLog from "../models/ActivityLog.js";
import PlatformAnnouncement from "../models/PlatformAnnouncement.js";
import { AppError, asyncHandler } from "../middleware/errorHandler.js";

export const getPlatformAnalytics = asyncHandler(async (req, res) => {
  const [
    totalWorkspaces,
    activeWorkspaces,
    suspendedWorkspaces,
    totalUsers,
    newWorkspacesThisMonth,
    newUsersThisMonth,
    workspacesByPlan,
    workspacesByStatus,
    workspacesByIndustry,
  ] = await Promise.all([
    Workspace.countDocuments({}),
    Workspace.countDocuments({ isActive: true }),
    Workspace.countDocuments({ isActive: false }),
    User.countDocuments({ isActive: true }),
    Workspace.countDocuments({
      createdAt: { $gte: new Date(new Date().setDate(1)) },
    }),
    User.countDocuments({
      createdAt: { $gte: new Date(new Date().setDate(1)) },
    }),
    Workspace.aggregate([{ $group: { _id: "$plan", count: { $sum: 1 } } }]),
    Workspace.aggregate([
      { $group: { _id: "$subscription.status", count: { $sum: 1 } } },
    ]),
    Workspace.aggregate([
      { $match: { industry: { $ne: null } } },
      { $group: { _id: "$industry", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
  ]);

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const monthlyGrowth = await Workspace.aggregate([
    { $match: { createdAt: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  const monthlyUserGrowth = await User.aggregate([
    { $match: { createdAt: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  res.status(200).json({
    success: true,
    data: {
      overview: {
        totalWorkspaces,
        activeWorkspaces,
        suspendedWorkspaces,
        totalUsers,
        newWorkspacesThisMonth,
        newUsersThisMonth,
      },
      workspacesByPlan: workspacesByPlan.reduce((acc, item) => {
        acc[item._id || "unknown"] = item.count;
        return acc;
      }, {}),
      workspacesByStatus: workspacesByStatus.reduce((acc, item) => {
        acc[item._id || "unknown"] = item.count;
        return acc;
      }, {}),
      workspacesByIndustry,
      monthlyGrowth,
      monthlyUserGrowth,
    },
  });
});

export const getAllWorkspaces = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search,
    plan,
    status,
    industry,
    sort = "-createdAt",
  } = req.query;

  const filter = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { slug: { $regex: search, $options: "i" } },
      { "company.email": { $regex: search, $options: "i" } },
    ];
  }
  if (plan) filter.plan = plan;
  if (status === "active") filter.isActive = true;
  if (status === "suspended") filter.isActive = false;
  if (industry) filter.industry = industry;

  const total = await Workspace.countDocuments(filter);
  const workspaces = await Workspace.find(filter)
    .populate("owner", "firstName lastName email")
    .select("-invitations -__v")
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .lean();

  const augmented = await Promise.all(
    workspaces.map(async (ws) => {
      const memberCount = await User.countDocuments({
        workspaceMemberships: {
          $elemMatch: { workspace: ws._id, isActive: true },
        },
        isActive: true,
      });
      return { ...ws, memberCount };
    }),
  );

  res.status(200).json({
    success: true,
    count: augmented.length,
    total,
    pages: Math.ceil(total / limit),
    currentPage: Number(page),
    data: augmented,
  });
});

export const getWorkspaceById = asyncHandler(async (req, res) => {
  const workspace = await Workspace.findById(req.params.workspaceId)
    .populate("owner", "firstName lastName email avatar createdAt")
    .populate("admins", "firstName lastName email")
    .lean();

  if (!workspace) throw new AppError("Workspace not found", 404);

  const [memberCount, projectCount, taskCount, invoiceCount, recentLogs] =
    await Promise.all([
      User.countDocuments({
        workspaceMemberships: {
          $elemMatch: { workspace: workspace._id, isActive: true },
        },
        isActive: true,
      }),
      mongoose.model("Project").countDocuments({ workspace: workspace._id }),
      mongoose.model("Task").countDocuments({ workspace: workspace._id }),
      mongoose.model("Invoice").countDocuments({ workspace: workspace._id }),
      ActivityLog.find({ workspace: workspace._id })
        .sort("-createdAt")
        .limit(20)
        .populate("performedBy", "firstName lastName email")
        .lean(),
    ]);

  res.status(200).json({
    success: true,
    data: {
      ...workspace,
      stats: { memberCount, projectCount, taskCount, invoiceCount },
      recentActivity: recentLogs,
    },
  });
});

export const approveWorkspace = asyncHandler(async (req, res) => {
  const workspace = await Workspace.findById(req.params.workspaceId);
  if (!workspace) throw new AppError("Workspace not found", 404);

  workspace.isVerified = true;
  workspace.isActive = true;
  await workspace.save();

  res.status(200).json({
    success: true,
    message: "Workspace approved successfully",
    data: workspace,
  });
});

export const suspendWorkspace = asyncHandler(async (req, res) => {
  const workspace = await Workspace.findById(req.params.workspaceId);
  if (!workspace) throw new AppError("Workspace not found", 404);

  workspace.isActive = false;
  workspace.subscription.status = "inactive";
  await workspace.save();

  res.status(200).json({
    success: true,
    message: "Workspace suspended successfully",
    data: workspace,
  });
});

export const reactivateWorkspace = asyncHandler(async (req, res) => {
  const workspace = await Workspace.findById(req.params.workspaceId);
  if (!workspace) throw new AppError("Workspace not found", 404);

  workspace.isActive = true;
  workspace.subscription.status = "active";
  await workspace.save();

  res.status(200).json({
    success: true,
    message: "Workspace reactivated successfully",
    data: workspace,
  });
});

export const deleteWorkspacePermanently = asyncHandler(async (req, res) => {
  const workspace = await Workspace.findById(req.params.workspaceId);
  if (!workspace) throw new AppError("Workspace not found", 404);

  const workspaceId = workspace._id;

  await User.updateMany(
    { "workspaceMemberships.workspace": workspaceId },
    { $pull: { workspaceMemberships: { workspace: workspaceId } } },
  );

  await Promise.all([
    mongoose.model("Project").deleteMany({ workspace: workspaceId }),
    mongoose.model("Task").deleteMany({ workspace: workspaceId }),
    mongoose.model("Client").deleteMany({ workspace: workspaceId }),
    mongoose.model("Invoice").deleteMany({ workspace: workspaceId }),
    ActivityLog.deleteMany({ workspace: workspaceId }),
  ]);

  await Workspace.findByIdAndDelete(workspaceId);

  res
    .status(200)
    .json({ success: true, message: "Workspace permanently deleted" });
});

export const updateWorkspacePlan = asyncHandler(async (req, res) => {
  const { plan } = req.body;
  const validPlans = ["free", "starter", "professional", "enterprise"];
  if (!validPlans.includes(plan)) throw new AppError("Invalid plan", 400);

  const workspace = await Workspace.findById(req.params.workspaceId);
  if (!workspace) throw new AppError("Workspace not found", 404);

  workspace.plan = plan;
  await workspace.save();

  res
    .status(200)
    .json({ success: true, message: "Plan updated", data: workspace });
});

let platformSettings = {
  platformName: "SaaS CRM Platform",
  supportEmail: "support@saascrm.io",
  maxWorkspacesPerUser: 10,
  defaultPlan: "free",
  registrationEnabled: true,
  maintenanceMode: false,
  maintenanceMessage: "",
  emailNotificationsEnabled: true,
  maxFileUploadSizeMB: 10,
  allowedFileTypes: [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
  ],
};

export const getPlatformSettings = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: platformSettings });
});

export const updatePlatformSettings = asyncHandler(async (req, res) => {
  const allowed = [
    "platformName",
    "supportEmail",
    "maxWorkspacesPerUser",
    "defaultPlan",
    "registrationEnabled",
    "maintenanceMode",
    "maintenanceMessage",
    "emailNotificationsEnabled",
    "maxFileUploadSizeMB",
    "allowedFileTypes",
  ];

  allowed.forEach((key) => {
    if (req.body[key] !== undefined) {
      platformSettings[key] = req.body[key];
    }
  });

  res.status(200).json({
    success: true,
    message: "Platform settings updated",
    data: platformSettings,
  });
});

export const getSecurityLogs = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    action,
    entity,
    workspaceId,
    userId,
    startDate,
    endDate,
  } = req.query;

  const filter = {};
  if (action) filter.action = action;
  if (entity) filter.entity = entity;
  if (workspaceId) filter.workspace = workspaceId;
  if (userId) filter.performedBy = userId;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const total = await ActivityLog.countDocuments(filter);
  const logs = await ActivityLog.find(filter)
    .sort("-createdAt")
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .populate("performedBy", "firstName lastName email")
    .populate("workspace", "name slug")
    .lean();

  res.status(200).json({
    success: true,
    count: logs.length,
    total,
    pages: Math.ceil(total / limit),
    currentPage: Number(page),
    data: logs,
  });
});

export const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, isActive } = req.query;

  const filter = {};
  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }
  if (isActive !== undefined) filter.isActive = isActive === "true";

  const total = await User.countDocuments(filter);
  const users = await User.find(filter)
    .select(
      "-password -refreshToken -passwordHistory -activeSessions -twoFactorSecret -passwordResetToken -emailVerificationToken",
    )
    .sort("-createdAt")
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .lean();

  const augmented = users.map((user) => ({
    ...user,
    workspaceCount:
      user.workspaceMemberships?.filter((m) => m.isActive).length || 0,
  }));

  res.status(200).json({
    success: true,
    count: augmented.length,
    total,
    pages: Math.ceil(total / limit),
    currentPage: Number(page),
    data: augmented,
  });
});

export const createAnnouncement = asyncHandler(async (req, res) => {
  const {
    title,
    message,
    type,
    targetAudience,
    targetPlan,
    isPinned,
    expiresAt,
  } = req.body;

  if (!title || !message)
    throw new AppError("Title and message are required", 400);

  const announcement = await PlatformAnnouncement.create({
    title,
    message,
    type: type || "info",
    targetAudience: targetAudience || "all",
    targetPlan,
    isPinned: isPinned || false,
    expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    sentBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: "Announcement created",
    data: announcement,
  });
});

export const getAnnouncements = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type, isActive } = req.query;

  const filter = {};
  if (type) filter.type = type;
  if (isActive !== undefined) filter.isActive = isActive === "true";

  const total = await PlatformAnnouncement.countDocuments(filter);
  const announcements = await PlatformAnnouncement.find(filter)
    .sort({ isPinned: -1, createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .populate("sentBy", "firstName lastName email")
    .lean();

  res.status(200).json({
    success: true,
    count: announcements.length,
    total,
    pages: Math.ceil(total / limit),
    data: announcements,
  });
});

export const updateAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await PlatformAnnouncement.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true },
  );
  if (!announcement) throw new AppError("Announcement not found", 404);

  res.status(200).json({ success: true, data: announcement });
});

export const deleteAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await PlatformAnnouncement.findByIdAndDelete(
    req.params.id,
  );
  if (!announcement) throw new AppError("Announcement not found", 404);

  res.status(200).json({ success: true, message: "Announcement deleted" });
});

export const getActiveAnnouncements = asyncHandler(async (req, res) => {
  const now = new Date();
  const userId = req.user._id;
  const filter = {
    isActive: true,
    $or: [{ expiresAt: { $gt: now } }, { expiresAt: { $exists: false } }],
    "readBy.user": { $ne: userId },
  };
  const announcements = await PlatformAnnouncement.find(filter)
    .sort({ isPinned: -1, createdAt: -1 })
    .limit(10)
    .select("title message type isPinned createdAt")
    .lean();
  res.status(200).json({ success: true, data: announcements });
});

export const markAnnouncementRead = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  await PlatformAnnouncement.findByIdAndUpdate(req.params.id, {
    $addToSet: { readBy: { user: userId, readAt: new Date() } },
  });

  res.status(200).json({ success: true });
});
