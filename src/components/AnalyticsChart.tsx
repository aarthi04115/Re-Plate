import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export type ChartDataPoint = {
  date: string;
  count: number;
};

interface AnalyticsChartProps {
  title: string;
  data: ChartDataPoint[];
}

export const AnalyticsChart = ({ title, data }: AnalyticsChartProps) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="mt-8 border-t border-[var(--color-border)] pt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-[12px] font-bold text-[var(--color-text-main)] uppercase tracking-wider flex items-center gap-2">
          <span>📊</span> Analytics
        </h3>
        <button 
          onClick={() => setIsVisible(!isVisible)}
          className="text-xs bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] font-bold py-1.5 px-3 rounded-full transition-colors active:scale-95 shadow-sm"
        >
          {isVisible ? 'Hide Graph' : 'Show Graph'}
        </button>
      </div>

      <AnimatePresence>
        {isVisible && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 shadow-sm"
          >
            <h4 className="text-sm font-bold text-[var(--color-text-main)] mb-6 text-center">{title}</h4>
          
          {data.length === 0 || data.every(d => d.count === 0) ? (
            <div className="h-[250px] flex items-center justify-center text-sm font-bold text-[var(--color-text-muted)]">
              No data available
            </div>
          ) : (
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#008C44" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#008C44" stopOpacity={0}/>
                    </linearGradient>
                    <filter id="glow2" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComponentTransfer in="blur" result="glow1">
                         <feFuncA type="linear" slope="0.8" />
                      </feComponentTransfer>
                      <feMerge>
                        <feMergeNode in="glow1" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => Math.floor(val).toString()}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--color-surface)', 
                      borderColor: 'var(--color-border)',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: 'var(--color-text-main)'
                    }}
                    itemStyle={{ color: '#008C44' }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }}
                    iconType="circle"
                  />
                  
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Completed"
                    stroke="#008C44"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorGreen)"
                    filter="url(#glow2)"
                    animationDuration={1500}
                    animationEasing="ease-in-out"
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#008C44' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  </div>
  );
};
