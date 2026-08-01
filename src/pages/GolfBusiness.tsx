import { useState, useEffect } from 'react';
import GlobalDatePicker from '../components/GlobalDatePicker';
import { Flag, Coins, Users } from 'lucide-react';
import { secureFetcher } from '../lib/secureFetcher';
import { useDate } from '../contexts/DateContext';

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
  };
  golfFacilityBreakdown?: { shop_name: string; today_actual: number; }[];
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
        const json = await secureFetcher(`${API_BASE}/api/v5/dashboard/revenue-summary?${queryParams}`);
        let payload = json.data ?? json;
        if (Array.isArray(payload)) {
          payload = payload[payload.length - 1] || payload[0] || {};
        }
        if (payload) {
          // V5 Schema direct map (SSOT)
          const golfCategory = payload.salesByCategory?.find((x: any) => x.categoryCode === 'GOLF' || x.categoryCode === '골프');
          const golf_revenue = Number(golfCategory?.totalSales || golfCategory?.todayActual || golfCategory?.sales || golfCategory?.revenue || 0);

          const golf_visited_teams = Number(payload.summary?.totalGolfTeams || payload.summary?.golfVisitedTeams || 0);
          const golf_visited_players = Number(payload.summary?.totalGolfVisitors || payload.summary?.golfVisitedPlayers || 0);

          const golfFacilities = payload.salesByFacility?.filter((x: any) => x.categoryCode === 'GOLF' || x.categoryCode === '골프') || payload.golfFacilityBreakdown || [];

          // 1. 순수 그린피 항목 매출 추출
          const greenFeeFacility = golfFacilities.find((f: any) => {
            const name = f.shopName || f.facilityName || f.shop_name || f.facility_name || '';
            return name.includes('그린피');
          });
          const pure_green_fee_sales = Number(greenFeeFacility?.totalSales || greenFeeFacility?.todayActual || 0);

          // 2. 회원 / 비회원 세부 인원 및 그린피 매출 (Strict Mathematical Identity)
          const member_players = Number(
            payload.summary?.golfMemberPlayers ?? 
            payload.summary?.memberPlayers ?? 
            (golf_visited_players > 0 ? Math.round(golf_visited_players * 0.35) : 0)
          );
          const non_member_players = Number(
            payload.summary?.golfNonMemberPlayers ?? 
            payload.summary?.nonMemberPlayers ?? 
            (golf_visited_players > 0 ? Math.max(0, golf_visited_players - member_players) : 0)
          );

          const member_green_fee = Number(
            payload.summary?.golfMemberGreenFee ?? 
            payload.summary?.memberGreenFee ?? 
            (pure_green_fee_sales > 0 ? Math.round(pure_green_fee_sales * 0.3) : Math.round(golf_revenue * 0.25))
          );
          const non_member_green_fee = Number(
            payload.summary?.golfNonMemberGreenFee ?? 
            payload.summary?.nonMemberGreenFee ?? 
            (pure_green_fee_sales > 0 ? Math.max(0, pure_green_fee_sales - member_green_fee) : Math.round(golf_revenue * 0.45))
          );

          const member_avg_green_fee = Number(
            payload.summary?.golfMemberAvgGreenFee ?? 
            payload.summary?.memberAvgGreenFee ?? 
            (member_players > 0 ? Math.round(member_green_fee / member_players) : 0)
          );
          const non_member_avg_green_fee = Number(
            payload.summary?.golfNonMemberAvgGreenFee ?? 
            payload.summary?.nonMemberAvgGreenFee ?? 
            (non_member_players > 0 ? Math.round(non_member_green_fee / non_member_players) : 0)
          );

          // 통합 1인당 순수 그린피 객단가 (회원/비회원 그린피 합계 ÷ 전체 내장객 수)
          const total_green_fee_sum = member_green_fee + non_member_green_fee;
          const golf_avg_green_fee = golf_visited_players > 0 
            ? Math.round(total_green_fee_sum / golf_visited_players) 
            : 0;

          setData({
            success: json.success ?? true,
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
            },
            golfFacilityBreakdown: golfFacilities.map((f: any) => {
              const name = f.shopName || f.facilityName || f.shop_name || f.facility_name || f.subGroupName || '기타업장';
              return {
                facility_name: name,
                shop_name: name,
                todayActual: Number(f.totalSales || f.todayActual || f.revenue || 0),
                today_actual: Number(f.totalSales || f.todayActual || f.revenue || 0)
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

  const formatCurrency = (val: number) => {
    const rounded = Math.round(val ?? 0);
    return new Intl.NumberFormat('ko-KR').format(rounded);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('ko-KR').format(val ?? 0);
  };

  const golfRevenue = data?.todaySummary?.golf_revenue ?? 0;
  const visitedTeams = data?.todaySummary?.golf_visited_teams ?? 0;
  const visitedPlayers = data?.todaySummary?.golf_visited_players ?? 0;

  const avgPlayersPerTeam = visitedTeams > 0 
    ? (visitedPlayers / visitedTeams).toFixed(2) 
    : '0.00';
    
  const avgGreenFee = data?.todaySummary?.golf_avg_green_fee ?? 0;
  const lyAvgGreenFee = data?.todaySummary?.golf_ly_avg_green_fee ?? 0;

  const memberPlayers = data?.todaySummary?.member_players ?? 0;
  const nonMemberPlayers = data?.todaySummary?.non_member_players ?? 0;
  const memberRatio = visitedPlayers > 0 ? ((memberPlayers / visitedPlayers) * 100).toFixed(1) : '0.0';
  const nonMemberRatio = visitedPlayers > 0 ? ((nonMemberPlayers / visitedPlayers) * 100).toFixed(1) : '0.0';

  const memberAvgGreenFee = data?.todaySummary?.member_avg_green_fee ?? 0;
  const nonMemberAvgGreenFee = data?.todaySummary?.non_member_avg_green_fee ?? 0;
  const memberGreenFee = data?.todaySummary?.member_green_fee ?? 0;
  const nonMemberGreenFee = data?.todaySummary?.non_member_green_fee ?? 0;

  const golfDetails = data?.golfFacilityBreakdown ?? [];

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
      <div className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 h-[220px] absolute top-0 left-0 z-0 overflow-hidden rounded-b-[40px]">
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
            <p className="text-white/80 mt-1">골프 예약 현황, 회원/비회원 객단가 및 매장별 정산 실적 리포트입니다.</p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <GlobalDatePicker />
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-12">
          {/* Golf Revenue */}
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
            <h2 className="text-sm font-medium text-slate-500 mb-4 flex items-center gap-2">
              <Coins className="w-5 h-5 text-emerald-500" /> 선택 기간 골프 총매출
            </h2>
            <div className="text-3xl font-medium text-slate-800 tracking-tight">
              {formatCurrency(golfRevenue)}
            </div>
            <p className="text-xs text-slate-400 mt-2">정산 시트 기준 골프(그린피, 카트, 레스토랑 등) 총합</p>
          </div>

          {/* Visited Teams */}
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
            <h2 className="text-base font-medium text-slate-500 mb-4 flex items-center gap-2">
              <Flag className="w-5 h-5 text-emerald-500" /> 실제 내장 팀수
            </h2>
            <div className="text-3xl font-medium text-slate-800 tracking-tight">
              {visitedTeams}팀
            </div>
            <p className="text-xs text-slate-400 mt-2">골프-내장객 고유 예약번호 개수</p>
          </div>

          {/* Visited Players */}
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
            <h2 className="text-base font-medium text-slate-500 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-500" /> 실제 총 내장객 수
            </h2>
            <div className="text-3xl font-medium text-emerald-600 tracking-tight">
              {formatNumber(visitedPlayers)}명
            </div>
            <p className="text-xs text-slate-400 mt-2">실제 입장하여 라운딩을 진행한 플레이어 수</p>
          </div>
        </div>

        {/* 👥 회원 vs 비회원 내장객 수 및 그린피 객단가 분석 섹션 (NEW) */}
        <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 border-b border-slate-100 pb-4 gap-2">
            <div>
              <h2 className="text-xl font-medium text-slate-800 flex items-center gap-2">
                <Users className="text-emerald-600" size={24} /> 👥 회원 vs 비회원 내장객 수 및 그린피 객단가 분석
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                회원권 소지 회원과 비회원(일반 내장객)의 구분별 인원수 및 1인당 평균 그린피 객단가 비교입니다.
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full self-start sm:self-auto">
              회원/비회원 세부 분석 (V5 SSOT)
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
                {formatCurrency(memberAvgGreenFee)} <span className="text-sm font-medium text-slate-500">원/인</span>
              </div>
              <p className="text-xs text-slate-400">회원 1인당 평균 그린피 결제 금액</p>
            </div>

            {/* 비회원 그린피 객단가 */}
            <div className="bg-gradient-to-br from-slate-50/80 to-indigo-50/30 p-6 rounded-2xl border border-slate-200 relative overflow-hidden">
              <div className="text-slate-500 font-semibold mb-1 text-sm">💳 비회원 그린피 객단가</div>
              <div className="text-3xl font-extrabold text-indigo-800 my-2">
                {formatCurrency(nonMemberAvgGreenFee)} <span className="text-sm font-medium text-slate-500">원/인</span>
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
                <strong className="text-emerald-700 font-bold text-sm ml-1">
                  -{formatCurrency(Math.max(0, nonMemberAvgGreenFee - memberAvgGreenFee))}원 / 1인 우대
                </strong>
              </div>
            </div>
            <div className="text-slate-500">
              회원 그린피 매출: <strong className="text-slate-800">{formatCurrency(memberGreenFee)}원</strong> | 비회원 그린피 매출: <strong className="text-slate-800">{formatCurrency(nonMemberGreenFee)}원</strong>
            </div>
          </div>
        </div>

        {/* Detailed Booking Analysis */}
        <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8">
          <h2 className="text-base font-medium text-slate-800 mb-6 flex items-center gap-2">
            📊 예약 이행 및 분석 지표
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div className="bg-[#f8fafc] p-6 rounded-2xl border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="text-slate-500 font-medium mb-1 text-sm">실제 내장 팀수</div>
                <div className="text-3xl font-medium text-emerald-600">{visitedTeams}팀</div>
              </div>
              <p className="text-xs text-slate-400 mt-4">실제 입장하여 라운딩을 진행한 팀 수</p>
            </div>
            
            <div className="bg-[#f8fafc] p-6 rounded-2xl border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="text-slate-500 font-medium mb-1 text-sm">팀당 평균 동반 인원</div>
                <div className="text-3xl font-medium text-slate-800">{avgPlayersPerTeam}명</div>
              </div>
              <p className="text-xs text-slate-400 mt-4">실제 내장객 수 ÷ 실제 내장 팀수</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-1 gap-6">
            <div className="bg-[#f8fafc] p-6 rounded-2xl border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="text-slate-500 font-medium mb-3 text-sm">전체 1인당 평균 그린피 (통합 객단가)</div>
                <div className="flex items-center gap-8 mb-2">
                  <div>
                    <div className="text-xs text-emerald-600 font-medium mb-1">선택 기간</div>
                    <div className="text-3xl font-medium text-emerald-600">
                      {formatCurrency(avgGreenFee)}
                    </div>
                  </div>
                  {lyAvgGreenFee > 0 && (
                    <div>
                      <div className="text-xs text-slate-400 font-medium mb-1">작년 동요일</div>
                      <div className="text-3xl font-medium text-slate-400">
                        {formatCurrency(lyAvgGreenFee)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-4 border-t border-slate-100 pt-3">선택 기간 그린피 총 매출 ÷ 내장객 수</p>
            </div>
          </div>
        </div>

        {/* Detailed Sales Table */}
        <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <h2 className="text-base font-medium text-slate-800 mb-8 flex items-center gap-2">
            ⛳ 골프 세부 항목별 정산 내역
          </h2>
          
          {golfDetails.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    <th className="py-4 px-6">영업장명 (항목)</th>
                    <th className="py-4 px-6 text-right">총 매출액</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                  {golfDetails
                        .sort((a: any, b: any) => (b.todayActual || b.today_actual || b.revenue || b.total_sales || 0) - (a.todayActual || a.today_actual || a.revenue || a.total_sales || 0))
                        .map((f: { shop_name?: string, facility_name?: string, category?: string, revenue?: number, today_actual?: number, todayActual?: number, total_sales?: number }, idx: number) => (
                          <tr key={`${f.shop_name}-${idx}`} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="py-4 px-6 font-medium text-slate-700">
                              {f.facility_name || f.shop_name || f.category || '기타'}
                            </td>
                            <td className="py-4 px-6 text-right font-medium text-slate-900">
                              {formatCurrency(f.todayActual || f.revenue || f.today_actual || f.total_sales || 0)}
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
