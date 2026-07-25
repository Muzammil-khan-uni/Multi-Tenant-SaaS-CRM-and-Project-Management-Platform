import Project from "../models/Project.js";
import Task from "../models/Task.js";
import Client from "../models/Client.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { sendRealTimeNotification } from "../websocket/socketManager.js";
import { AppError, asyncHandler } from "../middleware/errorHandler.js";

export const getProjects = asyncHandler(async (req, res) => {
  const { status, client, priority, search } = req.query;
  const filter = { workspace: req.workspace._id, isArchived: false };

  if (status) filter.status = status;
  if (client) filter.client = client;
  if (priority) filter.priority = priority;
  if (search) {
    const searchRegex = new RegExp(search, "i");
    filter.$or = [{ name: searchRegex }, { description: searchRegex }];
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const sortField = req.query.sort || "-createdAt";

  const [projects, totalCount] = await Promise.all([
    Project.find(filter)
      .populate("client", "company.name contacts")
      .populate("team.user", "firstName lastName email avatar")
      .sort(sortField)
      .skip(skip)
      .limit(limit),
    Project.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: projects.length,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
    },
    data: projects,
  });
});

export const getProjectById = asyncHandler(async (req, res) => {
  const project = await Project.findOne({
    _id: req.params.id,
    workspace: req.workspace._id,
  })
    .populate("client", "company.name contacts email phone")
    .populate("team.user", "firstName lastName email avatar role")
    .populate("tasks", "title status priority boardColumn dueDate")
    .populate("activityLog.performedBy", "firstName lastName avatar")
    .populate("milestones.completedBy", "firstName lastName");

  if (!project) {
    throw new AppError("Project not found", 404);
  }

  await project.calculateProgress();
  await project.save();

  res.status(200).json({
    success: true,
    data: project,
  });
});

export const createProject = asyncHandler(async (req, res) => {
  const projectData = {
    ...req.body,
    workspace: req.workspace._id,
  };

  if (req.body.team && Array.isArray(req.body.team)) {
    projectData.team = req.body.team.map((member) => ({
      user: member.user,
      role: member.role || "Member",
      hoursAllocated: member.hoursAllocated || 0,
      joinedAt: new Date(),
    }));
  }

  const project = await Project.create(projectData);

  project.addActivity("created", "Project created", req.user._id, {
    projectName: project.name,
  });

  if (project.team && project.team.length > 0) {
    project.addActivity(
      "team_added",
      `${project.team.length} team members assigned`,
      req.user._id,
    );
  }

  await project.save();

  if (project.client) {
    await Client.findByIdAndUpdate(project.client, {
      $push: { projects: project._id },
      $inc: { totalProjects: 1 },
    });
  }

  const populated = await Project.findById(project._id)
    .populate("client", "company.name")
    .populate("team.user", "firstName lastName email");

  if (project.client) {
    const client = await Client.findById(project.client);

    if (client?.assignedTo) {
      const assignedUserId = client.assignedTo._id || client.assignedTo;
      if (assignedUserId.toString() !== req.user._id.toString()) {
        try {
          const notification = await Notification.create({
            workspace: req.workspace._id,
            recipient: assignedUserId,
            sender: req.user._id,
            type: "project_assignment",
            title: "New Project for Your Client",
            message: `Project "${project.name}" has been created for ${client.company?.name || "a client"}`,
            metadata: { projectId: project._id, clientId: project.client },
          });

          sendRealTimeNotification(assignedUserId.toString(), {
            id: notification._id,
            type: "project_assignment",
            title: "New Project for Your Client",
            message: `Project "${project.name}" has been created for ${client.company?.name || "a client"}`,
            metadata: { projectId: project._id },
            sender: {
              id: req.user._id,
              firstName: req.user.firstName,
              lastName: req.user.lastName,
            },
            read: false,
          });
        } catch (error) {
          console.error("Client project notification failed:", error);
        }
      }
    }
  }

  if (project.team && project.team.length > 0) {
    for (const member of project.team) {
      const userId = member.user?._id || member.user;
      if (userId) {
        try {
          const notification = await Notification.create({
            workspace: req.workspace._id,
            recipient: userId,
            sender: req.user._id,
            type: "project_assignment",
            title: "Added to New Project",
            message: `You've been added to project: "${project.name}"${project.client?.company?.name ? ` for ${project.client.company.name}` : ""}`,
            metadata: { projectId: project._id },
          });

          sendRealTimeNotification(userId.toString(), {
            id: notification._id,
            type: "project_assignment",
            title: "Added to New Project",
            message: `You've been added to project: "${project.name}"${project.client?.company?.name ? ` for ${project.client.company.name}` : ""}`,
            metadata: { projectId: project._id },
            sender: {
              id: req.user._id,
              firstName: req.user.firstName,
              lastName: req.user.lastName,
            },
            read: false,
          });
        } catch (error) {
          console.error("Team member project notification failed:", error);
        }
      }
    }
  }

  res
    .status(201)
    .json({ success: true, message: "Project created", data: populated });
});

