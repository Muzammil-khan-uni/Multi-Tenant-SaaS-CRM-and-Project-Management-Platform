import Task from "../models/Task.js";
import Project from "../models/Project.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { sendRealTimeNotification } from "../websocket/socketManager.js";
import { AppError, asyncHandler } from "../middleware/errorHandler.js";

export const getTasks = asyncHandler(async (req, res) => {
  const { status, project, priority, assignedTo, boardColumn, search } =
    req.query;
  const filter = { workspace: req.workspace._id };

  if (status) filter.status = status;
  if (project) filter.project = project;
  if (priority) filter.priority = priority;
  if (boardColumn) filter.boardColumn = boardColumn;
  if (assignedTo) filter["assignedTo.user"] = assignedTo;
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { tags: { $regex: search, $options: "i" } },
    ];
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;

  const [tasks, totalCount] = await Promise.all([
    Task.find(filter)
      .populate("assignedTo.user", "firstName lastName email avatar")
      .populate("createdBy", "firstName lastName avatar")
      .populate("project", "name")
      .populate("comments.author", "firstName lastName avatar")
      .sort(boardColumn ? "boardOrder" : "-createdAt")
      .skip(skip)
      .limit(limit),
    Task.countDocuments(filter),
  ]);

  if (boardColumn) {
    const grouped = { todo: [], in_progress: [], review: [], completed: [] };
    tasks.forEach((task) => {
      if (grouped[task.boardColumn]) grouped[task.boardColumn].push(task);
    });
    return res.status(200).json({ success: true, data: grouped });
  }

  res.status(200).json({
    success: true,
    count: tasks.length,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
    },
    data: tasks,
  });
});

export const getTaskById = asyncHandler(async (req, res) => {
  const task = await Task.findOne({
    _id: req.params.id,
    workspace: req.workspace._id,
  })
    .populate("assignedTo.user", "firstName lastName email avatar")
    .populate("createdBy", "firstName lastName avatar")
    .populate("project", "name")
    .populate("comments.author", "firstName lastName avatar")
    .populate("checklist.completedBy", "firstName lastName")
    .populate("activityLog.performedBy", "firstName lastName avatar")
    .populate("attachments.uploadedBy", "firstName lastName")
    .populate("dependencies.task", "title status")
    .populate("watchers", "firstName lastName email");

  if (!task) throw new AppError("Task not found", 404);

  res.status(200).json({ success: true, data: task });
});

export const createTask = asyncHandler(async (req, res) => {
  req.body.workspace = req.workspace._id;
  req.body.createdBy = req.user._id;

  if (req.body.boardColumn) {
    const lastTask = await Task.findOne({
      project: req.body.project,
      boardColumn: req.body.boardColumn,
    }).sort({ boardOrder: -1 });
    req.body.boardOrder = lastTask ? lastTask.boardOrder + 1 : 0;
  }

  const task = await Task.create(req.body);
  task.addActivity("created", "Task created", req.user._id);
  await task.save();

  if (req.body.project) {
    await Project.findByIdAndUpdate(req.body.project, {
      $push: { tasks: task._id },
    });
  }

  const populated = await Task.findById(task._id)
    .populate("assignedTo.user", "firstName lastName email avatar")
    .populate("createdBy", "firstName lastName avatar")
    .populate("project", "name");

  if (req.body.assignedTo && req.body.assignedTo.length > 0) {
    for (const assignee of req.body.assignedTo) {
      const userId = assignee.user || assignee;
      if (userId) {
        try {
          const notification = await Notification.create({
            workspace: req.workspace._id,
            recipient: userId,
            sender: req.user._id,
            type: "task_assigned",
            title: "New Task Assigned",
            message: `You've been assigned to: "${task.title}"${populated.project ? ` in ${populated.project.name}` : ""}`,
            metadata: { taskId: task._id, projectId: populated.project?._id },
          });

          sendRealTimeNotification(userId.toString(), {
            id: notification._id,
            type: "task_assigned",
            title: "New Task Assigned",
            message: `You've been assigned to: "${task.title}"${populated.project ? ` in ${populated.project.name}` : ""}`,
            metadata: { taskId: task._id, projectId: populated.project?._id },
            sender: {
              id: req.user._id,
              firstName: req.user.firstName,
              lastName: req.user.lastName,
            },
            read: false,
          });

          console.log(`📩 Task assignment notification sent to: ${userId}`);
        } catch (error) {
          console.error("Task assignment notification failed:", error);
        }
      }
    }
  }

  res
    .status(201)
    .json({ success: true, message: "Task created", data: populated });
});

