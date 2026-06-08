import { useCallback, useMemo, useState } from 'react';

export const PAGE_SIZE_DEFAULT = 20;

export function usePagination(items, { pageSize = PAGE_SIZE_DEFAULT, resetKey = '' } = {}) {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const [pagination, setPagination] = useState({ page: 1, resetKey, pageSize });

  const resetChanged = pagination.resetKey !== resetKey || pagination.pageSize !== pageSize;
  const page = Math.min(resetChanged ? 1 : pagination.page, totalPages);

  const setPage = useCallback((updater) => {
    setPagination((prev) => {
      const basePage = prev.resetKey !== resetKey || prev.pageSize !== pageSize ? 1 : prev.page;
      const requestedPage = typeof updater === 'function' ? updater(basePage) : updater;
      const nextPage = Math.min(totalPages, Math.max(1, Number(requestedPage) || 1));
      return { page: nextPage, resetKey, pageSize };
    });
  }, [resetKey, pageSize, totalPages]);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  return {
    paginatedItems,
    page,
    setPage,
    totalPages,
    totalItems,
    pageSize,
    from,
    to,
    hasMultiplePages: totalItems > pageSize,
    prevPage: () => setPage((p) => Math.max(1, p - 1)),
    nextPage: () => setPage((p) => Math.min(totalPages, p + 1)),
  };
}
