-- Esquema inicial para Forrajeria Pro en Supabase.
-- Ejecutar en Supabase Dashboard > SQL Editor > New query.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text,
  created_at timestamptz not null default now()
);

create table if not exists public.configuracion_negocio (
  id uuid primary key default gen_random_uuid(),
  nombre_local text not null default 'Forrajeria El Trebol',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  precio_unidad numeric not null default 0,
  precio_kg numeric not null default 0,
  precio_compra_ref numeric not null default 0,
  margen_bolsa numeric,
  margen_kg numeric,
  unidad_default text not null default 'bolsas',
  proveedor_nombre text,
  proveedor_telefono text,
  observacion text,
  favorito boolean not null default false,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.proveedores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text,
  created_at timestamptz not null default now(),
  unique (nombre, telefono)
);

create table if not exists public.producto_proveedor (
  producto_id uuid not null references public.productos(id) on delete cascade,
  proveedor_id uuid not null references public.proveedores(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (producto_id, proveedor_id)
);

create table if not exists public.stock_saldos (
  producto_id uuid primary key references public.productos(id) on delete cascade,
  cantidad_comprada numeric not null default 0,
  cantidad_vendida numeric not null default 0,
  precio_compra numeric not null default 0,
  precio_venta numeric not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.stock_movimientos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('compra', 'venta', 'ajuste')),
  producto_id uuid references public.productos(id) on delete set null,
  producto_nombre text not null,
  cantidad numeric not null default 0,
  unidad text not null default 'unidades',
  precio_compra numeric not null default 0,
  precio_venta numeric not null default 0,
  proveedor_id uuid references public.proveedores(id) on delete set null,
  observacion text,
  fecha date not null default current_date,
  usuario_id uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  telefono text,
  notas text,
  created_at timestamptz not null default now()
);

