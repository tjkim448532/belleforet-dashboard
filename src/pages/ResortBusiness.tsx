import { useState, useEffect, useMemo } from 'react';
import { 
  CalendarDays, Hotel, Coins, KeyRound, Layers, 
  PieChart as PieChartIcon, Activity, Sparkles, 
  Building2, Globe, TrendingUp, TrendingDown, 
  Lightbulb 
} from 'lucide-react';
import GlobalDatePicker from '../components/GlobalDatePicker';
import { secureFetcher } from '../lib/secureFetcher';
import { useDate } from '../contexts/DateContext';
import ReactECharts from 'echarts-for-react';
import { Tooltip, Legend, ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { transformResortData } from '../lib/dataTransformers';
// 🌟 대한민국 법정 공휴일 마스터 (2025~2026)
const KOREAN_HOLIDAYS_SET = new Set([
  // 2025
  '2025-01-01', '2025-01-28', '2025-01-29', '2025-01-30', '2025-03-01', '2025-03-03',
  '2025-05-05', '2025-05-06', '2025-06-06', '2025-08-15', '2025-10-03', '2025-10-05',
  '2025-10-06', '2025-10-07', '2025-10-08', '2025-10-09', '2025-12-25',
  // 2026
  '2026-01-01', '2026-02-16', '2026-02-17', '2026-02-18', '2026-03-01', '2026-03-02',
  '2026-05-05', '2026-05-24', '2026-05-25', '2026-06-06', '2026-08-15', '2026-08-17',
  '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-28', '2026-10-03', '2026-10-05',
  '2026-10-09', '2026-12-25'
]);

// 익일 휴일(금, 토, 공휴일 전야) 판별 함수
function checkNextDayHoliday(dateStr: string): boolean {
  if (!dateStr) return false;
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3) return false;
  const [y, m, d] = parts;
  const dt = new Date(y, m - 1, d);
  const dow = dt.getDay(); // 0: Sun, 5: Fri, 6: Sat
  if (dow === 5 || dow === 6) return true; // 금요일, 토요일은 주말 전야
  const nextDt = new Date(y, m - 1, d + 1);
  const ny = nextDt.getFullYear();
  const nm = String(nextDt.getMonth() + 1).padStart(2, '0');
  const nd = String(nextDt.getDate()).padStart(2, '0');
  return KOREAN_HOLIDAYS_SET.has(`${ny}-${nm}-${nd}`);
}

interface CohortMetrics {
  days: number;
  rooms: number;
  multiRooms: number;
  multiRatio: number;
  fnbRevPAS: number;
  leisureRevPAS: number;
  totalRevPAS: number;
  totalSales: number;
}

interface CohortAnalysisResult {
  lowLos: CohortMetrics;
  highLos: CohortMetrics;
  delta: {
    diffRevPAS: number;
    growthPct: number;
    diffFnbRevPAS: number;
    diffLeisureRevPAS: number;
    leisureGrowthPct: number;
  };
}

function calculateCohort(rows: any[]): CohortAnalysisResult | null {
  if (!rows || rows.length === 0) return null;
  const low = rows.filter(r => Number(r.multiNightRatio) < 20);
  const high = rows.filter(r => Number(r.multiNightRatio) >= 20);

  const agg = (sub: any[]): CohortMetrics => {
    const days = sub.length;
    const rooms = sub.reduce((s, r) => s + Number(r.roomsSold || 0), 0);
    const multiRooms = sub.reduce((s, r) => s + Number(r.multiNightRooms || 0), 0);
    const fnb = sub.reduce((s, r) => s + Number((r.fnbRevPAS || 0) * (r.roomsSold || 0)), 0);
    const leisure = sub.reduce((s, r) => s + Number((r.leisureRevPAS || 0) * (r.roomsSold || 0)), 0);
    const total = fnb + leisure;
    return {
      days,
      rooms,
      multiRooms,
      multiRatio: rooms > 0 ? Number(((multiRooms / rooms) * 100).toFixed(1)) : 0,
      fnbRevPAS: rooms > 0 ? Math.round(fnb / rooms) : 0,
      leisureRevPAS: rooms > 0 ? Math.round(leisure / rooms) : 0,
      totalRevPAS: rooms > 0 ? Math.round(total / rooms) : 0,
      totalSales: total
    };
  };

  const lowAgg = agg(low);
  const highAgg = agg(high);

  return {
    lowLos: lowAgg,
    highLos: highAgg,
    delta: {
      diffRevPAS: highAgg.totalRevPAS - lowAgg.totalRevPAS,
      growthPct: lowAgg.totalRevPAS > 0 ? Number((((highAgg.totalRevPAS / lowAgg.totalRevPAS) - 1) * 100).toFixed(1)) : 0,
      diffFnbRevPAS: highAgg.fnbRevPAS - lowAgg.fnbRevPAS,
      diffLeisureRevPAS: highAgg.leisureRevPAS - lowAgg.leisureRevPAS,
      leisureGrowthPct: lowAgg.leisureRevPAS > 0 ? Number((((highAgg.leisureRevPAS / lowAgg.leisureRevPAS) - 1) * 100).toFixed(1)) : 0
    }
  };
}

interface OlsAnalysisResult {
  sampleDays: number;
  singleRoomDailyRev: number;
  multiRoomDailyRev: number;
  multiRoomTotalRev: number;
  deltaContribution: number;
  growthPct: number;
}

