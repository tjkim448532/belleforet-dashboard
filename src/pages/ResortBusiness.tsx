import { useState, useEffect } from 'react';
import { CalendarDays, Hotel, Coins } from 'lucide-react';
import GlobalDatePicker from '../components/GlobalDatePicker';
import { secureFetcher } from '../lib/secureFetcher';
import { useDate } from '../contexts/DateContext';
import ReactECharts from 'echarts-for-react';
import { transformResortData } from '../lib/dataTransformers';

export default function ResortBusiness() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { startDate, endDate } = useDate();



  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      try {
        let caps: Record<string, number> | undefined;
        try {
          const { db } = await import('../lib/firebase');
          const { doc, getDoc } = await import('firebase/firestore');
          const docSnap = await getDoc(doc(db, 'roomCapacity', 'default'));
          if (docSnap.exists()) {
            caps = docSnap.data() as Record<string, number>;
          }
        } catch (firebaseErr) {
          console.error('Error fetching master capacities from Firebase:', firebaseErr);
        }

        const queryParams = endDate && startDate !== endDate
          ? `startDate=${startDate}&endDate=${endDate}&_t=${Date.now()}`
          : `date=${startDate || '2026-07-24'}&_t=${Date.now()}`;
        const json = await secureFetcher(`https://belleforet-data.vercel.app/api/v5/dashboard/revenue-summary?${queryParams}`);
        let payload = json.data ?? json;
        if (Array.isArray(payload)) {
          payload = payload[payload.length - 1] || payload[0] || {};
        }
        if (!payload) throw new Error("Invalid payload");
        payload.startDate = startDate;
        payload.endDate = endDate;
        
        setData(transformResortData(payload, caps));
      } catch (err) {
        console.error('API Error:', err);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [startDate, endDate]);

  const formatCurrency = (val: number) => {
    const rounded = Math.round(val || 0);
    return new Intl.NumberFormat('ko-KR').format(rounded);
  };

  const lodgingStats = data?.lodgingStats || { revenue: 0, roomsSold: 0, adr: 0, totalCapacity: 0 };
  
  const roomOccupancyData = (() => {
    if (!data?.roomOccupancyMap) return [];
    
    const groups = data.roomOccupancyMap;
    const result = [];
    const keys = ['16평', '35평', '51평', '기타'];
    
    for (const key of keys) {
      const g = groups[key];
      if (!g || (g.sold === 0 && g.cap === 0 && g.rev === 0)) continue;
      
      const rate = g.cap > 0 ? Math.round((g.sold / g.cap) * 100) : 0;
      const cappedRate = Math.min(rate, 100);
      const displayRate = g.cap > 0 ? `${cappedRate}%` : 'N/A';

      result.push({
        roomSize: key,
        sold: g.sold,
        capacity: g.cap,
        rate: cappedRate,
        rawRate: rate,
        displayRate,
        revenue: g.rev,
        adr: g.sold > 0 ? Math.round(g.rev / g.sold) : 0,
        isConnectedType: key === '51평'
      });
    }

    return result;
  })();

  const channelAdrData = data?.channelAdrData || [];
  const rateAdrData = data?.rateAdrData || [];

  const pieOptions = (() => {
    const pieData = roomOccupancyData
      .filter(r => r.roomSize === '16평' || r.roomSize === '35평' || r.roomSize === '51평')
      .map(r => ({ 
        name: r.roomSize, 
        value: r.sold 
      }))
      .filter(d => d.value > 0);
      
    if (pieData.length === 0) return null;

    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c}건 ({d}%)'
      },
      legend: {
        top: 'bottom'
      },
      series: [
        {
          name: '상품 판매 비중',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: '{b}\n{d}%'
          },
          data: pieData
        }
      ]
    };
  })();

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      {/* Top Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div>
          <div className="flex items-center gap-2">
            <Hotel className="w-6 h-6 text-emerald-500" />
            <h1 className="text-2xl font-medium text-slate-800 tracking-tight">리조트사업본부 경영 현황</h1>
          </div>
          <p className="text-slate-400 text-xs mt-1">객실 실적, 채널별 ADR 및 실시간 가동률 분석 대시보드</p>
        </div>
        <GlobalDatePicker />
      </div>

      {loading ? (
        <div className="py-24 text-center text-slate-400 font-medium animate-pulse">
          데이터를 불러오는 중입니다...
        </div>
      ) : !data ? (
        <div className="py-24 text-center text-slate-400">
          데이터가 없습니다.
        </div>
      ) : (
        <>
          {/* Main KPI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Total Revenue */}
            <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
              <h2 className="text-base font-medium text-slate-500 mb-4 flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-500" /> 객실 총 매출
              </h2>
              <div className="text-3xl font-medium text-slate-800 tracking-tight">
                {formatCurrency(lodgingStats.revenue)} <span className="text-lg text-slate-400 font-normal">원</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">선택 기간 내 순수 객실 판매 총액 (부가세 별도)</p>
            </div>

            {/* Rooms Sold */}
            <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
              <h2 className="text-base font-medium text-slate-500 mb-4 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-emerald-500" /> 판매된 객실 수
              </h2>
              <div className="text-3xl font-medium text-slate-800 tracking-tight">
                {lodgingStats.roomsSold}실
              </div>
              <p className="text-xs text-slate-400 mt-2">선택 기간 내 정산 완료된 총 객실 수</p>
            </div>

            {/* Overall ADR */}
            <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
              <h2 className="text-base font-medium text-slate-500 mb-4 flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-500" /> 객실 평균 단가 (ADR)
              </h2>
              <div className="text-3xl font-medium text-emerald-600 tracking-tight">
                {formatCurrency(lodgingStats.adr)}
              </div>
              <p className="text-xs text-slate-400 mt-2">선택 기간 총 객실 매출 ÷ 총 판매 객실 수</p>
            </div>
          </div>

          {/* Room Occupancy Status Card */}
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
              <h2 className="text-base font-medium text-slate-800 flex items-center gap-2">
                🏨 평형별 객실 실시간 가동률 (Occupancy Status)
              </h2>
              <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full font-medium">
                💡 51평은 전용 5실 외 16평+35평 커넥티드 룸 조합 판매 실수가 포함됩니다.
              </span>
            </div>
            {roomOccupancyData.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {roomOccupancyData.map((row) => (
                  <div key={row.roomSize} className="bg-slate-50 p-5 rounded-3xl border border-slate-100 flex flex-col items-center justify-between">
                    <div className="flex flex-col items-center mb-3">
                      <span className="text-sm font-bold text-slate-700">{row.roomSize}</span>
                      {row.isConnectedType && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full mt-1">
                          🔗 전용+커넥티드
                        </span>
                      )}
                    </div>
                    <div className="relative w-20 h-20 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="40" cy="40" r="34" stroke="#e2e8f0" strokeWidth="6" fill="transparent" />
                        <circle cx="40" cy="40" r="34" stroke="#10b981" strokeWidth="6" fill="transparent" strokeDasharray={2 * Math.PI * 34} strokeDashoffset={2 * Math.PI * 34 * (1 - Math.min(row.rate, 100) / 100)} />
                      </svg>
                      <span className="absolute text-base font-bold text-slate-800">{row.displayRate}</span>
                    </div>
                    <div className="flex flex-col items-center mt-4 space-y-1 text-center">
                      {row.isConnectedType && row.sold > row.capacity ? (
                        <span className="text-xs font-semibold text-slate-700">
                          {row.sold}실 <span className="text-[10px] text-emerald-600 font-bold">(전용 {row.capacity}실+커넥티드)</span>
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-600">{row.sold}실 / {row.capacity}실</span>
                      )}
                      <span className="text-[10px] text-slate-400">매출: {formatCurrency(row.revenue)}</span>
                      <span className="text-[10px] text-emerald-600 font-bold">ADR: {formatCurrency(row.adr)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">
                해당 날짜에 가동률 데이터가 없습니다.
              </div>
            )}
          </div>

        {/* Pie Chart Section */}
        {pieOptions && (
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8">
            <h2 className="text-base font-medium text-slate-800 mb-6 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-emerald-500" /> 객실 평형별 판매 비중 (인기도)
            </h2>
            <div className="h-[300px] w-full">
              <ReactECharts option={pieOptions} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h2 className="text-base font-medium text-slate-800 mb-8 flex items-center gap-2">
              💰 판매채널별 객단가 분석
            </h2>
            {channelAdrData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">판매 채널명</th>
                      <th className="py-3 px-4 text-right">판매 객실수</th>
                      <th className="py-3 px-4 text-right">총 매출액</th>
                      <th className="py-3 px-4 text-right">평균 객단가 (ADR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                    {channelAdrData.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 text-slate-700 font-semibold">{row.channel}</td>
                        <td className="py-3.5 px-4 text-right text-slate-500">{row.roomsSold}실</td>
                        <td className="py-3.5 px-4 text-right text-slate-600">{formatCurrency(row.totalRevenue)}</td>
                        <td className="py-3.5 px-4 text-right font-medium text-slate-900">{formatCurrency(row.adr)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">
                해당 날짜의 판매 채널 데이터가 없습니다.
              </div>
            )}
          </div>

          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h2 className="text-base font-medium text-slate-800 mb-8 flex items-center gap-2">
              🏷️ 마켓타입 세그먼트별 실적 및 객단가 (Market Type Analysis)
            </h2>
            {rateAdrData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">마켓타입 세그먼트명</th>
                      <th className="py-3 px-4 text-right">판매 객실수</th>
                      <th className="py-3 px-4 text-right">총 매출액</th>
                      <th className="py-3 px-4 text-right">평균 객단가 (ADR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                    {rateAdrData.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 text-slate-700 font-semibold">{row.marketType || row.rateType}</td>
                        <td className="py-3.5 px-4 text-right text-slate-500">{row.roomsSold}실</td>
                        <td className="py-3.5 px-4 text-right text-slate-600">{formatCurrency(row.totalRevenue)}</td>
                        <td className="py-3.5 px-4 text-right font-medium text-slate-900">{formatCurrency(row.adr)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">
                해당 날짜의 마켓타입 세그먼트 데이터가 없습니다.
              </div>
            )}
          </div>
        </div>
        </>
      )}
    </div>
  );
}
