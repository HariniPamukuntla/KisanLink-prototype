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

KisanVoice uses the server-side Groq and Gemini API routes in `project/server/groqApi.ts`. Keep the Replit Secrets named exactly `GROQ_API_KEY` and `GEMINI_API_KEY`; they are read only by the Vite server middleware and are never exposed through `VITE_*` variables or React code.

The voice flow is:

```text
microphone → /api/voice/transcribe → Groq Whisper → transcription
→ /api/voice/chat → Groq LLM → response → /api/voice/speak → Gemini multilingual TTS
```

The frontend defaults to `/api/voice/transcribe`, `/api/voice/chat`, and `/api/voice/speak`. `VITE_STT_API_URL`, `VITE_AI_API_URL`, and `VITE_TTS_API_URL` may override those routes for separately managed providers. Gemini receives the original response text in its detected language; the browser is not used as the primary multilingual TTS provider.

The server returns clear configuration errors when either secret is missing and logs provider/configuration failures without logging secrets.

## Authentication and crop quality

Authentication is intentionally demo-only and persists a local browser session so the existing dashboard is gated behind login. Replace the `AuthScreen` submit handler with the project’s real auth provider when one is available.

Crop quality uses the browser camera API or an uploaded image and a deterministic client-side visual assessment service. It is labeled as an AI-assisted estimate and not a scientific disease diagnosis; the service boundary is ready to be replaced by a computer-vision API.