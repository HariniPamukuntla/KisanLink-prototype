import type { LanguageCode } from '../types';

export interface SpeechTranscription { text: string; language?: LanguageCode; }
export class SpeechServiceError extends Error {
  code: 'not-configured' | 'permission-denied' | 'recording-failed' | 'transcription-failed';
  constructor(message: string, code: 'not-configured' | 'permission-denied' | 'recording-failed' | 'transcription-failed') {
    super(message); this.name = 'SpeechServiceError'; this.code = code;
  }
}

const LANG_MAP: Record<string, string> = {
  en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN', te: 'te-IN', ta: 'ta-IN', kn: 'kn-IN',
  bn: 'bn-IN', gu: 'gu-IN', pa: 'pa-IN', ur: 'ur-IN', ml: 'ml-IN', as: 'as-IN', or: 'or-IN',
};
const ENDPOINT = '/api/voice/transcribe';

function RecognitionCtor() {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

async function requestMicrophonePermission() {
  if (!navigator.mediaDevices?.getUserMedia) return;
  let stream: MediaStream | null = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    throw new SpeechServiceError(
      'Microphone access is blocked. In Chrome, click the lock icon beside localhost:5004, allow Microphone, then try Tap to Speak again.',
      'permission-denied'
    );
  } finally {
    stream?.getTracks().forEach(track => track.stop());
  }
}

async function transcribeAudio(audio: Blob, language: 'auto' | LanguageCode) {
  const form = new FormData();
  form.append('audio', audio, 'kisanvoice.webm');
  form.append('language', language);
  try {
    const r = await fetch(ENDPOINT, { method: 'POST', body: form });
    const p = await r.json().catch(() => ({}));
    if (r.ok) {
      const text = typeof p.text === 'string' ? p.text : p.transcript;
      if (text?.trim()) return { text: text.trim(), language: typeof p.language === 'string' ? p.language as LanguageCode : language === 'auto' ? undefined : language };
    }
    throw new Error(typeof p.error === 'string' ? p.error : 'Speech transcription failed.');
  } catch (e) {
    throw new SpeechServiceError(
      e instanceof Error && e.message !== 'Failed to fetch' ? e.message : 'The speech service could not be reached. Check that KisanVoice speech is configured.',
      'transcription-failed'
    );
  }
}

export class SpeechRecorder {
  private recognition: any = null;
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private promise: Promise<SpeechTranscription> | null = null;
  private done = false;
  private silenceTimer: number | null = null;
  private maxTimer: number | null = null;
  private analyser: any = null;
  private audioContext: any = null;
  private speechStarted = false;
  private fallbackStarted = false;
  private browserRetry = false;

  async start(language: LanguageCode = 'en', onComplete?: (r: SpeechTranscription) => void) {
    this.done = false;
    this.fallbackStarted = false;
    this.browserRetry = false;

    this.promise = new Promise((resolve, reject) => {
      void this.startBrowserRecognition(language, resolve, reject, onComplete);
    });
    return this.promise;
  }

  private async startBrowserRecognition(
    language: LanguageCode,
    resolve: (r: SpeechTranscription) => void,
    reject: (e: unknown) => void,
    onComplete?: (r: SpeechTranscription) => void,
  ) {
    if (this.done) return;
    const Ctor = RecognitionCtor();
    if (!Ctor) {
      this.startMediaFallback(language, resolve, reject, onComplete);
      return;
    }

    try {
      await requestMicrophonePermission();
      if (this.done) return;
      this.recognition = new Ctor();
      this.recognition.lang = LANG_MAP[language] || 'en-IN';
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 1;
      this.recognition.onresult = (event: any) => {
        const text = String(event.results?.[0]?.[0]?.transcript || '').trim();
        if (text) this.finish({ text, language }, resolve, onComplete);
      };
      this.recognition.onerror = (event: any) => {
        const code = String(event?.error || '');
        if (this.done) return;
        if (code === 'not-allowed') {
          reject(new SpeechServiceError('Chrome did not allow microphone access. Allow Microphone for localhost:5004 and tap again.', 'permission-denied'));
          return;
        }
        // Chrome can occasionally report a transient network/service error even though
        // the microphone is working. Give the browser recognition engine one clean retry.
        if (!this.browserRetry && (code === 'network' || code === 'service-not-allowed' || code === 'no-speech')) {
          this.browserRetry = true;
          try { this.recognition?.abort(); } catch {}
          window.setTimeout(() => void this.startBrowserRecognition(language, resolve, reject, onComplete), 350);
          return;
        }
        this.startMediaFallback(language, resolve, reject, onComplete);
      };
      this.recognition.onend = () => {
        if (!this.done && !this.fallbackStarted) {
          if (!this.browserRetry) {
            this.browserRetry = true;
            window.setTimeout(() => void this.startBrowserRecognition(language, resolve, reject, onComplete), 350);
          } else {
            this.startMediaFallback(language, resolve, reject, onComplete);
          }
        }
      };
      this.recognition.start();
    } catch (error) {
      if (error instanceof SpeechServiceError) {
        reject(error);
        return;
      }
      if (!this.browserRetry) {
        this.browserRetry = true;
        window.setTimeout(() => void this.startBrowserRecognition(language, resolve, reject, onComplete), 350);
      } else {
        this.startMediaFallback(language, resolve, reject, onComplete);
      }
    }
  }

