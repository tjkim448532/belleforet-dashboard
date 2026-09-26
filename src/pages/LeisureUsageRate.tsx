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
  const { startDate, endDate, isRange } = useDate();

  const [usageData, setUsageData] = useState<LeisureUsageRateResponse | null>(null);
  const [yoyData, setYoyData] = useState<LeisureYoyMatrixResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Facility for YoY Matrix & Chart
  const [selectedFacility, setSelectedFacility] = useState<string>('놀이동산');
  
  // Selected View Key: 'PERIOD_TOTAL' or specific month 'YYYY-MM'
  const [selectedViewKey, setSelectedViewKey] = useState<string>('PERIOD_TOTAL');

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
        secureFetcher(`${API_BASE}/api/v6/report/leisure-yoy-matrix?startYear=2024&endYear=2026`),
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
        '데이터 호출 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // When date range changes via GlobalDatePicker, reset selectedViewKey to PERIOD_TOTAL if range mode, or matching month
  useEffect(() => {
    if (isRange) {
      setSelectedViewKey('PERIOD_TOTAL');
    } else {
      const m = startDate ? startDate.slice(0, 7) : '';
      setSelectedViewKey(m);
    }
  }, [startDate, endDate, isRange]);

  // Available months list sorted descending (newest first)
  const availableMonthsDescending = useMemo(() => {
    if (!usageData?.months) return [];
    return [...usageData.months].reverse();
  }, [usageData?.months]);

  const latestAvailableMonth = useMemo(() => {
    if (!usageData?.months || usageData.months.length === 0) return '';
    return usageData.months[usageData.months.length - 1];
  }, [usageData?.months]);

  // List of facilities from YoY response ensuring '벨포레 목장(체험)' is always included if present
  const facilityList = useMemo(() => {
    const list = yoyData?.facilities ? [...yoyData.facilities] : [];
    if (!list.includes('벨포레 목장(체험)') && yoyData?.pivotData?.['벨포레 목장(체험)']) {
      list.push('벨포레 목장(체험)');
    }
    return list;
  }, [yoyData]);

  // Compute selected period string range
  const startMonthStr = useMemo(() => {
    return startDate ? startDate.slice(0, 7) : '2026-01';
  }, [startDate]);

  const endMonthStr = useMemo(() => {
    if (isRange && endDate) return endDate.slice(0, 7);
    return startMonthStr;
  }, [isRange, endDate, startMonthStr]);

  // All months in usageData that fall into [startMonthStr, endMonthStr]
  const selectedPeriodMonths = useMemo(() => {
    if (!usageData?.months) return [];
    if (!isRange) {
      return usageData.months.includes(startMonthStr) ? [startMonthStr] : [latestAvailableMonth];
    }
    const filtered = usageData.months.filter((m) => m >= startMonthStr && m <= endMonthStr);
    return filtered.length > 0 ? filtered : [latestAvailableMonth];
  }, [usageData?.months, isRange, startMonthStr, endMonthStr, latestAvailableMonth]);

  // Month numbers (1~12) within selected period
  const selectedPeriodMonthNumbers = useMemo(() => {
    return new Set(selectedPeriodMonths.map((m) => parseInt(m.split('-')[1], 10)));
  }, [selectedPeriodMonths]);

  // Determine current active display mode: either 'PERIOD_TOTAL' or specific 'YYYY-MM'
  const isPeriodTotalMode = useMemo(() => {
    if (selectedViewKey === 'PERIOD_TOTAL' && isRange && selectedPeriodMonths.length > 1) {
      return true;
    }
    return false;
  }, [selectedViewKey, isRange, selectedPeriodMonths.length]);

  const activeSingleMonth = useMemo(() => {
    if (selectedViewKey !== 'PERIOD_TOTAL' && usageData?.months?.includes(selectedViewKey)) {
      return selectedViewKey;
    }
    // Default to the latest month of the selected period
    if (selectedPeriodMonths.length > 0) {
      return selectedPeriodMonths[selectedPeriodMonths.length - 1];
    }
    return latestAvailableMonth;
  }, [selectedViewKey, usageData?.months, selectedPeriodMonths, latestAvailableMonth]);

  // KPI Summary Card Metrics (Zero bug fix & supports Period Cumulative as well as Single Month)
  const currentSummary = useMemo(() => {
    if (!usageData?.series) return null;

    if (isPeriodTotalMode) {
      // 1. Calculate Period Cumulative across selectedPeriodMonths
      const selSeries = usageData.series.find((s) => s.facilityName === selectedFacility);
      let selVisitors = 0;
      let selDenominator = 0;
      for (const m of selectedPeriodMonths) {
        const pt = selSeries?.data.find((d) => d.month === m);
        if (pt) {
          selVisitors += pt.visitors;
          selDenominator += pt.totalRoomGuests;
        }
      }
      const selRate = selDenominator > 0 ? Math.round((selVisitors / selDenominator) * 1000) / 10 : 0;

      // Top venue across selected period (exclude ranch experience conversion rate from general resort penetration ranking)
      let topVenue = { name: '-', visitors: 0, usageRate: 0 };
      for (const s of usageData.series) {
        if (s.facilityName === '벨포레 목장(체험)') continue;
        let vTotal = 0;
        let dTotal = 0;
        for (const m of selectedPeriodMonths) {
          const pt = s.data.find((d) => d.month === m);
          if (pt) {
            vTotal += pt.visitors;
            dTotal += pt.totalRoomGuests;
          }
        }
        const rate = dTotal > 0 ? Math.round((vTotal / dTotal) * 1000) / 10 : 0;
        if (rate > topVenue.usageRate) {
          topVenue = { name: s.facilityName, visitors: vTotal, usageRate: rate };
        }
      }

      return {
        isPeriod: true,
        label: `${startMonthStr} ~ ${endMonthStr} (${selectedPeriodMonths.length}개월 누적)`,
        roomGuests: selDenominator,
        selectedVenue: {
          name: selectedFacility,
          usageRate: selRate,
          visitors: selVisitors,
        },
        topVenue,
      };
    } else {
      // 2. Single Month Metrics
      const m = activeSingleMonth;
      const selSeries = usageData.series.find((s) => s.facilityName === selectedFacility);
      const selPoint = selSeries?.data.find((d) => d.month === m);
      const selRate = selPoint?.usageRate ?? 0;
      const selVisitors = selPoint?.visitors ?? 0;
      const roomGuests = selPoint?.totalRoomGuests ?? 0;

      let topVenue = { name: '-', usageRate: 0, visitors: 0 };
      for (const s of usageData.series) {
        if (s.facilityName === '벨포레 목장(체험)') continue;
        const pt = s.data.find((d) => d.month === m);
        if (pt && pt.usageRate > topVenue.usageRate) {
          topVenue = {
            name: s.facilityName,
            usageRate: pt.usageRate,
            visitors: pt.visitors,
          };
        }
      }

      return {
        isPeriod: false,
        label: `${m} 기준 실적`,
        roomGuests,
        selectedVenue: {
          name: selectedFacility,
          usageRate: selRate,
          visitors: selVisitors,
        },
        topVenue,
      };
    }
  }, [usageData, isPeriodTotalMode, selectedPeriodMonths, selectedFacility, startMonthStr, endMonthStr, activeSingleMonth]);

  // Months 1 to 12 labels
  const monthLabels = useMemo(() => [
    '1월', '2월', '3월', '4월', '5월', '6월', 
    '7월', '8월', '9월', '10월', '11월', '12월'
  ], []);

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
            🎡 ${selectedFacility === '벨포레 목장(체험)' ? '목장체험' : selectedFacility} · ${monthLabel} 연도별 비교
            ${selectedFacility === '벨포레 목장(체험)' ? '<span style="font-size: 10px; color: #a7f3d0; margin-left: 6px;">(목장입장객 대비 체험전환율)</span>' : ''}
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

  // Cumulative numbers for the selected period across 2024, 2025, 2026 in the matrix table
  const periodCumulative = useMemo(() => {
    if (!yoyData?.pivotData || !yoyData.pivotData[selectedFacility]) return null;

    const rows = yoyData.pivotData[selectedFacility];
    const targetRows = rows.filter((r) => selectedPeriodMonthNumbers.has(r.month));

    const result: Record<string, { visitors: number; roomGuests: number; usageRate: number }> = {
      '2024': { visitors: 0, roomGuests: 0, usageRate: 0 },
      '2025': { visitors: 0, roomGuests: 0, usageRate: 0 },
      '2026': { visitors: 0, roomGuests: 0, usageRate: 0 },
    };

    ['2024', '2025', '2026'].forEach((yr) => {
      let v = 0;
      let g = 0;
      targetRows.forEach((r) => {
        const item = r[yr] as LeisureYoyYearData | undefined;
        if (item) {
          v += item.visitors;
          g += item.roomGuests;
        }
      });
      const usageRate = g > 0 ? Math.round((v / g) * 1000) / 10 : 0;
      result[yr] = { visitors: v, roomGuests: g, usageRate };
    });

    return result;
  }, [yoyData, selectedFacility, selectedPeriodMonthNumbers]);

  const periodYoYDiff = useMemo(() => {
    if (!periodCumulative) return null;
    const c26 = periodCumulative['2026'];
    const c25 = periodCumulative['2025'];
    if (c26.roomGuests > 0 && c25.roomGuests > 0) {
      return Math.round((c26.usageRate - c25.usageRate) * 10) / 10;
    }
    return null;
  }, [periodCumulative]);

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
      <div className="bg-gradient-to-r from-emerald-800 via-[#00ae95] to-slate-900 rounded-[32px] p-6 lg:p-10 text-white relative overflow-hidden shadow-lg">
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
            <p className="text-sm text-white/80 mt-2 break-keep max-w-3xl leading-relaxed">
              관리자 설정 기준 정원(16평 2.5명, 35평 4명, 51평 6명 등)으로 산출한 전체 숙박객 대비 각 놀이시설 이용객(진성 방문객)의 월별 이용률(%)을 연도별로 비교합니다. (※ 단, '벨포레 목장(체험)'은 전체 숙박객이 아닌 '목장 입장객'을 기준으로 실질 체험 전환율을 산출합니다.)
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {/* Global Date Picker Integration */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-1.5 border border-white/20">
              <GlobalDatePicker showPresets={false} />
            </div>

            <button
              onClick={fetchData}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white text-xs lg:text-sm font-semibold rounded-2xl backdrop-blur-md transition-all border border-white/20 shadow-xs whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw size={15} /> 새로고침
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      {currentSummary && (
        <div className="space-y-4">
          
          {/* 🌟 [CORE CONTROL] 상단 영업장 선택기 & 실적 집계 범위 컨트롤 바 (사용자 요청 이미지 100% 일치) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Left: 영업장 선택 드롭다운 (알약형 에메랄드 테두리) */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <span className="text-sm font-bold text-slate-700 whitespace-nowrap">
                영업장 선택:
              </span>
              <div className="relative inline-flex items-center">
                <select
                  value={selectedFacility}
                  onChange={(e) => setSelectedFacility(e.target.value)}
                  className="w-full sm:w-auto px-5 py-2.5 bg-white border-2 border-emerald-500 text-slate-900 font-extrabold rounded-full text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/20 shadow-2xs cursor-pointer pr-11 appearance-none transition-colors"
                >
                  {facilityList.map((fac) => (
                    <option key={fac} value={fac}>
                      {fac === '벨포레 목장(체험)' ? '목장체험 (벨포레 목장 체험)' : fac}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-emerald-600">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>

              {/* 빠른 선택 칩 버튼들 */}
              <div className="hidden xl:flex items-center gap-1.5 pl-3 border-l border-slate-200">
                <span className="text-xs text-slate-400 font-medium">빠른선택:</span>
                {['놀이동산', '벨포레 목장', '사계절썰매장', '미디어아트센터', '마운틴카트'].map((fac) => (
                  <button
                    key={fac}
                    type="button"
                    onClick={() => setSelectedFacility(fac)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      selectedFacility === fac
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {fac}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: 실적 집계 범위 선택 */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <Calendar size={16} className="text-emerald-600" />
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                실적 집계 범위:
              </span>
              <select
                value={selectedViewKey}
                onChange={(e) => setSelectedViewKey(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-extrabold text-slate-800 shadow-2xs focus:ring-2 focus:ring-emerald-500 cursor-pointer outline-none transition-colors"
              >
                {isRange && selectedPeriodMonths.length > 1 && (
                  <option value="PERIOD_TOTAL">
                    ⭐ 선택 기간 전체 누적 ({startMonthStr} ~ {endMonthStr}, {selectedPeriodMonths.length}개월 합산)
                  </option>
                )}
                {availableMonthsDescending.map((m) => {
                  const isWithin = selectedPeriodMonths.includes(m);
                  return (
                    <option key={m} value={m}>
                      {m.split('-')[0]}년 {parseInt(m.split('-')[1], 10)}월 실적 ({m}) {isWithin && isRange ? '• 선택구간' : ''}
                    </option>
                  );
                })}
              </select>

              {isPeriodTotalMode && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                  {selectedPeriodMonths.length}개월 누적 집계
                </span>
              )}
            </div>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            
            {/* Card 1: Selected Facility Usage Rate */}
            <div className="bg-white rounded-3xl p-6 border border-emerald-200/80 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full blur-2xl -mr-6 -mt-6"></div>
              <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="text-xs lg:text-sm font-semibold text-slate-500 tracking-wider uppercase whitespace-nowrap truncate max-w-[180px]">
                  [{selectedFacility === '벨포레 목장(체험)' ? '목장체험' : selectedFacility}] {selectedFacility === '벨포레 목장(체험)' ? (isPeriodTotalMode ? '기간 체험 전환율' : '당월 체험 전환율') : (isPeriodTotalMode ? '기간 누적 이용률' : '당월 이용률')}
                </span>
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00ae95] flex items-center justify-center">
                  <Ticket size={20} />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5 relative z-10 whitespace-nowrap">
                <span className="text-2xl lg:text-3xl font-bold text-slate-900 tabular-nums">
                  {currentSummary.selectedVenue.usageRate.toFixed(1)}
                </span>
                <span className="text-sm font-bold text-[#00ae95]">%</span>
              </div>
              <div className="text-xs text-slate-500 mt-2 font-medium relative z-10 whitespace-nowrap truncate">
                {currentSummary.label}
              </div>
            </div>

            {/* Card 2: Selected Facility Visitors */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs lg:text-sm font-semibold text-slate-500 tracking-wider uppercase whitespace-nowrap truncate max-w-[180px]">
                  [{selectedFacility === '벨포레 목장(체험)' ? '목장체험' : selectedFacility}] {isPeriodTotalMode ? '기간 누적 이용객' : '당월 이용객'}
                </span>
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00ae95] flex items-center justify-center">
                  <Users size={20} />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                <span className="text-2xl lg:text-3xl font-bold text-slate-900 tabular-nums">
                  {currentSummary.selectedVenue.visitors.toLocaleString()}
                </span>
                <span className="text-sm font-semibold text-slate-500">명</span>
              </div>
              <div className="text-xs text-slate-400 mt-2 font-medium whitespace-nowrap">
                진성 티켓 이용객 (is_visitor_count = 1)
              </div>
            </div>

            {/* Card 3: Total Room Guests or Farm Visitors (Denominator) */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs lg:text-sm font-semibold text-slate-500 tracking-wider uppercase whitespace-nowrap">
                  {selectedFacility === '벨포레 목장(체험)'
                    ? (isPeriodTotalMode ? '기간 목장 입장객 (체험 모수)' : '당월 목장 입장객 (체험 모수)')
                    : (isPeriodTotalMode ? '기간 리조트 총 숙박객 (분모)' : '당월 리조트 총 숙박객 (분모)')}
                </span>
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00ae95] flex items-center justify-center">
                  <Building2 size={20} />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                <span className="text-2xl lg:text-3xl font-bold text-slate-900 tabular-nums">
                  {currentSummary.roomGuests.toLocaleString()}
                </span>
                <span className="text-sm font-semibold text-slate-500">명</span>
              </div>
              <div className="text-xs text-slate-400 mt-2 font-medium whitespace-nowrap">
                {selectedFacility === '벨포레 목장(체험)'
                  ? '목장 입장객 대비 실질 체험 전환율 산출 기준'
                  : '관리자 설정 기준 정원(16평 2.5명, 35평 4명, 51평 6명 등) 반영'}
              </div>
            </div>

            {/* Card 4: Top Venue for that Period/Month */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs lg:text-sm font-semibold text-slate-500 tracking-wider uppercase whitespace-nowrap">
                  {isPeriodTotalMode ? '기간 최고 이용률 영업장' : '당월 최고 이용률 영업장'}
                </span>
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00ae95] flex items-center justify-center">
                  <TrendingUp size={20} />
                </div>
              </div>
              <div className="flex items-baseline gap-2 whitespace-nowrap">
                <span className="text-xl font-bold text-slate-900 truncate max-w-[140px]">
                  {currentSummary.topVenue.name}
                </span>
                <span className="text-2xl lg:text-3xl font-bold text-[#00ae95] tabular-nums">
                  {currentSummary.topVenue.usageRate.toFixed(1)}%
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-2 font-medium whitespace-nowrap">
                {currentSummary.topVenue.visitors.toLocaleString()}명 이용 (침투율 1위)
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
                ? `[${selectedFacility === '벨포레 목장(체험)' ? '목장체험' : selectedFacility}] 연도별(24·25·26) 월별 ${selectedFacility === '벨포레 목장(체험)' ? '체험 전환율' : '이용률'} 비교 추이`
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
              드롭다운에서 원하는 영업장을 선택하면 1월부터 12월까지의 연도별(24년, 25년, 26년) 이용률과 YoY 증감이 표출됩니다.
              {isRange && selectedPeriodMonths.length > 1 && (
                <span className="ml-2 font-bold text-emerald-700">
                  (조회 기간: {startMonthStr} ~ {endMonthStr} 형광 표시)
                </span>
              )}
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
                {facilityList.map((fac) => (
                  <option key={fac} value={fac}>
                    {fac === '벨포레 목장(체험)' ? '목장체험 (벨포레 목장 체험)' : fac}
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
          {[
            { key: '놀이동산', label: '놀이동산' },
            { key: '벨포레 목장', label: '벨포레 목장' },
            { key: '벨포레 목장(체험)', label: '목장체험' },
            { key: '마운틴카트', label: '마운틴카트' },
            { key: '사계절썰매장', label: '사계절썰매장' },
            { key: '미디어아트센터', label: '미디어아트센터' },
            { key: '마리나 클럽', label: '마리나 클럽' },
          ].map(({ key, label }) => {
            const isSelected = selectedFacility === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedFacility(key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-600/30'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                <span>{label}</span>
                {key === '벨포레 목장(체험)' && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                    isSelected ? 'bg-emerald-700 text-emerald-100' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    체험
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-4 px-6 text-center w-32">월 (Month)</th>
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

                // Check if this month is in the selected period (e.g. 1월~9월)
                const isMonthInSelectedRange = selectedPeriodMonthNumbers.has(monthNum);

                return (
                  <tr 
                    key={monthNum}
                    className={`transition-colors ${
                      isMonthInSelectedRange 
                        ? 'bg-emerald-50/40 font-semibold' 
                        : 'hover:bg-slate-50/80 opacity-75'
                    }`}
                  >
                    {/* Month Cell */}
                    <td className="py-4 px-6 text-center font-extrabold text-slate-800 bg-slate-50/30 text-sm">
                      <div className="flex items-center justify-center gap-1.5">
                        <span>{monthNum}월</span>
                        {isMonthInSelectedRange && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            조회구간
                          </span>
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

              {/* ⭐ 선택 기간 누적 합산 요약 행 (기간 범위 선택 시 출력) */}
              {periodCumulative && selectedPeriodMonthNumbers.size > 1 && (
                <tr className="bg-emerald-100/70 border-t-2 border-emerald-300 font-bold text-xs text-emerald-950">
                  <td className="py-4 px-6 text-center font-black text-sm bg-emerald-200/50">
                    <div>선택 구간 누적</div>
                    <div className="text-[11px] font-semibold text-emerald-800">
                      ({startMonthStr.slice(5)}월 ~ {endMonthStr.slice(5)}월)
                    </div>
                  </td>

                  {/* 2024 Period Cumulative */}
                  <td className="py-4 px-6 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="font-mono text-sm font-black text-slate-800">
                        {periodCumulative['2024'].usageRate.toFixed(1)}%
                      </span>
                      <span className="text-[11px] text-slate-600 tabular-nums">
                        {periodCumulative['2024'].visitors.toLocaleString()}명 / {periodCumulative['2024'].roomGuests.toLocaleString()}명
                      </span>
                    </div>
                  </td>

                  {/* 2025 Period Cumulative */}
                  <td className="py-4 px-6 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="font-mono text-sm font-black text-blue-900">
                        {periodCumulative['2025'].usageRate.toFixed(1)}%
                      </span>
                      <span className="text-[11px] text-blue-700 tabular-nums">
                        {periodCumulative['2025'].visitors.toLocaleString()}명 / {periodCumulative['2025'].roomGuests.toLocaleString()}명
                      </span>
                    </div>
                  </td>

                  {/* 2026 Period Cumulative */}
                  <td className="py-4 px-6 text-center bg-emerald-200/70 border-x border-emerald-300">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="font-mono text-base font-black text-emerald-950">
                        {periodCumulative['2026'].usageRate.toFixed(1)}%
                      </span>
                      <span className="text-[11px] text-emerald-900 font-bold tabular-nums">
                        {periodCumulative['2026'].visitors.toLocaleString()}명 / {periodCumulative['2026'].roomGuests.toLocaleString()}명
                      </span>
                    </div>
                  </td>

                  {/* Period YoY Diff */}
                  <td className="py-4 px-6 text-center">
                    {periodYoYDiff !== null ? (
                      <div className="inline-flex items-center gap-1 font-mono font-black text-xs">
                        {periodYoYDiff > 0 ? (
                          <span className="inline-flex items-center gap-1 text-emerald-900 bg-white/90 px-3 py-1.5 rounded-xl shadow-xs border border-emerald-200">
                            <ArrowUpRight size={15} className="stroke-[3]" />
                            +{periodYoYDiff.toFixed(1)}%p
                          </span>
                        ) : periodYoYDiff < 0 ? (
                          <span className="inline-flex items-center gap-1 text-rose-900 bg-white/90 px-3 py-1.5 rounded-xl shadow-xs border border-rose-200">
                            <ArrowDownRight size={15} className="stroke-[3]" />
                            {periodYoYDiff.toFixed(1)}%p
                          </span>
                        ) : (
                          <span className="text-slate-700 bg-white px-3 py-1.5 rounded-xl">0.0%p</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 font-mono">-</span>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Note */}
        <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-1.5">
            <HelpCircle size={14} className="text-slate-400" />
            <span>
              각 셀 표기: <b>[이용률 %]</b> 상단, <b>(시설 이용객수 / 전체 객실정원 숙박객수)</b> 하단
              {selectedFacility === '벨포레 목장(체험)' && (
                <span className="text-emerald-700 ml-1.5 font-bold">
                  (※ '목장체험'은 전체 숙박객이 아닌 '목장 입장객'을 분모로 한 실질 체험 전환율입니다)
                </span>
              )}
            </span>
          </div>
          <span className="text-slate-400">
            데이터 소스: 리조트 공식 집계 데이터
          </span>
        </div>

      </div>

    </div>
  );
}
