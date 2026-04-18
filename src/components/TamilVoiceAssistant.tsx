import { useState, useEffect, useRef, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────
type AssistantState = 'idle' | 'listening' | 'processing' | 'speaking';

// ── SpeechRecognition browser type shim ──────────────────────────────────────
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// ── Tamil keyword response map ────────────────────────────────────────────────
const getTamilResponse = (transcript: string): string => {
  const t = transcript.toLowerCase();

  if (t.includes('உணவு எங்கே') || t.includes('உணவு எங்கு') || t.includes('food எங்கே'))
    return 'அருகிலுள்ள உணவுகளை இங்கே பார்க்கலாம். Available என்ற tab-ல் சென்று பாருங்கள்.';

  if (t.includes('எப்படி பெறுவது') || t.includes('எப்படி கிளைம்') || t.includes('claim எப்படி'))
    return 'Claim Food பட்டனை அழுத்தவும். அதன் பிறகு ஒரு volunteer உங்களிடம் கொண்டு வருவார்.';

  if (t.includes('volunteer') || t.includes('வருவார்') || t.includes('pickup'))
    return 'ஒரு volunteer உங்கள் உணவை உங்களிடம் கொண்டு வருவார். கொஞ்சம் காத்திருங்கள்.';

  if (t.includes('status') || t.includes('நிலை') || t.includes('எங்கே இருக்கு'))
    return 'Pending tab-ல் நிலையை பார்க்கலாம். Volunteer pickup ஆனதும் Delivering tab காட்டும்.';

  if (t.includes('நன்றி') || t.includes('thanks') || t.includes('thank you'))
    return 'நன்றி! RePlate உங்களுக்கு உதவுவதில் மகிழ்ச்சி. வேறு ஏதாவது தேவையா?';

  if (t.includes('help') || t.includes('உதவி') || t.includes('என்ன செய்யலாம்'))
    return 'நான் உங்களுக்கு உதவ தயாராக இருக்கிறேன். உணவு எங்கே, எப்படி பெறுவது என்று கேளுங்கள்.';

  if (t.includes('location') || t.includes('இடம்') || t.includes('அருகில்'))
    return 'உங்கள் இடத்தை location filter-ல் உள்ளிடவும். அருகிலுள்ள உணவுகள் தெரியும்.';

  if (t.includes('fresh') || t.includes('புதுசா') || t.includes('freshness'))
    return 'ஒவ்வொரு listing-லும் freshness hours காட்டப்படும். குறைந்த நேரமுள்ளதை முதலில் எடுங்கள்.';

  if (t.includes('வணக்கம்') || t.includes('hello') || t.includes('hi'))
    return 'வணக்கம்! நான் RePlate Tamil AI Assistant. உணவு பற்றி என்ன தெரிந்துகொள்ள விரும்புகிறீர்கள்?';

  return 'நான் உங்களுக்கு உதவ தயாராக இருக்கிறேன். தெளிவாக கேளுங்கள், நான் பதில் சொல்கிறேன்.';
};

// ── Get Tamil voice ───────────────────────────────────────────────────────────
const getTamilVoice = (): SpeechSynthesisVoice | null => {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find(v => v.lang === 'ta-IN') ||
    voices.find(v => v.lang.startsWith('ta')) ||
    voices.find(v => v.lang === 'en-IN') ||
    voices.find(v => v.lang.startsWith('en')) ||
    null
  );
};

