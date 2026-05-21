import { useRef } from 'react';
import * as XLSX from 'xlsx';

function exportarStockExcel(porProducto) {
  const nombresExtra = Object.keys(porProducto)
    .sort((a, b) => a.localeCompare(b, 'es'));
  const filas = nombresExtra.map((name) => {
    const datos = porProducto[name] || {};
    const cantComprada = Number(datos.cantidadComprada) || 0;
    const cantVendida = Number(datos.cantidadVendida) || 0;
    const stockActual = Math.max(0, cantComprada - cantVendida);
    const precioCompra = Number(datos.precioCompra);
    const precioVenta = Number(datos.precioVenta);
    return {
      Producto: name,
      Unidad: 'unidades',
      'Cantidad comprada': cantComprada,
      'Cantidad vendida': cantVendida,
      'Stock actual': stockActual,
      'Precio compra': Number.isFinite(precioCompra) ? precioCompra : 0,
      'Precio venta': Number.isFinite(precioVenta) ? precioVenta : 0,
    };
  });
  const hoja = XLSX.utils.json_to_sheet(filas);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Stock');
  const nombre = `stock_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(libro, nombre);
}

function leerExcelYActualizar(archivo, setPorProducto) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
      if (!rows.length) return;
      const headers = rows[0].map((h) => String(h || '').trim());
      const idxProducto = headers.findIndex((h) => /producto/i.test(h));
      const idxCantComprada = headers.findIndex((h) => /cantidad comprada|cant\. comprada/i.test(h));
      const idxCantVendida = headers.findIndex((h) => /cantidad vendida|cant\. vendida/i.test(h));
      const idxPrecioCompra = headers.findIndex((h) => /precio compra/i.test(h));
      const idxPrecioVenta = headers.findIndex((h) => /precio venta/i.test(h));
      if (idxProducto < 0) return;
      setPorProducto((prev) => {
        const next = { ...prev };
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const producto = String(row[idxProducto] ?? '').trim();
          if (!producto) continue;
          const cantComprada = Number(row[idxCantComprada]) || 0;
          const cantVendida = Number(row[idxCantVendida]) || 0;
          const precioCompra = Number(row[idxPrecioCompra]);
          const precioVenta = Number(row[idxPrecioVenta]);
          const actual = next[producto] || {
            cantidadComprada: 0,
            cantidadVendida: 0,
            precioCompra: 0,
            precioVenta: 0,
          };
          next[producto] = {
            cantidadComprada: Number.isFinite(cantComprada) ? cantComprada : actual.cantidadComprada,
            cantidadVendida: Number.isFinite(cantVendida) ? cantVendida : actual.cantidadVendida,
            precioCompra: Number.isFinite(precioCompra) ? precioCompra : actual.precioCompra,
            precioVenta: Number.isFinite(precioVenta) ? precioVenta : actual.precioVenta,
          };
        }
        return next;
      });
    } catch (err) {
      console.error(err);
      alert('No se pudo leer el archivo. Revisá que sea un Excel con las columnas: Producto, Cantidad comprada, Cantidad vendida, Precio compra, Precio venta.');
    }
  };
  reader.readAsArrayBuffer(archivo);
}

export default function StockExcel({ porProducto, setPorProducto }) {
  const inputFileRef = useRef(null);

  const handleExportar = () => {
    exportarStockExcel(porProducto);
  };

  const handleImportarClick = () => {
    inputFileRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    leerExcelYActualizar(file, setPorProducto);
    e.target.value = '';
  };

  return (
    <section className="rounded-2xl sm:rounded-[28px] bg-white border border-slate-200 shadow-lg overflow-hidden">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-200">
        <h2 className="text-xl sm:text-2xl font-bold">Excel</h2>
        <p className="text-slate-500 mt-1">
          Exportá el stock para editar precios o cantidades en Excel e importalo de nuevo para actualizar más rápido.
        </p>
      </div>
      <div className="p-4 sm:p-6 grid grid-cols-1 sm:flex sm:flex-wrap gap-3">
        <button
          type="button"
          onClick={handleExportar}
          className="w-full sm:w-auto rounded-2xl border border-emerald-600 bg-emerald-600 text-white px-5 py-3 sm:py-2.5 font-semibold text-sm hover:bg-emerald-700 transition"
        >
          Exportar a Excel
        </button>
        <button
          type="button"
          onClick={handleImportarClick}
          className="w-full sm:w-auto rounded-2xl border border-slate-300 bg-white text-slate-700 px-5 py-3 sm:py-2.5 font-semibold text-sm hover:bg-slate-50 transition"
        >
          Importar desde Excel
        </button>
        <input
          ref={inputFileRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
          aria-hidden
        />
      </div>
      <div className="px-4 sm:px-6 pb-4 sm:pb-6 text-sm text-slate-500">
        Al exportar se incluyen el catálogo y los productos nuevos que hayas cargado. Al importar, cada fila actualiza o crea el producto por nombre (también nombres que no estén en el catálogo).
      </div>
    </section>
  );
}
