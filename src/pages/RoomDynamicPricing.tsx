import React, { useState, useEffect } from 'react';
import {
  Hotel, Calendar, TrendingUp, Sparkles, RefreshCw,
  ArrowUpRight, ArrowDownRight, ShieldCheck, Layers,
  Tag, Zap, Flame, AlertCircle,
  ChevronDown, ChevronUp, Compass, Package, Target
} from 'lucide-react';
import { secureFetcher } from '../lib/secureFetcher';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

// ============================================================================
// TypeScript Interfaces (SSOT Backend Schema)
// ============================================================================

export type DynamicActionCode = 'YIELD_UP' | 'HOLD' | 'BUNDLE_PROMO' | 'FLASH_SALE' | string;

export interface RoomDynamicPricingMeta {
  baseDate: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  physicalKeysCapacity: number;
  fixedMonthlyCapacity: number;
  fixedOccupancyBenchmarkPct: number;
}

export interface HistoricalPeriodSummary {
  startDate: string;
  endDate: string;
  totalRoomsSold: number | null;
  totalRevenue: number | null;
  overallAdr: number | null;
  retailRoomsSold: number | null;
  retailRevenue: number | null;
  retailAdr: number | null;
  avgOccupancyPct: number | null;
  yoyRetailAdrGrowthPct?: number | null;
}

export interface CurrentOtbSummary {
  totalBookedRooms: number | null;
  totalOccupiedKeys: number | null;
  totalCapacityKeys: number | null;
  currentOtbOccupancyPct: number | null;
  yoySameLeadBookedRooms: number | null;
  yoySameLeadOccupiedKeys: number | null;
  bookingPacePct: number | null;
  projectedTotalOccupiedKeys: number | null;
  projectedOccupancyPct: number | null;
}

export interface PricingRecommendationSummary {
  avgBaselineAdr: number | null;
  avgRecommendedAdr: number | null;
  avgAdrLiftPct: number | null;
  baselineProjectedRevenue: number | null;
  dynamicProjectedRevenue: number | null;
  expectedRevenueGain: number | null;
  expectedRevenueGainPct: number | null;
  yieldUpDays: number | null;
  holdDays: number | null;
  bundlePromoDays: number | null;
  flashSaleDays: number | null;
}

export interface RoomTypeBenchmarkItem {
  roomType: string;
  categoryGroup: string;
  physicalCapacity: number | null;
  adr2025Retail: number | null;
  adr2026RecentRetail: number | null;
  yoyGrowthPct: number | null;
  baselineByDayType: {
    weekday: number | null;
    friday: number | null;
    satHoliday: number | null;
    sunday: number | null;
  };
  next30dOtbRooms: number | null;
  next30dOtbOccupancyPct: number | null;
  next30dAvgRecommendedAdr: number | null;
  next30dFloorAdr: number | null;
  next30dCeilingAdr: number | null;
  recommendedBundle: string | null;
}

export interface DailyRoomTypeDetail {
  roomType: string;
  capacity: number | null;
  otbBooked: number | null;
  remainingSellable: number | null;
  otbOccupancyPct: number | null;
  adr2025Retail: number | null;
  adr2026RecentRetail: number | null;
  baselineAdr: number | null;
  recommendedAdr: number | null;
  floorAdr: number | null;
  ceilingAdr: number | null;
  adjustmentPct: number | null;
  actionCode: DynamicActionCode;
  actionLabel: string;
}

export interface DailyCalendarItem {
  date: string;
  dateId: string;
  dayOfWeek: string;
  dayType: string;
  dayTypeLabel: string;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName: string;
  leadDays: number | null;
  yoyMatchDate: string;
  inventory: {
    physicalKeyCapacity: number | null;
    otbRoomsBooked: number | null;
    otbOccupiedKeys: number | null;
    remainingKeys: number | null;
    currentOtbOccupancyPct: number | null;
    yoySameLeadOtbRooms: number | null;
    yoySameLeadOccupiedKeys: number | null;
    yoyFinalRoomsSold: number | null;
    yoyFinalOccupiedKeys: number | null;
    yoyFinalOccupancyPct: number | null;
    bookingPacePct: number | null;
    bookingPaceStatus: string;
    projectedOccupiedKeys: number | null;
    projectedOccupancyPct: number | null;
  };
  pricing: {
    yoy2025OverallAdr: number | null;
    yoy2025RetailAdr: number | null;
    recent2026RetailAdr: number | null;
    baselineAdr: number | null;
    recommendedAdr: number | null;
    priceAdjustmentPct: number | null;
    floorAdr: number | null;
    ceilingAdr: number | null;
    baselineProjectedRevenue: number | null;
    dynamicProjectedRevenue: number | null;
    expectedRevenueDelta: number | null;
  };
  marketing: {
    actionCode: DynamicActionCode;
    actionLabel: string;
    urgencyLevel: 'HIGH' | 'MEDIUM' | 'LOW' | string;
    targetChannel: string;
    promoBundleItem: string;
    recommendationText: string;
  };
  roomTypes: DailyRoomTypeDetail[];
}

export interface RoomDynamicPricingResponse {
  success: boolean;
  meta: RoomDynamicPricingMeta;
  summary: {
    historical2025: HistoricalPeriodSummary;
    recent2026: HistoricalPeriodSummary;
    currentOtb: CurrentOtbSummary;
    pricingRecommendation: PricingRecommendationSummary;
  };
  roomTypeBenchmarks: RoomTypeBenchmarkItem[];
  dailyCalendar: DailyCalendarItem[];
}

const ROOM_TYPE_OPTIONS = [
  { value: 'ALL', label: '전체 평형 (ALL)' },
  { value: '16평', label: '16평 (스탠다드)' },
  { value: '35평', label: '35평 (스위트)' },
  { value: '51평', label: '51평 (로얄)' },
  { value: '펫룸 16평', label: '펫룸 16평' },
  { value: '펫룸 35평', label: '펫룸 35평' },
  { value: '펫룸 51평', label: '펫룸 51평' }
];

// ============================================================================
// Pure Formatting Helpers (Zero-Proxy & Fail-Loudly)
// ============================================================================

const formatNum = (val: number | null | undefined): string => {
  if (val === null || val === undefined || Number.isNaN(Number(val))) return '-';
  return Number(val).toLocaleString('ko-KR');
};

const formatWon = (val: number | null | undefined): string => {
  if (val === null || val === undefined || Number.isNaN(Number(val))) return '-';
  return `${Number(val).toLocaleString('ko-KR')}원`;
};

