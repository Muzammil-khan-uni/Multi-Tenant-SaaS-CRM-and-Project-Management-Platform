import { clsx } from 'clsx';
import { ChevronUp, ChevronDown } from 'lucide-react';

export const Table = ({ children, className }) => (
  <div className="overflow-x-auto">
    <table className={clsx('w-full', className)}>
      {children}
    </table>
  </div>
);

export const TableHeader = ({ children }) => (
  <thead className="bg-gray-50 dark:bg-gray-800/50">
    <tr>{children}</tr>
  </thead>
);

export const TableHead = ({ children, sortable, sorted, onClick, className }) => (
  <th
    className={clsx(
      'px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider',
      sortable && 'cursor-pointer hover:text-gray-700 dark:hover:text-gray-200',
      className
    )}
    onClick={sortable ? onClick : undefined}
  >
    <div className="flex items-center gap-1">
      {children}
      {sortable && (
        <span className="inline-flex flex-col">
          <ChevronUp className={clsx('w-3 h-3', sorted === 'asc' ? 'text-primary-500' : 'text-gray-400')} />
          <ChevronDown className={clsx('w-3 h-3 -mt-1', sorted === 'desc' ? 'text-primary-500' : 'text-gray-400')} />
        </span>
      )}
    </div>
  </th>
);

export const TableBody = ({ children }) => (
  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
    {children}
  </tbody>
);

export const TableRow = ({ children, onClick, className }) => (
  <tr
    className={clsx(
      'transition-colors',
      onClick && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50',
      className
    )}
    onClick={onClick}
  >
    {children}
  </tr>
);

export const TableCell = ({ children, className }) => (
  <td className={clsx('px-4 py-3 text-sm text-gray-900 dark:text-gray-100', className)}>
    {children}
  </td>
);