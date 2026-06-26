import { useState, useEffect } from 'react';
import { CalendarDays, Building2, Coins, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useSimulation } from '../contexts/SimulationContext';
import { useMapping } from '../contexts/MappingContext';
import { secureFetcher } from '../lib/secureFetcher';
import { useDate } from '../contexts/DateContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface AdrTableItem {
  roomSize: string;
  marketType: string;
  channel: string;
  roomsSold: number;
  totalRevenue: number;
  adr: number;
}

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
  adrTable?: AdrTableItem[];
  golfSummary?: {
    reservedTeams: number;
    visitedTeams: number;
    visitedPlayers: number;
    avgGreenFee: number;
    memberAvgGreenFee: number;
    nonMemberAvgGreenFee: number;
  };
}

interface WeatherData {
  tempMax?: number;
  tempMin?: number;
  precipitation?: number;
  weatherDesc?: string;
}

export default function Home() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const { simulatedData, clearSimulation } = useSimulation();
  const { mappings, categories, loading: mappingLoading } = useMapping();

  const { startDate, endDate, isRange, setStartDate, setEndDate, setIsRange } = useDate();
  const [selectedRoomSize, setSelectedRoomSize] = useState<string>('');
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      try {
        const json = await secureFetcher(`https://belleforet-data.vercel.app/api/v3/dashboard/revenue-summary?startDate=${startDate}&endDate=${endDate}`);
        
        const grid = json.gridData || [];
        const todayActual = json.today?.actual || 0;
        const todayLyActual = json.today?.ly_actual || 0;
        
        const storeToday = grid.map((item: any) => ({
          shop_name: item.depth2,
          actual: item.salesAmount,
          qty: item.quantity
        }));
        
        const hqGroups: Record<string, { actual: number, qty: number }> = {
          '골프': { actual: 0, qty: 0 },
          '숙박': { actual: 0, qty: 0 },
          '레저': { actual: 0, qty: 0 },
          '식음': { actual: 0, qty: 0 }
        };
        
        grid.forEach((item: any) => {
          const cat = item.depth1 || '기타';
          if (!hqGroups[cat]) {
            hqGroups[cat] = { actual: 0, qty: 0 };
          }
          hqGroups[cat].actual += item.salesAmount;
          hqGroups[cat].qty += item.quantity;
        });
        
        const hqToday = Object.keys(hqGroups).map(key => ({
          hq: key,
          actual: hqGroups[key].actual,
          qty: hqGroups[key].qty
        }));
        
        setData({
          success: true,
          date: endDate,
          ytd: { actual: json.ytd?.actual || 0, ly_actual: json.ytd?.ly_actual || 0 },
          today: { actual: todayActual, ly_actual: todayLyActual },
          hq_today: hqToday,
          store_today: storeToday,
          adr: 0,
          avg_green_fee: 0,
          weekly_trend: [],
          adrTable: json.adrTable || [],
          golfSummary: json.golfSummary
        });
      } catch (err) {
        console.error('API Error:', err);
        setData({
          success: true,
          date: endDate,
          ytd: { actual: 0, ly_actual: 0 },
          today: { actual: 0, ly_actual: 0 },
          hq_today: [],
          store_today: [],
          adr: 0,
          avg_green_fee: 0,
          weekly_trend: [],
          adrTable: [],
          golfSummary: { reservedTeams: 0, visitedTeams: 0, visitedPlayers: 0, avgGreenFee: 0, memberAvgGreenFee: 0, nonMemberAvgGreenFee: 0 }
        });
      } finally {
        setLoading(false);
      }
    };

    const fetchWeather = async () => {
      try {
        const docRef = doc(db, 'weather_daily', endDate);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setWeather(docSnap.data() as WeatherData);
        } else {
          setWeather(null);
        }
      } catch (err) {
        console.error('Weather fetch error:', err);
        setWeather(null);
      }
    };

    fetchSummary();
    fetchWeather();
  }, [startDate, endDate]);

  // 시뮬레이션 데이터 덮어쓰기 로직
  let displayData = data;
  if (data && simulatedData) {
    // 시뮬레이터에서 설정된 본부별 금액 (키: 본부명, 값: 금액)
    const simulatedHqToday = Object.keys(simulatedData.hqTotals).map(key => ({
      hq: key,
      actual: simulatedData.hqTotals[key] || 0,
      qty: 0 // 시뮬레이션은 매출 금액만 제공하므로 qty는 0
    }));

    displayData = {
      ...data,
      today: { ...data.today, actual: simulatedData.totalSales },
      ytd: { ...data.ytd, actual: data.ytd.actual - data.today.actual + simulatedData.totalSales },
      hq_today: simulatedHqToday
    };
  }

  // 모든 숫자 표기를 일정하게 (콤마 + 원) 통일
  const formatCurrency = (val: number) => {
    const rounded = Math.round(val || 0);
    return new Intl.NumberFormat('ko-KR').format(rounded) + '원';
  };

  // 동적 매핑 합산 로직
  let dynamicHqToday = displayData?.hq_today || [];

  if (displayData && displayData.store_today && mappings.length > 0 && !simulatedData) {
    const hqMap: Record<string, { actual: number, qty: number }> = {};
    categories.forEach(c => hqMap[c] = { actual: 0, qty: 0 });

    displayData.store_today.forEach(store => {
      const mapped = mappings.find(m => store.shop_name.includes(m.storeName) || m.storeName.includes(store.shop_name));
      const cat = mapped ? mapped.category : '미분류';
      if (!hqMap[cat]) hqMap[cat] = { actual: 0, qty: 0 };
      hqMap[cat].actual += store.actual;
      hqMap[cat].qty += store.qty;
    });

    dynamicHqToday = Object.keys(hqMap)
      .filter(key => hqMap[key].actual > 0)
      .map(key => ({ hq: key, actual: hqMap[key].actual, qty: hqMap[key].qty }));
  }

  // Aggregate ADR Table by Market Type and Room Size (for Home.tsx)
  const marketTypeAdrData = (() => {
    if (!displayData || !displayData.adrTable) return [];
    
    const groups: Record<string, { marketType: string; roomSize: string; totalRevenue: number; roomsSold: number }> = {};
    
    displayData.adrTable.forEach(item => {
      const key = `${item.marketType}||${item.roomSize}`;
      if (!groups[key]) {
        groups[key] = {
          marketType: item.marketType,
          roomSize: item.roomSize,
          totalRevenue: 0,
          roomsSold: 0
        };
      }
      groups[key].totalRevenue += item.totalRevenue;
      groups[key].roomsSold += item.roomsSold;
    });
    
    return Object.values(groups).map(g => ({
      marketType: g.marketType,
      roomSize: g.roomSize,
      roomsSold: g.roomsSold,
      adr: g.roomsSold > 0 ? Math.round(g.totalRevenue / g.roomsSold) : 0
    })).sort((a, b) => {
      if (a.marketType !== b.marketType) return a.marketType.localeCompare(b.marketType);
      return a.roomSize.localeCompare(b.roomSize);
    });
  })();

  // Get unique room sizes for the key indicator dropdown selector
  const availableRoomSizes = (() => {
    const defaultSizes = ['16평', '35평', '51평', '펫룸 16평', '펫룸 35평', '펫룸 51평'];
    if (!displayData || !displayData.adrTable) return defaultSizes;
    const dbSizes = displayData.adrTable.map(item => item.roomSize);
    return Array.from(new Set([...defaultSizes, ...dbSizes])).sort();
  })();

  // Automatically default selectedRoomSize to '16평' or first item if not set or invalid
  useEffect(() => {
    if (availableRoomSizes.length > 0) {
      if (!selectedRoomSize || !availableRoomSizes.includes(selectedRoomSize)) {
        const defaultSize = availableRoomSizes.includes('16평') ? '16평' : availableRoomSizes[0];
        setSelectedRoomSize(defaultSize);
      }
    }
  }, [availableRoomSizes, selectedRoomSize]);

  // Calculate ADR for selected room size
  const selectedSizeAdr = (() => {
    if (!displayData || !displayData.adrTable || !selectedRoomSize) return 0;
    let revenue = 0;
    let qty = 0;
    displayData.adrTable.forEach(item => {
      if (item.roomSize === selectedRoomSize) {
        revenue += item.totalRevenue;
        qty += item.roomsSold;
      }
    });
    return qty > 0 ? Math.round(revenue / qty) : 0;
  })();

  const getHqIcon = (hq: string) => {
    if (hq.includes('골프')) return '⛳';
    if (hq.includes('숙박') || hq.includes('리조트')) return '🏨';
    if (hq.includes('레저') || hq.includes('레져')) return '🐑'; 
    if (hq.includes('식음')) return '☕'; 
    if (hq.includes('연회')) return '🍷';
    if (hq.includes('기타')) return '🐶';
    return '🏢'; // 커스텀 본부 폴백 아이콘
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
          <div className="mt-4 md:mt-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Toggle Button for Range / Single */}
            <div className="flex bg-black/30 p-1 rounded-xl backdrop-blur-sm border border-white/10">
              <button
                onClick={() => setIsRange(false)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  !isRange 
                    ? 'bg-brand-mint text-white shadow-md' 
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                단일 조회
              </button>
              <button
                onClick={() => setIsRange(true)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  isRange 
                    ? 'bg-brand-mint text-white shadow-md' 
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                기간 조회
              </button>
            </div>

            {/* Inputs */}
            <div className="flex items-center bg-black/20 px-4 py-2 rounded-2xl backdrop-blur-sm text-white border border-white/15 focus-within:ring-2 focus-within:ring-brand-mint/50 transition-all">
              <span className="mr-2 opacity-80">🗓️</span>
              {!isRange ? (
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setEndDate(e.target.value);
                  }}
                  className="bg-transparent border-none text-base font-bold text-white outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-80 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-transparent border-none text-base font-bold text-white outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-80"
                  />
                  <span className="text-white/50 font-bold">~</span>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-transparent border-none text-base font-bold text-white outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-80"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-12">
          
          {/* Top Cards (Today & YTD) */}
          <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Today Sales */}
            <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-brand-mint/5 rounded-full transition-transform group-hover:scale-150" />
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-base font-bold text-slate-500 flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-brand-mint" /> 
                  선택 기간 매출 ({startDate === endDate ? startDate : `${startDate} ~ ${endDate}`}) 
                  <span className="text-xs text-slate-400 font-normal hidden sm:inline">(부가세 포함)</span>
                </h2>
                {weather && startDate === endDate && (
                  <div className="text-right text-sm bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <div className="font-bold text-brand-mint text-base flex items-center justify-end gap-1">
                      {weather.weatherDesc?.includes('비') ? '🌧️' : weather.weatherDesc?.includes('눈') ? '❄️' : weather.weatherDesc?.includes('구름') ? '⛅' : '☀️'} 
                      {weather.weatherDesc}
                    </div>
                    <div className="text-slate-500 text-xs mt-1">최고 {weather.tempMax}℃ / 최저 {weather.tempMin}℃</div>
                  </div>
                )}
              </div>
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
                <div className="bg-[#f8fafc] p-6 rounded-2xl border border-slate-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-slate-500 font-bold">숙박 객실 평균 단가 (ADR)</div>
                      {availableRoomSizes.length > 0 && (
                        <select
                          value={selectedRoomSize}
                          onChange={(e) => setSelectedRoomSize(e.target.value)}
                          className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-mint/50 cursor-pointer hover:border-slate-300 transition-colors"
                        >
                          {availableRoomSizes.map(size => (
                            <option key={size} value={size}>{size}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div className="text-4xl font-emphatic text-brand-mint mb-2">
                      {selectedRoomSize ? formatCurrency(selectedSizeAdr) : '0원'}
                    </div>
                  </div>
                  <div className="text-sm text-slate-400 mt-2">
                    {selectedRoomSize ? (
                      selectedSizeAdr > 0 ? (
                        `${selectedRoomSize} 매출액 ÷ 판매된 객실 수`
                      ) : (
                        `선택 기간 ${selectedRoomSize} 판매 내역이 없습니다.`
                      )
                    ) : (
                      '객실 판매 데이터가 없습니다.'
                    )}
                  </div>
                </div>
                <div className="bg-[#f8fafc] p-6 rounded-2xl border border-slate-100 flex flex-col justify-between">
                  <div>
                    <div className="text-slate-500 font-bold mb-4">골프 예약 및 그린피 현황</div>
                    
                    {/* Teams row */}
                    <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-slate-100">
                      <div>
                        <div className="text-xs text-slate-400 font-medium mb-1">예약 팀수</div>
                        <div className="text-2xl font-emphatic text-brand-mint">
                          {displayData.golfSummary ? `${displayData.golfSummary.reservedTeams}팀` : '0팀'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 font-medium mb-1">실제 내장 팀수</div>
                        <div className="text-2xl font-emphatic text-brand-mint">
                          {displayData.golfSummary ? `${displayData.golfSummary.visitedTeams}팀` : '0팀'}
                        </div>
                      </div>
                    </div>

                    {/* Green Fees section */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-medium">1인당 평균 그린피</span>
                        <span className="text-sm font-bold text-slate-800">
                          {displayData.golfSummary ? formatCurrency(displayData.golfSummary.avgGreenFee) : '0원'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pl-2 border-l-2 border-slate-200">
                        <span className="text-xs text-slate-400 font-medium">ㄴ 회원 평균가</span>
                        <span className="text-xs font-semibold text-slate-600">
                          {displayData.golfSummary ? formatCurrency(displayData.golfSummary.memberAvgGreenFee) : '0원'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pl-2 border-l-2 border-slate-200">
                        <span className="text-xs text-slate-400 font-medium">ㄴ 비회원 평균가</span>
                        <span className="text-xs font-semibold text-slate-600">
                          {displayData.golfSummary ? formatCurrency(displayData.golfSummary.nonMemberAvgGreenFee) : '0원'}
                        </span>
                      </div>
                    </div>

                  </div>
                  <div className="text-sm text-slate-400 mt-4 pt-2 border-t border-slate-50">
                    선택 기간 골프 예약/방문 및 그린피 정산 데이터 집계
                  </div>
                </div>
              </div>
            </div>

            {/* Market Type ADR Table */}
            <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <h2 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
                🏨 마켓타입별 객실 평균단가 (ADR)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-4 px-6">마켓타입명</th>
                      <th className="py-4 px-6">객실 평수</th>
                      <th className="py-4 px-6 text-right">판매 객실수</th>
                      <th className="py-4 px-6 text-right">평균 객단가 (ADR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                    {marketTypeAdrData.length > 0 ? (
                      marketTypeAdrData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-6 font-bold text-slate-700">{row.marketType}</td>
                          <td className="py-4 px-6 text-slate-600">{row.roomSize}</td>
                          <td className="py-4 px-6 text-right text-slate-500 font-medium">{row.roomsSold}실</td>
                          <td className="py-4 px-6 text-right font-bold text-slate-900">{formatCurrency(row.adr)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400">
                          해당 날짜의 객실 판매 데이터가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
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

                        {/* 3D Pie Chart (HQ Distribution) */}
            <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex-1 min-h-[350px]">
              <h2 className="text-base font-bold text-slate-800 mb-8 flex items-center gap-2">
                🥧 실시간 본부별 매출 비중
              </h2>
              <div className="w-full h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dynamicHqToday.sort((a, b) => b.actual - a.actual)}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="actual"
                      nameKey="hq"
                      stroke="none"
                      style={{ filter: 'drop-shadow(0px 8px 12px rgba(0,0,0,0.15))' }}
                    >
                      {dynamicHqToday.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={['#14b8a6', '#0ea5e9', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'][index % 6]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => formatCurrency(Number(value))}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
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
