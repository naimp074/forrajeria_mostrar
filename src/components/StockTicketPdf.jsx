import { useMemo, useRef, useState } from 'react';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { useProductos } from '../context/ProductosContext';
import { calcularPrecioVenta, MARGEN_DEFAULT } from '../utils/margenes';
import { calcularPrecioVentaKg, extraerKgDelNombre, parseNumeroFlexible } from '../utils/preciosKg';
import { normalizarNombreProducto } from '../utils/nombreProducto';

let pdfjsPromise = null;

async function cargarPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
      return mod;
    });
  }
  return pdfjsPromise;
}

const ESTADOS = {
  existente: {
    label: 'Existe',
    className: 'bg-emerald-100 text-emerald-700',
  },
  revisar: {
    label: 'Revisar',
    className: 'bg-amber-100 text-amber-800',
  },
  nuevo: {
    label: 'Nuevo',
    className: 'bg-slate-100 text-slate-700',
  },
};

const LINEAS_IGNORADAS = [
  /^=+$/,
  /^-+\s*\d+\s+of\s+\d+\s*-+$/i,
  /^cant\.?\s+descripcion\s+precio\s+importe$/i,
  /^cajero\b/i,
  /^folio\b/i,
  /^firma\b/i,
  /^_{3,}$/,
  /^gracias\b/i,
  /^www\./i,
  /^insta\b/i,
  /^dis\.?tribuidor/i,
  /^la tienda\b/i,
  /^venta a credito/i,
];

const LINEAS_FIN = [
  /^no\.?\s+de\s+articulos\b/i,
  /^total\b/i,
  /^\*\s*venta\b/i,
];

const CORRECCIONES_DESCRIPCION = [
  [/\bARGENT\s+INA\b/gi, 'ARGENTINA'],
  [/\bSAC\s+A\b/gi, 'SACA'],
  [/\bFU\s+TBOL\b/gi, 'FUTBOL'],
  [/\bPOL\s+AR\b/gi, 'POLAR'],
  [/\bDOB\s+LE\b/gi, 'DOBLE'],
  [/\bEXTE\s+NSIBLE\b/gi, 'EXTENSIBLE'],
  [/\bIMP\s+ERMEABLE\b/gi, 'IMPERMEABLE'],
  [/\bAG\s+LUTINANT\s+ES\b/gi, 'AGLUTINANTES'],
];

function formatMoneda(n) {
  return '$' + Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 }).replace(/,/g, '.');
}

function etiquetaUnidad(unidad) {
  if (unidad === 'bolsas') return 'bolsa';
  if (unidad === 'fardos') return 'fardo';
  if (unidad === 'kg') return 'kg';
  return 'unidad';
}

function margenFila(fila) {
  const texto = String(fila?.margenPorcentaje ?? '').trim();
  if (!texto) return MARGEN_DEFAULT;
  const margen = parseNumeroFlexible(texto);
  return Number.isFinite(margen) && margen >= 0 ? margen : MARGEN_DEFAULT;
}

function kgPorUnidadFila(fila) {
  return parseNumeroFlexible(fila?.kgPorUnidad) || extraerKgDelNombre(fila?.productoFinal) || 0;
}

function precioVentaFila(fila) {
  return calcularPrecioVenta(parseNumeroFlexible(fila?.precioCompra), margenFila(fila));
}

function calcularVistaVenta(fila) {
  const costo = parseNumeroFlexible(fila?.precioCompra);
  const margen = margenFila(fila);
  const unidad = fila?.unidad || 'unidades';
  const precioUnidad = precioVentaFila(fila);
  const kgPorUnidad = kgPorUnidadFila(fila);
  const etiqueta = etiquetaUnidad(unidad);

  if (unidad === 'kg') {
    return {
      titulo: 'Venta al peso',
      principal: { label: 'Precio venta por kg', value: precioUnidad },
      detalles: [
        { label: 'Precio cada 100 g', value: precioUnidad / 10 },
        { label: 'Costo por kg', value: costo },
      ],
      nota: `Costo + ${margen}% de ganancia.`,
    };
  }

  const detalles = [
    { label: `Costo por ${etiqueta}`, value: costo },
  ];

  if (kgPorUnidad > 0 && unidad !== 'unidades') {
    const precioKg = calcularPrecioVentaKg(costo, kgPorUnidad, margen);
    detalles.push(
      { label: 'Precio suelto por kg', value: precioKg },
      { label: 'Precio suelto cada 100 g', value: precioKg / 10 },
    );
  }

  return {
    titulo: `Venta por ${etiqueta}`,
    principal: { label: `Precio venta por ${etiqueta}`, value: precioUnidad },
    detalles,
    nota: kgPorUnidad > 0 && unidad !== 'unidades'
      ? `${kgPorUnidad} kg por ${etiqueta}. Costo + ${margen}% de ganancia.`
      : `Costo + ${margen}% de ganancia.`,
  };
}

