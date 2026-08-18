import { Ticket, Utensils, TrendingUp } from 'lucide-react';
import type { StoreCorrelationItem } from './types';
import { ComposedChart, Area, Line, ResponsiveContainer, Tooltip as RechartsTooltip, YAxis } from 'recharts';

const formatCurrency = (val: any) => {
  if (!val) return '0';
  const num = typeof val === 'string' ? Number(val.replace(/,/g, '')) : Number(val);
  return isNaN(num) ? '0' : new Intl.NumberFormat('ko-KR').format(Math.round(num));
};

interface SynergyStoreCardProps {
  store: StoreCorrelationItem & { color?: string };
  type: 'leisure' | 'fnb';
}

export default function SynergyStoreCard({ store, type }: SynergyStoreCardProps) {
  const isLeisure = type === 'leisure';
  const Icon = isLeisure ? Ticket : Utensils;
  
  const theme = {
    highSynergyBg: isLeisure ? 'bg-purple-600' : 'bg-amber-600',
    coeffBox: isLeisure ? 'bg-purple-50/90 border-purple-200 text-purple-950' : 'bg-amber-50/90 border-amber-200 text-amber-950',
    coeffText: isLeisure ? 'text-purple-700' : 'text-amber-800',
    spilloverBox: isLeisure ? 'bg-purple-100/80 border-purple-200/60' : 'bg-amber-100/80 border-amber-200/60',
    spilloverTitle: isLeisure ? 'text-purple-900' : 'text-amber-900',
    spilloverSub: isLeisure ? 'text-purple-700' : 'text-amber-800',
    spilloverValue: isLeisure ? 'text-purple-900' : 'text-amber-950',
    revPasText: isLeisure ? 'text-indigo-700' : 'text-emerald-700',
  };

  const hasCrossMatch = store.calculationMethod !== 'UNTRACKABLE' && (store.spilloverRate || 0) > 0;

  return (
    <div className={`p-6 rounded-3xl border ${store.color || 'border-slate-200 bg-white'} transition-all shadow-sm hover:shadow-md flex flex-col justify-between`}>
      <div>
        {/* Card Header: Store Name + Badges */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <Icon size={20} className={isLeisure ? 'text-purple-600' : 'text-amber-600'} /> 
            {store.shopName}
          </h3>
          <div className="flex items-center gap-2">
            {store.interactionGrade && (
              <span className={`text-xs px-2.5 py-1 rounded-full font-bold shadow-xs ${
                store.interactionGrade === 'HIGH_SYNERGY' ? `${theme.highSynergyBg} text-white` :
                store.interactionGrade === 'MODERATE_SYNERGY' ? 'bg-indigo-600 text-white' : 'bg-slate-600 text-white'
              }`}>
                {store.interactionGrade === 'HIGH_SYNERGY' ? '강력 시너지' :
                 store.interactionGrade === 'MODERATE_SYNERGY' ? '일반 연계' : '독립 운영'}
              </span>
            )}
            {hasCrossMatch ? (
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-white border border-slate-200 text-slate-700 flex items-center gap-1">
                투숙객 비율 <strong className="text-slate-900 font-bold">{store.spilloverRate}%</strong>
                <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold">실측</span>
              </span>
            ) : (
              <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-slate-100 text-slate-500 border border-slate-200">
                연계 분석 대기
              </span>
            )}
          </div>
        </div>

        {/* Metric Rows */}
        <div className="space-y-2.5 text-xs">
          {/* Correlation Metric Box */}
          {store.correlationCoefficient !== undefined && (
            <div className={`flex justify-between items-center p-3 rounded-2xl border ${theme.coeffBox}`}>
              <span className="font-semibold text-xs text-slate-700">동반 매출 상관도</span>
              <span className={`font-black text-sm tabular-nums ${theme.coeffText}`}>
                {store.correlationCoefficient >= 0 ? `+${store.correlationCoefficient}` : store.correlationCoefficient}
                {store.liftValue !== undefined && (
                  <span className="ml-1.5 text-xs text-slate-600 font-normal">
                    (투숙객 이용 확률 <strong className="font-bold text-slate-900">{store.liftValue}배</strong>)
                  </span>
                )}
              </span>
            </div>
          )}

          {/* POS Store Total Sales */}
          <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <span className="text-slate-600 font-medium text-xs">영업장 실제 총매출</span>
            <span className="font-bold text-sm text-slate-900 tabular-nums">{formatCurrency(store.totalSales)}원</span>
          </div>

          {/* Connected Sales Box */}
          <div className={`p-3 rounded-2xl border ${theme.spilloverBox}`}>
            <div className="flex justify-between items-center">
              <div>
                <span className={`font-bold text-xs block ${theme.spilloverTitle}`}>객실 연계 파급 매출</span>
                {hasCrossMatch && store.reverseSpillover !== undefined ? (
                  <span className={`text-xs font-normal ${theme.spilloverSub}`}>
                    이용객 중 투숙객 {store.forwardSpillover ?? store.spilloverRate}% · 투숙객의 이용률 {store.reverseSpillover}%
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 font-normal">단일일자 또는 연계 결제 데이터 집계 중</span>
                )}
              </div>
              <span className={`font-black text-sm tabular-nums ${theme.spilloverValue}`}>
                {hasCrossMatch ? `${formatCurrency(store.correlatedSales)}원` : '데이터 연동 중'}
              </span>
            </div>
          </div>

          {/* ARPU Comparison Widget */}
          <div className="bg-slate-50/90 p-3 rounded-2xl border border-slate-100 flex flex-col gap-2 shadow-xs">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <TrendingUp size={14} className="text-slate-600" /> 1인당 평균 결제액 (객단가)
              </span>
              {store.apiMeta?.arpuLiftMultiplier ? (
                <span className="text-xs font-extrabold bg-teal-100 text-teal-900 px-2 py-0.5 rounded-md">
                  {store.apiMeta.arpuLiftMultiplier}배 지출 효과
                </span>
              ) : null}
            </div>
            
            <div className="flex justify-between items-center text-slate-600 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400"></span>일반 방문객</span>
              <span className="font-semibold text-slate-900 tabular-nums">
                {store.apiMeta?.singleFacilityArpu ? `${formatCurrency(store.apiMeta.singleFacilityArpu)}원` : '집계 대기'}
              </span>
            </div>
            <div className="flex justify-between items-center text-indigo-900 text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-indigo-700"><span className="w-2 h-2 rounded-full bg-indigo-500"></span>객실 투숙객</span>
              <span className="font-black text-indigo-950 tabular-nums">
                {store.apiMeta?.multiFacilityArpu ? `${formatCurrency(store.apiMeta.multiFacilityArpu)}원` : '집계 대기'}
              </span>
            </div>
          </div>

          {/* Bottom KPI: Visitors & RevPAS contribution */}
          <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs text-slate-600">
            <span>연계 {isLeisure ? '이용객수' : '방문객수'}: <strong className="text-slate-900 tabular-nums">{hasCrossMatch ? `${(store.correlatedVisitors || 0).toLocaleString()}명` : '-'}</strong></span>
            <span className={`font-bold ${theme.revPasText} tabular-nums`}>
              1실당 기여액: {hasCrossMatch && (store.revPasContribution || 0) > 0 ? `+${formatCurrency(store.revPasContribution || 0)}원/실` : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Lag Synergy Banner */}
      {store.calculationMethod === 'STATISTICAL_INFERENCE' && store.maxCorrelationLag === 1 && (
        <div className="mt-3 bg-indigo-50 border border-indigo-100 text-indigo-900 text-xs p-3 rounded-2xl flex items-start gap-2">
          <span className="text-sm">💡</span>
          <span className="leading-snug">
            <strong>체크인 다음 날(D+1) 소비 효과가 집중되는 매장입니다.</strong>
          </span>
        </div>
      )}

      {/* Chart Visualization */}
      {store.dailyTrends && store.dailyTrends.length > 0 && (
        <div className="h-20 mt-4 w-full bg-slate-50/70 rounded-2xl overflow-hidden border border-slate-100 p-1.5 relative">
          <div className="absolute top-1.5 left-2.5 text-[10px] font-bold text-slate-500 z-10">
            객실 판매 & 매출 추이
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={store.dailyTrends} margin={{ top: 14, right: 4, left: 4, bottom: 0 }}>
              <YAxis yAxisId="left" hide domain={['dataMin - 10', 'dataMax + 10']} />
              <YAxis yAxisId="right" hide domain={['dataMin - 100000', 'dataMax + 100000']} />
              <RechartsTooltip 
                contentStyle={{ fontSize: '11px', padding: '6px 10px', borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                labelStyle={{ display: 'none' }}
                itemStyle={{ padding: 0, margin: 0 }}
                formatter={(value, name) => [name === 'storeSales' ? formatCurrency(value as number) + '원' : value + '실', name === 'storeSales' ? '영업장 매출' : '객실 판매']}
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
