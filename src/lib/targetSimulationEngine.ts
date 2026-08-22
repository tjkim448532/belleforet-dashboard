import type { 
  FacilityCapacityItem, 
  SimulationTargetInput, 
  DivisionAllocationResult, 
  FacilityAllocationResult 
} from '../types/simulation';
import { DEFAULT_CAPACITY_SEEDS } from '../data/defaultCapacitySeeds';
import { 
  MONTHLY_SEASONALITY_DATA, 
  ANNUAL_BASELINE_META 
} from '../data/monthlySeasonalityData';

// 6대 사업부 메타데이터 (아이콘, 색상, 라벨)
const DIVISION_META: Record<string, { color: string; icon: string; label: string }> = {
  ROOM: { color: '#1E3A8A', icon: '🏨', label: '객실' },
  FNB: { color: '#16A34A', icon: '🍽️', label: '식음' },
  GOLF: { color: '#9333EA', icon: '⛳', label: '골프' },
  LEISURE: { color: '#EAB308', icon: '🎢', label: '레저본부' },
  MOTO: { color: '#E11D48', icon: '🏎️', label: '모토아레나' },
  BANQUET: { color: '#0891B2', icon: '🏛️', label: '대관' },
  OTHER: { color: '#64748B', icon: '📦', label: '독립/기타' }
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
  selectedMonthLabel: string;
  periodDays: number;
} {
  const masterItems = (capacityMaster.length > 0 ? capacityMaster : DEFAULT_CAPACITY_SEEDS)
    .filter(f => f.id !== 'cap_leisure_luge' && f.shopName !== '익스트림 루지');

  const isAnnual = input.selectedMonth === 'ANNUAL';
  const monthNum = typeof input.selectedMonth === 'number' ? input.selectedMonth : 7;
  const monthMeta = MONTHLY_SEASONALITY_DATA[monthNum] || MONTHLY_SEASONALITY_DATA[7];

  const periodDays = isAnnual ? 365 : monthMeta.days;
  const selectedMonthLabel = isAnnual ? '2027년 연간 종합' : `${monthNum}월 실측 계절성`;

  // 1. 기준 실적 (전년 동월/연간 순매출 및 TrevPAR)
  const baseLyTotalRevenue = isAnnual ? ANNUAL_BASELINE_META.totalRevenue : monthMeta.totalRevenue;
  const baseLyTrevpar = isAnnual ? ANNUAL_BASELINE_META.trevpar : monthMeta.trevpar;

  // 2. 연간 성장률 적용한 목표 전사 매출액 및 목표 TrevPAR
  let targetTotalRevenue = Math.round(baseLyTotalRevenue * (1 + input.targetGrowthRate / 100));
  let achievedTrevpar = Math.round(baseLyTrevpar * (1 + input.targetGrowthRate / 100));

  if (input.metricInputMode === 'TREVPAR' && input.targetTrevpar > 0) {
    achievedTrevpar = input.targetTrevpar;
    targetTotalRevenue = Math.round(input.targetTrevpar * periodDays * 175);
  }

  // 3. 골프 포함 여부에 따른 사업부 구성
  const activeDivisions = input.includeGolf 
    ? ['ROOM', 'FNB', 'GOLF', 'LEISURE', 'MOTO', 'BANQUET', 'OTHER']
    : ['ROOM', 'FNB', 'LEISURE', 'MOTO', 'BANQUET', 'OTHER'];

  // 해당 월(또는 연간)의 사업부별 실측 매출 비중
  const divShares = isAnnual ? {
    ROOM: 0.22, FNB: 0.26, GOLF: 0.32, LEISURE: 0.12, MOTO: 0.05, BANQUET: 0.02, OTHER: 0.01
  } : monthMeta.divisionShares;

  const totalRawWeight = activeDivisions.reduce((sum, div) => sum + (divShares[div as keyof typeof divShares] || 0.01), 0);

  // 4. 사업부 및 42개 영업장 2단계 정밀 안분
  const divisionResults: DivisionAllocationResult[] = activeDivisions.map(divKey => {
    const meta = DIVISION_META[divKey];
    const rawShare = divShares[divKey as keyof typeof divShares] || 0.01;
    const normalizedWeight = rawShare / totalRawWeight;

    const divTargetRevenue = Math.round(targetTotalRevenue * normalizedWeight);
    const divLyRevenue = Math.round(baseLyTotalRevenue * normalizedWeight);
    const divGrowthRate = divLyRevenue > 0 ? Number((((divTargetRevenue - divLyRevenue) / divLyRevenue) * 100).toFixed(1)) : 0;

    // 해당 부문의 42개 공식 영업장 필터
    const matchingFacilities = masterItems.filter(f => f.category === divKey);
    const facilityCount = Math.max(1, matchingFacilities.length);

    // 해당 월의 원천 영업장별 실측 매출 매핑
    const facilityResults: FacilityAllocationResult[] = matchingFacilities.map((fac) => {
      // 1. 해당 월(또는 연간) 실측 매출액 정확 매핑 (백엔드 표준 영업장 SSOT)
      let facLyRevenue = Math.round(divLyRevenue / facilityCount);

      if (!isAnnual && Array.isArray(monthMeta.facilities)) {
        const match = monthMeta.facilities.find(mf => mf.venueName === fac.shopName);
        if (match) {
          facLyRevenue = match.netRevenue;
        }
      } else if (isAnnual) {
        let annualSum = 0;
        for (let m = 1; m <= 12; m++) {
          const mFac = MONTHLY_SEASONALITY_DATA[m]?.facilities?.find(mf => mf.venueName === fac.shopName);
          if (mFac) {
            annualSum += mFac.netRevenue;
          }
        }
        if (annualSum > 0) {
          facLyRevenue = annualSum;
        }
      }

      // 2. 그 달의 실측 비중에 맞춘 목표 매출액 역산
      let facTargetRevenue = Math.round(facLyRevenue * (1 + input.targetGrowthRate / 100));
      if (facLyRevenue === 0) {
        facTargetRevenue = Math.round(divTargetRevenue / facilityCount);
      }

      // 3. 물리적 캐파(일수 * 1일 최대 한계) 검증
      const maxPeriodUnits = fac.maxDailyUnits * periodDays;
      const baseUnitPrice = fac.baseUnitPrice || 10000;

      // 필요 판매량 Q = 목표매출 / 단가
      const requiredUnits = Math.round(facTargetRevenue / baseUnitPrice);
      const requiredDailyUnits = Math.round(requiredUnits / periodDays);
      let capacityUtilizationRate = fac.maxDailyUnits > 0 ? Number(((requiredDailyUnits / fac.maxDailyUnits) * 100).toFixed(1)) : 0;

      let targetUnitPrice = baseUnitPrice;
      let unitPriceHikeRate = 0;
      let status: 'NORMAL' | 'CAPACITY_WARNING' | 'PRICE_HIKE_REQUIRED' | 'SPILLOVER_REALLOCATED' = 'NORMAL';
      let statusMessage = '정상 수용 가능 (가동률 여유)';
      let spilloverAmount = 0;

      // 4. 캐파 상한 도달 시 단가 인상 및 초과 재배분 가이드
      if (capacityUtilizationRate >= 100) {
        if (fac.allowPriceLeverage) {
          const requiredUnitPrice = Math.round(facTargetRevenue / maxPeriodUnits);
          unitPriceHikeRate = Number((((requiredUnitPrice - baseUnitPrice) / baseUnitPrice) * 100).toFixed(1));

          if (unitPriceHikeRate <= fac.maxPriceHikeRate) {
            targetUnitPrice = requiredUnitPrice;
            capacityUtilizationRate = 100;
            status = 'PRICE_HIKE_REQUIRED';
            statusMessage = `성수기 캐파 100% 도달 ➔ 단가 +${unitPriceHikeRate}% 인상 가이드 (₩${targetUnitPrice.toLocaleString()}원)`;
          } else {
            targetUnitPrice = Math.round(baseUnitPrice * (1 + fac.maxPriceHikeRate / 100));
            unitPriceHikeRate = fac.maxPriceHikeRate;
            const maxAbsorbableRevenue = maxPeriodUnits * targetUnitPrice;
            spilloverAmount = Math.max(0, facTargetRevenue - maxAbsorbableRevenue);
            facTargetRevenue = maxAbsorbableRevenue;
            capacityUtilizationRate = 100;

            status = 'SPILLOVER_REALLOCATED';
            statusMessage = `단가 상한(+${fac.maxPriceHikeRate}%) 도달 ➔ 초과분 ₩${Math.round(spilloverAmount / 10000).toLocaleString()}만원 타 부문 재배분`;
          }
        } else {
          const maxAbsorbableRevenue = maxPeriodUnits * baseUnitPrice;
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

  const overallGrowthRate = Number(input.targetGrowthRate.toFixed(1));

  return {
    divisionResults,
    totalTargetRevenue: targetTotalRevenue,
    totalLyRevenue: baseLyTotalRevenue,
    overallGrowthRate,
    achievedTrevpar,
    selectedMonthLabel,
    periodDays
  };
}
