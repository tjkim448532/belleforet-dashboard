import { useState, useEffect } from 'react';
import { Calendar, Layers } from 'lucide-react';
import { secureFetcher } from '../lib/secureFetcher';
import { fetchLiveWeatherFallback } from '../lib/weatherService';
import RevenueGrid from '../components/dashboard/RevenueGrid';

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

  // Filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  });

    
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
        // Base API endpoint for the nested 8-level tree payload
        const queryParams = `base_date=${startDate}`;

        const res = await secureFetcher(`${API_BASE}/api/v6/report/daily-sales?${queryParams}&_t=${Date.now()}`);
        if (!isMounted) return;

        const result = res.data || res;
        const payloadArray = result.data || result.gridData || (Array.isArray(result) ? result : []);
        
        // Zero-Variance validation payload (if present)
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
    if (!desc) return '☁️';
    if (desc.includes('비')) return '🌧️';
    if (desc.includes('눈')) return '❄️';
    if (desc.includes('구름') || desc.includes('흐림')) return '⛅';
    if (desc.includes('맑음')) return '☀️';
    return '⛅';
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto h-[calc(100vh-64px)] flex flex-col">
      <div className="flex justify-between items-end mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Layers className="text-blue-600" />
            리조트 전사 부문별 실시간 통합 정산 현황
          </h1>
          <p className="text-sm text-slate-500 mt-1">순매출 · 부가세 별도 · 포맷팅 `#,##0`</p>
        </div>

        <div className="flex flex-col items-end gap-3">
          <div className="flex gap-4 items-center">
            {/* Base Date Picker */}
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
              <Calendar size={18} className="text-slate-400" />
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-sm font-semibold text-slate-700 outline-none"
              />
              {baseWeather && !isWeatherLoading && (
                <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-200">
                  <span className="text-lg" title={baseWeather.description}>{renderWeatherIcon(baseWeather.description)}</span>
                  {baseWeather.tempMax !== undefined && (
                    <span className="text-xs font-medium text-slate-500">
                      <span className="text-rose-500">{Math.round(baseWeather.tempMax)}°</span> / <span className="text-blue-500">{Math.round(baseWeather.tempMin || 0)}°</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-grow min-h-0 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 font-medium">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            데이터를 불러오는 중입니다...
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center text-red-500 font-medium bg-red-50">
            {error}
          </div>
        ) : (
          <RevenueGrid data={data} validationMaster={validationMaster} />
        )}
      </div>
    </div>
  );
}
