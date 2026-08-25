# Lectura de tickets con IA

La clave de OpenAI debe configurarse como secreto de Supabase; nunca se agrega al `.env` del navegador.

```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase functions deploy leer-ticket-ia
```

La función requiere un usuario autenticado y utiliza `gpt-5-mini` con entrada de imagen y salida JSON estructurada.
