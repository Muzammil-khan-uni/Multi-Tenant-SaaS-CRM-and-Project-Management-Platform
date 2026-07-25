import { io } from 'socket.io-client';
import { store } from '../store';
import { showNotificationToast } from '../utils/notifications';

const SOCKET_URL = import.meta.env.VITE_WS_URL || 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect() {
    const state = store.getState().auth;
    const token = state.accessToken;
    if (!token) return null;

    const workspaceSlug =
      state.workspace?.slug ||
      localStorage.getItem('workspaceSlug') ||
      undefined;

    if (this.socket) {
      this.socket.auth = { token, workspaceSlug };
      if (!this.socket.connected) this.socket.connect();
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token, workspaceSlug },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.setupDefaultListeners();
    return this.socket;
  }

  updateAuth() {
    if (!this.socket) return;
    const state = store.getState().auth;
    this.socket.auth = {
      token: state.accessToken,
      workspaceSlug:
        state.workspace?.slug ||
        localStorage.getItem('workspaceSlug') ||
        undefined,
    };
  }

  setupDefaultListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('🟢 Socket connected:', this.socket.id);
      this.socket.emit('users:request');
    });

    this.socket.on('disconnect', () => {
      console.log('🔴 Socket disconnected');
    });

    this.socket.on('notification:received', (notification) => {
      console.log('📩 Notification received:', notification);
      showNotificationToast(notification);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }

  onTaskAssigned(callback) {
    this.socket?.on('task:assigned', callback);
    return () => this.socket?.off('task:assigned', callback);
  }

  emitTaskAssign(taskId, taskTitle, assignedTo, projectName) {
    this.socket?.emit('task:assign', {
      taskId,
      taskTitle,
      assignedTo,
      projectName,
    });
  }

  onProjectUpdated(callback) {
    this.socket?.on('project:updated', callback);
    return () => this.socket?.off('project:updated', callback);
  }

  onProjectStatusChanged(callback) {
    this.socket?.on('project:statusChanged', callback);
    return () => this.socket?.off('project:statusChanged', callback);
  }

  emitProjectUpdate(projectId, projectName, action, details) {
    this.socket?.emit('project:update', {
      projectId,
      projectName,
      action,
      details,
    });
  }

  joinChat(roomId) {
    this.socket?.emit('chat:join', roomId);
  }

  leaveChat(roomId) {
    this.socket?.emit('chat:leave', roomId);
  }

  sendMessage(roomId, message, mentions = []) {
    this.socket?.emit('chat:message', { roomId, message, mentions });
  }

  onNewMessage(callback) {
    this.socket?.on('chat:newMessage', callback);
    return () => this.socket?.off('chat:newMessage', callback);
  }

  onUserJoinedChat(callback) {
    this.socket?.on('chat:userJoined', callback);
    return () => this.socket?.off('chat:userJoined', callback);
  }

  onUserLeftChat(callback) {
    this.socket?.on('chat:userLeft', callback);
    return () => this.socket?.off('chat:userLeft', callback);
  }

  emitTyping(roomId, isTyping) {
    this.socket?.emit('chat:typing', { roomId, isTyping });
  }

  onUserTyping(callback) {
    this.socket?.on('chat:userTyping', callback);
    return () => this.socket?.off('chat:userTyping', callback);
  }

  onOnlineUsersUpdate(callback) {
    this.socket?.on('users:onlineList', callback);
    return () => this.socket?.off('users:onlineList', callback);
  }

  onUserOffline(callback) {
    this.socket?.on('user:offline', callback);
    return () => this.socket?.off('user:offline', callback);
  }

  requestOnlineUsers() {
    this.socket?.emit('users:request');
  }

  onNewComment(callback) {
    this.socket?.on('comment:new', callback);
    return () => this.socket?.off('comment:new', callback);
  }

  emitComment(taskId, comment, notifyUsers = []) {
    this.socket?.emit('comment:add', { taskId, comment, notifyUsers });
  }

  onNotification(callback) {
    this.socket?.on('notification:received', callback);
    return () => this.socket?.off('notification:received', callback);
  }

  emitSendNotification(recipientId, type, title, message, metadata = {}) {
    this.socket?.emit('notification:send', {
      recipientId,
      type,
      title,
      message,
      metadata,
    });
  }

  onTypingStarted(callback) {
    this.socket?.on('typing:userStarted', callback);
    return () => this.socket?.off('typing:userStarted', callback);
  }

  onTypingStopped(callback) {
    this.socket?.on('typing:userStopped', callback);
    return () => this.socket?.off('typing:userStopped', callback);
  }

  emitTypingStart(context, contextId) {
    this.socket?.emit('typing:start', { context, contextId });
  }

  emitTypingStop(context, contextId) {
    this.socket?.emit('typing:stop', { context, contextId });
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  removeAllListeners() {
    if (this.socket) this.socket.removeAllListeners();
  }
}

const socketService = new SocketService();
export default socketService;
