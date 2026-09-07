# KisanLink prototype

## Run locally in Replit

The app is a Vite + React + TypeScript frontend in `project/`.

```bash
cd project
npm ci
npm run dev -- --host 0.0.0.0 --port 5000
```

The configured Replit workflow runs the same command and serves the preview on port 5000.

## AI assistant configuration

KisanVoice uses the server-side Groq API route in `project/server/groqApi.ts`. Keep the Replit Secret named exactly `GROQ_API_KEY`; it is read only by the Vite server middleware and is never exposed through `VITE_*` variables or React code.

The voice flow is:

```text
microphone → /api/voice/transcribe → Groq Whisper → transcription
→ /api/voice/chat → Groq LLM → response → multilingual browser TTS
```

The frontend defaults to `/api/voice/transcribe` and `/api/voice/chat`. `VITE_STT_API_URL` and `VITE_AI_API_URL` may still override those routes for a separately managed provider, while `VITE_TTS_API_URL` is optional. Without a TTS provider, `ttsService.ts` uses browser speech synthesis.

The server returns a clear configuration error when `GROQ_API_KEY` is missing and logs provider/configuration failures without logging the secret.

## Authentication and crop quality

Authentication is intentionally demo-only and persists a local browser session so the existing dashboard is gated behind login. Replace the `AuthScreen` submit handler with the project’s real auth provider when one is available.

Crop quality uses the browser camera API or an uploaded image and a deterministic client-side visual assessment service. It is labeled as an AI-assisted estimate and not a scientific disease diagnosis; the service boundary is ready to be replaced by a computer-vision API.