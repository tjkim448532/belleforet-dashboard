import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Target, Sparkles, Sliders, TrendingUp,
  Calendar, ChevronDown, ChevronRight, CloudRain,
  RotateCcw, PieChart, CheckCircle2, Clock, Package,
  FileSpreadsheet, Download, Filter, FileText, AlertTriangle,
  Loader2
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import * as XLSX from 'xlsx';
import type { SimulationTargetInput } from '../types/simulation';
import type { StrategicForecastResponse } from '../types/reports-v2';
import { secureFetcher } from '../lib/secureFetcher';
import MonthlyDynamicRebalancer from '../components/dashboard/MonthlyDynamicRebalancer';
import PackageGeneratorSimulator from '../components/dashboard/PackageGeneratorSimulator';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

// 7대 공식 사업본부별 메타 마스터 (공식 명칭 SSOT)
const DIVISION_META: Record<string, { code: string; name: string; color: string; icon: string }> = {
  GOLF: { code: 'GOLF', name: '골프사업본부', color: '#9333EA', icon: '⛳' },
  ROOM: { code: 'ROOM', name: '리조트사업본부', color: '#1E3A8A', icon: '🏨' },
  FNB: { code: 'FNB', name: '콘텐츠기획본부', color: '#16A34A', icon: '🍽️' },
  TICKET: { code: 'TICKET', name: '레저본부', color: '#EAB308', icon: '🎢' },
  LEISURE: { code: 'TICKET', name: '레저본부', color: '#EAB308', icon: '🎢' },
  MOTO: { code: 'MOTO', name: '모토아레나', color: '#E11D48', icon: '🏎️' },
  BANQUET: { code: 'BANQUET', name: '세일즈본부', color: '#0891B2', icon: '🏛️' },
  OTHER: { code: 'OTHER', name: '독립/기타', color: '#475569', icon: '📦' }
};

