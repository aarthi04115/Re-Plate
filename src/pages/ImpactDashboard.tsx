import { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Navigation } from '../components/Shared';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';

interface ChartDataPoint {
  date: string;
  donations: number;
}

const CountUp = ({ to, delay = 0 }: { to: number, delay?: number }) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, Math.round);

  useEffect(() => {
    const animation = animate(count, to, { duration: 1.2, delay, ease: [0.4, 0, 0.2, 1] });
    return animation.stop;
  }, [to]);

  return <motion.span>{rounded}</motion.span>;
};

export default function ImpactDashboard() {
  const { user } = useAuth();
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalDonations, setTotalDonations] = useState(0);
  const [peakDay, setPeakDay] = useState('—');
  const [activeDays, setActiveDays] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);

      const { data, error } = await supabase
        .from('donations')
        .select('created_at')
        .eq('donor_id', user.id);

      if (data && !error) {
        const today = new Date();
        const buckets: Record<string, number> = {};
        for (let i = 29; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          buckets[d.toISOString().slice(0, 10)] = 0;
        }
        data.forEach((row: { created_at: string }) => {
          const key = row.created_at.slice(0, 10);
          if (key in buckets) buckets[key]++;
        });

        const points = Object.entries(buckets).map(([date, count]) => ({
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          donations: count,
        }));

        setChartData(points);
        const total = points.reduce((s, p) => s + p.donations, 0);
        setTotalDonations(total);
        setActiveDays(points.filter(p => p.donations > 0).length);
        const peak = points.reduce((a, b) => (b.donations > a.donations ? b : a), points[0]);
        if (peak && peak.donations > 0) setPeakDay(peak.date);
      } else if (user.role === 'ngo') {
        const today = new Date();
        const buckets: Record<string, number> = {};
        for (let i = 29; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          buckets[d.toISOString().slice(0, 10)] = 0;
        }

        // Mock aggregated activity for NGO
        const mockPoints = Object.keys(buckets).map((date, idx) => ({
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          donations: Math.floor(Math.random() * 5) + (idx % 3 === 0 ? 2 : 0),
        }));

        setChartData(mockPoints);
        const total = mockPoints.reduce((s, p) => s + p.donations, 0);
        setTotalDonations(total);
        setActiveDays(mockPoints.filter(p => p.donations > 0).length);
        const peak = mockPoints.reduce((a, b) => (b.donations > a.donations ? b : a), mockPoints[0]);
        if (peak && peak.donations > 0) setPeakDay(peak.date);
      }
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const topDonors = [
    { name: 'Fresh Bakery', value: 42 },
    { name: 'Green Grocers', value: 38 },
    { name: 'Hotel Grand', value: 25 },
    { name: 'City Cafe', value: 18 }
  ];

  const topVolunteers = [
    { name: 'Alex M.', value: 55 },
    { name: 'Sarah J.', value: 41 },
    { name: 'Raj K.', value: 33 },
    { name: 'Priya S.', value: 29 }
  ];

  const noData = !loading && chartData.every(d => d.donations === 0);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-32 animate-[fadeIn_0.4s_ease-out]">
      <Navigation title="Impact" />

      <main className="max-w-[480px] mx-auto px-5 py-2">
        {/* Hero heading */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[rgba(0, 140, 68,0.12)] border border-[rgba(0, 140, 68,0.2)] mb-4 shadow-sm">
            <span className="text-3xl">📈</span>
          </div>
          <h2 className="text-2xl font-bold text-[var(--color-text-main)] mb-1">
            {user?.role === 'ngo' ? 'Community Impact' : 'Your Donation Impact'}
          </h2>
          <p className="text-[13px] text-[var(--color-text-muted)]">
            {user?.role === 'ngo' ? 'Overview of donations processed in your area' : 'Food donations over the last 30 days'}
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: 'Total', value: totalDonations, icon: '📦' },
            { label: 'Active Days', value: activeDays, icon: '📅' },
            { label: 'Peak Day', isString: true, value: peakDay, icon: '🏆', small: true },
          ].map(({ label, value, isString, icon, small }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * i, ease: [0.4, 0, 0.2, 1], duration: 0.5 }}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm border-t-2 border-t-[var(--color-primary)]"
            >
              <span className="text-lg mb-1">{icon}</span>
              <span className={`font-bold text-[var(--color-text-main)] mb-0.5 ${small ? 'text-[13px]' : 'text-xl'}`}>
                {loading ? '…' : (isString ? value : <CountUp to={value as number} delay={0.2 + (0.1 * i)} />)}
              </span>
              <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                {label}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Chart card */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text-main)]">Donations Per Day</h3>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">Last 30 days</p>
            </div>
            <div className="flex items-center gap-1.5 bg-[rgba(0, 140, 68,0.1)] px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
              <span className="text-[11px] font-bold text-[var(--color-primary)]">Live data</span>
            </div>
          </div>

          {loading ? (
            <div className="h-[260px] flex items-center justify-center">
              <div className="w-10 h-10 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : noData ? (
            <div className="h-[260px] flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[rgba(0, 140, 68,0.08)] flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-[var(--color-text-main)] mb-1">No donations yet</p>
                <p className="text-xs text-[var(--color-text-muted)]">Your activity will appear here once you post food</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="impactGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--color-primary)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComponentTransfer in="blur" result="glow1">
                       <feFuncA type="linear" slope="0.8" />
                    </feComponentTransfer>
                    <feMerge>
                      <feMergeNode in="glow1" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                  tickLine={false}
                  axisLine={false}
                  interval={6}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-surface)',
                    border: '1px solid rgba(0,140,68,0.3)',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: 'var(--color-text-main)',
                  }}
                  cursor={{ stroke: 'rgba(0,140,68,0.2)', strokeWidth: 1 }}
                  formatter={(value) => [value ?? 0, 'Donations']}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  formatter={() => 'Donations / day'}
                />
                <Area
                  type="monotone"
                  dataKey="donations"
                  stroke="#008C44"
                  strokeWidth={3}
                  fill="url(#impactGreen)"
                  filter="url(#glow)"
                  dot={false}
                  activeDot={{ r: 6, fill: '#008C44', stroke: '#0B0F19', strokeWidth: 3 }}
                  animationDuration={1500}
                  animationEasing="ease-in-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* NGO specific charts */}
        {user?.role === 'ngo' && !loading && (
          <div className="mt-6 flex flex-col gap-6">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-[var(--color-text-main)] mb-1">Top Donors</h3>
              <p className="text-[11px] text-[var(--color-text-muted)] mb-4">By total donations contributed</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topDonors} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-main)', fontSize: 11, fontWeight: 'bold' }} />
                  <Tooltip cursor={{ fill: 'rgba(0,140,68,0.1)' }} contentStyle={{ borderRadius: '12px', borderColor: 'rgba(0,140,68,0.3)', backgroundColor: 'var(--color-surface)', fontSize: '12px' }} />
                  <Bar dataKey="value" fill="#008C44" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-[var(--color-text-main)] mb-1">Top Volunteers</h3>
              <p className="text-[11px] text-[var(--color-text-muted)] mb-4">By successful deliveries completed</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topVolunteers} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-main)', fontSize: 11, fontWeight: 'bold' }} />
                  <Tooltip cursor={{ fill: 'rgba(245,166,35,0.1)' }} contentStyle={{ borderRadius: '12px', borderColor: 'rgba(245,166,35,0.3)', backgroundColor: 'var(--color-surface)', fontSize: '12px' }} />
                  <Bar dataKey="value" fill="#F5A623" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Motivational footer */}
        {!loading && !noData && (
          <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-[rgba(0,140,68,0.12)] to-[rgba(0,140,68,0.04)] border border-[rgba(0,140,68,0.2)] flex items-center gap-3">
            <span className="text-2xl">🌱</span>
            <div>
              <p className="text-sm font-bold text-[var(--color-text-main)]">Keep it up!</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Every donation makes a difference in someone's day.
              </p>
            </div>
          </div>
        )}
      </main>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
