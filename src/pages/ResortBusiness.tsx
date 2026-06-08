import { useState, useEffect } from 'react';
import { CalendarDays, Hotel, Coins } from 'lucide-react';
import { secureFetcher } from '../lib/secureFetcher';
import { useDate } from '../contexts/DateContext';

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
  adrTable?: AdrTableItem[];
}

export default function ResortBusiness() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const { startDate, endDate, isRange, setStartDate, setEndDate, setIsRange } = useDate();

  const [capacities, setCapacities] = useState<Record<string, number>>({
    '16평': 70,
    '35평': 50,
    '51평': 30,
    '펫룸 16평': 10,
    '펫룸 35평': 10,
    '펫룸 51평': 10
  });

  useEffect(() => {
    const fetchCapacities = async () => {
      try {
        const { db } = await import('../lib/firebase');
        const { doc, getDoc } = await import('firebase/firestore');
        const docRef = doc(db, 'roomCapacity', 'default');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCapacities(docSnap.data() as Record<string, number>);
        }
      } catch (err) {
        console.error('Error fetching capacities:', err);
      }
    };
    fetchCapacities();
  }, []);

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
          adrTable: json.adrTable || []
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
          adrTable: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [startDate, endDate]);

  const formatCurrency = (val: number) => {
    const rounded = Math.round(val || 0);
    return new Intl.NumberFormat('ko-KR').format(rounded) + '원';
  };

  // Group detailed channel-level data (for ResortBusiness.tsx)
  const channelAdrData = (() => {
    if (!data || !data.adrTable) return [];
    
    // Group by roomSize and channel to combine different marketTypes if needed, 
    // or keep them as returned by the API if already distinct
    const groups: Record<string, { roomSize: string; channel: string; totalRevenue: number; roomsSold: number }> = {};
    
    data.adrTable.forEach(item => {
      const key = `${item.roomSize}||${item.channel}`;
      if (!groups[key]) {
        groups[key] = {
          roomSize: item.roomSize,
          channel: item.channel,
          totalRevenue: 0,
          roomsSold: 0
        };
      }
      groups[key].totalRevenue += item.totalRevenue;
      groups[key].roomsSold += item.roomsSold;
    });
    
    return Object.values(groups).map(g => ({
      roomSize: g.roomSize,
      channel: g.channel,
      roomsSold: g.roomsSold,
      totalRevenue: g.totalRevenue,
      adr: g.roomsSold > 0 ? Math.round(g.totalRevenue / g.roomsSold) : 0
    })).sort((a, b) => {
      // Sort by room size (Pyeong) first, then by revenue descending
      if (a.roomSize !== b.roomSize) return a.roomSize.localeCompare(b.roomSize);
      return b.totalRevenue - a.totalRevenue;
    });
  })();

  // Lodging specific calculations
  const lodgingStats = (() => {
    if (!data || !data.store_today) return { revenue: 0, roomsSold: 0, adr: 0 };
    
    let revenue = 0;
    let roomsSold = 0;
    
    // Find '숙박' category total or sum up adrTable
    if (data.adrTable && data.adrTable.length > 0) {
      data.adrTable.forEach(item => {
        revenue += item.totalRevenue;
        roomsSold += item.roomsSold;
      });
    } else {
      // Fallback to hq_today
      const lodgingHq = data.hq_today.find(h => h.hq.includes('숙박') || h.hq.includes('리조트'));
      if (lodgingHq) {
        revenue = lodgingHq.actual;
        roomsSold = lodgingHq.qty;
      }
    }
    
    const adr = roomsSold > 0 ? Math.round(revenue / roomsSold) : 0;
    return { revenue, roomsSold, adr };
  })();

  const roomOccupancyData = (() => {
    if (!data || !data.adrTable) return [];
    const soldMap: Record<string, number> = {};
    data.adrTable.forEach(item => {
      const size = item.roomSize || '기타';
      soldMap[size] = (soldMap[size] || 0) + item.roomsSold;
    });

    return Object.entries(capacities).map(([size, cap]) => {
      const sold = soldMap[size] || 0;
      const rate = cap > 0 ? Math.round((sold / cap) * 100) : 0;
      return {
        roomSize: size,
        sold,
        capacity: cap,
        rate
      };
    });
  })();

  if (loading || !data) {
    return (
      <div className="w-full h-[80vh] flex items-center justify-center bg-[#f8fafc]">
        <div className="text-xl font-bold text-brand-mint animate-pulse">리조트사업본부 데이터를 불러오는 중입니다...</div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] text-slate-800 tracking-tight pb-16">
      
      {/* Decorative Header Background */}
      <div className="w-full bg-gradient-to-r from-teal-600 to-emerald-500 h-[220px] absolute top-0 left-0 z-0 overflow-hidden rounded-b-[40px]">
        <div className="absolute top-10 right-[15%] w-36 h-36 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -top-12 left-[10%] w-44 h-44 bg-white/10 rounded-full blur-xl" />
      </div>

      <div className="w-full max-w-[1400px] mx-auto p-4 md:p-8 relative z-10 pt-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
          <div className="text-white">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-emphatic text-3xl tracking-widest bg-white text-emerald-600 px-3 py-1 rounded-sm shadow-md">
                BELLE FORET
              </span>
              <span className="font-emphatic text-2xl tracking-wide ml-1">RESORT</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight mt-3">리조트사업본부 경영 현황 🏨</h1>
            <p className="text-white/80 mt-1">객실 판매 채널별 세부 객단가 및 정산 실적 리포트입니다.</p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Toggle Button for Range / Single */}
            <div className="flex bg-black/30 p-1 rounded-xl backdrop-blur-sm border border-white/10">
              <button
                onClick={() => setIsRange(false)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  !isRange 
                    ? 'bg-emerald-600 text-white shadow-md' 
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                단일 조회
              </button>
              <button
                onClick={() => setIsRange(true)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  isRange 
                    ? 'bg-emerald-600 text-white shadow-md' 
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                기간 조회
              </button>
            </div>

            {/* Inputs */}
            <div className="flex items-center bg-black/20 px-4 py-2 rounded-2xl backdrop-blur-sm text-white border border-white/15 focus-within:ring-2 focus-within:ring-emerald-500 transition-all">
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

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-12">
          {/* Room Revenue */}
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
            <h2 className="text-base font-bold text-slate-500 mb-4 flex items-center gap-2">
              <Hotel className="w-5 h-5 text-emerald-500" /> 선택 기간 객실 매출
            </h2>
            <div className="text-4xl font-emphatic text-slate-800 tracking-tight">
              {formatCurrency(lodgingStats.revenue)}
            </div>
            <p className="text-xs text-slate-400 mt-2">정산 시트 기준 Room Charge 매출액 누적 합계</p>
          </div>

          {/* Rooms Sold */}
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
            <h2 className="text-base font-bold text-slate-500 mb-4 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-emerald-500" /> 판매된 객실 수
            </h2>
            <div className="text-4xl font-emphatic text-slate-800 tracking-tight">
              {lodgingStats.roomsSold}실
            </div>
            <p className="text-xs text-slate-400 mt-2">선택 기간 내 정산 완료된 총 객실 수</p>
          </div>

          {/* Overall ADR */}
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
            <h2 className="text-base font-bold text-slate-500 mb-4 flex items-center gap-2">
              <Coins className="w-5 h-5 text-emerald-500" /> 객실 평균 단가 (ADR)
            </h2>
            <div className="text-4xl font-emphatic text-emerald-600 tracking-tight">
              {formatCurrency(lodgingStats.adr)}
            </div>
            <p className="text-xs text-slate-400 mt-2">선택 기간 총 객실 매출 ÷ 총 판매 객실 수</p>
          </div>
        </div>

        {/* Room Occupancy Status Card */}
        <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8">
          <h2 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
            🏨 평형별 객실 실시간 가동률 (Occupancy Status)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
            {roomOccupancyData.map((row) => (
              <div key={row.roomSize} className="bg-slate-50 p-5 rounded-3xl border border-slate-100 flex flex-col items-center justify-between">
                <span className="text-xs font-bold text-slate-400 mb-3">{row.roomSize}</span>
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="34"
                      stroke="#e2e8f0"
                      strokeWidth="6"
                      fill="transparent"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="34"
                      stroke="#10b981"
                      strokeWidth="6"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 34}
                      strokeDashoffset={2 * Math.PI * 34 * (1 - Math.min(row.rate, 100) / 100)}
                    />
                  </svg>
                  <span className="absolute text-base font-bold text-slate-800">{row.rate}%</span>
                </div>
                <span className="text-xs font-bold text-slate-500 mt-4">
                  {row.sold}실 / {row.capacity}실
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Channel Table */}
        <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <h2 className="text-base font-bold text-slate-800 mb-8 flex items-center gap-2">
            📊 평형별 / 판매채널별 세부 단가표
          </h2>
          
          {channelAdrData.length > 0 ? (
            (() => {
              const roomSizes = Array.from(new Set(channelAdrData.map(d => d.roomSize))).sort();
              return roomSizes.map((size) => {
                const sizeData = channelAdrData.filter(d => d.roomSize === size);
                return (
                  <div key={size} className="mb-8 last:mb-0 border border-slate-100 rounded-2xl p-6 bg-slate-50/30">
                    <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
                      <div className="w-1.5 h-5 bg-emerald-500 rounded-full" />
                      <h3 className="text-lg font-bold text-slate-800">{size}</h3>
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        채널 {sizeData.length}개
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left">
                        <thead>
                          <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <th className="py-3 px-4">판매 채널명</th>
                            <th className="py-3 px-4 text-right">판매 객실수</th>
                            <th className="py-3 px-4 text-right">총 매출액</th>
                            <th className="py-3 px-4 text-right">평균 객단가 (ADR)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-sm">
                          {sizeData.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3.5 px-4 text-slate-700 font-semibold">{row.channel}</td>
                              <td className="py-3.5 px-4 text-right text-slate-500">{row.roomsSold}실</td>
                              <td className="py-3.5 px-4 text-right text-slate-600">{formatCurrency(row.totalRevenue)}</td>
                              <td className="py-3.5 px-4 text-right font-bold text-slate-900">{formatCurrency(row.adr)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              });
            })()
          ) : (
            <div className="py-12 text-center text-slate-400">
              해당 날짜의 객실 판매 채널 데이터가 없습니다.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
