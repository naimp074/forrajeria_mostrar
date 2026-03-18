import { createContext, useContext, useState } from 'react';
import { gastosEjemplo } from '../data/mockData';

const GastosContext = createContext(null);

export function GastosProvider({ children }) {
  const [gastos, setGastos] = useState(gastosEjemplo);

  const agregarGasto = (nuevo) => {
    setGastos((prev) => [nuevo, ...prev]);
  };

  const totalGastos = gastos.reduce((s, g) => s + g.monto, 0);

  const value = {
    gastos,
    setGastos,
    agregarGasto,
    totalGastos,
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
