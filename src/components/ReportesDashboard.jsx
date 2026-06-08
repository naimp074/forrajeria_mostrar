import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGastos } from '../context/GastosContext';
import { useProductos } from '../context/ProductosContext';
import { useStock } from '../context/StockContext';
import {
  claveDiaActual,
  claveMesActual,
  labelMesCompleto,
  obtenerResumenReportes,
  obtenerVentaPorId,
  actualizarVenta,
  borrarVenta,
} from '../services/supabaseData';
import { revertirStockPorVenta } from '../utils/ventaStock';

function formatMoneda(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatHora(fechaIso) {
  return new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(new Date(fechaIso));
}

const DIAS_SEM = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function labelDiaCorto(clave) {
  const [anio, mes, dia] = clave.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')} · ${DIAS_SEM[fecha.getDay()]}`;
}

function labelDiaCompleto(clave) {
  const [anio, mes, dia] = clave.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${anio} · ${DIAS_SEM[fecha.getDay()]}`;
}

const resumenDiaVacio = {
  ventas: 0,
  plataParaReponer: 0,
  ganancia: 0,
  cantidadVentas: 0,
  ventasLista: [],
  productos: [],
  medios: [],
};

function construirDiasDelMes(mesClave, porDiaDetalle = {}) {
  const [anio, mes] = mesClave.split('-').map(Number);
  const ultimoDia = new Date(anio, mes, 0).getDate();
  const items = [];
  for (let dia = 1; dia <= ultimoDia; dia += 1) {
    const clave = `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    const datos = porDiaDetalle[clave] || { ventas: 0, plataParaReponer: 0, ganancia: 0 };
    items.push({ clave, label: labelDiaCorto(clave), ...datos });
  }
  return items;
}

function TarjetasResumen({ ventas, reponer, ganancia, compacto = false }) {
  const cls = compacto ? 'p-3' : 'p-4';
  const valCls = compacto ? 'text-xl' : 'text-2xl';
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      <div className={`rounded-xl bg-slate-50 border border-slate-100 ${cls}`}>
        <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-slate-500">Ventas</div>
        <div className={`${valCls} font-bold text-slate-900 mt-1`}>{formatMoneda(ventas)}</div>
      </div>
      <div className={`rounded-xl bg-amber-50 border border-amber-100 ${cls}`}>
        <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-amber-700">Reponer</div>
        <div className={`${valCls} font-bold text-amber-900 mt-1`}>{formatMoneda(reponer)}</div>
      </div>
      <div className={`rounded-xl bg-emerald-50 border border-emerald-100 ${cls}`}>
        <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-emerald-700">Ganancia</div>
        <div className={`${valCls} font-bold text-emerald-900 mt-1`}>{formatMoneda(ganancia)}</div>
      </div>
    </div>
  );
}

function formatCantidad(value) {
  const n = Number(value) || 0;
  return n.toLocaleString('es-AR', { maximumFractionDigits: 3 });
}

function formatPorcentaje(value) {
  if (value == null || Number.isNaN(Number(value))) return 'Sin costo';
  return `${Number(value).toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`;
}

function InsightCard({ titulo, item, valor, detalle, tono = 'slate' }) {
  const tonos = {
    slate: 'border-slate-200 bg-white',
    emerald: 'border-emerald-200 bg-emerald-50/60',
    amber: 'border-amber-200 bg-amber-50/70',
    red: 'border-red-200 bg-red-50/70',
  };

  return (
    <div className={`rounded-xl border p-3 ${tonos[tono] || tonos.slate}`}>
      <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wide text-slate-500">
        {titulo}
      </div>
      {item ? (
        <>
          <div className="mt-1 font-bold text-slate-900 truncate">{item.nombre || item.label}</div>
          <div className="mt-1 text-lg font-black text-slate-950">{valor}</div>
          {detalle && <div className="mt-1 text-xs text-slate-600 leading-snug">{detalle}</div>}
        </>
      ) : (
        <div className="mt-3 text-sm text-slate-500">Sin datos suficientes</div>
      )}
    </div>
  );
}

