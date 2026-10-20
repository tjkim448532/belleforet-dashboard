import { useState, useEffect, useMemo } from 'react';
import { 
  Gift, 
  Trophy, 
  Package, 
  Layers, 
  Search, 
  RefreshCw, 
  AlertCircle, 
  Sparkles, 
  Store, 
  Calendar, 
  Tag, 
  BarChart3
} from 'lucide-react';
import { secureFetcher } from '../lib/secureFetcher';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

// ============================================================================
// TypeScript Interfaces (V6 media-giftshop-ranking API SSOT)
// ============================================================================

export interface GiftShopYearlySales {
  qty: number;
  netRev: number;
}

export interface GiftShopRankingItem {
  rank: number;
  revenueRank: number;
  quantityRank: number;
  productCode: string;
  itemName: string;
  itemType: string;
  itemTypeLabel: string;
  cumulativeNetRevenue: number | null;
  cumulativeGrossRevenue?: number | null;
  cumulativeRevenue?: number | null;
  sales?: number | null;
  cumulativeQuantity: number | null;
  quantity?: number | null;
  avgNetUnitPrice: number | null;
  unitPrice?: number | null;
  revenueSharePct: number | null;
  cumulativeRevenueSharePct?: number | null;
  quantitySharePct: number | null;
  cumulativeQuantitySharePct?: number | null;
  firstSoldDate?: string | null;
  lastSoldDate?: string | null;
  activeDays?: number | null;
  yearlySales?: Record<string, GiftShopYearlySales>;
}

export interface GiftShopCategoryBreakdown {
  itemType: string;
  itemTypeLabel: string;
  itemCount: number | null;
  cumulativeQuantity: number | null;
  cumulativeNetRevenue: number | null;
  revenueSharePct: number | null;
  quantitySharePct: number | null;
}

export interface GiftShopYearlyBreakdown {
  year: string;
  itemCount: number | null;
  cumulativeQuantity: number | null;
  cumulativeNetRevenue: number | null;
  revenueSharePct: number | null;
  quantitySharePct: number | null;
}

export interface GiftShopSummary {
  totalNetRevenue: number | null;
  totalGrossRevenue: number | null;
  totalVatAmount?: number | null;
  totalRevenue?: number | null;
  totalQuantity: number | null;
  totalDistinctItems: number | null;
  totalActiveDays?: number | null;
  overallAvgNetUnitPrice: number | null;
  overallAvgGrossUnitPrice?: number | null;
  top1RevenueItem?: {
    itemName: string;
    cumulativeNetRevenue: number | null;
    cumulativeQuantity: number | null;
    revenueSharePct: number | null;
    quantityRank: number | null;
  } | null;
  top1QuantityItem?: {
    itemName: string;
    cumulativeQuantity: number | null;
    cumulativeNetRevenue: number | null;
    quantitySharePct: number | null;
    revenueRank: number | null;
  } | null;
}

