import { ticketRapido } from '../data/mockData';

export default function TicketRapido() {
  const { nombreLocal, lineas, total, paga, vuelto } = ticketRapido;

  return (
    <section className="rounded-2xl sm:rounded-[28px] bg-slate-900 text-white shadow-lg overflow-hidden">
      <div className="p-4 sm:p-6">
        <div className="text-xs sm:text-sm uppercase tracking-widest text-slate-400">Ticket rápido</div>
        <div className="text-lg sm:text-xl font-bold mt-2">{nombreLocal}</div>
        <div className="mt-4 sm:mt-5 space-y-2 text-xs sm:text-sm text-slate-200">
          {lineas.map(([desc, precio]) => (
            <div key={desc} className="flex justify-between gap-4">
              <span className="min-w-0">{desc}</span>
              <span className="shrink-0">{precio}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 my-3 sm:my-4" />
        <div className="space-y-2 text-xs sm:text-sm">
          <div className="flex justify-between gap-4">
            <span>Total</span>
            <span>{total}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Paga</span>
            <span>{paga}</span>
          </div>
          <div className="flex justify-between font-bold text-sm sm:text-base gap-4">
            <span>Vuelto</span>
            <span>{vuelto}</span>
          </div>
        </div>
        <button className="w-full mt-4 sm:mt-5 rounded-2xl bg-white text-slate-900 py-3 font-semibold text-sm sm:text-base touch-manipulation">
          Imprimir ticket
        </button>
      </div>
    </section>
  );
}
