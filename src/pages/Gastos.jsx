import GastosSection from '../components/GastosSection';

export default function Gastos() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">Gastos</h1>
      <p className="text-slate-600 -mt-2 sm:-mt-4 text-sm sm:text-base">
        Cargá gastos (comida, sueldos, AFIP, luz, etc.) y mirá el resumen por categoría.
      </p>
      <GastosSection />
    </div>
  );
}
