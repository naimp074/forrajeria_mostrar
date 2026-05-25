/** Normaliza nombre: trim y espacios múltiples → uno solo */
export function normalizarNombreProducto(nombre) {
  return String(nombre ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function claveNombreProducto(nombre) {
  return normalizarNombreProducto(nombre).toLowerCase();
}

export function nombresEquivalentes(a, b) {
  return claveNombreProducto(a) === claveNombreProducto(b);
}

export function buscarStockProducto(porProducto, nombreProducto) {
  for (const [key, datos] of Object.entries(porProducto || {})) {
    if (nombresEquivalentes(key, nombreProducto)) return datos;
  }
  return {};
}

/** Une entradas de stock cuyo nombre coincide (mayúsculas/espacios) y descarta huérfanos */
export function podarStockConCatalogo(porProducto, nombresCatalogo) {
  if (!porProducto || typeof porProducto !== 'object') return {};

  const canonicoPorClave = new Map();
  for (const nombre of nombresCatalogo || []) {
    const clave = claveNombreProducto(nombre);
    if (clave) canonicoPorClave.set(clave, normalizarNombreProducto(nombre));
  }

  const next = {};
  for (const [nombreStock, datos] of Object.entries(porProducto)) {
    const clave = claveNombreProducto(nombreStock);
    if (!clave || !canonicoPorClave.has(clave)) continue;

    const nombreCanonico = canonicoPorClave.get(clave);
    const prev = next[nombreCanonico];
    if (!prev) {
      next[nombreCanonico] = { ...datos };
      continue;
    }
    next[nombreCanonico] = {
      cantidadComprada: (Number(prev.cantidadComprada) || 0) + (Number(datos.cantidadComprada) || 0),
      cantidadVendida: (Number(prev.cantidadVendida) || 0) + (Number(datos.cantidadVendida) || 0),
      precioCompra: Number(datos.precioCompra) || Number(prev.precioCompra) || 0,
      precioVenta: Number(datos.precioVenta) || Number(prev.precioVenta) || 0,
    };
  }
  return next;
}