const formatSignedWon = (val: number | null | undefined): string => {
  if (val === null || val === undefined || Number.isNaN(Number(val))) return '-';
  const num = Number(val);
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toLocaleString('ko-KR')}원`;
};

const formatPct = (val: number | null | undefined): string => {
  if (val === null || val === undefined || Number.isNaN(Number(val))) return '-';
  return `${Number(val).toFixed(1)}%`;
};

const formatSignedPct = (val: number | null | undefined): string => {
  if (val === null || val === undefined || Number.isNaN(Number(val))) return '-';
  const num = Number(val);
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(1)}%`;
};

const getActionBadgeStyle = (actionCode: DynamicActionCode) => {
  switch (actionCode) {
    case 'YIELD_UP':
      return {
        bg: 'bg-[#E8F2EE]',
        text: 'text-[#1E523F]',
        border: 'border-[#B4C6C1]',
        dot: 'bg-[#1E523F]',
        icon: <TrendingUp size={13} className="shrink-0 text-[#1E523F]" />,
        shortTitle: 'YIELD UP · 단가 상향'
      };
    case 'HOLD':
      return {
        bg: 'bg-[#F4F3EE]',
        text: 'text-[#284F42]',
        border: 'border-[#D0C6BB]',
        dot: 'bg-[#284F42]',
        icon: <ShieldCheck size={13} className="shrink-0 text-[#284F42]" />,
        shortTitle: 'HOLD · 기준가 유지'
      };
    case 'BUNDLE_PROMO':
      return {
        bg: 'bg-[#FAF6ED]',
        text: 'text-[#8C6D3B]',
        border: 'border-[#E5DAC1]',
        dot: 'bg-[#B59269]',
        icon: <Package size={13} className="shrink-0 text-[#8C6D3B]" />,
        shortTitle: 'BUNDLE PROMO · 레저 번들 특전'
      };
    case 'FLASH_SALE':
      return {
        bg: 'bg-[#FDF0ED]',
        text: 'text-[#8B2635]',
        border: 'border-[#EAC5BD]',
        dot: 'bg-[#8B2635]',
        icon: <Flame size={13} className="shrink-0 text-[#8B2635]" />,
        shortTitle: 'FLASH SALE · 임박 타임세일'
      };
    default:
      return {
        bg: 'bg-[#F4F3EE]',
        text: 'text-[#5A6B63]',
        border: 'border-[#D0C6BB]',
        dot: 'bg-[#5A6B63]',
        icon: <Tag size={13} className="shrink-0 text-[#5A6B63]" />,
        shortTitle: actionCode || '-'
      };
  }
};

const getUrgencyBadge = (urgency: string | null | undefined) => {
  if (!urgency) return null;
  if (urgency === 'HIGH') {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FDF0ED] text-[#8B2635] border border-[#EAC5BD]">
        긴급도 HIGH
      </span>
    );
  }
  if (urgency === 'MEDIUM') {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FAF6ED] text-[#8C6D3B] border border-[#E5DAC1]">
        긴급도 MEDIUM
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]">
      안정 LOW
    </span>
  );
};

// ============================================================================
// Main Page Component
// ============================================================================

