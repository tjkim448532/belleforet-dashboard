import type { 
  FacilityCapacityItem, 
  SimulationTargetInput, 
  DivisionAllocationResult, 
  FacilityAllocationResult 
} from '../types/simulation';
import { DEFAULT_CAPACITY_SEEDS } from '../data/defaultCapacitySeeds';
import { 
  MULTI_YEAR_SEASONALITY_DATA 
} from '../data/monthlySeasonalityData';

// 7대 공식 사업본부 메타데이터 (공식 명칭 SSOT)
const DIVISION_META: Record<string, { color: string; icon: string; label: string; teamName: string }> = {
  GOLF: { color: '#9333EA', icon: '⛳', label: 'GOLF', teamName: '골프사업본부' },
  ROOM: { color: '#1E3A8A', icon: '🏨', label: 'ROOM', teamName: '리조트사업본부' },
  FNB: { color: '#16A34A', icon: '🍽️', label: 'FNB', teamName: '콘텐츠기획본부' },
  LEISURE: { color: '#EAB308', icon: '🎢', label: 'TICKET', teamName: '레저본부' },
  TICKET: { color: '#EAB308', icon: '🎢', label: 'TICKET', teamName: '레저본부' },
  MOTO: { color: '#E11D48', icon: '🏎️', label: 'MOTO', teamName: '모토아레나' },
  BANQUET: { color: '#0891B2', icon: '🏛️', label: 'BANQUET', teamName: '세일즈본부' },
  PARKING: { color: '#0284C7', icon: '🅿️', label: 'PARKING', teamName: '주차관제' },
  OTHER: { color: '#64748B', icon: '📦', label: 'OTHER', teamName: '독립/기타' }
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
  baseYear: number;
  targetYear: number;
} {
  const masterItems = (capacityMaster.length > 0 ? capacityMaster : DEFAULT_CAPACITY_SEEDS)
    .filter(f => f.id !== 'cap_leisure_luge' && f.shopName !== '익스트림 루지');

  const baseYear = input.baseYear || 2025;
  const targetYear = input.targetYear || (baseYear + 1);

  const yearMeta = MULTI_YEAR_SEASONALITY_DATA[baseYear] || MULTI_YEAR_SEASONALITY_DATA[2025];
  const isAnnual = input.selectedMonth === 'ANNUAL';
  const monthNum = typeof input.selectedMonth === 'number' ? input.selectedMonth : 7;
  const monthMeta = yearMeta.months[monthNum] || yearMeta.months[7];

  const periodDays = isAnnual ? 365 : monthMeta.days;
  const selectedMonthLabel = isAnnual ? '연간 종합 (1~12월)' : `${monthNum}월 실측 계절성`;

  // 1. 기준 실적 (선택한 기준 연도 동월/연간 순매출 및 TrevPAR)
  const baseLyTotalRevenue = isAnnual ? yearMeta.annual.totalRevenue : monthMeta.totalRevenue;
  const baseLyTrevpar = isAnnual ? yearMeta.annual.trevpar : monthMeta.trevpar;

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

  // 4. 사업부 및 표준 영업장 2단계 정밀 목표 안분 (순수 수학적 모델)
  const divisionResults: DivisionAllocationResult[] = activeDivisions.map(divKey => {
    const meta = DIVISION_META[divKey];
    const rawShare = divShares[divKey as keyof typeof divShares] || 0.01;
    const normalizedWeight = rawShare / totalRawWeight;

    const divTargetRevenue = Math.round(targetTotalRevenue * normalizedWeight);
    const divLyRevenue = Math.round(baseLyTotalRevenue * normalizedWeight);
    const divGrowthRate = divLyRevenue > 0 ? Number((((divTargetRevenue - divLyRevenue) / divLyRevenue) * 100).toFixed(1)) : 0;

    // 해당 부문의 백엔드 표준 영업장 필터
    const matchingFacilities = masterItems.filter(f => f.category === divKey);
    const facilityCount = Math.max(1, matchingFacilities.length);

    // 해당 월의 원천 영업장별 실측 매출 및 목표 매출 연산
    const facilityResults: FacilityAllocationResult[] = matchingFacilities.map((fac) => {
      let facLyRevenue = Math.round(divLyRevenue / facilityCount);
      let shareRatio = totalRawWeight > 0 ? (normalizedWeight / facilityCount) : 0;

      if (!isAnnual && Array.isArray(monthMeta.facilities)) {
        const match = monthMeta.facilities.find(mf => mf.venueName === fac.shopName);
        if (match) {
          facLyRevenue = match.netRevenue;
          shareRatio = match.shareRatio;
        }
      } else if (isAnnual) {
        let annualSum = 0;
        for (let m = 1; m <= 12; m++) {
          const mFac = yearMeta.months[m]?.facilities?.find(mf => mf.venueName === fac.shopName);
          if (mFac) {
            annualSum += mFac.netRevenue;
          }
        }
        if (annualSum > 0) {
          facLyRevenue = annualSum;
          shareRatio = baseLyTotalRevenue > 0 ? Number((annualSum / baseLyTotalRevenue).toFixed(4)) : 0;
        }
      }

      // 목표 매출액 = 실측 기준선 × (1 + 목표성장률)
      let facTargetRevenue = Math.round(facLyRevenue * (1 + input.targetGrowthRate / 100));
      if (facLyRevenue === 0) {
        facTargetRevenue = Math.round(divTargetRevenue / facilityCount);
      }

      return {
        shopCode: fac.shopCode,
        shopName: fac.shopName,
        category: fac.categoryLabel,
        lyRevenue: facLyRevenue,
        targetRevenue: facTargetRevenue,
        shareRatio
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

  // 5. Largest Remainder Method (Zero-Variance 단올림 오차 흡수 엔진)
  // 5-1. 사업부(Division) 레벨 0-Variance 보정
  const currentDivSum = divisionResults.reduce((s, d) => s + d.targetRevenue, 0);
  const divDiff = targetTotalRevenue - currentDivSum;
  if (divDiff !== 0 && divisionResults.length > 0) {
    const sortedDivs = [...divisionResults].sort((a, b) => b.targetRevenue - a.targetRevenue);
    sortedDivs[0].targetRevenue += divDiff;
    sortedDivs[0].diffAmount = sortedDivs[0].targetRevenue - sortedDivs[0].lyRevenue;
  }

  // 5-2. 개별 영업장(Facility) 레벨 0-Variance 보정
  divisionResults.forEach(div => {
    if (div.facilities.length > 0) {
      const curFacSum = div.facilities.reduce((s, f) => s + f.targetRevenue, 0);
      const facDiff = div.targetRevenue - curFacSum;
      if (facDiff !== 0) {
        const sortedFacs = [...div.facilities].sort((a, b) => b.targetRevenue - a.targetRevenue);
        sortedFacs[0].targetRevenue += facDiff;
      }
    }
  });

  const overallGrowthRate = Number(input.targetGrowthRate.toFixed(1));

  return {
    divisionResults,
    totalTargetRevenue: targetTotalRevenue,
    totalLyRevenue: baseLyTotalRevenue,
    overallGrowthRate,
    achievedTrevpar,
    selectedMonthLabel,
    periodDays,
    baseYear,
    targetYear
  };
}
