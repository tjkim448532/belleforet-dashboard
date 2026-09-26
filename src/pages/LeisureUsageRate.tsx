import { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { 
  Ticket, Users, Building2, TrendingUp, Calendar, 
  RefreshCw, AlertCircle, Layers, BarChart3, HelpCircle,
  ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import { secureFetcher } from '../lib/secureFetcher';
import { useDate } from '../contexts/DateContext';
import GlobalDatePicker from '../components/GlobalDatePicker';
import type { 
  LeisureUsageRateResponse,
  LeisureYoyMatrixResponse,
  LeisureYoyYearData
} from '../types/reports-v2';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

// Distinct modern color palette for facilities
const FACILITY_COLORS: Record<string, string> = {
  '놀이동산': '#3b82f6', // Blue
  '미디어아트센터': '#8b5cf6', // Violet
  '벨포레 목장': '#10b981', // Teal/Green
  '사계절썰매장': '#f59e0b', // Amber
  '마운틴카트': '#ef4444', // Red
  '벨포레 목장(체험)': '#14b8a6', // Teal
  '썸머랜드': '#06b6d4', // Cyan
  '원더풀': '#6366f1', // Indigo
  '회전그네': '#ec4899', // Pink
  '마리나 클럽': '#0284c7', // Sky Blue
  '미디어-뮤지엄카페': '#d97706', // Warm Amber
  '얼룩말카페': '#84cc16', // Lime
};

const DEFAULT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', 
  '#06b6d4', '#ec4899', '#14b8a6', '#6366f1', '#84cc16'
];

export default function LeisureUsageRate() {
  const { startDate } = useDate();

  const [usageData, setUsageData] = useState<LeisureUsageRateResponse | null>(null);
  const [yoyData, setYoyData] = useState<LeisureYoyMatrixResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Facility for YoY Matrix & Chart
  const [selectedFacility, setSelectedFacility] = useState<string>('놀이동산');
  
  // Selected Month override for KPI Cards
  const [selectedMonthOverride, setSelectedMonthOverride] = useState<string | null>(null);

  // Chart View Mode: 'YOY' (Selected Facility 24 vs 25 vs 26) | 'ALL_TIMELINE' (All Facilities Monthly Timeline)
  const [chartMode, setChartMode] = useState<'YOY' | 'ALL_TIMELINE'>('YOY');

  // Timeline Chart State
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedFacilities, setSelectedFacilities] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [resUsage, resYoy] = await Promise.all([
        secureFetcher(`${API_BASE}/api/v6/report/leisure-usage-rate`),
        secureFetcher(`${API_BASE}/api/v6/report/leisure-yoy-matrix`),
      ]);

      const payloadUsage: LeisureUsageRateResponse = resUsage?.data ?? resUsage;
      const payloadYoy: LeisureYoyMatrixResponse = resYoy?.data ?? resYoy;

      if (payloadUsage?.success && payloadYoy?.success) {
        setUsageData(payloadUsage);
        setYoyData(payloadYoy);

        // Set default facility if available
        if (payloadYoy.facilities && payloadYoy.facilities.length > 0) {
          if (!payloadYoy.facilities.includes(selectedFacility)) {
            setSelectedFacility(payloadYoy.facilities[0]);
          }
        }

        // Initially select top 4 facilities for timeline view
        const initialSelected = new Set<string>();
        payloadUsage.series?.slice(0, 5).forEach((s) => initialSelected.add(s.facilityName));
        setSelectedFacilities(initialSelected);
      } else {
        setError(payloadUsage?.error || payloadYoy?.error || '레저본부 이용률 데이터를 불러오지 못했습니다.');
      }
    } catch (err: any) {
      console.error('Error fetching leisure usage data:', err);
      setError(
        err?.message || 
        '백엔드 API 호출 중 오류가 발생했습니다. 백엔드 상태를 확인해주세요.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Available months list sorted descending (newest first)
  const availableMonthsDescending = useMemo(() => {
    if (!usageData?.months) return [];
    return [...usageData.months].reverse();
  }, [usageData?.months]);

  const latestAvailableMonth = useMemo(() => {
    if (!usageData?.months || usageData.months.length === 0) return '';
    return usageData.months[usageData.months.length - 1];
  }, [usageData?.months]);

  // Determine active month for KPI Cards: sync with global DatePicker (startDate) or manual override
  const activeMonth = useMemo(() => {
    if (selectedMonthOverride && usageData?.months?.includes(selectedMonthOverride)) {
      return selectedMonthOverride;
    }
    const dateMonth = startDate ? startDate.slice(0, 7) : '';
    if (usageData?.months && usageData.months.includes(dateMonth)) {
      return dateMonth;
    }
    return latestAvailableMonth;
  }, [selectedMonthOverride, startDate, usageData?.months, latestAvailableMonth]);

  // Active Month summary data points for KPI Cards (ZERO bug fix: robust roomGuests & facility extraction)
  const activeMonthSummary = useMemo(() => {
    if (!usageData?.series || !activeMonth) return null;

    // 1. Get total room guests for activeMonth across series data
    let roomGuests = 0;
    for (const s of usageData.series) {
      const pt = s.data.find((d) => d.month === activeMonth);
      if (pt && pt.totalRoomGuests > 0) {
        roomGuests = pt.totalRoomGuests;
        break;
      }
    }

    // 2. Selected facility data for activeMonth
    const selSeries = usageData.series.find((s) => s.facilityName === selectedFacility);
    const selPoint = selSeries?.data.find((d) => d.month === activeMonth);
    const selRate = selPoint?.usageRate ?? 0;
    const selVisitors = selPoint?.visitors ?? 0;

    // 3. Find top facility for activeMonth
    let topVenue = { name: '-', usageRate: 0, visitors: 0 };
    for (const s of usageData.series) {
      const pt = s.data.find((d) => d.month === activeMonth);
      if (pt && pt.usageRate > topVenue.usageRate) {
        topVenue = {
          name: s.facilityName,
          usageRate: pt.usageRate,
          visitors: pt.visitors,
        };
      }
    }

    return {
      month: activeMonth,
      roomGuests,
      selectedVenue: {
        name: selectedFacility,
        usageRate: selRate,
        visitors: selVisitors,
      },
      topVenue,
    };
  }, [usageData, activeMonth, selectedFacility]);

  // Months 1 to 12 labels
  const monthLabels = useMemo(() => [
    '1월', '2월', '3월', '4월', '5월', '6월', 
    '7월', '8월', '9월', '10월', '11월', '12월'
  ], []);

  // Active month number (1~12) for row highlighting
  const activeMonthNumber = useMemo(() => {
    if (!activeMonth) return null;
    const parts = activeMonth.split('-');
    return parts.length === 2 ? parseInt(parts[1], 10) : null;
  }, [activeMonth]);

  // YoY Chart Option (for selected facility: 2024 vs 2025 vs 2026 across 1~12월)
  const yoyChartOption = useMemo(() => {
    if (!yoyData?.pivotData || !yoyData.pivotData[selectedFacility]) return {};

    const rows = yoyData.pivotData[selectedFacility];
    const years = yoyData.years || ['2024', '2025', '2026'];

    const colors: Record<string, string> = {
      '2024': '#94a3b8', // Slate
      '2025': '#3b82f6', // Blue
      '2026': '#10b981', // Emerald
    };

    const series = years.map((yr) => {
      const dataPoints = rows.map((r) => {
        const item = r[yr] as LeisureYoyYearData | undefined;
        // Don't show line drop to 0 for unarrived future months in 2026
        if (yr === '2026' && item && item.roomGuests === 0 && item.visitors === 0) {
          return null;
        }
        return {
          value: item ? item.usageRate : 0,
          visitors: item?.visitors || 0,
          roomGuests: item?.roomGuests || 0,
        };
      });

      const isCurrentYear = yr === '2026';

      return {
        name: `${yr}년`,
        type: 'line',
        smooth: true,
        showSymbol: true,
        symbolSize: isCurrentYear ? 8 : 6,
        lineStyle: {
          width: isCurrentYear ? 3.5 : 2,
          type: yr === '2024' ? 'dashed' : 'solid',
          color: colors[yr] || '#64748b',
        },
        itemStyle: {
          color: colors[yr] || '#64748b',
        },
        connectNulls: false,
        emphasis: {
          focus: 'series',
          lineStyle: {
            width: isCurrentYear ? 4.5 : 3,
          },
        },
        data: dataPoints,
      };
    });

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: '#334155',
        textStyle: { color: '#f8fafc', fontSize: 12 },
        formatter: (params: any[]) => {
          if (!params || params.length === 0) return '';
          const monthLabel = params[0].axisValue;
          let html = `<div style="font-weight: bold; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.15); color: #38bdf8;">
            🎡 ${selectedFacility} · ${monthLabel} 연도별 비교
          </div>`;

          params.forEach((item) => {
            if (item.value === null || item.value === undefined) return;
            const is26 = item.seriesName.includes('2026');
            const usageVal = Number(item.data?.value || 0).toFixed(1);
            const visitorsVal = Number(item.data?.visitors || 0).toLocaleString();
            const roomGuestsVal = Number(item.data?.roomGuests || 0).toLocaleString();

            html += `
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 14px; margin-bottom: 4px; font-size: 11.5px; ${is26 ? 'font-weight: 700; color: #34d399; background: rgba(52, 211, 153, 0.1); padding: 2px 4px; border-radius: 4px;' : ''}">
                <span style="display: flex; align-items: center; gap: 6px;">
                  <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${item.color};"></span>
                  ${item.seriesName}
                </span>
                <span style="text-align: right;">
                  <b style="font-size: 12px; font-family: monospace;">${usageVal}%</b>
                  <span style="opacity: 0.75; margin-left: 6px; font-size: 10.5px;">(${visitorsVal}명 / ${roomGuestsVal}명)</span>
                </span>
              </div>
            `;
          });
          return html;
        },
      },
      legend: {
        data: years.map((y) => `${y}년`),
        top: 0,
        right: '2%',
        textStyle: { color: '#64748b', fontWeight: 'bold', fontSize: 12 },
      },
      grid: {
        top: 35,
        left: '2%',
        right: '3%',
        bottom: '8%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: monthLabels,
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: { color: '#64748b', fontSize: 12, fontWeight: 500 },
      },
      yAxis: {
        type: 'value',
        name: '이용률 (%)',
        nameTextStyle: { color: '#94a3b8', fontSize: 11 },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLabel: {
          color: '#64748b',
          fontSize: 11,
          formatter: '{value}%',
        },
      },
      series,
    };
  }, [yoyData, selectedFacility, monthLabels]);

  // Overall Timeline Chart Option
  const timelineFilteredMonths = useMemo(() => {
    if (!usageData?.months) return [];
    if (selectedYear === 'ALL') return usageData.months;
    return usageData.months.filter((m) => m.startsWith(selectedYear));
  }, [usageData?.months, selectedYear]);

  const timelineChartOption = useMemo(() => {
    if (!usageData || timelineFilteredMonths.length === 0) return {};

    const seriesList: any[] = [];
    let colorIdx = 0;

    usageData.series.forEach((s) => {
      if (!selectedFacilities.has(s.facilityName)) return;

      const isSubtotal = s.facilityName === '레저본부 전체(소계)';
      const color = FACILITY_COLORS[s.facilityName] || DEFAULT_COLORS[colorIdx % DEFAULT_COLORS.length];
      if (!FACILITY_COLORS[s.facilityName]) colorIdx++;

      const dataMap = new Map(s.data.map((d) => [d.month, d]));
      const seriesValues = timelineFilteredMonths.map((m) => {
        const point = dataMap.get(m);
        return {
          value: point ? point.usageRate : 0,
          visitors: point?.visitors || 0,
          roomGuests: point?.totalRoomGuests || 0,
        };
      });

      seriesList.push({
        name: s.facilityName,
        type: 'line',
        smooth: true,
        showSymbol: true,
        symbolSize: isSubtotal ? 8 : 6,
        lineStyle: {
          width: isSubtotal ? 4 : 2,
          type: 'solid',
          color: color,
        },
        itemStyle: { color: color },
        emphasis: {
          focus: 'series',
          lineStyle: { width: isSubtotal ? 5 : 3.5 },
        },
        data: seriesValues,
      });
    });

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: '#334155',
        textStyle: { color: '#f8fafc', fontSize: 12 },
      },
      grid: {
        top: 25,
        left: '2%',
        right: '3%',
        bottom: timelineFilteredMonths.length > 12 ? '15%' : '8%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: timelineFilteredMonths,
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: { 
          color: '#64748b', 
          fontSize: 11,
          formatter: (val: string) => {
            const parts = val.split('-');
            return `${parts[0].slice(2)}년 ${parseInt(parts[1], 10)}월`;
          }
        },
      },
      yAxis: {
        type: 'value',
        name: '이용률 (%)',
        nameTextStyle: { color: '#94a3b8', fontSize: 11 },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLabel: { color: '#64748b', fontSize: 11, formatter: '{value}%' },
      },
      dataZoom: timelineFilteredMonths.length > 12 ? [
        {
          type: 'slider',
          show: true,
          xAxisIndex: [0],
          bottom: 0,
          height: 20,
          borderColor: 'transparent',
          fillerColor: 'rgba(16, 185, 129, 0.15)',
          handleStyle: { color: '#10b981' },
          start: 0,
          end: 100,
        },
      ] : [],
      series: seriesList,
    };
  }, [usageData, timelineFilteredMonths, selectedFacilities]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
          <p className="text-sm font-medium text-slate-500">레저본부 영업장별 이용률 매트릭스를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !yoyData || !yoyData.pivotData) {
    return (
      <div className="p-6 lg:p-10 max-w-7xl mx-auto">
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-8 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-8 h-8 text-rose-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-lg text-rose-900">데이터 로드 실패</h3>
              <p className="text-sm text-rose-600 mt-1 max-w-2xl leading-relaxed">
                {error || 'API 응답이 없습니다.'}
              </p>
              <div className="mt-3 text-xs bg-rose-100/70 text-rose-800 px-3 py-2 rounded-xl inline-block font-mono">
                Endpoint: GET /api/v6/report/leisure-yoy-matrix
              </div>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm shrink-0"
          >
            <RefreshCw size={16} /> 다시 시도
          </button>
        </div>
      </div>
    );
  }

  const currentPivotRows = yoyData.pivotData[selectedFacility] || [];

  return (
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 pb-32 lg:pb-12 max-w-[1600px] mx-auto">
      
      {/* 1. Header Banner with GlobalDatePicker */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 rounded-[32px] p-6 lg:p-10 text-white relative overflow-hidden shadow-lg">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute right-32 -bottom-20 w-48 h-48 bg-emerald-400/20 rounded-full blur-2xl"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2 opacity-90">
              <Ticket size={22} className="text-emerald-200" />
              <span className="font-semibold tracking-wider text-xs lg:text-sm text-emerald-100 uppercase whitespace-nowrap">
                BELLE FORET LEISURE DIVISION · USAGE RATE
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white flex items-center gap-3 flex-wrap break-keep">
              <span className="whitespace-nowrap">레저본부 영업장별 숙박객 대비 이용률 비교</span>
              <span className="text-xs bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white font-medium whitespace-nowrap">
                24 · 25 · 26 연도별 YoY 정밀 매트릭스
              </span>
            </h1>
            <p className="text-emerald-100 text-sm mt-2 font-normal opacity-90 break-keep max-w-3xl leading-relaxed">
              전체 숙박객(16평×4명, 35평×5명, 51평×6명 정원 기준) 대비 각 놀이시설 이용객(진성 방문객 is_visitor_count = 1)의 월별 이용률(%)을 연도별로 정밀 비교 분석합니다.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {/* Global Date Picker Integration */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-1.5 border border-white/20">
              <GlobalDatePicker showPresets={false} />
            </div>

            <button
              onClick={fetchData}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white text-xs lg:text-sm font-semibold rounded-2xl backdrop-blur-md transition-all border border-white/20 shadow-xs whitespace-nowrap shrink-0"
            >
              <RefreshCw size={15} /> 새로고침
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      {activeMonthSummary && (
        <div className="space-y-3">
          
          {/* Month Selector Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2.5">
              <Calendar size={16} className="text-emerald-600" />
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                실적 기준 월 선택:
              </span>
              <select
                value={activeMonth}
                onChange={(e) => setSelectedMonthOverride(e.target.value)}
                className="px-3.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 shadow-2xs focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {availableMonthsDescending.map((m) => (
                  <option key={m} value={m}>
                    {m.split('-')[0]}년 {parseInt(m.split('-')[1], 10)}월 실적 ({m})
                  </option>
                ))}
              </select>
              {activeMonth === latestAvailableMonth && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                  최신 집계월
                </span>
              )}
            </div>

            <span className="text-xs font-medium text-slate-400">
              * 상단 날짜 선택기(GlobalDatePicker) 및 기준 월 셀렉터와 실시간 연동됩니다.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            
            {/* Card 1: Selected Facility Usage Rate */}
            <div className="bg-white rounded-3xl p-6 border border-emerald-200/80 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full blur-2xl -mr-6 -mt-6"></div>
              <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="text-xs font-bold text-emerald-700 tracking-wider uppercase whitespace-nowrap truncate max-w-[180px]">
                  [{selectedFacility}] 당월 이용률
                </span>
                <div className="w-10 h-10 rounded-2xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center">
                  <Ticket size={20} />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5 relative z-10 whitespace-nowrap">
                <span className="text-3xl font-extrabold text-emerald-700 tabular-nums">
                  {activeMonthSummary.selectedVenue.usageRate.toFixed(1)}
                </span>
                <span className="text-sm font-bold text-emerald-600">%</span>
              </div>
              <div className="text-xs text-slate-500 mt-2 font-medium relative z-10 whitespace-nowrap">
                {activeMonth} 기준 숙박객 대비 이용률
              </div>
            </div>

            {/* Card 2: Selected Facility Visitors */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-blue-600 tracking-wider uppercase whitespace-nowrap truncate max-w-[180px]">
                  [{selectedFacility}] 당월 이용객
                </span>
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users size={20} />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                <span className="text-3xl font-extrabold text-slate-900 tabular-nums">
                  {activeMonthSummary.selectedVenue.visitors.toLocaleString()}
                </span>
                <span className="text-sm font-semibold text-slate-500">명</span>
              </div>
              <div className="text-xs text-slate-400 mt-2 font-medium whitespace-nowrap">
                진성 티켓 이용객 (is_visitor_count = 1)
              </div>
            </div>

            {/* Card 3: Total Room Guests (Denominator) */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-indigo-600 tracking-wider uppercase whitespace-nowrap">
                  당월 리조트 총 숙박객 (분모)
                </span>
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Building2 size={20} />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                <span className="text-3xl font-extrabold text-indigo-700 tabular-nums">
                  {activeMonthSummary.roomGuests.toLocaleString()}
                </span>
                <span className="text-sm font-semibold text-indigo-500">명</span>
              </div>
              <div className="text-xs text-indigo-400 mt-2 font-medium whitespace-nowrap">
                객실 타입별 정원(16·35·51평) 반영 기준
              </div>
            </div>

            {/* Card 4: Top Venue for that Month */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-amber-600 tracking-wider uppercase whitespace-nowrap">
                  당월 최고 이용률 영업장
                </span>
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <TrendingUp size={20} />
                </div>
              </div>
              <div className="flex items-baseline gap-2 whitespace-nowrap">
                <span className="text-xl font-extrabold text-slate-900 truncate max-w-[140px]">
                  {activeMonthSummary.topVenue.name}
                </span>
                <span className="text-2xl font-black text-amber-600 tabular-nums">
                  {activeMonthSummary.topVenue.usageRate.toFixed(1)}%
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-2 font-medium whitespace-nowrap">
                {activeMonthSummary.topVenue.visitors.toLocaleString()}명 이용 (최고 침투율)
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 3. Interactive Chart Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 lg:p-8 shadow-xs space-y-6">
        
        {/* Chart Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg lg:text-xl font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              {chartMode === 'YOY' 
                ? `[${selectedFacility}] 연도별(24·25·26) 월별 이용률 비교 추이`
                : '레저본부 전 영업장 시계열 추이'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {chartMode === 'YOY' 
                ? '동일 월(1~12월) 기준 2024년, 2025년, 2026년 이용률(%)을 직접 비교합니다.'
                : '월별 전체 시계열 상에서 영업장별 침투율을 비교합니다.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 text-xs">
              <button
                onClick={() => setChartMode('YOY')}
                className={`px-3 py-1.5 font-bold rounded-lg transition-all ${
                  chartMode === 'YOY'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                연도별(YoY) 비교
              </button>
              <button
                onClick={() => setChartMode('ALL_TIMELINE')}
                className={`px-3 py-1.5 font-bold rounded-lg transition-all ${
                  chartMode === 'ALL_TIMELINE'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                전체 시계열 추이
              </button>
            </div>

            {chartMode === 'ALL_TIMELINE' && (
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                {['ALL', '2026', '2025', '2024'].map((year) => (
                  <button
                    key={year}
                    onClick={() => setSelectedYear(year)}
                    className={`px-2.5 py-1 font-bold rounded-lg transition-all ${
                      selectedYear === year
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {year === 'ALL' ? '전체' : `${year}년`}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ECharts Chart Container */}
        <div className="w-full h-[380px] lg:h-[420px]">
          <ReactECharts 
            option={chartMode === 'YOY' ? yoyChartOption : timelineChartOption} 
            style={{ height: '100%', width: '100%' }} 
            notMerge={true} 
          />
        </div>

      </div>

      {/* 4. ⭐ 연도별 영업장 이용률 정밀 매트릭스 (1월~12월 행 × 2024, 2025, 2026 열) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {/* Table Header: Dropdown & Title */}
        <div className="p-6 lg:p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <h2 className="text-lg lg:text-xl font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600" />
              연도별 영업장 이용률 정밀 매트릭스
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              드롭다운에서 원하는 영업장을 선택하면 1월부터 12월까지의 연도별(24년, 25년, 26년) 이용률과 YoY 증감이 즉시 표출됩니다.
            </p>
          </div>

          {/* Facility Dropdown Selector */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
              영업장 선택:
            </span>
            <div className="relative">
              <select
                value={selectedFacility}
                onChange={(e) => setSelectedFacility(e.target.value)}
                className="w-full sm:w-auto px-4 py-2.5 bg-white border-2 border-emerald-500/80 text-emerald-900 font-bold rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/20 shadow-xs cursor-pointer pr-10 appearance-none"
              >
                {yoyData.facilities.map((fac) => (
                  <option key={fac} value={fac}>
                    {fac}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-emerald-700">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Facility Chips */}
        <div className="px-6 lg:px-8 py-3 bg-white border-b border-slate-100 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 mr-1">빠른 선택:</span>
          {['놀이동산', '벨포레 목장', '마운틴카트', '사계절썰매장', '미디어아트센터', '마리나 클럽'].map((fac) => {
            const isSelected = selectedFacility === fac;
            return (
              <button
                key={fac}
                onClick={() => setSelectedFacility(fac)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {fac}
              </button>
            );
          })}
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-4 px-6 text-center w-28">월 (Month)</th>
                <th className="py-4 px-6 text-center">2024년 실적</th>
                <th className="py-4 px-6 text-center">2025년 실적</th>
                <th className="py-4 px-6 text-center bg-emerald-50/40 text-emerald-900 border-x border-emerald-100/80">
                  2026년 실적 (최신)
                </th>
                <th className="py-4 px-6 text-center">YoY 증감 (26년 vs 25년)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {currentPivotRows.map((row) => {
                const monthNum = row.month;
                const d24 = row['2024'] as LeisureYoyYearData | undefined;
                const d25 = row['2025'] as LeisureYoyYearData | undefined;
                const d26 = row['2026'] as LeisureYoyYearData | undefined;

                // 2026 data validity
                const has26Data = d26 && (d26.roomGuests > 0 || d26.visitors > 0);
                const has25Data = d25 && (d25.roomGuests > 0 || d25.visitors > 0);
                const has24Data = d24 && (d24.roomGuests > 0 || d24.visitors > 0);

                // Calculate YoY diff between 2026 and 2025
                let yoyDiff: number | null = null;
                if (has26Data && has25Data && d26 && d25) {
                  yoyDiff = Math.round((d26.usageRate - d25.usageRate) * 10) / 10;
                }

                const isCurrentActiveMonth = monthNum === activeMonthNumber;

                return (
                  <tr 
                    key={monthNum}
                    className={`transition-colors ${
                      isCurrentActiveMonth 
                        ? 'bg-emerald-50/40 font-semibold' 
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Month Cell */}
                    <td className="py-4 px-6 text-center font-extrabold text-slate-800 bg-slate-50/30 text-sm">
                      <div className="flex items-center justify-center gap-1.5">
                        <span>{monthNum}월</span>
                        {isCurrentActiveMonth && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        )}
                      </div>
                    </td>

                    {/* 2024 Column */}
                    <td className="py-4 px-6 text-center">
                      {has24Data && d24 ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="font-mono text-sm font-bold text-slate-700">
                            {d24.usageRate.toFixed(1)}%
                          </span>
                          <span className="text-[11px] text-slate-400 tabular-nums">
                            {d24.visitors.toLocaleString()}명 / {d24.roomGuests.toLocaleString()}명
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-300 font-mono">-</span>
                      )}
                    </td>

                    {/* 2025 Column */}
                    <td className="py-4 px-6 text-center">
                      {has25Data && d25 ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="font-mono text-sm font-bold text-blue-700">
                            {d25.usageRate.toFixed(1)}%
                          </span>
                          <span className="text-[11px] text-slate-400 tabular-nums">
                            {d25.visitors.toLocaleString()}명 / {d25.roomGuests.toLocaleString()}명
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-300 font-mono">-</span>
                      )}
                    </td>

                    {/* 2026 Column (Highlighted) */}
                    <td className="py-4 px-6 text-center bg-emerald-50/30 border-x border-emerald-100/60">
                      {has26Data && d26 ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="font-mono text-base font-extrabold text-emerald-700">
                            {d26.usageRate.toFixed(1)}%
                          </span>
                          <span className="text-[11px] text-emerald-600 font-medium tabular-nums">
                            {d26.visitors.toLocaleString()}명 / {d26.roomGuests.toLocaleString()}명
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-300 font-mono text-xs">미도래</span>
                      )}
                    </td>

                    {/* YoY Diff (26 vs 25) Column */}
                    <td className="py-4 px-6 text-center">
                      {yoyDiff !== null ? (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold font-mono">
                          {yoyDiff > 0 ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-xl">
                              <ArrowUpRight size={14} className="stroke-[2.5]" />
                              +{yoyDiff.toFixed(1)}%p
                            </span>
                          ) : yoyDiff < 0 ? (
                            <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-100/80 px-2.5 py-1 rounded-xl">
                              <ArrowDownRight size={14} className="stroke-[2.5]" />
                              {yoyDiff.toFixed(1)}%p
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2.5 py-1 rounded-xl">
                              <Minus size={14} />
                              0.0%p
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300 font-mono">-</span>
                      )}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Note */}
        <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-1.5">
            <HelpCircle size={14} className="text-slate-400" />
            <span>
              각 셀 표기: <b>[이용률 %]</b> 상단, <b>(시설 이용객수 / 전체 객실정원 숙박객수)</b> 하단
            </span>
          </div>
          <span className="text-slate-400">
            데이터 소스: V6 정밀 데이터 마트 피벗 엔진 (/api/v6/report/leisure-yoy-matrix)
          </span>
        </div>

      </div>

    </div>
  );
}
