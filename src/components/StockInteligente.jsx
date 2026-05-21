import { useStock } from '../context/StockContext';

function sugerenciaReposicion(items) {
  const paraReponer = items.filter(
    (item) => item.status === 'Reponer urgente' || item.status === 'Stock bajo'
  );
  if (paraReponer.length === 0) return null;
  const nombres = paraReponer.map((item) => item.name);
  if (nombres.length === 1) return `Reponer ${nombres[0]} esta semana`;
  if (nombres.length === 2) return `Reponer ${nombres[0]} y ${nombres[1]} esta semana`;
  const ultimo = nombres.pop();
  return `Reponer ${nombres.join(', ')} y ${ultimo} esta semana`;
}

export default function StockInteligente() {
  const { porProducto } = useStock();
  const lowStock = Object.entries(porProducto)
    .map(([name, datos]) => {
      const disponible = Math.max(0, (Number(datos.cantidadComprada) || 0) - (Number(datos.cantidadVendida) || 0));
      if (disponible > 5) return null;
      return {
        id: name,
        name,
        qty: `${disponible} unidades`,
        status: disponible === 0 ? 'Sin stock' : 'Stock bajo',
      };
    })
    .filter(Boolean);
  const textoSugerencia = sugerenciaReposicion(lowStock);

  return (
    <section className="rounded-2xl sm:rounded-[28px] bg-white border border-slate-200 shadow-lg overflow-hidden">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-200">
        <h2 className="text-xl sm:text-2xl font-bold">Stock inteligente</h2>
        <p className="text-slate-500 mt-1 text-sm sm:text-base">
          Alertas de reposición, estado y control por producto.
        </p>
      </div>
      <div className="p-4 sm:p-6 space-y-4">
        {lowStock.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
            Todavía no hay alertas. Cargá productos y stock para empezar.
          </div>
        )}
        {lowStock.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          >
            <div className="min-w-0">
              <div className="font-semibold text-sm sm:text-base">{item.name}</div>
              <div className="text-xs sm:text-sm text-slate-500">Disponible: {item.qty}</div>
            </div>
            <span className="rounded-full bg-red-100 text-red-700 px-3 py-1 text-xs sm:text-sm font-semibold shrink-0 self-start sm:self-auto">
              {item.status}
            </span>
          </div>
        ))}

        {textoSugerencia && (
          <div className="rounded-2xl sm:rounded-3xl border border-dashed border-emerald-300 bg-emerald-50 p-4 sm:p-5">
            <div className="text-xs sm:text-sm text-emerald-700 font-semibold">Sugerencia automática</div>
            <div className="text-base sm:text-lg font-bold mt-1 break-words">{textoSugerencia}</div>
            <div className="text-xs sm:text-sm text-slate-600 mt-2">
              Basado en ventas recientes y stock mínimo configurado.
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
