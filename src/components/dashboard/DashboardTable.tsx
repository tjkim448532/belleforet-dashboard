import React, { useMemo } from 'react';
import { formatRevenue } from '../../utils/formatters';
import type { RevenueOrgData } from '../../hooks/useRevenueData';

interface Props {
    data: RevenueOrgData | null;
}

export const DashboardTable: React.FC<Props> = ({ data }) => {
    // [Zero-Proxy 원칙] 프론트엔드 연산(reduce 등) 전면 금지. 
    // 백엔드가 제공한 완제품 데이터(grandTotal, subtotal)만 사용하여 렌더링 트리를 구성합니다.
    const rows = useMemo(() => {
        if (!data || !data.divisions) return [];
        
        const renderRows: React.ReactNode[] = [];
        
        // 1. 총합계 (Grand Total) 렌더링 - 백엔드가 준 데이터 100% 맹신
        if (data.grandTotal !== undefined) {
            renderRows.push(
                <tr key="grand-total" className="bg-slate-800 text-white font-black text-sm tracking-wide shadow-md">
                    <td colSpan={3} className="px-6 py-4 border-r border-slate-700 text-center uppercase tracking-widest sticky left-0 z-10 shadow-[1px_0_0_0_#334155]">
                        전사 총합계 (GRAND TOTAL)
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-lg">
                        {formatRevenue(data.grandTotal)}
                    </td>
                </tr>
            );
        }

        // 2. 본부(Division)별 렌더링
        data.divisions.forEach((div, dIndex) => {
            const venues = div.venues || [];
            
            // 데이터 누락 처리 방어 로직: 영업장이 없으면 강제로 빈 행을 만들지 않고 스킵
            if (venues.length === 0) return;

            // RowSpan 계산: 영업장 개수 + 소계 Row (1개)
            const rowSpan = venues.length + 1; 

            venues.forEach((venue, vIndex) => {
                const isFirst = vIndex === 0;
                renderRows.push(
                    <tr key={`venue-${dIndex}-${vIndex}`} className="hover:bg-slate-50 transition-colors border-b border-gray-200 bg-white">
                        {isFirst && (
                            <td rowSpan={rowSpan} className="px-6 py-4 border-r border-gray-200 font-extrabold text-slate-800 bg-slate-50/70 align-middle text-center sticky left-0 z-10 shadow-[1px_0_0_0_#e2e8f0]">
                                {div.orgDivision}
                            </td>
                        )}
                        <td className="px-6 py-4 border-r border-gray-100 font-bold text-slate-700 align-middle">
                            {venue.venueName}
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-500 border-r border-gray-100 text-center">
                            {venue.ticketGroup}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-semibold text-slate-800">
                            {formatRevenue(venue.revenue)}
                        </td>
                    </tr>
                );
            });

            // 3. 본부별 소계 (Subtotal) 렌더링 - 백엔드 데이터 그대로 바인딩
            renderRows.push(
                <tr key={`subtotal-${dIndex}`} className="bg-slate-100 border-b-[2px] border-slate-300">
                    <td colSpan={2} className="px-6 py-3 border-r border-slate-300 font-extrabold text-xs text-slate-900 text-center tracking-wide">
                        [{div.orgDivision} 소계]
                    </td>
                    <td className="px-6 py-3 text-right font-mono font-bold text-slate-900">
                        {formatRevenue(div.subtotal)}
                    </td>
                </tr>
            );
        });

        return renderRows;
    }, [data]);

    if (!data || !data.divisions || data.divisions.length === 0) {
        return <div className="p-8 text-center text-slate-500 font-medium bg-slate-50 rounded-xl border border-slate-200">조회된 경영 조직도 기반 정산 데이터가 없습니다.</div>;
    }

    return (
        <div className="overflow-x-auto w-full bg-white rounded-xl shadow-sm border border-slate-300">
            <table className="min-w-full text-sm text-left border-collapse">
                <thead className="bg-slate-100 border-b-2 border-slate-300 text-slate-700">
                    <tr>
                        <th className="px-6 py-4 font-bold tracking-tight text-center sticky left-0 bg-slate-100 z-20 shadow-[1px_0_0_0_#cbd5e1]">본부</th>
                        <th className="px-6 py-4 font-bold tracking-tight text-center">영업장</th>
                        <th className="px-6 py-4 font-bold tracking-tight text-center">티켓그룹</th>
                        <th className="px-6 py-4 font-bold tracking-tight text-right">매출액</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {rows}
                </tbody>
            </table>
        </div>
    );
};