export const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findOne({
    _id: req.params.id,
    workspace: req.workspace._id,
  });
  if (!task) throw new AppError("Task not found", 404);

  const oldStatus = task.status;
  const oldPriority = task.priority;
  const changes = [];

  const allowedFields = [
    "title",
    "description",
    "status",
    "priority",
    "type",
    "dueDate",
    "startDate",
    "estimatedHours",
    "tags",
    "labels",
    "boardColumn",
    "boardOrder",
  ];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined && task[field] !== req.body[field]) {
      changes.push({ field, oldValue: task[field], newValue: req.body[field] });
      task[field] = req.body[field];
    }
  });

  if (req.body.status === "completed") task.completedAt = new Date();

  await task.save();

  if (changes.length > 0) {
    const changeMessages = changes.map((c) => {
      switch (c.field) {
        case "title":
          return `Title updated`;
        case "status":
          return `Status: ${c.oldValue?.replace("_", " ")} → ${c.newValue?.replace("_", " ")}`;
        case "priority":
          return `Priority: ${c.oldValue} → ${c.newValue}`;
        case "dueDate":
          return `Due date updated`;
        case "estimatedHours":
          return `Estimated hours: ${c.newValue}h`;
        case "boardColumn":
          return `Moved to ${c.newValue?.replace("_", " ")}`;
        default:
          return `${c.field} updated`;
      }
    });

    const title =
      changes.length === 1 && changes[0].field === "status"
        ? "Task Status Updated"
        : changes.length === 1 && changes[0].field === "priority"
          ? "Task Priority Changed"
          : "Task Updated";

    const message = `"${task.title}": ${changeMessages.join(" | ")}`;

    for (const assignee of task.assignedTo) {
      const userId = assignee.user?._id || assignee.user;
      if (userId) {
        try {
          const notification = await Notification.create({
            workspace: req.workspace._id,
            recipient: userId,
            sender: req.user._id,
            type: "task_updated",
            title,
            message,
            metadata: { taskId: task._id, changes },
          });

          sendRealTimeNotification(userId.toString(), {
            id: notification._id,
            type: "task_updated",
            title,
            message,
            metadata: { taskId: task._id },
            sender: {
              id: req.user._id,
              firstName: req.user.firstName,
              lastName: req.user.lastName,
            },
            read: false,
          });
        } catch (error) {
          console.error("Task update notification failed:", error);
        }
      }
    }
  }

  const updated = await Task.findById(task._id)
    .populate("assignedTo.user", "firstName lastName email avatar")
    .populate("createdBy", "firstName lastName avatar")
    .populate("project", "name");

  res
    .status(200)
    .json({ success: true, message: "Task updated", data: updated });
});

export const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findOneAndDelete({
    _id: req.params.id,
    workspace: req.workspace._id,
  });
  if (!task) throw new AppError("Task not found", 404);

  if (task.project) {
    await Project.findByIdAndUpdate(task.project, {
      $pull: { tasks: task._id },
    });
  }

  res.status(200).json({ success: true, message: "Task deleted permanently" });
});

