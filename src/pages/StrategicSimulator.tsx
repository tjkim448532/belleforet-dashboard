import { useState, useEffect, useMemo } from 'react';
import { 
  Target, Sparkles, Sliders, TrendingUp,
  Calendar, ChevronDown, ChevronRight, CloudRain,
  Flame, RotateCcw, PieChart, CheckCircle2, Clock
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import type { SimulationTargetInput, FacilityCapacityItem } from '../types/simulation';
import { DEFAULT_CAPACITY_SEEDS } from '../data/defaultCapacitySeeds';
import { MULTI_YEAR_SEASONALITY_DATA } from '../data/monthlySeasonalityData';
import { runTargetSimulation } from '../lib/targetSimulationEngine';
import { secureFetcher } from '../lib/secureFetcher';
import MonthlyDynamicRebalancer from '../components/dashboard/MonthlyDynamicRebalancer';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

// 7대 공식 사업본부별 표준 변동비율 (v_f) 및 공헌이익률 마스터 (공식 명칭 SSOT)
const DIVISION_VARIABLE_COST_RATES: Record<string, { varRate: number; cmRate: number; code: string; name: string; color: string; icon: string }> = {
  GOLF: { varRate: 0.20, cmRate: 0.80, code: 'GOLF', name: '골프사업본부', color: '#9333EA', icon: '⛳' },
  ROOM: { varRate: 0.15, cmRate: 0.85, code: 'ROOM', name: '리조트사업본부', color: '#1E3A8A', icon: '🏨' },
  FNB: { varRate: 0.45, cmRate: 0.55, code: 'FNB', name: '콘텐츠기획본부', color: '#16A34A', icon: '🍽️' },
  TICKET: { varRate: 0.30, cmRate: 0.70, code: 'TICKET', name: '레저본부', color: '#EAB308', icon: '🎢' },
  LEISURE: { varRate: 0.30, cmRate: 0.70, code: 'TICKET', name: '레저본부', color: '#EAB308', icon: '🎢' },
  MOTO: { varRate: 0.35, cmRate: 0.65, code: 'MOTO', name: '모토아레나', color: '#E11D48', icon: '🏎️' },
  BANQUET: { varRate: 0.30, cmRate: 0.70, code: 'BANQUET', name: '세일즈본부', color: '#0891B2', icon: '🏛️' },
  PARKING: { varRate: 0.10, cmRate: 0.90, code: 'PARKING', name: '주차관제', color: '#0284C7', icon: '🅿️' },
  GOODS: { varRate: 0.50, cmRate: 0.50, code: 'GOODS', name: '벨포레굿즈', color: '#64748B', icon: '🛍️' },
  OTHER: { varRate: 0.55, cmRate: 0.45, code: 'OTHER', name: '독립/기타', color: '#475569', icon: '📦' }
};

const YEAR_PAIRS = [
  { baseYear: 2024, targetYear: 2025, label: '2024년 실적 ➔ 2025년 목표' },
  { baseYear: 2025, targetYear: 2026, label: '2025년 실적 ➔ 2026년 목표' },
  { baseYear: 2026, targetYear: 2027, label: '2026년 실적 ➔ 2027년 목표' }
];

const MONTH_NAMES = [
  { id: 'ANNUAL', label: '연간 종합 (1~12월)', shortLabel: '연간 종합', season: '전사' },
  { id: 1, label: '1월', shortLabel: '1월', season: '겨울 비수기' },
  { id: 2, label: '2월', shortLabel: '2월', season: '겨울 비수기' },
  { id: 3, label: '3월', shortLabel: '3월', season: '봄 개장' },
  { id: 4, label: '4월', shortLabel: '4월', season: '봄 성수기' },
  { id: 5, label: '5월', shortLabel: '5월', season: '가정의달 피크' },
  { id: 6, label: '6월', shortLabel: '6월', season: '초여름' },
  { id: 7, label: '7월', shortLabel: '7월', season: '여름 방학/워터파크' },
  { id: 8, label: '8월', shortLabel: '8월', season: '바캉스 극성수기' },
  { id: 9, label: '9월', shortLabel: '9월', season: '가을 성수기' },
  { id: 10, label: '10월', shortLabel: '10월', season: '단풍/골프 피크' },
  { id: 11, label: '11월', shortLabel: '11월', season: '늦가을' },
  { id: 12, label: '12월', shortLabel: '12월', season: '연말/겨울' }
];

const getCategoryIcon = (name: string) => {
  if (!name) return '📂';
  if (name.includes('골프')) return '⛳';
  if (name.includes('콘도') || name.includes('객실')) return '🏨';
  if (name.includes('식음')) return '🍽️';
  if (name.includes('레저') || name.includes('레져')) return '🎢';
  if (name.includes('모토')) return '🏎️';
  if (name.includes('대관') || name.includes('연회') || name.includes('세일즈')) return '🏛️';
  if (name.includes('목장')) return '🐎';
  if (name.includes('주차')) return '🅿️';
  return '📂';
};

const getPartIcon = (partName: string) => {
  if (!partName) return '📂';
  if (partName.includes('목장')) return '🐎';
  if (partName.includes('미디어')) return '🎨';
  if (partName.includes('액티비티') || partName.includes('썰매') || partName.includes('마운틴')) return '🛷';
  if (partName.includes('식음') || partName.includes('FNB') || partName.includes('레스토랑')) return '🍽️';
  if (partName.includes('골프') || partName.includes('클럽')) return '⛳';
  if (partName.includes('객실') || partName.includes('콘도')) return '🏨';
  if (partName.includes('모토') || partName.includes('서킷')) return '🏎️';
  if (partName.includes('대관') || partName.includes('연회') || partName.includes('세일즈')) return '🏛️';
  if (partName.includes('놀이동산')) return '🎪';
  if (partName.includes('주차')) return '🅿️';
  return '📂';
};

interface ApiFacility {
  no: number;
  categoryCode: string;
  categoryName: string;
  teamName: string;
  partName: string;
  facilityName: string;
  weight: number;
  actual2025: number;
  target2026: number;
  actual2026?: number;
  achievementRate?: number;
  variableCostRate?: number;
  contributionMargin?: number;
  cmRate?: number;
}

interface ApiPartGroup {
  partKey: string;
  partName: string;
  facilityCount: number;
  totalWeight: number;
  totalActual2025: number;
  totalTarget2026: number;
  totalActual2026: number;
  achievementRate: number;
  totalContributionMargin: number;
  facilities: ApiFacility[];
}

interface ApiCategory {
  categoryCode: string;
  categoryName: string;
  teamName: string;
  facilityCount: number;
  totalActual2025: number;
  totalWeight: number;
  totalTarget2026: number;
  totalActual2026?: number;
  achievementRate?: number;
  totalContributionMargin?: number;
  facilities: ApiFacility[];
}

interface ApiSummary {
  isYearly?: boolean;
  targetYear?: number;
  targetPeriodLabel?: string;
  basePeriodLabel?: string;
  targetMonth: string;
  baseMonth: string;
  daysCount?: number;
  growthRateTarget: number;
  includeGolf?: boolean;
  grandTotal2025: number;
  grandTarget2026: number;
  grandActual2026?: number;
  overallAchievementRate?: number;
  dailyTargetRevenue?: number;
  dailyTrevPAR?: number;
  monthlyTrevPAR?: number;
  weekdayDays?: number;
  preHolidayDays?: number;
  weekdayDailyTarget?: number;
  preHolidayDailyTarget?: number;
  overallDailyAvg?: number;
  totalCategoryCount?: number;
  totalFacilityCount: number;
}

export default function StrategicSimulator() {
  const [capacityMaster] = useState<FacilityCapacityItem[]>(DEFAULT_CAPACITY_SEEDS);

  // Simulation Target Input State
  const [input, setInput] = useState<SimulationTargetInput>({
    baseYear: 2025,
    targetYear: 2026,
    selectedMonth: 7, // 기본값: 7월
    period: 'M07',
    metricInputMode: 'GROWTH_RATE',
    targetTrevpar: 0,
    targetGrowthRate: 15.0, // 기본값: +15.0%
    targetTotalRevenue: 0,
    strategyMode: 'BALANCED',
    includeGolf: true
  });

  // Feature 4: Baseline Selection Mode (직전년도 vs 다년도 가중이동평균 WMA)
  const [baselineMode, setBaselineMode] = useState<'SINGLE_YEAR' | 'WMA_3YEAR'>('SINGLE_YEAR');

  // Feature 1: Strategic Multipliers (전략 승수 β_f, 기본값 1.0)
  const [strategicMultipliers, setStrategicMultipliers] = useState<Record<string, number>>({
    ROOM: 1.0,
    GOLF: 1.0,
    FNB: 1.0,
    TICKET: 1.0,
    MOTO: 1.0,
    BANQUET: 1.0,
    OTHER: 1.0
  });

  // Feature 3: Capture Rate & Day-Trip Simulation Parameters
  const [dayTripTargetCount, setDayTripTargetCount] = useState<number>(300); // 일일 외래객 유치 목표
  const [spendPerCapIncrease, setSpendPerCapIncrease] = useState<number>(5000); // 투숙객 인당 객단가 증가 목표

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [apiData, setApiData] = useState<{ summary: ApiSummary; categories: ApiCategory[] } | null>(null);
  const [, setRebalancedMonthlyTargets] = useState<Record<number, number>>({});
  
  // 3-Depth Accordion State
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [openParts, setOpenParts] = useState<Record<string, boolean>>({});

  // Fallback Simulation Engine
  const simulationResult = useMemo(() => {
    return runTargetSimulation(input, capacityMaster);
  }, [input, capacityMaster]);

  // Fetch Business Plan from Backend API
  useEffect(() => {
    let isMounted = true;
    const fetchBusinessPlan = async () => {
      try {
        const isYearly = input.selectedMonth === 'ANNUAL';
        const url = isYearly
          ? `${API_BASE}/api/v5/report/business-plan?mode=YEARLY&year=${input.targetYear}&growthRate=${input.targetGrowthRate}&includeGolf=${input.includeGolf}`
          : `${API_BASE}/api/v5/report/business-plan?year=${input.targetYear}&month=${input.selectedMonth}&growthRate=${input.targetGrowthRate}&includeGolf=${input.includeGolf}`;

        const res = await secureFetcher(url) as { success: boolean; data: { summary: ApiSummary; categories: ApiCategory[] } };

        if (isMounted && res?.data?.categories && res.data.categories.length > 0) {
          setApiData(res.data);
          const initialOpenCats: Record<string, boolean> = {};
          const initialOpenParts: Record<string, boolean> = {};
          
          res.data.categories.forEach((c: ApiCategory) => {
            initialOpenCats[c.categoryCode] = true;
            (c.facilities || []).forEach(f => {
              const partKey = `${c.categoryCode}_${(f.partName || f.teamName || '일반').trim()}`;
              initialOpenParts[partKey] = true;
            });
          });
          setOpenCategories(initialOpenCats);
          setOpenParts(initialOpenParts);
        }
      } catch (err) {
        console.warn('Business Plan API fetch warning, fallback to engine:', err);
      }
    };

    fetchBusinessPlan();
    return () => { isMounted = false; };
  }, [input.selectedMonth, input.targetGrowthRate, input.targetYear, input.baseYear, input.includeGolf]);

  // Feature 4: Real Multi-Year Weighted Moving Average (WMA) Baseline Engine (No fake 2023 numbers)
  const wmaBaselineData = useMemo(() => {
    const isAnnual = input.selectedMonth === 'ANNUAL';
    const monthNum = typeof input.selectedMonth === 'number' ? input.selectedMonth : 7;
    
    const y2025 = MULTI_YEAR_SEASONALITY_DATA[2025];
    const y2024 = MULTI_YEAR_SEASONALITY_DATA[2024];

    let rev2025 = 0;
    if (isAnnual) {
      rev2025 = y2025?.annual?.totalRevenue || 0;
      if (rev2025 === 0 && y2025?.months) {
        rev2025 = Object.values(y2025.months).reduce((sum, m) => sum + (m.totalRevenue || 0), 0);
      }
    } else {
      rev2025 = y2025?.months?.[monthNum]?.totalRevenue || 0;
    }

    let rev2024 = 0;
    if (isAnnual) {
      rev2024 = y2024?.annual?.totalRevenue || 0;
      if (rev2024 === 0 && y2024?.months) {
        rev2024 = Object.values(y2024.months).reduce((sum, m) => sum + (m.totalRevenue || 0), 0);
      }
    } else {
      rev2024 = y2024?.months?.[monthNum]?.totalRevenue || 0;
    }

    // 2-Year Real SSOT Weighted Average (2025: 60%, 2024: 40%) without fake 2023 proxy
    const wmaTotalRevenue = Math.round((rev2025 * 0.60) + (rev2024 * 0.40));
    const singleYearRevenue = rev2025;

    return {
      activeBaselineRevenue: baselineMode === 'WMA_3YEAR' ? wmaTotalRevenue : singleYearRevenue,
      wmaTotalRevenue,
      singleYearRevenue,
      smoothingDelta: wmaTotalRevenue - singleYearRevenue,
      smoothingRate: Number((((wmaTotalRevenue - singleYearRevenue) / singleYearRevenue) * 100).toFixed(1))
    };
  }, [input.selectedMonth, baselineMode]);

  // Base raw categories from API or Simulation Engine
  const rawCategories: ApiCategory[] = useMemo(() => {
    if (apiData?.categories && apiData.categories.length > 0) {
      return apiData.categories;
    }
    return simulationResult.divisionResults.map((div) => ({
      categoryCode: div.category,
      categoryName: div.category,
      teamName: DIVISION_VARIABLE_COST_RATES[div.category]?.name || div.categoryLabel,
      facilityCount: div.facilities.length,
      totalActual2025: div.lyRevenue,
      totalWeight: div.targetShare,
      totalTarget2026: div.targetRevenue,
      totalActual2026: 0,
      achievementRate: 0,
      facilities: div.facilities.map((f, fIdx) => ({
        no: fIdx + 1,
        categoryCode: div.category,
        categoryName: div.category,
        teamName: DIVISION_VARIABLE_COST_RATES[div.category]?.name || div.categoryLabel,
        partName: f.category,
        facilityName: f.shopName,
        weight: Number((f.shareRatio * 100).toFixed(2)),
        actual2025: f.lyRevenue,
        target2026: f.targetRevenue,
        actual2026: 0,
        achievementRate: 0
      }))
    }));
  }, [apiData, simulationResult]);

  // Grand totals
  const rawGrandTotal2025 = apiData?.summary?.grandTotal2025 || simulationResult.totalLyRevenue;
  const rawGrandTarget2026 = Math.round(wmaBaselineData.activeBaselineRevenue * (1 + input.targetGrowthRate / 100));

  // Feature 1: Strategic Multiplier Zero-Sum Rebalancing Algorithm (w'_f = (w_f * β_f) / Σ(w_j * β_j))
  const effectiveCategories: ApiCategory[] = useMemo(() => {
    let sourceCats = rawCategories;
    if (!input.includeGolf) {
      sourceCats = rawCategories.filter(c => 
        !c.categoryCode.includes('골프') && 
        !c.categoryName.includes('골프') && 
        c.categoryCode !== 'GOLF'
      );
    }

    const totalBaseRev = sourceCats.reduce((sum, c) => sum + c.totalActual2025, 0) || 1;
    const targetGrandTotal = input.includeGolf ? rawGrandTarget2026 : Math.round(rawGrandTarget2026 * (sourceCats.reduce((s, c) => s + c.totalActual2025, 0) / (rawGrandTotal2025 || 1)));

    // 1. Calculate raw weighted scores with β_f
    const scoredCats = sourceCats.map(cat => {
      const catCode = cat.categoryCode.toUpperCase();
      let multiplier = strategicMultipliers[catCode] ?? 1.0;
      if (catCode.includes('ROOM') || catCode.includes('콘도')) multiplier = strategicMultipliers.ROOM ?? 1.0;
      else if (catCode.includes('GOLF')) multiplier = strategicMultipliers.GOLF ?? 1.0;
      else if (catCode.includes('FNB') || catCode.includes('식음')) multiplier = strategicMultipliers.FNB ?? 1.0;
      else if (catCode.includes('TICKET') || catCode.includes('LEISURE') || catCode.includes('레저')) multiplier = strategicMultipliers.TICKET ?? 1.0;
      else if (catCode.includes('MOTO')) multiplier = strategicMultipliers.MOTO ?? 1.0;
      else if (catCode.includes('BANQUET') || catCode.includes('대관')) multiplier = strategicMultipliers.BANQUET ?? 1.0;

      const baseWeight = (cat.totalActual2025 / totalBaseRev);
      const strategicWeightRaw = baseWeight * multiplier;

      return {
        ...cat,
        multiplier,
        baseWeight,
        strategicWeightRaw
      };
    });

    const sumStrategicRawWeights = scoredCats.reduce((sum, c) => sum + c.strategicWeightRaw, 0) || 1;

    // 2. Normalized Zero-Sum Weights & Largest Remainder Target Allocation
    const rebalancedCats = scoredCats.map(cat => {
      const normalizedWeight = cat.strategicWeightRaw / sumStrategicRawWeights;
      const targetRev = Math.round(targetGrandTotal * normalizedWeight);
      const varInfo = DIVISION_VARIABLE_COST_RATES[cat.categoryCode] || DIVISION_VARIABLE_COST_RATES.OTHER;

      // Feature 2: Contribution Margin (CM = Target * (1 - v_f))
      const totalCM = Math.round(targetRev * varInfo.cmRate);

      const facilitiesWithCM: ApiFacility[] = (cat.facilities || []).map((fac) => {
        const facShare = (fac.actual2025 / (cat.totalActual2025 || 1)) || (1 / Math.max(1, cat.facilities.length));
        const facTarget = Math.round(targetRev * facShare);
        const facCM = Math.round(facTarget * varInfo.cmRate);

        return {
          ...fac,
          weight: Number((normalizedWeight * facShare * 100).toFixed(2)),
          target2026: facTarget,
          variableCostRate: varInfo.varRate,
          contributionMargin: facCM,
          cmRate: varInfo.cmRate
        };
      });

      // Facility Largest Remainder within category
      const curFacSum = facilitiesWithCM.reduce((s, f) => s + f.target2026, 0);
      const facDiff = targetRev - curFacSum;
      if (facDiff !== 0 && facilitiesWithCM.length > 0) {
        const sorted = [...facilitiesWithCM].sort((a, b) => b.target2026 - a.target2026);
        sorted[0].target2026 += facDiff;
        sorted[0].contributionMargin = Math.round(sorted[0].target2026 * varInfo.cmRate);
      }

      return {
        ...cat,
        totalWeight: Number((normalizedWeight * 100).toFixed(2)),
        totalTarget2026: targetRev,
        totalContributionMargin: totalCM,
        facilities: facilitiesWithCM
      };
    });

    // Division Largest Remainder for 100% Zero-Variance with Grand Total
    const curDivSum = rebalancedCats.reduce((s, c) => s + c.totalTarget2026, 0);
    const divDiff = targetGrandTotal - curDivSum;
    if (divDiff !== 0 && rebalancedCats.length > 0) {
      const sortedDivs = [...rebalancedCats].sort((a, b) => b.totalTarget2026 - a.totalTarget2026);
      sortedDivs[0].totalTarget2026 += divDiff;
      const varInfo = DIVISION_VARIABLE_COST_RATES[sortedDivs[0].categoryCode] || DIVISION_VARIABLE_COST_RATES.OTHER;
      sortedDivs[0].totalContributionMargin = Math.round(sortedDivs[0].totalTarget2026 * varInfo.cmRate);
      if (sortedDivs[0].facilities && sortedDivs[0].facilities.length > 0) {
        sortedDivs[0].facilities[0].target2026 += divDiff;
        sortedDivs[0].facilities[0].contributionMargin = Math.round(sortedDivs[0].facilities[0].target2026 * varInfo.cmRate);
      }
    }

    return rebalancedCats;
  }, [rawCategories, input.includeGolf, rawGrandTarget2026, rawGrandTotal2025, strategicMultipliers]);

  // Overall Financial Metrics Summary
  const grandTargetTotal = useMemo(() => {
    return effectiveCategories.reduce((sum, c) => sum + c.totalTarget2026, 0);
  }, [effectiveCategories]);

  const grandContributionMarginTotal = useMemo(() => {
    return effectiveCategories.reduce((sum, c) => sum + (c.totalContributionMargin || 0), 0);
  }, [effectiveCategories]);

  const grandContributionMarginRate = useMemo(() => {
    if (grandTargetTotal === 0) return 0;
    return Number(((grandContributionMarginTotal / grandTargetTotal) * 100).toFixed(1));
  }, [grandContributionMarginTotal, grandTargetTotal]);

  // 100% SSOT Real Actual Revenue & Achievement Rate Calculation (Zero Fake Numbers)
  const actualExecutionStats = useMemo(() => {
    const isAnnual = input.selectedMonth === 'ANNUAL';
    const monthNum = typeof input.selectedMonth === 'number' ? input.selectedMonth : 7;
    const y2026 = MULTI_YEAR_SEASONALITY_DATA[input.targetYear];

    // If target year has no actuals yet (e.g. 2027)
    if (!y2026) {
      return {
        revenue: 0,
        rate: 0,
        displayRate: '집계 예정',
        statusText: `${input.targetYear}년 목표 수립 단계 (실행 전)`,
        isUpcoming: true
      };
    }

    if (isAnnual) {
      // Sum actuals up to month 8 for 2026
      let totalYtdActual = 0;
      let golfYtdActual = 0;
      for (let m = 1; m <= 8; m++) {
        const mMeta = y2026.months?.[m];
        if (mMeta) {
          totalYtdActual += mMeta.totalRevenue;
          golfYtdActual += Math.round(mMeta.totalRevenue * (mMeta.divisionShares?.GOLF || 0));
        }
      }
      const actualRev = input.includeGolf ? totalYtdActual : (totalYtdActual - golfYtdActual);
      const rate = grandTargetTotal > 0 ? Number(((actualRev / grandTargetTotal) * 100).toFixed(1)) : 0;
      return {
        revenue: actualRev,
        rate,
        displayRate: `${rate}%`,
        statusText: `2026년 1~8월 누적 실적 (목표 대비)`,
        isUpcoming: false
      };
    }

    // Specific Month
    if (monthNum <= 8) {
      const mMeta = y2026.months?.[monthNum];
      if (mMeta) {
        const golfShare = mMeta.divisionShares?.GOLF || 0;
        const actualRev = input.includeGolf ? mMeta.totalRevenue : Math.round(mMeta.totalRevenue * (1 - golfShare));
        const rate = grandTargetTotal > 0 ? Number(((actualRev / grandTargetTotal) * 100).toFixed(1)) : 0;
        return {
          revenue: actualRev,
          rate,
          displayRate: `${rate}%`,
          statusText: `${monthNum}월 실측 완료`,
          isUpcoming: false
        };
      }
    }

    // Month 9~12 (Future months)
    return {
      revenue: 0,
      rate: 0,
      displayRate: '미도래',
      statusText: `${monthNum}월 도래 전 (목표 실행 예정)`,
      isUpcoming: true
    };
  }, [input.selectedMonth, input.targetYear, input.includeGolf, grandTargetTotal]);

  // Group Category Facilities into 2-Depth Part Groups
  const getCategoryParts = useMemo(() => {
    return (cat: ApiCategory): ApiPartGroup[] => {
      const map: Record<string, ApiPartGroup> = {};

      (cat.facilities || []).forEach((fac) => {
        const rawPart = (fac.partName || fac.teamName || '일반').trim();
        const partKey = `${cat.categoryCode}_${rawPart}`;

        if (!map[partKey]) {
          map[partKey] = {
            partKey,
            partName: rawPart,
            facilityCount: 0,
            totalWeight: 0,
            totalActual2025: 0,
            totalTarget2026: 0,
            totalActual2026: 0,
            achievementRate: 0,
            totalContributionMargin: 0,
            facilities: []
          };
        }

        map[partKey].facilities.push({
          ...fac,
          no: map[partKey].facilities.length + 1
        });
        map[partKey].facilityCount += 1;
        map[partKey].totalWeight = Number((map[partKey].totalWeight + (fac.weight || 0)).toFixed(2));
        map[partKey].totalActual2025 += (fac.actual2025 || 0);
        map[partKey].totalTarget2026 += (fac.target2026 || 0);
        map[partKey].totalActual2026 += (fac.actual2026 || 0);
        map[partKey].totalContributionMargin += (fac.contributionMargin || 0);
      });

      const partGroups = Object.values(map);
      partGroups.forEach(pg => {
        if (pg.totalTarget2026 > 0 && pg.totalActual2026 > 0) {
          pg.achievementRate = Number(((pg.totalActual2026 / pg.totalTarget2026) * 100).toFixed(1));
        }
      });

      return partGroups.sort((a, b) => b.totalTarget2026 - a.totalTarget2026);
    };
  }, []);

  // Filter Buttons
  const availableCategoryFilters = useMemo(() => {
    const list = [{ id: 'ALL', label: '전체' }];
    effectiveCategories.forEach(c => {
      list.push({ 
        id: c.categoryCode, 
        label: `${getCategoryIcon(c.categoryName)} ${c.teamName || c.categoryName}` 
      });
    });
    return list;
  }, [effectiveCategories]);

  const filteredCategories = useMemo(() => {
    if (selectedCategoryFilter === 'ALL') return effectiveCategories;
    return effectiveCategories.filter(c => 
      c.categoryCode === selectedCategoryFilter || 
      c.categoryName === selectedCategoryFilter
    );
  }, [effectiveCategories, selectedCategoryFilter]);

  const formatCurrency = (val: any) => {
    if (!val && val !== 0) return '0';
    const num = typeof val === 'string' ? Number(val.replace(/,/g, '')) : Number(val);
    return isNaN(num) ? '0' : new Intl.NumberFormat('ko-KR').format(Math.round(num));
  };

  const handleMultiplierChange = (key: string, value: number) => {
    setStrategicMultipliers(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetMultipliers = () => {
    setStrategicMultipliers({
      ROOM: 1.0,
      GOLF: 1.0,
      FNB: 1.0,
      TICKET: 1.0,
      MOTO: 1.0,
      BANQUET: 1.0,
      OTHER: 1.0
    });
  };

  const applyPreset = (preset: 'GROWTH_FNB_LEISURE' | 'MAX_PROFIT' | 'BALANCED') => {
    if (preset === 'GROWTH_FNB_LEISURE') {
      setStrategicMultipliers({
        ROOM: 0.9,
        GOLF: 0.9,
        FNB: 1.3,
        TICKET: 1.25,
        MOTO: 1.15,
        BANQUET: 1.0,
        OTHER: 1.0
      });
    } else if (preset === 'MAX_PROFIT') {
      setStrategicMultipliers({
        ROOM: 1.25,
        GOLF: 1.2,
        FNB: 0.85,
        TICKET: 1.0,
        MOTO: 0.9,
        BANQUET: 1.1,
        OTHER: 0.8
      });
    } else {
      resetMultipliers();
    }
  };

  // Pie chart option for category revenue & contribution margin
  const categoryPieOptions = useMemo(() => {
    const data = effectiveCategories.map(c => ({
      name: c.categoryName,
      value: c.totalTarget2026,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 }
    }));

    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: ₩{c}원 ({d}%)'
      },
      legend: {
        bottom: 0,
        icon: 'circle',
        itemGap: 8,
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { color: '#475569', fontSize: 11, fontWeight: 600 }
      },
      series: [
        {
          name: '부문별 목표 비중',
          type: 'pie',
          radius: ['40%', '62%'],
          center: ['50%', '46%'],
          avoidLabelOverlap: true,
          label: {
            show: true,
            formatter: '{b}\n{d}%',
            fontSize: 11,
            fontWeight: 'bold',
            color: '#1e293b'
          },
          data
        }
      ]
    };
  }, [effectiveCategories]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-[32px] p-8 lg:p-10 text-white relative overflow-hidden shadow-xl border border-indigo-900/50">
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute right-32 -bottom-20 w-64 h-64 bg-teal-500/10 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-teal-400 animate-pulse" />
              <span className="font-bold tracking-wider text-xs lg:text-sm text-teal-300 uppercase">
                BELLE FORET AI STRATEGIC REBALANCING & PROFIT ENGINE [PRO]
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              {input.targetYear}년 AI 전략 리밸런싱 & 수익성 시뮬레이터
              <span className="text-xs bg-indigo-600/60 backdrop-blur-md px-3 py-1 rounded-full text-teal-200 border border-indigo-400/40 font-bold">
                PRO Engine v6.0
              </span>
            </h1>
            <p className="text-slate-300 text-xs lg:text-sm mt-2 font-normal max-w-3xl">
              경영진이 부서별 전략 승수(β_f)를 가동하여 <strong>Zero-Sum 실시간 리밸런싱</strong>을 수행하고, <strong>공헌이익(CM) 듀얼 타겟팅</strong> 및 <strong>다년도 WMA 기상 보정</strong>을 적용하는 차세대 전사 경영 계획 엔진입니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setBaselineMode(prev => prev === 'SINGLE_YEAR' ? 'WMA_3YEAR' : 'SINGLE_YEAR')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border flex items-center gap-2 shadow-xs cursor-pointer ${
                baselineMode === 'WMA_3YEAR'
                  ? 'bg-teal-500 text-slate-950 border-teal-300 font-black'
                  : 'bg-white/10 text-white hover:bg-white/20 border-white/15'
              }`}
            >
              <CloudRain size={16} />
              {baselineMode === 'WMA_3YEAR' ? '🌧️ 2개년 WMA 기상보정 가동중' : '📊 직전 1개년 실적 기준선'}
            </button>
          </div>
        </div>
      </div>

      {/* 2. 🎛️ Master Target Console */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950 p-8 rounded-[32px] text-white shadow-xl relative overflow-hidden space-y-6">
        
        {/* Top Control Bar: Year Selection & Golf Toggle */}
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-700/80 pb-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-slate-400">비교 연도:</span>
            <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
              {YEAR_PAIRS.map(yp => (
                <button
                  key={`${yp.baseYear}-${yp.targetYear}`}
                  onClick={() => setInput(prev => ({ ...prev, baseYear: yp.baseYear, targetYear: yp.targetYear }))}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    input.baseYear === yp.baseYear && input.targetYear === yp.targetYear
                      ? 'bg-indigo-600 text-white shadow-xs font-black' 
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  {yp.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
              <button
                onClick={() => setInput(prev => ({ ...prev, includeGolf: true }))}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  input.includeGolf ? 'bg-teal-500 text-slate-950 shadow-xs font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                ⛳ 골프 포함 (전사)
              </button>
              <button
                onClick={() => setInput(prev => ({ ...prev, includeGolf: false }))}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  !input.includeGolf ? 'bg-sky-500 text-slate-950 shadow-xs font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                🏨 골프 제외 (순수 리조트)
              </button>
            </div>
          </div>
        </div>

        {/* Month Selector Bar */}
        <div className="relative z-10 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-teal-400" />
              시뮬레이션 대상 월 선택 ({baselineMode === 'WMA_3YEAR' ? '2개년 가중이동평균(2025: 60%, 2024: 40%) 기상정규화 비중 대입' : `${input.baseYear}년 실측 비중 대입`})
            </span>
            <span className="text-teal-300 font-extrabold">
              현재 선택: {input.targetYear}년 {simulationResult.selectedMonthLabel} ({simulationResult.periodDays}일 기준)
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-13 gap-1.5">
            {MONTH_NAMES.map(m => {
              const isSelected = input.selectedMonth === m.id;
              return (
                <button
                  key={String(m.id)}
                  onClick={() => setInput(prev => ({ ...prev, selectedMonth: m.id as any }))}
                  className={`px-2.5 py-2.5 rounded-xl text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 border ${
                    isSelected
                      ? 'bg-teal-400 text-slate-950 font-black border-teal-300 shadow-md scale-[1.02]'
                      : 'bg-white/10 text-slate-200 hover:bg-white/20 border-white/10 font-bold'
                  }`}
                >
                  <span className="text-xs leading-tight">{m.shortLabel}</span>
                  <span className={`text-[9px] truncate max-w-full ${isSelected ? 'text-slate-900 font-extrabold' : 'text-slate-400'}`}>
                    {m.season}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Growth Rate & Strategic Rebalancing Presets */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
          
          {/* Left: Growth Rate Slider */}
          <div className="lg:col-span-6 bg-white/10 p-5 rounded-2xl border border-white/15 backdrop-blur-md space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300">
                🚀 {input.targetYear}년 전사 연간 목표 성장률 설정
              </span>
              <span className="text-[11px] text-slate-300 font-medium">
                {baselineMode === 'WMA_3YEAR' ? '2개년 WMA 베이스라인 대비' : `${input.baseYear}년 실측 실적 기준선 대비`}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-3xl font-black tabular-nums text-teal-300">
                +{input.targetGrowthRate}%
              </span>
              <span className="text-xs text-slate-300 font-semibold">전사 연간 성장 목표 대입</span>
            </div>

            <input
              type="range"
              min="0"
              max="40"
              step="0.5"
              value={input.targetGrowthRate}
              onChange={(e) => setInput(prev => ({ ...prev, targetGrowthRate: Number(e.target.value) }))}
              className="w-full h-2.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-400"
            />

            {/* Quick Growth Presets */}
            <div className="flex items-center justify-between gap-1 pt-1">
              {[5, 10, 15, 20, 25, 30].map(r => (
                <button
                  key={r}
                  onClick={() => setInput(prev => ({ ...prev, targetGrowthRate: r }))}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    input.targetGrowthRate === r 
                      ? 'bg-teal-400 text-slate-950 font-black' 
                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  +{r}%
                </button>
              ))}
            </div>
          </div>

          {/* Right: Strategic Multiplier Preset Controls */}
          <div className="lg:col-span-6 bg-white/10 p-5 rounded-2xl border border-white/15 backdrop-blur-md flex flex-col justify-between space-y-3">
            <div>
              <div className="text-xs font-bold text-indigo-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  전략 승수 (β_f) Zero-Sum 리밸런싱 프리셋
                </span>
                <button
                  onClick={resetMultipliers}
                  className="text-[10px] text-slate-300 hover:text-white flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded cursor-pointer"
                >
                  <RotateCcw size={11} /> 초기화 (All 1.0)
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3">
                <button
                  onClick={() => applyPreset('BALANCED')}
                  className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-left border border-white/10 transition-all cursor-pointer"
                >
                  <div className="text-xs font-bold text-white">⚖️ 현행 균형 유지</div>
                  <div className="text-[10px] text-slate-300 mt-0.5">과거 실측 비중 100% 준용</div>
                </button>

                <button
                  onClick={() => applyPreset('GROWTH_FNB_LEISURE')}
                  className="p-2.5 bg-indigo-600/40 hover:bg-indigo-600/60 rounded-xl text-left border border-indigo-400/40 transition-all cursor-pointer"
                >
                  <div className="text-xs font-bold text-teal-300">🔥 F&B·레저 집중 육성</div>
                  <div className="text-[10px] text-slate-300 mt-0.5">F&B 1.30x / 레저 1.25x</div>
                </button>

                <button
                  onClick={() => applyPreset('MAX_PROFIT')}
                  className="p-2.5 bg-emerald-600/40 hover:bg-emerald-600/60 rounded-xl text-left border border-emerald-400/40 transition-all cursor-pointer"
                >
                  <div className="text-xs font-bold text-emerald-300">💎 고마진 수익성 극대화</div>
                  <div className="text-[10px] text-slate-300 mt-0.5">객실 1.25x / 골프 1.20x</div>
                </button>
              </div>
            </div>

            <div className="text-[11px] text-slate-300 bg-slate-950/50 px-3 py-1.5 rounded-lg border border-white/5 flex items-center justify-between">
              <span>수식: <code>w'_f = (w_f * β_f) / Σ(w_j * β_j)</code></span>
              <span className="text-teal-300 font-bold">Zero-Sum 보존 (총매출 불변)</span>
            </div>
          </div>

        </div>
      </div>

      {/* 3. 🏆 5 Executive KPI Highlight Summary Cards (Zero Fake Numbers) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        
        {/* Card 1: 목표 총매출 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 mb-1">
            {input.targetYear}년 목표 {input.selectedMonth === 'ANNUAL' ? '연간' : `${input.selectedMonth}월`} 총매출
          </div>
          <div className="text-2xl font-black text-slate-900 tabular-nums">
            {(grandTargetTotal / 100000000).toFixed(2)} <span className="text-sm font-normal text-slate-500">억원</span>
          </div>
          <div className="text-xs text-teal-700 font-bold mt-1">
            기준선 대비 +{input.targetGrowthRate}% (+{((grandTargetTotal - wmaBaselineData.activeBaselineRevenue) / 100000000).toFixed(2)}억)
          </div>
        </div>

        {/* Card 2: 목표 공헌이익 (Contribution Margin) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-indigo-600 mb-1 flex items-center justify-between">
            <span>목표 공헌이익 (CM)</span>
            <span className="text-[10px] bg-indigo-50 px-1.5 py-0.5 rounded text-indigo-700 font-bold">이익 중심</span>
          </div>
          <div className="text-2xl font-black text-indigo-700 tabular-nums">
            {(grandContributionMarginTotal / 100000000).toFixed(2)} <span className="text-sm font-normal text-slate-500">억원</span>
          </div>
          <div className="text-xs text-indigo-600 font-bold mt-1">
            전사 공헌이익률: <b>{grandContributionMarginRate}%</b>
          </div>
        </div>

        {/* Card 3: Dual TrevPAR */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 mb-1">
            목표 {input.includeGolf ? '전사 Total' : '순수 리조트'} TrevPAR
          </div>
          <div className="text-2xl font-black text-teal-800 tabular-nums">
            ₩{formatCurrency(Math.round(grandTargetTotal / (175 * simulationResult.periodDays)))} <span className="text-sm font-normal text-slate-500">/실·일</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            175실 × {simulationResult.periodDays}일 대칭 기준
          </div>
        </div>

        {/* Card 4: WMA 기상 보정 상태 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 mb-1">
            기준선 산출 방식
          </div>
          <div className="text-lg font-black text-slate-900 truncate">
            {baselineMode === 'WMA_3YEAR' ? '🌧️ 2개년 WMA 가중평균' : `📊 ${input.baseYear}년 실측 단독`}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {baselineMode === 'WMA_3YEAR' ? `스무딩: ${wmaBaselineData.smoothingRate > 0 ? '+' : ''}${wmaBaselineData.smoothingRate}%` : '작년 단일 실적 기준'}
          </div>
        </div>

        {/* Card 5: 실제 진도율 (100% Real SSOT Data - No Hardcoded Numbers) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 mb-1 flex items-center justify-between">
            <span>{input.targetYear}년 실제 달성률</span>
            {actualExecutionStats.isUpcoming ? (
              <Clock size={12} className="text-slate-400" />
            ) : (
              <CheckCircle2 size={12} className="text-emerald-500" />
            )}
          </div>
          <div className="text-2xl font-black text-emerald-700 tabular-nums flex items-center gap-1">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
            <span>{actualExecutionStats.displayRate}</span>
          </div>
          <div className="text-xs text-slate-500 mt-1 truncate" title={actualExecutionStats.statusText}>
            {actualExecutionStats.revenue > 0 ? `실적: ₩${(actualExecutionStats.revenue / 100000000).toFixed(2)}억원` : actualExecutionStats.statusText}
          </div>
        </div>

      </div>

      {/* 4. 🚀 12개월 동적 연동 리밸런싱 (Auto-Balancing Slider Engine) - 연간 목표 수립 시 활성화 */}
      {input.selectedMonth === 'ANNUAL' && (
        <MonthlyDynamicRebalancer
          annualBaseRevenue={wmaBaselineData.activeBaselineRevenue}
          annualTargetRevenue={rawGrandTarget2026}
          annualGrowthRate={input.targetGrowthRate}
          targetYear={input.targetYear}
          baseYear={input.baseYear}
          includeGolf={input.includeGolf}
          onMonthlyTargetsChange={setRebalancedMonthlyTargets}
        />
      )}

      {/* 5. 🎛️ Feature 1 & 3: Strategic Multipliers & Capture Rate Controller Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Strategic Multipliers Sliders per Division */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-600" />
                부문별 전략 승수 (β_f) 세부 조절 슬라이더
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                경영진이 부서별 가중치를 조절하면 Zero-Sum 공식에 의해 전사 총목표를 보존하며 타 부문과 상호 재분배됩니다.
              </p>
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
              Zero-Sum Active
            </span>
          </div>

          <div className="space-y-3.5">
            {['GOLF', 'ROOM', 'FNB', 'TICKET', 'MOTO', 'BANQUET', 'PARKING'].map(divKey => {
              const meta = DIVISION_VARIABLE_COST_RATES[divKey] || DIVISION_VARIABLE_COST_RATES.OTHER;
              const val = strategicMultipliers[divKey] ?? 1.0;
              const isNonGolf = !input.includeGolf && divKey === 'GOLF';
              if (isNonGolf) return null;

              return (
                <div key={divKey} className="flex items-center justify-between gap-4 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2.5 w-44">
                    <span className="text-xl">{meta.icon}</span>
                    <div>
                      <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <span>{meta.code}</span>
                        <span className="text-[10px] font-normal text-slate-500">({meta.name})</span>
                      </div>
                      <div className="text-[10px] text-slate-400">공헌이익률: {Math.round(meta.cmRate * 100)}%</div>
                    </div>
                  </div>

                  <div className="flex-1 flex items-center gap-3">
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.05"
                      value={val}
                      onChange={(e) => handleMultiplierChange(divKey, Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <span className="text-xs font-black tabular-nums w-12 text-right text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {val.toFixed(2)}x
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMultiplierChange(divKey, 1.2)}
                      className={`px-2 py-1 text-[10px] font-bold rounded cursor-pointer ${
                        val === 1.2 ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      육성 (+20%)
                    </button>
                    <button
                      onClick={() => handleMultiplierChange(divKey, 0.8)}
                      className={`px-2 py-1 text-[10px] font-bold rounded cursor-pointer ${
                        val === 0.8 ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      축소 (-20%)
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Customer Journey & Capture Rate Simulation Panel (Dynamic Period Days) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" />
                고객 여정 & Capture Rate 연립 시뮬레이터
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              콘도(175실) 100% 가동률 도달 시, 투숙객 머릿수 증가가 한계에 봉착하므로 <strong>외래 당일객(+Q)</strong> 및 <strong>인당 객단가(+P)</strong> 전략으로 부대시설 목표를 견인합니다.
            </p>

            <div className="space-y-4 mt-4">
              {/* Day-trip visitors slider */}
              <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-100 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                  <span>🚗 외래 당일객 (Day-trip +Q) 유치 목표</span>
                  <span className="text-amber-700 text-sm font-black tabular-nums">일 +{dayTripTargetCount}명</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="50"
                  value={dayTripTargetCount}
                  onChange={(e) => setDayTripTargetCount(Number(e.target.value))}
                  className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                />
                <div className="text-[11px] text-amber-800 flex items-center justify-between font-medium">
                  <span>{simulationResult.selectedMonthLabel} 예상 부대시설 매출 기여:</span>
                  <b className="font-black tabular-nums">+₩{formatCurrency(dayTripTargetCount * 25000 * simulationResult.periodDays)}원</b>
                </div>
              </div>

              {/* Spend per Cap slider */}
              <div className="p-3.5 rounded-2xl bg-teal-50/50 border border-teal-100 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-teal-900">
                  <span>💳 투숙객 인당 객단가 (Spend per Cap +P) 상승</span>
                  <span className="text-teal-700 text-sm font-black tabular-nums">+₩{formatCurrency(spendPerCapIncrease)}원/인</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20000"
                  step="1000"
                  value={spendPerCapIncrease}
                  onChange={(e) => setSpendPerCapIncrease(Number(e.target.value))}
                  className="w-full h-2 bg-teal-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                />
                <div className="text-[11px] text-teal-800 flex items-center justify-between font-medium">
                  <span>{simulationResult.selectedMonthLabel} 추가 F&B/레저 매출 창출:</span>
                  <b className="font-black tabular-nums">+₩{formatCurrency(spendPerCapIncrease * 175 * 3.5 * simulationResult.periodDays)}원</b>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
            💡 <strong>시너지 사슬:</strong> 객실 포화 시 레저/식음은 외래객 유치 및 패키지 번들링을 통해 전사 매출을 추가 확장합니다.
          </div>
        </div>

      </div>

      {/* 5. 📊 ECharts 부문별 목표 비중 도넛 차트 */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-indigo-600" />
            전략 승수(β_f) 적용 후 부문별 목표 매출 및 공헌이익 구성비
          </h3>
          <span className="text-xs font-bold text-slate-500">전사 {(grandTargetTotal / 100000000).toFixed(2)}억원 (공헌이익 {(grandContributionMarginTotal / 100000000).toFixed(2)}억원)</span>
        </div>
        <ReactECharts option={categoryPieOptions} style={{ height: '300px', width: '100%' }} />
      </div>

      {/* 6. 📂 3-Depth 아코디언 테이블 with 공헌이익(CM) & 스마트 뱃지 */}
      <div className="bg-white rounded-[32px] p-7 border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-600" />
              영업장별 세부 실행 목표 & 공헌이익 3-Depth 아코디언 ({input.targetYear}년 {simulationResult.selectedMonthLabel})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              전략 승수(β_f)와 공헌이익률이 반영된 <strong>[부문 ➔ 파트 ➔ 소속 영업장]</strong> 1원 단위 정규화 결과입니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs overflow-x-auto">
              {availableCategoryFilters.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryFilter(cat.id)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedCategoryFilter === cat.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 3-Depth Accordion List */}
        <div className="space-y-4">
          {filteredCategories.map((cat) => {
            const isCatOpen = openCategories[cat.categoryCode] !== undefined ? openCategories[cat.categoryCode] : true;
            const catIcon = getCategoryIcon(cat.categoryName);
            const partGroups = getCategoryParts(cat);
            const varInfo = DIVISION_VARIABLE_COST_RATES[cat.categoryCode] || DIVISION_VARIABLE_COST_RATES.OTHER;

            return (
              <div 
                key={cat.categoryCode}
                className="rounded-2xl border border-slate-200/90 overflow-hidden bg-white shadow-2xs transition-all"
              >
                {/* Depth 1 Header */}
                <div 
                  onClick={() => setOpenCategories(prev => ({ ...prev, [cat.categoryCode]: !isCatOpen }))}
                  className={`p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                    isCatOpen ? 'bg-slate-50/90 border-b border-slate-200/80' : 'bg-white hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button className="text-slate-400 hover:text-slate-600 transition-transform">
                      {isCatOpen ? (
                        <ChevronDown className="w-5 h-5 text-indigo-600" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      )}
                    </button>
                    
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{catIcon}</span>
                      <span className="text-xl font-black text-slate-900">
                        {cat.teamName || DIVISION_VARIABLE_COST_RATES[cat.categoryCode]?.name || cat.categoryName}
                      </span>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                        {cat.categoryCode}
                      </span>
                      <span className="text-xs text-indigo-600 font-bold bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                        {partGroups.length}개 파트 · {cat.facilityCount}개 영업장
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
                    <div className="text-slate-600">
                      비중: <span className="font-extrabold text-slate-900">{cat.totalWeight}%</span>
                    </div>
                    <div className="text-indigo-900 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                      목표 매출: <span className="font-black text-indigo-700 tabular-nums">₩{formatCurrency(cat.totalTarget2026)}원</span>
                    </div>
                    <div className="text-emerald-900 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                      공헌이익 (CM): <span className="font-black text-emerald-700 tabular-nums">₩{formatCurrency(cat.totalContributionMargin)}원 ({Math.round(varInfo.cmRate * 100)}%)</span>
                    </div>
                  </div>
                </div>

                {/* Depth 2 & 3 Parts & Facilities Table */}
                {isCatOpen && (
                  <div className="divide-y divide-slate-100">
                    {partGroups.map((part) => {
                      const isPartOpen = openParts[part.partKey] !== undefined ? openParts[part.partKey] : true;
                      const partIcon = getPartIcon(part.partName);

                      return (
                        <div key={part.partKey} className="bg-slate-50/40">
                          
                          {/* Depth 2 Part Header */}
                          <div 
                            onClick={() => setOpenParts(prev => ({ ...prev, [part.partKey]: !isPartOpen }))}
                            className="p-3.5 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer hover:bg-slate-100/60 transition-colors border-b border-slate-100"
                          >
                            <div className="flex items-center gap-2.5">
                              <button className="text-slate-400 hover:text-slate-600">
                                {isPartOpen ? (
                                  <ChevronDown className="w-4 h-4 text-teal-600" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-slate-400" />
                                )}
                              </button>
                              <span className="text-lg">{partIcon}</span>
                              <span className="text-sm font-black text-slate-800">{part.partName} 파트</span>
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                                {part.facilityCount}개 영업장
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-3.5 text-xs font-semibold">
                              <div className="text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                                목표 매출: <span className="font-black text-teal-700 tabular-nums">₩{formatCurrency(part.totalTarget2026)}원</span>
                              </div>
                              <div className="text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-100">
                                공헌이익: <span className="font-black text-emerald-700 tabular-nums">₩{formatCurrency(part.totalContributionMargin)}원</span>
                              </div>
                            </div>
                          </div>

                          {/* Depth 3 Facilities Table */}
                          {isPartOpen && (
                            <div className="overflow-x-auto bg-white">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                                  <tr>
                                    <th className="py-2.5 px-4 w-12 text-center">No</th>
                                    <th className="py-2.5 px-4 min-w-[200px]">영업장명 및 전략 뱃지</th>
                                    <th className="py-2.5 px-4 text-right">전략 비중 (%)</th>
                                    <th className="py-2.5 px-4 text-right">{input.baseYear}년 실적</th>
                                    <th className="py-2.5 px-4 text-right font-black text-indigo-950">{input.targetYear}년 목표 매출</th>
                                    <th className="py-2.5 px-4 text-right font-bold text-emerald-800">예상 공헌이익 (CM)</th>
                                    <th className="py-2.5 px-4 text-center">공헌이익률</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-800">
                                  {part.facilities.map((fac) => (
                                    <tr key={`${fac.categoryCode}-${fac.facilityName}`} className="hover:bg-slate-50/80 transition-colors">
                                      <td className="py-2.5 px-4 text-center font-bold text-slate-400">
                                        {fac.no}
                                      </td>
                                      <td className="py-2.5 px-4 font-bold text-slate-900 text-sm">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span>{fac.facilityName}</span>
                                          {fac.facilityName.includes('콘도') || fac.categoryCode === 'ROOM' ? (
                                            <span className="inline-flex items-center text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded-md" title="가동률 100% 한계에 도달하는 성수기는 ADR(객단가) 상승 전략을 통해 매출 목표를 달성합니다.">
                                              ADR 레버리지 권장
                                            </span>
                                          ) : (fac.weight >= 10 && input.targetGrowthRate >= 15) ? (
                                            <span className="inline-flex items-center text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-1.5 py-0.5 rounded-md" title="충분한 수용 여력을 기반으로 입장객 수량 증대를 통해 전사 목표를 견인합니다.">
                                              핵심 볼륨 견인
                                            </span>
                                          ) : null}
                                        </div>
                                      </td>
                                      <td className="py-2.5 px-4 text-right tabular-nums text-slate-500 font-semibold">
                                        {fac.weight}%
                                      </td>
                                      <td className="py-2.5 px-4 text-right tabular-nums text-slate-600">
                                        ₩{formatCurrency(fac.actual2025)}원
                                      </td>
                                      <td className="py-2.5 px-4 text-right tabular-nums font-black text-indigo-950 bg-indigo-50/30 text-sm">
                                        ₩{formatCurrency(fac.target2026)}원
                                      </td>
                                      <td className="py-2.5 px-4 text-right tabular-nums font-bold text-emerald-700 bg-emerald-50/20">
                                        ₩{formatCurrency(fac.contributionMargin)}원
                                      </td>
                                      <td className="py-2.5 px-4 text-center font-bold text-slate-600">
                                        {Math.round((fac.cmRate ?? varInfo.cmRate) * 100)}%
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
