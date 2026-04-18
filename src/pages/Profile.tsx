import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import { Navigation } from '../components/Shared';
import OmniAIAssistant from '../components/OmniAIAssistant';
import { toast } from '../components/Toast';

const roleLabel: Record<string, string> = {
  donor:     '🍱 Donor',
  volunteer: '🛵 Volunteer',
  ngo:       '🏢 NGO/Receiver',
};

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [rating, setRating] = useState({ avg: 0, count: 0 });
  const [stats, setStats] = useState({ total: 0, completed: 0 });
  const [isSwitching, setIsSwitching] = useState(false);

  const switchRole = async (newRole: 'donor' | 'volunteer' | 'ngo') => {
    if (!user || isSwitching) return;
    setIsSwitching(true);
    const { error } = await supabase.from('users').update({ role: newRole }).eq('id', user.id);
    if (!error) {
      toast(`Role switched to ${newRole.toUpperCase()}! Refreshing…`, 'success');
      setTimeout(() => window.location.reload(), 1500);
    } else {
      toast('Failed to switch role.', 'error');
      setIsSwitching(false);
    }
  };

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

    const fetchStats = async () => {
      let query = supabase.from('donations').select('*', { count: 'exact', head: true });
      
      if (user.role === 'donor')     query = query.eq('donor_id', user.id);
      else if (user.role === 'volunteer') query = query.eq('claimed_by_volunteer_id', user.id).eq('status', 'completed');
      else if (user.role === 'ngo')       query = query.eq('accepted_by_receiver_id', user.id);

      const { count } = await query;
      setStats(prev => ({ ...prev, total: count || 0 }));
    };
    fetchStats();
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

          {/* New Stats Row */}
          <div className="mt-6 grid grid-cols-2 gap-3 w-full max-w-[320px]">
            <div className="bg-[rgba(0,140,68,0.1)] border border-[rgba(0,140,68,0.2)] rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-[var(--color-primary)]">{stats.total}</p>
              <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mt-1">
                {user?.role === 'donor' ? 'Donations' : user?.role === 'volunteer' ? 'Deliveries' : 'Claims'}
              </p>
            </div>
            <div className="bg-[rgba(245,166,35,0.1)] border border-[rgba(245,166,35,0.2)] rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-[#F5A623]">{stats.total * 25}</p>
              <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mt-1">Points</p>
            </div>
          </div>
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

        {/* Development: Role Switcher */}
        <div className="mb-8 p-6 rounded-3xl bg-gradient-to-br from-[rgba(0,140,68,0.1)] to-transparent border border-[var(--color-border)] shadow-sm">
          <div className="flex items-center gap-2 mb-4">
             <span className="text-xl">🔄</span>
             <h3 className="text-sm font-bold text-[var(--color-text-main)]">Role Switcher (Testing)</h3>
          </div>
          <p className="text-[11px] text-[var(--color-text-muted)] mb-4 leading-relaxed">
            Switch between roles to test the full interconnected workflow (Donor -> NGO -> Volunteer).
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'donor', label: 'Donor', icon: '🥗' },
              { id: 'ngo', label: 'NGO Hub', icon: '🏢' },
              { id: 'volunteer', label: 'Volunteer', icon: '🛵' }
            ].map(r => (
              <button
                key={r.id}
                disabled={isSwitching || user?.role === r.id}
                onClick={() => switchRole(r.id as any)}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-300 ${user?.role === r.id ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-[#0B0F19]' : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-main)] hover:border-[var(--color-primary)] opacity-70 hover:opacity-100'}`}
              >
                <span className="text-xl mb-1">{r.icon}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider">{r.label}</span>
              </button>
            ))}
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