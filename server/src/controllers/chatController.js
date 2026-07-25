import ChatMessage from "../models/ChatMessage.js";
import { AppError, asyncHandler } from "../middleware/errorHandler.js";

export const getChatMessages = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { limit = 50 } = req.query;

  const messages = await ChatMessage.find({
    workspace: req.workspace._id,
    roomId,
    isDeleted: false,
  })
    .populate("sender", "firstName lastName avatar")
    .populate("mentions", "firstName lastName")
    .populate("reactions.user", "firstName lastName")
    .populate({
      path: "replyTo",
      select: "message sender reactions",
      populate: {
        path: "sender",
        select: "firstName lastName",
      },
    })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

  res.status(200).json({
    success: true,
    count: messages.length,
    data: messages.reverse(),
  });
});

export const sendChatMessage = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { message, type, mentions, replyTo } = req.body;

  const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);
  let validReplyTo = replyTo && isValidObjectId(replyTo) ? replyTo : undefined;

  if (validReplyTo) {
    const replyMessage = await ChatMessage.findById(validReplyTo);
    if (!replyMessage) {
      validReplyTo = undefined; // Ignore invalid reply references
    }
  }

  const chatMessage = await ChatMessage.create({
    workspace: req.workspace._id,
    roomId,
    sender: req.user._id,
    message: message.trim(),
    type: type || "text",
    mentions: mentions || [],
    replyTo: validReplyTo,
  });

  const populated = await ChatMessage.findById(chatMessage._id)
    .populate("sender", "firstName lastName avatar")
    .populate("mentions", "firstName lastName")
    .populate("reactions.user", "firstName lastName")
    .populate({
      path: "replyTo",
      select: "message sender",
      populate: { path: "sender", select: "firstName lastName" },
    });

  const io = req.app.get("io");
  if (io) {
    io.to(`chat:${roomId}`).emit("chat:newMessage", {
      id: populated._id,
      message: populated.message,
      sender: {
        id: populated.sender._id,
        firstName: populated.sender.firstName,
        lastName: populated.sender.lastName,
        avatar: populated.sender.avatar?.url,
      },
      replyTo: populated.replyTo
        ? {
            id: populated.replyTo._id,
            message: populated.replyTo.message,
            sender: {
              id: populated.replyTo.sender?._id,
              firstName: populated.replyTo.sender?.firstName || "User",
            },
          }
        : null,
      timestamp: populated.createdAt,
      mentions: populated.mentions || [],
      reactions: (populated.reactions || []).map((r) => ({
        emoji: r.emoji,
        user: {
          id: r.user?._id || r.user,
          firstName: r.user?.firstName || "User",
        },
      })),
      isEdited: false,
      type: populated.type,
    });
  }

  res.status(201).json({ success: true, data: populated });
});

export const deleteChatMessage = asyncHandler(async (req, res) => {
  const message = await ChatMessage.findOneAndUpdate(
    {
      _id: req.params.messageId,
      sender: req.user._id,
      workspace: req.workspace._id,
    },
    { isDeleted: true },
    { new: true },
  );

  if (!message) {
    throw new AppError("Message not found or unauthorized", 404);
  }

  res.status(200).json({
    success: true,
    message: "Message deleted",
  });
});

export const clearChatMessages = asyncHandler(async (req, res) => {
  await ChatMessage.updateMany(
    {
      workspace: req.workspace._id,
      roomId: req.params.roomId,
    },
    { isDeleted: true },
  );

  res.status(200).json({
    success: true,
    message: "Chat cleared successfully",
  });
});

export const addReaction = asyncHandler(async (req, res) => {
  const { emoji } = req.body;
  const messageId = req.params.messageId;

  const message = await ChatMessage.findById(messageId);

  if (!message) {
    throw new AppError("Message not found", 404);
  }

  const existingIndex = message.reactions.findIndex(
    (r) => r.emoji === emoji && r.user.toString() === req.user._id.toString(),
  );

  if (existingIndex >= 0) {
    message.reactions.splice(existingIndex, 1);
  } else {
    message.reactions.push({ emoji, user: req.user._id });
  }

  await message.save();

  const updated = await ChatMessage.findById(messageId).populate(
    "reactions.user",
    "firstName lastName",
  );

  res.status(200).json({
    success: true,
    data: updated.reactions,
  });
});

export const editChatMessage = asyncHandler(async (req, res) => {
  const message = await ChatMessage.findOneAndUpdate(
    {
      _id: req.params.messageId,
      sender: req.user._id,
      workspace: req.workspace._id,
    },
    {
      message: req.body.message.trim(),
      isEdited: true,
      editedAt: new Date(),
    },
    { new: true },
  ).populate("sender", "firstName lastName avatar");

  if (!message) {
    throw new AppError("Message not found or unauthorized", 404);
  }

  res.status(200).json({
    success: true,
    data: message,
  });
});
