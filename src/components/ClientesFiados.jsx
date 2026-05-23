import { usePagination } from '../hooks/usePagination';
import Paginacion from './Paginacion';

export default function ClientesFiados() {
  const debtClients = [];
  const clientesPaginacion = usePagination(debtClients, { pageSize: 10 });

  return (
    <section className="rounded-2xl sm:rounded-[28px] bg-white border border-slate-200 shadow-lg overflow-hidden">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-200">
        <h2 className="text-xl sm:text-2xl font-bold">Clientes</h2>
        <p className="text-slate-500 mt-1 text-sm sm:text-base">
          Seguimiento de saldos, pagos parciales e historial.
        </p>
      </div>
      <div className="p-4 sm:p-6 space-y-4">
        {debtClients.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 sm:p-6 text-center text-slate-500">
            Todavía no hay clientes registrados.
          </div>
        )}
        {clientesPaginacion.paginatedItems.map(([name, debt, time]) => (
          <div
            key={name}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4"
          >
            <div className="min-w-0">
              <div className="font-semibold text-sm sm:text-base truncate">{name}</div>
              <div className="text-xs sm:text-sm text-slate-500">Último movimiento: {time}</div>
            </div>
            <div className="text-left sm:text-right shrink-0">
              <div className="font-bold text-base sm:text-lg">{debt}</div>
              <div className="text-xs sm:text-sm text-amber-700">Pendiente</div>
            </div>
          </div>
        ))}
        <Paginacion
          page={clientesPaginacion.page}
          totalPages={clientesPaginacion.totalPages}
          totalItems={clientesPaginacion.totalItems}
          from={clientesPaginacion.from}
          to={clientesPaginacion.to}
          onPageChange={clientesPaginacion.setPage}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button type="button" className="rounded-2xl border border-slate-300 bg-white py-3.5 sm:py-3 font-semibold text-sm sm:text-base touch-manipulation">
            Ver historial
          </button>
          <button type="button" className="rounded-2xl bg-amber-500 text-white py-3.5 sm:py-3 font-semibold text-sm sm:text-base touch-manipulation">
            Registrar pago
          </button>
        </div>
      </div>
    </section>
  );
}
