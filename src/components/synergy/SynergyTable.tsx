import type { StoreCorrelationItem } from './types';

const formatCurrency = (val: number) => new Intl.NumberFormat('ko-KR').format(Math.round(val));

interface SynergyTableProps {
  type: 'leisure' | 'fnb';
  correlationRows?: StoreCorrelationItem[];
  stores: StoreCorrelationItem[];
}

export default function SynergyTable({ type, correlationRows = [], stores }: SynergyTableProps) {
  const isLeisure = type === 'leisure';
  const label = isLeisure ? '레저 영업장' : '식음 영업장';
  
  const theme = {
    hoverBg: isLeisure ? 'hover:bg-purple-50/30' : 'hover:bg-amber-50/30',
    badgeBg: isLeisure ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800',
    salesText: isLeisure ? 'text-purple-700' : 'text-amber-700',
    rateText: isLeisure ? 'text-indigo-600' : 'text-emerald-600',
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">
            <th className="py-3.5 px-6 rounded-l-xl">{label}</th>
            <th className="py-3.5 px-6">유입 채널 / 세그먼트</th>
            <th className="py-3.5 px-6 text-right">연계 이용객수</th>
            <th className="py-3.5 px-6 text-right">객실 연계 파급 매출</th>
            <th className="py-3.5 px-6 text-right">숙박객 연계 비율</th>
            <th className="py-3.5 px-6 text-right rounded-r-xl">1실당 RevPAS 기여액</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {correlationRows.length > 0 ? (
            correlationRows.map((item, idx) => (
              <tr key={idx} className={`${theme.hoverBg} transition-colors`}>
                <td className="py-4 px-6 font-semibold text-slate-800">
                  <span className={`${theme.badgeBg} px-2.5 py-1 rounded-full text-xs font-medium`}>
                    {item.shopName}
                  </span>
                </td>
                <td className="py-4 px-6 text-slate-700 font-medium">
                  {item.channelName} <span className="text-xs text-slate-400 font-normal">({item.segmentName})</span>
                </td>
                <td className="py-4 px-6 text-right font-medium text-slate-800">{(item.correlatedVisitors || item.correlatedGuests || 0).toLocaleString()}명</td>
                <td className={`py-4 px-6 text-right font-bold ${theme.salesText}`}>{formatCurrency(item.correlatedSales)}원</td>
                <td className={`py-4 px-6 text-right font-semibold ${theme.rateText}`}>{item.spilloverRate}%</td>
                <td className="py-4 px-6 text-right font-bold text-slate-900">+{formatCurrency(item.revPasContribution || 0)}원/실</td>
              </tr>
            ))
          ) : (
            stores.map((item, idx) => (
              <tr key={idx} className={`${theme.hoverBg} transition-colors`}>
                <td className="py-4 px-6 font-semibold text-slate-800">
                  <span className={`${theme.badgeBg} px-2.5 py-1 rounded-full text-xs font-medium`}>
                    {item.shopName}
                  </span>
                </td>
                <td className="py-4 px-6 text-slate-600 font-medium">
                  V5 원천 영업장 (SSOT 연동)
                </td>
                <td className="py-4 px-6 text-right font-medium text-slate-800">
                  {item.calculationMethod !== 'UNTRACKABLE' ? `${(item.correlatedVisitors || item.correlatedGuests || 0).toLocaleString()}명` : '-'}
                </td>
                <td className={`py-4 px-6 text-right font-bold ${theme.salesText}`}>
                  {item.calculationMethod !== 'UNTRACKABLE' ? `${formatCurrency(item.correlatedSales)}원` : '산출 불가'}
                </td>
                <td className={`py-4 px-6 text-right font-semibold ${theme.rateText} flex flex-col items-end gap-1`}>
                  {item.calculationMethod !== 'UNTRACKABLE' ? (
                    <>
                      <span>{item.spilloverRate}%</span>
                      {item.calculationMethod === 'STATISTICAL_INFERENCE' && <span className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-normal">추정치</span>}
                    </>
                  ) : '-'}
                </td>
                <td className="py-4 px-6 text-right font-bold text-slate-900">
                  {item.calculationMethod !== 'UNTRACKABLE' ? `+${formatCurrency(item.revPasContribution || 0)}원/실` : '-'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
