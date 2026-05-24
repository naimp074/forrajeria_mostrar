-- Márgenes de ganancia separados: venta por unidad/bolsa vs kg suelto.
-- Ejecutar en Supabase Dashboard > SQL Editor.

alter table public.productos
  add column if not exists margen_bolsa numeric,
  add column if not exists margen_kg numeric;

comment on column public.productos.margen_bolsa is 'Porcentaje de ganancia al vender por bolsa/fardo/unidad';
comment on column public.productos.margen_kg is 'Porcentaje de ganancia al vender por kg suelto';