// ── Speak in Tamil ────────────────────────────────────────────────────────────
const speakTamil = (
  text: string,
  onStart?: () => void,
  onEnd?: () => void
) => {
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  const voice = getTamilVoice();
  if (voice) utter.voice = voice;
  utter.lang = 'ta-IN';
  utter.rate = 0.88;
  utter.pitch = 1.05;
  utter.onstart = () => onStart?.();
  utter.onend = () => onEnd?.();
  window.speechSynthesis.speak(utter);
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export const TamilVoiceAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<AssistantState>('idle');
  const [transcript, setTranscript] = useState('');
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef<any>(null);

  // Load voices early
  useEffect(() => {
    window.speechSynthesis.getVoices();
    const handler = () => {};
    window.speechSynthesis.addEventListener('voiceschanged', handler);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', handler);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      recognitionRef.current?.abort();
    };
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('உங்கள் browser voice recognition-ஐ support செய்யவில்லை. Chrome பயன்படுத்தவும்.');
      return;
    }

    setError('');
    setTranscript('');
    setReply('');
    setState('listening');

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = 'ta-IN';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) final += res[0].transcript;
        else interim += res[0].transcript;
      }
      setTranscript(final || interim);
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') {
        setError('மீண்டும் முயற்சிக்கவும் — பேச்சு கேட்கவில்லை.');
      } else if (event.error === 'not-allowed') {
        setError('Microphone அனுமதி தேவை. Browser settings-ல் allow செய்யவும்.');
      } else {
        setError('பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.');
      }
      setState('idle');
    };

    recognition.onend = () => {
      setState(prev => {
        if (prev === 'listening') return 'processing';
        return prev;
      });
    };

    recognition.start();
  }, []);

  // When state goes to processing, generate + speak reply
  useEffect(() => {
    if (state !== 'processing') return;
    if (!transcript.trim()) {
      setError('மீண்டும் முயற்சிக்கவும் — பேச்சு கேட்கவில்லை.');
      setState('idle');
      return;
    }

    const response = getTamilResponse(transcript);
    setReply(response);

    // Small delay to show "Processing..." 
    const timer = setTimeout(() => {
      speakTamil(
        response,
        () => setState('speaking'),
        () => setState('idle')
      );
    }, 500);

    return () => clearTimeout(timer);
  }, [state, transcript]);

  const handleClose = () => {
    window.speechSynthesis.cancel();
    recognitionRef.current?.abort();
    setIsOpen(false);
    setState('idle');
    setTranscript('');
    setReply('');
    setError('');
  };

  const stateLabel: Record<AssistantState, string> = {
    idle: 'கேட்க தயார்',
    listening: 'கேட்கிறேன்...',
    processing: 'யோசிக்கிறேன்...',
    speaking: 'பேசுகிறேன்...',
  };

  const stateColor: Record<AssistantState, string> = {
    idle: '#22C55E',
    listening: '#3B82F6',
    processing: '#F59E0B',
    speaking: '#8B5CF6',
  };

  return (
    <>
      {/* ── Floating Trigger Button ── */}
      <button
        id="tamil-voice-assistant-btn"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-28 left-5 z-40 flex items-center gap-2 px-4 py-3 rounded-full font-bold text-sm text-white shadow-[0_8px_24px_rgba(34,197,94,0.4)] hover:scale-105 active:scale-95 transition-transform duration-200"
        style={{ background: 'linear-gradient(135deg, #22C55E, #16A34A)' }}
      >
        <span className="text-lg">🎤</span>
        <span>Tamil Assistant</span>
      </button>

      {/* ── Full-screen Modal ── */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)' }}>

          {/* Close */}
          <button
            onClick={handleClose}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white text-xl flex items-center justify-center transition-colors"
          >
            ✕
          </button>

          {/* Title */}
          <div className="text-center mb-10">
            <h2 className="text-white text-2xl font-bold tracking-tight">RePlate</h2>
            <p className="text-[#22C55E] text-sm font-semibold mt-1">Tamil Voice Assistant</p>
          </div>

          {/* ── Mic / Animation Ring ── */}
          <div className="relative flex items-center justify-center mb-10">

            {/* Outer pulse ring — only when listening */}
            {state === 'listening' && (
              <>
                <div className="absolute w-48 h-48 rounded-full opacity-20 animate-ping"
                  style={{ background: stateColor[state] }} />
                <div className="absolute w-36 h-36 rounded-full opacity-30 animate-ping"
                  style={{ background: stateColor[state], animationDelay: '0.15s' }} />
              </>
            )}

            {/* Wave bars — when speaking */}
            {state === 'speaking' && (
              <div className="absolute flex items-end gap-1" style={{ bottom: '-28px' }}>
                {[...Array(7)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 rounded-full"
                    style={{
                      background: stateColor.speaking,
                      height: `${12 + (i % 3) * 10}px`,
                      animation: `wave 0.8s ease-in-out infinite`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
            )}

            {/* Glow ring */}
            <div
              className="w-28 h-28 rounded-full flex items-center justify-center transition-all duration-500"
              style={{
                background: `radial-gradient(circle, ${stateColor[state]}33, transparent)`,
                boxShadow: `0 0 40px ${stateColor[state]}66, 0 0 80px ${stateColor[state]}22`,
                border: `2px solid ${stateColor[state]}`,
              }}
            >
              {/* Icon inside ring */}
              <span className="text-5xl select-none">
                {state === 'listening' ? '🎤' :
                 state === 'processing' ? '🤔' :
                 state === 'speaking' ? '🔊' : '🎙️'}
              </span>
            </div>
          </div>

          {/* State label */}
          <p className="text-white/70 text-sm font-semibold mb-2 mt-4 tracking-wide uppercase">
            {stateLabel[state]}
          </p>

          {/* Transcript display */}
          {transcript && (
            <div className="mx-6 max-w-sm text-center mb-3">
              <p className="text-white/50 text-[10px] uppercase tracking-wider mb-1">நீங்கள் சொன்னது</p>
              <p className="text-white font-medium text-base bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl">
                "{transcript}"
              </p>
            </div>
          )}

          {/* Reply display */}
          {reply && (
            <div className="mx-6 max-w-sm text-center mb-4">
              <p className="text-[#22C55E]/70 text-[10px] uppercase tracking-wider mb-1">Assistant பதில்</p>
              <p className="text-[#22C55E] font-semibold text-sm bg-[#22C55E]/10 border border-[#22C55E]/30 px-4 py-3 rounded-2xl leading-relaxed">
                {reply}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mx-6 max-w-sm text-center mb-4">
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 px-4 py-2.5 rounded-2xl">
                ⚠️ {error}
              </p>
            </div>
          )}

          {/* ── Main Mic Button ── */}
          <button
            onClick={startListening}
            disabled={state === 'listening' || state === 'speaking'}
            className="mt-4 px-10 py-4 rounded-full text-white font-bold text-base transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: state === 'idle' || state === 'processing'
                ? 'linear-gradient(135deg, #22C55E, #16A34A)'
                : `linear-gradient(135deg, ${stateColor[state]}, ${stateColor[state]}cc)`,
              boxShadow: `0 8px 24px ${stateColor[state]}55`,
            }}
          >
            {state === 'idle' && '🎤 பேசுங்கள்'}
            {state === 'listening' && '⏹ கேட்கிறேன்...'}
            {state === 'processing' && '⚙️ யோசிக்கிறேன்...'}
            {state === 'speaking' && '🔊 பேசுகிறேன்...'}
          </button>

          {/* Stop button when speaking */}
          {state === 'speaking' && (
            <button
              onClick={() => { window.speechSynthesis.cancel(); setState('idle'); }}
              className="mt-3 text-white/40 text-xs hover:text-white/70 transition-colors underline"
            >
              நிறுத்து
            </button>
          )}

          {/* Hint chips */}
          {state === 'idle' && (
            <div className="mt-8 flex flex-wrap justify-center gap-2 max-w-xs px-4">
              {['உணவு எங்கே?', 'எப்படி பெறுவது?', 'Status என்ன?', 'உதவி வேண்டும்'].map(hint => (
                <span key={hint} className="text-[11px] text-white/40 border border-white/10 px-3 py-1 rounded-full">
                  {hint}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Wave animation keyframes */}
      <style>{`
        @keyframes wave {
          0%, 100% { transform: scaleY(1); }
          50%       { transform: scaleY(2.2); }
        }
      `}</style>
    </>
  );
};
