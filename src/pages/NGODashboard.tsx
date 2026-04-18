
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Navigation, ListingCard } from '../components/Shared';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { toast } from '../components/Toast';
import ActionModal from '../components/ActionModal';
import OmniAIAssistant from '../components/OmniAIAssistant';
import type { Listing, ListingStatus } from '../types';

export default function NGODashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'available' | 'claimed' | 'completed'>('available');
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [locationFilter, setLocationFilter] = useState('');
  const [claiming, setClaiming] = useState<string | null>(null);
  const [ratingModal, setRatingModal] = useState<{ isOpen: boolean; listing: Listing | null }>({ isOpen: false, listing: null });

  const fetchData = async () => {
    const { data, error } = await supabase.from('donations').select('*');
    if (data && !error) {
      const mapped = data.map((d: any): Listing => ({
        id: d.id,
        donorId: d.donor_id,
        foodType: d.food_type,
        quantity: d.quantity,
        servings: d.servings,
        freshnessHours: d.freshness_hours,
        pickupLocation: d.location || d.pickup_location,
        description: d.description,
        status: d.status as ListingStatus,
        createdAt: d.created_at,
        claimedByVolunteerId: d.claimed_by_volunteer_id,
        acceptedByReceiverId: d.accepted_by_receiver_id,
      }));
      setAllListings(mapped);
    }
  };

  useEffect(() => {
    fetchData();
    const ch = supabase.channel('ngo-refresh')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'donations' }, (payload: any) => {
        fetchData();
        const s = payload.new?.status;
        if (s === 'available')        toast('🥗 New food posted and available!', 'info');
        else if (s === 'in_delivery') toast('🚚 A delivery is on its way!', 'info');
        else if (s === 'completed')   toast('✅ A donation was completed!', 'success');
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const available  = allListings.filter(l => l.status === 'available');
  const claimed    = allListings.filter(l => l.acceptedByReceiverId === user?.id);
  const completed  = allListings.filter(l => l.status === 'completed');

  const filteredAvailable = locationFilter.trim()
    ? available.filter(l => l.pickupLocation?.toLowerCase().includes(locationFilter.toLowerCase()))
    : available;

  const handleClaimForCommunity = async (listingId: string) => {
    if (!user || claiming) return;
    setClaiming(listingId);
    try {
      const { error } = await supabase
        .from('donations')
        .update({ status: 'pending_receiver', accepted_by_receiver_id: user.id })
        .eq('id', listingId)
        .eq('status', 'available');
      if (error) toast('Failed to claim — please try again.', 'error');
      else { toast('🏢 Claimed for your community! A volunteer will pick it up.', 'success'); fetchData(); }
    } finally { setClaiming(null); }
  };

  const handleMarkReceived = async (listingId: string) => {
    const listing = allListings.find(l => l.id === listingId);
    const { error } = await supabase
      .from('donations')
      .update({ status: 'completed' })
      .eq('id', listingId);
    if (!error) { 
      toast('✅ Marked as received by community!', 'success'); 
      fetchData(); 
      // If there was a volunteer, prompt for rating
      if (listing?.claimedByVolunteerId) {
        setRatingModal({ isOpen: true, listing });
      }
    }
  };

  const handleRateVolunteer = async (rating: number, feedback: string) => {
    if (!ratingModal.listing || !user) return;
    const { listing } = ratingModal;
    
    const { error } = await supabase.from('reviews').insert([{
      targetId: listing.claimedByVolunteerId,
      reviewerId: user.id,
      targetType: 'volunteer',
      donationId: listing.id,
      rating,
      feedback,
      createdAt: new Date().toISOString()
    }]);

    if (!error) {
      toast('⭐ Thank you for your feedback!', 'success');
      setRatingModal({ isOpen: false, listing: null });
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-32 flex flex-col">
      <Navigation title="NGO/Receiver Hub" />

      <main className="flex-grow max-w-[480px] mx-auto w-full px-5 py-2">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-[var(--color-surface)] border-t-2 border-t-purple-500 rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm">
            <span className="text-purple-400 mb-2 text-lg">📋</span>
            <span className="text-2xl font-bold text-[var(--color-text-main)] mb-1">{available.length}</span>
            <span className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Available</span>
          </div>
          <div className="bg-[var(--color-surface)] border-t-2 border-t-[#F5A623] rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm">
            <span className="text-[#F5A623] mb-2 text-lg">🤝</span>
            <span className="text-2xl font-bold text-[var(--color-text-main)] mb-1">{claimed.length}</span>
            <span className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Claimed</span>
          </div>
          <div className="bg-[var(--color-surface)] border-t-2 border-t-[var(--color-primary)] rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm">
            <span className="text-[var(--color-primary)] mb-2 text-lg">✅</span>
            <span className="text-2xl font-bold text-[var(--color-text-main)] mb-1">{completed.length}</span>
            <span className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Done</span>
          </div>
        </div>

        {/* Banner */}
        <div className="w-full bg-gradient-to-r from-purple-500/15 to-purple-500/5 border border-purple-500/20 rounded-3xl p-5 flex items-center justify-between mb-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-2xl shadow-sm animate-float">🏢</div>
            <div>
              <h2 className="text-[var(--color-text-main)] font-bold text-lg mb-0.5 tracking-tight">NGO/Receiver Dashboard</h2>
              <p className="text-[var(--color-text-muted)] text-[12px]">Claim or find food for your community</p>
            </div>
          </div>
          <div className="text-purple-400 text-xl pr-2">✨</div>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 overflow-x-auto hide-scrollbar mb-6 pb-2">
          <div onClick={() => setActiveTab('available')} className={`filter-chip shrink-0 shadow-sm ${activeTab === 'available' ? 'active' : ''}`}>
            <span className="text-xs">🍱</span> Available
            {available.length > 0 && <span className="ml-1 bg-[var(--color-primary)] text-[#0B0F19] w-4 h-4 flex items-center justify-center rounded-full text-[10px]">{available.length}</span>}
          </div>
          <div onClick={() => setActiveTab('claimed')} className={`filter-chip shrink-0 shadow-sm ${activeTab === 'claimed' ? 'active' : ''}`}>
            <span className="text-xs">🤝</span> My Claims
            {claimed.length > 0 && <span className="ml-1 bg-[#F5A623] text-[#0B0F19] w-4 h-4 flex items-center justify-center rounded-full text-[10px]">{claimed.length}</span>}
          </div>
          <div onClick={() => setActiveTab('completed')} className={`filter-chip shrink-0 shadow-sm ${activeTab === 'completed' ? 'active' : ''}`}>
            <span className="text-xs">✅</span> Completed
          </div>
        </div>

        {/* Listings Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-[0.15em]">
            {activeTab === 'available' ? 'Available Food Near You' : activeTab === 'claimed' ? 'Your Claims' : 'Received Food'}
          </h3>
          <span className="text-[11px] font-bold text-[var(--color-primary)]">
            {activeTab === 'available' ? `${filteredAvailable.length} found` : activeTab === 'claimed' ? `${claimed.length} active` : `${completed.length} total`}
          </span>
        </div>

        {/* Available Tab */}
        {activeTab === 'available' && (
          <div className="space-y-4">
            <div className="mb-4">
              <input
                type="text"
                value={locationFilter}
                onChange={e => setLocationFilter(e.target.value)}
                placeholder="📍 Filter by location (e.g. Tambaram)"
                className="input-field h-11 text-sm"
              />
              {locationFilter && (
                <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5 ml-1">
                  Showing {filteredAvailable.length} of {available.length} donations near "{locationFilter}"
                </p>
              )}
            </div>
            {filteredAvailable.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center mt-12 opacity-80">
                <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 2.5 }} className="w-16 h-16 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-3xl shadow-lg mb-4">🌾</motion.div>
                <p className="text-[var(--color-text-muted)] font-medium text-sm">
                  {locationFilter ? `No donations near "${locationFilter}".` : 'No food available right now.'}
                </p>
              </motion.div>
            ) : filteredAvailable.map((listing, i) => (
              <ListingCard
                key={listing.id} listing={listing} index={i}
                actionElement={
                  <button
                    onClick={() => handleClaimForCommunity(listing.id)}
                    disabled={claiming === listing.id}
                    className="btn-primary w-full py-2 h-auto text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {claiming === listing.id ? 'Claiming…' : '🏢 Claim for Community'}
                  </button>
                }
              />
            ))}
          </div>
        )}

        {/* Claimed Tab */}
        {activeTab === 'claimed' && (
          <div className="space-y-4">
            {claimed.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center mt-12 opacity-80">
                <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 2.5 }} className="w-16 h-16 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-3xl shadow-lg mb-4">🤝</motion.div>
                <p className="text-[var(--color-text-muted)] font-medium text-sm">No claims yet. Browse Available tab to claim food.</p>
              </motion.div>
            ) : claimed.map((listing, i) => (
              <ListingCard
                key={listing.id} listing={listing} index={i}
                actionElement={
                  listing.status === 'in_delivery' ? (
                    <button
                      onClick={() => handleMarkReceived(listing.id)}
                      className="w-full bg-[var(--color-primary)] text-[#0B0F19] hover:opacity-90 transition-all duration-300 py-3 rounded-[9999px] font-bold text-sm flex items-center justify-center gap-2 active:scale-95 shadow-[0_4px_14px_rgba(0,140,68,0.3)]"
                    >
                      <span className="text-lg leading-none">✓</span> Mark as Received
                    </button>
                  ) : (
                    <div className="w-full text-center py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full text-xs font-bold text-[var(--color-text-muted)]">
                      {listing.status === 'pending_receiver' ? '⏳ Waiting for Volunteer' : listing.status === 'completed' ? '✅ Delivered' : `📋 ${listing.status}`}
                    </div>
                  )
                }
              />
            ))}
          </div>
        )}

        {/* Completed Tab */}
        {activeTab === 'completed' && (
          <div className="space-y-4">
            {completed.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center mt-12 opacity-80">
                <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 2.5 }} className="w-16 h-16 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-3xl shadow-lg mb-4">🏆</motion.div>
                <p className="text-[var(--color-text-muted)] font-medium text-sm">No completed donations yet.</p>
              </motion.div>
            ) : completed.map((listing, i) => (
              <ListingCard key={listing.id} listing={listing} index={i} />
            ))}
          </div>
        )}
      </main>

      <ActionModal
        isOpen={ratingModal.isOpen}
        onClose={() => setRatingModal({ isOpen: false, listing: null })}
        title="Rate the Volunteer"
        subtitle={`How was the delivery by the volunteer for ${ratingModal.listing?.foodType}?`}
        onSubmit={handleRateVolunteer}
        icon="🛵"
        submitLabel="Rate Volunteer"
      />

      <OmniAIAssistant role="ngo" />
    </div>
  );
}
