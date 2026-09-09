import type { LanguageCode } from '../types';
import { SPEECH_LANG_MAP } from '../data/speechLocales';

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

const MAX_TTS_CHUNK_LENGTH = 1800;
let speechSession = 0;

export function stopSpeech() {
  speechSession += 1;
  if (typeof window !== 'undefined') window.speechSynthesis.cancel();
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

function speakChunk(text: string, language: LanguageCode) {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      reject(new TTSServiceError('Voice playback is unavailable in this browser.', 'not-configured'));
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    const locale = SPEECH_LANG_MAP[language] || 'en-IN';
    utterance.lang = locale;
    const voices = window.speechSynthesis.getVoices();
    const languagePrefix = locale.split('-')[0].toLowerCase();
    utterance.voice = voices.find(voice => voice.lang.toLowerCase().startsWith(languagePrefix)) || null;
    utterance.onend = () => resolve();
    utterance.onerror = event => {
      if (event.error === 'canceled' || event.error === 'interrupted') {
        resolve();
        return;
      }
      reject(new TTSServiceError('I generated the answer, but could not play the voice response.', 'request-failed'));
    };
    window.speechSynthesis.resume();
    window.speechSynthesis.speak(utterance);
  });
}

export async function speakText(text: string, language: LanguageCode): Promise<void> {
  stopSpeech();
  const currentSession = speechSession;
  for (const chunk of splitSpeechText(text)) {
    if (currentSession !== speechSession) return;
    await speakChunk(chunk, language);
  }
}