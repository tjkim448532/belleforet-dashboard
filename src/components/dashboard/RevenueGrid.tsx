import React from 'react';


// 1. 공통 숫자 포맷팅 유틸리티 (₩ 기호 제외, #,##0 서식)
const formatRevenue = (val: number | undefined | null) => {
  if (val === undefined || val === null) return '0';
  return Number(val).toLocaleString('ko-KR');
};

// 스크린샷 기준: 소수점 2자리 렌더링, 양수/음수 색상 없이 기본 검정텍스트 + 마이너스 기호 처리
const renderRate = (rate?: number) => {
  if (rate === undefined || rate === null) return <span className="text-slate-500">0</span>;
  if (rate === 0) return <span className="text-slate-500">0</span>;
  return <span className="text-slate-900">{rate.toFixed(2)}</span>;
};

export interface Metrics {
  todayTarget?: number;
  todayActual: number;
  todayLy?: number;
  todayAchieve?: number;
  todayGrowth?: number;

  mtdTarget?: number;
  mtdActual: number;
  mtdLy?: number;
  mtdAchieve?: number;
  mtdGrowth?: number;

  ytdTarget?: number;
  ytdActual: number;
  ytdLy?: number;
  ytdAchieve?: number;
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
                  <tr key={`leaf-${category.category_code}-${product.product_name}-${prodIdx}`} className="bg-white hover:bg-slate-50 transition-colors">
                    {isFirstCategory && (
                      <td rowSpan={category.rowSpan} className="p-1.5 border border-slate-300 text-center align-middle sticky left-0 z-10 bg-white">
                        {category.category_code}
                      </td>
                    )}
                    {isFirstTeam && (
                      <td rowSpan={team.rowSpan} className="p-1.5 border border-slate-300 text-center align-middle sticky left-[80px] z-10 bg-white">
                        {team.team_name}
                      </td>
                    )}
                    {isFirstPart && (
                      <td rowSpan={part.rowSpan} className="p-1.5 border border-slate-300 text-center align-middle">
                        {part.part_name}
                      </td>
                    )}
                    {isFirstVenue && (
                      <td rowSpan={venue.rowSpan} className="p-1.5 border border-slate-300 align-middle">
                        {venue.venue_name}
                      </td>
                    )}
                    {isFirstTg && (
                      <td rowSpan={tg.rowSpan} className="p-1.5 border border-slate-300 text-center align-middle">
                        {tg.ticket_group}
                      </td>
                    )}
                    <td className="p-1.5 border border-slate-300 text-left">{product.product_name}</td>
                    <td className="p-1.5 border border-slate-300 text-center text-slate-600">{product.source_channel}</td>
                    
                    {/* Today */}
                    <td className="p-1.5 border border-slate-300 text-right bg-white">{formatRevenue(m.todayTarget)}</td>
                    <td className="p-1.5 border border-slate-300 text-right bg-white">{formatRevenue(m.todayActual)}</td>
                    <td className="p-1.5 border border-slate-300 text-right bg-white">{formatRevenue(m.todayLy)}</td>
                    <td className="p-1.5 border border-slate-300 text-right bg-white">{renderRate(m.todayAchieve)}</td>
                    <td className="p-1.5 border border-slate-300 text-right bg-[#f8f9fa] font-medium">{renderRate(m.todayGrowth)}</td>

                    {/* MTD */}
                    <td className="p-1.5 border border-slate-300 text-right bg-white">{formatRevenue(m.mtdTarget)}</td>
                    <td className="p-1.5 border border-slate-300 text-right bg-white">{formatRevenue(m.mtdActual)}</td>
                    <td className="p-1.5 border border-slate-300 text-right bg-white">{formatRevenue(m.mtdLy)}</td>
                    <td className="p-1.5 border border-slate-300 text-right bg-white">{renderRate(m.mtdAchieve)}</td>
                    <td className="p-1.5 border border-slate-300 text-right bg-[#f8f9fa] font-medium">{renderRate(m.mtdGrowth)}</td>