export const assignTask = asyncHandler(async (req, res) => {
  const task = await Task.findOne({
    _id: req.params.id,
    workspace: req.workspace._id,
  });
  if (!task) throw new AppError("Task not found", 404);

  const { userIds } = req.body;
  const assignees = userIds.map((userId) => ({
    user: userId,
    assignedBy: req.user._id,
  }));
  task.assignedTo = assignees;
  task.addActivity("assigned", "Users assigned to task", req.user._id);
  await task.save();

  for (const userId of userIds) {
    if (userId) {
      try {
        const notification = await Notification.create({
          workspace: req.workspace._id,
          recipient: userId,
          sender: req.user._id,
          type: "task_assigned",
          title: "Task Assigned to You",
          message: `You've been assigned to: "${task.title}"`,
          metadata: { taskId: task._id },
        });

        sendRealTimeNotification(userId.toString(), {
          id: notification._id,
          type: "task_assigned",
          title: "Task Assigned to You",
          message: `You've been assigned to: "${task.title}"`,
          metadata: { taskId: task._id },
          sender: {
            id: req.user._id,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
          },
          read: false,
        });
      } catch (error) {
        console.error("Assign notification failed:", error);
      }
    }
  }

  const updated = await Task.findById(task._id).populate(
    "assignedTo.user",
    "firstName lastName email avatar",
  );
  res.status(200).json({ success: true, data: updated.assignedTo });
});

export const addComment = asyncHandler(async (req, res) => {
  const task = await Task.findOne({
    _id: req.params.id,
    workspace: req.workspace._id,
  });
  if (!task) throw new AppError("Task not found", 404);

  const comment = {
    content: req.body.content,
    author: req.user._id,
    mentions: req.body.mentions || [],
  };
  task.comments.push(comment);
  task.addActivity("comment_added", "Comment added", req.user._id);
  await task.save();

  const updated = await Task.findById(task._id).populate(
    "comments.author",
    "firstName lastName avatar",
  );

  for (const assignee of task.assignedTo) {
    const userId = assignee.user?._id || assignee.user;
    if (userId && userId.toString() !== req.user._id.toString()) {
      try {
        const notification = await Notification.create({
          workspace: req.workspace._id,
          recipient: userId,
          sender: req.user._id,
          type: "comment",
          title: "New Comment on Task",
          message: `${req.user.firstName} ${req.user.lastName} commented on "${task.title}"`,
          metadata: { taskId: task._id, commentId: comment._id },
        });

        sendRealTimeNotification(userId.toString(), {
          id: notification._id,
          type: "comment",
          title: "New Comment on Task",
          message: `${req.user.firstName} ${req.user.lastName} commented on "${task.title}"`,
          metadata: { taskId: task._id },
          sender: {
            id: req.user._id,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
          },
          read: false,
        });
      } catch (error) {
        console.error("Comment notification failed:", error);
      }
    }
  }

  if (req.body.mentions && req.body.mentions.length > 0) {
    for (const mentionedUserId of req.body.mentions) {
      if (mentionedUserId !== req.user._id.toString()) {
        try {
          const notification = await Notification.create({
            workspace: req.workspace._id,
            recipient: mentionedUserId,
            sender: req.user._id,
            type: "mention",
            title: "You Were Mentioned",
            message: `${req.user.firstName} ${req.user.lastName} mentioned you in a comment on "${task.title}"`,
            metadata: { taskId: task._id },
          });

          sendRealTimeNotification(mentionedUserId.toString(), {
            id: notification._id,
            type: "mention",
            title: "You Were Mentioned",
            message: `${req.user.firstName} ${req.user.lastName} mentioned you in a comment on "${task.title}"`,
            metadata: { taskId: task._id },
            sender: {
              id: req.user._id,
              firstName: req.user.firstName,
              lastName: req.user.lastName,
            },
            read: false,
          });
        } catch (error) {
          console.error("Mention notification failed:", error);
        }
      }
    }
  }

  res.status(200).json({ success: true, data: updated.comments });
});

export const deleteComment = asyncHandler(async (req, res) => {
  const task = await Task.findOne({
    _id: req.params.id,
    workspace: req.workspace._id,
  });
  if (!task) throw new AppError("Task not found", 404);

  task.comments = task.comments.filter(
    (c) => c._id.toString() !== req.params.commentId,
  );
  await task.save();

  res
    .status(200)
    .json({ success: true, message: "Comment deleted", data: task.comments });
});

