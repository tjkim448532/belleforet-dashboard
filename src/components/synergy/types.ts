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
  apiMeta?: {
    singleFacilityArpu?: number;
    multiFacilityArpu?: number;
    arpuLiftMultiplier?: number;
  };
  dailyTrends?: DailyTrendItem[];
}
