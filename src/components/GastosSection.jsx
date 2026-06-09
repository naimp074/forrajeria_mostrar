import { useEffect, useMemo, useState } from 'react';
import { useGastos } from '../context/GastosContext';
import { categoriasGastos } from '../data/mockData';
import { usePagination } from '../hooks/usePagination';
import Paginacion from './Paginacion';
import { obtenerResumenReportes } from '../services/supabaseData';

const CATEGORIAS_OPTIONS = [
  'comida',
  'sueldos',
  'afip',
  'luz',
  'gas',
  'alquiler',
  'proveedores',
  'otros',
];

function formatMonto(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n);
}

function claveMes(fecha) {
  return String(fecha || '').slice(0, 7);
}

function claveDia(fecha) {
  return String(fecha || '').slice(0, 10);
}

function mesActual() {
  return new Date().toISOString().slice(0, 7);
}

function labelMes(clave) {
  if (!clave) return 'Mes';
  const [anio, mes] = clave.split('-').map(Number);
  const fecha = new Date(anio, (mes || 1) - 1, 1);
  return fecha.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
}

function labelDia(clave) {
  if (!clave) return '';
  const [anio, mes, dia] = clave.split('-').map(Number);
  const fecha = new Date(anio, (mes || 1) - 1, dia || 1);
  return fecha.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

function nombreCategoria(categoria) {
  return categoriasGastos[categoria] || categoria || 'Otros';
}

function ResumenCard({ titulo, valor, detalle, tono = 'slate' }) {
  const tonos = {
    slate: 'border-slate-200 bg-slate-50 text-slate-900',
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

export default function GastosSection() {
  const { gastos, agregarGasto: agregarGastoContext, loading, error } = useGastos();
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [categoria, setCategoria] = useState('otros');
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [detalle, setDetalle] = useState('');
  const [mesSeleccionado, setMesSeleccionado] = useState(mesActual);
  const [resumenVentas, setResumenVentas] = useState(null);
  const [loadingResumen, setLoadingResumen] = useState(true);
  const [errorResumen, setErrorResumen] = useState('');

  useEffect(() => {
    let mounted = true;

    setLoadingResumen(true);
    obtenerResumenReportes()
      .then((resumen) => {
        if (!mounted) return;
        setResumenVentas(resumen);
        setErrorResumen('');
      })
      .catch((err) => {
        if (!mounted) return;
        setErrorResumen(err.message || 'No se pudo calcular el resumen del mes.');
      })
      .finally(() => {
        if (mounted) setLoadingResumen(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const agregarGasto = (e) => {
    e.preventDefault();
    const valor =
      parseFloat(monto.replace(/\./g, '').replace(',', '.')) ||
      parseFloat(monto.replace(/\D/g, '')) ||
      0;
    if (!descripcion.trim() || valor <= 0) return;
    const nuevo = {
      id: crypto.randomUUID(),
      descripcion: descripcion.trim(),
      monto: valor,
      categoria,
      fecha,
      detalle: detalle.trim() || undefined,
    };
    agregarGastoContext(nuevo);
    setDescripcion('');
    setMonto('');
    setCategoria('otros');
    setFecha(new Date().toISOString().slice(0, 10));
    setDetalle('');
  };

  const totalGeneral = gastos.reduce((s, g) => s + g.monto, 0);

  const gastosDelMes = useMemo(
    () => gastos.filter((g) => claveMes(g.fecha) === mesSeleccionado),
    [gastos, mesSeleccionado],
  );

  const totalMes = gastosDelMes.reduce((s, g) => s + g.monto, 0);

  const porCategoriaMes = CATEGORIAS_OPTIONS.reduce((acc, cat) => {
    acc[cat] = gastosDelMes.filter((g) => g.categoria === cat).reduce((s, g) => s + g.monto, 0);
    return acc;
  }, {});

  const resumenMes = useMemo(() => {
    return resumenVentas?.ventasMensuales?.find((m) => m.clave === mesSeleccionado) || {
      ventas: 0,
      plataParaReponer: 0,
      ganancia: 0,
    };
  }, [resumenVentas, mesSeleccionado]);

  const ventasMes = Number(resumenMes.ventas) || 0;
  const plataParaReponerMes = Number(resumenMes.plataParaReponer) || 0;
  const gananciaBrutaMes = Number(resumenMes.ganancia) || 0;
  const plataTotalRestante = ventasMes - totalMes;
  const reponerDespuesDeGastos = plataParaReponerMes - totalMes;
  const gananciaFinalMes = gananciaBrutaMes - totalMes;
  const sePasoDeReposicion = totalMes > plataParaReponerMes && plataParaReponerMes > 0;

  const mesesDisponibles = useMemo(() => {
    const claves = new Set([mesActual(), mesSeleccionado]);
    gastos.forEach((g) => {
      const clave = claveMes(g.fecha);
      if (clave) claves.add(clave);
    });
    resumenVentas?.ventasMensuales?.forEach((m) => {
      if (m.clave) claves.add(m.clave);
    });
    return [...claves]
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a))
      .map((clave) => ({ clave, label: labelMes(clave) }));
  }, [gastos, resumenVentas, mesSeleccionado]);

  const gastosPorDia = useMemo(() => {
    const mapa = {};
    gastosDelMes.forEach((g) => {
      const dia = claveDia(g.fecha);
      if (!mapa[dia]) mapa[dia] = { dia, total: 0, gastos: [] };
      mapa[dia].total += g.monto;
      mapa[dia].gastos.push(g);
    });
    return Object.values(mapa).sort((a, b) => b.dia.localeCompare(a.dia));
  }, [gastosDelMes]);

  const gastosOrdenados = useMemo(
    () => [...gastos].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))),
    [gastos]
  );
  const gastosPaginacion = usePagination(gastosOrdenados, { pageSize: 15 });

  return (
    <section className="rounded-2xl sm:rounded-[28px] bg-white border border-slate-200 shadow-lg overflow-hidden">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-200">
        <h2 className="text-xl sm:text-2xl font-bold">Gastos</h2>
        <p className="text-slate-500 mt-1 text-sm sm:text-base">
          Registrá gastos y mirá cuánto queda por mes después de reponer y pagar gastos.
        </p>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {loading && (
          <p className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-500">
            Cargando gastos desde Supabase...
          </p>
        )}
        {error && (
          <p className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
            {error}
          </p>
        )}
        <form onSubmit={agregarGasto} className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-4">
          <h3 className="font-semibold text-slate-800">Cargar gasto</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Descripción</label>
              <input
                type="text"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej: Comida del personal, Luz, AFIP..."
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Monto ($)</label>
              <input
                type="text"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="10000"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Categoría</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {CATEGORIAS_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {categoriasGastos[c]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Detalle (opcional)</label>
            <input
              type="text"
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              placeholder="Ej: Vencimiento AFIP 20, almuerzo equipo..."
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-emerald-600 text-white px-4 py-2 font-semibold hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            Agregar gasto
          </button>
        </form>

        <div className="rounded-2xl border border-emerald-200 bg-white p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900">Resumen del mes</h3>
              <p className="text-sm text-slate-500">
                Los gastos se descuentan de la ganancia para ver cuánto te queda realmente.
              </p>
            </div>
            <label className="block text-sm">
              <span className="block text-slate-600 font-medium mb-1">Mes</span>
              <select
                value={mesSeleccionado}
                onChange={(e) => setMesSeleccionado(e.target.value)}
                className="w-full sm:w-56 rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {mesesDisponibles.map((m) => (
                  <option key={m.clave} value={m.clave}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loadingResumen && (
            <p className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-500">
              Calculando ventas, reposición y ganancia del mes...
            </p>
          )}
          {errorResumen && (
            <p className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
              {errorResumen}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
            <ResumenCard
              titulo="Ventas del mes"
              valor={formatMonto(ventasMes)}
              detalle="Plata que entró por ventas."
            />
            <ResumenCard
              titulo="Para reponer"
              valor={formatMonto(plataParaReponerMes)}
              detalle="Costo estimado de la mercadería vendida."
              tono="amber"
            />
            <ResumenCard
              titulo="Gastos del mes"
              valor={formatMonto(totalMes)}
              detalle="Lo que fuiste gastando este mes."
              tono={sePasoDeReposicion ? 'red' : 'slate'}
            />
            <ResumenCard
              titulo="Plata total restante"
              valor={formatMonto(plataTotalRestante)}
              detalle="Ventas menos gastos, antes de separar reposición."
              tono={plataTotalRestante >= 0 ? 'emerald' : 'red'}
            />
            <ResumenCard
              titulo="Ganancia final"
              valor={formatMonto(gananciaFinalMes)}
              detalle="Ganancia bruta menos gastos cargados."
              tono={gananciaFinalMes >= 0 ? 'emerald' : 'red'}
            />
          </div>

          <div className={`rounded-2xl border p-4 ${sePasoDeReposicion ? 'bg-red-50 border-red-200 text-red-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
            {plataParaReponerMes <= 0 ? (
              <p className="text-sm font-medium">
                Todavía no hay plata para reponer calculada en {labelMes(mesSeleccionado)}.
              </p>
            ) : sePasoDeReposicion ? (
              <p className="text-sm font-medium">
                Te pasaste {formatMonto(Math.abs(reponerDespuesDeGastos))} de la plata para reponer.
              </p>
            ) : (
              <p className="text-sm font-medium">
                Después de gastos, quedarían {formatMonto(reponerDespuesDeGastos)} de la plata para reponer.
              </p>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-slate-800 mb-3">Resumen por categoría del mes</h3>
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2">
            {CATEGORIAS_OPTIONS.filter((c) => porCategoriaMes[c] > 0).map((cat) => (
              <div
                key={cat}
                className="flex items-center justify-between py-2 border-b border-slate-200 last:border-0"
              >
                <span className="text-slate-600">{categoriasGastos[cat]}</span>
                <span className="font-bold text-slate-900">{formatMonto(porCategoriaMes[cat])}</span>
              </div>
            ))}
            {gastosDelMes.length === 0 && (
              <p className="text-sm text-slate-500 py-2">No hay gastos cargados en este mes.</p>
            )}
            <div className="flex items-center justify-between pt-3 mt-2 border-t-2 border-slate-300">
              <span className="font-semibold text-slate-800">Total gastos del mes</span>
              <span className="font-bold text-lg text-slate-900">{formatMonto(totalMes)}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-slate-800 mb-3">En qué gastamos cada día</h3>
          <div className="space-y-3">
            {gastosPorDia.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
                No hay gastos diarios para mostrar en {labelMes(mesSeleccionado)}.
              </div>
            )}
            {gastosPorDia.map((dia) => (
              <article key={dia.dia} className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2 mb-3">
                  <div>
                    <h4 className="font-bold text-slate-900">{labelDia(dia.dia)}</h4>
                    <p className="text-xs text-slate-500">{dia.gastos.length} gasto{dia.gastos.length !== 1 ? 's' : ''}</p>
                  </div>
                  <span className="font-black text-slate-900">{formatMonto(dia.total)}</span>
                </div>
                <div className="space-y-2">
                  {dia.gastos.map((g) => (
                    <div key={g.id} className="flex flex-wrap items-start justify-between gap-2 text-sm">
                      <div>
                        <span className="font-medium text-slate-800">{g.descripcion}</span>
                        <span className="ml-2 text-xs text-slate-500">({nombreCategoria(g.categoria)})</span>
                        {g.detalle && <p className="text-xs text-slate-500 mt-0.5">{g.detalle}</p>}
                      </div>
                      <span className="font-bold text-slate-900">{formatMonto(g.monto)}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-slate-800 mb-3">Últimos gastos cargados</h3>
          <ul className="space-y-2">
            {gastosPaginacion.paginatedItems.map((g) => (
              <li
                key={g.id}
                className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <span className="font-medium text-slate-800">{g.descripcion}</span>
                  <span className="ml-2 text-sm text-slate-500">({categoriasGastos[g.categoria]})</span>
                  {g.detalle && (
                    <p className="text-sm text-slate-500 mt-0.5">{g.detalle}</p>
                  )}
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900">{formatMonto(g.monto)}</span>
                  <p className="text-xs text-slate-500">{g.fecha}</p>
                </div>
              </li>
            ))}
          </ul>
          <Paginacion
            page={gastosPaginacion.page}
            totalPages={gastosPaginacion.totalPages}
            totalItems={gastosPaginacion.totalItems}
            from={gastosPaginacion.from}
            to={gastosPaginacion.to}
            onPageChange={gastosPaginacion.setPage}
          />
        </div>

        {totalGeneral > 0 && (
          <p className="text-xs text-slate-400 text-center">
            Total histórico de gastos cargados: {formatMonto(totalGeneral)}
          </p>
        )}
      </div>
    </section>
  );
}
