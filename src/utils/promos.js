import { buscarStockProducto, claveNombreProducto } from './nombreProducto';
import { extraerKgDelNombre } from './preciosKg';
import { enriquecerProductoConMargenes } from './margenes';

function productoVigente(item, productos) {
  return productos.find((producto) => producto.id === item.productoId)
    || productos.find((producto) => claveNombreProducto(producto.name) === claveNombreProducto(item.nombre));
}

export function recalcularPromo(promo, productos = [], porProducto = {}) {
  const items = (promo.items || []).map((item) => {
    const producto = productoVigente(item, productos);
    if (!producto) return item;

    const stock = buscarStockProducto(porProducto, producto.name);
    const costo = Number(stock.precioCompra) || Number(producto.precioCompra) || 0;
    const enriquecido = enriquecerProductoConMargenes(producto, costo, {
      kgPorUnidad: Number(producto.kgPorUnidad) || extraerKgDelNombre(producto.name),
      precioVentaStock: Number(stock.precioVenta) || 0,
      precioKgStock: Number(producto.precioKg) || 0,
    });

    return {
      ...item,
      productoId: producto.id,
      nombre: producto.name,
      unidad: producto.unidad || item.unidad,
      costo: enriquecido.precioCompra,
      precioNormal: enriquecido.price,
    };
  });

  const costoTotal = items.reduce((total, item) => total + (Number(item.costo) || 0) * (Number(item.cantidad) || 0), 0);
  const precioNormalTotal = items.reduce((total, item) => total + (Number(item.precioNormal) || 0) * (Number(item.cantidad) || 0), 0);
  const descuentoAnterior = precioNormalTotal > 0
    ? Math.max(0, Math.min(100, (1 - (Number(promo.precioPromo) || 0) / precioNormalTotal) * 100))
    : 0;
  const itemsConDescuento = items.map((item) => {
    const descuento = item.descuento == null ? descuentoAnterior : Number(item.descuento) || 0;
    return { ...item, descuento: Math.round(descuento * 10) / 10 };
  });
  const precioPromo = Math.round(itemsConDescuento.reduce((total, item) => {
    const normal = (Number(item.precioNormal) || 0) * (Number(item.cantidad) || 0);
    return total + normal * (1 - Math.max(0, Math.min(100, item.descuento)) / 100);
  }, 0));

  return {
    ...promo,
    items: itemsConDescuento,
    costoTotal,
    precioNormalTotal,
    precioPromo,
    gananciaPromo: precioPromo - costoTotal,
  };
}

export function recalcularPromos(promos, productos = [], porProducto = {}) {
  return (promos || []).map((promo) => recalcularPromo(promo, productos, porProducto));
}
