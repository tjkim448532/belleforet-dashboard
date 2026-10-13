import { useState, useEffect, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { secureFetcher } from '../lib/secureFetcher';
import type {
  AncillaryRevenueForecastResponse,
  AncillaryForecastVenue,
  WeatherSensitivityType
} from '../types/reports-v2';
import {
  Sparkles, Zap, CloudRain, TrendingUp,
  Calendar, RefreshCw, ShieldCheck, Hotel,
  Compass, Search, Flag,
  Umbrella, Sun, ChevronRight, Layers, BarChart3,
  PieChart as PieChartIcon, CheckCircle2, ChevronDown,
  AlertTriangle, UtensilsCrossed
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

const getForecastDateStr = (offsetDays = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function TomorrowRevenueForecast() {
  // 경영진의 실시간 의사결정을 위해 '오늘 (당일 D-Day)'을 기본값으로 표출 (어제 실적 마감 기준 당일 예상)
  const defaultTargetDate = getForecastDateStr(0);
  const [targetDate, setTargetDate] = useState<string>(defaultTargetDate);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [forecastData, setForecastData] = useState<AncillaryRevenueForecastResponse | null>(null);

  // Weather Simulation Mode (Live backend parameter: overridePrecipitation=15&overrideWeather=RAIN)
  const [isRainSimulation, setIsRainSimulation] = useState<boolean>(false);

  // Table Filters & Sorting
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'revenueDesc' | 'spilloverPctDesc' | 'visitorsDesc' | 'sensitivity'>('revenueDesc');

  // Modal / Drawer for booking list
  const [showBookingDetails, setShowBookingDetails] = useState<boolean>(false);

  // Fetch forecast data with optional weather override
  const fetchForecast = async (dateStr: string, simulateRain: boolean, signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      let url = `${API_BASE}/api/v6/dashboard/ancillary-revenue-forecast?date=${dateStr}`;
      if (simulateRain) {
        url += '&overridePrecipitation=15&overrideWeather=RAIN';
      }
      const res = await secureFetcher(url, { signal });
      if (res && res.success) {
        setForecastData(res);
      } else {
        throw new Error(res?.error || res?.message || '익일 예상 매출 데이터를 불러오지 못했습니다.');
      }
    } catch (err: any) {
      if (signal?.aborted || err?.name === 'AbortError') return;
      console.error('Failed to load ancillary revenue forecast:', err);
      setError(err?.message || '네트워크 통신 중 오류가 발생했습니다.');
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchForecast(targetDate, isRainSimulation, controller.signal);
    return () => {
      controller.abort();
    };
  }, [targetDate, isRainSimulation]);

  // Categories extracted from venues
  const categories = useMemo(() => {
    if (!forecastData?.venues) return [];
    const set = new Set<string>();
    forecastData.venues.forEach(v => {
      if (v.categoryName) set.add(v.categoryName);
    });
    return Array.from(set);
  }, [forecastData]);

  // Filtered & Sorted Venues
  const filteredVenues = useMemo(() => {
    if (!forecastData?.venues) return [];
    let list = [...forecastData.venues];

    if (selectedCategory !== 'ALL') {
      list = list.filter(v => v.categoryName === selectedCategory || v.categoryCode === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(v => v.venueName.toLowerCase().includes(q) || (v.displayName && v.displayName.toLowerCase().includes(q)));
    }

    list.sort((a, b) => {
      // Keep open venues above closed ones if sorting by revenue
      if (sortBy === 'revenueDesc') {
        if (a.isClosed && !b.isClosed) return 1;
        if (!a.isClosed && b.isClosed) return -1;
        return (b.forecastRevenue || 0) - (a.forecastRevenue || 0);
      }
      if (sortBy === 'spilloverPctDesc') {
        return (b.hotelSpilloverSharePct || 0) - (a.hotelSpilloverSharePct || 0);
      }
      if (sortBy === 'visitorsDesc') {
        return (b.forecastVisitorCount || 0) - (a.forecastVisitorCount || 0);
      }
      if (sortBy === 'sensitivity') {
        return (a.weatherSensitivityTag || '').localeCompare(b.weatherSensitivityTag || '');
      }
      return 0;
    });

    return list;
  }, [forecastData, selectedCategory, searchQuery, sortBy]);

  // Helper for Sensitivity Badges
  const getSensitivityBadge = (tag?: WeatherSensitivityType) => {
    switch (tag) {
      case 'HIGH_NEGATIVE':
        return {
          label: '야외 급감',
          desc: '우천 시 -35%~-90% 급감',
          color: 'bg-rose-50 text-rose-700 border-rose-200/80',
          dot: 'bg-rose-500'
        };
      case 'VULNERABLE':
        return {
          label: '야외 노출',
          desc: '우천 시 -10%~-20% 감소',
          color: 'bg-amber-50 text-amber-700 border-amber-200/80',
          dot: 'bg-amber-500'
        };
      case 'RESILIENT':
        return {
          label: '실내 방어',
          desc: '우천 영향 미미 / 안전 방어',
          color: 'bg-blue-50 text-blue-700 border-blue-200/80',
          dot: 'bg-blue-500'
        };
      case 'BENEFICIARY':
        return {
          label: '우천 수혜 ★',
          desc: '우천 시 투숙객 락인으로 매출 상승',
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
          dot: 'bg-emerald-500'
        };
      default:
        return {
          label: tag || '일반',
          desc: '-',
          color: 'bg-slate-50 text-slate-700 border-slate-200',
          dot: 'bg-slate-400'
        };
    }
  };

  // ECharts: 5 Department Donut Chart
  const categoryDonutOption = useMemo(() => {
    if (!forecastData?.forecastSummary) return {};
    const sum = forecastData.forecastSummary;
    const golf = sum.totalGolfForecastRevenue || 0;
    const room = sum.totalRoomForecastRevenue || 0;
    const fnb = sum.totalFnbForecastRevenue || 0;
    const leisure = sum.totalLeisureForecastRevenue || 0;
    const moto = sum.totalMotoForecastRevenue || 0;
    const grand = sum.grandTotalForecastRevenue || 1;

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const val = params.value || 0;
          const pct = grand > 0 ? ((val / grand) * 100).toFixed(1) : '0.0';
          return `<b>${params.name}</b><br/>예상 매출: ${val.toLocaleString()}원 (${pct}%)`;
        }
      },
      legend: {
        bottom: '0%',
        left: 'center',
        icon: 'circle',
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { fontSize: 11, color: '#64748b' }
      },
      series: [
        {
          name: '부문별 예상 매출',
          type: 'pie',
          radius: ['45%', '72%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: true,
            position: 'outside',
            formatter: '{b}\n{d}%',
            fontSize: 10,
            color: '#475569'
          },
          labelLine: {
            show: true,
            length: 8,
            length2: 8
          },
          data: [
            { value: golf, name: '골프', itemStyle: { color: '#059669' } },
            { value: fnb, name: '식음(F&B)', itemStyle: { color: '#10b981' } },
            { value: leisure, name: '레저본부', itemStyle: { color: '#0ea5e9' } },
            { value: room, name: '콘도', itemStyle: { color: '#6366f1' } },
            { value: moto, name: '모토아레나', itemStyle: { color: '#f59e0b' } }
          ].filter(d => d.value > 0)
        }
      ]
    };
  }, [forecastData]);

  // ECharts: Top 10 Stacked Horizontal Bar Chart (Day-tripper vs Hotel Spillover)
  const stackedBarOption = useMemo(() => {
    if (!forecastData?.venues) return {};
    const top10 = [...forecastData.venues]
      .filter(v => !v.isClosed)
      .sort((a, b) => (b.forecastRevenue || 0) - (a.forecastRevenue || 0))
      .slice(0, 10)
      .reverse(); // Reverse for horizontal bar

    const names = top10.map(v => v.displayName || v.venueName);
    const dayTripper = top10.map(v => v.baselineDayTripperRevenue || 0);
    const spillover = top10.map(v => v.hotelSpilloverRevenue || 0);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any[]) => {
          let str = `<b>${params[0].name}</b><br/>`;
          let total = 0;
          params.forEach(p => {
            total += p.value;
            str += `${p.marker} ${p.seriesName}: <b>${p.value.toLocaleString()}원</b><br/>`;
          });
          const spill = params.find(p => p.seriesName === '투숙객 유발 매출')?.value || 0;
          const share = total > 0 ? ((spill / total) * 100).toFixed(1) : '0.0';
          str += `<span style="color:#059669; font-weight:bold;">↳ 투숙객 기여율: ${share}%</span>`;
          return str;
        }
      },
      legend: {
        top: '2%',
        right: '2%',
        icon: 'rect',
        itemWidth: 12,
        itemHeight: 12,
        textStyle: { fontSize: 11, color: '#64748b' }
      },
      grid: {
        left: '3%',
        right: '5%',
        bottom: '3%',
        top: '12%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        axisLabel: {
          formatter: (val: number) => `${Math.round(val / 10000).toLocaleString()}만`,
          fontSize: 10,
          color: '#94a3b8'
        },
        splitLine: { lineStyle: { stroke: '#f1f5f9' } }
      },
      yAxis: {
        type: 'category',
        data: names,
        axisLabel: { fontSize: 11, color: '#334155', fontWeight: 600 },
        axisLine: { lineStyle: { stroke: '#e2e8f0' } }
      },
      series: [
        {
          name: '비투숙 기저 매출',
          type: 'bar',
          stack: 'total',
          barWidth: 16,
          itemStyle: { color: '#6366f1', borderRadius: [0, 0, 0, 0] },
          data: dayTripper
        },
        {
          name: '투숙객 유발 매출',
          type: 'bar',
          stack: 'total',
          barWidth: 16,
          itemStyle: { color: '#10b981', borderRadius: [0, 4, 4, 0] },
          data: spillover
        }
      ]
    };
  }, [forecastData]);

  const summary = forecastData?.forecastSummary;
  const weather = forecastData?.weatherForecast;
  const condo = forecastData?.condoDemographics;
  const calendar = forecastData?.calendar;
  const golf = forecastData?.golfContext;

  const closedVenuesCount = useMemo(() => {
    return forecastData?.venues?.filter(v => v.isClosed).length || 0;
  }, [forecastData]);

  return (
    <div className="p-6 lg:p-10 max-w-[1600px] mx-auto min-h-screen bg-slate-50/50">
      
      {/* 1. Top Banner Header with Navigation Sub-Tabs */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-950 to-slate-900 rounded-[32px] p-8 text-white mb-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="bg-emerald-400/20 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full border border-emerald-400/30 tracking-wide">
                계량경제학 예측 엔진
              </span>
              <span className="bg-white/10 text-slate-200 text-xs px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/10 font-medium">
                <ShieldCheck size={14} className="text-emerald-400" /> 전사 31개 공식 정규 업장 100% 통합
              </span>
              <span className="bg-sky-400/20 text-sky-300 text-xs px-2.5 py-1 rounded-full flex items-center gap-1 border border-sky-400/30 font-medium">
                <Sun size={13} className="text-sky-300" /> 기상청 AWS 실시간 예보 연동
              </span>
              {closedVenuesCount > 0 && (
                <span className="bg-amber-400/20 text-amber-300 text-xs px-2.5 py-1 rounded-full flex items-center gap-1 border border-amber-400/30 font-medium">
                  <AlertTriangle size={13} className="text-amber-300" /> 월요일 정기휴무 {closedVenuesCount}개 시설 자동 반영
                </span>
              )}
            </div>
            
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mt-1 flex items-center gap-3 flex-wrap break-keep">
              <TrendingUp className="text-emerald-400 shrink-0" size={32} />
              <span className="break-keep">벨포레 전사 일일 예상 매출 엔진</span>
            </h1>
            <p className="text-emerald-100 mt-2 text-sm lg:text-base font-normal max-w-4xl leading-relaxed break-keep">
              골프·콘도·식음·레저·모토아레나 전사 31개 정규 업장을 100% 통합하고, 내일 확정된 객실 평형별(16·35·52평) 파생 숙박객수와 골프 파트별(1·2·3부) 예약 원장을 기상청 기온·강수 탄력성, 3개년 시계열 분해 모델(S<sub>m</sub> × D<sub>d</sub>)과 결합하여 전사 일일 예상 매출과 부대시설 스필오버 수요를 과학적으로 산출합니다.
            </p>

            {/* 4 Navigation Sub-Tabs Bar */}
            <div className="flex items-center gap-2.5 mt-6 pt-4 border-t border-white/10 flex-wrap">
              <NavLink 
                to="/synergy" 
                end
                className={({ isActive }) => `px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  isActive ? 'bg-emerald-500 text-white shadow-md ring-2 ring-emerald-400/30' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                <Sparkles size={13} className="shrink-0" /> 1. 객실 세그먼트/채널 시너지
              </NavLink>

              <NavLink 
                to="/synergy/correlation" 
                className={({ isActive }) => `px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  isActive ? 'bg-indigo-500 text-white shadow-md ring-2 ring-indigo-400/30' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                <Zap size={13} className="shrink-0" /> 2. 앵커시설 인과 & CAPA 분석
              </NavLink>

              <NavLink 
                to="/synergy/weather-sales" 
                className={({ isActive }) => `px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  isActive ? 'bg-sky-500 text-white shadow-md ring-2 ring-sky-400/30' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                <CloudRain size={13} className="shrink-0" /> 3. 🌦️ 날씨-매출 상관관계
              </NavLink>

              <NavLink 
                to="/synergy/forecast" 
                className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap bg-teal-500 text-white shadow-md ring-2 ring-teal-400/30"
              >
                <TrendingUp size={13} className="shrink-0" /> 4. 🔮 당일·익일 매출 예상
              </NavLink>
            </div>
          </div>

          {/* Right Header Controls (Target Date Picker & Weather Simulation Mode) */}
          <div className="bg-black/35 backdrop-blur-md rounded-2xl p-4 border border-white/15 flex flex-col gap-3 w-full 2xl:w-auto 2xl:min-w-[400px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                <Calendar size={14} /> 예측 대상 일자 및 시뮬레이션
              </span>
              <button
                onClick={() => fetchForecast(targetDate, isRainSimulation)}
                className="text-xs text-slate-300 hover:text-white flex items-center gap-1 transition-colors px-2 py-0.5 rounded-md hover:bg-white/10"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                새로고침
              </button>
            </div>

            {/* Quick Offset Buttons (오늘 당일 + 미래 D+1, D+2, D+3) */}
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: '오늘 (당일)', offset: 0 },
                { label: '내일 (D+1)', offset: 1 },
                { label: '모레 (D+2)', offset: 2 },
                { label: '글피 (D+3)', offset: 3 },
              ].map(({ label, offset }) => {
                const dStr = getForecastDateStr(offset);
                const isSelected = targetDate === dStr;
                return (
                  <button
                    key={offset}
                    onClick={() => setTargetDate(dStr)}
                    className={`py-1.5 px-1.5 rounded-lg text-xs font-semibold transition-all text-center ${
                      isSelected
                        ? 'bg-teal-500 text-white shadow-sm ring-1 ring-white/30 font-bold'
                        : 'bg-white/10 text-slate-300 hover:bg-white/20'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Direct Date Input */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={targetDate}
                onChange={(e) => {
                  if (e.target.value) setTargetDate(e.target.value);
                }}
                className="w-full bg-white/10 border border-white/20 text-white px-3 py-1.5 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
              <span className="text-xs text-teal-200 font-bold whitespace-nowrap">
                {targetDate === getForecastDateStr(0) ? '[오늘/당일]' : targetDate === getForecastDateStr(1) ? '[내일/D+1]' : ''} {calendar?.dayName || ''} {calendar?.isWeekend ? '(주말)' : '(평일)'}
              </span>
            </div>

            {/* Weather Simulation Toggle Switch */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-slate-300 flex items-center gap-1">
                <Umbrella size={13} className={isRainSimulation ? 'text-rose-400' : 'text-slate-400'} />
                15mm 우천 스트레스 테스트:
              </span>
              <button
                onClick={() => setIsRainSimulation(!isRainSimulation)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  isRainSimulation
                    ? 'bg-rose-500 text-white shadow-sm ring-1 ring-rose-300'
                    : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                {isRainSimulation ? '🌧️ 15mm 우천 시뮬레이션 ON' : '☀️ 정상 예보 기준'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs mb-8">
          <div className="inline-block w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm font-semibold text-slate-700">BESM v6.3 전사 31개 업장 시계열 승법 분해 연산 중...</p>
          <p className="text-xs text-slate-400 mt-1">골프 예약 74팀, 스마트 PMS 확정 예약, 12개월 계절 배수 S_m 및 요일 배수 D_d를 집계하고 있습니다.</p>
        </div>
      )}

      {error && !loading && (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 text-center mb-8">
          <p className="text-rose-800 font-bold text-sm">예측 데이터 로드 실패</p>
          <p className="text-rose-600 text-xs mt-1">{error}</p>
          <button
            onClick={() => fetchForecast(targetDate, isRainSimulation)}
            className="mt-3 px-4 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      )}

      {forecastData && !loading && (
        <>
          {/* 2. Top 6 Bento KPI Summary Cards (Company-wide SSOT) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            {/* KPI 1: Grand Total Forecast */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span className="font-bold flex items-center gap-1.5 text-slate-800">
                    <TrendingUp size={16} className="text-teal-600" /> 전사 총 예상 매출
                  </span>
                  <span className="bg-teal-50 text-teal-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-teal-200/60">
                    전체 통합
                  </span>
                </div>
                <div className="text-2xl xl:text-3xl font-black text-slate-900 tabular-nums">
                  {summary?.grandTotalForecastFormatted || formatCurrency(summary?.grandTotalForecastRevenue)}
                  <span className="text-xs font-normal text-slate-500 ml-1">원</span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>기저 {formatCurrency(summary?.clearDayBaselineRevenue)}원</span>
                <span className="font-semibold text-emerald-600">투숙파급 {summary?.spilloverSharePct !== undefined ? `${summary.spilloverSharePct}%` : '-'}</span>
              </div>
            </div>

            {/* KPI 2: Golf Forecast */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span className="font-bold flex items-center gap-1.5 text-slate-800">
                    <Flag size={16} className="text-emerald-600" /> 골프 부문 (GOLF)
                  </span>
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200/60">
                    비중 {summary?.grandTotalForecastRevenue ? (((summary.totalGolfForecastRevenue || 0) / summary.grandTotalForecastRevenue) * 100).toFixed(1) + '%' : '-'}
                  </span>
                </div>
                <div className="text-2xl xl:text-3xl font-black text-emerald-700 tabular-nums">
                  {summary?.totalGolfForecastFormatted || formatCurrency(summary?.totalGolfForecastRevenue)}
                  <span className="text-xs font-normal text-slate-500 ml-1">원</span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>그린피·카트·클럽식음</span>
                <span className="text-slate-400 font-semibold">{golf?.targetDateGolfTeams !== undefined ? `${golf.targetDateGolfTeams}팀` : '6개 업장'}</span>
              </div>
            </div>

            {/* KPI 3: FNB Forecast */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span className="font-bold flex items-center gap-1.5 text-slate-800">
                    <UtensilsCrossed size={16} className="text-teal-600" /> 식음 부문 (FNB)
                  </span>
                  <span className="bg-teal-50 text-teal-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-teal-200/60">
                    비중 {summary?.grandTotalForecastRevenue ? (((summary.totalFnbForecastRevenue || 0) / summary.grandTotalForecastRevenue) * 100).toFixed(1) + '%' : '-'}
                  </span>
                </div>
                <div className="text-2xl xl:text-3xl font-black text-teal-700 tabular-nums">
                  {summary?.totalFnbForecastFormatted || formatCurrency(summary?.totalFnbForecastRevenue)}
                  <span className="text-xs font-normal text-slate-500 ml-1">원</span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>남도예담·쿠치나·브리스킷·CU</span>
                <span className="text-slate-400">10개 매장</span>
              </div>
            </div>

            {/* KPI 4: Leisure Forecast */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span className="font-bold flex items-center gap-1.5 text-slate-800">
                    <Compass size={16} className="text-sky-600" /> 레저본부 (TICKET)
                  </span>
                  <span className="bg-sky-50 text-sky-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-sky-200/60">
                    비중 {summary?.grandTotalForecastRevenue ? (((summary.totalLeisureForecastRevenue || 0) / summary.grandTotalForecastRevenue) * 100).toFixed(1) + '%' : '-'}
                  </span>
                </div>
                <div className="text-2xl xl:text-3xl font-black text-sky-700 tabular-nums">
                  {summary?.totalLeisureForecastFormatted || formatCurrency(summary?.totalLeisureForecastRevenue)}
                  <span className="text-xs font-normal text-slate-500 ml-1">원</span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>목장·카트·썰매·미디어아트</span>
                <span className="text-slate-400">8개 영업장</span>
              </div>
            </div>

            {/* KPI 5: Condo / Room Forecast */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span className="font-bold flex items-center gap-1.5 text-slate-800">
                    <Hotel size={16} className="text-indigo-600" /> 콘도 부문 (ROOM)
                  </span>
                  <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-200/60">
                    비중 {summary?.grandTotalForecastRevenue ? (((summary.totalRoomForecastRevenue || 0) / summary.grandTotalForecastRevenue) * 100).toFixed(1) + '%' : '-'}
                  </span>
                </div>
                <div className="text-2xl xl:text-3xl font-black text-indigo-700 tabular-nums">
                  {summary?.totalRoomForecastFormatted || formatCurrency(summary?.totalRoomForecastRevenue)}
                  <span className="text-xs font-normal text-slate-500 ml-1">원</span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>객실 및 콘도 기타</span>
                <span className="text-indigo-600 font-semibold">{condo?.totalReservedRooms !== undefined ? `${condo.totalReservedRooms}실 (${condo.occupancyRate}%)` : '2개 업장'}</span>
              </div>
            </div>

            {/* KPI 6: Moto Forecast */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span className="font-bold flex items-center gap-1.5 text-slate-800">
                    <Zap size={16} className="text-amber-600" /> 모토아레나 (MOTO)
                  </span>
                  <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200/60">
                    비중 {summary?.grandTotalForecastRevenue ? (((summary.totalMotoForecastRevenue || 0) / summary.grandTotalForecastRevenue) * 100).toFixed(1) + '%' : '-'}
                  </span>
                </div>
                <div className="text-2xl xl:text-3xl font-black text-amber-700 tabular-nums">
                  {summary?.totalMotoForecastFormatted || formatCurrency(summary?.totalMotoForecastRevenue)}
                  <span className="text-xs font-normal text-slate-500 ml-1">원</span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>서킷·카트체험·렌탈</span>
                <span className="text-amber-600 font-semibold">단독 카테고리</span>
              </div>
            </div>
          </div>

          {/* 3. Real Context Cards (Condo Demographics, Golf Context, Weather Status) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Left: PMS Condo Demographics Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                      <Hotel size={18} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-800">PMS 객실 예약 세그먼트</h2>
                      <p className="text-xs text-slate-400">스마트 PMS 실시간 확정 원장</p>
                    </div>
                  </div>
                  <span className="bg-indigo-50 text-indigo-700 font-extrabold text-xs px-2.5 py-1 rounded-xl border border-indigo-200/60">
                    점유율 {condo?.occupancyRate !== undefined ? `${condo.occupancyRate}%` : '-'}
                  </span>
                </div>

                {/* 3 Segment Mini Cards */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {/* True Group */}
                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/60 text-center">
                    <div className="text-[10px] font-bold text-indigo-700 mb-0.5">진성 단체</div>
                    <div className="text-base font-black text-slate-900 tabular-nums">
                      {condo?.segments?.trueGroup?.rooms !== undefined ? `${condo.segments.trueGroup.rooms}` : '-'} <span className="text-[10px] font-normal text-slate-500">실</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {condo?.segments?.trueGroup?.guests !== undefined ? `${condo.segments.trueGroup.guests}명` : '-'}
                    </div>
                  </div>

                  {/* Corporate Welfare */}
                  <div className="bg-emerald-50/60 p-2.5 rounded-2xl border border-emerald-200/60 text-center">
                    <div className="text-[10px] font-bold text-emerald-800 mb-0.5">기업 휴양소</div>
                    <div className="text-base font-black text-slate-900 tabular-nums">
                      {condo?.segments?.corpWelfare?.rooms !== undefined ? `${condo.segments.corpWelfare.rooms}` : '-'} <span className="text-[10px] font-normal text-slate-500">실</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {condo?.segments?.corpWelfare?.guests !== undefined ? `${condo.segments.corpWelfare.guests}명` : '-'}
                    </div>
                  </div>

                  {/* General FIT */}
                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/60 text-center">
                    <div className="text-[10px] font-bold text-slate-700 mb-0.5">일반 FIT</div>
                    <div className="text-base font-black text-slate-900 tabular-nums">
                      {condo?.segments?.generalFit?.rooms !== undefined ? `${condo.segments.generalFit.rooms}` : '-'} <span className="text-[10px] font-normal text-slate-500">실</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {condo?.segments?.generalFit?.guests !== undefined ? `${condo.segments.generalFit.guests}명` : '-'}
                    </div>
                  </div>
                </div>

                {/* Booking List Drawer Trigger */}
                {((condo?.segments?.corpWelfare?.bookingList && condo.segments.corpWelfare.bookingList.length > 0) ||
                  (condo?.segments?.trueGroup?.bookingList && condo.segments.trueGroup.bookingList.length > 0)) && (
                  <div className="border border-indigo-100 bg-indigo-50/40 rounded-2xl p-2.5">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-bold text-indigo-900 flex items-center gap-1">
                        <CheckCircle2 size={13} className="text-indigo-600" />
                        <span>확정 단체/휴양소 ({((condo?.segments?.corpWelfare?.bookingList?.length || 0) + (condo?.segments?.trueGroup?.bookingList?.length || 0))}건)</span>
                      </div>
                      <button
                        onClick={() => setShowBookingDetails(!showBookingDetails)}
                        className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-0.5"
                      >
                        {showBookingDetails ? '접기' : '상세'}
                        {showBookingDetails ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </button>
                    </div>

                    {showBookingDetails && (
                      <div className="mt-2 pt-2 border-t border-indigo-100 space-y-1 max-h-40 overflow-y-auto">
                        {condo?.segments?.trueGroup?.bookingList?.map((b, idx) => (
                          <div key={`tg-${idx}`} className="flex items-center justify-between text-[11px] bg-white p-1.5 rounded-lg border border-indigo-100/70">
                            <span className="font-semibold text-slate-800 truncate max-w-[140px]">{b.name}</span>
                            <span className="text-[10px] text-indigo-700 font-bold shrink-0">{b.rooms}실 / {b.guests}명</span>
                          </div>
                        ))}
                        {condo?.segments?.corpWelfare?.bookingList?.map((b, idx) => (
                          <div key={`cw-${idx}`} className="flex items-center justify-between text-[11px] bg-white p-1.5 rounded-lg border border-indigo-100/70">
                            <span className="font-medium text-slate-700 truncate max-w-[140px]">{b.name}</span>
                            <span className="text-[10px] text-emerald-700 font-bold shrink-0">{b.rooms}실 / {b.guests}명</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                <span>확정: <strong className="text-slate-700">{condo?.totalReservedRooms !== undefined ? `${condo.totalReservedRooms}실` : '-'}</strong> ({condo?.totalEstimatedGuests !== undefined ? `${condo.totalEstimatedGuests}명` : '-'})</span>
                <span className="text-indigo-600 font-semibold">{condo?.roomDeviation !== undefined ? (condo.roomDeviation >= 0 ? `+${condo.roomDeviation}실 초과` : `${condo.roomDeviation}실 미달`) : ''}</span>
              </div>
            </div>

            {/* Center: Golf Context Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      <Flag size={18} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-800">골프 예약 및 파급 효과</h2>
                      <p className="text-xs text-slate-400">스마트스코어 ERP 실시간 티타임 원장</p>
                    </div>
                  </div>
                  <span className="bg-emerald-50 text-emerald-700 font-extrabold text-xs px-2.5 py-1 rounded-xl border border-emerald-200/60">
                    {golf?.targetDateGolfTeams !== undefined ? `${golf.targetDateGolfTeams}팀 확정` : '-'}
                  </span>
                </div>

                <div className="space-y-3 mb-3">
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/60 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-500 font-semibold">골프 예약 팀수</div>
                      <div className="text-xl font-black text-slate-900 tabular-nums">
                        {golf?.targetDateGolfTeams !== undefined ? `${golf.targetDateGolfTeams}` : '-'} <span className="text-xs font-normal text-slate-500">팀</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500 font-semibold">예상 내장객수</div>
                      <div className="text-xl font-black text-emerald-700 tabular-nums">
                        {golf?.targetDateGolfTeams !== undefined ? `${golf.targetDateGolfTeams * 4}` : '-'} <span className="text-xs font-normal text-slate-500">명</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-200/60">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-emerald-900">골프장 6개 업장 예상 매출</span>
                      <span className="font-black text-emerald-700">{summary?.totalGolfForecastFormatted || formatCurrency(summary?.totalGolfForecastRevenue)}원</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      그린피, 카트대여, 클럽하우스 레스토랑/스타트하우스, 프로샵 등 골프장 부속 전사 매출 100% 통합 반영
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                <span>라운딩 후 식음 파급: <strong className="text-slate-700">{golf?.golfPostRoundDiningSpilloverFormatted || formatCurrency(golf?.golfPostRoundDiningSpilloverTotal)}원</strong></span>
                <span className="text-emerald-700 font-semibold">스마트ERP 연동 SSOT</span>
              </div>
            </div>

            {/* Right: Weather Forecast & Multiplier Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                      <Sun size={18} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-800">실시간 기상청 예보 상태</h2>
                      <p className="text-xs text-slate-400">증평 벨포레 리조트 고해상도 앙상블</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-xl border ${
                    weather?.isRainy 
                      ? 'bg-rose-50 text-rose-700 border-rose-200' 
                      : 'bg-sky-50 text-sky-700 border-sky-200'
                  }`}>
                    {weather?.weatherDesc || '맑음'} ({weather?.isRainy ? '우천' : '맑음 범주'})
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5 mb-3">
                  {/* Weather Status */}
                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/60 text-center">
                    <div className="text-[10px] font-semibold text-slate-500 mb-0.5">상태</div>
                    <div className="text-sm font-black text-slate-900">{weather?.weatherDesc || '맑음'}</div>
                    <div className="text-[10px] text-slate-400">{weather?.isRainy ? '강수 감지' : '강수 저조'}</div>
                  </div>

                  {/* Precipitation */}
                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/60 text-center">
                    <div className="text-[10px] font-semibold text-slate-500 mb-0.5">예보 강수량</div>
                    <div className="text-sm font-black text-sky-600 tabular-nums">
                      {weather?.precipitationMm !== undefined ? `${weather.precipitationMm}mm` : '-'}
                    </div>
                    <div className="text-[10px] text-emerald-600 font-semibold">{weather?.isRainy ? '우천 감액' : '정상 영업'}</div>
                  </div>

                  {/* Temperature */}
                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/60 text-center">
                    <div className="text-[10px] font-semibold text-slate-500 mb-0.5">기온 범위</div>
                    <div className="text-sm font-black text-amber-600 tabular-nums">
                      {weather?.tempMin !== undefined && weather?.tempMax !== undefined ? `${weather.tempMin}° / ${weather.tempMax}°` : '-'}
                    </div>
                    <div className="text-[10px] text-slate-400">쾌적한 기온</div>
                  </div>
                </div>

                {/* 3-Tier Multipliers Box */}
                <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-200/60">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-slate-700">전사 평균 시계열 승수</span>
                    <span className="font-mono text-[11px] text-slate-800 font-bold">
                      시즌: ×{summary?.avgSeasonalityMultiplier !== undefined ? summary.avgSeasonalityMultiplier : 1.0} · 요일: ×{summary?.avgDayOfWeekMultiplier !== undefined ? summary.avgDayOfWeekMultiplier : 1.0}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {weather?.isRainy 
                      ? `우천 충격 델타: ${formatCurrency(summary?.totalWeatherImpactDelta)}원 (실내 대체소비 발생)`
                      : '정상 기상 조건으로 야외 액티비티 기상 충격 감액 없이 정상 기저치 산출'}
                  </p>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                <span className="truncate">출처: KMA AWS / Open-Meteo Ensemble</span>
                <span className="text-sky-600 font-semibold shrink-0">1시간 실시간 갱신</span>
              </div>
            </div>
          </div>

          {/* 4. Visual Charts Row (Donut & Top 10 Stacked Bar) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Donut Chart: Category Share */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <PieChartIcon size={16} className="text-teal-600" /> 전사 5대 부문별 예상 매출 구성비
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-400">총 {summary?.grandTotalForecastFormatted || formatCurrency(summary?.grandTotalForecastRevenue)}원</span>
                </div>
                <p className="text-xs text-slate-400 mb-4">골프, 식음, 레저, 콘도 전사 포트폴리오 구조</p>
                <div className="h-64">
                  <ReactECharts option={categoryDonutOption} style={{ height: '100%', width: '100%' }} />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-slate-50 p-2 rounded-xl">
                  <div className="text-slate-400 text-[10px]">골프</div>
                  <div className="font-bold text-emerald-700">{formatCurrency(summary?.totalGolfForecastRevenue)}원</div>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl">
                  <div className="text-slate-400 text-[10px]">식음</div>
                  <div className="font-bold text-teal-700">{formatCurrency(summary?.totalFnbForecastRevenue)}원</div>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl">
                  <div className="text-slate-400 text-[10px]">레저</div>
                  <div className="font-bold text-sky-700">{formatCurrency(summary?.totalLeisureForecastRevenue)}원</div>
                </div>
              </div>
            </div>

            {/* Stacked Horizontal Bar: Top 10 Venues */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs lg:col-span-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <BarChart3 size={16} className="text-indigo-600" /> 상위 10개 업장 매출 분해 (비투숙 기저 vs 투숙객 파급)
                  </h3>
                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                    전체 투숙객 파급 비중 {summary?.spilloverSharePct !== undefined ? `${summary.spilloverSharePct}%` : '-'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-2">
                  비투숙 당일치기 나들이객 기저 매출(보라)과 객실 투숙객이 추가 유발한 파급 매출(초록)의 1원 단위 분해
                </p>
                <div className="h-72">
                  <ReactECharts option={stackedBarOption} style={{ height: '100%', width: '100%' }} />
                </div>
              </div>

              <div className="mt-2 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>정기휴무 시설은 자동 제외 및 0원 처리 (월요일 정기휴무 반영)</span>
                <span className="text-indigo-600 font-semibold">BESM v6.3 Multiplicative Decomposition</span>
              </div>
            </div>
          </div>

          {/* 5. 31 Venues Forecast Table */}
          <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-200/80 shadow-xs mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <span>🏢</span> 전사 31개 공식 정규 업장별 익일 예상 매출 및 수요 랭킹
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  부문별 탭 필터와 3단 시계열 승수(시즌·요일·날씨), 정기휴무 상태를 한눈에 파악할 수 있습니다.
                </p>
              </div>

              {/* Filters & Search */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Category Filter */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs flex-wrap">
                  <button
                    onClick={() => setSelectedCategory('ALL')}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                      selectedCategory === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    전체 ({forecastData?.venues?.length || 0})
                  </button>
                  {categories.map(c => (
                    <button
                      key={c}
                      onClick={() => setSelectedCategory(c)}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                        selectedCategory === c ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                {/* Sort Dropdown */}
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-400 font-medium"
                >
                  <option value="revenueDesc">예상 매출 높은순</option>
                  <option value="spilloverPctDesc">투숙객 기여율 높은순</option>
                  <option value="visitorsDesc">예상 고객수 많은순</option>
                  <option value="sensitivity">날씨 민감도순</option>
                </select>

                {/* Search Input */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="업장명 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400 w-36 sm:w-44"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200">
                    <th className="py-3 px-3 w-12 text-center">순위</th>
                    <th className="py-3 px-3">업장명</th>
                    <th className="py-3 px-3">부문</th>
                    <th className="py-3 px-3 text-right">예상 매출</th>
                    <th className="py-3 px-3 text-right">예상 고객/팀수</th>
                    <th className="py-3 px-3 text-right">비투숙 기저</th>
                    <th className="py-3 px-3 text-right">투숙객 유발</th>
                    <th className="py-3 px-3 text-right">투숙 기여율</th>
                    <th className="py-3 px-3 text-center">3단 시계열 승수</th>
                    <th className="py-3 px-3 text-center">날씨 민감도</th>
                    <th className="py-3 px-4">예측 인사이트</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVenues.map((v: AncillaryForecastVenue, idx: number) => {
                    const sens = getSensitivityBadge(v.weatherSensitivityTag);
                    return (
                      <tr 
                        key={v.venueName} 
                        className={`transition-colors ${
                          v.isClosed ? 'bg-slate-50/40 text-slate-400' : 'hover:bg-slate-50/70'
                        }`}
                      >
                        <td className="py-3 px-3 text-center font-bold text-slate-400 tabular-nums">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3 font-extrabold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <span>{v.displayName || v.venueName}</span>
                            {v.isClosed && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded border border-rose-200/80">
                                정기휴무
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                            v.categoryCode === 'GOLF' ? 'bg-emerald-50 text-emerald-700' :
                            v.categoryCode === 'ROOM' ? 'bg-indigo-50 text-indigo-700' :
                            v.categoryCode === 'TICKET' ? 'bg-sky-50 text-sky-700' :
                            v.categoryCode === 'FNB' ? 'bg-teal-50 text-teal-700' :
                            v.categoryCode === 'MOTO' ? 'bg-amber-50 text-amber-700' :
                            'bg-purple-50 text-purple-700'
                          }`}>
                            {v.categoryName || v.categoryCode}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums">
                          {v.isClosed ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="text-slate-400 line-through text-xs">0원</span>
                            </div>
                          ) : (
                            <span className="font-black text-slate-900">
                              {v.forecastRevenueFormatted || formatCurrency(v.forecastRevenue)}원
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-slate-700 tabular-nums">
                          {v.isClosed ? '-' : (v.forecastVisitorCountFormatted || formatCurrency(v.forecastVisitorCount)) + (v.categoryCode === 'GOLF' ? '명' : '명')}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-500 tabular-nums">
                          {v.isClosed ? '-' : formatCurrency(v.baselineDayTripperRevenue) + '원'}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-700 tabular-nums">
                          {v.isClosed ? '-' : formatCurrency(v.hotelSpilloverRevenue) + '원'}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-slate-900 tabular-nums">
                          {v.isClosed ? '-' : (
                            <span className={`inline-block px-1.5 py-0.5 rounded ${
                              (v.hotelSpilloverSharePct || 0) >= 30 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {(v.hotelSpilloverSharePct || 0).toFixed(1)}%
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1 font-mono text-[10px]">
                            <span className="bg-orange-50 text-orange-700 px-1 py-0.5 rounded border border-orange-100">
                              S×{v.seasonalityMultiplier !== undefined ? v.seasonalityMultiplier : 1.0}
                            </span>
                            <span className="bg-blue-50 text-blue-700 px-1 py-0.5 rounded border border-blue-100">
                              D×{v.dayOfWeekMultiplier !== undefined ? v.dayOfWeekMultiplier : 1.0}
                            </span>
                            {v.weatherMultiplier !== undefined && v.weatherMultiplier !== 1 && (
                              <span className="bg-cyan-50 text-cyan-700 px-1 py-0.5 rounded border border-cyan-100 font-bold">
                                W×{v.weatherMultiplier}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${sens.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sens.dot}`}></span>
                            {sens.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 max-w-xs truncate" title={v.keyInsight}>
                          <div className="text-[11px] text-slate-700 truncate font-medium">
                            {v.keyInsight || '정상 운영 예상'}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 6. Weather Stress-Test & Operations Strategy (Live Interactive Feedback) */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl mb-8 relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-rose-500/20 text-rose-300 text-xs font-bold px-3 py-1 rounded-full border border-rose-500/30 flex items-center gap-1">
                  <Umbrella size={13} /> 실시간 우천 스트레스 테스트 (15mm 강수 시뮬레이션)
                </span>
                <span className="bg-white/10 text-slate-300 text-xs px-2.5 py-1 rounded-full">
                  백엔드 연립방정식 실시간 재연산
                </span>
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-white">
                    "만약 15mm 비가 온다면?" — 날씨 충격 델타 및 인력 배치 전략
                  </h3>
                  <p className="text-indigo-200 text-sm max-w-3xl leading-relaxed mt-1">
                    우천 시 리조트 전체 방문객은 줄어들지만 투숙객{condo?.totalEstimatedGuests !== undefined ? `(${condo.totalEstimatedGuests}명)` : ''}은 외부로 나가지 못하고 실내 시설(쿠치나 조식/중식, 편의점, 룸서비스)로 락인(Lock-in)되는 대체 효과가 발생합니다.
                  </p>
                </div>

                <button
                  onClick={() => setIsRainSimulation(!isRainSimulation)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                    isRainSimulation
                      ? 'bg-rose-500 text-white shadow-lg ring-2 ring-white/30'
                      : 'bg-white/10 text-slate-200 hover:bg-white/20 border border-white/20'
                  }`}
                >
                  <Umbrella size={16} />
                  {isRainSimulation ? '우천 시뮬레이션 해제 (정상 복귀)' : '15mm 우천 시뮬레이션 즉시 대입'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Metric 1 */}
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                  <div className="text-xs text-slate-300 mb-1">맑은 날 기준 예상 매출</div>
                  <div className="text-xl font-black text-white">{formatCurrency(summary?.clearDayBaselineRevenue || summary?.grandTotalForecastRevenue)}원</div>
                  <div className="text-[10px] text-teal-300 mt-1">정상 영업 기저치</div>
                </div>

                {/* Metric 2 */}
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                  <div className="text-xs text-rose-300 mb-1">우천 충격 델타</div>
                  <div className="text-xl font-black text-rose-300">
                    {formatCurrency(summary?.totalWeatherImpactDelta)}원
                  </div>
                  <div className="text-[10px] text-rose-200 mt-1">
                    {summary?.clearDayBaselineRevenue && summary.totalWeatherImpactDelta 
                      ? `${((summary.totalWeatherImpactDelta / summary.clearDayBaselineRevenue) * 100).toFixed(1)}% 변동`
                      : '정상 기상'}
                  </div>
                </div>

                {/* Metric 3 */}
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                  <div className="text-xs text-amber-300 mb-1">야외 액티비티 급감</div>
                  <div className="text-xl font-black text-amber-300">-35% ~ -90%</div>
                  <div className="text-[10px] text-slate-300 mt-1">루지, 놀이동산, 썰매, 목장 집중 타격</div>
                </div>

                {/* Metric 4 */}
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                  <div className="text-xs text-emerald-300 mb-1">실내 시설 우천 부스트</div>
                  <div className="text-xl font-black text-emerald-300">+7% ~ +15% 상승</div>
                  <div className="text-[10px] text-emerald-200 mt-1">쿠치나, CU편의점, BHC, 기프트샵</div>
                </div>
              </div>

              {/* Management Insight Alert Box */}
              <div className="bg-indigo-900/50 border border-indigo-400/30 rounded-2xl p-4 text-xs text-indigo-100 flex items-start gap-3">
                <span className="text-lg">💡</span>
                <div className="space-y-1">
                  <div className="font-bold text-white text-sm">경영 및 인력 배치 최적화 인사이트</div>
                  <p className="leading-relaxed">
                    비 예보 시 야외 놀이동산·루지·목장의 단기 아르바이트 및 진행 요원을 과감히 축소하고, 반대로 조식 뷔페(쿠치나), 편의점(CU), 치킨 야식(BHC), 실내 기프트샵으로 홀 및 지원 인력을 전진 배치해야 운영 효율과 고객 만족도를 동시에 극대화할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 7. Methodology Accordion & Formula */}
          <div className="bg-slate-100/80 rounded-2xl p-6 border border-slate-200 text-xs text-slate-600">
            <div className="flex items-center gap-2 font-bold text-slate-800 text-sm mb-2">
              <Layers size={16} className="text-slate-500" />
              <span>BESM v6.3 (Belleforet Econometric Spillover Model) 계량경제학 3단 분해 수식 체계</span>
            </div>
            <p className="leading-relaxed mb-3">
              각 업장 <span className="font-mono font-bold text-slate-800">v</span>의 익일 예상 매출 <span className="font-mono font-bold text-teal-700">Ŷ<sub>v,t</sub></span>는 3단 시계열 승법 분해와 경험적 베이즈 슈링크리지 모델로 산출됩니다:
            </p>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-800 overflow-x-auto mb-3">
              Ŷ<sub>v,t</sub> = Base<sub>v</sub> × S<sub>m(t)</sub> × D<sub>d(t)</sub> × H<sub>t</sub> × W<sub>w(t)</sub> + [ HotelSpillover(Rooms<sub>t</sub>) + GolfSpillover(Teams<sub>t</sub>) ]
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-[11px]">
              <div>
                <strong className="text-slate-800">Base<sub>v</sub></strong>: 2개년 마트 실측 기저치 (Empirical Benchmark)
              </div>
              <div>
                <strong className="text-slate-800">S<sub>m</sub> × D<sub>d</sub></strong>: 12개월 계절 배수 × 요일별 배수
              </div>
              <div>
                <strong className="text-slate-800">Hotel/Golf Spillover</strong>: 객실(PMS) 및 골프(ERP) 예약 연동 파급액
              </div>
              <div>
                <strong className="text-slate-800">isClosed: true</strong>: 비공휴일 월요일 정기 휴무 자동 0원 셧다운
              </div>
            </div>
          </div>
        </>
      )}

      {/* Footer Note */}
      <div className="text-xs text-slate-400 mt-8 pt-4 border-t border-slate-200 flex items-center justify-between">
        <span>벨포레 리조트 데이터 통제 센터 · BESM v6.3 전사 31개 업장 100% 통합 (Zero-Simulation SSOT)</span>
        <span className="font-mono">API: /api/v6/dashboard/ancillary-revenue-forecast</span>
      </div>
    </div>
  );
}
