import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GastosProvider } from './context/GastosContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StockProvider } from './context/StockContext';
import { ProductosProvider } from './context/ProductosContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Ventas from './pages/Ventas';
import Presupuestos from './pages/Presupuestos';
import Caja from './pages/Caja';
import Stock from './pages/Stock';
import Productos from './pages/Productos';
import Clientes from './pages/Clientes';
import Proveedores from './pages/Proveedores';
import Reportes from './pages/Reportes';
import Gastos from './pages/Gastos';
import Configuracion from './pages/Configuracion';
import './App.css';

function RutaProtegida({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-slate-500">Cargando...</div>
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <GastosProvider>
        <ProductosProvider>
          <StockProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/"
                  element={
                    <RutaProtegida>
                      <Layout />
                    </RutaProtegida>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="ventas" element={<Ventas />} />
                  <Route path="presupuestos" element={<Presupuestos />} />
                  <Route path="caja" element={<Caja />} />
                  <Route path="stock" element={<Stock />} />
                  <Route path="productos" element={<Productos />} />
                  <Route path="clientes" element={<Clientes />} />
                  <Route path="proveedores" element={<Proveedores />} />
                  <Route path="reportes" element={<Reportes />} />
                  <Route path="gastos" element={<Gastos />} />
                  <Route path="configuracion" element={<Configuracion />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </StockProvider>
        </ProductosProvider>
      </GastosProvider>
    </AuthProvider>
  );
}
