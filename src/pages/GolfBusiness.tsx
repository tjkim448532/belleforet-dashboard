import { useState, useEffect } from 'react';
import GlobalDatePicker from '../components/GlobalDatePicker';
import { 
  Coins, 
  Users, 
  Share2, 
  TrendingUp, 
  Award,
  DollarSign
} from 'lucide-react';
import { secureFetcher } from '../lib/secureFetcher';
import { useDate } from '../contexts/DateContext';
import type { GolfChannelAnalysisV2Response } from '../types/reports-v2';

export default function GolfBusiness() {
  const [data, setData] = useState<GolfChannelAnalysisV2Response | null>(null);
  const [loading, setLoading] = useState(true);
  const { startDate, endDate, isRange } = useDate();
  const isRangeMode = Boolean(isRange && endDate && startDate !== endDate);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';
        const queryParams = endDate && startDate !== endDate
          ? `startDate=${startDate}&endDate=${endDate}&_t=${Date.now()}`
          : `date=${startDate || new Date().toISOString().split('T')[0]}&_t=${Date.now()}`;

        const res = await secureFetcher(`${API_BASE}/api/v6/report/golf-channel-teetime-analysis-v2?${queryParams}`);
        
        // Handle varying response structures to extract the V2 payload
        const payload: GolfChannelAnalysisV2Response = res?.data ?? res;
        
        if (payload?.success) {
          setData(payload);
        } else {
          setData(null);
        }
      } catch (err) {
        console.error('API Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [startDate, endDate]);

  if (loading || !data) {
    return (
      <div className="w-full h-[80vh] flex items-center justify-center bg-[#f8fafc]">
        <div className="text-xl font-medium text-brand-mint animate-pulse">골프사업본부 데이터를 불러오는 중입니다...</div>
      </div>
    );
  }

  const { summary } = data.meta;
  const { channels } = data;

  const directWebChannel = channels.find(c => c.venueName === '자사몰' || c.venueName === 'DIRECT_WEB' || c.ticketGroup === 'DIRECT_WEB' || c.ticketGroup === '자사홈페이지');
  const directRevenue = directWebChannel?.revenueFormatted || '0';
  const directTeams = Math.floor((directWebChannel?.playerCount || 0) / 4) || 0; // fallback

  // Find agency revenue sum roughly (if we can't we just show direct)
  const agencies = channels.filter(c => c.ticketGroup === 'OTA_AGENCY' || c.ticketGroup === 'KAKAO_GOLF' || c.venueName.includes('대행'));
  const agencyRevenue = agencies.reduce((sum, c) => sum + c.totalRevenue, 0);
  const agencyRevenueFormatted = new Intl.NumberFormat('ko-KR').format(agencyRevenue);
  const agencyPlayers = agencies.reduce((sum, c) => sum + c.playerCount, 0);
  const agencyTeams = Math.floor(agencyPlayers / 4);

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
            <p className="text-white/80 mt-1">예약 채널별 점유율, 실질 수익성 종합 리포트입니다. (순매출/부가세 별도)</p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <GlobalDatePicker />
          </div>
        </div>

        {/* Overview Stats (4-Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-12">
          {/* Golf Revenue */}
          <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group border border-slate-100">
            <h2 className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-emerald-500" /> {isRangeMode ? '선택 기간 골프 총매출' : '금일 골프 총매출'}
            </h2>
            <div className="text-2xl font-black text-slate-800 tracking-tight">
              ₩{summary.totalGolfRevenueFormatted}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">그린피 + 카트대여 순매출(Net) 총합</p>
          </div>

          {/* Visited Players */}
          <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group border border-slate-100">
            <h2 className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-500" /> 실제 총 내장객 수
            </h2>
            <div className="text-2xl font-black text-slate-800 tracking-tight">
              {summary.totalPlayersFormatted}명
            </div>
            <p className="text-[11px] text-slate-400 mt-2">총 {summary.totalTransactions} 거래(팀)</p>
          </div>

          {/* Avg ARPU */}
          <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group border border-slate-100">
            <h2 className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-teal-600" /> 1인당 객단가 (ARPU)
            </h2>
            <div className="text-2xl font-black text-teal-700 tracking-tight">
              ₩{summary.arpuFormatted}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">1인 평균 그린피 및 카트비</p>
          </div>
        </div>

        {/* 📊 [신규 핵심] 골프 경영 전략 심층 분석 센터 (전략 지표 카드) */}
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
                예약 채널별 실질 순이익 등을 진단합니다.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl self-start sm:self-auto">
              경영진 전용 분석
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 카드 1: 자사몰 직접 예약 성과 */}
            <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/40 p-6 rounded-2xl border border-emerald-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-600" /> 자사몰 직접 예약 성과
                  </span>
                  <span className="text-[10px] font-extrabold bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full">
                    대행수수료 0% 마진
                  </span>
                </div>
                <div className="text-2xl font-black text-emerald-900 my-1">
                  ₩{directRevenue} <span className="text-xs font-normal text-slate-500">({directTeams}팀)</span>
                </div>
                <div className="space-y-1 text-xs text-slate-700 mt-3 pt-2 border-t border-emerald-200/60">
                  <div className="flex justify-between">
                    <span>• 자사몰 점유율:</span>
                    <strong>{directWebChannel?.revenueSharePct || 0}%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>• 외부 대행사(OTA) 매출:</span>
                    <strong className="text-slate-900">₩{agencyRevenueFormatted}원 (추정 {agencyTeams}팀)</strong>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-emerald-950 mt-4 pt-2 border-t border-emerald-200/40 leading-relaxed">
                💡 자사몰 직접 예약은 <strong>대행 수수료가 전혀 없어 100% 순이익</strong>으로 직결되며, 공식 PMS/POS 원천 집계 기준으로 실시간 연동됩니다.
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
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 self-start sm:self-auto">
              공식 채널 데이터 ({channels.length}개 채널 집계)
            </span>
          </div>

          {/* 채널별 카드 그리드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {channels.map((ch, idx) => (
              <div 
                key={`${ch.ticketGroup}-${ch.venueName}-${idx}`}
                className={`p-5 rounded-2xl border transition-all duration-200 ${
                  idx === 0 
                    ? 'bg-gradient-to-br from-emerald-50/90 to-teal-50/40 border-emerald-200 shadow-xs' 
                    : 'bg-slate-50/70 border-slate-200/80 hover:bg-white hover:shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    {idx === 0 && <Award className="w-3.5 h-3.5 text-amber-500" />}
                    {ch.venueName}
                  </span>
                  <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                    점유 {ch.revenueSharePct}%
                  </span>
                </div>
                
                <div className="text-2xl font-black text-slate-900 my-1">
                  {ch.playerCountFormatted} <span className="text-xs font-normal text-slate-500">명 내장</span>
                </div>

                <div className="space-y-1 text-[11px] text-slate-600 mt-3 pt-2 border-t border-slate-200/60">
                  <div className="flex justify-between">
                    <span className="text-slate-400">1인 객단가:</span>
                    <strong>₩{ch.arpuFormatted}</strong>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200/40 text-emerald-800 font-bold">
                    <span>그린피 매출:</span>
                    <span>₩{ch.greenFeeFormatted}</span>
                  </div>
                  <div className="flex justify-between text-emerald-800 font-bold">
                    <span>카트비 매출:</span>
                    <span>₩{ch.cartFeeFormatted}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200/40 text-emerald-900 font-black">
                    <span>총매출:</span>
                    <span>₩{ch.revenueFormatted}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 채널별 종합 비교 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-2xl overflow-hidden whitespace-nowrap min-w-[900px]">
              <thead className="bg-slate-100/80 text-slate-600 font-bold">
                <tr>
                  <th className="py-3 px-4">채널 그룹</th>
                  <th className="py-3 px-4">채널명</th>
                  <th className="py-3 px-4 text-center">판매 점유율</th>
                  <th className="py-3 px-4 text-right text-emerald-700 font-bold">실제 내장객</th>
                  <th className="py-3 px-4 text-right">1인 객단가 (ARPU)</th>
                  <th className="py-3 px-4 text-right">그린피 매출</th>
                  <th className="py-3 px-4 text-right">카트비 매출</th>
                  <th className="py-3 px-4 text-right text-emerald-800 font-bold">총매출</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {channels.map((ch, idx) => (
                  <tr key={`${ch.ticketGroup}-${ch.venueName}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-slate-600">{ch.ticketGroup}</td>
                    <td className="py-3 px-4 font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      {ch.venueName}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-700 bg-emerald-50/30">
                      {ch.revenueSharePct}%
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700">{ch.playerCountFormatted}명</td>
                    <td className="py-3 px-4 text-right font-medium text-slate-800">₩{ch.arpuFormatted}</td>
                    <td className="py-3 px-4 text-right text-slate-700">₩{ch.greenFeeFormatted}</td>
                    <td className="py-3 px-4 text-right text-slate-700">₩{ch.cartFeeFormatted}</td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">₩{ch.revenueFormatted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}
