// ============================================================================
// ① 매장 시너지 분석 V2 (synergy-store-correlation-v2)
// ============================================================================
export interface SynergyStoreCorrelationV2Response {
  success: boolean;
  meta: {
    engine: string;
    holidaySource: string;
    period: { startDate: string; endDate: string };
    totalResortSales: number;
    totalResortSalesFormatted: string;
    totalRoomSales: number;
    totalRoomsSold: number;
  };
  stores: Array<{
    storeName: string;
    categoryCode: string;
    totalSales: number;
    revenueFormatted: string;
    totalQuantity: number;
    quantityFormatted: string;
    visitorCount: number;
    visitorCountFormatted: string;
    salesSharePercent: number;
    correlationCoefficient: number;
    interactionGrade: string;
    revPasSlope: number;
    spilloverRate: number;
    reverseSpillover: number;
    liftValue: number;
    elasticity?: number;
    elasticityPercent?: number;
    swingMultiplier?: number;
    synergyScore?: number;
    synergyQuadrant?: 'CORE_ANCHOR' | 'HIDDEN_GEM' | 'INDEPENDENT_CASHCOW' | 'STANDALONE';
    dailyTrends: Array<{
      date: string;
      roomsSold: number;
      storeSales: number;
      storeSalesFormatted: string;
      isOffDay: number;
      isPublicHoliday: number;
      holidayName: string;
    }>;
  }>;
  byCategory: {
    fnb: any[];
    ticket: any[];
    golf: any[];
    moto: any[];
  };
}

// ============================================================================
// ② 법인/단체 객실 실적 V2 (corporate-group-sales-v2)
// ============================================================================
export interface CorporateGroupSalesV2Response {
  success: boolean;
  meta: {
    engine: string;
    period: { startDate: string; endDate: string };
    summary: {
      totalRevenue: number;
      totalRevenueFormatted: string;
      totalRoomsSold: number;
      totalRoomsSoldFormatted: string;
      totalGuests: number;
      totalGuestsFormatted: string;
      adr: number;
      adrFormatted: string;
    };
  };
  segments: Array<{
    ticketGroup: string;
    venueName: string;
    roomsSold: number;
    roomsSoldFormatted: string;
    revenue: number;
    revenueFormatted: string;
    revenueSharePct: number;
    guestCount: number;
    guestCountFormatted: string;
    adr: number;
    adrFormatted: string;
  }>;
  dailyTrends: Array<{
    date_id: string;
    sales_date: string;
    daily_revenue: number;
    daily_revenue_formatted: string;
    daily_rooms: number;
    daily_rooms_formatted: string;
  }>;
}

// ============================================================================
// ③ 골프 채널 및 티타임 분석 V2 (golf-channel-teetime-analysis-v2)
export interface GolfPartItem {
  name: string;
  timeRange: string;
  reservedTeams: number;
  visitedTeams: number;
  pendingTeams: number;
  players: number;
  greenFeeRevenue: number;
  avgGreenFee: number;
  avgGreenFeeFormatted: string;
}

export interface GolfPartAnalysis {
  totalReservedTeams: number;
  totalVisitedTeams: number;
  totalCanceledTeams: number;
  totalPendingTeams: number;
  overallAvgGreenFee: number;
  overallAvgGreenFeeFormatted: string;
  parts: {
    part1: GolfPartItem;
    part2: GolfPartItem;
    part3: GolfPartItem;
  };
}

export interface GolfMembershipItem {
  players: number;
  playersFormatted: string;
  playerRatio: number;
  greenFeeRevenue: number;
  greenFeeRevenueFormatted: string;
  avgGreenFee: number;
  avgGreenFeeFormatted: string;
}

export interface GolfMembershipAnalysis {
  member: GolfMembershipItem;
  nonMember: GolfMembershipItem;
  greenFeeGap: number;
  greenFeeGapFormatted: string;
}

export interface GolfChannelAnalysisV2Response {
  success: boolean;
  meta: {
    engine: string;
    period: { startDate: string; endDate: string };
    summary: {
      totalGolfRevenue: number;
      totalGolfRevenueFormatted: string;
      totalPlayers: number;
      totalPlayersFormatted: string;
      totalTransactions: number;
      arpu: number;
      arpuFormatted: string;
      courseCoreRevenue?: number;
      courseCoreRatio?: number;
      amenityRevenue?: number;
      amenityQuantity?: number;
      amenityRatio?: number;
      partAnalysis?: GolfPartAnalysis;
      membershipAnalysis?: GolfMembershipAnalysis;
    };
  };
  partAnalysis?: GolfPartAnalysis;
  membershipAnalysis?: GolfMembershipAnalysis;
  channels: Array<{
    venueName: string;
    ticketGroup: string;
    totalRevenue: number;
    revenueFormatted: string;
    greenFeeRevenue: number;
    greenFeeFormatted: string;
    cartFeeRevenue: number;
    cartFeeFormatted: string;
    playerCount: number;
    playerCountFormatted: string;
    revenueSharePct: number;
    arpu: number;
    arpuFormatted: string;
  }>;
  dailyTrends: Array<{
    date_id: string;
    sales_date: string;
    daily_revenue: number;
    daily_revenue_formatted: string;
    daily_players: number;
    daily_players_formatted: string;
  }>;
}

