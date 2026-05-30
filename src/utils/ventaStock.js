import { extraerKgDelNombre, kgVendidosAUnidadesInventario } from './preciosKg';

export function unidadesInventarioDesdeLineaVenta(linea, producto) {
  const modo = linea.modoVenta || linea.modo_venta || 'bolsa';
  if (modo === 'bolsa') return Number(linea.cantidad) || 0;
  const kg = Number(linea.kg) || 0;
  const nombre = linea.productoNombre || linea.producto_nombre || producto?.name;
  const unidad = producto?.unidad || 'bolsas';
  const kgPorUnidad = extraerKgDelNombre(nombre);
  return kgVendidosAUnidadesInventario(kg, unidad, kgPorUnidad);
}

export function revertirStockPorVenta(venta, productosPorNombre, stockActual) {
  const next = { ...stockActual };
  for (const linea of venta.lineas || []) {
    const nombre = linea.productoNombre || linea.producto_nombre;
    if (!nombre) continue;
    const producto = productosPorNombre[nombre?.toLowerCase()];
    const unidades = unidadesInventarioDesdeLineaVenta(linea, producto);
    if (unidades <= 0) continue;
    const actual = next[nombre] || {
      cantidadComprada: 0,
      cantidadVendida: 0,
      precioCompra: 0,
      precioVenta: 0,
    };
    next[nombre] = {
      ...actual,
      cantidadVendida: Math.max(0, (Number(actual.cantidadVendida) || 0) - unidades),
    };
  }
  return next;
}
