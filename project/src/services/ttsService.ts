import type { LanguageCode } from '../types';
import { SPEECH_LANG_MAP } from '../data/speechLocales';

export class TTSServiceError extends Error {
  code: 'not-configured' | 'autoplay-blocked' | 'request-failed' | 'invalid-response';
  constructor(message: string, code: 'not-configured' | 'autoplay-blocked' | 'request-failed' | 'invalid-response') {
    super(message); this.name = 'TTSServiceError'; this.code = code;
  }
}

const MAX_TTS_CHUNK_LENGTH = 1800;
let speechSession = 0;

export function stopSpeech() {
  speechSession += 1;
  if (typeof window !== 'undefined') window.speechSynthesis.cancel();
}

function splitSpeechText(text: string) {
  if (text.length <= MAX_TTS_CHUNK_LENGTH) return [text];
  const sentences = text.match(/[^.!?।]+[.!?।]+|[^.!?।]+$/g) || [text];
  const chunks: string[] = []; let current = '';
  for (const sentence of sentences) {
    if (current && current.length + sentence.length > MAX_TTS_CHUNK_LENGTH) { chunks.push(current.trim()); current = ''; }
    if (sentence.length > MAX_TTS_CHUNK_LENGTH) {
      for (let index = 0; index < sentence.length; index += MAX_TTS_CHUNK_LENGTH) chunks.push(sentence.slice(index, index + MAX_TTS_CHUNK_LENGTH).trim());
    } else current += sentence;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

async function speakWithServer(text: string, language: LanguageCode) {
  const response = await fetch('/api/voice/speak', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language }),
  });
  if (!response.ok) throw new Error('server-tts-unavailable');
  const blob = await response.blob();
  if (!blob.size) throw new Error('empty-audio');
  const url = URL.createObjectURL(blob);
  try {
    await new Promise<void>((resolve, reject) => {
      const audio = new Audio(url);
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error('audio-playback-failed'));
      void audio.play().catch(reject);
    });
  } finally { URL.revokeObjectURL(url); }
}

function getBestBrowserVoice(language: LanguageCode) {
  const locale = (SPEECH_LANG_MAP[language] || 'en-IN').toLowerCase();
  const prefix = locale.split('-')[0];
  const voices = window.speechSynthesis.getVoices();
  return voices.find(v => v.lang.toLowerCase() === locale)
    || voices.find(v => v.lang.toLowerCase().startsWith(prefix + '-'))
    || voices.find(v => v.lang.toLowerCase().startsWith(prefix));
}

function waitForVoices() {
  return new Promise<void>(resolve => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length) { resolve(); return; }
    let finished = false;
    const done = () => { if (finished) return; finished = true; window.speechSynthesis.removeEventListener('voiceschanged', done); resolve(); };
    window.speechSynthesis.addEventListener('voiceschanged', done);
    window.setTimeout(done, 800);
  });
}

async function speakChunk(text: string, language: LanguageCode) {
  if (typeof window === 'undefined') throw new TTSServiceError('Voice playback is unavailable in this browser.', 'not-configured');
  await waitForVoices();
  await new Promise<void>((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text);
    const locale = SPEECH_LANG_MAP[language] || 'en-IN';
    utterance.lang = locale;
    utterance.voice = getBestBrowserVoice(language) || null;
    utterance.rate = 0.92;
    utterance.pitch = 1;
    utterance.onend = () => resolve();
    utterance.onerror = event => {
      if (event.error === 'canceled' || event.error === 'interrupted') { resolve(); return; }
      reject(new TTSServiceError('I generated the answer, but could not play the voice response.', 'request-failed'));
    };
    window.speechSynthesis.resume();
    window.speechSynthesis.speak(utterance);
  });
}

export async function speakText(text: string, language: LanguageCode): Promise<void> {
  stopSpeech();
  const currentSession = speechSession;
  // Prefer the multilingual Gemini server voice when configured. This avoids Windows/Chrome
  // falling back to an English-only installed voice for Hindi/Telugu/Marathi.
  try {
    for (const chunk of splitSpeechText(text)) {
      if (currentSession !== speechSession) return;
      await speakWithServer(chunk, language);
    }
    return;
  } catch { /* fall back to the browser voice */ }

  for (const chunk of splitSpeechText(text)) {
    if (currentSession !== speechSession) return;
    await speakChunk(chunk, language);
  }
}
