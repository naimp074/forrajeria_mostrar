import { useGastos } from '../context/GastosContext';

function formatMoneda(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ReportesDashboard() {
  const { totalGastos } = useGastos();
  const ventasTotales = 0;
  const margenBruto = 0;
  const margenNeto = margenBruto - totalGastos;

  const kpis = [
    { label: 'Ventas totales', value: formatMoneda(ventasTotales), sub: 'Sin ventas registradas' },
    { label: 'Margen bruto', value: formatMoneda(margenBruto), sub: 'Sin ventas registradas' },
    { label: 'Total gastos', value: formatMoneda(totalGastos), sub: 'Cargados en Gastos' },
    { label: 'Margen neto', value: formatMoneda(margenNeto), sub: 'Después de gastos' },
    { label: 'Margen %', value: '0%', sub: 'Sin ventas registradas' },
  ];

  return (
    <div className="rounded-2xl sm:rounded-[28px] bg-slate-100 border border-slate-200 shadow-lg p-4 sm:p-6 space-y-6">
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 sm:gap-4">
        {kpis.map((item) => (
          <div key={item.label} className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{item.value}</div>
            <div className="text-xs text-slate-500 mt-1">{item.sub}</div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {['Ventas mensuales', 'Ventas por producto', 'Medios de pago'].map((titulo) => (
          <div key={titulo} className="rounded-2xl bg-white border border-slate-200 p-5 min-h-56">
            <h3 className="text-lg font-bold text-slate-900">{titulo}</h3>
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
              Todavía no hay datos para mostrar.
            </div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {['Ventas diarias', 'Distribución del margen'].map((titulo) => (
          <div key={titulo} className="rounded-2xl bg-white border border-slate-200 p-5 min-h-64">
            <h3 className="text-lg font-bold text-slate-900">{titulo}</h3>
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
              Se va a completar cuando cargues ventas y movimientos reales.
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
