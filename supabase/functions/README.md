# Lectura de tickets con IA

La clave de Gemini debe configurarse como secreto de Supabase; nunca se agrega al `.env` del navegador.

```bash
supabase secrets set GEMINI_API_KEY=...
supabase functions deploy quick-task
```

La función publicada en este proyecto se llama `quick-task`, requiere un usuario autenticado y utiliza Gemini con entrada de imagen y salida JSON estructurada.
