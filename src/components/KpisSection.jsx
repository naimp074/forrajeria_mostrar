import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { obtenerResumenReportes } from '../services/supabaseData';
import { ROUTES } from '../routes';

function formatMoneda(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

function KpiCard({ label, value, sub, destacado = false }) {
  return (
    <div
      className={`rounded-2xl sm:rounded-3xl bg-white border shadow-sm p-4 sm:p-5 ${
        destacado ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'
      }`}
    >
      <div className={`text-xs sm:text-sm font-semibold uppercase tracking-wide ${destacado ? 'text-amber-700' : 'text-slate-500'}`}>
        {label}
      </div>
      <div className={`text-2xl sm:text-3xl font-bold mt-1 sm:mt-2 truncate ${destacado ? 'text-amber-900' : 'text-slate-900'}`}>
        {value}
      </div>
      <div className="text-xs sm:text-sm text-slate-500 mt-1 sm:mt-2">{sub}</div>
    </div>
  );
}

export default function KpisSection() {
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;

    obtenerResumenReportes()
      .then((data) => {
        if (activo) setResumen(data);
      })
      .catch(() => {
        if (activo) setResumen(null);
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, []);

  const ventasHoy = resumen?.ventasHoy ?? 0;
  const plataParaReponerHoy = resumen?.plataParaReponerHoy ?? 0;
  const gananciaHoy = resumen?.gananciaHoy ?? 0;
  const ticketsHoy = resumen?.cantidadVentasHoy ?? 0;

  const ventasTotales = resumen?.ventasTotales ?? 0;
  const plataParaReponer = resumen?.plataParaReponer ?? resumen?.costoTotal ?? 0;
  const gananciaTotal = resumen?.margenBruto ?? 0;
  const hayVentas = ventasTotales > 0;
  const hayVentasHoy = ventasHoy > 0;

  const kpisHoy = [
    {
      label: 'Ventas hoy',
      value: cargando ? '...' : formatMoneda(ventasHoy),
      sub: ticketsHoy > 0 ? `${ticketsHoy} venta${ticketsHoy === 1 ? '' : 's'} hoy` : 'Sin ventas registradas hoy',
    },
    {
      label: 'Plata para reponer hoy',
      value: cargando ? '...' : formatMoneda(plataParaReponerHoy),
      sub: hayVentasHoy ? 'Costo de lo vendido hoy — no es ganancia' : 'Sin ventas hoy',
      destacado: true,
    },
    {
      label: 'Ganancia hoy',
      value: cargando ? '...' : formatMoneda(gananciaHoy),
      sub: hayVentasHoy ? 'Ventas de hoy menos plata para reponer' : 'Sin ventas hoy',
    },
  ];

  const kpisTotales = [
    {
      label: 'Ventas totales',
      value: cargando ? '...' : formatMoneda(ventasTotales),
      sub: hayVentas ? `${resumen?.cantidadVentas ?? 0} ventas registradas` : 'Sin ventas registradas',
    },
    {
      label: 'Plata para reponer',
      value: cargando ? '...' : formatMoneda(plataParaReponer),
      sub: hayVentas ? 'Costo de toda la mercadería vendida' : 'Sin ventas registradas',
      destacado: true,
    },
    {
      label: 'Ganancia total',
      value: cargando ? '...' : formatMoneda(gananciaTotal),
      sub: hayVentas ? 'Ventas totales menos plata para reponer' : 'Sin ventas registradas',
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-5">
      {hayVentas && !cargando && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 sm:p-5">
          <p className="text-sm text-amber-800">
            De tus ventas totales ({formatMoneda(ventasTotales)}),{' '}
            <strong>{formatMoneda(plataParaReponer)}</strong> es plata para{' '}
            <strong>volver a comprar</strong> lo que ya vendiste. Tu ganancia de ventas es{' '}
            <strong>{formatMoneda(gananciaTotal)}</strong>.
          </p>
          <Link
            to={ROUTES.reportes}
            className="inline-block mt-2 text-sm font-semibold text-amber-900 hover:text-amber-950 underline underline-offset-2"
          >
            Ver detalle por semana y mes en Reportes
          </Link>
        </div>
      )}

      <div>
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-3">Hoy</h2>
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {kpisHoy.map((item) => (
            <KpiCard key={item.label} {...item} />
          ))}
        </section>
      </div>

      <div>
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-3">Total acumulado</h2>
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {kpisTotales.map((item) => (
            <KpiCard key={item.label} {...item} />
          ))}
        </section>
      </div>
    </div>
  );
}
