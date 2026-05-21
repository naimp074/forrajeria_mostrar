import { useState, useMemo } from 'react';
import { useProductos } from '../context/ProductosContext';
import { useStock } from '../context/StockContext';
import { registrarIngresoStock } from '../services/supabaseData';

function formatMoneda(n) {
  return '$' + Number(n).toLocaleString('es-AR').replace(/,/g, '.');
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

function fechaHoy() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function Productos() {
  const { productos, loading, error, crearProducto, actualizarProducto, borrarProducto } = useProductos();
  const { setPorProducto } = useStock();
  const ventasPorProducto = [];
  const ventasPorProductoPorMes = [];
  const [mesBalance, setMesBalance] = useState('');
  const [listaPedidos, setListaPedidos] = useState([]);
  const [mostrarFormPedido, setMostrarFormPedido] = useState(false);
  const [productoPedido, setProductoPedido] = useState('');
  const [clientePedido, setClientePedido] = useState('');
  const [mostrarFormProducto, setMostrarFormProducto] = useState(false);
  const [editandoProducto, setEditandoProducto] = useState(null);
  const [formProducto, setFormProducto] = useState({
    nombre: '',
    precioUnidad: '',
    margenPorcentaje: '',
    precioKg: '',
    precioCompra: '',
    cantidad: '',
    unidad: 'bolsas',
    proveedor: '',
    numeroProveedor: '',
    observacion: '',
    favorito: false,
  });
  const [guardandoProducto, setGuardandoProducto] = useState(false);
  const [productoError, setProductoError] = useState(null);

  const datosMes = ventasPorProductoPorMes.find((m) => m.mes === mesBalance);
  const aRenovar = datosMes
    ? [...datosMes.productos].sort((a, b) => b.unidades - a.unidades)
    : [];

  const masVendidos = [...ventasPorProducto].sort((a, b) => (b.unidades ?? b.ventas) - (a.unidades ?? a.ventas));

  const nombresEnCatalogo = useMemo(() => productos.map((p) => p.name), [productos]);
  const { topNoTengo, ultimosPedidos } = useMemo(() => {
    const porProducto = {};
    listaPedidos.forEach((ped) => {
      porProducto[ped.producto] = (porProducto[ped.producto] || 0) + 1;
    });
    const noTengo = Object.entries(porProducto)
      .filter(([nombre]) => !nombresEnCatalogo.includes(nombre))
      .map(([nombre, veces]) => ({ producto: nombre, veces }))
      .sort((a, b) => b.veces - a.veces);
    const ultimos = [...listaPedidos]
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, 8);
    return { topNoTengo: noTengo, ultimosPedidos: ultimos };
  }, [nombresEnCatalogo, listaPedidos]);

  const guardarPedido = (e) => {
    e.preventDefault();
    const producto = productoPedido.trim();
    if (!producto) return;
    setListaPedidos((prev) => [
      { producto, cliente: clientePedido.trim() || 'Cliente', fecha: fechaHoy() },
      ...prev,
    ]);
    setProductoPedido('');
    setClientePedido('');
    setMostrarFormPedido(false);
  };

  const iniciarEdicion = (producto) => {
    setEditandoProducto(producto);
    setMostrarFormProducto(true);
    setFormProducto({
      nombre: producto.name || '',
      precioUnidad: String(producto.price ?? ''),
      margenPorcentaje: calcularMargen(producto.precioCompra, producto.price),
      precioKg: String(producto.precioKg ?? ''),
      precioCompra: String(producto.precioCompra ?? ''),
      cantidad: '',
      unidad: producto.unidad || 'bolsas',
      proveedor: '',
      numeroProveedor: '',
      observacion: '',
      favorito: Boolean(producto.favorite),
    });
    setProductoError(null);
  };

  const cancelarEdicion = () => {
    setMostrarFormProducto(false);
    setEditandoProducto(null);
    setProductoError(null);
    setFormProducto({
      nombre: '',
      precioUnidad: '',
      margenPorcentaje: '',
      precioKg: '',
      precioCompra: '',
      cantidad: '',
      unidad: 'bolsas',
      proveedor: '',
      numeroProveedor: '',
      observacion: '',
      favorito: false,
    });
  };

  const iniciarNuevoProducto = () => {
    setEditandoProducto(null);
    setMostrarFormProducto(true);
    setFormProducto({
      nombre: '',
      precioUnidad: '',
      margenPorcentaje: '',
      precioKg: '',
      precioCompra: '',
      cantidad: '',
      unidad: 'bolsas',
      proveedor: '',
      numeroProveedor: '',
      observacion: '',
      favorito: false,
    });
    setProductoError(null);
  };

  const guardarProductoEditado = async (e) => {
    e.preventDefault();
    const nombre = formProducto.nombre.trim();
    if (!nombre) {
      setProductoError('El nombre del producto es obligatorio.');
      return;
    }
    const cantidad = parseInt(String(formProducto.cantidad).replace(/\D/g, ''), 10) || 0;
    if (!editandoProducto && cantidad <= 0) {
      setProductoError('La cantidad inicial debe ser mayor a 0.');
      return;
    }

    setGuardandoProducto(true);
    setProductoError(null);
    try {
      const precioVentaCalculado = calcularPrecioVenta(formProducto.precioCompra, formProducto.margenPorcentaje);
      const payload = { ...formProducto, nombre, precioUnidad: precioVentaCalculado };
      if (editandoProducto) {
        await actualizarProducto(editandoProducto.id, payload);
      } else {
        await crearProducto(payload);
        const precioCompra = parseInt(String(formProducto.precioCompra).replace(/\D/g, ''), 10) || 0;
        const precioVenta = precioVentaCalculado;
        const ingreso = {
          producto: nombre,
          cantidad,
          precioCompra,
          precioVenta,
          proveedor: formProducto.proveedor.trim(),
          numeroProveedor: formProducto.numeroProveedor.trim(),
          unidad: formProducto.unidad || 'unidades',
          observacion: formProducto.observacion.trim(),
          fecha: new Date().toISOString().slice(0, 10),
        };
        setPorProducto((prev) => {
          const actual = prev[nombre] || {
            cantidadComprada: 0,
            cantidadVendida: 0,
            precioCompra: 0,
            precioVenta: 0,
          };
          return {
            ...prev,
            [nombre]: {
              ...actual,
              cantidadComprada: actual.cantidadComprada + cantidad,
              precioCompra: precioCompra || actual.precioCompra,
              precioVenta: precioVenta || actual.precioVenta,
            },
          };
        });
        await registrarIngresoStock(ingreso);
      }
      cancelarEdicion();
    } catch (err) {
      console.warn('No se pudo guardar el producto.', err);
      setProductoError('No se pudo guardar el producto. Revisá que no exista otro con el mismo nombre.');
    } finally {
      setGuardandoProducto(false);
    }
  };

  const confirmarBorrado = async (producto) => {
    const seguro = window.confirm(
      `¿Seguro que querés borrar "${producto.name}"? Esta acción no se puede deshacer.`
    );
    if (!seguro) return;

    setProductoError(null);
    try {
      await borrarProducto(producto.id);
      if (editandoProducto?.id === producto.id) cancelarEdicion();
    } catch (err) {
      console.warn('No se pudo borrar el producto.', err);
      setProductoError('No se pudo borrar el producto.');
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">Productos</h1>
      <p className="text-slate-600 -mt-4">
        Catálogo de productos, balance por mes, pedidos de clientes y lo que más salió.
      </p>

      {/* Pedidos de clientes + Top "lo que más piden y no tengo" */}
      <section className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-1">Pedidos de clientes</h2>
            <p className="text-slate-500 text-sm">
              Lo que te piden y no tenés en catálogo: conviene traer para no perder ventas.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMostrarFormPedido((v) => !v)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
          >
            <span aria-hidden>+</span>
            Anotar lo que piden
          </button>
        </div>

        {mostrarFormPedido && (
          <form onSubmit={guardarPedido} className="mb-6 p-4 rounded-2xl border border-slate-200 bg-slate-50/80">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Qué te piden los clientes</h3>
            <div className="flex flex-wrap gap-3 items-end">
              <label className="flex-1 min-w-[180px]">
                <span className="block text-xs font-medium text-slate-500 mb-1">Producto que piden</span>
                <input
                  type="text"
                  value={productoPedido}
                  onChange={(e) => setProductoPedido(e.target.value)}
                  placeholder="Ej: Henos de cebada, Afrechillo..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  autoFocus
                />
              </label>
              <label className="flex-1 min-w-[140px]">
                <span className="block text-xs font-medium text-slate-500 mb-1">Cliente (opcional)</span>
                <input
                  type="text"
                  value={clientePedido}
                  onChange={(e) => setClientePedido(e.target.value)}
                  placeholder="Nombre del cliente"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!productoPedido.trim()}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none"
                >
                  Guardar pedido
                </button>
                <button
                  type="button"
                  onClick={() => { setMostrarFormPedido(false); setProductoPedido(''); setClientePedido(''); }}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </form>
        )}

        {ultimosPedidos.length > 0 ? (
          <>
            {topNoTengo.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">
                  Top: lo que más te piden y no tenés
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {topNoTengo.map((item, i) => (
                    <div
                      key={item.producto}
                      className="flex items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-200 text-amber-800 font-bold">
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-800">{item.producto}</div>
                        <div className="text-sm text-slate-500">
                          {item.veces} {item.veces === 1 ? 'pedido' : 'pedidos'}
                        </div>
                      </div>
                      <span className="rounded-full bg-amber-200/80 text-amber-800 px-2 py-1 text-xs font-medium">
                        Traer
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-2">
                Últimos pedidos
              </h3>
              <div className="overflow-x-auto rounded-2xl border border-slate-100 -mx-1 sm:mx-0">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="py-2 px-4 font-semibold text-slate-700">Producto</th>
                      <th className="py-2 px-4 font-semibold text-slate-700">Cliente</th>
                      <th className="py-2 px-4 font-semibold text-slate-700">Fecha</th>
                      <th className="py-2 px-4 font-semibold text-slate-700 text-center">Tenés</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ultimosPedidos.map((ped, idx) => {
                      const tiene = nombresEnCatalogo.includes(ped.producto);
                      return (
                        <tr key={idx} className="border-b border-slate-100 last:border-0">
                          <td className="py-2 px-4 font-medium text-slate-800">{ped.producto}</td>
                          <td className="py-2 px-4 text-slate-600">{ped.cliente}</td>
                          <td className="py-2 px-4 text-slate-500">{ped.fecha}</td>
                          <td className="py-2 px-4 text-center">
                            {tiene ? (
                              <span className="text-emerald-600 font-medium">Sí</span>
                            ) : (
                              <span className="text-amber-600 font-medium">No</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <p className="text-slate-500 py-4">
            Todavía no hay pedidos anotados. Usá el botón <strong>Anotar lo que piden</strong> para cargar lo que te piden los clientes.
          </p>
        )}
      </section>

      {/* Balance por mes — qué renovar */}
      <section className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 mb-1">Balance por mes</h2>
        <p className="text-slate-500 text-sm mb-4">
          Según la salida de cada mes, esto es lo que conviene renovar (ordenado por unidades vendidas).
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {ventasPorProductoPorMes.length === 0 && (
            <p className="text-slate-500 text-sm">Todavía no hay ventas registradas para mostrar balance.</p>
          )}
          {ventasPorProductoPorMes.map((m) => (
            <button
              key={m.mes}
              type="button"
              onClick={() => setMesBalance(m.mes)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                mesBalance === m.mes
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {m.mesLabel}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto rounded-2xl border border-slate-100 -mx-1 sm:mx-0">
          <table className="w-full min-w-[360px] text-left text-sm sm:text-base">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-3 px-4 font-semibold text-slate-700">Producto</th>
                <th className="py-3 px-4 font-semibold text-slate-700 text-right">Unidades vendidas</th>
                <th className="py-3 px-4 font-semibold text-slate-700 text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {aRenovar.map((p, i) => (
                <tr key={p.nombre} className="border-b border-slate-100 last:border-0">
                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-800">{p.nombre}</span>
                    {i === 0 && (
                      <span className="ml-2 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-semibold">
                        Mayor salida
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-slate-700">{p.unidades}</td>
                  <td className="py-3 px-4 text-right text-slate-600">{formatMoneda(p.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Lo que más salió (ranking total) */}
      <section className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 mb-1">Lo que más salió</h2>
        <p className="text-slate-500 text-sm mb-4">
          Ranking de productos por unidades vendidas (período total).
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {masVendidos.length === 0 && (
            <p className="text-slate-500 text-sm">Todavía no hay ventas registradas.</p>
          )}
          {masVendidos.map((p, i) => (
            <div
              key={p.nombre}
              className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-bold">
                {i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-slate-800">{p.nombre}</div>
                <div className="text-sm text-slate-500">
                  {p.unidades != null ? `${p.unidades} unidades` : ''} · {formatMoneda(p.ventas)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Catálogo */}
      <section>
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-800">Catálogo y precios</h2>
          <button
            type="button"
            onClick={iniciarNuevoProducto}
            className="w-full sm:w-auto rounded-xl bg-emerald-600 px-4 py-3 sm:py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Agregar producto
          </button>
        </div>
        {productoError && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {productoError}
          </div>
        )}
        {mostrarFormProducto && (
          <form
            onSubmit={guardarProductoEditado}
            className="mb-6 rounded-3xl border border-emerald-200 bg-white p-4 sm:p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  {editandoProducto ? 'Editar producto' : 'Agregar producto'}
                </h3>
                <p className="text-sm text-slate-500">
                  {editandoProducto
                    ? 'Modificá los datos y guardá los cambios.'
                    : 'Registrá el producto y su primer ingreso de stock.'}
                </p>
              </div>
              <button
                type="button"
                onClick={cancelarEdicion}
                className="w-full sm:w-auto rounded-xl border border-slate-300 px-4 py-3 sm:py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="block sm:col-span-2 lg:col-span-3">
                <span className="block text-sm font-medium text-slate-600 mb-1">Nombre</span>
                <input
                  type="text"
                  value={formProducto.nombre}
                  onChange={(e) => setFormProducto((prev) => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Nombre del producto (ej: Heno pelletizado)"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </label>
              {!editandoProducto && (
                <label className="block">
                  <span className="block text-sm font-medium text-slate-600 mb-1">Cantidad</span>
                  <input
                    type="number"
                    min="1"
                    value={formProducto.cantidad}
                    onChange={(e) => setFormProducto((prev) => ({ ...prev, cantidad: e.target.value }))}
                    placeholder="Ej: 50"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </label>
              )}
              <label className="block">
                <span className="block text-sm font-medium text-slate-600 mb-1">Unidad</span>
                <select
                  value={formProducto.unidad}
                  onChange={(e) => setFormProducto((prev) => ({ ...prev, unidad: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="bolsas">Bolsas</option>
                  <option value="fardos">Fardos</option>
                  <option value="kg">Kg</option>
                  <option value="unidades">Unidades</option>
                </select>
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-600 mb-1">Precio de compra ($)</span>
                <input
                  type="number"
                  min="0"
                  value={formProducto.precioCompra}
                  onChange={(e) => setFormProducto((prev) => ({ ...prev, precioCompra: e.target.value }))}
                  placeholder="Ej: 1500"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-600 mb-1">% de ganancia</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formProducto.margenPorcentaje}
                  onChange={(e) => setFormProducto((prev) => ({ ...prev, margenPorcentaje: e.target.value }))}
                  placeholder="Ej: 30"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-600 mb-1">Precio por kg</span>
                <input
                  type="number"
                  min="0"
                  value={formProducto.precioKg}
                  onChange={(e) => setFormProducto((prev) => ({ ...prev, precioKg: e.target.value }))}
                  placeholder="Ej: 120"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </label>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3">
                <span className="block text-sm font-medium text-emerald-800">Precio de venta calculado</span>
                <span className="mt-1 block text-xl font-bold text-emerald-900">
                  {formatMoneda(calcularPrecioVenta(formProducto.precioCompra, formProducto.margenPorcentaje))}
                </span>
                <span className="text-xs text-emerald-700">
                  Se calcula con precio de compra + porcentaje.
                </span>
              </div>
              {!editandoProducto && (
                <>
                  <label className="block">
                    <span className="block text-sm font-medium text-slate-600 mb-1">Proveedor</span>
                    <input
                      type="text"
                      value={formProducto.proveedor}
                      onChange={(e) => setFormProducto((prev) => ({ ...prev, proveedor: e.target.value }))}
                      placeholder="Ej: Forrajes del Sur"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium text-slate-600 mb-1">Número de proveedor</span>
                    <input
                      type="text"
                      value={formProducto.numeroProveedor}
                      onChange={(e) => setFormProducto((prev) => ({ ...prev, numeroProveedor: e.target.value }))}
                      placeholder="Ej: 0810-555-1234"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </label>
                  <label className="block sm:col-span-2 lg:col-span-3">
                    <span className="block text-sm font-medium text-slate-600 mb-1">Observación (opcional)</span>
                    <textarea
                      value={formProducto.observacion}
                      onChange={(e) => setFormProducto((prev) => ({ ...prev, observacion: e.target.value }))}
                      placeholder="Ej: Proveedor X, lote 123"
                      rows={2}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
                    />
                  </label>
                </>
              )}
              <label className="flex items-center gap-2 self-end rounded-xl border border-slate-200 px-3 py-2 text-slate-700">
                <input
                  type="checkbox"
                  checked={formProducto.favorito}
                  onChange={(e) => setFormProducto((prev) => ({ ...prev, favorito: e.target.checked }))}
                  className="h-4 w-4 accent-emerald-600"
                />
                Favorito
              </label>
            </div>

            <button
              type="submit"
              disabled={guardandoProducto}
              className="mt-5 w-full sm:w-auto rounded-xl bg-emerald-600 px-5 py-3 sm:py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {guardandoProducto ? 'Guardando...' : editandoProducto ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </form>
        )}
        {loading && <p className="text-slate-500">Cargando productos...</p>}
        {error && <p className="text-amber-700">{error}</p>}
        {!loading && !error && productos.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500">
            Todavía no hay productos. Usá el botón <strong>Agregar producto</strong> para cargar el primero.
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {productos.map((p) => (
            <div
              key={p.name}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3 min-w-0">
                <div className="min-w-0">
                  <div className="text-base sm:text-lg font-bold break-words">{p.name}</div>
                  <div className="text-slate-500 text-sm mt-1">{p.stock}</div>
                </div>
                {p.favorite ? (
                  <span className="rounded-full bg-amber-100 text-amber-700 px-3 py-1 text-xs font-semibold">
                    Favorito
                  </span>
                ) : null}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-slate-500">Precio unitario</span>
                <span className="text-xl font-bold">{formatMoneda(p.price)}</span>
              </div>
              <div className="mt-5 grid grid-cols-1 min-[380px]:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => iniciarEdicion(p)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-3 sm:py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => confirmarBorrado(p)}
                  className="rounded-xl bg-red-600 px-4 py-3 sm:py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Borrar
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
