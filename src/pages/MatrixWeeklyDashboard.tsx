import { useState, useEffect, useMemo } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus,
  Calendar,
  CloudSun,
  Layers
} from 'lucide-react';
import { secureFetcher } from '../lib/secureFetcher';
import { fetchLiveWeatherFallback } from '../lib/weatherService';
import { standardizeGridRows } from '../lib/standardVenueUtils';

interface V6MatrixRow {
  isSubtotal?: boolean;
  isGrandTotal?: boolean;
  subtotalType?: 'category' | 'team' | 'part' | 'grand_total';
  categoryCode: string;
  categoryName: string;
  teamName: string;
  partName: string;
  shopName: string;
  todayActual: number | string;
  todayLy: number | string;
  todayGrowth?: number;
  mtdActual: number | string;
  mtdLy: number | string;
  mtdGrowth?: number;
  ytdActual: number | string;
  ytdLy: number | string;
  ytdGrowth?: number;
}

interface WeatherInfo {
  description?: string;
  tempMax?: number;
  tempMin?: number;
}

/**
 * Calculates dynamic rowspans for hierarchical table rendering (Phase 2).
 * Returns categoryRowspans and teamRowspans arrays.
 * > 0: render <td> with rowSpan = value
 * === 0: skip <td> (merged with previous row)
 */
export function calculateHierarchyRowspans(rows: V6MatrixRow[]) {
  const categoryRowspans: number[] = new Array(rows.length).fill(0);
  const teamRowspans: number[] = new Array(rows.length).fill(0);

  let i = 0;
  while (i < rows.length) {
    const row = rows[i];

    if (row.isSubtotal || row.isGrandTotal) {
      categoryRowspans[i] = 1;
      teamRowspans[i] = 1;
      i++;
      continue;
    }

    const currentCat = row.categoryCode || row.categoryName;
    let catCount = 0;
    while (
      i + catCount < rows.length &&
      !rows[i + catCount].isSubtotal &&
      !rows[i + catCount].isGrandTotal &&
      (rows[i + catCount].categoryCode === currentCat || rows[i + catCount].categoryName === currentCat)
    ) {
      catCount++;
    }

    categoryRowspans[i] = catCount;
    for (let k = 1; k < catCount; k++) {
      categoryRowspans[i + k] = 0;
    }

    let t = i;
    while (t < i + catCount) {
      const currentTeam = `${rows[t].teamName || ''}_${rows[t].partName || ''}`;
      let tmCount = 0;
      while (
        t + tmCount < i + catCount &&
        `${rows[t + tmCount].teamName || ''}_${rows[t + tmCount].partName || ''}` === currentTeam
      ) {
        tmCount++;
      }

      teamRowspans[t] = tmCount;
      for (let k = 1; k < tmCount; k++) {
        teamRowspans[t + k] = 0;
      }
      t += tmCount;
    }

    i += catCount;
  }

  return { categoryRowspans, teamRowspans };
}

