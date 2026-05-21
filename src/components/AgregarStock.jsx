/* eslint react-hooks/set-state-in-effect: off */
import { useState, useEffect } from 'react';
import { useProductos } from '../context/ProductosContext';

function parsePrecio(str) {
  if (typeof str === 'number') return str;
  const num = parseInt(String(str).replace(/[^\d]/g, ''), 10);
  return isNaN(num) ? 0 : num;
}

function parseNumero(valor) {
  return parseFloat(String(valor || '').replace(/\./g, '').replace(',', '.')) || 0;
}

function calcularPrecioVenta(precioCompra, margenPorcentaje) {
  const compra = parseNumero(precioCompra);
  const margen = parseNumero(margenPorcentaje);
  return Math.round(compra * (1 + margen / 100));
}

function calcularMargen(precioCompra, precioVenta) {
  const compra = Number(precioCompra) || 0;
  const venta = Number(precioVenta) || 0;
  if (compra <= 0 || venta <= 0) return '';
  return (((venta - compra) / compra) * 100).toFixed(1);
}

export default function AgregarStock({ datosPorProducto = {}, onRegistrarIngreso }) {
  const { productos, loading, error } = useProductos();
  const [origenProducto, setOrigenProducto] = useState('nuevo');
  const [producto, setProducto] = useState('');
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [unidad, setUnidad] = useState('bolsas');
  const [precioCompra, setPrecioCompra] = useState('');
  const [margenPorcentaje, setMargenPorcentaje] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [numeroProveedor, setNumeroProveedor] = useState('');
  const [observacion, setObservacion] = useState('');
  const [enviado, setEnviado] = useState(false);

  const productoSeleccionado = productos.find((p) => p.name === producto);
  const unidadSugeridaCatalogo = productoSeleccionado?.stock.includes('fardos') ? 'fardos' : 'bolsas';

  useEffect(() => {
    if (productos.length === 0) {
      setOrigenProducto('nuevo');
      setProducto('');
      return;
    }
    if (!producto) {
      setProducto(productos[0].name);
    }
  }, [producto, productos]);

  useEffect(() => {
    if (origenProducto !== 'catalogo') return;
    const sel = productos.find((p) => p.name === producto);
    if (!sel) return;
    const datos = datosPorProducto[producto];
    const compra = datos?.precioCompra ?? sel.precioCompra ?? '';
    const venta =
      datos?.precioVenta != null ? datos.precioVenta : parsePrecio(sel.price) || '';
    setPrecioCompra(compra);
    setMargenPorcentaje(calcularMargen(compra, venta));
  }, [origenProducto, producto, datosPorProducto, productos]);

  useEffect(() => {
    if (origenProducto !== 'nuevo') return;
    const nombre = nombreNuevo.trim();
    if (!nombre) {
      setPrecioCompra('');
      setMargenPorcentaje('');
      return;
    }
    const datos = datosPorProducto[nombre];
    if (datos) {
      setPrecioCompra(datos.precioCompra ?? '');
      setMargenPorcentaje(calcularMargen(datos.precioCompra, datos.precioVenta));
    }
  }, [origenProducto, nombreNuevo, datosPorProducto]);

  const nombreParaIngreso =
    origenProducto === 'catalogo' ? producto : nombreNuevo.trim();

  const handleSubmit = (e) => {
    e.preventDefault();
    const cant = parseInt(cantidad, 10) || 0;
    if (cant <= 0) return;

    if (origenProducto === 'nuevo') {
      const n = nombreNuevo.trim();
      if (n.length < 2) return;
    }

    const compra = parseInt(String(precioCompra).replace(/\D/g, ''), 10) || 0;
    const venta = calcularPrecioVenta(precioCompra, margenPorcentaje);
    if (onRegistrarIngreso) {
      onRegistrarIngreso(nombreParaIngreso, cant, compra, venta, proveedor.trim(), numeroProveedor.trim(), unidad, observacion.trim());
    }
    setEnviado(true);
    setCantidad('');
    setProveedor('');
    setNumeroProveedor('');
    setObservacion('');
    if (origenProducto === 'catalogo') {
      setUnidad(unidadSugeridaCatalogo);
      setPrecioCompra(compra || '');
      setMargenPorcentaje(margenPorcentaje || '');
    } else {
      setNombreNuevo('');
      setPrecioCompra('');
      setMargenPorcentaje('');
    }
    setTimeout(() => setEnviado(false), 3000);
  };

  const puedeEnviar =
    (origenProducto === 'catalogo' && producto && productos.length > 0) ||
    (origenProducto === 'nuevo' && nombreNuevo.trim().length >= 2);

  return (
    <section className="rounded-2xl sm:rounded-[28px] bg-white border border-slate-200 shadow-lg overflow-hidden">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Agregar stock</h2>
          <p className="text-slate-500 mt-1 text-sm sm:text-base">
            Registra ingresos del catálogo o cargá un <strong>producto nuevo</strong>.
          </p>
          {loading && <p className="text-slate-400 mt-1 text-sm">Cargando productos...</p>}
          {error && <p className="text-amber-700 mt-1 text-sm">{error}</p>}
        </div>
        {enviado && (
          <span className="rounded-full bg-emerald-100 text-emerald-700 px-4 py-2 text-sm font-semibold">
            Ingreso registrado
          </span>
        )}
      </div>
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
        <div>
          <span className="block text-sm font-medium text-slate-700 mb-2">Producto</span>
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              type="button"
              disabled={productos.length === 0}
              onClick={() => {
                setOrigenProducto('catalogo');
                setNombreNuevo('');
                const p0 = productos[0];
                if (p0) {
                  setProducto(p0.name);
                  setUnidad(p0.stock.includes('fardos') ? 'fardos' : 'bolsas');
                }
              }}
              className={`rounded-xl px-4 py-2 text-sm font-semibold border transition touch-manipulation ${
                origenProducto === 'catalogo'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-50'
              }`}
            >
              Del catálogo
            </button>
            <button
              type="button"
              onClick={() => {
                setOrigenProducto('nuevo');
                setNombreNuevo('');
                setUnidad('bolsas');
              }}
              className={`rounded-xl px-4 py-2 text-sm font-semibold border transition touch-manipulation ${
                origenProducto === 'nuevo'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Producto nuevo
            </button>
          </div>

          {origenProducto === 'catalogo' ? (
            <select
              value={producto}
              onChange={(e) => {
                setProducto(e.target.value);
                const p = productos.find((x) => x.name === e.target.value);
                setUnidad(p?.stock.includes('fardos') ? 'fardos' : 'bolsas');
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 px-4 text-slate-800 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
              required
            >
              {productos.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name} — {p.stock}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={nombreNuevo}
              onChange={(e) => setNombreNuevo(e.target.value)}
              placeholder="Nombre del producto (ej: Heno pelletizado)"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 px-4 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
              minLength={2}
              required={origenProducto === 'nuevo'}
            />
          )}
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
              % de ganancia
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={margenPorcentaje}
              onChange={(e) => setMargenPorcentaje(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 px-4 text-slate-800 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
              placeholder="Ej: 30"
            />
          </div>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <span className="block text-sm font-medium text-emerald-800">Precio de venta calculado</span>
          <span className="mt-1 block text-xl font-bold text-emerald-900">
            ${calcularPrecioVenta(precioCompra, margenPorcentaje).toLocaleString('es-AR').replace(/,/g, '.')}
          </span>
          <span className="text-xs text-emerald-700">
            Se usa este precio al vender por bolsa/fardo/unidad.
          </span>
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
          disabled={!puedeEnviar}
          className="w-full sm:w-auto rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none text-white font-semibold py-3 px-6 transition shadow-sm"
        >
          Registrar ingreso
        </button>
      </form>
    </section>
  );
}
