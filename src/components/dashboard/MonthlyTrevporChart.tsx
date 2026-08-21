import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { Building, Sparkles, Info, Calendar } from 'lucide-react';
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
    golfRevenue: number;
    netRevenueWithoutGolf: number;
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
    golfRevenue: number;
    netRevenueWithoutGolf: number;
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

  // Prepare chart series from SSOT data (Strict TrevPAR available rooms standard)
  const chartOptions = React.useMemo(() => {
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
                상단 주요 지표와 100% 동일한 기준 (리조트 총매출 ÷ 전체 175실)으로 12개월 전수를 일관되게 비교합니다.
              </p>
            </div>
          </div>
        </div>

        {/* 2-Track Toggle Pills */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 self-start lg:self-auto">
          <button
            onClick={() => setMetricMode('TOTAL')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              metricMode === 'TOTAL'
                ? 'bg-white text-teal-800 shadow-sm border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>⛳</span> 골프 포함 객실당 총매출 (TrevPAR)
          </button>
          <button
            onClick={() => setMetricMode('EX_GOLF')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              metricMode === 'EX_GOLF'
                ? 'bg-white text-sky-800 shadow-sm border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>🏨</span> 골프 제외 객실당 매출 (순수 리조트 TrevPAR)
          </button>
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
          {/* ECharts 12-Month Comparison Chart */}
          <div className="mb-8 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
            {chartOptions && (
              <ReactECharts option={chartOptions} style={{ height: '360px', width: '100%' }} />
            )}
          </div>

          {/* 12-Month Detailed Reconciliation Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 text-center">월</th>
                  <th className="py-3.5 px-4 text-right bg-slate-100/50">2025년 공급객실</th>
                  <th className="py-3.5 px-4 text-right bg-slate-100/50">2025년 판매객실</th>
                  <th className="py-3.5 px-4 text-right bg-slate-100/50">2025년 {metricMode === 'TOTAL' ? '전사 총매출' : '순수 리조트매출'}</th>
                  <th className="py-3.5 px-4 text-right bg-slate-100/70 font-black text-slate-800">2025년 TrevPAR</th>
                  <th className="py-3.5 px-4 text-right bg-teal-50/40">2026년 공급객실</th>
                  <th className="py-3.5 px-4 text-right bg-teal-50/40">2026년 판매객실</th>
                  <th className="py-3.5 px-4 text-right bg-teal-50/40">2026년 {metricMode === 'TOTAL' ? '전사 총매출' : '순수 리조트매출'}</th>
                  <th className="py-3.5 px-4 text-right bg-teal-50/70 font-black text-teal-900">2026년 TrevPAR</th>
                  <th className="py-3.5 px-4 text-right">전년 대비 증감액</th>
                  <th className="py-3.5 px-4 text-center">증감률</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {data.monthlyComparison.map((item) => {
                  const days = getDaysInMonth(2025, item.month);
                  const lyAvail = item.ly?.availableRooms || (175 * days);
                  const tyAvail = item.ty ? (item.ty.availableRooms || (175 * getDaysInMonth(2026, item.month))) : null;

                  const lyRev = metricMode === 'TOTAL' ? item.ly?.totalRevenue : item.ly?.netRevenueWithoutGolf;
                  const lyTrevpar = getTrevparValue(item.ly, metricMode, 2025, item.month);
                  
                  const tyRev = item.ty ? (metricMode === 'TOTAL' ? item.ty.totalRevenue : item.ty.netRevenueWithoutGolf) : null;
                  const tyTrevpar = item.ty ? getTrevparValue(item.ty, metricMode, 2026, item.month) : null;
                  
                  const diffAmount = (tyTrevpar !== null && lyTrevpar !== null) ? (tyTrevpar - lyTrevpar) : null;
                  const growthRate = (tyTrevpar !== null && lyTrevpar !== null && lyTrevpar > 0) ? Number((((tyTrevpar - lyTrevpar) / lyTrevpar) * 100).toFixed(1)) : null;

                  return (
                    <tr key={item.month} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-center text-slate-900 bg-slate-50/30">
                        {item.monthLabel}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-slate-500">
                        {formatCurrency(lyAvail)} 실
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        {item.ly?.roomsSold ? `${formatCurrency(item.ly.roomsSold)} 실` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        {lyRev ? `${formatCurrency(lyRev)} 원` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums bg-slate-100/30">
                        {lyTrevpar ? `${formatCurrency(lyTrevpar)} 원` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-slate-500">
                        {tyAvail ? `${formatCurrency(tyAvail)} 실` : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        {item.ty?.roomsSold ? `${formatCurrency(item.ty.roomsSold)} 실` : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        {tyRev !== null && tyRev !== undefined ? `${formatCurrency(tyRev)} 원` : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-teal-800 tabular-nums bg-teal-50/30">
                        {tyTrevpar !== null && tyTrevpar !== undefined ? `${formatCurrency(tyTrevpar)} 원` : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        {diffAmount !== null && diffAmount !== undefined ? (
                          <span className={`font-semibold ${diffAmount >= 0 ? 'text-teal-600' : 'text-rose-500'}`}>
                            {diffAmount > 0 ? '+' : ''}{formatCurrency(diffAmount)} 원
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
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
                <strong>일관된 지표 기준 (TrevPAR):</strong> 상단 주요 지표와 동일하게 **전체 보유 175실(공급 인벤토리)**을 분모로 고정하여, 특정 월의 투숙률 편차에 왜곡되지 않는 **리조트 전사 인프라의 월별 실질 생산성**을 완벽한 동일 잣대로 비교 분석합니다.
              </span>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
