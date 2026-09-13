import { useState, useEffect, useMemo } from 'react';
import { useDate } from '../contexts/DateContext';
import { secureFetcher } from '../lib/secureFetcher';
import ReactECharts from 'echarts-for-react';
import { AlertCircle, BarChart2, Activity, Map as MapIcon, CalendarDays, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

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

  const { summary = {}, hierarchyDrilldown = [], dayOfWeekSummary = [], monthDayMatrix = [] } = data;

  // 1. Flatten hierarchyDrilldown & calculate rowSpans
  const flattenedTable = useMemo(() => {
    const rows: any[] = [];
    hierarchyDrilldown.forEach((org: any) => {
      let orgRowSpan = 0;
      org.parts?.forEach((part: any) => {
        part.venues?.forEach((venue: any) => {
          orgRowSpan += Math.max(1, venue.ticketGroups?.length || 1);
        });
      });
      orgRowSpan = Math.max(1, orgRowSpan);

      if (!org.parts || org.parts.length === 0) {
        rows.push({
          orgName: org.orgDivision, orgSpan: orgRowSpan,
          partName: '-', partSpan: 1,
          venueName: '-', venueSpan: 1,
          groupName: '-', revenueFormatted: org.revenueFormatted, sharePctFormatted: org.sharePctFormatted
        });
        return;
      }

      org.parts.forEach((part: any, pIdx: number) => {
        let partRowSpan = 0;
        part.venues?.forEach((venue: any) => {
          partRowSpan += Math.max(1, venue.ticketGroups?.length || 1);
        });
        partRowSpan = Math.max(1, partRowSpan);

        if (!part.venues || part.venues.length === 0) {
          rows.push({
            orgName: org.orgDivision, orgSpan: pIdx === 0 ? orgRowSpan : 0,
            partName: part.partName, partSpan: partRowSpan,
            venueName: '-', venueSpan: 1,
            groupName: '-', revenueFormatted: part.revenueFormatted, sharePctFormatted: '-'
          });
          return;
        }

        part.venues.forEach((venue: any, vIdx: number) => {
          const venueRowSpan = Math.max(1, venue.ticketGroups?.length || 1);

          if (!venue.ticketGroups || venue.ticketGroups.length === 0) {
            rows.push({
              orgName: org.orgDivision, orgSpan: (pIdx === 0 && vIdx === 0) ? orgRowSpan : 0,
              partName: part.partName, partSpan: vIdx === 0 ? partRowSpan : 0,
              venueName: venue.venueName, venueSpan: venueRowSpan,
              groupName: '-', revenueFormatted: venue.revenueFormatted, sharePctFormatted: '-'
            });
            return;
          }

          venue.ticketGroups.forEach((group: any, gIdx: number) => {
            rows.push({
              orgName: org.orgDivision, orgSpan: (pIdx === 0 && vIdx === 0 && gIdx === 0) ? orgRowSpan : 0,
              partName: part.partName, partSpan: (vIdx === 0 && gIdx === 0) ? partRowSpan : 0,
              venueName: venue.venueName, venueSpan: (gIdx === 0) ? venueRowSpan : 0,
              groupName: group.groupName, revenueFormatted: group.revenueFormatted, sharePctFormatted: (gIdx === 0 && vIdx === 0 && pIdx === 0) ? org.sharePctFormatted : '-'
            });
          });
        });
      });
    });
    return rows;
  }, [hierarchyDrilldown]);

  // 2. Pseudo-3D Pie Options
  const getPieOptions = (title: string, pieData: any[]) => ({
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
          formatter: '{b}\\n{c}%',
          color: '#475569',
          fontWeight: 'bold'
        },
        data: pieData
      }
    ]
  });

  const totalPieData = hierarchyDrilldown.map((org: any) => ({
    name: org.orgDivision,
    value: org.sharePct
  })).filter((d: any) => d.value > 0);

  const leisureOrg = hierarchyDrilldown.find((org: any) => org.orgDivision.includes('레저') || org.orgDivision.includes('콘텐츠'));
  const leisurePieData: any[] = [];
  if (leisureOrg && leisureOrg.parts) {
    leisureOrg.parts.forEach((p: any) => {
      p.venues?.forEach((v: any) => {
        if (v.revenue > 0) {
          leisurePieData.push({ name: v.venueName, value: v.revenue });
        }
      });
    });
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
      if (cell && cell.revenue > 0) {
        heatmapData.push([dIdx, mIdx, cell.revenue, cell.revenueFormatted]);
        if (cell.revenue > maxRevenue) maxRevenue = cell.revenue;
      }
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
    grid: { height: '75%', top: '5%' },
    xAxis: { type: 'category', data: daysLabels, splitArea: { show: true } },
    yAxis: { type: 'category', data: months, splitArea: { show: true } },
    visualMap: {
      min: 0,
      max: maxRevenue || 100,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '2%',
      inRange: { color: ['#f8fafc', '#00AE95'] }
    },
    series: [{
      name: '매출',
      type: 'heatmap',
      data: heatmapData,
      label: { show: false },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' } },
      itemStyle: { borderColor: '#fff', borderWidth: 2, borderRadius: 4 }
    }]
  };

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] text-slate-800 tracking-tight pb-16">
      <div className="w-full max-w-[1920px] mx-auto p-4 md:p-8 pt-6">
        
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <BarChart2 className="w-8 h-8 text-brand-mint" />
            <h1 className="text-3xl font-medium tracking-tight">요일별·부문별 매출 분석</h1>
          </div>
          {data.validationMaster?.isZeroVariance && (
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full font-bold text-sm border border-emerald-100">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Zero-Variance 검증 완료
            </div>
          )}
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
              <ReactECharts option={getPieOptions('', totalPieData)} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
            <h2 className="text-lg font-medium text-slate-700 mb-6 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-orange-400 rounded-full"></span>
              레저/콘텐츠 영업장별 비중 (3D)
            </h2>
            <div className="h-[300px]">
              <ReactECharts option={getPieOptions('', leisurePieData)} style={{ height: '100%', width: '100%' }} />
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
            <div className="mt-auto pt-4 flex flex-wrap gap-2 justify-center border-t border-slate-50">
              {dayOfWeekSummary.map((d: any, idx: number) => (
                <div key={idx} className="flex flex-col items-center bg-slate-50 px-3 py-2 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-colors cursor-pointer group relative">
                  <span className="text-xs font-bold text-slate-700 mb-1">{d.dayShort} ({d.daysCount}일)</span>
                  <div className="flex gap-1 flex-wrap justify-center w-32">
                    {(d.deptShares || []).slice(0,3).map((s: any, sIdx: number) => (
                      <span key={sIdx} className="text-[10px] text-brand-mint font-medium bg-white px-1 border border-slate-200 rounded">
                        {s.badgeText}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
            <h2 className="text-lg font-medium text-slate-700 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-rose-400 rounded-full"></span>
              월 × 요일 매트릭스 (Heatmap)
            </h2>
            <p className="text-sm text-slate-400 mb-6 ml-3">1~12월 성수기/비성수기 요일별 패턴 농도</p>
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
                  <th className="px-4 py-4">대분류 (본부)</th>
                  <th className="px-4 py-4">파트 (팀)</th>
                  <th className="px-4 py-4">영업장</th>
                  <th className="px-4 py-4">상세 분류 (티켓그룹)</th>
                  <th className="px-4 py-4 text-right">매출액</th>
                  <th className="px-4 py-4 text-right">대분류 내 비중</th>
                </tr>
              </thead>
              <tbody>
                {flattenedTable.map((row: any, i: number) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    {row.orgSpan > 0 && (
                      <td className="px-4 py-4 font-black text-slate-800 align-top border-r border-slate-100 bg-white" rowSpan={row.orgSpan}>
                        {row.orgName}
                      </td>
                    )}
                    {row.partSpan > 0 && (
                      <td className="px-4 py-4 font-bold text-slate-700 align-top border-r border-slate-100 bg-slate-50/30" rowSpan={row.partSpan}>
                        {row.partName}
                      </td>
                    )}
                    {row.venueSpan > 0 && (
                      <td className="px-4 py-4 font-medium text-slate-600 align-top border-r border-slate-100" rowSpan={row.venueSpan}>
                        {row.venueName}
                      </td>
                    )}
                    <td className="px-4 py-3 text-slate-500">
                      {row.groupName}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      {row.revenueFormatted}
                    </td>
                    {row.orgSpan > 0 && (
                      <td className="px-4 py-3 text-right text-brand-mint font-black align-top" rowSpan={row.orgSpan}>
                        {row.sharePctFormatted}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
