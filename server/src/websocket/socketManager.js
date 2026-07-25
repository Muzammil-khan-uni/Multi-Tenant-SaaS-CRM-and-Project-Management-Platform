import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Workspace from "../models/Workspace.js";
import Notification from "../models/Notification.js";

const connectedUsers = new Map();
const chatRooms = new Map();
let ioInstance = null;

export const setupWebSocket = (io) => {
  ioInstance = io;

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error("Authentication required"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select(
        "firstName lastName email avatar workspaceMemberships isActive",
      );

      if (!user) return next(new Error("User not found"));
      if (!user.isActive) return next(new Error("Account deactivated"));

      const workspaceSlug = socket.handshake.auth.workspaceSlug;
      let workspace = null;
      let membership = null;

      if (workspaceSlug) {
        workspace = await Workspace.findOne({
          slug: workspaceSlug.toLowerCase(),
          isActive: true,
        });
        if (workspace) {
          membership = user.getMembership(workspace._id);
        }
      }

      if (!workspace && user.workspaceMemberships?.length > 0) {
        const firstActiveMembership = user.workspaceMemberships.find(
          (m) => m.isActive,
        );
        if (firstActiveMembership) {
          workspace = await Workspace.findById(firstActiveMembership.workspace);
          membership = firstActiveMembership;
        }
      }

      if (!workspace || !membership) {
        return next(new Error("No active workspace membership found"));
      }

      socket.userId = user._id.toString();
      socket.workspaceId = workspace._id.toString();
      socket.userData = {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatar: user.avatar?.url,
        role: membership.role,
      };

      next();
    } catch (error) {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.userId;
    const workspaceId = socket.workspaceId;

    console.log(
      `🟢 User connected: ${socket.userData.firstName} (${userId}) → workspace:${workspaceId}`,
    );

    connectedUsers.set(userId, {
      socketId: socket.id,
      user: socket.userData,
      status: "online",
      lastSeen: new Date(),
    });

    // Join workspace and personal rooms
    socket.join(`workspace:${workspaceId}`);
    socket.join(`user:${userId}`);

    broadcastOnlineUsers(workspaceId);

    socket.on("notification:send", async (data) => {
      const { recipientId, type, title, message, metadata } = data;

      try {
        await Notification.create({
          workspace: workspaceId,
          recipient: recipientId,
          sender: userId,
          type: type || "info",
          title,
          message,
          metadata: metadata || {},
        });
      } catch (error) {
        console.error("[Socket] Failed to save notification:", error);
      }

      io.to(`user:${recipientId}`).emit("notification:received", {
        type: type || "info",
        title,
        message,
        metadata: metadata || {},
        sender: socket.userData,
        timestamp: new Date(),
      });
    });

    socket.on("task:assign", (data) => {
      const { taskId, taskTitle, assignedTo, projectName } = data;

      assignedTo.forEach((assignUserId) => {
        io.to(`user:${assignUserId}`).emit("task:assigned", {
          taskId,
          taskTitle,
          projectName,
          assignedBy: socket.userData,
          timestamp: new Date(),
        });

        io.to(`user:${assignUserId}`).emit("notification:received", {
          type: "task_assigned",
          title: "New Task Assigned",
          message: `You've been assigned to: "${taskTitle}"${projectName ? ` in ${projectName}` : ""}`,
          metadata: { taskId },
          sender: socket.userData,
          timestamp: new Date(),
        });
      });

      socket.to(`workspace:${workspaceId}`).emit("task:assigned", {
        taskId,
        taskTitle,
        assignedTo,
        assignedBy: socket.userData,
        timestamp: new Date(),
      });
    });

    socket.on("project:update", (data) => {
      socket.to(`workspace:${workspaceId}`).emit("project:updated", {
        ...data,
        updatedBy: socket.userData,
        timestamp: new Date(),
      });
    });

    socket.on("project:statusChange", (data) => {
      socket.to(`workspace:${workspaceId}`).emit("project:statusChanged", {
        ...data,
        changedBy: socket.userData,
        timestamp: new Date(),
      });
    });

    socket.on("project:memberAdded", (data) => {
      const { projectId, projectName, userId: addedUserId } = data;
      io.to(`user:${addedUserId}`).emit("notification:received", {
        type: "project_assignment",
        title: "Added to Project",
        message: `You've been added to project: "${projectName}"`,
        metadata: { projectId },
        sender: socket.userData,
        timestamp: new Date(),
      });
      socket.to(`workspace:${workspaceId}`).emit("project:memberAdded", {
        ...data,
        addedBy: socket.userData,
      });
    });

    socket.on("chat:join", (roomId) => {
      socket.join(`chat:${roomId}`);
      if (!chatRooms.has(roomId)) chatRooms.set(roomId, new Set());
      chatRooms.get(roomId).add(userId);
      io.to(`chat:${roomId}`).emit("chat:userJoined", {
        userId,
        user: socket.userData,
        timestamp: new Date(),
      });
    });

    socket.on("chat:leave", (roomId) => {
      socket.leave(`chat:${roomId}`);
      if (chatRooms.has(roomId)) chatRooms.get(roomId).delete(userId);
      io.to(`chat:${roomId}`).emit("chat:userLeft", {
        userId,
        user: socket.userData,
        timestamp: new Date(),
      });
    });

    socket.on("chat:message", (data) => {
      const { roomId, message, mentions } = data;
      const chatMessage = {
        id: Date.now().toString(),
        roomId,
        message,
        sender: socket.userData,
        timestamp: new Date(),
        mentions: mentions || [],
      };
      io.to(`chat:${roomId}`).emit("chat:newMessage", chatMessage);

      if (mentions?.length > 0) {
        mentions.forEach(async (mentionedUserId) => {
          let savedNotification;
          try {
            savedNotification = await Notification.create({
              workspace: workspaceId,
              recipient: mentionedUserId,
              sender: userId,
              type: "mention",
              title: "You were mentioned",
              message: `${socket.userData.firstName} mentioned you in chat`,
              metadata: { url: `/chat/${roomId}` },
            });
          } catch (error) {
            console.error("Failed to save chat mention notification:", error);
          }

          io.to(`user:${mentionedUserId}`).emit("notification:received", {
            id: savedNotification?._id,
            type: "mention",
            title: "You were mentioned",
            message: `${socket.userData.firstName} mentioned you in chat`,
            metadata: { url: `/chat/${roomId}` },
            sender: socket.userData,
            timestamp: new Date(),
          });
        });
      }
    });

    socket.on("chat:typing", (data) => {
      socket.to(`chat:${data.roomId}`).emit("chat:userTyping", {
        userId,
        userName: `${socket.userData.firstName} ${socket.userData.lastName}`,
        roomId: data.roomId,
        isTyping: data.isTyping,
      });
    });

    socket.on("users:request", () => {
      const onlineUsers = getOnlineUsersInWorkspace(workspaceId);
      socket.emit("users:onlineList", onlineUsers);
    });

    socket.on("comment:add", (data) => {
      const { taskId, comment } = data;
      socket.to(`workspace:${workspaceId}`).emit("comment:new", {
        taskId,
        comment,
        author: socket.userData,
        timestamp: new Date(),
      });

      if (data.notifyUsers?.length > 0) {
        data.notifyUsers.forEach((notifyUserId) => {
          if (notifyUserId !== userId) {
            io.to(`user:${notifyUserId}`).emit("notification:received", {
              type: "comment",
              title: "New Comment",
              message: `${socket.userData.firstName} commented on a task`,
              metadata: { taskId },
              sender: socket.userData,
              timestamp: new Date(),
            });
          }
        });
      }
    });

    socket.on("typing:start", (data) => {
      socket.to(`workspace:${workspaceId}`).emit("typing:userStarted", {
        userId,
        userName: `${socket.userData.firstName} ${socket.userData.lastName}`,
        context: data.context,
        contextId: data.contextId,
      });
    });

    socket.on("typing:stop", (data) => {
      socket.to(`workspace:${workspaceId}`).emit("typing:userStopped", {
        userId,
        context: data.context,
        contextId: data.contextId,
      });
    });

    socket.on("disconnect", () => {
      console.log(
        `🔴 User disconnected: ${socket.userData.firstName} (${userId})`,
      );

      const existing = connectedUsers.get(userId);
      if (existing && existing.socketId === socket.id) {
        connectedUsers.delete(userId);
      }

      chatRooms.forEach((users, roomId) => {
        if (users.has(userId)) {
          users.delete(userId);
          io.to(`chat:${roomId}`).emit("chat:userLeft", {
            userId,
            user: socket.userData,
            timestamp: new Date(),
          });
        }
      });

      broadcastOnlineUsers(workspaceId);
      socket.to(`workspace:${workspaceId}`).emit("user:offline", {
        userId,
        user: socket.userData,
        timestamp: new Date(),
      });
    });

    socket.on("ping", () => {
      socket.emit("pong", { timestamp: new Date() });
    });
  });
};