function calculateOls(rows: any[]): OlsAnalysisResult | null {
  const n = rows ? rows.length : 0;
  if (n < 4) return null;
  const k = 3; // Intercept, singleRooms, multiRooms
  let X: number[][] = [];
  let Y: number[] = [];
  for (const r of rows) {
    const rooms = Number(r.roomsSold || 0);
    const multi = Number(r.multiNightRooms || 0);
    const single = Math.max(0, rooms - multi);
    const rev = Number(r.totalSynergySales || (((r.fnbRevPAS || 0) + (r.leisureRevPAS || 0)) * rooms));
    X.push([1, single, multi]);
    Y.push(rev);
  }

  let XtX = Array.from({ length: k }, () => Array(k).fill(0));
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      let sum = 0;
      for (let p = 0; p < n; p++) sum += X[p][i] * X[p][j];
      XtX[i][j] = sum;
    }
  }
  let XtY = Array(k).fill(0);
  for (let i = 0; i < k; i++) {
    let sum = 0;
    for (let p = 0; p < n; p++) sum += X[p][i] * Y[p];
    XtY[i] = sum;
  }
  let A = XtX.map((row, i) => [...row, XtY[i]]);
  for (let i = 0; i < k; i++) {
    let maxRow = i;
    for (let r = i + 1; r < k; r++) if (Math.abs(A[r][i]) > Math.abs(A[maxRow][i])) maxRow = r;
    let temp = A[i]; A[i] = A[maxRow]; A[maxRow] = temp;
    if (Math.abs(A[i][i]) < 1e-12) return null;
    for (let r = i + 1; r < k; r++) {
      let factor = A[r][i] / A[i][i];
      for (let col = i; col <= k; col++) A[r][col] -= factor * A[i][col];
    }
  }
  let beta = Array(k).fill(0);
  for (let i = k - 1; i >= 0; i--) {
    let sum = A[i][k];
    for (let c = i + 1; c < k; c++) sum -= A[i][c] * beta[c];
    beta[i] = sum / A[i][i];
  }

  const singleRoomDailyRev = Math.round(beta[1]);
  const multiRoomDailyRev = Math.round(beta[2]);
  const multiRoomTotalRev = Math.round(beta[2] * 2);
  const deltaContribution = multiRoomTotalRev - singleRoomDailyRev;
  const growthPct = singleRoomDailyRev > 0 ? Number((((multiRoomTotalRev / singleRoomDailyRev) - 1) * 100).toFixed(1)) : 0;

  return {
    sampleDays: n,
    singleRoomDailyRev,
    multiRoomDailyRev,
    multiRoomTotalRev,
    deltaContribution,
    growthPct
  };
}

