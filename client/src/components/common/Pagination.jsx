import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { clsx } from 'clsx';

const Pagination = ({
  currentPage,
  totalPages,
  pageNumbers,
  hasNextPage,
  hasPrevPage,
  showingFrom,
  showingTo,
  totalCount,
  limit,
  onPageChange,
  onLimitChange,
  limitOptions = [10, 20, 50, 100],
}) => {
  if (totalPages <= 1 && totalCount <= limit) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3">
      {/* Showing results */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Showing <span className="font-medium">{showingFrom}</span> to{' '}
        <span className="font-medium">{showingTo}</span> of{' '}
        <span className="font-medium">{totalCount}</span> results
      </div>

      <div className="flex items-center gap-3">
        {/* Items per page */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Per page:
          </span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="border border-gray-300 dark:border-gray-600 rounded-md text-sm px-2 py-1
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {limitOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Page navigation */}
        <nav className="flex items-center gap-1">
          {/* First page */}
          <button
            onClick={() => onPageChange(1)}
            disabled={!hasPrevPage}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="First page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          {/* Previous page */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!hasPrevPage}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Page numbers */}
          <div className="flex items-center gap-0.5">
            {pageNumbers.map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={clsx(
                  'w-8 h-8 rounded-md text-sm font-medium transition-colors',
                  pageNum === currentPage
                    ? 'bg-primary-600 text-white'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                )}
              >
                {pageNum}
              </button>
            ))}
          </div>

          {/* Next page */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!hasNextPage}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Last page */}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={!hasNextPage}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Last page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </nav>
      </div>
    </div>
  );
};

export default Pagination;