  private async startMediaFallback(language: LanguageCode, resolve: (r: SpeechTranscription) => void, reject: (e: unknown) => void, onComplete?: ((r: SpeechTranscription) => void)) {
    if (this.done || this.fallbackStarted) return;
    this.fallbackStarted = true;
    try { this.recognition?.abort(); } catch {}
    this.recognition = null;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      reject(new SpeechServiceError('Voice input is unavailable in this browser. Use Tap to Type instead.', 'recording-failed'));
      return;
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(x => MediaRecorder.isTypeSupported(x)) || '';
      this.recorder = new MediaRecorder(this.stream, mime ? { mimeType: mime } : undefined);
      this.chunks = [];
      this.recorder.ondataavailable = e => { if (e.data.size) this.chunks.push(e.data); };
      this.recorder.onerror = () => reject(new SpeechServiceError('Microphone recording failed. Please try again.', 'recording-failed'));
      this.recorder.onstop = async () => {
        this.clearTimers(); this.stopAudioMonitor(); this.stream?.getTracks().forEach(t => t.stop()); this.stream = null;
        try {
          const result = await transcribeAudio(new Blob(this.chunks, { type: this.recorder?.mimeType || 'audio/webm' }), language);
          this.finish(result, resolve, onComplete);
        } catch (e) { reject(e); }
      };
      this.recorder.start(250);
      this.startAudioMonitor();
      this.maxTimer = window.setTimeout(() => this.stopRecorder(), 12000);
    } catch {
      this.stream?.getTracks().forEach(t => t.stop()); this.stream = null;
      reject(new SpeechServiceError('Please allow microphone access for KisanVoice in Chrome.', 'permission-denied'));
    }
  }

  private startAudioMonitor() {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx || !this.stream) return;
      this.audioContext = new Ctx();
      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      source.connect(this.analyser);
      const data = new Uint8Array(this.analyser.fftSize);
      const tick = () => {
        if (this.done || !this.recorder || this.recorder.state === 'inactive') return;
        this.analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const v of data) { const n = (v - 128) / 128; sum += n * n; }
        const rms = Math.sqrt(sum / data.length);
        if (rms > 0.018) {
          this.speechStarted = true;
          if (this.silenceTimer !== null) { clearTimeout(this.silenceTimer); this.silenceTimer = null; }
        } else if (this.speechStarted && this.silenceTimer === null) {
          this.silenceTimer = window.setTimeout(() => this.stopRecorder(), 1400);
        }
        this.analyser._kisanTimer = window.setTimeout(tick, 120);
      };
      tick();
    } catch {}
  }

  private stopAudioMonitor() { if (this.analyser?._kisanTimer) clearTimeout(this.analyser._kisanTimer); try { this.audioContext?.close(); } catch {} this.audioContext = null; this.analyser = null; }
  private clearTimers() { if (this.silenceTimer !== null) clearTimeout(this.silenceTimer); if (this.maxTimer !== null) clearTimeout(this.maxTimer); this.silenceTimer = null; this.maxTimer = null; }
  private stopRecorder() { if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop(); }
  private finish(r: SpeechTranscription, resolve: (r: SpeechTranscription) => void, onComplete?: (r: SpeechTranscription) => void) { if (this.done) return; this.done = true; this.clearTimers(); this.stopAudioMonitor(); this.stream?.getTracks().forEach(t => t.stop()); this.stream = null; resolve(r); onComplete?.(r); }
  waitForResult() { return this.promise || Promise.reject(new SpeechServiceError('Voice recording has not started.', 'recording-failed')); }
  stop(language: 'auto' | LanguageCode = 'auto') { if (this.recognition && this.promise && !this.fallbackStarted) { try { this.recognition.stop(); } catch {} return this.promise.then(r => { if (language !== 'auto') r.language = language; return r; }); } if (!this.recorder || !this.promise) return Promise.reject(new SpeechServiceError('Voice recording has not started.', 'recording-failed')); this.stopRecorder(); return this.promise.then(r => { if (language !== 'auto') r.language = language; return r; }); }
  cancel() { try { this.recognition?.abort(); } catch {} this.clearTimers(); this.stopAudioMonitor(); if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop(); this.stream?.getTracks().forEach(t => t.stop()); this.recognition = null; this.recorder = null; this.stream = null; this.promise = null; this.done = true; }
}
