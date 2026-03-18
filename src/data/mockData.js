export const quickProducts = [
  { name: 'Maíz', price: '$2.000', precioCompra: 1500, stock: '120 bolsas', favorite: true },
  { name: 'Alfalfa', price: '$2.500', precioCompra: 1800, stock: '45 fardos', favorite: true },
  { name: 'Balanceado', price: '$3.200', precioCompra: 2400, stock: '80 bolsas', favorite: true },
  { name: 'Avena', price: '$1.900', precioCompra: 1400, stock: '34 bolsas', favorite: false },
  { name: 'Pellets', price: '$2.800', precioCompra: 2100, stock: '25 bolsas', favorite: false },
  { name: 'Sal Mineral', price: '$1.500', precioCompra: 1100, stock: '5 bolsas', favorite: false },
];

/** Pedidos / solicitudes de clientes (productos que piden; algunos no están en catálogo) */
export const pedidosClientes = [
  { producto: 'Henos de cebada', cliente: 'La Escondida', fecha: '2025-03-09' },
  { producto: 'Henos de cebada', cliente: 'Juan Pérez', fecha: '2025-03-09' },
  { producto: 'Henos de cebada', cliente: 'Estancia San José', fecha: '2025-03-08' },
  { producto: 'Henos de cebada', cliente: 'Carlos Gómez', fecha: '2025-03-08' },
  { producto: 'Henos de cebada', cliente: 'María López', fecha: '2025-03-07' },
  { producto: 'Henos de cebada', cliente: 'La Escondida', fecha: '2025-03-07' },
  { producto: 'Henos de cebada', cliente: 'Granja Don Pedro', fecha: '2025-03-06' },
  { producto: 'Afrechillo', cliente: 'La Escondida', fecha: '2025-03-09' },
  { producto: 'Afrechillo', cliente: 'Estancia San José', fecha: '2025-03-08' },
  { producto: 'Afrechillo', cliente: 'Juan Pérez', fecha: '2025-03-08' },
  { producto: 'Afrechillo', cliente: 'Carlos Gómez', fecha: '2025-03-07' },
  { producto: 'Afrechillo', cliente: 'Granja Don Pedro', fecha: '2025-03-06' },
  { producto: 'Afrechillo', cliente: 'María López', fecha: '2025-03-05' },
  { producto: 'Maíz molido', cliente: 'Estancia San José', fecha: '2025-03-09' },
  { producto: 'Maíz molido', cliente: 'Juan Pérez', fecha: '2025-03-08' },
  { producto: 'Maíz molido', cliente: 'La Escondida', fecha: '2025-03-07' },
  { producto: 'Maíz molido', cliente: 'Carlos Gómez', fecha: '2025-03-06' },
  { producto: 'Paja de avena', cliente: 'Granja Don Pedro', fecha: '2025-03-09' },
  { producto: 'Paja de avena', cliente: 'La Escondida', fecha: '2025-03-08' },
  { producto: 'Paja de avena', cliente: 'María López', fecha: '2025-03-07' },
  { producto: 'Paja de avena', cliente: 'Juan Pérez', fecha: '2025-03-05' },
  { producto: 'Harina de soja', cliente: 'Estancia San José', fecha: '2025-03-09' },
  { producto: 'Harina de soja', cliente: 'Carlos Gómez', fecha: '2025-03-07' },
  { producto: 'Harina de soja', cliente: 'La Escondida', fecha: '2025-03-06' },
  { producto: 'Sorgo', cliente: 'Granja Don Pedro', fecha: '2025-03-08' },
  { producto: 'Sorgo', cliente: 'Juan Pérez', fecha: '2025-03-06' },
  { producto: 'Maíz', cliente: 'María López', fecha: '2025-03-09' },
  { producto: 'Alfalfa', cliente: 'La Escondida', fecha: '2025-03-08' },
];

