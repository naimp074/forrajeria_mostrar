import { useEffect, useState } from 'react';
import { obtenerResumenReportes } from '../services/supabaseData';

function formatMoneda(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
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
  const gananciaHoy = resumen?.gananciaHoy ?? 0;
  const ticketsHoy = resumen?.cantidadVentasHoy ?? 0;

  const kpis = [
    {
      label: 'Ventas hoy',
      value: cargando ? '...' : formatMoneda(ventasHoy),
      sub: ticketsHoy > 0 ? `${ticketsHoy} venta${ticketsHoy === 1 ? '' : 's'} hoy` : 'Sin ventas registradas hoy',
    },
    {
      label: 'Ganancia estimada',
      value: cargando ? '...' : formatMoneda(gananciaHoy),
      sub: ventasHoy > 0 ? 'Margen bruto del día' : 'Sin ventas registradas',
    },
    {
      label: 'Tickets emitidos',
      value: cargando ? '...' : String(ticketsHoy),
      sub: ticketsHoy > 0 ? 'Ventas de hoy' : 'Sin tickets emitidos',
    },
    {
      label: 'Saldo pendiente',
      value: '$0',
      sub: 'Sin saldos registrados',
    },
  ];

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
      {kpis.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl sm:rounded-3xl bg-white border border-slate-200 shadow-sm p-4 sm:p-5"
        >
          <div className="text-xs sm:text-sm text-slate-500">{item.label}</div>
          <div className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2 truncate">{item.value}</div>
          <div className="text-xs sm:text-sm text-slate-500 mt-1 sm:mt-2">{item.sub}</div>
        </div>
      ))}
    </section>
  );
}
