import { useCallback, useEffect, useState } from 'react';
import { useGastos } from '../context/GastosContext';
import { obtenerResumenReportes } from '../services/supabaseData';

function formatMoneda(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatFecha(fechaIso) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(fechaIso));
}

function BarraProgreso({ label, valor, maximo, extra }) {
  const porcentaje = maximo > 0 ? Math.round((valor / maximo) * 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-700 truncate pr-2">{label}</span>
        <span className="font-semibold text-slate-900 shrink-0">{formatMoneda(valor)}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{ width: `${Math.max(porcentaje, valor > 0 ? 4 : 0)}%` }}
        />
      </div>
      {extra && <div className="text-xs text-slate-500">{extra}</div>}
    </div>
  );
}

function PanelDatos({ titulo, vacio, children }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 min-h-56 flex flex-col">
      <h3 className="text-lg font-bold text-slate-900">{titulo}</h3>
      {vacio ? (
        <div className="mt-6 flex-1 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-500 flex items-center justify-center">
          Todavía no hay datos para mostrar.
        </div>
      ) : (
        <div className="mt-4 space-y-3 flex-1">{children}</div>
      )}
    </div>
  );
}

export default function ReportesDashboard() {
  const { totalGastos } = useGastos();
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargarReportes = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const data = await obtenerResumenReportes();
      setResumen(data);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los reportes.');
      setResumen(null);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarReportes();
  }, [cargarReportes]);

  const ventasTotales = resumen?.ventasTotales ?? 0;
  const margenBruto = resumen?.margenBruto ?? 0;
  const margenNeto = margenBruto - totalGastos;
  const margenPorcentaje = resumen?.margenPorcentaje ?? 0;
  const hayVentas = ventasTotales > 0;

  const maxProducto = resumen?.ventasPorProducto?.[0]?.ventas ?? 0;
  const maxMedio = resumen?.ventasPorMedioPago?.[0]?.total ?? 0;
  const maxMes = Math.max(...(resumen?.ventasMensuales?.map((item) => item.ventas) ?? [0]));
  const maxDia = Math.max(...(resumen?.ventasDiarias?.map((item) => item.ventas) ?? [0]));

  const kpis = [
    {
      label: 'Ventas totales',
      value: formatMoneda(ventasTotales),
      sub: hayVentas ? `${resumen.cantidadVentas} ventas registradas` : 'Sin ventas registradas',
    },
    {
      label: 'Ventas hoy',
      value: formatMoneda(resumen?.ventasHoy ?? 0),
      sub: resumen?.cantidadVentasHoy
        ? `${resumen.cantidadVentasHoy} venta${resumen.cantidadVentasHoy === 1 ? '' : 's'} hoy`
        : 'Sin ventas hoy',
    },
    {
      label: 'Margen bruto',
      value: formatMoneda(margenBruto),
      sub: hayVentas ? 'Ventas menos costo estimado' : 'Sin ventas registradas',
    },
    {
      label: 'Total gastos',
      value: formatMoneda(totalGastos),
      sub: 'Cargados en Gastos',
    },
    {
      label: 'Margen neto',
      value: formatMoneda(margenNeto),
      sub: 'Después de gastos',
    },
    {
      label: 'Margen %',
      value: `${margenPorcentaje}%`,
      sub: hayVentas ? 'Sobre ventas totales' : 'Sin ventas registradas',
    },
  ];

  if (cargando) {
    return (
      <div className="rounded-2xl sm:rounded-[28px] bg-slate-100 border border-slate-200 shadow-lg p-8 text-center text-slate-600">
        Cargando reportes...
      </div>
    );
  }

  return (
    <div className="rounded-2xl sm:rounded-[28px] bg-slate-100 border border-slate-200 shadow-lg p-4 sm:p-6 space-y-6">
      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-red-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span>{error}</span>
          <button
            type="button"
            onClick={cargarReportes}
            className="rounded-xl bg-red-600 text-white px-4 py-2 text-sm font-semibold hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          {hayVentas
            ? 'Datos reales de tus ventas guardadas en Supabase.'
            : 'Cuando registres ventas, van a aparecer acá automáticamente.'}
        </p>
        <button
          type="button"
          onClick={cargarReportes}
          className="rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 shrink-0"
        >
          Actualizar
        </button>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-3 sm:gap-4">
        {kpis.map((item) => (
          <div key={item.label} className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{item.value}</div>
            <div className="text-xs text-slate-500 mt-1">{item.sub}</div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <PanelDatos titulo="Ventas mensuales" vacio={!resumen?.ventasMensuales?.length}>
          {resumen?.ventasMensuales?.map((item) => (
            <BarraProgreso key={item.clave} label={item.label} valor={item.ventas} maximo={maxMes} />
          ))}
        </PanelDatos>

        <PanelDatos titulo="Ventas por producto" vacio={!resumen?.ventasPorProducto?.length}>
          {resumen?.ventasPorProducto?.slice(0, 8).map((item) => (
            <BarraProgreso
              key={item.nombre}
              label={item.nombre}
              valor={item.ventas}
              maximo={maxProducto}
              extra={`${item.unidades} unidades/kg vendidos`}
            />
          ))}
        </PanelDatos>

        <PanelDatos titulo="Medios de pago" vacio={!resumen?.ventasPorMedioPago?.length}>
          {resumen?.ventasPorMedioPago?.map((item) => (
            <BarraProgreso
              key={item.metodo}
              label={item.label}
              valor={item.total}
              maximo={maxMedio}
              extra={`${item.cantidad} venta${item.cantidad === 1 ? '' : 's'}`}
            />
          ))}
        </PanelDatos>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PanelDatos titulo="Ventas diarias (últimos 14 días)" vacio={!hayVentas}>
          {resumen?.ventasDiarias?.map((item) => (
            <BarraProgreso key={item.clave} label={item.label} valor={item.ventas} maximo={maxDia} />
          ))}
        </PanelDatos>

        <PanelDatos titulo="Distribución del margen" vacio={!hayVentas}>
          <BarraProgreso label="Costo estimado" valor={ventasTotales - margenBruto} maximo={ventasTotales} />
          <BarraProgreso label="Margen bruto" valor={margenBruto} maximo={ventasTotales} />
          <BarraProgreso label="Gastos" valor={totalGastos} maximo={ventasTotales} />
          <BarraProgreso
            label="Margen neto"
            valor={Math.max(margenNeto, 0)}
            maximo={ventasTotales}
            extra={margenNeto < 0 ? `Pérdida neta: ${formatMoneda(Math.abs(margenNeto))}` : undefined}
          />
        </PanelDatos>
      </section>

      <section className="rounded-2xl bg-white border border-slate-200 p-5">
        <h3 className="text-lg font-bold text-slate-900">Últimas ventas</h3>
        {!resumen?.ultimasVentas?.length ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
            Todavía no hay ventas para listar.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-3 pr-4 font-semibold">Fecha</th>
                  <th className="py-3 pr-4 font-semibold">Cliente</th>
                  <th className="py-3 pr-4 font-semibold">Pago</th>
                  <th className="py-3 pr-4 font-semibold">Productos</th>
                  <th className="py-3 font-semibold text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {resumen.ultimasVentas.map((venta) => (
                  <tr key={venta.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 pr-4 text-slate-700 whitespace-nowrap">{formatFecha(venta.fecha)}</td>
                    <td className="py-3 pr-4 text-slate-900">{venta.cliente}</td>
                    <td className="py-3 pr-4 capitalize text-slate-700">{venta.metodoPago}</td>
                    <td className="py-3 pr-4 text-slate-600">
                      {venta.lineas.map((linea) => linea.productoNombre).join(', ') || '—'}
                    </td>
                    <td className="py-3 text-right font-semibold text-slate-900">{formatMoneda(venta.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
