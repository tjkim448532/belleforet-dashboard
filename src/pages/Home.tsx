import { useState, useEffect } from 'react';
import { CalendarDays, Building2, Coins, AlertCircle } from 'lucide-react';
import { useSimulation } from '../contexts/SimulationContext';
import { useMapping } from '../contexts/MappingContext';

interface SummaryData {
  success: boolean;
  date: string;
  ytd: { actual: number; ly_actual: number; };
  today: { actual: number; ly_actual: number; };
  hq_today: { hq: string; actual: number; qty: number }[];
  store_today?: { shop_name: string; actual: number; qty: number }[];
  adr: number;
  avg_green_fee: number;
  weekly_trend: { day: string; fullDate: string; this_week: number; last_week: number; }[];
}

export default function Home() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const { simulatedData, clearSimulation } = useSimulation();
  const { mappings, loading: mappingLoading } = useMapping();

  const [currentDate, setCurrentDate] = useState('2026-06-06');

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://belleforet-data.vercel.app/api/reports/home-summary?date=${currentDate}`);
        if (!res.ok) throw new Error('데이터를 불러오는데 실패했습니다.');
        const json = await res.json();
        
        if (!json.success) {
          // API 실패 시 빈 데이터 객체를 설정하여 화면이 깨지지 않게 방어
          setData({
            success: true,
            date: currentDate,
            ytd: { actual: 0, ly_actual: 0 },
            today: { actual: 0, ly_actual: 0 },
            hq_today: [
              { hq: '골프', actual: 0, qty: 0 },
              { hq: '숙박', actual: 0, qty: 0 },
              { hq: '레저', actual: 0, qty: 0 },
              { hq: '식음', actual: 0, qty: 0 },
            ],
            adr: 0,
            avg_green_fee: 0,
            weekly_trend: []
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
  }, [currentDate]);

  // 시뮬레이션 데이터 덮어쓰기 로직
  let displayData = data;
  if (data && simulatedData) {
    displayData = {
      ...data,
      today: { ...data.today, actual: simulatedData.totalSales },
      ytd: { ...data.ytd, actual: data.ytd.actual - data.today.actual + simulatedData.totalSales },
      hq_today: [
        { hq: '골프', actual: simulatedData.hqTotals['골프'] || 0, qty: 150 },
        { hq: '숙박', actual: simulatedData.hqTotals['숙박'] || 0, qty: 65 },
        { hq: '레저', actual: simulatedData.hqTotals['레저'] || 0, qty: 420 },
        { hq: '식음', actual: simulatedData.hqTotals['식음'] || 0, qty: 310 },
      ]
    };
  }

  // 동적 매핑 합산 로직
  let dynamicHqToday = displayData?.hq_today || [];
  let dynamicAdr = displayData?.adr || 0;
  let dynamicAvgGreenFee = displayData?.avg_green_fee || 0;

  if (displayData && displayData.store_today && mappings.length > 0 && !simulatedData) {
    const hqMap: Record<string, { actual: number, qty: number }> = {
      '리조트사업본부': { actual: 0, qty: 0 },
      '식음': { actual: 0, qty: 0 },
      '레져사업본부': { actual: 0, qty: 0 },
      '골프사업본부': { actual: 0, qty: 0 },
      '연회': { actual: 0, qty: 0 },
      '기타사업본부': { actual: 0, qty: 0 }
    };

    displayData.store_today.forEach(store => {
      const mapped = mappings.find(m => store.shop_name.includes(m.storeName) || m.storeName.includes(store.shop_name));
      const cat = mapped ? mapped.category : '기타사업본부';
      if (hqMap[cat]) {
        hqMap[cat].actual += store.actual;
        hqMap[cat].qty += store.qty;
      }
    });

    dynamicHqToday = Object.keys(hqMap)
      .filter(key => hqMap[key].actual > 0)
      .map(key => ({ hq: key, actual: hqMap[key].actual, qty: hqMap[key].qty }));

    const lodging = hqMap['리조트사업본부'];
    const golf = hqMap['골프사업본부'];
    dynamicAdr = lodging.qty > 0 ? Math.round(lodging.actual / lodging.qty) : 0;
    dynamicAvgGreenFee = golf.qty > 0 ? Math.round(golf.actual / golf.qty) : 0;
  }

  const getHqIcon = (hq: string) => {
    if (hq.includes('골프')) return '⛳';
    if (hq.includes('숙박') || hq.includes('리조트')) return '🏨';
    if (hq.includes('레저') || hq.includes('레져')) return '🐑'; 
    if (hq.includes('식음')) return '☕'; 
    if (hq.includes('연회')) return '🍷';
    return '🐶'; 
  };

  if (loading || mappingLoading || !displayData) {
    return (
      <div className="w-full h-[80vh] flex items-center justify-center bg-[#f8fafc]">
        <div className="text-xl font-bold text-brand-mint animate-pulse">벨포레 현황판을 불러오는 중입니다...</div>
      </div>
    );
  }

  const todayDiff = displayData.today.actual - displayData.today.ly_actual;
  const todayPct = displayData.today.ly_actual > 0 ? (todayDiff / displayData.today.ly_actual) * 100 : 0;
  
  const ytdDiff = displayData.ytd.actual - displayData.ytd.ly_actual;
  const ytdPct = displayData.ytd.ly_actual > 0 ? (ytdDiff / displayData.ytd.ly_actual) * 100 : 0;

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
        
        {simulatedData && (
          <div className="bg-red-500 text-white p-4 rounded-2xl mb-8 flex items-center justify-between shadow-lg animate-pulse">
            <div className="flex items-center gap-3">
              <AlertCircle size={24} />
              <span className="font-bold text-lg">시뮬레이션 모드 작동 중! 실제 데이터가 아닙니다.</span>
            </div>
            <button onClick={clearSimulation} className="bg-white text-red-500 px-4 py-2 rounded-xl font-bold hover:bg-red-50 transition-colors">
              실제 데이터로 복귀
            </button>
          </div>
        )}

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
          <div className="mt-4 md:mt-0 flex items-center bg-black/20 px-4 py-2 rounded-2xl backdrop-blur-sm text-white focus-within:ring-2 focus-within:ring-white/50 transition-all">
            <span className="mr-2 opacity-80">🗓️</span>
            <input 
              type="date" 
              value={currentDate} 
              onChange={(e) => setCurrentDate(e.target.value)}
              className="bg-transparent border-none text-xl font-bold text-white outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-80 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
            />
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
                <CalendarDays className="w-5 h-5 text-brand-mint" /> 오늘 매출 ({currentDate})
              </h2>
              <div className="text-5xl lg:text-6xl font-emphatic text-slate-800 mb-4 tracking-tight">
                {formatCurrency(displayData.today.actual)}
              </div>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${todayPct >= 0 ? 'bg-brand-mint/10 text-brand-mint' : 'bg-red-50 text-red-500'}`}>
                <span>전년 동요일 대비</span>
                <span>{todayPct >= 0 ? '▲' : '▼'} {Math.abs(todayPct).toFixed(1)}%</span>
                <span className="font-medium opacity-80">({todayDiff > 0 ? '+' : ''}{formatCurrency(todayDiff)})</span>
              </div>
            </div>

            {/* YTD Sales */}
            <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-brand-mint/5 shape-leaf transition-transform group-hover:scale-125" />
              <h2 className="text-base font-bold text-slate-500 mb-6 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brand-mint" /> 올해 누적 매출 (YTD)
              </h2>
              <div className="text-5xl lg:text-6xl font-emphatic text-slate-800 mb-4 tracking-tight">
                {formatCurrency(displayData.ytd.actual)}
              </div>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${ytdPct >= 0 ? 'bg-brand-mint/10 text-brand-mint' : 'bg-red-50 text-red-500'}`}>
                <span>전년 동기 대비</span>
                <span>{ytdPct >= 0 ? '▲' : '▼'} {Math.abs(ytdPct).toFixed(1)}%</span>
                <span className="font-medium opacity-80">({ytdDiff > 0 ? '+' : ''}{formatCurrency(ytdDiff)})</span>
              </div>
            </div>

          </div>

          {/* Left Area (Indicators) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Key Indicators */}
            <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <h2 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Coins className="w-5 h-5 text-brand-mint" /> 핵심 영업 지표 (1인당 / 객실당 단가)
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="bg-[#f8fafc] p-6 rounded-2xl border border-slate-100">
                  <div className="text-slate-500 font-bold mb-2">숙박 객실 평균 단가 (ADR)</div>
                  <div className="text-4xl font-emphatic text-brand-mint mb-2">{formatCurrency(dynamicAdr)}</div>
                  <div className="text-sm text-slate-400">당일 숙박 매출 ÷ 판매된 총 객실 수</div>
                </div>
                <div className="bg-[#f8fafc] p-6 rounded-2xl border border-slate-100">
                  <div className="text-slate-500 font-bold mb-2">골프 1인당 평균 그린피</div>
                  <div className="text-4xl font-emphatic text-brand-mint mb-2">{formatCurrency(dynamicAvgGreenFee)}</div>
                  <div className="text-sm text-slate-400">당일 골프 매출 ÷ 내장객 수</div>
                </div>
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
                {dynamicHqToday.sort((a, b) => b.actual - a.actual).map((hq, idx) => (
                  <div key={idx} className="flex flex-col gap-3 group">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700 font-bold text-lg flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-lg">
                          {getHqIcon(hq.hq)}
                        </span>
                        {hq.hq}
                      </span>
                      <span className="text-slate-800 font-emphatic text-xl">{formatCurrency(hq.actual)}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-brand-mint rounded-full transition-all duration-1000 ease-out" 
                        style={{ width: `${Math.max((hq.actual / (dynamicHqToday[0]?.actual || 1)) * 100, 3)}%` }}
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
