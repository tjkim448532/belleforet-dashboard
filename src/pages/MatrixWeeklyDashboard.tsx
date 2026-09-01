import { useState, useEffect } from 'react';
import { secureFetcher } from '../lib/secureFetcher';
import { fetchLiveWeatherFallback } from '../lib/weatherService';
import RevenueGrid from '../components/dashboard/RevenueGrid';
import { useDate } from '../contexts/DateContext';
import GlobalDatePicker from '../components/GlobalDatePicker';
import { AlertCircle } from 'lucide-react';

interface WeatherInfo {
  description?: string;
  tempMax?: number;
  tempMin?: number;
}

export default function MatrixWeeklyDashboard() {
  const [data, setData] = useState<any[]>([]);
  const [validationMaster, setValidationMaster] = useState<any>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters from context
  const { startDate } = useDate();

  // Weather States
  const [baseWeather, setBaseWeather] = useState<WeatherInfo | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchMatrixData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';
        const queryParams = `base_date=${startDate}`;

        const res = await secureFetcher(`${API_BASE}/api/v6/report/daily-sales?${queryParams}&_t=${Date.now()}`);
        if (!isMounted) return;

        const result = res;
        const payloadArray = result.flatSummary || result.data || result.gridData || (Array.isArray(result) ? result : []);
        
        const vm = result.validationMaster || {
          originalTotal: 0,
          payloadTotal: 0,
          variance: 0,
          isZeroVariance: true
        };
        
        setData(payloadArray);
        setValidationMaster(vm);
      } catch (err: any) {
        console.error('Failed to fetch V6 matrix overview', err);
        if (isMounted) {
          setError('데이터를 불러오는 중 문제가 발생했습니다.');
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
  }, [startDate]);

  useEffect(() => {
    let isMounted = true;
    const fetchWeather = async () => {
      setIsWeatherLoading(true);
      const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';
      try {
        const baseRes = await secureFetcher(`${API_BASE}/api/v5/dashboard/revenue-summary?date=${startDate}`);
        const basePayload = baseRes.data || baseRes;
        let bWeather = basePayload?.weather?.current || basePayload?.weather || null;

        if (!bWeather || bWeather.description === '데이터없음' || (!bWeather.tempMax && !bWeather.tempMin)) {
          const liveW = await fetchLiveWeatherFallback(startDate);
          if (liveW) bWeather = liveW;
        }

        if (!isMounted) return;
        setBaseWeather(bWeather ? {
          description: bWeather.description || bWeather.weatherDesc,
          tempMax: bWeather.tempMax || bWeather.maxTemp,
          tempMin: bWeather.tempMin || bWeather.minTemp,
        } : null);

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
  }, [startDate]);

  const renderWeatherIcon = (desc?: string) => {
    if (!desc) return '상태모름';
    if (desc.includes('비')) return '🌧️';
    if (desc.includes('눈')) return '❄️';
    if (desc.includes('구름') || desc.includes('흐림')) return '☁️';
    if (desc.includes('맑음')) return '☀️';
    return '⛅';
  };

  if (isLoading || !data) {
    return (
      <div className="w-full h-[80vh] flex items-center justify-center bg-[#f8fafc]">
        <div className="text-xl font-medium text-blue-600 animate-pulse">정산 현황 데이터를 불러오는 중입니다...</div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] text-slate-800 tracking-tight pb-16">
      
      {/* Decorative Header Background */}
      <div className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 h-[220px] absolute top-0 left-0 z-0 overflow-hidden rounded-b-[40px]">
        <div className="absolute top-10 right-[15%] w-36 h-36 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -top-12 left-[10%] w-44 h-44 bg-white/10 rounded-full blur-xl" />
      </div>

      <div className="w-full max-w-[1920px] mx-auto p-4 md:p-8 relative z-10 pt-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
          <div className="text-white">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-black text-3xl tracking-widest bg-white text-blue-600 px-3 py-1 rounded-sm shadow-md">
                BELLE FORET
              </span>
              <span className="font-black text-2xl tracking-wide ml-1">RESORT</span>
            </div>
            <h1 className="text-3xl font-medium tracking-tight mt-3">리조트 전사 부문별 통합 정산 현황</h1>
            <p className="text-white/80 mt-1">부문별 당일 실적, 전년동기 대비, 연월 누계 등을 통합 조회합니다. (순매출 · 부가세 별도)</p>
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
          <div className="bg-orange-500 text-white p-4 rounded-2xl mb-8 flex items-center gap-3 shadow-lg animate-pulse">
            <AlertCircle size={24} />
            <span className="font-medium text-lg">{error}</span>
          </div>
        )}

        {/* Data Grid */}
        <div className="flex-grow min-h-[calc(100vh-350px)] bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-6">
          <RevenueGrid data={data} validationMaster={validationMaster} />
        </div>
      </div>
    </div>
  );
}
