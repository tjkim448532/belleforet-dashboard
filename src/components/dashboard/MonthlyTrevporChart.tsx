import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { Building, Sparkles, Info, Calendar, BarChart3, TrendingUp } from 'lucide-react';
import { secureFetcher } from '../../lib/secureFetcher';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

export interface MonthlyEfficiencyItem {
  month: number;
  monthLabel: string;
  ly: {
    year: number;
    availableRooms?: number;
    roomsSold: number;
    totalRevenue: number;
    roomRevenue?: number;
    fnbRevenue?: number;
    leisureRevenue?: number;
    golfRevenue: number;
    motoRevenue?: number;
    banquetRevenue?: number;
    otherRevenue?: number;
    netRevenueWithoutGolf: number;
    roomRatio?: number;
    fnbRatio?: number;
    leisureRatio?: number;
    golfRatio?: number;
    motoRatio?: number;
    banquetRatio?: number;
    otherRatio?: number;
    resortRoomRatio?: number;
    resortFnbRatio?: number;
    resortLeisureRatio?: number;
    resortMotoRatio?: number;
    resortBanquetRatio?: number;
    resortOtherRatio?: number;
    trevparTotal?: number;
    trevparWithoutGolf?: number;
    trevporTotal?: number;
    trevporWithoutGolf?: number;
  };
  ty: {
    year: number;
    availableRooms?: number;
    roomsSold: number;
    totalRevenue: number;
    roomRevenue?: number;
    fnbRevenue?: number;
    leisureRevenue?: number;
    golfRevenue: number;
    motoRevenue?: number;
    banquetRevenue?: number;
    otherRevenue?: number;
    netRevenueWithoutGolf: number;
    roomRatio?: number;
    fnbRatio?: number;
    leisureRatio?: number;
    golfRatio?: number;
    motoRatio?: number;
    banquetRatio?: number;
    otherRatio?: number;
    resortRoomRatio?: number;
    resortFnbRatio?: number;
    resortLeisureRatio?: number;
    resortMotoRatio?: number;
    resortBanquetRatio?: number;
    resortOtherRatio?: number;
    trevparTotal?: number;
    trevparWithoutGolf?: number;
    trevporTotal?: number;
    trevporWithoutGolf?: number;
    isClosed?: boolean;
  } | null;
  growthTotalRate: number | null;
  growthWithoutGolfRate: number | null;
  diffTotalAmount: number | null;
  diffWithoutGolfAmount: number | null;
}

export interface MonthlyEfficiencyResponse {
  success: boolean;
  baseYear: number;
  compareYear: number;
  lastClosedMonth?: string;
  monthlyComparison: MonthlyEfficiencyItem[];
}

