import React, { useState, useEffect } from 'react';
import { useDate } from '../contexts/DateContext';
import { secureFetcher } from '../lib/secureFetcher';
import { fetchLiveWeatherFallback } from '../lib/weatherService';
import GlobalDatePicker from '../components/GlobalDatePicker';
import { ArrowUpRight, ArrowDownRight, Minus, Calendar, CloudSun, Sparkles, RefreshCw } from 'lucide-react';

export interface V6MatrixRow {
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

interface WeatherInfo {
  description?: string;
  weatherDesc?: string;
  tempMax?: number;
  tempMin?: number;
}

export default function MatrixWeeklyDashboard() {
  const { startDate, endDate } = useDate();
  const [data, setData] = useState<V6MatrixRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 비교 모드 및 커스텀 비교일 상태
  const [compareMode, setCompareMode] = useState<'yoy_same_day' | 'custom'>('yoy_same_day');
  
  // 기준일 기반 전년 동요일(-364일) 기본 산출
  const defaultLyDateStr = React.useMemo(() => {
    const d = new Date(startDate);
    if (isNaN(d.getTime())) return '';
    const ly = new Date(d.getTime() - 364 * 24 * 60 * 60 * 1000);
    return ly.toISOString().split('T')[0];
  }, [startDate]);

  const [customCompareDate, setCustomCompareDate] = useState<string>('');

  // 실제 활성화된 비교일자
  const activeCompareDate = compareMode === 'yoy_same_day' ? defaultLyDateStr : (customCompareDate || defaultLyDateStr);

  // 날씨 상태 (기준일 & 비교일)
  const [baseWeather, setBaseWeather] = useState<WeatherInfo | null>(null);
  const [compareWeather, setCompareWeather] = useState<WeatherInfo | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);

  // 데이터 조회 (matrix-weekly)
  useEffect(() => {
    const fetchV6Matrix = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';
        let queryParams = '';
        const isActualRange = Boolean(endDate && startDate !== endDate);
        
        if (isActualRange) {
          // 기간 조회 시 startDate & endDate 전달 (단일 compareDate 배제)
          queryParams = `startDate=${startDate}&endDate=${endDate}`;
        } else {
          // 단일 일자 조회 시 date 단일 파라미터 전달 (동일 일자 중복 range 파라미터 전송 방지)
          queryParams = `date=${startDate}`;
          // 커스텀 비교일 모드일 때만 명시적으로 compareDate 전달
          if (compareMode === 'custom' && customCompareDate) {
            queryParams += `&compareDate=${customCompareDate}`;
          }
        }
        queryParams += `&_t=${Date.now()}`;

        const res = await secureFetcher(`${API_BASE}/api/v5/dashboard/matrix-weekly?${queryParams}`);
        const result = res.data || res;
        const payloadArray = Array.isArray(result) ? result : (result.data || []);
        setData(payloadArray);
      } catch (err: any) {
        console.error('Failed to fetch V6 matrix weekly', err);
        setError('데이터를 불러오는 중 문제가 발생했습니다.');
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchV6Matrix();
  }, [startDate, endDate, compareMode, customCompareDate]);

