import { useState, useSyncExternalStore } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import { useGastos } from '../context/GastosContext';
import {
  MESES,
  MESES_CORTOS,
  kpisReportes,
  ventasMensuales,
  ventasPorProducto,
  mediosDePago,
  ventasDiarias,
  distribucionMargenInicial,
} from '../data/reportesData';

function formatMoneda(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function useIsNarrow() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia('(max-width: 640px)');
      m.addEventListener('change', cb);
      return () => m.removeEventListener('change', cb);
    },
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches,
    () => false
  );
}

const IconoCarrito = () => (
  <svg className="w-8 h-8 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const IconoBilletes = () => (
  <svg className="w-8 h-8 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const IconoGrafico = () => (
  <svg className="w-8 h-8 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const IconoFiltro = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

const IconoOrdenar = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
  </svg>
);

// Agrupa gastos por tipo para el gráfico (luz, alquiler, sueldos = empleados, otros)
function agruparGastosParaMargen(gastos) {
  const grupos = { luz: 0, alquiler: 0, empleados: 0, otros: 0 };
  const colores = { luz: '#f59e0b', alquiler: '#3b82f6', empleados: '#14b8a6', otros: '#94a3b8' };
  gastos.forEach((g) => {
    if (g.categoria === 'luz') grupos.luz += g.monto;
    else if (g.categoria === 'alquiler') grupos.alquiler += g.monto;
    else if (g.categoria === 'sueldos') grupos.empleados += g.monto;
    else grupos.otros += g.monto;
  });
  const total = grupos.luz + grupos.alquiler + grupos.empleados + grupos.otros;
  return [
    { nombre: 'Luz', valor: grupos.luz, color: colores.luz, monto: grupos.luz },
    { nombre: 'Alquiler', valor: grupos.alquiler, color: colores.alquiler, monto: grupos.alquiler },
    { nombre: 'Empleados', valor: grupos.empleados, color: colores.empleados, monto: grupos.empleados },
    { nombre: 'Otros gastos', valor: grupos.otros, color: colores.otros, monto: grupos.otros },
  ].filter((d) => d.monto > 0);
}