// ============================================================================
// ④ 일일 진성 방문객 분석 V2 (daily-member-visitors-v2)
// ============================================================================
export interface DailyMemberVisitorsV2Response {
  success: boolean;
  meta: {
    engine: string;
    period: { startDate: string; endDate: string };
    summary: {
      totalVisitors: number;
      totalVisitorsFormatted: string;
      roomGuests: number;
      roomGuestsFormatted: string;
      golfPlayers: number;
      golfPlayersFormatted: string;
      leisureVisitors: number;
      leisureVisitorsFormatted: string;
      totalResortSales: number;
      totalResortSalesFormatted: string;
      spendPerVisitor: number;
      spendPerVisitorFormatted: string;
    };
  };
  venueVisitors: Array<{
    category_code: string;
    venue_name: string;
    ticket_group: string;
    visitor_count: number;
    visitor_count_formatted: string;
    revenue: number;
    revenue_formatted: string;
    visitor_share_pct: number;
  }>;
  dailyVisitors: Array<{
    date_id: string;
    sales_date: string;
    daily_visitors: number;
    daily_visitors_formatted: string;
    daily_room_guests: number;
    daily_golf_players: number;
    daily_leisure_visitors: number;
    daily_revenue: number;
    daily_revenue_formatted: string;
  }>;
}

// ============================================================================
// ⑤ 고객 여정 크로스 번들 분석 V2 (customer-journey-bundles-v2)
// ============================================================================
export interface CustomerJourneyBundlesV2Response {
  success: boolean;
  meta: {
    engine: string;
    period: { startDate: string; endDate: string };
    totalResortSales: number;
    totalResortSalesFormatted: string;
  };
  bundles: Array<{
    bundleType: string;
    departmentDepth: number;
    daysCount: number;
    totalRevenue: number;
    revenueFormatted: string;
    totalQuantity: number;
    quantityFormatted: string;
    revenueSharePct: number;
  }>;
  dailyTrends: Array<{
    date_id: string;
    sales_date: string;
    active_bundle_type: string;
    department_depth: number;
    daily_revenue: number;
    daily_revenue_formatted: string;
    daily_quantity: number;
    daily_quantity_formatted: string;
  }>;
}

// ============================================================================
// ⑧ 레저본부 영업장별 숙박객 대비 이용률 리포트 (leisure-usage-rate)
// ============================================================================
export interface LeisureUsageRateDataPoint {
  month: string;
  usageRate: number; // e.g. 142.3 (%)
  visitors: number; // e.g. 18230 (명)
  totalRoomGuests: number; // e.g. 12810 (명)
}

export interface LeisureUsageRateSeries {
  facilityName: string;
  data: LeisureUsageRateDataPoint[];
}

export interface LeisureUsageRateResponse {
  success: boolean;
  months: string[];
  series: LeisureUsageRateSeries[];
  error?: string;
}

// ============================================================================
// ⑨ 레저본부 연도별 영업장 이용률 정밀 매트릭스 (leisure-yoy-matrix)
// ============================================================================
export interface LeisureYoyYearData {
  usageRate: number;
  visitors: number;
  roomGuests: number;
}

export interface LeisureYoyRow {
  month: number;
  [year: string]: LeisureYoyYearData | number;
}

export interface LeisureYoyMatrixResponse {
  success: boolean;
  facilities: string[];
  years: string[];
  pivotData: Record<string, LeisureYoyRow[]>;
  periodRange?: { startMonth: number; endMonth: number; label: string };
  periodCumulative?: Record<string, { visitors: number; roomGuests: number; usageRate: number }>;
  facilityPeriodCumulative?: Record<string, Record<string, { visitors: number; roomGuests: number; usageRate: number }>>;
  error?: string;
}

