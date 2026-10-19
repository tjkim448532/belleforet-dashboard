import React, { useState, useEffect } from 'react';
import {
  Hotel, Calendar, TrendingUp, Sparkles, RefreshCw,
  ArrowUpRight, ArrowDownRight, ShieldCheck, Layers,
  Tag, Zap, Flame, AlertCircle, HelpCircle, BookOpen,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Compass, Package, Target, Info, Database, Flag
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
  dataSignalsUsed?: string[];
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
  avgMultiNightRatioPct?: number | null;
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
  totalWaitingRooms?: number | null;
  totalCancelledRooms?: number | null;
  totalGolfBookedTeams?: number | null;
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
    waitingRoomsCount?: number | null;
    cancelledRoomsCount?: number | null;
    cancellationRatePct?: number | null;
    multiNightSharePct?: number | null;
    groupB2bSharePct?: number | null;
    golfBookedTeams?: number | null;
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

const formatShortDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[1]}/${parts[2]}`;
  }
  return dateStr;
};

const getActionBadgeStyle = (actionCode: DynamicActionCode) => {
  switch (actionCode) {
    case 'YIELD_UP':
      return {
        bg: 'bg-[#E8F2EE]',
        text: 'text-[#1E523F]',
        border: 'border-[#B4C6C1]',
        accentBg: 'bg-[#1E523F]',
        dot: 'bg-[#1E523F]',
        icon: <TrendingUp size={14} className="shrink-0 text-[#1E523F]" />,
        shortTitle: '단가 상향 · 수익 극대화',
        easyAction: '수요 집중 구간입니다! 특가 할인을 마감하고 권장 판매가로 단가를 올려 받으세요.'
      };
    case 'HOLD':
      return {
        bg: 'bg-[#F4F3EE]',
        text: 'text-[#284F42]',
        border: 'border-[#D0C6BB]',
        accentBg: 'bg-[#284F42]',
        dot: 'bg-[#284F42]',
        icon: <ShieldCheck size={14} className="shrink-0 text-[#284F42]" />,
        shortTitle: '기준가 유지 · 정상 페이스',
        easyAction: '예약 속도가 안정적입니다. 평소 기준 요금을 흔들림 없이 방어하세요.'
      };
    case 'BUNDLE_PROMO':
      return {
        bg: 'bg-[#FAF6ED]',
        text: 'text-[#8C6D3B]',
        border: 'border-[#E5DAC1]',
        accentBg: 'bg-[#B59269]',
        dot: 'bg-[#B59269]',
        icon: <Package size={14} className="shrink-0 text-[#8C6D3B]" />,
        shortTitle: '레저 번들 특전 · 사전 모객',
        easyAction: '빈방이 여유롭습니다. 방값을 깎지 말고 마운틴카트·미디어아트 특전을 묶어 파세요.'
      };
    case 'FLASH_SALE':
      return {
        bg: 'bg-[#FDF0ED]',
        text: 'text-[#8B2635]',
        border: 'border-[#EAC5BD]',
        accentBg: 'bg-[#8B2635]',
        dot: 'bg-[#8B2635]',
        icon: <Flame size={14} className="shrink-0 text-[#8B2635]" />,
        shortTitle: '임박 타임세일 · 공실 방어',
        easyAction: '체크인이 임박했는데 빈방이 많습니다. 하한 방어선 내에서 긴급 타임세일로 채우세요.'
      };
    default:
      return {
        bg: 'bg-[#F4F3EE]',
        text: 'text-[#5A6B63]',
        border: 'border-[#D0C6BB]',
        accentBg: 'bg-[#5A6B63]',
        dot: 'bg-[#5A6B63]',
        icon: <Tag size={14} className="shrink-0 text-[#5A6B63]" />,
        shortTitle: actionCode || '-',
        easyAction: '실측 데이터 기반 추천 요금을 확인하세요.'
      };
  }
};

const getUrgencyBadge = (urgency: string | null | undefined) => {
  if (!urgency) return null;
  if (urgency === 'HIGH') {
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-[#FDF0ED] text-[#8B2635] border border-[#EAC5BD]">
        🚨 긴급도 HIGH
      </span>
    );
  }
  if (urgency === 'MEDIUM') {
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-[#FAF6ED] text-[#8C6D3B] border border-[#E5DAC1]">
        ⚡ 긴급도 MEDIUM
      </span>
    );
  }
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]">
      ✅ 안정 LOW
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

  // Accordion States (사용자 요청: 자세한 설명 및 보조 테이블은 아코디언으로 조절)
  const [showGuideAccordion, setShowGuideAccordion] = useState<boolean>(false);
  const [showSignalsAccordion, setShowSignalsAccordion] = useState<boolean>(false);
  const [showDayTableAccordion, setShowDayTableAccordion] = useState<boolean>(false);
  const [showBenchmarkAccordion, setShowBenchmarkAccordion] = useState<boolean>(false);
  const [showSummaryDetailAccordion, setShowSummaryDetailAccordion] = useState<boolean>(false);

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

  const selectedDayIndex = dailyCalendar.findIndex((item) => item.date === selectedDateStr);
  const selectedDayItem = selectedDayIndex >= 0
    ? dailyCalendar[selectedDayIndex]
    : dailyCalendar[0] || null;

  const handlePrevDay = () => {
    if (selectedDayIndex > 0) {
      setSelectedDateStr(dailyCalendar[selectedDayIndex - 1].date);
    }
  };

  const handleNextDay = () => {
    if (selectedDayIndex >= 0 && selectedDayIndex < dailyCalendar.length - 1) {
      setSelectedDateStr(dailyCalendar[selectedDayIndex + 1].date);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F4F3EE] text-[#1B382E] tracking-tight pb-20 relative">
      {/* Ambient Deep Forest Executive Glow Banner (#1B3B2B ~ #0F291E) */}
      <div className="w-full bg-gradient-to-r from-[#1B3B2B] via-[#284F42] to-[#0F291E] h-[220px] absolute top-0 left-0 z-0 overflow-hidden rounded-b-[36px] border-b border-[#0F291E] shadow-xl">
        <div className="absolute -top-16 -right-16 w-96 h-96 rounded-full bg-[#2F5548] opacity-70 pointer-events-none" />
        <div className="absolute top-8 left-1/3 w-80 h-80 rounded-full bg-[#2F5548] opacity-40 blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 right-1/4 w-60 h-60 rounded-full bg-[#0F291E] opacity-60 pointer-events-none" />
      </div>

      <div className="relative z-10 max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* ====================================================================
            0. 이그제큐티브 헤더 배너 & SSOT 8대 산출 근거 / 사용법 아코디언
           ==================================================================== */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 lg:p-7 border border-[#D0C6BB]/80 shadow-[0_4px_24px_rgba(40,79,66,0.08)]">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1B3B2B] border border-[#0F291E] text-white text-xs font-semibold shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-[#5FB878] animate-pulse" />
                  <span>BELLEFORET RESORT · DYNAMIC PRICING & YIELD ENGINE</span>
                </div>
                {meta && (
                  <span className="px-3 py-1 rounded-full bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1] text-xs font-extrabold">
                    {meta.startDate} ~ {meta.endDate} ({formatNum(meta.totalDays)}일간) · 물리 객실 모수 {formatNum(meta.physicalKeysCapacity)}키 (월 고정 모수 {formatNum(meta.fixedMonthlyCapacity)}실 / 기준 점유율 {meta.fixedOccupancyBenchmarkPct != null ? `${meta.fixedOccupancyBenchmarkPct}%` : '-'})
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1B382E] tracking-tight flex items-center gap-3 flex-wrap">
                <span className="p-2.5 rounded-2xl bg-[#1B3B2B] text-white shadow-xs inline-flex">
                  <Sparkles size={22} className="text-[#B59269]" />
                </span>
                <span>콘도본부 30일 다이나믹 프라이싱 & 마케팅 ADR 제안</span>
              </h1>
              <p className="text-xs sm:text-sm text-[#5A6B63] mt-1.5 font-medium">
                날짜를 선택하면 <strong className="text-[#1B382E]">"오늘 각 평형(16·35·51·펫룸)을 얼마에 팔아야 하는지"</strong>와 <strong className="text-[#1B382E]">대기예약·취소율·골프 부킹 시너지 기반 마케팅 액션</strong>을 즉시 확인할 수 있습니다.
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
                <span className="text-xs font-bold text-[#5A6B63]">예측일수</span>
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
                className="px-4 py-2.5 rounded-xl bg-[#1B3B2B] hover:bg-[#0F291E] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                <span>새로고침</span>
              </button>
            </div>
          </div>

          {/* Room Type Quick Filter Pills & Accordion Toggle Buttons */}
          <div className="mt-5 pt-4 border-t border-[#D0C6BB]/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-extrabold text-[#5A6B63] mr-1">평형 필터:</span>
              {ROOM_TYPE_OPTIONS.map((opt) => {
                const isActive = selectedRoomType === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedRoomType(opt.value)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#1B3B2B] text-white shadow-xs'
                        : 'bg-[#F4F3EE] text-[#5A6B63] hover:text-[#1B382E] border border-[#D0C6BB]/60'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSignalsAccordion(!showSignalsAccordion)}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  showSignalsAccordion
                    ? 'bg-[#1B3B2B] text-white border-[#1B3B2B] shadow-xs'
                    : 'bg-[#E8F2EE] text-[#1E523F] border-[#B4C6C1] hover:opacity-90'
                }`}
              >
                <Database size={14} />
                <span>SSOT 8대 산출 근거 데이터 소스 ({formatNum(meta?.dataSignalsUsed?.length)}종)</span>
                {showSignalsAccordion ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              <button
                type="button"
                onClick={() => setShowGuideAccordion(!showGuideAccordion)}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  showGuideAccordion
                    ? 'bg-[#1B382E] text-white border-[#1B382E] shadow-xs'
                    : 'bg-[#FAF6ED] text-[#8C6D3B] border-[#E5DAC1] hover:bg-[#F3EBD8]'
                }`}
              >
                <HelpCircle size={15} />
                <span>이 화면 쉽게 보는 법 & 용어 해설</span>
                {showGuideAccordion ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
            </div>
          </div>

          {/* 🛡️ [아코디언 A] SSOT 8대 산출 근거 데이터 소스 (`meta.dataSignalsUsed[]`) */}
          {showSignalsAccordion && (
            <div className="mt-4 pt-4 border-t border-[#D0C6BB]/70 bg-[#F4F3EE]/80 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database size={16} className="text-[#1E523F]" />
                  <h3 className="text-sm font-extrabold text-[#1B382E]">
                    벨포레 V6 다이나믹 프라이싱 엔진 연동 마트 & 뷰 (SSOT 산출 근거)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSignalsAccordion(false)}
                  className="text-xs font-bold text-[#5A6B63] hover:text-[#1B382E] bg-white px-2.5 py-1 rounded-lg border border-[#D0C6BB]/70 cursor-pointer"
                >
                  닫기 ✕
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                {(meta?.dataSignalsUsed || []).map((sig, idx) => (
                  <div
                    key={idx}
                    className="bg-white px-3.5 py-2.5 rounded-xl border border-[#D0C6BB]/75 text-xs font-bold text-[#1B382E] flex items-center gap-2 shadow-2xs"
                  >
                    <span className="w-5 h-5 rounded-full bg-[#1B3B2B] text-white text-[10px] font-black flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="leading-snug">{sig}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 📖 [아코디언 B] 다이나믹 프라이싱 초보자/실무자 상세 설명 가이드 */}
          {showGuideAccordion && (
            <div className="mt-4 pt-5 border-t-2 border-[#D0C6BB]/70 bg-[#FAF9F6] rounded-2xl p-5 sm:p-6 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-[#1B382E] flex items-center gap-2">
                    <BookOpen size={18} className="text-[#284F42]" />
                    <span>실무자용 직관적 가이드 — "그래서 방을 얼마에 팔아야 하는지 어떻게 보나요?"</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5A6B63] mt-1 leading-relaxed">
                    복잡한 통계를 계산할 필요 없이, <strong>① 날짜를 고르고 ➔ ② 각 평형 카드에 적힌 [권장 판매가]를 확인한 뒤 ➔ ③ 추천 액션(단가 상향 / 기준가 유지 / 번들 특전 / 타임세일)</strong>을 그대로 실행하시면 됩니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGuideAccordion(false)}
                  className="text-xs font-bold text-[#5A6B63] hover:text-[#1B382E] px-2.5 py-1 rounded-lg bg-white border border-[#D0C6BB]/70 shrink-0 cursor-pointer"
                >
                  닫기 ✕
                </button>
              </div>

              {/* 3-Step 실무 활용법 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-[#D0C6BB]/75 shadow-2xs space-y-1.5">
                  <div className="text-xs font-black text-[#1E523F] bg-[#E8F2EE] px-2.5 py-1 rounded-lg inline-block">
                    STEP 1 · 숙박 날짜 선택
                  </div>
                  <div className="text-sm font-extrabold text-[#1B382E]">
                    아래 날짜 바 또는 30일 표에서 날짜를 클릭하세요
                  </div>
                  <p className="text-xs text-[#5A6B63] leading-relaxed">
                    오늘, 다가오는 주말(금·토), 혹은 빈방이 걱정되는 평일을 클릭하면 해당 날짜의 평형별 적정 판매가가 즉시 상단 보드에 표시됩니다.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-[#D0C6BB]/75 shadow-2xs space-y-1.5">
                  <div className="text-xs font-black text-[#1E523F] bg-[#E8F2EE] px-2.5 py-1 rounded-lg inline-block">
                    STEP 2 · 평형별 권장 판매가 확인
                  </div>
                  <div className="text-sm font-extrabold text-[#1B382E]">
                    가장 크게 적힌 "권장 판매가"가 목표 방값입니다
                  </div>
                  <p className="text-xs text-[#5A6B63] leading-relaxed">
                    16평·35평·51평·펫룸 각 카드에 표시된 <strong>권장 판매가(추천 ADR)</strong>와 <strong>하한(최저 방어선)~상한</strong> 범위를 확인하여 OTA 및 자사몰 요금을 조정하세요.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-[#D0C6BB]/75 shadow-2xs space-y-1.5">
                  <div className="text-xs font-black text-[#8C6D3B] bg-[#FAF6ED] px-2.5 py-1 rounded-lg inline-block">
                    STEP 3 · 복합 수요 시그널 & 번들 적용
                  </div>
                  <div className="text-sm font-extrabold text-[#1B382E]">
                    대기예약·골프 부킹 팀수를 함께 확인하세요
                  </div>
                  <p className="text-xs text-[#5A6B63] leading-relaxed">
                    골프 부킹 팀수가 많거나 대기예약이 쌓인 날은 객실 수요도 함께 폭발하므로 특가를 닫고 단가를 높이며, 여유로운 평일은 레저 번들 특전으로 모객합니다.
                  </p>
                </div>
              </div>

              {/* 4대 액션 코드 & 주요 용어 해설 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-[#D0C6BB]/75 space-y-2.5">
                  <div className="text-xs font-extrabold text-[#1B382E] border-b border-[#D0C6BB]/50 pb-2">
                    🏷️ 4가지 마케팅 액션 코드(전략 배지) 해설
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#E8F2EE] text-[#1E523F] font-extrabold shrink-0">🔥 YIELD_UP (단가 상향)</span>
                      <span className="text-[#5A6B63]">주말·대기예약·골프 성수일 등 수요 집중 구간입니다. <strong>OTA 할인 특가를 마감하고 기준가보다 높여 수익을 극대화</strong>하세요.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#F4F3EE] text-[#284F42] font-extrabold shrink-0">⚖️ HOLD (기준가 유지)</span>
                      <span className="text-[#5A6B63]">예약 속도가 안정적인 날입니다. <strong>명목 기준가를 방어하면서 주력 복합패키지 판매 비중을 유지</strong>하세요.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#FAF6ED] text-[#8C6D3B] font-extrabold shrink-0">🎁 BUNDLE_PROMO (번들 특전)</span>
                      <span className="text-[#5A6B63]">D-11 이후 비수기 평일입니다. 객실 단가를 직접 깎지 말고 <strong>마운틴카트·미디어아트 등 레저 티켓을 결합해 사전 모객</strong>하세요.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#FDF0ED] text-[#8B2635] font-extrabold shrink-0">⚡ FLASH_SALE (타임세일)</span>
                      <span className="text-[#5A6B63]">D-10 이내 저점유 임박일입니다. 공실 손실 방어를 위해 <strong>하한선(Floor) 내에서 긴급 CRM/OTA 타임세일</strong>을 집행하세요.</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-[#D0C6BB]/75 space-y-2.5">
                  <div className="text-xs font-extrabold text-[#1B382E] border-b border-[#D0C6BB]/50 pb-2">
                    📌 핵심 지표 쉽게 이해하기
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <strong className="text-[#1B382E]">▪ Retail ADR (일반 실판매 단가):</strong>{' '}
                      <span className="text-[#5A6B63]">자사몰(DIRECT)과 온라인여행사(OTA)를 통해 들어온 순수 일반 고객의 평균 객실 단가입니다.</span>
                    </div>
                    <div>
                      <strong className="text-[#1B382E]">▪ 하한 방어선(Floor) ~ 상한선(Ceiling):</strong>{' '}
                      <span className="text-[#5A6B63]">원가 및 브랜드 가치를 지키기 위해 <strong>절대 이 금액 밑으로 팔면 안 되는 최저선(하한)</strong>과 <strong>최대 인상 가능 한도(상한)</strong>입니다.</span>
                    </div>
                    <div>
                      <strong className="text-[#1B382E]">▪ 대기예약 · 취소율 · 연박 비중 · 골프 부킹 팀수:</strong>{' '}
                      <span className="text-[#5A6B63]">단순 잔여 객실수뿐만 아니라 대기 수요(W), 취소 위험(X), 연박(LOS), 골프장 부킹 팀수를 교차 분석해 가격 정확도를 높입니다.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
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
            <p className="text-sm font-bold text-[#5A6B63]">30일 실시간 예약(OTB) 및 8대 정형 시그널 기반 추천 ADR을 불러오는 중입니다...</p>
          </div>
        ) : data && (
          <>
            {/* ====================================================================
                1. [최상단 핵심 보드] "그래서 얼마에 팔아야 하나요?" — 선택 일자 평형별 권장 판매가 & 복합 수요 시그널
               ==================================================================== */}
            {selectedDayItem && (
              <div className="bg-white rounded-3xl p-6 lg:p-7 border-2 border-[#1B3B2B] shadow-[0_8px_30px_rgba(27,59,43,0.12)] space-y-6">
                {/* 1-A. 날짜 빠른 선택 스크롤 바 (30일 중 원하는 날짜 원클릭) */}
                <div className="space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-lg bg-[#1B3B2B] text-white text-xs font-black">
                        STEP 1 · 날짜 선택
                      </span>
                      <span className="text-xs sm:text-sm font-extrabold text-[#1B382E]">
                        판매가를 결정할 숙박 날짜를 클릭하세요 ({meta?.startDate} ~ {meta?.endDate})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={handlePrevDay}
                        disabled={selectedDayIndex <= 0}
                        className="px-2.5 py-1.5 rounded-xl bg-[#F4F3EE] hover:bg-[#EAE6DF] border border-[#D0C6BB] text-xs font-bold text-[#1B382E] flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronLeft size={14} /> 이전 날
                      </button>
                      <button
                        type="button"
                        onClick={handleNextDay}
                        disabled={selectedDayIndex >= dailyCalendar.length - 1}
                        className="px-2.5 py-1.5 rounded-xl bg-[#F4F3EE] hover:bg-[#EAE6DF] border border-[#D0C6BB] text-xs font-bold text-[#1B382E] flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                      >
                        다음 날 <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>

                  {/* 30일 가로 스크롤 미니 캘린더 */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1">
                    {dailyCalendar.map((day) => {
                      const isSel = day.date === selectedDayItem.date;
                      const st = getActionBadgeStyle(day.marketing?.actionCode);
                      const isSat = day.dayOfWeek === '토';
                      const isSunOrHol = day.dayOfWeek === '일' || day.isHoliday;
                      return (
                        <button
                          key={day.date}
                          type="button"
                          onClick={() => setSelectedDateStr(day.date)}
                          className={`px-3.5 py-2.5 rounded-2xl border text-left transition-all shrink-0 cursor-pointer min-w-[118px] ${
                            isSel
                              ? 'bg-[#1B3B2B] text-white border-[#0F291E] shadow-md scale-[1.02]'
                              : 'bg-[#FAF9F6] hover:bg-[#F4F3EE] text-[#1B382E] border-[#D0C6BB]/80'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span className={`text-xs font-black ${
                              isSel ? 'text-white' : isSat ? 'text-[#8C6D3B]' : isSunOrHol ? 'text-[#8B2635]' : 'text-[#1B382E]'
                            }`}>
                              {formatShortDate(day.date)}({day.dayOfWeek})
                            </span>
                            <span className={`w-2 h-2 rounded-full ${isSel ? 'bg-[#B59269]' : st.dot}`} />
                          </div>
                          <div className={`text-xs font-extrabold mt-1 font-financial ${isSel ? 'text-[#EAE3D2]' : 'text-[#284F42]'}`}>
                            {formatWon(day.pricing?.recommendedAdr)}
                          </div>
                          <div className={`text-[10px] mt-0.5 font-medium ${isSel ? 'text-white/80' : 'text-[#5A6B63]'}`}>
                            잔여 {formatNum(day.inventory?.remainingKeys)}키 · D-{day.leadDays ?? '-'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 1-B. 선택한 날짜의 한눈에 보는 결론 & 복합 수요 시그널 배너 */}
                <div className="bg-[#F4F3EE] rounded-2xl p-5 border border-[#D0C6BB] space-y-4">
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-[#D0C6BB]/70 pb-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="px-3 py-1 rounded-xl bg-[#1B3B2B] text-white text-xs font-black">
                          선택 일자 결론
                        </span>
                        <h2 className="text-xl sm:text-2xl font-black text-[#1B382E]">
                          {selectedDayItem.date} ({selectedDayItem.dayOfWeek}요일) · {selectedDayItem.dayTypeLabel}
                        </h2>
                        <span className="px-2.5 py-1 rounded-lg bg-white text-[#1B382E] text-xs font-extrabold border border-[#D0C6BB]">
                          D-{selectedDayItem.leadDays != null ? selectedDayItem.leadDays : '-'} (전년 매칭 {selectedDayItem.yoyMatchDate || '-'})
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
                      <p className="text-xs sm:text-sm font-bold text-[#284F42]">
                        👉 {getActionBadgeStyle(selectedDayItem.marketing?.actionCode).easyAction}
                      </p>
                    </div>

                    {/* 선택 일자 핵심 숫자 3개 (평균 추천가 / 남은 방 / 기대 수익 증감) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 shrink-0">
                      <div className="bg-white px-4 py-2.5 rounded-xl border border-[#D0C6BB]/80 text-right">
                        <div className="text-[11px] font-bold text-[#5A6B63]">당일 대표 추천 판매가</div>
                        <div className="text-base sm:text-lg font-black text-[#284F42] font-financial">
                          {formatWon(selectedDayItem.pricing?.recommendedAdr)}
                        </div>
                        <div className="text-[10px] font-bold text-[#5A6B63]">
                          기준가 {formatWon(selectedDayItem.pricing?.baselineAdr)} ({formatSignedPct(selectedDayItem.pricing?.priceAdjustmentPct)})
                        </div>
                      </div>

                      <div className="bg-white px-4 py-2.5 rounded-xl border border-[#D0C6BB]/80 text-right">
                        <div className="text-[11px] font-bold text-[#5A6B63]">현재 남은 방 / 전체 Key</div>
                        <div className="text-base sm:text-lg font-black text-[#1B382E] font-financial">
                          잔여 {formatNum(selectedDayItem.inventory?.remainingKeys)}키
                        </div>
                        <div className="text-[10px] font-bold text-[#1E523F]">
                          현재 {formatPct(selectedDayItem.inventory?.currentOtbOccupancyPct)} ➔ 예상 {formatPct(selectedDayItem.inventory?.projectedOccupancyPct)}
                        </div>
                      </div>

                      <div className="bg-white px-4 py-2.5 rounded-xl border border-[#D0C6BB]/80 text-right">
                        <div className="text-[11px] font-bold text-[#5A6B63]">당일 예상 매출 (증감 Δ)</div>
                        <div className="text-base sm:text-lg font-black text-[#1B382E] font-financial">
                          {formatWon(selectedDayItem.pricing?.dynamicProjectedRevenue)}
                        </div>
                        <div className="text-[10px] font-extrabold text-[#1E523F]">
                          기준대비 {formatSignedWon(selectedDayItem.pricing?.expectedRevenueDelta)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 당일 5대 실시간 복합 수요 시그널 바 (대기예약 · 취소율 · 연박 · 단체비중 · 골프 팀수) */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-extrabold text-[#1B382E] mr-1">📡 당일 복합 수요 시그널:</span>
                    <span className="px-3 py-1 rounded-xl bg-white border border-[#D0C6BB]/80 text-xs font-bold text-[#1B382E]">
                      대기예약 <strong className="text-[#8B2635]">{formatNum(selectedDayItem.inventory?.waitingRoomsCount)}건</strong>
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-white border border-[#D0C6BB]/80 text-xs font-bold text-[#1B382E]">
                      취소율 <strong className="text-[#5A6B63]">{formatPct(selectedDayItem.inventory?.cancellationRatePct)}</strong> ({formatNum(selectedDayItem.inventory?.cancelledRoomsCount)}건)
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-white border border-[#D0C6BB]/80 text-xs font-bold text-[#1B382E]">
                      연박 비중 <strong className="text-[#284F42]">{formatPct(selectedDayItem.inventory?.multiNightSharePct)}</strong>
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-white border border-[#D0C6BB]/80 text-xs font-bold text-[#1B382E]">
                      단체(B2B) 비중 <strong className="text-[#284F42]">{formatPct(selectedDayItem.inventory?.groupB2bSharePct)}</strong>
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-[#E8F2EE] border border-[#B4C6C1] text-xs font-extrabold text-[#1E523F] flex items-center gap-1">
                      <Flag size={12} />
                      골프 부킹 <strong>{formatNum(selectedDayItem.inventory?.golfBookedTeams)}팀</strong>
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-white border border-[#D0C6BB]/80 text-xs font-bold text-[#5A6B63]">
                      전년 동요일 최종 점유율 <strong className="text-[#1B382E]">{formatPct(selectedDayItem.inventory?.yoyFinalOccupancyPct)}</strong> (Retail ADR {formatWon(selectedDayItem.pricing?.yoy2025RetailAdr)})
                    </span>
                  </div>

                  {/* 왜 이 가격인가요? (AI/SSOT 마케팅 의사결정 가이드 문장 + 추천 번들 + 타겟 채널) */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
                    <div className="lg:col-span-2 bg-white p-4 rounded-xl border border-[#D0C6BB]/75 flex flex-col justify-center">
                      <div className="text-xs font-extrabold text-[#284F42] flex items-center gap-1.5 mb-1">
                        <Sparkles size={14} className="text-[#B59269]" />
                        <span>왜 이 가격에 팔아야 하나요? (SSOT 데이터 산출 근거 & 마케팅 의사결정 가이드)</span>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-[#1B382E] leading-relaxed">
                        {selectedDayItem.marketing?.recommendationText || '-'}
                      </p>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-[#D0C6BB]/75 flex flex-col justify-center space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[#5A6B63] font-bold shrink-0">🎯 집중 타겟 채널:</span>
                        <span className="font-extrabold text-[#1B382E] text-right">{selectedDayItem.marketing?.targetChannel || '-'}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#D0C6BB]/40">
                        <span className="text-[#5A6B63] font-bold shrink-0">🎁 추천 결합 특전:</span>
                        <span className="font-extrabold text-[#8C6D3B] text-right">{selectedDayItem.marketing?.promoBundleItem || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 1-C. 🌟 평형별 "이 가격에 파세요!" 대형 직관적 가격표 카드 그리드 */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-[#B59269] text-white text-xs font-black">
                        STEP 2 · 평형별 권장 판매가
                      </span>
                      <h3 className="text-base sm:text-lg font-extrabold text-[#1B382E]">
                        [{selectedDayItem.date} ({selectedDayItem.dayOfWeek})] 6대 평형별 추천 판매가(ADR) & 잔여 판매가능 객실
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowDayTableAccordion(!showDayTableAccordion)}
                      className="text-xs font-bold text-[#284F42] bg-[#F4F3EE] hover:bg-[#EAE6DF] px-3.5 py-1.5 rounded-xl border border-[#D0C6BB] flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                    >
                      <span>{showDayTableAccordion ? '평형별 상세 비교 표(Table) 접기' : '평형별 상세 비교 표(Table)로 한눈에 보기'}</span>
                      {showDayTableAccordion ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>

                  {/* 6개 평형 직관적 가격 카드 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {(selectedDayItem.roomTypes || []).map((rt) => {
                      const st = getActionBadgeStyle(rt.actionCode);
                      const adj = rt.adjustmentPct ?? 0;
                      const isFilteredRoom = selectedRoomType === rt.roomType;

                      return (
                        <div
                          key={rt.roomType}
                          className={`rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                            isFilteredRoom
                              ? 'bg-[#F4F3EE] border-2 border-[#1B3B2B] shadow-md'
                              : 'bg-white border-[#D0C6BB]/85 hover:border-[#284F42]/60 shadow-2xs'
                          }`}
                        >
                          {/* 카드 상단: 평형명 & 액션 배지 */}
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <div className="flex items-center gap-2">
                                <span className="px-3 py-1 rounded-xl bg-[#1B3B2B] text-white text-sm font-black">
                                  {rt.roomType}
                                </span>
                                <span className="text-xs font-extrabold text-[#1B382E] bg-[#F4F3EE] px-2.5 py-1 rounded-lg border border-[#D0C6BB]/70">
                                  잔여 판매가능 <strong className="text-[#284F42]">{formatNum(rt.remainingSellable)}실</strong> / 모수 {formatNum(rt.capacity)}실
                                </span>
                              </div>
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold border ${st.bg} ${st.text} ${st.border}`}>
                                {st.icon}
                                <span>{rt.actionLabel || rt.actionCode}</span>
                              </span>
                            </div>

                            {/* 카드 중앙 핵심: 그래서 얼마에 팔아야 하나? */}
                            <div className="bg-[#FAF9F6] rounded-2xl p-4 border border-[#D0C6BB]/70 mb-3">
                              <div className="flex items-center justify-between text-xs font-bold text-[#5A6B63] mb-1">
                                <span>🎯 이 평형 권장 판매가 (추천 ADR)</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                                  adj > 0
                                    ? 'bg-[#E8F2EE] text-[#1E523F]'
                                    : adj < 0
                                    ? 'bg-[#FDF0ED] text-[#8B2635]'
                                    : 'bg-[#F4F3EE] text-[#5A6B63]'
                                }`}>
                                  기준가 대비 {formatSignedPct(rt.adjustmentPct)}
                                </span>
                              </div>

                              <div className="flex items-baseline justify-between gap-2 mt-1">
                                <div>
                                  <span className="text-xs text-[#5A6B63] font-medium mr-1.5">기준가:</span>
                                  <span className="text-sm font-bold text-[#5A6B63] line-through">
                                    {formatWon(rt.baselineAdr)}
                                  </span>
                                </div>
                                <div className="text-2xl sm:text-3xl font-black text-[#1B3B2B] font-financial">
                                  {formatWon(rt.recommendedAdr)}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 카드 하단: 최저~최고 가격 가드레일 & 예약 현황 */}
                          <div className="space-y-2 text-xs">
                            <div className="flex items-center justify-between bg-[#F4F3EE]/80 px-3 py-2 rounded-xl border border-[#D0C6BB]/60">
                              <span className="text-[#5A6B63] font-bold">하한 ~ 상한 방어선</span>
                              <span className="font-extrabold">
                                <span className="text-[#8B2635]">하한 {formatWon(rt.floorAdr)}</span>
                                <span className="mx-1.5 text-[#5A6B63]">~</span>
                                <span className="text-[#1E523F]">상한 {formatWon(rt.ceilingAdr)}</span>
                              </span>
                            </div>

                            <div className="flex items-center justify-between px-1 text-[11px] text-[#5A6B63] font-medium">
                              <span>
                                현재 예약: <strong className="text-[#1B382E]">{formatNum(rt.otbBooked)}실 (점유율 {formatPct(rt.otbOccupancyPct)})</strong>
                              </span>
                              <span>
                                26년 최근: <strong className="text-[#1B382E]">{formatWon(rt.adr2026RecentRetail)}</strong> (25년 {formatWon(rt.adr2025Retail)})
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 📊 [아코디언 C] 선택 일자 6개 평형 상세 비교 표 (11개 전체 컬럼) */}
                  {showDayTableAccordion && (
                    <div className="mt-4 pt-4 border-t border-[#D0C6BB]/60 overflow-x-auto">
                      <table className="w-full text-left border-collapse whitespace-nowrap min-w-[960px]">
                        <thead>
                          <tr className="bg-[#F4F3EE] text-[#5A6B63] text-xs font-extrabold border-b border-[#D0C6BB]/80">
                            <th className="py-3 px-4">평형명</th>
                            <th className="py-3 px-4 text-right">물리 모수</th>
                            <th className="py-3 px-4 text-right">현재 예약(OTB)</th>
                            <th className="py-3 px-4 text-right">잔여 판매가능</th>
                            <th className="py-3 px-4 text-right">점유율</th>
                            <th className="py-3 px-4 text-right">2025 Retail ADR</th>
                            <th className="py-3 px-4 text-right">2026 최근 ADR</th>
                            <th className="py-3 px-4 text-right">기준가(Baseline)</th>
                            <th className="py-3 px-4 text-right">추천 ADR (조정률)</th>
                            <th className="py-3 px-4 text-right">하한 ~ 상한 방어선</th>
                            <th className="py-3 px-4 text-center">액션</th>
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
                                  <span className="font-black text-[#1B3B2B]">{formatWon(rt.recommendedAdr)}</span>
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
                  )}
                </div>
              </div>
            )}

            {/* ====================================================================
                2. 상단 4대 핵심 KPI 벤토 카드 (summary 바인딩 + 산출 기준 설명 아코디언)
               ==================================================================== */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2">
                  <Zap size={18} className="text-[#1B3B2B]" />
                  <h2 className="text-base sm:text-lg font-extrabold text-[#1B382E]">
                    향후 {formatNum(meta?.totalDays)}일 다이나믹 프라이싱 4대 핵심 KPI 요약 (누적 기대 효과 & OTB 현황)
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSummaryDetailAccordion(!showSummaryDetailAccordion)}
                  className="text-xs font-bold text-[#5A6B63] hover:text-[#1B382E] bg-white px-3 py-1.5 rounded-xl border border-[#D0C6BB]/80 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                >
                  <Info size={13} className="text-[#284F42]" />
                  <span>{showSummaryDetailAccordion ? '4대 KPI 해설 접기' : '4대 KPI 산출 기준 및 용어 해설 보기'}</span>
                  {showSummaryDetailAccordion ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              </div>

              {showSummaryDetailAccordion && (
                <div className="bg-white rounded-2xl p-4 border border-[#D0C6BB] text-xs text-[#5A6B63] grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 shadow-2xs">
                  <div>
                    <strong className="text-[#1B382E] block mb-0.5">① 실시간 예약(OTB) & 예상 가동률</strong>
                    향후 30일 물리 가용 키({formatNum(currentOtb?.totalCapacityKeys)}키) 대비 현재 확보된 점유율과, 대기예약({formatNum(currentOtb?.totalWaitingRooms)}실)·취소({formatNum(currentOtb?.totalCancelledRooms)}실)·골프 부킹({formatNum(currentOtb?.totalGolfBookedTeams)}팀)을 반영한 최종 예상 가동률입니다.
                  </div>
                  <div>
                    <strong className="text-[#1B382E] block mb-0.5">② 2025 동기 vs 2026 최근 Retail ADR</strong>
                    자사몰(DIRECT)과 OTA 일반 고객의 실측 객단가 변화율과 최근 30일 연박 비중({formatPct(recent2026?.avgMultiNightRatioPct)})을 비교합니다.
                  </div>
                  <div>
                    <strong className="text-[#1B382E] block mb-0.5">③ 향후 30일 다이나믹 추천 평균 ADR</strong>
                    향후 30일 기준가 평균({formatWon(pricingRec?.avgBaselineAdr)}) 대비 다이나믹 프라이싱 적용 시 목표 평균 단가({formatWon(pricingRec?.avgRecommendedAdr)})입니다.
                  </div>
                  <div>
                    <strong className="text-[#1B382E] block mb-0.5">④ 다이나믹 예상 매출 증대 효과</strong>
                    기준가 고정 시 예상 매출({formatWon(pricingRec?.baselineProjectedRevenue)}) 대비 다이나믹 단가 적용 시 기대되는 추가 수익({formatSignedWon(pricingRec?.expectedRevenueGain)})입니다.
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                {/* KPI Card 1: 향후 30일 실시간 예약(OTB) & 예상 가동률 */}
                <div className="bg-white rounded-3xl p-6 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-extrabold text-[#5A6B63] uppercase tracking-wider">
                        1. 향후 30일 실시간 예약(OTB) & 예상 가동률
                      </span>
                      <span className="p-2 rounded-xl bg-[#E8F2EE] text-[#1E523F]">
                        <Hotel size={18} />
                      </span>
                    </div>

                    <div className="flex items-baseline gap-2.5 flex-wrap">
                      <span className="text-3xl font-black text-[#1B382E] font-financial">
                        {formatPct(currentOtb?.currentOtbOccupancyPct)}
                      </span>
                      <span className="text-xs font-extrabold text-[#1E523F] bg-[#E8F2EE] px-2.5 py-0.5 rounded-full border border-[#B4C6C1]/70">
                        예상 최종 {formatPct(currentOtb?.projectedOccupancyPct)}
                      </span>
                    </div>

                    <p className="text-xs text-[#5A6B63] mt-2 font-medium">
                      점유 <strong className="text-[#1B382E]">{formatNum(currentOtb?.totalOccupiedKeys)}</strong> / {formatNum(currentOtb?.totalCapacityKeys)}키
                      <span className="ml-1 text-[#5A6B63]">(예약 {formatNum(currentOtb?.totalBookedRooms)}실)</span>
                    </p>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-[#D0C6BB]/50 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#5A6B63] font-medium">전년 동일 리드타임({formatNum(currentOtb?.yoySameLeadOccupiedKeys)}키) 대비</span>
                      <span className="font-extrabold text-[#1E523F]">
                        예약 속도 {formatPct(currentOtb?.bookingPacePct)}
                      </span>
                    </div>
                    {/* 하단 칩: 대기예약 · 취소 · 골프 부킹 */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="px-2 py-0.5 rounded-lg bg-[#FDF0ED] text-[#8B2635] border border-[#EAC5BD] text-[11px] font-extrabold">
                        대기예약 {formatNum(currentOtb?.totalWaitingRooms)}실
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-[#F4F3EE] text-[#5A6B63] border border-[#D0C6BB] text-[11px] font-bold">
                        취소 {formatNum(currentOtb?.totalCancelledRooms)}실
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1] text-[11px] font-extrabold">
                        골프 부킹 {formatNum(currentOtb?.totalGolfBookedTeams)}팀
                      </span>
                    </div>
                  </div>
                </div>

                {/* KPI Card 2: 2025년 동기 vs 2026년 최근 실측 Retail ADR */}
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

                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                        (recent2026?.yoyRetailAdrGrowthPct ?? 0) >= 0
                          ? 'bg-[#E8F2EE] text-[#1E523F] border-[#B4C6C1]/70'
                          : 'bg-[#FDF0ED] text-[#8B2635] border-[#EAC5BD]/70'
                      }`}>
                        {(recent2026?.yoyRetailAdrGrowthPct ?? 0) >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                        {formatSignedPct(recent2026?.yoyRetailAdrGrowthPct)} 상승
                      </span>
                      <span className="text-xs text-[#5A6B63] font-bold">
                        (전체 ADR {formatWon(recent2026?.overallAdr)})
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-[#D0C6BB]/50 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[#5A6B63] font-medium">2025 동기 점유율 / 전체 ADR</span>
                      <span className="font-bold text-[#1B382E]">{formatPct(hist2025?.avgOccupancyPct)} ({formatWon(hist2025?.overallAdr)})</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#5A6B63] font-medium">최근 30일 점유율 / 연박 비중</span>
                      <span className="font-extrabold text-[#1E523F]">
                        점유 {formatPct(recent2026?.avgOccupancyPct)} · 연박 {formatPct(recent2026?.avgMultiNightRatioPct)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* KPI Card 3: 향후 30일 다이나믹 추천 평균 ADR */}
                <div className="bg-white rounded-3xl p-6 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-extrabold text-[#5A6B63] uppercase tracking-wider">
                        3. 향후 30일 다이나믹 추천 평균 ADR
                      </span>
                      <span className="p-2 rounded-xl bg-[#1B3B2B] text-white">
                        <Target size={18} />
                      </span>
                    </div>

                    <div className="flex items-baseline gap-2.5 flex-wrap">
                      <span className="text-3xl font-black text-[#1B3B2B] font-financial">
                        {formatWon(pricingRec?.avgRecommendedAdr)}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]/70">
                        기준가 대비 {formatSignedPct(pricingRec?.avgAdrLiftPct)}
                      </span>
                    </div>

                    <p className="text-xs text-[#5A6B63] mt-2 font-medium">
                      기준 ADR 평균: <strong className="text-[#1B382E]">{formatWon(pricingRec?.avgBaselineAdr)}</strong>
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

                {/* KPI Card 4: 다이나믹 프라이싱 예상 매출 증대 효과 (30일 누적) */}
                <div className="bg-gradient-to-br from-[#1B3B2B] to-[#0F291E] text-white rounded-3xl p-6 border border-[#0F291E] shadow-[0_8px_28px_rgba(27,59,43,0.18)] flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-[#2F5548] opacity-50 pointer-events-none" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-extrabold text-white/85 uppercase tracking-wider">
                        4. 다이나믹 예상 매출 증대 효과 (30일)
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
                      다이나믹 적용 시 총 예상 매출: <strong className="text-white font-extrabold">{formatWon(pricingRec?.dynamicProjectedRevenue)}</strong>
                    </p>
                  </div>

                  <div className="relative z-10 mt-4 pt-3.5 border-t border-white/15 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-white/80">
                      <span>기준가 고정 시</span>
                      <span className="font-bold text-white">{formatWon(pricingRec?.baselineProjectedRevenue)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[#EAE3D2]">
                      <span className="font-bold">다이나믹 적용 시</span>
                      <span className="font-extrabold">{formatWon(pricingRec?.dynamicProjectedRevenue)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ====================================================================
                3. 마케팅 액션 4대 전략 필터 바 & 향후 30일 일자별 다이나믹 프라이싱 캘린더
               ==================================================================== */}
            <div className="bg-white rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] overflow-hidden">
              {/* 상단 헤더 & 4대 마케팅 액션 필터 바 */}
              <div className="p-6 bg-[#F4F3EE] border-b border-[#D0C6BB]/75 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-extrabold text-[#1B382E] flex items-center gap-2">
                      <Calendar size={19} className="text-[#1B3B2B]" />
                      <span>향후 {formatNum(meta?.totalDays)}일 일자별 다이나믹 프라이싱 캘린더 & 복합 수요 시그널</span>
                    </h2>
                    <p className="text-xs text-[#5A6B63] mt-0.5 font-medium">
                      행(Row)을 클릭하면 해당 일자의 <strong>마케팅 의사결정 가이드 전문</strong>과 <strong>6개 평형별 상세 테이블(잔여 객실·추천 ADR·하한~상한)</strong>이 바로 펼쳐집니다.
                    </p>
                  </div>
                  <div className="text-xs font-bold text-[#1B382E] bg-white px-3.5 py-2 rounded-xl border border-[#D0C6BB]/80 self-start sm:self-auto">
                    표시 일수: <strong className="text-[#1B3B2B]">{formatNum(filteredCalendar.length)}일</strong> / 전체 {formatNum(dailyCalendar.length)}일
                  </div>
                </div>

                {/* 마케팅 액션 4대 전략 필터 바 */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#D0C6BB]/60">
                  <span className="text-xs font-extrabold text-[#1B382E] mr-1">마케팅 액션 4대 전략 필터:</span>
                  <button
                    onClick={() => setSelectedActionFilter('ALL')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer border ${
                      selectedActionFilter === 'ALL'
                        ? 'bg-[#1B382E] text-white border-[#1B382E] shadow-xs'
                        : 'bg-white text-[#1B382E] border-[#D0C6BB]/80 hover:bg-[#EAE6DF]'
                    }`}
                  >
                    <span>전체 (ALL)</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[11px]">
                      {formatNum(dailyCalendar.length)}일
                    </span>
                  </button>

                  <button
                    onClick={() => setSelectedActionFilter(selectedActionFilter === 'YIELD_UP' ? 'ALL' : 'YIELD_UP')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer border ${
                      selectedActionFilter === 'YIELD_UP'
                        ? 'bg-[#1E523F] text-white border-[#1E523F] shadow-xs'
                        : 'bg-[#E8F2EE] text-[#1E523F] border-[#B4C6C1] hover:opacity-90'
                    }`}
                  >
                    <span>🔥 YIELD_UP (단가 상향 · 수익 극대화)</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-black/10 text-[11px] font-black">
                      {formatNum(pricingRec?.yieldUpDays)}일
                    </span>
                  </button>

                  <button
                    onClick={() => setSelectedActionFilter(selectedActionFilter === 'HOLD' ? 'ALL' : 'HOLD')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer border ${
                      selectedActionFilter === 'HOLD'
                        ? 'bg-[#284F42] text-white border-[#284F42] shadow-xs'
                        : 'bg-white text-[#284F42] border-[#D0C6BB] hover:bg-[#EAE6DF]'
                    }`}
                  >
                    <span>⚖️ HOLD (기준가 유지 · 정상 페이스)</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-black/10 text-[11px] font-black">
                      {formatNum(pricingRec?.holdDays)}일
                    </span>
                  </button>

                  <button
                    onClick={() => setSelectedActionFilter(selectedActionFilter === 'BUNDLE_PROMO' ? 'ALL' : 'BUNDLE_PROMO')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer border ${
                      selectedActionFilter === 'BUNDLE_PROMO'
                        ? 'bg-[#B59269] text-white border-[#B59269] shadow-xs'
                        : 'bg-[#FAF6ED] text-[#8C6D3B] border-[#E5DAC1] hover:opacity-90'
                    }`}
                  >
                    <span>🎁 BUNDLE_PROMO (레저 번들 특전 · 사전 모객)</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-black/10 text-[11px] font-black">
                      {formatNum(pricingRec?.bundlePromoDays)}일
                    </span>
                  </button>

                  <button
                    onClick={() => setSelectedActionFilter(selectedActionFilter === 'FLASH_SALE' ? 'ALL' : 'FLASH_SALE')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer border ${
                      selectedActionFilter === 'FLASH_SALE'
                        ? 'bg-[#8B2635] text-white border-[#8B2635] shadow-xs'
                        : 'bg-[#FDF0ED] text-[#8B2635] border-[#EAC5BD] hover:opacity-90'
                    }`}
                  >
                    <span>⚡ FLASH_SALE (임박 타임세일 · 공실 방어)</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-black/10 text-[11px] font-black">
                      {formatNum(pricingRec?.flashSaleDays)}일
                    </span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1380px]">
                  <thead>
                    <tr className="bg-[#FAF9F5] text-[#5A6B63] text-xs font-extrabold border-b border-[#D0C6BB]/75">
                      <th className="py-3.5 px-4">일자 / 요일 / D-Day</th>
                      <th className="py-3.5 px-4 text-right bg-[#E8F2EE]/40 text-[#1B382E]">
                        🎯 단가 비교 및 제안 ADR (기준가 ➔ 추천 ADR)
                      </th>
                      <th className="py-3.5 px-4 text-center">마케팅 액션</th>
                      <th className="py-3.5 px-4 text-right">현재 OTB vs 예상 점유율</th>
                      <th className="py-3.5 px-4">복합 수요 시그널 (대기·취소·연박·단체·골프)</th>
                      <th className="py-3.5 px-4">타겟 채널 & 추천 번들 특전</th>
                      <th className="py-3.5 px-4 text-right">다이나믹 예상 매출 (Δ)</th>
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
                                ? 'bg-[#E8F2EE]/75 font-bold'
                                : day.isHoliday || day.dayOfWeek === '토'
                                ? 'bg-[#FAF6ED]/35 hover:bg-[#F4F3EE]/80'
                                : 'hover:bg-[#F4F3EE]/60'
                            }`}
                          >
                            {/* 1. 일자 / 요일 / D-Day */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                {isSelected ? (
                                  <ChevronUp size={15} className="text-[#1B3B2B] shrink-0" />
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
                                    <span className="px-1.5 py-0.5 rounded bg-[#F4F3EE] border border-[#D0C6BB]/60 text-[11px] font-extrabold text-[#1B382E]">
                                      D-{day.leadDays != null ? day.leadDays : '-'}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-[#5A6B63] mt-0.5">
                                    {day.dayTypeLabel} · 전년매칭 {day.yoyMatchDate || '-'}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* 2. 단가 비교 및 제안 ADR */}
                            <td className="py-3.5 px-4 text-right bg-[#E8F2EE]/20">
                              <div className="flex items-center justify-end gap-1.5">
                                <span className="text-xs text-[#5A6B63] line-through">{formatWon(day.pricing?.baselineAdr)}</span>
                                <span className="text-[#5A6B63]">➔</span>
                                <span className="text-base font-black text-[#1B3B2B] font-financial">
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
                                전년 당일 Retail {formatWon(day.pricing?.yoy2025RetailAdr)} | 하한 {formatWon(day.pricing?.floorAdr)} ~ 상한 {formatWon(day.pricing?.ceilingAdr)}
                              </div>
                            </td>

                            {/* 3. 마케팅 액션 배지 */}
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${st.bg} ${st.text} ${st.border}`}>
                                {st.icon}
                                <span>{day.marketing?.actionLabel || day.marketing?.actionCode}</span>
                              </span>
                            </td>

                            {/* 4. 현재 OTB vs 예상 점유율 */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5 font-financial">
                                <span className="font-black text-[#1B382E]">{formatPct(day.inventory?.currentOtbOccupancyPct)}</span>
                                <span className="text-[#5A6B63]">➔</span>
                                <span className="font-black text-[#1E523F]">예상 {formatPct(day.inventory?.projectedOccupancyPct)}</span>
                              </div>
                              <div className="text-[11px] text-[#5A6B63]">
                                {formatNum(day.inventory?.otbOccupiedKeys)}/{formatNum(day.inventory?.physicalKeyCapacity)}키 (잔여 <strong className="text-[#284F42]">{formatNum(day.inventory?.remainingKeys)}키</strong>) · 전년최종 {formatPct(day.inventory?.yoyFinalOccupancyPct)}
                              </div>
                            </td>

                            {/* 5. 복합 수요 시그널 */}
                            <td className="py-3.5 px-4">
                              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                <span className="px-2 py-0.5 rounded bg-[#FDF0ED] text-[#8B2635] font-bold">
                                  대기 {formatNum(day.inventory?.waitingRoomsCount)}건
                                </span>
                                <span className="px-2 py-0.5 rounded bg-[#F4F3EE] text-[#5A6B63] font-bold">
                                  취소율 {formatPct(day.inventory?.cancellationRatePct)}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-[#F4F3EE] text-[#1B382E] font-bold">
                                  연박 {formatPct(day.inventory?.multiNightSharePct)}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-[#F4F3EE] text-[#1B382E] font-bold">
                                  단체 {formatPct(day.inventory?.groupB2bSharePct)}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-[#E8F2EE] text-[#1E523F] font-extrabold border border-[#B4C6C1]/60">
                                  ⛳ 골프 {formatNum(day.inventory?.golfBookedTeams)}팀
                                </span>
                              </div>
                            </td>

                            {/* 6. 타겟 채널 & 추천 번들 */}
                            <td className="py-3.5 px-4">
                              <div className="text-xs font-extrabold text-[#1B382E] truncate max-w-[260px]">
                                🎁 {day.marketing?.promoBundleItem || '-'}
                              </div>
                              <div className="text-[11px] text-[#5A6B63] truncate max-w-[260px]">
                                🎯 {day.marketing?.targetChannel || '-'}
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
                          </tr>

                          {/* 행(Row) 클릭 시 상세 드릴다운 패널 (인라인 아코디언) */}
                          {isSelected && (
                            <tr className="bg-[#FAF9F5] border-b-2 border-[#1B3B2B]/30">
                              <td colSpan={7} className="p-5 whitespace-normal">
                                <div className="space-y-4">
                                  {/* AI/SSOT 마케팅 의사결정 가이드 문장 */}
                                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#D0C6BB]/80 shadow-2xs">
                                    <div className="space-y-1">
                                      <div className="text-xs font-extrabold text-[#1B3B2B] flex items-center gap-1.5">
                                        <Sparkles size={14} className="text-[#B59269]" />
                                        <span>[{day.date} ({day.dayOfWeek})] SSOT 마케팅 의사결정 가이드 & 평형별 상세 테이블</span>
                                      </div>
                                      <p className="text-xs sm:text-sm font-bold text-[#1B382E]">
                                        {day.marketing?.recommendationText || '-'}
                                      </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                                      <span className="px-3 py-1.5 rounded-xl bg-[#F4F3EE] border border-[#D0C6BB]/70 text-xs font-bold text-[#1B382E]">
                                        🎯 타겟 채널: {day.marketing?.targetChannel || '-'}
                                      </span>
                                      <span className="px-3 py-1.5 rounded-xl bg-[#FAF6ED] border border-[#E5DAC1] text-xs font-extrabold text-[#8C6D3B]">
                                        🎁 번들 특전: {day.marketing?.promoBundleItem || '-'}
                                      </span>
                                    </div>
                                  </div>

                                  {/* 해당 일자의 roomTypes[] (6개 평형별 상세 테이블) */}
                                  <div className="bg-white rounded-2xl border border-[#D0C6BB]/75 overflow-x-auto shadow-2xs">
                                    <table className="w-full text-left border-collapse whitespace-nowrap min-w-[920px]">
                                      <thead>
                                        <tr className="bg-[#F4F3EE] text-[#5A6B63] text-xs font-extrabold border-b border-[#D0C6BB]/75">
                                          <th className="py-2.5 px-4">평형명</th>
                                          <th className="py-2.5 px-4 text-right">물리 모수</th>
                                          <th className="py-2.5 px-4 text-right">현재 예약</th>
                                          <th className="py-2.5 px-4 text-right">잔여 판매가능</th>
                                          <th className="py-2.5 px-4 text-right">점유율</th>
                                          <th className="py-2.5 px-4 text-right">2025 ADR</th>
                                          <th className="py-2.5 px-4 text-right">2026 최근 ADR</th>
                                          <th className="py-2.5 px-4 text-right">기준가</th>
                                          <th className="py-2.5 px-4 text-right bg-[#E8F2EE]/40 text-[#1B382E]">추천 ADR (조정률)</th>
                                          <th className="py-2.5 px-4 text-right">하한 ~ 상한</th>
                                          <th className="py-2.5 px-4 text-center">액션</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-[#D0C6BB]/40 text-xs">
                                        {(day.roomTypes || []).map((rt) => {
                                          const rtStyle = getActionBadgeStyle(rt.actionCode);
                                          const rtAdj = rt.adjustmentPct ?? 0;
                                          return (
                                            <tr key={rt.roomType} className="hover:bg-[#F4F3EE]/40">
                                              <td className="py-2.5 px-4 font-extrabold text-[#1B382E]">{rt.roomType}</td>
                                              <td className="py-2.5 px-4 text-right text-[#5A6B63]">{formatNum(rt.capacity)}실</td>
                                              <td className="py-2.5 px-4 text-right font-bold text-[#1B382E]">{formatNum(rt.otbBooked)}실</td>
                                              <td className="py-2.5 px-4 text-right font-black text-[#284F42]">{formatNum(rt.remainingSellable)}실</td>
                                              <td className="py-2.5 px-4 text-right font-bold text-[#1B382E]">{formatPct(rt.otbOccupancyPct)}</td>
                                              <td className="py-2.5 px-4 text-right text-[#5A6B63]">{formatWon(rt.adr2025Retail)}</td>
                                              <td className="py-2.5 px-4 text-right text-[#5A6B63]">{formatWon(rt.adr2026RecentRetail)}</td>
                                              <td className="py-2.5 px-4 text-right font-bold text-[#1B382E]">{formatWon(rt.baselineAdr)}</td>
                                              <td className="py-2.5 px-4 text-right bg-[#E8F2EE]/20">
                                                <span className="font-black text-[#1B3B2B] text-xs sm:text-sm">{formatWon(rt.recommendedAdr)}</span>
                                                <span className={`ml-1 font-extrabold ${
                                                  rtAdj > 0 ? 'text-[#1E523F]' : rtAdj < 0 ? 'text-[#8B2635]' : 'text-[#5A6B63]'
                                                }`}>
                                                  ({formatSignedPct(rt.adjustmentPct)})
                                                </span>
                                              </td>
                                              <td className="py-2.5 px-4 text-right text-[#5A6B63]">
                                                {formatWon(rt.floorAdr)} ~ {formatWon(rt.ceilingAdr)}
                                              </td>
                                              <td className="py-2.5 px-4 text-center">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold border ${rtStyle.bg} ${rtStyle.text} ${rtStyle.border}`}>
                                                  {rt.actionLabel || rt.actionCode}
                                                </span>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
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

            {/* ====================================================================
                4. [아코디언 D] 평형별 기준 단가 & 30일 추천 ADR 벤치마크 섹션 (roomTypeBenchmarks[])
               ==================================================================== */}
            <div className="bg-white rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] overflow-hidden">
              <button
                type="button"
                onClick={() => setShowBenchmarkAccordion(!showBenchmarkAccordion)}
                className="w-full p-6 bg-white hover:bg-[#FAF9F6] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Layers size={19} className="text-[#1B3B2B]" />
                    <h2 className="text-lg font-extrabold text-[#1B382E]">
                      평형별 기준 단가(요일별 Baseline) & 30일 추천 ADR 벤치마크 ({formatNum(benchmarks.length)}개 평형)
                    </h2>
                    <span className="text-xs font-bold text-[#1E523F] bg-[#E8F2EE] px-2.5 py-0.5 rounded-full border border-[#B4C6C1]">
                      아코디언 열기/닫기
                    </span>
                  </div>
                  <p className="text-xs text-[#5A6B63] mt-1 font-medium">
                    16평·35평·51평·펫룸 각각의 물리 모수, 향후 30일 예약수, 2025 vs 2026 최근 Retail ADR, 요일별 기준가(평일·금·토·일) 및 가드레일 범위를 확인합니다.
                  </p>
                </div>

                <div className="px-4 py-2 rounded-xl bg-[#F4F3EE] border border-[#D0C6BB] text-xs font-extrabold text-[#1B382E] flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                  <span>{showBenchmarkAccordion ? '평형별 벤치마크 접기' : '평형별 벤치마크 펼치기'}</span>
                  {showBenchmarkAccordion ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </div>
              </button>

              {showBenchmarkAccordion && (
                <div className="p-6 lg:p-7 pt-2 border-t border-[#D0C6BB]/60 bg-[#FAF9F6] space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {benchmarks.map((bm) => {
                      const isPositive = (bm.yoyGrowthPct ?? 0) >= 0;
                      return (
                        <div
                          key={bm.roomType}
                          onClick={() => setSelectedRoomType(bm.roomType === selectedRoomType ? 'ALL' : bm.roomType)}
                          className={`rounded-2xl p-5 border transition-all cursor-pointer ${
                            selectedRoomType === bm.roomType
                              ? 'bg-[#F4F3EE] border-[#1B3B2B] ring-2 ring-[#1B3B2B]/20 shadow-md'
                              : 'bg-white border-[#D0C6BB]/75 hover:border-[#284F42]/60'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                              <span className="px-3 py-1 rounded-xl bg-[#1B3B2B] text-white text-sm font-black">
                                {bm.roomType}
                              </span>
                              <span className="text-xs font-bold text-[#5A6B63] bg-[#F4F3EE] px-2.5 py-0.5 rounded-lg border border-[#D0C6BB]/60">
                                {bm.categoryGroup} · 물리 모수 {formatNum(bm.physicalCapacity)}실
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
                          <div className="grid grid-cols-3 gap-2 bg-[#FAF9F6] p-3 rounded-xl border border-[#D0C6BB]/50 mb-3">
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
                          <div className="text-[11px] font-bold text-[#5A6B63] mb-1.5 px-0.5">
                            요일별 기준가 (baselineByDayType):
                          </div>
                          <div className="grid grid-cols-4 gap-1.5 text-center mb-3">
                            <div className="bg-[#FAF9F6] p-2 rounded-xl border border-[#D0C6BB]/50">
                              <div className="text-[10px] font-bold text-[#5A6B63]">평일(월~목)</div>
                              <div className="text-xs font-extrabold text-[#1B382E] mt-0.5">
                                {formatWon(bm.baselineByDayType?.weekday)}
                              </div>
                            </div>
                            <div className="bg-[#FAF9F6] p-2 rounded-xl border border-[#D0C6BB]/50">
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
                            <div className="bg-[#FAF9F6] p-2 rounded-xl border border-[#D0C6BB]/50">
                              <div className="text-[10px] font-bold text-[#5A6B63]">일요일</div>
                              <div className="text-xs font-extrabold text-[#1B382E] mt-0.5">
                                {formatWon(bm.baselineByDayType?.sunday)}
                              </div>
                            </div>
                          </div>

                          {/* Floor ~ Ceiling & OTB */}
                          <div className="flex items-center justify-between text-xs text-[#5A6B63] mb-2.5 px-1">
                            <span>
                              향후 30일 예약: <strong className="text-[#1B382E]">{formatNum(bm.next30dOtbRooms)}실 ({formatPct(bm.next30dOtbOccupancyPct)})</strong>
                            </span>
                            <span>
                              가드레일: <strong className="text-[#8B2635]">{formatWon(bm.next30dFloorAdr)}</strong> ~ <strong className="text-[#1E523F]">{formatWon(bm.next30dCeilingAdr)}</strong>
                            </span>
                          </div>

                          {/* Recommended Bundle */}
                          <div className="bg-[#1B3B2B]/8 border border-[#1B3B2B]/20 rounded-xl px-3 py-2 flex items-center gap-2">
                            <Package size={14} className="text-[#1B3B2B] shrink-0" />
                            <span className="text-xs font-bold text-[#1B382E] truncate">
                              추천 마케팅 번들: {bm.recommendedBundle || '-'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
