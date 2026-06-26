import { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Carrito from './Carrito';
import Paginacion from './Paginacion';
import { useStock } from '../context/StockContext';
import { useProductos } from '../context/ProductosContext';
import { crearVenta, listarPromos } from '../services/supabaseData';
import { usePagination } from '../hooks/usePagination';
import {
  calcularPrecioVenta,
  resolverMargenBolsa,
  resolverPrecioKgVenta,
} from '../utils/margenes';
import { buscarStockProducto } from '../utils/nombreProducto';
import {
  extraerKgDelNombre,
  stockUnidadesADisponibleKg,
  kgVendidosAUnidadesInventario,
} from '../utils/preciosKg';

const IconoBuscar = () => (
  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

function generarId() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parsePrecioStr(val) {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (typeof val === 'string') return parseInt(val.replace(/[^\d]/g, ''), 10) || 0;
  return 0;
}

function formatMoney(n) {
  return '$' + Math.round(n).toLocaleString('es-AR').replace(/,/g, '.');
}

function esFardo(stock) {
  return /fardo/i.test(stock || '');
}

function formatKgHuman(kg) {
  if (!Number.isFinite(kg) || kg <= 0) return '—';
  const g = kg * 1000;
  const kgStr = kg.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  if (kg < 1) {
    return `${Math.round(g)} g (${kgStr} kg)`;
  }
  return `${kgStr} kg`;
}

function lineTotalItem(item) {
  if (typeof item.subtotal === 'number' && !Number.isNaN(item.subtotal)) {
    return item.subtotal;
  }
  const c = Number(item.cantidad) || 0;
  const pu = parsePrecioStr(item.precioUnitario);
  return c * pu;
}

function aplicarDescuentoAItems(items, descuento) {
  if (!descuento || descuento <= 0) return items;
  const subtotal = items.reduce((sum, item) => sum + lineTotalItem(item), 0);
  if (subtotal <= 0) return items;
  const totalFinal = Math.max(0, subtotal - descuento);
  const factor = totalFinal / subtotal;
  const ajustados = items.map((item) => ({
    ...item,
    subtotal: redondearMonto(lineTotalItem(item) * factor),
  }));
  const suma = ajustados.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0);
  const diff = totalFinal - suma;
  if (diff !== 0 && ajustados.length > 0) {
    const ultimo = ajustados.length - 1;
    ajustados[ultimo] = {
      ...ajustados[ultimo],
      subtotal: redondearMonto((ajustados[ultimo].subtotal || 0) + diff),
    };
  }
  return ajustados;
}

function redondearMonto(n) {
  return Math.round(n * 100) / 100;
}

function formatDisponible(cantidad, unidad = 'unidades') {
  const n = Number(cantidad) || 0;
  if (unidad === 'kg') return formatKgHuman(n).replace('—', '0 kg');
  return `${n.toLocaleString('es-AR', { maximumFractionDigits: 3 })} ${unidad}`;
}

function textoDisponibleVenta(disponibleUnidades, unidad, kgPorUnidad) {
  const base = formatDisponible(disponibleUnidades, unidad);
  if (unidad === 'kg' || kgPorUnidad <= 0) return base;
  const kgDisp = stockUnidadesADisponibleKg(disponibleUnidades, unidad, kgPorUnidad);
  return `${base} · ${formatKgHuman(kgDisp)} suelto`;
}

function textoEquivalenciaGramos(kg) {
  if (!Number.isFinite(kg) || kg <= 0 || kg >= 1) return null;
  const gramos = Math.round(kg * 1000);
  const kgStr = kg.toLocaleString('es-AR', { maximumFractionDigits: 3 });
  return `${kgStr} kg (${gramos} g)`;
}

function resolverPrecioVenta(stock, producto) {
  const precioCompra = Number(stock.precioCompra) || Number(producto.precioCompra) || 0;
  const precioVentaGuardado = Number(stock.precioVenta) || parsePrecioStr(producto.price);
  const margenBolsa = resolverMargenBolsa(producto, precioCompra, precioVentaGuardado);
  return precioVentaGuardado || calcularPrecioVenta(precioCompra, margenBolsa);
}

export default function VentaRapida() {
  const { porProducto, setPorProducto } = useStock();
  const { productos, loading: loadingProductos, error: errorProductos } = useProductos();
  const [busqueda, setBusqueda] = useState('');
  const [carrito, setCarrito] = useState([]);
  const [mensaje, setMensaje] = useState(null);
  const [modalProducto, setModalProducto] = useState(null);
  const [modalModo, setModalModo] = useState(null);
  const [cantBolsas, setCantBolsas] = useState(1);
  const [kgInput, setKgInput] = useState('');
  const [pesosInput, setPesosInput] = useState('');
  const [procesandoVenta, setProcesandoVenta] = useState(false);
  const [promosGuardadas, setPromosGuardadas] = useState([]);

  const cerrarModal = useCallback(() => {
    setModalProducto(null);
    setModalModo(null);
    setCantBolsas(1);
    setKgInput('');
    setPesosInput('');
  }, []);

  useEffect(() => {
    if (!modalProducto) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [modalProducto]);

  useEffect(() => {
    let mounted = true;
    const cargarPromos = async () => {
      try {
        const rows = await listarPromos();
        if (mounted) setPromosGuardadas(rows);
      } catch (err) {
        console.warn('No se pudieron cargar promos desde Supabase.', err);
        if (mounted) setPromosGuardadas([]);
      }
    };
    cargarPromos();
    window.addEventListener('focus', cargarPromos);
    return () => {
      mounted = false;
      window.removeEventListener('focus', cargarPromos);
    };
  }, []);

  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return productos;
    return productos.filter(
      (p) => p.name.toLowerCase().includes(q) || p.stock.toLowerCase().includes(q)
    );
  }, [busqueda, productos]);

  const promosFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return promosGuardadas;
    return promosGuardadas.filter((promo) => promo.nombre.toLowerCase().includes(q));
  }, [busqueda, promosGuardadas]);

  const productosConStock = useMemo(() => {
    return productosFiltrados.map((producto) => {
      const stock = buscarStockProducto(porProducto, producto.name);
      const disponible = Math.max(0, (Number(stock.cantidadComprada) || 0) - (Number(stock.cantidadVendida) || 0));
      const precioVenta = resolverPrecioVenta(stock, producto);
      const precioCompra = Number(stock.precioCompra) || Number(producto.precioCompra) || 0;
      const precioKg = resolverPrecioKgVenta(producto, precioCompra, precioVenta);
      return {
        ...producto,
        disponible,
        price: precioVenta,
        precioKg,
      };
    });
  }, [productosFiltrados, porProducto]);

  const listaPaginacion = usePagination(productosConStock, {
    pageSize: 10,
    resetKey: busqueda,
  });

  const abrirModal = (p) => {
    setModalProducto(p);
    setModalModo(null);
    setCantBolsas(1);
    setKgInput('');
    setPesosInput('');
  };

  const agregarPromoAlCarrito = (promo) => {
    const precioPromo = Number(promo.precioPromo) || 0;
    if (precioPromo <= 0) return;
    setCarrito((prev) => {
      const existente = prev.find((item) => item.modoVenta === 'promo' && item.promoId === promo.id);
      if (existente) {
        return prev.map((item) =>
          item.id === existente.id
            ? {
                ...item,
                cantidad: item.cantidad + 1,
                subtotal: redondearMonto((item.cantidad + 1) * precioPromo),
                detalleTexto: `${item.cantidad + 1} promos × ${formatMoney(precioPromo)}`,
              }
            : item,
        );
      }
      return [
        ...prev,
        {
          id: generarId(),
          promoId: promo.id,
          nombre: `Promo: ${promo.nombre}`,
          modoVenta: 'promo',
          cantidad: 1,
          precioUnitario: precioPromo,
          subtotal: precioPromo,
          detalleTexto: `1 promo × ${formatMoney(precioPromo)}`,
        },
      ];
    });
  };

  const precioBolsa = modalProducto ? parsePrecioStr(modalProducto.price) : 0;
  const precioKg = modalProducto
    ? (Number(modalProducto.precioKg) || parsePrecioStr(modalProducto.price) || 0)
    : 0;
  const unidadProducto = modalProducto?.unidad || 'bolsas';
  const ventaPorKg = unidadProducto === 'kg';
  const etiquetaUnidad = unidadProducto === 'fardos' ? 'fardo' : unidadProducto === 'unidades' ? 'unidad' : 'bolsa';
  const etiquetaUnidadPlural = unidadProducto === 'fardos' ? 'fardos' : unidadProducto === 'unidades' ? 'unidades' : 'bolsas';
  const disponibleModal = Number(modalProducto?.disponible) || 0;
  const kgPorUnidadModal = modalProducto
    ? Number(modalProducto.kgPorUnidad) || extraerKgDelNombre(modalProducto.name) || 0
    : 0;
  const disponibleKgModal = modalProducto
    ? stockUnidadesADisponibleKg(disponibleModal, unidadProducto, kgPorUnidadModal)
    : 0;
  const mostrarVentaPorPeso = ventaPorKg || (precioKg > 0 && unidadProducto !== 'unidades');

  const confirmarAlCarrito = () => {
    if (!modalProducto || !modalModo) return;

    if (modalModo === 'bolsa') {
      const n = Math.max(1, Math.floor(cantBolsas));
      if (disponibleModal > 0 && n > disponibleModal) return;
      const subtotal = redondearMonto(n * precioBolsa);
      setCarrito((prev) => {
        const existente = prev.find(
          (i) =>
            i.nombre === modalProducto.name &&
            i.modoVenta === 'bolsa' &&
            parsePrecioStr(i.precioUnitario) === precioBolsa
        );
        if (existente) {
          return prev.map((i) =>
            i.id === existente.id
              ? {
                  ...i,
                  cantidad: i.cantidad + n,
                  subtotal: redondearMonto((i.cantidad + n) * precioBolsa),
                  stockDespues: Math.max(0, disponibleModal - (i.cantidad + n)),
                  detalleTexto: `${i.cantidad + n} ${i.unidadPlural || etiquetaUnidadPlural} × ${formatMoney(precioBolsa)}`,
                }
              : i
          );
        }
        return [
          ...prev,
          {
            id: generarId(),
            nombre: modalProducto.name,
            modoVenta: 'bolsa',
            cantidad: n,
            precioUnitario: precioBolsa,
            subtotal,
            unidadPlural: etiquetaUnidadPlural,
            unidadStock: unidadProducto,
            stockAntes: disponibleModal,
            stockDespues: Math.max(0, disponibleModal - n),
            detalleTexto: `${n} ${etiquetaUnidadPlural} × ${formatMoney(precioBolsa)}`,
          },
        ];
      });
      cerrarModal();
      return;
    }

    if (modalModo === 'kilo') {
      const kg = parseFloat(String(kgInput).replace(',', '.')) || 0;
      if (kg < 0.001 || precioKg <= 0) return;
      if (disponibleKgModal > 0 && kg > disponibleKgModal) return;
      const subtotal = redondearMonto(kg * precioKg);
      setCarrito((prev) => [
        ...prev,
        {
          id: generarId(),
          nombre: modalProducto.name,
          modoVenta: 'kilo',
          kg,
          precioKg,
          subtotal,
          unidadInventario: unidadProducto,
          kgPorUnidad: kgPorUnidadModal,
          unidadStock: 'kg',
          stockAntes: disponibleKgModal,
          stockDespues: Math.max(0, disponibleKgModal - kg),
          detalleTexto: `${formatKgHuman(kg)} × ${formatMoney(precioKg)}/kg`,
        },
      ]);
      cerrarModal();
      return;
    }

    if (modalModo === 'pesos') {
      const monto =
        parseFloat(String(pesosInput).replace(/\./g, '').replace(',', '.')) ||
        parseFloat(String(pesosInput).replace(',', '.')) ||
        0;
      if (monto <= 0 || precioKg <= 0) return;
      const kg = monto / precioKg;
      if (disponibleKgModal > 0 && kg > disponibleKgModal) return;
      setCarrito((prev) => [
        ...prev,
        {
          id: generarId(),
          nombre: modalProducto.name,
          modoVenta: 'pesos',
          montoPesos: redondearMonto(monto),
          precioKg,
          kgPorPesos: kg,
          subtotal: redondearMonto(monto),
          unidadInventario: unidadProducto,
          kgPorUnidad: kgPorUnidadModal,
          unidadStock: 'kg',
          stockAntes: disponibleKgModal,
          stockDespues: Math.max(0, disponibleKgModal - kg),
          detalleTexto: `${formatMoney(monto)} → ${formatKgHuman(kg)}`,
        },
      ]);
      cerrarModal();
    }
  };

  const editarCarritoItem = useCallback((id, updates) => {
    setCarrito((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        if (i.modoVenta === 'kilo' && updates.kg != null) {
          const kg = Math.max(0.001, Number(updates.kg));
          const pk = Number(i.precioKg) || 0;
          const subtotal = redondearMonto(kg * pk);
          const stockAntes = Number(i.stockAntes) || 0;
          return {
            ...i,
            kg,
            subtotal,
            stockDespues: Math.max(0, stockAntes - kg),
            detalleTexto: `${formatKgHuman(kg)} × ${formatMoney(pk)}/kg`,
          };
        }
        if (i.modoVenta === 'pesos' && updates.montoPesos != null) {
          const monto = Math.max(1, redondearMonto(Number(updates.montoPesos)));
          const pk = Number(i.precioKg) || 0;
          const kg = monto / pk;
          const stockAntes = Number(i.stockAntes) || 0;
          return {
            ...i,
            montoPesos: monto,
            kgPorPesos: kg,
            subtotal: monto,
            stockDespues: Math.max(0, stockAntes - kg),
            detalleTexto: `${formatMoney(monto)} → ${formatKgHuman(kg)}`,
          };
        }
        return i;
      })
    );
  }, []);

  const borrarDelCarrito = (id) => {
    setCarrito((prev) => prev.filter((i) => i.id !== id));
  };

  const editarCantidad = (id, nuevaCantidad) => {
    if (nuevaCantidad < 1) {
      borrarDelCarrito(id);
      return;
    }
    setCarrito((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        if (i.modoVenta === 'kilo' || i.modoVenta === 'pesos') return i;
        const pu = parsePrecioStr(i.precioUnitario);
        const nextSubtotal = redondearMonto(nuevaCantidad * pu);
        if (i.modoVenta === 'bolsa' || i.modoVenta === 'promo') {
          return {
            ...i,
            cantidad: nuevaCantidad,
            subtotal: nextSubtotal,
            detalleTexto: i.modoVenta === 'promo'
              ? `${nuevaCantidad} promos × ${formatMoney(pu)}`
              : `${nuevaCantidad} ${i.unidadPlural || 'bolsas'} × ${formatMoney(pu)}`,
          };
        }
        return { ...i, cantidad: nuevaCantidad };
      })
    );
  };

  const procesarVenta = async ({
    cliente,
    metodoPago,
    items,
    descuentoNumerico = 0,
    totalNumerico,
  } = {}) => {
    if (carrito.length === 0 || procesandoVenta) return;
    const itemsBase = items || carrito;
    const ventaItems = aplicarDescuentoAItems(itemsBase, descuentoNumerico);
    const totalFinal =
      totalNumerico ??
      ventaItems.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0);
    setProcesandoVenta(true);
    try {
      await crearVenta({
        cliente,
        metodoPago,
        items: ventaItems,
        total: totalFinal,
      });
      setPorProducto((prev) => {
        const next = { ...prev };
        ventaItems.forEach((item) => {
          if (item.modoVenta === 'promo') return;
          let vendido = 0;
          if (item.modoVenta === 'bolsa') {
            vendido = Number(item.cantidad) || 0;
          } else {
            const kg = Number(item.kg) || Number(item.kgPorPesos) || 0;
            vendido = kgVendidosAUnidadesInventario(
              kg,
              item.unidadInventario || 'kg',
              item.kgPorUnidad || extraerKgDelNombre(item.nombre),
            );
          }
          if (!item.nombre || vendido <= 0) return;
          const actual = next[item.nombre] || {
            cantidadComprada: 0,
            cantidadVendida: 0,
            precioCompra: 0,
            precioVenta: Number(item.precioUnitario) || 0,
          };
          next[item.nombre] = {
            ...actual,
            cantidadVendida: (Number(actual.cantidadVendida) || 0) + vendido,
          };
        });
        return next;
      });
      setCarrito([]);
      setMensaje('Venta registrada en Supabase.');
    } catch (err) {
      console.warn('No se pudo guardar la venta en Supabase.', err);
      setMensaje('No se pudo guardar la venta en Supabase. Revisá que el schema esté aplicado.');
    } finally {
      setProcesandoVenta(false);
      setTimeout(() => setMensaje(null), 3500);
    }
  };

  const kgNum = parseFloat(String(kgInput).replace(',', '.')) || 0;
  const cobrarKilo = precioKg > 0 && kgNum >= 0.001 ? redondearMonto(kgNum * precioKg) : 0;
  const pesosNum =
    parseFloat(String(pesosInput).replace(/\./g, '').replace(',', '.')) ||
    parseFloat(String(pesosInput).replace(',', '.')) ||
    0;
  const kgPorPesos = precioKg > 0 && pesosNum > 0 ? pesosNum / precioKg : 0;

  const puedeConfirmarBolsa = modalModo === 'bolsa' && cantBolsas >= 1 && (disponibleModal <= 0 || cantBolsas <= disponibleModal);
  const puedeConfirmarKilo = modalModo === 'kilo' && kgNum >= 0.001 && precioKg > 0 && (disponibleKgModal <= 0 || kgNum <= disponibleKgModal);
  const puedeConfirmarPesos = modalModo === 'pesos' && pesosNum > 0 && precioKg > 0 && (disponibleKgModal <= 0 || kgPorPesos <= disponibleKgModal);
  const equivalenciaGramos = textoEquivalenciaGramos(kgNum);

  const modalContenido =
    modalProducto &&
    createPortal(
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] bg-black/50 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="venta-modal-titulo"
        onClick={(e) => {
          if (e.target === e.currentTarget) cerrarModal();
        }}
      >
        <div
          className="w-full max-w-md max-h-[min(90dvh,32rem)] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-200 p-4 sm:p-6 mx-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <h3 id="venta-modal-titulo" className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                {modalProducto.name}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {ventaPorKg
                  ? `${formatMoney(precioKg)} / kg`
                  : `${formatMoney(precioBolsa)} / ${etiquetaUnidad}${precioKg > 0 && unidadProducto !== 'unidades' ? ` · ${formatMoney(precioKg)}/kg suelto` : ''}`}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Disponible: {textoDisponibleVenta(disponibleModal, unidadProducto, kgPorUnidadModal)}
              </p>
            </div>
            <button
              type="button"
              onClick={cerrarModal}
              className="shrink-0 rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Cerrar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {!modalModo && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700 mb-3">¿Cómo vendés?</p>
              {!ventaPorKg && (
                <button
                type="button"
                onClick={() => setModalModo('bolsa')}
                className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 py-3 px-4 text-left font-semibold text-slate-800 hover:border-emerald-400 hover:bg-emerald-50/50 transition touch-manipulation"
              >
                Por {etiquetaUnidad} ({etiquetaUnidadPlural})
              </button>
              )}
              {mostrarVentaPorPeso && (
                <>
                  <button
                    type="button"
                    onClick={() => setModalModo('kilo')}
                    className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 py-3 px-4 text-left font-semibold text-slate-800 hover:border-emerald-400 hover:bg-emerald-50/50 transition touch-manipulation"
                  >
                    Por kilo (cobrás según peso)
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalModo('pesos')}
                    className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 py-3 px-4 text-left font-semibold text-slate-800 hover:border-emerald-400 hover:bg-emerald-50/50 transition touch-manipulation"
                  >
                    Por monto ($) (le das el peso que corresponde)
                  </button>
                </>
              )}
            </div>
          )}

          {modalModo === 'bolsa' && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setModalModo(null)}
                className="text-sm text-emerald-700 font-medium hover:underline"
              >
                ← Cambiar tipo de venta
              </button>
              <label className="block">
                <span className="text-sm font-medium text-slate-600">Cantidad de {etiquetaUnidadPlural}</span>
                <div className="mt-2 flex items-center gap-3">
                  <button
                    type="button"
                    className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-700 hover:bg-slate-50 touch-manipulation"
                    onClick={() => setCantBolsas((c) => Math.max(1, c - 1))}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={cantBolsas}
                    onChange={(e) => setCantBolsas(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-20 text-center rounded-xl border border-slate-200 py-2 font-semibold"
                  />
                  <button
                    type="button"
                    className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-700 hover:bg-slate-50 touch-manipulation"
                    onClick={() => setCantBolsas((c) => c + 1)}
                  >
                    +
                  </button>
                </div>
              </label>
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-900">
                <span className="text-sm font-medium">Total a cobrar</span>
                <div className="text-xl font-bold">{formatMoney(cantBolsas * precioBolsa)}</div>
                <p className="text-xs mt-1 opacity-90">
                  Quedaría: {formatDisponible(Math.max(0, disponibleModal - cantBolsas), unidadProducto)}
                </p>
              </div>
              <button
                type="button"
                disabled={!puedeConfirmarBolsa}
                onClick={confirmarAlCarrito}
                className="w-full rounded-xl bg-emerald-600 text-white py-3 font-semibold hover:bg-emerald-700 disabled:opacity-50 touch-manipulation"
              >
                Agregar al carrito
              </button>
            </div>
          )}

          {modalModo === 'kilo' && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setModalModo(null)}
                className="text-sm text-emerald-700 font-medium hover:underline"
              >
                ← Cambiar tipo de venta
              </button>
              <label className="block">
                <span className="text-sm font-medium text-slate-600">Kilos que llevá</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={kgInput}
                  onChange={(e) => setKgInput(e.target.value)}
                  placeholder="Ej: 0,1 (100 g) o 1,25"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 focus:ring-2 focus:ring-emerald-500/30"
                />
              </label>
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-900">
                <span className="text-sm font-medium">Cobrar</span>
                <div className="text-xl font-bold">{kgNum >= 0.001 ? formatMoney(cobrarKilo) : '—'}</div>
                <p className="text-xs mt-1 opacity-90">{formatMoney(precioKg)} por kg</p>
                {equivalenciaGramos && (
                  <p className="text-xs mt-1 opacity-90">
                    {equivalenciaGramos} → {formatMoney(cobrarKilo)}
                  </p>
                )}
                <p className="text-xs mt-1 opacity-90">
                  Quedaría: {formatKgHuman(Math.max(0, disponibleKgModal - kgNum))}
                </p>
              </div>
              <button
                type="button"
                disabled={!puedeConfirmarKilo}
                onClick={confirmarAlCarrito}
                className="w-full rounded-xl bg-emerald-600 text-white py-3 font-semibold hover:bg-emerald-700 disabled:opacity-50 touch-manipulation"
              >
                Agregar al carrito
              </button>
            </div>
          )}

          {modalModo === 'pesos' && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setModalModo(null)}
                className="text-sm text-emerald-700 font-medium hover:underline"
              >
                ← Cambiar tipo de venta
              </button>
              <label className="block">
                <span className="text-sm font-medium text-slate-600">Cuánta plata quiere gastar</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={pesosInput}
                  onChange={(e) => setPesosInput(e.target.value)}
                  placeholder="Ej: 1200"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 focus:ring-2 focus:ring-emerald-500/30"
                />
              </label>
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-amber-950">
                <span className="text-sm font-medium">Le tenés que dar</span>
                <div className="text-lg font-bold mt-1">
                  {pesosNum > 0 && precioKg > 0 ? formatKgHuman(kgPorPesos) : '—'}
                </div>
                <p className="text-xs mt-2 opacity-90">Cobrás {pesosNum > 0 ? formatMoney(pesosNum) : '—'}</p>
                <p className="text-xs mt-1 opacity-90">
                  Quedaría: {formatKgHuman(Math.max(0, disponibleKgModal - kgPorPesos))}
                </p>
              </div>
              <button
                type="button"
                disabled={!puedeConfirmarPesos}
                onClick={confirmarAlCarrito}
                className="w-full rounded-xl bg-emerald-600 text-white py-3 font-semibold hover:bg-emerald-700 disabled:opacity-50 touch-manipulation"
              >
                Agregar al carrito
              </button>
            </div>
          )}
        </div>
      </div>,
      document.body
    );

  return (
    <>
      {modalContenido}
      {mensaje && (
        <div className="mb-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 text-sm font-semibold">
          {mensaje}
        </div>
      )}
      <div className="rounded-2xl sm:rounded-[28px] bg-white border border-slate-200 shadow-lg overflow-x-hidden">
        <div className="p-3 sm:p-6 flex flex-col lg:grid lg:grid-cols-[1.2fr_0.9fr] gap-5 lg:gap-8 min-h-0 lg:min-h-[520px]">
          <div className={`flex flex-col min-h-0 ${carrito.length > 0 ? 'order-2' : 'order-1'} lg:order-1`}>
          <div className="mb-3 sm:mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Punto de Venta</h2>
            <p className="text-slate-500 mt-1 text-sm sm:text-base">
              Tocá un producto: bolsa/fardo, kilo o monto fijo en pesos.
            </p>
          </div>

          <div className="relative mb-4 sm:mb-6">
            <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2">
              <IconoBuscar />
            </span>
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar productos..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 sm:py-3.5 pl-10 sm:pl-12 pr-4 text-slate-800 text-sm sm:text-base placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 focus:bg-white transition"
            />
          </div>

          <div className={`flex-1 overflow-auto rounded-xl border border-slate-100 bg-slate-50/50 min-h-[180px] sm:min-h-[220px] ${carrito.length > 0 ? 'max-h-[38dvh]' : 'max-h-[55dvh]'} lg:max-h-none`}>
            {loadingProductos ? (
              <p className="text-slate-400 text-center py-6 sm:py-8 text-sm sm:text-base">Cargando productos...</p>
            ) : errorProductos ? (
              <p className="text-amber-700 text-center py-6 sm:py-8 text-sm sm:text-base">{errorProductos}</p>
            ) : productosFiltrados.length === 0 && promosFiltradas.length === 0 ? (
              <p className="text-slate-400 text-center py-6 sm:py-8 text-sm sm:text-base">Todavía no hay productos ni promos para mostrar.</p>
            ) : (
              <>
              <ul className="p-2 space-y-1">
                {promosFiltradas.map((promo) => (
                  <li key={promo.id}>
                    <button
                      type="button"
                      onClick={() => agregarPromoAlCarrito(promo)}
                      className="w-full rounded-xl border border-amber-200 bg-amber-50 p-4 text-left flex items-center justify-between gap-3 sm:gap-4 hover:bg-amber-100 transition touch-manipulation"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 text-sm sm:text-base truncate">
                          Promo: {promo.nombre}
                        </div>
                        <div className="text-xs sm:text-sm text-amber-800">
                          {promo.items?.length || 0} producto{promo.items?.length === 1 ? '' : 's'} · Ganancia {formatMoney(promo.gananciaPromo)}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Normal {formatMoney(promo.precioNormalTotal)} · Promo {formatMoney(promo.precioPromo)}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs text-amber-700 font-semibold">Agregar</span>
                      </div>
                    </button>
                  </li>
                ))}
                {listaPaginacion.paginatedItems.map((p) => {
                  const pb = parsePrecioStr(p.price);
                  const pk = p.unidad === 'kg'
                    ? (Number(p.precioKg) || pb)
                    : p.unidad === 'unidades'
                      ? 0
                      : (Number(p.precioKg) || resolverPrecioKgVenta(p, p.precioCompra, pb));
                  const fardo = esFardo(p.stock);
                  return (
                    <li key={p.name}>
                      <button
                        type="button"
                        onClick={() => abrirModal(p)}
                        className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left flex items-center justify-between gap-3 sm:gap-4 hover:bg-emerald-50 hover:border-emerald-200 transition touch-manipulation"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800 text-sm sm:text-base truncate">{p.name}</div>
                          <div className="text-xs sm:text-sm text-slate-500">
                            Disponible: {formatDisponible(p.disponible, p.unidad)}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {p.unidad === 'kg'
                              ? `${formatMoney(pk)}/kg`
                              : `${formatMoney(pb)}/${p.unidad === 'unidades' ? 'unidad' : fardo ? 'fardo' : 'bolsa'}${pk > 0 && p.unidad !== 'unidades' ? ` · ${formatMoney(pk)}/kg` : ''}`}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs text-emerald-600 font-semibold">Vender</span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <Paginacion
                page={listaPaginacion.page}
                totalPages={listaPaginacion.totalPages}
                totalItems={listaPaginacion.totalItems}
                from={listaPaginacion.from}
                to={listaPaginacion.to}
                onPageChange={listaPaginacion.setPage}
                className="px-2 pb-2 mt-0 pt-3"
              />
              </>
            )}
          </div>
        </div>

        <div className={`lg:min-h-0 shrink-0 lg:shrink ${carrito.length > 0 ? 'order-1' : 'order-2'} lg:order-2`}>
          <Carrito
            items={carrito}
            permitirDescuento
            procesando={procesandoVenta}
            onProcesarVenta={procesarVenta}
            onBorrar={borrarDelCarrito}
            onEditarCantidad={editarCantidad}
            onEditarCarritoItem={editarCarritoItem}
          />
        </div>
        </div>
      </div>
    </>
  );
}
