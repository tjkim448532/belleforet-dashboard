import type { StoreCorrelationItem } from './types';

const formatCurrency = (val: any) => {
  if (!val) return '0';
  const num = typeof val === 'string' ? Number(val.replace(/,/g, '')) : Number(val);
  return isNaN(num) ? '0' : new Intl.NumberFormat('ko-KR').format(Math.round(num));
};

interface SynergyTableProps {
  type: 'leisure' | 'fnb';
  correlationRows?: StoreCorrelationItem[];
  stores: StoreCorrelationItem[];
}

export default function SynergyTable({ type, correlationRows = [], stores }: SynergyTableProps) {
  const isLeisure = type === 'leisure';
  const label = isLeisure ? '레저 영업장' : '식음 영업장';
  const defaultDivisionLabel = isLeisure ? '레저본부' : '식음팀';
  
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
            <th className="py-3.5 px-6 text-right">영업장 실제 총매출 (POS)</th>
            <th className="py-3.5 px-6 text-right">객실 연계 파급 매출</th>
            <th className="py-3.5 px-6 text-right">숙박객 연계 비율</th>
            <th className="py-3.5 px-6 text-right rounded-r-xl">1실당 RevPAS 기여액 (골프 불포함)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {displayList.map((item, idx) => {
            const hasCrossMatch = item.calculationMethod !== 'UNTRACKABLE' && (item.spilloverRate || 0) > 0;
            const channelText = (item.channelName || item.segmentName)
              ? `${item.channelName || ''} ${item.segmentName ? `(${item.segmentName})` : ''}`.trim()
              : `${item.divisionName || defaultDivisionLabel} 직영 시설`;

            return (
              <tr key={idx} className={`${theme.hoverBg} transition-colors`}>
                <td className="py-4 px-6 font-semibold text-slate-800">
                  <span className={`${theme.badgeBg} px-2.5 py-1 rounded-full text-xs font-medium`}>
                    {item.shopName}
                  </span>
                </td>
                <td className="py-4 px-6 text-slate-600 font-medium text-xs">
                  {channelText}
                </td>
                <td className="py-4 px-6 text-right font-bold text-slate-900 tabular-nums">
                  {formatCurrency(item.totalSales)}원
                </td>
                <td className={`py-4 px-6 text-right font-bold tabular-nums ${theme.salesText}`}>
                  {hasCrossMatch ? `${formatCurrency(item.correlatedSales)}원` : (
                    <span className="text-xs text-slate-400 font-normal">데이터 연동 중</span>
                  )}
                </td>
                <td className={`py-4 px-6 text-right font-semibold tabular-nums ${theme.rateText}`}>
                  {hasCrossMatch ? (
                    <span className="inline-flex items-center gap-1">
                      {item.spilloverRate}%
                      {item.calculationMethod === 'HARD_FACT_MATCHING' && (
                        <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-normal">실측</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 font-normal">연계 분석 대기</span>
                  )}
                </td>
                <td className="py-4 px-6 text-right font-bold text-slate-900 tabular-nums">
                  {hasCrossMatch && (item.revPasContribution || 0) > 0 ? (
                    `+${formatCurrency(item.revPasContribution)}원/실`
                  ) : (
                    <span className="text-xs text-slate-400 font-normal">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
