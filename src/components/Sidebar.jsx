import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { MENU_ITEMS } from '../routes';
import { useAuth } from '../context/AuthContext';

const STORAGE_KEY = 'forrajeria_sidebar_colapsado';

const IconoCerrar = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const IconoColapsar = ({ colapsado }) => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {colapsado ? (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
    ) : (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
    )}
  </svg>
);

const IconoSalir = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

function iconoMenu(path) {
  const props = { className: 'w-5 h-5 shrink-0', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' };
  const stroke = { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2 };

  switch (path) {
    case '/':
      return (
        <svg {...props}><path {...stroke} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
      );
    case '/ventas':
      return (
        <svg {...props}><path {...stroke} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
      );
    case '/presupuestos':
      return (
        <svg {...props}><path {...stroke} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
      );
    case '/caja':
      return (
        <svg {...props}><path {...stroke} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
      );
    case '/stock':
      return (
        <svg {...props}><path {...stroke} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
      );
    case '/productos':
      return (
        <svg {...props}><path {...stroke} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" /></svg>
      );
    case '/clientes':
      return (
        <svg {...props}><path {...stroke} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
      );
    case '/proveedores':
      return (
        <svg {...props}><path {...stroke} d="M8 17l4 4 4-4m-4-5v9M3 7h18M5 7l1.5 12h11L19 7M9 7V5a3 3 0 016 0v2" /></svg>
      );
    case '/reportes':
      return (
        <svg {...props}><path {...stroke} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
      );
    case '/gastos':
      return (
        <svg {...props}><path {...stroke} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>
      );
    case '/configuracion':
      return (
        <svg {...props}><path {...stroke} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path {...stroke} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
      );
    default:
      return (
        <svg {...props}><path {...stroke} d="M4 6h16M4 12h16M4 18h16" /></svg>
      );
  }
}

export default function Sidebar({ abierto = false, onCerrar }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [colapsado, setColapsado] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, colapsado ? '1' : '0');
    } catch {
      // Persistencia best-effort.
    }
  }, [colapsado]);

  const linkClass = ({ isActive }) => {
    const base = colapsado
      ? 'flex items-center justify-center rounded-xl p-3 border'
      : 'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium border';
    const state = isActive
      ? 'bg-emerald-500/20 border-emerald-400/30 text-white'
      : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10';
    return `${base} ${state}`;
  };

  const cerrarSesion = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Desktop: sidebar colapsable */}
      <aside
        className={`hidden lg:flex shrink-0 bg-slate-950 text-white flex-col transition-all duration-300 ease-in-out ${
          colapsado ? 'w-[4.75rem] p-3' : 'w-72 p-6'
        }`}
      >
        <div className={`flex items-center ${colapsado ? 'justify-center' : 'justify-between gap-2'}`}>
          {colapsado ? (
            <div
              className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center font-bold text-emerald-300"
              title="Forrajería Pro"
            >
              F
            </div>
          ) : (
            <div className="min-w-0">
              <div className="text-xl font-bold tracking-tight">Forrajería Pro</div>
              <div className="text-slate-400 text-xs mt-1">Gestión del negocio</div>
            </div>
          )}
          {!colapsado && (
            <button
              type="button"
              onClick={() => setColapsado(true)}
              className="p-2 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition shrink-0"
              aria-label="Minimizar menú"
              title="Minimizar menú"
            >
              <IconoColapsar colapsado={false} />
            </button>
          )}
        </div>

        {colapsado && (
          <button
            type="button"
            onClick={() => setColapsado(false)}
            className="mt-3 flex items-center justify-center rounded-xl p-2.5 text-slate-400 hover:bg-white/10 hover:text-white transition w-full"
            aria-label="Expandir menú"
            title="Expandir menú"
          >
            <IconoColapsar colapsado />
          </button>
        )}

        <nav className={`flex-1 overflow-y-auto overflow-x-hidden ${colapsado ? 'mt-3 space-y-1.5' : 'mt-6 space-y-1.5'}`}>
          {MENU_ITEMS.map(({ label, path }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={linkClass}
              title={colapsado ? label : undefined}
            >
              {iconoMenu(path)}
              {!colapsado && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className={`mt-4 space-y-2 ${colapsado ? '' : 'space-y-3'}`}>
          {!colapsado && (
            <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
              <div className="text-xs text-slate-400">Caja actual</div>
              <div className="text-2xl font-bold mt-1">$0</div>
              <div className="text-xs text-slate-400 mt-1">Sin movimientos</div>
            </div>
          )}

          {colapsado ? (
            <button
              type="button"
              onClick={cerrarSesion}
              className="flex items-center justify-center w-full rounded-xl p-3 text-slate-400 hover:bg-white/10 hover:text-white border border-white/5 transition"
              title={`Cerrar sesión (${user?.nombre ?? 'usuario'})`}
              aria-label="Cerrar sesión"
            >
              <IconoSalir />
            </button>
          ) : (
            <div className="rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center justify-between gap-2">
              <span className="text-sm text-slate-400 truncate">{user?.nombre ?? '—'}</span>
              <button
                type="button"
                onClick={cerrarSesion}
                className="text-xs font-medium text-slate-400 hover:text-white transition px-2 py-1 rounded-lg hover:bg-white/10 shrink-0"
              >
                Salir
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Móvil: drawer */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-40 w-[min(20rem,88vw)] bg-slate-950 text-white flex flex-col px-3 py-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-5 shadow-2xl transition-transform duration-300 ease-out ${
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
        <nav className="mt-4 sm:mt-5 space-y-1 overflow-y-auto flex-1 min-w-0">
          {MENU_ITEMS.map(({ label, path }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium border ${
                  isActive
                    ? 'bg-emerald-500/20 border-emerald-400/30 text-white'
                    : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                }`
              }
              onClick={onCerrar}
            >
              {iconoMenu(path)}
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="mt-4 space-y-2">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
            <div className="text-xs text-slate-400">Caja actual</div>
            <div className="text-xl font-bold mt-1">$0</div>
            <div className="text-xs text-slate-400 mt-1">Sin movimientos</div>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center justify-between gap-2">
            <span className="text-sm text-slate-400 truncate">{user?.nombre ?? '—'}</span>
            <button
              type="button"
              onClick={() => { cerrarSesion(); onCerrar?.(); }}
              className="text-xs font-medium text-slate-400 hover:text-white transition px-2 py-1 rounded-lg hover:bg-white/10"
            >
              Salir
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