export const updateProject = asyncHandler(async (req, res) => {
  const project = await Project.findOne({
    _id: req.params.id,
    workspace: req.workspace._id,
  });
  if (!project) throw new AppError("Project not found", 404);

  const changes = [];
  const oldStatus = project.status;
  const oldPriority = project.priority;
  const oldName = project.name;

  const allowedFields = [
    "name",
    "description",
    "status",
    "priority",
    "type",
    "tags",
    "labels",
  ];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined && req.body[field] !== "") {
      if (project[field] !== req.body[field]) {
        changes.push({
          field,
          oldValue: project[field],
          newValue: req.body[field],
        });
      }
      project[field] = req.body[field];
    }
  });

  if (req.body.timeline) {
    if (req.body.timeline.deadline) {
      const oldDeadline = project.timeline?.deadline;
      const newDeadline = req.body.timeline.deadline;
      if (oldDeadline?.toString() !== newDeadline) {
        changes.push({
          field: "deadline",
          oldValue: oldDeadline,
          newValue: newDeadline,
        });
      }
    }
    if (req.body.timeline.estimatedHours) {
      const oldHours = project.timeline?.estimatedHours;
      const newHours = req.body.timeline.estimatedHours;
      if (oldHours !== newHours) {
        changes.push({
          field: "estimatedHours",
          oldValue: oldHours,
          newValue: newHours,
        });
      }
    }
    project.timeline = {
      ...project.timeline?.toObject(),
      ...req.body.timeline,
    };
    project.markModified("timeline");
  }

  if (req.body.budget) {
    if (
      req.body.budget.estimated !== undefined &&
      project.budget?.estimated !== req.body.budget.estimated
    ) {
      changes.push({
        field: "budget",
        oldValue: project.budget?.estimated,
        newValue: req.body.budget.estimated,
      });
    }
    project.budget = { ...project.budget?.toObject(), ...req.body.budget };
    project.markModified("budget");
  }

  if (req.body.status === "completed") {
    project.timeline = {
      ...project.timeline?.toObject(),
      completedAt: new Date(),
    };
    project.markModified("timeline");
  }

  await project.save();

  if (changes.length > 0) {
    const changeMessages = changes.map((c) => {
      switch (c.field) {
        case "name":
          return `Project renamed to "${c.newValue}"`;
        case "status":
          return `Status: ${c.oldValue} → ${c.newValue}`;
        case "priority":
          return `Priority: ${c.oldValue} → ${c.newValue}`;
        case "deadline":
          return `Deadline has been updated`;
        case "estimatedHours":
          return `Estimated hours changed to ${c.newValue}`;
        case "budget":
          return `Budget updated`;
        default:
          return `${c.field} was updated`;
      }
    });

    const notificationTitle =
      changes.length === 1
        ? `Project ${changes[0].field === "name" ? "Renamed" : changes[0].field === "status" ? "Status Updated" : changes[0].field === "priority" ? "Priority Changed" : "Updated"}`
        : "Project Updated";

    const notificationMessage = `"${oldName}": ${changeMessages.join(" | ")}`;

    for (const member of project.team) {
      const userId = member.user?._id || member.user;
      if (userId) {
        try {
          const notification = await Notification.create({
            workspace: req.workspace._id,
            recipient: userId,
            sender: req.user._id,
            type: "project_update",
            title: notificationTitle,
            message: notificationMessage,
            metadata: { projectId: project._id, changes },
          });

          sendRealTimeNotification(userId.toString(), {
            id: notification._id,
            type: "project_update",
            title: notificationTitle,
            message: notificationMessage,
            metadata: { projectId: project._id },
            sender: {
              id: req.user._id,
              firstName: req.user.firstName,
              lastName: req.user.lastName,
            },
            read: false,
          });
        } catch (error) {
          console.error("Project update notification failed:", error);
        }
      }
    }

    if (project.client) {
      try {
        const client = await Client.findById(project.client).select(
          "assignedTo company",
        );
        if (client?.assignedTo) {
          const notification = await Notification.create({
            workspace: req.workspace._id,
            recipient: client.assignedTo,
            sender: req.user._id,
            type: "project_update",
            title: notificationTitle,
            message: `Project "${project.name}" for ${client.company?.name || "client"}: ${changeMessages.join(" | ")}`,
            metadata: { projectId: project._id },
          });

          sendRealTimeNotification(client.assignedTo.toString(), {
            id: notification._id,
            type: "project_update",
            title: notificationTitle,
            message: `Project "${project.name}" for ${client.company?.name || "client"}: ${changeMessages.join(" | ")}`,
            metadata: { projectId: project._id },
            sender: {
              id: req.user._id,
              firstName: req.user.firstName,
              lastName: req.user.lastName,
            },
            read: false,
          });
        }
      } catch (error) {
        console.error("Client notification failed:", error);
      }
    }
  }

  const updated = await Project.findById(project._id)
    .populate("client", "company.name contacts")
    .populate("team.user", "firstName lastName email avatar");

  res
    .status(200)
    .json({ success: true, message: "Project updated", data: updated });
});

