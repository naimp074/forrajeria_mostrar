import { useEffect, useMemo, useState } from 'react';
import Carrito from './Carrito';
import { useStock } from '../context/StockContext';
import { useProductos } from '../context/ProductosContext';
import { crearPresupuesto, listarPresupuestos } from '../services/supabaseData';

const PRESUPUESTOS_KEY = 'forrajeria_presupuestos_v2';

function generarId() {
  return `pres-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parsePrecio(str) {
  if (typeof str === 'number') return str;
  const num = parseInt(String(str).replace(/[^\d]/g, ''), 10);
  return isNaN(num) ? 0 : num;
}

function formatPrecio(num) {
  return '$' + Number(num || 0).toLocaleString('es-AR').replace(/,/g, '.');
}

function getPresupuestos() {
  try {
    return JSON.parse(localStorage.getItem(PRESUPUESTOS_KEY) || '[]');
  } catch {
    return [];
  }
}

function guardarPresupuesto(presupuesto) {
  const list = getPresupuestos();
  list.unshift(presupuesto);
  localStorage.setItem(PRESUPUESTOS_KEY, JSON.stringify(list));
  return list;
}

export default function PresupuestoRapido() {
  const { porProducto } = useStock();
  const { productos, loading: loadingProductos, error: errorProductos } = useProductos();
  const [busqueda, setBusqueda] = useState('');
  const [carrito, setCarrito] = useState([]);
  const [presupuestos, setPresupuestos] = useState(() => getPresupuestos());
  const [mensaje, setMensaje] = useState(null);
  const [loadingPresupuestos, setLoadingPresupuestos] = useState(true);
  const [errorPresupuestos, setErrorPresupuestos] = useState(null);

  useEffect(() => {
    let mounted = true;

    listarPresupuestos()
      .then((rows) => {
        if (!mounted) return;
        setPresupuestos(rows);
        setErrorPresupuestos(null);
      })
      .catch((err) => {
        if (!mounted) return;
        console.warn('No se pudieron cargar presupuestos desde Supabase.', err);
        setErrorPresupuestos('No se pudieron cargar presupuestos desde Supabase.');
      })
      .finally(() => {
        if (mounted) setLoadingPresupuestos(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    const conPrecio = productos.map((p) => {
      const datos = porProducto?.[p.name] || {};
      const precioVentaNum = Number(datos.precioVenta);
      const precioUnitario = Number.isFinite(precioVentaNum) ? precioVentaNum : parsePrecio(p.price);

      const cantidadComprada = Number(datos.cantidadComprada) || 0;
      const cantidadVendida = Number(datos.cantidadVendida) || 0;
      const stockActual = Math.max(0, cantidadComprada - cantidadVendida);

      const unidad = p.stock?.includes('fardos') ? 'fardos' : 'bolsas';

      return { ...p, precioUnitario, stockActual, unidad };
    });

    if (!q) return conPrecio;
    return conPrecio.filter((p) => p.name.toLowerCase().includes(q) || p.stock.toLowerCase().includes(q));
  }, [busqueda, porProducto, productos]);

  const agregarAlCarrito = (nombre, precioUnitario) => {
    const existente = carrito.find((i) => i.nombre === nombre);
    if (existente) {
      setCarrito((prev) =>
        prev.map((i) => (i.nombre === nombre ? { ...i, cantidad: i.cantidad + 1 } : i))
      );
    } else {
      setCarrito((prev) => [
        ...prev,
        { id: generarId(), nombre, cantidad: 1, precioUnitario },
      ]);
    }
  };

  const borrarDelCarrito = (id) => {
    setCarrito((prev) => prev.filter((i) => i.id !== id));
  };

  const editarCantidad = (id, nuevaCantidad) => {
    if (nuevaCantidad < 1) {
      borrarDelCarrito(id);
      return;
    }
    setCarrito((prev) => prev.map((i) => (i.id === id ? { ...i, cantidad: nuevaCantidad } : i)));
  };

  const procesarPresupuesto = async ({ cliente, metodoPago, items, totalNumerico } = {}) => {
    if (carrito.length === 0) return;

    const fecha = new Date().toISOString().slice(0, 10);
    const lineas = (items || carrito).map((i) => ({
      producto: i.nombre,
      cantidad: i.cantidad,
      precioUnitario: i.precioUnitario,
      subtotal: i.cantidad * i.precioUnitario,
    }));

    const nuevo = {
      id: generarId(),
      fecha,
      cliente: cliente || 'Cliente General',
      metodoPago: metodoPago || 'efectivo',
      lineas,
      total: totalNumerico || lineas.reduce((s, l) => s + l.subtotal, 0),
    };

    const list = guardarPresupuesto(nuevo);
    setPresupuestos(list);
    try {
      const guardado = await crearPresupuesto(nuevo);
      setPresupuestos((prev) => prev.map((p) => (p.id === nuevo.id ? guardado : p)));
      setErrorPresupuestos(null);
    } catch (err) {
      console.warn('No se pudo guardar el presupuesto en Supabase.', err);
      setErrorPresupuestos('El presupuesto quedo guardado localmente porque Supabase no respondio.');
    }
    setCarrito([]);
    setMensaje('Presupuesto generado correctamente.');
    setTimeout(() => setMensaje(null), 3500);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="rounded-2xl sm:rounded-[28px] bg-white border border-slate-200 shadow-lg overflow-hidden">
        <div className="p-4 sm:p-6 flex flex-col lg:grid lg:grid-cols-[1.2fr_0.9fr] gap-6 lg:gap-8 min-h-0 lg:min-h-[520px]">
          <div className="flex flex-col min-h-0">
            <div className="mb-3 sm:mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Presupuesto</h2>
              <p className="text-slate-500 mt-1 text-sm sm:text-base">Generá presupuestos sin descontar stock</p>
            </div>

            <div className="relative mb-4 sm:mb-6">
              <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs sm:text-sm">
                Buscar
              </span>
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar productos..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 sm:py-3.5 pl-10 sm:pl-12 pr-4 text-slate-800 text-sm sm:text-base placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 focus:bg-white transition"
              />
            </div>

            <div className="flex-1 overflow-auto rounded-xl border border-slate-100 bg-slate-50/50 min-h-[180px] sm:min-h-[200px]">
              {loadingProductos ? (
                <p className="text-slate-400 text-center py-6 sm:py-8 text-sm sm:text-base">
                  Cargando productos...
                </p>
              ) : errorProductos ? (
                <p className="text-amber-700 text-center py-6 sm:py-8 text-sm sm:text-base">
                  {errorProductos}
                </p>
              ) : productosFiltrados.length === 0 ? (
                <p className="text-slate-400 text-center py-6 sm:py-8 text-sm sm:text-base">
                  Todavía no hay productos. Cargá el primero desde Stock.
                </p>
              ) : (
                <ul className="p-2 space-y-1">
                  {productosFiltrados.map((p) => (
                    <li key={p.name}>
                      <button
                        type="button"
                        onClick={() => agregarAlCarrito(p.name, p.precioUnitario)}
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 sm:p-4 text-left flex items-center justify-between gap-3 sm:gap-4 hover:bg-emerald-50 hover:border-emerald-200 transition touch-manipulation"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800 text-sm sm:text-base truncate">{p.name}</div>
                          <div className="text-xs sm:text-sm text-slate-500">
                            Stock actual: {p.stockActual} {p.unidad}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-base sm:text-lg font-bold text-slate-900">{formatPrecio(p.precioUnitario)}</div>
                          <span className="text-xs text-emerald-600 font-medium">Agregar</span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="lg:min-h-0 shrink-0 lg:shrink">
            <Carrito
              items={carrito}
              onProcesarVenta={procesarPresupuesto}
              onBorrar={borrarDelCarrito}
              onEditarCantidad={editarCantidad}
              titulo="Presupuesto"
              botonTexto="Procesar Presupuesto"
            />
          </div>
        </div>
      </div>

      {mensaje && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 text-sm font-semibold">
          {mensaje}
        </div>
      )}

      {loadingPresupuestos && (
        <div className="rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 px-4 py-3 text-sm">
          Cargando presupuestos desde Supabase...
        </div>
      )}

      {errorPresupuestos && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 text-sm">
          {errorPresupuestos}
        </div>
      )}

      {presupuestos.length > 0 && (
        <section className="rounded-2xl sm:rounded-[28px] bg-white border border-slate-200 shadow-lg overflow-hidden">
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-200">
            <h2 className="text-xl sm:text-2xl font-bold">Últimos presupuestos</h2>
            <p className="text-slate-500 mt-1 text-sm sm:text-base">Guardados en Supabase cuando la base esta aplicada</p>
          </div>
          <div className="p-4 sm:p-6 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 text-sm">
                  <th className="pb-3 font-semibold">Fecha</th>
                  <th className="pb-3 font-semibold">Cliente</th>
                  <th className="pb-3 font-semibold">Líneas</th>
                  <th className="pb-3 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {presupuestos.slice(0, 5).map((p) => (
                  <tr key={p.id} className="align-middle">
                    <td className="py-3 text-slate-700 text-sm">{p.fecha}</td>
                    <td className="py-3 text-slate-800 font-medium text-sm">{p.cliente}</td>
                    <td className="py-3 text-slate-700 text-sm">{p.lineas?.length || 0}</td>
                    <td className="py-3 text-emerald-700 font-bold text-sm">{formatPrecio(p.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

