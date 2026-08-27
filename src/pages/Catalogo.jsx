import { useMemo, useState } from 'react';
import { useProductos } from '../context/ProductosContext';
import { actualizarImagenProducto } from '../services/supabaseData';

const FOTO_WHEY_STAR = 'https://cdn.farmacialeloir.com.ar/img/articulos/2024/12/imagen4_star_nutrition_whey_protein_imagen4.jpg';

function imagenInicial(producto) {
  if (producto.imagenUrl) return producto.imagenUrl;
  return /star nutrition.*whey|whey.*star nutrition/i.test(producto.name) ? FOTO_WHEY_STAR : '';
}

function SinImagen() {
  return <div className="flex h-full items-center justify-center bg-slate-100 text-sm font-medium text-slate-400">Sin imagen</div>;
}

export default function Catalogo() {
  const { productos, loading, error, recargarProductos } = useProductos();
  const [busqueda, setBusqueda] = useState('');
  const [urls, setUrls] = useState({});
  const [guardando, setGuardando] = useState(null);
  const [mensaje, setMensaje] = useState('');

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return productos.filter((p) => p.activo !== false && (!q || p.name.toLowerCase().includes(q)));
  }, [productos, busqueda]);

  const valorUrl = (producto) => urls[producto.id] ?? imagenInicial(producto);

  const guardar = async (producto) => {
    setGuardando(producto.id);
    setMensaje('');
    try {
      await actualizarImagenProducto(producto.id, valorUrl(producto));
      await recargarProductos();
      setMensaje(`Imagen de “${producto.name}” guardada.`);
    } catch (err) {
      setMensaje(err.message || 'No se pudo guardar la imagen.');
    } finally {
      setGuardando(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Catálogo</h1>
        <p className="mt-1 max-w-3xl text-sm sm:text-base text-slate-600">Agregá el enlace de una foto real para cada producto. La imagen aparecerá en la página pública <strong>/pedir</strong>.</p>
      </div>

      {mensaje && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{mensaje}</div>}
      {error && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>}

      <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar producto para agregarle una foto..." className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500" />

      {loading ? <p className="text-slate-500">Cargando productos...</p> : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filtrados.map((producto) => {
            const url = valorUrl(producto);
            return (
              <article key={producto.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:flex">
                <div className="h-52 w-full shrink-0 sm:h-auto sm:w-48">
                  {url ? <img src={url} alt={producto.name} className="h-full w-full object-contain bg-white p-3" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : <SinImagen />}
                </div>
                <div className="flex-1 p-4 space-y-3">
                  <div>
                    <h2 className="font-bold text-slate-900">{producto.name}</h2>
                    <p className="text-xs text-slate-500">Pegá una URL directa que termine en JPG, PNG o WEBP.</p>
                  </div>
                  <input type="url" value={url} onChange={(e) => setUrls((prev) => ({ ...prev, [producto.id]: e.target.value }))} placeholder="https://sitio.com/foto-producto.jpg" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => guardar(producto)} disabled={guardando === producto.id} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{guardando === producto.id ? 'Guardando...' : 'Guardar imagen'}</button>
                    {url && <button type="button" onClick={() => setUrls((prev) => ({ ...prev, [producto.id]: '' }))} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Quitar</button>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
