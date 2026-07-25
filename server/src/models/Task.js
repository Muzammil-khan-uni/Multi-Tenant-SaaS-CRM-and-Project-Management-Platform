import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      maxlength: 300,
    },
    description: {
      type: String,
      maxlength: 10000,
    },

    status: {
      type: String,
      enum: ["todo", "in_progress", "review", "completed"],
      default: "todo",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      index: true,
    },
    type: {
      type: String,
      enum: [
        "task",
        "bug",
        "feature",
        "improvement",
        "documentation",
        "meeting",
      ],
      default: "task",
    },

    boardColumn: {
      type: String,
      enum: ["todo", "in_progress", "review", "completed"],
      default: "todo",
    },
    boardOrder: { type: Number, default: 0 },
    order: { type: Number, default: 0 },

    assignedTo: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        assignedAt: { type: Date, default: Date.now },
        assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    watchers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    startDate: Date,
    dueDate: { type: Date, index: true },
    completedAt: Date,
    estimatedHours: Number,
    actualHours: { type: Number, default: 0 },

    labels: [
      {
        name: String,
        color: String,
      },
    ],
    tags: [String],

    checklist: [
      {
        title: String,
        completed: { type: Boolean, default: false },
        completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        completedAt: Date,
        order: Number,
      },
    ],

    comments: [
      {
        content: { type: String, required: true },
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        createdAt: { type: Date, default: Date.now },
        updatedAt: Date,
        isEdited: { type: Boolean, default: false },
        mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        attachments: [
          {
            name: String,
            url: String,
            type: String,
            size: Number,
          },
        ],
      },
    ],

    attachments: [
      {
        name: { type: String },
        url: { type: String },
        publicId: { type: String },
        type: { type: String },
        size: { type: Number },
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    timeEntries: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        description: String,
        startTime: Date,
        endTime: Date,
        duration: Number,
        billable: { type: Boolean, default: true },
        approved: { type: Boolean, default: false },
      },
    ],

    dependencies: [
      {
        task: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
        type: {
          type: String,
          enum: ["blocks", "blocked_by", "relates_to", "duplicates"],
        },
      },
    ],

    parentTask: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
    sprint: {
      name: String,
      startDate: Date,
      endDate: Date,
    },

    activityLog: [
      {
        action: String,
        description: String,
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        timestamp: { type: Date, default: Date.now },
        changes: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

taskSchema.index({ workspace: 1, project: 1, boardColumn: 1, boardOrder: 1 });
taskSchema.index({ workspace: 1, status: 1, priority: 1 });
taskSchema.index({ "assignedTo.user": 1, status: 1 });
taskSchema.index({ dueDate: 1, status: 1 });
taskSchema.index({ title: "text", description: "text" });
taskSchema.index({ labels: 1 });

taskSchema.virtual("checklistProgress").get(function () {
  if (!this.checklist?.length) return 0;
  const completed = this.checklist.filter((i) => i.completed).length;
  return Math.round((completed / this.checklist.length) * 100);
});

taskSchema.virtual("isOverdue").get(function () {
  return (
    this.dueDate &&
    new Date(this.dueDate) < new Date() &&
    this.status !== "completed"
  );
});

taskSchema.methods.addActivity = function (
  action,
  description,
  userId,
  changes = {},
) {
  this.activityLog.push({ action, description, performedBy: userId, changes });
};

taskSchema.pre("save", async function () {
  if (!this.isNew) {
    if (this.isModified("boardColumn")) {
      this.status = this.boardColumn;
    }

    if (this.isModified("status")) {
      this.boardColumn = this.status;
    }
  }

  if (
    this.isModified("status") &&
    this.status === "completed" &&
    !this.completedAt
  ) {
    this.completedAt = new Date();
  }

  if (this.isNew && this.boardColumn && !this.boardOrder) {
    const lastTask = await mongoose
      .model("Task")
      .findOne({
        project: this.project,
        boardColumn: this.boardColumn,
      })
      .sort({ boardOrder: -1 });
    this.boardOrder = lastTask ? lastTask.boardOrder + 1 : 0;
  }
});

export default mongoose.model("Task", taskSchema);
