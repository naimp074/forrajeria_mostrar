/* eslint react-refresh/only-export-components: off */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { guardarStockSaldos, listarStockSaldos } from '../services/supabaseData';

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
      // Si falla, usamos el estado inicial.
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

  const setPorProducto = useCallback((updater) => {
    setPorProductoState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const normalized = normalizeLoadedState(next);
      guardarStockSaldos(normalized).catch((err) => {
        console.warn('No se pudo guardar stock en Supabase.', err);
        setError('El stock quedo guardado localmente porque Supabase no respondio.');
      });
      return normalized;
    });
  }, []);

  const value = useMemo(
    () => ({
      porProducto,
      setPorProducto,
      loading,
      error,
    }),
    [porProducto, setPorProducto, loading, error]
  );

  return <StockContext.Provider value={value}>{children}</StockContext.Provider>;
}

export function useStock() {
  const ctx = useContext(StockContext);
  if (!ctx) throw new Error('useStock debe usarse dentro de StockProvider');
  return ctx;
}

