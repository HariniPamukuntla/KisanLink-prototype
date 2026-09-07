import type { Language, LanguageCode } from '../types';

export const LANGUAGES: Language[] = [
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', script: 'Devanagari' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', script: 'Devanagari' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', script: 'Telugu' },
  { code: 'en', name: 'English', nativeName: 'English', script: 'Latin' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', script: 'Gujarati' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', script: 'Bengali' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', script: 'Tamil' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', script: 'Kannada' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', script: 'Malayalam' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', script: 'Gurmukhi' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', script: 'Oriya' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', script: 'Assamese' },
  { code: 'ur', name: 'Urdu', nativeName: 'اُردُو', script: 'Nastaliq' },
];

export const LANGUAGE_MAP: Record<LanguageCode, Language> = LANGUAGES.reduce(
  (acc, lang) => ({ ...acc, [lang.code]: lang }),
  {} as Record<LanguageCode, Language>
);
