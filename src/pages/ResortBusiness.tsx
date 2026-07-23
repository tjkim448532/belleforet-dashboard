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
  const { startDate } = useDate();



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

        const queryParams = `date=${startDate}`;
        const json = await secureFetcher(`https://belleforet-data.vercel.app/api/v5/dashboard/revenue-summary?${queryParams}`);
        const payload = json.data ?? json;
        if (!payload) throw new Error("Invalid payload");
        
        setData(transformResortData(payload, caps));
      } catch (err) {
        console.error('API Error:', err);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [startDate]);

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
      if (g.sold === 0 && g.cap === 0 && g.rev === 0) continue;
      
      let rate: number;
      let displayRate: string;
      
      if (key === '16평') {
        rate = g.cap > 0 ? Math.round(((g.sold + groups['51평'].sold) / g.cap) * 100) : 0;
        displayRate = `${rate}%`;
      } else if (key === '35평') {
        rate = g.cap > 0 ? Math.round(((g.sold + groups['51평'].sold) / g.cap) * 100) : 0;
        displayRate = `${rate}%`;
      } else if (key === '51평') {
        rate = 0; // N/A conceptually
        displayRate = 'N/A';
      } else {
        rate = g.cap > 0 ? Math.round((g.sold / g.cap) * 100) : 0;
        displayRate = `${rate}%`;
      }

      result.push({
        roomSize: key,
        sold: g.sold,
        capacity: g.cap,
        rate,
        displayRate,
        revenue: g.rev,
        adr: g.sold > 0 ? Math.round(g.rev / g.sold) : 0
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
            formatter: '{b}\\n{d}%'
          },
          data: pieData
        }
      ]
    };
  })();

  if (loading || !data) {
    return (
      <div className="w-full h-[80vh] flex items-center justify-center bg-[#f8fafc]">
        <div className="text-xl font-medium text-brand-mint animate-pulse">리조트사업본부 데이터를 불러오는 중입니다...</div>
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

      <div className="w-full max-w-[1920px] mx-auto p-4 md:p-8 relative z-10 pt-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
          <div className="text-white">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-black text-3xl tracking-widest bg-white text-emerald-600 px-3 py-1 rounded-sm shadow-md">
                BELLE FORET
              </span>
              <span className="font-black text-2xl tracking-wide ml-1">RESORT</span>
            </div>
            <h1 className="text-3xl font-medium tracking-tight mt-3">리조트사업본부 경영 현황 🏨</h1>
            <p className="text-white/80 mt-1">객실 판매 채널별 세부 객단가 및 정산 실적 리포트입니다.</p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <GlobalDatePicker />
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-12">
          {/* Room Revenue */}
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
            <h2 className="text-base font-medium text-slate-500 mb-4 flex items-center gap-2">
              <Hotel className="w-5 h-5 text-emerald-500" /> 선택 기간 객실 매출
            </h2>
            <div className="text-3xl font-medium text-slate-800 tracking-tight">
              {formatCurrency(lodgingStats.revenue)}
            </div>
            <p className="text-xs text-slate-400 mt-2">정산 시트 기준 Room Charge 매출액 누적 합계</p>
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
          <h2 className="text-base font-medium text-slate-800 mb-6 flex items-center gap-2">
            🏨 평형별 객실 실시간 가동률 (Occupancy Status)
          </h2>
          {roomOccupancyData.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
              {roomOccupancyData.map((row) => (
                <div key={row.roomSize} className="bg-slate-50 p-5 rounded-3xl border border-slate-100 flex flex-col items-center justify-between">
                  <span className="text-xs font-medium text-slate-400 mb-3">{row.roomSize}</span>
                  <div className="relative w-20 h-20 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="40" cy="40" r="34" stroke="#e2e8f0" strokeWidth="6" fill="transparent" />
                      <circle cx="40" cy="40" r="34" stroke="#10b981" strokeWidth="6" fill="transparent" strokeDasharray={2 * Math.PI * 34} strokeDashoffset={2 * Math.PI * 34 * (1 - Math.min(row.rate, 100) / 100)} />
                    </svg>
                    <span className="absolute text-base font-medium text-slate-800">{row.displayRate}</span>
                  </div>
                  <div className="flex flex-col items-center mt-4 space-y-1">
                    <span className="text-xs font-medium text-slate-500">{row.sold}실 / {row.capacity}실</span>
                    <span className="text-[10px] text-slate-400">매출: {formatCurrency(row.revenue)}</span>
                    <span className="text-[10px] text-emerald-500 font-medium">ADR: {formatCurrency(row.adr)}</span>
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
              💳 요금타입별 비중 및 객단가 (회원/비회원 분석)
            </h2>
            {rateAdrData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">요금 타입명</th>
                      <th className="py-3 px-4 text-right">판매 객실수</th>
                      <th className="py-3 px-4 text-right">총 매출액</th>
                      <th className="py-3 px-4 text-right">평균 객단가 (ADR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                    {rateAdrData.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 text-slate-700 font-semibold">{row.rateType}</td>
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
                해당 날짜의 요금타입 데이터가 없습니다.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
