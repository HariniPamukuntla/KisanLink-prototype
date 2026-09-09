import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Volume2, Send, Sparkles, AlertCircle } from 'lucide-react';
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
import type { LanguageCode, VoiceExchange } from '../../types';

type VoiceState = 'idle' | 'listening' | 'transcribing' | 'thinking' | 'speaking';

export function VoiceScreen() {
  const { t, language, setLanguage, addHistory, voiceInputMode, setVoiceInputMode } = useApp();
  const [state, setState] = useState<VoiceState>('idle');
  const [exchanges, setExchanges] = useState<VoiceExchange[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [responseLanguage, setResponseLanguage] = useState(language);
  const [langOpen, setLangOpen] = useState(false);
  const recorderRef = useRef<SpeechRecorder | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const speakResponse = useCallback(async (answer: string, lang: LanguageCode) => {
    setState('speaking');
    try { await speakText(answer, lang); }
    catch (e) { setError(e instanceof TTSServiceError ? e.message : 'Answer generated, but voice playback is unavailable.'); }
    finally { setState('idle'); }
  }, []);

  const handleRecognizedText = useCallback(async (recognized: string, detected?: LanguageCode, shouldSpeak = false) => {
    const clean = recognized.trim();
    if (!clean) { setState('idle'); return; }
    setState('thinking');
    setError('');
    const detectedLanguage = detected || detectLanguageFromText(clean, language);
    setResponseLanguage(language);
    const user: VoiceExchange = { id: `u-${Date.now()}`, role: 'user', text: clean, timestamp: Date.now(), language: detectedLanguage };
    const next = [...exchanges, user];
    setExchanges(prev => [...prev, user]);
    try {
      const answer = await askAgriculturalAI(exchangesToMessages(next), language);
      const assistant: VoiceExchange = { id: `a-${Date.now()}`, role: 'assistant', text: answer, timestamp: Date.now(), language };
      setExchanges(prev => [...prev, assistant]);
      addHistory({ type: 'conversation', title: 'KisanVoice', summary: clean, result: answer, details: [`Language: ${LANGUAGES.find(x => x.code === language)?.name || language}`] });
      if (shouldSpeak) void speakResponse(answer, language);
      else setState('idle');
    } catch (e) {
      setError(e instanceof AIServiceError ? e.message : 'KisanVoice could not generate an answer.');
      setState('idle');
    }
  }, [addHistory, exchanges, language, speakResponse]);

  const start = useCallback(async () => {
    if (state !== 'idle') return;
    setVoiceInputMode('voice');
    setError('');
    setText('Listening… speak naturally. Pause when finished.');
    setState('listening');
    const recorder = new SpeechRecorder();
    recorderRef.current = recorder;
    try {
      await recorder.start(language, result => {
        setState('transcribing');
        setText(`Heard: ${result.text}`);
        void handleRecognizedText(result.text, result.language, true);
      });
    } catch (e) {
      setState('idle');
      setText('');
      setError(e instanceof SpeechServiceError ? e.message : 'Microphone permission is required for voice questions.');
    }
  }, [handleRecognizedText, language, setVoiceInputMode, state]);

  const stop = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder || state !== 'listening') return;
    setState('transcribing');
    setText('Transcribing your speech…');
    try { await recorder.stop(language); }
    catch (e) { setState('idle'); setText(''); setError(e instanceof SpeechServiceError ? e.message : 'I could not understand the audio. Please try again.'); }
  }, [language, state]);

  const submitTyped = useCallback(() => {
    const clean = text.trim();
    if (!clean || state !== 'idle') return;
    setVoiceInputMode('type');
    setText('');
    void handleRecognizedText(clean, undefined, false);
  }, [handleRecognizedText, setVoiceInputMode, state, text]);

  useEffect(() => {
    if (voiceInputMode === 'type') setTimeout(() => inputRef.current?.focus(), 0);
    return () => { recorderRef.current?.cancel(); stopSpeech(); };
  }, [voiceInputMode]);

  useEffect(() => { stopSpeech(); setResponseLanguage(language); }, [language]);

  const suggestions = VOICE_SUGGESTIONS[language] || VOICE_SUGGESTIONS.en;
  const active = LANGUAGES.find(x => x.code === language);

  return <div className="px-4 pt-4 pb-2 sm:px-0">
    <ScreenHeader title="KisanVoice" subtitle="Type a different question each time — answers use your live KisanLink database and current web context when relevant." />
    <div className="mb-4"><button onClick={() => setLangOpen(true)} className="rounded-full border border-line bg-surface-card px-3 py-2 text-sm font-semibold">{active?.nativeName} · {active?.name}</button></div>
    <Card className="mb-4 flex flex-col items-center py-8">
      <button type="button" onClick={state === 'listening' ? stop : start} disabled={state !== 'idle' && state !== 'listening'} className="relative mb-4"><div className={`flex h-24 w-24 items-center justify-center rounded-full ${state === 'listening' ? 'bg-market animate-pulse-ring' : 'bg-brand-deep'}`}>{state === 'thinking' || state === 'transcribing' ? <Sparkles size={36} className="animate-pulse text-white" /> : state === 'speaking' ? <Volume2 size={36} className="text-white" /> : <Mic size={36} className="text-white" />}</div></button>
      <p className="text-center text-base font-bold text-ink">{state === 'listening' ? 'Listening — pause when finished' : state === 'transcribing' ? 'Understanding your speech…' : state === 'thinking' ? 'Thinking…' : state === 'speaking' ? 'Speaking…' : t('tapToSpeak')}</p>
      <p className="mt-2 max-w-sm text-center text-xs text-ink-soft">Voice is optional. Use the text box below to ask as many different questions as you want.</p>
      {text && state !== 'idle' && <p className="mt-3 rounded-xl bg-surface-alt px-3 py-2 text-center text-sm text-ink-soft">{text}</p>}
      <Waveform active={state === 'listening' || state === 'speaking'} bars={7} />
      {error && <p className="mt-3 flex items-center gap-1 text-center text-xs text-warning"><AlertCircle size={14} />{error}</p>}
    </Card>

    {exchanges.length > 0 && <div className="mb-4 space-y-3">{exchanges.map(ex => <div key={ex.id} className={`flex ${ex.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${ex.role === 'user' ? 'bg-market-soft text-market-deep' : 'bg-brand-soft text-brand-deep'}`}><div>{ex.text}</div>{ex.role === 'assistant' && voiceInputMode === 'voice' && <button onClick={() => void speakResponse(ex.text, ex.language || responseLanguage)} className="mt-2 rounded-full p-1" aria-label="Read answer aloud"><Volume2 size={16} /></button>}</div></div>)}</div>}

    <div className="mb-4 flex gap-2">
      <input ref={inputRef} value={text} onChange={e => { setVoiceInputMode('type'); setText(e.target.value); }} onKeyDown={e => { if (e.key === 'Enter') submitTyped(); }} placeholder="Type your question — e.g. Which buyers want my crop?" className="flex-1 rounded-2xl border border-line bg-surface-card px-4 py-3 text-sm outline-none" />
      <Button onClick={submitTyped} disabled={!text.trim() || state !== 'idle'}><Send size={16} /></Button>
    </div>

    {exchanges.length === 0 && <div><p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-soft">Try asking</p><div className="flex flex-wrap gap-2">{suggestions.slice(0, 6).map((s, i) => <button key={i} onClick={() => void handleRecognizedText(s, undefined, false)} className="rounded-full border border-line bg-surface-card px-3 py-2 text-sm">{s}</button>)}</div></div>}

    {langOpen && <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"><div className="absolute inset-0 bg-ink/40" onClick={() => setLangOpen(false)} /><div className="relative w-full max-w-md rounded-t-3xl bg-surface-card p-5 sm:rounded-3xl"><h3 className="text-lg font-bold">{t('selectLanguage')}</h3><div className="mt-3 grid grid-cols-2 gap-2">{LANGUAGES.map(l => <button key={l.code} onClick={() => { setLanguage(l.code as LanguageCode); setLangOpen(false); }} className="rounded-xl border border-line p-3 text-left">{l.nativeName} · {l.name}</button>)}</div></div></div>}
  </div>;
}
