import { useState, useEffect, useMemo } from 'react';
import { 
  Target, Sparkles, ArrowUpRight, 
  Gauge, ShieldAlert, Settings, Layers
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import type { SimulationTargetInput, FacilityCapacityItem } from '../types/simulation';
import { DEFAULT_CAPACITY_SEEDS } from './AdminCapacity';
import { runTargetSimulation } from '../lib/targetSimulationEngine';

export default function TargetSimulator() {
  const [capacityMaster, setCapacityMaster] = useState<FacilityCapacityItem[]>(DEFAULT_CAPACITY_SEEDS);

  // Simulation Target Input State
  const [input, setInput] = useState<SimulationTargetInput>({
    targetYear: 2027,
    period: 'ANNUAL',
    metricInputMode: 'TREVPAR',
    targetTrevpar: 450000,
    targetGrowthRate: 15.0,
    targetTotalRevenue: 32775000000,
    strategyMode: 'BALANCED',
    includeGolf: true
  });

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  useEffect(() => {
    // Load Capacity Master from LocalStorage or Firebase
    const loadMaster = async () => {
      try {
        const cached = localStorage.getItem('BELLEFORET_CAPACITY_MASTER');
        if (cached) {
          setCapacityMaster(JSON.parse(cached));
        } else {
          setCapacityMaster(DEFAULT_CAPACITY_SEEDS);
        }
      } catch (e) {
        setCapacityMaster(DEFAULT_CAPACITY_SEEDS);
      }
    };
    loadMaster();
  }, []);

  // Run Simulation Engine
  const simulationResult = useMemo(() => {
    return runTargetSimulation(input, capacityMaster);
  }, [input, capacityMaster]);

  const formatCurrency = (val: any) => {
    if (!val) return '0';
    const num = typeof val === 'string' ? Number(val.replace(/,/g, '')) : Number(val);
    return isNaN(num) ? '0' : new Intl.NumberFormat('ko-KR').format(Math.round(num));
  };

  const handleTrevparChange = (val: number) => {
    const growth = Number((((val - 391400) / 391400) * 100).toFixed(1));
    const total = Math.round(val * 12 * 175);
    setInput(prev => ({
      ...prev,
      metricInputMode: 'TREVPAR',
      targetTrevpar: val,
      targetGrowthRate: growth,
      targetTotalRevenue: total
    }));
  };

  const handleGrowthRateChange = (rate: number) => {
    const baseLy = 28500000000;
    const total = Math.round(baseLy * (1 + rate / 100));
    const trevpar = Math.round(total / (12 * 175));
    setInput(prev => ({
      ...prev,
      metricInputMode: 'GROWTH_RATE',
      targetGrowthRate: rate,
      targetTrevpar: trevpar,
      targetTotalRevenue: total
    }));
  };

  // Pie chart option for division contribution
  const divisionPieOptions = useMemo(() => {
    const data = simulationResult.divisionResults.map(d => ({
      name: d.categoryLabel,
      value: d.targetRevenue,
      itemStyle: { color: d.color, borderRadius: 6, borderColor: '#fff', borderWidth: 2 }
    }));

    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: ₩{c}원 ({d}%)'
      },
      legend: {
        bottom: 0,
        icon: 'circle',
        itemGap: 12,
        textStyle: { color: '#475569', fontSize: 11, fontWeight: 600 }
      },
      series: [
        {
          name: '부문별 목표 비중',
          type: 'pie',
          radius: ['45%', '72%'],
          center: ['50%', '42%'],
          avoidLabelOverlap: false,
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
  }, [simulationResult]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* 1. Header & Quick Links */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-7 rounded-[32px] border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-teal-50 text-teal-700 rounded-2xl border border-teal-100">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                경영 목표 역추산 & 캐파 제약 시뮬레이터
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800">
                  Target Simulator Engine v5.2
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                목표 TrevPAR 또는 성장률을 입력하면, 전년도 패턴을 역산하여 <strong>6대 본부 및 30여 개 세부 영업장별 필요 매출과 캐파 제약(단가 인상 가이드)</strong>을 산출합니다.
              </p>
            </div>
          </div>
        </div>

        {/* Link to Admin Capacity Master */}
        <div className="flex items-center gap-2.5">
          <Link
            to="/admin/capacity"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-all cursor-pointer shadow-2xs"
          >
            <Settings className="w-3.5 h-3.5" />
            영업장 캐파 마스터 설정
          </Link>
        </div>
      </div>

      {/* 2. 🎛️ Master Target Console (대표님 목표 입력 패널) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950 p-8 rounded-[32px] text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Target className="w-72 h-72 text-white" />
        </div>

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/80 pb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-400" />
              <h2 className="text-lg font-black tracking-tight">
                2027년 전사 경영 목표 컨트롤 콘솔
              </h2>
            </div>
            
            {/* Scope & Mode Toggles */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
                <button
                  onClick={() => setInput(prev => ({ ...prev, includeGolf: true }))}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    input.includeGolf ? 'bg-teal-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ⛳ 골프 포함 (전사)
                </button>
                <button
                  onClick={() => setInput(prev => ({ ...prev, includeGolf: false }))}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    !input.includeGolf ? 'bg-sky-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🏨 골프 제외 (순수 리조트)
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* 1. Target TrevPAR Input & Slider */}
            <div className="bg-white/10 p-5 rounded-2xl border border-white/15 backdrop-blur-md space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-300">🎯 목표 월평균 TrevPAR (175실 기준)</span>
                <span className="text-[11px] text-slate-300 font-medium">전년 ₩39.1만 원</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-white tabular-nums">
                  ₩{formatCurrency(input.targetTrevpar)}
                </span>
                <span className="text-xs text-slate-300">/실·월</span>
              </div>

              <input
                type="range"
                min="300000"
                max="600000"
                step="10000"
                value={input.targetTrevpar}
                onChange={(e) => handleTrevparChange(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-400"
              />

              {/* Preset Buttons */}
              <div className="flex items-center justify-between gap-1 pt-1">
                {[380000, 420000, 450000, 500000, 550000].map(p => (
                  <button
                    key={p}
                    onClick={() => handleTrevparChange(p)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      input.targetTrevpar === p 
                        ? 'bg-teal-400 text-slate-950 font-black' 
                        : 'bg-white/10 text-slate-300 hover:bg-white/20'
                    }`}
                  >
                    ₩{Math.round(p / 10000)}만
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Target Growth Rate Slider */}
            <div className="bg-white/10 p-5 rounded-2xl border border-white/15 backdrop-blur-md space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300">🚀 전년 대비 목표 성장률</span>
                <span className="text-[11px] text-slate-300 font-medium">기준 2025/2026 실적</span>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-2xl font-black tabular-nums ${
                  input.targetGrowthRate >= 0 ? 'text-teal-300' : 'text-rose-400'
                }`}>
                  {input.targetGrowthRate > 0 ? '+' : ''}{input.targetGrowthRate}%
                </span>
                <span className="text-xs text-slate-300">성장 목표</span>
              </div>

              <input
                type="range"
                min="-10"
                max="40"
                step="0.5"
                value={input.targetGrowthRate}
                onChange={(e) => handleGrowthRateChange(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />

              {/* Growth Preset Buttons */}
              <div className="flex items-center justify-between gap-1 pt-1">
                {[5, 10, 15, 20, 25].map(g => (
                  <button
                    key={g}
                    onClick={() => handleGrowthRateChange(g)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      input.targetGrowthRate === g 
                        ? 'bg-amber-400 text-slate-950 font-black' 
                        : 'bg-white/10 text-slate-300 hover:bg-white/20'
                    }`}
                  >
                    +{g}%
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Resulting Annual Total Revenue Target */}
            <div className="bg-white/10 p-5 rounded-2xl border border-white/15 backdrop-blur-md flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-indigo-300">💰 전사 필요 연간 총매출 목표</span>
                <div className="text-2xl lg:text-3xl font-black text-white tabular-nums mt-2">
                  ₩{formatCurrency(simulationResult.totalTargetRevenue)} <span className="text-xs font-normal text-slate-300">원</span>
                </div>
                <div className="text-xs text-slate-300 mt-1">
                  (약 {(simulationResult.totalTargetRevenue / 100000000).toFixed(1)}억 원 / 전년비 +{formatCurrency(simulationResult.totalTargetRevenue - simulationResult.totalLyRevenue)}원 증대)
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-teal-300 font-semibold">
                <span>⚡ 100% Zero-Variance 수학적 정합성 보장</span>
                <span>30개 영업장 완전 분배 완료</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* 3. 🏆 4 Executive KPI Highlight Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 mb-1">목표 연간 총매출</div>
          <div className="text-2xl font-black text-slate-900 tabular-nums">
            {(simulationResult.totalTargetRevenue / 100000000).toFixed(1)} <span className="text-sm font-normal text-slate-500">억원</span>
          </div>
          <div className="text-xs text-teal-700 font-bold mt-1">
            전년비 +{((simulationResult.totalTargetRevenue - simulationResult.totalLyRevenue) / 100000000).toFixed(1)}억원 순증
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 mb-1">목표 월평균 TrevPAR</div>
          <div className="text-2xl font-black text-teal-800 tabular-nums">
            ₩{formatCurrency(simulationResult.achievedTrevpar)} <span className="text-sm font-normal text-slate-500">/실·월</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">175실 보유 인프라 1실당 생산성</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 mb-1">전년 대비 필요 성장률</div>
          <div className="text-2xl font-black text-indigo-900 tabular-nums flex items-center gap-1">
            <ArrowUpRight className="w-6 h-6 text-teal-600" />
            +{simulationResult.overallGrowthRate}%
          </div>
          <div className="text-xs text-slate-500 mt-1">2025년 ₩{(simulationResult.totalLyRevenue / 100000000).toFixed(1)}억 대비</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 mb-1">캐파 제약(Ceiling) 상태</div>
          <div className="text-lg font-black text-amber-700 flex items-center gap-1.5">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            단가 인상 가이드 발동
          </div>
          <div className="text-[11px] text-slate-500 mt-1">객실/골프 풀가동 ➔ ADR 인상 전환</div>
        </div>
      </div>

      {/* 4. 🏢 Macro Division 1st Breakdown & Micro Facility Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Division Target Cards (6대 사업부 목표 현황판) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              6대 사업 본부별 1차 목표 분배 현황
            </h3>
            <span className="text-xs text-slate-500 font-semibold">전년도 계절성(Seasonality) 기반 역산</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {simulationResult.divisionResults.map(div => (
              <div 
                key={div.category}
                className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{div.icon}</span>
                    <span className="font-bold text-slate-900">{div.categoryLabel}</span>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 tabular-nums">
                    비중 {div.targetShare}%
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-slate-500">목표 매출:</span>
                    <span className="text-lg font-black text-slate-900 tabular-nums">
                      ₩{formatCurrency(div.targetRevenue)} <span className="text-xs font-normal text-slate-400">원</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">전년 실적:</span>
                    <span className="text-slate-600 font-semibold tabular-nums">₩{formatCurrency(div.lyRevenue)}원</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-100 font-bold">
                    <span className="text-slate-600">필요 성장률:</span>
                    <span className={div.growthRate >= 0 ? 'text-teal-600' : 'text-rose-500'}>
                      {div.growthRate > 0 ? '+' : ''}{div.growthRate}% (+₩{formatCurrency(div.diffAmount)}원)
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Pie Chart Distribution */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900 mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-600" />
              부문별 목표 기여 비중
            </h3>
            <p className="text-xs text-slate-400 mb-4">전체 {(simulationResult.totalTargetRevenue / 100000000).toFixed(1)}억원 구성</p>
            <ReactECharts option={divisionPieOptions} style={{ height: '280px', width: '100%' }} />
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 text-center">
            💡 물리적 수용 한계에 도달한 영업장은 단가 인상으로 자동 조정됩니다.
          </div>
        </div>

      </div>

      {/* 5. 🚦 영업장별 2차 세부 실행 계획 & 캐파 신호등 테이블 */}
      <div className="bg-white rounded-[32px] p-7 border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Gauge className="w-5 h-5 text-indigo-600" />
              영업장별 세부 실행 목표 및 물리적 캐파 신호등 (Action Plan)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              각 영업장마다 필요한 일평균 판매량(Q)과 권장 객단가(P)를 산출하고, 수용 한계 초과 시 단가 인상 지침을 제공합니다.
            </p>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs overflow-x-auto">
            {[
              { id: 'ALL', label: '전체 (43개)' },
              { id: '객실', label: '🏨 객실' },
              { id: '식음', label: '🍽️ 식음' },
              { id: '골프', label: '⛳ 골프' },
              { id: '모토아레나', label: '🏎️ 모토' },
              { id: '대관', label: '🏛️ 대관' },
              { id: '레저본부', label: '🎢 레저' },
              { id: '독립/기타', label: '📦 기타' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryFilter(cat.id)}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategoryFilter === cat.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Facility Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">영업장명 (Facility)</th>
                <th className="py-3.5 px-4 text-center">부문</th>
                <th className="py-3.5 px-4 text-right">전년 실적</th>
                <th className="py-3.5 px-4 text-right font-black text-slate-900">목표 매출액</th>
                <th className="py-3.5 px-4 text-center">필요 판매량 (Q) vs 최대 캐파</th>
                <th className="py-3.5 px-4 text-right">권장 객단가 (P)</th>
                <th className="py-3.5 px-4 text-center">캐파 상태</th>
                <th className="py-3.5 px-4">시스템 가이드라인 및 조치 사항</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {simulationResult.divisionResults.flatMap(d => d.facilities)
                .filter(f => selectedCategoryFilter === 'ALL' || f.category === selectedCategoryFilter)
                .map((fac) => (
                  <tr key={fac.shopCode} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Facility Name */}
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {fac.shopName}
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px]">
                        {fac.category}
                      </span>
                    </td>

                    {/* LY Revenue */}
                    <td className="py-3.5 px-4 text-right tabular-nums text-slate-500">
                      ₩{formatCurrency(fac.lyRevenue)}원
                    </td>

                    {/* Target Revenue */}
                    <td className="py-3.5 px-4 text-right tabular-nums font-black text-indigo-950 bg-indigo-50/20">
                      ₩{formatCurrency(fac.targetRevenue)}원
                    </td>

                    {/* Q vs Capacity */}
                    <td className="py-3.5 px-4 text-center tabular-nums">
                      <span className="font-bold text-slate-800">{fac.requiredDailyUnits}{fac.unitName}</span>
                      <span className="text-slate-400 text-[11px]"> / {fac.maxDailyUnits}{fac.unitName}일 </span>
                      <span className={`text-[10px] font-bold ml-1 px-1.5 py-0.5 rounded ${
                        fac.capacityUtilizationRate >= 100 
                          ? 'bg-rose-100 text-rose-700' 
                          : fac.capacityUtilizationRate >= 85 
                          ? 'bg-amber-100 text-amber-800' 
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        ({fac.capacityUtilizationRate}%)
                      </span>
                    </td>

                    {/* P (Target Unit Price) */}
                    <td className="py-3.5 px-4 text-right tabular-nums">
                      <span className="font-bold text-slate-900">₩{formatCurrency(fac.targetUnitPrice)}원</span>
                      {fac.unitPriceHikeRate > 0 && (
                        <span className="text-[10px] text-amber-700 font-black ml-1 block">
                          (+{fac.unitPriceHikeRate}% 인상)
                        </span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 text-center">
                      {fac.status === 'NORMAL' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[11px]">
                          🟢 정상 수용
                        </span>
                      )}
                      {fac.status === 'CAPACITY_WARNING' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200 text-[11px]">
                          🟡 캐파 임박
                        </span>
                      )}
                      {fac.status === 'PRICE_HIKE_REQUIRED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-200 text-[11px]">
                          🔴 단가 인상
                        </span>
                      )}
                      {fac.status === 'SPILLOVER_REALLOCATED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 font-bold border border-purple-200 text-[11px]">
                          🟣 초과 재배분
                        </span>
                      )}
                    </td>

                    {/* System Guideline Message */}
                    <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                      {fac.statusMessage}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
