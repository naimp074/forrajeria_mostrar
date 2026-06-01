import { supabase } from '../supabaseClient';
import { extraerKgDelNombre } from '../utils/preciosKg';
import {
  enriquecerProductoConMargenes,
  extraerMargenesDeObservacion,
  limpiarObservacionParaMostrar,
  observacionConMargenes,
} from '../utils/margenes';
import { claveNombreProducto, normalizarNombreProducto } from '../utils/nombreProducto';

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase no esta configurado.');
  }
  return supabase;
}

function mapGasto(row) {
  return {
    id: row.id,
    descripcion: row.descripcion,
    monto: Number(row.monto) || 0,
    categoria: row.categoria,
    fecha: row.fecha,
    detalle: row.detalle || undefined,
  };
}

function mapStockRow(row) {
  const producto = row.productos;
  return {
    nombre: producto?.nombre || row.producto_nombre,
    cantidadComprada: Number(row.cantidad_comprada) || 0,
    cantidadVendida: Number(row.cantidad_vendida) || 0,
    precioCompra: Number(row.precio_compra) || Number(producto?.precio_compra_ref) || 0,
    precioVenta: Number(row.precio_venta) || Number(producto?.precio_unidad) || 0,
  };
}

function mapPresupuesto(row) {
  return {
    id: row.id,
    fecha: row.fecha,
    cliente: row.cliente_nombre,
    metodoPago: row.metodo_pago,
    total: Number(row.total) || 0,
    lineas: (row.presupuesto_lineas || []).map((linea) => ({
      producto: linea.producto_nombre,
      cantidad: Number(linea.cantidad) || 0,
      precioUnitario: Number(linea.precio_unitario) || 0,
      subtotal: Number(linea.subtotal) || 0,
    })),
  };
}

function buildProductoDbRow(producto, { includeMargenes = true } = {}) {
  const row = {
    nombre: normalizarNombreProducto(producto.nombre),
    precio_unidad: Number(producto.precioUnidad) || 0,
    precio_kg: Number(producto.precioKg) || 0,
    precio_compra_ref: Number(producto.precioCompra) || 0,
    unidad_default: producto.unidad || 'unidades',
    proveedor_nombre: producto.proveedor || null,
    proveedor_telefono: producto.numeroProveedor || null,
    observacion: producto.observacion || null,
    favorito: Boolean(producto.favorito),
    updated_at: new Date().toISOString(),
  };

  if (includeMargenes) {
    row.margen_bolsa = producto.margenBolsa != null ? Number(producto.margenBolsa) : null;
    row.margen_kg = producto.margenKg != null ? Number(producto.margenKg) : null;
  } else if (producto.margenBolsa != null || producto.margenKg != null) {
    row.observacion = observacionConMargenes(
      producto.observacion,
      producto.margenBolsa,
      producto.margenKg,
    );
  }

  return row;
}

function esErrorColumnasMargen(error) {
  const mensaje = String(error?.message || error?.details || '').toLowerCase();
  return mensaje.includes('margen_bolsa')
    || mensaje.includes('margen_kg')
    || (mensaje.includes('margen') && mensaje.includes('column'));
}

async function persistirProductoDb(client, { id, producto, esInserto }) {
  const guardar = (includeMargenes) => {
    const row = buildProductoDbRow(producto, { includeMargenes });
    if (esInserto) {
      return client.from('productos').insert(row).select('*').single();
    }
    return client.from('productos').update(row).eq('id', id).select('*').single();
  };

  let result = await guardar(true);
  if (result.error && esErrorColumnasMargen(result.error)) {
    result = await guardar(false);
  }
  return result;
}

function mapProducto(row) {
  const unidad = row.unidad_default || 'unidades';
  const stockLabel = unidad === 'fardos' ? '0 fardos' : unidad === 'bolsas' ? '0 bolsas' : `0 ${unidad}`;
  const margenesObs = extraerMargenesDeObservacion(row.observacion);
  const margenBolsa = row.margen_bolsa != null
    ? Number(row.margen_bolsa)
    : (margenesObs?.bolsa ?? null);
  const margenKg = row.margen_kg != null
    ? Number(row.margen_kg)
    : (margenesObs?.kg ?? null);

  return {
    id: row.id,
    name: row.nombre,
    price: Number(row.precio_unidad) || 0,
    precioKg: Number(row.precio_kg) || 0,
    precioCompra: Number(row.precio_compra_ref) || 0,
    margenBolsa,
    margenKg,
    stock: stockLabel,
    unidad,
    proveedor: row.proveedor_nombre || '',
    numeroProveedor: row.proveedor_telefono || '',
    observacion: limpiarObservacionParaMostrar(row.observacion),
    favorite: Boolean(row.favorito),
    activo: row.activo !== false,
  };
}

