import React, { useState, useEffect } from 'react';
import { useDate } from '../../contexts/DateContext';
import { secureFetcher } from '../../lib/secureFetcher';
import { getLatestClosedDateStr } from '../../lib/dateUtils';

// --- 1. 백엔드(SSOT) 명세에 대한 정의 ---
interface RevenueMetrics {
  todayActual: number;
  todayLy: number;
  todayGrowth: number;
  mtdActual: number;
  mtdLy: number;
  mtdGrowth: number;
  ytdActual: number;
  ytdLy: number;
  ytdGrowth: number;
}

interface Ticket extends RevenueMetrics {
  ticketName: string;
}

interface Venue {
  venueName: string;
  tickets: Ticket[];
  venueSubtotal: RevenueMetrics;
}

interface Part {
  partName: string;
  venues: Venue[];
  partSubtotal: RevenueMetrics;
  part_subtotal?: RevenueMetrics; // 백엔드 호환용
}

interface Division {
  orgDivision: string;
  parts?: Part[];
  venues?: Venue[];
  divisionSubtotal: RevenueMetrics;
}

interface V6ApiResponse {
  grandTotal: RevenueMetrics;
  divisions: Division[];
}

// --- 2. 유틸리티 함수 ---
const formatNum = (num: number | undefined | null) => {
  if (num === undefined || num === null || isNaN(num)) return '-';
  return new Intl.NumberFormat('ko-KR').format(num);
};

const formatGrowth = (num: number | undefined | null, isDark = false) => {
  if (num === undefined || num === null || isNaN(num)) {
    return <span className={isDark ? "text-white/40" : "text-[#A0AEC0]"}>-</span>;
  }
  const formatted = Math.abs(num).toFixed(1) + '%';
  if (num > 0) {
    return (
      <span className={isDark ? "text-[#5EEAD4] font-black" : "text-[#059669] font-black"}>
        ▲ {formatted}
      </span>
    );
  }
  if (num < 0) {
    return (
      <span className={isDark ? "text-[#FDA4AF] font-black" : "text-[#DC2626] font-black"}>
        ▼ {formatted}
      </span>
    );
  }
  return <span className={isDark ? "text-white/50" : "text-[#8A9B93]"}>{formatted}</span>;
};

const getVenueMetrics = (venue: any): RevenueMetrics => {
  // 프론트 연산(reduce) 철거: 백엔드가 내려주는 venueSubtotal 객체를 1:1 바인딩
  return venue.venueSubtotal || {
    todayActual: 0, todayLy: 0, todayGrowth: 0,
    mtdActual: 0, mtdLy: 0, mtdGrowth: 0,
    ytdActual: 0, ytdLy: 0, ytdGrowth: 0
  };
};

