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

The KisanVoice screen records audio, sends it to a configurable multilingual STT service through `VITE_STT_API_URL`, detects the language, and sends the full in-session conversation to a configurable LLM service through `VITE_AI_API_URL`. The STT endpoint should accept multipart form data with `audio` and `language=auto`, and return `{ "text": "...", "language": "hi" }` or `{ "transcript": "..." }`.

The AI endpoint should accept a `POST` JSON body containing `language`, `messages`, and `systemPrompt`, and return a response in one of these shapes:

- `{ "response": "..." }`
- `{ "message": { "content": "..." } }`
- an OpenAI-compatible `{ "choices": [{ "message": { "content": "..." } }] }`

If either endpoint is not configured, the UI shows a clear configuration message instead of using the old predefined responses. Provider keys are intentionally not read by the React app; production deployments should keep them on a server-side proxy. Set `VITE_TTS_API_URL` only when using a provider-backed audio response; otherwise the browser's multilingual speech synthesis is used through `ttsService.ts`.

## Authentication and crop quality

Authentication is intentionally demo-only and persists a local browser session so the existing dashboard is gated behind login. Replace the `AuthScreen` submit handler with the project’s real auth provider when one is available.

Crop quality uses the browser camera API or an uploaded image and a deterministic client-side visual assessment service. It is labeled as an AI-assisted estimate and not a scientific disease diagnosis; the service boundary is ready to be replaced by a computer-vision API.