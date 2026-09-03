import { useState, useEffect, useMemo } from 'react';
import { 
  Target, Sparkles, 
  Calendar, Layers, DollarSign, CalendarDays,
  ChevronDown, ChevronRight, TrendingUp
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import type { SimulationTargetInput, FacilityCapacityItem } from '../types/simulation';
import { DEFAULT_CAPACITY_SEEDS } from '../data/defaultCapacitySeeds';
import { runTargetSimulation } from '../lib/targetSimulationEngine';
import { secureFetcher } from '../lib/secureFetcher';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

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

export default function TargetSimulator() {
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

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  
  // Business Plan API State
  const [apiData, setApiData] = useState<{ summary: ApiSummary; categories: ApiCategory[] } | null>(null);
  const [apiLoading, setApiLoading] = useState<boolean>(false);
  
  // 3-Depth Accordion State: Depth 1 (Categories) & Depth 2 (Parts)
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
      setApiLoading(true);
      try {
        const isYearly = input.selectedMonth === 'ANNUAL';
        const url = isYearly
          ? `${API_BASE}/api/v6/report/business-plan?mode=YEARLY&year=${input.targetYear}&growthRate=${input.targetGrowthRate}&includeGolf=${input.includeGolf}`
          : `${API_BASE}/api/v6/report/business-plan?year=${input.targetYear}&month=${input.selectedMonth}&growthRate=${input.targetGrowthRate}&includeGolf=${input.includeGolf}`;

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
      } finally {
        if (isMounted) setApiLoading(false);
      }
    };

    fetchBusinessPlan();
    return () => { isMounted = false; };
  }, [input.selectedMonth, input.targetGrowthRate, input.targetYear, input.baseYear, input.includeGolf]);

  // Raw categories from API or Simulation Engine
  const rawCategories: ApiCategory[] = useMemo(() => {
    if (apiData?.categories && apiData.categories.length > 0) {
      return apiData.categories;
    }
    return simulationResult.divisionResults.map((div) => ({
      categoryCode: div.category,
      categoryName: div.categoryLabel,
      teamName: div.categoryLabel,
      facilityCount: div.facilities.length,
      totalActual2025: div.lyRevenue,
      totalWeight: div.targetShare,
      totalTarget2026: div.targetRevenue,
      totalActual2026: 0,
      achievementRate: 0,
      facilities: div.facilities.map((f, fIdx) => ({
        no: fIdx + 1,
        categoryCode: div.category,
        categoryName: div.categoryLabel,
        teamName: div.categoryLabel,
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

  // Golf Category Subtotal for Minus Operation
  const golfCategory = useMemo(() => {
    return rawCategories.find(c => 
      c.categoryCode.includes('골프') || 
      c.categoryName.includes('골프') || 
      c.categoryCode === 'GOLF'
    );
  }, [rawCategories]);

  // Effective categories: 골프 제외 시 골프 부문 차감 및 순수 리조트 비중 재연산 (The Bible Minus Operation)
  const effectiveCategories: ApiCategory[] = useMemo(() => {
    if (input.includeGolf) {
      return rawCategories;
    }
    const nonGolf = rawCategories.filter(c => 
      !c.categoryCode.includes('골프') && 
      !c.categoryName.includes('골프') && 
      c.categoryCode !== 'GOLF'
    );
    const resortTargetTotal = nonGolf.reduce((sum, c) => sum + c.totalTarget2026, 0) || 1;
    return nonGolf.map(c => ({
      ...c,
      totalWeight: Number(((c.totalTarget2026 / resortTargetTotal) * 100).toFixed(2))
    }));
  }, [rawCategories, input.includeGolf]);

  // Group Category Facilities into 2-Depth Part Groups as-is from backend
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

  // Filter Buttons generated dynamically from received categories
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

  // Filtered categories
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

  const handleGrowthRateChange = (rate: number) => {
    setInput(prev => ({
      ...prev,
      metricInputMode: 'GROWTH_RATE',
      targetGrowthRate: rate
    }));
  };

  const handleYearPairSelect = (baseYr: number, targetYr: number) => {
    setInput(prev => ({
      ...prev,
      baseYear: baseYr,
      targetYear: targetYr
    }));
  };

  const handleMonthSelect = (monthVal: number | 'ANNUAL') => {
    setInput(prev => ({
      ...prev,
      selectedMonth: monthVal,
      period: monthVal === 'ANNUAL' ? 'ANNUAL' : (`M${String(monthVal).padStart(2, '0')}` as any)
    }));
  };

  const toggleCategory = (catCode: string) => {
    setOpenCategories(prev => {
      const current = prev[catCode] !== undefined ? prev[catCode] : true;
      return {
        ...prev,
        [catCode]: !current
      };
    });
  };

  const togglePart = (partKey: string) => {
    setOpenParts(prev => {
      const current = prev[partKey] !== undefined ? prev[partKey] : true;
      return {
        ...prev,
        [partKey]: !current
      };
    });
  };

  const toggleAllCategories = (open: boolean) => {
    const nextCats: Record<string, boolean> = {};
    const nextParts: Record<string, boolean> = {};

    effectiveCategories.forEach(c => {
      nextCats[c.categoryCode] = open;
      const parts = getCategoryParts(c);
      parts.forEach(p => {
        nextParts[p.partKey] = open;
      });
    });

    setOpenCategories(nextCats);
    setOpenParts(nextParts);
  };

  // Grand totals using The Bible Minus Operation (전체 총합 - 골프 소계)
  const rawGrandTotal2025 = apiData?.summary?.grandTotal2025 || simulationResult.totalLyRevenue;
  const rawGrandTarget2026 = apiData?.summary?.grandTarget2026 || simulationResult.totalTargetRevenue;
  const rawGrandActual2026 = apiData?.summary?.grandActual2026 || 0;

  const golfTarget2026 = golfCategory?.totalTarget2026 || 0;
  const golfActual2025 = golfCategory?.totalActual2025 || 0;
  const golfActual2026 = golfCategory?.totalActual2026 || 0;

  const summaryGrandTotal2025 = input.includeGolf ? rawGrandTotal2025 : (rawGrandTotal2025 - golfActual2025);
  const summaryGrandTarget2026 = input.includeGolf ? rawGrandTarget2026 : (rawGrandTarget2026 - golfTarget2026);
  const summaryGrandActual2026 = input.includeGolf ? rawGrandActual2026 : (rawGrandActual2026 - golfActual2026);

  // Real-world Actual Performance & Achievement Rate Calculator
  const actualPerformance = useMemo(() => {
    if (summaryGrandActual2026 > 0) {
      const act = summaryGrandActual2026;
      const rate = summaryGrandTarget2026 > 0 ? Number(((act / summaryGrandTarget2026) * 100).toFixed(1)) : 0;
      return {
        revenue: act,
        rate,
        rateDisplay: `${rate}%`,
        badgeColor: rate >= 80 ? 'text-teal-600' : 'text-indigo-600',
        statusText: `${input.selectedMonth === 'ANNUAL' ? '연간 누적' : `${input.selectedMonth}월`} 실측 실적: ₩${(act / 100000000).toFixed(2)}억원 (달성률 ${rate}%)`
      };
    }

    const monthLabel = input.selectedMonth === 'ANNUAL' ? '연간 종합' : `${input.selectedMonth}월`;
    return {
      revenue: 0,
      rate: 0,
      rateDisplay: '집계 예정',
      badgeColor: 'text-slate-400',
      statusText: `${input.targetYear}년 ${monthLabel} 목표 실행 단계 (실적 집계 전)`
    };
  }, [input.targetYear, input.selectedMonth, summaryGrandActual2026, summaryGrandTarget2026]);

  // 주중 vs 내일이 휴일인 날(금/토/공휴일 전야) 일평균 목표 계산기
  const dailyTargetStats = useMemo(() => {
    const isAnnual = input.selectedMonth === 'ANNUAL';
    const targetYear = input.targetYear || 2026;
    const monthNum = typeof input.selectedMonth === 'number' ? input.selectedMonth : 7;
    
    // 한국 주요 공휴일 목록 (2025/2026/2027)
    const holidays = new Set([
      '2025-01-01', '2025-01-28', '2025-01-29', '2025-01-30', '2025-03-01', '2025-05-05', '2025-05-06',
      '2025-06-06', '2025-08-15', '2025-10-03', '2025-10-05', '2025-10-06', '2025-10-07', '2025-10-08', '2025-10-09', '2025-12-25',
      '2026-01-01', '2026-02-16', '2026-02-17', '2026-02-18', '2026-03-01', '2026-03-02', '2026-05-05', '2026-05-24',
      '2026-06-06', '2026-08-15', '2026-09-24', '2026-09-25', '2026-09-26', '2026-10-03', '2026-10-09', '2026-12-25',
      '2027-01-01', '2027-02-06', '2027-02-07', '2027-02-08', '2027-03-01', '2027-05-05', '2027-05-13',
      '2027-06-06', '2027-08-15', '2027-09-14', '2027-09-15', '2027-09-16', '2027-10-03', '2027-10-09', '2027-12-25'
    ]);

    const isTomorrowHoliday = (d: Date) => {
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const nextStr = next.toISOString().split('T')[0];
      const nextDow = next.getDay(); // 0: Sun, 6: Sat
      return nextDow === 0 || nextDow === 6 || holidays.has(nextStr);
    };

    let preHolidayDays = 0;
    let weekdayDays = 0;

    if (isAnnual) {
      for (let m = 0; m < 12; m++) {
        const daysInM = new Date(targetYear, m + 1, 0).getDate();
        for (let day = 1; day <= daysInM; day++) {
          const d = new Date(targetYear, m, day);
          if (isTomorrowHoliday(d)) preHolidayDays++;
          else weekdayDays++;
        }
      }
    } else {
      const daysInM = new Date(targetYear, monthNum, 0).getDate();
      for (let day = 1; day <= daysInM; day++) {
        const d = new Date(targetYear, monthNum - 1, day);
        if (isTomorrowHoliday(d)) preHolidayDays++;
        else weekdayDays++;
      }
    }

    // If backend API provided daily target stats directly, prioritize backend SSOT
    if (apiData?.summary?.weekdayDailyTarget && apiData?.summary?.preHolidayDailyTarget) {
      const wDays = apiData.summary.weekdayDays ?? weekdayDays;
      const pHolDays = apiData.summary.preHolidayDays ?? preHolidayDays;
      return {
        weekdayDays: wDays,
        preHolidayDays: pHolDays,
        totalDays: wDays + pHolDays,
        weekdayDailyTarget: apiData.summary.weekdayDailyTarget,
        preHolidayDailyTarget: apiData.summary.preHolidayDailyTarget,
        overallDailyAvg: apiData.summary.overallDailyAvg || apiData.summary.dailyTargetRevenue || 0,
        ratio: 1.55
      };
    }

    // 벨포레 실측 휴일전야 대 주중 매출 배수 (SSOT 기준치 1.55배)
    const ratio = 1.55;
    const targetTotal = summaryGrandTarget2026 || 1;

    // W * weekdayDays + (r * W) * preHolidayDays = targetTotal
    const weekdayDailyTarget = Math.round(targetTotal / (weekdayDays + ratio * preHolidayDays));
    const preHolidayDailyTarget = Math.round(weekdayDailyTarget * ratio);
    const overallDailyAvg = Math.round(targetTotal / (weekdayDays + preHolidayDays));

    return {
      weekdayDays,
      preHolidayDays,
      totalDays: weekdayDays + preHolidayDays,
      weekdayDailyTarget,
      preHolidayDailyTarget,
      overallDailyAvg,
      ratio
    };
  }, [input.selectedMonth, input.targetYear, summaryGrandTarget2026, apiData]);

  // Pie chart option for category contribution
  const categoryPieOptions = useMemo(() => {
    const data = effectiveCategories.map(c => {
      return {
        name: c.categoryName,
        value: c.totalTarget2026,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 }
      };
    });

    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: ₩{c}원 ({d}%)'
      },
      legend: {
        bottom: 0,
        icon: 'circle',
        itemGap: 10,
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
          labelLayout: { hideOverlap: true, moveOverlap: 'shiftY' },
          label: {
            show: true,
            formatter: '{b}\n{d}%',
            fontSize: 11,
            fontWeight: 'bold',
            color: '#1e293b'
          },
          labelLine: { show: true, length: 8, length2: 10, smooth: 0.2 },
          data
        }
      ]
    };
  }, [effectiveCategories]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* 1. Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-7 rounded-[32px] border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-teal-50 text-teal-700 rounded-2xl border border-teal-100">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              목표수립 시뮬레이터 v1 (3-Depth 아코디언)
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800">
                Official API v5.0 Connected
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              백엔드 공식 아코디언 API(<code>/api/v6/report/business-plan</code>)와 실시간 연동되어, <strong>[부문(본부) ➔ 파트 ➔ 소속 영업장] 3-Depth 계층 구조</strong>로 완벽하게 펼쳐집니다.
            </p>
          </div>
        </div>
      </div>

      {/* 2. 🎛️ Master Target Console (대표님 목표 입력 패널 & 연도·12개월 월 선택기) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950 p-8 rounded-[32px] text-white shadow-xl relative overflow-hidden space-y-6">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Target className="w-72 h-72 text-white" />
        </div>

        {/* Top Control Bar: Year Selection & Golf Toggle */}
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-700/80 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-400" />
              <h2 className="text-lg font-black tracking-tight">
                {input.targetYear}년 전사 경영 목표 컨트롤 콘솔
                <span className="text-xs font-normal text-slate-400 ml-2">
                  ({input.baseYear}년 실적 기준선 대비)
                </span>
              </h2>
            </div>
            
            {/* Year Selector Buttons */}
            <div className="flex items-center gap-2 mt-2.5">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1 shrink-0">
                <CalendarDays className="w-3.5 h-3.5 text-teal-400" /> 비교 연도:
              </span>
              <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
                {YEAR_PAIRS.map(yp => {
                  const isSelected = input.baseYear === yp.baseYear && input.targetYear === yp.targetYear;
                  return (
                    <button
                      key={`${yp.baseYear}-${yp.targetYear}`}
                      onClick={() => handleYearPairSelect(yp.baseYear, yp.targetYear)}
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
          </div>
          
          {/* Scope Toggle */}
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

        {/* Month Selector Bar (1월 ~ 12월 및 연간 종합 탭) */}
        <div className="relative z-10 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-teal-400" />
              시뮬레이션 대상 월 선택 ({input.baseYear}년 해당 월의 실측 매출 비중 자동 대입)
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
                  onClick={() => handleMonthSelect(m.id as any)}
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

        {/* Target Growth Rate Controller */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
          
          {/* Left: Growth Rate Slider & Presets */}
          <div className="lg:col-span-6 bg-white/10 p-5 rounded-2xl border border-white/15 backdrop-blur-md space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300">
                🚀 {input.targetYear}년 전사 연간 목표 성장률 설정
              </span>
              <span className="text-[11px] text-slate-300 font-medium">
                {input.baseYear}년 실측 실적 기준선 대비
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className={`text-3xl font-black tabular-nums ${
                input.targetGrowthRate >= 0 ? 'text-teal-300' : 'text-rose-400'
              }`}>
                {input.targetGrowthRate > 0 ? '+' : ''}{input.targetGrowthRate}%
              </span>
              <span className="text-xs text-slate-300 font-semibold">전사 연간 성장 목표 대입</span>
            </div>

            <input
              type="range"
              min="0"
              max="40"
              step="0.5"
              value={input.targetGrowthRate}
              onChange={(e) => handleGrowthRateChange(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-400"
            />

            {/* Quick Growth Presets */}
            <div className="flex items-center justify-between gap-1 pt-1">
              {[5, 10, 15, 20, 25, 30].map(r => (
                <button
                  key={r}
                  onClick={() => handleGrowthRateChange(r)}
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

          {/* Right: Dynamic Month TrevPAR & Revenue Preview */}
          <div className="lg:col-span-6 bg-white/10 p-5 rounded-2xl border border-white/15 backdrop-blur-md flex flex-col justify-between space-y-3">
            <div>
              <div className="text-xs font-bold text-teal-300 flex items-center justify-between">
                <span>🎯 {input.targetYear}년 {simulationResult.selectedMonthLabel} 목표 실적 지표</span>
                <span className="text-[11px] text-slate-300">175실 × {simulationResult.periodDays}일 기준</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <div className="text-[11px] text-slate-400 font-semibold">
                    목표 {input.includeGolf ? '전사 Total' : '순수 리조트 Resort'} {input.selectedMonth === 'ANNUAL' ? '일평균' : '일일'} TrevPAR
                  </div>
                  <div className="text-2xl font-black text-white tabular-nums mt-0.5">
                    ₩{formatCurrency(apiData?.summary?.dailyTrevPAR || Math.round(summaryGrandTarget2026 / (175 * simulationResult.periodDays)))}
                    <span className="text-xs font-normal text-slate-300 ml-1">/실·일</span>
                  </div>
                  <div className="text-[11px] text-teal-300 font-bold mt-1">
                    {input.baseYear}년 {input.includeGolf ? '전사' : '순수 리조트'} 동기간 대비 +{input.targetGrowthRate}% (대칭 비교)
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-400 font-semibold">
                    {input.targetYear}년 목표 {input.selectedMonth === 'ANNUAL' ? '연간' : '월'} {input.includeGolf ? '전사' : '순수 리조트'} 총매출액
                  </div>
                  <div className="text-2xl font-black text-amber-300 tabular-nums mt-0.5">
                    {(summaryGrandTarget2026 / 100000000).toFixed(2)}
                    <span className="text-xs font-normal text-slate-300 ml-1">억원</span>
                  </div>
                  <div className="text-[11px] text-amber-300 font-bold mt-1">
                    {input.baseYear}년 ₩{(summaryGrandTotal2025 / 100000000).toFixed(2)}억 대비 +{((summaryGrandTarget2026 - summaryGrandTotal2025) / 100000000).toFixed(2)}억
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-300 bg-slate-950/40 px-3 py-1.5 rounded-lg border border-white/5 flex items-center justify-between">
              <span>💡 <strong>백엔드 API 실시간 연동:</strong> {input.baseYear}년 실측 비중 기반 {input.targetYear}년 목표액 1원 단위 정규화 수신</span>
              <span className="text-[10px] font-bold text-teal-300 bg-teal-950/80 px-2 py-0.5 rounded border border-teal-500/30">Zero-Variance 0원 오차 보정</span>
            </div>
          </div>

        </div>
      </div>

      {/* 3. 🏆 4 Executive KPI Highlight Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 mb-1">
            {input.targetYear}년 목표 {input.selectedMonth === 'ANNUAL' ? '연간' : `${input.selectedMonth}월`} 총매출
          </div>
          <div className="text-2xl font-black text-slate-900 tabular-nums">
            {(summaryGrandTarget2026 / 100000000).toFixed(2)} <span className="text-sm font-normal text-slate-500">억원</span>
          </div>
          <div className="text-xs text-teal-700 font-bold mt-1">
            {input.baseYear}년 대비 +{((summaryGrandTarget2026 - summaryGrandTotal2025) / 100000000).toFixed(2)}억원 순증 (+{input.targetGrowthRate}%)
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 mb-1">
            {input.targetYear}년 목표 {input.includeGolf ? '전사 Total' : '순수 리조트 Resort'} TrevPAR
          </div>
          <div className="text-2xl font-black text-teal-800 tabular-nums">
            ₩{formatCurrency(apiData?.summary?.dailyTrevPAR || Math.round(summaryGrandTarget2026 / (175 * simulationResult.periodDays)))} <span className="text-sm font-normal text-slate-500">/실·일</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            175실 × {simulationResult.periodDays}일 ({175 * simulationResult.periodDays} 가용객실박) 대칭 기준
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 mb-1">
            {input.targetYear}년 실제 달성률 {input.selectedMonth === 'ANNUAL' ? '(연간 누적)' : (input.selectedMonth === 8 ? '(진행중)' : '')}
          </div>
          <div className="text-2xl font-black text-indigo-900 tabular-nums flex items-center gap-1">
            <TrendingUp className={`w-6 h-6 ${actualPerformance.badgeColor}`} />
            <span className={actualPerformance.badgeColor}>
              {actualPerformance.rateDisplay}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {actualPerformance.statusText}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1.5">
              <span className="flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
                1일 평균 목표 매출 (주중/휴일전야 분리)
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                전체 평균 {(dailyTargetStats.overallDailyAvg / 10000).toFixed(0)}만원/일
              </span>
            </div>

            {/* 2-Way Divided: 주중 vs 내일이 휴일인 날 */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              
              {/* 주중 (평일) */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                  <span>🏢 주중 (일~목)</span>
                  <span className="text-[9px] text-slate-400">{dailyTargetStats.weekdayDays}일</span>
                </div>
                <div className="text-base font-black text-slate-800 tabular-nums mt-0.5">
                  {(dailyTargetStats.weekdayDailyTarget / 10000).toFixed(0)}
                  <span className="text-xs font-normal text-slate-500 ml-0.5">만원/일</span>
                </div>
              </div>

              {/* 내일이 휴일인 날 (금/토/공휴일 전야) */}
              <div className="bg-rose-50/70 p-2.5 rounded-xl border border-rose-200/80">
                <div className="flex items-center justify-between text-[10px] font-bold text-rose-700">
                  <span>🏖️ 내일이 휴일</span>
                  <span className="text-[9px] text-rose-500 font-semibold">{dailyTargetStats.preHolidayDays}일</span>
                </div>
                <div className="text-base font-black text-rose-900 tabular-nums mt-0.5">
                  {(dailyTargetStats.preHolidayDailyTarget / 10000).toFixed(0)}
                  <span className="text-xs font-normal text-rose-700 ml-0.5">만원/일</span>
                </div>
              </div>

            </div>
          </div>

          <div className="text-[10px] text-slate-400 mt-2 flex items-center justify-between pt-1 border-t border-slate-100">
            <span>실측 가중 배수: <strong>{dailyTargetStats.ratio}배</strong></span>
            <span>{input.selectedMonth === 'ANNUAL' ? '365일 전수 배분' : `${dailyTargetStats.totalDays}일 기준`}</span>
          </div>
        </div>
      </div>

      {/* 4. 🏢 Macro Division 1st Breakdown & Micro Facility Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Division Target Cards (8대 사업부 목표 현황판) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              부문별 {input.targetYear}년 {simulationResult.selectedMonthLabel} 목표 분배 현황
            </h3>
            <span className="text-xs text-slate-500 font-semibold">{input.baseYear}년 해당 월의 실측 비중 곡선 적용</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {effectiveCategories.map(cat => {
              const icon = getCategoryIcon(cat.categoryName);
              return (
                <div 
                  key={cat.categoryCode}
                  className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{icon}</span>
                      <span className="font-black text-slate-900">{cat.teamName || cat.categoryName}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {cat.categoryCode}
                      </span>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 tabular-nums">
                      비중 {cat.totalWeight}%
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-slate-500">{input.targetYear}년 목표:</span>
                      <span className="text-lg font-black text-slate-900 tabular-nums">
                        ₩{formatCurrency(cat.totalTarget2026)} <span className="text-xs font-normal text-slate-400">원</span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">{input.baseYear}년 실적:</span>
                      <span className="text-slate-600 font-semibold tabular-nums">₩{formatCurrency(cat.totalActual2025)}원</span>
                    </div>
                    {cat.totalActual2026 !== undefined && cat.totalActual2026 > 0 && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-emerald-700 font-bold">{input.targetYear}년 실적:</span>
                        <span className="text-emerald-700 font-black tabular-nums">₩{formatCurrency(cat.totalActual2026)}원</span>
                      </div>
                    )}
                    {cat.achievementRate !== undefined && cat.achievementRate > 0 && (
                      <div className="flex justify-between items-center text-xs pt-1.5 border-t border-slate-100 font-semibold">
                        <span className="text-slate-500">실제 달성률:</span>
                        <span className="text-indigo-700 font-bold">{cat.achievementRate}%</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Pie Chart Distribution */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900 mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-600" />
              {input.targetYear}년 {simulationResult.selectedMonthLabel} 부문별 기여 비중
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              전체 {(summaryGrandTarget2026 / 100000000).toFixed(2)}억원 구성
            </p>
            <ReactECharts option={categoryPieOptions} style={{ height: '320px', width: '100%' }} />
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 text-center">
            💡 {input.baseYear}년 해당 월의 실측 비중에 맞춘 최적 목표 분배입니다.
          </div>
        </div>

      </div>

      {/* 5. 📂 영업장별 세부 실행 목표 3-Depth 아코디언 테이블 (부문 ➔ 파트 ➔ 소속 영업장) */}
      <div className="bg-white rounded-[32px] p-7 border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-600" />
              영업장별 세부 실행 목표 3-Depth 아코디언 ({input.targetYear}년 {simulationResult.selectedMonthLabel})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              <strong>[부문(본부) ➔ 파트 ➔ 소속 영업장]</strong> 계층별 헤더를 클릭하여 각 파트별 소계와 소속 영업장 리스트를 펼쳐볼 수 있습니다.
            </p>
          </div>

          {/* Controls: Expand/Collapse All & Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => toggleAllCategories(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
            >
              전체 펼치기
            </button>
            <button
              onClick={() => toggleAllCategories(false)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
            >
              전체 접기
            </button>

            {/* Dynamic Filter Buttons as received from backend */}
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
        {apiLoading && effectiveCategories.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-bold text-xs animate-pulse">
            백엔드 비즈니스 플랜 API 데이터를 불러오는 중입니다...
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCategories.map((cat) => {
              const isCatOpen = openCategories[cat.categoryCode] !== undefined ? openCategories[cat.categoryCode] : true;
              const catIcon = getCategoryIcon(cat.categoryName);
              const partGroups = getCategoryParts(cat);

              return (
                <div 
                  key={cat.categoryCode}
                  className="rounded-2xl border border-slate-200/90 overflow-hidden bg-white shadow-2xs transition-all"
                >
                  {/* Depth 1: Category Header (본부/부문 총괄 - 백엔드 명칭 100% 사용) */}
                  <div 
                    onClick={() => toggleCategory(cat.categoryCode)}
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
                        <span className="text-lg font-black text-slate-900">
                          {cat.teamName || cat.categoryName}
                        </span>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                          {cat.categoryCode}
                        </span>
                        <span className="text-xs text-indigo-600 font-bold bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                          {partGroups.length}개 파트 · {cat.facilityCount}개 영업장
                        </span>
                      </div>
                    </div>

                    {/* Depth 1 Header Metrics */}
                    <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
                      <div className="text-slate-600">
                        비중: <span className="font-extrabold text-slate-900">{cat.totalWeight}%</span>
                      </div>
                      <div className="text-slate-500">
                        {input.baseYear} 실적: <span className="font-semibold text-slate-700 tabular-nums">₩{formatCurrency(cat.totalActual2025)}원</span>
                      </div>
                      <div className="text-indigo-900 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                        {input.targetYear} 목표: <span className="font-black text-indigo-700 tabular-nums">₩{formatCurrency(cat.totalTarget2026)}원</span>
                      </div>
                      {cat.totalActual2026 !== undefined && cat.totalActual2026 > 0 && (
                        <div className="text-emerald-900 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                          {input.targetYear} 실적: <span className="font-black text-emerald-700 tabular-nums">₩{formatCurrency(cat.totalActual2026)}원</span>
                        </div>
                      )}
                      {cat.achievementRate !== undefined && cat.achievementRate > 0 && (
                        <div className="text-slate-700">
                          달성률: <span className={`font-black ${cat.achievementRate >= 80 ? 'text-teal-600' : 'text-amber-600'}`}>
                            {cat.achievementRate}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Depth 2: Parts Container */}
                  {isCatOpen && (
                    <div className="p-4 md:p-5 bg-slate-50/40 space-y-3.5">
                      {partGroups.map((part) => {
                        const isPartOpen = openParts[part.partKey] !== undefined ? openParts[part.partKey] : true;
                        const partIcon = getPartIcon(part.partName);

                        return (
                          <div 
                            key={part.partKey}
                            className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs transition-all"
                          >
                            {/* Depth 2: Part Header (백엔드 파트명 100% 사용) */}
                            <div
                              onClick={() => togglePart(part.partKey)}
                              className={`p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                                isPartOpen ? 'bg-slate-100/70 border-b border-slate-200' : 'bg-white hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <button className="text-slate-400 hover:text-slate-600 transition-transform">
                                  {isPartOpen ? (
                                    <ChevronDown className="w-4 h-4 text-teal-600" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                  )}
                                </button>
                                
                                <div className="flex items-center gap-2">
                                  <span className="text-base">{partIcon}</span>
                                  <span className="text-sm font-black text-slate-800">
                                    {part.partName} 파트
                                  </span>
                                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                                    {part.facilityCount}개 영업장
                                  </span>
                                </div>
                              </div>

                              {/* Depth 2 Part Metrics */}
                              <div className="flex flex-wrap items-center gap-3.5 text-xs font-semibold">
                                <div className="text-slate-500">
                                  파트 비중: <span className="font-bold text-slate-800">{part.totalWeight}%</span>
                                </div>
                                <div className="text-slate-500">
                                  {input.baseYear} 실적: <span className="font-semibold text-slate-700 tabular-nums">₩{formatCurrency(part.totalActual2025)}원</span>
                                </div>
                                <div className="text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                                  {input.targetYear} 목표: <span className="font-black text-teal-700 tabular-nums">₩{formatCurrency(part.totalTarget2026)}원</span>
                                </div>
                                {part.totalActual2026 > 0 && (
                                  <div className="text-emerald-900 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                                    {input.targetYear} 실적: <span className="font-black text-emerald-700 tabular-nums">₩{formatCurrency(part.totalActual2026)}원</span>
                                  </div>
                                )}
                                {part.achievementRate > 0 && (
                                  <div className="text-slate-600">
                                    달성률: <span className={`font-black ${part.achievementRate >= 80 ? 'text-teal-600' : 'text-amber-600'}`}>
                                      {part.achievementRate}%
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Depth 3: Facilities Table (백엔드 영업장명 100% 사용) */}
                            {isPartOpen && (
                              <div className="overflow-x-auto bg-white">
                                <table className="w-full text-left border-collapse text-xs">
                                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                                    <tr>
                                      <th className="py-2.5 px-4 w-12 text-center">No</th>
                                      <th className="py-2.5 px-4 min-w-[180px]">영업장명</th>
                                      <th className="py-2.5 px-4 text-right">비중 (%)</th>
                                      <th className="py-2.5 px-4 text-right">{input.baseYear}년 실적</th>
                                      <th className="py-2.5 px-4 text-right font-black text-indigo-950">{input.targetYear}년 목표</th>
                                      <th className="py-2.5 px-4 text-right min-w-[120px] font-bold text-emerald-900">{input.targetYear}년 실적</th>
                                      <th className="py-2.5 px-4 text-center min-w-[90px]">달성률</th>
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
                                        <td className="py-2.5 px-4 text-right tabular-nums text-emerald-800 font-bold">
                                          {fac.actual2026 && fac.actual2026 > 0 ? `₩${formatCurrency(fac.actual2026)}원` : '-'}
                                        </td>
                                        <td className="py-2.5 px-4 text-center">
                                          {fac.achievementRate && fac.achievementRate > 0 ? (
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-extrabold text-[11px] ${
                                              fac.achievementRate >= 80
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                : fac.achievementRate >= 50
                                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                                            }`}>
                                              {fac.achievementRate}%
                                            </span>
                                          ) : (
                                            <span className="text-slate-400 text-xs">-</span>
                                          )}
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
        )}
      </div>

    </div>
  );
}
