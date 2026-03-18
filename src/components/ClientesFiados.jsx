import { debtClients } from '../data/mockData';

export default function ClientesFiados() {
  return (
    <section className="rounded-[28px] bg-white border border-slate-200 shadow-lg overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-200">
        <h2 className="text-2xl font-bold">Clientes y fiados</h2>
        <p className="text-slate-500 mt-1">
          Seguimiento de deudas, pagos parciales e historial.
        </p>
      </div>
      <div className="p-6 space-y-4">
        {debtClients.map(([name, debt, time]) => (
          <div
            key={name}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-between gap-4"
          >
            <div>
              <div className="font-semibold">{name}</div>
              <div className="text-sm text-slate-500">Último movimiento: {time}</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-lg">{debt}</div>
              <div className="text-sm text-amber-700">Pendiente</div>
            </div>
          </div>
        ))}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button className="rounded-2xl border border-slate-300 bg-white py-3 font-semibold">
            Ver historial
          </button>
          <button className="rounded-2xl bg-amber-500 text-white py-3 font-semibold">
            Registrar pago
          </button>
        </div>
      </div>
    </section>
  );
}