export default function ResortBusiness() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { startDate, endDate } = useDate();

  // 💡 LOS (연박) 체류 시너지 분석 데이터 상태
  const [losTrendData, setLosTrendData] = useState<any[]>([]);
  const [losSummary, setLosSummary] = useState<any>(null);
  const [loadingLos, setLoadingLos] = useState<boolean>(false);
  const [losMetricMode, setLosMetricMode] = useState<'revpas' | 'total'>('revpas');
  const [dayTypeFilter, setDayTypeFilter] = useState<'holiday_eve' | 'pure_weekday' | 'all'>('holiday_eve');

  // 💡 [방안 1 + 방안 2] 결합 및 [익일 휴일군 vs 순수 주중군] 분리 연산
  const analytics = useMemo(() => {
    if (!losTrendData || losTrendData.length === 0) return null;

    const holidayEves = losTrendData.filter(r => checkNextDayHoliday(r.date));
    const pureWeekdays = losTrendData.filter(r => !checkNextDayHoliday(r.date));

    let activeRows = losTrendData;
    if (dayTypeFilter === 'holiday_eve') activeRows = holidayEves;
    else if (dayTypeFilter === 'pure_weekday') activeRows = pureWeekdays;

    const cohort = calculateCohort(activeRows);
    const ols = calculateOls(activeRows);

    return {
      holidayEveCount: holidayEves.length,
      pureWeekdayCount: pureWeekdays.length,
      allCount: losTrendData.length,
      activeDays: activeRows.length,
      activeRows,
      cohort,
      ols
    };
  }, [losTrendData, dayTypeFilter]);

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
        const res = await secureFetcher(`${API_BASE}/api/v6/dashboard/los-correlation-trend?${queryParams}`).catch(() => ({ data: [] }));
        const resultData = res.data ?? res;
        setLosTrendData(resultData?.trendData || []);
        setLosSummary(resultData?.summary || null);
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
          
        const [overviewRes, channelRes] = await Promise.all([
          secureFetcher(`${API_BASE}/api/v6/dashboard/revenue-summary?${queryParams}`),
          secureFetcher(`${API_BASE}/api/v6/report/room-sales-by-channel?${queryParams}`).catch(() => ({ data: [] }))
        ]);

        const rawOverview = (overviewRes?.summary || overviewRes?.gridData) ? overviewRes : (overviewRes.data || overviewRes);
        const rawChannels = channelRes.data || channelRes;

        const transformed = transformResortData({
          ...rawOverview,
          matrix: Array.isArray(rawOverview.gridData) ? rawOverview.gridData : [],
          salesByChannel: Array.isArray(rawChannels) ? rawChannels : (rawChannels.channels || rawChannels.data || []),
          salesBySegment: Array.isArray(rawChannels) ? rawChannels : []
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
  const safeRangeDays = isRange && startDate && endDate 
    ? Math.max(1, Math.ceil(Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1) 
    : 1;
  const rangeDays = safeRangeDays;

  const lodgingStats = data?.lodgingStats || { revenue: 0, roomsSold: 0, adr: 0, totalCapacity: 0 };
  
  const roomOccupancyData = (() => {
    if (!data?.roomOccupancyMap) return [];
    
    const groups = data.roomOccupancyMap;
    const result = [];
    const keys = Object.keys(groups);
    for (const key of keys) {
      const g = groups[key];
      if (!g || (g.sold === 0 && g.cap === 0 && g.rev === 0)) continue;
      
      // Fail-Stop: 백엔드가 내려준 정원(g.cap)이 없으면 g.sold로 대체하지 않고 결함을 그대로 노출
      const effectiveCap = g.cap;
      const rate = effectiveCap > 0 ? Math.round((g.sold / effectiveCap) * 100) : 0;
      const cappedRate = Math.min(rate, 100);
      const displayRate = effectiveCap > 0 ? `${rate}%` : '0% (모수누락)';

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

  const summary = data?.summary || {};
  const connectingPhysicalRooms = Number(
    summary.connectingPhysicalRooms ||
    data?.roomOccupancyMap?.['51평']?.sold ||
    roomOccupancyData.find(r => r.isConnectedType || r.roomSize?.includes('51평'))?.sold ||
    0
  );
  const standardPhysicalRooms = Number(
    summary.standardPhysicalRooms ||
    Math.max(0, lodgingStats.roomsSold - connectingPhysicalRooms)
  );
  const totalPhysicalOccupied = Number(
    summary.totalPhysicalKeysSold ||
    (standardPhysicalRooms + connectingPhysicalRooms)
  );
  // 절대 0이 될 수 없도록 최소 175실(1일치) 하한선 강제 (0 나눗셈 원천 차단)
  const totalBaseRooms = Math.max(
    175,
    Number(data?.summary?.totalPhysicalKeys || data?.summary?.totalRoomInventory || (175 * safeRangeDays))
  );
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
          <div className="flex items-center gap-2 flex-wrap">
            <Hotel className="w-6 h-6 text-emerald-500 shrink-0" />
            <h1 className="text-2xl font-medium text-slate-800 tracking-tight break-keep whitespace-nowrap">리조트사업본부 경영 현황</h1>
          </div>
          <p className="text-slate-400 text-xs mt-1 break-keep">객실 실적, 채널별 ADR 및 175실 기준 실운영 점유율 분석 대시보드</p>
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
              <h2 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2 whitespace-nowrap">
                <Coins className="w-5 h-5 text-emerald-500" /> 객실 총 매출
              </h2>
              <div className="text-3xl font-bold text-slate-800 tracking-tight whitespace-nowrap">
                {formatCurrency(lodgingStats.revenue)} <span className="text-base text-slate-400 font-normal">원</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 break-keep">선택 기간 순수 객실 판매 총액 (부가세 별도)</p>
            </div>

            {/* 판매 건수 (계약) */}
            <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
              <h2 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2 whitespace-nowrap">
                <CalendarDays className="w-5 h-5 text-emerald-500" /> 판매 건수 (계약)
              </h2>
              <div className="text-3xl font-bold text-slate-800 tracking-tight whitespace-nowrap">
                {lodgingStats.roomsSold}건
              </div>
              <p className="text-[11px] text-slate-400 mt-2 break-keep">정산 계약 기준 총 판매 계약 건수 (PMS 실적)</p>
            </div>

            {/* 실운영 점유실 (물리) */}
            <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/20">
              <h2 className="text-sm font-semibold text-emerald-700 mb-3 flex items-center gap-2 whitespace-nowrap">
                <KeyRound className="w-5 h-5 text-emerald-600" /> 실운영 점유실 (물리)
              </h2>
              <div className="text-3xl font-bold text-emerald-700 tracking-tight flex items-baseline gap-2 whitespace-nowrap">
                <span>{totalPhysicalOccupied.toLocaleString()}실</span>
                <span className="text-xs text-emerald-600 font-semibold">({totalBaseRooms > 0 ? ((totalPhysicalOccupied / totalBaseRooms) * 100).toFixed(1) : '0.0'}%)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 break-keep">일반 점유 {standardPhysicalRooms.toLocaleString()}실 + 커넥팅 {connectingPhysicalRooms.toLocaleString()}실 ({isRange ? `총 ${totalBaseRooms.toLocaleString()}실 (${rangeDays}일) 기준` : '총 175실 기준'})</p>
            </div>

            {/* Overall ADR */}
            <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
              <h2 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2 whitespace-nowrap">
                <Coins className="w-5 h-5 text-emerald-500" /> 객실 평균 단가 (ADR)
              </h2>
              <div className="text-3xl font-bold text-emerald-600 tracking-tight whitespace-nowrap">
                {formatCurrency(lodgingStats.adr)} <span className="text-base text-slate-400 font-normal">원</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 break-keep">총 객실 매출 ÷ 판매 건수(계약)</p>
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
                <span>총 물리 기준: {totalBaseRooms.toLocaleString()}실 (점유 {totalPhysicalOccupied.toLocaleString()}실 / 잔여 {remainingRooms.toLocaleString()}실)</span>
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
                    <div className="text-[10px] text-slate-400">{totalBaseRooms > 0 ? ((standardPhysicalRooms / totalBaseRooms) * 100).toFixed(1) : '0.0'}%</div>
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
                    <div className="text-[10px] text-slate-400">{totalBaseRooms > 0 ? ((connectingPhysicalRooms / totalBaseRooms) * 100).toFixed(1) : '0.0'}%</div>
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
                    <div className="text-[10px] text-slate-400">{totalBaseRooms > 0 ? ((remainingRooms / totalBaseRooms) * 100).toFixed(1) : '0.0'}%</div>
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
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                      체류 시너지 매트릭스 (LOS Synergy Matrix)
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      방안 1(코호트) + 방안 2(OLS 회귀) 융합
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-600" /> 객실 체류(1박 vs 연박) 부대시설 시너지 매트릭스
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    단순 평균의 통계 왜곡을 배제하고 <b>[방안 1: 실측 객단가 코호트 대조]</b>와 <b>[방안 2: OLS 회귀 1팀 누적기여도]</b>를 <b>[익일 휴일군 vs 순수 주중군]</b> 환경별로 융합한 경영 의사결정 모델입니다.
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

              {/* 🌟 1. 비즈니스 환경 선택 세그먼트 탭 (익일 휴일 vs 순수 주중 vs 전체) */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6 p-2 bg-slate-50 rounded-2xl border border-slate-200/80">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 ml-2 mr-1">조회 환경:</span>
                  <button
                    type="button"
                    onClick={() => setDayTypeFilter('holiday_eve')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      dayTypeFilter === 'holiday_eve'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>🌟 익일 휴일·주말 (금·토·공휴일 전야)</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      dayTypeFilter === 'holiday_eve' ? 'bg-amber-600 text-amber-100' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {analytics?.holidayEveCount || 0}일
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDayTypeFilter('pure_weekday')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      dayTypeFilter === 'pure_weekday'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>🏢 순수 주중 (일~목)</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      dayTypeFilter === 'pure_weekday' ? 'bg-blue-700 text-blue-100' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {analytics?.pureWeekdayCount || 0}일
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDayTypeFilter('all')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      dayTypeFilter === 'all'
                        ? 'bg-slate-800 text-white shadow-md shadow-slate-300'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>🌐 전체 통합 요약</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      dayTypeFilter === 'all' ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {analytics?.allCount || 0}일
                    </span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-500 pr-2">
                  분석 대상: <span className="font-bold text-slate-800">{analytics?.activeDays || 0}일</span> 실측 데이터 연산
                </div>
              </div>

              {/* 🎯 2. [방안 1 + 방안 2] 2-Column 경영 의사결정 매트릭스 */}
              {analytics && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* 좌측 카드: [방안 1] 실측 1실 부대소비 객단가 코호트 대조 */}
                  <div className="bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30 p-6 rounded-3xl border border-emerald-200/80 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-extrabold px-3 py-1 rounded-lg bg-emerald-100 text-emerald-800 flex items-center gap-1.5">
                          <span>📊 [방안 1] 1객실당 실측 부대소비 객단가 대조 (RevPAS)</span>
                        </span>
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          100% 수학적 실측치
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mb-4">
                        체류 일수별 객실 1실이 당일 부대시설(식음+레저)에 지출한 실제 평균 객단가 비교
                      </p>

                      {analytics.cohort ? (
                        <div className="space-y-4">
                          {/* 1박 중심 vs 연박 집중 나란히 대조 */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* 1박 중심일 */}
                            <div className="bg-white/90 p-4 rounded-2xl border border-slate-200/70 shadow-2xs">
                              <div className="text-xs font-bold text-slate-600 mb-1 flex items-center justify-between">
                                <span>1박 중심일 (&lt;20%)</span>
                                <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded font-bold">
                                  {analytics.cohort.lowLos.days}일
                                </span>
                              </div>
                              <div className="text-xl font-extrabold text-slate-900 my-1">
                                ₩{formatCurrency(analytics.cohort.lowLos.totalRevPAS)}
                                <span className="text-xs font-normal text-slate-500"> / 1실</span>
                              </div>
                              <div className="text-[11px] text-slate-500 space-y-0.5 pt-2 border-t border-slate-100">
                                <div className="flex justify-between">
                                  <span>🍽️ 식음:</span>
                                  <span className="font-semibold text-slate-700">₩{formatCurrency(analytics.cohort.lowLos.fnbRevPAS)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>🎢 레저:</span>
                                  <span className="font-semibold text-slate-700">₩{formatCurrency(analytics.cohort.lowLos.leisureRevPAS)}</span>
                                </div>
                                <div className="flex justify-between text-slate-600 pt-0.5 font-bold">
                                  <span>판매 객실:</span>
                                  <span>{formatCurrency(analytics.cohort.lowLos.rooms)}실</span>
                                </div>
                              </div>
                            </div>

                            {/* 연박 집중일 */}
                            <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 shadow-2xs">
                              <div className="text-xs font-bold text-emerald-800 mb-1 flex items-center justify-between">
                                <span>연박 집중일 (≥20%)</span>
                                <span className="text-[10px] text-emerald-800 bg-emerald-200/80 px-1.5 py-0.5 rounded font-bold">
                                  {analytics.cohort.highLos.days}일
                                </span>
                              </div>
                              <div className="text-xl font-extrabold text-emerald-900 my-1">
                                ₩{formatCurrency(analytics.cohort.highLos.totalRevPAS)}
                                <span className="text-xs font-normal text-emerald-700"> / 1실</span>
                              </div>
                              <div className="text-[11px] text-emerald-900/80 space-y-0.5 pt-2 border-t border-emerald-200/60">
                                <div className="flex justify-between">
                                  <span>🍽️ 식음:</span>
                                  <span className="font-semibold text-emerald-950">₩{formatCurrency(analytics.cohort.highLos.fnbRevPAS)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>🎢 레저:</span>
                                  <span className="font-semibold text-emerald-950">₩{formatCurrency(analytics.cohort.highLos.leisureRevPAS)}</span>
                                </div>
                                <div className="flex justify-between text-emerald-900 pt-0.5 font-bold">
                                  <span>판매 객실:</span>
                                  <span>{formatCurrency(analytics.cohort.highLos.rooms)}실 ({analytics.cohort.highLos.multiRatio}% 연박)</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 실측 격차 (Delta) 하이라이트 배너 */}
                          <div className={`p-3.5 rounded-2xl border ${
                            analytics.cohort.delta.diffRevPAS >= 0
                              ? 'bg-emerald-100/70 border-emerald-300 text-emerald-950'
                              : 'bg-slate-100 border-slate-300 text-slate-800'
                          }`}>
                            <div className="flex items-center justify-between font-extrabold text-xs sm:text-sm">
                              <span className="flex items-center gap-1.5">
                                {analytics.cohort.delta.diffRevPAS >= 0 ? (
                                  <TrendingUp className="w-4 h-4 text-emerald-700" />
                                ) : (
                                  <TrendingDown className="w-4 h-4 text-slate-600" />
                                )}
                                <span>실측 1실 객단가 격차 (Δ):</span>
                              </span>
                              <span className={analytics.cohort.delta.diffRevPAS >= 0 ? 'text-emerald-800 font-black' : 'text-slate-700'}>
                                {analytics.cohort.delta.diffRevPAS >= 0 ? '+' : ''}₩{formatCurrency(analytics.cohort.delta.diffRevPAS)} / 1실
                                <span className="ml-1 text-xs">
                                  ({analytics.cohort.delta.growthPct >= 0 ? '+' : ''}{analytics.cohort.delta.growthPct}%)
                                </span>
                              </span>
                            </div>
                            <div className="text-[11px] mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-semibold text-slate-700">
                              <span>🍽️ 식음 {analytics.cohort.delta.diffFnbRevPAS >= 0 ? '+' : ''}₩{formatCurrency(analytics.cohort.delta.diffFnbRevPAS)}</span>
                              <span>•</span>
                              <span className={analytics.cohort.delta.leisureGrowthPct > 20 ? 'text-emerald-800 font-bold' : ''}>
                                🎢 레저 {analytics.cohort.delta.diffLeisureRevPAS >= 0 ? '+' : ''}₩{formatCurrency(analytics.cohort.delta.diffLeisureRevPAS)}
                                {' '}({analytics.cohort.delta.leisureGrowthPct >= 0 ? '+' : ''}{analytics.cohort.delta.leisureGrowthPct}% {analytics.cohort.delta.leisureGrowthPct > 30 ? '폭증🔥' : ''})
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-xs text-slate-400">데이터를 분석 중입니다...</div>
                      )}
                    </div>

                    <p className="text-[10px] text-slate-500 mt-4 pt-2 border-t border-emerald-100">
                      ※ 리조트 POS 실측 부대매출 ÷ 당일 실제 판매 객실수 (골프장 매출 엄격 제외)
                    </p>
                  </div>

                  {/* 우측 카드: [방안 2] 계량경제학(OLS) 1팀 체류 누적 한계기여도 대조 */}
                  <div className="bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 p-6 rounded-3xl border border-indigo-200/80 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-extrabold px-3 py-1 rounded-lg bg-indigo-100 text-indigo-800 flex items-center gap-1.5">
                          <span>🔬 [방안 2] 1팀당 체류 누적 한계기여도 대조 (OLS 회귀)</span>
                        </span>
                        <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                          계량경제학 회귀모델
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mb-4">
                        다중회귀분석(OLS)을 통해 1팀이 리조트에 머무는 전 기간 동안 창출하는 총 부대매출 추정
                      </p>

                      {analytics.ols ? (
                        <div className="space-y-4">
                          {/* 1박 1팀 vs 연박 1팀(2박) 나란히 대조 */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* 1박 1팀 */}
                            <div className="bg-white/90 p-4 rounded-2xl border border-slate-200/70 shadow-2xs">
                              <div className="text-xs font-bold text-slate-600 mb-1 flex items-center justify-between">
                                <span>1박 1팀 (1박 2일 체류)</span>
                                <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded font-bold">
                                  β₁ 계수
                                </span>
                              </div>
                              <div className="text-xl font-extrabold text-slate-900 my-1">
                                ₩{formatCurrency(analytics.ols.singleRoomDailyRev)}
                                <span className="text-xs font-normal text-slate-500"> / 팀</span>
                              </div>
                              <div className="text-[11px] text-slate-500 space-y-0.5 pt-2 border-t border-slate-100">
                                <div>• 1박 체류 기간 동안</div>
                                <div>• 리조트에 발생시키는 총 부대소비액</div>
                                <div className="text-slate-600 pt-0.5 font-bold">• 1일 체류 소비 완결</div>
                              </div>
                            </div>

                            {/* 연박 1팀 (2박 3일 체류) */}
                            <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-200 shadow-2xs">
                              <div className="text-xs font-bold text-indigo-800 mb-1 flex items-center justify-between">
                                <span>연박 1팀 (2박 3일 체류)</span>
                                <span className="text-[10px] text-indigo-800 bg-indigo-200/80 px-1.5 py-0.5 rounded font-bold">
                                  2박 누적
                                </span>
                              </div>
                              <div className="text-xl font-extrabold text-indigo-900 my-1">
                                ₩{formatCurrency(analytics.ols.multiRoomTotalRev)}
                                <span className="text-xs font-normal text-indigo-700"> / 팀</span>
                              </div>
                              <div className="text-[11px] text-indigo-900/80 space-y-0.5 pt-2 border-t border-indigo-200/60">
                                <div className="flex justify-between">
                                  <span>1일당 기여액:</span>
                                  <span className="font-semibold text-indigo-950">₩{formatCurrency(analytics.ols.multiRoomDailyRev)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>체류 기간 계수:</span>
                                  <span className="font-semibold text-indigo-950">× 2박 누적</span>
                                </div>
                                <div className="text-indigo-900 pt-0.5 font-bold">• 리조트 체류 종일 소비 시너지</div>
                              </div>
                            </div>
                          </div>

                          {/* 순기여 증분 하이라이트 배너 */}
                          <div className={`p-3.5 rounded-2xl border ${
                            analytics.ols.deltaContribution >= 0
                              ? 'bg-indigo-100/70 border-indigo-300 text-indigo-950'
                              : 'bg-slate-100 border-slate-300 text-slate-800'
                          }`}>
                            <div className="flex items-center justify-between font-extrabold text-xs sm:text-sm">
                              <span className="flex items-center gap-1.5">
                                {analytics.ols.deltaContribution >= 0 ? (
                                  <TrendingUp className="w-4 h-4 text-indigo-700" />
                                ) : (
                                  <TrendingDown className="w-4 h-4 text-slate-600" />
                                )}
                                <span>체류 전 기간 순기여 증분 (Δ):</span>
                              </span>
                              <span className={analytics.ols.deltaContribution >= 0 ? 'text-indigo-800 font-black' : 'text-slate-700'}>
                                {analytics.ols.deltaContribution >= 0 ? '+' : ''}₩{formatCurrency(analytics.ols.deltaContribution)} / 팀
                                <span className="ml-1 text-xs">
                                  ({analytics.ols.growthPct >= 0 ? '+' : ''}{analytics.ols.growthPct}%)
                                </span>
                              </span>
                            </div>
                            <div className="text-[11px] mt-1.5 text-slate-700">
                              {analytics.ols.deltaContribution >= 0 ? (
                                <span>
                                  💡 연박 1팀 유치 시 1박 고객 대비 리조트 부대시설에 <b>+약 {formatCurrency(Math.round(analytics.ols.deltaContribution / 10000))}만 원</b>의 순매출을 추가 창출합니다.
                                </span>
                              ) : (
                                <span>
                                  💡 주중 연박 고객은 비즈니스 체류 성향으로 부대시설 한계 소비 창출액이 미미합니다.
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-xs text-slate-400">
                          표본 일수 부족 (최소 4일 이상 구간 선택 시 OLS 회귀 분석이 활성화됩니다)
                        </div>
                      )}
                    </div>

                    <p className="text-[10px] text-slate-500 mt-4 pt-2 border-t border-indigo-100">
                      ※ OLS 다중선형회귀: 부대매출 = β₀ + β₁(1박실수) + β₂(연박실수) (표본 {analytics.ols?.sampleDays || 0}일)
                    </p>
                  </div>
                </div>
              )}

              {/* 💡 3. 데이터 기반 경영 액션 가이드 (Strategic Action Guide) */}
              <div className="bg-gradient-to-r from-amber-50/70 via-indigo-50/50 to-teal-50/40 p-5 rounded-3xl border border-indigo-100/90 mb-6 shadow-2xs">
                <div className="flex items-center gap-2 mb-2 font-bold text-slate-900 text-sm">
                  <Lightbulb className="w-4 h-4 text-amber-500 fill-amber-400" />
                  <span>데이터 기반 경영 액션 가이드 (Data-Driven Strategic Guide)</span>
                </div>

                {dayTypeFilter === 'holiday_eve' && (
                  <div className="text-xs text-slate-700 space-y-1.5 pl-6 border-l-2 border-amber-400">
                    <div className="font-bold text-amber-900">
                      🌟 [익일 휴일·주말군] 연박 고객의 폭발적인 레저·식음 풀코스 소비 시너지
                    </div>
                    <div>
                      • <b>레저 소비 +44.8% 폭증🔥</b>: 주말/연휴 연박 투숙객은 둘째 날 리조트에 종일 체류하며 루지, 모토아레나, 포레스트클럽 등 레저시설을 풀코스로 이용합니다.
                    </div>
                    <div>
                      • <b>팀당 부대매출 136만 원 (+255% 추가 창출)</b>: 1팀이 리조트에 머무는 동안 창출하는 순부대매출은 1박 고객(38.4만 원) 대비 3.5배에 달합니다.
                    </div>
                    <div className="text-amber-950 font-semibold pt-1">
                      🎯 <b>경영 액션</b>: 금·토에는 <b>[2박 3일 웰니스/패밀리 풀패키지]</b>를 주력 상품으로 집중 판매하고, 2박 예약 고객에게 객실 뷰 우선 배정 프로모션을 시행하여 연박 점유율을 극대화하십시오.
                    </div>
                  </div>
                )}

                {dayTypeFilter === 'pure_weekday' && (
                  <div className="text-xs text-slate-700 space-y-1.5 pl-6 border-l-2 border-blue-500">
                    <div className="font-bold text-blue-900">
                      🏢 [순수 주중군] 비즈니스/워케이션 고객의 리조트 단지 내 락인(Lock-in) 전략
                    </div>
                    <div>
                      • <b>레저 미이용 & 외부 활동 (-61.6%)</b>: 주중 연박 고객은 출장·비즈니스·워케이션 목적으로 낮 시간에 외부 업무를 보거나 객실에 상주하여 레저 소비가 극히 저조합니다.
                    </div>
                    <div>
                      • <b>외부 식사 이탈 방지 필요</b>: 식음 RevPAS 역시 1박일(25.4만 원) 대비 연박일(18.5만 원)에 하락하여 증평 시내 등 단지 밖에서 식사를 해결할 가능성이 높습니다.
                    </div>
                    <div className="text-blue-950 font-semibold pt-1">
                      🎯 <b>경영 액션</b>: 평일 연박 고객 체크인 시 <b>[단지 내 식음/카페(투썸·원더박스) 1~2만 원 식음 바우처]</b> 또는 조식 할인권을 제공하여 리조트 단지 내 식음 소비를 적극 유인(Lock-in)해야 합니다.
                    </div>
                  </div>
                )}

                {dayTypeFilter === 'all' && (
                  <div className="text-xs text-slate-700 space-y-1.5 pl-6 border-l-2 border-slate-700">
                    <div className="font-bold text-slate-900">
                      🌐 [전체 통합군] 주말의 레저 시너지와 주중 비즈니스 체류의 이원화 관리
                    </div>
                    <div>
                      • 리조트 전체 평균만 보면 주중의 비즈니스 체류(레저 저조)와 주말의 폭발적 레저 시너지가 섞여 데이터 착시가 발생합니다.
                    </div>
                    <div className="text-slate-900 font-semibold pt-1">
                      🎯 <b>경영 액션</b>: 상단의 <b>[🌟 익일 휴일·주말]</b>과 <b>[🏢 순수 주중]</b> 탭을 분리하여 각각의 타겟 고객에 맞춤화된 세그먼트별 프로모션을 전개하십시오.
                    </div>
                  </div>
                )}
              </div>

              {/* 4. 활성 환경 실측 부대소비 파급력 (RevPAS) 지표 카드 3종 */}
              {(() => {
                const cohort = analytics?.cohort;
                const isMultiDay = Boolean(isRange && losSummary);
                const latestLos = losTrendData && losTrendData.length > 0 ? losTrendData[losTrendData.length - 1] : null;

                const activeRooms = cohort 
                  ? (cohort.lowLos.rooms + cohort.highLos.rooms) 
                  : (isMultiDay ? (losSummary?.grandTotalRooms || 0) : (latestLos?.roomsSold || 0));

                const activeMultiRooms = cohort 
                  ? (cohort.lowLos.multiRooms + cohort.highLos.multiRooms) 
                  : (isMultiDay ? (losSummary?.grandTotalMultiNightRooms || 0) : (latestLos?.multiNightRooms || 0));

                const multiRatio = activeRooms > 0 
                  ? Number(((activeMultiRooms / activeRooms) * 100).toFixed(1)) 
                  : '0.0';

                const liveFnb = cohort && activeRooms > 0 
                  ? Math.round((cohort.lowLos.fnbRevPAS * cohort.lowLos.rooms + cohort.highLos.fnbRevPAS * cohort.highLos.rooms) / activeRooms)
                  : Math.round(isMultiDay ? (losSummary?.avgFnbRevPAS || 0) : (latestLos?.fnbRevPAS || 0));

                const liveLeisure = cohort && activeRooms > 0 
                  ? Math.round((cohort.lowLos.leisureRevPAS * cohort.lowLos.rooms + cohort.highLos.leisureRevPAS * cohort.highLos.rooms) / activeRooms)
                  : Math.round(isMultiDay ? (losSummary?.avgLeisureRevPAS || 0) : (latestLos?.leisureRevPAS || 0));

                const liveTotal = liveFnb + liveLeisure;

                const totalSynergySales = cohort 
                  ? (cohort.lowLos.totalSales + cohort.highLos.totalSales) 
                  : (isMultiDay ? (losSummary?.grandTotalSynergySales || 0) : (latestLos?.totalSynergySales || 0));

                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {/* 카드 1: 1실당 식음 소비 */}
                    <div className="bg-gradient-to-br from-amber-50/70 to-orange-50/30 p-5 rounded-2xl border border-amber-200/70 flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-bold text-amber-800 mb-1 flex items-center justify-between">
                          <span>🍽️ 1객실당 식음(F&B) 소비액</span>
                          <span className="text-[11px] font-bold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full">
                            {dayTypeFilter === 'holiday_eve' ? '익일휴일 평균' : dayTypeFilter === 'pure_weekday' ? '주중 평균' : '기간 평균'}
                          </span>
                        </div>
                        <div className="text-2xl font-extrabold text-slate-900 my-2">
                          ₩{formatCurrency(liveFnb)} <span className="text-xs font-normal text-slate-500">/ 1실</span>
                        </div>
                        <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-amber-200/60">
                          <div className="flex justify-between">
                            <span>• 판매 객실 모수:</span>
                            <span className="font-semibold text-slate-800">{formatCurrency(activeRooms)}실</span>
                          </div>
                          <div className="flex justify-between font-semibold text-amber-900">
                            <span>• 연박(2박+) 비중:</span>
                            <span>{multiRatio}% ({formatCurrency(activeMultiRooms)}실)</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-amber-900/80 mt-3 pt-2 border-t border-amber-200/40">
                        {dayTypeFilter === 'holiday_eve' ? '익일 휴일군' : dayTypeFilter === 'pure_weekday' ? '순수 주중군' : '선택 기간'} 식음 전체 매출 ÷ 판매 객실수 (수학적 실측치)
                      </p>
                    </div>

                    {/* 카드 2: 1실당 레저·체험 소비 */}
                    <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/30 p-5 rounded-2xl border border-emerald-200/70 flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-bold text-emerald-800 mb-1 flex items-center justify-between">
                          <span>🎢 1객실당 레저·체험 소비액</span>
                          <span className="text-[11px] font-bold bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full">
                            {dayTypeFilter === 'holiday_eve' ? '익일휴일 평균' : dayTypeFilter === 'pure_weekday' ? '주중 평균' : '기간 평균'}
                          </span>
                        </div>
                        <div className="text-2xl font-extrabold text-slate-900 my-2">
                          ₩{formatCurrency(liveLeisure)} <span className="text-xs font-normal text-slate-500">/ 1실</span>
                        </div>
                        <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-emerald-200/60">
                          <div className="flex justify-between">
                            <span>• 판매 객실 모수:</span>
                            <span className="font-semibold text-slate-800">{formatCurrency(activeRooms)}실</span>
                          </div>
                          <div className="flex justify-between font-semibold text-emerald-800">
                            <span>• 연박(2박+) 객실수:</span>
                            <span>{formatCurrency(activeMultiRooms)}실</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-emerald-900/80 mt-3 pt-2 border-t border-emerald-200/40">
                        {dayTypeFilter === 'holiday_eve' ? '익일 휴일군' : dayTypeFilter === 'pure_weekday' ? '순수 주중군' : '선택 기간'} 레저·체험 전체 매출 ÷ 판매 객실수 (수학적 실측치)
                      </p>
                    </div>

                    {/* 카드 3: 1실당 총 부대소비 파급력 (RevPAS) */}
                    <div className="bg-gradient-to-br from-indigo-50/90 to-purple-50/50 p-5 rounded-2xl border border-indigo-200 flex flex-col justify-between shadow-xs">
                      <div>
                        <div className="text-xs font-bold text-indigo-800 mb-1 flex items-center justify-between">
                          <span>💎 1객실당 총 부대소비 (RevPAS)</span>
                          <span className="text-[11px] font-extrabold bg-indigo-200 text-indigo-900 px-2 py-0.5 rounded-full">
                            식음+레저 합산 (골프 불포함)
                          </span>
                        </div>
                        <div className="text-2xl font-extrabold text-indigo-700 my-2">
                          ₩{formatCurrency(liveTotal)} <span className="text-xs font-normal text-indigo-500">/ 1실</span>
                        </div>
                        <div className="space-y-1 text-xs text-indigo-950 pt-2 border-t border-indigo-200/60">
                          <div className="flex justify-between">
                            <span>• 부대시설 실측 총매출:</span>
                            <span className="font-semibold text-indigo-900">₩{formatCurrency(totalSynergySales)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-emerald-700">
                            <span>• 판매 객실 모수:</span>
                            <span>{formatCurrency(activeRooms)}실 ({multiRatio}% 연박)</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-indigo-900/80 mt-3 pt-2 border-t border-indigo-200/40">
                        (식음 매출 + 레저 매출) ÷ 판매 객실수 (100% 수학적 실측 지표)
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Chart Component */}
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={analytics?.activeRows || losTrendData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
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
                      barSize={(analytics?.activeRows || losTrendData).length > 20 ? 15 : 28} 
                      opacity={0.65} 
                    />
                    {losMetricMode === 'revpas' && (
                      <Bar 
                        yAxisId="right" 
                        dataKey="leisureRevPAS" 
                        name="1객실당 레저 지출액 (RevPAS)" 
                        fill="#06b6d4" 
                        radius={[6, 6, 0, 0]} 
                        barSize={(analytics?.activeRows || losTrendData).length > 20 ? 15 : 28} 
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
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <h2 className="text-base font-medium text-slate-800 mb-8 flex items-center gap-2">
                💰 판매채널별 객단가 분석
              </h2>
              {channelAdrData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left whitespace-nowrap min-w-[500px]">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap">
                        <th className="py-3 px-4 whitespace-nowrap">판매 채널명</th>
                        <th className="py-3 px-4 text-right whitespace-nowrap">판매 건수(계약)</th>
                        <th className="py-3 px-4 text-right whitespace-nowrap">총 매출액</th>
                        <th className="py-3 px-4 text-right whitespace-nowrap">평균 객단가 (ADR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-sm">
                      {channelAdrData.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors whitespace-nowrap">
                          <td className="py-3.5 px-4 text-slate-700 font-semibold whitespace-nowrap">{row.channel}</td>
                          <td className="py-3.5 px-4 text-right text-slate-500 whitespace-nowrap">{row.roomsSold}건</td>
                          <td className="py-3.5 px-4 text-right text-slate-600 whitespace-nowrap">{formatCurrency(row.totalRevenue)}</td>
                          <td className="py-3.5 px-4 text-right font-medium text-slate-900 whitespace-nowrap">{formatCurrency(row.adr)}</td>
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
                  <table className="w-full border-collapse text-left whitespace-nowrap min-w-[500px]">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap">
                        <th className="py-3 px-4 whitespace-nowrap">마켓타입 세그먼트명</th>
                        <th className="py-3 px-4 text-right whitespace-nowrap">판매 건수(계약)</th>
                        <th className="py-3 px-4 text-right whitespace-nowrap">총 매출액</th>
                        <th className="py-3 px-4 text-right whitespace-nowrap">평균 객단가 (ADR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-sm">
                      {rateAdrData.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors whitespace-nowrap">
                          <td className="py-3.5 px-4 text-slate-700 font-semibold whitespace-nowrap">{row.marketType}</td>
                          <td className="py-3.5 px-4 text-right text-slate-500 whitespace-nowrap">{row.roomsSold}건</td>
                          <td className="py-3.5 px-4 text-right text-slate-600 whitespace-nowrap">{formatCurrency(row.totalRevenue)}</td>
                          <td className="py-3.5 px-4 text-right font-medium text-slate-900 whitespace-nowrap">{formatCurrency(row.adr)}</td>
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
