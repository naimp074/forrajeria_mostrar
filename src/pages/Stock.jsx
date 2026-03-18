import { useStock } from '../context/StockContext';
import AgregarStock from '../components/AgregarStock';
import StockInteligente from '../components/StockInteligente';
import ComprasVentasGanancias from '../components/ComprasVentasGanancias';
import StockExcel from '../components/StockExcel';

const INGRESOS_KEY = 'forrajeria_ingresos';

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
  const { porProducto, setPorProducto } = useStock();

  const onRegistrarIngreso = (nombreProducto, cantidad, precioCompra, precioVenta, proveedor, numeroProveedor) => {
    setPorProducto((prev) => {
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
    guardarIngreso({
      producto: nombreProducto,
      cantidad,
      precioCompra,
      precioVenta,
      proveedor: (proveedor || '').trim(),
      numeroProveedor: (numeroProveedor || '').trim(),
      fecha: new Date().toISOString().slice(0, 10),
    });
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">Stock</h1>
      <p className="text-slate-600 -mt-2 sm:-mt-4 text-sm sm:text-base">
        Agregar ingresos, cargar compras y ventas por producto y ver el porcentaje de ganancia.
      </p>
      <StockExcel porProducto={porProducto} setPorProducto={setPorProducto} />
      <AgregarStock
        datosPorProducto={porProducto}
        onRegistrarIngreso={onRegistrarIngreso}
      />
      <ComprasVentasGanancias
        porProducto={porProducto}
        setPorProducto={setPorProducto}
      />
      <StockInteligente />
    </div>
  );
}
