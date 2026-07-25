import Notification from "../models/Notification.js";
import { AppError, asyncHandler } from "../middleware/errorHandler.js";
import { sendNotification, isUserOnline } from "../websocket/socketManager.js";

export const getNotifications = asyncHandler(async (req, res) => {
  const { type, isRead, limit = 20, page = 1 } = req.query;
  const filter = {
    workspace: req.workspace._id,
    recipient: req.user._id,
    isArchived: false,
  };

  if (type) filter.type = type;
  if (isRead !== undefined) filter.isRead = isRead === "true";

  const skip = (page - 1) * limit;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .populate("sender", "firstName lastName avatar")
      .sort("-createdAt")
      .skip(skip)
      .limit(parseInt(limit)),
    Notification.countDocuments(filter),
    Notification.countDocuments({ ...filter, isRead: false }),
  ]);

  res.status(200).json({
    success: true,
    data: notifications,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
    unreadCount,
  });
});

export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    {
      _id: req.params.id,
      recipient: req.user._id,
      workspace: req.workspace._id,
    },
    { isRead: true, readAt: new Date() },
    { new: true },
  );

  if (!notification) {
    throw new AppError("Notification not found", 404);
  }

  res.status(200).json({
    success: true,
    data: notification,
  });
});

export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    {
      recipient: req.user._id,
      workspace: req.workspace._id,
      isRead: false,
    },
    { isRead: true, readAt: new Date() },
  );

  res.status(200).json({
    success: true,
    message: "All notifications marked as read",
  });
});

export const archiveNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    {
      _id: req.params.id,
      recipient: req.user._id,
    },
    { isArchived: true },
    { new: true },
  );

  if (!notification) {
    throw new AppError("Notification not found", 404);
  }

  res.status(200).json({
    success: true,
    data: notification,
  });
});

export const createNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.create({
    workspace: req.workspace._id,
    recipient: req.body.recipient,
    sender: req.user._id,
    type: req.body.type,
    title: req.body.title,
    message: req.body.message,
    metadata: req.body.metadata,
  });

  if (isUserOnline(req.body.recipient)) {
    const io = req.app.get("io");
    sendNotification(io, req.body.recipient, {
      type: notification.type,
      title: notification.title,
      message: notification.message,
      metadata: notification.metadata,
      sender: {
        id: req.user._id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        avatar: req.user.avatar?.url,
      },
    });
  }

  res.status(201).json({
    success: true,
    data: notification,
  });
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({
    recipient: req.user._id,
    workspace: req.workspace._id,
    isRead: false,
    isArchived: false,
  });

  res.status(200).json({
    success: true,
    data: { count },
  });
});

export const sendRealTimeNotification = asyncHandler(async (req, res) => {
  const { recipientId, type, title, message, metadata, sendEmail } = req.body;

  const notification = await Notification.create({
    workspace: req.workspace._id,
    recipient: recipientId,
    sender: req.user._id,
    type: type || "info",
    title,
    message,
    metadata: metadata || {},
  });

  const io = req.app.get("io");
  if (io && isUserOnline(recipientId)) {
    sendNotification(io, recipientId, {
      type: notification.type,
      title: notification.title,
      message: notification.message,
      metadata: notification.metadata,
      sender: {
        id: req.user._id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        avatar: req.user.avatar?.url,
      },
    });
  }

  if (sendEmail) {
    const recipient = await User.findById(recipientId);
    if (recipient) {
      await emailService.sendNotificationEmail(recipient, {
        type,
        title,
        message,
        sender: req.user,
      });
    }
  }

  res.status(201).json({
    success: true,
    message: "Notification sent",
    data: notification,
  });
});

export const getNotificationSettings = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    "preferences.notifications",
  );

  res.status(200).json({
    success: true,
    data: user?.preferences?.notifications || getDefaultNotificationSettings(),
  });
});

export const updateNotificationSettings = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user.preferences) {
    user.preferences = {};
  }

  user.preferences.notifications = {
    ...user.preferences.notifications,
    ...req.body,
  };

  user.markModified("preferences");
  await user.save();

  res.status(200).json({
    success: true,
    message: "Notification settings updated",
    data: user.preferences.notifications,
  });
});

function getDefaultNotificationSettings() {
  return {
    emailTaskAssigned: true,
    emailProjectUpdate: true,
    emailInvoiceGenerated: true,
    emailPaymentReceived: true,
    emailTeamChanges: false,
    emailWeeklyDigest: false,
    inAppTaskAssigned: true,
    inAppProjectUpdate: true,
    inAppComment: true,
    inAppMention: true,
    inAppInvoice: false,
    pushTaskAssigned: true,
    pushComment: true,
    pushMention: true,
    muteAll: false,
  };
}
