import React from 'react';
import { CalendarDays, Building2, Coins, AlertCircle, Calculator, Users, Activity } from 'lucide-react';
import GlobalDatePicker from '../components/GlobalDatePicker';
import { useDate } from '../contexts/DateContext';
import { useCoreData } from '../contexts/CoreDataContext';
import { transformHomeData } from '../lib/dataTransformers';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

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

  React.useEffect(() => {
    if (!startDate) return;
    const fetchLosTrend = async () => {
      setLoadingLos(true);
      try {
        const { secureFetcher } = await import('../lib/secureFetcher');
        const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';
        let queryParams = `startDate=${startDate}`;
        // LOS API requires endDate
        if (endDate && startDate !== endDate) {
          queryParams += `&endDate=${endDate}`;
        } else {
          queryParams += `&endDate=${startDate}`;
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
  const apiError = coreData.error ? '데이터를 불러오는 데 실패했습니다. 서버 연결 상태를 확인해주세요.' : 
                  (coreData.isLoading ? null : (transformedData ? null : '데이터를 불러오는 데 실패했습니다.'));

  // V5 에서는 current/lastYear 구분 없이 평탄화(Flat)된 weather 객체가 옵니다. 호환성을 위해 둘 다 체크합니다.
  const weather = coreData.core?.weather?.current || coreData.core?.weather || null;
  const lastYearWeather = coreData.core?.weather?.lastYear || ((weather?.lyDescription || weather?.lyTempMax) ? { weatherDesc: weather.lyDescription || '', description: weather.lyDescription || '', tempMax: weather.lyTempMax, tempMin: weather.lyTempMin } : null);

  const displayData: any = data;

  const formatCurrency = (val: number) => {
    const rounded = Math.round(val || 0);
    return new Intl.NumberFormat('ko-KR').format(rounded);
  };

  const pieChartData = React.useMemo(() => {
    // [SSOT 무관용 원칙 적용] 프론트엔드 자체 forEach 합산 금지 -> 백엔드 연동 전까지 빈 배열
    return [];
  }, [coreData.core?.salesByCategory]);

  const leisureVisitorsMap = React.useMemo(() => {
    // [SSOT 무관용 원칙 적용] 프론트엔드 자체 forEach 합산 및 오타(Typo) 유추 매핑 금지
    const map: Record<string, number> = {};
    return map;
  }, [coreData.core?.salesByFacility]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28DFF', '#FF6B6B', '#4ECDC4'];


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

  const totalRoomInventory = coreData.core?.summary?.totalRoomInventory || 0;
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

            <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-brand-mint/5 shape-leaf transition-transform duration-500 group-hover:scale-150 group-hover:rotate-12" />
              <div className="min-h-[96px] mb-2 relative z-10 flex flex-col justify-start">
                <h2 className="text-base font-semibold text-slate-500 flex items-center gap-2 flex-wrap">
                  <Building2 className="w-5 h-5 text-brand-mint group-hover:animate-pulse" /> 올해 누적 매출 (YTD) 
                  <span className="text-xs text-slate-400 font-normal">
                    ({startDate.slice(0, 4)}-01-01 ~ {isRangeMode && coreData.core?.endDate ? coreData.core.endDate : startDate})
                  </span>
                </h2>
              </div>
              <div className="text-3xl font-semibold text-slate-800 mb-4 tracking-tight relative z-10">
                {formatCurrency(ytdGross)}
              </div>
              {ytdGrowth !== undefined ? (
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold relative z-10 ${ytdGrowth >= 0 ? 'bg-brand-mint/10 text-brand-mint' : 'bg-red-50 text-red-500'}`}>
                  <span>전년 동기 대비</span>
                  <span>{ytdGrowth >= 0 ? '▲' : '▼'} {Math.abs(ytdGrowth).toFixed(1)}%</span>
                  {ytdDiff !== undefined && (
                    <span className="font-medium opacity-80">({ytdDiff > 0 ? '+' : ''}{formatCurrency(ytdDiff)})</span>
                  )}
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold bg-slate-100 text-slate-400 relative z-10">
                  <span>전년 비교 데이터 산출 불가 (API 연동 대기)</span>
                </div>
              )}
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
                  <span>{new Intl.NumberFormat('ko-KR').format(totalRoomInventory)}</span>
                  <span className="text-lg font-medium text-slate-500">명</span>
                </div>
                
                {multiNight && (
                  <div className="mb-3 relative z-10 p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-100/90 flex flex-wrap items-center justify-between gap-1.5 text-xs shadow-xs">
                    <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                      <span className="bg-brand-mint text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-xs">연박(2박+)</span>
                      <span className="font-bold text-slate-800">{new Intl.NumberFormat('ko-KR').format(multiNight.multiNightGuests || 0)}명</span>
                      <span className="text-slate-500 text-[11px]">(투숙객 대비 <strong className="text-slate-700 font-semibold">{totalRoomInventory > 0 ? (((multiNight.multiNightGuests || 0) / totalRoomInventory) * 100).toFixed(1) : (multiNight.multiNightRatio || 0).toFixed(1)}%</strong>)</span>
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
                      <span className="text-base sm:text-lg font-black text-brand-mint tracking-tight">{new Intl.NumberFormat('ko-KR').format(leisureVisitorsMap['썸머랜드'] || 0)}<span className="text-xs font-normal text-slate-500 ml-0.5">명</span></span>
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
                  <div className="text-sm text-slate-700 font-medium mb-2">객단가 (RevPAR)</div>
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-2xl font-extrabold text-teal-700">
                      {coreData.core?.summary?.revPAR !== undefined 
                        ? formatCurrency(coreData.core.summary.revPAR) 
                        : '0'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium mt-1">판매가능 객실당 수익</span>
                  </div>
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
                        <div className="text-xs text-slate-400 font-medium mb-1">예약 팀수</div>
                        <div className="text-3xl font-semibold text-brand-mint">
                          {`${golfReservedTeams}팀`}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 font-medium mb-1">실제 입장 팀수</div>
                        <div className="text-3xl font-semibold text-brand-mint">
                          {displayData.golfSummary ? `${displayData.golfSummary.visitedTeams}팀` : '0팀'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 font-medium mb-1">{isRangeMode ? '취소 / 미내장' : '입장 예정 (미도착)'}</div>
                        <div className="text-3xl font-semibold text-brand-mint">
                          {displayData.golfSummary ? `${displayData.golfSummary.pendingTeams ?? Math.max(0, (displayData.golfSummary.reservedTeams || 0) - (displayData.golfSummary.visitedTeams || 0))}팀` : '0팀'}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-slate-400 mt-auto pt-3 border-t border-slate-100">
                    {isRangeMode ? '선택 기간 골프 총 예약/취소 및 실제 내장 실적 데이터' : '오늘 골프 실시간 예약 및 입장 데이터 (아직 도착하지 않은 잔여 예약 포함)'}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* LOS (연박) 비중 vs 부대시설 매출 상관관계 분석 차트 */}
          {losTrendData && losTrendData.length > 0 && (
            <div className="lg:col-span-12 bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-6 border border-slate-100 relative overflow-hidden">
              <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-500" /> 연박 비중(%) vs 부대시설 매출 추이 상관관계 분석
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">체류 기간(LOS)의 증감에 따른 F&B 및 레저 시설 매출 증감율(YoY) 비교</p>
                </div>
                <div className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full font-semibold flex items-center gap-2">
                  {loadingLos && <span className="animate-spin w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full"></span>}
                  LOS IMPACT
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={losTrendData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={10} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dx={-10} tickFormatter={(val) => `${val}%`} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dx={10} tickFormatter={(val) => `${(val / 10000).toFixed(0)}만`} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
                      formatter={(value: any, name: any) => {
                        if (name === '연박 비중') return [`${value}%`, name];
                        return [`${new Intl.NumberFormat('ko-KR').format(value)}원`, name];
                      }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                    <Bar yAxisId="right" dataKey="totalSynergySales" name="부대시설 총매출" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={40} opacity={0.3} />
                    <Line yAxisId="left" type="monotone" dataKey="multiNightRatio" name="연박 비중" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

            {/* 본부별 매출 파이 차트 */}
            {pieChartData.length > 0 && (
              <div className="lg:col-span-12 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-medium text-slate-800 mb-6 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-brand-mint" />
                  그룹별 매출 비중
                </h3>
                <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                  <div className="w-full md:w-1/2 h-[300px]">
                    <PieChart width={300} height={300}>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          innerRadius={60}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieChartData.map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: any) => [`${formatCurrency(value)}원`, '매출액']}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </div>
                  <div className="w-full md:w-1/2 grid grid-cols-2 gap-4">
                    {pieChartData.map((item: any, index: number) => (
                      <div key={item.name} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="text-sm font-medium text-slate-700">{item.name}</span>
                        </div>
                        <div className="text-lg font-bold text-slate-800">
                          {formatCurrency(item.value)} <span className="text-xs text-slate-500 font-normal">원</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
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
                          <strong>V5 API 팩트 기반:</strong> 모든 지표(Occ, RevPAR 등)는 프론트엔드 연산 없이 데이터랩 통합 통제 센터(백엔드 DB)에서 완성된 값으로 제공됩니다.
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
