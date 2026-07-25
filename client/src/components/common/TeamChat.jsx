import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import {
  MessageSquare,
  Send,
  Users,
  X,
  Minimize2,
  Maximize2,
  Smile,
  MoreVertical,
  Search,
  Reply,
  Trash2,
  CheckCheck,
} from 'lucide-react';
import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { ConfirmDialog } from './ConfirmDialog';
import { useTeamChat } from '../../hooks/useTeamChat';
import { useSelector } from 'react-redux';
import { format, isToday, isYesterday } from 'date-fns';
import axios from '../../api/axios';
import toast from 'react-hot-toast';

const TeamChat = ({ workspaceId }) => {
  const currentUser = useSelector((state) => state.auth.user);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showUsersList, setShowUsersList] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [showMentionPopup, setShowMentionPopup] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [mentionSearchTerm, setMentionSearchTerm] = useState('');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const menuRef = useRef(null);

  const roomId = `workspace:${workspaceId}`;
  const {
    messages,
    onlineUsers,
    typingUsers,
    sendMessage,
    sendTyping,
    clearMessages,
    addReaction,
    setMessages,
  } = useTeamChat(roomId);

  const quickEmojis = [
    '👍',
    '👎',
    '😄',
    '🎉',
    '❤️',
    '🔥',
    '✅',
    '🚀',
    '👀',
    '💯',
  ];

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) inputRef.current?.focus();
  }, [isOpen, isMinimized]);

  // Close menu when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Load messages when chat opens
  const loadMessages = useCallback(async () => {
    setLoadingMessages(true);
    try {
      await axios.get(`/chat/${roomId}?limit=50`);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  }, [roomId]);

  if (isOpen && !initialLoadDone) {
    setInitialLoadDone(true);
    loadMessages();
  }

  if (!isOpen && initialLoadDone) {
    setInitialLoadDone(false);
  }

  if (isOpen && !membersLoaded) {
    setMembersLoaded(true);
    axios
      .get('/workspaces/members')
      .then(({ data }) => {
        setWorkspaceMembers(data.data || []);
      })
      .catch(() => {});
  }

  // Reset when chat closes
  if (!isOpen && membersLoaded) {
    setMembersLoaded(false);
    setWorkspaceMembers([]);
  }

  const handleSend = async (e) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(messageInput)) !== null) {
      const user = onlineUsers.find(
        (u) => u.firstName?.toLowerCase() === match[1].toLowerCase()
      );
      if (user) mentions.push(user.id);
    }

    const replyData = replyTo
      ? {
          id: replyTo._id || replyTo.id,
          message: replyTo.message,
          sender: {
            id: replyTo.sender?.id || replyTo.sender?._id,
            firstName: replyTo.sender?.firstName || 'User',
            lastName: replyTo.sender?.lastName || '',
          },
        }
      : null;

    const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);
    const replyId = replyTo?._id || replyTo?.id;
    const validReplyId =
      replyId && isValidObjectId(replyId) ? replyId : undefined;

    // Optimistic update - add message to local state immediately
    const tempId = Date.now().toString();
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        message: messageInput.trim(),
        sender: {
          id: currentUser?.id,
          firstName: currentUser?.firstName,
          lastName: currentUser?.lastName,
        },
        timestamp: new Date().toISOString(),
        mentions: mentions || [],
        replyTo: replyData,
        reactions: [],
        isEdited: false,
        type: 'text',
      },
    ]);

    setMessageInput('');
    sendTyping(false);
    setReplyTo(null);

    try {
      const response = await axios.post(`/chat/${roomId}`, {
        message: messageInput.trim(),
        mentions,
        replyTo: validReplyId,
      });

      // Replace temp message with real one from server
      if (response.data?.data?._id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...m,
                  id: response.data.data._id,
                  replyTo: response.data.data.replyTo
                    ? {
                        id: response.data.data.replyTo._id,
                        message:
                          response.data.data.replyTo.message ||
                          'Original message',
                        sender: {
                          id: response.data.data.replyTo.sender?._id,
                          firstName:
                            response.data.data.replyTo.sender?.firstName ||
                            'User',
                        },
                      }
                    : m.replyTo,
                }
              : m
          )
        );
      }

      sendMessage(messageInput.trim(), mentions);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove the optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      toast.error('Failed to send message');
    }
  };

  const handleTyping = (e) => {
    const value = e.target.value;
    setMessageInput(value);
    sendTyping(value.length > 0);

    // Check for @ mention
    const lastAtSymbol = value.lastIndexOf('@');
    if (lastAtSymbol !== -1) {
      const textAfterAt = value.substring(lastAtSymbol + 1);
      if (!textAfterAt.includes(' ') && textAfterAt.length < 30) {
        setShowMentionPopup(true);
        // Use text after @ as search filter
        setMentionSearchTerm(textAfterAt);
      } else {
        setShowMentionPopup(false);
        setMentionSearchTerm('');
      }
    } else {
      setShowMentionPopup(false);
      setMentionSearchTerm('');
    }
  };

  const handleMentionSelect = (user) => {
    const lastAt = messageInput.lastIndexOf('@');
    const beforeAt = messageInput.substring(0, lastAt);
    setMessageInput(beforeAt + `@${user.firstName} `);
    setShowMentionPopup(false);
    setMentionSearchTerm(''); // Reset search
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    // Close mention popup on Escape
    if (e.key === 'Escape') {
      setShowMentionPopup(false);
      return;
    }

    // Send message on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const handleReply = useCallback((message) => {
    // Store the message with its MongoDB _id for reply
    setReplyTo({
      id: message._id || message.id, // Prefer MongoDB _id
      message: message.message,
      sender: message.sender,
    });
    inputRef.current?.focus();
  }, []);

  const cancelReply = useCallback(() => setReplyTo(null), []);
  const handleReaction = useCallback(
    async (messageId, emoji) => {
      addReaction(messageId, emoji, {
        id: currentUser?.id,
        firstName: currentUser?.firstName,
        lastName: currentUser?.lastName,
      });

      try {
        await axios.post(`/chat/${messageId}/reaction`, { emoji });
      } catch (error) {
        console.error('Failed to add reaction:', error);
      }
    },
    [addReaction, currentUser]
  );

  const handleClearChat = async () => {
    try {
      await axios.delete(`/chat/${roomId}/clear`);
      clearMessages();
      toast.success('Chat cleared');
      setShowClearDialog(false);
      setShowMenu(false);
    } catch {
      toast.error('Failed to clear chat');
    }
  };

  const onReply = useCallback((msg) => () => handleReply(msg), [handleReply]);
  const onReaction = useCallback(
    (msgId, emoji) => () => handleReaction(msgId, emoji),
    [handleReaction]
  );

  const groupedMessages = messages.reduce((groups, msg) => {
    const date = new Date(msg.timestamp || msg.createdAt).toDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {});

  const formatMessageDate = (dateStr) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  const typingArray = Array.from(typingUsers.values());
  const filteredUsers = onlineUsers.filter(
    (u) =>
      u.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-primary-500 to-primary-700 text-white rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center z-50 group"
          >
            <MessageSquare className="w-6 h-6 group-hover:scale-110 transition-transform" />
            {onlineUsers.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] bg-green-500 text-white text-xs rounded-full flex items-center justify-center font-medium border-2 border-white dark:border-gray-900">
                {onlineUsers.length}
              </span>
            )}
            <span className="absolute inset-0 rounded-2xl bg-primary-500 animate-ping opacity-20" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              height: isMinimized ? 'auto' : undefined,
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={clsx(
              'fixed z-50 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col',
              'left-4 right-4 bottom-4 sm:left-auto sm:bottom-6 sm:right-6',
              isMinimized
                ? 'sm:w-[380px]'
                : 'w-auto sm:w-[380px] max-h-[70vh] sm:max-h-[550px] sm:h-[550px]'
            )}
          >
            <div className="flex-shrink-0 bg-gradient-to-r from-primary-600 to-primary-700 text-white">
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Team Chat</h3>
                    <p className="text-xs text-white/70">
                      {onlineUsers.length} online
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowUsersList(!showUsersList)}
                    className={`p-2 rounded-lg ${showUsersList ? 'bg-white/20' : 'hover:bg-white/10'}`}
                  >
                    <Users className="w-4 h-4" />
                  </button>
                  <div className="relative" ref={menuRef}>
                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className={`p-2 rounded-lg ${showMenu ? 'bg-white/20' : 'hover:bg-white/10'}`}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    <AnimatePresence>
                      {showMenu && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50"
                        >
                          <button
                            onClick={() => {
                              setShowClearDialog(true);
                              setShowMenu(false);
                            }}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4" /> Clear Chat
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <button
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="p-2 hover:bg-white/10 rounded-lg"
                  >
                    {isMinimized ? (
                      <Maximize2 className="w-4 h-4" />
                    ) : (
                      <Minimize2 className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-white/10 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Users List Dropdown */}
              <AnimatePresence>
                {showUsersList && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-white/10"
                  >
                    <div className="p-2">
                      <div className="relative mb-2">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/50" />
                        <input
                          type="text"
                          placeholder="Search users..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 bg-white/10 rounded-lg text-xs text-white placeholder-white/50 border border-white/10 focus:outline-none focus:border-white/30"
                        />
                      </div>
                      <div className="max-h-32 overflow-y-auto space-y-0.5">
                        {/* Current User */}
                        {currentUser && (
                          <div className="flex items-center gap-2 p-1.5 bg-white/10 rounded-lg">
                            <div className="relative">
                              <Avatar
                                name={`${currentUser.firstName} ${currentUser.lastName}`}
                                size="xs"
                              />
                              <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full border border-primary-600" />
                            </div>
                            <span className="text-xs text-white">
                              {currentUser.firstName} {currentUser.lastName}
                            </span>
                            <Badge
                              variant="green"
                              size="sm"
                              className="ml-auto text-xs"
                            >
                              You
                            </Badge>
                          </div>
                        )}

                        {/* Other Users */}
                        {filteredUsers
                          .filter((u) => u.id !== currentUser?.id)
                          .map((user) => (
                            <div
                              key={user.id}
                              className="flex items-center gap-2 p-1.5 hover:bg-white/10 rounded-lg cursor-pointer transition-colors"
                            >
                              <div className="relative">
                                <Avatar
                                  name={`${user.firstName} ${user.lastName}`}
                                  size="xs"
                                />
                                <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full border border-primary-600" />
                              </div>
                              <span className="text-xs text-white">
                                {user.firstName} {user.lastName}
                              </span>
                              <Badge
                                variant="green"
                                size="sm"
                                className="ml-auto text-xs"
                              >
                                Online
                              </Badge>
                            </div>
                          ))}

                        {filteredUsers.length === 0 && (
                          <p className="text-xs text-white/50 text-center py-2">
                            No users found
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {!isMinimized && (
              <>
                <div className="flex-1 overflow-y-auto p-3 space-y-1 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
                  {loadingMessages && messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full" />
                    </div>
                  ) : Object.keys(groupedMessages).length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                      <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center mb-4">
                        <MessageSquare className="w-8 h-8 text-primary-500" />
                      </div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                        Start the conversation
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[250px]">
                        Send a message to your team. Use @ to mention someone.
                      </p>
                      <div className="flex gap-1 mt-3">
                        {quickEmojis.slice(0, 5).map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => {
                              setMessageInput(emoji);
                              setIsOpen(true);
                              inputRef.current?.focus();
                            }}
                            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-lg transition-colors"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    Object.entries(groupedMessages).map(
                      ([date, dateMessages]) => (
                        <div key={date}>
                          <div className="flex items-center justify-center my-3">
                            <div className="bg-gray-200 dark:bg-gray-700 rounded-full px-3 py-0.5">
                              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                {formatMessageDate(date)}
                              </span>
                            </div>
                          </div>
                          {dateMessages.map((msg) => {
                            const isOwn =
                              (msg.sender?.id || msg.sender?._id) ===
                              currentUser?.id;
                            const msgId = msg.id || msg._id;
                            return (
                              <motion.div
                                key={msgId}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex items-end gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : ''}`}
                              >
                                <Avatar
                                  name={
                                    msg.sender?.firstName
                                      ? `${msg.sender.firstName} ${msg.sender.lastName}`
                                      : 'User'
                                  }
                                  size="sm"
                                  className="flex-shrink-0 mb-1"
                                />
                                <div
                                  className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}
                                >
                                  {!isOwn && (
                                    <p className="text-xs text-gray-500 mb-1 ml-1">
                                      {msg.sender?.firstName || 'User'}
                                    </p>
                                  )}
                                  <div
                                    className={`group relative rounded-2xl px-3.5 py-2 text-sm ${isOwn ? 'bg-primary-600 text-white rounded-br-md' : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md shadow-sm border border-gray-100 dark:border-gray-600'}`}
                                  >
                                    {msg.replyTo && (
                                      <div
                                        className={`mb-2 p-2 rounded-lg text-xs ${isOwn ? 'bg-white/10' : 'bg-gray-100 dark:bg-gray-600'}`}
                                      >
                                        <p
                                          className={`font-medium ${isOwn ? 'text-white/80' : 'text-primary-600'}`}
                                        >
                                          {msg.replyTo.sender?.firstName ||
                                            'User'}
                                        </p>
                                        <p
                                          className={`truncate ${isOwn ? 'text-white/60' : 'text-gray-500'}`}
                                        >
                                          {msg.replyTo.message ||
                                            'Original message'}
                                        </p>
                                      </div>
                                    )}
                                    <p className="whitespace-pre-wrap break-words">
                                      {msg.message}
                                    </p>
                                    {msg.isEdited && (
                                      <span
                                        className={`text-xs ml-1 ${isOwn ? 'text-white/50' : 'text-gray-400'}`}
                                      >
                                        (edited)
                                      </span>
                                    )}
                                    <p
                                      className={`text-xs mt-1 ${isOwn ? 'text-white/60' : 'text-gray-400'}`}
                                    >
                                      {format(
                                        new Date(
                                          msg.timestamp || msg.createdAt
                                        ),
                                        'h:mm a'
                                      )}
                                      {isOwn && (
                                        <CheckCheck className="w-3 h-3 inline ml-1" />
                                      )}
                                    </p>
                                    {msg.reactions?.length > 0 && (
                                      <div className="flex gap-1 mt-1.5">
                                        {msg.reactions.map((r, i) => (
                                          <span
                                            key={i}
                                            className={`text-xs px-1.5 py-0.5 rounded-full ${isOwn ? 'bg-white/10' : 'bg-gray-100 dark:bg-gray-600'}`}
                                            title={r.user?.firstName || 'User'}
                                          >
                                            {r.emoji}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    <div
                                      className={`absolute -top-8 ${isOwn ? 'right-0' : 'left-0'} hidden group-hover:flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 p-1 z-10`}
                                    >
                                      {['👍', '❤️', '😂', '😮', '😢', '😡'].map(
                                        (emoji) => (
                                          <button
                                            key={emoji}
                                            onClick={onReaction(msgId, emoji)}
                                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm"
                                          >
                                            {emoji}
                                          </button>
                                        )
                                      )}
                                      <div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-0.5" />
                                      <button
                                        onClick={onReply(msg)}
                                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                        title="Reply"
                                      >
                                        <Reply className="w-3.5 h-3.5 text-gray-500" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      )
                    )
                  )}
                  <AnimatePresence>
                    {typingArray.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2 ml-10"
                      >
                        <div className="bg-gray-200 dark:bg-gray-700 rounded-2xl rounded-bl-md px-3 py-2">
                          <div className="flex gap-1">
                            <span
                              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                              style={{ animationDelay: '0ms' }}
                            />
                            <span
                              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                              style={{ animationDelay: '150ms' }}
                            />
                            <span
                              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                              style={{ animationDelay: '300ms' }}
                            />
                          </div>
                        </div>
                        <span className="text-xs text-gray-400">
                          {typingArray.length === 1
                            ? `${typingArray[0]} typing...`
                            : `${typingArray.length} people typing...`}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>

                <AnimatePresence>
                  {replyTo && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-3 pt-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded-lg border">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Reply className="w-4 h-4 text-primary-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-primary-600">
                              Replying to {replyTo.sender?.firstName || 'User'}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {replyTo.message?.substring(0, 80)}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={cancelReply}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                        >
                          <X className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Quick Emojis Panel */}
                <AnimatePresence>
                  {showEmojiPicker && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Quick Emojis
                        </p>
                        <button
                          onClick={() => setShowEmojiPicker(false)}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                        >
                          <X className="w-3 h-3 text-gray-400" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1">
                        {[
                          '😀',
                          '😂',
                          '🤣',
                          '😍',
                          '😢',
                          '😡',
                          '👍',
                          '👎',
                          '❤️',
                          '🔥',
                          '🎉',
                          '💯',
                          '👋',
                          '🙏',
                          '💪',
                          '🤝',
                          '🚀',
                          '⭐',
                          '✅',
                          '❌',
                          '⚡',
                          '💡',
                          '📌',
                          '🔔',
                          '😊',
                          '🙂',
                          '😎',
                          '🤔',
                          '😴',
                          '😱',
                          '🤗',
                          '🫡',
                        ].map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              setMessageInput((prev) => prev + emoji);
                              inputRef.current?.focus();
                            }}
                            className="w-9 h-9 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-xl transition-colors hover:scale-110"
                            title={emoji}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Input Area */}
                <div className="flex-shrink-0 p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                  <form onSubmit={handleSend} className="flex items-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className={`p-2 rounded-lg transition-colors ${
                        showEmojiPicker
                          ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600'
                          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title="Emojis"
                    >
                      <Smile className="w-5 h-5" />
                    </button>

                    <div className="flex-1 relative">
                      <textarea
                        ref={inputRef}
                        value={messageInput}
                        onChange={handleTyping}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message... (@ to mention)"
                        rows={1}
                        className="w-full resize-none bg-gray-100 dark:bg-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 border-0 focus:outline-none focus:ring-2 focus:ring-primary-500 max-h-32"
                        style={{ minHeight: '42px' }}
                        onInput={(e) => {
                          e.target.style.height = 'auto';
                          e.target.style.height =
                            Math.min(e.target.scrollHeight, 128) + 'px';
                        }}
                      />

                      {/* @Mention Popup - Controlled by showMentionPopup state */}
                      {/* @Mention Popup - Shows ALL workspace members */}
                      <AnimatePresence>
                        {showMentionPopup && workspaceMembers.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: 5, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 5, scale: 0.95 }}
                            className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 w-64"
                          >
                            {/* Header */}
                            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                              <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                Mention a team member
                              </p>
                            </div>

                            {/* Search Filter */}
                            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                              <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                                <input
                                  type="text"
                                  placeholder="Search members..."
                                  value={mentionSearchTerm}
                                  onChange={(e) =>
                                    setMentionSearchTerm(e.target.value)
                                  }
                                  className="w-full pl-7 pr-2 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 rounded-lg border-0 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </div>

                            {/* Members List */}
                            <div className="max-h-56 overflow-y-auto py-1">
                              {workspaceMembers
                                .filter((member) => {
                                  // Filter by search term
                                  if (!mentionSearchTerm) return true;
                                  const name =
                                    `${member.firstName} ${member.lastName}`.toLowerCase();
                                  return name.includes(
                                    mentionSearchTerm.toLowerCase()
                                  );
                                })
                                .map((member) => {
                                  const isOnline = onlineUsers.some(
                                    (u) => u.id === member._id
                                  );
                                  return (
                                    <button
                                      key={member._id}
                                      type="button"
                                      onClick={() =>
                                        handleMentionSelect(member)
                                      }
                                      className="flex items-center gap-3 w-full px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                                    >
                                      <div className="relative">
                                        <Avatar
                                          name={`${member.firstName} ${member.lastName}`}
                                          size="sm"
                                        />
                                        {isOnline && (
                                          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                          {member.firstName} {member.lastName}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                          {member.role?.replace('_', ' ') ||
                                            'Member'}
                                          {member.department?.name
                                            ? ` • ${member.department.name}`
                                            : ''}
                                        </p>
                                      </div>
                                      {isOnline && (
                                        <Badge
                                          variant="green"
                                          size="sm"
                                          className="text-xs"
                                        >
                                          Online
                                        </Badge>
                                      )}
                                    </button>
                                  );
                                })}

                              {workspaceMembers.filter((member) => {
                                if (!mentionSearchTerm) return true;
                                const name =
                                  `${member.firstName} ${member.lastName}`.toLowerCase();
                                return name.includes(
                                  mentionSearchTerm.toLowerCase()
                                );
                              }).length === 0 && (
                                <p className="text-xs text-gray-400 text-center py-4">
                                  No members found
                                </p>
                              )}
                            </div>

                            {/* Footer */}
                            <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                              <p className="text-xs text-gray-400">
                                <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />
                                {onlineUsers.length} online
                              </p>
                              <p className="text-xs text-gray-400">
                                Press{' '}
                                <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-xs">
                                  Esc
                                </kbd>{' '}
                                to close
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <motion.button
                      type="submit"
                      disabled={!messageInput.trim()}
                      whileTap={{ scale: 0.9 }}
                      className={`p-2.5 rounded-xl transition-all ${
                        messageInput.trim()
                          ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                      }`}
                    >
                      <Send className="w-5 h-5" />
                    </motion.button>
                  </form>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={showClearDialog}
        onClose={() => setShowClearDialog(false)}
        onConfirm={handleClearChat}
        title="Clear Chat"
        message="Are you sure you want to clear all messages? This cannot be undone."
        confirmText="Clear All"
        variant="danger"
      />
    </>
  );
};

export default TeamChat;
