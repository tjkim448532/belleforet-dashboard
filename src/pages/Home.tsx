import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertCircle } from 'lucide-react';

interface SummaryData {
  success: boolean;
  date: string;
  ytd: { actual: number; ly_actual: number; };
  today: { actual: number; ly_actual: number; };
  hq_today: { hq: string; actual: number; qty: number }[];
  adr: number;
  avg_green_fee: number;
  weekly_trend: { day: string; fullDate: string; this_week: number; last_week: number; }[];
}

// Custom Gauge Chart Component
const SpeedometerGauge = ({ 
  value, 
  min = 0, 
  max, 
  label, 
  formatFn, 
  color = "#00e676", 
  danger = false 
}: { 
  value: number, 
  min?: number, 
  max: number, 
  label: string, 
  formatFn: (val: number) => string, 
  color?: string,
  danger?: boolean 
}) => {
  const radius = 60;
  const circumference = Math.PI * radius; // Half circle
  const safeValue = Math.min(Math.max(value, min), max);
  const percent = (safeValue - min) / (max - min);
  const dashoffset = circumference - percent * circumference;

  return (
    <div className="flex flex-col items-center justify-center relative w-full h-32">
      <div className="absolute -top-4 text-xs font-semibold text-slate-400">{label}</div>
      <svg className="w-40 h-24 overflow-visible" viewBox="0 0 140 80">
        {/* Background Track */}
        <path
          d={`M 10 70 A 60 60 0 0 1 130 70`}
          fill="none"
          stroke="#1e293b"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Progress Track */}
        <path
          d={`M 10 70 A 60 60 0 0 1 130 70`}
          fill="none"
          stroke={danger ? "#ef4444" : color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          className="transition-all duration-1000 ease-out"
        />
        {/* Needle */}
        <g 
          className="transition-transform duration-1000 ease-out origin-[70px_70px]" 
          style={{ transform: `rotate(${percent * 180 - 90}deg)` }}
        >
          <circle cx="70" cy="70" r="4" fill="#ffffff" />
          <path d="M 68 70 L 72 70 L 70 20 Z" fill="#ffffff" />
        </g>
        <text x="10" y="85" fill="#64748b" fontSize="10" textAnchor="middle">{formatFn(min)}</text>
        <text x="130" y="85" fill="#64748b" fontSize="10" textAnchor="middle">{formatFn(max)}</text>
      </svg>
      <div className="text-2xl font-black text-white -mt-2">
        {formatFn(value)}
      </div>
    </div>
  );
};

