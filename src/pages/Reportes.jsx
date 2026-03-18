import ReportesDashboard from '../components/ReportesDashboard';

export default function Reportes() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">Reportes</h1>
        <p className="text-slate-600 -mt-2 sm:-mt-4 text-sm sm:text-base">
          Ventas, márgenes y análisis por período, producto y medio de pago.
        </p>
      </div>
      <ReportesDashboard />
    </div>
  );
}
