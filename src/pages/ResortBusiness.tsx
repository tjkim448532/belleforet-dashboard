import { useState, useEffect, useMemo } from 'react';
import { 
  CalendarDays, Hotel, Coins, KeyRound, Layers, 
  PieChart as PieChartIcon, Activity, Sparkles, 
  Building2, Globe, Lightbulb, ArrowUpDown, BarChart3
} from 'lucide-react';
import GlobalDatePicker from '../components/GlobalDatePicker';
import { secureFetcher } from '../lib/secureFetcher';
import { useDate } from '../contexts/DateContext';
import { getLatestClosedDateStr, formatDate } from '../lib/dateUtils';
import { getPeriodHolidayComparison } from '../lib/holidayUtils';
import ReactECharts from 'echarts-for-react';
import { Tooltip, Legend, ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { transformResortData } from '../lib/dataTransformers';
import MetricExplainerTooltip from '../components/common/MetricExplainerTooltip';

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

// 🌟 전년 동기간 일자 산출 유틸리티 (윤년 2/29 안전 보정)
function getLyDateStr(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';
  const y = parseInt(parts[0], 10) - 1;
  const m = parts[1];
  let d = parts[2];
  if (m === '02' && d === '29') {
    d = '28';
  }
  return `${y}-${m}-${d}`;
}

export default function ResortBusiness() {
  const [data, setData] = useState<any>(null);
  const [lyData, setLyData] = useState<any>(null);
  const [physicalRoomMaster, setPhysicalRoomMaster] = useState<any>(null);
  const [lyPhysicalRoomMaster, setLyPhysicalRoomMaster] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { startDate, endDate, isRange: isGlobalRange } = useDate();
  const [showLyCompareTable, setShowLyCompareTable] = useState<boolean>(true);
  const [channelCompareView, setChannelCompareView] = useState<'compare' | 'single'>('compare');

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

    return {
      holidayEveCount: holidayEves.length,
      pureWeekdayCount: pureWeekdays.length,
      allCount: losTrendData.length,
      activeDays: activeRows.length,
      activeRows
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
          const parts = startDate.split('-').map(Number);
          const d = new Date(parts[0], parts[1] - 1, parts[2]);
          d.setDate(d.getDate() - 13);
          const past14Str = formatDate(d);
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
  }, [startDate, endDate, isGlobalRange]);

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
        const isRangeQuery = Boolean(endDate && startDate !== endDate);
        let curStart = startDate || getLatestClosedDateStr();
        let curEnd = isRangeQuery && endDate ? endDate : curStart;
        if (isRangeQuery && curStart > curEnd) {
          const tmp = curStart;
          curStart = curEnd;
          curEnd = tmp;
        }
        const queryParams = isRangeQuery
          ? `startDate=${curStart}&endDate=${curEnd}&_t=${Date.now()}`
          : `date=${curStart}&_t=${Date.now()}`;
        
        const lyStartStr = getLyDateStr(curStart);
        const lyEndStr = getLyDateStr(curEnd);
        const lyQueryParams = isRangeQuery
          ? `startDate=${lyStartStr}&endDate=${lyEndStr}&_t=${Date.now()}`
          : `date=${lyStartStr}&_t=${Date.now()}`;
          
        const [overviewRes, channelRes, rateRes, orgRes, lyOverviewRes, lyChannelRes, lyRateRes, lyOrgRes] = await Promise.all([
          secureFetcher(`${API_BASE}/api/v6/dashboard/revenue-summary?${queryParams}`),
          secureFetcher(`${API_BASE}/api/v6/report/room-sales-by-channel?${queryParams}`).catch(() => ({ data: [] })),
          secureFetcher(`${API_BASE}/api/v6/report/room-rate-sales?${queryParams}`).catch(() => ({ data: [] })),
          secureFetcher(`${API_BASE}/api/v6/dashboard/revenue-by-org?${queryParams}`).catch(() => null),
          secureFetcher(`${API_BASE}/api/v6/dashboard/revenue-summary?${lyQueryParams}`).catch(() => null),
          secureFetcher(`${API_BASE}/api/v6/report/room-sales-by-channel?${lyQueryParams}`).catch(() => ({ data: [] })),
          secureFetcher(`${API_BASE}/api/v6/report/room-rate-sales?${lyQueryParams}`).catch(() => ({ data: [] })),
          secureFetcher(`${API_BASE}/api/v6/dashboard/revenue-by-org?${lyQueryParams}`).catch(() => null)
        ]);

        const rawOverview = (overviewRes?.summary || overviewRes?.gridData) ? overviewRes : (overviewRes.data || overviewRes);
        const rawChannels = channelRes.data || channelRes;
        const rawRates = rateRes.data || rateRes;

        const curPhysicalMaster = orgRes?.data?.physicalRoomMaster || orgRes?.physicalRoomMaster || null;
        setPhysicalRoomMaster(curPhysicalMaster);

        const transformed = transformResortData({
          ...rawOverview,
          matrix: Array.isArray(rawOverview.gridData) ? rawOverview.gridData : [],
          salesByChannel: Array.isArray(rawChannels) ? rawChannels : (rawChannels.channels || rawChannels.data || []),
          salesBySegment: Array.isArray(rawRates) ? rawRates : (rawRates.rates || rawRates.data || [])
        }, caps);

        setData(transformed);

        if (lyOverviewRes || lyOrgRes) {
          const rawLyOverview = (lyOverviewRes?.summary || lyOverviewRes?.gridData) ? lyOverviewRes : (lyOverviewRes?.data || lyOverviewRes || {});
          const rawLyChannels = lyChannelRes?.data || lyChannelRes;
          const rawLyRates = lyRateRes?.data || lyRateRes;

          const lyPhysicalMaster = lyOrgRes?.data?.physicalRoomMaster || lyOrgRes?.physicalRoomMaster || null;
          setLyPhysicalRoomMaster(lyPhysicalMaster);

          const lyTransformed = transformResortData({
            ...rawLyOverview,
            matrix: Array.isArray(rawLyOverview?.gridData) ? rawLyOverview.gridData : [],
            salesByChannel: Array.isArray(rawLyChannels) ? rawLyChannels : (rawLyChannels?.channels || rawLyChannels?.data || []),
            salesBySegment: Array.isArray(rawLyRates) ? rawLyRates : (rawLyRates?.rates || rawLyRates?.data || [])
          }, caps);

          setLyData(lyTransformed);
        } else {
          setLyData(null);
          setLyPhysicalRoomMaster(null);
        }
      } catch (err) {
        console.error('Error fetching resort data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [startDate, endDate, isGlobalRange]);

  const formatCurrency = (val: any) => {
    if (!val) return '0';
    const num = typeof val === 'string' ? Number(val.replace(/,/g, '')) : Number(val);
    return isNaN(num) ? '0' : new Intl.NumberFormat('ko-KR').format(Math.round(num));
  };

  // 175실 기준 실운영 점유실(물리) 및 도넛 차트 레이어링 연산
  const isRange = Boolean(startDate && endDate && startDate !== endDate);
  const curStart = startDate || getLatestClosedDateStr();
  const curEnd = isRange && endDate ? endDate : curStart;
  const lyStart = getLyDateStr(curStart);
  const lyEnd = getLyDateStr(curEnd);

  const safeRangeDays = isRange && startDate && endDate 
    ? Math.max(1, Math.ceil(Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1) 
    : 1;
  const rangeDays = safeRangeDays;

  // 공휴일 수 대조 정보
  const holidayComparison = useMemo(() => {
    if (!startDate) return null;
    return getPeriodHolidayComparison(startDate, endDate || undefined);
  }, [startDate, endDate]);

  const lodgingStats = data?.lodgingStats || { revenue: 0, roomsSold: 0, adr: 0, totalCapacity: 0 };
  const lyStats = lyData?.lodgingStats || null;

  // 🏛️ 건축학적 물리 가동 객실 인벤토리 모수 (SSOT - /api/v6/dashboard/revenue-by-org)
  const curPhysicalMetrics = physicalRoomMaster?.metrics;
  const lyPhysicalMetrics = lyPhysicalRoomMaster?.metrics;

  // 🌟 전년 동일기간 비교 핵심 지표 (Zero-Fake, 공식 마트 실측 바인딩)
  // 1. 객실 총 매출
  const revCurrent = lodgingStats.revenue;
  const revLy = (lodgingStats.lyRevenue !== undefined && lodgingStats.lyRevenue > 0)
    ? lodgingStats.lyRevenue
    : (lyStats?.revenue || 0);
  const revDiff = revLy > 0 ? revCurrent - revLy : 0;
  const revGrowth = lodgingStats.revenueGrowth !== undefined
    ? lodgingStats.revenueGrowth
    : (revLy > 0 ? Number(((revDiff / revLy) * 100).toFixed(1)) : null);

  // 2. 판매 건수 (계약) - physicalRoomMaster.metrics.totalRoomsSold 우선 바인딩
  const roomsCurrent = curPhysicalMetrics?.totalRoomsSold ?? lodgingStats.roomsSold;
  const roomsLy = curPhysicalMetrics?.totalRoomsSold !== undefined && lyPhysicalMetrics?.totalRoomsSold !== undefined
    ? lyPhysicalMetrics.totalRoomsSold
    : ((lodgingStats.lyRoomsSold !== undefined && lodgingStats.lyRoomsSold > 0)
      ? lodgingStats.lyRoomsSold
      : (lyStats?.roomsSold || 0));
  const roomsDiff = roomsLy > 0 ? roomsCurrent - roomsLy : 0;
  const roomsGrowth = curPhysicalMetrics?.totalRoomsSold !== undefined && lyPhysicalMetrics?.totalRoomsSold !== undefined && roomsLy > 0
    ? Number((((roomsCurrent - roomsLy) / roomsLy) * 100).toFixed(1))
    : (lodgingStats.roomsGrowth !== undefined
      ? lodgingStats.roomsGrowth
      : (roomsLy > 0 ? Number(((roomsDiff / roomsLy) * 100).toFixed(1)) : null));

  // 3. 실운영 점유실 (물리) & 점유율 - physicalRoomMaster.metrics 우선 바인딩 (167실, 95.4%)
  const summary = data?.summary || {};
  const totalBaseRooms = curPhysicalMetrics?.denominatorUnits ?? Number(summary.totalPhysicalKeys || summary.totalRoomInventory || lodgingStats.totalCapacity || 0);

  const connectingSets = curPhysicalMetrics?.totalRoomsSold !== undefined && curPhysicalMetrics?.physicalOccupiedUnits !== undefined
    ? Math.max(0, curPhysicalMetrics.physicalOccupiedUnits - curPhysicalMetrics.totalRoomsSold)
    : Math.max(0, Math.round(Number(summary.connectingPhysicalRooms || 0) / 2));
  const connectingPhysicalRooms = curPhysicalMetrics ? connectingSets * 2 : Number(summary.connectingPhysicalRooms || 0);
  const standardPhysicalRooms = curPhysicalMetrics
    ? Math.max(0, (curPhysicalMetrics.physicalOccupiedUnits ?? 0) - connectingPhysicalRooms)
    : Number(summary.standardPhysicalRooms || lodgingStats.roomsSold);
  const totalPhysicalOccupied = curPhysicalMetrics?.physicalOccupiedUnits ?? Number(
    summary.totalPhysicalKeysSold ||
    (standardPhysicalRooms + connectingPhysicalRooms)
  );
  const remainingRooms = Math.max(0, totalBaseRooms - totalPhysicalOccupied);

  const occCurrent = curPhysicalMetrics?.physicalOccupancyRate !== undefined && curPhysicalMetrics?.physicalOccupancyRate !== null
    ? Number(curPhysicalMetrics.physicalOccupancyRate.toFixed(1))
    : lodgingStats.physicalOccRate;

  const lySummary = lyData?.summary || {};
  const lyConnectingSets = lyPhysicalMetrics?.totalRoomsSold !== undefined && lyPhysicalMetrics?.physicalOccupiedUnits !== undefined
    ? Math.max(0, lyPhysicalMetrics.physicalOccupiedUnits - lyPhysicalMetrics.totalRoomsSold)
    : Math.max(0, Math.round(Number(lySummary.connectingPhysicalRooms || 0) / 2));
  const lyConnectingPhysicalRooms = lyPhysicalMetrics ? lyConnectingSets * 2 : Number(lySummary.connectingPhysicalRooms || 0);
  const lyStandardPhysicalRooms = lyPhysicalMetrics
    ? Math.max(0, (lyPhysicalMetrics.physicalOccupiedUnits ?? 0) - lyConnectingPhysicalRooms)
    : Number(lySummary.standardPhysicalRooms || lyStats?.roomsSold || 0);
  const lyTotalPhysicalOccupied = lyPhysicalMetrics?.physicalOccupiedUnits ?? Number(
    lySummary.totalPhysicalKeysSold ||
    (lyStandardPhysicalRooms + lyConnectingPhysicalRooms)
  );

  const occLy = lyPhysicalMetrics?.physicalOccupancyRate !== undefined && lyPhysicalMetrics?.physicalOccupancyRate !== null
    ? Number(lyPhysicalMetrics.physicalOccupancyRate.toFixed(1))
    : (lyStats?.physicalOccRate !== undefined ? lyStats.physicalOccRate : null);
  const occDiff = occCurrent !== undefined && occCurrent !== null && occLy !== null
    ? Number((occCurrent - occLy).toFixed(1))
    : null;

  // Breakdown subtext for Card 3
  const breakdown = curPhysicalMetrics?.breakdownOccupied;
  const breakdownText = breakdown && (breakdown.occupied16 !== undefined || breakdown.occupied35 !== undefined)
    ? `16평 ${breakdown.occupied16 ?? 0}실 · 35평 ${breakdown.occupied35 ?? 0}실 · 단독51평 ${breakdown.occupiedSolo51 ?? 0}실`
    : null;

  // 4. 객실 평균 단가 (ADR)
  const adrCurrent = lodgingStats.adr;
  const adrLy = lyStats?.adr !== undefined && lyStats.adr > 0 ? lyStats.adr : null;
  const adrDiff = adrCurrent !== undefined && adrLy !== null ? adrCurrent - adrLy : null;
  const adrGrowth = adrCurrent !== undefined && adrLy !== null && adrLy > 0
    ? Number((((adrCurrent - adrLy) / adrLy) * 100).toFixed(1))
    : null;
  
  const roomOccupancyData = (() => {
    if (!data?.roomOccupancyMap) return [];
    
    const groups = data.roomOccupancyMap;
    const lyGroups = lyData?.roomOccupancyMap || {};
    const result = [];
    const keys = Object.keys(groups);
    for (const key of keys) {
      const g = groups[key];
      if (!g || (g.sold === 0 && g.cap === 0 && g.rev === 0)) continue;
      
      const effectiveCap = g.cap;
      const rate = g.occupancyRate ?? null;
      const cappedRate = rate !== null ? Math.min(rate, 100) : 0;
      const displayRate = rate !== null ? `${rate}%` : '-';

      const lyG = lyGroups[key] || null;
      const lySold = lyG?.sold ?? null;
      const lyCap = lyG?.cap ?? null;
      const lyRev = lyG?.rev ?? null;
      const lyAdr = (lyG as any)?.adr !== null && (lyG as any)?.adr !== undefined ? Number((lyG as any).adr) : null;
      const lyRate = lyG?.occupancyRate ?? null;
      const rateDiff = rate !== null && lyRate !== null ? Number((rate - lyRate).toFixed(1)) : null;
      const soldDiff = lySold !== null ? g.sold - lySold : null;
      const adrDiff = ((g as any).adr !== null && (g as any).adr !== undefined && lyAdr !== null) ? Number((g as any).adr) - lyAdr : null;

      result.push({
        roomSize: key,
        sold: g.sold,
        capacity: effectiveCap,
        rate: cappedRate,
        rawRate: rate,
        displayRate,
        revenue: g.rev,
        adr: (g as any).adr !== null && (g as any).adr !== undefined ? Number((g as any).adr) : null,
        isConnectedType: key === '51평',
        dynamicCapacity: (g as any).dynamicCapacity,
        dynamicOccupancyRate: (g as any).dynamicOccupancyRate,
        // 전년 동기
        lySold,
        lyCap,
        lyRev,
        lyAdr,
        lyRate,
        rateDiff,
        soldDiff,
        adrDiff
      });
    }

    return result;
  })();

  const channelAdrData = data?.channelAdrData || [];
  const rateAdrData = data?.rateAdrData || [];

  // 판매채널별 전년 동기 대조 데이터
  const channelComparisonData = useMemo(() => {
    const curList = data?.channelAdrData || [];
    const lyList = lyData?.channelAdrData || [];
    const lyMap = new Map<string, any>();
    lyList.forEach((item: any) => lyMap.set(item.channel, item));

    return curList.map((cur: any) => {
      const ly = lyMap.get(cur.channel);
      const lySold = ly?.roomsSold ?? 0;
      const lyRev = ly?.totalRevenue ?? 0;
      const lyAdr = ly?.adr ?? 0;
      const soldDiff = cur.roomsSold - lySold;
      const revDiff = cur.totalRevenue - lyRev;
      const revGrowth = lyRev > 0 ? Number(((revDiff / lyRev) * 100).toFixed(1)) : null;
      const adrDiff = (cur.adr > 0 && lyAdr > 0) ? cur.adr - lyAdr : null;

      return {
        ...cur,
        lySold,
        lyRev,
        lyAdr,
        soldDiff,
        revDiff,
        revGrowth,
        adrDiff
      };
    });
  }, [data?.channelAdrData, lyData?.channelAdrData]);

  // 요금타입별 전년 동기 대조 데이터
  const rateComparisonData = useMemo(() => {
    const curList = data?.rateAdrData || [];
    const lyList = lyData?.rateAdrData || [];
    const lyMap = new Map<string, any>();
    lyList.forEach((item: any) => lyMap.set(item.marketType, item));

    return curList.map((cur: any) => {
      const ly = lyMap.get(cur.marketType);
      const lySold = ly?.roomsSold ?? 0;
      const lyRev = ly?.totalRevenue ?? 0;
      const lyAdr = ly?.adr ?? 0;
      const soldDiff = cur.roomsSold - lySold;
      const revDiff = cur.totalRevenue - lyRev;
      const revGrowth = lyRev > 0 ? Number(((revDiff / lyRev) * 100).toFixed(1)) : null;
      const adrDiff = (cur.adr > 0 && lyAdr > 0) ? cur.adr - lyAdr : null;

      return {
        ...cur,
        lySold,
        lyRev,
        lyAdr,
        soldDiff,
        revDiff,
        revGrowth,
        adrDiff
      };
    });
  }, [data?.rateAdrData, lyData?.rateAdrData]);

  // 도넛 차트: 물리 객실 기준 레이어링
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
          name: '객실 실운영 점유 현황',
          type: 'pie',
          radius: ['45%', '72%'],
          avoidLabelOverlap: true,
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
            { value: standardPhysicalRooms, name: '일반/단독 점유 (물리)' },
            { value: connectingPhysicalRooms, name: connectingSets > 0 ? `커넥팅 점유 (물리 ${connectingSets}세트×2)` : '커넥팅 점유 (물리)' },
            { value: remainingRooms, name: '잔여 미판매' }
          ]
        }
      ]
    };
  })();

  const ratePieOptions = (() => {
    const pieData = (data?.rateAdrData || [])
      .map((r: any) => ({ value: r.roomsSold, name: r.marketType }))
      .sort((a: any, b: any) => b.value - a.value);

    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c}건 ({d}%)'
      },
      legend: {
        top: 'bottom',
        type: 'scroll',
        textStyle: { color: '#475569', fontSize: 12, fontWeight: 600 }
      },
      color: ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316', '#64748b'],
      series: [
        {
          name: '요금타입별 점유율',
          type: 'pie',
          radius: ['45%', '72%'],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 3 },
          label: {
            show: true,
            formatter: '{b}\n{c}건 ({d}%)',
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
          <div className="flex items-center gap-2 flex-wrap">
            <Hotel className="w-6 h-6 text-[#00ae95] shrink-0" />
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight break-keep whitespace-nowrap">리조트사업본부 경영 현황</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1 break-keep">객실 실적, 채널별 ADR 및 175실 기준 실운영 점유율 분석 대시보드</p>
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
          {/* 기간 선택 시: 전년 동기간 대조 배너 및 공휴일수 분석 */}
          {isRange && (
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50/60 to-slate-50 border border-emerald-200/80 rounded-2xl p-4 mb-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="bg-emerald-600 text-white font-bold px-2.5 py-1 rounded-lg text-xs shadow-2xs flex items-center gap-1">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  전년 동기간(YoY) 비교 모드
                </span>
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="font-medium text-slate-500">당해 선택기간:</span>
                  <span className="font-bold text-slate-900 font-financial bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    {startDate} ~ {endDate} ({rangeDays}일간)
                  </span>
                  <span className="text-slate-400 font-bold">vs</span>
                  <span className="font-medium text-slate-500">전년 동일기간:</span>
                  <span className="font-bold text-emerald-800 font-financial bg-emerald-100/60 px-2 py-0.5 rounded-md border border-emerald-200">
                    {lyStart} ~ {lyEnd} ({rangeDays}일간)
                  </span>
                </div>
              </div>

              {holidayComparison && (
                <div className="flex items-center gap-2 bg-white/80 border border-amber-200 px-3 py-1 rounded-xl text-amber-950 font-financial">
                  <span className="font-bold text-amber-800">🎈 공휴일수:</span>
                  <span>당해 <strong className="text-slate-900">{holidayComparison.currentPeriod.totalHolidays}일</strong> vs 전년 <strong className="text-slate-900">{holidayComparison.lastYearPeriod.totalHolidays}일</strong></span>
                  {holidayComparison.diffHolidays !== 0 ? (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${holidayComparison.diffHolidays > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                      ({holidayComparison.diffHolidays > 0 ? `+${holidayComparison.diffHolidays}일` : `${holidayComparison.diffHolidays}일`})
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium">(동일)</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Main KPI Cards Grid: 용어 표기 명확 분리 & YoY 전면 대조 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* 1. Total Revenue */}
            <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative group border border-slate-100 flex flex-col justify-between h-full">
              <div>
                <h2 className="text-xs lg:text-sm font-semibold text-slate-500 mb-3 flex items-center gap-1.5 whitespace-nowrap">
                  <Coins className="w-5 h-5 text-[#00ae95]" /> 
                  <span>객실 총 매출</span>
                  <MetricExplainerTooltip presetKey="netRevenue" align="left" />
                </h2>
                <div className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight whitespace-nowrap font-financial">
                  {formatCurrency(revCurrent)} <span className="text-base text-slate-400 font-normal">원</span>
                </div>
                {(lodgingStats.weekdayRevenue !== undefined || lodgingStats.weekendRevenue !== undefined) && (
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] bg-slate-50 px-2 py-1 rounded-md border border-slate-100 font-financial">
                    <span className="text-slate-500">주중 <strong className="text-slate-700">{formatCurrency(lodgingStats.weekdayRevenue)}</strong>원</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-500">휴일전일 <strong className="text-[#00ae95]">{formatCurrency(lodgingStats.weekendRevenue)}</strong>원</span>
                  </div>
                )}
                {revLy > 0 && (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md font-financial ${
                      (revGrowth || 0) >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {(revGrowth || 0) >= 0 ? '▲' : '▼'} {Math.abs(revGrowth || 0).toFixed(1)}%
                      {revDiff !== 0 && (
                        <span className="ml-1 opacity-80">({revDiff > 0 ? '+' : ''}{formatCurrency(revDiff)}원)</span>
                      )}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium font-financial">전년 {formatCurrency(revLy)}원</span>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-auto pt-3 border-t border-slate-100/60 break-keep">선택 기간 순수 객실 판매 총액 (부가세 별도)</p>
            </div>

            {/* 2. 판매 건수 (계약) */}
            <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative group border border-slate-100 flex flex-col justify-between h-full">
              <div>
                <h2 className="text-xs lg:text-sm font-semibold text-slate-500 mb-3 flex items-center gap-1.5 whitespace-nowrap">
                  <CalendarDays className="w-5 h-5 text-[#00ae95]" /> 
                  <span>판매 건수 (계약)</span>
                  <MetricExplainerTooltip presetKey="occupancy" align="center" />
                </h2>
                <div className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight whitespace-nowrap font-financial">
                  {formatCurrency(roomsCurrent)}건
                </div>
                {(lodgingStats.weekdayRoomsSold !== undefined || lodgingStats.weekendRoomsSold !== undefined) && (
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] bg-slate-50 px-2 py-1 rounded-md border border-slate-100 font-financial">
                    <span className="text-slate-500">주중 <strong className="text-slate-700">{formatCurrency(lodgingStats.weekdayRoomsSold)}</strong>건</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-500">휴일전일 <strong className="text-[#00ae95]">{formatCurrency(lodgingStats.weekendRoomsSold)}</strong>건</span>
                  </div>
                )}
                {roomsLy > 0 && (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md font-financial ${
                      (roomsGrowth || 0) >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {(roomsGrowth || 0) >= 0 ? '▲' : '▼'} {Math.abs(roomsGrowth || 0).toFixed(1)}%
                      {roomsDiff !== 0 && (
                        <span className="ml-1 opacity-80">({roomsDiff > 0 ? '+' : ''}{formatCurrency(roomsDiff)}건)</span>
                      )}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium font-financial">전년 {formatCurrency(roomsLy)}건</span>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-auto pt-3 border-t border-slate-100/60 break-keep">정산 계약 기준 총 판매 계약 건수 (PMS 실적)</p>
            </div>

            {/* 3. 실운영 점유실 (물리) */}
            <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative group border border-slate-100 flex flex-col justify-between h-full">
              <div>
                <h2 className="text-xs lg:text-sm font-semibold text-slate-500 mb-3 flex items-center gap-1.5 whitespace-nowrap">
                  <KeyRound className="w-5 h-5 text-[#00ae95]" /> 
                  <span>실운영 점유실 (물리)</span>
                  <MetricExplainerTooltip presetKey="connectingRoom" align="center" />
                </h2>
                <div className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight flex items-baseline gap-2 whitespace-nowrap font-financial">
                  <span>{totalPhysicalOccupied.toLocaleString()}실</span>
                  <span className="text-xs text-[#00ae95] font-semibold">({occCurrent !== undefined && occCurrent !== null ? occCurrent + '%' : '-'})</span>
                </div>
                {(lodgingStats.weekdayOcc !== undefined || lodgingStats.weekendOcc !== undefined) && (
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] bg-slate-50 px-2 py-1 rounded-md border border-slate-100 font-financial">
                    <span className="text-slate-500">주중 점유 <strong className="text-slate-700">{lodgingStats.weekdayOcc}%</strong></span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-500">휴일전일 점유 <strong className="text-[#00ae95]">{lodgingStats.weekendOcc}%</strong></span>
                  </div>
                )}
                {occLy !== null && (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md font-financial ${
                      (occDiff || 0) >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {(occDiff || 0) >= 0 ? '▲' : '▼'} {Math.abs(occDiff || 0).toFixed(1)}%p
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium font-financial">
                      전년 {(lyTotalPhysicalOccupied > 0 ? lyTotalPhysicalOccupied : lyStats?.roomsSold)?.toLocaleString()}실 ({occLy}%)
                    </span>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-auto pt-3 border-t border-slate-100/60 break-keep">일반/단독 {standardPhysicalRooms.toLocaleString()}실 + 커넥팅 {connectingPhysicalRooms.toLocaleString()}실 {breakdownText ? `(${breakdownText}, ` : '('}{isRange ? `총 ${totalBaseRooms.toLocaleString()}실 (${rangeDays}일) 기준` : '총 175실 기준'})</p>
            </div>

            {/* 4. Overall ADR */}
            <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative group border border-slate-100 flex flex-col justify-between h-full">
              <div>
                <h2 className="text-xs lg:text-sm font-semibold text-slate-500 mb-3 flex items-center gap-1.5 whitespace-nowrap">
                  <Coins className="w-5 h-5 text-[#00ae95]" /> 
                  <span>객실 평균 단가 (ADR)</span>
                  <MetricExplainerTooltip presetKey="adr" align="right" />
                </h2>
                <div className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight whitespace-nowrap font-financial">
                  {formatCurrency(adrCurrent)} <span className="text-base text-slate-400 font-normal">원</span>
                </div>
                {(lodgingStats.weekdayAdr !== undefined || lodgingStats.weekendAdr !== undefined) && (
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] bg-slate-50 px-2 py-1 rounded-md border border-slate-100 font-financial">
                    <span className="text-slate-500">주중 <strong className="text-slate-700">{formatCurrency(lodgingStats.weekdayAdr)}</strong>원</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-500">휴일전일 <strong className="text-[#00ae95]">{formatCurrency(lodgingStats.weekendAdr)}</strong>원</span>
                  </div>
                )}
                {adrLy !== null && adrLy > 0 && (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md font-financial ${
                      (adrGrowth || 0) >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {(adrGrowth || 0) >= 0 ? '▲' : '▼'} {Math.abs(adrGrowth || 0).toFixed(1)}%
                      {adrDiff !== null && adrDiff !== 0 && (
                        <span className="ml-1 opacity-80">({adrDiff > 0 ? '+' : ''}{formatCurrency(adrDiff)}원)</span>
                      )}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium font-financial">전년 {formatCurrency(adrLy)}원</span>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-auto pt-3 border-t border-slate-100/60 break-keep">총 객실 매출 ÷ 판매 건수(계약)</p>
            </div>
          </div>

          {/* Room Occupancy Status Card */}
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
              <h2 className="text-lg lg:text-xl font-bold text-slate-900 flex items-center gap-2">
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
                        <div className="flex flex-col items-center gap-1 mt-1">
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                            🔗 전용+커넥티드
                          </span>
                          {row.dynamicOccupancyRate === 100 && (
                            <span className="text-[9px] bg-amber-50 text-amber-700 font-medium px-1.5 py-0.5 rounded border border-amber-200">
                              조립 잔여 소진 (동적 100%)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="relative w-20 h-20 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="40" cy="40" r="34" stroke="#e2e8f0" strokeWidth="6" fill="transparent" />
                        <circle cx="40" cy="40" r="34" stroke="#10b981" strokeWidth="6" fill="transparent" strokeDasharray={2 * Math.PI * 34} strokeDashoffset={2 * Math.PI * 34 * (1 - Math.min(row.rate, 100) / 100)} />
                      </svg>
                      <span className="absolute text-base font-bold text-slate-800">{row.displayRate}</span>
                    </div>

                    {/* 전년 동기 가동률 비교 배지 */}
                    {row.lyRate !== null && row.lyRate !== undefined && (
                      <div className="mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full font-financial bg-white border border-slate-200 text-slate-600 flex items-center gap-1">
                        <span>전년 {row.lyRate}%</span>
                        {row.rateDiff !== null && (
                          <span className={row.rateDiff >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                            ({row.rateDiff >= 0 ? '+' : ''}{row.rateDiff}%p)
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex flex-col items-center mt-3 space-y-1 text-center w-full">
                      <div className="text-xs font-semibold text-slate-600 flex items-center justify-center gap-1 flex-wrap">
                        <span>{row.sold}건 / {row.capacity}실</span>
                        {row.lySold !== null && (
                          <span className="text-[10px] text-slate-400 font-normal font-financial">
                            (전년 {row.lySold}건)
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-financial">
                        매출: {formatCurrency(row.revenue)}원
                        {row.lyRev !== null && row.lyRev > 0 && (
                          <span className="text-slate-400 block text-[9px]">
                            전년 {formatCurrency(row.lyRev)}원
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-emerald-600 font-bold font-financial">
                        ADR: {row.adr !== null && row.adr !== undefined ? formatCurrency(row.adr) + '원' : '-'}
                        {row.lyAdr !== null && row.lyAdr > 0 && (
                          <span className="text-slate-400 block text-[9px] font-normal">
                            전년 {formatCurrency(row.lyAdr)}원
                          </span>
                        )}
                      </div>
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

          {/* 🌟 기간 선택 시: 전년 동일기간 객실 실적 정밀 대조 매트릭스 */}
          {isRange && lyStats && (
            <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8 border border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-slate-100 gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      YoY 동일기간 비교 SSOT
                    </span>
                    <span className="text-xs font-semibold text-slate-500 font-financial">
                      당해 ({startDate} ~ {endDate}) vs 전년 동기 ({lyStart} ~ {lyEnd})
                    </span>
                  </div>
                  <h2 className="text-lg lg:text-xl font-bold text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-emerald-600" />
                    <span>객실 경영 실적 전년 동일기간 정밀 대조표</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    선택한 전체 기간의 핵심 객실 지표(매출, 판매량, ADR, 점유율, 평형별)를 전년 동기간 실측 데이터와 1:1로 직접 대조합니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLyCompareTable(!showLyCompareTable)}
                  className="text-xs font-bold px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors self-start sm:self-auto cursor-pointer"
                >
                  {showLyCompareTable ? '테이블 접기 ▲' : '테이블 펼치기 ▼'}
                </button>
              </div>

              {showLyCompareTable && (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left whitespace-nowrap min-w-[720px]">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 bg-slate-50/80 uppercase tracking-wider">
                        <th className="py-3.5 px-4">경영 지표 구분</th>
                        <th className="py-3.5 px-4 text-right">당해 실적 ({startDate} ~ {endDate})</th>
                        <th className="py-3.5 px-4 text-right">전년 동기 ({lyStart} ~ {lyEnd})</th>
                        <th className="py-3.5 px-4 text-right">YoY 증감 (Delta)</th>
                        <th className="py-3.5 px-4 text-right">YoY 증감률 (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs sm:text-sm font-financial">
                      {/* 1. 객실 총매출 */}
                      <tr className="bg-emerald-50/20 font-bold hover:bg-emerald-50/40 transition-colors">
                        <td className="py-3.5 px-4 text-slate-900 flex items-center gap-2">
                          <Coins className="w-4 h-4 text-emerald-600" />
                          <span>객실 총 매출 (순매출)</span>
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-900 font-extrabold">{formatCurrency(revCurrent)}원</td>
                        <td className="py-3.5 px-4 text-right text-slate-600">{formatCurrency(revLy)}원</td>
                        <td className={`py-3.5 px-4 text-right font-bold ${revDiff >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {revDiff > 0 ? '+' : ''}{formatCurrency(revDiff)}원
                        </td>
                        <td className={`py-3.5 px-4 text-right font-extrabold ${revGrowth !== null && revGrowth >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {revGrowth !== null ? `${revGrowth >= 0 ? '▲' : '▼'} ${Math.abs(revGrowth)}%` : '-'}
                        </td>
                      </tr>
                      {/* 세부: 주중/휴일전일 매출 */}
                      <tr className="text-slate-500 hover:bg-slate-50/40">
                        <td className="py-2.5 px-4 pl-8 text-xs">• 주중 객실 매출</td>
                        <td className="py-2.5 px-4 text-right text-xs">{formatCurrency(lodgingStats.weekdayRevenue)}원</td>
                        <td className="py-2.5 px-4 text-right text-xs">{formatCurrency(lyStats.weekdayRevenue)}원</td>
                        <td className="py-2.5 px-4 text-right text-xs">
                          {lodgingStats.weekdayRevenue !== undefined && lyStats.weekdayRevenue !== undefined
                            ? `${lodgingStats.weekdayRevenue - lyStats.weekdayRevenue > 0 ? '+' : ''}${formatCurrency(lodgingStats.weekdayRevenue - lyStats.weekdayRevenue)}원`
                            : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-right text-xs">
                          {lodgingStats.weekdayRevenue !== undefined && lyStats.weekdayRevenue ? (
                            <span className={lodgingStats.weekdayRevenue >= lyStats.weekdayRevenue ? 'text-emerald-700' : 'text-rose-600'}>
                              {lodgingStats.weekdayRevenue >= lyStats.weekdayRevenue ? '▲' : '▼'} {Math.abs(Number(((lodgingStats.weekdayRevenue - lyStats.weekdayRevenue) / lyStats.weekdayRevenue * 100).toFixed(1)))}%
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                      <tr className="text-slate-500 hover:bg-slate-50/40">
                        <td className="py-2.5 px-4 pl-8 text-xs">• 휴일전일 객실 매출</td>
                        <td className="py-2.5 px-4 text-right text-xs">{formatCurrency(lodgingStats.weekendRevenue)}원</td>
                        <td className="py-2.5 px-4 text-right text-xs">{formatCurrency(lyStats.weekendRevenue)}원</td>
                        <td className="py-2.5 px-4 text-right text-xs">
                          {lodgingStats.weekendRevenue !== undefined && lyStats.weekendRevenue !== undefined
                            ? `${lodgingStats.weekendRevenue - lyStats.weekendRevenue > 0 ? '+' : ''}${formatCurrency(lodgingStats.weekendRevenue - lyStats.weekendRevenue)}원`
                            : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-right text-xs">
                          {lodgingStats.weekendRevenue !== undefined && lyStats.weekendRevenue ? (
                            <span className={lodgingStats.weekendRevenue >= lyStats.weekendRevenue ? 'text-emerald-700' : 'text-rose-600'}>
                              {lodgingStats.weekendRevenue >= lyStats.weekendRevenue ? '▲' : '▼'} {Math.abs(Number(((lodgingStats.weekendRevenue - lyStats.weekendRevenue) / lyStats.weekendRevenue * 100).toFixed(1)))}%
                            </span>
                          ) : '-'}
                        </td>
                      </tr>

                      {/* 2. 총 판매 계약 건수 */}
                      <tr className="bg-slate-50/40 font-bold hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 text-slate-900 flex items-center gap-2">
                          <CalendarDays className="w-4 h-4 text-[#00ae95]" />
                          <span>총 판매 계약 건수 (실)</span>
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-900 font-extrabold">{formatCurrency(roomsCurrent)}건</td>
                        <td className="py-3.5 px-4 text-right text-slate-600">{formatCurrency(roomsLy)}건</td>
                        <td className={`py-3.5 px-4 text-right font-bold ${roomsDiff >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {roomsDiff > 0 ? '+' : ''}{formatCurrency(roomsDiff)}건
                        </td>
                        <td className={`py-3.5 px-4 text-right font-extrabold ${roomsGrowth !== null && roomsGrowth >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {roomsGrowth !== null ? `${roomsGrowth >= 0 ? '▲' : '▼'} ${Math.abs(roomsGrowth)}%` : '-'}
                        </td>
                      </tr>
                      {/* 세부: 주중/휴일전일 판매 */}
                      <tr className="text-slate-500 hover:bg-slate-50/40">
                        <td className="py-2.5 px-4 pl-8 text-xs">• 주중 판매 건수</td>
                        <td className="py-2.5 px-4 text-right text-xs">{formatCurrency(lodgingStats.weekdayRoomsSold)}건</td>
                        <td className="py-2.5 px-4 text-right text-xs">{formatCurrency(lyStats.weekdayRoomsSold)}건</td>
                        <td className="py-2.5 px-4 text-right text-xs">
                          {lodgingStats.weekdayRoomsSold !== undefined && lyStats.weekdayRoomsSold !== undefined
                            ? `${lodgingStats.weekdayRoomsSold - lyStats.weekdayRoomsSold > 0 ? '+' : ''}${formatCurrency(lodgingStats.weekdayRoomsSold - lyStats.weekdayRoomsSold)}건`
                            : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-right text-xs">
                          {lodgingStats.weekdayRoomsSold !== undefined && lyStats.weekdayRoomsSold ? (
                            <span className={lodgingStats.weekdayRoomsSold >= lyStats.weekdayRoomsSold ? 'text-emerald-700' : 'text-rose-600'}>
                              {lodgingStats.weekdayRoomsSold >= lyStats.weekdayRoomsSold ? '▲' : '▼'} {Math.abs(Number(((lodgingStats.weekdayRoomsSold - lyStats.weekdayRoomsSold) / lyStats.weekdayRoomsSold * 100).toFixed(1)))}%
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                      <tr className="text-slate-500 hover:bg-slate-50/40">
                        <td className="py-2.5 px-4 pl-8 text-xs">• 휴일전일 판매 건수</td>
                        <td className="py-2.5 px-4 text-right text-xs">{formatCurrency(lodgingStats.weekendRoomsSold)}건</td>
                        <td className="py-2.5 px-4 text-right text-xs">{formatCurrency(lyStats.weekendRoomsSold)}건</td>
                        <td className="py-2.5 px-4 text-right text-xs">
                          {lodgingStats.weekendRoomsSold !== undefined && lyStats.weekendRoomsSold !== undefined
                            ? `${lodgingStats.weekendRoomsSold - lyStats.weekendRoomsSold > 0 ? '+' : ''}${formatCurrency(lodgingStats.weekendRoomsSold - lyStats.weekendRoomsSold)}건`
                            : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-right text-xs">
                          {lodgingStats.weekendRoomsSold !== undefined && lyStats.weekendRoomsSold ? (
                            <span className={lodgingStats.weekendRoomsSold >= lyStats.weekendRoomsSold ? 'text-emerald-700' : 'text-rose-600'}>
                              {lodgingStats.weekendRoomsSold >= lyStats.weekendRoomsSold ? '▲' : '▼'} {Math.abs(Number(((lodgingStats.weekendRoomsSold - lyStats.weekendRoomsSold) / lyStats.weekendRoomsSold * 100).toFixed(1)))}%
                            </span>
                          ) : '-'}
                        </td>
                      </tr>

                      {/* 3. 객실 평균 단가 (ADR) */}
                      <tr className="bg-sky-50/20 font-bold hover:bg-sky-50/40 transition-colors">
                        <td className="py-3.5 px-4 text-slate-900 flex items-center gap-2">
                          <Coins className="w-4 h-4 text-sky-600" />
                          <span>객실 평균 단가 (ADR)</span>
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-900 font-extrabold">{formatCurrency(adrCurrent)}원</td>
                        <td className="py-3.5 px-4 text-right text-slate-600">{formatCurrency(adrLy)}원</td>
                        <td className={`py-3.5 px-4 text-right font-bold ${adrDiff !== null && adrDiff >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {adrDiff !== null ? `${adrDiff > 0 ? '+' : ''}${formatCurrency(adrDiff)}원` : '-'}
                        </td>
                        <td className={`py-3.5 px-4 text-right font-extrabold ${adrGrowth !== null && adrGrowth >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {adrGrowth !== null ? `${adrGrowth >= 0 ? '▲' : '▼'} ${Math.abs(adrGrowth)}%` : '-'}
                        </td>
                      </tr>
                      {/* 세부: 주중/휴일전일 ADR */}
                      <tr className="text-slate-500 hover:bg-slate-50/40">
                        <td className="py-2.5 px-4 pl-8 text-xs">• 주중 평균 ADR</td>
                        <td className="py-2.5 px-4 text-right text-xs">{formatCurrency(lodgingStats.weekdayAdr)}원</td>
                        <td className="py-2.5 px-4 text-right text-xs">{formatCurrency(lyStats.weekdayAdr)}원</td>
                        <td className="py-2.5 px-4 text-right text-xs">
                          {lodgingStats.weekdayAdr !== undefined && lyStats.weekdayAdr !== undefined
                            ? `${lodgingStats.weekdayAdr - lyStats.weekdayAdr > 0 ? '+' : ''}${formatCurrency(lodgingStats.weekdayAdr - lyStats.weekdayAdr)}원`
                            : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-right text-xs">
                          {lodgingStats.weekdayAdr !== undefined && lyStats.weekdayAdr ? (
                            <span className={lodgingStats.weekdayAdr >= lyStats.weekdayAdr ? 'text-emerald-700' : 'text-rose-600'}>
                              {lodgingStats.weekdayAdr >= lyStats.weekdayAdr ? '▲' : '▼'} {Math.abs(Number(((lodgingStats.weekdayAdr - lyStats.weekdayAdr) / lyStats.weekdayAdr * 100).toFixed(1)))}%
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                      <tr className="text-slate-500 hover:bg-slate-50/40">
                        <td className="py-2.5 px-4 pl-8 text-xs">• 휴일전일 평균 ADR</td>
                        <td className="py-2.5 px-4 text-right text-xs">{formatCurrency(lodgingStats.weekendAdr)}원</td>
                        <td className="py-2.5 px-4 text-right text-xs">{formatCurrency(lyStats.weekendAdr)}원</td>
                        <td className="py-2.5 px-4 text-right text-xs">
                          {lodgingStats.weekendAdr !== undefined && lyStats.weekendAdr !== undefined
                            ? `${lodgingStats.weekendAdr - lyStats.weekendAdr > 0 ? '+' : ''}${formatCurrency(lodgingStats.weekendAdr - lyStats.weekendAdr)}원`
                            : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-right text-xs">
                          {lodgingStats.weekendAdr !== undefined && lyStats.weekendAdr ? (
                            <span className={lodgingStats.weekendAdr >= lyStats.weekendAdr ? 'text-emerald-700' : 'text-rose-600'}>
                              {lodgingStats.weekendAdr >= lyStats.weekendAdr ? '▲' : '▼'} {Math.abs(Number(((lodgingStats.weekendAdr - lyStats.weekendAdr) / lyStats.weekendAdr * 100).toFixed(1)))}%
                            </span>
                          ) : '-'}
                        </td>
                      </tr>

                      {/* 4. 실운영 점유율 */}
                      <tr className="bg-teal-50/20 font-bold hover:bg-teal-50/40 transition-colors">
                        <td className="py-3.5 px-4 text-slate-900 flex items-center gap-2">
                          <KeyRound className="w-4 h-4 text-teal-600" />
                          <span>실운영 객실 가동률 (Occupancy)</span>
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-900 font-extrabold">
                          {occCurrent !== undefined ? `${occCurrent}%` : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-600">
                          {occLy !== null ? `${occLy}%` : '-'}
                        </td>
                        <td className={`py-3.5 px-4 text-right font-bold ${occDiff !== null && occDiff >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {occDiff !== null ? `${occDiff > 0 ? '+' : ''}${occDiff}%p` : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-400 text-xs">
                          (물리 인벤토리 기준)
                        </td>
                      </tr>

                      {/* 5. 평형별 상세 실적 */}
                      {roomOccupancyData.map((row) => (
                        <tr key={row.roomSize} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-800 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span>{row.roomSize} (판매 {row.sold}건 vs 전년 {row.lySold ?? '-'}건)</span>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-800">
                            {formatCurrency(row.revenue)}원 <span className="text-xs text-slate-400 font-normal">({row.displayRate})</span>
                          </td>
                          <td className="py-3 px-4 text-right text-slate-600">
                            {row.lyRev !== null ? `${formatCurrency(row.lyRev)}원` : '-'} <span className="text-xs text-slate-400">({row.lyRate !== null ? `${row.lyRate}%` : '-'})</span>
                          </td>
                          <td className={`py-3 px-4 text-right font-bold ${row.lyRev !== null && row.revenue >= row.lyRev ? 'text-emerald-700' : 'text-rose-600'}`}>
                            {row.lyRev !== null ? `${row.revenue - row.lyRev > 0 ? '+' : ''}${formatCurrency(row.revenue - row.lyRev)}원` : '-'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {row.lyRev !== null && row.lyRev > 0 ? (
                              <span className={row.revenue >= row.lyRev ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                                {row.revenue >= row.lyRev ? '▲' : '▼'} {Math.abs(Number(((row.revenue - row.lyRev) / row.lyRev * 100).toFixed(1)))}%
                              </span>
                            ) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 175실 기준 실운영 점유 레이어링 도넛 차트 */}
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-emerald-500" /> {isRange ? `총 ${totalBaseRooms.toLocaleString()}실 기준 실운영 점유 레이어링 분석` : '전체 175실 기준 실운영 점유 레이어링 분석'}
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
                      <div className="text-xs font-bold text-slate-700">일반/단독 점유 (물리)</div>
                      <div className="text-[11px] text-slate-500">16평 / 35평 / 단독51평 전용 판매 실적</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold text-emerald-800">{standardPhysicalRooms.toLocaleString()}실</div>
                    <div className="text-[10px] text-slate-400">{totalBaseRooms > 0 ? ((standardPhysicalRooms / totalBaseRooms) * 100).toFixed(1) + '%' : '-'}</div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-cyan-50/60 border border-cyan-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3.5 h-3.5 rounded-full bg-[#06b6d4]"></div>
                    <div>
                      <div className="text-xs font-bold text-slate-700">커넥팅 점유 (물리)</div>
                      <div className="text-[11px] text-slate-500">51평 {connectingSets.toLocaleString()}세트 × 2개 객실(16평+35평)</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold text-cyan-800">{connectingPhysicalRooms.toLocaleString()}실</div>
                    <div className="text-[10px] text-slate-400">{totalBaseRooms > 0 ? ((connectingPhysicalRooms / totalBaseRooms) * 100).toFixed(1) + '%' : '-'}</div>
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
                    <div className="text-base font-bold text-slate-700">{remainingRooms.toLocaleString()}실</div>
                    <div className="text-[10px] text-slate-400">{totalBaseRooms > 0 ? ((remainingRooms / totalBaseRooms) * 100).toFixed(1) + '%' : '-'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 요금타입별 점유율 도넛 차트 */}
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-blue-500" /> 요금타입(상품)별 판매 실적 분석
              </h2>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl">
                <Layers size={14} className="text-blue-500" />
                <span>총 판매 기준: {(lodgingStats?.roomsSold || 0).toLocaleString()}건</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 h-[320px] w-full">
                <ReactECharts option={ratePieOptions} style={{ height: '100%', width: '100%' }} />
              </div>
              
              <div className="lg:col-span-5 flex flex-col gap-3">
                <p className="text-xs text-slate-500 bg-blue-50/50 p-4 rounded-2xl border border-blue-100 mb-2 font-medium">
                  💡 실물리 객실이 아닌 요금타입(상품) 단위의 판매 점유율입니다.<br/>
                  (예: 회원권 종류, 패키지, OTA 일반판매 등)
                </p>
                {data?.rateAdrData?.slice(0, 3).map((r: any, idx: number) => {
                  const colors = ['bg-blue-500', 'bg-amber-500', 'bg-emerald-500'];
                  const bgColors = ['bg-blue-50/60', 'bg-amber-50/60', 'bg-emerald-50/60'];
                  const borderColors = ['border-blue-100', 'border-amber-100', 'border-emerald-100'];
                  const textColors = ['text-blue-800', 'text-amber-800', 'text-emerald-800'];
                  const cIdx = idx % 3;
                  const ratio = lodgingStats?.roomsSold > 0 ? ((r.roomsSold / lodgingStats.roomsSold) * 100).toFixed(1) : '0.0';
                  return (
                    <div key={idx} className={`p-4 rounded-2xl ${bgColors[cIdx]} border ${borderColors[cIdx]} flex items-center justify-between`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-3.5 h-3.5 rounded-full ${colors[cIdx]}`}></div>
                        <div>
                          <div className="text-xs font-bold text-slate-700">{r.marketType}</div>
                          <div className="text-[11px] text-slate-500">총 {formatCurrency(r.totalRevenue)}원 매출</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-base font-bold ${textColors[cIdx]}`}>{r.roomsSold}건</div>
                        <div className="text-[10px] text-slate-400">{ratio}%</div>
                      </div>
                    </div>
                  );
                })}
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



              {/* 💡 3. 데이터 기반 경영 액션 가이드 (Strategic Action Guide) */}
              <div className="bg-gradient-to-r from-amber-50/70 via-indigo-50/50 to-teal-50/40 p-5 rounded-3xl border border-indigo-100/90 mb-6 shadow-2xs">
                <div className="flex items-center gap-2 mb-2 font-bold text-slate-900 text-sm">
                  <Lightbulb className="w-4 h-4 text-amber-500 fill-amber-400" />
                  <span>데이터 기반 경영 액션 가이드 (Data-Driven Strategic Guide)</span>
                </div>

                {dayTypeFilter === 'holiday_eve' && (
                  <div className="text-xs text-slate-700 space-y-1.5 pl-6 border-l-2 border-amber-400">
                    <div className="font-bold text-amber-900">
                      🌟 [익일 휴일·주말군] 연박 고객의 레저·식음 풀코스 소비 시너지
                    </div>
                    <div>
                      • <b>레저 소비 시너지 창출🔥</b>: 주말/연휴 연박 투숙객은 둘째 날 리조트에 종일 체류하며 루지, 모토아레나, 포레스트클럽 등 레저시설을 풀코스로 이용하는 경향이 뚜렷합니다.
                    </div>
                    <div>
                      • <b>팀당 부대매출 확대</b>: 1팀이 리조트에 머무는 동안 창출하는 순부대매출은 1박 고객 대비 크게 증가합니다. (하단 실측 RevPAS 지표 참조)
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
                      • <b>비즈니스·체류 중심 소비 패턴</b>: 주중 연박 고객은 출장·비즈니스·워케이션 목적으로 낮 시간에 외부 업무를 보거나 객실에 상주하여 레저 소비 참여율이 상대적으로 낮습니다.
                    </div>
                    <div>
                      • <b>단지 내 식사 락인 필요</b>: 주중 연박 고객의 외부 식사 이탈을 방지하고 단지 내 식음 업장 소비를 유인하는 프로그램이 권장됩니다.
                    </div>
                    <div className="text-blue-950 font-semibold pt-1">
                      🎯 <b>경영 액션</b>: 평일 연박 고객 체크인 시 <b>[단지 내 식음/카페 식음 바우처]</b> 또는 조식 할인권을 제공하여 리조트 단지 내 식음 소비를 적극 유인(Lock-in)해야 합니다.
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
                const isMultiDay = Boolean(isRange && losSummary);
                const latestLos = losTrendData && losTrendData.length > 0 ? losTrendData[losTrendData.length - 1] : null;

                const activeRooms = isMultiDay ? (losSummary?.grandTotalRooms || 0) : (latestLos?.roomsSold || 0);

                const activeMultiRooms = isMultiDay ? (losSummary?.grandTotalMultiNightRooms || 0) : (latestLos?.multiNightRooms || 0);

                const multiRatio = isMultiDay 
                  ? (losSummary?.avgMultiNightRatio ?? '-') 
                  : (latestLos?.multiNightRatio ?? '-');

                const liveFnb = Math.round(isMultiDay ? (losSummary?.avgFnbRevPAS || 0) : (latestLos?.fnbRevPAS || 0));

                const liveLeisure = Math.round(isMultiDay ? (losSummary?.avgLeisureRevPAS || 0) : (latestLos?.leisureRevPAS || 0));

                const liveTotal = liveFnb + liveLeisure;

                const totalSynergySales = isMultiDay ? (losSummary?.grandTotalSynergySales || 0) : (latestLos?.totalSynergySales || 0);

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
                          {formatCurrency(liveFnb)}원 <span className="text-xs font-normal text-slate-500">/ 1실</span>
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
                          {formatCurrency(liveLeisure)}원 <span className="text-xs font-normal text-slate-500">/ 1실</span>
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
                          {formatCurrency(liveTotal)}원 <span className="text-xs font-normal text-indigo-500">/ 1실</span>
                        </div>
                        <div className="space-y-1 text-xs text-indigo-950 pt-2 border-t border-indigo-200/60">
                          <div className="flex justify-between">
                            <span>• 부대시설 실측 총매출:</span>
                            <span className="font-semibold text-indigo-900">{formatCurrency(totalSynergySales)}원</span>
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
            {/* 1. 판매채널별 객단가 분석 */}
            <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-2 border-b border-slate-100 gap-2">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  💰 판매채널별 객단가 분석
                </h2>
                {lyData && (
                  <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-bold self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setChannelCompareView('compare')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        channelCompareView === 'compare'
                          ? 'bg-white text-emerald-800 shadow-xs font-extrabold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      전년 대조
                    </button>
                    <button
                      type="button"
                      onClick={() => setChannelCompareView('single')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        channelCompareView === 'single'
                          ? 'bg-white text-emerald-800 shadow-xs font-extrabold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      단독 보기
                    </button>
                  </div>
                )}
              </div>

              {channelAdrData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left whitespace-nowrap min-w-[500px]">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap">
                        <th className="py-3 px-4 whitespace-nowrap">판매 채널명</th>
                        {channelCompareView === 'compare' && lyData ? (
                          <>
                            <th className="py-3 px-3 text-right whitespace-nowrap">판매 건수 (당해 vs 전년)</th>
                            <th className="py-3 px-3 text-right whitespace-nowrap">총 매출액 (YoY)</th>
                            <th className="py-3 px-3 text-right whitespace-nowrap">평균 ADR (당해 vs 전년)</th>
                          </>
                        ) : (
                          <>
                            <th className="py-3 px-4 text-right whitespace-nowrap">판매 건수(계약)</th>
                            <th className="py-3 px-4 text-right whitespace-nowrap">총 매출액</th>
                            <th className="py-3 px-4 text-right whitespace-nowrap">평균 객단가 (ADR)</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-sm font-financial">
                      {channelCompareView === 'compare' && lyData ? (
                        channelComparisonData.map((row: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors whitespace-nowrap">
                            <td className="py-3.5 px-4 text-slate-700 font-semibold whitespace-nowrap">{row.channel}</td>
                            <td className="py-3.5 px-3 text-right whitespace-nowrap">
                              <span className="font-bold text-slate-900">{row.roomsSold.toLocaleString()}건</span>
                              <span className="text-slate-400 text-xs block">
                                전년 {row.lySold.toLocaleString()}건 
                                {row.soldDiff !== 0 && (
                                  <strong className={row.soldDiff > 0 ? ' text-emerald-600' : ' text-rose-500'}>
                                    ({row.soldDiff > 0 ? '+' : ''}{row.soldDiff})
                                  </strong>
                                )}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-right whitespace-nowrap">
                              <span className="font-bold text-slate-900">{formatCurrency(row.totalRevenue)}원</span>
                              <span className="text-xs block">
                                {row.lyRev > 0 ? (
                                  <span className={row.revGrowth >= 0 ? 'text-emerald-700 font-semibold' : 'text-rose-600 font-semibold'}>
                                    전년 {formatCurrency(row.lyRev)}원 ({row.revGrowth >= 0 ? '▲' : '▼'} {Math.abs(row.revGrowth)}%)
                                  </span>
                                ) : (
                                  <span className="text-slate-400">전년 실적 없음</span>
                                )}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-right whitespace-nowrap">
                              <span className="font-bold text-slate-900">{row.adr > 0 ? `${formatCurrency(row.adr)}원` : '-'}</span>
                              {row.lyAdr > 0 && (
                                <span className="text-slate-400 text-xs block">
                                  전년 {formatCurrency(row.lyAdr)}원
                                  {row.adrDiff !== null && row.adrDiff !== 0 && (
                                    <strong className={row.adrDiff > 0 ? ' text-emerald-600' : ' text-rose-500'}>
                                      ({row.adrDiff > 0 ? '+' : ''}{formatCurrency(row.adrDiff)})
                                    </strong>
                                  )}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        channelAdrData.map((row: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors whitespace-nowrap">
                            <td className="py-3.5 px-4 text-slate-700 font-semibold whitespace-nowrap">{row.channel}</td>
                            <td className="py-3.5 px-4 text-right text-slate-500 whitespace-nowrap">{row.roomsSold.toLocaleString()}건</td>
                            <td className="py-3.5 px-4 text-right text-slate-600 whitespace-nowrap">{formatCurrency(row.totalRevenue)}원</td>
                            <td className="py-3.5 px-4 text-right font-medium text-slate-900 whitespace-nowrap">{row.adr > 0 ? `${formatCurrency(row.adr)}원` : '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400">
                  해당 날짜의 판매 채널 데이터가 없습니다.
                </div>
              )}
            </div>

            {/* 2. 요금타입(회원/상품)별 실적 및 객단가 */}
            <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-2 border-b border-slate-100 gap-2">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  🏷️ 요금타입(회원/상품)별 실적 및 객단가
                </h2>
                {lyData && (
                  <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-bold self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setChannelCompareView('compare')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        channelCompareView === 'compare'
                          ? 'bg-white text-emerald-800 shadow-xs font-extrabold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      전년 대조
                    </button>
                    <button
                      type="button"
                      onClick={() => setChannelCompareView('single')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        channelCompareView === 'single'
                          ? 'bg-white text-emerald-800 shadow-xs font-extrabold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      단독 보기
                    </button>
                  </div>
                )}
              </div>

              {rateAdrData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left whitespace-nowrap min-w-[500px]">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap">
                        <th className="py-3 px-4 whitespace-nowrap">요금타입(상품)명</th>
                        {channelCompareView === 'compare' && lyData ? (
                          <>
                            <th className="py-3 px-3 text-right whitespace-nowrap">판매 건수 (당해 vs 전년)</th>
                            <th className="py-3 px-3 text-right whitespace-nowrap">총 매출액 (YoY)</th>
                            <th className="py-3 px-3 text-right whitespace-nowrap">평균 ADR (당해 vs 전년)</th>
                          </>
                        ) : (
                          <>
                            <th className="py-3 px-4 text-right whitespace-nowrap">판매 건수(계약)</th>
                            <th className="py-3 px-4 text-right whitespace-nowrap">총 매출액</th>
                            <th className="py-3 px-4 text-right whitespace-nowrap">평균 객단가 (ADR)</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-sm font-financial">
                      {channelCompareView === 'compare' && lyData ? (
                        rateComparisonData.map((row: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors whitespace-nowrap">
                            <td className="py-3.5 px-4 text-slate-700 font-semibold whitespace-nowrap">{row.marketType}</td>
                            <td className="py-3.5 px-3 text-right whitespace-nowrap">
                              <span className="font-bold text-slate-900">{row.roomsSold.toLocaleString()}건</span>
                              <span className="text-slate-400 text-xs block">
                                전년 {row.lySold.toLocaleString()}건 
                                {row.soldDiff !== 0 && (
                                  <strong className={row.soldDiff > 0 ? ' text-emerald-600' : ' text-rose-500'}>
                                    ({row.soldDiff > 0 ? '+' : ''}{row.soldDiff})
                                  </strong>
                                )}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-right whitespace-nowrap">
                              <span className="font-bold text-slate-900">{formatCurrency(row.totalRevenue)}원</span>
                              <span className="text-xs block">
                                {row.lyRev > 0 ? (
                                  <span className={row.revGrowth >= 0 ? 'text-emerald-700 font-semibold' : 'text-rose-600 font-semibold'}>
                                    전년 {formatCurrency(row.lyRev)}원 ({row.revGrowth >= 0 ? '▲' : '▼'} {Math.abs(row.revGrowth)}%)
                                  </span>
                                ) : (
                                  <span className="text-slate-400">전년 실적 없음</span>
                                )}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-right whitespace-nowrap">
                              <span className="font-bold text-slate-900">{row.adr > 0 ? `${formatCurrency(row.adr)}원` : '-'}</span>
                              {row.lyAdr > 0 && (
                                <span className="text-slate-400 text-xs block">
                                  전년 {formatCurrency(row.lyAdr)}원
                                  {row.adrDiff !== null && row.adrDiff !== 0 && (
                                    <strong className={row.adrDiff > 0 ? ' text-emerald-600' : ' text-rose-500'}>
                                      ({row.adrDiff > 0 ? '+' : ''}{formatCurrency(row.adrDiff)})
                                    </strong>
                                  )}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        rateAdrData.map((row: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors whitespace-nowrap">
                            <td className="py-3.5 px-4 text-slate-700 font-semibold whitespace-nowrap">{row.marketType}</td>
                            <td className="py-3.5 px-4 text-right text-slate-500 whitespace-nowrap">{row.roomsSold.toLocaleString()}건</td>
                            <td className="py-3.5 px-4 text-right text-slate-600 whitespace-nowrap">{formatCurrency(row.totalRevenue)}원</td>
                            <td className="py-3.5 px-4 text-right font-medium text-slate-900 whitespace-nowrap">{row.adr > 0 ? `${formatCurrency(row.adr)}원` : '-'}</td>
                          </tr>
                        ))
                      )}
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
        </>
      )}
    </div>
  );
}