function crearId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizarComparacion(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\bN[°ºO.]?\s*(\d+)/g, 'N$1')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function tokensComparacion(valor) {
  return normalizarComparacion(valor)
    .split(' ')
    .filter((token) => token.length > 1 || /\d/.test(token));
}

function distanciaLevenshtein(a, b) {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const curr = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + costo,
      );
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }

  return prev[b.length];
}

function puntuarCoincidencia(nombreTicket, producto) {
  const a = normalizarComparacion(nombreTicket);
  const b = normalizarComparacion(producto?.name);
  if (!a || !b) return 0;
  if (a === b) return 1;

  const contiene = a.includes(b) || b.includes(a);
  const tokensA = tokensComparacion(a);
  const tokensB = tokensComparacion(b);
  const setA = new Set(tokensA);
  const comunes = tokensB.filter((token) => setA.has(token)).length;
  const tokenScore = Math.max(tokensA.length, tokensB.length) > 0
    ? comunes / Math.max(tokensA.length, tokensB.length)
    : 0;
  const maxLen = Math.max(a.length, b.length);
  const charScore = maxLen > 0 ? 1 - distanciaLevenshtein(a, b) / maxLen : 0;

  return Math.max(contiene ? 0.9 : 0, tokenScore, charScore * 0.9);
}

function buscarMejorProducto(nombre, productos) {
  let mejor = null;
  let mejorScore = 0;

  productos.forEach((producto) => {
    const score = puntuarCoincidencia(nombre, producto);
    if (score > mejorScore) {
      mejor = producto;
      mejorScore = score;
    }
  });

  return { producto: mejor, score: mejorScore };
}

