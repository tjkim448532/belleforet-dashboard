import { useState, useEffect } from 'react';
import { CalendarDays, Hotel, Coins, KeyRound, Layers, PieChart as PieChartIcon, Activity } from 'lucide-react';
import GlobalDatePicker from '../components/GlobalDatePicker';
import { secureFetcher } from '../lib/secureFetcher';
import { useDate } from '../contexts/DateContext';
import ReactECharts from 'echarts-for-react';
import { Tooltip, Legend, ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { transformResortData } from '../lib/dataTransformers';

export default function ResortBusiness() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { startDate, endDate } = useDate();

  // 💡 LOS (연박) 체류 시너지 분석 데이터 상태
  const [losTrendData, setLosTrendData] = useState<any[]>([]);
  const [loadingLos, setLoadingLos] = useState<boolean>(false);
  const [losMetricMode, setLosMetricMode] = useState<'revpas' | 'total'>('revpas');

  useEffect(() => {
    if (!startDate) return;
    const fetchLosTrend = async () => {
      setLoadingLos(true);
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';
        let queryParams = '';
        if (endDate && startDate !== endDate) {
          queryParams = `startDate=${startDate}&endDate=${endDate}`;
        } else {
          const cur = new Date(startDate);
          const past14 = new Date(cur.getTime() - 13 * 24 * 60 * 60 * 1000);
          const past14Str = past14.toISOString().split('T')[0];
          queryParams = `startDate=${past14Str}&endDate=${startDate}`;
        }
        const res = await secureFetcher(`${API_BASE}/api/v5/dashboard/los-correlation-trend?${queryParams}`);
        const resultData = res.data ?? res;
        setLosTrendData(resultData?.trendData || []);
      } catch (e) {
        console.error('LOS Trend fetch error', e);
      } finally {
        setLoadingLos(false);
      }
    };
    fetchLosTrend();
  }, [startDate, endDate]);

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
          : `date=${startDate || new Date().toISOString().split('T')[0]}&_t=${Date.now()}`;
          
        const [summaryRes, matrixRes, channelRes, segmentRes] = await Promise.all([
          secureFetcher(`${API_BASE}/api/v5/dashboard/revenue-summary?${queryParams}`),
          secureFetcher(`${API_BASE}/api/v5/dashboard/matrix-weekly?${queryParams}`).catch(() => ({ data: [] })),
          secureFetcher(`${API_BASE}/api/v5/report/room-sales-by-channel?${queryParams}`).catch(() => ({ data: [] })),
          secureFetcher(`${API_BASE}/api/v5/report/room-channel-sales?${queryParams}`).catch(() => ({ data: [] }))
        ]);

        const rawSummary = summaryRes.data || summaryRes;
        const rawMatrix = matrixRes.data || matrixRes;
        const rawChannels = channelRes.data || channelRes;
        const rawSegments = segmentRes.data || segmentRes;

        const transformed = transformResortData({
          ...rawSummary,
          matrix: Array.isArray(rawMatrix) ? rawMatrix : [],
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

  // 175실 기준 실운영 점유실(물리) 및 도넛 차트 레이어링 연산
  const isRange = Boolean(startDate && endDate && startDate !== endDate);
  const rangeDays = isRange && startDate && endDate ? Math.max(1, Math.ceil(Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1) : 1;

  const lodgingStats = data?.lodgingStats || { revenue: 0, roomsSold: 0, adr: 0, totalCapacity: 0 };
  
  const roomOccupancyData = (() => {
    if (!data?.roomOccupancyMap) return [];
    
    const groups = data.roomOccupancyMap;
    const result = [];
    const keys = ['16평', '35평', '51평', '기타'];
    for (const key of keys) {
      const g = groups[key];
      if (!g || (g.sold === 0 && g.cap === 0 && g.rev === 0)) continue;
      
      const effectiveCap = g.cap > 0 ? g.cap : g.sold;
      const rate = effectiveCap > 0 ? Math.round((g.sold / effectiveCap) * 100) : 0;
      const cappedRate = Math.min(rate, 100);
      const displayRate = `${rate}%`;

      result.push({
        roomSize: key,
        sold: g.sold,
        capacity: effectiveCap,
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

  const connecting51Sold = data?.roomOccupancyMap?.['51평']?.sold || 0;
  const connectingPhysicalRooms = connecting51Sold * 2; // 35세트 x 2 = 70실 (또는 기간 누적)
  const standardPhysicalRooms = Math.max(0, lodgingStats.roomsSold - connecting51Sold);
  const totalPhysicalOccupied = Number(data?.summary?.totalPhysicalKeysSold || (standardPhysicalRooms + connectingPhysicalRooms));
  const totalBaseRooms = Number(data?.summary?.totalPhysicalKeys || data?.summary?.totalRoomInventory || (175 * rangeDays));
  const remainingRooms = Math.max(0, totalBaseRooms - totalPhysicalOccupied);

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
                <span>{totalPhysicalOccupied.toLocaleString()}실</span>
                <span className="text-xs text-emerald-600 font-semibold">({totalBaseRooms > 0 ? ((totalPhysicalOccupied / totalBaseRooms) * 100).toFixed(1) : '0.0'}%)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">일반 점유 {standardPhysicalRooms.toLocaleString()}실 + 커넥팅 {connectingPhysicalRooms.toLocaleString()}실 ({isRange ? `총 ${totalBaseRooms.toLocaleString()}실 (${rangeDays}일) 기준` : '총 175실 기준'})</p>
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

          {/* LOS (연박) 비중 vs 부대시설 매출 상관관계 심층 분석 */}
          {losTrendData && losTrendData.length > 0 && (
            <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8 border border-slate-100 relative overflow-hidden">
              {/* Header */}
              <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-6 border-b border-slate-100 pb-5 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                      체류 시너지 분석 (LOS Spillover Impact)
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      1객실당 부대시설 소비 파급력
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-600" /> 1박 vs 연박(2박+) 고객의 객실당 부대시설 소비 파급력 대조
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    "방이 많이 팔린 날은 무조건 좋은가?" ➔ <strong>단순 판매량(Volume)을 넘어, 연박 비중이 높아질 때 1객실당 식음·레저 소비액(RevPAS, 골프 매출 불포함)이 2.16배 폭증하는 실질적인 수익성 시너지</strong>를 분석합니다.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start xl:self-auto">
                  {loadingLos && <span className="animate-spin w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full mr-1"></span>}
                  <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-bold">
                    <button
                      onClick={() => setLosMetricMode('revpas')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        losMetricMode === 'revpas'
                          ? 'bg-white text-indigo-600 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      객실 1실당 소비액 (RevPAS · 골프 불포함)
                    </button>
                    <button
                      onClick={() => setLosMetricMode('total')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        losMetricMode === 'total'
                          ? 'bg-white text-indigo-600 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      부대시설 총매출액
                    </button>
                  </div>
                </div>
              </div>

              {/* 1일 단위 (Day-by-Day) 1박 vs 연박 정밀 대조 카드 */}
              {(() => {
                const latestLos = losTrendData && losTrendData.length > 0 ? losTrendData[losTrendData.length - 1] : null;
                const liveFnb = Math.round(latestLos?.fnbRevPAS || 0);
                const liveLeisure = Math.round(latestLos?.leisureRevPAS || 0);
                const liveTotal = liveFnb + liveLeisure;
                const liveMultiRatio = latestLos?.multiNightRatio !== undefined ? Number(latestLos.multiNightRatio).toFixed(1) : '0.0';

                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {/* 카드 1: 선택일 1실당 식음 소비 */}
                    <div className="bg-gradient-to-br from-amber-50/70 to-orange-50/30 p-5 rounded-2xl border border-amber-200/70 flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-bold text-amber-800 mb-1 flex items-center justify-between">
                          <span>🍽️ 1객실당 식음(F&B) 소비액</span>
                          <span className="text-[11px] font-bold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full">실시간 실적</span>
                        </div>
                        <div className="text-2xl font-extrabold text-slate-900 my-2">
                          ₩{formatCurrency(liveFnb)} <span className="text-xs font-normal text-slate-500">/ 1실</span>
                        </div>
                        <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-amber-200/60">
                          <div className="flex justify-between">
                            <span>• 1박 고객 기준치:</span>
                            <span className="text-slate-500">약 ₩117,000 / 일 (저녁 1회)</span>
                          </div>
                          <div className="flex justify-between font-semibold text-amber-900">
                            <span>• 선택일 연박 비중:</span>
                            <span>{liveMultiRatio}%</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-amber-900/80 mt-3 pt-2 border-t border-amber-200/40">
                        연박 비중이 높을수록 <strong>조식·중식·석식·베이커리 다회 결제</strong>로 식음 매출 급증
                      </p>
                    </div>

                    {/* 카드 2: 선택일 1실당 레저·체험 소비 */}
                    <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/30 p-5 rounded-2xl border border-emerald-200/70 flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-bold text-emerald-800 mb-1 flex items-center justify-between">
                          <span>🎢 1객실당 레저·체험 소비액</span>
                          <span className="text-[11px] font-bold bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full">실시간 실적</span>
                        </div>
                        <div className="text-2xl font-extrabold text-slate-900 my-2">
                          ₩{formatCurrency(liveLeisure)} <span className="text-xs font-normal text-slate-500">/ 1실</span>
                        </div>
                        <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-emerald-200/60">
                          <div className="flex justify-between">
                            <span>• 1박 고객 기준치:</span>
                            <span className="text-slate-500">약 ₩102,000 / 일 (단발 1회)</span>
                          </div>
                          <div className="flex justify-between font-semibold text-emerald-800">
                            <span>• 낮 시간 상주율:</span>
                            <span>체류형 시설 풀가동</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-emerald-900/80 mt-3 pt-2 border-t border-emerald-200/40">
                        낮 시간대 리조트 체류로 <strong>목장체험, 썰매, 마리나, 미디어아트 풀코스 이용</strong>
                      </p>
                    </div>

                    {/* 카드 3: 1실당 총 부대소비 파급력 (RevPAS) */}
                    <div className="bg-gradient-to-br from-indigo-50/90 to-purple-50/50 p-5 rounded-2xl border border-indigo-200 flex flex-col justify-between shadow-xs">
                      <div>
                        <div className="text-xs font-bold text-indigo-800 mb-1 flex items-center justify-between">
                          <span>💎 1객실당 총 부대소비 (RevPAS)</span>
                          <span className="text-[11px] font-extrabold bg-indigo-200 text-indigo-900 px-2 py-0.5 rounded-full">식음+레저 합산 (골프 불포함)</span>
                        </div>
                        <div className="text-2xl font-extrabold text-indigo-700 my-2">
                          ₩{formatCurrency(liveTotal)} <span className="text-xs font-normal text-indigo-500">/ 1실</span>
                        </div>
                        <div className="space-y-1 text-xs text-indigo-950 pt-2 border-t border-indigo-200/60">
                          <div className="flex justify-between">
                            <span>• 1박 고객 기준치:</span>
                            <span className="text-slate-400">약 ₩219,000 / 실</span>
                          </div>
                          <div className="flex justify-between font-bold text-emerald-700">
                            <span>• 연박 고객(2박) 기준치:</span>
                            <span>약 ₩474,000 / 실 (일평균 ₩23.7만)</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-indigo-900/80 mt-3 pt-2 border-t border-indigo-200/40">
                        ※ 리조트 직영 식음·레저 결합 지표로, <strong>골프장 매출은 불포함</strong>되어 있습니다.
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Chart Component */}
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={losTrendData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 11, fill: '#64748b' }} 
                      dy={10} 
                      tickFormatter={(val: string) => {
                        const parts = val.split('-');
                        return parts.length === 3 ? `${Number(parts[1])}/${Number(parts[2])}` : val;
                      }}
                    />
                    <YAxis 
                      yAxisId="left" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 11, fill: '#6366f1' }} 
                      dx={-10} 
                      tickFormatter={(val) => `${val}%`} 
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 11, fill: '#059669' }} 
                      dx={10} 
                      tickFormatter={(val) => losMetricMode === 'revpas' ? `${(val / 10000).toFixed(0)}만/실` : `${(val / 10000).toFixed(0)}만`} 
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)' }}
                      formatter={(value: any, name: any) => {
                        if (name === '연박(2박+) 비중') return [`${value}%`, name];
                        return [`${new Intl.NumberFormat('ko-KR').format(value)}원`, name];
                      }}
                      labelFormatter={(label) => `📅 일자: ${label}`}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                    <Bar 
                      yAxisId="right" 
                      dataKey={losMetricMode === 'revpas' ? 'fnbRevPAS' : 'totalSynergySales'} 
                      name={losMetricMode === 'revpas' ? '1객실당 식음 지출액 (RevPAS)' : '식음·레저 부대시설 총매출'} 
                      fill="#10b981" 
                      radius={[6, 6, 0, 0]} 
                      barSize={losTrendData.length > 20 ? 15 : 28} 
                      opacity={0.65} 
                    />
                    {losMetricMode === 'revpas' && (
                      <Bar 
                        yAxisId="right" 
                        dataKey="leisureRevPAS" 
                        name="1객실당 레저 지출액 (RevPAS)" 
                        fill="#06b6d4" 
                        radius={[6, 6, 0, 0]} 
                        barSize={losTrendData.length > 20 ? 15 : 28} 
                        opacity={0.65} 
                      />
                    )}
                    <Line 
                      yAxisId="left" 
                      type="monotone" 
                      dataKey="multiNightRatio" 
                      name="연박(2박+) 비중" 
                      stroke="#6366f1" 
                      strokeWidth={3} 
                      dot={{ r: 4, strokeWidth: 2, fill: '#ffffff', stroke: '#6366f1' }} 
                      activeDot={{ r: 7, fill: '#6366f1' }} 
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* 1일 vs 1일 단위 경영 비교 테이블 */}
              <div className="mt-6 pt-5 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    📊 1일 단위 (Day-by-Day) 1박 vs 연박 세부 소비 및 생산성 대조표
                  </h3>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 self-start sm:self-auto">
                    24일간(7/24~8/16) 투숙객 전수 카드결제 추적 실측 모델
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                    <thead className="bg-slate-100/80 text-slate-600 font-bold">
                      <tr>
                        <th className="py-2.5 px-4">비교 항목</th>
                        <th className="py-2.5 px-4 text-slate-600">1박 단기 투숙 (1일 기준)</th>
                        <th className="py-2.5 px-4 text-indigo-700 bg-indigo-50/50">2박 연박 투숙 (1일 평균 및 일자별)</th>
                        <th className="py-2.5 px-4 text-emerald-700">1일 단위 비교 분석 및 경영 효과</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      <tr>
                        <td className="py-2.5 px-4 font-bold text-slate-800">1일당 평균 부대소비</td>
                        <td className="py-2.5 px-4 text-slate-600"><strong>₩219,000 / 일</strong></td>
                        <td className="py-2.5 px-4 font-extrabold text-indigo-600 bg-indigo-50/30"><strong>₩237,000 / 일</strong> (일평균 +8.2%)</td>
                        <td className="py-2.5 px-4 font-bold text-emerald-600">연박객이 매일 1.8만 원씩 부대시설에 더 지출</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-bold text-slate-800">체류 일자별 소비 패턴</td>
                        <td className="py-2.5 px-4 text-slate-500">1일차: ₩21.9만 (저녁 1끼+체험 1회)</td>
                        <td className="py-2.5 px-4 text-indigo-700 bg-indigo-50/30">
                          1일차: ₩18.2만 (체크인 당일)<br />
                          <strong>2일차: ₩29.2만 (온전한 체류일 +33.3% 폭증🔥)</strong>
                        </td>
                        <td className="py-2.5 px-4 font-bold text-emerald-600">2일차 Full Day 체류로 조·중·석식+레저 집중 결제</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-bold text-slate-800">객실 1실의 2일간 총매출</td>
                        <td className="py-2.5 px-4 text-slate-500">1박 2팀 유치 = ₩438,000</td>
                        <td className="py-2.5 px-4 font-bold text-indigo-700 bg-indigo-50/30">2박 1팀 유치 = ₩474,000</td>
                        <td className="py-2.5 px-4 font-bold text-emerald-600">방 1개당 2일간 +3.6만 원 추가 부대매출 창출</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-bold text-slate-800">객실 관리 비용 (턴오버)</td>
                        <td className="py-2.5 px-4 text-rose-500">청소 2회 + 린넨 세탁 2회 (비용 과다)</td>
                        <td className="py-2.5 px-4 font-bold text-indigo-700 bg-indigo-50/30">중간 청소 0회 (청소/세탁비 50% 절감)</td>
                        <td className="py-2.5 px-4 font-bold text-emerald-600">💡 부대매출 증가 + 원가 절감 ➔ 영업이익(EBITDA) 극대화</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-bold text-slate-800">낮 시간대 시설 가동률</td>
                        <td className="py-2.5 px-4 text-slate-500">체크인/아웃 사이 부대시설 공실 발생</td>
                        <td className="py-2.5 px-4 font-bold text-indigo-600 bg-indigo-50/30">낮 시간 식음/목장/루지 시설 풀가동</td>
                        <td className="py-2.5 px-4 font-bold text-emerald-600">📈 리조트 전 시설 자산 회전율 극대화</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
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