export default function ReportesDashboard() {
  const { gastos, totalGastos } = useGastos();
  const isNarrow = useIsNarrow();
  const [mesSeleccionado, setMesSeleccionado] = useState(null);
  const [luz, setLuz] = useState(distribucionMargenInicial[0].valor);
  const [alquiler, setAlquiler] = useState(distribucionMargenInicial[1].valor);
  const [empleados, setEmpleados] = useState(distribucionMargenInicial[2].valor);

  const chartH = isNarrow ? 180 : 220;
  const chartHBig = isNarrow ? 200 : 240;
  const chartHPie = isNarrow ? 160 : 200;
  const tickFont = isNarrow ? 10 : 11;

  const resto = Math.max(0, 100 - luz - alquiler - empleados);
  const margenPesos = kpisReportes.margenPesos;
  const margenNeto = margenPesos - totalGastos;
  const gastosRealesParaGrafico = agruparGastosParaMargen(gastos);
  const disponible = Math.max(0, margenNeto);
  const faltante = margenNeto < 0 ? -margenNeto : 0;
  const datosDistribucionMargen =
    totalGastos > 0
      ? [
          ...gastosRealesParaGrafico,
          ...(disponible > 0 ? [{ nombre: 'Disponible', valor: disponible, color: '#22c55e', monto: disponible }] : []),
          ...(faltante > 0 ? [{ nombre: 'Faltante', valor: faltante, color: '#ef4444', monto: faltante }] : []),
        ]
      : [
          { nombre: 'Luz', valor: luz, color: '#f59e0b', monto: (luz / 100) * margenPesos },
          { nombre: 'Alquiler', valor: alquiler, color: '#3b82f6', monto: (alquiler / 100) * margenPesos },
          { nombre: 'Empleados', valor: empleados, color: '#14b8a6', monto: (empleados / 100) * margenPesos },
          { nombre: 'Resto / Disponible', valor: resto, color: '#6b7280', monto: (resto / 100) * margenPesos },
        ];

  const mesLabel = (mes) => mes.charAt(0).toUpperCase() + mes.slice(1);

  return (
    <div className="flex flex-col lg:flex-row min-h-0 lg:min-h-[calc(100vh-6rem)] bg-slate-100 rounded-2xl sm:rounded-[28px] overflow-hidden border border-slate-200 shadow-lg">
      {/* Móvil: barra de filtros por mes (horizontal) */}
      <div className="lg:hidden shrink-0 bg-slate-700 text-white px-3 py-3 border-b border-slate-600">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-medium text-slate-300 uppercase tracking-wide">Mes</span>
          <button type="button" className="p-1.5 rounded-lg bg-slate-600 hover:bg-slate-500" title="Filtrar">
            <IconoFiltro />
          </button>
          <button type="button" className="p-1.5 rounded-lg bg-slate-600 hover:bg-slate-500" title="Ordenar">
            <IconoOrdenar />
          </button>
        </div>
        <div className="overflow-x-auto -mx-1 pb-1 flex gap-1.5 snap-x snap-mandatory">
          {MESES.map((mes, i) => (
            <button
              key={mes}
              type="button"
              onClick={() => setMesSeleccionado(mesSeleccionado === mes ? null : mes)}
              className={`shrink-0 snap-start px-3 py-2 rounded-xl text-xs font-medium capitalize transition ${
                mesSeleccionado === mes ? 'bg-red-600 text-white' : 'text-slate-200 hover:bg-slate-600 bg-slate-600/50'
              }`}
            >
              {MESES_CORTOS[i]}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop: sidebar filtros */}
      <aside className="hidden lg:flex w-52 bg-slate-700 text-white flex-col shrink-0">
        <div className="p-4 flex gap-2 border-b border-slate-600">
          <button type="button" className="p-2 rounded-lg bg-slate-600 hover:bg-slate-500" title="Filtrar">
            <IconoFiltro />
          </button>
          <button type="button" className="p-2 rounded-lg bg-slate-600 hover:bg-slate-500" title="Ordenar">
            <IconoOrdenar />
          </button>
        </div>
        <nav className="p-2 flex-1 overflow-y-auto">
          {MESES.map((mes) => (
            <button
              key={mes}
              type="button"
              onClick={() => setMesSeleccionado(mesSeleccionado === mes ? null : mes)}
              className={`w-full text-left px-4 py-2.5 rounded-xl capitalize text-sm font-medium transition ${
                mesSeleccionado === mes ? 'bg-red-600 text-white' : 'text-slate-200 hover:bg-slate-600'
              }`}
            >
              {mesLabel(mes)}
            </button>
          ))}
        </nav>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 p-4 sm:p-6 overflow-auto min-h-0">
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold text-red-600 uppercase tracking-wide">Ventas totales</p>
              <p className="text-lg sm:text-2xl font-bold text-slate-900 mt-0.5 sm:mt-1 truncate">{formatMoneda(kpisReportes.ventasTotales)}</p>
            </div>
            <IconoCarrito />
          </div>
          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold text-red-600 uppercase tracking-wide">Margen bruto</p>
              <p className="text-lg sm:text-2xl font-bold text-slate-900 mt-0.5 sm:mt-1 truncate">{formatMoneda(kpisReportes.margenPesos)}</p>
            </div>
            <IconoBilletes />
          </div>
          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold text-amber-600 uppercase tracking-wide">Total gastos</p>
              <p className="text-lg sm:text-2xl font-bold text-slate-900 mt-0.5 sm:mt-1 truncate">{formatMoneda(totalGastos)}</p>
              <p className="text-xs text-slate-500 mt-0.5">Cargados en Gastos</p>
            </div>
          </div>
          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold uppercase tracking-wide" style={{ color: margenNeto >= 0 ? '#059669' : '#dc2626' }}>
                {margenNeto >= 0 ? 'Margen neto' : 'Faltante'}
              </p>
              <p className="text-lg sm:text-2xl font-bold mt-0.5 sm:mt-1 truncate" style={{ color: margenNeto >= 0 ? '#0f766e' : '#b91c1c' }}>
                {formatMoneda(margenNeto >= 0 ? margenNeto : -margenNeto)}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{margenNeto >= 0 ? 'Después de gastos' : 'A cubrir'}</p>
            </div>
            <IconoGrafico />
          </div>
          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold text-red-600 uppercase tracking-wide">Margen %</p>
              <p className="text-lg sm:text-2xl font-bold text-slate-900 mt-0.5 sm:mt-1">{kpisReportes.margenPorcentaje}%</p>
            </div>
          </div>
        </div>

        {/* Fila 1: Ventas mensuales, Ventas por producto, Medios de pago */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
            <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-3 sm:mb-4">Ventas mensuales</h3>
            <ResponsiveContainer width="100%" height={chartH}>
              <BarChart data={ventasMensuales} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="mes" tick={{ fontSize: tickFont }} stroke="#64748b" />
                <YAxis tick={{ fontSize: tickFont }} stroke="#64748b" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} domain={[0, 150000]} width={isNarrow ? 32 : 40} />
                <Tooltip formatter={(v) => [formatMoneda(v), 'Ventas']} contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="ventas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
            <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-3 sm:mb-4">Ventas por producto</h3>
            <ResponsiveContainer width="100%" height={chartH}>
              <BarChart data={ventasPorProducto} layout="vertical" margin={{ top: 4, right: 8, left: isNarrow ? 52 : 70, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: tickFont }} stroke="#64748b" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="nombre" tick={{ fontSize: tickFont }} stroke="#64748b" width={isNarrow ? 52 : 68} />
                <Tooltip formatter={(v) => [formatMoneda(v), 'Ventas']} contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="ventas" fill="#14b8a6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
            <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-3 sm:mb-4">Medios de pago</h3>
            <ResponsiveContainer width="100%" height={chartHPie}>
              <PieChart>
                <Pie
                  data={mediosDePago}
                  dataKey="valor"
                  nameKey="nombre"
                  cx="50%"
                  cy="45%"
                  innerRadius={isNarrow ? 36 : 50}
                  outerRadius={isNarrow ? 54 : 75}
                  paddingAngle={2}
                  label={({ valor }) => `${valor}%`}
                >
                  {mediosDePago.map((entry) => (
                    <Cell key={entry.nombre} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`${v}%`, '']} contentStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-2 text-xs text-slate-600">
              {mediosDePago.map((m) => (
                <div key={m.nombre} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: m.color }} />
                  {m.nombre} ({m.valor}%)
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fila 2: Ventas diarias (ancho) + Distribución del margen de ganancias */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
            <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-3 sm:mb-4">Ventas diarias</h3>
            <ResponsiveContainer width="100%" height={chartHBig}>
              <AreaChart data={ventasDiarias} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVentasDiarias" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="dia" tick={{ fontSize: tickFont }} stroke="#64748b" />
                <YAxis tick={{ fontSize: tickFont }} stroke="#64748b" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} domain={[0, 200000]} width={isNarrow ? 32 : 40} />
                <Tooltip formatter={(v) => [formatMoneda(v), 'Ventas']} contentStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="ventas" stroke="#14b8a6" strokeWidth={2} fill="url(#colorVentasDiarias)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
            <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-2 sm:mb-4">Distribución del margen</h3>
            <p className="text-xs text-slate-500 mb-2 sm:mb-3 line-clamp-2 sm:line-clamp-none">
              {totalGastos > 0
                ? `Gastos reales: ${formatMoneda(totalGastos)}. Margen bruto ${formatMoneda(margenPesos)}.`
                : `Ajustá el % del margen para cada gasto:`}
            </p>
            {totalGastos === 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2 sm:mb-3">
                <label className="text-xs font-medium text-slate-600">
                  Luz %
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={luz}
                    onChange={(e) => setLuz(Number(e.target.value) || 0)}
                    className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm touch-manipulation"
                  />
                </label>
                <label className="text-xs font-medium text-slate-600">
                  Alquiler %
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={alquiler}
                    onChange={(e) => setAlquiler(Number(e.target.value) || 0)}
                    className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm touch-manipulation"
                  />
                </label>
                <label className="text-xs font-medium text-slate-600">
                  Empleados %
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={empleados}
                    onChange={(e) => setEmpleados(Number(e.target.value) || 0)}
                    className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm touch-manipulation"
                  />
                </label>
              </div>
            )}
            <ResponsiveContainer width="100%" height={chartHPie}>
              <PieChart>
                <Pie
                  data={datosDistribucionMargen}
                  dataKey="valor"
                  nameKey="nombre"
                  cx="50%"
                  cy="50%"
                  outerRadius={isNarrow ? 56 : 70}
                  paddingAngle={2}
                  label={({ nombre, valor }) =>
                    valor > 0
                      ? totalGastos > 0
                        ? `${nombre} ${formatMoneda(valor)}`
                        : `${nombre} ${valor}%`
                      : ''
                  }
                >
                  {datosDistribucionMargen.map((entry) => (
                    <Cell key={entry.nombre} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(valor, name, props) =>
                    totalGastos > 0
                      ? [formatMoneda(valor), props.payload.nombre]
                      : [`${valor}% · ${formatMoneda(props.payload.monto)}`, props.payload.nombre]
                  }
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-x-2 gap-y-1 justify-center mt-2 text-xs text-slate-600">
              {datosDistribucionMargen.map((d) => (
                <div key={d.nombre} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="truncate max-w-[120px] sm:max-w-none">{d.nombre}</span> ({totalGastos > 0 ? formatMoneda(d.monto) : `${d.valor}%`})
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
