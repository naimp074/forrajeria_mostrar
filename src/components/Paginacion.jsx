export default function Paginacion({
  page,
  totalPages,
  totalItems,
  from,
  to,
  onPageChange,
  className = '',
}) {
  if (totalItems <= 0 || totalPages <= 1) return null;

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-4 border-t border-slate-200 ${className}`}
    >
      <p className="text-sm text-slate-500">
        Mostrando {from}–{to} de {totalItems}
      </p>
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
        >
          ← Anterior
        </button>
        <span className="text-sm text-slate-600 font-medium whitespace-nowrap">
          Página {page} de {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
        >
          Siguiente →
        </button>
      </div>
    </div>
  );
}
