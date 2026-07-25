import React from 'react';
import { clsx } from 'clsx';
import { User } from 'lucide-react';
import PresenceIndicator from './PresenceIndicator';

const sizes = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
  '2xl': 'w-20 h-20 text-xl',
};

const radiusMap = {
  xs: 'rounded-full',
  sm: 'rounded-full',
  md: 'rounded-xl',
  lg: 'rounded-xl',
  xl: 'rounded-2xl',
  '2xl': 'rounded-2xl',
};

export const Avatar = ({
  src,
  alt,
  name,
  size = 'md',
  className,
  userId,
  showPresence = false,
  onClick,
}) => {
  const initials = name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const getColorFromName = (name) => {
    if (!name)
      return {
        bg: 'bg-gray-100 dark:bg-gray-700',
        text: 'text-gray-600 dark:text-gray-400',
      };

    const colors = [
      {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-600 dark:text-blue-400',
      },
      {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-600 dark:text-green-400',
      },
      {
        bg: 'bg-purple-100 dark:bg-purple-900/30',
        text: 'text-purple-600 dark:text-purple-400',
      },
      {
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
        text: 'text-yellow-600 dark:text-yellow-400',
      },
      {
        bg: 'bg-pink-100 dark:bg-pink-900/30',
        text: 'text-pink-600 dark:text-pink-400',
      },
      {
        bg: 'bg-indigo-100 dark:bg-indigo-900/30',
        text: 'text-indigo-600 dark:text-indigo-400',
      },
      {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-600 dark:text-red-400',
      },
      {
        bg: 'bg-teal-100 dark:bg-teal-900/30',
        text: 'text-teal-600 dark:text-teal-400',
      },
    ];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const colorScheme = getColorFromName(name);

  if (src) {
    return (
      <div className="relative inline-flex flex-shrink-0">
        <img
          src={src}
          alt={alt || name || 'Avatar'}
          onClick={onClick}
          className={clsx(
            'object-cover ring-2 ring-white dark:ring-gray-800',
            sizes[size],
            radiusMap[size],
            onClick && 'cursor-pointer hover:opacity-90 transition-opacity',
            className
          )}
        />
        {showPresence && userId && (
          <PresenceIndicator
            userId={userId}
            size={size === 'xs' || size === 'sm' ? 'sm' : 'md'}
          />
        )}
      </div>
    );
  }

  if (initials) {
    return (
      <div className="relative inline-flex flex-shrink-0">
        <div
          onClick={onClick}
          className={clsx(
            'flex items-center justify-center font-semibold ring-2 ring-white dark:ring-gray-800',
            colorScheme.bg,
            colorScheme.text,
            sizes[size],
            radiusMap[size],
            onClick && 'cursor-pointer hover:opacity-90 transition-opacity',
            className
          )}
        >
          {initials}
        </div>
        {showPresence && userId && (
          <PresenceIndicator
            userId={userId}
            size={size === 'xs' || size === 'sm' ? 'sm' : 'md'}
          />
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-flex flex-shrink-0">
      <div
        onClick={onClick}
        className={clsx(
          'flex items-center justify-center bg-gray-100 dark:bg-gray-700 ring-2 ring-white dark:ring-gray-800',
          sizes[size],
          radiusMap[size],
          onClick && 'cursor-pointer hover:opacity-90 transition-opacity',
          className
        )}
      >
        <User className="w-1/2 h-1/2 text-gray-400 dark:text-gray-500" />
      </div>
      {showPresence && userId && (
        <PresenceIndicator
          userId={userId}
          size={size === 'xs' || size === 'sm' ? 'sm' : 'md'}
        />
      )}
    </div>
  );
};

export const AvatarGroup = ({ children, max = 4, size = 'sm', className }) => {
  const childrenArray = React.Children.toArray(children);
  const visible = childrenArray.slice(0, max);
  const remaining = childrenArray.length - max;

  return (
    <div className={clsx('flex items-center -space-x-2', className)}>
      {visible.map((child, index) => (
        <div
          key={index}
          className="relative z-[1]"
          style={{ zIndex: max - index }}
        >
          {React.cloneElement(child, { size })}
        </div>
      ))}
      {remaining > 0 && (
        <div
          className={clsx(
            'flex items-center justify-center font-medium bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 ring-2 ring-white dark:ring-gray-800',
            sizes[size],
            radiusMap[size]
          )}
          style={{ zIndex: 0 }}
          title={`${remaining} more`}
        >
          +{remaining > 99 ? '99' : remaining}
        </div>
      )}
    </div>
  );
};

export const AvatarWithStatus = ({
  src,
  name,
  size = 'md',
  status = 'offline',
  className,
  onClick,
}) => {
  const statusColors = {
    online: 'bg-green-500',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
    offline: 'bg-gray-400',
  };

  const statusSizes = {
    xs: 'w-2 h-2',
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5',
    xl: 'w-4 h-4',
    '2xl': 'w-5 h-5',
  };

  return (
    <div className="relative inline-flex flex-shrink-0">
      <Avatar
        src={src}
        name={name}
        size={size}
        className={className}
        onClick={onClick}
      />
      <div
        className={clsx(
          'absolute rounded-full border-2 border-white dark:border-gray-800',
          statusSizes[size],
          statusColors[status] || statusColors.offline
        )}
        style={{
          bottom: size === 'xs' || size === 'sm' ? '-1px' : '0px',
          right: size === 'xs' || size === 'sm' ? '-1px' : '0px',
        }}
        title={status.charAt(0).toUpperCase() + status.slice(1)}
      />
    </div>
  );
};

export default Avatar;
