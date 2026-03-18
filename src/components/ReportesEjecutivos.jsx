import { reportesEjecutivos } from '../data/mockData';

export default function ReportesEjecutivos() {
  return (
    <section className="rounded-[28px] bg-white border border-slate-200 shadow-lg overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-200">
        <h2 className="text-2xl font-bold">Reportes ejecutivos</h2>
        <p className="text-slate-500 mt-1">
          Indicadores para tomar decisiones rápidas.
        </p>
      </div>
      <div className="p-6 space-y-4">
        {reportesEjecutivos.map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl bg-slate-50 border border-slate-200 p-4"
          >
            <div className="text-sm text-slate-500">{label}</div>
            <div className="text-lg font-bold mt-1">{value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
