import { useState, useEffect } from 'react';
import { useDate } from '../contexts/DateContext';
import { secureFetcher } from '../lib/secureFetcher';
import GlobalDatePicker from '../components/GlobalDatePicker';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

// V5 백엔드가 내려주는 요일비교 Row 명세 (100% 바이블 준수)
export interface V5MatrixRow {
  categoryCode?: string;
  categoryName: string;
  teamName: string;
  partName: string;
  shopName: string;
  isSubtotal?: boolean;
  isGrandTotal?: boolean;
  
  // Today
  todayActual?: number;
  todayLy?: number;
  todayGrowth?: number; // Pre-baked from backend
  
  // MTD
  mtdActual?: number;
  mtdLy?: number;
  mtdGrowth?: number; // Pre-baked from backend
  
  // YTD
  ytdActual?: number;
  ytdLy?: number;
  ytdGrowth?: number; // Pre-baked from backend
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
        
        // 백엔드의 새로운 통일 리포트 API (Flat Array 구조 수용)
        const res = await secureFetcher(`${API_BASE}/api/v5/report/daily-sales?date=${startDate}`);
        const result = res.data || res;
        
        // 새로 추가된 revenue 배열을 추출
        const payloadArray = result.revenue || (Array.isArray(result) ? result : (result.data || []));
        
        setData(payloadArray);
      } catch (err: any) {
        console.error('Failed to fetch V5 matrix weekly', err);
        setError('데이터를 불러오는 중 문제가 발생했습니다. 백엔드 V5 엔드포인트를 아직 준비 중일 수 있습니다.');
        
        // Fallback for development without V5 API yet
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchV5Matrix();
  }, [startDate]);

  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return '-';
    return new Intl.NumberFormat('ko-KR').format(Math.round(value));
  };

  const renderGrowth = (rate?: number) => {
    if (rate === undefined || rate === null) return <span className="text-slate-400">-</span>;
    if (rate === 0) return <span className="text-slate-400 flex items-center gap-1 justify-end"><Minus size={14}/> 0%</span>;
    
    if (rate > 0) {
      return (
        <span className="text-red-500 font-medium flex items-center gap-1 justify-end">
          <ArrowUpRight size={14} />
          {rate.toFixed(1)}%
        </span>
      );
    }
    return (
      <span className="text-blue-500 font-medium flex items-center gap-1 justify-end">
        <ArrowDownRight size={14} />
        {Math.abs(rate).toFixed(1)}%
      </span>
    );
  };

  const parsedDate = new Date(startDate);
  const lyDate = new Date(parsedDate.getTime() - 364 * 24 * 60 * 60 * 1000); // 정확히 52주 전(작년 동일 요일)
  
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
        <div className="bg-blue-50/50 px-6 py-3 border-b border-blue-100 flex items-center gap-2 text-sm text-blue-700 font-medium">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          백엔드 통합 데이터 통제 시스템(V5 API)에서 100% 정제된 데이터를 렌더링합니다. (프론트 자체 연산 0%)
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
                <th className="p-3 border-r border-slate-200 font-medium">증감율</th>
                {/* MTD */}
                <th className="p-3 border-r border-slate-200 font-medium">실적</th>
                <th className="p-3 border-r border-slate-200 font-medium">전년 동기</th>
                <th className="p-3 border-r border-slate-200 font-medium">증감율</th>
                {/* YTD */}
                <th className="p-3 border-r border-slate-200 font-medium">실적</th>
                <th className="p-3 border-r border-slate-200 font-medium">전년 동기</th>
                <th className="p-3 font-medium">증감율</th>
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
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400">
                    조회된 데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                data.map((row, idx) => {
                  const isSub = row.isSubtotal;
                  const isTotal = row.isGrandTotal;
                  
                  // 스타일 분기
                  let rowClasses = "hover:bg-slate-50 transition-colors";
                  let nameClasses = "text-slate-700 font-semibold";
                  let valueClasses = "font-medium text-slate-700";
                  let lyValueClasses = "text-slate-400";

                  if (isTotal) {
                    rowClasses = "bg-slate-800 hover:bg-slate-900";
                    nameClasses = "text-white font-bold text-base";
                    valueClasses = "font-bold text-white text-base";
                    lyValueClasses = "text-slate-300";
                  } else if (isSub) {
                    rowClasses = "bg-brand-mint/10 hover:bg-brand-mint/20";
                    nameClasses = "text-brand-mint font-bold";
                    valueClasses = "font-bold text-brand-mint";
                    lyValueClasses = "text-emerald-600/70";
                  }

                  return (
                    <tr key={`${row.shopName}_${idx}`} className={rowClasses}>
                      {/* Name Column */}
                      <td className={`p-4 border-r border-slate-200 text-left sticky left-0 z-10 ${
                        isTotal ? 'bg-slate-800' : isSub ? 'bg-emerald-50' : 'bg-white'
                      }`}>
                        <div className="flex flex-col">
                          {!isTotal && !isSub && (
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded leading-none">{row.categoryName}</span>
                              <span className="text-[10px] font-medium text-slate-400 leading-none">{row.teamName} &gt; {row.partName}</span>
                            </div>
                          )}
                          <span className={nameClasses}>{row.shopName}</span>
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
