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

export default function RoomGuestAnalysis() {
  const { startDate, endDate, isRange } = useDate();
  const isEffectiveRange = Boolean(isRange && endDate && startDate !== endDate);
  const effectiveEnd = isEffectiveRange && endDate ? endDate : startDate;

  const [data, setData] = useState<DailyMemberVisitorsV2Response | null>(null);
  const [resortVisitors, setResortVisitors] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchMemberVisitors = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const queryParams = isEffectiveRange
        ? `startDate=${startDate}&endDate=${effectiveEnd}`
        : `startDate=${startDate}&endDate=${startDate}`;
      const parkingQueryParams = isEffectiveRange
        ? `startDate=${startDate}&endDate=${effectiveEnd}`
        : `date=${startDate}`;

      const [res, parkRes] = await Promise.all([
        secureFetcher(`${API_BASE}/api/v6/report/daily-member-visitors-v2?${queryParams}`),
        secureFetcher(`${API_BASE}/api/v6/dashboard/parking-summary?${parkingQueryParams}`).catch(() => null),
      ]);
      const payload = res?.data ?? res;
      const rv = parkRes?.resortVisitors || parkRes?.summary?.resortVisitors || parkRes?.data?.resortVisitors || null;
      setResortVisitors(rv);

      if (payload && payload.success) {
        setData(payload);
      } else {
        setData(null);
      }
    } catch (err: any) {
      console.error('Room Guest Analysis Fetch Error:', err);
      setApiError(err.message || '데이터를 불러오는 중 문제가 발생했습니다.');
      setData(null);
      setResortVisitors(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemberVisitors();
  }, [startDate, endDate, isRange]);

  const summary = data?.meta?.summary;
  const venueVisitors = data?.venueVisitors || data?.venues || [];
  const dailyVisitors = data?.dailyVisitors || data?.dailyTrends || [];

  const getTrendChartOptions = () => {
    const dates = dailyVisitors.map((d: any) => d.salesDate || d.date || d.dateId);
    const roomGuests = dailyVisitors.map((d: any) => Number(d.dailyRoomGuests ?? 0));
    const golfPlayers = dailyVisitors.map((d: any) => Number(d.dailyGolfPlayers ?? 0));
    const revenue = dailyVisitors.map((d: any) => Number(d.dailyRevenue ?? 0));

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
    <div className="w-full min-h-screen bg-[#F4F3EE] text-[#1B382E] tracking-tight pb-16">
      {/* Decorative Ambient Header Background */}
      <div className="w-full bg-[#284F42] h-[190px] absolute top-0 left-0 z-0 overflow-hidden rounded-b-[36px] border-b border-[#1B382E] shadow-xl">
        <div className="absolute -top-16 -right-16 w-96 h-96 rounded-full bg-[#2F5548] opacity-70 pointer-events-none" />
        <div className="absolute top-8 left-1/3 w-80 h-80 rounded-full bg-[#2F5548] opacity-40 blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 right-1/4 w-60 h-60 rounded-full bg-[#1B382E] opacity-60 pointer-events-none" />
      </div>

      <div className="w-full max-w-[1920px] mx-auto p-4 md:p-8 relative z-10 pt-8 space-y-6">
        
        {/* Top Banner Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
          <div className="text-white">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1B382E]/80 border border-white/20 text-white/90 text-xs font-semibold backdrop-blur-xs shadow-xs mb-3">
              <span className="w-2 h-2 rounded-full bg-[#5FB878] animate-pulse" />
              <span>BELLEFORET RESORT · 일일 숙박객 및 방문객 분석</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight break-keep">일일 숙박객 및 방문객 분석</h1>
            <p className="text-sm text-white/80 mt-1 break-keep">
              관리자 공식 기준 정원에 기반한 총 숙박객 수와 업장별 매출 실적을 분석하여 일원화된 공식 고객 데이터를 제공합니다.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <GlobalDatePicker showPresets={true} />
            <button
              onClick={fetchMemberVisitors}
              disabled={loading}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer backdrop-blur-xs whitespace-nowrap"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              새로고침
            </button>
          </div>
        </div>

        {/* 숙박객 계산 기준 안내 배너 (집계 무결성 공지) */}
        <div className="bg-[#F4F3EE]/90 border border-[#D0C6BB]/75 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
          <Info className="w-5 h-5 text-[#284F42] shrink-0 mt-0.5" />
          <div className="text-xs text-[#1B382E] space-y-1">
            <div className="font-bold text-[#1B382E] flex items-center gap-2">
              <span>벨포레 통합 체류 인원 SSOT (`mat_v6_resort_visitors_daily`) 및 숙박객 산출 기준</span>
              <span className="text-[10px] bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]/70 px-2 py-0.5 rounded-full font-semibold">공식 기준</span>
            </div>
            <p className="text-[#5A6B63] leading-relaxed break-keep">
              순수 체류 총인원은 <strong>숙박객(실 판매 객실×기준정원) + 골프 내장객(그린피 실라운딩) + 순수 나들이객(워크인 차량×3명) − 숙박·골프 중복 차감 인원</strong>으로 사전 연산된 SSOT 마트 데이터를 1:1 직결하며, 다수 시설 중복 이용이 누적된 <strong>시설 이용 연인원</strong>과 명확히 분리하여 제공합니다.
            </p>
          </div>
        </div>

        {/* 🏛️ 벨포레 통합 순수 체류 총인원 SSOT 패널 */}
        <div className="bg-white p-6 rounded-3xl border-2 border-[#284F42]/80 shadow-[0_4px_24px_rgba(40,79,66,0.08)] space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#D0C6BB]/50 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Users size={18} className="text-[#284F42]" />
                <h2 className="text-base sm:text-lg font-extrabold text-[#1B382E]">
                  리조트 순수 물리적 체류 총인원 (Physical Headcount SSOT)
                </h2>
                <span className="text-[10px] font-black bg-[#284F42] text-white px-2.5 py-0.5 rounded-full">
                  Zero-Proxy 1:1
                </span>
              </div>
              <p className="text-xs text-[#5A6B63] mt-1">
                숙박객 + 골프 내장객 + 순수 당일 나들이객 − 숙박·골프 1:1 매칭 중복 차감 인원
              </p>
            </div>
            <div className="flex items-baseline gap-2 font-financial">
              <span className="text-xs font-bold text-[#6C7A73]">순수 체류 총인원:</span>
              <span className="text-3xl font-black text-[#1B382E]">
                {resortVisitors?.netPhysicalResortGuests != null
                  ? Number(resortVisitors.netPhysicalResortGuests).toLocaleString()
                  : '-'}
              </span>
              <span className="text-sm font-bold text-[#6C7A73]">명</span>
              {resortVisitors?.mtdNetPhysicalResortGuests != null && !isEffectiveRange && (
                <span className="ml-2 text-xs font-bold text-[#1E523F] bg-[#E8F2EE] px-2.5 py-1 rounded-full border border-[#B4C6C1]/70">
                  당월 누적(MTD) {Number(resortVisitors.mtdNetPhysicalResortGuests).toLocaleString()}명
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs font-financial">
            <div className="bg-[#F4F3EE] p-3.5 rounded-2xl border border-[#D0C6BB]/70">
              <span className="text-[11px] text-[#5A6B63] font-bold block mb-1">① 콘도 숙박객</span>
              <div className="text-xl font-extrabold text-[#1B382E]">
                {resortVisitors?.roomTotalGuests != null ? `${Number(resortVisitors.roomTotalGuests).toLocaleString()}명` : '-'}
              </div>
              <span className="text-[10px] text-[#6C7A73]">
                판매 객실: {resortVisitors?.roomSoldUnits != null ? `${Number(resortVisitors.roomSoldUnits).toLocaleString()}실` : '-'}
              </span>
            </div>

            <div className="bg-[#F4F3EE] p-3.5 rounded-2xl border border-[#D0C6BB]/70">
              <span className="text-[11px] text-[#5A6B63] font-bold block mb-1">② 골프 내장객</span>
              <div className="text-xl font-extrabold text-[#1B382E]">
                {resortVisitors?.golfTotalPlayers != null ? `${Number(resortVisitors.golfTotalPlayers).toLocaleString()}명` : '-'}
              </div>
              <span className="text-[10px] text-[#6C7A73]">그린피 실라운딩 인원</span>
            </div>

            <div className="bg-[#F4F3EE] p-3.5 rounded-2xl border border-[#D0C6BB]/70">
              <span className="text-[11px] text-[#5A6B63] font-bold block mb-1">③ 순수 당일 나들이객</span>
              <div className="text-xl font-extrabold text-[#1B382E]">
                {resortVisitors?.parkingWalkinVisitors != null ? `${Number(resortVisitors.parkingWalkinVisitors).toLocaleString()}명` : '-'}
              </div>
              <span className="text-[10px] text-[#6C7A73]">순수 워크인 차량×3명</span>
            </div>

            <div className="bg-[#FAECEB]/70 p-3.5 rounded-2xl border border-[#DE6E6D]/50">
              <span className="text-[11px] text-[#9E372E] font-bold block mb-1">④ 숙박·골프 중복 차감</span>
              <div className="text-xl font-extrabold text-[#9E372E]">
                {resortVisitors?.roomGolfSynergyGuests != null ? `-${Number(resortVisitors.roomGolfSynergyGuests).toLocaleString()}명` : '-'}
              </div>
              <span className="text-[10px] text-[#9E372E]">
                중복 호실: {resortVisitors?.golfCondoCrossCars != null ? `${Number(resortVisitors.golfCondoCrossCars).toLocaleString()}실` : '-'}
              </span>
            </div>

            <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200/80">
              <span className="text-[11px] text-amber-900 font-bold block mb-1">시설 이용 연인원 (단순합)</span>
              <div className="text-xl font-extrabold text-amber-950">
                {resortVisitors?.grossActivityVisitors != null ? `${Number(resortVisitors.grossActivityVisitors).toLocaleString()}명` : '-'}
              </div>
              <span className="text-[10px] text-amber-800">다수 시설 중복 이용 누적</span>
            </div>

            <div className="bg-[#E8F2EE]/70 p-3.5 rounded-2xl border border-[#B4C6C1]/80">
              <span className="text-[11px] text-[#1E523F] font-bold block mb-1">레저·티켓 입장 건수</span>
              <div className="text-xl font-extrabold text-[#1B382E]">
                {resortVisitors?.leisureTicketVisitors != null ? `${Number(resortVisitors.leisureTicketVisitors).toLocaleString()}건` : '-'}
              </div>
              <span className="text-[10px] text-[#284F42]">TICKET + MOTO 합계</span>
            </div>
          </div>
        </div>

        {/* KPI Overview Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: 총 숙박객 */}
          <div className="bg-white p-6 rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] relative overflow-hidden flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#5A6B63] flex items-center gap-1.5 whitespace-nowrap">
                  <Hotel size={16} className="text-[#284F42] shrink-0" /> 총 숙박객
                </span>
                <span className="text-[11px] font-semibold bg-[#E8F2EE] text-[#1E523F] px-2.5 py-0.5 rounded-full border border-[#B4C6C1]/70">
                  정원 기준 산출
                </span>
              </div>
              <div className="text-3xl font-extrabold text-[#1B382E] my-1 whitespace-nowrap font-financial">
                {loading ? (
                  <div className="animate-pulse h-9 w-24 bg-slate-200 rounded-lg inline-block align-middle"></div>
                ) : apiError ? (
                  <span className="text-xl text-rose-500 font-bold">오류</span>
                ) : (
                  <>{summary?.roomGuestsFormatted || '0'} <span className="text-sm font-medium text-[#8F9E96]">명</span></>
                )}
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-[#D0C6BB]/40 bg-[#F4F3EE]/70 -mx-6 -mb-6 p-4 rounded-b-3xl">
              <div className="flex items-center gap-1 text-[11px] font-bold text-[#1B382E] mb-1">
                <HelpCircle size={13} className="text-[#284F42] shrink-0" />
                <span>숙박객 계산 기준</span>
              </div>
              <p className="text-[11px] text-[#5A6B63] leading-relaxed break-keep">
                실 판매 객실 수 × 객실별 기준 정원<br />
                <span className="text-[#8F9E96] font-mono text-[10px]">(16평 2.5명 · 35평 4명 · 51평 6명 등)</span>
              </p>
            </div>
          </div>

          {/* Card 2: 골프 내장객 */}
          <div className="bg-white p-6 rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] relative overflow-hidden flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#5A6B63] flex items-center gap-1.5 whitespace-nowrap">
                  <Users size={16} className="text-[#284F42] shrink-0" /> 골프 내장객
                </span>
                <span className="text-[11px] font-semibold bg-[#E8F2EE] text-[#1E523F] px-2.5 py-0.5 rounded-full border border-[#B4C6C1]/70">
                  그린피 정산
                </span>
              </div>
              <div className="text-3xl font-extrabold text-[#1B382E] my-1 whitespace-nowrap font-financial">
                {loading ? (
                  <div className="animate-pulse h-9 w-24 bg-slate-200 rounded-lg inline-block align-middle"></div>
                ) : apiError ? (
                  <span className="text-xl text-rose-500 font-bold">-</span>
                ) : (
                  <>{summary?.golfPlayersFormatted || '0'} <span className="text-sm font-medium text-[#8F9E96]">명</span></>
                )}
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-[#D0C6BB]/40 bg-[#F4F3EE]/70 -mx-6 -mb-6 p-4 rounded-b-3xl">
              <div className="flex items-center gap-1 text-[11px] font-bold text-[#1B382E] mb-1">
                <HelpCircle size={13} className="text-[#284F42] shrink-0" />
                <span>내장객 집계 기준</span>
              </div>
              <p className="text-[11px] text-[#5A6B63] leading-relaxed break-keep">
                골프장 그린피 결제 확인 공식 내장객 수<br />
                <span className="text-[#8F9E96] font-mono text-[10px]">(정산 기준 1팀 4인 실 라운딩 확인 인원)</span>
              </p>
            </div>
          </div>

          {/* Card 3: 리조트 총 발생 매출 */}
          <div className="bg-white p-6 rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] relative overflow-hidden flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#5A6B63] flex items-center gap-1.5 whitespace-nowrap">
                  <DollarSign size={16} className="text-[#B59269] shrink-0" /> 리조트 총 발생 매출
                </span>
                <span className="text-[11px] font-semibold bg-[#B59269]/15 text-[#B59269] px-2.5 py-0.5 rounded-full border border-[#B59269]/30">
                  VAT 제외 순매출
                </span>
              </div>
              <div className="text-3xl font-extrabold text-[#1B382E] my-1 whitespace-nowrap font-financial">
                {loading ? (
                  <div className="animate-pulse h-9 w-32 bg-slate-200 rounded-lg inline-block align-middle"></div>
                ) : apiError ? (
                  <span className="text-xl text-rose-500 font-bold">-</span>
                ) : (
                  <>{summary?.totalResortSalesFormatted || '0'} <span className="text-sm font-medium text-[#8F9E96]">원</span></>
                )}
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-[#D0C6BB]/40 bg-[#F4F3EE]/70 -mx-6 -mb-6 p-4 rounded-b-3xl">
              <div className="flex items-center gap-1 text-[11px] font-bold text-[#1B382E] mb-1">
                <HelpCircle size={13} className="text-[#B59269] shrink-0" />
                <span>회계 집계 기준</span>
              </div>
              <p className="text-[11px] text-[#5A6B63] leading-relaxed break-keep">
                리조트 전사 발생 순매출 (VAT 10% 제외)<br />
                <span className="text-[#8F9E96] font-mono text-[10px]">(객실 + 골프 + 식음 + 레저 전 부문 통합)</span>
              </p>
            </div>
          </div>

        </div>

        {/* Daily Trends Chart Section */}
        <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-[0_4px_24px_rgba(40,79,66,0.06)] border border-[#D0C6BB]/75">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[#1B382E] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#284F42]" /> 일자별 숙박객 및 매출 추이
            </h2>
          </div>
          <div className="h-[350px] w-full">
            {!loading && !apiError && dailyVisitors.length > 0 ? (
              <ReactECharts option={getTrendChartOptions()} style={{ height: '100%', width: '100%' }} />
            ) : (
              <div className="h-full flex items-center justify-center text-[#8F9E96]">
                데이터가 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* Venue Visitors Table */}
        <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-[0_4px_24px_rgba(40,79,66,0.06)] border border-[#D0C6BB]/75">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[#1B382E] flex items-center gap-2">
              <Building className="w-5 h-5 text-[#284F42]" /> 업장별 실적 집계
            </h2>
            <span className="text-xs font-bold bg-[#F4F3EE] text-[#5A6B63] px-3 py-1 rounded-full border border-[#D0C6BB]/70">
              총 {venueVisitors.length}개 업장
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm whitespace-nowrap min-w-[800px]">
              <thead>
                <tr className="border-b border-[#D0C6BB]/75 text-xs font-bold text-[#1B382E] uppercase tracking-wider bg-[#F4F3EE]">
                  <th className="py-3.5 px-6 text-left rounded-l-xl whitespace-nowrap">분류 코드</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">업장 명칭</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">티켓 그룹</th>
                  <th className="py-3.5 px-6 text-right whitespace-nowrap">순 이용/방문 수량</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">수량 점유율 (%)</th>
                  <th className="py-3.5 px-6 text-right rounded-r-xl whitespace-nowrap">발생 매출액 (원)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D0C6BB]/30 font-financial">
                {venueVisitors.length > 0 ? (
                  venueVisitors.map((venue: any, idx: number) => (
                    <tr key={idx} className="hover:bg-[#F4F3EE]/50 transition-colors">
                      <td className="py-4 px-6 font-medium text-[#5A6B63] whitespace-nowrap">
                        {venue.categoryCode || '-'}
                      </td>
                      <td className="py-4 px-4 font-extrabold text-[#1B382E] whitespace-nowrap">
                        {venue.venueName || '-'}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-[#F4F3EE] text-[#5A6B63] border border-[#D0C6BB]/70 whitespace-nowrap">
                          {venue.ticketGroup || '-'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-black text-[#1E523F] whitespace-nowrap">
                        {(venue.visitorCountFormatted || Number(venue.visitorCount || 0).toLocaleString())} 명
                      </td>
                      <td className="py-4 px-4 text-right font-medium text-[#5A6B63] whitespace-nowrap">
                        {Number(venue.visitorSharePct ?? 0).toFixed(2)}%
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-[#1B382E] whitespace-nowrap">
                        {(venue.revenueFormatted || Number(venue.revenue || 0).toLocaleString())}원
                      </td>
                    </tr>
                  ))
                ) : loading ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <RefreshCw size={32} className="animate-spin text-[#284F42]" />
                        <p className="text-sm font-bold text-[#1B382E]">데이터를 불러오는 중입니다...</p>
                      </div>
                    </td>
                  </tr>
                ) : apiError ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-rose-500">
                      <p className="text-sm font-bold">{apiError}</p>
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-[#8F9E96]">
                      데이터가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
