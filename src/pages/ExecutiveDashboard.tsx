import { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useCoreData } from '../contexts/CoreDataContext';
import { transformExecutiveData } from '../lib/dataTransformers';

export default function ExecutiveDashboard() {
  const [targetDate, setTargetDate] = useState('2026-06-23');
  const coreData = useCoreData();

  const transformed = useMemo(() => {
    if (coreData.isLoading || coreData.error) return null;
    return transformExecutiveData(coreData);
  }, [coreData]);

  const kpiData = transformed?.kpiData || null;
  const revenueData = transformed?.revenueData || null;

  if (coreData.isLoading) {
    return (
      <div className="flex h-[calc(100vh-100px)] items-center justify-center p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  // Format currency
  const formatKRW = (val: number) => new Intl.NumberFormat('ko-KR').format(val || 0);

  // Echarts Options: Pie Chart for Dept Revenue
  const pieOptions = {
    tooltip: { trigger: 'item', formatter: '{b}: {c}원 ({d}%)' },
    legend: { top: '5%', left: 'center', textStyle: { color: '#cbd5e1' } },
    series: [
      {
        name: '매출 구분별 실적',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#1e293b',
          borderWidth: 2
        },
        label: { show: false, position: 'center' },
        emphasis: {
          label: { show: true, fontSize: 20, fontWeight: 'bold', color: '#fff' }
        },
        labelLine: { show: false },
        data: revenueData?.summary?.map((r: any) => ({
          value: parseInt(r.total_sales, 10),
          name: r.depth_1_category
        })) || []
      }
    ],
    color: ['#38bdf8', '#818cf8', '#34d399', '#fbbf24', '#f87171']
  };

  // Echarts Options: Bar Chart for Shop details
  const shopData = revenueData?.details || [];
  const barOptions = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { 
      type: 'value', 
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
      axisLabel: { color: '#94a3b8' }
    },
    yAxis: { 
      type: 'category', 
      data: shopData.map((r: any) => r.depth_2_shop).reverse(),
      axisLabel: { color: '#cbd5e1' }
    },
    series: [
      {
        name: '업장별 매출',
        type: 'bar',
        itemStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [{ offset: 0, color: '#38bdf8' }, { offset: 1, color: '#818cf8' }]
          },
          borderRadius: [0, 4, 4, 0]
        },
        data: shopData.map((r: any) => parseInt(r.total_sales, 10)).reverse()
      }
    ]
  };

  return (
    <div className="p-6 lg:p-10 space-y-6 bg-slate-900 min-h-[calc(100vh-64px)] lg:min-h-screen text-slate-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold font-emphatic tracking-wide text-white">경영진 대시보드 (V3)</h2>
        <input 
          type="date" 
          value={targetDate} 
          onChange={(e) => setTargetDate(e.target.value)}
          className="glass-card px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500 bg-slate-800 text-slate-100 border border-slate-700"
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-6 border border-slate-700">
          <p className="text-sm text-slate-400 font-medium mb-1">총매출 (Total Revenue)</p>
          <h3 className="text-2xl font-bold text-slate-100">{formatKRW(kpiData?.total_revenue_today)} 원</h3>
          <p className={`text-xs mt-2 font-medium ${kpiData?.dod_growth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {kpiData?.dod_growth >= 0 ? '▲' : '▼'} {Math.abs(kpiData?.dod_growth || 0).toFixed(1)}% (전일 대비)
          </p>
        </div>
        
        <div className="glass-card p-6 border border-slate-700">
          <p className="text-sm text-slate-400 font-medium mb-1">객실 판매 (Rooms Sold)</p>
          <h3 className="text-2xl font-bold text-slate-100">{formatKRW(kpiData?.rooms_sold)} Room</h3>
          <p className="text-xs mt-2 text-sky-400 font-medium">객실 가동률(Occ) 핵심 지표</p>
        </div>

        <div className="glass-card p-6 border border-slate-700">
          <p className="text-sm text-slate-400 font-medium mb-1">골프 내장객 (Golf Players)</p>
          <h3 className="text-2xl font-bold text-slate-100">{formatKRW(kpiData?.golf_visited_players)} 명</h3>
          <p className="text-xs mt-2 text-sky-400 font-medium">
            ({formatKRW(kpiData?.golf_visited_teams)} 팀 방문)
          </p>
        </div>

        <div className="glass-card p-6 bg-gradient-to-br from-indigo-900/50 to-sky-900/50 border border-sky-500/30">
          <p className="text-sm text-sky-200 font-medium mb-1">연간 실적 달성률 (YTD Goal)</p>
          <h3 className="text-2xl font-bold text-white">49.4 %</h3>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3">
            <div className="bg-gradient-to-r from-sky-400 to-indigo-500 h-1.5 rounded-full" style={{ width: '49.4%' }}></div>
          </div>
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-6 h-[400px] border border-slate-700">
          <h3 className="text-lg font-semibold mb-4 border-b border-slate-700/50 pb-2">부서별 매출 비중 (Category Breakdown)</h3>
          <div className="h-[300px] w-full">
            <ReactECharts option={pieOptions} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>

        <div className="glass-panel p-6 h-[400px] border border-slate-700">
          <h3 className="text-lg font-semibold mb-4 border-b border-slate-700/50 pb-2">업장별 상세 실적 (Shop Performance)</h3>
          <div className="h-[300px] w-full overflow-y-auto">
            <ReactECharts option={barOptions} style={{ height: Math.max(300, shopData.length * 30) + 'px', width: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
