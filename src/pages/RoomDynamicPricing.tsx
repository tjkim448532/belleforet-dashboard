import React, { useState, useEffect } from 'react';
import {
  Hotel, Calendar, TrendingUp, Sparkles, RefreshCw,
  ShieldCheck, Layers,
  Tag, Zap, Flame, AlertCircle, HelpCircle, BookOpen,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Compass, Package, Database,
  Radio, BarChart3, Activity, Users
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

export interface OtbChannelBreakdown {
  fitDirectRooms?: number | null;
  fitOtaRooms?: number | null;
  golfPkgRooms?: number | null;
  corporateResortRooms?: number | null;
  groupSeminarRooms?: number | null;
  memberResortRooms?: number | null;
  contractedBaseRooms?: number | null;
  contractedBaseKeys?: number | null;
  fitDirectSharePct?: number | null;
  fitOtaSharePct?: number | null;
  golfPkgSharePct?: number | null;
  corporateResortSharePct?: number | null;
  groupSeminarSharePct?: number | null;
  memberResortSharePct?: number | null;
  contractedBaseSharePct?: number | null;
  contractedBaseKeysSharePct?: number | null;
}

export interface ChannelRateGuideSummary {
  avgFitDirectWebAdr?: number | null;
  avgFitOtaListedAdr?: number | null;
  avgCorporateResortContractAdr?: number | null;
  avgGroupSeminarContractBaseAdr?: number | null;
  avgGroupSeminarWalkAwayFloorAdr?: number | null;
  avgMemberContractAdr?: number | null;
  contractedBaseCompressionDaysCount?: number | null;
  groupRateFloorProtectedDaysCount?: number | null;
  groupBlockClosedDaysCount?: number | null;
}

export interface DailyChannelRateGuide {
  fitDirectWebAdr?: number | null;
  fitOtaListedAdr?: number | null;
  corporateResortContractAdr?: number | null;
  groupSeminarContractBaseAdr?: number | null;
  groupSeminarWalkAwayFloorAdr?: number | null;
  memberContractAdr?: number | null;
  groupBookingPolicyStatus?: 'GROUP_OPEN_AGGRESSIVE' | 'GROUP_STANDARD_FLOOR' | 'GROUP_RATE_FLOOR_PROTECTED' | 'GROUP_BLOCK_CLOSED' | string;
  groupBookingPolicyLabel?: string;
  corporateQuotaStatus?: string;
}

export interface RoomTypeChannelRateGuide {
  fitDirectWebAdr?: number | null;
  fitOtaListedAdr?: number | null;
  corporateResortContractAdr?: number | null;
  groupSeminarContractBaseAdr?: number | null;
  groupSeminarWalkAwayFloorAdr?: number | null;
  memberContractAdr?: number | null;
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
  channelBreakdown?: OtbChannelBreakdown;
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
  channelRateGuideSummary?: ChannelRateGuideSummary;
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
  surgeVsWeekdayPct?: number | null;
  dropFromSatPeakPct?: number | null;
  priceChange1dKrw?: number | null;
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
  channelRateGuide?: RoomTypeChannelRateGuide;
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
    channelBreakdown?: OtbChannelBreakdown;
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
    channelRateGuide?: DailyChannelRateGuide;
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

const getGroupPolicyBadgeStyle = (status: string | null | undefined) => {
  switch (status) {
    case 'GROUP_BLOCK_CLOSED':
      return {
        bg: 'bg-[#FDF0ED]',
        text: 'text-[#8B2635]',
        border: 'border-[#EAC5BD]',
        icon: '⛔'
      };
    case 'GROUP_RATE_FLOOR_PROTECTED':
      return {
        bg: 'bg-[#FAF6ED]',
        text: 'text-[#8C6D3B]',
        border: 'border-[#E5DAC1]',
        icon: '🛡️'
      };
    case 'GROUP_OPEN_AGGRESSIVE':
      return {
        bg: 'bg-[#E8F2EE]',
        text: 'text-[#1E523F]',
        border: 'border-[#B4C6C1]',
        icon: '📢'
      };
    default:
      return {
        bg: 'bg-[#F4F3EE]',
        text: 'text-[#1B382E]',
        border: 'border-[#D0C6BB]',
        icon: '⚖️'
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
  const [activeMainTab, setActiveMainTab] = useState<'DAILY' | 'MATRIX' | 'ANALYTICS'>('DAILY');
  const [showKpiSpilloverAccordion, setShowKpiSpilloverAccordion] = useState<boolean>(true);

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
  const summaryOtbChannel = currentOtb?.channelBreakdown;
  const channelRateSummary = pricingRec?.channelRateGuideSummary;

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
                충청권 4대 경쟁 리조트 실시간 비교 레이더 & 요금 우위 분석 (주변 만실 반사이익 추적)
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
              <span>실시간 수집 시각: {cb.snapshotCollectedAt}</span>
            </div>
          )}
        </div>

        {/* 2. 평형별 가격 비교 (Tier Comparison) & 최근 예약 유입 속도 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 35평형 가격 비교 */}
          <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#D0C6BB]/60 space-y-1.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-[#1B382E]">35평형 요금 경쟁력</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-[#D0C6BB]/60 text-[#284F42]">
                  {t16_35?.positioningStatus || '비교'}
                </span>
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <span className="text-[11px] text-[#5A6B63]">벨포레 추천 요금 (1박)</span>
                <span className="text-sm font-black text-[#1B3B2B] font-financial">
                  {formatWon(t16_35?.belleforetRecommendedAdr)}
                </span>
              </div>
              <div className="flex items-baseline justify-between text-[11px] text-[#5A6B63]">
                <span>주변 최저가 ({t16_35?.lowestCompetitorName || '-'})</span>
                <span className="font-bold text-[#1B382E] font-financial">
                  {formatWon(t16_35?.competitorMinPrice)}
                </span>
              </div>
            </div>
            <div className="flex items-baseline justify-between text-xs pt-1.5 border-t border-[#D0C6BB]/40 font-bold">
              <span className="text-[#5A6B63]">경쟁사 대비 요금 차이 (우위)</span>
              <span className={`font-black font-financial ${
                (t16_35?.priceCushionKrw ?? 0) >= 0 ? 'text-[#1E523F]' : 'text-[#8B2635]'
              }`}>
                {formatSignedWon(t16_35?.priceCushionKrw)} ({formatSignedPct(t16_35?.priceCushionPct)})
              </span>
            </div>
          </div>

          {/* 51평형 가격 비교 */}
          <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#D0C6BB]/60 space-y-1.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-[#1B382E]">51평형 요금 경쟁력</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-[#D0C6BB]/60 text-[#284F42]">
                  {t51?.positioningStatus || '비교'}
                </span>
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <span className="text-[11px] text-[#5A6B63]">벨포레 추천 요금 (1박)</span>
                <span className="text-sm font-black text-[#1B3B2B] font-financial">
                  {formatWon(t51?.belleforetRecommendedAdr)}
                </span>
              </div>
              <div className="flex items-baseline justify-between text-[11px] text-[#5A6B63]">
                <span>주변 최저가 ({t51?.lowestCompetitorName || '-'})</span>
                <span className="font-bold text-[#1B382E] font-financial">
                  {formatWon(t51?.competitorMinPrice)}
                </span>
              </div>
            </div>
            <div className="flex items-baseline justify-between text-xs pt-1.5 border-t border-[#D0C6BB]/40 font-bold">
              <span className="text-[#5A6B63]">경쟁사 대비 요금 차이 (우위)</span>
              <span className={`font-black font-financial ${
                (t51?.priceCushionKrw ?? 0) >= 0 ? 'text-[#1E523F]' : 'text-[#8B2635]'
              }`}>
                {formatSignedWon(t51?.priceCushionKrw)} ({formatSignedPct(t51?.priceCushionPct)})
              </span>
            </div>
          </div>

          {/* 최근 신규 예약 유입 속도 */}
          <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#D0C6BB]/60 space-y-1.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-[#1B382E]">최근 신규 예약 유입 속도</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]">
                  {pv?.spilloverMomentumStatus || '정상'}
                </span>
              </div>
              <div className="flex items-baseline justify-between pt-1 text-xs">
                <span className="text-[#5A6B63] font-medium">최근 3일간 신규 예약</span>
                <span className="font-extrabold text-[#1B382E]">
                  {formatNum(pv?.recent3dBookedRooms)}실
                </span>
              </div>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-[#5A6B63] font-medium">최근 7일간 신규 예약</span>
                <span className="font-black text-[#1E523F]">
                  {formatNum(pv?.recent7dBookedRooms)}실 ({formatNum(pv?.recent7dOccupiedKeys)}키)
                </span>
              </div>
            </div>
            <div className="pt-1.5 border-t border-[#D0C6BB]/40 text-[10px] text-[#5A6B63]">
              주변 리조트가 만실일 때 벨포레로 예약이 몰리는 속도를 실시간 감지합니다.
            </div>
          </div>
        </div>

        {/* 2-B. 투트랙 1:1 비교 & 외부시장 스프레드 분석 */}
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
                    두 가지 추천 방식 1:1 비교 (기본 추천 vs 시장 연동 추천)
                  </span>
                </div>
                {isAdjusted ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#FAF6ED] text-[#8C6D3B] border border-[#E5DAC1]">
                    시장 연동 보정: {formatSignedWon(dt.trackDelta?.recommendedAdrDeltaKrw)}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F4F3EE] text-[#5A6B63] border border-[#D0C6BB]">
                    두 방식 동일 추천가
                  </span>
                )}
              </div>

              {/* 1:1 단가 비교 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-[#D0C6BB]/50">
                  <span className="text-[10px] text-[#5A6B63] block">🅰️ 기본 추천 (우리 예약 기준)</span>
                  <strong className="text-sm font-black text-[#1B382E] font-financial">
                    {formatWon(dt.trackA_standard?.recommendedAdr)}
                  </strong>
                  <span className="text-[10px] text-[#5A6B63] ml-1">
                    ({formatSignedPct(dt.trackA_standard?.priceAdjustmentPct)})
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-[#D0C6BB]/50">
                  <span className="text-[10px] text-[#8C6D3B] block font-bold">🅱️ 시장 연동 추천 (경쟁사 만실 반영)</span>
                  <strong className="text-sm font-black text-[#8C6D3B] font-financial">
                    {formatWon(dt.trackB_marketAdaptive?.recommendedAdr)}
                  </strong>
                  <span className="text-[10px] text-[#8C6D3B] ml-1">
                    ({formatSignedPct(dt.trackB_marketAdaptive?.priceAdjustmentPct)})
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-[#D0C6BB]/50">
                  <span className="text-[10px] text-[#5A6B63] block">추천 요금 차이 (시장 연동 - 기본)</span>
                  <strong className={`text-sm font-black font-financial ${
                    (dt.trackDelta?.recommendedAdrDeltaKrw ?? 0) > 0 ? 'text-[#8C6D3B]' : (dt.trackDelta?.recommendedAdrDeltaKrw ?? 0) < 0 ? 'text-[#1E523F]' : 'text-[#5A6B63]'
                  }`}>
                    {formatSignedWon(dt.trackDelta?.recommendedAdrDeltaKrw)}
                  </strong>
                </div>
              </div>

              {/* 외부 지표 */}
              {factors && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                  <div className="bg-white p-2 rounded-lg border border-[#D0C6BB]/40">
                    <span className="text-[#5A6B63] block">주변 리조트 만실 강도</span>
                    <strong className="text-[#1B382E]">
                      {factors.seasonalPeakIntensityRatio != null ? `${factors.seasonalPeakIntensityRatio} / 1.0` : '-'}
                    </strong>
                  </div>

                  <div className="bg-white p-2 rounded-lg border border-[#D0C6BB]/40">
                    <span className="text-[#5A6B63] block">토요일 대비 평일 요금 낙폭</span>
                    <strong className="text-[#1B382E]">
                      {formatPct(factors.avgDropFromSatPeakPct)}
                    </strong>
                  </div>

                  <div className="bg-white p-2 rounded-lg border border-[#D0C6BB]/40">
                    <span className="text-[#5A6B63] block">목·일요일 예약 강세 여부</span>
                    <strong className={factors.weekdayShoulderSurgeDetected ? 'text-[#8C6D3B]' : 'text-[#5A6B63]'}>
                      {factors.weekdayShoulderSurgeDetected ? '🔥 예약 집중 포착' : '정상 수준'}
                    </strong>
                  </div>

                  <div className="bg-white p-2 rounded-lg border border-[#D0C6BB]/40">
                    <span className="text-[#5A6B63] block">추천 요금 반영 비율</span>
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

        {/* 3. 4대 경쟁사 실시간 판매 객실 & 상품 상세 (어디서 어떤 상품을 얼마에 파는가?) */}
        {resorts.length > 0 && (
          <div className="space-y-4 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D0C6BB]/60 pb-2.5">
              <div className="text-xs sm:text-sm font-black text-[#1B382E] flex items-center gap-1.5">
                <Radio size={15} className="text-[#1E523F]" />
                <span>충청권 4대 경쟁사 실시간 판매 객실 & 상품 상세 (어디서 어떤 상품을 얼마에 파는가?)</span>
              </div>
              <span className="text-[11px] font-bold text-[#5A6B63] bg-[#FAF9F6] px-2.5 py-1 rounded-lg border border-[#D0C6BB]/60">
                실시간 OTA 채널 전수 수집 데이터
              </span>
            </div>

            {/* 4대 리조트 판매 상품 요약 카드 그리드 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {resorts.map((r) => {
                const gap = r.vsBelleforetGapKrw ?? 0;
                const isSold = r.isSoldOut;
                return (
                  <div
                    key={r.resortName}
                    className="bg-[#FAF9F6] p-4 rounded-2xl border border-[#D0C6BB]/80 flex flex-col justify-between space-y-3 shadow-2xs hover:border-[#1B3B2B]/60 transition-all"
                  >
                    <div>
                      {/* 리조트명 + 판매상태 */}
                      <div className="flex items-center justify-between gap-1.5 mb-2">
                        <strong className="text-xs sm:text-sm font-black text-[#1B382E] truncate">
                          {r.resortName}
                        </strong>
                        {isSold ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#FDF0ED] text-[#8B2635] border border-[#EAC5BD] shrink-0">
                            마감·품절
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1] shrink-0">
                            판매중
                          </span>
                        )}
                      </div>

                      {/* 판매 채널 배지 */}
                      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-lg bg-white border border-[#D0C6BB]/70 text-[10px] font-black text-[#284F42] inline-flex items-center gap-1">
                          <span>🛒 판매처:</span>
                          <strong className="text-[#1B3B2B]">{r.lowestChannel || '온라인'}</strong>
                        </span>
                        {r.offerCount != null && r.offerCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-[#FAF6ED] text-[#8C6D3B] border border-[#E5DAC1]">
                            {formatNum(r.offerCount)}개 상품
                          </span>
                        )}
                      </div>

                      {/* 실제 판매 객실 / 패키지 상품명 박스 */}
                      <div className="bg-white p-2.5 rounded-xl border border-[#D0C6BB]/60 mb-2">
                        <span className="text-[10px] text-[#5A6B63] block font-medium">최저가 판매 객실 상품명</span>
                        <p className="text-xs font-black text-[#1B382E] mt-0.5 leading-snug line-clamp-2" title={r.lowestRoomName || '-'}>
                          {r.lowestRoomName || (isSold ? '전 객실 품절 마감' : '단일 상품')}
                        </p>
                      </div>

                      {/* 평형별 가격 요약 */}
                      <div className="grid grid-cols-2 gap-1.5 text-[10px] bg-white/70 p-2 rounded-lg border border-[#D0C6BB]/40">
                        <div>
                          <span className="text-[#5A6B63] block">중형(16~35평)</span>
                          <strong className="text-[#1B382E] font-financial">
                            {r.tier16_35MinPrice != null ? formatWon(r.tier16_35MinPrice) : (r.tier16_35Price != null ? formatWon(r.tier16_35Price) : '-')}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[#5A6B63] block">대형(51평)</span>
                          <strong className="text-[#1B382E] font-financial">
                            {r.tier51MinPrice != null ? formatWon(r.tier51MinPrice) : (r.tier51Price != null ? formatWon(r.tier51Price) : '-')}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* 하단 가격 & 벨포레 대비 격차 */}
                    <div className="pt-2.5 border-t border-[#D0C6BB]/50 space-y-1.5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[11px] text-[#5A6B63] font-medium">당일 최저 판매가</span>
                        <strong className="text-base sm:text-lg font-black text-[#1B3B2B] font-financial">
                          {isSold ? '품절' : formatWon(r.minPrice)}
                        </strong>
                      </div>

                      {/* 벨포레 대비 격차 */}
                      {r.vsBelleforetGapKrw != null && (
                        <div className="flex items-center justify-between text-[11px] bg-[#E8F2EE]/60 px-2 py-1 rounded-lg">
                          <span className="text-[#5A6B63]">벨포레 대비</span>
                          <strong className={`font-black font-financial ${gap > 0 ? 'text-[#1E523F]' : gap < 0 ? 'text-[#8B2635]' : 'text-[#5A6B63]'}`}>
                            {gap > 0 ? `+${formatWon(gap)} 비쌈 (우위)` : gap < 0 ? `-${formatWon(Math.abs(gap))} 저렴` : '동일가'}
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 4대 경쟁 리조트 10열 상세 비교표 */}
            <div className="rounded-2xl border border-[#D0C6BB]/80 overflow-x-auto bg-white shadow-2xs">
              <table className="w-full text-left border-collapse whitespace-nowrap text-xs min-w-[980px]">
                <thead>
                  <tr className="bg-[#F4F3EE] text-[#5A6B63] font-extrabold border-b border-[#D0C6BB]/80">
                    <th className="py-2.5 px-3.5">경쟁 리조트</th>
                    <th className="py-2.5 px-3">판매처</th>
                    <th className="py-2.5 px-3.5">실제 판매 객실 상품명 (오퍼)</th>
                    <th className="py-2.5 px-3 text-center">판매 상태</th>
                    <th className="py-2.5 px-3.5 text-right">당일 최저가</th>
                    <th className="py-2.5 px-3 text-right">중형 (16~35평)</th>
                    <th className="py-2.5 px-3 text-right">대형 (51평)</th>
                    <th className="py-2.5 px-3.5 text-right">벨포레 대비 요금 차이</th>
                    <th className="py-2.5 px-3 text-right">등록 상품</th>
                    <th className="py-2.5 px-3 text-right">전일 대비</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D0C6BB]/40">
                  {resorts.map((r) => {
                    const gap = r.vsBelleforetGapKrw ?? 0;
                    return (
                      <tr key={r.resortName} className="hover:bg-[#FAF9F6] transition-colors">
                        <td className="py-2.5 px-3.5 font-black text-[#1B382E]">{r.resortName}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-[#F4F3EE] border border-[#D0C6BB]/70 text-[10px] font-extrabold text-[#284F42]">
                            {r.lowestChannel || '온라인'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 font-bold text-[#1B382E] max-w-[280px] truncate" title={r.lowestRoomName || '-'}>
                          {r.lowestRoomName || (r.isSoldOut ? '전 객실 품절 마감' : '-')}
                        </td>
                        <td className="py-2.5 px-3 text-center">
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
                        <td className="py-2.5 px-3.5 text-right font-black text-[#1B382E] font-financial">
                          {r.isSoldOut ? '-' : formatWon(r.minPrice)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-[#5A6B63] font-financial">
                          {formatWon(r.tier16_35MinPrice ?? r.tier16_35Price)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-[#5A6B63] font-financial">
                          {formatWon(r.tier51MinPrice ?? r.tier51Price)}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-bold font-financial">
                          {r.vsBelleforetGapKrw != null ? (
                            <span className={gap > 0 ? 'text-[#1E523F] font-black' : gap < 0 ? 'text-[#8B2635] font-black' : 'text-[#5A6B63]'}>
                              {gap > 0 ? `+${formatWon(gap)} (벨포레 우위)` : gap < 0 ? `-${formatWon(Math.abs(gap))}` : '0원'}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-[#5A6B63]">
                          {r.offerCount != null ? `${formatNum(r.offerCount)}개` : '-'}
                        </td>
                        <td className={`py-2.5 px-3 text-right font-bold ${
                          ((r.priceChange1dPct ?? r.change1dPct) ?? 0) > 0 ? 'text-[#8B2635]' : ((r.priceChange1dPct ?? r.change1dPct) ?? 0) < 0 ? 'text-[#1E523F]' : 'text-[#5A6B63]'
                        }`}>
                          {formatSignedPct(r.priceChange1dPct ?? r.change1dPct)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. 51평 조립형 커넥팅 객실 판매 기준 */}
        {adv && (
          <div className="bg-[#FAF6ED] rounded-xl p-3.5 border border-[#E5DAC1] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-black text-[#8C6D3B]">
                <ShieldCheck size={14} className="text-[#8C6D3B]" />
                <span>51평 조립형 객실 판매 기준 (16평+35평 쪼개 팔기 대비 최저 보장선)</span>
              </div>
              {adv.allocationStatus && (
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-white text-[#8C6D3B] border border-[#E5DAC1]">
                  {adv.allocationStatus}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
              <div className="bg-white p-2 rounded-lg border border-[#E5DAC1]/60">
                <span className="text-[#5A6B63] block">단독 51평 / 조립형(16+35)</span>
                <strong className="text-[#1B382E]">
                  {formatNum(adv.availSingle51Keys)}실 / {formatNum(adv.availConnecting51Pairs)}쌍
                </strong>
              </div>
              <div className="bg-white p-2 rounded-lg border border-[#E5DAC1]/60">
                <span className="text-[#5A6B63] block">16평·35평 매진 가능성</span>
                <strong className="text-[#1B382E]">
                  {adv.single16SellProb != null ? formatPct(adv.single16SellProb * 100) : '-'} · {adv.single35SellProb != null ? formatPct(adv.single35SellProb * 100) : '-'}
                </strong>
              </div>
              <div className="bg-white p-2 rounded-lg border border-[#E5DAC1]/60">
                <span className="text-[#5A6B63] block">16평+35평 따로 팔 때 예상 수익</span>
                <strong className="text-[#8C6D3B] font-financial">
                  {formatWon(adv.expectedDisplacementCm51)}
                </strong>
              </div>
              <div className="bg-white p-2 rounded-lg border border-[#E5DAC1]/60">
                <span className="text-[#5A6B63] block">51평 최소 판매 기준 요금 (마지노선)</span>
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
              {meta && (
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="px-3 py-1 rounded-full bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1] text-xs font-extrabold">
                    {meta.startDate} ~ {meta.endDate} ({formatNum(meta.totalDays)}일간) · 총 운영 객실 {formatNum(meta.physicalKeysCapacity)}실 (월 기준 총 {formatNum(meta.fixedMonthlyCapacity)}실 · 기준 가동률 {meta.fixedOccupancyBenchmarkPct != null ? `${meta.fixedOccupancyBenchmarkPct}%` : '-'})
                  </span>
                </div>
              )}

              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1B382E] tracking-tight flex items-center gap-3 flex-wrap">
                <span className="p-2.5 rounded-2xl bg-[#1B3B2B] text-white shadow-xs inline-flex">
                  <Sparkles size={22} className="text-[#B59269]" />
                </span>
                <span>콘도본부 30일 실시간 추천 객실 요금 & 판매 전략</span>
              </h1>
              <p className="text-xs sm:text-sm text-[#5A6B63] mt-1.5 font-medium">
                <strong>2026년 공식 인상 정가</strong>를 완벽히 준수하며, 오늘 각 평형별 <strong>추천 판매 요금(1박)</strong>과 상황별 판매 전략을 즉시 확인합니다.
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
          <div className="mt-4 pt-4 border-t border-[#D0C6BB]/60">
            <div className="bg-[#FAF9F5] p-3.5 sm:p-4 rounded-2xl border border-[#D0C6BB]/80 space-y-3">
              {/* 1행: 가격 추천 방식 (A vs B 버튼 그룹) & 핵심 성과 요약 배지 */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* 좌측: 가격 추천 방식 라벨 + A/B 버튼 그룹 (완벽한 열 정렬 및 그룹화) */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-black text-[#1B382E] shrink-0">
                    <Zap size={14} className="text-[#8C6D3B]" />
                    <span>가격 추천 방식:</span>
                  </div>

                  <div className="inline-flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <button
                      type="button"
                      onClick={() => setSelectedTrack('STANDARD')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 border whitespace-nowrap ${
                        selectedTrack === 'STANDARD'
                          ? 'bg-[#1B3B2B] text-white border-[#1B3B2B] shadow-xs ring-1 ring-[#1B3B2B]'
                          : 'bg-white text-[#5A6B63] border-[#D0C6BB] hover:text-[#1B382E] hover:bg-[#F4F3EE]'
                      }`}
                    >
                      <span>🅰️ 기본 추천 (우리 리조트 예약 중심)</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-financial shrink-0 ${
                        selectedTrack === 'STANDARD' ? 'bg-white/20 text-white' : 'bg-[#F4F3EE] text-[#1E523F]'
                      }`}>
                        {formatSignedWon(trackA?.expectedRevenueGain)}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedTrack('MARKET_ADAPTIVE')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 border whitespace-nowrap ${
                        selectedTrack === 'MARKET_ADAPTIVE'
                          ? 'bg-[#8C6D3B] text-white border-[#8C6D3B] shadow-xs ring-1 ring-[#8C6D3B]'
                          : 'bg-white text-[#8C6D3B] border-[#E5DAC1] hover:bg-[#FAF6ED]'
                      }`}
                    >
                      <span>🅱️ 시장 연동 추천 (주변 경쟁사 만실 반영)</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-financial shrink-0 ${
                        selectedTrack === 'MARKET_ADAPTIVE' ? 'bg-white/20 text-white' : 'bg-[#FAF6ED] text-[#8C6D3B]'
                      }`}>
                        {formatSignedWon(trackB?.expectedRevenueGain)}
                      </span>
                    </button>
                  </div>
                </div>

                {/* 우측: 핵심 수익 요약 배지 */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-3 py-1.5 rounded-xl bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1] font-extrabold font-financial">
                    30일 예상 추가 수익: {formatSignedWon(pricingRec?.expectedRevenueGain)} ({formatSignedPct(pricingRec?.expectedRevenueGainPct)})
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-white text-[#284F42] border border-[#D0C6BB] font-bold font-financial">
                    현재 확정 예약 매출: {formatWon(trackA?.lockedOtbRevenueTotal || pricingRec?.lockedOtbRevenueTotal)} (고정)
                  </span>
                </div>
              </div>

              {/* 2행: 보조 안내 텍스트 & 도구 아코디언 버튼 그룹 (추천방식 1:1 비교, 화면 가이드, 연동 데이터) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2.5 border-t border-[#D0C6BB]/50 text-xs">
                <div className="text-[11px] text-[#5A6B63] font-medium flex items-center gap-1.5">
                  <span>💡 현재 추천:</span>
                  <strong className={selectedTrack === 'STANDARD' ? 'text-[#1B3B2B]' : 'text-[#8C6D3B]'}>
                    {selectedTrack === 'STANDARD' ? '🅰️ 기본 추천 (우리 리조트 예약 상황 중심)' : '🅱️ 시장 연동 추천 (주변 경쟁사 만실 및 요금 변동 실시간 반영)'}
                  </strong>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTrackComparisonAccordion(!showTrackComparisonAccordion)}
                    className={`px-3 py-1.5 rounded-xl font-extrabold flex items-center gap-1 cursor-pointer transition-all border ${
                      showTrackComparisonAccordion
                        ? 'bg-[#8C6D3B] text-white border-[#8C6D3B]'
                        : 'bg-[#FAF6ED] text-[#8C6D3B] border-[#E5DAC1] hover:bg-[#F3EBD8]'
                    }`}
                  >
                    <span>추천방식 1:1 비교</span>
                    {showTrackComparisonAccordion ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowGuideAccordion(!showGuideAccordion)}
                    className={`px-3 py-1.5 rounded-xl font-extrabold flex items-center gap-1 cursor-pointer transition-all border ${
                      showGuideAccordion
                        ? 'bg-[#1B382E] text-white border-[#1B382E]'
                        : 'bg-white text-[#1B382E] border-[#D0C6BB] hover:bg-[#F4F3EE]'
                    }`}
                  >
                    <HelpCircle size={13} />
                    <span>화면 가이드</span>
                    {showGuideAccordion ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSignalsAccordion(!showSignalsAccordion)}
                    className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 cursor-pointer transition-all border ${
                      showSignalsAccordion
                        ? 'bg-[#284F42] text-white border-[#284F42]'
                        : 'bg-white text-[#5A6B63] border-[#D0C6BB] hover:bg-[#F4F3EE]'
                    }`}
                  >
                    <Database size={13} />
                    <span>연동 데이터({formatNum(meta?.dataSignalsUsed?.length)}개)</span>
                    {showSignalsAccordion ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>
              </div>
            </div>

            {/* [접이식] 투트랙(Track A vs Track B) 상세 비교 패널 */}
            {showTrackComparisonAccordion && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                <div
                  onClick={() => setSelectedTrack('STANDARD')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    selectedTrack === 'STANDARD'
                      ? 'bg-[#F4F3EE] border-2 border-[#1B3B2B] shadow-xs'
                      : 'bg-white border-[#D0C6BB]/80 hover:bg-[#FAF9F6]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs sm:text-sm font-black text-[#1B382E]">
                        🅰️ 기본 추천 (우리 리조트 예약 상황 중심)
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#E8F2EE] text-[#1E523F]">
                        안정 방어형
                      </span>
                    </div>
                    <p className="text-[11px] text-[#5A6B63] mb-3 leading-relaxed">
                      우리 리조트의 현재 남은 방과 예약 속도 중심 + 주변 리조트 만실 시 보너스(+1.5%p ~ +3.5%p) 가산
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-xl border border-[#D0C6BB]/50">
                      <span className="text-[10px] text-[#5A6B63] block">30일 신규 예약 예상 매출</span>
                      <strong className="font-black text-[#1B382E] font-financial">{formatSignedWon(trackA?.expectedRevenueGain)}</strong>
                      <span className="text-[10px] font-bold text-[#1E523F] ml-1">({formatSignedPct(trackA?.expectedRevenueGainPct)})</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-[#D0C6BB]/50">
                      <span className="text-[10px] text-[#5A6B63] block">30일 예상 추가 순이익</span>
                      <strong className="font-black text-[#1E523F] font-financial">{formatSignedWon(trackA?.expectedNetContributionMarginGain)}</strong>
                      <span className="text-[10px] font-bold text-[#1E523F] ml-1">({formatSignedPct(trackA?.expectedNetContributionMarginGainPct)})</span>
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setSelectedTrack('MARKET_ADAPTIVE')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    selectedTrack === 'MARKET_ADAPTIVE'
                      ? 'bg-[#FAF6ED] border-2 border-[#8C6D3B] shadow-xs'
                      : 'bg-white border-[#D0C6BB]/80 hover:bg-[#FAF9F6]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs sm:text-sm font-black text-[#8C6D3B]">
                        🅱️ 시장 연동 추천 (주변 경쟁사 만실 및 요금 변동 실시간 반영)
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#8C6D3B] text-white">
                        추천 ({dualTrackSummary?.trackBAdjustedDaysCount != null ? formatNum(dualTrackSummary.trackBAdjustedDaysCount) : '-'}일 보정)
                      </span>
                    </div>
                    <p className="text-[11px] text-[#5A6B63] mb-3 leading-relaxed">
                      주변 4대 리조트의 만실 현황 및 요금 차이를 실시간 반영 (기본 추천 대비 추가 수익 {formatSignedWon(trackDelta?.pickupRevenueDiffKrw)})
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-xl border border-[#D0C6BB]/50">
                      <span className="text-[10px] text-[#5A6B63] block">30일 신규 예약 예상 매출</span>
                      <strong className="font-black text-[#8C6D3B] font-financial">{formatSignedWon(trackB?.expectedRevenueGain)}</strong>
                      <span className="text-[10px] font-bold text-[#8C6D3B] ml-1">({formatSignedPct(trackB?.expectedRevenueGainPct)})</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-[#D0C6BB]/50">
                      <span className="text-[10px] text-[#5A6B63] block">30일 예상 추가 순이익</span>
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
                    벨포레 정규 데이터 연동 현황 (공식 산출 근거)
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

          {/* 📖 [아코디언 B] 다이나믹 프라이싱 실무자 상세 설명 가이드 */}
          {showGuideAccordion && (
            <div className="mt-4 pt-5 border-t-2 border-[#D0C6BB]/70 bg-[#FAF9F6] rounded-2xl p-5 sm:p-6 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-[#1B382E] flex items-center gap-2">
                    <BookOpen size={18} className="text-[#284F42]" />
                    <span>실무자용 쉬운 가이드 — "추천 요금은 어떻게 산출되나요?"</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5A6B63] mt-1 leading-relaxed">
                    <strong>2026년 공식 인상 정가를 100% 출발선</strong>으로 삼고, 과거의 낮은 가격으로 깎이지 않도록 철저히 방어하며 지난 2개년 예약 패턴만 결합해 최적 요금을 도출합니다.
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
                    핵심 1 · 2026 공식 정가 준수
                  </div>
                  <div className="text-sm font-extrabold text-[#1B382E]">
                    과거 요금으로 가격 깎임 전면 배제
                  </div>
                  <p className="text-xs text-[#5A6B63] leading-relaxed">
                    과거 낮은 가격과 단순 평균을 내지 않고, 2026년 실제 판매가를 기본 정가로 고정해 그 위에서만 요금을 인상(Yield-Up)합니다.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-[#D0C6BB]/75 shadow-2xs space-y-1.5">
                  <div className="text-xs font-black text-[#8C6D3B] bg-[#FAF6ED] px-2.5 py-1 rounded-lg inline-block">
                    핵심 2 · 2개년 예약 패턴 분석
                  </div>
                  <div className="text-sm font-extrabold text-[#1B382E]">
                    추석 이동 노이즈 제거 & 62,233건 취소 위험 차감
                  </div>
                  <p className="text-xs text-[#5A6B63] leading-relaxed">
                    2개년 동요일 점유율 및 리드타임 D-k 예약 속도를 결합하여, 11월 주말의 구조적 만실 패턴을 포착하고 D-25 이전에도 선제적으로 요금을 인상합니다.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-[#D0C6BB]/75 shadow-2xs space-y-1.5">
                  <div className="text-xs font-black text-[#1B3B2B] bg-[#E8F2EE] px-2.5 py-1 rounded-lg inline-block">
                    핵심 3 · 숙박업 전용 연휴 전야 규칙
                  </div>
                  <div className="text-sm font-extrabold text-[#1B382E]">
                    공휴일 전야(Eve) 최성수 & 연휴 마감 분리
                  </div>
                  <p className="text-xs text-[#5A6B63] leading-relaxed">
                    달력상 평일이라도 다음 날이 쉬는 날인 밤(연휴 전야)은 토요일 최고 요금으로 자동 편입되며, 연휴 마지막 날 밤은 일요 요금제로 자동 분리됩니다.
                  </p>
                </div>
              </div>

              {/* 4대 액션 코드 & 주요 용어 해설 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-[#D0C6BB]/75 space-y-2.5">
                  <div className="text-xs font-extrabold text-[#1B382E] border-b border-[#D0C6BB]/50 pb-2">
                    🏷️ 4가지 판매 전략 배지 해설
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#E8F2EE] text-[#1E523F] font-extrabold shrink-0">🔥 요금 인상 (YIELD_UP)</span>
                      <span className="text-[#5A6B63]">주말·대기예약·골프 성수일 등 수요 집중 구간입니다. <strong>OTA 할인 특가를 마감하고 기본 정가보다 높여 수익을 극대화</strong>하세요.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#F4F3EE] text-[#284F42] font-extrabold shrink-0">⚖️ 정가 유지 (HOLD)</span>
                      <span className="text-[#5A6B63]">예약 속도가 안정적인 날입니다. <strong>2026년 인상 기본 정가를 방어하면서 주력 복합패키지 판매 비중을 유지</strong>하세요.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#FAF6ED] text-[#8C6D3B] font-extrabold shrink-0">🎁 레저 쿠폰 특전 (BUNDLE_PROMO)</span>
                      <span className="text-[#5A6B63]">체크인 11일 이상 남은 사전 모객 기간(비수기 평일)입니다. 객실 단가를 직접 깎지 말고 <strong>마운틴카트·미디어아트 등 레저 2인 특전을 결합해 사전 모객</strong>하세요.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#FDF0ED] text-[#8B2635] font-extrabold shrink-0">⚡ 긴급 반짝 할인 (FLASH_SALE)</span>
                      <span className="text-[#5A6B63]">D-10 이내 저점유 임박일입니다. 공실 손실 방어를 위해 <strong>최저 하한선 내에서 긴급 회원 타임세일</strong>을 집행하세요.</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-[#D0C6BB]/75 space-y-2.5">
                  <div className="text-xs font-extrabold text-[#1B382E] border-b border-[#D0C6BB]/50 pb-2">
                    📌 핵심 지표 쉽게 이해하기
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <strong className="text-[#1B382E]">▪ 2개년 동요일 점유율 비교:</strong>{' '}
                      <span className="text-[#5A6B63]">작년과 재작년 같은 요일 실측 점유율을 결합하여 특정 연도의 비나 추석 날짜 이동 왜곡을 보정합니다.</span>
                    </div>
                    <div>
                      <strong className="text-[#1B382E]">▪ 계절별 월별 수요 곡선:</strong>{' '}
                      <span className="text-[#5A6B63]">원화 금액을 배제하고, 연평균 대비 해당 월·요일군의 상대적 수요 비율만 추출한 가중치입니다.</span>
                    </div>
                    <div>
                      <strong className="text-[#1B382E]">▪ 조정 허용 범위 (최저 ~ 최고):</strong>{' '}
                      <span className="text-[#5A6B63]">2026년 정가 체계에서 원가를 지키는 최저선과 최대 인상 한도입니다.</span>
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
            <p className="text-sm font-bold text-[#5A6B63]">향후 30일 예약 현황 및 경쟁사 데이터를 기반으로 추천 요금을 불러오는 중입니다...</p>
          </div>
        ) : data && (
          <>
            {/* ====================================================================
                메인 3대 워크스페이스 서브 탭 (Operational Mode Navigation)
               ==================================================================== */}
            <div className="bg-white rounded-3xl p-2.5 sm:p-3 border border-[#D0C6BB]/90 shadow-[0_4px_20px_rgba(27,59,43,0.06)]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveMainTab('DAILY')}
                  className={`p-3.5 sm:p-4 rounded-2xl text-left transition-all cursor-pointer border ${
                    activeMainTab === 'DAILY'
                      ? 'bg-[#1B3B2B] text-white border-[#1B3B2B] shadow-md ring-2 ring-[#1B3B2B]/20'
                      : 'bg-[#FAF9F6] text-[#1B382E] border-[#D0C6BB]/70 hover:bg-[#F4F3EE]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm sm:text-base font-black flex items-center gap-2">
                      <span>📅</span>
                      <span>1. 오늘/날짜별 판매가 실행</span>
                    </span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      activeMainTab === 'DAILY' ? 'bg-white/20 text-white' : 'bg-[#E8F2EE] text-[#1E523F]'
                    }`}>
                      실무·예약실
                    </span>
                  </div>
                  <p className={`text-xs ${activeMainTab === 'DAILY' ? 'text-white/80' : 'text-[#5A6B63]'}`}>
                    오늘 권장가 카드 & 6대 채널 실행가 및 잔여 객실 확인
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMainTab('MATRIX')}
                  className={`p-3.5 sm:p-4 rounded-2xl text-left transition-all cursor-pointer border ${
                    activeMainTab === 'MATRIX'
                      ? 'bg-[#1B3B2B] text-white border-[#1B3B2B] shadow-md ring-2 ring-[#1B3B2B]/20'
                      : 'bg-[#FAF9F6] text-[#1B382E] border-[#D0C6BB]/70 hover:bg-[#F4F3EE]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm sm:text-base font-black flex items-center gap-2">
                      <span>📊</span>
                      <span>2. 30일 가격 캘린더 (Matrix)</span>
                    </span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      activeMainTab === 'MATRIX' ? 'bg-white/20 text-white' : 'bg-[#FAF6ED] text-[#8C6D3B]'
                    }`}>
                      월간·마케팅
                    </span>
                  </div>
                  <p className={`text-xs ${activeMainTab === 'MATRIX' ? 'text-white/80' : 'text-[#5A6B63]'}`}>
                    향후 30일 전체 일정의 평형별 권장가 및 마케팅 전략 필터
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMainTab('ANALYTICS')}
                  className={`p-3.5 sm:p-4 rounded-2xl text-left transition-all cursor-pointer border ${
                    activeMainTab === 'ANALYTICS'
                      ? 'bg-[#1B3B2B] text-white border-[#1B3B2B] shadow-md ring-2 ring-[#1B3B2B]/20'
                      : 'bg-[#FAF9F6] text-[#1B382E] border-[#D0C6BB]/70 hover:bg-[#F4F3EE]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm sm:text-base font-black flex items-center gap-2">
                      <span>📡</span>
                      <span>3. 경쟁사 분석 & 경영 리포트</span>
                    </span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      activeMainTab === 'ANALYTICS' ? 'bg-white/20 text-white' : 'bg-[#E8F2EE] text-[#284F42]'
                    }`}>
                      경영진·전략
                    </span>
                  </div>
                  <p className={`text-xs ${activeMainTab === 'ANALYTICS' ? 'text-white/80' : 'text-[#5A6B63]'}`}>
                    충청권 4대 경쟁사 낙수수요(Spillover), 재무 KPI 및 시계열
                  </p>
                </button>
              </div>
            </div>

            {/* ====================================================================
                [탭 1] 오늘/날짜별 판매가 실행 (Daily Operations)
               ==================================================================== */}
            {activeMainTab === 'DAILY' && (
              <div className="space-y-6">
                {/* 1. [최상단 마스터 요약표] 한눈에 보는 6대 평형별 × 요일별 기준 정가 & 향후 30일 추천 평균 요금 */}
                <div className="bg-white rounded-3xl border-2 border-[#1B3B2B]/85 shadow-[0_6px_24px_rgba(27,59,43,0.08)] overflow-hidden">
              <div className="p-5 sm:p-6 bg-gradient-to-r from-[#1B3B2B] via-[#284F42] to-[#1B3B2B] text-white flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-lg bg-[#B59269] text-white text-xs font-black">
                      한눈에 보는 평형별 요금 기준표
                    </span>
                    <h2 className="text-lg sm:text-xl font-black tracking-tight">
                      6대 객실 평형별 기본 정가 & 향후 {formatNum(meta?.totalDays)}일 추천 평균 요금
                    </h2>
                  </div>
                  <p className="text-xs text-white/80 mt-1 font-medium">
                    각 평형을 <strong>평일·금요일·토요일·일요일에 정가 얼마를 기준으로 삼고, 30일 평균 얼마에 판매해야 하는지</strong> 한눈에 요약한 표입니다. (평형 클릭 시 필터 적용)
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
                      <th className="py-3.5 px-5">객실 평형 (보유 객실)</th>
                      <th className="py-3.5 px-4 text-right">평일 정가 (월~목)</th>
                      <th className="py-3.5 px-4 text-right">금요일 정가</th>
                      <th className="py-3.5 px-4 text-right bg-[#FAF6ED] text-[#8C6D3B]">★ 토요일 · 연휴 정가</th>
                      <th className="py-3.5 px-4 text-right">일요일 정가</th>
                      <th className="py-3.5 px-5 text-right bg-[#E8F2EE]/70 text-[#1B382E] text-sm">
                        🎯 30일 추천 평균 요금 (1박)
                      </th>
                      <th className="py-3.5 px-4 text-right">조정 허용 범위 (최저 ~ 최고)</th>
                      <th className="py-3.5 px-4 text-right">30일간 현재 예약 완료 (예약률)</th>
                      <th className="py-3.5 px-4">추천 레저 결합 혜택</th>
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
                              <span className="text-[10px] text-[#5A6B63] block" title="2026년에 실제로 판매된 객실 평균 단가 (가격 방어 기준점)">
                                2026 실측 (기준점)
                              </span>
                              <strong className="text-[#1B382E] font-financial">{formatWon(bm.adr2026RecentRetail)}</strong>
                            </div>
                            <div className="bg-[#E8F2EE]/70 px-2 py-1 rounded-lg">
                              <span className="text-[10px] text-[#1E523F] font-bold block" title="평일(월~목 65% 비중)이 포함된 향후 30일 달력 평균가">
                                30일 추천 평균
                              </span>
                              <strong className="text-[#1E523F] font-black font-financial">{formatWon(bm.next30dAvgRecommendedAdr)}</strong>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 30일 추천 평균 vs 실측 기준점 차이 해설 배너 */}
                  <div className="mt-3.5 pt-3 border-t border-[#D0C6BB]/60 flex items-start gap-2.5 text-xs text-[#5A6B63] bg-white p-3.5 rounded-xl border border-[#D0C6BB]/75 shadow-2xs">
                    <HelpCircle size={16} className="text-[#8C6D3B] shrink-0 mt-0.5" />
                    <div className="space-y-0.5 leading-relaxed">
                      <strong className="font-extrabold text-[#1B382E] block">
                        💡 30일 추천 평균이 2026 실측보다 항상 작아 보이는 이유 (달력 요일 구성비 차이)
                      </strong>
                      <p>
                        <strong>2026 실측(기준점)</strong>은 예약이 집중된 주말·성수기 고가 구간에 실제 판매된 방들의 가중평균인 반면, <strong>30일 추천 평균</strong>은 한 달 30일 중 약 65%를 차지하는 <strong>평일(월~목 18~20일) 정가</strong>가 모두 포함된 30일 달력 전체의 단순 평균값입니다. 즉, <strong>가격을 깎아서 추천하는 것이 아니며</strong> 주말에는 여전히 실측보다 높은 추천 요금을 수호합니다.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ====================================================================
                2. [날짜별 평형 판매가 즉시 확인 보드] 날짜 클릭 ➔ 6대 평형별 오늘 추천 판매 요금 대형 카드
               ==================================================================== */}
            {selectedDayItem && (
              <div className="bg-white rounded-3xl p-6 lg:p-7 border border-[#D0C6BB]/90 shadow-[0_6px_28px_rgba(27,59,43,0.08)] space-y-5">
                {/* 2-A. 날짜 빠른 선택 스크롤 바 */}
                <div className="space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-lg bg-[#1B3B2B] text-white text-xs font-black">
                        날짜별 판매 요금 확인
                      </span>
                      <span className="text-xs sm:text-sm font-extrabold text-[#1B382E]">
                        날짜를 클릭하면 아래에 해당 숙박일의 <strong>6대 평형별 오늘 추천 판매 요금(1박)과 판매 전략</strong>이 즉시 표시됩니다
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
                          className={`px-3.5 py-2.5 rounded-2xl border text-left transition-all shrink-0 cursor-pointer min-w-[120px] h-[88px] flex flex-col justify-between ${
                            isSel
                              ? 'bg-[#1B3B2B] text-white border-[#0F291E] shadow-md scale-[1.02]'
                              : 'bg-[#FAF9F6] hover:bg-[#F4F3EE] text-[#1B382E] border-[#D0C6BB]/80'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1.5">
                              <span className={`text-xs font-black ${
                                isSel ? 'text-white' : isSat ? 'text-[#8C6D3B]' : isSunOrHol ? 'text-[#8B2635]' : 'text-[#1B382E]'
                              }`}>
                                {formatShortDate(day.date)}({day.dayOfWeek})
                              </span>
                              <span className={`w-2 h-2 rounded-full shrink-0 ${isSel ? 'bg-[#B59269]' : st.dot}`} />
                            </div>
                            <div className={`text-xs font-extrabold mt-0.5 font-financial ${isSel ? 'text-[#EAE3D2]' : 'text-[#284F42]'}`}>
                              추천 {formatWon(day.pricing?.recommendedAdr)}
                            </div>
                          </div>

                          <div className="pt-1 border-t border-black/5 flex items-center justify-between text-[10px]">
                            <span className={`font-medium ${isSel ? 'text-white/80' : 'text-[#5A6B63]'}`}>
                              남은 방 {formatNum(day.inventory?.remainingKeys)}실
                            </span>
                            {day.dualTrack?.trackDelta?.recommendedAdrDeltaKrw != null && day.dualTrack.trackDelta.recommendedAdrDeltaKrw !== 0 ? (
                              <span className={`text-[9px] font-black truncate max-w-[50px] ${
                                isSel ? 'text-[#FAF6ED]' : day.dualTrack.trackDelta.recommendedAdrDeltaKrw > 0 ? 'text-[#8C6D3B]' : 'text-[#8B2635]'
                              }`}>
                                B{formatSignedWon(day.dualTrack.trackDelta.recommendedAdrDeltaKrw)}
                              </span>
                            ) : (
                              <span className={`text-[9px] ${isSel ? 'text-white/60' : 'text-[#5A6B63]'}`}>
                                D-{day.leadDays ?? '-'}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2-B. 선택한 날짜 타이틀 & 요약 바 (심플 & 직관적) */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-[#F4F3EE] px-5 py-4 rounded-2xl border border-[#D0C6BB]">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-lg sm:text-xl font-black text-[#1B382E]">
                      📅 {selectedDayItem.date} ({selectedDayItem.dayOfWeek}요일 · {selectedDayItem.dayTypeLabel}) 평형별 오늘 추천 판매 요금 (1박)
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
                        <span>시장 연동 보정 {formatSignedWon(selectedDayItem.dualTrack.trackDelta.recommendedAdrDeltaKrw)}</span>
                      </span>
                    )}
                    {selectedDayItem.pricing?.channelRateGuide?.groupBookingPolicyLabel && (() => {
                      const gGuide = selectedDayItem.pricing.channelRateGuide;
                      const pStyle = getGroupPolicyBadgeStyle(gGuide.groupBookingPolicyStatus);
                      return (
                        <span className={`px-2.5 py-1 rounded-xl text-xs font-black border flex items-center gap-1 ${pStyle.bg} ${pStyle.text} ${pStyle.border}`}>
                          <span>{pStyle.icon}</span>
                          <span>{gGuide.groupBookingPolicyLabel}</span>
                        </span>
                      );
                    })()}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="px-3 py-1.5 rounded-xl bg-white border border-[#D0C6BB]/80 font-bold text-[#1B382E]">
                      전체 남은 방: <strong className="text-[#284F42] font-black">{formatNum(selectedDayItem.inventory?.remainingKeys)}실</strong> (현재 예약률 {formatPct(selectedDayItem.inventory?.currentOtbOccupancyPct)} ➔ 최종 예상 {formatPct(selectedDayItem.inventory?.projectedOccupancyPct)})
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSelectedDayDetailAccordion(!showSelectedDayDetailAccordion)}
                      className={`px-3.5 py-1.5 rounded-xl font-extrabold flex items-center gap-1.5 cursor-pointer transition-all border ${
                        showSelectedDayDetailAccordion
                          ? 'bg-[#1E523F] text-white border-[#1E523F] shadow-xs'
                          : 'bg-[#1B3B2B] text-white border-[#1B3B2B] hover:bg-[#0F291E]'
                      }`}
                    >
                      <Radio size={13} />
                      <span>{showSelectedDayDetailAccordion ? '경쟁사 요금 비교 & 채널별 판매 단가표 접기' : '🔍 경쟁사 요금 비교 & 채널별 판매 단가표 펼치기'}</span>
                      {showSelectedDayDetailAccordion ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>
                </div>

                {/* 2-B-0. 당일 충청권 4대 경쟁사 최저가 상품 1초 요약 티커 바 */}
                {selectedDayItem.competitorBenchmark?.resorts && selectedDayItem.competitorBenchmark.resorts.length > 0 && (
                  <div className="bg-[#FAF9F5] p-3.5 rounded-2xl border border-[#D0C6BB]/80 flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 text-xs">
                    <div className="flex items-center gap-2 font-black text-[#1B382E] shrink-0">
                      <Radio size={15} className="text-[#1E523F]" />
                      <span>[{selectedDayItem.date}] 주변 4대 경쟁사 실시간 판매 상품 요약:</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 w-full xl:w-auto">
                      {selectedDayItem.competitorBenchmark.resorts.map((r) => {
                        const isSold = r.isSoldOut;
                        const gap = r.vsBelleforetGapKrw ?? 0;
                        return (
                          <div
                            key={r.resortName}
                            className="bg-white px-3 py-2 rounded-xl border border-[#D0C6BB]/60 flex items-center justify-between gap-2 shadow-2xs"
                          >
                            <div className="truncate">
                              <div className="flex items-center gap-1.5">
                                <strong className="text-xs font-black text-[#1B382E]">{r.resortName}</strong>
                                <span className="text-[10px] text-[#284F42] bg-[#E8F2EE] px-1.5 py-0.2 rounded font-extrabold shrink-0">
                                  {r.lowestChannel || '온라인'}
                                </span>
                              </div>
                              <p className="text-[10px] text-[#5A6B63] truncate max-w-[150px] mt-0.5" title={r.lowestRoomName || ''}>
                                {r.lowestRoomName || (isSold ? '품절 마감' : '-')}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs font-black text-[#1B3B2B] font-financial block">
                                {isSold ? '품절' : formatWon(r.minPrice)}
                              </span>
                              {r.vsBelleforetGapKrw != null && (
                                <span className={`text-[9px] font-bold block ${gap > 0 ? 'text-[#1E523F]' : gap < 0 ? 'text-[#8B2635]' : 'text-[#5A6B63]'}`}>
                                  {gap > 0 ? `+${formatWon(gap)}` : gap < 0 ? `-${formatWon(Math.abs(gap))}` : '0원'}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2-B-1. [아코디언 내용] 버튼 바로 아래에 즉시 펼쳐지는 경쟁사 비교 레이더 & 11열 상세표 & 채널별 실행가 */}
                {showSelectedDayDetailAccordion && (
                  <div className="p-4 sm:p-5 bg-white rounded-3xl border-2 border-[#1B3B2B]/60 shadow-md space-y-4">
                    <div className="flex items-center justify-between bg-[#E8F2EE] px-4 py-2.5 rounded-2xl border border-[#B4C6C1] text-xs">
                      <div className="flex items-center gap-2 font-black text-[#1E523F]">
                        <Radio size={14} className="text-[#1E523F]" />
                        <span>[{selectedDayItem.date}] 충청권 4대 경쟁 리조트 요금 비교 & 평형별 산출 근거 상세 (펼쳐짐)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowSelectedDayDetailAccordion(false)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#B4C6C1] text-[#1E523F] font-extrabold hover:bg-[#F4F3EE] cursor-pointer"
                      >
                        상세 근거 닫기 ✕
                      </button>
                    </div>

                    {renderCompetitorDrawer(selectedDayItem)}

                    {/* 11열 상세 비교표 */}
                    <div className="bg-[#FAF9F6] rounded-2xl p-4 border border-[#D0C6BB]/75 overflow-x-auto">
                      <div className="text-xs font-extrabold text-[#1B382E] mb-2.5">
                        📊 [{selectedDayItem.date}] 6대 평형별 산출 지표 11열 상세 비교표
                      </div>
                      <table className="w-full text-left border-collapse whitespace-nowrap min-w-[920px] bg-white rounded-xl overflow-hidden">
                        <thead>
                          <tr className="bg-[#F4F3EE] text-[#5A6B63] text-xs font-extrabold border-b border-[#D0C6BB]/80">
                            <th className="py-2.5 px-4">평형명</th>
                            <th className="py-2.5 px-4 text-right">보유 객실</th>
                            <th className="py-2.5 px-4 text-right">확정 예약</th>
                            <th className="py-2.5 px-4 text-right">남은 빈방</th>
                            <th className="py-2.5 px-4 text-right">예약률</th>
                            <th className="py-2.5 px-4 text-right">2025 실제 판매가</th>
                            <th className="py-2.5 px-4 text-right">2026 실제 판매가</th>
                            <th className="py-2.5 px-4 text-right">기본 정가</th>
                            <th className="py-2.5 px-4 text-right">추천 판매가 (인상률)</th>
                            <th className="py-2.5 px-4 text-right">조정 허용 범위 (최저~최고)</th>
                            <th className="py-2.5 px-4 text-center">판매 전략</th>
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

                    {/* 채널별 실행 단가 가이드 및 단체 네고 하한선 테이블 */}
                    <div className="bg-[#FAF9F6] rounded-2xl p-4 border border-[#D0C6BB]/75 overflow-x-auto">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                        <div className="text-xs font-extrabold text-[#1B382E] flex items-center gap-2">
                          <Tag size={14} className="text-[#1E523F]" />
                          <span>[{selectedDayItem.date}] 6대 평형별 채널별 추천 판매 단가표 & 단체 네고 마지노선</span>
                        </div>
                        {selectedDayItem.pricing?.channelRateGuide && (() => {
                          const g = selectedDayItem.pricing.channelRateGuide;
                          const pStyle = getGroupPolicyBadgeStyle(g.groupBookingPolicyStatus);
                          return (
                            <span className={`px-2.5 py-0.5 rounded text-[11px] font-black border ${pStyle.bg} ${pStyle.text} ${pStyle.border}`}>
                              {pStyle.icon} 단체 수주 정책: {g.groupBookingPolicyLabel}
                            </span>
                          );
                        })()}
                      </div>
                      <table className="w-full text-left border-collapse whitespace-nowrap min-w-[920px] bg-white rounded-xl overflow-hidden text-xs">
                        <thead>
                          <tr className="bg-[#F4F3EE] text-[#5A6B63] font-extrabold border-b border-[#D0C6BB]/80">
                            <th className="py-2.5 px-4">평형 구분</th>
                            <th className="py-2.5 px-4 text-right">오늘 추천 판매가</th>
                            <th className="py-2.5 px-4 text-right">홈페이지·앱 직판 (2.5%)</th>
                            <th className="py-2.5 px-4 text-right">야놀자 등 온라인 (12% 방어)</th>
                            <th className="py-2.5 px-4 text-right">기업 휴양소 계약가</th>
                            <th className="py-2.5 px-4 text-right">단체 행사 기본가</th>
                            <th className="py-2.5 px-4 text-right bg-[#FAF6ED] text-[#8C6D3B]">★ 단체 네고 마지노선 (이 밑은 거절)</th>
                            <th className="py-2.5 px-4 text-right">분양 회원 약정가</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#D0C6BB]/40">
                          {(selectedDayItem.roomTypes || []).map((rt) => {
                            const cr = rt.channelRateGuide;
                            return (
                              <tr key={`channel-${rt.roomType}`} className="hover:bg-[#F4F3EE]/50">
                                <td className="py-2.5 px-4 font-extrabold text-[#1B382E]">{rt.roomType}</td>
                                <td className="py-2.5 px-4 text-right font-black text-[#1B3B2B] font-financial">{formatWon(rt.recommendedAdr)}</td>
                                <td className="py-2.5 px-4 text-right font-bold text-[#1B382E] font-financial">{formatWon(cr?.fitDirectWebAdr)}</td>
                                <td className="py-2.5 px-4 text-right font-bold text-[#1B382E] font-financial">{formatWon(cr?.fitOtaListedAdr)}</td>
                                <td className="py-2.5 px-4 text-right text-[#5A6B63] font-financial">{formatWon(cr?.corporateResortContractAdr)}</td>
                                <td className="py-2.5 px-4 text-right text-[#5A6B63] font-financial">{formatWon(cr?.groupSeminarContractBaseAdr)}</td>
                                <td className="py-2.5 px-4 text-right font-black text-[#8C6D3B] bg-[#FAF6ED]/50 font-financial">{formatWon(cr?.groupSeminarWalkAwayFloorAdr)}</td>
                                <td className="py-2.5 px-4 text-right text-[#5A6B63] font-financial">{formatWon(cr?.memberContractAdr)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 2-B-2. 당일 6대 채널별 확정 예약 현황 & 베이스 선점 */}
                {selectedDayItem.inventory?.channelBreakdown && (() => {
                  const cb = selectedDayItem.inventory.channelBreakdown;
                  return (
                    <div className="bg-[#FAF9F5] p-3.5 rounded-2xl border border-[#D0C6BB]/80 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 font-black text-[#1B382E]">
                          <Users size={14} className="text-[#1E523F]" />
                          <span>당일 6대 판매채널별 확정 예약 현황 (총 {formatNum(selectedDayItem.inventory?.otbRoomsBooked)}실 예약 완료)</span>
                        </div>
                        <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-[#FAF6ED] text-[#8C6D3B] border border-[#E5DAC1]">
                          단체·기업휴양소·골프 미리 확보(선점): {formatNum(cb.contractedBaseRooms)}실 ({formatPct(cb.contractedBaseSharePct)})
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                        <div className="bg-white p-2.5 rounded-xl border border-[#D0C6BB]/50">
                          <span className="text-[10px] text-[#5A6B63] block">홈페이지·앱 직판/패키지</span>
                          <strong className="text-[#1B382E] font-financial">{formatNum(cb.fitDirectRooms)}실</strong>
                          <span className="text-[10px] text-[#5A6B63] ml-1">({formatPct(cb.fitDirectSharePct)})</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-[#D0C6BB]/50">
                          <span className="text-[10px] text-[#5A6B63] block">온라인 여행사 (야놀자 등)</span>
                          <strong className="text-[#1B382E] font-financial">{formatNum(cb.fitOtaRooms)}실</strong>
                          <span className="text-[10px] text-[#5A6B63] ml-1">({formatPct(cb.fitOtaSharePct)})</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-[#D0C6BB]/50">
                          <span className="text-[10px] text-[#1E523F] font-bold block">골프 18·36홀 숙박 패키지</span>
                          <strong className="text-[#1E523F] font-financial">{formatNum(cb.golfPkgRooms)}실</strong>
                          <span className="text-[10px] text-[#1E523F] ml-1">({formatPct(cb.golfPkgSharePct)})</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-[#D0C6BB]/50">
                          <span className="text-[10px] text-[#5A6B63] block">기업 휴양소 (현대·삼성 등)</span>
                          <strong className="text-[#1B382E] font-financial">{formatNum(cb.corporateResortRooms)}실</strong>
                          <span className="text-[10px] text-[#5A6B63] ml-1">({formatPct(cb.corporateResortSharePct)})</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-[#D0C6BB]/50">
                          <span className="text-[10px] text-[#8C6D3B] font-bold block">단체 행사 (세미나·워크숍)</span>
                          <strong className="text-[#8C6D3B] font-financial">{formatNum(cb.groupSeminarRooms)}실</strong>
                          <span className="text-[10px] text-[#8C6D3B] ml-1">({formatPct(cb.groupSeminarSharePct)})</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-[#D0C6BB]/50">
                          <span className="text-[10px] text-[#5A6B63] block">분양 회원 (1/6·1/12구좌)</span>
                          <strong className="text-[#1B382E] font-financial">{formatNum(cb.memberResortRooms)}실</strong>
                          <span className="text-[10px] text-[#5A6B63] ml-1">({formatPct(cb.memberResortSharePct)})</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

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
                              {isSoldOut ? '매진 (남은 방 0실)' : `남은 방 ${formatNum(rt.remainingSellable)}실`}
                              <span className="text-[#5A6B63] font-normal ml-1">/ 총 {formatNum(rt.capacity)}실</span>
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
                            <span>오늘 추천 판매 요금 (1박)</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                              adj > 0
                                ? 'bg-[#E8F2EE] text-[#1E523F]'
                                : adj < 0
                                ? 'bg-[#FDF0ED] text-[#8B2635]'
                                : 'bg-[#F4F3EE] text-[#5A6B63]'
                            }`}>
                              기본 정가 대비 {formatSignedPct(rt.adjustmentPct)}
                            </span>
                          </div>

                          <div className="flex items-baseline justify-between gap-2 mt-1">
                            <div className="text-xs text-[#5A6B63]">
                              <span>기본 정가: </span>
                              <span className="font-bold line-through">{formatWon(rt.baselineAdr)}</span>
                            </div>
                            <div className="text-2xl sm:text-3xl font-black text-[#1B3B2B] font-financial tracking-tight">
                              {formatWon(rt.recommendedAdr)}
                            </div>
                          </div>

                          {hasRoomTrackDiff && (
                            <div className="mt-2 pt-2 border-t border-[#D0C6BB]/50 flex items-center justify-between text-[11px] font-bold">
                              <span className="text-[#5A6B63]">기본 추천 {formatWon(trackARoomPrice)}</span>
                              <span className="text-[#8C6D3B] font-extrabold">➔ 시장 연동 추천 {formatWon(trackBRoomPrice)}</span>
                            </div>
                          )}
                        </div>

                        {/* 하단: 허용 범위 & 현재 예약률 */}
                        <div className="flex items-center justify-between text-xs text-[#5A6B63] px-1">
                          <span>
                            조정 허용 범위: <strong className="text-[#8B2635]">{formatWon(rt.floorAdr)}</strong> ~ <strong className="text-[#1E523F]">{formatWon(rt.ceilingAdr)}</strong>
                          </span>
                          <span>
                            확정 예약 <strong className="text-[#1B382E]">{formatNum(rt.otbBooked)}실 (예약률 {formatPct(rt.otbOccupancyPct)})</strong>
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
                      🎯 주력 판매처: {selectedDayItem.marketing?.targetChannel || '-'}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#FAF6ED] border border-[#E5DAC1] font-extrabold text-[#8C6D3B]">
                      🎁 포함 특전: {selectedDayItem.marketing?.promoBundleItem || '-'}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#E8F2EE] border border-[#B4C6C1] font-extrabold text-[#1E523F]">
                      ⛳ 골프 예약 {formatNum(selectedDayItem.inventory?.golfBookedTeams)}팀
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-[#D0C6BB]/70 font-bold text-[#8B2635]">
                      대기 예약 {formatNum(selectedDayItem.inventory?.waitingRoomsCount)}건
                    </span>
                  </div>
                </div>
              </div>
            )}
              </div>
            )}

            {/* ====================================================================
                [탭 2] 30일 가격 매트릭스 캘린더 (Matrix Grid)
               ==================================================================== */}
            {activeMainTab === 'MATRIX' && (
              <div className="space-y-6">
                {/* 3. [향후 30일 일자별 × 평형별 권장 판매가 전체 일람표 (Matrix)] */}
                <div className="bg-white rounded-3xl border border-[#D0C6BB]/80 shadow-[0_4px_24px_rgba(40,79,66,0.06)] overflow-hidden">
              <div className="p-6 bg-[#F4F3EE] border-b border-[#D0C6BB]/75 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-[#1B382E] flex items-center gap-2">
                      <Calendar size={20} className="text-[#1B3B2B]" />
                      <span>향후 {formatNum(meta?.totalDays)}일 일자별 × 평형별 추천 판매 요금 전체 일람표 (1박 요금표)</span>
                    </h2>
                    <p className="text-xs text-[#5A6B63] mt-0.5 font-medium">
                      날짜별로 <strong>16평 · 35평 · 51평 · 펫룸의 오늘 추천 요금과 남은 빈방</strong>을 한눈에 확인합니다. (날짜 행을 누르면 상세 분석이 열립니다)
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
                      <span>🔥 요금 인상 (수요 집중)</span>
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
                      <span>⚖️ 정가 유지 (안정세)</span>
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
                      <span>🎁 레저 쿠폰 특전 (비수기)</span>
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
                      <span>⚡ 긴급 반짝 할인 (공실 방어)</span>
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
                                <div className="text-xs sm:text-sm font-black">{rtName} 추천 요금</div>
                                <div className="text-[10px] font-bold text-[#5A6B63]">1박 추천가 (인상률 · 남은 방)</div>
                              </th>
                            );
                          })}
                          <th className="py-3.5 px-4 text-right border-l border-[#D0C6BB]/50">전체 남은 방 (예약률)</th>
                          <th className="py-3.5 px-4">예약 상황 / 포함 특전</th>
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
                                    <span>{day.marketing?.actionCode === 'YIELD_UP' ? '요금인상' : day.marketing?.actionCode === 'HOLD' ? '정가유지' : day.marketing?.actionCode === 'BUNDLE_PROMO' ? '쿠폰특전' : day.marketing?.actionCode === 'FLASH_SALE' ? '반짝할인' : day.marketing?.actionLabel}</span>
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
                                              {isSoldOut ? '매진(0실)' : `남은 방 ${formatNum(rt.remainingSellable)}실`}
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
                                    남은 방 {formatNum(day.inventory?.remainingKeys)}실
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
                                            <span>[{day.date} ({day.dayOfWeek})] 일자별 맞춤 판매 가이드 & 평형별 조정 허용 범위</span>
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
              </div>
            )}

            {/* ====================================================================
                [탭 3] 경쟁사 분석 & 경영 리포트 (Market Intelligence)
               ==================================================================== */}
            {activeMainTab === 'ANALYTICS' && (
              <div className="space-y-6">
                {/* 4. [아코디언 D] 향후 30일 핵심 지표 & 충청권 4대 경쟁 리조트 만실 반사이익 분석 */}
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
                      향후 {formatNum(meta?.totalDays)}일 핵심 경영 지표 & 충청권 4대 경쟁 리조트 만실 반사이익 분석
                    </h2>
                    <span className="text-xs font-bold text-[#1E523F] bg-[#E8F2EE] px-2.5 py-0.5 rounded-full border border-[#B4C6C1]">
                      30일 예상 추가 수익 {formatSignedWon(pricingRec?.expectedRevenueGain)} · 주변 만실 {formatNum(competitorMarket?.highCompressionDaysCount)}일
                    </span>
                  </div>
                  <p className="text-xs text-[#5A6B63] mt-1 font-medium">
                    30일간 현재 예약된 방, 2025 vs 2026 실제 판매 요금 비교, 예상 추가 수익 및 주변 리조트 품절 시 고객 유입 효과를 확인합니다.
                  </p>
                </div>

                <div className="px-4 py-2 rounded-xl bg-[#F4F3EE] border border-[#D0C6BB] text-xs font-extrabold text-[#1B382E] flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                  <span>{showKpiSpilloverAccordion ? '핵심 지표 & 경쟁사 분석 접기' : '핵심 지표 & 경쟁사 분석 펼치기'}</span>
                  {showKpiSpilloverAccordion ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </div>
              </button>

              {showKpiSpilloverAccordion && (
                <div className="p-6 lg:p-7 pt-3 border-t border-[#D0C6BB]/60 bg-[#FAF9F6] space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {/* KPI 1 */}
                    <div className="bg-white rounded-2xl p-5 border border-[#D0C6BB]/75 space-y-2 flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-extrabold text-[#5A6B63]">1. 30일간 현재 예약 완료 (예약률)</div>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-2xl font-black text-[#1B382E] font-financial">{formatPct(currentOtb?.currentOtbOccupancyPct)}</span>
                          <span className="text-xs font-extrabold text-[#1E523F]">➔ 최종 예상 {formatPct(currentOtb?.projectedOccupancyPct)}</span>
                        </div>
                      </div>
                      <div className="text-xs text-[#5A6B63] pt-1 border-t border-[#D0C6BB]/30">
                        확정 {formatNum(currentOtb?.totalOccupiedKeys)} / 총 {formatNum(currentOtb?.totalCapacityKeys)}실 (예약 {formatNum(currentOtb?.totalBookedRooms)}건)
                      </div>
                    </div>

                    {/* KPI 2 */}
                    <div className="bg-white rounded-2xl p-5 border border-[#D0C6BB]/75 space-y-2 flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-extrabold text-[#5A6B63]">2. 2025 vs 2026 실제 판매 요금 비교</div>
                        <div className="flex items-baseline gap-2 font-financial mt-1">
                          <span className="text-sm text-[#5A6B63] line-through">{formatWon(hist2025?.retailAdr)}</span>
                          <span className="text-2xl font-black text-[#1B382E]">{formatWon(recent2026?.retailAdr)}</span>
                        </div>
                      </div>
                      <div className="text-xs font-extrabold text-[#1E523F] pt-1 border-t border-[#D0C6BB]/30">
                        작년 대비 {formatSignedPct(recent2026?.yoyRetailAdrGrowthPct)} 인상 적용
                      </div>
                    </div>

                    {/* KPI 3 */}
                    <div className="bg-white rounded-2xl p-5 border border-[#D0C6BB]/75 space-y-2 flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-extrabold text-[#5A6B63]">3. 향후 30일 추천 평균 요금 (1박)</div>
                        <div className="flex items-baseline gap-2 font-financial mt-1">
                          <span className="text-2xl font-black text-[#1B3B2B]">{formatWon(pricingRec?.avgRecommendedAdr)}</span>
                          <span className="text-xs font-extrabold text-[#1E523F]">({formatSignedPct(pricingRec?.avgAdrLiftPct)})</span>
                        </div>
                      </div>
                      <div className="text-xs text-[#5A6B63] pt-1 border-t border-[#D0C6BB]/30">
                        기본 정가 평균: {formatWon(pricingRec?.avgBaselineAdr)}
                      </div>
                    </div>

                    {/* KPI 4 */}
                    <div className="bg-[#1B3B2B] text-white rounded-2xl p-5 space-y-2 flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-extrabold text-white/80">4. 30일 추천 요금 적용 시 추가 수익</div>
                        <div className="flex items-baseline gap-2 font-financial mt-1">
                          <span className="text-2xl font-black text-[#EAE3D2]">{formatSignedWon(pricingRec?.expectedRevenueGain)}</span>
                          <span className="text-xs font-extrabold text-[#B59269]">({formatSignedPct(pricingRec?.expectedRevenueGainPct)})</span>
                        </div>
                      </div>
                      <div className="text-xs text-white/80 font-financial pt-1 border-t border-white/20">
                        총 예상 매출 (전체): {formatWon(pricingRec?.dynamicProjectedRevenue)}
                      </div>
                    </div>
                  </div>

                  {/* 경쟁사 낙수수요 배너 */}
                  {competitorMarket && (
                    <div className="bg-white rounded-2xl p-5 border border-[#D0C6BB]/80 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="text-sm font-black text-[#1B382E] flex items-center gap-2">
                          <Radio size={15} className="text-[#1B3B2B]" />
                          <span>충청권 4대 경쟁 리조트 실시간 현황 & 주변 만실 반사이익 분석</span>
                        </div>
                        <span className="text-xs font-bold text-[#5A6B63]">수집 시각: {competitorMarket.snapshotCollectedAt || '-'}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                        <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#D0C6BB]/60">
                          <span className="text-[#8B2635] font-bold block">🔥 주변 만실 집중일 ({formatNum(spillover?.highCompressionGroup?.daysCount)}일)</span>
                          <strong className="text-lg font-black text-[#1B382E] font-financial">
                            {spillover?.highCompressionGroup?.avgRecent7dPickupRoomsPerDay != null ? `${spillover.highCompressionGroup.avgRecent7dPickupRoomsPerDay}실/일` : '-'}
                          </strong>
                          <span className="block text-[11px] text-[#5A6B63] mt-0.5">최근 7일간 신규 유입 {formatNum(spillover?.highCompressionGroup?.totalRecent7dPickupRooms)}실</span>
                        </div>
                        <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#D0C6BB]/60">
                          <span className="text-[#5A6B63] font-bold block">평시 일반 구간 ({formatNum(spillover?.normalMarketGroup?.daysCount)}일)</span>
                          <strong className="text-lg font-black text-[#5A6B63] font-financial">
                            {spillover?.normalMarketGroup?.avgRecent7dPickupRoomsPerDay != null ? `${spillover.normalMarketGroup.avgRecent7dPickupRoomsPerDay}실/일` : '-'}
                          </strong>
                          <span className="block text-[11px] text-[#5A6B63] mt-0.5">만실 시 예약 유입 속도 {spillover?.spilloverPickupVelocityRatio != null ? `${spillover.spilloverPickupVelocityRatio}배` : '-'}</span>
                        </div>
                        <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#D0C6BB]/60">
                          <span className="text-[#284F42] font-bold block">현재 확정 예약 매출 (고정 불변)</span>
                          <strong className="text-lg font-black text-[#1B382E] font-financial">{formatWon(pricingRec?.lockedOtbRevenueTotal)}</strong>
                          <span className="block text-[11px] text-[#1E523F] mt-0.5">확정 완료 {formatNum(counterfactual?.totalSurvivingOtbUnits)}실 (오차 0원)</span>
                        </div>
                        <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#D0C6BB]/60">
                          <span className="text-[#1E523F] font-bold block">앞으로 팔 방의 예상 추가 이익</span>
                          <strong className="text-lg font-black text-[#1E523F] font-financial">{formatSignedWon(counterfactual?.expectedNetContributionMarginGain)}</strong>
                          <span className="block text-[11px] text-[#5A6B63] mt-0.5">이익 증가율 {formatSignedPct(counterfactual?.expectedNetContributionMarginGainPct)}</span>
                        </div>
                      </div>
                      {spillover?.crossElasticitySummary && (
                        <p className="text-xs font-bold text-[#1B382E] bg-[#F4F3EE] p-3 rounded-xl border border-[#D0C6BB]/60">
                          💡 {spillover.crossElasticitySummary}
                        </p>
                      )}
                    </div>
                  )}

                  {/* 6대 판매채널 OTB 구성비 & 베이스 선점율 및 채널별 실행 단가 가이드 요약 */}
                  {(summaryOtbChannel || channelRateSummary) && (
                    <div className="bg-white rounded-2xl p-5 border border-[#D0C6BB]/80 space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="text-sm font-black text-[#1B382E] flex items-center gap-2">
                          <Users size={16} className="text-[#1B3B2B]" />
                          <span>향후 30일 6대 판매채널별 확정 예약 비중 & 채널별 평균 판매 단가표</span>
                        </div>
                        {channelRateSummary && (
                          <div className="flex items-center gap-1.5 text-xs font-bold flex-wrap">
                            <span className="px-2 py-0.5 rounded bg-[#FAF6ED] text-[#8C6D3B] border border-[#E5DAC1]">
                              단체·기업 사전확보 집중 {formatNum(channelRateSummary.contractedBaseCompressionDaysCount)}일
                            </span>
                            <span className="px-2 py-0.5 rounded bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]">
                              단체 네고 마지노선 가동 {formatNum(channelRateSummary.groupRateFloorProtectedDaysCount)}일
                            </span>
                            <span className="px-2 py-0.5 rounded bg-[#FDF0ED] text-[#8B2635] border border-[#EAC5BD]">
                              신규 단체 예약 마감 {formatNum(channelRateSummary.groupBlockClosedDaysCount)}일
                            </span>
                          </div>
                        )}
                      </div>

                      {/* 1. 6대 판매채널 OTB 기예약 구성비 */}
                      {summaryOtbChannel && (
                        <div className="space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                            <span className="font-extrabold text-[#1B382E]">
                              6대 판매채널별 현재 예약 비중 (총 {formatNum(currentOtb?.totalBookedRooms)}실 확정)
                            </span>
                            <span className="text-[11px] font-black text-[#8C6D3B]">
                              단체·기업휴양소·골프 미리 확보(선점) 합계: {formatNum(summaryOtbChannel.contractedBaseRooms)}실 ({formatPct(summaryOtbChannel.contractedBaseSharePct)})
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
                            <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#D0C6BB]/60">
                              <span className="text-[#5A6B63] block font-medium">홈페이지·앱 직판 (2.5%)</span>
                              <strong className="text-base font-black text-[#1B382E] font-financial block mt-0.5">
                                {formatNum(summaryOtbChannel.fitDirectRooms)}실
                              </strong>
                              <span className="text-[11px] text-[#5A6B63]">{formatPct(summaryOtbChannel.fitDirectSharePct)}</span>
                            </div>

                            <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#D0C6BB]/60">
                              <span className="text-[#5A6B63] block font-medium">온라인 여행사 (야놀자 등)</span>
                              <strong className="text-base font-black text-[#1B382E] font-financial block mt-0.5">
                                {formatNum(summaryOtbChannel.fitOtaRooms)}실
                              </strong>
                              <span className="text-[11px] text-[#5A6B63]">{formatPct(summaryOtbChannel.fitOtaSharePct)}</span>
                            </div>

                            <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#D0C6BB]/60">
                              <span className="text-[#1E523F] block font-bold">골프 18·36홀 패키지</span>
                              <strong className="text-base font-black text-[#1E523F] font-financial block mt-0.5">
                                {formatNum(summaryOtbChannel.golfPkgRooms)}실
                              </strong>
                              <span className="text-[11px] text-[#1E523F]">{formatPct(summaryOtbChannel.golfPkgSharePct)}</span>
                            </div>

                            <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#D0C6BB]/60">
                              <span className="text-[#5A6B63] block font-medium">기업 휴양소 (계약 법인)</span>
                              <strong className="text-base font-black text-[#1B382E] font-financial block mt-0.5">
                                {formatNum(summaryOtbChannel.corporateResortRooms)}실
                              </strong>
                              <span className="text-[11px] text-[#5A6B63]">{formatPct(summaryOtbChannel.corporateResortSharePct)}</span>
                            </div>

                            <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#D0C6BB]/60">
                              <span className="text-[#8C6D3B] block font-bold">단체 행사 (세미나·워크숍)</span>
                              <strong className="text-base font-black text-[#8C6D3B] font-financial block mt-0.5">
                                {formatNum(summaryOtbChannel.groupSeminarRooms)}실
                              </strong>
                              <span className="text-[11px] text-[#8C6D3B]">{formatPct(summaryOtbChannel.groupSeminarSharePct)}</span>
                            </div>

                            <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#D0C6BB]/60">
                              <span className="text-[#5A6B63] block font-medium">분양 회원 (1/6·1/12구좌)</span>
                              <strong className="text-base font-black text-[#1B382E] font-financial block mt-0.5">
                                {formatNum(summaryOtbChannel.memberResortRooms)}실
                              </strong>
                              <span className="text-[11px] text-[#5A6B63]">{formatPct(summaryOtbChannel.memberResortSharePct)}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 2. 30일 채널별 평균 실행 단가 가이드 */}
                      {channelRateSummary && (
                        <div className="pt-2 border-t border-[#D0C6BB]/50 space-y-2">
                          <div className="text-xs font-extrabold text-[#1B382E]">
                            30일 채널별 평균 추천 요금 요약 (수수료 고려 및 단체 네고 마지노선)
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
                            <div className="bg-white p-2.5 rounded-xl border border-[#D0C6BB]/60">
                              <span className="text-[#5A6B63] block text-[10px]">홈페이지·앱 직판 평균</span>
                              <strong className="text-[#1B382E] font-financial text-sm">{formatWon(channelRateSummary.avgFitDirectWebAdr)}</strong>
                            </div>
                            <div className="bg-white p-2.5 rounded-xl border border-[#D0C6BB]/60">
                              <span className="text-[#5A6B63] block text-[10px]">야놀자 등 온라인 평균</span>
                              <strong className="text-[#1B382E] font-financial text-sm">{formatWon(channelRateSummary.avgFitOtaListedAdr)}</strong>
                            </div>
                            <div className="bg-white p-2.5 rounded-xl border border-[#D0C6BB]/60">
                              <span className="text-[#5A6B63] block text-[10px]">기업 휴양소 계약 평균</span>
                              <strong className="text-[#1B382E] font-financial text-sm">{formatWon(channelRateSummary.avgCorporateResortContractAdr)}</strong>
                            </div>
                            <div className="bg-white p-2.5 rounded-xl border border-[#D0C6BB]/60">
                              <span className="text-[#5A6B63] block text-[10px]">단체 행사 기본가 평균</span>
                              <strong className="text-[#1B382E] font-financial text-sm">{formatWon(channelRateSummary.avgGroupSeminarContractBaseAdr)}</strong>
                            </div>
                            <div className="bg-[#FAF6ED] p-2.5 rounded-xl border border-[#E5DAC1]">
                              <span className="text-[#8C6D3B] block text-[10px] font-bold">★ 단체 네고 마지노선 평균</span>
                              <strong className="text-[#8C6D3B] font-financial text-sm">{formatWon(channelRateSummary.avgGroupSeminarWalkAwayFloorAdr)}</strong>
                            </div>
                            <div className="bg-white p-2.5 rounded-xl border border-[#D0C6BB]/60">
                              <span className="text-[#5A6B63] block text-[10px]">분양 회원 약정 평균</span>
                              <strong className="text-[#1B382E] font-financial text-sm">{formatWon(channelRateSummary.avgMemberContractAdr)}</strong>
                            </div>
                          </div>
                        </div>
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
                      실시간 추천 요금 산출 원리 — 2026년 공식 인상 정가 준수 & 2개년 예약 데이터 결합
                    </h2>
                    <span className="text-xs font-bold text-[#1E523F] bg-[#E8F2EE] px-2.5 py-0.5 rounded-full border border-[#B4C6C1]">
                      산출 원리 해설
                    </span>
                  </div>
                  <p className="text-xs text-[#5A6B63] mt-1 font-medium">
                    과거의 싼 요금으로 정가가 깎이는 현상을 막고 2026년 정가를 완벽히 수호하며, 지난 2개년간 62,233건의 예약 패턴을 분석해 최적 요금을 도출하는 원리입니다.
                  </p>
                </div>

                <div className="px-4 py-2 rounded-xl bg-[#F4F3EE] border border-[#D0C6BB] text-xs font-extrabold text-[#1B382E] flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                  <span>{showLogicExplanationAccordion ? '산출 원리 해설 접기' : '산출 원리 해설 펼치기'}</span>
                  {showLogicExplanationAccordion ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </div>
              </button>

              {showLogicExplanationAccordion && (
                <div className="p-6 lg:p-7 pt-3 border-t border-[#D0C6BB]/60 bg-[#FAF9F6] space-y-6">
                  {/* 0. 투트랙 엔진 아키텍처 & 외부 시장 탄력 연동 3대 원리 */}
                  <div className="bg-white p-5 rounded-2xl border-2 border-[#8C6D3B]/80 shadow-2xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D0C6BB]/60 pb-3">
                      <div className="flex items-center gap-2 text-sm font-black text-[#8C6D3B]">
                        <Compass size={17} />
                        <span>0. 두 가지 요금 추천 방식 (기본 추천 vs 시장 연동 추천) 및 주변 만실 반영 원리</span>
                      </div>
                      <span className="text-[11px] font-extrabold text-[#8C6D3B] bg-[#FAF6ED] px-3 py-1 rounded-xl border border-[#E5DAC1]">
                        상단 원클릭 전환 지원 (기본 추천 ↔ 시장 연동)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {/* Track A 카드 */}
                      <div className="bg-[#FAF9F6] p-4 rounded-xl border border-[#D0C6BB]/70 space-y-2">
                        <div className="flex items-center justify-between">
                          <strong className="text-[#1B382E] text-xs font-black">🅰️ 기본 추천: 우리 리조트 예약 상황 중심 (기본형)</strong>
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#E8F2EE] text-[#1E523F]">안정적 방어</span>
                        </div>
                        <p className="text-[#5A6B63] leading-relaxed">
                          벨포레 자체 남은 객실(총 175실)과 체크인까지 남은 날짜(D-k)를 분석해 요일별 기본 정가를 조정하며, 주변 리조트가 만실일 때 보너스(+1.5%p ~ +3.5%p)를 반영합니다.
                        </p>
                      </div>

                      {/* Track B 카드 */}
                      <div className="bg-[#FAF6ED] p-4 rounded-xl border border-[#E5DAC1] space-y-2">
                        <div className="flex items-center justify-between">
                          <strong className="text-[#8C6D3B] text-xs font-black">🅱️ 시장 연동 추천: 주변 경쟁사 만실·요금 변동 실시간 반영 (고도화)</strong>
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#8C6D3B] text-white">초과이익 극대화</span>
                        </div>
                        <p className="text-[#5A6B63] leading-relaxed">
                          매일 밤 수집되는 주변 4대 경쟁 리조트의 실시간 판매 현황과 연동하여, 주중·주말 요금 차이 및 주변 리조트 만실 강도를 즉시 추천가에 반영합니다.
                        </p>
                      </div>
                    </div>

                    {/* OTB 격리 보호 대원칙 배너 */}
                    <div className="bg-[#E8F2EE] p-3.5 rounded-xl border border-[#B4C6C1] text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-black text-[#1E523F]">
                        <ShieldCheck size={14} />
                        <span>불변의 대원칙: 이미 확정된 예약 매출은 절대 건드리지 않음 (오차 0원 고정)</span>
                      </div>
                      <p className="text-[#284F42] leading-relaxed">
                        어떤 방식을 선택하든 이미 결제·확정된 예약 매출({formatWon(pricingRec?.lockedOtbRevenueTotal)})은 1원도 변하지 않는 확정값입니다. 추천 요금은 오늘 이후 새로 들어올 <strong>신규 예약 예상 객실({formatNum(pricingRec?.counterfactualEvaluation?.totalDynamicNewPickupUnits ?? pricingRec?.expectedAdditionalKeys)}실)</strong>에만 적용되어 기존 매출을 완벽히 보호합니다.
                      </p>
                    </div>

                    {/* Track B 3대 고도화 알고리즘 */}
                    <div className="space-y-2 pt-1">
                      <div className="text-xs font-extrabold text-[#1B382E]">
                        📐 시장 연동 추천 3대 핵심 전략:
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                        <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#D0C6BB]/60 space-y-1">
                          <span className="font-extrabold text-[#1B382E] block">① 주변 리조트 만실 시 요금 인상</span>
                          <p className="text-[#5A6B63] leading-relaxed">
                            주변 리조트가 만실에 가까울 때 단풍·주말 피크에 최대 +3.0%p ~ +5.0%p 추가 인상하여 너무 일찍 방이 다 팔려 손해보는 일을 방지합니다.
                          </p>
                        </div>
                        <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#D0C6BB]/60 space-y-1">
                          <span className="font-extrabold text-[#1B382E] block">② 목·일요일 예약 집중 감지</span>
                          <p className="text-[#5A6B63] leading-relaxed">
                            주변 경쟁사의 주중 품절률이 높을 때 우리 쪽으로 몰려오는 고객을 선제 포착하여 주중/일요 요금을 +2.0%p 선제 방어합니다.
                          </p>
                        </div>
                        <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#D0C6BB]/60 space-y-1">
                          <span className="font-extrabold text-[#1B382E] block">③ 경쟁사 덤핑 세일에 휘말리지 않기</span>
                          <p className="text-[#5A6B63] leading-relaxed">
                            경쟁사가 평일 요금을 50% 폭락 덤핑하더라도, 벨포레는 출혈경쟁을 피하고 2026년 정가를 지키며 레저 쿠폰 특전으로 고객을 모읍니다.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 1. 예측 및 적용 기간 안내 */}
                  <div className="bg-white p-5 rounded-2xl border border-[#D0C6BB]/75 shadow-2xs space-y-3">
                    <div className="flex items-center gap-2 text-sm font-extrabold text-[#1B382E]">
                      <Calendar size={16} className="text-[#1B3B2B]" />
                      <span>1. 예측 및 적용 기간 & 분석 대상 객실</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#D0C6BB]/60 space-y-1">
                        <span className="font-extrabold text-[#1B382E] block">📅 기본 적용 구간</span>
                        <p className="text-[#5A6B63] leading-relaxed">
                          오늘부터 <strong>향후 {formatNum(meta?.totalDays)}일간</strong> ({meta?.startDate} ~ {meta?.endDate})의 날짜별 추천 판매 요금을 산출합니다. (상단 필터로 14일 / 30일 / 60일 조절 가능)
                        </p>
                      </div>
                      <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#D0C6BB]/60 space-y-1">
                        <span className="font-extrabold text-[#1B382E] block">🏨 분석 대상 총 객실</span>
                        <p className="text-[#5A6B63] leading-relaxed">
                          하루 운영 객실 <strong>총 {formatNum(meta?.physicalKeysCapacity)}실</strong> (월 고정 모수 {formatNum(meta?.fixedMonthlyCapacity)}실 / 기준 점유율 {meta?.fixedOccupancyBenchmarkPct != null ? `${meta.fixedOccupancyBenchmarkPct}%` : '-'} 준수) 기준 총 <strong>{formatNum(currentOtb?.totalCapacityKeys)}실-일</strong>입니다.
                        </p>
                      </div>
                      <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#D0C6BB]/60 space-y-1">
                        <span className="font-extrabold text-[#1B382E] block">📊 정가 기준 및 수요 분석 소스</span>
                        <p className="text-[#5A6B63] leading-relaxed">
                          기본 요금은 <strong>2026년 최근 실제 판매가({formatWon(recent2026?.retailAdr)})를 100% 기준</strong>으로 삼고, 수요 예측은 <strong>2024년·2025년 2개년 62,233건 실측 데이터</strong>를 결합합니다.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 2. 핵심 질의 응답: 왜 2025년 과거 가격과 평균을 내지 않는가? */}
                  <div className="bg-white p-5 rounded-2xl border-2 border-[#1B3B2B] shadow-2xs space-y-3">
                    <div className="flex items-center gap-2 text-sm font-extrabold text-[#1B3B2B]">
                      <Sparkles size={16} className="text-[#B59269]" />
                      <span>2. 핵심 설계 원칙: "왜 2025년 과거 단가와 평균을 내지 않는가? (요금 깎임 방지)"</span>
                    </div>
                    <div className="space-y-2 text-xs text-[#5A6B63] leading-relaxed">
                      <p>
                        2026년 리조트는 시설 리뉴얼 및 브랜드 포지셔닝에 맞춰 <strong>의도적으로 객단가를 전년 대비 {formatPct(recent2026?.yoyRetailAdrGrowthPct)} 인상({formatWon(recent2026?.retailAdr)})</strong>하여 시장에 성공적으로 안착시켰습니다.
                      </p>
                      <p className="text-[#1B382E] font-bold bg-[#FAF9F6] p-3 rounded-xl border border-[#D0C6BB]/70">
                        과거의 낮은 2025년 단가({formatWon(hist2025?.retailAdr)})와 원화 금액끼리 단순 평균을 내버리면, <strong>경영진이 의도적으로 올려놓은 객단가가 과거 가격으로 깎여 내려가는 치명적 희석</strong>이 발생합니다.
                      </p>
                      <p>
                        따라서 시스템은 <strong>2025년의 원화 금액을 완전히 배제</strong>하고, 모든 평형과 요일군의 출발 기준가(기본 정가)를 <strong>100% 2026년 실제 판매 단가</strong>로 고정했습니다. 추천 시스템은 2026년 인상 단가를 최저 방어선으로 삼고, 수요 집중 시 <strong>그 위로 추가 인상(Yield-Up)</strong>하여 초과 이익을 창출합니다.
                      </p>
                    </div>
                  </div>

                  {/* 3. 2024·2025 2개년 비가격 5대 심층 시그널 */}
                  <div className="bg-white p-5 rounded-2xl border border-[#D0C6BB]/75 shadow-2xs space-y-3">
                    <div className="flex items-center gap-2 text-sm font-extrabold text-[#1B382E]">
                      <Layers size={16} className="text-[#284F42]" />
                      <span>3. 과거 2개년(2024·2025) 5대 예약 패턴 결합 원리</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                      <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#D0C6BB]/60 space-y-1">
                        <strong className="text-[#1B382E] block">① 2개년 동요일 점유율 비교</strong>
                        <p className="text-[#5A6B63] leading-relaxed">
                          작년과 재작년 같은 요일의 실제 가동률을 비교해, 특정 연도의 비나 추석 날짜 차이를 보정하고 평소에도 꽉 차는 요일을 먼저 찾아냅니다.
                        </p>
                      </div>
                      <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#D0C6BB]/60 space-y-1">
                        <strong className="text-[#1B382E] block">② 2개년 동일 시점 예약 속도 비교</strong>
                        <p className="text-[#5A6B63] leading-relaxed">
                          체크인까지 남은 날짜(D-k) 기준 과거에 이맘때 얼마나 방이 찼었는지를 추적하여 최종 예상 가동률의 신뢰도를 대폭 높였습니다.
                        </p>
                      </div>
                      <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#D0C6BB]/60 space-y-1">
                        <strong className="text-[#1B382E] block">③ 계절별 월별 수요 곡선</strong>
                        <p className="text-[#5A6B63] leading-relaxed">
                          원화 금액 대신 계절별 수요 비율만 추출하여 10월 단풍 성수기에서 11월 비수기로 넘어가는 변화 곡선을 정밀 반영합니다.
                        </p>
                      </div>
                      <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#D0C6BB]/60 space-y-1">
                        <strong className="text-[#1B382E] block">④ 3개년 취소 위험 감지</strong>
                        <p className="text-[#5A6B63] leading-relaxed">
                          평소 요일별 취소율을 분석해 갑자기 취소가 많아질 위험이 있으면 가짜 예약을 사전에 털어내고 공실 위험을 방어합니다.
                        </p>
                      </div>
                      <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#D0C6BB]/60 space-y-1">
                        <strong className="text-[#1B382E] block">⑤ 2박 이상 연박 고객 증가 반영</strong>
                        <p className="text-[#5A6B63] leading-relaxed">
                          연박 고객이 많은 날은 방 청소비와 운영비를 아낄 수 있으므로 요금 방어 혜택을 부여합니다.
                        </p>
                      </div>
                      <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#D0C6BB]/60 space-y-1">
                        <strong className="text-[#1B382E] block">⑥ 연휴 전날·마지막 날 자동 분류</strong>
                        <p className="text-[#5A6B63] leading-relaxed">
                          다음 날이 쉬는 날인 연휴 전날은 토요일 최고 요금으로, 다음 날 출근해야 하는 연휴 마지막 날은 일요일 요금제로 자동 분류합니다.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 4. 4대 전략 실행 로직 */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-extrabold text-[#1B382E]">
                      <Zap size={16} className="text-[#B59269]" />
                      <span>4. 추천 요금으로 매출이 늘어나는 4대 핵심 전략</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {/* 로직 1: 단가 상향 */}
                      <div className="bg-white p-5 rounded-2xl border border-[#B4C6C1] shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]">
                            <TrendingUp size={13} /> ① 요금 인상 (YIELD_UP) — "수요 몰릴 때 제값 이상 받기"
                          </span>
                          <span className="font-extrabold text-[#1E523F] bg-[#E8F2EE] px-2 py-0.5 rounded-lg">
                            {formatNum(pricingRec?.yieldUpDays)}일간 적용
                          </span>
                        </div>
                        <p className="text-[#5A6B63] leading-relaxed">
                          <strong>[원리]</strong> 주말·단풍시즌·대기예약 발생일·골프 부킹 집중일처럼 예약 속도가 빠른 날은 저가 OTA 특가를 마감하고 2026년 기준가 대비 <strong>상한 방어선 범위 내에서 단가를 상향</strong>합니다.
                        </p>
                        <p className="text-[#1E523F] font-bold leading-relaxed">
                          👉 조기 매진으로 놓치던 판매 요금을 끌어올려 같은 수의 방을 팔아도 더 큰 매출을 거둡니다.
                        </p>
                      </div>

                      {/* 로직 2: 번들 특전 */}
                      <div className="bg-white p-5 rounded-2xl border border-[#E5DAC1] shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#FAF6ED] text-[#8C6D3B] border border-[#E5DAC1]">
                            <Package size={13} /> ② 레저 쿠폰 특전 (BUNDLE_PROMO) — "평일 정가 지키고 레저 티켓 결합"
                          </span>
                          <span className="font-extrabold text-[#8C6D3B] bg-[#FAF6ED] px-2 py-0.5 rounded-lg">
                            {formatNum(pricingRec?.bundlePromoDays)}일간 적용
                          </span>
                        </div>
                        <p className="text-[#5A6B63] leading-relaxed">
                          <strong>[원리]</strong> 비수기 평일에는 방값을 덤핑 할인하면 브랜드 가치가 훼손되므로, 방값은 2026년 정가로 방어하되 마운틴카트·미디어아트센터 등 <strong>리조트 레저 티켓을 결합한 특전 패키지</strong>로 모객합니다.
                        </p>
                        <p className="text-[#8C6D3B] font-bold leading-relaxed">
                          👉 객실 요금을 무너뜨리지 않으면서 평일 공실을 채우고, 식음·레저 등 고객 1인당 총 지출액을 늘립니다.
                        </p>
                      </div>

                      {/* 로직 3: 타임세일 */}
                      <div className="bg-white p-5 rounded-2xl border border-[#EAC5BD] shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#FDF0ED] text-[#8B2635] border border-[#EAC5BD]">
                            <Flame size={13} /> ③ 긴급 반짝 할인 (FLASH_SALE) — "공실 위기 방을 현금으로 전환"
                          </span>
                          <span className="font-extrabold text-[#8B2635] bg-[#FDF0ED] px-2 py-0.5 rounded-lg">
                            {formatNum(pricingRec?.flashSaleDays)}일간 적용
                          </span>
                        </div>
                        <p className="text-[#5A6B63] leading-relaxed">
                          <strong>[원리]</strong> 체크인이 10일 이내로 임박했는데 빈방이 많거나 취소가 급증한 위기일에는, 원가 이하 판매를 막는 <strong>최저 하한선</strong> 범위 내에서 회원 대상 긴급 타임세일을 단행합니다.
                        </p>
                        <p className="text-[#8B2635] font-bold leading-relaxed">
                          👉 그대로 두면 '매출 0원'으로 버려질 공실 손실을 유의미한 추가 현금 매출로 전환합니다.
                        </p>
                      </div>

                      {/* 로직 4: 기준 유지 & 골프/연박 시너지 */}
                      <div className="bg-white p-5 rounded-2xl border border-[#D0C6BB] shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#F4F3EE] text-[#284F42] border border-[#D0C6BB]">
                            <ShieldCheck size={13} /> ④ 정가 유지 & 골프·연박 고객 우대
                          </span>
                          <span className="font-extrabold text-[#284F42] bg-[#F4F3EE] px-2 py-0.5 rounded-lg">
                            {formatNum(pricingRec?.holdDays)}일간 적용
                          </span>
                        </div>
                        <p className="text-[#5A6B63] leading-relaxed">
                          <strong>[원리]</strong> 안정적 페이스의 날은 2026년 기본 정가를 수호하며, 향후 30일 골프 부킹 <strong>{formatNum(currentOtb?.totalGolfBookedTeams)}팀</strong>의 숙박 연계 수요와 <strong>연박 고객</strong>을 우대합니다.
                        </p>
                        <p className="text-[#284F42] font-bold leading-relaxed">
                          👉 청소비·운영비를 절감하고 고단가 35·51평 스위트룸 판매를 촉진합니다.
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
                            <th className="py-2.5 px-4 text-right">기본 정가 고정 판매 시</th>
                            <th className="py-2.5 px-4 text-right bg-[#E8F2EE]/40 text-[#1B382E]">추천 요금 적용 시</th>
                            <th className="py-2.5 px-4 text-right text-[#1E523F]">증대 효과 (추가 수익)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#D0C6BB]/40">
                          <tr>
                            <td className="py-2.5 px-4 font-extrabold text-[#1B382E]">30일 추천 평균 요금 (1박)</td>
                            <td className="py-2.5 px-4 text-right text-[#5A6B63]">{formatWon(pricingRec?.avgBaselineAdr)}</td>
                            <td className="py-2.5 px-4 text-right font-black text-[#1B3B2B] bg-[#E8F2EE]/20">{formatWon(pricingRec?.avgRecommendedAdr)}</td>
                            <td className="py-2.5 px-4 text-right font-extrabold text-[#1E523F]">{formatSignedPct(pricingRec?.avgAdrLiftPct)} 상승</td>
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
                              인상 {formatNum(pricingRec?.yieldUpDays)}일 · 유지 {formatNum(pricingRec?.holdDays)}일 · 특전 {formatNum(pricingRec?.bundlePromoDays)}일 · 반짝할인 {formatNum(pricingRec?.flashSaleDays)}일
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
                      충청권 4대 경쟁 리조트 과거 시계열 트렌드 (실시간 데이터 연동)
                    </h2>
                    <span className="text-xs font-bold text-[#1E523F] bg-[#E8F2EE] px-2.5 py-0.5 rounded-full border border-[#B4C6C1]">
                      시계열 분석
                    </span>
                  </div>
                  <p className="text-xs text-[#5A6B63] mt-1 font-medium">
                    소노벨 단양 · 롯데리조트 부여 · 레스트리 리솜 · 포레스트 리솜의 연도·월별·요일별 품절률 및 요금 트렌드 ({formatNum(yearlyMonthlySummary.length)}개 집계 구간)
                  </p>
                </div>

                <div className="px-4 py-2 rounded-xl bg-[#F4F3EE] border border-[#D0C6BB] text-xs font-extrabold text-[#1B382E] flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                  <span>{showCompetitorTimeseriesAccordion ? '경쟁사 트렌드 접기' : '경쟁사 트렌드 펼치기'}</span>
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
                          <span>충청권 4대 경쟁사 다년도 시계열 데이터 현황 (Zero DB Load)</span>
                        </div>
                        <span className="text-xs font-bold text-[#1E523F] bg-[#E8F2EE] px-3 py-1 rounded-xl border border-[#B4C6C1]">
                          DB 부하: 0-Load
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
                          <th className="py-2.5 px-4 text-center">요일 구분</th>
                          <th className="py-2.5 px-4 text-right">관측 건수</th>
                          <th className="py-2.5 px-4 text-right">품절률</th>
                          <th className="py-2.5 px-4 text-right">평균 최저가</th>
                          <th className="py-2.5 px-4 text-right">중간 요금</th>
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
                                  {row.dayType === 'SAT_PEAK' ? '토요일 피크' : row.dayType === 'SAT_HOLIDAY' ? '연휴 토요일' : row.dayType === 'FRIDAY' ? '금요일' : row.dayType === 'SUNDAY' ? '일요일' : row.dayType === 'WEEKDAY' ? '평일' : row.dayType}
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
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
