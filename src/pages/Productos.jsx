import { useState, useMemo } from 'react';
import { quickProducts, pedidosClientes } from '../data/mockData';
import {
  ventasPorProducto,
  ventasPorProductoPorMes,
} from '../data/reportesData';

function formatMoneda(n) {
  return '$' + Number(n).toLocaleString('es-AR').replace(/,/g, '.');
}

function fechaHoy() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function Productos() {
  const [mesBalance, setMesBalance] = useState(
    ventasPorProductoPorMes.length > 0 ? ventasPorProductoPorMes[ventasPorProductoPorMes.length - 1].mes : 'jun'
  );
  const [listaPedidos, setListaPedidos] = useState(() => [...pedidosClientes]);
  const [mostrarFormPedido, setMostrarFormPedido] = useState(false);
  const [productoPedido, setProductoPedido] = useState('');
  const [clientePedido, setClientePedido] = useState('');

  const datosMes = ventasPorProductoPorMes.find((m) => m.mes === mesBalance);
  const aRenovar = datosMes
    ? [...datosMes.productos].sort((a, b) => b.unidades - a.unidades)
    : [];

  const masVendidos = [...ventasPorProducto].sort((a, b) => (b.unidades ?? b.ventas) - (a.unidades ?? a.ventas));

  const nombresEnCatalogo = useMemo(() => quickProducts.map((p) => p.name), []);
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

  return (
    <div className="space-y-6 sm:space-y-8">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">Productos</h1>
      <p className="text-slate-600 -mt-4">
        Catálogo de productos, balance por mes, pedidos de clientes y lo que más salió.
      </p>

      {/* Pedidos de clientes + Top "lo que más piden y no tengo" */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
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
              <div className="border border-slate-100 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-sm">
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
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 mb-1">Balance por mes</h2>
        <p className="text-slate-500 text-sm mb-4">
          Según la salida de cada mes, esto es lo que conviene renovar (ordenado por unidades vendidas).
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
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
        <div className="border border-slate-100 rounded-2xl overflow-hidden">
          <table className="w-full text-left">
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
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 mb-1">Lo que más salió</h2>
        <p className="text-slate-500 text-sm mb-4">
          Ranking de productos por unidades vendidas (período total).
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
        <h2 className="text-xl font-bold text-slate-800 mb-4">Catálogo y precios</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickProducts.map((p) => (
            <div
              key={p.name}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-bold">{p.name}</div>
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
                <span className="text-xl font-bold">{p.price}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
