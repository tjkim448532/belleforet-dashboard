import { useState, useEffect, useMemo } from 'react';
import { secureFetcher } from '../../lib/secureFetcher';
import { AlertCircle, RefreshCw, Palmtree, CalendarDays } from 'lucide-react';
import ReactECharts from 'echarts-for-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

export default function HolidayComparison() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [selectedHolidayType, setSelectedHolidayType] = useState<string>('ALL');

  useEffect(() => {
    fetchHolidayData();
  }, []);

  const fetchHolidayData = async () => {
    setLoading(true);
    try {
      const res = await secureFetcher(`${API_BASE}/api/v6/report/holiday-comparison`).catch(() => null);
      const payload = res?.data ?? res;
      if (payload && payload.summaryByYear) {
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

  const allAvailableTypes = useMemo(() => {
    if (!data?.summaryByYear) return [];
    const types = new Set<string>();
    Object.keys(data.summaryByYear).forEach(year => {
      Object.keys(data.summaryByYear[year]).forEach(type => types.add(type));
    });
    return Array.from(types).sort();
  }, [data]);

  const getChartOptions = () => {
    if (!data?.summaryByYear) return {};

    const years = Object.keys(data.summaryByYear).sort();
    
    // Filter types
    const typesToRender = selectedHolidayType === 'ALL' 
      ? allAvailableTypes 
      : [selectedHolidayType];

    const xAxisData = typesToRender; // Keys are now properly formatted in Korean (e.g. '설날')
    
    // Build series for each year directly from summaryByYear (Zero-Slice Summation)
    const series = years.map(year => {
      const yearData = typesToRender.map(type => {
        const summary = data.summaryByYear[year][type];
        return summary?.totalSales || 0;
      });
      
      return {
        name: `${year}년`,
        type: 'bar',
        barMaxWidth: 60,
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
        valueFormatter: (val: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(val)
      },
      legend: { data: years.map(y => `${y}년`), bottom: 0 },
      grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
      xAxis: { type: 'category', data: xAxisData, axisLabel: { interval: 0, rotate: 15 } },
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

  const renderHolidayTable = () => {
    if (!data?.summaryByYear) return null;
    const years = Object.keys(data.summaryByYear).sort((a, b) => Number(b) - Number(a)); // desc

    return (
      <div className="space-y-8">
        {years.map(year => {
          const yearHolidays = data.groupedByYear?.[year] || {}; // Detail list for cards
          const yearSummary = data.summaryByYear[year] || {}; // Summary for when detail is empty
          
          let holidayKeys = Object.keys(yearSummary); // Use summary keys which are padded and reliable
          if (selectedHolidayType !== 'ALL') {
            holidayKeys = holidayKeys.filter(k => k === selectedHolidayType);
          }
          
          if (holidayKeys.length === 0) return null;

          return (
            <div key={year}>
              <h3 className="text-md font-black text-slate-800 mb-4 bg-slate-100 px-4 py-2 rounded-xl inline-block">{year}년 명절/연휴 요약</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {holidayKeys.map(key => {
                  const items = yearHolidays[key] || [];
                  const summary = yearSummary[key] || { totalSales: 0, totalSalesFormatted: '0원', totalRooms: 0 };
                  
                  // If there are detailed items, render them. If not (e.g. 2026 Christmas not yet passed), render a skeleton card using summary
                  if (items.length > 0) {
                    return items.map((hol: any) => (
                      <div key={hol.id || Math.random()} className="border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow bg-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-2 h-full bg-amber-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-bold text-slate-800 text-lg">{hol.holidayNameLabel || key}</h4>
                            <p className="text-xs text-slate-500 mt-1 font-medium bg-slate-50 px-2 py-0.5 rounded-md inline-block">
                              {hol.startDate} ~ {hol.endDate} ({hol.duration}일)
                            </p>
                          </div>
                          {hol.hasBridgeDay && (
                            <span className="bg-purple-100 text-purple-700 text-[10px] font-black px-2 py-1 rounded-lg flex items-center gap-1">
                              <Palmtree className="w-3 h-3" />
                              징검다리
                            </span>
                          )}
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-500 font-medium">총 매출(Grand Total)</span>
                            <span className="text-sm font-black text-blue-600">{hol.grandTotalSalesFormatted || summary.totalSalesFormatted || new Intl.NumberFormat('ko-KR').format(hol.grandTotalSales || summary.totalSales || 0)}원</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-500 font-medium">객실 판매(Rooms)</span>
                            <span className="text-sm font-bold text-emerald-600">{new Intl.NumberFormat('ko-KR').format(hol.grandTotalRooms || summary.totalRooms || 0)}실</span>
                          </div>
                        </div>
                      </div>
                    ));
                  } else {
                    // Empty / zero-padded state
                    return (
                      <div key={`empty-${key}`} className="border border-slate-200 rounded-2xl p-5 bg-white relative overflow-hidden opacity-60">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-bold text-slate-800 text-lg">{key}</h4>
                            <p className="text-xs text-slate-400 mt-1 font-medium bg-slate-50 px-2 py-0.5 rounded-md inline-block">
                              데이터 없음
                            </p>
                          </div>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-500 font-medium">총 매출(Grand Total)</span>
                            <span className="text-sm font-black text-slate-400">{summary.totalSalesFormatted || '0원'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-500 font-medium">객실 판매(Rooms)</span>
                            <span className="text-sm font-bold text-slate-400">{summary.totalRooms || 0}실</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mt-8 border border-amber-100 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-400 to-orange-500"></div>
      
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
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
            연도별 명절 및 징검다리 연휴 실적 비교
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-2">
            백엔드 API(<code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-[11px]">/api/v6/report/holiday-comparison</code>)에서 징검다리를 자동 병합하고 사전 연산(Slice Summation 금지)된 총합만 반환받아 렌더링합니다.
          </p>
        </div>

        {data?.summaryByYear && (
          <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
            <CalendarDays className="w-5 h-5 text-amber-500 ml-2" />
            <select
              value={selectedHolidayType}
              onChange={(e) => setSelectedHolidayType(e.target.value)}
              className="bg-white border border-slate-200 text-slate-800 text-sm font-bold rounded-xl focus:ring-amber-500 focus:border-amber-500 block w-48 p-2.5 outline-none cursor-pointer"
            >
              <option value="ALL">전체 명절/연휴</option>
              {allAvailableTypes.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mb-4 text-amber-500" />
          <p className="font-bold">연휴 데이터를 분석 중입니다...</p>
        </div>
      ) : data?.summaryByYear ? (
        <div className="space-y-10">
          {/* Chart */}
          <div className="h-[350px] w-full border border-slate-100 rounded-2xl p-4 bg-slate-50/30">
            <ReactECharts option={getChartOptions()} style={{ height: '100%', width: '100%' }} />
          </div>

          {/* Cards */}
          <div>
            {renderHolidayTable()}
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
