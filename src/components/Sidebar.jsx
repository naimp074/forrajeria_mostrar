import { NavLink, useNavigate } from 'react-router-dom';
import { MENU_ITEMS } from '../routes';
import { useAuth } from '../context/AuthContext';

const IconoCerrar = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export default function Sidebar({ abierto = false, onCerrar }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const linkClass = ({ isActive }) =>
    `block rounded-2xl px-4 py-3.5 text-base lg:py-3 lg:text-sm font-medium border ${
      isActive
        ? 'bg-emerald-500/20 border-emerald-400/30 text-white'
        : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
    }`;

  return (
    <>
      {/* Desktop: sidebar fijo */}
      <aside className="hidden lg:flex w-72 shrink-0 bg-slate-950 text-white flex-col p-6">
        <div>
          <div className="text-2xl font-bold tracking-tight">Forrajería Pro</div>
          <div className="text-slate-400 mt-1">Gestión completa del negocio</div>
        </div>
        <nav className="mt-8 space-y-2">
          {MENU_ITEMS.map(({ label, path }) => (
            <NavLink key={path} to={path} end={path === '/'} className={linkClass}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-3">
          <div className="rounded-3xl bg-white/5 border border-white/10 p-4">
            <div className="text-sm text-slate-400">Caja actual</div>
            <div className="text-3xl font-bold mt-1">$0</div>
            <div className="text-sm text-slate-400 mt-2">Sin movimientos</div>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center justify-between gap-2">
            <span className="text-sm text-slate-400 truncate">{user?.nombre ?? '—'}</span>
            <button
              type="button"
              onClick={() => { logout(); navigate('/login'); }}
              className="text-xs font-medium text-slate-400 hover:text-white transition px-2 py-1 rounded-lg hover:bg-white/10"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Móvil: drawer bien estrecho para aprovechar la pantalla */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-40 w-[min(22rem,92vw)] bg-slate-950 text-white flex flex-col px-3 py-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-5 shadow-2xl transition-transform duration-300 ease-out ${
          abierto ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!abierto}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="min-w-0">
            <div className="text-lg font-bold tracking-tight truncate">Forrajería Pro</div>
            <div className="text-slate-400 text-xs mt-0.5">Gestión del negocio</div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition shrink-0"
            aria-label="Cerrar menú"
          >
            <IconoCerrar />
          </button>
        </div>
        <nav className="mt-4 sm:mt-6 space-y-1 sm:space-y-2 overflow-y-auto flex-1 min-w-0">
          {MENU_ITEMS.map(({ label, path }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={linkClass}
              onClick={onCerrar}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-4 space-y-2">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="text-sm text-slate-400">Caja actual</div>
            <div className="text-2xl font-bold mt-1">$0</div>
            <div className="text-sm text-slate-400 mt-2">Sin movimientos</div>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center justify-between gap-2">
            <span className="text-sm text-slate-400 truncate">{user?.nombre ?? '—'}</span>
            <button
              type="button"
              onClick={() => { logout(); navigate('/login'); onCerrar?.(); }}
              className="text-xs font-medium text-slate-400 hover:text-white transition px-2 py-1 rounded-lg hover:bg-white/10"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
