import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Buffer } from 'node:buffer';

const GROQ_API_BASE = 'https://api.groq.com/openai/v1';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_LLM_MODEL = 'openai/gpt-oss-20b';
const DEFAULT_GEMINI_TTS_MODEL = 'gemini-2.5-flash-preview-tts';
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const MAX_JSON_BYTES = 1 * 1024 * 1024;
const MAX_QUALITY_JSON_BYTES = 18 * 1024 * 1024;

const SYSTEM_PROMPT =
  'You are KisanLink’s in-app farmer decision assistant. Understand intent regardless of language, dialect, informal grammar, transliteration, or mixed-language speech. Always respond in the selected application language. Keep answers practical, concise, and specific to the product, quantity, location, and goal mentioned by the farmer. For selling, quality, or price questions, use these plain-text sections in this order: PRODUCT AND REQUEST, QUALITY CHECK, PRICE ANALYSIS, BEST RECOMMENDATION, OTHER OPTIONS, NEXT STEPS. Use short bullet lines under each section; never use Markdown tables, pipes, long paragraphs, or raw symbols such as ###, **, or --- because the answer may be spoken aloud. Repeat the identified product and quantity. If no crop images or structured quality assessment was submitted, clearly say the quality result is a preliminary checklist and do not claim that the crop was visually graded. For price analysis, never invent today’s price: say live market prices are not connected when they are unavailable, then explain what price factors to compare and where to check. Base every recommendation on the farmer’s stated product and quantity, and mention the most suitable selling route plus realistic alternatives. For general questions, still answer directly and avoid generic filler.';

const WHISPER_PROMPT =
  'KisanLink agricultural farmer speech. Vocabulary includes farmer, crop, tomato, onion, potato, wheat, rice, market, mandi, APMC, price, quality, harvest, storage, buyer, seller, fertilizer, irrigation, Maharashtra, Nashik, Pune, Nagpur, Telangana, and government schemes. Preserve the original language, transliteration, and mixed-language speech.';

const GEMINI_VOICE_MAP: Record<string, string> = {
  en: 'Kore',
  hi: 'Aoede',
  mr: 'Aoede',
  te: 'Aoede',
  ta: 'Aoede',
  kn: 'Aoede',
  bn: 'Aoede',
  gu: 'Aoede',
  pa: 'Aoede',
  ur: 'Aoede',
  ml: 'Aoede',
  as: 'Aoede',
  or: 'Aoede',
};

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

