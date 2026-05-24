export function parseNumeroFlexible(valor) {
  const texto = String(valor ?? '').trim();
  if (!texto) return 0;
  const limpio = texto.replace(/[^\d,.-]/g, '');
  const normalizado = limpio.includes(',')
    ? limpio.replace(/\./g, '').replace(',', '.')
    : limpio;
  return parseFloat(normalizado) || 0;
}

/** Extrae kg del nombre, ej: "Mix Adulto x 20 kg" → 20 */
export function extraerKgDelNombre(nombre) {
  const texto = String(nombre || '');
  const match = texto.match(/x\s*([\d,.]+)\s*kg\b/i) || texto.match(/([\d,.]+)\s*kg\b/i);
  if (!match) return 0;
  return parseNumeroFlexible(match[1]);
}

export function calcularPrecioCompraKg(costoUnitario, kgPorUnidad) {
  const costo = Number(costoUnitario) || parseNumeroFlexible(costoUnitario);
  const kg = Number(kgPorUnidad) || parseNumeroFlexible(kgPorUnidad);
  if (costo <= 0 || kg <= 0) return 0;
  return costo / kg;
}

export function calcularPrecioVentaKg(costoUnitario, kgPorUnidad, margenPorcentaje) {
  const costoKg = calcularPrecioCompraKg(costoUnitario, kgPorUnidad);
  if (costoKg <= 0) return 0;
  const margen = parseNumeroFlexible(margenPorcentaje) || 30;
  return Math.round(costoKg * (1 + margen / 100));
}