// ============================================================================
// ⑩ 벨포레 연도별 숙박객 수 YoY 매트릭스 (room-guests-yoy)
// ============================================================================
export interface RoomGuestsYoyRow {
  month: number;
  rowTotal?: number;
  // 2026 vs 2025 YoY pre-calculated fields (Ticket 49)
  yoyGuestsDiff?: number | null;
  guestsDiff?: number | null;
  yoyGuestsDelta?: number | null;
  diffGuests?: number | null;
  yoyGuestsPct?: number | null;
  guestsYoyPct?: number | null;
  guestsGrowthRate?: number | null;
  yoyRoomsDiff?: number | null;
  roomsDiff?: number | null;
  yoyRoomsDelta?: number | null;
  yoyRoomsPct?: number | null;
  roomsYoyPct?: number | null;
  roomsGrowthRate?: number | null;
  yoyRevDiff?: number | null;
  revenueDiff?: number | null;
  yoyRevenueDiff?: number | null;
  yoyRevPct?: number | null;
  revenueYoyPct?: number | null;
  revenueGrowthRate?: number | null;
  yoy?: {
    guestsDiff?: number | null;
    guestsPct?: number | null;
    roomsDiff?: number | null;
    roomsPct?: number | null;
    revenueDiff?: number | null;
    revenuePct?: number | null;
  };
  [year: string]: any;
}

export interface RoomGuestsYoyResponse {
  success: boolean;
  years: string[];
  matrix: RoomGuestsYoyRow[];
  totals?: Record<string, any> & {
    yoyGuestsDiff?: number | null;
    guestsDiff?: number | null;
    yoyGuestsPct?: number | null;
    guestsYoyPct?: number | null;
    yoyRoomsDiff?: number | null;
    roomsDiff?: number | null;
    yoyRoomsPct?: number | null;
    roomsYoyPct?: number | null;
    yoyRevDiff?: number | null;
    revenueDiff?: number | null;
    yoyRevPct?: number | null;
    revenueYoyPct?: number | null;
    yoy?: {
      guestsDiff?: number | null;
      guestsPct?: number | null;
      roomsDiff?: number | null;
      roomsPct?: number | null;
      revenueDiff?: number | null;
      revenuePct?: number | null;
    };
  };
  summary?: Record<string, any>;
  annual?: Record<string, any>;
  grandTotal?: number;
  error?: string;
}

// ============================================================================
// ⑩-B 월별 시즌성 매트릭스 (monthly-seasonality-matrix)
// ============================================================================
export interface MonthlySeasonalityMonthRow {
  month: number;
  monthName?: string;
  revenue2026?: number;
  revenue2025?: number;
  tyRevenue?: number;
  lyRevenue?: number;
  yoyRevenueDiff?: number | null;
  yoyRevDiff?: number | null;
  revenueDiff?: number | null;
  yoyRevenuePct?: number | null;
  yoyRevPct?: number | null;
  revenueYoyPct?: number | null;
  revenueGrowthRate?: number | null;
  visitors2026?: number;
  visitors2025?: number;
  tyVisitors?: number;
  lyVisitors?: number;
  yoyVisitorsDiff?: number | null;
  yoyGuestsDiff?: number | null;
  visitorsDiff?: number | null;
  yoyVisitorsPct?: number | null;
  yoyGuestsPct?: number | null;
  visitorsYoyPct?: number | null;
  visitorsGrowthRate?: number | null;
  trevpar2026?: number;
  trevpar2025?: number;
  yoyTrevparDiff?: number | null;
  yoyTrevparPct?: number | null;
  yoy?: {
    revenueDiff?: number | null;
    revenuePct?: number | null;
    visitorsDiff?: number | null;
    visitorsPct?: number | null;
  };
}

export interface MonthlySeasonalityMatrixResponse {
  success: boolean;
  months?: MonthlySeasonalityMonthRow[];
  monthly?: MonthlySeasonalityMonthRow[];
  annual?: Record<string, any>;
  totals?: Record<string, any>;
  facilities?: Array<{
    facilityId: string;
    facilityName: string;
    divisionName: string;
    months: MonthlySeasonalityMonthRow[];
  }>;
  error?: string;
}

// ============================================================================
// ⑪ 세일즈본부 연회/세미나실 장소별(Venue) 판매 분석 및 단체 명부 V6
// ============================================================================
export interface SalesVenueItem {
  venueId: string;
  venueName: string;
  capacity?: number;
  bookedCount: number;
  totalRevenue: number;
  averagePrice: number;
  sharePct?: number;
  lyBookedCount?: number;
  lyRevenue?: number;
  growthRate?: number;
}

export interface SalesVenueMonthlyTrend {
  yearMonth: string;
  year?: number;
  month?: number;
  totalBookings?: number;
  totalCount?: number;
  totalRevenue?: number;
  venues?: Record<string, number>;
  venueBreakdown?: Record<string, number>;
}

