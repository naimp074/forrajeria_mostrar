import { useState, useMemo } from 'react';
import { useGastos } from '../context/GastosContext';
import { usePagination } from '../hooks/usePagination';
import Paginacion from './Paginacion';

const estadoInicial = () => ({});

function formatMoneda(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

export default function ComprasVentasGanancias({ porProducto: porProductoProp, setPorProducto: setPorProductoProp }) {
  const { totalGastos } = useGastos();
  const [estadoLocal, setEstadoLocal] = useState(estadoInicial);
  const porProducto = porProductoProp ?? estadoLocal;
  const setPorProducto = setPorProductoProp ?? setEstadoLocal;

  const filasStock = useMemo(() => {
    return Object.keys(porProducto)
      .sort((a, b) => a.localeCompare(b, 'es'))
      .map((name) => ({ key: name, catalog: null }));
  }, [porProducto]);

  const stockPaginacion = usePagination(filasStock, { pageSize: 15 });

  const totalCostoStock = useMemo(() => {
    return filasStock.reduce((sum, row) => {
      const datos = porProducto[row.key] || {};
      const cantidadComprada = Number(datos.cantidadComprada) || 0;
      const cantidadVendida = Number(datos.cantidadVendida) || 0;
      const stock = Math.max(0, cantidadComprada - cantidadVendida) || cantidadComprada;
      const precioCompra = Number(datos.precioCompra) || 0;
      const unidadesParaCalculo = stock > 0 ? stock : 1;
      return sum + precioCompra * unidadesParaCalculo;
    }, 0);
  }, [filasStock, porProducto]);

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
      filasStock.forEach((row) => {
        const name = row.key;
        const datos = prev[name] || {};
        const precioCompra = Number(datos.precioCompra) || 0;
        const precioVentaNum = Number(datos.precioVenta) || 0;
        const margenActualNum =
          precioCompra > 0 && precioVentaNum > 0
            ? ((precioVentaNum - precioCompra) / precioCompra) * 100
            : 0;
        const margenSugeridoNum = margenActualNum + porcentajeExtraParaGastos;
        const precioSugerido =
          precioCompra > 0 ? Math.round(precioCompra * (1 + margenSugeridoNum / 100)) : 0;
        if (precioCompra > 0) {
          next[name] = {
            ...(next[name] || {}),
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
    <section className="rounded-2xl sm:rounded-[28px] bg-white border border-slate-200 shadow-lg overflow-hidden">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-200">
        <h2 className="text-xl sm:text-2xl font-bold">Compras, ventas y ganancias</h2>
        <p className="text-slate-500 mt-1 text-sm sm:text-base">
          Cargá cuánto comprás, cuánto vendés y ves el porcentaje de ganancia por producto.
        </p>
      </div>
      <div className="p-4 sm:p-6 space-y-4">
        <div className="space-y-3 md:hidden">
          {filasStock.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
              Todavía no hay productos cargados.
            </div>
          )}
          {stockPaginacion.paginatedItems.map((row) => {
            const name = row.key;
            const datos = porProducto[name] || { cantidadComprada: 0, cantidadVendida: 0, precioCompra: 0, precioVenta: 0 };
            const precioVentaNum = Number(datos.precioVenta) || 0;
            const precioCompra = Number(datos.precioCompra) || 0;
            const porcentaje =
              precioCompra > 0 && precioVentaNum > 0
                ? (((precioVentaNum - precioCompra) / precioCompra) * 100).toFixed(1)
                : '—';

            return (
              <article key={name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div>
                  <div className="font-bold text-slate-800">{name}</div>
                  <div className="text-xs text-slate-500">Producto cargado</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="block text-xs font-medium text-slate-500 mb-1">Comprada</span>
                    <input
                      type="number"
                      min="0"
                      value={datos.cantidadComprada || ''}
                      onChange={(e) =>
                        setProducto(name, 'cantidadComprada', parseInt(e.target.value, 10) || 0)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 px-3 text-slate-800 focus:ring-2 focus:ring-emerald-500/30"
                      placeholder="0"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-xs font-medium text-slate-500 mb-1">Costo</span>
                    <input
                      type="number"
                      min="0"
                      value={datos.precioCompra || ''}
                      onChange={(e) =>
                        setProducto(name, 'precioCompra', parseInt(e.target.value, 10) || 0)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 px-3 text-slate-800 focus:ring-2 focus:ring-emerald-500/30"
                      placeholder="Costo"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-white border border-slate-200 p-3">
                    <div className="text-slate-500">Venta</div>
                    <div className="font-bold text-slate-800">
                      {precioVentaNum ? formatMoneda(precioVentaNum) : '—'}
                    </div>
                  </div>
                  <div className="rounded-xl bg-white border border-slate-200 p-3">
                    <div className="text-slate-500">% ganancia</div>
                    <div className={porcentaje !== '—' && Number(porcentaje) > 0 ? 'font-bold text-emerald-600' : 'font-bold text-slate-400'}>
                      {porcentaje !== '—' ? `${porcentaje}%` : '—'}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="hidden md:block overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
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
            {stockPaginacion.paginatedItems.map((row) => {
              const name = row.key;
              const defaultDatos = { cantidadComprada: 0, cantidadVendida: 0, precioCompra: 0, precioVenta: 0 };
              const datos = porProducto[name] || defaultDatos;
              const precioVentaNum = Number(datos.precioVenta) || 0;
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
                <tr key={name} className="align-middle">
                  <td className="py-3">
                    <span className="font-semibold text-slate-800">{name}</span>
                    <span className="ml-2 text-xs font-medium text-slate-400">(cargado)</span>
                  </td>
                  <td className="py-3">
                    <input
                      type="number"
                      min="0"
                      value={datos.cantidadComprada || ''}
                      onChange={(e) =>
                        setProducto(name, 'cantidadComprada', parseInt(e.target.value, 10) || 0)
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
                        setProducto(name, 'precioCompra', parseInt(e.target.value, 10) || 0)
                      }
                      className="w-28 rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-slate-800 focus:ring-2 focus:ring-emerald-500/30"
                      placeholder="Costo"
                    />
                  </td>
                  <td className="py-3 text-slate-700">
                    {precioVentaNum ? `$${Number(precioVentaNum).toLocaleString('es-AR')}` : '—'}
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
        </div>
        <Paginacion
          page={stockPaginacion.page}
          totalPages={stockPaginacion.totalPages}
          totalItems={stockPaginacion.totalItems}
          from={stockPaginacion.from}
          to={stockPaginacion.to}
          onPageChange={stockPaginacion.setPage}
        />
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
              className="w-full sm:w-auto rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 px-5 transition shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400 touch-manipulation"
            >
              Cambiar a todos el precio de venta por el % sugerido
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
