import React from 'react';
import { CalendarDays, Building2, Coins, AlertCircle } from 'lucide-react';
import GlobalDatePicker from '../components/GlobalDatePicker';
import { useDate } from '../contexts/DateContext';
import { useCoreData } from '../contexts/CoreDataContext';
import { transformHomeData } from '../lib/dataTransformers';

export default function Home() {
  const { startDate, endDate } = useDate();
  const coreData = useCoreData();
  const transformedData = React.useMemo(() => {
    if (coreData.isLoading || coreData.error) return null;
    return transformHomeData(coreData);
  }, [coreData]);

  const data = transformedData;
  const loading = coreData.isLoading;
  const apiError = coreData.error ? '데이터를 불러오는 데 실패했습니다. 서버 연결 상태를 확인해주세요.' : 
                  (coreData.isLoading ? null : (transformedData ? null : '데이터를 불러오는 데 실패했습니다.'));

  const weather = coreData.core?.weather?.current || null;
  const lastYearWeather = coreData.core?.weather?.lastYear || null;

  const displayData: any = data;

  const formatCurrency = (val: number) => {
    const rounded = Math.round(val || 0);
    return new Intl.NumberFormat('ko-KR').format(rounded) + '원';
  };


  if (apiError && !loading) {
    return (
      <div className="w-full h-[80vh] flex items-center justify-center bg-[#f8fafc]">
        <div className="text-xl font-bold text-red-500">{apiError}</div>
      </div>
    );
  }

  if (loading || !displayData) {
    return (
      <div className="w-full h-[80vh] flex items-center justify-center bg-[#f8fafc]">
        <div className="text-xl font-bold text-brand-mint animate-pulse">벨포레 현황판을 불러오는 중입니다...</div>
      </div>
    );
  }

  const todayGross = displayData.today.gross;
  const todayLyGross = displayData.today.ly_gross;
  const todayDiff = todayGross - todayLyGross;
  const todayPct = todayLyGross > 0 ? (todayDiff / todayLyGross) * 100 : 0;
  
  const ytdGross = displayData.ytd.gross;
  const ytdLyGross = displayData.ytd.ly_gross;
  const ytdDiff = ytdGross - ytdLyGross;
  const ytdPct = ytdLyGross > 0 ? (ytdDiff / ytdLyGross) * 100 : 0;

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] text-slate-800 tracking-tight pb-16">
      
      <div className="w-full bg-brand-mint h-[220px] absolute top-0 left-0 z-0 overflow-hidden rounded-b-[40px]">
        <div className="absolute top-10 right-[10%] w-32 h-32 bg-white/20 shape-half-circle" />
        <div className="absolute -top-10 right-[20%] w-48 h-48 bg-white/10 shape-leaf" />
        <div className="absolute top-20 left-[5%] w-16 h-16 bg-white/20 rounded-full" />
      </div>

      <div className="w-full max-w-[1400px] mx-auto p-4 md:p-8 relative z-10 pt-10">
        

        {apiError && (
          <div className="bg-orange-500 text-white p-4 rounded-2xl mb-8 flex items-center gap-3 shadow-lg animate-pulse">
            <AlertCircle size={24} />
            <span className="font-bold text-lg">{apiError}</span>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
          <div className="text-white">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-emphatic text-3xl tracking-widest bg-white text-brand-mint px-3 py-1 rounded-sm shadow-md">
                BELLE FORET
              </span>
              <span className="font-emphatic text-2xl tracking-wide ml-1">RESORT</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight mt-3">Welcome ALL BELLER! 👋</h1>
            <p className="text-white/80 mt-1">오늘도 화기애애한 벨포레 리조트 통합 경영 현황입니다.</p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <GlobalDatePicker allowRange={true} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-12">
          <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300">
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-brand-mint/5 rounded-full transition-transform duration-500 group-hover:scale-[1.8]" />
              <div className="flex justify-between items-start mb-6 relative z-10">
                <h2 className="text-base font-bold text-slate-500 flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-brand-mint group-hover:animate-bounce" /> 
                  선택 기간 순매출 ({startDate === endDate ? startDate : `${startDate} ~ ${endDate}`}) 
                  <span className="text-xs text-slate-400 font-normal hidden sm:inline">(Net 기준)</span>
                </h2>
                {startDate === endDate && (weather || lastYearWeather) && (
                  <div className="text-right text-sm bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center gap-3">
                    {lastYearWeather && (
                      <div className="opacity-60 text-right pr-3 border-r border-slate-200">
                        <div className="text-[10px] font-medium text-slate-400 mb-0.5">전년 동요일</div>
                        <div className="font-semibold text-slate-500 text-sm flex items-center justify-end gap-1">
                          {lastYearWeather.weatherDesc?.includes('비') ? '🌧️' : lastYearWeather.weatherDesc?.includes('눈') ? '❄️' : lastYearWeather.weatherDesc?.includes('구름') ? '⛅' : '☀️'} 
                          {lastYearWeather.weatherDesc || '맑음'}
                        </div>
                        <div className="text-slate-400 text-[10px] mt-0.5">최고 {lastYearWeather.tempMax}℃ / 최저 {lastYearWeather.tempMin}℃</div>
                      </div>
                    )}
                    {weather && (
                      <div className="text-right">
                        <div className="text-[10px] font-bold text-brand-mint mb-0.5">현재 날씨</div>
                        <div className="font-bold text-brand-mint text-base flex items-center justify-end gap-1">
                          {weather.weatherDesc?.includes('비') ? '🌧️' : weather.weatherDesc?.includes('눈') ? '❄️' : weather.weatherDesc?.includes('구름') ? '⛅' : '☀️'} 
                          {weather.weatherDesc || '맑음'}
                        </div>
                        <div className="text-slate-500 text-xs mt-1">최고 {weather.tempMax}℃ / 최저 {weather.tempMin}℃</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="text-5xl lg:text-6xl font-emphatic text-slate-800 mb-4 tracking-tight transition-all duration-300">
                {formatCurrency(todayGross)}
              </div>
              
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${todayPct >= 0 ? 'bg-brand-mint/10 text-brand-mint' : 'bg-red-50 text-red-500'}`}>
                <span>전년 동요일 대비</span>
                <span>{todayPct >= 0 ? '▲' : '▼'} {Math.abs(todayPct).toFixed(1)}%</span>
                <span className="font-medium opacity-80">({todayDiff > 0 ? '+' : ''}{formatCurrency(todayDiff)})</span>
              </div>
            </div>

            <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-brand-mint/5 shape-leaf transition-transform duration-500 group-hover:scale-150 group-hover:rotate-12" />
              <h2 className="text-base font-bold text-slate-500 mb-6 flex items-center gap-2 relative z-10">
                <Building2 className="w-5 h-5 text-brand-mint group-hover:animate-pulse" /> 올해 누적 매출 (YTD) <span className="text-xs text-slate-400 font-normal">(부가세 포함)</span>
              </h2>
              <div className="text-5xl lg:text-6xl font-emphatic text-slate-800 mb-4 tracking-tight relative z-10">
                {formatCurrency(ytdGross)}
              </div>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold relative z-10 ${ytdPct >= 0 ? 'bg-brand-mint/10 text-brand-mint' : 'bg-red-50 text-red-500'}`}>
                <span>전년 동기 대비</span>
                <span>{ytdPct >= 0 ? '▲' : '▼'} {Math.abs(ytdPct).toFixed(1)}%</span>
                <span className="font-medium opacity-80">({ytdDiff > 0 ? '+' : ''}{formatCurrency(ytdDiff)})</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-12 flex flex-col gap-6">
            <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_15px_30px_rgb(0,0,0,0.06)] transition-all duration-300 group">
              <h2 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Coins className="w-5 h-5 text-brand-mint group-hover:rotate-12" /> 주요 지표 및 운영 현황
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#f8fafc] p-6 rounded-2xl border border-slate-100 flex flex-col justify-between hover:bg-white hover:shadow-md transition-all duration-300 cursor-default">
                  <div className="text-slate-500 font-bold mb-2">골프 1인당 평균 그린피</div>
                  <div className="text-4xl font-emphatic text-brand-mint mb-2">{formatCurrency(displayData.golfSummary?.avgGreenFee || 0)}</div>
                  <div className="text-sm text-slate-400">선택 기간 그린피 매출 ÷ 입장객 수</div>
                </div>
                <div className="bg-[#f8fafc] p-6 rounded-2xl border border-slate-100 flex flex-col justify-between hover:bg-white hover:shadow-md transition-all duration-300 cursor-default">
                  <div>
                    <div className="text-slate-500 font-bold mb-4">골프 예약 및 입장 현황</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-slate-400 font-medium mb-1">예약 팀수</div>
                        <div className="text-3xl font-emphatic text-brand-mint">
                          {displayData.golfSummary ? `${displayData.golfSummary.reservedTeams}팀` : '0팀'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 font-medium mb-1">실제 입장 팀수</div>
                        <div className="text-3xl font-emphatic text-brand-mint">
                          {displayData.golfSummary ? `${displayData.golfSummary.visitedTeams}팀` : '0팀'}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-slate-400 mt-4">
                    선택 기간 골프-예약 및 골프-입장객 데이터 집계
                  </div>
                </div>
              </div>
            </div>


          </div>
        </div>
      </div>
    </div>
  );
}
