import { useState, useEffect, useMemo } from 'react';
import GlobalDatePicker from '../components/GlobalDatePicker';
import { 
  Coins, 
  Users, 
  Share2, 
  TrendingUp, 
  Award,
  DollarSign,
  UtensilsCrossed,
  Clock,
  UserCheck,
  Flag
} from 'lucide-react';
import { secureFetcher } from '../lib/secureFetcher';
import { useDate } from '../contexts/DateContext';
import { getLatestClosedDateStr } from '../lib/dateUtils';
import type { GolfChannelAnalysisV2Response } from '../types/reports-v2';
import MetricExplainerTooltip from '../components/common/MetricExplainerTooltip';

export default function GolfBusiness() {
  const [data, setData] = useState<GolfChannelAnalysisV2Response | null>(null);
  const [loading, setLoading] = useState(true);
  const { startDate, endDate, isRange } = useDate();
  const isRangeMode = Boolean(isRange && endDate && startDate !== endDate);

  useEffect(() => {
    const abortController = new AbortController();

    const fetchSummary = async () => {
      setLoading(true);
      const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';
      const queryParams = endDate && startDate !== endDate
        ? `startDate=${startDate}&endDate=${endDate}`
        : `date=${startDate || getLatestClosedDateStr()}`;

      try {
        const res = await secureFetcher(`${API_BASE}/api/v6/report/golf-channel-teetime-analysis-v2?${queryParams}`, {
          signal: abortController.signal
        });
        if (abortController.signal.aborted) return;
        const payload: GolfChannelAnalysisV2Response = res?.data ?? res;
        if (payload?.success) {
          setData(payload);
        } else {
          setData(null);
        }
      } catch (err: any) {
        if (abortController.signal.aborted || err?.name === 'AbortError') return;
        console.warn('[GolfBusiness] 상세 티타임 리포트 조회 실패:', err?.message);
        setData(null);
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchSummary();

    return () => {
      abortController.abort();
    };
  }, [startDate, endDate, isRange]);

  const effectiveData = useMemo<GolfChannelAnalysisV2Response | null>(() => {
    if (data?.success && data?.meta?.summary) {
      return data;
    }
    return null;
  }, [data]);

  const normalizedChannels = useMemo(() => {
    if (!effectiveData?.channels) return [];
    return effectiveData.channels
      .map((c: any) => {
        const venueName = c.venueName || '기타';
        const productCode = c.productCode || c.productGroup || c.ticketGroup || 'GENERAL';
        const productGroup = c.productGroup || c.ticketGroup || '일반';
        const revenue = Number(c.revenue || c.totalRevenue || 0);
        const revenueFormatted = c.revenueFormatted || Math.round(revenue).toLocaleString();
        const quantity = Number(c.quantity || 0);
        const quantityFormatted = c.quantityFormatted || quantity.toLocaleString();
        const players = Number(c.players || c.playerCount || 0);
        const playersFormatted = c.playersFormatted || c.playerCountFormatted || players.toLocaleString();
        const rawShare = c.revenueSharePct;
        const revenueSharePct = rawShare !== undefined && rawShare !== null ? Number(rawShare) : null;
        
        const displayUnit = c.displayUnit || (players > 0 ? '명 내장' : '건 결제');
        const displayCountFormatted = players > 0 ? (playersFormatted !== '0' ? playersFormatted : quantityFormatted) : quantityFormatted;

        const unitPrice = Number(c.unitPrice ?? 0);

        const displayName = c.displayName || venueName;
        const description = c.description || '';

        return {
          venueName,
          displayName,
          description,
          productCode,
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
      })
      // 0원짜리 실적 없는 더미 항목 및 원장 계정 필터링
      .filter((c: any) => {
        const isLedger = c.isLedger === true || c.accountType === 'LEDGER';
        const isZero = (c.revenue === 0 && c.quantity === 0);
        return !isLedger && !isZero;
      });
  }, [effectiveData]);

  if (loading) {
    return (
      <div className="w-full h-[80vh] flex items-center justify-center bg-[#f8fafc]">
        <div className="text-xl font-medium text-brand-mint animate-pulse">골프사업본부 데이터를 불러오는 중입니다...</div>
      </div>
    );
  }

  if (!effectiveData) {
    return (
      <div className="w-full h-[80vh] flex items-center justify-center bg-[#f8fafc]">
        <div className="text-base font-medium text-slate-400">조회된 골프사업본부 실적 데이터가 없습니다.</div>
      </div>
    );
  }

  const { summary } = effectiveData.meta;

  const greenFeeItem = normalizedChannels.find(c => 
    c.productCode === 'GREEN_FEE' || c.productGroup === 'GREEN_FEE' || c.venueName === '그린피' || c.productGroup === '그린피'
  );
  const cartFeeItem = normalizedChannels.find(c => 
    c.productCode === 'CART_FEE' || c.productGroup === 'CART_FEE' || c.venueName === '카트대여' || c.productGroup === '카트대여'
  );
  const startHouseItem = normalizedChannels.find(c => 
    c.productCode === 'START_HOUSE' || c.productGroup === 'START_HOUSE' || c.venueName === '클럽-스타트하우스'
  );
  const restaurantItem = normalizedChannels.find(c => 
    c.productCode === 'RESTAURANT' || c.productGroup === 'RESTAURANT' || c.venueName === '클럽-레스토랑'
  );
  const proShopItem = normalizedChannels.find(c => 
    c.productCode === 'PRO_SHOP' || c.productGroup === 'PRO_SHOP' || c.venueName === '프로샵'
  );

  const etcItem = normalizedChannels.find(c =>
    c !== greenFeeItem && c !== cartFeeItem && c !== startHouseItem && c !== restaurantItem && c !== proShopItem
  );

  const totalCourseRevenue = summary.courseCoreRevenue !== undefined && summary.courseCoreRevenue !== null
    ? Number(summary.courseCoreRevenue)
    : null;

  const totalAmenityRevenue = summary.amenityRevenue !== undefined && summary.amenityRevenue !== null
    ? Number(summary.amenityRevenue)
    : null;

  const totalAmenityQuantity = summary.amenityQuantity !== undefined && summary.amenityQuantity !== null
    ? Number(summary.amenityQuantity)
    : null;

  const courseCoreRatio = summary.courseCoreRatio ?? null;
  const amenityRatio = summary.amenityRatio ?? null;

  const partAnalysis = effectiveData?.partAnalysis || summary?.partAnalysis;
  const membershipAnalysis = effectiveData?.membershipAnalysis || summary?.membershipAnalysis;

  return (
    <div className="w-full min-h-screen bg-[#F4F3EE] text-[#1B382E] tracking-tight pb-16">
      
      {/* 🌲 Luxury Deep Forest Banner with Ambient Glow (Home Style) */}
      <div className="w-full bg-[#284F42] h-[190px] absolute top-0 left-0 z-0 overflow-hidden rounded-b-[36px] border-b border-[#1B382E] shadow-xl">
        <div className="absolute -top-16 -right-16 w-96 h-96 rounded-full bg-[#2F5548] opacity-70 pointer-events-none" />
        <div className="absolute top-8 left-1/3 w-80 h-80 rounded-full bg-[#2F5548] opacity-40 blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 right-1/4 w-60 h-60 rounded-full bg-[#1B382E] opacity-60 pointer-events-none" />
      </div>

      <div className="w-full max-w-[1920px] mx-auto p-4 md:p-8 relative z-10 pt-8 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
          <div className="text-white">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1B382E]/80 border border-white/20 text-white/90 text-xs font-semibold backdrop-blur-xs shadow-xs mb-3">
              <span className="w-2 h-2 rounded-full bg-[#5FB878] animate-pulse" />
              <span>BELLEFORET RESORT · 골프사업본부</span>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <Flag className="w-7 h-7 text-[#B59269] shrink-0" />
              <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight break-keep whitespace-nowrap">
                골프사업본부 경영 현황
              </h1>
            </div>
            <p className="text-sm text-white/80 mt-1 break-keep">
              골프 부문별 영업장 실적 및 실질 수익성 종합 리포트 (순매출/부가세 별도)
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <GlobalDatePicker />
          </div>
        </div>

        {/* Overview Stats (3-Grid Bento Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-6">
          {/* Golf Revenue */}
          <div className="bg-white rounded-3xl p-6 lg:p-7 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] hover:shadow-[0_12px_32px_rgba(40,79,66,0.1)] transition-all duration-300 relative group flex flex-col justify-between h-full">
            <div>
              <h2 className="text-xs lg:text-sm font-bold text-[#5A6B63] mb-3 flex items-center gap-1.5">
                <Coins className="w-5 h-5 text-[#284F42]" /> 
                <span className="text-[#1B382E]">{isRangeMode ? '선택 기간 골프 총매출' : '금일 골프 총매출'}</span>
                <MetricExplainerTooltip presetKey="netRevenue" align="left" />
              </h2>
              <div className="text-2xl lg:text-3xl font-extrabold text-[#1B382E] tracking-tight font-financial">
                {summary.totalGolfRevenueFormatted}원
              </div>
            </div>
            <p className="text-[11px] text-[#6C7A73] mt-auto pt-3 border-t border-[#D0C6BB]/40 break-keep">그린피 + 카트대여 + 부대시설 순매출(Net) 총합</p>
          </div>

          {/* Visited Players */}
          <div className="bg-white rounded-3xl p-6 lg:p-7 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] hover:shadow-[0_12px_32px_rgba(40,79,66,0.1)] transition-all duration-300 relative group flex flex-col justify-between h-full">
            <div>
              <h2 className="text-xs lg:text-sm font-bold text-[#5A6B63] mb-3 flex items-center gap-1.5">
                <Users className="w-5 h-5 text-[#284F42]" /> 
                <span className="text-[#1B382E]">실제 총 내장객 수</span>
                <MetricExplainerTooltip presetKey="visitorCount" align="center" />
              </h2>
              <div className="text-2xl lg:text-3xl font-extrabold text-[#1B382E] tracking-tight font-financial">
                {summary.totalPlayersFormatted}명
              </div>
            </div>
            <p className="text-[11px] text-[#6C7A73] mt-auto pt-3 border-t border-[#D0C6BB]/40 break-keep">총 {summary.totalTransactions.toLocaleString()} 결제/거래 건</p>
          </div>

          {/* Avg ARPU */}
          <div className="bg-white rounded-3xl p-6 lg:p-7 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] hover:shadow-[0_12px_32px_rgba(40,79,66,0.1)] transition-all duration-300 relative group flex flex-col justify-between h-full">
            <div>
              <h2 className="text-xs lg:text-sm font-bold text-[#5A6B63] mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-5 h-5 text-[#B59269]" /> 
                <span className="text-[#1B382E]">1인당 객단가 (ARPU)</span>
                <MetricExplainerTooltip presetKey="arpu" align="left" />
              </h2>
              <div className="text-2xl lg:text-3xl font-extrabold text-[#1B382E] tracking-tight font-financial">
                {summary.arpuFormatted && summary.arpuFormatted !== '-' ? `${summary.arpuFormatted}원` : '-'}
              </div>
            </div>
            <p className="text-[11px] text-[#6C7A73] mt-auto pt-3 border-t border-[#D0C6BB]/40 break-keep">내장객 1인당 평균 골프 소비액</p>
          </div>
        </div>

        {/* 📊 골프 경영 핵심 분석 및 수익성 진단 */}
        <div className="bg-white rounded-3xl p-6 lg:p-8 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] hover:shadow-[0_12px_32px_rgba(40,79,66,0.1)] transition-all duration-300 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 pb-3 border-b border-[#D0C6BB]/60 gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#284F42]/10 text-[#284F42] border border-[#284F42]/20">
                  경영 전략 의사결정 지표
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#F4F3EE] text-[#5A6B63] border border-[#D0C6BB]/60">
                  공식 실적 데이터 기반
                </span>
              </div>
              <h2 className="text-lg lg:text-xl font-extrabold text-[#1B382E] flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#B59269]" />
                <span>골프 경영 핵심 분석 및 수익 구조 진단</span>
              </h2>
              <p className="text-xs text-[#5A6B63] mt-1">
                코스 본원 매출(그린피/카트비)과 클럽 부대시설(식음/용품)의 수익 기여도를 진단합니다.
              </p>
            </div>
            <span className="text-xs font-bold text-[#B59269] bg-[#B59269]/15 px-3 py-1.5 rounded-xl border border-[#B59269]/20 self-start sm:self-auto">
              경영진 전용 분석
            </span>
          </div>

          {/* 웜 리넨 소프트 패널 */}
          <div className="bg-[#F4F3EE] p-5 rounded-2xl border border-[#D0C6BB]/70">
            <h4 className="font-bold text-[#1B382E] mb-3 border-b border-[#D0C6BB]/60 pb-2 text-xs flex items-center justify-between">
              <span>코스 본원 및 클럽 부대시설 수익 구조 (그린피 · 카트대여 · 식음 · 프로샵)</span>
              <span className="text-[11px] text-[#5A6B63] font-normal">공식 골프 마트 원천 확정 기준</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* 카드 1: 코스 핵심 수익 (그린피 + 카트비) - 원포인트 틸 하이라이트 카드 */}
              <div className="bg-white p-5 rounded-2xl border border-teal-200/80 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-teal-600" /> 코스 본원 매출 성과 (그린피 + 카트대여)
                    </span>
                    <span className="text-[10px] font-black bg-teal-100 text-teal-800 px-2.5 py-0.5 rounded-full">
                      핵심 기여도 {courseCoreRatio !== null ? `${courseCoreRatio}%` : '-'}
                    </span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 my-1 font-financial tracking-tight">
                    {totalCourseRevenue !== null ? `${totalCourseRevenue.toLocaleString()}원` : '-'}{' '}
                    <span className="text-xs font-normal text-slate-400">({greenFeeItem?.playersFormatted || '0'}명 내장, 카트 {cartFeeItem?.quantityFormatted || '0'}건)</span>
                  </div>
                  <div className="p-2 rounded-lg bg-teal-50/70 font-mono text-[11px] text-teal-900 font-bold border border-teal-100 my-2 text-center">
                    그린피 + 카트대여 = {totalCourseRevenue !== null ? `${totalCourseRevenue.toLocaleString()}원` : '-'}
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-600 mt-3 pt-2.5 border-t border-slate-100 font-financial tabular-nums">
                    <div className="flex justify-between">
                      <span className="text-slate-400">그린피 순매출 (점유율):</span>
                      <strong className="text-slate-800">{greenFeeItem?.revenueFormatted || '0'}원 ({greenFeeItem?.revenueSharePct !== null && greenFeeItem?.revenueSharePct !== undefined ? `${greenFeeItem.revenueSharePct}%` : '-'})</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">카트대여 순매출 (점유율):</span>
                      <strong className="text-slate-800">{cartFeeItem?.revenueFormatted || '0'}원 ({cartFeeItem?.revenueSharePct !== null && cartFeeItem?.revenueSharePct !== undefined ? `${cartFeeItem.revenueSharePct}%` : '-'})</strong>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-4 pt-2.5 border-t border-slate-100 leading-relaxed">
                  순수 라운딩 코스 매출(그린피 + 카트비)이 전체 골프 부문 매출의 <strong className="text-slate-700">{courseCoreRatio !== null ? `${courseCoreRatio}%` : '-'}</strong>를 견인하고 있습니다.
                </p>
              </div>

              {/* 카드 2: 클럽 부대시설 부가 수익 (식음 + 프로샵 등) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <UtensilsCrossed className="w-4 h-4 text-slate-600" /> 클럽 부대시설 수익 성과 (식음료 및 프로샵 등)
                    </span>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200/60">
                      부가 기여도 {amenityRatio !== null ? `${amenityRatio}%` : '-'}
                    </span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 my-1 font-financial tracking-tight">
                    {totalAmenityRevenue !== null ? `${totalAmenityRevenue.toLocaleString()}원` : '-'}
                    {totalAmenityQuantity !== null && (
                      <span className="text-xs font-normal text-slate-400"> (총 {totalAmenityQuantity.toLocaleString()}건)</span>
                    )}
                  </div>
                  <div className="p-2 rounded-lg bg-slate-100 font-mono text-[11px] text-slate-800 font-bold border border-slate-200/60 my-2 text-center">
                    식음료 + 프로샵 = {totalAmenityRevenue !== null ? `${totalAmenityRevenue.toLocaleString()}원` : '-'}
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-600 mt-3 pt-2.5 border-t border-slate-100 font-financial tabular-nums">
                    <div className="flex justify-between">
                      <span className="text-slate-400">스타트하우스 식음:</span>
                      <strong className="text-slate-800">{startHouseItem?.revenueFormatted || '0'}원 ({startHouseItem?.revenueSharePct !== null && startHouseItem?.revenueSharePct !== undefined ? `${startHouseItem.revenueSharePct}%` : '-'})</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">클럽 레스토랑 식음:</span>
                      <strong className="text-slate-800">{restaurantItem?.revenueFormatted || '0'}원 ({restaurantItem?.revenueSharePct !== null && restaurantItem?.revenueSharePct !== undefined ? `${restaurantItem.revenueSharePct}%` : '-'})</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">프로샵 용품 매출:</span>
                      <strong className="text-slate-800">{proShopItem?.revenueFormatted || '0'}원 ({proShopItem?.revenueSharePct !== null && proShopItem?.revenueSharePct !== undefined ? `${proShopItem.revenueSharePct}%` : '-'})</strong>
                    </div>
                    {etcItem && etcItem.revenue > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">기타매출 및 대여:</span>
                        <strong className="text-slate-800">{etcItem.revenueFormatted}원 ({etcItem.revenueSharePct !== null && etcItem.revenueSharePct !== undefined ? `${etcItem.revenueSharePct}%` : '-'})</strong>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-4 pt-2.5 border-t border-slate-100 leading-relaxed">
                  라운딩 전후 식음 및 용품 구매를 통한 부가 매출이 전체 골프 부문 매출의 <strong className="text-slate-700">{amenityRatio !== null ? `${amenityRatio}%` : '-'}</strong>를 차지하고 있습니다.
                </p>
              </div>

            {/* 카드 3: 1부 · 2부 · 3부 티타임 성과 및 평균 그린피 */}
            {partAnalysis && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-slate-600" /> 1부 · 2부 · 3부 티타임 성과 및 평균 그린피
                    </span>
                    <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200/60">
                      전체 평균 {partAnalysis.overallAvgGreenFeeFormatted}원
                    </span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 my-1 font-financial tracking-tight">
                    {partAnalysis.totalVisitedTeams.toLocaleString()}팀 내장 완료
                    <span className="text-xs font-normal text-slate-400 ml-1.5">
                      (총 예약 {partAnalysis.totalReservedTeams.toLocaleString()}팀 / 취소 {partAnalysis.totalCanceledTeams.toLocaleString()}팀)
                    </span>
                  </div>

                  {/* 1부, 2부, 3부 Flattened Divide-x Row */}
                  {partAnalysis.parts && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/70 bg-slate-50/70 p-3 rounded-2xl border border-slate-100 my-3">
                      {[
                        { key: 'part1', data: partAnalysis.parts.part1, tag: '오전' },
                        { key: 'part2', data: partAnalysis.parts.part2, tag: '오후' },
                        { key: 'part3', data: partAnalysis.parts.part3, tag: '야간' }
                      ].map(({ key, data: p, tag }) => (
                        <div key={key} className="px-2.5 py-1.5 flex flex-col justify-between text-center">
                          <div>
                            <div className="flex items-center justify-center gap-1 mb-0.5">
                              <span className="text-xs font-bold text-slate-800">{p.name.slice(0, 2)}</span>
                              <span className="text-[10px] font-semibold text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-200">{tag}</span>
                            </div>
                            <div className="text-base font-black text-slate-900 font-financial tabular-nums">
                              {p.avgGreenFee > 0 ? `${p.avgGreenFeeFormatted}원` : '-'}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              평균 그린피 ({p.players > 0 ? `${p.players.toLocaleString()}명` : '-'})
                            </div>
                          </div>

                          <div className="pt-2 mt-2 border-t border-slate-200/50 text-[10px] space-y-1 font-financial tabular-nums text-slate-500">
                            <div className="flex justify-between">
                              <span className="text-slate-400">내장:</span>
                              <strong className="text-slate-700">
                                {p.visitedTeams > 0 ? `${p.visitedTeams}팀` : '-'}
                                {p.pendingTeams > 0 ? ` (진행 ${p.pendingTeams}팀)` : ''}
                              </strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">예약:</span>
                              <span>{p.reservedTeams}팀</span>
                            </div>
                            <div className="flex justify-between pt-0.5 border-t border-slate-200/40 text-slate-800 font-bold">
                              <span className="text-slate-400 font-normal">순매출:</span>
                              <span>{p.greenFeeRevenue > 0 ? `${Math.round(p.greenFeeRevenue).toLocaleString()}원` : '-'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 mt-4 pt-2.5 border-t border-slate-100 leading-relaxed font-financial">
                  시간대별(1부·2부·3부) 실시간 예약/내장/진행 팀수와 실제 결제된 1인당 평균 그린피 실측치입니다.
                </p>
              </div>
            )}

            {/* 카드 4: 회원 vs 비회원 내장 비중 및 그린피 단가 분석 */}
            {membershipAnalysis && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-slate-600" /> 회원 vs 비회원 내장 비중 및 그린피 단가 분석
                    </span>
                    <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200/60">
                      단가 격차 {membershipAnalysis.greenFeeGapFormatted}원
                    </span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 my-1 font-financial tracking-tight">
                    그린피 단가 격차: +{membershipAnalysis.greenFeeGapFormatted}원
                    <span className="text-xs font-normal text-slate-400 ml-1.5">
                      (비회원이 1인당 평균 {membershipAnalysis.greenFeeGapFormatted}원 추가 지불)
                    </span>
                  </div>

                  {/* 회원 vs 비회원 Flattened Divide-x Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/70 bg-slate-50/70 p-3 rounded-2xl border border-slate-100 my-3">
                    {/* 회원 컬럼 */}
                    <div className="px-3 py-2 flex flex-col justify-between text-center">
                      <div>
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                          <span className="text-xs font-bold text-slate-800">회원 (정회원/무기명)</span>
                          <span className="text-[10px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                            비중 {membershipAnalysis.member.playerRatio}%
                          </span>
                        </div>
                        <div className="text-lg font-black text-slate-900 font-financial tabular-nums">
                          {membershipAnalysis.member.avgGreenFeeFormatted}원
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          1인당 평균 그린피
                        </div>
                      </div>

                      <div className="pt-2 mt-2 border-t border-slate-200/50 text-[11px] space-y-1 font-financial tabular-nums text-slate-500">
                        <div className="flex justify-between">
                          <span className="text-slate-400">내장 인원:</span>
                          <strong className="text-slate-700">{membershipAnalysis.member.playersFormatted}명</strong>
                        </div>
                        <div className="flex justify-between pt-0.5 border-t border-slate-200/40 text-slate-800 font-bold">
                          <span className="text-slate-400 font-normal">그린피 순매출:</span>
                          <span>{membershipAnalysis.member.greenFeeRevenueFormatted}원</span>
                        </div>
                      </div>
                    </div>

                    {/* 비회원 컬럼 */}
                    <div className="px-3 py-2 flex flex-col justify-between text-center">
                      <div>
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                          <span className="text-xs font-bold text-slate-800">비회원 (일반/대중)</span>
                          <span className="text-[10px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                            비중 {membershipAnalysis.nonMember.playerRatio}%
                          </span>
                        </div>
                        <div className="text-lg font-black text-slate-900 font-financial tabular-nums">
                          {membershipAnalysis.nonMember.avgGreenFeeFormatted}원
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          1인당 평균 그린피
                        </div>
                      </div>

                      <div className="pt-2 mt-2 border-t border-slate-200/50 text-[11px] space-y-1 font-financial tabular-nums text-slate-500">
                        <div className="flex justify-between">
                          <span className="text-slate-400">내장 인원:</span>
                          <strong className="text-slate-700">{membershipAnalysis.nonMember.playersFormatted}명</strong>
                        </div>
                        <div className="flex justify-between pt-0.5 border-t border-slate-200/40 text-slate-800 font-bold">
                          <span className="text-slate-400 font-normal">그린피 순매출:</span>
                          <span>{membershipAnalysis.nonMember.greenFeeRevenueFormatted}원</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 mt-4 pt-2.5 border-t border-slate-100 leading-relaxed font-financial">
                  비회원 내장객 비중 <strong className="text-slate-700">{membershipAnalysis.nonMember.playerRatio}%</strong>이며, 비회원이 1인당 평균 <strong className="text-slate-700">+{membershipAnalysis.greenFeeGapFormatted}원</strong>의 그린피를 추가 지불하고 있습니다.
                </p>
              </div>
            )}

            </div>

            {/* 하단 공식 기준 배너 */}
            <div className="text-xs text-teal-800 bg-teal-50 p-3 rounded-xl mt-4 border border-teal-100 font-medium flex items-center justify-between flex-wrap gap-2">
              <span><strong>공식 산출 기준:</strong> 골프 부문 순매출(Net)은 그린피, 카트대여, 클럽하우스 식음, 프로샵 등 리조트 공식 ERP/POS 원천 확정 데이터를 기준으로 제공됩니다.</span>
              <span className="text-[11px] text-teal-600 font-mono font-normal">Golf SSOT Engine</span>
            </div>
          </div>
        </div>

        {/* 🏆 골프 부문별 영업장 실적 및 점유율 분석 섹션 */}
        <div className="bg-white rounded-3xl p-6 lg:p-8 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] hover:shadow-[0_12px_32px_rgba(40,79,66,0.1)] transition-all duration-300 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 border-b border-[#D0C6BB]/60 pb-4 gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#284F42]/10 text-[#284F42] border border-[#284F42]/20">
                  영업장별 실적
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#F4F3EE] text-[#5A6B63] border border-[#D0C6BB]/60">
                  순매출/VAT 제외 기준
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-[#1B382E] flex items-center gap-2">
                <Share2 className="text-[#284F42]" size={24} /> 🏆 골프 부문별 영업장 실적, 판매량 및 점유율 분석
              </h2>
            </div>
            <span className="text-xs font-bold text-[#B59269] bg-[#B59269]/15 px-3 py-1.5 rounded-xl border border-[#B59269]/20 self-start sm:self-auto">
              공식 마트 데이터 ({normalizedChannels.length}개 유효 부문)
            </span>
          </div>

          {/* 채널/영업장별 카드 그리드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {normalizedChannels.map((ch, idx) => (
              <div 
                key={`${ch.productGroup}-${ch.venueName}-${idx}`}
                className="bg-white p-5 rounded-3xl border border-[#D0C6BB]/75 shadow-xs hover:border-[#284F42]/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-1 gap-2">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[#1B382E] flex items-center gap-1">
                        {idx === 0 && <Award className="w-3.5 h-3.5 text-amber-500" />}
                        {ch.displayName}
                      </span>
                      {ch.description && (
                        <span className="text-[10px] text-[#6C7A73] font-medium mt-0.5">
                          {ch.description}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-bold bg-[#F4F3EE] text-[#1B382E] px-2 py-0.5 rounded-full whitespace-nowrap border border-[#D0C6BB]/60">
                      {ch.revenueSharePct !== null && ch.revenueSharePct !== undefined ? `점유 ${ch.revenueSharePct}%` : '점유 -'}
                    </span>
                  </div>
                  
                  <div className="text-2xl font-black text-[#1B382E] my-2 tabular-nums">
                    {ch.displayCountFormatted} <span className="text-xs font-normal text-[#6C7A73]">{ch.displayUnit}</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-[11px] text-[#5A6B63] mt-2 pt-2 border-t border-[#D0C6BB]/40 tabular-nums font-financial">
                  <div className="flex justify-between">
                    <span className="text-[#6C7A73]">상품 분류:</span>
                    <strong className="text-[#1B382E]">{ch.productGroup}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6C7A73]">평균 단가:</span>
                    <strong>{ch.unitPriceFormatted !== '-' ? `${ch.unitPriceFormatted}원` : '-'}</strong>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-[#D0C6BB]/40 text-[#1B382E] font-black">
                    <span className="text-[#6C7A73] font-normal">순매출:</span>
                    <span>{ch.revenueFormatted}원</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 종합 비교 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-[#D0C6BB]/75 rounded-2xl overflow-hidden whitespace-nowrap min-w-[900px]">
              <thead className="bg-[#F4F3EE] text-[#1B382E] font-bold border-b border-[#D0C6BB]/75">
                <tr>
                  <th className="py-3 px-4 text-left">영업장 / 시설명</th>
                  <th className="py-3 px-4 text-left">상품 분류</th>
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
                    <td className="py-3 px-4 font-bold text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>{ch.displayName}</span>
                      </div>
                      {ch.description && (
                        <div className="text-[10px] text-slate-400 font-normal ml-3.5 mt-0.5">
                          {ch.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{ch.productGroup}</td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-700 bg-emerald-50/30">
                      {ch.revenueSharePct !== null && ch.revenueSharePct !== undefined ? `${ch.revenueSharePct}%` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700">
                      {ch.players > 0 ? `${ch.playersFormatted}명` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700">
                      {ch.quantityFormatted}건
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-800">
                      {ch.unitPriceFormatted !== '-' ? `${ch.unitPriceFormatted}원` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">
                      {ch.revenueFormatted}원
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
