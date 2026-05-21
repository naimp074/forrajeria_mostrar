import { supabase } from '../supabaseClient';

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

function mapProducto(row) {
  const unidad = row.unidad_default || 'unidades';
  const stockLabel = unidad === 'fardos' ? '0 fardos' : unidad === 'bolsas' ? '0 bolsas' : `0 ${unidad}`;
  return {
    id: row.id,
    name: row.nombre,
    price: Number(row.precio_unidad) || 0,
    precioKg: Number(row.precio_kg) || 0,
    precioCompra: Number(row.precio_compra_ref) || 0,
    stock: stockLabel,
    unidad,
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

export async function crearProducto(producto) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('productos')
    .insert({
      nombre: producto.nombre,
      precio_unidad: Number(producto.precioUnidad) || 0,
      precio_kg: Number(producto.precioKg) || 0,
      precio_compra_ref: Number(producto.precioCompra) || 0,
      unidad_default: producto.unidad || 'unidades',
      favorito: Boolean(producto.favorito),
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapProducto(data);
}

export async function actualizarProducto(id, producto) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('productos')
    .update({
      nombre: producto.nombre,
      precio_unidad: Number(producto.precioUnidad) || 0,
      precio_kg: Number(producto.precioKg) || 0,
      precio_compra_ref: Number(producto.precioCompra) || 0,
      unidad_default: producto.unidad || 'unidades',
      favorito: Boolean(producto.favorito),
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
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
  const nombres = Object.keys(porProducto);
  if (nombres.length === 0) return;

  const { data: productos, error: productosError } = await client
    .from('productos')
    .select('id, nombre')
    .in('nombre', nombres);
  if (productosError) throw productosError;

  const productosPorNombre = new Map((productos || []).map((p) => [p.nombre, p.id]));
  const faltantes = nombres.filter((nombre) => !productosPorNombre.has(nombre));

  if (faltantes.length > 0) {
    const { data: nuevos, error: nuevosError } = await client
      .from('productos')
      .upsert(faltantes.map((nombre) => ({ nombre })), { onConflict: 'nombre' })
      .select('id, nombre');
    if (nuevosError) throw nuevosError;
    (nuevos || []).forEach((p) => productosPorNombre.set(p.nombre, p.id));
  }

  const payload = nombres
    .map((nombre) => {
      const datos = porProducto[nombre] || {};
      const productoId = productosPorNombre.get(nombre);
      if (!productoId) return null;
      return {
        producto_id: productoId,
        cantidad_comprada: Number(datos.cantidadComprada) || 0,
        cantidad_vendida: Number(datos.cantidadVendida) || 0,
        precio_compra: Number(datos.precioCompra) || 0,
        precio_venta: Number(datos.precioVenta) || 0,
        updated_at: new Date().toISOString(),
      };
    })
    .filter(Boolean);

  if (payload.length === 0) return;
  const { error } = await client
    .from('stock_saldos')
    .upsert(payload, { onConflict: 'producto_id' });
  if (error) throw error;
}

export async function registrarIngresoStock(ingreso) {
  const client = requireSupabase();
  const productoNombre = ingreso.producto;

  const { data: producto, error: productoError } = await client
    .from('productos')
    .upsert({
      nombre: productoNombre,
      precio_unidad: Number(ingreso.precioVenta) || 0,
      precio_compra_ref: Number(ingreso.precioCompra) || 0,
      unidad_default: ingreso.unidad || 'unidades',
    }, { onConflict: 'nombre' })
    .select('id')
    .single();
  if (productoError) throw productoError;

  let proveedorId = null;
  if (ingreso.proveedor || ingreso.numeroProveedor) {
    const { data: proveedor, error: proveedorError } = await client
      .from('proveedores')
      .upsert({
        nombre: ingreso.proveedor || 'Sin nombre',
        telefono: ingreso.numeroProveedor || null,
      }, { onConflict: 'nombre,telefono' })
      .select('id')
      .single();
    if (proveedorError) throw proveedorError;
    proveedorId = proveedor.id;
  }

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
