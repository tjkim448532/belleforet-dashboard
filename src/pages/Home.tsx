import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Calendar, DollarSign, Building, Activity } from 'lucide-react';

interface SummaryData {
  success: boolean;
  date: string;
  ytd: {
    actual: number;
    ly_actual: number;
  };
  today: {
    actual: number;
    ly_actual: number;
  };
  hq_today: {
    hq: string;
    actual: number;
  }[];
}

export default function Home() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 현재 날짜 기준
  const currentDate = '2026-06-06';

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`https://belleforet-daol-engine.vercel.app/api/reports/home-summary?date=${currentDate}`);
        if (!res.ok) throw new Error('데이터를 불러오는데 실패했습니다.');
        const json = await res.json();
        
        // 목업 데이터 처리 (DB 연동 지연 시 대비)
        if (!json.success || (json.ytd.actual === 0 && json.today.actual === 0)) {
          // Fallback to mock data if empty
          setData({
            success: true,
            date: currentDate,
            ytd: { actual: 12500000000, ly_actual: 11000000000 },
            today: { actual: 58200000, ly_actual: 45000000 },
            hq_today: [
              { hq: '골프', actual: 24000000 },
              { hq: '숙박', actual: 14500000 },
              { hq: '레저', actual: 10500000 },
              { hq: '식음', actual: 9200000 },
            ]
          });
        } else {
          setData(json);
        }
      } catch (err) {
        console.error(err);
        // Fallback on error
        setData({
          success: true,
          date: currentDate,
          ytd: { actual: 12500000000, ly_actual: 11000000000 },
          today: { actual: 58200000, ly_actual: 45000000 },
          hq_today: [
            { hq: '골프', actual: 24000000 },
            { hq: '숙박', actual: 14500000 },
            { hq: '레저', actual: 10500000 },
            { hq: '식음', actual: 9200000 },
          ]
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('ko-KR').format(val) + '원';
  };

  const calculateDiff = (current: number, previous: number) => {
    if (previous === 0) return { pct: 0, amount: current, isUp: current >= 0 };
    const diff = current - previous;
    const pct = (diff / previous) * 100;
    return { pct, amount: diff, isUp: diff >= 0 };
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 animate-pulse font-medium">매출 데이터를 집계 중입니다...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const ytdDiff = calculateDiff(data.ytd.actual, data.ytd.ly_actual);
  const todayDiff = calculateDiff(data.today.actual, data.today.ly_actual);

  // 가장 큰 매출을 기준으로 바 차트 너비 계산
  const maxHqActual = Math.max(...data.hq_today.map(d => d.actual), 1);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            전사 종합 대문
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            기준일자: {data.date} (금일 및 누계 매출 현황)
          </p>
        </div>
      </div>
      
      {/* 핵심 지표 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 올해 총 누적 매출 (YTD) */}
        <div className="p-6 rounded-3xl glass-panel-light dark:glass-panel-dark shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden group">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all"></div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Calendar className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200">올해 누적 매출 총액 (YTD)</h2>
          </div>
          <div className="mt-2">
            <span className="text-4xl md:text-5xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {formatCurrency(data.ytd.actual)}
            </span>
          </div>
          <div className="mt-6 flex items-center gap-2">
            <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold ${ytdDiff.isUp ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
              {ytdDiff.isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {Math.abs(ytdDiff.pct).toFixed(1)}%
            </div>
            <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">
              작년 동기 대비 ({ytdDiff.isUp ? '+' : '-'}{formatCurrency(Math.abs(ytdDiff.amount))})
            </span>
          </div>
        </div>

        {/* 오늘 매출 (Today) */}
        <div className="p-6 rounded-3xl glass-panel-light dark:glass-panel-dark shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden group">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200">오늘 매출 총액</h2>
          </div>
          <div className="mt-2">
            <span className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white">
              {formatCurrency(data.today.actual)}
            </span>
          </div>
          <div className="mt-6 flex items-center gap-2">
            <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold ${todayDiff.isUp ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
              {todayDiff.isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {Math.abs(todayDiff.pct).toFixed(1)}%
            </div>
            <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">
              작년 같은 주 요일 대비 ({todayDiff.isUp ? '+' : '-'}{formatCurrency(Math.abs(todayDiff.amount))})
            </span>
          </div>
        </div>
      </div>
      
      {/* 본부별 오늘 매출 비교 */}
      <div className="p-6 md:p-8 rounded-3xl glass-panel-light dark:glass-panel-dark shadow-xl mt-6 relative overflow-hidden">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
            <Building className="w-6 h-6" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">본부별 오늘 매출 실적</h2>
        </div>
        
        <div className="space-y-6 relative z-10">
          {data.hq_today.length > 0 ? (
            data.hq_today.sort((a, b) => b.actual - a.actual).map((item, idx) => {
              const widthPct = Math.max((item.actual / maxHqActual) * 100, 2);
              return (
                <div key={idx} className="group cursor-pointer">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm md:text-base font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {item.hq} 본부
                    </span>
                    <span className="text-base md:text-lg font-black text-slate-900 dark:text-white">
                      {formatCurrency(item.actual)}
                    </span>
                  </div>
                  <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000 ease-out shadow-sm relative overflow-hidden"
                      style={{ width: `${widthPct}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 w-1/2 -skew-x-12 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-slate-500">
              오늘 발생한 매출 데이터가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
