import {
  extraerKgDelNombre,
  calcularPrecioCompraKg,
  calcularPrecioVentaKg,
  parseNumeroFlexible,
} from './preciosKg';

export const MARGEN_DEFAULT = 30;

/** Respaldo en observacion si Supabase aun no tiene columnas margen_* */
export const MARGENES_OBSERVACION_RE = /\[margenes:bolsa=([\d.]+),kg=([\d.]+)\]\s*/;

export function extraerMargenesDeObservacion(observacion) {
  const match = String(observacion || '').match(MARGENES_OBSERVACION_RE);
  if (!match) return null;
  return {
    bolsa: Number(match[1]),
    kg: Number(match[2]),
  };
}

export function limpiarObservacionParaMostrar(observacion) {
  return String(observacion || '').replace(MARGENES_OBSERVACION_RE, '').trim();
}

export function observacionConMargenes(observacionUsuario, margenBolsa, margenKg) {
  const limpio = limpiarObservacionParaMostrar(observacionUsuario);
  const bolsa = Number.isFinite(Number(margenBolsa)) ? Number(margenBolsa) : MARGEN_DEFAULT;
  const kg = Number.isFinite(Number(margenKg)) ? Number(margenKg) : bolsa;
  const tag = `[margenes:bolsa=${bolsa},kg=${kg}]`;
  return limpio ? `${limpio} ${tag}` : tag;
}

export function calcularPrecioVenta(precioCompra, margenPorcentaje) {
  const compra = parseNumeroFlexible(precioCompra);
  const margen = parseNumeroFlexible(margenPorcentaje);
  if (compra <= 0 || !Number.isFinite(margen) || margen < 0) return 0;
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

/** Lee el % del formulario sin tope (permite 118, 200, etc.) */
export function parseMargenFormulario(valor, fallback = MARGEN_DEFAULT) {
  const texto = String(valor ?? '').trim();
  if (!texto) return fallback;
  const n = parseNumeroFlexible(valor);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

export function productoTieneMargenGuardado(producto, tipo = 'bolsa') {
  if (tipo === 'kg') {
    return producto?.margenKg != null && Number.isFinite(Number(producto.margenKg));
  }
  return producto?.margenBolsa != null && Number.isFinite(Number(producto.margenBolsa));
}

export function resolverMargenBolsa(producto, precioCompra = 0, precioVenta = 0) {
  if (productoTieneMargenGuardado(producto, 'bolsa')) {
    return Number(producto.margenBolsa);
  }
  const inferido = calcularMargenDesdePrecios(
    precioCompra || producto?.precioCompra,
    precioVenta || producto?.price,
  );
  return inferido ?? MARGEN_DEFAULT;
}

export function resolverMargenKg(producto, precioCompra = 0, options = {}) {
  if (productoTieneMargenGuardado(producto, 'kg')) {
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

/**
 * Arma precios y márgenes coherentes: si el margen está guardado, el precio sale del margen
 * (no de valores viejos del stock que cambiarían el % al reabrir).
 */
export function enriquecerProductoConMargenes(producto, precioCompra, options = {}) {
  const compra = Number(precioCompra) || Number(producto?.precioCompra) || 0;
  const kgPorUnidad = options.kgPorUnidad || extraerKgDelNombre(producto?.name);
  const precioVentaStock = Number(options.precioVentaStock) || 0;
  const precioKgStock = Number(options.precioKgStock) || 0;

  const margenBolsa = resolverMargenBolsa(producto, compra, precioVentaStock || producto?.price);
  const margenKg = resolverMargenKg(producto, compra, {
    precioVenta: precioVentaStock,
    precioKg: precioKgStock,
    kgPorUnidad,
  });

  const tieneMargenBolsa = productoTieneMargenGuardado(producto, 'bolsa');
  const tieneMargenKg = productoTieneMargenGuardado(producto, 'kg');

  const price = tieneMargenBolsa
    ? calcularPrecioVenta(compra, margenBolsa)
    : (precioVentaStock || Number(producto?.price) || calcularPrecioVenta(compra, margenBolsa));

  const precioKg = producto?.unidad === 'kg'
    ? price
    : kgPorUnidad > 0
      ? (tieneMargenKg
        ? calcularPrecioVentaKg(compra, kgPorUnidad, margenKg)
        : (precioKgStock || Number(producto?.precioKg) || calcularPrecioVentaKg(compra, kgPorUnidad, margenKg)))
      : Number(producto?.precioKg) || 0;

  return {
    precioCompra: compra,
    margenBolsa,
    margenKg,
    price,
    precioKg,
  };
}

export function resolverPrecioKgVenta(producto, precioCompra, precioVenta) {
  const enriquecido = enriquecerProductoConMargenes(producto, precioCompra, {
    precioVentaStock: precioVenta,
    precioKgStock: producto?.precioKg,
    kgPorUnidad: extraerKgDelNombre(producto?.name),
  });
  return enriquecido.precioKg;
}
