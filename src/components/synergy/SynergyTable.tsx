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
            <th className="py-3.5 px-6 text-center">동반 상관도 (r)</th>
            <th className="py-3.5 px-6 text-center">10% 증가 시 탄력성</th>
            <th className="py-3.5 px-6 text-right">100만원당 낙수 파급액</th>
            <th className="py-3.5 px-6 text-center rounded-r-xl">시너지 평가</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {displayList.map((item, idx) => {
            const coeff = item.correlationCoefficient ?? 0;
            const elasticity = item.elasticityPercent;
            const spillover = item.spilloverPerMillion;
            const grade = item.synergyGrade || (
              coeff >= 0.7 ? 'EXCELLENT' :
              coeff >= 0.4 ? 'HIGH' :
              coeff >= 0.2 ? 'MODERATE' : 'LOW'
            );

            const gradeBadge = (() => {
              switch (grade) {
                case 'EXCELLENT':
                  return { text: '초강력 앵커결합', bg: 'bg-emerald-100 text-emerald-800' };
                case 'HIGH':
                  return { text: '핵심 시너지', bg: 'bg-indigo-100 text-indigo-800' };
                case 'MODERATE':
                  return { text: '일반 연계', bg: 'bg-purple-100 text-purple-800' };
                case 'LOW':
                default:
                  return { text: '독립 운영', bg: 'bg-slate-100 text-slate-700' };
              }
            })();

            return (
              <tr key={idx} className={`${theme.hoverBg} transition-colors`}>
                <td className="py-4 px-6 font-semibold text-slate-800">
                  <span className={`${theme.badgeBg} px-2.5 py-1 rounded-full text-xs font-medium`}>
                    {item.shopName || item.storeName}
                  </span>
                </td>
                <td className="py-4 px-6 text-slate-600 font-medium text-xs">
                  {item.divisionName || '직영 시설'}
                </td>
                <td className="py-4 px-6 text-right font-bold text-slate-900 tabular-nums">
                  {formatCurrency(item.totalSales)}원
                </td>
                <td className="py-4 px-6 text-center font-extrabold text-purple-700 tabular-nums">
                  {coeff >= 0 ? `+${coeff.toFixed(3)}` : coeff.toFixed(3)}
                </td>
                <td className="py-4 px-6 text-center font-bold text-indigo-700 tabular-nums">
                  {elasticity !== undefined ? (elasticity >= 0 ? `+${elasticity}%` : `${elasticity}%`) : '-'}
                </td>
                <td className="py-4 px-6 text-right font-black text-emerald-700 tabular-nums">
                  {spillover !== undefined && spillover > 0 ? `+₩ ${formatCurrency(spillover)}원` : '-'}
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

