export default function TicketRapido() {
  return (
    <section className="rounded-2xl sm:rounded-[28px] bg-slate-900 text-white shadow-lg overflow-hidden">
      <div className="p-4 sm:p-6">
        <div className="text-xs sm:text-sm uppercase tracking-widest text-slate-400">Ticket rápido</div>
        <div className="text-lg sm:text-xl font-bold mt-2">Sin ticket generado</div>
        <div className="mt-4 sm:mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs sm:text-sm text-slate-300">
          Cuando proceses una venta, acá podés mostrar el último ticket.
        </div>
        <div className="border-t border-white/10 my-3 sm:my-4" />
        <div className="space-y-2 text-xs sm:text-sm">
          <div className="flex justify-between gap-4">
            <span>Total</span>
            <span>$0</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Paga</span>
            <span>$0</span>
          </div>
          <div className="flex justify-between font-bold text-sm sm:text-base gap-4">
            <span>Vuelto</span>
            <span>$0</span>
          </div>
        </div>
        <button disabled className="w-full mt-4 sm:mt-5 rounded-2xl bg-white/60 text-slate-900 py-3 font-semibold text-sm sm:text-base touch-manipulation disabled:opacity-60">
          Imprimir ticket
        </button>
      </div>
    </section>
  );
}
