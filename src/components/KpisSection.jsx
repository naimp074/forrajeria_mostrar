const kpis = [
  { label: 'Ventas hoy', value: '$0', sub: 'Sin ventas registradas' },
  { label: 'Ganancia estimada', value: '$0', sub: 'Sin ventas registradas' },
  { label: 'Tickets emitidos', value: '0', sub: 'Sin tickets emitidos' },
  { label: 'Saldo pendiente', value: '$0', sub: 'Sin saldos registrados' },
];

export default function KpisSection() {
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
