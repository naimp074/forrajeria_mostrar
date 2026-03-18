import { useState, useEffect } from 'react';
import { quickProducts } from '../data/mockData';

function parsePrecio(str) {
  if (typeof str === 'number') return str;
  const num = parseInt(String(str).replace(/[^\d]/g, ''), 10);
  return isNaN(num) ? 0 : num;
}

export default function AgregarStock({ datosPorProducto = {}, onRegistrarIngreso }) {
  const [producto, setProducto] = useState(quickProducts[0]?.name ?? '');
  const [cantidad, setCantidad] = useState('');
  const [unidad, setUnidad] = useState('bolsas');
  const [precioCompra, setPrecioCompra] = useState('');
  const [precioVenta, setPrecioVenta] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [numeroProveedor, setNumeroProveedor] = useState('');
  const [observacion, setObservacion] = useState('');
  const [enviado, setEnviado] = useState(false);

  const productoSeleccionado = quickProducts.find((p) => p.name === producto);
  const unidadSugerida = productoSeleccionado?.stock.includes('fardos') ? 'fardos' : 'bolsas';

  useEffect(() => {
    if (productoSeleccionado) {
      const datos = datosPorProducto[producto];
      const compra = datos?.precioCompra ?? productoSeleccionado.precioCompra ?? '';
      const venta = datos?.precioVenta != null
        ? datos.precioVenta
        : parsePrecio(productoSeleccionado.price) || '';
      setPrecioCompra(compra);
      setPrecioVenta(venta === '' ? '' : venta);
    }
  }, [producto]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const cant = parseInt(cantidad, 10) || 0;
    if (cant <= 0) return;
    const compra = parseInt(String(precioCompra).replace(/\D/g, ''), 10) || 0;
    const venta = parseInt(String(precioVenta).replace(/\D/g, ''), 10) || 0;
    if (onRegistrarIngreso) {
      onRegistrarIngreso(producto, cant, compra, venta, proveedor.trim(), numeroProveedor.trim());
    }
    setEnviado(true);
    setCantidad('');
    setProveedor('');
    setNumeroProveedor('');
    setObservacion('');
    setUnidad(unidadSugerida);
    setPrecioCompra(compra || '');
    setPrecioVenta(venta || '');
    setTimeout(() => setEnviado(false), 3000);
  };

  return (
    <section className="rounded-[28px] bg-white border border-slate-200 shadow-lg overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Agregar stock</h2>
          <p className="text-slate-500 mt-1">
            Registra ingresos de mercadería por producto.
          </p>
        </div>
        {enviado && (
          <span className="rounded-full bg-emerald-100 text-emerald-700 px-4 py-2 text-sm font-semibold">
            Ingreso registrado
          </span>
        )}
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Producto
          </label>
          <select
            value={producto}
            onChange={(e) => {
              setProducto(e.target.value);
              const p = quickProducts.find((x) => x.name === e.target.value);
              setUnidad(p?.stock.includes('fardos') ? 'fardos' : 'bolsas');
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 px-4 text-slate-800 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
            required
          >
            {quickProducts.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name} — {p.stock}
              </option>
            ))}
          </select>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Cantidad
            </label>
            <input
              type="number"
              min="1"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 px-4 text-slate-800 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
              placeholder="Ej: 50"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Unidad
            </label>
            <select
              value={unidad}
              onChange={(e) => setUnidad(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 px-4 text-slate-800 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
            >
              <option value="bolsas">Bolsas</option>
              <option value="fardos">Fardos</option>
              <option value="kg">Kg</option>
              <option value="unidades">Unidades</option>
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Precio de compra ($)
            </label>
            <input
              type="number"
              min="0"
              value={precioCompra}
              onChange={(e) => setPrecioCompra(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 px-4 text-slate-800 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
              placeholder="Ej: 1500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Precio de venta ($)
            </label>
            <input
              type="number"
              min="0"
              value={precioVenta}
              onChange={(e) => setPrecioVenta(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 px-4 text-slate-800 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
              placeholder="Ej: 2000"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Proveedor
            </label>
            <input
              type="text"
              value={proveedor}
              onChange={(e) => setProveedor(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 px-4 text-slate-800 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
              placeholder="Ej: Forrajes del Sur"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Número de proveedor
            </label>
            <input
              type="text"
              value={numeroProveedor}
              onChange={(e) => setNumeroProveedor(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 px-4 text-slate-800 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
              placeholder="Ej: 0810-555-1234"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Observación (opcional)
          </label>
          <textarea
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 px-4 text-slate-800 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 resize-none"
            rows={2}
            placeholder="Ej: Proveedor X, lote 123"
          />
        </div>

        <button
          type="submit"
          className="w-full sm:w-auto rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 transition shadow-sm"
        >
          Registrar ingreso
        </button>
      </form>
    </section>
  );
}
