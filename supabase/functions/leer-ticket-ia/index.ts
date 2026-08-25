import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { withSupabase } from 'jsr:@supabase/server@^1'

export default {
  fetch: withSupabase({ auth: 'user' }, async (req) => {
    try {
      const apiKey = Deno.env.get('GEMINI_API_KEY')
      if (!apiKey) throw new Error('Falta configurar GEMINI_API_KEY en Supabase.')
      const { imagen, tipo = 'image/jpeg', catalogo = [] } = await req.json()
      if (!imagen) throw new Error('No se recibió ninguna imagen.')

      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent', {
        method: 'POST',
        headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [
            { text: `Leé con mucho cuidado la tabla de este ticket, factura o presupuesto de una forrajería argentina. Extraé solamente los renglones reales de productos y respetá cada columna: Cód. Art., Descripción, Cant., Precio, Dcto.% e Importe.
Reglas obligatorias:
- Cód. Art. es solamente el código del proveedor: nunca lo mezcles con el nombre ni con Cant.
- Cada renglón visual de la tabla es un producto separado. Nunca juntes dos renglones o productos.
- precioLista es la columna Precio antes del descuento.
- precioCompra es el costo unitario NETO: Importe dividido Cant. Usá ese cálculo como valor principal, porque el descuento puede estar aplicado en Importe.
- Si la descripción dice X 1 KG, X 2,5 KG, X 10KG, X 22KG u otra presentación cerrada, unidad debe ser bolsas, cantidad es la cantidad de bolsas y kgPorUnidad es ese peso.
- Si no hay una presentación cerrada y es mercadería suelta típica (avena, burgol, lenteja, almendra, pasas, nuez, coco rallado, etc.), unidad debe ser kg, cantidad es la cantidad de kilos y kgPorUnidad es 1.
- Usá unidades solo para artículos realmente contados por pieza. Usá fardos únicamente si el texto dice fardo.
- cantidadKgTotal es cantidad por kgPorUnidad para bolsas, o cantidad para kg.
- Conservá marca, variedad, presentación y peso en producto. No inventes texto ilegible.
- Los números impresos usan formato argentino: punto de miles y coma decimal. Verificá que cantidad × precioCompra coincida aproximadamente con Importe.` },
            { text: `Catálogo actual de la base de datos:\n${JSON.stringify(catalogo)}\nPara cada fila, si corresponde al mismo producto aunque cambien mayúsculas, acentos, abreviaturas o presentación escrita, copiá exactamente el nombre del catálogo en productoCatalogo. Si realmente no existe, devolvé una cadena vacía. Nunca inventes otra variante de un producto existente.` },
            { inlineData: { mimeType: tipo, data: imagen } },
          ] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: {
                proveedor: { type: 'string' },
                items: { type: 'array', items: {
                  type: 'object',
                  properties: {
                    producto: { type: 'string' }, productoCatalogo: { type: 'string' },
                    codigoProveedor: { type: 'string' }, cantidad: { type: 'number' },
                    unidad: { type: 'string', enum: ['kg', 'bolsas', 'unidades', 'fardos'] },
                    kgPorUnidad: { type: 'number' }, cantidadKgTotal: { type: 'number' },
                    precioLista: { type: 'number' }, descuentoPorcentaje: { type: 'number' },
                    precioCompra: { type: 'number' }, importe: { type: 'number' },
                  },
                  required: ['producto', 'productoCatalogo', 'codigoProveedor', 'cantidad', 'unidad', 'kgPorUnidad', 'cantidadKgTotal', 'precioLista', 'descuentoPorcentaje', 'precioCompra', 'importe'],
                } },
              },
              required: ['proveedor', 'items'],
            },
          },
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data?.error?.message || 'Gemini no pudo leer el ticket.')
      const outputText = data?.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text || '')
        .join('')
      if (!outputText) throw new Error('Gemini no devolvió productos.')
      return new Response(outputText, { headers: { 'Content-Type': 'application/json' } })
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : 'Error inesperado.' },
        { status: 400 },
      )
    }
  }),
}