export interface GiftShopMeta {
  facility: string;
  venues: string[];
  divisionName?: string;
  partName?: string;
  categoryCode?: string;
  periodMode?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export interface GiftShopRankingResponse {
  success: boolean;
  meta: GiftShopMeta;
  summary: GiftShopSummary;
  categoryBreakdown: GiftShopCategoryBreakdown[];
  yearlyBreakdown: GiftShopYearlyBreakdown[];
  rankingByRevenue: GiftShopRankingItem[];
  rankingByQuantity: GiftShopRankingItem[];
  error?: string;
}

// ============================================================================
// Formatters (Null-safe, Integer pure)
// ============================================================================

const formatWon = (val: number | null | undefined): string => {
  if (val == null || isNaN(val)) return '-';
  return `${Math.round(val).toLocaleString()}원`;
};

const formatNum = (val: number | null | undefined): string => {
  if (val == null || isNaN(val)) return '-';
  return Math.round(val).toLocaleString();
};

const formatPct = (val: number | null | undefined): string => {
  if (val == null || isNaN(val)) return '-';
  return `${Number(val).toFixed(1)}%`;
};

export default function LeisureGiftShop() {
  const [data, setData] = useState<GiftShopRankingResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedVenue, setSelectedVenue] = useState<string>('미디어-기프트샵');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedItemType, setSelectedItemType] = useState<string>('ALL');
  const [activeRankTab, setActiveRankTab] = useState<'REVENUE' | 'QUANTITY' | 'DUAL'>('REVENUE');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const fetchGiftShopRankings = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedVenue) params.set('venue', selectedVenue);
      if (selectedYear && selectedYear !== 'ALL') params.set('year', selectedYear);
      if (selectedItemType && selectedItemType !== 'ALL') params.set('itemType', selectedItemType);
      params.set('limit', '100');

      const url = `${API_BASE}/api/v6/report/media-giftshop-ranking?${params.toString()}`;
      const res = await secureFetcher(url);
      const payload: GiftShopRankingResponse = res?.data ? res.data : res;

      if (!payload || payload.success === false) {
        throw new Error(payload?.error || '기념품 샵 랭킹 데이터를 불러올 수 없습니다.');
      }
      setData(payload);
    } catch (err: any) {
      console.error('Failed to fetch media giftshop rankings:', err);
      setError(err?.message || '기념품 샵 랭킹 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGiftShopRankings();
  }, [selectedVenue, selectedYear, selectedItemType]);

  const summary = data?.summary;
  const meta = data?.meta;
  const categoryBreakdown = data?.categoryBreakdown || [];
  const yearlyBreakdown = data?.yearlyBreakdown || [];
  const rawRevenueList = data?.rankingByRevenue || [];
  const rawQuantityList = data?.rankingByQuantity || [];

  // Filtered by Search Term
  const filteredRevenueList = useMemo(() => {
    if (!searchTerm.trim()) return rawRevenueList;
    const q = searchTerm.trim().toLowerCase();
    return rawRevenueList.filter(
      (item) => item.itemName.toLowerCase().includes(q) || item.productCode.toLowerCase().includes(q)
    );
  }, [rawRevenueList, searchTerm]);

  const filteredQuantityList = useMemo(() => {
    if (!searchTerm.trim()) return rawQuantityList;
    const q = searchTerm.trim().toLowerCase();
    return rawQuantityList.filter(
      (item) => item.itemName.toLowerCase().includes(q) || item.productCode.toLowerCase().includes(q)
    );
  }, [rawQuantityList, searchTerm]);

  const getItemTypeBadgeStyle = (itemType: string) => {
    switch (itemType) {
      case 'CHARACTER_MD':
        return 'bg-[#FAF6ED] text-[#8C6D3B] border-[#E5DAC1]';
      case 'TOY':
        return 'bg-[#E8F2EE] text-[#1E523F] border-[#B4C6C1]';
      case 'RETAIL_GOODS':
        return 'bg-[#F4F3EE] text-[#284F42] border-[#D0C6BB]';
      case 'SOUVENIR':
        return 'bg-[#F0F5FA] text-[#2B5278] border-[#BCD1E6]';
      default:
        return 'bg-white text-[#5A6B63] border-[#D0C6BB]';
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="w-6 h-6 rounded-full bg-[#B59269] text-white flex items-center justify-center font-black text-xs shadow-xs">
          🥇
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="w-6 h-6 rounded-full bg-[#9EA8A3] text-white flex items-center justify-center font-black text-xs shadow-xs">
          🥈
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="w-6 h-6 rounded-full bg-[#A87B51] text-white flex items-center justify-center font-black text-xs shadow-xs">
          🥉
        </span>
      );
    }
    return (
      <span className="w-6 h-6 rounded-full bg-[#F4F3EE] text-[#5A6B63] border border-[#D0C6BB]/70 flex items-center justify-center font-extrabold text-xs">
        {rank}
      </span>
    );
  };

  return (
    <div className="w-full min-h-screen bg-[#F4F3EE] text-[#1B382E] p-4 sm:p-6 lg:p-8 space-y-6">
      {/* 1. 상단 마스터 헤더 */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#D0C6BB]/90 shadow-[0_4px_24px_rgba(27,59,43,0.06)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-[#1B3B2B] text-white text-xs font-black">
                레저본부
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1] text-xs font-extrabold">
                미디어아트센터
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-[#FAF6ED] text-[#8C6D3B] border border-[#E5DAC1] text-xs font-extrabold">
                V6 공식 리테일 팩트 연동
              </span>
              {meta?.startDate && meta?.endDate && (
                <span className="text-xs text-[#5A6B63] font-medium">
                  {meta.startDate} ~ {meta.endDate} 실측 누적
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1B382E] tracking-tight flex items-center gap-2.5 flex-wrap">
              <span className="p-2.5 rounded-2xl bg-[#1B3B2B] text-white shadow-xs inline-flex">
                <Gift size={22} className="text-[#B59269]" />
              </span>
              <span>기념품 샵 판매·매출 랭킹 분석</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#5A6B63] mt-1.5 font-medium">
              미디어-기프트샵에서 판매되는 모든 캐릭터 MD·완구·기념품의 <strong>판매 수량 랭킹(인기 순위)</strong>과 <strong>매출 금액 랭킹(수익 기여도)</strong>을 단일 진실 공급원(SSOT) 기준으로 분석합니다.
            </p>
          </div>

          {/* 필터 및 새로고침 컨트롤 */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
            {/* 매장 선택 */}
            <div className="flex items-center gap-1.5 bg-[#FAF9F6] px-3 py-2 rounded-xl border border-[#D0C6BB]/80 shadow-2xs">
              <Store size={14} className="text-[#284F42]" />
              <span className="text-xs font-bold text-[#5A6B63]">매장</span>
              <select
                value={selectedVenue}
                onChange={(e) => setSelectedVenue(e.target.value)}
                className="text-xs sm:text-sm font-extrabold text-[#1B382E] outline-none bg-transparent cursor-pointer"
              >
                <option value="미디어-기프트샵">미디어-기프트샵</option>
                <option value="벨포레 굿즈">벨포레 굿즈</option>
                <option value="ALL">전체 매장 합산</option>
              </select>
            </div>

            {/* 연도 선택 */}
            <div className="flex items-center gap-1.5 bg-[#FAF9F6] px-3 py-2 rounded-xl border border-[#D0C6BB]/80 shadow-2xs">
              <Calendar size={14} className="text-[#284F42]" />
              <span className="text-xs font-bold text-[#5A6B63]">기간</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="text-xs sm:text-sm font-extrabold text-[#1B382E] outline-none bg-transparent cursor-pointer"
              >
                <option value="ALL">전체 누적 (2024~현재)</option>
                <option value="2026">2026년</option>
                <option value="2025">2025년</option>
                <option value="2024">2024년</option>
              </select>
            </div>

            {/* 품목 유형 선택 */}
            <div className="flex items-center gap-1.5 bg-[#FAF9F6] px-3 py-2 rounded-xl border border-[#D0C6BB]/80 shadow-2xs">
              <Tag size={14} className="text-[#284F42]" />
              <span className="text-xs font-bold text-[#5A6B63]">품목</span>
              <select
                value={selectedItemType}
                onChange={(e) => setSelectedItemType(e.target.value)}
                className="text-xs sm:text-sm font-extrabold text-[#1B382E] outline-none bg-transparent cursor-pointer"
              >
                <option value="ALL">전체 품목</option>
                <option value="CHARACTER_MD">캐릭터 MD</option>
                <option value="TOY">완구/토이</option>
                <option value="RETAIL_GOODS">일반 리테일 굿즈</option>
                <option value="SOUVENIR">기념품</option>
              </select>
            </div>

            <button
              type="button"
              onClick={fetchGiftShopRankings}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-[#1B3B2B] hover:bg-[#0F291E] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>새로고침</span>
            </button>
          </div>
        </div>
      </div>

      {/* 에러 상태 표시 (Fail-Loudly) */}
      {error && (
        <div className="bg-[#FDF0ED] border border-[#EAC5BD] rounded-3xl p-6 text-[#8B2635] flex items-start gap-3 shadow-xs">
          <AlertCircle size={22} className="shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="text-sm font-black block">데이터 연동 안내</strong>
            <p className="text-xs leading-relaxed font-bold">{error}</p>
            <p className="text-[11px] text-[#8B2635]/80">
              ※ V6 백엔드 API(<code>/api/v6/report/media-giftshop-ranking</code>) 배포 대기 중이거나 일시적 통신 지연일 수 있습니다. 프론트엔드는 임시 가짜 데이터를 생성하지 않고 순수 백엔드 완제품 데이터만 엄격히 대기합니다.
            </p>
          </div>
        </div>
      )}

      {/* 로딩 상태 표시 */}
      {loading && !data ? (
        <div className="bg-white rounded-3xl p-16 border border-[#D0C6BB]/75 shadow-xs flex flex-col items-center justify-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1B3B2B]" />
          <p className="text-sm font-bold text-[#5A6B63]">
            미디어-기프트샵 판매 실적 및 랭킹 데이터를 실시간 불러오는 중입니다...
          </p>
        </div>
      ) : data && (
        <>
          {/* ====================================================================
              2. 최상단 마스터 요약 카드 6종 (Executive Summary Cards)
             ==================================================================== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
            {/* 1. 누적 총 순매출 */}
            <div className="bg-[#1B3B2B] text-white rounded-2xl p-4.5 space-y-1.5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-white/80">
                <span className="font-extrabold">누적 총 순매출</span>
                <span className="px-1.5 py-0.5 rounded bg-white/20 text-[10px]">공급가액</span>
              </div>
              <div className="text-xl sm:text-2xl font-black font-financial tracking-tight text-[#FAF6ED]">
                {formatWon(summary?.totalNetRevenue)}
              </div>
              <div className="text-[10px] text-white/70 pt-1 border-t border-white/20 flex items-center justify-between">
                <span>총매출(VAT포함):</span>
                <span className="font-financial font-bold">{formatWon(summary?.totalGrossRevenue)}</span>
              </div>
            </div>

            {/* 2. 누적 총 판매수량 */}
            <div className="bg-white rounded-2xl p-4.5 border border-[#D0C6BB]/80 space-y-1.5 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-[#5A6B63]">
                <span className="font-extrabold">누적 총 판매수량</span>
                <Package size={14} className="text-[#1E523F]" />
              </div>
              <div className="text-xl sm:text-2xl font-black font-financial text-[#1B382E]">
                {formatNum(summary?.totalQuantity)}개
              </div>
              <div className="text-[10px] text-[#5A6B63] pt-1 border-t border-[#D0C6BB]/40 flex items-center justify-between">
                <span>판매 발생 일수:</span>
                <strong className="text-[#1B382E]">{formatNum(summary?.totalActiveDays)}일</strong>
              </div>
            </div>

            {/* 3. 취급 품목 수 */}
            <div className="bg-white rounded-2xl p-4.5 border border-[#D0C6BB]/80 space-y-1.5 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-[#5A6B63]">
                <span className="font-extrabold">판매 품목 수</span>
                <Tag size={14} className="text-[#8C6D3B]" />
              </div>
              <div className="text-xl sm:text-2xl font-black font-financial text-[#1B382E]">
                {formatNum(summary?.totalDistinctItems)}종
              </div>
              <div className="text-[10px] text-[#5A6B63] pt-1 border-t border-[#D0C6BB]/40 flex items-center justify-between">
                <span>품목 유형군:</span>
                <strong className="text-[#1E523F]">{formatNum(categoryBreakdown.length)}대 카테고리</strong>
              </div>
            </div>

            {/* 4. 전체 평균 판매단가 */}
            <div className="bg-white rounded-2xl p-4.5 border border-[#D0C6BB]/80 space-y-1.5 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-[#5A6B63]">
                <span className="font-extrabold">평균 판매단가</span>
                <span className="text-[10px] text-[#5A6B63]">개당 순단가</span>
              </div>
              <div className="text-xl sm:text-2xl font-black font-financial text-[#1B3B2B]">
                {formatWon(summary?.overallAvgNetUnitPrice)}
              </div>
              <div className="text-[10px] text-[#5A6B63] pt-1 border-t border-[#D0C6BB]/40 flex items-center justify-between">
                <span>VAT포함 총단가:</span>
                <span className="font-financial font-bold">{formatWon(summary?.overallAvgGrossUnitPrice)}</span>
              </div>
            </div>

            {/* 5. 🏆 금액 1위 상품 */}
            <div className="bg-[#FAF6ED] rounded-2xl p-4.5 border border-[#E5DAC1] space-y-1.5 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-[#8C6D3B]">
                <span className="font-black flex items-center gap-1">
                  <span>🏆</span> 매출 1위 상품
                </span>
                <span className="px-1.5 py-0.2 rounded bg-[#8C6D3B] text-white text-[9px] font-black">
                  비중 {formatPct(summary?.top1RevenueItem?.revenueSharePct)}
                </span>
              </div>
              <div className="text-xs sm:text-sm font-black text-[#1B382E] truncate" title={summary?.top1RevenueItem?.itemName || ''}>
                {summary?.top1RevenueItem?.itemName || '-'}
              </div>
              <div className="text-[10px] text-[#8C6D3B] pt-1 border-t border-[#E5DAC1] flex items-center justify-between">
                <span className="font-financial font-black">{formatWon(summary?.top1RevenueItem?.cumulativeNetRevenue)}</span>
                <span className="text-[#5A6B63]">({formatNum(summary?.top1RevenueItem?.cumulativeQuantity)}개)</span>
              </div>
            </div>

            {/* 6. 📦 수량 1위 상품 */}
            <div className="bg-[#E8F2EE] rounded-2xl p-4.5 border border-[#B4C6C1] space-y-1.5 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-[#1E523F]">
                <span className="font-black flex items-center gap-1">
                  <span>📦</span> 판매량 1위 상품
                </span>
                <span className="px-1.5 py-0.2 rounded bg-[#1E523F] text-white text-[9px] font-black">
                  비중 {formatPct(summary?.top1QuantityItem?.quantitySharePct)}
                </span>
              </div>
              <div className="text-xs sm:text-sm font-black text-[#1B382E] truncate" title={summary?.top1QuantityItem?.itemName || ''}>
                {summary?.top1QuantityItem?.itemName || '-'}
              </div>
              <div className="text-[10px] text-[#1E523F] pt-1 border-t border-[#B4C6C1] flex items-center justify-between">
                <span className="font-financial font-black">{formatNum(summary?.top1QuantityItem?.cumulativeQuantity)}개</span>
                <span className="text-[#5A6B63]">({formatWon(summary?.top1QuantityItem?.cumulativeNetRevenue)})</span>
              </div>
            </div>
          </div>

          {/* ====================================================================
              3. 카테고리별 비중 & 연도별 추이 카드 2종
             ==================================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 3-A. 품목 유형별 매출/수량 구성비 */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#D0C6BB]/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag size={16} className="text-[#1B3B2B]" />
                  <h3 className="text-sm sm:text-base font-black text-[#1B382E]">
                    품목 유형별 매출 및 판매수량 비중
                  </h3>
                </div>
                <span className="text-xs font-bold text-[#5A6B63]">
                  총 {formatNum(summary?.totalDistinctItems)}종
                </span>
              </div>

              <div className="space-y-3">
                {categoryBreakdown.map((cat) => (
                  <div key={cat.itemType} className="bg-[#FAF9F6] p-3 rounded-2xl border border-[#D0C6BB]/60 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-black border ${getItemTypeBadgeStyle(cat.itemType)}`}>
                          {cat.itemTypeLabel}
                        </span>
                        <span className="text-[11px] text-[#5A6B63] font-bold">
                          {formatNum(cat.itemCount)}종
                        </span>
                      </div>
                      <div className="text-right">
                        <strong className="text-xs sm:text-sm font-black text-[#1B382E] font-financial">
                          {formatWon(cat.cumulativeNetRevenue)}
                        </strong>
                        <span className="text-[11px] font-bold text-[#1E523F] ml-1">
                          ({formatPct(cat.revenueSharePct)})
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-[#EAE6DF] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#1B3B2B] h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(cat.revenueSharePct ?? 0, 100)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#5A6B63]">
                      <span>판매 수량: <strong className="text-[#1B382E] font-financial">{formatNum(cat.cumulativeQuantity)}개</strong></span>
                      <span>수량 점유율: <strong className="text-[#8C6D3B]">{formatPct(cat.quantitySharePct)}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3-B. 연도별 누적 판매 추이 */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#D0C6BB]/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-[#8C6D3B]" />
                  <h3 className="text-sm sm:text-base font-black text-[#1B382E]">
                    연도별 판매 실적 추이 ({yearlyBreakdown.map((y) => y.year).join(' · ')})
                  </h3>
                </div>
                <span className="text-xs font-bold text-[#5A6B63]">
                  누적 {formatNum(summary?.totalActiveDays)}일간
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {yearlyBreakdown.map((yr) => (
                  <div
                    key={yr.year}
                    className={`p-4 rounded-2xl border flex flex-col justify-between space-y-2.5 transition-all ${
                      yr.year === '2026'
                        ? 'bg-[#E8F2EE]/60 border-[#B4C6C1]'
                        : 'bg-[#FAF9F6] border-[#D0C6BB]/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-lg bg-[#1B3B2B] text-white text-xs font-black">
                        {yr.year}년
                      </span>
                      <span className="text-[10px] font-extrabold text-[#1E523F]">
                        매출비중 {formatPct(yr.revenueSharePct)}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] text-[#5A6B63] block">순매출</span>
                      <strong className="text-base sm:text-lg font-black text-[#1B382E] font-financial block">
                        {formatWon(yr.cumulativeNetRevenue)}
                      </strong>
                    </div>

                    <div className="pt-2 border-t border-[#D0C6BB]/40 flex items-center justify-between text-[11px] text-[#5A6B63]">
                      <span>판매량: <strong className="text-[#1B382E] font-financial">{formatNum(yr.cumulativeQuantity)}개</strong></span>
                      <span>({formatNum(yr.itemCount)}종)</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-[#FAF9F6] p-3 rounded-2xl border border-[#D0C6BB]/60 text-xs text-[#5A6B63] flex items-center gap-2">
                <Sparkles size={14} className="text-[#B59269] shrink-0" />
                <span>
                  <strong>2024년 4월 개장</strong> 이후 판매 품목이 164종에서 2026년 212종으로 확대되며 캐릭터 MD 중심의 판매 전환율이 지속 상승하고 있습니다.
                </span>
              </div>
            </div>
          </div>

          {/* ====================================================================
              4. 메인 랭킹 뷰 모드 탭 & 검색 바
             ==================================================================== */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#D0C6BB]/90 shadow-2xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* 3대 뷰 탭 전환 */}
              <div className="inline-flex p-1 rounded-2xl bg-[#FAF9F6] border border-[#D0C6BB]/80 self-start md:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveRankTab('REVENUE')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
                    activeRankTab === 'REVENUE'
                      ? 'bg-[#1B3B2B] text-white shadow-xs'
                      : 'text-[#5A6B63] hover:text-[#1B382E]'
                  }`}
                >
                  <Trophy size={14} className={activeRankTab === 'REVENUE' ? 'text-[#B59269]' : ''} />
                  <span>💰 판매 금액 랭킹 (Top Revenue)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveRankTab('QUANTITY')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
                    activeRankTab === 'QUANTITY'
                      ? 'bg-[#1B3B2B] text-white shadow-xs'
                      : 'text-[#5A6B63] hover:text-[#1B382E]'
                  }`}
                >
                  <Package size={14} className={activeRankTab === 'QUANTITY' ? 'text-[#B59269]' : ''} />
                  <span>📦 판매 수량 랭킹 (Top Quantity)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveRankTab('DUAL')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
                    activeRankTab === 'DUAL'
                      ? 'bg-[#8C6D3B] text-white shadow-xs'
                      : 'text-[#8C6D3B] hover:text-[#1B382E]'
                  }`}
                >
                  <Layers size={14} />
                  <span>⚖️ 1:1 나란히 비교</span>
                </button>
              </div>

              {/* 검색창 */}
              <div className="relative w-full md:w-72">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5A6B63]" />
                <input
                  type="text"
                  placeholder="상품명 또는 상품코드 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#D0C6BB]/80 bg-[#FAF9F6] text-xs font-bold text-[#1B382E] placeholder-[#8A9B93] focus:outline-none focus:border-[#1B3B2B] transition-colors"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#5A6B63] hover:text-[#1B382E]"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* 안내 텍스트 */}
            <div className="flex items-center justify-between text-xs text-[#5A6B63] pt-2 border-t border-[#D0C6BB]/40">
              <span className="flex items-center gap-1.5">
                <span>💡</span>
                {activeRankTab === 'REVENUE' && (
                  <span>
                    <strong>판매 금액 순위:</strong> 누적 순매출이 가장 높은 순서대로 정렬됩니다. (수익 기여도 중심)
                  </span>
                )}
                {activeRankTab === 'QUANTITY' && (
                  <span>
                    <strong>판매 수량 순위:</strong> 고객이 가장 많이 구매한 개수 순서대로 정렬됩니다. (대중적 인기 중심)
                  </span>
                )}
                {activeRankTab === 'DUAL' && (
                  <span>
                    <strong>1:1 나란히 비교:</strong> 금액 랭킹과 수량 랭킹을 한눈에 대조하여 객단가가 높은 효자 상품과 박리다매 상품을 분석합니다.
                  </span>
                )}
              </span>
              <span className="font-bold text-[#1B382E]">
                조회 품목: {formatNum(activeRankTab === 'QUANTITY' ? filteredQuantityList.length : filteredRevenueList.length)}종
              </span>
            </div>
          </div>

          {/* ====================================================================
              5. 메인 테이블 렌더링 (단일 랭킹 또는 1:1 비교)
             ==================================================================== */}
          {activeRankTab === 'DUAL' ? (
            /* 5-A. 1:1 나란히 비교 뷰 (Side-by-Side Dual View) */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* 좌측: 금액 랭킹 Top 10 */}
              <div className="bg-white rounded-3xl p-5 border border-[#D0C6BB]/80 shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#D0C6BB]/60">
                  <div className="flex items-center gap-2">
                    <Trophy size={16} className="text-[#B59269]" />
                    <h3 className="text-sm font-black text-[#1B382E]">
                      💰 판매 금액 랭킹 Top 10 (매출 기여도)
                    </h3>
                  </div>
                  <span className="text-[10px] text-[#5A6B63] font-extrabold bg-[#FAF9F6] px-2 py-0.5 rounded border border-[#D0C6BB]/60">
                    금액 순
                  </span>
                </div>

                <div className="divide-y divide-[#D0C6BB]/40">
                  {filteredRevenueList.slice(0, 10).map((item) => (
                    <div key={`dual-rev-${item.productCode}`} className="py-2.5 flex items-center justify-between gap-2 hover:bg-[#FAF9F6] px-1 rounded-lg transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {getRankBadge(item.rank)}
                        <div className="min-w-0">
                          <div className="font-black text-xs text-[#1B382E] truncate" title={item.itemName}>
                            {item.itemName}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-[#5A6B63] mt-0.5">
                            <span className={`px-1.5 py-0.1 rounded text-[9px] font-bold border ${getItemTypeBadgeStyle(item.itemType)}`}>
                              {item.itemTypeLabel}
                            </span>
                            <span>수량 {formatNum(item.cumulativeQuantity)}개</span>
                            <span className="text-[#8C6D3B] font-bold">(수량 {item.quantityRank}위)</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <strong className="text-xs sm:text-sm font-black text-[#1B382E] font-financial block">
                          {formatWon(item.cumulativeNetRevenue)}
                        </strong>
                        <span className="text-[10px] font-extrabold text-[#1E523F]">
                          비중 {formatPct(item.revenueSharePct)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 우측: 수량 랭킹 Top 10 */}
              <div className="bg-white rounded-3xl p-5 border border-[#D0C6BB]/80 shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#D0C6BB]/60">
                  <div className="flex items-center gap-2">
                    <Package size={16} className="text-[#1E523F]" />
                    <h3 className="text-sm font-black text-[#1B382E]">
                      📦 판매 수량 랭킹 Top 10 (인기 다매)
                    </h3>
                  </div>
                  <span className="text-[10px] text-[#5A6B63] font-extrabold bg-[#FAF9F6] px-2 py-0.5 rounded border border-[#D0C6BB]/60">
                    수량 순
                  </span>
                </div>

                <div className="divide-y divide-[#D0C6BB]/40">
                  {filteredQuantityList.slice(0, 10).map((item) => (
                    <div key={`dual-qty-${item.productCode}`} className="py-2.5 flex items-center justify-between gap-2 hover:bg-[#FAF9F6] px-1 rounded-lg transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {getRankBadge(item.rank)}
                        <div className="min-w-0">
                          <div className="font-black text-xs text-[#1B382E] truncate" title={item.itemName}>
                            {item.itemName}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-[#5A6B63] mt-0.5">
                            <span className={`px-1.5 py-0.1 rounded text-[9px] font-bold border ${getItemTypeBadgeStyle(item.itemType)}`}>
                              {item.itemTypeLabel}
                            </span>
                            <span>매출 {formatWon(item.cumulativeNetRevenue)}</span>
                            <span className="text-[#1E523F] font-bold">(금액 {item.revenueRank}위)</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <strong className="text-xs sm:text-sm font-black text-[#1B3B2B] font-financial block">
                          {formatNum(item.cumulativeQuantity)}개
                        </strong>
                        <span className="text-[10px] font-extrabold text-[#8C6D3B]">
                          비중 {formatPct(item.quantitySharePct)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* 5-B. 상세 랭킹 마스터 테이블 (금액 랭킹 또는 수량 랭킹 단일 뷰) */
            <div className="bg-white rounded-3xl border border-[#D0C6BB]/80 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
                  <thead>
                    <tr className="bg-[#F4F3EE] text-[#5A6B63] font-extrabold border-b border-[#D0C6BB]/80">
                      <th className="py-3 px-4 text-center w-14">순위</th>
                      <th className="py-3 px-3">상품코드</th>
                      <th className="py-3 px-4">상품명</th>
                      <th className="py-3 px-3 text-center">품목 유형</th>
                      <th className="py-3 px-4 text-right">
                        {activeRankTab === 'REVENUE' ? '🎯 누적 순매출 (공급가)' : '누적 순매출 (공급가)'}
                      </th>
                      <th className="py-3 px-3 text-right">매출 비중</th>
                      <th className="py-3 px-4 text-right">
                        {activeRankTab === 'QUANTITY' ? '🎯 누적 판매수량' : '누적 판매수량'}
                      </th>
                      <th className="py-3 px-3 text-right">수량 비중</th>
                      <th className="py-3 px-4 text-right">평균 순단가</th>
                      <th className="py-3 px-3 text-center">교차 순위</th>
                      <th className="py-3 px-4 text-center">판매 기간</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D0C6BB]/40">
                    {(activeRankTab === 'REVENUE' ? filteredRevenueList : filteredQuantityList).map((item) => {
                      const isTop3 = item.rank <= 3;
                      return (
                        <tr
                          key={item.productCode}
                          className={`hover:bg-[#FAF9F6] transition-colors ${
                            isTop3 ? 'bg-[#FAF6ED]/30 font-semibold' : ''
                          }`}
                        >
                          {/* 순위 */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center">
                              {getRankBadge(item.rank)}
                            </div>
                          </td>

                          {/* 상품코드 */}
                          <td className="py-3 px-3 font-mono text-[11px] text-[#5A6B63]">
                            {item.productCode}
                          </td>

                          {/* 상품명 */}
                          <td className="py-3 px-4">
                            <div className="font-black text-xs sm:text-sm text-[#1B382E]">
                              {item.itemName}
                            </div>
                            {item.yearlySales && (
                              <div className="flex items-center gap-1.5 mt-0.5 text-[9px] text-[#5A6B63]">
                                {item.yearlySales.yr2024 && (
                                  <span className="bg-[#FAF9F6] px-1 py-0.2 rounded border border-[#D0C6BB]/50">
                                    '24: {item.yearlySales.yr2024.qty}개
                                  </span>
                                )}
                                {item.yearlySales.yr2025 && (
                                  <span className="bg-[#FAF9F6] px-1 py-0.2 rounded border border-[#D0C6BB]/50">
                                    '25: {item.yearlySales.yr2025.qty}개
                                  </span>
                                )}
                                {item.yearlySales.yr2026 && (
                                  <span className="bg-[#E8F2EE] text-[#1E523F] px-1 py-0.2 rounded border border-[#B4C6C1] font-bold">
                                    '26: {item.yearlySales.yr2026.qty}개
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* 품목 유형 */}
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${getItemTypeBadgeStyle(item.itemType)}`}>
                              {item.itemTypeLabel}
                            </span>
                          </td>

                          {/* 누적 순매출 */}
                          <td className={`py-3 px-4 text-right font-financial ${
                            activeRankTab === 'REVENUE' ? 'font-black text-xs sm:text-sm text-[#1B3B2B] bg-[#E8F2EE]/30' : 'font-extrabold text-[#1B382E]'
                          }`}>
                            {formatWon(item.cumulativeNetRevenue)}
                          </td>

                          {/* 매출 비중 */}
                          <td className="py-3 px-3 text-right">
                            <div className="font-bold text-[#1E523F] font-financial">
                              {formatPct(item.revenueSharePct)}
                            </div>
                            {item.cumulativeRevenueSharePct != null && (
                              <div className="text-[9px] text-[#5A6B63]" title="파레토 누적 비중">
                                누적 {formatPct(item.cumulativeRevenueSharePct)}
                              </div>
                            )}
                          </td>

                          {/* 누적 판매수량 */}
                          <td className={`py-3 px-4 text-right font-financial ${
                            activeRankTab === 'QUANTITY' ? 'font-black text-xs sm:text-sm text-[#1B3B2B] bg-[#E8F2EE]/30' : 'font-extrabold text-[#1B382E]'
                          }`}>
                            {formatNum(item.cumulativeQuantity)}개
                          </td>

                          {/* 수량 비중 */}
                          <td className="py-3 px-3 text-right">
                            <div className="font-bold text-[#8C6D3B] font-financial">
                              {formatPct(item.quantitySharePct)}
                            </div>
                            {item.cumulativeQuantitySharePct != null && (
                              <div className="text-[9px] text-[#5A6B63]" title="파레토 누적 비중">
                                누적 {formatPct(item.cumulativeQuantitySharePct)}
                              </div>
                            )}
                          </td>

                          {/* 평균 순단가 */}
                          <td className="py-3 px-4 text-right font-financial font-extrabold text-[#5A6B63]">
                            {formatWon(item.avgNetUnitPrice)}
                          </td>

                          {/* 교차 순위 (금액 vs 수량 랭킹 대조) */}
                          <td className="py-3 px-3 text-center">
                            {activeRankTab === 'REVENUE' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#FAF6ED] text-[#8C6D3B] border border-[#E5DAC1]">
                                수량 {item.quantityRank}위
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]">
                                금액 {item.revenueRank}위
                              </span>
                            )}
                          </td>

                          {/* 판매 기간 */}
                          <td className="py-3 px-4 text-center text-[10px] text-[#5A6B63]">
                            <div>{item.firstSoldDate || '-'} ~ {item.lastSoldDate || '-'}</div>
                            {item.activeDays != null && (
                              <div className="text-[9px] text-[#8A9B93]">({formatNum(item.activeDays)}일간 판매)</div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
