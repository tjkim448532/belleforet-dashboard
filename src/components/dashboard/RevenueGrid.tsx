import React, { useMemo } from 'react';

// 공통 숫자 포맷 유틸리티
const formatRevenue = (val: number | undefined | null) => {
  if (val === undefined || val === null) return '0';
  return Number(val).toLocaleString('ko-KR');
};

const renderGrowth = (rate?: number | null) => {
  if (rate === undefined || rate === null) return <span className="text-slate-400">-</span>;
  if (rate === 0) return <span className="text-slate-400">0</span>;
  return <span className={rate > 0 ? "text-blue-600" : "text-red-500"}>{rate.toFixed(1)}</span>;
};

interface ValidationMaster {
  originalTotal: number;
  payloadTotal: number;
  variance: number;
  isZeroVariance: boolean;
}

interface GridProps {
  data: any[]; // 백엔드 flatSummary 배열 또는 8-depth 트리
  validationMaster?: ValidationMaster;
}

export default function RevenueGrid({ data = [], validationMaster }: GridProps) {
  
  // 백엔드에서 flatSummary를 바로 넘겨준 경우 그대로 사용, 아니면 하위 호환성을 위해 직접 추출
  const rawFlatSummary = useMemo(() => {
    if (data.length === 0) return [];
    
    // API V6 flatSummary 구조 감지
    if ('today' in data[0] || (data[0].venue_name && data[0].isSubtotal !== undefined)) {
      return data;
    }

    // 8-Depth Legacy 구조 감지 시 클라이언트 평면화 (Grand Total은 계산하지 않으므로 제외)
    const flat: any[] = [];
    data.forEach((category: any) => {
      category.teams?.forEach((team: any) => {
        let hasVenues = false;
        
        team.parts?.forEach((part: any) => {
          part.venues?.forEach((venue: any) => {
            hasVenues = true;
            flat.push({
              category_code: category.category_code || category.org_department || category.org_division || '미분류',
              venue_name: venue.venue_name || '미분류',
              ticket_group: team.team_name || '미분류',
              isSubtotal: false,
              today: { actual: venue.subtotal?.todayActual, ly: venue.subtotal?.todayLy, growth: venue.subtotal?.todayGrowth },
              mtd: { actual: venue.subtotal?.mtdActual, ly: venue.subtotal?.mtdLy, growth: venue.subtotal?.mtdGrowth },
              ytd: { actual: venue.subtotal?.ytdActual, ly: venue.subtotal?.ytdLy, growth: venue.subtotal?.ytdGrowth },
            });
          });
        });

        if (hasVenues || team.subtotal) {
          flat.push({
            category_code: category.category_code || category.org_department || category.org_division || '미분류',
            venue_name: `[${category.category_code || '합계'} 소계]`,
            ticket_group: `[${team.team_name || '합계'} 소계]`,
            isSubtotal: true,
            today: { actual: team.subtotal?.todayActual, ly: team.subtotal?.todayLy, growth: team.subtotal?.todayGrowth },
            mtd: { actual: team.subtotal?.mtdActual, ly: team.subtotal?.mtdLy, growth: team.subtotal?.mtdGrowth },
            ytd: { actual: team.subtotal?.ytdActual, ly: team.subtotal?.ytdLy, growth: team.subtotal?.ytdGrowth },
          });
        }
      });
    });
    return flat;
  }, [data]);

    const flatSummary = useMemo(() => {
    if (!rawFlatSummary || rawFlatSummary.length === 0) return [];
    let grandTotal = null;
    const normals = [];
    rawFlatSummary.forEach(row => {
      if (row.isGrandTotal || row.category_code === 'TOTAL') {
        grandTotal = row;
      } else {
        normals.push(row);
      }
    });
    if (grandTotal) normals.push(grandTotal);
    return normals;
  }, [rawFlatSummary]);

    const renderRows = () => {
    const rows: React.ReactNode[] = [];
    let currentCategory = '';
    let currentVenue = '';

    flatSummary.forEach((row, idx) => {
      const isGrandTotal = row.isGrandTotal === true || row.category_code === 'TOTAL';
      
      const isFirstCategoryRow = !isGrandTotal && row.category_code !== currentCategory;
      let categoryRowSpan = 1;

      if (isFirstCategoryRow) {
        currentCategory = row.category_code;
        for (let i = idx + 1; i < flatSummary.length; i++) {
          if (flatSummary[i].isGrandTotal || flatSummary[i].category_code === 'TOTAL') break;
          if (flatSummary[i].category_code === currentCategory) categoryRowSpan++;
          else break;
        }
      }

      const isFirstVenueRow = !isGrandTotal && (isFirstCategoryRow || row.venue_name !== currentVenue);
      let venueRowSpan = 1;

      if (isFirstVenueRow) {
        currentVenue = row.venue_name;
        for (let i = idx + 1; i < flatSummary.length; i++) {
          if (flatSummary[i].isGrandTotal || flatSummary[i].category_code === 'TOTAL') break;
          if (flatSummary[i].category_code === currentCategory && flatSummary[i].venue_name === currentVenue) venueRowSpan++;
          else break;
        }
      }

      const isSub = row.isSubtotal;
      
      let bgClass = isSub ? 'bg-slate-100 border-b-[2px] border-slate-300' : 'bg-white hover:bg-slate-50';
      let textClass = isSub ? 'text-slate-900 font-bold' : 'text-slate-700';

      if (isGrandTotal) {
        bgClass = 'bg-slate-700 border-b-[3px] border-slate-800';
        textClass = 'text-white font-black text-sm tracking-wide shadow-md';
      }

      const td = row.today || {};
      const mt = row.mtd || {};
      const yt = row.ytd || {};

      rows.push(
        <tr key={`row-${idx}`} className={`${bgClass} ${textClass} border-b border-slate-200`}>
          {isGrandTotal ? (
            <td colSpan={3} className="p-3 border-r border-slate-600 text-center uppercase tracking-widest sticky left-0 z-10 shadow-[1px_0_0_0_#475569]">
              {row.venue_name || '전사 총합계 (GRAND TOTAL)'}
            </td>
          ) : (
            <>
              {isFirstCategoryRow && (
                <td rowSpan={categoryRowSpan} className="p-3 border-r border-slate-300 text-center font-extrabold text-slate-800 align-middle sticky left-0 z-10 bg-slate-50 shadow-[1px_0_0_0_#cbd5e1]">
                  {row.category_code}
                </td>
              )}
              {isFirstVenueRow && (
                <td rowSpan={venueRowSpan} className={`p-2 text-center border-r border-slate-300 ${isSub ? 'font-extrabold text-xs' : ''} align-middle`}>
                  {row.venue_name}
                </td>
              )}
              <td className={`p-2 text-center border-r border-slate-300 ${isSub ? 'font-extrabold text-xs' : ''}`}>
                {row.ticket_group}
              </td>
            </>
          )}
          <td className={`p-2 text-right font-medium ${isGrandTotal ? 'text-white' : 'text-slate-800'}`}>{formatRevenue(td.actual)}</td>
          <td className={`p-2 text-right ${isGrandTotal ? 'text-slate-200' : 'text-slate-500'}`}>{formatRevenue(td.ly)}</td>
          <td className="p-2 text-right border-r border-slate-300 bg-black/5">{renderGrowth(td.growth)}</td>
          <td className={`p-2 text-right font-medium ${isGrandTotal ? 'text-white' : 'text-slate-800'}`}>{formatRevenue(mt.actual)}</td>
          <td className={`p-2 text-right ${isGrandTotal ? 'text-slate-200' : 'text-slate-500'}`}>{formatRevenue(mt.ly)}</td>
          <td className="p-2 text-right border-r border-slate-300 bg-black/5">{renderGrowth(mt.growth)}</td>
          <td className={`p-2 text-right font-medium ${isGrandTotal ? 'text-white' : 'text-slate-800'}`}>{formatRevenue(yt.actual)}</td>
          <td className={`p-2 text-right ${isGrandTotal ? 'text-slate-200' : 'text-slate-500'}`}>{formatRevenue(yt.ly)}</td>
          <td className="p-2 text-right bg-black/5">{renderGrowth(yt.growth)}</td>
        </tr>
      );
    });
    return rows;
  };

  return (
    <div className="flex flex-col h-full bg-white shadow-sm rounded-lg border border-slate-300">
      <div className="overflow-auto flex-grow max-h-[calc(100vh-250px)] relative">
        <table className="w-full text-[11.5px] text-left border-collapse whitespace-nowrap min-w-[1200px]">
          <thead className="bg-[#f8f9fa] text-slate-700 font-bold sticky top-0 z-20 shadow-sm border-b-2 border-slate-400">
            <tr>
              <th className="p-3 border-r border-slate-300 sticky left-0 bg-[#f8f9fa] z-30 text-center" rowSpan={2}>대분류(본부)</th>
              <th className="p-3 border-r border-slate-300 text-center" rowSpan={2}>영업장</th>
              <th className="p-3 border-r border-slate-300 text-center" rowSpan={2}>티켓그룹</th>
              
              <th className="p-2 border-r border-slate-300 text-center bg-blue-50/50" colSpan={3}>금일 (Today)</th>
              <th className="p-2 border-r border-slate-300 text-center bg-indigo-50/50" colSpan={3}>월누계 (Month To Date)</th>
              <th className="p-2 text-center bg-purple-50/50" colSpan={3}>연누계 (Year To Date)</th>
            </tr>
            <tr className="text-xs">
              {/* Today */}
              <th className="p-2 border-r border-slate-300 text-center sticky top-[41px] bg-[#f8f9fa] z-20 text-blue-700">매출액</th>
              <th className="p-2 border-r border-slate-300 text-center sticky top-[41px] bg-[#f8f9fa] z-20">전년동기</th>
              <th className="p-2 border-r border-slate-300 text-center sticky top-[41px] bg-[#f8f9fa] z-20">YoY</th>
              
              {/* MTD */}
              <th className="p-2 border-r border-slate-300 text-center sticky top-[41px] bg-[#f8f9fa] z-20 text-indigo-700">매출액</th>
              <th className="p-2 border-r border-slate-300 text-center sticky top-[41px] bg-[#f8f9fa] z-20">전년동기</th>
              <th className="p-2 border-r border-slate-300 text-center sticky top-[41px] bg-[#f8f9fa] z-20">YoY</th>
              
              {/* YTD */}
              <th className="p-2 border-r border-slate-300 text-center sticky top-[41px] bg-[#f8f9fa] z-20 text-purple-700">매출액</th>
              <th className="p-2 border-r border-slate-300 text-center sticky top-[41px] bg-[#f8f9fa] z-20">전년동기</th>
              <th className="p-2 text-center sticky top-[41px] bg-[#f8f9fa] z-20">YoY</th>
            </tr>
          </thead>
          <tbody>
            {flatSummary && flatSummary.length > 0 ? renderRows() : (
              <tr>
                <td colSpan={12} className="p-12 text-center text-slate-500 text-sm font-medium">
                  조회된 요약 데이터가 없습니다.
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
              원천 장부 합계: {formatRevenue(validationMaster.originalTotal)} / 
              대시보드 총액: {formatRevenue(validationMaster.payloadTotal)}
            </span>
          </div>
          <div className="text-base tracking-tight bg-white/60 px-3 py-1 rounded border border-black/10">
            오차 (Variance): {formatRevenue(validationMaster.variance)}
          </div>
        </div>
      )}
    </div>
  );
}
