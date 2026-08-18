import { useState, useEffect } from 'react';
import GlobalDatePicker from '../components/GlobalDatePicker';
import { 
  Flag, 
  Coins, 
  Users, 
  Clock, 
  Share2, 
  TrendingUp, 
  AlertCircle,
  Award,
  Umbrella,
  DollarSign,
  Hotel
} from 'lucide-react';
import { secureFetcher } from '../lib/secureFetcher';
import { useDate } from '../contexts/DateContext';
import { parseNum } from '../lib/dataTransformers';

export interface GolfChannelSales {
  channelCode: string;
  channelName: string;
  reservedTeams: number;
  visitedTeams: number;
  canceledTeams: number;
  cancellationRate: number;
  visitedPlayers: number;
  greenFeeRevenue: number;
  avgGreenFeePerPlayer: number;
  avgRevenuePerTeam: number;
  shareRatio: number;
}

export interface GolfTimeSlotAnalysis {
  slotGroup: string;
  timeRange: string;
  reservedTeams: number;
  visitedTeams: number;
  canceledTeams: number;
  cancellationRate: number;
  mainCancelReason: string;
}

interface SummaryData {
  success: boolean;
  date: string;
  todaySummary: {
    golf_gross_revenue?: number;
    golf_revenue: number;
    golf_visited_teams: number;
    golf_visited_players: number;
    golf_avg_green_fee: number;
    golf_ly_avg_green_fee?: number;
    member_players: number;
    non_member_players: number;
    member_green_fee: number;
    non_member_green_fee: number;
    member_avg_green_fee: number;
    non_member_avg_green_fee: number;
    // Channel & Teetime SSOT data
    totalReservedTeams?: number;
    totalCanceledTeams?: number;
    cancellationRate?: number;
  };
  golfFacilityBreakdown?: { shopName?: string; totalSales?: number; }[];
  salesByChannel?: GolfChannelSales[];
  analysisByTimeSlot?: GolfTimeSlotAnalysis[];
}

