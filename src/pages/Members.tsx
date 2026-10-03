import { useState, useEffect } from 'react';
import { useDate } from '../contexts/DateContext';
import { secureFetcher } from '../lib/secureFetcher';
import type { DailyMemberVisitorsV2Response } from '../types/reports-v2';
import ReactECharts from 'echarts-for-react';
import GlobalDatePicker from '../components/GlobalDatePicker';
import { 
  Users, Calendar, RefreshCw, DollarSign, Building, Hotel, Info, HelpCircle
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

export default function Members() {
  const { startDate, endDate, isRange } = useDate();
  const isEffectiveRange = Boolean(isRange && endDate && startDate !== endDate);
  const effectiveEnd = isEffectiveRange && endDate ? endDate : startDate;

  const [data, setData] = useState<DailyMemberVisitorsV2Response | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchMemberVisitors = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const queryParams = isEffectiveRange
        ? `startDate=${startDate}&endDate=${effectiveEnd}`
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
  }, [startDate, endDate, isRange]);

  const summary = data?.meta?.summary;
  const venueVisitors = (data as any)?.venueVisitors || (data as any)?.venues || [];
  const dailyVisitors = (data as any)?.dailyVisitors || (data as any)?.dailyTrends || [];

  const getTrendChartOptions = () => {
    const dates = dailyVisitors.map((d: any) => d.sales_date || d.date || d.date_id);
    const roomGuests = dailyVisitors.map((d: any) => Number(d.daily_room_guests ?? d.dailyRoomGuests ?? 0));
    const golfPlayers = dailyVisitors.map((d: any) => Number(d.daily_golf_players ?? d.dailyGolfPlayers ?? 0));
    const revenue = dailyVisitors.map((d: any) => Number(d.daily_revenue ?? d.dailyRevenue ?? 0));

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      legend: {
        data: ['일일 숙박객', '일일 골프 내장객', '일일 매출'],
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
          name: '인원수',
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
          name: '일일 숙박객',
          type: 'line',
          yAxisIndex: 0,
          data: roomGuests,
          smooth: true,
          symbolSize: 8,
          itemStyle: { color: '#10b981' },
          lineStyle: { width: 3 }
        },
        {
          name: '일일 골프 내장객',
          type: 'line',
          yAxisIndex: 0,
          data: golfPlayers,
          smooth: true,
          symbolSize: 6,
          itemStyle: { color: '#6366f1' },
          lineStyle: { width: 2, type: 'dashed' }
        }
      ]
    };
  };

  return (
    <div className="p-6 lg:p-10 max-w-[1600px] mx-auto min-h-screen bg-slate-50/50">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-emerald-800 via-[#00ae95] to-slate-900 rounded-[32px] p-8 text-white mb-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/20 tracking-wide uppercase whitespace-nowrap">
                ROOM GUEST & SALES INTELLIGENCE
              </span>
              <span className="bg-white/20 text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/20 font-medium whitespace-nowrap">
                <Calendar size={12} className="text-white shrink-0" />
                조회일: <strong className="ml-1">{startDate} {isEffectiveRange && endDate ? `~ ${endDate}` : ''}</strong>
              </span>
            </div>
            
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mt-1 flex items-center gap-3 break-keep">
              <Hotel className="text-white shrink-0" size={32} />
              <span className="break-keep">
                일일 숙박객 및 매출 분석
              </span>
            </h1>
            <p className="text-sm text-white/80 mt-2 font-normal max-w-3xl break-keep">
              관리자 공식 기준 정원에 기반한 총 숙박객 수와 업장별 매출 실적을 분석하여 일원화된 공식 고객 데이터를 제공합니다.
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

      {/* 숙박객 계산 기준 안내 배너 (집계 무결성 공지) */}
      <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-4 mb-6 flex items-start gap-3 shadow-sm">
        <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-950 space-y-1">
          <div className="font-bold text-emerald-900 flex items-center gap-2">
            <span>숙박객(Room Guests) 산출 기준 및 집계 무결성 원칙</span>
            <span className="text-[10px] bg-emerald-200/70 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">SSOT 공식 기준</span>
          </div>
          <p className="text-emerald-800/90 leading-relaxed break-keep">
            단순 티켓 발권 수량이나 식음 결제 건수는 중복 이용 및 단순 동행 구분이 불가하여 방문객 집계에서 제외합니다.
            공식 숙박객 수는 <strong>실 판매 객실 수(rooms_sold) × 객실 타입별 기준 정원(16평 2.5명, 35평 4명, 51평 6명 등)</strong>을 적용하여 실제 투숙 인원만을 정밀하게 산출합니다.
          </p>
        </div>
      </div>

      {/* KPI Overview Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        {/* Card 1: 총 숙박객 */}
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
                <Hotel size={16} className="text-emerald-600 shrink-0" /> 총 숙박객
              </span>
              <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
                정원 기준 산출
              </span>
            </div>
            <div className="text-3xl font-black text-slate-900 my-1 whitespace-nowrap">
              {loading ? (
                <div className="animate-pulse h-9 w-24 bg-slate-200 rounded-lg inline-block align-middle"></div>
              ) : apiError ? (
                <span className="text-xl text-red-500 font-bold">오류</span>
              ) : (
                <>{summary?.roomGuestsFormatted || '0'} <span className="text-sm font-medium text-slate-400">명</span></>
              )}
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-slate-100 bg-slate-50/70 -mx-6 -mb-6 p-4 rounded-b-[28px]">
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700 mb-1">
              <HelpCircle size={13} className="text-emerald-600 shrink-0" />
              <span>숙박객 계산 기준 (SSOT)</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed break-keep">
              실 판매 객실 수 × 객실별 기준 정원<br />
              <span className="text-slate-400 font-mono text-[10px]">(16평 2.5명 · 35평 4명 · 51평 6명 등)</span>
            </p>
          </div>
        </div>

        {/* Card 2: 골프 내장객 */}
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
                <Users size={16} className="text-blue-600 shrink-0" /> 골프 내장객
              </span>
              <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200">
                그린피 정산
              </span>
            </div>
            <div className="text-3xl font-black text-slate-900 my-1 whitespace-nowrap">
              {loading ? (
                <div className="animate-pulse h-9 w-24 bg-slate-200 rounded-lg inline-block align-middle"></div>
              ) : apiError ? (
                <span className="text-xl text-red-500 font-bold">-</span>
              ) : (
                <>{summary?.golfPlayersFormatted || '0'} <span className="text-sm font-medium text-slate-400">명</span></>
              )}
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-slate-100 bg-slate-50/70 -mx-6 -mb-6 p-4 rounded-b-[28px]">
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700 mb-1">
              <HelpCircle size={13} className="text-blue-600 shrink-0" />
              <span>내장객 집계 기준</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed break-keep">
              골프장 그린피 결제 확인 공식 내장객 수<br />
              <span className="text-slate-400 font-mono text-[10px]">(정산 기준 1팀 4인 실 라운딩 확인 인원)</span>
            </p>
          </div>
        </div>

        {/* Card 3: 리조트 총 발생 매출 */}
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
                <DollarSign size={16} className="text-indigo-600 shrink-0" /> 리조트 총 발생 매출
              </span>
              <span className="text-[11px] font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-200">
                VAT 제외 순매출
              </span>
            </div>
            <div className="text-3xl font-black text-indigo-600 my-1 whitespace-nowrap">
              {loading ? (
                <div className="animate-pulse h-9 w-32 bg-indigo-100 rounded-lg inline-block align-middle"></div>
              ) : apiError ? (
                <span className="text-xl text-red-500 font-bold">-</span>
              ) : (
                <>{summary?.totalResortSalesFormatted || '0'}원</>
              )}
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-slate-100 bg-slate-50/70 -mx-6 -mb-6 p-4 rounded-b-[28px]">
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700 mb-1">
              <HelpCircle size={13} className="text-indigo-600 shrink-0" />
              <span>회계 집계 기준 (SSOT)</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed break-keep">
              리조트 전사 발생 순매출 (VAT 10% 제외)<br />
              <span className="text-slate-400 font-mono text-[10px]">(객실 + 골프 + 식음 + 레저 전 부문 통합)</span>
            </p>
          </div>
        </div>

      </div>

      {/* Daily Trends Chart Section */}
      <div className="bg-white rounded-[32px] p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" /> 일자별 숙박객 및 매출 추이
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
            <Building className="w-5 h-5 text-emerald-500" /> 업장별 실적 집계 (SSOT)
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
                <th className="py-3.5 px-6 text-right whitespace-nowrap">순 이용/방문 수량</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">수량 점유율 (%)</th>
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
                      {(venue.revenue_formatted || (venue as any).revenueFormatted || Number(venue.revenue || 0).toLocaleString())}원
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
