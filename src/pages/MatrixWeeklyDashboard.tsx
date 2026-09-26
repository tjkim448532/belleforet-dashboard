import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDate } from '../contexts/DateContext';
import GlobalDatePicker from '../components/GlobalDatePicker';
import V6DashboardViewer from '../components/dashboard/V6DashboardViewer';
import DayOfWeekSales from './DayOfWeekSales';
import { fetchLiveWeatherFallback } from '../lib/weatherService';
import { Database, BarChart2, Layers } from 'lucide-react';

interface WeatherInfo {
  description?: string;
  tempMax?: number;
  tempMin?: number;
}

export type MatrixTabType = 'matrix' | 'day-of-week' | 'all';

interface MatrixWeeklyDashboardProps {
  defaultTab?: MatrixTabType;
}

export default function MatrixWeeklyDashboard({ defaultTab = 'matrix' }: MatrixWeeklyDashboardProps) {
  const { startDate, isRange } = useDate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL query param (?tab=matrix | day-of-week | all) 우선 동기화
  const tabFromUrl = searchParams.get('tab') as MatrixTabType | null;
  const initialTab: MatrixTabType = (tabFromUrl && ['matrix', 'day-of-week', 'all'].includes(tabFromUrl))
    ? tabFromUrl
    : defaultTab;

  const [activeTab, setActiveTab] = useState<MatrixTabType>(initialTab);

  const handleTabChange = (tab: MatrixTabType) => {
    setActiveTab(tab);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    }, { replace: true });
  };

  // Weather States (공공 API Fallback만 사용)
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
      <div className="w-full bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-800 h-[240px] absolute top-0 left-0 z-0 overflow-hidden rounded-b-[40px]">
        <div className="absolute top-10 right-[15%] w-36 h-36 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -top-12 left-[10%] w-44 h-44 bg-white/10 rounded-full blur-xl" />
      </div>

      <div className="w-full max-w-[1920px] mx-auto p-4 md:p-8 relative z-10 pt-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6">
          <div className="text-white">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-black text-3xl tracking-widest bg-white text-blue-700 px-3 py-1 rounded-sm shadow-md">
                BELLE FORET
              </span>
              <span className="font-black text-2xl tracking-wide ml-1">RESORT</span>
            </div>
            <h1 className="text-3xl font-medium tracking-tight mt-3 break-keep whitespace-nowrap">부문·요일별 통합 정산 및 매출 분석</h1>
            <p className="text-white/80 mt-1 break-keep">
              V6 Zero-Variance 무결성 아키텍처 연동 · 부문별 조직 정산 & 요일별 매출 통합 분석 <span>(Pure Consumer Mode)</span>
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {baseWeather && !isWeatherLoading && (
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl border border-white/20 backdrop-blur-sm whitespace-nowrap">
                <span className="text-xl" title={baseWeather.description}>{renderWeatherIcon(baseWeather.description)}</span>
                {baseWeather.tempMax !== undefined && (
                  <span className="text-sm font-medium text-white/90 whitespace-nowrap">
                    <span className="text-rose-300">{Math.round(baseWeather.tempMax)}°</span> / <span className="text-blue-300">{Math.round(baseWeather.tempMin || 0)}°</span>
                  </span>
                )}
              </div>
            )}
            <GlobalDatePicker />
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md p-1.5 rounded-2xl w-fit shadow-md border border-white/40 mb-6">
          <button
            onClick={() => handleTabChange('matrix')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'matrix'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Database size={16} />
            부문별 조직 정산 현황
          </button>
          <button
            onClick={() => handleTabChange('day-of-week')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'day-of-week'
                ? 'bg-brand-mint text-white shadow-md shadow-teal-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart2 size={16} />
            요일별 매출 분석
          </button>
          <button
            onClick={() => handleTabChange('all')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'all'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers size={16} />
            통합 전체 보기
          </button>
        </div>

        {/* Dynamic Content Views */}
        {activeTab === 'matrix' && (
          <div className="flex-grow min-h-[calc(100vh-350px)] bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-6">
            <V6DashboardViewer />
          </div>
        )}

        {activeTab === 'day-of-week' && (
          <div className="flex-grow">
            <DayOfWeekSales embedded={true} />
          </div>
        )}

        {activeTab === 'all' && (
          <div className="space-y-12">
            {/* 1. 부문별 조직 정산 현황 */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-7 bg-blue-600 rounded-full" />
                <h2 className="text-2xl font-bold text-slate-800">1. 부문별 조직 정산 현황 (매트릭스)</h2>
                <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full">
                  조직도 매트릭스
                </span>
              </div>
              <div className="bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-6">
                <V6DashboardViewer />
              </div>
            </div>

            {/* 2. 요일별 매출 분석 */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-7 bg-teal-600 rounded-full" />
                <h2 className="text-2xl font-bold text-slate-800">2. 요일별·부문별 매출 분석</h2>
                <span className="text-xs font-semibold px-2.5 py-1 bg-teal-50 text-brand-mint border border-teal-100 rounded-full">
                  요일 추이 & 드릴다운
                </span>
              </div>
              <DayOfWeekSales embedded={true} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
