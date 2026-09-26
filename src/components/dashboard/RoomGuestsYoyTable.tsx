import { useState, useEffect, useMemo } from 'react';
import { BedDouble, RefreshCw, AlertCircle, HelpCircle, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { secureFetcher } from '../../lib/secureFetcher';
import { useDate } from '../../contexts/DateContext';
import type { RoomGuestsYoyResponse, RoomGuestsYoyRow } from '../../types/reports-v2';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

export default function RoomGuestsYoyTable() {
  const { startDate } = useDate();
  const [data, setData] = useState<RoomGuestsYoyResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await secureFetcher(`${API_BASE}/api/v6/report/room-guests-yoy?startYear=2024`);
      const payload: RoomGuestsYoyResponse = res?.data ?? res;
      if (payload?.success && Array.isArray(payload.years) && Array.isArray(payload.matrix)) {
        setData(payload);
      } else {
        setError(payload?.error || '숙박객 YoY 매트릭스 데이터를 불러오지 못했습니다.');
      }
    } catch (err: any) {
      console.error('Error fetching room guests yoy data:', err);
      setError(err?.message || 'API 호출 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Currently viewed month from global date context (e.g. '2026-09-26' -> month 9)
  const currentMonthNum = useMemo(() => {
    if (!startDate) return new Date().getMonth() + 1;
    const parts = startDate.split('-');
    if (parts.length >= 2) {
      return parseInt(parts[1], 10);
    }
    return new Date().getMonth() + 1;
  }, [startDate]);

  // Current year string from global date context (e.g. '2026')
  const currentYearStr = useMemo(() => {
    if (!startDate) return String(new Date().getFullYear());
    return startDate.split('-')[0] || String(new Date().getFullYear());
  }, [startDate]);

  // Extract years dynamically from backend response
  const years = useMemo(() => {
    return data?.years || ['2024', '2025', '2026'];
  }, [data?.years]);

  // Latest year in the dataset and previous year for YoY comparison
  const latestYear = useMemo(() => {
    if (years.length === 0) return '2026';
    return years[years.length - 1];
  }, [years]);

  const prevYear = useMemo(() => {
    if (years.length < 2) return null;
    return years[years.length - 2];
  }, [years]);

  // Helper to format guest count numbers (integers or .5 decimal values)
  const formatGuests = (val: number | undefined) => {
    if (val === undefined || val === null) return '-';
    if (val === 0) return '-';
    if (val % 1 !== 0) {
      return `${val.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}명`;
    }
    return `${val.toLocaleString('ko-KR')}명`;
  };

  return (
    <div className="col-span-1 lg:col-span-12 w-full bg-white rounded-[32px] border border-slate-200/80 p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
      
      {/* 1. Header & Title Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <BedDouble size={18} />
            </div>
            <h3 className="text-lg lg:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
              <span>연도별 벨포레 숙박객 추이 매트릭스</span>
              <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100/80 px-2.5 py-0.5 rounded-full font-bold">
                {years.join(' · ')}년 (1월 ~ 12월)
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed max-w-3xl">
            관리자 설정 기준 정원(16평 2.5명, 35평 4명, 51평 6명 등)으로 산출한 전체 숙박객(진성 투숙객 모수)의 연도별 월별 실적 비교 표입니다.
            {years.length > 0 && (
              <span className="ml-1 text-indigo-600 font-semibold">
                (신규 연도 도래 시 컬럼이 자동 확장됩니다)
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center shrink-0">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-xs font-bold rounded-xl transition-all border border-slate-200 shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin text-indigo-600' : ''} />
            새로고침
          </button>
        </div>
      </div>

      {/* 2. Loading & Error States */}
      {isLoading && (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-400">숙박객 정밀 매트릭스 데이터를 불러오는 중...</p>
        </div>
      )}

      {error && !isLoading && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 text-xs">
          <AlertCircle size={18} className="shrink-0" />
          <div className="flex-1 font-medium">{error}</div>
          <button
            onClick={fetchData}
            className="px-3 py-1 bg-white border border-rose-300 rounded-lg font-bold text-rose-800 hover:bg-rose-100 transition-colors shadow-2xs"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 3. Matrix Table */}
      {!isLoading && !error && data && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-4 px-6 text-center w-28">월 (Month)</th>
                {years.map((yr) => {
                  const isLatest = yr === latestYear;
                  return (
                    <th 
                      key={yr} 
                      className={`py-4 px-6 text-center ${
                        isLatest 
                          ? 'bg-indigo-50/70 text-indigo-900 font-extrabold border-x border-indigo-100/80' 
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>{yr}년 숙박객</span>
                        {isLatest && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-600 text-white font-bold">
                            최신
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
                {prevYear && (
                  <th className="py-4 px-6 text-center bg-slate-50 text-slate-700">
                    YoY 증감 ({latestYear.slice(2)}년 vs {prevYear.slice(2)}년)
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {data.matrix.map((row: RoomGuestsYoyRow) => {
                const monthNum = row.month;
                const isSelectedMonth = monthNum === currentMonthNum;

                // Calculate YoY Diff between latestYear and prevYear
                let yoyDiff: number | null = null;
                let yoyPct: number | null = null;
                if (prevYear) {
                  const latestVal = typeof row[latestYear] === 'number' ? (row[latestYear] as number) : 0;
                  const prevVal = typeof row[prevYear] === 'number' ? (row[prevYear] as number) : 0;
                  if (latestVal > 0 && prevVal > 0) {
                    yoyDiff = Math.round((latestVal - prevVal) * 10) / 10;
                    yoyPct = Math.round((yoyDiff / prevVal) * 1000) / 10;
                  }
                }

                return (
                  <tr
                    key={monthNum}
                    className={`transition-colors ${
                      isSelectedMonth
                        ? 'bg-indigo-50/40 font-semibold'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Month Cell */}
                    <td className="py-4 px-6 text-center font-extrabold text-slate-800 bg-slate-50/40 text-sm">
                      <div className="flex items-center justify-center gap-1.5">
                        <span>{monthNum}월</span>
                        {isSelectedMonth && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                            당월
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Dynamic Year Columns */}
                    {years.map((yr) => {
                      const val = typeof row[yr] === 'number' ? (row[yr] as number) : 0;
                      const isLatest = yr === latestYear;
                      const isFuture = yr === currentYearStr && monthNum > currentMonthNum;

                      return (
                        <td
                          key={yr}
                          className={`py-4 px-6 text-center tabular-nums ${
                            isLatest
                              ? 'bg-indigo-50/30 border-x border-indigo-100/60 font-bold text-indigo-950'
                              : 'text-slate-700'
                          }`}
                        >
                          {val > 0 ? (
                            <span className={`font-mono ${isLatest ? 'text-sm font-extrabold text-indigo-900' : 'font-semibold'}`}>
                              {formatGuests(val)}
                            </span>
                          ) : isFuture ? (
                            <span className="text-slate-300 font-mono text-xs">미도래</span>
                          ) : (
                            <span className="text-slate-300 font-mono">-</span>
                          )}
                        </td>
                      );
                    })}

                    {/* YoY Diff Column */}
                    {prevYear && (
                      <td className="py-4 px-6 text-center">
                        {yoyDiff !== null && yoyPct !== null ? (
                          <div className="inline-flex items-center gap-1 font-mono text-xs font-bold">
                            {yoyDiff > 0 ? (
                              <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-xl shadow-2xs">
                                <ArrowUpRight size={13} className="stroke-[2.5]" />
                                +{yoyDiff.toLocaleString()}명 (+{yoyPct.toFixed(1)}%)
                              </span>
                            ) : yoyDiff < 0 ? (
                              <span className="inline-flex items-center gap-1 text-rose-800 bg-rose-100/80 px-2.5 py-1 rounded-xl shadow-2xs">
                                <ArrowDownRight size={13} className="stroke-[2.5]" />
                                {yoyDiff.toLocaleString()}명 ({yoyPct.toFixed(1)}%)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2.5 py-1 rounded-xl">
                                <Minus size={13} />
                                0명 (0.0%)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 font-mono">-</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. Footer Note */}
      <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center gap-1.5">
          <HelpCircle size={14} className="text-indigo-400 shrink-0" />
          <span>
            <b>산출 기준:</b> 판매 객실 수(rooms_sold) × 객실 타입별 정원(16평 2.5명, 35평 4명, 51평 6명 등) 반영 공식 숙박객 수
          </span>
        </div>
        <span className="text-slate-400">
          데이터 소스: V6 전용 API (/api/v6/report/room-guests-yoy)
        </span>
      </div>

    </div>
  );
}
