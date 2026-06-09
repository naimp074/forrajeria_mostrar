import { useEffect, useMemo, useState } from 'react';
import { useProductos } from '../context/ProductosContext';
import { useStock } from '../context/StockContext';
import { buscarStockProducto } from '../utils/nombreProducto';
import { extraerKgDelNombre, parseNumeroFlexible } from '../utils/preciosKg';
import { enriquecerProductoConMargenes } from '../utils/margenes';
import { borrarPromo as borrarPromoSupabase, crearPromo, listarPromos } from '../services/supabaseData';

function formatMoneda(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
}

function formatPorcentaje(n) {
  const valor = Number(n) || 0;
  return `${valor.toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`;
}

function etiquetaUnidad(unidad) {
  if (unidad === 'fardos') return 'fardo';
  if (unidad === 'unidades') return 'unidad';
  return 'bolsa';
}

function generarId() {
  return `promo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function ResumenCard({ titulo, valor, detalle, tono = 'slate' }) {
  const tonos = {
    slate: 'border-slate-200 bg-white text-slate-900',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    amber: 'border-amber-200 bg-amber-50 text-amber-950',
    red: 'border-red-200 bg-red-50 text-red-950',
  };

  return (
    <div className={`rounded-2xl border p-4 ${tonos[tono] || tonos.slate}`}>
      <div className="text-xs font-bold uppercase tracking-wide opacity-70">{titulo}</div>
      <div className="mt-1 text-xl sm:text-2xl font-black">{valor}</div>
      {detalle && <p className="mt-1 text-xs sm:text-sm opacity-75 leading-snug">{detalle}</p>}
    </div>
  );
}

export default function Promos() {
  const { productos, loading, error } = useProductos();
  const { porProducto } = useStock();
  const [productoId, setProductoId] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [margenPromo, setMargenPromo] = useState('20');
  const [nombrePromo, setNombrePromo] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [items, setItems] = useState([]);
  const [promosGuardadas, setPromosGuardadas] = useState([]);
  const [loadingPromos, setLoadingPromos] = useState(true);
  const [errorPromos, setErrorPromos] = useState('');
  const [guardandoPromo, setGuardandoPromo] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const cargarPromos = async () => {
    setLoadingPromos(true);
    try {
      const rows = await listarPromos();
      setPromosGuardadas(rows);
      setErrorPromos('');
    } catch (err) {
      setErrorPromos(err.message || 'No se pudieron cargar las promos.');
    } finally {
      setLoadingPromos(false);
    }
  };

  useEffect(() => {
    cargarPromos();
  }, []);

  const catalogo = useMemo(() => {
    return productos
      .filter((producto) => producto.activo !== false && producto.unidad !== 'kg')
      .map((producto) => {
        const stock = buscarStockProducto(porProducto, producto.name);
        const precioCompra = Number(stock.precioCompra) || Number(producto.precioCompra) || 0;
        const precioVentaStock = Number(stock.precioVenta) || 0;
        const kgPorUnidad = extraerKgDelNombre(producto.name);
        const enriquecido = enriquecerProductoConMargenes(producto, precioCompra, {
          kgPorUnidad,
          precioVentaStock,
          precioKgStock: Number(producto.precioKg) || 0,
        });

        return {
          id: producto.id,
          nombre: producto.name,
          unidad: producto.unidad || 'bolsas',
          costo: enriquecido.precioCompra,
          precioNormal: enriquecido.price,
        };
      })
      .filter((producto) => producto.costo > 0 || producto.precioNormal > 0)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [productos, porProducto]);

  const catalogoFiltrado = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return catalogo;
    return catalogo.filter((producto) => producto.nombre.toLowerCase().includes(q));
  }, [busqueda, catalogo]);

  const productoSeleccionado = catalogo.find((producto) => producto.id === productoId) || catalogoFiltrado[0];
  const cantidadNumerica = Math.max(1, parseNumeroFlexible(cantidad) || 1);
  const margenPromoNumerico = Math.max(0, parseNumeroFlexible(margenPromo));

  const agregarProducto = () => {
    if (!productoSeleccionado) return;
    setItems((prev) => [
      ...prev,
      {
        id: generarId(),
        productoId: productoSeleccionado.id,
        nombre: productoSeleccionado.nombre,
        unidad: productoSeleccionado.unidad,
        cantidad: cantidadNumerica,
        costo: productoSeleccionado.costo,
        precioNormal: productoSeleccionado.precioNormal,
      },
    ]);
    setCantidad('1');
  };

  const cambiarCantidad = (id, valor) => {
    const nextCantidad = Math.max(0.001, parseNumeroFlexible(valor) || 0);
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, cantidad: nextCantidad } : item)),
    );
  };

  const quitarItem = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const costoTotal = items.reduce((sum, item) => sum + item.costo * item.cantidad, 0);
  const precioNormalTotal = items.reduce((sum, item) => sum + item.precioNormal * item.cantidad, 0);
  const gananciaNormal = precioNormalTotal - costoTotal;
  const margenNormal = costoTotal > 0 ? (gananciaNormal / costoTotal) * 100 : 0;
  const precioPromo = costoTotal > 0 ? Math.round(costoTotal * (1 + margenPromoNumerico / 100)) : 0;
  const gananciaPromo = precioPromo - costoTotal;
  const diferenciaContraNormal = precioNormalTotal - precioPromo;
  const precioMinimoSinPerder = Math.ceil(costoTotal);
  const promoPierdePlata = precioPromo < costoTotal;

  const guardarPromo = async () => {
    const nombre = nombrePromo.trim();
    if (!nombre || items.length === 0 || precioPromo <= 0) {
      setMensaje('Poné un nombre y agregá productos para guardar la promo.');
      return;
    }
    setGuardandoPromo(true);
    setMensaje('');
    try {
      const nuevaPromo = await crearPromo({
        nombre,
        items,
        costoTotal,
        precioNormalTotal,
        margenPromo: margenPromoNumerico,
        precioPromo,
        gananciaPromo,
      });
      setPromosGuardadas((prev) => [nuevaPromo, ...prev.filter((promo) => promo.id !== nuevaPromo.id)]);
      setMensaje('Promo guardada en Supabase. Ya aparece en Ventas.');
      setNombrePromo('');
    } catch (err) {
      setMensaje(err.message || 'No se pudo guardar la promo. Revisá que el SQL de promos esté aplicado.');
    } finally {
      setGuardandoPromo(false);
    }
  };

  const borrarPromo = async (id) => {
    try {
      await borrarPromoSupabase(id);
      setPromosGuardadas((prev) => prev.filter((promo) => promo.id !== id));
    } catch (err) {
      setMensaje(err.message || 'No se pudo borrar la promo.');
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">Promos</h1>
        <p className="text-slate-600 mt-1 text-sm sm:text-base max-w-3xl">
          Armá combos con productos por bolsa, fardo o unidad. Compará el precio normal con un precio
          de promo para bajar el margen sin dejar de ganar.
        </p>
      </div>

      <section className="rounded-2xl sm:rounded-3xl bg-white border border-slate-200 shadow-lg overflow-hidden">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-200">
          <h2 className="text-xl sm:text-2xl font-bold">Armar promo</h2>
          <p className="text-slate-500 mt-1 text-sm">
            Solo se muestran productos que se venden por bolsa, fardo o unidad.
          </p>
        </div>

        <div className="p-4 sm:p-6 space-y-5">
          {mensaje && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm font-semibold text-emerald-800">
              {mensaje}
            </div>
          )}

          {loading && (
            <p className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-500">
              Cargando productos...
            </p>
          )}
          {error && (
            <p className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
              {error}
            </p>
          )}
          {errorPromos && (
            <p className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
              {errorPromos} Si es la primera vez, ejecutá <strong>supabase/promos.sql</strong> en Supabase.
            </p>
          )}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
            <h3 className="font-semibold text-slate-800">Agregar producto a la promo</h3>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.35fr_auto] gap-3 items-end">
              <label className="block">
                <span className="block text-sm font-medium text-slate-600 mb-1">Buscar producto</span>
                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre..."
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-600 mb-1">Cantidad</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  placeholder="Ej: 1"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </label>
              <button
                type="button"
                onClick={agregarProducto}
                disabled={!productoSeleccionado}
                className="rounded-xl bg-emerald-600 text-white px-4 py-2.5 font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none"
              >
                Agregar
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Producto seleccionado</label>
              <select
                value={productoSeleccionado?.id || ''}
                onChange={(e) => setProductoId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {catalogoFiltrado.length === 0 && <option value="">No hay productos</option>}
                {catalogoFiltrado.map((producto) => (
                  <option key={producto.id} value={producto.id}>
                    {producto.nombre} · {formatMoneda(producto.precioNormal)} / {etiquetaUnidad(producto.unidad)}
                  </option>
                ))}
              </select>
              {productoSeleccionado && (
                <p className="mt-2 text-xs text-slate-500">
                  Costo: {formatMoneda(productoSeleccionado.costo)} · Venta normal:{' '}
                  {formatMoneda(productoSeleccionado.precioNormal)}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.7fr] gap-5 items-start">
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                <h3 className="font-bold text-slate-800">Productos de la promo</h3>
              </div>

              {items.length === 0 ? (
                <div className="p-5 text-sm text-slate-500 text-center">
                  Agregá productos para calcular la promo.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
                        <th className="px-4 py-3 font-semibold">Producto</th>
                        <th className="px-4 py-3 font-semibold">Cantidad</th>
                        <th className="px-4 py-3 font-semibold">Costo</th>
                        <th className="px-4 py-3 font-semibold">Venta normal</th>
                        <th className="px-4 py-3 font-semibold">Ganancia normal</th>
                        <th className="px-4 py-3 font-semibold text-right">Quitar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item) => {
                        const costoLinea = item.costo * item.cantidad;
                        const ventaLinea = item.precioNormal * item.cantidad;
                        return (
                          <tr key={item.id}>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-900">{item.nombre}</div>
                              <div className="text-xs text-slate-500">/{etiquetaUnidad(item.unidad)}</div>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={String(item.cantidad).replace('.', ',')}
                                onChange={(e) => cambiarCantidad(item.id, e.target.value)}
                                className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-slate-800"
                              />
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-700">{formatMoneda(costoLinea)}</td>
                            <td className="px-4 py-3 font-medium text-slate-700">{formatMoneda(ventaLinea)}</td>
                            <td className="px-4 py-3 font-bold text-emerald-700">
                              {formatMoneda(ventaLinea - costoLinea)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => quitarItem(item.id)}
                                className="text-xs font-semibold text-red-600 hover:underline"
                              >
                                Quitar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
              <label className="block">
                <span className="block text-sm font-medium text-slate-600 mb-1">Nombre de la promo</span>
                <input
                  type="text"
                  value={nombrePromo}
                  onChange={(e) => {
                    setNombrePromo(e.target.value);
                    setMensaje('');
                  }}
                  placeholder="Ej: Combo caballo, Promo perros..."
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </label>

              <label className="block">
                <span className="block text-sm font-medium text-slate-600 mb-1">% ganancia para la promo</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={margenPromo}
                  onChange={(e) => setMargenPromo(e.target.value)}
                  placeholder="Ej: 20"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
                <ResumenCard
                  titulo="Costo total"
                  valor={formatMoneda(costoTotal)}
                  detalle="Suma del costo de todo lo que agregaste."
                />
                <ResumenCard
                  titulo="Precio normal"
                  valor={formatMoneda(precioNormalTotal)}
                  detalle={`Margen actual combinado: ${formatPorcentaje(margenNormal)}`}
                  tono="emerald"
                />
                <ResumenCard
                  titulo="Precio promo sugerido"
                  valor={formatMoneda(precioPromo)}
                  detalle={`Con ${formatPorcentaje(margenPromoNumerico)} de ganancia sobre costo.`}
                  tono={promoPierdePlata ? 'red' : 'amber'}
                />
                <ResumenCard
                  titulo="Ganancia con promo"
                  valor={formatMoneda(gananciaPromo)}
                  detalle={`Precio mínimo para no perder: ${formatMoneda(precioMinimoSinPerder)}`}
                  tono={gananciaPromo >= 0 ? 'emerald' : 'red'}
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 space-y-2">
                <div className="flex justify-between gap-3">
                  <span>Bajás contra precio normal</span>
                  <span className="font-bold text-slate-900">{formatMoneda(diferenciaContraNormal)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Ganancia normal</span>
                  <span className="font-bold text-emerald-700">{formatMoneda(gananciaNormal)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Ganancia que resignás</span>
                  <span className="font-bold text-amber-700">
                    {formatMoneda(Math.max(0, gananciaNormal - gananciaPromo))}
                  </span>
                </div>
              </div>

              {items.length > 0 && (
                <>
                  <div className={`rounded-2xl border p-4 text-sm font-medium ${promoPierdePlata ? 'bg-red-50 border-red-200 text-red-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
                    {promoPierdePlata
                      ? 'Con este precio promo perdés plata. Subí el margen o el precio final.'
                      : 'Con este margen seguís ganando, aunque vendas más barato que el precio normal.'}
                  </div>
                  <button
                    type="button"
                    onClick={guardarPromo}
                    disabled={guardandoPromo}
                    className="w-full rounded-xl bg-emerald-600 text-white px-4 py-3 font-semibold hover:bg-emerald-700 disabled:opacity-60 disabled:pointer-events-none"
                  >
                    {guardandoPromo ? 'Guardando...' : 'Guardar promo para Ventas'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl sm:rounded-3xl bg-white border border-slate-200 shadow-lg overflow-hidden">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-200">
          <h2 className="text-xl sm:text-2xl font-bold">Promos guardadas</h2>
          <p className="text-slate-500 mt-1 text-sm">
            Estas promos aparecen en Ventas para cargarlas rápido al carrito.
          </p>
        </div>
        <div className="p-4 sm:p-6 space-y-3">
          {loadingPromos ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
              Cargando promos...
            </div>
          ) : promosGuardadas.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
              Todavía no hay promos guardadas.
            </div>
          ) : (
            promosGuardadas.map((promo) => (
              <article
                key={promo.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div>
                  <h3 className="font-bold text-slate-900">{promo.nombre}</h3>
                  <p className="text-sm text-slate-500">
                    {promo.items?.length || 0} producto{promo.items?.length === 1 ? '' : 's'} · Precio promo{' '}
                    <span className="font-bold text-emerald-700">{formatMoneda(promo.precioPromo)}</span>
                  </p>
                  <p className="text-xs text-slate-400">
                    Normal {formatMoneda(promo.precioNormalTotal)} · Ganancia promo {formatMoneda(promo.gananciaPromo)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => borrarPromo(promo.id)}
                  className="self-start sm:self-center text-sm font-semibold text-red-600 hover:underline"
                >
                  Borrar
                </button>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
