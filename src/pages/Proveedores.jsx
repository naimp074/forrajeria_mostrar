import { useCallback, useEffect, useMemo, useState } from 'react';
import { listarIngresosStock, listarProveedoresCatalogo } from '../services/supabaseData';
import { useProductos } from '../context/ProductosContext';
import { usePagination } from '../hooks/usePagination';
import Paginacion from '../components/Paginacion';

const INGRESOS_KEY = 'forrajeria_ingresos_v2';

function getIngresos() {
  try {
    return JSON.parse(localStorage.getItem(INGRESOS_KEY) || '[]');
  } catch {
    return [];
  }
}

export default function Proveedores() {
  const { productos, recargarProductos } = useProductos();
  const [busqueda, setBusqueda] = useState('');
  const [ingresos, setIngresos] = useState(() => getIngresos());
  const [error, setError] = useState(null);

  const cargarProveedores = useCallback(async ({ refrescarCatalogo = false } = {}) => {
    try {
      if (refrescarCatalogo) {
        await recargarProductos();
      }
      const [stockRows, catalogoRows] = await Promise.all([
        listarIngresosStock(),
        listarProveedoresCatalogo(),
      ]);
      const rows = [...stockRows, ...catalogoRows];
      setIngresos(rows.length ? rows : getIngresos());
      setError(null);
    } catch (err) {
      console.warn('No se pudieron cargar proveedores desde Supabase.', err);
      setIngresos(getIngresos());
      setError('No se pudieron cargar proveedores desde Supabase.');
    }
  }, [recargarProductos]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      cargarProveedores();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [cargarProveedores]);

  useEffect(() => {
    const handleProveedorActualizado = () => {
      cargarProveedores({ refrescarCatalogo: true });
    };
    window.addEventListener('forrajeria:proveedores-actualizados', handleProveedorActualizado);
    return () => {
      window.removeEventListener('forrajeria:proveedores-actualizados', handleProveedorActualizado);
    };
  }, [cargarProveedores]);

  const proveedoresDesdeCatalogo = useMemo(() => {
    return productos
      .filter((producto) => producto.proveedor || producto.numeroProveedor)
      .map((producto) => ({
        producto: producto.name,
        proveedor: producto.proveedor || '',
        numeroProveedor: producto.numeroProveedor || '',
        cantidad: 0,
        precioCompra: 0,
        precioVenta: 0,
        unidad: '',
        fecha: null,
        origen: 'catalogo',
      }));
  }, [productos]);

  const { productToProveedores, proveedorToProducts, todosProveedores } = useMemo(() => {
    const list = [...ingresos, ...proveedoresDesdeCatalogo];
    const byProduct = {};
    const byProveedor = {};
    const proveedoresSet = new Set();
    list.forEach((ing) => {
      const prov = (ing.proveedor || '').trim();
      const num = (ing.numeroProveedor || '').trim();
      const tieneProveedor = Boolean(prov || num);
      const key = `${prov || 'Sin nombre'}|${num}`;
      if (tieneProveedor) proveedoresSet.add(key);
      if (ing.producto) {
        if (!byProduct[ing.producto]) byProduct[ing.producto] = [];
        const pair = { proveedor: prov || 'Sin nombre', numeroProveedor: num };
        const ya = byProduct[ing.producto].some(
          (p) => p.proveedor === pair.proveedor && p.numeroProveedor === pair.numeroProveedor
        );
        if (!ya) byProduct[ing.producto].push(pair);
      }
      if (tieneProveedor) {
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
  }, [ingresos, proveedoresDesdeCatalogo]);

  const busquedaNorm = busqueda.trim().toLowerCase();
  const resultadosProducto = useMemo(() => {
    if (!busquedaNorm) return [];
    return Object.entries(productToProveedores).filter(([producto]) =>
      producto.toLowerCase().includes(busquedaNorm)
    );
  }, [busquedaNorm, productToProveedores]);

  const resultadosProveedor = useMemo(() => {
    if (!busquedaNorm) return [];
    return Object.entries(proveedorToProducts).filter(([, data]) => {
      const nombre = (data.proveedor || '').toLowerCase();
      const num = (data.numeroProveedor || '').toLowerCase();
      return nombre.includes(busquedaNorm) || num.includes(busquedaNorm);
    });
  }, [busquedaNorm, proveedorToProducts]);

  const hayResultados = resultadosProducto.length > 0 || resultadosProveedor.length > 0;
  const tieneProveedores = todosProveedores.length > 0;

  const proveedoresPaginacion = usePagination(todosProveedores, {
    pageSize: 15,
    resetKey: busqueda,
  });
  const productosBusquedaPaginacion = usePagination(resultadosProducto, {
    pageSize: 10,
    resetKey: busqueda,
  });
  const proveedoresBusquedaPaginacion = usePagination(resultadosProveedor, {
    pageSize: 10,
    resetKey: busqueda,
  });

  return (
    <div className="space-y-6 sm:space-y-8">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">Proveedores</h1>
      <p className="text-slate-600 -mt-4 text-sm sm:text-base max-w-prose">
        Datos tomados de los ingresos de Stock. Buscá por producto o por proveedor.
      </p>
      {error && (
        <p className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
          {error}
        </p>
      )}

      <section className="rounded-2xl sm:rounded-[28px] bg-white border border-slate-200 shadow-lg overflow-hidden">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-200">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Buscador</h2>
          <p className="text-slate-500 mt-1 text-sm sm:text-base">
            Escribí un producto para ver quién te lo vende, o un proveedor para ver todo lo que te vende.
          </p>
        </div>
        <div className="p-4 sm:p-6">
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
                    {productosBusquedaPaginacion.paginatedItems.map(([producto, proveedores]) => (
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
                  <Paginacion
                    page={productosBusquedaPaginacion.page}
                    totalPages={productosBusquedaPaginacion.totalPages}
                    totalItems={productosBusquedaPaginacion.totalItems}
                    from={productosBusquedaPaginacion.from}
                    to={productosBusquedaPaginacion.to}
                    onPageChange={productosBusquedaPaginacion.setPage}
                  />
                </div>
              )}

              {resultadosProveedor.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">
                    Proveedores que coinciden — qué te vende
                  </h3>
                  <div className="space-y-3">
                    {proveedoresBusquedaPaginacion.paginatedItems.map(([key, data]) => (
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
                  <Paginacion
                    page={proveedoresBusquedaPaginacion.page}
                    totalPages={proveedoresBusquedaPaginacion.totalPages}
                    totalItems={proveedoresBusquedaPaginacion.totalItems}
                    from={proveedoresBusquedaPaginacion.from}
                    to={proveedoresBusquedaPaginacion.to}
                    onPageChange={proveedoresBusquedaPaginacion.setPage}
                  />
                </div>
              )}

              {busqueda.trim() && !hayResultados && (
                <p className="text-slate-500 py-4">
                  No hay resultados para &quot;{busqueda.trim()}&quot;. Los datos se cargan desde los ingresos de Stock (con proveedor y número).
                </p>
              )}
            </div>
          )}

          {!busqueda.trim() && !tieneProveedores && (
            <div className="mt-6 rounded-2xl border border-slate-200 border-dashed bg-slate-50/50 p-5 sm:p-8 text-center text-slate-500">
              Todavía no hay proveedores cargados. Agregalos desde <strong>Productos</strong> o al registrar un ingreso en <strong>Stock</strong>.
            </div>
          )}

          {!busqueda.trim() && tieneProveedores && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">
                Todos los proveedores
              </h3>
              <div className="rounded-2xl border border-slate-200 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="py-3 px-4 font-semibold text-slate-700">Proveedor</th>
                      <th className="py-3 px-4 font-semibold text-slate-700">Número</th>
                      <th className="py-3 px-4 font-semibold text-slate-700">Productos que te vende</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proveedoresPaginacion.paginatedItems.map(({ key, proveedor, numeroProveedor }) => {
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
              <Paginacion
                page={proveedoresPaginacion.page}
                totalPages={proveedoresPaginacion.totalPages}
                totalItems={proveedoresPaginacion.totalItems}
                from={proveedoresPaginacion.from}
                to={proveedoresPaginacion.to}
                onPageChange={proveedoresPaginacion.setPage}
              />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