const YEAR_PAIRS = [
  { baseYear: 2025, targetYear: 2026, label: '2025년 실적 ➔ 2026년 목표' },
  { baseYear: 2026, targetYear: 2027, label: '2026년 실적 ➔ 2027년 목표 (기본)' },
  { baseYear: 2027, targetYear: 2028, label: '2027년 실적 ➔ 2028년 목표 (미래 계획)' }
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

const CATEGORY_ICON_MAP: Record<string, string> = {
  GOLF: '⛳',
  ROOM: '🏨',
  FNB: '🍽️',
  TICKET: '🎢',
  MOTO: '🏎️',
  BANQUET: '🏛️',
  PARKING: '🅿️',
  GOODS: '🛍️'
};

const getCategoryIcon = (name: string, code?: string) => {
  const c = (code || '').toUpperCase();
  if (CATEGORY_ICON_MAP[c]) return CATEGORY_ICON_MAP[c];
  if (name === '벨포레 목장') return '🐎';
  return '📂';
};

const getCategoryDisplayName = (cat: { categoryCode: string; categoryName?: string; teamName?: string }) => {
  if (cat.categoryCode === 'FNB') {
    return cat.teamName || '콘텐츠기획본부';
  }
  return cat.teamName || cat.categoryName || cat.categoryCode;
};

const PART_ICON_MAP: Record<string, string> = {
  '벨포레 목장': '🐎',
  '미디어아트': '🎨',
  '익스트림루지': '🛷',
  '마운틴코스터': '🛷',
  '사계절썰매': '🛷',
  '골프영업': '⛳',
  '객실영업': '🏨',
  '모토아레나': '🏎️',
  '연회영업': '🏛️',
  '놀이동산': '🎪',
  '주차관제': '🅿️'
};

const getPartIcon = (partName: string) => {
  if (!partName) return '📂';
  return PART_ICON_MAP[partName] || '📂';
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
  facilities: ApiFacility[];
}

interface MonthlyMatrixFacility {
  no: number;
  divisionName: string;
  categoryCode: string;
  categoryName: string;
  partName: string;
  facilityName: string;
  weight: number;
  months: Record<number, number>;
  yearTotal: number;
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
  totalRoomCap?: number;
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
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTabParam = searchParams.get('tab');
  const activeTab: 'TARGET_SIM' | 'BUSINESS_PLAN' | 'PACKAGE_GEN' = 
    currentTabParam === 'package' 
      ? 'PACKAGE_GEN' 
      : currentTabParam === 'plan' || currentTabParam === 'business-plan'
      ? 'BUSINESS_PLAN' 
      : 'TARGET_SIM';

  const setActiveTab = (tab: 'TARGET_SIM' | 'BUSINESS_PLAN' | 'PACKAGE_GEN') => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (tab === 'PACKAGE_GEN') {
        next.set('tab', 'package');
      } else if (tab === 'BUSINESS_PLAN') {
        next.set('tab', 'plan');
      } else {
        next.delete('tab');
      }
      return next;
    });
  };

  // Simulation Target Input State (2026년 실적 기반 ➔ 2027년 사업계획 기본 설정)
  const [input, setInput] = useState<SimulationTargetInput>({
    baseYear: 2026,
    targetYear: 2027,
    selectedMonth: 'ANNUAL', // 기본값: 연간 종합 (1~12월)
    period: 'ANNUAL',
    metricInputMode: 'GROWTH_RATE',
    targetTrevpar: 0,
    targetGrowthRate: 0.0, // 기본값: 0.0%
    targetTotalRevenue: 0,
    strategyMode: 'BALANCED',
    includeGolf: true
  });

  // Feature 4: Baseline Selection Mode (직전년도 vs 2개년 가중이동평균 WMA)
  const [baselineMode, setBaselineMode] = useState<'SINGLE_YEAR' | 'WMA_2YEAR'>('SINGLE_YEAR');

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


  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  // Business Plan View Mode: 'MONTHLY_MATRIX' (1~12월 월별 매트릭스) | 'SINGLE_MONTH' (단일 월 상세 비교)
  const [businessPlanViewMode, setBusinessPlanViewMode] = useState<'MONTHLY_MATRIX' | 'SINGLE_MONTH'>('MONTHLY_MATRIX');
  const [raw12MonthsResults, setRaw12MonthsResults] = useState<any[] | null>(null);
  const [isLoadingMatrix, setIsLoadingMatrix] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState<number>(0);

  const [apiData, setApiData] = useState<{ summary: ApiSummary; categories: ApiCategory[] } | null>(null);
  const [rebalancedMonthlyTargets, setRebalancedMonthlyTargets] = useState<Record<number, number>>({});
  
  // Monthly Custom Growth Rates (1월, 2월 등 개별 설정값 영구 기억)
  const [monthlyGrowthRates, setMonthlyGrowthRates] = useState<Record<number, number>>(() => {
    try {
      const saved = sessionStorage.getItem(`belleforet_monthly_growth_${input.targetYear}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        const entries = Object.entries(parsed);
        // If all 12 months were set to exactly 0, it was from the previous component mount bug - purge it!
        if (entries.length === 12 && entries.every(([, v]) => v === 0)) {
          sessionStorage.removeItem(`belleforet_monthly_growth_${input.targetYear}`);
          return {};
        }
        return parsed;
      }
    } catch {
      // ignore
    }
    return {};
  });

  useEffect(() => {
    try {
      if (Object.keys(monthlyGrowthRates).length > 0) {
        sessionStorage.setItem(`belleforet_monthly_growth_${input.targetYear}`, JSON.stringify(monthlyGrowthRates));
      } else {
        sessionStorage.removeItem(`belleforet_monthly_growth_${input.targetYear}`);
      }
    } catch {
      // ignore
    }
  }, [monthlyGrowthRates, input.targetYear]);

  // 3-Depth Accordion State
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [openParts, setOpenParts] = useState<Record<string, boolean>>({});

  const isMonthView = typeof input.selectedMonth === 'number';
  const currentMonthNum = isMonthView ? (input.selectedMonth as number) : null;
  const currentActiveGrowthRate = currentMonthNum !== null
    ? (monthlyGrowthRates[currentMonthNum] ?? input.targetGrowthRate)
    : input.targetGrowthRate;

  const selectedMonthLabel = input.selectedMonth === 'ANNUAL' ? '연간 종합 (1~12월)' : `${input.selectedMonth}월`;
  const periodDays = apiData?.summary?.daysCount || (input.selectedMonth === 'ANNUAL' ? 365 : new Date(input.targetYear, Number(input.selectedMonth), 0).getDate());

  // Fetch Business Plan from Backend API
  useEffect(() => {
    let isMounted = true;
    const fetchBusinessPlan = async () => {
      try {
        setFetchError(null);
        const isYearly = input.selectedMonth === 'ANNUAL';
        const effectiveGrowthRate = isYearly
          ? input.targetGrowthRate
          : (monthlyGrowthRates[input.selectedMonth as number] ?? input.targetGrowthRate);

        const url = isYearly
          ? `${API_BASE}/api/v6/report/business-plan?mode=YEARLY&year=${input.targetYear}&growthRate=${input.targetGrowthRate}&includeGolf=${input.includeGolf}`
          : `${API_BASE}/api/v6/report/business-plan?year=${input.targetYear}&month=${input.selectedMonth}&growthRate=${effectiveGrowthRate}&includeGolf=${input.includeGolf}`;

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
      } catch (err: any) {
        console.warn('Business Plan API fetch warning, fallback to engine:', err);
        if (isMounted) {
          setFetchError(err?.details || err?.message || '현재 데이터베이스 서버가 중지(STOPPED) 상태이거나 네트워크 점검 중입니다.');
        }
      }
    };

    fetchBusinessPlan();
    return () => { isMounted = false; };
  }, [input.selectedMonth, input.targetGrowthRate, input.targetYear, input.baseYear, input.includeGolf, retryTrigger, monthlyGrowthRates]);

  // Server Simulator Integration: POST /api/v6/simulator/strategic-forecast
  const [serverForecastData, setServerForecastData] = useState<StrategicForecastResponse | null>(null);
  const [isForecastComputing, setIsForecastComputing] = useState<boolean>(false);
  const [forecastNotice, setForecastNotice] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const runStrategicForecast = async () => {
      setIsForecastComputing(true);
      try {
        const res: StrategicForecastResponse = await secureFetcher(`${API_BASE}/api/v6/simulator/strategic-forecast`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            selectedYear: input.targetYear,
            customCapacities: {},
            monthMultipliers: monthlyGrowthRates,
            selectedMonth: input.selectedMonth,
            dayFilter: 'ALL',
            simMode: 'BALANCED',
            targetGoal: input.targetGoal ?? input.targetTotalRevenue
          })
        });

        if (!isMounted) return;

        if ((res as any)?.isPowerSaving || res?.error?.includes('심야 절전')) {
          setForecastNotice('🌙 심야 절전 운영 시간(20:00 ~ 08:00)에는 서버리스 계산 엔진이 대기 상태입니다. 매일 아침 08:00에 정상 가동됩니다.');
          setServerForecastData(null);
        } else if (res?.success || res?.annualTotal !== undefined) {
          setServerForecastData(res);
          setForecastNotice(null);
        }
      } catch (err: any) {
        if (!isMounted) return;
        if (err?.message?.includes('심야 절전') || String(err).includes('500')) {
          setForecastNotice('🌙 심야 절전 운영 시간(20:00 ~ 08:00)에는 서버리스 계산 엔진이 대기 상태입니다. 매일 아침 08:00에 정상 가동됩니다.');
        }
      } finally {
        if (isMounted) setIsForecastComputing(false);
      }
    };

    runStrategicForecast();
    return () => { isMounted = false; };
  }, [input.targetYear, input.selectedMonth, input.targetTotalRevenue, monthlyGrowthRates, retryTrigger]);

  // Fetch All 12 Months Matrix Data for Business Plan (Fast parallel fetch of base actuals)
  useEffect(() => {
    let isMounted = true;
    const fetch12Months = async () => {
      setIsLoadingMatrix(true);
      setFetchError(null);
      try {
        const promises = Array.from({ length: 12 }, (_, i) => {
          const m = i + 1;
          const url = `${API_BASE}/api/v6/report/business-plan?year=${input.targetYear}&month=${m}&growthRate=0&includeGolf=${input.includeGolf}`;
          return secureFetcher(url) as Promise<{ success: boolean; data: { summary: ApiSummary; categories: ApiCategory[] } }>;
        });

        const results = await Promise.all(promises);
        if (!isMounted) return;
        setRaw12MonthsResults(results);
      } catch (err: any) {
        console.warn('Failed to fetch 12-month matrix:', err);
        if (isMounted) {
          setFetchError(err?.details || err?.message || '현재 데이터베이스 서버가 중지(STOPPED) 상태이거나 네트워크 점검 중입니다.');
        }
      } finally {
        if (isMounted) setIsLoadingMatrix(false);
      }
    };

    fetch12Months();
    return () => { isMounted = false; };
  }, [input.targetYear, input.includeGolf, retryTrigger]);

  // Compute Rebalanced 12-Month Matrix Data from raw12MonthsResults + rebalancedMonthlyTargets + strategicMultipliers (Zero-Variance Largest Remainder)
  const monthlyMatrixData: MonthlyMatrixFacility[] = useMemo(() => {
    if (!raw12MonthsResults || raw12MonthsResults.length < 12) return [];

    const facilityMap = new Map<string, MonthlyMatrixFacility>();

    for (let m = 1; m <= 12; m++) {
      const res = raw12MonthsResults[m - 1];
      const cats: ApiCategory[] = (res?.data?.categories || []).filter((c: ApiCategory) =>
        c.categoryCode !== 'PARKING' &&
        c.categoryCode !== 'GOODS' &&
        c.categoryCode !== 'OTHER' &&
        (input.includeGolf || c.categoryCode !== 'GOLF')
      );

      const monthBaseTotal = cats.reduce((sum: number, c: ApiCategory) => sum + (c.totalActual2025 || 0), 0);
      const effectiveRate = monthlyGrowthRates[m] ?? input.targetGrowthRate;
      const monthTargetTotal = (monthlyGrowthRates[m] !== undefined)
        ? (monthBaseTotal > 0 ? Math.round(monthBaseTotal * (1 + effectiveRate / 100)) : 0)
        : ((rebalancedMonthlyTargets[m] !== undefined && rebalancedMonthlyTargets[m] > 0)
            ? rebalancedMonthlyTargets[m]
            : (monthBaseTotal > 0 ? Math.round(monthBaseTotal * (1 + effectiveRate / 100)) : 0));

      if (monthBaseTotal === 0 || monthTargetTotal === 0) {
        cats.forEach((cat: ApiCategory) => {
          const divName = getCategoryDisplayName(cat);
          (cat.facilities || []).forEach((fac: ApiFacility) => {
            const key = `${cat.categoryCode}___${fac.facilityName}`;
            if (!facilityMap.has(key)) {
              facilityMap.set(key, {
                no: 0,
                divisionName: divName,
                categoryCode: cat.categoryCode,
                categoryName: cat.categoryName,
                partName: (fac.partName || fac.teamName || '일반').trim(),
                facilityName: fac.facilityName,
                weight: 0,
                months: {},
                yearTotal: 0
              });
            }
            const entry = facilityMap.get(key)!;
            entry.months[m] = 0;
          });
        });
        continue;
      }

      // 1. Calculate raw weighted scores with strategicMultipliers (β_f)
      const scoredCats = cats.map((cat: ApiCategory) => {
        const catCode = cat.categoryCode.toUpperCase();
        const multiplier = strategicMultipliers[catCode] ?? 1.0;
        const baseWeight = (cat.totalActual2025 || 0) / monthBaseTotal;
        const strategicWeightRaw = baseWeight * multiplier;
        return {
          ...cat,
          catCode,
          multiplier,
          baseWeight,
          strategicWeightRaw
        };
      });

      const sumStrategicRawWeights = scoredCats.reduce((sum: number, c) => sum + c.strategicWeightRaw, 0) || 1;

      // 2. Normalized Zero-Sum Weights & Largest Remainder Target Allocation
      const rebalancedCats = scoredCats.map(cat => {
        const normalizedWeight = cat.strategicWeightRaw / sumStrategicRawWeights;
        const targetRev = Math.round(monthTargetTotal * normalizedWeight);
        const catActual = cat.totalActual2025 || 0;

        const facilitiesWithTarget = (cat.facilities || []).map((fac: ApiFacility) => {
          const facShare = catActual > 0 ? ((fac.actual2025 || 0) / catActual) : 0;
          const facTarget = Math.round(targetRev * facShare);
          return {
            ...fac,
            facTarget
          };
        });

        // Facility Largest Remainder within category
        const curFacSum = facilitiesWithTarget.reduce((s: number, f) => s + f.facTarget, 0);
        const facDiff = targetRev - curFacSum;
        if (facDiff !== 0 && facilitiesWithTarget.length > 0) {
          const sorted = [...facilitiesWithTarget].sort((a, b) => b.facTarget - a.facTarget);
          sorted[0].facTarget += facDiff;
        }

        return {
          ...cat,
          totalTarget2026: targetRev,
          facilities: facilitiesWithTarget
        };
      });

      // Division Largest Remainder for 100% Zero-Variance with monthTargetTotal
      const curDivSum = rebalancedCats.reduce((s: number, c) => s + c.totalTarget2026, 0);
      const divDiff = monthTargetTotal - curDivSum;
      if (divDiff !== 0 && rebalancedCats.length > 0) {
        const sortedDivs = [...rebalancedCats].sort((a, b) => b.totalTarget2026 - a.totalTarget2026);
        sortedDivs[0].totalTarget2026 += divDiff;
        if (sortedDivs[0].facilities && sortedDivs[0].facilities.length > 0) {
          sortedDivs[0].facilities[0].facTarget += divDiff;
        }
      }

      // 3. Map into facilityMap
      rebalancedCats.forEach(cat => {
        const divName = getCategoryDisplayName(cat);
        (cat.facilities || []).forEach(fac => {
          const key = `${cat.categoryCode}___${fac.facilityName}`;
          if (!facilityMap.has(key)) {
            facilityMap.set(key, {
              no: 0,
              divisionName: divName,
              categoryCode: cat.categoryCode,
              categoryName: cat.categoryName,
              partName: (fac.partName || fac.teamName || '일반').trim(),
              facilityName: fac.facilityName,
              weight: 0,
              months: {},
              yearTotal: 0
            });
          }
          const entry = facilityMap.get(key)!;
          const facTargetKRW = fac.facTarget || 0;
          entry.months[m] = facTargetKRW;
          entry.yearTotal += facTargetKRW;
        });
      });
    }

    const list = Array.from(facilityMap.values());
    const grandYearSum = list.reduce((s, f) => s + f.yearTotal, 0);

    // Sort by yearTotal descending
    list.sort((a, b) => b.yearTotal - a.yearTotal);
    list.forEach((item, idx) => {
      item.no = idx + 1;
      item.weight = grandYearSum > 0 ? Number(((item.yearTotal / grandYearSum) * 100).toFixed(2)) : 0;
    });

    return list;
  }, [raw12MonthsResults, rebalancedMonthlyTargets, strategicMultipliers, input.targetGrowthRate, input.includeGolf, monthlyGrowthRates]);

  // Feature 4: Baseline Engine directly from Backend API (0-Variance)
  const wmaBaselineData = useMemo(() => {
    const baselineRevenue = apiData?.summary?.grandTotal2025 || 0;
    return {
      activeBaselineRevenue: baselineRevenue,
      wmaTotalRevenue: baselineRevenue,
      singleYearRevenue: baselineRevenue,
      smoothingDelta: 0,
      smoothingRate: 0
    };
  }, [apiData]);

  // Base raw categories from API
  const rawCategories: ApiCategory[] = useMemo(() => {
    const list: ApiCategory[] = (apiData?.categories && apiData.categories.length > 0)
      ? apiData.categories
      : [];

    // 공식 제외 카테고리 필터링 (주차, 굿즈, 기타)
    return list.filter(c => 
      c.categoryCode !== 'PARKING' && 
      c.categoryCode !== 'GOODS' && 
      c.categoryCode !== 'OTHER'
    );
  }, [apiData]);

  // Grand totals
  const rawGrandTotal2025 = apiData?.summary?.grandTotal2025 ?? 0;
  const rawGrandTarget2026 = (apiData?.summary?.grandTarget2026 && apiData.summary.grandTarget2026 > 0)
    ? apiData.summary.grandTarget2026
    : Math.round(rawGrandTotal2025 * (1 + input.targetGrowthRate / 100));

  // Feature 1: Strategic Multiplier Zero-Sum Rebalancing Algorithm (w'_f = (w_f * β_f) / Σ(w_j * β_j))
  const effectiveCategories: ApiCategory[] = useMemo(() => {
    let sourceCats = rawCategories;
    if (!input.includeGolf) {
      sourceCats = rawCategories.filter(c => c.categoryCode !== 'GOLF');
    }

    const golfCategory = rawCategories.find(c => c.categoryCode === 'GOLF');
    const golfActual2025 = golfCategory ? golfCategory.totalActual2025 : 0;
    const totalBaseRev = input.includeGolf ? rawGrandTotal2025 : Math.max(0, rawGrandTotal2025 - golfActual2025);
    const targetGrandTotal = input.includeGolf ? rawGrandTarget2026 : Math.round(rawGrandTarget2026 * (totalBaseRev / (rawGrandTotal2025 || 1)));

    // 1. Calculate raw weighted scores with β_f
    const scoredCats = sourceCats.map(cat => {
      const catCode = cat.categoryCode.toUpperCase();
      const multiplier = strategicMultipliers[catCode] ?? 1.0;

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

      const facilitiesWithTarget: ApiFacility[] = (cat.facilities || []).map((fac) => {
        const facShare = cat.totalActual2025 > 0 ? (fac.actual2025 / cat.totalActual2025) : 0;
        const facTarget = Math.round(targetRev * facShare);

        return {
          ...fac,
          weight: Number((normalizedWeight * facShare * 100).toFixed(2)),
          target2026: facTarget
        };
      });

      // Facility Largest Remainder within category
      const curFacSum = facilitiesWithTarget.reduce((s, f) => s + f.target2026, 0);
      const facDiff = targetRev - curFacSum;
      if (facDiff !== 0 && facilitiesWithTarget.length > 0) {
        const sorted = [...facilitiesWithTarget].sort((a, b) => b.target2026 - a.target2026);
        sorted[0].target2026 += facDiff;
      }

      return {
        ...cat,
        totalWeight: Number((normalizedWeight * 100).toFixed(2)),
        totalTarget2026: targetRev,
        facilities: facilitiesWithTarget
      };
    });

    // Division Largest Remainder for 100% Zero-Variance with Grand Total
    const curDivSum = rebalancedCats.reduce((s, c) => s + c.totalTarget2026, 0);
    const divDiff = targetGrandTotal - curDivSum;
    if (divDiff !== 0 && rebalancedCats.length > 0) {
      const sortedDivs = [...rebalancedCats].sort((a, b) => b.totalTarget2026 - a.totalTarget2026);
      sortedDivs[0].totalTarget2026 += divDiff;
      if (sortedDivs[0].facilities && sortedDivs[0].facilities.length > 0) {
        sortedDivs[0].facilities[0].target2026 += divDiff;
      }
    }

    return rebalancedCats;
  }, [rawCategories, input.includeGolf, rawGrandTarget2026, rawGrandTotal2025, strategicMultipliers]);

  const grandTargetTotal = useMemo(() => {
    return rawGrandTarget2026;
  }, [rawGrandTarget2026]);

  // 100% SSOT Real Actual Revenue & Achievement Rate Calculation (Zero Fake Numbers)
  const actualExecutionStats = useMemo(() => {
    // If backend API provided actuals in summary
    if (apiData?.summary?.grandActual2026 !== undefined && apiData?.summary?.grandActual2026 > 0) {
      const act = apiData.summary.grandActual2026;
      const rate = Number(apiData.summary.overallAchievementRate ?? 0);
      return {
        revenue: act,
        rate,
        displayRate: `${rate}%`,
        statusText: `${input.targetYear}년 ${input.selectedMonth === 'ANNUAL' ? '연간 누적' : `${input.selectedMonth}월`} 실측 실적: ${(act / 100000000).toFixed(2)}억원 (달성률 ${rate}%)`,
        isUpcoming: false
      };
    }

    const monthLabel = input.selectedMonth === 'ANNUAL' ? '연간 종합' : `${input.selectedMonth}월`;
    return {
      revenue: 0,
      rate: 0,
      displayRate: '집계 예정',
      statusText: `${input.targetYear}년 ${monthLabel} 목표 실행 단계 (실적 집계 전)`,
      isUpcoming: true
    };
  }, [input.selectedMonth, input.targetYear, apiData]);

  // Group Category Facilities into 2-Depth Part Groups (백엔드 parts 사전 집계 우선 바인딩)
  const getCategoryParts = useMemo(() => {
    return (cat: ApiCategory): ApiPartGroup[] => {
      const backendParts = (cat as any).parts;
      if (Array.isArray(backendParts) && backendParts.length > 0) {
        return backendParts.map((p: any) => {
          const rawPart = String(p.partName || p.teamName || '일반').trim();
          const partKey = `${cat.categoryCode}_${rawPart}`;
          const matchedFacilities = (cat.facilities || [])
            .filter(f => (f.partName || f.teamName || '일반').trim() === rawPart)
            .map((fac, idx) => ({ ...fac, no: idx + 1 }));
          return {
            partKey,
            partName: rawPart,
            facilityCount: Number(p.facilityCount ?? matchedFacilities.length),
            totalWeight: Number(p.partWeight ?? p.totalWeight ?? 0),
            totalActual2025: Number(p.partActual2025 ?? p.totalActual2025 ?? 0),
            totalTarget2026: Number(p.partTarget2026 ?? p.totalTarget2026 ?? 0),
            totalActual2026: Number(p.partActual2026 ?? p.totalActual2026 ?? 0),
            achievementRate: Number(p.achievementRate ?? 0),
            facilities: matchedFacilities
          };
        }).sort((a: ApiPartGroup, b: ApiPartGroup) => b.totalTarget2026 - a.totalTarget2026);
      }

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
            facilities: []
          };
        }
        map[partKey].facilities.push({
          ...fac,
          no: map[partKey].facilities.length + 1
        });
        map[partKey].facilityCount = map[partKey].facilities.length;
      });

      return Object.values(map).sort((a, b) => b.totalTarget2026 - a.totalTarget2026);
    };
  }, []);

  // Filter Buttons
  const availableCategoryFilters = useMemo(() => {
    const list = [{ id: 'ALL', label: '전체' }];
    effectiveCategories.forEach(c => {
      list.push({ 
        id: c.categoryCode, 
        label: `${getCategoryIcon(c.categoryName, c.categoryCode)} ${getCategoryDisplayName(c)}` 
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

  // Total facilities across all effective categories (백엔드 summary.totalFacilityCount 바인딩)
  const totalFacilityCount = useMemo(() => {
    if (apiData?.summary?.totalFacilityCount !== undefined) {
      return Number(apiData.summary.totalFacilityCount);
    }
    return monthlyMatrixData?.length || 0;
  }, [apiData, monthlyMatrixData]);

  const availableMatrixCategories = useMemo(() => {
    if (effectiveCategories.length > 0) {
      return effectiveCategories.map(c => ({
        code: c.categoryCode,
        name: getCategoryDisplayName(c),
        icon: getCategoryIcon(c.categoryName, c.categoryCode),
        count: c.facilities?.length || 0
      }));
    }
    if (monthlyMatrixData && monthlyMatrixData.length > 0) {
      const catMap = new Map<string, { code: string; name: string; icon: string; count: number }>();
      monthlyMatrixData.forEach(f => {
        if (!catMap.has(f.categoryCode)) {
          catMap.set(f.categoryCode, {
            code: f.categoryCode,
            name: f.divisionName || f.categoryName,
            icon: getCategoryIcon(f.categoryName, f.categoryCode),
            count: 0
          });
        }
        catMap.get(f.categoryCode)!.count += 1;
      });
      return Array.from(catMap.values());
    }
    return [
      { code: 'GOLF', name: '골프사업본부', icon: '⛳', count: 0 },
      { code: 'ROOM', name: '리조트사업본부', icon: '🏨', count: 0 },
      { code: 'FNB', name: '콘텐츠기획본부', icon: '🍽️', count: 0 },
      { code: 'TICKET', name: '레저본부', icon: '🎢', count: 0 },
      { code: 'MOTO', name: '모토아레나', icon: '🏎️', count: 0 },
      { code: 'BANQUET', name: '세일즈본부', icon: '🏛️', count: 0 }
    ];
  }, [effectiveCategories, monthlyMatrixData]);

  // Flat business plan facility list with computed simulator target metrics
  const flatBusinessPlanFacilities = useMemo(() => {
    const list: Array<{
      no: number;
      divisionName: string;
      categoryCode: string;
      categoryName: string;
      partName: string;
      facilityName: string;
      weight: number;
      baseActual: number;
      targetRevenue: number;
      diff: number;
      growthRate: number;
      strategyBadge: string;
    }> = [];

    let index = 1;
    filteredCategories.forEach(cat => {
      const divName = getCategoryDisplayName(cat);
      (cat.facilities || []).forEach(fac => {
        const diff = fac.target2026 - fac.actual2025;
        const growth = fac.actual2025 > 0 ? Number(((diff / fac.actual2025) * 100).toFixed(1)) : 0;
        let badge = '안정 운영';
        if (fac.facilityName.includes('콘도') || fac.categoryCode === 'ROOM') {
          badge = 'ADR 레버리지 권장';
        } else if (fac.weight >= 10 && input.targetGrowthRate >= 15) {
          badge = '핵심 볼륨 견인';
        } else if (diff > 0) {
          badge = '매출 확대';
        } else if (diff < 0) {
          badge = '비용/수익 방어';
        }

        list.push({
          no: index++,
          divisionName: divName,
          categoryCode: fac.categoryCode,
          categoryName: fac.categoryName || cat.categoryName,
          partName: (fac.partName || fac.teamName || '일반').trim(),
          facilityName: fac.facilityName,
          weight: fac.weight,
          baseActual: fac.actual2025,
          targetRevenue: fac.target2026,
          diff,
          growthRate: growth,
          strategyBadge: badge
        });
      });
    });

    return list;
  }, [filteredCategories, input.targetGrowthRate]);

  // Business plan totals for current filter
  const businessPlanTotals = useMemo(() => {
    let baseActualSum = 0;
    let targetRevenueSum = 0;
    flatBusinessPlanFacilities.forEach(f => {
      baseActualSum += f.baseActual;
      targetRevenueSum += f.targetRevenue;
    });
    const diffSum = targetRevenueSum - baseActualSum;
    const growthRateSum = baseActualSum > 0 ? Number(((diffSum / baseActualSum) * 100).toFixed(1)) : 0;
    return {
      facilityCount: flatBusinessPlanFacilities.length,
      baseActualSum,
      targetRevenueSum,
      diffSum,
      growthRateSum
    };
  }, [flatBusinessPlanFacilities]);

  // Filtered facilities for 12-month matrix view
  const filteredMatrixFacilities = useMemo(() => {
    if (!monthlyMatrixData) return [];
    if (selectedCategoryFilter === 'ALL') return monthlyMatrixData;
    return monthlyMatrixData.filter(f => 
      f.categoryCode === selectedCategoryFilter || 
      f.categoryName === selectedCategoryFilter
    );
  }, [monthlyMatrixData, selectedCategoryFilter]);

  // Monthly totals across 12 months for matrix view
  const matrixMonthlyTotals = useMemo(() => {
    const monthSums: Record<number, number> = {};
    for (let m = 1; m <= 12; m++) monthSums[m] = 0;
    let grandYearTotal = 0;

    filteredMatrixFacilities.forEach(f => {
      for (let m = 1; m <= 12; m++) {
        monthSums[m] += (f.months[m] || 0);
      }
      grandYearTotal += f.yearTotal;
    });

    let peakMonth = 1;
    let peakVal = 0;
    for (let m = 1; m <= 12; m++) {
      if (monthSums[m] > peakVal) {
        peakVal = monthSums[m];
        peakMonth = m;
      }
    }

    return {
      monthSums,
      grandYearTotal,
      peakMonth,
      peakVal
    };
  }, [filteredMatrixFacilities]);

  // Export Business Plan to authentic multi-sheet Excel (.xlsx) using SheetJS
  const handleExportExcel = () => {
    if (flatBusinessPlanFacilities.length === 0 && filteredMatrixFacilities.length === 0) {
      alert('내보낼 매출목표 데이터가 없습니다.');
      return;
    }

    const targetMonthLabel = input.selectedMonth === 'ANNUAL' ? '연간종합' : `${input.selectedMonth}월`;
    const categoryLabel = selectedCategoryFilter === 'ALL' 
      ? '전체부문' 
      : (effectiveCategories.find(c => c.categoryCode === selectedCategoryFilter)?.categoryName || selectedCategoryFilter);

    const wb = XLSX.utils.book_new();

    // 1. Sheet 1: 1~12월_월별매출목표 (매트릭스)
    if (filteredMatrixFacilities.length > 0) {
      const matrixRows: any[][] = [
        [`[벨포레 리조트] ${input.targetYear}년 1~12월 영업장별 월별 매출목표`],
        [`시뮬레이션 조건: 비교연도 ${input.baseYear}년 ➔ ${input.targetYear}년 목표 | 전사 목표성장률: +${input.targetGrowthRate}% | 골프: ${input.includeGolf ? '포함(전사)' : '제외(순수 리조트)'} | 선택 대분류: ${selectedCategoryFilter === 'ALL' ? '전체 부문' : categoryLabel}`],
        [`추출일시: ${new Date().toLocaleString('ko-KR')} | 통화 단위: 원 (VAT 별도 순매출)`],
        [],
        [
          'No', 
          '대분류(본부)', 
          '중분류(파트)', 
          '영업장명', 
          '1월', '2월', '3월', '4월', '5월', '6월', 
          '7월', '8월', '9월', '10월', '11월', '12월', 
          '연간 합계(원)'
        ]
      ];

      filteredMatrixFacilities.forEach(f => {
        matrixRows.push([
          f.no,
          f.divisionName,
          f.partName,
          f.facilityName,
          f.months[1] || 0,
          f.months[2] || 0,
          f.months[3] || 0,
          f.months[4] || 0,
          f.months[5] || 0,
          f.months[6] || 0,
          f.months[7] || 0,
          f.months[8] || 0,
          f.months[9] || 0,
          f.months[10] || 0,
          f.months[11] || 0,
          f.months[12] || 0,
          f.yearTotal
        ]);
      });

      // 합계 행
      matrixRows.push([
        '합계',
        selectedCategoryFilter === 'ALL' ? '전체 부문 (전사)' : categoryLabel,
        '-',
        `총 ${filteredMatrixFacilities.length}개 영업장`,
        matrixMonthlyTotals.monthSums[1] || 0,
        matrixMonthlyTotals.monthSums[2] || 0,
        matrixMonthlyTotals.monthSums[3] || 0,
        matrixMonthlyTotals.monthSums[4] || 0,
        matrixMonthlyTotals.monthSums[5] || 0,
        matrixMonthlyTotals.monthSums[6] || 0,
        matrixMonthlyTotals.monthSums[7] || 0,
        matrixMonthlyTotals.monthSums[8] || 0,
        matrixMonthlyTotals.monthSums[9] || 0,
        matrixMonthlyTotals.monthSums[10] || 0,
        matrixMonthlyTotals.monthSums[11] || 0,
        matrixMonthlyTotals.monthSums[12] || 0,
        matrixMonthlyTotals.grandYearTotal
      ]);

      const ws1 = XLSX.utils.aoa_to_sheet(matrixRows);
      ws1['!cols'] = [
        { wch: 6 },  // No
        { wch: 18 }, // 대분류
        { wch: 16 }, // 중분류
        { wch: 26 }, // 영업장명
        { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
        { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
        { wch: 18 }  // 연간합계
      ];
      XLSX.utils.book_append_sheet(wb, ws1, '1~12월_월별매출목표');
    }

    // 2. Sheet 2: 선택월_상세매출목표
    if (flatBusinessPlanFacilities.length > 0) {
      const detailRows: any[][] = [
        [`[벨포레 리조트] ${input.targetYear}년 ${targetMonthLabel} 영업장별 매출목표`],
        [`시뮬레이션 조건: 비교연도 ${input.baseYear}년 실적 ➔ ${input.targetYear}년 목표 | 대상기간: ${targetMonthLabel} | 전사 목표성장률: +${input.targetGrowthRate}% | 골프: ${input.includeGolf ? '포함(전사)' : '제외(순수 리조트)'} | 선택 대분류: ${selectedCategoryFilter === 'ALL' ? '전체 부문' : categoryLabel}`],
        [`추출일시: ${new Date().toLocaleString('ko-KR')} | 통화 단위: 원 (VAT 별도 순매출)`],
        [],
        [
          'No', 
          '대분류(본부)', 
          '중분류(파트)', 
          '영업장명', 
          '전략 비중(%)', 
          `${input.baseYear}년 실적(원)`, 
          `${input.targetYear}년 매출목표(원)`, 
          '목표 증감액(원)', 
          '목표 성장률(%)', 
          '전략 방향'
        ]
      ];

      flatBusinessPlanFacilities.forEach(f => {
        detailRows.push([
          f.no,
          f.divisionName,
          f.partName,
          f.facilityName,
          f.weight,
          f.baseActual,
          f.targetRevenue,
          f.diff,
          `${f.growthRate > 0 ? '+' : ''}${f.growthRate}%`,
          f.strategyBadge
        ]);
      });

      detailRows.push([
        '합계',
        selectedCategoryFilter === 'ALL' ? '전체 부문 (전사)' : categoryLabel,
        '-',
        `총 ${businessPlanTotals.facilityCount}개 영업장`,
        100.0,
        businessPlanTotals.baseActualSum,
        businessPlanTotals.targetRevenueSum,
        businessPlanTotals.diffSum,
        `${businessPlanTotals.growthRateSum > 0 ? '+' : ''}${businessPlanTotals.growthRateSum}%`,
        '정합성 검증 완료'
      ]);

      const ws2 = XLSX.utils.aoa_to_sheet(detailRows);
      ws2['!cols'] = [
        { wch: 6 },  { wch: 20 }, { wch: 18 }, { wch: 28 }, { wch: 14 },
        { wch: 20 }, { wch: 22 }, { wch: 18 }, { wch: 15 }, { wch: 22 }
      ];
      XLSX.utils.book_append_sheet(wb, ws2, `${targetMonthLabel}_상세내역`);
    }

    const cleanCategoryName = categoryLabel.replace(/[\/\\?%*:|"<>]/g, '');
    const fileName = `벨포레_${input.targetYear}년_매출목표_${cleanCategoryName}_월별통합.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

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
        formatter: (params: any) => `${params.name}: ${Number(params.value || 0).toLocaleString()}원 (${params.percent}%)`
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
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16">
      
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-[32px] p-8 lg:p-10 text-white relative overflow-hidden shadow-xl border border-indigo-900/50">
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute right-32 -bottom-20 w-64 h-64 bg-teal-500/10 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-teal-400 animate-pulse" />
              <span className="font-bold tracking-wider text-xs lg:text-sm text-teal-300 uppercase">
                BELLE FORET STRATEGIC TARGET ENGINE [PRO]
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-white flex items-center gap-3 break-keep whitespace-nowrap">
              {input.targetYear}년 목표수립 시뮬레이터 v2
              <span className="text-xs bg-indigo-600/60 backdrop-blur-md px-3 py-1 rounded-full text-teal-200 border border-indigo-400/40 font-bold whitespace-nowrap">
                PRO Engine v6.0
              </span>
            </h1>
            <p className="text-slate-300 text-xs lg:text-sm mt-2 font-normal max-w-3xl">
              경영진이 부서별 전략 승수를 적용하여 <strong>실시간 시뮬레이션</strong>을 수행하고, <strong>1원 단위 정합성</strong> 및 <strong>다년도 기상 보정</strong>을 적용하는 전사 경영 계획 엔진입니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setBaselineMode(prev => prev === 'SINGLE_YEAR' ? 'WMA_2YEAR' : 'SINGLE_YEAR')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border flex items-center gap-2 shadow-xs cursor-pointer ${
                baselineMode === 'WMA_2YEAR'
                  ? 'bg-teal-500 text-slate-950 border-teal-300 font-black'
                  : 'bg-white/10 text-white hover:bg-white/20 border-white/15'
              }`}
            >
              <CloudRain size={16} />
              {baselineMode === 'WMA_2YEAR' ? '🌧️ 2개년 WMA 기상보정 가동중' : '📊 직전 1개년 실적 기준선'}
            </button>
          </div>
        </div>
      </div>

      {/* 1.5 Tab Switcher: Target Simulator vs Business Plan vs Package Generator */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab('TARGET_SIM')}
          className={`flex-1 py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'TARGET_SIM'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Target size={17} />
          <span>🎯 전사 전략 목표 & 리밸런싱</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('BUSINESS_PLAN')}
          className={`flex-1 py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'BUSINESS_PLAN'
              ? 'bg-gradient-to-r from-indigo-700 to-indigo-900 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet size={17} />
          <span>📋 매출목표 (영업장별 목표 & 엑셀)</span>
          <span className="text-[10px] bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded-full font-black hidden lg:inline-block">
            다운로드 지원
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('PACKAGE_GEN')}
          className={`flex-1 py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'PACKAGE_GEN'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Package size={17} />
          <span>📦 비수기 패키지 시뮬레이터</span>
          <span className="text-[10px] bg-teal-100 text-teal-900 px-2 py-0.5 rounded-full font-black hidden lg:inline-block">
            TrevPAR 기반
          </span>
        </button>
      </div>

      {/* Server Power-saving / Operational Notice */}
      {forecastNotice && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-xs font-semibold text-amber-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-600 shrink-0" />
            <span>{forecastNotice}</span>
          </div>
          <span className="text-[10px] text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded font-mono">
            절전 모드 대기
          </span>
        </div>
      )}

      {/* Server Forecast Summary Bar */}
      {serverForecastData && (
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-400" />
            <span className="text-xs font-bold text-white">전사 12개월 매출 예측 시뮬레이터</span>
            {isForecastComputing && <span className="text-[11px] text-indigo-300 font-semibold animate-pulse">연산 중...</span>}
          </div>
          <div className="flex flex-wrap items-center gap-5 text-xs">
            {serverForecastData.annualTotal !== undefined && (
              <div>
                <span className="text-slate-300">연간 총예측: </span>
                <b className="font-mono text-emerald-400 font-bold">{serverForecastData.annualTotal.toLocaleString()}원</b>
              </div>
            )}
            {serverForecastData.annualMaxCapacity !== undefined && (
              <div>
                <span className="text-slate-300">물리 최대 Capa: </span>
                <b className="font-mono text-slate-200">{serverForecastData.annualMaxCapacity.toLocaleString()}원</b>
              </div>
            )}
            {serverForecastData.utilizationRate !== undefined && (
              <div>
                <span className="text-slate-300">가동률: </span>
                <b className="font-mono text-indigo-300">{serverForecastData.utilizationRate}%</b>
              </div>
            )}
            {serverForecastData.goalAchievementPct !== undefined && (
              <div>
                <span className="text-slate-300">목표 달성률: </span>
                <b className="font-mono text-amber-400 font-black">{serverForecastData.goalAchievementPct}%</b>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'PACKAGE_GEN' ? (
        <PackageGeneratorSimulator />
      ) : activeTab === 'BUSINESS_PLAN' ? (
        <div className="space-y-6">
          {/* Top Control Header Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                  <FileSpreadsheet size={22} />
                </span>
                <h2 className="text-xl font-black text-slate-900">
                  {input.targetYear}년 {businessPlanViewMode === 'MONTHLY_MATRIX' ? '1~12월 월별' : selectedMonthLabel} 영업장별 매출목표
                </h2>
                <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 text-xs font-black rounded-lg">
                  {isLoadingMatrix ? '12개월 동기화 중...' : '목표 정규 시뮬레이션'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                시뮬레이터 설정 성장률(+{input.targetGrowthRate}%) 및 비례 배분이 적용된 {businessPlanViewMode === 'MONTHLY_MATRIX' ? '12개월 월별 전체 목표 매트릭스' : `${selectedMonthLabel} 상세 목표치`}입니다.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('TARGET_SIM')}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sliders size={14} />
                <span>성장률 / 전략승수 조절</span>
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                className="px-4 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
              >
                <Download size={15} />
                <span>엑셀 (.xlsx) 다운로드</span>
                <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono">
                  1~12월 통합
                </span>
              </button>
            </div>
          </div>

          {/* 🎛️ Business Plan Year & Growth Rate Simulator Control Bar */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-4 text-white shadow-md space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Year Selection */}
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Calendar size={14} className="text-indigo-400" />
                  비교 연도 선택:
                </span>
                <div className="flex flex-wrap items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700 text-xs">
                  {YEAR_PAIRS.map(yp => {
                    const isSelected = input.baseYear === yp.baseYear && input.targetYear === yp.targetYear;
                    return (
                      <button
                        key={`${yp.baseYear}-${yp.targetYear}`}
                        type="button"
                        onClick={() => setInput(prev => ({ ...prev, baseYear: yp.baseYear, targetYear: yp.targetYear }))}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-xs font-black'
                            : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                        }`}
                      >
                        {yp.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Growth Rate Controls */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-300">목표 성장률:</span>
                  <div className="flex items-center gap-1 bg-slate-800/90 px-2.5 py-1 rounded-xl border border-slate-700">
                    <input
                      type="range"
                      min={-20}
                      max={30}
                      step={0.5}
                      value={input.targetGrowthRate}
                      onChange={(e) => setInput(prev => ({ ...prev, targetGrowthRate: Number(e.target.value) }))}
                      className="accent-teal-400 w-24 sm:w-32 cursor-pointer"
                    />
                    <span className="text-xs font-black text-teal-300 font-mono w-14 text-right">
                      {input.targetGrowthRate > 0 ? `+${input.targetGrowthRate.toFixed(1)}` : input.targetGrowthRate.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="hidden sm:flex items-center gap-1">
                  {[0, 3, 5, 7, 10].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setInput(prev => ({ ...prev, targetGrowthRate: pct }))}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                        input.targetGrowthRate === pct
                          ? 'bg-teal-500 text-slate-950 border-teal-400 font-black shadow-2xs'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {pct > 0 ? `+${pct}%` : `${pct}%`}
                    </button>
                  ))}
                </div>

                {/* Include Golf Toggle */}
                <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700 text-xs">
                  <button
                    type="button"
                    onClick={() => setInput(prev => ({ ...prev, includeGolf: true }))}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      input.includeGolf ? 'bg-teal-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    골프 포함
                  </button>
                  <button
                    type="button"
                    onClick={() => setInput(prev => ({ ...prev, includeGolf: false }))}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      !input.includeGolf ? 'bg-rose-500 text-white font-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    골프 제외
                  </button>
                </div>
              </div>
            </div>

            {input.targetYear === 2027 && (
              <div className="flex items-center justify-between text-[11px] text-slate-300 bg-indigo-900/40 px-3 py-1.5 rounded-xl border border-indigo-800/50">
                <span>
                  💡 <strong>연말 매출목표 수립 모드:</strong> {input.baseYear}년 실적 데이터를 기저로 목표 성장률({input.targetGrowthRate > 0 ? `+${input.targetGrowthRate}%` : `${input.targetGrowthRate}%`})을 적용하여 {input.targetYear}년 31개 영업장별 1~12월 목표를 자동 추산합니다.
                </span>
                <span className="text-[10px] text-amber-300 font-bold hidden md:inline-block">
                  * 11~12월은 2026년 연말 결산 완료 시 실측치가 100% 자동 완결됩니다
                </span>
              </div>
            )}
          </div>

          {/* DB Server Status / Error Alert Banner */}
          {(fetchError || (!isLoadingMatrix && filteredMatrixFacilities.length === 0 && !apiData)) && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-300">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
                  <AlertTriangle size={22} className="animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-amber-950 flex items-center gap-2">
                    <span>데이터베이스 서버 중지(STOPPED) 또는 연결 대기 중</span>
                    <span className="text-[10px] px-2 py-0.5 bg-amber-200 text-amber-900 rounded-md font-mono font-bold">
                      서버 점검/수면 모드
                    </span>
                  </h4>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    {fetchError || '현재 AWS RDS 데이터베이스 서버가 심야/주말 절전(STOPPED) 상태이거나 네트워크 점검 중입니다.'}
                    <br />
                    관리자 콘솔에서 데이터베이스 서버가 가동되면 1~12월 전체 영업장별 매출목표 데이터가 자동으로 표시됩니다.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFetchError(null);
                  setRetryTrigger(prev => prev + 1);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>데이터 다시 불러오기</span>
              </button>
            </div>
          )}

          {/* Loading Indicator Banner */}
          {isLoadingMatrix && (
            <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-6 text-center shadow-xs flex flex-col items-center justify-center gap-2 animate-in fade-in duration-300">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-black text-indigo-900 mt-1">
                1~12월 전체 영업장별 매출목표 데이터를 동기화하는 중입니다...
              </p>
              <p className="text-[11px] text-indigo-600">
                전체 12개월의 마트 실적 데이터를 취합하고 있습니다.
              </p>
            </div>
          )}

          {/* Filter & Selector Bar */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Dropdowns */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Category Dropdown */}
                <div className="flex items-center gap-2">
                  <label htmlFor="categoryFilterSelect" className="text-xs font-black text-slate-700 flex items-center gap-1.5 whitespace-nowrap">
                    <Filter size={15} className="text-indigo-600" />
                    <span>대분류(본부):</span>
                  </label>
                  <select
                    id="categoryFilterSelect"
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="bg-white border border-slate-300 text-slate-800 font-bold text-xs sm:text-sm rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-xs min-w-[210px] cursor-pointer"
                  >
                    <option value="ALL">
                      전체 부문 (전사 총괄{isLoadingMatrix ? ' - 동기화 중...' : totalFacilityCount > 0 ? ` - ${totalFacilityCount}개 영업장` : ''})
                    </option>
                    {availableMatrixCategories.map(cat => (
                      <option key={cat.code} value={cat.code}>
                        {cat.icon} {cat.name} {cat.count > 0 ? `(${cat.count}개 영업장)` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Period/Month Dropdown */}
                <div className="flex items-center gap-2">
                  <label htmlFor="periodFilterSelect" className="text-xs font-black text-slate-700 flex items-center gap-1.5 whitespace-nowrap">
                    <Calendar size={15} className="text-indigo-600" />
                    <span>조회 기간(월):</span>
                  </label>
                  <select
                    id="periodFilterSelect"
                    value={businessPlanViewMode === 'MONTHLY_MATRIX' ? 'MATRIX' : input.selectedMonth}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'MATRIX') {
                        setBusinessPlanViewMode('MONTHLY_MATRIX');
                      } else if (val === 'ANNUAL') {
                        setInput(prev => ({ ...prev, selectedMonth: 'ANNUAL' }));
                        setBusinessPlanViewMode('SINGLE_MONTH');
                      } else {
                        setInput(prev => ({ ...prev, selectedMonth: Number(val) }));
                        setBusinessPlanViewMode('SINGLE_MONTH');
                      }
                    }}
                    className="bg-white border border-slate-300 text-slate-800 font-bold text-xs sm:text-sm rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-xs min-w-[220px] cursor-pointer"
                  >
                    <option value="MATRIX">📅 1~12월 전체 월별 매트릭스</option>
                    <option value="ANNUAL">📅 연간 종합 (1~12월 합산)</option>
                    {MONTH_NAMES.filter(m => m.id !== 'ANNUAL').map(m => (
                      <option key={m.id} value={m.id}>
                        {m.label} ({m.season})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* View Mode Toggle Button */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs self-start lg:self-auto">
                <button
                  type="button"
                  onClick={() => setBusinessPlanViewMode('MONTHLY_MATRIX')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    businessPlanViewMode === 'MONTHLY_MATRIX'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Calendar size={13} />
                  <span>1~12월 월별 매트릭스</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBusinessPlanViewMode('SINGLE_MONTH');
                    if (input.selectedMonth === 'ANNUAL') {
                      setInput(prev => ({ ...prev, selectedMonth: 1 }));
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    businessPlanViewMode === 'SINGLE_MONTH'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <FileText size={13} />
                  <span>단일 월 상세 비교 ({selectedMonthLabel})</span>
                </button>
              </div>
            </div>

            {/* Quick Month Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-200/80 pb-1 text-xs">
              <span className="text-[11px] font-black text-slate-500 mr-1 shrink-0">빠른 월 선택:</span>
              <button
                type="button"
                onClick={() => setBusinessPlanViewMode('MONTHLY_MATRIX')}
                className={`px-3 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                  businessPlanViewMode === 'MONTHLY_MATRIX'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                📅 1~12월 전체 매트릭스
              </button>
              <button
                type="button"
                onClick={() => {
                  setInput(prev => ({ ...prev, selectedMonth: 'ANNUAL' }));
                  setBusinessPlanViewMode('SINGLE_MONTH');
                }}
                className={`px-3 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                  businessPlanViewMode === 'SINGLE_MONTH' && input.selectedMonth === 'ANNUAL'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                연간 종합
              </button>
              {MONTH_NAMES.filter(m => m.id !== 'ANNUAL').map(m => {
                const isSelected = businessPlanViewMode === 'SINGLE_MONTH' && input.selectedMonth === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setInput(prev => ({ ...prev, selectedMonth: m.id as number }));
                      setBusinessPlanViewMode('SINGLE_MONTH');
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {m.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4 Summary KPI Cards */}
          {businessPlanViewMode === 'MONTHLY_MATRIX' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs min-h-[116px] flex flex-col justify-between">
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1">대상 영업장 수</div>
                  <div className="text-2xl font-black text-slate-800 font-mono tabular-nums">
                    {isLoadingMatrix ? '...' : `${filteredMatrixFacilities.length}개`}
                    <span className="text-xs font-bold text-slate-500 ml-1 font-sans">영업장</span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  전체 {totalFacilityCount}개 영업장 중
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-indigo-200 shadow-xs bg-gradient-to-br from-white to-indigo-50/30 min-h-[116px] flex flex-col justify-between">
                <div>
                  <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-tight mb-1">{input.targetYear}년 연간 목표 합계</div>
                  <div className="text-2xl font-black text-indigo-700 font-mono tabular-nums">
                    {isLoadingMatrix ? '동기화 중...' : filteredMatrixFacilities.length > 0 ? `${formatCurrency(matrixMonthlyTotals.grandYearTotal)}원` : '-'}
                  </div>
                </div>
                <div className="text-[11px] text-indigo-500 mt-1 font-medium">
                  1~12월 월별 목표치 합계
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs min-h-[116px] flex flex-col justify-between">
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1">12개월 월평균 목표</div>
                  <div className="text-2xl font-black text-slate-800 font-mono tabular-nums">
                    {isLoadingMatrix ? '동기화 중...' : filteredMatrixFacilities.length > 0 ? `${formatCurrency(Math.round(matrixMonthlyTotals.grandYearTotal / 12))}원` : '-'}
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  일평균 약 {filteredMatrixFacilities.length > 0 ? formatCurrency(Math.round(matrixMonthlyTotals.grandYearTotal / 365)) : '0'}원
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs bg-amber-50/30 min-h-[116px] flex flex-col justify-between">
                <div>
                  <div className="text-[11px] font-bold text-amber-800 uppercase tracking-tight mb-1">최대 매출 피크 월</div>
                  <div className="text-2xl font-black text-amber-900 font-mono tabular-nums flex items-baseline gap-1.5">
                    {isLoadingMatrix ? '...' : filteredMatrixFacilities.length > 0 ? (
                      <>
                        <span>{matrixMonthlyTotals.peakMonth}월</span>
                        <span className="text-sm font-bold text-amber-700 font-mono">
                          ({formatCurrency(matrixMonthlyTotals.peakVal)}원)
                        </span>
                      </>
                    ) : '-'}
                  </div>
                </div>
                <div className="text-[11px] text-amber-700 mt-1 font-medium">
                  선택 부문 연간 최고 매출 시즌
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs min-h-[116px] flex flex-col justify-between">
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1">대상 영업장 수</div>
                  <div className="text-2xl font-black text-slate-800 font-mono tabular-nums">
                    {businessPlanTotals.facilityCount}
                    <span className="text-xs font-bold text-slate-500 ml-1 font-sans">개 영업장</span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  전체 {totalFacilityCount}개 영업장 중
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs min-h-[116px] flex flex-col justify-between">
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1">{input.baseYear}년 기준 실적</div>
                  <div className="text-2xl font-black text-slate-800 font-mono tabular-nums">
                    {flatBusinessPlanFacilities.length > 0 ? `${formatCurrency(businessPlanTotals.baseActualSum)}원` : '-'}
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  순매출 (VAT 별도)
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-indigo-200 shadow-xs bg-gradient-to-br from-white to-indigo-50/30 min-h-[116px] flex flex-col justify-between">
                <div>
                  <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-tight mb-1">{input.targetYear}년 매출목표 합계</div>
                  <div className="text-2xl font-black text-indigo-700 font-mono tabular-nums">
                    {flatBusinessPlanFacilities.length > 0 ? `${formatCurrency(businessPlanTotals.targetRevenueSum)}원` : '-'}
                  </div>
                </div>
                <div className="text-[11px] text-indigo-500 mt-1 font-medium">
                  시뮬레이터 목표 안분 합계
                </div>
              </div>

              <div className={`p-5 rounded-2xl border shadow-xs min-h-[116px] flex flex-col justify-between ${
                businessPlanTotals.diffSum >= 0 ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'
              }`}>
                <div>
                  <div className="text-[11px] font-bold text-slate-600 uppercase tracking-tight mb-1">목표 증감액 & 성장률</div>
                  <div className={`text-2xl font-black font-mono tabular-nums ${
                    businessPlanTotals.diffSum >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    {flatBusinessPlanFacilities.length > 0 ? (
                      <>
                        {businessPlanTotals.diffSum >= 0 ? '+' : ''}{formatCurrency(businessPlanTotals.diffSum)}
                        <span className="text-xs font-bold ml-1 font-sans">원</span>
                      </>
                    ) : '-'}
                  </div>
                </div>
                <div className={`text-xs font-black font-mono mt-1 ${
                  businessPlanTotals.growthRateSum >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {flatBusinessPlanFacilities.length > 0 ? (
                    <>
                      {businessPlanTotals.growthRateSum >= 0 ? '▲ +' : '▼ '}{businessPlanTotals.growthRateSum}%
                      <span className="text-[10px] text-slate-500 font-normal ml-1 font-sans">vs {input.baseYear}년</span>
                    </>
                  ) : '-'}
                </div>
              </div>
            </div>
          )}

          {/* Business Plan Table Rendering (Matrix vs Single Month) */}
          {businessPlanViewMode === 'MONTHLY_MATRIX' ? (
            /* 1~12월 전체 월별 매트릭스 테이블 */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet size={17} className="text-indigo-600" />
                  <h3 className="text-sm font-black text-slate-900">
                    영업장별 1~12월 월별 매출목표 매트릭스
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    ({filteredMatrixFacilities.length}개 라인)
                  </span>
                </div>
                <div className="text-xs text-indigo-700 font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={13} />
                  <span>12개월 월별 합계 = 연간 목표치 1원 단위 무결성 보존</span>
                </div>
              </div>

              <div className="overflow-x-auto border-t border-slate-200">
                <table className="w-full text-xs text-left border-collapse table-fixed">
                  <colgroup>
                    <col style={{ width: '48px' }} />
                    <col style={{ width: '110px' }} />
                    <col style={{ width: '160px' }} />
                    {Array.from({ length: 12 }, (_, i) => (
                      <col key={i} style={{ width: '105px' }} />
                    ))}
                    <col style={{ width: '135px' }} />
                  </colgroup>
                  <thead className="bg-slate-100 text-slate-600 font-black uppercase text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-1 text-center w-[48px] min-w-[48px] max-w-[48px] sticky left-0 bg-slate-100 z-30 border-b border-slate-200">No</th>
                      <th className="py-2.5 px-2.5 text-left w-[110px] min-w-[110px] max-w-[110px] sticky left-[48px] bg-slate-100 z-30 border-b border-slate-200">대분류(본부)</th>
                      <th className="py-2.5 px-3 text-left w-[160px] min-w-[160px] max-w-[160px] sticky left-[158px] bg-slate-100 z-30 border-b border-r border-slate-300 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)]">영업장명 (파트)</th>
                      {Array.from({ length: 12 }, (_, i) => {
                        const m = i + 1;
                        const hasCustom = monthlyGrowthRates[m] !== undefined;
                        const rateVal = monthlyGrowthRates[m] ?? input.targetGrowthRate;
                        return (
                          <th key={m} className="py-2.5 px-2.5 text-right w-[105px] min-w-[105px] max-w-[105px] whitespace-nowrap border-b border-slate-200">
                            <div className="flex items-center justify-end gap-1">
                              <span className="font-bold text-slate-700">{m}월</span>
                              {hasCustom && <span className="text-teal-600 text-[9px] font-black" title="개별 설정값 기억 중">●</span>}
                            </div>
                            <div className={`text-[10px] font-mono tabular-nums ${hasCustom ? 'text-teal-700 font-black' : 'text-slate-400 font-normal'}`}>
                              {rateVal > 0 ? `+${rateVal}%` : `${rateVal}%`}
                            </div>
                          </th>
                        );
                      })}
                      <th className="py-2.5 px-4 text-right w-[135px] min-w-[135px] text-indigo-950 bg-indigo-50/70 font-black whitespace-nowrap border-b border-l border-slate-200">
                        연간 합계
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMatrixFacilities.length === 0 ? (
                      <tr>
                        <td colSpan={15} className="py-12 text-center text-slate-400">
                          {isLoadingMatrix ? (
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                              <span className="font-bold text-slate-600">1~12월 매출목표 매트릭스 데이터를 동기화하고 있습니다...</span>
                            </div>
                          ) : fetchError ? (
                            <div className="flex flex-col items-center justify-center gap-2 text-amber-700">
                              <AlertTriangle className="w-6 h-6 text-amber-500" />
                              <span className="font-bold">데이터베이스 서버 응답 대기 중 ({fetchError})</span>
                              <span className="text-xs text-slate-500">서버가 정상 가동되면 상단의 [데이터 다시 불러오기]를 눌러주십시오.</span>
                            </div>
                          ) : (
                            <span>선택한 부문에 해당하는 영업장 데이터가 없습니다.</span>
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredMatrixFacilities.map(f => (
                        <tr key={`${f.categoryCode}_${f.facilityName}`} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="py-2.5 px-1 text-center font-mono text-slate-400 text-[11px] w-[48px] min-w-[48px] max-w-[48px] sticky left-0 bg-white group-hover:bg-slate-50 z-10">
                            {f.no}
                          </td>
                          <td className="py-2.5 px-2.5 font-bold text-slate-700 whitespace-nowrap w-[110px] min-w-[110px] max-w-[110px] sticky left-[48px] bg-white group-hover:bg-slate-50 z-10 truncate" title={f.divisionName}>
                            <span className="mr-1">{getCategoryIcon(f.categoryName, f.categoryCode)}</span>
                            {f.divisionName}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap w-[160px] min-w-[160px] max-w-[160px] sticky left-[158px] bg-white group-hover:bg-slate-50 z-10 border-r border-slate-300 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)]">
                            <div className="font-black text-slate-900 truncate leading-tight" title={f.facilityName}>{f.facilityName}</div>
                            <div className="text-[10px] text-slate-400 font-medium truncate leading-none mt-0.5" title={f.partName}>{f.partName}</div>
                          </td>
                          {Array.from({ length: 12 }, (_, i) => {
                            const m = i + 1;
                            const val = f.months[m] || 0;
                            return (
                              <td key={m} className="py-2.5 px-2.5 text-right tabular-nums whitespace-nowrap w-[105px] min-w-[105px]">
                                {val > 0 ? (
                                  <span className="font-mono font-bold text-slate-800 text-[11px]">{formatCurrency(val)}원</span>
                                ) : (
                                  <span className="font-mono text-slate-300 text-[11px] font-normal">-</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="py-2.5 px-4 text-right tabular-nums font-mono font-black text-indigo-950 bg-indigo-50/30 whitespace-nowrap border-l border-slate-100 text-xs w-[135px] min-w-[135px]">
                            {formatCurrency(f.yearTotal)}원
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {filteredMatrixFacilities.length > 0 && (
                    <tfoot className="bg-slate-100/90 font-black border-t-2 border-slate-300 text-slate-900">
                      <tr>
                        <td className="py-3 px-1 text-center w-[48px] min-w-[48px] max-w-[48px] sticky left-0 bg-slate-100 z-20 font-bold text-slate-600">합계</td>
                        <td className="py-3 px-2.5 font-black whitespace-nowrap w-[110px] min-w-[110px] max-w-[110px] sticky left-[48px] bg-slate-100 z-20 truncate" title={selectedCategoryFilter === 'ALL' ? '전체 부문 (전사 총괄)' : (effectiveCategories.find(c => c.categoryCode === selectedCategoryFilter)?.categoryName || selectedCategoryFilter)}>
                          {selectedCategoryFilter === 'ALL' ? '전체 부문' : (effectiveCategories.find(c => c.categoryCode === selectedCategoryFilter)?.categoryName || selectedCategoryFilter)}
                        </td>
                        <td className="py-3 px-3 font-black whitespace-nowrap w-[160px] min-w-[160px] max-w-[160px] sticky left-[158px] bg-slate-100 z-20 border-r border-slate-300 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)]">
                          총 {filteredMatrixFacilities.length}개 영업장
                        </td>
                        {Array.from({ length: 12 }, (_, i) => {
                          const m = i + 1;
                          const mSum = matrixMonthlyTotals.monthSums[m] || 0;
                          return (
                            <td key={m} className="py-3 px-2.5 text-right tabular-nums font-mono font-black whitespace-nowrap text-slate-900 text-xs w-[105px] min-w-[105px]">
                              {formatCurrency(mSum)}원
                            </td>
                          );
                        })}
                        <td className="py-3 px-4 text-right tabular-nums font-mono font-black text-indigo-900 bg-indigo-100/70 whitespace-nowrap text-sm border-l border-indigo-200 w-[135px] min-w-[135px]">
                          {formatCurrency(matrixMonthlyTotals.grandYearTotal)}원
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          ) : (
            /* 단일 월 상세 비교 테이블 */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80">
                <div className="flex items-center gap-2">
                  <FileText size={17} className="text-indigo-600" />
                  <h3 className="text-sm font-black text-slate-900">
                    영업장별 {selectedMonthLabel} 매출목표 세부 내역
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    ({flatBusinessPlanFacilities.length}개 라인)
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>녹색: 목표 상향(▲)</span>
                  <span className="text-slate-300">|</span>
                  <span className="inline-block w-2 h-2 rounded-full bg-rose-500"></span>
                  <span>적색: 목표 조정(▼)</span>
                </div>
              </div>

              <div className="overflow-x-auto border-t border-slate-200">
                <table className="w-full text-xs text-left border-collapse table-fixed min-w-[1050px]">
                  <colgroup>
                    <col style={{ width: '48px' }} />
                    <col style={{ width: '115px' }} />
                    <col style={{ width: '95px' }} />
                    <col style={{ width: '160px' }} />
                    <col style={{ width: '75px' }} />
                    <col style={{ width: '120px' }} />
                    <col style={{ width: '135px' }} />
                    <col style={{ width: '120px' }} />
                    <col style={{ width: '85px' }} />
                    <col style={{ width: '130px' }} />
                  </colgroup>
                  <thead className="bg-slate-100 text-slate-600 font-black uppercase text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-1 text-center w-[48px]">No</th>
                      <th className="py-2.5 px-3 text-left">대분류(본부)</th>
                      <th className="py-2.5 px-3 text-left">중분류(파트)</th>
                      <th className="py-2.5 px-3 text-left">영업장명</th>
                      <th className="py-2.5 px-3 text-right">전략 비중</th>
                      <th className="py-2.5 px-3 text-right">{input.baseYear}년 실적</th>
                      <th className="py-2.5 px-3 text-right text-indigo-950 bg-indigo-50/70 border-l border-slate-200">
                        {input.targetYear}년 매출목표
                      </th>
                      <th className="py-2.5 px-3 text-right">목표 증감액</th>
                      <th className="py-2.5 px-3 text-right">목표 성장률</th>
                      <th className="py-2.5 px-3 text-center">전략 방향</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {flatBusinessPlanFacilities.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-400">
                          {fetchError ? (
                            <div className="flex flex-col items-center justify-center gap-2 text-amber-700">
                              <AlertTriangle className="w-6 h-6 text-amber-500" />
                              <span className="font-bold">데이터베이스 서버 응답 대기 중 ({fetchError})</span>
                              <span className="text-xs text-slate-500">서버가 정상 가동되면 상단의 [데이터 다시 불러오기]를 눌러주십시오.</span>
                            </div>
                          ) : (
                            <span>선택한 부문에 해당하는 영업장 데이터가 없습니다.</span>
                          )}
                        </td>
                      </tr>
                    ) : (
                      flatBusinessPlanFacilities.map(f => (
                        <tr key={`${f.categoryCode}_${f.partName}_${f.facilityName}`} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-1 text-center font-mono text-slate-400 text-[11px]">
                            {f.no}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-700 whitespace-nowrap truncate" title={f.divisionName}>
                            <span className="mr-1.5">{getCategoryIcon(f.categoryName, f.categoryCode)}</span>
                            {f.divisionName}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-600 whitespace-nowrap truncate" title={f.partName}>
                            {f.partName}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap truncate" title={f.facilityName}>
                            {f.facilityName}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600 font-medium">
                            {f.weight.toFixed(2)}%
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600 font-medium whitespace-nowrap">
                            {formatCurrency(f.baseActual)}원
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums font-black text-indigo-950 bg-indigo-50/30 whitespace-nowrap border-l border-slate-100">
                            {formatCurrency(f.targetRevenue)}원
                          </td>
                          <td className={`py-2.5 px-3 text-right font-mono tabular-nums font-bold whitespace-nowrap ${
                            f.diff >= 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}>
                            {f.diff >= 0 ? '+' : ''}{formatCurrency(f.diff)}원
                          </td>
                          <td className={`py-2.5 px-3 text-right font-mono tabular-nums font-black whitespace-nowrap ${
                            f.growthRate >= 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}>
                            {f.growthRate >= 0 ? '▲ +' : '▼ '}{f.growthRate}%
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                              f.strategyBadge === 'ADR 레버리지 권장'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : f.strategyBadge === '핵심 볼륨 견인'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : f.diff > 0
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : f.diff < 0
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {f.strategyBadge}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {flatBusinessPlanFacilities.length > 0 && (
                    <tfoot className="bg-slate-100/90 font-black border-t-2 border-slate-300 text-slate-900">
                      <tr>
                        <td className="py-3 px-1 text-center font-bold text-slate-600">합계</td>
                        <td className="py-3 px-3 font-black whitespace-nowrap truncate" title={selectedCategoryFilter === 'ALL' ? '전체 부문 (전사 총괄)' : (effectiveCategories.find(c => c.categoryCode === selectedCategoryFilter)?.categoryName || selectedCategoryFilter)}>
                          {selectedCategoryFilter === 'ALL' ? '전체 부문' : (effectiveCategories.find(c => c.categoryCode === selectedCategoryFilter)?.categoryName || selectedCategoryFilter)}
                        </td>
                        <td className="py-3 px-3 text-slate-500 font-normal">-</td>
                        <td className="py-3 px-3 font-black whitespace-nowrap">
                          총 {businessPlanTotals.facilityCount}개 영업장
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-indigo-700 font-black">
                          100.0%
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums font-bold whitespace-nowrap">
                          {formatCurrency(businessPlanTotals.baseActualSum)}원
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums font-black text-indigo-900 bg-indigo-100/60 whitespace-nowrap text-sm border-l border-indigo-200">
                          {formatCurrency(businessPlanTotals.targetRevenueSum)}원
                        </td>
                        <td className={`py-3 px-3 text-right font-mono tabular-nums font-black whitespace-nowrap ${
                          businessPlanTotals.diffSum >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}>
                          {businessPlanTotals.diffSum >= 0 ? '+' : ''}{formatCurrency(businessPlanTotals.diffSum)}원
                        </td>
                        <td className={`py-3 px-3 text-right font-mono tabular-nums font-black whitespace-nowrap ${
                          businessPlanTotals.growthRateSum >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}>
                          {businessPlanTotals.growthRateSum >= 0 ? '▲ +' : '▼ '}{businessPlanTotals.growthRateSum}%
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800 border border-indigo-200">
                            <CheckCircle2 size={12} />
                            정합성 배분 완료
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* Business Plan Guidance Notes */}
          <div className="bg-indigo-50/60 rounded-2xl p-4 border border-indigo-100 text-xs text-indigo-900 flex items-start gap-3">
            <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg shrink-0 mt-0.5">
              <FileSpreadsheet size={16} />
            </span>
            <div className="space-y-1">
              <p className="font-bold">
                💡 매출목표 월별 매트릭스 & 엑셀 다운로드 안내
              </p>
              <p className="text-indigo-800/80 leading-relaxed text-[11px]">
                • <strong className="text-indigo-950 font-bold">[1~12월 월별 매트릭스]</strong>를 통해 썸머랜드(여름 피크), 사계절썰매장, 골프, 콘도 등 리조트 각 영업장의 계절성(Seasonality)이 반영된 12개월 월별 전체 목표치를 한눈에 비교·검토하실 수 있습니다.
                <br />
                • 상단 빠른 월 선택 탭(1월~12월)을 클릭하면 해당 월의 전년 실적 대비 증감액, 성장률 및 전략 방향을 상세 조회할 수 있습니다.
                <br />
                • 우측 상단의 <strong className="text-indigo-950 font-bold">[엑셀 (.xlsx) 다운로드]</strong> 버튼을 누르시면 <strong>[1~12월_월별매출목표]</strong> 매트릭스 시트와 <strong>[{selectedMonthLabel}_상세내역]</strong> 시트가 모두 포함된 통합 Excel 파일로 즉시 내려받아집니다.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
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
              시뮬레이션 대상 월 선택 ({baselineMode === 'WMA_2YEAR' ? '2개년 가중이동평균(2025: 60%, 2024: 40%) 기상정규화 비중 대입' : `${input.baseYear}년 실측 비중 대입`})
            </span>
            <span className="text-teal-300 font-extrabold">
              현재 선택: {input.targetYear}년 {selectedMonthLabel} ({periodDays}일 기준)
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-7 xl:grid-cols-[repeat(13,minmax(0,1fr))] gap-1.5">
            {MONTH_NAMES.map(m => {
              const isSelected = input.selectedMonth === m.id;
              const hasCustomRate = m.id !== 'ANNUAL' && monthlyGrowthRates[m.id as number] !== undefined;
              const monthRate = m.id === 'ANNUAL' 
                ? input.targetGrowthRate 
                : (monthlyGrowthRates[m.id as number] ?? input.targetGrowthRate);

              return (
                <button
                  key={String(m.id)}
                  onClick={() => setInput(prev => ({ ...prev, selectedMonth: m.id as any }))}
                  className={`h-[66px] min-h-[66px] max-h-[66px] px-1 py-2 rounded-xl text-center transition-all cursor-pointer flex flex-col justify-between items-center border relative ${
                    isSelected
                      ? 'bg-teal-400 text-slate-950 font-black border-teal-300 shadow-md scale-[1.02]'
                      : 'bg-white/10 text-slate-200 hover:bg-white/20 border-white/10 font-bold'
                  }`}
                >
                  <span className="text-[12px] font-black leading-none">{m.shortLabel}</span>
                  <span className={`text-[9px] font-medium leading-none truncate max-w-full px-0.5 ${isSelected ? 'text-slate-900 font-bold' : 'text-slate-400'}`} title={m.season}>
                    {m.season}
                  </span>
                  <span className={`text-[10px] font-mono font-black leading-none px-1.5 py-0.5 rounded ${
                    isSelected
                      ? 'bg-slate-900 text-teal-300'
                      : hasCustomRate
                        ? 'bg-teal-400/25 text-teal-300 border border-teal-400/50'
                        : 'text-slate-400'
                  }`}>
                    {hasCustomRate && '● '}{monthRate > 0 ? `+${monthRate}%` : `${monthRate}%`}
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
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                {isMonthView ? (
                  <>
                    <span>📅 {input.targetYear}년 {currentMonthNum}월 ({MONTH_NAMES.find(m => m.id === currentMonthNum)?.season}) 목표 성장률 개별 설정</span>
                    {monthlyGrowthRates[currentMonthNum!] !== undefined && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-teal-400 text-slate-950 font-black rounded-md">
                        개별 기억 중
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span>🚀 {input.targetYear}년 전사 연간 일괄 목표 성장률 설정</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-indigo-500/40 text-indigo-200 font-bold rounded-md">
                      연간 기준
                    </span>
                  </>
                )}
              </span>
              <span className="text-[11px] text-slate-300 font-medium">
                {baselineMode === 'WMA_2YEAR' ? '2개년 WMA 대비' : `${input.baseYear}년 실측 대비`}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-black tabular-nums text-teal-300">
                  {currentActiveGrowthRate > 0 ? `+${currentActiveGrowthRate}%` : `${currentActiveGrowthRate}%`}
                </span>
                <span className="text-xs text-slate-300 font-semibold">
                  {isMonthView ? `${currentMonthNum}월 개별 목표 대입` : '전사 연간 기본 일괄 적용'}
                </span>
              </div>

              {/* Reset to Annual Button if month has custom rate */}
              {isMonthView && monthlyGrowthRates[currentMonthNum!] !== undefined && (
                <button
                  type="button"
                  onClick={() => {
                    setMonthlyGrowthRates(prev => {
                      const updated = { ...prev };
                      delete updated[currentMonthNum!];
                      return updated;
                    });
                  }}
                  className="text-[10px] text-amber-300 hover:text-white bg-amber-500/20 hover:bg-amber-500/30 px-2.5 py-1 rounded-lg border border-amber-400/30 transition-all cursor-pointer font-bold"
                >
                  연간 일괄값(+{input.targetGrowthRate}%)으로 복원
                </button>
              )}

              {/* Reset All Months Button if on ANNUAL and has custom months */}
              {!isMonthView && Object.keys(monthlyGrowthRates).length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setMonthlyGrowthRates({});
                    try {
                      sessionStorage.removeItem(`belleforet_monthly_growth_${input.targetYear}`);
                    } catch {
                      // ignore
                    }
                  }}
                  className="text-[10px] text-amber-300 hover:text-white bg-amber-500/20 hover:bg-amber-500/30 px-2.5 py-1 rounded-lg border border-amber-400/30 transition-all cursor-pointer font-bold"
                >
                  개별 설정 {Object.keys(monthlyGrowthRates).length}개 월 일괄 초기화
                </button>
              )}
            </div>

            <input
              type="range"
              min="-20"
              max="40"
              step="0.5"
              value={currentActiveGrowthRate}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (isMonthView) {
                  setMonthlyGrowthRates(prev => ({ ...prev, [currentMonthNum!]: val }));
                } else {
                  setInput(prev => ({ ...prev, targetGrowthRate: val }));
                }
              }}
              className="w-full h-2.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-400"
            />

            {/* Quick Growth Presets */}
            <div className="flex items-center justify-between gap-1 pt-1">
              {[-10, 0, 5, 10, 15, 20, 30].map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    if (isMonthView) {
                      setMonthlyGrowthRates(prev => ({ ...prev, [currentMonthNum!]: r }));
                    } else {
                      setInput(prev => ({ ...prev, targetGrowthRate: r }));
                    }
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    currentActiveGrowthRate === r 
                      ? 'bg-teal-400 text-slate-950 font-black' 
                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  {r > 0 ? `+${r}%` : `${r}%`}
                </button>
              ))}
            </div>

            {/* Hint Notice */}
            <div className="text-[11px] text-slate-400 pt-1">
              {isMonthView ? (
                <span>💡 {currentMonthNum}월의 슬라이더를 조절하면 <strong>{currentMonthNum}월의 목표만 독립적으로 기억</strong>되어 [매출목표] 12개월 매트릭스에 즉시 반영됩니다.</span>
              ) : (
                <span>💡 상단에서 <strong>1월, 2월 등 특정 월을 클릭</strong>하여 각 월별 목표 성장률을 다르게 개별 지정·기억시킬 수 있습니다.</span>
              )}
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

      {/* 3. 🏆 4 Executive KPI Highlight Summary Cards (Zero Fake Numbers) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Card 1: 목표 총매출 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs min-h-[116px] flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1">
              {input.targetYear}년 목표 {input.selectedMonth === 'ANNUAL' ? '연간' : `${input.selectedMonth}월`} 총매출
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono tabular-nums">
              {(grandTargetTotal / 100000000).toFixed(2)} <span className="text-sm font-normal text-slate-500 font-sans">억원</span>
            </div>
          </div>
          <div className="text-xs text-teal-700 font-bold mt-1 font-mono">
            기준선 대비 +{input.targetGrowthRate}% (+{((grandTargetTotal - wmaBaselineData.activeBaselineRevenue) / 100000000).toFixed(2)}억)
          </div>
        </div>

        {/* Card 2: Dual TrevPAR */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs min-h-[116px] flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1">
              목표 {input.includeGolf ? '전사 Total' : '순수 리조트'} TrevPAR
            </div>
            <div className="text-2xl font-black text-teal-800 font-mono tabular-nums">
              {formatCurrency(Number((apiData?.summary as any)?.dailyTrevPar ?? apiData?.summary?.dailyTrevPAR ?? 0))}원 <span className="text-sm font-normal text-slate-500 font-sans">/실</span>
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            공식 가동 물리 객실({apiData?.summary?.totalRoomCap?.toLocaleString() || 0}실) 기준
          </div>
        </div>

        {/* Card 3: WMA 기상 보정 상태 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs min-h-[116px] flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1">
              기준선 산출 방식
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 truncate" title={baselineMode === 'WMA_2YEAR' ? '2개년 WMA 가중평균' : `${input.baseYear}년 실측 단독`}>
              {baselineMode === 'WMA_2YEAR' ? '🌧️ 2개년 WMA 가중평균' : `📊 ${input.baseYear}년 실측 단독`}
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {baselineMode === 'WMA_2YEAR' ? `스무딩: ${wmaBaselineData.smoothingRate > 0 ? '+' : ''}${wmaBaselineData.smoothingRate}%` : '작년 단일 실적 기준'}
          </div>
        </div>

        {/* Card 4: 실제 진도율 (100% Real SSOT Data - No Hardcoded Numbers) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs min-h-[116px] flex flex-col justify-between">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1 flex items-center justify-between">
            <span>{input.targetYear}년 실제 달성률</span>
            {actualExecutionStats.isUpcoming ? (
              <Clock size={12} className="text-slate-400" />
            ) : (
              <CheckCircle2 size={12} className="text-emerald-500" />
            )}
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono tabular-nums flex items-center gap-1">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
            <span>{actualExecutionStats.displayRate}</span>
          </div>
          <div className="text-xs text-slate-500 mt-1 truncate" title={actualExecutionStats.statusText}>
            {actualExecutionStats.revenue > 0 ? `실적: ${(actualExecutionStats.revenue / 100000000).toFixed(2)}억원` : actualExecutionStats.statusText}
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
          monthlyGrowthRates={monthlyGrowthRates}
          onMonthlyGrowthRatesChange={setMonthlyGrowthRates}
        />
      )}

      {/* 5. 🎛️ 부문별 전략 승수 (β_f) 세부 조절 슬라이더 */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
          <div>
            <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-600" />
              부문별 전략 승수 (β_f) 세부 조절 슬라이더
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              경영진이 부서별 가중치를 조절하면 Zero-Sum 공식에 의해 전사 총목표를 보존하며 타 부문과 상호 재분배됩니다.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => {
                setStrategicMultipliers({
                  ROOM: 1.0,
                  GOLF: 1.0,
                  FNB: 1.0,
                  TICKET: 1.0,
                  MOTO: 1.0,
                  BANQUET: 1.0,
                  OTHER: 1.0
                });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
              title="모든 승수를 1.00x 기본값으로 초기화합니다"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              승수 초기화
            </button>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded-xl border border-indigo-100">
              Zero-Sum Active
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {['GOLF', 'ROOM', 'FNB', 'TICKET', 'MOTO', 'BANQUET'].map(divKey => {
            const meta = DIVISION_META[divKey] || DIVISION_META.OTHER;
            const val = strategicMultipliers[divKey] ?? 1.0;
            const isNonGolf = !input.includeGolf && divKey === 'GOLF';
            if (isNonGolf) return null;

            return (
              <div key={divKey} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 hover:border-slate-200 transition-colors">
                <div className="flex items-center gap-2.5 w-full sm:w-40 shrink-0">
                  <span className="text-xl">{meta.icon}</span>
                  <div>
                    <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <span>{meta.code}</span>
                      <span className="text-[10px] font-normal text-slate-500">({meta.name})</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex items-center gap-2.5 w-full">
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    value={val}
                    onChange={(e) => handleMultiplierChange(divKey, Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <span className="text-xs font-black tabular-nums w-12 text-right text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 shrink-0">
                    {val.toFixed(2)}x
                  </span>
                </div>

                <div className="flex items-center gap-1 self-end sm:self-auto shrink-0">
                  <button
                    onClick={() => handleMultiplierChange(divKey, 1.2)}
                    className={`px-2 py-1 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                      val === 1.2 ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    육성 (+20%)
                  </button>
                  <button
                    onClick={() => handleMultiplierChange(divKey, 0.8)}
                    className={`px-2 py-1 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                      val === 0.8 ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    축소 (-20%)
                  </button>
                  <button
                    onClick={() => handleMultiplierChange(divKey, 1.0)}
                    className={`px-2 py-1 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                      val === 1.0 ? 'bg-slate-700 text-white' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-100 hover:text-slate-600'
                    }`}
                    title="1.00x 기본값"
                  >
                    1.0x
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. 📊 ECharts 부문별 목표 비중 도넛 차트 */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-indigo-600" />
            전략 승수(β_f) 적용 후 부문별 목표 매출 구성비
          </h3>
          <span className="text-xs font-bold text-slate-500">전사 목표 총액: {(grandTargetTotal / 100000000).toFixed(2)}억원</span>
        </div>
        <ReactECharts option={categoryPieOptions} style={{ height: '300px', width: '100%' }} />
      </div>

      {/* 6. 📂 3-Depth 아코디언 테이블 & 스마트 뱃지 */}
      <div className="bg-white rounded-[32px] p-7 border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-600" />
              영업장별 세부 실행 목표 3-Depth 아코디언 ({input.targetYear}년 {selectedMonthLabel})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              전략 승수(β_f)가 반영된 <strong>[부문 ➔ 파트 ➔ 소속 영업장]</strong> 1원 단위 정규화 결과입니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('BUSINESS_PLAN')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet size={14} />
              <span>매출목표 시트 보기</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl transition-all cursor-pointer shadow-xs"
              title="현재 시뮬레이션 목표치를 엑셀(.xlsx)로 다운로드합니다"
            >
              <Download size={14} />
              <span>엑셀 다운로드</span>
            </button>

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
            const catIcon = getCategoryIcon(cat.categoryName, cat.categoryCode);
            const partGroups = getCategoryParts(cat);
            const catDiff = cat.totalTarget2026 - cat.totalActual2025;

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
                        {getCategoryDisplayName(cat)}
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
                    <div className="text-slate-600 whitespace-nowrap">
                      전략 비중: <span className="font-extrabold text-slate-900">{cat.totalWeight}%</span>
                    </div>
                    <div className="text-slate-600 whitespace-nowrap">
                      {input.baseYear}년 실적: <span className="font-extrabold text-slate-700 tabular-nums">{formatCurrency(cat.totalActual2025)}원</span>
                    </div>
                    <div className="text-indigo-900 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100 whitespace-nowrap">
                      {input.targetYear}년 목표: <span className="font-black text-indigo-700 tabular-nums">{formatCurrency(cat.totalTarget2026)}원</span>
                    </div>
                    <div className={`px-3 py-1 rounded-lg border font-bold tabular-nums whitespace-nowrap ${
                      catDiff >= 0 ? 'text-teal-900 bg-teal-50 border-teal-200' : 'text-rose-900 bg-rose-50 border-rose-200'
                    }`}>
                      증감: {catDiff >= 0 ? '+' : ''}{formatCurrency(catDiff)}원
                    </div>
                  </div>
                </div>

                {/* Depth 2 & 3 Parts & Facilities Table */}
                {isCatOpen && (
                  <div className="divide-y divide-slate-100">
                    {partGroups.map((part) => {
                      const isPartOpen = openParts[part.partKey] !== undefined ? openParts[part.partKey] : true;
                      const partIcon = getPartIcon(part.partName);
                      const partDiff = part.totalTarget2026 - part.totalActual2025;

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
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 whitespace-nowrap">
                                {part.facilityCount}개 영업장
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-3.5 text-xs font-semibold">
                              <div className="text-slate-600 whitespace-nowrap">
                                {input.baseYear}년: <span className="font-bold text-slate-700 tabular-nums">{formatCurrency(part.totalActual2025)}원</span>
                              </div>
                              <div className="text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200 whitespace-nowrap">
                                목표: <span className="font-black text-teal-700 tabular-nums">{formatCurrency(part.totalTarget2026)}원</span>
                              </div>
                              <div className={`px-2.5 py-0.5 rounded-md border font-bold tabular-nums whitespace-nowrap ${
                                partDiff >= 0 ? 'text-teal-800 bg-teal-50 border-teal-100' : 'text-rose-800 bg-rose-50 border-rose-100'
                              }`}>
                                증감: {partDiff >= 0 ? '+' : ''}{formatCurrency(partDiff)}원
                              </div>
                            </div>
                          </div>

                          {/* Depth 3 Facilities Table */}
                          {isPartOpen && (
                            <div className="overflow-x-auto bg-white">
                              <table className="w-full text-left border-collapse text-xs whitespace-nowrap min-w-[850px] table-fixed">
                                <colgroup>
                                  <col style={{ width: '48px' }} />
                                  <col style={{ width: '250px' }} />
                                  <col style={{ width: '90px' }} />
                                  <col style={{ width: '130px' }} />
                                  <col style={{ width: '150px' }} />
                                  <col style={{ width: '130px' }} />
                                </colgroup>
                                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                                  <tr>
                                    <th className="py-2.5 px-2 w-[48px] text-center whitespace-nowrap">No</th>
                                    <th className="py-2.5 px-4 text-left whitespace-nowrap">영업장명 및 전략 뱃지</th>
                                    <th className="py-2.5 px-4 text-right whitespace-nowrap">전략 비중 (%)</th>
                                    <th className="py-2.5 px-4 text-right whitespace-nowrap">{input.baseYear}년 실적</th>
                                    <th className="py-2.5 px-4 text-right font-black text-indigo-950 whitespace-nowrap bg-indigo-50/50">{input.targetYear}년 목표 매출</th>
                                    <th className="py-2.5 px-4 text-right font-bold text-teal-800 whitespace-nowrap">목표 증감액 (Δ)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-800">
                                  {part.facilities.map((fac) => {
                                    const facDiff = fac.target2026 - fac.actual2025;
                                    return (
                                      <tr key={`${fac.categoryCode}-${fac.facilityName}`} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-400 whitespace-nowrap">
                                          {fac.no}
                                        </td>
                                        <td className="py-2.5 px-4 font-bold text-slate-900 text-xs sm:text-sm whitespace-nowrap">
                                          <div className="flex items-center gap-1.5 flex-nowrap whitespace-nowrap">
                                            <span className="whitespace-nowrap">{fac.facilityName}</span>
                                            {fac.facilityName.includes('콘도') || fac.categoryCode === 'ROOM' ? (
                                              <span className="inline-flex items-center text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded-md whitespace-nowrap shrink-0" title="성수기 집중 매출 강도 및 ADR(객단가) 전략을 통해 매출 목표를 달성합니다.">
                                                ADR 레버리지 권장
                                              </span>
                                            ) : (fac.weight >= 10 && input.targetGrowthRate >= 15) ? (
                                              <span className="inline-flex items-center text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-1.5 py-0.5 rounded-md whitespace-nowrap shrink-0" title="충분한 수용 여력을 기반으로 입장객 수량 증대를 통해 전사 목표를 견인합니다.">
                                                핵심 볼륨 견인
                                              </span>
                                            ) : null}
                                          </div>
                                        </td>
                                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-500 font-semibold whitespace-nowrap">
                                          {fac.weight}%
                                        </td>
                                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                                          {formatCurrency(fac.actual2025)}원
                                        </td>
                                        <td className="py-2.5 px-4 text-right font-mono tabular-nums font-black text-indigo-950 bg-indigo-50/30 text-xs sm:text-sm whitespace-nowrap">
                                          {formatCurrency(fac.target2026)}원
                                        </td>
                                        <td className={`py-2.5 px-4 text-right font-mono tabular-nums font-bold whitespace-nowrap ${
                                          facDiff >= 0 ? 'text-teal-700 bg-teal-50/20' : 'text-rose-700 bg-rose-50/20'
                                        }`}>
                                          {facDiff >= 0 ? '+' : ''}{formatCurrency(facDiff)}원
                                        </td>
                                      </tr>
                                    );
                                  })}
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
        </>
      )}

    </div>
  );
}
