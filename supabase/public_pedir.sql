-- Ejecutar en Supabase SQL Editor para habilitar /pedir sin login.
-- Lista TODOS los productos activos con datos para calcular precio bolsa y kg.

alter table public.productos
  add column if not exists kg_por_unidad numeric;

drop function if exists public.listar_catalogo_publico();

create or replace function public.listar_catalogo_publico()
returns table (
  id uuid,
  nombre text,
  precio_unidad numeric,
  precio_kg numeric,
  kg_por_unidad numeric,
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
    p.kg_por_unidad,
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

drop view if exists public.catalogo_publico;

create or replace view public.catalogo_publico as
select
  p.id,
  p.nombre,
  p.precio_unidad,
  p.precio_kg,
  p.kg_por_unidad,
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

drop policy if exists "anon_insert_pedidos_clientes" on public.pedidos_clientes;
create policy "anon_insert_pedidos_clientes"
  on public.pedidos_clientes
  for insert
  to anon
  with check (true);
