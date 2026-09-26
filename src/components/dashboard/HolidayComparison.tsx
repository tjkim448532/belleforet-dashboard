import { useState, useEffect, useMemo } from 'react';
import { secureFetcher } from '../../lib/secureFetcher';
import { AlertCircle, RefreshCw, Palmtree, CalendarDays, Calendar, Clock, BedDouble } from 'lucide-react';
import ReactECharts from 'echarts-for-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

export default function HolidayComparison() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [selectedHolidayLabel, setSelectedHolidayLabel] = useState<string>('추석 연휴');

  useEffect(() => {
    fetchHolidayData();
  }, []);

  const fetchHolidayData = async () => {
    setLoading(true);
    try {
      const res = await secureFetcher(`${API_BASE}/api/v6/report/holiday-comparison`).catch(() => null);
      const payload = res?.data ?? res;
      if (payload && payload.groupedByYear) {
        setData(payload);
      } else {
        setData(null);
      }
    } catch (err) {
      console.error('Holiday Fetch Error:', err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const allAvailableLabels = useMemo(() => {
    if (!data?.groupedByYear) return [];
    const labels = new Set<string>();
    Object.values(data.groupedByYear).forEach((yearData: any) => {
      Object.values(yearData).forEach((categoryBlocks: any) => {
        categoryBlocks.forEach((block: any) => {
          if (block.holidayNameLabel) {
            labels.add(block.holidayNameLabel);
          }
        });
      });
    });
    
    // Sort logically: Seollal/Chuseok first, then alphabetical
    return Array.from(labels).sort((a, b) => {
      if (a.includes('설날')) return -1;
      if (b.includes('설날')) return 1;
      if (a.includes('추석')) return -1;
      if (b.includes('추석')) return 1;
      return a.localeCompare(b);
    });
  }, [data]);

  // Helper to extract a holiday block for a specific year and label
  const getBlockForYear = (year: string, label: string) => {
    if (!data?.groupedByYear?.[year]) return null;
    for (const cat of Object.values(data.groupedByYear[year])) {
      const block = (cat as any[]).find((b: any) => b.holidayNameLabel === label);
      if (block) return block;
    }
    return null;
  };

  // If the fetched data doesn't have the default '추석 연휴', set it to the first available or ALL
  useEffect(() => {
    if (allAvailableLabels.length > 0 && !allAvailableLabels.includes(selectedHolidayLabel) && selectedHolidayLabel !== 'ALL') {
      setSelectedHolidayLabel(allAvailableLabels[0]);
    }
  }, [allAvailableLabels, selectedHolidayLabel]);

  const years = useMemo(() => {
    if (!data?.groupedByYear) return [];
    return Object.keys(data.groupedByYear).sort();
  }, [data]);

  const getChartOptions = () => {
    if (!data?.groupedByYear) return {};
    
    // Filter labels to render
    const labelsToRender = selectedHolidayLabel === 'ALL' 
      ? allAvailableLabels 
      : [selectedHolidayLabel];

    const xAxisData = labelsToRender;
    
    // Build series for each year directly from the detailed blocks (Zero-Slice Summation)
    const series = years.map(year => {
      const yearData = labelsToRender.map(label => {
        const block = getBlockForYear(year, label);
        return block ? (block.grandTotalSales || 0) : 0;
      });
      
      return {
        name: `${year}년`,
        type: 'bar',
        barMaxWidth: selectedHolidayLabel === 'ALL' ? 30 : 80,
        itemStyle: { borderRadius: [6, 6, 0, 0] },
        data: yearData,
        label: {
          show: true,
          position: 'top',
          formatter: (params: any) => {
            if (params.value === 0) return '';
            return `${Math.round(params.value / 1000000)}M`;
          },
          fontSize: 10,
          color: '#64748b'
        }
      };
    });

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          let html = `<div class="font-bold mb-2 text-slate-800 text-sm border-b pb-1 border-slate-200">${params[0]?.name || ''} 연도별 상세</div>`;
          params.forEach((item: any) => {
            const year = item.seriesName.replace('년', '');
            const block = getBlockForYear(year, item.name);
            const dateStr = block ? `${block.startDate} ~ ${block.endDate} (${block.duration}일간)` : '해당 연휴 없음';
            const valStr = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(item.value || 0);
            html += `
              <div class="my-1.5 text-xs">
                <div class="flex items-center justify-between gap-4 font-semibold text-slate-800">
                  <span class="flex items-center gap-1.5" style="color: ${item.color}">
                    <span class="w-2.5 h-2.5 rounded-full inline-block" style="background: ${item.color}"></span>
                    ${item.seriesName}
                  </span>
                  <span>${valStr}</span>
                </div>
                <div class="text-[11px] text-slate-500 ml-4 font-medium">
                  📅 ${dateStr}
                </div>
              </div>
            `;
          });
          return html;
        }
      },
      legend: { data: years.map(y => `${y}년`), bottom: 0 },
      grid: { 
        left: '3%', 
        right: '4%', 
        bottom: selectedHolidayLabel === 'ALL' ? '25%' : '15%',
        top: '10%', 
        containLabel: true 
      },
      xAxis: { 
        type: 'category', 
        data: xAxisData, 
        axisLabel: { 
          interval: 0, 
          rotate: selectedHolidayLabel === 'ALL' ? 45 : 0,
          fontSize: 11
        } 
      },
      yAxis: { 
        type: 'value', 
        name: '매출액(원)',
        axisLabel: {
          formatter: (value: number) => {
            return `${value / 100000000}억`;
          }
        }
      },
      series
    };
  };

  return (
    <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mt-8 border border-amber-100 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-400 to-orange-500"></div>
      
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 uppercase tracking-wider">
              New Feature (API V6)
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              Zero-Variance Guaranteed
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Palmtree className="w-7 h-7 text-amber-500" />
            연도별 세부 명절 및 공휴일 실적 비교
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-2">
            백엔드 API(<code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-[11px]">/api/v6/report/holiday-comparison</code>)에서 징검다리를 자동 병합하고 사전 연산(Slice Summation 금지)된 개별 공휴일 총합을 렌더링합니다.
          </p>
        </div>

        {allAvailableLabels.length > 0 && (
          <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100 self-start lg:self-center">
            <CalendarDays className="w-5 h-5 text-amber-500 ml-2" />
            <select
              value={selectedHolidayLabel}
              onChange={(e) => setSelectedHolidayLabel(e.target.value)}
              className="bg-white border border-slate-200 text-slate-800 text-sm font-bold rounded-xl focus:ring-amber-500 focus:border-amber-500 block w-60 p-2.5 outline-none cursor-pointer"
            >
              <option value="ALL">전체 비교 보기</option>
              {allAvailableLabels.map(label => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 연도별 연휴 날짜 및 일수 카드 (단일 공휴일 선택 시 즉시 표시) */}
      {selectedHolidayLabel !== 'ALL' && years.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {years.map(year => {
            const block = getBlockForYear(year, selectedHolidayLabel);
            return (
              <div 
                key={year} 
                className="bg-gradient-to-br from-slate-50 to-amber-50/20 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-slate-800">{year}년 {selectedHolidayLabel}</span>
                  {block ? (
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600" />
                      {block.duration}일간
                      {block.hasBridgeDay ? ' (징검다리)' : ''}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">데이터 없음</span>
                  )}
                </div>

                {block ? (
                  <div className="space-y-1.5 mt-1">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-amber-500" />
                      <span>{block.startDate} ~ {block.endDate}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <span className="text-xs text-slate-400 font-medium">총 매출(Grand Total)</span>
                      <span className="text-sm font-black text-slate-900">{block.grandTotalSalesFormatted}</span>
                    </div>
                    {block.grandTotalRooms > 0 && (
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <BedDouble className="w-3 h-3 text-slate-400" />
                          판매 객실
                        </span>
                        <span className="font-bold text-slate-700">{block.grandTotalRooms.toLocaleString()}실</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 py-3">해당 연도에는 이 연휴가 존재하지 않습니다.</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mb-4 text-amber-500" />
          <p className="font-bold">연휴 데이터를 분석 중입니다...</p>
        </div>
      ) : data?.groupedByYear ? (
        <div className="space-y-4">
          {/* Chart */}
          <div className="h-[400px] w-full border border-slate-100 rounded-2xl p-4 bg-slate-50/30">
            <ReactECharts option={getChartOptions()} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      ) : (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-3xl bg-slate-50">
          <AlertCircle className="w-10 h-10 mb-3 text-slate-300" />
          <p className="font-bold text-slate-600">연휴 데이터가 존재하지 않습니다.</p>
          <p className="text-xs mt-1">백엔드 API 응답을 확인해주세요.</p>
        </div>
      )}
    </div>
  );
}