function limpiarDescripcion(parts) {
  let texto = parts
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  CORRECCIONES_DESCRIPCION.forEach(([regex, reemplazo]) => {
    texto = texto.replace(regex, reemplazo);
  });

  return texto
    .replace(/\bN[°ºO.]?\s*(\d+)/gi, 'N$1')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseLineaItem(linea) {
  const texto = String(linea || '').trim();
  const match = texto.match(/^(\d+(?:[,.]\d+)?)\s+(.+?)\s+\$?\s*([\d.,]+)\s+\$?\s*([\d.,]+)\s*$/);
  if (!match) return null;

  const cantidad = parseNumeroFlexible(match[1]);
  const precioUnitario = parseNumeroFlexible(match[3]);
  const importe = parseNumeroFlexible(match[4]);
  if (cantidad <= 0 || precioUnitario <= 0) return null;

  return {
    cantidad,
    descripcion: match[2].trim(),
    precioUnitario,
    importe,
  };
}

function esLineaIgnorada(linea) {
  const texto = String(linea || '').trim();
  if (!texto) return true;
  return LINEAS_IGNORADAS.some((regex) => regex.test(texto));
}

function esLineaFin(linea) {
  const texto = String(linea || '').trim();
  return LINEAS_FIN.some((regex) => regex.test(texto));
}

function parsearTicketTexto(texto) {
  const lineas = String(texto || '')
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter(Boolean);

  const items = [];
  let actual = null;
  let dentroDetalle = false;

  const cerrarActual = () => {
    if (!actual) return;
    const producto = limpiarDescripcion(actual.parts);
    if (producto) {
      items.push({
        producto,
        cantidad: actual.cantidad,
        precioCompra: actual.precioUnitario,
        importe: actual.importe,
      });
    }
    actual = null;
  };

  for (const linea of lineas) {
    if (esLineaFin(linea)) {
      cerrarActual();
      break;
    }

    if (esLineaIgnorada(linea)) continue;

    if (/cant/i.test(linea) && /precio/i.test(linea) && /importe/i.test(linea)) {
      dentroDetalle = true;
      continue;
    }

    const item = parseLineaItem(linea);
    if (item) {
      dentroDetalle = true;
      cerrarActual();
      actual = {
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        importe: item.importe,
        parts: [item.descripcion],
      };
      continue;
    }

    if (actual && dentroDetalle && !/^\$?[\d.,]+$/.test(linea)) {
      actual.parts.push(linea);
    }
  }

  cerrarActual();
  return items;
}

async function extraerTextoPdf(file) {
  const pdfjsLib = await cargarPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const paginas = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const rawItems = content.items
      .filter((item) => String(item.str || '').trim())
      .map((item) => ({
        text: String(item.str || '').trim(),
        x: item.transform[4],
        y: item.transform[5],
      }))
      .sort((a, b) => {
        if (Math.abs(b.y - a.y) > 2) return b.y - a.y;
        return a.x - b.x;
      });

    const groups = [];
    rawItems.forEach((item) => {
      const group = groups.find((g) => Math.abs(g.y - item.y) <= 2);
      if (group) {
        group.items.push(item);
        group.y = (group.y + item.y) / 2;
      } else {
        groups.push({ y: item.y, items: [item] });
      }
    });

    const lines = groups
      .sort((a, b) => b.y - a.y)
      .map((group) => group.items.sort((a, b) => a.x - b.x).map((item) => item.text).join(' '))
      .filter(Boolean);

    paginas.push(lines.join('\n'));
  }

  return paginas.join('\n');
}

async function extraerTextoArchivo(file) {
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
    return extraerTextoPdf(file);
  }
  return file.text();
}

function crearFilaDesdeItem(item, productos) {
  const { producto, score } = buscarMejorProducto(item.producto, productos);
  const estado = score >= 0.88 ? 'existente' : score >= 0.62 ? 'revisar' : 'nuevo';
  const productoFinal = estado === 'nuevo' ? item.producto : producto?.name || item.producto;
  const margen = Number(producto?.margenBolsa ?? MARGEN_DEFAULT);
  const precioCompra = Number(item.precioCompra) || 0;
  const precioVenta = calcularPrecioVenta(precioCompra, margen);
  const kgPorUnidad = Number(producto?.kgPorUnidad) || extraerKgDelNombre(productoFinal) || '';

  return {
    id: crearId(),
    incluir: true,
    estado,
    productoTicket: item.producto,
    productoFinal,
    productoMatch: producto?.name || '',
    confianza: score,
    cantidad: String(item.cantidad),
    precioCompra: String(precioCompra),
    margenPorcentaje: String(margen),
    precioVenta: String(precioVenta),
    kgPorUnidad: kgPorUnidad ? String(kgPorUnidad) : '',
    importe: item.importe,
    unidad: producto?.unidad || 'unidades',
    proveedor: '',
    numeroProveedor: '',
    observacion: 'Importado desde ticket/PDF',
  };
}

function estadoDesdeFila(row, productos) {
  const existeExacto = productos.some((producto) => normalizarComparacion(producto.name) === normalizarComparacion(row.productoFinal));
  if (existeExacto) return 'existente';
  if (row.productoMatch && normalizarComparacion(row.productoMatch) !== normalizarComparacion(row.productoFinal)) return 'revisar';
  return row.estado === 'existente' ? 'existente' : 'nuevo';
}

