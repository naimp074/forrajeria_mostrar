import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const IconoMenu = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

export default function Layout() {
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* Barra superior móvil: solo visible en pantallas pequeñas */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between gap-4 px-4 py-3 bg-slate-950 text-white shadow-md">
        <button
          type="button"
          onClick={() => setMenuAbierto(true)}
          className="p-2 -ml-2 rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition"
          aria-label="Abrir menú"
        >
          <IconoMenu />
        </button>
        <span className="text-lg font-bold tracking-tight truncate">Forrajería Pro</span>
        <span className="w-10" aria-hidden />
      </header>

      <div className="flex min-h-screen">
        <Sidebar abierto={menuAbierto} onCerrar={() => setMenuAbierto(false)} />
        <main className="flex-1 w-full min-w-0 p-4 sm:p-5 md:p-8 xl:p-10 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Overlay para cerrar el drawer al tocar fuera */}
      {menuAbierto && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
          onClick={() => setMenuAbierto(false)}
        />
      )}
    </div>
  );
}