export default function V6DashboardViewer() {
  const [data, setData] = useState<V6ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { startDate, endDate, isRange } = useDate();
  const isRangeMode = Boolean(isRange && endDate && startDate !== endDate);

  // --- 3. V6 라이브 API 직접 연동 (Zero-Proxy) ---
  useEffect(() => {
    const fetchV6Data = async () => {
      setLoading(true);
      setError(null);
      try {
        const latestClosed = getLatestClosedDateStr();
        const query = isRangeMode
          ? `startDate=${startDate || latestClosed}&endDate=${endDate || latestClosed}&_t=${Date.now()}`
          : `date=${startDate || latestClosed}&_t=${Date.now()}`;
        const res = await secureFetcher(`https://belleforet-data.vercel.app/api/v6/dashboard/revenue-by-org?${query}`);
        setData(res?.data || res);
      } catch (err: any) {
        setError(err.message || '데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchV6Data();
  }, [startDate, endDate, isRange]);

  if (loading) {
    return (
      <div className="p-8 font-bold text-[#5A6B63] flex flex-col items-center justify-center gap-3 h-48 bg-white rounded-2xl">
        <div className="w-8 h-8 border-4 border-[#284F42] border-t-transparent rounded-full animate-spin" />
        <span>V6 조직 정산 데이터를 실시간 동기화하는 중입니다...</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-6 text-[#8B2635] font-bold bg-[#FDF0ED] border border-[#EAC5BD] rounded-2xl">
        정산 데이터를 불러오는 중 오류가 발생했습니다: {error}
      </div>
    );
  }
  if (!data || !data.divisions) {
    return (
      <div className="p-8 text-[#5A6B63] font-bold bg-[#FAF9F6] border border-[#D0C6BB]/60 rounded-2xl text-center">
        표시할 정산 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="w-full overflow-auto max-h-[calc(100vh-240px)] rounded-2xl border border-[#D0C6BB]/80 shadow-[0_4px_24px_rgba(27,56,46,0.06)] bg-white">
      <table className="w-full border-collapse text-sm text-left whitespace-nowrap min-w-[1280px]">
        <thead className="sticky top-0 z-20 shadow-md">
          {/* 그룹 헤더 */}
          <tr className="text-white text-center">
            <th className="px-4 py-3.5 border-r border-white/15 border-b border-white/20 bg-[#1B382E] font-black text-xs sm:text-sm tracking-wider" rowSpan={2}>대분류</th>
            <th className="px-4 py-3.5 border-r border-white/15 border-b border-white/20 bg-[#1B382E] font-black text-xs sm:text-sm tracking-wider" rowSpan={2}>파트</th>
            <th className="px-4 py-3.5 border-r-2 border-[#0F291E] border-b border-white/20 bg-[#1B382E] font-black text-xs sm:text-sm tracking-wider" rowSpan={2}>영업장</th>
            
            <th className="px-3 py-3 border-r-2 border-[#0F291E] border-b border-white/20 bg-[#284F42] text-white font-black text-xs sm:text-sm tracking-wide" colSpan={3}>
              <div className="flex items-center justify-center gap-1.5">
                <span>{isRangeMode ? '선택 기간 실적 (Period)' : '당일 실적 (Today)'}</span>
              </div>
            </th>
            <th className="px-3 py-3 border-r-2 border-[#0F291E] border-b border-white/20 bg-[#214338] text-white font-black text-xs sm:text-sm tracking-wide" colSpan={3}>
              <div className="flex items-center justify-center gap-1.5">
                <span>당월 누계 (MTD)</span>
              </div>
            </th>
            <th className="px-3 py-3 border-b border-white/20 bg-[#152E25] text-[#F4E8D1] font-black text-xs sm:text-sm tracking-wide" colSpan={3}>
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-[#B59269]">★</span>
                <span>올해 누계 (YTD)</span>
              </div>
            </th>
          </tr>
          {/* 하위 컬럼 헤더 */}
          <tr className="text-xs font-bold text-center">
            {/* Today */}
            <th className="px-2.5 py-2.5 border-r border-b border-[#D0C6BB]/80 bg-[#F0F5F2] text-[#1B382E] font-bold">{isRangeMode ? '올해 기간' : '올해 당일'}</th>
            <th className="px-2.5 py-2.5 border-r border-b border-[#D0C6BB]/80 bg-[#F0F5F2] text-[#5A6B63] font-medium">{isRangeMode ? '전년 동기간' : '전년 당일'}</th>
            <th className="px-2.5 py-2.5 border-r-2 border-b border-[#D0C6BB] bg-[#E3EBE7] text-[#1E523F] font-bold">증감(%)</th>
            
            {/* MTD */}
            <th className="px-2.5 py-2.5 border-r border-b border-[#D0C6BB]/80 bg-[#FAF9F6] text-[#1B382E] font-bold">올해 당월</th>
            <th className="px-2.5 py-2.5 border-r border-b border-[#D0C6BB]/80 bg-[#FAF9F6] text-[#5A6B63] font-medium">전년 당월</th>
            <th className="px-2.5 py-2.5 border-r-2 border-b border-[#D0C6BB] bg-[#F0EFEA] text-[#1E523F] font-bold">증감(%)</th>
            
            {/* YTD */}
            <th className="px-2.5 py-2.5 border-r border-b border-[#D0C6BB]/80 bg-[#FAF6ED] text-[#1B382E] font-black">올해 누적</th>
            <th className="px-2.5 py-2.5 border-r border-b border-[#D0C6BB]/80 bg-[#FAF6ED] text-[#5A6B63] font-medium">전년 누적</th>
            <th className="px-2.5 py-2.5 border-b border-[#D0C6BB]/80 bg-[#F2EDE1] text-[#8C6D3B] font-black">증감(%)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E2DDD6]/70">
          {/* --- 4. 계층형 데이터 순회 및 렌더링 --- */}
          {data.divisions.map((division, divIdx) => {
            const parts = division.parts || [];
            
            // 본부 RowSpan 계산: 각 파트마다 (venues 수 + 파트 소계 1줄), 그리고 본부 소계 1줄
            let divisionRowSpan = 1; // 본부 소계용 1줄
            parts.forEach(part => {
              divisionRowSpan += (part.venues?.length || 0) + 1;
            });

            return (
              <React.Fragment key={`div-${divIdx}`}>
                {parts.map((part, partIdx) => {
                  const partRowSpan = (part.venues?.length || 0) + 1;

                  return (
                    <React.Fragment key={`div-${divIdx}-part-${partIdx}`}>
                      {part.venues.map((venue, venueIdx) => {
                        const metrics = getVenueMetrics(venue);
                        const isFirstOfDivision = partIdx === 0 && venueIdx === 0;
                        const isFirstOfPart = venueIdx === 0;

                        return (
                          <tr key={`div-${divIdx}-part-${partIdx}-ven-${venueIdx}`} className="bg-white hover:bg-[#FAF9F6] transition-colors">
                            {isFirstOfDivision && (
                              <td
                                rowSpan={divisionRowSpan}
                                className="px-3 py-4 bg-[#F8F7F4] font-black text-sm lg:text-[15px] align-middle text-center border-r-2 border-b border-[#D0C6BB]/80 text-[#1B382E] tracking-tight"
                              >
                                <div className="flex flex-col items-center justify-center gap-1.5">
                                  <span className="font-extrabold text-[#1B382E] text-sm lg:text-[15px] tracking-tight leading-snug">
                                    {division.orgDivision}
                                  </span>
                                </div>
                              </td>
                            )}
                            {isFirstOfPart && (
                              <td
                                rowSpan={partRowSpan}
                                className="px-3 py-3 bg-[#FCFBF9] font-bold text-xs lg:text-sm align-middle text-center border-r border-b border-[#D0C6BB]/70 text-[#284F42] tracking-tight"
                              >
                                {part.partName}
                              </td>
                            )}
                            
                            <td className="px-3.5 py-2.5 font-medium align-middle text-left border-r-2 border-b border-[#D0C6BB]/70 text-[#334155] text-xs">
                              {venue.venueName}
                            </td>
                            
                            {/* Today */}
                            <td className="px-3 py-2.5 text-right font-financial font-extrabold text-xs text-[#1B382E] border-r border-b border-[#D0C6BB]/50">{formatNum(metrics.todayActual)}</td>
                            <td className="px-3 py-2.5 text-right font-financial text-xs text-[#6C7A73] border-r border-b border-[#D0C6BB]/50">{formatNum(metrics.todayLy)}</td>
                            <td className="px-2.5 py-2.5 text-right font-financial text-xs border-r-2 border-[#D0C6BB] border-b border-[#D0C6BB]/50 bg-[#F4F3EE]/30">{formatGrowth(metrics.todayGrowth)}</td>
                            
                            {/* MTD */}
                            <td className="px-3 py-2.5 text-right font-financial font-extrabold text-xs text-[#1B382E] border-r border-b border-[#D0C6BB]/50">{formatNum(metrics.mtdActual)}</td>
                            <td className="px-3 py-2.5 text-right font-financial text-xs text-[#6C7A73] border-r border-b border-[#D0C6BB]/50">{formatNum(metrics.mtdLy)}</td>
                            <td className="px-2.5 py-2.5 text-right font-financial text-xs border-r-2 border-[#D0C6BB] border-b border-[#D0C6BB]/50 bg-[#F4F3EE]/30">{formatGrowth(metrics.mtdGrowth)}</td>
                            
                            {/* YTD */}
                            <td className="px-3 py-2.5 text-right font-financial font-black text-xs text-[#1B382E] border-r border-b border-[#D0C6BB]/50">{formatNum(metrics.ytdActual)}</td>
                            <td className="px-3 py-2.5 text-right font-financial text-xs text-[#6C7A73] border-r border-b border-[#D0C6BB]/50">{formatNum(metrics.ytdLy)}</td>
                            <td className="px-2.5 py-2.5 text-right font-financial text-xs border-b border-[#D0C6BB]/50 bg-[#FAF6ED]/50">{formatGrowth(metrics.ytdGrowth)}</td>
                          </tr>
                        );
                      })}
                      
                      {/* 파트별 소계 (API 완제품 바인딩) */}
                      <tr className="bg-[#F7F5F0] hover:bg-[#EFECE5] text-[#1B382E] font-bold border-b border-[#D0C6BB]/80 transition-colors">
                        <td className="px-3 py-2.5 border-r-2 border-b border-[#D0C6BB]/70 text-center text-xs font-bold text-[#5A6B63] bg-[#EFECE5]/60" colSpan={1}>
                          [{part.partName}] 소계
                        </td>
                        
                        {/* Today */}
                        <td className="px-3 py-2.5 text-right font-financial font-bold text-xs border-r border-b border-[#D0C6BB]/60 text-[#1B382E]">{formatNum(part.partSubtotal?.todayActual || part.part_subtotal?.todayActual)}</td>
                        <td className="px-3 py-2.5 text-right font-financial text-xs border-r border-b border-[#D0C6BB]/60 text-[#6C7A73]">{formatNum(part.partSubtotal?.todayLy || part.part_subtotal?.todayLy)}</td>
                        <td className="px-2.5 py-2.5 text-right font-financial text-xs border-r-2 border-[#D0C6BB] border-b border-[#D0C6BB]/60 bg-[#E8E5DD]/50">{formatGrowth(part.partSubtotal?.todayGrowth || part.part_subtotal?.todayGrowth)}</td>
                        
                        {/* MTD */}
                        <td className="px-3 py-2.5 text-right font-financial font-bold text-xs border-r border-b border-[#D0C6BB]/60 text-[#1B382E]">{formatNum(part.partSubtotal?.mtdActual || part.part_subtotal?.mtdActual)}</td>
                        <td className="px-3 py-2.5 text-right font-financial text-xs border-r border-b border-[#D0C6BB]/60 text-[#6C7A73]">{formatNum(part.partSubtotal?.mtdLy || part.part_subtotal?.mtdLy)}</td>
                        <td className="px-2.5 py-2.5 text-right font-financial text-xs border-r-2 border-[#D0C6BB] border-b border-[#D0C6BB]/60 bg-[#E8E5DD]/50">{formatGrowth(part.partSubtotal?.mtdGrowth || part.part_subtotal?.mtdGrowth)}</td>
                        
                        {/* YTD */}
                        <td className="px-3 py-2.5 text-right font-financial font-black text-xs border-r border-b border-[#D0C6BB]/60 text-[#1B382E]">{formatNum(part.partSubtotal?.ytdActual || part.part_subtotal?.ytdActual)}</td>
                        <td className="px-3 py-2.5 text-right font-financial text-xs border-r border-b border-[#D0C6BB]/60 text-[#6C7A73]">{formatNum(part.partSubtotal?.ytdLy || part.part_subtotal?.ytdLy)}</td>
                        <td className="px-2.5 py-2.5 text-right font-financial text-xs border-b border-[#D0C6BB]/60 bg-[#FAF6ED]/70">{formatGrowth(part.partSubtotal?.ytdGrowth || part.part_subtotal?.ytdGrowth)}</td>
                      </tr>
                    </React.Fragment>
                  );
                })}
                
                {/* 본부별 소계 */}
                <tr className="bg-[#ECE7DC] hover:bg-[#E3DDCF] text-[#1B382E] font-black border-y-2 border-[#B59269]/70 transition-colors shadow-2xs">
                  <td className="px-4 py-3 border-r-2 border-b border-[#B59269]/70 text-center text-xs sm:text-sm font-black text-[#1B382E] bg-[#E2DBD0]/80 tracking-wide" colSpan={2}>
                    [{division.orgDivision}] 총계
                  </td>
                  {/* Today */}
                  <td className="px-3 py-3 text-right font-financial font-black text-xs sm:text-[13px] border-r border-b border-[#B59269]/60 text-[#1B382E]">{formatNum(division.divisionSubtotal?.todayActual)}</td>
                  <td className="px-3 py-3 text-right font-financial font-semibold text-xs sm:text-[13px] border-r border-b border-[#B59269]/60 text-[#475569]">{formatNum(division.divisionSubtotal?.todayLy)}</td>
                  <td className="px-2.5 py-3 text-right font-financial font-black text-xs sm:text-[13px] border-r-2 border-[#9F8A74] border-b border-[#B59269]/60 bg-[#D9D1C3]/60">{formatGrowth(division.divisionSubtotal?.todayGrowth)}</td>
                  
                  {/* MTD */}
                  <td className="px-3 py-3 text-right font-financial font-black text-xs sm:text-[13px] border-r border-b border-[#B59269]/60 text-[#1B382E]">{formatNum(division.divisionSubtotal?.mtdActual)}</td>
                  <td className="px-3 py-3 text-right font-financial font-semibold text-xs sm:text-[13px] border-r border-b border-[#B59269]/60 text-[#475569]">{formatNum(division.divisionSubtotal?.mtdLy)}</td>
                  <td className="px-2.5 py-3 text-right font-financial font-black text-xs sm:text-[13px] border-r-2 border-[#9F8A74] border-b border-[#B59269]/60 bg-[#D9D1C3]/60">{formatGrowth(division.divisionSubtotal?.mtdGrowth)}</td>
                  
                  {/* YTD */}
                  <td className="px-3 py-3 text-right font-financial font-black text-xs sm:text-[13px] border-r border-b border-[#B59269]/60 text-[#1B382E]">{formatNum(division.divisionSubtotal?.ytdActual)}</td>
                  <td className="px-3 py-3 text-right font-financial font-semibold text-xs sm:text-[13px] border-r border-b border-[#B59269]/60 text-[#475569]">{formatNum(division.divisionSubtotal?.ytdLy)}</td>
                  <td className="px-2.5 py-3 text-right font-financial font-black text-xs sm:text-[13px] border-b border-[#B59269]/60 bg-[#E8DFC9]/70">{formatGrowth(division.divisionSubtotal?.ytdGrowth)}</td>
                </tr>
              </React.Fragment>
            );
          })}
          
          {/* --- 5. 전사 총계 (Deep Forest Bento) --- */}
          <tr className="bg-[#1B382E] text-white font-black text-sm border-t-2 border-[#0F291E] shadow-xl sticky bottom-0 z-10">
            <td className="px-4 py-4 text-center border-r-2 border-[#0F291E] tracking-wider text-white text-sm sm:text-base font-black bg-[#163228]" colSpan={3}>
              <div className="flex items-center justify-center gap-2">
                <span className="text-[#E8D7B8]">◆</span>
                <span>전사 총합계 (Grand Total)</span>
              </div>
            </td>
            
            {/* Today */}
            <td className="px-3 py-4 text-right font-financial font-black border-r border-[#284F42] text-white text-[14px]">{formatNum(data.grandTotal?.todayActual)}</td>
            <td className="px-3 py-4 text-right font-financial border-r border-[#284F42] text-white/70 text-xs sm:text-[13px]">{formatNum(data.grandTotal?.todayLy)}</td>
            <td className="px-2.5 py-4 text-right font-financial border-r-2 border-[#0F291E] bg-[#12271F]">{formatGrowth(data.grandTotal?.todayGrowth, true)}</td>
            
            {/* MTD */}
            <td className="px-3 py-4 text-right font-financial font-black border-r border-[#284F42] text-white text-[14px]">{formatNum(data.grandTotal?.mtdActual)}</td>
            <td className="px-3 py-4 text-right font-financial border-r border-[#284F42] text-white/70 text-xs sm:text-[13px]">{formatNum(data.grandTotal?.mtdLy)}</td>
            <td className="px-2.5 py-4 text-right font-financial border-r-2 border-[#0F291E] bg-[#12271F]">{formatGrowth(data.grandTotal?.mtdGrowth, true)}</td>
            
            {/* YTD */}
            <td className="px-3 py-4 text-right font-financial font-black border-r border-[#284F42] text-[#F4E8D1] text-[15px]">{formatNum(data.grandTotal?.ytdActual)}</td>
            <td className="px-3 py-4 text-right font-financial border-r border-[#284F42] text-white/70 text-xs sm:text-[13px]">{formatNum(data.grandTotal?.ytdLy)}</td>
            <td className="px-2.5 py-4 text-right font-financial bg-[#12271F]">{formatGrowth(data.grandTotal?.ytdGrowth, true)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
