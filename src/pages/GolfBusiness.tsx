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
  UserCheck
} from 'lucide-react';
import { secureFetcher } from '../lib/secureFetcher';
import { useDate } from '../contexts/DateContext';
import { useCoreData } from '../contexts/CoreDataContext';
import { getLatestClosedDateStr } from '../lib/dateUtils';
import type { GolfChannelAnalysisV2Response } from '../types/reports-v2';
import MetricExplainerTooltip from '../components/common/MetricExplainerTooltip';

export default function GolfBusiness() {
  const [data, setData] = useState<GolfChannelAnalysisV2Response | null>(null);
  const [orgGolfDiv, setOrgGolfDiv] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const { startDate, endDate, isRange } = useDate();
  const { core, summary: coreSummary, isLoading: isCoreLoading } = useCoreData();
  const isRangeMode = Boolean(isRange && endDate && startDate !== endDate);

  useEffect(() => {
    const abortController = new AbortController();

    const fetchSummary = async () => {
      setLoading(true);
      const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';
      const queryParams = endDate && startDate !== endDate
        ? `startDate=${startDate}&endDate=${endDate}`
        : `date=${startDate || getLatestClosedDateStr()}`;

      // 1. Fast SSOT organization hierarchy fetch (~300ms) for immediate venue/part subtotals
      secureFetcher(`${API_BASE}/api/v6/dashboard/revenue-by-org?${queryParams}`, {
        signal: abortController.signal
      })
        .then((orgRes) => {
          if (abortController.signal.aborted) return;
          const divisions = orgRes?.data?.divisions || orgRes?.divisions || [];
          const golfDiv = divisions.find((d: any) => d.orgDivision?.includes('골프'));
          if (golfDiv) {
            setOrgGolfDiv(golfDiv);
            setLoading(false);
          }
        })
        .catch(() => {
          // Handled gracefully
        });

      // 2. Detailed tee-time & channel report fetch (isolated so 25s timeout on multi-month range never blocks the dashboard)
      try {
        const res = await secureFetcher(`${API_BASE}/api/v6/report/golf-channel-teetime-analysis-v2?${queryParams}`, {
          signal: abortController.signal
        });
        if (abortController.signal.aborted) return;
        const payload: GolfChannelAnalysisV2Response = res?.data ?? res;
        if (payload?.success) {
          setData(payload);
        }
      } catch (err: any) {
        if (abortController.signal.aborted || err?.name === 'AbortError') return;
        console.warn('[GolfBusiness] 상세 티타임 리포트 지연/타임아웃 - SSOT 마트 요약본으로 렌더링 유지:', err?.message);
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

  // Fallback synthesis from fast SSOT endpoints (revenue-summary + revenue-by-org) when detailed v2 report is still loading or timed out
  const effectiveData = useMemo<GolfChannelAnalysisV2Response | null>(() => {
    if (data?.success && data?.meta?.summary) {
      return data;
    }

    const golfCat = (core?.salesByCategory || []).find((c: any) => c.categoryCode === 'GOLF');
    const divSub = orgGolfDiv?.divisionSubtotal;
    if (!golfCat && !divSub && !coreSummary) return null;

    const totalGolfRevenue = Number(divSub?.todayActual ?? golfCat?.todayActual ?? golfCat?.totalSales ?? 0);
    const totalPlayers = Number(coreSummary?.totalGolfVisitors ?? divSub?.todayVisitors ?? golfCat?.todayVisitors ?? 0);
    const totalTransactions = Number(divSub?.todayQuantity ?? 0);

    const partsList: any[] = orgGolfDiv?.parts || [];
    const coursePart = partsList.find((p: any) => p.partName === '경기운영');
    const clubPart = partsList.find((p: any) => p.partName === '클럽하우스');
    const proshopPart = partsList.find((p: any) => p.partName === '프로샵');

    const courseCoreRevenue = coursePart?.partSubtotal?.todayActual;
    const amenityRevenue = (clubPart && proshopPart)
      ? undefined
      : undefined;

    const rawVenues: any[] = orgGolfDiv?.venues || [];
    const fallbackChannels = rawVenues.map((v: any) => {
      const rev = Number(v.venueSubtotal?.todayActual ?? 0);
      const qty = Number(v.venueSubtotal?.todayQuantity ?? 0);
      const vis = Number(v.venueSubtotal?.todayVisitors ?? 0);
      const firstTicket = v.tickets?.[0]?.ticketName || v.partName || '일반';
      return {
        venueName: v.venueName,
        productGroup: v.venueName === '그린피' ? '그린피' : v.venueName === '카트대여' ? '카트대여' : firstTicket,
        revenue: rev,
        revenueFormatted: rev.toLocaleString(),
        quantity: qty,
        quantityFormatted: qty.toLocaleString(),
        players: vis,
        playersFormatted: vis.toLocaleString(),
        revenueSharePct: v.venueSubtotal?.sharePct ?? null,
        unitPrice: v.venueSubtotal?.unitPrice ?? 0
      };
    });

    const s = coreSummary || {};
    const hasPartData = Boolean(s.golfParts);
    const hasMemberData = s.golfMemberPlayers !== undefined || s.golfNonMemberPlayers !== undefined;

    return {
      success: true,
      meta: {
        engine: '골프 정규 실적 집계',
        period: {
          startDate: startDate || getLatestClosedDateStr(),
          endDate: endDate || startDate || getLatestClosedDateStr()
        },
        summary: {
          totalGolfRevenue,
          totalGolfRevenueFormatted: totalGolfRevenue.toLocaleString(),
          totalPlayers,
          totalPlayersFormatted: totalPlayers.toLocaleString(),
          totalTransactions,
          arpu: s.golfArpu ?? null,
          arpuFormatted: s.golfArpu ? Number(s.golfArpu).toLocaleString() : '-',
          courseCoreRevenue,
          amenityRevenue,
          partAnalysis: hasPartData ? {
            totalReservedTeams: Number(s.totalGolfReservedTeams ?? 0),
            totalVisitedTeams: Number(s.totalGolfVisitedTeams ?? s.totalGolfTeams ?? 0),
            totalCanceledTeams: Number(s.totalGolfCanceledTeams ?? 0),
            totalPendingTeams: Number(s.totalGolfPendingTeams ?? 0),
            overallAvgGreenFee: Number(s.golfAvgGreenFee ?? 0),
            overallAvgGreenFeeFormatted: Number(s.golfAvgGreenFee ?? 0).toLocaleString(),
            parts: s.golfParts
          } : undefined,
          membershipAnalysis: hasMemberData ? {
            member: {
              players: Number(s.golfMemberPlayers ?? 0),
              playersFormatted: Number(s.golfMemberPlayers ?? 0).toLocaleString(),
              playerRatio: Number(s.golfMemberPlayerRatio ?? 0),
              greenFeeRevenue: Number(s.golfMemberGreenFee ?? 0),
              greenFeeRevenueFormatted: Number(s.golfMemberGreenFee ?? 0).toLocaleString(),
              avgGreenFee: Number(s.golfMemberAvgGreenFee ?? 0),
              avgGreenFeeFormatted: Number(s.golfMemberAvgGreenFee ?? 0).toLocaleString()
            },
            nonMember: {
              players: Number(s.golfNonMemberPlayers ?? 0),
              playersFormatted: Number(s.golfNonMemberPlayers ?? 0).toLocaleString(),
              playerRatio: Number(s.golfNonMemberPlayerRatio ?? 0),
              greenFeeRevenue: Number(s.golfNonMemberGreenFee ?? 0),
              greenFeeRevenueFormatted: Number(s.golfNonMemberGreenFee ?? 0).toLocaleString(),
              avgGreenFee: Number(s.golfNonMemberAvgGreenFee ?? 0),
              avgGreenFeeFormatted: Number(s.golfNonMemberAvgGreenFee ?? 0).toLocaleString()
            },
            greenFeeGap: Number(s.golfGreenFeeGap ?? 0),
            greenFeeGapFormatted: Number(s.golfGreenFeeGap ?? 0).toLocaleString()
          } : undefined
        } as any
      },
      channels: fallbackChannels as any,
      dailyTrends: []
    };
  }, [data, core, coreSummary, orgGolfDiv, startDate, endDate]);

  const normalizedChannels = useMemo(() => {
    if (!effectiveData?.channels) return [];
    return effectiveData.channels
      .map((c: any) => {
        const venueName = c.venueName || c.venue_name || '기타';
        const productGroup = c.productGroup || c.product_group || c.ticketGroup || c.ticket_group || '일반';
        const revenue = Number(c.revenue || c.totalRevenue || 0);
        const revenueFormatted = c.revenueFormatted || c.revenue_formatted || Math.round(revenue).toLocaleString();
        const quantity = Number(c.quantity || 0);
        const quantityFormatted = c.quantityFormatted || c.quantity_formatted || quantity.toLocaleString();
        const players = Number(c.players || c.playerCount || 0);
        const playersFormatted = c.playersFormatted || c.players_formatted || c.playerCountFormatted || players.toLocaleString();
        const rawShare = c.revenueSharePct ?? c.revenue_share_pct;
        const revenueSharePct = rawShare !== undefined && rawShare !== null ? Number(rawShare) : null;
        
        const displayUnit = c.displayUnit || (players > 0 ? '명 내장' : '건 결제');
        const displayCountFormatted = players > 0 ? (playersFormatted !== '0' ? playersFormatted : quantityFormatted) : quantityFormatted;

        const unitPrice = Number(c.unitPrice ?? c.unit_price ?? 0);

        const displayName = c.displayName || (venueName === '기타매출' && productGroup === '대여품' ? '기타매출 (대여채)' : venueName);
        const description = c.description || '';

        return {
          venueName,
          displayName,
          description,
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

  if ((loading && isCoreLoading && !effectiveData) || !effectiveData) {
    return (
      <div className="w-full h-[80vh] flex items-center justify-center bg-[#f8fafc]">
        <div className="text-xl font-medium text-brand-mint animate-pulse">골프사업본부 데이터를 불러오는 중입니다...</div>
      </div>
    );
  }

  const { summary } = effectiveData.meta;

  const greenFeeItem = normalizedChannels.find(c => 
    c.venueName.includes('그린피') || c.productGroup.includes('그린피') || c.productGroup === 'GREEN_FEE'
  );
  const cartFeeItem = normalizedChannels.find(c => 
    c.venueName.includes('카트') || c.productGroup.includes('카트') || c.productGroup === 'CART_FEE'
  );
  const startHouseItem = normalizedChannels.find(c => 
    c.venueName.includes('스타트하우스') || c.productGroup === 'START_HOUSE'
  );
  const restaurantItem = normalizedChannels.find(c => 
    c.venueName.includes('레스토랑') || c.productGroup === 'RESTAURANT'
  );
  const proShopItem = normalizedChannels.find(c => 
    c.venueName.includes('프로샵') || c.productGroup === 'PRO_SHOP'
  );

  const etcItem = normalizedChannels.find(c =>
    c !== greenFeeItem && c !== cartFeeItem && c !== startHouseItem && c !== restaurantItem && c !== proShopItem
  );

  const totalCourseRevenue = (summary as any).courseCoreRevenue !== undefined && (summary as any).courseCoreRevenue !== null
    ? Number((summary as any).courseCoreRevenue)
    : null;

  const totalAmenityRevenue = (summary as any).amenityRevenue !== undefined && (summary as any).amenityRevenue !== null
    ? Number((summary as any).amenityRevenue)
    : null;

  const totalAmenityQuantity = (summary as any).amenityQuantity !== undefined && (summary as any).amenityQuantity !== null
    ? Number((summary as any).amenityQuantity)
    : null;

  const courseCoreRatio = (summary as any).courseCoreRatio ?? null;
  const amenityRatio = (summary as any).amenityRatio ?? null;

  const partAnalysis = effectiveData?.partAnalysis || (summary as any)?.partAnalysis;
  const membershipAnalysis = effectiveData?.membershipAnalysis || (summary as any)?.membershipAnalysis;

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] text-slate-800 tracking-tight pb-16">
      
      {/* 🏛️ Institutional Deep Slate Navy Banner with Mint Rim Light */}
      <div className="w-full bg-gradient-to-r from-[#071322] via-[#0b1d33] to-[#0f172a] h-[220px] absolute top-0 left-0 z-0 overflow-hidden rounded-b-[32px] border-b border-white/10 shadow-lg">
        <div className="absolute top-0 right-0 w-[500px] h-[220px] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#00ae95]/15 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -top-12 left-1/4 w-72 h-72 bg-white/5 rounded-full blur-3xl pointer-events-none" />
      </div>

      <div className="w-full max-w-[1920px] mx-auto p-4 md:p-8 relative z-10 pt-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
          <div className="text-white">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-3xl tracking-widest bg-white text-[#00ae95] px-3 py-1 rounded-sm shadow-md">
                BELLE FORET
              </span>
              <span className="font-bold text-2xl tracking-wide ml-1">RESORT</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mt-3">골프사업본부 경영 현황 ⛳</h1>
            <p className="text-sm text-white/80 mt-1">골프 부문별 영업장 실적 및 실질 수익성 종합 리포트입니다. (순매출/부가세 별도)</p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <GlobalDatePicker />
          </div>
        </div>

        {/* Overview Stats (3-Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-12">
          {/* Golf Revenue */}
          <div className="bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)] hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)] transition-all duration-300 relative group border border-slate-200/90 flex flex-col justify-between h-full">
            <div>
              <h2 className="text-xs lg:text-sm font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-[#00ae95]" /> 
                <span>{isRangeMode ? '선택 기간 골프 총매출' : '금일 골프 총매출'}</span>
                <MetricExplainerTooltip presetKey="netRevenue" align="left" />
              </h2>
              <div className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight font-financial">
                {summary.totalGolfRevenueFormatted}원
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-auto pt-3 border-t border-slate-100/60 break-keep">그린피 + 카트대여 + 부대시설 순매출(Net) 총합</p>
          </div>

          {/* Visited Players */}
          <div className="bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)] hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)] transition-all duration-300 relative group border border-slate-200/90 flex flex-col justify-between h-full">
            <div>
              <h2 className="text-xs lg:text-sm font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#00ae95]" /> 
                <span>실제 총 내장객 수</span>
                <MetricExplainerTooltip presetKey="visitorCount" align="center" />
              </h2>
              <div className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight font-financial">
                {summary.totalPlayersFormatted}명
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-auto pt-3 border-t border-slate-100/60 break-keep">총 {summary.totalTransactions.toLocaleString()} 결제/거래 건</p>
          </div>

          {/* Avg ARPU */}
          <div className="bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)] hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)] transition-all duration-300 relative group border border-slate-200/90 flex flex-col justify-between h-full">
            <div>
              <h2 className="text-xs lg:text-sm font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-[#00ae95]" /> 
                <span>1인당 객단가 (ARPU)</span>
                <MetricExplainerTooltip presetKey="arpu" align="left" />
              </h2>
              <div className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight font-financial">
                {summary.arpuFormatted && summary.arpuFormatted !== '-' ? `${summary.arpuFormatted}원` : '-'}
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-auto pt-3 border-t border-slate-100/60 break-keep">내장객 1인당 평균 골프 소비액</p>
          </div>
        </div>

        {/* 📊 골프 경영 핵심 분석 및 수익성 진단 */}
        <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8 border border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 border-b border-slate-100 pb-4 gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  경영 전략 의사결정 지표
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  공식 실적 데이터 기반
                </span>
              </div>
              <h2 className="text-lg lg:text-xl font-bold text-slate-900 flex items-center gap-2">
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
                    핵심 매출 기여도 {courseCoreRatio !== null ? `${courseCoreRatio}%` : '-'}
                  </span>
                </div>
                <div className="text-2xl font-black text-emerald-900 my-1 font-financial">
                  {totalCourseRevenue !== null ? `${totalCourseRevenue.toLocaleString()}원` : '-'}{' '}
                  <span className="text-xs font-normal text-slate-500">({greenFeeItem?.playersFormatted || '0'}명 내장, 카트 {cartFeeItem?.quantityFormatted || '0'}건)</span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-700 mt-3 pt-2 border-t border-emerald-200/60 font-financial">
                  <div className="flex justify-between">
                    <span>• 그린피 순매출 (점유율):</span>
                    <strong>{greenFeeItem?.revenueFormatted || '0'}원 ({greenFeeItem?.revenueSharePct !== null && greenFeeItem?.revenueSharePct !== undefined ? `${greenFeeItem.revenueSharePct}%` : '-'})</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>• 카트대여 순매출 (점유율):</span>
                    <strong className="text-slate-900">{cartFeeItem?.revenueFormatted || '0'}원 ({cartFeeItem?.revenueSharePct !== null && cartFeeItem?.revenueSharePct !== undefined ? `${cartFeeItem.revenueSharePct}%` : '-'})</strong>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-emerald-950 mt-4 pt-2 border-t border-emerald-200/40 leading-relaxed">
                💡 순수 라운딩 코스 매출(그린피 + 카트비)이 전체 골프 부문 매출의 <strong>{courseCoreRatio !== null ? `${courseCoreRatio}%` : '-'}</strong>를 견인하고 있습니다.
              </p>
            </div>

            {/* 카드 2: 클럽 부대시설 부가 수익 (식음 + 프로샵 등) */}
            <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 p-6 rounded-2xl border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <UtensilsCrossed className="w-4 h-4 text-blue-600" /> 클럽 부대시설 수익 성과 (식음료 및 프로샵 등)
                  </span>
                  <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                    부가 매출 기여도 {amenityRatio !== null ? `${amenityRatio}%` : '-'}
                  </span>
                </div>
                <div className="text-2xl font-black text-slate-900 my-1 font-financial">
                  {totalAmenityRevenue !== null ? `${totalAmenityRevenue.toLocaleString()}원` : '-'}
                  {totalAmenityQuantity !== null && (
                    <span className="text-xs font-normal text-slate-500"> (총 {totalAmenityQuantity.toLocaleString()}건)</span>
                  )}
                </div>
                <div className="space-y-1.5 text-xs text-slate-700 mt-3 pt-2 border-t border-slate-200 font-financial">
                  <div className="flex justify-between">
                    <span>• 스타트하우스 식음:</span>
                    <strong>{startHouseItem?.revenueFormatted || '0'}원 ({startHouseItem?.revenueSharePct !== null && startHouseItem?.revenueSharePct !== undefined ? `${startHouseItem.revenueSharePct}%` : '-'})</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>• 클럽 레스토랑 식음:</span>
                    <strong>{restaurantItem?.revenueFormatted || '0'}원 ({restaurantItem?.revenueSharePct !== null && restaurantItem?.revenueSharePct !== undefined ? `${restaurantItem.revenueSharePct}%` : '-'})</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>• 프로샵 용품 매출:</span>
                    <strong>{proShopItem?.revenueFormatted || '0'}원 ({proShopItem?.revenueSharePct !== null && proShopItem?.revenueSharePct !== undefined ? `${proShopItem.revenueSharePct}%` : '-'})</strong>
                  </div>
                  {etcItem && etcItem.revenue > 0 && (
                    <div className="flex justify-between">
                      <span>• 기타매출 및 대여:</span>
                      <strong>{etcItem.revenueFormatted}원 ({etcItem.revenueSharePct !== null && etcItem.revenueSharePct !== undefined ? `${etcItem.revenueSharePct}%` : '-'})</strong>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-slate-600 mt-4 pt-2 border-t border-slate-200 leading-relaxed">
                💡 라운딩 전후 식음 및 용품 구매를 통한 부가 매출이 전체 골프 부문 매출의 <strong>{amenityRatio !== null ? `${amenityRatio}%` : '-'}</strong>를 차지하고 있습니다.
              </p>
            </div>

            {/* 카드 3: 1부 · 2부 · 3부 티타임 성과 및 평균 그린피 */}
            {partAnalysis && (
              <div className="bg-gradient-to-br from-indigo-50/70 to-slate-50 p-6 rounded-2xl border border-indigo-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-indigo-600" /> 1부 · 2부 · 3부 티타임 성과 및 평균 그린피
                    </span>
                    <span className="text-[10px] font-extrabold bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded-full">
                      전체 평균 {partAnalysis.overallAvgGreenFeeFormatted}원
                    </span>
                  </div>
                  <div className="text-2xl font-black text-indigo-950 my-1 font-financial">
                    {partAnalysis.totalVisitedTeams.toLocaleString()}팀 내장 완료
                    <span className="text-xs font-normal text-slate-500 ml-1.5">
                      (총 예약 {partAnalysis.totalReservedTeams.toLocaleString()}팀 / 취소 {partAnalysis.totalCanceledTeams.toLocaleString()}팀)
                    </span>
                  </div>

                  {/* 1부, 2부, 3부 3-Grid */}
                  {partAnalysis.parts && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 my-3">
                      {[
                        { key: 'part1', data: partAnalysis.parts.part1, tag: '오전' },
                        { key: 'part2', data: partAnalysis.parts.part2, tag: '오후' },
                        { key: 'part3', data: partAnalysis.parts.part3, tag: '야간' }
                      ].map(({ key, data: p, tag }) => (
                        <div key={key} className="bg-white/95 p-3 rounded-xl border border-indigo-100/80 shadow-2xs flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                                {p.name.slice(0, 2)}
                                <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200/60">{tag}</span>
                              </span>
                              <span className="text-[9px] font-medium text-slate-400">{p.timeRange}</span>
                            </div>
                            <div className="text-base font-black text-indigo-900 font-financial mt-1">
                              {p.avgGreenFee > 0 ? `${p.avgGreenFeeFormatted}원` : '-'}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              평균 그린피 ({p.players > 0 ? `${p.players.toLocaleString()}명` : '-'})
                            </div>
                          </div>

                          <div className="pt-2 mt-2 border-t border-slate-100 text-[10px] space-y-1 font-financial text-slate-600">
                            <div className="flex justify-between">
                              <span className="text-slate-400">내장팀:</span>
                              <strong className="text-slate-800">
                                {p.visitedTeams > 0 ? `${p.visitedTeams}팀` : '-'}
                                {p.pendingTeams > 0 ? ` (진행 ${p.pendingTeams}팀)` : ''}
                              </strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">예약팀:</span>
                              <span>{p.reservedTeams}팀</span>
                            </div>
                            <div className="flex justify-between pt-0.5 border-t border-slate-100 text-indigo-950 font-bold">
                              <span className="text-slate-400 font-normal">순매출:</span>
                              <span>{p.greenFeeRevenue > 0 ? `${Math.round(p.greenFeeRevenue).toLocaleString()}원` : '-'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-indigo-950 mt-4 pt-2 border-t border-indigo-200/50 leading-relaxed font-financial">
                  💡 시간대별(1부·2부·3부) 실시간 예약/내장/진행 팀수와 실제 결제된 1인당 평균 그린피 실측치입니다.
                </p>
              </div>
            )}

            {/* 카드 4: 회원 vs 비회원 내장 비중 및 그린피 단가 분석 */}
            {membershipAnalysis && (
              <div className="bg-gradient-to-br from-teal-50/70 to-emerald-50/30 p-6 rounded-2xl border border-teal-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-teal-600" /> 회원 vs 비회원 내장 비중 및 그린피 단가 분석
                    </span>
                    <span className="text-[10px] font-extrabold bg-teal-100 text-teal-900 px-2 py-0.5 rounded-full">
                      단가 격차 {membershipAnalysis.greenFeeGapFormatted}원
                    </span>
                  </div>
                  <div className="text-2xl font-black text-teal-950 my-1 font-financial">
                    그린피 단가 격차: +{membershipAnalysis.greenFeeGapFormatted}원
                    <span className="text-xs font-normal text-slate-500 ml-1.5">
                      (비회원이 1인당 평균 {membershipAnalysis.greenFeeGapFormatted}원 추가 지불)
                    </span>
                  </div>

                  {/* 회원 vs 비회원 2분할 카드 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-3">
                    {/* 회원 카드 */}
                    <div className="bg-white/95 p-3.5 rounded-xl border border-teal-200/80 shadow-2xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                            회원 (정회원/무기명)
                          </span>
                          <span className="text-[10px] font-extrabold bg-teal-50 text-teal-800 px-2 py-0.5 rounded-md border border-teal-200">
                            비중 {membershipAnalysis.member.playerRatio}%
                          </span>
                        </div>
                        <div className="text-xl font-black text-teal-950 font-financial">
                          {membershipAnalysis.member.avgGreenFeeFormatted}원
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          1인당 평균 그린피
                        </div>
                      </div>

                      <div className="pt-2 mt-3 border-t border-slate-100 text-[11px] space-y-1 font-financial text-slate-600">
                        <div className="flex justify-between">
                          <span className="text-slate-400">내장 인원:</span>
                          <strong className="text-slate-800">{membershipAnalysis.member.playersFormatted}명</strong>
                        </div>
                        <div className="flex justify-between pt-0.5 border-t border-slate-100 text-teal-950 font-bold">
                          <span className="text-slate-400 font-normal">그린피 순매출:</span>
                          <span>{membershipAnalysis.member.greenFeeRevenueFormatted}원</span>
                        </div>
                      </div>
                    </div>

                    {/* 비회원 카드 */}
                    <div className="bg-white/95 p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                            비회원 (일반/대중)
                          </span>
                          <span className="text-[10px] font-extrabold bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md border border-slate-300">
                            비중 {membershipAnalysis.nonMember.playerRatio}%
                          </span>
                        </div>
                        <div className="text-xl font-black text-slate-900 font-financial">
                          {membershipAnalysis.nonMember.avgGreenFeeFormatted}원
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          1인당 평균 그린피
                        </div>
                      </div>

                      <div className="pt-2 mt-3 border-t border-slate-100 text-[11px] space-y-1 font-financial text-slate-600">
                        <div className="flex justify-between">
                          <span className="text-slate-400">내장 인원:</span>
                          <strong className="text-slate-800">{membershipAnalysis.nonMember.playersFormatted}명</strong>
                        </div>
                        <div className="flex justify-between pt-0.5 border-t border-slate-100 text-slate-950 font-bold">
                          <span className="text-slate-400 font-normal">그린피 순매출:</span>
                          <span>{membershipAnalysis.nonMember.greenFeeRevenueFormatted}원</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-teal-950 mt-4 pt-2 border-t border-teal-200/50 leading-relaxed font-financial">
                  💡 비회원 내장객 비중 <strong>{membershipAnalysis.nonMember.playerRatio}%</strong>이며, 비회원이 1인당 평균 <strong>+{membershipAnalysis.greenFeeGapFormatted}원</strong>의 그린피를 추가 지불하고 있습니다.
                </p>
              </div>
            )}

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
              공식 마트 데이터 ({normalizedChannels.length}개 유효 부문)
            </span>
          </div>

          {/* 채널/영업장별 카드 그리드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {normalizedChannels.map((ch, idx) => (
              <div 
                key={`${ch.productGroup}-${ch.venueName}-${idx}`}
                className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                  idx === 0 
                    ? 'bg-gradient-to-br from-emerald-50/90 to-teal-50/40 border-emerald-200 shadow-xs' 
                    : 'bg-slate-50/70 border-slate-200/80 hover:bg-white hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-1 gap-2">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                        {idx === 0 && <Award className="w-3.5 h-3.5 text-amber-500" />}
                        {ch.displayName}
                      </span>
                      {ch.description && (
                        <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                          {ch.description}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {ch.revenueSharePct !== null && ch.revenueSharePct !== undefined ? `점유 ${ch.revenueSharePct}%` : '점유 -'}
                    </span>
                  </div>
                  
                  <div className="text-2xl font-black text-slate-900 my-2">
                    {ch.displayCountFormatted} <span className="text-xs font-normal text-slate-500">{ch.displayUnit}</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-[11px] text-slate-600 mt-2 pt-2 border-t border-slate-200/60">
                  <div className="flex justify-between">
                    <span className="text-slate-400">상품 분류:</span>
                    <strong className="text-slate-700">{ch.productGroup}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">평균 단가:</span>
                    <strong>{ch.unitPriceFormatted !== '-' ? `${ch.unitPriceFormatted}원` : '-'}</strong>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200/40 text-emerald-900 font-black">
                    <span>순매출:</span>
                    <span>{ch.revenueFormatted}원</span>
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
