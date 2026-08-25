# Lectura de tickets con IA

La clave de OpenAI debe configurarse como secreto de Supabase; nunca se agrega al `.env` del navegador.

```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase functions deploy quick-task
```

La función publicada en este proyecto se llama `quick-task`, requiere un usuario autenticado y utiliza entrada de imagen con salida JSON estructurada.
