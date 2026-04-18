import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, type RtPayload } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';

type SidebarNotif = {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  color: string;         // Tailwind border-color class
  time: string;
};

function timeAgo(ts: number) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

const STATUS_META: Record<string, { emoji: string; title: string; subtitle: (food: string) => string; color: string }> = {
  INSERT: { emoji: '🥗', title: 'Donor Posted Food', subtitle: (f) => `${f} is now available!`, color: 'border-[#008C44]' },
  available_posted: { emoji: '🥗', title: 'Donor Posted Food', subtitle: (f) => `${f} is now available!`, color: 'border-[#008C44]' },
  pending_receiver: { emoji: '🏢', title: 'NGO Claimed Food', subtitle: (f) => `An NGO claimed ${f} for their community. Awaiting Volunteer.`, color: 'border-[#9b59b6]' },
  in_delivery: { emoji: '🚚', title: 'Volunteer On the Way', subtitle: (f) => `A Volunteer picked up ${f} and is delivering it!`, color: 'border-[#F5A623]' },
  completed: { emoji: '🎉', title: 'Volunteer Delivered!', subtitle: (f) => `Volunteer successfully delivered ${f}!`, color: 'border-[#008C44]' },
};

export const RealtimeSidebar = () => {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState<SidebarNotif[]>([]);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const addNotif = (payload: RtPayload) => {
    const food = payload.new?.food_type || payload.old?.food_type || 'Food';
    let key = '';

    if (payload.eventType === 'INSERT') {
      key = 'INSERT';
    } else if (payload.eventType === 'UPDATE') {
      key = payload.new?.status || '';
    } else {
      return;
    }

    const meta = STATUS_META[key];
    if (!meta) return;

    const n: SidebarNotif = {
      id: Date.now() + '-' + Math.random(),
      emoji: meta.emoji,
      title: meta.title,
      subtitle: meta.subtitle(food),
      color: meta.color,
      time: timeAgo(Date.now()),
    };

    setNotifs(prev => [n, ...prev].slice(0, 10));
    setUnreadCount(c => c + 1);
  };

  useEffect(() => {
    const ch = supabase
      .channel('rt-sidebar-global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'donations' }, (payload: any) => {
        addNotif(payload as RtPayload);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  // Close panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Update relative times every minute
  useEffect(() => {
    const iv = setInterval(() => {
      setNotifs(prev => [...prev]); // re-render to update "time ago"
    }, 60_000);
    return () => clearInterval(iv);
  }, []);

  return (
    <>
      {/* Bell button — always visible */}
      <button
        id="rt-bell-btn"
        onClick={() => { setOpen(o => !o); setUnreadCount(0); }}
        className="fixed top-6 left-6 z-50 w-11 h-11 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center shadow-lg hover:border-[#008C44] transition-all duration-200 active:scale-95"
        aria-label="Notifications"
      >
        <span className="text-lg leading-none">🔔</span>
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#008C44] text-[#0B0F19] text-[10px] font-black flex items-center justify-center shadow"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Notification panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, x: -20, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed top-20 left-4 z-50 w-[300px] max-h-[70vh] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <span className="text-sm">🔔</span>
                <h4 className="text-sm font-bold text-[var(--color-text-main)]">Live Updates</h4>
                {notifs.length > 0 && (
                  <span className="bg-[rgba(0,140,68,0.15)] text-[#008C44] text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {notifs.length}
                  </span>
                )}
              </div>
              <button
                onClick={() => setNotifs([])}
                className="text-[10px] font-bold text-[var(--color-text-muted)] hover:text-red-400 transition-colors"
              >
                Clear all
              </button>
            </div>

            {/* Notif list */}
            <div className="overflow-y-auto flex-1 p-2 space-y-2">
              <AnimatePresence>
                {notifs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3 opacity-60">
                    <span className="text-3xl">💤</span>
                    <p className="text-xs text-[var(--color-text-muted)] font-medium text-center">
                      No updates yet.<br />Actions will appear here in real-time.
                    </p>
                  </div>
                ) : (
                  notifs.map(n => (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className={`flex gap-3 p-3 rounded-xl bg-[var(--color-bg)] border-l-4 ${n.color} cursor-default hover:bg-[var(--color-surface)] transition-colors relative group`}
                    >
                      <span className="text-xl shrink-0 mt-0.5">{n.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[var(--color-text-main)] leading-tight">{n.title}</p>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 leading-snug">{n.subtitle}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] mt-1 opacity-60">{n.time}</p>
                      </div>
                      <button
                        onClick={() => setNotifs(prev => prev.filter(x => x.id !== n.id))}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-text-muted)] hover:text-red-400 text-sm"
                      >
                        ×
                      </button>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="border-t border-[var(--color-border)] px-4 py-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#008C44] animate-pulse" />
              <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Live Connected</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stack toast-style popups for latest notif (when panel closed) */}
      {!open && (
        <div className="fixed top-20 left-4 z-40 flex flex-col gap-2 pointer-events-none w-[260px]">
          <AnimatePresence>
            {notifs.slice(0, 1).map(n => (
              <motion.div
                key={n.id + '-popup'}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.35 }}
                className={`flex gap-2 p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] border-l-4 ${n.color} shadow-xl pointer-events-auto`}
              >
                <span className="text-base shrink-0">{n.emoji}</span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-[var(--color-text-main)] leading-tight truncate">{n.title}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)] truncate">{n.subtitle}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </>
  );
};
