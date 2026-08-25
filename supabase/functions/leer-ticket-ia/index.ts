import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { withSupabase } from 'jsr:@supabase/server@^1'

export default {
  fetch: withSupabase({ auth: 'user' }, async (req) => {
    try {
      const apiKey = Deno.env.get('OPENAI_API_KEY')
      if (!apiKey) throw new Error('Falta configurar OPENAI_API_KEY en Supabase.')
      const { imagen, tipo = 'image/jpeg' } = await req.json()
      if (!imagen) throw new Error('No se recibió ninguna imagen.')

      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-5-mini',
          input: [{ role: 'user', content: [
            { type: 'input_text', text: 'Leé este ticket, factura o presupuesto de un proveedor de una forrajería argentina. Extraé solamente los renglones de productos. No inventes datos ilegibles. precioCompra es el costo unitario, no el total. Conservá marca, presentación y peso en el nombre. Los importes usan formato argentino.' },
            { type: 'input_image', image_url: `data:${tipo};base64,${imagen}`, detail: 'high' },
          ] }],
          text: { format: {
            type: 'json_schema', name: 'ticket_productos', strict: true,
            schema: {
              type: 'object',
              properties: {
                proveedor: { type: 'string' },
                items: { type: 'array', items: {
                  type: 'object',
                  properties: {
                    producto: { type: 'string' }, cantidad: { type: 'number' },
                    precioCompra: { type: 'number' }, importe: { type: 'number' },
                  },
                  required: ['producto', 'cantidad', 'precioCompra', 'importe'],
                  additionalProperties: false,
                } },
              },
              required: ['proveedor', 'items'], additionalProperties: false,
            },
          } },
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data?.error?.message || 'OpenAI no pudo leer el ticket.')
      const outputText = data.output
        ?.flatMap((item: { content?: Array<{ type?: string; text?: string }> }) => item.content || [])
        .find((item: { type?: string }) => item.type === 'output_text')?.text
      if (!outputText) throw new Error('La IA no devolvió productos.')
      return new Response(outputText, { headers: { 'Content-Type': 'application/json' } })
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : 'Error inesperado.' },
        { status: 400 },
      )
    }
  }),
}
