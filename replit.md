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

The KisanVoice screen now sends the full in-session conversation to a configurable service through `VITE_AI_API_URL`. The endpoint should accept a `POST` JSON body containing `language`, `messages`, and `systemPrompt`, and return a response in one of these shapes:

- `{ "response": "..." }`
- `{ "message": { "content": "..." } }`
- an OpenAI-compatible `{ "choices": [{ "message": { "content": "..." } }] }`

If the endpoint is not configured, the UI shows a configuration message instead of using the old predefined responses. `VITE_AI_API_KEY` is supported for a prototype endpoint, but production deployments should keep provider keys on a server-side proxy rather than exposing them in browser code.

## Authentication and crop quality

Authentication is intentionally demo-only and persists a local browser session so the existing dashboard is gated behind login. Replace the `AuthScreen` submit handler with the project’s real auth provider when one is available.

Crop quality uses the browser camera API or an uploaded image and a deterministic client-side visual assessment service. It is labeled as an AI-assisted estimate and not a scientific disease diagnosis; the service boundary is ready to be replaced by a computer-vision API.