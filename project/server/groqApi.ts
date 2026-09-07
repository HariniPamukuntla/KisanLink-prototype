import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Buffer } from 'node:buffer';

const GROQ_API_BASE = 'https://api.groq.com/openai/v1';
const DEFAULT_LLM_MODEL = 'openai/gpt-oss-20b';
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const MAX_JSON_BYTES = 1 * 1024 * 1024;

const SYSTEM_PROMPT =
  'You are KisanLink Agricultural AI Assistant. Help Indian farmers with agricultural questions, crops, markets, storage, buyers, government schemes, crop quality, and general farming. Understand informal and mixed-language speech. Reply in the farmer’s language or natural mixed style whenever possible. Never invent today’s prices, scheme eligibility, or live facts. If no real-time data source is connected, say that live market data is not currently connected instead of guessing.';

type MultipartFile = {
  filename: string;
  contentType: string;
  data: Buffer;
};

type VoiceMessage = {
  role: 'user' | 'assistant';
  content: string;
};

function getGroqKey() {
  return process.env.GROQ_API_KEY?.trim() || '';
}

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function logProviderError(operation: string, status: number, message: string) {
  console.error(`[groq] ${operation} failed`, {
    status,
    message: message.slice(0, 300),
  });
}

async function readRequestBody(req: IncomingMessage, maxBytes: number) {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > maxBytes) {
      throw new Error('request-too-large');
    }
    chunks.push(buffer);
  }

  return Buffer.concat(chunks);
}

function parseContentDisposition(header: string) {
  const name = header.match(/(?:^|;)\s*name="([^"]*)"/i)?.[1];
  const filename = header.match(/(?:^|;)\s*filename="([^"]*)"/i)?.[1];
  return { name, filename };
}

function parseMultipart(body: Buffer, contentType: string) {
  const boundary = contentType.match(/boundary="?([^";]+)"?/i)?.[1];
  if (!boundary) throw new Error('missing-multipart-boundary');

  const marker = Buffer.from(`--${boundary}`);
  const fields: Record<string, string> = {};
  let audio: MultipartFile | undefined;
  let cursor = body.indexOf(marker);

  while (cursor >= 0) {
    const partStart = cursor + marker.length;
    if (body.subarray(partStart, partStart + 2).toString() === '--') break;

    const headersStart = partStart + 2;
    const headersEnd = body.indexOf(Buffer.from('\r\n\r\n'), headersStart);
    if (headersEnd < 0) break;

    const headers = body.subarray(headersStart, headersEnd).toString('utf8');
    const nextBoundary = body.indexOf(marker, headersEnd + 4);
    if (nextBoundary < 0) break;

    const contentEnd = nextBoundary - 2;
    const content = body.subarray(headersEnd + 4, contentEnd);
    const disposition = headers.match(/^content-disposition:\s*(.+)$/im)?.[1] || '';
    const { name, filename } = parseContentDisposition(disposition);
    const partContentType = headers.match(/^content-type:\s*([^\r\n]+)$/im)?.[1]?.trim() || 'application/octet-stream';

    if (name === 'audio' && filename) {
      audio = {
        filename: filename.replace(/[/\\]/g, '_') || 'kisanvoice.webm',
        contentType: partContentType,
        data: content,
      };
    } else if (name) {
      fields[name] = content.toString('utf8');
    }

    cursor = nextBoundary;
  }

  return { fields, audio };
}

async function readProviderError(response: Response) {
  const body = await response.text().catch(() => '');
  try {
    const payload = JSON.parse(body) as { error?: { message?: unknown } | string };
    const providerError = payload.error;
    if (typeof providerError === 'string') return providerError;
    if (providerError && typeof providerError.message === 'string') return providerError.message;
  } catch {
    // Keep the HTTP status as the useful fallback.
  }
  return body || response.statusText || 'Provider request failed';
}

function normalizeLanguage(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const language = value.toLowerCase().trim();
  const aliases: Record<string, string> = {
    english: 'en',
    hindi: 'hi',
    marathi: 'mr',
    telugu: 'te',
    tamil: 'ta',
    kannada: 'kn',
    bengali: 'bn',
    gujarati: 'gu',
    punjabi: 'pa',
    urdu: 'ur',
    malayalam: 'ml',
    assamese: 'as',
    odia: 'or',
    oriya: 'or',
  };
  return aliases[language] || language.split('-')[0];
}