export default function MonthlyTrevporChart() {
  const [chartViewTab, setChartViewTab] = useState<'STACKED_100' | 'YOY_TREND'>('STACKED_100');
  const [metricMode, setMetricMode] = useState<'TOTAL' | 'EX_GOLF'>('TOTAL');
  const [data, setData] = useState<MonthlyEfficiencyResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await secureFetcher(`${API_BASE}/api/v5/report/monthly-room-efficiency?baseYear=2026&compareYear=2025`);
        const payload = res?.data ?? res;
        if (isMounted) {
          if (payload?.monthlyComparison && Array.isArray(payload.monthlyComparison)) {
            setData(payload);
          } else {
            setData(null);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn('[MonthlyTrevporChart] Waiting for backend API /api/v5/report/monthly-room-efficiency:', err);
          setError('백엔드 전용 API(/api/v5/report/monthly-room-efficiency) 연동 대기 중입니다.');
          setData(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, []);

  const formatCurrency = (val: any) => {
    if (val === null || val === undefined) return '-';
    const num = typeof val === 'string' ? Number(val.replace(/,/g, '')) : Number(val);
    return isNaN(num) ? '-' : new Intl.NumberFormat('ko-KR').format(Math.round(num));
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const monthLabels = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

  // Helper to extract exact TrevPAR (Total Revenue per Available 175 Rooms)
  const getTrevparValue = (itemNode: any, mode: 'TOTAL' | 'EX_GOLF', year: number, month: number) => {
    if (!itemNode) return null;
    const days = getDaysInMonth(year, month);
    const availRooms = itemNode.availableRooms || (175 * days);
    
    if (mode === 'TOTAL') {
      if (itemNode.trevparTotal !== undefined && itemNode.trevparTotal !== null) return itemNode.trevparTotal;
      return availRooms > 0 ? Math.round(itemNode.totalRevenue / availRooms) : 0;
    } else {
      if (itemNode.trevparWithoutGolf !== undefined && itemNode.trevparWithoutGolf !== null) return itemNode.trevparWithoutGolf;
      return availRooms > 0 ? Math.round(itemNode.netRevenueWithoutGolf / availRooms) : 0;
    }
  };

  // Helper to extract divisional share ratios (숙박, 식음, 레저, 모토, 대관, 골프, 기타) according to active mode
  const getShareRatios = (itemNode: any, mode: 'TOTAL' | 'EX_GOLF') => {
    if (!itemNode) return null;

    if (mode === 'TOTAL') {
      return {
        roomRatio: Number(itemNode.roomRatio ?? 0),
        fnbRatio: Number(itemNode.fnbRatio ?? 0),
        leisureRatio: Number(itemNode.leisureRatio ?? 0),
        motoRatio: itemNode.motoRatio !== undefined ? Number(itemNode.motoRatio) : undefined,
        banquetRatio: itemNode.banquetRatio !== undefined ? Number(itemNode.banquetRatio) : undefined,
        golfRatio: Number(itemNode.golfRatio ?? 0),
        otherRatio: itemNode.otherRatio !== undefined ? Number(itemNode.otherRatio) : 0
      };
    } else {
      // 골프 제외 모드 (resort...Ratio SSOT 우선 바인딩)
      const rRoom = itemNode.resortRoomRatio ?? itemNode.roomRatio;
      const rFnb = itemNode.resortFnbRatio ?? itemNode.fnbRatio;
      const rLeisure = itemNode.resortLeisureRatio ?? itemNode.leisureRatio;
      const rMoto = itemNode.resortMotoRatio ?? itemNode.motoRatio;
      const rBanquet = itemNode.resortBanquetRatio ?? itemNode.banquetRatio;
      const rOther = itemNode.resortOtherRatio ?? itemNode.otherRatio;

      return {
        roomRatio: Number(rRoom ?? 0),
        fnbRatio: Number(rFnb ?? 0),
        leisureRatio: Number(rLeisure ?? 0),
        motoRatio: rMoto !== undefined ? Number(rMoto) : undefined,
        banquetRatio: rBanquet !== undefined ? Number(rBanquet) : undefined,
        golfRatio: null,
        otherRatio: Number(rOther ?? 0)
      };
    }
  };

  // 1. [공식 명세 DOC-V5-20260821-TREVPAR-CHART-SPEC] 100% 누적 막대 차트 옵션
  const stackedChartOptions = React.useMemo(() => {
    if (!data?.monthlyComparison) return null;

    // 2026년 실적이 존재하는 월(1~8월)만 필터링
    const validMonths = data.monthlyComparison.filter(d => d.ty !== null);
    if (validMonths.length === 0) return null;

    const xLabels = validMonths.map(d => d.monthLabel);

    const roomSeriesData: number[] = [];
    const fnbSeriesData: number[] = [];
    const leisureSeriesData: number[] = [];
    const motoSeriesData: number[] = [];
    const banquetSeriesData: number[] = [];
    const golfSeriesData: number[] = [];
    const otherSeriesData: number[] = [];

    validMonths.forEach(d => {
      const ty = d.ty!;
      if (metricMode === 'TOTAL') {
        roomSeriesData.push(Number(ty.roomRatio ?? 0));
        fnbSeriesData.push(Number(ty.fnbRatio ?? 0));
        leisureSeriesData.push(Number(ty.leisureRatio ?? 0));
        motoSeriesData.push(Number(ty.motoRatio ?? 0));
        banquetSeriesData.push(Number(ty.banquetRatio ?? 0));
        golfSeriesData.push(Number(ty.golfRatio ?? 0));
        otherSeriesData.push(Number(ty.otherRatio ?? 0));
      } else {
        roomSeriesData.push(Number(ty.resortRoomRatio ?? ty.roomRatio ?? 0));
        fnbSeriesData.push(Number(ty.resortFnbRatio ?? ty.fnbRatio ?? 0));
        leisureSeriesData.push(Number(ty.resortLeisureRatio ?? ty.leisureRatio ?? 0));
        motoSeriesData.push(Number(ty.resortMotoRatio ?? ty.motoRatio ?? 0));
        banquetSeriesData.push(Number(ty.resortBanquetRatio ?? ty.banquetRatio ?? 0));
        otherSeriesData.push(Number(ty.resortOtherRatio ?? ty.otherRatio ?? 0));
      }
    });

    const seriesConfig: any[] = [
      {
        name: '숙박 (Accommodation)',
        type: 'bar',
        stack: 'total',
        barWidth: '38%',
        itemStyle: { color: '#1E3A8A' },
        label: {
          show: true,
          position: 'inside',
          formatter: (params: any) => params.value >= 4 ? `${params.value}%` : '',
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: 11
        },
        data: roomSeriesData
      },
      {
        name: '식음 (F&B)',
        type: 'bar',
        stack: 'total',
        itemStyle: { color: '#16A34A' },
        label: {
          show: true,
          position: 'inside',
          formatter: (params: any) => params.value >= 4 ? `${params.value}%` : '',
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: 11
        },
        data: fnbSeriesData
      },
      {
        name: '레저 (Leisure)',
        type: 'bar',
        stack: 'total',
        itemStyle: { color: '#EAB308' },
        label: {
          show: true,
          position: 'inside',
          formatter: (params: any) => params.value >= 4 ? `${params.value}%` : '',
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: 11
        },
        data: leisureSeriesData
      },
      {
        name: '모토아레나 (Moto)',
        type: 'bar',
        stack: 'total',
        itemStyle: { color: '#E11D48' },
        label: {
          show: true,
          position: 'inside',
          formatter: (params: any) => params.value >= 4 ? `${params.value}%` : '',
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: 11
        },
        data: motoSeriesData
      },
      {
        name: '대관/연회 (Banquet)',
        type: 'bar',
        stack: 'total',
        itemStyle: { color: '#0891B2' },
        label: {
          show: true,
          position: 'inside',
          formatter: (params: any) => params.value >= 4 ? `${params.value}%` : '',
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: 11
        },
        data: banquetSeriesData
      }
    ];

    if (metricMode === 'TOTAL') {
      seriesConfig.push({
        name: '골프 (Golf)',
        type: 'bar',
        stack: 'total',
        itemStyle: { color: '#9333EA' },
        label: {
          show: true,
          position: 'inside',
          formatter: (params: any) => params.value >= 4 ? `${params.value}%` : '',
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: 11
        },
        data: golfSeriesData
      });
    }

    const hasOther = otherSeriesData.some(v => v > 0);
    if (hasOther) {
      seriesConfig.push({
        name: '기타 (Others)',
        type: 'bar',
        stack: 'total',
        itemStyle: {
          color: '#94A3B8',
          borderRadius: [6, 6, 0, 0]
        },
        label: {
          show: true,
          position: 'inside',
          formatter: (params: any) => params.value >= 4 ? `${params.value}%` : '',
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: 11
        },
        data: otherSeriesData
      });
    }

    const legendData = seriesConfig.map(s => s.name);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any[]) => {
          if (!params || params.length === 0) return '';
          const idx = params[0].dataIndex;
          const monthItem = validMonths[idx];
          const ty = monthItem.ty;
          if (!ty) return '';

          const trevpar = getTrevparValue(ty, metricMode, 2026, monthItem.month);
          const totalRev = metricMode === 'TOTAL' ? ty.totalRevenue : ty.netRevenueWithoutGolf;
          
          let html = `
            <div class="font-bold text-slate-900 pb-1.5 border-b border-slate-200 mb-2">
              📅 2026년 ${monthItem.monthLabel} 부문별 매출 기여도 (${metricMode === 'TOTAL' ? '골프 포함 전사' : '골프 제외 순수 리조트'})
            </div>
            <div class="text-xs space-y-1 mb-2.5 pb-2 border-b border-slate-100 text-slate-600">
              <div class="flex justify-between"><span>판매 객실 수:</span> <strong class="text-slate-800">${formatCurrency(ty.roomsSold)} 실</strong></div>
              <div class="flex justify-between"><span>객실당 총매출 (${metricMode === 'TOTAL' ? 'TrevPAR' : '순수 리조트 TrevPAR'}):</span> <strong class="text-teal-700">${formatCurrency(trevpar)} 원</strong></div>
              <div class="flex justify-between"><span>${metricMode === 'TOTAL' ? '리조트 전사 총매출' : '순수 리조트 총매출'}:</span> <strong class="text-slate-900">${formatCurrency(totalRev)} 원</strong></div>
            </div>
            <div class="text-xs space-y-1">
              <div class="flex items-center justify-between text-blue-900">
                <span class="flex items-center gap-1.5"><span class="inline-block w-2.5 h-2.5 rounded-xs" style="background:#1E3A8A"></span>🏨 숙박 (${roomSeriesData[idx]}%):</span>
                <strong>${formatCurrency(ty.roomRevenue)} 원</strong>
              </div>
              <div class="flex items-center justify-between text-emerald-900">
                <span class="flex items-center gap-1.5"><span class="inline-block w-2.5 h-2.5 rounded-xs" style="background:#16A34A"></span>🍽️ 식음 (${fnbSeriesData[idx]}%):</span>
                <strong>${formatCurrency(ty.fnbRevenue)} 원</strong>
              </div>
              <div class="flex items-center justify-between text-amber-900">
                <span class="flex items-center gap-1.5"><span class="inline-block w-2.5 h-2.5 rounded-xs" style="background:#EAB308"></span>🎢 레저 (${leisureSeriesData[idx]}%):</span>
                <strong>${formatCurrency(ty.leisureRevenue)} 원</strong>
              </div>
              <div class="flex items-center justify-between text-rose-900">
                <span class="flex items-center gap-1.5"><span class="inline-block w-2.5 h-2.5 rounded-xs" style="background:#E11D48"></span>🏎️ 모토 (${motoSeriesData[idx]}%):</span>
                <strong>${formatCurrency(ty.motoRevenue)} 원</strong>
              </div>
              <div class="flex items-center justify-between text-cyan-900">
                <span class="flex items-center gap-1.5"><span class="inline-block w-2.5 h-2.5 rounded-xs" style="background:#0891B2"></span>🏛️ 대관 (${banquetSeriesData[idx]}%):</span>
                <strong>${formatCurrency(ty.banquetRevenue)} 원</strong>
              </div>
              ${metricMode === 'TOTAL' ? `
              <div class="flex items-center justify-between text-purple-900">
                <span class="flex items-center gap-1.5"><span class="inline-block w-2.5 h-2.5 rounded-xs" style="background:#9333EA"></span>⛳ 골프 (${golfSeriesData[idx]}%):</span>
                <strong>${formatCurrency(ty.golfRevenue)} 원</strong>
              </div>
              ` : ''}
              ${otherSeriesData[idx] > 0 ? `
              <div class="flex items-center justify-between text-slate-700">
                <span class="flex items-center gap-1.5"><span class="inline-block w-2.5 h-2.5 rounded-xs" style="background:#94A3B8"></span>📦 기타 (${otherSeriesData[idx]}%):</span>
                <strong>${formatCurrency(ty.otherRevenue)} 원</strong>
              </div>
              ` : ''}
            </div>
          `;
          return html;
        }
      },
      legend: {
        data: legendData,
        top: 0,
        textStyle: { color: '#475569', fontWeight: 600, fontSize: 11 }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '12%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: xLabels,
        axisLabel: { color: '#334155', fontWeight: 700, fontSize: 12 }
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLabel: {
          formatter: '{value}%',
          color: '#64748b',
          fontWeight: 600
        },
        splitLine: { lineStyle: { color: '#f1f5f9' } }
      },
      series: seriesConfig
    };
  }, [data, metricMode]);

  // 2. 12개월 전년 vs 올해 TrevPAR 성장 트렌드 차트
  const yoyTrendChartOptions = React.useMemo(() => {
    if (!data?.monthlyComparison) return null;

    const lyValues: number[] = [];
    const tyValues: (number | null)[] = [];
    const growthRates: (number | null)[] = [];

    data.monthlyComparison.forEach(item => {
      const lyVal = getTrevparValue(item.ly, metricMode, 2025, item.month);
      const tyVal = item.ty ? getTrevparValue(item.ty, metricMode, 2026, item.month) : null;
      
      lyValues.push(lyVal || 0);
      tyValues.push(tyVal);

      if (tyVal !== null && lyVal !== null && lyVal > 0) {
        const rate = Number((((tyVal - lyVal) / lyVal) * 100).toFixed(1));
        growthRates.push(rate);
      } else {
        growthRates.push(null);
      }
    });

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross', crossStyle: { color: '#999' } },
        formatter: (params: any[]) => {
          if (!params || params.length === 0) return '';
          let result = `<div class="font-bold text-slate-800 pb-1 border-b border-slate-200 mb-1.5">${params[0].name} (175실 기준 ${metricMode === 'TOTAL' ? '골프 포함' : '골프 제외'})</div>`;
          params.forEach(p => {
            if (p.value !== null && p.value !== undefined) {
              const valStr = p.seriesName.includes('증감률') 
                ? `${p.value > 0 ? '+' : ''}${p.value}%` 
                : `${new Intl.NumberFormat('ko-KR').format(p.value)} 원`;
              result += `<div class="flex items-center justify-between gap-4 text-xs py-0.5">
                <span style="color:${p.color}">● ${p.seriesName}</span>
                <strong>${valStr}</strong>
              </div>`;
            }
          });
          return result;
        }
      },
      legend: {
        data: ['2025년 (전년)', '2026년 (올해)', '전년 대비 증감률(%)'],
        top: 0,
        textStyle: { color: '#475569', fontWeight: 600 }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '14%',
        containLabel: true
      },
      xAxis: [
        {
          type: 'category',
          data: monthLabels,
          axisPointer: { type: 'shadow' },
          axisLabel: { color: '#64748b', fontWeight: 600 }
        }
      ],
      yAxis: [
        {
          type: 'value',
          name: '객실당 총매출 (원)',
          axisLabel: {
            formatter: (value: number) => `₩${(value / 10000).toFixed(0)}만`,
            color: '#64748b'
          },
          splitLine: { lineStyle: { color: '#f1f5f9' } }
        },
        {
          type: 'value',
          name: '증감률 (%)',
          axisLabel: {
            formatter: '{value}%',
            color: '#64748b'
          },
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: '2025년 (전년)',
          type: 'bar',
          barWidth: '22%',
          itemStyle: {
            color: '#cbd5e1',
            borderRadius: [4, 4, 0, 0]
          },
          data: lyValues
        },
        {
          name: '2026년 (올해)',
          type: 'bar',
          barWidth: '22%',
          itemStyle: {
            color: metricMode === 'TOTAL' ? '#0d9488' : '#0284c7',
            borderRadius: [4, 4, 0, 0]
          },
          data: tyValues
        },
        {
          name: '전년 대비 증감률(%)',
          type: 'line',
          yAxisIndex: 1,
          symbol: 'circle',
          symbolSize: 7,
          itemStyle: {
            color: '#f59e0b'
          },
          lineStyle: {
            width: 2.5,
            color: '#f59e0b'
          },
          data: growthRates
        }
      ]
    };
  }, [data, metricMode]);

  return (
    <div className="lg:col-span-12 bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/80">
      
      {/* Header & Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-6 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-teal-50 text-teal-700 rounded-2xl border border-teal-100">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                객실당 총매출 (TrevPAR) 월별 전년 vs 올해 비교 분석
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800">
                  175실 고정 인프라 기준
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                상단 주요 지표와 100% 동일한 기준 (리조트 총매출 ÷ 전체 175실) 및 6대 사업 부문(숙박·식음·레저·모토·대관·골프) 월별 기여도를 전수 분석합니다.
              </p>
            </div>
          </div>
        </div>

        {/* View Mode & 2-Track Toggle Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Chart View Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
            <button
              onClick={() => setChartViewTab('STACKED_100')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                chartViewTab === 'STACKED_100'
                  ? 'bg-white text-indigo-900 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
              <span>2026년 부문 기여도 100% 차트</span>
            </button>
            <button
              onClick={() => setChartViewTab('YOY_TREND')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                chartViewTab === 'YOY_TREND'
                  ? 'bg-white text-teal-900 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
              <span>12개월 TrevPAR 성장 트렌드</span>
            </button>
          </div>

          {/* 2-Track Toggle Pills */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
            <button
              onClick={() => setMetricMode('TOTAL')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                metricMode === 'TOTAL'
                  ? 'bg-white text-teal-800 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>⛳</span> 골프 포함
            </button>
            <button
              onClick={() => setMetricMode('EX_GOLF')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                metricMode === 'EX_GOLF'
                  ? 'bg-white text-sky-800 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>🏨</span> 골프 제외
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-72 flex flex-col items-center justify-center text-slate-400 animate-pulse">
          <Calendar className="w-8 h-8 text-slate-300 mb-2" />
          <p className="text-sm font-medium">12개월 월별 객실당 총매출(TrevPAR) 지표를 집계하고 있습니다...</p>
        </div>
      ) : !data || error ? (
        <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 text-center space-y-3">
          <div className="inline-flex p-3 bg-amber-50 rounded-2xl text-amber-600 border border-amber-100">
            <Info className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">백엔드 공식 전용 API 연동 대기 중</h3>
          <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
            무관용 SSOT 원칙에 따라 백엔드 엔드포인트 <code>/api/v5/report/monthly-room-efficiency</code> 배포 후 100% 검증된 12개월 전수 데이터가 차트와 테이블에 자동 렌더링됩니다.
          </p>
        </div>
      ) : (
        <>
          {/* Main Chart Section (Tab Switched) */}
          <div className="mb-8 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
            {chartViewTab === 'STACKED_100' ? (
              <>
                <div className="flex items-center justify-between px-2 pt-1 pb-2 border-b border-slate-200/60 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                    <h3 className="text-sm font-bold text-slate-800">
                      2026년 월별 TrevPAR 부문 기여도 100% 누적 막대 차트 ({metricMode === 'TOTAL' ? '⛳ 골프 포함 전사' : '🏨 골프 제외 순수 리조트'})
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">1월 ~ 8월 실적 집계 기준</span>
                </div>
                {stackedChartOptions && (
                  <ReactECharts option={stackedChartOptions} style={{ height: '380px', width: '100%' }} />
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between px-2 pt-1 pb-2 border-b border-slate-200/60 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-teal-600"></span>
                    <h3 className="text-sm font-bold text-slate-800">
                      12개월 TrevPAR 성장 트렌드 (전년 2025 vs 올해 2026, {metricMode === 'TOTAL' ? '골프 포함' : '골프 제외'})
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">175실 인프라 고정 기준</span>
                </div>
                {yoyTrendChartOptions && (
                  <ReactECharts option={yoyTrendChartOptions} style={{ height: '380px', width: '100%' }} />
                )}
              </>
            )}
          </div>

          {/* 12-Month Detailed Reconciliation Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-3 text-center">월</th>
                  <th className="py-3.5 px-3 text-right bg-slate-100/50">2025년 판매객실</th>
                  <th className="py-3.5 px-3 text-center bg-slate-100/60 min-w-[280px]">
                    2025년 {metricMode === 'TOTAL' ? '매출 비중 (숙·식·레·모·대·골)' : '순수 리조트 비중 (숙·식·레·모·대)'}
                  </th>
                  <th className="py-3.5 px-3 text-right bg-slate-100/50">2025년 {metricMode === 'TOTAL' ? '전사 총매출' : '순수 리조트매출'}</th>
                  <th className="py-3.5 px-3 text-right bg-slate-100/70 font-black text-slate-800">2025년 TrevPAR</th>
                  <th className="py-3.5 px-3 text-right bg-teal-50/40">2026년 판매객실</th>
                  <th className="py-3.5 px-3 text-center bg-teal-50/60 min-w-[280px]">
                    2026년 {metricMode === 'TOTAL' ? '매출 비중 (숙·식·레·모·대·골)' : '순수 리조트 비중 (숙·식·레·모·대)'}
                  </th>
                  <th className="py-3.5 px-3 text-right bg-teal-50/40">2026년 {metricMode === 'TOTAL' ? '전사 총매출' : '순수 리조트매출'}</th>
                  <th className="py-3.5 px-3 text-right bg-teal-50/70 font-black text-teal-900">2026년 TrevPAR</th>
                  <th className="py-3.5 px-3 text-right">전년 대비 증감액</th>
                  <th className="py-3.5 px-3 text-center">증감률</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {data.monthlyComparison.map((item) => {
                  const lyRev = metricMode === 'TOTAL' ? item.ly?.totalRevenue : item.ly?.netRevenueWithoutGolf;
                  const lyTrevpar = getTrevparValue(item.ly, metricMode, 2025, item.month);
                  const lyShares = getShareRatios(item.ly, metricMode);
                  
                  const tyRev = item.ty ? (metricMode === 'TOTAL' ? item.ty.totalRevenue : item.ty.netRevenueWithoutGolf) : null;
                  const tyTrevpar = item.ty ? getTrevparValue(item.ty, metricMode, 2026, item.month) : null;
                  const tyShares = item.ty ? getShareRatios(item.ty, metricMode) : null;
                  
                  const diffAmount = (tyTrevpar !== null && lyTrevpar !== null) ? (tyTrevpar - lyTrevpar) : null;
                  const growthRate = (tyTrevpar !== null && lyTrevpar !== null && lyTrevpar > 0) ? Number((((tyTrevpar - lyTrevpar) / lyTrevpar) * 100).toFixed(1)) : null;

                  return (
                    <tr key={item.month} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-bold text-center text-slate-900 bg-slate-50/30">
                        {item.monthLabel}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums">
                        {item.ly?.roomsSold ? `${formatCurrency(item.ly.roomsSold)} 실` : '-'}
                      </td>
                      
                      {/* 2025년 매출 비중 */}
                      <td className="py-3 px-3 text-center bg-slate-100/20">
                        {lyShares ? (
                          <div className="flex items-center justify-center gap-1 text-[11px] font-medium flex-wrap">
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200" title="숙박 비중">
                              숙 {lyShares.roomRatio}%
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200" title="식음 비중">
                              식 {lyShares.fnbRatio}%
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200" title="레저 비중">
                              레 {lyShares.leisureRatio}%
                            </span>
                            {lyShares.motoRatio !== undefined && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-900 border border-rose-200" title="모토아레나 비중">
                                모 {lyShares.motoRatio}%
                              </span>
                            )}
                            {lyShares.banquetRatio !== undefined && (
                              <span className="px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-900 border border-cyan-200" title="대관/연회 비중">
                                대 {lyShares.banquetRatio}%
                              </span>
                            )}
                            {metricMode === 'TOTAL' && lyShares.golfRatio !== null && (
                              <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-900 border border-purple-200" title="골프 비중">
                                골 {lyShares.golfRatio}%
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right tabular-nums">
                        {lyRev ? `${formatCurrency(lyRev)} 원` : '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900 tabular-nums bg-slate-100/30">
                        {lyTrevpar ? `${formatCurrency(lyTrevpar)} 원` : '-'}
                      </td>
                      
                      <td className="py-3 px-3 text-right tabular-nums">
                        {item.ty?.roomsSold ? `${formatCurrency(item.ty.roomsSold)} 실` : <span className="text-slate-300">-</span>}
                      </td>

                      {/* 2026년 매출 비중 */}
                      <td className="py-3 px-3 text-center bg-teal-50/20">
                        {tyShares ? (
                          <div className="flex items-center justify-center gap-1 text-[11px] font-medium flex-wrap">
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200" title="숙박 비중">
                              숙 {tyShares.roomRatio}%
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200" title="식음 비중">
                              식 {tyShares.fnbRatio}%
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200" title="레저 비중">
                              레 {tyShares.leisureRatio}%
                            </span>
                            {tyShares.motoRatio !== undefined && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-900 border border-rose-200" title="모토아레나 비중">
                                모 {tyShares.motoRatio}%
                              </span>
                            )}
                            {tyShares.banquetRatio !== undefined && (
                              <span className="px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-900 border border-cyan-200" title="대관/연회 비중">
                                대 {tyShares.banquetRatio}%
                              </span>
                            )}
                            {metricMode === 'TOTAL' && tyShares.golfRatio !== null && (
                              <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-900 border border-purple-200" title="골프 비중">
                                골 {tyShares.golfRatio}%
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right tabular-nums">
                        {tyRev !== null && tyRev !== undefined ? `${formatCurrency(tyRev)} 원` : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-teal-800 tabular-nums bg-teal-50/30">
                        {tyTrevpar !== null && tyTrevpar !== undefined ? `${formatCurrency(tyTrevpar)} 원` : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums">
                        {diffAmount !== null && diffAmount !== undefined ? (
                          <span className={`font-semibold ${diffAmount >= 0 ? 'text-teal-600' : 'text-rose-500'}`}>
                            {diffAmount > 0 ? '+' : ''}{formatCurrency(diffAmount)} 원
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {growthRate !== null && growthRate !== undefined ? (
                          <span className={`inline-block px-2 py-0.5 rounded font-bold text-[11px] ${
                            growthRate >= 0 ? 'bg-teal-50 text-teal-700' : 'bg-rose-50 text-rose-600'
                          }`}>
                            {growthRate >= 0 ? '▲' : '▼'} {Math.abs(growthRate).toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Business Insights Footer */}
          <div className="mt-4 p-4 rounded-2xl bg-teal-50/50 border border-teal-100/70 text-xs text-teal-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-600 flex-shrink-0" />
              <span>
                <strong>경영 포트폴리오 분석:</strong> {metricMode === 'TOTAL' ? '골프를 포함한 전사 6대 부문(숙박·식음·레저·모토·대관·골프)' : '골프를 제외한 순수 리조트 5대 부문(숙박·식음·레저·모토·대관)'}의 월별 기여 비중을 상단 100% 누적 막대 차트 및 12개월 전수 테이블에서 한눈에 직관적으로 비교할 수 있습니다.
              </span>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
