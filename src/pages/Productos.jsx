import { useEffect, useState, useMemo } from 'react';
import { useProductos } from '../context/ProductosContext';
import { useStock } from '../context/StockContext';
import {
  registrarIngresoStock,
  existeProductoConNombre,
  listarPedidosClientes,
  crearPedidoCliente,
} from '../services/supabaseData';
import { usePagination } from '../hooks/usePagination';
import Paginacion from '../components/Paginacion';
import {
  extraerKgDelNombre,
  calcularPrecioCompraKg,
  calcularPrecioVentaKg,
  parseNumeroFlexible,
} from '../utils/preciosKg';
import {
  MARGEN_DEFAULT,
  calcularPrecioVenta,
  enriquecerProductoConMargenes,
  formatearMargen,
  parseMargenFormulario,
} from '../utils/margenes';
import { normalizarNombreProducto, nombresEquivalentes, buscarStockProducto } from '../utils/nombreProducto';

function formatMoneda(n) {
  return '$' + Number(n).toLocaleString('es-AR').replace(/,/g, '.');
}

function parseNumero(valor) {
  return parseNumeroFlexible(valor);
}

function etiquetaVentaUnidad(unidad) {
  if (unidad === 'fardos') return 'fardo';
  if (unidad === 'unidades') return 'unidad';
  if (unidad === 'kg') return 'kg';
  return 'bolsa';
}

function calcularCostoUnitario(precioCompraTotal, cantidad) {
  const total = parseNumero(precioCompraTotal);
  const cant = parseNumero(cantidad);
  if (total <= 0 || cant <= 0) return 0;
  return total / cant;
}

function stockDisponible(datos) {
  if (!datos) return 0;
  return Math.max(0, (Number(datos.cantidadComprada) || 0) - (Number(datos.cantidadVendida) || 0));
}

function formatCantidad(cantidad, unidad = 'unidades') {
  const n = Number(cantidad) || 0;
  return `${n.toLocaleString('es-AR', { maximumFractionDigits: 3 })} ${unidad}`;
}

function redondearStock(cantidad, unidad = 'bolsas') {
  const n = Number(cantidad);
  if (!Number.isFinite(n)) return 0;
  const decimales = unidad === 'kg' ? 3 : 3;
  const factor = 10 ** decimales;
  return Math.round(n * factor) / factor;
}

function formatStockParaEdicion(cantidad, unidad = 'bolsas') {
  if (cantidad === '' || cantidad == null) return '';
  const redondeado = redondearStock(cantidad, unidad);
  return Number.isFinite(redondeado) ? String(redondeado) : '';
}

