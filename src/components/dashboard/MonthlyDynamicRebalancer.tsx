import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Sparkles, Lock, Unlock, RotateCcw, AlertTriangle, 
  CheckCircle2, Sliders, BarChart2, HelpCircle
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { secureFetcher } from '../../lib/secureFetcher';
import type { MonthlyRebalancerResponse } from '../../types/reports-v2';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

interface MonthlyDynamicRebalancerProps {
  annualBaseRevenue: number;
  annualTargetRevenue: number;
  annualGrowthRate: number;
  targetYear: number;
  baseYear: number;
  includeGolf: boolean;
  onMonthlyTargetsChange?: (targets: Record<number, number>) => void;
  monthlyGrowthRates?: Record<number, number>;
  onMonthlyGrowthRatesChange?: (rates: Record<number, number>) => void;
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

const SEASON_TAGS: Record<number, string> = {
  1: '겨울 비수기', 2: '겨울 비수기', 3: '봄 개장 시즌', 4: '봄 성수기',
  5: '가정의달 피크', 6: '초여름 시즌', 7: '여름 방학/워터파크', 8: '바캉스 극성수기',
  9: '가을 성수기', 10: '단풍/골프 피크', 11: '늦가을 시즌', 12: '연말/겨울 시즌'
};

export default function MonthlyDynamicRebalancer({
  annualBaseRevenue,
  annualTargetRevenue,
  annualGrowthRate,
  targetYear,
  baseYear,
  includeGolf,
  onMonthlyTargetsChange,
  monthlyGrowthRates,
  onMonthlyGrowthRatesChange
}: MonthlyDynamicRebalancerProps) {
  
  const [trendsData, setTrendsData] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchTrends = async () => {
      try {
        const res = await secureFetcher(`${API_BASE}/api/v6/report/monthly-trends?year=${baseYear}`) as any;
        const list = Array.isArray(res?.data) ? res.data : [];
        if (isMounted) {
          setTrendsData(list);
        }
      } catch (err) {
        console.warn('[MonthlyDynamicRebalancer] Failed to fetch monthly-trends:', err);
      }
    };
    fetchTrends();
    return () => { isMounted = false; };
  }, [baseYear]);

  // 1. Build Base Monthly Revenue Profile from Real Backend Trends Data (100% Dynamic Occupancy & Headroom)
  const monthlyMetaList: MonthMeta[] = useMemo(() => {
    const monthRevs: Record<number, number> = {};
    let maxMonthRev = 1;

    for (let m = 1; m <= 12; m++) {
      const monthKey = `${baseYear}${String(m).padStart(2, '0')}`;
      const item = trendsData.find((d: any) => String(d.month) === monthKey);
      let adjRev = 0;
      if (item) {
        adjRev = Math.round(includeGolf ? (item.totalRevenue ?? item.revenue ?? 0) : (item.exGolfRevenue ?? 0));
      }
      monthRevs[m] = adjRev;
      if (adjRev > maxMonthRev) maxMonthRev = adjRev;
    }

    const list: MonthMeta[] = [];
    for (let m = 1; m <= 12; m++) {
      const baseRev = monthRevs[m] || 0;
      const intensity = maxMonthRev > 0 ? Number((baseRev / maxMonthRev).toFixed(2)) : 0.0;
      const headroom = Number(Math.max(0.02, 1.0 - intensity).toFixed(2));
      const isPeak = intensity >= 0.85;

      list.push({
        month: m,
        label: `${m}월`,
        seasonTag: SEASON_TAGS[m] || '시즌',
        isPeak,
        estimatedOcc: intensity,
        headroom,
        baseRevenue: baseRev
      });
    }

    return list;
  }, [baseYear, annualBaseRevenue, includeGolf, trendsData]);

  // 2. Lock State per month
  const [lockedMonths, setLockedMonths] = useState<Record<number, boolean>>({});

  // 3. Custom Growth Rates per month (-10% ~ +40%)
  const [growthRates, setGrowthRates] = useState<Record<number, number>>(() => {
    const initial: Record<number, number> = {};
    for (let m = 1; m <= 12; m++) {
      initial[m] = monthlyGrowthRates?.[m] ?? annualGrowthRate;
    }
    return initial;
  });

  // Sync if monthlyGrowthRates prop changes externally from Month Selector Bar
  useEffect(() => {
    if (monthlyGrowthRates && Object.keys(monthlyGrowthRates).length > 0) {
      setGrowthRates(prev => {
        let changed = false;
        const next = { ...prev };
        for (let m = 1; m <= 12; m++) {
          if (monthlyGrowthRates[m] !== undefined && monthlyGrowthRates[m] !== prev[m]) {
            next[m] = monthlyGrowthRates[m];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }
  }, [monthlyGrowthRates]);

  // Reset all months to annual average when annualGrowthRate changes
  useEffect(() => {
    setGrowthRates(prev => {
      const updated: Record<number, number> = {};
      for (let m = 1; m <= 12; m++) {
        if (lockedMonths[m] || (monthlyGrowthRates && monthlyGrowthRates[m] !== undefined)) {
          updated[m] = prev[m] ?? annualGrowthRate;
        } else {
          updated[m] = annualGrowthRate;
        }
      }
      return updated;
    });
  }, [annualGrowthRate, lockedMonths, monthlyGrowthRates]);

  // Server Simulator Integration: POST /api/v6/simulator/monthly-rebalancer
  const [serverRebalanceData, setServerRebalanceData] = useState<MonthlyRebalancerResponse | null>(null);
  const [isRebalancing, setIsRebalancing] = useState<boolean>(false);
  const [rebalanceNotice, setRebalanceNotice] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchServerRebalance = async () => {
      setIsRebalancing(true);
      try {
        const res: MonthlyRebalancerResponse = await secureFetcher(`${API_BASE}/api/v6/simulator/monthly-rebalancer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            annualTargetRevenue,
            closedMonthActuals: {},
            remainingMonthWeights: growthRates
          })
        });

        if (!isMounted) return;

        if ((res as any)?.isPowerSaving || res?.error?.includes('심야 절전')) {
          setRebalanceNotice('🌙 심야 절전 운영 시간(20:00 ~ 08:00)에는 서버리스 계산 엔진이 대기 상태입니다. 매일 아침 08:00에 정상 가동됩니다.');
          setServerRebalanceData(null);
        } else if (res?.success || res?.monthly || res?.remainingRequiredRevenue !== undefined) {
          setServerRebalanceData(res);
          setRebalanceNotice(null);
        }
      } catch (err: any) {
        if (!isMounted) return;
        if (err?.message?.includes('심야 절전') || String(err).includes('500')) {
          setRebalanceNotice('🌙 심야 절전 운영 시간(20:00 ~ 08:00)에는 서버리스 계산 엔진이 대기 상태입니다. 매일 아침 08:00에 정상 가동됩니다.');
        }
      } finally {
        if (isMounted) setIsRebalancing(false);
      }
    };

    fetchServerRebalance();
    return () => { isMounted = false; };
  }, [annualTargetRevenue, growthRates]);

  // 4. Calculate Final 12-Month Targets (Prefer 100% Server Rebalancer Response)
  const calculatedMonthlyTargets = useMemo(() => {
    // 1순위: 서버 시뮬레이터 완제품 타겟 바인딩 (Zero-Proxy)
    const serverList = serverRebalanceData?.monthly || serverRebalanceData?.months;
    if (serverList && serverList.length > 0) {
      const sTargets: Record<number, number> = {};
      serverList.forEach(item => {
        sTargets[item.month] = item.rebalancedTarget ?? item.originalTarget ?? 0;
      });
      return sTargets;
    }

    const targets: Record<number, number> = {};
    let sumFixed = 0;
    const unlockedMonths: number[] = [];

    // Separate locked vs unlocked
    monthlyMetaList.forEach(m => {
      if (lockedMonths[m.month]) {
        const rate = growthRates[m.month] ?? annualGrowthRate;
        const tgt = (m as any).targetRevenue ?? Math.round(m.baseRevenue * (1 + rate / 100));
        targets[m.month] = tgt;
        sumFixed += tgt;
      } else {
        unlockedMonths.push(m.month);
      }
    });

    const remainTarget = annualTargetRevenue - sumFixed;

    if (unlockedMonths.length === 0) {
      return targets;
    }

    let totalUnlockedWeight = 0;
    for (const mNum of unlockedMonths) {
      const meta = monthlyMetaList.find(m => m.month === mNum);
      if (meta) totalUnlockedWeight += (meta.baseRevenue * meta.headroom);
    }
    if (totalUnlockedWeight === 0) totalUnlockedWeight = 1;

    unlockedMonths.forEach(mNum => {
      const meta = monthlyMetaList.find(m => m.month === mNum)!;
      const weight = (meta.baseRevenue * meta.headroom) / totalUnlockedWeight;
      const tgt = Math.round(remainTarget * weight);
      targets[mNum] = tgt;
    });

    let currentTotal = 0;
    for (const val of Object.values(targets)) {
      currentTotal += (val || 0);
    }
    const diff = annualTargetRevenue - currentTotal;

    if (diff !== 0 && unlockedMonths.length > 0) {
      const sortedUnlocked = [...unlockedMonths].sort((a, b) => (targets[b] || 0) - (targets[a] || 0));
      targets[sortedUnlocked[0]] += diff;
    }

    return targets;
  }, [serverRebalanceData, monthlyMetaList, lockedMonths, growthRates, annualGrowthRate, annualTargetRevenue]);

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
      
      const editMeta = monthlyMetaList.find(m => m.month === editMonth);
      const targetForEdit = editMeta ? Math.round(editMeta.baseRevenue * (1 + newRate / 100)) : 0;
      
      let sumFixed = targetForEdit;
      const otherUnlocked: number[] = [];

      monthlyMetaList.forEach(m => {
        if (m.month === editMonth) return;
        if (lockedMonths[m.month]) {
          const r = updated[m.month] ?? annualGrowthRate;
          const fixedVal = Math.round(m.baseRevenue * (1 + r / 100));
          sumFixed += fixedVal;
        } else {
          otherUnlocked.push(m.month);
        }
      });

      const remainTarget = annualTargetRevenue - sumFixed;

      if (otherUnlocked.length > 0) {
        let totalWeight = 0;
        for (const mNum of otherUnlocked) {
          const meta = monthlyMetaList.find(m => m.month === mNum);
          if (meta) totalWeight += (meta.baseRevenue * meta.headroom);
        }
        if (totalWeight === 0) totalWeight = 1;

        otherUnlocked.forEach(mNum => {
          const meta = monthlyMetaList.find(m => m.month === mNum)!;
          const weight = (meta.baseRevenue * meta.headroom) / totalWeight;
          const allocatedTarget = remainTarget * weight;
          const computedRate = meta.baseRevenue > 0
            ? Math.round(((allocatedTarget - meta.baseRevenue) / meta.baseRevenue) * 1000) / 10
            : 0;
          updated[mNum] = computedRate;
        });
      }

      if (onMonthlyGrowthRatesChange) {
        onMonthlyGrowthRatesChange(updated);
      }

      return updated;
    });
  }, [monthlyMetaList, lockedMonths, annualGrowthRate, annualTargetRevenue, onMonthlyGrowthRatesChange]);

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
    if (onMonthlyGrowthRatesChange) {
      onMonthlyGrowthRatesChange(updatedRates);
    }
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
    if (onMonthlyGrowthRatesChange) {
      onMonthlyGrowthRatesChange({});
    }
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
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <div className="flex flex-col items-start sm:items-end">
            <button
              onClick={applyAiSmartOptimization}
              className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-800 text-white rounded-2xl text-xs font-bold transition-all shadow-sm hover:shadow-indigo-200 active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer"
              title="성수기 한계 제한 및 비수기 가중 배분 자동 실행"
            >
              <Sparkles size={15} />
              <span>✨ AI 시즌 스마트 최적화</span>
            </button>
            <span className="text-[10px] text-purple-700 font-bold mt-1 px-1">
              성수기 Cap 제한 ➔ 비수기 가중 전이
            </span>
          </div>
          
          <div className="flex flex-col items-start sm:items-end">
            <button
              onClick={resetEvenDistribution}
              className="w-full sm:w-auto px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 shadow-2xs hover:border-slate-300"
              title="모든 월을 연간 목표 성장률로 균일하게 리셋"
            >
              <RotateCcw size={14} className="text-slate-500" />
              <span>🔄 균등 배분 리셋</span>
            </button>
            <span className="text-[10px] text-slate-500 font-bold mt-1 px-1">
              12개월 일괄 균등 적용 ({annualGrowthRate > 0 ? `+${annualGrowthRate}%` : `${annualGrowthRate}%`})
            </span>
          </div>
        </div>
      </div>

      {/* 💡 버튼 기능 가이드 (직관적 이해를 위한 동작 원리 안내) */}
      <div className="bg-slate-900/[0.03] border border-slate-200/90 rounded-2xl p-4.5 space-y-3">
        <div className="flex items-center gap-2 text-xs font-black text-slate-800">
          <HelpCircle size={15} className="text-indigo-600" />
          <span>각 버튼의 기능 및 엔진 조작 원리</span>
          <span className="text-[11px] font-normal text-slate-500 ml-1">
            원하는 전략에 맞춰 버튼을 누르면 연간 목표 총액 손실 없이 월별 목표치가 즉시 재계산됩니다.
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Guide Card 1: AI 시즌 스마트 최적화 */}
          <div className="bg-white rounded-xl p-3.5 border border-purple-100/80 shadow-2xs flex flex-col justify-between space-y-2">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[11px] font-black border border-purple-200/70">
                  <Sparkles size={12} />
                  ✨ AI 시즌 스마트 최적화
                </span>
                <span className="text-[10px] font-bold text-purple-600 bg-purple-50/50 px-1.5 py-0.5 rounded">
                  추천 시나리오
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-normal">
                <strong>성수기 과포화 방지 및 비수기 집중 성장</strong>:
                객실/골프 가동률이 85%를 넘는 성수기(5·8·10월)는 수용 한계에 도달하여 더 늘릴 수 없으므로 성장률을 낮게(0~15%) 제한하고 <strong>[🔒 잠금]</strong>합니다. 
                대신 부족한 목표액을 여유 여력이 많은 비수기·숄더 월로 자동 전이(Spillover)하여 <strong>연간 목표를 현실적으로 100% 달성</strong>합니다.
              </p>
            </div>
            <div className="text-[10px] text-purple-700/90 font-medium bg-purple-50/40 px-2 py-1 rounded border border-purple-100">
              💡 <em>사용 시점: 성수기 만실 한계를 인정하고 비수기 마케팅으로 승부할 때 클릭</em>
            </div>
          </div>

          {/* Guide Card 2: 균등 배분 리셋 */}
          <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-2">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-black border border-slate-200">
                  <RotateCcw size={12} />
                  🔄 균등 배분 리셋
                </span>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                  초기화 기준선
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-normal">
                <strong>12개월 전체 동일 비율 일괄 복원</strong>:
                사용자가 개별적으로 조정한 모든 월별 슬라이더와 잠금을 일괄 해제하고, 1월부터 12월까지 전체 월에 연간 목표 성장률(<strong>+{annualGrowthRate}%</strong>)을 <strong>동일한 비율로 1:1 일괄 적용</strong>합니다. 
                처음부터 다시 계획을 설계하고 싶을 때 기준 상태로 되돌립니다.
              </p>
            </div>
            <div className="text-[10px] text-slate-600 font-medium bg-slate-50 px-2 py-1 rounded border border-slate-100">
              💡 <em>사용 시점: 개별 조정을 모두 지우고 균등한 성장률에서 새로 시작할 때 클릭</em>
            </div>
          </div>

          {/* Guide Card 3: 월별 잠금/연동 제어 */}
          <div className="bg-white rounded-xl p-3.5 border border-indigo-100/80 shadow-2xs flex flex-col justify-between space-y-2">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-black border border-indigo-200/70">
                  <Lock size={12} />
                  🔒 월별 잠금 / 🔓 연동 제어
                </span>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50/50 px-1.5 py-0.5 rounded">
                  Zero-Sum 보존
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-normal">
                <strong>실시간 동적 밸런싱 (Zero-Sum 100%)</strong>:
                각 월 카드의 <strong>[🔒 잠금]</strong>을 누르면 그 달의 목표치가 동결되어 변하지 않습니다. 
                이후 <strong>[🔓 연동]</strong> 상태인 임의의 월 슬라이더를 올리거나 내리면, 잠금되지 않은 나머지 월들이 <strong>실시간으로 반비례 자동 가감되어 연간 총목표액이 1원의 오차도 없이 완벽히 유지</strong>됩니다.
              </p>
            </div>
            <div className="text-[10px] text-indigo-700/90 font-medium bg-indigo-50/40 px-2 py-1 rounded border border-indigo-100">
              💡 <em>사용 시점: 특정 월(예: 행사/성수기) 목표를 고정해 두고 나머지 달을 조율할 때 활용</em>
            </div>
          </div>
        </div>
      </div>

      {/* Server Power-saving / Operational Notice */}
      {rebalanceNotice && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-xs font-semibold text-amber-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-600 shrink-0" />
            <span>{rebalanceNotice}</span>
          </div>
          <span className="text-[10px] text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded font-mono">
            절전 모드 대기
          </span>
        </div>
      )}

      {/* Server Dynamic Rebalancing Summary Bar */}
      {serverRebalanceData && (
        <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-600" />
            <span className="text-xs font-bold text-indigo-950">서버리스 리밸런싱 엔진 연동</span>
            {isRebalancing && <span className="text-[11px] text-indigo-600 font-semibold animate-pulse">연산 중...</span>}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            {serverRebalanceData.closedTotalRevenue !== undefined && (
              <div>
                <span className="text-slate-500 font-medium">마감월 누적: </span>
                <b className="font-mono text-slate-800">{serverRebalanceData.closedTotalRevenue.toLocaleString()}원</b>
              </div>
            )}
            {serverRebalanceData.remainingRequiredRevenue !== undefined && (
              <div>
                <span className="text-slate-500 font-medium">잔여월 필요: </span>
                <b className="font-mono text-indigo-700">{serverRebalanceData.remainingRequiredRevenue.toLocaleString()}원</b>
              </div>
            )}
            {serverRebalanceData.requiredYoYGrowthPct !== undefined && (
              <div>
                <span className="text-slate-500 font-medium">필요 성장률: </span>
                <b className="font-mono text-emerald-700">{serverRebalanceData.requiredYoYGrowthPct}%</b>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 12-Month Bar Chart */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-2xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-teal-600" />
            12개월 실적 기준선 대비 동적 목표선 실시간 대조 (정합성 검증)
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
              className={`rounded-2xl p-4 transition-all border min-h-[195px] flex flex-col justify-between ${
                isLocked 
                  ? 'bg-indigo-50/50 border-indigo-200 shadow-2xs' 
                  : isCapacityWarning
                  ? 'bg-amber-50/40 border-amber-200'
                  : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs'
              }`}
            >
              {/* Card Top: Month & Lock Button */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-base font-black text-slate-900 shrink-0">{meta.label}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 truncate max-w-[105px]" title={meta.seasonTag}>
                    {meta.seasonTag}
                  </span>
                </div>

                <button
                  onClick={() => toggleLock(meta.month)}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                    isLocked 
                      ? 'bg-indigo-600 text-white shadow-2xs' 
                      : 'bg-slate-100 text-slate-400 hover:text-slate-700'
                  }`}
                  title={isLocked ? '목표가 고정되어 타 월 조정 시 변하지 않습니다.' : '타 월 조정 시 자동으로 연동 리밸런싱됩니다.'}
                >
                  {isLocked ? <Lock size={13} /> : <Unlock size={13} />}
                  <span className="text-[10px] font-bold">{isLocked ? '잠금' : '연동'}</span>
                </button>
              </div>

              {/* Card Middle: Target Revenue & Growth Rate */}
              <div className="py-2 flex items-baseline justify-between">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">목표 매출액</div>
                  <div className="text-lg font-black text-slate-900 font-mono tabular-nums">
                    {(targetAmount / 100000000).toFixed(2)}
                    <span className="text-xs font-normal text-slate-500 ml-0.5 font-sans">억원</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">성장률 설정</div>
                  <div className={`text-base font-black font-mono tabular-nums ${rate >= 0 ? 'text-teal-600' : 'text-rose-500'}`}>
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
                
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium font-mono pt-0.5">
                  <span>-10%</span>
                  <span>0%</span>
                  <span>+15%</span>
                  <span>+35%</span>
                </div>
              </div>

              {/* Card Bottom: Smart Warnings / Headroom */}
              <div className="pt-2 mt-1 border-t border-slate-100/80 flex items-center justify-between text-[10px]">
                {isCapacityWarning ? (
                  <span className="text-amber-700 font-bold flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80">
                    <AlertTriangle size={11} />
                    ADR 레버리지 필요
                  </span>
                ) : meta.isPeak ? (
                  <span className="text-indigo-600 font-semibold truncate" title={`성수기 (~${Math.round(meta.estimatedOcc * 100)}%)`}>
                    성수기 (~{Math.round(meta.estimatedOcc * 100)}%)
                  </span>
                ) : (
                  <span className="text-teal-700 font-semibold flex items-center gap-1 truncate" title={`여유 여력: ${Math.round(meta.headroom * 100)}%`}>
                    <CheckCircle2 size={11} />
                    여유 여력: {Math.round(meta.headroom * 100)}%
                  </span>
                )}

                <span className="text-slate-400 font-mono tabular-nums shrink-0">
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