function ResumenAccionable({ datos, mostrarDiaMayor = true }) {
  if (!datos) return null;

  const rentable = datos.productoMasRentable;
  const vendido = datos.productoMasVendido;
  const margenBajo = datos.productoMargenBajo;
  const diaMayor = datos.diaMayorVenta;
  const parados = datos.productosParados || [];

  return (
    <section className="rounded-xl bg-white border border-slate-200 p-3 sm:p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1">
        <div>
          <h3 className="text-sm sm:text-base font-black text-slate-900">Resumen accionable</h3>
          <p className="text-xs sm:text-sm text-slate-500">
            Lectura rapida para decidir que reforzar, revisar o dejar quieto.
          </p>
        </div>
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 ${mostrarDiaMayor ? 'xl:grid-cols-4' : 'xl:grid-cols-3'} gap-3`}>
        <InsightCard
          titulo="Producto mas rentable"
          item={rentable}
          valor={rentable ? formatMoneda(rentable.ganancia) : null}
          detalle={rentable ? `Vendio ${formatMoneda(rentable.ventas)} y repone ${formatMoneda(rentable.costo)}.` : null}
          tono="emerald"
        />
        <InsightCard
          titulo="Producto mas vendido"
          item={vendido}
          valor={vendido ? `${formatCantidad(vendido.unidades)} u.` : null}
          detalle={vendido ? `Facturo ${formatMoneda(vendido.ventas)} en el periodo.` : null}
          tono="slate"
        />
        <InsightCard
          titulo="Margen mas bajo"
          item={margenBajo}
          valor={margenBajo ? formatPorcentaje(margenBajo.margenPorcentaje) : null}
          detalle={margenBajo ? `Ganancia estimada: ${formatMoneda(margenBajo.ganancia)}.` : null}
          tono="red"
        />
        {mostrarDiaMayor && (
          <InsightCard
            titulo="Dia de mayor venta"
            item={diaMayor ? { nombre: labelDiaCompleto(diaMayor.clave) } : null}
            valor={diaMayor ? formatMoneda(diaMayor.ventas) : null}
            detalle={diaMayor ? `Ganancia estimada: ${formatMoneda(diaMayor.ganancia)}.` : null}
            tono="amber"
          />
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Productos parados hace 30 dias
          </div>
          <div className="text-xs text-slate-400">Top {Math.min(parados.length, 5)}</div>
        </div>
        {parados.length > 0 ? (
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {parados.map((producto) => (
              <div key={producto.nombre} className="rounded-lg bg-white border border-slate-100 px-3 py-2 text-sm">
                <div className="font-semibold text-slate-800 truncate">{producto.nombre}</div>
                <div className="text-xs text-slate-500">
                  {producto.diasSinVenta == null
                    ? 'Sin ventas registradas'
                    : `${producto.diasSinVenta} dias sin vender`}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No hay productos parados para revisar en este periodo.</p>
        )}
      </div>
    </section>
  );
}

function FilaPeriodo({ label, ventas, reponer, ganancia, activo, onClick }) {
  const contenido = (
    <>
      <div className="min-w-0">
        <div className="font-medium text-slate-800 truncate">{label}</div>
        <div className="text-xs text-slate-500 mt-0.5">
          Rep. {formatMoneda(reponer)} · Gan. {formatMoneda(ganancia)}
        </div>
      </div>
      <div className="font-bold text-slate-900 shrink-0">{formatMoneda(ventas)}</div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`w-full flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm text-left transition ${
          activo
            ? 'border-emerald-400 bg-emerald-50 ring-1 ring-emerald-200'
            : 'border-slate-100 bg-white hover:bg-slate-50'
        }`}
      >
        {contenido}
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-sm">
      {contenido}
    </div>
  );
}

const METODOS_PAGO = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'tarjeta', label: 'Tarjeta' },
  { id: 'transfer', label: 'Transfer' },
];

function FilaVentaDia({ venta, editando, onEditar, onCancelar, onGuardar, onBorrar, guardando, borrando }) {
  const ventaForm = {
    ventaId: venta.id,
    cliente: venta.cliente || 'Cliente General',
    metodoPago: venta.metodoPago || 'efectivo',
    total: String(Math.round(venta.total || 0)),
  };
  const [form, setForm] = useState(ventaForm);
  const formActual = form.ventaId === venta.id ? form : ventaForm;
  const actualizarForm = (campo, valor) => {
    setForm({ ...formActual, [campo]: valor });
  };

  if (editando) {
    return (
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 space-y-3">
        <div className="text-xs font-semibold text-slate-500 uppercase">Editar venta · {formatHora(venta.fecha)}</div>
        <label className="block text-sm">
          <span className="text-slate-600 mb-1 block">Cliente</span>
          <input
            type="text"
            value={formActual.cliente}
            onChange={(e) => actualizarForm('cliente', e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600 mb-1 block">Método de pago</span>
          <select
            value={formActual.metodoPago}
            onChange={(e) => actualizarForm('metodoPago', e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800"
          >
            {METODOS_PAGO.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-slate-600 mb-1 block">Total ($)</span>
          <input
            type="text"
            inputMode="numeric"
            value={formActual.total}
            onChange={(e) => actualizarForm('total', e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={guardando}
            onClick={() => onGuardar({
              cliente: formActual.cliente.trim() || 'Cliente General',
              metodoPago: formActual.metodoPago,
              total: Number(formActual.total.replace(/\./g, '')) || 0,
            })}
            className="rounded-lg bg-emerald-600 text-white px-3 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
          <button
            type="button"
            disabled={guardando}
            onClick={onCancelar}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 flex items-start justify-between gap-3 text-sm">
      <div className="min-w-0 flex-1">
        <div className="font-medium text-slate-900">{venta.cliente || 'Cliente'}</div>
        <div className="text-xs text-slate-500 mt-0.5">
          {formatHora(venta.fecha)} · {METODOS_PAGO.find((m) => m.id === venta.metodoPago)?.label || venta.metodoPago}
        </div>
        <div className="text-xs text-slate-600 mt-1 truncate">
          {venta.lineas?.map((l) => l.productoNombre).filter(Boolean).join(', ') || '—'}
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <button
            type="button"
            disabled={borrando || guardando}
            onClick={() => onEditar(venta.id)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Editar
          </button>
          <button
            type="button"
            disabled={borrando || guardando}
            onClick={() => onBorrar(venta)}
            className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {borrando ? 'Borrando...' : 'Borrar'}
          </button>
        </div>
      </div>
      <div className="font-bold text-slate-900 shrink-0">{formatMoneda(venta.total)}</div>
    </div>
  );
}

const PESTANAS = [
  { id: 'total', label: 'Resumen' },
  { id: 'mes', label: 'Por mes' },
  { id: 'dia', label: 'Por día' },
];

export default function ReportesDashboard() {
  const { totalGastos } = useGastos();
  const { productos } = useProductos();
  const { setPorProducto } = useStock();
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [pestana, setPestana] = useState('total');
  const [mesSeleccionado, setMesSeleccionado] = useState(() => claveMesActual());
  const [diaSeleccionado, setDiaSeleccionado] = useState(() => claveDiaActual());
  const [ventaEditandoId, setVentaEditandoId] = useState(null);
  const [guardandoVentaId, setGuardandoVentaId] = useState(null);
  const [borrandoVentaId, setBorrandoVentaId] = useState(null);
  const [accionMensaje, setAccionMensaje] = useState('');

  const productosPorNombre = useMemo(() => {
    const map = {};
    for (const p of productos) map[p.name.toLowerCase()] = p;
    return map;
  }, [productos]);

  const cargarReportes = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      setResumen(await obtenerResumenReportes());
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los reportes.');
      setResumen(null);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarReportes(); }, [cargarReportes]);

  useEffect(() => {
    if (!resumen) return;
    const actual = claveMesActual();
    const meses = resumen.mesesDisponibles ?? [];
    if (!meses.some((m) => m.clave === mesSeleccionado) && mesSeleccionado !== actual) {
      setMesSeleccionado(meses[0]?.clave ?? actual);
    }
  }, [resumen, mesSeleccionado]);

  useEffect(() => {
    if (diaSeleccionado.slice(0, 7) === mesSeleccionado) return;
    const hoy = claveDiaActual();
    if (hoy.startsWith(mesSeleccionado)) {
      setDiaSeleccionado(hoy);
      return;
    }
    const detalle = resumen?.detallePorDia ?? {};
    const primerDia = Object.keys(detalle)
      .filter((k) => k.startsWith(mesSeleccionado) && detalle[k]?.ventas > 0)
      .sort((a, b) => b.localeCompare(a))[0];
    setDiaSeleccionado(primerDia ?? `${mesSeleccionado}-01`);
  }, [mesSeleccionado, resumen, diaSeleccionado]);

  const cambiarMes = (mesClave) => {
    setMesSeleccionado(mesClave);
    setDiaSeleccionado(claveDiaActual().startsWith(mesClave) ? claveDiaActual() : `${mesClave}-01`);
  };

  const cambiarFecha = (fecha) => {
    if (!fecha) return;
    setDiaSeleccionado(fecha);
    setMesSeleccionado(fecha.slice(0, 7));
    setPestana('dia');
  };

  const irADia = (clave) => {
    setDiaSeleccionado(clave);
    setPestana('dia');
  };

  const handleGuardarVenta = async (ventaId, cambios) => {
    setGuardandoVentaId(ventaId);
    setAccionMensaje('');
    try {
      await actualizarVenta(ventaId, cambios);
      setVentaEditandoId(null);
      setAccionMensaje('Venta actualizada.');
      await cargarReportes();
    } catch (err) {
      setAccionMensaje(err.message || 'No se pudo actualizar la venta.');
    } finally {
      setGuardandoVentaId(null);
      setTimeout(() => setAccionMensaje(''), 4000);
    }
  };

  const handleBorrarVenta = async (ventaResumen) => {
    const ok = window.confirm(
      `¿Borrar esta venta de ${formatMoneda(ventaResumen.total)} (${formatHora(ventaResumen.fecha)})?\n\nSe devuelve el stock de los productos y se actualizan los reportes.`,
    );
    if (!ok) return;
    setBorrandoVentaId(ventaResumen.id);
    setAccionMensaje('');
    try {
      const venta = await obtenerVentaPorId(ventaResumen.id);
      await borrarVenta(ventaResumen.id);
      setPorProducto((prev) => revertirStockPorVenta(venta, productosPorNombre, prev));
      if (ventaEditandoId === ventaResumen.id) setVentaEditandoId(null);
      setAccionMensaje('Venta borrada.');
      await cargarReportes();
    } catch (err) {
      setAccionMensaje(err.message || 'No se pudo borrar la venta.');
    } finally {
      setBorrandoVentaId(null);
      setTimeout(() => setAccionMensaje(''), 4000);
    }
  };

  const opcionesMes = useMemo(() => {
    const actual = claveMesActual();
    const map = new Map();
    (resumen?.mesesDisponibles ?? []).forEach((m) => map.set(m.clave, m.label));
    if (!map.has(actual)) map.set(actual, labelMesCompleto(actual));
    if (!map.has(mesSeleccionado)) map.set(mesSeleccionado, labelMesCompleto(mesSeleccionado));
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([clave, label]) => ({ clave, label }));
  }, [resumen, mesSeleccionado]);

  const diasMes = useMemo(
    () => construirDiasDelMes(mesSeleccionado, resumen?.porDiaDetalle ?? {}),
    [mesSeleccionado, resumen],
  );

  const diasConVentas = useMemo(
    () => diasMes.filter((d) => d.ventas > 0).sort((a, b) => b.clave.localeCompare(a.clave)),
    [diasMes],
  );

  const resumenMes = useMemo(() => {
    const m = resumen?.ventasMensuales?.find((x) => x.clave === mesSeleccionado);
    if (m) return { ventas: m.ventas, reponer: m.plataParaReponer, ganancia: m.ganancia };
    return diasMes.reduce(
      (acc, d) => ({
        ventas: acc.ventas + d.ventas,
        reponer: acc.reponer + d.plataParaReponer,
        ganancia: acc.ganancia + d.ganancia,
      }),
      { ventas: 0, reponer: 0, ganancia: 0 },
    );
  }, [resumen, mesSeleccionado, diasMes]);

  const detalleDia = resumen?.detallePorDia?.[diaSeleccionado] ?? resumenDiaVacio;
  const resumenDia = {
    ventas: detalleDia.ventas ?? 0,
    reponer: detalleDia.plataParaReponer ?? 0,
    ganancia: detalleDia.ganancia ?? 0,
  };

  const ventasTotales = resumen?.ventasTotales ?? 0;
  const plataParaReponer = resumen?.plataParaReponer ?? 0;
  const margenBruto = resumen?.margenBruto ?? 0;
  const margenNeto = margenBruto - totalGastos;
  const hayVentas = ventasTotales > 0;
  const labelMes = opcionesMes.find((m) => m.clave === mesSeleccionado)?.label ?? labelMesCompleto(mesSeleccionado);
  const accionableMes = resumen?.accionablePorMes?.[mesSeleccionado] ?? null;
  const accionableDia = detalleDia.accionable ?? null;

  if (cargando) {
    return (
      <div className="rounded-2xl bg-slate-100 border border-slate-200 p-8 text-center text-slate-600">
        Cargando reportes...
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-slate-100 border border-slate-200 shadow-lg p-4 sm:p-5 space-y-4">
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-red-700 flex justify-between gap-3 items-center text-sm">
          <span>{error}</span>
          <button type="button" onClick={cargarReportes} className="rounded-lg bg-red-600 text-white px-3 py-1.5 text-xs font-semibold">
            Reintentar
          </button>
        </div>
      )}

      {accionMensaje && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-emerald-800 text-sm font-medium">
          {accionMensaje}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="flex rounded-xl bg-white border border-slate-200 p-1 gap-0.5">
          {PESTANAS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPestana(p.id)}
              className={`rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition ${
                pestana === p.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={cargarReportes}
          className="rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 shrink-0"
        >
          Actualizar
        </button>
      </div>

      {!hayVentas && pestana === 'total' && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500 text-sm">
          Todavía no hay ventas registradas. Cuando vendas desde Ventas, van a aparecer acá.
        </div>
      )}

      {pestana === 'total' && hayVentas && (
        <div className="space-y-4">
          <TarjetasResumen ventas={ventasTotales} reponer={plataParaReponer} ganancia={margenBruto} />
          <ResumenAccionable datos={resumen?.accionableTotal} />
          <div className="rounded-xl bg-white border border-slate-200 p-4 text-sm space-y-2">
            <div className="flex justify-between"><span className="text-slate-500">Ventas hoy</span><span className="font-semibold">{formatMoneda(resumen?.ventasHoy ?? 0)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Ganancia hoy</span><span className="font-semibold text-emerald-700">{formatMoneda(resumen?.gananciaHoy ?? 0)}</span></div>
            <div className="flex justify-between border-t border-slate-100 pt-2"><span className="text-slate-600">Ganancia neta (− gastos)</span><span className={`font-bold ${margenNeto >= 0 ? 'text-emerald-800' : 'text-red-600'}`}>{formatMoneda(margenNeto)}</span></div>
          </div>
          <details className="rounded-xl bg-white border border-slate-200 overflow-hidden">
            <summary className="px-4 py-3 text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-50">
              Ver más detalle (semanas, meses, productos)
            </summary>
            <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-3">
              {resumen?.ventasSemanales?.some((x) => x.ventas > 0) && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Últimas semanas</h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {resumen.ventasSemanales.filter((x) => x.ventas > 0).map((item) => (
                      <FilaPeriodo key={item.clave} label={item.label} ventas={item.ventas} reponer={item.plataParaReponer} ganancia={item.ganancia} />
                    ))}
                  </div>
                </div>
              )}
              {resumen?.ventasMensuales?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Por mes</h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {resumen.ventasMensuales.map((item) => (
                      <FilaPeriodo key={item.clave} label={item.label} ventas={item.ventas} reponer={item.plataParaReponer} ganancia={item.ganancia} />
                    ))}
                  </div>
                </div>
              )}
              {resumen?.ventasPorProducto?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Top productos</h4>
                  <div className="space-y-1.5">
                    {resumen.ventasPorProducto.slice(0, 5).map((item) => (
                      <div key={item.nombre} className="flex justify-between text-sm py-1">
                        <span className="text-slate-700 truncate pr-2">{item.nombre}</span>
                        <span className="font-semibold shrink-0">{formatMoneda(item.ventas)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </details>
        </div>
      )}

      {pestana === 'mes' && (
        <div className="space-y-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-500 mb-1 block">Mes</span>
            <select
              value={mesSeleccionado}
              onChange={(e) => cambiarMes(e.target.value)}
              className="w-full sm:max-w-xs rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
            >
              {opcionesMes.map((m) => (
                <option key={m.clave} value={m.clave}>{m.label}</option>
              ))}
            </select>
          </label>
          <TarjetasResumen {...resumenMes} compacto />
          <ResumenAccionable datos={accionableMes} />
          <div>
            <h4 className="text-sm font-bold text-slate-800 mb-2">
              Días con ventas — {labelMes}
              <span className="font-normal text-slate-500 ml-1">({diasConVentas.length})</span>
            </h4>
            {diasConVentas.length === 0 ? (
              <p className="text-sm text-slate-500 rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center">
                No hubo ventas en este mes.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-[24rem] overflow-y-auto">
                {diasConVentas.map((dia) => (
                  <FilaPeriodo
                    key={dia.clave}
                    label={dia.label}
                    ventas={dia.ventas}
                    reponer={dia.plataParaReponer}
                    ganancia={dia.ganancia}
                    activo={dia.clave === diaSeleccionado}
                    onClick={() => irADia(dia.clave)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {pestana === 'dia' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold uppercase text-slate-500 mb-1 block">Mes</span>
              <select
                value={mesSeleccionado}
                onChange={(e) => cambiarMes(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
              >
                {opcionesMes.map((m) => (
                  <option key={m.clave} value={m.clave}>{m.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase text-slate-500 mb-1 block">Fecha</span>
              <input
                type="date"
                value={diaSeleccionado}
                onChange={(e) => cambiarFecha(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
              />
            </label>
          </div>
          <p className="text-sm text-slate-600">{labelDiaCompleto(diaSeleccionado)}</p>
          <TarjetasResumen {...resumenDia} compacto />
          <ResumenAccionable datos={accionableDia} mostrarDiaMayor={false} />
          {detalleDia.ventasLista?.length > 0 ? (
            <>
              <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-100 text-xs font-bold uppercase text-slate-500">
                  Ventas del día ({detalleDia.cantidadVentas})
                </div>
                <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                  {detalleDia.ventasLista.map((venta) => (
                    <FilaVentaDia
                      key={venta.id}
                      venta={venta}
                      editando={ventaEditandoId === venta.id}
                      guardando={guardandoVentaId === venta.id}
                      borrando={borrandoVentaId === venta.id}
                      onEditar={setVentaEditandoId}
                      onCancelar={() => setVentaEditandoId(null)}
                      onGuardar={(cambios) => handleGuardarVenta(venta.id, cambios)}
                      onBorrar={handleBorrarVenta}
                    />
                  ))}
                </div>
              </div>
              {(detalleDia.productos?.length > 0 || detalleDia.medios?.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {detalleDia.productos?.length > 0 && (
                    <div className="rounded-xl bg-white border border-slate-200 p-3">
                      <div className="text-xs font-bold uppercase text-slate-500 mb-2">Productos</div>
                      {detalleDia.productos.map((p) => (
                        <div key={p.nombre} className="flex justify-between py-1 gap-2">
                          <span className="truncate text-slate-700">{p.nombre}</span>
                          <span className="font-semibold shrink-0">{formatMoneda(p.ventas)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {detalleDia.medios?.length > 0 && (
                    <div className="rounded-xl bg-white border border-slate-200 p-3">
                      <div className="text-xs font-bold uppercase text-slate-500 mb-2">Pagos</div>
                      {detalleDia.medios.map((m) => (
                        <div key={m.metodo} className="flex justify-between py-1 gap-2">
                          <span className="text-slate-700">{m.label}</span>
                          <span className="font-semibold shrink-0">{formatMoneda(m.total)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-500 rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center">
              No hubo ventas este día.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
