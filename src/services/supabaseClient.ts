// ============================================================
// MOCK SUPABASE CLIENT — full in-memory DB with localStorage
// Real-time simulation: in-process event bus + storage events
// ============================================================

const DONATIONS_KEY  = 'mock_donations';
const USERS_KEY      = 'mock_users';
const REVIEWS_KEY    = 'mock_reviews';

// ── Default seed data ──────────────────────────────────────
const makeDefaultDonations = () => [
  {
    id: 'd1', donor_id: 'donor-id',
    food_type: 'Fresh Rice & Dal', quantity: '15 boxes', servings: 45,
    freshness_hours: 6, location: 'Tambaram', pickup_location: 'Tambaram',
    description: 'Cooked fresh this morning', status: 'available',
    created_at: new Date().toISOString(),
    claimed_by_volunteer_id: null, accepted_by_receiver_id: null,
  },
  {
    id: 'd2', donor_id: 'donor-id',
    food_type: 'Assorted Fruits', quantity: '2 crates', servings: 40,
    freshness_hours: 24, location: 'Guindy', pickup_location: 'Guindy',
    description: 'Mixed seasonal fruits', status: 'available',
    created_at: new Date(Date.now() - 60_000).toISOString(),
    claimed_by_volunteer_id: null, accepted_by_receiver_id: null,
  },
  {
    id: 'd3', donor_id: 'donor-id',
    food_type: 'Bakery Surplus', quantity: '5 bags', servings: 15,
    freshness_hours: 12, location: 'Velachery', pickup_location: 'Velachery',
    description: 'Bread, cookies and muffins', status: 'available',
    created_at: new Date(Date.now() - 120_000).toISOString(),
    claimed_by_volunteer_id: null, accepted_by_receiver_id: null,
  },
  {
    id: 'd4', donor_id: 'donor-id',
    food_type: 'Vegetable Biryani', quantity: '10 packs', servings: 30,
    freshness_hours: 8, location: 'Adyar', pickup_location: 'Adyar',
    description: 'Hotel surplus biryani', status: 'pending_receiver',
    created_at: new Date(Date.now() - 180_000).toISOString(),
    claimed_by_volunteer_id: null, accepted_by_receiver_id: 'receiver-id',
  },
  {
    id: 'd5', donor_id: 'donor-id',
    food_type: 'Idli & Sambar', quantity: '8 boxes', servings: 24,
    freshness_hours: 4, location: 'Tambaram', pickup_location: 'Tambaram',
    description: 'Morning breakfast surplus', status: 'completed',
    created_at: new Date(Date.now() - 300_000).toISOString(),
    claimed_by_volunteer_id: 'volunteer-id', accepted_by_receiver_id: 'receiver-id',
  },
];

// ── localStorage helpers ────────────────────────────────────
function getDonations(): any[] {
  try {
    const s = localStorage.getItem(DONATIONS_KEY);
    return s ? JSON.parse(s) : makeDefaultDonations();
  } catch { return makeDefaultDonations(); }
}
function saveDonations(d: any[]) {
  localStorage.setItem(DONATIONS_KEY, JSON.stringify(d));
}
function getUsers(): Map<string, any> {
  try {
    const s = localStorage.getItem(USERS_KEY);
    const arr: any[] = s ? JSON.parse(s) : [];
    return new Map(arr.map(u => [u.id, u]));
  } catch { return new Map(); }
}
function saveUsers(m: Map<string, any>) {
  localStorage.setItem(USERS_KEY, JSON.stringify(Array.from(m.values())));
}
function getReviews(): any[] {
  try { return JSON.parse(localStorage.getItem(REVIEWS_KEY) || '[]'); }
  catch { return []; }
}
function saveReviews(r: any[]) {
  localStorage.setItem(REVIEWS_KEY, JSON.stringify(r));
}

// ── In-process event bus ───────────────────────────────────
// Every channel.on() subscriber gets called with real payload
export type RtPayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  table: string;
  new: Record<string, any>;
  old: Record<string, any>;
};
type RtCb = (payload: RtPayload) => void;

// channelName → list of callbacks
const channelSubs: Map<string, RtCb[]> = new Map();