                    {/* YTD */}
                    <td className="p-1.5 border border-slate-300 text-right bg-white">{formatRevenue(m.ytdTarget)}</td>
                    <td className="p-1.5 border border-slate-300 text-right bg-white">{formatRevenue(m.ytdActual)}</td>
                    <td className="p-1.5 border border-slate-300 text-right bg-white">{formatRevenue(m.ytdLy)}</td>
                    <td className="p-1.5 border border-slate-300 text-right bg-white">{renderRate(m.ytdAchieve)}</td>
                    <td className="p-1.5 border border-slate-300 text-right bg-[#f8f9fa] font-medium">{renderRate(m.ytdGrowth)}</td>
                  </tr>
                );
              });

              // 티켓그룹 소계
              if (tg.subtotal) {
                const s = tg.subtotal;
                rows.push(
                  <tr key={`sub-tg-${tg.ticket_group}`} className="bg-[#fff9c4] font-bold text-slate-900">
                    <td colSpan={3} className="p-1.5 text-center border border-slate-300">[{tg.ticket_group} 소계]</td>
                    <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.todayTarget)}</td>
                    <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.todayActual)}</td>
                    <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.todayLy)}</td>
                    <td className="p-1.5 text-right border border-slate-300">{renderRate(s.todayAchieve)}</td>
                    <td className="p-1.5 text-right border border-slate-300">{renderRate(s.todayGrowth)}</td>
                    <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.mtdTarget)}</td>
                    <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.mtdActual)}</td>
                    <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.mtdLy)}</td>
                    <td className="p-1.5 text-right border border-slate-300">{renderRate(s.mtdAchieve)}</td>
                    <td className="p-1.5 text-right border border-slate-300">{renderRate(s.mtdGrowth)}</td>
                    <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.ytdTarget)}</td>
                    <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.ytdActual)}</td>
                    <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.ytdLy)}</td>
                    <td className="p-1.5 text-right border border-slate-300">{renderRate(s.ytdAchieve)}</td>
                    <td className="p-1.5 text-right border border-slate-300">{renderRate(s.ytdGrowth)}</td>
                  </tr>
                );
              }
            });

            // 영업장 소계
            if (venue.subtotal) {
              const s = venue.subtotal;
              rows.push(
                <tr key={`sub-venue-${venue.venue_name}`} className="bg-[#fff9c4] font-bold text-slate-900">
                  <td colSpan={4} className="p-1.5 text-center border border-slate-300">[{venue.venue_name} 합계]</td>
                  <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.todayTarget)}</td>
                  <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.todayActual)}</td>
                  <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.todayLy)}</td>
                  <td className="p-1.5 text-right border border-slate-300">{renderRate(s.todayAchieve)}</td>
                  <td className="p-1.5 text-right border border-slate-300">{renderRate(s.todayGrowth)}</td>
                  <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.mtdTarget)}</td>
                  <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.mtdActual)}</td>
                  <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.mtdLy)}</td>
                  <td className="p-1.5 text-right border border-slate-300">{renderRate(s.mtdAchieve)}</td>
                  <td className="p-1.5 text-right border border-slate-300">{renderRate(s.mtdGrowth)}</td>
                  <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.ytdTarget)}</td>
                  <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.ytdActual)}</td>
                  <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.ytdLy)}</td>
                  <td className="p-1.5 text-right border border-slate-300">{renderRate(s.ytdAchieve)}</td>
                  <td className="p-1.5 text-right border border-slate-300">{renderRate(s.ytdGrowth)}</td>
                </tr>
              );
            }
          });

          // 파트 소계
          if (part.subtotal) {
            const s = part.subtotal;
            rows.push(
              <tr key={`sub-part-${part.part_name}`} className="bg-[#fff9c4] font-bold text-slate-900">
                <td colSpan={5} className="p-1.5 text-center border border-slate-300">[{part.part_name} 합계]</td>
                <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.todayTarget)}</td>
                <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.todayActual)}</td>
                <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.todayLy)}</td>
                <td className="p-1.5 text-right border border-slate-300">{renderRate(s.todayAchieve)}</td>
                <td className="p-1.5 text-right border border-slate-300">{renderRate(s.todayGrowth)}</td>
                <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.mtdTarget)}</td>
                <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.mtdActual)}</td>
                <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.mtdLy)}</td>
                <td className="p-1.5 text-right border border-slate-300">{renderRate(s.mtdAchieve)}</td>
                <td className="p-1.5 text-right border border-slate-300">{renderRate(s.mtdGrowth)}</td>
                <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.ytdTarget)}</td>
                <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.ytdActual)}</td>
                <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.ytdLy)}</td>
                <td className="p-1.5 text-right border border-slate-300">{renderRate(s.ytdAchieve)}</td>
                <td className="p-1.5 text-right border border-slate-300">{renderRate(s.ytdGrowth)}</td>
              </tr>
            );
          }
        });

        // 본부 소계
        if (team.subtotal) {
          const s = team.subtotal;
          rows.push(
            <tr key={`sub-team-${team.team_name}`} className="bg-[#fff9c4] font-bold text-slate-900">
              <td colSpan={6} className="p-1.5 text-center border border-slate-300 sticky left-[80px] z-10 bg-[#fff9c4]">[{team.team_name} Total]</td>
              <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.todayTarget)}</td>
              <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.todayActual)}</td>
              <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.todayLy)}</td>
              <td className="p-1.5 text-right border border-slate-300">{renderRate(s.todayAchieve)}</td>
              <td className="p-1.5 text-right border border-slate-300">{renderRate(s.todayGrowth)}</td>
              <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.mtdTarget)}</td>
              <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.mtdActual)}</td>
              <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.mtdLy)}</td>
              <td className="p-1.5 text-right border border-slate-300">{renderRate(s.mtdAchieve)}</td>
              <td className="p-1.5 text-right border border-slate-300">{renderRate(s.mtdGrowth)}</td>
              <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.ytdTarget)}</td>
              <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.ytdActual)}</td>
              <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.ytdLy)}</td>
              <td className="p-1.5 text-right border border-slate-300">{renderRate(s.ytdAchieve)}</td>
              <td className="p-1.5 text-right border border-slate-300">{renderRate(s.ytdGrowth)}</td>
            </tr>
          );
        }
      });

      // 대분류 소계
      if (category.subtotal) {
        const s = category.subtotal;
        rows.push(
          <tr key={`sub-cat-${category.category_code}`} className="bg-[#fff9c4] font-bold text-slate-900">
            <td colSpan={7} className="p-1.5 text-center border border-slate-300 sticky left-0 z-10 bg-[#fff9c4]">[{category.category_code} Total]</td>
            <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.todayTarget)}</td>
            <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.todayActual)}</td>
            <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.todayLy)}</td>
            <td className="p-1.5 text-right border border-slate-300">{renderRate(s.todayAchieve)}</td>
            <td className="p-1.5 text-right border border-slate-300">{renderRate(s.todayGrowth)}</td>
            <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.mtdTarget)}</td>
            <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.mtdActual)}</td>
            <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.mtdLy)}</td>
            <td className="p-1.5 text-right border border-slate-300">{renderRate(s.mtdAchieve)}</td>
            <td className="p-1.5 text-right border border-slate-300">{renderRate(s.mtdGrowth)}</td>
            <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.ytdTarget)}</td>
            <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.ytdActual)}</td>
            <td className="p-1.5 text-right border border-slate-300">{formatRevenue(s.ytdLy)}</td>
            <td className="p-1.5 text-right border border-slate-300">{renderRate(s.ytdAchieve)}</td>
            <td className="p-1.5 text-right border border-slate-300">{renderRate(s.ytdGrowth)}</td>
          </tr>
        );
      }
    });

    return rows;
  };

  return (
    <div className="flex flex-col h-full bg-white shadow-sm border border-slate-300">
      <div className="overflow-auto flex-grow max-h-[calc(100vh-250px)] relative">
        <table className="w-full text-[11px] text-slate-800 border-collapse min-w-[1400px]">
          <thead className="sticky top-0 z-20">
            <tr className="bg-[#f1f3f5] font-bold text-center">
              <th className="p-1.5 border border-slate-300 sticky left-0 bg-[#f1f3f5] z-30" rowSpan={2}>대분류</th>
              <th className="p-1.5 border border-slate-300 sticky left-[80px] bg-[#f1f3f5] z-30" rowSpan={2}>본부</th>
              <th className="p-1.5 border border-slate-300" rowSpan={2}>파트</th>
              <th className="p-1.5 border border-slate-300" rowSpan={2}>영업장(38개)</th>
              <th className="p-1.5 border border-slate-300" rowSpan={2}>티켓그룹</th>
              <th className="p-1.5 border border-slate-300" rowSpan={2}>상품/트랜잭션명</th>
              <th className="p-1.5 border border-slate-300" rowSpan={2}>채널</th>
              
              <th className="p-1.5 border border-slate-300" colSpan={5}>금일(Today)</th>
              <th className="p-1.5 border border-slate-300" colSpan={5}>월누계(Month To Date)</th>
              <th className="p-1.5 border border-slate-300" colSpan={5}>연누계(Year To Date)</th>
            </tr>
            <tr className="bg-[#f8f9fa] font-bold text-center">
              <th className="p-1.5 border border-slate-300 sticky top-[30px] bg-[#f8f9fa] text-slate-700">목표</th>
              <th className="p-1.5 border border-slate-300 sticky top-[30px] bg-[#f8f9fa] text-slate-700">실적</th>
              <th className="p-1.5 border border-slate-300 sticky top-[30px] bg-[#f8f9fa] text-slate-700">전년</th>
              <th className="p-1.5 border border-slate-300 sticky top-[30px] bg-[#f8f9fa] text-slate-700">달성율</th>
              <th className="p-1.5 border border-slate-300 sticky top-[30px] bg-[#f8f9fa] text-slate-700">증감율</th>
              
              <th className="p-1.5 border border-slate-300 sticky top-[30px] bg-[#f8f9fa] text-slate-700">목표</th>
              <th className="p-1.5 border border-slate-300 sticky top-[30px] bg-[#f8f9fa] text-slate-700">실적</th>
              <th className="p-1.5 border border-slate-300 sticky top-[30px] bg-[#f8f9fa] text-slate-700">전년</th>
              <th className="p-1.5 border border-slate-300 sticky top-[30px] bg-[#f8f9fa] text-slate-700">달성율</th>
              <th className="p-1.5 border border-slate-300 sticky top-[30px] bg-[#f8f9fa] text-slate-700">증감율</th>
              
              <th className="p-1.5 border border-slate-300 sticky top-[30px] bg-[#f8f9fa] text-slate-700">목표</th>
              <th className="p-1.5 border border-slate-300 sticky top-[30px] bg-[#f8f9fa] text-slate-700">실적</th>
              <th className="p-1.5 border border-slate-300 sticky top-[30px] bg-[#f8f9fa] text-slate-700">전년</th>
              <th className="p-1.5 border border-slate-300 sticky top-[30px] bg-[#f8f9fa] text-slate-700">달성율</th>
              <th className="p-1.5 border border-slate-300 sticky top-[30px] bg-[#f8f9fa] text-slate-700">증감율</th>
            </tr>
          </thead>
          <tbody>
            {data && data.length > 0 ? renderRows() : (
              <tr>
                <td colSpan={22} className="p-8 text-center text-slate-500 bg-white">
                  데이터가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {validationMaster && (
        <div className={`p-2 border-t border-slate-300 font-bold flex justify-between items-center z-10 shrink-0 text-xs ${
          validationMaster.isZeroVariance ? 'bg-[#e8f5e9] text-[#2e7d32]' : 'bg-[#ffebee] text-[#c62828]'
        }`}>
          <div className="flex items-center gap-4">
            <span>
              {validationMaster.isZeroVariance ? '✅ Zero-Variance 검증 통과' : '🚨 [무결성 에러]'}
            </span>
            <span className="opacity-80">
              원천 장부 합계: ₩{formatRevenue(validationMaster.originalTotal)} / 
              대시보드 총액: ₩{formatRevenue(validationMaster.payloadTotal)}
            </span>
          </div>
          <div className="bg-white/60 px-3 py-1 rounded border border-black/10">
            오차 (Variance): ₩{formatRevenue(validationMaster.variance)}
          </div>
        </div>
      )}
    </div>
  );
}
