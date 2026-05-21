import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  abrirCaja,
  calcularResumenCaja,
  cerrarCaja,
  obtenerCajaAbierta,
  obtenerUltimaCajaCerrada,
} from '../services/supabaseData';

function formatMoneda(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatFecha(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('es-AR');
}

export default function CajaDelDia() {
  const { user } = useAuth();
  const [cajaAbierta, setCajaAbierta] = useState(null);
  const [ultimaCajaCerrada, setUltimaCajaCerrada] = useState(null);
  const [resumen, setResumen] = useState({ ingresos: 0, egresos: 0, cierreEstimado: 0 });
  const [montoApertura, setMontoApertura] = useState('');
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState(null);

  const cargarCaja = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [abierta, ultimaCerrada] = await Promise.all([
        obtenerCajaAbierta(),
        obtenerUltimaCajaCerrada(),
      ]);
      setCajaAbierta(abierta);
      setUltimaCajaCerrada(ultimaCerrada);
      setResumen(abierta ? await calcularResumenCaja(abierta) : { ingresos: 0, egresos: 0, cierreEstimado: 0 });
    } catch (err) {
      console.warn('No se pudo cargar la caja.', err);
      setError('No se pudo cargar la caja desde Supabase.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarCaja();
    const interval = window.setInterval(cargarCaja, 30000);
    return () => window.clearInterval(interval);
  }, [cargarCaja]);

  const handleAbrirCaja = async (e) => {
    e.preventDefault();
    setProcesando(true);
    setError(null);
    try {
      const abierta = await abrirCaja(montoApertura);
      setCajaAbierta(abierta);
      setMontoApertura('');
      setResumen(await calcularResumenCaja(abierta));
    } catch (err) {
      console.warn('No se pudo abrir caja.', err);
      setError('No se pudo abrir la caja.');
    } finally {
      setProcesando(false);
    }
  };

  const handleCerrarCaja = async () => {
    if (!cajaAbierta) return;
    const seguro = window.confirm('¿Seguro que querés cerrar la caja de este turno?');
    if (!seguro) return;

    setProcesando(true);
    setError(null);
    try {
      const result = await cerrarCaja(cajaAbierta, user?.id);
      setCajaAbierta(null);
      setUltimaCajaCerrada(result.caja);
      setResumen(result.resumen);
    } catch (err) {
      console.warn('No se pudo cerrar caja.', err);
      setError('No se pudo cerrar la caja.');
    } finally {
      setProcesando(false);
    }
  };

  const filas = cajaAbierta
    ? [
        ['Apertura', formatMoneda(cajaAbierta.montoApertura)],
        ['Ingresos del turno', formatMoneda(resumen.ingresos)],
        ['Egresos del turno', formatMoneda(resumen.egresos)],
        ['Cierre estimado', formatMoneda(resumen.cierreEstimado)],
      ]
    : [
        ['Apertura', '$0'],
        ['Ingresos del turno', '$0'],
        ['Egresos del turno', '$0'],
        ['Cierre estimado', '$0'],
      ];

  return (
    <section className="rounded-2xl sm:rounded-[28px] bg-white border border-slate-200 shadow-lg overflow-hidden">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-200">
        <h2 className="text-xl sm:text-2xl font-bold">Caja del día</h2>
        <p className="text-slate-500 mt-1 text-sm sm:text-base">
          Resumen financiero del turno y movimientos rápidos.
        </p>
      </div>
      <div className="p-4 sm:p-6 space-y-4">
        {loading && (
          <p className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-500">
            Cargando caja...
          </p>
        )}
        {error && (
          <p className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {cajaAbierta && (
          <p className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800">
            Caja abierta desde <strong>{formatFecha(cajaAbierta.abiertaAt)}</strong>.
          </p>
        )}

        {!cajaAbierta && ultimaCajaCerrada && (
          <p className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-600">
            Última caja cerrada: <strong>{formatMoneda(ultimaCajaCerrada.montoCierre)}</strong> el {formatFecha(ultimaCajaCerrada.cerradaAt)}.
          </p>
        )}

        {filas.map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl bg-slate-50 border border-slate-200 p-3 sm:p-4 flex items-center justify-between gap-4"
          >
            <span className="text-slate-600 text-sm sm:text-base min-w-0">{label}</span>
            <span className="font-bold text-base sm:text-lg shrink-0">{value}</span>
          </div>
        ))}
        <div className="pt-1">
          <p className="text-sm text-slate-500 mb-2">
            Sesión: <span className="font-semibold text-slate-700">{user?.nombre ?? '—'}</span>
          </p>

          {cajaAbierta ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={cargarCaja}
                disabled={procesando}
                className="w-full rounded-2xl border border-slate-300 bg-white text-slate-700 py-3 font-semibold text-sm sm:text-base touch-manipulation hover:bg-slate-50 transition disabled:opacity-60"
              >
                Actualizar resumen
              </button>
              <button
                type="button"
                onClick={handleCerrarCaja}
                disabled={procesando}
                className="w-full rounded-2xl bg-slate-900 text-white py-3 font-semibold text-sm sm:text-base touch-manipulation hover:bg-slate-800 transition disabled:opacity-60"
              >
                {procesando ? 'Cerrando...' : 'Cerrar caja'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleAbrirCaja} className="space-y-3">
              <label className="block">
                <span className="block text-sm font-medium text-slate-600 mb-1">Monto de apertura</span>
                <input
                  type="number"
                  min="0"
                  value={montoApertura}
                  onChange={(e) => setMontoApertura(e.target.value)}
                  placeholder="Ej: 30000"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 px-4 text-slate-800 focus:ring-2 focus:ring-emerald-500/30"
                />
              </label>
              <button
                type="submit"
                disabled={procesando}
                className="w-full rounded-2xl bg-emerald-600 text-white py-3 font-semibold text-sm sm:text-base touch-manipulation hover:bg-emerald-700 transition disabled:opacity-60"
              >
                {procesando ? 'Abriendo...' : 'Abrir caja'}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
