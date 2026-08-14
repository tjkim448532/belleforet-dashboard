import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { Coins } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28DFF', '#FF6B6B', '#4ECDC4'];

const formatCurrency = (val: number) => {
  const rounded = Math.round(val || 0);
  return new Intl.NumberFormat('ko-KR').format(rounded);
};

interface SalesPieChartProps {
  data: { name: string; value: number }[];
}

export default function SalesPieChart({ data }: SalesPieChartProps) {
  if (!data || data.length === 0) return null;

  return (
    <div className="lg:col-span-12 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <h3 className="text-lg font-medium text-slate-800 mb-6 flex items-center gap-2">
        <Coins className="w-5 h-5 text-brand-mint" />
        그룹별 매출 비중
      </h3>
      <div className="flex flex-col md:flex-row items-center justify-center gap-8">
        <div className="w-full md:w-1/2 h-[300px]">
          <PieChart width={300} height={300}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={100}
              innerRadius={60}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: any) => [`${formatCurrency(value)}원`, '매출액']}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        </div>
        <div className="w-full md:w-1/2 grid grid-cols-2 gap-4">
          {data.map((item, index) => (
            <div key={item.name} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-sm font-medium text-slate-700">{item.name}</span>
              </div>
              <div className="text-lg font-bold text-slate-800">
                {formatCurrency(item.value)} <span className="text-xs text-slate-500 font-normal">원</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
