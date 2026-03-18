import { useState, useMemo } from 'react';

const INGRESOS_KEY = 'forrajeria_ingresos';

function getIngresos() {
  try {
    return JSON.parse(localStorage.getItem(INGRESOS_KEY) || '[]');
  } catch {
    return [];
  }
}

export default function Proveedores() {
  const [busqueda, setBusqueda] = useState('');

  const { productToProveedores, proveedorToProducts, todosProveedores } = useMemo(() => {
    const list = getIngresos();
    const byProduct = {};
    const byProveedor = {};
    const proveedoresSet = new Set();
    list.forEach((ing) => {
      const prov = (ing.proveedor || '').trim();
      const num = (ing.numeroProveedor || '').trim();
      const key = `${prov || 'Sin nombre'}|${num}`;
      if (prov || num) proveedoresSet.add(key);
      if (ing.producto) {
        if (!byProduct[ing.producto]) byProduct[ing.producto] = [];
        const pair = { proveedor: prov || 'Sin nombre', numeroProveedor: num };
        const ya = byProduct[ing.producto].some(
          (p) => p.proveedor === pair.proveedor && p.numeroProveedor === pair.numeroProveedor
        );
        if (!ya) byProduct[ing.producto].push(pair);
      }
      if (key) {
        if (!byProveedor[key]) byProveedor[key] = { proveedor: prov || 'Sin nombre', numeroProveedor: num, productos: [] };
        if (ing.producto && !byProveedor[key].productos.includes(ing.producto)) {
          byProveedor[key].productos.push(ing.producto);
        }
      }
    });
    const todosProveedores = Array.from(proveedoresSet).map((k) => {
      const [proveedor, numeroProveedor] = k.split('|');
      return { proveedor: proveedor === 'Sin nombre' ? '' : proveedor, numeroProveedor, key: k };
    });
    return {
      productToProveedores: byProduct,
      proveedorToProducts: byProveedor,
      todosProveedores,
    };
  }, []);

  const busquedaNorm = busqueda.trim().toLowerCase();
  const resultadosProducto = useMemo(() => {
    if (!busquedaNorm) return [];
    return Object.entries(productToProveedores).filter(([producto]) =>
      producto.toLowerCase().includes(busquedaNorm)
    );
  }, [busquedaNorm, productToProveedores]);

  const resultadosProveedor = useMemo(() => {
    if (!busquedaNorm) return [];
    return Object.entries(proveedorToProducts).filter(([_, data]) => {
      const nombre = (data.proveedor || '').toLowerCase();
      const num = (data.numeroProveedor || '').toLowerCase();
      return nombre.includes(busquedaNorm) || num.includes(busquedaNorm);
    });
  }, [busquedaNorm, proveedorToProducts]);

  const hayResultados = resultadosProducto.length > 0 || resultadosProveedor.length > 0;
  const listadoIngresos = getIngresos();

  return (
    <div className="space-y-6 sm:space-y-8">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">Proveedores</h1>
      <p className="text-slate-600 -mt-4">
        Datos tomados de los ingresos de Stock. Buscá por producto o por proveedor.
      </p>

      <section className="rounded-[28px] bg-white border border-slate-200 shadow-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-800">Buscador</h2>
          <p className="text-slate-500 mt-1">
            Escribí un producto para ver quién te lo vende, o un proveedor para ver todo lo que te vende.
          </p>
        </div>
        <div className="p-6">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Ej: Maíz, Forrajes del Sur, 0810..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 px-4 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
            aria-label="Buscar por producto o proveedor"
          />

          {busqueda.trim() && (
            <div className="mt-6 space-y-6">
              {resultadosProducto.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">
                    Productos que coinciden — quién te lo vende
                  </h3>
                  <div className="space-y-3">
                    {resultadosProducto.map(([producto, proveedores]) => (
                      <div
                        key={producto}
                        className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4"
                      >
                        <div className="font-semibold text-slate-800">{producto}</div>
                        <ul className="mt-2 space-y-1 text-sm text-slate-600">
                          {proveedores.map((p, i) => (
                            <li key={i}>
                              {p.proveedor}
                              {p.numeroProveedor ? ` — ${p.numeroProveedor}` : ''}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {resultadosProveedor.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">
                    Proveedores que coinciden — qué te vende
                  </h3>
                  <div className="space-y-3">
                    {resultadosProveedor.map(([key, data]) => (
                      <div
                        key={key}
                        className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4"
                      >
                        <div className="font-semibold text-slate-800">
                          {data.proveedor || 'Sin nombre'}
                          {data.numeroProveedor ? (
                            <span className="text-slate-600 font-normal ml-2">{data.numeroProveedor}</span>
                          ) : null}
                        </div>
                        <div className="mt-2 text-sm text-slate-600">
                          Te vende: {data.productos.length ? data.productos.join(', ') : '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {busqueda.trim() && !hayResultados && (
                <p className="text-slate-500 py-4">
                  No hay resultados para &quot;{busqueda.trim()}&quot;. Los datos se cargan desde los ingresos de Stock (con proveedor y número).
                </p>
              )}
            </div>
          )}

          {!busqueda.trim() && listadoIngresos.length === 0 && (
            <div className="mt-6 rounded-2xl border border-slate-200 border-dashed bg-slate-50/50 p-8 text-center text-slate-500">
              Todavía no hay ingresos con proveedor. Registrá ingresos en <strong>Stock</strong> completando proveedor y número de proveedor para ver acá quién te vende cada producto.
            </div>
          )}

          {!busqueda.trim() && listadoIngresos.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">
                Todos los proveedores (según Stock)
              </h3>
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="py-3 px-4 font-semibold text-slate-700">Proveedor</th>
                      <th className="py-3 px-4 font-semibold text-slate-700">Número</th>
                      <th className="py-3 px-4 font-semibold text-slate-700">Productos que te vende</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todosProveedores.map(({ key, proveedor, numeroProveedor }) => {
                      const data = proveedorToProducts[key];
                      if (!data) return null;
                      return (
                        <tr key={key} className="border-b border-slate-100 last:border-0">
                          <td className="py-3 px-4 font-medium text-slate-800">{proveedor || '—'}</td>
                          <td className="py-3 px-4 text-slate-600">{numeroProveedor || '—'}</td>
                          <td className="py-3 px-4 text-slate-600">{data.productos.join(', ') || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
