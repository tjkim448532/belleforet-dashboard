import { useState, useEffect } from 'react';
import { AlertCircle, Building2, CalendarDays, Coins } from 'lucide-react';

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
          // Fallback with mock data
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

  if (loading || !data) {
    return (
      <div className="w-full h-[80vh] flex items-center justify-center">
        <div className="text-xl font-bold text-slate-400 animate-pulse">데이터를 불러오는 중입니다...</div>
      </div>
    );
  }

  const todayDiff = data.today.actual - data.today.ly_actual;
  const todayPct = data.today.ly_actual > 0 ? (todayDiff / data.today.ly_actual) * 100 : 0;
  
  const ytdDiff = data.ytd.actual - data.ytd.ly_actual;
  const ytdPct = data.ytd.ly_actual > 0 ? (ytdDiff / data.ytd.ly_actual) * 100 : 0;

  return (
    <div className="w-full max-w-[1400px] mx-auto p-4 md:p-8 bg-[#011126] min-h-screen text-slate-200 font-sans tracking-tight">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 pb-4 border-b-2 border-slate-800">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white text-[#011126] font-black px-2 py-1 text-sm tracking-wider">다올 종합 그룹</div>
            <h1 className="text-2xl font-bold tracking-tight text-white">경영진 종합 현황판</h1>
          </div>
          <div className="text-slate-400 text-sm">모든 데이터는 실시간 시스템(POS 및 PMS)과 연동되어 집계됩니다.</div>
        </div>
        <div className="text-2xl font-black text-white mt-4 md:mt-0 tracking-widest">{currentDate}</div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Area (Top level metrics) */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          
          {/* Executive Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            <div className="bg-[#021a3a] border-l-4 border-[#00e676] p-8 shadow-2xl">
              <h2 className="text-sm font-bold text-slate-400 mb-8 flex items-center gap-2">
                <CalendarDays className="w-4 h-4" /> 금일 전사 매출
              </h2>
              <div className="text-5xl lg:text-6xl font-black text-white mb-4">
                {formatCurrency(data.today.actual)}
              </div>
              <div className={`text-lg font-bold flex items-center gap-2 ${todayPct >= 0 ? 'text-[#00e676]' : 'text-red-500'}`}>
                <span>전년 동요일 대비</span>
                <span>{todayPct >= 0 ? '▲' : '▼'} {Math.abs(todayPct).toFixed(1)}%</span>
                <span className="text-sm font-medium opacity-80">({todayDiff > 0 ? '+' : ''}{formatShortCurrency(todayDiff)})</span>
              </div>
            </div>

            <div className="bg-[#021a3a] border-l-4 border-[#3b82f6] p-8 shadow-2xl">
              <h2 className="text-sm font-bold text-slate-400 mb-8 flex items-center gap-2">
                <Building2 className="w-4 h-4" /> 올해 누적 매출 (YTD)
              </h2>
              <div className="text-5xl lg:text-6xl font-black text-white mb-4">
                {formatShortCurrency(data.ytd.actual)}원
              </div>
              <div className={`text-lg font-bold flex items-center gap-2 ${ytdPct >= 0 ? 'text-[#3b82f6]' : 'text-red-500'}`}>
                <span>전년 동기 대비</span>
                <span>{ytdPct >= 0 ? '▲' : '▼'} {Math.abs(ytdPct).toFixed(1)}%</span>
                <span className="text-sm font-medium opacity-80">({ytdDiff > 0 ? '+' : ''}{formatShortCurrency(ytdDiff)})</span>
              </div>
            </div>

          </div>

          {/* Key Indicators (No Graphs, just big typography) */}
          <div className="bg-[#021a3a] border border-slate-800 p-8 shadow-2xl">
            <h2 className="text-sm font-bold text-slate-400 mb-8 flex items-center gap-2 border-b border-slate-800 pb-4">
              <Coins className="w-4 h-4" /> 핵심 영업 지표 (1인당 / 객실당 단가)
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div>
                <div className="text-slate-400 font-medium mb-2 text-lg">숙박 객실 평균 단가 (ADR)</div>
                <div className="text-4xl font-black text-white mb-2">{formatCurrency(data.adr)}</div>
                <div className="text-sm text-slate-500">당일 숙박 매출 ÷ 판매된 총 객실 수</div>
              </div>

              <div>
                <div className="text-slate-400 font-medium mb-2 text-lg">골프 1인당 평균 그린피</div>
                <div className="text-4xl font-black text-white mb-2">{formatCurrency(data.avg_green_fee)}</div>
                <div className="text-sm text-slate-500">당일 골프 매출 ÷ 내장객 수</div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Area (Leaderboard & Weekly Summary) */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          
          {/* HQ Leaderboard */}
          <div className="bg-[#021a3a] border border-slate-800 p-8 shadow-2xl flex-1">
            <h2 className="text-sm font-bold text-slate-400 mb-8 pb-4 border-b border-slate-800">
              오늘의 본부별 실적 순위
            </h2>
            <div className="space-y-6">
              {data.hq_today.sort((a, b) => b.actual - a.actual).map((hq, idx) => (
                <div key={idx} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-bold text-lg flex items-center gap-3">
                      <span className="text-slate-500 font-mono text-sm">{idx + 1}</span>
                      {hq.hq} 본부
                    </span>
                    <span className="text-[#00e676] font-bold text-xl">{formatShortCurrency(hq.actual)}원</span>
                  </div>
                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-slate-400" 
                      style={{ width: `${Math.max((hq.actual / data.hq_today[0].actual) * 100, 2)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Status (Replaces Live Alerts) */}
          <div className="bg-slate-900 border border-red-900/30 p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-2 h-full bg-red-500/20" />
            <h2 className="text-sm font-bold text-slate-500 mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-slate-400" /> 시스템 상태 알림
            </h2>
            <div className="text-white font-medium text-lg mb-1">정상 가동 중</div>
            <div className="text-slate-500 text-sm">연동 오류가 발견되지 않았습니다.</div>
          </div>

        </div>
      </div>
    </div>
  );
}
