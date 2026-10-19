import { useState, useMemo, useEffect, useRef } from 'react';
import { useDate } from '../contexts/DateContext';
import { getPresetDateRange, getLatestClosedDateStr, getLatestClosedMonthStr, getClosedBusinessDate, type DatePresetType } from '../lib/dateUtils';
import { secureFetcher } from '../lib/secureFetcher';
import type { 
  WeatherSalesCorrelationResponse,
  WeatherVenueRankingItem,
  WeatherForecastSimulationResponse
} from '../types/reports-v2';
import { 
  CloudRain, Sun, CloudSnow, TrendingDown, TrendingUp,
  Sparkles, Calendar, RefreshCw,
  HelpCircle, Layers, ArrowUpRight, ArrowDownRight,
  Search, Umbrella, Compass, Activity, Sliders, BarChart3,
  AlertCircle, Info
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import SynergyNav from '../components/dashboard/SynergyNav';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

const parseNum = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/,/g, '').trim();
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
};

const formatCurrency = (val: any) => {
  if (val === null || val === undefined) return '-';
  const num = parseNum(val);
  return new Intl.NumberFormat('ko-KR').format(Math.round(num));
};

const formatRate = (rate: number | undefined | null) => {
  if (rate === undefined || rate === null || isNaN(rate)) return '-';
  const sign = rate > 0 ? '+' : '';
  return `${sign}${rate.toFixed(1)}%`;
};

// 영업장 제외 목록 (room, room other, 기타매출 전면 제외)
const EXCLUDED_VENUES = new Set(['ROOM', 'ROOM OTHER', '기타매출']);

const isExcludedVenue = (name: string | undefined | null): boolean => {
  if (!name) return false;
  const normalized = String(name).trim().replace(/\s+/g, ' ').toUpperCase();
  return EXCLUDED_VENUES.has(normalized);
};

