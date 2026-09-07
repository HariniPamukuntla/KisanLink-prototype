import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Volume2, Phone, MessageSquare, Wifi, Sparkles, AlertCircle, Send } from 'lucide-react';
import { useApp } from '../../AppContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Waveform } from '../ui/Waveform';
import { ScreenHeader } from '../ui/ScreenHeader';
import { LANGUAGES } from '../../data/languages';
import { VOICE_SUGGESTIONS } from '../../data/voiceScripts';
import { detectIntent, generateResponse, SPEECH_LANG_MAP, type Intent } from '../../data/voiceIntents';
import type { LanguageCode, ConnectivityMode, VoiceExchange } from '../../types';

type VoiceState = 'idle' | 'listening' | 'processing' | 'responding';

// Minimal type declarations for the Web Speech API (not in standard TS lib)
interface SpeechRecognitionResultLike {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [index: number]: { 0: SpeechRecognitionResultLike; isFinal: boolean } };
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function VoiceScreen() {
  const { t, language, setLanguage, connectivity, setConnectivity } = useApp();
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [exchanges, setExchanges] = useState<VoiceExchange[]>([]);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showConnPicker, setShowConnPicker] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [textInput, setTextInput] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const speechSynthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    const SR = getSpeechRecognition();
    setSpeechSupported(!!SR);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechSynthRef.current = window.speechSynthesis;
    }
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
      if (speechSynthRef.current) {
        speechSynthRef.current.cancel();
      }
    };
  }, []);

  const speakResponse = useCallback((text: string, lang: LanguageCode) => {
    if (!speechSynthRef.current) return;
    speechSynthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const bcp47 = SPEECH_LANG_MAP[lang] || 'en-IN';
    utterance.lang = bcp47;
    utterance.rate = 0.95;
    utterance.onend = () => setVoiceState('idle');
    speechSynthRef.current.speak(utterance);
  }, []);

  const handleRecognizedText = useCallback((recognizedText: string) => {
    if (!recognizedText.trim()) {
      setVoiceState('idle');
      return;
    }

    setVoiceState('processing');
    setExchanges(prev => [...prev, {
      id: `u-${Date.now()}`,
      role: 'user',
      text: recognizedText,
      timestamp: Date.now(),
    }]);

    // Brief processing delay for UX feel
    setTimeout(() => {
      const intent: Intent = detectIntent(recognizedText);
      const response = generateResponse(intent, language);

      setExchanges(prev => [...prev, {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: response,
        timestamp: Date.now(),
      }]);
      setVoiceState('responding');
      speakResponse(response, language);
    }, 600);
  }, [language, speakResponse]);

  const startListening = useCallback(() => {
    setErrorMsg('');
    setInterimText('');
    const SR = getSpeechRecognition();
    if (!SR) {
      setSpeechSupported(false);
      return;
    }

    // Clean up any previous instance
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    const recognition = new SR();
    const bcp47 = SPEECH_LANG_MAP[language] || 'en-IN';
    recognition.lang = bcp47;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setVoiceState('listening');
    };

    recognition.onresult = (e: SpeechRecognitionEventLike) => {
      let finalText = '';
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      if (interim) setInterimText(interim);
      if (finalText) {
        setInterimText('');
        recognition.stop();
        handleRecognizedText(finalText);
      }
    };

    recognition.onerror = (e: { error: string }) => {
      if (e.error === 'no-speech') {
        setErrorMsg('No speech detected. Please try again.');
      } else if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setErrorMsg('Microphone access denied. Please allow microphone permissions.');
        setSpeechSupported(false);
      } else {
        setErrorMsg(`Voice error: ${e.error}`);
      }
      setVoiceState('idle');
    };

    recognition.onend = () => {
      // If still in listening state (no result came through), go idle
      setVoiceState(prev => prev === 'listening' ? 'idle' : prev);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      // start() can throw if called too quickly after abort
      setErrorMsg('Could not start microphone. Please try again.');
      setVoiceState('idle');
    }
  }, [language, handleRecognizedText]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setVoiceState('idle');
  }, []);

  const handleTextInput = useCallback(() => {
    const text = textInput.trim();
    if (!text) return;
    setTextInput('');
    handleRecognizedText(text);
  }, [textInput, handleRecognizedText]);

  // Stop speech when language changes
  useEffect(() => {
    if (speechSynthRef.current) {
      speechSynthRef.current.cancel();
    }
    setExchanges([]);
    setVoiceState('idle');
  }, [language]);

  const connModes: { mode: ConnectivityMode; icon: typeof Wifi; label: string; desc: string }[] = [
    { mode: 'online', icon: Wifi, label: t('online'), desc: t('onlineDesc') },
    { mode: 'call', icon: Phone, label: t('callMode'), desc: t('callModeDesc') },
    { mode: 'sms', icon: MessageSquare, label: t('smsMode'), desc: t('smsModeDesc') },
  ];

  const activeConn = connModes.find(c => c.mode === connectivity) || connModes[0];
  const activeLang = LANGUAGES.find(l => l.code === language);
  const suggestions = VOICE_SUGGESTIONS[language] || VOICE_SUGGESTIONS.en;
  const voiceLangSupported = !!SPEECH_LANG_MAP[language];

  return (
    <div className="px-4 pt-4 pb-2 sm:px-0 sm:pt-2 sm:pb-4">
      <ScreenHeader
        title="KisanVoice"
        subtitle={t('speakInYourLanguage')}
        right={
          <button
            onClick={() => setShowConnPicker(true)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border transition-colors ${
              connectivity === 'online'
                ? 'bg-brand-soft text-brand-deep border-brand-mid/20'
                : connectivity === 'call'
                ? 'bg-market-soft text-market-deep border-market/20'
                : 'bg-trust-soft text-trust-deep border-trust/20'
            }`}
          >
            <activeConn.icon size={14} />
            {activeConn.label}
          </button>
        }
      />

      {/* Language selector */}
      <div className="mb-4">
        <button
          onClick={() => setShowLangPicker(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-surface-card border border-line text-sm font-semibold text-ink hover:bg-surface-alt transition-colors"
        >
          <span className="text-lg">{activeLang?.nativeName}</span>
          <span className="text-ink-soft text-xs">{activeLang?.name}</span>
        </button>
      </div>

      {/* Voice interaction area */}
      <Card className="mb-4 flex flex-col items-center py-8">
        {speechSupported && voiceLangSupported ? (
          <>
            {/* Mic button */}
            <button
              onClick={voiceState === 'listening' ? stopListening : startListening}
              disabled={voiceState === 'processing' || voiceState === 'responding'}
              className="relative mb-4"
            >
              <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                voiceState === 'listening' ? 'bg-market animate-pulse-ring' :
                voiceState === 'processing' ? 'bg-trust' :
                voiceState === 'responding' ? 'bg-brand-deep' :
                'bg-brand-deep hover:bg-brand-mid'
              }`}>
                {voiceState === 'responding' ? (
                  <Volume2 size={36} className="text-white" />
                ) : voiceState === 'processing' ? (
                  <Sparkles size={36} className="text-white animate-pulse" />
                ) : (
                  <Mic size={36} className="text-white" />
                )}
              </div>
            </button>

            {/* State text */}
            <p className="text-base font-bold text-ink text-center mb-2">
              {voiceState === 'listening' ? t('listening') :
               voiceState === 'processing' ? t('processing') :
               voiceState === 'responding' ? t('playResponse') :
               t('tapToSpeak')}
            </p>

            {/* Interim recognized text */}
            {interimText && (
              <p className="text-sm text-ink-soft text-center max-w-xs italic mb-2 animate-fade-in">
                {interimText}...
              </p>
            )}

            {/* Waveform */}
            <div className="w-32 mb-2">
              <Waveform active={voiceState === 'listening' || voiceState === 'responding'} bars={7} />
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-surface-alt flex items-center justify-center mb-3">
              <AlertCircle size={32} className="text-ink-faint" />
            </div>
            <p className="text-sm font-bold text-ink text-center mb-1">
              {speechSupported ? 'Voice input not available for this language' : 'Voice input is unavailable on this browser'}
            </p>
            <p className="text-xs text-ink-soft text-center max-w-xs mb-2">
              {speechSupported
                ? 'You can type your question below, or switch to Marathi, Hindi, Telugu, or English for voice input.'
                : 'You can type your question below instead.'}
            </p>
          </>
        )}

        {/* Error message */}
        {errorMsg && (
          <p className="text-xs text-warning text-center mt-1 animate-fade-in">{errorMsg}</p>
        )}
      </Card>

      {/* Conversation log */}
      {exchanges.length > 0 && (
        <div className="mb-4 space-y-3 animate-fade-in">
          {exchanges.map(ex => (
            <div
              key={ex.id}
              className={`flex ${ex.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed animate-rise ${
                  ex.role === 'user'
                    ? 'bg-market-soft text-market-deep rounded-br-md font-medium'
                    : 'bg-brand-soft text-brand-deep rounded-bl-md'
                }`}
              >
                {ex.role === 'user' && (
                  <span className="block text-[10px] font-bold text-market-deep/60 mb-1">You said:</span>
                )}
                {ex.text}
              </div>
            </div>
          ))}
          {voiceState === 'responding' && (
            <div className="flex justify-center">
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  const lastAssistant = [...exchanges].reverse().find(e => e.role === 'assistant');
                  if (lastAssistant) speakResponse(lastAssistant.text, language);
                }}
                className="shadow-sm"
              >
                <Volume2 size={15} />
                {t('playResponse')}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Text input fallback */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleTextInput(); }}
            placeholder="Type your question..."
            className="flex-1 px-4 py-3 rounded-2xl bg-surface-card border border-line text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand-mid transition-colors"
          />
          <Button
            size="md"
            variant="primary"
            onClick={handleTextInput}
            disabled={!textInput.trim() || voiceState === 'processing'}
          >
            <Send size={16} />
          </Button>
        </div>
      </div>

      {/* Suggestions */}
      {exchanges.length === 0 && (
        <div>
          <p className="text-xs font-bold text-ink-soft uppercase tracking-wide mb-2">{t('voiceExamples')}</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleRecognizedText(s)}
                className="px-3.5 py-2.5 rounded-full bg-surface-card border border-line text-sm font-medium text-ink hover:border-brand-mid hover:bg-brand-tint transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* New conversation button */}
      {exchanges.length > 0 && voiceState === 'idle' && (
        <Button
          variant="outline"
          fullWidth
          onClick={() => { setExchanges([]); setErrorMsg(''); }}
        >
          {t('askAbout')}
        </Button>
      )}

      {/* Language picker modal */}
      {showLangPicker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setShowLangPicker(false)} />
          <div className="relative w-full max-w-md bg-surface-card rounded-t-3xl sm:rounded-3xl p-5 max-h-[80vh] overflow-y-auto scrollbar-hide animate-slide-up">
            <h3 className="text-lg font-bold text-ink mb-1">{t('selectLanguage')}</h3>
            <p className="text-xs text-ink-soft mb-3">Voice input available: Marathi, Hindi, Telugu, English</p>
            <div className="grid grid-cols-2 gap-2">
              {LANGUAGES.map(lang => {
                const hasVoice = !!SPEECH_LANG_MAP[lang.code];
                return (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code as LanguageCode);
                      setShowLangPicker(false);
                    }}
                    className={`flex flex-col items-start p-3 rounded-2xl border transition-all ${
                      language === lang.code
                        ? 'border-brand-deep bg-brand-soft'
                        : 'border-line bg-surface-card hover:bg-surface-alt'
                    }`}
                  >
                    <span className="text-base font-bold text-ink">{lang.nativeName}</span>
                    <span className="text-xs text-ink-soft">{lang.name}</span>
                    {!hasVoice && <span className="text-[9px] text-ink-faint mt-0.5">Text only</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Connectivity picker modal */}
      {showConnPicker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setShowConnPicker(false)} />
          <div className="relative w-full max-w-md bg-surface-card rounded-t-3xl sm:rounded-3xl p-5 animate-slide-up">
            <h3 className="text-lg font-bold text-ink mb-3">{t('connectivity')}</h3>
            <div className="space-y-2">
              {connModes.map(({ mode, icon: Icon, label, desc }) => (
                <button
                  key={mode}
                  onClick={() => {
                    setConnectivity(mode);
                    setShowConnPicker(false);
                  }}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                    connectivity === mode
                      ? 'border-brand-deep bg-brand-soft'
                      : 'border-line bg-surface-card hover:bg-surface-alt'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    mode === 'online' ? 'bg-brand-soft text-brand-deep' :
                    mode === 'call' ? 'bg-market-soft text-market-deep' :
                    'bg-trust-soft text-trust-deep'
                  }`}>
                    <Icon size={20} />
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-sm font-bold text-ink">{label}</p>
                    <p className="text-xs text-ink-soft">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
