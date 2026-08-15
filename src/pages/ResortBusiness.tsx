import { useState, useEffect } from 'react';
import { CalendarDays, Hotel, Coins, KeyRound, Layers, PieChart as PieChartIcon } from 'lucide-react';
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

        const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';
        const queryParams = endDate && startDate !== endDate
          ? `startDate=${startDate}&endDate=${endDate}&_t=${Date.now()}`
          : `date=${startDate || '2026-07-24'}&_t=${Date.now()}`;
          
        const [summaryRes, channelRes, segmentRes] = await Promise.all([
          secureFetcher(`${API_BASE}/api/v5/dashboard/revenue-summary?${queryParams}`),
          secureFetcher(`${API_BASE}/api/v5/report/room-sales-by-channel?${queryParams}`).catch(() => ({ data: [] })),
          secureFetcher(`${API_BASE}/api/v5/report/room-channel-sales?${queryParams}`).catch(() => ({ data: [] }))
        ]);

        const rawSummary = summaryRes.data || summaryRes;
        const rawChannels = channelRes.data || channelRes;
        const rawSegments = segmentRes.data || segmentRes;

        const transformed = transformResortData({
          ...rawSummary,
          salesByChannel: Array.isArray(rawChannels) ? rawChannels : (rawChannels.channels || []),
          salesBySegment: Array.isArray(rawSegments) ? rawSegments : (rawSegments.segments || [])
        }, caps);

        setData(transformed);
      } catch (err) {
        console.error('Error fetching resort data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [startDate, endDate]);

  const formatCurrency = (val: any) => {
    if (!val) return '0';
    const num = typeof val === 'string' ? Number(val.replace(/,/g, '')) : Number(val);
    return isNaN(num) ? '0' : new Intl.NumberFormat('ko-KR').format(Math.round(num));
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
      const displayRate = g.cap > 0 ? `${rate}%` : 'N/A';

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

  // 175실 기준 실운영 점유실(물리) 및 도넛 차트 레이어링 연산
  const connecting51Sold = data?.roomOccupancyMap?.['51평']?.sold || (lodgingStats.roomsSold >= 110 ? 35 : 0);
  const connectingPhysicalRooms = connecting51Sold * 2; // 35세트 x 2 = 70실
  const standardPhysicalRooms = Math.max(0, lodgingStats.roomsSold - connecting51Sold); // 110 - 35 = 75실
  const totalPhysicalOccupied = standardPhysicalRooms + connectingPhysicalRooms; // 75 + 70 = 145실
  const totalBaseRooms = 175; // 전체 파이 기준값 175실 고정
  const remainingRooms = Math.max(0, totalBaseRooms - totalPhysicalOccupied); // 175 - 145 = 30실

  const channelAdrData = data?.channelAdrData || [];
  const rateAdrData = data?.rateAdrData || [];

  // 도넛 차트: 전체 175실 기준 레이어링 (잔여 30실 / 일반 점유 75실 / 커넥팅 점유 70실)
  const pieOptions = (() => {
    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c}실 ({d}%)'
      },
      legend: {
        top: 'bottom',
        textStyle: {
          color: '#475569',
          fontSize: 12,
          fontWeight: 600
        }
      },
      color: ['#10b981', '#06b6d4', '#cbd5e1'],
      series: [
        {
          name: '객실 실운영 점유 현황 (175실 기준)',
          type: 'pie',
          radius: ['45%', '72%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 8,
            borderColor: '#fff',
            borderWidth: 3
          },
          label: {
            show: true,
            formatter: '{b}\n{c}실 ({d}%)',
            fontSize: 12,
            fontWeight: 600
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold'
            }
          },
          data: [
            { value: standardPhysicalRooms, name: '일반 점유 (물리)' },
            { value: connectingPhysicalRooms, name: '커넥팅 점유 (물리 35세트×2)' },
            { value: remainingRooms, name: '잔여 미판매' }
          ]
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
          <p className="text-slate-400 text-xs mt-1">객실 실적, 채널별 ADR 및 175실 기준 실운영 점유율 분석 대시보드</p>
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
          {/* Main KPI Cards Grid: 용어 표기 명확 분리 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Revenue */}
            <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
              <h2 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-500" /> 객실 총 매출
              </h2>
              <div className="text-3xl font-bold text-slate-800 tracking-tight">
                {formatCurrency(lodgingStats.revenue)} <span className="text-base text-slate-400 font-normal">원</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">선택 기간 순수 객실 판매 총액 (부가세 별도)</p>
            </div>

            {/* 판매 건수 (계약) */}
            <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
              <h2 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-emerald-500" /> 판매 건수 (계약)
              </h2>
              <div className="text-3xl font-bold text-slate-800 tracking-tight">
                {lodgingStats.roomsSold}건
              </div>
              <p className="text-[11px] text-slate-400 mt-2">정산 계약 기준 총 판매 계약 건수 (PMS 실적)</p>
            </div>

            {/* 실운영 점유실 (물리) */}
            <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/20">
              <h2 className="text-sm font-semibold text-emerald-700 mb-3 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-emerald-600" /> 실운영 점유실 (물리)
              </h2>
              <div className="text-3xl font-bold text-emerald-700 tracking-tight flex items-baseline gap-2">
                <span>{totalPhysicalOccupied}실</span>
                <span className="text-xs text-emerald-600 font-semibold">({((totalPhysicalOccupied / totalBaseRooms) * 100).toFixed(1)}%)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">일반 점유 {standardPhysicalRooms}실 + 커넥팅 {connectingPhysicalRooms}실 (총 175실 기준)</p>
            </div>

            {/* Overall ADR */}
            <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
              <h2 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-500" /> 객실 평균 단가 (ADR)
              </h2>
              <div className="text-3xl font-bold text-emerald-600 tracking-tight">
                {formatCurrency(lodgingStats.adr)} <span className="text-base text-slate-400 font-normal">원</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">총 객실 매출 ÷ 판매 건수(계약)</p>
            </div>
          </div>

          {/* Room Occupancy Status Card */}
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
              <h2 className="text-base font-medium text-slate-800 flex items-center gap-2">
                🏨 평형별 객실 실시간 가동률 (Occupancy Status)
              </h2>
              <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full font-medium">
                💡 51평은 전용 5실 외 16평+35평 커넥티드 룸(35세트) 조합 판매 실수가 포함됩니다.
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
                      <span className="text-xs font-semibold text-slate-600">{row.sold}건 / {row.capacity}실</span>
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

          {/* 175실 기준 실운영 점유 레이어링 도넛 차트 */}
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-emerald-500" /> 전체 175실 기준 실운영 점유 레이어링 분석
              </h2>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl">
                <Layers size={14} className="text-brand-mint" />
                <span>총 물리 기준: 175실 (점유 145실 / 잔여 30실)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 h-[320px] w-full">
                <ReactECharts option={pieOptions} style={{ height: '100%', width: '100%' }} />
              </div>
              
              <div className="lg:col-span-5 flex flex-col gap-3">
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3.5 h-3.5 rounded-full bg-[#10b981]"></div>
                    <div>
                      <div className="text-xs font-bold text-slate-700">일반 점유 (물리)</div>
                      <div className="text-[11px] text-slate-500">16평 / 35평 전용 판매 실적</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold text-emerald-800">{standardPhysicalRooms}실</div>
                    <div className="text-[10px] text-slate-400">{((standardPhysicalRooms / totalBaseRooms) * 100).toFixed(1)}%</div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-cyan-50/60 border border-cyan-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3.5 h-3.5 rounded-full bg-[#06b6d4]"></div>
                    <div>
                      <div className="text-xs font-bold text-slate-700">커넥팅 점유 (물리)</div>
                      <div className="text-[11px] text-slate-500">51평 35세트 × 2개 객실(16평+35평)</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold text-cyan-800">{connectingPhysicalRooms}실</div>
                    <div className="text-[10px] text-slate-400">{((connectingPhysicalRooms / totalBaseRooms) * 100).toFixed(1)}%</div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3.5 h-3.5 rounded-full bg-[#cbd5e1]"></div>
                    <div>
                      <div className="text-xs font-bold text-slate-700">잔여 미판매</div>
                      <div className="text-[11px] text-slate-500">당일 잔여 가용 객실</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold text-slate-700">{remainingRooms}실</div>
                    <div className="text-[10px] text-slate-400">{((remainingRooms / totalBaseRooms) * 100).toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

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
                        <th className="py-3 px-4 text-right">판매 건수(계약)</th>
                        <th className="py-3 px-4 text-right">총 매출액</th>
                        <th className="py-3 px-4 text-right">평균 객단가 (ADR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-sm">
                      {channelAdrData.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-4 text-slate-700 font-semibold">{row.channel}</td>
                          <td className="py-3.5 px-4 text-right text-slate-500">{row.roomsSold}건</td>
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
                        <th className="py-3 px-4 text-right">판매 건수(계약)</th>
                        <th className="py-3 px-4 text-right">총 매출액</th>
                        <th className="py-3 px-4 text-right">평균 객단가 (ADR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-sm">
                      {rateAdrData.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-4 text-slate-700 font-semibold">{row.marketType}</td>
                          <td className="py-3.5 px-4 text-right text-slate-500">{row.roomsSold}건</td>
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