  // 날씨 데이터 조회 (기준일 및 비교일 듀얼 패칭)
  useEffect(() => {
    const fetchWeather = async () => {
      setIsWeatherLoading(true);
      const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';
      try {
        // 1. 기준일 날씨 조회
        const baseRes = await secureFetcher(`${API_BASE}/api/v5/dashboard/revenue-summary?date=${startDate}`);
        const basePayload = baseRes.data || baseRes;
        let bWeather = basePayload?.weather?.current || basePayload?.weather || null;
        
        if (!bWeather || bWeather.description === '데이터없음' || bWeather.weatherDesc === '데이터없음' || (!bWeather.tempMax && !bWeather.tempMin)) {
          const liveW = await fetchLiveWeatherFallback(startDate);
          if (liveW) {
            bWeather = liveW;
          }
        }

        setBaseWeather(bWeather ? {
          description: bWeather.description || bWeather.weatherDesc,
          tempMax: bWeather.tempMax ?? bWeather.temp_max,
          tempMin: bWeather.tempMin ?? bWeather.temp_min
        } : null);

        // 2. 비교일 날씨 조회
        if (compareMode === 'yoy_same_day') {
          // 전년 동요일 기본인 경우 revenue-summary 내의 lastYear 날씨 활용
          const lyW = basePayload?.weather?.lastYear;
          if (lyW) {
            setCompareWeather({
              description: lyW.description || lyW.weatherDesc,
              tempMax: lyW.tempMax ?? lyW.temp_max,
              tempMin: lyW.tempMin ?? lyW.temp_min
            });
          } else {
            // 없을 경우 직접 조회
            const lyRes = await secureFetcher(`${API_BASE}/api/v5/dashboard/revenue-summary?date=${activeCompareDate}`);
            const lyPayload = lyRes.data || lyRes;
            const w = lyPayload?.weather?.current || lyPayload?.weather || null;
            setCompareWeather(w ? {
              description: w.description || w.weatherDesc,
              tempMax: w.tempMax ?? w.temp_max,
              tempMin: w.tempMin ?? w.temp_min
            } : null);
          }
        } else {
          // 커스텀 비교일인 경우 해당 일자 단독 조회
          const customRes = await secureFetcher(`${API_BASE}/api/v5/dashboard/revenue-summary?date=${activeCompareDate}`);
          const customPayload = customRes.data || customRes;
          const w = customPayload?.weather?.current || customPayload?.weather || null;
          setCompareWeather(w ? {
            description: w.description || w.weatherDesc,
            tempMax: w.tempMax ?? w.temp_max,
            tempMin: w.tempMin ?? w.temp_min
          } : null);
        }
      } catch (e) {
        console.error('Weather fetch error:', e);
      } finally {
        setIsWeatherLoading(false);
      }
    };

    fetchWeather();
  }, [startDate, activeCompareDate, compareMode]);

  // 빠른 비교일 프리셋 핸들러
  const handlePreset = (offsetDays: number) => {
    const base = new Date(startDate);
    if (isNaN(base.getTime())) return;
    const target = new Date(base.getTime() - offsetDays * 24 * 60 * 60 * 1000);
    setCompareMode('custom');
    setCustomCompareDate(target.toISOString().split('T')[0]);
  };