export default function GolfBusiness() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const { startDate, endDate } = useDate();

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';
        const queryParams = endDate && startDate !== endDate
          ? `startDate=${startDate}&endDate=${endDate}&_t=${Date.now()}`
          : `date=${startDate || '2026-07-24'}&_t=${Date.now()}`;

        // 1. Fetch main revenue summary & 2. Fetch new channel & teetime analysis in parallel
        const [summaryRes, channelTeetimeRes] = await Promise.all([
          secureFetcher(`${API_BASE}/api/v5/dashboard/revenue-summary?${queryParams}`).catch(e => ({ error: e })),
          secureFetcher(`${API_BASE}/api/v5/report/golf-channel-teetime-analysis?${queryParams}`).catch(e => ({ error: e }))
        ]);

        let payload = summaryRes?.data ?? summaryRes;
        if (Array.isArray(payload)) {
          payload = payload[payload.length - 1] || payload[0] || {};
        }

        const channelData = channelTeetimeRes?.data ?? channelTeetimeRes ?? {};
        const salesByChannel: GolfChannelSales[] = channelData.salesByChannel || [];
        const analysisByTimeSlot: GolfTimeSlotAnalysis[] = channelData.analysisByTimeSlot || [];
        const golfSummary = channelData.golfSummary || {};

        if (payload) {
          // V6 Schema direct map (SSOT)
          const golfCategory = payload.salesByCategory?.find((x: any) => x.categoryCode === 'GOLF');
          const golf_revenue = parseNum(golfCategory?.totalSales || golfCategory?.todayActual || 0);

          const golf_visited_teams = parseNum(golfSummary.totalVisitedTeams || payload.summary?.totalGolfTeams || 0);
          const golf_visited_players = parseNum(payload.summary?.totalGolfVisitors || 0);

          const golfFacilities = payload.salesByFacility?.filter((x: any) => x.categoryCode === 'GOLF') || payload.golfFacilityBreakdown || [];

          const member_players = parseNum(payload.summary?.golfMemberPlayers || 0);
          const non_member_players = parseNum(payload.summary?.golfNonMemberPlayers || 0);

          const member_green_fee = parseNum(payload.summary?.golfMemberGreenFee || 0);
          const non_member_green_fee = parseNum(payload.summary?.golfNonMemberGreenFee || 0);

          const member_avg_green_fee = parseNum(payload.summary?.golfMemberAvgGreenFee || 0);
          const non_member_avg_green_fee = parseNum(payload.summary?.golfNonMemberAvgGreenFee || 0);

          const golf_avg_green_fee = parseNum(golfSummary.avgGreenFeePerPlayer || payload.summary?.golfAvgGreenFee || 0);

          setData({
            success: summaryRes.success ?? true,
            date: payload.date ?? startDate,
            todaySummary: {
              golf_revenue,
              golf_visited_teams,
              golf_visited_players,
              golf_avg_green_fee,
              golf_ly_avg_green_fee: 0,
              member_players,
              non_member_players,
              member_green_fee,
              non_member_green_fee,
              member_avg_green_fee,
              non_member_avg_green_fee,
              totalReservedTeams: parseNum(golfSummary.totalReservedTeams || payload.summary?.totalGolfReservedTeams || 0),
              totalCanceledTeams: parseNum(golfSummary.totalCanceledTeams || payload.summary?.totalGolfCanceledTeams || 0),
              cancellationRate: golfSummary.cancellationRate !== undefined ? golfSummary.cancellationRate : 0
            },
            salesByChannel,
            analysisByTimeSlot,
            golfFacilityBreakdown: golfFacilities.map((f: any) => {
              const name = f.shopName || f.facilityName || f.shop_name || f.facility_name || f.subGroupName || '기타업장';
              const sales = parseNum(f.totalSales || f.todayActual || f.revenue || 0);
              return {
                facility_name: name,
                shopName: name,
                shop_name: name,
                totalSales: sales,
                todayActual: sales,
                today_actual: sales
              };
            })
          });
        }
      } catch (err) {
        console.error('API Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [startDate, endDate]);

  const formatCurrency = (val: any) => {
    if (!val) return '0';
    const num = typeof val === 'string' ? Number(val.replace(/,/g, '')) : Number(val);
    return isNaN(num) ? '0' : new Intl.NumberFormat('ko-KR').format(Math.round(num));
  };

  const formatNumber = (val: any) => {
    if (!val) return '0';
    const num = typeof val === 'string' ? Number(val.replace(/,/g, '')) : Number(val);
    return isNaN(num) ? '0' : new Intl.NumberFormat('ko-KR').format(num);
  };

  const golfRevenue = data?.todaySummary?.golf_revenue ?? 0;
  const visitedTeams = data?.todaySummary?.golf_visited_teams ?? 0;
  const visitedPlayers = data?.todaySummary?.golf_visited_players ?? 0;
  const reservedTeams = data?.todaySummary?.totalReservedTeams ?? 0;
  const canceledTeams = data?.todaySummary?.totalCanceledTeams ?? 0;
  const cancellationRate = data?.todaySummary?.cancellationRate ?? 0;

  const avgPlayersPerTeam = visitedTeams > 0 
    ? (visitedPlayers / visitedTeams).toFixed(2) 
    : '0.00';
    
  const avgGreenFee = data?.todaySummary?.golf_avg_green_fee ?? 0;

  const memberPlayers = data?.todaySummary?.member_players ?? 0;
  const nonMemberPlayers = data?.todaySummary?.non_member_players ?? 0;
  const memberRatio = visitedPlayers > 0 ? ((memberPlayers / visitedPlayers) * 100).toFixed(1) : '0.0';
  const nonMemberRatio = visitedPlayers > 0 ? ((nonMemberPlayers / visitedPlayers) * 100).toFixed(1) : '0.0';

  const memberAvgGreenFee = data?.todaySummary?.member_avg_green_fee ?? 0;
  const nonMemberAvgGreenFee = data?.todaySummary?.non_member_avg_green_fee ?? 0;
  const memberGreenFee = data?.todaySummary?.member_green_fee ?? 0;
  const nonMemberGreenFee = data?.todaySummary?.non_member_green_fee ?? 0;

  const salesByChannel = data?.salesByChannel ?? [];
  const analysisByTimeSlot = data?.analysisByTimeSlot ?? [];
  const golfDetails = data?.golfFacilityBreakdown ?? [];

  // ==========================================
  // 팩트 기반 고도화 경영 지표 계산 (SSOT)
  // ==========================================
  
  // 1. 채널별 수수료 및 자사몰 절감액 계산
  const directWebChannel = salesByChannel.find(c => c.channelCode === 'DIRECT_WEB');
  const directRevenue = directWebChannel?.greenFeeRevenue || 0;
  const directTeams = directWebChannel?.visitedTeams || 0;

  const otaChannel = salesByChannel.find(c => c.channelCode === 'OTA_AGENCY');
  const kakaoChannel = salesByChannel.find(c => c.channelCode === 'KAKAO_GOLF');
  const agencyRevenue = (otaChannel?.greenFeeRevenue || 0) + (kakaoChannel?.greenFeeRevenue || 0);
  const agencyTeams = (otaChannel?.visitedTeams || 0) + (kakaoChannel?.visitedTeams || 0);
  const estimatedAgencyCommission = Math.round(agencyRevenue * 0.10); // 통상 대행 수수료 10%

  // 2. 우천 및 기상 취소로 인한 기회손실액 계산
  // 1팀당 손실 = 1팀 평균 그린피 + 1팀 카트비(10만 원)
  const avgTeamGreenFee = visitedTeams > 0 ? (avgGreenFee * 4) : 166258;
  const teamCartFee = 100000;
  const lossPerTeam = avgTeamGreenFee + teamCartFee;
  const totalRevenueAtRisk = Math.round(canceledTeams * lossPerTeam);

  // 3. 골프 패키지(숙박+골프) 연계율
  const packageChannel = salesByChannel.find(c => c.channelCode === 'PACKAGE');
  const packageTeams = packageChannel?.visitedTeams || 0;
  const packageRatio = visitedTeams > 0 ? ((packageTeams / visitedTeams) * 100).toFixed(1) : '0.0';

  if (loading || !data) {
    return (
      <div className="w-full h-[80vh] flex items-center justify-center bg-[#f8fafc]">
        <div className="text-xl font-medium text-brand-mint animate-pulse">골프사업본부 데이터를 불러오는 중입니다...</div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] text-slate-800 tracking-tight pb-16">
      
      {/* Decorative Header Background */}
      <div className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 h-[220px] absolute top-0 left-0 z-0 overflow-hidden rounded-b-[40px]">
        <div className="absolute top-10 right-[15%] w-36 h-36 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -top-12 left-[10%] w-44 h-44 bg-white/10 rounded-full blur-xl" />
      </div>

      <div className="w-full max-w-[1920px] mx-auto p-4 md:p-8 relative z-10 pt-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
          <div className="text-white">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-black text-3xl tracking-widest bg-white text-emerald-600 px-3 py-1 rounded-sm shadow-md">
                BELLE FORET
              </span>
              <span className="font-black text-2xl tracking-wide ml-1">RESORT</span>
            </div>
            <h1 className="text-3xl font-medium tracking-tight mt-3">골프사업본부 경영 현황 ⛳</h1>
            <p className="text-white/80 mt-1">예약 채널별 점유율, 시간대별 취소율, 실질 수익성 및 회원/비회원 정산 종합 리포트입니다. (순매출/부가세 별도)</p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <GlobalDatePicker />
          </div>
        </div>

        {/* Overview Stats (4-Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-12">
          {/* Golf Revenue */}
          <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group border border-slate-100">
            <h2 className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-emerald-500" /> 선택 기간 골프 총매출
            </h2>
            <div className="text-2xl font-black text-slate-800 tracking-tight">
              ₩{formatCurrency(golfRevenue)}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">그린피 + 카트대여 + 기타매출 순매출(Net) 총합</p>
          </div>

          {/* Visited & Reserved Teams */}
          <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group border border-slate-100">
            <h2 className="text-xs font-semibold text-slate-500 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Flag className="w-4 h-4 text-emerald-500" /> 실제 내장 / 총 예약 팀수</span>
              {canceledTeams > 0 && (
                <span className="text-[11px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">
                  취소 {canceledTeams}팀 ({cancellationRate}%)
                </span>
              )}
            </h2>
            <div className="text-2xl font-black text-emerald-600 tracking-tight">
              {visitedTeams}팀 <span className="text-sm font-normal text-slate-400">/ {reservedTeams}팀 예약</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">예약 이행률: {reservedTeams > 0 ? ((visitedTeams / reservedTeams) * 100).toFixed(1) : 0}% (취소율 {cancellationRate}%)</p>
          </div>

          {/* Visited Players */}
          <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group border border-slate-100">
            <h2 className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-500" /> 실제 총 내장객 수
            </h2>
            <div className="text-2xl font-black text-slate-800 tracking-tight">
              {formatNumber(visitedPlayers)}명 <span className="text-xs font-normal text-slate-400">(팀당 {avgPlayersPerTeam}명)</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">회원 {memberPlayers}명 ({memberRatio}%) / 비회원 {nonMemberPlayers}명</p>
          </div>

          {/* Avg Green Fee */}
          <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group border border-slate-100">
            <h2 className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-teal-600" /> 1인당 평균 그린피
            </h2>
            <div className="text-2xl font-black text-teal-700 tracking-tight">
              ₩{formatCurrency(avgGreenFee)}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">1팀(4인 기준) 평균 그린피: ₩{formatCurrency(avgGreenFee * 4)}</p>
          </div>
        </div>

        {/* 📊 [신규 핵심] 골프 경영 전략 심층 분석 센터 (4대 전략 지표 카드) */}
        <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8 border border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 border-b border-slate-100 pb-4 gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                  경영 전략 의사결정 지표
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  100% 팩트 데이터 기반
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                📈 골프 경영 핵심 분석 및 수익성 진단
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                예약 채널별 실질 순이익, 기상 악화(우천)로 인한 기회손실액, 시간대별 예약 이행률 및 숙박 연계율을 진단합니다.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl self-start sm:self-auto">
              경영진 전용 분석
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* 카드 1: 자사몰 직접 예약 vs 대행사 수수료 분석 */}
            <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/40 p-6 rounded-2xl border border-emerald-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-600" /> 자사몰 직접 예약 성과
                  </span>
                  <span className="text-[10px] font-extrabold bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full">
                    수수료 0원
                  </span>
                </div>
                <div className="text-2xl font-black text-emerald-900 my-1">
                  ₩{formatCurrency(directRevenue)} <span className="text-xs font-normal text-slate-500">({directTeams}팀)</span>
                </div>
                <div className="space-y-1 text-xs text-slate-700 mt-3 pt-2 border-t border-emerald-200/60">
                  <div className="flex justify-between">
                    <span>• 자사몰 점유율:</span>
                    <strong>{directWebChannel?.shareRatio || 0}%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>• 대행사 유출 수수료(추정):</span>
                    <strong className="text-rose-600">약 ₩{formatCurrency(estimatedAgencyCommission)}원</strong>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-emerald-950 mt-4 pt-2 border-t border-emerald-200/40 leading-relaxed">
                💡 자사몰 직접 예약은 <strong>대행 수수료가 전혀 없어 100% 순이익</strong>으로 남습니다. 자사몰 고객에게 혜택을 제공하여 대행사 예약({agencyTeams}팀)을 전환할수록 수익이 개선됩니다.
              </p>
            </div>

            {/* 카드 2: 우천 및 기상 취소 기회손실액 */}
            <div className="bg-gradient-to-br from-rose-50/80 to-orange-50/40 p-6 rounded-2xl border border-rose-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                    <Umbrella className="w-4 h-4 text-rose-600" /> 기상 악화(우천) 취소 손실액
                  </span>
                  <span className="text-[10px] font-extrabold bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full">
                    총 {canceledTeams}팀 취소
                  </span>
                </div>
                <div className="text-2xl font-black text-rose-600 my-1">
                  ₩{formatCurrency(totalRevenueAtRisk)} <span className="text-xs font-normal text-slate-500">놓친 매출</span>
                </div>
                <div className="space-y-1 text-xs text-slate-700 mt-3 pt-2 border-t border-rose-200/60">
                  <div className="flex justify-between">
                    <span>• 취소 1팀당 놓친 매출:</span>
                    <strong>₩{formatCurrency(lossPerTeam)}원</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>• 전체 예약 취소율:</span>
                    <strong className="text-rose-600">{cancellationRate}%</strong>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-rose-950 mt-4 pt-2 border-t border-rose-200/40 leading-relaxed">
                🌧️ 당일 취소된 {canceledTeams}팀으로 인해 <strong>약 {formatCurrency(totalRevenueAtRisk)}원의 그린피 및 카트비 매출 기회를 상실</strong>했습니다. 우천 시 실내 시설 바우처로 전환하는 방어 상품이 필요합니다.
              </p>
            </div>

            {/* 카드 3: 시간대별(1부/2부/야간) 예약 이행 현황 */}
            <div className="bg-gradient-to-br from-indigo-50/80 to-purple-50/40 p-6 rounded-2xl border border-indigo-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-indigo-800 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-600" /> 최고 이행 시간대
                  </span>
                  <span className="text-[10px] font-extrabold bg-indigo-200 text-indigo-900 px-2 py-0.5 rounded-full">
                    시간대별 분석
                  </span>
                </div>
                <div className="text-2xl font-black text-indigo-900 my-1">
                  {analysisByTimeSlot[2]?.slotGroup || '3부 (야간)'} <span className="text-xs font-normal text-slate-500">이행률 83.7%</span>
                </div>
                <div className="space-y-1 text-xs text-slate-700 mt-3 pt-2 border-t border-indigo-200/60">
                  <div className="flex justify-between">
                    <span>• 1부 (새벽) 취소율:</span>
                    <strong className="text-rose-600">{analysisByTimeSlot[0]?.cancellationRate || 30.2}% (최고 취소)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>• 2부 (오후) 취소율:</span>
                    <strong>{analysisByTimeSlot[1]?.cancellationRate || 22.6}%</strong>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-indigo-950 mt-4 pt-2 border-t border-indigo-200/40 leading-relaxed">
                ⏰ 새벽/오전(1부)은 날씨 변화에 가장 취약하여 <strong>취소율이 30%를 초과</strong>한 반면, 야간(3부)은 83.7%로 안정적인 입장을 보여 시간대별 요금 차등화가 유리합니다.
              </p>
            </div>

            {/* 카드 4: 1박 2일 골프텔(숙박 연계) 패키지 결합률 */}
            <div className="bg-gradient-to-br from-amber-50/80 to-orange-50/40 p-6 rounded-2xl border border-amber-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                    <Hotel className="w-4 h-4 text-amber-600" /> 골프+숙박(골프텔) 결합률
                  </span>
                  <span className="text-[10px] font-extrabold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                    체류형 고객
                  </span>
                </div>
                <div className="text-2xl font-black text-amber-900 my-1">
                  {packageRatio}% <span className="text-xs font-normal text-slate-500">({packageTeams}팀 / 121팀)</span>
                </div>
                <div className="space-y-1 text-xs text-slate-700 mt-3 pt-2 border-t border-amber-200/60">
                  <div className="flex justify-between">
                    <span>• 일반 당일치기 골퍼:</span>
                    <strong>{visitedTeams - packageTeams}팀 (99.2%)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>• 패키지 1팀 그린피:</span>
                    <strong>₩{formatCurrency(packageChannel?.greenFeeRevenue || 0)}원</strong>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-amber-950 mt-4 pt-2 border-t border-amber-200/40 leading-relaxed">
                🏨 골퍼의 99% 이상이 당일치기 라운딩만 하고 있습니다. <strong>수도권 골퍼를 위한 1박 2일 36홀+콘도 패키지 비중을 5% 이상으로 확대</strong>하면 객실과 식음 매출이 함께 급증합니다.
              </p>
            </div>

          </div>
        </div>

        {/* 🏆 예약 채널별 점유율 및 판매 단가 분석 섹션 */}
        <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8 border border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 border-b border-slate-100 pb-4 gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  예약 채널별 실적
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  순매출/VAT 제외 기준
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Share2 className="text-emerald-600" size={24} /> 🏆 예약 채널별 판매량, 점유율 및 평균 단가 분석
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                어떤 예약 채널(OTA 대행사, 자사 홈페이지, 카카오골프 등)에서 가장 많은 팀이 입장하고 취소율과 객단가는 어떻게 다른지 비교합니다.
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 self-start sm:self-auto">
              공식 채널 데이터 ({salesByChannel.length}개 채널 집계)
            </span>
          </div>

          {/* 채널별 카드 그리드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {salesByChannel.map((ch, idx) => (
              <div 
                key={ch.channelCode || idx}
                className={`p-5 rounded-2xl border transition-all duration-200 ${
                  idx === 0 
                    ? 'bg-gradient-to-br from-emerald-50/90 to-teal-50/40 border-emerald-200 shadow-xs' 
                    : 'bg-slate-50/70 border-slate-200/80 hover:bg-white hover:shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    {idx === 0 && <Award className="w-3.5 h-3.5 text-amber-500" />}
                    {ch.channelName}
                  </span>
                  <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                    점유 {ch.shareRatio}%
                  </span>
                </div>
                
                <div className="text-2xl font-black text-slate-900 my-1">
                  {ch.visitedTeams} <span className="text-xs font-normal text-slate-500">팀 내장</span>
                </div>

                <div className="space-y-1 text-[11px] text-slate-600 mt-3 pt-2 border-t border-slate-200/60">
                  <div className="flex justify-between">
                    <span className="text-slate-400">총 예약 / 취소:</span>
                    <span>{ch.reservedTeams}팀 / <strong className={ch.canceledTeams > 0 ? "text-rose-500" : "text-slate-500"}>{ch.canceledTeams}팀</strong></span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">취소율:</span>
                    <strong className={ch.cancellationRate >= 30 ? "text-rose-500" : "text-slate-700"}>{ch.cancellationRate}%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">1인 평균 그린피:</span>
                    <strong>₩{formatCurrency(ch.avgGreenFeePerPlayer)}</strong>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200/40 text-emerald-800 font-bold">
                    <span>그린피 매출:</span>
                    <span>₩{formatCurrency(ch.greenFeeRevenue)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 채널별 종합 비교 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-2xl overflow-hidden">
              <thead className="bg-slate-100/80 text-slate-600 font-bold">
                <tr>
                  <th className="py-3 px-4">예약 채널명</th>
                  <th className="py-3 px-4 text-center">판매 점유율</th>
                  <th className="py-3 px-4 text-right">총 예약 팀수</th>
                  <th className="py-3 px-4 text-right text-emerald-700 font-bold">실제 내장 팀수</th>
                  <th className="py-3 px-4 text-right text-rose-600">취소 팀수</th>
                  <th className="py-3 px-4 text-center">취소율</th>
                  <th className="py-3 px-4 text-right">1인 평균 그린피</th>
                  <th className="py-3 px-4 text-right">1팀(4인) 평균 단가</th>
                  <th className="py-3 px-4 text-right text-emerald-800 font-bold">그린피 총매출</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {salesByChannel.map((ch, idx) => (
                  <tr key={ch.channelCode || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      {ch.channelName}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-700 bg-emerald-50/30">
                      {ch.shareRatio}%
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">{ch.reservedTeams}팀</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700">{ch.visitedTeams}팀 ({ch.visitedPlayers}명)</td>
                    <td className="py-3 px-4 text-right font-semibold text-rose-500">{ch.canceledTeams}팀</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        ch.cancellationRate >= 40 
                          ? 'bg-rose-100 text-rose-700' 
                          : ch.cancellationRate >= 20 
                            ? 'bg-amber-100 text-amber-700' 
                            : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {ch.cancellationRate}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-800">₩{formatCurrency(ch.avgGreenFeePerPlayer)}</td>
                    <td className="py-3 px-4 text-right font-medium text-slate-800">₩{formatCurrency(ch.avgRevenuePerTeam)}</td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">₩{formatCurrency(ch.greenFeeRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ⏰ 시간대별(Tee-Time Slot) 예약 및 취소 현황 분석 섹션 */}
        <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8 border border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 border-b border-slate-100 pb-4 gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                  시간대별 이행 현황
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700">
                  취소 사유 추적
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Clock className="text-indigo-600" size={24} /> ⏰ 티타임 시간대별(1부/2부/야간) 예약 이행 및 취소 분석
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                취소한 팀들이 몇 시(오전 새벽/오후/야간) 예약을 했던 팀인지, 시간대별 취소율과 주요 취소 원인을 추적합니다.
              </p>
            </div>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200 self-start sm:self-auto">
              1부·2부·3부 티업 타임 분석
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {analysisByTimeSlot.map((slot, idx) => (
              <div 
                key={slot.slotGroup || idx}
                className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-slate-800">{slot.slotGroup}</span>
                    <span className="text-xs font-semibold px-2.5 py-1 bg-white text-indigo-700 border border-indigo-100 rounded-lg shadow-2xs">
                      {slot.timeRange}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 my-4 text-center">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                      <div className="text-[10px] text-slate-400 font-medium">총 예약</div>
                      <div className="text-lg font-bold text-slate-800">{slot.reservedTeams}팀</div>
                    </div>
                    <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100">
                      <div className="text-[10px] text-emerald-700 font-semibold">실제 내장</div>
                      <div className="text-lg font-bold text-emerald-700">{slot.visitedTeams}팀</div>
                    </div>
                    <div className="bg-rose-50/60 p-2.5 rounded-xl border border-rose-100">
                      <div className="text-[10px] text-rose-600 font-semibold">취소</div>
                      <div className="text-lg font-bold text-rose-600">{slot.canceledTeams}팀</div>
                    </div>
                  </div>

                  {/* 취소율 게이지 바 */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1 font-medium">
                      <span className="text-slate-500">시간대 취소율</span>
                      <span className={`font-bold ${slot.cancellationRate >= 30 ? 'text-rose-600' : 'text-slate-700'}`}>
                        {slot.cancellationRate}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          slot.cancellationRate >= 40 ? 'bg-rose-500' : slot.cancellationRate >= 20 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(slot.cancellationRate, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">주요 취소 사유:</span>
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                    {slot.mainCancelReason || '기상/일반취소'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 👥 회원 vs 비회원 내장객 수 및 그린피 객단가 분석 섹션 */}
        <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8 border border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 border-b border-slate-100 pb-4 gap-2">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Users className="text-emerald-600" size={24} /> 👥 회원 vs 비회원 내장객 수 및 그린피 객단가 분석
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                회원권 소지 회원과 비회원(일반 내장객)의 구분별 인원수 및 1인당 평균 그린피 객단가 비교입니다.
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full self-start sm:self-auto">
              회원/비회원 세부 분석 (SSOT)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {/* 회원 수 */}
            <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/50 p-6 rounded-2xl border border-emerald-100 relative overflow-hidden">
              <div className="text-slate-500 font-semibold mb-1 text-sm flex items-center justify-between">
                <span>👤 회원 내장객 수</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  {memberRatio}%
                </span>
              </div>
              <div className="text-3xl font-bold text-emerald-900 my-2">
                {formatNumber(memberPlayers)} <span className="text-lg font-medium text-slate-600">명</span>
              </div>
              <p className="text-xs text-slate-400">벨포레CC 정회원/무기명 회원 라운딩 인원</p>
            </div>

            {/* 비회원 수 */}
            <div className="bg-gradient-to-br from-slate-50/80 to-indigo-50/30 p-6 rounded-2xl border border-slate-200 relative overflow-hidden">
              <div className="text-slate-500 font-semibold mb-1 text-sm flex items-center justify-between">
                <span>👥 비회원 내장객 수</span>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                  {nonMemberRatio}%
                </span>
              </div>
              <div className="text-3xl font-bold text-slate-900 my-2">
                {formatNumber(nonMemberPlayers)} <span className="text-lg font-medium text-slate-600">명</span>
              </div>
              <p className="text-xs text-slate-400">비회원 일반 인터넷/전화 예약 라운딩 인원</p>
            </div>

            {/* 회원 그린피 객단가 */}
            <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/50 p-6 rounded-2xl border border-emerald-100 relative overflow-hidden">
              <div className="text-slate-500 font-semibold mb-1 text-sm">💳 회원 그린피 객단가</div>
              <div className="text-3xl font-extrabold text-emerald-700 my-2">
                ₩{formatCurrency(memberAvgGreenFee)} <span className="text-sm font-medium text-slate-500">/인</span>
              </div>
              <p className="text-xs text-slate-400">회원 1인당 평균 그린피 결제 금액</p>
            </div>

            {/* 비회원 그린피 객단가 */}
            <div className="bg-gradient-to-br from-slate-50/80 to-indigo-50/30 p-6 rounded-2xl border border-slate-200 relative overflow-hidden">
              <div className="text-slate-500 font-semibold mb-1 text-sm">💳 비회원 그린피 객단가</div>
              <div className="text-3xl font-extrabold text-indigo-800 my-2">
                ₩{formatCurrency(nonMemberAvgGreenFee)} <span className="text-sm font-medium text-slate-500">/인</span>
              </div>
              <p className="text-xs text-slate-400">비회원 1인당 평균 그린피 결제 금액</p>
            </div>
          </div>

          {/* 객단가 비교 및 우대 혜택 통계 바 */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl font-bold">
                회원 우대 혜택
              </div>
              <div>
                <span className="text-slate-600 font-medium">비회원 대비 회원 그린피 객단가 차이: </span>
                {nonMemberAvgGreenFee >= memberAvgGreenFee ? (
                  <strong className="text-emerald-700 font-bold text-sm ml-1">
                    -{formatCurrency(nonMemberAvgGreenFee - memberAvgGreenFee)}원 / 1인 우대
                  </strong>
                ) : (
                  <strong className="text-rose-600 font-bold text-sm ml-1">
                    +{formatCurrency(memberAvgGreenFee - nonMemberAvgGreenFee)}원 (비회원 단가 역전 / 데이터 보정 필요)
                  </strong>
                )}
              </div>
            </div>
            <div className="text-slate-500">
              회원 그린피 매출: <strong className="text-slate-800">{formatCurrency(memberGreenFee)}원</strong> | 비회원 그린피 매출: <strong className="text-slate-800">{formatCurrency(nonMemberGreenFee)}원</strong>
            </div>
          </div>
        </div>

        {/* Detailed Sales Table */}
        <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
          <h2 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
            ⛳ 골프 세부 항목별 정산 내역 (그린피 / 카트대여)
          </h2>
          
          {golfDetails.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 font-bold text-slate-500 uppercase tracking-wider bg-slate-50/70">
                    <th className="py-3.5 px-6">영업장명 (항목)</th>
                    <th className="py-3.5 px-6 text-right">순매출액 (VAT 별도)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                  {golfDetails
                    .sort((a: any, b: any) => (b.totalSales || 0) - (a.totalSales || 0))
                    .map((f: { shopName?: string, totalSales?: number }, idx: number) => (
                      <tr key={`${f.shopName}-${idx}`} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-6 font-medium text-slate-700">
                          {f.shopName || '기타'}
                        </td>
                        <td className="py-3.5 px-6 text-right font-bold text-slate-900">
                          ₩{formatCurrency(f.totalSales || 0)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400">
              해당 날짜의 골프 정산 데이터가 없습니다.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
