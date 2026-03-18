/* eslint react-refresh/only-export-components: off */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { quickProducts } from '../data/mockData';

const StockContext = createContext(null);
const STOCK_KEY = 'forrajeria_stock_por_producto_v1';

function parsePrecio(str) {
  if (typeof str === 'number') return str;
  const num = parseInt(String(str).replace(/[^\d]/g, ''), 10);
  return isNaN(num) ? 0 : num;
}

function estadoInicialPorProducto() {
  return quickProducts.reduce((acc, p) => {
    acc[p.name] = {
      cantidadComprada: 0,
      cantidadVendida: 0,
      precioCompra: p.precioCompra ?? 0,
      precioVenta: parsePrecio(p.price) || 0,
    };
    return acc;
  }, {});
}

function normalizeLoadedState(loaded) {
  const base = estadoInicialPorProducto();
  if (!loaded || typeof loaded !== 'object') return base;

  const next = { ...base };
  quickProducts.forEach((p) => {
    const d = loaded?.[p.name] || {};
    const cantidadComprada = Number(d.cantidadComprada);
    const cantidadVendida = Number(d.cantidadVendida);
    const precioCompra = Number(d.precioCompra);
    const precioVenta = Number(d.precioVenta);

    next[p.name] = {
      cantidadComprada: Number.isFinite(cantidadComprada) ? cantidadComprada : base[p.name].cantidadComprada,
      cantidadVendida: Number.isFinite(cantidadVendida) ? cantidadVendida : base[p.name].cantidadVendida,
      precioCompra: Number.isFinite(precioCompra) ? precioCompra : base[p.name].precioCompra,
      precioVenta: Number.isFinite(precioVenta) ? precioVenta : base[p.name].precioVenta,
    };
  });

  return next;
}

export function StockProvider({ children }) {
  const [porProducto, setPorProducto] = useState(() => {
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

  useEffect(() => {
    try {
      localStorage.setItem(STOCK_KEY, JSON.stringify(porProducto));
    } catch {
      // Persistencia best-effort.
    }
  }, [porProducto]);

  const value = useMemo(
    () => ({
      porProducto,
      setPorProducto,
    }),
    [porProducto]
  );

  return <StockContext.Provider value={value}>{children}</StockContext.Provider>;
}

export function useStock() {
  const ctx = useContext(StockContext);
  if (!ctx) throw new Error('useStock debe usarse dentro de StockProvider');
  return ctx;
}

