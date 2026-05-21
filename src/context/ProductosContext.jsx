/* eslint react-refresh/only-export-components: off */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  actualizarProducto as actualizarProductoSupabase,
  borrarProducto as borrarProductoSupabase,
  crearProducto as crearProductoSupabase,
  listarProductos,
} from '../services/supabaseData';

const ProductosContext = createContext(null);

export function ProductosProvider({ children }) {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const recargarProductos = useCallback(async () => {
    try {
      const rows = await listarProductos();
      setProductos(rows);
      setError(null);
    } catch (err) {
      console.warn('No se pudieron cargar productos desde Supabase.', err);
      setProductos([]);
      setError('No se pudieron cargar productos desde Supabase.');
    } finally {
      setLoading(false);
    }
  }, []);

  const actualizarProducto = useCallback(async (id, producto) => {
    const actualizado = await actualizarProductoSupabase(id, producto);
    setProductos((prev) => prev.map((p) => (p.id === id ? actualizado : p)));
    return actualizado;
  }, []);

  const crearProducto = useCallback(async (producto) => {
    const creado = await crearProductoSupabase(producto);
    setProductos((prev) => [...prev, creado].sort((a, b) => a.name.localeCompare(b.name, 'es')));
    return creado;
  }, []);

  const borrarProducto = useCallback(async (id) => {
    await borrarProductoSupabase(id);
    setProductos((prev) => prev.filter((p) => p.id !== id));
  }, []);

  useEffect(() => {
    let mounted = true;
    listarProductos()
      .then((rows) => {
        if (!mounted) return;
        setProductos(rows);
        setError(null);
      })
      .catch((err) => {
        if (!mounted) return;
        console.warn('No se pudieron cargar productos desde Supabase.', err);
        setProductos([]);
        setError('No se pudieron cargar productos desde Supabase.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo(
    () => ({ productos, loading, error, recargarProductos, crearProducto, actualizarProducto, borrarProducto }),
    [productos, loading, error, recargarProductos, crearProducto, actualizarProducto, borrarProducto]
  );

  return <ProductosContext.Provider value={value}>{children}</ProductosContext.Provider>;
}

export function useProductos() {
  const ctx = useContext(ProductosContext);
  if (!ctx) throw new Error('useProductos debe usarse dentro de ProductosProvider');
  return ctx;
}