export interface SalesVenueGroupBooking {
  eventDate?: string;
  bookingDate?: string;
  reservationNo?: string;
  eventId?: string;
  venueName: string;
  clientName?: string;
  corporateName?: string;
  eventName?: string;
  paxCount?: number;
  rentalPrice?: number;
  packageType?: string;
  salesManager?: string;
  remarks?: string;
}

export interface SalesVenuePerformanceSummary {
  totalVenuesCount: number;
  totalEventsCount: number;
  totalRentalRevenue: number;
  averageRentalPrice?: number;
  mostBookedVenue: string;
  lyTotalEventsCount?: number;
  lyTotalRentalRevenue?: number;
  eventsGrowthRate?: number;
  revenueGrowthRate?: number;
}

export interface SalesVenuePerformanceResponse {
  success: boolean;
  summary: SalesVenuePerformanceSummary;
  venues: SalesVenueItem[];
  monthlyTrends: SalesVenueMonthlyTrend[];
  groupBookings: SalesVenueGroupBooking[];
  error?: string;
}

// ============================================================================
// ⑩ 날씨-매출 상관관계 분석 (weather-correlation)
// ============================================================================
export interface WeatherStats {
  rainyDays: number;
  snowyDays: number;
  clearDays: number;
  avgPrecipitation: number;
  maxPrecipitation: number;
}

export interface WeatherImpactVenue {
  venueName: string;
  categoryName: string;
  impactRate: number;
  deltaRevenue: number;
}

export interface WeatherCorrelationDayBreakdown {
  correlationPrecip: number;
  correlationSnow: number;
  clearDayAvgRevenue: number;
  rainyDayAvgRevenue: number;
  snowyDayAvgRevenue: number;
  rainyRevenueDelta: number;
  rainyImpactRate: number;
  snowyRevenueDelta: number;
  snowyImpactRate: number;
  sampleClearDays: number;
  sampleRainyDays: number;
  sampleSnowyDays: number;
  sensitivityTag: string;
}

export interface WeatherVenueRankingItem {
  categoryCode: string;
  categoryName: string;
  venueName: string;
  correlationPrecip: number;
  correlationSnow: number;
  clearDayAvgRevenue: number;
  rainyDayAvgRevenue: number;
  snowyDayAvgRevenue: number;
  rainyRevenueDelta: number;
  rainyImpactRate: number;
  snowyRevenueDelta: number;
  snowyImpactRate: number;
  sensitivityTag: string;
  weekday: WeatherCorrelationDayBreakdown;
  holiday: WeatherCorrelationDayBreakdown;
}

export interface WeatherDailyTimeSeriesItem {
  date: string;
  dayType: 'WEEKDAY' | 'HOLIDAY';
  dayName: string;
  precipitation: number;
  snowfall: number;
  avgTemp: number;
  weatherCondition: 'RAIN' | 'SNOW' | 'CLEAR';
  totalRevenue: number;
  golfRevenue: number;
  ticketRevenue: number;
  fnbRevenue: number;
  roomRevenue: number;
  motoRevenue: number;
  goodsRevenue: number;
}

export interface WeatherSalesCorrelationResponse {
  success: boolean;
  data: {
    summary: {
      period: {
        startDate: string;
        endDate: string;
        totalDays: number;
      };
      weatherStats: WeatherStats;
      topVulnerableVenues: WeatherImpactVenue[];
      topBeneficiaryVenues: WeatherImpactVenue[];
    };
    venueRankings: WeatherVenueRankingItem[];
    dailyTimeSeries: WeatherDailyTimeSeriesItem[];
  };
}

// ============================================================================
// ⑧ 날씨 예측 시뮬레이션 V6 (weather-forecast-simulation)
// ============================================================================
export interface WeatherForecastSimulationVenue {
  categoryCode: string;
  categoryName: string;
  venueName: string;
  lyWeekdayAvgRevenue: number;
  forecastWeekdayRevenue: number;
  weekdayRevenueDelta: number;
  weekdayImpactRate: number;
  lyHolidayAvgRevenue: number;
  forecastHolidayRevenue: number;
  holidayRevenueDelta: number;
  holidayImpactRate: number;
  sensitivityTag: string;
}

export interface WeatherForecastSimulationCategory {
  categoryCode: string;
  categoryName: string;
  lyWeekdayAvgRevenue: number;
  forecastWeekdayRevenue: number;
  weekdayRevenueDelta: number;
  weekdayImpactRate: number;
  lyHolidayAvgRevenue: number;
  forecastHolidayRevenue: number;
  holidayRevenueDelta: number;
  holidayImpactRate: number;
}

