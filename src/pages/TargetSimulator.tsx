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

const CATEGORY_META: Record<string, { icon: string; color: string; bg: string; border: string; text: string }> = {
  ROOM: { icon: '🏨', color: '#1E3A8A', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900' },
  GOLF: { icon: '⛳', color: '#9333EA', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900' },
  FNB: { icon: '🍽️', color: '#16A34A', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900' },
  TICKET: { icon: '🎢', color: '#EAB308', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900' },
  LEISURE: { icon: '🎢', color: '#EAB308', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900' },
  MOTO: { icon: '🏎️', color: '#E11D48', bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-900' },
  BANQUET: { icon: '🏛️', color: '#0891B2', bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-900' },
  PARKING: { icon: '🅿️', color: '#64748B', bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-900' },
  ETC: { icon: '📦', color: '#6366F1', bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-900' },
  OTHER: { icon: '📦', color: '#64748B', bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-900' }
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
  targetMonth: string;
  baseMonth: string;
  growthRateTarget: number;
  grandTotal2025: number;
  grandTarget2026: number;
  grandActual2026?: number;
  overallAchievementRate?: number;
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
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

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
        const monthStr = typeof input.selectedMonth === 'number' 
          ? String(input.selectedMonth).padStart(2, '0') 
          : '07';
        const dateParam = `${input.targetYear}-${monthStr}-15`;
        const res = await secureFetcher(
          `${API_BASE}/api/v5/report/business-plan?date=${dateParam}&growthRate=${input.targetGrowthRate}`
        ) as { success: boolean; data: { summary: ApiSummary; categories: ApiCategory[] } };

        if (isMounted && res?.data?.categories && res.data.categories.length > 0) {
          setApiData(res.data);
          const initialOpen: Record<string, boolean> = {};
          res.data.categories.forEach((c: ApiCategory) => {
            initialOpen[c.categoryCode] = true;
          });
          setOpenCategories(initialOpen);
        }
      } catch (err) {
        console.warn('Business Plan API fetch warning, fallback to engine:', err);
      } finally {
        if (isMounted) setApiLoading(false);
      }
    };

    fetchBusinessPlan();
    return () => { isMounted = false; };
  }, [input.selectedMonth, input.targetGrowthRate, input.targetYear, input.baseYear]);

  // Effective categories: API 1순위, Simulation Engine 2순위 Fallback (100% 무중단 보장)
  const effectiveCategories: ApiCategory[] = useMemo(() => {
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

  // Filtered categories
  const filteredCategories = useMemo(() => {
    if (selectedCategoryFilter === 'ALL') return effectiveCategories;
    return effectiveCategories.filter(c => {
      const code = c.categoryCode?.toUpperCase() || '';
      const name = c.categoryName || '';
      const filter = selectedCategoryFilter.toUpperCase();

      if (code === filter || name.includes(filter)) return true;
      if (filter === 'ROOM' && (code === 'ROOM' || name.includes('객실') || name.includes('콘도'))) return true;
      if (filter === 'GOLF' && (code === 'GOLF' || name.includes('골프'))) return true;
      if (filter === 'FNB' && (code === 'FNB' || name.includes('식음'))) return true;
      if (filter === 'TICKET' && (code === 'TICKET' || code === 'LEISURE' || name.includes('레저'))) return true;
      if (filter === 'MOTO' && (code === 'MOTO' || name.includes('모토'))) return true;
      if (filter === 'BANQUET' && (code === 'BANQUET' || name.includes('대관') || name.includes('연회'))) return true;
      if (filter === 'PARKING' && (code === 'PARKING' || name.includes('주차'))) return true;
      if (filter === 'ETC' && (code === 'ETC' || code === 'OTHER' || name.includes('임대') || name.includes('기타'))) return true;
      return false;
    });
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

  const toggleAllCategories = (open: boolean) => {
    const next: Record<string, boolean> = {};
    effectiveCategories.forEach(c => {
      next[c.categoryCode] = open;
    });
    setOpenCategories(next);
  };

  // Grand totals from API or fallback
  const summaryGrandTotal2025 = apiData?.summary?.grandTotal2025 || simulationResult.totalLyRevenue;
  const summaryGrandTarget2026 = apiData?.summary?.grandTarget2026 || simulationResult.totalTargetRevenue;
  const summaryGrandActual2026 = apiData?.summary?.grandActual2026 || 0;
  const summaryOverallAchievement = apiData?.summary?.overallAchievementRate || 0;

  // Pie chart option for category contribution
  const categoryPieOptions = useMemo(() => {
    const data = effectiveCategories.map(c => {
      const meta = CATEGORY_META[c.categoryCode] || CATEGORY_META.OTHER;
      return {
        name: c.categoryName,
        value: c.totalTarget2026,
        itemStyle: { color: meta.color, borderRadius: 6, borderColor: '#fff', borderWidth: 2 }
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
              영업장별 세부 실행 목표 아코디언 시뮬레이터
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800">
                Official API v5.0 Connected
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              백엔드 공식 아코디언 API(<code>/api/v5/report/business-plan</code>)와 실시간 연동되어, <strong>부문별 2-Depth 계층 구조 및 영업장별 실측 비중</strong>을 1원 단위로 표출합니다.
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
                  <div className="text-[11px] text-slate-400 font-semibold">목표 월 TrevPAR</div>
                  <div className="text-2xl font-black text-white tabular-nums mt-0.5">
                    ₩{formatCurrency(Math.round(summaryGrandTarget2026 / (175 * simulationResult.periodDays)))}
                    <span className="text-xs font-normal text-slate-300 ml-1">/실·월</span>
                  </div>
                  <div className="text-[11px] text-teal-300 font-bold mt-1">
                    {input.baseYear}년 동월 ₩{formatCurrency(Math.round(summaryGrandTotal2025 / (175 * simulationResult.periodDays)))} 대비 +{input.targetGrowthRate}%
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-400 font-semibold">
                    {input.targetYear}년 목표 {input.selectedMonth === 'ANNUAL' ? '연간' : '월'} 총매출액
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

            <div className="text-[11px] text-slate-300 bg-slate-950/40 px-3 py-1.5 rounded-lg border border-white/5">
              💡 <strong>백엔드 API 실시간 연동:</strong> <code>/api/v5/report/business-plan</code>에서 {input.baseYear}년 실측 비중에 맞춘 {input.targetYear}년 목표액을 1원 단위로 즉시 수신합니다.
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
            {input.targetYear}년 목표 {input.selectedMonth === 'ANNUAL' ? '월평균' : `${input.selectedMonth}월`} TrevPAR
          </div>
          <div className="text-2xl font-black text-teal-800 tabular-nums">
            ₩{formatCurrency(Math.round(summaryGrandTarget2026 / (175 * simulationResult.periodDays)))} <span className="text-sm font-normal text-slate-500">/실·월</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">175실 보유 인프라 1실당 생산성</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 mb-1">
            {input.targetYear}년 실제 달성률 (진행중)
          </div>
          <div className="text-2xl font-black text-indigo-900 tabular-nums flex items-center gap-1">
            <TrendingUp className="w-6 h-6 text-teal-600" />
            {summaryOverallAchievement > 0 ? `${summaryOverallAchievement}%` : '집계중'}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            실제 누적 매출: ₩{(summaryGrandActual2026 / 100000000).toFixed(2)}억원
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 mb-1">1일 평균 목표 매출</div>
          <div className="text-2xl font-black text-slate-900 tabular-nums flex items-center gap-1">
            <DollarSign className="w-6 h-6 text-indigo-600" />
            {(summaryGrandTarget2026 / simulationResult.periodDays / 10000).toFixed(0)} <span className="text-sm font-normal text-slate-500">만원/일</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">{simulationResult.periodDays}일 기준 일평균 목표</div>
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
              const meta = CATEGORY_META[cat.categoryCode] || CATEGORY_META.OTHER;
              return (
                <div 
                  key={cat.categoryCode}
                  className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{meta.icon}</span>
                      <span className="font-bold text-slate-900">{cat.categoryName}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {cat.teamName}
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

      {/* 5. 📂 영업장별 세부 실행 목표 2-Depth 아코디언 테이블 */}
      <div className="bg-white rounded-[32px] p-7 border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-600" />
              영업장별 세부 실행 목표 아코디언 ({input.targetYear}년 {simulationResult.selectedMonthLabel})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              부문별 헤더를 클릭하여 소속 영업장들의 세부 실적, 목표액, 달성률을 펼쳐볼 수 있습니다.
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

            {/* Filter Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs overflow-x-auto">
              {[
                { id: 'ALL', label: '전체' },
                { id: 'ROOM', label: '🏨 객실' },
                { id: 'GOLF', label: '⛳ 골프' },
                { id: 'FNB', label: '🍽️ 식음' },
                { id: 'TICKET', label: '🎢 레저' },
                { id: 'MOTO', label: '🏎️ 모토' },
                { id: 'BANQUET', label: '🏛️ 대관' },
                { id: 'PARKING', label: '🅿️ 주차' },
                { id: 'ETC', label: '📦 임대' }
              ].map(cat => (
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

        {/* Accordion List */}
        {apiLoading && effectiveCategories.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-bold text-xs animate-pulse">
            백엔드 비즈니스 플랜 API 데이터를 불러오는 중입니다...
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCategories.map((cat) => {
              const isOpen = openCategories[cat.categoryCode] !== undefined ? openCategories[cat.categoryCode] : true;
              const meta = CATEGORY_META[cat.categoryCode] || CATEGORY_META.OTHER;

              return (
                <div 
                  key={cat.categoryCode}
                  className="rounded-2xl border border-slate-200/90 overflow-hidden bg-white shadow-2xs transition-all"
                >
                  {/* Category Header (소계) */}
                  <div 
                    onClick={() => toggleCategory(cat.categoryCode)}
                    className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                      isOpen ? 'bg-slate-50/90 border-b border-slate-200/70' : 'bg-white hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button className="text-slate-400 hover:text-slate-600 transition-transform">
                        {isOpen ? (
                          <ChevronDown className="w-5 h-5 text-indigo-600" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        )}
                      </button>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{meta.icon}</span>
                        <span className="text-base font-black text-slate-900">
                          {cat.categoryName}
                        </span>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                          {cat.teamName}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          ({cat.facilityCount}개 영업장)
                        </span>
                      </div>
                    </div>

                    {/* Header Metrics */}
                    <div className="flex flex-wrap items-center gap-5 text-xs font-bold">
                      <div className="text-slate-600">
                        비중: <span className="font-extrabold text-slate-900">{cat.totalWeight}%</span>
                      </div>
                      <div className="text-slate-500">
                        {input.baseYear} 실적: <span className="font-semibold text-slate-700 tabular-nums">₩{formatCurrency(cat.totalActual2025)}원</span>
                      </div>
                      <div className="text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                        {input.targetYear} 목표: <span className="font-black text-indigo-700 tabular-nums">₩{formatCurrency(cat.totalTarget2026)}원</span>
                      </div>
                      {cat.achievementRate !== undefined && cat.achievementRate > 0 && (
                        <div className="text-slate-700">
                          달성률: <span className={`font-black ${cat.achievementRate >= 80 ? 'text-teal-600' : 'text-amber-600'}`}>
                            {cat.achievementRate}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Accordion Body: Facilities Table */}
                  {isOpen && (
                    <div className="overflow-x-auto bg-white">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-50/60 text-slate-600 font-bold border-b border-slate-100">
                          <tr>
                            <th className="py-3 px-4 w-12 text-center">No</th>
                            <th className="py-3 px-4 min-w-[180px]">영업장명</th>
                            <th className="py-3 px-4 min-w-[120px]">파트</th>
                            <th className="py-3 px-4 text-right">비중 (%)</th>
                            <th className="py-3 px-4 text-right">{input.baseYear}년 실적</th>
                            <th className="py-3 px-4 text-right font-black text-indigo-950">{input.targetYear}년 목표</th>
                            <th className="py-3 px-4 text-right min-w-[110px]">{input.targetYear}년 누적 실적</th>
                            <th className="py-3 px-4 text-center min-w-[90px]">달성률</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800">
                          {cat.facilities.map((fac) => (
                            <tr key={`${fac.categoryCode}-${fac.facilityName}`} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4 text-center font-bold text-slate-400">
                                {fac.no}
                              </td>
                              <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                                {fac.facilityName}
                              </td>
                              <td className="py-3 px-4 text-slate-500 font-medium">
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-[11px] text-slate-600">
                                  {fac.partName || '-'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right tabular-nums text-slate-500 font-semibold">
                                {fac.weight}%
                              </td>
                              <td className="py-3 px-4 text-right tabular-nums text-slate-600">
                                ₩{formatCurrency(fac.actual2025)}원
                              </td>
                              <td className="py-3 px-4 text-right tabular-nums font-black text-indigo-950 bg-indigo-50/30 text-sm">
                                ₩{formatCurrency(fac.target2026)}원
                              </td>
                              <td className="py-3 px-4 text-right tabular-nums text-slate-700 font-semibold">
                                {fac.actual2026 && fac.actual2026 > 0 ? `₩${formatCurrency(fac.actual2026)}원` : '-'}
                              </td>
                              <td className="py-3 px-4 text-center">
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

    </div>
  );
}
