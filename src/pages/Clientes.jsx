import ClientesFiados from '../components/ClientesFiados';

export default function Clientes() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">Clientes</h1>
      <p className="text-slate-600 -mt-2 sm:-mt-4 text-sm sm:text-base">
        Clientes y seguimiento de fiados.
      </p>
      <ClientesFiados />
    </div>
  );
}
