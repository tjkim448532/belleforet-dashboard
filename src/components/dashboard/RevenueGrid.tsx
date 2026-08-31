import React from 'react';

// 공통 숫자 포맷팅 유틸리티 (₩ 기호 제외, #,##0 서식)
const formatRevenue = (val: number | undefined | null) => {
  if (val === undefined || val === null) return '0';
  return Number(val).toLocaleString('ko-KR');
};

const renderRate = (rate?: number | null) => {
  if (rate === undefined || rate === null) return <span className="text-slate-400">-</span>;
  if (rate === 0) return <span className="text-slate-400">0%</span>;
  // 달성율/증감율에 따른 색상 분기 (100% 이상 블루, 양수 그린, 음수 레드)
  let colorClass = "text-slate-600";
  if (rate >= 100) colorClass = "text-blue-600";
  else if (rate > 0) colorClass = "text-emerald-600";
  else if (rate < 0) colorClass = "text-red-500";

  return <span className={`font-medium ${colorClass}`}>{rate.toFixed(1)}%</span>;
};

interface Metrics {
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
  data: any[]; // 1-Depth flatSummary array
  validationMaster: ValidationMaster;
}

export default function RevenueGrid({ data = [], validationMaster }: GridProps) {
  
  const renderRows = () => {
    const rows: React.ReactNode[] = [];
    let currentTeam = '';

    data.forEach((row, idx) => {
      const isFirstTeamRow = row.teamName !== currentTeam;
      let rowSpan = 1;

      // Calculate rowSpan for the team cell in a flat array
      if (isFirstTeamRow) {
        currentTeam = row.teamName;
        for (let i = idx + 1; i < data.length; i++) {
          if (data[i].teamName === currentTeam) rowSpan++;
          else break;
        }
      }

      const m: Metrics = row.metrics || {};
      const isSub = row.isSubtotal;
      
      const bgClass = isSub ? 'bg-slate-100' : 'bg-white hover:bg-slate-50';
      const textClass = isSub ? 'text-slate-900 font-bold' : 'text-slate-700';

      rows.push(
        <tr key={`row-${idx}`} className={`${bgClass} ${textClass} border-b border-slate-200`}>
          {isFirstTeamRow && (
            <td rowSpan={rowSpan} className="p-3 border-r border-slate-300 text-center font-bold text-slate-800 align-middle sticky left-0 z-10 bg-white shadow-[1px_0_0_0_#cbd5e1]">
              {row.teamName}
            </td>
          )}
          <td className={`p-2 text-center border-r border-slate-300 ${isSub ? 'font-extrabold text-sm' : ''}`}>
            {isSub ? `[${row.teamName} 합계]` : row.venueName}
          </td>
          
          {/* Today */}
          <td className="p-2 text-right text-slate-500">{formatRevenue(m.todayTarget)}</td>
          <td className="p-2 text-right font-medium text-slate-800">{formatRevenue(m.todayActual)}</td>
          <td className="p-2 text-right text-slate-500">{formatRevenue(m.todayLy)}</td>
          <td className="p-2 text-right">{renderRate(m.todayAchieve)}</td>
          <td className="p-2 text-right border-r border-slate-300 bg-slate-50/50">{renderRate(m.todayGrowth)}</td>

          {/* MTD */}
          <td className="p-2 text-right text-slate-500">{formatRevenue(m.mtdTarget)}</td>
          <td className="p-2 text-right font-medium text-slate-800">{formatRevenue(m.mtdActual)}</td>
          <td className="p-2 text-right text-slate-500">{formatRevenue(m.mtdLy)}</td>
          <td className="p-2 text-right">{renderRate(m.mtdAchieve)}</td>
          <td className="p-2 text-right border-r border-slate-300 bg-slate-50/50">{renderRate(m.mtdGrowth)}</td>

          {/* YTD */}
          <td className="p-2 text-right text-slate-500">{formatRevenue(m.ytdTarget)}</td>
          <td className="p-2 text-right font-medium text-slate-800">{formatRevenue(m.ytdActual)}</td>
          <td className="p-2 text-right text-slate-500">{formatRevenue(m.ytdLy)}</td>
          <td className="p-2 text-right">{renderRate(m.ytdAchieve)}</td>
          <td className="p-2 text-right bg-slate-50/50">{renderRate(m.ytdGrowth)}</td>
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
              <th className="p-3 border-r border-slate-300 text-center" rowSpan={2}>영업장(38개)</th>
              
              <th className="p-2 border-r border-slate-300 text-center bg-blue-50/50" colSpan={5}>금일 (Today)</th>
              <th className="p-2 border-r border-slate-300 text-center bg-indigo-50/50" colSpan={5}>월누계 (Month To Date)</th>
              <th className="p-2 text-center bg-purple-50/50" colSpan={5}>연누계 (Year To Date)</th>
            </tr>
            <tr className="text-xs">
              {/* Today */}
              <th className="p-2 border-r border-slate-300 text-center sticky top-[41px] bg-[#f8f9fa] z-20">목표</th>
              <th className="p-2 border-r border-slate-300 text-center sticky top-[41px] bg-[#f8f9fa] z-20 text-blue-700">실적</th>
              <th className="p-2 border-r border-slate-300 text-center sticky top-[41px] bg-[#f8f9fa] z-20">전년</th>
              <th className="p-2 border-r border-slate-300 text-center sticky top-[41px] bg-[#f8f9fa] z-20">달성율</th>
              <th className="p-2 border-r border-slate-300 text-center sticky top-[41px] bg-[#f8f9fa] z-20">증감율</th>
              
              {/* MTD */}
              <th className="p-2 border-r border-slate-300 text-center sticky top-[41px] bg-[#f8f9fa] z-20">목표</th>
              <th className="p-2 border-r border-slate-300 text-center sticky top-[41px] bg-[#f8f9fa] z-20 text-indigo-700">실적</th>
              <th className="p-2 border-r border-slate-300 text-center sticky top-[41px] bg-[#f8f9fa] z-20">전년</th>
              <th className="p-2 border-r border-slate-300 text-center sticky top-[41px] bg-[#f8f9fa] z-20">달성율</th>
              <th className="p-2 border-r border-slate-300 text-center sticky top-[41px] bg-[#f8f9fa] z-20">증감율</th>
              
              {/* YTD */}
              <th className="p-2 border-r border-slate-300 text-center sticky top-[41px] bg-[#f8f9fa] z-20">목표</th>
              <th className="p-2 border-r border-slate-300 text-center sticky top-[41px] bg-[#f8f9fa] z-20 text-purple-700">실적</th>
              <th className="p-2 border-r border-slate-300 text-center sticky top-[41px] bg-[#f8f9fa] z-20">전년</th>
              <th className="p-2 border-r border-slate-300 text-center sticky top-[41px] bg-[#f8f9fa] z-20">달성율</th>
              <th className="p-2 text-center sticky top-[41px] bg-[#f8f9fa] z-20">증감율</th>
            </tr>
          </thead>
          <tbody>
            {data && data.length > 0 ? renderRows() : (
              <tr>
                <td colSpan={17} className="p-12 text-center text-slate-500 text-sm font-medium">
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
