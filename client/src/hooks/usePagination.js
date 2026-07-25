import { useState, useMemo, useCallback } from 'react';

export const usePagination = ({
  totalCount = 0,
  initialPage = 1,
  initialLimit = 10,
  onPageChange,
}) => {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);

  const totalPages = useMemo(
    () => Math.ceil(totalCount / limit),
    [totalCount, limit]
  );

  const goToPage = useCallback(
    (newPage) => {
      const pageNumber = Math.max(1, Math.min(newPage, totalPages));
      setPage(pageNumber);
      onPageChange?.({ page: pageNumber, limit });
    },
    [totalPages, limit, onPageChange]
  );

  const nextPage = useCallback(() => {
    goToPage(page + 1);
  }, [page, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(page - 1);
  }, [page, goToPage]);

  const firstPage = useCallback(() => goToPage(1), [goToPage]);
  const lastPage = useCallback(
    () => goToPage(totalPages),
    [totalPages, goToPage]
  );

  const changeLimit = useCallback(
    (newLimit) => {
      setLimit(newLimit);
      setPage(1);
      onPageChange?.({ page: 1, limit: newLimit });
    },
    [onPageChange]
  );

  const pageNumbers = useMemo(() => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }, [page, totalPages]);

  return {
    page,
    limit,
    totalPages,
    totalCount,
    pageNumbers,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    showingFrom: totalCount === 0 ? 0 : (page - 1) * limit + 1,
    showingTo: Math.min(page * limit, totalCount),
    goToPage,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    changeLimit,
  };
};