function mapCajaSesion(row) {
  if (!row) return null;
  return {
    id: row.id,
    usuarioId: row.usuario_id,
    montoApertura: Number(row.monto_apertura) || 0,
    montoCierre: row.monto_cierre == null ? null : Number(row.monto_cierre) || 0,
    ingresos: row.ingresos == null ? null : Number(row.ingresos) || 0,
    egresos: row.egresos == null ? null : Number(row.egresos) || 0,
    abiertaAt: row.abierta_at,
    cerradaAt: row.cerrada_at,
    cerradaPor: row.cerrada_por,
  };
}

async function asegurarProveedorProducto(client, productoId, proveedorNombre, proveedorTelefono, options = {}) {
  if (!productoId) return null;

  const nombre = (proveedorNombre || '').trim();
  const telefono = (proveedorTelefono || '').trim();

  if (options.reemplazar) {
    const { error: deleteError } = await client
      .from('producto_proveedor')
      .delete()
      .eq('producto_id', productoId);
    if (deleteError) throw deleteError;
  }

  if (!nombre && !telefono) return null;

  const nombreFinal = nombre || 'Sin nombre';
  let query = client
    .from('proveedores')
    .select('id')
    .eq('nombre', nombreFinal);

  query = telefono ? query.eq('telefono', telefono) : query.is('telefono', null);

  const { data: existente, error: buscarError } = await query.limit(1).maybeSingle();
  if (buscarError) throw buscarError;

  let proveedorId = existente?.id;
  if (!proveedorId) {
    const { data: nuevo, error: crearError } = await client
      .from('proveedores')
      .insert({
        nombre: nombreFinal,
        telefono: telefono || null,
      })
      .select('id')
      .single();
    if (crearError) throw crearError;
    proveedorId = nuevo.id;
  }

  const { error: relacionError } = await client
    .from('producto_proveedor')
    .upsert({
      producto_id: productoId,
      proveedor_id: proveedorId,
    }, { onConflict: 'producto_id,proveedor_id' });
  if (relacionError) throw relacionError;

  return proveedorId;
}

async function sumarColumnaDesde(tabla, columna, desde, hasta) {
  const client = requireSupabase();
  let query = client
    .from(tabla)
    .select(columna)
    .gte('created_at', desde);

  if (hasta) {
    query = query.lte('created_at', hasta);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).reduce((sum, row) => sum + (Number(row[columna]) || 0), 0);
}

async function sumarVentasDesde(desde, hasta) {
  return sumarColumnaDesde('ventas', 'total', desde, hasta);
}

async function sumarGastosDesde(desde, hasta) {
  return sumarColumnaDesde('gastos', 'monto', desde, hasta);
}

