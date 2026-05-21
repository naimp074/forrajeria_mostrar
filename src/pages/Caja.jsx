import CajaDelDia from '../components/CajaDelDia';
import TicketRapido from '../components/TicketRapido';

export default function Caja() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">Caja</h1>
      <p className="text-slate-600 -mt-2 sm:-mt-4 text-sm sm:text-base">
        Resumen del turno, movimientos y ticket rápido.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(260px,400px)] gap-6 sm:gap-8">
        <CajaDelDia />
        <TicketRapido />
      </div>
    </div>
  );
}
