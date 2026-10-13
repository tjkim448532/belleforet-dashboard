import { useState, useEffect, useMemo } from 'react';
import { BedDouble, Users, RefreshCw, AlertCircle, HelpCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { secureFetcher } from '../../lib/secureFetcher';
import { useDate } from '../../contexts/DateContext';
import { getClosedBusinessDate, getClosedBusinessYear } from '../../lib/dateUtils';
import type { RoomGuestsYoyResponse, RoomGuestsYoyRow } from '../../types/reports-v2';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

export default function RoomGuestsYoyTable() {
  const { startDate } = useDate();
  const [metricMode, setMetricMode] = useState<'GUESTS' | 'ROOMS'>('GUESTS');
  const [data, setData] = useState<RoomGuestsYoyResponse | null>(null);
  const [revenueMap, setRevenueMap] = useState<Record<string, Record<number, number>>>({});
  const [roomsSoldMap, setRoomsSoldMap] = useState<Record<string, Record<number, number>>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch Room Guests YoY Matrix & 2. Fetch Monthly Room Efficiency for Room Subtotal & Rooms Sold
      const curYear = getClosedBusinessYear();
      const prevYear = curYear - 1;
      const prev2Year = curYear - 2;

      const [resYoy, resEffCurrent, resEffPrev] = await Promise.all([
        secureFetcher(`${API_BASE}/api/v6/report/room-guests-yoy?startYear=2024`),
        secureFetcher(`${API_BASE}/api/v6/report/monthly-room-efficiency?baseYear=${curYear}&compareYear=${prevYear}`).catch(() => null),
        secureFetcher(`${API_BASE}/api/v6/report/monthly-room-efficiency?baseYear=${prevYear}&compareYear=${prev2Year}`).catch(() => null),
      ]);

      const payloadYoy: RoomGuestsYoyResponse = resYoy?.data ?? resYoy;
      if (payloadYoy?.success && Array.isArray(payloadYoy.years) && Array.isArray(payloadYoy.matrix)) {
        setData(payloadYoy);
      } else {
        setError(payloadYoy?.error || '숙박객 YoY 매트릭스 데이터를 불러오지 못했습니다.');
      }

      // Build Revenue & Rooms Sold Map by Year & Month (ROOM + ROOM OTHER Subtotal & Actual Rooms Sold)
      const revMap: Record<string, Record<number, number>> = {};
      const soldMap: Record<string, Record<number, number>> = {};
      for (let y = 2024; y <= curYear; y++) {
        revMap[String(y)] = {};
        soldMap[String(y)] = {};
      }
      if (resEffCurrent?.monthlyComparison) {
        resEffCurrent.monthlyComparison.forEach((m: any) => {
          if (typeof m.ty?.roomRevenue === 'number' && m.ty.roomRevenue > 0) {
            revMap[String(curYear)][m.month] = m.ty.roomRevenue;
          }
          if (typeof m.ly?.roomRevenue === 'number' && m.ly.roomRevenue > 0) {
            revMap[String(prevYear)][m.month] = m.ly.roomRevenue;
          }
          if (typeof m.ty?.roomsSold === 'number' && m.ty.roomsSold > 0) {
            soldMap[String(curYear)][m.month] = m.ty.roomsSold;
          }
          if (typeof m.ly?.roomsSold === 'number' && m.ly.roomsSold > 0) {
            soldMap[String(prevYear)][m.month] = m.ly.roomsSold;
          }
        });
      }
      if (resEffPrev?.monthlyComparison) {
        resEffPrev.monthlyComparison.forEach((m: any) => {
          if (typeof m.ty?.roomRevenue === 'number' && m.ty.roomRevenue > 0 && !revMap[String(prevYear)][m.month]) {
            revMap[String(prevYear)][m.month] = m.ty.roomRevenue;
          }
          if (typeof m.ly?.roomRevenue === 'number' && m.ly.roomRevenue > 0 && !revMap[String(prev2Year)][m.month]) {
            revMap[String(prev2Year)][m.month] = m.ly.roomRevenue;
          }
          if (typeof m.ty?.roomsSold === 'number' && m.ty.roomsSold > 0 && !soldMap[String(prevYear)][m.month]) {
            soldMap[String(prevYear)][m.month] = m.ty.roomsSold;
          }
          if (typeof m.ly?.roomsSold === 'number' && m.ly.roomsSold > 0 && !soldMap[String(prev2Year)][m.month]) {
            soldMap[String(prev2Year)][m.month] = m.ly.roomsSold;
          }
        });
      }
      setRevenueMap(revMap);
      setRoomsSoldMap(soldMap);

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
    if (!startDate) return getClosedBusinessDate(1).getMonth() + 1;
    const parts = startDate.split('-');
    if (parts.length >= 2) {
      return parseInt(parts[1], 10);
    }
    return getClosedBusinessDate(1).getMonth() + 1;
  }, [startDate]);

  // Current year string from global date context (e.g. '2026')
  const currentYearStr = useMemo(() => {
    if (!startDate) return String(getClosedBusinessYear());
    return startDate.split('-')[0] || String(getClosedBusinessYear());
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

  // Helper to retrieve revenue for a given year & month (prioritizes backend room-guests-yoy payload if present)
  const getRevenue = (yr: string, month: number, row: RoomGuestsYoyRow): number => {
    const raw = row[yr] as any;
    if (raw && typeof raw === 'object') {
      if (typeof raw.revenue === 'number') return raw.revenue;
      if (typeof raw.roomRevenue === 'number') return raw.roomRevenue;
    }
    const propName = `revenue_${yr}` as keyof RoomGuestsYoyRow;
    if (typeof row[propName] === 'number') return row[propName] as number;
    return revenueMap[yr]?.[month] ?? 0;
  };

  // Helper to format guest count numbers (integers or .5 decimal values)
  const formatGuests = (val: number | undefined) => {
    if (val === undefined || val === null || val === 0) return '-';
    if (val % 1 !== 0) {
      return `${val.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}명`;
    }
    return `${val.toLocaleString('ko-KR')}명`;
  };

  const getRoomsSold = (yr: string, month: number): number => {
    return roomsSoldMap[yr]?.[month] ?? 0;
  };

  const formatRooms = (val: number | undefined) => {
    if (val === undefined || val === null || val === 0) return '-';
    return `${Math.round(val).toLocaleString('ko-KR')}실`;
  };

  const formatCurrency = (val: number) => {
    return Math.round(val).toLocaleString('ko-KR');
  };

  const formatCompactCurrency = (amount: number) => {
    const abs = Math.abs(amount);
    if (abs >= 100_000_000) {
      return `${(abs / 100_000_000).toFixed(2)}억`;
    }
    if (abs >= 10_000) {
      return `${Math.round(abs / 10_000).toLocaleString()}만`;
    }
    return abs.toLocaleString();
  };

  return (
    <div className="col-span-1 lg:col-span-12 w-full bg-white rounded-[32px] border border-slate-200/80 p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
      
      {/* 1. Header & Title Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              {metricMode === 'GUESTS' ? <Users size={18} /> : <BedDouble size={18} />}
            </div>
            <h3 className="text-lg lg:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
              <span>연도별 벨포레 {metricMode === 'GUESTS' ? '숙박객' : '실제 판매 방수'} 및 객실 소계 매출 매트릭스</span>
              <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100/80 px-2.5 py-0.5 rounded-full font-bold">
                {years.join(' · ')}년 (1월 ~ 12월)
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed max-w-3xl">
            {metricMode === 'GUESTS' ? (
              <>
                관리자 설정 기준 정원(16평 2.5명, 35평 4명, 51평 6명 등)으로 산출한 <strong>전체 숙박객(진성 투숙객 인원수 모수)</strong>과 객실 소계(ROOM + ROOM OTHER) 매출의 연도별 실적 추이입니다.
              </>
            ) : (
              <>
                PMS 확정 체크인 기준 <strong>실제 판매된 객실수(실제 투숙 방수 모수)</strong>와 객실 소계(ROOM + ROOM OTHER) 매출의 연도별 실적 추이입니다.
              </>
            )}
            {years.length > 0 && (
              <span className="ml-1 text-indigo-600 font-semibold">
                (신규 연도 도래 시 컬럼이 자동 확장됩니다)
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-center shrink-0">
          {/* Segmented Mode Switcher: 숙박객수(명) vs 실제 판매 방수(실) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80 shadow-2xs">
            <button
              onClick={() => setMetricMode('GUESTS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                metricMode === 'GUESTS'
                  ? 'bg-white text-indigo-700 shadow-2xs font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="관리자 설정 정원 기준 환산 숙박객 수(인원·명) 표출"
            >
              <Users size={13} />
              <span>숙박객수 (명)</span>
            </button>
            <button
              onClick={() => setMetricMode('ROOMS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                metricMode === 'ROOMS'
                  ? 'bg-indigo-600 text-white shadow-2xs font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="PMS 확정 실제 판매된 방수(실) 표출"
            >
              <BedDouble size={13} />
              <span>실제 판매 방수 (실)</span>
            </button>
          </div>

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
          <p className="text-xs font-semibold text-slate-400">숙박객 및 객실 소계 매트릭스 데이터를 불러오는 중...</p>
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
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[850px]">
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
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span>{yr}년 실적</span>
                          {isLatest && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-600 text-white font-bold">
                              최신
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-normal text-slate-400">
                          ({metricMode === 'GUESTS' ? '숙박객' : '판매방수'} / 객실소계)
                        </span>
                      </div>
                    </th>
                  );
                })}
                {prevYear && (
                  <th className="py-4 px-6 text-center bg-slate-50 text-slate-700">
                    <div className="flex flex-col items-center justify-center gap-0.5">
                      <span>YoY 증감 ({latestYear.slice(2)}년 vs {prevYear.slice(2)}년)</span>
                      <span className="text-[10px] font-normal text-slate-400">
                        ({metricMode === 'GUESTS' ? '인원 증감' : '방수 증감'} / 매출 증감)
                      </span>
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {data.matrix.map((row: RoomGuestsYoyRow) => {
                const monthNum = row.month;
                const isSelectedMonth = monthNum === currentMonthNum;

                // Calculate YoY Diff between latestYear and prevYear for Primary Metric & Revenue
                let yoyPrimaryDiff: number | null = null;
                let yoyPrimaryPct: number | null = null;
                let yoyRevDiff: number | null = null;
                let yoyRevPct: number | null = null;

                if (prevYear) {
                  const rawLatest = row[latestYear];
                  const rawPrev = row[prevYear];
                  const latestGuests = typeof rawLatest === 'number' ? rawLatest : 0;
                  const prevGuests = typeof rawPrev === 'number' ? rawPrev : 0;

                  const latestRooms = getRoomsSold(latestYear, monthNum);
                  const prevRooms = getRoomsSold(prevYear, monthNum);

                  if (metricMode === 'GUESTS') {
                    if (latestGuests > 0 && prevGuests > 0) {
                      yoyPrimaryDiff = Math.round((latestGuests - prevGuests) * 10) / 10;
                      yoyPrimaryPct = Math.round((yoyPrimaryDiff / prevGuests) * 1000) / 10;
                    }
                  } else {
                    if (latestRooms > 0 && prevRooms > 0) {
                      yoyPrimaryDiff = latestRooms - prevRooms;
                      yoyPrimaryPct = Math.round((yoyPrimaryDiff / prevRooms) * 1000) / 10;
                    }
                  }

                  const latestRev = getRevenue(latestYear, monthNum, row);
                  const prevRev = getRevenue(prevYear, monthNum, row);
                  if (latestRev > 0 && prevRev > 0) {
                    yoyRevDiff = Math.round(latestRev - prevRev);
                    yoyRevPct = Math.round((yoyRevDiff / prevRev) * 1000) / 10;
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
                      const rawVal = row[yr];
                      const guests = typeof rawVal === 'number' ? rawVal : 0;
                      const roomsSold = getRoomsSold(yr, monthNum);
                      const revenue = getRevenue(yr, monthNum, row);
                      const isLatest = yr === latestYear;
                      const isFuture = yr === currentYearStr && monthNum > currentMonthNum;

                      const hasPrimaryVal = metricMode === 'GUESTS' ? guests > 0 : roomsSold > 0;

                      return (
                        <td
                          key={yr}
                          className={`py-4 px-6 text-center tabular-nums ${
                            isLatest
                              ? 'bg-indigo-50/30 border-x border-indigo-100/60'
                              : ''
                          }`}
                        >
                          <div className="flex flex-col items-center gap-1">
                            {/* 상단: 숙박객 수(명) 또는 실제 판매 방수(실) */}
                            <div className="flex items-center gap-1">
                              {metricMode === 'GUESTS' ? (
                                guests > 0 ? (
                                  <span className={`font-mono ${isLatest ? 'text-sm font-black text-indigo-950' : 'text-xs font-bold text-slate-800'}`}>
                                    {formatGuests(guests)}
                                  </span>
                                ) : isFuture ? (
                                  <span className="text-slate-300 font-mono text-xs">미도래</span>
                                ) : (
                                  <span className="text-slate-300 font-mono text-xs">-</span>
                                )
                              ) : (
                                roomsSold > 0 ? (
                                  <span className={`font-mono ${isLatest ? 'text-sm font-black text-indigo-950' : 'text-xs font-bold text-slate-800'}`}>
                                    {formatRooms(roomsSold)}
                                  </span>
                                ) : isFuture ? (
                                  <span className="text-slate-300 font-mono text-xs">미도래</span>
                                ) : (
                                  <span className="text-slate-300 font-mono text-xs">-</span>
                                )
                              )}
                            </div>

                            {/* 하단: 객실 소계 매출 (ROOM + ROOM OTHER) */}
                            {revenue > 0 ? (
                              <div className="flex items-center gap-1">
                                <span className={`font-mono text-[11px] px-2 py-0.5 rounded-md ${
                                  isLatest 
                                    ? 'text-indigo-800 bg-indigo-100/90 font-black' 
                                    : 'text-slate-600 bg-slate-100 font-semibold'
                                }`}>
                                  {formatCurrency(revenue)}원
                                </span>
                              </div>
                            ) : hasPrimaryVal ? (
                              <span className="text-[10px] text-slate-300 font-mono">-</span>
                            ) : null}
                          </div>
                        </td>
                      );
                    })}

                    {/* YoY Diff Column (인원/방수 증감 & 매출 증감) */}
                    {prevYear && (
                      <td className="py-4 px-6 text-center">
                        {yoyPrimaryDiff !== null && yoyPrimaryPct !== null ? (
                          <div className="flex flex-col items-center gap-1.5 font-mono text-xs">
                            {/* 인원 증감 또는 방수 증감 */}
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-400 font-sans font-bold">
                                {metricMode === 'GUESTS' ? '인원' : '방수'}
                              </span>
                              {yoyPrimaryDiff > 0 ? (
                                <span className="inline-flex items-center gap-0.5 text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-lg font-bold">
                                  <ArrowUpRight size={12} className="stroke-[2.5]" />
                                  +{yoyPrimaryDiff.toLocaleString()}{metricMode === 'GUESTS' ? '명' : '실'} ({yoyPrimaryPct > 0 ? `+${yoyPrimaryPct.toFixed(1)}%` : `${yoyPrimaryPct.toFixed(1)}%`})
                                </span>
                              ) : yoyPrimaryDiff < 0 ? (
                                <span className="inline-flex items-center gap-0.5 text-rose-800 bg-rose-100/90 px-2 py-0.5 rounded-lg font-bold">
                                  <ArrowDownRight size={12} className="stroke-[2.5]" />
                                  {yoyPrimaryDiff.toLocaleString()}{metricMode === 'GUESTS' ? '명' : '실'} ({yoyPrimaryPct.toFixed(1)}%)
                                </span>
                              ) : (
                                <span className="text-slate-500 font-bold">0{metricMode === 'GUESTS' ? '명' : '실'} (0.0%)</span>
                              )}
                            </div>

                            {/* 매출 증감 */}
                            {yoyRevDiff !== null && yoyRevPct !== null ? (
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-indigo-400 font-sans font-bold">매출</span>
                                {yoyRevDiff > 0 ? (
                                  <span className="inline-flex items-center gap-0.5 text-indigo-900 bg-indigo-100/90 px-2 py-0.5 rounded-lg font-bold">
                                    <ArrowUpRight size={12} className="stroke-[2.5]" />
                                    +{formatCompactCurrency(yoyRevDiff)}원 ({yoyRevPct > 0 ? `+${yoyRevPct.toFixed(1)}%` : `${yoyRevPct.toFixed(1)}%`})
                                  </span>
                                ) : yoyRevDiff < 0 ? (
                                  <span className="inline-flex items-center gap-0.5 text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-lg font-bold">
                                    <ArrowDownRight size={12} className="stroke-[2.5]" />
                                    -{formatCompactCurrency(yoyRevDiff)}원 ({yoyRevPct.toFixed(1)}%)
                                  </span>
                                ) : (
                                  <span className="text-slate-500 font-bold">0원 (0.0%)</span>
                                )}
                              </div>
                            ) : null}
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
            {/* ⭐ 연간 총합 (totals) 행 (NO SLICE SUMMATION: 백엔드 공식 집계 완제품 바인딩) */}
            {data?.totals && (
              <tfoot className="bg-indigo-50/70 border-t-2 border-indigo-200 text-xs font-bold text-indigo-950">
                <tr>
                  <td className="py-4 px-6 text-center font-black text-sm bg-indigo-100/60 sticky left-0 z-10 border-r border-indigo-200">
                    <div>연간 총합</div>
                    <div className="text-[10px] text-indigo-700 font-semibold">
                      {metricMode === 'GUESTS' ? '(공식 SSOT)' : '(월별 실측 제공)'}
                    </div>
                  </td>
                  {years.map((yr) => {
                    const isLatest = yr === latestYear;
                    const guestTotal = data.totals?.[yr];
                    return (
                      <td
                        key={`total_${yr}`}
                        className={`py-4 px-6 text-center ${
                          isLatest ? 'bg-indigo-100/80 border-x border-indigo-200' : ''
                        }`}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={`font-mono ${isLatest ? 'text-base font-black text-indigo-950' : 'text-sm font-bold text-slate-800'}`}>
                            {metricMode === 'GUESTS'
                              ? (guestTotal !== undefined ? `${guestTotal.toLocaleString('ko-KR')}명` : '-')
                              : '-'
                            }
                          </span>
                        </div>
                      </td>
                    );
                  })}
                  {prevYear && latestYear && (
                    <td className="py-4 px-6 text-center bg-indigo-50/50">
                      {metricMode === 'GUESTS' && data.totals?.[latestYear] !== undefined && data.totals?.[prevYear] !== undefined ? (() => {
                        const diff = data.totals[latestYear] - data.totals[prevYear];
                        const pct = data.totals[prevYear] > 0 ? (diff / data.totals[prevYear]) * 100 : null;
                        return (
                          <div className="flex flex-col items-center gap-1 font-mono text-xs">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-400 font-sans font-bold">인원</span>
                              {diff > 0 ? (
                                <span className="inline-flex items-center gap-0.5 text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-lg font-bold">
                                  <ArrowUpRight size={12} className="stroke-[2.5]" />
                                  +{diff.toLocaleString()}명 {pct !== null ? `(+${pct.toFixed(1)}%)` : ''}
                                </span>
                              ) : diff < 0 ? (
                                <span className="inline-flex items-center gap-0.5 text-rose-800 bg-rose-100/90 px-2 py-0.5 rounded-lg font-bold">
                                  <ArrowDownRight size={12} className="stroke-[2.5]" />
                                  {diff.toLocaleString()}명 {pct !== null ? `(${pct.toFixed(1)}%)` : ''}
                                </span>
                              ) : (
                                <span className="text-slate-500 font-bold">0명 (0.0%)</span>
                              )}
                            </div>
                          </div>
                        );
                      })() : (
                        <span className="text-slate-300 font-mono">-</span>
                      )}
                    </td>
                  )}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* 4. Footer Note */}
      <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center gap-1.5">
          <HelpCircle size={14} className="text-indigo-400 shrink-0" />
          <span>
            <b>각 셀 표기:</b> [상단] {metricMode === 'GUESTS' ? '숙박객 수(인원·명)' : '실제 판매 방수(객실·실)'}, [하단] 객실 소계 매출(ROOM + ROOM OTHER, 원)
          </span>
        </div>
        <span className="text-slate-400">
          데이터 소스: V6 정밀 데이터 마트 API (/api/v6/report/room-guests-yoy, /api/v6/report/monthly-room-efficiency)
        </span>
      </div>

    </div>
  );
}
