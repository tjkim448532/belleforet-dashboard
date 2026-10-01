import { useState, useMemo, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useDate } from '../contexts/DateContext';
import { getPresetDateRange, type DatePresetType } from '../lib/dateUtils';
import { secureFetcher } from '../lib/secureFetcher';
import type { 
  WeatherSalesCorrelationResponse,
  WeatherVenueRankingItem,
  WeatherForecastSimulationResponse
} from '../types/reports-v2';
import { 
  CloudRain, Sun, CloudSnow, TrendingDown, TrendingUp,
  Sparkles, Zap, Calendar, RefreshCw,
  ShieldCheck, HelpCircle, Layers, ArrowUpRight, ArrowDownRight,
  Search, Umbrella, Compass, Activity, Sliders, BarChart3
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';

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

export default function WeatherSalesCorrelation() {
  const { startDate: globalStartDate, endDate: globalEndDate, isRange: globalIsRange, setDateRange } = useDate();

  const [isRangeMode, setIsRangeMode] = useState<boolean>(globalIsRange);
  const [startDate, setStartDate] = useState<string>(globalStartDate || '2026-09-01');
  const [endDate, setEndDate] = useState<string>(globalEndDate || '2026-09-30');
  
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [dayTypeFilter, setDayTypeFilter] = useState<'TOTAL' | 'WEEKDAY' | 'HOLIDAY'>('TOTAL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'impactRateAsc' | 'impactRateDesc' | 'clearRevenue' | 'deltaRevenue'>('impactRateAsc');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WeatherSalesCorrelationResponse['data'] | null>(null);

  // 기상 시뮬레이션 상태 (Backend SSOT API 연동)
  const [simMonth, setSimMonth] = useState<string>('2026-10');
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
    setIsRangeMode(globalIsRange);
    setStartDate(globalStartDate || '2026-09-01');
    setEndDate(globalEndDate || '2026-09-30');
    fetchData(globalStartDate || '2026-09-01', globalEndDate || '2026-09-30', globalIsRange);
  }, [globalStartDate, globalEndDate, globalIsRange]);

  const handleSearch = () => {
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
      return { text: '극심한 타격', bg: 'bg-red-50 text-red-700 border-red-200' };
    }
    if (rate < -10 || tag === 'VULNERABLE') {
      return { text: '우천 취약', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
    if (rate >= 10 || tag === 'HIGH_POSITIVE') {
      return { text: '강한 반사이익', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    if (rate > 0 || tag === 'BENEFICIARY') {
      return { text: '실내 수혜', bg: 'bg-teal-50 text-teal-700 border-teal-200' };
    }
    return { text: '날씨 중립', bg: 'bg-slate-100 text-slate-700 border-slate-200' };
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
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const idx = params[0].dataIndex;
          const row = data.dailyTimeSeries[idx];
          const conditionLabel = row.weatherCondition === 'RAIN' ? '🌧️ 비' : row.weatherCondition === 'SNOW' ? '❄️ 눈' : '☀️ 맑음';
          
          let html = `<div style="font-weight:bold;margin-bottom:6px;border-bottom:1px solid #eee;padding-bottom:4px;">
            ${row.date} (${row.dayName}) [${conditionLabel}]
          </div>`;
          html += `<div style="display:flex;justify-content:space-between;gap:12px;color:#0284c7;font-weight:bold;">
            <span>일 강수량:</span><span>${row.precipitation} mm</span>
          </div>`;
          if (row.snowfall > 0) {
            html += `<div style="display:flex;justify-content:space-between;gap:12px;color:#6366f1;font-weight:bold;">
              <span>적설량:</span><span>${row.snowfall} cm</span>
            </div>`;
          }
          html += `<div style="display:flex;justify-content:space-between;gap:12px;color:#059669;font-weight:bold;margin-top:4px;">
            <span>전사 총매출:</span><span>${new Intl.NumberFormat('ko-KR').format(Math.round(row.totalRevenue))}원</span>
          </div>`;
          html += `<div style="font-size:11px;color:#64748b;margin-top:4px;border-top:1px dashed #e2e8f0;padding-top:4px;">
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
        textStyle: { color: '#475569', fontSize: 12 }
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
          axisLabel: { color: '#64748b', fontSize: 11 }
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
            color: '#059669'
          },
          splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } }
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
          itemStyle: { color: '#059669' },
          lineStyle: { width: 3 },
          smooth: true
        },
        {
          name: '골프',
          type: 'line',
          yAxisIndex: 1,
          data: golfRev,
          itemStyle: { color: '#16a34a' },
          lineStyle: { width: 1.5, type: 'dashed' },
          smooth: true
        },
        {
          name: '레저',
          type: 'line',
          yAxisIndex: 1,
          data: ticketRev,
          itemStyle: { color: '#f97316' },
          lineStyle: { width: 1.5, type: 'dashed' },
          smooth: true
        },
        {
          name: '식음',
          type: 'line',
          yAxisIndex: 1,
          data: fnbRev,
          itemStyle: { color: '#eab308' },
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
    let list = [...simData.venues];
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
        itemStyle: { color: '#94a3b8', borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 16
      });
      seriesList.push({
        name: '주중 기상 예측 (일평균)',
        type: 'bar',
        data: simulationVenues.map(v => v.forecastWeekdayRevenue),
        itemStyle: { color: '#0284c7', borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 16
      });
    }

    if (simViewMode === 'COMBINED' || simViewMode === 'HOLIDAY') {
      seriesList.push({
        name: '휴일 LY 실측 (일평균)',
        type: 'bar',
        data: simulationVenues.map(v => v.lyHolidayAvgRevenue),
        itemStyle: { color: '#fdba74', borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 16
      });
      seriesList.push({
        name: '휴일 기상 예측 (일평균)',
        type: 'bar',
        data: simulationVenues.map(v => v.forecastHolidayRevenue),
        itemStyle: { color: '#ea580c', borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 16
      });
    }

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: '#334155',
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
              <div style="font-size: 11px; color: #94a3b8; margin-bottom: 8px;">[${venue.categoryName}] ${simData.lyMonth} 실측 대조 기상 시뮬레이션</div>
              
              <div style="border-top: 1px solid rgba(255,255,255,0.12); padding-top: 6px; margin-bottom: 6px;">
                <div style="font-weight: 700; color: #38bdf8; font-size: 11px; margin-bottom: 3px;">주중 (평일) 일평균</div>
                <div style="display: flex; justify-content: space-between; gap: 12px; color: #cbd5e1; font-size: 11px;">
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

              <div style="border-top: 1px solid rgba(255,255,255,0.12); padding-top: 6px;">
                <div style="font-weight: 700; color: #fb923c; font-size: 11px; margin-bottom: 3px;">휴일 (주말/공휴일) 일평균</div>
                <div style="display: flex; justify-content: space-between; gap: 12px; color: #cbd5e1; font-size: 11px;">
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
        textStyle: { color: '#475569', fontSize: 11, fontWeight: 'bold' }
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
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: {
          color: '#475569',
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
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLabel: {
          color: '#94a3b8',
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
    <div className="p-6 lg:p-10 max-w-[1680px] mx-auto min-h-screen bg-slate-50/50">
      
      {/* 1. Top Hero Banner with Navigation Tabs */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-indigo-950 rounded-[32px] p-8 text-white mb-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="bg-sky-400/20 text-sky-300 text-xs font-bold px-3 py-1 rounded-full border border-sky-400/30 tracking-wide">
                벨포레 기상-매출 결합 인텔리전스 (V6 SSOT)
              </span>
              <span className="bg-white/10 text-slate-200 text-xs px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/10 font-medium">
                <ShieldCheck size={14} className="text-sky-400" /> 영업시간(06~20시) 실측 데이터 연동
              </span>
            </div>
            
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mt-1 flex items-center gap-3 break-keep">
              <CloudRain className="text-sky-400 shrink-0" size={34} />
              <span>날씨-매출 상관관계 분석 대시보드</span>
            </h1>
            <p className="text-sky-100/90 mt-2 text-sm lg:text-base font-normal max-w-3xl leading-relaxed break-keep">
              실측 강수량/적설량과 정규 데이터 마트 매출을 결합하여, 우천 시 실외 시설의 취약도와 실내 시설(객실·식음·굿즈)의 반사이익 및 주중 vs 휴일 고객 이동 패턴을 다차원 분석합니다.
            </p>

            {/* Navigation Sub-Tabs Bar */}
            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-white/10 flex-wrap">
              <NavLink 
                to="/synergy" 
                end
                className={({ isActive }) => `px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                  isActive ? 'bg-emerald-500 text-white shadow-md' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                <Sparkles size={14} className="shrink-0" />
                <span>1. 객실 세그먼트/채널 시너지</span>
              </NavLink>

              <NavLink 
                to="/synergy/correlation" 
                className={({ isActive }) => `px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                  isActive ? 'bg-indigo-500 text-white shadow-md' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                <Zap size={14} className="shrink-0" />
                <span>2. 매장 시너지 분석 V2</span>
              </NavLink>

              <NavLink 
                to="/synergy/weather-sales" 
                className="px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap bg-sky-500 text-white shadow-md ring-2 ring-sky-400/40"
              >
                <CloudRain size={14} className="shrink-0" />
                <span>3. 🌦️ 날씨-매출 상관관계 분석</span>
              </NavLink>
            </div>
          </div>

          {/* Period Range Selection Bar */}
          <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-white/15 flex flex-col gap-3 w-full xl:w-auto xl:min-w-[380px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5 whitespace-nowrap">
                <Calendar size={14} /> 분석 기간 설정
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsRangeMode(false)}
                  className={`px-2.5 py-1 text-xs rounded-lg transition-all ${
                    !isRangeMode ? 'bg-sky-500 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  단일일자
                </button>
                <button
                  type="button"
                  onClick={() => setIsRangeMode(true)}
                  className={`px-2.5 py-1 text-xs rounded-lg transition-all ${
                    isRangeMode ? 'bg-sky-500 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  기간조회
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="flex items-center gap-1.5 w-full">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-sky-400 w-full font-mono"
                />
                {isRangeMode && (
                  <>
                    <span className="text-slate-400 text-xs">~</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-sky-400 w-full font-mono"
                    />
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={handleSearch}
                disabled={loading}
                className="w-full sm:w-auto px-4 py-1.5 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 shrink-0"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                <span>조회</span>
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1 pt-1 overflow-x-auto text-[11px] text-slate-300">
              <span className="text-slate-400 shrink-0 mr-1">단축:</span>
              <button 
                type="button" 
                onClick={() => applyPreset('MTD')} 
                className="px-2 py-0.5 rounded-md hover:bg-white/10 bg-white/5 border border-white/10 shrink-0"
              >
                당월(MTD)
              </button>
              <button 
                type="button" 
                onClick={() => applyPreset('WEEK')} 
                className="px-2 py-0.5 rounded-md hover:bg-white/10 bg-white/5 border border-white/10 shrink-0"
              >
                최근 7일
              </button>
              <button 
                type="button" 
                onClick={() => applyPreset('YTD')} 
                className="px-2 py-0.5 rounded-md hover:bg-white/10 bg-white/5 border border-white/10 shrink-0"
              >
                연간(YTD)
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-slate-500">기상 및 매출 상관관계 마트 데이터를 집계 중입니다...</p>
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-8 text-red-700 flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-sm">데이터 조회 실패</h3>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && data && (
        <div className="space-y-8">
          
          {/* 2. Executive 4 KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            
            {/* KPI Card 1: 우천 시 최고 타격(취약) 시설 Top 3 */}
            <div className="bg-white p-6 rounded-[28px] border border-red-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-red-600 flex items-center gap-1.5">
                    <TrendingDown size={16} /> 우천 시 최고 타격(취약) Top 3
                  </span>
                  <span className="text-[11px] font-bold bg-red-50 text-red-600 px-2.5 py-0.5 rounded-full border border-red-200">
                    실외 레저
                  </span>
                </div>
                <div className="space-y-2 mt-3">
                  {data.summary?.topVulnerableVenues?.slice(0, 3).map((v, i) => (
                    <div key={v.venueName} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5 truncate">
                        <span className="w-4 h-4 rounded-full bg-red-100 text-red-700 text-[10px] flex items-center justify-center font-bold">{i + 1}</span>
                        {v.venueName}
                      </span>
                      <div className="text-right shrink-0">
                        <span className="font-extrabold text-red-600 font-financial mr-2">{formatRate(v.impactRate)}</span>
                        <span className="text-[11px] text-slate-400 font-financial">{formatCurrency(v.deltaRevenue)}원</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-100">
                실외 액티비티 시설의 일평균 매출 반토막 현상
              </p>
            </div>

            {/* KPI Card 2: 우천 시 반사이익 / 실내 방어 시설 Top 3 */}
            <div className="bg-white p-6 rounded-[28px] border border-emerald-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                    <TrendingUp size={16} /> 실내 소비 전이/반사이익 Top 3
                  </span>
                  <span className="text-[11px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    실내·객실
                  </span>
                </div>
                <div className="space-y-2 mt-3">
                  {topBeneficiaryVenues.map((v, i) => (
                    <div key={v.venueName} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5 truncate">
                        <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 text-[10px] flex items-center justify-center font-bold">{i + 1}</span>
                        {v.venueName}
                      </span>
                      <div className="text-right shrink-0">
                        <span className="font-extrabold text-emerald-600 font-financial mr-2">{formatRate(v.impactRate)}</span>
                        <span className="text-[11px] text-slate-400 font-financial">+{formatCurrency(v.deltaRevenue)}원</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-100">
                투숙객 외출 감소에 따른 객실 체류 및 실내 다이닝 전이
              </p>
            </div>

            {/* KPI Card 3: 골프장 주중 vs 휴일 날씨 민감도 */}
            <div className="bg-white p-6 rounded-[28px] border border-sky-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-sky-800 flex items-center gap-1.5">
                    <Activity size={16} className="text-sky-600" /> 골프장 날씨 민감도 차이
                  </span>
                  <span className="text-[11px] font-bold bg-sky-50 text-sky-700 px-2.5 py-0.5 rounded-full border border-sky-200">
                    주중 vs 휴일
                  </span>
                </div>
                {(() => {
                  const greenFeeItem = data.venueRankings.find(v => v.venueName === '그린피');
                  const weekdayRate = greenFeeItem?.weekday?.rainyImpactRate;
                  const holidayRate = greenFeeItem?.holiday?.rainyImpactRate;
                  return (
                    <div className="space-y-3 mt-3">
                      <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-xs font-bold text-slate-700">주중 그린피</span>
                        <span className="font-black text-red-600 font-financial text-sm">
                          {formatRate(weekdayRate)}
                          <span className="text-[10px] text-slate-400 font-normal ml-1">(취소 빈번)</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-xs font-bold text-slate-700">휴일 그린피</span>
                        <span className="font-black text-amber-600 font-financial text-sm">
                          {formatRate(holidayRate)}
                          <span className="text-[10px] text-slate-400 font-normal ml-1">(희소성 방어)</span>
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <p className="text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-100">
                주말 골퍼는 우천 시에도 티타임 포기율이 현저히 낮음
              </p>
            </div>

            {/* KPI Card 4: 기간 내 기상 통계 */}
            <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Compass size={16} className="text-slate-500" /> 분석 기간 기상 집계
                  </span>
                  <span className="text-[11px] font-bold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full border border-slate-200">
                    총 {data.summary?.period?.totalDays || 0}일간
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                  <div className="bg-sky-50/60 p-2.5 rounded-xl border border-sky-100">
                    <Sun size={18} className="mx-auto text-amber-500 mb-1" />
                    <div className="text-xs text-slate-500">맑은 날</div>
                    <div className="text-base font-black text-slate-800">{data.summary?.weatherStats?.clearDays || 0}일</div>
                  </div>
                  <div className="bg-sky-50/60 p-2.5 rounded-xl border border-sky-100">
                    <CloudRain size={18} className="mx-auto text-sky-500 mb-1" />
                    <div className="text-xs text-slate-500">비 온 날</div>
                    <div className="text-base font-black text-sky-700">{data.summary?.weatherStats?.rainyDays || 0}일</div>
                  </div>
                  <div className="bg-sky-50/60 p-2.5 rounded-xl border border-sky-100">
                    <CloudSnow size={18} className="mx-auto text-indigo-400 mb-1" />
                    <div className="text-xs text-slate-500">눈 온 날</div>
                    <div className="text-base font-black text-indigo-700">{data.summary?.weatherStats?.snowyDays || 0}일</div>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>평균 강수량: <strong>{data.summary?.weatherStats?.avgPrecipitation || 0}mm</strong></span>
                <span>최고 강수량: <strong>{data.summary?.weatherStats?.maxPrecipitation || 0}mm</strong></span>
              </div>
            </div>

          </div>

          {/* 3. Dual-Axis Time Series Chart (날씨 vs 매출 추이) */}
          <div className="bg-white rounded-[32px] p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <CloudRain className="w-5 h-5 text-sky-500" /> 일자별 기상(강수량) 및 부문별 매출 연동 추이
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  강수량(Bar)과 전사 및 4대 부문 매출 라인을 동일 타임라인에서 교차 분석합니다.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-sky-400 rounded-xs"></span> 강수량(mm)</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-600 rounded-full"></span> 전사 총매출</span>
              </div>
            </div>

            <div className="h-[380px] w-full">
              <ReactECharts option={timeSeriesOption} style={{ height: '100%', width: '100%' }} notMerge={true} />
            </div>
          </div>

          {/* 4. Strategic Matrix Table (업장별 맑은날 vs 비온날 정밀 대조표) */}
          <div className="bg-white rounded-[32px] p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-500" /> 업장별 기상 탄력성 및 매출 변동 매트릭스 (SSOT)
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  맑은 날 대비 우천 시 일평균 매출 변동액과 증감률을 전 영업장 1:1 전수 비교합니다.
                </p>
              </div>

              {/* Table Controls: DayType, Category, Sort, Search */}
              <div className="flex flex-wrap items-center gap-2.5">
                
                {/* Day Type Toggle (전체 / 주중 / 휴일) */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setDayTypeFilter('TOTAL')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      dayTypeFilter === 'TOTAL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    전체 통합
                  </button>
                  <button
                    type="button"
                    onClick={() => setDayTypeFilter('WEEKDAY')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      dayTypeFilter === 'WEEKDAY' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    주중 (Weekday)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDayTypeFilter('HOLIDAY')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      dayTypeFilter === 'HOLIDAY' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    휴일 (Holiday)
                  </button>
                </div>

                {/* Category Filter */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-semibold focus:outline-hidden"
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
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-semibold focus:outline-hidden"
                >
                  <option value="impactRateAsc">취약도 높은순 (▼ 급감)</option>
                  <option value="impactRateDesc">수혜도 높은순 (▲ 증가)</option>
                  <option value="clearRevenue">맑은날 매출액순</option>
                  <option value="deltaRevenue">우천 손실액 큰순</option>
                </select>

                {/* Search */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="영업장명 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-700 focus:outline-hidden w-36 sm:w-44"
                  />
                </div>

              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 font-bold border-y border-slate-200">
                    <th className="py-3 px-4 rounded-l-xl">부문</th>
                    <th className="py-3 px-4">영업장명</th>
                    <th className="py-3 px-4 text-center">기상 민감도</th>
                    <th className="py-3 px-4 text-right">☀️ 맑은 날 일평균</th>
                    <th className="py-3 px-4 text-right">🌧️ 비 온 날 일평균</th>
                    <th className="py-3 px-4 text-right">우천 변동액 (Δ)</th>
                    <th className="py-3 px-4 text-right font-black">우천 증감률 (Δ%)</th>
                    <th className="py-3 px-4 text-center">주중 vs 휴일 변동</th>
                    <th className="py-3 px-4 text-right rounded-r-xl">강수 상관계수 (r)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVenues.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
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
                        <tr key={`${v.categoryCode}_${v.venueName}`} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 text-slate-500 font-semibold">{v.categoryName}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{v.venueName}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${sensitivity.bg}`}>
                              {sensitivity.text}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-financial text-slate-700">
                            {formatCurrency(clearRev)}원
                          </td>
                          <td className="py-3 px-4 text-right font-financial text-slate-900 font-semibold">
                            {formatCurrency(rainyRev)}원
                          </td>
                          <td className={`py-3 px-4 text-right font-financial font-bold ${deltaRev >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {deltaRev > 0 ? '+' : ''}{formatCurrency(deltaRev)}원
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md font-financial font-extrabold text-[11px] ${
                              impactRate >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                            }`}>
                              {impactRate >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                              {formatRate(impactRate)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2 text-[10px] font-financial">
                              <span className="text-slate-500">
                                주중: <strong className={v.weekday?.rainyImpactRate >= 0 ? 'text-emerald-600' : 'text-red-600'}>{formatRate(v.weekday?.rainyImpactRate)}</strong>
                              </span>
                              <span className="text-slate-300">|</span>
                              <span className="text-slate-500">
                                휴일: <strong className={v.holiday?.rainyImpactRate >= 0 ? 'text-emerald-600' : 'text-red-600'}>{formatRate(v.holiday?.rainyImpactRate)}</strong>
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-500 font-semibold">
                            {corr.toFixed(3)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 gap-2">
              <span>* 피어슨 상관계수(r): -1.0에 가까울수록 강수량 증가 시 매출 급감, +1.0에 가까울수록 강수량 증가 시 매출 동반 상승을 의미합니다.</span>
              <span className="font-bold text-slate-600">표시 업장: 총 {filteredVenues.length}개 업장</span>
            </div>
          </div>

          {/* 5. V6 기상 시뮬레이션: 강수·적설 대비 업장별 예상 매출 예측 (SSOT) */}
          <div className="bg-white rounded-[32px] p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
            {/* Header & Badges */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-sky-50 text-sky-700 text-xs font-bold px-3 py-1 rounded-full border border-sky-200 inline-flex items-center gap-1.5">
                    <Sparkles size={14} className="text-sky-600" /> V6 공식 기상 예측 시뮬레이터 (Zero-Variance SSOT)
                  </span>
                  {simData?.lyMonth && (
                    <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full border border-slate-200">
                      대조 기준: 전년 동월 ({simData.lyMonth}) 실측 일평균
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-sky-600" /> 기상 시뮬레이션: 강수·적설 대비 업장별 예상 매출 분석
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  선택한 대상 연월의 전년도(LY) 실측 주중·휴일 매출과 공식 기상 탄력성 모델(SSOT)을 대입하여 산출된 예측치입니다.
                </p>
              </div>

              {simLoading && (
                <div className="flex items-center gap-2 text-xs font-bold text-sky-600 bg-sky-50 px-3 py-1.5 rounded-xl border border-sky-200 animate-pulse">
                  <RefreshCw size={13} className="animate-spin" /> 기상 예측 모델 집계 중...
                </div>
              )}
            </div>

            {/* Simulation Parameter Controls */}
            <div className="bg-slate-50/90 rounded-2xl p-5 border border-slate-200/80 mb-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                
                {/* Month Picker */}
                <div className="md:col-span-5 flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Calendar size={14} className="text-sky-600" /> 시뮬레이션 대상 연월 (Target Month)
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="month" 
                      value={simMonth}
                      onChange={e => e.target.value && setSimMonth(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-sky-500 shadow-2xs"
                    />
                    <div className="flex items-center gap-1 text-[11px] font-bold">
                      {['2026-10', '2026-11', '2026-12', '2026-09'].map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setSimMonth(m)}
                          className={`px-2 py-1 rounded-lg border transition-all ${
                            simMonth === m ? 'bg-sky-600 text-white border-sky-600 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
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
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Layers size={14} className="text-indigo-600" /> 부문 필터 (Category)
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { code: 'ALL', name: '전체 부문' },
                      { code: 'GOLF', name: '골프' },
                      { code: 'TICKET', name: '레저본부' },
                      { code: 'FNB', name: '식음' },
                      { code: 'ROOM', name: '콘도' },
                    ].map(c => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => setSimCategory(c.code)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                          simCategory === c.code 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' 
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Sliders: Precipitation & Snowfall */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-slate-200/70">
                
                {/* Precipitation Slider */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <CloudRain size={16} className="text-sky-500" /> 주간 예상 강수량 (06~20시)
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-sky-50 text-sky-700 border border-sky-200">
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
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
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
                        className={`px-2 py-0.5 rounded-md font-semibold text-[10px] border transition-colors ${
                          simPrecipitation === p.val ? 'bg-sky-100 text-sky-800 border-sky-300 font-bold' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Snowfall Slider */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <CloudSnow size={16} className="text-indigo-500" /> 주간 예상 적설량 (06~20시)
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
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
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
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
                        className={`px-2 py-0.5 rounded-md font-semibold text-[10px] border transition-colors ${
                          simSnowfall === s.val ? 'bg-indigo-100 text-indigo-800 border-indigo-300 font-bold' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
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
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-xs text-red-700 flex items-center gap-2">
                <HelpCircle size={16} className="text-red-500 shrink-0" />
                <span>{simError}</span>
              </div>
            )}

            {/* Simulation Results (Grand Total & Chart) */}
            {simData && (
              <div className="space-y-6">
                
                {/* Grand Total Comparison Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* Weekday Forecast Card */}
                  <div className="bg-gradient-to-br from-sky-50/70 to-white p-6 rounded-2xl border border-sky-100 shadow-xs relative overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-sky-800 flex items-center gap-1.5">
                        <Activity size={16} className="text-sky-600" /> 주중 (평일) 일평균 예상 총매출
                      </span>
                      <span className="text-[11px] font-bold bg-sky-100 text-sky-800 px-2.5 py-0.5 rounded-full border border-sky-200">
                        월~목 & 일요일
                      </span>
                    </div>
                    <div className="flex items-baseline gap-3">
                      <div className="text-2xl font-black text-slate-900 font-financial">
                        {formatCurrency(simData.grandTotal?.forecastWeekdayRevenue)}원
                      </div>
                      <span className={`inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-md font-financial font-extrabold text-xs ${
                        (simData.grandTotal?.weekdayRevenueDelta ?? 0) >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {(simData.grandTotal?.weekdayRevenueDelta ?? 0) >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {formatRate(simData.grandTotal?.weekdayImpactRate)}
                      </span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-sky-100/80 flex items-center justify-between text-xs text-slate-500 font-financial">
                      <span>전년 동월({simData.lyMonth}) 실측 일평균: <strong>{formatCurrency(simData.grandTotal?.lyWeekdayAvgRevenue)}원</strong></span>
                      <span className={simData.grandTotal?.weekdayRevenueDelta >= 0 ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}>
                        변동: {simData.grandTotal?.weekdayRevenueDelta > 0 ? '+' : ''}{formatCurrency(simData.grandTotal?.weekdayRevenueDelta)}원
                      </span>
                    </div>
                  </div>

                  {/* Holiday Forecast Card */}
                  <div className="bg-gradient-to-br from-amber-50/70 to-white p-6 rounded-2xl border border-amber-100 shadow-xs relative overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                        <Activity size={16} className="text-amber-600" /> 휴일 (주말/공휴일) 일평균 예상 총매출
                      </span>
                      <span className="text-[11px] font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200">
                        금·토 & 공휴일
                      </span>
                    </div>
                    <div className="flex items-baseline gap-3">
                      <div className="text-2xl font-black text-slate-900 font-financial">
                        {formatCurrency(simData.grandTotal?.forecastHolidayRevenue)}원
                      </div>
                      <span className={`inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-md font-financial font-extrabold text-xs ${
                        (simData.grandTotal?.holidayRevenueDelta ?? 0) >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {(simData.grandTotal?.holidayRevenueDelta ?? 0) >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {formatRate(simData.grandTotal?.holidayImpactRate)}
                      </span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-amber-100/80 flex items-center justify-between text-xs text-slate-500 font-financial">
                      <span>전년 동월({simData.lyMonth}) 실측 일평균: <strong>{formatCurrency(simData.grandTotal?.lyHolidayAvgRevenue)}원</strong></span>
                      <span className={simData.grandTotal?.holidayRevenueDelta >= 0 ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}>
                        변동: {simData.grandTotal?.holidayRevenueDelta > 0 ? '+' : ''}{formatCurrency(simData.grandTotal?.holidayRevenueDelta)}원
                      </span>
                    </div>
                  </div>

                </div>

                {/* Category Pills Breakdown */}
                {simData.categories && simData.categories.length > 0 && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                    <div className="text-xs font-bold text-slate-600 mb-2.5 flex items-center gap-1.5">
                      <Layers size={14} className="text-slate-500" /> 부문별 예측 요약 ({simData.targetMonth})
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                      {simData.categories.map(cat => (
                        <div key={cat.categoryCode} className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                          <div className="text-xs font-bold text-slate-800 truncate mb-1">{cat.categoryName}</div>
                          <div className="text-[11px] text-slate-500 flex justify-between font-financial">
                            <span>주중:</span>
                            <span className={cat.weekdayRevenueDelta >= 0 ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>
                              {formatRate(cat.weekdayImpactRate)}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex justify-between font-financial">
                            <span>휴일:</span>
                            <span className={cat.holidayRevenueDelta >= 0 ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>
                              {formatRate(cat.holidayImpactRate)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ECharts Chart: Venues Weekday vs Holiday */}
                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/80">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <BarChart3 size={16} className="text-sky-600" /> 영업장별 예상 매출 비교 (주중 vs 휴일)
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        전년 동월 실측 대비 기상 조건({simPrecipitation > 0 ? `강수 ${simPrecipitation}mm` : ''}{simPrecipitation > 0 && simSnowfall > 0 ? ', ' : ''}{simSnowfall > 0 ? `적설 ${simSnowfall}cm` : ''}{simPrecipitation === 0 && simSnowfall === 0 ? '맑음' : ''}) 대입 결과
                      </p>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-slate-200/70 p-1 rounded-xl text-xs font-bold border border-slate-300/60">
                      <button
                        type="button"
                        onClick={() => setSimViewMode('COMBINED')}
                        className={`px-3 py-1 rounded-lg transition-all ${
                          simViewMode === 'COMBINED' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        주중·휴일 통합
                      </button>
                      <button
                        type="button"
                        onClick={() => setSimViewMode('WEEKDAY')}
                        className={`px-3 py-1 rounded-lg transition-all ${
                          simViewMode === 'WEEKDAY' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        주중(평일) 집중
                      </button>
                      <button
                        type="button"
                        onClick={() => setSimViewMode('HOLIDAY')}
                        className={`px-3 py-1 rounded-lg transition-all ${
                          simViewMode === 'HOLIDAY' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
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
                    <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Layers size={14} className="text-indigo-600" /> 영업장별 정밀 예측 명세표 (총 {simulationVenues.length}개 업장)
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="업장명 검색..."
                          value={simSearchQuery}
                          onChange={e => setSimSearchQuery(e.target.value)}
                          className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:border-sky-500 w-36"
                        />
                      </div>
                      <select
                        value={simSortBy}
                        onChange={e => setSimSortBy(e.target.value as any)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-hidden"
                      >
                        <option value="weekdayDelta">주중 변동액순</option>
                        <option value="holidayDelta">휴일 변동액순</option>
                        <option value="name">업장명 가나다순</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-slate-100 rounded-2xl shadow-xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 text-slate-500 border-b border-slate-100 text-[11px]">
                          <th className="py-2.5 px-3 font-bold">부문</th>
                          <th className="py-2.5 px-3 font-bold">영업장명</th>
                          <th className="py-2.5 px-3 font-bold text-center">민감도</th>
                          <th className="py-2.5 px-3 font-bold text-right">주중 LY 실측</th>
                          <th className="py-2.5 px-3 font-bold text-right text-sky-800">주중 기상 예측</th>
                          <th className="py-2.5 px-3 font-bold text-right text-sky-800">주중 변동률</th>
                          <th className="py-2.5 px-3 font-bold text-right">휴일 LY 실측</th>
                          <th className="py-2.5 px-3 font-bold text-right text-amber-800">휴일 기상 예측</th>
                          <th className="py-2.5 px-3 font-bold text-right text-amber-800">휴일 변동률</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {simulationVenues.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-8 text-center text-slate-400 font-medium">
                              선택된 조건에 부합하는 업장이 없습니다.
                            </td>
                          </tr>
                        ) : (
                          simulationVenues.map(v => {
                            const badge = getSensitivityBadge(v.sensitivityTag, v.weekdayImpactRate);
                            return (
                              <tr key={`${v.categoryCode}_${v.venueName}`} className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-2.5 px-3 text-slate-500 font-medium">{v.categoryName}</td>
                                <td className="py-2.5 px-3 font-bold text-slate-900">{v.venueName}</td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                                    {badge.text}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-financial text-slate-500">
                                  {formatCurrency(v.lyWeekdayAvgRevenue)}원
                                </td>
                                <td className="py-2.5 px-3 text-right font-financial font-bold text-slate-900">
                                  {formatCurrency(v.forecastWeekdayRevenue)}원
                                </td>
                                <td className={`py-2.5 px-3 text-right font-financial font-extrabold ${v.weekdayRevenueDelta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {formatRate(v.weekdayImpactRate)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-financial text-slate-500">
                                  {formatCurrency(v.lyHolidayAvgRevenue)}원
                                </td>
                                <td className="py-2.5 px-3 text-right font-financial font-bold text-slate-900">
                                  {formatCurrency(v.forecastHolidayRevenue)}원
                                </td>
                                <td className={`py-2.5 px-3 text-right font-financial font-extrabold ${v.holidayRevenueDelta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
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
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[28px] p-8 text-white shadow-xl relative overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-indigo-500/30 text-indigo-300 text-xs font-bold px-3 py-1 rounded-full border border-indigo-400/30">
                경영진 전략 가이드 (Actionable SOP)
              </span>
            </div>
            <h3 className="text-xl font-bold flex items-center gap-2 mb-3">
              <Umbrella className="text-indigo-400" /> 우천 예보 시 리조트 수익 방어 및 소비 전이 극대화 방안
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div className="bg-white/10 rounded-2xl p-5 border border-white/10">
                <div className="text-amber-400 font-bold text-sm mb-2">① 실내 식음 & 룸 딜리버리 프로모션</div>
                <p className="text-xs text-slate-300 leading-relaxed break-keep">
                  우천 시 객실 매출(+13.2%)과 BHC 치킨(+12.3%), 쿠치나(+6.2%)의 실내 소비가 동반 증가하므로, 비 예보 24시간 전 투숙객 모바일 앱 및 카카오 알림톡으로 <strong>룸 딜리버리 세트 바우처</strong>를 집중 홍보하여 레저 손실을 상쇄합니다.
                </p>
              </div>
              <div className="bg-white/10 rounded-2xl p-5 border border-white/10">
                <div className="text-sky-400 font-bold text-sm mb-2">② 실외 레저 티켓 ➔ 실내 미디어/스파 전환권</div>
                <p className="text-xs text-slate-300 leading-relaxed break-keep">
                  사계절썰매장(-49.3%), 썸머랜드(-49.0%) 취소 고객을 방치하지 않고, <strong>미디어아트센터(+15.0% 굿즈 소비 촉진)</strong> 및 원더풀 스파 실내 이용권으로 현장 즉시 교환 옵션을 제공하여 고객 이탈을 원천 차단합니다.
                </p>
              </div>
              <div className="bg-white/10 rounded-2xl p-5 border border-white/10">
                <div className="text-emerald-400 font-bold text-sm mb-2">③ 골프장 주중 취소 사전 알림 & 방어</div>
                <p className="text-xs text-slate-300 leading-relaxed break-keep">
                  주중 그린피(-22.9%)는 비 예보 시 취소율이 높으나, 휴일(-7.7%)은 방어되므로, 주중 우천 예보 시 취소 위약금 면제 대신 <strong>클럽하우스 식음 이용권(2만원권)</strong>을 결합한 우천 라운딩 패키지로 당일 노쇼를 방어합니다.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