function getGeminiKey() {
  return process.env.GEMINI_API_KEY?.trim() || '';
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
  form.append('model', 'whisper-large-v3');
  form.append('response_format', 'verbose_json');
  form.append('temperature', '0');
  form.append('prompt', WHISPER_PROMPT);

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

function pcmToWav(pcm: Buffer, sampleRate: number, channels = 1, bitsPerSample = 16) {
  const blockAlign = channels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const wav = Buffer.alloc(44 + pcm.length);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + pcm.length, 4);
  wav.write('WAVE', 8);
  wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(channels, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(byteRate, 28);
  wav.writeUInt16LE(blockAlign, 32);
  wav.writeUInt16LE(bitsPerSample, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(pcm.length, 40);
  pcm.copy(wav, 44);
  return wav;
}

async function speak(req: IncomingMessage, res: ServerResponse) {
  const apiKey = getGeminiKey();
  if (!apiKey) {
    console.error('[gemini] TTS unavailable: GEMINI_API_KEY is missing');
    sendJson(res, 503, { error: 'Multilingual voice playback is not configured.' });
    return;
  }

  let body: { text?: unknown; language?: unknown };
  try {
    body = JSON.parse((await readRequestBody(req, MAX_JSON_BYTES)).toString('utf8')) as typeof body;
  } catch {
    sendJson(res, 400, { error: 'The voice playback request body is invalid.' });
    return;
  }

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const language = typeof body.language === 'string' ? body.language.toLowerCase().split('-')[0] : 'en';
  if (!text) {
    sendJson(res, 400, { error: 'Text is required for voice playback.' });
    return;
  }

  let response: Response;
  try {
    response = await fetch(
      `${GEMINI_API_BASE}/models/${process.env.GEMINI_TTS_MODEL?.trim() || DEFAULT_GEMINI_TTS_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: GEMINI_VOICE_MAP[language] || GEMINI_VOICE_MAP.en,
                },
              },
            },
          },
        }),
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error';
    logProviderError('TTS network request', 502, message);
    sendJson(res, 502, { error: 'Multilingual voice playback is temporarily unavailable.' });
    return;
  }

  if (!response.ok) {
    const message = await readProviderError(response);
    logProviderError('TTS provider request', response.status, message);
    sendJson(res, 502, { error: 'Multilingual voice playback is temporarily unavailable.' });
    return;
  }

  const payload = await response.json() as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ inlineData?: { data?: unknown; mimeType?: unknown } }>;
      };
    }>;
  };
  const inlineData = payload.candidates?.[0]?.content?.parts?.find(part => part.inlineData)?.inlineData;
  if (typeof inlineData?.data !== 'string') {
    console.error('[gemini] TTS returned no audio data');
    sendJson(res, 502, { error: 'Multilingual voice playback returned no audio.' });
    return;
  }

  const mimeType = typeof inlineData.mimeType === 'string' ? inlineData.mimeType : 'audio/L16;codec=pcm;rate=24000';
  const audio = Buffer.from(inlineData.data, 'base64');
  const pcmRate = Number(mimeType.match(/rate=(\d+)/i)?.[1] || 24000);
  const output = mimeType.toLowerCase().includes('pcm') ? pcmToWav(audio, pcmRate) : audio;
  res.statusCode = 200;
  res.setHeader('Content-Type', mimeType.toLowerCase().includes('pcm') ? 'audio/wav' : mimeType);
  res.setHeader('Content-Length', output.length);
  res.end(output);
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

type QualityImage = { data?: unknown; mimeType?: unknown };

function textFromGemini(payload: unknown) {
  const candidates = (payload as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }>;
  })?.candidates;
  return candidates?.[0]?.content?.parts?.find(part => typeof part.text === 'string')?.text;
}

function cleanJsonText(value: string) {
  return value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

async function assessQuality(req: IncomingMessage, res: ServerResponse) {
  const apiKey = getGeminiKey();
  if (!apiKey) {
    sendJson(res, 503, { error: 'Quality vision service is not configured on the server.' });
    return;
  }

  let body: {
    cropName?: unknown;
    variety?: unknown;
    harvestDate?: unknown;
    quantityQuintals?: unknown;
    storageCondition?: unknown;
    storageLocation?: unknown;
    handlingNotes?: unknown;
    images?: unknown;
  };
  try {
    body = JSON.parse((await readRequestBody(req, MAX_QUALITY_JSON_BYTES)).toString('utf8')) as typeof body;
  } catch (error) {
    sendJson(res, 400, { error: error instanceof Error && error.message === 'request-too-large' ? 'The selected images are too large. Please choose smaller photos.' : 'The quality assessment request is invalid.' });
    return;
  }

  const images = Array.isArray(body.images)
    ? body.images.filter((image): image is QualityImage => (
      typeof image === 'object' &&
      image !== null &&
      typeof (image as QualityImage).data === 'string' &&
      typeof (image as QualityImage).mimeType === 'string'
    )).slice(0, 10)
    : [];
  const cropName = typeof body.cropName === 'string' ? body.cropName.trim() : '';
  if (!cropName || images.length < 4) {
    sendJson(res, 400, { error: 'Crop details and at least four images are required.' });
    return;
  }

  const imageParts = images.map(image => ({
    inlineData: {
      mimeType: image.mimeType as string,
      data: image.data as string,
    },
  }));
  const metadata = JSON.stringify({
    cropName,
    variety: typeof body.variety === 'string' ? body.variety.trim() : '',
    harvestDate: typeof body.harvestDate === 'string' ? body.harvestDate : '',
    quantityQuintals: body.quantityQuintals,
    storageCondition: typeof body.storageCondition === 'string' ? body.storageCondition : '',
    storageLocation: typeof body.storageLocation === 'string' ? body.storageLocation : '',
    handlingNotes: typeof body.handlingNotes === 'string' ? body.handlingNotes : '',
    imageCount: images.length,
  });
  const prompt = `You are KisanLink's crop quality assessor. Assess the provided ${images.length} crop images together with the farmer's structured information. Return ONLY valid JSON with exactly these keys: grade (A, B, or C), score (integer 0-100), reasoning (string), visibleObservations (array of strings), freshnessAssessment (string), recommendations (array of strings), sellingRecommendation (string), confidence (high, medium, or low). Use Grade A for consistently healthy, clean, market-ready produce; Grade B for usable produce with visible minor issues or unevenness; Grade C for significant visible damage, spoilage, contamination, or handling risk. Base the result on all images and metadata, not a fixed example. Do not diagnose plant disease or claim certainty beyond what is visible. Mention when lighting, framing, or image quality limits confidence. Structured farmer information: ${metadata}`;

  let response: Response;
  try {
    response = await fetch(
      `${GEMINI_API_BASE}/models/${process.env.GEMINI_VISION_MODEL?.trim() || 'gemini-2.5-flash'}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, ...imageParts] }],
          generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
        }),
      }
    );
  } catch (error) {
    logProviderError('quality assessment network request', 502, error instanceof Error ? error.message : 'Network error');
    sendJson(res, 502, { error: 'The quality assessment service could not be reached.' });
    return;
  }

  if (!response.ok) {
    const message = await readProviderError(response);
    logProviderError('quality assessment provider request', response.status, message);
    sendJson(res, 502, { error: 'The quality assessment service is temporarily unavailable.' });
    return;
  }

  const providerPayload = await response.json();
  const raw = textFromGemini(providerPayload);
  if (typeof raw !== 'string') {
    sendJson(res, 502, { error: 'The quality assessment service returned no result.' });
    return;
  }

  let result: Record<string, unknown>;
  try {
    result = JSON.parse(cleanJsonText(raw)) as Record<string, unknown>;
  } catch {
    sendJson(res, 502, { error: 'The quality assessment service returned an unreadable result.' });
    return;
  }

  const grade = result.grade;
  const score = Number(result.score);
  if ((grade !== 'A' && grade !== 'B' && grade !== 'C') || !Number.isFinite(score)) {
    sendJson(res, 502, { error: 'The quality assessment service returned an incomplete result.' });
    return;
  }
  sendJson(res, 200, {
    grade,
    score: Math.max(0, Math.min(100, Math.round(score))),
    reasoning: typeof result.reasoning === 'string' ? result.reasoning : 'The assessment is based on the submitted images and crop information.',
    visibleObservations: Array.isArray(result.visibleObservations) ? result.visibleObservations.filter(item => typeof item === 'string').slice(0, 8) : [],
    freshnessAssessment: typeof result.freshnessAssessment === 'string' ? result.freshnessAssessment : 'Freshness could not be determined beyond the visible evidence.',
    recommendations: Array.isArray(result.recommendations) ? result.recommendations.filter(item => typeof item === 'string').slice(0, 8) : [],
    sellingRecommendation: typeof result.sellingRecommendation === 'string' ? result.sellingRecommendation : 'Review the matched buyer options before selling.',
    confidence: result.confidence === 'high' || result.confidence === 'medium' ? result.confidence : 'low',
  });
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

  if (path === '/api/voice/speak' && req.method === 'POST') {
    await speak(req, res);
    return;
  }

  if (path === '/api/quality/assess' && req.method === 'POST') {
    await assessQuality(req, res);
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