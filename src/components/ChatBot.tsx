import { useState, useRef, useEffect } from 'react';

type Message = {
  id: string;
  sender: 'user' | 'bot';
  text: string;
};

export const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'bot', text: 'Hi! I am the RePlate Assistant. How can I help you today?' }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    const lowerInput = input.trim().toLowerCase();
    setInput('');

    // Predefined bot responses
    let botReply = "I am here to help you with food donation and pickup.";
    
    if (lowerInput.includes("how to donate")) {
      botReply = "Click Donor → fill food details";
    } else if (lowerInput.includes("how to volunteer")) {
      botReply = "Go to NGO/Volunteer and login";
    } else if (lowerInput.includes("how to find food")) {
      botReply = "Check nearby listings after login";
    }

    setTimeout(() => {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: botReply
      };
      setMessages(prev => [...prev, botMessage]);
    }, 500);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="mb-4 w-80 sm:w-96 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-[var(--color-primary)] to-[#008C44] p-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              <span className="text-xl">🤖</span>
              <h3 className="font-bold tracking-wide">RePlate Assistant</h3>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto h-80 space-y-4 bg-[var(--color-bg)]">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div 
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                    msg.sender === 'user' 
                      ? 'bg-[var(--color-primary)] text-white rounded-br-sm' 
                      : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-main)] rounded-bl-sm'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-[var(--color-text-muted)] mt-1 px-1">
                  {msg.sender === 'user' ? 'You' : 'Bot'}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-[var(--color-surface)] border-t border-[var(--color-border)]">
            <form onSubmit={handleSend} className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 input-field h-10 text-sm rounded-xl px-3 focus:ring-1 focus:ring-[var(--color-primary)]"
              />
              <button 
                type="submit"
                className="w-10 h-10 flex items-center justify-center bg-[var(--color-primary)] hover:bg-[#16A34A] text-white rounded-xl transition-colors shadow-sm"
              >
                ➤
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-[var(--color-primary)] hover:bg-[#16A34A] text-white rounded-full flex items-center justify-center shadow-[0_4px_14px_rgba(0, 140, 68,0.4)] transition-transform hover:scale-110 active:scale-95"
        >
          <span className="text-2xl">💬</span>
        </button>
      )}
    </div>
  );
};
