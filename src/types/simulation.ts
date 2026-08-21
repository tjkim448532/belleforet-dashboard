export interface FacilityCapacityItem {
  id: string;
  shopCode: string;
  shopName: string;
  category: 'ROOM' | 'GOLF' | 'LEISURE' | 'MOTO' | 'FNB' | 'BANQUET' | 'OTHER';
  categoryLabel: string;
  maxDailyUnits: number; // 1일 최대 물리적 캐파 (객실 175실, 골프 80팀, 루지 1200명 등)
  unitName: string; // '실', '팀', '명', '석', '세션', '건'
  baseUnitPrice: number; // 기준 평균 단가 (ADR, 그린피, 탑승권 등)
  maxTurnoverRate?: number; // 식음 등 회전율 (예: 2.5)
  allowPriceLeverage: boolean; // 캐파 초과 시 단가 인상 허용 여부
  maxPriceHikeRate: number; // 최대 단가 인상 허용 한계 (%) (예: 30%)
  allowSpillover: boolean; // 초과분 타 영업장 전이 허용 여부
  spilloverPriority: number; // 전이 우선순위 (낮을수록 우선)
  notes?: string;
}

export interface SimulationTargetInput {
  targetYear: number;
  period: 'ANNUAL' | 'H1' | 'Q1' | 'Q2' | 'M01' | 'M02' | 'M03' | 'M04' | 'M05' | 'M06' | 'M07' | 'M08' | 'M09' | 'M10' | 'M11' | 'M12';
  metricInputMode: 'TREVPAR' | 'GROWTH_RATE' | 'TOTAL_REVENUE';
  targetTrevpar: number; // 원 / 175실·월
  targetGrowthRate: number; // 전년 대비 성장률 (%)
  targetTotalRevenue: number; // 전사 총매출 목표 (원)
  strategyMode: 'BALANCED' | 'PRICE_LEVERAGE' | 'VOLUME_MAXIMIZE';
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
  growthRate: number;
  diffAmount: number;
  
  // Q & P Analysis
  requiredDailyUnits: number;
  maxDailyUnits: number;
  unitName: string;
  capacityUtilizationRate: number; // %
  
  baseUnitPrice: number;
  targetUnitPrice: number;
  unitPriceHikeRate: number; // %
  
  // Status Flags
  status: 'NORMAL' | 'CAPACITY_WARNING' | 'PRICE_HIKE_REQUIRED' | 'SPILLOVER_REALLOCATED';
  statusMessage: string;
  spilloverAmount: number;
}

export interface SimulationScenario {
  id: string;
  title: string;
  createdAt: string;
  input: SimulationTargetInput;
  divisionResults: DivisionAllocationResult[];
  totalTargetRevenue: number;
  totalLyRevenue: number;
  overallGrowthRate: number;
  achievedTrevpar: number;
}
