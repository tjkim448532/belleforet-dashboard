import { useEffect, useState } from 'react';
import { useDate } from '../contexts/DateContext';
import GlobalDatePicker from '../components/GlobalDatePicker';
import { AlertCircle } from 'lucide-react';
import { DashboardTable } from '../components/dashboard/DashboardTable';
import { useRevenueData } from '../hooks/useRevenueData';
import { fetchLiveWeatherFallback } from '../lib/weatherService';

interface WeatherInfo {
  description?: string;
  tempMax?: number;
  tempMin?: number;
}

export default function MatrixWeeklyDashboard() {
  const { startDate, endDate, isRange } = useDate();
  
  // V6 API 단일 호출 (다중 월, 단일 일자 모두 완벽 지원)
  // endDate가 없을 경우 startDate를 그대로 사용하여 1일치(Daily) 조회
  const targetEndDate = isRange && endDate ? endDate : startDate;
  const { data, loading, error } = useRevenueData(startDate, targetEndDate);

  // Weather States (V5 호출 완전 제거, 공공 API Fallback만 사용)
  const [baseWeather, setBaseWeather] = useState<WeatherInfo | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchWeather = async () => {
      // 기간 조회일 경우 날씨 표출 생략
      if (isRange) {
        setBaseWeather(null);
        return;
      }
      
      setIsWeatherLoading(true);
      try {
        const liveW = await fetchLiveWeatherFallback(startDate);
        if (!isMounted) return;
        
        if (liveW) {
          setBaseWeather({
            description: liveW.description,
            tempMax: liveW.tempMax,
            tempMin: liveW.tempMin,
          });
        } else {
          setBaseWeather(null);
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
  }, [startDate, isRange]);

  const renderWeatherIcon = (desc?: string) => {
    if (!desc) return '상태모름';
    if (desc.includes('비')) return '🌧️';
    if (desc.includes('눈')) return '❄️';
    if (desc.includes('구름') || desc.includes('흐림')) return '☁️';
    if (desc.includes('맑음')) return '☀️';
    return '🌤️';
  };

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] text-slate-800 tracking-tight pb-16">
      {/* Decorative Header Background */}
      <div className="w-full bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-800 h-[220px] absolute top-0 left-0 z-0 overflow-hidden rounded-b-[40px]">
        <div className="absolute top-10 right-[15%] w-36 h-36 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -top-12 left-[10%] w-44 h-44 bg-white/10 rounded-full blur-xl" />
      </div>

      <div className="w-full max-w-[1920px] mx-auto p-4 md:p-8 relative z-10 pt-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
          <div className="text-white">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-black text-3xl tracking-widest bg-white text-blue-700 px-3 py-1 rounded-sm shadow-md">
                BELLE FORET
              </span>
              <span className="font-black text-2xl tracking-wide ml-1">RESORT</span>
            </div>
            <h1 className="text-3xl font-medium tracking-tight mt-3">경영 조직도 통합 정산 센터</h1>
            <p className="text-white/80 mt-1">
              V6 Zero-Variance 무결성 아키텍처 연동 <span>(Pure Consumer Mode)</span>
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {baseWeather && !isWeatherLoading && (
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl border border-white/20 backdrop-blur-sm">
                <span className="text-xl" title={baseWeather.description}>{renderWeatherIcon(baseWeather.description)}</span>
                {baseWeather.tempMax !== undefined && (
                  <span className="text-sm font-medium text-white/90">
                    <span className="text-rose-300">{Math.round(baseWeather.tempMax)}°</span> / <span className="text-blue-300">{Math.round(baseWeather.tempMin || 0)}°</span>
                  </span>
                )}
              </div>
            )}
            <GlobalDatePicker />
          </div>
        </div>

        {error && (
          <div className="bg-red-500 text-white p-4 rounded-2xl mb-8 flex items-center gap-3 shadow-lg">
            <AlertCircle size={24} />
            <span className="font-medium text-lg">데이터 무결성 검증 실패: {error.message || '백엔드 서버 통신 에러'}</span>
          </div>
        )}

        {/* Data Grid */}
        <div className="flex-grow min-h-[calc(100vh-350px)] bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-6">
          {loading ? (
            <div className="w-full h-[60vh] flex items-center justify-center">
              <div className="text-xl font-medium text-blue-600 animate-pulse">V6 0-Variance 백엔드 실적 데이터를 동기화 중입니다...</div>
            </div>
          ) : (
            <DashboardTable data={data} />
          )}
        </div>
      </div>
    </div>
  );
}
