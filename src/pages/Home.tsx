import React from 'react';
import { CalendarDays, Building2, Coins, AlertCircle, Calculator, Users, BedDouble } from 'lucide-react';
import GlobalDatePicker from '../components/GlobalDatePicker';
import { useDate } from '../contexts/DateContext';
import { useCoreData } from '../contexts/CoreDataContext';
import { transformHomeData } from '../lib/dataTransformers';
import SalesPieChart from '../components/dashboard/SalesPieChart';
import MonthlyTrevporChart from '../components/dashboard/MonthlyTrevporChart';
import { parseNum } from '../lib/dataTransformers';
import { getPeriodHolidayComparison } from '../lib/holidayUtils';
import MetricExplainerTooltip from '../components/common/MetricExplainerTooltip';
import { SkeletonBentoGrid } from '../components/common/SkeletonCard';
import { formatRevenue, formatFinancialKorean } from '../utils/formatters';

export default function Home() {
  const { startDate, endDate } = useDate();
  const coreData = useCoreData();
  const isRangeMode = Boolean(coreData.core?.isRangeQuery || (startDate && (coreData.core?.endDate || endDate) && startDate !== (coreData.core?.endDate || endDate)));

  const currentEndDateStr = isRangeMode && coreData.core?.endDate ? coreData.core.endDate : startDate;
  const periodHolidays = React.useMemo(() => {
    return getPeriodHolidayComparison(startDate, isRangeMode ? currentEndDateStr : undefined);
  }, [startDate, isRangeMode, currentEndDateStr]);

  const transformedData = React.useMemo(() => {
    if (coreData.isLoading || coreData.error) return null;
    return transformHomeData(coreData);
  }, [coreData]);

  const data = transformedData;
  const loading = coreData.isLoading;
  const apiError = coreData.error ? '[데이터를 로딩 중이거나 동기화 중입니다. 잠시 후 새로고침 해주세요.]' : 
                  (coreData.isLoading ? null : (transformedData ? null : '데이터를 불러오는 데 실패했습니다.'));

  // V6 에서는 current/lastYear 구분 없이 평탄화(Flat)된 weather 객체가 옵니다. 호환성을 위해 둘 다 체크합니다.
  const weather = coreData.core?.weather?.current || coreData.core?.weather || null;
  const lastYearWeather = coreData.core?.weather?.lastYear || ((weather?.lyDescription || weather?.lyTempMax) ? { weatherDesc: weather.lyDescription || '', description: weather.lyDescription || '', tempMax: weather.lyTempMax, tempMin: weather.lyTempMin } : null);

  const displayData: any = data;

    const formatCurrency = (val: any) => {
  if (!val) return '0';
  const num = typeof val === 'string' ? Number(val.replace(/,/g, '')) : Number(val);
  return isNaN(num) ? '0' : new Intl.NumberFormat('ko-KR').format(Math.round(num));
};

  const pieChartData = React.useMemo(() => {
    if (!coreData.core?.salesByCategory) return [];
    // [SSOT 바이블 준수] 백엔드 카테고리 소계를 바인딩하되, 중복 소계 유입 방지 및 표준 명칭 적용
    const categoryMap = new Map<string, { name: string; value: number; pct?: number }>();

    coreData.core.salesByCategory.forEach((cat: any) => {
      const code = String(cat.categoryCode || cat.categoryName || 'ETC').trim();
      let displayName = cat.categoryName || cat.categoryCode || '기타';
      if (code === 'ETC' || displayName === 'ETC') {
        displayName = '임대업장(CU/투썸/BHC)';
      } else if (code === 'OTHER') {
        displayName = '기타부대(잡수익)';
      } else if (code === 'MOTO') {
        displayName = '모토아레나';
      } else if (code === 'GOODS') {
        displayName = '벨포레굿즈';
      } else if (code === 'PROMOTION') {
        displayName = '기획전';
      }

      const val = parseNum(cat.totalSales || cat.todayActual || 0);
      const pct = cat.weight !== undefined ? Number(cat.weight) : (cat.pct !== undefined ? Number(cat.pct) : undefined);
      if (val > 0) {
        // 동일 카테고리 코드는 최상위 대표 소계 1개만 매핑 (또는 합산이 아닌 단일 대표치)
        if (!categoryMap.has(code) || categoryMap.get(code)!.value < val) {
          categoryMap.set(code, { name: displayName, value: val, pct });
        }
      }
    });

    return Array.from(categoryMap.values());
  }, [coreData.core?.salesByCategory]);

  const leisureVisitorsMap = React.useMemo(() => {
    if (coreData.core?.leisureVisitors && Object.keys(coreData.core.leisureVisitors).length > 0) {
      return coreData.core.leisureVisitors;
    }
    const map: Record<string, number> = {};
    const list = coreData.core?.salesByFacility || [];
    if (Array.isArray(list)) {
      list.forEach((fac: any) => {
        const name = fac.shopName || fac.facilityName;
        const count = parseNum(fac.visitors || fac.totalVisitors || 0);
        if (name) {
          map[name] = (map[name] || 0) + count;
        }
      });
    }
    return map;
  }, [coreData.core?.leisureVisitors, coreData.core?.salesByFacility]);

  // [모토아레나 숙박객/회원 수 연동] 백엔드에서 전달받은 숙박객/회원 숫자 바인딩
  const { motoGuestCount, motoMemberCount, motoTotalCount } = React.useMemo(() => {
    let guest = 0;
    let member = 0;
    let hasLoaded = false;

    if (coreData.core?.summary?.motoGuestVisitors !== undefined) {
      guest = parseNum(coreData.core.summary.motoGuestVisitors);
      hasLoaded = true;
    }
    if (coreData.core?.summary?.motoMemberVisitors !== undefined) {
      member = parseNum(coreData.core.summary.motoMemberVisitors);
      hasLoaded = true;
    }

    let total = 0;
    if (coreData.core?.summary?.motoGuestMemberVisitors !== undefined && coreData.core?.summary?.motoGuestMemberVisitors !== null) {
      total = parseNum(coreData.core.summary.motoGuestMemberVisitors);
    } else if (hasLoaded) {
      total = guest + member;
    } else {
      total = 0;
    }

    return {
      motoGuestCount: guest,
      motoMemberCount: member,
      motoTotalCount: total
    };
  }, [coreData.core?.summary]);





  if (apiError && !loading) {
    const isSleep = (coreData.error || '').includes('심야 절전 운영') || (coreData.error || '').includes('수면');
    if (isSleep) {
      return (
        <div className="w-full h-[80vh] flex flex-col items-center justify-center bg-slate-900/5 text-slate-600 gap-3">
          <span className="text-5xl animate-bounce">🌙</span>
          <div className="text-xl font-bold text-slate-800">현재 서버가 자고 있습니다 🌙</div>
          <div className="text-sm text-slate-500 max-w-md text-center leading-relaxed">
            야간 비용 절감을 위해 매일 20:00 ~ 08:00에는 데이터베이스가 수면 모드에 들어갑니다.<br/>
            매일 아침 08:00에 정상 가동됩니다!
          </div>
        </div>
      );
    }
    return (
      <div className="w-full h-[80vh] flex items-center justify-center bg-[#f8fafc]">
        <div className="text-xl font-medium text-red-500">{apiError}</div>
      </div>
    );
  }

  if (loading || !displayData) {
    return (
      <div className="w-full min-h-screen bg-[#f8fafc] text-slate-800 tracking-tight pb-16">
        <div className="w-full bg-gradient-to-r from-[#071322] via-[#0b1d33] to-[#0f172a] h-[220px] absolute top-0 left-0 z-0 overflow-hidden rounded-b-[32px] border-b border-white/10" />
        <div className="w-full max-w-[1920px] mx-auto p-4 md:p-8 relative z-10 pt-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
            <div className="text-white">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-3xl tracking-widest bg-white text-[#00ae95] px-3 py-1 rounded-sm shadow-md">
                  BELLE FORET
                </span>
                <span className="font-bold text-2xl tracking-wide ml-1">RESORT</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mt-3">Welcome ALL BELLER! 👋</h1>
              <p className="text-sm text-white/80 mt-1">오늘도 화기애애한 벨포레 리조트 통합 경영 현황입니다.</p>
            </div>
            <div className="mt-4 md:mt-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <GlobalDatePicker />
            </div>
          </div>
          <SkeletonBentoGrid />
        </div>
      </div>
    );
  }

  const todayGross = displayData.today.gross;
  // [SSOT 무관용] 프론트엔드 자체 성장률(%) 연산 금지. 백엔드가 제공하는 todayGrowth/ytdGrowth 만 사용
  const todayGrowth = coreData.core?.summary?.todayGrowth;
  const todayDiff = coreData.core?.summary?.todayDiff;
  
  const ytdGross = displayData.ytd.gross || parseNum(coreData.core?.summary?.ytdActual || coreData.core?.summary?.ytdRevenue || 0);
  const ytdGrowth = coreData.core?.summary?.ytdGrowth;
  const ytdDiff = coreData.core?.summary?.ytdDiff;

  const mtdGross = displayData.mtd?.gross || parseNum(coreData.core?.summary?.mtdRevenue || coreData.core?.summary?.mtdActual || 0);
  const mtdGrowth = coreData.core?.summary?.mtdGrowth;
  const mtdDiff = coreData.core?.summary?.mtdDiff;

  const roomSub = (coreData.core?.gridData || []).find((r: any) => r.isSubtotal && (r.categoryCode === 'ROOM' || r.categoryName === '콘도' || r.categoryCode === '콘도'))
    || (coreData.core?.salesByCategory || []).find((c: any) => c.categoryCode === 'ROOM' || c.categoryName === '콘도' || c.categoryCode === '콘도');

  const mtdRoomsSold = displayData?.mtd?.roomsSold !== undefined 
    ? displayData.mtd.roomsSold 
    : parseNum(coreData.core?.summary?.mtdRooms || roomSub?.mtdVisitors || roomSub?.mtdRooms || 0);

  const lyMtdRoomsSold = displayData?.mtd?.ly_roomsSold !== undefined 
    ? displayData.mtd.ly_roomsSold 
    : parseNum(coreData.core?.summary?.mtdRoomsLy || coreData.core?.summary?.lyMtdRooms || roomSub?.mtdLyVisitors || roomSub?.lyMtdVisitors || 0);

  const mtdRoomsDiff = displayData?.mtd?.roomsDiff !== undefined 
    ? displayData.mtd.roomsDiff 
    : (mtdRoomsSold - lyMtdRoomsSold);

  const mtdRoomsGrowth = displayData?.mtd?.roomsGrowth !== undefined 
    ? displayData.mtd.roomsGrowth 
    : (lyMtdRoomsSold > 0 ? Number((((mtdRoomsSold - lyMtdRoomsSold) / lyMtdRoomsSold) * 100).toFixed(1)) : null);

  // [기간 모드 지능형 동적 바인딩] 선택 기간 모드 시 선택 기간 전체 실적 바인딩, 단일 일자 시 MTD 당월 실적 바인딩
  const rangeRoomsSold = parseNum(coreData.core?.summary?.totalRooms || roomSub?.todayVisitors || roomSub?.visitors || 0);
  const rangeLyRoomsSold = parseNum(roomSub?.todayLyVisitors || roomSub?.lyVisitors || coreData.core?.summary?.totalRoomsLy || 0);
  const rangeRoomsDiff = rangeRoomsSold - rangeLyRoomsSold;
  const rangeRoomsGrowth = rangeLyRoomsSold > 0 ? Number((((rangeRoomsSold - rangeLyRoomsSold) / rangeLyRoomsSold) * 100).toFixed(1)) : null;

  const activeRoomsSold = isRangeMode ? rangeRoomsSold : mtdRoomsSold;
  const activeLyRoomsSold = isRangeMode ? rangeLyRoomsSold : lyMtdRoomsSold;
  const activeRoomsDiff = isRangeMode ? rangeRoomsDiff : mtdRoomsDiff;
  const activeRoomsGrowth = isRangeMode ? rangeRoomsGrowth : mtdRoomsGrowth;

  // 카드 2 중간 섹션: 기간 모드 시 선택 기간 객실 총매출, 단일 일자 시 MTD 총매출
  const rangeRoomRev = parseNum(roomSub?.todayActual || coreData.core?.summary?.totalRoomRev || 0);
  const rangeLyRoomRev = parseNum(roomSub?.todayLy || 0);
  const rangeRoomRevDiff = rangeRoomRev - rangeLyRoomRev;
  const rangeRoomRevGrowth = roomSub?.todayGrowth !== undefined 
    ? Number(roomSub.todayGrowth) 
    : (rangeLyRoomRev > 0 ? Number((((rangeRoomRev - rangeLyRoomRev) / rangeLyRoomRev) * 100).toFixed(1)) : null);

  const activeSecondaryRev = isRangeMode ? rangeRoomRev : mtdGross;
  const activeSecondaryDiff = isRangeMode ? rangeRoomRevDiff : mtdDiff;
  const activeSecondaryGrowth = isRangeMode ? rangeRoomRevGrowth : mtdGrowth;


  
  const multiNight = (() => {
    const s = coreData.core?.summary || {};
    if (s.multiNight) return s.multiNight;
    if (s.multiNightGuests !== undefined || s.multiNightRatio !== undefined) {
      return {
        multiNightRooms: s.multiNightRooms,
        multiNightGuests: s.multiNightGuests,
        multiNightRatio: s.multiNightRatio,
        guestsGrowth: s.guestsGrowth,
        ratioDiff: s.ratioDiff,
      };
    }
    return null;
  })();


  const roomCapActual = parseNum(coreData.core?.summary?.totalRoomCap || (coreData.core?.salesByCategory?.find((c: any) => c.categoryCode === 'ROOM' || c.categoryCode === '콘도' || c.categoryName === '콘도')?.visitors || 0));
  const roomCapLy = coreData.core?.summary?.totalRoomCapLy;
  const roomCapGrowth = coreData.core?.summary?.roomCapGrowth;
  const roomCapDiff = coreData.core?.summary?.roomCapDiff;

  const golfReservedTeams = displayData?.golfSummary?.reservedTeams || 0;

  const todayFinancial = formatFinancialKorean(todayGross);
  const ytdFinancial = formatFinancialKorean(ytdGross);
  const secondaryFinancial = formatFinancialKorean(activeSecondaryRev);

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] text-slate-800 tracking-tight pb-16">
      
      {/* 🏛️ Institutional Deep Slate Navy Banner with Mint Rim Light */}
      <div className="w-full bg-gradient-to-r from-[#071322] via-[#0b1d33] to-[#0f172a] h-[220px] absolute top-0 left-0 z-0 overflow-hidden rounded-b-[32px] border-b border-white/10 shadow-lg">
        <div className="absolute top-0 right-0 w-[500px] h-[220px] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#00ae95]/15 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -top-12 left-1/4 w-72 h-72 bg-white/5 rounded-full blur-3xl pointer-events-none" />
      </div>

      <div className="w-full max-w-[1920px] mx-auto p-4 md:p-8 relative z-10 pt-10">
        
        {apiError && (
          <div className="bg-rose-500 text-white p-4 rounded-2xl mb-8 flex items-center gap-3 shadow-lg animate-pulse">
            <AlertCircle size={24} />
            <span className="font-medium text-lg">{apiError}</span>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
          <div className="text-white">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-3xl tracking-widest bg-white text-[#00ae95] px-3 py-1 rounded-sm shadow-md">
                BELLE FORET
              </span>
              <span className="font-bold text-2xl tracking-wide ml-1">RESORT</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mt-3">Welcome ALL BELLER! 👋</h1>
            <p className="text-sm text-white/80 mt-1">오늘도 화기애애한 벨포레 리조트 통합 경영 현황입니다.</p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <GlobalDatePicker />
          </div>
        </div>

        {/* 🏛️ Executive Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-12">
          <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 🌟 Card 1: 전사 순매출 (Hero Bento Card) */}
            <div className="bg-white rounded-3xl p-6 lg:p-7 border border-slate-200/90 shadow-[0_4px_24px_rgba(15,23,42,0.04)] hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)] transition-all duration-300 relative overflow-hidden group flex flex-col justify-between">
              <div>
                <div className="min-h-[88px] mb-3 relative z-10 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="w-5 h-5 text-brand-mint shrink-0" /> 
                      <span className="text-sm font-bold text-slate-800">
                        {isRangeMode && coreData.core?.endDate ? `선택 기간 전사 순매출` : `당일 전사 순매출`}
                      </span>
                      <MetricExplainerTooltip presetKey="netRevenue" />
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/80">VAT 제외</span>
                    </div>
                    <span className="text-xs text-slate-400 font-medium font-financial">
                      {isRangeMode && coreData.core?.endDate ? `${startDate} ~ ${coreData.core.endDate}` : startDate}
                    </span>
                  </div>

                  {!isRangeMode && (weather || lastYearWeather) && (
                    <div className="self-start text-sm bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center gap-3">
                      <div className="opacity-60 text-right pr-3 border-r border-slate-200">
                        <div className="text-[10px] font-medium text-slate-400 mb-0.5">전년 동요일</div>
                        {lastYearWeather ? (
                          <>
                            <div className="font-semibold text-slate-500 text-sm flex items-center justify-end gap-1">
                              {lastYearWeather.weatherDesc === '데이터없음' || lastYearWeather.description === '데이터없음' ? '☁️ 알수없음' : (
                                <>
                                  {(lastYearWeather.weatherDesc || lastYearWeather.description)?.includes('비') ? '🌧️' : (lastYearWeather.weatherDesc || lastYearWeather.description)?.includes('눈') ? '❄️' : (lastYearWeather.weatherDesc || lastYearWeather.description)?.includes('구름') ? '⛅' : '☀️'} 
                                  {lastYearWeather.weatherDesc || lastYearWeather.description || '맑음'}
                                </>
                              )}
                            </div>
                            {(lastYearWeather.tempMax != null && lastYearWeather.tempMin != null && (lastYearWeather.tempMax !== 0 || lastYearWeather.tempMin !== 0)) && (
                              <div className="text-slate-400 text-[10px] mt-0.5 font-financial">최고 {lastYearWeather.tempMax}℃ / 최저 {lastYearWeather.tempMin}℃</div>
                            )}
                          </>
                        ) : (
                          <div className="font-semibold text-slate-300 text-xs flex items-center justify-end gap-1">☁️ 기상 정보 수집 중</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-medium text-[#00ae95] mb-0.5">현재 날씨</div>
                        {weather && (weather.weatherDesc || weather.description || weather.tempMax != null) ? (
                          <>
                            <div className="font-medium text-[#00ae95] text-base flex items-center justify-end gap-1">
                              {weather.weatherDesc === '데이터없음' || weather.description === '데이터없음' ? '☁️ 알수없음' : (
                                <>
                                  {(weather.weatherDesc || weather.description)?.includes('비') ? '🌧️' : (weather.weatherDesc || weather.description)?.includes('눈') ? '❄️' : (weather.weatherDesc || weather.description)?.includes('구름') ? '⛅' : '☀️'} 
                                  {weather.weatherDesc || weather.description || '맑음'}
                                </>
                              )}
                            </div>
                            {(weather.tempMax != null && weather.tempMin != null && (weather.tempMax !== 0 || weather.tempMin !== 0)) && (
                              <div className="text-slate-500 text-xs mt-1 font-financial">최고 {weather.tempMax}℃ / 최저 {weather.tempMin}℃</div>
                            )}
                          </>
                        ) : (
                          <div className="font-medium text-slate-400 text-sm flex items-center justify-end gap-1">☁️ 기상 정보 수집 중</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 🏛️ 듀얼 표기: 원단위 숫자 + 직관적 한글(억/만원) 단위 */}
                <div className="mb-3">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight font-financial">
                      {formatRevenue(todayGross)}
                    </span>
                    <span className="text-base font-semibold text-slate-400">원</span>
                    <span className="text-xs font-bold text-brand-mint bg-brand-mint/10 border border-brand-mint/20 px-2 py-0.5 rounded-md whitespace-nowrap">
                      {todayFinancial.formatted}
                    </span>
                  </div>
                </div>
              </div>

              {/* 델타 변화율 캡슐 */}
              <div>
                {todayGrowth !== undefined && todayGrowth !== null ? (
                  <div className={todayGrowth >= 0 ? 'badge-delta-up' : 'badge-delta-down'}>
                    <span className="text-slate-600 font-medium">{isRangeMode ? '전년 동기간 대비' : '전년 동요일 대비'}</span>
                    <span className="font-bold">{todayGrowth >= 0 ? '▲' : '▼'} {Math.abs(todayGrowth).toFixed(1)}%</span>
                    {todayDiff !== undefined && (
                      <span className="font-medium opacity-85">({todayDiff > 0 ? '+' : ''}{formatRevenue(todayDiff)}원)</span>
                    )}
                  </div>
                ) : (
                  <div className="badge-delta-neutral">
                    <span>전년 비교 데이터 산출 대기</span>
                  </div>
                )}
              </div>
            </div>

            {/* 🌟 Card 2: 누적 매출 (YTD & MTD) 및 객실 판매 */}
            <div className="bg-white rounded-3xl p-6 lg:p-7 border border-slate-200/90 shadow-[0_4px_24px_rgba(15,23,42,0.04)] hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)] transition-all duration-300 flex flex-col justify-between">
              
              {/* 1. 올해 누적 매출 (YTD) */}
              <div>
                <div className="mb-2 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-5 h-5 text-brand-mint shrink-0" />
                    <span className="text-sm font-bold text-slate-800">올해 누적 매출 (YTD)</span>
                    <MetricExplainerTooltip presetKey="yoyDow" />
                  </div>
                  {isRangeMode ? (
                    <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg whitespace-nowrap font-financial">
                      종료일({currentEndDateStr}) 기준
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium font-financial whitespace-nowrap">
                      {startDate.slice(0, 4)}-01-01 ~ {startDate}
                    </span>
                  )}
                </div>

                <div className="mb-2">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight font-financial">
                      {formatRevenue(ytdGross)}
                    </span>
                    <span className="text-base font-semibold text-slate-400">원</span>
                    <span className="text-xs font-bold text-brand-mint bg-brand-mint/10 border border-brand-mint/20 px-2 py-0.5 rounded-md whitespace-nowrap">
                      {ytdFinancial.formatted}
                    </span>
                  </div>
                </div>

                <div>
                  {ytdGrowth !== undefined && ytdGrowth !== null ? (
                    <div className={ytdGrowth >= 0 ? 'badge-delta-up' : 'badge-delta-down'}>
                      <span className="text-slate-600 font-medium">전년 동기 대비</span>
                      <span className="font-bold">{ytdGrowth >= 0 ? '▲' : '▼'} {Math.abs(ytdGrowth).toFixed(1)}%</span>
                      {ytdDiff !== undefined && (
                        <span className="font-medium opacity-85">({ytdDiff > 0 ? '+' : ''}{formatRevenue(ytdDiff)}원)</span>
                      )}
                    </div>
                  ) : (
                    <div className="badge-delta-neutral">
                      <span>전년 비교 데이터 산출 대기</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. 💡 월별 누적 매출(MTD) / 선택기간 객실부문 실적 + 공휴일 일수 비교 */}
              <div className="mt-5 pt-4 border-t border-slate-100">
                <div className="mb-2">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-700">
                        {isRangeMode ? '선택 기간 객실 부문 실적' : '월별 누적 매출 (MTD)'}
                      </span>
                      <MetricExplainerTooltip presetKey="occupancy" />
                    </div>

                    {/* 🎈 공휴일수 비교 배지 */}
                    <div 
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200/80 shadow-2xs whitespace-nowrap"
                      title={`[당해 ${isRangeMode ? '선택기간' : 'MTD'}] 총 ${periodHolidays.currentPeriod.totalDays}일 중 휴일 ${periodHolidays.currentPeriod.totalHolidays}일 (토 ${periodHolidays.currentPeriod.saturdays}, 일 ${periodHolidays.currentPeriod.sundays}, 평일공휴일 ${periodHolidays.currentPeriod.nationalHolidaysOnWeekdays})\n[전년 동기] 총 ${periodHolidays.lastYearPeriod.totalDays}일 중 휴일 ${periodHolidays.lastYearPeriod.totalHolidays}일 (토 ${periodHolidays.lastYearPeriod.saturdays}, 일 ${periodHolidays.lastYearPeriod.sundays}, 평일공휴일 ${periodHolidays.lastYearPeriod.nationalHolidaysOnWeekdays})`}
                    >
                      <span className="text-amber-800">🎈 공휴일:</span>
                      <strong className="text-amber-950 font-black">{periodHolidays.currentPeriod.totalHolidays}일</strong>
                      <span className="text-amber-700 font-normal">vs 전년 {periodHolidays.lastYearPeriod.totalHolidays}일</span>
                      {periodHolidays.diffHolidays !== 0 ? (
                        <span className={`text-[10px] font-black ${periodHolidays.diffHolidays > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          ({periodHolidays.diffHolidays > 0 ? `+${periodHolidays.diffHolidays}일` : `${periodHolidays.diffHolidays}일`})
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-medium">(동일)</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mb-2">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-xl lg:text-2xl font-bold text-slate-900 font-financial tracking-tight">
                      {formatRevenue(activeSecondaryRev)}
                    </span>
                    <span className="text-sm font-semibold text-slate-400">원</span>
                    <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md whitespace-nowrap">
                      {secondaryFinancial.formatted}
                    </span>
                    {isRangeMode && <span className="text-[11px] text-slate-400 font-normal">(객실 순매출)</span>}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {activeSecondaryGrowth !== undefined && activeSecondaryGrowth !== null ? (
                    <div className={activeSecondaryGrowth >= 0 ? 'badge-delta-up' : 'badge-delta-down'}>
                      <span className="text-slate-600 font-medium">전년 동기간 대비</span>
                      <span className="font-bold">{activeSecondaryGrowth >= 0 ? '▲' : '▼'} {Math.abs(activeSecondaryGrowth).toFixed(1)}%</span>
                      {activeSecondaryDiff !== undefined && (
                        <span className="font-medium opacity-85">({activeSecondaryDiff > 0 ? '+' : ''}{formatRevenue(activeSecondaryDiff)}원)</span>
                      )}
                    </div>
                  ) : (
                    <div className="badge-delta-neutral">
                      <span>전년 비교 데이터 산출 대기</span>
                    </div>
                  )}

                  <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                    (토 {periodHolidays.currentPeriod.saturdays}일 · 일 {periodHolidays.currentPeriod.sundays}일
                    {periodHolidays.currentPeriod.nationalHolidaysOnWeekdays > 0 && ` · 평일공휴일 ${periodHolidays.currentPeriod.nationalHolidaysOnWeekdays}일`})
                  </span>
                </div>

                {/* 🛏️ 객실 판매수 vs 전년동기간 비교 레이아웃 */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <BedDouble className="w-4 h-4 text-emerald-600" />
                      <span>{isRangeMode ? '선택 기간 객실 판매 비교' : '월별 누적 객실 판매'}</span>
                    </div>
                    {activeLyRoomsSold > 0 && activeRoomsGrowth !== null ? (
                      <div className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 whitespace-nowrap font-financial ${
                        activeRoomsGrowth >= 0 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        <span>{activeRoomsGrowth >= 0 ? '▲' : '▼'} {Math.abs(activeRoomsGrowth).toFixed(1)}%</span>
                        <span className="font-semibold text-[10px] opacity-90">({activeRoomsDiff > 0 ? '+' : ''}{activeRoomsDiff.toLocaleString()}실)</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">전년 비교 산출 대기</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-800 mb-0.5">
                        <span>{isRangeMode ? '선택기간 누적' : '월별 누적'}</span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">당해</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-extrabold text-slate-900 tracking-tight font-financial">{activeRoomsSold.toLocaleString()}</span>
                        <span className="text-xs font-semibold text-slate-500">실</span>
                      </div>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                      <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 mb-0.5">
                        <span>전년 동기간</span>
                        <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">전년</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-extrabold text-slate-600 tracking-tight font-financial">
                          {activeLyRoomsSold > 0 ? activeLyRoomsSold.toLocaleString() : '-'}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">실</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* 🌟 Card 3: 통합 숙박객 수 & 레저 어트랙션 이용객 */}
            <div className="bg-white rounded-3xl p-6 lg:p-7 border border-slate-200/90 shadow-[0_4px_24px_rgba(15,23,42,0.04)] hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)] transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="mb-2 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-5 h-5 text-brand-mint shrink-0" />
                    <span className="text-sm font-bold text-slate-800">통합 숙박객 수</span>
                    <MetricExplainerTooltip presetKey="visitorCount" />
                    <span className="text-xs text-slate-400 font-normal">(콘도 투숙객)</span>
                  </div>
                </div>

                <div className="mb-2">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight font-financial">
                      {new Intl.NumberFormat('ko-KR').format(roomCapActual)}
                    </span>
                    <span className="text-base font-semibold text-slate-500">명</span>
                  </div>
                </div>

                {/* 과거 비교 숙박객 수 및 증감률 배지 */}
                <div className="mb-3">
                  {roomCapLy !== undefined && roomCapLy > 0 ? (
                    <div className={roomCapGrowth !== undefined && roomCapGrowth >= 0 ? 'badge-delta-up' : 'badge-delta-down'}>
                      <span className="text-slate-600 font-medium">{isRangeMode ? '전년 동기간 대비' : '전년 동요일 대비'}</span>
                      {roomCapGrowth !== undefined && (
                        <span className="font-bold">{roomCapGrowth >= 0 ? '▲' : '▼'} {Math.abs(roomCapGrowth).toFixed(1)}%</span>
                      )}
                      <span className="font-medium opacity-85">
                        (전년 {new Intl.NumberFormat('ko-KR').format(roomCapLy)}명{roomCapDiff !== undefined ? `, ${roomCapDiff > 0 ? '+' : ''}${new Intl.NumberFormat('ko-KR').format(roomCapDiff)}명` : ''})
                      </span>
                    </div>
                  ) : (
                    <div className="badge-delta-neutral">
                      <span>전년 비교 데이터 산출 대기</span>
                    </div>
                  )}
                </div>
                
                {multiNight && (parseNum(multiNight.multiNightGuests) > 0 || parseNum(multiNight.multiNightRooms) > 0) && (
                  <div className="mb-4 p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 flex flex-wrap items-center justify-between gap-1.5 text-xs shadow-2xs font-financial">
                    <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                      <span className="bg-brand-mint text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-2xs">연박(2박+)</span>
                      <span className="font-bold text-slate-900">{new Intl.NumberFormat('ko-KR').format(multiNight.multiNightGuests || 0)}명</span>
                      <span className="text-slate-500 text-[11px]">
                        ({multiNight.multiNightRooms !== undefined && multiNight.multiNightRooms !== null && parseNum(multiNight.multiNightRooms) > 0 && (
                          <>
                            <strong className="text-slate-700 font-semibold">{new Intl.NumberFormat('ko-KR').format(multiNight.multiNightRooms)}실</strong>
                            {' · '}
                          </>
                        )}투숙객 대비 <strong className="text-slate-700 font-semibold">{parseNum(multiNight.multiNightRatio ?? 0).toFixed(1)}%</strong>)
                      </span>
                    </div>
                    {multiNight.guestsGrowth !== undefined && (
                      <div className={`font-bold text-[11px] flex items-center gap-1 ${multiNight.guestsGrowth >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                        <span className="text-slate-500 font-normal">{isRangeMode ? '전년 동기' : '전년 동요일'}</span>
                        <span>{multiNight.guestsGrowth >= 0 ? '▲' : '▼'}{Math.abs(multiNight.guestsGrowth).toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Major Leisure Facilities Visitors Breakdown */}
                <div className="mt-3 pt-3 border-t border-slate-100 relative z-10">
                  <div className="text-xs font-bold text-slate-600 mb-2 flex items-center justify-between">
                    <span>주요 레저/어트랙션 이용객 수</span>
                    <span className="text-[11px] text-slate-400 font-normal">{isRangeMode ? '(선택 기간 누적)' : '(당일 실적)'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg flex items-center justify-between border border-slate-100/80 shadow-xs">
                      <span className="text-slate-700 font-semibold truncate">🎨 미디어아트</span>
                      <span className="text-base sm:text-lg font-black text-brand-mint tracking-tight whitespace-nowrap">{new Intl.NumberFormat('ko-KR').format(leisureVisitorsMap['미디어아트센터'] || 0)}<span className="text-xs font-normal text-slate-500 ml-0.5">명</span></span>
                    </div>
                    <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg flex items-center justify-between border border-slate-100/80 shadow-xs">
                      <span className="text-slate-700 font-semibold truncate">🏊 썸머랜드</span>
                      <span className="text-base sm:text-lg font-black text-brand-mint tracking-tight whitespace-nowrap">{new Intl.NumberFormat('ko-KR').format(leisureVisitorsMap['[썸머랜드 전체 소계]'] || leisureVisitorsMap['썸머랜드'] || 0)}<span className="text-xs font-normal text-slate-500 ml-0.5">명</span></span>
                    </div>
                    <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg flex items-center justify-between border border-slate-100/80 shadow-xs">
                      <span className="text-slate-700 font-semibold truncate">🐑 벨포레 목장</span>
                      <span className="text-base sm:text-lg font-black text-brand-mint tracking-tight whitespace-nowrap">{new Intl.NumberFormat('ko-KR').format(leisureVisitorsMap['벨포레 목장'] || 0)}<span className="text-xs font-normal text-slate-500 ml-0.5">명</span></span>
                    </div>
                    <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg flex items-center justify-between border border-slate-100/80 shadow-xs">
                      <span className="text-slate-700 font-semibold truncate">🎡 원더풀</span>
                      <span className="text-base sm:text-lg font-black text-brand-mint tracking-tight whitespace-nowrap">{new Intl.NumberFormat('ko-KR').format(leisureVisitorsMap['원더풀'] || 0)}<span className="text-xs font-normal text-slate-500 ml-0.5">명</span></span>
                    </div>
                    <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg flex items-center justify-between border border-slate-100/80 shadow-xs">
                      <span className="text-slate-700 font-semibold truncate">🛷 사계절썰매</span>
                      <span className="text-base sm:text-lg font-black text-brand-mint tracking-tight whitespace-nowrap">{new Intl.NumberFormat('ko-KR').format(leisureVisitorsMap['사계절썰매장'] || 0)}<span className="text-xs font-normal text-slate-500 ml-0.5">명</span></span>
                    </div>
                    <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg flex items-center justify-between border border-slate-100/80 shadow-xs">
                      <span className="text-slate-700 font-semibold truncate">🚤 마리나 클럽</span>
                      <span className="text-base sm:text-lg font-black text-brand-mint tracking-tight whitespace-nowrap">{new Intl.NumberFormat('ko-KR').format(leisureVisitorsMap['마리나 클럽'] || 0)}<span className="text-xs font-normal text-slate-500 ml-0.5">명</span></span>
                    </div>
                    <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg flex items-center justify-between border border-slate-100/80 shadow-xs">
                      <span className="text-slate-700 font-semibold truncate">🏎️ 마운틴카트</span>
                      <span className="text-base sm:text-lg font-black text-brand-mint tracking-tight whitespace-nowrap">{new Intl.NumberFormat('ko-KR').format(leisureVisitorsMap['마운틴카트'] || 0)}<span className="text-xs font-normal text-slate-500 ml-0.5">명</span></span>
                    </div>
                    <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg flex items-center justify-between border border-slate-100/80 shadow-xs">
                      <span className="text-slate-700 font-semibold truncate">🏁 모토아레나</span>
                      <span className="text-base sm:text-lg font-black text-brand-mint tracking-tight whitespace-nowrap">
                        {new Intl.NumberFormat('ko-KR').format(leisureVisitorsMap['모토아레나'] || 0)}
                        <span className="text-xs font-normal text-slate-500 ml-0.5">명</span>
                      </span>
                    </div>
                  </div>

                  {/* 모토아레나 숙박/회원 세부 내역 (하단 전용 바) */}
                  <div className="mt-2 px-3 py-2 rounded-xl bg-slate-50/90 border border-slate-200/70 flex items-center justify-between text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/80 whitespace-nowrap">
                        모토아레나 숙박·회원
                      </span>
                      <span className="text-slate-700 font-medium">
                        숙박할인 <strong className="text-slate-900 font-bold">{motoGuestCount}</strong>명 · 회원할인 <strong className="text-slate-900 font-bold">{motoMemberCount}</strong>명
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">
                      총 <strong className="text-brand-mint font-bold">{motoTotalCount}</strong>명
                      <span className="text-[11px] text-slate-400 font-normal ml-1">
                        (전체 {new Intl.NumberFormat('ko-KR').format(leisureVisitorsMap['모토아레나'] || 0)}명 중)
                      </span>
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold relative z-10 bg-slate-50 text-slate-500 border border-slate-100 self-start">
                <span>{isRangeMode ? '선택 기간 객실 투숙객 누적 집계' : '당일 객실 투숙객 집계'}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-12 flex flex-col gap-6">
            <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_15px_30px_rgb(0,0,0,0.06)] transition-all duration-300 group">
              <h2 className="text-base font-semibold text-slate-800 mb-6 flex items-center gap-2">
                <Coins className="w-5 h-5 text-brand-mint" /> 주요 지표 및 운영 효율
              </h2>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* 1. 객실 점유율 (Occ) */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 flex flex-col justify-between h-[140px] shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="text-xs font-bold text-slate-700">객실 점유율 (Occ)</span>
                    <MetricExplainerTooltip presetKey="occupancy" />
                  </div>
                  {(() => {
                    const occ = (coreData.core?.summary?.totalOcc && Number(coreData.core.summary.totalOcc) > 0) ? Number(coreData.core.summary.totalOcc)
                              : (coreData.core?.summary?.occRate && Number(coreData.core.summary.occRate) > 0) ? Number(coreData.core.summary.occRate)
                              : displayData?.kpiMetrics?.totalOcc;
                    return occ !== undefined && occ !== null ? (
                      <>
                        <div className="text-3xl font-extrabold text-slate-900 tracking-tight font-financial">
                          {Number(occ).toFixed(1)}%
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {isRangeMode ? '선택 기간 평균 가동률' : '175실 재고 기준 자동 산출'}
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-slate-400 font-medium h-full flex flex-col justify-center">
                        전체 객실 재고 데이터 산출 불가<br/>(API 연동 대기)
                      </div>
                    );
                  })()}
                </div>
                
                {/* 2. 객단가 (ADR) */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 flex flex-col justify-between h-[140px] shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="text-xs font-bold text-slate-700">객단가 (ADR)</span>
                    <MetricExplainerTooltip presetKey="adr" />
                  </div>
                  {(() => {
                    const adr = (coreData.core?.summary?.totalADR && Number(coreData.core.summary.totalADR) > 0) ? Number(coreData.core.summary.totalADR)
                              : (coreData.core?.summary?.adr && Number(coreData.core.summary.adr) > 0) ? Number(coreData.core.summary.adr)
                              : displayData?.kpiMetrics?.totalADR;
                    return adr !== undefined && adr !== null && Number(adr) > 0 ? (
                      <>
                        <div className="text-3xl font-extrabold text-slate-900 tracking-tight font-financial">
                          {formatRevenue(adr)} <span className="text-sm font-semibold text-slate-400">원</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          객실 순매출 ÷ 실제 판매 객실수
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-slate-400 font-medium h-full flex flex-col justify-center">
                        ADR 산출 불가<br/>(API 연동 대기)
                      </div>
                    );
                  })()}
                </div>
                
                {/* 3. 객실당 매출 (RevPAR) */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 flex flex-col justify-between h-[140px] shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="text-xs font-bold text-slate-700">객실당 매출 (RevPAR)</span>
                    <MetricExplainerTooltip 
                      customData={{
                        title: '객실당 매출 (RevPAR)',
                        badge: '호텔 지표',
                        definition: '판매 여부와 무관하게 175실 전체 물리 객실 1실당 창출된 객실 순매출입니다.',
                        formula: '객실 순매출 ÷ 전체 물리 가용 객실수 (175실 × 일수)',
                        insight: 'OCC와 ADR의 곱으로 산출되며, 객실 부문의 순수 자산 생산성을 평가합니다.'
                      }}
                    />
                  </div>
                  {(() => {
                    const revPar = (coreData.core?.summary?.revPAR && Number(coreData.core.summary.revPAR) > 0) ? Number(coreData.core.summary.revPAR)
                                 : displayData?.kpiMetrics?.revPAR;
                    return revPar !== undefined && revPar !== null && Number(revPar) > 0 ? (
                      <>
                        <div className="text-3xl font-extrabold text-slate-900 tracking-tight font-financial">
                          {formatRevenue(revPar)} <span className="text-sm font-semibold text-slate-400">원</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          객실 순매출 ÷ 전체 객실수 (175실)
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-slate-400 font-medium h-full flex flex-col justify-center">
                        RevPAR 산출 불가<br/>(API 연동 대기)
                      </div>
                    );
                  })()}
                </div>
                
                {/* 4. 가용객실당 총매출 (TrevPAR) */}
                <div className="bg-white p-5 rounded-2xl border border-emerald-200/80 flex flex-col justify-between h-[140px] shadow-sm hover:shadow-md transition-all bg-gradient-to-b from-white to-emerald-50/20">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="text-xs font-bold text-emerald-800">가용객실당 총매출 (TrevPAR)</span>
                    <MetricExplainerTooltip presetKey="trevpar" />
                  </div>
                  {(() => {
                    const trevPar = (coreData.core?.summary?.trevPar ?? coreData.core?.summary?.trevPAR) || displayData?.kpiMetrics?.trevPAR;
                    return trevPar !== undefined && trevPar !== null && Number(trevPar) > 0 ? (
                      <>
                        <div className="text-3xl font-extrabold text-emerald-800 tracking-tight font-financial">
                          {formatRevenue(trevPar)} <span className="text-sm font-semibold text-emerald-600">원</span>
                        </div>
                        <div className="text-[11px] text-emerald-700 font-medium">
                          전사 총매출 ÷ 175실 (리조트 통합 소비력)
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-slate-400 font-medium h-full flex flex-col justify-center">
                        TrevPAR 산출 불가<br/>(API 연동 대기)
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1인당 평균 그린피 (전체 / 자사 / OTA / 회원 4분할 분석) */}
                <div className="bg-[#f8fafc] p-6 rounded-3xl border border-slate-200 flex flex-col justify-between hover:bg-white hover:shadow-md transition-all duration-300 cursor-default shadow-xs">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-slate-800 font-bold text-base flex items-center gap-2">
                        <Coins size={18} className="text-emerald-600" />
                        골프 1인당 그린피 분석
                      </div>
                      <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-100">
                        순매출 기준
                      </span>
                    </div>

                    {/* 전체 평균 그린피 (메인) */}
                    <div className="mb-3.5 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                      <div className="text-xs text-slate-500 font-medium mb-1 flex items-center justify-between">
                        <span className="font-semibold text-slate-700">🏆 전체 1인 평균 그린피</span>
                        <span className="text-slate-400 font-normal">{isRangeMode ? '선택 기간 합산' : '금일 실적'}</span>
                      </div>
                      <div className="text-3xl font-black text-emerald-600 tracking-tight tabular-nums whitespace-nowrap">
                        ₩{formatCurrency(displayData.golfSummary?.avgGreenFee || 0)} <span className="text-sm font-normal text-slate-500">/인</span>
                      </div>
                    </div>

                    {/* 자사 평균 / OTA 평균 / 회원 평균 3분할 서브 그리드 */}
                    <div className="grid grid-cols-3 gap-2.5">
                      {/* 자사 평균 */}
                      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs text-center flex flex-col justify-between">
                        <div className="text-xs font-bold text-indigo-700 bg-indigo-50 py-0.5 px-1.5 rounded-lg mb-1 truncate whitespace-nowrap">
                          자사 평균
                        </div>
                        <div className="text-base font-black text-slate-900 tabular-nums my-1 whitespace-nowrap">
                          {displayData.golfSummary?.directAvgGreenFee && displayData.golfSummary.directAvgGreenFee > 0
                            ? `₩${formatCurrency(displayData.golfSummary.directAvgGreenFee)}`
                            : (coreData.summary?.isGolfChannelsLoading ? (
                                <span className="text-xs text-slate-400 font-normal animate-pulse">집계 중...</span>
                              ) : '-')}
                        </div>
                        <div className="text-xs text-slate-400 font-medium truncate whitespace-nowrap">
                          홈페이지 예약
                        </div>
                      </div>

                      {/* OTA 평균 */}
                      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs text-center flex flex-col justify-between">
                        <div className="text-xs font-bold text-amber-700 bg-amber-50 py-0.5 px-1.5 rounded-lg mb-1 truncate whitespace-nowrap">
                          OTA 평균
                        </div>
                        <div className="text-base font-black text-slate-900 tabular-nums my-1 whitespace-nowrap">
                          {displayData.golfSummary?.otaAvgGreenFee && displayData.golfSummary.otaAvgGreenFee > 0
                            ? `₩${formatCurrency(displayData.golfSummary.otaAvgGreenFee)}`
                            : (coreData.summary?.isGolfChannelsLoading ? (
                                <span className="text-xs text-slate-400 font-normal animate-pulse">집계 중...</span>
                              ) : '-')}
                        </div>
                        <div className="text-xs text-slate-400 font-medium truncate whitespace-nowrap">
                          대행사 제휴처
                        </div>
                      </div>

                      {/* 회원 평균 */}
                      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs text-center flex flex-col justify-between">
                        <div className="text-xs font-bold text-purple-700 bg-purple-50 py-0.5 px-1.5 rounded-lg mb-1 truncate whitespace-nowrap">
                          회원 평균
                        </div>
                        <div className="text-base font-black text-slate-900 tabular-nums my-1 whitespace-nowrap">
                          {displayData.golfSummary?.memberAvgGreenFee && displayData.golfSummary.memberAvgGreenFee > 0
                            ? `₩${formatCurrency(displayData.golfSummary.memberAvgGreenFee)}`
                            : (coreData.summary?.isGolfChannelsLoading ? (
                                <span className="text-xs text-slate-400 font-normal animate-pulse">집계 중...</span>
                              ) : '-')}
                        </div>
                        <div className="text-xs text-slate-400 font-medium truncate whitespace-nowrap">
                          회원 우대 단가
                        </div>
                      </div>
                    </div>

                    {/* 채널별 1인당 실측 그린피 순위 미니 차트 & 테이블 */}
                    {coreData.core?.summary?.golfRankedChannels && coreData.core.summary.golfRankedChannels.length > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-slate-200/80">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                          <span className="flex items-center gap-1.5">
                            <span>📊</span> 채널별 1인당 실측 그린피 순위
                          </span>
                          <span className="text-[11px] font-normal text-slate-400">내장객 순매출 기준</span>
                        </div>
                        <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                          {coreData.core.summary.golfRankedChannels.map((item: any, idx: number) => {
                            const maxPrice = coreData.core.summary.golfRankedChannels[0]?.avgGreenFee ?? 0;
                            const pct = maxPrice > 0 ? Math.min(100, Math.max(10, Math.round((item.avgGreenFee / maxPrice) * 100))) : 0;
                            return (
                              <div key={idx} className="bg-white p-2 rounded-xl border border-slate-200/70 flex items-center justify-between text-xs shadow-2xs gap-2 hover:border-emerald-200 transition-all">
                                <div className="flex items-center gap-1.5 min-w-[120px] truncate">
                                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                    idx === 0 ? 'bg-amber-100 text-amber-800' :
                                    idx === 1 ? 'bg-slate-200 text-slate-700' :
                                    idx === 2 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'
                                  }`}>
                                    {idx + 1}
                                  </span>
                                  <span className="font-semibold text-slate-800 truncate" title={item.name}>{item.name}</span>
                                </div>
                                <div className="flex-1 mx-2 hidden sm:block">
                                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                                <div className="text-right whitespace-nowrap shrink-0">
                                  <span className="font-black text-slate-900">₩{formatCurrency(item.avgGreenFee)}</span>
                                  <span className="text-[10px] text-slate-400 ml-1.5">({item.players}명)</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between">
                    <span>그린피 순매출 ÷ 실제 내장객 수 (자사 / OTA / 회원별 실시간 집계)</span>
                  </div>
                </div>

                {/* 골프 예약 및 입장 현황 */}
                <div className="bg-[#f8fafc] p-6 rounded-3xl border border-slate-200 flex flex-col justify-between hover:bg-white hover:shadow-md transition-all duration-300 cursor-default shadow-xs">
                  <div>
                    <div className="text-slate-800 font-bold text-base mb-4 flex items-center gap-2">
                      <Users size={18} className="text-brand-mint" />
                      골프 예약 및 입장 현황
                    </div>
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
                        <div className="text-xs text-slate-500 font-semibold mb-1 whitespace-nowrap">총 예약 팀수</div>
                        <div className="text-2xl lg:text-3xl font-black text-slate-900 tabular-nums whitespace-nowrap">
                          {`${golfReservedTeams}`} <span className="text-sm font-normal text-slate-500">팀</span>
                        </div>
                      </div>
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
                        <div className="text-xs text-slate-500 font-semibold mb-1 whitespace-nowrap">실제 입장 (내장)</div>
                        <div className="text-2xl lg:text-3xl font-black text-brand-mint tabular-nums whitespace-nowrap">
                          {displayData.golfSummary ? `${displayData.golfSummary.visitedTeams}` : '0'} <span className="text-sm font-normal text-slate-500">팀</span>
                        </div>
                      </div>
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
                        <div className="text-xs text-rose-500 font-semibold mb-1 whitespace-nowrap">취소 / 미내장</div>
                        <div className="text-2xl lg:text-3xl font-black text-rose-500 tabular-nums whitespace-nowrap">
                          {`${(displayData.golfSummary?.canceledTeams || 0) + (displayData.golfSummary?.pendingTeams || 0)}`} <span className="text-sm font-normal text-slate-500">팀</span>
                        </div>
                        {((displayData.golfSummary?.canceledTeams || 0) > 0 || (displayData.golfSummary?.pendingTeams || 0) > 0) && (
                          <div className="text-xs text-slate-500 font-medium mt-1">
                            {displayData.golfSummary?.pendingTeams > 0 
                              ? `(취소 ${displayData.golfSummary.canceledTeams}팀 / 미내장 ${displayData.golfSummary.pendingTeams}팀)`
                              : `(취소 ${displayData.golfSummary.canceledTeams}팀)`}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 객단가 저렴한 순서별 이용 시간대 및 채널 티타임 현황 */}
                    {coreData.core?.summary?.golfLowToHighChannels && coreData.core.summary.golfLowToHighChannels.length > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-slate-200/80">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                          <span className="flex items-center gap-1.5">
                            <span>⏰</span> 객단가 저렴한 순 채널 및 이용 시간대
                          </span>
                          <span className="text-[11px] font-normal text-slate-400">오름차순 (실속 ➔ 프라임)</span>
                        </div>
                        
                        {/* 1부/2부/3부 시간대 퀵 뱃지 (티타임 슬롯 실측 현황) */}
                        {coreData.core.summary.golfTimeSlots && coreData.core.summary.golfTimeSlots.length > 0 && (
                          <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                            {coreData.core.summary.golfTimeSlots.map((slot: any, sIdx: number) => (
                              <div key={sIdx} className="bg-white p-1.5 rounded-xl border border-slate-200/80 text-center shadow-2xs">
                                <div className="text-[10px] font-bold text-slate-500 truncate">{slot.slotGroup?.split(' ')[0]}</div>
                                <div className="text-[11px] font-black text-teal-800 tabular-nums">{slot.timeRange}</div>
                                <div className="text-[10px] text-slate-600 font-semibold">{slot.visitedTeams}팀 <span className="text-slate-400 font-normal">({slot.cancellationRate}% 취소)</span></div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 객단가 저렴한 순서별 채널 리스트 (오름차순 & 이용 시간대) */}
                        <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                          {coreData.core.summary.golfLowToHighChannels.map((item: any, idx: number) => {
                            const maxPrice = coreData.core.summary.golfRankedChannels?.[0]?.avgGreenFee || 1;
                            const pct = Math.min(100, Math.max(10, Math.round((item.avgGreenFee / maxPrice) * 100)));
                            
                            // 실속 채널별 주요 이용 시간대 안내
                            const timeHint = item.name.includes('스마트스코어') ? '1부 새벽 (06:00~08:30)' :
                              item.name.includes('전화') ? '1부/2부 잔여 타임' :
                              item.name.includes('미골프') || item.name.includes('오너골프') ? '1부 새벽 / 3부 야간' :
                              item.name.includes('골프몬') ? '3부 야간 (16:30~18:30)' :
                              item.name.includes('골프락') ? '1부 오전 / 2부' :
                              item.name.includes('자사') ? '1부·2부·3부 전시간' :
                              item.name.includes('골팡') ? '2부 낮 타임' :
                              item.name.includes('카카오') ? '2부 프라임 타임' :
                              item.name.includes('패키지') ? '1박2일 숙박 연계' : '프라임 타임';

                            return (
                              <div key={idx} className="bg-white p-2 rounded-xl border border-slate-200/70 flex items-center justify-between text-xs shadow-2xs gap-2 hover:border-teal-200 transition-all">
                                <div className="flex items-center gap-1.5 min-w-[135px] truncate">
                                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                    idx === 0 ? 'bg-emerald-100 text-emerald-800' :
                                    idx === 1 ? 'bg-sky-100 text-sky-800' :
                                    idx === 2 ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-500'
                                  }`}>
                                    {idx + 1}
                                  </span>
                                  <div className="truncate">
                                    <span className="font-semibold text-slate-800 truncate block" title={item.name}>{item.name}</span>
                                    <span className="text-[10px] text-teal-700 font-medium block truncate">🕒 {timeHint}</span>
                                  </div>
                                </div>
                                <div className="flex-1 mx-2 hidden sm:block">
                                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-teal-500 rounded-full transition-all duration-500" 
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                                <div className="text-right whitespace-nowrap shrink-0">
                                  <span className="font-black text-slate-900">₩{formatCurrency(item.avgGreenFee)}</span>
                                  <span className="text-[10px] text-slate-400 ml-1.5">({item.players}명)</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-200/80">
                    {isRangeMode ? '선택 기간 골프 총 예약/취소 및 실제 라운딩 실적 데이터' : '골프장 마감 예약/취소 및 실제 라운딩 실적 데이터'}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* 📊 객실당 총매출(TrevPOR) 월별 전년(1~12월) vs 올해 비교 분석 섹션 */}
          <MonthlyTrevporChart />

          {/* 본부별 매출 파이 차트 */}
          {pieChartData.length > 0 && (
            <SalesPieChart 
              data={pieChartData} 
              totalValue={coreData.core?.summary?.totalRevenue ?? todayGross} 
            />
          )}

            {/* QA & KPI 상세 가이드 Accordion */}
            <div className="lg:col-span-12 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-brand-mint" />
                지표 산출 공식 및 경영 의미 가이드
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Resort & Room Indicators: TrevPAR, ADR, RevPAR, Occ */}
                <div className="bg-slate-50 p-5 rounded-2xl flex flex-col justify-between border border-slate-200/80 lg:col-span-2">
                  <div>
                    <h4 className="font-bold text-slate-800 mb-3 border-b border-slate-200 pb-2">객실 및 복합 리조트 핵심 지표 산출 방식 안내</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      {/* TrevPAR */}
                      <div className="bg-white p-4 rounded-xl border border-teal-200/70 shadow-xs flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-extrabold text-teal-900 text-sm">가용객실당 총매출 (TrevPAR)</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-100 text-teal-800">핵심 지표</span>
                          </div>
                          <p className="text-slate-500 text-[11px] mb-2 leading-relaxed">
                            Total Revenue Per Available Room
                          </p>
                          <div className="p-2.5 rounded-lg bg-teal-50/70 font-mono text-[11px] text-teal-900 font-bold border border-teal-100">
                            리조트 전사 총매출 ÷ 전체 가용 객실 수 (175실)
                          </div>
                        </div>
                        <p className="text-slate-600 text-[11px] mt-2.5 leading-relaxed">
                          단순 숙박을 넘어 <strong>객실 1실이 골프, 식음, 레저(목장/루지), 모토 등 리조트 전반에서 창출하는 총체적 부가가치</strong>를 평가하는 벨포레의 최우선 경영 지표입니다.
                        </p>
                      </div>

                      {/* ADR */}
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-extrabold text-slate-800 text-sm">판매 객단가 (ADR)</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">실판매 단가</span>
                          </div>
                          <p className="text-slate-500 text-[11px] mb-2 leading-relaxed">
                            Average Daily Rate
                          </p>
                          <div className="p-2.5 rounded-lg bg-slate-100 font-mono text-[11px] text-slate-800 font-bold border border-slate-200/60">
                            순수 객실 매출 ÷ 실제 판매 객실 수 (Rooms Sold)
                          </div>
                        </div>
                        <p className="text-slate-600 text-[11px] mt-2.5 leading-relaxed">
                          실제 투숙 고객에게 판매된 객실 1실당 순수 평균 판매 가격입니다.
                        </p>
                      </div>

                      {/* RevPAR & Occ */}
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-extrabold text-slate-800 text-sm">객실당 매출 (RevPAR) & 점유율 (Occ)</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">객실 효율</span>
                          </div>
                          <p className="text-slate-500 text-[11px] mb-2 leading-relaxed">
                            Revenue Per Available Room & Occupancy
                          </p>
                          <div className="p-2.5 rounded-lg bg-slate-100 font-mono text-[11px] text-slate-800 font-bold border border-slate-200/60">
                            RevPAR = 객실 매출 ÷ 가용 175실 = ADR × 점유율
                          </div>
                        </div>
                        <p className="text-slate-600 text-[11px] mt-2.5 leading-relaxed">
                          전체 보유 객실(175실) 대비 순수 객실 판매 효율을 나타내며, 점유율(판매객실 ÷ 175실)과 직결됩니다.
                        </p>
                      </div>
                    </div>

                    <div className="text-xs text-teal-800 bg-teal-50 p-3 rounded-xl mt-3.5 border border-teal-100 font-medium">
                      <strong>공식 정산 기준:</strong> 모든 핵심 운영 지표(TrevPAR, ADR, RevPAR, 객실 점유율 등)는 리조트 공식 PMS/POS 원천 확정 데이터를 기준으로 제공됩니다.
                    </div>
                  </div>
                </div>

                {/* Golf Green Fee */}
                <div className="bg-slate-50 p-5 rounded-2xl lg:col-span-2 border border-slate-200/80">
                  <h4 className="font-bold text-slate-800 mb-3 border-b border-slate-200 pb-2">골프 평균 그린피 (전체 / 자사 / OTA / 회원)</h4>
                  <ul className="space-y-2 text-slate-600 text-xs">
                    <li className="flex flex-col">
                      <span className="font-bold text-slate-800 text-sm">
                        • 1인당 전체 평균 그린피: ₩{formatCurrency(displayData.golfSummary?.avgGreenFee || 0)}원
                      </span>
                      <span className="text-slate-500 mt-0.5 tabular-nums">
                        = {formatCurrency((displayData.golfSummary?.avgGreenFee || 0) * (displayData.golfSummary?.visitedPlayers || 0))}원 (그린피 총매출) ÷ {formatCurrency(displayData.golfSummary?.visitedPlayers || 0)}명 (실제 내장객 수)
                      </span>
                    </li>
                    <li className="text-slate-500 pt-1">
                      • <strong>자사 평균:</strong> 홈페이지/모바일 직접 예약 고객의 1인당 실질 결제 그린피
                    </li>
                    <li className="text-slate-500">
                      • <strong>OTA 평균:</strong> 골프락, 골프존, 골프몬 등 외부 대행 제휴처를 통한 내장객 1인당 실질 결제 그린피
                    </li>
                    <li className="text-slate-500">
                      • <strong>회원 평균:</strong> 창립회원, 정회원, 무기명 우대 혜택 적용 고객의 1인당 실질 결제 그린피
                    </li>
                  </ul>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