export async function obtenerCajaAbierta() {
  const client = requireSupabase();
  const { data, error } = await client
    .from('caja_sesiones')
    .select('*')
    .is('cerrada_at', null)
    .order('abierta_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return mapCajaSesion(data);
}

export async function obtenerUltimaCajaCerrada() {
  const client = requireSupabase();
  const { data, error } = await client
    .from('caja_sesiones')
    .select('*')
    .not('cerrada_at', 'is', null)
    .order('cerrada_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return mapCajaSesion(data);
}

export async function abrirCaja(montoApertura) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('caja_sesiones')
    .insert({ monto_apertura: Number(montoApertura) || 0 })
    .select('*')
    .single();
  if (error) throw error;
  return mapCajaSesion(data);
}

export async function calcularResumenCaja(caja) {
  if (!caja?.abiertaAt) {
    return { ingresos: 0, egresos: 0, cierreEstimado: 0 };
  }

  const hasta = caja.cerradaAt || null;
  const ingresos = caja.ingresos != null ? caja.ingresos : await sumarVentasDesde(caja.abiertaAt, hasta);
  const egresos = caja.egresos != null ? caja.egresos : await sumarGastosDesde(caja.abiertaAt, hasta);
  const cierreEstimado = caja.montoCierre ?? (caja.montoApertura + ingresos - egresos);

  return { ingresos, egresos, cierreEstimado };
}

export async function cerrarCaja(caja, userId) {
  const client = requireSupabase();
  const resumen = await calcularResumenCaja(caja);
  const { data, error } = await client
    .from('caja_sesiones')
    .update({
      ingresos: resumen.ingresos,
      egresos: resumen.egresos,
      monto_cierre: resumen.cierreEstimado,
      cerrada_at: new Date().toISOString(),
      cerrada_por: userId || null,
    })
    .eq('id', caja.id)
    .select('*')
    .single();
  if (error) throw error;
  return { caja: mapCajaSesion(data), resumen };
}

export async function listarProductos() {
  const client = requireSupabase();
  const { data, error } = await client
    .from('productos')
    .select('*')
    .eq('activo', true)
    .order('nombre', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapProducto);
}

function mapCatalogoPublicoRow(row) {
  const producto = mapProducto({
    id: row.id,
    nombre: row.nombre,
    precio_unidad: row.precio_unidad,
    precio_kg: row.precio_kg,
    unidad_default: row.unidad_default,
    margen_bolsa: row.margen_bolsa,
    margen_kg: row.margen_kg,
    observacion: row.observacion,
    precio_compra_ref: row.precio_compra_ref,
    activo: true,
    favorito: false,
    proveedor_nombre: '',
    proveedor_telefono: '',
  });
  const precioCompra =
    Number(row.stock_precio_compra) ||
    Number(row.precio_compra_ref) ||
    Number(producto.precioCompra) ||
    0;
  const kgPorUnidad = extraerKgDelNombre(row.nombre);
  const enriquecido = enriquecerProductoConMargenes(producto, precioCompra, {
    kgPorUnidad,
    precioVentaStock: Number(row.stock_precio_venta) || 0,
    precioKgStock: Number(row.precio_kg) || 0,
  });
  return {
    id: row.id,
    name: row.nombre,
    price: enriquecido.price,
    precioKg: enriquecido.precioKg,
    unidad: producto.unidad,
    kgPorUnidad,
  };
}

/** Catálogo para /pedir (sin login). Usa RPC listar_catalogo_publico en Supabase. */
export async function listarCatalogoPublico() {
  const client = requireSupabase();

  const rpc = await client.rpc('listar_catalogo_publico');
  if (!rpc.error) {
    return (rpc.data || []).map(mapCatalogoPublicoRow);
  }

  const view = await client
    .from('catalogo_publico')
    .select('*')
    .order('nombre', { ascending: true });
  if (!view.error) {
    return (view.data || []).map((row) =>
      mapCatalogoPublicoRow({
        ...row,
        stock_precio_compra: 0,
        stock_precio_venta: 0,
        margen_bolsa: null,
        margen_kg: null,
        observacion: null,
        precio_compra_ref: 0,
      }),
    );
  }

  throw rpc.error || view.error || new Error('No se pudo cargar el catálogo.');
}

export async function existeProductoConNombre(nombre, { excluirId } = {}) {
  const client = requireSupabase();
  const normalizado = normalizarNombreProducto(nombre);
  if (!normalizado) return false;

  const { data, error } = await client
    .from('productos')
    .select('id, nombre')
    .eq('activo', true);
  if (error) throw error;

  const clave = claveNombreProducto(normalizado);
  return (data || []).some(
    (row) => claveNombreProducto(row.nombre) === clave && row.id !== excluirId,
  );
}

export async function crearProducto(producto) {
  const client = requireSupabase();
  const { data, error } = await persistirProductoDb(client, { producto, esInserto: true });
  if (error) throw error;

  const { error: saldoError } = await client
    .from('stock_saldos')
    .upsert({
      producto_id: data.id,
      precio_compra: Number(producto.precioCompra) || 0,
      precio_venta: Number(producto.precioUnidad) || 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'producto_id' });
  if (saldoError) throw saldoError;

  await asegurarProveedorProducto(client, data.id, producto.proveedor, producto.numeroProveedor, { reemplazar: true });

  return mapProducto(data);
}

export async function actualizarProducto(id, producto) {
  const client = requireSupabase();
  const { data, error } = await persistirProductoDb(client, { id, producto, esInserto: false });
  if (error) throw error;

  const { error: saldoError } = await client
    .from('stock_saldos')
    .upsert({
      producto_id: id,
      precio_compra: Number(producto.precioCompra) || 0,
      precio_venta: Number(producto.precioUnidad) || 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'producto_id' });
  if (saldoError) throw saldoError;

  await asegurarProveedorProducto(client, id, producto.proveedor, producto.numeroProveedor, { reemplazar: true });

  return mapProducto(data);
}

export async function borrarProducto(id) {
  const client = requireSupabase();
  const { error } = await client
    .from('productos')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

function mapPedidoCliente(row) {
  const fecha = row.fecha
    ? String(row.fecha).slice(0, 10)
    : row.created_at?.slice(0, 10) || '';
  return {
    id: row.id,
    producto: row.producto_solicitado,
    cliente: row.cliente_nombre || 'Cliente',
    fecha,
  };
}

export async function listarPedidosClientes() {
  const client = requireSupabase();
  const { data, error } = await client
    .from('pedidos_clientes')
    .select('*')
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapPedidoCliente);
}

export async function crearPedidoCliente(pedido) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('pedidos_clientes')
    .insert({
      producto_solicitado: pedido.producto,
      cliente_nombre: pedido.cliente || 'Cliente',
      fecha: pedido.fecha || new Date().toISOString().slice(0, 10),
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapPedidoCliente(data);
}

export async function crearPedidosCliente(pedidos) {
  if (!pedidos?.length) return [];
  const client = requireSupabase();
  const hoy = new Date().toISOString().slice(0, 10);
  const rows = pedidos.map((pedido) => ({
    producto_solicitado: pedido.producto,
    cliente_nombre: pedido.cliente || 'Cliente',
    fecha: pedido.fecha || hoy,
  }));
  const { data, error } = await client.from('pedidos_clientes').insert(rows).select('*');
  if (error) throw error;
  return (data || []).map(mapPedidoCliente);
}

export async function listarGastos() {
  const client = requireSupabase();
  const { data, error } = await client
    .from('gastos')
    .select('*')
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapGasto);
}

export async function crearGasto(gasto) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('gastos')
    .insert({
      descripcion: gasto.descripcion,
      monto: gasto.monto,
      categoria: gasto.categoria,
      fecha: gasto.fecha,
      detalle: gasto.detalle || null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapGasto(data);
}

export async function listarStockSaldos() {
  const client = requireSupabase();
  const { data, error } = await client
    .from('stock_saldos')
    .select('*, productos(nombre, precio_unidad, precio_compra_ref)')
    .order('updated_at', { ascending: false });
  if (error) throw error;

  return (data || []).reduce((acc, row) => {
    const stock = mapStockRow(row);
    if (stock.nombre) {
      acc[stock.nombre] = {
        cantidadComprada: stock.cantidadComprada,
        cantidadVendida: stock.cantidadVendida,
        precioCompra: stock.precioCompra,
        precioVenta: stock.precioVenta,
      };
    }
    return acc;
  }, {});
}

export async function guardarStockSaldos(porProducto) {
  const client = requireSupabase();
  const nombresStock = Object.keys(porProducto || {});
  if (nombresStock.length === 0) return;

  const { data: productosCatalogo, error: productosError } = await client
    .from('productos')
    .select('id, nombre')
    .eq('activo', true);
  if (productosError) throw productosError;

  const productoPorClave = new Map();
  for (const p of productosCatalogo || []) {
    const clave = claveNombreProducto(p.nombre);
    if (clave) productoPorClave.set(clave, p);
  }

  const payload = [];

  for (const nombreStock of nombresStock) {
    const producto = productoPorClave.get(claveNombreProducto(nombreStock));
    if (!producto) continue;

    const datos = porProducto[nombreStock] || {};
    payload.push({
      producto_id: producto.id,
      cantidad_comprada: Number(datos.cantidadComprada) || 0,
      cantidad_vendida: Number(datos.cantidadVendida) || 0,
      precio_compra: Number(datos.precioCompra) || 0,
      precio_venta: Number(datos.precioVenta) || 0,
      updated_at: new Date().toISOString(),
    });
  }

  if (payload.length === 0) return;

  const { error } = await client
    .from('stock_saldos')
    .upsert(payload, { onConflict: 'producto_id' });
  if (error) throw error;
}

export async function registrarIngresoStock(ingreso) {
  const client = requireSupabase();
  const productoNombre = normalizarNombreProducto(ingreso.producto);

  const { data: producto, error: productoError } = await client
    .from('productos')
    .upsert({
      nombre: productoNombre,
      precio_unidad: Number(ingreso.precioVenta) || 0,
      precio_compra_ref: Number(ingreso.precioCompra) || 0,
      unidad_default: ingreso.unidad || 'unidades',
      proveedor_nombre: ingreso.proveedor || null,
      proveedor_telefono: ingreso.numeroProveedor || null,
      observacion: ingreso.observacion || null,
    }, { onConflict: 'nombre' })
    .select('id')
    .single();
  if (productoError) throw productoError;

  const { error: saldoError } = await client
    .from('stock_saldos')
    .upsert({
      producto_id: producto.id,
      precio_compra: Number(ingreso.precioCompra) || 0,
      precio_venta: Number(ingreso.precioVenta) || 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'producto_id' });
  if (saldoError) throw saldoError;

  const proveedorId = await asegurarProveedorProducto(
    client,
    producto.id,
    ingreso.proveedor,
    ingreso.numeroProveedor
  );

  const { error } = await client.from('stock_movimientos').insert({
    tipo: 'compra',
    producto_id: producto.id,
    producto_nombre: productoNombre,
    cantidad: ingreso.cantidad,
    unidad: ingreso.unidad || 'unidades',
    precio_compra: ingreso.precioCompra || 0,
    precio_venta: ingreso.precioVenta || 0,
    proveedor_id: proveedorId,
    observacion: ingreso.observacion || null,
    fecha: ingreso.fecha,
  });
  if (error) throw error;
}

export async function listarIngresosStock() {
  const client = requireSupabase();
  const { data, error } = await client
    .from('stock_movimientos')
    .select('producto_nombre, cantidad, precio_compra, precio_venta, unidad, fecha, proveedores(nombre, telefono)')
    .eq('tipo', 'compra')
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;

  return (data || []).map((row) => ({
    producto: row.producto_nombre,
    cantidad: Number(row.cantidad) || 0,
    precioCompra: Number(row.precio_compra) || 0,
    precioVenta: Number(row.precio_venta) || 0,
    proveedor: row.proveedores?.nombre || '',
    numeroProveedor: row.proveedores?.telefono || '',
    unidad: row.unidad || '',
    fecha: row.fecha,
  }));
}

export async function listarProveedoresCatalogo() {
  const client = requireSupabase();
  const { data: productosData, error: productosError } = await client
    .from('productos')
    .select('nombre, proveedor_nombre, proveedor_telefono')
    .eq('activo', true)
    .order('nombre', { ascending: true });
  if (productosError) throw productosError;

  const { data: relacionesData, error: relacionesError } = await client
    .from('producto_proveedor')
    .select('productos(nombre, activo), proveedores(nombre, telefono)');

  const directos = (productosData || [])
    .filter((row) => row.proveedor_nombre || row.proveedor_telefono)
    .map((row) => ({
      producto: row.nombre,
      proveedor: row.proveedor_nombre || '',
      numeroProveedor: row.proveedor_telefono || '',
      cantidad: 0,
      precioCompra: 0,
      precioVenta: 0,
      unidad: '',
      fecha: null,
      origen: 'catalogo',
    }));

  const relaciones = relacionesError ? [] : (relacionesData || [])
    .filter((row) => row.productos?.activo !== false && (row.proveedores?.nombre || row.proveedores?.telefono))
    .map((row) => ({
      producto: row.productos?.nombre || '',
      proveedor: row.proveedores?.nombre || '',
      numeroProveedor: row.proveedores?.telefono || '',
      cantidad: 0,
      precioCompra: 0,
      precioVenta: 0,
      unidad: '',
      fecha: null,
      origen: 'catalogo',
    }))
    .filter((row) => row.producto);

  const porClave = new Map();
  [...directos, ...relaciones].forEach((row) => {
    const key = `${row.producto}|${row.proveedor}|${row.numeroProveedor}`;
    porClave.set(key, row);
  });

  return Array.from(porClave.values());
}

export async function listarPresupuestos() {
  const client = requireSupabase();
  const { data, error } = await client
    .from('presupuestos')
    .select('*, presupuesto_lineas(*)')
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data || []).map(mapPresupuesto);
}

export async function crearPresupuesto(presupuesto) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('presupuestos')
    .insert({
      fecha: presupuesto.fecha,
      cliente_nombre: presupuesto.cliente,
      metodo_pago: presupuesto.metodoPago,
      total: presupuesto.total,
    })
    .select('id, fecha, cliente_nombre, metodo_pago, total')
    .single();
  if (error) throw error;

  const lineas = (presupuesto.lineas || []).map((linea) => ({
    presupuesto_id: data.id,
    producto_nombre: linea.producto,
    cantidad: linea.cantidad,
    precio_unitario: linea.precioUnitario,
    subtotal: linea.subtotal,
  }));

  if (lineas.length > 0) {
    const { error: lineasError } = await client.from('presupuesto_lineas').insert(lineas);
    if (lineasError) throw lineasError;
  }

  return { ...presupuesto, id: data.id };
}

