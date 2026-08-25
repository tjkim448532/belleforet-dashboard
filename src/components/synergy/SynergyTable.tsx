import type { StoreCorrelationItem } from './types';

const formatCurrency = (val: any) => {
  if (!val) return '0';
  const num = typeof val === 'string' ? Number(val.replace(/,/g, '')) : Number(val);
  return isNaN(num) ? '0' : new Intl.NumberFormat('ko-KR').format(Math.round(num));
};

interface SynergyTableProps {
  type: 'leisure' | 'fnb' | 'golf' | 'motor';
  correlationRows?: StoreCorrelationItem[];
  stores: StoreCorrelationItem[];
}

export default function SynergyTable({ type, correlationRows = [], stores }: SynergyTableProps) {
  const isLeisure = type === 'leisure';
  const label = isLeisure ? '레저 영업장' : type === 'fnb' ? '식음 영업장' : '부대 영업장';
  
  const theme = {
    hoverBg: isLeisure ? 'hover:bg-purple-50/30' : 'hover:bg-amber-50/30',
    badgeBg: isLeisure ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800',
    salesText: isLeisure ? 'text-purple-700' : 'text-amber-700',
    rateText: isLeisure ? 'text-indigo-600' : 'text-emerald-600',
  };

  const displayList = correlationRows.length > 0 ? correlationRows : stores;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">
            <th className="py-3.5 px-6 rounded-l-xl">{label}</th>
            <th className="py-3.5 px-6">영업장 관할 구분</th>
            <th className="py-3.5 px-6 text-right">영업장 총매출 (POS)</th>
            <th className="py-3.5 px-6 text-center">순수 인과 상관계수 (r)</th>
            <th className="py-3.5 px-6 text-center">순수 탄력성 (+10%)</th>
            <th className="py-3.5 px-6 text-right">100만원당 순수 낙수액</th>
            <th className="py-3.5 px-6 text-center">CAPA 점유/병목</th>
            <th className="py-3.5 px-6 text-center rounded-r-xl">인과 신뢰도</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {displayList.map((item, idx) => {
            const rawCoeff = item.rawCorrelation ?? item.correlationCoefficient ?? 0;
            const pureCoeff = item.pureCorrelation ?? rawCoeff;
            const elasticity = item.pureElasticity ?? item.elasticityPercent;
            const spillover = item.pureSpilloverPerMillion ?? item.spilloverPerMillion;
            const isSpurious = item.isSpurious ?? false;
            const capaUtil = item.currentCapacityUtilization;
            const bottleneck = item.bottleneckRisk;

            const causalGrade = item.causalInferenceGrade || (
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

            return (
              <tr key={idx} className={`${theme.hoverBg} transition-colors`}>
                <td className="py-4 px-6 font-semibold text-slate-800">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`${theme.badgeBg} px-2.5 py-1 rounded-full text-xs font-medium`}>
                      {item.shopName || item.storeName || item.targetShopName}
                    </span>
                    {isSpurious && (
                      <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded font-bold" title="외생변수(요일/날씨)를 통제하면 실제 인과성이 매우 낮습니다.">
                        착시 필터링
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-4 px-6 text-slate-600 font-medium text-xs">
                  {item.divisionName || item.categoryName || '직영 시설'}
                </td>
                <td className="py-4 px-6 text-right font-bold text-slate-900 tabular-nums">
                  ₩{formatCurrency(item.totalRevenue || item.totalSales)}
                </td>
                <td className="py-4 px-6 text-center font-extrabold text-purple-700 tabular-nums">
                  <div>{pureCoeff >= 0 ? `+${pureCoeff.toFixed(3)}` : pureCoeff.toFixed(3)}</div>
                  {item.rawCorrelation !== undefined && (
                    <div className="text-[10px] text-slate-400 font-normal">원시 {rawCoeff.toFixed(2)}</div>
                  )}
                </td>
                <td className="py-4 px-6 text-center font-bold text-indigo-700 tabular-nums">
                  {elasticity !== undefined ? (elasticity >= 0 ? `+${elasticity.toFixed(1)}%` : `${elasticity.toFixed(1)}%`) : '-'}
                </td>
                <td className="py-4 px-6 text-right font-black text-blue-700 tabular-nums">
                  {spillover !== undefined && spillover > 0 ? `+₩${formatCurrency(spillover)} / 100만` : '-'}
                </td>
                <td className="py-4 px-6 text-center">
                  {bottleneck ? (
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      bottleneck === 'CRITICAL' ? 'bg-rose-100 text-rose-800' : bottleneck === 'WARNING' ? 'bg-amber-100 text-amber-800' : 'bg-teal-100 text-teal-800'
                    }`}>
                      {capaUtil ? `${capaUtil}% ` : ''}({bottleneck})
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs">-</span>
                  )}
                </td>
                <td className="py-4 px-6 text-center">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${gradeBadge.bg}`}>
                    {gradeBadge.text}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

