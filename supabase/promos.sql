-- Ejecutar en Supabase SQL Editor para guardar promos en la base.

create table if not exists public.promos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  costo_total numeric not null default 0,
  precio_normal_total numeric not null default 0,
  margen_promo numeric not null default 0,
  precio_promo numeric not null default 0,
  ganancia_promo numeric not null default 0,
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.promo_items (
  id uuid primary key default gen_random_uuid(),
  promo_id uuid not null references public.promos(id) on delete cascade,
  producto_id uuid references public.productos(id) on delete set null,
  producto_nombre text not null,
  unidad text not null default 'bolsas',
  cantidad numeric not null default 1,
  costo_unitario numeric not null default 0,
  precio_normal_unitario numeric not null default 0,
  descuento_porcentaje numeric not null default 0 check (descuento_porcentaje between 0 and 100),
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'promo_items'
      and column_name = 'descuento_porcentaje'
  ) then
    alter table public.promo_items
      add column descuento_porcentaje numeric not null default 0
      check (descuento_porcentaje between 0 and 100);

    -- Conserva el precio final de las promos creadas con el sistema anterior.
    update public.promo_items pi
    set descuento_porcentaje = greatest(0, least(100,
      (1 - p.precio_promo / nullif(p.precio_normal_total, 0)) * 100
    ))
    from public.promos p
    where p.id = pi.promo_id and p.precio_normal_total > 0;
  end if;
end $$;

alter table public.promos enable row level security;
alter table public.promo_items enable row level security;

drop policy if exists "authenticated_all_promos" on public.promos;
create policy "authenticated_all_promos"
  on public.promos
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated_all_promo_items" on public.promo_items;
create policy "authenticated_all_promo_items"
  on public.promo_items
  for all
  to authenticated
  using (true)
  with check (true);
