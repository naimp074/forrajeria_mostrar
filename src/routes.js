/**
 * Rutas de la app. Cada ítem del menú tiene su path para que
 * "cada cosa esté en su apartado".
 */
export const ROUTES = {
  dashboard: '/',
  ventas: '/ventas',
  presupuestos: '/presupuestos',
  caja: '/caja',
  stock: '/stock',
  productos: '/productos',
  promos: '/promos',
  pedir: '/pedir',
  clientes: '/clientes',
  proveedores: '/proveedores',
  reportes: '/reportes',
  gastos: '/gastos',
  configuracion: '/configuracion',
};

/** Orden y etiquetas del menú con su ruta */
export const MENU_ITEMS = [
  { label: 'Dashboard', path: ROUTES.dashboard },
  { label: 'Ventas', path: ROUTES.ventas },
  { label: 'Presupuestos', path: ROUTES.presupuestos },
  { label: 'Caja', path: ROUTES.caja },
  { label: 'Stock', path: ROUTES.stock },
  { label: 'Productos', path: ROUTES.productos },
  { label: 'Promos', path: ROUTES.promos },
  { label: 'Clientes', path: ROUTES.clientes },
  { label: 'Proveedores', path: ROUTES.proveedores },
  { label: 'Reportes', path: ROUTES.reportes },
  { label: 'Gastos', path: ROUTES.gastos },
  { label: 'Configuración', path: ROUTES.configuracion },
];
