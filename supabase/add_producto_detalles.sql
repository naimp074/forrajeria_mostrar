alter table public.productos
  add column if not exists proveedor_nombre text,
  add column if not exists proveedor_telefono text,
  add column if not exists observacion text;