export default function RoomDynamicPricing() {
  const [baseDate, setBaseDate] = useState<string>('2026-10-19');
  const [days, setDays] = useState<number>(30);
  const [selectedRoomType, setSelectedRoomType] = useState<string>('ALL');
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>('ALL');

  const [data, setData] = useState<RoomDynamicPricingResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  const fetchDynamicPricing = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `${API_BASE}/api/v6/report/room-dynamic-pricing?date=${encodeURIComponent(baseDate)}&days=${days}&roomType=${encodeURIComponent(selectedRoomType)}`;
      const res = await secureFetcher(url);
      const payload: RoomDynamicPricingResponse = res?.data ? res.data : res;

      if (!payload || payload.success === false) {
        throw new Error('다이나믹 프라이싱 API 응답을 불러올 수 없습니다.');
      }

      setData(payload);
      if (Array.isArray(payload.dailyCalendar) && payload.dailyCalendar.length > 0) {
        const exists = payload.dailyCalendar.some((d) => d.date === selectedDateStr);
        if (!selectedDateStr || !exists) {
          setSelectedDateStr(payload.dailyCalendar[0].date);
        }
      } else {
        setSelectedDateStr(null);
      }
    } catch (err: any) {
      console.error('Failed to load room dynamic pricing:', err);
      setError(err?.message || '데이터 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDynamicPricing();
  }, [baseDate, days, selectedRoomType]);

  const meta = data?.meta;
  const summary = data?.summary;
  const hist2025 = summary?.historical2025;
  const recent2026 = summary?.recent2026;
  const currentOtb = summary?.currentOtb;
  const pricingRec = summary?.pricingRecommendation;
  const benchmarks = data?.roomTypeBenchmarks || [];
  const dailyCalendar = data?.dailyCalendar || [];

  const filteredCalendar = selectedActionFilter === 'ALL'
    ? dailyCalendar
    : dailyCalendar.filter((item) => item.marketing?.actionCode === selectedActionFilter);

  const selectedDayItem = dailyCalendar.find((item) => item.date === selectedDateStr) || dailyCalendar[0] || null;

  return (
    <div className="w-full min-h-screen bg-[#F4F3EE] text-[#1B382E] tracking-tight pb-20 relative">
      {/* Ambient Deep Forest Glow Banner */}
      <div className="w-full bg-[#284F42] h-[220px] absolute top-0 left-0 z-0 overflow-hidden rounded-b-[36px] border-b border-[#1B382E] shadow-xl">
        <div className="absolute -top-16 -right-16 w-96 h-96 rounded-full bg-[#2F5548] opacity-70 pointer-events-none" />
        <div className="absolute top-8 left-1/3 w-80 h-80 rounded-full bg-[#2F5548] opacity-40 blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 right-1/4 w-60 h-60 rounded-full bg-[#1B382E] opacity-60 pointer-events-none" />
      </div>

      <div className="relative z-10 max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Top Header & Query Filter Bar */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 lg:p-7 border border-[#D0C6BB]/80 shadow-[0_4px_24px_rgba(40,79,66,0.08)]">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1B382E] border border-[#284F42] text-white text-xs font-semibold shadow-xs mb-3">
                <span className="w-2 h-2 rounded-full bg-[#5FB878] animate-pulse" />
                <span>BELLEFORET RESORT · DYNAMIC PRICING & YIELD ENGINE</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1B382E] tracking-tight flex items-center gap-3 flex-wrap">
                <span className="p-2.5 rounded-2xl bg-[#284F42] text-white shadow-xs inline-flex">
                  <Sparkles size={22} className="text-[#B59269]" />
                </span>
                <span>객실 30일 다이나믹 프라이싱 & 마케팅 ADR 제안</span>
              </h1>
              <p className="text-xs sm:text-sm text-[#5A6B63] mt-1.5 font-medium">
                2025년(365일)·2026년 실측 객실 정산 마트(`fact_room_sales_v6`)와 향후 30일 실시간 예약 잔량(`On-The-Books`) 기반 최적 ADR 및 번들 프로모션 의사결정 대시보드
              </p>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-3 bg-[#F4F3EE] p-3 rounded-2xl border border-[#D0C6BB]/70">
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-[#D0C6BB]/80 shadow-2xs">
                <Calendar size={15} className="text-[#284F42]" />
                <span className="text-xs font-bold text-[#5A6B63]">기준일</span>
                <input
                  type="date"
                  value={baseDate}
                  onChange={(e) => setBaseDate(e.target.value)}
                  className="text-xs sm:text-sm font-extrabold text-[#1B382E] outline-none bg-transparent cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-[#D0C6BB]/80 shadow-2xs">
                <Compass size={15} className="text-[#284F42]" />
                <span className="text-xs font-bold text-[#5A6B63]">조회일수</span>
                <select
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="text-xs sm:text-sm font-extrabold text-[#1B382E] outline-none bg-transparent cursor-pointer"
                >
                  <option value={14}>향후 14일</option>
                  <option value={30}>향후 30일</option>
                  <option value={60}>향후 60일</option>
                </select>
              </div>

              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-[#D0C6BB]/80 shadow-2xs">
                <Hotel size={15} className="text-[#284F42]" />
                <span className="text-xs font-bold text-[#5A6B63]">평형</span>
                <select
                  value={selectedRoomType}
                  onChange={(e) => setSelectedRoomType(e.target.value)}
                  className="text-xs sm:text-sm font-extrabold text-[#1B382E] outline-none bg-transparent cursor-pointer"
                >
                  {ROOM_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={fetchDynamicPricing}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl bg-[#284F42] hover:bg-[#1B382E] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                <span>새로고침</span>
              </button>
            </div>
          </div>

          {/* Room Type Quick Filter Pills & SSOT Meta Strip */}
          <div className="mt-5 pt-4 border-t border-[#D0C6BB]/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {ROOM_TYPE_OPTIONS.map((opt) => {
                const isActive = selectedRoomType === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedRoomType(opt.value)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#284F42] text-white shadow-xs'
                        : 'bg-[#F4F3EE] text-[#5A6B63] hover:text-[#1B382E] border border-[#D0C6BB]/60'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {meta && (
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#5A6B63] font-medium">
                <span className="bg-[#F4F3EE] px-3 py-1 rounded-lg border border-[#D0C6BB]/60">
                  분석 구간: <strong className="text-[#1B382E]">{meta.startDate} ~ {meta.endDate} ({formatNum(meta.totalDays)}일간)</strong>
                </span>
                <span className="bg-[#F4F3EE] px-3 py-1 rounded-lg border border-[#D0C6BB]/60">
                  일일 물리 Key: <strong className="text-[#1B382E]">{formatNum(meta.physicalKeysCapacity)} Key</strong>
                </span>
                <span className="bg-[#E8F2EE] text-[#1E523F] px-3 py-1 rounded-lg border border-[#B4C6C1]/70 font-bold">
                  고정 모수 SSOT: 월 {formatNum(meta.fixedMonthlyCapacity)}실 (기준 가동률 {meta.fixedOccupancyBenchmarkPct != null ? `${meta.fixedOccupancyBenchmarkPct}%` : '-'})
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Error / Loading States */}
        {error && (
          <div className="bg-[#FDF0ED] border border-[#EAC5BD] rounded-3xl p-6 text-[#8B2635] flex items-center gap-3 shadow-xs">
            <AlertCircle size={22} className="shrink-0" />
            <div className="text-sm font-bold">{error}</div>
          </div>
        )}

        {loading && !data ? (
          <div className="bg-white rounded-3xl p-16 border border-[#D0C6BB]/75 shadow-xs flex flex-col items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#284F42]" />
            <p className="text-sm font-bold text-[#5A6B63]">30일 실시간 예약(OTB) 및 다이나믹 ADR 모델을 불러오는 중입니다...</p>
          </div>
        ) : data && (
          <>
            {/* ====================================================================
                1. 상단 Executive Summary 벤토 카드 (4열)
               ==================================================================== */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              {/* Card 1: 현재 30일 확보 가동률 (OTB) */}
              <div className="bg-white rounded-3xl p-6 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-extrabold text-[#5A6B63] uppercase tracking-wider">
                      1. 현재 확보 가동률 (30일 OTB)
                    </span>
                    <span className="p-2 rounded-xl bg-[#E8F2EE] text-[#1E523F]">
                      <Hotel size={18} />
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2.5">
                    <span className="text-3xl font-black text-[#1B382E] font-financial">
                      {formatPct(currentOtb?.currentOtbOccupancyPct)}
                    </span>
                    <span className="text-xs font-bold text-[#1E523F] bg-[#E8F2EE] px-2.5 py-0.5 rounded-full border border-[#B4C6C1]/70">
                      예상 최종 {formatPct(currentOtb?.projectedOccupancyPct)}
                    </span>
                  </div>

                  <p className="text-xs text-[#5A6B63] mt-2 font-medium">
                    확보 Key: <strong className="text-[#1B382E]">{formatNum(currentOtb?.totalOccupiedKeys)}</strong> / {formatNum(currentOtb?.totalCapacityKeys)} Key
                    <span className="ml-1 text-[#5A6B63]">({formatNum(currentOtb?.totalBookedRooms)}실 예약)</span>
                  </p>
                </div>

                <div className="mt-4 pt-3.5 border-t border-[#D0C6BB]/50 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#5A6B63] font-medium">전년 동리드타임 대비 페이스</span>
                    <span className="font-extrabold text-[#1E523F]">
                      {formatPct(currentOtb?.bookingPacePct)} (전년 {formatNum(currentOtb?.yoySameLeadOccupiedKeys)} Key)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#5A6B63] font-medium">최종 예상 점유 Key</span>
                    <span className="font-extrabold text-[#1B382E]">
                      {formatNum(currentOtb?.projectedTotalOccupiedKeys)} Key
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: 2025 동기 vs 2026 최근 Retail ADR */}
              <div className="bg-white rounded-3xl p-6 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-extrabold text-[#5A6B63] uppercase tracking-wider">
                      2. 2025 동기 vs 2026 최근 Retail ADR
                    </span>
                    <span className="p-2 rounded-xl bg-[#FAF6ED] text-[#8C6D3B]">
                      <TrendingUp size={18} />
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-sm font-bold text-[#5A6B63] line-through">
                      {formatWon(hist2025?.retailAdr)}
                    </span>
                    <span className="text-[#5A6B63] font-bold">➔</span>
                    <span className="text-2xl sm:text-3xl font-black text-[#1B382E] font-financial">
                      {formatWon(recent2026?.retailAdr)}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                      (recent2026?.yoyRetailAdrGrowthPct ?? 0) >= 0
                        ? 'bg-[#E8F2EE] text-[#1E523F] border-[#B4C6C1]/70'
                        : 'bg-[#FDF0ED] text-[#8B2635] border-[#EAC5BD]/70'
                    }`}>
                      {(recent2026?.yoyRetailAdrGrowthPct ?? 0) >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                      Retail ADR {formatSignedPct(recent2026?.yoyRetailAdrGrowthPct)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3.5 border-t border-[#D0C6BB]/50 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#5A6B63] font-medium">2025 동기 전체 ADR ({formatPct(hist2025?.avgOccupancyPct)})</span>
                    <span className="font-bold text-[#1B382E]">{formatWon(hist2025?.overallAdr)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#5A6B63] font-medium">2026 최근 전체 ADR ({formatPct(recent2026?.avgOccupancyPct)})</span>
                    <span className="font-bold text-[#1B382E]">{formatWon(recent2026?.overallAdr)}</span>
                  </div>
                </div>
              </div>

              {/* Card 3: 향후 30일 추천 평균 ADR */}
              <div className="bg-white rounded-3xl p-6 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-extrabold text-[#5A6B63] uppercase tracking-wider">
                      3. 향후 30일 추천 평균 ADR
                    </span>
                    <span className="p-2 rounded-xl bg-[#284F42] text-white">
                      <Target size={18} />
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2.5 flex-wrap">
                    <span className="text-3xl font-black text-[#284F42] font-financial">
                      {formatWon(pricingRec?.avgRecommendedAdr)}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]/70">
                      기준가 대비 {formatSignedPct(pricingRec?.avgAdrLiftPct)}
                    </span>
                  </div>

                  <p className="text-xs text-[#5A6B63] mt-2 font-medium">
                    표준 기준가 평균: <strong className="text-[#1B382E]">{formatWon(pricingRec?.avgBaselineAdr)}</strong>
                  </p>
                </div>

                <div className="mt-4 pt-3.5 border-t border-[#D0C6BB]/50 grid grid-cols-4 gap-1.5 text-center">
                  <div className="bg-[#E8F2EE] rounded-xl py-1.5 px-1 border border-[#B4C6C1]/60">
                    <div className="text-[10px] font-bold text-[#1E523F]">단가상향</div>
                    <div className="text-xs font-black text-[#1E523F]">{formatNum(pricingRec?.yieldUpDays)}일</div>
                  </div>
                  <div className="bg-[#F4F3EE] rounded-xl py-1.5 px-1 border border-[#D0C6BB]/60">
                    <div className="text-[10px] font-bold text-[#284F42]">기준유지</div>
                    <div className="text-xs font-black text-[#284F42]">{formatNum(pricingRec?.holdDays)}일</div>
                  </div>
                  <div className="bg-[#FAF6ED] rounded-xl py-1.5 px-1 border border-[#E5DAC1]">
                    <div className="text-[10px] font-bold text-[#8C6D3B]">번들특전</div>
                    <div className="text-xs font-black text-[#8C6D3B]">{formatNum(pricingRec?.bundlePromoDays)}일</div>
                  </div>
                  <div className="bg-[#FDF0ED] rounded-xl py-1.5 px-1 border border-[#EAC5BD]">
                    <div className="text-[10px] font-bold text-[#8B2635]">타임세일</div>
                    <div className="text-xs font-black text-[#8B2635]">{formatNum(pricingRec?.flashSaleDays)}일</div>
                  </div>
                </div>
              </div>

              {/* Card 4: 다이나믹 프라이싱 예상 추가 수익 */}
              <div className="bg-[#284F42] text-white rounded-3xl p-6 border border-[#1B382E] shadow-[0_8px_28px_rgba(40,79,66,0.18)] flex flex-col justify-between relative overflow-hidden">
                <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-[#2F5548] opacity-50 pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-extrabold text-white/80 uppercase tracking-wider">
                      4. 다이나믹 프라이싱 예상 추가 수익
                    </span>
                    <span className="p-2 rounded-xl bg-[#B59269] text-white shadow-xs">
                      <Zap size={18} />
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-2xl sm:text-3xl font-black text-[#EAE3D2] font-financial">
                      {formatSignedWon(pricingRec?.expectedRevenueGain)}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-[#B59269] text-white">
                      {formatSignedPct(pricingRec?.expectedRevenueGainPct)}
                    </span>
                  </div>

                  <p className="text-xs text-white/80 mt-2 font-medium">
                    다이나믹 총 예상 매출: <strong className="text-white font-extrabold">{formatWon(pricingRec?.dynamicProjectedRevenue)}</strong>
                  </p>
                </div>

                <div className="relative z-10 mt-4 pt-3.5 border-t border-white/15 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-white/80">
                    <span>기준가 유지 시 예상 매출</span>
                    <span className="font-bold text-white">{formatWon(pricingRec?.baselineProjectedRevenue)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[#EAE3D2]">
                    <span className="font-bold">최적 ADR + 번들 적용 시</span>
                    <span className="font-extrabold">{formatWon(pricingRec?.dynamicProjectedRevenue)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ====================================================================
                2. 마케팅 액션 필터 배지 바 (actionCode별 일수 표시)
               ==================================================================== */}
            <div className="bg-white rounded-3xl p-5 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.05)] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#284F42]" />
                <h2 className="text-sm sm:text-base font-extrabold text-[#1B382E]">
                  마케팅 액션 코드별 일자 필터
                </h2>
                <span className="text-xs text-[#5A6B63] font-medium hidden sm:inline">
                  (배지를 클릭하면 하단 30일 캘린더가 해당 액션 일자만 필터링됩니다)
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => setSelectedActionFilter('ALL')}
                  className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer border ${
                    selectedActionFilter === 'ALL'
                      ? 'bg-[#1B382E] text-white border-[#1B382E] shadow-xs'
                      : 'bg-[#F4F3EE] text-[#1B382E] border-[#D0C6BB]/70 hover:bg-[#EAE6DF]'
                  }`}
                >
                  <span>전체 일자</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-[11px]">
                    {formatNum(dailyCalendar.length)}일
                  </span>
                </button>

                <button
                  onClick={() => setSelectedActionFilter(selectedActionFilter === 'YIELD_UP' ? 'ALL' : 'YIELD_UP')}
                  className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer border ${
                    selectedActionFilter === 'YIELD_UP'
                      ? 'bg-[#1E523F] text-white border-[#1E523F] shadow-xs'
                      : 'bg-[#E8F2EE] text-[#1E523F] border-[#B4C6C1] hover:opacity-90'
                  }`}
                >
                  <TrendingUp size={14} />
                  <span>YIELD_UP · 단가 상향</span>
                  <span className="px-2 py-0.5 rounded-full bg-black/10 text-[11px] font-black">
                    {formatNum(pricingRec?.yieldUpDays)}일
                  </span>
                </button>

                <button
                  onClick={() => setSelectedActionFilter(selectedActionFilter === 'HOLD' ? 'ALL' : 'HOLD')}
                  className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer border ${
                    selectedActionFilter === 'HOLD'
                      ? 'bg-[#284F42] text-white border-[#284F42] shadow-xs'
                      : 'bg-[#F4F3EE] text-[#284F42] border-[#D0C6BB] hover:bg-[#EAE6DF]'
                  }`}
                >
                  <ShieldCheck size={14} />
                  <span>HOLD · 기준가 유지</span>
                  <span className="px-2 py-0.5 rounded-full bg-black/10 text-[11px] font-black">
                    {formatNum(pricingRec?.holdDays)}일
                  </span>
                </button>

                <button
                  onClick={() => setSelectedActionFilter(selectedActionFilter === 'BUNDLE_PROMO' ? 'ALL' : 'BUNDLE_PROMO')}
                  className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer border ${
                    selectedActionFilter === 'BUNDLE_PROMO'
                      ? 'bg-[#B59269] text-white border-[#B59269] shadow-xs'
                      : 'bg-[#FAF6ED] text-[#8C6D3B] border-[#E5DAC1] hover:opacity-90'
                  }`}
                >
                  <Package size={14} />
                  <span>BUNDLE_PROMO · 레저 번들 특전</span>
                  <span className="px-2 py-0.5 rounded-full bg-black/10 text-[11px] font-black">
                    {formatNum(pricingRec?.bundlePromoDays)}일
                  </span>
                </button>

                <button
                  onClick={() => setSelectedActionFilter(selectedActionFilter === 'FLASH_SALE' ? 'ALL' : 'FLASH_SALE')}
                  className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer border ${
                    selectedActionFilter === 'FLASH_SALE'
                      ? 'bg-[#8B2635] text-white border-[#8B2635] shadow-xs'
                      : 'bg-[#FDF0ED] text-[#8B2635] border-[#EAC5BD] hover:opacity-90'
                  }`}
                >
                  <Flame size={14} />
                  <span>FLASH_SALE · 임박 타임세일</span>
                  <span className="px-2 py-0.5 rounded-full bg-black/10 text-[11px] font-black">
                    {formatNum(pricingRec?.flashSaleDays)}일
                  </span>
                </button>
              </div>
            </div>

            {/* ====================================================================
                3. 평형별 기준 단가 & 추천 번들 매트릭스 (roomTypeBenchmarks[])
               ==================================================================== */}
            <div className="bg-white rounded-3xl p-6 lg:p-7 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D0C6BB]/50 pb-4">
                <div>
                  <h2 className="text-lg font-extrabold text-[#1B382E] flex items-center gap-2">
                    <Layers size={19} className="text-[#284F42]" />
                    <span>평형별 기준 단가(Baseline) & 추천 레저 번들 매트릭스</span>
                  </h2>
                  <p className="text-xs text-[#5A6B63] mt-0.5 font-medium">
                    2025년 동기 및 2026년 최근 실측 Retail ADR, 요일별 기준가, 향후 30일 상·하한 방어선(Floor ~ Ceiling) 및 최적 결합 상품
                  </p>
                </div>
                <span className="text-xs font-bold text-[#284F42] bg-[#F4F3EE] px-3 py-1.5 rounded-xl border border-[#D0C6BB]/60 self-start sm:self-auto">
                  총 {formatNum(benchmarks.length)}개 객실 평형
                </span>
              </div>

              {/* Benchmark Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {benchmarks.map((bm) => {
                  const isPositive = (bm.yoyGrowthPct ?? 0) >= 0;
                  return (
                    <div
                      key={bm.roomType}
                      onClick={() => setSelectedRoomType(bm.roomType === selectedRoomType ? 'ALL' : bm.roomType)}
                      className={`rounded-2xl p-5 border transition-all cursor-pointer ${
                        selectedRoomType === bm.roomType
                          ? 'bg-[#F4F3EE] border-[#284F42] ring-2 ring-[#284F42]/20 shadow-md'
                          : 'bg-[#FAF9F6] border-[#D0C6BB]/75 hover:border-[#284F42]/60 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-xl bg-[#284F42] text-white text-sm font-black">
                            {bm.roomType}
                          </span>
                          <span className="text-xs font-bold text-[#5A6B63] bg-white px-2.5 py-0.5 rounded-lg border border-[#D0C6BB]/60">
                            {bm.categoryGroup} · {formatNum(bm.physicalCapacity)}실
                          </span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                          isPositive
                            ? 'bg-[#E8F2EE] text-[#1E523F] border-[#B4C6C1]/70'
                            : 'bg-[#FDF0ED] text-[#8B2635] border-[#EAC5BD]/70'
                        }`}>
                          YoY {formatSignedPct(bm.yoyGrowthPct)}
                        </span>
                      </div>

                      {/* 2025 vs 2026 Retail ADR & Next 30d Recommended ADR */}
                      <div className="grid grid-cols-3 gap-2 bg-white p-3 rounded-xl border border-[#D0C6BB]/50 mb-3">
                        <div>
                          <div className="text-[10px] font-bold text-[#5A6B63]">2025 Retail ADR</div>
                          <div className="text-xs sm:text-sm font-extrabold text-[#1B382E] mt-0.5">
                            {formatWon(bm.adr2025Retail)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-[#5A6B63]">2026 최근 ADR</div>
                          <div className="text-xs sm:text-sm font-extrabold text-[#1B382E] mt-0.5">
                            {formatWon(bm.adr2026RecentRetail)}
                          </div>
                        </div>
                        <div className="bg-[#E8F2EE]/70 px-2 py-1 rounded-lg border border-[#B4C6C1]/50">
                          <div className="text-[10px] font-extrabold text-[#1E523F]">30일 추천 평균</div>
                          <div className="text-xs sm:text-sm font-black text-[#1E523F] mt-0.5">
                            {formatWon(bm.next30dAvgRecommendedAdr)}
                          </div>
                        </div>
                      </div>

                      {/* Day-of-Week Baseline Matrix */}
                      <div className="grid grid-cols-4 gap-1.5 text-center mb-3">
                        <div className="bg-white p-2 rounded-xl border border-[#D0C6BB]/40">
                          <div className="text-[10px] font-bold text-[#5A6B63]">평일(월~목)</div>
                          <div className="text-xs font-extrabold text-[#1B382E] mt-0.5">
                            {formatWon(bm.baselineByDayType?.weekday)}
                          </div>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-[#D0C6BB]/40">
                          <div className="text-[10px] font-bold text-[#5A6B63]">금요일</div>
                          <div className="text-xs font-extrabold text-[#1B382E] mt-0.5">
                            {formatWon(bm.baselineByDayType?.friday)}
                          </div>
                        </div>
                        <div className="bg-[#FAF6ED] p-2 rounded-xl border border-[#E5DAC1]">
                          <div className="text-[10px] font-bold text-[#8C6D3B]">토·공휴일</div>
                          <div className="text-xs font-extrabold text-[#8C6D3B] mt-0.5">
                            {formatWon(bm.baselineByDayType?.satHoliday)}
                          </div>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-[#D0C6BB]/40">
                          <div className="text-[10px] font-bold text-[#5A6B63]">일요일</div>
                          <div className="text-xs font-extrabold text-[#1B382E] mt-0.5">
                            {formatWon(bm.baselineByDayType?.sunday)}
                          </div>
                        </div>
                      </div>

                      {/* Floor ~ Ceiling & OTB */}
                      <div className="flex items-center justify-between text-xs text-[#5A6B63] mb-2.5 px-1">
                        <span>
                          30일 OTB: <strong className="text-[#1B382E]">{formatNum(bm.next30dOtbRooms)}실 ({formatPct(bm.next30dOtbOccupancyPct)})</strong>
                        </span>
                        <span>
                          방어선: <strong className="text-[#8B2635]">{formatWon(bm.next30dFloorAdr)}</strong> ~ <strong className="text-[#1E523F]">{formatWon(bm.next30dCeilingAdr)}</strong>
                        </span>
                      </div>

                      {/* Recommended Bundle */}
                      <div className="bg-[#284F42]/8 border border-[#284F42]/20 rounded-xl px-3 py-2 flex items-center gap-2">
                        <Package size={14} className="text-[#284F42] shrink-0" />
                        <span className="text-xs font-bold text-[#1B382E] truncate">
                          추천 번들: {bm.recommendedBundle || '-'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ====================================================================
                4. 선택 일자 상세 드릴다운 패널 (평형별 잔여객실·추천ADR & 마케팅 가이드)
               ==================================================================== */}
            {selectedDayItem && (
              <div className="bg-white rounded-3xl p-6 lg:p-7 border-2 border-[#284F42] shadow-[0_8px_30px_rgba(40,79,66,0.12)] space-y-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#D0C6BB]/60 pb-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="px-3.5 py-1.5 rounded-xl bg-[#284F42] text-white text-sm font-black">
                      {selectedDayItem.date} ({selectedDayItem.dayOfWeek}) 상세 드릴다운
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-[#F4F3EE] text-[#1B382E] text-xs font-bold border border-[#D0C6BB]/70">
                      D-{selectedDayItem.leadDays != null ? selectedDayItem.leadDays : '-'} · {selectedDayItem.dayTypeLabel}
                    </span>
                    {(() => {
                      const st = getActionBadgeStyle(selectedDayItem.marketing?.actionCode);
                      return (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold border ${st.bg} ${st.text} ${st.border}`}>
                          {st.icon}
                          <span>{selectedDayItem.marketing?.actionLabel || st.shortTitle}</span>
                        </span>
                      );
                    })()}
                    {getUrgencyBadge(selectedDayItem.marketing?.urgencyLevel)}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="bg-[#F4F3EE] px-3 py-1.5 rounded-xl border border-[#D0C6BB]/60 font-bold text-[#5A6B63]">
                      전년 매칭일: <strong className="text-[#1B382E]">{selectedDayItem.yoyMatchDate || '-'}</strong>
                    </span>
                    <span className="bg-[#E8F2EE] px-3 py-1.5 rounded-xl border border-[#B4C6C1]/70 font-bold text-[#1E523F]">
                      예상 매출 증감: <strong>{formatSignedWon(selectedDayItem.pricing?.expectedRevenueDelta)}</strong>
                    </span>
                  </div>
                </div>

                {/* AI / Data Marketing Recommendation Banner */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 bg-[#F4F3EE] p-5 rounded-2xl border border-[#D0C6BB]/80">
                  <div className="lg:col-span-2 space-y-2">
                    <div className="text-xs font-extrabold text-[#284F42] uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={14} className="text-[#B59269]" />
                      <span>프라이싱 & 마케팅 실행 가이드 (Action Recommendation)</span>
                    </div>
                    <p className="text-sm font-bold text-[#1B382E] leading-relaxed">
                      {selectedDayItem.marketing?.recommendationText || '-'}
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-[#D0C6BB]/70 flex flex-col justify-center space-y-2 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[#5A6B63] font-bold shrink-0">타겟 채널:</span>
                      <span className="font-extrabold text-[#1B382E] text-right">{selectedDayItem.marketing?.targetChannel || '-'}</span>
                    </div>
                    <div className="flex items-start justify-between gap-2 pt-2 border-t border-[#D0C6BB]/40">
                      <span className="text-[#5A6B63] font-bold shrink-0">추천 결합 특전:</span>
                      <span className="font-extrabold text-[#8C6D3B] text-right">{selectedDayItem.marketing?.promoBundleItem || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Selected Date RoomTypes Breakdown Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse whitespace-nowrap min-w-[900px]">
                    <thead>
                      <tr className="bg-[#F4F3EE] text-[#5A6B63] text-xs font-extrabold border-b border-[#D0C6BB]/80">
                        <th className="py-3 px-4">객실 평형</th>
                        <th className="py-3 px-4 text-right">물리 재고</th>
                        <th className="py-3 px-4 text-right">현재 예약(OTB)</th>
                        <th className="py-3 px-4 text-right">잔여 판매가능</th>
                        <th className="py-3 px-4 text-right">OTB 가동률</th>
                        <th className="py-3 px-4 text-right">2025 Retail ADR</th>
                        <th className="py-3 px-4 text-right">2026 최근 ADR</th>
                        <th className="py-3 px-4 text-right">기준가(Baseline)</th>
                        <th className="py-3 px-4 text-right">추천 ADR (조정률)</th>
                        <th className="py-3 px-4 text-right">하한 ~ 상한 방어선</th>
                        <th className="py-3 px-4 text-center">평형별 액션</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D0C6BB]/40 text-xs sm:text-sm">
                      {(selectedDayItem.roomTypes || []).map((rt) => {
                        const st = getActionBadgeStyle(rt.actionCode);
                        const adj = rt.adjustmentPct ?? 0;
                        return (
                          <tr key={rt.roomType} className="hover:bg-[#F4F3EE]/50 transition-colors">
                            <td className="py-3 px-4 font-extrabold text-[#1B382E]">{rt.roomType}</td>
                            <td className="py-3 px-4 text-right font-medium text-[#5A6B63]">{formatNum(rt.capacity)}실</td>
                            <td className="py-3 px-4 text-right font-bold text-[#1B382E]">{formatNum(rt.otbBooked)}실</td>
                            <td className="py-3 px-4 text-right font-black text-[#284F42]">{formatNum(rt.remainingSellable)}실</td>
                            <td className="py-3 px-4 text-right font-bold text-[#1B382E]">{formatPct(rt.otbOccupancyPct)}</td>
                            <td className="py-3 px-4 text-right text-[#5A6B63]">{formatWon(rt.adr2025Retail)}</td>
                            <td className="py-3 px-4 text-right text-[#5A6B63]">{formatWon(rt.adr2026RecentRetail)}</td>
                            <td className="py-3 px-4 text-right font-bold text-[#1B382E]">{formatWon(rt.baselineAdr)}</td>
                            <td className="py-3 px-4 text-right">
                              <span className="font-black text-[#284F42]">{formatWon(rt.recommendedAdr)}</span>
                              <span className={`ml-1.5 text-xs font-extrabold ${
                                adj > 0 ? 'text-[#1E523F]' : adj < 0 ? 'text-[#8B2635]' : 'text-[#5A6B63]'
                              }`}>
                                ({formatSignedPct(rt.adjustmentPct)})
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right text-xs text-[#5A6B63] font-medium">
                              {formatWon(rt.floorAdr)} ~ {formatWon(rt.ceilingAdr)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold border ${st.bg} ${st.text} ${st.border}`}>
                                {st.icon}
                                <span>{rt.actionLabel || rt.actionCode}</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ====================================================================
                5. 향후 30일 일자별 다이나믹 프라이싱 캘린더 테이블 (dailyCalendar[])
               ==================================================================== */}
            <div className="bg-white rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] overflow-hidden">
              <div className="p-6 bg-[#F4F3EE] border-b border-[#D0C6BB]/75 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold text-[#1B382E] flex items-center gap-2">
                    <Calendar size={19} className="text-[#284F42]" />
                    <span>향후 {formatNum(meta?.totalDays)}일 일자별 다이나믹 프라이싱 & OTB 캘린더</span>
                  </h2>
                  <p className="text-xs text-[#5A6B63] mt-0.5 font-medium">
                    행(Row)을 클릭하면 상단 상세 드릴다운 패널 및 인라인 아코디언에서 해당 일자의 평형별 잔여 객실과 추천 단가를 즉시 확인할 수 있습니다.
                  </p>
                </div>
                <div className="text-xs font-bold text-[#1B382E] bg-white px-3.5 py-2 rounded-xl border border-[#D0C6BB]/80 self-start sm:self-auto">
                  조회 일수: <strong className="text-[#284F42]">{formatNum(filteredCalendar.length)}일</strong> / 전체 {formatNum(dailyCalendar.length)}일
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1300px]">
                  <thead>
                    <tr className="bg-[#FAF9F5] text-[#5A6B63] text-xs font-extrabold border-b border-[#D0C6BB]/75">
                      <th className="py-3.5 px-4">일자 (요일)</th>
                      <th className="py-3.5 px-3 text-center">D-Day</th>
                      <th className="py-3.5 px-4 text-right">현재 OTB 가동률 (점유/잔여 Key)</th>
                      <th className="py-3.5 px-4 text-right">예약 페이스 & 예상 가동률</th>
                      <th className="py-3.5 px-4 text-right">25년 동기 / 26년 최근 ADR</th>
                      <th className="py-3.5 px-4 text-right">기준 ADR ➔ 추천 ADR</th>
                      <th className="py-3.5 px-4 text-right">다이나믹 예상 매출 (Δ)</th>
                      <th className="py-3.5 px-4 text-center">마케팅 액션</th>
                      <th className="py-3.5 px-4">타겟 채널 & 추천 번들 특전</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D0C6BB]/35 text-xs sm:text-sm">
                    {filteredCalendar.map((day) => {
                      const isSelected = selectedDateStr === day.date;
                      const st = getActionBadgeStyle(day.marketing?.actionCode);
                      const priceAdj = day.pricing?.priceAdjustmentPct ?? 0;
                      const revDelta = day.pricing?.expectedRevenueDelta ?? 0;

                      return (
                        <React.Fragment key={day.date}>
                          <tr
                            onClick={() => setSelectedDateStr(day.date)}
                            className={`transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-[#E8F2EE]/70 font-bold'
                                : day.isHoliday || day.dayOfWeek === '토'
                                ? 'bg-[#FAF6ED]/40 hover:bg-[#F4F3EE]/80'
                                : 'hover:bg-[#F4F3EE]/60'
                            }`}
                          >
                            {/* 1. 일자 / 요일 */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                {isSelected ? (
                                  <ChevronUp size={15} className="text-[#284F42] shrink-0" />
                                ) : (
                                  <ChevronDown size={15} className="text-[#5A6B63] shrink-0" />
                                )}
                                <div>
                                  <div className="font-extrabold text-[#1B382E] flex items-center gap-1.5">
                                    <span>{day.date}</span>
                                    <span className={`px-1.5 py-0.5 rounded text-[11px] font-black ${
                                      day.dayOfWeek === '토'
                                        ? 'bg-[#FAF6ED] text-[#8C6D3B] border border-[#E5DAC1]'
                                        : day.dayOfWeek === '일' || day.isHoliday
                                        ? 'bg-[#FDF0ED] text-[#8B2635] border border-[#EAC5BD]'
                                        : 'bg-[#F4F3EE] text-[#5A6B63]'
                                    }`}>
                                      {day.dayOfWeek}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-[#5A6B63]">
                                    {day.dayTypeLabel} {day.isHoliday && day.holidayName !== '평일' ? `· ${day.holidayName}` : ''}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* 2. D-Day */}
                            <td className="py-3.5 px-3 text-center">
                              <span className="px-2 py-1 rounded-lg bg-[#F4F3EE] border border-[#D0C6BB]/60 text-xs font-extrabold text-[#1B382E]">
                                D-{day.leadDays != null ? day.leadDays : '-'}
                              </span>
                            </td>

                            {/* 3. 현재 OTB 가동률 */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="font-black text-[#1B382E] font-financial">
                                {formatPct(day.inventory?.currentOtbOccupancyPct)}
                              </div>
                              <div className="text-[11px] text-[#5A6B63]">
                                점유 {formatNum(day.inventory?.otbOccupiedKeys)} / 잔여 <strong className="text-[#284F42]">{formatNum(day.inventory?.remainingKeys)} Key</strong>
                              </div>
                            </td>

                            {/* 4. 예약 페이스 & 예상 가동률 */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <span className="text-[11px] font-bold text-[#5A6B63]">예상</span>
                                <span className="font-black text-[#1E523F] font-financial">
                                  {formatPct(day.inventory?.projectedOccupancyPct)}
                                </span>
                              </div>
                              <div className="text-[11px] text-[#5A6B63]">
                                페이스 <strong className="text-[#1B382E]">{formatPct(day.inventory?.bookingPacePct)}</strong> (전년최종 {formatPct(day.inventory?.yoyFinalOccupancyPct)})
                              </div>
                            </td>

                            {/* 5. 25년 동기 / 26년 최근 Retail ADR */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="font-bold text-[#1B382E]">{formatWon(day.pricing?.recent2026RetailAdr)}</div>
                              <div className="text-[11px] text-[#5A6B63]">25년 동기: {formatWon(day.pricing?.yoy2025RetailAdr)}</div>
                            </td>

                            {/* 6. 기준 ADR -> 추천 ADR */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <span className="text-xs text-[#5A6B63] line-through">{formatWon(day.pricing?.baselineAdr)}</span>
                                <span className="text-[#5A6B63]">➔</span>
                                <span className="text-sm font-black text-[#284F42] font-financial">
                                  {formatWon(day.pricing?.recommendedAdr)}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-[11px] font-extrabold ${
                                  priceAdj > 0
                                    ? 'bg-[#E8F2EE] text-[#1E523F]'
                                    : priceAdj < 0
                                    ? 'bg-[#FDF0ED] text-[#8B2635]'
                                    : 'bg-[#F4F3EE] text-[#5A6B63]'
                                }`}>
                                  {formatSignedPct(day.pricing?.priceAdjustmentPct)}
                                </span>
                              </div>
                              <div className="text-[11px] text-[#5A6B63]">
                                방어선: {formatWon(day.pricing?.floorAdr)} ~ {formatWon(day.pricing?.ceilingAdr)}
                              </div>
                            </td>

                            {/* 7. 다이나믹 예상 매출 (Delta) */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="font-extrabold text-[#1B382E] font-financial">
                                {formatWon(day.pricing?.dynamicProjectedRevenue)}
                              </div>
                              <div className={`text-[11px] font-bold ${
                                revDelta > 0 ? 'text-[#1E523F]' : revDelta < 0 ? 'text-[#8B2635]' : 'text-[#5A6B63]'
                              }`}>
                                기준대비 {formatSignedWon(day.pricing?.expectedRevenueDelta)}
                              </div>
                            </td>

                            {/* 8. 마케팅 액션 배지 */}
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${st.bg} ${st.text} ${st.border}`}>
                                {st.icon}
                                <span>{day.marketing?.actionLabel || day.marketing?.actionCode}</span>
                              </span>
                            </td>

                            {/* 9. 타겟 채널 & 추천 번들 */}
                            <td className="py-3.5 px-4">
                              <div className="text-xs font-extrabold text-[#1B382E] truncate max-w-[280px]">
                                {day.marketing?.promoBundleItem || '-'}
                              </div>
                              <div className="text-[11px] text-[#5A6B63] truncate max-w-[280px]">
                                {day.marketing?.targetChannel || '-'}
                              </div>
                            </td>
                          </tr>

                          {/* 인라인 드릴다운 아코디언 (선택된 일자) */}
                          {isSelected && (
                            <tr className="bg-[#FAF9F5] border-b-2 border-[#284F42]/30">
                              <td colSpan={9} className="p-5 whitespace-normal">
                                <div className="space-y-4">
                                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#D0C6BB]/80 shadow-2xs">
                                    <div className="space-y-1">
                                      <div className="text-xs font-extrabold text-[#284F42] flex items-center gap-1.5">
                                        <Sparkles size={14} className="text-[#B59269]" />
                                        <span>[{day.date} ({day.dayOfWeek})] 마케팅 & 세일즈 실행 가이드</span>
                                      </div>
                                      <p className="text-xs sm:text-sm font-bold text-[#1B382E]">
                                        {day.marketing?.recommendationText || '-'}
                                      </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                                      <span className="px-3 py-1.5 rounded-xl bg-[#F4F3EE] border border-[#D0C6BB]/70 text-xs font-bold text-[#1B382E]">
                                        타겟: {day.marketing?.targetChannel || '-'}
                                      </span>
                                      <span className="px-3 py-1.5 rounded-xl bg-[#FAF6ED] border border-[#E5DAC1] text-xs font-extrabold text-[#8C6D3B]">
                                        번들: {day.marketing?.promoBundleItem || '-'}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                                    {(day.roomTypes || []).map((rt) => {
                                      const rtStyle = getActionBadgeStyle(rt.actionCode);
                                      return (
                                        <div key={rt.roomType} className="bg-white p-3.5 rounded-2xl border border-[#D0C6BB]/75 shadow-2xs space-y-2">
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs font-black text-[#1B382E] bg-[#F4F3EE] px-2.5 py-1 rounded-lg border border-[#D0C6BB]/60">
                                              {rt.roomType}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${rtStyle.bg} ${rtStyle.text} ${rtStyle.border}`}>
                                              {rt.actionLabel || rt.actionCode}
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between text-xs">
                                            <span className="text-[#5A6B63]">잔여 / 재고</span>
                                            <span className="font-extrabold text-[#1B382E]">
                                              잔여 <strong className="text-[#284F42]">{formatNum(rt.remainingSellable)}</strong> / {formatNum(rt.capacity)}실 ({formatPct(rt.otbOccupancyPct)})
                                            </span>
                                          </div>
                                          <div className="pt-2 border-t border-[#D0C6BB]/40 flex items-baseline justify-between">
                                            <span className="text-[11px] text-[#5A6B63] line-through">{formatWon(rt.baselineAdr)}</span>
                                            <span className="text-sm font-black text-[#284F42] font-financial">
                                              {formatWon(rt.recommendedAdr)}
                                            </span>
                                          </div>
                                          <div className="text-[10px] text-[#5A6B63] flex items-center justify-between">
                                            <span>하한 {formatWon(rt.floorAdr)}</span>
                                            <span>상한 {formatWon(rt.ceilingAdr)}</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
