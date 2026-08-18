import { Ticket, Utensils } from 'lucide-react';
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
    coeffBox: isLeisure ? 'bg-purple-50/80 border-purple-200 text-purple-900' : 'bg-amber-50/80 border-amber-200 text-amber-900',
    coeffText: isLeisure ? 'text-purple-700' : 'text-amber-800',
    spilloverBox: isLeisure ? 'bg-purple-100/70' : 'bg-amber-100/70',
    spilloverTitle: isLeisure ? 'text-purple-800' : 'text-amber-800',
    spilloverSub: isLeisure ? 'text-purple-600' : 'text-amber-700',
    spilloverValue: isLeisure ? 'text-purple-900' : 'text-amber-900',
    revPasText: isLeisure ? 'text-indigo-700' : 'text-emerald-700',
  };

  return (
    <div className={`p-5 rounded-2xl border ${store.color} transition-all shadow-sm hover:shadow-md`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-base flex items-center gap-2">
          <Icon size={18} /> {store.shopName}
        </h3>
        <div className="flex items-center gap-1.5">
          {store.interactionGrade && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shadow-xs ${
              store.interactionGrade === 'HIGH_SYNERGY' ? `${theme.highSynergyBg} text-white` :
              store.interactionGrade === 'MODERATE_SYNERGY' ? 'bg-indigo-500 text-white' : 'bg-slate-500 text-white'
            }`}>
              {store.interactionGrade === 'HIGH_SYNERGY' ? '강력 시너지' :
               store.interactionGrade === 'MODERATE_SYNERGY' ? '중립 시너지' : '독립 영업장'}
            </span>
          )}
          {store.calculationMethod !== 'UNTRACKABLE' && (store.spilloverRate || 0) > 0 ? (
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-white/80 border border-slate-200">
              숙박객 비율 {store.spilloverRate}%
              {store.calculationMethod === 'HARD_FACT_MATCHING' && <span className="ml-1 text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">결제 건수 기반 실측</span>}
              {store.calculationMethod === 'STATISTICAL_INFERENCE' && <span className="ml-1 text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">통계적 추정치</span>}
            </span>
          ) : (
            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-500 border border-slate-200">
              연계 분석 대기
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2 text-xs">
        {store.correlationCoefficient !== undefined && (
          <div className={`flex justify-between items-center p-2 rounded-xl border ${theme.coeffBox}`}>
            <span className="font-semibold">시계열 상관계수 (r)</span>
            <span className={`font-extrabold ${theme.coeffText}`}>
              {store.correlationCoefficient >= 0 ? `+${store.correlationCoefficient}` : store.correlationCoefficient}
              {store.liftValue !== undefined && <span className="ml-1 text-slate-500 font-normal"> (Lift <strong>{store.liftValue}x</strong>)</span>}
            </span>
          </div>
        )}

        <div className="flex justify-between items-center bg-white/60 p-2 rounded-xl">
          <span className="text-slate-500 font-medium">영업장 총 매출</span>
          <span className="font-bold text-slate-800">{formatCurrency(store.totalSales)}원</span>
        </div>

        <div className={`flex justify-between items-center p-2 rounded-xl ${theme.spilloverBox}`}>
          <div>
            <span className={`font-semibold block ${theme.spilloverTitle}`}>객실 연계 파급매출</span>
            {store.calculationMethod !== 'UNTRACKABLE' && (store.spilloverRate || 0) > 0 && store.reverseSpillover !== undefined && (
              <span className={`text-[10px] font-medium ${theme.spilloverSub}`}>
                이용객 중 숙박객 {store.forwardSpillover ?? store.spilloverRate}% | 전체 숙박객의 이용률 {store.reverseSpillover}%
              </span>
            )}
            {(store.calculationMethod === 'UNTRACKABLE' || (store.spilloverRate || 0) <= 0) && (
              <span className="text-[10px] text-slate-500 font-medium">단일일자 또는 연계 식별 데이터 수집 중</span>
            )}
          </div>
          <span className={`font-bold ${theme.spilloverValue}`}>
            {store.calculationMethod !== 'UNTRACKABLE' && (store.spilloverRate || 0) > 0 ? `${formatCurrency(store.correlatedSales)}원` : '데이터 연동 중'}
          </span>
        </div>

        {/* 💡 [NEW] ARPU (객단가) 비교 위젯 */}
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex flex-col gap-1.5 mt-2 shadow-sm">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] font-bold text-slate-700">ARPU 비교 (객단가)</span>
            {store.apiMeta?.arpuLiftMultiplier ? (
              <span className="text-[10px] font-extrabold bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded-md">
                {store.apiMeta.arpuLiftMultiplier}x 파급 효과
              </span>
            ) : null}
          </div>
          
          <div className="flex justify-between items-center text-slate-600">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>단일 이용객</span>
            <span className="font-medium">
              {store.apiMeta?.singleFacilityArpu ? `${formatCurrency(store.apiMeta.singleFacilityArpu)}원` : '데이터 없음'}
            </span>
          </div>
          <div className="flex justify-between items-center text-indigo-700">
            <span className="flex items-center gap-1 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>다중(숙박) 이용객</span>
            <span className="font-bold">
              {store.apiMeta?.multiFacilityArpu ? `${formatCurrency(store.apiMeta.multiFacilityArpu)}원` : '데이터 없음'}
            </span>
          </div>
          {(!store.apiMeta || store.apiMeta.singleFacilityArpu === null) && (
             <div className="text-[9px] text-slate-400 mt-1 italic">
               POS 연동 한계로 개별 유저 추적이 불가능합니다.
             </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-1 text-slate-600">
          <span>연계 {isLeisure ? '이용객수' : '고객수'}: <strong>{store.calculationMethod !== 'UNTRACKABLE' && (store.correlatedVisitors || 0) > 0 ? `${(store.correlatedVisitors || 0).toLocaleString()}명` : '-'}</strong></span>
          <span className={`font-semibold ${theme.revPasText}`}>1실당 기여액: {store.calculationMethod !== 'UNTRACKABLE' && (store.revPasContribution || 0) > 0 ? `+${formatCurrency(store.revPasContribution || 0)}원` : '-'}</span>
        </div>
      </div>
      
      {store.calculationMethod === 'STATISTICAL_INFERENCE' && store.maxCorrelationLag === 1 && (
        <div className="mt-3 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] p-2 rounded-xl flex items-start gap-1.5">
          <span className="text-xs">💡</span>
          <span><strong>체크인 다음 날 시너지 효과(매출)가 두드러지는 매장입니다.</strong> <br/><span className="text-indigo-500">(Lag+1 상관계수: {store.correlationCoefficientLag1})</span></span>
        </div>
      )}

      {store.dailyTrends && store.dailyTrends.length > 0 && (
        <div className="h-[72px] mt-3 w-full bg-slate-50/50 rounded-xl overflow-hidden border border-slate-100 p-1 relative shadow-inner">
          <div className="absolute top-1 left-2 text-[9px] font-semibold text-slate-400 z-10 flex items-center gap-1">
            <span>객실&매출 추이</span>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={store.dailyTrends} margin={{ top: 12, right: 0, left: 0, bottom: 0 }}>
              <YAxis yAxisId="left" hide domain={['dataMin - 10', 'dataMax + 10']} />
              <YAxis yAxisId="right" hide domain={['dataMin - 100000', 'dataMax + 100000']} />
              <RechartsTooltip 
                contentStyle={{ fontSize: '10px', padding: '6px 10px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                labelStyle={{ display: 'none' }}
                itemStyle={{ padding: 0, margin: 0 }}
                formatter={(value, name) => [name === 'storeSales' ? formatCurrency(value as number) + '원' : value + '객실', name === 'storeSales' ? '매출' : '객실 판매']}
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
