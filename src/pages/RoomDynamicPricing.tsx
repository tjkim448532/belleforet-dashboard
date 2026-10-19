import React, { useState, useEffect } from 'react';
import {
  Hotel, Calendar, TrendingUp, Sparkles, RefreshCw,
  ArrowUpRight, ArrowDownRight, ShieldCheck, Layers,
  Tag, Zap, Flame, AlertCircle, HelpCircle, BookOpen,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Compass, Package, Target, Info, Database, Flag,
  Radio, BarChart3, Activity
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
  pricingArchitecture?: string;
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
  losTrendByYear?: {
    y2024?: number | null;
    y2025?: number | null;
    y2026?: number | null;
  };
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
  calendarVolumeWeightedBaselineAdr?: number | null;
  calendarVolumeWeightedRecommendedAdr?: number | null;
  baselineByDayType?: {
    satHoliday?: number | null;
    friday?: number | null;
    sunday?: number | null;
    weekday?: number | null;
  };
  recommendedByDayType?: {
    satHoliday?: number | null;
    friday?: number | null;
    sunday?: number | null;
    weekday?: number | null;
  };
  lockedOtbRevenueTotal?: number | null;
  baselinePickupRevenueTotal?: number | null;
  dynamicPickupRevenueTotal?: number | null;
  baselineProjectedRevenue: number | null;
  dynamicProjectedRevenue: number | null;
  expectedRevenueGain: number | null;
  expectedRevenueGainPct: number | null;
  counterfactualEvaluation?: {
    totalSurvivingOtbUnits?: number | null;
    totalBaselineNewPickupUnits?: number | null;
    totalDynamicNewPickupUnits?: number | null;
    netPickupUnitVolumeDelta?: number | null;
    totalBaselineSoldUnits?: number | null;
    totalDynamicSoldUnits?: number | null;
    netUnitVolumeDelta?: number | null;
    variableCostPerKeyKrw?: number | null;
    blendedChannelFeeRate?: number | null;
    bundleMarginalCostPerUnit?: number | null;
    totalBundleMarketingCost?: number | null;
    lockedOtbContributionMarginTotal?: number | null;
    baselinePickupContributionMarginTotal?: number | null;
    dynamicPickupContributionMarginTotal?: number | null;
    baselineTotalContributionMargin?: number | null;
    dynamicTotalContributionMargin?: number | null;
    expectedNetContributionMarginGain?: number | null;
    expectedNetContributionMarginGainPct?: number | null;
    otbRevenueNeutralityCheckDeltaKrw?: number | null;
    methodologyNote?: string | null;
  };
  yieldUpDays: number | null;
  holdDays: number | null;
  bundlePromoDays: number | null;
  flashSaleDays: number | null;
  expectedAdditionalKeys?: number | null;
  dualTrackSummary?: DualTrackSummary;
}

export interface DualTrackSummaryItem {
  trackCode: 'STANDARD' | 'MARKET_ADAPTIVE' | string;
  trackName: string;
  lockedOtbRevenueTotal: number | null;
  baselinePickupRevenueTotal: number | null;
  dynamicPickupRevenueTotal: number | null;
  expectedRevenueGain: number | null;
  expectedRevenueGainPct: number | null;
  expectedNetContributionMarginGain: number | null;
  expectedNetContributionMarginGainPct: number | null;
}

export interface DualTrackSummary {
  activeTrack: 'STANDARD' | 'MARKET_ADAPTIVE' | string;
  trackBAdjustedDaysCount: number | null;
  trackA_standard: DualTrackSummaryItem;
  trackB_marketAdaptive: DualTrackSummaryItem;
  trackDeltaBvsA: {
    pickupRevenueDiffKrw: number | null;
    netContributionMarginDiffKrw: number | null;
  };
  availableTracks?: Array<{
    trackCode: string;
    trackName: string;
    description: string;
  }>;
}

export interface CompetitorMarketSummary {
  snapshotCollectedAt?: string;
  source?: string;
  dbMetadata?: {
    dbEngine?: string;
    retentionPolicy?: string;
    s3Uri?: string;
    mariaDbContactCount?: number;
    snapshotDate?: string;
    totalSnapshotsStored?: number;
    totalDailyMartRows?: number;
    totalRawOffersStored?: number;
  };
  targetResorts?: string[];
  weekdayBaselineMinPrices?: Record<string, number>;
  highCompressionDaysCount?: number | null;
  momentumSurgeDaysCount?: number | null;
  weekdayDumpingAlertDaysCount?: number | null;
  empiricalSpilloverAnalysis?: {
    pickupLookbackWindow?: {
      recent3dFrom?: string;
      recent7dFrom?: string;
      asOfBaseDate?: string;
    };
    highCompressionGroup?: {
      daysCount?: number | null;
      avgOtbOccupancyPct?: number | null;
      totalRecent3dPickupRooms?: number | null;
      totalRecent7dPickupRooms?: number | null;
      totalRecent7dPickupKeys?: number | null;
      avgRecent7dPickupRoomsPerDay?: number | null;
      avgTier35PriceCushionKrw?: number | null;
    };
    normalMarketGroup?: {
      daysCount?: number | null;
      avgOtbOccupancyPct?: number | null;
      totalRecent3dPickupRooms?: number | null;
      totalRecent7dPickupRooms?: number | null;
      totalRecent7dPickupKeys?: number | null;
      avgRecent7dPickupRoomsPerDay?: number | null;
      avgTier35PriceCushionKrw?: number | null;
    };
    spilloverPickupVelocityRatio?: number | null;
    crossElasticitySummary?: string | null;
  };
  yearlyMonthlySummary?: Array<{
    stayYear: string;
    stayYearMonth: string;
    resortName: string;
    dayType: string;
    observations: number;
    soldOutRatePct: number;
    avgMinPrice: number | null;
    avgMedianPrice: number | null;
    avgTier16_35Price: number | null;
    avgTier51Price: number | null;
  }>;
}

export interface CompetitorResortDetail {
  resortName: string;
  isSoldOut: boolean;
  isNewlySoldOut?: boolean;
  minPrice: number | null;
  medianPrice?: number | null;
  tier16_35Price?: number | null;
  tier16_35MinPrice?: number | null;
  tier51Price?: number | null;
  tier51MinPrice?: number | null;
  change1dPct?: number | null;
  priceChange1dPct?: number | null;
  change7dKrw?: number | null;
  priceChange7dKrw?: number | null;
  lowestChannel?: string;
  lowestRoomName?: string;
  offerCount?: number;
  vsBelleforetGapKrw?: number | null;
}

export interface CompetitorBenchmarkItem {
  snapshotCollectedAt?: string;
  marketStatus?: string;
  soldOutResortCount?: number;
  avgCompetitorSurgePct?: number;
  marketPositioningNote?: string;
  uiBadge?: {
    badgeCode: string;
    badgeLabel: string;
    badgeColorTone: 'RED' | 'ORANGE' | 'AMBER' | 'PURPLE' | 'GREEN' | 'BLUE' | string;
    tooltipText: string;
  };
  momentumSignals?: {
    newlySoldOutResortCount?: number;
    maxCompetitor1dSurgePct?: number;
    minCompetitor1dDropPct?: number;
    maxCompetitor7dSurgeKrw?: number;
    isCompetitorMomentumSurge?: boolean;
    isCompetitorWeekdayDumping?: boolean;
  };
  tierComparison?: {
    tier16_35?: {
      belleforetRoomType?: string;
      belleforetRecommendedAdr?: number | null;
      competitorMinPrice?: number | null;
      lowestCompetitorName?: string;
      priceCushionKrw?: number | null;
      priceCushionPct?: number | null;
      positioningStatus?: string;
    };
    tier51?: {
      belleforetRoomType?: string;
      belleforetRecommendedAdr?: number | null;
      competitorMinPrice?: number | null;
      lowestCompetitorName?: string;
      priceCushionKrw?: number | null;
      priceCushionPct?: number | null;
      positioningStatus?: string;
    };
  };
  recentPickupVelocity?: {
    recent3dBookedRooms?: number | null;
    recent7dBookedRooms?: number | null;
    recent7dOccupiedKeys?: number | null;
    spilloverMomentumStatus?: string;
  };
  resorts?: CompetitorResortDetail[];
}

export interface Connecting51BidPriceAdvisory {
  availSingle51Keys?: number | null;
  availConnecting51Pairs?: number | null;
  single16SellProb?: number | null;
  single35SellProb?: number | null;
  expectedDisplacementCm51?: number | null;
  connecting51BidPriceFloor?: number | null;
  recommended51Adr?: number | null;
  allocationStatus?: string;
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
  yoy2024MatchDate?: string;
  seasonalityIndex?: number | null;
  isHolidayEve?: boolean;
  isHolidayClosingNight?: boolean;
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
    yoy2025FinalOccupancyPct?: number | null;
    yoy2024FinalOccupancyPct?: number | null;
    yoy2025SameLeadKeys?: number | null;
    yoy2024SameLeadKeys?: number | null;
    historicalAttritionPct?: number | null;
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
    connecting51BidPriceAdvisory?: Connecting51BidPriceAdvisory;
  };
  marketing: {
    actionCode: DynamicActionCode;
    actionLabel: string;
    urgencyLevel: 'HIGH' | 'MEDIUM' | 'LOW' | string;
    targetChannel: string;
    promoBundleItem: string;
    recommendationText: string;
  };
  competitorBenchmark?: CompetitorBenchmarkItem;
  connecting51BidPriceAdvisory?: Connecting51BidPriceAdvisory;
  dualTrack?: DailyDualTrackItem;
  roomTypes: DailyRoomTypeDetail[];
}

export interface DailyTrackDetail {
  trackCode: string;
  trackName: string;
  actionCode: DynamicActionCode;
  actionLabel: string;
  dayMultiplier?: number;
  recommendedAdr: number | null;
  priceAdjustmentPct: number | null;
  recommendedAdrByRoomType?: Record<string, number>;
  dynamicNewPickupUnits?: number | null;
  dynamicPickupRevenue?: number | null;
  expectedRevenueDelta?: number | null;
  dynamicPickupContributionMargin?: number | null;
  expectedContributionMarginDelta?: number | null;
  externalSpreadFactors?: {
    seasonalPeakIntensityRatio?: number | null;
    avgDropFromSatPeakPct?: number | null;
    weekdayShoulderSurgeDetected?: boolean;
    adaptiveMultiplierDelta?: number | null;
    trackBReason?: string | null;
  };
}

export interface DailyDualTrackItem {
  activeTrack: string;
  trackA_standard: DailyTrackDetail;
  trackB_marketAdaptive: DailyTrackDetail;
  trackDelta: {
    recommendedAdrDeltaKrw: number | null;
    expectedRevenueDeltaDiffKrw: number | null;
    expectedCmDeltaDiffKrw: number | null;
    isTrackBAdjusted?: boolean;
    recommendedAdrDiffKrw?: number | null;
    adaptiveMultiplierDelta?: number | null;
  };
  trackBReason?: string | null;
}

