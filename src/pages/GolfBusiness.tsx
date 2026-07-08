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
        const queryParams = startDate === endDate 
          ? `date=${endDate}` 
          : `startDate=${startDate}&endDate=${endDate}`;
        const json = await secureFetcher(`https://belleforet-data.vercel.app/api/v3/dashboard/revenue-summary?${queryParams}`);
        const payload = json.data ?? json;
        if (payload) {
          const golfBreakdown = payload.golfFacilityBreakdown ?? [];
          const filteredBreakdown = golfBreakdown;
          const golf_revenue = payload.golfSummary?.golfRevenue ?? payload.golfSummary?.gross ?? golfBreakdown.reduce((sum: number, x: any) => sum + (Number(x.today_actual) || 0), 0);
          setData({
            success: json.success ?? true,
            date: payload.date ?? endDate,
            todaySummary: {
              golf_revenue: golf_revenue,
              golf_visited_teams: payload.golfSummary?.visited_teams ?? payload.golfSummary?.visitedTeams ?? 0,
              golf_visited_players: payload.golfSummary?.visited_players ?? payload.golfSummary?.visitedPlayers ?? 0,
              golf_avg_green_fee: payload.golfSummary?.avg_green_fee ?? payload.golfSummary?.avgGreenFee ?? 0,
              golf_ly_avg_green_fee: payload.golfSummary?.ly_avg_green_fee ?? payload.golfSummary?.ly_avgGreenFee ?? 0,
            },
            golfFacilityBreakdown: filteredBreakdown
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
            <p className="text-white/80 mt-1">골프 예약 현황 및 매장별 정산 실적 리포트입니다.</p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <GlobalDatePicker allowRange={true} />
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
                <div className="text-slate-500 font-medium mb-3 text-sm">1인당 평균 그린피 (객단가)</div>
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
                  {golfDetails.map((row, index) => (
                    <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-6 font-medium text-slate-700">{row.shop_name}</td>
                      <td className="py-4 px-6 text-right font-medium text-slate-900">{formatCurrency(row.today_actual || 0)}</td>
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
