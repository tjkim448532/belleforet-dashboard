import React, { useState, useEffect } from 'react';
import { useDate } from '../../contexts/DateContext';

// --- 1. 백엔드(SSOT) 명세서 타입 정의 ---
interface Ticket {
  ticketName: string;
  revenue: number;
}
interface Venue {
  venueName: string;
  tickets?: Ticket[];
  ticketGroup?: string;
  revenue?: number;
  venueSubtotal: number;
}
interface Division {
  orgDivision: string;
  venues: Venue[];
  divisionSubtotal: number;
}
interface V6ApiResponse {
  grandTotal: number;
  divisions: Division[];
}

// --- 2. 숫자 포맷터 (₩ 기호 배제, #,##0 서식 강제) ---
const formatNum = (num: number) => new Intl.NumberFormat('ko-KR').format(num);

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
        // Vercel 서버의 최신 V6 API 엔드포인트 직접 호출
        const res = await fetch(`https://belleforet-data.vercel.app/api/v6/dashboard/revenue-by-org?startDate=${startDate}&endDate=${targetEndDate}`);
        if (!res.ok) throw new Error(`HTTP 통신 에러: ${res.status}`);
        
        const json = await res.json();
        // 백엔드 데이터를 100% 맹신하여 상태에 주입 (프론트엔드 자체 합산 전면 금지)
        setData(json.data || json);
      } catch (err: any) {
        // 에러 발생 시 미분류로 숨기지 않고 명시적으로 표출 (본부장님 절대 룰)
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
            <th className="px-4 py-3 font-semibold text-right border-x border-slate-200">매출액</th>
          </tr>
        </thead>
        <tbody>
          {/* --- 4. 계층형 데이터 순회 및 동적 RowSpan 렌더링 --- */}
          {data.divisions.map((division, divIdx) => {
            // 본부별 RowSpan 계산 = (영업장별 티켓 개수의 합) + 1 (본부 소계용 Row)
            const divisionRowSpan = division.venues.reduce((acc, v) => acc + (v.tickets?.length || 1), 0) + 1;

            return (
              <React.Fragment key={`div-${divIdx}`}>
                {division.venues.map((venue, venueIdx) => {
                  const tickets = venue.tickets && venue.tickets.length > 0
                    ? venue.tickets
                    : [{ ticketName: venue.ticketGroup || '-', revenue: venue.revenue || 0 }];
                  const venueRowSpan = tickets.length;
                  
                  return tickets.map((ticket, ticketIdx) => (
                    <tr key={`div-${divIdx}-ven-${venueIdx}-tik-${ticketIdx}`} className="hover:bg-slate-50 transition-colors">
                      
                      {/* 본부 첫 번째 줄에만 Cell 렌더링 및 병합 */}
                      {venueIdx === 0 && ticketIdx === 0 && (
                        <td rowSpan={divisionRowSpan} className="px-4 py-3 bg-slate-50 font-bold align-top border border-slate-200 text-slate-800">
                          {division.orgDivision}
                        </td>
                      )}
                      
                      {/* 영업장 첫 번째 줄에만 Cell 렌더링 및 병합 */}
                      {ticketIdx === 0 && (
                        <td rowSpan={venueRowSpan} className="px-4 py-3 font-medium align-top border border-slate-200 text-slate-700">
                          {venue.venueName}
                        </td>
                      )}
                      
                      <td className="px-4 py-3 text-right font-mono border border-slate-200">{formatNum(ticket.revenue)}</td>
                    </tr>
                  ));
                })}
                
                {/* 본부별 소계 (백엔드 제공 값 100% 맹신 바인딩) */}
                <tr className="bg-indigo-50 text-indigo-900 font-bold border-b border-slate-200">
                  <td className="px-4 py-3 border border-slate-200" colSpan={2}>[{division.orgDivision}] 총계</td>
                  <td className="px-4 py-3 text-right font-mono text-indigo-700 border border-slate-200">{formatNum(division.divisionSubtotal)}</td>
                </tr>
              </React.Fragment>
            );
          })}
          
          {/* --- 5. 전사 총계 (API 최상단 grandTotal 바인딩) --- */}
          <tr className="bg-slate-800 text-white font-bold text-base">
            <td className="px-4 py-4 text-center border border-slate-700 tracking-wider" colSpan={2}>전사 총계</td>
            <td className="px-4 py-4 text-right font-mono border border-slate-700 text-lg">{formatNum(data.grandTotal)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