function fireRt(table: string, payload: RtPayload) {
  // notify all channels regardless of filter (simple mock)
  channelSubs.forEach((cbs) => cbs.forEach(cb => { try { cb(payload); } catch {} }));

  // also notify other browser tabs via localStorage event
  try {
    localStorage.setItem('__rt_signal__', JSON.stringify({ table, payload, ts: Date.now() }));
  } catch {}
}

// listen to other tabs
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === '__rt_signal__' && e.newValue) {
      try {
        const { payload } = JSON.parse(e.newValue) as { table: string; payload: RtPayload };
        // De-duplicate if needed, but for mock, just fire
        channelSubs.forEach(cbs => cbs.forEach(cb => { try { cb(payload); } catch {} }));
      } catch {}
    }
  });

  // Also check periodically just in case storage events are delayed (failsafe)
  setInterval(() => {
    const s = localStorage.getItem('__rt_signal__');
    if (s) {
       // Only fire if it's new (last 2 seconds)
       const { ts } = JSON.parse(s);
       if (Date.now() - ts < 2000) {
         // This is a bit aggressive but ensures sync in flaky environments
         // channelSubs.forEach(cbs => cbs.forEach(cb => cb(payload)));
       }
    }
  }, 2000);
}

// ── Auth ───────────────────────────────────────────────────
let currentUser: any = null;
const authListeners: Set<Function> = new Set();
const notifyAuth = () => {
  const session = currentUser ? { user: currentUser } : null;
  authListeners.forEach(cb => cb('AUTH_CHANGE', session));
};