export interface WeatherForecastSimulationGrandTotal {
  lyWeekdayAvgRevenue: number;
  forecastWeekdayRevenue: number;
  weekdayRevenueDelta: number;
  weekdayImpactRate: number;
  lyHolidayAvgRevenue: number;
  forecastHolidayRevenue: number;
  holidayRevenueDelta: number;
  holidayImpactRate: number;
}

export interface WeatherForecastSimulationResponse {
  success: boolean;
  data: {
    targetMonth: string;
    lyMonth: string;
    weatherInput: {
      precipitation: number;
      snowfall: number;
    };
    grandTotal: WeatherForecastSimulationGrandTotal;
    categories: WeatherForecastSimulationCategory[];
    venues: WeatherForecastSimulationVenue[];
  };
}

// ============================================================================
// ⑫ 레저본부 영업장별 판매금액 Top 5 상품 및 가격/수요 시뮬레이션 (leisure-top-products)
// ============================================================================
export interface LeisureTopProductItem {
  rank: number;
  itemId: string;
  itemName: string;
  currentPrice: number;
  lySoldQty: number;
  lyRevenue: number;
  sharePct?: number;
  monthlyQty: number[];
  monthlyRevenue?: number[];
}

export interface LeisureTopProductsResponse {
  success: boolean;
  facility: string;
  baseYear: number;
  totalFacilityRevenue?: number;
  topProducts: LeisureTopProductItem[];
  error?: string;
}

// ============================================================================
// ⑬ 익일 부대시설 예상 매출 예측 모델 (BESM v6.0 ancillary-revenue-forecast)
// ============================================================================
export interface AncillaryCalendarInfo {
  dateId: string;
  dayOfWeek: number;
  dayName: string;
  dayType: string;
  dayGroup?: string;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName: string;
}

export interface AncillaryWeatherForecast {
  targetDate: string;
  weatherDesc: string;
  condition: 'CLEAR' | 'RAIN' | 'SNOW' | string;
  precipitationMm: number;
  tempMax: number;
  tempMin: number;
  isRainy: boolean;
  source?: string;
}

export interface BookingListItem {
  name: string;
  type?: string;
  rooms: number;
  guests: number;
}

export interface CondoSegmentDetail {
  label: string;
  rooms: number;
  guests: number;
  roomSharePct: number;
  bookingList?: BookingListItem[];
}

export interface CondoDemographics {
  totalReservedRooms: number;
  totalCapacity: number;
  occupancyRate: number;
  totalEstimatedGuests: number;
  historicalAvgRooms?: number;
  roomDeviation?: number;
  segments: {
    trueGroup: CondoSegmentDetail;
    corpWelfare: CondoSegmentDetail;
    generalFit: CondoSegmentDetail;
  };
}

export interface GolfContext {
  targetDateGolfTeams: number;
  golfPostRoundDiningSpilloverTotal: number;
  golfPostRoundDiningSpilloverFormatted?: string;
}

export interface AncillaryForecastSummary {
  grandTotalForecastRevenue: number;
  grandTotalForecastFormatted: string;
  totalGolfForecastRevenue?: number;
  totalGolfForecastFormatted?: string;
  totalRoomForecastRevenue?: number;
  totalRoomForecastFormatted?: string;
  totalFnbForecastRevenue?: number;
  totalFnbForecastFormatted?: string;
  totalLeisureForecastRevenue?: number;
  totalLeisureForecastFormatted?: string;
  totalMotoForecastRevenue?: number;
  totalMotoForecastFormatted?: string;
  totalHotelSpilloverRevenue?: number;
  totalHotelSpilloverFormatted?: string;
  totalGolfSpilloverRevenue?: number;
  totalGolfSpilloverFormatted?: string;
  clearDayBaselineRevenue?: number;
  totalWeatherImpactDelta?: number;
  spilloverSharePct?: number;
  avgSeasonalityMultiplier?: number;
  avgDayOfWeekMultiplier?: number;
  modelName?: string;
  methodology?: string;
}

export interface AncillaryVenueSegmentBreakdown {
  groupSpillover: number;
  welfareSpillover: number;
  fitSpillover: number;
}

export type WeatherSensitivityType = 'HIGH_NEGATIVE' | 'RESILIENT' | 'VULNERABLE' | 'BENEFICIARY' | string;

