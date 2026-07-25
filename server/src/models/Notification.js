import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    type: {
      type: String,
      enum: [
        "task_assigned",
        "task_updated",
        "task_completed",
        "project_assignment",
        "project_update",
        "project_completed",
        "mention",
        "comment",
        "file_uploaded",
        "invoice_generated",
        "payment_received",
        "payment_overdue",
        "member_added",
        "member_removed",
        "role_changed",
        "deadline_reminder",
        "workspace_update",
        "info",
        "warning",
        "success",
        "error",
      ],
      default: "info",
      index: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },

    isRead: { type: Boolean, default: false, index: true },
    readAt: Date,
    isArchived: { type: Boolean, default: false },

    metadata: {
      taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
      projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
      invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice" },
      clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
      commentId: String,
      fileId: String,
      url: String,
    },

    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },

    expiresAt: Date,
  },
  {
    timestamps: true,
  },
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isArchived: 1 });
notificationSchema.index({ workspace: 1, type: 1, createdAt: -1 });
notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 },
); // TTL: 90 days

notificationSchema.methods.markAsRead = function () {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

notificationSchema.methods.archive = function () {
  this.isArchived = true;
  return this.save();
};

export default mongoose.model("Notification", notificationSchema);
