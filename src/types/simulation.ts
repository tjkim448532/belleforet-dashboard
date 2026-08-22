export interface FacilityCapacityItem {
  id: string;
  shopCode: string;
  shopName: string;
  category: 'ROOM' | 'GOLF' | 'LEISURE' | 'MOTO' | 'FNB' | 'BANQUET' | 'OTHER';
  categoryLabel: string;
  maxDailyUnits?: number;
  unitName?: string;
  baseUnitPrice?: number;
  allowPriceLeverage?: boolean;
  maxPriceHikeRate?: number;
  allowSpillover?: boolean;
  spilloverPriority?: number;
  notes?: string;
}

export interface SimulationTargetInput {
  baseYear: number; // 기준 실적 연도 (2024, 2025, 2026)
  targetYear: number; // 목표 대상 연도 (2025, 2026, 2027)
  selectedMonth: number | 'ANNUAL'; // 1~12 또는 'ANNUAL' (전사 연간 종합)
  period: 'ANNUAL' | 'H1' | 'Q1' | 'Q2' | 'M01' | 'M02' | 'M03' | 'M04' | 'M05' | 'M06' | 'M07' | 'M08' | 'M09' | 'M10' | 'M11' | 'M12';
  metricInputMode: 'TREVPAR' | 'GROWTH_RATE' | 'TOTAL_REVENUE';
  targetTrevpar: number; // 원 / 175실·월
  targetGrowthRate: number; // 전년 대비 성장률 (%)
  targetTotalRevenue: number; // 전사 총매출 목표 (원)
  strategyMode?: 'BALANCED' | 'PRICE_LEVERAGE' | 'VOLUME_MAXIMIZE';
  includeGolf: boolean;
}

export interface DivisionAllocationResult {
  category: 'ROOM' | 'GOLF' | 'LEISURE' | 'MOTO' | 'FNB' | 'BANQUET' | 'OTHER';
  categoryLabel: string;
  icon: string;
  color: string;
  lyRevenue: number;
  targetRevenue: number;
  targetShare: number; // %
  growthRate: number; // %
  diffAmount: number; // 원
  facilities: FacilityAllocationResult[];
}

export interface FacilityAllocationResult {
  shopCode: string;
  shopName: string;
  category: string;
  lyRevenue: number;
  targetRevenue: number;
  shareRatio: number;
}