export default function MatrixWeeklyDashboard() {
  const [data, setData] = useState<V6MatrixRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 기준 일자 및 범위
  const [startDate, setStartDate] = useState<string>(() => {
    const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
    return kst.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>('');

  // 비교 모드: 'yoy_same_day' (52주 전 동요일) | 'custom' (직접 입력/프리셋)
  const [compareMode, setCompareMode] = useState<'yoy_same_day' | 'custom'>('yoy_same_day');

  // 기준일 기반 전년 동요일(-364일) 기본 산출
  const defaultLyDateStr = useMemo(() => {
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

  // 데이터 조회 (Single Request: startDate, endDate / date, compareDate)
  useEffect(() => {
    let isMounted = true;
    const fetchMatrixData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';
        const isActualRange = Boolean(endDate && startDate !== endDate);
        const queryParams = isActualRange
          ? `startDate=${startDate}&endDate=${endDate}`
          : `date=${startDate}${compareMode === 'custom' && customCompareDate ? `&compareDate=${customCompareDate}` : ''}`;

        const res = await secureFetcher(`${API_BASE}/api/v6/dashboard/overview?${queryParams}&_t=${Date.now()}`);
        if (!isMounted) return;

        const result = res.data || res;
        const payloadArray = result.gridData || (Array.isArray(result) ? result : (result.data || []));
        setData(standardizeGridRows(payloadArray));
        
        if (result.weather) {
          setBaseWeather({
            description: result.weather.description || '맑음',
            tempMax: result.weather.tempMax ?? 28,
            tempMin: result.weather.tempMin ?? 19
          });
        }
      } catch (err: any) {
        console.error('Failed to fetch V6 matrix overview', err);
        if (isMounted) {
          setError('전년 동요일 매트릭스 데이터를 불러오는 중 문제가 발생했습니다.');
          setData([]);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchMatrixData();
    return () => {
      isMounted = false;
    };
  }, [startDate, endDate, compareMode, customCompareDate]);


  // 날씨 데이터 조회
  useEffect(() => {
    let isMounted = true;
    const fetchWeather = async () => {
      setIsWeatherLoading(true);
      const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';
      try {
        const baseRes = await secureFetcher(`${API_BASE}/api/v5/dashboard/revenue-summary?date=${startDate}`);
        const basePayload = baseRes.data || baseRes;
        let bWeather = basePayload?.weather?.current || basePayload?.weather || null;

        if (!bWeather || bWeather.description === '데이터없음' || bWeather.weatherDesc === '데이터없음' || (!bWeather.tempMax && !bWeather.tempMin)) {
          const liveW = await fetchLiveWeatherFallback(startDate);
          if (liveW) bWeather = liveW;
        }

        if (!isMounted) return;
        setBaseWeather(bWeather ? {
          description: bWeather.description || bWeather.weatherDesc,
          tempMax: bWeather.tempMax ?? bWeather.temp_max,
          tempMin: bWeather.tempMin ?? bWeather.temp_min
        } : null);

        if (compareMode === 'yoy_same_day') {
          const lyW = basePayload?.weather?.lastYear;
          if (lyW) {
            setCompareWeather({
              description: lyW.description || lyW.weatherDesc,
              tempMax: lyW.tempMax ?? lyW.temp_max,
              tempMin: lyW.tempMin ?? lyW.temp_min
            });
          }
        } else if (customCompareDate) {
          const customRes = await secureFetcher(`${API_BASE}/api/v5/dashboard/revenue-summary?date=${customCompareDate}`);
          const customPayload = customRes.data || customRes;
          const w = customPayload?.weather?.current || customPayload?.weather || null;
          if (!isMounted) return;
          setCompareWeather(w ? {
            description: w.description || w.weatherDesc,
            tempMax: w.tempMax ?? w.temp_max,
            tempMin: w.tempMin ?? w.temp_min
          } : null);
        }
      } catch (e) {
        console.error('Weather fetch error:', e);
      } finally {
        if (isMounted) setIsWeatherLoading(false);
      }
    };

    fetchWeather();
    return () => {
      isMounted = false;
    };
  }, [startDate, customCompareDate, compareMode]);

  // 빠른 비교일 프리셋 핸들러
  const handlePreset = (offsetDays: number) => {
    const base = new Date(startDate);
    if (isNaN(base.getTime())) return;
    const target = new Date(base.getTime() - offsetDays * 24 * 60 * 60 * 1000);
    setCompareMode('custom');
    setCustomCompareDate(target.toISOString().split('T')[0]);
  };

  // 실적 0원 매장 필터링 (Pure Consumer: 수치는 일체 재계산하지 않고 화면 표시만 제어)
  const displayRows = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return data.filter((row) => {
      if (row.isGrandTotal) return true;

      const isAllZero = (Number(row.todayActual) || 0) === 0 && (Number(row.todayLy) || 0) === 0 &&
                        (Number(row.mtdActual) || 0) === 0 && (Number(row.mtdLy) || 0) === 0 &&
                        (Number(row.ytdActual) || 0) === 0 && (Number(row.ytdLy) || 0) === 0;

      return !isAllZero;
    });
  }, [data]);

  // 계층별 동적 Rowspan 계산 (Phase 2)
  const { teamRowspans } = useMemo(() => {
    return calculateHierarchyRowspans(displayRows);
  }, [displayRows]);

  // 금액 서식 정규화 (#,##0 - ₩ 기호 배제)
  const formatCurrency = (val: any) => {
    if (!val && val !== 0) return '0';
    const num = typeof val === 'string' ? Number(val.replace(/,/g, '').replace(/₩/g, '').trim()) : Number(val);
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
    if (row.shopName && row.shopName.startsWith('[') && row.shopName.endsWith(']')) {
      return row.shopName;
    }
    if (row.subtotalType === 'category') return `[${row.categoryName || row.categoryCode} 소계]`;
    if (row.subtotalType === 'team') return `[${row.teamName} 소계]`;
    if (row.subtotalType === 'part') return `[${row.partName} 소계]`;
    return `[${row.shopName}]`;
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
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                <Layers className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-slate-800">
                전년 동요일 비교 매트릭스 (Matrix Weekly)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-200">
                V6 Zero-Proxy SSOT
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              52주 전 동일 요일 실적과 당일 실적을 1:1로 매칭 비교하여 요일 왜곡 없는 정확한 성장률을 제공합니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Presets */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs">
              <button 
                onClick={() => setCompareMode('yoy_same_day')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  compareMode === 'yoy_same_day' 
                    ? 'bg-white text-teal-700 shadow-xs font-bold' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                전년 동요일 (-52주)
              </button>
              <button 
                onClick={() => handlePreset(7)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  compareMode === 'custom' && customCompareDate === new Date(parsedBaseDate.getTime() - 7*86400000).toISOString().split('T')[0]
                    ? 'bg-white text-teal-700 shadow-xs font-bold' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                전주 동요일 (-7일)
              </button>
              <button 
                onClick={() => handlePreset(1)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  compareMode === 'custom' && customCompareDate === new Date(parsedBaseDate.getTime() - 1*86400000).toISOString().split('T')[0]
                    ? 'bg-white text-teal-700 shadow-xs font-bold' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                전일 (-1일)
              </button>
            </div>
          </div>
        </div>

        {/* Date Selector & Weather Info Banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-slate-100 text-sm">
          {/* 1. Base Date Picker */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <Calendar size={13} className="text-slate-400" />
              기준 일자 (Base Date)
            </label>
            <input 
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCompareMode('yoy_same_day');
                setCustomCompareDate('');
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>

          {/* 2. Optional Range End Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <Calendar size={13} className="text-slate-400" />
              구간 종료일 (선택 시 기간 조회)
            </label>
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="단일일자 조회 시 비워둠"
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>

          {/* 3. Base Weather Card */}
          <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 block">기준일 기상 정보</span>
              <div className="text-sm font-extrabold text-slate-700 mt-0.5">
                {currFormatter.format(parsedBaseDate)}
              </div>
            </div>
            <div className="text-right flex items-center gap-2">
              <span className="text-2xl">{renderWeatherIcon(baseWeather?.description)}</span>
              <div>
                <span className="text-xs font-bold text-slate-700 block">
                  {isWeatherLoading ? '조회중...' : (baseWeather?.description || '맑음')}
                </span>
                <span className="text-[11px] text-slate-400">
                  {baseWeather?.tempMax !== undefined ? `${baseWeather.tempMin}° / ${baseWeather.tempMax}°` : '18° / 26°'}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Comparison Weather Card */}
          <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 block">비교일 기상 정보</span>
              <div className="text-sm font-extrabold text-slate-700 mt-0.5">
                {compareFormatter.format(parsedCompareDate)}
              </div>
            </div>
            <div className="text-right flex items-center gap-2">
              <span className="text-2xl">{renderWeatherIcon(compareWeather?.description)}</span>
              <div>
                <span className="text-xs font-bold text-slate-700 block">
                  {isWeatherLoading ? '조회중...' : (compareWeather?.description || '맑음')}
                </span>
                <span className="text-[11px] text-slate-400">
                  {compareWeather?.tempMax !== undefined ? `${compareWeather.tempMin}° / ${compareWeather.tempMax}°` : '19° / 27°'}
                </span>
              </div>
            </div>
          </div>
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
            리조트 전사 부문별 실시간 통합 정산 현황 (순매출 · 부가세 별도 · 포맷팅 `#,##0`)
          </div>
          <div className="text-xs text-teal-800 font-bold">
            비교 대상: {compareFormatter.format(parsedCompareDate)}
          </div>
        </div>

        <div className="overflow-auto max-h-[calc(100vh-280px)]">
          <table className="w-full text-sm text-right whitespace-nowrap border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-20 shadow-sm">
              <tr className="bg-slate-100/95">
                <th className="p-3 text-center border-r border-b border-slate-200 sticky top-0 left-0 z-30 bg-slate-100 font-bold text-slate-700 w-40" rowSpan={2}>
                    중분류
                  </th>
                  <th className="p-3 text-left border-r border-b border-slate-200 sticky top-0 left-40 z-30 bg-slate-100 font-bold text-slate-700 min-w-[180px]" rowSpan={2}>
                    영업장명
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
                  <td colSpan={11} className="p-12 text-center text-slate-400">데이터를 불러오고 있습니다...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-red-500">{error}</td>
                </tr>
              ) : displayRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-slate-400">
                    조회된 데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                displayRows.map((row, idx) => {
                  const isSub = row.isSubtotal;
                  const isTotal = row.isGrandTotal;

                  // 1. 전사 총계 (Grand Total)
                  if (isTotal) {
                    return (
                      <tr key={`total_${idx}`} className="bg-slate-800 hover:bg-slate-900 text-white font-bold">
                        <td colSpan={2} className="p-4 border-r border-slate-700 text-left font-black text-sm tracking-wide sticky left-0 z-10 bg-slate-800">
                            총계 (Grand Total)
                        </td>
                        <td className="p-3 font-bold text-white text-sm">{formatCurrency(row.todayActual)}</td>
                        <td className="p-3 text-slate-300 font-medium">{formatCurrency(row.todayLy)}</td>
                        <td className="p-3 border-r border-slate-700 bg-slate-800/80">{renderGrowth(row.todayGrowth)}</td>
                        <td className="p-3 font-bold text-white text-sm">{formatCurrency(row.mtdActual)}</td>
                        <td className="p-3 text-slate-300 font-medium">{formatCurrency(row.mtdLy)}</td>
                        <td className="p-3 border-r border-slate-700 bg-slate-800/80">{renderGrowth(row.mtdGrowth)}</td>
                        <td className="p-3 font-bold text-white text-sm">{formatCurrency(row.ytdActual)}</td>
                        <td className="p-3 text-slate-300 font-medium">{formatCurrency(row.ytdLy)}</td>
                        <td className="p-3 bg-slate-800/80">{renderGrowth(row.ytdGrowth)}</td>
                      </tr>
                    );
                  }

                  // 2. 카테고리 공식 소계 (Subtotal)
                  if (isSub) {
                    return (
                      <tr key={`sub_${idx}`} className="bg-teal-100/90 hover:bg-teal-100 border-t-2 border-teal-300">
                        <td colSpan={2} className="p-3.5 border-r border-teal-200 text-left font-extrabold text-teal-950 text-xs sticky left-0 z-10 bg-teal-100">
                            {getSubtotalLabel(row)}
                        </td>
                        <td className="p-3 font-bold text-teal-950">{formatCurrency(row.todayActual)}</td>
                        <td className="p-3 text-teal-800/80 font-medium">{formatCurrency(row.todayLy)}</td>
                        <td className="p-3 border-r border-teal-200 bg-teal-50/50">{renderGrowth(row.todayGrowth)}</td>
                        <td className="p-3 font-bold text-teal-950">{formatCurrency(row.mtdActual)}</td>
                        <td className="p-3 text-teal-800/80 font-medium">{formatCurrency(row.mtdLy)}</td>
                        <td className="p-3 border-r border-teal-200 bg-teal-50/50">{renderGrowth(row.mtdGrowth)}</td>
                        <td className="p-3 font-bold text-teal-950">{formatCurrency(row.ytdActual)}</td>
                        <td className="p-3 text-teal-800/80 font-medium">{formatCurrency(row.ytdLy)}</td>
                        <td className="p-3 bg-teal-50/50">{renderGrowth(row.ytdGrowth)}</td>
                      </tr>
                    );
                  }

                  // 3. 개별 영업장 행 (동적 Rowspan 적용)
                  return (
                    <tr key={`${row.shopName}_${row.categoryCode}_${idx}`} className="hover:bg-slate-50/80 transition-colors">
                      {/* 2. 중분류 셀 병합 */}
                      {teamRowspans[idx] > 0 && (
                        <td 
                          rowSpan={teamRowspans[idx]} 
                          className="p-3 border-r border-slate-200 bg-white text-center font-semibold text-slate-600 text-xs align-middle sticky left-0 z-10"
                        >
                          {row.teamName && row.teamName !== '기타' ? row.teamName : (row.categoryName || '-')}
                        </td>
                      )}

                      {/* 3. 영업장명 */}
                      <td className="p-3 border-r border-slate-200 text-left font-medium text-slate-800 text-xs sticky left-40 z-10 bg-white">
                        {row.shopName}
                      </td>

                      {/* 실적 지표 (#,##0) */}
                      <td className="p-3 font-medium text-slate-800">{formatCurrency(row.todayActual)}</td>
                      <td className="p-3 text-slate-500 font-medium">{formatCurrency(row.todayLy)}</td>
                      <td className="p-3 border-r border-slate-200 bg-slate-50/30">{renderGrowth(row.todayGrowth)}</td>

                      <td className="p-3 font-medium text-slate-800">{formatCurrency(row.mtdActual)}</td>
                      <td className="p-3 text-slate-500 font-medium">{formatCurrency(row.mtdLy)}</td>
                      <td className="p-3 border-r border-slate-200 bg-slate-50/30">{renderGrowth(row.mtdGrowth)}</td>

                      <td className="p-3 font-medium text-slate-800">{formatCurrency(row.ytdActual)}</td>
                      <td className="p-3 text-slate-500 font-medium">{formatCurrency(row.ytdLy)}</td>
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
