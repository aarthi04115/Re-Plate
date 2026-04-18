import { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, ListingCard } from '../components/Shared';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { toast } from '../components/Toast';
import OmniAIAssistant from '../components/OmniAIAssistant';
import type { Listing, ListingStatus } from '../types';
import L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

// Custom animated delivery marker (green scooter)
const deliveryIcon = new L.DivIcon({
  className: '',
  html: `<div style="font-size:28px;filter:drop-shadow(0 2px 6px rgba(0,140,68,0.5));animation:bounce 1s infinite alternate;">🛵</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

// Base Chennai coords for mock location simulation
const PICKUP_COORDS: [number, number][] = [
  [13.0827, 80.2707],
  [13.0569, 80.2425],
  [13.0878, 80.2785],
  [13.0527, 80.2707],
  [13.0651, 80.2205],
];

// Animated marker that moves each step
function AnimatedDeliveryMarker({ listing, stepIndex }: { listing: Listing; stepIndex: number }) {
  const map = useMap();
  const baseCoord = PICKUP_COORDS[0];
  // Each step nudges the marker 0.001 degree toward destination
  const lat = baseCoord[0] + stepIndex * 0.002;
  const lng = baseCoord[1] + stepIndex * 0.002;
  const pos: [number, number] = [lat, lng];

  useEffect(() => {
    map.flyTo(pos, 14, { duration: 1.2 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  return (
    <Marker position={pos} icon={deliveryIcon}>
      <Popup>
        <div className="font-bold mb-1">🚚 Delivering: {listing.foodType}</div>
        <div className="text-xs text-gray-500">Live tracking · updated every 60s</div>
      </Popup>
    </Marker>
  );
}

export default function VolunteerDashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'map' | 'list' | 'claims' | 'rewards'>('map');
  const [pendingPickups, setPendingPickups] = useState<Listing[]>([]);
  const [myClaims, setMyClaims]       = useState<Listing[]>([]);
  const [completedDeliveries, setCompletedDeliveries] = useState(0);
  const [locationText, setLocationText] = useState('');
  const [locationDenied, setLocationDenied] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);
  // Live delivery tracking
  const [deliveryStep, setDeliveryStep] = useState(0);
  const deliveryInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.from('donations').select('*');
    if (data && !error) {
      const all: Listing[] = data.map((d: any) => ({
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
      // NGO claims food (pending_receiver) → shows up here for volunteer to pick up
      setPendingPickups(all.filter(l => l.status === 'pending_receiver'));
      setMyClaims(all.filter(l => l.claimedByVolunteerId === user.id && l.status === 'in_delivery'));
      setCompletedDeliveries(all.filter(l => l.claimedByVolunteerId === user.id && l.status === 'completed').length);
    }
  }, [user]);

  useEffect(() => {
    fetchData();

    if (user?.address) {
      setLocationText(user.address);
      setLocationDenied(false);
    } else {
      setLocationDenied(true);
    }

    const ch = supabase
      .channel('volunteer-refresh-' + user?.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'donations' }, (payload: any) => {
        const newStatus = payload.new?.status;
        const volunteerId = payload.new?.claimed_by_volunteer_id;
        if (user && volunteerId === user.id) {
          if (newStatus === 'completed') toast('🎉 Delivery marked complete! Great job!', 'success');
        }
        if (newStatus === 'pending_receiver') toast('📦 New pickup request available!', 'info');
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user, fetchData]);

  // Start live delivery tracking when volunteer has active claims
  useEffect(() => {
    if (myClaims.length > 0) {
      setDeliveryStep(0);
      deliveryInterval.current = setInterval(() => {
        setDeliveryStep(prev => {
          const next = prev + 1;
          toast(`📍 Delivery update: volunteer is en route (step ${next})`, 'info');
          return next;
        });
      }, 60_000); // every 60 seconds
    } else {
      if (deliveryInterval.current) {
        clearInterval(deliveryInterval.current);
        deliveryInterval.current = null;
      }
      setDeliveryStep(0);
    }
    return () => {
      if (deliveryInterval.current) clearInterval(deliveryInterval.current);
    };
  }, [myClaims.length]);

  const displayListings = locationText.trim()
    ? pendingPickups.filter(l => l.pickupLocation?.toLowerCase().includes(locationText.toLowerCase()))
    : pendingPickups;

  const handleAcceptPickup = async (listingId: string) => {
    if (!user || accepting) return;
    setAccepting(listingId);
    try {
      const { error } = await supabase
        .from('donations')
        .update({ status: 'in_delivery', claimed_by_volunteer_id: user.id })
        .eq('id', listingId)
        .eq('status', 'pending_receiver');
      if (error) toast('Failed to accept — please try again.', 'error');
      else { toast('🚚 Pickup accepted! Head to the donor now.', 'success'); fetchData(); }
    } finally { setAccepting(null); }
  };

  const handleMarkDelivered = async (listingId: string) => {
    const { error } = await supabase
      .from('donations')
      .update({ status: 'completed' })
      .eq('id', listingId);
    if (!error) { toast('✅ Delivery complete! You rock! 🌟', 'success'); fetchData(); }
    else toast('Failed to update.', 'error');
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-32">
      <Navigation title="Volunteer Hub" />

      <main className="max-w-[480px] mx-auto px-5 py-2">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-[var(--color-surface)] border-t-2 border-t-[#F5A623] rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm">
            <span className="text-[#F5A623] mb-2 text-lg">📦</span>
            <span className="text-2xl font-bold text-[var(--color-text-main)] mb-1">{pendingPickups.length}</span>
            <span className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Pending</span>
          </div>
          <div className="bg-[var(--color-surface)] border-t-2 border-t-blue-500 rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm">
            <span className="text-blue-400 mb-2 text-lg">🚚</span>
            <span className="text-2xl font-bold text-[var(--color-text-main)] mb-1">{myClaims.length}</span>
            <span className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Active</span>
          </div>
          <div className="bg-[var(--color-surface)] border-t-2 border-t-[var(--color-primary)] rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm">
            <span className="text-[var(--color-primary)] mb-2 text-lg">✅</span>
            <span className="text-2xl font-bold text-[var(--color-text-main)] mb-1">{completedDeliveries}</span>
            <span className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Done</span>
          </div>
        </div>

        {/* Live delivery banner when active */}
        {myClaims.length > 0 && (
          <div className="mb-4 p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center gap-3">
            <span className="text-xl animate-bounce">📍</span>
            <div>
              <p className="text-xs font-bold text-blue-400">Live Tracking Active</p>
              <p className="text-[11px] text-[var(--color-text-muted)]">Map updates every 60s · Donors & receivers are notified</p>
            </div>
            <div className="ml-auto w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-3 overflow-x-auto hide-scrollbar mb-6 pb-2">
          <div onClick={() => setActiveTab('map')} className={`filter-chip shrink-0 shadow-sm ${activeTab === 'map' ? 'active' : ''}`}>
            <span className="text-xs">🗺️</span> Map
            {myClaims.length > 0 && <span className="ml-1 w-2 h-2 rounded-full bg-blue-400 animate-pulse inline-block" />}
          </div>
          <div onClick={() => setActiveTab('list')} className={`filter-chip shrink-0 shadow-sm ${activeTab === 'list' ? 'active' : ''}`}>
            <span className="text-xs">📋</span> Pickups
            {pendingPickups.length > 0 && <span className="ml-1 bg-[#F5A623] text-[#0B0F19] w-4 h-4 flex items-center justify-center rounded-full text-[10px]">{pendingPickups.length}</span>}
          </div>
          <div onClick={() => setActiveTab('claims')} className={`filter-chip shrink-0 shadow-sm ${activeTab === 'claims' ? 'active' : ''}`}>
            <span className="text-xs">🤝</span> My Deliveries
            {myClaims.length > 0 && <span className="ml-1 bg-blue-500 text-white w-4 h-4 flex items-center justify-center rounded-full text-[10px]">{myClaims.length}</span>}
          </div>
          <div onClick={() => setActiveTab('rewards')} className={`filter-chip shrink-0 shadow-sm ${activeTab === 'rewards' ? 'active' : ''}`}>
            <span className="text-xs">🏆</span> Rewards
          </div>
        </div>

        {/* Location box */}
        {(activeTab === 'list' || activeTab === 'map') && (
          <div className="mb-6 p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[var(--color-primary)]">📍</span>
              <h4 className="text-sm font-bold text-[var(--color-text-main)]">Your Location</h4>
            </div>
            {locationDenied ? (
              <div>
                <p className="text-xs text-red-400 font-medium mb-2">Location not set — enter manually to filter nearby pickups</p>
                <input
                  type="text" value={locationText}
                  onChange={e => setLocationText(e.target.value)}
                  placeholder="e.g. Tambaram" className="input-field h-10 text-sm"
                />
              </div>
            ) : (
              <div className="bg-[var(--color-bg)] p-3 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text-muted)] font-medium">
                {locationText || 'No location set'}
              </div>
            )}
          </div>
        )}

        {/* Header */}
        {(activeTab !== 'rewards') && (
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-[0.15em]">
              {activeTab === 'map' ? 'Live Map' : activeTab === 'list' ? 'Pending Pickups' : 'My Active Deliveries'}
            </h3>
            <span className="text-[11px] font-bold text-[var(--color-primary)]">
              {activeTab === 'map' ? `${myClaims.length > 0 ? myClaims.length + ' live' : displayListings.length + ' pins'}`
                : activeTab === 'list' ? `${displayListings.length} found`
                : `${myClaims.length} active`}
            </span>
          </div>
        )}

        {/* MAP TAB — shows live delivery or pending pickups */}
        {activeTab === 'map' && (
          <div className="card shadow-sm h-[480px] overflow-hidden border">
            <MapContainer center={[13.0827, 80.2707]} zoom={12} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url={theme === 'dark'
                  ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                  : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
                attribution="&copy; OpenStreetMap"
              />

              {/* Live delivery markers — animated */}
              {myClaims.map(listing => (
                <AnimatedDeliveryMarker key={listing.id} listing={listing} stepIndex={deliveryStep} />
              ))}

              {/* Pending pickup markers (if no active delivery) */}
              {myClaims.length === 0 && displayListings.map((listing, idx) => {
                const coord = PICKUP_COORDS[idx % PICKUP_COORDS.length];
                return (
                  <Marker key={listing.id} position={coord}>
                    <Popup>
                      <div className="font-bold mb-1">{listing.foodType}</div>
                      <div className="text-sm mb-1">{listing.quantity} · {listing.servings} servings</div>
                      <div className="text-xs mb-2 text-gray-500">📍 {listing.pickupLocation}</div>
                      <button
                        onClick={() => handleAcceptPickup(listing.id)}
                        disabled={accepting === listing.id}
                        className="bg-[#008C44] text-white font-bold text-xs px-3 py-1.5 rounded-full w-full disabled:opacity-60"
                      >
                        {accepting === listing.id ? 'Accepting…' : 'Accept Pickup'}
                      </button>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        )}

        {/* LIST TAB — pending pickups (NGO claimed, waiting for volunteer) */}
        {activeTab === 'list' && (
          <div className="space-y-4">
            {displayListings.length === 0 ? (
              <div className="flex flex-col items-center justify-center mt-12 opacity-80">
                <div className="w-16 h-16 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-3xl shadow-lg mb-4 animate-float">📦</div>
                <p className="text-[var(--color-text-muted)] font-medium text-sm">
                  {locationText ? `No pickups near "${locationText}".` : 'No food is ready for pickup right now.'}
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-1">NGO must first claim food before it appears here.</p>
              </div>
            ) : (
              displayListings.map((listing, i) => (
                <ListingCard
                  key={listing.id} listing={listing} index={i}
                  actionElement={
                    <button
                      onClick={() => handleAcceptPickup(listing.id)}
                      disabled={accepting === listing.id}
                      className="btn-primary py-2.5 h-auto text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {accepting === listing.id ? 'Accepting…' : '🚚 Accept Pickup'}
                    </button>
                  }
                />
              ))
            )}
          </div>
        )}

        {/* CLAIMS TAB — my in-delivery */}
        {activeTab === 'claims' && (
          <div className="space-y-4">
            {myClaims.length === 0 ? (
              <div className="flex flex-col items-center justify-center mt-12 opacity-80">
                <div className="w-16 h-16 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-3xl shadow-lg mb-4 animate-float">🛵</div>
                <p className="text-[var(--color-text-muted)] font-medium text-sm">No active deliveries. Accept a pickup first!</p>
              </div>
            ) : (
              myClaims.map((listing, i) => (
                <ListingCard
                  key={listing.id} listing={listing} index={i}
                  actionElement={
                    <button
                      onClick={() => handleMarkDelivered(listing.id)}
                      className="w-full bg-[var(--color-primary)] text-[#0B0F19] hover:opacity-90 transition-all duration-300 py-3 rounded-[9999px] font-bold text-sm flex items-center justify-center gap-2 active:scale-95 shadow-[0_4px_14px_rgba(0,140,68,0.3)]"
                    >
                      <span className="text-lg leading-none">✓</span> Mark as Delivered
                    </button>
                  }
                />
              ))
            )}
          </div>
        )}

        {/* REWARDS TAB */}
        {activeTab === 'rewards' && (
          <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
            <div className="bg-gradient-to-br from-[rgba(245,166,35,0.15)] to-[rgba(245,166,35,0.05)] border border-[#F5A623]/30 rounded-3xl p-6 text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-[#F5A623]/20 flex items-center justify-center text-4xl mb-3 shadow-[0_0_20px_rgba(245,166,35,0.3)] animate-float">🏆</div>
              <h3 className="text-xl font-bold text-[var(--color-text-main)] mb-1">Level {Math.floor(completedDeliveries / 10) + 1} Hero</h3>
              <p className="text-sm text-[var(--color-text-muted)] mb-4">{completedDeliveries} / {(Math.floor(completedDeliveries / 10) + 1) * 10} deliveries to next level</p>
              <div className="w-full h-3 bg-[var(--color-bg)] rounded-full overflow-hidden border border-[var(--color-border)]">
                <div
                  className="h-full bg-gradient-to-r from-[#F5A623] to-[#FFCF5C] transition-all duration-1000"
                  style={{ width: `${(completedDeliveries % 10) * 10}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 flex flex-col justify-center items-center">
                <span className="text-2xl mb-2">⭐</span>
                <span className="text-lg font-bold text-[var(--color-text-main)] mb-0.5">4.9 / 5</span>
                <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-bold">Feedback</span>
              </div>
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 flex flex-col justify-center items-center">
                <span className="text-2xl mb-2">💖</span>
                <span className="text-lg font-bold text-[var(--color-text-main)] mb-0.5">{completedDeliveries * 25} pts</span>
                <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-bold">Earned</span>
              </div>
            </div>

            <h4 className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-[0.15em] mt-6 mb-3 px-2">Achievements</h4>
            <div className="space-y-3">
              {[
                { title: 'First Drop-off', desc: 'Complete 1 delivery', done: completedDeliveries >= 1, emoji: '🌱' },
                { title: 'Community Pillar', desc: 'Complete 10 deliveries', done: completedDeliveries >= 10, emoji: '🏛️' },
                { title: 'Speedy Saver', desc: 'Deliver within 30 mins', done: false, emoji: '⚡' }
              ].map((ach, i) => (
                <div key={i} className={`p-4 rounded-2xl flex items-center gap-4 border ${ach.done ? 'bg-[rgba(0,140,68,0.1)] border-[#008C44]/30' : 'bg-[var(--color-surface)] border-[var(--color-border)] opacity-60'}`}>
                  <span className={`text-2xl ${!ach.done && 'grayscale'}`}>{ach.emoji}</span>
                  <div className="flex-1">
                    <h5 className={`font-bold text-sm ${ach.done ? 'text-[var(--color-text-main)]' : 'text-[var(--color-text-muted)]'}`}>{ach.title}</h5>
                    <p className="text-[11px] text-[var(--color-text-muted)]">{ach.desc}</p>
                  </div>
                  {ach.done && <span className="text-[#008C44]">✓</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <OmniAIAssistant role="volunteer" />
    </div>
  );
}
