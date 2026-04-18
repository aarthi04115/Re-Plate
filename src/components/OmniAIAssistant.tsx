import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, Send, Volume2, VolumeX } from './Icons';
import { supabase } from '../services/supabaseClient';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  image?: string;
  lang?: string;
}

// Browser Speech APIs
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export default function OmniAIAssistant({ role }: { role: 'volunteer' | 'ngo' | 'donor' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [language, setLanguage] = useState('ta-IN'); 
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const GEMINI_KEY = "AIzaSyCPJRare7iHyOV83y5pvB9NyIwV0BqYDms";

  const recognition = useRef<any>(null);
  const synth = useRef<SpeechSynthesis | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize Speech
  useEffect(() => {
    if (SpeechRecognition) {
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.interimResults = false;

      recognition.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        handleSend(transcript);
      };

      recognition.current.onerror = () => {
        setIsListening(false);
      };
    }
    synth.current = window.speechSynthesis;

    synth.current = window.speechSynthesis;
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const speak = useCallback((text: string, lang: string) => {
    if (!synth.current || isMuted) return;
    synth.current.cancel(); 
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Find the best matching voice for the language
    const voices = synth.current.getVoices();
    const voice = voices.find(v => v.lang.startsWith(lang.split('-')[0])) || voices.find(v => v.lang.includes(lang.split('-')[0]));
    if (voice) utterance.voice = voice;
    
    utterance.lang = lang;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    synth.current.speak(utterance);
  }, [isMuted]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result?.toString().split(',')[1] || '');
      reader.onerror = error => reject(error);
    });
  };

  // THE BRAIN - Context Aware Logic (Gemini Proxy)
  const processMessage = async (text: string) => {
    // Fetch live context (listings)
    const { data: donations } = await supabase.from('donations').select('*');
    const available = donations?.filter((d: any) => d.status === 'available') || [];
    const contextSummary = available.map((d: any) => `- ${d.food_type} at ${d.location} (${d.quantity})`).join('\n');

    const langLabels: Record<string, string> = {
      'ta-IN': 'Tamil',
      'en-US': 'English',
      'hi-IN': 'Hindi',
      'te-IN': 'Telugu'
    };
    const targetLangLabel = langLabels[language] || 'English';

    const systemPrompt = `You are the RePlate AI Bot, a master multimodal LLM. 
Current Role: ${role}. 
Master Rule: You MUST answer in ${targetLangLabel}. 

Instructions:
1. You are conversational and smart, like ChatGPT or Gemini.
2. Provide helpful, detailed yet clear advice about food rescue.
3. If an image is provided, analyze it deeply.

Current Food Listings:
${contextSummary}`;

    const targetVoiceLang = language;
    let response = "";

    try {
      // Prepare contents for multi-turn chat
      const contents = messages.slice(-6).map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      const userParts: any[] = [{ text: text }];
      if (selectedImage) {
        const base64Data = await fileToBase64(selectedImage);
        userParts.push({
          inline_data: {
            mime_type: selectedImage.type,
            data: base64Data
          }
        });
      }
      contents.push({ role: 'user', parts: userParts });

      // USE THE NEW SECURE PROXY (Bypasses CORS locally)
      const res = await fetch(`/google-api/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
        })
      });

      if (res.ok) {
        const data = await res.json();
        response = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      } else {
        const errData = await res.json();
        console.error("Proxy Error:", errData);
      }
    } catch (err) {
      console.error("Connection Error:", err);
    }

    if (!response) {
      const useTamilManual = targetLangLabel === 'Tamil';
      if (useTamilManual) {
        response = "வணக்கம்! என்னால் இப்போது உங்களை இணைக்க முடியவில்லை. தயவுசெய்து உங்கள் இணையத்தை சரிபார்க்கவும்.";
      } else {
        response = "I am having some connection trouble with my main brain. Please check your internet or wait a moment!";
      }
    }


    const aiMsg: Message = { id: Date.now().toString(), text: response, sender: 'ai', lang: targetVoiceLang };
    setMessages(prev => [...prev, aiMsg]);
    speak(response, targetVoiceLang);
  };

  const handleSend = async (text: string) => {
    if (!text.trim() && !selectedImage) return;
    
    const userMsg: Message = { 
      id: Date.now().toString(), 
      text, 
      sender: 'user',
      image: imagePreview || undefined
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setSelectedImage(null);
    setImagePreview(null);
    
    await processMessage(text);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const toggleListen = () => {
    if (isListening) {
      recognition.current?.stop();
    } else {
      recognition.current.lang = language;
      recognition.current?.start();
      setIsListening(true);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-24 right-6 z-40 w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        style={{ background: 'linear-gradient(135deg, #008C44, #22C55E)', boxShadow: '0 8px 30px rgba(0, 140, 68, 0.4)' }}
      >
        <div className="relative">
          <span className="text-2xl animate-float">🤖</span>
          {isSpeaking && <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-ping" />}
        </div>
      </motion.button>

      {/* Assistant Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-end md:justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-[#0B0F19]/90 backdrop-blur-md"
            />

            <motion.div
              initial={{ y: 100, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 100, opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-[480px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[40px] shadow-2xl overflow-hidden flex flex-col h-[80vh] md:h-[600px]"
            >
              {/* Header */}
              <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between bg-gradient-to-r from-[var(--color-primary)]/10 to-transparent">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)] flex items-center justify-center text-2xl shadow-lg ring-4 ring-[var(--color-primary)]/20 animate-float">
                    🤖
                  </div>
                  <div>
                    <h2 className="font-bold text-[var(--color-text-main)] text-lg">RePlate AI Bot</h2>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-pulse" />
                      <span className="text-[10px] font-bold text-[var(--color-primary)] uppercase tracking-widest">Master LLM Active</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsMuted(!isMuted)} className="p-2.5 rounded-xl hover:bg-[var(--color-bg)] transition-colors">
                    {isMuted ? <VolumeX size={20} className="text-red-400" /> : <Volume2 size={20} className="text-[var(--color-primary)]" />}
                  </button>
                  <button onClick={() => setIsOpen(false)} className="p-2.5 rounded-xl hover:bg-[var(--color-bg)] transition-colors">
                    <X size={20} className="text-[var(--color-text-muted)]" />
                  </button>
                </div>
              </div>

              {/* Chat Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 hide-scrollbar">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full opacity-60 text-center px-10">
                    <div className="text-6xl mb-6">🤖</div>
                    <p className="font-bold text-[var(--color-text-main)] text-xl mb-2">Multimodal Chat Active</p>
                    <p className="text-xs text-[var(--color-text-muted)]">Upload images, send voice notes, or text in any language.</p>
                  </div>
                )}
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, x: msg.sender === 'user' ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] px-5 py-3.5 rounded-[24px] text-sm font-medium shadow-sm flex flex-col gap-2 ${
                        msg.sender === 'user'
                          ? 'bg-[var(--color-primary)] text-[#0B0F19] rounded-tr-none'
                          : 'bg-[var(--color-bg)] text-[var(--color-text-main)] border border-[var(--color-border)] rounded-tl-none'
                      }`}
                    >
                      {msg.image && (
                        <img src={msg.image} alt="User upload" className="rounded-lg max-w-full h-auto mb-1 border border-black/10" />
                      )}
                      {msg.text}
                    </div>
                  </motion.div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Language Selector */}
              <div className="px-6 pb-2 flex flex-wrap gap-2">
                <button onClick={() => setLanguage('en-US')} className={`px-4 py-1.5 rounded-full text-[10px] font-bold border transition-all ${language === 'en-US' ? 'bg-[var(--color-primary)] text-[#0B0F19] border-transparent' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border)]'}`}>ENGLISH</button>
                <button onClick={() => setLanguage('ta-IN')} className={`px-4 py-1.5 rounded-full text-[10px] font-bold border transition-all ${language === 'ta-IN' ? 'bg-[var(--color-primary)] text-[#0B0F19] border-transparent' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border)]'}`}>TAMIL</button>
                <button onClick={() => setLanguage('hi-IN')} className={`px-4 py-1.5 rounded-full text-[10px] font-bold border transition-all ${language === 'hi-IN' ? 'bg-[var(--color-primary)] text-[#0B0F19] border-transparent' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border)]'}`}>HINDI</button>
                <button onClick={() => setLanguage('te-IN')} className={`px-4 py-1.5 rounded-full text-[10px] font-bold border transition-all ${language === 'te-IN' ? 'bg-[var(--color-primary)] text-[#0B0F19] border-transparent' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border)]'}`}>TELUGU</button>
              </div>

              {/* Image Preview */}
              <AnimatePresence>
                {imagePreview && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-6 py-2 overflow-hidden">
                    <div className="relative inline-block">
                      <img src={imagePreview} className="w-20 h-20 object-cover rounded-xl border-2 border-[var(--color-primary)]" alt="Preview" />
                      <button onClick={() => { setSelectedImage(null); setImagePreview(null); }} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg">
                        <X size={14} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input Area */}
              <div className="p-6 pt-2">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                <div className="flex items-center gap-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[24px] p-1.5 pr-4 shadow-inner focus-within:border-[var(--color-primary)]/50 transition-all">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-11 h-11 rounded-2xl flex items-center justify-center bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                  >
                    <Mic size={22} className="opacity-0 absolute" /> {/* Placeholder for alignment */}
                    <div className="text-xl">📎</div>
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleListen}
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${isListening ? 'bg-red-500 animate-pulse text-white' : 'bg-[var(--color-primary)]'}`}
                  >
                    <Mic size={22} className={isListening ? "text-white" : "text-[#0B0F19]"} />
                  </motion.button>
                  
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend(inputText)}
                    placeholder={isListening ? "Listening..." : "Message bots..."}
                    className="flex-1 bg-transparent border-none outline-none text-[var(--color-text-main)] text-sm px-2"
                  />

                  <button
                    onClick={() => handleSend(inputText)}
                    className="w-10 h-10 rounded-xl bg-[var(--color-primary)] flex items-center justify-center text-[#0B0F19] hover:opacity-90 transition-opacity"
                  >
                    <Send size={18} />
                  </button>
                </div>

                {isListening && (
                   <div className="flex justify-center gap-1 mt-3">
                     {[1, 2, 3, 4, 5].map(i => (
                       <motion.div key={i} className="w-1 h-4 bg-[var(--color-primary)] rounded-full" animate={{ height: [4, 16, 4] }} transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }} />
                     ))}
                   </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