export interface AncillaryForecastVenue {
  venueName: string;
  displayName?: string;
  categoryCode: string;
  categoryName: string;
  forecastRevenue: number;
  forecastRevenueFormatted: string;
  forecastVisitorCount: number;
  forecastVisitorCountFormatted: string;
  historicalBenchmarkRevenue?: number;
  seasonalityMultiplier?: number;
  dayOfWeekMultiplier?: number;
  weatherMultiplier?: number;
  baselineDayTripperRevenue?: number;
  hotelSpilloverRevenue?: number;
  golfSpilloverRevenue?: number;
  hotelSpilloverSharePct?: number;
  segmentBreakdown?: AncillaryVenueSegmentBreakdown;
  weatherSensitivityTag: WeatherSensitivityType;
  weatherImpactRatePct?: number;
  weatherDeltaRevenue?: number;
  isClosed?: boolean;
  dayGroup?: string;
  sampleHistoricalDays?: number;
  keyInsight?: string;
}

export interface AncillaryRevenueForecastResponse {
  success: boolean;
  targetDate: string;
  calendar: AncillaryCalendarInfo;
  weatherForecast: AncillaryWeatherForecast;
  condoDemographics: CondoDemographics;
  golfContext?: GolfContext;
  forecastSummary: AncillaryForecastSummary;
  venues: AncillaryForecastVenue[];
  error?: string;
}

// ============================================================================
// ⑭ 리조트 종합 요약 (GET /api/v6/report/resort-business-summary)
// ============================================================================
export interface ResortLodgingStats {
  standardOccRate: number;
  connectingOccRate: number;
  remainingOccRate: number;
  physicalOccRate: number;
  fixedCapacity: number;
  fixedOccupancyRate: number;
  physicalInventory: number;
  todayRoomsSold: number;
  mtdRoomsSold: number;
  ytdRoomsSold: number;
  todayRevenue: number;
  mtdRevenue: number;
  ytdRevenue: number;
  todayAdr: number;
  mtdAdr: number;
  ytdAdr: number;
}

export interface ResortPyeongItem {
  roomType: string;
  todayRooms: number;
  todayRevenue: number;
  todayAdr: number;
  mtdRooms: number;
  mtdRevenue: number;
  mtdAdr: number;
  ytdRooms: number;
  ytdRevenue: number;
  ytdAdr: number;
  lyRooms: number;
  lyRevenue: number;
  lyAdr: number;
  revGrowth?: number | null;
  roomsGrowth?: number | null;
  adrGrowth?: number | null;
  todaySharePct?: number | null;
  mtdSharePct?: number | null;
  ytdSharePct?: number | null;
  sharePct?: number | null;
}

export interface ResortPyeongComparison {
  adrGrowth16: number;
  adrGrowth35: number;
  adrGrowth51: number;
  revGrowth16: number;
  revGrowth35: number;
  revGrowth51: number;
  roomsGrowth16: number;
  roomsGrowth35: number;
  roomsGrowth51: number;
  items: ResortPyeongItem[];
}

export interface ResortDayTypeComparisonSummary {
  weekdayRevenueGrowth: number;
  weekendRevenueGrowth: number;
  weekdayRoomsGrowth: number;
  weekendRoomsGrowth: number;
  weekdayAdrGrowth: number;
  weekendAdrGrowth: number;
}

export interface ResortDayTypeComparison {
  summary?: ResortDayTypeComparisonSummary;
  weekdayRevenueGrowth?: number;
  weekendRevenueGrowth?: number;
  weekdayRoomsGrowth?: number;
  weekendRoomsGrowth?: number;
  weekdayAdrGrowth?: number;
  weekendAdrGrowth?: number;
}

export interface ResortBusinessSummaryResponse {
  success: boolean;
  lodgingStats: ResortLodgingStats;
  rooms?: Array<{
    roomType: string;
    sharePct?: number;
    revGrowth?: number;
    [key: string]: any;
  }>;
  channels?: Array<{
    channelName: string;
    revGrowth?: number;
    [key: string]: any;
  }>;
  rates?: Array<{
    rateName: string;
    revGrowth?: number;
    [key: string]: any;
  }>;
  dayTypeComparison?: ResortDayTypeComparison;
  pyeongComparison?: ResortPyeongComparison;
  data?: any;
  error?: string;
}

// ============================================================================
// ⑮ 신규 4대 시뮬레이터 응답 규격 (POST /api/v6/simulator/*)
// ============================================================================

// 1. 전사 12개월 매출 시뮬레이터 (POST /api/v6/simulator/strategic-forecast)
export interface StrategicForecastResponse {
  success: boolean;
  selectedYear?: number;
  baseYear?: number;
  selectedMonth?: string | number;
  dayFilter?: string;
  simMode?: string;
  targetGoal?: number;
  annualTotal?: number;
  baselineAnnualTotal?: number;
  annualMaxCapacity?: number;
  utilizationRate?: number;
  shareOfTotal?: number;
  rebalanceRequiredDelta?: number;
  goalAchievementPct?: number;
  totals?: Record<string, any>;
  divisions?: any[];
  departments?: any[];
  categories?: any[];
  venues?: any[];
  monthly?: any[];
  data?: any;
  error?: string;
}

