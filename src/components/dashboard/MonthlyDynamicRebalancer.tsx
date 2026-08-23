import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Sparkles, Lock, Unlock, RotateCcw, AlertTriangle, 
  CheckCircle2, Sliders, BarChart2
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { MULTI_YEAR_SEASONALITY_DATA } from '../../data/monthlySeasonalityData';

interface MonthlyDynamicRebalancerProps {
  annualBaseRevenue: number;
  annualTargetRevenue: number;
  annualGrowthRate: number;
  targetYear: number;
  baseYear: number;
  includeGolf: boolean;
  onMonthlyTargetsChange?: (targets: Record<number, number>) => void;
}

interface MonthMeta {
  month: number;
  label: string;
  seasonTag: string;
  isPeak: boolean;
  estimatedOcc: number; // 0.0 ~ 1.0
  headroom: number;    // 1 - estimatedOcc
  baseRevenue: number;
}

const MONTH_DEFINITIONS: Omit<MonthMeta, 'baseRevenue'>[] = [
  { month: 1, label: '1월', seasonTag: '겨울 비수기', isPeak: false, estimatedOcc: 0.35, headroom: 0.65 },
  { month: 2, label: '2월', seasonTag: '겨울 비수기', isPeak: false, estimatedOcc: 0.38, headroom: 0.62 },
  { month: 3, label: '3월', seasonTag: '봄 개장 시즌', isPeak: false, estimatedOcc: 0.55, headroom: 0.45 },
  { month: 4, label: '4월', seasonTag: '봄 성수기', isPeak: false, estimatedOcc: 0.75, headroom: 0.25 },
  { month: 5, label: '5월', seasonTag: '가정의달 피크', isPeak: true, estimatedOcc: 0.95, headroom: 0.05 },
  { month: 6, label: '6월', seasonTag: '초여름 시즌', isPeak: false, estimatedOcc: 0.70, headroom: 0.30 },
  { month: 7, label: '7월', seasonTag: '여름 방학/워터파크', isPeak: true, estimatedOcc: 0.88, headroom: 0.12 },
  { month: 8, label: '8월', seasonTag: '바캉스 극성수기', isPeak: true, estimatedOcc: 0.96, headroom: 0.04 },
  { month: 9, label: '9월', seasonTag: '가을 성수기', isPeak: false, estimatedOcc: 0.78, headroom: 0.22 },
  { month: 10, label: '10월', seasonTag: '단풍/골프 피크', isPeak: true, estimatedOcc: 0.97, headroom: 0.03 },
  { month: 11, label: '11월', seasonTag: '늦가을 시즌', isPeak: false, estimatedOcc: 0.58, headroom: 0.42 },
  { month: 12, label: '12월', seasonTag: '연말/겨울 시즌', isPeak: false, estimatedOcc: 0.48, headroom: 0.52 }
];

