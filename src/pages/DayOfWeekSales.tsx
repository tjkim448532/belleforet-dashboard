import { useState, useEffect, useMemo } from 'react';
import { useDate } from '../contexts/DateContext';
import { secureFetcher } from '../lib/secureFetcher';
import ReactECharts from 'echarts-for-react';
import { AlertCircle, Calendar, BarChart2, Activity, Map as MapIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

export default function DayOfWeekSales() {
  const { startDate, endDate } = useDate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error422Msg, setError422Msg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError422Msg(null);

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
        if (err.status === 422 || err.message?.includes('422')) {
          setError422Msg(err.data?.message || err.message || "미매핑 영업장(Unmapped)이 감지되어 회계 왜곡 방지를 위해 데이터 조회가 강제 중단되었습니다.");
        } else {
          console.error(err);
        }
        setLoading(false);
      });

    return () => { isMounted = false; };
  }, [startDate, endDate]);

  if (error422Msg) {
    return (
      <div className="w-full min-h-[80vh] flex flex-col items-center justify-center p-6 bg-[#f8fafc]">
        <div className="bg-white border-2 border-red-500/50 p-8 rounded-[32px] max-w-2xl text-center shadow-[0_20px_40px_rgb(239,68,68,0.1)]">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold text-red-600 mb-4 tracking-tight">데이터 정합성 오류 감지 (HTTP 422)</h2>
          <p className="text-slate-600 mb-6 leading-relaxed font-medium">
            {error422Msg}
          </p>
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
        <div className="text-xl font-medium text-brand-mint animate-pulse">데이터를 불러오는 중입니다...</div>
      </div>
    );
  }

  const { summary = {}, hierarchyDrilldown = [], dayOfWeekSummary = [], monthDayMatrix = [] } = data;

  const rowSpans = useMemo(() => {
    const spans = new Map<number, { deptSpan: number; shopSpan: number }>();
    let deptStartIdx = 0;
    let shopStartIdx = 0;

    hierarchyDrilldown.forEach((row: any, i: number) => {
      if (i === 0) {
        spans.set(i, { deptSpan: 1, shopSpan: 1 });
        return;
      }
      
      const prevRow = hierarchyDrilldown[i-1];
      const span = { deptSpan: 1, shopSpan: 1 };
      
      if (row.deptName === prevRow.deptName) {
        span.deptSpan = 0;
        const startObj = spans.get(deptStartIdx)!;
        startObj.deptSpan += 1;
        
        if (row.shopName === prevRow.shopName) {
          span.shopSpan = 0;
          const shopStartObj = spans.get(shopStartIdx)!;
          shopStartObj.shopSpan += 1;
        } else {
          shopStartIdx = i;
        }
      } else {
        deptStartIdx = i;
        shopStartIdx = i;
      }
      spans.set(i, span);
    });
    return spans;
  }, [hierarchyDrilldown]);

  const getPieOptions = (title: string, pieData: any[]) => ({
    title: { text: title, left: 'center', textStyle: { color: '#475569', fontSize: 16 } },
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'pie',
        radius: ['30%', '70%'],
        roseType: 'area',
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

  const totalPieData = hierarchyDrilldown
    .filter((r: any) => rowSpans.get(hierarchyDrilldown.indexOf(r))?.deptSpan && rowSpans.get(hierarchyDrilldown.indexOf(r))!.deptSpan > 0)
    .map((r: any) => ({ name: r.deptName, value: r.sharePct }));

  const leisureData = hierarchyDrilldown.filter((r: any) => r.deptName === '레저');
  const leisurePieData = leisureData
    .filter((r: any) => rowSpans.get(hierarchyDrilldown.indexOf(r))?.shopSpan && rowSpans.get(hierarchyDrilldown.indexOf(r))!.shopSpan > 0)
    .map((r: any) => ({ name: r.shopName, value: r.sharePct }));

  const barOptions = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const item = dayOfWeekSummary[params[0].dataIndex];
        return `
          <div class="font-bold mb-1">${item?.dayName || ''}</div>
          <div>매출: ${item?.revenueFormatted}</div>
          <div class="mt-2 text-xs bg-slate-100 p-1 rounded text-brand-mint">${item?.badgeText || ''}</div>
        `;
      }
    },
    grid: { left: '3%', right: '4%', bottom: '5%', containLabel: true },
    xAxis: {
      type: 'category',
      data: dayOfWeekSummary.map((d: any) => d.dayName),
      axisTick: { alignWithLabel: true }
    },
    yAxis: { type: 'value', show: false },
    series: [
      {
        type: 'bar',
        barWidth: '60%',
        itemStyle: { borderRadius: [8, 8, 0, 0], color: '#00AE95' },
        data: dayOfWeekSummary.map((d: any) => d.revenue)
      }
    ]
  };

  const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
  const days = ['월', '화', '수', '목', '금', '토', '일'];
  const heatmapData = monthDayMatrix.map((d: any) => [
    days.indexOf(d.day),
    d.month - 1,
    d.revenue
  ]);

  const heatmapOptions = {
    tooltip: { position: 'top' },
    grid: { height: '70%', top: '10%' },
    xAxis: { type: 'category', data: days, splitArea: { show: true } },
    yAxis: { type: 'category', data: months, splitArea: { show: true } },
    visualMap: {
      min: 0,
      max: Math.max(...heatmapData.map((d: any) => d[2]), 10000000),
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '5%',
      inRange: { color: ['#f8fafc', '#00AE95'] }
    },
    series: [{
      name: '매출',
      type: 'heatmap',
      data: heatmapData,
      label: { show: false },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
    }]
  };

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] text-slate-800 tracking-tight pb-16">
      <div className="w-full max-w-[1920px] mx-auto p-4 md:p-8 pt-6">
        
        <div className="flex items-center gap-3 mb-8">
          <BarChart2 className="w-8 h-8 text-brand-mint" />
          <h1 className="text-3xl font-medium tracking-tight">요일별·부문별 매출 분석</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[
            { title: '평일 일평균', data: summary.weekday, icon: <Calendar className="w-5 h-5 text-indigo-500" /> },
            { title: '주말 일평균', data: summary.weekend, icon: <Activity className="w-5 h-5 text-orange-500" /> },
            { title: '주중 공휴일 일평균', data: summary.publicHoliday, icon: <MapIcon className="w-5 h-5 text-rose-500" /> },
          ].map((item, idx) => (
            <div key={idx} className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center gap-2 text-slate-500 font-medium mb-4">
                {item.icon} {item.title}
              </div>
              <div className="text-3xl font-black text-slate-800 tracking-tight">
                {item.data?.dailyAvgFormatted}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h2 className="text-lg font-medium text-slate-600 mb-6">6대 부문 3D 점유율</h2>
            <div className="h-[300px]">
              <ReactECharts option={getPieOptions('전체 부문 비중', totalPieData)} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h2 className="text-lg font-medium text-slate-600 mb-6">레저 전용 3D 점유율</h2>
            <div className="h-[300px]">
              <ReactECharts option={getPieOptions('레저 시설 비중', leisurePieData)} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h2 className="text-lg font-medium text-slate-600 mb-6">요일별 실적 및 부문 요약</h2>
            <div className="h-[350px]">
              <ReactECharts option={barOptions} style={{ height: '100%', width: '100%' }} />
            </div>
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {dayOfWeekSummary.map((d: any, idx: number) => (
                <div key={idx} className="flex flex-col items-center bg-[#f8fafc] px-3 py-1 rounded-xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-700">{d.dayName}</span>
                  <span className="text-[10px] text-brand-mint font-medium">{d.badgeText}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h2 className="text-lg font-medium text-slate-600 mb-6">월 × 요일 매트릭스 (Heatmap)</h2>
            <div className="h-[400px]">
              <ReactECharts option={heatmapOptions} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <h2 className="text-lg font-medium text-slate-600 mb-6">부문별 상세 드릴다운 (Zero-Computation)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 border-collapse">
              <thead className="bg-slate-50 text-slate-500 uppercase font-medium border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 rounded-tl-2xl">대분류</th>
                  <th className="px-4 py-3">영업장</th>
                  <th className="px-4 py-3">세부 그룹</th>
                  <th className="px-4 py-3 text-right">매출액</th>
                  <th className="px-4 py-3 text-right rounded-tr-2xl">비중</th>
                </tr>
              </thead>
              <tbody>
                {hierarchyDrilldown.map((row: any, i: number) => {
                  const span = rowSpans.get(i);
                  return (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      {span?.deptSpan! > 0 && (
                        <td className="px-4 py-4 font-bold text-slate-800 align-top border-r border-slate-100" rowSpan={span?.deptSpan}>
                          {row.deptName}
                        </td>
                      )}
                      {span?.shopSpan! > 0 && (
                        <td className="px-4 py-4 font-medium text-slate-700 align-top border-r border-slate-100" rowSpan={span?.shopSpan}>
                          {row.shopName}
                        </td>
                      )}
                      <td className="px-4 py-3 text-slate-500">{row.ticketGroup}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800">{row.revenueFormatted}</td>
                      <td className="px-4 py-3 text-right text-brand-mint font-bold">{row.sharePctFormatted}</td>
                    </tr>
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