export default function Home() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  const currentDate = '2026-06-06';

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://belleforet-data.vercel.app/api/reports/home-summary?date=${currentDate}`);
        if (!res.ok) throw new Error('데이터를 불러오는데 실패했습니다.');
        const json = await res.json();
        
        if (!json.success || (json.ytd.actual === 0 && json.today.actual === 0)) {
          // Fallback with mock data structure matching the new API shape
          setData({
            success: true,
            date: currentDate,
            ytd: { actual: 12500000000, ly_actual: 11000000000 },
            today: { actual: 58200000, ly_actual: 45000000 },
            hq_today: [
              { hq: '골프', actual: 24000000, qty: 150 },
              { hq: '숙박', actual: 14500000, qty: 65 },
              { hq: '레저', actual: 10500000, qty: 420 },
              { hq: '식음', actual: 9200000, qty: 310 },
            ],
            adr: 223000,
            avg_green_fee: 160000,
            weekly_trend: [
              { day: 'Sun', fullDate: '2026-05-31', this_week: 65000000, last_week: 55000000 },
              { day: 'Mon', fullDate: '2026-06-01', this_week: 42000000, last_week: 40000000 },
              { day: 'Tue', fullDate: '2026-06-02', this_week: 38000000, last_week: 35000000 },
              { day: 'Wed', fullDate: '2026-06-03', this_week: 39000000, last_week: 36000000 },
              { day: 'Thu', fullDate: '2026-06-04', this_week: 45000000, last_week: 48000000 },
              { day: 'Fri', fullDate: '2026-06-05', this_week: 62000000, last_week: 59000000 },
              { day: 'Sat', fullDate: '2026-06-06', this_week: 58200000, last_week: 45000000 },
            ]
          });
        } else {
          setData(json);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  const formatShortCurrency = (val: number) => {
    if (val >= 100000000) return `₩${(val / 100000000).toFixed(1)}억`;
    if (val >= 10000) return `₩${(val / 10000).toFixed(0)}만`;
    return `₩${val}`;
  };

  if (loading || !data) {
    return (
      <div className="w-full h-[80vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#00e676] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Calculate variances
  const todayDiff = data.today.actual - data.today.ly_actual;
  const todayPct = data.today.ly_actual > 0 ? (todayDiff / data.today.ly_actual) * 100 : 0;
  
  const ytdDiff = data.ytd.actual - data.ytd.ly_actual;
  const ytdPct = data.ytd.ly_actual > 0 ? (ytdDiff / data.ytd.ly_actual) * 100 : 0;

  return (
    <div className="w-full max-w-[1400px] mx-auto p-4 md:p-6 bg-[#011126] min-h-screen text-slate-200">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-2 border-b border-[#1e293b]">
        <div className="flex items-center gap-3">
          <div className="bg-white text-black font-black px-2 py-1 rounded-sm text-xs">DAOL</div>
          <h1 className="text-xl font-bold tracking-wide">Sales Manager Live Monitoring</h1>
        </div>
        <div className="text-xl font-bold font-mono tracking-widest">{currentDate}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left Column */}
        <div className="lg:col-span-9 flex flex-col gap-4">
          
          {/* Top KPI Panel (Today + Gauges) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Today Sales Card */}
            <div className="bg-[#021a3a] border border-[#1e293b] p-6 rounded-md">
              <h2 className="text-sm font-bold text-slate-300 mb-6">Today's sales</h2>
              <div className="text-5xl font-black text-white tracking-tight mb-1">
                {formatShortCurrency(data.today.actual)}
              </div>
              <div className="text-sm text-slate-400 mb-8">Revenue</div>
              
              <div className={`text-sm font-bold ${todayPct >= 0 ? 'text-[#00e676]' : 'text-red-500'}`}>
                {todayPct >= 0 ? '▲' : '▼'} {Math.abs(todayPct).toFixed(1)}% vs last year
              </div>

              <div className="mt-8">
                <div className="text-3xl font-black text-white mb-1">
                  {formatShortCurrency(data.ytd.actual)}
                </div>
                <div className="text-sm text-slate-400 mb-2">YTD Revenue</div>
                <div className={`text-sm font-bold ${ytdPct >= 0 ? 'text-[#00e676]' : 'text-red-500'}`}>
                  {ytdPct >= 0 ? '▲' : '▼'} {Math.abs(ytdPct).toFixed(1)}% vs last year
                </div>
              </div>
            </div>

            {/* Gauges Card */}
            <div className="md:col-span-2 bg-[#021a3a] border border-[#1e293b] p-6 rounded-md flex flex-col">
              <h2 className="text-sm font-bold text-slate-300 mb-6">Today's performance metrics</h2>
              <div className="flex-1 flex flex-col md:flex-row items-center justify-around gap-6">
                
                <SpeedometerGauge 
                  label="YTD Target %" 
                  value={105} // Dummy target %
                  max={120} 
                  formatFn={(v) => `${v}%`}
                  color="#00e676"
                />
                
                <SpeedometerGauge 
                  label="Avg. Daily Rate (ADR)" 
                  value={data.adr} 
                  min={0}
                  max={300000} 
                  formatFn={(v) => formatShortCurrency(v)}
                  color="#3b82f6"
                />
                
                <SpeedometerGauge 
                  label="Avg. Green Fee" 
                  value={data.avg_green_fee} 
                  min={0}
                  max={250000} 
                  formatFn={(v) => formatShortCurrency(v)}
                  color="#f43f5e"
                  danger={data.avg_green_fee < 100000} // Example danger logic
                />
                
              </div>
            </div>
          </div>

          {/* Bottom Chart Panel */}
          <div className="bg-[#021a3a] border border-[#1e293b] p-6 rounded-md flex-1">
            <h2 className="text-sm font-bold text-slate-300 mb-2">Revenue this week</h2>
            <div className="flex items-center gap-4 mb-6">
              <div className="text-4xl font-black text-white">{formatShortCurrency(data.today.actual)}</div>
              <div className="text-sm text-slate-400">Today</div>
            </div>
            
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.weekly_trend} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="day" stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                  <YAxis 
                    stroke="#64748b" 
                    tick={{fill: '#64748b', fontSize: 12}} 
                    axisLine={false} 
                    tickLine={false}
                    tickFormatter={(val) => `${val / 10000}만`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '4px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(val: any) => new Intl.NumberFormat('ko-KR').format(val) + '원'}
                  />
                  <Line type="monotone" dataKey="this_week" stroke="#00e676" strokeWidth={3} dot={{r: 4, fill: '#011126', strokeWidth: 2}} name="This Week" />
                  <Line type="monotone" dataKey="last_week" stroke="#fbbf24" strokeWidth={2} dot={false} name="Last Week" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Right Column (Leaderboard) */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          
          {/* Leaderboard Panel */}
          <div className="bg-[#021a3a] border border-[#1e293b] p-6 rounded-md flex-1">
            <h2 className="text-sm font-bold text-slate-300 mb-6">Today's leaderboard</h2>
            <div className="space-y-4">
              {data.hq_today.sort((a, b) => b.actual - a.actual).map((hq, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-[#1e293b] pb-3">
                  <span className="text-slate-300 font-medium">{hq.hq}</span>
                  <span className="text-white font-mono">{formatShortCurrency(hq.actual)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Alerts Panel (mimicking the "leads" section) */}
          <div className="bg-[#021a3a] border border-[#1e293b] p-6 rounded-md relative overflow-hidden">
            <h2 className="text-sm font-bold text-slate-300 mb-6">Live Alerts</h2>
            
            <div className="flex items-end gap-3 mb-4">
              <span className="text-4xl font-black text-white">4</span>
              <span className="text-sm text-slate-400 mb-1">new reservations</span>
            </div>
            
            <div className="flex items-end gap-3 mb-4">
              <span className="text-3xl font-black text-white">1</span>
              <span className="text-sm text-slate-400 mb-1">VIP check-in</span>
            </div>

            <div className="flex items-end gap-3 border border-red-500/50 bg-red-500/10 p-3 rounded-md mt-4">
              <span className="text-3xl font-black text-white">0</span>
              <span className="text-sm text-slate-400 mb-1">system errors</span>
              <AlertCircle className="absolute bottom-4 right-4 text-red-500 w-8 h-8" />
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
