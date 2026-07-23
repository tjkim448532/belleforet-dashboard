import React, { useState, useEffect } from 'react';
import { useDate } from '../contexts/DateContext';
import { secureFetcher } from '../lib/secureFetcher';
import GlobalDatePicker from '../components/GlobalDatePicker';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export interface V5MatrixRow {
  categoryCode?: string;
  categoryName: string;
  teamName: string;
  partName: string;
  shopName: string;
  isSubtotal?: boolean;
  subtotalType?: 'part' | 'team' | 'category' | 'grand_total' | string;
  isGrandTotal?: boolean;
  
  // Today
  todayActual?: number;
  todayLy?: number;
  todayGrowth?: number;
  
  // MTD
  mtdActual?: number;
  mtdLy?: number;
  mtdGrowth?: number;
  
  // YTD
  ytdActual?: number;
  ytdLy?: number;
  ytdGrowth?: number;
}

export default function MatrixWeeklyDashboard() {
  const { startDate } = useDate();
  const [data, setData] = useState<V5MatrixRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchV5Matrix = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';
        const res = await secureFetcher(`${API_BASE}/api/v5/dashboard/matrix-weekly?date=${startDate}`);
        const result = res.data || res;
        const payloadArray = Array.isArray(result) ? result : (result.data || []);
        setData(payloadArray);
      } catch (err: any) {
        console.error('Failed to fetch V5 matrix weekly', err);
        setError('데이터를 불러오는 중 문제가 발생했습니다.');
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchV5Matrix();
  }, [startDate]);

  // 중복 소계 행 정제 및 실적 0원 매장/소계 숨김 필터 (바이블 준수: 백엔드 수치는 재계산하지 않고 화면 표시만 필터링)
  const displayRows = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return data.filter((row, idx, arr) => {
      // 총계 행은 무조건 표출
      if (row.isGrandTotal) return true;

      // 금일, MTD, YTD 실적이 전년/올해 모두 0원인지 체크
      const isAllZero = (row.todayActual || 0) === 0 && (row.todayLy || 0) === 0 &&
                        (row.mtdActual || 0) === 0 && (row.mtdLy || 0) === 0 &&
                        (row.ytdActual || 0) === 0 && (row.ytdLy || 0) === 0;

      // 실적이 전혀 없는 (0원) 매장 또는 소계 행은 숨김
      if (isAllZero) return false;

      // 중복 소계 정제 (동일 수치의 연속된 파트/팀/카테고리 중복 소계 중 하위 소계 제거)
      if (row.isSubtotal) {
        const next = arr[idx + 1];
        if (next && next.isSubtotal && !next.isGrandTotal &&
            next.todayActual === row.todayActual &&
            next.todayLy === row.todayLy &&
            next.mtdActual === row.mtdActual &&
            next.mtdLy === row.mtdLy &&
            next.ytdActual === row.ytdActual &&
            next.ytdLy === row.ytdLy) {
          return false;
        }
      }
      return true;
    });
  }, [data]);

  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return '-';
    return new Intl.NumberFormat('ko-KR').format(Math.round(value));
  };

  const renderGrowth = (rate?: number) => {
    if (rate === undefined || rate === null) return <span className="text-slate-400">-</span>;
    if (rate === 0) return <span className="text-slate-400 flex items-center gap-1 justify-end"><Minus size={14}/> 0%</span>;
    
    if (rate > 0) {
      return (
        <span className="text-red-500 font-semibold flex items-center gap-1 justify-end">
          <ArrowUpRight size={14} />
          {rate.toFixed(1)}%
        </span>
      );
    }
    return (
      <span className="text-blue-500 font-semibold flex items-center gap-1 justify-end">
        <ArrowDownRight size={14} />
        {Math.abs(rate).toFixed(1)}%
      </span>
    );
  };

  const getSubtotalLabel = (row: V5MatrixRow) => {
    if (row.isGrandTotal) return '총계 (Grand Total)';
    if (row.subtotalType === 'category') return `${row.categoryName || row.categoryCode} 소계`;
    if (row.subtotalType === 'team') return `${row.teamName} 소계`;
    if (row.subtotalType === 'part') return `${row.partName} 소계`;
    if (row.shopName === '소계') return `${row.categoryName || row.teamName || '카테고리'} 소계`;
    return row.shopName;
  };

  const parsedDate = new Date(startDate);
  const lyDate = new Date(parsedDate.getTime() - 364 * 24 * 60 * 60 * 1000);
  
  const currFormatter = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
  const lyFormatter = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">전년 동요일 비교</h1>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
            <span className="font-medium text-brand-mint bg-brand-mint/10 px-2 py-0.5 rounded-md">조회일</span> {currFormatter.format(parsedDate)} 
            <span className="text-slate-300">|</span> 
            <span className="font-medium text-slate-500 bg-slate-200 px-2 py-0.5 rounded-md">비교일(전년)</span> {lyFormatter.format(lyDate)}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <GlobalDatePicker />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header Notice */}
        <div className="bg-teal-50/70 px-6 py-3 border-b border-teal-100 flex items-center gap-2 text-sm text-teal-800 font-medium">
          <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></div>
          백엔드 통합 데이터 통제 시스템(V5 API) 원천 렌더링 (순매출/부가세 별도)
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-4 text-left border-r border-slate-200 sticky left-0 bg-slate-50 z-10" rowSpan={2}>분류 / 영업장명</th>
                <th className="p-3 text-center border-r border-slate-200" colSpan={3}>금일 (Today)</th>
                <th className="p-3 text-center border-r border-slate-200" colSpan={3}>월누계 (MTD)</th>
                <th className="p-3 text-center" colSpan={3}>연누계 (YTD)</th>
              </tr>
              <tr className="bg-slate-100/50 text-xs">
                {/* Today */}
                <th className="p-3 border-r border-slate-200 font-medium">실적</th>
                <th className="p-3 border-r border-slate-200 font-medium">전년 동요일</th>
                <th className="p-3 border-r border-slate-200 font-medium">증감률</th>
                {/* MTD */}
                <th className="p-3 border-r border-slate-200 font-medium">실적</th>
                <th className="p-3 border-r border-slate-200 font-medium">전년 동기</th>
                <th className="p-3 border-r border-slate-200 font-medium">증감률</th>
                {/* YTD */}
                <th className="p-3 border-r border-slate-200 font-medium">실적</th>
                <th className="p-3 border-r border-slate-200 font-medium">전년 동기</th>
                <th className="p-3 font-medium">증감률</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400">데이터를 불러오고 있습니다...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-red-500">{error}</td>
                </tr>
              ) : displayRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400">
                    조회된 데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                displayRows.map((row, idx) => {
                  const isSub = row.isSubtotal;
                  const isCatSub = isSub && row.subtotalType === 'category';
                  const isTeamSub = isSub && row.subtotalType === 'team';
                  const isTotal = row.isGrandTotal;
                  
                  // 레벨별 명확한 스타일 및 배경색 구분
                  let rowClasses = "hover:bg-slate-50 transition-colors";
                  let nameClasses = "text-slate-700 font-semibold";
                  let valueClasses = "font-medium text-slate-800";
                  let lyValueClasses = "text-slate-400";
                  let stickyBg = "bg-white";

                  if (isTotal) {
                    rowClasses = "bg-slate-800 hover:bg-slate-900 text-white font-bold";
                    nameClasses = "text-white font-bold text-base";
                    valueClasses = "font-bold text-white text-base";
                    lyValueClasses = "text-slate-300";
                    stickyBg = "bg-slate-800";
                  } else if (isCatSub) {
                    rowClasses = "bg-teal-100/80 hover:bg-teal-100 border-t-2 border-teal-300";
                    nameClasses = "text-teal-900 font-extrabold text-[13px]";
                    valueClasses = "font-bold text-teal-900";
                    lyValueClasses = "text-teal-700/80";
                    stickyBg = "bg-teal-100";
                  } else if (isTeamSub) {
                    rowClasses = "bg-emerald-50 hover:bg-emerald-100 border-t border-emerald-200";
                    nameClasses = "text-emerald-800 font-bold text-[12px]";
                    valueClasses = "font-bold text-emerald-800";
                    lyValueClasses = "text-emerald-600/80";
                    stickyBg = "bg-emerald-50";
                  } else if (isSub) {
                    rowClasses = "bg-brand-mint/10 hover:bg-brand-mint/20 border-t border-brand-mint/20";
                    nameClasses = "text-brand-mint font-bold";
                    valueClasses = "font-bold text-brand-mint";
                    lyValueClasses = "text-brand-mint/60";
                    stickyBg = "bg-[#e5f5f0]";
                  }

                  const rowLabel = getSubtotalLabel(row);

                  return (
                    <tr key={`${row.shopName}_${row.categoryCode}_${idx}`} className={rowClasses}>
                      {/* Name Column */}
                      <td className={`p-4 border-r border-slate-200 text-left sticky left-0 z-10 ${stickyBg}`}>
                        <div className="flex flex-col">
                          {!isTotal && !isSub && (
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded leading-none">{row.categoryName}</span>
                              <span className="text-[10px] font-medium text-slate-400 leading-none">{row.teamName} &gt; {row.partName}</span>
                            </div>
                          )}
                          <span className={nameClasses}>{rowLabel}</span>
                        </div>
                      </td>

                      {/* Today */}
                      <td className={`p-3 ${valueClasses}`}>{formatCurrency(row.todayActual)}</td>
                      <td className={`p-3 ${lyValueClasses}`}>{formatCurrency(row.todayLy)}</td>
                      <td className="p-3 border-r border-slate-200 bg-slate-50/30">{renderGrowth(row.todayGrowth)}</td>

                      {/* MTD */}
                      <td className={`p-3 ${valueClasses}`}>{formatCurrency(row.mtdActual)}</td>
                      <td className={`p-3 ${lyValueClasses}`}>{formatCurrency(row.mtdLy)}</td>
                      <td className="p-3 border-r border-slate-200 bg-slate-50/30">{renderGrowth(row.mtdGrowth)}</td>

                      {/* YTD */}
                      <td className={`p-3 ${valueClasses}`}>{formatCurrency(row.ytdActual)}</td>
                      <td className={`p-3 ${lyValueClasses}`}>{formatCurrency(row.ytdLy)}</td>
                      <td className="p-3 bg-slate-50/30">{renderGrowth(row.ytdGrowth)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
