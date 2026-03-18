import { useState } from 'react';
import { useGastos } from '../context/GastosContext';
import { quickProducts } from '../data/mockData';

function parsePrecio(str) {
  if (typeof str === 'number') return str;
  const num = parseInt(String(str).replace(/[^\d]/g, ''), 10);
  return isNaN(num) ? 0 : num;
}

const estadoInicial = () =>
  quickProducts.reduce((acc, p) => {
    acc[p.name] = {
      cantidadComprada: 0,
      cantidadVendida: 0,
      precioCompra: p.precioCompra ?? 0,
      precioVenta: parsePrecio(p.price) || 0,
    };
    return acc;
  }, {});

function formatMoneda(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

export default function ComprasVentasGanancias({ porProducto: porProductoProp, setPorProducto: setPorProductoProp }) {
  const { totalGastos } = useGastos();
  const [estadoLocal, setEstadoLocal] = useState(estadoInicial);
  const porProducto = porProductoProp ?? estadoLocal;
  const setPorProducto = setPorProductoProp ?? setEstadoLocal;

  // Costo total del stock (si no hay cantidades cargadas, usamos 1 unidad por producto como referencia para poder mostrar el % sugerido)
  const totalCostoStock = quickProducts.reduce((sum, p) => {
    const datos = porProducto[p.name] || {};
    const cantidadComprada = Number(datos.cantidadComprada) || 0;
    const cantidadVendida = Number(datos.cantidadVendida) || 0;
    const stock = Math.max(0, cantidadComprada - cantidadVendida) || cantidadComprada;
    const precioCompra = Number(datos.precioCompra) || p.precioCompra || 0;
    const unidadesParaCalculo = stock > 0 ? stock : 1;
    return sum + precioCompra * unidadesParaCalculo;
  }, 0);

  const porcentajeExtraParaGastos =
    totalCostoStock > 0 && totalGastos > 0 ? (totalGastos / totalCostoStock) * 100 : 0;

  const setProducto = (nombre, campo, valor) => {
    setPorProducto((prev) => ({
      ...prev,
      [nombre]: {
        ...prev[nombre],
        [campo]: valor,
      },
    }));
  };

  const aplicarPrecioSugeridoATodos = () => {
    if (totalGastos <= 0 || totalCostoStock <= 0) return;
    setPorProducto((prev) => {
      const next = { ...prev };
      quickProducts.forEach((p) => {
        const datos = prev[p.name] || {};
        const precioCompra = Number(datos.precioCompra) || p.precioCompra || 0;
        const precioVentaNum = Number(datos.precioVenta) || parsePrecio(p.price);
        const margenActualNum =
          precioCompra > 0 && precioVentaNum > 0
            ? ((precioVentaNum - precioCompra) / precioCompra) * 100
            : 0;
        const margenSugeridoNum = margenActualNum + porcentajeExtraParaGastos;
        const precioSugerido =
          precioCompra > 0 ? Math.round(precioCompra * (1 + margenSugeridoNum / 100)) : 0;
        if (precioCompra > 0) {
          next[p.name] = {
            ...(next[p.name] || {}),
            ...datos,
            precioVenta: precioSugerido,
          };
        }
      });
      return next;
    });
  };

  const puedeAplicarSugerido = totalGastos > 0 && totalCostoStock > 0;

  return (
    <section className="rounded-[28px] bg-white border border-slate-200 shadow-lg overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-200">
        <h2 className="text-2xl font-bold">Compras, ventas y ganancias</h2>
        <p className="text-slate-500 mt-1">
          Cargá cuánto comprás, cuánto vendés y ves el porcentaje de ganancia por producto.
        </p>
      </div>
      <div className="p-6 overflow-x-auto">
        <table className="w-full min-w-[800px] text-left">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600 text-sm">
              <th className="pb-3 font-semibold">Producto</th>
              <th className="pb-3 font-semibold">Cant. comprada</th>
              <th className="pb-3 font-semibold">Precio compra ($)</th>
              <th className="pb-3 font-semibold">Precio venta</th>
              <th className="pb-3 font-semibold">% ganancia</th>
              <th className="pb-3 font-semibold">% sugerido</th>
              <th className="pb-3 font-semibold">Precio sugerido</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {quickProducts.map((p) => {
              const datos = porProducto[p.name] || { cantidadComprada: 0, cantidadVendida: 0, precioCompra: p.precioCompra ?? 0, precioVenta: parsePrecio(p.price) };
              const precioVentaNum = Number(datos.precioVenta) || parsePrecio(p.price);
              const precioCompra = Number(datos.precioCompra) || 0;
              const porcentaje =
                precioCompra > 0 && precioVentaNum > 0
                  ? (((precioVentaNum - precioCompra) / precioCompra) * 100).toFixed(1)
                  : '—';
              const esPositivo = Number(porcentaje) > 0;
              const margenActualNum = precioCompra > 0 && precioVentaNum > 0 ? ((precioVentaNum - precioCompra) / precioCompra) * 100 : 0;
              const margenSugeridoNum = margenActualNum + porcentajeExtraParaGastos;
              const precioSugerido = precioCompra > 0 ? Math.round(precioCompra * (1 + margenSugeridoNum / 100)) : 0;
              const haySugerencia = totalGastos > 0 && totalCostoStock > 0 && precioCompra > 0;

              return (
                <tr key={p.name} className="align-middle">
                  <td className="py-3">
                    <span className="font-semibold text-slate-800">{p.name}</span>
                  </td>
                  <td className="py-3">
                    <input
                      type="number"
                      min="0"
                      value={datos.cantidadComprada || ''}
                      onChange={(e) =>
                        setProducto(p.name, 'cantidadComprada', parseInt(e.target.value, 10) || 0)
                      }
                      className="w-24 rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-slate-800 focus:ring-2 focus:ring-emerald-500/30"
                      placeholder="0"
                    />
                  </td>
                  <td className="py-3">
                    <input
                      type="number"
                      min="0"
                      value={datos.precioCompra || ''}
                      onChange={(e) =>
                        setProducto(p.name, 'precioCompra', parseInt(e.target.value, 10) || 0)
                      }
                      className="w-28 rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-slate-800 focus:ring-2 focus:ring-emerald-500/30"
                      placeholder="Costo"
                    />
                  </td>
                  <td className="py-3 text-slate-700">
                    {precioVentaNum ? `$${Number(precioVentaNum).toLocaleString('es-AR')}` : p.price}
                  </td>
                  <td className="py-3">
                    {porcentaje !== '—' ? (
                      <span
                        className={
                          esPositivo
                            ? 'font-bold text-emerald-600'
                            : 'font-bold text-red-600'
                        }
                      >
                        {porcentaje}%
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3">
                    {haySugerencia ? (
                      <span className="font-semibold text-amber-600" title="Margen mínimo para cubrir gastos cargados">
                        {margenSugeridoNum.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3">
                    {haySugerencia ? (
                      <span className="font-medium text-slate-800">{formatMoneda(precioSugerido)}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="mt-4 space-y-1">
          <p className="text-sm text-slate-500">
            % ganancia = ((precio venta − precio compra) / precio compra) × 100
          </p>
          {totalGastos > 0 && totalCostoStock > 0 && (
            <p className="text-sm text-amber-700 font-medium">
              % sugerido y precio sugerido: margen para cubrir todos los gastos ({formatMoneda(totalGastos)}) según el costo de referencia del stock ({formatMoneda(totalCostoStock)}). Si no cargaste cantidades, se usa 1 unidad por producto como referencia.
            </p>
          )}
        </div>
        {puedeAplicarSugerido && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={aplicarPrecioSugeridoATodos}
              className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 px-5 transition shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              Cambiar a todos el precio de venta por el % sugerido
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