function getOnlineUsersInWorkspace(workspaceId) {
  const users = [];
  connectedUsers.forEach((userData, userId) => {
    if (userData.status === "online") {
      const socket = ioInstance?.sockets?.sockets?.get(userData.socketId);
      if (socket && socket.workspaceId === workspaceId) {
        users.push({ ...userData.user, status: "online" });
      }
    }
  });
  return users;
}

function broadcastOnlineUsers(workspaceId) {
  const onlineUsers = getOnlineUsersInWorkspace(workspaceId);
  ioInstance
    ?.to(`workspace:${workspaceId}`)
    .emit("users:onlineList", onlineUsers);
}

export const sendNotification = (io, recipientId, notification) => {
  io.to(`user:${recipientId}`).emit("notification:received", {
    ...notification,
    timestamp: new Date(),
  });
};

export const isUserOnline = (userId) => {
  return (
    connectedUsers.has(userId.toString()) &&
    connectedUsers.get(userId.toString()).status === "online"
  );
};

export const getConnectedUsersCount = (workspaceId) => {
  return getOnlineUsersInWorkspace(workspaceId).length;
};

export const sendRealTimeNotification = (userId, notification) => {
  if (ioInstance) {
    ioInstance.to(`user:${userId}`).emit("notification:received", {
      ...notification,
      timestamp: new Date(),
    });
  } else {
    console.warn("[Socket] Socket.io not available for notification");
  }
};