export default function StockTicketPdf({ onRegistrarIngreso }) {
  const { productos } = useProductos();
  const inputRef = useRef(null);
  const [filas, setFilas] = useState([]);
  const [archivoNombre, setArchivoNombre] = useState('');
  const [proveedorGlobal, setProveedorGlobal] = useState('');
  const [numeroProveedorGlobal, setNumeroProveedorGlobal] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [leyendo, setLeyendo] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const resumen = useMemo(() => {
    return filas.reduce((acc, fila) => {
      if (!fila.incluir) return acc;
      const estado = estadoDesdeFila(fila, productos);
      acc.total += 1;
      acc[estado] = (acc[estado] || 0) + 1;
      return acc;
    }, { total: 0, existente: 0, revisar: 0, nuevo: 0 });
  }, [filas, productos]);

  const productosOrdenados = useMemo(
    () => [...productos].sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [productos],
  );

  const actualizarFila = (id, cambios) => {
    setFilas((prev) => prev.map((fila) => {
      if (fila.id !== id) return fila;
      const next = { ...fila, ...cambios };

      if (Object.prototype.hasOwnProperty.call(cambios, 'productoFinal')) {
        const producto = productos.find((p) => p.name === cambios.productoFinal);
        if (producto) {
          next.productoMatch = producto.name;
          next.estado = 'existente';
          next.unidad = producto.unidad || next.unidad;
          next.kgPorUnidad = producto.kgPorUnidad
            ? String(producto.kgPorUnidad)
            : String(extraerKgDelNombre(producto.name) || '');
          next.margenPorcentaje = String(producto.margenBolsa ?? MARGEN_DEFAULT);
          next.precioVenta = String(precioVentaFila(next));
        } else {
          next.productoMatch = '';
          next.estado = 'nuevo';
          next.kgPorUnidad = String(extraerKgDelNombre(next.productoFinal) || '');
        }
      }

      if (
        Object.prototype.hasOwnProperty.call(cambios, 'precioCompra')
        || Object.prototype.hasOwnProperty.call(cambios, 'margenPorcentaje')
      ) {
        next.precioVenta = String(precioVentaFila(next));
      }

      return next;
    }));
  };

  const leerArchivo = async (file) => {
    setLeyendo(true);
    setError('');
    setMensaje('');
    setArchivoNombre(file.name);

    try {
      const texto = await extraerTextoArchivo(file);
      const items = parsearTicketTexto(texto);
      if (items.length === 0) {
        setFilas([]);
        setError('No pude detectar productos en el ticket. Probá con un PDF que tenga texto seleccionable o un .txt exportado del sistema.');
        return;
      }

      setFilas(items.map((item) => crearFilaDesdeItem(item, productos)));
      setMensaje(`Detecté ${items.length} producto${items.length === 1 ? '' : 's'}. Revisá la tabla y confirmá la carga cuando esté bien.`);
    } catch (err) {
      console.warn('No se pudo leer el ticket.', err);
      setFilas([]);
      setError('No se pudo leer el archivo. Si es una foto o un escaneo, primero hay que pasarlo por OCR para convertirlo en texto.');
    } finally {
      setLeyendo(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    leerArchivo(file);
    e.target.value = '';
  };

  const aplicarProveedorGlobal = () => {
    setFilas((prev) => prev.map((fila) => ({
      ...fila,
      proveedor: proveedorGlobal.trim() || fila.proveedor,
      numeroProveedor: numeroProveedorGlobal.trim() || fila.numeroProveedor,
    })));
  };

  const confirmarCarga = async () => {
    const seleccionadas = filas.filter((fila) => fila.incluir);
    if (seleccionadas.length === 0) {
      setError('No hay filas seleccionadas para cargar.');
      return;
    }

    const invalidas = seleccionadas.filter((fila) => {
      const nombre = normalizarNombreProducto(fila.productoFinal);
      return !nombre || parseNumeroFlexible(fila.cantidad) <= 0 || parseNumeroFlexible(fila.precioCompra) <= 0;
    });

    if (invalidas.length > 0) {
      setError('Revisá que todas las filas seleccionadas tengan producto, cantidad y precio de compra.');
      return;
    }

    setGuardando(true);
    setError('');
    setMensaje('');

    try {
      seleccionadas.forEach((fila) => {
        const cantidad = parseNumeroFlexible(fila.cantidad);
        const precioCompra = parseNumeroFlexible(fila.precioCompra);
        const precioVenta = parseNumeroFlexible(fila.precioVenta) || calcularPrecioVenta(precioCompra, MARGEN_DEFAULT);
        onRegistrarIngreso(
          normalizarNombreProducto(fila.productoFinal),
          cantidad,
          precioCompra,
          precioVenta,
          fila.proveedor || proveedorGlobal,
          fila.numeroProveedor || numeroProveedorGlobal,
          fila.unidad || 'unidades',
          fila.observacion || `Importado desde ${archivoNombre || 'ticket/PDF'}`,
        );
      });

      setMensaje(`Listo: cargué ${seleccionadas.length} ingreso${seleccionadas.length === 1 ? '' : 's'} de stock.`);
      setFilas([]);
      setArchivoNombre('');
    } catch (err) {
      console.warn('No se pudo confirmar la carga del ticket.', err);
      setError('No se pudo confirmar la carga. Revisá los datos e intentá de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="rounded-2xl sm:rounded-[28px] bg-white border border-slate-200 shadow-lg overflow-hidden">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Importar ticket/PDF</h2>
          <p className="text-slate-500 mt-1 text-sm sm:text-base">
            Subí un ticket de compra, revisá qué detectó y confirmá la carga de stock recién cuando esté correcto.
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={leyendo}
          className="w-full sm:w-auto rounded-2xl border border-emerald-600 bg-emerald-600 text-white px-5 py-3 sm:py-2.5 font-semibold text-sm hover:bg-emerald-700 disabled:opacity-60 transition"
        >
          {leyendo ? 'Leyendo...' : 'Subir ticket/PDF'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,text/plain,application/pdf"
          onChange={handleFileChange}
          className="hidden"
          aria-hidden
        />
      </div>

      <div className="p-4 sm:p-6 space-y-4">
        {archivoNombre && (
          <p className="text-sm text-slate-500">
            Archivo: <strong>{archivoNombre}</strong>
          </p>
        )}

        {mensaje && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 text-sm">
            {mensaje}
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {filas.length > 0 && (
          <>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">A cargar</div>
                <div className="mt-1 text-2xl font-bold text-slate-800">{resumen.total}</div>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Existentes</div>
                <div className="mt-1 text-2xl font-bold text-emerald-900">{resumen.existente || 0}</div>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">A revisar</div>
                <div className="mt-1 text-2xl font-bold text-amber-900">{resumen.revisar || 0}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nuevos</div>
                <div className="mt-1 text-2xl font-bold text-slate-800">{resumen.nuevo || 0}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <label className="block">
                <span className="block text-sm font-medium text-slate-600 mb-1">Proveedor para todas las filas</span>
                <input
                  type="text"
                  value={proveedorGlobal}
                  onChange={(e) => setProveedorGlobal(e.target.value)}
                  placeholder="Ej: Maidona"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-600 mb-1">Teléfono proveedor</span>
                <input
                  type="text"
                  value={numeroProveedorGlobal}
                  onChange={(e) => setNumeroProveedorGlobal(e.target.value)}
                  placeholder="Ej: 3814017461"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </label>
              <button
                type="button"
                onClick={aplicarProveedorGlobal}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Aplicar
              </button>
            </div>

            <div className="space-y-4">
              {filas.map((fila, index) => {
                const estado = estadoDesdeFila(fila, productos);
                const configEstado = ESTADOS[estado] || ESTADOS.nuevo;
                const vistaVenta = calcularVistaVenta(fila);
                const mostrarKgPorUnidad = fila.unidad !== 'kg' && fila.unidad !== 'unidades';
                return (
                  <div key={fila.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                            #{index + 1}
                          </span>
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${configEstado.className}`}>
                            {configEstado.label}
                          </span>
                          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            <input
                              type="checkbox"
                              checked={fila.incluir}
                              onChange={(e) => actualizarFila(fila.id, { incluir: e.target.checked })}
                              className="h-4 w-4 accent-emerald-600"
                            />
                            Cargar
                          </label>
                        </div>
                        <div className="mt-3 font-semibold text-slate-800 break-words">
                          {fila.productoTicket}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          Coincidencia {Math.round(fila.confianza * 100)}%
                          {fila.productoMatch && estado !== 'existente' ? ` - posible: ${fila.productoMatch}` : ''}
                        </div>
                      </div>
                      <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2 text-sm sm:text-right">
                        <div className="text-xs font-medium text-slate-500">Importe del ticket</div>
                        <div className="font-bold text-slate-800">{formatMoneda(fila.importe)}</div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <label className="block sm:col-span-2">
                        <span className="block text-xs font-semibold text-slate-500 mb-1">Producto a guardar</span>
                        <input
                          list={`productos-ticket-${fila.id}`}
                          value={fila.productoFinal}
                          onChange={(e) => actualizarFila(fila.id, { productoFinal: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                        <datalist id={`productos-ticket-${fila.id}`}>
                          {productosOrdenados.map((producto) => (
                            <option key={producto.id || producto.name} value={producto.name} />
                          ))}
                        </datalist>
                      </label>

                      <label className="block">
                        <span className="block text-xs font-semibold text-slate-500 mb-1">Cantidad</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={fila.cantidad}
                          onChange={(e) => actualizarFila(fila.id, { cantidad: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                      </label>

                      <label className="block">
                        <span className="block text-xs font-semibold text-slate-500 mb-1">Unidad</span>
                        <select
                          value={fila.unidad}
                          onChange={(e) => actualizarFila(fila.id, { unidad: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="bolsas">Bolsas</option>
                          <option value="fardos">Fardos</option>
                          <option value="kg">Kg</option>
                          <option value="unidades">Unidades</option>
                        </select>
                      </label>

                      <label className="block">
                        <span className="block text-xs font-semibold text-slate-500 mb-1">Costo unitario</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={fila.precioCompra}
                          onChange={(e) => actualizarFila(fila.id, { precioCompra: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                      </label>

                      <label className="block">
                        <span className="block text-xs font-semibold text-slate-500 mb-1">% ganancia</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={fila.margenPorcentaje}
                          onChange={(e) => actualizarFila(fila.id, { margenPorcentaje: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                      </label>

                      <label className="block">
                        <span className="block text-xs font-semibold text-slate-500 mb-1">Precio venta</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={fila.precioVenta}
                          onChange={(e) => actualizarFila(fila.id, { precioVenta: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                      </label>

                      {mostrarKgPorUnidad && (
                        <label className="block">
                          <span className="block text-xs font-semibold text-slate-500 mb-1">Kg por unidad</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={fila.kgPorUnidad}
                            onChange={(e) => actualizarFila(fila.id, { kgPorUnidad: e.target.value })}
                            placeholder="Ej: 20"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                          />
                        </label>
                      )}

                      <label className="block">
                        <span className="block text-xs font-semibold text-slate-500 mb-1">Proveedor</span>
                        <input
                          type="text"
                          value={fila.proveedor}
                          onChange={(e) => actualizarFila(fila.id, { proveedor: e.target.value })}
                          placeholder={proveedorGlobal || 'Proveedor'}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                      </label>
                    </div>

                    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                            {vistaVenta.titulo}
                          </div>
                          <div className="mt-1 text-sm text-emerald-700">
                            {vistaVenta.nota}
                          </div>
                        </div>
                        <div className="rounded-xl bg-white/70 px-4 py-3 sm:min-w-[190px] sm:text-right">
                          <div className="text-xs font-medium text-emerald-700">
                            {vistaVenta.principal.label}
                          </div>
                          <div className="mt-1 text-2xl font-bold text-emerald-950">
                            {formatMoneda(vistaVenta.principal.value)}
                          </div>
                        </div>
                      </div>

                      {vistaVenta.detalles.length > 0 && (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {vistaVenta.detalles.map((detalle) => (
                            <div key={detalle.label} className="rounded-xl bg-white/60 px-3 py-2">
                              <div className="text-xs text-emerald-700">{detalle.label}</div>
                              <div className="font-bold text-emerald-950">{formatMoneda(detalle.value)}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Las filas en “Revisar” no se guardan distinto: sirven para que confirmes si el producto sugerido es correcto antes de cargar.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => setFilas([])}
                  disabled={guardando}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 sm:py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmarCarga}
                  disabled={guardando || resumen.total === 0}
                  className="rounded-xl bg-emerald-600 px-5 py-3 sm:py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {guardando ? 'Cargando...' : 'Confirmar carga'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
