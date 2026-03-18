import { useState } from 'react';
import { cajaDelDia } from '../data/mockData';
import { useAuth } from '../context/AuthContext';

export default function CajaDelDia() {
  const { user } = useAuth();
  const [cerradaPor, setCerradaPor] = useState(null);

  const cajaCerrada = !!cerradaPor;

  const handleCerrarCaja = () => {
    if (!user) return;
    setCerradaPor({ nombre: user.nombre, fecha: new Date().toLocaleString('es-AR') });
  };

  const handleAbrirCaja = () => {
    setCerradaPor(null);
  };

  return (
    <section className="rounded-2xl sm:rounded-[28px] bg-white border border-slate-200 shadow-lg overflow-hidden">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-200">
        <h2 className="text-xl sm:text-2xl font-bold">Caja del día</h2>
        <p className="text-slate-500 mt-1 text-sm sm:text-base">
          Resumen financiero del turno y movimientos rápidos.
        </p>
      </div>
      <div className="p-4 sm:p-6 space-y-4">
        {cajaDelDia.map(([label, value]) => (
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
          <button
            type="button"
            onClick={cajaCerrada ? handleAbrirCaja : handleCerrarCaja}
            className="w-full rounded-2xl bg-slate-900 text-white py-3 font-semibold text-sm sm:text-base touch-manipulation hover:bg-slate-800 transition"
          >
            {cajaCerrada ? 'Abrir caja' : 'Cerrar caja'}
          </button>
          {cerradaPor && (
            <p className="mt-3 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2" role="status">
              Caja cerrada por <strong>{cerradaPor.nombre}</strong> el {cerradaPor.fecha}.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
