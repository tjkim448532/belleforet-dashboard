import type { 
  FacilityCapacityItem, 
  SimulationTargetInput, 
  DivisionAllocationResult, 
  FacilityAllocationResult 
} from '../types/simulation';
import { DEFAULT_CAPACITY_SEEDS } from '../pages/AdminCapacity';

// 43개 공식 영업장 기반 6대 핵심 사업군 및 독립 기타 부문 가중치
const DIVISION_SEASONAL_WEIGHTS: Record<string, { weight: number; color: string; icon: string; label: string }> = {
  ROOM: { weight: 0.22, color: '#1E3A8A', icon: '🏨', label: '객실' },
  FNB: { weight: 0.26, color: '#16A34A', icon: '🍽️', label: '식음' },
  GOLF: { weight: 0.32, color: '#9333EA', icon: '⛳', label: '골프' },
  LEISURE: { weight: 0.12, color: '#EAB308', icon: '🎢', label: '레저본부' },
  MOTO: { weight: 0.05, color: '#E11D48', icon: '🏎️', label: '모토아레나' },
  BANQUET: { weight: 0.02, color: '#0891B2', icon: '🏛️', label: '대관' },
  OTHER: { weight: 0.01, color: '#64748B', icon: '📦', label: '독립/기타' }
};