function mapVentaLinea(row) {
  return {
    productoNombre: row.producto_nombre,
    modoVenta: row.modo_venta,
    cantidad: row.cantidad != null ? Number(row.cantidad) : null,
    kg: row.kg != null ? Number(row.kg) : null,
    subtotal: Number(row.subtotal) || 0,
  };
}

function mapVenta(row) {
  return {
    id: row.id,
    fecha: row.fecha || row.created_at,
    cliente: row.cliente_nombre,
    metodoPago: row.metodo_pago,
    total: Number(row.total) || 0,
    lineas: (row.venta_lineas || []).map(mapVentaLinea),
  };
}

function claveMes(fechaIso) {
  const d = new Date(fechaIso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function claveDia(fechaIso) {
  const d = new Date(fechaIso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function claveDiaActual(fecha = new Date()) {
  return claveDia(typeof fecha === 'string' ? fecha : fecha.toISOString());
}

const MESES_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MESES_LARGOS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function labelMes(clave) {
  const [anio, mes] = clave.split('-');
  return `${MESES_ES[Number(mes) - 1]} ${anio.slice(2)}`;
}

export function labelMesCompleto(clave) {
  const [anio, mes] = clave.split('-');
  return `${MESES_LARGOS[Number(mes) - 1]} ${anio}`;
}

export function claveMesActual(fecha = new Date()) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
}

function labelDia(clave) {
  const [, mes, dia] = clave.split('-');
  return `${dia}/${mes}`;
}

function lunesDeSemana(fecha = new Date()) {
  const d = new Date(fecha);
  const dia = d.getDay();
  const diff = d.getDate() - dia + (dia === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function claveSemana(fechaIso) {
  return claveDia(lunesDeSemana(new Date(fechaIso)).toISOString());
}

function labelSemana(claveLunes) {
  const inicio = new Date(claveLunes);
  const fin = new Date(inicio);
  fin.setDate(inicio.getDate() + 6);
  const diaIni = inicio.getDate();
  const mesIni = MESES_ES[inicio.getMonth()];
  const diaFin = fin.getDate();
  const mesFin = MESES_ES[fin.getMonth()];
  if (mesIni === mesFin) return `${diaIni}-${diaFin} ${mesIni}`;
  return `${diaIni} ${mesIni} - ${diaFin} ${mesFin}`;
}

function acumularPeriodo(mapa, clave, ventasDelta, costoDelta) {
  if (!mapa[clave]) mapa[clave] = { ventas: 0, costo: 0 };
  mapa[clave].ventas += ventasDelta;
  mapa[clave].costo += costoDelta;
}

function esMismaFechaLocal(fechaIso, referencia = new Date()) {
  const d = new Date(fechaIso);
  return (
    d.getFullYear() === referencia.getFullYear()
    && d.getMonth() === referencia.getMonth()
    && d.getDate() === referencia.getDate()
  );
}

function calcularCostoLinea(linea, productosPorNombre) {
  const nombre = linea.producto_nombre || linea.productoNombre;
  const producto = productosPorNombre[nombre?.toLowerCase()];
  const precioCompra = Number(producto?.precioCompra) || 0;
  const modo = linea.modo_venta || linea.modoVenta || 'bolsa';
  const subtotal = Number(linea.subtotal) || 0;

  if (precioCompra <= 0) return 0;

  if (modo === 'kilo' || linea.kg) {
    const kg = Number(linea.kg) || 0;
    const kgUnidad = extraerKgDelNombre(nombre) || 1;
    const costoKg = kgUnidad > 0 ? precioCompra / kgUnidad : 0;
    return kg * costoKg;
  }

  if (modo === 'pesos') {
    return subtotal * 0.7;
  }

  const cant = Number(linea.cantidad) || 0;
  return cant * precioCompra;
}

export async function listarVentas({ limit = 200 } = {}) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('ventas')
    .select('*, venta_lineas(*)')
    .order('fecha', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map(mapVenta);
}

export async function obtenerResumenReportes() {
  const [ventas, productos] = await Promise.all([
    listarVentas({ limit: 500 }),
    listarProductos(),
  ]);

  const productosPorNombre = {};
  for (const producto of productos) {
    productosPorNombre[producto.name.toLowerCase()] = producto;
  }

  let ventasTotales = 0;
  let ventasHoy = 0;
  let costoTotal = 0;
  let costoHoy = 0;
  let cantidadVentas = 0;
  let cantidadVentasHoy = 0;

  const porProducto = {};
  const porMedio = {};
  const conteoMedio = {};
  const porMes = {};
  const porSemana = {};
  const porDia = {};
  const ventasPorDiaLista = {};
  const productosPorDiaMap = {};
  const mediosPorDiaMap = {};

  for (const venta of ventas) {
    const total = venta.total;
    const esHoy = esMismaFechaLocal(venta.fecha);

    ventasTotales += total;
    cantidadVentas += 1;

    if (esHoy) {
      ventasHoy += total;
      cantidadVentasHoy += 1;
    }

    const metodo = venta.metodoPago || 'efectivo';
    porMedio[metodo] = (porMedio[metodo] || 0) + total;
    conteoMedio[metodo] = (conteoMedio[metodo] || 0) + 1;

    const mesKey = claveMes(venta.fecha);
    const semKey = claveSemana(venta.fecha);
    const diaKey = claveDia(venta.fecha);
    acumularPeriodo(porMes, mesKey, total, 0);
    acumularPeriodo(porSemana, semKey, total, 0);
    acumularPeriodo(porDia, diaKey, total, 0);

    if (!ventasPorDiaLista[diaKey]) ventasPorDiaLista[diaKey] = [];
    ventasPorDiaLista[diaKey].push(venta);

    if (!mediosPorDiaMap[diaKey]) mediosPorDiaMap[diaKey] = {};
    const medioDia = mediosPorDiaMap[diaKey][metodo] || { total: 0, cantidad: 0 };
    mediosPorDiaMap[diaKey][metodo] = {
      total: medioDia.total + total,
      cantidad: medioDia.cantidad + 1,
    };

    for (const linea of venta.lineas) {
      const costo = calcularCostoLinea(
        {
          producto_nombre: linea.productoNombre,
          modo_venta: linea.modoVenta,
          cantidad: linea.cantidad,
          kg: linea.kg,
          subtotal: linea.subtotal,
        },
        productosPorNombre,
      );

      costoTotal += costo;
      if (esHoy) costoHoy += costo;
      acumularPeriodo(porMes, mesKey, 0, costo);
      acumularPeriodo(porSemana, semKey, 0, costo);
      acumularPeriodo(porDia, diaKey, 0, costo);

      const nombre = linea.productoNombre;
      if (!porProducto[nombre]) {
        porProducto[nombre] = { nombre, ventas: 0, unidades: 0 };
      }
      porProducto[nombre].ventas += linea.subtotal;
      porProducto[nombre].unidades += linea.kg ?? linea.cantidad ?? 1;

      if (!productosPorDiaMap[diaKey]) productosPorDiaMap[diaKey] = {};
      if (!productosPorDiaMap[diaKey][nombre]) {
        productosPorDiaMap[diaKey][nombre] = { nombre, ventas: 0, unidades: 0 };
      }
      productosPorDiaMap[diaKey][nombre].ventas += linea.subtotal;
      productosPorDiaMap[diaKey][nombre].unidades += linea.kg ?? linea.cantidad ?? 1;
    }
  }

  const margenBruto = ventasTotales - costoTotal;
  const gananciaHoy = ventasHoy - costoHoy;
  const margenPorcentaje = ventasTotales > 0
    ? Math.round((margenBruto / ventasTotales) * 100)
    : 0;

  const labelsMedio = {
    efectivo: 'Efectivo',
    tarjeta: 'Tarjeta',
    transfer: 'Transferencia',
  };

  const ventasPorProducto = Object.values(porProducto).sort((a, b) => b.ventas - a.ventas);
  const ventasPorMedioPago = Object.entries(porMedio)
    .filter(([, monto]) => monto > 0)
    .map(([metodo, monto]) => ({
      metodo,
      label: labelsMedio[metodo] || metodo,
      total: monto,
      cantidad: conteoMedio[metodo] || 0,
    }))
    .sort((a, b) => b.total - a.total);

  const mapPeriodo = (datos) => ({
    ventas: datos.ventas,
    plataParaReponer: datos.costo,
    ganancia: datos.ventas - datos.costo,
  });

  const ventasMensuales = Object.entries(porMes)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([clave, datos]) => ({
      clave,
      label: labelMes(clave),
      ...mapPeriodo(datos),
    }));

  const lunesActual = lunesDeSemana(new Date());
  const ventasSemanales = [];
  for (let i = 7; i >= 0; i -= 1) {
    const lunes = new Date(lunesActual);
    lunes.setDate(lunesActual.getDate() - i * 7);
    const key = claveDia(lunes.toISOString());
    const datos = porSemana[key] || { ventas: 0, costo: 0 };
    ventasSemanales.push({
      clave: key,
      label: labelSemana(key),
      ...mapPeriodo(datos),
    });
  }

  const ventasDiarias = [];
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = claveDia(d.toISOString());
    const datos = porDia[key] || { ventas: 0, costo: 0 };
    ventasDiarias.push({
      clave: key,
      label: labelDia(key),
      ...mapPeriodo(datos),
    });
  }

  const porDiaDetalle = {};
  const detallePorDia = {};
  const clavesDia = new Set([
    ...Object.keys(porDia),
    ...Object.keys(ventasPorDiaLista),
  ]);

  for (const clave of clavesDia) {
    const datos = porDia[clave] || { ventas: 0, costo: 0 };
    porDiaDetalle[clave] = mapPeriodo(datos);

    const productosDia = Object.values(productosPorDiaMap[clave] || {})
      .sort((a, b) => b.ventas - a.ventas);
    const mediosDia = Object.entries(mediosPorDiaMap[clave] || {})
      .map(([metodo, info]) => ({
        metodo,
        label: labelsMedio[metodo] || metodo,
        total: info.total,
        cantidad: info.cantidad,
      }))
      .sort((a, b) => b.total - a.total);
    const ventasLista = (ventasPorDiaLista[clave] || [])
      .slice()
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    detallePorDia[clave] = {
      ...mapPeriodo(datos),
      cantidadVentas: ventasLista.length,
      ventasLista,
      productos: productosDia,
      medios: mediosDia,
    };
  }

  const mesesDisponibles = Object.keys(porMes)
    .sort((a, b) => b.localeCompare(a))
    .map((clave) => ({ clave, label: labelMesCompleto(clave) }));

  return {
    ventasTotales,
    ventasHoy,
    gananciaHoy,
    plataParaReponerHoy: costoHoy,
    plataParaReponer: costoTotal,
    costoTotal,
    margenBruto,
    margenPorcentaje,
    cantidadVentas,
    cantidadVentasHoy,
    ventasPorProducto,
    ventasPorMedioPago,
    ventasMensuales,
    ventasSemanales,
    ventasDiarias,
    porDiaDetalle,
    detallePorDia,
    mesesDisponibles,
    ultimasVentas: ventas.slice(0, 15),
  };
}

export async function crearVenta(venta) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('ventas')
    .insert({
      cliente_nombre: venta.cliente || 'Cliente General',
      metodo_pago: venta.metodoPago || 'efectivo',
      total: venta.total,
    })
    .select('id')
    .single();
  if (error) throw error;

  const lineas = (venta.items || []).map((item) => ({
    venta_id: data.id,
    producto_nombre: item.nombre,
    modo_venta: item.modoVenta || 'bolsa',
    cantidad: item.cantidad ?? null,
    kg: item.kg ?? item.kgPorPesos ?? null,
    monto_pesos: item.montoPesos ?? null,
    precio_unitario: item.precioUnitario ?? null,
    precio_kg: item.precioKg ?? null,
    subtotal: Number(item.subtotal) || 0,
  }));

  if (lineas.length > 0) {
    const { error: lineasError } = await client.from('venta_lineas').insert(lineas);
    if (lineasError) throw lineasError;
  }

  return data.id;
}

export async function obtenerVentaPorId(id) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('ventas')
    .select('*, venta_lineas(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return mapVenta(data);
}

export async function actualizarVenta(id, cambios) {
  const client = requireSupabase();
  const payload = {};
  if (cambios.cliente != null) payload.cliente_nombre = cambios.cliente;
  if (cambios.metodoPago != null) payload.metodo_pago = cambios.metodoPago;
  if (cambios.total != null) payload.total = Number(cambios.total) || 0;
  const { data, error } = await client
    .from('ventas')
    .update(payload)
    .eq('id', id)
    .select('*, venta_lineas(*)')
    .single();
  if (error) throw error;
  return mapVenta(data);
}

export async function borrarVenta(id) {
  const client = requireSupabase();
  const { error } = await client.from('ventas').delete().eq('id', id);
  if (error) throw error;
}