export const addChecklistItem = asyncHandler(async (req, res) => {
  const task = await Task.findOne({
    _id: req.params.id,
    workspace: req.workspace._id,
  });
  if (!task) throw new AppError("Task not found", 404);

  task.checklist.push({ title: req.body.title, order: task.checklist.length });
  task.addActivity(
    "checklist_added",
    `Checklist item added: "${req.body.title}"`,
    req.user._id,
  );
  await task.save();

  res.status(200).json({ success: true, data: task.checklist });
});

export const toggleChecklistItem = asyncHandler(async (req, res) => {
  const task = await Task.findOneAndUpdate(
    {
      _id: req.params.id,
      workspace: req.workspace._id,
      "checklist._id": req.params.itemId,
    },
    {
      $set: {
        "checklist.$.completed": req.body.completed,
        "checklist.$.completedBy": req.body.completed ? req.user._id : null,
        "checklist.$.completedAt": req.body.completed ? new Date() : null,
      },
    },
    { new: true },
  );
  if (!task) throw new AppError("Task not found", 404);

  res.status(200).json({ success: true, data: task.checklist });
});

export const deleteChecklistItem = asyncHandler(async (req, res) => {
  const task = await Task.findOne({
    _id: req.params.id,
    workspace: req.workspace._id,
  });
  if (!task) throw new AppError("Task not found", 404);

  task.checklist = task.checklist.filter(
    (c) => c._id.toString() !== req.params.itemId,
  );
  await task.save();

  res.status(200).json({ success: true, data: task.checklist });
});

export const addAttachment = asyncHandler(async (req, res) => {
  const task = await Task.findOne({
    _id: req.params.id,
    workspace: req.workspace._id,
  });

  if (!task) {
    throw new AppError("Task not found", 404);
  }

  const attachment = {
    name: req.body.name || req.body.originalName || "file",
    url: req.body.url,
    publicId: req.body.publicId,
    type: req.body.type || req.body.mimetype || "application/octet-stream",
    size: req.body.size || 0,
    uploadedBy: req.user._id,
    uploadedAt: new Date(),
  };

  task.attachments.push(attachment);
  task.addActivity(
    "attachment_added",
    `File attached: "${attachment.name}"`,
    req.user._id,
  );
  await task.save();

  res.status(200).json({
    success: true,
    message: "File attached successfully",
    data: task.attachments,
  });
});

export const deleteAttachment = asyncHandler(async (req, res) => {
  const task = await Task.findOne({
    _id: req.params.id,
    workspace: req.workspace._id,
  });
  if (!task) throw new AppError("Task not found", 404);

  task.attachments = task.attachments.filter(
    (a) => a._id.toString() !== req.params.attachmentId,
  );
  await task.save();

  res.status(200).json({ success: true, data: task.attachments });
});

export const updateTaskBoard = asyncHandler(async (req, res) => {
  const { boardColumn, boardOrder } = req.body;

  const task = await Task.findOne({
    _id: req.params.id,
    workspace: req.workspace._id,
  });

  if (!task) {
    throw new AppError("Task not found", 404);
  }

  const oldColumn = task.boardColumn;

  if (boardColumn) {
    task.boardColumn = boardColumn;
  }

  if (boardOrder !== undefined) {
    task.boardOrder = boardOrder;
  }

  if (oldColumn !== boardColumn) {
    const columnNames = {
      todo: "To Do",
      in_progress: "In Progress",
      review: "Review",
      completed: "Completed",
    };
    task.addActivity(
      "board_moved",
      `Moved from ${columnNames[oldColumn] || oldColumn} to ${columnNames[boardColumn] || boardColumn}`,
      req.user._id,
    );
  }

  await task.save();

  const updated = await Task.findById(task._id)
    .populate("assignedTo.user", "firstName lastName email avatar")
    .populate("project", "name");

  res.status(200).json({
    success: true,
    message: "Task position updated",
    data: updated,
  });
});
