import React from 'react';
import { CalendarDays, Building2, Coins, AlertCircle, Calculator, Users } from 'lucide-react';
import GlobalDatePicker from '../components/GlobalDatePicker';
import { useDate } from '../contexts/DateContext';
import { useCoreData } from '../contexts/CoreDataContext';
import { transformHomeData } from '../lib/dataTransformers';
import SalesPieChart from '../components/dashboard/SalesPieChart';
import MonthlyTrevporChart from '../components/dashboard/MonthlyTrevporChart';
import { parseNum } from '../lib/dataTransformers';
import { getMtdHolidayComparison } from '../lib/holidayUtils';

export default function Home() {
  const { startDate, endDate } = useDate();
  const coreData = useCoreData();
  const isRangeMode = Boolean(coreData.core?.isRangeQuery || (startDate && (coreData.core?.endDate || endDate) && startDate !== (coreData.core?.endDate || endDate)));

  const currentEndDateStr = isRangeMode && coreData.core?.endDate ? coreData.core.endDate : startDate;
  const mtdHolidays = React.useMemo(() => {
    return getMtdHolidayComparison(startDate, currentEndDateStr);
  }, [startDate, currentEndDateStr]);

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
    const categoryMap = new Map<string, { name: string; value: number }>();

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
      if (val > 0) {
        // 동일 카테고리 코드는 최상위 대표 소계 1개만 매핑 (또는 합산이 아닌 단일 대표치)
        if (!categoryMap.has(code) || categoryMap.get(code)!.value < val) {
          categoryMap.set(code, { name: displayName, value: val });
        }
      }
    });

    return Array.from(categoryMap.values());
  }, [coreData.core?.salesByCategory]);

  const leisureVisitorsMap = React.useMemo(() => {
    // [SSOT 바이블 준수] 백엔드가 매핑 완료한 salesByFacility의 객수 데이터를 1:1로 활용 (프론트 단 유추 금지)
    const map: Record<string, number> = {};
    if (coreData.core?.salesByFacility) {
      coreData.core.salesByFacility.forEach((fac: any) => {
        const name = fac.shopName || fac.facilityName;
        if (name) {
          map[name] = parseNum(fac.visitors || fac.totalVisitors || 0);
        }
      });
    }
    return map;
  }, [coreData.core?.salesByFacility]);


  if (apiError && !loading) {
    return (
      <div className="w-full h-[80vh] flex items-center justify-center bg-[#f8fafc]">
        <div className="text-xl font-medium text-red-500">{apiError}</div>
      </div>
    );
  }

  if (loading || !displayData) {
    return (
      <div className="w-full h-[80vh] flex items-center justify-center bg-[#f8fafc]">
        <div className="text-xl font-medium text-brand-mint animate-pulse">벨포레 현황판을 불러오는 중입니다...</div>
      </div>
    );
  }

  const todayGross = displayData.today.gross;
  // [SSOT 무관용] 프론트엔드 자체 성장률(%) 연산 금지. 백엔드가 제공하는 todayGrowth/ytdGrowth 만 사용
  const todayGrowth = coreData.core?.summary?.todayGrowth;
  const todayDiff = coreData.core?.summary?.todayDiff;
  
  const ytdGross = displayData.ytd.gross;
  const ytdGrowth = coreData.core?.summary?.ytdGrowth;
  const ytdDiff = coreData.core?.summary?.ytdDiff;

  const mtdGross = displayData.mtd?.gross || parseNum(coreData.core?.summary?.mtdRevenue || coreData.core?.summary?.mtdActual || 0);
  const mtdGrowth = coreData.core?.summary?.mtdGrowth;
  const mtdDiff = (coreData.core?.summary?.mtdRevenue && coreData.core?.summary?.mtdLy)
    ? parseNum(coreData.core?.summary?.mtdRevenue) - parseNum(coreData.core?.summary?.mtdLy)
    : undefined;
  
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


  const roomCapActual = parseNum(coreData.core?.summary?.totalRoomCap || (coreData.core?.salesByCategory?.find((c: any) => c.categoryCode === 'ROOM')?.visitors || 0));
  const roomCapLy = coreData.core?.summary?.totalRoomCapLy;
  const roomCapGrowth = coreData.core?.summary?.roomCapGrowth;
  const roomCapDiff = coreData.core?.summary?.roomCapDiff;

  const golfReservedTeams = displayData?.golfSummary?.reservedTeams || 0;

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] text-slate-800 tracking-tight pb-16">
      
      <div className="w-full bg-brand-mint h-[220px] absolute top-0 left-0 z-0 overflow-hidden rounded-b-[40px]">
        <div className="absolute top-10 right-[10%] w-32 h-32 bg-white/20 shape-half-circle" />
        <div className="absolute -top-10 right-[20%] w-48 h-48 bg-white/10 shape-leaf" />
        <div className="absolute top-20 left-[5%] w-16 h-16 bg-white/20 rounded-full" />
      </div>

      <div className="w-full max-w-[1920px] mx-auto p-4 md:p-8 relative z-10 pt-10">
        

        {apiError && (
          <div className="bg-orange-500 text-white p-4 rounded-2xl mb-8 flex items-center gap-3 shadow-lg animate-pulse">
            <AlertCircle size={24} />
            <span className="font-medium text-lg">{apiError}</span>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
          <div className="text-white">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-black text-3xl tracking-widest bg-white text-brand-mint px-3 py-1 rounded-sm shadow-md">
                BELLE FORET
              </span>
              <span className="font-black text-2xl tracking-wide ml-1">RESORT</span>
            </div>
            <h1 className="text-3xl font-medium tracking-tight mt-3">Welcome ALL BELLER! 👋</h1>
            <p className="text-white/80 mt-1">오늘도 화기애애한 벨포레 리조트 통합 경영 현황입니다.</p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <GlobalDatePicker />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-12">
          <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300">
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-brand-mint/5 rounded-full transition-transform duration-500 group-hover:scale-[1.8]" />
              <div className="min-h-[96px] mb-2 relative z-10 flex flex-col gap-3">
                <h2 className="text-base font-medium text-slate-500 flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-brand-mint group-hover:animate-bounce" /> 
                  {isRangeMode && coreData.core?.endDate ? `조회기간 (${startDate} ~ ${coreData.core.endDate})` : `조회일자 (${startDate})`}
                  <span className="text-xs text-slate-400 font-normal hidden xl:inline">(부가세 별도)</span>
                </h2>
                {!isRangeMode && (weather || lastYearWeather) && (
                  <div className="self-start text-right text-sm bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center gap-3">
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
                          {(lastYearWeather.tempMax !== 0 || lastYearWeather.tempMin !== 0) && (
                            <div className="text-slate-400 text-[10px] mt-0.5">최고 {lastYearWeather.tempMax}℃ / 최저 {lastYearWeather.tempMin}℃</div>
                          )}
                        </>
                      ) : (
                        <div className="font-semibold text-slate-500 text-sm flex items-center justify-end gap-1">❓ 날씨없음</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-medium text-brand-mint mb-0.5">현재 날씨</div>
                      {weather ? (
                        <>
                          <div className="font-medium text-brand-mint text-base flex items-center justify-end gap-1">
                            {weather.weatherDesc === '데이터없음' || weather.description === '데이터없음' ? '☁️ 알수없음' : (
                              <>
                                {(weather.weatherDesc || weather.description)?.includes('비') ? '🌧️' : (weather.weatherDesc || weather.description)?.includes('눈') ? '❄️' : (weather.weatherDesc || weather.description)?.includes('구름') ? '⛅' : '☀️'} 
                                {weather.weatherDesc || weather.description || '맑음'}
                              </>
                            )}
                          </div>
                          {(weather.tempMax !== 0 || weather.tempMin !== 0) && (
                            <div className="text-slate-500 text-xs mt-1">최고 {weather.tempMax}℃ / 최저 {weather.tempMin}℃</div>
                          )}
                        </>
                      ) : (
                        <div className="font-medium text-brand-mint text-base flex items-center justify-end gap-1">❓ 날씨없음</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="text-3xl font-semibold text-slate-800 mb-4 tracking-tight transition-all duration-300">
                {formatCurrency(todayGross)}
              </div>
              {todayGrowth !== undefined ? (
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${todayGrowth >= 0 ? 'bg-brand-mint/10 text-brand-mint' : 'bg-red-50 text-red-500'}`}>
                  <span>{isRangeMode ? '전년 동기간 대비' : '전년 동요일 대비'}</span>
                  <span>{todayGrowth >= 0 ? '▲' : '▼'} {Math.abs(todayGrowth).toFixed(1)}%</span>
                  {todayDiff !== undefined && (
                    <span className="font-medium opacity-80">({todayDiff > 0 ? '+' : ''}{formatCurrency(todayDiff)})</span>
                  )}
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold bg-slate-100 text-slate-400">
                  <span>전년 비교 데이터 산출 불가 (API 연동 대기)</span>
                </div>
              )}
            </div>

            <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300 flex flex-col justify-between">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-brand-mint/5 shape-leaf transition-transform duration-500 group-hover:scale-150 group-hover:rotate-12" />
              
              {/* 1. 올해 누적 매출 (YTD) */}
              <div className="relative z-10">
                <div className="mb-1 flex flex-col justify-start">
                  <h2 className="text-base font-semibold text-slate-500 flex items-center gap-2 flex-wrap">
                    <Building2 className="w-5 h-5 text-brand-mint group-hover:animate-pulse" />
                    <span>올해 누적 매출 (YTD)</span>
                    {isRangeMode ? (
                      <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg">
                        종료일({currentEndDateStr}) 기준 연누계 ({currentEndDateStr.slice(0, 4)}-01-01 ~ {currentEndDateStr})
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 font-normal">
                        ({startDate.slice(0, 4)}-01-01 ~ {startDate})
                      </span>
                    )}
                  </h2>
                </div>
                <div className="text-3xl font-semibold text-slate-800 mb-2 tracking-tight">
                  {formatCurrency(ytdGross)}
                </div>
                {ytdGrowth !== undefined ? (
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${ytdGrowth >= 0 ? 'bg-brand-mint/10 text-brand-mint' : 'bg-red-50 text-red-500'}`}>
                    <span>전년 동기 대비</span>
                    <span>{ytdGrowth >= 0 ? '▲' : '▼'} {Math.abs(ytdGrowth).toFixed(1)}%</span>
                    {ytdDiff !== undefined && (
                      <span className="font-medium opacity-80">({ytdDiff > 0 ? '+' : ''}{formatCurrency(ytdDiff)})</span>
                    )}
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-400">
                    <span>전년 비교 데이터 산출 불가 (API 연동 대기)</span>
                  </div>
                )}
              </div>

              {/* 2. 💡 [NEW] 월별 누적 매출 (MTD) - 매달 1일부터 오늘(조회일)까지의 누적 매출 및 전년 동기간 대비 등락율 + 공휴일(토·일·국가지정공휴일) 일수 비교 */}
              <div className="mt-4 pt-3.5 border-t border-slate-100 relative z-10">
                <div className="mb-1 flex flex-col justify-start">
                  <div className="flex items-center justify-between flex-wrap gap-1.5 mb-1">
                    <h3 className="text-sm font-semibold text-slate-500 flex items-center gap-1.5 flex-wrap">
                      <CalendarDays className="w-4 h-4 text-emerald-600" />
                      <span>월별 누적 매출 (MTD)</span>
                      {isRangeMode ? (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg">
                          종료일({currentEndDateStr}) 기준 당월누계 ({currentEndDateStr.slice(0, 7)}-01 ~ {currentEndDateStr})
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-normal">
                          ({startDate.slice(0, 7)}-01 ~ {startDate})
                        </span>
                      )}
                    </h3>

                    {/* 🎈 공휴일수 (토·일·국가지정공휴일) 비교 배지 */}
                    <div 
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs"
                      title={`[당해 MTD] 총 ${mtdHolidays.currentPeriod.totalDays}일 중 휴일 ${mtdHolidays.currentPeriod.totalHolidays}일 (토 ${mtdHolidays.currentPeriod.saturdays}, 일 ${mtdHolidays.currentPeriod.sundays}, 평일공휴일 ${mtdHolidays.currentPeriod.nationalHolidaysOnWeekdays})\n[전년 MTD] 총 ${mtdHolidays.lastYearPeriod.totalDays}일 중 휴일 ${mtdHolidays.lastYearPeriod.totalHolidays}일 (토 ${mtdHolidays.lastYearPeriod.saturdays}, 일 ${mtdHolidays.lastYearPeriod.sundays}, 평일공휴일 ${mtdHolidays.lastYearPeriod.nationalHolidaysOnWeekdays})`}
                    >
                      <span className="text-amber-800">🎈 공휴일(주말+공휴일):</span>
                      <strong className="text-amber-950 font-black">{mtdHolidays.currentPeriod.totalHolidays}일</strong>
                      <span className="text-amber-700 font-normal">vs 전년 {mtdHolidays.lastYearPeriod.totalHolidays}일</span>
                      {mtdHolidays.diffHolidays !== 0 ? (
                        <span className={`text-[10px] font-black ${mtdHolidays.diffHolidays > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          ({mtdHolidays.diffHolidays > 0 ? `+${mtdHolidays.diffHolidays}일` : `${mtdHolidays.diffHolidays}일`})
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-medium">(동일)</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-2xl font-semibold text-slate-800 mb-2 tracking-tight">
                  {formatCurrency(mtdGross)}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {mtdGrowth !== undefined ? (
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${mtdGrowth >= 0 ? 'bg-brand-mint/10 text-brand-mint' : 'bg-red-50 text-red-500'}`}>
                      <span>전년 동기간 대비</span>
                      <span>{mtdGrowth >= 0 ? '▲' : '▼'} {Math.abs(mtdGrowth).toFixed(1)}%</span>
                      {mtdDiff !== undefined && (
                        <span className="font-medium opacity-80">({mtdDiff > 0 ? '+' : ''}{formatCurrency(mtdDiff)})</span>
                      )}
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-400">
                      <span>전년 비교 데이터 산출 불가 (API 연동 대기)</span>
                    </div>
                  )}

                  {/* 세부 휴일 구성 안내 (토/일/국경일) */}
                  <span className="text-[10px] text-slate-400 font-medium">
                    (토 {mtdHolidays.currentPeriod.saturdays}일 · 일 {mtdHolidays.currentPeriod.sundays}일
                    {mtdHolidays.currentPeriod.nationalHolidaysOnWeekdays > 0 && ` · 평일공휴일 ${mtdHolidays.currentPeriod.nationalHolidaysOnWeekdays}일`}
                    {mtdHolidays.currentPeriod.holidaysList.length > 0 && ` [${mtdHolidays.currentPeriod.holidaysList.map(h => h.name).join(', ')}]`})
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300 flex flex-col justify-between">
              <div className="absolute -right-5 -bottom-5 w-24 h-24 bg-brand-mint/5 rounded-full transition-transform duration-500 group-hover:scale-150" />
              <div>
                <div className="min-h-[44px] mb-1 relative z-10 flex flex-col justify-start">
                  <h2 className="text-base font-semibold text-slate-500 flex items-center gap-2">
                    <Users className="w-5 h-5 text-brand-mint group-hover:animate-pulse" /> 통합 숙박객 수 <span className="text-xs text-slate-400 font-normal">(콘도 투숙객)</span>
                  </h2>
                </div>
                <div className="text-3xl font-semibold text-slate-800 mb-2 tracking-tight relative z-10 flex items-baseline gap-2">
                  <span>{new Intl.NumberFormat('ko-KR').format(roomCapActual)}</span>
                  <span className="text-lg font-medium text-slate-500">명</span>
                </div>

                {/* 과거 비교 숙박객 수 및 증감률 배지 */}
                {roomCapLy !== undefined && roomCapLy > 0 ? (
                  <div className={`mb-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold relative z-10 ${roomCapGrowth !== undefined && roomCapGrowth >= 0 ? 'bg-brand-mint/10 text-brand-mint' : 'bg-red-50 text-red-500'}`}>
                    <span>{isRangeMode ? '전년 동기간 대비' : '전년 동요일 대비'}</span>
                    {roomCapGrowth !== undefined && (
                      <span>{roomCapGrowth >= 0 ? '▲' : '▼'} {Math.abs(roomCapGrowth).toFixed(1)}%</span>
                    )}
                    <span className="font-medium opacity-80">
                      (전년 {new Intl.NumberFormat('ko-KR').format(roomCapLy)}명{roomCapDiff !== undefined ? `, ${roomCapDiff > 0 ? '+' : ''}${new Intl.NumberFormat('ko-KR').format(roomCapDiff)}명` : ''})
                    </span>
                  </div>
                ) : (
                  <div className="mb-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold relative z-10 bg-slate-100 text-slate-400">
                    <span>전년 비교 데이터 산출 불가</span>
                  </div>
                )}
                
                {multiNight && (
                  <div className="mb-3 relative z-10 p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-100/90 flex flex-wrap items-center justify-between gap-1.5 text-xs shadow-xs">
                    <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                      <span className="bg-brand-mint text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-xs">연박(2박+)</span>
                      <span className="font-bold text-slate-800">{new Intl.NumberFormat('ko-KR').format(multiNight.multiNightGuests || 0)}명</span>
                      <span className="text-slate-500 text-[11px]">(투숙객 대비 <strong className="text-slate-700 font-semibold">{parseNum(multiNight.multiNightRatio ?? 0).toFixed(1)}%</strong>)</span>
                    </div>
                    {multiNight.guestsGrowth !== undefined && (
                      <div className={`font-bold text-[11px] flex items-center gap-1 ${multiNight.guestsGrowth >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        <span className="text-slate-500 font-normal">{isRangeMode ? '전년 동기 대비' : '전년 동요일 대비'}</span>
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
                      <span className="text-base sm:text-lg font-black text-brand-mint tracking-tight">{new Intl.NumberFormat('ko-KR').format(leisureVisitorsMap['미디어아트센터'] || 0)}<span className="text-xs font-normal text-slate-500 ml-0.5">명</span></span>
                    </div>
                    <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg flex items-center justify-between border border-slate-100/80 shadow-xs">
                      <span className="text-slate-700 font-semibold truncate">🏊 썸머랜드</span>
                      <span className="text-base sm:text-lg font-black text-brand-mint tracking-tight">{new Intl.NumberFormat('ko-KR').format(leisureVisitorsMap['[썸머랜드 전체 소계]'] || 0)}<span className="text-xs font-normal text-slate-500 ml-0.5">명</span></span>
                    </div>
                    <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg flex items-center justify-between border border-slate-100/80 shadow-xs">
                      <span className="text-slate-700 font-semibold truncate">🐑 벨포레 목장</span>
                      <span className="text-base sm:text-lg font-black text-brand-mint tracking-tight">{new Intl.NumberFormat('ko-KR').format(leisureVisitorsMap['벨포레 목장'] || 0)}<span className="text-xs font-normal text-slate-500 ml-0.5">명</span></span>
                    </div>
                    <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg flex items-center justify-between border border-slate-100/80 shadow-xs">
                      <span className="text-slate-700 font-semibold truncate">🎡 원더풀</span>
                      <span className="text-base sm:text-lg font-black text-brand-mint tracking-tight">{new Intl.NumberFormat('ko-KR').format(leisureVisitorsMap['원더풀'] || 0)}<span className="text-xs font-normal text-slate-500 ml-0.5">명</span></span>
                    </div>
                    <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg flex items-center justify-between border border-slate-100/80 shadow-xs">
                      <span className="text-slate-700 font-semibold truncate">🛷 사계절썰매</span>
                      <span className="text-base sm:text-lg font-black text-brand-mint tracking-tight">{new Intl.NumberFormat('ko-KR').format(leisureVisitorsMap['사계절썰매장'] || 0)}<span className="text-xs font-normal text-slate-500 ml-0.5">명</span></span>
                    </div>
                    <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg flex items-center justify-between border border-slate-100/80 shadow-xs">
                      <span className="text-slate-700 font-semibold truncate">🚤 마리나 클럽</span>
                      <span className="text-base sm:text-lg font-black text-brand-mint tracking-tight">{new Intl.NumberFormat('ko-KR').format(leisureVisitorsMap['마리나 클럽'] || 0)}<span className="text-xs font-normal text-slate-500 ml-0.5">명</span></span>
                    </div>
                    <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg flex items-center justify-between border border-slate-100/80 shadow-xs">
                      <span className="text-slate-700 font-semibold truncate">🏎️ 마운틴카트</span>
                      <span className="text-base sm:text-lg font-black text-brand-mint tracking-tight">{new Intl.NumberFormat('ko-KR').format(leisureVisitorsMap['마운틴카트'] || 0)}<span className="text-xs font-normal text-slate-500 ml-0.5">명</span></span>
                    </div>
                    <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg flex items-center justify-between border border-slate-100/80 shadow-xs">
                      <span className="text-slate-700 font-semibold truncate">🏁 모토아레나</span>
                      <span className="text-base sm:text-lg font-black text-brand-mint tracking-tight">{new Intl.NumberFormat('ko-KR').format(leisureVisitorsMap['모토아레나'] || 0)}<span className="text-xs font-normal text-slate-500 ml-0.5">명</span></span>
                    </div>
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
                <Coins className="w-5 h-5 text-brand-mint group-hover:rotate-12" /> 주요 지표 및 운영 현황
              </h2>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-[#f8fafc] p-4 rounded-xl border border-slate-200 flex flex-col justify-center text-center h-[130px] shadow-sm hover:shadow-md transition-all bg-gradient-to-b from-white to-slate-50">
                  <div className="text-sm text-slate-700 font-medium mb-1">객실 점유율 (Occ)</div>
                  {(() => {
                    const occ = displayData?.kpiMetrics?.totalOcc ?? coreData.core?.summary?.occRate ?? coreData.core?.summary?.totalOcc;
                    return occ !== undefined && occ !== null ? (
                      <>
                        <div className="text-3xl font-extrabold text-teal-700 tracking-tight">
                          {Number(occ).toFixed(1)}%
                        </div>
                        <div className="text-[11px] text-slate-500 mt-2 font-medium">
                          {isRangeMode ? '선택 기간 평균 점유율' : '(Inventory 기준 자동 산출)'}
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-slate-400 font-medium h-full flex flex-col justify-center">
                        전체 객실 재고 데이터 산출 불가<br/>(API 연동 대기)
                      </div>
                    );
                  })()}
                </div>
                
                <div className="bg-[#f8fafc] p-4 rounded-xl border border-slate-200 flex flex-col justify-center text-center h-[130px] shadow-sm hover:shadow-md transition-all bg-gradient-to-b from-white to-slate-50">
                  <div className="text-sm text-slate-700 font-medium mb-1">객단가 (ADR)</div>
                  {(() => {
                    const adr = displayData?.kpiMetrics?.totalADR ?? coreData.core?.summary?.totalADR ?? coreData.core?.summary?.adr;
                    return adr !== undefined && adr !== null ? (
                      <>
                        <div className="text-3xl font-extrabold text-teal-700 tracking-tight">
                          {formatCurrency(adr)} <span className="text-sm font-medium text-slate-500">원</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-2 font-medium">
                          객실 총매출 ÷ 판매 객실 수
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-slate-400 font-medium h-full flex flex-col justify-center">
                        ADR 산출 불가<br/>(API 연동 대기)
                      </div>
                    );
                  })()}
                </div>
                
                <div className="bg-[#f8fafc] p-4 rounded-xl border border-slate-200 flex flex-col justify-center text-center h-[130px] shadow-sm hover:shadow-md transition-all bg-gradient-to-b from-white to-slate-50">
                  <div className="text-sm text-slate-700 font-medium mb-1">객실당 매출 (RevPAR)</div>
                  {(() => {
                    const revPar = displayData?.kpiMetrics?.revPAR ?? coreData.core?.summary?.revPAR;
                    return revPar !== undefined && revPar !== null ? (
                      <>
                        <div className="text-3xl font-extrabold text-teal-700 tracking-tight">
                          {formatCurrency(revPar)} <span className="text-sm font-medium text-slate-500">원</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-2 font-medium">
                          객실 총매출 ÷ 전체 객실 수
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-slate-400 font-medium h-full flex flex-col justify-center">
                        RevPAR 산출 불가<br/>(API 연동 대기)
                      </div>
                    );
                  })()}
                </div>
                
                <div className="bg-[#f8fafc] p-4 rounded-xl border border-slate-200 flex flex-col justify-center text-center h-[130px] shadow-sm hover:shadow-md transition-all bg-gradient-to-b from-white to-slate-50">
                  <div className="text-sm text-slate-700 font-medium mb-1">객실당 총매출 (TrevPAR)</div>
                  {(() => {
                    const trevPar = displayData?.kpiMetrics?.trevPAR ?? coreData.core?.summary?.trevPAR;
                    return trevPar !== undefined && trevPar !== null ? (
                      <>
                        <div className="text-3xl font-extrabold text-teal-700 tracking-tight">
                          {formatCurrency(trevPar)} <span className="text-sm font-medium text-slate-500">원</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-2 font-medium">
                          리조트 총매출 ÷ 전체 객실 수
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
                      <div className="text-3xl font-black text-emerald-600 tracking-tight tabular-nums">
                        ₩{formatCurrency(displayData.golfSummary?.avgGreenFee || 0)} <span className="text-sm font-normal text-slate-500">/인</span>
                      </div>
                    </div>

                    {/* 자사 평균 / OTA 평균 / 회원 평균 3분할 서브 그리드 */}
                    <div className="grid grid-cols-3 gap-2.5">
                      {/* 자사 평균 */}
                      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs text-center flex flex-col justify-between">
                        <div className="text-xs font-bold text-indigo-700 bg-indigo-50 py-0.5 px-1.5 rounded-lg mb-1 truncate">
                          자사 평균
                        </div>
                        <div className="text-base font-black text-slate-900 tabular-nums my-1">
                          ₩{formatCurrency(displayData.golfSummary?.directAvgGreenFee || displayData.golfSummary?.avgGreenFee || 0)}
                        </div>
                        <div className="text-xs text-slate-400 font-medium truncate">
                          홈페이지 예약
                        </div>
                      </div>

                      {/* OTA 평균 */}
                      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs text-center flex flex-col justify-between">
                        <div className="text-xs font-bold text-amber-700 bg-amber-50 py-0.5 px-1.5 rounded-lg mb-1 truncate">
                          OTA 평균
                        </div>
                        <div className="text-base font-black text-slate-900 tabular-nums my-1">
                          ₩{formatCurrency(displayData.golfSummary?.otaAvgGreenFee || displayData.golfSummary?.avgGreenFee || 0)}
                        </div>
                        <div className="text-xs text-slate-400 font-medium truncate">
                          대행사 제휴처
                        </div>
                      </div>

                      {/* 회원 평균 */}
                      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs text-center flex flex-col justify-between">
                        <div className="text-xs font-bold text-purple-700 bg-purple-50 py-0.5 px-1.5 rounded-lg mb-1 truncate">
                          회원 평균
                        </div>
                        <div className="text-base font-black text-slate-900 tabular-nums my-1">
                          {displayData.golfSummary?.memberAvgGreenFee && displayData.golfSummary.memberAvgGreenFee > 0
                            ? `₩${formatCurrency(displayData.golfSummary.memberAvgGreenFee)}`
                            : `₩${formatCurrency(displayData.golfSummary?.avgGreenFee || 0)}`}
                        </div>
                        <div className="text-xs text-slate-400 font-medium truncate">
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
                            const maxPrice = coreData.core.summary.golfRankedChannels[0]?.avgGreenFee || 1;
                            const pct = Math.min(100, Math.max(10, Math.round((item.avgGreenFee / maxPrice) * 100)));
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
                        <div className="text-xs text-slate-500 font-semibold mb-1">총 예약 팀수</div>
                        <div className="text-2xl lg:text-3xl font-black text-slate-900 tabular-nums">
                          {`${golfReservedTeams}`} <span className="text-sm font-normal text-slate-500">팀</span>
                        </div>
                      </div>
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
                        <div className="text-xs text-slate-500 font-semibold mb-1">실제 입장 (내장)</div>
                        <div className="text-2xl lg:text-3xl font-black text-brand-mint tabular-nums">
                          {displayData.golfSummary ? `${displayData.golfSummary.visitedTeams}` : '0'} <span className="text-sm font-normal text-slate-500">팀</span>
                        </div>
                      </div>
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
                        <div className="text-xs text-rose-500 font-semibold mb-1">취소 / 미내장</div>
                        <div className="text-2xl lg:text-3xl font-black text-rose-500 tabular-nums">
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
                  </div>
                  <div className="text-xs text-slate-400 mt-3.5 pt-3 border-t border-slate-200/80">
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
            <SalesPieChart data={pieChartData} />
          )}

            {/* QA & KPI 상세 가이드 Accordion */}
            <div className="lg:col-span-12 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-brand-mint" />
                지표 산출 공식 및 경영 의미 가이드
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* RevPAR & Occ */}
                <div className="bg-slate-50 p-5 rounded-2xl flex flex-col justify-between border border-slate-200/80">
                  <div>
                    <h4 className="font-bold text-slate-800 mb-3 border-b border-slate-200 pb-2">객실 지표 산출 방식 안내</h4>
                    <ul className="space-y-4 text-slate-600">
                      <li className="flex flex-col">
                        <span className="font-semibold text-slate-800">객실 점유율 (Occ) 및 객단가 (RevPAR)</span>
                        <div className="text-xs text-teal-800 bg-teal-50 p-3 rounded-xl mt-1.5 border border-teal-100 font-medium">
                          <strong>공식 정산 기준:</strong> 모든 핵심 운영 지표(객실 점유율, 판매 객단가 등)는 리조트 공식 PMS/POS 원천 확정 데이터를 기준으로 제공됩니다.
                        </div>
                      </li>
                    </ul>
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
