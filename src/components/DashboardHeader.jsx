import { Link } from 'react-router-dom';
import { ROUTES } from '../routes';

export default function DashboardHeader() {
  return (
    <header className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
          Panel de inicio
        </h1>
        <p className="text-slate-600 mt-2 max-w-3xl">
          Resumen del día, ventas, ganancia, fiado y alertas. Accesos rápidos a nueva venta y registro de stock.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full xl:w-auto min-w-0">
        <Link
          to={ROUTES.ventas}
          className="rounded-2xl bg-slate-900 text-white px-5 py-3 font-semibold shadow-sm text-center hover:bg-slate-800 transition"
        >
          Nueva venta
        </Link>
        <Link
          to={ROUTES.stock}
          className="rounded-2xl bg-white border border-slate-200 px-5 py-3 font-semibold shadow-sm text-center hover:bg-slate-50 transition"
        >
          Registrar ingreso
        </Link>
      </div>
    </header>
  );
}
