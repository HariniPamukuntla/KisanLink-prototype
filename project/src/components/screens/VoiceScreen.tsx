import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Volume2, Phone, MessageSquare, Wifi, Sparkles, AlertCircle, Send } from 'lucide-react';
import { useApp } from '../../AppContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Waveform } from '../ui/Waveform';
import { ScreenHeader } from '../ui/ScreenHeader';
import { LANGUAGES } from '../../data/languages';
import { VOICE_SUGGESTIONS } from '../../data/voiceScripts';
import { askAgriculturalAI, exchangesToMessages, AIServiceError } from '../../services/aiService';
import { detectLanguageFromText } from '../../services/languageService';
import { SpeechRecorder, SpeechServiceError } from '../../services/speechService';
import { speakText, stopSpeech, TTSServiceError } from '../../services/ttsService';
import type { LanguageCode, ConnectivityMode, VoiceExchange } from '../../types';

type VoiceState = 'idle' | 'listening' | 'transcribing' | 'thinking' | 'speaking';

export function VoiceScreen() {
  const { t, language, setLanguage, connectivity, setConnectivity, addHistory, voiceInputMode, setVoiceInputMode } = useApp();
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [exchanges, setExchanges] = useState<VoiceExchange[]>([]);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showConnPicker, setShowConnPicker] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [textInput, setTextInput] = useState('');
  const [speechSupported, setSpeechSupported] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [responseLanguage, setResponseLanguage] = useState<LanguageCode>(language);

  const recorderRef = useRef<SpeechRecorder | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSpeechSupported(
      typeof window !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== 'undefined'
    );
    return () => {
      recorderRef.current?.cancel();
      stopSpeech();
    };
  }, []);

  useEffect(() => {
    if (voiceInputMode === 'type') {
      window.setTimeout(() => textInputRef.current?.focus(), 0);
    }
  }, [voiceInputMode]);

  const speakResponse = useCallback(async (text: string, lang: LanguageCode) => {
    setVoiceState('speaking');
    try {
      await speakText(text, lang);
    } catch (error) {
      const message = error instanceof TTSServiceError
        ? error.message
        : 'I generated the answer, but could not play the voice response.';
      setErrorMsg(message);
    } finally {
      setVoiceState('idle');
    }
  }, []);

  const handleRecognizedText = useCallback(async (
    recognizedText: string,
    languageHint?: LanguageCode,
    autoSpeak = true
  ) => {
    if (!recognizedText.trim()) {
      setVoiceState('idle');
      return;
    }

    setVoiceState('thinking');
    setErrorMsg('');
    const detectedLanguage = languageHint || detectLanguageFromText(recognizedText, language);
    setResponseLanguage(language);
    const userExchange: VoiceExchange = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: recognizedText,
      timestamp: Date.now(),
      language: detectedLanguage,
    };
    const nextExchanges = [...exchanges, userExchange];
    setExchanges(prev => [...prev, {
      ...userExchange,
    }]);

    try {
      const response = await askAgriculturalAI(
        exchangesToMessages(nextExchanges),
        language
      );
      setExchanges(prev => [...prev, {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: response,
        timestamp: Date.now(),
         language,
      }]);
       addHistory({
         type: 'conversation',
         title: 'KisanVoice',
         summary: recognizedText,
         result: response,
         details: [`${t('language')}: ${LANGUAGES.find(item => item.code === language)?.name || language}`, `${t('detectedLanguage')}: ${LANGUAGES.find(item => item.code === detectedLanguage)?.name || detectedLanguage}`],
       });
       if (autoSpeak) void speakResponse(response, language);
      else setVoiceState('idle');
    } catch (error) {
      const message = error instanceof AIServiceError
        ? error.message
        : 'AI assistant is currently unavailable. Please check the AI configuration.';
      setErrorMsg(message);
      setVoiceState('idle');
    }
  }, [addHistory, exchanges, language, speakResponse, t]);

  const startListening = useCallback(async () => {
    setErrorMsg('');
    setInterimText('');
    setVoiceInputMode('voice');
    if (voiceState !== 'idle') {
      return;
    }

    const recorder = new SpeechRecorder();
    recorderRef.current = recorder;
    try {
      await recorder.start();
      setVoiceState('listening');
      setInterimText('Recording audio…');
    } catch (error) {
      const message = error instanceof SpeechServiceError
        ? error.message
        : 'Microphone permission is required for voice questions.';
      setErrorMsg(message);
      setVoiceState('idle');
    }
  }, [setVoiceInputMode, voiceState]);

  const stopListening = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder || voiceState !== 'listening') return;
    setVoiceState('transcribing');
    setInterimText('');
    try {
      const transcription = await recorder.stop(language);
      await handleRecognizedText(transcription.text, transcription.language);
    } catch (error) {
      const message = error instanceof SpeechServiceError
        ? error.message
        : 'I couldn’t understand the audio. Please try again.';
      setErrorMsg(message);
      setVoiceState('idle');
    }
  }, [handleRecognizedText, voiceState]);

  const handleTextInput = useCallback(() => {
    const text = textInput.trim();
    if (!text) return;
    setTextInput('');
    void handleRecognizedText(text, undefined, false);
  }, [textInput, handleRecognizedText]);

  // Stop speech when language changes
  useEffect(() => {
    stopSpeech();
    setResponseLanguage(language);
  }, [language]);

  const connModes: { mode: ConnectivityMode; icon: typeof Wifi; label: string; desc: string }[] = [
    { mode: 'online', icon: Wifi, label: t('online'), desc: t('onlineDesc') },
    { mode: 'call', icon: Phone, label: t('callMode'), desc: t('callModeDesc') },
    { mode: 'sms', icon: MessageSquare, label: t('smsMode'), desc: t('smsModeDesc') },
  ];

  const activeConn = connModes.find(c => c.mode === connectivity) || connModes[0];
  const activeLang = LANGUAGES.find(l => l.code === language);
  const suggestions = VOICE_SUGGESTIONS[language] || VOICE_SUGGESTIONS.en;
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
        {speechSupported ? (
          <>
            {/* Mic button */}
            <button
              onClick={voiceState === 'listening' ? stopListening : startListening}
              disabled={voiceState === 'transcribing' || voiceState === 'thinking' || voiceState === 'speaking'}
              className="relative mb-4"
            >
              <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                voiceState === 'listening' ? 'bg-market animate-pulse-ring' :
                voiceState === 'transcribing' || voiceState === 'thinking' ? 'bg-trust' :
                voiceState === 'speaking' ? 'bg-brand-deep' :
                'bg-brand-deep hover:bg-brand-mid'
              }`}>
                {voiceState === 'speaking' ? (
                  <Volume2 size={36} className="text-white" />
                ) : voiceState === 'transcribing' || voiceState === 'thinking' ? (
                  <Sparkles size={36} className="text-white animate-pulse" />
                ) : (
                  <Mic size={36} className="text-white" />
                )}
              </div>
            </button>

            {/* State text */}
            <p className="text-base font-bold text-ink text-center mb-2">
               {voiceState === 'listening' ? t('listening') :
                voiceState === 'transcribing' ? t('transcribing') :
                voiceState === 'thinking' ? t('thinking') :
                voiceState === 'speaking' ? t('speaking') :
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
              <Waveform active={voiceState === 'listening' || voiceState === 'speaking'} bars={7} />
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-surface-alt flex items-center justify-center mb-3">
              <AlertCircle size={32} className="text-ink-faint" />
            </div>
            <p className="text-sm font-bold text-ink text-center mb-1">
              Voice input is unavailable on this browser
            </p>
            <p className="text-xs text-ink-soft text-center max-w-xs mb-2">
              You can type your question below instead.
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
            <span className="block text-[10px] font-bold text-market-deep/60 mb-1">{t('youSaid')}</span>
                )}
                <div className="flex items-start gap-2">
                  <span className="flex-1">{ex.text}</span>
                  {ex.role === 'assistant' && (
                    <button
                      type="button"
                      onClick={() => void speakResponse(ex.text, ex.language || responseLanguage)}
                      aria-label="Play voice response"
                      className="shrink-0 p-1 rounded-full text-brand-deep hover:bg-white/60 transition-colors"
                    >
                      <Volume2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Text input fallback */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <input
            ref={textInputRef}
            type="text"
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleTextInput(); }}
            placeholder={t('typeQuestion')}
            className="flex-1 px-4 py-3 rounded-2xl bg-surface-card border border-line text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand-mid transition-colors"
          />
          <Button
            size="md"
            variant="primary"
            onClick={handleTextInput}
            disabled={!textInput.trim() || voiceState !== 'idle'}
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
                onClick={() => void handleRecognizedText(s, undefined, false)}
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
            <p className="text-xs text-ink-soft mb-3">Language is detected automatically from each question.</p>
            <div className="grid grid-cols-2 gap-2">
              {LANGUAGES.map(lang => {
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
