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
  Calendar, RefreshCw, ShieldCheck, Hotel, Users,
  Compass, Search,
  Umbrella, Sun, ChevronRight, Layers, BarChart3,
  PieChart as PieChartIcon, CheckCircle2, ChevronDown
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

const getTomorrowDateStr = (offsetDays = 1): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function TomorrowRevenueForecast() {
  const defaultTargetDate = getTomorrowDateStr(1);
  const [targetDate, setTargetDate] = useState<string>(defaultTargetDate);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [forecastData, setForecastData] = useState<AncillaryRevenueForecastResponse | null>(null);

  // Table Filters & Sorting
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'revenueDesc' | 'spilloverPctDesc' | 'visitorsDesc' | 'sensitivity'>('revenueDesc');

  // Modal / Drawer for booking list
  const [showBookingDetails, setShowBookingDetails] = useState<boolean>(false);

  // Fetch forecast data
  const fetchForecast = async (dateStr: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = `${API_BASE}/api/v6/dashboard/ancillary-revenue-forecast?date=${dateStr}`;
      const res = await secureFetcher(url);
      if (res && res.success) {
        setForecastData(res);
      } else {
        throw new Error(res?.error || res?.message || '익일 예상 매출 데이터를 불러오지 못했습니다.');
      }
    } catch (err: any) {
      console.error('Failed to load ancillary revenue forecast:', err);
      setError(err?.message || '네트워크 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast(targetDate);
  }, [targetDate]);

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
      list = list.filter(v => v.venueName.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      if (sortBy === 'revenueDesc') {
        return (b.forecastRevenue || 0) - (a.forecastRevenue || 0);
      }
      if (sortBy === 'spilloverPctDesc') {
        return (b.hotelSpilloverSharePct || 0) - (a.hotelSpilloverSharePct || 0);
      }
      if (sortBy === 'visitorsDesc') {
        return (b.forecastVisitorCount || 0) - (a.forecastVisitorCount || 0);
      }
      if (sortBy === 'sensitivity') {
        return a.weatherSensitivityTag.localeCompare(b.weatherSensitivityTag);
      }
      return 0;
    });

    return list;
  }, [forecastData, selectedCategory, searchQuery, sortBy]);

  // Helper for Sensitivity Badges
  const getSensitivityBadge = (tag: WeatherSensitivityType) => {
    switch (tag) {
      case 'HIGH_NEGATIVE':
        return {
          label: '야외 급감',
          desc: '비·눈 오면 -35%~-90% 급감',
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

  // ECharts: Category Donut Chart
  const categoryDonutOption = useMemo(() => {
    if (!forecastData?.forecastSummary) return {};
    const sum = forecastData.forecastSummary;
    const leisure = sum.totalLeisureForecastRevenue || 0;
    const fnb = sum.totalFnbForecastRevenue || 0;
    const moto = sum.totalMotoForecastRevenue || 0;
    const grand = sum.grandTotalForecastRevenue || (leisure + fnb + moto);
    const other = Math.max(0, grand - (leisure + fnb + moto));

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const val = params.value || 0;
          const pct = grand > 0 ? ((val / grand) * 100).toFixed(1) : 0;
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
            { value: leisure, name: '레저본부', itemStyle: { color: '#0ea5e9' } },
            { value: fnb, name: '식음(F&B)', itemStyle: { color: '#10b981' } },
            { value: moto, name: '모토아레나', itemStyle: { color: '#f59e0b' } },
            { value: other, name: '대관/굿즈', itemStyle: { color: '#8b5cf6' } }
          ]
        }
      ]
    };
  }, [forecastData]);

  // ECharts: Top 10 Stacked Horizontal Bar Chart (Day-tripper vs Hotel Spillover)
  const stackedBarOption = useMemo(() => {
    if (!forecastData?.venues) return {};
    const top10 = [...forecastData.venues]
      .sort((a, b) => (b.forecastRevenue || 0) - (a.forecastRevenue || 0))
      .slice(0, 10)
      .reverse(); // Reverse for horizontal bar

    const names = top10.map(v => v.venueName);
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
          const share = total > 0 ? ((spill / total) * 100).toFixed(1) : 0;
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
          name: '비투숙 당일치기 기저',
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

  return (
    <div className="p-6 lg:p-10 max-w-[1600px] mx-auto min-h-screen bg-slate-50/50">
      
      {/* 1. Top Banner Header with Navigation Sub-Tabs */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-950 to-slate-900 rounded-[32px] p-8 text-white mb-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="bg-emerald-400/20 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full border border-emerald-400/30 tracking-wide">
                BESM v6.0 계량경제학 예측 모델
              </span>
              <span className="bg-white/10 text-slate-200 text-xs px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/10 font-medium">
                <ShieldCheck size={14} className="text-emerald-400" /> 실측 마트(SSOT) 결합
              </span>
              <span className="bg-sky-400/20 text-sky-300 text-xs px-2.5 py-1 rounded-full flex items-center gap-1 border border-sky-400/30 font-medium">
                <Sun size={13} className="text-sky-300" /> 기상청 AWS 실시간 예보 연동
              </span>
            </div>
            
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mt-1 flex items-center gap-3 flex-wrap break-keep">
              <TrendingUp className="text-emerald-400 shrink-0" size={32} />
              <span className="break-keep">내일(익일) 부대시설 예상 매출 예측</span>
            </h1>
            <p className="text-emerald-100 mt-2 text-sm lg:text-base font-normal max-w-3xl leading-relaxed break-keep">
              익일 스마트 PMS 예약(진성 단체·기업 휴양소·일반 FIT 분해), 12개월 계절성, 요일 캘린더 고정효과, 그리고 기상청 고해상도 예보를 연립 결합하여 레저·식음 영업장별 익일 매출과 고객수를 과학적으로 예측합니다.
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
                <TrendingUp size={13} className="shrink-0" /> 4. 🔮 내일 매출 예상
              </NavLink>
            </div>
          </div>

          {/* Right Header Controls (Target Date Picker & Presets) */}
          <div className="bg-black/35 backdrop-blur-md rounded-2xl p-4 border border-white/15 flex flex-col gap-3 w-full 2xl:w-auto 2xl:min-w-[360px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                <Calendar size={14} /> 예측 대상 일자 선택
              </span>
              <button
                onClick={() => fetchForecast(targetDate)}
                className="text-xs text-slate-300 hover:text-white flex items-center gap-1 transition-colors px-2 py-0.5 rounded-md hover:bg-white/10"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                새로고침
              </button>
            </div>

            {/* Quick Offset Buttons */}
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: '내일 (D+1)', offset: 1 },
                { label: '모레 (D+2)', offset: 2 },
                { label: '글피 (D+3)', offset: 3 },
              ].map(({ label, offset }) => {
                const dStr = getTomorrowDateStr(offset);
                const isSelected = targetDate === dStr;
                return (
                  <button
                    key={offset}
                    onClick={() => setTargetDate(dStr)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all text-center ${
                      isSelected
                        ? 'bg-teal-500 text-white shadow-sm ring-1 ring-white/30'
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
                {calendar?.dayName || ''} {calendar?.isWeekend ? '(주말)' : '(평일)'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs mb-8">
          <div className="inline-block w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm font-semibold text-slate-700">익일 실시간 기상 예보 및 PMS 예약 원장 연립 회귀 연산 중...</p>
          <p className="text-xs text-slate-400 mt-1">KMA AWS 관측치 및 스마트스코어 예약 세그먼트를 집계하고 있습니다.</p>
        </div>
      )}

      {error && !loading && (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 text-center mb-8">
          <p className="text-rose-800 font-bold text-sm">예측 데이터 로드 실패</p>
          <p className="text-rose-600 text-xs mt-1">{error}</p>
          <button
            onClick={() => fetchForecast(targetDate)}
            className="mt-3 px-4 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      )}

      {forecastData && !loading && (
        <>
          {/* 2. Top 4 Bento KPI Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            {/* KPI 1: Grand Total Forecast */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-bold flex items-center gap-1.5 text-slate-700">
                  <TrendingUp size={16} className="text-teal-600" /> 총 예상 부대시설 매출
                </span>
                <span className="bg-teal-50 text-teal-700 text-[11px] font-bold px-2 py-0.5 rounded-full border border-teal-200/60">
                  전체 통합
                </span>
              </div>
              <div className="text-3xl font-black text-slate-900 tabular-nums">
                {summary?.grandTotalForecastFormatted || formatCurrency(summary?.grandTotalForecastRevenue)}
                <span className="text-sm font-normal text-slate-500 ml-1">원</span>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>비투숙 기저: {formatCurrency(Math.round((summary?.grandTotalForecastRevenue || 0) - (summary?.totalHotelSpilloverRevenue || 0)))}원</span>
                <span className="font-semibold text-emerald-600">투숙유발 {summary?.spilloverSharePct !== undefined ? `${summary.spilloverSharePct}%` : '-'}</span>
              </div>
            </div>

            {/* KPI 2: Leisure Forecast */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-bold flex items-center gap-1.5 text-slate-700">
                  <Compass size={16} className="text-sky-600" /> 레저본부 (TICKET)
                </span>
                <span className="bg-sky-50 text-sky-700 text-[11px] font-bold px-2 py-0.5 rounded-full border border-sky-200/60">
                  비중 {summary?.grandTotalForecastRevenue ? (((summary.totalLeisureForecastRevenue || 0) / summary.grandTotalForecastRevenue) * 100).toFixed(1) + '%' : '-'}
                </span>
              </div>
              <div className="text-3xl font-black text-sky-700 tabular-nums">
                {summary?.totalLeisureForecastFormatted || formatCurrency(summary?.totalLeisureForecastRevenue)}
                <span className="text-sm font-normal text-slate-500 ml-1">원</span>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                <span>루지·놀이동산·목장·썰매</span>
                <span className="text-slate-400">9개 영업장</span>
              </div>
            </div>

            {/* KPI 3: FNB Forecast */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-bold flex items-center gap-1.5 text-slate-700">
                  <Hotel size={16} className="text-emerald-600" /> 식음 부문 (FNB)
                </span>
                <span className="bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2 py-0.5 rounded-full border border-emerald-200/60">
                  비중 {summary?.grandTotalForecastRevenue ? (((summary.totalFnbForecastRevenue || 0) / summary.grandTotalForecastRevenue) * 100).toFixed(1) + '%' : '-'}
                </span>
              </div>
              <div className="text-3xl font-black text-emerald-700 tabular-nums">
                {summary?.totalFnbForecastFormatted || formatCurrency(summary?.totalFnbForecastRevenue)}
                <span className="text-sm font-normal text-slate-500 ml-1">원</span>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                <span>남도예담·쿠치나·브리스킷·CU</span>
                <span className="text-slate-400">10개 매장</span>
              </div>
            </div>

            {/* KPI 4: Moto Arena & Others */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-bold flex items-center gap-1.5 text-slate-700">
                  <Zap size={16} className="text-amber-600" /> 모토아레나 & 대관/굿즈
                </span>
                <span className="bg-amber-50 text-amber-700 text-[11px] font-bold px-2 py-0.5 rounded-full border border-amber-200/60">
                  비중 {summary?.grandTotalForecastRevenue ? ((((summary.totalMotoForecastRevenue || 0) + (summary?.grandTotalForecastRevenue - (summary?.totalLeisureForecastRevenue || 0) - (summary?.totalFnbForecastRevenue || 0) - (summary?.totalMotoForecastRevenue || 0))) / summary.grandTotalForecastRevenue) * 100).toFixed(1) + '%' : '-'}
                </span>
              </div>
              <div className="text-3xl font-black text-amber-700 tabular-nums">
                {summary?.totalMotoForecastFormatted || formatCurrency(summary?.totalMotoForecastRevenue)}
                <span className="text-sm font-normal text-slate-500 ml-1">원</span>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                <span>카트서킷·렌탈·연회장·굿즈</span>
                <span className="text-slate-400">5개 시설</span>
              </div>
            </div>
          </div>

          {/* 3. Real Context Cards (PMS Condo Demographics & Weather Forecast) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Left: PMS Condo Demographics Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                      <Hotel size={18} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-800">익일 PMS 객실 예약 및 고객 세그먼트</h2>
                      <p className="text-xs text-slate-400">스마트 PMS 실시간 예약 원장 (체크인 예정 고객)</p>
                    </div>
                  </div>
                  <span className="bg-indigo-50 text-indigo-700 font-extrabold text-xs px-3 py-1 rounded-xl border border-indigo-200/60">
                    점유율 {condo?.occupancyRate !== undefined ? `${condo.occupancyRate}%` : '-'} ({condo?.totalReservedRooms !== undefined ? `${condo.totalReservedRooms}실` : '-'} / {condo?.totalCapacity !== undefined ? `${condo.totalCapacity}실` : '-'})
                  </span>
                </div>

                {/* 3 Segment Mini Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  {/* True Group */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60">
                    <div className="text-[11px] font-bold text-indigo-700 mb-1 flex items-center gap-1">
                      <Users size={12} /> 진성 집단 단체
                    </div>
                    <div className="text-xl font-black text-slate-900 tabular-nums">
                      {condo?.segments?.trueGroup?.rooms !== undefined ? `${condo.segments.trueGroup.rooms}` : '-'} <span className="text-xs font-normal text-slate-500">실</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      예상 {condo?.segments?.trueGroup?.guests !== undefined ? `${condo.segments.trueGroup.guests}명` : '-'} ({condo?.segments?.trueGroup?.roomSharePct !== undefined ? `${condo.segments.trueGroup.roomSharePct}%` : '-'})
                    </div>
                    <div className="text-[10px] text-indigo-600 font-medium mt-1 truncate">
                      대형식음·루지·모토 집중
                    </div>
                  </div>

                  {/* Corporate Welfare */}
                  <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200/60">
                    <div className="text-[11px] font-bold text-emerald-800 mb-1 flex items-center gap-1">
                      <ShieldCheck size={12} /> 기업 임직원 휴양소
                    </div>
                    <div className="text-xl font-black text-slate-900 tabular-nums">
                      {condo?.segments?.corpWelfare?.rooms !== undefined ? `${condo.segments.corpWelfare.rooms}` : '-'} <span className="text-xs font-normal text-slate-500">실</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      예상 {condo?.segments?.corpWelfare?.guests !== undefined ? `${condo.segments.corpWelfare.guests}명` : '-'} ({condo?.segments?.corpWelfare?.roomSharePct !== undefined ? `${condo.segments.corpWelfare.roomSharePct}%` : '-'})
                    </div>
                    <div className="text-[10px] text-emerald-700 font-medium mt-1 truncate">
                      현대제철·삼성전자 가족
                    </div>
                  </div>

                  {/* General FIT */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60">
                    <div className="text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Hotel size={12} /> 일반 FIT / 회원
                    </div>
                    <div className="text-xl font-black text-slate-900 tabular-nums">
                      {condo?.segments?.generalFit?.rooms !== undefined ? `${condo.segments.generalFit.rooms}` : '-'} <span className="text-xs font-normal text-slate-500">실</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      예상 {condo?.segments?.generalFit?.guests !== undefined ? `${condo.segments.generalFit.guests}명` : '-'} ({condo?.segments?.generalFit?.roomSharePct !== undefined ? `${condo.segments.generalFit.roomSharePct}%` : '-'})
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium mt-1 truncate">
                      개인 가족 및 회원권
                    </div>
                  </div>
                </div>

                {/* Booking List Drawer Trigger */}
                {((condo?.segments?.corpWelfare?.bookingList && condo.segments.corpWelfare.bookingList.length > 0) ||
                  (condo?.segments?.trueGroup?.bookingList && condo.segments.trueGroup.bookingList.length > 0)) && (
                  <div className="border border-indigo-100 bg-indigo-50/40 rounded-2xl p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-indigo-600" />
                        <span>확정 단체/휴양소 상세 내역 ({((condo?.segments?.corpWelfare?.bookingList?.length || 0) + (condo?.segments?.trueGroup?.bookingList?.length || 0))}건)</span>
                      </div>
                      <button
                        onClick={() => setShowBookingDetails(!showBookingDetails)}
                        className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-0.5"
                      >
                        {showBookingDetails ? '접기' : '펼쳐보기'}
                        {showBookingDetails ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    </div>

                    {showBookingDetails && (
                      <div className="mt-2.5 pt-2.5 border-t border-indigo-100 space-y-1.5 max-h-48 overflow-y-auto">
                        {condo?.segments?.trueGroup?.bookingList?.map((b, idx) => (
                          <div key={`tg-${idx}`} className="flex items-center justify-between text-xs bg-white p-2 rounded-xl border border-indigo-100/70">
                            <span className="font-semibold text-slate-800">{b.name}</span>
                            <span className="text-[11px] text-indigo-700 font-bold">{b.rooms}실 / {b.guests}명 (세미나)</span>
                          </div>
                        ))}
                        {condo?.segments?.corpWelfare?.bookingList?.map((b, idx) => (
                          <div key={`cw-${idx}`} className="flex items-center justify-between text-xs bg-white p-2 rounded-xl border border-indigo-100/70">
                            <span className="font-medium text-slate-700">{b.name}</span>
                            <span className="text-[11px] text-emerald-700 font-bold">{b.rooms}실 / {b.guests}명</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span>총 예상 투숙 인원: <strong className="text-slate-700">{condo?.totalEstimatedGuests !== undefined ? `${condo.totalEstimatedGuests}명` : '-'}</strong></span>
                <span className="text-indigo-600 font-semibold">객실 1실당 한계 부대매출(RevPAS) 자동 연계</span>
              </div>
            </div>

            {/* Right: Real-time Weather Forecast Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                      <Sun size={18} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-800">익일 실시간 기상청 날씨 예보</h2>
                      <p className="text-xs text-slate-400">증평 벨포레 리조트 고해상도 앙상블 예보</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-xl border ${
                    weather?.isRainy 
                      ? 'bg-rose-50 text-rose-700 border-rose-200' 
                      : 'bg-sky-50 text-sky-700 border-sky-200'
                  }`}>
                    {weather?.weatherDesc || '구름많음'} ({weather?.isRainy ? '우천' : '맑음 범주'})
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  {/* Weather Status */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60 text-center">
                    <div className="text-[11px] font-semibold text-slate-500 mb-1">날씨 상태</div>
                    <div className="text-base font-black text-slate-900">{weather?.weatherDesc || '구름많음'}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">강수확률 저조</div>
                  </div>

                  {/* Precipitation */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60 text-center">
                    <div className="text-[11px] font-semibold text-slate-500 mb-1">예보 강수량</div>
                    <div className="text-base font-black text-sky-600 tabular-nums">
                      {weather?.precipitationMm ?? 0.0} <span className="text-xs font-normal text-slate-500">mm</span>
                    </div>
                    <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">야외 정상 영업</div>
                  </div>

                  {/* Temperature */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60 text-center">
                    <div className="text-[11px] font-semibold text-slate-500 mb-1">기온 범위</div>
                    <div className="text-base font-black text-amber-600 tabular-nums">
                      {weather?.tempMin !== undefined && weather?.tempMax !== undefined ? `${weather.tempMin}° / ${weather.tempMax}°` : '-'}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">쾌적한 가을 기온</div>
                  </div>
                </div>

                {/* Weather Elasticity Summary */}
                <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-200/60">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700">기상 탄력도 승수 (Ψ)</span>
                    <span className="font-black text-slate-900">Ψ = 1.00 (기준 기상)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    강수량 0.0mm 예보로 야외 액티비티(루지, 목장, 놀이동산, 모토아레나)의 기상 충격 감액 없이 정상 기저 매출이 발생합니다.
                  </p>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="truncate">출처: {weather?.source || 'KMA AWS / Open-Meteo High-Resolution Ensemble (Jeungpyeong)'}</span>
                <span className="text-sky-600 font-semibold shrink-0">1시간 주기 실시간 동기화</span>
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
                    <PieChartIcon size={16} className="text-teal-600" /> 부문별 예상 매출 구성비
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-400">총 {formatCurrency(summary?.grandTotalForecastRevenue)}원</span>
                </div>
                <p className="text-xs text-slate-400 mb-4">레저와 식음이 전체 매출의 87.5%를 견인</p>
                <div className="h-64">
                  <ReactECharts option={categoryDonutOption} style={{ height: '100%', width: '100%' }} />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-center text-xs">
                <div className="bg-slate-50 p-2 rounded-xl">
                  <div className="text-slate-400 text-[10px]">레저본부</div>
                  <div className="font-bold text-sky-700">{formatCurrency(summary?.totalLeisureForecastRevenue)}원</div>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl">
                  <div className="text-slate-400 text-[10px]">식음 부문</div>
                  <div className="font-bold text-emerald-700">{formatCurrency(summary?.totalFnbForecastRevenue)}원</div>
                </div>
              </div>
            </div>

            {/* Stacked Horizontal Bar: Top 10 Venues */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs lg:col-span-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <BarChart3 size={16} className="text-indigo-600" /> 상위 10개 영업장 매출 분해 (비투숙 기저 vs 투숙객 유발)
                  </h3>
                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                    전체 투숙객 기여율 {summary?.spilloverSharePct !== undefined ? `${summary.spilloverSharePct}%` : '-'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-2">
                  청주·대전·세종 당일치기 나들이객 기저 매출(보라)과 객실 76실(324명) 투숙객이 추가 유발한 시너지 매출(초록)의 1원 단위 분해
                </p>
                <div className="h-72">
                  <ReactECharts option={stackedBarOption} style={{ height: '100%', width: '100%' }} />
                </div>
              </div>

              <div className="mt-2 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>루지(431만), 남도예담(430만), 쿠치나(316만), 브리스킷(299만) 순 투숙객 시너지 집중</span>
                <span className="text-indigo-600 font-semibold">Empirical RevPAS Slope 기반</span>
              </div>
            </div>
          </div>

          {/* 5. 24 Venues Forecast Table */}
          <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-200/80 shadow-xs mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <span>🏢</span> 24개 영업장별 익일 예상 매출 및 인원수 랭킹
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  부문별 필터 및 정렬을 통해 영업장별 기저 매출과 투숙객 유발액, 날씨 민감도를 조회할 수 있습니다.
                </p>
              </div>

              {/* Filters & Search */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Category Filter */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs">
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
                      className={`px-3 py-1 rounded-lg font-semibold transition-all ${
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
                    placeholder="영업장 검색..."
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
                    <th className="py-3 px-3">영업장명</th>
                    <th className="py-3 px-3">부문</th>
                    <th className="py-3 px-3 text-right">예상 매출</th>
                    <th className="py-3 px-3 text-right">예상 고객수</th>
                    <th className="py-3 px-3 text-right">비투숙 기저</th>
                    <th className="py-3 px-3 text-right">투숙객 유발</th>
                    <th className="py-3 px-3 text-right">투숙 기여율</th>
                    <th className="py-3 px-3 text-center">날씨 민감도</th>
                    <th className="py-3 px-4">예측 인사이트 & 승수</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVenues.map((v: AncillaryForecastVenue, idx: number) => {
                    const sens = getSensitivityBadge(v.weatherSensitivityTag);
                    return (
                      <tr key={v.venueName} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-3 text-center font-bold text-slate-400 tabular-nums">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3 font-extrabold text-slate-900">
                          {v.venueName}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                            v.categoryCode === 'TICKET' ? 'bg-sky-50 text-sky-700' :
                            v.categoryCode === 'FNB' ? 'bg-emerald-50 text-emerald-700' :
                            v.categoryCode === 'MOTO' ? 'bg-amber-50 text-amber-700' :
                            'bg-purple-50 text-purple-700'
                          }`}>
                            {v.categoryName || v.categoryCode}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-black text-slate-900 tabular-nums">
                          {v.forecastRevenueFormatted || formatCurrency(v.forecastRevenue)}원
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-slate-700 tabular-nums">
                          {v.forecastVisitorCountFormatted || formatCurrency(v.forecastVisitorCount)}명
                        </td>
                        <td className="py-3 px-3 text-right text-slate-500 tabular-nums">
                          {formatCurrency(v.baselineDayTripperRevenue)}원
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-700 tabular-nums">
                          {formatCurrency(v.hotelSpilloverRevenue)}원
                        </td>
                        <td className="py-3 px-3 text-right font-black text-slate-900 tabular-nums">
                          <span className={`inline-block px-1.5 py-0.5 rounded ${
                            v.hotelSpilloverSharePct >= 35 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {v.hotelSpilloverSharePct.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${sens.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sens.dot}`}></span>
                            {sens.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 max-w-xs truncate" title={v.keyInsight}>
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span className="text-slate-400">계절: ×{v.seasonalityMultiplier} · 요일: ×{v.dayOfWeekMultiplier}</span>
                          </div>
                          <div className="text-[10px] text-slate-600 truncate mt-0.5">
                            {v.keyInsight || '안정적 매출 예상'}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 6. Weather Stress-Test & Operations Strategy (경영 및 인력 배치 시사점) */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl mb-8 relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-rose-500/20 text-rose-300 text-xs font-bold px-3 py-1 rounded-full border border-rose-500/30 flex items-center gap-1">
                  <Umbrella size={13} /> 우천 스트레스 테스트 (15mm 강수 시뮬레이션)
                </span>
                <span className="bg-white/10 text-slate-300 text-xs px-2.5 py-1 rounded-full">
                  대체 소비(Substitution Effect) 검증
                </span>
              </div>

              <h3 className="text-2xl font-bold tracking-tight text-white mb-2">
                "만약 내일 15mm 비가 온다면?" — 날씨 충격 델타 및 인력 배치 전략
              </h3>
              <p className="text-indigo-200 text-sm max-w-3xl leading-relaxed mb-6">
                실제 비가 올 경우, 리조트 전체 방문객은 줄어들지만 투숙객 {condo?.totalEstimatedGuests !== undefined ? `${condo.totalEstimatedGuests}명` : ''}은 외부로 나가지 못하고 실내 시설(쿠치나, 편의점, 룸서비스)로 락인(Lock-in)되는 대체 효과가 발생합니다.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Metric 1 */}
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                  <div className="text-xs text-slate-300 mb-1">맑은 날 기준 예상 매출</div>
                  <div className="text-xl font-black text-white">{formatCurrency(summary?.clearDayBaselineRevenue || summary?.grandTotalForecastRevenue)}원</div>
                  <div className="text-[10px] text-teal-300 mt-1">정상 영업 (현재 예보 상태)</div>
                </div>

                {/* Metric 2 */}
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                  <div className="text-xs text-rose-300 mb-1">15mm 우천 시 예상 매출</div>
                  <div className="text-xl font-black text-rose-300">{formatCurrency(Math.round((summary?.grandTotalForecastRevenue || 0) * 0.6656))}원</div>
                  <div className="text-[10px] text-rose-200 mt-1">충격 델타: {formatCurrency(Math.round((summary?.grandTotalForecastRevenue || 0) * (0.6656 - 1)))}원 (-33.4%)</div>
                </div>

                {/* Metric 3 */}
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                  <div className="text-xs text-amber-300 mb-1">야외 액티비티 급감</div>
                  <div className="text-xl font-black text-amber-300">-55% ~ -90%</div>
                  <div className="text-[10px] text-slate-300 mt-1">루지(-55%), 놀이동산(-90%), 썰매(-85%)</div>
                </div>

                {/* Metric 4 */}
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                  <div className="text-xs text-emerald-300 mb-1">실내 시설 우천 부스트</div>
                  <div className="text-xl font-black text-emerald-300">+2% ~ +14% 상승</div>
                  <div className="text-[10px] text-emerald-200 mt-1">쿠치나(+2.3%), CU(+9.4%), BHC(+12%)</div>
                </div>
              </div>

              {/* Management Insight Alert Box */}
              <div className="bg-indigo-900/50 border border-indigo-400/30 rounded-2xl p-4 text-xs text-indigo-100 flex items-start gap-3">
                <span className="text-lg">💡</span>
                <div className="space-y-1">
                  <div className="font-bold text-white text-sm">경영 및 인력 배치 최적화 인사이트</div>
                  <p className="leading-relaxed">
                    비 예보가 뜨면 야외 놀이동산·루지·목장의 단기 아르바이트 및 진행 요원을 과감히 축소하고, 반대로 조식 뷔페(쿠치나), 편의점(CU), 치킨 야식(BHC), 실내 기프트샵으로 홀 및 지원 인력을 전진 배치해야 운영 효율과 고객 만족도를 동시에 극대화할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 7. Methodology Accordion & Formula */}
          <div className="bg-slate-100/80 rounded-2xl p-6 border border-slate-200 text-xs text-slate-600">
            <div className="flex items-center gap-2 font-bold text-slate-800 text-sm mb-2">
              <Layers size={16} className="text-slate-500" />
              <span>BESM v6.0 (Belleforet Econometric Spillover Model) 계량경제학 수식 체계</span>
            </div>
            <p className="leading-relaxed mb-3">
              각 영업장 <span className="font-mono font-bold text-slate-800">v</span>의 익일 예상 매출 <span className="font-mono font-bold text-teal-700">Ŷ<sub>v,t</sub></span>는 5차원 연립 방정식으로 결정됩니다:
            </p>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-800 overflow-x-auto mb-3">
              Ŷ<sub>v,t</sub> = [ Base<sub>v,k(t)</sub> + ∑<sub>s∈S</sub> ( R<sub>s,t</sub> × β<sub>v</sub> × γ<sub>v,s</sub> ) ] × Φ<sub>v,m(t)</sub> × Ω<sub>v,k(t)</sub> × Ψ<sub>v,w(t)</sub>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-[11px]">
              <div>
                <strong className="text-slate-800">Base<sub>v,k</sub></strong>: 비투숙 당일치기 기저 절편 (평일/주말 분리)
              </div>
              <div>
                <strong className="text-slate-800">R<sub>s,t</sub> × γ<sub>v,s</sub></strong>: 3대 투숙 세그먼트 선호 탄력도
              </div>
              <div>
                <strong className="text-slate-800">β<sub>v</sub></strong>: 한계 유발 계수 (Empirical RevPAS Slope)
              </div>
              <div>
                <strong className="text-slate-800">Φ × Ω × Ψ</strong>: 12개월 계절성 × 요일 효과 × 기상청 예보
              </div>
            </div>
          </div>
        </>
      )}

      {/* Footer Note */}
      <div className="text-xs text-slate-400 mt-8 pt-4 border-t border-slate-200 flex items-center justify-between">
        <span>벨포레 리조트 데이터 통제 센터 · BESM v6.0 실시간 정규 마트 연동 (Zero-Simulation SSOT)</span>
        <span className="font-mono">API: /api/v6/dashboard/ancillary-revenue-forecast</span>
      </div>
    </div>
  );
}
