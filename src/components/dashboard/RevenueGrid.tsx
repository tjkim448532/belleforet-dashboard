import React from 'react';
import { ArrowUpRight, Minus } from 'lucide-react';

// 1. 공통 숫자 포맷팅 유틸리티 (₩ 기호 제외, #,##0 서식)
const formatRevenue = (val: number | undefined | null) => {
  if (val === undefined || val === null) return '0';
  return Number(val).toLocaleString('ko-KR');
};

const renderGrowth = (rate?: number) => {
  if (rate === undefined || rate === null) return <span className="text-slate-400">-</span>;
  if (rate === 0) return <span className="text-slate-400 flex items-center justify-end gap-1"><Minus size={14}/> 0%</span>;
  
  if (rate > 0) {
    return (
      <span className="text-rose-600 font-bold flex items-center justify-end gap-1">
        <ArrowUpRight size={14} className="stroke-[2.5]" />
        {rate.toFixed(1)}%
      </span>
    );
  }
  return (
    <span className="text-blue-600 font-bold flex items-center justify-end gap-1">
      <ArrowUpRight size={14} className="stroke-[2.5] rotate-90" />
      {Math.abs(rate).toFixed(1)}%
    </span>
  );
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
  
  const renderRows = () => {
    const rows: React.ReactNode[] = [];
    
    // 트리 순회하며 Flat한 <tr> 배열로 변환
    data.forEach((category) => {
      // 본부 순회
      category.teams?.forEach((team: any, teamIdx: number) => {
        // 파트 순회
        team.parts?.forEach((part: any, partIdx: number) => {
          // 영업장 순회
          part.venues?.forEach((venue: any, venueIdx: number) => {
            // 티켓그룹 순회
            venue.ticket_groups?.forEach((tg: any, tgIdx: number) => {
              // 상품 순회 (Leaf Node)
              tg.products?.forEach((product: any, prodIdx: number) => {
                
                // 각 계층의 첫 번째 요소일 때만 td(rowSpan) 렌더링
                const isFirstCategory = teamIdx === 0 && partIdx === 0 && venueIdx === 0 && tgIdx === 0 && prodIdx === 0;
                const isFirstTeam = partIdx === 0 && venueIdx === 0 && tgIdx === 0 && prodIdx === 0;
                const isFirstPart = venueIdx === 0 && tgIdx === 0 && prodIdx === 0;
                const isFirstVenue = tgIdx === 0 && prodIdx === 0;
                const isFirstTg = prodIdx === 0;

                const m = product.metrics || {};

                rows.push(
                  <tr key={`leaf-${category.category_code}-${product.product_name}-${prodIdx}`} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                    {isFirstCategory && (
                      <td rowSpan={category.rowSpan} className="p-2 font-bold bg-slate-50 border-r border-slate-200 text-center align-middle sticky left-0 z-10 shadow-[1px_0_0_0_#e2e8f0]">
                        {category.category_code}
                      </td>
                    )}
                    {isFirstTeam && (
                      <td rowSpan={team.rowSpan} className="p-2 bg-slate-50 border-r border-slate-200 text-center align-middle sticky left-[80px] z-10 shadow-[1px_0_0_0_#e2e8f0]">
                        {team.team_name}
                      </td>
                    )}
                    {isFirstPart && (
                      <td rowSpan={part.rowSpan} className="p-2 bg-white border-r border-slate-200 text-center align-middle">
                        {part.part_name}
                      </td>
                    )}
                    {isFirstVenue && (
                      <td rowSpan={venue.rowSpan} className="p-2 font-medium border-r border-slate-200 align-middle">
                        {venue.venue_name}
                      </td>
                    )}
                    {isFirstTg && (
                      <td rowSpan={tg.rowSpan} className="p-2 border-r border-slate-200 text-center align-middle text-sm text-slate-600">
                        {tg.ticket_group}
                      </td>
                    )}
                    <td className="p-2 border-r border-slate-200 text-slate-700 text-sm">{product.product_name}</td>
                    <td className="p-2 border-r border-slate-200 text-center text-sm text-slate-500">{product.source_channel}</td>
                    
                    {/* Today */}
                    <td className="p-2 text-right text-slate-800 font-medium">{formatRevenue(m.todayActual)}</td>
                    <td className="p-2 text-right text-slate-500 text-sm">{formatRevenue(m.todayQuantity)}</td>
                    <td className="p-2 text-right text-slate-500 text-sm">{formatRevenue(m.todayLy)}</td>
                    <td className="p-2 border-r border-slate-200 bg-black/5">{renderGrowth(m.todayGrowth)}</td>

                    {/* MTD */}
                    <td className="p-2 text-right text-slate-800 font-medium">{formatRevenue(m.mtdActual)}</td>
                    <td className="p-2 text-right text-slate-500 text-sm">{formatRevenue(m.mtdLy)}</td>
                    <td className="p-2 border-r border-slate-200 bg-black/5">{renderGrowth(m.mtdGrowth)}</td>

                    {/* YTD */}
                    <td className="p-2 text-right text-slate-800 font-medium">{formatRevenue(m.ytdActual)}</td>
                    <td className="p-2 text-right text-slate-500 text-sm">{formatRevenue(m.ytdLy)}</td>
                    <td className="p-2 bg-black/5">{renderGrowth(m.ytdGrowth)}</td>
                  </tr>
                );
              });

              // 티켓그룹 소계
              if (tg.subtotal) {
                const s = tg.subtotal;
                rows.push(
                  <tr key={`sub-tg-${tg.ticket_group}`} className="bg-slate-50 font-semibold border-b border-slate-300">
                    <td colSpan={2} className="p-2 text-right border-r border-slate-300 text-slate-700">[{tg.ticket_group} 소계]</td>
                    <td className="p-2 text-right text-slate-900">{formatRevenue(s.todayActual)}</td>
                    <td className="p-2 text-right text-slate-600">{formatRevenue(s.todayQuantity)}</td>
                    <td className="p-2 text-right text-slate-600">{formatRevenue(s.todayLy)}</td>
                    <td className="p-2 border-r border-slate-300 bg-black/5">{renderGrowth(s.todayGrowth)}</td>
                    <td className="p-2 text-right text-slate-900">{formatRevenue(s.mtdActual)}</td>
                    <td className="p-2 text-right text-slate-600">{formatRevenue(s.mtdLy)}</td>
                    <td className="p-2 border-r border-slate-300 bg-black/5">{renderGrowth(s.mtdGrowth)}</td>
                    <td className="p-2 text-right text-slate-900">{formatRevenue(s.ytdActual)}</td>
                    <td className="p-2 text-right text-slate-600">{formatRevenue(s.ytdLy)}</td>
                    <td className="p-2 bg-black/5">{renderGrowth(s.ytdGrowth)}</td>
                  </tr>
                );
              }
            });

            // 영업장 소계
            if (venue.subtotal) {
              const s = venue.subtotal;
              rows.push(
                <tr key={`sub-venue-${venue.venue_name}`} className="bg-slate-100 font-bold border-b border-slate-300">
                  <td colSpan={3} className="p-2 text-right border-r border-slate-300 text-slate-800">[{venue.venue_name} 합계]</td>
                  <td className="p-2 text-right text-slate-900">{formatRevenue(s.todayActual)}</td>
                  <td className="p-2 text-right text-slate-600">{formatRevenue(s.todayQuantity)}</td>
                  <td className="p-2 text-right text-slate-600">{formatRevenue(s.todayLy)}</td>
                  <td className="p-2 border-r border-slate-300 bg-black/5">{renderGrowth(s.todayGrowth)}</td>
                  <td className="p-2 text-right text-slate-900">{formatRevenue(s.mtdActual)}</td>
                  <td className="p-2 text-right text-slate-600">{formatRevenue(s.mtdLy)}</td>
                  <td className="p-2 border-r border-slate-300 bg-black/5">{renderGrowth(s.mtdGrowth)}</td>
                  <td className="p-2 text-right text-slate-900">{formatRevenue(s.ytdActual)}</td>
                  <td className="p-2 text-right text-slate-600">{formatRevenue(s.ytdLy)}</td>
                  <td className="p-2 bg-black/5">{renderGrowth(s.ytdGrowth)}</td>
                </tr>
              );
            }
          });

          // 파트 소계
          if (part.subtotal) {
            const s = part.subtotal;
            rows.push(
              <tr key={`sub-part-${part.part_name}`} className="bg-slate-200/60 font-bold border-b border-slate-300">
                <td colSpan={4} className="p-2 text-right border-r border-slate-300 text-slate-800">[{part.part_name} 합계]</td>
                <td className="p-2 text-right text-slate-900">{formatRevenue(s.todayActual)}</td>
                <td className="p-2 text-right text-slate-600">{formatRevenue(s.todayQuantity)}</td>
                <td className="p-2 text-right text-slate-600">{formatRevenue(s.todayLy)}</td>
                <td className="p-2 border-r border-slate-300 bg-black/5">{renderGrowth(s.todayGrowth)}</td>
                <td className="p-2 text-right text-slate-900">{formatRevenue(s.mtdActual)}</td>
                <td className="p-2 text-right text-slate-600">{formatRevenue(s.mtdLy)}</td>
                <td className="p-2 border-r border-slate-300 bg-black/5">{renderGrowth(s.mtdGrowth)}</td>
                <td className="p-2 text-right text-slate-900">{formatRevenue(s.ytdActual)}</td>
                <td className="p-2 text-right text-slate-600">{formatRevenue(s.ytdLy)}</td>
                <td className="p-2 bg-black/5">{renderGrowth(s.ytdGrowth)}</td>
              </tr>
            );
          }
        });

        // 본부 소계
        if (team.subtotal) {
          const s = team.subtotal;
          rows.push(
            <tr key={`sub-team-${team.team_name}`} className="bg-slate-200 font-extrabold border-b-[2px] border-slate-400">
              <td colSpan={5} className="p-2 text-right border-r border-slate-300 text-slate-900 sticky left-[80px] z-10 bg-slate-200 shadow-[1px_0_0_0_#cbd5e1]">[{team.team_name} 총합계]</td>
              <td className="p-2 text-right text-slate-900">{formatRevenue(s.todayActual)}</td>
              <td className="p-2 text-right text-slate-700">{formatRevenue(s.todayQuantity)}</td>
              <td className="p-2 text-right text-slate-700">{formatRevenue(s.todayLy)}</td>
              <td className="p-2 border-r border-slate-300 bg-black/5">{renderGrowth(s.todayGrowth)}</td>
              <td className="p-2 text-right text-slate-900">{formatRevenue(s.mtdActual)}</td>
              <td className="p-2 text-right text-slate-700">{formatRevenue(s.mtdLy)}</td>
              <td className="p-2 border-r border-slate-300 bg-black/5">{renderGrowth(s.mtdGrowth)}</td>
              <td className="p-2 text-right text-slate-900">{formatRevenue(s.ytdActual)}</td>
              <td className="p-2 text-right text-slate-700">{formatRevenue(s.ytdLy)}</td>
              <td className="p-2 bg-black/5">{renderGrowth(s.ytdGrowth)}</td>
            </tr>
          );
        }
      });

      // 대분류 소계
      if (category.subtotal) {
        const s = category.subtotal;
        rows.push(
          <tr key={`sub-cat-${category.category_code}`} className="bg-slate-300 font-black border-b-[3px] border-slate-500">
            <td colSpan={6} className="p-3 text-right border-r border-slate-400 text-slate-900 sticky left-0 z-10 bg-slate-300 shadow-[1px_0_0_0_#94a3b8]">[{category.category_code} 총계]</td>
            <td className="p-3 text-right text-slate-900">{formatRevenue(s.todayActual)}</td>
            <td className="p-3 text-right text-slate-700">{formatRevenue(s.todayQuantity)}</td>
            <td className="p-3 text-right text-slate-700">{formatRevenue(s.todayLy)}</td>
            <td className="p-3 border-r border-slate-400 bg-black/5">{renderGrowth(s.todayGrowth)}</td>
            <td className="p-3 text-right text-slate-900">{formatRevenue(s.mtdActual)}</td>
            <td className="p-3 text-right text-slate-700">{formatRevenue(s.mtdLy)}</td>
            <td className="p-3 border-r border-slate-400 bg-black/5">{renderGrowth(s.mtdGrowth)}</td>
            <td className="p-3 text-right text-slate-900">{formatRevenue(s.ytdActual)}</td>
            <td className="p-3 text-right text-slate-700">{formatRevenue(s.ytdLy)}</td>
            <td className="p-3 bg-black/5">{renderGrowth(s.ytdGrowth)}</td>
          </tr>
        );
      }
    });

    return rows;
  };

  return (
    <div className="flex flex-col h-full bg-white shadow-sm rounded-lg border border-slate-200">
      <div className="overflow-auto flex-grow max-h-[calc(100vh-250px)] relative">
        <table className="w-full text-sm text-left border-collapse whitespace-nowrap min-w-[1200px]">
          <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-20 shadow-sm">
            <tr>
              <th className="p-3 border-r border-slate-200 sticky left-0 bg-slate-100 z-30" rowSpan={2}>대분류</th>
              <th className="p-3 border-r border-slate-200 sticky left-[80px] bg-slate-100 z-30" rowSpan={2}>본부</th>
              <th className="p-3 border-r border-slate-200" rowSpan={2}>파트</th>
              <th className="p-3 border-r border-slate-200" rowSpan={2}>영업장(38개)</th>
              <th className="p-3 border-r border-slate-200" rowSpan={2}>티켓그룹</th>
              <th className="p-3 border-r border-slate-200" rowSpan={2}>상품/트랜잭션명</th>
              <th className="p-3 border-r border-slate-200" rowSpan={2}>채널</th>
              
              <th className="p-2 border-r border-b border-slate-200 text-center" colSpan={4}>당일 실적 (Today)</th>
              <th className="p-2 border-r border-b border-slate-200 text-center" colSpan={3}>월누계 (MTD)</th>
              <th className="p-2 border-b border-slate-200 text-center" colSpan={3}>연누계 (YTD)</th>
            </tr>
            <tr className="bg-slate-50 text-xs">
              <th className="p-2 border-r border-slate-200 text-center sticky top-[40px] bg-slate-50">매출액</th>
              <th className="p-2 border-r border-slate-200 text-center sticky top-[40px] bg-slate-50">수량</th>
              <th className="p-2 border-r border-slate-200 text-center sticky top-[40px] bg-slate-50">전년동기</th>
              <th className="p-2 border-r border-slate-200 text-center sticky top-[40px] bg-slate-50">YoY</th>
              
              <th className="p-2 border-r border-slate-200 text-center sticky top-[40px] bg-slate-50">매출액</th>
              <th className="p-2 border-r border-slate-200 text-center sticky top-[40px] bg-slate-50">전년동기</th>
              <th className="p-2 border-r border-slate-200 text-center sticky top-[40px] bg-slate-50">YoY</th>
              
              <th className="p-2 border-r border-slate-200 text-center sticky top-[40px] bg-slate-50">매출액</th>
              <th className="p-2 border-r border-slate-200 text-center sticky top-[40px] bg-slate-50">전년동기</th>
              <th className="p-2 text-center sticky top-[40px] bg-slate-50">YoY</th>
            </tr>
          </thead>
          <tbody>
            {data && data.length > 0 ? renderRows() : (
              <tr>
                <td colSpan={17} className="p-8 text-center text-slate-500">
                  데이터가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 4. 검증 마스터 (Validation Master) 하단 고정 패널 */}
      {validationMaster && (
        <div className={`p-4 border-t border-slate-200 font-bold flex justify-between items-center z-10 shrink-0 ${
          validationMaster.isZeroVariance ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
        }`}>
          <div className="flex items-center gap-4">
            <span className="text-lg">
              {validationMaster.isZeroVariance ? '✅ Zero-Variance 무결성 검증 통과' : '🚨 [장부 불일치] 데이터 파이프라인 무결성 에러'}
            </span>
            <span className="text-sm font-medium opacity-80 mt-1">
              원천 장부 합계: ₩{formatRevenue(validationMaster.originalTotal)} / 
              대시보드 총액: ₩{formatRevenue(validationMaster.payloadTotal)}
            </span>
          </div>
          <div className="text-xl tracking-tight bg-white/50 px-4 py-1 rounded-md border border-black/10">
            오차 (Variance): ₩{formatRevenue(validationMaster.variance)}
          </div>
        </div>
      )}
    </div>
  );
}
