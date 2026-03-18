import { useState, useMemo } from 'react';
import { quickProducts } from '../data/mockData';
import Carrito from './Carrito';

const IconoBuscar = () => (
  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

function generarId() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function VentaRapida() {
  const [busqueda, setBusqueda] = useState('');
  const [carrito, setCarrito] = useState([]);

  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return quickProducts;
    return quickProducts.filter(
      (p) => p.name.toLowerCase().includes(q) || p.stock.toLowerCase().includes(q)
    );
  }, [busqueda]);

  const agregarAlCarrito = (nombre, price) => {
    const existente = carrito.find((i) => i.nombre === nombre);
    if (existente) {
      setCarrito((prev) =>
        prev.map((i) =>
          i.id === existente.id ? { ...i, cantidad: i.cantidad + 1 } : i
        )
      );
    } else {
      setCarrito((prev) => [
        ...prev,
        { id: generarId(), nombre, cantidad: 1, precioUnitario: price },
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
    setCarrito((prev) =>
      prev.map((i) => (i.id === id ? { ...i, cantidad: nuevaCantidad } : i))
    );
  };

  const procesarVenta = () => {
    if (carrito.length === 0) return;
    setCarrito([]);
  };

  return (
    <div className="rounded-2xl sm:rounded-[28px] bg-white border border-slate-200 shadow-lg overflow-hidden">
      <div className="p-4 sm:p-6 flex flex-col lg:grid lg:grid-cols-[1.2fr_0.9fr] gap-6 lg:gap-8 min-h-0 lg:min-h-[520px]">
        <div className="flex flex-col min-h-0">
          <div className="mb-3 sm:mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Punto de Venta</h2>
            <p className="text-slate-500 mt-1 text-sm sm:text-base">Procesa ventas rápidamente</p>
          </div>

          <div className="relative mb-4 sm:mb-6">
            <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2">
              <IconoBuscar />
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
            {productosFiltrados.length === 0 ? (
              <p className="text-slate-400 text-center py-6 sm:py-8 text-sm sm:text-base">No hay productos que coincidan</p>
            ) : (
              <ul className="p-2 space-y-1">
                {productosFiltrados.map((p) => (
                  <li key={p.name}>
                    <button
                      type="button"
                      onClick={() => agregarAlCarrito(p.name, p.price)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 sm:p-4 text-left flex items-center justify-between gap-3 sm:gap-4 hover:bg-emerald-50 hover:border-emerald-200 transition touch-manipulation"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 text-sm sm:text-base truncate">{p.name}</div>
                        <div className="text-xs sm:text-sm text-slate-500">{p.stock}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-base sm:text-lg font-bold text-slate-900">{p.price}</div>
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
            onProcesarVenta={procesarVenta}
            onBorrar={borrarDelCarrito}
            onEditarCantidad={editarCantidad}
          />
        </div>
      </div>
    </div>
  );
}
