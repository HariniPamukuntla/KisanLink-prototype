import type { LanguageCode } from '../types';

export interface SpeechTranscription {
  text: string;
  language?: LanguageCode;
}

export class SpeechServiceError extends Error {
  code: 'not-configured' | 'permission-denied' | 'recording-failed' | 'transcription-failed';

  constructor(
    message: string,
    code: 'not-configured' | 'permission-denied' | 'recording-failed' | 'transcription-failed'
  ) {
    super(message);
    this.name = 'SpeechServiceError';
    this.code = code;
  }
}

const DEFAULT_STT_ENDPOINT = '/api/voice/transcribe';

function getSTTEndpoint() {
  return import.meta.env.VITE_STT_API_URL?.trim() || DEFAULT_STT_ENDPOINT;
}

export function isSpeechServiceConfigured() {
  return true;
}

function getMimeType() {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  return candidates.find(type => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) || '';
}

export async function transcribeAudio(audio: Blob, languageHint: 'auto' | LanguageCode = 'auto'): Promise<SpeechTranscription> {
  const endpoint = getSTTEndpoint();

  const form = new FormData();
  form.append('audio', audio, 'kisanvoice.webm');
  form.append('language', languageHint);

  let response: Response;
  try {
    response = await fetch(endpoint, { method: 'POST', body: form });
  } catch {
    throw new SpeechServiceError(
      'Voice service is not configured. Please check the AI/STT API configuration.',
      'transcription-failed'
    );
  }

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null) as { error?: unknown } | null;
    if (response.status === 503 || typeof errorPayload?.error === 'string' && errorPayload.error.toLowerCase().includes('not configured')) {
      throw new SpeechServiceError(
        'Voice service is not configured. Please check the AI/STT API configuration.',
        'not-configured'
      );
    }
    throw new SpeechServiceError(
      'I couldn’t understand the audio. Please try again.',
      'transcription-failed'
    );
  }

  try {
    const payload = await response.json() as { text?: unknown; transcript?: unknown; language?: unknown; lang?: unknown };
    const text = typeof payload.text === 'string' ? payload.text : payload.transcript;
    if (typeof text !== 'string' || !text.trim()) throw new Error('empty transcription');
    const providerLanguage = payload.language || payload.lang;
    return {
      text: text.trim(),
      language: typeof providerLanguage === 'string' ? providerLanguage as LanguageCode : undefined,
    };
  } catch {
    throw new SpeechServiceError(
      'I couldn’t understand the audio. Please try again.',
      'transcription-failed'
    );
  }
}

export class SpeechRecorder {
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private stopPromise: Promise<SpeechTranscription> | null = null;

  async start() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      throw new SpeechServiceError(
        'Voice service is not configured. Please check the AI/STT API configuration.',
        'recording-failed'
      );
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getMimeType();
      this.recorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);
      this.chunks = [];
      this.stopPromise = new Promise((resolve, reject) => {
        if (!this.recorder) {
          reject(new SpeechServiceError('I couldn’t understand the audio. Please try again.', 'recording-failed'));
          return;
        }
        this.recorder.ondataavailable = event => {
          if (event.data.size > 0) this.chunks.push(event.data);
        };
        this.recorder.onerror = () => reject(new SpeechServiceError('I couldn’t understand the audio. Please try again.', 'recording-failed'));
        this.recorder.onstop = async () => {
          this.stream?.getTracks().forEach(track => track.stop());
          this.stream = null;
          try {
            resolve(await transcribeAudio(new Blob(this.chunks, { type: this.recorder?.mimeType || 'audio/webm' }), 'auto'));
          } catch (error) {
            reject(error);
          }
        };
      });
      this.recorder.start();
    } catch (error) {
      this.stream?.getTracks().forEach(track => track.stop());
      this.stream = null;
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        throw new SpeechServiceError(
          'Microphone permission is required for voice questions.',
          'permission-denied'
        );
      }
      if (error instanceof SpeechServiceError) throw error;
      throw new SpeechServiceError('I couldn’t understand the audio. Please try again.', 'recording-failed');
    }
  }

  stop(languageHint: 'auto' | LanguageCode = 'auto') {
    if (!this.recorder || this.recorder.state === 'inactive' || !this.stopPromise) {
      return Promise.reject(new SpeechServiceError('I couldn’t understand the audio. Please try again.', 'recording-failed'));
    }
    this.recorder.stop();
    return this.stopPromise.then(transcription => {
      if (languageHint !== 'auto') transcription.language = languageHint;
      return transcription;
    });
  }

  cancel() {
    if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop();
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = null;
    this.recorder = null;
  }
}