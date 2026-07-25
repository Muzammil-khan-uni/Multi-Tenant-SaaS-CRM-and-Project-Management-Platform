import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useDebounce } from './useDebounce';

export const useSearchFilter = ({
  initialFilters = {},
  initialSort = { field: 'createdAt', direction: 'desc' },
  onSearch,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState(initialFilters);
  const [activeFilters, setActiveFilters] = useState([]);
  const [sort, setSort] = useState(initialSort);
  const [isSearching, setIsSearching] = useState(false);

  const debouncedSearch = useDebounce(searchTerm, 300);
  const prevDebouncedRef = useRef(debouncedSearch);

  useEffect(() => {
    if (prevDebouncedRef.current !== debouncedSearch) {
      prevDebouncedRef.current = debouncedSearch;
      onSearch?.({
        search: debouncedSearch,
        filters,
        sort,
      });
      setIsSearching(false);
    }
  }, [debouncedSearch, filters, sort, onSearch]);

  const handleSearch = useCallback((value) => {
    setIsSearching(true);
    setSearchTerm(value);
  }, []);

  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => {
      const newFilters = { ...prev, [key]: value };

      if (!value || value === 'all' || value === '') {
        delete newFilters[key];
      }

      const active = Object.entries(newFilters)
        .filter(([, v]) => v && v !== 'all')
        .map(([k]) => k);
      setActiveFilters(active);

      return newFilters;
    });
  }, []);

  const handleSortChange = useCallback((field) => {
    setSort((prev) => ({
      field,
      direction:
        prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setActiveFilters([]);
    setSearchTerm('');
  }, []);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  const removeFilter = useCallback(
    (key) => {
      handleFilterChange(key, '');
    },
    [handleFilterChange]
  );

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();

    if (debouncedSearch) params.append('search', debouncedSearch);

    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        params.append(key, value);
      }
    });

    if (sort.field) {
      const sortValue =
        sort.direction === 'desc' ? `-${sort.field}` : sort.field;
      params.append('sort', sortValue);
    }

    return params.toString();
  }, [debouncedSearch, filters, sort]);

  return {
    searchTerm,
    filters,
    activeFilters,
    sort,
    isSearching,
    queryParams,
    handleSearch,
    handleFilterChange,
    handleSortChange,
    clearFilters,
    clearSearch,
    removeFilter,
    setSearchTerm,
    setFilters,
  };
};