export function runTargetSimulation(
  input: SimulationTargetInput,
  capacityMaster: FacilityCapacityItem[] = DEFAULT_CAPACITY_SEEDS
): {
  divisionResults: DivisionAllocationResult[];
  totalTargetRevenue: number;
  totalLyRevenue: number;
  overallGrowthRate: number;
  achievedTrevpar: number;
} {
  const masterItems = capacityMaster.length > 0 ? capacityMaster : DEFAULT_CAPACITY_SEEDS;

  // 1. Calculate Target Total Revenue (연간 365일 175실 기준)
  // 2025 진본 기준 전사 연간 순매출 기준선: 약 ₩285억 원
  const baseLyTotalRevenue = 28500000000; 

  let targetTotalRevenue = input.targetTotalRevenue;

  if (input.metricInputMode === 'TREVPAR') {
    // Target TrevPAR (월평균 / 175실) * 12개월 * 175실
    targetTotalRevenue = Math.round(input.targetTrevpar * 12 * 175);
  } else if (input.metricInputMode === 'GROWTH_RATE') {
    targetTotalRevenue = Math.round(baseLyTotalRevenue * (1 + input.targetGrowthRate / 100));
  }

  // 2. Division Level 1st Allocation
  const activeDivisions = input.includeGolf 
    ? ['ROOM', 'FNB', 'GOLF', 'LEISURE', 'MOTO', 'BANQUET', 'OTHER']
    : ['ROOM', 'FNB', 'LEISURE', 'MOTO', 'BANQUET', 'OTHER'];

  let totalWeight = activeDivisions.reduce((sum, div) => sum + DIVISION_SEASONAL_WEIGHTS[div].weight, 0);

  const divisionResults: DivisionAllocationResult[] = activeDivisions.map(divKey => {
    const meta = DIVISION_SEASONAL_WEIGHTS[divKey];
    const normalizedWeight = meta.weight / totalWeight;
    const divTargetRevenue = Math.round(targetTotalRevenue * normalizedWeight);
    const divLyRevenue = Math.round(baseLyTotalRevenue * normalizedWeight);
    const divGrowthRate = divLyRevenue > 0 ? Number((((divTargetRevenue - divLyRevenue) / divLyRevenue) * 100).toFixed(1)) : 0;

    // Filter matching 43 SSOT facilities
    const matchingFacilities = masterItems.filter(f => f.category === divKey);
    const facilityCount = Math.max(1, matchingFacilities.length);

    // 3. Facility Level 2nd Allocation with Capacity Ceiling Checks
    const facilityResults: FacilityAllocationResult[] = matchingFacilities.map((fac) => {
      // Split division revenue proportionally among facilities
      const facLyRevenue = Math.round(divLyRevenue / facilityCount);
      let facTargetRevenue = Math.round(divTargetRevenue / facilityCount);

      // Max annual units (1일 최대 * 365일)
      const maxAnnualUnits = fac.maxDailyUnits * 365;
      const baseUnitPrice = fac.baseUnitPrice || 10000;

      // Required units at base unit price
      const requiredUnits = Math.round(facTargetRevenue / baseUnitPrice);
      const requiredDailyUnits = Math.round(requiredUnits / 365);
      let capacityUtilizationRate = fac.maxDailyUnits > 0 ? Number(((requiredDailyUnits / fac.maxDailyUnits) * 100).toFixed(1)) : 0;

      let targetUnitPrice = baseUnitPrice;
      let unitPriceHikeRate = 0;
      let status: 'NORMAL' | 'CAPACITY_WARNING' | 'PRICE_HIKE_REQUIRED' | 'SPILLOVER_REALLOCATED' = 'NORMAL';
      let statusMessage = '정상 수용 가능 (가동률 여유)';
      let spilloverAmount = 0;

      // Capacity Ceiling Optimization
      if (capacityUtilizationRate >= 100) {
        if (fac.allowPriceLeverage) {
          // Q is capped at 100% capacity (maxAnnualUnits)
          // Compute required Unit Price P = Target Revenue / Max Units
          const requiredUnitPrice = Math.round(facTargetRevenue / maxAnnualUnits);
          unitPriceHikeRate = Number((((requiredUnitPrice - baseUnitPrice) / baseUnitPrice) * 100).toFixed(1));

          if (unitPriceHikeRate <= fac.maxPriceHikeRate) {
            targetUnitPrice = requiredUnitPrice;
            capacityUtilizationRate = 100;
            status = 'PRICE_HIKE_REQUIRED';
            statusMessage = `캐파 100% 도달 ➔ 단가 +${unitPriceHikeRate}% 인상 가이드 (₩${targetUnitPrice.toLocaleString()}원)`;
          } else {
            // Price hike exceeds max allowed limit -> cap price hike and spillover excess
            targetUnitPrice = Math.round(baseUnitPrice * (1 + fac.maxPriceHikeRate / 100));
            unitPriceHikeRate = fac.maxPriceHikeRate;
            const maxAbsorbableRevenue = maxAnnualUnits * targetUnitPrice;
            spilloverAmount = Math.max(0, facTargetRevenue - maxAbsorbableRevenue);
            facTargetRevenue = maxAbsorbableRevenue;
            capacityUtilizationRate = 100;

            status = 'SPILLOVER_REALLOCATED';
            statusMessage = `단가 상한(+${fac.maxPriceHikeRate}%) 도달 ➔ 초과분 ₩${Math.round(spilloverAmount / 10000).toLocaleString()}만원 타 영업장 재배분`;
          }
        } else {
          // No price leverage allowed -> cap revenue at max capacity, spillover all excess
          const maxAbsorbableRevenue = maxAnnualUnits * baseUnitPrice;
          spilloverAmount = Math.max(0, facTargetRevenue - maxAbsorbableRevenue);
          facTargetRevenue = maxAbsorbableRevenue;
          capacityUtilizationRate = 100;

          status = 'SPILLOVER_REALLOCATED';
          statusMessage = `정가 고정형 캐파 100% 매진 ➔ 초과분 ₩${Math.round(spilloverAmount / 10000).toLocaleString()}만원 재배분`;
        }
      } else if (capacityUtilizationRate >= 85) {
        status = 'CAPACITY_WARNING';
        statusMessage = `캐파 임박 (가동률 ${capacityUtilizationRate}%)`;
      }

      return {
        shopCode: fac.shopCode,
        shopName: fac.shopName,
        category: fac.categoryLabel,
        lyRevenue: facLyRevenue,
        targetRevenue: facTargetRevenue,
        growthRate: facLyRevenue > 0 ? Number((((facTargetRevenue - facLyRevenue) / facLyRevenue) * 100).toFixed(1)) : 0,
        diffAmount: facTargetRevenue - facLyRevenue,
        requiredDailyUnits,
        maxDailyUnits: fac.maxDailyUnits,
        unitName: fac.unitName,
        capacityUtilizationRate,
        baseUnitPrice,
        targetUnitPrice,
        unitPriceHikeRate,
        status,
        statusMessage,
        spilloverAmount
      };
    });

    return {
      category: divKey as any,
      categoryLabel: meta.label,
      icon: meta.icon,
      color: meta.color,
      lyRevenue: divLyRevenue,
      targetRevenue: divTargetRevenue,
      targetShare: Number((normalizedWeight * 100).toFixed(1)),
      growthRate: divGrowthRate,
      diffAmount: divTargetRevenue - divLyRevenue,
      facilities: facilityResults
    };
  });

  const totalLyRevenue = divisionResults.reduce((sum, d) => sum + d.lyRevenue, 0);
  const actualTargetRevenue = divisionResults.reduce((sum, d) => sum + d.targetRevenue, 0);
  const overallGrowthRate = totalLyRevenue > 0 ? Number((((actualTargetRevenue - totalLyRevenue) / totalLyRevenue) * 100).toFixed(1)) : 0;
  const achievedTrevpar = Math.round(actualTargetRevenue / (12 * 175));

  return {
    divisionResults,
    totalTargetRevenue: actualTargetRevenue,
    totalLyRevenue,
    overallGrowthRate,
    achievedTrevpar
  };
}
