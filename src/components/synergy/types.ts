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
}

export interface CrossSynergyMatrixResponse {
  status: string;
  meta: {
    startDate: string;
    endDate: string;
    daysCount: number;
    anchor: string;
  };
  anchor: AnchorInfo;
  correlations: CrossSynergyItem[];
}

