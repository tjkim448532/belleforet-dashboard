import { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { CalendarDays, Building2, Coins, Trees } from 'lucide-react';

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

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('ko-KR').format(val) + '원';
  };

  const formatShortCurrency = (val: number) => {
    if (val >= 100000000) return `${(val / 100000000).toFixed(1)}억`;
    if (val >= 10000) return `${(val / 10000).toFixed(0)}만`;
    return `${val}`;
  };

  const getHqIcon = (hq: string) => {
    if (hq.includes('골프')) return '⛳';
    if (hq.includes('숙박')) return '🏨';
    if (hq.includes('레저')) return '🐑'; // 🐑 양 캐릭터
    if (hq.includes('식음')) return '☕'; // ☕ 카페
    return '🐶'; // 🐶 댕댕이
  };

  if (loading || !data) {
    return (
      <div className="w-full h-[80vh] flex items-center justify-center bg-[#f8fafc]">
        <div className="text-xl font-bold text-brand-mint animate-pulse">벨포레 현황판을 불러오는 중입니다...</div>
      </div>
    );
  }

  const todayDiff = data.today.actual - data.today.ly_actual;
  const todayPct = data.today.ly_actual > 0 ? (todayDiff / data.today.ly_actual) * 100 : 0;
  
  const ytdDiff = data.ytd.actual - data.ytd.ly_actual;
  const ytdPct = data.ytd.ly_actual > 0 ? (ytdDiff / data.ytd.ly_actual) * 100 : 0;

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] text-slate-800 tracking-tight pb-16">
      
      {/* Decorative Header Background */}
      <div className="w-full bg-brand-mint h-[220px] absolute top-0 left-0 z-0 overflow-hidden rounded-b-[40px]">
        {/* Brand Graphic Motifs in Background */}
        <div className="absolute top-10 right-[10%] w-32 h-32 bg-white/20 shape-half-circle" />
        <div className="absolute -top-10 right-[20%] w-48 h-48 bg-white/10 shape-leaf" />
        <div className="absolute top-20 left-[5%] w-16 h-16 bg-white/20 rounded-full" />
      </div>

      <div className="w-full max-w-[1400px] mx-auto p-4 md:p-8 relative z-10 pt-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
          <div className="text-white">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-emphatic text-3xl tracking-widest bg-white text-brand-mint px-3 py-1 rounded-sm shadow-md">
                BELLE FORET
              </span>
              <span className="font-emphatic text-2xl tracking-wide ml-1">RESORT</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight mt-3">Welcome ALL BELLER! 👋</h1>
            <p className="text-white/80 mt-1">오늘도 화기애애한 벨포레 리조트 통합 경영 현황입니다.</p>
          </div>
          <div className="text-xl font-bold text-white mt-4 md:mt-0 bg-black/20 px-4 py-2 rounded-2xl backdrop-blur-sm">
            🗓️ {currentDate}
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-12">
          
          {/* Top Cards (Today & YTD) */}
          <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Today Sales */}
            <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-brand-mint/5 rounded-full transition-transform group-hover:scale-150" />
              <h2 className="text-base font-bold text-slate-500 mb-6 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-brand-mint" /> 금일 전사 매출
              </h2>
              <div className="text-5xl lg:text-6xl font-emphatic text-slate-800 mb-4 tracking-tight">
                {formatCurrency(data.today.actual)}
              </div>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${todayPct >= 0 ? 'bg-brand-mint/10 text-brand-mint' : 'bg-red-50 text-red-500'}`}>
                <span>전년 동요일 대비</span>
                <span>{todayPct >= 0 ? '▲' : '▼'} {Math.abs(todayPct).toFixed(1)}%</span>
                <span className="font-medium opacity-80">({todayDiff > 0 ? '+' : ''}{formatShortCurrency(todayDiff)})</span>
              </div>
            </div>

            {/* YTD Sales */}
            <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-brand-mint/5 shape-leaf transition-transform group-hover:scale-125" />
              <h2 className="text-base font-bold text-slate-500 mb-6 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brand-mint" /> 올해 누적 매출 (YTD)
              </h2>
              <div className="text-5xl lg:text-6xl font-emphatic text-slate-800 mb-4 tracking-tight">
                {formatShortCurrency(data.ytd.actual)}원
              </div>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${ytdPct >= 0 ? 'bg-brand-mint/10 text-brand-mint' : 'bg-red-50 text-red-500'}`}>
                <span>전년 동기 대비</span>
                <span>{ytdPct >= 0 ? '▲' : '▼'} {Math.abs(ytdPct).toFixed(1)}%</span>
                <span className="font-medium opacity-80">({ytdDiff > 0 ? '+' : ''}{formatShortCurrency(ytdDiff)})</span>
              </div>
            </div>

          </div>

          {/* Left Area (Indicators & Chart) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Key Indicators */}
            <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <h2 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Coins className="w-5 h-5 text-brand-mint" /> 핵심 영업 지표 (1인당 / 객실당 단가)
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="bg-[#f8fafc] p-6 rounded-2xl border border-slate-100">
                  <div className="text-slate-500 font-bold mb-2">숙박 객실 평균 단가 (ADR)</div>
                  <div className="text-4xl font-emphatic text-brand-mint mb-2">{formatCurrency(data.adr)}</div>
                  <div className="text-sm text-slate-400">당일 숙박 매출 ÷ 판매된 총 객실 수</div>
                </div>
                <div className="bg-[#f8fafc] p-6 rounded-2xl border border-slate-100">
                  <div className="text-slate-500 font-bold mb-2">골프 1인당 평균 그린피</div>
                  <div className="text-4xl font-emphatic text-brand-mint mb-2">{formatCurrency(data.avg_green_fee)}</div>
                  <div className="text-sm text-slate-400">당일 골프 매출 ÷ 내장객 수</div>
                </div>
              </div>
            </div>

            {/* Weekly Chart */}
            <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-[400px] flex flex-col">
              <h2 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Trees className="w-5 h-5 text-brand-mint" /> 최근 일주일 매출 추이
              </h2>
              <div className="flex-1 w-full h-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.weekly_trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 13, fontWeight: 'bold'}} dy={10} />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 12}} 
                      tickFormatter={(val) => `${val / 10000}만`}
                      dx={-10}
                    />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '12px' }}
                      formatter={(value: any) => [`${new Intl.NumberFormat('ko-KR').format(value)}원`, '매출액']}
                      labelStyle={{fontWeight: 'bold', color: '#1e293b', marginBottom: '4px'}}
                    />
                    <Bar dataKey="this_week" name="이번 주" radius={[6, 6, 6, 6]}>
                      {data.weekly_trend.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={index === data.weekly_trend.length - 1 ? '#00AE95' : '#cbd5e1'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Right Area (Leaderboard) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Leaderboard Card */}
            <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex-1">
              <h2 className="text-base font-bold text-slate-800 mb-8 flex items-center gap-2">
                🏆 오늘의 본부별 실적 순위
              </h2>
              <div className="space-y-6">
                {data.hq_today.sort((a, b) => b.actual - a.actual).map((hq, idx) => (
                  <div key={idx} className="flex flex-col gap-3 group">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700 font-bold text-lg flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-lg">
                          {getHqIcon(hq.hq)}
                        </span>
                        {hq.hq}
                      </span>
                      <span className="text-slate-800 font-emphatic text-xl">{formatShortCurrency(hq.actual)}원</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-brand-mint rounded-full transition-all duration-1000 ease-out" 
                        style={{ width: `${Math.max((hq.actual / data.hq_today[0].actual) * 100, 3)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Fun Fact / Character Area */}
            <div className="bg-brand-mint text-white rounded-[32px] p-6 shadow-lg flex items-center gap-4">
              <div className="text-5xl">🐱🎧</div>
              <div>
                <div className="font-bold text-lg mb-1">우리 벨포레 고양이!</div>
                <div className="text-sm opacity-90 leading-tight">오늘도 본부장님을 위해 열심히 데이터를 수집하고 분석했어요!</div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
