import { clsx } from 'clsx';

export const Card = ({
  children,
  className,
  hoverable = false,
  padding = true,
  ...props
}) => {
  return (
    <div
      className={clsx(
        'card',
        hoverable && 'hover:shadow-lg hover:-translate-y-0.5 transform transition-all duration-200',
        !padding && 'p-0',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className }) => (
  <div className={clsx('flex items-center justify-between mb-4', className)}>
    {children}
  </div>
);

export const CardTitle = ({ children, className }) => (
  <h3 className={clsx('text-lg font-semibold text-gray-900 dark:text-white', className)}>
    {children}
  </h3>
);

export const CardContent = ({ children, className }) => (
  <div className={clsx('', className)}>
    {children}
  </div>
);