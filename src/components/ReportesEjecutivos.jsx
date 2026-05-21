export default function ReportesEjecutivos() {
  const reportesEjecutivos = [];

  return (
    <section className="rounded-2xl sm:rounded-[28px] bg-white border border-slate-200 shadow-lg overflow-hidden">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-200">
        <h2 className="text-xl sm:text-2xl font-bold">Reportes ejecutivos</h2>
        <p className="text-slate-500 mt-1">
          Indicadores para tomar decisiones rápidas.
        </p>
      </div>
      <div className="p-4 sm:p-6 space-y-4">
        {reportesEjecutivos.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
            Todavía no hay datos suficientes para generar reportes.
          </div>
        )}
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
