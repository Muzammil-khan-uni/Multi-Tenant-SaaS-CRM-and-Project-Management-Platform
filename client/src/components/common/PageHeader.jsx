import { Button } from './Button';
import { Plus } from 'lucide-react';

export const PageHeader = ({ title, description, action, children }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {children}
        {action && (
          <Button onClick={action.onClick} icon={action.icon || Plus}>
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
};
