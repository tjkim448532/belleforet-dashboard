import React, { useState, useEffect } from 'react';
import { useDate } from '../../contexts/DateContext';

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
}

interface Division {
  orgDivision: string;
  venues: Venue[];
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

const formatGrowth = (num: number | undefined | null) => {
  if (num === undefined || num === null || isNaN(num)) return '-';
  const formatted = num.toFixed(1) + '%';
  if (num > 0) return <span className="text-red-500 font-bold">▲ {formatted}</span>;
  if (num < 0) return <span className="text-blue-500 font-bold">▼ {Math.abs(num).toFixed(1)}%</span>;
  return <span className="text-slate-400">{formatted}</span>;
};

export default function V6DashboardViewer() {
  const [data, setData] = useState<V6ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { startDate, endDate, isRange } = useDate();

  // --- 3. V6 라이브 API 직접 연동 (Zero-Proxy) ---
  useEffect(() => {
    const fetchV6Data = async () => {
      setLoading(true);
      setError(null);
      try {
        const targetEndDate = isRange && endDate ? endDate : startDate;
        const res = await fetch(`https://belleforet-data.vercel.app/api/v6/dashboard/revenue-by-org?startDate=${startDate}&endDate=${targetEndDate}`);
        if (!res.ok) throw new Error(`HTTP 통신 에러: ${res.status}`);
        
        const json = await res.json();
        setData(json.data || json);
      } catch (err: any) {
        setError(err.message || '데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchV6Data();
  }, [startDate, endDate, isRange]);

  if (loading) return <div className="p-4 font-bold text-slate-600 flex items-center justify-center h-40">V6 0-Variance 통합 데이터 동기화 중...</div>;
  if (error) return <div className="p-4 text-red-600 font-bold bg-red-50 rounded-lg">뷰어 렌더링 중단: {error} (데이터 무결성 오류)</div>;
  if (!data || !data.divisions) return <div className="p-4 text-red-600 font-bold">API 응답 규격 위반 (divisions 없음)</div>;

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-sm text-left whitespace-nowrap min-w-[1200px]">
        <thead className="bg-slate-50 text-slate-700 font-bold border-b border-t border-slate-200 text-center">
          {/* 그룹 헤더 (3개의 파트로 분리) */}
          <tr>
            <th className="px-4 py-2 border-x border-slate-200 border-b" rowSpan={2}>대분류</th>
            <th className="px-4 py-2 border-x border-slate-200 border-b" rowSpan={2}>영업장 (상품/티켓)</th>
            
            <th className="px-4 py-2 border-x border-slate-300 border-b bg-emerald-50/50 text-emerald-800" colSpan={3}>당일 실적 (Today)</th>
            <th className="px-4 py-2 border-x border-slate-300 border-b bg-blue-50/50 text-blue-800" colSpan={3}>당월 누계 (MTD)</th>
            <th className="px-4 py-2 border-x border-slate-300 border-b bg-indigo-50/50 text-indigo-800" colSpan={3}>올해 누계 (YTD)</th>
          </tr>
          {/* 하위 컬럼 헤더 */}
          <tr className="bg-slate-100/50 text-xs text-slate-600">
            {/* Today */}
            <th className="px-3 py-2 border-x border-slate-200">올해 당일</th>
            <th className="px-3 py-2 border-x border-slate-200">전년 당일</th>
            <th className="px-3 py-2 border-x border-slate-300">증감(%)</th>
            
            {/* MTD */}
            <th className="px-3 py-2 border-x border-slate-200">올해 당월</th>
            <th className="px-3 py-2 border-x border-slate-200">전년 당월</th>
            <th className="px-3 py-2 border-x border-slate-300">증감(%)</th>
            
            {/* YTD */}
            <th className="px-3 py-2 border-x border-slate-200">올해 누적</th>
            <th className="px-3 py-2 border-x border-slate-200">전년 누적</th>
            <th className="px-3 py-2 border-x border-slate-300">증감(%)</th>
          </tr>
        </thead>
        <tbody>
          {/* --- 4. 계층형 데이터 순회 및 렌더링 --- */}
          {data.divisions.map((division, divIdx) => {
            const divisionRowSpan = division.venues.reduce((acc, v) => acc + (v.tickets ? v.tickets.length : 0), 0) + 1;

            return (
              <React.Fragment key={`div-${divIdx}`}>
                {division.venues.map((venue, venueIdx) => {
                  return venue.tickets.map((ticket, ticketIdx) => {
                    const isFirstVenueAndTicket = venueIdx === 0 && ticketIdx === 0;
                    return (
                      <tr key={`div-${divIdx}-ven-${venueIdx}-tkt-${ticketIdx}`} className="hover:bg-slate-50 transition-colors">
                        {isFirstVenueAndTicket && (
                          <td rowSpan={divisionRowSpan} className="px-4 py-3 bg-slate-50 font-bold align-top border border-slate-200 text-slate-800">
                            {division.orgDivision}
                          </td>
                        )}
                        
                        <td className="px-4 py-3 font-medium align-top border border-slate-200 text-slate-700">
                          {venue.venueName} <span className="text-xs text-slate-400 font-normal ml-1">({ticket.ticketName})</span>
                        </td>
                        
                        {/* Today */}
                        <td className="px-3 py-3 text-right font-mono border border-slate-200">{formatNum(ticket.todayActual)}</td>
                        <td className="px-3 py-3 text-right font-mono border border-slate-200 text-slate-500">{formatNum(ticket.todayLy)}</td>
                        <td className="px-3 py-3 text-right font-mono border-r border-slate-300 bg-slate-50/50">{formatGrowth(ticket.todayGrowth)}</td>
                        
                        {/* MTD */}
                        <td className="px-3 py-3 text-right font-mono border border-slate-200 text-blue-800">{formatNum(ticket.mtdActual)}</td>
                        <td className="px-3 py-3 text-right font-mono border border-slate-200 text-slate-500">{formatNum(ticket.mtdLy)}</td>
                        <td className="px-3 py-3 text-right font-mono border-r border-slate-300 bg-blue-50/10">{formatGrowth(ticket.mtdGrowth)}</td>
                        
                        {/* YTD */}
                        <td className="px-3 py-3 text-right font-mono border border-slate-200 text-indigo-800">{formatNum(ticket.ytdActual)}</td>
                        <td className="px-3 py-3 text-right font-mono border border-slate-200 text-slate-500">{formatNum(ticket.ytdLy)}</td>
                        <td className="px-3 py-3 text-right font-mono border-r border-slate-300 bg-indigo-50/10">{formatGrowth(ticket.ytdGrowth)}</td>
                      </tr>
                    );
                  });
                })}
                
                {/* 본부별 소계 */}
                <tr className="bg-slate-100 text-slate-900 font-bold border-b-2 border-slate-300">
                  <td className="px-4 py-3 border border-slate-300 text-center" colSpan={1}>[{division.orgDivision}] 소계</td>
                  {/* Today */}
                  <td className="px-3 py-3 text-right font-mono border border-slate-300">{formatNum(division.divisionSubtotal?.todayActual)}</td>
                  <td className="px-3 py-3 text-right font-mono border border-slate-300 text-slate-600">{formatNum(division.divisionSubtotal?.todayLy)}</td>
                  <td className="px-3 py-3 text-right font-mono border-r-2 border-slate-400 bg-slate-200/50">{formatGrowth(division.divisionSubtotal?.todayGrowth)}</td>
                  
                  {/* MTD */}
                  <td className="px-3 py-3 text-right font-mono text-blue-900 border border-slate-300">{formatNum(division.divisionSubtotal?.mtdActual)}</td>
                  <td className="px-3 py-3 text-right font-mono border border-slate-300 text-slate-600">{formatNum(division.divisionSubtotal?.mtdLy)}</td>
                  <td className="px-3 py-3 text-right font-mono border-r-2 border-slate-400 bg-blue-100/50">{formatGrowth(division.divisionSubtotal?.mtdGrowth)}</td>
                  
                  {/* YTD */}
                  <td className="px-3 py-3 text-right font-mono text-indigo-900 border border-slate-300">{formatNum(division.divisionSubtotal?.ytdActual)}</td>
                  <td className="px-3 py-3 text-right font-mono border border-slate-300 text-slate-600">{formatNum(division.divisionSubtotal?.ytdLy)}</td>
                  <td className="px-3 py-3 text-right font-mono border-r-2 border-slate-400 bg-indigo-100/50">{formatGrowth(division.divisionSubtotal?.ytdGrowth)}</td>
                </tr>
              </React.Fragment>
            );
          })}
          
          {/* --- 5. 전사 총계 --- */}
          <tr className="bg-slate-800 text-white font-bold text-base border-t-4 border-slate-900">
            <td className="px-4 py-5 text-center border border-slate-700 tracking-wider" colSpan={2}>전사 총합계 (Grand Total)</td>
            
            {/* Today */}
            <td className="px-3 py-5 text-right font-mono border border-slate-700 text-[15px]">{formatNum(data.grandTotal?.todayActual)}</td>
            <td className="px-3 py-5 text-right font-mono border border-slate-700 text-slate-400">{formatNum(data.grandTotal?.todayLy)}</td>
            <td className="px-3 py-5 text-right font-mono border-r-2 border-slate-500 bg-slate-700/50">{formatGrowth(data.grandTotal?.todayGrowth)}</td>
            
            {/* MTD */}
            <td className="px-3 py-5 text-right font-mono border border-slate-700 text-[15px] text-blue-300">{formatNum(data.grandTotal?.mtdActual)}</td>
            <td className="px-3 py-5 text-right font-mono border border-slate-700 text-slate-400">{formatNum(data.grandTotal?.mtdLy)}</td>
            <td className="px-3 py-5 text-right font-mono border-r-2 border-slate-500 bg-slate-700/50">{formatGrowth(data.grandTotal?.mtdGrowth)}</td>
            
            {/* YTD */}
            <td className="px-3 py-5 text-right font-mono border border-slate-700 text-[15px] text-indigo-300">{formatNum(data.grandTotal?.ytdActual)}</td>
            <td className="px-3 py-5 text-right font-mono border border-slate-700 text-slate-400">{formatNum(data.grandTotal?.ytdLy)}</td>
            <td className="px-3 py-5 text-right font-mono border-r-2 border-slate-500 bg-slate-700/50">{formatGrowth(data.grandTotal?.ytdGrowth)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
