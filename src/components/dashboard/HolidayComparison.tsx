import { useState, useEffect, useMemo } from 'react';
import { secureFetcher } from '../../lib/secureFetcher';
import { 
  AlertCircle, 
  RefreshCw, 
  Palmtree, 
  CalendarDays, 
  Calendar, 
  Clock, 
  BedDouble, 
  TrendingUp, 
  BarChart3,
  Layers
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

// 대표 공휴일 마스터 정의 (대체공휴일 및 연도별 라벨 통합 비교용)
interface CanonicalHoliday {
  id: string;
  name: string;
  matchKeys: string[];
}

const CANONICAL_HOLIDAYS: CanonicalHoliday[] = [
  { id: '설날', name: '설날 연휴', matchKeys: ['설날'] },
  { id: '추석', name: '추석 연휴', matchKeys: ['추석'] },
  { id: '삼일절', name: '삼일절', matchKeys: ['삼일절'] },
  { id: '어린이날', name: '어린이날', matchKeys: ['어린이날'] },
  { id: '부처님오신날', name: '부처님오신날', matchKeys: ['부처님오신날'] },
  { id: '현충일', name: '현충일', matchKeys: ['현충일'] },
  { id: '광복절', name: '광복절', matchKeys: ['광복절'] },
  { id: '개천절', name: '개천절', matchKeys: ['개천절'] },
  { id: '한글날', name: '한글날', matchKeys: ['한글날'] },
  { id: '성탄절', name: '성탄절', matchKeys: ['성탄절', '크리스마스'] },
  { id: '신정', name: '신정', matchKeys: ['신정', '새해'] },
  { id: '선거일', name: '선거일 (국회의원/지방선거)', matchKeys: ['선거', '국회의원', '지방선거'] },
];

export default function HolidayComparison() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [selectedHolidayId, setSelectedHolidayId] = useState<string>('추석');
  const [viewMode, setViewMode] = useState<'TOTAL' | 'DAILY'>('TOTAL');
  const [metricType, setMetricType] = useState<'SALES' | 'ROOMS'>('SALES');

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

  // 특정 연도에서 대표 공휴일에 매칭되는 단일 블록 추출
  const getBlockForYear = (year: string, canonicalId: string) => {
    if (!data?.groupedByYear?.[year]) return null;
    const canonical = CANONICAL_HOLIDAYS.find(c => c.id === canonicalId || c.name === canonicalId);
    if (!canonical) return null;

    for (const cat of Object.values(data.groupedByYear[year])) {
      const block = (cat as any[]).find((b: any) => 
        canonical.matchKeys.some(k => b.holidayNameLabel?.includes(k))
      );
      if (block) return block;
    }
    return null;
  };

  const years = useMemo(() => {
    if (!data?.groupedByYear) return [];
    return Object.keys(data.groupedByYear).sort();
  }, [data]);

  const selectedCanonical = useMemo(() => {
    return CANONICAL_HOLIDAYS.find(h => h.id === selectedHolidayId);
  }, [selectedHolidayId]);

  // 1. 연도별 총액 비교 차트 옵션 (기존 기능 100% 유지)
  const getTotalChartOptions = () => {
    if (!data?.groupedByYear) return {};
    
    const isAll = selectedHolidayId === 'ALL';
    const targetHolidays = isAll ? CANONICAL_HOLIDAYS : (selectedCanonical ? [selectedCanonical] : []);
    const xAxisData = targetHolidays.map(h => h.name);
    
    const series = years.map(year => {
      const yearData = targetHolidays.map(h => {
        const block = getBlockForYear(year, h.id);
        return block ? (block.grandTotalSales || 0) : 0;
      });
      
      return {
        name: `${year}년`,
        type: 'bar',
        barMaxWidth: isAll ? 30 : 80,
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
          let html = `<div class="font-bold mb-2 text-slate-800 text-sm border-b pb-1 border-slate-200">${params[0]?.name || ''} 연도별 비교</div>`;
          params.forEach((item: any) => {
            const year = item.seriesName.replace('년', '');
            const canonical = CANONICAL_HOLIDAYS.find(h => h.name === item.name) || selectedCanonical;
            const block = canonical ? getBlockForYear(year, canonical.id) : null;
            const dateStr = block 
              ? `${block.startDate} ~ ${block.endDate} (${block.duration}일간${block.holidayNameLabel.includes('대체') ? ', 대체공휴일' : ''})` 
              : '해당 연휴 없음';
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
        bottom: isAll ? '25%' : '15%',
        top: '10%', 
        containLabel: true 
      },
      xAxis: { 
        type: 'category', 
        data: xAxisData, 
        axisLabel: { 
          interval: 0, 
          rotate: isAll ? 45 : 0,
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

  // 2. 명절 당일/전·후일 일자별 방문 패턴 분석 데이터셋 산출
  const dailyDistributionData = useMemo(() => {
    if (!data?.groupedByYear || selectedHolidayId === 'ALL') return null;

    const offsetsSet = new Set<number>();
    const yearMaps: Record<string, { dDayDate: string; daysMap: Record<number, any> }> = {};

    years.forEach(year => {
      const block = getBlockForYear(year, selectedHolidayId);
      if (!block || !block.dailyData || block.dailyData.length === 0) return;

      // Find D-Day
      let dDay = block.dailyData.find((d: any) => d.holidayName === selectedHolidayId);
      if (!dDay) {
        dDay = block.dailyData.find((d: any) => d.holidayName && d.holidayName.includes(selectedHolidayId));
      }
      if (!dDay) {
        dDay = block.dailyData[Math.floor(block.dailyData.length / 2)];
      }

      const dDayTime = new Date(dDay.date).getTime();
      const daysMap: Record<number, any> = {};

      block.dailyData.forEach((day: any) => {
        const dayTime = new Date(day.date).getTime();
        const diffDays = Math.round((dayTime - dDayTime) / (1000 * 60 * 60 * 24));
        offsetsSet.add(diffDays);
        daysMap[diffDays] = day;
      });

      yearMaps[year] = {
        dDayDate: dDay.date,
        daysMap
      };
    });

    const sortedOffsets = Array.from(offsetsSet).sort((a, b) => a - b);
    if (sortedOffsets.length === 0) return null;

    const offsetLabels = sortedOffsets.map(offset => {
      if (offset === 0) return 'D-Day (당일 🎯)';
      if (offset === -1) return 'D-1 (전일)';
      if (offset < 0) return `D${offset}`;
      if (offset === 1) return 'D+1 (익일)';
      return `D+${offset}`;
    });

    return {
      sortedOffsets,
      offsetLabels,
      yearMaps
    };
  }, [data, selectedHolidayId, years]);

  // 3. 일자별 방문/매출 추이 라인 차트 옵션
  const getDailyChartOptions = () => {
    if (!dailyDistributionData) return {};
    const { sortedOffsets, offsetLabels, yearMaps } = dailyDistributionData;

    const colors = ['#3b82f6', '#84cc16', '#475569'];

    const series = years.map((year, idx) => {
      const yearInfo = yearMaps[year];
      const seriesData = sortedOffsets.map(offset => {
        const day = yearInfo?.daysMap?.[offset];
        if (!day) return 0;
        return metricType === 'SALES' ? (day.sales || 0) : (day.rooms || 0);
      });

      return {
        name: `${year}년`,
        type: 'line',
        smooth: true,
        symbolSize: 8,
        itemStyle: { color: colors[idx % colors.length] },
        lineStyle: { width: 3 },
        data: seriesData,
        label: {
          show: true,
          position: 'top',
          formatter: (params: any) => {
            if (params.value === 0) return '';
            return metricType === 'SALES' 
              ? `${Math.round(params.value / 1000000)}M` 
              : `${params.value}실`;
          },
          fontSize: 10,
          color: colors[idx % colors.length]
        }
      };
    });

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        formatter: (params: any) => {
          const offsetIdx = params[0]?.dataIndex;
          const offset = sortedOffsets[offsetIdx];
          const offsetLabel = offsetLabels[offsetIdx];

          let html = `<div class="font-bold mb-2 text-slate-800 text-sm border-b pb-1 border-slate-200">구간: ${offsetLabel}</div>`;
          params.forEach((item: any) => {
            const year = item.seriesName.replace('년', '');
            const day = yearMaps[year]?.daysMap?.[offset];
            const dateStr = day ? `${day.date} (${day.holidayName || (day.isBridge ? '징검다리' : '주말')})` : '해당일 없음';
            const valStr = metricType === 'SALES'
              ? new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(item.value || 0)
              : `${item.value}실`;
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
      grid: { left: '3%', right: '4%', bottom: '15%', top: '12%', containLabel: true },
      xAxis: { 
        type: 'category', 
        data: offsetLabels,
        axisLabel: {
          interval: 0,
          fontWeight: (val: string) => val.includes('당일') ? 'bold' : 'normal',
          color: (val: string) => val.includes('당일') ? '#dc2626' : '#64748b'
        }
      },
      yAxis: {
        type: 'value',
        name: metricType === 'SALES' ? '매출액(원)' : '객실수(실)',
        axisLabel: {
          formatter: (value: number) => {
            return metricType === 'SALES' ? `${value / 100000000}억` : `${value}실`;
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
            연도별 총합 비교뿐만 아니라, 명절 당일(D-Day) 및 전·후일의 고객 방문 분포 흐름을 입체적으로 교차 분석합니다.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100 self-start lg:self-center">
          <CalendarDays className="w-5 h-5 text-amber-500 ml-2" />
          <select
            value={selectedHolidayId}
            onChange={(e) => setSelectedHolidayId(e.target.value)}
            className="bg-white border border-slate-200 text-slate-800 text-sm font-bold rounded-xl focus:ring-amber-500 focus:border-amber-500 block w-64 p-2.5 outline-none cursor-pointer"
          >
            <option value="ALL">전체 공휴일 한눈에 보기</option>
            {CANONICAL_HOLIDAYS.map(h => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 연도별 연휴 날짜 및 일수 카드 (단일 공휴일 선택 시 표시) */}
      {selectedHolidayId !== 'ALL' && years.length > 0 && selectedCanonical && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {years.map(year => {
            const block = getBlockForYear(year, selectedHolidayId);
            return (
              <div 
                key={year} 
                className="bg-gradient-to-br from-slate-50 to-amber-50/20 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-slate-800">{year}년 {selectedCanonical.name}</span>
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
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-500" />
                        {block.startDate} ~ {block.endDate}
                      </span>
                      {block.holidayNameLabel !== selectedCanonical.name && (
                        <span className="text-[10px] text-amber-700 bg-amber-50/80 px-1.5 py-0.5 rounded font-medium border border-amber-200/60">
                          {block.holidayNameLabel}
                        </span>
                      )}
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

      {/* 뷰 모드 전환 탭 (연도별 총합 비교 vs 명절 당일/전·후일 방문 분포) */}
      {selectedHolidayId !== 'ALL' && dailyDistributionData && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between mb-4 pb-2 border-b border-slate-100 gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
            <button
              onClick={() => setViewMode('TOTAL')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'TOTAL' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              연도별 총합 비교
            </button>
            <button
              onClick={() => setViewMode('DAILY')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'DAILY' 
                  ? 'bg-amber-500 text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              당일/전·후일 방문 분포 분석 🎯
            </button>
          </div>

          {viewMode === 'DAILY' && (
            <div className="flex items-center bg-slate-50 px-2 py-1 rounded-xl border border-slate-200/80 gap-1 text-xs">
              <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
                <Layers className="w-3 h-3 text-slate-400" /> 지표:
              </span>
              <button
                onClick={() => setMetricType('SALES')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  metricType === 'SALES' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                매출액 추이
              </button>
              <button
                onClick={() => setMetricType('ROOMS')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  metricType === 'ROOMS' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                투숙 객실 추이
              </button>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mb-4 text-amber-500" />
          <p className="font-bold">연휴 데이터를 분석 중입니다...</p>
        </div>
      ) : data?.groupedByYear ? (
        <div className="space-y-4">
          {/* Main Chart */}
          <div className="h-[400px] w-full border border-slate-100 rounded-2xl p-4 bg-slate-50/30">
            <ReactECharts 
              option={viewMode === 'TOTAL' || !dailyDistributionData ? getTotalChartOptions() : getDailyChartOptions()} 
              style={{ height: '100%', width: '100%' }} 
            />
          </div>

          {/* 명절 당일/전·후일 방문 분포 분석 전용 상세 테이블 */}
          {viewMode === 'DAILY' && dailyDistributionData && (
            <div className="mt-6 pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-amber-500" />
                명절 D-Day 기준 연도별 일별 실적 비교표
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 rounded-2xl overflow-hidden whitespace-nowrap min-w-[600px]">
                  <thead className="bg-slate-100/80 text-slate-700 font-bold">
                    <tr>
                      <th className="py-3 px-4">구간 (D-Day 기준)</th>
                      {years.map(year => (
                        <th key={year} className="py-3 px-4 text-center">{year}년 일자 및 실적</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {dailyDistributionData.sortedOffsets.map((offset) => {
                      const label = offset === 0 
                        ? 'D-Day (명절 당일 🎯)' 
                        : (offset === -1 ? 'D-1 (명절 전일)' : (offset < 0 ? `D${offset}` : (offset === 1 ? 'D+1 (명절 익일)' : `D+${offset}`)));
                      
                      return (
                        <tr 
                          key={offset} 
                          className={`transition-colors ${
                            offset === 0 ? 'bg-amber-50/60 font-semibold' : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="py-3 px-4 font-bold text-slate-800">
                            {label}
                          </td>
                          {years.map(year => {
                            const day = dailyDistributionData.yearMaps[year]?.daysMap?.[offset];
                            return (
                              <td key={year} className="py-3 px-4 text-center">
                                {day ? (
                                  <div>
                                    <div className="text-slate-500 font-mono text-[11px]">{day.date}</div>
                                    <div className="font-bold text-slate-900">{day.salesFormatted}</div>
                                    {day.rooms > 0 && (
                                      <div className="text-[10px] text-slate-400">({day.rooms}실)</div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
