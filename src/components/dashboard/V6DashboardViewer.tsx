import React, { useState, useEffect } from 'react';
import { useDate } from '../../contexts/DateContext';

// --- 1. 백엔드(SSOT) 명세서 타입 정의 ---
interface RevenueMetrics {
  dailyRevenue: number;
  mtdRevenue: number;
  ytdRevenue: number;
  lyRevenue: number;
}

interface Venue extends RevenueMetrics {
  venueName: string;
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

// --- 2. 숫자 포맷터 ---
const formatNum = (num: number | undefined | null) => {
  if (num === undefined || num === null || isNaN(num)) return '-';
  return new Intl.NumberFormat('ko-KR').format(num);
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

  if (loading) return <div className="p-4 font-bold text-slate-600 flex items-center justify-center h-40">V6 0-Variance 엔진 데이터 동기화 중...</div>;
  if (error) return <div className="p-4 text-red-600 font-bold bg-red-50 rounded-lg">🚨 렌더링 중단: {error} (데이터 무결성 오류)</div>;
  if (!data || !data.divisions) return <div className="p-4 text-red-600 font-bold">🚨 API 응답 규격 위반</div>;

  return (
    <div className="w-full">
      <table className="w-full border-collapse text-sm text-left">
        <thead className="bg-slate-50 text-slate-600 font-medium border-b border-t border-slate-200">
          <tr>
            <th className="px-4 py-3 font-semibold border-x border-slate-200">대분류</th>
            <th className="px-4 py-3 font-semibold border-x border-slate-200">영업장</th>
            <th className="px-4 py-3 font-semibold text-right border-x border-slate-200">당일 매출</th>
            <th className="px-4 py-3 font-semibold text-right border-x border-slate-200 text-blue-700">당월 누계(MTD)</th>
            <th className="px-4 py-3 font-semibold text-right border-x border-slate-200 text-indigo-700">연 누계(YTD)</th>
            <th className="px-4 py-3 font-semibold text-right border-x border-slate-200 text-slate-400">전년 동기(LY)</th>
          </tr>
        </thead>
        <tbody>
          {/* --- 4. 계층형 데이터 순회 및 렌더링 --- */}
          {data.divisions.map((division, divIdx) => {
            const divisionRowSpan = division.venues.length + 1;

            return (
              <React.Fragment key={`div-${divIdx}`}>
                {division.venues.map((venue, venueIdx) => (
                  <tr key={`div-${divIdx}-ven-${venueIdx}`} className="hover:bg-slate-50 transition-colors">
                    {/* 본부 첫 번째 줄에만 Cell 렌더링 및 병합 */}
                    {venueIdx === 0 && (
                      <td rowSpan={divisionRowSpan} className="px-4 py-3 bg-slate-50 font-bold align-top border border-slate-200 text-slate-800">
                        {division.orgDivision}
                      </td>
                    )}
                    
                    <td className="px-4 py-3 font-medium align-top border border-slate-200 text-slate-700">
                      {venue.venueName}
                    </td>
                    
                    <td className="px-4 py-3 text-right font-mono border border-slate-200">{formatNum(venue.dailyRevenue)}</td>
                    <td className="px-4 py-3 text-right font-mono border border-slate-200 text-blue-700 bg-blue-50/10">{formatNum(venue.mtdRevenue)}</td>
                    <td className="px-4 py-3 text-right font-mono border border-slate-200 text-indigo-700 bg-indigo-50/10">{formatNum(venue.ytdRevenue)}</td>
                    <td className="px-4 py-3 text-right font-mono border border-slate-200 text-slate-500">{formatNum(venue.lyRevenue)}</td>
                  </tr>
                ))}
                
                {/* 본부별 소계 */}
                <tr className="bg-indigo-50 text-indigo-900 font-bold border-b border-slate-200">
                  <td className="px-4 py-3 border border-slate-200" colSpan={1}>[{division.orgDivision}] 소계</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-900 border border-slate-200">{formatNum(division.divisionSubtotal.dailyRevenue)}</td>
                  <td className="px-4 py-3 text-right font-mono text-blue-800 border border-slate-200">{formatNum(division.divisionSubtotal.mtdRevenue)}</td>
                  <td className="px-4 py-3 text-right font-mono text-indigo-800 border border-slate-200">{formatNum(division.divisionSubtotal.ytdRevenue)}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-600 border border-slate-200">{formatNum(division.divisionSubtotal.lyRevenue)}</td>
                </tr>
              </React.Fragment>
            );
          })}
          
          {/* --- 5. 전사 총계 --- */}
          <tr className="bg-slate-800 text-white font-bold text-base">
            <td className="px-4 py-4 text-center border border-slate-700 tracking-wider" colSpan={2}>전사 총계</td>
            <td className="px-4 py-4 text-right font-mono border border-slate-700 text-lg">{formatNum(data.grandTotal.dailyRevenue)}</td>
            <td className="px-4 py-4 text-right font-mono border border-slate-700 text-lg text-blue-300">{formatNum(data.grandTotal.mtdRevenue)}</td>
            <td className="px-4 py-4 text-right font-mono border border-slate-700 text-lg text-indigo-300">{formatNum(data.grandTotal.ytdRevenue)}</td>
            <td className="px-4 py-4 text-right font-mono border border-slate-700 text-lg text-slate-300">{formatNum(data.grandTotal.lyRevenue)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