export default function MonthlyDynamicRebalancer({
  annualBaseRevenue,
  annualTargetRevenue,
  annualGrowthRate,
  targetYear,
  baseYear,
  includeGolf,
  onMonthlyTargetsChange
}: MonthlyDynamicRebalancerProps) {
  
  // 1. Build Base Monthly Revenue Profile from 2025 Seasonality Data
  const monthlyMetaList: MonthMeta[] = useMemo(() => {
    const yData = MULTI_YEAR_SEASONALITY_DATA[2025];

    return MONTH_DEFINITIONS.map(def => {
      const rawMonthRev = yData?.months?.[def.month]?.totalRevenue || Math.round(annualBaseRevenue / 12);
      const adjustedBaseRev = Math.round(rawMonthRev * (includeGolf ? 1.0 : (1 - (yData?.months?.[def.month]?.divisionShares?.GOLF ?? 0))));
      return {
        ...def,
        baseRevenue: adjustedBaseRev
      };
    });
  }, [annualBaseRevenue, includeGolf]);

  // 2. Lock State per month
  const [lockedMonths, setLockedMonths] = useState<Record<number, boolean>>({
    5: false,
    8: false,
    10: false
  });

  // 3. Custom Growth Rates per month (-10% ~ +40%)
  const [growthRates, setGrowthRates] = useState<Record<number, number>>(() => {
    const initial: Record<number, number> = {};
    for (let m = 1; m <= 12; m++) {
      initial[m] = annualGrowthRate;
    }
    return initial;
  });

  // Reset all months to annual average when annualGrowthRate changes
  useEffect(() => {
    setGrowthRates(prev => {
      const updated: Record<number, number> = {};
      for (let m = 1; m <= 12; m++) {
        if (lockedMonths[m]) {
          updated[m] = prev[m] ?? annualGrowthRate;
        } else {
          updated[m] = annualGrowthRate;
        }
      }
      return updated;
    });
  }, [annualGrowthRate, lockedMonths]);

  // 4. Calculate Final 12-Month Targets with Zero-Sum Largest Remainder Allocation
  const calculatedMonthlyTargets = useMemo(() => {
    const targets: Record<number, number> = {};
    let sumFixed = 0;
    const unlockedMonths: number[] = [];

    // Separate locked vs unlocked
    monthlyMetaList.forEach(m => {
      if (lockedMonths[m.month]) {
        const rate = growthRates[m.month] ?? annualGrowthRate;
        const tgt = Math.round(m.baseRevenue * (1 + rate / 100));
        targets[m.month] = tgt;
        sumFixed += tgt;
      } else {
        unlockedMonths.push(m.month);
      }
    });

    const remainTarget = annualTargetRevenue - sumFixed;

    if (unlockedMonths.length === 0) {
      // All locked: keep as is
      return targets;
    }

    // Proportional weight for unlocked months: BaseRevenue * Headroom
    const totalUnlockedWeight = unlockedMonths.reduce((sum, mNum) => {
      const meta = monthlyMetaList.find(m => m.month === mNum)!;
      return sum + (meta.baseRevenue * meta.headroom);
    }, 0) || 1;

    unlockedMonths.forEach(mNum => {
      const meta = monthlyMetaList.find(m => m.month === mNum)!;
      const weight = (meta.baseRevenue * meta.headroom) / totalUnlockedWeight;
      const tgt = Math.round(remainTarget * weight);
      targets[mNum] = tgt;
    });

    // Largest Remainder Method: 0-Variance Alignment with Annual Target
    let currentTotal = Object.values(targets).reduce((s, v) => s + v, 0);
    let diff = annualTargetRevenue - currentTotal;

    if (diff !== 0 && unlockedMonths.length > 0) {
      // Add remainder to the unlocked month with largest target
      const sortedUnlocked = [...unlockedMonths].sort((a, b) => (targets[b] || 0) - (targets[a] || 0));
      targets[sortedUnlocked[0]] += diff;
    }

    return targets;
  }, [monthlyMetaList, lockedMonths, growthRates, annualGrowthRate, annualTargetRevenue]);

  // Notify parent on change
  useEffect(() => {
    if (onMonthlyTargetsChange) {
      onMonthlyTargetsChange(calculatedMonthlyTargets);
    }
  }, [calculatedMonthlyTargets, onMonthlyTargetsChange]);

  // Handle single month slider drag with real-time Zero-Sum rebalancing
  const handleMonthRateChange = useCallback((editMonth: number, newRate: number) => {
    setGrowthRates(prev => {
      const updated = { ...prev, [editMonth]: newRate };
      
      const targetForEdit = Math.round((monthlyMetaList.find(m => m.month === editMonth)?.baseRevenue || 1) * (1 + newRate / 100));
      
      let sumFixed = targetForEdit;
      const otherUnlocked: number[] = [];

      monthlyMetaList.forEach(m => {
        if (m.month === editMonth) return;
        if (lockedMonths[m.month]) {
          const r = updated[m.month] ?? annualGrowthRate;
          sumFixed += Math.round(m.baseRevenue * (1 + r / 100));
        } else {
          otherUnlocked.push(m.month);
        }
      });

      const remainTarget = annualTargetRevenue - sumFixed;

      if (otherUnlocked.length > 0) {
        const totalWeight = otherUnlocked.reduce((s, mNum) => {
          const meta = monthlyMetaList.find(m => m.month === mNum)!;
          return s + (meta.baseRevenue * meta.headroom);
        }, 0) || 1;

        otherUnlocked.forEach(mNum => {
          const meta = monthlyMetaList.find(m => m.month === mNum)!;
          const weight = (meta.baseRevenue * meta.headroom) / totalWeight;
          const allocatedTarget = remainTarget * weight;
          const computedRate = Number((((allocatedTarget - meta.baseRevenue) / meta.baseRevenue) * 100).toFixed(1));
          updated[mNum] = computedRate;
        });
      }

      return updated;
    });
  }, [monthlyMetaList, lockedMonths, annualGrowthRate, annualTargetRevenue]);

  // Toggle Lock
  const toggleLock = (month: number) => {
    setLockedMonths(prev => ({
      ...prev,
      [month]: !prev[month]
    }));
  };

  // Preset 1: AI Season Smart Optimization (Dynamic Headroom-based)
  const applyAiSmartOptimization = () => {
    const updatedRates: Record<number, number> = {};
    const updatedLocks: Record<number, boolean> = { ...lockedMonths };

    // 1. Dynamically identify capacity-constrained peak months (headroom <= 15%)
    let sumPeakTarget = 0;
    monthlyMetaList.forEach(m => {
      if (m.headroom <= 0.15) {
        const peakCapRate = Math.max(0, Number((m.headroom * 100).toFixed(1)));
        updatedRates[m.month] = peakCapRate;
        updatedLocks[m.month] = true;
        sumPeakTarget += Math.round(m.baseRevenue * (1 + peakCapRate / 100));
      }
    });

    // 2. Distribute spillover to non-peak months based on headroom capacity
    const nonPeakMonths = monthlyMetaList.filter(m => m.headroom > 0.15);
    const remainTarget = Math.max(0, annualTargetRevenue - sumPeakTarget);

    const totalNonPeakWeight = nonPeakMonths.reduce((s, m) => s + (m.baseRevenue * m.headroom), 0) || 1;

    nonPeakMonths.forEach(m => {
      const weight = (m.baseRevenue * m.headroom) / totalNonPeakWeight;
      const allocatedTarget = remainTarget * weight;
      const computedRate = m.baseRevenue > 0 ? Number((((allocatedTarget - m.baseRevenue) / m.baseRevenue) * 100).toFixed(1)) : 0;
      updatedRates[m.month] = computedRate;
      updatedLocks[m.month] = false;
    });

    setLockedMonths(updatedLocks);
    setGrowthRates(updatedRates);
  };

  // Preset 2: Even Distribution Reset
  const resetEvenDistribution = () => {
    const resetRates: Record<number, number> = {};
    const resetLocks: Record<number, boolean> = {};
    for (let m = 1; m <= 12; m++) {
      resetRates[m] = annualGrowthRate;
      resetLocks[m] = false;
    }
    setLockedMonths(resetLocks);
    setGrowthRates(resetRates);
  };

  // 12-Month Bar Chart Options (Base vs Dynamic Target)
  const chartOption = useMemo(() => {
    const months = monthlyMetaList.map(m => m.label);
    const baseData = monthlyMetaList.map(m => Math.round(m.baseRevenue / 100000000 * 100) / 100);
    const targetData = monthlyMetaList.map(m => Math.round((calculatedMonthlyTargets[m.month] || m.baseRevenue) / 100000000 * 100) / 100);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any[]) => {
          if (!params || params.length < 2) return '';
          const mIdx = params[0].dataIndex;
          const meta = monthlyMetaList[mIdx];
          const bVal = params[0].value;
          const tVal = params[1].value;
          const gRate = growthRates[meta.month] ?? annualGrowthRate;
          return `
            <div style="font-size:12px; padding:4px;">
              <b>${meta.label} (${meta.seasonTag})</b><br/>
              • ${baseYear}년 실적: <b>${bVal}억원</b><br/>
              • ${targetYear}년 목표: <b style="color:#0d9488;">${tVal}억원 (+${gRate}%)</b><br/>
              • ${lockedMonths[meta.month] ? '🔒 목표 잠금' : '🔓 동적 연동'}
            </div>
          `;
        }
      },
      legend: {
        data: [`${baseYear}년 실적 기준`, `${targetYear}년 동적 리밸런싱 목표`],
        top: 0,
        textStyle: { fontSize: 11, color: '#64748B', fontWeight: 600 }
      },
      grid: { left: '3%', right: '3%', bottom: '8%', top: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        data: months,
        axisLabel: { fontSize: 11, fontWeight: 'bold', color: '#334155' }
      },
      yAxis: {
        type: 'value',
        name: '(억원)',
        axisLabel: { fontSize: 10, color: '#64748B' }
      },
      series: [
        {
          name: `${baseYear}년 실적 기준`,
          type: 'bar',
          data: baseData,
          itemStyle: { color: '#CBD5E1', borderRadius: [4, 4, 0, 0] },
          barGap: '20%'
        },
        {
          name: `${targetYear}년 동적 리밸런싱 목표`,
          type: 'bar',
          data: targetData,
          itemStyle: { 
            color: (params: any) => {
              const mIdx = params.dataIndex;
              const meta = monthlyMetaList[mIdx];
              if (lockedMonths[meta.month]) return '#4F46E5'; // Indigo for Locked
              if (meta.isPeak && (growthRates[meta.month] || 0) > 5) return '#F59E0B'; // Amber for Peak Warning
              return '#0D9488'; // Teal for Normal
            },
            borderRadius: [4, 4, 0, 0]
          }
        }
      ]
    };
  }, [monthlyMetaList, calculatedMonthlyTargets, growthRates, lockedMonths, baseYear, targetYear, annualGrowthRate]);

  return (
    <div className="bg-gradient-to-br from-white to-slate-50/80 rounded-[32px] p-7 border border-indigo-100 shadow-sm space-y-6">
      
      {/* Header & Presets */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              12개월 동적 연동 리밸런싱 (Auto-Balancing Slider Engine)
              <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-200 font-bold">
                Zero-Sum 100% 보존
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl">
            성수기(5·8·10월)의 수용 한계(Capacity Cap)를 고려하여 낮은 성장률로 제한하고, 결손 목표액을 비수기 여유 월로 자동 전이(Spillover)합니다. 특정 월을 수정하면 <strong>잠금되지 않은 나머지 월들이 실시간으로 비례 연동</strong>됩니다.
          </p>
        </div>

        {/* Action Preset Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={applyAiSmartOptimization}
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles size={15} />
            ✨ AI 시즌 스마트 최적화
          </button>
          
          <button
            onClick={resetEvenDistribution}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw size={14} />
            균등 배분 리셋
          </button>
        </div>
      </div>

      {/* 12-Month Bar Chart */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-2xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-teal-600" />
            12개월 실적 기준선 대비 동적 목표선 실시간 대조 (Zero-Variance 검증)
          </span>
          <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
            연간 총목표: {(annualTargetRevenue / 100000000).toFixed(2)}억원 (연평균 +{annualGrowthRate}%) 고정
          </span>
        </div>
        <ReactECharts option={chartOption} style={{ height: '260px', width: '100%' }} />
      </div>

      {/* 12-Month Controller Grid (4x3) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
        {monthlyMetaList.map(meta => {
          const isLocked = lockedMonths[meta.month];
          const rate = growthRates[meta.month] ?? annualGrowthRate;
          const targetAmount = calculatedMonthlyTargets[meta.month] || meta.baseRevenue;
          const isCapacityWarning = meta.isPeak && rate > 5.0;

          return (
            <div 
              key={meta.month}
              className={`rounded-2xl p-4 transition-all border ${
                isLocked 
                  ? 'bg-indigo-50/50 border-indigo-200 shadow-2xs' 
                  : isCapacityWarning
                  ? 'bg-amber-50/40 border-amber-200'
                  : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs'
              }`}
            >
              {/* Card Top: Month & Lock Button */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-black text-slate-900">{meta.label}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {meta.seasonTag}
                  </span>
                </div>

                <button
                  onClick={() => toggleLock(meta.month)}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    isLocked 
                      ? 'bg-indigo-600 text-white shadow-2xs' 
                      : 'bg-slate-100 text-slate-400 hover:text-slate-700'
                  }`}
                  title={isLocked ? '목표가 고정되어 타 월 조정 시 변하지 않습니다.' : '타 월 조정 시 자동으로 연동 리밸런싱됩니다.'}
                >
                  {isLocked ? <Lock size={13} /> : <Unlock size={13} />}
                  <span className="text-[10px]">{isLocked ? '잠금' : '연동'}</span>
                </button>
              </div>

              {/* Card Middle: Target Revenue & Growth Rate */}
              <div className="py-2.5 flex items-baseline justify-between">
                <div>
                  <div className="text-[10px] font-bold text-slate-400">목표 매출액</div>
                  <div className="text-lg font-black text-slate-900 tabular-nums">
                    {(targetAmount / 100000000).toFixed(2)}
                    <span className="text-xs font-normal text-slate-500 ml-0.5">억원</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-400">성장률 설정</div>
                  <div className={`text-base font-black tabular-nums ${rate >= 0 ? 'text-teal-600' : 'text-rose-500'}`}>
                    {rate > 0 ? '+' : ''}{rate}%
                  </div>
                </div>
              </div>

              {/* Slider */}
              <div className="space-y-1">
                <input
                  type="range"
                  min="-10"
                  max="35"
                  step="0.5"
                  value={rate}
                  disabled={isLocked}
                  onChange={(e) => handleMonthRateChange(meta.month, Number(e.target.value))}
                  className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${
                    isLocked 
                      ? 'bg-slate-200 accent-slate-400 cursor-not-allowed opacity-60' 
                      : isCapacityWarning
                      ? 'bg-amber-200 accent-amber-500'
                      : 'bg-slate-200 accent-teal-600'
                  }`}
                />
                
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-0.5">
                  <span>-10%</span>
                  <span>0%</span>
                  <span>+15%</span>
                  <span>+35%</span>
                </div>
              </div>

              {/* Card Bottom: Smart Warnings / Headroom */}
              <div className="pt-2 mt-2 border-t border-slate-100/80 flex items-center justify-between text-[10px]">
                {isCapacityWarning ? (
                  <span className="text-amber-700 font-bold flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80">
                    <AlertTriangle size={11} />
                    ADR 레버리지 필요
                  </span>
                ) : meta.isPeak ? (
                  <span className="text-indigo-600 font-semibold">
                    성수기 (가동률 ~{Math.round(meta.estimatedOcc * 100)}%)
                  </span>
                ) : (
                  <span className="text-teal-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={11} />
                    여유 여력: {Math.round(meta.headroom * 100)}%
                  </span>
                )}

                <span className="text-slate-400 tabular-nums">
                  기준: {(meta.baseRevenue / 100000000).toFixed(2)}억
                </span>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
