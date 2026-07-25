import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    roomId: {
      type: String,
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    type: {
      type: String,
      enum: ["text", "image", "file", "system"],
      default: "text",
    },
    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    attachments: [
      {
        name: String,
        url: String,
        type: String,
        size: Number,
      },
    ],
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatMessage",
    },
    reactions: [
      {
        emoji: String,
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
    isEdited: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    editedAt: Date,
  },
  {
    timestamps: true,
  },
);

chatMessageSchema.index({ workspace: 1, roomId: 1, createdAt: -1 });
chatMessageSchema.index({ sender: 1 });
chatMessageSchema.index({ mentions: 1 });

chatMessageSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 },
);

export default mongoose.model("ChatMessage", chatMessageSchema);
