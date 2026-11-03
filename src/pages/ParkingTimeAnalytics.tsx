import { useState, useEffect, useMemo } from 'react';
import { useDate } from '../contexts/DateContext';
import { secureFetcher } from '../lib/secureFetcher';
import type {
  ParkingTimeAnalyticsResponse,
  StayNonGolfCohort,
  WalkInNonGroupCohort,
  ParkingDayOfWeekItem,
} from '../types/reports-v2';
import ReactECharts from 'echarts-for-react';
import GlobalDatePicker from '../components/GlobalDatePicker';
import {
  Car,
  Clock,
  RotateCcw,
  Calendar,
  RefreshCw,
  Hotel,
  Users,
  ArrowRightLeft,
  AlertCircle,
  CheckCircle2,
  Filter,
  TrendingUp,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

type DayScopeKey = 'PERIOD_ALL' | 'WEEKDAY' | 'WEEKEND' | 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

const DAY_SCOPE_OPTIONS: Array<{ key: DayScopeKey; label: string; isWeekend?: boolean }> = [
  { key: 'PERIOD_ALL', label: '조회기간 전체' },
  { key: 'WEEKDAY', label: '평일 (월~금)' },
  { key: 'WEEKEND', label: '주말 (토~일)', isWeekend: true },
  { key: 'MON', label: '월요일' },
  { key: 'TUE', label: '화요일' },
  { key: 'WED', label: '수요일' },
  { key: 'THU', label: '목요일' },
  { key: 'FRI', label: '금요일' },
  { key: 'SAT', label: '토요일', isWeekend: true },
  { key: 'SUN', label: '일요일', isWeekend: true },
];

const API_DAY_FILTER_OPTIONS: Array<{ code: string; label: string }> = [
  { code: 'ALL', label: '전체 요일 (ALL)' },
  { code: 'WEEKDAY', label: '평일만 (월~금)' },
  { code: 'WEEKEND', label: '주말만 (토~일)' },
  { code: 'MON', label: '월' },
  { code: 'TUE', label: '화' },
  { code: 'WED', label: '수' },
  { code: 'THU', label: '목' },
  { code: 'FRI', label: '금' },
  { code: 'SAT', label: '토' },
  { code: 'SUN', label: '일' },
];

const fmtNum = (v: number | null | undefined, suffix = ''): string => {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '-';
  return `${Number(v).toLocaleString()}${suffix}`;
};

const fmtPct = (v: number | null | undefined): string => {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '-';
  return `${Number(v)}%`;
};

const fmtText = (v: string | null | undefined): string => {
  if (!v) return '-';
  return v;
};

export default function ParkingTimeAnalytics() {
  const { startDate: globalStart, endDate: globalEnd, isRange: globalIsRange, setDateRange } = useDate();

  // 기간 선택 (전역 DatePicker와 자동 연동 + 페이지 내 기간 직접 선택 지원)
  const [queryStart, setQueryStart] = useState<string>(() => globalStart || '2025-08-01');
  const [queryEnd, setQueryEnd] = useState<string>(() =>
    globalIsRange && globalEnd ? globalEnd : globalStart || '2025-08-22'
  );

  // 전역 DatePicker 변경 시 자동 동기화
  useEffect(() => {
    if (globalStart) {
      setQueryStart(globalStart);
      setQueryEnd(globalIsRange && globalEnd ? globalEnd : globalStart);
    }
  }, [globalStart, globalEnd, globalIsRange]);

  // API dayOfWeek 쿼리 파라미터 (ALL | WEEKDAY | WEEKEND | MON..SUN 또는 콤마 다중 선택)
  const [selectedDayOfWeekParam, setSelectedDayOfWeekParam] = useState<string>('ALL');

  // 상단 메인 분석 탭 (통합 보기 / 기능1 숙박(골프제외) / 기능2 나들이(단체제외) / 기능3 요일별·일별 상세 비교)
  const [activeViewTab, setActiveViewTab] = useState<'ALL' | 'STAY' | 'WALKIN' | 'DAILY_LOG'>('ALL');

  // 각 코호트 섹션 내 요일별 분리 조회 스코프 (byDayOfWeek / byDayType 1:1 직결 바인딩)
  const [selectedStayDayScope, setSelectedStayDayScope] = useState<DayScopeKey>('PERIOD_ALL');
  const [selectedWalkInDayScope, setSelectedWalkInDayScope] = useState<DayScopeKey>('PERIOD_ALL');

  // 나들이 시간대별 차트 표시 기준 (차량 대수 vs 환산 방문객 수 — 모두 백엔드 완제품 필드 직결)
  const [walkInMetricMode, setWalkInMetricMode] = useState<'CARS' | 'VISITORS'>('CARS');

  // 하단 일별 상세 로그 요일 필터
  const [dailyTableDayFilter, setDailyTableDayFilter] = useState<string>('ALL');

  const [data, setData] = useState<ParkingTimeAnalyticsResponse | null>(null);
  const [resortVisitors, setResortVisitors] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchTimeAnalytics = async (sDate: string, eDate: string, dowParam: string) => {
    setLoading(true);
    setApiError(null);
    try {
      let validStart = sDate;
      let validEnd = eDate || sDate;
      if (validStart && validEnd && validStart > validEnd) {
        const tmp = validStart;
        validStart = validEnd;
        validEnd = tmp;
      }

      const params = new URLSearchParams();
      params.set('startDate', validStart);
      params.set('endDate', validEnd);
      params.set('dayOfWeek', dowParam || 'ALL');

      const [res, parkSummaryRes] = await Promise.all([
        secureFetcher(`${API_BASE}/api/v6/parking/time-analytics?${params.toString()}`),
        secureFetcher(
          `${API_BASE}/api/v6/dashboard/parking-summary?startDate=${validStart}&endDate=${validEnd}&date=${validStart}`
        ).catch(() => null),
      ]);
      const payload: ParkingTimeAnalyticsResponse = res?.data ?? res;
      const rv =
        parkSummaryRes?.resortVisitors ||
        parkSummaryRes?.summary?.resortVisitors ||
        parkSummaryRes?.data?.resortVisitors ||
        null;
      setResortVisitors(rv);

      if (payload && payload.success) {
        setData(payload);
      } else {
        setData(null);
        setApiError(payload?.error || '입출차 시간대 분석 데이터를 불러올 수 없습니다.');
      }
    } catch (err: any) {
      console.error('[ParkingTimeAnalytics] Fetch Error:', err);
      setData(null);
      setResortVisitors(null);
      setApiError(err?.message || '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (queryStart) {
      fetchTimeAnalytics(queryStart, queryEnd || queryStart, selectedDayOfWeekParam);
    }
  }, [queryStart, queryEnd, selectedDayOfWeekParam]);

  const applyPresetRange = (start: string, end: string) => {
    setQueryStart(start);
    setQueryEnd(end);
    setDateRange(start, end);
  };

  const handleToggleDayParam = (code: string) => {
    if (code === 'ALL' || code === 'WEEKDAY' || code === 'WEEKEND') {
      setSelectedDayOfWeekParam(code);
      return;
    }
    const currentParts =
      selectedDayOfWeekParam === 'ALL' ||
      selectedDayOfWeekParam === 'WEEKDAY' ||
      selectedDayOfWeekParam === 'WEEKEND'
        ? []
        : selectedDayOfWeekParam.split(',').filter(Boolean);

    if (currentParts.includes(code)) {
      const next = currentParts.filter((c) => c !== code);
      setSelectedDayOfWeekParam(next.length > 0 ? next.join(',') : 'ALL');
    } else {
      const next = [...currentParts, code];
      setSelectedDayOfWeekParam(next.join(','));
    }
  };

  const hasData = Boolean(data?.hasTimeAnalyticsData && data?.periodSummary);
  const byDayOfWeekList: ParkingDayOfWeekItem[] = data?.byDayOfWeek || [];

  // 기능 1: 선택된 요일 스코프에 따른 숙박(골프제외) 완제품 코호트 객체 1:1 선택 (Zero Client Calculation)
  const activeStayCohort = useMemo<StayNonGolfCohort | null>(() => {
    if (!data || !data.hasTimeAnalyticsData) return null;
    if (selectedStayDayScope === 'PERIOD_ALL') {
      return data.periodSummary?.stayNonGolf ?? null;
    }
    if (selectedStayDayScope === 'WEEKDAY') {
      return data.byDayType?.weekday?.stayNonGolf ?? null;
    }
    if (selectedStayDayScope === 'WEEKEND') {
      return data.byDayType?.weekend?.stayNonGolf ?? null;
    }
    const foundDay = (data.byDayOfWeek || []).find((d) => d.dayCode === selectedStayDayScope);
    return foundDay?.stayNonGolf ?? null;
  }, [data, selectedStayDayScope]);

  // 기능 2: 선택된 요일 스코프에 따른 순수 나들이(단체제외) 완제품 코호트 객체 1:1 선택 (Zero Client Calculation)
  const activeWalkInCohort = useMemo<WalkInNonGroupCohort | null>(() => {
    if (!data || !data.hasTimeAnalyticsData) return null;
    if (selectedWalkInDayScope === 'PERIOD_ALL') {
      return data.periodSummary?.walkInNonGroup ?? null;
    }
    if (selectedWalkInDayScope === 'WEEKDAY') {
      return data.byDayType?.weekday?.walkInNonGroup ?? null;
    }
    if (selectedWalkInDayScope === 'WEEKEND') {
      return data.byDayType?.weekend?.walkInNonGroup ?? null;
    }
    const foundDay = (data.byDayOfWeek || []).find((d) => d.dayCode === selectedWalkInDayScope);
    return foundDay?.walkInNonGroup ?? null;
  }, [data, selectedWalkInDayScope]);

  // 기능 1 차트: 숙박고객(골프제외) 시간대별(0~23시) 도착·최종출차 및 외출출차·외출복귀 분포
  const stayHourlyChartOption = useMemo(() => {
    const dist = activeStayCohort?.hourlyDistribution || [];
    const hours = dist.map((h) => `${String(h.hour).padStart(2, '0')}시`);
    const entryCars = dist.map((h) => h.entryCars);
    const exitCars = dist.map((h) => h.exitCars);
    const outingExit = dist.map((h) => h.outingExitCount);
    const outingReturn = dist.map((h) => h.outingReturnCount);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      legend: {
        data: ['벨포레 도착(입차) 차량', '최종 퇴실(출차) 차량', '체류 중 외출(출차) 건수', '외출 후 재입차(복귀) 건수'],
        bottom: 0,
      },
      grid: { left: '3%', right: '3%', top: '12%', bottom: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        data: hours,
        axisLabel: { color: '#475569', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        name: '차량 대수 / 건수',
        axisLabel: { formatter: '{value}대' },
      },
      series: [
        {
          name: '벨포레 도착(입차) 차량',
          type: 'bar',
          data: entryCars,
          itemStyle: { color: '#1B382E', borderRadius: [4, 4, 0, 0] },
        },
        {
          name: '최종 퇴실(출차) 차량',
          type: 'bar',
          data: exitCars,
          itemStyle: { color: '#B59269', borderRadius: [4, 4, 0, 0] },
        },
        {
          name: '체류 중 외출(출차) 건수',
          type: 'line',
          smooth: true,
          symbolSize: 7,
          data: outingExit,
          itemStyle: { color: '#e11d48' },
          lineStyle: { width: 2.5, type: 'dashed' },
        },
        {
          name: '외출 후 재입차(복귀) 건수',
          type: 'line',
          smooth: true,
          symbolSize: 7,
          data: outingReturn,
          itemStyle: { color: '#0284c7' },
          lineStyle: { width: 2.5 },
        },
      ],
    };
  }, [activeStayCohort]);

  // 기능 1 요일별 비교 차트: 요일별(월~일) 숙박 차량 수 & 외출·재입차 차량 수 & 외출 비율(%)
  const stayDayOfWeekChartOption = useMemo(() => {
    const labels = byDayOfWeekList.map((d) => d.dayLabel);
    const totalStayCars = byDayOfWeekList.map((d) => d.stayNonGolf?.totalCars ?? 0);
    const reEntryCars = byDayOfWeekList.map((d) => d.stayNonGolf?.reEntrySummary?.reEntryCars ?? 0);
    const reEntryRatios = byDayOfWeekList.map((d) => d.stayNonGolf?.reEntrySummary?.reEntryRatio ?? 0);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
      },
      legend: {
        data: ['숙박(골프제외) 총 차량', '외출 후 재입차 차량', '외출·재입차 비율(%)'],
        bottom: 0,
      },
      grid: { left: '3%', right: '4%', top: '12%', bottom: '16%', containLabel: true },
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: { color: '#334155', fontWeight: 'bold' },
      },
      yAxis: [
        {
          type: 'value',
          name: '차량 대수',
          position: 'left',
          axisLabel: { formatter: '{value}대' },
        },
        {
          type: 'value',
          name: '외출 비율(%)',
          position: 'right',
          axisLabel: { formatter: '{value}%' },
        },
      ],
      series: [
        {
          name: '숙박(골프제외) 총 차량',
          type: 'bar',
          yAxisIndex: 0,
          data: totalStayCars,
          itemStyle: { color: '#284F42', borderRadius: [6, 6, 0, 0] },
        },
        {
          name: '외출 후 재입차 차량',
          type: 'bar',
          yAxisIndex: 0,
          data: reEntryCars,
          itemStyle: { color: '#e11d48', borderRadius: [6, 6, 0, 0] },
        },
        {
          name: '외출·재입차 비율(%)',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          symbolSize: 8,
          data: reEntryRatios,
          itemStyle: { color: '#d97706' },
          lineStyle: { width: 3 },
        },
      ],
    };
  }, [byDayOfWeekList]);

  // 기능 2 차트: 순수 나들이고객(단체제외) 시간대별(0~23시) 입차 및 출차 분포
  const walkInHourlyChartOption = useMemo(() => {
    const dist = activeWalkInCohort?.hourlyDistribution || [];
    const hours = dist.map((h) => `${String(h.hour).padStart(2, '0')}시`);
    const isVisitors = walkInMetricMode === 'VISITORS';
    const unitSuffix = isVisitors ? '명' : '대';
    const entryData = dist.map((h) => (isVisitors ? h.entryVisitors : h.entryCars));
    const exitData = dist.map((h) => (isVisitors ? h.exitVisitors : h.exitCars));

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      legend: {
        data: [
          isVisitors ? '나들이 입차 환산 방문객(명)' : '나들이 입차 차량(대)',
          isVisitors ? '나들이 출차 환산 방문객(명)' : '나들이 출차 차량(대)',
        ],
        bottom: 0,
      },
      grid: { left: '3%', right: '3%', top: '12%', bottom: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        data: hours,
        axisLabel: { color: '#475569', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        name: isVisitors ? '방문객 수(명)' : '차량 대수(대)',
        axisLabel: { formatter: `{value}${unitSuffix}` },
      },
      series: [
        {
          name: isVisitors ? '나들이 입차 환산 방문객(명)' : '나들이 입차 차량(대)',
          type: 'bar',
          data: entryData,
          itemStyle: { color: '#0d9488', borderRadius: [4, 4, 0, 0] },
        },
        {
          name: isVisitors ? '나들이 출차 환산 방문객(명)' : '나들이 출차 차량(대)',
          type: 'bar',
          data: exitData,
          itemStyle: { color: '#f59e0b', borderRadius: [4, 4, 0, 0] },
        },
      ],
    };
  }, [activeWalkInCohort, walkInMetricMode]);

  // 기능 2 요일별 비교 차트: 요일별(월~일) 순수 나들이 차량 수 & 방문객 수 & 일평균 차량
  const walkInDayOfWeekChartOption = useMemo(() => {
    const labels = byDayOfWeekList.map((d) => d.dayLabel);
    const totalCars = byDayOfWeekList.map((d) => d.walkInNonGroup?.totalCars ?? 0);
    const totalVisitors = byDayOfWeekList.map((d) => d.walkInNonGroup?.totalVisitors ?? 0);
    const dailyAvgCars = byDayOfWeekList.map((d) => d.walkInNonGroup?.dailyAvgCars ?? 0);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
      },
      legend: {
        data: ['나들이(단체제외) 총 차량(대)', '환산 방문객 수(명)', '요일별 일평균 차량(대)'],
        bottom: 0,
      },
      grid: { left: '3%', right: '4%', top: '12%', bottom: '16%', containLabel: true },
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: { color: '#334155', fontWeight: 'bold' },
      },
      yAxis: [
        {
          type: 'value',
          name: '차량 / 방문객',
          position: 'left',
        },
        {
          type: 'value',
          name: '일평균 차량(대)',
          position: 'right',
          axisLabel: { formatter: '{value}대' },
        },
      ],
      series: [
        {
          name: '나들이(단체제외) 총 차량(대)',
          type: 'bar',
          yAxisIndex: 0,
          data: totalCars,
          itemStyle: { color: '#0d9488', borderRadius: [6, 6, 0, 0] },
        },
        {
          name: '환산 방문객 수(명)',
          type: 'bar',
          yAxisIndex: 0,
          data: totalVisitors,
          itemStyle: { color: '#38bdf8', borderRadius: [6, 6, 0, 0] },
        },
        {
          name: '요일별 일평균 차량(대)',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          symbolSize: 8,
          data: dailyAvgCars,
          itemStyle: { color: '#f59e0b' },
          lineStyle: { width: 3 },
        },
      ],
    };
  }, [byDayOfWeekList]);

  // 일별 상세 리스트 필터링
  const filteredDailyList = useMemo(() => {
    const list = data?.dailyList || [];
    if (dailyTableDayFilter === 'ALL') return list;
    if (dailyTableDayFilter === 'WEEKDAY') return list.filter((d) => !d.isWeekend);
    if (dailyTableDayFilter === 'WEEKEND') return list.filter((d) => d.isWeekend);
    return list.filter((d) => d.dayCode === dailyTableDayFilter);
  }, [data, dailyTableDayFilter]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 bg-[#F4F3EE] min-h-screen text-[#1B382E]">
      {/* 1. 상단 헤더 & 기간/요일 컨트롤 바 */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E0D5] shadow-xs space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#B59269] uppercase tracking-wider mb-1">
              <Car size={15} />
              <span>V6 PARKING TIME & RE-ENTRY INTELLIGENCE (SSOT)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#1B382E] tracking-tight">
              숙박(골프제외) 입출차·외출재입차 & 나들이(단체제외) 입출차 시간대/요일별 분석
            </h1>
            <p className="text-xs sm:text-sm text-[#5A6B63] mt-1">
              ① 숙박고객(골프제외) 차량의 벨포레 도착·최종출차 시각 및 마지막 출차 전 외출·재입차 패턴 · ② 순수 나들이고객(단체/세미나 제외) 차량의 입차·출차 시각 및 체류시간을 기간·요일별로 분석합니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <GlobalDatePicker />
            <button
              type="button"
              onClick={() => fetchTimeAnalytics(queryStart, queryEnd || queryStart, selectedDayOfWeekParam)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#284F42] text-white text-xs font-bold hover:bg-[#1B382E] transition-colors cursor-pointer shadow-xs"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>새로고침</span>
            </button>
          </div>
        </div>

        {/* 직접 기간 선택 & 빠른 실측 구간 프리셋 바 */}
        <div className="pt-3 border-t border-[#EFECE6] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[#1B382E] flex items-center gap-1.5">
              <Calendar size={14} className="text-[#B59269]" />
              조회 기간 직접 지정:
            </span>
            <input
              type="date"
              value={queryStart}
              onChange={(e) => setQueryStart(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-bold border border-[#D5CFC2] rounded-lg bg-[#FAF9F6] text-[#1B382E]"
            />
            <span className="text-xs text-[#6C7A73] font-bold">~</span>
            <input
              type="date"
              value={queryEnd}
              onChange={(e) => setQueryEnd(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-bold border border-[#D5CFC2] rounded-lg bg-[#FAF9F6] text-[#1B382E]"
            />
            <div className="flex flex-wrap items-center gap-1.5 ml-1">
              <button
                type="button"
                onClick={() => applyPresetRange('2026-10-01', '2026-10-31')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                  queryStart === '2026-10-01' && queryEnd === '2026-10-31'
                    ? 'bg-[#284F42] text-white border-[#284F42]'
                    : 'bg-[#F4F3EE] text-[#1B382E] border-[#D5CFC2] hover:bg-[#E5E0D5]'
                }`}
              >
                26년 10월 전체 (10.01~10.31)
              </button>
              <button
                type="button"
                onClick={() => applyPresetRange('2026-10-31', '2026-10-31')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                  queryStart === '2026-10-31' && queryEnd === '2026-10-31'
                    ? 'bg-[#284F42] text-white border-[#284F42]'
                    : 'bg-[#F4F3EE] text-[#1B382E] border-[#D5CFC2] hover:bg-[#E5E0D5]'
                }`}
              >
                26년 10월 31일 (단일일)
              </button>
              <button
                type="button"
                onClick={() => applyPresetRange('2025-04-25', '2025-08-22')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                  queryStart === '2025-04-25' && queryEnd === '2025-08-22'
                    ? 'bg-[#284F42] text-white border-[#284F42]'
                    : 'bg-[#F4F3EE] text-[#1B382E] border-[#D5CFC2] hover:bg-[#E5E0D5]'
                }`}
              >
                25년 실측 구간 (25.04.25~08.22)
              </button>
              <button
                type="button"
                onClick={() => applyPresetRange('2025-08-01', '2025-08-22')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                  queryStart === '2025-08-01' && queryEnd === '2025-08-22'
                    ? 'bg-[#284F42] text-white border-[#284F42]'
                    : 'bg-[#F4F3EE] text-[#1B382E] border-[#D5CFC2] hover:bg-[#E5E0D5]'
                }`}
              >
                25년 8월 성수기 (08.01~08.22)
              </button>
            </div>
          </div>

          {/* API 요일 필터 (dayOfWeek 파라미터 직결) */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-[#1B382E] flex items-center gap-1 mr-1">
              <Filter size={13} className="text-[#B59269]" />
              요일 필터(복수선택 가능):
            </span>
            {API_DAY_FILTER_OPTIONS.map((opt) => {
              const activeParts = selectedDayOfWeekParam.split(',');
              const isSelected =
                selectedDayOfWeekParam === opt.code ||
                (opt.code !== 'ALL' &&
                  opt.code !== 'WEEKDAY' &&
                  opt.code !== 'WEEKEND' &&
                  activeParts.includes(opt.code));
              return (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => handleToggleDayParam(opt.code)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-[#B59269] text-white border-[#B59269] shadow-xs'
                      : 'bg-white text-[#5A6B63] border-[#D5CFC2] hover:bg-[#F4F3EE]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 메타 상태 표시줄 & 뷰 전환 탭 */}
        <div className="pt-3 border-t border-[#EFECE6] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-[#284F42]/10 text-[#1B382E] font-bold">
              조회구간: {fmtText(data?.startDate || queryStart)} ~ {fmtText(data?.endDate || queryEnd)}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-[#B59269]/15 text-[#8C6D46] font-bold">
              요일 조건: {fmtText(data?.dayOfWeekFilter || selectedDayOfWeekParam)}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold">
              실측 집계일수: {fmtNum(data?.dayCount, '일')}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 font-bold">
              나들이 차량당 환산 승수: ×{fmtNum(data?.visitorMultiplier, '명')}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-[#F4F3EE] p-1 rounded-xl border border-[#E5E0D5]">
            <button
              type="button"
              onClick={() => setActiveViewTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeViewTab === 'ALL' ? 'bg-[#284F42] text-white shadow-xs' : 'text-[#5A6B63] hover:text-[#1B382E]'
              }`}
            >
              통합 비교 뷰
            </button>
            <button
              type="button"
              onClick={() => setActiveViewTab('STAY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeViewTab === 'STAY' ? 'bg-[#284F42] text-white shadow-xs' : 'text-[#5A6B63] hover:text-[#1B382E]'
              }`}
            >
              ① 숙박(골프제외) 입출차·외출
            </button>
            <button
              type="button"
              onClick={() => setActiveViewTab('WALKIN')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeViewTab === 'WALKIN' ? 'bg-[#284F42] text-white shadow-xs' : 'text-[#5A6B63] hover:text-[#1B382E]'
              }`}
            >
              ② 나들이(단체제외) 입출차·체류
            </button>
            <button
              type="button"
              onClick={() => setActiveViewTab('DAILY_LOG')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeViewTab === 'DAILY_LOG' ? 'bg-[#284F42] text-white shadow-xs' : 'text-[#5A6B63] hover:text-[#1B382E]'
              }`}
            >
              ③ 요일별·일별 상세 표
            </button>
          </div>
        </div>
      </div>

      {/* 로딩 및 에러 / Fail-Loudly 데이터 미수신 안내 */}
      {loading && (
        <div className="bg-white rounded-2xl p-12 border border-[#E5E0D5] flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-4 border-[#284F42] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-[#5A6B63]">
            숙박(골프제외) 입출차·외출재입차 및 나들이(단체제외) 시간대 데이터를 조회 중입니다...
          </p>
        </div>
      )}

      {!loading && apiError && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-rose-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="shrink-0 text-rose-600" size={22} />
            <div>
              <p className="font-bold text-sm">API 조회 오류 (Fail-Loudly)</p>
              <p className="text-xs mt-0.5">{apiError}</p>
            </div>
          </div>
        </div>
      )}

      {!loading && !apiError && !hasData && (
        <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-6 text-amber-950 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="shrink-0 text-amber-600 mt-0.5" size={22} />
            <div>
              <h3 className="font-black text-sm sm:text-base">
                선택하신 기간({queryStart} ~ {queryEnd})에는 입출차 시간대 원천 로그가 적재되지 않았습니다 (`hasTimeAnalyticsData: false` ➔ `-` 표출)
              </h3>
              <p className="text-xs text-amber-800 mt-1">
                프론트엔드는 임의의 0 배열을 합성하지 않고 데이터 미수신(`-`) 상태를 그대로 표출합니다. 우측 버튼을 클릭하면 차량 입출차 시각 로그가 적재된 실측 구간을 즉시 확인하실 수 있습니다.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => applyPresetRange('2025-08-01', '2025-08-22')}
              className="px-4 py-2.5 rounded-xl bg-[#284F42] text-white text-xs font-bold hover:bg-[#1B382E] transition-colors cursor-pointer shadow-sm"
            >
              2025년 8월 실측 구간 바로 조회 (08.01~08.22)
            </button>
            <button
              type="button"
              onClick={() => applyPresetRange('2025-04-25', '2025-08-22')}
              className="px-4 py-2.5 rounded-xl bg-[#B59269] text-white text-xs font-bold hover:bg-[#9E7542] transition-colors cursor-pointer shadow-sm"
            >
              전체 실측 구간 조회 (25.04.25~08.22, 97일)
            </button>
          </div>
        </div>
      )}

      {/* ============================================================================
          SECTION 1: 숙박고객 차량 (골프고객 제외) 도착·출차 및 마지막 출차 전 외출·재입차 분석
         ============================================================================ */}
      {!loading && (activeViewTab === 'ALL' || activeViewTab === 'STAY') && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E0D5] shadow-xs space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#EFECE6] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-[#284F42] text-white text-xs font-black">기능 1</span>
                <h2 className="text-lg sm:text-xl font-black text-[#1B382E] flex items-center gap-2">
                  <Hotel size={20} className="text-[#284F42]" />
                  {activeStayCohort?.cohortLabel || '숙박고객 차량 (골프고객 제외)'} — 도착·출차 시각 & 외출·재입차 분석
                </h2>
              </div>
              <p className="text-xs text-[#5A6B63] mt-1">
                숙박 차량 중 골프 라운딩 내장객을 제외한 순수 투숙 차량의 벨포레 최초 도착 시각, 최종 퇴실 출차 시각, 그리고 최종 출차 전 리조트 외부로 나갔다 다시 들어온(외출·재입차) 차량 통계입니다.
              </p>
            </div>

            {/* 요일별 분리 스코프 선택기 (periodSummary vs byDayType vs byDayOfWeek 1:1 바인딩) */}
            <div className="flex flex-wrap items-center gap-1 bg-[#F4F3EE] p-1.5 rounded-xl border border-[#E5E0D5]">
              {DAY_SCOPE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setSelectedStayDayScope(opt.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedStayDayScope === opt.key
                      ? 'bg-[#284F42] text-white shadow-xs'
                      : opt.isWeekend
                        ? 'text-rose-700 hover:bg-white'
                        : 'text-[#5A6B63] hover:bg-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 1-A. 숙박(골프제외) 도착/출차 및 외출·재입차 핵심 KPI 카드 6종 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
            {/* 카드 1: 숙박(골프제외) 총 차량 */}
            <div className="rounded-xl p-4 bg-[#FAF9F6] border border-[#E5E0D5]">
              <div className="flex items-center justify-between text-xs font-bold text-[#5A6B63]">
                <span>총 숙박 차량 (골프제외)</span>
                <Car size={15} className="text-[#284F42]" />
              </div>
              <div className="text-2xl font-black text-[#1B382E] mt-2">
                {fmtNum(activeStayCohort?.totalCars, '대')}
              </div>
              <div className="text-[11px] text-[#5A6B63] mt-1.5 space-y-0.5">
                <div>일평균 차량: <strong className="text-[#1B382E]">{fmtNum(activeStayCohort?.dailyAvgCars, '대')}</strong> ({fmtNum(activeStayCohort?.dayCount, '일')})</div>
                <div>출차집계 완료: <strong className="text-[#1B382E]">{fmtNum(activeStayCohort?.withExitCars, '대')}</strong></div>
              </div>
            </div>

            {/* 카드 2: 평균 벨포레 도착 시각 & 피크 시간대 */}
            <div className="rounded-xl p-4 bg-[#FAF9F6] border border-[#E5E0D5]">
              <div className="flex items-center justify-between text-xs font-bold text-[#5A6B63]">
                <span>평균 벨포레 도착 시각</span>
                <Clock size={15} className="text-[#284F42]" />
              </div>
              <div className="text-2xl font-black text-[#284F42] mt-2">
                {fmtText(activeStayCohort?.avgEntryTime)}
              </div>
              <div className="text-[11px] text-[#5A6B63] mt-1.5 space-y-0.5">
                <div>피크 도착 시간대: <strong className="text-[#1B382E]">{fmtText(activeStayCohort?.peakEntryHourLabel)}</strong></div>
                <div>피크 시간 입차: <strong className="text-[#1B382E]">{fmtNum(activeStayCohort?.peakEntryCars, '대')}</strong></div>
              </div>
            </div>

            {/* 카드 3: 평균 최종 출차 시각 & 피크 시간대 */}
            <div className="rounded-xl p-4 bg-[#FAF9F6] border border-[#E5E0D5]">
              <div className="flex items-center justify-between text-xs font-bold text-[#5A6B63]">
                <span>평균 최종 출차 시각</span>
                <Clock size={15} className="text-[#B59269]" />
              </div>
              <div className="text-2xl font-black text-[#9E7542] mt-2">
                {fmtText(activeStayCohort?.avgExitTime)}
              </div>
              <div className="text-[11px] text-[#5A6B63] mt-1.5 space-y-0.5">
                <div>피크 출차 시간대: <strong className="text-[#1B382E]">{fmtText(activeStayCohort?.peakExitHourLabel)}</strong></div>
                <div>피크 시간 출차: <strong className="text-[#1B382E]">{fmtNum(activeStayCohort?.peakExitCars, '대')}</strong></div>
              </div>
            </div>

            {/* 카드 4: 평균 체류시간 */}
            <div className="rounded-xl p-4 bg-[#FAF9F6] border border-[#E5E0D5]">
              <div className="flex items-center justify-between text-xs font-bold text-[#5A6B63]">
                <span>평균 리조트 체류시간</span>
                <TrendingUp size={15} className="text-[#284F42]" />
              </div>
              <div className="text-xl font-black text-[#1B382E] mt-2">
                {fmtText(activeStayCohort?.avgDwellFormatted)}
              </div>
              <div className="text-[11px] text-[#5A6B63] mt-1.5 space-y-0.5">
                <div>분 단위 환산: <strong className="text-[#1B382E]">{fmtNum(activeStayCohort?.avgDwellMinutes, '분')}</strong></div>
                <div>무외출 직체류: <strong className="text-[#1B382E]">{fmtNum(activeStayCohort?.reEntrySummary?.directStayCars, '대')} ({fmtPct(activeStayCohort?.reEntrySummary?.directStayRatio)})</strong></div>
              </div>
            </div>

            {/* 카드 5: 마지막 출차 전 외출·재입차 차량 및 비율 */}
            <div className="rounded-xl p-4 bg-rose-50/70 border border-rose-200">
              <div className="flex items-center justify-between text-xs font-bold text-rose-800">
                <span>최종 출차 전 외출·재입차</span>
                <RotateCcw size={15} className="text-rose-600" />
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-rose-700">
                  {fmtNum(activeStayCohort?.reEntrySummary?.reEntryCars, '대')}
                </span>
                <span className="text-sm font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                  {fmtPct(activeStayCohort?.reEntrySummary?.reEntryRatio)}
                </span>
              </div>
              <div className="text-[11px] text-rose-900/80 mt-1.5 space-y-0.5">
                <div>1회 외출: <strong>{fmtNum(activeStayCohort?.reEntrySummary?.reEntryOnceCars, '대')} ({fmtPct(activeStayCohort?.reEntrySummary?.reEntryOnceRatio)})</strong></div>
                <div>2회+ 외출: <strong>{fmtNum(activeStayCohort?.reEntrySummary?.reEntryMultiCars, '대')} ({fmtPct(activeStayCohort?.reEntrySummary?.reEntryMultiRatio)})</strong></div>
              </div>
            </div>

            {/* 카드 6: 외출 소요시간 & 외출/복귀 피크 시간대 */}
            <div className="rounded-xl p-4 bg-sky-50/70 border border-sky-200">
              <div className="flex items-center justify-between text-xs font-bold text-sky-900">
                <span>평균 외출 소요 & 피크 시간</span>
                <ArrowRightLeft size={15} className="text-sky-600" />
              </div>
              <div className="text-xl font-black text-sky-900 mt-2">
                {fmtText(activeStayCohort?.reEntrySummary?.avgOutingFormatted)}
              </div>
              <div className="text-[11px] text-sky-900/80 mt-1.5 space-y-0.5">
                <div>
                  총 외출 건수: <strong>{fmtNum(activeStayCohort?.reEntrySummary?.totalOutingCount, '건')}</strong> (대당 {fmtNum(activeStayCohort?.reEntrySummary?.avgOutingCountPerReEntryCar, '회')})
                </div>
                <div>
                  외출피크 <strong>{fmtText(activeStayCohort?.reEntrySummary?.peakOutingExitHourLabel)}</strong> ({fmtNum(activeStayCohort?.reEntrySummary?.peakOutingExitCount, '건')}) · 복귀피크 <strong>{fmtText(activeStayCohort?.reEntrySummary?.peakOutingReturnHourLabel)}</strong> ({fmtNum(activeStayCohort?.reEntrySummary?.peakOutingReturnCount, '건')})
                </div>
              </div>
            </div>
          </div>

          {/* 1-A-2. 🏨×🚗 객실 숙박객 vs 숙박 차량 비교 & 객실 1개당 평균 차량 (물리 175실 기준 · 판매객실 기준) */}
          <div className="rounded-2xl p-4 sm:p-5 bg-[#F4F3EE]/80 border border-[#D5CFC2] space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#1B382E] text-white text-[11px] font-black">
                  객실 175실 모수 & 투숙객 비교 (SSOT)
                </span>
                <h3 className="text-sm font-black text-[#1B382E]">
                  객실 숙박객 · 판매객실 대비 숙박 차량 비교 및 객실 1개당 평균 차량 대수 (`roomVehicleComparison`)
                </h3>
              </div>
              <span className="text-[11px] font-bold text-[#5A6B63]">
                물리 객실 기준: 일일 {fmtNum(activeStayCohort?.roomVehicleComparison?.physicalRoomCapacityPerDay, '실')} (누적 가용 {fmtNum(activeStayCohort?.roomVehicleComparison?.totalPhysicalRoomCapacity, '실')})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 비교 카드 1: 객실 숙박객 vs 숙박 차량 */}
              <div className="bg-white rounded-xl p-3.5 border border-[#E5E0D5]">
                <div className="text-xs font-bold text-[#5A6B63] flex items-center justify-between">
                  <span>객실 숙박객 vs 숙박 차량</span>
                  <Users size={14} className="text-[#284F42]" />
                </div>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className="text-xl font-black text-[#1B382E]">
                    {fmtNum(
                      activeStayCohort?.roomVehicleComparison?.totalRoomGuests ??
                        (selectedStayDayScope === 'PERIOD_ALL' ? resortVisitors?.roomTotalGuests : null),
                      '명'
                    )}
                  </span>
                  <span className="text-xs font-bold text-[#5A6B63]">vs</span>
                  <span className="text-lg font-black text-[#284F42]">
                    {fmtNum(activeStayCohort?.totalCars, '대')}
                  </span>
                </div>
                <div className="text-[11px] text-[#5A6B63] mt-1 space-y-0.5">
                  <div>
                    골프제외 순수 숙박객: <strong className="text-[#1B382E]">{fmtNum(activeStayCohort?.roomVehicleComparison?.exGolfRoomGuests, '명')}</strong>
                  </div>
                  <div>
                    숙박·골프 중복 차량: <strong className="text-[#1B382E]">{fmtNum(activeStayCohort?.roomVehicleComparison?.golfCondoCrossCars ?? (selectedStayDayScope === 'PERIOD_ALL' ? resortVisitors?.golfCondoCrossCars : null), '대')}</strong> (전체 숙박차량 {fmtNum(activeStayCohort?.roomVehicleComparison?.totalStayCarsIncGolf, '대')})
                  </div>
                </div>
              </div>

              {/* 비교 카드 2: 전체 물리 객실(175실) 기준 객실 1개당 평균 차량 */}
              <div className="bg-white rounded-xl p-3.5 border-2 border-[#284F42]/30">
                <div className="text-xs font-bold text-[#284F42] flex items-center justify-between">
                  <span>객실 1개당 평균 차량 (175실 기준)</span>
                  <Hotel size={14} className="text-[#284F42]" />
                </div>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className="text-2xl font-black text-[#284F42]">
                    {fmtNum(activeStayCohort?.roomVehicleComparison?.avgCarsPerPhysicalRoom, '대/실')}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#284F42]/10 text-[#1B382E]">
                    골프제외 차량
                  </span>
                </div>
                <div className="text-[11px] text-[#5A6B63] mt-1 space-y-0.5">
                  <div>
                    골프포함 전체 숙박차량 기준: <strong className="text-[#1B382E]">{fmtNum(activeStayCohort?.roomVehicleComparison?.avgTotalStayCarsPerPhysicalRoom, '대/실')}</strong>
                  </div>
                  <div>
                    분모 모수 (175실 × 일수): <strong className="text-[#1B382E]">{fmtNum(activeStayCohort?.roomVehicleComparison?.totalPhysicalRoomCapacity, '실')}</strong>
                  </div>
                </div>
              </div>

              {/* 비교 카드 3: 실투숙 판매객실(roomSoldUnits) 기준 객실 1개당 평균 차량 */}
              <div className="bg-white rounded-xl p-3.5 border border-[#E5E0D5]">
                <div className="text-xs font-bold text-[#5A6B63] flex items-center justify-between">
                  <span>판매객실 1개당 평균 차량 (실투숙 기준)</span>
                  <Car size={14} className="text-[#9E7542]" />
                </div>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className="text-2xl font-black text-[#9E7542]">
                    {fmtNum(activeStayCohort?.roomVehicleComparison?.avgCarsPerSoldRoom, '대/실')}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#B59269]/15 text-[#8C6D46]">
                    골프제외 차량
                  </span>
                </div>
                <div className="text-[11px] text-[#5A6B63] mt-1 space-y-0.5">
                  <div>
                    골프포함 전체 숙박차량 기준: <strong className="text-[#1B382E]">{fmtNum(activeStayCohort?.roomVehicleComparison?.avgTotalStayCarsPerSoldRoom, '대/실')}</strong>
                  </div>
                  <div>
                    실투숙 판매객실 수: <strong className="text-[#1B382E]">{fmtNum(activeStayCohort?.roomVehicleComparison?.soldRoomCount ?? (selectedStayDayScope === 'PERIOD_ALL' ? resortVisitors?.roomSoldUnits : null), '실')}</strong>
                  </div>
                </div>
              </div>

              {/* 비교 카드 4: 숙박 차량 1대당 평균 탑승 투숙객 수 & 판매객실당 평균 인원 */}
              <div className="bg-white rounded-xl p-3.5 border border-[#E5E0D5]">
                <div className="text-xs font-bold text-[#5A6B63] flex items-center justify-between">
                  <span>숙박 차량 1대당 평균 투숙객</span>
                  <TrendingUp size={14} className="text-[#284F42]" />
                </div>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className="text-2xl font-black text-[#1B382E]">
                    {fmtNum(activeStayCohort?.roomVehicleComparison?.avgGuestsPerStayCar, '명/대')}
                  </span>
                  <span className="text-[11px] font-bold text-[#5A6B63]">
                    (전체 {fmtNum(activeStayCohort?.roomVehicleComparison?.avgTotalGuestsPerTotalStayCar, '명/대')})
                  </span>
                </div>
                <div className="text-[11px] text-[#5A6B63] mt-1 space-y-0.5">
                  <div>
                    판매객실 1실당 투숙객: <strong className="text-[#1B382E]">{fmtNum(activeStayCohort?.roomVehicleComparison?.avgGuestsPerSoldRoom, '명/실')}</strong> (골프제외 {fmtNum(activeStayCohort?.roomVehicleComparison?.exGolfAvgGuestsPerSoldRoom, '명/실')})
                  </div>
                  <div>
                    175실 기준 객실 가동률: <strong className="text-[#1B382E]">{fmtPct(activeStayCohort?.roomVehicleComparison?.physicalRoomOccRate)}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 1-B. 숙박(골프제외) 시간대별(0~23시) 입출차 및 외출/복귀 차트 + 요일별 비교 차트 */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            <div className="xl:col-span-7 bg-[#FAF9F6] rounded-xl p-4 border border-[#E5E0D5]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-sm font-black text-[#1B382E]">
                    시간대별(00시~23시) 도착·최종출차 및 외출·재입차 분포 ({DAY_SCOPE_OPTIONS.find((o) => o.key === selectedStayDayScope)?.label})
                  </h3>
                  <p className="text-[11px] text-[#5A6B63]">
                    막대: 최초 입차(`entryCars`) · 최종 출차(`exitCars`) / 점선·실선: 체류 중 외출 출차(`outingExitCount`) · 외출 복귀(`outingReturnCount`)
                  </p>
                </div>
              </div>
              {activeStayCohort && activeStayCohort.hourlyDistribution?.length > 0 ? (
                <ReactECharts option={stayHourlyChartOption} style={{ height: '320px' }} notMerge={true} />
              ) : (
                <div className="h-[320px] flex items-center justify-center text-sm font-bold text-[#6C7A73]">
                  시간대별 분포 데이터 없음 (`-`)
                </div>
              )}
            </div>

            <div className="xl:col-span-5 bg-[#FAF9F6] rounded-xl p-4 border border-[#E5E0D5]">
              <div className="mb-3">
                <h3 className="text-sm font-black text-[#1B382E]">
                  요일별(월~일) 숙박 차량 대수 및 외출·재입차 비율 비교 (`byDayOfWeek`)
                </h3>
                <p className="text-[11px] text-[#5A6B63]">
                  요일별 총 숙박 차량(`totalCars`), 외출 후 재입차 차량(`reEntryCars`), 외출 비율(`reEntryRatio`) 1:1 비교
                </p>
              </div>
              {byDayOfWeekList.some((d) => d.hasData) ? (
                <ReactECharts option={stayDayOfWeekChartOption} style={{ height: '320px' }} notMerge={true} />
              ) : (
                <div className="h-[320px] flex items-center justify-center text-sm font-bold text-[#6C7A73]">
                  요일별 분포 데이터 없음 (`-`)
                </div>
              )}
            </div>
          </div>

          {/* 1-C. 숙박(골프제외) 요일별(월~일 & 평일/주말) 분리 비교 테이블 */}
          <div className="space-y-2">
            <h3 className="text-sm font-black text-[#1B382E] flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[#284F42]" />
              숙박고객(골프제외) 요일별 · 평일/주말 입출차 시각 및 외출·재입차 분리 요약표
            </h3>
            <div className="overflow-x-auto rounded-xl border border-[#E5E0D5]">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-[#284F42] text-white font-bold">
                    <th className="py-2.5 px-3">구분 (요일)</th>
                    <th className="py-2.5 px-3 text-right">집계일수</th>
                    <th className="py-2.5 px-3 text-right">객실 투숙객</th>
                    <th className="py-2.5 px-3 text-right">총 숙박차량</th>
                    <th className="py-2.5 px-3 text-right">일평균 차량</th>
                    <th className="py-2.5 px-3 text-right bg-[#1B382E]">175실당 차량</th>
                    <th className="py-2.5 px-3 text-right bg-[#1B382E]">판매객실당 차량</th>
                    <th className="py-2.5 px-3 text-center">평균 도착시각</th>
                    <th className="py-2.5 px-3 text-center">피크 도착시간대</th>
                    <th className="py-2.5 px-3 text-center">평균 출차시각</th>
                    <th className="py-2.5 px-3 text-center">피크 출차시간대</th>
                    <th className="py-2.5 px-3 text-center">평균 체류시간</th>
                    <th className="py-2.5 px-3 text-right bg-rose-900/40">외출·재입차 차량</th>
                    <th className="py-2.5 px-3 text-right bg-rose-900/40">외출 비율(%)</th>
                    <th className="py-2.5 px-3 text-right bg-rose-900/40">1회 / 2회+ 외출</th>
                    <th className="py-2.5 px-3 text-center bg-rose-900/40">평균 외출시간</th>
                    <th className="py-2.5 px-3 text-center bg-rose-900/40">외출피크 → 복귀피크</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFECE6] bg-white">
                  {/* 평일 / 주말 요약 행 */}
                  {[
                    { key: 'WEEKDAY', label: '평일 합계 (월~금)', item: data?.byDayType?.weekday, highlight: 'bg-slate-50 font-bold' },
                    { key: 'WEEKEND', label: '주말 합계 (토~일)', item: data?.byDayType?.weekend, highlight: 'bg-amber-50/60 font-bold' },
                  ].map((row) => {
                    const s = row.item?.stayNonGolf;
                    const re = s?.reEntrySummary;
                    const rvc = s?.roomVehicleComparison;
                    return (
                      <tr
                        key={row.key}
                        onClick={() => setSelectedStayDayScope(row.key as DayScopeKey)}
                        className={`${row.highlight} hover:bg-[#F4F3EE] cursor-pointer transition-colors`}
                      >
                        <td className="py-2.5 px-3 font-black text-[#1B382E]">{row.label}</td>
                        <td className="py-2.5 px-3 text-right">{fmtNum(row.item?.dayCount, '일')}</td>
                        <td className="py-2.5 px-3 text-right font-bold">{fmtNum(rvc?.totalRoomGuests, '명')}</td>
                        <td className="py-2.5 px-3 text-right font-black">{fmtNum(s?.totalCars, '대')}</td>
                        <td className="py-2.5 px-3 text-right">{fmtNum(s?.dailyAvgCars, '대')}</td>
                        <td className="py-2.5 px-3 text-right font-black text-[#284F42]">{fmtNum(rvc?.avgCarsPerPhysicalRoom, '대/실')}</td>
                        <td className="py-2.5 px-3 text-right font-black text-[#9E7542]">{fmtNum(rvc?.avgCarsPerSoldRoom, '대/실')}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-[#284F42]">{fmtText(s?.avgEntryTime)}</td>
                        <td className="py-2.5 px-3 text-center">
                          {fmtText(s?.peakEntryHourLabel)} ({fmtNum(s?.peakEntryCars, '대')})
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-[#9E7542]">{fmtText(s?.avgExitTime)}</td>
                        <td className="py-2.5 px-3 text-center">
                          {fmtText(s?.peakExitHourLabel)} ({fmtNum(s?.peakExitCars, '대')})
                        </td>
                        <td className="py-2.5 px-3 text-center">{fmtText(s?.avgDwellFormatted)}</td>
                        <td className="py-2.5 px-3 text-right font-black text-rose-700">{fmtNum(re?.reEntryCars, '대')}</td>
                        <td className="py-2.5 px-3 text-right font-black text-rose-700">{fmtPct(re?.reEntryRatio)}</td>
                        <td className="py-2.5 px-3 text-right">
                          {fmtNum(re?.reEntryOnceCars, '대')} / {fmtNum(re?.reEntryMultiCars, '대')}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-sky-800">{fmtText(re?.avgOutingFormatted)}</td>
                        <td className="py-2.5 px-3 text-center text-[11px]">
                          {fmtText(re?.peakOutingExitHourLabel)} → {fmtText(re?.peakOutingReturnHourLabel)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* 월~일 7개 요일 행 */}
                  {byDayOfWeekList.map((day) => {
                    const s = day.stayNonGolf;
                    const re = s?.reEntrySummary;
                    const rvc = s?.roomVehicleComparison;
                    const isSelected = selectedStayDayScope === day.dayCode;
                    return (
                      <tr
                        key={day.dayCode}
                        onClick={() => setSelectedStayDayScope(day.dayCode as DayScopeKey)}
                        className={`hover:bg-[#F4F3EE] cursor-pointer transition-colors ${
                          isSelected ? 'bg-[#284F42]/10 font-bold' : ''
                        }`}
                      >
                        <td className={`py-2 px-3 font-bold ${day.isWeekend ? 'text-rose-600' : 'text-[#1B382E]'}`}>
                          {day.dayLabel}
                        </td>
                        <td className="py-2 px-3 text-right">{fmtNum(day.dayCount, '일')}</td>
                        <td className="py-2 px-3 text-right font-semibold">{fmtNum(rvc?.totalRoomGuests, '명')}</td>
                        <td className="py-2 px-3 text-right font-bold">{fmtNum(s?.totalCars, '대')}</td>
                        <td className="py-2 px-3 text-right">{fmtNum(s?.dailyAvgCars, '대')}</td>
                        <td className="py-2 px-3 text-right font-bold text-[#284F42]">{fmtNum(rvc?.avgCarsPerPhysicalRoom, '대/실')}</td>
                        <td className="py-2 px-3 text-right font-bold text-[#9E7542]">{fmtNum(rvc?.avgCarsPerSoldRoom, '대/실')}</td>
                        <td className="py-2 px-3 text-center font-bold text-[#284F42]">{fmtText(s?.avgEntryTime)}</td>
                        <td className="py-2 px-3 text-center">
                          {fmtText(s?.peakEntryHourLabel)} ({fmtNum(s?.peakEntryCars, '대')})
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-[#9E7542]">{fmtText(s?.avgExitTime)}</td>
                        <td className="py-2 px-3 text-center">
                          {fmtText(s?.peakExitHourLabel)} ({fmtNum(s?.peakExitCars, '대')})
                        </td>
                        <td className="py-2 px-3 text-center">{fmtText(s?.avgDwellFormatted)}</td>
                        <td className="py-2 px-3 text-right font-bold text-rose-700">{fmtNum(re?.reEntryCars, '대')}</td>
                        <td className="py-2 px-3 text-right font-bold text-rose-700">{fmtPct(re?.reEntryRatio)}</td>
                        <td className="py-2 px-3 text-right">
                          {fmtNum(re?.reEntryOnceCars, '대')} / {fmtNum(re?.reEntryMultiCars, '대')}
                        </td>
                        <td className="py-2 px-3 text-center text-sky-800 font-semibold">{fmtText(re?.avgOutingFormatted)}</td>
                        <td className="py-2 px-3 text-center text-[11px]">
                          {fmtText(re?.peakOutingExitHourLabel)} → {fmtText(re?.peakOutingReturnHourLabel)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================
          SECTION 2: 순수 나들이고객 차량 (단체/세미나 제외) 입차·출차 시간 및 체류시간 분석
         ============================================================================ */}
      {!loading && (activeViewTab === 'ALL' || activeViewTab === 'WALKIN') && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E0D5] shadow-xs space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#EFECE6] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-teal-700 text-white text-xs font-black">기능 2</span>
                <h2 className="text-lg sm:text-xl font-black text-[#1B382E] flex items-center gap-2">
                  <Users size={20} className="text-teal-700" />
                  {activeWalkInCohort?.cohortLabel || '순수 나들이고객 차량 (단체/세미나 제외)'} — 입차·출차 시각 & 체류시간 분석
                </h2>
              </div>
              <p className="text-xs text-[#5A6B63] mt-1">
                숙박·골프·임직원·업무 차량 및 단체/세미나 차량을 제외한 순수 당일 나들이(워크인) 차량의 입차 시각, 출차 시각, 체류시간 구간별 분포를 기간·요일별로 분석합니다.
              </p>
            </div>

            {/* 요일별 분리 스코프 선택기 */}
            <div className="flex flex-wrap items-center gap-1 bg-[#F4F3EE] p-1.5 rounded-xl border border-[#E5E0D5]">
              {DAY_SCOPE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setSelectedWalkInDayScope(opt.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedWalkInDayScope === opt.key
                      ? 'bg-teal-700 text-white shadow-xs'
                      : opt.isWeekend
                        ? 'text-rose-700 hover:bg-white'
                        : 'text-[#5A6B63] hover:bg-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2-A. 순수 나들이(단체제외) 핵심 KPI 카드 5종 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* 카드 1: 총 나들이 차량 */}
            <div className="rounded-xl p-4 bg-[#FAF9F6] border border-[#E5E0D5]">
              <div className="flex items-center justify-between text-xs font-bold text-[#5A6B63]">
                <span>순수 나들이 차량 (단체제외)</span>
                <Car size={15} className="text-teal-700" />
              </div>
              <div className="text-2xl font-black text-[#1B382E] mt-2">
                {fmtNum(activeWalkInCohort?.totalCars, '대')}
              </div>
              <div className="text-[11px] text-[#5A6B63] mt-1.5 space-y-0.5">
                <div>일평균 차량: <strong className="text-[#1B382E]">{fmtNum(activeWalkInCohort?.dailyAvgCars, '대')}</strong> ({fmtNum(activeWalkInCohort?.dayCount, '일')})</div>
                <div>출차집계 완료: <strong className="text-[#1B382E]">{fmtNum(activeWalkInCohort?.withExitCars, '대')}</strong></div>
              </div>
            </div>

            {/* 카드 2: 환산 방문객 수 */}
            <div className="rounded-xl p-4 bg-teal-50/70 border border-teal-200">
              <div className="flex items-center justify-between text-xs font-bold text-teal-900">
                <span>순수 나들이 환산 방문객</span>
                <Users size={15} className="text-teal-700" />
              </div>
              <div className="text-2xl font-black text-teal-800 mt-2">
                {fmtNum(activeWalkInCohort?.totalVisitors, '명')}
              </div>
              <div className="text-[11px] text-teal-900/80 mt-1.5 space-y-0.5">
                <div>일평균 방문객: <strong>{fmtNum(activeWalkInCohort?.dailyAvgVisitors, '명')}</strong></div>
                <div>차량당 환산 기준: <strong>×{fmtNum(activeWalkInCohort?.visitorMultiplier, '명')} 완제품</strong></div>
              </div>
            </div>

            {/* 카드 3: 평균 입차 시각 & 피크 입차 시간대 */}
            <div className="rounded-xl p-4 bg-[#FAF9F6] border border-[#E5E0D5]">
              <div className="flex items-center justify-between text-xs font-bold text-[#5A6B63]">
                <span>평균 입차 시각</span>
                <Clock size={15} className="text-teal-700" />
              </div>
              <div className="text-2xl font-black text-teal-800 mt-2">
                {fmtText(activeWalkInCohort?.avgEntryTime)}
              </div>
              <div className="text-[11px] text-[#5A6B63] mt-1.5 space-y-0.5">
                <div>피크 입차 시간대: <strong className="text-[#1B382E]">{fmtText(activeWalkInCohort?.peakEntryHourLabel)}</strong></div>
                <div>피크 입차량: <strong className="text-[#1B382E]">{fmtNum(activeWalkInCohort?.peakEntryCars, '대')} ({fmtNum(activeWalkInCohort?.peakEntryVisitors, '명')})</strong></div>
              </div>
            </div>

            {/* 카드 4: 평균 출차 시각 & 피크 출차 시간대 */}
            <div className="rounded-xl p-4 bg-[#FAF9F6] border border-[#E5E0D5]">
              <div className="flex items-center justify-between text-xs font-bold text-[#5A6B63]">
                <span>평균 출차 시각</span>
                <Clock size={15} className="text-amber-600" />
              </div>
              <div className="text-2xl font-black text-amber-700 mt-2">
                {fmtText(activeWalkInCohort?.avgExitTime)}
              </div>
              <div className="text-[11px] text-[#5A6B63] mt-1.5 space-y-0.5">
                <div>피크 출차 시간대: <strong className="text-[#1B382E]">{fmtText(activeWalkInCohort?.peakExitHourLabel)}</strong></div>
                <div>피크 출차량: <strong className="text-[#1B382E]">{fmtNum(activeWalkInCohort?.peakExitCars, '대')} ({fmtNum(activeWalkInCohort?.peakExitVisitors, '명')})</strong></div>
              </div>
            </div>

            {/* 카드 5: 평균 체류시간 */}
            <div className="rounded-xl p-4 bg-[#FAF9F6] border border-[#E5E0D5]">
              <div className="flex items-center justify-between text-xs font-bold text-[#5A6B63]">
                <span>평균 나들이 체류시간</span>
                <TrendingUp size={15} className="text-teal-700" />
              </div>
              <div className="text-xl font-black text-[#1B382E] mt-2">
                {fmtText(activeWalkInCohort?.avgDwellFormatted)}
              </div>
              <div className="text-[11px] text-[#5A6B63] mt-1.5 space-y-0.5">
                <div>분 단위 환산: <strong className="text-[#1B382E]">{fmtNum(activeWalkInCohort?.avgDwellMinutes, '분')}</strong></div>
                <div>입차~출차 평균: <strong className="text-[#1B382E]">{fmtText(activeWalkInCohort?.avgEntryTime)} → {fmtText(activeWalkInCohort?.avgExitTime)}</strong></div>
              </div>
            </div>
          </div>

          {/* 2-B. 나들이 체류시간 구간 분포 (dwellDistribution) */}
          <div className="bg-[#FAF9F6] rounded-xl p-4 border border-[#E5E0D5] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-[#1B382E]">
                  나들이(단체제외) 체류시간 구간별 차량 및 방문객 분포 (`dwellDistribution`)
                </h3>
                <p className="text-[11px] text-[#5A6B63]">
                  백엔드 사전 집계 체류시간 버킷별 차량 대수(`cars`), 환산 방문객(`visitors`), 비중(`ratio`) 1:1 바인딩
                </p>
              </div>
            </div>
            {activeWalkInCohort?.dwellDistribution && activeWalkInCohort.dwellDistribution.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {activeWalkInCohort.dwellDistribution.map((b) => (
                  <div key={b.bucketCode} className="bg-white rounded-xl p-3.5 border border-[#E5E0D5] shadow-2xs">
                    <div className="text-xs font-bold text-[#5A6B63] truncate" title={b.bucketLabel}>
                      {b.bucketLabel}
                    </div>
                    <div className="flex items-baseline justify-between mt-1.5">
                      <span className="text-lg font-black text-[#1B382E]">{fmtNum(b.cars, '대')}</span>
                      <span className="text-xs font-black px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                        {fmtPct(b.ratio)}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#5A6B63] mt-1">
                      환산 방문객: <strong className="text-teal-800">{fmtNum(b.visitors, '명')}</strong>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full bg-teal-600 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(0, Number(b.ratio || 0)))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs font-bold text-[#6C7A73]">
                체류시간 구간 분포 데이터 없음 (`-`)
              </div>
            )}
          </div>

          {/* 2-C. 나들이(단체제외) 시간대별(0~23시) 입출차 차트 + 요일별 비교 차트 */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            <div className="xl:col-span-7 bg-[#FAF9F6] rounded-xl p-4 border border-[#E5E0D5]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-sm font-black text-[#1B382E]">
                    시간대별(00시~23시) 순수 나들이 입차·출차 분포 ({DAY_SCOPE_OPTIONS.find((o) => o.key === selectedWalkInDayScope)?.label})
                  </h3>
                  <p className="text-[11px] text-[#5A6B63]">
                    00시~23시 시간대별 나들이 입차(`entryCars`/`entryVisitors`) 및 출차(`exitCars`/`exitVisitors`) 완제품 분포
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-[#D5CFC2]">
                  <button
                    type="button"
                    onClick={() => setWalkInMetricMode('CARS')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer ${
                      walkInMetricMode === 'CARS' ? 'bg-teal-700 text-white' : 'text-[#5A6B63]'
                    }`}
                  >
                    차량 대수(대)
                  </button>
                  <button
                    type="button"
                    onClick={() => setWalkInMetricMode('VISITORS')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer ${
                      walkInMetricMode === 'VISITORS' ? 'bg-teal-700 text-white' : 'text-[#5A6B63]'
                    }`}
                  >
                    방문객 수(명)
                  </button>
                </div>
              </div>
              {activeWalkInCohort && activeWalkInCohort.hourlyDistribution?.length > 0 ? (
                <ReactECharts option={walkInHourlyChartOption} style={{ height: '320px' }} notMerge={true} />
              ) : (
                <div className="h-[320px] flex items-center justify-center text-sm font-bold text-[#6C7A73]">
                  시간대별 입출차 데이터 없음 (`-`)
                </div>
              )}
            </div>

            <div className="xl:col-span-5 bg-[#FAF9F6] rounded-xl p-4 border border-[#E5E0D5]">
              <div className="mb-3">
                <h3 className="text-sm font-black text-[#1B382E]">
                  요일별(월~일) 순수 나들이 차량 & 방문객 비교 (`byDayOfWeek`)
                </h3>
                <p className="text-[11px] text-[#5A6B63]">
                  요일별 나들이 총 차량(`totalCars`), 환산 방문객(`totalVisitors`), 일평균 차량(`dailyAvgCars`) 1:1 비교
                </p>
              </div>
              {byDayOfWeekList.some((d) => d.hasData) ? (
                <ReactECharts option={walkInDayOfWeekChartOption} style={{ height: '320px' }} notMerge={true} />
              ) : (
                <div className="h-[320px] flex items-center justify-center text-sm font-bold text-[#6C7A73]">
                  요일별 분포 데이터 없음 (`-`)
                </div>
              )}
            </div>
          </div>

          {/* 2-D. 순수 나들이(단체제외) 요일별(월~일 & 평일/주말) 분리 비교 테이블 */}
          <div className="space-y-2">
            <h3 className="text-sm font-black text-[#1B382E] flex items-center gap-2">
              <CheckCircle2 size={16} className="text-teal-700" />
              순수 나들이고객(단체/세미나 제외) 요일별 · 평일/주말 입출차 시각 및 체류시간 분리 요약표
            </h3>
            <div className="overflow-x-auto rounded-xl border border-[#E5E0D5]">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-teal-800 text-white font-bold">
                    <th className="py-2.5 px-3">구분 (요일)</th>
                    <th className="py-2.5 px-3 text-right">집계일수</th>
                    <th className="py-2.5 px-3 text-right">총 나들이 차량</th>
                    <th className="py-2.5 px-3 text-right">환산 방문객 수</th>
                    <th className="py-2.5 px-3 text-right">일평균 차량</th>
                    <th className="py-2.5 px-3 text-right">일평균 방문객</th>
                    <th className="py-2.5 px-3 text-center">평균 입차시각</th>
                    <th className="py-2.5 px-3 text-center">피크 입차시간대 (차량/방문객)</th>
                    <th className="py-2.5 px-3 text-center">평균 출차시각</th>
                    <th className="py-2.5 px-3 text-center">피크 출차시간대 (차량/방문객)</th>
                    <th className="py-2.5 px-3 text-center">평균 체류시간</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFECE6] bg-white">
                  {[
                    { key: 'WEEKDAY', label: '평일 합계 (월~금)', item: data?.byDayType?.weekday, highlight: 'bg-slate-50 font-bold' },
                    { key: 'WEEKEND', label: '주말 합계 (토~일)', item: data?.byDayType?.weekend, highlight: 'bg-amber-50/60 font-bold' },
                  ].map((row) => {
                    const w = row.item?.walkInNonGroup;
                    return (
                      <tr
                        key={row.key}
                        onClick={() => setSelectedWalkInDayScope(row.key as DayScopeKey)}
                        className={`${row.highlight} hover:bg-[#F4F3EE] cursor-pointer transition-colors`}
                      >
                        <td className="py-2.5 px-3 font-black text-[#1B382E]">{row.label}</td>
                        <td className="py-2.5 px-3 text-right">{fmtNum(row.item?.dayCount, '일')}</td>
                        <td className="py-2.5 px-3 text-right font-black">{fmtNum(w?.totalCars, '대')}</td>
                        <td className="py-2.5 px-3 text-right font-black text-teal-800">{fmtNum(w?.totalVisitors, '명')}</td>
                        <td className="py-2.5 px-3 text-right">{fmtNum(w?.dailyAvgCars, '대')}</td>
                        <td className="py-2.5 px-3 text-right">{fmtNum(w?.dailyAvgVisitors, '명')}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-teal-800">{fmtText(w?.avgEntryTime)}</td>
                        <td className="py-2.5 px-3 text-center">
                          {fmtText(w?.peakEntryHourLabel)} ({fmtNum(w?.peakEntryCars, '대')} / {fmtNum(w?.peakEntryVisitors, '명')})
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-amber-700">{fmtText(w?.avgExitTime)}</td>
                        <td className="py-2.5 px-3 text-center">
                          {fmtText(w?.peakExitHourLabel)} ({fmtNum(w?.peakExitCars, '대')} / {fmtNum(w?.peakExitVisitors, '명')})
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold">{fmtText(w?.avgDwellFormatted)}</td>
                      </tr>
                    );
                  })}

                  {byDayOfWeekList.map((day) => {
                    const w = day.walkInNonGroup;
                    const isSelected = selectedWalkInDayScope === day.dayCode;
                    return (
                      <tr
                        key={day.dayCode}
                        onClick={() => setSelectedWalkInDayScope(day.dayCode as DayScopeKey)}
                        className={`hover:bg-[#F4F3EE] cursor-pointer transition-colors ${
                          isSelected ? 'bg-teal-50 font-bold' : ''
                        }`}
                      >
                        <td className={`py-2 px-3 font-bold ${day.isWeekend ? 'text-rose-600' : 'text-[#1B382E]'}`}>
                          {day.dayLabel}
                        </td>
                        <td className="py-2 px-3 text-right">{fmtNum(day.dayCount, '일')}</td>
                        <td className="py-2 px-3 text-right font-bold">{fmtNum(w?.totalCars, '대')}</td>
                        <td className="py-2 px-3 text-right font-bold text-teal-800">{fmtNum(w?.totalVisitors, '명')}</td>
                        <td className="py-2 px-3 text-right">{fmtNum(w?.dailyAvgCars, '대')}</td>
                        <td className="py-2 px-3 text-right">{fmtNum(w?.dailyAvgVisitors, '명')}</td>
                        <td className="py-2 px-3 text-center font-bold text-teal-800">{fmtText(w?.avgEntryTime)}</td>
                        <td className="py-2 px-3 text-center">
                          {fmtText(w?.peakEntryHourLabel)} ({fmtNum(w?.peakEntryCars, '대')} / {fmtNum(w?.peakEntryVisitors, '명')})
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-amber-700">{fmtText(w?.avgExitTime)}</td>
                        <td className="py-2 px-3 text-center">
                          {fmtText(w?.peakExitHourLabel)} ({fmtNum(w?.peakExitCars, '대')} / {fmtNum(w?.peakExitVisitors, '명')})
                        </td>
                        <td className="py-2 px-3 text-center">{fmtText(w?.avgDwellFormatted)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================
          SECTION 3: 일자별(dailyList) 숙박(골프제외) & 나들이(단체제외) 상세 비교 테이블
         ============================================================================ */}
      {!loading && (activeViewTab === 'ALL' || activeViewTab === 'DAILY_LOG') && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E0D5] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EFECE6] pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#1B382E] flex items-center gap-2">
                <Calendar size={18} className="text-[#284F42]" />
                일자별(`dailyList`) 숙박(골프제외) 입출차·외출 & 나들이(단체제외) 입출차 상세 내역 ({fmtNum(filteredDailyList.length, '일')})
              </h2>
              <p className="text-xs text-[#5A6B63]">
                선택 기간 내 각 일자별 숙박(골프제외) 및 순수 나들이(단체제외) 입출차 시각·외출 재입차 실측 명세입니다.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              {[
                { code: 'ALL', label: '전체' },
                { code: 'WEEKDAY', label: '평일' },
                { code: 'WEEKEND', label: '주말' },
                { code: 'MON', label: '월' },
                { code: 'TUE', label: '화' },
                { code: 'WED', label: '수' },
                { code: 'THU', label: '목' },
                { code: 'FRI', label: '금' },
                { code: 'SAT', label: '토' },
                { code: 'SUN', label: '일' },
              ].map((f) => (
                <button
                  key={f.code}
                  type="button"
                  onClick={() => setDailyTableDayFilter(f.code)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer border ${
                    dailyTableDayFilter === f.code
                      ? 'bg-[#284F42] text-white border-[#284F42]'
                      : 'bg-[#FAF9F6] text-[#5A6B63] border-[#D5CFC2] hover:bg-[#EFECE6]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto max-h-[520px] rounded-xl border border-[#E5E0D5]">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#1B382E] text-white font-bold">
                  <th className="py-2.5 px-3">일자</th>
                  <th className="py-2.5 px-3 text-center">요일</th>
                  <th className="py-2.5 px-3 text-right bg-[#284F42]">숙박(골프제외) 차량</th>
                  <th className="py-2.5 px-3 text-center bg-[#284F42]">숙박 평균 도착 → 출차</th>
                  <th className="py-2.5 px-3 text-right bg-rose-900/60">외출·재입차 차량 (비율)</th>
                  <th className="py-2.5 px-3 text-center bg-rose-900/60">평균 외출시간</th>
                  <th className="py-2.5 px-3 text-right bg-teal-900/70">나들이(단체제외) 차량</th>
                  <th className="py-2.5 px-3 text-right bg-teal-900/70">나들이 방문객</th>
                  <th className="py-2.5 px-3 text-center bg-teal-900/70">나들이 평균 입차 → 출차</th>
                  <th className="py-2.5 px-3 text-center bg-teal-900/70">나들이 평균 체류시간</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFECE6] bg-white">
                {filteredDailyList.length > 0 ? (
                  filteredDailyList.map((item) => {
                    const s = item.stayNonGolf;
                    const re = s?.reEntrySummary;
                    const w = item.walkInNonGroup;
                    return (
                      <tr key={item.date} className="hover:bg-[#FAF9F6]">
                        <td className="py-2 px-3 font-bold text-[#1B382E]">{item.date}</td>
                        <td className={`py-2 px-3 text-center font-bold ${item.isWeekend ? 'text-rose-600' : 'text-[#5A6B63]'}`}>
                          {item.dayLabel}
                        </td>
                        <td className="py-2 px-3 text-right font-bold">{fmtNum(s?.totalCars, '대')}</td>
                        <td className="py-2 px-3 text-center">
                          <span className="font-bold text-[#284F42]">{fmtText(s?.avgEntryTime)}</span>
                          <span className="mx-1 text-slate-400">→</span>
                          <span className="font-bold text-[#9E7542]">{fmtText(s?.avgExitTime)}</span>
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-rose-700">
                          {fmtNum(re?.reEntryCars, '대')} ({fmtPct(re?.reEntryRatio)})
                        </td>
                        <td className="py-2 px-3 text-center text-sky-800 font-semibold">
                          {fmtText(re?.avgOutingFormatted)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-teal-900">{fmtNum(w?.totalCars, '대')}</td>
                        <td className="py-2 px-3 text-right font-bold text-teal-700">{fmtNum(w?.totalVisitors, '명')}</td>
                        <td className="py-2 px-3 text-center">
                          <span className="font-bold text-teal-800">{fmtText(w?.avgEntryTime)}</span>
                          <span className="mx-1 text-slate-400">→</span>
                          <span className="font-bold text-amber-700">{fmtText(w?.avgExitTime)}</span>
                        </td>
                        <td className="py-2 px-3 text-center">{fmtText(w?.avgDwellFormatted)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-xs font-bold text-[#6C7A73]">
                      해당 기간/요일 조건의 일별 상세 데이터가 없습니다 (`-`)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
