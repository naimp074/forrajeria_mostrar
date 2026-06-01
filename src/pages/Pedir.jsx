import { useCallback, useEffect, useMemo, useState } from 'react';
import { listarCatalogoPublico } from '../services/supabaseData';

function formatMoneda(n) {
  return '$' + Number(n).toLocaleString('es-AR').replace(/,/g, '.');
}

function etiquetaUnidad(unidad) {
  if (unidad === 'fardos') return 'fardo';
  if (unidad === 'unidades') return 'unidad';
  if (unidad === 'kg') return 'kg';
  return 'bolsa';
}

function soportaPrecioKg(producto) {
  const u = producto.unidad || 'bolsas';
  return u !== 'kg' && u !== 'unidades' && (producto.precioKg > 0 || producto.kgPorUnidad > 0);
}

export default function Pedir() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');

  const cargarCatalogo = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listarCatalogoPublico();
      setProductos(rows);
      setError(null);
    } catch (err) {
      setProductos([]);
      setError(err.message || 'No se pudo cargar el catálogo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarCatalogo();
  }, [cargarCatalogo]);

  const catalogoFiltrado = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return productos;
    return productos.filter((p) => p.name.toLowerCase().includes(q));
  }, [busqueda, productos]);

  return (
    <div className="min-h-dvh bg-gradient-to-b from-emerald-50 via-slate-50 to-slate-100 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-emerald-100/80 bg-white/90 backdrop-blur-md shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Forrajería
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Lista de precios</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <p className="text-slate-600 text-sm sm:text-base max-w-2xl">
          Consultá todos nuestros productos con precio por unidad, bolsa, fardo o kg.
        </p>

        <section className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
            <h2 className="text-lg font-bold text-slate-800">Todos los productos</h2>
            {!loading && !error && (
              <span className="text-xs font-medium text-slate-500">
                {catalogoFiltrado.length} producto{catalogoFiltrado.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm text-slate-800 mb-4 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
          />

          {loading && <p className="text-slate-500 py-6 text-center">Cargando productos...</p>}
          {error && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 text-sm space-y-2">
              <p>{error}</p>
              <p className="text-xs text-amber-800">
                Si es la primera vez, ejecutá el SQL de{' '}
                <code className="bg-amber-100 px-1 rounded">supabase/public_pedir.sql</code> en Supabase.
              </p>
            </div>
          )}
          {!loading && !error && catalogoFiltrado.length === 0 && (
            <p className="text-slate-500 py-8 text-center rounded-xl border border-dashed border-slate-200">
              No hay productos para mostrar.
            </p>
          )}

          {!loading && !error && catalogoFiltrado.length > 0 && (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2.5 pr-3 font-semibold">Producto</th>
                    <th className="py-2.5 px-3 font-semibold max-w-[9rem] sm:max-w-none leading-snug">
                      Precio por unidad o por bolsa
                    </th>
                    <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Precio / kg</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {catalogoFiltrado.map((p) => {
                    const u = p.unidad || 'bolsas';
                    const esKg = u === 'kg';
                    const esPieza = u === 'unidades';
                    const muestraKg = soportaPrecioKg(p);
                    const labelUnidad = esKg ? 'kg' : esPieza ? 'unidad' : etiquetaUnidad(u);

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80">
                        <td className="py-3 pr-3 font-medium text-slate-900 align-top leading-snug">
                          {p.name}
                        </td>
                        <td className="py-3 px-3 align-top whitespace-nowrap">
                          {p.price > 0 ? (
                            <span className="font-bold text-slate-900">
                              {formatMoneda(p.price)}
                              {esKg ? '/kg' : ''}
                              {!esKg && !esPieza && (
                                <span className="block text-[10px] font-normal text-slate-400">
                                  /{labelUnidad}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 align-top whitespace-nowrap">
                          {esKg ? (
                            <span className="text-slate-400 text-xs">—</span>
                          ) : muestraKg && p.precioKg > 0 ? (
                            <span className="font-bold text-emerald-700">
                              {formatMoneda(p.precioKg)}/kg
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-xs text-slate-400 text-center mt-4">
            Los precios son orientativos y pueden variar.
          </p>
        </section>
      </main>
    </div>
  );
}