async function transcribe(req: IncomingMessage, res: ServerResponse) {
  const apiKey = getGroqKey();
  if (!apiKey) {
    console.error('[groq] transcription unavailable: GROQ_API_KEY is missing');
    sendJson(res, 503, { error: 'Groq speech service is not configured on the server.' });
    return;
  }

  const contentType = req.headers['content-type'] || '';
  if (!contentType.toLowerCase().startsWith('multipart/form-data')) {
    sendJson(res, 400, { error: 'Audio must be uploaded as multipart form data.' });
    return;
  }

  let parsed: { fields: Record<string, string>; audio?: MultipartFile };
  try {
    parsed = parseMultipart(await readRequestBody(req, MAX_AUDIO_BYTES), contentType);
  } catch (error) {
    const message = error instanceof Error && error.message === 'request-too-large'
      ? 'Audio file is too large. Please record a shorter question.'
      : 'The audio upload could not be read.';
    sendJson(res, 400, { error: message });
    return;
  }

  if (!parsed.audio?.data.length) {
    sendJson(res, 400, { error: 'No audio recording was received.' });
    return;
  }

  const form = new FormData();
  form.append('file', new Blob([parsed.audio.data], { type: parsed.audio.contentType }), parsed.audio.filename);
  form.append('model', 'whisper-large-v3-turbo');
  form.append('response_format', 'verbose_json');

  const language = parsed.fields.language?.trim();
  if (language && language !== 'auto') form.append('language', language);

  let response: Response;
  try {
    response = await fetch(`${GROQ_API_BASE}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error';
    logProviderError('transcription network request', 502, message);
    sendJson(res, 502, { error: 'The speech service could not be reached.' });
    return;
  }

  if (!response.ok) {
    const message = await readProviderError(response);
    logProviderError('transcription provider request', response.status, message);
    sendJson(res, 502, { error: 'The speech service could not transcribe this recording.' });
    return;
  }

  const payload = await response.json() as { text?: unknown; language?: unknown };
  if (typeof payload.text !== 'string' || !payload.text.trim()) {
    console.error('[groq] transcription returned no text');
    sendJson(res, 502, { error: 'The speech service returned an empty transcription.' });
    return;
  }

  sendJson(res, 200, {
    text: payload.text.trim(),
    language: normalizeLanguage(payload.language),
  });
}

async function chat(req: IncomingMessage, res: ServerResponse) {
  const apiKey = getGroqKey();
  if (!apiKey) {
    console.error('[groq] chat unavailable: GROQ_API_KEY is missing');
    sendJson(res, 503, { error: 'Groq AI service is not configured on the server.' });
    return;
  }

  let body: { messages?: unknown; language?: unknown };
  try {
    body = JSON.parse((await readRequestBody(req, MAX_JSON_BYTES)).toString('utf8')) as typeof body;
  } catch {
    sendJson(res, 400, { error: 'The AI request body is invalid.' });
    return;
  }

  const messages = Array.isArray(body.messages)
    ? body.messages.filter((message): message is VoiceMessage => (
      typeof message === 'object' &&
      message !== null &&
      (message as VoiceMessage).role !== undefined &&
      ((message as VoiceMessage).role === 'user' || (message as VoiceMessage).role === 'assistant') &&
      typeof (message as VoiceMessage).content === 'string' &&
      Boolean((message as VoiceMessage).content.trim())
    )).slice(-12)
    : [];

  if (!messages.length) {
    sendJson(res, 400, { error: 'At least one farmer message is required.' });
    return;
  }

  const language = typeof body.language === 'string' ? body.language : 'en';
  let response: Response;
  try {
    response = await fetch(`${GROQ_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL?.trim() || DEFAULT_LLM_MODEL,
        temperature: 0.3,
        messages: [
          { role: 'system', content: `${SYSTEM_PROMPT} Prefer language code ${language} for the response.` },
          ...messages,
        ],
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error';
    logProviderError('chat network request', 502, message);
    sendJson(res, 502, { error: 'The AI service could not be reached.' });
    return;
  }

  if (!response.ok) {
    const message = await readProviderError(response);
    logProviderError('chat provider request', response.status, message);
    sendJson(res, 502, { error: 'The AI service could not answer this question.' });
    return;
  }

  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: unknown } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    console.error('[groq] chat returned no assistant content');
    sendJson(res, 502, { error: 'The AI service returned an empty answer.' });
    return;
  }

  sendJson(res, 200, { response: content.trim() });
}

async function handleRequest(req: IncomingMessage, res: ServerResponse, next: () => void) {
  const path = req.url?.split('?')[0] || '';

  if (path === '/api/voice/status' && req.method === 'GET') {
    sendJson(res, 200, { configured: Boolean(getGroqKey()) });
    return;
  }

  if (path === '/api/voice/transcribe' && req.method === 'POST') {
    await transcribe(req, res);
    return;
  }

  if (path === '/api/voice/chat' && req.method === 'POST') {
    await chat(req, res);
    return;
  }

  next();
}

export function groqApiPlugin(): Plugin {
  return {
    name: 'kisanlink-groq-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        void handleRequest(req, res, next).catch(error => {
          console.error('[groq] unexpected server error', error instanceof Error ? error.message : 'Unknown error');
          if (!res.headersSent) sendJson(res, 500, { error: 'The voice service encountered an unexpected error.' });
        });
      });
    },
  };
}