export const sideMenu = [
  'Dashboard',
  'Ventas',
  'Caja',
  'Stock',
  'Productos',
  'Clientes',
  'Fiados',
  'Proveedores',
  'Reportes',
  'Gastos',
  'Configuración',
];

export const kpis = [
  { label: 'Ventas hoy', value: '$145.000', sub: '+18% vs ayer' },
  { label: 'Ganancia estimada', value: '$42.300', sub: 'Margen 29%' },
  { label: 'Tickets emitidos', value: '38', sub: 'Promedio $3.815' },
  { label: 'Fiado pendiente', value: '$18.500', sub: '8 clientes' },
];

export const lowStock = [
  { id: 'low-1', name: 'Sal Mineral', qty: '5 bolsas', status: 'Reponer urgente' },
  { id: 'low-2', name: 'Pellets', qty: '8 bolsas', status: 'Stock bajo' },
  { id: 'low-3', name: 'Avena', qty: '12 bolsas', status: 'Controlar' },
];

export const debtClients = [
  ['Juan Pérez', '$6.500', 'Hace 4 días'],
  ['La Escondida', '$4.800', 'Hoy'],
  ['Carlos Gómez', '$3.200', 'Hace 2 días'],
];

export const cajaDelDia = [
  ['Apertura', '$30.000'],
  ['Ingresos', '$145.000'],
  ['Egresos', '$12.700'],
  ['Cierre estimado', '$162.300'],
];

export const reportesEjecutivos = [
  ['Producto más vendido', 'Maíz'],
  ['Mayor margen', 'Balanceado Premium'],
  ['Cliente top del mes', 'La Escondida'],
  ['Compras pendientes', '2 proveedores'],
];

export const carritoActual = [
  ['Maíz', '2 x $2.000', '$4.000'],
  ['Alfalfa', '1 x $2.500', '$2.500'],
  ['Sal Mineral', '1 x $1.500', '$1.500'],
];

export const ticketRapido = {
  nombreLocal: 'Forrajería El Trébol',
  lineas: [
    ['Maíz x2', '$4.000'],
    ['Alfalfa x1', '$2.500'],
    ['Sal Mineral x1', '$1.500'],
  ],
  total: '$8.000',
  paga: '$10.000',
  vuelto: '$2.000',
};

/** Usuarios para login (en producción usar backend y contraseñas hasheadas) */
export const usuariosEjemplo = [
  { id: '1', username: 'admin', password: 'admin', nombre: 'Administrador' },
  { id: '2', username: 'maria', password: '1234', nombre: 'María' },
  { id: '3', username: 'juan', password: '1234', nombre: 'Juan' },
  { id: '4', username: 'naim', password: 'naimkapo32', nombre: 'Naim' },
];

/** Etiquetas para categorías de gastos */
export const categoriasGastos = {
  comida: 'Comida / Viáticos',
  sueldos: 'Sueldos / Pagos a trabajadores',
  afip: 'AFIP / Impuestos',
  luz: 'Luz',
  gas: 'Gas',
  alquiler: 'Alquiler',
  proveedores: 'Proveedores',
  otros: 'Otros',
};

/** Gastos de ejemplo para reportes */
export const gastosEjemplo = [
  { id: '1', descripcion: 'Comida del personal', monto: 10000, categoria: 'comida', fecha: '2025-03-08', detalle: 'Almuerzo equipo' },
  { id: '2', descripcion: 'Sueldo María', monto: 85000, categoria: 'sueldos', fecha: '2025-03-01' },
  { id: '3', descripcion: 'Sueldo Juan', monto: 78000, categoria: 'sueldos', fecha: '2025-03-01' },
  { id: '4', descripcion: 'AFIP monotributo', monto: 15000, categoria: 'afip', fecha: '2025-03-10', detalle: 'Vencimiento 20' },
  { id: '5', descripcion: 'Luz', monto: 12500, categoria: 'luz', fecha: '2025-03-05' },
  { id: '6', descripcion: 'Gas', monto: 8200, categoria: 'gas', fecha: '2025-03-03' },
];