// ── SUPABASE MOCK ──────────────────────────────────────────
export const supabase = {
  // ── auth ──
  auth: {
    getSession: async () => {
      if (!currentUser) {
        try { const s = localStorage.getItem('mockUser'); if (s) currentUser = JSON.parse(s); } catch {}
      }
      return { data: { session: currentUser ? { user: currentUser } : null }, error: null };
    },
    onAuthStateChange: (event: any, cb2?: any) => {
      const cb = typeof event === 'function' ? event : cb2;
      authListeners.add(cb);
      const session = currentUser ? { user: currentUser } : null;
      setTimeout(() => cb('INITIAL_SESSION', session), 10);
      return { data: { subscription: { unsubscribe: () => authListeners.delete(cb) } } };
    },
    signInWithPassword: async ({ email, password }: any) => {
      const users = getUsers();
      const found = Array.from(users.values()).find(u => u.email === email);
      
      if (!found) {
        return { data: { user: null }, error: new Error('Invalid credentials: User not found. Please sign up first.') };
      }

      // Check if password matches if it was saved in the mock users table, else just accept the valid email.
      if (found.password && found.password !== password) {
        return { data: { user: null }, error: new Error('Invalid password.') };
      }

      currentUser = { id: found.id, email: found.email, role: found.role };
      localStorage.setItem('mockUser', JSON.stringify(currentUser));
      notifyAuth();
      return { data: { user: currentUser }, error: null };
    },
    signUp: async ({ email, password, role }: any) => {
      const users = getUsers();
      const id = 'user-' + Date.now();
      const newUser = { id, email, password: password || 'password', role: role || 'donor' };
      users.set(id, newUser);
      saveUsers(users);
      
      currentUser = { id, email, role: newUser.role };
      localStorage.setItem('mockUser', JSON.stringify(currentUser));
      notifyAuth();
      return { data: { user: currentUser }, error: null };
    },
    signOut: async () => {
      currentUser = null;
      localStorage.removeItem('mockUser');
      notifyAuth();
      return { error: null };
    },
  },

  // ── channels ──
  channel: (name: string) => {
    if (!channelSubs.has(name)) channelSubs.set(name, []);

    const obj: any = {
      on: (_type: string, _filter: any, cb: RtCb) => {
        channelSubs.get(name)!.push(cb);
        return obj;
      },
      subscribe: () => obj,
      unsubscribe: () => { channelSubs.delete(name); },
    };
    return obj;
  },
  removeChannel: (ch: any) => { try { ch?.unsubscribe?.(); } catch {} },

  // ── from(table) ──
  from: (table: string) => {
    let _filters: Record<string, any> = {};

    const chain: any = {
      select: () => chain,
      order:  () => chain,
      eq: (k: string, v: any) => { _filters[k] = v; return chain; },

      // INSERT
      insert: (rows: any[]) => {
        if (table === 'users') {
          const users = getUsers();
          rows.forEach(u => users.set(u.id, u));
          saveUsers(users);
          if (currentUser && rows[0]?.id === currentUser.id) {
            currentUser.role = rows[0].role;
            localStorage.setItem('mockUser', JSON.stringify(currentUser));
          }
        }
        if (table === 'donations') {
          const donations = getDonations();
          const newRows = rows.map(r => ({
            ...r,
            id: r.id || 'd-' + Date.now() + '-' + Math.random().toString(36).slice(2),
            created_at: r.created_at || new Date().toISOString(),
            status: r.status || 'available',
            location: r.pickup_location || r.location || '',
            claimed_by_volunteer_id: null,
            accepted_by_receiver_id: null,
          }));
          donations.unshift(...newRows);
          saveDonations(donations);
          newRows.forEach(r => fireRt('donations', { eventType: 'INSERT', table: 'donations', new: r, old: {} }));
        }
        if (table === 'reviews') {
          const reviews = getReviews();
          reviews.push(...rows);
          saveReviews(reviews);
          rows.forEach(r => fireRt('reviews', { eventType: 'INSERT', table: 'reviews', new: r, old: {} }));
        }
        return { select: () => ({ single: async () => ({ data: rows[0], error: null }) }), then: (res: any) => res({ data: rows, error: null }) };
      },

      // UPDATE
      update: (updateData: any) => {
        const uf: Record<string, any> = {};
        const uc: any = {
          eq: (k: string, v: any) => { uf[k] = v; return uc; },
          then: (resolve: any) => {
            if (table === 'donations') {
              const donations = getDonations();
              donations.forEach((d, i) => {
                const matches = Object.entries(uf).every(([k, v]) => d[k] === v);
                if (matches) {
                  const oldRow = { ...donations[i] };
                  donations[i] = { ...d, ...updateData };
                  saveDonations(donations);
                  fireRt('donations', { eventType: 'UPDATE', table: 'donations', new: donations[i], old: oldRow });
                }
              });
            }
            resolve({ error: null });
          },
        };
        return uc;
      },

      // DELETE
      delete: () => ({
        eq: (k: string, v: any) => {
          if (table === 'donations') {
            const donations = getDonations();
            const removed = donations.find(d => d[k] === v);
            const filtered = donations.filter(d => d[k] !== v);
            saveDonations(filtered);
            if (removed) fireRt('donations', { eventType: 'DELETE', table: 'donations', new: {}, old: removed });
          }
          return { then: (res: any) => res({ error: null }) };
        },
      }),

      // single (users lookup)
      single: async () => {
        if (table === 'users') {
          const uid = _filters['id'] || currentUser?.id;
          const users = getUsers();
          const userObj = users.get(uid);
          if (userObj) {
            // BACKWARD COMPATIBILITY: Treat 'receiver' users as 'ngo' for the new unified dashboard
            if (userObj.role === 'receiver') userObj.role = 'ngo';
            return { data: userObj, error: null };
          }
          
          return { data: null, error: new Error('User not found') };
        }
        return { data: null, error: null };
      },

      // then (list query)
      then: (resolve: any) => {
        if (table === 'donations') {
          const all = getDonations();
          const filtered = Object.keys(_filters).length
            ? all.filter(d => Object.entries(_filters).every(([k, v]) => d[k] === v))
            : all;
          resolve({ data: filtered, error: null });
        } else if (table === 'users') {
          resolve({ data: Array.from(getUsers().values()), error: null });
        } else if (table === 'reviews') {
          const all = getReviews();
          const filtered = Object.keys(_filters).length
            ? all.filter((r: any) => Object.entries(_filters).every(([k, v]) => r[k] === v))
            : all;
          resolve({ data: filtered, error: null });
        } else {
          resolve({ data: [], error: null });
        }
      },
    };

    return chain;
  },
} as any;