create table if not exists public.ventas (
  id uuid primary key default gen_random_uuid(),
  fecha timestamptz not null default now(),
  cliente_id uuid references public.clientes(id) on delete set null,
  cliente_nombre text not null default 'Cliente General',
  metodo_pago text not null default 'efectivo' check (metodo_pago in ('efectivo', 'tarjeta', 'transfer')),
  total numeric not null default 0,
  monto_pagado numeric,
  vuelto numeric,
  es_fiado boolean not null default false,
  usuario_id uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.venta_lineas (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references public.ventas(id) on delete cascade,
  producto_id uuid references public.productos(id) on delete set null,
  producto_nombre text not null,
  modo_venta text not null default 'bolsa' check (modo_venta in ('bolsa', 'kilo', 'pesos')),
  cantidad numeric,
  kg numeric,
  monto_pesos numeric,
  precio_unitario numeric,
  precio_kg numeric,
  subtotal numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.presupuestos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  cliente_nombre text not null default 'Cliente General',
  metodo_pago text not null default 'efectivo',
  total numeric not null default 0,
  usuario_id uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.presupuesto_lineas (
  id uuid primary key default gen_random_uuid(),
  presupuesto_id uuid not null references public.presupuestos(id) on delete cascade,
  producto_id uuid references public.productos(id) on delete set null,
  producto_nombre text not null,
  cantidad numeric not null default 0,
  precio_unitario numeric not null default 0,
  subtotal numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.gastos (
  id uuid primary key default gen_random_uuid(),
  descripcion text not null,
  monto numeric not null default 0,
  categoria text not null default 'otros' check (categoria in ('comida', 'sueldos', 'afip', 'luz', 'gas', 'alquiler', 'proveedores', 'otros')),
  fecha date not null default current_date,
  detalle text,
  usuario_id uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.fiado_movimientos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  tipo text not null check (tipo in ('cargo', 'pago')),
  monto numeric not null default 0,
  venta_id uuid references public.ventas(id) on delete set null,
  fecha timestamptz not null default now(),
  notas text,
  usuario_id uuid references public.profiles(id) on delete set null default auth.uid()
);

create table if not exists public.pedidos_clientes (
  id uuid primary key default gen_random_uuid(),
  producto_solicitado text not null,
  cliente_id uuid references public.clientes(id) on delete set null,
  cliente_nombre text not null default 'Cliente',
  fecha date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.caja_sesiones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.profiles(id) on delete set null default auth.uid(),
  monto_apertura numeric not null default 0,
  monto_cierre numeric,
  ingresos numeric,
  egresos numeric,
  abierta_at timestamptz not null default now(),
  cerrada_at timestamptz,
  cerrada_por uuid references public.profiles(id) on delete set null
);

create or replace view public.fiados_saldos as
select
  c.id as cliente_id,
  c.nombre as cliente_nombre,
  coalesce(sum(case when fm.tipo = 'cargo' then fm.monto else -fm.monto end), 0) as saldo,
  max(fm.fecha) as ultimo_movimiento
from public.clientes c
left join public.fiado_movimientos fm on fm.cliente_id = c.id
group by c.id, c.nombre;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists productos_touch_updated_at on public.productos;
create trigger productos_touch_updated_at
before update on public.productos
for each row execute function public.touch_updated_at();

drop trigger if exists configuracion_touch_updated_at on public.configuracion_negocio;
create trigger configuracion_touch_updated_at
before update on public.configuracion_negocio
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nombre)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do update set nombre = excluded.nombre;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.configuracion_negocio enable row level security;
alter table public.productos enable row level security;
alter table public.proveedores enable row level security;
alter table public.producto_proveedor enable row level security;
alter table public.stock_saldos enable row level security;
alter table public.stock_movimientos enable row level security;
alter table public.clientes enable row level security;
alter table public.ventas enable row level security;
alter table public.venta_lineas enable row level security;
alter table public.presupuestos enable row level security;
alter table public.presupuesto_lineas enable row level security;
alter table public.gastos enable row level security;
alter table public.fiado_movimientos enable row level security;
alter table public.pedidos_clientes enable row level security;
alter table public.caja_sesiones enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "authenticated_read_configuracion_negocio" on public.configuracion_negocio;
create policy "authenticated_read_configuracion_negocio" on public.configuracion_negocio for select to authenticated using (true);

drop policy if exists "authenticated_write_configuracion_negocio" on public.configuracion_negocio;
create policy "authenticated_write_configuracion_negocio" on public.configuracion_negocio for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_all_productos" on public.productos;
create policy "authenticated_all_productos" on public.productos for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_all_proveedores" on public.proveedores;
create policy "authenticated_all_proveedores" on public.proveedores for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_all_producto_proveedor" on public.producto_proveedor;
create policy "authenticated_all_producto_proveedor" on public.producto_proveedor for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_all_stock_saldos" on public.stock_saldos;
create policy "authenticated_all_stock_saldos" on public.stock_saldos for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_all_stock_movimientos" on public.stock_movimientos;
create policy "authenticated_all_stock_movimientos" on public.stock_movimientos for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_all_clientes" on public.clientes;
create policy "authenticated_all_clientes" on public.clientes for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_all_ventas" on public.ventas;
create policy "authenticated_all_ventas" on public.ventas for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_all_venta_lineas" on public.venta_lineas;
create policy "authenticated_all_venta_lineas" on public.venta_lineas for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_all_presupuestos" on public.presupuestos;
create policy "authenticated_all_presupuestos" on public.presupuestos for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_all_presupuesto_lineas" on public.presupuesto_lineas;
create policy "authenticated_all_presupuesto_lineas" on public.presupuesto_lineas for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_all_gastos" on public.gastos;
create policy "authenticated_all_gastos" on public.gastos for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_all_fiado_movimientos" on public.fiado_movimientos;
create policy "authenticated_all_fiado_movimientos" on public.fiado_movimientos for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_all_pedidos_clientes" on public.pedidos_clientes;
create policy "authenticated_all_pedidos_clientes" on public.pedidos_clientes for all to authenticated using (true) with check (true);

drop policy if exists "anon_insert_pedidos_clientes" on public.pedidos_clientes;
create policy "anon_insert_pedidos_clientes" on public.pedidos_clientes for insert to anon with check (true);

drop policy if exists "authenticated_all_caja_sesiones" on public.caja_sesiones;
create policy "authenticated_all_caja_sesiones" on public.caja_sesiones for all to authenticated using (true) with check (true);

-- Catálogo público para /pedir (sin login)
create or replace function public.listar_catalogo_publico()
returns table (
  id uuid,
  nombre text,
  precio_unidad numeric,
  precio_kg numeric,
  unidad_default text,
  margen_bolsa numeric,
  margen_kg numeric,
  observacion text,
  precio_compra_ref numeric,
  stock_precio_compra numeric,
  stock_precio_venta numeric
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id,
    p.nombre,
    p.precio_unidad,
    p.precio_kg,
    p.unidad_default,
    p.margen_bolsa,
    p.margen_kg,
    p.observacion,
    p.precio_compra_ref,
    coalesce(s.precio_compra, 0) as stock_precio_compra,
    coalesce(s.precio_venta, 0) as stock_precio_venta
  from public.productos p
  left join public.stock_saldos s on s.producto_id = p.id
  where p.activo = true
  order by p.nombre;
$$;

grant execute on function public.listar_catalogo_publico() to anon, authenticated;

create or replace view public.catalogo_publico as
select
  p.id,
  p.nombre,
  p.precio_unidad,
  p.precio_kg,
  p.unidad_default,
  p.margen_bolsa,
  p.margen_kg,
  p.observacion,
  p.precio_compra_ref,
  coalesce(s.precio_compra, 0) as stock_precio_compra,
  coalesce(s.precio_venta, 0) as stock_precio_venta
from public.productos p
left join public.stock_saldos s on s.producto_id = p.id
where p.activo = true;

grant select on public.catalogo_publico to anon, authenticated;
