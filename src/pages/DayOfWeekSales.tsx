import React, { useState, useEffect } from 'react';
import { useDate } from '../contexts/DateContext';
import { secureFetcher } from '../lib/secureFetcher';
import ReactECharts from 'echarts-for-react';
import { AlertCircle, BarChart2, Activity, Map as MapIcon, CalendarDays, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import GlobalDatePicker from '../components/GlobalDatePicker';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

export interface DayOfWeekSalesProps {
  embedded?: boolean;
}

export default function DayOfWeekSales({ embedded = false }: DayOfWeekSalesProps = {}) {
  const { startDate, endDate } = useDate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error422, setError422] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState({ type: 'ALL', value: '' });
  const [filterOptions, setFilterOptions] = useState<{parts: string[], venues: string[]}>({ parts: [], venues: [] });

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError422(null);

    let queryParams = startDate === endDate || !endDate
      ? `date=${startDate}`
      : `startDate=${startDate}&endDate=${endDate}`;

    if (activeFilter.type === 'PART') {
      queryParams += `&partName=${encodeURIComponent(activeFilter.value)}`;
    } else if (activeFilter.type === 'VENUE') {
      queryParams += `&venueName=${encodeURIComponent(activeFilter.value)}`;
    }

    secureFetcher(`${API_BASE}/api/v6/report/day-of-week-sales?${queryParams}`)
      .then(res => {
        if (!isMounted) return;
        setData(res);
        setLoading(false);
        
        // 캐시용 필터 옵션 추출 (필터가 적용되지 않은 전체 조회일 때만 갱신)
        if (!res.appliedFilters?.isFiltered && res.hierarchyDrilldown) {
          const parts = new Set<string>();
          const venues = new Set<string>();
          res.hierarchyDrilldown.forEach((div: any) => {
            div.parts?.forEach((p: any) => {
              parts.add(p.partName);
              p.venues?.forEach((v: any) => venues.add(v.venueName));
            });
          });
          setFilterOptions({ parts: Array.from(parts), venues: Array.from(venues) });
        }
      })
      .catch(err => {
        if (!isMounted) return;
        if (err.status === 422 || err.statusCode === 422 || err.message?.includes('422')) {
          setError422({
            message: err.data?.message || err.message || "미매핑 영업장(Unmapped)이 감지되어 회계 왜곡 방지를 위해 데이터 조회가 강제 중단되었습니다.",
            details: err.data?.unmappedDetails || null
          });
        } else {
          console.error(err);
        }
        setLoading(false);
      });

    return () => { isMounted = false; };
  }, [startDate, endDate, activeFilter]);

  const hierarchyDrilldown = data?.hierarchyDrilldown || [];

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());
  const [expandedParts, setExpandedParts] = useState<Set<string>>(new Set());

  const toggleOrg = (orgName: string) => {
    setExpandedOrgs(prev => {
      const next = new Set(prev);
      if (next.has(orgName)) next.delete(orgName);
      else next.add(orgName);
      return next;
    });
  };

  const togglePart = (orgName: string, partName: string) => {
    const key = `${orgName}|${partName}`;
    setExpandedParts(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (error422) {
    return (
      <div className={`w-full ${embedded ? 'py-12' : 'min-h-[80vh]'} flex flex-col items-center justify-center p-6 bg-[#f8fafc]`}>
        <div className="bg-white border-2 border-red-500/50 p-8 rounded-2xl max-w-2xl text-center shadow-lg">
          <AlertCircle className="w-14 h-14 text-red-500 mx-auto mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold text-red-600 mb-3 tracking-tight">데이터 정합성 오류 감지 (HTTP 422)</h2>
          <p className="text-slate-600 mb-4 leading-relaxed font-medium">
            {error422.message}
          </p>
          {error422.details?.sampleVenues && (
            <div className="bg-red-50 p-4 rounded-xl mb-6 text-sm text-red-700 text-left border border-red-100">
              <strong>누락된 영업장 예시:</strong> {error422.details.sampleVenues.join(', ')}
              {error422.details.unmappedCount > 1 && ` 외 ${error422.details.unmappedCount - 1}건`}
            </div>
          )}
          <p className="text-slate-400 text-sm mb-6">
            프론트엔드 Bypass 방지 원칙에 따라, 회계 왜곡을 막기 위해 화면 렌더링이 강제 차단되었습니다.
          </p>
          <Link to="/admin/mapping" className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-sm">
            관리자 통제 센터에서 매핑 해결하기
          </Link>
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className={`w-full ${embedded ? 'py-20' : 'h-[80vh]'} flex items-center justify-center bg-white rounded-2xl border border-slate-200/80 shadow-sm`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-sm font-semibold text-slate-600">요일별 실적 분석 데이터를 불러오는 중입니다...</div>
        </div>
      </div>
    );
  }

  const { summary = {}, dayOfWeekSummary = [], monthDayMatrix = [] } = data;

  // 1. Unified Executive Color Palette for Charts
  const CHART_PALETTE = ['#3b82f6', '#6366f1', '#8b5cf6', '#0ea5e9', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#64748b'];

  // 2. Pie Options
  const getPieOptions = (title: string, pieData: any[], formatter: string) => ({
    title: { text: title, left: 'center', textStyle: { color: '#334155', fontSize: 15, fontWeight: 'bold' } },
    tooltip: { trigger: 'item' },
    color: CHART_PALETTE,
    series: [
      {
        type: 'pie',
        radius: ['32%', '72%'],
        roseType: 'area',
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2,
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.1)',
        },
        label: {
          show: true,
          formatter: formatter,
          color: '#475569',
          fontWeight: 'bold',
          fontSize: 12
        },
        data: pieData
      }
    ]
  });

  const targetHierarchy = selectedDay !== null && dayOfWeekSummary[selectedDay]
    ? (dayOfWeekSummary[selectedDay].hierarchyDrilldown || [])
    : hierarchyDrilldown;

  const totalPieData = targetHierarchy.map((org: any) => ({
      name: org.orgDivision,
      value: org.sharePct
    })).filter((d: any) => d.value > 0);

  const leisurePieData: any[] = [];
  const leisureOrg = targetHierarchy.find((org: any) => org.orgDivision.includes('레저') || org.orgDivision.includes('콘텐츠'));
  if (leisureOrg && leisureOrg.parts) {
    leisureOrg.parts.forEach((p: any) => {
      p.venues?.forEach((v: any) => {
        if (v.revenue > 0) {
          leisurePieData.push({ name: v.venueName, value: v.revenue });
        }
      });
    });
  }

  // 3. Day of Week Bar Chart (Executive Blue Gradient)
  const barOptions = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    grid: { top: '8%', left: '4%', right: '4%', bottom: '12%', containLabel: true },
    xAxis: {
      type: 'category',
      data: dayOfWeekSummary.map((d: any) => d.dayShort),
      axisLine: { lineStyle: { color: '#cbd5e1' } },
      axisTick: { show: false },
      axisLabel: { color: '#475569', fontWeight: 'bold' }
    },
    yAxis: { 
      show: true,
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLabel: { color: '#94a3b8', fontSize: 11 }
    },
    series: [
      {
        name: '매출',
        type: 'bar',
        barWidth: '55%',
        itemStyle: { 
          borderRadius: [6, 6, 0, 0], 
          color: '#00ae95'
        },
        data: dayOfWeekSummary.map((d: any) => d.totalRevenue)
      }
    ]
  };

  // 4. Month x Day Matrix (Heatmap)
  const months = monthDayMatrix.map((m: any) => m.monthName);
  const daysKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const daysLabels = ['월', '화', '수', '목', '금', '토', '일'];
  
  const heatmapData: any[] = [];
  let maxRevenue = 0;
  
  monthDayMatrix.forEach((m: any, mIdx: number) => {
    daysKeys.forEach((dKey, dIdx) => {
      const cell = m.days?.[dKey];
      const rev = Number(cell?.revenue || 0);
      heatmapData.push([dIdx, mIdx, rev, cell?.revenueFormatted || '0']);
      if (rev > maxRevenue) maxRevenue = rev;
    });
  });

  const heatmapOptions = {
    tooltip: { 
      position: 'top',
      formatter: (params: any) => {
        const val = params.data;
        return `<div class="font-bold text-slate-800">${months[val[1]]} ${daysLabels[val[0]]}요일</div><div class="text-emerald-600 font-semibold">매출: ${val[3]}</div>`;
      }
    },
    grid: { top: '5%', right: '4%', bottom: '22%', left: '8%' },
    xAxis: { type: 'category', data: daysLabels, splitArea: { show: true } },
    yAxis: { type: 'category', data: months, splitArea: { show: true } },
    visualMap: {
      min: 0,
      max: maxRevenue || 100,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      itemWidth: 14,
      dimension: 2,
      inRange: { color: ['#f8fafc', '#ccfbf1', '#5eead4', '#0d9488', '#115e59'] }
    },
    series: [{
      name: '매출',
      type: 'heatmap',
      data: heatmapData,
      label: { show: false },
      emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0, 0, 0, 0.3)' } },
      itemStyle: { borderColor: '#ffffff', borderWidth: 1 }
    }]
  };

  const content = (
    <div className={embedded ? 'w-full space-y-6' : 'w-full max-w-[1920px] mx-auto p-4 md:p-8 pt-6 space-y-6'}>
      {/* Filter Toolbar */}
      {embedded ? (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">요일별·부문별 매출 분석</h2>
              <p className="text-xs text-slate-500">조직도별 요일 점유율 및 성수기/비수기 히트맵 패턴</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            <select 
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 min-w-[200px] shadow-xs cursor-pointer"
              value={`${activeFilter.type}|${activeFilter.value}`}
              onChange={(e) => {
                const [type, value] = e.target.value.split('|');
                setActiveFilter({ type, value });
              }}
            >
              <option value="ALL|">🏢 전체 리조트 통합 실적</option>
              {filterOptions.parts.length > 0 && (
                <optgroup label="--- 파트 (Part) ---">
                  {filterOptions.parts.map(p => <option key={`PART|${p}`} value={`PART|${p}`}>{p}</option>)}
                </optgroup>
              )}
              {filterOptions.venues.length > 0 && (
                <optgroup label="--- 영업장 (Venue) ---">
                  {filterOptions.venues.map(v => <option key={`VENUE|${v}`} value={`VENUE|${v}`}>{v}</option>)}
                </optgroup>
              )}
            </select>
          </div>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
            <BarChart2 className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-medium tracking-tight text-slate-900">요일별·부문별 매출 분석</h1>
          </div>
          
          <div className="flex items-center gap-4 flex-wrap">
            <select 
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 min-w-[200px] shadow-xs cursor-pointer"
              value={`${activeFilter.type}|${activeFilter.value}`}
              onChange={(e) => {
                const [type, value] = e.target.value.split('|');
                setActiveFilter({ type, value });
              }}
            >
              <option value="ALL|">🏢 전체 리조트 통합 실적</option>
              {filterOptions.parts.length > 0 && (
                <optgroup label="--- 파트 (Part) ---">
                  {filterOptions.parts.map(p => <option key={`PART|${p}`} value={`PART|${p}`}>{p}</option>)}
                </optgroup>
              )}
              {filterOptions.venues.length > 0 && (
                <optgroup label="--- 영업장 (Venue) ---">
                  {filterOptions.venues.map(v => <option key={`VENUE|${v}`} value={`VENUE|${v}`}>{v}</option>)}
                </optgroup>
              )}
            </select>

            <GlobalDatePicker showPresets={true} />
          </div>
        </div>
      )}

      {/* 상단 메인 KPI 및 3분할 휴일 요약 패널 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        <div className="bg-gradient-to-br from-emerald-800 via-[#00ae95] to-slate-900 rounded-2xl p-6 shadow-sm text-white flex flex-col justify-between border border-emerald-900/20">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2 font-medium text-white/90 text-sm">
              <TrendingUp className="w-4 h-4 text-emerald-200" /> 종합 매출
            </div>
            <div className="bg-white/20 px-2.5 py-0.5 rounded-full text-xs font-bold text-white">
              전년비 {summary.growthRateFormatted}
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">
            {summary.totalRevenueFormatted}
          </div>
          <div className="text-xs text-white/70">
            최고 실적: <span className="text-white font-semibold">{summary.peakDayName}</span> ({summary.peakMonth}월)
          </div>
        </div>
        {[
          { title: '순수 평일 일평균', data: summary.weekday, icon: <CalendarDays className="w-4 h-4 text-emerald-600" /> },
          { title: '순수 주말 일평균', data: summary.weekend, icon: <Activity className="w-4 h-4 text-emerald-600" /> },
          { title: '주중 공휴일 일평균', data: summary.publicHoliday, icon: <MapIcon className="w-4 h-4 text-rose-500" /> },
        ].map((item, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col justify-between hover:border-slate-300 transition-all">
            <div className="flex items-center gap-2 text-slate-600 font-medium text-sm mb-3">
              <div className="p-1.5 bg-slate-50 rounded-lg">{item.icon}</div>
              {item.title}
            </div>
            <div className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight mb-2">
              {item.data?.dailyAvgFormatted || '0'}
            </div>
            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
              <span className="text-slate-400 font-medium">총 {item.data?.daysCount || 0}일</span>
              <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                {item.data?.sharePctFormatted || '0.0%'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 요일별 종합 비교 테이블 */}
      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-5 bg-emerald-600 rounded-full" />
            <h2 className="text-lg lg:text-xl font-bold text-slate-900">요일별 실적 종합 비교표</h2>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
            누적 요일 실적
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 border-collapse">
            <thead className="bg-slate-50/80 text-slate-700 text-xs font-bold uppercase tracking-wider border-y border-slate-200">
              <tr>
                <th className="px-4 py-3.5 w-24">요일</th>
                <th className="px-4 py-3.5 text-right">매출액 (Share)</th>
                <th className="px-4 py-3.5 text-right">전년 동기간 매출액</th>
                <th className="px-4 py-3.5 text-right">증감률</th>
                <th className="px-4 py-3.5 text-right bg-emerald-50/30">일평균 매출</th>
                <th className="px-4 py-3.5 text-right bg-emerald-50/30">누적 일수</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dayOfWeekSummary.map((d: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-slate-800">{d.dayName}</td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="font-bold text-slate-900">{d.totalRevenueFormatted}</div>
                    <div className="text-xs text-emerald-600 font-semibold">{d.sharePctFormatted}</div>
                  </td>
                  <td className="px-4 py-3.5 text-right text-slate-500">{d.lyRevenueFormatted}</td>
                  <td className="px-4 py-3.5 text-right">
                    <span className={`font-bold ${Number(d.growthRate) > 0 ? 'text-emerald-600' : Number(d.growthRate) < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                      {Number(d.growthRate) > 0 ? '▲' : Number(d.growthRate) < 0 ? '▼' : '-'} {Math.abs(Number(d.growthRate))}%
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right bg-emerald-50/20 font-bold text-slate-800">{d.dailyAvgRevenueFormatted}</td>
                  <td className="px-4 py-3.5 text-right bg-emerald-50/20 text-slate-500">{d.daysCount}일</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2-Column: Pie Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200/80">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-1.5 h-5 bg-emerald-600 rounded-full" />
            <h2 className="text-lg lg:text-xl font-bold text-slate-900">본부별 종합 점유율</h2>
          </div>
          <div className="h-[300px]">
            <ReactECharts option={getPieOptions('', totalPieData, '{b}\n{c}%')} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200/80">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-1.5 h-5 bg-emerald-600 rounded-full" />
            <h2 className="text-lg lg:text-xl font-bold text-slate-900">레저/콘텐츠 영업장별 비중</h2>
          </div>
          <div className="h-[300px]">
            <ReactECharts option={getPieOptions('', leisurePieData, '{b}\n{d}%')} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>

      {/* 2-Column: Bar Chart & Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-1.5 h-5 bg-emerald-600 rounded-full" />
              <h2 className="text-lg font-bold text-slate-900">요일별 전체 매출 흐름</h2>
            </div>
            <p className="text-xs text-slate-400 mb-4 ml-4">요일별 총매출 집계 및 부서별 점유율 칩</p>
            <div className="h-[270px]">
              <ReactECharts option={barOptions} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
          
          {/* 요일별 칩 범례 (Chips) */}
          <div className="pt-4 grid grid-cols-7 gap-1.5 border-t border-slate-100">
            {dayOfWeekSummary.map((d: any, idx: number) => {
              const isSelected = selectedDay === idx;
              return (
                <div 
                  key={idx} 
                  onClick={() => setSelectedDay(isSelected ? null : idx)}
                  className={`flex flex-col items-center px-1.5 py-2.5 rounded-xl border transition-all cursor-pointer group relative w-full ${
                    isSelected 
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs' 
                      : 'bg-slate-50/80 border-slate-200/80 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span className={`text-xs font-bold mb-1.5 whitespace-nowrap ${isSelected ? 'text-emerald-700' : 'text-slate-800'}`}>
                    {d.dayShort} ({d.daysCount}일)
                  </span>
                  <div className="flex flex-col gap-1 items-center w-full">
                    {(d.deptShares || []).slice(0, 3).map((s: any, sIdx: number) => (
                      <span 
                        key={sIdx} 
                        className={`text-[11px] font-semibold px-1 py-0.5 border rounded leading-none whitespace-nowrap ${
                          isSelected 
                            ? 'text-emerald-700 bg-white border-emerald-200' 
                            : 'text-slate-500 bg-white border-slate-200'
                        }`}
                      >
                        {s.badgeText}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200/80">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-1.5 h-5 bg-emerald-600 rounded-full" />
            <h2 className="text-lg font-bold text-slate-900">월 × 요일 매트릭스 (Heatmap)</h2>
          </div>
          
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3.5 mb-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
            <p className="text-xs text-slate-800 font-bold mb-1 flex items-center gap-1.5">
              <span>💡</span> 1년 중 어느 달, 무슨 요일에 매출이 가장 많이 발생할까요?
            </p>
            <p className="text-[11px] text-slate-500 leading-relaxed break-keep">
              각 셀의 <strong>매출이 높을수록 짙은 민트/청록색</strong>으로 표시되는 매출 패턴 지도입니다. 
              성수기 주말과 비수기 평일 구간을 직관적으로 파악할 수 있습니다.
            </p>
          </div>
          <div className="h-[380px]">
            <ReactECharts option={heatmapOptions} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>

      {/* 8대 부서 계층형 드릴다운 테이블 */}
      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-5 bg-emerald-600 rounded-full" />
            <h2 className="text-lg font-bold text-slate-900">8대 부서 상세 계층 드릴다운</h2>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full">
            부서별 상세 현황
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 border-collapse">
            <thead className="bg-slate-50/80 text-slate-700 font-bold text-xs uppercase tracking-wider border-y border-slate-200">
              <tr>
                <th className="px-4 py-3.5 w-1/3">부서 / 파트 / 영업장</th>
                <th className="px-4 py-3.5">상세 분류 (티켓그룹)</th>
                <th className="px-4 py-3.5 text-right">매출액</th>
                <th className="px-4 py-3.5 text-right">대분류 내 비중</th>
              </tr>
            </thead>
            <tbody>
              {hierarchyDrilldown.map((org: any) => {
                const isOrgExpanded = expandedOrgs.has(org.orgDivision);
                return (
                  <React.Fragment key={org.orgDivision}>
                    <tr 
                      className="border-b border-slate-200 bg-slate-50/60 hover:bg-emerald-50/40 cursor-pointer select-none transition-colors"
                      onClick={() => toggleOrg(org.orgDivision)}
                    >
                      <td className="px-4 py-3.5 font-bold text-slate-900 flex items-center gap-2">
                        {isOrgExpanded ? <ChevronDown size={17} className="text-emerald-600" /> : <ChevronRight size={17} className="text-slate-400" />}
                        {org.orgDivision}
                      </td>
                      <td className="px-4 py-3.5 text-slate-400">-</td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900 text-base">{org.revenueFormatted}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-800">{org.sharePctFormatted}</td>
                    </tr>

                    {isOrgExpanded && (org.parts || []).map((part: any) => {
                      const partKey = `${org.orgDivision}|${part.partName}`;
                      const isPartExpanded = expandedParts.has(partKey);
                      return (
                        <React.Fragment key={partKey}>
                          <tr 
                            className="border-b border-slate-100 bg-slate-50/30 hover:bg-slate-100/70 cursor-pointer select-none transition-colors"
                            onClick={() => togglePart(org.orgDivision, part.partName)}
                          >
                            <td className="px-4 py-3 font-semibold text-slate-800 pl-8 flex items-center gap-2">
                              {isPartExpanded ? <ChevronDown size={15} className="text-emerald-500" /> : <ChevronRight size={15} className="text-slate-400" />}
                              {part.partName}
                            </td>
                            <td className="px-4 py-3 text-slate-400">-</td>
                            <td className="px-4 py-3 text-right font-bold text-slate-700">{part.revenueFormatted}</td>
                            <td className="px-4 py-3 text-right text-slate-400">-</td>
                          </tr>

                          {isPartExpanded && (part.venues || []).map((venue: any) => {
                            if (!venue.ticketGroups || venue.ticketGroups.length === 0) {
                              return (
                                <tr key={`${partKey}|${venue.venueName}`} className="border-b border-slate-50 bg-white hover:bg-slate-50/60 transition-colors">
                                  <td className="px-4 py-2.5 text-slate-600 pl-14 font-medium">{venue.venueName}</td>
                                  <td className="px-4 py-2.5 text-slate-400">-</td>
                                  <td className="px-4 py-2.5 text-right font-medium text-slate-600">{venue.revenueFormatted}</td>
                                  <td className="px-4 py-2.5"></td>
                                </tr>
                              );
                            }
                            return venue.ticketGroups.map((group: any, gIdx: number) => (
                              <tr key={`${partKey}|${venue.venueName}|${group.groupName}`} className="border-b border-slate-50 bg-white hover:bg-slate-50/60 transition-colors">
                                {gIdx === 0 ? (
                                  <td className="px-4 py-2.5 text-slate-600 pl-14 font-medium align-top" rowSpan={venue.ticketGroups.length}>
                                    <div className="pt-0.5">{venue.venueName}</div>
                                  </td>
                                ) : null}
                                <td className="px-4 py-2.5 text-slate-500 text-xs align-middle">
                                  <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200/60">{group.groupName}</span>
                                </td>
                                <td className="px-4 py-2.5 text-right font-medium text-slate-600">{group.revenueFormatted}</td>
                                <td className="px-4 py-2.5"></td>
                              </tr>
                            ));
                          })}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] text-slate-800 tracking-tight pb-16">
      {content}
    </div>
  );
}
