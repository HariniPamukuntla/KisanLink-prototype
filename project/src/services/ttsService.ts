import type { LanguageCode } from '../types';
import { SPEECH_LANG_MAP } from '../data/speechLocales';

export class TTSServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TTSServiceError';
  }
}

let activeAudio: HTMLAudioElement | null = null;

export function stopSpeech() {
  window.speechSynthesis?.cancel();
  activeAudio?.pause();
  activeAudio = null;
}

export async function speakText(text: string, language: LanguageCode): Promise<void> {
  stopSpeech();
  const endpoint = import.meta.env.VITE_TTS_API_URL?.trim();

  if (endpoint) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language }),
    });
    if (!response.ok) throw new TTSServiceError('Voice response could not be played.');
    const audio = new Audio(URL.createObjectURL(await response.blob()));
    activeAudio = audio;
    await new Promise<void>((resolve, reject) => {
      audio.onended = () => { activeAudio = null; resolve(); };
      audio.onerror = () => { activeAudio = null; reject(new TTSServiceError('Voice response could not be played.')); };
      void audio.play();
    });
    return;
  }

  if (!('speechSynthesis' in window)) {
    throw new TTSServiceError('Voice response could not be played.');
  }

  await new Promise<void>(resolve => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = SPEECH_LANG_MAP[language] || 'en-IN';
    utterance.rate = 0.95;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}