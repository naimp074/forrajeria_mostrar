/* eslint react-refresh/only-export-components: off */
import { createContext, useContext, useEffect, useState } from 'react';
import { crearGasto, listarGastos } from '../services/supabaseData';

const GastosContext = createContext(null);

export function GastosProvider({ children }) {
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    listarGastos()
      .then((rows) => {
        if (!mounted) return;
        setGastos(rows);
        setError(null);
      })
      .catch((err) => {
        if (!mounted) return;
        console.warn('No se pudieron cargar gastos desde Supabase.', err);
        setGastos([]);
        setError('No se pudieron cargar gastos desde Supabase.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const agregarGasto = async (nuevo) => {
    setGastos((prev) => [nuevo, ...prev]);
    try {
      const guardado = await crearGasto(nuevo);
      setGastos((prev) => prev.map((g) => (g.id === nuevo.id ? guardado : g)));
      setError(null);
    } catch (err) {
      console.warn('No se pudo guardar el gasto en Supabase.', err);
      setError('El gasto quedo solo en esta sesion porque Supabase no respondio.');
    }
  };

  const totalGastos = gastos.reduce((s, g) => s + g.monto, 0);

  const value = {
    gastos,
    setGastos,
    agregarGasto,
    totalGastos,
    loading,
    error,
  };

  return (
    <GastosContext.Provider value={value}>
      {children}
    </GastosContext.Provider>
  );
}

export function useGastos() {
  const ctx = useContext(GastosContext);
  if (!ctx) {
    throw new Error('useGastos debe usarse dentro de GastosProvider');
  }
  return ctx;
}