export default function WeatherSalesCorrelation() {
  const { startDate: globalStartDate, endDate: globalEndDate, isRange: globalIsRange, setDateRange } = useDate();

  const defaultLatest = getLatestClosedDateStr();
  const defaultStart = globalStartDate || (defaultLatest.slice(0, 7) + '-01');
  const defaultEnd = globalEndDate || defaultLatest;

  const isInitialMount = useRef<boolean>(true);
  const [autoSwitchedNotice, setAutoSwitchedNotice] = useState<string | null>(null);

  // 최신 기상청 AWS 관측 데이터가 완비된 마감월 SSOT (2026년 9월)
  const LATEST_OBSERVED_START = '2026-09-01';
  const LATEST_OBSERVED_END = '2026-09-30';

  const [isRangeMode, setIsRangeMode] = useState<boolean>(true);
  const [startDate, setStartDate] = useState<string>(defaultStart);
  const [endDate, setEndDate] = useState<string>(defaultEnd);
  
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [dayTypeFilter, setDayTypeFilter] = useState<'TOTAL' | 'WEEKDAY' | 'HOLIDAY'>('TOTAL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'impactRateAsc' | 'impactRateDesc' | 'clearRevenue' | 'deltaRevenue'>('impactRateAsc');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WeatherSalesCorrelationResponse['data'] | null>(null);

  // 기상 시뮬레이션 상태 (Backend SSOT API 연동)
  const [simMonth, setSimMonth] = useState<string>(getLatestClosedMonthStr());
  const [simPrecipitation, setSimPrecipitation] = useState<number>(15);
  const [simSnowfall, setSimSnowfall] = useState<number>(0);
  const [simCategory, setSimCategory] = useState<string>('ALL');
  const [simViewMode, setSimViewMode] = useState<'COMBINED' | 'WEEKDAY' | 'HOLIDAY'>('COMBINED');
  const [simSortBy, setSimSortBy] = useState<'weekdayDelta' | 'holidayDelta' | 'name'>('weekdayDelta');
  const [simSearchQuery, setSimSearchQuery] = useState<string>('');

  const [simLoading, setSimLoading] = useState<boolean>(false);
  const [simError, setSimError] = useState<string | null>(null);
  const [simData, setSimData] = useState<WeatherForecastSimulationResponse['data'] | null>(null);

  const fetchSimulationData = async (month: string, precip: number, snow: number, cat: string) => {
    setSimLoading(true);
    setSimError(null);
    try {
      const url = `${API_BASE}/api/v6/dashboard/weather-forecast-simulation?targetMonth=${month}&precipitation=${precip}&snowfall=${snow}&categoryCode=${cat}`;
      const res = await secureFetcher(url);
      if (res && res.success && res.data) {
        setSimData(res.data);
      } else {
        throw new Error(res?.message || '시뮬레이션 데이터 조회에 실패했습니다.');
      }
    } catch (err: any) {
      console.error('Weather Forecast Simulation API Error:', err);
      setSimError(err?.message || '시뮬레이션 API 호출 중 오류가 발생했습니다.');
    } finally {
      setSimLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSimulationData(simMonth, simPrecipitation, simSnowfall, simCategory);
    }, 200);
    return () => clearTimeout(timer);
  }, [simMonth, simPrecipitation, simSnowfall, simCategory]);

  const handleSwitchToLatestMonth = () => {
    setIsRangeMode(true);
    setStartDate(LATEST_OBSERVED_START);
    setEndDate(LATEST_OBSERVED_END);
    setDateRange(LATEST_OBSERVED_START, LATEST_OBSERVED_END, true);
    setAutoSwitchedNotice(null);
    fetchData(LATEST_OBSERVED_START, LATEST_OBSERVED_END, true);
  };

  const fetchData = async (overrideStart?: string, overrideEnd?: string, overrideIsRange?: boolean) => {
    let sDate = overrideStart || startDate;
    let eDate = overrideEnd !== undefined ? overrideEnd : endDate;
    const rangeActive = overrideIsRange !== undefined ? overrideIsRange : (isRangeMode && !!eDate && sDate !== eDate);

    if (rangeActive && sDate && eDate && sDate > eDate) {
      const temp = sDate;
      sDate = eDate;
      eDate = temp;
      setStartDate(sDate);
      setEndDate(eDate);
    }

    setLoading(true);
    setError(null);

    try {
      const queryDateParams = (rangeActive && eDate)
        ? `startDate=${sDate}&endDate=${eDate}`
        : `startDate=${sDate}&endDate=${sDate}`;

      const res = await secureFetcher(`${API_BASE}/api/v6/dashboard/weather-correlation?${queryDateParams}&categoryCode=ALL`);
      
      if (res && res.success && res.data) {
        const totalDays = res.data.summary?.period?.totalDays;
        const seriesCount = res.data.dailyTimeSeries?.length ?? 0;

        if (isInitialMount.current && (!totalDays || totalDays === 0 || seriesCount === 0)) {
          // 최초 진입 시점에 해당 기간(예: 10월)의 관측 데이터가 아직 집계 대기 중인 경우,
          // 실측 관측 데이터가 완비된 최신 마감월(2026-09-01 ~ 2026-09-30)로 자동 전환하여 빈 화면/0일 글리치 원천 차단
          isInitialMount.current = false;
          setStartDate(LATEST_OBSERVED_START);
          setEndDate(LATEST_OBSERVED_END);
          setIsRangeMode(true);
          setAutoSwitchedNotice('2026년 10월 기상청 관측 데이터 집계 대기로 인해, 최신 관측 완료 기간(2026년 9월) 실적으로 자동 전환되었습니다.');
          fetchData(LATEST_OBSERVED_START, LATEST_OBSERVED_END, true);
          return;
        }

        isInitialMount.current = false;
        setData(res.data);
      } else {
        throw new Error('API 응답이 올바르지 않거나 success: false 입니다.');
      }
    } catch (err: any) {
      console.error('Weather Correlation API Error:', err);
      setError(err?.message || '날씨-매출 상관관계 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const latestClosed = getLatestClosedDateStr();
    const fallbackStart = latestClosed.slice(0, 7) + '-01';
    const fallbackEnd = latestClosed;

    // 상관관계 분석은 다일간 기간 조회가 필수이므로, 단일 일자 진입 시에도 당월 MTD(1일~어제) 구간으로 자동 초기화
    const effectiveIsRange = globalIsRange || true;
    const s = globalIsRange ? (globalStartDate || fallbackStart) : (globalStartDate ? `${globalStartDate.slice(0, 7)}-01` : fallbackStart);
    const e = globalIsRange ? (globalEndDate || fallbackEnd) : (globalStartDate || fallbackEnd);

    setIsRangeMode(effectiveIsRange);
    setStartDate(s);
    setEndDate(e);
    fetchData(s, e, effectiveIsRange);
  }, [globalStartDate, globalEndDate, globalIsRange]);

  const handleSearch = () => {
    setAutoSwitchedNotice(null);
    let s = startDate;
    let e = endDate;
    if (isRangeMode && s && e && s > e) {
      const temp = s;
      s = e;
      e = temp;
      setStartDate(s);
      setEndDate(e);
    }
    setDateRange(s, isRangeMode ? e : null, isRangeMode);
    fetchData(s, e, isRangeMode);
  };

  const applyPreset = (preset: DatePresetType) => {
    setAutoSwitchedNotice(null);
    const res = getPresetDateRange(preset);
    setIsRangeMode(res.isRange);
    setStartDate(res.startDate);
    setEndDate(res.endDate || res.startDate);
    setDateRange(res.startDate, res.endDate, res.isRange);
    fetchData(res.startDate, res.endDate || res.startDate, res.isRange);
  };

  // Distinct venues deduplicated by venueName (SSOT: 매출 규모가 큰 공식 주(Primary) 카테고리 영업장 보존)
  const uniqueVenues = useMemo(() => {
    if (!data?.venueRankings) return [];
    const venueMap = new Map<string, WeatherVenueRankingItem>();
    
    // 맑은날 일평균 매출(clearDayAvgRevenue) 기준 내림차순 정렬하여 진성 주관 업장 데이터 우선 배정
    const sorted = [...data.venueRankings].sort((a, b) => (b.clearDayAvgRevenue || 0) - (a.clearDayAvgRevenue || 0));
    for (const item of sorted) {
      if (isExcludedVenue(item.venueName)) continue;
      if (!venueMap.has(item.venueName)) {
        venueMap.set(item.venueName, item);
      }
    }
    return Array.from(venueMap.values());
  }, [data]);

  // Distinct categories from unique venues
  const availableCategories = useMemo(() => {
    if (!uniqueVenues.length) return [];
    const map = new Map<string, string>();
    uniqueVenues.forEach(v => {
      if (v.categoryCode && v.categoryName) {
        map.set(v.categoryCode, v.categoryName);
      }
    });
    return Array.from(map.entries()).map(([code, name]) => ({ code, name }));
  }, [uniqueVenues]);

  // Filtered and sorted venue rankings
  const topBeneficiaryVenues = useMemo(() => {
    if (!uniqueVenues.length) return [];
    // 골프 부속 잡매출(기타매출 등)을 제외하고 실내·객실·식음·굿즈 중심 진성 수혜 시설 Top 3 추출
    return uniqueVenues
      .filter(v => v.categoryCode !== 'GOLF' && v.rainyImpactRate > 0)
      .sort((a, b) => b.rainyImpactRate - a.rainyImpactRate)
      .slice(0, 3)
      .map(v => ({
        venueName: v.venueName,
        categoryName: v.categoryName,
        impactRate: v.rainyImpactRate,
        deltaRevenue: v.rainyRevenueDelta
      }));
  }, [uniqueVenues]);

  const filteredVenues = useMemo(() => {
    if (!uniqueVenues.length) return [];

    let list = [...uniqueVenues];

    if (selectedCategory !== 'ALL') {
      list = list.filter(v => v.categoryCode === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(v => 
        v.venueName.toLowerCase().includes(q) || 
        v.categoryName.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      const aTarget = dayTypeFilter === 'WEEKDAY' ? a.weekday : dayTypeFilter === 'HOLIDAY' ? a.holiday : a;
      const bTarget = dayTypeFilter === 'WEEKDAY' ? b.weekday : dayTypeFilter === 'HOLIDAY' ? b.holiday : b;

      const aRate = aTarget?.rainyImpactRate ?? a.rainyImpactRate ?? 0;
      const bRate = bTarget?.rainyImpactRate ?? b.rainyImpactRate ?? 0;
      const aClear = aTarget?.clearDayAvgRevenue ?? a.clearDayAvgRevenue ?? 0;
      const bClear = bTarget?.clearDayAvgRevenue ?? b.clearDayAvgRevenue ?? 0;
      const aDelta = aTarget?.rainyRevenueDelta ?? a.rainyRevenueDelta ?? 0;
      const bDelta = bTarget?.rainyRevenueDelta ?? b.rainyRevenueDelta ?? 0;

      if (sortBy === 'impactRateAsc') {
        return aRate - bRate; // 취약도 순 (마이너스 큰 순)
      } else if (sortBy === 'impactRateDesc') {
        return bRate - aRate; // 수혜도 순 (플러스 큰 순)
      } else if (sortBy === 'clearRevenue') {
        return bClear - aClear; // 맑은날 매출 순
      } else {
        return aDelta - bDelta; // 손실액 큰 순
      }
    });

    return list;
  }, [uniqueVenues, selectedCategory, searchQuery, sortBy, dayTypeFilter]);

  // Sensitivity Tag Helper
  const getSensitivityBadge = (tag: string, rate: number) => {
    if (rate <= -35 || tag === 'HIGH_NEGATIVE') {
      return { text: '극심한 타격', bg: 'bg-[#FDF0ED] text-[#8B2635] border-[#EAC5BD]' };
    }
    if (rate < -10 || tag === 'VULNERABLE') {
      return { text: '우천 취약', bg: 'bg-[#B59269]/15 text-[#B59269] border-[#B59269]/40' };
    }
    if (rate >= 10 || tag === 'HIGH_POSITIVE') {
      return { text: '강한 반사이익', bg: 'bg-[#E8F2EE] text-[#1E523F] border-[#B4C6C1]' };
    }
    if (rate > 0 || tag === 'BENEFICIARY') {
      return { text: '실내 수혜', bg: 'bg-[#284F42]/10 text-[#284F42] border-[#284F42]/30' };
    }
    return { text: '날씨 중립', bg: 'bg-[#F4F3EE] text-[#5A6B63] border-[#D0C6BB]/60' };
  };

  // ECharts Option for Daily Time Series (Precipitation vs Total Revenue)
  const timeSeriesOption = useMemo(() => {
    if (!data?.dailyTimeSeries || data.dailyTimeSeries.length === 0) return {};

    const dates = data.dailyTimeSeries.map(d => `${d.date.slice(5)} (${d.dayName.slice(0, 1)})`);
    const precipitation = data.dailyTimeSeries.map(d => d.precipitation);
    const totalRev = data.dailyTimeSeries.map(d => Math.round(d.totalRevenue));
    const golfRev = data.dailyTimeSeries.map(d => Math.round(d.golfRevenue));
    const ticketRev = data.dailyTimeSeries.map(d => Math.round(d.ticketRevenue));
    const fnbRev = data.dailyTimeSeries.map(d => Math.round(d.fnbRevenue));
    const roomRev = data.dailyTimeSeries.map(d => Math.round(d.roomRevenue));

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross', crossStyle: { color: '#999' } },
        backgroundColor: 'rgba(27, 56, 46, 0.95)',
        borderColor: '#284F42',
        borderWidth: 1,
        padding: [12, 16],
        textStyle: { color: '#f8fafc', fontSize: 12 },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const idx = params[0].dataIndex;
          const row = data.dailyTimeSeries[idx];
          const conditionLabel = row.weatherCondition === 'RAIN' ? '🌧️ 비' : row.weatherCondition === 'SNOW' ? '❄️ 눈' : '☀️ 맑음';
          
          let html = `<div style="font-weight:bold;margin-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.2);padding-bottom:4px;color:#fff;">
            ${row.date} (${row.dayName}) [${conditionLabel}]
          </div>`;
          html += `<div style="display:flex;justify-content:space-between;gap:12px;color:#38bdf8;font-weight:bold;">
            <span>일 강수량:</span><span>${row.precipitation} mm</span>
          </div>`;
          if (row.snowfall > 0) {
            html += `<div style="display:flex;justify-content:space-between;gap:12px;color:#a5b4fc;font-weight:bold;">
              <span>적설량:</span><span>${row.snowfall} cm</span>
            </div>`;
          }
          html += `<div style="display:flex;justify-content:space-between;gap:12px;color:#5FB878;font-weight:bold;margin-top:4px;">
            <span>전사 총매출:</span><span>${new Intl.NumberFormat('ko-KR').format(Math.round(row.totalRevenue))}원</span>
          </div>`;
          html += `<div style="font-size:11px;color:#D0C6BB;margin-top:4px;border-top:1px dashed rgba(255,255,255,0.2);padding-top:4px;">
            골프: ${new Intl.NumberFormat('ko-KR').format(Math.round(row.golfRevenue))}원 | 
            레저: ${new Intl.NumberFormat('ko-KR').format(Math.round(row.ticketRevenue))}원<br/>
            객실: ${new Intl.NumberFormat('ko-KR').format(Math.round(row.roomRevenue))}원 | 
            식음: ${new Intl.NumberFormat('ko-KR').format(Math.round(row.fnbRevenue))}원
          </div>`;
          return html;
        }
      },
      legend: {
        data: ['일 강수량(mm)', '전사 총매출', '골프', '레저', '식음', '객실'],
        top: 0,
        textStyle: { color: '#1B382E', fontSize: 12, fontWeight: 'bold' }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        top: '15%',
        containLabel: true
      },
      xAxis: [
        {
          type: 'category',
          data: dates,
          axisPointer: { type: 'shadow' },
          axisLabel: { color: '#5A6B63', fontSize: 11 }
        }
      ],
      yAxis: [
        {
          type: 'value',
          name: '강수량(mm)',
          min: 0,
          position: 'left',
          axisLabel: { formatter: '{value} mm', color: '#0284c7' },
          splitLine: { show: false }
        },
        {
          type: 'value',
          name: '매출액(원)',
          position: 'right',
          axisLabel: { 
            formatter: (v: number) => {
              if (v >= 100000000) return `${(v / 100000000).toFixed(1)}억원`;
              if (v >= 10000000) return `${(v / 10000000).toFixed(0)}천만원`;
              if (v >= 10000) return `${(v / 10000).toFixed(0)}만원`;
              return `${v}원`;
            },
            color: '#284F42'
          },
          splitLine: { lineStyle: { type: 'dashed', color: '#D0C6BB', opacity: 0.4 } }
        }
      ],
      series: [
        {
          name: '일 강수량(mm)',
          type: 'bar',
          data: precipitation,
          itemStyle: {
            color: '#38bdf8',
            borderRadius: [4, 4, 0, 0]
          },
          barWidth: '40%'
        },
        {
          name: '전사 총매출',
          type: 'line',
          yAxisIndex: 1,
          data: totalRev,
          itemStyle: { color: '#284F42' },
          lineStyle: { width: 3 },
          smooth: true
        },
        {
          name: '골프',
          type: 'line',
          yAxisIndex: 1,
          data: golfRev,
          itemStyle: { color: '#B59269' },
          lineStyle: { width: 1.5, type: 'dashed' },
          smooth: true
        },
        {
          name: '레저',
          type: 'line',
          yAxisIndex: 1,
          data: ticketRev,
          itemStyle: { color: '#D97706' },
          lineStyle: { width: 1.5, type: 'dashed' },
          smooth: true
        },
        {
          name: '식음',
          type: 'line',
          yAxisIndex: 1,
          data: fnbRev,
          itemStyle: { color: '#0D9488' },
          lineStyle: { width: 1.5, type: 'dashed' },
          smooth: true
        },
        {
          name: '객실',
          type: 'line',
          yAxisIndex: 1,
          data: roomRev,
          itemStyle: { color: '#6366f1' },
          lineStyle: { width: 1.5, type: 'dashed' },
          smooth: true
        }
      ]
    };
  }, [data]);

  // 기상 시뮬레이션 필터 및 정렬
  const simulationVenues = useMemo(() => {
    if (!simData?.venues) return [];
    let list = simData.venues.filter(v => !isExcludedVenue(v.venueName));
    if (simSearchQuery.trim()) {
      const q = simSearchQuery.trim().toLowerCase();
      list = list.filter(v => v.venueName.toLowerCase().includes(q) || v.categoryName.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      if (simSortBy === 'weekdayDelta') {
        return a.weekdayRevenueDelta - b.weekdayRevenueDelta;
      } else if (simSortBy === 'holidayDelta') {
        return a.holidayRevenueDelta - b.holidayRevenueDelta;
      } else {
        return a.venueName.localeCompare(b.venueName);
      }
    });
    return list;
  }, [simData, simSearchQuery, simSortBy]);

  // ECharts Option for Weather Forecast Simulation (Weekday vs Holiday by Venue)
  const simChartOption = useMemo(() => {
    if (!simData || !simulationVenues.length) return {};

    const venueNames = simulationVenues.map(v => v.venueName);
    const seriesList: any[] = [];

    if (simViewMode === 'COMBINED' || simViewMode === 'WEEKDAY') {
      seriesList.push({
        name: '주중 LY 실측 (일평균)',
        type: 'bar',
        data: simulationVenues.map(v => v.lyWeekdayAvgRevenue),
        itemStyle: { color: '#D0C6BB', borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 16
      });
      seriesList.push({
        name: '주중 기상 예측 (일평균)',
        type: 'bar',
        data: simulationVenues.map(v => v.forecastWeekdayRevenue),
        itemStyle: { color: '#284F42', borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 16
      });
    }

    if (simViewMode === 'COMBINED' || simViewMode === 'HOLIDAY') {
      seriesList.push({
        name: '휴일 LY 실측 (일평균)',
        type: 'bar',
        data: simulationVenues.map(v => v.lyHolidayAvgRevenue),
        itemStyle: { color: '#E5DED6', borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 16
      });
      seriesList.push({
        name: '휴일 기상 예측 (일평균)',
        type: 'bar',
        data: simulationVenues.map(v => v.forecastHolidayRevenue),
        itemStyle: { color: '#B59269', borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 16
      });
    }

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(27, 56, 46, 0.95)',
        borderColor: '#284F42',
        borderWidth: 1,
        padding: [12, 16],
        textStyle: { color: '#f8fafc', fontSize: 12 },
        formatter: (params: any) => {
          if (!params || !params.length) return '';
          const idx = params[0].dataIndex;
          const venue = simulationVenues[idx];
          if (!venue) return '';

          const wDeltaSign = venue.weekdayRevenueDelta > 0 ? '+' : '';
          const hDeltaSign = venue.holidayRevenueDelta > 0 ? '+' : '';

          return `
            <div style="min-width: 230px;">
              <div style="font-weight: 800; font-size: 14px; margin-bottom: 2px; color: #ffffff;">${venue.venueName}</div>
              <div style="font-size: 11px; color: #D0C6BB; margin-bottom: 8px;">[${venue.categoryName}] ${simData.lyMonth} 실측 대조 기상 시뮬레이션</div>
              
              <div style="border-top: 1px solid rgba(255,255,255,0.15); padding-top: 6px; margin-bottom: 6px;">
                <div style="font-weight: 700; color: #5FB878; font-size: 11px; margin-bottom: 3px;">주중 (평일) 일평균</div>
                <div style="display: flex; justify-content: space-between; gap: 12px; color: #D0C6BB; font-size: 11px;">
                  <span>LY 실측:</span>
                  <span>${formatCurrency(venue.lyWeekdayAvgRevenue)}원</span>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 12px; color: #ffffff; font-weight: 700; font-size: 11px;">
                  <span>기상 예측:</span>
                  <span>${formatCurrency(venue.forecastWeekdayRevenue)}원</span>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 12px; font-size: 11px; color: ${venue.weekdayRevenueDelta >= 0 ? '#4ade80' : '#f87171'};">
                  <span>변동폭:</span>
                  <span style="font-weight: 700;">${wDeltaSign}${formatCurrency(venue.weekdayRevenueDelta)}원 (${formatRate(venue.weekdayImpactRate)})</span>
                </div>
              </div>

              <div style="border-top: 1px solid rgba(255,255,255,0.15); padding-top: 6px;">
                <div style="font-weight: 700; color: #B59269; font-size: 11px; margin-bottom: 3px;">휴일 (주말/공휴일) 일평균</div>
                <div style="display: flex; justify-content: space-between; gap: 12px; color: #D0C6BB; font-size: 11px;">
                  <span>LY 실측:</span>
                  <span>${formatCurrency(venue.lyHolidayAvgRevenue)}원</span>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 12px; color: #ffffff; font-weight: 700; font-size: 11px;">
                  <span>기상 예측:</span>
                  <span>${formatCurrency(venue.forecastHolidayRevenue)}원</span>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 12px; font-size: 11px; color: ${venue.holidayRevenueDelta >= 0 ? '#4ade80' : '#f87171'};">
                  <span>변동폭:</span>
                  <span style="font-weight: 700;">${hDeltaSign}${formatCurrency(venue.holidayRevenueDelta)}원 (${formatRate(venue.holidayImpactRate)})</span>
                </div>
              </div>
            </div>
          `;
        }
      },
      legend: {
        bottom: 0,
        icon: 'roundRect',
        itemWidth: 12,
        itemHeight: 12,
        textStyle: { color: '#1B382E', fontSize: 11, fontWeight: 'bold' }
      },
      grid: {
        top: 25,
        left: '2%',
        right: '2%',
        bottom: 45,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: venueNames,
        axisLine: { lineStyle: { color: '#D0C6BB' } },
        axisLabel: {
          color: '#5A6B63',
          fontSize: 10,
          fontWeight: 600,
          interval: 0,
          rotate: venueNames.length > 8 ? 30 : 0
        }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#D0C6BB', opacity: 0.3, type: 'dashed' } },
        axisLabel: {
          color: '#5A6B63',
          fontSize: 10,
          formatter: (v: number) => {
            if (v >= 100000000) return `${(v / 100000000).toFixed(1)}억`;
            if (v >= 10000) return `${Math.round(v / 10000)}만`;
            return `${v}`;
          }
        }
      },
      series: seriesList
    };
  }, [simData, simulationVenues, simViewMode]);

  return (
    <div className="w-full min-h-screen bg-[#F4F3EE] text-[#1B382E] tracking-tight pb-16 relative">
      {/* Ambient Forest Glow Banner */}
      <div className="w-full bg-[#284F42] h-[190px] absolute top-0 left-0 z-0 overflow-hidden rounded-b-[36px] border-b border-[#1B382E] shadow-xl">
        <div className="absolute -top-16 -right-16 w-96 h-96 rounded-full bg-[#2F5548] opacity-70 pointer-events-none" />
        <div className="absolute top-8 left-1/3 w-80 h-80 rounded-full bg-[#2F5548] opacity-40 blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 right-1/4 w-60 h-60 rounded-full bg-[#1B382E] opacity-60 pointer-events-none" />
      </div>

      <div className="relative z-10 max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Top Header Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-7 border border-[#D0C6BB]/80 shadow-[0_4px_24px_rgba(40,79,66,0.06)] flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-5">
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1B382E]/80 border border-white/20 text-white/90 text-xs font-semibold backdrop-blur-xs shadow-xs mb-3">
              <span className="w-2 h-2 rounded-full bg-[#5FB878] animate-pulse" />
              <span>BELLEFORET RESORT · 기상-매출 결합 인텔리전스</span>
              <span className="text-white/60">|</span>
              <span className="text-white/90">영업시간(06~20시) 실측 데이터 연동</span>
            </div>
            
            <h1 className="text-2xl lg:text-3xl font-extrabold text-[#1B382E] tracking-tight flex items-center gap-3 break-keep">
              <div className="p-2.5 bg-[#284F42] text-white rounded-2xl shadow-xs">
                <CloudRain size={24} />
              </div>
              <span>날씨-매출 상관관계 분석</span>
            </h1>
            <p className="text-sm text-[#5A6B63] mt-2 max-w-3xl leading-relaxed break-keep">
              실측 강수량/적설량과 정규 데이터 마트 매출을 결합하여, 우천 시 실외 시설의 취약도와 실내 시설(객실·식음·굿즈)의 반사이익 및 주중 vs 휴일 고객 이동 패턴을 다차원 분석합니다.
            </p>
          </div>

          <div className="bg-[#F4F3EE]/80 rounded-2xl p-4 border border-[#D0C6BB]/70 flex flex-col gap-3 w-full xl:w-auto xl:min-w-[380px]">
            <div className="flex items-center justify-between border-b border-[#D0C6BB]/50 pb-2">
              <span className="text-xs font-bold text-[#1B382E] flex items-center gap-1.5">
                <Calendar size={14} className="text-[#284F42]" /> 분석 기간 설정
              </span>
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#D0C6BB]/60 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setIsRangeMode(false)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    !isRangeMode ? 'bg-[#284F42] text-white shadow-2xs font-bold' : 'text-[#5A6B63] hover:text-[#1B382E]'
                  }`}
                >
                  단일일자
                </button>
                <button
                  type="button"
                  onClick={() => setIsRangeMode(true)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isRangeMode ? 'bg-[#284F42] text-white shadow-2xs font-bold' : 'text-[#5A6B63] hover:text-[#1B382E]'
                  }`}
                >
                  기간조회
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button 
                type="button" 
                onClick={handleSwitchToLatestMonth} 
                className="px-2.5 py-1 bg-[#284F42] text-white rounded-lg text-xs font-semibold shadow-2xs cursor-pointer"
              >
                최신 관측월(9월)
              </button>
              <button 
                type="button" 
                onClick={() => applyPreset('MTD')} 
                className="px-2.5 py-1 bg-white hover:bg-[#F4F3EE] rounded-lg text-xs text-[#1B382E] border border-[#D0C6BB]/60 font-semibold shadow-2xs cursor-pointer"
              >
                당월(MTD)
              </button>
              <button 
                type="button" 
                onClick={() => applyPreset('WEEK')} 
                className="px-2.5 py-1 bg-white hover:bg-[#F4F3EE] rounded-lg text-xs text-[#1B382E] border border-[#D0C6BB]/60 font-medium shadow-2xs cursor-pointer"
              >
                최근 7일
              </button>
              <button 
                type="button" 
                onClick={() => applyPreset('YTD')} 
                className="px-2.5 py-1 bg-white hover:bg-[#F4F3EE] rounded-lg text-xs text-[#1B382E] border border-[#D0C6BB]/60 font-medium shadow-2xs cursor-pointer"
              >
                연간(YTD)
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-[#D0C6BB]/75 text-[#1B382E] text-xs rounded-xl px-3 py-1.5 outline-hidden focus:border-[#284F42] cursor-pointer shadow-2xs w-full"
              />
              {isRangeMode && (
                <>
                  <span className="text-[#8C9E96] text-xs">~</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-white border border-[#D0C6BB]/75 text-[#1B382E] text-xs rounded-xl px-3 py-1.5 outline-hidden focus:border-[#284F42] cursor-pointer shadow-2xs w-full"
                  />
                </>
              )}
              <button
                type="button"
                onClick={handleSearch}
                disabled={loading}
                className="bg-[#B59269] hover:bg-[#a38058] active:scale-95 text-white text-xs font-bold px-4 py-1.5 rounded-xl transition-all shadow-2xs flex items-center gap-1 ml-auto shrink-0 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                <span>조회</span>
              </button>
            </div>
          </div>
        </div>

        {/* Unified Synergy Navigation Sub-tabs */}
        <SynergyNav />

        {loading && (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-[#284F42]/20 border-t-[#284F42] rounded-full animate-spin"></div>
            <p className="text-sm font-semibold text-[#5A6B63]">기상 및 매출 상관관계 마트 데이터를 집계 중입니다...</p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-[#FDF0ED] border border-[#EAC5BD] rounded-3xl p-6 text-[#8B2635] flex items-start gap-3 shadow-2xs">
            <HelpCircle className="w-5 h-5 text-[#8B2635] shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-sm">데이터 조회 실패</h3>
              <p className="text-xs text-[#8B2635]/90 mt-1">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && data && (
          <div className="space-y-6">
            
            {/* Auto-switch notice banner */}
            {autoSwitchedNotice && (
              <div className="bg-white border border-[#D0C6BB]/75 rounded-2xl p-4 text-[#1B382E] flex items-center justify-between gap-3 text-xs shadow-[0_4px_24px_rgba(40,79,66,0.06)]">
                <div className="flex items-center gap-2">
                  <Info size={16} className="text-[#284F42] shrink-0" />
                  <span className="font-medium">{autoSwitchedNotice}</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setAutoSwitchedNotice(null)} 
                  className="text-[#284F42] hover:text-[#1B382E] font-bold px-2 py-0.5 rounded-lg hover:bg-[#F4F3EE] transition shrink-0 cursor-pointer"
                >
                  닫기
                </button>
              </div>
            )}

            {/* 2. Executive 4 KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              
              {/* KPI Card 1: 우천 시 최고 타격(취약) 시설 Top 3 */}
              <div className="bg-white p-6 lg:p-7 rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] hover:shadow-[0_12px_32px_rgba(40,79,66,0.1)] transition-all relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-[#8B2635] flex items-center gap-1.5">
                      <TrendingDown size={16} /> 우천 시 최고 타격(취약) Top 3
                    </span>
                    <span className="text-[11px] font-bold bg-[#FDF0ED] text-[#8B2635] px-2.5 py-0.5 rounded-full border border-[#EAC5BD]">
                      실외 레저
                    </span>
                  </div>
                  <div className="space-y-2 mt-3">
                    {data.summary?.topVulnerableVenues?.filter(v => !isExcludedVenue(v.venueName)).slice(0, 3).map((v, i) => (
                      <div key={v.venueName} className="flex items-center justify-between text-xs py-1.5 border-b border-[#D0C6BB]/30 last:border-0">
                        <span className="font-bold text-[#1B382E] flex items-center gap-1.5 truncate" title={v.venueName}>
                          <span className="w-4 h-4 rounded-full bg-[#FDF0ED] text-[#8B2635] text-[10px] flex items-center justify-center font-bold">{i + 1}</span>
                          {v.venueName}
                        </span>
                        <div className="text-right shrink-0">
                          <span className="font-extrabold text-[#8B2635] font-financial mr-2">{formatRate(v.impactRate)}</span>
                          <span className="text-[11px] text-[#5A6B63] font-financial">{formatCurrency(v.deltaRevenue)}원</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-[#5A6B63] mt-4 pt-3 border-t border-[#D0C6BB]/50">
                  실외 액티비티 시설의 일평균 매출 반토막 현상
                </p>
              </div>

              {/* KPI Card 2: 우천 시 반사이익 / 실내 방어 시설 Top 3 */}
              <div className="bg-white p-6 lg:p-7 rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] hover:shadow-[0_12px_32px_rgba(40,79,66,0.1)] transition-all relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-[#1E523F] flex items-center gap-1.5">
                      <TrendingUp size={16} /> 실내 소비 전이/반사이익 Top 3
                    </span>
                    <span className="text-[11px] font-bold bg-[#E8F2EE] text-[#1E523F] px-2.5 py-0.5 rounded-full border border-[#B4C6C1]">
                      실내·객실
                    </span>
                  </div>
                  <div className="space-y-2 mt-3">
                    {topBeneficiaryVenues.map((v, i) => (
                      <div key={v.venueName} className="flex items-center justify-between text-xs py-1.5 border-b border-[#D0C6BB]/30 last:border-0">
                        <span className="font-bold text-[#1B382E] flex items-center gap-1.5 truncate" title={v.venueName}>
                          <span className="w-4 h-4 rounded-full bg-[#E8F2EE] text-[#1E523F] text-[10px] flex items-center justify-center font-bold">{i + 1}</span>
                          {v.venueName}
                        </span>
                        <div className="text-right shrink-0">
                          <span className="font-extrabold text-[#1E523F] font-financial mr-2">{formatRate(v.impactRate)}</span>
                          <span className="text-[11px] text-[#5A6B63] font-financial">+{formatCurrency(v.deltaRevenue)}원</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-[#5A6B63] mt-4 pt-3 border-t border-[#D0C6BB]/50">
                  투숙객 외출 감소에 따른 객실 체류 및 실내 다이닝 전이
                </p>
              </div>

              {/* KPI Card 3: 골프장 주중 vs 휴일 날씨 민감도 */}
              <div className="bg-white p-6 lg:p-7 rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] hover:shadow-[0_12px_32px_rgba(40,79,66,0.1)] transition-all relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-[#1B382E] flex items-center gap-1.5">
                      <Activity size={16} className="text-[#284F42]" /> 골프장 날씨 민감도 차이
                    </span>
                    <span className="text-[11px] font-bold bg-[#B59269]/15 text-[#B59269] px-2.5 py-0.5 rounded-full border border-[#B59269]/40">
                      주중 vs 휴일
                    </span>
                  </div>
                  {(() => {
                    const greenFeeItem = data.venueRankings.find(v => v.venueName === '그린피');
                    const weekdayRate = greenFeeItem?.weekday?.rainyImpactRate;
                    const holidayRate = greenFeeItem?.holiday?.rainyImpactRate;
                    return (
                      <div className="space-y-3 mt-3">
                        <div className="flex items-center justify-between bg-[#F4F3EE]/80 p-3 rounded-2xl border border-[#D0C6BB]/60">
                          <span className="text-xs font-bold text-[#1B382E]">주중 그린피</span>
                          <span className="font-black text-[#8B2635] font-financial text-sm">
                            {formatRate(weekdayRate)}
                            <span className="text-[10px] text-[#5A6B63] font-normal ml-1">(취소 빈번)</span>
                          </span>
                        </div>
                        <div className="flex items-center justify-between bg-[#F4F3EE]/80 p-3 rounded-2xl border border-[#D0C6BB]/60">
                          <span className="text-xs font-bold text-[#1B382E]">휴일 그린피</span>
                          <span className="font-black text-[#B59269] font-financial text-sm">
                            {formatRate(holidayRate)}
                            <span className="text-[10px] text-[#5A6B63] font-normal ml-1">(희소성 방어)</span>
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <p className="text-[11px] text-[#5A6B63] mt-4 pt-3 border-t border-[#D0C6BB]/50">
                  주말 골퍼는 우천 시에도 티타임 포기율이 현저히 낮음
                </p>
              </div>

              {/* KPI Card 4: 기간 내 기상 통계 */}
              {(() => {
                const totalDays = data.summary?.period?.totalDays;
                const hasDays = typeof totalDays === 'number' && totalDays > 0;
                return (
                  <div className="bg-white p-6 lg:p-7 rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] hover:shadow-[0_12px_32px_rgba(40,79,66,0.1)] transition-all relative overflow-hidden flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-[#5A6B63] flex items-center gap-1.5">
                          <Compass size={16} className="text-[#284F42]" /> 분석 기간 기상 집계
                        </span>
                        {hasDays ? (
                          <span className="text-[11px] font-bold bg-[#F4F3EE] text-[#1B382E] px-2.5 py-0.5 rounded-full border border-[#D0C6BB]/75">
                            총 {totalDays}일간
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold bg-[#FDF0ED] text-[#8B2635] px-2.5 py-0.5 rounded-full border border-[#EAC5BD] flex items-center gap-1">
                            <AlertCircle size={11} /> 관측 대기
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                        <div className="bg-[#F4F3EE]/80 p-2.5 rounded-xl border border-[#D0C6BB]/60">
                          <Sun size={18} className="mx-auto text-[#B59269] mb-1" />
                          <div className="text-xs text-[#5A6B63]">맑은 날</div>
                          <div className={`text-base font-black ${hasDays ? 'text-[#1B382E]' : 'text-[#8C9E96]'}`}>
                            {hasDays ? `${data.summary?.weatherStats?.clearDays ?? 0}일` : '-'}
                          </div>
                        </div>
                        <div className="bg-[#F4F3EE]/80 p-2.5 rounded-xl border border-[#D0C6BB]/60">
                          <CloudRain size={18} className="mx-auto text-[#284F42] mb-1" />
                          <div className="text-xs text-[#5A6B63]">비 온 날</div>
                          <div className={`text-base font-black ${hasDays ? 'text-[#284F42]' : 'text-[#8C9E96]'}`}>
                            {hasDays ? `${data.summary?.weatherStats?.rainyDays ?? 0}일` : '-'}
                          </div>
                        </div>
                        <div className="bg-[#F4F3EE]/80 p-2.5 rounded-xl border border-[#D0C6BB]/60">
                          <CloudSnow size={18} className="mx-auto text-[#5E60CE] mb-1" />
                          <div className="text-xs text-[#5A6B63]">눈 온 날</div>
                          <div className={`text-base font-black ${hasDays ? 'text-[#5E60CE]' : 'text-[#8C9E96]'}`}>
                            {hasDays ? `${data.summary?.weatherStats?.snowyDays ?? 0}일` : '-'}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#D0C6BB]/50 flex flex-col gap-1.5 text-[11px] text-[#5A6B63]">
                      <div className="flex items-center justify-between">
                        <span>평균 강수량: <strong>{hasDays ? `${data.summary?.weatherStats?.avgPrecipitation ?? 0}mm` : '-'}</strong></span>
                        <span>최고 강수량: <strong>{hasDays ? `${data.summary?.weatherStats?.maxPrecipitation ?? 0}mm` : '-'}</strong></span>
                      </div>
                      {!hasDays && (
                        <div className="pt-2 border-t border-[#D0C6BB]/40 flex items-center justify-between text-[10px]">
                          <span className="text-[#8B2635] font-medium">선택 기간 기상청 관측치 집계 대기</span>
                          <button 
                            type="button" 
                            onClick={handleSwitchToLatestMonth} 
                            className="text-[#284F42] hover:text-[#1B382E] font-bold underline cursor-pointer"
                          >
                            최신 관측월(9월) 보기
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

            </div>

          {/* 3. Dual-Axis Time Series Chart (날씨 vs 매출 추이) */}
          <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-[0_4px_24px_rgba(40,79,66,0.06)] border border-[#D0C6BB]/75">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-extrabold text-[#1B382E] flex items-center gap-2">
                  <CloudRain className="w-5 h-5 text-[#284F42]" /> 일자별 기상(강수량) 및 부문별 매출 연동 추이
                </h2>
                <p className="text-xs text-[#5A6B63] mt-1">
                  강수량(Bar)과 전사 및 4대 부문 매출 라인을 동일 타임라인에서 교차 분석합니다.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold text-[#5A6B63]">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-[#38bdf8] rounded-xs"></span> 강수량(mm)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-[#284F42] rounded-full"></span> 전사 총매출</span>
              </div>
            </div>

            <div className="h-[380px] w-full">
              {data?.dailyTimeSeries && data.dailyTimeSeries.length > 0 ? (
                <ReactECharts option={timeSeriesOption} style={{ height: '100%', width: '100%' }} notMerge={true} />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-[#8C9E96] bg-[#F4F3EE]/50 rounded-2xl border border-dashed border-[#D0C6BB] p-6 text-center">
                  <CloudRain className="w-10 h-10 text-[#8C9E96] mb-2" />
                  <p className="text-sm font-semibold text-[#1B382E]">선택하신 기간({startDate || '조회 기간'})의 일자별 기상 연동 데이터가 없습니다.</p>
                  <p className="text-xs text-[#5A6B63] mt-1 max-w-md">기상청 관측 데이터 및 일별 매출 결합 집계가 완료된 기간(예: 최근 7일, 전월 MTD 등)을 선택해 주세요.</p>
                  <button
                    type="button"
                    onClick={handleSwitchToLatestMonth}
                    className="mt-4 px-4 py-2 bg-[#284F42] hover:bg-[#1B382E] text-white text-xs font-bold rounded-xl transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Calendar size={14} />
                    <span>최신 관측 완료 기간 (2026년 9월) 즉시 조회</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 4. Strategic Matrix Table (업장별 맑은날 vs 비온날 정밀 대조표) */}
          <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-[0_4px_24px_rgba(40,79,66,0.06)] border border-[#D0C6BB]/75">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-extrabold text-[#1B382E] flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#284F42]" /> 업장별 기상 탄력성 및 매출 변동 매트릭스
                </h2>
                <p className="text-xs text-[#5A6B63] mt-1">
                  맑은 날 대비 우천 시 일평균 매출 변동액과 증감률을 전 영업장 1:1 전수 비교합니다.
                </p>
              </div>

              {/* Table Controls: DayType, Category, Sort, Search */}
              <div className="flex flex-wrap items-center gap-2.5">
                
                {/* Day Type Toggle (전체 / 주중 / 휴일) */}
                <div className="flex items-center bg-[#F4F3EE] p-1 rounded-xl text-xs font-bold border border-[#D0C6BB]/60">
                  <button
                    type="button"
                    onClick={() => setDayTypeFilter('TOTAL')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      dayTypeFilter === 'TOTAL' ? 'bg-[#284F42] text-white shadow-2xs font-bold' : 'text-[#5A6B63] hover:text-[#1B382E]'
                    }`}
                  >
                    전체 통합
                  </button>
                  <button
                    type="button"
                    onClick={() => setDayTypeFilter('WEEKDAY')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      dayTypeFilter === 'WEEKDAY' ? 'bg-[#284F42] text-white shadow-2xs font-bold' : 'text-[#5A6B63] hover:text-[#1B382E]'
                    }`}
                  >
                    주중 (Weekday)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDayTypeFilter('HOLIDAY')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      dayTypeFilter === 'HOLIDAY' ? 'bg-[#284F42] text-white shadow-2xs font-bold' : 'text-[#5A6B63] hover:text-[#1B382E]'
                    }`}
                  >
                    휴일 (Holiday)
                  </button>
                </div>

                {/* Category Filter */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-white border border-[#D0C6BB]/75 rounded-xl px-3 py-1.5 text-xs text-[#1B382E] font-semibold focus:outline-hidden cursor-pointer shadow-2xs"
                >
                  <option value="ALL">전체 부문 (All)</option>
                  {availableCategories.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>

                {/* Sort Filter */}
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="bg-white border border-[#D0C6BB]/75 rounded-xl px-3 py-1.5 text-xs text-[#1B382E] font-semibold focus:outline-hidden cursor-pointer shadow-2xs"
                >
                  <option value="impactRateAsc">취약도 높은순 (▼ 급감)</option>
                  <option value="impactRateDesc">수혜도 높은순 (▲ 증가)</option>
                  <option value="clearRevenue">맑은날 매출액순</option>
                  <option value="deltaRevenue">우천 손실액 큰순</option>
                </select>

                {/* Search */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-[#8C9E96]" />
                  <input
                    type="text"
                    placeholder="영업장명 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-white border border-[#D0C6BB]/75 rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#1B382E] focus:outline-hidden focus:border-[#284F42] w-36 sm:w-44 shadow-2xs"
                  />
                </div>

              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-[#F4F3EE] text-[#1B382E] font-bold border-y border-[#D0C6BB]/75">
                    <th className="py-3 px-4 text-left rounded-l-xl">부문</th>
                    <th className="py-3 px-4 text-left">영업장명</th>
                    <th className="py-3 px-4 text-center">기상 민감도</th>
                    <th className="py-3 px-4 text-right">☀️ 맑은 날 일평균</th>
                    <th className="py-3 px-4 text-right">🌧️ 비 온 날 일평균</th>
                    <th className="py-3 px-4 text-right">우천 변동액 (Δ)</th>
                    <th className="py-3 px-4 text-right font-black">우천 증감률 (Δ%)</th>
                    <th className="py-3 px-4 text-center">주중 vs 휴일 변동</th>
                    <th className="py-3 px-4 text-right rounded-r-xl">강수 상관계수 (r)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D0C6BB]/30">
                  {filteredVenues.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-[#8C9E96] font-medium">
                        선택된 조건에 부합하는 영업장이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredVenues.map((v: WeatherVenueRankingItem) => {
                      const target = dayTypeFilter === 'WEEKDAY' ? v.weekday : dayTypeFilter === 'HOLIDAY' ? v.holiday : v;
                      const clearRev = target?.clearDayAvgRevenue ?? v.clearDayAvgRevenue ?? 0;
                      const rainyRev = target?.rainyDayAvgRevenue ?? v.rainyDayAvgRevenue ?? 0;
                      const deltaRev = target?.rainyRevenueDelta ?? v.rainyRevenueDelta ?? 0;
                      const impactRate = target?.rainyImpactRate ?? v.rainyImpactRate ?? 0;
                      const sensitivity = getSensitivityBadge(target?.sensitivityTag || v.sensitivityTag, impactRate);
                      const corr = target?.correlationPrecip ?? v.correlationPrecip ?? 0;

                      return (
                        <tr key={`${v.categoryCode}_${v.venueName}`} className="hover:bg-[#F4F3EE]/60 transition-colors">
                          <td className="py-3 px-4 text-[#5A6B63] font-semibold">{v.categoryName}</td>
                          <td className="py-3 px-4 font-bold text-[#1B382E]">{v.venueName}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${sensitivity.bg}`}>
                              {sensitivity.text}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-financial text-[#5A6B63]">
                            {formatCurrency(clearRev)}원
                          </td>
                          <td className="py-3 px-4 text-right font-financial text-[#1B382E] font-bold">
                            {formatCurrency(rainyRev)}원
                          </td>
                          <td className={`py-3 px-4 text-right font-financial font-bold ${deltaRev >= 0 ? 'text-[#1E523F]' : 'text-[#8B2635]'}`}>
                            {deltaRev > 0 ? '+' : ''}{formatCurrency(deltaRev)}원
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md font-financial font-extrabold text-[11px] ${
                              impactRate >= 0 ? 'bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]' : 'bg-[#FDF0ED] text-[#8B2635] border border-[#EAC5BD]'
                            }`}>
                              {impactRate >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                              {formatRate(impactRate)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2 text-[10px] font-financial">
                              <span className="text-[#5A6B63]">
                                주중: <strong className={v.weekday?.rainyImpactRate >= 0 ? 'text-[#1E523F]' : 'text-[#8B2635]'}>{formatRate(v.weekday?.rainyImpactRate)}</strong>
                              </span>
                              <span className="text-[#D0C6BB]">|</span>
                              <span className="text-[#5A6B63]">
                                휴일: <strong className={v.holiday?.rainyImpactRate >= 0 ? 'text-[#1E523F]' : 'text-[#8B2635]'}>{formatRate(v.holiday?.rainyImpactRate)}</strong>
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-[#5A6B63] font-semibold">
                            {corr.toFixed(3)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-4 border-t border-[#D0C6BB]/50 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#5A6B63] gap-2">
              <span>* 피어슨 상관계수(r): -1.0에 가까울수록 강수량 증가 시 매출 급감, +1.0에 가까울수록 강수량 증가 시 매출 동반 상승을 의미합니다.</span>
              <span className="font-bold text-[#1B382E]">표시 업장: 총 {filteredVenues.length}개 업장</span>
            </div>
          </div>

          {/* 5. V6 기상 시뮬레이션: 강수·적설 대비 업장별 예상 매출 예측 (SSOT) */}
          <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-[0_4px_24px_rgba(40,79,66,0.06)] border border-[#D0C6BB]/75">
            {/* Header & Badges */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-[#284F42]/10 text-[#284F42] text-xs font-bold px-3 py-1 rounded-full border border-[#284F42]/30 inline-flex items-center gap-1.5">
                    <Sparkles size={14} className="text-[#284F42]" /> 공식 기상 예측 시뮬레이터
                  </span>
                  {simData?.lyMonth && (
                    <span className="bg-[#F4F3EE] text-[#5A6B63] text-xs font-bold px-3 py-1 rounded-full border border-[#D0C6BB]/75">
                      대조 기준: 전년 동월 ({simData.lyMonth}) 실측 일평균
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-extrabold text-[#1B382E] flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-[#284F42]" /> 기상 시뮬레이션: 강수·적설 대비 업장별 예상 매출 분석
                </h2>
                <p className="text-xs text-[#5A6B63] mt-1">
                  선택한 대상 연월의 전년도(LY) 실측 주중·휴일 매출과 공식 기상 탄력성 모델을 대입하여 산출된 예측치입니다.
                </p>
              </div>

              {simLoading && (
                <div className="flex items-center gap-2 text-xs font-bold text-[#284F42] bg-[#284F42]/10 px-3 py-1.5 rounded-xl border border-[#284F42]/20 animate-pulse">
                  <RefreshCw size={13} className="animate-spin" /> 기상 예측 모델 집계 중...
                </div>
              )}
            </div>

            {/* Simulation Parameter Controls */}
            <div className="bg-[#F4F3EE]/80 rounded-2xl p-5 border border-[#D0C6BB]/60 mb-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                
                {/* Month Picker */}
                <div className="md:col-span-5 flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#1B382E] flex items-center gap-1.5">
                    <Calendar size={14} className="text-[#284F42]" /> 시뮬레이션 대상 연월 (Target Month)
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="month" 
                      value={simMonth}
                      onChange={e => e.target.value && setSimMonth(e.target.value)}
                      className="bg-white border border-[#D0C6BB]/75 rounded-xl px-3 py-1.5 text-xs font-bold text-[#1B382E] focus:outline-hidden focus:border-[#284F42] shadow-2xs cursor-pointer"
                    />
                    <div className="flex items-center gap-1 text-[11px] font-bold">
                      {(() => {
                        const yr = simMonth ? simMonth.split('-')[0] : String(getClosedBusinessDate(1).getFullYear());
                        return [`${yr}-10`, `${yr}-11`, `${yr}-12`, `${yr}-09`];
                      })().map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setSimMonth(m)}
                          className={`px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                            simMonth === m ? 'bg-[#284F42] text-white border-[#284F42] shadow-2xs font-bold' : 'bg-white text-[#5A6B63] border-[#D0C6BB]/75 hover:bg-[#F4F3EE]'
                          }`}
                        >
                          {m.slice(5)}월
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Category Selector */}
                <div className="md:col-span-7 flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#1B382E] flex items-center gap-1.5">
                    <Layers size={14} className="text-[#284F42]" /> 부문 필터 (Category)
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { code: 'ALL', name: '전체 부문' },
                      { code: 'GOLF', name: '골프' },
                      { code: 'TICKET', name: '레저본부' },
                      { code: 'FNB', name: '식음' },
                    ].map(c => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => setSimCategory(c.code)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                          simCategory === c.code 
                            ? 'bg-[#284F42] text-white border-[#284F42] shadow-2xs' 
                            : 'bg-white text-[#5A6B63] border-[#D0C6BB]/75 hover:bg-[#F4F3EE]'
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Sliders: Precipitation & Snowfall */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-[#D0C6BB]/60">
                
                {/* Precipitation Slider */}
                <div className="bg-white p-4 rounded-xl border border-[#D0C6BB]/60 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1B382E] flex items-center gap-1.5">
                      <CloudRain size={16} className="text-[#38bdf8]" /> 주간 예상 강수량 (06~20시)
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]">
                      {simPrecipitation} mm
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min={0} 
                    max={100} 
                    step={1} 
                    value={simPrecipitation} 
                    onChange={e => setSimPrecipitation(Number(e.target.value))} 
                    className="w-full h-2 bg-[#F4F3EE] rounded-lg appearance-none cursor-pointer accent-[#284F42]"
                  />
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    {[
                      { label: '맑음 0mm', val: 0 },
                      { label: '약한 비 5mm', val: 5 },
                      { label: '보통 비 15mm', val: 15 },
                      { label: '집중호우 40mm', val: 40 },
                    ].map(p => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => setSimPrecipitation(p.val)}
                        className={`px-2 py-0.5 rounded-md font-semibold text-[10px] border transition-colors cursor-pointer ${
                          simPrecipitation === p.val ? 'bg-[#284F42] text-white border-[#284F42] font-bold' : 'bg-[#F4F3EE] text-[#5A6B63] border-[#D0C6BB]/60 hover:bg-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Snowfall Slider */}
                <div className="bg-white p-4 rounded-xl border border-[#D0C6BB]/60 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1B382E] flex items-center gap-1.5">
                      <CloudSnow size={16} className="text-[#5E60CE]" /> 주간 예상 적설량 (06~20시)
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#5E60CE]/10 text-[#5E60CE] border border-[#5E60CE]/30">
                      {simSnowfall} cm
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min={0} 
                    max={20} 
                    step={0.5} 
                    value={simSnowfall} 
                    onChange={e => setSimSnowfall(Number(e.target.value))} 
                    className="w-full h-2 bg-[#F4F3EE] rounded-lg appearance-none cursor-pointer accent-[#5E60CE]"
                  />
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    {[
                      { label: '눈 없음 0cm', val: 0 },
                      { label: '약한 눈 2cm', val: 2 },
                      { label: '대설 5cm', val: 5 },
                      { label: '폭설 10cm', val: 10 },
                    ].map(s => (
                      <button
                        key={s.val}
                        type="button"
                        onClick={() => setSimSnowfall(s.val)}
                        className={`px-2 py-0.5 rounded-md font-semibold text-[10px] border transition-colors cursor-pointer ${
                          simSnowfall === s.val ? 'bg-[#5E60CE] text-white border-[#5E60CE] font-bold' : 'bg-[#F4F3EE] text-[#5A6B63] border-[#D0C6BB]/60 hover:bg-white'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* Error Banner */}
            {simError && (
              <div className="bg-[#FDF0ED] border border-[#EAC5BD] rounded-xl p-4 mb-6 text-xs text-[#8B2635] flex items-center gap-2">
                <HelpCircle size={16} className="text-[#8B2635] shrink-0" />
                <span>{simError}</span>
              </div>
            )}

            {/* Simulation Results (Grand Total & Chart) */}
            {simData && (
              <div className="space-y-6">
                
                {/* Grand Total Comparison Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* Weekday Forecast Card */}
                  <div className="bg-white p-6 rounded-2xl border border-[#D0C6BB]/75 shadow-xs relative overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-[#1B382E] flex items-center gap-1.5">
                        <Activity size={16} className="text-[#284F42]" /> 주중 (평일) 일평균 예상 총매출
                      </span>
                      <span className="text-[11px] font-bold bg-[#E8F2EE] text-[#1E523F] px-2.5 py-0.5 rounded-full border border-[#B4C6C1]">
                        월~목 & 일요일
                      </span>
                    </div>
                    <div className="flex items-baseline gap-3">
                      <div className="text-2xl font-black text-[#1B382E] font-financial">
                        {formatCurrency(simData.grandTotal?.forecastWeekdayRevenue)}원
                      </div>
                      <span className={`inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-md font-financial font-extrabold text-xs ${
                        (simData.grandTotal?.weekdayRevenueDelta ?? 0) >= 0 ? 'bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]' : 'bg-[#FDF0ED] text-[#8B2635] border border-[#EAC5BD]'
                      }`}>
                        {(simData.grandTotal?.weekdayRevenueDelta ?? 0) >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {formatRate(simData.grandTotal?.weekdayImpactRate)}
                      </span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-[#D0C6BB]/50 flex items-center justify-between text-xs text-[#5A6B63] font-financial">
                      <span>전년 동월({simData.lyMonth}) 실측 일평균: <strong>{formatCurrency(simData.grandTotal?.lyWeekdayAvgRevenue)}원</strong></span>
                      <span className={simData.grandTotal?.weekdayRevenueDelta >= 0 ? 'text-[#1E523F] font-bold' : 'text-[#8B2635] font-bold'}>
                        변동: {simData.grandTotal?.weekdayRevenueDelta > 0 ? '+' : ''}{formatCurrency(simData.grandTotal?.weekdayRevenueDelta)}원
                      </span>
                    </div>
                  </div>

                  {/* Holiday Forecast Card */}
                  <div className="bg-white p-6 rounded-2xl border border-[#D0C6BB]/75 shadow-xs relative overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-[#1B382E] flex items-center gap-1.5">
                        <Activity size={16} className="text-[#B59269]" /> 휴일 (주말/공휴일) 일평균 예상 총매출
                      </span>
                      <span className="text-[11px] font-bold bg-[#B59269]/15 text-[#B59269] px-2.5 py-0.5 rounded-full border border-[#B59269]/40">
                        금·토 & 공휴일
                      </span>
                    </div>
                    <div className="flex items-baseline gap-3">
                      <div className="text-2xl font-black text-[#1B382E] font-financial">
                        {formatCurrency(simData.grandTotal?.forecastHolidayRevenue)}원
                      </div>
                      <span className={`inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-md font-financial font-extrabold text-xs ${
                        (simData.grandTotal?.holidayRevenueDelta ?? 0) >= 0 ? 'bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]' : 'bg-[#FDF0ED] text-[#8B2635] border border-[#EAC5BD]'
                      }`}>
                        {(simData.grandTotal?.holidayRevenueDelta ?? 0) >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {formatRate(simData.grandTotal?.holidayImpactRate)}
                      </span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-[#D0C6BB]/50 flex items-center justify-between text-xs text-[#5A6B63] font-financial">
                      <span>전년 동월({simData.lyMonth}) 실측 일평균: <strong>{formatCurrency(simData.grandTotal?.lyHolidayAvgRevenue)}원</strong></span>
                      <span className={simData.grandTotal?.holidayRevenueDelta >= 0 ? 'text-[#1E523F] font-bold' : 'text-[#8B2635] font-bold'}>
                        변동: {simData.grandTotal?.holidayRevenueDelta > 0 ? '+' : ''}{formatCurrency(simData.grandTotal?.holidayRevenueDelta)}원
                      </span>
                    </div>
                  </div>

                </div>

                {/* Category Pills Breakdown */}
                {simData.categories && simData.categories.length > 0 && (
                  <div className="bg-[#F4F3EE]/80 p-4 rounded-2xl border border-[#D0C6BB]/60">
                    <div className="text-xs font-bold text-[#1B382E] mb-2.5 flex items-center gap-1.5">
                      <Layers size={14} className="text-[#284F42]" /> 부문별 예측 요약 ({simData.targetMonth})
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      {simData.categories.filter(cat => cat.categoryCode !== 'ROOM').map(cat => (
                        <div key={cat.categoryCode} className="bg-white p-3 rounded-xl border border-[#D0C6BB]/60 shadow-2xs">
                          <div className="text-xs font-bold text-[#1B382E] truncate mb-1" title={cat.categoryName}>{cat.categoryName}</div>
                          <div className="text-[11px] text-[#5A6B63] flex justify-between font-financial">
                            <span>주중:</span>
                            <span className={cat.weekdayRevenueDelta >= 0 ? 'text-[#1E523F] font-bold' : 'text-[#8B2635] font-bold'}>
                              {formatRate(cat.weekdayImpactRate)}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#5A6B63] flex justify-between font-financial">
                            <span>휴일:</span>
                            <span className={cat.holidayRevenueDelta >= 0 ? 'text-[#1E523F] font-bold' : 'text-[#8B2635] font-bold'}>
                              {formatRate(cat.holidayImpactRate)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ECharts Chart: Venues Weekday vs Holiday */}
                <div className="bg-[#F4F3EE]/40 p-5 rounded-2xl border border-[#D0C6BB]/60">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-[#1B382E] flex items-center gap-1.5">
                        <BarChart3 size={16} className="text-[#284F42]" /> 영업장별 예상 매출 비교 (주중 vs 휴일)
                      </h3>
                      <p className="text-[11px] text-[#5A6B63] mt-0.5">
                        전년 동월 실측 대비 기상 조건({simPrecipitation > 0 ? `강수 ${simPrecipitation}mm` : ''}{simPrecipitation > 0 && simSnowfall > 0 ? ', ' : ''}{simSnowfall > 0 ? `적설 ${simSnowfall}cm` : ''}{simPrecipitation === 0 && simSnowfall === 0 ? '맑음' : ''}) 대입 결과
                      </p>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-white p-1 rounded-xl text-xs font-bold border border-[#D0C6BB]/60 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setSimViewMode('COMBINED')}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          simViewMode === 'COMBINED' ? 'bg-[#284F42] text-white shadow-2xs font-bold' : 'text-[#5A6B63] hover:text-[#1B382E]'
                        }`}
                      >
                        주중·휴일 통합
                      </button>
                      <button
                        type="button"
                        onClick={() => setSimViewMode('WEEKDAY')}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          simViewMode === 'WEEKDAY' ? 'bg-[#284F42] text-white shadow-2xs font-bold' : 'text-[#5A6B63] hover:text-[#1B382E]'
                        }`}
                      >
                        주중(평일) 집중
                      </button>
                      <button
                        type="button"
                        onClick={() => setSimViewMode('HOLIDAY')}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          simViewMode === 'HOLIDAY' ? 'bg-[#284F42] text-white shadow-2xs font-bold' : 'text-[#5A6B63] hover:text-[#1B382E]'
                        }`}
                      >
                        휴일(주말) 집중
                      </button>
                    </div>
                  </div>

                  <div className="h-[400px] w-full">
                    <ReactECharts option={simChartOption} style={{ height: '100%', width: '100%' }} notMerge={true} />
                  </div>
                </div>

                {/* Detailed Table */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div className="text-xs font-bold text-[#1B382E] flex items-center gap-1.5">
                      <Layers size={14} className="text-[#284F42]" /> 영업장별 정밀 예측 명세표 (총 {simulationVenues.length}개 업장)
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-[#8C9E96] absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="업장명 검색..."
                          value={simSearchQuery}
                          onChange={e => setSimSearchQuery(e.target.value)}
                          className="pl-8 pr-3 py-1 bg-white border border-[#D0C6BB]/75 rounded-lg text-xs font-medium text-[#1B382E] focus:outline-hidden focus:border-[#284F42] w-36 shadow-2xs"
                        />
                      </div>
                      <select
                        value={simSortBy}
                        onChange={e => setSimSortBy(e.target.value as any)}
                        className="bg-white border border-[#D0C6BB]/75 rounded-lg px-2.5 py-1 text-xs font-semibold text-[#1B382E] focus:outline-hidden cursor-pointer shadow-2xs"
                      >
                        <option value="weekdayDelta">주중 변동액순</option>
                        <option value="holidayDelta">휴일 변동액순</option>
                        <option value="name">업장명 가나다순</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-[#D0C6BB]/60 rounded-2xl shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#F4F3EE] text-[#1B382E] border-b border-[#D0C6BB]/75 text-[11px] font-bold">
                          <th className="py-2.5 px-3 text-left">부문</th>
                          <th className="py-2.5 px-3 text-left">영업장명</th>
                          <th className="py-2.5 px-3 text-center">민감도</th>
                          <th className="py-2.5 px-3 text-right">주중 LY 실측</th>
                          <th className="py-2.5 px-3 text-right text-[#284F42]">주중 기상 예측</th>
                          <th className="py-2.5 px-3 text-right text-[#284F42]">주중 변동률</th>
                          <th className="py-2.5 px-3 text-right">휴일 LY 실측</th>
                          <th className="py-2.5 px-3 text-right text-[#B59269]">휴일 기상 예측</th>
                          <th className="py-2.5 px-3 text-right text-[#B59269]">휴일 변동률</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#D0C6BB]/30">
                        {simulationVenues.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-8 text-center text-[#8C9E96] font-medium">
                              선택된 조건에 부합하는 업장이 없습니다.
                            </td>
                          </tr>
                        ) : (
                          simulationVenues.map(v => {
                            const badge = getSensitivityBadge(v.sensitivityTag, v.weekdayImpactRate);
                            return (
                              <tr key={`${v.categoryCode}_${v.venueName}`} className="hover:bg-[#F4F3EE]/60 transition-colors">
                                <td className="py-2.5 px-3 text-[#5A6B63] font-medium">{v.categoryName}</td>
                                <td className="py-2.5 px-3 font-bold text-[#1B382E]">{v.venueName}</td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                                    {badge.text}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-financial text-[#5A6B63]">
                                  {formatCurrency(v.lyWeekdayAvgRevenue)}원
                                </td>
                                <td className="py-2.5 px-3 text-right font-financial font-bold text-[#1B382E]">
                                  {formatCurrency(v.forecastWeekdayRevenue)}원
                                </td>
                                <td className={`py-2.5 px-3 text-right font-financial font-extrabold ${v.weekdayRevenueDelta >= 0 ? 'text-[#1E523F]' : 'text-[#8B2635]'}`}>
                                  {formatRate(v.weekdayImpactRate)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-financial text-[#5A6B63]">
                                  {formatCurrency(v.lyHolidayAvgRevenue)}원
                                </td>
                                <td className="py-2.5 px-3 text-right font-financial font-bold text-[#1B382E]">
                                  {formatCurrency(v.forecastHolidayRevenue)}원
                                </td>
                                <td className={`py-2.5 px-3 text-right font-financial font-extrabold ${v.holidayRevenueDelta >= 0 ? 'text-[#1E523F]' : 'text-[#8B2635]'}`}>
                                  {formatRate(v.holidayImpactRate)}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                </div>

              </div>
            )}

          </div>

          {/* 6. Strategic Operations Guide Card */}
          <div className="bg-[#284F42] rounded-3xl p-8 text-white shadow-xl relative overflow-hidden border border-[#1B382E]">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-[#1B382E]/80 border border-white/20 text-white/90 text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-xs">
                경영진 전략 가이드 (Actionable SOP)
              </span>
            </div>
            <h3 className="text-xl font-extrabold flex items-center gap-2 mb-3">
              <Umbrella className="text-[#B59269]" /> 우천 예보 시 실측 스트레스 테스트(Stress Test) 기반 변동비 방어 체계
            </h3>
            <p className="text-xs text-white/80 mb-6 leading-relaxed">
              가상의 수식 대신 과거 2개년(2024~2025) 중 실제로 비가 온 주말 실측치(골프 -85%, 야외레저 -92%, 실내F&B +25%)를 기준으로 삼아, 우천 예보 시 인건비와 식자재 낭비를 선제적으로 차단하는 <strong>변동비(Variable Cost) 방어 프로토콜</strong>입니다.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
              <div className="bg-[#1B382E]/60 rounded-2xl p-5 border border-white/10 flex flex-col justify-between backdrop-blur-xs">
                <div>
                  <div className="text-[#B59269] font-bold text-xs uppercase tracking-wider mb-1">D-2 (목 18:00) 락다운 ①</div>
                  <div className="text-white font-bold text-sm mb-2">야외 파트타임(알바) 출근 동결</div>
                  <p className="text-xs text-white/70 leading-relaxed break-keep">
                    기상청 예보 기준 주말 강수확률 70% 이상 시, 골프 코스지원 및 루지·썰매장 탑승보조 등 단기 인력 스케줄을 사전 취소하여 <strong>불필요한 고정 인건비 유출을 원천 방어</strong>합니다.
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-white/10 text-[11px] text-[#B59269] font-bold">
                  방어 목표: 단기 인건비 누출 원천 차단
                </div>
              </div>

              <div className="bg-[#1B382E]/60 rounded-2xl p-5 border border-white/10 flex flex-col justify-between backdrop-blur-xs">
                <div>
                  <div className="text-[#EAC5BD] font-bold text-xs uppercase tracking-wider mb-1">D-2 (목 18:00) 락다운 ②</div>
                  <div className="text-white font-bold text-sm mb-2">신선 식자재 발주 긴급 삭감</div>
                  <p className="text-xs text-white/70 leading-relaxed break-keep">
                    야외 바베큐용 육류 및 신선 채소 발주량을 <strong>평소 주말 대비 즉시 50% 삭감</strong>하여, 우천 시 발생하는 대량 폐기 손실을 차단하고 냉동 보관형 품목으로 식단을 긴급 전환합니다.
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-white/10 text-[11px] text-[#EAC5BD] font-bold">
                  방어 목표: 대량 식자재 폐기 손실 방어
                </div>
              </div>

              <div className="bg-[#1B382E]/60 rounded-2xl p-5 border border-white/10 flex flex-col justify-between backdrop-blur-xs">
                <div>
                  <div className="text-[#5FB878] font-bold text-xs uppercase tracking-wider mb-1">D-1 (금 14:00) 실내 전환</div>
                  <div className="text-white font-bold text-sm mb-2">실내 식음 & 대체 바우처 집중</div>
                  <p className="text-xs text-white/70 leading-relaxed break-keep">
                    야외 레저 취소 고객 대상 <strong>미디어아트센터 및 실내 F&B(베이커리/룸 딜리버리) 20% 우대 바우처</strong>를 카카오 알림톡으로 전송하여 리조트 밖 이탈 고객의 발길을 실내로 락인(Lock-in)합니다.
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-white/10 text-[11px] text-[#5FB878] font-bold">
                  전환 효과: 실내 매출 +20~30% 회수
                </div>
              </div>

              <div className="bg-[#1B382E]/60 rounded-2xl p-5 border border-white/10 flex flex-col justify-between backdrop-blur-xs">
                <div>
                  <div className="text-[#B4C6C1] font-bold text-xs uppercase tracking-wider mb-1">실행 원칙 (Discipline)</div>
                  <div className="text-white font-bold text-sm mb-2">가짜 수식 배제 & 실측 준수</div>
                  <p className="text-xs text-white/70 leading-relaxed break-keep">
                    가상의 탄력성 공식으로 매출을 낙관하지 말고, 실제 비 온 날의 역사적 실측치만을 대입하여 <strong>비용 통제(EBITDA 적자 방어)</strong> 목적으로만 의사결정을 집행합니다.
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-white/10 text-[11px] text-[#B4C6C1] font-bold">
                  원칙: 회계 실측 장부 기준
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      </div>
    </div>
  );
}
