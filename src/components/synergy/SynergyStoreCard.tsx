import { Ticket, Utensils, TrendingUp, Sparkles, Zap, ArrowUpRight, AlertTriangle, Clock, Gauge } from 'lucide-react';
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
  
  const rawCoeff = store.rawCorrelation ?? store.correlationCoefficient ?? 0;
  const pureCoeff = store.pureCorrelation ?? rawCoeff;
  const elasticity = store.pureElasticity ?? store.elasticityPercent;
  const spillover = store.pureSpilloverPerMillion ?? store.spilloverPerMillion;
  const isSpurious = store.isSpurious ?? false;
  
  const causalGrade = store.causalInferenceGrade || (
    isSpurious ? 'SPURIOUS' :
    pureCoeff >= 0.7 ? 'CONFIRMED_TEMPORAL_CAUSAL' :
    pureCoeff >= 0.3 ? 'CONTEMPORANEOUS_CORRELATION' : 'SPURIOUS'
  );

  const gradeBadge = (() => {
    switch (causalGrade) {
      case 'CONFIRMED_TEMPORAL_CAUSAL':
        return { text: '🎯 선행 인과 확실', bg: 'bg-emerald-100 text-emerald-800 border border-emerald-300' };
      case 'CONTEMPORANEOUS_CORRELATION':
        return { text: '🔗 당일 동시 연관', bg: 'bg-blue-100 text-blue-800 border border-blue-300' };
      case 'SPURIOUS':
      default:
        return { text: '💨 외생 요인 (비유의)', bg: 'bg-gray-100 text-gray-700 border border-gray-300' };
    }
  })();

  const displayName = store.shopName || store.storeName || '';
  const bottleneckRisk = store.bottleneckRisk;
  const capaUtil = store.currentCapacityUtilization;
  const timeLag = store.timeLagDistribution;

  return (
    <div className={`p-6 rounded-3xl border ${store.color || 'border-slate-200 bg-white'} transition-all shadow-sm hover:shadow-md flex flex-col justify-between overflow-hidden relative`}>
      {isSpurious && (
        <div className="mb-3 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-bold flex items-center gap-1.5">
          <AlertTriangle size={13} className="text-rose-600 shrink-0" />
          <span>외생변수(주말/날씨) 착시 주의 — 순수인과 약함</span>
        </div>
      )}

      <div>
        {/* Card Header: Store Name + Grade Badge */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2 min-w-0" title={displayName}>
            <Icon size={20} className={`shrink-0 ${isLeisure ? 'text-purple-600' : isFnb ? 'text-amber-600' : 'text-emerald-600'}`} /> 
            <span className="truncate">{displayName}</span>
          </h3>
          <span className={`text-[11px] sm:text-xs px-2.5 py-1 rounded-full font-bold shadow-xs whitespace-nowrap shrink-0 ${gradeBadge.bg}`}>
            {gradeBadge.text}
          </span>
        </div>

        {/* Metric Rows */}
        <div className="space-y-2.5 text-xs">
          {/* 1. True Net Correlation Metric Box */}
          <div className="flex justify-between items-center p-3 rounded-2xl border bg-purple-50/90 border-purple-200 text-purple-950 gap-2">
            <div className="min-w-0">
              <span className="font-semibold text-xs text-slate-700 flex items-center gap-1.5 min-w-0">
                <TrendingUp size={14} className="text-purple-600 shrink-0" /> 
                <span className="truncate font-bold">순수 인과 상관계수 (r)</span>
              </span>
              {store.rawCorrelation !== undefined && store.pureCorrelation !== undefined && (
                <span className="text-[10px] text-slate-500 block truncate">
                  원시 {rawCoeff.toFixed(2)} ➔ 외생통제 {pureCoeff.toFixed(2)}
                </span>
              )}
            </div>
            <span className="font-black text-sm tabular-nums text-purple-700 whitespace-nowrap shrink-0">
              {pureCoeff >= 0 ? `+${pureCoeff.toFixed(3)}` : pureCoeff.toFixed(3)}
            </span>
          </div>

          {/* 2. Pure Elasticity Metric Box */}
          {elasticity !== undefined && (
            <div className="flex justify-between items-center p-3 rounded-2xl border bg-indigo-50/90 border-indigo-200 text-indigo-950 gap-2">
              <div className="min-w-0">
                <span className="font-bold text-xs text-indigo-900 flex items-center gap-1 truncate">
                  <Zap size={14} className="text-indigo-600 shrink-0" /> {anchorName} 10% 증가 시
                </span>
                <span className="text-[11px] text-indigo-700 font-medium block truncate">순수 매출 탄력성</span>
              </div>
              <span className="font-black text-sm tabular-nums text-indigo-700 whitespace-nowrap shrink-0">
                {elasticity >= 0 ? `+${elasticity}%` : `${elasticity}%`}
              </span>
            </div>
          )}

          {/* 3. Pure Spillover per 1M KRW Box */}
          {spillover !== undefined && (
            <div className="flex justify-between items-center p-3 rounded-2xl border bg-emerald-50/90 border-emerald-200 text-emerald-950 gap-2">
              <div className="min-w-0">
                <span className="font-bold text-xs text-emerald-900 flex items-center gap-1 truncate">
                  <ArrowUpRight size={14} className="text-emerald-600 shrink-0" /> {anchorName} 100만원 유치 시
                </span>
                <span className="text-[11px] text-emerald-700 font-medium block truncate">순수 낙수 부대매출</span>
              </div>
              <span className="font-black text-sm tabular-nums text-emerald-700 whitespace-nowrap shrink-0">
                +₩ {formatCurrency(spillover)}원
              </span>
            </div>
          )}

          {/* 4. CAPA & Bottleneck Indicator (If available) */}
          {bottleneckRisk && (
            <div className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2 ${
              bottleneckRisk === 'CRITICAL' 
                ? 'bg-rose-50 border-rose-200 text-rose-900' 
                : bottleneckRisk === 'WARNING' 
                ? 'bg-amber-50 border-amber-200 text-amber-900' 
                : 'bg-teal-50 border-teal-200 text-teal-900'
            }`}>
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <Gauge size={14} />
                <span>CAPA 점유율: {capaUtil || 0}%</span>
              </div>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                bottleneckRisk === 'CRITICAL' ? 'bg-rose-600 text-white' : bottleneckRisk === 'WARNING' ? 'bg-amber-500 text-white' : 'bg-teal-600 text-white'
              }`}>
                {bottleneckRisk === 'CRITICAL' ? '🚨 병목 임계 도달' : bottleneckRisk === 'WARNING' ? '⚠️ 주의 단계' : '✅ 수용 여유'}
              </span>
            </div>
          )}

          {/* 5. Time-Lag (t0 vs t1) if available */}
          {timeLag && (
            <div className="p-2.5 rounded-2xl border bg-slate-50 border-slate-200 flex items-center justify-between text-xs text-slate-700">
              <span className="flex items-center gap-1 font-semibold">
                <Clock size={13} className="text-slate-500" /> 소비 시점:
              </span>
              <div className="flex items-center gap-2 font-bold">
                <span className="text-indigo-700">당일 {timeLag.sameDayRatio}%</span>
                <span className="text-slate-300">|</span>
                <span className="text-teal-700">익일 {timeLag.nextDayRatio}%</span>
              </div>
            </div>
          )}

          {/* 6. AI Strategy Insight */}
          {(store.aiStrategyInsight || store.insight) && (
            <div className="bg-indigo-50/70 p-3 rounded-2xl border border-indigo-100 flex items-start gap-2 text-indigo-950 text-xs leading-relaxed font-medium break-keep">
              <Sparkles size={14} className="text-amber-500 shrink-0 mt-0.5" />
              <span className="leading-snug">{store.aiStrategyInsight || store.insight}</span>
            </div>
          )}
        </div>
      </div>

      {/* Chart Visualization if available */}
      {store.dailyTrends && store.dailyTrends.length > 0 && (
        <div className="h-20 mt-4 w-full bg-slate-50/70 rounded-2xl overflow-hidden border border-slate-100 p-1.5 relative">
          <div className="absolute top-1.5 left-2.5 text-[10px] font-bold text-slate-500 z-10 truncate max-w-[80%]">
            {anchorName} & {displayName} 시계열 추이
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


