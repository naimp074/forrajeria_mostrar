-- Vaciar todos los datos operativos para empezar desde cero.
-- Ejecutar en Supabase Dashboard > SQL Editor.
-- No borra usuarios de Authentication.

truncate table
  public.producto_proveedor,
  public.stock_movimientos,
  public.stock_saldos,
  public.venta_lineas,
  public.ventas,
  public.presupuesto_lineas,
  public.presupuestos,
  public.gastos,
  public.fiado_movimientos,
  public.pedidos_clientes,
  public.caja_sesiones,
  public.proveedores,
  public.clientes,
  public.productos,
  public.configuracion_negocio
restart identity cascade;
