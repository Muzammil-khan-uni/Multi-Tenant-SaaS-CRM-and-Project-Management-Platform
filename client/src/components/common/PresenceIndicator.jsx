import { useOnlineUsers } from '../../hooks/useOnlineUsers';

const PresenceIndicator = ({ userId, size = 'sm' }) => {
  const { onlineUsers } = useOnlineUsers();
  const isOnline = onlineUsers.some((u) => u.id === userId);

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  if (!isOnline) return null;

  return (
    <div
      className={`${sizeClasses[size]} bg-green-500 rounded-full border-2 border-white dark:border-gray-800 absolute -bottom-0.5 -right-0.5`}
      title="Online"
    />
  );
};

export default PresenceIndicator;
