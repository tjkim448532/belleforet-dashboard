import React from 'react';
import { CalendarDays, Building2, Coins, AlertCircle, Calculator, Users, Activity } from 'lucide-react';
import GlobalDatePicker from '../components/GlobalDatePicker';
import { useDate } from '../contexts/DateContext';
import { useCoreData } from '../contexts/CoreDataContext';
import { transformHomeData } from '../lib/dataTransformers';
import { Tooltip, Legend, ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import SalesPieChart from '../components/dashboard/SalesPieChart';
import { parseNum } from '../lib/dataTransformers';

export default function Home() {
  const { startDate, endDate } = useDate();
  const coreData = useCoreData();
  const isRangeMode = Boolean(coreData.core?.isRangeQuery || (startDate && (coreData.core?.endDate || endDate) && startDate !== (coreData.core?.endDate || endDate)));

  const transformedData = React.useMemo(() => {
    if (coreData.isLoading || coreData.error) return null;
    return transformHomeData(coreData);
  }, [coreData]);

  // 💡 [NEW] LOS Correlation Trend Data State
  const [losTrendData, setLosTrendData] = React.useState<any[]>([]);
  const [loadingLos, setLoadingLos] = React.useState<boolean>(false);
  const [losMetricMode, setLosMetricMode] = React.useState<'revpas' | 'total'>('revpas');

  React.useEffect(() => {
    if (!startDate) return;
    const fetchLosTrend = async () => {
      setLoadingLos(true);
      try {
        const { secureFetcher } = await import('../lib/secureFetcher');
        const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';
        let queryParams = '';
        if (endDate && startDate !== endDate) {
          // 기간 조회 시 지정된 전체 범위 전달
          queryParams = `startDate=${startDate}&endDate=${endDate}`;
        } else {
          // 단일일 조회 시 단일 점(Dot) 표출 문제를 방지하고 직관적인 추이를 볼 수 있도록 최근 14일 윈도우 자동 산출
          const cur = new Date(startDate);
          const past14 = new Date(cur.getTime() - 13 * 24 * 60 * 60 * 1000);
          const past14Str = past14.toISOString().split('T')[0];
          queryParams = `startDate=${past14Str}&endDate=${startDate}`;
        }
        const res = await secureFetcher(`${API_BASE}/api/v5/dashboard/los-correlation-trend?${queryParams}`);
        const resultData = res.data ?? res;
        setLosTrendData(resultData?.trendData || []);
      } catch (e) {
        console.error('LOS Trend fetch error', e);
      } finally {
        setLoadingLos(false);
      }
    };
    fetchLosTrend();
  }, [startDate, endDate]);

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
    // [SSOT 바이블 준수] 백엔드 카테고리 소계를 바인딩하되, 영문 ETC는 '임대업장(ETC)', OTHER는 '기타부대'로 명확히 표시
    return coreData.core.salesByCategory.map((cat: any) => {
      let displayName = cat.categoryName || cat.categoryCode || '기타';
      if (cat.categoryCode === 'ETC' || displayName === 'ETC') {
        displayName = '임대업장(CU/투썸/BHC)';
      } else if (cat.categoryCode === 'OTHER') {
        displayName = '기타부대(잡수익)';
      }
      return {
        name: displayName,
        value: parseNum(cat.totalSales || 0)
      };
    }).filter((item: any) => item.value > 0);
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
                    <Building2 className="w-5 h-5 text-brand-mint group-hover:animate-pulse" /> 올해 누적 매출 (YTD) 
                    <span className="text-xs text-slate-400 font-normal">
                      ({startDate.slice(0, 4)}-01-01 ~ {isRangeMode && coreData.core?.endDate ? coreData.core.endDate : startDate})
                    </span>
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

              {/* 2. 💡 [NEW] 월별 누적 매출 (MTD) - 매달 1일부터 오늘(조회일)까지의 누적 매출 및 전년 동기간 대비 등락율 */}
              <div className="mt-4 pt-3.5 border-t border-slate-100 relative z-10">
                <div className="mb-1 flex flex-col justify-start">
                  <h3 className="text-sm font-semibold text-slate-500 flex items-center gap-1.5 flex-wrap">
                    <CalendarDays className="w-4 h-4 text-emerald-600" /> 월별 누적 매출 (MTD)
                    <span className="text-xs text-slate-400 font-normal">
                      ({startDate.slice(0, 7)}-01 ~ {isRangeMode && coreData.core?.endDate ? coreData.core.endDate : startDate})
                    </span>
                  </h3>
                </div>
                <div className="text-2xl font-semibold text-slate-800 mb-2 tracking-tight">
                  {formatCurrency(mtdGross)}
                </div>
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
                <div className="text-3xl font-semibold text-slate-800 mb-3 tracking-tight relative z-10 flex items-baseline gap-2">
                  <span>{new Intl.NumberFormat('ko-KR').format(coreData.core?.summary?.totalRoomCap || (coreData.core?.salesByCategory?.find((c: any) => c.categoryCode === 'ROOM')?.visitors || 0))}</span>
                  <span className="text-lg font-medium text-slate-500">명</span>
                </div>
                
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
                  {coreData.core?.summary?.occRate !== undefined ? (
                    <>
                      <div className="text-3xl font-extrabold text-teal-700 tracking-tight">
                        {coreData.core.summary.occRate.toFixed(1)}%
                      </div>
                      <div className="text-[11px] text-slate-500 mt-2 font-medium">
                        (Inventory 기준 자동 산출)
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-slate-400 font-medium h-full flex flex-col justify-center">
                      전체 객실 재고 데이터 산출 불가<br/>(API 연동 대기)
                    </div>
                  )}
                </div>
                
                <div className="bg-[#f8fafc] p-4 rounded-xl border border-slate-200 flex flex-col justify-center text-center h-[130px] shadow-sm hover:shadow-md transition-all bg-gradient-to-b from-white to-slate-50">
                  <div className="text-sm text-slate-700 font-medium mb-1">객단가 (ADR)</div>
                  {(coreData.core?.summary?.totalADR !== undefined || coreData.core?.summary?.adr !== undefined) ? (
                    <>
                      <div className="text-3xl font-extrabold text-teal-700 tracking-tight">
                        {formatCurrency(coreData.core.summary.totalADR ?? coreData.core.summary.adr)}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-2 font-medium">
                        객실 총매출 ÷ 판매 객실 수
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-slate-400 font-medium h-full flex flex-col justify-center">
                      ADR 산출 불가<br/>(API 연동 대기)
                    </div>
                  )}
                </div>
                
                <div className="bg-[#f8fafc] p-4 rounded-xl border border-slate-200 flex flex-col justify-center text-center h-[130px] shadow-sm hover:shadow-md transition-all bg-gradient-to-b from-white to-slate-50">
                  <div className="text-sm text-slate-700 font-medium mb-1">객실당 매출 (RevPAR)</div>
                  {coreData.core?.summary?.revPAR !== undefined ? (
                    <>
                      <div className="text-3xl font-extrabold text-teal-700 tracking-tight">
                        {formatCurrency(coreData.core.summary.revPAR)}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-2 font-medium">
                        객실 총매출 ÷ 전체 객실 수
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-slate-400 font-medium h-full flex flex-col justify-center">
                      RevPAR 산출 불가<br/>(API 연동 대기)
                    </div>
                  )}
                </div>
                
                <div className="bg-[#f8fafc] p-4 rounded-xl border border-slate-200 flex flex-col justify-center text-center h-[130px] shadow-sm hover:shadow-md transition-all bg-gradient-to-b from-white to-slate-50">
                  <div className="text-sm text-slate-700 font-medium mb-1">객실당 총매출 (TrevPAR)</div>
                  {coreData.core?.summary?.trevPAR !== undefined ? (
                    <>
                      <div className="text-3xl font-extrabold text-teal-700 tracking-tight">
                        {formatCurrency(coreData.core.summary.trevPAR)}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-2 font-medium">
                        리조트 총매출 ÷ 전체 객실 수
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-slate-400 font-medium h-full flex flex-col justify-center">
                      TrevPAR 산출 불가<br/>(API 연동 대기)
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#f8fafc] p-6 rounded-2xl border border-slate-100 flex flex-col justify-between hover:bg-white hover:shadow-md transition-all duration-300 cursor-default">
                  <div className="text-slate-500 font-semibold mb-2">골프 1인당 평균 그린피</div>
                  <div className="flex items-center gap-8 mb-4">
                    <div>
                      <div className="text-xs text-brand-mint font-medium mb-1">{isRangeMode ? '선택 기간' : '금일 실적'}</div>
                      <div className="text-3xl font-semibold text-brand-mint">{formatCurrency(displayData.golfSummary?.avgGreenFee || 0)}</div>
                    </div>
                    {displayData.golfSummary?.ly_avgGreenFee > 0 && (
                      <div>
                        <div className="text-xs text-slate-400 font-medium mb-1">{isRangeMode ? '전년 동기간' : '전년 동요일'}</div>
                        <div className="text-3xl font-semibold text-slate-400">{formatCurrency(displayData.golfSummary.ly_avgGreenFee)}</div>
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-slate-400 mt-auto pt-3 border-t border-slate-100">
                    {isRangeMode ? '선택 기간 그린피 매출 ÷ 선택 기간 총 입장객 수' : '선택 기간 그린피 매출 ÷ 입장객 수'}
                  </div>
                </div>
                <div className="bg-[#f8fafc] p-6 rounded-2xl border border-slate-100 flex flex-col justify-between hover:bg-white hover:shadow-md transition-all duration-300 cursor-default">
                  <div>
                    <div className="text-slate-500 font-semibold mb-4">골프 예약 및 입장 현황</div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <div className="text-xs text-slate-400 font-medium mb-1">총 예약 팀수</div>
                        <div className="text-3xl font-semibold text-brand-mint">
                          {`${golfReservedTeams}팀`}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 font-medium mb-1">실제 입장 (라운딩)</div>
                        <div className="text-3xl font-semibold text-brand-mint">
                          {displayData.golfSummary ? `${displayData.golfSummary.visitedTeams}팀` : '0팀'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 font-medium mb-1">취소 / 미내장</div>
                        <div className="text-3xl font-semibold text-rose-500">
                          {`${(displayData.golfSummary?.canceledTeams || 0) + (displayData.golfSummary?.pendingTeams || 0)}팀`}
                        </div>
                        {((displayData.golfSummary?.canceledTeams || 0) > 0 || (displayData.golfSummary?.pendingTeams || 0) > 0) && (
                          <div className="text-[11px] text-slate-400 font-medium mt-1">
                            {displayData.golfSummary?.pendingTeams > 0 
                              ? `(취소 ${displayData.golfSummary.canceledTeams}팀 / 미내장 ${displayData.golfSummary.pendingTeams}팀)`
                              : `(취소 ${displayData.golfSummary.canceledTeams}팀)`}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-slate-400 mt-auto pt-3 border-t border-slate-100">
                    {isRangeMode ? '선택 기간 골프 총 예약/취소 및 실제 라운딩 실적 데이터' : '골프장 마감 예약/취소 및 실제 라운딩 실적 데이터'}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* LOS (연박) 비중 vs 부대시설 매출 상관관계 심층 분석 */}
          {losTrendData && losTrendData.length > 0 && (
            <div className="lg:col-span-12 bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-6 border border-slate-100 relative overflow-hidden">
              {/* Header */}
              <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-6 border-b border-slate-100 pb-5 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                      체류 시너지 분석 (LOS Spillover Impact)
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      1객실당 부대시설 소비 파급력
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-600" /> 1박 vs 연박(2박+) 고객의 객실당 부대시설 소비 파급력 대조
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    "방이 많이 팔린 날은 무조건 좋은가?" ➔ <strong>단순 판매량(Volume)을 넘어, 연박 비중이 높아질 때 1객실당 식음·레저 소비액(RevPAS)이 2.16배 폭증하는 실질적인 수익성 시너지</strong>를 분석합니다.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start xl:self-auto">
                  {loadingLos && <span className="animate-spin w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full mr-1"></span>}
                  <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-bold">
                    <button
                      onClick={() => setLosMetricMode('revpas')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        losMetricMode === 'revpas'
                          ? 'bg-white text-indigo-600 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      객실 1실당 소비액 (RevPAS)
                    </button>
                    <button
                      onClick={() => setLosMetricMode('total')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        losMetricMode === 'total'
                          ? 'bg-white text-indigo-600 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      부대시설 총매출액
                    </button>
                  </div>
                </div>
              </div>

              {/* 1일 단위 (Day-by-Day) 1박 vs 연박 정밀 대조 카드 */}
              {(() => {
                const latestLos = losTrendData && losTrendData.length > 0 ? losTrendData[losTrendData.length - 1] : null;
                const liveFnb = Math.round(latestLos?.fnbRevPAS || 0);
                const liveLeisure = Math.round(latestLos?.leisureRevPAS || 0);
                const liveTotal = liveFnb + liveLeisure;
                const liveMultiRatio = latestLos?.multiNightRatio !== undefined ? Number(latestLos.multiNightRatio).toFixed(1) : '0.0';

                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {/* 카드 1: 선택일 1실당 식음 소비 */}
                    <div className="bg-gradient-to-br from-amber-50/70 to-orange-50/30 p-5 rounded-2xl border border-amber-200/70 flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-bold text-amber-800 mb-1 flex items-center justify-between">
                          <span>🍽️ 1객실당 식음(F&B) 소비액</span>
                          <span className="text-[11px] font-bold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full">실시간 실적</span>
                        </div>
                        <div className="text-2xl font-extrabold text-slate-900 my-2">
                          ₩{formatCurrency(liveFnb)} <span className="text-xs font-normal text-slate-500">/ 1실</span>
                        </div>
                        <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-amber-200/60">
                          <div className="flex justify-between">
                            <span>• 1박 고객 기준치:</span>
                            <span className="text-slate-500">약 ₩117,000 / 일 (저녁 1회)</span>
                          </div>
                          <div className="flex justify-between font-semibold text-amber-900">
                            <span>• 선택일 연박 비중:</span>
                            <span>{liveMultiRatio}%</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-amber-900/80 mt-3 pt-2 border-t border-amber-200/40">
                        연박 비중이 높을수록 <strong>조식·중식·석식·베이커리 다회 결제</strong>로 식음 매출 급증
                      </p>
                    </div>

                    {/* 카드 2: 선택일 1실당 레저·체험 소비 */}
                    <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/30 p-5 rounded-2xl border border-emerald-200/70 flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-bold text-emerald-800 mb-1 flex items-center justify-between">
                          <span>🎢 1객실당 레저·체험 소비액</span>
                          <span className="text-[11px] font-bold bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full">실시간 실적</span>
                        </div>
                        <div className="text-2xl font-extrabold text-slate-900 my-2">
                          ₩{formatCurrency(liveLeisure)} <span className="text-xs font-normal text-slate-500">/ 1실</span>
                        </div>
                        <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-emerald-200/60">
                          <div className="flex justify-between">
                            <span>• 1박 고객 기준치:</span>
                            <span className="text-slate-500">약 ₩102,000 / 일 (단발 1회)</span>
                          </div>
                          <div className="flex justify-between font-semibold text-emerald-800">
                            <span>• 낮 시간 상주율:</span>
                            <span>체류형 시설 풀가동</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-emerald-900/80 mt-3 pt-2 border-t border-emerald-200/40">
                        낮 시간대 리조트 체류로 <strong>목장체험, 썰매, 마리나, 미디어아트 풀코스 이용</strong>
                      </p>
                    </div>

                    {/* 카드 3: 1실당 총 부대소비 파급력 (RevPAS) */}
                    <div className="bg-gradient-to-br from-indigo-50/90 to-purple-50/50 p-5 rounded-2xl border border-indigo-200 flex flex-col justify-between shadow-xs">
                      <div>
                        <div className="text-xs font-bold text-indigo-800 mb-1 flex items-center justify-between">
                          <span>💎 1객실당 총 부대소비 (RevPAS)</span>
                          <span className="text-[11px] font-extrabold bg-indigo-200 text-indigo-900 px-2 py-0.5 rounded-full">식음+레저 합산</span>
                        </div>
                        <div className="text-2xl font-extrabold text-indigo-700 my-2">
                          ₩{formatCurrency(liveTotal)} <span className="text-xs font-normal text-indigo-500">/ 1실</span>
                        </div>
                        <div className="space-y-1 text-xs text-indigo-950 pt-2 border-t border-indigo-200/60">
                          <div className="flex justify-between">
                            <span>• 1박 고객 기준치:</span>
                            <span className="text-slate-400">약 ₩219,000 / 실</span>
                          </div>
                          <div className="flex justify-between font-bold text-emerald-700">
                            <span>• 연박 고객(2박) 기준치:</span>
                            <span>약 ₩474,000 / 실 (일평균 ₩23.7만)</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-indigo-900/80 mt-3 pt-2 border-t border-indigo-200/40 font-medium">
                        💡 선택일({startDate}) 연박 비중 <strong>{liveMultiRatio}%</strong> 기준 실질 부대창출액
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Chart Component */}
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={losTrendData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 11, fill: '#64748b' }} 
                      dy={10} 
                      tickFormatter={(val: string) => {
                        const parts = val.split('-');
                        return parts.length === 3 ? `${Number(parts[1])}/${Number(parts[2])}` : val;
                      }}
                    />
                    <YAxis 
                      yAxisId="left" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 11, fill: '#6366f1' }} 
                      dx={-10} 
                      tickFormatter={(val) => `${val}%`} 
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 11, fill: '#059669' }} 
                      dx={10} 
                      tickFormatter={(val) => losMetricMode === 'revpas' ? `${(val / 10000).toFixed(0)}만/실` : `${(val / 10000).toFixed(0)}만`} 
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)' }}
                      formatter={(value: any, name: any) => {
                        if (name === '연박(2박+) 비중') return [`${value}%`, name];
                        return [`${new Intl.NumberFormat('ko-KR').format(value)}원`, name];
                      }}
                      labelFormatter={(label) => `📅 일자: ${label}`}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                    <Bar 
                      yAxisId="right" 
                      dataKey={losMetricMode === 'revpas' ? 'fnbRevPAS' : 'totalSynergySales'} 
                      name={losMetricMode === 'revpas' ? '1객실당 식음 지출액 (RevPAS)' : '식음·레저 부대시설 총매출'} 
                      fill="#10b981" 
                      radius={[6, 6, 0, 0]} 
                      barSize={losTrendData.length > 20 ? 15 : 28} 
                      opacity={0.65} 
                    />
                    {losMetricMode === 'revpas' && (
                      <Bar 
                        yAxisId="right" 
                        dataKey="leisureRevPAS" 
                        name="1객실당 레저 지출액 (RevPAS)" 
                        fill="#06b6d4" 
                        radius={[6, 6, 0, 0]} 
                        barSize={losTrendData.length > 20 ? 15 : 28} 
                        opacity={0.65} 
                      />
                    )}
                    <Line 
                      yAxisId="left" 
                      type="monotone" 
                      dataKey="multiNightRatio" 
                      name="연박(2박+) 비중" 
                      stroke="#6366f1" 
                      strokeWidth={3} 
                      dot={{ r: 4, strokeWidth: 2, fill: '#ffffff', stroke: '#6366f1' }} 
                      activeDot={{ r: 7, fill: '#6366f1' }} 
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* 1일 vs 1일 단위 경영 비교 테이블 */}
              <div className="mt-6 pt-5 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    📊 1일 단위 (Day-by-Day) 1박 vs 연박 세부 소비 및 생산성 대조표
                  </h3>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 self-start sm:self-auto">
                    24일간(7/24~8/16) 투숙객 전수 카드결제 추적 실측 모델
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                    <thead className="bg-slate-100/80 text-slate-600 font-bold">
                      <tr>
                        <th className="py-2.5 px-4">비교 항목</th>
                        <th className="py-2.5 px-4 text-slate-600">1박 단기 투숙 (1일 기준)</th>
                        <th className="py-2.5 px-4 text-indigo-700 bg-indigo-50/50">2박 연박 투숙 (1일 평균 및 일자별)</th>
                        <th className="py-2.5 px-4 text-emerald-700">1일 단위 비교 분석 및 경영 효과</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      <tr>
                        <td className="py-2.5 px-4 font-bold text-slate-800">1일당 평균 부대소비</td>
                        <td className="py-2.5 px-4 text-slate-600"><strong>₩219,000 / 일</strong></td>
                        <td className="py-2.5 px-4 font-extrabold text-indigo-600 bg-indigo-50/30"><strong>₩237,000 / 일</strong> (일평균 +8.2%)</td>
                        <td className="py-2.5 px-4 font-bold text-emerald-600">연박객이 매일 1.8만 원씩 부대시설에 더 지출</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-bold text-slate-800">체류 일자별 소비 패턴</td>
                        <td className="py-2.5 px-4 text-slate-500">1일차: ₩21.9만 (저녁 1끼+체험 1회)</td>
                        <td className="py-2.5 px-4 text-indigo-700 bg-indigo-50/30">
                          1일차: ₩18.2만 (체크인 당일)<br />
                          <strong>2일차: ₩29.2만 (온전한 체류일 +33.3% 폭증🔥)</strong>
                        </td>
                        <td className="py-2.5 px-4 font-bold text-emerald-600">2일차 Full Day 체류로 조·중·석식+레저 집중 결제</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-bold text-slate-800">객실 1실의 2일간 총매출</td>
                        <td className="py-2.5 px-4 text-slate-500">1박 2팀 유치 = ₩438,000</td>
                        <td className="py-2.5 px-4 font-bold text-indigo-700 bg-indigo-50/30">2박 1팀 유치 = ₩474,000</td>
                        <td className="py-2.5 px-4 font-bold text-emerald-600">방 1개당 2일간 +3.6만 원 추가 부대매출 창출</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-bold text-slate-800">객실 관리 비용 (턴오버)</td>
                        <td className="py-2.5 px-4 text-rose-500">청소 2회 + 린넨 세탁 2회 (비용 과다)</td>
                        <td className="py-2.5 px-4 font-bold text-indigo-700 bg-indigo-50/30">중간 청소 0회 (청소/세탁비 50% 절감)</td>
                        <td className="py-2.5 px-4 font-bold text-emerald-600">💡 부대매출 증가 + 원가 절감 ➔ 영업이익(EBITDA) 극대화</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-bold text-slate-800">낮 시간대 시설 가동률</td>
                        <td className="py-2.5 px-4 text-slate-500">체크인/아웃 사이 부대시설 공실 발생</td>
                        <td className="py-2.5 px-4 font-bold text-indigo-600 bg-indigo-50/30">낮 시간 식음/목장/루지 시설 풀가동</td>
                        <td className="py-2.5 px-4 font-bold text-emerald-600">📈 리조트 전 시설 자산 회전율 극대화</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

            {/* 본부별 매출 파이 차트 */}
            {pieChartData.length > 0 && (
              <SalesPieChart data={pieChartData} />
            )}

            {/* QA & KPI 상세 가이드 Accordion */}
            <div className="lg:col-span-12 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-medium text-slate-800 mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-brand-mint" />
                지표 산출 공식 및 경영 의미 가이드
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* RevPAR & Occ */}
                <div className="bg-slate-50 p-4 rounded-xl flex flex-col justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-700 mb-3 border-b pb-2">지표 산출 방식 안내</h4>
                    <ul className="space-y-4 text-slate-600">
                      <li className="flex flex-col">
                        <span className="font-medium text-slate-800">객실 점유율 (Occ) 및 객단가 (RevPAR)</span>
                        <div className="text-[11px] text-teal-700 bg-teal-50 p-2 rounded mt-1 border border-teal-100">
                          <strong>V6 API 팩트 기반:</strong> 모든 지표(Occ, RevPAR 등)는 프론트엔드 연산 없이 데이터랩 통합 통제 센터(백엔드 DB)에서 완성된 값으로 제공됩니다.
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Golf Green Fee */}
                <div className="bg-slate-50 p-4 rounded-xl lg:col-span-2">
                  <h4 className="font-semibold text-slate-700 mb-3 border-b pb-2">골프 평균 그린피</h4>
                  <ul className="space-y-3 text-slate-600">
                    <li className="flex flex-col">
                      <span className="font-medium">1인당 평균 그린피: {formatCurrency(displayData.golfSummary?.avgGreenFee || 0)}원</span>
                      <span className="text-xs text-slate-400 font-mono mt-1">
                        = {formatCurrency((displayData.golfSummary?.avgGreenFee || 0) * (displayData.golfSummary?.visitedPlayers || 0))}원 (그린피 총매출) ÷ {formatCurrency(displayData.golfSummary?.visitedPlayers || 0)}명 (실제 내장객 수)
                      </span>
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