export const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findOne({
    _id: req.params.id,
    workspace: req.workspace._id,
  });

  if (!project) {
    throw new AppError("Project not found", 404);
  }

  if (project.client) {
    await Client.findByIdAndUpdate(project.client, {
      $pull: { projects: project._id },
      $inc: { totalProjects: -1 },
    });
  }

  await Task.deleteMany({ project: project._id });

  await Project.findByIdAndDelete(project._id);

  res.status(200).json({
    success: true,
    message: "Project permanently deleted",
  });
});

export const addTeamMember = asyncHandler(async (req, res) => {
  const project = await Project.findOne({
    _id: req.params.id,
    workspace: req.workspace._id,
  });

  if (!project) throw new AppError("Project not found", 404);

  const exists = project.team.find((t) => t.user.toString() === req.body.user);
  if (exists) throw new AppError("User already in team", 400);

  project.team.push({
    user: req.body.user,
    role: req.body.role || "Member",
    hoursAllocated: req.body.hoursAllocated || 0,
  });

  project.addActivity("team_added", "Team member added", req.user._id);
  await project.save();

  if (req.body.user) {
    try {
      const notification = await Notification.create({
        workspace: req.workspace._id,
        recipient: req.body.user,
        sender: req.user._id,
        type: "project_assignment",
        title: "Added to Project",
        message: `You've been added to project: "${project.name}"`,
        metadata: { projectId: project._id },
      });

      sendRealTimeNotification(req.body.user.toString(), {
        id: notification._id,
        type: "project_assignment",
        title: "Added to Project",
        message: `You've been added to project: "${project.name}"`,
        metadata: { projectId: project._id },
        sender: {
          id: req.user._id,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
        },
        read: false,
      });
    } catch (error) {
      console.error("Add member notification failed:", error);
    }
  }

  if (project.client) {
    const client = await Client.findById(project.client).select("assignedTo");
    if (
      client?.assignedTo &&
      client.assignedTo.toString() !== req.user._id.toString() &&
      client.assignedTo.toString() !== req.body.user.toString()
    ) {
      try {
        const newMember = await User.findById(req.body.user).select(
          "firstName lastName",
        );
        const notification = await Notification.create({
          workspace: req.workspace._id,
          recipient: client.assignedTo,
          sender: req.user._id,
          type: "project_update",
          title: "Team Member Added",
          message: `${newMember?.firstName || "A new member"} joined project "${project.name}"`,
          metadata: { projectId: project._id },
        });

        sendRealTimeNotification(client.assignedTo.toString(), {
          id: notification._id,
          type: "project_update",
          title: "Team Member Added",
          message: `${newMember?.firstName || "A new member"} joined project "${project.name}"`,
          metadata: { projectId: project._id },
          sender: {
            id: req.user._id,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
          },
          read: false,
        });
      } catch (error) {
        console.error("Client team update notification failed:", error);
      }
    }
  }

  const updated = await Project.findById(project._id).populate(
    "team.user",
    "firstName lastName email avatar",
  );

  res.status(200).json({ success: true, data: updated.team });
});

