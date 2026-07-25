import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      maxlength: 5000,
    },
    key: {
      type: String,
      uppercase: true,
      maxlength: 10,
    },

    status: {
      type: String,
      enum: ["planning", "active", "on_hold", "completed", "cancelled"],
      default: "planning",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    type: {
      type: String,
      enum: ["fixed_price", "hourly", "retainer", "internal"],
      required: true,
    },

    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },
    team: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        role: String,
        hoursAllocated: Number,
        hoursWorked: { type: Number, default: 0 },
        joinedAt: { type: Date, default: Date.now },
      },
    ],

    budget: {
      estimated: { type: Number, required: true },
      actual: { type: Number, default: 0 },
      currency: { type: String, default: "USD" },
      expenses: [
        {
          description: String,
          amount: Number,
          category: String,
          date: { type: Date, default: Date.now },
          approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          receipt: { url: String, publicId: String },
        },
      ],
    },

    timeline: {
      startDate: Date,
      endDate: Date,
      deadline: { type: Date, index: true },
      estimatedHours: Number,
      actualHours: { type: Number, default: 0 },
      completedAt: Date,
    },

    tasks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
      },
    ],

    progress: { type: Number, default: 0, min: 0, max: 100 },
    milestones: [
      {
        title: String,
        description: String,
        dueDate: Date,
        status: {
          type: String,
          enum: ["pending", "in_progress", "completed"],
          default: "pending",
        },
        completedAt: Date,
        completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],

    attachments: [
      {
        name: String,
        url: String,
        publicId: String,
        type: String,
        size: Number,
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    tags: [String],
    labels: [
      {
        name: String,
        color: String,
      },
    ],
    isArchived: { type: Boolean, default: false, index: true },
    isTemplate: { type: Boolean, default: false },

    activityLog: [
      {
        action: String,
        description: String,
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        timestamp: { type: Date, default: Date.now },
        metadata: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

projectSchema.index({ workspace: 1, status: 1, isArchived: 1 });
projectSchema.index({ workspace: 1, client: 1 });
projectSchema.index({ "team.user": 1 });
projectSchema.index({ name: "text", description: "text" });
projectSchema.index({ "timeline.deadline": 1, status: 1 });

projectSchema.virtual("taskCount", {
  ref: "Task",
  localField: "_id",
  foreignField: "project",
  count: true,
});

projectSchema.virtual("completedTaskCount", {
  ref: "Task",
  localField: "_id",
  foreignField: "project",
  count: true,
  match: { status: "completed" },
});

projectSchema.methods.calculateProgress = async function () {
  const Task = mongoose.model("Task");
  const [total, completed] = await Promise.all([
    Task.countDocuments({ project: this._id }),
    Task.countDocuments({ project: this._id, status: "completed" }),
  ]);
  this.progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  return this.progress;
};

projectSchema.methods.addActivity = function (
  action,
  description,
  userId,
  metadata = {},
) {
  this.activityLog.push({ action, description, performedBy: userId, metadata });
};

export default mongoose.model("Project", projectSchema);
