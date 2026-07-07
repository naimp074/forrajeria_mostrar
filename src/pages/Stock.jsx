import { useCallback } from 'react';
import { useStock } from '../context/StockContext';
import { useProductos } from '../context/ProductosContext';
import AgregarStock from '../components/AgregarStock';
import StockInteligente from '../components/StockInteligente';
import ComprasVentasGanancias from '../components/ComprasVentasGanancias';
import StockExcel from '../components/StockExcel';
import StockTicketPdf from '../components/StockTicketPdf';
import { registrarIngresoStock } from '../services/supabaseData';

const INGRESOS_KEY = 'forrajeria_ingresos_v2';

function getIngresosGuardados() {
  try {
    return JSON.parse(localStorage.getItem(INGRESOS_KEY) || '[]');
  } catch {
    return [];
  }
}

function guardarIngreso(ingreso) {
  const list = getIngresosGuardados();
  list.push(ingreso);
  localStorage.setItem(INGRESOS_KEY, JSON.stringify(list));
}

export default function Stock() {
  const { porProducto, setPorProducto, loading, error } = useStock();
  const { recargarProductos } = useProductos();

  const setPorProductoSincronizado = useCallback((updater) => {
    setPorProducto(updater);
    window.setTimeout(() => {
      recargarProductos();
    }, 500);
  }, [setPorProducto, recargarProductos]);

  const onRegistrarIngreso = (
    nombreProducto,
    cantidad,
    precioCompra,
    precioVenta,
    proveedor,
    numeroProveedor,
    unidadMedida,
    observacion
  ) => {
    setPorProductoSincronizado((prev) => {
      const actual = prev[nombreProducto] || {
        cantidadComprada: 0,
        cantidadVendida: 0,
        precioCompra: 0,
        precioVenta: 0,
      };
      return {
        ...prev,
        [nombreProducto]: {
          ...actual,
          cantidadComprada: actual.cantidadComprada + cantidad,
          precioCompra: precioCompra || actual.precioCompra,
          precioVenta: precioVenta || actual.precioVenta,
        },
      };
    });
    const ingreso = {
      producto: nombreProducto,
      cantidad,
      precioCompra,
      precioVenta,
      proveedor: (proveedor || '').trim(),
      numeroProveedor: (numeroProveedor || '').trim(),
      unidad: unidadMedida || '',
      observacion: (observacion || '').trim(),
      fecha: new Date().toISOString().slice(0, 10),
    };
    guardarIngreso(ingreso);
    registrarIngresoStock(ingreso)
      .then(() => recargarProductos())
      .catch((err) => {
        console.warn('No se pudo registrar el ingreso en Supabase.', err);
      });
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">Stock</h1>
      <p className="text-slate-600 -mt-2 sm:-mt-4 text-sm sm:text-base">
        Agregar ingresos, cargar compras y ventas por producto y ver el porcentaje de ganancia.
      </p>
      {loading && (
        <p className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-500">
          Cargando stock desde Supabase...
        </p>
      )}
      {error && (
        <p className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
          {error}
        </p>
      )}
      <StockExcel porProducto={porProducto} setPorProducto={setPorProductoSincronizado} />
      <StockTicketPdf onRegistrarIngreso={onRegistrarIngreso} />
      <AgregarStock
        datosPorProducto={porProducto}
        onRegistrarIngreso={onRegistrarIngreso}
      />
      <ComprasVentasGanancias
        porProducto={porProducto}
        setPorProducto={setPorProductoSincronizado}
      />
      <StockInteligente />
    </div>
  );
}
