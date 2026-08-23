import { Ticket, Utensils, TrendingUp, Sparkles, Zap, ArrowUpRight } from 'lucide-react';
import type { StoreCorrelationItem } from './types';
import { ComposedChart, Area, Line, ResponsiveContainer, Tooltip as RechartsTooltip, YAxis } from 'recharts';

const formatCurrency = (val: any) => {
  if (!val) return '0';
  const num = typeof val === 'string' ? Number(val.replace(/,/g, '')) : Number(val);
  return isNaN(num) ? '0' : new Intl.NumberFormat('ko-KR').format(Math.round(num));
};

interface SynergyStoreCardProps {
  store: StoreCorrelationItem & { color?: string };
  type: 'leisure' | 'fnb' | 'golf' | 'motor';
  anchorName?: string;
}

export default function SynergyStoreCard({ store, type, anchorName = '객실' }: SynergyStoreCardProps) {
  const isLeisure = type === 'leisure';
  const isFnb = type === 'fnb';
  const Icon = isLeisure ? Ticket : Utensils;
  
  const coeff = store.correlationCoefficient ?? 0;
  const elasticity = store.elasticityPercent;
  const spillover = store.spilloverPerMillion;
  const grade = store.synergyGrade || (
    coeff >= 0.7 ? 'EXCELLENT' :
    coeff >= 0.4 ? 'HIGH' :
    coeff >= 0.2 ? 'MODERATE' : 'LOW'
  );

  const gradeBadge = (() => {
    switch (grade) {
      case 'EXCELLENT':
        return { text: '🚀 초강력 앵커결합', bg: 'bg-emerald-600 text-white' };
      case 'HIGH':
        return { text: '🔥 핵심 시너지', bg: 'bg-indigo-600 text-white' };
      case 'MODERATE':
        return { text: '🎯 일반 연계', bg: 'bg-purple-600 text-white' };
      case 'LOW':
      default:
        return { text: '⚪ 독립 운영', bg: 'bg-slate-600 text-white' };
    }
  })();

  return (
    <div className={`p-6 rounded-3xl border ${store.color || 'border-slate-200 bg-white'} transition-all shadow-sm hover:shadow-md flex flex-col justify-between`}>
      <div>
        {/* Card Header: Store Name + Grade Badge */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <Icon size={20} className={isLeisure ? 'text-purple-600' : isFnb ? 'text-amber-600' : 'text-emerald-600'} /> 
            {store.shopName || store.storeName}
          </h3>
          <span className={`text-xs px-2.5 py-1 rounded-full font-bold shadow-xs ${gradeBadge.bg}`}>
            {gradeBadge.text}
          </span>
        </div>

        {/* Metric Rows */}
        <div className="space-y-2.5 text-xs">
          {/* 1. Correlation Metric Box */}
          <div className="flex justify-between items-center p-3 rounded-2xl border bg-purple-50/90 border-purple-200 text-purple-950">
            <span className="font-semibold text-xs text-slate-700 flex items-center gap-1.5">
              <TrendingUp size={14} className="text-purple-600" /> 동반 매출 상관도 (r)
            </span>
            <span className="font-black text-sm tabular-nums text-purple-700">
              {coeff >= 0 ? `+${coeff.toFixed(3)}` : coeff.toFixed(3)}
            </span>
          </div>

          {/* 2. Elasticity Metric Box (NEW SSOT) */}
          {elasticity !== undefined && (
            <div className="flex justify-between items-center p-3 rounded-2xl border bg-indigo-50/90 border-indigo-200 text-indigo-950">
              <div>
                <span className="font-bold text-xs text-indigo-900 flex items-center gap-1">
                  <Zap size={14} className="text-indigo-600" /> {anchorName} 10% 증가 시
                </span>
                <span className="text-[11px] text-indigo-700 font-medium">동반 매출 탄력성</span>
              </div>
              <span className="font-black text-sm tabular-nums text-indigo-700">
                {elasticity >= 0 ? `+${elasticity}%` : `${elasticity}%`}
              </span>
            </div>
          )}

          {/* 3. Spillover per 1M KRW Box (NEW SSOT) */}
          {spillover !== undefined && (
            <div className="flex justify-between items-center p-3 rounded-2xl border bg-emerald-50/90 border-emerald-200 text-emerald-950">
              <div>
                <span className="font-bold text-xs text-emerald-900 flex items-center gap-1">
                  <ArrowUpRight size={14} className="text-emerald-600" /> {anchorName} 100만원 발생 시
                </span>
                <span className="text-[11px] text-emerald-700 font-medium">추가 낙수 부대매출</span>
              </div>
              <span className="font-black text-sm tabular-nums text-emerald-700">
                +₩ {formatCurrency(spillover)}원
              </span>
            </div>
          )}

          {/* 4. POS Store Total Sales */}
          <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <span className="text-slate-600 font-medium text-xs">영업장 실제 총매출</span>
            <span className="font-bold text-sm text-slate-900 tabular-nums">{formatCurrency(store.totalSales)}원</span>
          </div>

          {/* 5. Business Insight Pill */}
          {store.insight && (
            <div className="bg-slate-50/90 p-3 rounded-2xl border border-slate-200 flex items-start gap-2 text-slate-700 text-xs leading-relaxed font-medium">
              <Sparkles size={14} className="text-amber-500 shrink-0 mt-0.5" />
              <span>{store.insight}</span>
            </div>
          )}
        </div>
      </div>

      {/* Chart Visualization if available */}
      {store.dailyTrends && store.dailyTrends.length > 0 && (
        <div className="h-20 mt-4 w-full bg-slate-50/70 rounded-2xl overflow-hidden border border-slate-100 p-1.5 relative">
          <div className="absolute top-1.5 left-2.5 text-[10px] font-bold text-slate-500 z-10">
            {anchorName} & {store.shopName} 시계열 추이
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={store.dailyTrends} margin={{ top: 14, right: 4, left: 4, bottom: 0 }}>
              <YAxis yAxisId="left" hide domain={['dataMin - 10', 'dataMax + 10']} />
              <YAxis yAxisId="right" hide domain={['dataMin - 100000', 'dataMax + 100000']} />
              <RechartsTooltip 
                contentStyle={{ fontSize: '11px', padding: '6px 10px', borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                labelStyle={{ display: 'none' }}
                itemStyle={{ padding: 0, margin: 0 }}
                formatter={(value, name) => [name === 'storeSales' ? formatCurrency(value as number) + '원' : value + '실/원', name === 'storeSales' ? '영업장 매출' : `${anchorName} 실적`]}
              />
              <Area yAxisId="left" type="monotone" dataKey="roomsSold" fill="#cbd5e1" fillOpacity={0.4} stroke="none" />
              <Line yAxisId="right" type="monotone" dataKey="storeSales" stroke={isLeisure ? '#9333ea' : '#d97706'} strokeWidth={2.5} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

