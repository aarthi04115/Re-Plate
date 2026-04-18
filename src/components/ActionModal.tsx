import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from './Icons';

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  onSubmit: (rating: number, feedback: string) => void;
  submitLabel?: string;
  icon?: string;
}

export default function ActionModal({
  isOpen,
  onClose,
  title,
  subtitle,
  onSubmit,
  submitLabel = 'Submit Feedback',
  icon = '⭐'
}: ActionModalProps) {
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [hoveredRating, setHoveredRating] = useState(0);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#0B0F19]/80 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
           initial={{ opacity: 0, scale: 0.9, y: 20 }}
           animate={{ opacity: 1, scale: 1, y: 0 }}
           exit={{ opacity: 0, scale: 0.9, y: 20 }}
           className="relative w-full max-w-[400px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[32px] p-6 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 flex items-center justify-center text-2xl animate-float">
               {icon}
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-[var(--color-bg)] flex items-center justify-center hover:bg-[var(--color-border)] transition-colors"
            >
              <X size={20} className="text-[var(--color-text-main)]" />
            </button>
          </div>

          <h3 className="text-xl font-bold text-[var(--color-text-main)] mb-1">{title}</h3>
          {subtitle && <p className="text-sm text-[var(--color-text-muted)] mb-6">{subtitle}</p>}

          {/* Star Rating */}
          <div className="flex justify-center gap-2 mb-8">
            {[1, 2, 3, 4, 5].map((star) => (
              <motion.button
                key={star}
                type="button"
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                onClick={() => setRating(star)}
                className="text-4xl focus:outline-none"
              >
                <span style={{
                  color: (hoveredRating || rating) >= star ? '#F5A623' : 'var(--color-border)',
                  filter: (hoveredRating || rating) >= star ? 'drop-shadow(0 0 8px rgba(245, 166, 35, 0.4))' : 'none',
                  transition: 'color 0.2s ease'
                }}>
                  ★
                </span>
              </motion.button>
            ))}
          </div>

          {/* Feedback Input */}
          <div className="space-y-2 mb-8">
            <label className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1">Comments (Optional)</label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Tell us about your experience..."
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] rounded-2xl p-4 text-sm text-[var(--color-text-main)] min-h-[100px] outline-none transition-all resize-none"
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={() => onSubmit(rating, feedback)}
            className="w-full btn-primary py-4 rounded-2xl font-bold text-sm shadow-lg shadow-[var(--color-primary)]/20"
          >
            {submitLabel}
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
