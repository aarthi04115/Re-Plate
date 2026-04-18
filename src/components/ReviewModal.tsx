import { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { toast } from './Toast';
import type { Listing } from '../types';

interface ReviewModalProps {
  listing: Listing;
  onClose: () => void;
  onSuccess: () => void;
}

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent!'];
const QUICK_TAGS = [
  { label: 'Fresh food 👍', positive: true },
  { label: 'Good quantity 📦', positive: true },
  { label: 'On time 🕐', positive: true },
  { label: 'Poor quality 👎', positive: false },
  { label: 'Stale food ⚠️', positive: false },
];

export const ReviewModal = ({ listing, onClose, onSuccess }: ReviewModalProps) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!rating) { toast('Please select a star rating first!', 'error'); return; }
    if (!user) return;

    setSubmitting(true);
    try {
      // Prevent duplicate review for same donation
      const { data: existing } = await supabase
        .from('reviews')
        .select('id')
        .eq('donation_id', listing.id)
        .eq('receiver_id', user.id)
        .maybeSingle();

      if (existing) {
        toast('You have already reviewed this donation.', 'info');
        onClose();
        return;
      }

      const { error } = await supabase.from('reviews').insert([{
        donor_id: listing.donorId,
        receiver_id: user.id,
        donation_id: listing.id,
        rating,
        feedback: feedback.trim() || null,
      }]);

      if (error) {
        toast('Failed to submit: ' + error.message, 'error');
      } else {
        toast('⭐ Review submitted! Thank you for the feedback!', 'success');
        onSuccess();
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const appendTag = (tag: string) => {
    setFeedback(prev => prev ? `${prev}, ${tag}` : tag);
  };

  const displayRating = hover || rating;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[24px] shadow-2xl w-full max-w-[400px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="p-6 border-b border-[var(--color-border)] text-center">
          <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-3xl mx-auto mb-3">
            ⭐
          </div>
          <h2 className="text-lg font-bold text-[var(--color-text-main)]">Rate This Donation</h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 truncate px-4">
            {listing.foodType} · {listing.pickupLocation}
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Star Rating */}
          <div className="text-center">
            <p className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
              Your Rating
            </p>
            <div className="flex justify-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(0)}
                  className="text-4xl transition-all duration-150 hover:scale-125 active:scale-95"
                >
                  <span className={displayRating >= star ? 'text-yellow-400' : 'text-[var(--color-border)]'}>
                    ★
                  </span>
                </button>
              ))}
            </div>
            <p className="text-sm font-semibold text-yellow-500 h-5">
              {LABELS[displayRating] || ''}
            </p>
          </div>

          {/* Quick Tags */}
          <div>
            <p className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
              Quick Tags
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_TAGS.map(({ label, positive }) => (
                <button
                  key={label}
                  onClick={() => appendTag(label)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all
                    ${positive
                      ? 'border-green-500/30 text-green-500 hover:bg-green-500/10'
                      : 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback textarea */}
          <div>
            <p className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
              Feedback <span className="normal-case font-normal">(optional)</span>
            </p>
            <textarea
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              maxLength={200}
              rows={3}
              placeholder="Share your experience with this donation..."
              className="input-field resize-none rounded-2xl text-sm w-full"
            />
            <p className="text-[10px] text-[var(--color-text-muted)] mt-1 text-right">
              {feedback.length}/200
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] text-sm font-bold hover:bg-[var(--color-bg)] transition-all"
            >
              Skip
            </button>
            <button
              onClick={handleSubmit}
              disabled={rating === 0 || submitting}
              className="flex-1 py-3 rounded-full bg-[var(--color-primary)] text-white text-sm font-bold hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(34,197,94,0.3)] active:scale-95"
            >
              {submitting ? 'Submitting…' : '⭐ Submit Review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Inline donor rating badge (used inside listing cards) ─────────────────────
import type { DonorRating } from '../types';

export const DonorRatingBadge = ({ rating }: { rating?: DonorRating }) => {
  if (!rating || rating.count === 0) {
    return (
      <div className="flex items-center gap-1.5 text-[var(--color-text-muted)] text-[11px]">
        <span className="text-gray-400">★</span>
        <span>New Donor</span>
      </div>
    );
  }

  const stars = Math.round(rating.avg);

  return (
    <div className="mb-3">
      {/* Avg + count row */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map(s => (
            <span key={s} className={`text-sm ${s <= stars ? 'text-yellow-400' : 'text-[var(--color-border)]'}`}>★</span>
          ))}
        </div>
        <span className="text-sm font-bold text-[var(--color-text-main)]">
          {rating.avg.toFixed(1)}
        </span>
        <span className="text-[11px] text-[var(--color-text-muted)]">
          ({rating.count} {rating.count === 1 ? 'review' : 'reviews'})
        </span>
      </div>

      {/* Recent feedback snippets */}
      {rating.recents.length > 0 && (
        <div className="space-y-1">
          {rating.recents.slice(0, 2).map((r, i) => r.feedback ? (
            <div key={i} className="text-[11px] text-[var(--color-text-muted)] bg-[var(--color-bg)] border border-[var(--color-border)] px-2.5 py-1.5 rounded-xl italic truncate">
              "{r.feedback}"
            </div>
          ) : null)}
        </div>
      )}
    </div>
  );
};
