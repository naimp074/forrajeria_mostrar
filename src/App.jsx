import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GastosProvider } from './context/GastosContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StockProvider } from './context/StockContext';
import { ProductosProvider } from './context/ProductosContext';
import Layout from './components/Layout';
import './App.css';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Ventas = lazy(() => import('./pages/Ventas'));
const Presupuestos = lazy(() => import('./pages/Presupuestos'));
const Caja = lazy(() => import('./pages/Caja'));
const Stock = lazy(() => import('./pages/Stock'));
const Productos = lazy(() => import('./pages/Productos'));
const Promos = lazy(() => import('./pages/Promos'));
const Pedir = lazy(() => import('./pages/Pedir'));
const Clientes = lazy(() => import('./pages/Clientes'));
const Proveedores = lazy(() => import('./pages/Proveedores'));
const Reportes = lazy(() => import('./pages/Reportes'));
const Gastos = lazy(() => import('./pages/Gastos'));
const Configuracion = lazy(() => import('./pages/Configuracion'));

function PantallaCarga() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="text-slate-500">Cargando...</div>
    </div>
  );
}

function RutaProtegida({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return <PantallaCarga />;
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
        <BrowserRouter>
          <Suspense fallback={<PantallaCarga />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/pedir" element={<Pedir />} />
              <Route
                path="/"
                element={
                  <RutaProtegida>
                    <ProductosProvider>
                      <StockProvider>
                        <Layout />
                      </StockProvider>
                    </ProductosProvider>
                  </RutaProtegida>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="ventas" element={<Ventas />} />
                <Route path="presupuestos" element={<Presupuestos />} />
                <Route path="caja" element={<Caja />} />
                <Route path="stock" element={<Stock />} />
                <Route path="productos" element={<Productos />} />
                <Route path="promos" element={<Promos />} />
                <Route path="clientes" element={<Clientes />} />
                <Route path="proveedores" element={<Proveedores />} />
                <Route path="reportes" element={<Reportes />} />
                <Route path="gastos" element={<Gastos />} />
                <Route path="configuracion" element={<Configuracion />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </GastosProvider>
    </AuthProvider>
  );
}
