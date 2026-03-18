import { lowStock } from '../data/mockData';

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
  const textoSugerencia = sugerenciaReposicion(lowStock);

  return (
    <section className="rounded-[28px] bg-white border border-slate-200 shadow-lg overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-200">
        <h2 className="text-2xl font-bold">Stock inteligente</h2>
        <p className="text-slate-500 mt-1">
          Alertas de reposición, estado y control por producto.
        </p>
      </div>
      <div className="p-6 space-y-4">
        {lowStock.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-between gap-4"
          >
            <div>
              <div className="font-semibold">{item.name}</div>
              <div className="text-sm text-slate-500">Disponible: {item.qty}</div>
            </div>
            <span className="rounded-full bg-red-100 text-red-700 px-3 py-1 text-sm font-semibold">
              {item.status}
            </span>
          </div>
        ))}

        {textoSugerencia && (
          <div className="rounded-3xl border border-dashed border-emerald-300 bg-emerald-50 p-5">
            <div className="text-sm text-emerald-700 font-semibold">Sugerencia automática</div>
            <div className="text-lg font-bold mt-1">{textoSugerencia}</div>
            <div className="text-sm text-slate-600 mt-2">
              Basado en ventas recientes y stock mínimo configurado.
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
