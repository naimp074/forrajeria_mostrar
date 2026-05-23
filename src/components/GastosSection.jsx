import { useState, useMemo } from 'react';
import { useGastos } from '../context/GastosContext';
import { categoriasGastos } from '../data/mockData';
import { usePagination } from '../hooks/usePagination';
import Paginacion from './Paginacion';

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

export default function GastosSection() {
  const { gastos, agregarGasto: agregarGastoContext, loading, error } = useGastos();
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [categoria, setCategoria] = useState('otros');
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [detalle, setDetalle] = useState('');

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
  const porCategoria = CATEGORIAS_OPTIONS.reduce((acc, cat) => {
    acc[cat] = gastos.filter((g) => g.categoria === cat).reduce((s, g) => s + g.monto, 0);
    return acc;
  }, {});

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
          Registrá gastos (comida, sueldos, AFIP, luz, etc.) y mirá el resumen por categoría.
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

        <div>
          <h3 className="font-semibold text-slate-800 mb-3">Resumen por categoría</h3>
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2">
            {CATEGORIAS_OPTIONS.filter((c) => porCategoria[c] > 0).map((cat) => (
              <div
                key={cat}
                className="flex items-center justify-between py-2 border-b border-slate-200 last:border-0"
              >
                <span className="text-slate-600">{categoriasGastos[cat]}</span>
                <span className="font-bold text-slate-900">{formatMonto(porCategoria[cat])}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-3 mt-2 border-t-2 border-slate-300">
              <span className="font-semibold text-slate-800">Total gastos</span>
              <span className="font-bold text-lg text-slate-900">{formatMonto(totalGeneral)}</span>
            </div>
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
      </div>
    </section>
  );
}
