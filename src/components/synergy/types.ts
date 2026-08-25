export interface DailyTrendItem {
  date: string;
  roomsSold: number;
  storeSales: number;
}

export interface StoreCorrelationItem {
  divisionName?: string;
  shopName: string;
  storeName?: string;
  channelName?: string;
  segmentName?: string;
  totalSales: number;
  correlatedSales: number;
  correlatedVisitors: number;
  correlatedGuests?: number;
  spilloverRate: number;
  forwardSpillover?: number;
  reverseSpillover?: number;
  correlationCoefficient?: number;
  correlationCoefficientLag1?: number;
  maxCorrelationLag?: number;
  liftValue?: number;
  interactionGrade?: string;
  revPasContribution?: number;
  isGuestRatioTrackable?: boolean;
  calculationMethod?: string;
  elasticityPercent?: number;
  spilloverPerMillion?: number;
  synergyGrade?: 'EXCELLENT' | 'HIGH' | 'MODERATE' | 'LOW' | 'INSIGNIFICANT' | string;
  insight?: string;
  // 🔬 1. 외생변수 통제 순수 인과 지표 (True Net Metrics)
  rawCorrelation?: number;
  pureCorrelation?: number;
  isSpurious?: boolean;
  pureElasticity?: number;
  pureSpilloverPerMillion?: number;
  causalConfidenceGrade?: 'CONFIRMED' | 'MODERATE' | 'NOISE' | string;
  // 🚨 2. 물리적 CAPA 수용 한계 및 병목 임계점 (Capacity & Bottleneck)
  saturationThreshold_K?: number;
  currentCapacityUtilization?: number;
  bottleneckRisk?: 'SAFE' | 'WARNING' | 'CRITICAL' | string;
  missedSpilloverRevenue?: number;
  // ⏳ 3. 시차 연쇄 소비 분포 (Time-Lag & Cascade Flow)
  timeLagDistribution?: {
    sameDayRatio: number;
    nextDayRatio: number;
  };
  // 🌦️ 4. 날씨/요일 민감도 분해
  weatherImpact?: {
    rain10mmEffect: number;
    temp1degEffect: number;
    weekendPremiumMultiplier?: number;
  };
  // 💡 5. AI 전략 추천 인사이트
  aiStrategyInsight?: string;
  bundlingRecommendation?: string;
  operationAdvice?: string;
  capacityWarning?: string;
  apiMeta?: {
    singleFacilityArpu?: number;
    multiFacilityArpu?: number;
    arpuLiftMultiplier?: number;
  };
  dailyTrends?: DailyTrendItem[];
}

export interface AnchorInfo {
  code: string;
  name: string;
  periodTotalRevenue: number;
  dailyAvgRevenue: number;
}

export interface CrossSynergyItem {
  targetShopName: string;
  categoryName: string;
  correlationCoefficient: number;
  elasticityPercent: number;
  spilloverPerMillion: number;
  synergyGrade: 'EXCELLENT' | 'HIGH' | 'MODERATE' | 'LOW' | 'INSIGNIFICANT' | string;
  insight: string;
  // Enhanced Causal fields
  rawCorrelation?: number;
  pureCorrelation?: number;
  isSpurious?: boolean;
  pureElasticity?: number;
  pureSpilloverPerMillion?: number;
  causalConfidenceGrade?: 'CONFIRMED' | 'MODERATE' | 'NOISE' | string;
  saturationThreshold_K?: number;
  currentCapacityUtilization?: number;
  bottleneckRisk?: 'SAFE' | 'WARNING' | 'CRITICAL' | string;
  missedSpilloverRevenue?: number;
  timeLagDistribution?: {
    sameDayRatio: number;
    nextDayRatio: number;
  };
  weatherImpact?: {
    rain10mmEffect: number;
    temp1degEffect: number;
    weekendPremiumMultiplier?: number;
  };
  aiStrategyInsight?: string;
}

export interface ExogenousControlMeta {
  controlledVariables: string[];
  observationDays: number;
}

export interface CrossSynergyMatrixResponse {
  status: string;
  meta?: {
    startDate: string;
    endDate: string;
    daysCount: number;
    anchor: string;
  };
  anchor: AnchorInfo;
  exogenousControl?: ExogenousControlMeta;
  summary?: {
    topPureSynergyStore?: { name: string; pureSpillover: number; pureElasticity: number };
    highestLagSpilloverStore?: { name: string; nextDayRatio: number };
    criticalBottleneckStore?: { name: string; utilization: number; status: string };
  };
  correlations: CrossSynergyItem[];
  synergyMatrix?: CrossSynergyItem[];
}

