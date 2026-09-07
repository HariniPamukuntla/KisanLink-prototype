import type { LanguageCode } from '../types';

export class TTSServiceError extends Error {
  code: 'not-configured' | 'autoplay-blocked' | 'request-failed' | 'invalid-response';

  constructor(
    message: string,
    code: 'not-configured' | 'autoplay-blocked' | 'request-failed' | 'invalid-response'
  ) {
    super(message);
    this.name = 'TTSServiceError';
    this.code = code;
  }
}

const DEFAULT_TTS_ENDPOINT = '/api/voice/speak';
const MAX_TTS_CHUNK_LENGTH = 1800;
let activeAudio: HTMLAudioElement | null = null;
let activeObjectUrl: string | null = null;
let speechSession = 0;

export function stopSpeech() {
  speechSession += 1;
  activeAudio?.pause();
  if (activeObjectUrl) URL.revokeObjectURL(activeObjectUrl);
  activeAudio = null;
  activeObjectUrl = null;
}

function splitSpeechText(text: string) {
  if (text.length <= MAX_TTS_CHUNK_LENGTH) return [text];
  const sentences = text.match(/[^.!?।]+[.!?।]+|[^.!?।]+$/g) || [text];
  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if (current && current.length + sentence.length > MAX_TTS_CHUNK_LENGTH) {
      chunks.push(current.trim());
      current = '';
    }
    if (sentence.length > MAX_TTS_CHUNK_LENGTH) {
      for (let index = 0; index < sentence.length; index += MAX_TTS_CHUNK_LENGTH) {
        const part = sentence.slice(index, index + MAX_TTS_CHUNK_LENGTH).trim();
        if (part) chunks.push(part);
      }
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

async function fetchAudio(text: string, language: LanguageCode) {
  const endpoint = import.meta.env.VITE_TTS_API_URL?.trim() || DEFAULT_TTS_ENDPOINT;
  const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: unknown } | null;
    if (response.status === 503 || typeof payload?.error === 'string' && payload.error.toLowerCase().includes('not configured')) {
      throw new TTSServiceError('Multilingual voice playback is not configured.', 'not-configured');
    }
    throw new TTSServiceError('I generated the answer, but could not play the voice response.', 'request-failed');
  }
  const blob = await response.blob();
  if (!blob.size) throw new TTSServiceError('I generated the answer, but could not play the voice response.', 'invalid-response');
  return blob;
}

async function playAudio(blob: Blob) {
  const objectUrl = URL.createObjectURL(blob);
  const audio = new Audio(objectUrl);
  activeAudio = audio;
  activeObjectUrl = objectUrl;

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      if (activeAudio === audio) activeAudio = null;
      if (activeObjectUrl === objectUrl) activeObjectUrl = null;
      URL.revokeObjectURL(objectUrl);
    };
    const finish = (error?: TTSServiceError) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else resolve();
    };
    audio.onended = () => finish();
    audio.onerror = () => finish(new TTSServiceError('I generated the answer, but could not play the voice response.', 'request-failed'));
    void audio.play().catch(() => finish(new TTSServiceError('Tap the speaker button to hear the response.', 'autoplay-blocked')));
  });
}

export async function speakText(text: string, language: LanguageCode): Promise<void> {
  stopSpeech();
  const currentSession = speechSession;
  for (const chunk of splitSpeechText(text)) {
    if (currentSession !== speechSession) return;
    await playAudio(await fetchAudio(chunk, language));
  }
}