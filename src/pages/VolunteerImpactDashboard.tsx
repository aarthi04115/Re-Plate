import { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Navigation } from '../components/Shared';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';

interface ChartDataPoint {
  date: string;
  deliveries: number;
}

export default function VolunteerImpactDashboard() {
  const { user } = useAuth();
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalDeliveries, setTotalDeliveries] = useState(0);
  const [peakDay, setPeakDay] = useState('—');
  const [activeDays, setActiveDays] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);

      const { data, error } = await supabase
        .from('donations')
        .select('created_at, status, claimed_by_volunteer_id')
        .eq('status', 'completed')
        .eq('claimed_by_volunteer_id', user.id);

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
          deliveries: count,
        }));

        setChartData(points);
        const total = points.reduce((s, p) => s + p.deliveries, 0);
        setTotalDeliveries(total);
        setActiveDays(points.filter(p => p.deliveries > 0).length);
        const peak = points.reduce((a, b) => (b.deliveries > a.deliveries ? b : a), points[0]);
        if (peak && peak.deliveries > 0) setPeakDay(peak.date);
      }
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const noData = !loading && chartData.every(d => d.deliveries === 0);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-32 animate-[fadeIn_0.4s_ease-out]">
      <Navigation title="Impact" />

      <main className="max-w-[480px] mx-auto px-5 py-2">
        {/* Hero heading */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[rgba(0, 140, 68,0.12)] border border-[rgba(0, 140, 68,0.2)] mb-4 shadow-sm">
            <span className="text-3xl">🚴</span>
          </div>
          <h2 className="text-2xl font-bold text-[var(--color-text-main)] mb-1">
            Your Delivery Impact
          </h2>
          <p className="text-[13px] text-[var(--color-text-muted)]">
            Completed deliveries over the last 30 days
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: 'Total', value: loading ? '…' : totalDeliveries, icon: '✅' },
            { label: 'Active Days', value: loading ? '…' : activeDays, icon: '📅' },
            { label: 'Peak Day', value: loading ? '…' : peakDay, icon: '🏆', small: true },
          ].map(({ label, value, icon, small }) => (
            <div
              key={label}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm border-t-2 border-t-[#008C44]"
            >
              <span className="text-lg mb-1">{icon}</span>
              <span className={`font-bold text-[var(--color-text-main)] mb-0.5 ${small ? 'text-[13px]' : 'text-xl'}`}>
                {value}
              </span>
              <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Chart card */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text-main)]">Deliveries Per Day</h3>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">Last 30 days</p>
            </div>
            <div className="flex items-center gap-1.5 bg-[rgba(0, 140, 68,0.1)] px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-[#008C44]" />
              <span className="text-[11px] font-bold text-[#008C44]">Live data</span>
            </div>
          </div>

          {loading ? (
            <div className="h-[260px] flex items-center justify-center">
              <div className="w-10 h-10 border-2 border-[#008C44] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : noData ? (
            <div className="h-[260px] flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[rgba(0, 140, 68,0.08)] flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#008C44" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-[var(--color-text-main)] mb-1">No deliveries yet</p>
                <p className="text-xs text-[var(--color-text-muted)]">Complete deliveries to see your activity here</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="volunteerImpactGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#008C44" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#008C44" stopOpacity={0} />
                  </linearGradient>
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
                    border: '1px solid rgba(0, 140, 68,0.3)',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: 'var(--color-text-main)',
                  }}
                  cursor={{ stroke: 'rgba(0, 140, 68,0.2)', strokeWidth: 1 }}
                  formatter={(value) => [value ?? 0, 'Deliveries']}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  formatter={() => 'Deliveries / day'}
                />
                <Area
                  type="monotone"
                  dataKey="deliveries"
                  stroke="#008C44"
                  strokeWidth={2.5}
                  fill="url(#volunteerImpactGreen)"
                  dot={false}
                  activeDot={{ r: 5, fill: '#008C44', stroke: '#fff', strokeWidth: 2 }}
                  animationDuration={1000}
                  animationEasing="ease-in-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Motivational footer */}
        {!loading && !noData && (
          <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-[rgba(0, 140, 68,0.12)] to-[rgba(0, 140, 68,0.04)] border border-[rgba(0, 140, 68,0.2)] flex items-center gap-3">
            <span className="text-2xl">🌟</span>
            <div>
              <p className="text-sm font-bold text-[var(--color-text-main)]">Amazing work!</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Every delivery you complete feeds someone in need.
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
