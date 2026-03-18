import Sidebar from './Sidebar';
import DashboardHeader from './DashboardHeader';
import KpisSection from './KpisSection';
import VentaRapida from './VentaRapida';
import StockInteligente from './StockInteligente';
import ClientesFiados from './ClientesFiados';
import CajaDelDia from './CajaDelDia';
import ReportesEjecutivos from './ReportesEjecutivos';
import TicketRapido from './TicketRapido';

export default function ForrajeriaMockups() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <Sidebar />

        <main className="flex-1 p-5 md:p-8 xl:p-10">
          <div className="max-w-7xl mx-auto space-y-8">
            <DashboardHeader />
            <KpisSection />

            <section className="grid xl:grid-cols-[1.35fr_0.95fr] gap-8">
              <div className="space-y-8">
                <VentaRapida />

                <div className="grid lg:grid-cols-2 gap-8">
                  <StockInteligente />
                  <ClientesFiados />
                </div>
              </div>

              <div className="space-y-8">
                <CajaDelDia />
                <ReportesEjecutivos />
                <TicketRapido />
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
