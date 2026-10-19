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
    <div className="w-full min-h-screen bg-[#F4F3EE] text-[#1B382E] tracking-tight pb-16">
      {/* Decorative Ambient Header Background */}
      <div className="w-full bg-[#284F42] h-[190px] absolute top-0 left-0 z-0 overflow-hidden rounded-b-[36px] border-b border-[#1B382E] shadow-xl">
        <div className="absolute -top-16 -right-16 w-96 h-96 rounded-full bg-[#2F5548] opacity-70 pointer-events-none" />
        <div className="absolute top-8 left-1/3 w-80 h-80 rounded-full bg-[#2F5548] opacity-40 blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 right-1/4 w-60 h-60 rounded-full bg-[#1B382E] opacity-60 pointer-events-none" />
      </div>

      <div className="w-full max-w-[1920px] mx-auto p-4 md:p-8 relative z-10 pt-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div className="text-white">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1B382E]/80 border border-white/20 text-white/90 text-xs font-semibold backdrop-blur-xs shadow-xs mb-3">
              <span className="w-2 h-2 rounded-full bg-[#5FB878] animate-pulse" />
              <span>BELLEFORET RESORT · 부문·요일별 통합 정산 및 매출 분석</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight break-keep">부문·요일별 통합 정산 및 매출 분석</h1>
            <p className="text-sm text-white/80 mt-1 break-keep">
              부문별 조직 정산 및 요일별 매출 흐름 통합 대시보드
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {baseWeather && !isWeatherLoading && (
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-2xl border border-white/20 backdrop-blur-sm whitespace-nowrap text-white">
                <span className="text-xl" title={baseWeather.description}>{renderWeatherIcon(baseWeather.description)}</span>
                {baseWeather.tempMax !== undefined && (
                  <span className="text-sm font-medium text-white/90 whitespace-nowrap">
                    <span className="text-rose-300">{Math.round(baseWeather.tempMax)}°</span> / <span className="text-emerald-200">{Math.round(baseWeather.tempMin || 0)}°</span>
                  </span>
                )}
              </div>
            )}
            <GlobalDatePicker />
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl w-fit shadow-[0_4px_20px_rgba(40,79,66,0.06)] border border-[#D0C6BB]/75 mb-6">
          <button
            onClick={() => handleTabChange('matrix')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              activeTab === 'matrix'
                ? 'bg-[#284F42] text-white shadow-sm'
                : 'text-[#5A6B63] hover:text-[#1B382E] hover:bg-[#F4F3EE]'
            }`}
          >
            <Database size={16} />
            부문별 조직 정산 현황
          </button>
          <button
            onClick={() => handleTabChange('day-of-week')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              activeTab === 'day-of-week'
                ? 'bg-[#284F42] text-white shadow-sm'
                : 'text-[#5A6B63] hover:text-[#1B382E] hover:bg-[#F4F3EE]'
            }`}
          >
            <BarChart2 size={16} />
            요일별 매출 분석
          </button>
          <button
            onClick={() => handleTabChange('all')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-[#284F42] text-white shadow-sm'
                : 'text-[#5A6B63] hover:text-[#1B382E] hover:bg-[#F4F3EE]'
            }`}
          >
            <Layers size={16} />
            통합 전체 보기
          </button>
        </div>

        {/* Dynamic Content Views */}
        {activeTab === 'matrix' && (
          <div className="bg-white rounded-3xl shadow-[0_4px_24px_rgba(40,79,66,0.06)] border border-[#D0C6BB]/75 p-6 md:p-8">
            <V6DashboardViewer />
          </div>
        )}

        {activeTab === 'day-of-week' && (
          <div className="flex-grow">
            <DayOfWeekSales embedded={true} />
          </div>
        )}

        {activeTab === 'all' && (
          <div className="space-y-10 pb-12">
            {/* 1. 부문별 조직 정산 현황 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-1.5 h-6 bg-[#284F42] rounded-full" />
                  <h2 className="text-lg lg:text-xl font-bold text-[#1B382E]">1. 부문별 조직 정산 현황 (매트릭스)</h2>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]/70 rounded-full">
                    조직 정산 현황
                  </span>
                </div>
              </div>
              <div className="bg-white rounded-3xl shadow-[0_4px_24px_rgba(40,79,66,0.06)] border border-[#D0C6BB]/75 p-6 md:p-8">
                <V6DashboardViewer />
              </div>
            </div>

            {/* 2. 요일별 매출 분석 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-1.5 h-6 bg-[#284F42] rounded-full" />
                  <h2 className="text-lg lg:text-xl font-bold text-[#1B382E]">2. 요일별·부문별 매출 분석</h2>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]/70 rounded-full">
                    요일 추이 & 드릴다운
                  </span>
                </div>
              </div>
              <DayOfWeekSales embedded={true} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
