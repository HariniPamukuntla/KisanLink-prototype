import type { LanguageCode } from '../types';

export interface SpeechTranscription { text: string; language?: LanguageCode; }
export class SpeechServiceError extends Error {
  code: 'not-configured' | 'permission-denied' | 'recording-failed' | 'transcription-failed';
  constructor(message: string, code: 'not-configured' | 'permission-denied' | 'recording-failed' | 'transcription-failed') {
    super(message); this.name = 'SpeechServiceError'; this.code = code;
  }
}

const LANG_MAP: Record<string, string> = {
  en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN', te: 'te-IN', ta: 'ta-IN', kn: 'kn-IN', bn: 'bn-IN',
  gu: 'gu-IN', pa: 'pa-IN', ur: 'ur-IN', ml: 'ml-IN', as: 'as-IN', or: 'or-IN',
};

function RecognitionCtor() {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

async function requestMicrophonePermission() {
  if (!navigator.mediaDevices?.getUserMedia) return;
  let stream: MediaStream | null = null;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch {
    throw new SpeechServiceError(
      'Microphone access is blocked. In Chrome, click the lock icon beside localhost:5004, allow Microphone, then try Tap to Speak again.',
      'permission-denied'
    );
  } finally { stream?.getTracks().forEach(track => track.stop()); }
}

export class SpeechRecorder {
  private recognition: any = null;
  private promise: Promise<SpeechTranscription> | null = null;
  private done = false;
  private attempts = 0;
  private language: LanguageCode = 'en';
  private onComplete?: (r: SpeechTranscription) => void;

  async start(language: LanguageCode = 'en', onComplete?: (r: SpeechTranscription) => void) {
    this.done = false; this.attempts = 0; this.language = language; this.onComplete = onComplete;
    const Ctor = RecognitionCtor();
    if (!Ctor) throw new SpeechServiceError('Voice input is unavailable in this browser. Please use Chrome or Edge.', 'not-configured');
    this.promise = new Promise((resolve, reject) => { void this.startRecognition(Ctor, resolve, reject); });
    return this.promise;
  }

  private async startRecognition(Ctor: any, resolve: (r: SpeechTranscription) => void, reject: (e: unknown) => void) {
    if (this.done) return;
    this.attempts += 1;
    try {
      await requestMicrophonePermission();
      if (this.done) return;
      this.recognition = new Ctor();
      this.recognition.lang = LANG_MAP[this.language] || 'en-IN';
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 1;
      this.recognition.onresult = (event: any) => {
        const text = String(event.results?.[0]?.[0]?.transcript || '').trim();
        if (text) this.finish({ text, language: this.language }, resolve);
        else this.retry(Ctor, resolve, reject);
      };
      this.recognition.onerror = (event: any) => {
        if (this.done) return;
        const code = String(event?.error || '');
        if (code === 'not-allowed' || code === 'service-not-allowed') {
          reject(new SpeechServiceError('Please allow microphone access for KisanVoice in Chrome, then tap the microphone again.', 'permission-denied')); return;
        }
        if (code === 'audio-capture') {
          reject(new SpeechServiceError('Chrome could not access your microphone. Check that no other app is using it.', 'recording-failed')); return;
        }
        this.retry(Ctor, resolve, reject);
      };
      this.recognition.onend = () => { if (!this.done && this.attempts < 3) window.setTimeout(() => void this.startRecognition(Ctor, resolve, reject), 300); };
      this.recognition.start();
    } catch (error) {
      if (error instanceof SpeechServiceError) { reject(error); return; }
      this.retry(Ctor, resolve, reject);
    }
  }

  private retry(Ctor: any, resolve: (r: SpeechTranscription) => void, reject: (e: unknown) => void) {
    if (this.done) return;
    if (this.attempts < 3) {
      try { this.recognition?.abort(); } catch {}
      window.setTimeout(() => void this.startRecognition(Ctor, resolve, reject), 350);
    } else {
      reject(new SpeechServiceError('Chrome voice recognition is unavailable right now. Refresh once and try Tap to Speak again.', 'transcription-failed'));
    }
  }

  private finish(result: SpeechTranscription, resolve: (r: SpeechTranscription) => void) {
    if (this.done) return;
    this.done = true; try { this.recognition?.stop(); } catch {} this.recognition = null;
    resolve(result); this.onComplete?.(result);
  }

  waitForResult() { return this.promise || Promise.reject(new SpeechServiceError('Voice recording has not started.', 'recording-failed')); }
  stop(language: 'auto' | LanguageCode = 'auto') {
    if (!this.recognition || !this.promise) return Promise.reject(new SpeechServiceError('Voice recording has not started.', 'recording-failed'));
    try { this.recognition.stop(); } catch {}
    return this.promise.then(result => { if (language !== 'auto') result.language = language; return result; });
  }
  cancel() { this.done = true; try { this.recognition?.abort(); } catch {} this.recognition = null; this.promise = null; }
}