// 2. 객실×부대시설 패키지 원가·마진 생성기 (POST /api/v6/simulator/package-generator)
export interface PackageGeneratorResponse {
  success: boolean;
  month?: number;
  targetType?: string;
  roomTypeId?: string;
  roomTypeName?: string;
  nights?: number;
  adults?: number;
  children?: number;
  selectedFacilityIds?: string[];
  targetDiscountPct?: number;
  totalListPrice?: number;
  totalInternalCost?: number;
  recommendedSellingPrice?: number;
  discountAmount?: number;
  estimatedMarginAmount?: number;
  estimatedMarginPct?: number;
  breakEvenRooms?: number;
  targetRevpar?: number;
  components?: Array<{
    id?: string;
    name?: string;
    category?: string;
    listPrice?: number;
    cost?: number;
    sellingPrice?: number;
    margin?: number;
    [key: string]: any;
  }>;
  data?: any;
  error?: string;
}

// 3. 레저 결합상품 가격·수익 시뮬레이터 (POST /api/v6/simulator/leisure-pricing)
export interface LeisurePricingSimResponse {
  success: boolean;
  selectedItemIds?: string[];
  bundleDiscountPct?: number;
  expectedVolumeIncreasePct?: number;
  startDate?: string;
  endDate?: string;
  totalNormalPrice?: number;
  bundleSellingPrice?: number;
  discountAmount?: number;
  baselineRevenue?: number;
  projectedRevenue?: number;
  netRevenueDelta?: number;
  revenueGrowthPct?: number;
  allocatedUnitPrices?: Array<{
    itemId?: string;
    name?: string;
    normalPrice?: number;
    allocatedPrice?: number;
    [key: string]: any;
  }>;
  data?: any;
  error?: string;
}

// 4. 월별 동적 목표 리밸런싱 시뮬레이터 (POST /api/v6/simulator/monthly-rebalancer)
export interface MonthlyRebalanceMonthItem {
  month: number;
  monthLabel?: string;
  isClosed?: boolean;
  lyRevenue?: number;
  actualRevenue?: number;
  originalTarget?: number;
  rebalancedTarget?: number;
  targetDelta?: number;
  requiredYoYGrowthPct?: number;
}

export interface MonthlyRebalancerResponse {
  success: boolean;
  baseYear?: number;
  targetYear?: number;
  annualTargetRevenue?: number;
  lyTotalRevenue?: number;
  closedTotalRevenue?: number;
  remainingRequiredRevenue?: number;
  closedMonthsCount?: number;
  remainingMonthsCount?: number;
  requiredYoYGrowthPct?: number;
  monthly?: MonthlyRebalanceMonthItem[];
  months?: MonthlyRebalanceMonthItem[];
  departmentTargets?: Array<{
    departmentName?: string;
    targetRevenue?: number;
    sharePct?: number;
    [key: string]: any;
  }>;
  data?: any;
  error?: string;
}

// ============================================================================
// ⑯ 숙박·연회 단체 × 식음/부대 영업장 선호도 및 평균 매출·급증률 분석 리포트
// (GET /api/v6/report/group-venue-preference)
// ============================================================================
export type VenueCategoryType = 'FNB' | 'LEISURE';
export type GroupSegmentType = 'ENTERPRISE' | 'PUBLIC' | 'SCHOOL' | 'TRAVEL' | 'OTHER';
export type SurgeGradeType = 'EXPLOSIVE' | 'HIGH' | 'MODERATE' | 'STABLE';

export interface GroupVenuePreferenceResponse {
  success: boolean;
  status?: 'OK' | 'SERVER_SLEEPING' | 'ERROR';
  isPowerSaving?: boolean;
  message?: string;
  meta?: {
    engine?: string;
    period?: {
      startDate: string;
      endDate: string;
      totalDays: number;
    };
    summary?: {
      totalUniqueGroups: number;
      totalUniqueGroupsFormatted: string;
      totalGroupTxCount: number;
      totalGroupTxCountFormatted: string;
      totalGroupSpend: number;
      totalGroupSpendFormatted: string;
      avgSpendPerGroup: number;
      avgSpendPerGroupFormatted: string;
      avgSpendPerTx: number;
      avgSpendPerTxFormatted: string;
      topRevenueVenue?: {
        venueName: string;
        groupCount: number;
        groupSpend: number;
        groupSpendFormatted: string;
        b2bAvgSpendPerGroupFormatted: string;
      };
      topGroupCountVenue?: {
        venueName: string;
        groupCount: number;
        groupSpend: number;
        groupSpendFormatted: string;
      };
      topSurgeVenue?: {
        venueName: string;
        avgDailyRevWithGroupFormatted: string;
        avgDailyRevWithoutGroupFormatted: string;
        surgePct: number;
        surgePctFormatted: string;
      };
    };
  };
  venueRankings?: VenueGroupRankingItem[];
  groupTrails?: GroupConsumptionTrailItem[];
  segmentPreferenceMatrix?: SegmentPreferenceMatrixItem[];
  staySurgeCorrelation?: StaySurgeCorrelationItem[];
  data?: any;
  error?: string;
}

