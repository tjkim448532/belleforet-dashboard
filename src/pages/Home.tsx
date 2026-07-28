import React from 'react';
import { CalendarDays, Building2, Coins, AlertCircle, Calculator, Users } from 'lucide-react';
import GlobalDatePicker from '../components/GlobalDatePicker';
import { useDate } from '../contexts/DateContext';
import { useCoreData } from '../contexts/CoreDataContext';
import { transformHomeData } from '../lib/dataTransformers';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { secureFetcher } from '../lib/secureFetcher';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

export default function Home() {
  const { startDate, endDate } = useDate();
  const coreData = useCoreData();
  const [periodRoomSummary, setPeriodRoomSummary] = React.useState<any[]>([]);

  const isRangeMode = Boolean(coreData.core?.isRangeQuery || (startDate && (coreData.core?.endDate || endDate) && startDate !== (coreData.core?.endDate || endDate)));

  React.useEffect(() => {
    if (isRangeMode) {
      const eDate = coreData.core?.endDate || endDate || startDate;
      const sDate = startDate;
      const queryParams = `startDate=${sDate}&endDate=${eDate}`;
      secureFetcher(`${API_BASE}/api/v5/report/room-sales-by-channel?${queryParams}`)
        .then(res => {
          const items = res?.data || res;
          if (Array.isArray(items)) {
            setPeriodRoomSummary(items);
          }
        })
        .catch(() => {});
    } else {
      setPeriodRoomSummary([]);
    }
  }, [isRangeMode, startDate, endDate, coreData.core?.endDate]);

  const transformedData = React.useMemo(() => {
    if (coreData.isLoading || coreData.error) return null;
    return transformHomeData(coreData);
  }, [coreData]);

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
    if (!coreData.core?.salesByCategory || !Array.isArray(coreData.core.salesByCategory)) return [];
    
    const getHqName = (item: any) => {
      const code = String(item.categoryCode || item.category_code || item.category || '').toUpperCase();
      const rawName = String(item.categoryName || item.category_name || item.categoryCode || '').trim();

      if (code === 'ROOM' || code === '객실' || rawName.includes('콘도') || rawName.includes('객실')) return '콘도본부';
      if (code === 'GOLF' || code === '골프' || rawName.includes('골프')) return '골프본부';
      if (code === 'FNB' || code === '식음' || rawName.includes('식음') || rawName.includes('F&B')) return 'F&B본부';
      if (code === 'TICKET' || code === '티켓' || code === 'LEISURE' || rawName.includes('레저') || rawName.includes('티켓')) return '레저본부';
      if (code === 'MOTO' || rawName.includes('모토')) return '모토아레나';
      if (code === 'GOODS' || rawName.includes('굿즈')) return '벨포레굿즈';
      if (code === 'PARKING' || rawName.includes('주차')) return '주차관제';
      if (code === 'PROMOTION' || rawName.includes('기획전')) return '기획전';
      if (code === 'UNEARNED' || rawName.includes('미사용')) return '미사용 티켓';
      return '기타업장';
    };

    const hqMap: Record<string, number> = {};
    coreData.core.salesByCategory.forEach((item: any) => {
      const hqName = getHqName(item);
      const value = Number(item.todayActual || item.totalSales || item.sales || item.revenue || 0);
      if (value > 0) {
        hqMap[hqName] = (hqMap[hqName] || 0) + value;
      }
    });

    return Object.entries(hqMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [coreData.core?.salesByCategory]);

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

  // Use gross revenue (VAT inclusive)
  const todayGross = displayData.today.gross;
  const todayLyGross = displayData.today.ly_gross;
  const todayDiff = todayGross - todayLyGross;
  const todayPct = todayLyGross > 0 ? (todayDiff / todayLyGross) * 100 : 0;
  
  const ytdGross = displayData.ytd.gross;
  const ytdLyGross = displayData.ytd.ly_gross;
  const ytdDiff = ytdGross - ytdLyGross;
  const ytdPct = ytdLyGross > 0 ? (ytdDiff / ytdLyGross) * 100 : 0;

  const totalVisitors = displayData.kpiMetrics?.raw?.totalVisitors || 0;

  // 객단가 (ADR) 바인딩: 1순위 백엔드 roomSummaryByType, 미탑재 시 API 7 실시간 보완
  const adrData = (() => {
    let rev16 = 0, sold16 = 0;
    let rev35 = 0, sold35 = 0;
    let rev51 = 0, sold51 = 0;
    
    const sourceArray = (coreData.core?.roomSummaryByType && Array.isArray(coreData.core.roomSummaryByType) && coreData.core.roomSummaryByType.length > 0)
      ? coreData.core.roomSummaryByType
      : periodRoomSummary;
    
    if (Array.isArray(sourceArray) && sourceArray.length > 0) {
      sourceArray.forEach((item: any) => {
        if (item.isChannelSubtotal || item.isGrandTotal) return;
        const typeName = item.roomType || item.room_type || '';
        const revenue = Number(item.todayRevenue || item.revenue || item.netRevenue || item.roomRevenue || 0);
        const sold = Number(item.todayRooms || item.roomsSold || item.rooms_sold || 0);
        if (typeName.includes('16평')) {
          rev16 += revenue; sold16 += sold;
        } else if (typeName.includes('35평')) {
          rev35 += revenue; sold35 += sold;
        } else if (typeName.includes('51평') || typeName.includes('52평')) {
          rev51 += revenue; sold51 += sold;
        }
      });
    }
    
    return {
      adr16: sold16 > 0 ? Math.round(rev16 / sold16) : 0,
      adr35: sold35 > 0 ? Math.round(rev35 / sold35) : 0,
      adr51: sold51 > 0 ? Math.round(rev51 / sold51) : 0,
      raw: { rev16, sold16, rev35, sold35, rev51, sold51 }
    };
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
                {(weather || lastYearWeather) && (
                  <div className="self-start text-right text-sm bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center gap-3">
                    <div className="opacity-60 text-right pr-3 border-r border-slate-200">
                      <div className="text-[10px] font-medium text-slate-400 mb-0.5">{isRangeMode ? '전년 동기간' : '전년 동요일'}</div>
                      {lastYearWeather && (lastYearWeather.weatherDesc !== '데이터없음' && lastYearWeather.description !== '데이터없음') ? (
                        <>
                          <div className="font-semibold text-slate-500 text-sm flex items-center justify-end gap-1">
                            {(lastYearWeather.weatherDesc || lastYearWeather.description)?.includes('비') ? '🌧️' : (lastYearWeather.weatherDesc || lastYearWeather.description)?.includes('눈') ? '❄️' : (lastYearWeather.weatherDesc || lastYearWeather.description)?.includes('구름') ? '⛅' : '☀️'} 
                            {lastYearWeather.weatherDesc || lastYearWeather.description || '맑음'}
                          </div>
                          <div className="text-slate-400 text-[10px] mt-0.5">최고 {lastYearWeather.tempMax}℃ / 최저 {lastYearWeather.tempMin}℃</div>
                        </>
                      ) : (
                        <div className="font-semibold text-slate-500 text-sm flex items-center justify-end gap-1">❓ 날씨없음</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-medium text-brand-mint mb-0.5">{isRangeMode ? '선택 기간' : '현재 날씨'}</div>
                      {weather && (weather.weatherDesc !== '데이터없음' && weather.description !== '데이터없음') ? (
                        <>
                          <div className="font-medium text-brand-mint text-base flex items-center justify-end gap-1">
                            {(weather.weatherDesc || weather.description)?.includes('비') ? '🌧️' : (weather.weatherDesc || weather.description)?.includes('눈') ? '❄️' : (weather.weatherDesc || weather.description)?.includes('구름') ? '⛅' : '☀️'} 
                            {weather.weatherDesc || weather.description || '맑음'}
                          </div>
                          <div className="text-slate-500 text-xs mt-1">최고 {weather.tempMax}℃ / 최저 {weather.tempMin}℃</div>
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
              
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${todayPct >= 0 ? 'bg-brand-mint/10 text-brand-mint' : 'bg-red-50 text-red-500'}`}>
                <span>{isRangeMode ? '전년 동기간 대비' : '전년 동요일 대비'}</span>
                <span>{todayPct >= 0 ? '▲' : '▼'} {Math.abs(todayPct).toFixed(1)}%</span>
                <span className="font-medium opacity-80">({todayDiff > 0 ? '+' : ''}{formatCurrency(todayDiff)})</span>
              </div>
            </div>

            <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-brand-mint/5 shape-leaf transition-transform duration-500 group-hover:scale-150 group-hover:rotate-12" />
              <div className="min-h-[96px] mb-2 relative z-10 flex flex-col justify-start">
                <h2 className="text-base font-semibold text-slate-500 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-brand-mint group-hover:animate-pulse" /> 올해 누적 매출 (YTD) <span className="text-xs text-slate-400 font-normal">(부가세 별도)</span>
                </h2>
              </div>
              <div className="text-3xl font-semibold text-slate-800 mb-4 tracking-tight relative z-10">
                {formatCurrency(ytdGross)}
              </div>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold relative z-10 ${ytdPct >= 0 ? 'bg-brand-mint/10 text-brand-mint' : 'bg-red-50 text-red-500'}`}>
                <span>전년 동기 대비</span>
                <span>{ytdPct >= 0 ? '▲' : '▼'} {Math.abs(ytdPct).toFixed(1)}%</span>
                <span className="font-medium opacity-80">({ytdDiff > 0 ? '+' : ''}{formatCurrency(ytdDiff)})</span>
              </div>
            </div>

            <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300">
              <div className="absolute -right-5 -bottom-5 w-24 h-24 bg-brand-mint/5 rounded-full transition-transform duration-500 group-hover:scale-150" />
              <div className="min-h-[96px] mb-2 relative z-10 flex flex-col justify-start">
                <h2 className="text-base font-semibold text-slate-500 flex items-center gap-2">
                  <Users className="w-5 h-5 text-brand-mint group-hover:animate-pulse" /> 통합 방문객 수
                </h2>
              </div>
              <div className="text-3xl font-semibold text-slate-800 mb-4 tracking-tight relative z-10">
                {new Intl.NumberFormat('ko-KR').format(totalVisitors)}<span className="text-lg font-medium text-slate-500 ml-1">명</span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold relative z-10 bg-slate-50 text-slate-500 border border-slate-100">
                <span>{isRangeMode ? '선택 기간 누적 집계' : '리조트 당일 집계'}</span>
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
                  <div className="text-3xl font-extrabold text-teal-700 tracking-tight">
                    {displayData.kpiMetrics && isFinite(displayData.kpiMetrics.totalOcc) ? displayData.kpiMetrics.totalOcc.toFixed(1) : 0}%
                  </div>
                  <div className="text-[11px] text-slate-500 mt-2 font-medium">
                    {isRangeMode ? `기간 물리적 판매 객실 ÷ 기간 총 가용 객실수 (175실 × ${displayData.kpiMetrics?.days || 1}일)` : '물리적 판매 객실 ÷ 전체 객실 수 (175실)'}
                  </div>
                </div>
                
                <div className="bg-[#f8fafc] p-4 rounded-xl border border-slate-200 flex flex-col justify-center text-center h-[130px] shadow-sm hover:shadow-md transition-all bg-gradient-to-b from-white to-slate-50">
                  <div className="text-sm text-slate-700 font-medium mb-2">객단가 (ADR)</div>
                  <div className="grid grid-cols-3 gap-1 w-full text-teal-700">
                    <div className="flex flex-col items-center justify-end"><span className="text-[10px] text-slate-500 font-medium mb-0.5">16평</span><span className="text-[13px] xl:text-[15px] font-extrabold whitespace-nowrap">{formatCurrency(adrData.adr16)}</span></div>
                    <div className="flex flex-col items-center justify-end"><span className="text-[10px] text-slate-500 font-medium mb-0.5">35평</span><span className="text-[13px] xl:text-[15px] font-extrabold whitespace-nowrap">{formatCurrency(adrData.adr35)}</span></div>
                    <div className="flex flex-col items-center justify-end"><span className="text-[10px] text-slate-500 font-medium mb-0.5">52평</span><span className="text-[13px] xl:text-[15px] font-extrabold whitespace-nowrap">{formatCurrency(adrData.adr51)}</span></div>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-2 font-medium">
                    {isRangeMode ? '기간 매출액 ÷ 기간 결제건수' : '매출액 ÷ 순수 결제건수'}
                  </div>
                </div>
                
                <div className="bg-[#f8fafc] p-4 rounded-xl border border-slate-200 flex flex-col justify-center text-center h-[130px] shadow-sm hover:shadow-md transition-all bg-gradient-to-b from-white to-slate-50">
                  <div className="text-sm text-slate-700 font-medium mb-1">객실당 매출 (RevPAR)</div>
                  <div className="text-3xl font-extrabold text-teal-700 tracking-tight">
                    {displayData.kpiMetrics && isFinite(displayData.kpiMetrics.revPAR) ? formatCurrency(displayData.kpiMetrics.revPAR) : 0}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-2 font-medium">
                    {isRangeMode ? `기간 객실 총매출 ÷ 기간 총 가용 객실수 (175실 × ${displayData.kpiMetrics?.days || 1}일)` : '객실 총매출 ÷ 전체 객실 수 (175실)'}
                  </div>
                </div>
                
                <div className="bg-[#f8fafc] p-4 rounded-xl border border-slate-200 flex flex-col justify-center text-center h-[130px] shadow-sm hover:shadow-md transition-all bg-gradient-to-b from-white to-slate-50">
                  <div className="text-sm text-slate-700 font-medium mb-1">객실당 총매출 (TrevPAR)</div>
                  <div className="text-3xl font-extrabold text-teal-700 tracking-tight">
                    {displayData.kpiMetrics && isFinite(displayData.kpiMetrics.trevPAR) ? formatCurrency(displayData.kpiMetrics.trevPAR) : 0}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-2 font-medium">
                    {isRangeMode ? `기간 리조트 총매출(골프 포함) ÷ 기간 총 가용 객실수 (175실 × ${displayData.kpiMetrics?.days || 1}일)` : '리조트 총매출(골프 포함) ÷ 전체 객실 수 (175실)'}
                  </div>
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
                        <div className="text-xs text-slate-400 font-medium mb-1">입장 예정 (미도착)</div>
                        <div className="text-3xl font-semibold text-brand-mint">
                          {isRangeMode ? '0팀' : `${displayData.golfSummary ? (displayData.golfSummary.pendingTeams || 0) : 0}팀`}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-slate-400 mt-auto pt-3 border-t border-slate-100">
                    {isRangeMode ? '선택 기간 골프 총 예약 및 입장 실적 데이터' : '선택 기간 골프 실시간 예약 및 입장 데이터 (아직 도착하지 않은 잔여 예약 포함)'}
                  </div>
                </div>
              </div>
            </div>
          </div>

            {/* 본부별 매출 파이 차트 */}
            {pieChartData.length > 0 && (
              <div className="lg:col-span-12 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-medium text-slate-800 mb-6 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-brand-mint" />
                  그룹별 매출 비중
                </h3>
                <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                  <div className="w-full md:w-1/2 h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
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
                    </ResponsiveContainer>
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
                {/* ADR Breakdown */}
                <div className="bg-slate-50 p-4 rounded-xl">
                  <h4 className="font-semibold text-slate-700 mb-3 border-b pb-2">객단가 (ADR) 타입별 상세</h4>
                  <ul className="space-y-3 text-slate-600">
                    <li className="flex flex-col">
                      <span className="font-medium">16평: {formatCurrency(adrData.adr16)}원</span>
                      <span className="text-xs text-slate-400 font-mono mt-1">
                        = {formatCurrency(adrData.raw.rev16)}원 (매출액) ÷ {formatCurrency(adrData.raw.sold16)}건 (순수 결제건수)
                      </span>
                    </li>
                    <li className="flex flex-col">
                      <span className="font-medium">35평: {formatCurrency(adrData.adr35)}원</span>
                      <span className="text-xs text-slate-400 font-mono mt-1">
                        = {formatCurrency(adrData.raw.rev35)}원 (매출액) ÷ {formatCurrency(adrData.raw.sold35)}건 (순수 결제건수)
                      </span>
                    </li>
                    <li className="flex flex-col">
                      <span className="font-medium">51평: {formatCurrency(adrData.adr51)}원</span>
                      <span className="text-xs text-slate-400 font-mono mt-1">
                        = {formatCurrency(adrData.raw.rev51)}원 (매출액) ÷ {formatCurrency(adrData.raw.sold51)}건 (순수 결제건수)
                      </span>
                    </li>
                  </ul>
                </div>

                {/* RevPAR & TrevPAR */}
                <div className="bg-slate-50 p-4 rounded-xl flex flex-col justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-700 mb-3 border-b pb-2">수익성 지표 (RevPAR / TrevPAR)</h4>
                    <ul className="space-y-4 text-slate-600">
                      <li className="flex flex-col">
                        <span className="font-medium text-slate-800">객실당 매출 (RevPAR): {displayData.kpiMetrics ? formatCurrency(displayData.kpiMetrics.revPAR) : 0}원</span>
                        <div className="text-[11px] text-teal-700 bg-teal-50 p-2 rounded mt-1 border border-teal-100">
                          <strong>경영 의미:</strong> 빈 방을 포함한 모든 보유 객실이 평균적으로 벌어들인 순수 객실 매출입니다. <strong>객실 판매의 실질적인 효율성</strong>을 나타냅니다. (골프/식음/레저본부 미포함)
                        </div>
                        <span className="text-xs text-slate-400 font-mono mt-1.5">
                          = {displayData.kpiMetrics?.raw ? formatCurrency(displayData.kpiMetrics.raw.totalRoomRev) : 0}원 (객실 총매출) ÷ {displayData.kpiMetrics?.raw ? formatCurrency(displayData.kpiMetrics.raw.totalInventory) : 0}실 (운영 가능 객실수)
                        </span>
                      </li>
                      <li className="flex flex-col pt-2 border-t border-slate-200 border-dashed">
                        <span className="font-medium text-slate-800">객실당 총매출 (TrevPAR): {displayData.kpiMetrics ? formatCurrency(displayData.kpiMetrics.trevPAR) : 0}원</span>
                        <div className="text-[11px] text-teal-700 bg-teal-50 p-2 rounded mt-1 border border-teal-100">
                        </div>
                        <span className="text-xs text-slate-400 font-mono mt-1.5">
                          = {displayData.kpiMetrics?.raw ? formatCurrency(displayData.kpiMetrics.raw.totalResortRevGross) : 0}원 (리조트 총매출: 골프/객실/식음/티켓 포함) ÷ {displayData.kpiMetrics?.raw ? formatCurrency(displayData.kpiMetrics.raw.totalInventory) : 0}실 (운영 가능 객실수)
                        </span>
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
