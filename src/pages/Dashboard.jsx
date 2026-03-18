import DashboardHeader from '../components/DashboardHeader';
import KpisSection from '../components/KpisSection';
import StockInteligente from '../components/StockInteligente';
import CajaDelDia from '../components/CajaDelDia';
import ClientesFiados from '../components/ClientesFiados';

export default function Dashboard() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardHeader />
      <KpisSection />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
        <CajaDelDia />
        <StockInteligente />
      </div>

      <ClientesFiados />
    </div>
  );
}
