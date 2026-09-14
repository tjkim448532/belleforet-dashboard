import React, { useState, useEffect } from 'react';
import { useDate } from '../contexts/DateContext';
import { secureFetcher } from '../lib/secureFetcher';
import ReactECharts from 'echarts-for-react';
import { AlertCircle, BarChart2, Activity, Map as MapIcon, CalendarDays, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import GlobalDatePicker from '../components/GlobalDatePicker';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

export default function DayOfWeekSales() {
  const { startDate, endDate } = useDate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error422, setError422] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError422(null);

    const queryParams = startDate === endDate || !endDate
      ? `date=${startDate}`
      : `startDate=${startDate}&endDate=${endDate}`;

    secureFetcher(`${API_BASE}/api/v6/report/day-of-week-sales?${queryParams}`)
      .then(res => {
        if (!isMounted) return;
        setData(res);
        setLoading(false);
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
  }, [startDate, endDate]);

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
      <div className="w-full min-h-[80vh] flex flex-col items-center justify-center p-6 bg-[#f8fafc]">
        <div className="bg-white border-2 border-red-500/50 p-8 rounded-[32px] max-w-2xl text-center shadow-[0_20px_40px_rgb(239,68,68,0.1)]">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold text-red-600 mb-4 tracking-tight">데이터 정합성 오류 감지 (HTTP 422)</h2>
          <p className="text-slate-600 mb-4 leading-relaxed font-medium">
            {error422.message}
          </p>
          {error422.details?.sampleVenues && (
            <div className="bg-red-50 p-4 rounded-xl mb-6 text-sm text-red-700 text-left">
              <strong>누락된 영업장 예시:</strong> {error422.details.sampleVenues.join(', ')}
              {error422.details.unmappedCount > 1 && ` 외 ${error422.details.unmappedCount - 1}건`}
            </div>
          )}
          <p className="text-slate-400 text-sm mb-8">
            프론트엔드 Bypass 방지 원칙에 따라, 회계 왜곡을 막기 위해 화면 렌더링이 강제 차단되었습니다.
          </p>
          <Link to="/admin/mapping" className="inline-block bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-md hover:shadow-lg">
            관리자 통제 센터에서 매핑 해결하기
          </Link>
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="w-full h-[80vh] flex items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-brand-mint border-t-transparent rounded-full animate-spin"></div>
          <div className="text-lg font-medium text-brand-mint animate-pulse">데이터를 불러오는 중입니다...</div>
        </div>
      </div>
    );
  }

  const { summary = {}, dayOfWeekSummary = [], monthDayMatrix = [] } = data;

  // 2. Pseudo-3D Pie Options
  const getPieOptions = (title: string, pieData: any[], formatter: string) => ({
    title: { text: title, left: 'center', textStyle: { color: '#475569', fontSize: 16 } },
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'pie',
        radius: ['30%', '70%'],
        roseType: 'area', // Pseudo 3D effect
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2,
          shadowBlur: 20,
          shadowColor: 'rgba(0, 0, 0, 0.2)',
          shadowOffsetX: 5,
          shadowOffsetY: 10
        },
        label: {
          show: true,
          formatter: formatter,
          color: '#475569',
          fontWeight: 'bold'
        },
        data: pieData
      }
    ]
  });

  const totalPieData = selectedDay !== null && dayOfWeekSummary[selectedDay]
    ? (dayOfWeekSummary[selectedDay].deptShares || []).map((d: any) => ({
        name: d.fullName,
        value: d.sharePct
      })).filter((d: any) => d.value > 0)
    : hierarchyDrilldown.map((org: any) => ({
        name: org.orgDivision,
        value: org.sharePct
      })).filter((d: any) => d.value > 0);

  const leisurePieData: any[] = [];
  if (selectedDay === null) {
    const leisureOrg = hierarchyDrilldown.find((org: any) => org.orgDivision.includes('레저') || org.orgDivision.includes('콘텐츠'));
    if (leisureOrg && leisureOrg.parts) {
      leisureOrg.parts.forEach((p: any) => {
        p.venues?.forEach((v: any) => {
          if (v.revenue > 0) {
            leisurePieData.push({ name: v.venueName, value: v.revenue });
          }
        });
      });
    }
  }

  // 3. Day of Week Bar Chart (using totalRevenue)
  const barOptions = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const item = dayOfWeekSummary[params[0].dataIndex];
        return `
          <div class="font-bold mb-1 text-slate-800">${item?.dayName || ''}</div>
          <div class="text-slate-600 mb-2">매출: <span class="font-bold">${item?.totalRevenueFormatted || ''}</span></div>
          <div class="flex flex-wrap gap-1 w-48">
            ${(item?.deptShares || []).map((s: any) => `<span class="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-brand-mint border border-slate-200">${s.badgeText}</span>`).join('')}
          </div>
        `;
      }
    },
    grid: { left: '3%', right: '4%', bottom: '5%', containLabel: true },
    xAxis: {
      type: 'category',
      data: dayOfWeekSummary.map((d: any) => d.dayShort),
      axisTick: { alignWithLabel: true }
    },
    yAxis: { type: 'value', show: false },
    series: [
      {
        type: 'bar',
        barWidth: '60%',
        itemStyle: { borderRadius: [8, 8, 0, 0], color: '#00AE95' },
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
        return `<div class="font-bold">${months[val[1]]} ${daysLabels[val[0]]}요일</div><div>매출: ${val[3]}</div>`;
      }
    },
    grid: { top: '5%', right: '5%', bottom: '25%', left: '10%' },
    xAxis: { type: 'category', data: daysLabels, splitArea: { show: true } },
    yAxis: { type: 'category', data: months, splitArea: { show: true } },
    visualMap: {
      min: 0,
      max: maxRevenue || 100,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      itemWidth: 15,
      dimension: 2,
      inRange: { color: ['#f8fafc', '#00AE95'] }
    },
    series: [{
      name: '매출',
      type: 'heatmap',
      data: heatmapData,
      label: { show: false },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' } },
      itemStyle: { borderColor: '#ffffff', borderWidth: 1 }
    }]
  };

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] text-slate-800 tracking-tight pb-16">
      <div className="w-full max-w-[1920px] mx-auto p-4 md:p-8 pt-6">
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <BarChart2 className="w-8 h-8 text-brand-mint" />
            <h1 className="text-3xl font-medium tracking-tight">요일별·부문별 매출 분석</h1>
          </div>
          
          <div className="flex items-center gap-4 flex-wrap">
            {data.validationMaster?.isZeroVariance && (
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full font-bold text-sm border border-emerald-100">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Zero-Variance 검증 완료
              </div>
            )}
            <GlobalDatePicker showPresets={true} />
          </div>
        </div>

        {/* 상단 메인 KPI 및 3분할 휴일 요약 패널 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-brand-mint to-teal-500 rounded-[32px] p-6 shadow-lg text-white">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2 font-medium opacity-90">
                <TrendingUp className="w-5 h-5" /> 종합 매출
              </div>
              <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">
                전년비 {summary.growthRateFormatted}
              </div>
            </div>
            <div className="text-4xl font-black tracking-tight mb-2">
              {summary.totalRevenueFormatted}
            </div>
            <div className="text-sm opacity-80">
              최고 실적: {summary.peakDayName} ({summary.peakMonth}월)
            </div>
          </div>

          {[
            { title: '순수 평일 일평균', data: summary.weekday, icon: <CalendarDays className="w-5 h-5 text-indigo-500" /> },
            { title: '순수 주말 일평균', data: summary.weekend, icon: <Activity className="w-5 h-5 text-orange-500" /> },
            { title: '주중 공휴일 일평균', data: summary.publicHoliday, icon: <MapIcon className="w-5 h-5 text-rose-500" /> },
          ].map((item, idx) => (
            <div key={idx} className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-300 border border-slate-100">
              <div className="flex items-center gap-2 text-slate-500 font-medium mb-4">
                {item.icon} {item.title}
              </div>
              <div className="text-3xl font-black text-slate-800 tracking-tight mb-2">
                {item.data?.dailyAvgFormatted}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">총 {item.data?.daysCount || 0}일</span>
                <span className="font-bold text-brand-mint bg-brand-mint/10 px-2 py-0.5 rounded-md">{item.data?.sharePctFormatted}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
            <h2 className="text-lg font-medium text-slate-700 mb-6 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-brand-mint rounded-full"></span>
              본부별 종합 점유율 (3D)
            </h2>
            <div className="h-[300px]">
              <ReactECharts option={getPieOptions('', totalPieData, '{b}\n{c}%')} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative">
            <h2 className="text-lg font-medium text-slate-700 mb-6 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-orange-400 rounded-full"></span>
              레저/콘텐츠 영업장별 비중 (3D)
            </h2>
            <div className="h-[300px]">
              {selectedDay !== null ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <span className="text-sm font-medium mb-1">요일별 세부 영업장 데이터 미제공</span>
                  <span className="text-xs">전체 기간 조회 시에만 노출됩니다.</span>
                </div>
              ) : (
                <ReactECharts option={getPieOptions('', leisurePieData, '{b}\n{d}%')} style={{ height: '100%', width: '100%' }} />
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col">
            <h2 className="text-lg font-medium text-slate-700 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
              요일별 전체 매출 흐름
            </h2>
            <p className="text-sm text-slate-400 mb-6 ml-3">백엔드 100.0% 잔차 보정 배지 포함</p>
            <div className="h-[280px] flex-shrink-0">
              <ReactECharts option={barOptions} style={{ height: '100%', width: '100%' }} />
            </div>
            {/* 요일별 칩 범례 (Chips) */}
            <div className="mt-auto pt-4 grid grid-cols-7 gap-1.5 border-t border-slate-50">
              {dayOfWeekSummary.map((d: any, idx: number) => {
                const isSelected = selectedDay === idx;
                return (
                  <div 
                    key={idx} 
                    onClick={() => setSelectedDay(isSelected ? null : idx)}
                    className={`flex flex-col items-center px-2 py-3 rounded-2xl border transition-colors cursor-pointer group relative w-full ${isSelected ? 'bg-brand-mint/10 border-brand-mint/30' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'}`}
                  >
                    <span className={`text-base font-bold mb-2 whitespace-nowrap ${isSelected ? 'text-brand-mint' : 'text-slate-700'}`}>{d.dayShort} ({d.daysCount}일)</span>
                    <div className="flex flex-col gap-1.5 items-center w-full">
                      {(d.deptShares || []).slice(0,3).map((s: any, sIdx: number) => (
                        <span key={sIdx} className={`text-[14px] font-medium px-1.5 py-1 border rounded-md leading-none whitespace-nowrap ${isSelected ? 'text-brand-mint bg-white border-brand-mint/20' : 'text-slate-500 bg-white border-slate-200'}`}>
                          {s.badgeText}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
            <h2 className="text-lg font-medium text-slate-700 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-rose-400 rounded-full"></span>
              월 × 요일 매트릭스 (Heatmap)
            </h2>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-rose-300"></div>
              <p className="text-[13px] text-slate-700 font-bold mb-1 flex items-center gap-1.5">
                <span className="text-base">💡</span> 1년 중 어느 달, 무슨 요일에 매출이 가장 많이 발생할까요?
              </p>
              <p className="text-[12px] text-slate-500 leading-relaxed break-keep">
                각 셀의 <strong>매출이 높을수록 짙은 초록색</strong>으로 표시되는 매출 농도(패턴) 지도입니다.<br />
                직관적으로 색이 짙은 구간(성수기 주말)과 옅은 구간(비수기 평일)을 파악하여 <strong>타겟 프로모션이나 경영 전략</strong>을 세우는 데 활용하세요.
              </p>
            </div>
            <div className="h-[400px]">
              <ReactECharts option={heatmapOptions} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        </div>

        {/* 8대 부서 계층형 드릴다운 테이블 */}
        <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-slate-700 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-slate-800 rounded-full"></span>
              8대 부서 상세 계층 드릴다운
            </h2>
            <span className="text-xs font-bold bg-slate-100 text-slate-500 px-3 py-1 rounded-full">
              Zero-Computation Table
            </span>
          </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-bold border-y border-slate-200">
                  <tr>
                    <th className="px-4 py-4 w-1/3">부서 / 영업장</th>
                    <th className="px-4 py-4">상세 분류 (티켓그룹)</th>
                    <th className="px-4 py-4 text-right">매출액</th>
                    <th className="px-4 py-4 text-right">대분류 내 비중</th>
                  </tr>
                </thead>
                <tbody>
                  {hierarchyDrilldown.map((org: any) => {
                    const isOrgExpanded = expandedOrgs.has(org.orgDivision);
                    return (
                      <React.Fragment key={org.orgDivision}>
                        <tr 
                          className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer select-none"
                          onClick={() => toggleOrg(org.orgDivision)}
                        >
                          <td className="px-4 py-4 font-black text-slate-800 flex items-center gap-2">
                            {isOrgExpanded ? <ChevronDown size={18} className="text-brand-mint" /> : <ChevronRight size={18} className="text-slate-400" />}
                            {org.orgDivision}
                          </td>
                          <td className="px-4 py-4 text-slate-400">-</td>
                          <td className="px-4 py-4 text-right font-black text-brand-mint text-base">{org.revenueFormatted}</td>
                          <td className="px-4 py-4 text-right font-black text-slate-800">{org.sharePctFormatted}</td>
                        </tr>

                        {isOrgExpanded && (org.parts || []).map((part: any) => {
                          const partKey = `${org.orgDivision}|${part.partName}`;
                          const isPartExpanded = expandedParts.has(partKey);
                          return (
                            <React.Fragment key={partKey}>
                              <tr 
                                className="border-b border-slate-100 bg-slate-50/50 hover:bg-slate-100 cursor-pointer select-none"
                                onClick={() => togglePart(org.orgDivision, part.partName)}
                              >
                                <td className="px-4 py-3 font-bold text-slate-700 pl-10 flex items-center gap-2">
                                  {isPartExpanded ? <ChevronDown size={16} className="text-brand-mint" /> : <ChevronRight size={16} className="text-slate-400" />}
                                  {part.partName}
                                </td>
                                <td className="px-4 py-3 text-slate-400">-</td>
                                <td className="px-4 py-3 text-right font-bold text-slate-700">{part.revenueFormatted}</td>
                                <td className="px-4 py-3 text-right text-slate-400">-</td>
                              </tr>

                              {isPartExpanded && (part.venues || []).map((venue: any) => {
                                if (!venue.ticketGroups || venue.ticketGroups.length === 0) {
                                  return (
                                    <tr key={`${partKey}|${venue.venueName}`} className="border-b border-slate-50 bg-white hover:bg-slate-50/30 transition-colors">
                                      <td className="px-4 py-2.5 text-slate-600 pl-16 font-medium">{venue.venueName}</td>
                                      <td className="px-4 py-2.5 text-slate-400">-</td>
                                      <td className="px-4 py-2.5 text-right font-medium text-slate-600">{venue.revenueFormatted}</td>
                                      <td className="px-4 py-2.5"></td>
                                    </tr>
                                  );
                                }
                                return venue.ticketGroups.map((group: any, gIdx: number) => (
                                  <tr key={`${partKey}|${venue.venueName}|${group.groupName}`} className="border-b border-slate-50 bg-white hover:bg-slate-50/30 transition-colors">
                                    {gIdx === 0 ? (
                                      <td className="px-4 py-2.5 text-slate-600 pl-16 font-medium align-top" rowSpan={venue.ticketGroups.length}>
                                        <div className="pt-0.5">{venue.venueName}</div>
                                      </td>
                                    ) : null}
                                    <td className="px-4 py-2.5 text-slate-500 text-xs align-middle">
                                      <span className="bg-slate-100 px-2 py-1 rounded">{group.groupName}</span>
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
      </div>
    );
}
