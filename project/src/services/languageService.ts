import type { LanguageCode } from '../types';

const devanagariHindiMarkers = ['है', 'का', 'की', 'को', 'में', 'आज', 'भाव', 'प्याज', 'टमाटर'];
const devanagariMarathiMarkers = ['आहे', 'चा', 'ची', 'चे', 'कांदा', 'कांद्याचा', 'शेतकरी', 'पीक', 'किती'];
const latinHindiMarkers = ['bhai', 'aaj', 'ka', 'ki', 'kya', 'bhav', 'tamatar', 'pyaaz', 'pyaj', 'hai', 'mein'];

export function detectLanguageFromText(text: string, fallback: LanguageCode = 'en'): LanguageCode {
  const value = text.trim().toLowerCase();
  if (!value) return fallback;
  if (/[\u0c00-\u0c7f]/.test(value)) return 'te';
  if (/[\u0b80-\u0bff]/.test(value)) return 'ta';
  if (/[\u0c80-\u0cff]/.test(value)) return 'kn';
  if (/[\u0980-\u09ff]/.test(value)) return 'bn';
  if (/[\u0a80-\u0aff]/.test(value)) return 'gu';
  if (/[\u0a00-\u0a7f]/.test(value)) return 'pa';
  if (/[\u0600-\u06ff]/.test(value)) return 'ur';

  if (/[\u0900-\u097f]/.test(value)) {
    const marathiScore = devanagariMarathiMarkers.filter(marker => value.includes(marker)).length;
    const hindiScore = devanagariHindiMarkers.filter(marker => value.includes(marker)).length;
    return marathiScore > hindiScore ? 'mr' : 'hi';
  }

  const latinHindiScore = latinHindiMarkers.filter(marker => value.split(/\s+/).includes(marker)).length;
  return latinHindiScore >= 2 ? 'hi' : fallback === 'en' ? 'en' : fallback;
}