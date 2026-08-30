import { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Building, Info, Calendar, BarChart3, TrendingUp, HelpCircle, Award, ArrowUpRight, ArrowDownRight, Filter, AlertTriangle } from 'lucide-react';
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
  const [chartViewTab, setChartViewTab] = useState<'YOY_TREND' | 'STACKED_100'>('YOY_TREND');
  const [metricMode, setMetricMode] = useState<'TOTAL' | 'EX_GOLF'>('TOTAL');
  const [periodMode, setPeriodMode] = useState<'CLOSED_ONLY' | 'ALL_MTD' | 'H1' | 'H2' | 'Q1' | 'Q2' | 'Q3' | 'Q4'>('CLOSED_ONLY');
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
        const res = await secureFetcher(`${API_BASE}/api/v6/report/monthly-room-efficiency?baseYear=2026&compareYear=2025`);
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
          console.warn('[MonthlyTrevporChart] Waiting for backend API /api/v6/report/monthly-room-efficiency:', err);
          setError('백엔드 전용 API(/api/v6/report/monthly-room-efficiency) 연동 대기 중입니다.');
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

  // 1. [동적 월 감지 엔진] 시간 경과(8월➔9월➔10월➔12월)에 따라 마감월/진행월을 100% 자동 연산
  const monthMeta = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const systemMonth = today.getMonth() + 1; // 1 ~ 12
    const systemDay = today.getDate();

    if (!data?.monthlyComparison) {
      return {
        activeMonth: systemMonth,
        lastClosedMonth: Math.max(1, systemMonth - 1),
        isCurrentMonthOngoing: true,
        daysAccumulated: systemDay,
        availableMonths: []
      };
    }

    // TY 실적이 존재하는 가장 최신 월 탐색
    const tyMonths = data.monthlyComparison
      .filter(d => d.ty !== null)
      .map(d => d.month);

    const activeMonth = tyMonths.length > 0 ? Math.max(...tyMonths) : systemMonth;
    
    // 현재 월이 진행 중(MTD)인지 확인: 당해 연도이고 현재 달이거나, 마지막 날 이전인 경우
    const isCurrentMonthOngoing = (data.baseYear === currentYear && activeMonth === systemMonth) || (activeMonth < 12 && systemDay < getDaysInMonth(data.baseYear, activeMonth));
    const lastClosedMonth = isCurrentMonthOngoing ? Math.max(1, activeMonth - 1) : activeMonth;

    return {
      activeMonth,
      lastClosedMonth,
      isCurrentMonthOngoing,
      daysAccumulated: systemDay,
      availableMonths: tyMonths
    };
  }, [data]);

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

  // Helper to extract divisional share ratios
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

  // Filtered dataset according to dynamic month status
  const targetPeriodMonths = useMemo(() => {
    if (!data?.monthlyComparison) return [];
    
    return data.monthlyComparison.filter(d => {
      if (periodMode === 'CLOSED_ONLY') {
        return d.month <= monthMeta.lastClosedMonth;
      } else if (periodMode === 'ALL_MTD') {
        return d.month <= monthMeta.activeMonth;
      } else if (periodMode === 'H1') {
        return d.month <= 6 && d.month <= monthMeta.activeMonth;
      } else if (periodMode === 'H2') {
        return d.month >= 7 && d.month <= 12 && d.month <= monthMeta.activeMonth;
      } else if (periodMode === 'Q1') {
        return d.month >= 1 && d.month <= 3 && d.month <= monthMeta.activeMonth;
      } else if (periodMode === 'Q2') {
        return d.month >= 4 && d.month <= 6 && d.month <= monthMeta.activeMonth;
      } else if (periodMode === 'Q3') {
        return d.month >= 7 && d.month <= 9 && d.month <= monthMeta.activeMonth;
      } else if (periodMode === 'Q4') {
        return d.month >= 10 && d.month <= 12 && d.month <= monthMeta.activeMonth;
      }
      return d.month <= monthMeta.activeMonth;
    });
  }, [data, periodMode, monthMeta]);

  // Executive KPI Highlights Calculation (선택된 기간 기준 정확한 연산)
  const kpiHighlights = useMemo(() => {
    if (targetPeriodMonths.length === 0) return null;

    let totalTyTrevparSum = 0;
    let totalLyTrevparSum = 0;
    let maxMonth = targetPeriodMonths[0];
    let maxTrevpar = 0;

    targetPeriodMonths.forEach(m => {
      const tyVal = getTrevparValue(m.ty, metricMode, 2026, m.month) || 0;
      const lyVal = getTrevparValue(m.ly, metricMode, 2025, m.month) || 0;
      totalTyTrevparSum += tyVal;
      totalLyTrevparSum += lyVal;
      if (tyVal > maxTrevpar) {
        maxTrevpar = tyVal;
        maxMonth = m;
      }
    });

    const avgTyTrevpar = Math.round(totalTyTrevparSum / targetPeriodMonths.length);
    const avgLyTrevpar = Math.round(totalLyTrevparSum / targetPeriodMonths.length);
    const yoyGrowth = avgLyTrevpar > 0 ? Number((((avgTyTrevpar - avgLyTrevpar) / avgLyTrevpar) * 100).toFixed(1)) : 0;

    let periodLabel = `공식 마감월 (1~${monthMeta.lastClosedMonth}월)`;
    if (periodMode === 'CLOSED_ONLY') {
      periodLabel = monthMeta.lastClosedMonth === 12 ? '연간 전체 마감 (1~12월)' : `공식 마감월 (1~${monthMeta.lastClosedMonth}월)`;
    } else if (periodMode === 'ALL_MTD') {
      periodLabel = `당월 포함 (1~${monthMeta.activeMonth}월 진행중)`;
    } else if (periodMode === 'H1') {
      periodLabel = '상반기 (1~6월)';
    } else if (periodMode === 'H2') {
      periodLabel = '하반기 (7~12월)';
    } else if (periodMode === 'Q1') {
      periodLabel = '1분기 (1~3월)';
    } else if (periodMode === 'Q2') {
      periodLabel = '2분기 (4~6월)';
    } else if (periodMode === 'Q3') {
      periodLabel = '3분기 (7~9월)';
    } else if (periodMode === 'Q4') {
      periodLabel = '4분기 (10~12월)';
    }

    return {
      periodLabel,
      closedCount: targetPeriodMonths.length,
      avgTyTrevpar,
      avgLyTrevpar,
      yoyGrowth,
      maxMonthName: maxMonth.monthLabel,
      maxTrevpar
    };
  }, [targetPeriodMonths, metricMode, periodMode, monthMeta]);

  // 1. [핵심 메인] 12개월 전년 vs 올해 TrevPAR 성장 트렌드 차트
  const yoyTrendChartOptions = useMemo(() => {
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
    const yMax = Math.ceil((maxVal * 1.35) / 100000) * 100000;

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { 
          type: 'cross',
          crossStyle: { color: '#cbd5e1', width: 1, type: 'dashed' },
          shadowStyle: { color: 'rgba(241, 245, 249, 0.6)' }
        },
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: [14, 18],
        extraCssText: 'box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); border-radius: 16px;',
        textStyle: { color: '#0f172a', fontFamily: 'Pretendard, -apple-system, sans-serif' },
        formatter: (params: any[]) => {
          if (!params || params.length === 0) return '';
          const mIdx = params[0].dataIndex;
          const isOngoingMonth = (mIdx + 1) === monthMeta.activeMonth && monthMeta.isCurrentMonthOngoing;

          let result = `
            <div style="font-weight:800; font-size:14px; color:#0f172a; padding-bottom:8px; margin-bottom:8px; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center;">
              <span>📅 ${params[0].name} TrevPAR ${isOngoingMonth ? `<span style="color:#e11d48; font-size:11px; font-weight:700;">(${monthMeta.daysAccumulated}일 누적 진행중)</span>` : ''}</span>
              <span style="font-size:11px; font-weight:600; color:#64748b; background:#f8fafc; padding:2px 6px; border-radius:6px; border:1px solid #e2e8f0;">175실 기준</span>
            </div>
          `;
          params.forEach(p => {
            if (p.value !== null && p.value !== undefined) {
              const isRate = p.seriesName.includes('증감률');
              const valStr = isRate
                ? `${p.value > 0 ? '+' : ''}${p.value}%` 
                : `${new Intl.NumberFormat('ko-KR').format(p.value)} 원 /실`;
              const dotColor = p.color;
              result += `
                <div style="display:flex; justify-content:space-between; align-items:center; gap:20px; font-size:12px; margin-top:5px;">
                  <span style="color:#475569; display:flex; align-items:center; gap:6px;">
                    <span style="width:8px; height:8px; border-radius:50%; background:${dotColor}; display:inline-block;"></span>
                    ${p.seriesName}
                  </span>
                  <strong style="color:${isRate ? (p.value >= 0 ? '#0d9488' : '#e11d48') : '#0f172a'}; font-weight:800;">${valStr}</strong>
                </div>
              `;
            }
          });
          if (isOngoingMonth) {
            result += `<div style="margin-top:8px; padding-top:6px; border-top:1px dashed #e2e8f0; font-size:11px; color:#e11d48; font-weight:600;">
              ⚠️ ${mIdx + 1}월은 ${monthMeta.daysAccumulated}일 집계 데이터로, 월 마감 전 진행 수치입니다.
            </div>`;
          }
          return result;
        }
      },
      legend: {
        data: ['2025년 (전년)', '2026년 (올해)', '전년 대비 증감률(%)'],
        top: 0,
        icon: 'circle',
        itemWidth: 9,
        itemHeight: 9,
        itemGap: 24,
        textStyle: { color: '#334155', fontWeight: 600, fontSize: 12, fontFamily: 'Pretendard, sans-serif' }
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
          data: monthLabels.map((m, idx) => {
            const isOngoing = (idx + 1) === monthMeta.activeMonth && monthMeta.isCurrentMonthOngoing;
            return isOngoing ? `${m}(진행중)` : m;
          }),
          axisLine: { lineStyle: { color: '#e2e8f0' } },
          axisTick: { show: false },
          axisLabel: { 
            color: '#1e293b', 
            fontWeight: 700, 
            fontSize: 13,
            margin: 12
          }
        }
      ],
      yAxis: [
        {
          type: 'value',
          name: '객실당 총매출 (TrevPAR)',
          nameTextStyle: { color: '#64748b', fontWeight: 600, fontSize: 12, padding: [0, 0, 8, 0] },
          min: 0,
          max: yMax,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            formatter: (value: number) => `₩${Math.round(value / 10000)}만`,
            color: '#64748b',
            fontWeight: 600,
            fontSize: 12
          },
          splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } }
        },
        {
          type: 'value',
          name: '증감률',
          nameTextStyle: { color: '#64748b', fontWeight: 600, fontSize: 12, padding: [0, 0, 8, 0] },
          min: -60,
          max: 60,
          interval: 30,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            formatter: '{value}%',
            color: '#64748b',
            fontWeight: 600,
            fontSize: 12
          },
          splitLine: { 
            show: true,
            lineStyle: { color: '#e2e8f0', type: 'solid', width: 1 } 
          }
        }
      ],
      series: [
        {
          name: '2025년 (전년)',
          type: 'bar',
          barWidth: 22,
          barGap: '20%',
          itemStyle: {
            color: '#cbd5e1',
            borderRadius: [5, 5, 0, 0]
          },
          data: lyValues
        },
        {
          name: '2026년 (올해)',
          type: 'bar',
          barWidth: 22,
          itemStyle: {
            color: (params: any) => {
              const isOngoing = (params.dataIndex + 1) === monthMeta.activeMonth && monthMeta.isCurrentMonthOngoing;
              if (isOngoing) return '#14b8a6';
              return metricMode === 'TOTAL' ? '#0d9488' : '#0284c7';
            },
            borderRadius: [5, 5, 0, 0]
          },
          label: {
            show: true,
            position: 'top',
            distance: 6,
            formatter: (p: any) => p.value > 0 ? `₩${Math.round(p.value / 10000)}만` : '',
            color: '#0f172a',
            fontWeight: 800,
            fontSize: 12,
            fontFamily: 'Pretendard, sans-serif'
          },
          data: tyValues
        },
        {
          name: '전년 대비 증감률(%)',
          type: 'line',
          yAxisIndex: 1,
          smooth: 0.35,
          symbol: 'circle',
          symbolSize: 8,
          itemStyle: {
            color: '#ea580c',
            borderColor: '#ffffff',
            borderWidth: 2
          },
          lineStyle: {
            width: 3,
            color: '#ea580c'
          },
          label: {
            show: true,
            position: 'top',
            distance: 8,
            formatter: (p: any) => p.value !== null ? `${p.value > 0 ? '+' : ''}${p.value}%` : '',
            color: '#c2410c',
            fontWeight: 800,
            fontSize: 11,
            fontFamily: 'Pretendard, sans-serif'
          },
          data: growthRates
        }
      ]
    };
  }, [data, metricMode, monthMeta]);

  // 2. [부문별 비중 분석] 100% 누적 막대 차트
  const stackedChartOptions = useMemo(() => {
    if (!data?.monthlyComparison) return null;

    const validMonths = (data.monthlyComparison || []).filter(d => Boolean(d && (d.ty || d.ly)));
    if (validMonths.length === 0) return null;

    const xLabels = validMonths.map(d => {
      const isOngoing = d.month === monthMeta.activeMonth && monthMeta.isCurrentMonthOngoing;
      const mName = isOngoing ? `${d.month}월(진행)` : d.monthLabel;
      return stackedYearMode === 'COMPARE' ? `${mName}\n(25 vs 26)` : mName;
    });

    const tyRoom: number[] = [];
    const tyFnb: number[] = [];
    const tyLeisure: number[] = [];
    const tyMoto: number[] = [];
    const tyBanquet: number[] = [];
    const tyGolf: number[] = [];

    const lyRoom: number[] = [];
    const lyFnb: number[] = [];
    const lyLeisure: number[] = [];
    const lyMoto: number[] = [];
    const lyBanquet: number[] = [];
    const lyGolf: number[] = [];

    validMonths.forEach(d => {
      const ty = d.ty;
      const ly = d.ly;

      if (metricMode === 'TOTAL') {
        if (ty) {
          tyRoom.push(Number(ty.roomRatio ?? 0));
          tyFnb.push(Number(ty.fnbRatio ?? 0));
          tyLeisure.push(Number(ty.leisureRatio ?? 0));
          tyMoto.push(Number(ty.motoRatio ?? 0));
          tyBanquet.push(Number(ty.banquetRatio ?? 0));
          tyGolf.push(Number(ty.golfRatio ?? 0));
        } else {
          tyRoom.push(0); tyFnb.push(0); tyLeisure.push(0); tyMoto.push(0); tyBanquet.push(0); tyGolf.push(0);
        }

        if (ly) {
          lyRoom.push(Number(ly.roomRatio ?? 0));
          lyFnb.push(Number(ly.fnbRatio ?? 0));
          lyLeisure.push(Number(ly.leisureRatio ?? 0));
          lyMoto.push(Number(ly.motoRatio ?? 0));
          lyBanquet.push(Number(ly.banquetRatio ?? 0));
          lyGolf.push(Number(ly.golfRatio ?? 0));
        } else {
          lyRoom.push(0); lyFnb.push(0); lyLeisure.push(0); lyMoto.push(0); lyBanquet.push(0); lyGolf.push(0);
        }
      } else {
        if (ty) {
          tyRoom.push(Number(ty.resortRoomRatio ?? ty.roomRatio ?? 0));
          tyFnb.push(Number(ty.resortFnbRatio ?? ty.fnbRatio ?? 0));
          tyLeisure.push(Number(ty.resortLeisureRatio ?? ty.leisureRatio ?? 0));
          tyMoto.push(Number(ty.resortMotoRatio ?? ty.motoRatio ?? 0));
          tyBanquet.push(Number(ty.resortBanquetRatio ?? ty.banquetRatio ?? 0));
        } else {
          tyRoom.push(0); tyFnb.push(0); tyLeisure.push(0); tyMoto.push(0); tyBanquet.push(0);
        }

        if (ly) {
          lyRoom.push(Number(ly.resortRoomRatio ?? ly.roomRatio ?? 0));
          lyFnb.push(Number(ly.resortFnbRatio ?? ly.fnbRatio ?? 0));
          lyLeisure.push(Number(ly.resortLeisureRatio ?? ly.leisureRatio ?? 0));
          lyMoto.push(Number(ly.resortMotoRatio ?? ly.motoRatio ?? 0));
          lyBanquet.push(Number(ly.resortBanquetRatio ?? ly.banquetRatio ?? 0));
        } else {
          lyRoom.push(0); lyFnb.push(0); lyLeisure.push(0); lyMoto.push(0); lyBanquet.push(0);
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
            formatter: (params: any) => params.value >= 8 ? `${Math.round(params.value)}%` : '',
            color: '#ffffff',
            fontWeight: 700,
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
            formatter: (params: any) => params.value >= 8 ? `${Math.round(params.value)}%` : '',
            color: '#ffffff',
            fontWeight: 700,
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
            formatter: (params: any) => params.value >= 8 ? `${Math.round(params.value)}%` : '',
            color: '#1E293B',
            fontWeight: 800,
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
            formatter: (params: any) => params.value >= 8 ? `${Math.round(params.value)}%` : '',
            color: '#ffffff',
            fontWeight: 700,
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
            formatter: (params: any) => params.value >= 8 ? `${Math.round(params.value)}%` : '',
            color: '#ffffff',
            fontWeight: 700,
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
            formatter: (params: any) => params.value >= 8 ? `${Math.round(params.value)}%` : '',
            color: '#ffffff',
            fontWeight: 700,
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
            formatter: (params: any) => params.value >= 8 ? `${Math.round(params.value)}%` : '',
            color: '#ffffff',
            fontWeight: 700,
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
            formatter: (params: any) => params.value >= 8 ? `${Math.round(params.value)}%` : '',
            color: '#ffffff',
            fontWeight: 700,
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
            formatter: (params: any) => params.value >= 8 ? `${Math.round(params.value)}%` : '',
            color: '#1E293B',
            fontWeight: 800,
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
            formatter: (params: any) => params.value >= 8 ? `${Math.round(params.value)}%` : '',
            color: '#ffffff',
            fontWeight: 700,
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
            formatter: (params: any) => params.value >= 8 ? `${Math.round(params.value)}%` : '',
            color: '#ffffff',
            fontWeight: 700,
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
            formatter: (params: any) => params.value >= 8 ? `${Math.round(params.value)}%` : '',
            color: '#ffffff',
            fontWeight: 700,
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
        axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(241, 245, 249, 0.4)' } },
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: [14, 18],
        extraCssText: 'box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); border-radius: 16px;',
        textStyle: { color: '#0f172a', fontFamily: 'Pretendard, sans-serif' },
        formatter: (params: any[]) => {
          if (!params || params.length === 0) return '';
          const idx = params[0].dataIndex;
          const monthItem = validMonths[idx];
          const ty = monthItem.ty;
          const ly = monthItem.ly;
          if (!ty) return '';

          const isOngoing = monthItem.month === monthMeta.activeMonth && monthMeta.isCurrentMonthOngoing;
          const tyTrevpar = getTrevparValue(ty, metricMode, 2026, monthItem.month);
          const lyTrevpar = ly ? getTrevparValue(ly, metricMode, 2025, monthItem.month) : null;
          const growth = (tyTrevpar && lyTrevpar && lyTrevpar > 0) ? Number((((tyTrevpar - lyTrevpar) / lyTrevpar) * 100).toFixed(1)) : null;

          let html = `
            <div style="font-weight:800; font-size:14px; color:#0f172a; padding-bottom:8px; margin-bottom:8px; border-bottom:1px solid #f1f5f9;">
              📅 ${monthItem.monthLabel} 전년(2025) vs 올해(2026) 부문별 비중 비교 <span style="font-size:11px; font-weight:600; color:#64748b;">(${metricMode === 'TOTAL' ? '골프 포함 전사' : '골프 제외 순수 리조트'})</span>
            </div>
            <div style="font-size:12px; margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid #f1f5f9; display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
              <div>
                <span style="color:#64748b;">2025년 TrevPAR:</span> <strong style="color:#334155;">${formatCurrency(lyTrevpar)}원</strong>
              </div>
              <div>
                <span style="color:#64748b;">2026년 TrevPAR:</span> <strong style="color:#0d9488;">${formatCurrency(tyTrevpar)}원</strong>
                ${growth !== null ? `<span style="font-size:11px; font-weight:800; color:${growth >= 0 ? '#0d9488' : '#e11d48'}; margin-left:4px;">(${growth > 0 ? '+' : ''}${growth}%)</span>` : ''}
              </div>
            </div>
            <div style="font-size:12px; display:flex; flex-direction:column; gap:6px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="color:#1E3A8A; font-weight:700;">🏨 숙박 (Accommodation):</span>
                <span>${lyRoom[idx]}% (25년) ➔ <strong style="color:#1E3A8A;">${tyRoom[idx]}% (26년)</strong> <span style="font-size:11px; font-weight:700; color:${tyRoom[idx] >= lyRoom[idx] ? '#0d9488' : '#e11d48'};">(${tyRoom[idx] >= lyRoom[idx] ? '+' : ''}${(tyRoom[idx] - lyRoom[idx]).toFixed(1)}%p)</span></span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="color:#16A34A; font-weight:700;">🍽️ 식음 (F&B):</span>
                <span>${lyFnb[idx]}% (25년) ➔ <strong style="color:#16A34A;">${tyFnb[idx]}% (26년)</strong> <span style="font-size:11px; font-weight:700; color:${tyFnb[idx] >= lyFnb[idx] ? '#0d9488' : '#e11d48'};">(${tyFnb[idx] >= lyFnb[idx] ? '+' : ''}${(tyFnb[idx] - lyFnb[idx]).toFixed(1)}%p)</span></span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="color:#B45309; font-weight:700;">🎢 레저 (Leisure):</span>
                <span>${lyLeisure[idx]}% (25년) ➔ <strong style="color:#B45309;">${tyLeisure[idx]}% (26년)</strong> <span style="font-size:11px; font-weight:700; color:${tyLeisure[idx] >= lyLeisure[idx] ? '#0d9488' : '#e11d48'};">(${tyLeisure[idx] >= lyLeisure[idx] ? '+' : ''}${(tyLeisure[idx] - lyLeisure[idx]).toFixed(1)}%p)</span></span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="color:#E11D48; font-weight:700;">🏎️ 모토아레나 (Moto):</span>
                <span>${lyMoto[idx]}% (25년) ➔ <strong style="color:#E11D48;">${tyMoto[idx]}% (26년)</strong> <span style="font-size:11px; font-weight:700; color:${tyMoto[idx] >= lyMoto[idx] ? '#0d9488' : '#e11d48'};">(${tyMoto[idx] >= lyMoto[idx] ? '+' : ''}${(tyMoto[idx] - lyMoto[idx]).toFixed(1)}%p)</span></span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="color:#0891B2; font-weight:700;">🏛️ 대관/연회 (Banquet):</span>
                <span>${lyBanquet[idx]}% (25년) ➔ <strong style="color:#0891B2;">${tyBanquet[idx]}% (26년)</strong> <span style="font-size:11px; font-weight:700; color:${tyBanquet[idx] >= lyBanquet[idx] ? '#0d9488' : '#e11d48'};">(${tyBanquet[idx] >= lyBanquet[idx] ? '+' : ''}${(tyBanquet[idx] - lyBanquet[idx]).toFixed(1)}%p)</span></span>
              </div>
              ${metricMode === 'TOTAL' ? `
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="color:#9333EA; font-weight:700;">⛳ 골프 (Golf):</span>
                <span>${lyGolf[idx]}% (25년) ➔ <strong style="color:#9333EA;">${tyGolf[idx]}% (26년)</strong> <span style="font-size:11px; font-weight:700; color:${tyGolf[idx] >= lyGolf[idx] ? '#0d9488' : '#e11d48'};">(${tyGolf[idx] >= lyGolf[idx] ? '+' : ''}${(tyGolf[idx] - lyGolf[idx]).toFixed(1)}%p)</span></span>
              </div>
              ` : ''}
            </div>
          `;
          if (isOngoing) {
            html += `<div style="margin-top:8px; padding-top:6px; border-top:1px dashed #e2e8f0; font-size:11px; color:#e11d48; font-weight:600;">
              ⚠️ ${monthItem.month}월은 ${monthMeta.daysAccumulated}일 집계 데이터(진행중)입니다.
            </div>`;
          }
          return html;
        }
      },
      legend: {
        data: legendData,
        top: 0,
        icon: 'circle',
        itemWidth: 9,
        itemHeight: 9,
        itemGap: 20,
        textStyle: { color: '#334155', fontWeight: 600, fontSize: 12, fontFamily: 'Pretendard, sans-serif' }
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
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
        axisLabel: { 
          color: '#1e293b', 
          fontWeight: 700, 
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
          color: '#64748b',
          fontWeight: 600,
          fontSize: 12
        },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } }
      },
      series: seriesConfig
    };
  }, [data, metricMode, stackedYearMode, monthMeta]);

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
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
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
            <button
              onClick={() => setChartViewTab('STACKED_100')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                chartViewTab === 'STACKED_100'
                  ? 'bg-white text-indigo-900 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
              <span>부문별 기여 비중 100% 비교</span>
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

      {/* 🧭 [동적 분석 기간 선택 필터 바] 날짜가 지나감에 따라 버튼 텍스트와 분기/반기 옵션이 100% 자동 생성 */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 mb-6 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="font-bold text-slate-800">분석 대상 기간 선택:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {/* 1. 공식 마감월 버튼 (동적 텍스트 생성) */}
          <button
            onClick={() => setPeriodMode('CLOSED_ONLY')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              periodMode === 'CLOSED_ONLY'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            ✅ {monthMeta.lastClosedMonth === 12 ? '연간 전체 마감 (1~12월)' : `공식 마감월 (1~${monthMeta.lastClosedMonth}월)`} <span className="text-[10px] opacity-90">(권장·왜곡 없음)</span>
          </button>

          {/* 2. 당월 진행중 포함 버튼 (진행 중일 때만 표출) */}
          {monthMeta.isCurrentMonthOngoing && monthMeta.activeMonth <= 12 && (
            <button
              onClick={() => setPeriodMode('ALL_MTD')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                periodMode === 'ALL_MTD'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              ⚠️ 당월 포함 (1~${monthMeta.activeMonth}월 진행중)
            </button>
          )}

          {/* 3. 상반기 (1~6월) */}
          <button
            onClick={() => setPeriodMode('H1')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              periodMode === 'H1'
                ? 'bg-indigo-700 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            상반기 (1~6월)
          </button>

          {/* 4. 하반기 (7~12월) - 7월 이후 활성화 */}
          {monthMeta.activeMonth >= 7 && (
            <button
              onClick={() => setPeriodMode('H2')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                periodMode === 'H2'
                  ? 'bg-indigo-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              하반기 (7~12월)
            </button>
          )}

          {/* 5. 1분기 (1~3월) */}
          <button
            onClick={() => setPeriodMode('Q1')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              periodMode === 'Q1'
                ? 'bg-indigo-700 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            1분기 (1~3월)
          </button>

          {/* 6. 2분기 (4~6월) */}
          <button
            onClick={() => setPeriodMode('Q2')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              periodMode === 'Q2'
                ? 'bg-indigo-700 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            2분기 (4~6월)
          </button>

          {/* 7. 3분기 (7~9월) - 7월 이후 활성화 */}
          {monthMeta.activeMonth >= 7 && (
            <button
              onClick={() => setPeriodMode('Q3')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                periodMode === 'Q3'
                  ? 'bg-indigo-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              3분기 (7~9월)
            </button>
          )}

          {/* 8. 4분기 (10~12월) - 10월 이후 활성화 */}
          {monthMeta.activeMonth >= 10 && (
            <button
              onClick={() => setPeriodMode('Q4')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                periodMode === 'Q4'
                  ? 'bg-indigo-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              4분기 (10~12월)
            </button>
          )}
        </div>
      </div>

      {/* 🏆 Executive KPI Summary Highlight Cards (선택된 기간 기준 실측치) */}
      {kpiHighlights && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/70">
            <div className="text-[11px] font-bold text-slate-500 mb-1">
              2026년 평균 TrevPAR ({kpiHighlights.periodLabel})
            </div>
            <div className="text-xl font-black text-slate-900 tabular-nums">
              ₩{formatCurrency(kpiHighlights.avgTyTrevpar)} <span className="text-xs font-normal text-slate-400">/실·월</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {kpiHighlights.closedCount}개 월 누적 월평균 실적
            </div>
          </div>

          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/70">
            <div className="text-[11px] font-bold text-slate-500 mb-1">전년 동기 대비 성장률</div>
            <div className={`text-xl font-black tabular-nums flex items-center gap-1 ${
              kpiHighlights.yoyGrowth >= 0 ? 'text-teal-600' : 'text-rose-500'
            }`}>
              {kpiHighlights.yoyGrowth >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
              {kpiHighlights.yoyGrowth > 0 ? '+' : ''}{kpiHighlights.yoyGrowth}%
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              2025년 동기간(₩{formatCurrency(kpiHighlights.avgLyTrevpar)}원) 대비
            </div>
          </div>

          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/70">
            <div className="text-[11px] font-bold text-slate-500 mb-1">최고 실적 달성 월</div>
            <div className="text-xl font-black text-indigo-900 tabular-nums flex items-center gap-1.5">
              <Award className="w-5 h-5 text-amber-500" />
              {kpiHighlights.maxMonthName} (₩{formatCurrency(kpiHighlights.maxTrevpar)}원)
            </div>
            <div className="text-[11px] text-slate-500 mt-1">객실당 생산성 최고 피크 기록</div>
          </div>

          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/70">
            <div className="text-[11px] font-bold text-slate-500 mb-1">기준 인프라 규모</div>
            <div className="text-xl font-black text-slate-900 tabular-nums">
              175실 <span className="text-xs font-normal text-slate-500">(일평균 총자산 잣대)</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">투숙률 편차 배제 동일 잣대 비교</div>
          </div>
        </div>
      )}

      {/* 당월 진행 중 안내 배너 (ALL_MTD 선택 시 경고 팁 표출) */}
      {periodMode === 'ALL_MTD' && monthMeta.isCurrentMonthOngoing && (
        <div className="mb-6 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>주의 안내:</strong> 현재 {monthMeta.activeMonth}월은 {monthMeta.daysAccumulated}일 누적 데이터(진행중)이므로, 전년 {monthMeta.activeMonth}월 전체 마감 실적과 단순 합산 시 평균치가 일시적으로 낮게 보일 수 있습니다. 공식 정산 분석은 <strong>[공식 마감월 (1~{monthMeta.lastClosedMonth}월)]</strong>을 선택하시기 바랍니다.
          </span>
        </div>
      )}

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
          <span>📊 회색 막대: 2025년</span>
          <span className="text-slate-300">|</span>
          <span className="text-teal-800">● 청록 막대: 2026년</span>
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
            {chartViewTab === 'YOY_TREND' ? (
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
            ) : (
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
                  const isOngoing = item.month === monthMeta.activeMonth && monthMeta.isCurrentMonthOngoing;
                  const lyRev = metricMode === 'TOTAL' ? item.ly?.totalRevenue : item.ly?.netRevenueWithoutGolf;
                  const lyTrevpar = getTrevparValue(item.ly, metricMode, 2025, item.month);
                  const lyShares = getShareRatios(item.ly, metricMode);
                  
                  const tyRev = item.ty ? (metricMode === 'TOTAL' ? item.ty.totalRevenue : item.ty.netRevenueWithoutGolf) : null;
                  const tyTrevpar = item.ty ? getTrevparValue(item.ty, metricMode, 2026, item.month) : null;
                  const tyShares = item.ty ? getShareRatios(item.ty, metricMode) : null;
                  
                  const diffAmount = (tyTrevpar !== null && lyTrevpar !== null) ? (tyTrevpar - lyTrevpar) : null;
                  const growthRate = (tyTrevpar !== null && lyTrevpar !== null && lyTrevpar > 0) ? Number((((tyTrevpar - lyTrevpar) / lyTrevpar) * 100).toFixed(1)) : null;

                  return (
                    <tr key={item.month} className={`hover:bg-slate-50/80 transition-colors ${isOngoing ? 'bg-amber-50/30' : ''}`}>
                      <td className="py-3 px-3 font-bold text-center text-slate-900 bg-slate-50/30">
                        {item.monthLabel}
                        {isOngoing && (
                          <span className="block text-[10px] text-amber-700 font-semibold">({monthMeta.daysAccumulated}일 누적)</span>
                        )}
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

          {/* 🏷️ 매출 비중 6대 부문별 소속 영업장(POS 매장) 전수 안내 가이드 (맨 밑 전수 열거) */}
          <div className="mt-5 p-6 rounded-3xl bg-slate-50 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">🏷️</span>
                <h4 className="font-black text-slate-900 text-sm">
                  매출 비중 6대 부문별 소속 영업장(POS 매장) 전수 분류 기준표
                </h4>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                벨포레 통합 DB 공식 SSOT 기준
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {/* 1. 숙박 */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                <div className="font-bold text-blue-900 flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-700"></span>
                    🏨 숙박 (ROOM)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800">[숙]</span>
                </div>
                <div className="text-slate-600 text-xs leading-relaxed space-y-1">
                  <div>• <strong>ROOM</strong> (콘도 객실)</div>
                  <div>• <strong>ROOM OTHER</strong> (부대 객실/기타)</div>
                </div>
              </div>

              {/* 2. 식음 */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                <div className="font-bold text-emerald-900 flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-700"></span>
                    🍽️ 식음 (FNB)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800">[식]</span>
                </div>
                <div className="text-slate-600 text-xs leading-relaxed space-y-1">
                  <div>• <strong>남도예담, 쿠치나, 벼루재촌, 브리스킷346</strong></div>
                  <div>• <strong>딜라이트, 밤밤테이블, 밤밤트럭</strong></div>
                  <div>• <strong>썸머랜드 푸드트럭, CU편의점</strong></div>
                  <div>• <strong>투썸플레이스, BHC(멕시카나)</strong></div>
                </div>
              </div>

              {/* 3. 레저본부 */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                <div className="font-bold text-amber-900 flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
                    🎢 레저본부 (LEISURE)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800">[레]</span>
                </div>
                <div className="text-slate-600 text-xs leading-relaxed space-y-1">
                  <div>• <strong>마운틴카트, 사계절썰매장, 마리나 클럽</strong></div>
                  <div>• <strong>놀이동산, 벨포레 목장(체험), 디노 시네마</strong></div>
                  <div>• <strong>얼룩말카페</strong> <span className="text-[10px] text-amber-700 font-semibold">(목장 카페)</span></div>
                  <div>• <strong>미디어아트센터, 미디어-뮤지엄카페/기프트샵</strong></div>
                  <div>• <strong>썸머랜드(워터파크), 원더풀, 미니골프, 회전그네</strong></div>
                </div>
              </div>

              {/* 4. 모토아레나 */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                <div className="font-bold text-rose-900 flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-700"></span>
                    🏎️ 모토아레나 (MOTO)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-800">[모]</span>
                </div>
                <div className="text-slate-600 text-xs leading-relaxed space-y-1">
                  <div>• <strong>모토아레나</strong> (서킷 트랙/카트)</div>
                  <div>• <strong>핏스탑</strong> <span className="text-[10px] text-rose-700 font-semibold">(모토아레나 식음/스낵)</span></div>
                </div>
              </div>

              {/* 5. 대관/연회 */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                <div className="font-bold text-cyan-900 flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-700"></span>
                    🏛️ 대관/연회 (BANQUET)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-50 text-cyan-800">[대]</span>
                </div>
                <div className="text-slate-600 text-xs leading-relaxed space-y-1">
                  <div>• <strong>연회장</strong></div>
                  <div>• <strong>벨포레홀</strong></div>
                  <div>• <strong>연회 및 대관</strong> (MICE/기업행사)</div>
                </div>
              </div>

              {/* 6. 골프 */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                <div className="font-bold text-purple-900 flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-700"></span>
                    ⛳ 골프 (GOLF)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-800">[골]</span>
                </div>
                <div className="text-slate-600 text-xs leading-relaxed space-y-1">
                  <div>• <strong>골프 그린피 (Green Fee), 골프 카트비 (Cart Fee)</strong></div>
                  <div>• <strong>클럽-레스토랑</strong> <span className="text-[10px] text-purple-700 font-semibold">(골프 식음)</span></div>
                  <div>• <strong>클럽-스타트하우스</strong> <span className="text-[10px] text-purple-700 font-semibold">(그늘집)</span></div>
                  <div>• <strong>프로샵, 골프클럽 기타매출</strong></div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
