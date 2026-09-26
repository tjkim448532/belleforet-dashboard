import { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { 
  Ticket, Users, Building2, TrendingUp, Calendar, 
  RefreshCw, AlertCircle, Layers, ChevronRight, BarChart3, HelpCircle
} from 'lucide-react';
import { secureFetcher } from '../lib/secureFetcher';
import type { 
  LeisureUsageRateResponse 
} from '../types/reports-v2';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

// Distinct modern color palette for facilities
const FACILITY_COLORS: Record<string, string> = {
  '레저본부 전체(소계)': '#059669', // Emerald
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
  const [data, setData] = useState<LeisureUsageRateResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedYear, setSelectedYear] = useState<string>('ALL'); // 'ALL' | '2026' | '2025' | '2024'
  const [selectedFacilities, setSelectedFacilities] = useState<Set<string>>(new Set());
  const [tableSortDesc, setTableSortDesc] = useState<boolean>(true); // true = newest month first
  const [searchFilter, setSearchFilter] = useState<string>('');

  const fetchUsageRateData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await secureFetcher(`${API_BASE}/api/v6/report/leisure-usage-rate`);
      const payload: LeisureUsageRateResponse = res?.data ?? res;
      
      if (payload && payload.success && Array.isArray(payload.series)) {
        setData(payload);
        // Initially select '레저본부 전체(소계)' and top 4 facilities
        const initialSelected = new Set<string>();
        payload.series.slice(0, 5).forEach((s) => initialSelected.add(s.facilityName));
        setSelectedFacilities(initialSelected);
      } else {
        setError(payload?.error || '레저본부 이용률 데이터를 불러오지 못했습니다.');
      }
    } catch (err: any) {
      console.error('Error fetching leisure usage rate:', err);
      setError(
        err?.message || 
        '백엔드 API(/api/v6/report/leisure-usage-rate) 호출 중 오류가 발생했습니다. 백엔드 배포 상태를 확인해주세요.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsageRateData();
  }, []);

  // Filter months by selected year
  const filteredMonths = useMemo(() => {
    if (!data?.months) return [];
    if (selectedYear === 'ALL') return data.months;
    return data.months.filter((m) => m.startsWith(selectedYear));
  }, [data?.months, selectedYear]);

  // Available facilities
  const allFacilities = useMemo(() => {
    if (!data?.series) return [];
    return data.series.map((s) => s.facilityName);
  }, [data?.series]);

  // Latest month data points for KPI Cards
  const latestMonthSummary = useMemo(() => {
    if (!data?.months || data.months.length === 0 || !data.series) return null;
    const latestMonth = data.months[data.months.length - 1];

    const subtotalSeries = data.series.find((s) => s.facilityName === '레저본부 전체(소계)');
    const subtotalPoint = subtotalSeries?.data.find((d) => d.month === latestMonth);

    // Find top facility (excluding subtotal)
    let topFacility = { name: '-', rate: 0, visitors: 0 };
    data.series.forEach((s) => {
      if (s.facilityName === '레저본부 전체(소계)') return;
      const pt = s.data.find((d) => d.month === latestMonth);
      if (pt && pt.usageRate > topFacility.rate) {
        topFacility = { name: s.facilityName, rate: pt.usageRate, visitors: pt.visitors };
      }
    });

    return {
      month: latestMonth,
      subtotalUsageRate: subtotalPoint?.usageRate ?? 0,
      totalVisitors: subtotalPoint?.visitors ?? 0,
      totalRoomGuests: subtotalPoint?.totalRoomGuests ?? 0,
      topFacility,
    };
  }, [data]);

  // Toggle facility in chart
  const toggleFacility = (facilityName: string) => {
    setSelectedFacilities((prev) => {
      const next = new Set(prev);
      if (next.has(facilityName)) {
        next.delete(facilityName);
      } else {
        next.add(facilityName);
      }
      return next;
    });
  };

  const selectAllFacilities = () => {
    if (!data?.series) return;
    setSelectedFacilities(new Set(data.series.map((s) => s.facilityName)));
  };

  const selectSubtotalOnly = () => {
    setSelectedFacilities(new Set(['레저본부 전체(소계)']));
  };

  const selectTopVenues = () => {
    if (!data?.series) return;
    const top = new Set<string>(['레저본부 전체(소계)']);
    data.series.slice(1, 5).forEach((s) => top.add(s.facilityName));
    setSelectedFacilities(top);
  };

  // ECharts Configuration
  const chartOption = useMemo(() => {
    if (!data || filteredMonths.length === 0) return {};

    const seriesList: any[] = [];
    let colorIdx = 0;

    data.series.forEach((s) => {
      if (!selectedFacilities.has(s.facilityName)) return;

      const isSubtotal = s.facilityName === '레저본부 전체(소계)';
      const color = FACILITY_COLORS[s.facilityName] || DEFAULT_COLORS[colorIdx % DEFAULT_COLORS.length];
      if (!FACILITY_COLORS[s.facilityName]) colorIdx++;

      // Map values matching filteredMonths
      const dataMap = new Map(s.data.map((d) => [d.month, d]));
      const seriesValues = filteredMonths.map((m) => {
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
          type: isSubtotal ? 'solid' : 'solid',
          color: color,
        },
        itemStyle: {
          color: color,
        },
        emphasis: {
          focus: 'series',
          lineStyle: {
            width: isSubtotal ? 5 : 3.5,
          },
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
        formatter: (params: any[]) => {
          if (!params || params.length === 0) return '';
          const monthLabel = params[0].axisValue;
          let html = `<div style="font-weight: bold; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.15); color: #38bdf8;">
            📅 ${monthLabel} 이용률 현황
          </div>`;

          // Sort params descending by usageRate
          const sortedParams = [...params].sort((a, b) => (b.data?.value || 0) - (a.data?.value || 0));

          sortedParams.forEach((item) => {
            const isSub = item.seriesName === '레저본부 전체(소계)';
            const usageVal = Number(item.data?.value || 0).toFixed(1);
            const visitorsVal = Number(item.data?.visitors || 0).toLocaleString();
            const roomGuestsVal = Number(item.data?.roomGuests || 0).toLocaleString();

            html += `
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 14px; margin-bottom: 4px; font-size: 11.5px; ${isSub ? 'font-weight: 700; color: #34d399; background: rgba(52, 211, 153, 0.1); padding: 2px 4px; border-radius: 4px;' : ''}">
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
        show: false, // We use custom interactive chips above
      },
      grid: {
        top: 25,
        left: '2%',
        right: '3%',
        bottom: filteredMonths.length > 12 ? '15%' : '8%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: filteredMonths,
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
        axisLabel: {
          color: '#64748b',
          fontSize: 11,
          formatter: '{value}%',
        },
      },
      dataZoom: filteredMonths.length > 12 ? [
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
  }, [data, filteredMonths, selectedFacilities]);

  // Display months for the table (can sort newest first or oldest first)
  const displayMonths = useMemo(() => {
    const list = [...filteredMonths];
    return tableSortDesc ? list.reverse() : list;
  }, [filteredMonths, tableSortDesc]);

  // Filtered series for the table
  const tableSeries = useMemo(() => {
    if (!data?.series) return [];
    let list = data.series;
    if (searchFilter.trim()) {
      const q = searchFilter.trim().toLowerCase();
      list = list.filter((s) => s.facilityName.toLowerCase().includes(q));
    }
    return list;
  }, [data?.series, searchFilter]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
          <p className="text-sm font-medium text-slate-500">레저본부 영업장별 이용률 데이터를 집계 중...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 lg:p-10 max-w-7xl mx-auto">
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-8 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-8 h-8 text-rose-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-lg text-rose-900">데이터 로드 실패 또는 백엔드 배포 대기</h3>
              <p className="text-sm text-rose-600 mt-1 max-w-2xl leading-relaxed">
                {error || 'API 응답이 없습니다.'}
              </p>
              <div className="mt-3 text-xs bg-rose-100/70 text-rose-800 px-3 py-2 rounded-xl inline-block font-mono">
                Endpoint: GET /api/v6/report/leisure-usage-rate
              </div>
            </div>
          </div>
          <button
            onClick={fetchUsageRateData}
            className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm shrink-0"
          >
            <RefreshCw size={16} /> 다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 pb-32 lg:pb-12 max-w-[1600px] mx-auto">
      
      {/* 1. Header Banner */}
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
              <span className="whitespace-nowrap">레저본부 영업장별 숙박객 대비 이용률 월별 비교</span>
              <span className="text-xs bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white font-medium whitespace-nowrap">
                정밀 숙박객수 모수 기반 V6
              </span>
            </h1>
            <p className="text-emerald-100 text-sm mt-2 font-normal opacity-90 break-keep max-w-3xl leading-relaxed">
              전체 숙박객(16평×4명, 35평×5명, 51평×6명 정원 기준) 대비 각 놀이시설 이용객(진성 방문객 is_visitor_count = 1)의 월별 이용률(%)을 다각도로 분석합니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchUsageRateData}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white text-xs lg:text-sm font-semibold rounded-2xl backdrop-blur-md transition-all border border-white/20 shadow-xs whitespace-nowrap shrink-0"
            >
              <RefreshCw size={15} /> 새로고침
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards (Latest Month Reference) */}
      {latestMonthSummary && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <Calendar size={14} className="text-emerald-600" />
              <span>최신 실적 기준 월: <b className="text-emerald-700">{latestMonthSummary.month}</b></span>
            </div>
            <span className="text-xs font-medium text-slate-400">
              * 백엔드 사전 집계(Zero Slice Summation) 수치
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            
            {/* Card 1: Subtotal Usage Rate */}
            <div className="bg-white rounded-3xl p-6 border border-emerald-200/80 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full blur-2xl -mr-6 -mt-6"></div>
              <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="text-xs font-bold text-emerald-700 tracking-wider uppercase whitespace-nowrap">
                  레저본부 전체 이용률
                </span>
                <div className="w-10 h-10 rounded-2xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center">
                  <Ticket size={20} />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5 relative z-10 whitespace-nowrap">
                <span className="text-3xl font-extrabold text-emerald-700 tabular-nums">
                  {latestMonthSummary.subtotalUsageRate.toFixed(1)}
                </span>
                <span className="text-sm font-bold text-emerald-600">%</span>
              </div>
              <div className="text-xs text-slate-500 mt-2 font-medium relative z-10 whitespace-nowrap">
                전체 숙박객 대비 총 레저 티켓 이용 배율
              </div>
            </div>

            {/* Card 2: Total Leisure Visitors */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-blue-600 tracking-wider uppercase whitespace-nowrap">
                  당월 레저 진성 이용객
                </span>
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users size={20} />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                <span className="text-3xl font-extrabold text-slate-900 tabular-nums">
                  {latestMonthSummary.totalVisitors.toLocaleString()}
                </span>
                <span className="text-sm font-semibold text-slate-500">명</span>
              </div>
              <div className="text-xs text-slate-400 mt-2 font-medium whitespace-nowrap">
                검증된 방문객 합산 (is_visitor_count = 1)
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
                  {latestMonthSummary.totalRoomGuests.toLocaleString()}
                </span>
                <span className="text-sm font-semibold text-indigo-500">명</span>
              </div>
              <div className="text-xs text-indigo-400 mt-2 font-medium whitespace-nowrap">
                타입별 객실 정원 반영 (16/35/51평)
              </div>
            </div>

            {/* Card 4: Top Venue */}
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
                <span className="text-xl font-extrabold text-slate-900 truncate max-w-[150px]">
                  {latestMonthSummary.topFacility.name}
                </span>
                <span className="text-2xl font-black text-amber-600 tabular-nums">
                  {latestMonthSummary.topFacility.rate.toFixed(1)}%
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-2 font-medium whitespace-nowrap">
                {latestMonthSummary.topFacility.visitors.toLocaleString()}명 이용
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 3. Interactive Multi-Line Chart Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 lg:p-8 shadow-xs space-y-6">
        
        {/* Chart Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg lg:text-xl font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              영업장별 월별 이용률 추이 곡선
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              선택한 영업장의 월별 이용률(%)을 한눈에 비교할 수 있습니다. 마우스를 올리면 상세 인원수가 표시됩니다.
            </p>
          </div>

          {/* Year Filter Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl self-start md:self-auto">
            {['ALL', '2026', '2025', '2024'].map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  selectedYear === year
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {year === 'ALL' ? '전체 (2024~2026)' : `${year}년`}
              </button>
            ))}
          </div>
        </div>

        {/* Facility Selector Chips */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              차트 표시 영업장 선택 ({selectedFacilities.size}/{allFacilities.length})
            </span>
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={selectTopVenues}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
              >
                주요 TOP 4
              </button>
              <button
                onClick={selectSubtotalOnly}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
              >
                소계만 보기
              </button>
              <button
                onClick={selectAllFacilities}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
              >
                전체 선택
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {allFacilities.map((name) => {
              const isSelected = selectedFacilities.has(name);
              const isSubtotal = name === '레저본부 전체(소계)';
              const color = FACILITY_COLORS[name] || '#64748b';

              return (
                <button
                  key={name}
                  onClick={() => toggleFacility(name)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                    isSelected
                      ? isSubtotal
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-800 border-slate-300 shadow-xs ring-1 ring-slate-200'
                      : 'bg-slate-50 text-slate-400 border-slate-200/60 opacity-60 hover:opacity-100'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: isSelected ? (isSubtotal ? '#fff' : color) : '#cbd5e1' }}
                  />
                  <span>{name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ECharts Container */}
        <div className="w-full h-[400px] lg:h-[460px] pt-2">
          {selectedFacilities.size === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
              <AlertCircle size={28} />
              <p className="text-sm font-medium">상단에서 표시할 영업장을 선택해주세요.</p>
            </div>
          ) : (
            <ReactECharts 
              option={chartOption} 
              style={{ height: '100%', width: '100%' }} 
              notMerge={true} 
            />
          )}
        </div>

      </div>

      {/* 4. Monthly Usage Rate Matrix Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {/* Table Header Controls */}
        <div className="p-6 lg:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg lg:text-xl font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600" />
              월별 영업장 이용률 정밀 매트릭스
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              각 셀은 [이용률 %]와 하단에 [시설 이용객 수]를 표시합니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <input
              type="text"
              placeholder="영업장 검색..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="px-3.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />

            {/* Sort Toggle (Newest first vs Oldest first) */}
            <button
              onClick={() => setTableSortDesc(!tableSortDesc)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
            >
              <span>{tableSortDesc ? '최신월 순서' : '과거월 순서'}</span>
              <ChevronRight size={13} className={`transform transition-transform ${tableSortDesc ? 'rotate-90' : '-rotate-90'}`} />
            </button>
          </div>
        </div>

        {/* Scrollable Pivot Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-6 sticky left-0 bg-slate-50/95 backdrop-blur-md z-20 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                  영업장명
                </th>
                {displayMonths.map((m) => (
                  <th key={m} className="py-3.5 px-4 text-center">
                    <span className="font-bold text-slate-700">{m}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              
              {/* Row: Reference Denominator (Total Room Guests) */}
              <tr className="bg-indigo-50/60 font-semibold border-b-2 border-indigo-100">
                <td className="py-3 px-6 sticky left-0 bg-indigo-50/95 backdrop-blur-md z-10 text-indigo-900 font-bold shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-indigo-600" />
                    <span>전체 숙박객 (분모)</span>
                  </div>
                </td>
                {displayMonths.map((m) => {
                  // Find subtotal point to get totalRoomGuests
                  const sub = data.series.find((s) => s.facilityName === '레저본부 전체(소계)');
                  const pt = sub?.data.find((d) => d.month === m);
                  const guests = pt?.totalRoomGuests || 0;
                  return (
                    <td key={m} className="py-3 px-4 text-center text-indigo-700 font-mono">
                      {guests.toLocaleString()}명
                    </td>
                  );
                })}
              </tr>

              {/* Rows: Facilities */}
              {tableSeries.map((s) => {
                const isSubtotal = s.facilityName === '레저본부 전체(소계)';
                const dataMap = new Map(s.data.map((d) => [d.month, d]));

                return (
                  <tr
                    key={s.facilityName}
                    className={`transition-colors hover:bg-slate-50/80 ${
                      isSubtotal ? 'bg-emerald-50/50 font-bold border-b-2 border-emerald-200' : ''
                    }`}
                  >
                    {/* Sticky Facility Name Column */}
                    <td
                      className={`py-3.5 px-6 sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)] ${
                        isSubtotal
                          ? 'bg-emerald-50/95 backdrop-blur-md text-emerald-900 font-extrabold text-sm'
                          : 'bg-white/95 backdrop-blur-md text-slate-800 font-semibold'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isSubtotal ? (
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
                        ) : (
                          <span
                            className="w-2 h-2 rounded-full inline-block"
                            style={{ backgroundColor: FACILITY_COLORS[s.facilityName] || '#94a3b8' }}
                          ></span>
                        )}
                        <span>{s.facilityName}</span>
                      </div>
                    </td>

                    {/* Month Data Cells */}
                    {displayMonths.map((m) => {
                      const pt = dataMap.get(m);
                      const rate = pt ? pt.usageRate : 0;
                      const visitors = pt ? pt.visitors : 0;

                      return (
                        <td
                          key={m}
                          className={`py-3.5 px-4 text-center ${
                            isSubtotal ? 'text-emerald-900 font-bold' : 'text-slate-700'
                          }`}
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            <span
                              className={`tabular-nums font-mono text-xs ${
                                isSubtotal
                                  ? 'text-emerald-700 font-extrabold text-[13px]'
                                  : rate >= 30
                                  ? 'text-amber-700 font-bold'
                                  : rate >= 15
                                  ? 'text-blue-700 font-semibold'
                                  : 'text-slate-700'
                              }`}
                            >
                              {rate > 0 ? `${rate.toFixed(1)}%` : '-'}
                            </span>
                            {visitors > 0 ? (
                              <span className="text-[10px] text-slate-400 tabular-nums">
                                {visitors.toLocaleString()}명
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-300">-</span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Note */}
        <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <HelpCircle size={14} className="text-slate-400" />
            <span>
              * 이용률 수식: <b>(영업장 월별 이용객 수 / 월별 전체 숙박객 수) × 100</b>
            </span>
          </div>
          <span className="text-slate-400">
            소계 및 집계값은 백엔드 V6 엔진에서 사전 연산되어 내려옵니다.
          </span>
        </div>

      </div>

    </div>
  );
}
