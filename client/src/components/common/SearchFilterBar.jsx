import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Filter,
  ArrowUpDown,
  ChevronDown,
  RotateCw,
} from 'lucide-react';
import { Badge } from './Badge';

const SearchFilterBar = ({
  searchTerm,
  onSearch,
  onClearSearch,
  filters = {},
  activeFilters = [],
  onRemoveFilter,
  onClearFilters,
  sort,
  onSortChange,
  sortOptions = [],
  filterOptions = [],
  isSearching = false,
  placeholder = 'Search...',
  className = '',
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Search & Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-9 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg 
                       text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                       placeholder-gray-400 dark:placeholder-gray-500 transition-all"
          />
          {(searchTerm || isSearching) && (
            <button
              onClick={onClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              {isSearching ? (
                <RotateCw className="w-4 h-4 text-gray-400 animate-spin" />
              ) : (
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          )}
        </div>

        {/* Sort Dropdown */}
        {sortOptions.length > 0 && (
          <div className="relative">
            <select
              value={`${sort.field}-${sort.direction}`}
              onChange={(e) => {
                const [field] = e.target.value.split('-');
                onSortChange(field);
              }}
              className="appearance-none pl-9 pr-8 py-2.5 border border-gray-300 dark:border-gray-600 
                         rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
            >
              {sortOptions.map((option) => (
                <option
                  key={`${option.field}-${option.label}`}
                  value={`${option.field}-asc`}
                >
                  {option.label} ↑
                </option>
              ))}
              {sortOptions.map((option) => (
                <option
                  key={`${option.field}-${option.label}-desc`}
                  value={`${option.field}-desc`}
                >
                  {option.label} ↓
                </option>
              ))}
            </select>
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Active Filters */}
      <AnimatePresence>
        {activeFilters.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 flex-wrap"
          >
            <Filter className="w-4 h-4 text-gray-400" />
            {activeFilters.map((filterKey) => {
              const option = filterOptions.find((o) => o.key === filterKey);
              const value = filters[filterKey];
              return (
                <Badge
                  key={filterKey}
                  variant="primary"
                  size="md"
                  className="flex items-center gap-1 cursor-pointer"
                  onClick={() => onRemoveFilter(filterKey)}
                >
                  {option?.label || filterKey}:{' '}
                  {option?.options?.find((o) => o.value === value)?.label ||
                    value}
                  <X className="w-3 h-3 ml-1" />
                </Badge>
              );
            })}
            <button
              onClick={onClearFilters}
              className="text-xs text-red-500 hover:text-red-700 ml-2"
            >
              Clear all
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchFilterBar;
