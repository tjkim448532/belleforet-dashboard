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
        const resolvedTeamName = team.team_name || category.category_code || '미분류';

        team.parts?.forEach((part: any) => {
          part.venues?.forEach((venue: any) => {
            hasVenues = true;
            flat.push({
              team_name: resolvedTeamName,
              venue_name: venue.venue_name || '미분류',
              isSubtotal: false,
              today: { actual: venue.subtotal?.todayActual, ly: venue.subtotal?.todayLy, growth: venue.subtotal?.todayGrowth },
              mtd: { actual: venue.subtotal?.mtdActual, ly: venue.subtotal?.mtdLy, growth: venue.subtotal?.mtdGrowth },
              ytd: { actual: venue.subtotal?.ytdActual, ly: venue.subtotal?.ytdLy, growth: venue.subtotal?.ytdGrowth },
            });
          });
        });

        if (hasVenues || team.subtotal) {
          flat.push({
            team_name: resolvedTeamName,
            venue_name: `[${resolvedTeamName} 합계]`,
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

  // SSOT 무관용 원칙 적용: categoryCode에 상관없이 오직 teamName 기준으로만 완벽히 그룹핑 (표 찢어짐 방지)
  const flatSummary = useMemo(() => {
    if (!rawFlatSummary || rawFlatSummary.length === 0) return [];

    const groups = new Map<string, any[]>();
    let grandTotal: any = null;

    rawFlatSummary.forEach(row => {
      if (row.isGrandTotal || row.team_name === 'TOTAL') {
        grandTotal = row;
        return;
      }
      const tName = row.team_name || '미분류';
      if (!groups.has(tName)) groups.set(tName, []);
      groups.get(tName)!.push(row);
    });

    const finalArray: any[] = [];
    groups.forEach((rows) => {
      // 1. 일반 영업장 배열
      const normals = rows.filter(r => !r.isSubtotal);
      // 2. 단일 소계 행 (백엔드가 준 것 중 마지막 1개만 사용, 자체 연산 절대 금지)
      // (만약 레거시 배열에서 여러 개가 들어왔더라도, 가장 하단의 1개만 매핑)
      const subs = rows.filter(r => r.isSubtotal);
      const sub = subs.length > 0 ? subs[subs.length - 1] : null;

      finalArray.push(...normals);
      if (sub) finalArray.push(sub);
    });

    if (grandTotal) finalArray.push(grandTotal);
    return finalArray;
  }, [rawFlatSummary]);

  const renderRows = () => {
    const rows: React.ReactNode[] = [];
    let currentTeam = '';

    flatSummary.forEach((row, idx) => {
      const isGrandTotal = row.isGrandTotal === true || row.team_name === 'TOTAL';
      
      const isFirstTeamRow = !isGrandTotal && row.team_name !== currentTeam;
      let rowSpan = 1;

      // Calculate rowSpan for the team cell (이제 flatSummary가 완벽히 그룹화되어 있으므로 단순 카운트 가능)
      if (isFirstTeamRow) {
        currentTeam = row.team_name;
        for (let i = idx + 1; i < flatSummary.length; i++) {
          if (flatSummary[i].isGrandTotal || flatSummary[i].team_name === 'TOTAL') break;
          if (flatSummary[i].team_name === currentTeam) rowSpan++;
          else break;
        }
      }

      const isSub = row.isSubtotal;
      
      // Styling
      let bgClass = isSub ? 'bg-slate-100 border-b-[2px] border-slate-300' : 'bg-white hover:bg-slate-50';
      let textClass = isSub ? 'text-slate-900 font-bold' : 'text-slate-700';

      if (isGrandTotal) {
        bgClass = 'bg-slate-700 border-b-[3px] border-slate-800';
        textClass = 'text-white font-black text-sm tracking-wide shadow-md';
      }

      // Metrics
      const td = row.today || {};
      const mt = row.mtd || {};
      const yt = row.ytd || {};

      rows.push(
        <tr key={`row-${idx}`} className={`${bgClass} ${textClass} border-b border-slate-200`}>
          
          {/* 총합계 행일 경우 좌측 컬럼 병합 처리 */}
          {isGrandTotal ? (
            <td colSpan={2} className="p-3 border-r border-slate-600 text-center uppercase tracking-widest sticky left-0 z-10 shadow-[1px_0_0_0_#475569]">
              {row.venue_name || '전사 총합계 (GRAND TOTAL)'}
            </td>
          ) : (
            <>
              {isFirstTeamRow && (
                <td rowSpan={rowSpan} className="p-3 border-r border-slate-300 text-center font-bold text-slate-800 align-middle sticky left-0 z-10 bg-white shadow-[1px_0_0_0_#cbd5e1]">
                  {row.team_name}
                </td>
              )}
              <td className={`p-2 text-center border-r border-slate-300 ${isSub ? 'font-extrabold text-xs' : ''}`}>
                {row.venue_name}
              </td>
            </>
          )}
          
          {/* Today (수량 삭제, 매출액/전년동기/YoY 3칸만 유지) */}
          <td className={`p-2 text-right font-medium ${isGrandTotal ? 'text-white' : 'text-slate-800'}`}>{formatRevenue(td.actual)}</td>
          <td className={`p-2 text-right ${isGrandTotal ? 'text-slate-200' : 'text-slate-500'}`}>{formatRevenue(td.ly)}</td>
          <td className="p-2 text-right border-r border-slate-300 bg-black/5">{renderGrowth(td.growth)}</td>

          {/* MTD */}
          <td className={`p-2 text-right font-medium ${isGrandTotal ? 'text-white' : 'text-slate-800'}`}>{formatRevenue(mt.actual)}</td>
          <td className={`p-2 text-right ${isGrandTotal ? 'text-slate-200' : 'text-slate-500'}`}>{formatRevenue(mt.ly)}</td>
          <td className="p-2 text-right border-r border-slate-300 bg-black/5">{renderGrowth(mt.growth)}</td>

          {/* YTD */}
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
              <th className="p-3 border-r border-slate-300 sticky left-0 bg-[#f8f9fa] z-30 text-center" rowSpan={2}>본부</th>
              <th className="p-3 border-r border-slate-300 text-center" rowSpan={2}>영업장 38개</th>
              
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
                <td colSpan={11} className="p-12 text-center text-slate-500 text-sm font-medium">
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
