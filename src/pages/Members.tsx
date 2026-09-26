import { useState, useEffect } from 'react';
import { useDate } from '../contexts/DateContext';
import { secureFetcher } from '../lib/secureFetcher';
import type { DailyMemberVisitorsV2Response } from '../types/reports-v2';
import ReactECharts from 'echarts-for-react';
import GlobalDatePicker from '../components/GlobalDatePicker';
import { 
  Users, Calendar, RefreshCw, DollarSign, Building, Store
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

export default function Members() {
  const { startDate, endDate, isRange } = useDate();
  const isEffectiveRange = isRange || (!!endDate && startDate !== endDate);

  const [data, setData] = useState<DailyMemberVisitorsV2Response | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchMemberVisitors = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const queryParams = isEffectiveRange
        ? `startDate=${startDate}&endDate=${endDate}`
        : `startDate=${startDate}&endDate=${startDate}`;

      const res = await secureFetcher(`${API_BASE}/api/v6/report/daily-member-visitors-v2?${queryParams}`);
      const payload = res?.data ?? res;

      if (payload && payload.success) {
        setData(payload);
      } else {
        setData(null);
      }
    } catch (err: any) {
      console.error('Member Visitors V2 Fetch Error:', err);
      setApiError(err.message || '데이터를 불러오는 중 문제가 발생했습니다.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemberVisitors();
  }, [startDate, endDate]);

  const summary = data?.meta?.summary;
  const venueVisitors = (data as any)?.venueVisitors || (data as any)?.venues || [];
  const dailyVisitors = (data as any)?.dailyVisitors || (data as any)?.dailyTrends || [];

  const getTrendChartOptions = () => {
    const dates = dailyVisitors.map((d: any) => d.sales_date || d.date || d.date_id);
    const visitors = dailyVisitors.map((d: any) => Number(d.daily_visitors ?? d.dailyVisitors ?? 0));
    const revenue = dailyVisitors.map((d: any) => Number(d.daily_revenue ?? d.dailyRevenue ?? 0));

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      legend: {
        data: ['일일 진성 방문객', '일일 매출'],
        bottom: 0
      },
      grid: { left: '3%', right: '3%', top: '10%', bottom: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { color: '#64748b' }
      },
      yAxis: [
        {
          type: 'value',
          name: '방문객 수',
          position: 'left',
          axisLabel: { formatter: '{value} 명' }
        },
        {
          type: 'value',
          name: '매출',
          position: 'right',
          axisLabel: { formatter: '{value} 원' }
        }
      ],
      series: [
        {
          name: '일일 매출',
          type: 'bar',
          yAxisIndex: 1,
          data: revenue,
          itemStyle: { color: '#3b82f6', opacity: 0.8 }
        },
        {
          name: '일일 진성 방문객',
          type: 'line',
          yAxisIndex: 0,
          data: visitors,
          smooth: true,
          symbolSize: 8,
          itemStyle: { color: '#10b981' },
          lineStyle: { width: 3 }
        }
      ]
    };
  };

  return (
    <div className="p-6 lg:p-10 max-w-[1600px] mx-auto min-h-screen bg-slate-50/50">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-emerald-800 via-[#00ae95] to-slate-900 rounded-[32px] p-8 text-white mb-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/20 tracking-wide uppercase whitespace-nowrap">
                VISITORS INTELLIGENCE
              </span>
              <span className="bg-white/20 text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/20 font-medium whitespace-nowrap">
                <Calendar size={12} className="text-white shrink-0" />
                조회일: <strong className="ml-1">{startDate} {isEffectiveRange && endDate ? `~ ${endDate}` : ''}</strong>
              </span>
            </div>
            
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mt-1 flex items-center gap-3 break-keep">
              <Users className="text-white shrink-0" size={32} />
              <span className="break-keep">
                일일 진성 방문객 분석
              </span>
            </h1>
            <p className="text-sm text-white/80 mt-2 font-normal max-w-3xl break-keep">
              선택된 기간 동안의 업장별 총 방문객 및 기여액을 분석하여 일원화된 공식 고객 데이터를 제공합니다.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 self-start 2xl:self-center">
            <GlobalDatePicker showPresets={true} />
            <button
              onClick={fetchMemberVisitors}
              disabled={loading}
              className="px-4 py-2.5 bg-brand-mint hover:bg-emerald-400 active:bg-emerald-600 active:scale-90 text-white rounded-xl text-xs font-bold transition-all duration-150 shadow-md flex items-center justify-center gap-2 cursor-pointer select-none whitespace-nowrap shrink-0"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              새로고침
            </button>
          </div>
        </div>
      </div>

      {/* KPI Overview Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5 whitespace-nowrap">
              <Users size={16} className="text-emerald-600 shrink-0" /> 총 진성 방문객
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 my-1 whitespace-nowrap">
            {loading ? (
              <div className="animate-pulse h-9 w-24 bg-slate-200 rounded-lg inline-block align-middle"></div>
            ) : apiError ? (
              <span className="text-xl text-red-500 font-bold">오류</span>
            ) : (
              <>{summary?.totalVisitorsFormatted || '0'} <span className="text-sm font-medium text-slate-400">명</span></>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            객실: {summary?.roomGuestsFormatted || '0'}명 | 골프: {summary?.golfPlayersFormatted || '0'}명
          </p>
        </div>

        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5 whitespace-nowrap">
              <DollarSign size={16} className="text-indigo-600 shrink-0" /> 리조트 총 발생 매출
            </span>
          </div>
          <div className="text-3xl font-black text-indigo-600 my-1 whitespace-nowrap">
            {loading ? (
              <div className="animate-pulse h-9 w-32 bg-indigo-100 rounded-lg inline-block align-middle"></div>
            ) : apiError ? (
              <span className="text-xl text-red-500 font-bold">-</span>
            ) : (
              <>₩{summary?.totalResortSalesFormatted || '0'}</>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-2 truncate">
            방문객 1인당 소비: <strong>₩{summary?.spendPerVisitorFormatted || '0'}원</strong>
          </p>
        </div>

        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-purple-600 flex items-center gap-1.5 whitespace-nowrap">
              <Store size={16} className="text-purple-600 shrink-0" /> 부대/레저 방문객
            </span>
          </div>
          <div className="text-2xl font-black text-purple-800 my-1 truncate whitespace-nowrap">
            {loading ? (
              <div className="animate-pulse h-8 w-40 bg-purple-100 rounded-lg inline-block align-middle"></div>
            ) : apiError ? (
              <span className="text-xl text-red-500 font-bold">-</span>
            ) : (
              <>{summary?.leisureVisitorsFormatted || '0'} <span className="text-sm font-medium text-slate-400">명</span></>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-2 truncate">
            순수 레저 및 식음 시설 이용객
          </p>
        </div>

      </div>

      {/* Daily Trends Chart Section */}
      <div className="bg-white rounded-[32px] p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" /> 일자별 방문객 및 매출 추이
          </h2>
        </div>
        <div className="h-[350px] w-full">
          {!loading && !apiError && dailyVisitors.length > 0 ? (
            <ReactECharts option={getTrendChartOptions()} style={{ height: '100%', width: '100%' }} />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">
              데이터가 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* Venue Visitors Table */}
      <div className="bg-white rounded-[32px] p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Building className="w-5 h-5 text-emerald-500" /> 업장별 방문객 집계 실적 (SSOT)
          </h2>
          <span className="text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-full border border-slate-200">
            총 {venueVisitors.length}개 업장
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm whitespace-nowrap min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3.5 px-6 rounded-l-xl whitespace-nowrap">분류 코드</th>
                <th className="py-3.5 px-4 whitespace-nowrap">업장 명칭</th>
                <th className="py-3.5 px-4 whitespace-nowrap">티켓 그룹</th>
                <th className="py-3.5 px-6 text-right whitespace-nowrap">순 방문객 수</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">방문객 점유율 (%)</th>
                <th className="py-3.5 px-6 text-right rounded-r-xl whitespace-nowrap">발생 매출액 (원)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {venueVisitors.length > 0 ? (
                venueVisitors.map((venue: any, idx: number) => (
                  <tr key={idx} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="py-4 px-6 font-medium text-slate-500 whitespace-nowrap">
                      {venue.category_code || (venue as any).categoryCode}
                    </td>
                    <td className="py-4 px-4 font-extrabold text-slate-900 whitespace-nowrap">
                      {venue.venue_name || (venue as any).venueName}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
                        {venue.ticket_group || (venue as any).ticketGroup || '-'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right font-black text-emerald-700 whitespace-nowrap">
                      {(venue.visitor_count_formatted || (venue as any).visitorCountFormatted || Number(venue.visitor_count || 0).toLocaleString())} 명
                    </td>
                    <td className="py-4 px-4 text-right font-medium text-slate-500 whitespace-nowrap">
                      {Number(venue.visitor_share_pct ?? (venue as any).visitorSharePct ?? 0).toFixed(2)}%
                    </td>
                    <td className="py-4 px-6 text-right font-bold text-slate-800 whitespace-nowrap">
                      ₩{(venue.revenue_formatted || (venue as any).revenueFormatted || Number(venue.revenue || 0).toLocaleString())}
                    </td>
                  </tr>
                ))
              ) : loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <RefreshCw size={32} className="animate-spin text-emerald-500" />
                      <p className="text-sm font-bold text-slate-600">데이터를 불러오는 중입니다...</p>
                    </div>
                  </td>
                </tr>
              ) : apiError ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-red-500">
                    <p className="text-sm font-bold">{apiError}</p>
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