export const removeTeamMember = asyncHandler(async (req, res) => {
  const project = await Project.findOneAndUpdate(
    { _id: req.params.id, workspace: req.workspace._id },
    { $pull: { team: { user: req.params.userId } } },
    { new: true },
  ).populate("team.user", "firstName lastName email avatar");

  if (!project) throw new AppError("Project not found", 404);

  project.addActivity("team_removed", "Team member removed", req.user._id);
  await project.save();

  try {
    const removedUser = await User.findById(req.params.userId).select(
      "firstName lastName",
    );
    const notification = await Notification.create({
      workspace: req.workspace._id,
      recipient: req.params.userId,
      sender: req.user._id,
      type: "project_update",
      title: "Removed from Project",
      message: `You've been removed from project: "${project.name}"`,
      metadata: { projectId: project._id },
    });

    sendRealTimeNotification(req.params.userId.toString(), {
      id: notification._id,
      type: "project_update",
      title: "Removed from Project",
      message: `You've been removed from project: "${project.name}"`,
      metadata: { projectId: project._id },
      sender: {
        id: req.user._id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
      },
      read: false,
    });
  } catch (error) {
    console.error("Remove member notification failed:", error);
  }

  for (const member of project.team) {
    const userId = member.user?._id || member.user;
    if (userId) {
      try {
        const removedUser = await User.findById(req.params.userId).select(
          "firstName lastName",
        );
        const notification = await Notification.create({
          workspace: req.workspace._id,
          recipient: userId,
          sender: req.user._id,
          type: "project_update",
          title: "Team Member Removed",
          message: `${removedUser?.firstName || "A member"} was removed from project "${project.name}"`,
          metadata: { projectId: project._id },
        });

        sendRealTimeNotification(userId.toString(), {
          id: notification._id,
          type: "project_update",
          title: "Team Member Removed",
          message: `${removedUser?.firstName || "A member"} was removed from project "${project.name}"`,
          metadata: { projectId: project._id },
          sender: {
            id: req.user._id,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
          },
          read: false,
        });
      } catch (error) {
        console.error("Team update notification failed:", error);
      }
    }
  }

  res.status(200).json({ success: true, data: project.team });
});

export const addMilestone = asyncHandler(async (req, res) => {
  const project = await Project.findOne({
    _id: req.params.id,
    workspace: req.workspace._id,
  });

  if (!project) throw new AppError("Project not found", 404);

  project.milestones.push(req.body);
  project.addActivity(
    "milestone_added",
    `Milestone "${req.body.title}" added`,
    req.user._id,
  );
  await project.save();

  res.status(200).json({ success: true, data: project.milestones });
});

export const updateMilestoneStatus = asyncHandler(async (req, res) => {
  const project = await Project.findOneAndUpdate(
    {
      _id: req.params.id,
      workspace: req.workspace._id,
      "milestones._id": req.params.milestoneId,
    },
    {
      $set: {
        "milestones.$.status": req.body.status,
        "milestones.$.completedAt":
          req.body.status === "completed" ? new Date() : null,
        "milestones.$.completedBy":
          req.body.status === "completed" ? req.user._id : null,
      },
    },
    { new: true },
  );

  if (!project) throw new AppError("Project or milestone not found", 404);

  res.status(200).json({ success: true, data: project.milestones });
});

export const getProjectStats = asyncHandler(async (req, res) => {
  const workspaceFilter = { workspace: req.workspace._id, isArchived: false };

  const [
    totalProjects,
    activeProjects,
    completedProjects,
    planningProjects,
    onHoldProjects,
    totalBudgetResult,
    avgProgressResult,
  ] = await Promise.all([
    Project.countDocuments(workspaceFilter),
    Project.countDocuments({ ...workspaceFilter, status: "active" }),
    Project.countDocuments({ ...workspaceFilter, status: "completed" }),
    Project.countDocuments({ ...workspaceFilter, status: "planning" }),
    Project.countDocuments({ ...workspaceFilter, status: "on_hold" }),
    Project.aggregate([
      { $match: workspaceFilter },
      { $group: { _id: null, total: { $sum: "$budget.estimated" } } },
    ]),
    Project.aggregate([
      { $match: workspaceFilter },
      { $group: { _id: null, avg: { $avg: "$progress" } } },
    ]),
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalProjects,
      activeProjects,
      completedProjects,
      planningProjects,
      onHoldProjects,
      totalBudget: totalBudgetResult[0]?.total || 0,
      avgProgress: Math.round(avgProgressResult[0]?.avg || 0),
    },
  });
});
