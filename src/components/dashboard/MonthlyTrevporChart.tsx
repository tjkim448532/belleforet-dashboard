import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { Building, Sparkles, Info, Calendar, BarChart3, TrendingUp, HelpCircle } from 'lucide-react';
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
  const [stackedYearMode, setStackedYearMode] = useState<'COMPARE' | 'TY_ONLY' | 'LY_ONLY'>('COMPARE');
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
      return availRooms > 0 ? Math.round(Number(itemNode.totalRevenue || 0) / availRooms) : 0;
    } else {
      if (itemNode.trevparWithoutGolf !== undefined && itemNode.trevparWithoutGolf !== null) return itemNode.trevparWithoutGolf;
      const pureRev = Number(itemNode.netRevenueWithoutGolf ?? (Number(itemNode.totalRevenue || 0) - Number(itemNode.golfRevenue || 0)));
      return availRooms > 0 ? Math.round(pureRev / availRooms) : 0;
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

  // 1. [공식 명세] 전년(2025) vs 올해(2026) 100% 누적 막대 비교 차트 옵션 (Google Material Looker Studio 표준)
  const stackedChartOptions = React.useMemo(() => {
    if (!data?.monthlyComparison) return null;

    const validMonths = data.monthlyComparison.filter(d => d.ty !== null);
    if (validMonths.length === 0) return null;

    const xLabels = validMonths.map(d => stackedYearMode === 'COMPARE' ? `${d.monthLabel}\n(25 vs 26)` : d.monthLabel);

    // 2026년 데이터 배열
    const tyRoom: number[] = [];
    const tyFnb: number[] = [];
    const tyLeisure: number[] = [];
    const tyMoto: number[] = [];
    const tyBanquet: number[] = [];
    const tyGolf: number[] = [];
    const tyOther: number[] = [];

    // 2025년 데이터 배열
    const lyRoom: number[] = [];
    const lyFnb: number[] = [];
    const lyLeisure: number[] = [];
    const lyMoto: number[] = [];
    const lyBanquet: number[] = [];
    const lyGolf: number[] = [];
    const lyOther: number[] = [];

    validMonths.forEach(d => {
      const ty = d.ty!;
      const ly = d.ly;

      if (metricMode === 'TOTAL') {
        tyRoom.push(Number(ty.roomRatio ?? 0));
        tyFnb.push(Number(ty.fnbRatio ?? 0));
        tyLeisure.push(Number(ty.leisureRatio ?? 0));
        tyMoto.push(Number(ty.motoRatio ?? 0));
        tyBanquet.push(Number(ty.banquetRatio ?? 0));
        tyGolf.push(Number(ty.golfRatio ?? 0));
        tyOther.push(Number(ty.otherRatio ?? 0));

        if (ly) {
          lyRoom.push(Number(ly.roomRatio ?? 0));
          lyFnb.push(Number(ly.fnbRatio ?? 0));
          lyLeisure.push(Number(ly.leisureRatio ?? 0));
          lyMoto.push(Number(ly.motoRatio ?? 0));
          lyBanquet.push(Number(ly.banquetRatio ?? 0));
          lyGolf.push(Number(ly.golfRatio ?? 0));
          lyOther.push(Number(ly.otherRatio ?? 0));
        } else {
          lyRoom.push(0); lyFnb.push(0); lyLeisure.push(0); lyMoto.push(0); lyBanquet.push(0); lyGolf.push(0); lyOther.push(0);
        }
      } else {
        tyRoom.push(Number(ty.resortRoomRatio ?? ty.roomRatio ?? 0));
        tyFnb.push(Number(ty.resortFnbRatio ?? ty.fnbRatio ?? 0));
        tyLeisure.push(Number(ty.resortLeisureRatio ?? ty.leisureRatio ?? 0));
        tyMoto.push(Number(ty.resortMotoRatio ?? ty.motoRatio ?? 0));
        tyBanquet.push(Number(ty.resortBanquetRatio ?? ty.banquetRatio ?? 0));
        tyOther.push(Number(ty.resortOtherRatio ?? ty.otherRatio ?? 0));

        if (ly) {
          lyRoom.push(Number(ly.resortRoomRatio ?? ly.roomRatio ?? 0));
          lyFnb.push(Number(ly.resortFnbRatio ?? ly.fnbRatio ?? 0));
          lyLeisure.push(Number(ly.resortLeisureRatio ?? ly.leisureRatio ?? 0));
          lyMoto.push(Number(ly.resortMotoRatio ?? ly.motoRatio ?? 0));
          lyBanquet.push(Number(ly.resortBanquetRatio ?? ly.banquetRatio ?? 0));
          lyOther.push(Number(ly.resortOtherRatio ?? ly.otherRatio ?? 0));
        } else {
          lyRoom.push(0); lyFnb.push(0); lyLeisure.push(0); lyMoto.push(0); lyBanquet.push(0); lyOther.push(0);
        }
      }
    });

    const isCompare = stackedYearMode === 'COMPARE';
    const showLy = isCompare || stackedYearMode === 'LY_ONLY';
    const showTy = isCompare || stackedYearMode === 'TY_ONLY';

    const seriesConfig: any[] = [];

    // 2025년 시리즈 (전년 비교 모드일 때 좌측 막대로 표출)
    if (showLy) {
      const lyStack = isCompare ? '2025' : 'total';
      const lyBarWidth = isCompare ? 26 : 38;

      seriesConfig.push(
        {
          name: '숙박',
          type: 'bar',
          stack: lyStack,
          barWidth: lyBarWidth,
          barGap: isCompare ? '12%' : '20%',
          itemStyle: { color: isCompare ? '#60A5FA' : '#1E3A8A' },
          label: {
            show: true,
            position: 'inside',
            formatter: (params: any) => params.value >= 7 ? `${Math.round(params.value)}%` : '',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: 11
          },
          data: lyRoom
        },
        {
          name: '식음',
          type: 'bar',
          stack: lyStack,
          itemStyle: { color: isCompare ? '#4ADE80' : '#16A34A' },
          label: {
            show: true,
            position: 'inside',
            formatter: (params: any) => params.value >= 7 ? `${Math.round(params.value)}%` : '',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: 11
          },
          data: lyFnb
        },
        {
          name: '레저',
          type: 'bar',
          stack: lyStack,
          itemStyle: { color: isCompare ? '#FDE047' : '#EAB308' },
          label: {
            show: true,
            position: 'inside',
            formatter: (params: any) => params.value >= 7 ? `${Math.round(params.value)}%` : '',
            color: '#1E293B',
            fontWeight: 700,
            fontSize: 11
          },
          data: lyLeisure
        },
        {
          name: '모토아레나',
          type: 'bar',
          stack: lyStack,
          itemStyle: { color: isCompare ? '#FB7185' : '#E11D48' },
          label: {
            show: true,
            position: 'inside',
            formatter: (params: any) => params.value >= 7 ? `${Math.round(params.value)}%` : '',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: 11
          },
          data: lyMoto
        },
        {
          name: '대관/연회',
          type: 'bar',
          stack: lyStack,
          itemStyle: { color: isCompare ? '#22D3EE' : '#0891B2' },
          label: {
            show: true,
            position: 'inside',
            formatter: (params: any) => params.value >= 7 ? `${Math.round(params.value)}%` : '',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: 11
          },
          data: lyBanquet
        }
      );

      if (metricMode === 'TOTAL') {
        seriesConfig.push({
          name: '골프',
          type: 'bar',
          stack: lyStack,
          itemStyle: { color: isCompare ? '#C084FC' : '#9333EA' },
          label: {
            show: true,
            position: 'inside',
            formatter: (params: any) => params.value >= 7 ? `${Math.round(params.value)}%` : '',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: 11
          },
          data: lyGolf
        });
      }
    }

    // 2026년 시리즈 (올해 실적 막대)
    if (showTy) {
      const tyStack = isCompare ? '2026' : 'total';
      const tyBarWidth = isCompare ? 26 : 38;

      seriesConfig.push(
        {
          name: '숙박',
          type: 'bar',
          stack: tyStack,
          barWidth: tyBarWidth,
          itemStyle: { color: '#1E3A8A' },
          label: {
            show: true,
            position: 'inside',
            formatter: (params: any) => params.value >= 7 ? `${Math.round(params.value)}%` : '',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: 11
          },
          data: tyRoom
        },
        {
          name: '식음',
          type: 'bar',
          stack: tyStack,
          itemStyle: { color: '#16A34A' },
          label: {
            show: true,
            position: 'inside',
            formatter: (params: any) => params.value >= 7 ? `${Math.round(params.value)}%` : '',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: 11
          },
          data: tyFnb
        },
        {
          name: '레저',
          type: 'bar',
          stack: tyStack,
          itemStyle: { color: '#EAB308' },
          label: {
            show: true,
            position: 'inside',
            formatter: (params: any) => params.value >= 7 ? `${Math.round(params.value)}%` : '',
            color: '#1E293B',
            fontWeight: 700,
            fontSize: 11
          },
          data: tyLeisure
        },
        {
          name: '모토아레나',
          type: 'bar',
          stack: tyStack,
          itemStyle: { color: '#E11D48' },
          label: {
            show: true,
            position: 'inside',
            formatter: (params: any) => params.value >= 7 ? `${Math.round(params.value)}%` : '',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: 11
          },
          data: tyMoto
        },
        {
          name: '대관/연회',
          type: 'bar',
          stack: tyStack,
          itemStyle: { color: '#0891B2' },
          label: {
            show: true,
            position: 'inside',
            formatter: (params: any) => params.value >= 7 ? `${Math.round(params.value)}%` : '',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: 11
          },
          data: tyBanquet
        }
      );

      if (metricMode === 'TOTAL') {
        seriesConfig.push({
          name: '골프',
          type: 'bar',
          stack: tyStack,
          itemStyle: { color: '#9333EA' },
          label: {
            show: true,
            position: 'inside',
            formatter: (params: any) => params.value >= 7 ? `${Math.round(params.value)}%` : '',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: 11
          },
          data: tyGolf
        });
      }
    }

    const legendData = ['숙박', '식음', '레저', '모토아레나', '대관/연회', ...(metricMode === 'TOTAL' ? ['골프'] : [])];

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(232, 240, 254, 0.3)' } },
        backgroundColor: '#ffffff',
        borderColor: '#e8eaed',
        borderWidth: 1,
        padding: [12, 16],
        extraCssText: 'box-shadow: 0 4px 16px rgba(60, 64, 67, 0.15); border-radius: 12px;',
        textStyle: { color: '#202124', fontFamily: 'Pretendard, Roboto, sans-serif' },
        formatter: (params: any[]) => {
          if (!params || params.length === 0) return '';
          const idx = params[0].dataIndex;
          const monthItem = validMonths[idx];
          const ty = monthItem.ty;
          const ly = monthItem.ly;
          if (!ty) return '';

          const tyTrevpar = getTrevparValue(ty, metricMode, 2026, monthItem.month);
          const lyTrevpar = ly ? getTrevparValue(ly, metricMode, 2025, monthItem.month) : null;
          const growth = (tyTrevpar && lyTrevpar && lyTrevpar > 0) ? Number((((tyTrevpar - lyTrevpar) / lyTrevpar) * 100).toFixed(1)) : null;

          let html = `
            <div style="font-weight:700; font-size:14px; color:#202124; padding-bottom:8px; margin-bottom:8px; border-bottom:1px solid #f1f3f4;">
              📅 ${monthItem.monthLabel} 전년(2025) vs 올해(2026) 부문별 비중 비교 <span style="font-size:11px; font-weight:500; color:#5f6368;">(${metricMode === 'TOTAL' ? '골프 포함 전사' : '골프 제외 순수 리조트'})</span>
            </div>
            <div style="font-size:12px; margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid #f1f3f4; display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
              <div>
                <span style="color:#5f6368;">2025년 TrevPAR:</span> <strong style="color:#334155;">${formatCurrency(lyTrevpar)}원</strong>
              </div>
              <div>
                <span style="color:#5f6368;">2026년 TrevPAR:</span> <strong style="color:#00897b;">${formatCurrency(tyTrevpar)}원</strong>
                ${growth !== null ? `<span style="font-size:11px; font-weight:700; color:${growth >= 0 ? '#137333' : '#d93025'}; margin-left:4px;">(${growth > 0 ? '+' : ''}${growth}%)</span>` : ''}
              </div>
            </div>
            <div style="font-size:12px; display:flex; flex-direction:column; gap:6px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="color:#1E3A8A; font-weight:600;">🏨 숙박 (Accommodation):</span>
                <span>${lyRoom[idx]}% (25년) ➔ <strong style="color:#1E3A8A;">${tyRoom[idx]}% (26년)</strong> <span style="font-size:11px; color:${tyRoom[idx] >= lyRoom[idx] ? '#137333' : '#d93025'};">(${tyRoom[idx] >= lyRoom[idx] ? '+' : ''}${(tyRoom[idx] - lyRoom[idx]).toFixed(1)}%p)</span></span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="color:#16A34A; font-weight:600;">🍽️ 식음 (F&B):</span>
                <span>${lyFnb[idx]}% (25년) ➔ <strong style="color:#16A34A;">${tyFnb[idx]}% (26년)</strong> <span style="font-size:11px; color:${tyFnb[idx] >= lyFnb[idx] ? '#137333' : '#d93025'};">(${tyFnb[idx] >= lyFnb[idx] ? '+' : ''}${(tyFnb[idx] - lyFnb[idx]).toFixed(1)}%p)</span></span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="color:#B45309; font-weight:600;">🎢 레저 (Leisure):</span>
                <span>${lyLeisure[idx]}% (25년) ➔ <strong style="color:#B45309;">${tyLeisure[idx]}% (26년)</strong> <span style="font-size:11px; color:${tyLeisure[idx] >= lyLeisure[idx] ? '#137333' : '#d93025'};">(${tyLeisure[idx] >= lyLeisure[idx] ? '+' : ''}${(tyLeisure[idx] - lyLeisure[idx]).toFixed(1)}%p)</span></span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="color:#E11D48; font-weight:600;">🏎️ 모토아레나 (Moto):</span>
                <span>${lyMoto[idx]}% (25년) ➔ <strong style="color:#E11D48;">${tyMoto[idx]}% (26년)</strong> <span style="font-size:11px; color:${tyMoto[idx] >= lyMoto[idx] ? '#137333' : '#d93025'};">(${tyMoto[idx] >= lyMoto[idx] ? '+' : ''}${(tyMoto[idx] - lyMoto[idx]).toFixed(1)}%p)</span></span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="color:#0891B2; font-weight:600;">🏛️ 대관/연회 (Banquet):</span>
                <span>${lyBanquet[idx]}% (25년) ➔ <strong style="color:#0891B2;">${tyBanquet[idx]}% (26년)</strong> <span style="font-size:11px; color:${tyBanquet[idx] >= lyBanquet[idx] ? '#137333' : '#d93025'};">(${tyBanquet[idx] >= lyBanquet[idx] ? '+' : ''}${(tyBanquet[idx] - lyBanquet[idx]).toFixed(1)}%p)</span></span>
              </div>
              ${metricMode === 'TOTAL' ? `
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="color:#9333EA; font-weight:600;">⛳ 골프 (Golf):</span>
                <span>${lyGolf[idx]}% (25년) ➔ <strong style="color:#9333EA;">${tyGolf[idx]}% (26년)</strong> <span style="font-size:11px; color:${tyGolf[idx] >= lyGolf[idx] ? '#137333' : '#d93025'};">(${tyGolf[idx] >= lyGolf[idx] ? '+' : ''}${(tyGolf[idx] - lyGolf[idx]).toFixed(1)}%p)</span></span>
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
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        itemGap: 16,
        textStyle: { color: '#3c4043', fontWeight: 600, fontSize: 12, fontFamily: 'Pretendard, Roboto, sans-serif' }
      },
      grid: {
        left: '2%',
        right: '2%',
        bottom: '3%',
        top: '12%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: xLabels,
        axisLine: { lineStyle: { color: '#dadce0' } },
        axisTick: { show: false },
        axisLabel: { 
          color: '#202124', 
          fontWeight: 600, 
          fontSize: 12,
          lineHeight: 16
        }
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          formatter: '{value}%',
          color: '#5f6368',
          fontWeight: 500,
          fontSize: 12
        },
        splitLine: { lineStyle: { color: '#f1f3f4', type: 'dashed' } }
      },
      series: seriesConfig
    };
  }, [data, metricMode, stackedYearMode]);

  // 2. 12개월 전년 vs 올해 TrevPAR 성장 트렌드 차트 (Google Material Looker Studio 표준)
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

    const maxVal = Math.max(...lyValues, ...tyValues.filter((v): v is number => v !== null), 100000);
    const yMax = Math.ceil((maxVal * 1.3) / 100000) * 100000;

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { 
          type: 'cross',
          crossStyle: { color: '#dadce0', width: 1, type: 'dashed' },
          shadowStyle: { color: 'rgba(232, 240, 254, 0.4)' }
        },
        backgroundColor: '#ffffff',
        borderColor: '#e8eaed',
        borderWidth: 1,
        padding: [12, 16],
        extraCssText: 'box-shadow: 0 4px 16px rgba(60, 64, 67, 0.15); border-radius: 12px;',
        textStyle: { color: '#202124', fontFamily: 'Pretendard, Roboto, -apple-system, sans-serif' },
        formatter: (params: any[]) => {
          if (!params || params.length === 0) return '';
          let result = `<div style="font-weight:700; font-size:14px; color:#202124; padding-bottom:8px; margin-bottom:8px; border-bottom:1px solid #f1f3f4;">
            📅 ${params[0].name} TrevPAR 분석 <span style="font-size:11px; font-weight:500; color:#5f6368;">(175실 인프라 기준)</span>
          </div>`;
          params.forEach(p => {
            if (p.value !== null && p.value !== undefined) {
              const isRate = p.seriesName.includes('증감률');
              const valStr = isRate
                ? `${p.value > 0 ? '+' : ''}${p.value}%` 
                : `${new Intl.NumberFormat('ko-KR').format(p.value)} 원`;
              const dotColor = p.color;
              result += `<div style="display:flex; justify-content:space-between; align-items:center; gap:16px; font-size:12px; margin-top:4px;">
                <span style="color:#5f6368; display:flex; align-items:center; gap:6px;">
                  <span style="width:8px; height:8px; border-radius:50%; background:${dotColor}; display:inline-block;"></span>
                  ${p.seriesName}
                </span>
                <strong style="color:${isRate ? (p.value >= 0 ? '#137333' : '#d93025') : '#202124'}; font-weight:700;">${valStr}</strong>
              </div>`;
            }
          });
          return result;
        }
      },
      legend: {
        data: ['2025년 (전년)', '2026년 (올해)', '전년 대비 증감률(%)'],
        top: 0,
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        itemGap: 20,
        textStyle: { color: '#3c4043', fontWeight: 500, fontSize: 12, fontFamily: 'Pretendard, Roboto, sans-serif' }
      },
      grid: {
        left: '2%',
        right: '2%',
        bottom: '3%',
        top: '12%',
        containLabel: true
      },
      xAxis: [
        {
          type: 'category',
          data: monthLabels,
          axisLine: { lineStyle: { color: '#dadce0' } },
          axisTick: { show: false },
          axisLabel: { 
            color: '#202124', 
            fontWeight: 600, 
            fontSize: 13,
            margin: 12
          }
        }
      ],
      yAxis: [
        {
          type: 'value',
          name: '객실당 총매출',
          nameTextStyle: { color: '#5f6368', fontWeight: 500, fontSize: 12, padding: [0, 0, 8, 0] },
          min: 0,
          max: yMax,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            formatter: (value: number) => `₩${Math.round(value / 10000)}만`,
            color: '#5f6368',
            fontWeight: 500,
            fontSize: 12
          },
          splitLine: { lineStyle: { color: '#f1f3f4', type: 'dashed' } }
        },
        {
          type: 'value',
          name: '증감률',
          nameTextStyle: { color: '#5f6368', fontWeight: 500, fontSize: 12, padding: [0, 0, 8, 0] },
          min: -60,
          max: 60,
          interval: 30,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            formatter: '{value}%',
            color: '#5f6368',
            fontWeight: 500,
            fontSize: 12
          },
          splitLine: { 
            show: true,
            lineStyle: { color: '#e8eaed', type: 'solid', width: 1 } 
          }
        }
      ],
      series: [
        {
          name: '2025년 (전년)',
          type: 'bar',
          barWidth: 20,
          barGap: '25%',
          itemStyle: {
            color: '#dadce0',
            borderRadius: [4, 4, 0, 0]
          },
          data: lyValues
        },
        {
          name: '2026년 (올해)',
          type: 'bar',
          barWidth: 20,
          itemStyle: {
            color: metricMode === 'TOTAL' ? '#1a73e8' : '#00897b',
            borderRadius: [4, 4, 0, 0]
          },
          label: {
            show: true,
            position: 'top',
            distance: 6,
            formatter: (p: any) => p.value > 0 ? `₩${Math.round(p.value / 10000)}만` : '',
            color: '#202124',
            fontWeight: 600,
            fontSize: 12,
            fontFamily: 'Pretendard, Roboto, sans-serif'
          },
          data: tyValues
        },
        {
          name: '전년 대비 증감률(%)',
          type: 'line',
          yAxisIndex: 1,
          smooth: 0.3,
          symbol: 'circle',
          symbolSize: 7,
          itemStyle: {
            color: '#e37400',
            borderColor: '#ffffff',
            borderWidth: 2
          },
          lineStyle: {
            width: 2.5,
            color: '#e37400'
          },
          label: {
            show: true,
            position: 'top',
            distance: 8,
            formatter: (p: any) => p.value !== null ? `${p.value > 0 ? '+' : ''}${p.value}%` : '',
            color: '#b06000',
            fontWeight: 600,
            fontSize: 11,
            fontFamily: 'Pretendard, Roboto, sans-serif'
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
              <p className="text-xs text-slate-500 mt-0.5">
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
              <span>전년 vs 올해 부문 기여도 100% 비교</span>
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

      {/* 💡 직관적인 경영 가이드 배너 */}
      <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-teal-50/70 via-sky-50/50 to-slate-50 border border-teal-100 text-xs text-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 bg-teal-600 text-white rounded-lg mt-0.5 shrink-0">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm mb-0.5">
              💡 객실당 총매출 (TrevPAR: Total Revenue Per Available Room)이란?
            </div>
            <div className="text-slate-600 leading-relaxed">
              특정 월의 투숙률 편차에 구애받지 않고, 벨포레의 <strong>전체 보유 객실(175실) 인프라 1실이 벌어들인 월평균 총매출</strong>입니다. 리조트 전체 자산의 실질 생산성을 12개월 동일 잣대(Apple-to-Apple)로 전년 대비 성장률을 분석합니다.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 bg-white/80 px-3 py-1.5 rounded-xl border border-slate-200/70 font-semibold text-slate-800 text-[11px]">
          <span>📊 좌측 막대: 2025년</span>
          <span className="text-slate-300">|</span>
          <span className="text-indigo-800">● 우측 막대: 2026년</span>
          <span className="text-slate-300">|</span>
          <span className="text-amber-700">▲ 주황 실선: 성장률(%)</span>
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
          <div className="mb-8 bg-slate-50/50 p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            {chartViewTab === 'STACKED_100' ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between px-2 pt-1 pb-3 border-b border-slate-200/80 mb-3 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-indigo-600"></span>
                    <h3 className="text-sm font-black text-slate-900">
                      월별 TrevPAR 부문 기여도 100% 누적 막대 비교 ({metricMode === 'TOTAL' ? '⛳ 골프 포함 전사' : '🏨 골프 제외 순수 리조트'})
                    </h3>
                  </div>
                  
                  {/* Stacked Year Mode Selector */}
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center bg-white p-0.5 rounded-xl border border-slate-200 text-xs">
                      <button
                        onClick={() => setStackedYearMode('COMPARE')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          stackedYearMode === 'COMPARE'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        전년(25) vs 올해(26) 비교
                      </button>
                      <button
                        onClick={() => setStackedYearMode('TY_ONLY')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          stackedYearMode === 'TY_ONLY'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        2026년 (올해만)
                      </button>
                      <button
                        onClick={() => setStackedYearMode('LY_ONLY')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          stackedYearMode === 'LY_ONLY'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        2025년 (전년만)
                      </button>
                    </div>
                  </div>
                </div>

                {/* 🎨 부문별 색상 및 전년/올해 막대 직관 안내 바 */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/90 mb-3 text-xs shadow-2xs">
                  <div className="flex flex-wrap items-center gap-3.5">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <span className="w-3.5 h-3.5 rounded-sm bg-[#1E3A8A] inline-block shadow-2xs"></span>
                      <span>🏨 숙박</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <span className="w-3.5 h-3.5 rounded-sm bg-[#16A34A] inline-block shadow-2xs"></span>
                      <span>🍽️ 식음</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <span className="w-3.5 h-3.5 rounded-sm bg-[#EAB308] inline-block shadow-2xs"></span>
                      <span>🎢 레저</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <span className="w-3.5 h-3.5 rounded-sm bg-[#E11D48] inline-block shadow-2xs"></span>
                      <span>🏎️ 모토아레나</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <span className="w-3.5 h-3.5 rounded-sm bg-[#0891B2] inline-block shadow-2xs"></span>
                      <span>🏛️ 대관/연회</span>
                    </div>
                    {metricMode === 'TOTAL' && (
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <span className="w-3.5 h-3.5 rounded-sm bg-[#9333EA] inline-block shadow-2xs"></span>
                        <span>⛳ 골프</span>
                      </div>
                    )}
                  </div>
                  {stackedYearMode === 'COMPARE' && (
                    <div className="text-[11px] font-semibold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80 flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-xs bg-[#60A5FA]"></span>
                        좌측 연한 색: <strong>2025년 (전년)</strong>
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-xs bg-[#1E3A8A]"></span>
                        우측 진한 색: <strong>2026년 (올해)</strong>
                      </span>
                    </div>
                  )}
                </div>

                {stackedChartOptions && (
                  <ReactECharts option={stackedChartOptions} style={{ height: '480px', width: '100%' }} />
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between px-2 pt-1 pb-3 border-b border-slate-200/80 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-teal-600"></span>
                    <h3 className="text-sm font-black text-slate-900">
                      12개월 TrevPAR 성장 트렌드 (전년 2025 vs 올해 2026, {metricMode === 'TOTAL' ? '⛳ 골프 포함 전사' : '🏨 골프 제외 순수 리조트'})
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">175실 인프라 고정 기준</span>
                </div>
                {yoyTrendChartOptions && (
                  <ReactECharts option={yoyTrendChartOptions} style={{ height: '460px', width: '100%' }} />
                )}
              </>
            )}
          </div>

          {/* 12-Month Detailed Reconciliation Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
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
                      <td className="py-3 px-3 text-right tabular-nums font-semibold">
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
                      
                      <td className="py-3 px-3 text-right tabular-nums font-semibold">
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
                <strong>경영 포트폴리오 분석:</strong> {metricMode === 'TOTAL' ? '골프를 포함한 전사 6대 부문(숙박·식음·레저·모토·대관·골프)' : '골프를 제외한 순수 리조트 5대 부문(숙박·식음·레저·모토·대관)'}의 월별 기여 비중을 상단 차트 및 12개월 전수 테이블에서 한눈에 직관적으로 비교할 수 있습니다.
              </span>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