function fechaHoy() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function normalizarBusqueda(valor) {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function mensajeErrorGuardadoProducto(err) {
  const mensaje = String(err?.message || err?.details || '');
  const lower = mensaje.toLowerCase();

  if (lower.includes('margen_bolsa') || lower.includes('margen_kg')) {
    return 'Falta actualizar Supabase: ejecutá el SQL supabase/add_margenes_producto.sql para guardar los porcentajes de ganancia.';
  }
  if (
    lower.includes('proveedor_nombre')
    || lower.includes('proveedor_telefono')
    || lower.includes('observacion')
  ) {
    return 'Falta actualizar Supabase: ejecutá el SQL supabase/add_producto_detalles.sql para poder guardar proveedor, número y observación.';
  }
  if (err?.code === '23505' || lower.includes('duplicate') || lower.includes('unique')) {
    return 'Ya existe otro producto con ese nombre. Usá un nombre diferente.';
  }
  if (mensaje) {
    return `No se pudo guardar el producto: ${mensaje}`;
  }
  return 'No se pudo guardar el producto. Revisá tu conexión e intentá de nuevo.';
}


function avisarProveedoresActualizados() {
  window.dispatchEvent(new CustomEvent('forrajeria:proveedores-actualizados'));
}

export default function Productos() {
  const { productos, loading, error, recargarProductos, crearProducto, actualizarProducto, borrarProducto } = useProductos();
  const { porProducto, setPorProducto, eliminarStockPorNombre, sincronizarStockConCatalogo } = useStock();
  const ventasPorProducto = [];
  const ventasPorProductoPorMes = [];
  const [mesBalance, setMesBalance] = useState('');
  const [listaPedidos, setListaPedidos] = useState([]);
  const [loadingPedidos, setLoadingPedidos] = useState(true);
  const [pedidoError, setPedidoError] = useState(null);
  const [guardandoPedido, setGuardandoPedido] = useState(false);
  const [mostrarFormPedido, setMostrarFormPedido] = useState(false);
  const [productoPedido, setProductoPedido] = useState('');
  const [clientePedido, setClientePedido] = useState('');
  const [mostrarFormProducto, setMostrarFormProducto] = useState(false);
  const [editandoProducto, setEditandoProducto] = useState(null);
  const [busquedaCatalogo, setBusquedaCatalogo] = useState('');
  const [formProducto, setFormProducto] = useState({
    nombre: '',
    precioUnidad: '',
    margenBolsa: String(MARGEN_DEFAULT),
    margenKg: String(MARGEN_DEFAULT),
    precioKg: '',
    kgPorUnidad: '',
    precioCompra: '',
    cantidad: '',
    unidad: 'bolsas',
    proveedor: '',
    numeroProveedor: '',
    observacion: '',
    favorito: false,
  });
  const [guardandoProducto, setGuardandoProducto] = useState(false);
  const [productoError, setProductoError] = useState(null);

  useEffect(() => {
    recargarProductos();
  }, [recargarProductos]);

  useEffect(() => {
    let activo = true;
    setLoadingPedidos(true);
    setPedidoError(null);
    listarPedidosClientes()
      .then((pedidos) => {
        if (activo) setListaPedidos(pedidos);
      })
      .catch((err) => {
        if (activo) {
          setPedidoError(err.message || 'No se pudieron cargar los pedidos.');
          setListaPedidos([]);
        }
      })
      .finally(() => {
        if (activo) setLoadingPedidos(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    if (productos.length === 0) return;
    sincronizarStockConCatalogo(productos.map((p) => p.name));
  }, [productos, sincronizarStockConCatalogo]);

  const productosConPreciosStock = useMemo(() => {
    return productos.map((producto) => {
      const stock = buscarStockProducto(porProducto, producto.name);
      const precioCompraStock = Number(stock.precioCompra) || 0;
      const precioVentaStock = Number(stock.precioVenta) || 0;
      const disponible = stockDisponible(stock);
      const precioCompra = precioCompraStock || Number(producto.precioCompra) || 0;
      const kgPorUnidad = extraerKgDelNombre(producto.name);
      const enriquecido = enriquecerProductoConMargenes(producto, precioCompra, {
        kgPorUnidad,
        precioVentaStock: precioVentaStock,
        precioKgStock: Number(producto.precioKg) || 0,
      });
      return {
        ...producto,
        precioCompra: enriquecido.precioCompra,
        price: enriquecido.price,
        precioKg: enriquecido.precioKg,
        margenBolsa: enriquecido.margenBolsa,
        margenKg: enriquecido.margenKg,
        cantidadDisponible: disponible,
        stock: formatCantidad(disponible, producto.unidad),
      };
    });
  }, [productos, porProducto]);

  const esUnidadKg = formProducto.unidad === 'kg';
  const esUnidadPieza = formProducto.unidad === 'unidades';
  const soportaVentaPorKg = !esUnidadKg && !esUnidadPieza;
  const costoDirecto = editandoProducto || esUnidadKg || esUnidadPieza;
  const costoFormulario = costoDirecto
    ? parseNumero(formProducto.precioCompra)
    : calcularCostoUnitario(formProducto.precioCompra, formProducto.cantidad);
  const margenBolsaForm = parseMargenFormulario(formProducto.margenBolsa);
  const margenKgForm = parseMargenFormulario(formProducto.margenKg, margenBolsaForm);
  const precioVentaFormulario = esUnidadKg
    ? calcularPrecioVenta(costoFormulario, margenKgForm)
    : calcularPrecioVenta(costoFormulario, margenBolsaForm);
  const kgPorUnidadForm = parseNumero(formProducto.kgPorUnidad) || extraerKgDelNombre(formProducto.nombre);
  const precioVentaKgForm = soportaVentaPorKg && kgPorUnidadForm > 0
    ? calcularPrecioVentaKg(costoFormulario, kgPorUnidadForm, margenKgForm)
    : 0;
  const costoKgForm = kgPorUnidadForm > 0 ? calcularPrecioCompraKg(costoFormulario, kgPorUnidadForm) : 0;

  const datosMes = ventasPorProductoPorMes.find((m) => m.mes === mesBalance);
  const aRenovar = datosMes
    ? [...datosMes.productos].sort((a, b) => b.unidades - a.unidades)
    : [];

  const masVendidos = [...ventasPorProducto].sort((a, b) => (b.unidades ?? b.ventas) - (a.unidades ?? a.ventas));

  const nombresEnCatalogo = useMemo(() => productosConPreciosStock.map((p) => p.name), [productosConPreciosStock]);
  const productosFiltrados = useMemo(() => {
    const busqueda = normalizarBusqueda(busquedaCatalogo);
    if (!busqueda) return productosConPreciosStock;

    return productosConPreciosStock.filter((producto) => {
      const texto = normalizarBusqueda([
        producto.name,
        producto.proveedor,
        producto.numeroProveedor,
        producto.observacion,
      ].join(' '));
      return texto.includes(busqueda);
    });
  }, [busquedaCatalogo, productosConPreciosStock]);

  const catalogoPaginacion = usePagination(productosFiltrados, {
    pageSize: 20,
    resetKey: busquedaCatalogo,
  });

  const { topNoTengo, ultimosPedidos } = useMemo(() => {
    const porProducto = {};
    listaPedidos.forEach((ped) => {
      porProducto[ped.producto] = (porProducto[ped.producto] || 0) + 1;
    });
    const noTengo = Object.entries(porProducto)
      .filter(([nombre]) => !nombresEnCatalogo.includes(nombre))
      .map(([nombre, veces]) => ({ producto: nombre, veces }))
      .sort((a, b) => b.veces - a.veces);
    const ultimos = [...listaPedidos]
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    return { topNoTengo: noTengo, ultimosPedidos: ultimos };
  }, [nombresEnCatalogo, listaPedidos]);

  const pedidosPaginacion = usePagination(ultimosPedidos, { pageSize: 8 });
  const noTengoPaginacion = usePagination(topNoTengo, { pageSize: 10 });

  const guardarPedido = async (e) => {
    e.preventDefault();
    const producto = productoPedido.trim();
    if (!producto || guardandoPedido) return;
    setGuardandoPedido(true);
    setPedidoError(null);
    try {
      const nuevo = await crearPedidoCliente({
        producto,
        cliente: clientePedido.trim() || 'Cliente',
        fecha: fechaHoy(),
      });
      setListaPedidos((prev) => [nuevo, ...prev]);
      setProductoPedido('');
      setClientePedido('');
      setMostrarFormPedido(false);
    } catch (err) {
      setPedidoError(err.message || 'No se pudo guardar el pedido.');
    } finally {
      setGuardandoPedido(false);
    }
  };

  const iniciarEdicion = (producto) => {
    setEditandoProducto(producto);
    setMostrarFormProducto(true);
    setFormProducto({
      nombre: producto.name || '',
      precioUnidad: String(producto.price ?? ''),
      margenBolsa: formatearMargen(producto.margenBolsa),
      margenKg: formatearMargen(producto.margenKg),
      precioKg: String(producto.precioKg ?? ''),
      kgPorUnidad: String(extraerKgDelNombre(producto.name) || ''),
      precioCompra: String(producto.precioCompra ?? ''),
      cantidad: formatStockParaEdicion(
        producto.cantidadDisponible ?? stockDisponible(buscarStockProducto(porProducto, producto.name)),
        producto.unidad || 'bolsas',
      ),
      unidad: producto.unidad || 'bolsas',
      proveedor: producto.proveedor || '',
      numeroProveedor: producto.numeroProveedor || '',
      observacion: producto.observacion || '',
      favorito: Boolean(producto.favorite),
    });
    setProductoError(null);
  };

  const cancelarEdicion = () => {
    setMostrarFormProducto(false);
    setEditandoProducto(null);
    setProductoError(null);
    setFormProducto({
      nombre: '',
      precioUnidad: '',
      margenBolsa: String(MARGEN_DEFAULT),
    margenKg: String(MARGEN_DEFAULT),
      precioKg: '',
      kgPorUnidad: '',
      precioCompra: '',
      cantidad: '',
      unidad: 'bolsas',
      proveedor: '',
      numeroProveedor: '',
      observacion: '',
      favorito: false,
    });
  };

  const iniciarNuevoProducto = () => {
    setEditandoProducto(null);
    setMostrarFormProducto(true);
    setFormProducto({
      nombre: '',
      precioUnidad: '',
      margenBolsa: String(MARGEN_DEFAULT),
    margenKg: String(MARGEN_DEFAULT),
      precioKg: '',
      kgPorUnidad: '',
      precioCompra: '',
      cantidad: '',
      unidad: 'bolsas',
      proveedor: '',
      numeroProveedor: '',
      observacion: '',
      favorito: false,
    });
    setProductoError(null);
  };

  const guardarProductoEditado = async (e) => {
    e.preventDefault();
    const nombre = normalizarNombreProducto(formProducto.nombre);
    if (!nombre) {
      setProductoError('El nombre del producto es obligatorio.');
      return;
    }

    const duplicadoLocal = productos.some(
      (p) => nombresEquivalentes(p.name, nombre) && p.id !== editandoProducto?.id,
    );
    if (duplicadoLocal) {
      setProductoError('Ya existe un producto con ese nombre (o uno muy parecido). Editá el existente en lugar de crear otro.');
      return;
    }

    setGuardandoProducto(true);
    setProductoError(null);
    try {
      const duplicadoRemoto = await existeProductoConNombre(nombre, {
        excluirId: editandoProducto?.id,
      });
      if (duplicadoRemoto) {
        setProductoError('Ya existe otro producto con ese nombre en Supabase.');
        return;
      }

      const cantidad = parseNumero(formProducto.cantidad);
      if (!editandoProducto && cantidad <= 0) {
        setProductoError('La cantidad debe ser mayor a 0. Podés usar 0,5 para medio kilo (500 g).');
        return;
      }

      const esKg = formProducto.unidad === 'kg';
      const esPieza = formProducto.unidad === 'unidades';
      const precioCompra = (editandoProducto || esKg || esPieza)
        ? parseNumero(formProducto.precioCompra)
        : calcularCostoUnitario(formProducto.precioCompra, formProducto.cantidad);
      const margenBolsa = parseMargenFormulario(formProducto.margenBolsa);
      const margenKg = esPieza
        ? margenBolsa
        : parseMargenFormulario(formProducto.margenKg, margenBolsa);
      const margenBolsaFinal = esKg ? margenKg : margenBolsa;
      const precioVentaCalculado = esKg
        ? calcularPrecioVenta(precioCompra, margenKg)
        : calcularPrecioVenta(precioCompra, margenBolsa);
      const kgPorUnidad = esPieza
        ? 0
        : parseNumero(formProducto.kgPorUnidad) || extraerKgDelNombre(nombre);
      const precioKgFinal = esKg
        ? precioVentaCalculado
        : kgPorUnidad > 0
          ? calcularPrecioVentaKg(precioCompra, kgPorUnidad, margenKg)
          : 0;
      const payload = {
        ...formProducto,
        nombre,
        precioCompra,
        precioUnidad: precioVentaCalculado,
        precioKg: precioKgFinal,
        margenBolsa: margenBolsaFinal,
        margenKg,
        unidad: formProducto.unidad,
      };
      const precioVenta = precioVentaCalculado;
      const proveedorEditado = formProducto.proveedor.trim();
      const numeroProveedorEditado = formProducto.numeroProveedor.trim();
      if (editandoProducto) {
        const cambioProveedor =
          proveedorEditado !== (editandoProducto.proveedor || '').trim() ||
          numeroProveedorEditado !== (editandoProducto.numeroProveedor || '').trim();
        await actualizarProducto(editandoProducto.id, payload);
        setPorProducto((prev) => {
          const nombreAnterior = editandoProducto.name;
          let actual = null;
          const next = { ...prev };
          for (const key of Object.keys(prev)) {
            if (nombresEquivalentes(key, nombreAnterior) || nombresEquivalentes(key, nombre)) {
              actual = actual || prev[key];
              if (!nombresEquivalentes(key, nombre)) delete next[key];
            }
          }
          actual = actual || {
            cantidadComprada: 0,
            cantidadVendida: 0,
            precioCompra: 0,
            precioVenta: 0,
          };
          const disponibleActual = redondearStock(stockDisponible(actual), formProducto.unidad);
          const stockIngresado = String(formProducto.cantidad).trim() !== '';
          const cantidadDisponible = stockIngresado
            ? redondearStock(cantidad, formProducto.unidad)
            : disponibleActual;
          next[nombre] = {
            ...actual,
            cantidadComprada: redondearStock(
              (Number(actual.cantidadVendida) || 0) + cantidadDisponible,
              formProducto.unidad,
            ),
            precioCompra,
            precioVenta,
          };
          return next;
        });
        if (cambioProveedor) {
          avisarProveedoresActualizados();
        }
      } else {
        await crearProducto(payload);
        const ingreso = {
          producto: nombre,
          cantidad,
          precioCompra,
          precioVenta,
          proveedor: formProducto.proveedor.trim(),
          numeroProveedor: formProducto.numeroProveedor.trim(),
          unidad: formProducto.unidad || 'unidades',
          observacion: formProducto.observacion.trim(),
          fecha: new Date().toISOString().slice(0, 10),
        };
        setPorProducto((prev) => {
          const actual = prev[nombre] || {
            cantidadComprada: 0,
            cantidadVendida: 0,
            precioCompra: 0,
            precioVenta: 0,
          };
          return {
            ...prev,
            [nombre]: {
              ...actual,
              cantidadComprada: actual.cantidadComprada + cantidad,
              precioCompra: precioCompra || actual.precioCompra,
              precioVenta: precioVenta || actual.precioVenta,
            },
          };
        });
        await registrarIngresoStock(ingreso);
        if (proveedorEditado || numeroProveedorEditado) {
          avisarProveedoresActualizados();
        }
      }
      await recargarProductos();
      cancelarEdicion();
    } catch (err) {
      console.warn('No se pudo guardar el producto.', err);
      setProductoError(mensajeErrorGuardadoProducto(err));
    } finally {
      setGuardandoProducto(false);
    }
  };

  const confirmarBorrado = async (producto) => {
    const seguro = window.confirm(
      `¿Seguro que querés borrar "${producto.name}"? Esta acción no se puede deshacer.`
    );
    if (!seguro) return;

    setProductoError(null);
    try {
      await borrarProducto(producto.id);
      eliminarStockPorNombre(producto.name);
      await recargarProductos();
      if (editandoProducto?.id === producto.id) cancelarEdicion();
    } catch (err) {
      console.warn('No se pudo borrar el producto.', err);
      setProductoError('No se pudo borrar el producto.');
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">Productos</h1>
      <p className="text-slate-600 -mt-4">
        Catálogo de productos, balance por mes, pedidos de clientes y lo que más salió.
      </p>

      {/* Pedidos de clientes + Top "lo que más piden y no tengo" */}
      <section className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-1">Pedidos de clientes</h2>
            <p className="text-slate-500 text-sm">
              Lo que te piden y no tenés en catálogo: conviene traer para no perder ventas.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMostrarFormPedido((v) => !v)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
          >
            <span aria-hidden>+</span>
            Anotar lo que piden
          </button>
        </div>

        {pedidoError && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {pedidoError}
          </div>
        )}

        {mostrarFormPedido && (
          <form onSubmit={guardarPedido} className="mb-6 p-4 rounded-2xl border border-slate-200 bg-slate-50/80">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Qué te piden los clientes</h3>
            <div className="flex flex-wrap gap-3 items-end">
              <label className="flex-1 min-w-[180px]">
                <span className="block text-xs font-medium text-slate-500 mb-1">Producto que piden</span>
                <input
                  type="text"
                  value={productoPedido}
                  onChange={(e) => setProductoPedido(e.target.value)}
                  placeholder="Ej: Henos de cebada, Afrechillo..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  autoFocus
                />
              </label>
              <label className="flex-1 min-w-[140px]">
                <span className="block text-xs font-medium text-slate-500 mb-1">Cliente (opcional)</span>
                <input
                  type="text"
                  value={clientePedido}
                  onChange={(e) => setClientePedido(e.target.value)}
                  placeholder="Nombre del cliente"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!productoPedido.trim() || guardandoPedido}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {guardandoPedido ? 'Guardando...' : 'Guardar pedido'}
                </button>
                <button
                  type="button"
                  onClick={() => { setMostrarFormPedido(false); setProductoPedido(''); setClientePedido(''); setPedidoError(null); }}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </form>
        )}

        {loadingPedidos ? (
          <p className="text-slate-500 py-4">Cargando pedidos...</p>
        ) : ultimosPedidos.length > 0 ? (
          <>
            {topNoTengo.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">
                  Top: lo que más te piden y no tenés
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {noTengoPaginacion.paginatedItems.map((item, i) => (
                    <div
                      key={item.producto}
                      className="flex items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-200 text-amber-800 font-bold">
                        {noTengoPaginacion.from + i}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-800">{item.producto}</div>
                        <div className="text-sm text-slate-500">
                          {item.veces} {item.veces === 1 ? 'pedido' : 'pedidos'}
                        </div>
                      </div>
                      <span className="rounded-full bg-amber-200/80 text-amber-800 px-2 py-1 text-xs font-medium">
                        Traer
                      </span>
                    </div>
                  ))}
                </div>
                <Paginacion
                  page={noTengoPaginacion.page}
                  totalPages={noTengoPaginacion.totalPages}
                  totalItems={noTengoPaginacion.totalItems}
                  from={noTengoPaginacion.from}
                  to={noTengoPaginacion.to}
                  onPageChange={noTengoPaginacion.setPage}
                />
              </div>
            )}
            <div>
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-2">
                Últimos pedidos
              </h3>
              <div className="overflow-x-auto rounded-2xl border border-slate-100 -mx-1 sm:mx-0">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="py-2 px-4 font-semibold text-slate-700">Producto</th>
                      <th className="py-2 px-4 font-semibold text-slate-700">Cliente</th>
                      <th className="py-2 px-4 font-semibold text-slate-700">Fecha</th>
                      <th className="py-2 px-4 font-semibold text-slate-700 text-center">Tenés</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidosPaginacion.paginatedItems.map((ped, idx) => {
                      const tiene = nombresEnCatalogo.includes(ped.producto);
                      return (
                        <tr key={ped.id || `${ped.producto}-${ped.fecha}-${idx}`} className="border-b border-slate-100 last:border-0">
                          <td className="py-2 px-4 font-medium text-slate-800">{ped.producto}</td>
                          <td className="py-2 px-4 text-slate-600">{ped.cliente}</td>
                          <td className="py-2 px-4 text-slate-500">{ped.fecha}</td>
                          <td className="py-2 px-4 text-center">
                            {tiene ? (
                              <span className="text-emerald-600 font-medium">Sí</span>
                            ) : (
                              <span className="text-amber-600 font-medium">No</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Paginacion
                page={pedidosPaginacion.page}
                totalPages={pedidosPaginacion.totalPages}
                totalItems={pedidosPaginacion.totalItems}
                from={pedidosPaginacion.from}
                to={pedidosPaginacion.to}
                onPageChange={pedidosPaginacion.setPage}
              />
            </div>
          </>
        ) : !loadingPedidos ? (
          <p className="text-slate-500 py-4">
            Todavía no hay pedidos anotados. Usá el botón <strong>Anotar lo que piden</strong> para cargar lo que te piden los clientes.
          </p>
        ) : null}
      </section>

      {/* Balance por mes — qué renovar */}
      <section className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 mb-1">Balance por mes</h2>
        <p className="text-slate-500 text-sm mb-4">
          Según la salida de cada mes, esto es lo que conviene renovar (ordenado por unidades vendidas).
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {ventasPorProductoPorMes.length === 0 && (
            <p className="text-slate-500 text-sm">Todavía no hay ventas registradas para mostrar balance.</p>
          )}
          {ventasPorProductoPorMes.map((m) => (
            <button
              key={m.mes}
              type="button"
              onClick={() => setMesBalance(m.mes)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                mesBalance === m.mes
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {m.mesLabel}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto rounded-2xl border border-slate-100 -mx-1 sm:mx-0">
          <table className="w-full min-w-[360px] text-left text-sm sm:text-base">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-3 px-4 font-semibold text-slate-700">Producto</th>
                <th className="py-3 px-4 font-semibold text-slate-700 text-right">Unidades vendidas</th>
                <th className="py-3 px-4 font-semibold text-slate-700 text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {aRenovar.map((p, i) => (
                <tr key={p.nombre} className="border-b border-slate-100 last:border-0">
                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-800">{p.nombre}</span>
                    {i === 0 && (
                      <span className="ml-2 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-semibold">
                        Mayor salida
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-slate-700">{p.unidades}</td>
                  <td className="py-3 px-4 text-right text-slate-600">{formatMoneda(p.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Lo que más salió (ranking total) */}
      <section className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 mb-1">Lo que más salió</h2>
        <p className="text-slate-500 text-sm mb-4">
          Ranking de productos por unidades vendidas (período total).
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {masVendidos.length === 0 && (
            <p className="text-slate-500 text-sm">Todavía no hay ventas registradas.</p>
          )}
          {masVendidos.map((p, i) => (
            <div
              key={p.nombre}
              className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-bold">
                {i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-slate-800">{p.nombre}</div>
                <div className="text-sm text-slate-500">
                  {p.unidades != null ? `${p.unidades} unidades` : ''} · {formatMoneda(p.ventas)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Catálogo */}
      <section>
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-800">Catálogo y precios</h2>
          <button
            type="button"
            onClick={iniciarNuevoProducto}
            className="w-full sm:w-auto rounded-xl bg-emerald-600 px-4 py-3 sm:py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Agregar producto
          </button>
        </div>
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
          <label className="block">
            <span className="block text-sm font-medium text-slate-600 mb-2">Buscar producto</span>
            <input
              type="search"
              value={busquedaCatalogo}
              onChange={(e) => setBusquedaCatalogo(e.target.value)}
              placeholder="Buscar por nombre, proveedor, teléfono u observación..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </label>
          {busquedaCatalogo && (
            <p className="mt-2 text-sm text-slate-500">
              {productosFiltrados.length} resultado{productosFiltrados.length === 1 ? '' : 's'} encontrado{productosFiltrados.length === 1 ? '' : 's'}.
            </p>
          )}
        </div>
        {productoError && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {productoError}
          </div>
        )}
        {mostrarFormProducto && (
          <form
            noValidate
            onSubmit={guardarProductoEditado}
            className="mb-6 rounded-3xl border border-emerald-200 bg-white p-4 sm:p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  {editandoProducto ? 'Editar producto' : 'Agregar producto'}
                </h3>
                <p className="text-sm text-slate-500">
                  {editandoProducto
                    ? 'Modificá los datos y guardá los cambios.'
                    : 'Registrá el producto y su primer ingreso de stock.'}
                </p>
              </div>
              <button
                type="button"
                onClick={cancelarEdicion}
                className="w-full sm:w-auto rounded-xl border border-slate-300 px-4 py-3 sm:py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="block sm:col-span-2 lg:col-span-3">
                <span className="block text-sm font-medium text-slate-600 mb-1">Nombre</span>
                <input
                  type="text"
                  value={formProducto.nombre}
                  onChange={(e) => {
                    const nombre = e.target.value;
                    setFormProducto((prev) => {
                      const kgDetectado = extraerKgDelNombre(nombre);
                      return {
                        ...prev,
                        nombre,
                        kgPorUnidad: kgDetectado > 0 ? String(kgDetectado) : prev.kgPorUnidad,
                      };
                    });
                  }}
                  placeholder="Nombre del producto (ej: Heno pelletizado)"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-600 mb-1">
                  {editandoProducto ? 'Stock disponible (opcional)' : (esUnidadPieza ? 'Cantidad en stock' : 'Cantidad comprada')}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={formProducto.cantidad}
                  onChange={(e) => setFormProducto((prev) => ({ ...prev, cantidad: e.target.value }))}
                  placeholder={esUnidadKg ? 'Ej: 0,5 (500 g), 1,25' : 'Ej: 12, 0,5, 1,25'}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  required={!editandoProducto}
                />
                {editandoProducto && (
                  <span className="mt-1 block text-xs text-slate-500">
                    Podés cambiar precio u otros datos sin tocar el stock. Corregilo acá solo si querés ajustar la cantidad (ej. 1,672 en lugar de 1,6722).
                  </span>
                )}
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-600 mb-1">Unidad</span>
                <select
                  value={formProducto.unidad}
                  onChange={(e) => setFormProducto((prev) => ({ ...prev, unidad: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="bolsas">Bolsas</option>
                  <option value="fardos">Fardos</option>
                  <option value="kg">Kg</option>
                  <option value="unidades">Unidades</option>
                </select>
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-600 mb-1">
                  {esUnidadKg
                    ? 'Costo por kg ($)'
                    : (costoDirecto ? 'Costo por unidad ($)' : 'Precio compra total ($)')}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={formProducto.precioCompra}
                  onChange={(e) => setFormProducto((prev) => ({ ...prev, precioCompra: e.target.value }))}
                  placeholder={esUnidadKg ? 'Ej: 500' : (esUnidadPieza ? 'Ej: 150' : 'Ej: 1500')}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </label>
              {!esUnidadPieza && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3">
                <span className="block text-sm font-medium text-emerald-800">
                  {esUnidadKg
                    ? 'Costo por kg'
                    : (editandoProducto ? 'Costo unitario' : 'Costo unitario calculado')}
                </span>
                <span className="mt-1 block text-lg font-bold text-emerald-900">
                  {formatMoneda(costoFormulario)}
                </span>
                <span className="text-xs text-emerald-700">
                  {esUnidadKg
                    ? 'Es el valor que cargaste arriba. Se usa para calcular el precio de venta al peso.'
                    : (editandoProducto ? 'Se usa para recalcular el precio de venta.' : 'Precio compra total dividido por cantidad.')}
                </span>
              </div>
              )}
              {esUnidadKg ? (
                <label className="block">
                  <span className="block text-sm font-medium text-slate-600 mb-1">% ganancia por kg</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formProducto.margenKg}
                    onChange={(e) => setFormProducto((prev) => ({ ...prev, margenKg: e.target.value }))}
                    placeholder="Ej: 30"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </label>
              ) : esUnidadPieza ? (
                <label className="block">
                  <span className="block text-sm font-medium text-slate-600 mb-1">% ganancia por unidad</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formProducto.margenBolsa}
                    onChange={(e) => setFormProducto((prev) => ({ ...prev, margenBolsa: e.target.value }))}
                    placeholder="Ej: 30"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </label>
              ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-sm font-medium text-slate-600 mb-1">
                    % ganancia por {etiquetaVentaUnidad(formProducto.unidad)}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formProducto.margenBolsa}
                    onChange={(e) => setFormProducto((prev) => ({ ...prev, margenBolsa: e.target.value }))}
                    placeholder="Ej: 30"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </label>
                <label className="block">
                  <span className="block text-sm font-medium text-slate-600 mb-1">% ganancia por kg suelto</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formProducto.margenKg}
                    onChange={(e) => setFormProducto((prev) => ({ ...prev, margenKg: e.target.value }))}
                    placeholder="Ej: 40"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </label>
              </div>
              )}
              {soportaVentaPorKg && (
                <>
                  <label className="block">
                    <span className="block text-sm font-medium text-slate-600 mb-1">Kg por unidad</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={formProducto.kgPorUnidad}
                      onChange={(e) => setFormProducto((prev) => ({ ...prev, kgPorUnidad: e.target.value }))}
                      placeholder="Ej: 20 (se detecta del nombre si dice x 20 kg)"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </label>
                  {kgPorUnidadForm > 0 && (
                    <>
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                        <span className="block text-sm font-medium text-slate-600">Costo por kg</span>
                        <span className="mt-1 block text-lg font-bold text-slate-800">
                          {formatMoneda(costoKgForm)}
                        </span>
                        <span className="text-xs text-slate-500">
                          Costo unitario ÷ {kgPorUnidadForm} kg
                        </span>
                      </div>
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3">
                        <span className="block text-sm font-medium text-emerald-800">Precio venta por kg (suelto)</span>
                        <span className="mt-1 block text-xl font-bold text-emerald-900">
                          {formatMoneda(precioVentaKgForm)}
                        </span>
                        <span className="text-xs text-emerald-700">
                          Costo por kg + {margenKgForm}% de ganancia
                        </span>
                      </div>
                    </>
                  )}
                </>
              )}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3">
                <span className="block text-sm font-medium text-emerald-800">
                  {esUnidadKg ? 'Precio de venta por kg' : 'Precio de venta calculado'}
                </span>
                <span className="mt-1 block text-xl font-bold text-emerald-900">
                  {formatMoneda(precioVentaFormulario)}
                </span>
                <span className="text-xs text-emerald-700">
                  {esUnidadKg
                    ? `Costo por kg + ${margenKgForm}% de ganancia.`
                    : esUnidadPieza
                      ? `Costo por unidad + ${margenBolsaForm}% de ganancia.`
                      : `Costo unitario + ${margenBolsaForm}% de ganancia por ${etiquetaVentaUnidad(formProducto.unidad)}.`}
                </span>
              </div>
              <label className="block">
                <span className="block text-sm font-medium text-slate-600 mb-1">Proveedor</span>
                <input
                  type="text"
                  value={formProducto.proveedor}
                  onChange={(e) => setFormProducto((prev) => ({ ...prev, proveedor: e.target.value }))}
                  placeholder="Ej: Forrajes del Sur"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-600 mb-1">Número de proveedor</span>
                <input
                  type="text"
                  value={formProducto.numeroProveedor}
                  onChange={(e) => setFormProducto((prev) => ({ ...prev, numeroProveedor: e.target.value }))}
                  placeholder="Ej: 0810-555-1234"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </label>
              <label className="block sm:col-span-2 lg:col-span-3">
                <span className="block text-sm font-medium text-slate-600 mb-1">Observación (opcional)</span>
                <textarea
                  value={formProducto.observacion}
                  onChange={(e) => setFormProducto((prev) => ({ ...prev, observacion: e.target.value }))}
                  placeholder="Ej: Proveedor X, lote 123"
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
                />
              </label>
              <label className="flex items-center gap-2 self-end rounded-xl border border-slate-200 px-3 py-2 text-slate-700">
                <input
                  type="checkbox"
                  checked={formProducto.favorito}
                  onChange={(e) => setFormProducto((prev) => ({ ...prev, favorito: e.target.checked }))}
                  className="h-4 w-4 accent-emerald-600"
                />
                Favorito
              </label>
            </div>

            <button
              type="submit"
              disabled={guardandoProducto}
              className="mt-5 w-full sm:w-auto rounded-xl bg-emerald-600 px-5 py-3 sm:py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {guardandoProducto ? 'Guardando...' : editandoProducto ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </form>
        )}
        {loading && <p className="text-slate-500">Cargando productos...</p>}
        {error && <p className="text-amber-700">{error}</p>}
        {!loading && !error && productos.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500">
            Todavía no hay productos. Usá el botón <strong>Agregar producto</strong> para cargar el primero.
          </div>
        )}
        {!loading && !error && productos.length > 0 && productosFiltrados.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500">
            No encontré productos para <strong>{busquedaCatalogo}</strong>.
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {catalogoPaginacion.paginatedItems.map((p) => (
            <div
              key={p.id}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3 min-w-0">
                <div className="min-w-0">
                  <div className="text-base sm:text-lg font-bold break-words">{p.name}</div>
                  <div className="text-slate-500 text-sm mt-1">{p.stock}</div>
                </div>
                {p.favorite ? (
                  <span className="rounded-full bg-amber-100 text-amber-700 px-3 py-1 text-xs font-semibold">
                    Favorito
                  </span>
                ) : null}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  {p.unidad === 'kg' ? 'Precio venta / kg' : 'Precio venta'}
                </span>
                <span className="text-xl font-bold">
                  {formatMoneda(p.price)}{p.unidad === 'kg' ? '/kg' : ''}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
                  <div className="text-xs text-slate-500">
                    {p.unidad === 'kg' ? 'Costo / kg' : 'Precio compra'}
                  </div>
                  <div className="mt-1 font-bold text-slate-800">
                    {p.precioCompra ? formatMoneda(p.precioCompra) : '—'}
                  </div>
                </div>
                <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3">
                  <div className="text-xs text-emerald-700">
                    {p.unidad === 'kg' ? '% ganancia / kg' : `% ganancia / ${etiquetaVentaUnidad(p.unidad)}`}
                  </div>
                  <div className="mt-1 font-bold text-emerald-800">
                    {formatearMargen(p.unidad === 'kg' ? p.margenKg : p.margenBolsa)}%
                  </div>
                </div>
              </div>
              {p.unidad !== 'kg' && p.unidad !== 'unidades' && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
                    <div className="text-xs text-slate-500">Venta suelta / kg</div>
                    <div className="mt-1 font-bold text-slate-800">
                      {p.precioKg > 0 ? `${formatMoneda(p.precioKg)}/kg` : '—'}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3">
                    <div className="text-xs text-emerald-700">% ganancia / kg suelto</div>
                    <div className="mt-1 font-bold text-emerald-800">
                      {formatearMargen(p.margenKg)}%
                    </div>
                  </div>
                </div>
              )}
              {(p.proveedor || p.numeroProveedor || p.observacion) && (
                <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-100 p-3 text-sm text-slate-600 space-y-1">
                  {p.proveedor && (
                    <div>
                      <span className="font-semibold text-slate-700">Proveedor:</span> {p.proveedor}
                    </div>
                  )}
                  {p.numeroProveedor && (
                    <div>
                      <span className="font-semibold text-slate-700">Teléfono:</span> {p.numeroProveedor}
                    </div>
                  )}
                  {p.observacion && (
                    <div>
                      <span className="font-semibold text-slate-700">Obs:</span> {p.observacion}
                    </div>
                  )}
                </div>
              )}
              <div className="mt-5 grid grid-cols-1 min-[380px]:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => iniciarEdicion(p)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-3 sm:py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => confirmarBorrado(p)}
                  className="rounded-xl bg-red-600 px-4 py-3 sm:py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Borrar
                </button>
              </div>
            </div>
          ))}
        </div>
        <Paginacion
          page={catalogoPaginacion.page}
          totalPages={catalogoPaginacion.totalPages}
          totalItems={catalogoPaginacion.totalItems}
          from={catalogoPaginacion.from}
          to={catalogoPaginacion.to}
          onPageChange={catalogoPaginacion.setPage}
        />
      </section>
    </div>
  );
}