  // 중복 소계 행 정제 및 실적 0원 매장/소계 숨김 필터 (바이블 준수: 백엔드 수치는 재계산하지 않고 화면 표시만 필터링)
  const displayRows = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return data.filter((row, idx, arr) => {
      if (row.isGrandTotal) return true;

      const isAllZero = (row.todayActual || 0) === 0 && (row.todayLy || 0) === 0 &&
                        (row.mtdActual || 0) === 0 && (row.mtdLy || 0) === 0 &&
                        (row.ytdActual || 0) === 0 && (row.ytdLy || 0) === 0;

      if (isAllZero) return false;

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

  const formatCurrency = (val: any) => {
    if (!val) return '0';
    const num = typeof val === 'string' ? Number(val.replace(/,/g, '')) : Number(val);
    return isNaN(num) ? '0' : new Intl.NumberFormat('ko-KR').format(Math.round(num));
  };

  const renderGrowth = (rate?: number) => {
    if (rate === undefined || rate === null) return <span className="text-slate-400">-</span>;
    if (rate === 0) return <span className="text-slate-400 flex items-center gap-1 justify-end"><Minus size={14}/> 0%</span>;
    
    if (rate > 0) {
      return (
        <span className="text-slate-900 font-bold flex items-center gap-1 justify-end">
          <ArrowUpRight size={14} className="text-slate-900 stroke-[2.5]" />
          {rate.toFixed(1)}%
        </span>
      );
    }
    return (
      <span className="text-red-600 font-semibold flex items-center gap-1 justify-end">
        <ArrowDownRight size={14} className="text-red-600 stroke-[2.5]" />
        {Math.abs(rate).toFixed(1)}%
      </span>
    );
  };

  const getSubtotalLabel = (row: V6MatrixRow) => {
    if (row.isGrandTotal) return '총계 (Grand Total)';
    if (row.subtotalType === 'category') return `${row.categoryName || row.categoryCode} 소계`;
    if (row.subtotalType === 'team') return `${row.teamName} 소계`;
    if (row.subtotalType === 'part') return `${row.partName} 소계`;
    if (row.shopName === '소계') return `${row.categoryName || row.teamName || '카테고리'} 소계`;
    return row.shopName;
  };

  const renderWeatherIcon = (desc?: string) => {
    if (!desc) return '☁️';
    if (desc.includes('비')) return '🌧️';
    if (desc.includes('눈')) return '❄️';
    if (desc.includes('구름') || desc.includes('흐림')) return '⛅';
    if (desc.includes('맑음')) return '☀️';
    return '⛅';
  };

  const parsedBaseDate = new Date(startDate);
  const parsedCompareDate = new Date(activeCompareDate || defaultLyDateStr);
  
  const currFormatter = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
  const compareFormatter = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Top Header & Date / Comparison Controls */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              {compareMode === 'yoy_same_day' ? '전년 동요일 비교' : '맞춤 비교 분석'}
            </h1>
            <span className="bg-brand-mint/10 text-brand-mint text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {compareMode === 'yoy_same_day' ? '전년 동요일 매칭' : '커스텀 비교일'}
            </span>
          </div>
          
          {/* Main Date & Weather Meta Badges */}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            {/* 기준일 뱃지 */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <span className="font-bold text-brand-mint text-xs bg-brand-mint/10 px-2 py-0.5 rounded-md">조회 기준일</span>
              <span className="font-semibold text-slate-700">
                {endDate && startDate !== endDate ? `${startDate} ~ ${endDate}` : currFormatter.format(parsedBaseDate)}
              </span>
              {baseWeather && (
                <span className="text-xs text-slate-500 flex items-center gap-1 pl-2 border-l border-slate-200">
                  <span>{renderWeatherIcon(baseWeather.description)}</span>
                  <span>{baseWeather.description || '맑음'}</span>
                  {baseWeather.tempMax !== undefined && (
                    <span className="font-medium text-slate-600">({baseWeather.tempMax}℃/{baseWeather.tempMin}℃)</span>
                  )}
                </span>
              )}
            </div>

            <span className="text-slate-400 font-bold">VS</span>

            {/* 비교 대상일 뱃지 */}
            <div className="flex items-center gap-2 bg-emerald-50/70 border border-emerald-200 px-3 py-1.5 rounded-xl">
              <span className="font-bold text-emerald-800 text-xs bg-emerald-100 px-2 py-0.5 rounded-md">비교 대상일</span>
              <span className="font-semibold text-slate-700">
                {compareFormatter.format(parsedCompareDate)}
              </span>
              {compareWeather ? (
                <span className="text-xs text-slate-500 flex items-center gap-1 pl-2 border-l border-emerald-200">
                  <span>{renderWeatherIcon(compareWeather.description)}</span>
                  <span>{compareWeather.description || '맑음'}</span>
                  {compareWeather.tempMax !== undefined && (
                    <span className="font-medium text-slate-600">({compareWeather.tempMax}℃/{compareWeather.tempMin}℃)</span>
                  )}
                </span>
              ) : isWeatherLoading ? (
                <span className="text-xs text-slate-400 pl-2 border-l border-emerald-200 flex items-center gap-1">
                  <RefreshCw size={12} className="animate-spin text-emerald-600" /> 날씨 로딩중...
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Comparison Control Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto mt-2 xl:mt-0">
          <GlobalDatePicker />
        </div>
      </div>

      {/* Comparison Options Bar */}
      <div className="bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
            <Sparkles size={14} className="text-brand-mint" />
            비교 대상 설정:
          </div>

          {/* Mode Switcher */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setCompareMode('yoy_same_day')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                compareMode === 'yoy_same_day'
                  ? 'bg-white text-brand-mint shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              전년 동요일 (기본)
            </button>
            <button
              onClick={() => setCompareMode('custom')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                compareMode === 'custom'
                  ? 'bg-white text-brand-mint shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              직접 비교일 선택
            </button>
          </div>

          {/* Custom Date Input */}
          {compareMode === 'custom' && (
            <div className="flex items-center gap-2">
              <div className="relative flex items-center">
                <Calendar size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={customCompareDate || defaultLyDateStr}
                  onChange={(e) => setCustomCompareDate(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-mint"
                />
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePreset(7)}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-medium rounded-md transition-colors"
                >
                  전주 동요일(-7일)
                </button>
                <button
                  onClick={() => handlePreset(28)}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-medium rounded-md transition-colors"
                >
                  전월 동요일(-4주)
                </button>
                <button
                  onClick={() => handlePreset(364)}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-medium rounded-md transition-colors"
                >
                  전년 동요일(-52주)
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <CloudSun size={14} className="text-amber-500" />
          <span>기상 조건에 따른 실적 변동 비교 분석 지원</span>
        </div>
      </div>

      {/* Main Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header Notice */}
        <div className="bg-teal-50/80 px-6 py-3.5 border-b border-teal-100 flex items-center justify-between text-xs lg:text-sm text-teal-900 font-medium">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></div>
            리조트 전사 부문별 실시간 통합 정산 현황 (순매출 · 부가세 별도)
          </div>
          <div className="text-xs text-teal-800 font-bold">
            비교 대상: {compareFormatter.format(parsedCompareDate)}
          </div>
        </div>

        <div className="overflow-auto max-h-[calc(100vh-280px)]">
          <table className="w-full text-sm text-right whitespace-nowrap border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-20 shadow-sm">
              <tr className="bg-slate-100/95">
                <th className="p-4 text-left border-r border-b border-slate-200 sticky top-0 left-0 z-30 bg-slate-100 font-bold text-slate-700 shadow-sm" rowSpan={2}>
                  분류 / 영업장명
                </th>
                <th className="p-3 text-center border-r border-b border-slate-200 sticky top-0 z-20 bg-slate-100 font-bold" colSpan={3}>
                  {endDate && startDate !== endDate ? '선택 기간 (Period)' : '금일 (Today)'}
                </th>
                <th className="p-3 text-center border-r border-b border-slate-200 sticky top-0 z-20 bg-slate-100 font-bold" colSpan={3}>
                  월누계 (MTD)
                </th>
                <th className="p-3 text-center border-b border-slate-200 sticky top-0 z-20 bg-slate-100 font-bold" colSpan={3}>
                  연누계 (YTD)
                </th>
              </tr>
              <tr className="bg-slate-100/95 text-xs">
                {/* Period / Today */}
                <th className="p-3 border-r border-slate-200 font-medium sticky top-[45px] z-20 bg-slate-100">
                  {endDate && startDate !== endDate ? '기간 실적' : '실적'}
                </th>
                <th className="p-3 border-r border-slate-200 font-semibold text-slate-600 sticky top-[45px] z-20 bg-slate-100">
                  {compareMode === 'yoy_same_day' ? '전년 동요일' : '비교일 실적'}
                </th>
                <th className="p-3 border-r border-slate-200 font-medium sticky top-[45px] z-20 bg-slate-100">증감률</th>
                {/* MTD */}
                <th className="p-3 border-r border-slate-200 font-medium sticky top-[45px] z-20 bg-slate-100">실적</th>
                <th className="p-3 border-r border-slate-200 font-medium sticky top-[45px] z-20 bg-slate-100">
                  {compareMode === 'yoy_same_day' ? '전년 동기(동요일)' : '전년 동기'}
                </th>
                <th className="p-3 border-r border-slate-200 font-medium sticky top-[45px] z-20 bg-slate-100">증감률</th>
                {/* YTD */}
                <th className="p-3 border-r border-slate-200 font-medium sticky top-[45px] z-20 bg-slate-100">실적</th>
                <th className="p-3 border-r border-slate-200 font-medium sticky top-[45px] z-20 bg-slate-100">
                  {compareMode === 'yoy_same_day' ? '전년 동기(동요일)' : '전년 동기'}
                </th>
                <th className="p-3 font-medium sticky top-[45px] z-20 bg-slate-100">증감률</th>
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
                  let lyValueClasses = "text-slate-500 font-medium";
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
