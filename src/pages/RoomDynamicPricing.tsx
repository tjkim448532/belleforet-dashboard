import React, { useState, useEffect } from 'react';
import {
  Hotel, Calendar, TrendingUp, Sparkles, RefreshCw,
  ShieldCheck, Layers,
  Tag, Zap, Flame, AlertCircle, HelpCircle, BookOpen,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Compass, Package, Database,
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
  const [showBenchmarkAccordion, setShowBenchmarkAccordion] = useState<boolean>(false);
  const [showLogicExplanationAccordion, setShowLogicExplanationAccordion] = useState<boolean>(false);
  const [showCompetitorTimeseriesAccordion, setShowCompetitorTimeseriesAccordion] = useState<boolean>(false);
  const [selectedCompetitorResortFilter, setSelectedCompetitorResortFilter] = useState<string>('ALL');
  const [showTrackComparisonAccordion, setShowTrackComparisonAccordion] = useState<boolean>(false);
  const [showSelectedDayDetailAccordion, setShowSelectedDayDetailAccordion] = useState<boolean>(false);
  const [expandedMatrixDateStr, setExpandedMatrixDateStr] = useState<string | null>(null);
  const [matrixCategoryTab, setMatrixCategoryTab] = useState<'ALL' | 'STANDARD_3' | 'PET_3'>('ALL');
  const [showKpiSpilloverAccordion, setShowKpiSpilloverAccordion] = useState<boolean>(false);

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

          {/* 슬림 투트랙 모드 전환 바 & 핵심 성과 한 줄 요약 */}
          <div className="mt-4 pt-4 border-t border-[#D0C6BB]/60 space-y-3">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-[#FAF9F5] p-3.5 rounded-2xl border border-[#D0C6BB]/80">
              {/* 좌측: 원클릭 투트랙 스위치 */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black text-[#1B382E] flex items-center gap-1.5 mr-1">
                  <Zap size={14} className="text-[#8C6D3B]" />
                  <span>가격 산출 모드:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedTrack('STANDARD')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border ${
                    selectedTrack === 'STANDARD'
                      ? 'bg-[#1B3B2B] text-white border-[#1B3B2B] shadow-xs'
                      : 'bg-white text-[#5A6B63] border-[#D0C6BB] hover:text-[#1B382E]'
                  }`}
                >
                  <span>🅰️ 표준 모드 (내부수요 중심)</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-financial ${
                    selectedTrack === 'STANDARD' ? 'bg-white/20 text-white' : 'bg-[#F4F3EE] text-[#1E523F]'
                  }`}>
                    {formatSignedWon(trackA?.expectedRevenueGain)}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTrack('MARKET_ADAPTIVE')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border ${
                    selectedTrack === 'MARKET_ADAPTIVE'
                      ? 'bg-[#8C6D3B] text-white border-[#8C6D3B] shadow-xs'
                      : 'bg-white text-[#8C6D3B] border-[#E5DAC1] hover:bg-[#FAF6ED]'
                  }`}
                >
                  <span>🅱️ 외부시장 탄력 고도화 (추천)</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-financial ${
                    selectedTrack === 'MARKET_ADAPTIVE' ? 'bg-white/20 text-white' : 'bg-[#FAF6ED] text-[#8C6D3B]'
                  }`}>
                    {formatSignedWon(trackB?.expectedRevenueGain)}
                  </span>
                </button>
              </div>

              {/* 우측: 핵심 요약 배지 & 도움말 버튼 */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-3 py-1.5 rounded-xl bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1] font-extrabold font-financial">
                  30일 예상 추가매출: {formatSignedWon(pricingRec?.expectedRevenueGain)} ({formatSignedPct(pricingRec?.expectedRevenueGainPct)})
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-white text-[#284F42] border border-[#D0C6BB] font-bold font-financial">
                  기확정 OTB 고정: {formatWon(trackA?.lockedOtbRevenueTotal || pricingRec?.lockedOtbRevenueTotal)}
                </span>
                <button
                  type="button"
                  onClick={() => setShowTrackComparisonAccordion(!showTrackComparisonAccordion)}
                  className="px-3 py-1.5 rounded-xl bg-[#FAF6ED] text-[#8C6D3B] border border-[#E5DAC1] font-extrabold flex items-center gap-1 cursor-pointer hover:bg-[#F3EBD8]"
                >
                  <span>투트랙 비교</span>
                  {showTrackComparisonAccordion ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
                <button
                  type="button"
                  onClick={() => setShowGuideAccordion(!showGuideAccordion)}
                  className="px-3 py-1.5 rounded-xl bg-white text-[#1B382E] border border-[#D0C6BB] font-extrabold flex items-center gap-1 cursor-pointer hover:bg-[#F4F3EE]"
                >
                  <HelpCircle size={13} />
                  <span>화면 가이드</span>
                  {showGuideAccordion ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSignalsAccordion(!showSignalsAccordion)}
                  className="px-3 py-1.5 rounded-xl bg-white text-[#5A6B63] border border-[#D0C6BB] font-bold flex items-center gap-1 cursor-pointer hover:bg-[#F4F3EE]"
                >
                  <Database size={13} />
                  <span>산출근거({formatNum(meta?.dataSignalsUsed?.length)})</span>
                  {showSignalsAccordion ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              </div>
            </div>

            {/* [접이식] 투트랙(Track A vs Track B) 상세 비교 패널 */}
            {showTrackComparisonAccordion && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                <div
                  onClick={() => setSelectedTrack('STANDARD')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    selectedTrack === 'STANDARD'
                      ? 'bg-[#F4F3EE] border-2 border-[#1B3B2B] shadow-xs'
                      : 'bg-white border-[#D0C6BB]/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs sm:text-sm font-black text-[#1B382E]">
                      🅰️ Track A: 표준 모드 (내부수요 중심 · 기본형)
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#E8F2EE] text-[#1E523F]">
                      안정 방어형
                    </span>
                  </div>
                  <p className="text-[11px] text-[#5A6B63] mb-2.5">
                    벨포레 자체 예약률(OTB) × 리드타임 매트릭스 중심 + 경쟁사 과열 시 고정 보너스(+1.5%p ~ +3.5%p)
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2 rounded-xl border border-[#D0C6BB]/50">
                      <span className="text-[10px] text-[#5A6B63] block">30일 신규 픽업 매출 순증</span>
                      <strong className="font-black text-[#1B382E] font-financial">{formatSignedWon(trackA?.expectedRevenueGain)}</strong>
                      <span className="text-[10px] font-bold text-[#1E523F] ml-1">({formatSignedPct(trackA?.expectedRevenueGainPct)})</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-[#D0C6BB]/50">
                      <span className="text-[10px] text-[#5A6B63] block">30일 순공헌이익 순증</span>
                      <strong className="font-black text-[#1E523F] font-financial">{formatSignedWon(trackA?.expectedNetContributionMarginGain)}</strong>
                      <span className="text-[10px] font-bold text-[#1E523F] ml-1">({formatSignedPct(trackA?.expectedNetContributionMarginGainPct)})</span>
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setSelectedTrack('MARKET_ADAPTIVE')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    selectedTrack === 'MARKET_ADAPTIVE'
                      ? 'bg-[#FAF6ED] border-2 border-[#8C6D3B] shadow-xs'
                      : 'bg-white border-[#D0C6BB]/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs sm:text-sm font-black text-[#8C6D3B]">
                      🅱️ Track B: 외부시장 탄력 고도화 모드 (주중·주말·성수기 낙폭 연동형)
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#8C6D3B] text-white">
                      추천 ({dualTrackSummary?.trackBAdjustedDaysCount != null ? formatNum(dualTrackSummary.trackBAdjustedDaysCount) : '-'}일 보정)
                    </span>
                  </div>
                  <p className="text-[11px] text-[#5A6B63] mb-2.5">
                    4대 경쟁사 성수기 과열 강도 + 주중 숄더 시장 강세 + 토요일 대비 평일 가격 낙폭(Spread) 연속 반영 (Track A 대비 추가 매출 {formatSignedWon(trackDelta?.pickupRevenueDiffKrw)})
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2 rounded-xl border border-[#D0C6BB]/50">
                      <span className="text-[10px] text-[#5A6B63] block">30일 신규 픽업 매출 순증</span>
                      <strong className="font-black text-[#8C6D3B] font-financial">{formatSignedWon(trackB?.expectedRevenueGain)}</strong>
                      <span className="text-[10px] font-bold text-[#8C6D3B] ml-1">({formatSignedPct(trackB?.expectedRevenueGainPct)})</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-[#D0C6BB]/50">
                      <span className="text-[10px] text-[#5A6B63] block">30일 순공헌이익 순증</span>
                      <strong className="font-black text-[#1E523F] font-financial">{formatSignedWon(trackB?.expectedNetContributionMarginGain)}</strong>
                      <span className="text-[10px] font-bold text-[#1E523F] ml-1">({formatSignedPct(trackB?.expectedNetContributionMarginGainPct)})</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
                1. [최상단 마스터 요약표] 한눈에 보는 6대 평형별 × 요일별 기준가 & 향후 30일 추천 평균 판매가
               ==================================================================== */}
            <div className="bg-white rounded-3xl border-2 border-[#1B3B2B]/85 shadow-[0_6px_24px_rgba(27,59,43,0.08)] overflow-hidden">
              <div className="p-5 sm:p-6 bg-gradient-to-r from-[#1B3B2B] via-[#284F42] to-[#1B3B2B] text-white flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-lg bg-[#B59269] text-white text-xs font-black">
                      한눈에 보는 평형별 가격 기준표
                    </span>
                    <h2 className="text-lg sm:text-xl font-black tracking-tight">
                      6대 객실 평형별 요일 기준가 & 향후 {formatNum(meta?.totalDays)}일 다이나믹 추천 평균 판매가
                    </h2>
                  </div>
                  <p className="text-xs text-white/80 mt-1 font-medium">
                    앞으로 각 평형을 <strong>평일·금요일·토요일·일요일에 얼마를 기준으로 삼고, 30일 평균 얼마에 판매해야 하는지</strong> 한눈에 요약한 표입니다. (평형 클릭 시 필터 적용)
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start lg:self-auto shrink-0">
                  {selectedRoomType !== 'ALL' && (
                    <button
                      type="button"
                      onClick={() => setSelectedRoomType('ALL')}
                      className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-extrabold cursor-pointer"
                    >
                      필터 해제 (전체 평형 보기) ✕
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowBenchmarkAccordion(!showBenchmarkAccordion)}
                    className="px-3.5 py-2 rounded-xl bg-white text-[#1B382E] hover:bg-[#F4F3EE] text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <span>{showBenchmarkAccordion ? '평형별 상세 카드 접기' : '평형별 전년비교 카드 펼치기'}</span>
                    {showBenchmarkAccordion ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {/* 6대 평형 × 요일별 판매가 마스터 테이블 */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap min-w-[980px]">
                  <thead>
                    <tr className="bg-[#F4F3EE] text-[#5A6B63] text-xs font-extrabold border-b border-[#D0C6BB]/80">
                      <th className="py-3.5 px-5">객실 평형 (물리 모수)</th>
                      <th className="py-3.5 px-4 text-right">평일 (월~목) 기준가</th>
                      <th className="py-3.5 px-4 text-right">금요일 기준가</th>
                      <th className="py-3.5 px-4 text-right bg-[#FAF6ED] text-[#8C6D3B]">★ 토요일 · 연휴 기준가</th>
                      <th className="py-3.5 px-4 text-right">일요일 기준가</th>
                      <th className="py-3.5 px-5 text-right bg-[#E8F2EE]/70 text-[#1B382E] text-sm">
                        🎯 향후 30일 추천 평균가
                      </th>
                      <th className="py-3.5 px-4 text-right">가격 허용 범위 (하한 ~ 상한)</th>
                      <th className="py-3.5 px-4 text-right">향후 30일 예약 현황</th>
                      <th className="py-3.5 px-4">추천 결합 패키지</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D0C6BB]/40 text-xs sm:text-sm">
                    {benchmarks.map((bm) => {
                      const isSelRoom = selectedRoomType === bm.roomType;
                      const isPet = bm.roomType.includes('펫');
                      return (
                        <tr
                          key={bm.roomType}
                          onClick={() => setSelectedRoomType(isSelRoom ? 'ALL' : bm.roomType)}
                          className={`transition-colors cursor-pointer ${
                            isSelRoom
                              ? 'bg-[#E8F2EE]/80 font-bold'
                              : isPet
                              ? 'bg-[#FAF9F6] hover:bg-[#F4F3EE]/70'
                              : 'bg-white hover:bg-[#F4F3EE]/70'
                          }`}
                        >
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                                isPet ? 'bg-[#8C6D3B] text-white' : 'bg-[#1B3B2B] text-white'
                              }`}>
                                {bm.roomType}
                              </span>
                              <span className="text-xs font-bold text-[#5A6B63]">
                                {formatNum(bm.physicalCapacity)}실
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-extrabold text-[#1B382E] font-financial">
                            {formatWon(bm.baselineByDayType?.weekday)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-extrabold text-[#1B382E] font-financial">
                            {formatWon(bm.baselineByDayType?.friday)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-[#8C6D3B] bg-[#FAF6ED]/50 font-financial text-sm sm:text-base">
                            {formatWon(bm.baselineByDayType?.satHoliday)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-extrabold text-[#1B382E] font-financial">
                            {formatWon(bm.baselineByDayType?.sunday)}
                          </td>
                          <td className="py-3.5 px-5 text-right bg-[#E8F2EE]/40">
                            <span className="text-base sm:text-lg font-black text-[#1B3B2B] font-financial">
                              {formatWon(bm.next30dAvgRecommendedAdr)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right text-xs font-bold font-financial">
                            <span className="text-[#8B2635]">{formatWon(bm.next30dFloorAdr)}</span>
                            <span className="mx-1 text-[#5A6B63]">~</span>
                            <span className="text-[#1E523F]">{formatWon(bm.next30dCeilingAdr)}</span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-financial">
                            <strong className="text-[#1B382E]">{formatNum(bm.next30dOtbRooms)}실</strong>
                            <span className="text-xs text-[#5A6B63] ml-1">({formatPct(bm.next30dOtbOccupancyPct)})</span>
                          </td>
                          <td className="py-3.5 px-4 text-xs font-bold text-[#284F42] truncate max-w-[220px]">
                            🎁 {bm.recommendedBundle || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* [접이식] 평형별 전년 비교 카드 그리드 */}
              {showBenchmarkAccordion && (
                <div className="p-6 border-t border-[#D0C6BB]/60 bg-[#FAF9F6]">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {benchmarks.map((bm) => {
                      const isPositive = (bm.yoyGrowthPct ?? 0) >= 0;
                      return (
                        <div
                          key={bm.roomType}
                          className="rounded-2xl p-4 bg-white border border-[#D0C6BB]/80 shadow-2xs space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="px-3 py-1 rounded-xl bg-[#1B3B2B] text-white text-xs font-black">
                              {bm.roomType} ({bm.categoryGroup} · {formatNum(bm.physicalCapacity)}실)
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                              isPositive ? 'bg-[#E8F2EE] text-[#1E523F]' : 'bg-[#FDF0ED] text-[#8B2635]'
                            }`}>
                              전년비 {formatSignedPct(bm.yoyGrowthPct)}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 bg-[#FAF9F6] p-2.5 rounded-xl border border-[#D0C6BB]/50 text-xs">
                            <div>
                              <span className="text-[10px] text-[#5A6B63] block">2025 실측 (참고)</span>
                              <strong className="text-[#1B382E] font-financial">{formatWon(bm.adr2025Retail)}</strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#5A6B63] block">2026 실측 (앵커)</span>
                              <strong className="text-[#1B382E] font-financial">{formatWon(bm.adr2026RecentRetail)}</strong>
                            </div>
                            <div className="bg-[#E8F2EE]/70 px-2 py-1 rounded-lg">
                              <span className="text-[10px] text-[#1E523F] font-bold block">30일 추천 평균</span>
                              <strong className="text-[#1E523F] font-black font-financial">{formatWon(bm.next30dAvgRecommendedAdr)}</strong>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ====================================================================
                2. [날짜별 평형 판매가 즉시 확인 보드] 날짜 클릭 ➔ 6대 평형별 오늘 권장 판매가 대형 카드
               ==================================================================== */}
            {selectedDayItem && (
              <div className="bg-white rounded-3xl p-6 lg:p-7 border border-[#D0C6BB]/90 shadow-[0_6px_28px_rgba(27,59,43,0.08)] space-y-5">
                {/* 2-A. 날짜 빠른 선택 스크롤 바 */}
                <div className="space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-lg bg-[#1B3B2B] text-white text-xs font-black">
                        날짜별 판매가 확인
                      </span>
                      <span className="text-xs sm:text-sm font-extrabold text-[#1B382E]">
                        날짜를 클릭하면 아래에 해당 숙박일의 <strong>6대 평형별 권장 판매가</strong>가 즉시 표시됩니다
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
                          className={`px-3.5 py-2.5 rounded-2xl border text-left transition-all shrink-0 cursor-pointer min-w-[115px] ${
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
                            평균 {formatWon(day.pricing?.recommendedAdr)}
                          </div>
                          <div className={`text-[10px] mt-0.5 font-medium ${isSel ? 'text-white/80' : 'text-[#5A6B63]'}`}>
                            잔여 {formatNum(day.inventory?.remainingKeys)}키 · D-{day.leadDays ?? '-'}
                          </div>
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

                {/* 2-B. 선택한 날짜 타이틀 & 요약 바 (심플 & 직관적) */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-[#F4F3EE] px-5 py-4 rounded-2xl border border-[#D0C6BB]">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-lg sm:text-xl font-black text-[#1B382E]">
                      📅 {selectedDayItem.date} ({selectedDayItem.dayOfWeek}요일 · {selectedDayItem.dayTypeLabel}) 평형별 권장 판매가
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-lg bg-white text-[#1B382E] text-xs font-extrabold border border-[#D0C6BB]">
                      D-{selectedDayItem.leadDays ?? '-'}
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
                    {selectedDayItem.dualTrack?.trackDelta?.recommendedAdrDeltaKrw != null && selectedDayItem.dualTrack.trackDelta.recommendedAdrDeltaKrw !== 0 && (
                      <span
                        title={selectedDayItem.dualTrack.trackBReason || selectedDayItem.dualTrack.trackB_marketAdaptive?.externalSpreadFactors?.trackBReason || '외부시장 탄력(Track B) 보정'}
                        className="px-2.5 py-1 rounded-xl text-xs font-black bg-[#FAF6ED] text-[#8C6D3B] border border-[#E5DAC1] flex items-center gap-1"
                      >
                        <TrendingUp size={12} />
                        <span>Track B 고도화 {formatSignedWon(selectedDayItem.dualTrack.trackDelta.recommendedAdrDeltaKrw)}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="px-3 py-1.5 rounded-xl bg-white border border-[#D0C6BB]/80 font-bold text-[#1B382E]">
                      전체 잔여: <strong className="text-[#284F42] font-black">{formatNum(selectedDayItem.inventory?.remainingKeys)}키</strong> (현재 {formatPct(selectedDayItem.inventory?.currentOtbOccupancyPct)} ➔ 예상 {formatPct(selectedDayItem.inventory?.projectedOccupancyPct)})
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSelectedDayDetailAccordion(!showSelectedDayDetailAccordion)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#1B3B2B] text-white font-extrabold flex items-center gap-1.5 cursor-pointer hover:bg-[#0F291E]"
                    >
                      <Radio size={13} />
                      <span>{showSelectedDayDetailAccordion ? '경쟁사 가격 비교 & 상세 근거 접기' : '경쟁사 가격 비교 & 상세 근거 보기'}</span>
                      {showSelectedDayDetailAccordion ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>
                </div>

                {/* 2-C. 🌟 [가장 중요한 영역] 선택한 날짜의 6대 평형별 권장 판매가 대형 카드 (최우선 배치!) */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {(selectedDayItem.roomTypes || []).map((rt) => {
                    const st = getActionBadgeStyle(rt.actionCode);
                    const adj = rt.adjustmentPct ?? 0;
                    const isFilteredRoom = selectedRoomType === rt.roomType;
                    const isPet = rt.roomType.includes('펫');
                    const isSoldOut = (rt.remainingSellable ?? 0) <= 0;
                    const trackARoomPrice = selectedDayItem.dualTrack?.trackA_standard?.recommendedAdrByRoomType?.[rt.roomType];
                    const trackBRoomPrice = selectedDayItem.dualTrack?.trackB_marketAdaptive?.recommendedAdrByRoomType?.[rt.roomType];
                    const hasRoomTrackDiff = trackARoomPrice != null && trackBRoomPrice != null && trackARoomPrice !== trackBRoomPrice;

                    return (
                      <div
                        key={rt.roomType}
                        className={`rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                          isFilteredRoom
                            ? 'bg-[#F4F3EE] border-2 border-[#1B3B2B] shadow-md'
                            : 'bg-white border-[#D0C6BB]/90 hover:border-[#1B3B2B]/60 shadow-xs'
                        }`}
                      >
                        {/* 상단: 평형 뱃지 & 잔여 객실 & 액션 */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <span className={`px-3.5 py-1.5 rounded-xl text-base font-black ${
                              isPet ? 'bg-[#8C6D3B] text-white' : 'bg-[#1B3B2B] text-white'
                            }`}>
                              {rt.roomType}
                            </span>
                            <span className={`text-xs font-extrabold px-2.5 py-1 rounded-lg border ${
                              isSoldOut
                                ? 'bg-[#FDF0ED] text-[#8B2635] border-[#EAC5BD]'
                                : 'bg-[#F4F3EE] text-[#1B382E] border-[#D0C6BB]/70'
                            }`}>
                              {isSoldOut ? '매진 (잔여 0실)' : `잔여 ${formatNum(rt.remainingSellable)}실`}
                              <span className="text-[#5A6B63] font-normal ml-1">/ {formatNum(rt.capacity)}실</span>
                            </span>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold border ${st.bg} ${st.text} ${st.border}`}>
                            {st.icon}
                            <span>{rt.actionLabel || rt.actionCode}</span>
                          </span>
                        </div>

                        {/* 중앙: 권장 판매가 (초대형 폰트) */}
                        <div className="bg-[#FAF9F6] rounded-2xl p-4 border border-[#D0C6BB]/75 mb-3">
                          <div className="flex items-center justify-between text-xs font-bold text-[#5A6B63] mb-1">
                            <span>권장 판매가 (추천 ADR)</span>
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
                            <div className="text-xs text-[#5A6B63]">
                              <span>요일 기준가: </span>
                              <span className="font-bold line-through">{formatWon(rt.baselineAdr)}</span>
                            </div>
                            <div className="text-2xl sm:text-3xl font-black text-[#1B3B2B] font-financial tracking-tight">
                              {formatWon(rt.recommendedAdr)}
                            </div>
                          </div>

                          {hasRoomTrackDiff && (
                            <div className="mt-2 pt-2 border-t border-[#D0C6BB]/50 flex items-center justify-between text-[11px] font-bold">
                              <span className="text-[#5A6B63]">표준(A) {formatWon(trackARoomPrice)}</span>
                              <span className="text-[#8C6D3B] font-extrabold">➔ 시장탄력(B) {formatWon(trackBRoomPrice)}</span>
                            </div>
                          )}
                        </div>

                        {/* 하단: 허용 범위 & 현재 예약률 */}
                        <div className="flex items-center justify-between text-xs text-[#5A6B63] px-1">
                          <span>
                            허용 범위: <strong className="text-[#8B2635]">{formatWon(rt.floorAdr)}</strong> ~ <strong className="text-[#1E523F]">{formatWon(rt.ceilingAdr)}</strong>
                          </span>
                          <span>
                            예약 <strong className="text-[#1B382E]">{formatNum(rt.otbBooked)}실 ({formatPct(rt.otbOccupancyPct)})</strong>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 2-D. 당일 핵심 마케팅 한 줄 가이드 & 시그널 요약 */}
                <div className="bg-[#FAF9F6] rounded-2xl p-4 border border-[#D0C6BB]/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
                  <div className="flex items-start sm:items-center gap-2">
                    <Sparkles size={15} className="text-[#B59269] shrink-0 mt-0.5 sm:mt-0" />
                    <span className="font-bold text-[#1B382E] leading-relaxed">
                      {selectedDayItem.marketing?.recommendationText || '-'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-[#D0C6BB]/70 font-bold text-[#1B382E]">
                      🎯 채널: {selectedDayItem.marketing?.targetChannel || '-'}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#FAF6ED] border border-[#E5DAC1] font-extrabold text-[#8C6D3B]">
                      🎁 특전: {selectedDayItem.marketing?.promoBundleItem || '-'}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#E8F2EE] border border-[#B4C6C1] font-extrabold text-[#1E523F]">
                      ⛳ 골프 {formatNum(selectedDayItem.inventory?.golfBookedTeams)}팀
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-[#D0C6BB]/70 font-bold text-[#8B2635]">
                      대기 {formatNum(selectedDayItem.inventory?.waitingRoomsCount)}건
                    </span>
                  </div>
                </div>

                {/* 2-E. [접이식] 선택 일자의 경쟁사 가격 비교 드로어 & 11열 상세 테이블 */}
                {showSelectedDayDetailAccordion && (
                  <div className="pt-3 border-t border-[#D0C6BB]/70 space-y-4">
                    {renderCompetitorDrawer(selectedDayItem)}

                    <div className="bg-[#FAF9F6] rounded-2xl p-4 border border-[#D0C6BB]/75 overflow-x-auto">
                      <div className="text-xs font-extrabold text-[#1B382E] mb-2.5">
                        📊 [{selectedDayItem.date}] 6대 평형별 산출 지표 11열 상세 비교표
                      </div>
                      <table className="w-full text-left border-collapse whitespace-nowrap min-w-[920px] bg-white rounded-xl overflow-hidden">
                        <thead>
                          <tr className="bg-[#F4F3EE] text-[#5A6B63] text-xs font-extrabold border-b border-[#D0C6BB]/80">
                            <th className="py-2.5 px-4">평형명</th>
                            <th className="py-2.5 px-4 text-right">물리 모수</th>
                            <th className="py-2.5 px-4 text-right">현재 예약(OTB)</th>
                            <th className="py-2.5 px-4 text-right">잔여 판매가능</th>
                            <th className="py-2.5 px-4 text-right">점유율</th>
                            <th className="py-2.5 px-4 text-right">2025 실측 ADR</th>
                            <th className="py-2.5 px-4 text-right">2026 실측 ADR</th>
                            <th className="py-2.5 px-4 text-right">요일 기준가</th>
                            <th className="py-2.5 px-4 text-right">권장 판매가 (조정률)</th>
                            <th className="py-2.5 px-4 text-right">하한 ~ 상한 가드레일</th>
                            <th className="py-2.5 px-4 text-center">액션</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#D0C6BB]/40 text-xs">
                          {(selectedDayItem.roomTypes || []).map((rt) => {
                            const st = getActionBadgeStyle(rt.actionCode);
                            const adj = rt.adjustmentPct ?? 0;
                            return (
                              <tr key={rt.roomType} className="hover:bg-[#F4F3EE]/50">
                                <td className="py-2.5 px-4 font-extrabold text-[#1B382E]">{rt.roomType}</td>
                                <td className="py-2.5 px-4 text-right text-[#5A6B63]">{formatNum(rt.capacity)}실</td>
                                <td className="py-2.5 px-4 text-right font-bold text-[#1B382E]">{formatNum(rt.otbBooked)}실</td>
                                <td className="py-2.5 px-4 text-right font-black text-[#284F42]">{formatNum(rt.remainingSellable)}실</td>
                                <td className="py-2.5 px-4 text-right font-bold text-[#1B382E]">{formatPct(rt.otbOccupancyPct)}</td>
                                <td className="py-2.5 px-4 text-right text-[#5A6B63]">{formatWon(rt.adr2025Retail)}</td>
                                <td className="py-2.5 px-4 text-right text-[#5A6B63]">{formatWon(rt.adr2026RecentRetail)}</td>
                                <td className="py-2.5 px-4 text-right font-bold text-[#1B382E]">{formatWon(rt.baselineAdr)}</td>
                                <td className="py-2.5 px-4 text-right">
                                  <span className="font-black text-[#1B3B2B]">{formatWon(rt.recommendedAdr)}</span>
                                  <span className={`ml-1 font-extrabold ${
                                    adj > 0 ? 'text-[#1E523F]' : adj < 0 ? 'text-[#8B2635]' : 'text-[#5A6B63]'
                                  }`}>
                                    ({formatSignedPct(rt.adjustmentPct)})
                                  </span>
                                </td>
                                <td className="py-2.5 px-4 text-right text-[#5A6B63]">
                                  {formatWon(rt.floorAdr)} ~ {formatWon(rt.ceilingAdr)}
                                </td>
                                <td className="py-2.5 px-4 text-center">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold border ${st.bg} ${st.text} ${st.border}`}>
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
                )}
              </div>
            )}

            {/* ====================================================================
                3. [향후 30일 일자별 × 평형별 권장 판매가 전체 일람표 (Matrix)]
               ==================================================================== */}
            <div className="bg-white rounded-3xl border border-[#D0C6BB]/80 shadow-[0_4px_24px_rgba(40,79,66,0.06)] overflow-hidden">
              <div className="p-6 bg-[#F4F3EE] border-b border-[#D0C6BB]/75 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-[#1B382E] flex items-center gap-2">
                      <Calendar size={20} className="text-[#1B3B2B]" />
                      <span>향후 {formatNum(meta?.totalDays)}일 일자별 × 평형별 권장 판매가 전체 일람표 (Matrix)</span>
                    </h2>
                    <p className="text-xs text-[#5A6B63] mt-0.5 font-medium">
                      날짜별로 <strong>16평 · 35평 · 51평 · 펫룸 각각의 권장 판매가와 잔여 객실수</strong>를 한눈에 확인합니다. (행 클릭 시 해당 일자 상세 분석 펼침)
                    </p>
                  </div>

                  {/* 객실 그룹 컬럼 보기 전환 탭 */}
                  <div className="flex flex-wrap items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-[#D0C6BB]/80 self-start lg:self-auto">
                    <button
                      type="button"
                      onClick={() => setMatrixCategoryTab('ALL')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                        matrixCategoryTab === 'ALL'
                          ? 'bg-[#1B3B2B] text-white shadow-2xs'
                          : 'text-[#5A6B63] hover:text-[#1B382E]'
                      }`}
                    >
                      전체 6개 평형 모두 보기
                    </button>
                    <button
                      type="button"
                      onClick={() => setMatrixCategoryTab('STANDARD_3')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                        matrixCategoryTab === 'STANDARD_3'
                          ? 'bg-[#1B3B2B] text-white shadow-2xs'
                          : 'text-[#5A6B63] hover:text-[#1B382E]'
                      }`}
                    >
                      일반 객실 3종 (16·35·51평)
                    </button>
                    <button
                      type="button"
                      onClick={() => setMatrixCategoryTab('PET_3')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                        matrixCategoryTab === 'PET_3'
                          ? 'bg-[#8C6D3B] text-white shadow-2xs'
                          : 'text-[#5A6B63] hover:text-[#1B382E]'
                      }`}
                    >
                      펫룸 3종 (펫 16·35·51평)
                    </button>
                  </div>
                </div>

                {/* 마케팅 액션 4대 전략 필터 바 */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#D0C6BB]/60">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-extrabold text-[#1B382E] mr-1">전략별 날짜 필터:</span>
                    <button
                      onClick={() => setSelectedActionFilter('ALL')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer border ${
                        selectedActionFilter === 'ALL'
                          ? 'bg-[#1B382E] text-white border-[#1B382E]'
                          : 'bg-white text-[#1B382E] border-[#D0C6BB]/80 hover:bg-[#EAE6DF]'
                      }`}
                    >
                      <span>전체</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[11px]">{formatNum(dailyCalendar.length)}일</span>
                    </button>

                    <button
                      onClick={() => setSelectedActionFilter(selectedActionFilter === 'YIELD_UP' ? 'ALL' : 'YIELD_UP')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer border ${
                        selectedActionFilter === 'YIELD_UP'
                          ? 'bg-[#1E523F] text-white border-[#1E523F]'
                          : 'bg-[#E8F2EE] text-[#1E523F] border-[#B4C6C1]'
                      }`}
                    >
                      <span>🔥 단가 상향</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-black/10 text-[11px] font-black">{formatNum(pricingRec?.yieldUpDays)}일</span>
                    </button>

                    <button
                      onClick={() => setSelectedActionFilter(selectedActionFilter === 'HOLD' ? 'ALL' : 'HOLD')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer border ${
                        selectedActionFilter === 'HOLD'
                          ? 'bg-[#284F42] text-white border-[#284F42]'
                          : 'bg-white text-[#284F42] border-[#D0C6BB]'
                      }`}
                    >
                      <span>⚖️ 기준가 유지</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-black/10 text-[11px] font-black">{formatNum(pricingRec?.holdDays)}일</span>
                    </button>

                    <button
                      onClick={() => setSelectedActionFilter(selectedActionFilter === 'BUNDLE_PROMO' ? 'ALL' : 'BUNDLE_PROMO')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer border ${
                        selectedActionFilter === 'BUNDLE_PROMO'
                          ? 'bg-[#B59269] text-white border-[#B59269]'
                          : 'bg-[#FAF6ED] text-[#8C6D3B] border-[#E5DAC1]'
                      }`}
                    >
                      <span>🎁 레저 번들 특전</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-black/10 text-[11px] font-black">{formatNum(pricingRec?.bundlePromoDays)}일</span>
                    </button>

                    <button
                      onClick={() => setSelectedActionFilter(selectedActionFilter === 'FLASH_SALE' ? 'ALL' : 'FLASH_SALE')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer border ${
                        selectedActionFilter === 'FLASH_SALE'
                          ? 'bg-[#8B2635] text-white border-[#8B2635]'
                          : 'bg-[#FDF0ED] text-[#8B2635] border-[#EAC5BD]'
                      }`}
                    >
                      <span>⚡ 타임세일</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-black/10 text-[11px] font-black">{formatNum(pricingRec?.flashSaleDays)}일</span>
                    </button>
                  </div>

                  <div className="text-xs font-bold text-[#5A6B63]">
                    표시 일수: <strong className="text-[#1B382E]">{formatNum(filteredCalendar.length)}일</strong> / {formatNum(dailyCalendar.length)}일
                  </div>
                </div>
              </div>

              {/* 30일 일자별 × 평형별 가격 매트릭스 테이블 */}
              <div className="overflow-x-auto">
                {(() => {
                  const visibleRoomTypes = matrixCategoryTab === 'STANDARD_3'
                    ? ['16평', '35평', '51평']
                    : matrixCategoryTab === 'PET_3'
                    ? ['펫룸 16평', '펫룸 35평', '펫룸 51평']
                    : ['16평', '35평', '51평', '펫룸 16평', '펫룸 35평', '펫룸 51평'];
                  const totalColSpan = 4 + visibleRoomTypes.length;

                  return (
                    <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1280px]">
                      <thead>
                        <tr className="bg-[#FAF9F5] text-[#5A6B63] text-xs font-extrabold border-b-2 border-[#D0C6BB]/80">
                          <th className="py-3.5 px-4 sticky left-0 bg-[#FAF9F5] z-10 border-r border-[#D0C6BB]/50">
                            숙박 일자 / 요일
                          </th>
                          <th className="py-3.5 px-3 text-center">판매 전략</th>
                          {visibleRoomTypes.map((rtName) => {
                            const isPetCol = rtName.includes('펫');
                            const isHighlightedCol = selectedRoomType === rtName;
                            return (
                              <th
                                key={rtName}
                                className={`py-3.5 px-4 text-right border-l border-[#D0C6BB]/40 ${
                                  isHighlightedCol
                                    ? 'bg-[#E8F2EE] text-[#1B3B2B]'
                                    : isPetCol
                                    ? 'bg-[#FAF6ED]/60 text-[#8C6D3B]'
                                    : 'bg-[#E8F2EE]/35 text-[#1B382E]'
                                }`}
                              >
                                <div className="text-xs sm:text-sm font-black">{rtName} 판매가</div>
                                <div className="text-[10px] font-bold text-[#5A6B63]">추천가 (조정률 · 잔여실)</div>
                              </th>
                            );
                          })}
                          <th className="py-3.5 px-4 text-right border-l border-[#D0C6BB]/50">전체 잔여 키 (점유율)</th>
                          <th className="py-3.5 px-4">주요 시그널 / 특전</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#D0C6BB]/40 text-xs sm:text-sm">
                        {filteredCalendar.map((day) => {
                          const isExpanded = expandedMatrixDateStr === day.date;
                          const isCurrentSel = selectedDateStr === day.date;
                          const st = getActionBadgeStyle(day.marketing?.actionCode);
                          const isSat = day.dayOfWeek === '토';
                          const isSunOrHol = day.dayOfWeek === '일' || day.isHoliday;

                          return (
                            <React.Fragment key={day.date}>
                              <tr
                                onClick={() => {
                                  setSelectedDateStr(day.date);
                                  setExpandedMatrixDateStr(isExpanded ? null : day.date);
                                }}
                                className={`transition-colors cursor-pointer ${
                                  isExpanded
                                    ? 'bg-[#E8F2EE]/80 font-bold'
                                    : isCurrentSel
                                    ? 'bg-[#E8F2EE]/40'
                                    : day.isHoliday || isSat
                                    ? 'bg-[#FAF6ED]/35 hover:bg-[#F4F3EE]/80'
                                    : 'hover:bg-[#F4F3EE]/60'
                                }`}
                              >
                                {/* 1. 숙박 일자 / 요일 */}
                                <td className="py-3 px-4 sticky left-0 bg-inherit z-10 border-r border-[#D0C6BB]/40">
                                  <div className="flex items-center gap-2">
                                    {isExpanded ? (
                                      <ChevronUp size={14} className="text-[#1B3B2B] shrink-0" />
                                    ) : (
                                      <ChevronDown size={14} className="text-[#5A6B63] shrink-0" />
                                    )}
                                    <div>
                                      <div className="font-extrabold text-[#1B382E] flex items-center gap-1.5">
                                        <span>{day.date}</span>
                                        <span className={`px-1.5 py-0.2 rounded text-[11px] font-black ${
                                          isSat
                                            ? 'bg-[#FAF6ED] text-[#8C6D3B] border border-[#E5DAC1]'
                                            : isSunOrHol
                                            ? 'bg-[#FDF0ED] text-[#8B2635] border border-[#EAC5BD]'
                                            : 'bg-[#F4F3EE] text-[#5A6B63]'
                                        }`}>
                                          {day.dayOfWeek}
                                        </span>
                                        <span className="text-[10px] font-bold text-[#5A6B63]">
                                          D-{day.leadDays ?? '-'}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                        <span className="text-[10px] text-[#5A6B63]">{day.dayTypeLabel}</span>
                                        {day.dualTrack?.trackDelta?.recommendedAdrDeltaKrw != null && day.dualTrack.trackDelta.recommendedAdrDeltaKrw !== 0 && (
                                          <span className="px-1 py-0.1 rounded text-[9px] font-black bg-[#FAF6ED] text-[#8C6D3B] border border-[#E5DAC1]">
                                            B {formatSignedWon(day.dualTrack.trackDelta.recommendedAdrDeltaKrw)}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* 2. 판매 전략 배지 */}
                                <td className="py-3 px-3 text-center">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${st.bg} ${st.text} ${st.border}`}>
                                    {st.icon}
                                    <span>{day.marketing?.actionCode === 'YIELD_UP' ? '단가상향' : day.marketing?.actionCode === 'HOLD' ? '기준유지' : day.marketing?.actionCode === 'BUNDLE_PROMO' ? '번들특전' : day.marketing?.actionCode === 'FLASH_SALE' ? '타임세일' : day.marketing?.actionLabel}</span>
                                  </span>
                                </td>

                                {/* 3 ~ 8. 각 평형별 권장 판매가 셀 (핵심!) */}
                                {visibleRoomTypes.map((rtName) => {
                                  const rt = (day.roomTypes || []).find((r) => r.roomType === rtName);
                                  const rtAdj = rt?.adjustmentPct ?? 0;
                                  const isSoldOut = (rt?.remainingSellable ?? 0) <= 0;
                                  const isHighlightedCol = selectedRoomType === rtName;

                                  return (
                                    <td
                                      key={rtName}
                                      className={`py-3 px-4 text-right border-l border-[#D0C6BB]/35 ${
                                        isHighlightedCol ? 'bg-[#E8F2EE]/40' : ''
                                      }`}
                                    >
                                      {rt ? (
                                        <div>
                                          <div className="text-sm sm:text-base font-black text-[#1B3B2B] font-financial">
                                            {formatWon(rt.recommendedAdr)}
                                          </div>
                                          <div className="flex items-center justify-end gap-1.5 mt-0.5 text-[10px]">
                                            <span className={`font-extrabold ${
                                              rtAdj > 0 ? 'text-[#1E523F]' : rtAdj < 0 ? 'text-[#8B2635]' : 'text-[#5A6B63]'
                                            }`}>
                                              {formatSignedPct(rt.adjustmentPct)}
                                            </span>
                                            <span className="text-[#D0C6BB]">|</span>
                                            <span className={`font-bold ${
                                              isSoldOut ? 'text-[#8B2635] font-black' : 'text-[#5A6B63]'
                                            }`}>
                                              {isSoldOut ? '매진(0실)' : `잔여 ${formatNum(rt.remainingSellable)}실`}
                                            </span>
                                          </div>
                                        </div>
                                      ) : (
                                        <span className="text-[#5A6B63]">-</span>
                                      )}
                                    </td>
                                  );
                                })}

                                {/* 9. 전체 잔여 키 & 점유율 */}
                                <td className="py-3 px-4 text-right border-l border-[#D0C6BB]/40 font-financial">
                                  <div className="font-black text-[#1B382E]">
                                    잔여 {formatNum(day.inventory?.remainingKeys)}키
                                  </div>
                                  <div className="text-[10px] text-[#5A6B63]">
                                    {formatPct(day.inventory?.currentOtbOccupancyPct)} ➔ <strong className="text-[#1E523F]">{formatPct(day.inventory?.projectedOccupancyPct)}</strong>
                                  </div>
                                </td>

                                {/* 10. 주요 시그널 / 특전 */}
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {day.competitorBenchmark?.uiBadge && (() => {
                                      const b = day.competitorBenchmark.uiBadge;
                                      const bStyle = getCompetitorBadgeStyle(b.badgeColorTone);
                                      return (
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-black border ${bStyle.bg} ${bStyle.text} ${bStyle.border}`}>
                                          {b.badgeLabel}
                                        </span>
                                      );
                                    })()}
                                    <span className="px-1.5 py-0.5 rounded bg-[#E8F2EE] text-[#1E523F] text-[10px] font-extrabold">
                                      ⛳ 골프 {formatNum(day.inventory?.golfBookedTeams)}팀
                                    </span>
                                    {(day.inventory?.waitingRoomsCount ?? 0) > 0 && (
                                      <span className="px-1.5 py-0.5 rounded bg-[#FDF0ED] text-[#8B2635] text-[10px] font-bold">
                                        대기 {formatNum(day.inventory?.waitingRoomsCount)}건
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-[#5A6B63] truncate max-w-[200px] mt-0.5">
                                    🎁 {day.marketing?.promoBundleItem || '-'}
                                  </div>
                                </td>
                              </tr>

                              {/* 행 클릭 시 펼쳐지는 상세 분석 드로어 */}
                              {isExpanded && (
                                <tr className="bg-[#FAF9F5] border-b-2 border-[#1B3B2B]/30">
                                  <td colSpan={totalColSpan} className="p-5 whitespace-normal">
                                    <div className="space-y-4">
                                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#D0C6BB]/80">
                                        <div className="space-y-1">
                                          <div className="text-xs font-extrabold text-[#1B3B2B] flex items-center gap-1.5">
                                            <Sparkles size={14} className="text-[#B59269]" />
                                            <span>[{day.date} ({day.dayOfWeek})] 상세 판매 가이드 & 평형별 가드레일</span>
                                          </div>
                                          <p className="text-xs sm:text-sm font-bold text-[#1B382E]">
                                            {day.marketing?.recommendationText || '-'}
                                          </p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 shrink-0 text-xs">
                                          <span className="px-3 py-1.5 rounded-xl bg-[#F4F3EE] border border-[#D0C6BB]/70 font-bold text-[#1B382E]">
                                            당일 예상 매출: <strong className="font-financial">{formatWon(day.pricing?.dynamicProjectedRevenue)}</strong> ({formatSignedWon(day.pricing?.expectedRevenueDelta)})
                                          </span>
                                          <span className="px-3 py-1.5 rounded-xl bg-[#FAF6ED] border border-[#E5DAC1] font-extrabold text-[#8C6D3B]">
                                            🎁 {day.marketing?.promoBundleItem || '-'}
                                          </span>
                                        </div>
                                      </div>

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
                  );
                })()}
              </div>
            </div>

            {/* ====================================================================
                4. [아코디언 D] 향후 30일 4대 핵심 KPI & 충청권 4대 경쟁사 낙수수요(Spillover) 실측 분석
               ==================================================================== */}
            <div className="bg-white rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] overflow-hidden">
              <button
                type="button"
                onClick={() => setShowKpiSpilloverAccordion(!showKpiSpilloverAccordion)}
                className="w-full p-6 bg-white hover:bg-[#FAF9F6] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Zap size={19} className="text-[#1B3B2B]" />
                    <h2 className="text-lg font-extrabold text-[#1B382E]">
                      향후 {formatNum(meta?.totalDays)}일 4대 핵심 재무 KPI & 충청권 4대 경쟁사 낙수수요(Spillover) 실측 분석
                    </h2>
                    <span className="text-xs font-bold text-[#1E523F] bg-[#E8F2EE] px-2.5 py-0.5 rounded-full border border-[#B4C6C1]">
                      예상 추가매출 {formatSignedWon(pricingRec?.expectedRevenueGain)} · 과열 {formatNum(competitorMarket?.highCompressionDaysCount)}일
                    </span>
                  </div>
                  <p className="text-xs text-[#5A6B63] mt-1 font-medium">
                    30일 누적 예약률(OTB), 2025 vs 2026 실측 ADR 비교, 예상 추가 수익 및 경쟁 리조트 품절에 따른 낙수수요 유입 가속도를 확인합니다.
                  </p>
                </div>

                <div className="px-4 py-2 rounded-xl bg-[#F4F3EE] border border-[#D0C6BB] text-xs font-extrabold text-[#1B382E] flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                  <span>{showKpiSpilloverAccordion ? 'KPI & 경쟁사 낙수수요 접기' : 'KPI & 경쟁사 낙수수요 펼치기'}</span>
                  {showKpiSpilloverAccordion ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </div>
              </button>

              {showKpiSpilloverAccordion && (
                <div className="p-6 lg:p-7 pt-3 border-t border-[#D0C6BB]/60 bg-[#FAF9F6] space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {/* KPI 1 */}
                    <div className="bg-white rounded-2xl p-5 border border-[#D0C6BB]/75 space-y-2">
                      <div className="text-xs font-extrabold text-[#5A6B63]">1. 향후 30일 실시간 예약(OTB)</div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-[#1B382E] font-financial">{formatPct(currentOtb?.currentOtbOccupancyPct)}</span>
                        <span className="text-xs font-extrabold text-[#1E523F]">➔ 예상 {formatPct(currentOtb?.projectedOccupancyPct)}</span>
                      </div>
                      <div className="text-xs text-[#5A6B63]">
                        점유 {formatNum(currentOtb?.totalOccupiedKeys)} / {formatNum(currentOtb?.totalCapacityKeys)}키 (예약 {formatNum(currentOtb?.totalBookedRooms)}실)
                      </div>
                    </div>

                    {/* KPI 2 */}
                    <div className="bg-white rounded-2xl p-5 border border-[#D0C6BB]/75 space-y-2">
                      <div className="text-xs font-extrabold text-[#5A6B63]">2. 2025 vs 2026 실측 Retail ADR</div>
                      <div className="flex items-baseline gap-2 font-financial">
                        <span className="text-sm text-[#5A6B63] line-through">{formatWon(hist2025?.retailAdr)}</span>
                        <span className="text-2xl font-black text-[#1B382E]">{formatWon(recent2026?.retailAdr)}</span>
                      </div>
                      <div className="text-xs font-extrabold text-[#1E523F]">
                        전년 대비 {formatSignedPct(recent2026?.yoyRetailAdrGrowthPct)} 인상 안착
                      </div>
                    </div>

                    {/* KPI 3 */}
                    <div className="bg-white rounded-2xl p-5 border border-[#D0C6BB]/75 space-y-2">
                      <div className="text-xs font-extrabold text-[#5A6B63]">3. 향후 30일 추천 평균 ADR</div>
                      <div className="flex items-baseline gap-2 font-financial">
                        <span className="text-2xl font-black text-[#1B3B2B]">{formatWon(pricingRec?.avgRecommendedAdr)}</span>
                        <span className="text-xs font-extrabold text-[#1E523F]">({formatSignedPct(pricingRec?.avgAdrLiftPct)})</span>
                      </div>
                      <div className="text-xs text-[#5A6B63]">
                        출발 기준가 평균: {formatWon(pricingRec?.avgBaselineAdr)}
                      </div>
                    </div>

                    {/* KPI 4 */}
                    <div className="bg-[#1B3B2B] text-white rounded-2xl p-5 space-y-2">
                      <div className="text-xs font-extrabold text-white/80">4. 30일 다이나믹 예상 매출 순증</div>
                      <div className="flex items-baseline gap-2 font-financial">
                        <span className="text-2xl font-black text-[#EAE3D2]">{formatSignedWon(pricingRec?.expectedRevenueGain)}</span>
                        <span className="text-xs font-extrabold text-[#B59269]">({formatSignedPct(pricingRec?.expectedRevenueGainPct)})</span>
                      </div>
                      <div className="text-xs text-white/80 font-financial">
                        총 예상 매출: {formatWon(pricingRec?.dynamicProjectedRevenue)}
                      </div>
                    </div>
                  </div>

                  {/* 경쟁사 낙수수요 배너 */}
                  {competitorMarket && (
                    <div className="bg-white rounded-2xl p-5 border border-[#D0C6BB]/80 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="text-sm font-black text-[#1B382E] flex items-center gap-2">
                          <Radio size={15} className="text-[#1B3B2B]" />
                          <span>충청권 4대 경쟁 리조트 야간 레이더 & 낙수수요(Spillover) 교차 탄력성</span>
                        </div>
                        <span className="text-xs font-bold text-[#5A6B63]">수집: {competitorMarket.snapshotCollectedAt || '-'}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                        <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#D0C6BB]/60">
                          <span className="text-[#8B2635] font-bold block">🔥 경쟁사 과열 구간 ({formatNum(spillover?.highCompressionGroup?.daysCount)}일)</span>
                          <strong className="text-lg font-black text-[#1B382E] font-financial">
                            {spillover?.highCompressionGroup?.avgRecent7dPickupRoomsPerDay != null ? `${spillover.highCompressionGroup.avgRecent7dPickupRoomsPerDay}실/일` : '-'}
                          </strong>
                          <span className="block text-[11px] text-[#5A6B63] mt-0.5">최근 7일 유입 {formatNum(spillover?.highCompressionGroup?.totalRecent7dPickupRooms)}실</span>
                        </div>
                        <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#D0C6BB]/60">
                          <span className="text-[#5A6B63] font-bold block">경쟁사 일반 구간 ({formatNum(spillover?.normalMarketGroup?.daysCount)}일)</span>
                          <strong className="text-lg font-black text-[#5A6B63] font-financial">
                            {spillover?.normalMarketGroup?.avgRecent7dPickupRoomsPerDay != null ? `${spillover.normalMarketGroup.avgRecent7dPickupRoomsPerDay}실/일` : '-'}
                          </strong>
                          <span className="block text-[11px] text-[#5A6B63] mt-0.5">낙수 유입 가속비 {spillover?.spilloverPickupVelocityRatio != null ? `${spillover.spilloverPickupVelocityRatio}배` : '-'}</span>
                        </div>
                        <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#D0C6BB]/60">
                          <span className="text-[#284F42] font-bold block">기확정 생존 OTB 매출 (고정)</span>
                          <strong className="text-lg font-black text-[#1B382E] font-financial">{formatWon(pricingRec?.lockedOtbRevenueTotal)}</strong>
                          <span className="block text-[11px] text-[#1E523F] mt-0.5">생존 OTB {formatNum(counterfactual?.totalSurvivingOtbUnits)}실 (Δ=0원)</span>
                        </div>
                        <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#D0C6BB]/60">
                          <span className="text-[#1E523F] font-bold block">신규 픽업 순공헌이익 순증</span>
                          <strong className="text-lg font-black text-[#1E523F] font-financial">{formatSignedWon(counterfactual?.expectedNetContributionMarginGain)}</strong>
                          <span className="block text-[11px] text-[#5A6B63] mt-0.5">순증률 {formatSignedPct(counterfactual?.expectedNetContributionMarginGainPct)}</span>
                        </div>
                      </div>
                      {spillover?.crossElasticitySummary && (
                        <p className="text-xs font-bold text-[#1B382E] bg-[#F4F3EE] p-3 rounded-xl border border-[#D0C6BB]/60">
                          💡 {spillover.crossElasticitySummary}
                        </p>
                      )}
                    </div>
                  )}
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
