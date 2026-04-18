import type { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, Users, Clock, MapPin } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { Listing } from '../types';

// ── Navigation header ──────────────────────────────────────
export const Navigation = (_props: { title?: string; rightElement?: ReactNode }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  // Role colour accent
  const roleColor: Record<string, string> = {
    donor:     '#008C44',
    ngo:       '#8B5CF6',
    volunteer: '#F59E0B',
  };
  const accent = roleColor[user?.role ?? 'donor'] ?? '#008C44';

  return (
    <>
      <div className="z-30 px-6 pt-8 pb-4 flex items-center justify-between">
        <div>
          <p className="text-[var(--color-text-muted)] text-sm font-semibold flex items-center gap-1.5 mb-0.5">
            Good{' '}
            {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}
            {' '}<span className="text-lg">👋</span>
          </p>
          <h1 className="text-2xl font-bold text-[var(--color-text-main)] truncate max-w-[220px]">
            {user?.name?.split(' ')[0] || 'User'}
          </h1>
          {/* Role pill */}
          <span
            className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-0.5"
            style={{ background: `${accent}20`, color: accent, border: `1px solid ${accent}40` }}
          >
            {user?.role === 'donor' ? '🥗' : user?.role === 'ngo' ? '🏢' : '🛵'}
            {' '}{user?.role === 'ngo' ? 'ngo/receiver' : user?.role ?? 'user'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[#008C44] transition-all duration-300 text-[var(--color-text-main)] text-xs font-bold shadow-sm"
          >
            <span className="text-sm">{theme === 'light' ? '☀️' : '🌙'}</span>
            <span>{theme === 'light' ? 'Light' : 'Dark'}</span>
          </button>

          <div className="relative group cursor-pointer" onClick={handleLogout}>
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-[#0B0F19] font-bold text-lg shadow-md hover:scale-105 transition-transform"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accent})`, boxShadow: `0 0 15px ${accent}50` }}
            >
              {initial}
            </div>
            <div className="absolute top-14 right-0 bg-[var(--color-surface)] border border-[var(--color-border)] py-2 px-4 rounded-xl shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity whitespace-nowrap z-50 flex items-center gap-2 text-sm font-bold" style={{ color: accent }}>
              <LogOut size={16} /> Logout
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </>
  );
};

// ── Bottom navigation (role-aware) ─────────────────────────
const BottomNav = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const role = user?.role ?? 'donor';
  const homePath   = `/${role}-dashboard`;
  const impactPath = role === 'volunteer' ? '/volunteer-impact' : role === 'ngo' ? '/ngo-impact' : '/impact';

  const tabs = [
    { id: 'home',    label: 'Home',    path: homePath,    emoji: '🏠' },
    { id: 'impact',  label: 'Impact',  path: impactPath,  emoji: '📊' },
    { id: 'profile', label: 'Profile', path: '/profile',  emoji: '👤' },
  ] as const;

  const activeId =
    location.pathname === homePath   ? 'home' :
    location.pathname === impactPath ? 'impact' : 'profile';

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-[360px] h-[72px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full px-2 flex items-center justify-around shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.5)] transition-colors duration-300">
      {tabs.map(tab => {
        const active = activeId === tab.id;
        return (
          <button
            key={tab.id}
            id={`nav-${tab.id}`}
            onClick={() => navigate(tab.path)}
            className={`relative flex-1 flex flex-col items-center justify-center h-[85%] rounded-full transition-colors duration-300 ${!active && 'hover:bg-[#008C44]/10'}`}
          >
            {active && (
              <motion.div
                layoutId="nav-pill"
                className="absolute inset-x-1 inset-y-0 bg-[#008C44]/15 border border-[#008C44]/30 rounded-full z-0"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className={`relative z-10 text-xl mb-1 transition-transform duration-200 ${active ? 'scale-110' : ''}`}>
              {tab.emoji}
            </span>
            <span className={`relative z-10 text-[10px] font-bold ${active ? 'text-[#008C44]' : 'text-[var(--color-text-muted)]'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

// ── Listing card ───────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  available:       'bg-[rgba(0,140,68,0.1)] border-[rgba(0,140,68,0.3)] text-[#008C44]',
  pending_receiver:'bg-blue-500/10 border-blue-500/30 text-blue-400',
  in_delivery:     'bg-[#F5A623]/10 border-[#F5A623]/30 text-[#F5A623]',
  completed:       'bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text-muted)]',
};

const STATUS_LABELS: Record<string, string> = {
  available:       '🟢 Available',
  active:          '🟡 Active',
  pending_receiver:'📬 Pending',
  in_delivery:     '🚚 In Delivery',
  completed:       '✅ Completed',
};

export const ListingCard = ({
  listing,
  actionElement,
  index = 0,
}: {
  listing: Listing;
  actionElement?: ReactNode;
  index?: number;
}) => {
  const isHighImpact = listing.servings >= 20;
  const colorClass = STATUS_COLORS[listing.status] ?? STATUS_COLORS.available;
  const labelText  = STATUS_LABELS[listing.status] ?? listing.status;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ scale: 1.02, boxShadow: '0 4px 20px rgba(0,140,68,0.12)', borderColor: 'rgba(0,140,68,0.3)' }}
      className="card p-5 flex flex-col h-full bg-[var(--color-surface)] border-[var(--color-border)]"
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-bold text-lg text-[var(--color-text-main)] pr-2">{listing.foodType}</h3>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {isHighImpact && (
            <span className="high-impact-badge">🔥 High Impact</span>
          )}
          <span className={`text-[10px] font-bold border rounded-md px-2 py-0.5 ${colorClass}`}>
            {labelText}
          </span>
        </div>
      </div>

      <div className="space-y-2.5 mb-5 flex-grow">
        <div className="flex items-center text-sm text-[var(--color-text-muted)]">
          <Users size={15} className="text-[#008C44] mr-3 shrink-0" />
          <span><span className="font-semibold text-[var(--color-text-main)]">{listing.quantity}</span> · {listing.servings} servings</span>
        </div>
        <div className="flex items-center text-sm text-[var(--color-text-muted)]">
          <Clock size={15} className="text-[#008C44] mr-3 shrink-0" />
          <span>Fresh for {listing.freshnessHours} hrs</span>
        </div>
        <div className="flex items-center text-sm text-[var(--color-text-muted)]">
          <MapPin size={15} className="text-[#008C44] mr-3 shrink-0" />
          <span className="truncate">{listing.pickupLocation}</span>
        </div>
      </div>

      {listing.description && (
        <div className="bg-[var(--color-bg)] italic text-[var(--color-text-muted)] text-sm p-3 rounded-lg border-l-4 border-[#008C44] mb-4">
          "{listing.description}"
        </div>
      )}

      {actionElement && (
        <div className="mt-auto pt-4 border-t border-[var(--color-border)]">
          {actionElement}
        </div>
      )}
    </motion.div>
  );
};
