import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import { Navigation } from '../components/Shared';
import OmniAIAssistant from '../components/OmniAIAssistant';

const roleLabel: Record<string, string> = {
  donor:     '🍱 Donor',
  volunteer: '🛵 Volunteer',
  ngo:       '🏢 NGO/Receiver',
};

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [rating, setRating] = useState({ avg: 0, count: 0 });

  useEffect(() => {
    if (!user) return;
    const fetchRating = async () => {
      const { data } = await supabase.from('reviews').select('*').eq('targetId', user.id);
      if (data && data.length > 0) {
        const total = data.reduce((sum: number, r: any) => sum + r.rating, 0);
        setRating({ avg: total / data.length, count: data.length });
      }
    };
    fetchRating();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-32">
      <Navigation title="My Profile" />

      <main className="max-w-[480px] mx-auto px-5 py-2">
        {/* Avatar card */}
        <div className="flex flex-col items-center py-8 mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#4ADE80] to-[#22C55E] flex items-center justify-center text-white font-bold text-3xl shadow-[0_0_24px_rgba(34,197,94,0.3)] mb-4">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <h2 className="text-xl font-bold text-[var(--color-text-main)]">
            {user?.name || 'Unknown User'}
          </h2>
          <span className="mt-1 text-sm font-semibold text-[var(--color-primary)]">
            {roleLabel[user?.role ?? ''] ?? user?.role ?? 'Unknown Role'}
          </span>
          {rating.count > 0 ? (
            <div className="mt-2 flex items-center gap-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-1.5 rounded-full shadow-sm">
              <span className="text-[#F5A623] text-lg">★</span>
              <span className="font-bold text-[var(--color-text-main)]">{rating.avg.toFixed(1)}</span>
              <span className="text-[11px] text-[var(--color-text-muted)] font-medium">({rating.count} reviews)</span>
            </div>
          ) : (
            <div className="mt-2 text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">No reviews yet</div>
          )}
        </div>

        {/* Info cards */}
        <div className="space-y-3 mb-8">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl px-5 py-4 flex items-center gap-4">
            <span className="text-xl shrink-0">✉️</span>
            <div>
              <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-0.5">Email</p>
              <p className="text-sm font-semibold text-[var(--color-text-main)]">{user?.email || '—'}</p>
            </div>
          </div>

          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl px-5 py-4 flex items-center gap-4">
            <span className="text-xl shrink-0">📞</span>
            <div>
              <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-0.5">Phone</p>
              <p className="text-sm font-semibold text-[var(--color-text-main)]">{user?.phone || '—'}</p>
            </div>
          </div>

          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl px-5 py-4 flex items-center gap-4">
            <span className="text-xl shrink-0">📍</span>
            <div>
              <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-0.5">Address</p>
              <p className="text-sm font-semibold text-[var(--color-text-main)]">{user?.address || '—'}</p>
            </div>
          </div>

          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl px-5 py-4 flex items-center gap-4">
            <span className="text-xl shrink-0">🎭</span>
            <div>
              <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-0.5">Role</p>
              <p className="text-sm font-semibold text-[var(--color-text-main)] capitalize">{user?.role || '—'}</p>
            </div>
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="w-full py-3 rounded-[9999px] font-bold text-sm border border-red-500/40 text-red-400 bg-red-500/8 hover:bg-red-500/15 transition-all duration-300 active:scale-95 flex items-center justify-center gap-2"
        >
          <span>🚪</span> Sign Out
        </button>
      </main>

      {user?.role && <OmniAIAssistant role={user.role as 'donor' | 'volunteer' | 'ngo'} />}
    </div>
  );
}