import { useState, useEffect, useMemo } from 'react';
import { 
  Target, Sparkles, ArrowUpRight, 
  Gauge, ShieldAlert, Settings, Layers, Calendar
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import type { SimulationTargetInput, FacilityCapacityItem } from '../types/simulation';
import { DEFAULT_CAPACITY_SEEDS } from '../data/defaultCapacitySeeds';
import { runTargetSimulation } from '../lib/targetSimulationEngine';

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

export default function TargetSimulator() {
  const [capacityMaster, setCapacityMaster] = useState<FacilityCapacityItem[]>(DEFAULT_CAPACITY_SEEDS);

  // Simulation Target Input State (연간 성장률 글로벌 앵커 + 선택 월)
  const [input, setInput] = useState<SimulationTargetInput>({
    targetYear: 2027,
    selectedMonth: 7, // 기본값: 7월 성수기 (또는 'ANNUAL')
    period: 'M07',
    metricInputMode: 'GROWTH_RATE',
    targetTrevpar: 0,
    targetGrowthRate: 15.0, // 연간 목표 성장률 기본값 +15%
    targetTotalRevenue: 0,
    strategyMode: 'BALANCED',
    includeGolf: true
  });

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  useEffect(() => {
    // Load Capacity Master from LocalStorage or Firebase
    const loadMaster = async () => {
      try {
        const cached = localStorage.getItem('BELLEFORET_CAPACITY_MASTER_V3');
        if (cached) {
          const parsed = JSON.parse(cached);
          const cleaned = Array.isArray(parsed) 
            ? parsed.filter((item: any) => item.id !== 'cap_leisure_luge' && item.shopName !== '익스트림 루지') 
            : DEFAULT_CAPACITY_SEEDS;
          setCapacityMaster(cleaned);
          localStorage.setItem('BELLEFORET_CAPACITY_MASTER_V3', JSON.stringify(cleaned));
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

  const handleGrowthRateChange = (rate: number) => {
    setInput(prev => ({
      ...prev,
      metricInputMode: 'GROWTH_RATE',
      targetGrowthRate: rate
    }));
  };

  const handleMonthSelect = (monthVal: number | 'ANNUAL') => {
    setInput(prev => ({
      ...prev,
      selectedMonth: monthVal,
      period: monthVal === 'ANNUAL' ? 'ANNUAL' : (`M${String(monthVal).padStart(2, '0')}` as any)
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
          labelLayout: {
            hideOverlap: true,
            moveOverlap: 'shiftY'
          },
          label: {
            show: true,
            formatter: '{b}\n{d}%',
            fontSize: 11,
            fontWeight: 'bold',
            color: '#1e293b',
            overflow: 'break'
          },
          labelLine: {
            show: true,
            length: 8,
            length2: 10,
            smooth: 0.2
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
                경영 목표 역추산 & 월별 캐파 시뮬레이터
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800">
                  Target Simulator Engine v6.0
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                전사 <strong>연간 목표 성장률(%)</strong>을 설정하고 <strong>특정 월(1~12월)</strong>을 선택하면, 해당 월의 실측 계절성과 42개 영업장별 매출 비중을 자동 대입하여 세부 목표를 산출합니다.
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

      {/* 2. 🎛️ Master Target Console (대표님 목표 입력 패널 & 12개월 월 선택기) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950 p-8 rounded-[32px] text-white shadow-xl relative overflow-hidden space-y-6">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Target className="w-72 h-72 text-white" />
        </div>

        {/* Top Control Bar: Golf Toggle */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/80 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-400" />
            <h2 className="text-lg font-black tracking-tight">
              2027년 전사 경영 목표 컨트롤 콘솔
            </h2>
          </div>
          
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

        {/* Month Selector Bar (1월 ~ 12월 및 연간 종합 탭) */}
        <div className="relative z-10 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-teal-400" />
              시뮬레이션 대상 월 선택 (해당 월의 실측 매출 비중 자동 대입)
            </span>
            <span className="text-teal-300 font-extrabold">
              현재 선택: {simulationResult.selectedMonthLabel} ({simulationResult.periodDays}일 기준)
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
              <span className="text-xs font-bold text-amber-300">🚀 전사 연간 목표 성장률 설정</span>
              <span className="text-[11px] text-slate-300 font-medium">2025년 실측 실적 기준선</span>
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
                <span>🎯 선택한 {simulationResult.selectedMonthLabel} 목표 실적 지표</span>
                <span className="text-[11px] text-slate-300">175실 × {simulationResult.periodDays}일 기준</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <div className="text-[11px] text-slate-400 font-semibold">목표 월 TrevPAR</div>
                  <div className="text-2xl font-black text-white tabular-nums mt-0.5">
                    ₩{formatCurrency(simulationResult.achievedTrevpar)}
                    <span className="text-xs font-normal text-slate-300 ml-1">/실·월</span>
                  </div>
                  <div className="text-[11px] text-teal-300 font-bold mt-1">
                    전년 동월 ₩{formatCurrency(simulationResult.totalLyRevenue / (175 * simulationResult.periodDays))} 대비 +{input.targetGrowthRate}%
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-400 font-semibold">목표 {input.selectedMonth === 'ANNUAL' ? '연간' : '월'} 총매출액</div>
                  <div className="text-2xl font-black text-amber-300 tabular-nums mt-0.5">
                    {(simulationResult.totalTargetRevenue / 100000000).toFixed(2)}
                    <span className="text-xs font-normal text-slate-300 ml-1">억원</span>
                  </div>
                  <div className="text-[11px] text-amber-300 font-bold mt-1">
                    전년 ₩{(simulationResult.totalLyRevenue / 100000000).toFixed(2)}억 대비 +{((simulationResult.totalTargetRevenue - simulationResult.totalLyRevenue) / 100000000).toFixed(2)}억
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-300 bg-slate-950/40 px-3 py-1.5 rounded-lg border border-white/5">
              💡 <strong>동적 계절성 연동:</strong> 선택하신 월의 42개 영업장별 실측 매출 비중에 따라 목표액이 1원 단위로 자동 분배됩니다.
            </div>
          </div>

        </div>
      </div>

      {/* 3. 🏆 4 Executive KPI Highlight Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 mb-1">
            목표 {input.selectedMonth === 'ANNUAL' ? '연간' : `${input.selectedMonth}월`} 총매출
          </div>
          <div className="text-2xl font-black text-slate-900 tabular-nums">
            {(simulationResult.totalTargetRevenue / 100000000).toFixed(2)} <span className="text-sm font-normal text-slate-500">억원</span>
          </div>
          <div className="text-xs text-teal-700 font-bold mt-1">
            전년비 +{((simulationResult.totalTargetRevenue - simulationResult.totalLyRevenue) / 100000000).toFixed(2)}억원 순증 (+{simulationResult.overallGrowthRate}%)
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 mb-1">
            목표 {input.selectedMonth === 'ANNUAL' ? '월평균' : `${input.selectedMonth}월`} TrevPAR
          </div>
          <div className="text-2xl font-black text-teal-800 tabular-nums">
            ₩{formatCurrency(simulationResult.achievedTrevpar)} <span className="text-sm font-normal text-slate-500">/실·월</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">175실 보유 인프라 1실당 생산성</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 mb-1">전년 동기 대비 성장률</div>
          <div className="text-2xl font-black text-indigo-900 tabular-nums flex items-center gap-1">
            <ArrowUpRight className="w-6 h-6 text-teal-600" />
            +{simulationResult.overallGrowthRate}%
          </div>
          <div className="text-xs text-slate-500 mt-1">전년 실적 ₩{(simulationResult.totalLyRevenue / 100000000).toFixed(2)}억 대비</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 mb-1">캐파 제약(Ceiling) 상태</div>
          <div className="text-lg font-black text-amber-700 flex items-center gap-1.5">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            실시간 캐파 가이드
          </div>
          <div className="text-[11px] text-slate-500 mt-1">{simulationResult.periodDays}일 기준 물리적 상한 검증</div>
        </div>
      </div>

      {/* 4. 🏢 Macro Division 1st Breakdown & Micro Facility Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Division Target Cards (6대 사업부 목표 현황판) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              6대 사업 본부별 {simulationResult.selectedMonthLabel} 목표 분배 현황
            </h3>
            <span className="text-xs text-slate-500 font-semibold">해당 월의 실측 비중 곡선 적용</span>
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
                    그 달의 비중 {div.targetShare}%
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
              {simulationResult.selectedMonthLabel} 부문별 기여 비중
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              전체 {(simulationResult.totalTargetRevenue / 100000000).toFixed(2)}억원 구성 ({simulationResult.selectedMonthLabel})
            </p>
            <ReactECharts option={divisionPieOptions} style={{ height: '320px', width: '100%' }} />
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 text-center">
            💡 해당 월의 실측 비중에 맞춘 최적 목표 분배입니다.
          </div>
        </div>

      </div>

      {/* 5. 🚦 영업장별 2차 세부 실행 계획 & 캐파 신호등 테이블 (42개 실운영 영업장) */}
      <div className="bg-white rounded-[32px] p-7 border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Gauge className="w-5 h-5 text-indigo-600" />
              영업장별 세부 실행 목표 및 물리적 캐파 신호등 ({simulationResult.selectedMonthLabel})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              선택한 달의 실측 매출 비율에 맞춰 각 영업장별 전년 실적 및 목표 매출액이 산출됩니다.
            </p>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs overflow-x-auto">
            {[
              { id: 'ALL', label: `전체 (${capacityMaster.length}개)` },
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
                <th className="py-3.5 px-4 text-right">전년 실적 ({simulationResult.selectedMonthLabel})</th>
                <th className="py-3.5 px-4 text-right font-black text-slate-900">목표 매출액</th>
                <th className="py-3.5 px-4 text-right">전년비 증감</th>
                <th className="py-3.5 px-4 text-center">캐파 상태</th>
                <th className="py-3.5 px-4">시스템 가이드라인 및 조치 사항</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {simulationResult.divisionResults.flatMap(d => d.facilities)
                .filter(f => selectedCategoryFilter === 'ALL' || f.category === selectedCategoryFilter)
                .map((fac) => {
                  const diff = fac.targetRevenue - fac.lyRevenue;
                  const growth = fac.lyRevenue > 0 ? Number(((diff / fac.lyRevenue) * 100).toFixed(1)) : 0;
                  return (
                    <tr key={fac.shopCode} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* Facility Name */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                        {fac.shopName}
                      </td>

                      {/* LY Revenue */}
                      <td className="py-3.5 px-4 text-right tabular-nums text-slate-500">
                        ₩{formatCurrency(fac.lyRevenue)}원
                      </td>

                      {/* Target Revenue */}
                      <td className="py-3.5 px-4 text-right tabular-nums font-black text-indigo-950 bg-indigo-50/20 text-sm">
                        ₩{formatCurrency(fac.targetRevenue)}원
                      </td>

                      {/* Growth / Diff */}
                      <td className="py-3.5 px-4 text-right tabular-nums">
                        <span className={`font-bold text-xs ${growth >= 0 ? 'text-teal-600' : 'text-rose-500'}`}>
                          {growth > 0 ? '+' : ''}{growth}%
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          ({diff >= 0 ? '+' : ''}₩{formatCurrency(diff)}원)
                        </span>
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
                      <td className="py-3.5 px-4 text-slate-600 text-xs leading-relaxed">
                        {fac.statusMessage}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
