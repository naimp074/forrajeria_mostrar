import { useState } from 'react';

function parsePrecio(val) {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (typeof val === 'string') return parseInt(val.replace(/[^\d]/g, ''), 10) || 0;
  return 0;
}

function parsePorcentaje(valor) {
  const texto = String(valor ?? '').trim();
  if (!texto) return 0;
  const limpio = texto.replace(/[^\d,.-]/g, '');
  const normalizado = limpio.includes(',')
    ? limpio.replace(/\./g, '').replace(',', '.')
    : limpio;
  const n = parseFloat(normalizado);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

function parseMonto(valor) {
  const texto = String(valor ?? '').trim();
  if (!texto) return 0;
  const limpio = texto.replace(/[^\d,.-]/g, '');
  const normalizado = limpio.includes(',')
    ? limpio.replace(/\./g, '').replace(',', '.')
    : limpio;
  const n = parseFloat(normalizado);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

function pctDesdeDescuento(descuento, subtotal) {
  if (descuento <= 0 || subtotal <= 0) return '';
  const pct = (descuento / subtotal) * 100;
  const redondeado = Math.round(pct * 10) / 10;
  if (redondeado % 1 === 0) return String(Math.round(redondeado));
  return String(redondeado).replace('.', ',');
}

function lineTotal(item) {
  if (typeof item.subtotal === 'number' && !Number.isNaN(item.subtotal)) {
    return item.subtotal;
  }
  const c = Number(item.cantidad) || 0;
  return c * parsePrecio(item.precioUnitario);
}

function formatPrecio(num) {
  return '$' + num.toLocaleString('es-AR').replace(/,/g, '.');
}

const IconoCarrito = () => (
  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const IconoEfectivo = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2h-2m-4-1v8m0-8V7a2 2 0 012-2h2a2 2 0 012 2v1" />
  </svg>
);

const IconoTarjeta = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const IconoTransfer = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

const METODOS_PAGO = [
  { id: 'efectivo', label: 'Efectivo', Icon: IconoEfectivo },
  { id: 'tarjeta', label: 'Tarjeta', Icon: IconoTarjeta },
  { id: 'transfer', label: 'Transfer', Icon: IconoTransfer },
];

export default function Carrito({
  items = [],
  vacio,
  titulo = 'Carrito',
  botonTexto = 'Procesar Venta',
  permitirDescuento = false,
  procesando = false,
  onProcesarVenta,
  onBorrar,
  onEditarCantidad,
  onEditarCarritoItem,
}) {
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [cliente, setCliente] = useState('Cliente General');
  const [editandoId, setEditandoId] = useState(null);
  const [cantidadEdit, setCantidadEdit] = useState(1);
  const [valorEdicion, setValorEdicion] = useState('');
  const [descuentoState, setDescuentoState] = useState({ itemsKey: '', pct: '', pesos: '' });
  const mostrarVacio = vacio ?? items.length === 0;

  const subtotalNumerico =
    items.length > 0 ? items.reduce((sum, i) => sum + lineTotal(i), 0) : 0;
  const itemsKey = items.map((item) => `${item.id}:${lineTotal(item)}`).join('|');
  const descuentoPctStr = descuentoState.itemsKey === itemsKey ? descuentoState.pct : '';
  const descuentoPesosStr = descuentoState.itemsKey === itemsKey ? descuentoState.pesos : '';

  const descuentoNumerico = permitirDescuento
    ? Math.min(parseMonto(descuentoPesosStr), subtotalNumerico)
    : 0;
  const totalNumerico = Math.max(0, subtotalNumerico - descuentoNumerico);
  const totalFormato = totalNumerico > 0 ? formatPrecio(totalNumerico) : '$0.00';
  const subtotalFormato = subtotalNumerico > 0 ? formatPrecio(subtotalNumerico) : '$0.00';

  const onDescuentoPctChange = (valor) => {
    const desc = Math.min(
      Math.round(subtotalNumerico * parsePorcentaje(valor) / 100),
      subtotalNumerico,
    );
    setDescuentoState({
      itemsKey,
      pct: valor,
      pesos: desc > 0 ? String(desc) : '',
    });
  };

  const onDescuentoPesosChange = (valor) => {
    const desc = Math.min(parseMonto(valor), subtotalNumerico);
    setDescuentoState({
      itemsKey,
      pct: pctDesdeDescuento(desc, subtotalNumerico),
      pesos: valor,
    });
  };

  const iniciarEdicion = (item) => {
    setEditandoId(item.id);
    if (item.modoVenta === 'kilo') {
      setValorEdicion(item.kg != null ? String(item.kg).replace('.', ',') : '');
      setCantidadEdit(1);
    } else if (item.modoVenta === 'pesos') {
      setValorEdicion(item.montoPesos != null ? String(Math.round(item.montoPesos)) : '');
      setCantidadEdit(1);
    } else {
      setCantidadEdit(item.cantidad);
      setValorEdicion('');
    }
  };
  const aplicarEdicion = (id) => {
    const item = items.find((i) => i.id === id);
    if (!item) {
      setEditandoId(null);
      return;
    }
    if (item.modoVenta === 'kilo' && onEditarCarritoItem) {
      const kg = parseFloat(String(valorEdicion).replace(',', '.')) || 0;
      if (kg > 0) onEditarCarritoItem(id, { kg });
      setEditandoId(null);
      return;
    }
    if (item.modoVenta === 'pesos' && onEditarCarritoItem) {
      const monto =
        parseFloat(String(valorEdicion).replace(/\./g, '').replace(',', '.')) ||
        parseFloat(String(valorEdicion).replace(',', '.')) ||
        0;
      if (monto > 0) onEditarCarritoItem(id, { montoPesos: monto });
      setEditandoId(null);
      return;
    }
    if (cantidadEdit < 1) {
      onBorrar?.(id);
    } else {
      onEditarCantidad?.(id, cantidadEdit);
    }
    setEditandoId(null);
  };

  return (
    <div id="carrito-venta" className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <IconoCarrito />
        <h2 className="text-lg sm:text-xl font-bold">{titulo}</h2>
      </div>

      <div className="mt-3 sm:mt-4">
        <label className="block text-sm font-medium text-slate-600 mb-1.5">
          Cliente (Opcional)
        </label>
        <div className="relative">
          <select
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 sm:py-3 pl-4 pr-10 text-slate-800 text-sm sm:text-base appearance-none cursor-pointer focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
          >
            <option>Cliente General</option>
            <option>Juan Pérez</option>
            <option>La Escondida</option>
            <option>Carlos Gómez</option>
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </div>
      </div>

      <div className="mt-3 sm:mt-4">
        <label className="block text-sm font-medium text-slate-600 mb-2">
          Método de Pago
        </label>
        <div className="grid grid-cols-3 gap-2">
          {METODOS_PAGO.map((metodo) => {
            const { id, label, Icon: PagoIcon } = metodo;
            return (
            <button
              key={id}
              type="button"
              onClick={() => setMetodoPago(id)}
              className={`flex min-h-12 flex-col items-center justify-center gap-1.5 rounded-xl border py-2.5 sm:py-3 px-2 transition touch-manipulation ${
                metodoPago === id
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <PagoIcon />
              <span className="text-xs sm:text-sm font-semibold">{label}</span>
            </button>
            );
          })}
        </div>
      </div>

      {!mostrarVacio && permitirDescuento && subtotalNumerico > 0 && (
        <div
          id="carrito-descuentos"
          className="mt-3 sm:mt-4 space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 sm:p-4"
        >
          <h3 className="text-sm font-semibold text-emerald-900">Descuento</h3>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Subtotal</span>
            <span className="font-semibold text-slate-800">{subtotalFormato}</span>
          </div>
          <label className="block text-sm">
            <span className="block text-slate-600 mb-1.5">Descuento (%)</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={descuentoPctStr}
                onChange={(e) => onDescuentoPctChange(e.target.value)}
                placeholder="0"
                className="w-full min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-800 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
              />
              <span className="text-slate-500 font-semibold shrink-0">%</span>
            </div>
          </label>
          <label className="block text-sm">
            <span className="block text-slate-600 mb-1.5">Descuento ($)</span>
            <input
              type="text"
              inputMode="numeric"
              value={descuentoPesosStr}
              onChange={(e) => onDescuentoPesosChange(e.target.value)}
              placeholder="0"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-800 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
            />
          </label>
        </div>
      )}

      <div className="border-t border-slate-200 my-3 sm:my-4" />

      <div className="min-h-[80px] sm:min-h-[120px] max-h-[28dvh] sm:max-h-[40dvh] lg:max-h-none overflow-y-auto flex flex-col">
        {mostrarVacio ? (
          <p className="text-slate-400 text-center py-4 sm:py-6 text-sm sm:text-base">Carrito vacío</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const detalle =
                item.detalleTexto ||
                `${item.cantidad} x ${typeof item.precioUnitario === 'number' ? '$' + item.precioUnitario.toLocaleString('es-AR') : item.precioUnitario}`;
              const totalItem = formatPrecio(lineTotal(item));
              const estaEditando = editandoId === item.id;
              const modoEdicionKilo = item.modoVenta === 'kilo';
              const modoEdicionPesos = item.modoVenta === 'pesos';
              const edicionGranel = modoEdicionKilo || modoEdicionPesos;
              return (
                <div
                  key={item.id}
                  className="rounded-xl bg-slate-50 border border-slate-100 p-2.5 sm:p-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-800 text-sm sm:text-base truncate">{item.nombre}</div>
                      {estaEditando && edicionGranel ? (
                        <div className="mt-2 flex flex-wrap items-end gap-2">
                          <label className="flex flex-col text-xs text-slate-500">
                            {modoEdicionKilo ? 'Kilos' : 'Monto ($)'}
                            <input
                              type="text"
                              inputMode="decimal"
                              value={valorEdicion}
                              onChange={(e) => setValorEdicion(e.target.value)}
                              className="mt-0.5 w-28 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => aplicarEdicion(item.id)}
                            className="text-sm font-medium text-emerald-600 hover:underline mb-0.5"
                          >
                            Listo
                          </button>
                        </div>
                      ) : estaEditando ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <div className="flex items-center rounded-lg border border-slate-200 bg-white">
                            <button
                              type="button"
                              onClick={() => setCantidadEdit((c) => Math.max(1, c - 1))}
                              className="px-2 sm:px-2.5 py-1 text-slate-600 hover:bg-slate-100 rounded-l-lg touch-manipulation"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min={1}
                              value={cantidadEdit}
                              onChange={(e) =>
                                setCantidadEdit(Math.max(1, parseInt(e.target.value, 10) || 1))
                              }
                              className="w-12 sm:w-14 py-1 text-center text-sm border-0 bg-transparent"
                            />
                            <button
                              type="button"
                              onClick={() => setCantidadEdit((c) => c + 1)}
                              className="px-2 sm:px-2.5 py-1 text-slate-600 hover:bg-slate-100 rounded-r-lg touch-manipulation"
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => aplicarEdicion(item.id)}
                            className="text-sm font-medium text-emerald-600 hover:underline"
                          >
                            Listo
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs sm:text-sm text-slate-500">
                          {detalle}
                          {item.stockDespues != null && (
                            <span className="block text-emerald-700 font-medium">
                              Queda: {Number(item.stockDespues).toLocaleString('es-AR', { maximumFractionDigits: 3 })} {item.unidadStock || ''}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-between sm:justify-end gap-2 sm:gap-1.5 shrink-0">
                      <span className="font-bold text-slate-800 text-sm sm:text-base min-[380px]:text-right">{totalItem}</span>
                      {!estaEditando && (
                        <div className="grid grid-cols-2 min-[380px]:flex items-center gap-1 sm:gap-1.5">
                          {(!item.modoVenta ||
                            item.modoVenta === 'bolsa' ||
                            (((modoEdicionKilo || modoEdicionPesos) && onEditarCarritoItem))) && (
                            <button
                              type="button"
                              onClick={() => iniciarEdicion(item)}
                              className="rounded-lg px-2 sm:px-2.5 py-2 sm:py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 touch-manipulation"
                              title="Editar"
                            >
                              Editar
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onBorrar?.(item.id)}
                            className="rounded-lg px-2 sm:px-2.5 py-2 sm:py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 hover:bg-red-50 touch-manipulation"
                            title="Quitar del carrito"
                          >
                            Borrar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 px-4 pt-3 pb-1 sm:-mx-5 sm:px-5 bg-white border-t border-slate-200 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] lg:static lg:mx-0 lg:px-0 lg:pt-0 lg:pb-0 lg:border-0 lg:shadow-none">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <span className="font-bold text-slate-800 text-sm sm:text-base">
          {permitirDescuento && descuentoNumerico > 0 ? 'Total con descuento:' : 'Total:'}
        </span>
        <span className="text-lg sm:text-xl font-bold text-emerald-600">{totalFormato}</span>
      </div>
      <button
        type="button"
        disabled={procesando || mostrarVacio}
        onClick={() =>
          onProcesarVenta?.({
            cliente,
            metodoPago,
            items,
            subtotalNumerico,
            descuentoNumerico,
            totalNumerico,
          })
        }
        className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3.5 sm:py-3.5 text-sm sm:text-base transition shadow-sm touch-manipulation min-h-[48px] disabled:opacity-60 disabled:pointer-events-none"
      >
        {procesando ? 'Procesando...' : botonTexto}
      </button>
      </div>
    </div>
  );
}
