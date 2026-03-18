export default function Configuracion() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">Configuración</h1>
      <p className="text-slate-600 -mt-2 sm:-mt-4 text-sm sm:text-base">
        Ajustes del sistema y preferencias.
      </p>
      <section className="rounded-2xl sm:rounded-[28px] bg-white border border-slate-200 shadow-lg overflow-hidden">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-200">
          <h2 className="text-xl sm:text-2xl font-bold">Configuración</h2>
          <p className="text-slate-500 mt-1">
            Nombre del local, caja, usuarios, etc.
          </p>
        </div>
        <div className="p-4 sm:p-6">
          <div className="rounded-2xl bg-slate-50 border border-slate-200 border-dashed p-6 sm:p-8 text-center text-slate-500 text-sm sm:text-base">
            Aquí irán las opciones de configuración.
          </div>
        </div>
      </section>
    </div>
  );
}
