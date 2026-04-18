import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Navigation, ListingCard } from '../components/Shared';
import { PostFoodModal } from '../components/PostFoodModal';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { toast } from '../components/Toast';
import { DonorRatingBadge } from '../components/ReviewModal';
import OmniAIAssistant from '../components/OmniAIAssistant';
import type { Listing, ListingStatus, DonorRating } from '../types';

export default function DonorDashboard() {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [myRating, setMyRating] = useState<DonorRating | null>(null);

  const fetchListings = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('donations')
      .select('*')
      .eq('donor_id', user.id)
      .order('created_at', { ascending: false });

    if (data && !error) {
      const mapped: Listing[] = data.map((d: any) => ({
        id: d.id,
        donorId: d.donor_id,
        foodType: d.food_type,
        quantity: d.quantity,
        servings: d.servings,
        freshnessHours: d.freshness_hours,
        pickupLocation: d.pickup_location,
        description: d.description,
        status: d.status as ListingStatus,
        createdAt: d.created_at,
        claimedByVolunteerId: d.claimed_by_volunteer_id,
        acceptedByReceiverId: d.accepted_by_receiver_id,
      }));
      setListings(mapped);
    }
  }, [user]);

  const fetchReviews = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .eq('donor_id', user.id)
      .order('created_at', { ascending: false });
    if (data && data.length > 0) {
      const total = data.reduce((s: number, r: any) => s + r.rating, 0);
      setMyRating({
        avg: Math.round((total / data.length) * 10) / 10,
        count: data.length,
        recents: data.slice(0, 3).map((r: any) => ({ rating: r.rating, feedback: r.feedback || '' })),
      });
    } else {
      setMyRating({ avg: 0, count: 0, recents: [] });
    }
  }, [user]);

  useEffect(() => {
    fetchListings();
    fetchReviews();

    const ch = supabase
      .channel('donations-donor-' + user?.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'donations' }, (payload: any) => {
        const donorId = payload.new?.donor_id || payload.old?.donor_id;
        if (user && donorId === user.id) {
          const newStatus = payload.new?.status;
          const prevStatus = payload.old?.status;
          if (newStatus !== prevStatus) {
            if (newStatus === 'pending_receiver') toast('📬 A receiver claimed your food!', 'info');
            else if (newStatus === 'in_delivery')  toast('🚚 Volunteer picked up your food!', 'info');
            else if (newStatus === 'completed')    toast('🎉 Your food was delivered!', 'success');
          }
        }
        fetchListings();
      })
      .subscribe();

    const rch = supabase
      .channel('reviews-donor-' + user?.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reviews' }, () => {
        fetchReviews();
        toast('⭐ You received a new review!', 'success');
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
      supabase.removeChannel(rch);
    };
  }, [user, fetchListings, fetchReviews]);

  const totalCount     = listings.length;
  const activeCount    = listings.filter(l => ['available', 'active', 'pending_receiver', 'in_delivery'].includes(l.status)).length;
  const completedCount = listings.filter(l => l.status === 'completed').length;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-32">
      <Navigation title="Donor Dashboard" />

      <main className="max-w-[480px] mx-auto px-5 py-2">
        {/* Banner */}
        <div className="w-full bg-gradient-to-r from-[rgba(0,140,68,0.15)] to-[rgba(0,140,68,0.05)] border border-[rgba(0,140,68,0.2)] rounded-3xl p-5 flex items-center justify-between mb-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-2xl shadow-sm animate-float">🍱</div>
            <div>
              <h2 className="text-[var(--color-text-main)] font-bold text-lg mb-0.5 tracking-tight">Your food saves lives!</h2>
              <p className="text-[var(--color-text-muted)] text-[12px]">{completedCount} meals delivered so far</p>
            </div>
          </div>
          <div className="text-[var(--color-primary)] text-xl pr-2">✨</div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-[var(--color-surface)] border-t-2 border-t-[var(--color-primary)] rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm">
            <span className="text-[var(--color-primary)] mb-2 text-lg">📦</span>
            <span className="text-2xl font-bold text-[var(--color-text-main)] mb-1">{totalCount}</span>
            <span className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Posted</span>
          </div>
          <div className="bg-[var(--color-surface)] border-t-2 border-t-[#F5A623] rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm">
            <span className="text-[#F5A623] mb-2 text-lg">📈</span>
            <span className="text-2xl font-bold text-[var(--color-text-main)] mb-1">{activeCount}</span>
            <span className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Active</span>
          </div>
          <div className="bg-[var(--color-surface)] border-t-2 border-t-[var(--color-primary)] rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm">
            <span className="text-[var(--color-primary)] mb-2 text-lg">✅</span>
            <span className="text-2xl font-bold text-[var(--color-text-main)] mb-1">{completedCount}</span>
            <span className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Done</span>
          </div>
        </div>

        {/* Rating card */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Your Donor Rating</h4>
            {myRating && myRating.count > 0 && (
              <span className="text-[11px] font-bold text-[var(--color-primary)] bg-[rgba(34,197,94,0.1)] px-2.5 py-1 rounded-full">
                {myRating.count} {myRating.count === 1 ? 'review' : 'reviews'}
              </span>
            )}
          </div>
          <DonorRatingBadge rating={myRating ?? undefined} />
        </div>

        {/* Listings header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-[0.15em]">Your Listings</h3>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--color-primary)] bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] px-3 py-1.5 rounded-full hover:bg-[rgba(34,197,94,0.2)] transition-all duration-200 active:scale-95"
          >
            <span className="text-sm leading-none">+</span> Post Food
          </button>
        </div>

        {/* Listings */}
        {listings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="flex flex-col items-center justify-center mt-12 cursor-pointer"
            onClick={() => setIsModalOpen(true)}
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
              className="relative mb-4"
            >
              <div className="w-16 h-16 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-3xl shadow-lg relative z-10">
                🍳
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-[#0B0F19] font-black text-lg z-20 shadow-md">
                +
              </div>
            </motion.div>
            <p className="text-[var(--color-text-muted)] font-medium text-sm">No food posted yet. Tap + to start!</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {listings.map((listing, i) => (
              <ListingCard key={listing.id} listing={listing} index={i} />
            ))}
          </div>
        )}
      </main>

      <PostFoodModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchListings} />

      {/* FAB */}
      <button
        onClick={() => setIsModalOpen(true)}
        id="fab-post-food"
        aria-label="Post Food"
        className="fixed bottom-28 right-5 z-40 w-14 h-14 rounded-full bg-[var(--color-primary)] text-white text-3xl font-bold shadow-[0_8px_24px_rgba(34,197,94,0.45)] flex items-center justify-center hover:scale-110 active:scale-95 transition-transform duration-200"
      >
        +
      </button>

      <OmniAIAssistant role="donor" />
    </div>
  );
}
