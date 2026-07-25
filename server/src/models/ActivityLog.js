import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },

    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    action: {
      type: String,
      enum: [
        "created",
        "updated",
        "deleted",
        "archived",
        "restored",
        "status_changed",
        "assigned",
        "unassigned",
        "commented",
        "uploaded",
        "downloaded",
        "login",
        "logout",
        "password_changed",
        "invited",
        "joined",
        "removed",
        "paid",
        "sent",
        "cancelled",
        "exported",
        "imported",
      ],
      required: true,
      index: true,
    },
    entity: {
      type: String,
      enum: [
        "user",
        "workspace",
        "project",
        "task",
        "client",
        "invoice",
        "file",
        "comment",
        "notification",
        "report",
      ],
      required: true,
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    entityName: String,

    description: String,
    changes: mongoose.Schema.Types.Mixed,
    previousValues: mongoose.Schema.Types.Mixed,
    newValues: mongoose.Schema.Types.Mixed,

    ipAddress: String,
    userAgent: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
  },
);

activityLogSchema.index({
  workspace: 1,
  entity: 1,
  entityId: 1,
  createdAt: -1,
});
activityLogSchema.index({ workspace: 1, performedBy: 1, createdAt: -1 });
activityLogSchema.index({ workspace: 1, action: 1, createdAt: -1 });
activityLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 365 * 24 * 60 * 60 },
); // TTL: 1 year

export default mongoose.model("ActivityLog", activityLogSchema);
