import { useState, useEffect, useCallback } from 'react';
import socketService from '../services/socketManager';
import axios from '../api/axios';

export const useTeamChat = (roomId) => {
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentRoomId, setCurrentRoomId] = useState(roomId);

  if (currentRoomId !== roomId) {
    setCurrentRoomId(roomId);
    setMessages([]);
    setError(null);
  }

  const loadMessages = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    try {
      const { data } = await axios.get(`/chat/${roomId}?limit=50`);
      if (data.success && Array.isArray(data.data)) {
        const formattedMessages = data.data.map((msg) => ({
          id: msg._id,
          message: msg.message,
          sender: msg.sender || { firstName: 'Unknown' },
          timestamp: msg.createdAt,
          mentions: msg.mentions || [],
          replyTo: msg.replyTo
            ? {
                id: msg.replyTo._id || msg.replyTo,
                message: msg.replyTo.message || 'Original message',
                sender: msg.replyTo.sender
                  ? {
                      id: msg.replyTo.sender._id || msg.replyTo.sender,
                      firstName: msg.replyTo.sender.firstName || 'User',
                    }
                  : { firstName: 'User' },
              }
            : null,

          reactions: (msg.reactions || []).map((r) => ({
            emoji: r.emoji,
            user: r.user
              ? {
                  id: r.user._id || r.user,
                  firstName: r.user.firstName || 'User',
                  lastName: r.user.lastName || '',
                }
              : { firstName: 'User' },
          })),
          isEdited: msg.isEdited || false,
          type: msg.type || 'text',
        }));
        setMessages(formattedMessages);
      }
    } catch (err) {
      console.error('Failed to load chat messages:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  const [initialLoadDone, setInitialLoadDone] = useState(false);

  if (roomId && !initialLoadDone) {
    setInitialLoadDone(true);
    Promise.resolve().then(loadMessages);
  }

  if (currentRoomId !== roomId && initialLoadDone) {
    setInitialLoadDone(false);
  }

  useEffect(() => {
    if (!roomId) return;

    socketService.joinChat(roomId);

    const cleanup1 = socketService.onNewMessage((msg) => {
      setMessages((prev) => {
        const isDuplicate = prev.some(
          (m) =>
            m.message === msg.message &&
            (m.sender?.id || m.sender?._id) ===
              (msg.sender?.id || msg.sender?._id) &&
            Math.abs(
              new Date(m.timestamp || m.createdAt) -
                new Date(msg.timestamp || msg.createdAt)
            ) < 2000
        );

        if (isDuplicate) {
          console.log('Duplicate message detected, skipping');
          return prev;
        }

        return [
          ...prev,
          {
            id: msg.id || msg._id || Date.now().toString(),
            message: msg.message,
            sender: msg.sender || { firstName: 'Unknown' },
            timestamp: msg.timestamp || new Date().toISOString(),
            mentions: msg.mentions || [],
            replyTo: msg.replyTo || null,
            reactions: (msg.reactions || []).map((r) => ({
              emoji: r.emoji,
              user: r.user || { firstName: 'User' },
            })),
            isEdited: msg.isEdited || false,
            type: msg.type || 'text',
          },
        ];
      });
    });

    const cleanup2 = socketService.onUserJoinedChat(({ userId, user }) => {
      setOnlineUsers((prev) => {
        const exists = prev.find((u) => u.id === userId);
        if (exists) return prev;
        return [...prev, { ...user, id: userId }];
      });
    });

    const cleanup3 = socketService.onUserLeftChat(({ userId }) => {
      setOnlineUsers((prev) => prev.filter((u) => u.id !== userId));
    });

    const cleanup4 = socketService.onUserTyping(
      ({ userId, userName, isTyping }) => {
        setTypingUsers((prev) => {
          const next = new Map(prev);
          if (isTyping) {
            next.set(userId, userName);
            setTimeout(() => {
              setTypingUsers((current) => {
                const updated = new Map(current);
                updated.delete(userId);
                return updated;
              });
            }, 3000);
          } else {
            next.delete(userId);
          }
          return next;
        });
      }
    );

    if (socketService.isConnected()) {
      socketService.requestOnlineUsers();
    }

    const cleanup5 = socketService.onOnlineUsersUpdate((users) => {
      setOnlineUsers(users || []);
    });

    return () => {
      socketService.leaveChat(roomId);
      cleanup1();
      cleanup2();
      cleanup3();
      cleanup4();
      cleanup5();
    };
  }, [roomId]);

  const sendMessage = useCallback(
    (message, mentions = []) => {
      if (!roomId || !message.trim()) return;
      socketService.sendMessage(roomId, message, mentions);
    },
    [roomId]
  );

  const sendTyping = useCallback(
    (isTyping) => {
      if (!roomId) return;
      socketService.emitTyping(roomId, isTyping);
    },
    [roomId]
  );

  const deleteMessage = useCallback((messageId) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  }, []);

  const editMessage = useCallback((messageId, newMessage) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, message: newMessage, isEdited: true } : m
      )
    );
  }, []);

  const addReaction = useCallback((messageId, emoji, user) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === messageId || m._id === messageId) {
          const reactions = m.reactions || [];

          const existingIndex = reactions.findIndex(
            (r) => r.emoji === emoji && (r.user?.id || r.user?._id) === user?.id
          );

          if (existingIndex >= 0) {
            const newReactions = [...reactions];
            newReactions.splice(existingIndex, 1);
            return { ...m, reactions: newReactions };
          } else {
            return { ...m, reactions: [...reactions, { emoji, user }] };
          }
        }
        return m;
      })
    );
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const refreshMessages = useCallback(() => {
    loadMessages();
  }, [loadMessages]);

  return {
    messages,
    onlineUsers,
    typingUsers,
    loading,
    error,
    sendMessage,
    sendTyping,
    deleteMessage,
    editMessage,
    addReaction,
    clearMessages,
    refreshMessages,
    loadMessages,
    setMessages,
  };
};
