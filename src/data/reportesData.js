export const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export const kpisReportes = {
  ventasTotales: 1000000,
  margenPesos: 100000,
  margenPorcentaje: 10,
};

export const ventasMensuales = [
  { mes: 'ene', ventas: 50000 },
  { mes: 'feb', ventas: 75000 },
  { mes: 'mar', ventas: 70000 },
  { mes: 'abr', ventas: 85000 },
  { mes: 'may', ventas: 110000 },
  { mes: 'jun', ventas: 130000 },
  { mes: 'jul', ventas: 120000 },
  { mes: 'ago', ventas: 100000 },
  { mes: 'sep', ventas: 80000 },
  { mes: 'oct', ventas: 75000 },
  { mes: 'nov', ventas: 60000 },
  { mes: 'dic', ventas: 45000 },
];

export const ventasPorProducto = [
  { nombre: 'Maíz', ventas: 320000, unidades: 160 },
  { nombre: 'Balanceado', ventas: 256000, unidades: 80 },
  { nombre: 'Alfalfa', ventas: 225000, unidades: 90 },
  { nombre: 'Pellets', ventas: 140000, unidades: 50 },
  { nombre: 'Avena', ventas: 95000, unidades: 50 },
  { nombre: 'Sal Mineral', ventas: 45000, unidades: 30 },
];

/** Ventas por producto en cada mes (unidades vendidas) — para balance "qué renovar" */
export const ventasPorProductoPorMes = [
  { mes: 'ene', mesLabel: 'enero', productos: [
    { nombre: 'Maíz', unidades: 42, monto: 84000 },
    { nombre: 'Balanceado', unidades: 28, monto: 89600 },
    { nombre: 'Alfalfa', unidades: 22, monto: 55000 },
    { nombre: 'Pellets', unidades: 12, monto: 33600 },
    { nombre: 'Avena', unidades: 18, monto: 34200 },
    { nombre: 'Sal Mineral', unidades: 8, monto: 12000 },
  ]},
  { mes: 'feb', mesLabel: 'febrero', productos: [
    { nombre: 'Maíz', unidades: 38, monto: 76000 },
    { nombre: 'Alfalfa', unidades: 28, monto: 70000 },
    { nombre: 'Balanceado', unidades: 22, monto: 70400 },
    { nombre: 'Avena', unidades: 14, monto: 26600 },
    { nombre: 'Pellets', unidades: 14, monto: 39200 },
    { nombre: 'Sal Mineral', unidades: 6, monto: 9000 },
  ]},
  { mes: 'mar', mesLabel: 'marzo', productos: [
    { nombre: 'Maíz', unidades: 45, monto: 90000 },
    { nombre: 'Balanceado', unidades: 30, monto: 96000 },
    { nombre: 'Alfalfa', unidades: 25, monto: 62500 },
    { nombre: 'Pellets', unidades: 15, monto: 42000 },
    { nombre: 'Avena', unidades: 12, monto: 22800 },
    { nombre: 'Sal Mineral', unidades: 10, monto: 15000 },
  ]},
  { mes: 'abr', mesLabel: 'abril', productos: [
    { nombre: 'Maíz', unidades: 35, monto: 70000 },
    { nombre: 'Alfalfa', unidades: 15, monto: 37500 },
    { nombre: 'Balanceado', unidades: 20, monto: 64000 },
    { nombre: 'Avena', unidades: 6, monto: 11400 },
    { nombre: 'Pellets', unidades: 9, monto: 25200 },
    { nombre: 'Sal Mineral', unidades: 6, monto: 9000 },
  ]},
  { mes: 'may', mesLabel: 'mayo', productos: [
    { nombre: 'Maíz', unidades: 48, monto: 96000 },
    { nombre: 'Balanceado', unidades: 32, monto: 102400 },
    { nombre: 'Alfalfa', unidades: 20, monto: 50000 },
    { nombre: 'Pellets', unidades: 18, monto: 50400 },
    { nombre: 'Avena', unidades: 10, monto: 19000 },
    { nombre: 'Sal Mineral', unidades: 8, monto: 12000 },
  ]},
  { mes: 'jun', mesLabel: 'junio', productos: [
    { nombre: 'Maíz', unidades: 52, monto: 104000 },
    { nombre: 'Balanceado', unidades: 38, monto: 121600 },
    { nombre: 'Alfalfa', unidades: 30, monto: 75000 },
    { nombre: 'Pellets', unidades: 20, monto: 56000 },
    { nombre: 'Avena', unidades: 14, monto: 26600 },
    { nombre: 'Sal Mineral', unidades: 12, monto: 18000 },
  ]},
];

export const mediosDePago = [
  { nombre: 'Débito', valor: 52.0, color: '#3b82f6' },
  { nombre: 'Mercado Pago', valor: 34.95, color: '#f59e0b' },
  { nombre: 'Tarjeta de crédito', valor: 6.24, color: '#0ea5e9' },
  { nombre: 'Transferencia bancaria', valor: 4.99, color: '#ef4444' },
  { nombre: 'Efectivo', valor: 1.82, color: '#6b7280' },
];

export const ventasDiarias = [
  { dia: 1, ventas: 140000 },
  { dia: 2, ventas: 120000 },
  { dia: 3, ventas: 40000 },
  { dia: 4, ventas: 25000 },
  { dia: 5, ventas: 50000 },
  { dia: 6, ventas: 70000 },
  { dia: 7, ventas: 90000 },
  { dia: 8, ventas: 110000 },
  { dia: 9, ventas: 165000 },
  { dia: 10, ventas: 150000 },
  { dia: 11, ventas: 100000 },
  { dia: 12, ventas: 55000 },
];

export const canalesDeVenta = [
  { nombre: 'Tienda', valor: 74.08, color: '#14b8a6' },
  { nombre: 'Online', valor: 25.92, color: '#ef4444' },
];

// Distribución del margen de ganancias entre gastos (porcentajes que suman 100)
export const distribucionMargenInicial = [
  { nombre: 'Luz', valor: 15, color: '#f59e0b' },
  { nombre: 'Alquiler', valor: 35, color: '#3b82f6' },
  { nombre: 'Empleados', valor: 40, color: '#14b8a6' },
  { nombre: 'Resto / Disponible', valor: 10, color: '#6b7280' },
];
