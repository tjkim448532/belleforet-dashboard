import { useState, useEffect, useMemo } from 'react';
import GlobalDatePicker from '../components/GlobalDatePicker';
import { 
  Coins, 
  Users, 
  Share2, 
  TrendingUp, 
  Award,
  DollarSign,
  UtensilsCrossed
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

  const normalizedChannels = useMemo(() => {
    if (!data?.channels) return [];
    return data.channels.map((c: any) => {
      const venueName = c.venueName || c.venue_name || '기타';
      const productGroup = c.productGroup || c.product_group || c.ticketGroup || c.ticket_group || '일반';
      const revenue = Number(c.revenue || c.totalRevenue || 0);
      const revenueFormatted = c.revenueFormatted || c.revenue_formatted || Math.round(revenue).toLocaleString();
      const quantity = Number(c.quantity || 0);
      const quantityFormatted = c.quantityFormatted || c.quantity_formatted || quantity.toLocaleString();
      const players = Number(c.players || c.playerCount || 0);
      const playersFormatted = c.playersFormatted || c.players_formatted || c.playerCountFormatted || players.toLocaleString();
      const revenueSharePct = Number(c.revenueSharePct ?? c.revenue_share_pct ?? 0);
      
      const isGreenFee = venueName.includes('그린피') || productGroup.includes('그린피');
      const isCart = venueName.includes('카트') || productGroup.includes('카트');
      
      let displayUnit = '건 결제';
      let displayCountFormatted = quantityFormatted;
      if (isGreenFee) {
        displayUnit = '명 내장';
        displayCountFormatted = playersFormatted !== '0' ? playersFormatted : quantityFormatted;
      } else if (isCart) {
        displayUnit = '대 대여';
      }

      const unitPrice = players > 0 
        ? Math.round(revenue / players) 
        : (quantity > 0 ? Math.round(revenue / quantity) : 0);

      return {
        venueName,
        productGroup,
        revenue,
        revenueFormatted,
        quantity,
        quantityFormatted,
        players,
        playersFormatted,
        revenueSharePct,
        displayUnit,
        displayCountFormatted,
        unitPrice,
        unitPriceFormatted: unitPrice > 0 ? unitPrice.toLocaleString() : '-'
      };
    });
  }, [data]);

  if (loading || !data) {
    return (
      <div className="w-full h-[80vh] flex items-center justify-center bg-[#f8fafc]">
        <div className="text-xl font-medium text-brand-mint animate-pulse">골프사업본부 데이터를 불러오는 중입니다...</div>
      </div>
    );
  }

  const { summary } = data.meta;

  const greenFeeItem = normalizedChannels.find(c => c.venueName.includes('그린피') || c.productGroup.includes('그린피'));
  const cartFeeItem = normalizedChannels.find(c => c.venueName.includes('카트') || c.productGroup.includes('카트'));
  const startHouseItem = normalizedChannels.find(c => c.venueName.includes('스타트'));
  const restaurantItem = normalizedChannels.find(c => c.venueName.includes('레스토랑'));
  const proShopItem = normalizedChannels.find(c => c.venueName.includes('프로샵'));

  const courseCoreRatio = ((greenFeeItem?.revenueSharePct || 0) + (cartFeeItem?.revenueSharePct || 0)).toFixed(1);
  const amenityRatio = (100 - Number(courseCoreRatio)).toFixed(1);

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
            <p className="text-white/80 mt-1">골프 부문별 영업장 실적 및 실질 수익성 종합 리포트입니다. (순매출/부가세 별도)</p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <GlobalDatePicker />
          </div>
        </div>

        {/* Overview Stats (3-Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-12">
          {/* Golf Revenue */}
          <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group border border-slate-100">
            <h2 className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-emerald-500" /> {isRangeMode ? '선택 기간 골프 총매출' : '금일 골프 총매출'}
            </h2>
            <div className="text-2xl font-black text-slate-800 tracking-tight">
              ₩{summary.totalGolfRevenueFormatted}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">그린피 + 카트대여 + 부대시설 순매출(Net) 총합</p>
          </div>

          {/* Visited Players */}
          <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group border border-slate-100">
            <h2 className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-500" /> 실제 총 내장객 수
            </h2>
            <div className="text-2xl font-black text-slate-800 tracking-tight">
              {summary.totalPlayersFormatted}명
            </div>
            <p className="text-[11px] text-slate-400 mt-2">총 {summary.totalTransactions.toLocaleString()} 결제/거래 건</p>
          </div>

          {/* Avg ARPU */}
          <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group border border-slate-100">
            <h2 className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-teal-600" /> 1인당 객단가 (ARPU)
            </h2>
            <div className="text-2xl font-black text-teal-700 tracking-tight">
              ₩{summary.arpuFormatted}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">내장객 1인당 평균 골프 소비액</p>
          </div>
        </div>

        {/* 📊 골프 경영 핵심 분석 및 수익성 진단 */}
        <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8 border border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 border-b border-slate-100 pb-4 gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                  경영 전략 의사결정 지표
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  100% 팩트 데이터 기반 (V6 SSOT)
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                📈 골프 경영 핵심 분석 및 수익 구조 진단
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                코스 본원 매출(그린피/카트비)과 클럽 부대시설(식음/용품)의 수익 기여도를 진단합니다.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl self-start sm:self-auto">
              경영진 전용 분석
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 카드 1: 코스 핵심 수익 (그린피 + 카트비) */}
            <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/40 p-6 rounded-2xl border border-emerald-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-600" /> 코스 본원 매출 성과 (그린피 + 카트대여)
                  </span>
                  <span className="text-[10px] font-extrabold bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full">
                    핵심 매출 기여도 {courseCoreRatio}%
                  </span>
                </div>
                <div className="text-2xl font-black text-emerald-900 my-1">
                  ₩{greenFeeItem?.revenueFormatted || '0'} <span className="text-xs font-normal text-slate-500">({greenFeeItem?.playersFormatted || '0'}명 내장)</span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-700 mt-3 pt-2 border-t border-emerald-200/60">
                  <div className="flex justify-between">
                    <span>• 그린피 순매출 (점유율):</span>
                    <strong>₩{greenFeeItem?.revenueFormatted || '0'} ({greenFeeItem?.revenueSharePct || 0}%)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>• 카트대여 순매출 (점유율):</span>
                    <strong className="text-slate-900">₩{cartFeeItem?.revenueFormatted || '0'} ({cartFeeItem?.revenueSharePct || 0}%)</strong>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-emerald-950 mt-4 pt-2 border-t border-emerald-200/40 leading-relaxed">
                💡 순수 라운딩 코스 매출(그린피 + 카트비)이 전체 골프 부문 매출의 <strong>{courseCoreRatio}%</strong>를 견인하고 있습니다.
              </p>
            </div>

            {/* 카드 2: 클럽 부대시설 부가 수익 (식음 + 프로샵) */}
            <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 p-6 rounded-2xl border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <UtensilsCrossed className="w-4 h-4 text-blue-600" /> 클럽 부대시설 수익 성과 (식음료 및 프로샵)
                  </span>
                  <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                    부가 매출 기여도 {amenityRatio}%
                  </span>
                </div>
                <div className="text-2xl font-black text-slate-900 my-1">
                  ₩{((startHouseItem?.revenue || 0) + (restaurantItem?.revenue || 0) + (proShopItem?.revenue || 0)).toLocaleString()}
                  <span className="text-xs font-normal text-slate-500"> (총 {((startHouseItem?.quantity || 0) + (restaurantItem?.quantity || 0) + (proShopItem?.quantity || 0)).toLocaleString()}건)</span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-700 mt-3 pt-2 border-t border-slate-200">
                  <div className="flex justify-between">
                    <span>• 스타트하우스 식음:</span>
                    <strong>₩{startHouseItem?.revenueFormatted || '0'} ({startHouseItem?.revenueSharePct || 0}%)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>• 클럽 레스토랑 식음:</span>
                    <strong>₩{restaurantItem?.revenueFormatted || '0'} ({restaurantItem?.revenueSharePct || 0}%)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>• 프로샵 용품 매출:</span>
                    <strong>₩{proShopItem?.revenueFormatted || '0'} ({proShopItem?.revenueSharePct || 0}%)</strong>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 mt-4 pt-2 border-t border-slate-200 leading-relaxed">
                💡 라운딩 전후 식음 및 용품 구매를 통한 부가 매출이 전체 골프 부문 매출의 <strong>{amenityRatio}%</strong>를 차지하고 있습니다.
              </p>
            </div>

          </div>
        </div>

        {/* 🏆 골프 부문별 영업장 실적 및 점유율 분석 섹션 */}
        <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8 border border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 border-b border-slate-100 pb-4 gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  영업장별 실적
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  순매출/VAT 제외 기준
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Share2 className="text-emerald-600" size={24} /> 🏆 골프 부문별 영업장 실적, 판매량 및 점유율 분석
              </h2>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 self-start sm:self-auto">
              공식 마트 데이터 ({normalizedChannels.length}개 부문 집계)
            </span>
          </div>

          {/* 채널/영업장별 카드 그리드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {normalizedChannels.map((ch, idx) => (
              <div 
                key={`${ch.productGroup}-${ch.venueName}-${idx}`}
                className={`p-5 rounded-2xl border transition-all duration-200 ${
                  idx === 0 
                    ? 'bg-gradient-to-br from-emerald-50/90 to-teal-50/40 border-emerald-200 shadow-xs' 
                    : 'bg-slate-50/70 border-slate-200/80 hover:bg-white hover:shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    {idx === 0 && <Award className="w-3.5 h-3.5 text-amber-500" />}
                    {ch.venueName}
                  </span>
                  <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                    점유 {ch.revenueSharePct}%
                  </span>
                </div>
                
                <div className="text-2xl font-black text-slate-900 my-1">
                  {ch.displayCountFormatted} <span className="text-xs font-normal text-slate-500">{ch.displayUnit}</span>
                </div>

                <div className="space-y-1.5 text-[11px] text-slate-600 mt-3 pt-2 border-t border-slate-200/60">
                  <div className="flex justify-between">
                    <span className="text-slate-400">상품 분류:</span>
                    <strong className="text-slate-700">{ch.productGroup}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">평균 단가:</span>
                    <strong>₩{ch.unitPriceFormatted}</strong>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200/40 text-emerald-900 font-black">
                    <span>순매출:</span>
                    <span>₩{ch.revenueFormatted}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 종합 비교 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-2xl overflow-hidden whitespace-nowrap min-w-[900px]">
              <thead className="bg-slate-100/80 text-slate-600 font-bold">
                <tr>
                  <th className="py-3 px-4">영업장 / 시설명</th>
                  <th className="py-3 px-4">상품 분류</th>
                  <th className="py-3 px-4 text-center">매출 점유율</th>
                  <th className="py-3 px-4 text-right text-emerald-700 font-bold">실제 내장객 (명)</th>
                  <th className="py-3 px-4 text-right">판매 수량 (건/대)</th>
                  <th className="py-3 px-4 text-right">평균 단가</th>
                  <th className="py-3 px-4 text-right text-emerald-800 font-bold">순매출</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {normalizedChannels.map((ch, idx) => (
                  <tr key={`${ch.productGroup}-${ch.venueName}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      {ch.venueName}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{ch.productGroup}</td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-700 bg-emerald-50/30">
                      {ch.revenueSharePct}%
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700">
                      {ch.players > 0 ? `${ch.playersFormatted}명` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700">
                      {ch.quantityFormatted}건
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-800">
                      ₩{ch.unitPriceFormatted}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">
                      ₩{ch.revenueFormatted}
                    </td>
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
