import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type ToastType = 'success' | 'info' | 'error';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
let _addToast: ((msg: string, type?: ToastType) => void) | null = null;

export function toast(message: string, type: ToastType = 'success') {
  _addToast?.(message, type);
}

// ── Provider / Renderer ───────────────────────────────────────────────────────
export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  _addToast = (message: string, type: ToastType = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };

  const icons: Record<ToastType, string> = {
    success: '✅',
    info: '🔔',
    error: '❌',
  };

  const colors: Record<ToastType, string> = {
    success: 'border-[#008C44] bg-[rgba(0, 140, 68,0.1)]',
    info: 'border-blue-500 bg-blue-500/10',
    error: 'border-red-500 bg-red-500/10',
  };

  const textColors: Record<ToastType, string> = {
    success: 'text-[#008C44]',
    info: 'text-blue-400',
    error: 'text-red-400',
  };

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 w-[90%] max-w-[380px] pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl backdrop-blur-sm ${colors[t.type]}`}
          >
            <span className="text-lg shrink-0">{icons[t.type]}</span>
            <span className={`text-sm font-bold ${textColors[t.type]}`}>{t.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
