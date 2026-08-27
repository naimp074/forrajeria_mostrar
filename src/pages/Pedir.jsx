import { useCallback, useEffect, useMemo, useState } from 'react';
import { listarCatalogoPublico } from '../services/supabaseData';

const FOTO_WHEY_STAR = 'https://cdn.farmacialeloir.com.ar/img/articulos/2024/12/imagen4_star_nutrition_whey_protein_imagen4.jpg';
const formatMoneda = (n) => '$' + Number(n).toLocaleString('es-AR').replace(/,/g, '.');
const etiquetaUnidad = (u) => u === 'fardos' ? 'fardo' : u === 'unidades' ? 'unidad' : u === 'kg' ? 'kg' : 'bolsa';
const soportaPrecioKg = (p) => !['kg', 'unidades'].includes(p.unidad || 'bolsas') && (p.precioKg > 0 || p.kgPorUnidad > 0);
const imagenProducto = (p) => p.imagenUrl || (/star nutrition.*whey|whey.*star nutrition/i.test(p.name) ? FOTO_WHEY_STAR : '');

export default function Pedir() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const cargarCatalogo = useCallback(async () => {
    setLoading(true);
    try { setProductos(await listarCatalogoPublico()); setError(null); }
    catch (err) { setProductos([]); setError(err.message || 'No se pudo cargar el catálogo.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { cargarCatalogo(); }, [cargarCatalogo]);
  const catalogoFiltrado = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return q ? productos.filter((p) => p.name.toLowerCase().includes(q)) : productos;
  }, [busqueda, productos]);

  return (
    <div className="min-h-dvh bg-gradient-to-b from-emerald-50 via-slate-50 to-slate-100 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-emerald-100/80 bg-white/90 shadow-sm backdrop-blur-md"><div className="mx-auto max-w-6xl px-4 py-4 sm:px-6"><p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Forrajería</p><h1 className="text-xl font-bold sm:text-2xl">Catálogo de productos</h1></div></header>
      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        <div><h2 className="text-2xl font-black sm:text-3xl">Encontrá lo que necesitás</h2><p className="mt-1 text-sm text-slate-600 sm:text-base">Consultá nuestros productos y precios vigentes.</p></div>
        <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar producto..." className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
        {!loading && !error && <p className="text-sm font-medium text-slate-500">{catalogoFiltrado.length} producto{catalogoFiltrado.length === 1 ? '' : 's'}</p>}
        {loading && <p className="py-10 text-center text-slate-500">Cargando productos...</p>}
        {error && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</div>}
        {!loading && !error && catalogoFiltrado.length === 0 && <p className="rounded-2xl border border-dashed border-slate-200 bg-white py-10 text-center text-slate-500">No encontramos productos.</p>}
        {!loading && !error && catalogoFiltrado.length > 0 && <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{catalogoFiltrado.map((p) => {
          const u = p.unidad || 'bolsas'; const foto = imagenProducto(p);
          return <article key={p.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md">
            <div className="aspect-[4/3] bg-slate-50">{foto ? <img src={foto} alt={p.name} loading="lazy" className="h-full w-full object-contain p-4 transition group-hover:scale-[1.02]" /> : <div className="flex h-full items-center justify-center bg-gradient-to-br from-emerald-50 to-slate-100 text-sm font-semibold text-slate-400">Foto próximamente</div>}</div>
            <div className="p-4"><h3 className="min-h-12 font-bold leading-snug">{p.name}</h3><div className="mt-3 flex flex-wrap items-end justify-between gap-2 border-t border-slate-100 pt-3"><div><span className="block text-xs text-slate-500">Precio por {etiquetaUnidad(u)}</span><span className="text-xl font-black">{p.price > 0 ? formatMoneda(p.price) : 'Consultar'}</span></div>{u !== 'kg' && soportaPrecioKg(p) && p.precioKg > 0 && <span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-sm font-bold text-emerald-700">{formatMoneda(p.precioKg)}/kg</span>}</div></div>
          </article>;
        })}</div>}
        <p className="pt-2 text-center text-xs text-slate-400">Los precios son orientativos y pueden variar.</p>
      </main>
    </div>
  );
}
