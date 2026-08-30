import ReactECharts from 'echarts-for-react';
import { PieChart as PieIcon, TrendingUp } from 'lucide-react';

interface SalesPieChartProps {
  data: { name: string; value: number }[];
  totalValue?: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  '객실': '#1E3A8A',
  '식음': '#0D9488',
  '레저': '#D97706',
  '모토아레나': '#E11D48',
  '연회대관': '#0891B2',
  '골프': '#7C3AED',
  '기타': '#64748B',
  'ROOM': '#1E3A8A',
  'FNB': '#0D9488',
  'TICKET': '#D97706',
  'MOTO': '#E11D48',
  'BANQUET': '#0891B2',
  'GOLF': '#7C3AED',
  'OTHER': '#64748B'
};

const DEFAULT_PALETTE = ['#1E3A8A', '#0D9488', '#D97706', '#E11D48', '#0891B2', '#7C3AED', '#64748B', '#0284C7', '#10B981'];

export default function SalesPieChart({ data, totalValue }: SalesPieChartProps) {
  if (!data || data.length === 0) return null;

  const resolvedTotal = totalValue !== undefined && totalValue > 0 
    ? totalValue 
    : data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

  const formatCurrency = (val: any) => {
    if (!val) return '0';
    const num = typeof val === 'string' ? Number(val.replace(/,/g, '')) : Number(val);
    return isNaN(num) ? '0' : new Intl.NumberFormat('ko-KR').format(Math.round(num));
  };

  const chartData = data.map((item, idx) => {
    const color = CATEGORY_COLORS[item.name] || DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length];
    const pct = resolvedTotal > 0 ? Number(((item.value / resolvedTotal) * 100).toFixed(1)) : 0;
    return {
      name: item.name,
      value: item.value,
      pct,
      itemStyle: { color, borderRadius: 6, borderColor: '#ffffff', borderWidth: 2 }
    };
  });

  const chartOption = {
    tooltip: {
      trigger: 'item',
      backgroundColor: '#ffffff',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      padding: [10, 14],
      extraCssText: 'box-shadow: 0 4px 16px rgba(0,0,0,0.08); border-radius: 12px;',
      textStyle: { color: '#0f172a', fontFamily: 'Pretendard, sans-serif' },
      formatter: (params: any) => {
        const pct = resolvedTotal > 0 ? ((params.value / resolvedTotal) * 100).toFixed(1) : '0';
        return `
          <div style="font-weight:700; font-size:13px; color:#0f172a; margin-bottom:4px; display:flex; align-items:center; gap:6px;">
            <span style="width:8px; height:8px; border-radius:50%; background:${params.color}; display:inline-block;"></span>
            ${params.name}
          </div>
          <div style="font-size:12px; color:#64748b;">매출액: <strong style="color:#0f172a;">${formatCurrency(params.value)}원</strong></div>
          <div style="font-size:12px; color:#64748b;">전체 비중: <strong style="color:#0d9488;">${pct}%</strong></div>
        `;
      }
    },
    legend: {
      show: false
    },
    series: [
      {
        name: '매출 비중',
        type: 'pie',
        radius: ['58%', '82%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        label: {
          show: false
        },
        emphasis: {
          scale: true,
          scaleSize: 8,
          label: {
            show: true,
            formatter: '{b}\n{d}%',
            fontSize: 13,
            fontWeight: 'bold',
            color: '#0f172a'
          }
        },
        data: chartData
      }
    ]
  };

  return (
    <div className="lg:col-span-12 bg-white p-7 rounded-[32px] border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="flex items-center justify-between pb-5 border-b border-slate-100 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-2xl border border-indigo-100">
            <PieIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              사업 부문별 총매출 기여 비중
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              전체 총매출(₩{formatCurrency(resolvedTotal)}원)에 대한 각 사업 부문의 실질 기여도입니다.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700">
          <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
          <span>총 {data.length}개 부문 집계</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left: Donut Chart with Center Total */}
        <div className="lg:col-span-5 relative flex items-center justify-center min-h-[300px]">
          <ReactECharts option={chartOption} style={{ height: '300px', width: '100%' }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Sales</span>
            <span className="text-lg font-black text-slate-900 tracking-tight mt-0.5">
              ₩{formatCurrency(resolvedTotal)}
            </span>
          </div>
        </div>

        {/* Right: Modern Segment Cards with Progress Bars */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {chartData.map((item) => (
            <div 
              key={item.name} 
              className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/70 hover:bg-white hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.itemStyle.color }} />
                  <span className="text-xs font-bold text-slate-800">{item.name}</span>
                </div>
                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 tabular-nums">
                  {item.pct}%
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-slate-200/70 h-1.5 rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full rounded-full transition-all duration-700" 
                  style={{ width: `${item.pct}%`, backgroundColor: item.itemStyle.color }}
                />
              </div>

              <div className="text-right text-sm font-black text-slate-900 tabular-nums">
                ₩{formatCurrency(item.value)} <span className="text-[11px] font-normal text-slate-400">원</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
