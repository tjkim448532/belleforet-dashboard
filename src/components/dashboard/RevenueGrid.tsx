import React from 'react';

// 1. 공통 숫자 포맷팅 유틸리티 (₩ 기호 제외, #,##0 서식)
const formatRevenue = (val: number | undefined | null) => {
  if (val === undefined || val === null) return '0';
  return Number(val).toLocaleString('ko-KR');
};

const renderGrowth = (rate?: number) => {
  if (rate === undefined || rate === null) return <span className="text-slate-400">-</span>;
  if (rate === 0) return <span className="text-slate-400">0</span>;
  return <span className={rate > 0 ? "text-blue-600" : "text-red-500"}>{rate.toFixed(1)}</span>;
};

export interface Metrics {
  todayActual: number;
  todayQuantity: number;
  todayLy?: number;
  todayGrowth?: number;
  mtdActual: number;
  mtdLy?: number;
  mtdGrowth?: number;
  ytdActual: number;
  ytdLy?: number;
  ytdGrowth?: number;
}

interface ValidationMaster {
  originalTotal: number;
  payloadTotal: number;
  variance: number;
  isZeroVariance: boolean;
}

interface GridProps {
  data: any[]; 
  validationMaster: ValidationMaster;
}

export default function RevenueGrid({ data, validationMaster }: GridProps) {
  
  // 소계 행 렌더링 헬퍼 함수
  // colSpan 값은 상위 계층의 rowSpan이 현재 행을 덮고 있는지 여부에 따라 수학적으로 정확히 계산됨.
  const renderSubtotalRow = (
    key: string,
    label: string,
    s: any,
    colSpan: number,
    bgClass: string,
    textClass: string,
    isStickyLeft: boolean = false,
    stickyOffset: string = '0'
  ) => {
    if (!s) return null;
    return (
      <tr key={key} className={`${bgClass} ${textClass} border-b border-slate-300`}>
        <td 
          colSpan={colSpan} 
          className={`p-2 text-right border-r border-slate-300 ${isStickyLeft ? `sticky ${stickyOffset} z-10 ${bgClass}` : ''}`}
        >
          {label}
        </td>
        {/* Today */}
        <td className="p-2 text-right font-medium">{formatRevenue(s.todayActual)}</td>
        <td className="p-2 text-right text-slate-700">{formatRevenue(s.todayQuantity)}</td>
        <td className="p-2 text-right text-slate-600">{formatRevenue(s.todayLy)}</td>
        <td className="p-2 text-right border-r border-slate-300">{renderGrowth(s.todayGrowth)}</td>
        {/* MTD */}
        <td className="p-2 text-right font-medium">{formatRevenue(s.mtdActual)}</td>
        <td className="p-2 text-right text-slate-600">{formatRevenue(s.mtdLy)}</td>
        <td className="p-2 text-right border-r border-slate-300">{renderGrowth(s.mtdGrowth)}</td>
        {/* YTD */}
        <td className="p-2 text-right font-medium">{formatRevenue(s.ytdActual)}</td>
        <td className="p-2 text-right text-slate-600">{formatRevenue(s.ytdLy)}</td>
        <td className="p-2 text-right">{renderGrowth(s.ytdGrowth)}</td>
      </tr>
    );
  };

  const renderRows = () => {
    const rows: React.ReactNode[] = [];
    
    data.forEach((category) => {
      category.teams?.forEach((team: any, teamIdx: number) => {
        team.parts?.forEach((part: any, partIdx: number) => {
          part.venues?.forEach((venue: any, venueIdx: number) => {
            venue.ticket_groups?.forEach((tg: any, tgIdx: number) => {
              tg.products?.forEach((product: any, prodIdx: number) => {
                
                const isFirstCategory = teamIdx === 0 && partIdx === 0 && venueIdx === 0 && tgIdx === 0 && prodIdx === 0;
                const isFirstTeam = partIdx === 0 && venueIdx === 0 && tgIdx === 0 && prodIdx === 0;
                const isFirstPart = venueIdx === 0 && tgIdx === 0 && prodIdx === 0;
                const isFirstVenue = tgIdx === 0 && prodIdx === 0;
                const isFirstTg = prodIdx === 0;

                const m = product.metrics || {};

                rows.push(
                  <tr key={`leaf-${category.category_code}-${product.product_name}-${prodIdx}`} className="bg-white hover:bg-slate-50 border-b border-slate-200">
                    {isFirstCategory && (
                      <td rowSpan={category.rowSpan} className="p-2 border-r border-slate-300 text-center font-bold text-slate-800 align-middle sticky left-0 z-10 bg-white">
                        {category.category_code}
                      </td>
                    )}
                    {isFirstTeam && (
                      <td rowSpan={team.rowSpan} className="p-2 border-r border-slate-300 text-center text-slate-700 align-middle sticky left-[80px] z-10 bg-white">
                        {team.team_name}
                      </td>
                    )}
                    {isFirstPart && (
                      <td rowSpan={part.rowSpan} className="p-2 border-r border-slate-300 text-center text-slate-600 align-middle">
                        {part.part_name}
                      </td>
                    )}
                    {isFirstVenue && (
                      <td rowSpan={venue.rowSpan} className="p-2 border-r border-slate-300 text-center text-slate-600 align-middle">
                        {venue.venue_name}
                      </td>
                    )}
                    {isFirstTg && (
                      <td rowSpan={tg.rowSpan} className="p-2 border-r border-slate-300 text-center text-slate-600 align-middle">
                        {tg.ticket_group}
                      </td>
                    )}
                    <td className="p-2 border-r border-slate-300 text-left text-slate-700">{product.product_name}</td>
                    <td className="p-2 border-r border-slate-300 text-center text-slate-500">{product.source_channel}</td>
                    
                    {/* Today */}
                    <td className="p-2 text-right font-medium text-slate-800">{formatRevenue(m.todayActual)}</td>
                    <td className="p-2 text-right text-slate-600">{formatRevenue(m.todayQuantity)}</td>
                    <td className="p-2 text-right text-slate-500">{formatRevenue(m.todayLy)}</td>
                    <td className="p-2 text-right border-r border-slate-300">{renderGrowth(m.todayGrowth)}</td>

                    {/* MTD */}
                    <td className="p-2 text-right font-medium text-slate-800">{formatRevenue(m.mtdActual)}</td>
                    <td className="p-2 text-right text-slate-500">{formatRevenue(m.mtdLy)}</td>
                    <td className="p-2 text-right border-r border-slate-300">{renderGrowth(m.mtdGrowth)}</td>

                    {/* YTD */}
                    <td className="p-2 text-right font-medium text-slate-800">{formatRevenue(m.ytdActual)}</td>
                    <td className="p-2 text-right text-slate-500">{formatRevenue(m.ytdLy)}</td>
                    <td className="p-2 text-right">{renderGrowth(m.ytdGrowth)}</td>
                  </tr>
                );
              });

              // 티켓그룹 소계 (colSpan 3)
              if (tg.subtotal) {
                rows.push(renderSubtotalRow(`sub-tg-${tg.ticket_group}`, `[${tg.ticket_group} 소계]`, tg.subtotal, 3, 'bg-slate-50', 'font-semibold'));
              }
            });

            // 영업장 소계 (colSpan 4)
            if (venue.subtotal) {
              rows.push(renderSubtotalRow(`sub-venue-${venue.venue_name}`, `[${venue.venue_name} 합계]`, venue.subtotal, 4, 'bg-slate-100', 'font-bold'));
            }
          });

          // 파트 소계 (colSpan 5)
          if (part.subtotal) {
            rows.push(renderSubtotalRow(`sub-part-${part.part_name}`, `[${part.part_name} 합계]`, part.subtotal, 5, 'bg-slate-200', 'font-bold'));
          }
        });

        // 본부 소계 (colSpan 6)
        if (team.subtotal) {
          rows.push(renderSubtotalRow(`sub-team-${team.team_name}`, `[${team.team_name} 총합계]`, team.subtotal, 6, 'bg-slate-300', 'font-extrabold', true, 'left-[80px]'));
        }
      });

      // 대분류 소계 (colSpan 7)
      if (category.subtotal) {
        rows.push(renderSubtotalRow(`sub-cat-${category.category_code}`, `[${category.category_code} 총계]`, category.subtotal, 7, 'bg-slate-400', 'font-black', true, 'left-0'));
      }
    });

    return rows;
  };

  return (
    <div className="flex flex-col h-full bg-white shadow-sm rounded-lg border border-slate-300">
      <div className="overflow-auto flex-grow max-h-[calc(100vh-250px)] relative">
        <table className="w-full text-[11.5px] text-left border-collapse whitespace-nowrap min-w-[1200px]">
          <thead className="bg-[#f8f9fa] text-slate-700 font-bold sticky top-0 z-20 shadow-sm border-b-2 border-slate-400">
            <tr>
              <th className="p-2 border-r border-slate-300 sticky left-0 bg-[#f8f9fa] z-30 text-center" rowSpan={2}>대분류</th>
              <th className="p-2 border-r border-slate-300 sticky left-[80px] bg-[#f8f9fa] z-30 text-center" rowSpan={2}>본부</th>
              <th className="p-2 border-r border-slate-300 text-center" rowSpan={2}>파트</th>
              <th className="p-2 border-r border-slate-300 text-center" rowSpan={2}>영업장(38개)</th>
              <th className="p-2 border-r border-slate-300 text-center" rowSpan={2}>티켓그룹</th>
              <th className="p-2 border-r border-slate-300 text-center" rowSpan={2}>상품/트랜잭션명</th>
              <th className="p-2 border-r border-slate-300 text-center" rowSpan={2}>채널</th>
              
              <th className="p-2 border-r border-slate-300 text-center bg-blue-50/50" colSpan={4}>당일 실적 (Today)</th>
              <th className="p-2 border-r border-slate-300 text-center bg-indigo-50/50" colSpan={3}>월누계 (Month To Date)</th>
              <th className="p-2 text-center bg-purple-50/50" colSpan={3}>연누계 (Year To Date)</th>
            </tr>
            <tr className="text-xs">
              {/* Today */}
              <th className="p-2 border-r border-slate-300 text-center sticky top-[37px] bg-[#f8f9fa] z-20">매출액</th>
              <th className="p-2 border-r border-slate-300 text-center sticky top-[37px] bg-[#f8f9fa] z-20">수량</th>
              <th className="p-2 border-r border-slate-300 text-center sticky top-[37px] bg-[#f8f9fa] z-20">전년동기</th>
              <th className="p-2 border-r border-slate-300 text-center sticky top-[37px] bg-[#f8f9fa] z-20">YoY</th>
              
              {/* MTD */}
              <th className="p-2 border-r border-slate-300 text-center sticky top-[37px] bg-[#f8f9fa] z-20">매출액</th>
              <th className="p-2 border-r border-slate-300 text-center sticky top-[37px] bg-[#f8f9fa] z-20">전년동기</th>
              <th className="p-2 border-r border-slate-300 text-center sticky top-[37px] bg-[#f8f9fa] z-20">YoY</th>
              
              {/* YTD */}
              <th className="p-2 border-r border-slate-300 text-center sticky top-[37px] bg-[#f8f9fa] z-20">매출액</th>
              <th className="p-2 border-r border-slate-300 text-center sticky top-[37px] bg-[#f8f9fa] z-20">전년동기</th>
              <th className="p-2 text-center sticky top-[37px] bg-[#f8f9fa] z-20">YoY</th>
            </tr>
          </thead>
          <tbody>
            {data && data.length > 0 ? renderRows() : (
              <tr>
                <td colSpan={17} className="p-12 text-center text-slate-500">
                  조회된 데이터가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {validationMaster && (
        <div className={`p-3 border-t border-slate-300 font-bold flex justify-between items-center z-10 shrink-0 text-xs ${
          validationMaster.isZeroVariance ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-sm">
              {validationMaster.isZeroVariance ? '✅ Zero-Variance 검증 통과' : '🚨 [장부 불일치] 데이터 무결성 에러'}
            </span>
            <span className="font-medium opacity-80 mt-0.5">
              원천 장부 합계: ₩{formatRevenue(validationMaster.originalTotal)} / 
              대시보드 총액: ₩{formatRevenue(validationMaster.payloadTotal)}
            </span>
          </div>
          <div className="text-base tracking-tight bg-white/60 px-3 py-1 rounded border border-black/10">
            오차 (Variance): ₩{formatRevenue(validationMaster.variance)}
          </div>
        </div>
      )}
    </div>
  );
}