export interface RoomDynamicPricingResponse {
  success: boolean;
  meta: RoomDynamicPricingMeta;
  summary: {
    historical2025: HistoricalPeriodSummary;
    recent2026: HistoricalPeriodSummary;
    currentOtb: CurrentOtbSummary;
    competitorMarket?: CompetitorMarketSummary;
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
        easyAction: '예약 속도가 안정적입니다. 2026년 기준 요금을 흔들림 없이 수호하세요.'
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
        easyAction: '빈방이 여유롭습니다. 방값을 덤핑 할인하지 말고 마운틴카트·미디어아트 등 레저 특전을 묶어 파세요.'
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

const getCompetitorBadgeStyle = (tone?: string) => {
  switch (tone) {
    case 'RED':
      return {
        bg: 'bg-[#FDF0ED]',
        text: 'text-[#8B2635]',
        border: 'border-[#EAC5BD]',
        badgeBg: 'bg-[#8B2635]',
        badgeText: 'text-white',
        dot: 'bg-[#8B2635]'
      };
    case 'ORANGE':
      return {
        bg: 'bg-[#FAF0E6]',
        text: 'text-[#C05621]',
        border: 'border-[#FBD38D]',
        badgeBg: 'bg-[#C05621]',
        badgeText: 'text-white',
        dot: 'bg-[#C05621]'
      };
    case 'AMBER':
      return {
        bg: 'bg-[#FAF6ED]',
        text: 'text-[#8C6D3B]',
        border: 'border-[#E5DAC1]',
        badgeBg: 'bg-[#8C6D3B]',
        badgeText: 'text-white',
        dot: 'bg-[#8C6D3B]'
      };
    case 'PURPLE':
      return {
        bg: 'bg-[#F3E8FF]',
        text: 'text-[#6B21A8]',
        border: 'border-[#D8B4FE]',
        badgeBg: 'bg-[#6B21A8]',
        badgeText: 'text-white',
        dot: 'bg-[#6B21A8]'
      };
    case 'GREEN':
      return {
        bg: 'bg-[#E8F2EE]',
        text: 'text-[#1E523F]',
        border: 'border-[#B4C6C1]',
        badgeBg: 'bg-[#1E523F]',
        badgeText: 'text-white',
        dot: 'bg-[#1E523F]'
      };
    case 'BLUE':
    default:
      return {
        bg: 'bg-[#EFF6FF]',
        text: 'text-[#1E40AF]',
        border: 'border-[#BFDBFE]',
        badgeBg: 'bg-[#1E40AF]',
        badgeText: 'text-white',
        dot: 'bg-[#1E40AF]'
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
  const [selectedTrack, setSelectedTrack] = useState<'STANDARD' | 'MARKET_ADAPTIVE'>('STANDARD');

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
  const [showLogicExplanationAccordion, setShowLogicExplanationAccordion] = useState<boolean>(false);
  const [showCompetitorTimeseriesAccordion, setShowCompetitorTimeseriesAccordion] = useState<boolean>(false);
  const [selectedCompetitorResortFilter, setSelectedCompetitorResortFilter] = useState<string>('ALL');

  const fetchDynamicPricing = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `${API_BASE}/api/v6/report/room-dynamic-pricing?date=${encodeURIComponent(baseDate)}&days=${days}&roomType=${encodeURIComponent(selectedRoomType)}&track=${encodeURIComponent(selectedTrack)}`;
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
  }, [baseDate, days, selectedRoomType, selectedTrack]);

  const meta = data?.meta;
  const summary = data?.summary;
  const hist2025 = summary?.historical2025;
  const recent2026 = summary?.recent2026;
  const currentOtb = summary?.currentOtb;
  const pricingRec = summary?.pricingRecommendation;
  const dualTrackSummary = pricingRec?.dualTrackSummary;
  const trackA = dualTrackSummary?.trackA_standard;
  const trackB = dualTrackSummary?.trackB_marketAdaptive;
  const trackDelta = dualTrackSummary?.trackDeltaBvsA;
  const competitorMarket = summary?.competitorMarket;
  const spillover = competitorMarket?.empiricalSpilloverAnalysis;
  const counterfactual = pricingRec?.counterfactualEvaluation;
  const yearlyMonthlySummary = competitorMarket?.yearlyMonthlySummary || [];
  const benchmarks = data?.roomTypeBenchmarks || [];
  const dailyCalendar = data?.dailyCalendar || [];

  const filteredCalendar = selectedActionFilter === 'ALL'
    ? dailyCalendar
    : dailyCalendar.filter((item) => item.marketing?.actionCode === selectedActionFilter);

  const selectedDayIndex = dailyCalendar.findIndex((item) => item.date === selectedDateStr);
  const selectedDayItem = selectedDayIndex >= 0
    ? dailyCalendar[selectedDayIndex]
    : dailyCalendar[0] || null;

  const filteredYearlySummary = selectedCompetitorResortFilter === 'ALL'
    ? yearlyMonthlySummary
    : yearlyMonthlySummary.filter((row) => row.resortName === selectedCompetitorResortFilter);

  const renderCompetitorDrawer = (targetDay: DailyCalendarItem) => {
    const cb = targetDay.competitorBenchmark;
    const adv = targetDay.pricing?.connecting51BidPriceAdvisory || targetDay.connecting51BidPriceAdvisory;
    if (!cb && !adv) return null;

    const t16_35 = cb?.tierComparison?.tier16_35;
    const t51 = cb?.tierComparison?.tier51;
    const pv = cb?.recentPickupVelocity;
    const resorts = cb?.resorts || [];
    const bStyle = getCompetitorBadgeStyle(cb?.uiBadge?.badgeColorTone);

    return (
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#D0C6BB]/85 shadow-2xs space-y-4">
        {/* 1. 상단 타이틀 & 경쟁사 상태 배지 & 수집 시점 */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#D0C6BB]/60 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1.5 rounded-lg bg-[#1B3B2B] text-white">
                <Radio size={15} />
              </span>
              <h4 className="text-sm sm:text-base font-black text-[#1B382E]">
                충청권 4대 경쟁사 실시간 비교 레이더 & 평형별 가격 쿠션 (Spillover Radar)
              </h4>
              {cb?.uiBadge && (
                <span
                  title={cb.uiBadge.tooltipText}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-black border flex items-center gap-1 ${bStyle.bg} ${bStyle.text} ${bStyle.border}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${bStyle.dot}`} />
                  <span>{cb.uiBadge.badgeLabel}</span>
                </span>
              )}
            </div>
            {cb?.marketPositioningNote && (
              <p className="text-xs font-bold text-[#284F42]">
                👉 {cb.marketPositioningNote}
              </p>
            )}
          </div>

          {cb?.snapshotCollectedAt && (
            <div className="text-[11px] font-bold text-[#5A6B63] shrink-0 flex items-center gap-1">
              <Activity size={12} className="text-[#284F42]" />
              <span>수집 시점: {cb.snapshotCollectedAt}</span>
            </div>
          )}
        </div>

        {/* 2. 평형별 가격 쿠션 (Tier Comparison) & 최근 픽업 속도 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 35평형 가격 쿠션 */}
          <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#D0C6BB]/60 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-[#1B382E]">35평형 가격 포지셔닝</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-[#D0C6BB]/60 text-[#284F42]">
                {t16_35?.positioningStatus || '비교'}
              </span>
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-[11px] text-[#5A6B63]">벨포레 추천가</span>
              <span className="text-sm font-black text-[#1B3B2B] font-financial">
                {formatWon(t16_35?.belleforetRecommendedAdr)}
              </span>
            </div>
            <div className="flex items-baseline justify-between text-[11px] text-[#5A6B63]">
              <span>경쟁사 최저 ({t16_35?.lowestCompetitorName || '-'})</span>
              <span className="font-bold text-[#1B382E] font-financial">
                {formatWon(t16_35?.competitorMinPrice)}
              </span>
            </div>
            <div className="flex items-baseline justify-between text-xs pt-1.5 border-t border-[#D0C6BB]/40 font-bold">
              <span className="text-[#5A6B63]">가격 쿠션 (우위 Δ)</span>
              <span className={`font-black font-financial ${
                (t16_35?.priceCushionKrw ?? 0) >= 0 ? 'text-[#1E523F]' : 'text-[#8B2635]'
              }`}>
                {formatSignedWon(t16_35?.priceCushionKrw)} ({formatSignedPct(t16_35?.priceCushionPct)})
              </span>
            </div>
          </div>

          {/* 51평형 가격 쿠션 */}
          <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#D0C6BB]/60 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-[#1B382E]">51평형 가격 포지셔닝</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-[#D0C6BB]/60 text-[#284F42]">
                {t51?.positioningStatus || '비교'}
              </span>
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-[11px] text-[#5A6B63]">벨포레 추천가</span>
              <span className="text-sm font-black text-[#1B3B2B] font-financial">
                {formatWon(t51?.belleforetRecommendedAdr)}
              </span>
            </div>
            <div className="flex items-baseline justify-between text-[11px] text-[#5A6B63]">
              <span>경쟁사 최저 ({t51?.lowestCompetitorName || '-'})</span>
              <span className="font-bold text-[#1B382E] font-financial">
                {formatWon(t51?.competitorMinPrice)}
              </span>
            </div>
            <div className="flex items-baseline justify-between text-xs pt-1.5 border-t border-[#D0C6BB]/40 font-bold">
              <span className="text-[#5A6B63]">가격 쿠션 (우위 Δ)</span>
              <span className={`font-black font-financial ${
                (t51?.priceCushionKrw ?? 0) >= 0 ? 'text-[#1E523F]' : 'text-[#8B2635]'
              }`}>
                {formatSignedWon(t51?.priceCushionKrw)} ({formatSignedPct(t51?.priceCushionPct)})
              </span>
            </div>
          </div>

          {/* 최근 신규 픽업 모멘텀 속도 */}
          <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#D0C6BB]/60 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-[#1B382E]">최근 신규 예약 유입 속도</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]">
                {pv?.spilloverMomentumStatus || '정상'}
              </span>
            </div>
            <div className="flex items-baseline justify-between pt-1 text-xs">
              <span className="text-[#5A6B63] font-medium">최근 3일 신규 유입</span>
              <span className="font-extrabold text-[#1B382E]">
                {formatNum(pv?.recent3dBookedRooms)}실
              </span>
            </div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-[#5A6B63] font-medium">최근 7일 신규 유입</span>
              <span className="font-black text-[#1E523F]">
                {formatNum(pv?.recent7dBookedRooms)}실 ({formatNum(pv?.recent7dOccupiedKeys)}키)
              </span>
            </div>
            <div className="pt-1.5 border-t border-[#D0C6BB]/40 text-[10px] text-[#5A6B63]">
              과열 구간 낙수수요 유입 여부를 실시간 추적합니다.
            </div>
          </div>
        </div>

        {/* 2-B. 투트랙 1:1 비교 & 외부시장 스프레드 분석 (Track B Market-Adaptive Factors) */}
        {targetDay.dualTrack && (() => {
          const dt = targetDay.dualTrack;
          const factors = dt.trackB_marketAdaptive?.externalSpreadFactors;
          const isAdjusted = dt.trackDelta?.recommendedAdrDeltaKrw !== 0;

          return (
            <div className="bg-[#FAF9F5] rounded-xl p-4 border border-[#D0C6BB]/70 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D0C6BB]/50 pb-2">
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-[#284F42]" />
                  <span className="text-xs font-black text-[#1B382E]">
                    투트랙 1:1 비교 & 외부시장 스프레드 분석 (Market-Adaptive)
                  </span>
                </div>
                {isAdjusted ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#FAF6ED] text-[#8C6D3B] border border-[#E5DAC1]">
                    Track B 보정: {formatSignedWon(dt.trackDelta?.recommendedAdrDeltaKrw)}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F4F3EE] text-[#5A6B63] border border-[#D0C6BB]">
                    Track A·B 동일 권장가
                  </span>
                )}
              </div>

              {/* 1:1 단가 비교 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-[#D0C6BB]/50">
                  <span className="text-[10px] text-[#5A6B63] block">Track A (기본형) 권장가</span>
                  <strong className="text-sm font-black text-[#1B382E] font-financial">
                    {formatWon(dt.trackA_standard?.recommendedAdr)}
                  </strong>
                  <span className="text-[10px] text-[#5A6B63] ml-1">
                    ({formatSignedPct(dt.trackA_standard?.priceAdjustmentPct)})
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-[#D0C6BB]/50">
                  <span className="text-[10px] text-[#5A6B63] block">Track B (고도화) 권장가</span>
                  <strong className="text-sm font-black text-[#8C6D3B] font-financial">
                    {formatWon(dt.trackB_marketAdaptive?.recommendedAdr)}
                  </strong>
                  <span className="text-[10px] text-[#8C6D3B] ml-1">
                    ({formatSignedPct(dt.trackB_marketAdaptive?.priceAdjustmentPct)})
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-[#D0C6BB]/50">
                  <span className="text-[10px] text-[#5A6B63] block">트랙간 단가 차이 (B - A)</span>
                  <strong className={`text-sm font-black font-financial ${
                    (dt.trackDelta?.recommendedAdrDeltaKrw ?? 0) > 0 ? 'text-[#8C6D3B]' : (dt.trackDelta?.recommendedAdrDeltaKrw ?? 0) < 0 ? 'text-[#1E523F]' : 'text-[#5A6B63]'
                  }`}>
                    {formatSignedWon(dt.trackDelta?.recommendedAdrDeltaKrw)}
                  </strong>
                </div>
              </div>

              {/* 외부 스프레드 지표 */}
              {factors && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                  <div className="bg-white p-2 rounded-lg border border-[#D0C6BB]/40">
                    <span className="text-[#5A6B63] block">성수기 과열 강도</span>
                    <strong className="text-[#1B382E]">
                      {factors.seasonalPeakIntensityRatio != null ? `${factors.seasonalPeakIntensityRatio} / 1.0` : '-'}
                    </strong>
                  </div>

                  <div className="bg-white p-2 rounded-lg border border-[#D0C6BB]/40">
                    <span className="text-[#5A6B63] block">토요일 피크 대비 평일 낙폭</span>
                    <strong className="text-[#1B382E]">
                      {formatPct(factors.avgDropFromSatPeakPct)}
                    </strong>
                  </div>

                  <div className="bg-white p-2 rounded-lg border border-[#D0C6BB]/40">
                    <span className="text-[#5A6B63] block">주중 숄더 강세 여부</span>
                    <strong className={factors.weekdayShoulderSurgeDetected ? 'text-[#8C6D3B]' : 'text-[#5A6B63]'}>
                      {factors.weekdayShoulderSurgeDetected ? '🔥 숄더 강세 포착' : '정상 수준'}
                    </strong>
                  </div>

                  <div className="bg-white p-2 rounded-lg border border-[#D0C6BB]/40">
                    <span className="text-[#5A6B63] block">탄력 가중 승수</span>
                    <strong className="text-[#284F42]">
                      {factors.adaptiveMultiplierDelta != null ? formatSignedPct(factors.adaptiveMultiplierDelta * 100) : '-'}
                    </strong>
                  </div>
                </div>
              )}

              {factors?.trackBReason && (
                <p className="text-[11px] text-[#284F42] font-bold bg-white p-2.5 rounded-lg border border-[#D0C6BB]/50 leading-relaxed">
                  💡 {factors.trackBReason}
                </p>
              )}
            </div>
          );
        })()}

        {/* 3. 4대 경쟁 리조트 상세 비교표 */}
        {resorts.length > 0 && (
          <div className="rounded-xl border border-[#D0C6BB]/70 overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
              <thead>
                <tr className="bg-[#F4F3EE] text-[#5A6B63] font-extrabold border-b border-[#D0C6BB]/70">
                  <th className="py-2 px-3.5">경쟁 리조트</th>
                  <th className="py-2 px-3.5 text-center">판매 상태</th>
                  <th className="py-2 px-3.5 text-right">당일 최저가</th>
                  <th className="py-2 px-3.5 text-right">중형 (16~35평)</th>
                  <th className="py-2 px-3.5 text-right">대형 (51평)</th>
                  <th className="py-2 px-3.5 text-right">전일 대비 변동률</th>
                  <th className="py-2 px-3.5 text-right">전주 대비 변동액</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D0C6BB]/40">
                {resorts.map((r) => (
                  <tr key={r.resortName} className="hover:bg-[#FAF9F6]">
                    <td className="py-2 px-3.5 font-bold text-[#1B382E]">{r.resortName}</td>
                    <td className="py-2 px-3.5 text-center">
                      {r.isSoldOut ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#FDF0ED] text-[#8B2635] border border-[#EAC5BD]">
                          마감·품절
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]">
                          판매중
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3.5 text-right font-black text-[#1B382E] font-financial">
                      {formatWon(r.minPrice)}
                    </td>
                    <td className="py-2 px-3.5 text-right text-[#5A6B63] font-financial">
                      {formatWon(r.tier16_35MinPrice ?? r.tier16_35Price)}
                    </td>
                    <td className="py-2 px-3.5 text-right text-[#5A6B63] font-financial">
                      {formatWon(r.tier51MinPrice ?? r.tier51Price)}
                    </td>
                    <td className={`py-2 px-3.5 text-right font-bold ${
                      ((r.priceChange1dPct ?? r.change1dPct) ?? 0) > 0 ? 'text-[#8B2635]' : ((r.priceChange1dPct ?? r.change1dPct) ?? 0) < 0 ? 'text-[#1E523F]' : 'text-[#5A6B63]'
                    }`}>
                      {formatSignedPct(r.priceChange1dPct ?? r.change1dPct)}
                    </td>
                    <td className={`py-2 px-3.5 text-right font-bold font-financial ${
                      ((r.priceChange7dKrw ?? r.change7dKrw) ?? 0) > 0 ? 'text-[#8B2635]' : ((r.priceChange7dKrw ?? r.change7dKrw) ?? 0) < 0 ? 'text-[#1E523F]' : 'text-[#5A6B63]'
                    }`}>
                      {formatSignedWon(r.priceChange7dKrw ?? r.change7dKrw)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. 51평 조립형 커넥팅 기회비용 바닥가 조언 (Connecting 51 Advisory) */}
        {adv && (
          <div className="bg-[#FAF6ED] rounded-xl p-3.5 border border-[#E5DAC1] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-black text-[#8C6D3B]">
                <ShieldCheck size={14} className="text-[#8C6D3B]" />
                <span>51평 조립형 커넥팅룸 기회비용 바닥가(Floor Bid Price) 통제</span>
              </div>
              {adv.allocationStatus && (
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-white text-[#8C6D3B] border border-[#E5DAC1]">
                  {adv.allocationStatus}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
              <div className="bg-white p-2 rounded-lg border border-[#E5DAC1]/60">
                <span className="text-[#5A6B63] block">단독 51평 / 조립 쌍</span>
                <strong className="text-[#1B382E]">
                  {formatNum(adv.availSingle51Keys)}실 / {formatNum(adv.availConnecting51Pairs)}쌍
                </strong>
              </div>
              <div className="bg-white p-2 rounded-lg border border-[#E5DAC1]/60">
                <span className="text-[#5A6B63] block">단독 16평·35평 매진확률</span>
                <strong className="text-[#1B382E]">
                  {adv.single16SellProb != null ? formatPct(adv.single16SellProb * 100) : '-'} · {adv.single35SellProb != null ? formatPct(adv.single35SellProb * 100) : '-'}
                </strong>
              </div>
              <div className="bg-white p-2 rounded-lg border border-[#E5DAC1]/60">
                <span className="text-[#5A6B63] block">16+35 단독 판매 기회비용</span>
                <strong className="text-[#8C6D3B] font-financial">
                  {formatWon(adv.expectedDisplacementCm51)}
                </strong>
              </div>
              <div className="bg-white p-2 rounded-lg border border-[#E5DAC1]/60">
                <span className="text-[#5A6B63] block">51평 바닥 권장가 (Floor)</span>
                <strong className="text-[#1E523F] font-financial">
                  {formatWon(adv.connecting51BidPriceFloor)}
                </strong>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

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
                  <span>BELLEFORET RESORT · DYNAMIC PRICING & YIELD ENGINE V2</span>
                </div>
                {meta?.pricingArchitecture && (
                  <span className="px-3 py-1 rounded-full bg-[#1B3B2B] text-[#EAE3D2] border border-[#2F5548] text-xs font-extrabold shadow-2xs">
                    ⚡ {meta.pricingArchitecture}
                  </span>
                )}
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
                <strong>2026년 인상 단가 SSOT 100% 앵커링</strong>과 <strong>2024·2025 2개년 비가격 앙상블</strong>을 기반으로, 오늘 각 평형별 권장 판매가와 대기·취소·골프 시너지 액션을 즉시 확인합니다.
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

          {/* 투트랙(Two-Track: Standard vs Market-Adaptive) 모드 전환 스위치 & 성과 비교 배너 */}
          <div className="mt-5 pt-4 border-t border-[#D0C6BB]/60 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#1B3B2B] text-white">
                  <Zap size={16} />
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-[#1B382E] flex items-center gap-2 flex-wrap">
                    <span>다이나믹 프라이싱 모드 선택 (투트랙 아키텍처)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]">
                      100% Zero-Proxy SSOT
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#5A6B63] font-medium">
                    내부 OTB 중심 안정형 기본 모델(Track A)과 충청권 4대 경쟁사 낙폭·성수기 과열 연동 고도화 모델(Track B)을 1:1 비교 전환합니다.
                  </p>
                </div>
              </div>

              {/* 기확정 생존 OTB 격리 보호 배지 */}
              <div className="px-3 py-1.5 rounded-xl bg-[#FAF9F5] border border-[#D0C6BB]/80 text-[11px] font-bold text-[#284F42] self-start sm:self-auto flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-[#1E523F]" />
                <span>기확정 생존 OTB: <strong className="text-[#1B382E]">{formatWon(trackA?.lockedOtbRevenueTotal || pricingRec?.lockedOtbRevenueTotal)}</strong> (Δ = 0원 불변 고정)</span>
              </div>
            </div>

            {/* 두 트랙 선택 탭 버튼 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Track A 버튼 */}
              <button
                type="button"
                onClick={() => setSelectedTrack('STANDARD')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                  selectedTrack === 'STANDARD'
                    ? 'bg-[#F4F3EE] border-2 border-[#1B3B2B] shadow-md ring-2 ring-[#1B3B2B]/10'
                    : 'bg-white border-[#D0C6BB]/80 hover:border-[#1B3B2B]/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
                      selectedTrack === 'STANDARD' ? 'border-[#1B3B2B] bg-[#1B3B2B]' : 'border-[#D0C6BB] bg-white'
                    }`}>
                      {selectedTrack === 'STANDARD' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-[#1B382E]">
                      Track A: 표준 모드 (내부수요 중심 · 기본형)
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]">
                    기본 적용
                  </span>
                </div>

                <p className="text-[11px] text-[#5A6B63] mb-3 leading-relaxed">
                  벨포레 자체 예약률(OTB) × 리드타임 매트릭스 중심 + 경쟁사 과열 시 고정 보너스(+1.5%p ~ +3.5%p) 부여
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2.5 border-t border-[#D0C6BB]/50">
                  <div className="bg-white/80 p-2 rounded-xl border border-[#D0C6BB]/40">
                    <span className="text-[10px] text-[#5A6B63] block font-medium">30일 신규 픽업 매출 순증</span>
                    <strong className="text-xs sm:text-sm font-black text-[#1B382E] font-financial">
                      {formatSignedWon(trackA?.expectedRevenueGain)}
                    </strong>
                    <span className="text-[10px] font-extrabold text-[#1E523F] ml-1">
                      ({formatSignedPct(trackA?.expectedRevenueGainPct)})
                    </span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-xl border border-[#D0C6BB]/40">
                    <span className="text-[10px] text-[#5A6B63] block font-medium">30일 순공헌이익 순증</span>
                    <strong className="text-xs sm:text-sm font-black text-[#1E523F] font-financial">
                      {formatSignedWon(trackA?.expectedNetContributionMarginGain)}
                    </strong>
                    <span className="text-[10px] font-extrabold text-[#1E523F] ml-1">
                      ({formatSignedPct(trackA?.expectedNetContributionMarginGainPct)})
                    </span>
                  </div>
                </div>
              </button>

              {/* Track B 버튼 */}
              <button
                type="button"
                onClick={() => setSelectedTrack('MARKET_ADAPTIVE')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                  selectedTrack === 'MARKET_ADAPTIVE'
                    ? 'bg-[#FAF6ED] border-2 border-[#8C6D3B] shadow-md ring-2 ring-[#8C6D3B]/20'
                    : 'bg-white border-[#D0C6BB]/80 hover:border-[#8C6D3B]/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
                      selectedTrack === 'MARKET_ADAPTIVE' ? 'border-[#8C6D3B] bg-[#8C6D3B]' : 'border-[#D0C6BB] bg-white'
                    }`}>
                      {selectedTrack === 'MARKET_ADAPTIVE' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-[#1B382E]">
                      Track B: 외부시장 탄력 고도화 모드 (주중·주말·성수기 낙폭 연동형)
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-[#8C6D3B] text-white">
                    추천 고도화
                  </span>
                </div>

                <p className="text-[11px] text-[#5A6B63] mb-3 leading-relaxed">
                  4대 경쟁사 성수기 과열 강도 + 주중 숄더 시장 강세 + 토요일 대비 평일 가격 낙폭(Spread) 연속 함수 반영
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2.5 border-t border-[#D0C6BB]/50">
                  <div className="bg-white/80 p-2 rounded-xl border border-[#D0C6BB]/40">
                    <span className="text-[10px] text-[#5A6B63] block font-medium">30일 신규 픽업 매출 순증</span>
                    <strong className="text-xs sm:text-sm font-black text-[#8C6D3B] font-financial">
                      {formatSignedWon(trackB?.expectedRevenueGain)}
                    </strong>
                    <span className="text-[10px] font-extrabold text-[#8C6D3B] ml-1">
                      ({formatSignedPct(trackB?.expectedRevenueGainPct)})
                    </span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-xl border border-[#D0C6BB]/40">
                    <span className="text-[10px] text-[#5A6B63] block font-medium">30일 순공헌이익 순증</span>
                    <strong className="text-xs sm:text-sm font-black text-[#1E523F] font-financial">
                      {formatSignedWon(trackB?.expectedNetContributionMarginGain)}
                    </strong>
                    <span className="text-[10px] font-extrabold text-[#1E523F] ml-1">
                      ({formatSignedPct(trackB?.expectedNetContributionMarginGainPct)})
                    </span>
                  </div>
                </div>
              </button>
            </div>

            {/* 고도화 Track B 효과 차액 배지 */}
            {trackDelta && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-gradient-to-r from-[#FAF6ED] to-[#FAF9F5] p-3 rounded-xl border border-[#E5DAC1] text-xs">
                <div className="flex items-center gap-2 font-extrabold text-[#8C6D3B]">
                  <TrendingUp size={15} />
                  <span>
                    🚀 고도화(Track B) 전환 시 기대 추가 효과 ({dualTrackSummary?.trackBAdjustedDaysCount != null ? formatNum(dualTrackSummary.trackBAdjustedDaysCount) : '-'}개 숙박일 정밀 보정):
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs shrink-0 font-financial">
                  <span>추가 매출 <strong className="text-[#8C6D3B] font-black">{formatSignedWon(trackDelta.pickupRevenueDiffKrw)}</strong></span>
                  <span>추가 순공헌이익 <strong className="text-[#1E523F] font-black">{formatSignedWon(trackDelta.netContributionMarginDiffKrw)}</strong></span>
                </div>
              </div>
            )}
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

          {/* 📖 [아코디언 B] 다이나믹 프라이싱 V2 실무자 상세 설명 가이드 */}
          {showGuideAccordion && (
            <div className="mt-4 pt-5 border-t-2 border-[#D0C6BB]/70 bg-[#FAF9F6] rounded-2xl p-5 sm:p-6 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-[#1B382E] flex items-center gap-2">
                    <BookOpen size={18} className="text-[#284F42]" />
                    <span>실무자용 직관적 가이드 — "V2 다이나믹 프라이싱 어떻게 작동하나요?"</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5A6B63] mt-1 leading-relaxed">
                    <strong>2026년 전략적 인상 단가를 100% 출발 기준선(Anchor)</strong>으로 삼고, <strong>과거 2개년(2024·2025) 실측 데이터는 원화 금액을 섞지 않고 오직 수요 패턴(앙상블 점유율·예약 속도·계절성 곡선)</strong>만 결합하여 최적 판매가를 도출합니다.
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

              {/* 3대 핵심 엔진 개선 포인트 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-[#D0C6BB]/75 shadow-2xs space-y-1.5">
                  <div className="text-xs font-black text-[#1E523F] bg-[#E8F2EE] px-2.5 py-1 rounded-lg inline-block">
                    핵심 1 · 2026 순수 가격 앵커링
                  </div>
                  <div className="text-sm font-extrabold text-[#1B382E]">
                    2025년 과거 가격 물타기(Dilution) 전면 배제
                  </div>
                  <p className="text-xs text-[#5A6B63] leading-relaxed">
                    과거 낮은 가격과의 단순 평균을 폐기하고, 2026년 실측 Retail ADR을 그대로 출발선으로 고정하여 2026년 인상 기조 위에서 단가 상향(Yield-Up)을 집행합니다.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-[#D0C6BB]/75 shadow-2xs space-y-1.5">
                  <div className="text-xs font-black text-[#8C6D3B] bg-[#FAF6ED] px-2.5 py-1 rounded-lg inline-block">
                    핵심 2 · 2024·2025 2개년 비가격 앙상블
                  </div>
                  <div className="text-sm font-extrabold text-[#1B382E]">
                    추석 이동 노이즈 제거 & 62,233건 취소 위험 차감
                  </div>
                  <p className="text-xs text-[#5A6B63] leading-relaxed">
                    2개년 동요일 점유율 및 리드타임 D-k 예약 속도를 앙상블 결합하여, 11월 주말의 구조적 만실 패턴을 포착하고 D-25 이전에도 선제적 Yield-Up을 가동합니다.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-[#D0C6BB]/75 shadow-2xs space-y-1.5">
                  <div className="text-xs font-black text-[#1B3B2B] bg-[#E8F2EE] px-2.5 py-1 rounded-lg inline-block">
                    핵심 3 · 숙박업 전용 Stay-Night 규칙
                  </div>
                  <div className="text-sm font-extrabold text-[#1B382E]">
                    공휴일 전야(Eve) 최성수 & 연휴 마감 분리
                  </div>
                  <p className="text-xs text-[#5A6B63] leading-relaxed">
                    달력상 평일이라도 다음 날이 쉬는 날인 밤(연휴 전야)은 토요일 최성수 요금으로 자동 편입되며, 연휴 마지막 날 밤은 일요 요금제로 자동 분리됩니다.
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
                      <span className="text-[#5A6B63]">주말·대기예약·골프 성수일 등 수요 집중 구간입니다. <strong>OTA 할인 특가를 마감하고 2026년 기준가보다 높여 수익을 극대화</strong>하세요.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#F4F3EE] text-[#284F42] font-extrabold shrink-0">⚖️ HOLD (기준가 유지)</span>
                      <span className="text-[#5A6B63]">예약 속도가 안정적인 날입니다. <strong>2026년 인상 기준가를 방어하면서 주력 복합패키지 판매 비중을 유지</strong>하세요.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#FAF6ED] text-[#8C6D3B] font-extrabold shrink-0">🎁 BUNDLE_PROMO (번들 특전)</span>
                      <span className="text-[#5A6B63]">체크인 11일 이상 남은 사전 모객 기간(비수기 평일)입니다. 객실 단가를 직접 깎지 말고 <strong>마운틴카트·미디어아트 등 레저 2인 특전을 결합해 사전 모객</strong>하세요.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#FDF0ED] text-[#8B2635] font-extrabold shrink-0">⚡ FLASH_SALE (타임세일)</span>
                      <span className="text-[#5A6B63]">D-10 이내 저점유 임박일입니다. 공실 손실 방어를 위해 <strong>하한선(Floor) 내에서 긴급 CRM/OTA 타임세일</strong>을 집행하세요.</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-[#D0C6BB]/75 space-y-2.5">
                  <div className="text-xs font-extrabold text-[#1B382E] border-b border-[#D0C6BB]/50 pb-2">
                    📌 V2 핵심 지표 및 필드 쉽게 이해하기
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <strong className="text-[#1B382E]">▪ 2개년 동요일 실측 점유율 앙상블:</strong>{' '}
                      <span className="text-[#5A6B63]">52주 전(2025 D-364)과 104주 전(2024 D-728) 실측 점유율을 가중 앙상블하여 특정 연도의 우천/추석 이동 왜곡을 보정합니다.</span>
                    </div>
                    <div>
                      <strong className="text-[#1B382E]">▪ 계절성 탄력 지수 (Seasonality Index S):</strong>{' '}
                      <span className="text-[#5A6B63]">원화 금액을 배제하고, 과거 연도 내 연평균 대비 해당 월·요일군의 상대적 수요 비율(0.96x ~ 1.06x)만 추출한 무차원 가중치입니다.</span>
                    </div>
                    <div>
                      <strong className="text-[#1B382E]">▪ 하한 방어선(Floor) ~ 상한선(Ceiling):</strong>{' '}
                      <span className="text-[#5A6B63]">2026년 인상 단가 체계에서 원가 및 가치를 지키는 최저선(Floor)과 최대 인상 한도(Ceiling)입니다.</span>
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
                          {day.competitorBenchmark?.uiBadge && (
                            <div className={`text-[9px] font-black truncate max-w-[105px] mt-0.5 ${
                              isSel ? 'text-[#B59269]' : getCompetitorBadgeStyle(day.competitorBenchmark.uiBadge.badgeColorTone).text
                            }`}>
                              {day.competitorBenchmark.uiBadge.badgeLabel}
                            </div>
                          )}
                          {day.dualTrack?.trackDelta?.recommendedAdrDeltaKrw != null && day.dualTrack.trackDelta.recommendedAdrDeltaKrw !== 0 && (
                            <div className={`text-[9px] font-black truncate max-w-[105px] mt-0.5 ${
                              isSel ? 'text-[#FAF6ED]' : day.dualTrack.trackDelta.recommendedAdrDeltaKrw > 0 ? 'text-[#8C6D3B]' : 'text-[#8B2635]'
                            }`}>
                              B: {formatSignedWon(day.dualTrack.trackDelta.recommendedAdrDeltaKrw)}
                            </div>
                          )}
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
                          D-{selectedDayItem.leadDays != null ? selectedDayItem.leadDays : '-'} (25년 {selectedDayItem.yoyMatchDate || '-'} · 24년 {selectedDayItem.yoy2024MatchDate || '-'})
                        </span>
                        {selectedDayItem.isHolidayEve && (
                          <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-[#FAF6ED] text-[#8C6D3B] border border-[#E5DAC1] flex items-center gap-1 shadow-2xs">
                            ★ 공휴일 전야 최성수 (토요요금)
                          </span>
                        )}
                        {selectedDayItem.isHolidayClosingNight && (
                          <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-[#F4F3EE] text-[#5A6B63] border border-[#D0C6BB] flex items-center gap-1">
                            연휴 마감 (일요요금)
                          </span>
                        )}
                        {selectedDayItem.competitorBenchmark?.uiBadge && (() => {
                          const b = selectedDayItem.competitorBenchmark.uiBadge;
                          const bStyle = getCompetitorBadgeStyle(b.badgeColorTone);
                          return (
                            <span
                              title={b.tooltipText}
                              className={`px-2.5 py-1 rounded-xl text-xs font-black border flex items-center gap-1.5 shadow-2xs ${bStyle.bg} ${bStyle.text} ${bStyle.border}`}
                            >
                              <span className={`w-2 h-2 rounded-full ${bStyle.dot}`} />
                              <span>{b.badgeLabel}</span>
                            </span>
                          );
                        })()}
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
                        {selectedDayItem.dualTrack?.trackDelta?.recommendedAdrDeltaKrw != null && selectedDayItem.dualTrack.trackDelta.recommendedAdrDeltaKrw !== 0 && (
                          <span
                            title={selectedDayItem.dualTrack.trackBReason || selectedDayItem.dualTrack.trackB_marketAdaptive?.externalSpreadFactors?.trackBReason || '외부시장 탄력(Track B) 보정 적용'}
                            className="px-2.5 py-1 rounded-xl text-xs font-black bg-[#FAF6ED] text-[#8C6D3B] border border-[#E5DAC1] flex items-center gap-1 shadow-2xs"
                          >
                            <TrendingUp size={12} />
                            <span>Track B 고도화 {formatSignedWon(selectedDayItem.dualTrack.trackDelta.recommendedAdrDeltaKrw)}</span>
                          </span>
                        )}
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
                        {selectedDayItem.dualTrack?.trackDelta?.recommendedAdrDeltaKrw != null && selectedDayItem.dualTrack.trackDelta.recommendedAdrDeltaKrw !== 0 && (
                          <div className="text-[10px] font-extrabold text-[#8C6D3B]">
                            Track A 대비 {formatSignedWon(selectedDayItem.dualTrack.trackDelta.recommendedAdrDeltaKrw)}
                          </div>
                        )}
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
                      2개년 동요일 점유율 <strong className="text-[#1B382E]">{formatPct(selectedDayItem.inventory?.yoyFinalOccupancyPct)}</strong>
                      {(selectedDayItem.inventory?.yoy2025FinalOccupancyPct != null || selectedDayItem.inventory?.yoy2024FinalOccupancyPct != null) && (
                        <span className="text-[11px] text-[#5A6B63] ml-1">
                          (25년 {formatPct(selectedDayItem.inventory?.yoy2025FinalOccupancyPct)} · 24년 {formatPct(selectedDayItem.inventory?.yoy2024FinalOccupancyPct)})
                        </span>
                      )}
                    </span>
                    {selectedDayItem.seasonalityIndex != null && (
                      <span className="px-3 py-1 rounded-xl bg-white border border-[#D0C6BB]/80 text-xs font-bold text-[#1B382E]">
                        계절성 탄력 지수 <strong className="text-[#284F42]">{selectedDayItem.seasonalityIndex}x</strong>
                      </span>
                    )}
                    {selectedDayItem.inventory?.historicalAttritionPct != null && (
                      <span className="px-3 py-1 rounded-xl bg-white border border-[#D0C6BB]/80 text-xs font-bold text-[#5A6B63]">
                        3개년 고유 취소율 <strong className="text-[#8B2635]">{formatPct(selectedDayItem.inventory?.historicalAttritionPct)}</strong>
                      </span>
                    )}
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

                  {/* 당일 충청권 4대 경쟁사 실시간 비교 레이더 & 평형별 가격 쿠션 (Spillover Radar) */}
                  {selectedDayItem && renderCompetitorDrawer(selectedDayItem)}
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
                                  <span className="text-xs text-[#5A6B63] font-medium mr-1.5">2026 기준가:</span>
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
                              <span className="text-[#5A6B63] font-bold">하한 ~ 상한 가드레일</span>
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
                                26년 실측: <strong className="text-[#1B382E]">{formatWon(rt.adr2026RecentRetail)}</strong> (25년 {formatWon(rt.adr2025Retail)})
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
                            <th className="py-3 px-4 text-right">2025 실측 ADR (참고)</th>
                            <th className="py-3 px-4 text-right">2026 실측 ADR (앵커)</th>
                            <th className="py-3 px-4 text-right">기준가 (2026 출발선)</th>
                            <th className="py-3 px-4 text-right">추천 ADR (조정률)</th>
                            <th className="py-3 px-4 text-right">하한 ~ 상한 가드레일</th>
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
                    향후 30일 물리 가용 키({formatNum(currentOtb?.totalCapacityKeys)}키) 대비 현재 확보된 점유율과, 대기예약({formatNum(currentOtb?.totalWaitingRooms)}실)·취소({formatNum(currentOtb?.totalCancelledRooms)}실)·골프 부킹({formatNum(currentOtb?.totalGolfBookedTeams)}팀) 및 2개년 앙상블 리드타임을 반영한 최종 예상 가동률입니다.
                  </div>
                  <div>
                    <strong className="text-[#1B382E] block mb-0.5">② 2025 동기 vs 2026 최근 Retail ADR (100% 앵커)</strong>
                    출발 기준선(Baseline)으로 100% 고정된 2026년 실측 Retail ADR({formatWon(recent2026?.retailAdr)})과 2025년 동기 대비 인상률({formatSignedPct(recent2026?.yoyRetailAdrGrowthPct)}), 그리고 최근 3개년 연박 성장세를 비교합니다.
                  </div>
                  <div>
                    <strong className="text-[#1B382E] block mb-0.5">③ 향후 30일 다이나믹 추천 평균 ADR</strong>
                    2026년 실측 기준가 평균({formatWon(pricingRec?.avgBaselineAdr)})을 기초로 수요 집중일 선제적 단가 상향(Yield-Up)을 집행한 최종 추천 평균 단가({formatWon(pricingRec?.avgRecommendedAdr)})입니다.
                  </div>
                  <div>
                    <strong className="text-[#1B382E] block mb-0.5">④ 다이나믹 예상 매출 증대 효과 (30일 누적)</strong>
                    2026년 기준가 고정 시 예상 매출({formatWon(pricingRec?.baselineProjectedRevenue)}) 대비 다이나믹 전략 적용 시 기대되는 순수 추가 수익({formatSignedWon(pricingRec?.expectedRevenueGain)})입니다.
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
                      <span className="text-[#5A6B63] font-medium">과거 동일 리드타임({formatNum(currentOtb?.yoySameLeadOccupiedKeys)}키) 대비</span>
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
                        2. 2025 동기 vs 2026 실측 Retail ADR (100% 앵커)
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
                      <span className="text-[#5A6B63] font-medium">2026 최근 점유율 / 연박 비중</span>
                      <span className="font-extrabold text-[#1E523F]">
                        점유 {formatPct(recent2026?.avgOccupancyPct)} · 연박 {formatPct(recent2026?.avgMultiNightRatioPct)}
                      </span>
                    </div>
                    {recent2026?.losTrendByYear && (
                      <div className="flex items-center justify-between text-[11px] text-[#5A6B63] pt-1 border-t border-[#D0C6BB]/30">
                        <span>3개년 연박 성장</span>
                        <span className="font-extrabold text-[#284F42]">
                          24년 {formatPct(recent2026.losTrendByYear.y2024)} ➔ 25년 {formatPct(recent2026.losTrendByYear.y2025)} ➔ 26년 {formatPct(recent2026.losTrendByYear.y2026)}
                        </span>
                      </div>
                    )}
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
                      2026 출발 기준가 평균: <strong className="text-[#1B382E]">{formatWon(pricingRec?.avgBaselineAdr)}</strong>
                    </p>

                    {pricingRec?.recommendedByDayType && (
                      <div className="mt-2.5 pt-2 border-t border-[#D0C6BB]/40 grid grid-cols-2 gap-1.5 text-[11px]">
                        <div className="flex items-center justify-between bg-[#FAF6ED] px-2 py-1 rounded-lg border border-[#E5DAC1]">
                          <span className="text-[#8C6D3B] font-bold">토·연휴</span>
                          <span className="font-black text-[#8C6D3B]">{formatWon(pricingRec.recommendedByDayType.satHoliday)}</span>
                        </div>
                        <div className="flex items-center justify-between bg-[#F4F3EE] px-2 py-1 rounded-lg border border-[#D0C6BB]/70">
                          <span className="text-[#1B382E] font-bold">금요일</span>
                          <span className="font-black text-[#1B382E]">{formatWon(pricingRec.recommendedByDayType.friday)}</span>
                        </div>
                        <div className="flex items-center justify-between bg-[#F4F3EE] px-2 py-1 rounded-lg border border-[#D0C6BB]/70">
                          <span className="text-[#5A6B63] font-bold">일요일</span>
                          <span className="font-bold text-[#1B382E]">{formatWon(pricingRec.recommendedByDayType.sunday)}</span>
                        </div>
                        <div className="flex items-center justify-between bg-[#E8F2EE] px-2 py-1 rounded-lg border border-[#B4C6C1]/70">
                          <span className="text-[#1E523F] font-bold">평일(월~목)</span>
                          <span className="font-black text-[#1E523F]">{formatWon(pricingRec.recommendedByDayType.weekday)}</span>
                        </div>
                      </div>
                    )}
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
                      <span>2026 기준가 고정 시</span>
                      <span className="font-bold text-white">{formatWon(pricingRec?.baselineProjectedRevenue)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[#EAE3D2]">
                      <span className="font-bold">다이나믹 적용 시</span>
                      <span className="font-extrabold">{formatWon(pricingRec?.dynamicProjectedRevenue)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 충청권 4대 경쟁사 레이더 & 낙수수요(Spillover) 실측 교차 탄력성 분석 배너 */}
              {competitorMarket && (
                <div className="bg-gradient-to-br from-[#FAF9F5] via-white to-[#F4F3EE] rounded-3xl p-6 border-2 border-[#1B3B2B]/20 shadow-[0_4px_24px_rgba(40,79,66,0.06)] space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#D0C6BB]/70 pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="p-1.5 rounded-lg bg-[#1B3B2B] text-white">
                          <Radio size={16} />
                        </span>
                        <h3 className="text-base sm:text-lg font-black text-[#1B382E]">
                          충청권 4대 경쟁 리조트 야간 실시간 레이더 & 낙수수요(Spillover) 실측 교차 탄력성 분석
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#FDF0ED] text-[#8B2635] border border-[#EAC5BD]">
                          경쟁사 과열·품절 {formatNum(competitorMarket.highCompressionDaysCount)}일
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]">
                          낙수 유입 가속비 {spillover?.spilloverPickupVelocityRatio != null ? `${spillover.spilloverPickupVelocityRatio}배` : '-'}
                        </span>
                      </div>
                      <p className="text-xs text-[#5A6B63] font-medium">
                        매일 밤 23:30 KST 야간 자동 크롤링 · AWS S3 영구 SQLite 다년도 시계열 DB 연동 · 소노벨 단양 · 롯데리조트 부여 · 레스트리 리솜 · 포레스트 리솜
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-bold text-[#5A6B63] shrink-0">
                      <span className="px-3 py-1.5 rounded-xl bg-white border border-[#D0C6BB]/80 flex items-center gap-1.5 shadow-2xs">
                        <Activity size={13} className="text-[#284F42]" />
                        <span>수집: {competitorMarket.snapshotCollectedAt || '-'}</span>
                      </span>
                    </div>
                  </div>

                  {/* 낙수수요 실측 교차 탄력성 핵심 지표 그리드 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {/* 1. 과열 구간 예약 속도 */}
                    <div className="bg-white p-4 rounded-2xl border border-[#D0C6BB]/80 shadow-2xs">
                      <div className="text-[11px] font-bold text-[#8B2635] mb-1 flex items-center justify-between">
                        <span>🔥 경쟁사 과열 구간 (총 {formatNum(spillover?.highCompressionGroup?.daysCount)}일)</span>
                        <span className="text-[10px] bg-[#FDF0ED] px-2 py-0.5 rounded-md font-extrabold">품절 2곳 이상</span>
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-[#1B382E] font-financial">
                        {spillover?.highCompressionGroup?.avgRecent7dPickupRoomsPerDay != null ? `${spillover.highCompressionGroup.avgRecent7dPickupRoomsPerDay}실/일` : '-'}
                      </div>
                      <div className="text-[11px] text-[#5A6B63] mt-1 font-medium">
                        최근 7일 유입: <strong className="text-[#1B382E]">{formatNum(spillover?.highCompressionGroup?.totalRecent7dPickupRooms)}실</strong> ({formatNum(spillover?.highCompressionGroup?.totalRecent7dPickupKeys)}키)
                      </div>
                      <div className="text-[10px] text-[#1E523F] font-bold mt-0.5">
                        벨포레 35평 가격 우위: {formatSignedWon(spillover?.highCompressionGroup?.avgTier35PriceCushionKrw)}
                      </div>
                    </div>

                    {/* 2. 일반 구간 예약 속도 */}
                    <div className="bg-white p-4 rounded-2xl border border-[#D0C6BB]/80 shadow-2xs">
                      <div className="text-[11px] font-bold text-[#5A6B63] mb-1 flex items-center justify-between">
                        <span>경쟁사 일반 구간 (총 {formatNum(spillover?.normalMarketGroup?.daysCount)}일)</span>
                        <span className="text-[10px] bg-[#F4F3EE] px-2 py-0.5 rounded-md font-bold">정상 판매</span>
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-[#5A6B63] font-financial">
                        {spillover?.normalMarketGroup?.avgRecent7dPickupRoomsPerDay != null ? `${spillover.normalMarketGroup.avgRecent7dPickupRoomsPerDay}실/일` : '-'}
                      </div>
                      <div className="text-[11px] text-[#5A6B63] mt-1 font-medium">
                        최근 7일 유입: <strong className="text-[#1B382E]">{formatNum(spillover?.normalMarketGroup?.totalRecent7dPickupRooms)}실</strong> ({formatNum(spillover?.normalMarketGroup?.totalRecent7dPickupKeys)}키)
                      </div>
                      <div className="text-[10px] text-[#5A6B63] font-bold mt-0.5">
                        벨포레 35평 가격 우위: {formatSignedWon(spillover?.normalMarketGroup?.avgTier35PriceCushionKrw)}
                      </div>
                    </div>

                    {/* 3. 기확정 생존 OTB 매출 (소급 0원 고정) */}
                    <div className="bg-white p-4 rounded-2xl border border-[#D0C6BB]/80 shadow-2xs">
                      <div className="text-[11px] font-bold text-[#284F42] mb-1 flex items-center justify-between">
                        <span>기확정 생존 OTB 매출</span>
                        <span className="text-[10px] bg-[#E8F2EE] text-[#1E523F] px-2 py-0.5 rounded-md font-extrabold">소급 0원 고정</span>
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-[#1B382E] font-financial">
                        {formatWon(pricingRec?.lockedOtbRevenueTotal)}
                      </div>
                      <div className="text-[11px] text-[#5A6B63] mt-1 font-medium">
                        생존 OTB <strong className="text-[#1B382E]">{formatNum(counterfactual?.totalSurvivingOtbUnits)}실</strong> 기준
                      </div>
                      <div className="text-[10px] text-[#1E523F] font-bold mt-0.5">
                        확정 기여 공헌이익: {formatWon(counterfactual?.lockedOtbContributionMarginTotal)}
                      </div>
                    </div>

                    {/* 4. 신규 픽업 순공헌이익 순증 (Counterfactual) */}
                    <div className="bg-gradient-to-br from-[#1B3B2B] to-[#0F291E] text-white p-4 rounded-2xl border border-[#0F291E] shadow-2xs">
                      <div className="text-[11px] font-bold text-white/80 mb-1 flex items-center justify-between">
                        <span>신규 픽업 순공헌이익 순증</span>
                        <span className="text-[10px] bg-[#B59269] text-white px-2 py-0.5 rounded-md font-black">Counterfactual</span>
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-[#EAE3D2] font-financial">
                        {formatSignedWon(counterfactual?.expectedNetContributionMarginGain)}
                      </div>
                      <div className="text-[11px] text-white/80 mt-1 font-medium">
                        매출 순증: <strong className="text-white">{formatSignedWon(pricingRec?.expectedRevenueGain)} ({formatSignedPct(pricingRec?.expectedRevenueGainPct)})</strong>
                      </div>
                      <div className="text-[10px] text-[#B59269] font-black mt-0.5">
                        공헌이익 순증률: {formatSignedPct(counterfactual?.expectedNetContributionMarginGainPct)}
                      </div>
                    </div>
                  </div>

                  {/* 교차 탄력성 분석 종합 한 줄 요약 & 방법론 주석 */}
                  {spillover?.crossElasticitySummary && (
                    <div className="bg-white p-4 rounded-2xl border border-[#D0C6BB]/75 flex items-start gap-3 text-xs leading-relaxed">
                      <Sparkles size={16} className="text-[#B59269] shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-extrabold text-[#1B382E]">
                          {spillover.crossElasticitySummary}
                        </p>
                        {counterfactual?.methodologyNote && (
                          <p className="text-[11px] text-[#5A6B63] font-medium pt-1 border-t border-[#D0C6BB]/40">
                            ※ 평가 방법론: {counterfactual.methodologyNote}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
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
                        🎯 단가 제안 (2026 기준가 ➔ 추천 ADR)
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
                                  <div className="font-extrabold text-[#1B382E] flex items-center gap-1.5 flex-wrap">
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
                                    {day.isHolidayEve && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-[#FAF6ED] text-[#8C6D3B] border border-[#E5DAC1]">
                                        ★연휴전야
                                      </span>
                                    )}
                                    {day.isHolidayClosingNight && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-[#F4F3EE] text-[#5A6B63] border border-[#D0C6BB]">
                                        연휴마감
                                      </span>
                                    )}
                                    {day.competitorBenchmark?.uiBadge && (() => {
                                      const b = day.competitorBenchmark.uiBadge;
                                      const bStyle = getCompetitorBadgeStyle(b.badgeColorTone);
                                      return (
                                        <span
                                          title={b.tooltipText}
                                          className={`px-1.5 py-0.5 rounded text-[10px] font-black border flex items-center gap-1 ${bStyle.bg} ${bStyle.text} ${bStyle.border}`}
                                        >
                                          <span className={`w-1.5 h-1.5 rounded-full ${bStyle.dot}`} />
                                          <span>{b.badgeLabel}</span>
                                        </span>
                                      );
                                    })()}
                                  </div>
                                  <div className="text-[11px] text-[#5A6B63] mt-0.5">
                                    {day.dayTypeLabel} · 매칭 (25년 {day.yoyMatchDate || '-'} / 24년 {day.yoy2024MatchDate || '-'})
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
                                25년 실측 {formatWon(day.pricing?.yoy2025RetailAdr)} | 가드레일 {formatWon(day.pricing?.floorAdr)} ~ {formatWon(day.pricing?.ceilingAdr)}
                              </div>
                              {day.dualTrack?.trackDelta?.recommendedAdrDeltaKrw != null && day.dualTrack.trackDelta.recommendedAdrDeltaKrw !== 0 && (
                                <div className="flex items-center justify-end gap-1 mt-0.5">
                                  <span
                                    title={day.dualTrack.trackBReason || day.dualTrack.trackB_marketAdaptive?.externalSpreadFactors?.trackBReason || '외부시장 탄력(Track B) 보정'}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-black bg-[#FAF6ED] text-[#8C6D3B] border border-[#E5DAC1]"
                                  >
                                    Track B 보정 {formatSignedWon(day.dualTrack.trackDelta.recommendedAdrDeltaKrw)}
                                  </span>
                                </div>
                              )}
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
                                {formatNum(day.inventory?.otbOccupiedKeys)}/{formatNum(day.inventory?.physicalKeyCapacity)}키 (잔여 <strong className="text-[#284F42]">{formatNum(day.inventory?.remainingKeys)}키</strong>)
                              </div>
                              <div className="text-[10px] text-[#5A6B63]">
                                2개년 동요일 {formatPct(day.inventory?.yoyFinalOccupancyPct)}
                                {(day.inventory?.yoy2025FinalOccupancyPct != null || day.inventory?.yoy2024FinalOccupancyPct != null) && (
                                  <span className="ml-1 text-[10px]">
                                    (25년 {formatPct(day.inventory?.yoy2025FinalOccupancyPct)} · 24년 {formatPct(day.inventory?.yoy2024FinalOccupancyPct)})
                                  </span>
                                )}
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
                                          <th className="py-2.5 px-4 text-right">2025 실측 ADR (참고)</th>
                                          <th className="py-2.5 px-4 text-right">2026 실측 ADR (앵커)</th>
                                          <th className="py-2.5 px-4 text-right">기준가 (2026 출발선)</th>
                                          <th className="py-2.5 px-4 text-right bg-[#E8F2EE]/40 text-[#1B382E]">추천 ADR (조정률)</th>
                                          <th className="py-2.5 px-4 text-right">하한 ~ 상한 가드레일</th>
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

                                  {/* 당일 충청권 4대 경쟁사 실시간 비교 레이더 & 평형별 가격 쿠션 (Spillover Radar) */}
                                  {renderCompetitorDrawer(day)}
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
                    16평·35평·51평·펫룸 각각의 물리 모수, 향후 30일 예약수, 2025 vs 2026 실측 Retail ADR, 2026 요일별 기준가(평일·금·토·일) 및 가드레일 범위를 확인합니다.
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
                              <div className="text-[10px] font-bold text-[#5A6B63]">2025 실측 ADR (참고)</div>
                              <div className="text-xs sm:text-sm font-extrabold text-[#1B382E] mt-0.5">
                                {formatWon(bm.adr2025Retail)}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-[#5A6B63]">2026 실측 ADR (앵커)</div>
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
                            2026 요일별 기준가 (100% 실측 앵커 Baseline):
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

            {/* ====================================================================
                5. [아코디언 E] 다이나믹 프라이싱 매출 극대화 원리 및 산출 기간 안내
               ==================================================================== */}
            <div className="bg-white rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] overflow-hidden">
              <button
                type="button"
                onClick={() => setShowLogicExplanationAccordion(!showLogicExplanationAccordion)}
                className="w-full p-6 bg-white hover:bg-[#FAF9F6] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <BookOpen size={19} className="text-[#1B3B2B]" />
                    <h2 className="text-lg font-extrabold text-[#1B382E]">
                      다이나믹 프라이싱 V2 엔진 — 2026년 100% 가격 앵커링 & 2개년 비가격 앙상블 매출 극대화 원리
                    </h2>
                    <span className="text-xs font-bold text-[#1E523F] bg-[#E8F2EE] px-2.5 py-0.5 rounded-full border border-[#B4C6C1]">
                      V2 상세 해설 아코디언
                    </span>
                  </div>
                  <p className="text-xs text-[#5A6B63] mt-1 font-medium">
                    과거 가격 물타기(Price Dilution)를 전면 차단하고 2026년 인상 단가를 100% 수호하며, 2024·2025 2개년 62,233건 비가격 앙상블로 매출을 극대화하는 산출 공식을 확인합니다.
                  </p>
                </div>

                <div className="px-4 py-2 rounded-xl bg-[#F4F3EE] border border-[#D0C6BB] text-xs font-extrabold text-[#1B382E] flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                  <span>{showLogicExplanationAccordion ? 'V2 해설 접기' : 'V2 해설 펼치기'}</span>
                  {showLogicExplanationAccordion ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </div>
              </button>

              {showLogicExplanationAccordion && (
                <div className="p-6 lg:p-7 pt-3 border-t border-[#D0C6BB]/60 bg-[#FAF9F6] space-y-6">
                  {/* 0. 투트랙(Two-Track: Standard vs Market-Adaptive) 엔진 아키텍처 & 외부 시장 탄력 연동 3대 원리 */}
                  <div className="bg-white p-5 rounded-2xl border-2 border-[#8C6D3B]/80 shadow-2xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D0C6BB]/60 pb-3">
                      <div className="flex items-center gap-2 text-sm font-black text-[#8C6D3B]">
                        <Compass size={17} />
                        <span>0. 투트랙(Two-Track: Standard vs Market-Adaptive) 엔진 아키텍처 & 외부 시장 탄력 연동 3대 원리</span>
                      </div>
                      <span className="text-[11px] font-extrabold text-[#8C6D3B] bg-[#FAF6ED] px-3 py-1 rounded-xl border border-[#E5DAC1]">
                        상단 원클릭 전환 지원 (Track A ↔ Track B)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {/* Track A 카드 */}
                      <div className="bg-[#FAF9F6] p-4 rounded-xl border border-[#D0C6BB]/70 space-y-2">
                        <div className="flex items-center justify-between">
                          <strong className="text-[#1B382E] text-xs font-black">🅰️ Track A: STANDARD (내부수요 중심 · 기본형)</strong>
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#E8F2EE] text-[#1E523F]">안정적 방어</span>
                        </div>
                        <p className="text-[#5A6B63] leading-relaxed">
                          벨포레 자체 잔여 키(175키 기준)와 일자별 잔여 리드타임(D-k) 매트릭스를 기반으로 요일별 기준가를 조정하고, 충청권 4대 경쟁사 과열 시 고정 보너스(+1.5%p ~ +3.5%p)를 가산합니다.
                        </p>
                      </div>

                      {/* Track B 카드 */}
                      <div className="bg-[#FAF6ED] p-4 rounded-xl border border-[#E5DAC1] space-y-2">
                        <div className="flex items-center justify-between">
                          <strong className="text-[#8C6D3B] text-xs font-black">🅱️ Track B: MARKET_ADAPTIVE (외부시장 탄력 고도화)</strong>
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#8C6D3B] text-white">초과이익 극대화</span>
                        </div>
                        <p className="text-[#5A6B63] leading-relaxed">
                          매일 밤 23:30 KST 수집되는 4대 경쟁사 실시간 오퍼 및 S3 영구 SQLite 다년도 시계열 DB와 연동하여, 주중·주말 가격 스프레드(낙폭)와 성수기 과열 강도를 연속 함수로 반영합니다.
                        </p>
                      </div>
                    </div>

                    {/* OTB 격리 보호 대원칙 배너 */}
                    <div className="bg-[#E8F2EE] p-3.5 rounded-xl border border-[#B4C6C1] text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-black text-[#1E523F]">
                        <ShieldCheck size={14} />
                        <span>불변의 대원칙: 기확정 생존 OTB 매출 격리 보호 (고정 상수, Δ = 0원)</span>
                      </div>
                      <p className="text-[#284F42] leading-relaxed">
                        어떤 트랙을 선택하든 이미 예약 완료된 <strong>기확정 생존 OTB 매출({formatWon(pricingRec?.lockedOtbRevenueTotal)})</strong>은 1원도 변하지 않는 고정 상수입니다. 다이나믹 프라이싱은 오늘 이후 새로 들어올 <strong>신규 픽업 예상 물량({formatNum(pricingRec?.counterfactualEvaluation?.totalDynamicNewPickupUnits ?? pricingRec?.expectedAdditionalKeys)}키)</strong>에만 철저히 적용되어 확정 매출을 보호합니다.
                      </p>
                    </div>

                    {/* Track B 3대 고도화 알고리즘 */}
                    <div className="space-y-2 pt-1">
                      <div className="text-xs font-extrabold text-[#1B382E]">
                        📐 Track B 외부 시장 연동 3대 핵심 알고리즘:
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                        <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#D0C6BB]/60 space-y-1">
                          <span className="font-extrabold text-[#1B382E] block">① 경쟁사 성수기 과열 강도 연동</span>
                          <p className="text-[#5A6B63] leading-relaxed">
                            경쟁사 과열 강도 지수(0.0~1.0)에 비례하여 단풍·피크 주말에 최대 +3.0%p ~ +5.0%p 추가 상향(Yield-Up)하여 조기 매진 기회손실을 회수합니다.
                          </p>
                        </div>
                        <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#D0C6BB]/60 space-y-1">
                          <span className="font-extrabold text-[#1B382E] block">② 주중·일요 숄더 외부 강세 감지</span>
                          <p className="text-[#5A6B63] leading-relaxed">
                            경쟁사 주중 품절률 40% 이상 또는 잔여율 30% 미만 시 외부 관광객 낙수수요를 선제 포착하여 주중/일요 요금을 +2.0%p 선제 방어합니다.
                          </p>
                        </div>
                        <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#D0C6BB]/60 space-y-1">
                          <span className="font-extrabold text-[#1B382E] block">③ 임박 주중 덤핑 방어 & 번들 승부</span>
                          <p className="text-[#5A6B63] leading-relaxed">
                            경쟁사가 평일 요금을 50% 이상 폭락 덤핑할 때, 벨포레는 가격 출혈경쟁 대신 2026년 기준가를 지키고 레저 2인 특전 번들로 승부합니다.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 1. 예측 및 적용 기간 안내 */}
                  <div className="bg-white p-5 rounded-2xl border border-[#D0C6BB]/75 shadow-2xs space-y-3">
                    <div className="flex items-center gap-2 text-sm font-extrabold text-[#1B382E]">
                      <Calendar size={16} className="text-[#1B3B2B]" />
                      <span>1. 예측 및 적용 기간 & 분석 모수</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#D0C6BB]/60 space-y-1">
                        <span className="font-extrabold text-[#1B382E] block">📅 기본 적용 구간</span>
                        <p className="text-[#5A6B63] leading-relaxed">
                          기준일로부터 <strong>향후 {formatNum(meta?.totalDays)}일간</strong> ({meta?.startDate} ~ {meta?.endDate})의 일별 최적 판매가를 산출합니다. (상단 필터로 14일 / 30일 / 60일 조절 가능)
                        </p>
                      </div>
                      <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#D0C6BB]/60 space-y-1">
                        <span className="font-extrabold text-[#1B382E] block">🏨 분석 대상 객실 모수</span>
                        <p className="text-[#5A6B63] leading-relaxed">
                          일일 물리 가용 <strong>{formatNum(meta?.physicalKeysCapacity)}키</strong> (월 고정 모수 {formatNum(meta?.fixedMonthlyCapacity)}실 / 기준 점유율 {meta?.fixedOccupancyBenchmarkPct != null ? `${meta.fixedOccupancyBenchmarkPct}%` : '-'} SSOT) 기준 총 <strong>{formatNum(currentOtb?.totalCapacityKeys)}키-일</strong>입니다.
                        </p>
                      </div>
                      <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#D0C6BB]/60 space-y-1">
                        <span className="font-extrabold text-[#1B382E] block">📊 V2 가격 & 비가격 앙상블 소스</span>
                        <p className="text-[#5A6B63] leading-relaxed">
                          가격은 <strong>2026년 최근 30일 실측 Retail ADR({formatWon(recent2026?.retailAdr)})을 100% 앵커</strong>로 삼고, 수요 패턴은 <strong>2024년·2025년 2개년 62,233건 실측 데이터</strong>를 앙상블 결합합니다.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 2. 핵심 질의 응답: 왜 2025년 과거 가격과 평균을 내지 않는가? */}
                  <div className="bg-white p-5 rounded-2xl border-2 border-[#1B3B2B] shadow-2xs space-y-3">
                    <div className="flex items-center gap-2 text-sm font-extrabold text-[#1B3B2B]">
                      <Sparkles size={16} className="text-[#B59269]" />
                      <span>2. 핵심 설계 원칙: "왜 2025년 과거 단가와 평균을 내지 않는가? (Price Dilution 방지)"</span>
                    </div>
                    <div className="space-y-2 text-xs text-[#5A6B63] leading-relaxed">
                      <p>
                        2026년 리조트는 시설 리뉴얼 및 브랜드 포지셔닝에 맞춰 <strong>의도적으로 객단가를 전년 대비 {formatPct(recent2026?.yoyRetailAdrGrowthPct)} 인상({formatWon(recent2026?.retailAdr)})</strong>하여 시장에 성공적으로 안착시켰습니다.
                      </p>
                      <p className="text-[#1B382E] font-bold bg-[#FAF9F6] p-3 rounded-xl border border-[#D0C6BB]/70">
                        과거의 낮은 2025년 단가({formatWon(hist2025?.retailAdr)})와 원화 금액끼리 단순 평균을 내버리면, <strong>경영진이 의도적으로 올려놓은 객단가가 과거 가격으로 깎여 내려가는 치명적 희석(Price Dilution)</strong>이 발생합니다.
                      </p>
                      <p>
                        따라서 V2 엔진은 <strong>2025년의 원화 금액을 완전히 배제</strong>하고, 모든 평형과 요일군의 출발 기준가(Baseline)를 <strong>100% 2026년 실측 Retail 체결 단가</strong>로 고정했습니다. 다이나믹 프라이싱은 2026년 인상 단가를 최저 방어선으로 삼고, 수요 집중 시 <strong>그 위로 추가 상향(Yield-Up)</strong>하여 초과 이익을 창출합니다.
                      </p>
                    </div>
                  </div>

                  {/* 3. 2024·2025 2개년 비가격 5대 심층 시그널 */}
                  <div className="bg-white p-5 rounded-2xl border border-[#D0C6BB]/75 shadow-2xs space-y-3">
                    <div className="flex items-center gap-2 text-sm font-extrabold text-[#1B382E]">
                      <Layers size={16} className="text-[#284F42]" />
                      <span>3. 과거 2개년(2024·2025) 비가격 5대 구조 시그널 결합 원리</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                      <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#D0C6BB]/60 space-y-1">
                        <strong className="text-[#1B382E] block">① 2개년 동요일 점유율 앙상블</strong>
                        <p className="text-[#5A6B63] leading-relaxed">
                          52주 전(2025 D-364)과 104주 전(2024 D-728) 2개년 동요일 실측 점유율을 결합하여, 특정 연도의 우천이나 추석 이동 노이즈를 제거하고 구조적 만실 요일을 선제 판별합니다.
                        </p>
                      </div>
                      <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#D0C6BB]/60 space-y-1">
                        <strong className="text-[#1B382E] block">② 2개년 동일 리드타임(D-k) 속도</strong>
                        <p className="text-[#5A6B63] leading-relaxed">
                          과거 2개년 동일 시점의 OTB 키 수와 체크인까지 추가 유입된 잔여 픽업량을 추적하여 최종 예상 가동률의 신뢰도를 대폭 높였습니다.
                        </p>
                      </div>
                      <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#D0C6BB]/60 space-y-1">
                        <strong className="text-[#1B382E] block">③ 무차원 계절성 탄력 지수 S</strong>
                        <p className="text-[#5A6B63] leading-relaxed">
                          원화 가격을 배제하고, 연평균 대비 해당 월·요일군의 상대 비율만 무차원 계수로 추출하여 10월 단풍철에서 11월 중순 비수기 전환 곡선을 정밀 반영합니다.
                        </p>
                      </div>
                      <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#D0C6BB]/60 space-y-1">
                        <strong className="text-[#1B382E] block">④ 3개년 62,233건 고유 취소율</strong>
                        <p className="text-[#5A6B63] leading-relaxed">
                          요일군별 3개년 누적 취소 위험률을 산출하여, 현재 취소율이 이를 초과할 경우 허수 예약(Phantom OTB)을 사전에 차감하고 공실 위험을 방어합니다.
                        </p>
                      </div>
                      <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#D0C6BB]/60 space-y-1">
                        <strong className="text-[#1B382E] block">⑤ 3개년 연박(LOS) 구조적 성장</strong>
                        <p className="text-[#5A6B63] leading-relaxed">
                          2024년 ➔ 2025년 ➔ 2026년으로 이어지는 연박 비중 증가 추세를 반영하여, 연박 비중이 높은 날은 회전율 비용 절감 및 단가 방어 가중치를 부여합니다.
                        </p>
                      </div>
                      <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#D0C6BB]/60 space-y-1">
                        <strong className="text-[#1B382E] block">⑥ 숙박업 전용 Stay-Night 규칙</strong>
                        <p className="text-[#5A6B63] leading-relaxed">
                          익일 공휴일인 전야(Holiday Eve)는 토요일 최성수 요금으로 자동 승격하고, 익일 출근일인 연휴 마감일 밤은 일요 요금제로 자동 분리합니다.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 4. 4대 전략 실행 로직 */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-extrabold text-[#1B382E]">
                      <Zap size={16} className="text-[#B59269]" />
                      <span>4. 다이나믹 프라이싱으로 매출이 늘어나는 4대 핵심 로직</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {/* 로직 1: 단가 상향 */}
                      <div className="bg-white p-5 rounded-2xl border border-[#B4C6C1] shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]">
                            <TrendingUp size={13} /> ① 단가 상향 (YIELD_UP) — "수요 몰릴 때 제값 이상 받기"
                          </span>
                          <span className="font-extrabold text-[#1E523F] bg-[#E8F2EE] px-2 py-0.5 rounded-lg">
                            {formatNum(pricingRec?.yieldUpDays)}일간 적용
                          </span>
                        </div>
                        <p className="text-[#5A6B63] leading-relaxed">
                          <strong>[원리]</strong> 주말·단풍시즌·대기예약 발생일·골프 부킹 집중일처럼 예약 속도가 빠른 날은 저가 OTA 특가를 마감하고 2026년 기준가 대비 <strong>상한 방어선 범위 내에서 단가를 상향</strong>합니다.
                        </p>
                        <p className="text-[#1E523F] font-bold leading-relaxed">
                          👉 조기 매진으로 놓치던 객단가(ADR Lift)를 끌어올려 같은 수의 방을 팔아도 더 큰 매출을 거둡니다.
                        </p>
                      </div>

                      {/* 로직 2: 번들 특전 */}
                      <div className="bg-white p-5 rounded-2xl border border-[#E5DAC1] shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#FAF6ED] text-[#8C6D3B] border border-[#E5DAC1]">
                            <Package size={13} /> ② 번들 특전 (BUNDLE_PROMO) — "평일 방값 지키고 부가매출 결합"
                          </span>
                          <span className="font-extrabold text-[#8C6D3B] bg-[#FAF6ED] px-2 py-0.5 rounded-lg">
                            {formatNum(pricingRec?.bundlePromoDays)}일간 적용
                          </span>
                        </div>
                        <p className="text-[#5A6B63] leading-relaxed">
                          <strong>[원리]</strong> D-11 이전 비수기 평일에는 방값을 덤핑 할인하면 브랜드 가치가 훼손되므로, 방값은 2026년 기준가로 방어하되 마운틴카트·미디어아트센터 등 <strong>리조트 레저 티켓을 결합한 특전 패키지</strong>로 모객합니다.
                        </p>
                        <p className="text-[#8C6D3B] font-bold leading-relaxed">
                          👉 객실 ADR을 무너뜨리지 않으면서 평일 공실을 채우고, 식음·레저 등 1인당 총 소비액(RevPAG)을 늘립니다.
                        </p>
                      </div>

                      {/* 로직 3: 타임세일 */}
                      <div className="bg-white p-5 rounded-2xl border border-[#EAC5BD] shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#FDF0ED] text-[#8B2635] border border-[#EAC5BD]">
                            <Flame size={13} /> ③ 타임세일 (FLASH_SALE) — "공실 위기 방을 현금으로 전환"
                          </span>
                          <span className="font-extrabold text-[#8B2635] bg-[#FDF0ED] px-2 py-0.5 rounded-lg">
                            {formatNum(pricingRec?.flashSaleDays)}일간 적용
                          </span>
                        </div>
                        <p className="text-[#5A6B63] leading-relaxed">
                          <strong>[원리]</strong> D-10 이내인데 잔여 객실이 많거나 취소율이 급증한 위기일에는, 원가 이하 판매를 막는 <strong>하한 방어선(Floor ADR)</strong> 범위 내에서 자사몰 CRM 회원 대상 긴급 타임세일을 단행합니다.
                        </p>
                        <p className="text-[#8B2635] font-bold leading-relaxed">
                          👉 그대로 두면 '매출 0원'으로 버려질 공실 손실을 유의미한 추가 현금 매출로 전환하여 한계수익을 회수합니다.
                        </p>
                      </div>

                      {/* 로직 4: 기준 유지 & 골프/연박 시너지 */}
                      <div className="bg-white p-5 rounded-2xl border border-[#D0C6BB] shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#F4F3EE] text-[#284F42] border border-[#D0C6BB]">
                            <ShieldCheck size={13} /> ④ 기준유지 & 골프·연박 교차 시너지
                          </span>
                          <span className="font-extrabold text-[#284F42] bg-[#F4F3EE] px-2 py-0.5 rounded-lg">
                            {formatNum(pricingRec?.holdDays)}일간 적용
                          </span>
                        </div>
                        <p className="text-[#5A6B63] leading-relaxed">
                          <strong>[원리]</strong> 안정적 페이스의 날은 2026년 기준 요금을 수호하며, 향후 30일 골프 부킹 <strong>{formatNum(currentOtb?.totalGolfBookedTeams)}팀</strong>의 숙박 연계 수요와 <strong>연박 고객</strong>을 우대합니다.
                        </p>
                        <p className="text-[#284F42] font-bold leading-relaxed">
                          👉 객실 회전율(청소비·운영비)을 절감하고 고단가 35·51평 스위트룸 판매를 촉진합니다.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 5. 30일 시뮬레이션 실제 기대 효과 비교 표 */}
                  <div className="bg-white p-5 rounded-2xl border border-[#D0C6BB]/75 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-extrabold text-[#1B382E]">
                        <TrendingUp size={16} className="text-[#1E523F]" />
                        <span>5. 향후 30일간 실제 기대 효과 비교 (단일 진실 공급원 SSOT)</span>
                      </div>
                      <span className="text-[11px] font-bold text-[#5A6B63]">
                        {meta?.startDate} ~ {meta?.endDate} ({formatNum(meta?.totalDays)}일간)
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs whitespace-nowrap min-w-[640px]">
                        <thead>
                          <tr className="bg-[#F4F3EE] text-[#5A6B63] font-extrabold border-b border-[#D0C6BB]/70">
                            <th className="py-2.5 px-4">지표 구분</th>
                            <th className="py-2.5 px-4 text-right">기준가 고정 판매 시</th>
                            <th className="py-2.5 px-4 text-right bg-[#E8F2EE]/40 text-[#1B382E]">다이나믹 프라이싱 적용 시</th>
                            <th className="py-2.5 px-4 text-right text-[#1E523F]">증대 효과 (Δ)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#D0C6BB]/40">
                          <tr>
                            <td className="py-2.5 px-4 font-extrabold text-[#1B382E]">30일 평균 추천 ADR (객단가)</td>
                            <td className="py-2.5 px-4 text-right text-[#5A6B63]">{formatWon(pricingRec?.avgBaselineAdr)}</td>
                            <td className="py-2.5 px-4 text-right font-black text-[#1B3B2B] bg-[#E8F2EE]/20">{formatWon(pricingRec?.avgRecommendedAdr)}</td>
                            <td className="py-2.5 px-4 text-right font-extrabold text-[#1E523F]">{formatSignedPct(pricingRec?.avgAdrLiftPct)} Lift</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-4 font-extrabold text-[#1B382E]">30일 총 예상 매출</td>
                            <td className="py-2.5 px-4 text-right text-[#5A6B63]">{formatWon(pricingRec?.baselineProjectedRevenue)}</td>
                            <td className="py-2.5 px-4 text-right font-black text-[#1B3B2B] bg-[#E8F2EE]/20">{formatWon(pricingRec?.dynamicProjectedRevenue)}</td>
                            <td className="py-2.5 px-4 text-right font-black text-[#1E523F]">
                              {formatSignedWon(pricingRec?.expectedRevenueGain)} ({formatSignedPct(pricingRec?.expectedRevenueGainPct)})
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-4 font-extrabold text-[#1B382E]">30일간 전략 실행 분포</td>
                            <td className="py-2.5 px-4 text-right text-[#5A6B63]">고정 30일 동일 요금</td>
                            <td className="py-2.5 px-4 text-right font-bold text-[#1B382E] bg-[#E8F2EE]/20">
                              상향 {formatNum(pricingRec?.yieldUpDays)}일 · 유지 {formatNum(pricingRec?.holdDays)}일 · 특전 {formatNum(pricingRec?.bundlePromoDays)}일 · 세일 {formatNum(pricingRec?.flashSaleDays)}일
                            </td>
                            <td className="py-2.5 px-4 text-right font-extrabold text-[#284F42]">일자별 맞춤 가격 수호</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ====================================================================
                6. [아코디언 F] 충청권 4대 경쟁사 다년도 시계열 레이더 (S3 SQLite 영구 DB 연동)
               ==================================================================== */}
            <div className="bg-white rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] overflow-hidden">
              <button
                type="button"
                onClick={() => setShowCompetitorTimeseriesAccordion(!showCompetitorTimeseriesAccordion)}
                className="w-full p-6 bg-white hover:bg-[#FAF9F6] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <BarChart3 size={19} className="text-[#1B3B2B]" />
                    <h2 className="text-lg font-extrabold text-[#1B382E]">
                      충청권 4대 경쟁사 다년도 시계열 레이더 (AWS S3 영구 SQLite DB 연동)
                    </h2>
                    <span className="text-xs font-bold text-[#1E523F] bg-[#E8F2EE] px-2.5 py-0.5 rounded-full border border-[#B4C6C1]">
                      시계열 분석 아코디언
                    </span>
                  </div>
                  <p className="text-xs text-[#5A6B63] mt-1 font-medium">
                    소노벨 단양 · 롯데리조트 부여 · 레스트리 리솜 · 포레스트 리솜의 연도·월별·요일군별 품절률 및 가격 시계열 트렌드 ({formatNum(yearlyMonthlySummary.length)}개 집계 구간)
                  </p>
                </div>

                <div className="px-4 py-2 rounded-xl bg-[#F4F3EE] border border-[#D0C6BB] text-xs font-extrabold text-[#1B382E] flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                  <span>{showCompetitorTimeseriesAccordion ? '시계열 레이더 접기' : '시계열 레이더 펼치기'}</span>
                  {showCompetitorTimeseriesAccordion ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </div>
              </button>

              {showCompetitorTimeseriesAccordion && (
                <div className="p-6 lg:p-7 pt-3 border-t border-[#D0C6BB]/60 bg-[#FAF9F6] space-y-5">
                  {/* 영구 DB 파이프라인 메타데이터 카드 */}
                  {competitorMarket?.dbMetadata && (
                    <div className="bg-white p-5 rounded-2xl border border-[#D0C6BB]/80 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 text-sm font-extrabold text-[#1B382E]">
                          <Database size={16} className="text-[#284F42]" />
                          <span>AWS S3 영구 다년도 시계열 데이터베이스 메타데이터 (Zero DB Load)</span>
                        </div>
                        <span className="text-xs font-bold text-[#1E523F] bg-[#E8F2EE] px-3 py-1 rounded-xl border border-[#B4C6C1]">
                          RDS 접속 부하: {formatNum(competitorMarket.dbMetadata.mariaDbContactCount)}회 (0-Load)
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#D0C6BB]/60">
                          <span className="text-[#5A6B63] block font-medium">영구 DB 엔진</span>
                          <strong className="text-[#1B382E] block mt-0.5 truncate">{competitorMarket.dbMetadata.dbEngine || '-'}</strong>
                        </div>
                        <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#D0C6BB]/60">
                          <span className="text-[#5A6B63] block font-medium">데이터 보존 정책</span>
                          <strong className="text-[#1B382E] block mt-0.5 truncate">{competitorMarket.dbMetadata.retentionPolicy || '-'}</strong>
                        </div>
                        <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#D0C6BB]/60">
                          <span className="text-[#5A6B63] block font-medium">누적 마트 행 / 스냅샷</span>
                          <strong className="text-[#1B382E] block mt-0.5">
                            {formatNum(competitorMarket.dbMetadata.totalDailyMartRows)}행 ({formatNum(competitorMarket.dbMetadata.totalSnapshotsStored)}회)
                          </strong>
                        </div>
                        <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#D0C6BB]/60">
                          <span className="text-[#5A6B63] block font-medium">총 원천 오퍼 저장 건수</span>
                          <strong className="text-[#284F42] block mt-0.5">
                            {formatNum(competitorMarket.dbMetadata.totalRawOffersStored)}건
                          </strong>
                        </div>
                      </div>
                      {competitorMarket.dbMetadata.s3Uri && (
                        <div className="text-[11px] text-[#5A6B63] font-mono bg-[#FAF9F6] px-3 py-1.5 rounded-lg border border-[#D0C6BB]/50 truncate">
                          S3 Storage: {competitorMarket.dbMetadata.s3Uri}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 경쟁 리조트 4대 필터 탭 */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-extrabold text-[#1B382E] mr-1">리조트 선택 필터:</span>
                    {['ALL', '소노벨 단양', '롯데리조트 부여', '레스트리 리솜', '포레스트 리솜'].map((resortName) => (
                      <button
                        key={resortName}
                        type="button"
                        onClick={() => setSelectedCompetitorResortFilter(resortName)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                          selectedCompetitorResortFilter === resortName
                            ? 'bg-[#1B382E] text-white border-[#1B382E] shadow-2xs'
                            : 'bg-white text-[#5A6B63] border-[#D0C6BB]/80 hover:bg-[#F4F3EE]'
                        }`}
                      >
                        {resortName === 'ALL' ? '전체 (4대 리조트)' : resortName}
                      </button>
                    ))}
                  </div>

                  {/* 시계열 요약 테이블 */}
                  <div className="bg-white rounded-2xl border border-[#D0C6BB]/75 overflow-x-auto shadow-2xs">
                    <table className="w-full text-left border-collapse whitespace-nowrap text-xs min-w-[760px]">
                      <thead>
                        <tr className="bg-[#F4F3EE] text-[#5A6B63] font-extrabold border-b border-[#D0C6BB]/75">
                          <th className="py-2.5 px-4">대상 연월</th>
                          <th className="py-2.5 px-4">리조트명</th>
                          <th className="py-2.5 px-4 text-center">요일군</th>
                          <th className="py-2.5 px-4 text-right">관측 표본</th>
                          <th className="py-2.5 px-4 text-right">품절률</th>
                          <th className="py-2.5 px-4 text-right">평균 최저가</th>
                          <th className="py-2.5 px-4 text-right">중위가 (Median)</th>
                          <th className="py-2.5 px-4 text-right">중형 (16~35평)</th>
                          <th className="py-2.5 px-4 text-right">대형 (51평)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#D0C6BB]/40">
                        {filteredYearlySummary.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-8 text-center text-[#5A6B63] font-medium">
                              선택한 조건의 시계열 집계 데이터가 없습니다.
                            </td>
                          </tr>
                        ) : (
                          filteredYearlySummary.map((row, rIdx) => (
                            <tr key={`${row.stayYearMonth}-${row.resortName}-${row.dayType}-${rIdx}`} className="hover:bg-[#FAF9F6]">
                              <td className="py-2.5 px-4 font-black text-[#1B382E]">{row.stayYearMonth}</td>
                              <td className="py-2.5 px-4 font-bold text-[#1B382E]">{row.resortName}</td>
                              <td className="py-2.5 px-4 text-center">
                                <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold ${
                                  row.dayType === 'SAT_PEAK' || row.dayType === 'SAT_HOLIDAY'
                                    ? 'bg-[#FAF6ED] text-[#8C6D3B]'
                                    : row.dayType === 'FRIDAY'
                                    ? 'bg-[#F4F3EE] text-[#1B382E]'
                                    : row.dayType === 'SUNDAY'
                                    ? 'bg-[#F4F3EE] text-[#5A6B63]'
                                    : 'bg-[#E8F2EE] text-[#1E523F]'
                                }`}>
                                  {row.dayType}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-right text-[#5A6B63]">{formatNum(row.observations)}건</td>
                              <td className="py-2.5 px-4 text-right">
                                <span className={`font-black ${row.soldOutRatePct >= 50 ? 'text-[#8B2635]' : 'text-[#1E523F]'}`}>
                                  {formatPct(row.soldOutRatePct)}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-right font-bold text-[#1B382E] font-financial">
                                {formatWon(row.avgMinPrice)}
                              </td>
                              <td className="py-2.5 px-4 text-right text-[#5A6B63] font-financial">
                                {formatWon(row.avgMedianPrice)}
                              </td>
                              <td className="py-2.5 px-4 text-right text-[#5A6B63] font-financial">
                                {formatWon(row.avgTier16_35Price)}
                              </td>
                              <td className="py-2.5 px-4 text-right text-[#5A6B63] font-financial">
                                {formatWon(row.avgTier51Price)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
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