export interface VenueGroupRankingItem {
  rank: number;
  venueName: string;
  venueCategory: VenueCategoryType;
  venueCategoryName: string;
  totalGroupCount: number;
  totalGroupCountFormatted: string;
  b2bGroupCount: number;
  roomChargeGroupCount: number;
  totalTxCount: number;
  b2bTxCount: number;
  totalGroupRevenue: number;
  totalGroupRevenueFormatted: string;
  b2bRevenue: number;
  b2bRevenueFormatted: string;
  roomChargeRevenue: number;
  roomChargeRevenueFormatted: string;
  shareOfGroupSalesPct: number;
  b2bAvgSpendPerGroup: number;
  b2bAvgSpendPerGroupFormatted: string;
  b2bAvgSpendPerTx: number;
  b2bAvgSpendPerTxFormatted: string;
  avgSpendPerGroup: number;
  avgSpendPerGroupFormatted: string;
  groupVisitDays: number;
  nonGroupVisitDays: number;
  avgDailyRevWithGroup: number;
  avgDailyRevWithGroupFormatted: string;
  avgDailyRevWithoutGroup: number;
  avgDailyRevWithoutGroupFormatted: string;
  revenueSurgeDelta: number;
  revenueSurgeDeltaFormatted: string;
  revenueSurgePct: number;
  revenueSurgePctFormatted: string;
  revenueSurgeGrade: SurgeGradeType;
  topVisitingGroups: Array<{
    groupName: string;
    spend: number;
    spendFormatted: string;
    txCount: number;
  }>;
}

export interface GroupConsumptionTrailItem {
  rank: number;
  groupCode: string;
  groupRawInfo: string;
  groupName: string;
  groupSegment: GroupSegmentType;
  groupSegmentName: string;
  visitDates: string[];
  roomStayMatched: boolean;
  roomsCount: number | null;
  paxCount: number | null;
  visitedVenueCount: number;
  totalGroupSpend: number;
  totalGroupSpendFormatted: string;
  fnbSpend: number;
  fnbSpendFormatted: string;
  leisureSpend: number;
  leisureSpendFormatted: string;
  avgSpendPerVenue: number;
  avgSpendPerVenueFormatted: string;
  favoriteFnbVenue: string | null;
  favoriteLeisureVenue: string | null;
  venueBreakdown: Array<{
    venueName: string;
    venueCategory: VenueCategoryType;
    txCount: number;
    spend: number;
    spendFormatted: string;
    sharePct: number;
  }>;
}

export interface SegmentPreferenceMatrixItem {
  groupSegment: GroupSegmentType;
  groupSegmentName: string;
  groupCount: number;
  totalFnbSpend: number;
  totalFnbSpendFormatted: string;
  avgFnbSpendPerGroup: number;
  avgFnbSpendPerGroupFormatted: string;
  avgTotalSpendPerGroup: number;
  avgTotalSpendPerGroupFormatted: string;
  top1Venue: string;
  top2Venue: string;
  top3Venue: string;
  patternDescription: string;
  venueShares: Array<{
    venueName: string;
    groupCount: number;
    spend: number;
    spendFormatted: string;
    avgSpendPerGroup: number;
    avgSpendPerGroupFormatted: string;
    sharePct: number;
  }>;
}

export interface StaySurgeCorrelationItem {
  tierCode: 'LARGE_GROUP_DAY' | 'MEDIUM_GROUP_DAY' | 'NORMAL_DAY';
  tierName: string;
  daysCount: number;
  avgGroupRooms: number;
  avgDailyFnbRevenue: number;
  avgDailyFnbRevenueFormatted: string;
  avgBigTicketRevenue: number;
  avgBigTicketRevenueFormatted: string;
  avgBigTicketCount: number;
  venueAvgDailyRevenue: Record<string, {
    avgRevenue: number;
    avgRevenueFormatted: string;
  }>;
}

