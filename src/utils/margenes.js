import {
  extraerKgDelNombre,
  calcularPrecioCompraKg,
  calcularPrecioVentaKg,
  parseNumeroFlexible,
} from './preciosKg';

export const MARGEN_DEFAULT = 30;

export function calcularPrecioVenta(precioCompra, margenPorcentaje) {
  const compra = parseNumeroFlexible(precioCompra);
  const margen = parseNumeroFlexible(margenPorcentaje) || MARGEN_DEFAULT;
  if (compra <= 0) return 0;
  return Math.round(compra * (1 + margen / 100));
}

export function calcularMargenDesdePrecios(precioCompra, precioVenta) {
  const compra = Number(precioCompra) || 0;
  const venta = Number(precioVenta) || 0;
  if (compra <= 0 || venta <= 0) return null;
  const margen = ((venta - compra) / compra) * 100;
  return Number.isInteger(margen) ? margen : Math.round(margen * 10) / 10;
}

export function formatearMargen(margen) {
  if (margen == null || !Number.isFinite(Number(margen))) return String(MARGEN_DEFAULT);
  const n = Number(margen);
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
}

export function resolverMargenBolsa(producto, precioCompra = 0, precioVenta = 0) {
  if (producto?.margenBolsa != null && producto.margenBolsa !== '' && Number.isFinite(Number(producto.margenBolsa))) {
    return Number(producto.margenBolsa);
  }
  const inferido = calcularMargenDesdePrecios(
    precioCompra || producto?.precioCompra,
    precioVenta || producto?.price,
  );
  return inferido ?? MARGEN_DEFAULT;
}

export function resolverMargenKg(producto, precioCompra = 0, options = {}) {
  if (producto?.margenKg != null && producto.margenKg !== '' && Number.isFinite(Number(producto.margenKg))) {
    return Number(producto.margenKg);
  }
  const compra = Number(precioCompra) || Number(producto?.precioCompra) || 0;
  const precioKg = Number(options.precioKg ?? producto?.precioKg) || 0;
  const precioVenta = Number(options.precioVenta ?? producto?.price) || 0;

  if (producto?.unidad === 'kg') {
    const inferido = calcularMargenDesdePrecios(compra, precioVenta || precioKg);
    if (inferido != null) return inferido;
  }

  const kgPorUnidad = options.kgPorUnidad || extraerKgDelNombre(producto?.name);
  if (kgPorUnidad > 0 && compra > 0 && precioKg > 0) {
    const costoKg = calcularPrecioCompraKg(compra, kgPorUnidad);
    if (costoKg > 0) {
      const inferido = ((precioKg - costoKg) / costoKg) * 100;
      return Number.isInteger(inferido) ? inferido : Math.round(inferido * 10) / 10;
    }
  }

  return resolverMargenBolsa(producto, precioCompra, precioVenta);
}

export function resolverPrecioKgVenta(producto, precioCompra, precioVenta) {
  const compra = Number(precioCompra) || Number(producto?.precioCompra) || 0;
  const venta = Number(precioVenta) || Number(producto?.price) || 0;

  if (producto?.unidad === 'kg') {
    return venta || calcularPrecioVenta(compra, resolverMargenKg(producto, compra, { precioVenta: venta }));
  }

  const guardado = Number(producto?.precioKg) || 0;
  if (guardado > 0) return guardado;

  const kgPorUnidad = extraerKgDelNombre(producto?.name);
  if (kgPorUnidad <= 0 || compra <= 0) return 0;

  const margenKg = resolverMargenKg(producto, compra, { precioVenta: venta, kgPorUnidad });
  return calcularPrecioVentaKg(compra, kgPorUnidad, margenKg);
}
