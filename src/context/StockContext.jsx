/* eslint react-refresh/only-export-components: off */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { guardarStockSaldos, listarStockSaldos } from '../services/supabaseData';
import { nombresEquivalentes, podarStockConCatalogo } from '../utils/nombreProducto';

const StockContext = createContext(null);
const STOCK_KEY = 'forrajeria_stock_por_producto_v2';

function estadoInicialPorProducto() {
  return {};
}

function normalizeLoadedState(loaded) {
  const base = estadoInicialPorProducto();
  if (!loaded || typeof loaded !== 'object') return base;

  const next = { ...base };
  Object.keys(loaded).forEach((name) => {
    const d = loaded[name];
    if (!d || typeof d !== 'object') return;
    const cantidadComprada = Number(d.cantidadComprada) || 0;
    const cantidadVendida = Number(d.cantidadVendida) || 0;
    const precioCompra = Number(d.precioCompra);
    const precioVenta = Number(d.precioVenta);
    next[name] = {
      cantidadComprada: Number.isFinite(cantidadComprada) ? cantidadComprada : 0,
      cantidadVendida: Number.isFinite(cantidadVendida) ? cantidadVendida : 0,
      precioCompra: Number.isFinite(precioCompra) ? precioCompra : 0,
      precioVenta: Number.isFinite(precioVenta) ? precioVenta : 0,
    };
  });

  return next;
}

export function StockProvider({ children }) {
  const [porProducto, setPorProductoState] = useState(() => {
    try {
      const raw = localStorage.getItem(STOCK_KEY);
      if (!raw) return estadoInicialPorProducto();
      const loaded = JSON.parse(raw);
      return normalizeLoadedState(loaded);
    } catch {
      return estadoInicialPorProducto();
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    listarStockSaldos()
      .then((rows) => {
        if (!mounted) return;
        setPorProductoState((prev) => normalizeLoadedState({ ...prev, ...rows }));
        setError(null);
      })
      .catch((err) => {
        if (!mounted) return;
        console.warn('No se pudo cargar stock desde Supabase.', err);
        setError('No se pudo cargar stock desde Supabase.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STOCK_KEY, JSON.stringify(porProducto));
    } catch {
      // Persistencia best-effort.
    }
  }, [porProducto]);

  const persistirStock = useCallback((normalized) => {
    guardarStockSaldos(normalized).catch((err) => {
      console.warn('No se pudo guardar stock en Supabase.', err);
      setError('El stock quedó guardado localmente porque Supabase no respondió.');
    });
  }, []);

  const setPorProducto = useCallback((updater) => {
    setPorProductoState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const normalized = normalizeLoadedState(next);
      persistirStock(normalized);
      return normalized;
    });
  }, [persistirStock]);

  const eliminarStockPorNombre = useCallback((nombre) => {
    if (!nombre) return;
    setPorProductoState((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        if (nombresEquivalentes(key, nombre)) {
          delete next[key];
        }
      }
      const normalized = normalizeLoadedState(next);
      persistirStock(normalized);
      return normalized;
    });
  }, [persistirStock]);

  const sincronizarStockConCatalogo = useCallback((nombresCatalogo) => {
    setPorProductoState((prev) => {
      const podado = podarStockConCatalogo(prev, nombresCatalogo);
      const normalized = normalizeLoadedState(podado);
      if (JSON.stringify(normalized) !== JSON.stringify(prev)) {
        persistirStock(normalized);
      }
      return normalized;
    });
  }, [persistirStock]);

  const value = useMemo(
    () => ({
      porProducto,
      setPorProducto,
      eliminarStockPorNombre,
      sincronizarStockConCatalogo,
      loading,
      error,
    }),
    [porProducto, setPorProducto, eliminarStockPorNombre, sincronizarStockConCatalogo, loading, error],
  );

  return <StockContext.Provider value={value}>{children}</StockContext.Provider>;
}

export function useStock() {
  const ctx = useContext(StockContext);
  if (!ctx) throw new Error('useStock debe usarse dentro de StockProvider');
  return ctx;
}
