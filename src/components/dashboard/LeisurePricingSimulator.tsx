import { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, TrendingUp, RefreshCw, AlertCircle, Sparkles, 
  Sliders, Layers, RotateCcw, ShoppingBag, Calendar
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { secureFetcher } from '../../lib/secureFetcher';
import type { 
  LeisureTopProductsResponse
} from '../../types/reports-v2';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

interface FacilityOption {
  key: string;
  label: string;
  color?: string;
}

const DEFAULT_FACILITIES: FacilityOption[] = [
  { key: '놀이동산', label: '놀이동산', color: '#3b82f6' },
  { key: '마운틴카트(그랜드포렛)', label: '마운틴카트(그랜드)', color: '#ef4444' },
  { key: '마운틴카트(미니포렛)', label: '마운틴카트(미니)', color: '#f97316' },
  { key: '사계절썰매장', label: '사계절썰매장', color: '#f59e0b' },
  { key: '벨포레 목장', label: '벨포레 목장', color: '#10b981' },
  { key: '벨포레 목장(체험)', label: '목장체험', color: '#14b8a6' },
  { key: '미디어아트센터', label: '미디어아트센터', color: '#8b5cf6' },
  { key: '마리나 클럽', label: '마리나 클럽', color: '#0284c7' },
];

const DEMAND_PRESETS = [
  { label: '동일 고객 (0%)', value: 0 },
  { label: '+10% 증가', value: 10 },
  { label: '+20% 증가', value: 20 },
  { label: '+30% 증가', value: 30 },
  { label: '-10% 감소', value: -10 },
];

export default function LeisurePricingSimulator() {
  const [selectedFacility, setSelectedFacility] = useState<string>('마운틴카트(그랜드포렛)');
  // 가장 마지막 연도 (현재는 2026년) 실적 누적 기준
  const [baseYear, setBaseYear] = useState<number>(2026);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isApiPending, setIsApiPending] = useState<boolean>(false);
  const [apiResponse, setApiResponse] = useState<LeisureTopProductsResponse | null>(null);

  // Price adjustments per item: itemId -> adjusted price
  const [priceAdjustments, setPriceAdjustments] = useState<Record<string, number>>({});
  
  // Track active batch markup preset (0 = normal, 5, 10, 20, -1 = custom)
  const [activeMarkup, setActiveMarkup] = useState<number>(0);

  // Demand change percentage (-50% ~ +100%). Default to 0%!
  const [demandChangePct, setDemandChangePct] = useState<number>(0);

  // Fetch Top 5 products & Backend Simulation Results when selectedFacility, baseYear, priceAdjustments, demandChangePct, or activeMarkup changes
  const fetchTopProducts = async () => {
    setIsLoading(true);
    try {
      const priceAdjParam = encodeURIComponent(JSON.stringify(priceAdjustments));
      const url = `${API_BASE}/api/v6/report/leisure-top-products?facility=${encodeURIComponent(selectedFacility)}&baseYear=${baseYear}&demandChangePct=${demandChangePct}&activeMarkup=${activeMarkup}&priceAdjustments=${priceAdjParam}`;
      const res = await secureFetcher(url);
      
      const payload: LeisureTopProductsResponse = res?.data ?? res;
      if (payload?.success && Array.isArray(payload.topProducts) && payload.topProducts.length > 0) {
        const sortedTop5 = [...payload.topProducts].slice(0, 5);

        const normalizedPayload: LeisureTopProductsResponse = {
          ...payload,
          topProducts: sortedTop5,
        };

        setApiResponse(normalizedPayload);
        setIsApiPending(false);
        if (Object.keys(priceAdjustments).length === 0) {
          const initialPrices: Record<string, number> = {};
          sortedTop5.forEach((item) => {
            initialPrices[item.itemId] = item.currentPrice;
          });
          setPriceAdjustments(initialPrices);
        }
      } else {
        setIsApiPending(true);
        setApiResponse(null);
      }
    } catch (err: any) {
      console.warn('Leisure top products API pending or error:', err);
      setIsApiPending(true);
      setApiResponse(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setPriceAdjustments({});
    setActiveMarkup(0);
    setDemandChangePct(0);
  }, [selectedFacility, baseYear]);

  useEffect(() => {
    fetchTopProducts();
  }, [selectedFacility, baseYear, demandChangePct, activeMarkup, priceAdjustments]);

  // Handle single item price change
  const handlePriceChange = (itemId: string, newPrice: number) => {
    const validPrice = Math.max(0, Math.round(newPrice));
    setActiveMarkup(-1); // Set to custom
    setPriceAdjustments((prev) => ({
      ...prev,
      [itemId]: validPrice,
    }));
  };

  // Reset single item price
  const handleResetSinglePrice = (itemId: string, defaultPrice: number) => {
    handlePriceChange(itemId, defaultPrice);
  };

  // Batch markup on all items (+5%, +10%, reset) — delegated to Backend Simulation Engine
  const handleBatchMarkup = (ratePct: number) => {
    setActiveMarkup(ratePct);
    if (ratePct === 0 && apiResponse?.topProducts) {
      const next: Record<string, number> = {};
      apiResponse.topProducts.forEach((item) => {
        next[item.itemId] = item.currentPrice;
      });
      setPriceAdjustments(next);
    }
  };

  // Reset all to clean LY baseline (0% price markup, 0% demand change)
  const handleResetAll = () => {
    setDemandChangePct(0);
    handleBatchMarkup(0);
  };

  // 1:1 Passthrough of Simulation Results from Backend API (Zero Client-Side Simulation Arithmetic)
  const simulationResults = useMemo(() => {
    if (!apiResponse?.topProducts || apiResponse.topProducts.length === 0) {
      return null;
    }

    const backendSim = (apiResponse as any)?.simulationResults ?? apiResponse;
    const simulatedItems = apiResponse.topProducts.map((item: any) => {
      const adjPrice = priceAdjustments[item.itemId] !== undefined
        ? priceAdjustments[item.itemId]
        : Number(item.adjPrice ?? item.currentPrice ?? 0);

      return {
        ...item,
        adjPrice,
        priceDelta: Number(item.priceDelta ?? 0),
        priceDeltaPct: Number(item.priceDeltaPct ?? 0),
        baselineAnnualRev: Number(item.baselineAnnualRev ?? item.lyRevenue ?? 0),
        baselineMonthlyAvg: Number(item.baselineMonthlyAvg ?? 0),
        baselineDelta: Number(item.baselineDelta ?? 0),
        baselineDeltaPct: Number(item.baselineDeltaPct ?? 0),
        adjustedAnnualRev: Number(item.adjustedAnnualRev ?? item.lyRevenue ?? 0),
        adjustedMonthlyAvg: Number(item.adjustedMonthlyAvg ?? 0),
        adjustedDelta: Number(item.adjustedDelta ?? 0),
        adjustedDeltaPct: Number(item.adjustedDeltaPct ?? 0),
        monthlyBaseline: Array.isArray(item.monthlyBaseline) ? item.monthlyBaseline : [],
        monthlyAdjusted: Array.isArray(item.monthlyAdjusted) ? item.monthlyAdjusted : [],
      };
    });

    return {
      items: simulatedItems,
      lyTotalRev: Number(backendSim?.lyTotalRev ?? backendSim?.totalLyRevenue ?? 0),
      lyMonthlyAvg: Number(backendSim?.lyMonthlyAvg ?? 0),
      baselineTotalRev: Number(backendSim?.baselineTotalRev ?? backendSim?.lyTotalRev ?? 0),
      baselineMonthlyAvg: Number(backendSim?.baselineMonthlyAvg ?? 0),
      baselineTotalDelta: Number(backendSim?.baselineTotalDelta ?? 0),
      baselineTotalDeltaPct: Number(backendSim?.baselineTotalDeltaPct ?? 0),
      adjustedTotalRev: Number(backendSim?.adjustedTotalRev ?? backendSim?.lyTotalRev ?? 0),
      adjustedMonthlyAvg: Number(backendSim?.adjustedMonthlyAvg ?? 0),
      adjustedTotalDelta: Number(backendSim?.adjustedTotalDelta ?? 0),
      adjustedTotalDeltaPct: Number(backendSim?.adjustedTotalDeltaPct ?? 0),
      monthlyLyTotals: Array.isArray(backendSim?.monthlyLyTotals) ? backendSim.monthlyLyTotals : new Array(12).fill(0),
      monthlyBaselineTotals: Array.isArray(backendSim?.monthlyBaselineTotals) ? backendSim.monthlyBaselineTotals : new Array(12).fill(0),
      monthlyAdjustedTotals: Array.isArray(backendSim?.monthlyAdjustedTotals) ? backendSim.monthlyAdjustedTotals : new Array(12).fill(0),
    };
  }, [apiResponse, priceAdjustments]);

  // ECharts Option for Monthly Simulated Revenue
  const chartOption = useMemo(() => {
    if (!simulationResults) return {};

    const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          let tip = `<div class="font-bold text-sm mb-1">${params[0]?.axisValueLabel || ''}</div>`;
          params.forEach((p: any) => {
            const val = typeof p.value === 'number' ? `${p.value.toLocaleString()}원` : '-';
            tip += `<div class="flex items-center justify-between gap-4 text-xs">
              <span class="flex items-center gap-1">${p.marker} ${p.seriesName}</span>
              <span class="font-mono font-bold">${val}</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: {
        top: 0,
        right: 0,
        textStyle: { fontSize: 11, color: '#5A6B63' },
      },
      grid: {
        left: '2%',
        right: '2%',
        bottom: '8%',
        top: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: months,
        axisLine: { lineStyle: { color: '#D0C6BB' } },
        axisLabel: { color: '#5A6B63', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (v: number) => `${v.toLocaleString()}원`,
          color: '#5A6B63',
          fontSize: 10,
        },
        splitLine: { lineStyle: { color: '#E8E5DF', type: 'dashed' } },
      },
      series: [
        {
          name: `${baseYear}년 실적`,
          type: 'bar',
          data: simulationResults.monthlyLyTotals,
          itemStyle: { color: '#8E9E96', borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 16,
        },
        {
          name: `가격조정 (${baseYear}년 고객수 동일)`,
          type: 'bar',
          data: simulationResults.monthlyBaselineTotals,
          itemStyle: { color: '#B59269', borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 16,
        },
        {
          name: `수요조정 (${demandChangePct >= 0 ? `+${demandChangePct}` : demandChangePct}%)`,
          type: 'line',
          data: simulationResults.monthlyAdjustedTotals,
          lineStyle: { width: 3, color: '#284F42' },
          itemStyle: { color: '#284F42' },
          symbolSize: 6,
        },
      ],
    };
  }, [simulationResults, baseYear, demandChangePct]);

  return (
    <div className="bg-white rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] overflow-hidden space-y-6 p-6 lg:p-8">
      {/* 1. Header & Title */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#D0C6BB]/40">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]/70 rounded-full text-xs font-bold mb-2">
            <Sparkles size={14} />
            <span>레저본부 수익성 극대화 솔루션</span>
          </div>
          <h2 className="text-xl lg:text-2xl font-bold text-[#1B382E] flex items-center gap-2.5">
            <Calculator className="w-6 h-6 text-[#284F42]" />
            레저본부 티켓 가격 & 수요 탄력성 시뮬레이터
          </h2>
          <p className="text-xs lg:text-sm text-[#5A6B63] mt-1">
            영업장별 {baseYear}년 누적 트랜잭션 판매금액 Top 5 티켓의 가격 인상/인하 및 고객수 변동률(+10%, +30% 등)에 따른 예상 월별·연간 매출을 실시간 시뮬레이션합니다.
          </p>
        </div>

        {/* Global Action & Refresh */}
        <div className="flex items-center gap-2 self-start lg:self-auto">
          <button
            onClick={fetchTopProducts}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#F4F3EE] hover:bg-[#D0C6BB]/30 text-[#1B382E] border border-[#D0C6BB]/60 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>새로고침</span>
          </button>
        </div>
      </div>

      {/* 2. Benchmark Year & Status Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#F4F3EE] p-4 rounded-2xl border border-[#D0C6BB]/60 shadow-2xs">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#284F42] text-white rounded-xl text-xs font-bold shadow-xs">
            <Calendar size={14} />
            <span>분석 기준 연도: {baseYear}년 실측 데이터</span>
          </div>
          <span className="text-xs font-bold text-[#1B382E] flex items-center gap-1.5">
            {baseYear === 2026 ? (
              <>
                <span className="inline-block w-2 h-2 rounded-full bg-[#5FB878] animate-pulse"></span>
                <strong className="text-[#1B382E] font-black">2026년 누적 실적(Jan~Oct YTD)</strong> 트랜잭션 판매금액 Top 5 기준
              </>
            ) : (
              <>
                <span className="inline-block w-2 h-2 rounded-full bg-[#8E9E96]"></span>
                <strong className="text-[#1B382E] font-bold">{baseYear}년 연간 마감 실적</strong> 트랜잭션 판매금액 Top 5 기준
              </>
            )}
          </span>
        </div>

        {/* Prominent Year Selector */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-[#D0C6BB]/60 shadow-2xs self-start md:self-auto">
          <span className="text-[11px] font-bold text-[#5A6B63] pl-2 pr-1">기준 연도 변경:</span>
          {[2026, 2025, 2024].map((y) => (
            <button
              key={y}
              onClick={() => setBaseYear(y)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                baseYear === y
                  ? 'bg-[#284F42] text-white shadow-xs font-black'
                  : 'text-[#5A6B63] hover:bg-[#F4F3EE] hover:text-[#1B382E]'
              }`}
            >
              <span>{y}년</span>
              {y === 2026 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-black ${
                  baseYear === 2026 ? 'bg-white/20 text-white' : 'bg-[#E8F2EE] text-[#1E523F]'
                }`}>
                  최신
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Facility Selection Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <span className="text-xs font-bold text-[#1B382E] flex items-center gap-1.5">
            <Layers size={14} className="text-[#284F42]" />
            <span>분석 대상 영업장 선택:</span>
            <strong className="text-[#1B382E] font-black px-2 py-0.5 bg-[#F4F3EE] rounded-md border border-[#D0C6BB]/60">
              {selectedFacility}
            </strong>
          </span>
          <span className="text-[11px] text-[#5A6B63] font-medium">
            현재 <strong>{selectedFacility}</strong>의 <strong className="text-[#284F42] font-bold">{baseYear}년 누적 트랜잭션 매출 상위 5개 상품</strong>을 시뮬레이션 중입니다.
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {DEFAULT_FACILITIES.map((fac) => {
            const isSelected = selectedFacility === fac.key;
            return (
              <button
                key={fac.key}
                onClick={() => setSelectedFacility(fac.key)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  isSelected
                    ? 'bg-[#284F42] text-white border-[#284F42] shadow-xs'
                    : 'bg-[#F4F3EE] hover:bg-white text-[#5A6B63] border-[#D0C6BB]/60 hover:text-[#1B382E]'
                }`}
              >
                {fac.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Empty / Pending State */}
      {isApiPending && (
        <div className="rounded-2xl border border-[#D0C6BB]/60 bg-[#F4F3EE]/70 p-6 lg:p-8 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white text-[#5A6B63] border border-[#D0C6BB]/60 flex items-center justify-center shrink-0">
              <AlertCircle size={22} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#1B382E]">
                실적 데이터 집계 안내
              </h3>
              <p className="text-xs text-[#5A6B63] leading-relaxed">
                선택하신 <b>{selectedFacility}</b>의 상품별 실적 집계 데이터가 없습니다. 상단에서 다른 영업장을 선택하시거나 잠시 후 다시 확인해 주시기 바랍니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. Active Simulator Interface (When API data is loaded) */}
      {!isApiPending && simulationResults && (
        <div className="space-y-8">
          
          {/* 4-A. Scenario & Demand Elasticity Controls */}
          <div className="bg-[#F4F3EE]/80 rounded-2xl p-5 border border-[#D0C6BB]/60 space-y-4">
            
            {/* Step 1: Ticket Pricing Adjustment */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D0C6BB]/40">
              <div>
                <span className="text-xs font-bold text-[#1B382E] flex items-center gap-1.5">
                  <ShoppingBag size={14} className="text-[#284F42]" />
                  [1단계] {baseYear}년 실측 단가 기준 티켓 판매가 조정
                </span>
                <span className="text-[11px] text-[#5A6B63] mt-0.5 block">
                  {baseYear}년 실측 평균 단가 기준 인상/인하율을 일괄 적용하거나, 하단 표에서 상품별 단가를 직접 수정합니다.
                </span>
              </div>

              {/* Batch Markup Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => handleBatchMarkup(0)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    activeMarkup === 0
                      ? 'bg-[#284F42] text-white shadow-xs'
                      : 'bg-white hover:bg-[#F4F3EE] text-[#5A6B63] border border-[#D0C6BB]/60'
                  }`}
                >
                  <RotateCcw size={12} />
                  정상가 (0% 원복)
                </button>
                <button
                  onClick={() => handleBatchMarkup(5)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeMarkup === 5
                      ? 'bg-[#B59269] text-white shadow-xs'
                      : 'bg-white hover:bg-[#F4F3EE] text-[#5A6B63] border border-[#D0C6BB]/60'
                  }`}
                >
                  전체 +5% 인상
                </button>
                <button
                  onClick={() => handleBatchMarkup(10)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeMarkup === 10
                      ? 'bg-[#B59269] text-white shadow-xs'
                      : 'bg-white hover:bg-[#F4F3EE] text-[#5A6B63] border border-[#D0C6BB]/60'
                  }`}
                >
                  전체 +10% 인상
                </button>
                <button
                  onClick={() => handleBatchMarkup(20)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeMarkup === 20
                      ? 'bg-[#B59269] text-white shadow-xs'
                      : 'bg-white hover:bg-[#F4F3EE] text-[#5A6B63] border border-[#D0C6BB]/60'
                  }`}
                >
                  전체 +20% 인상
                </button>
                {activeMarkup === -1 && (
                  <span className="px-2.5 py-1 bg-[#FDF0ED] text-[#8B2635] rounded-lg text-xs font-bold border border-[#EAC5BD]">
                    직접 단가 조정 중
                  </span>
                )}
              </div>
            </div>

            {/* Step 2: Customer Demand Elasticity */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-[#1B382E] flex items-center gap-1.5">
                    <Sliders size={14} className="text-[#284F42]" />
                    [2단계] 고객수(수요 탄력성) 변동 시나리오
                  </span>
                  <span className="text-[11px] text-[#5A6B63] mt-0.5 block">
                    기준 연도({baseYear}년) 실측 고객수(0%) 기준과 고객 비율 조정(+10%, +30% 등) 시나리오를 동시 비교합니다.
                  </span>
                </div>

                {/* Demand Presets */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {DEMAND_PRESETS.map((p) => {
                    const isActive = demandChangePct === p.value;
                    return (
                      <button
                        key={p.value}
                        onClick={() => setDemandChangePct(p.value)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#284F42] text-white shadow-xs'
                            : 'bg-white hover:bg-[#F4F3EE] text-[#5A6B63] border border-[#D0C6BB]/60'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                  <button
                    onClick={handleResetAll}
                    title="단가와 고객수를 모두 0%로 초기화합니다."
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#D0C6BB]/40 hover:bg-[#D0C6BB]/70 text-[#1B382E] transition-all flex items-center gap-1 ml-1 cursor-pointer"
                  >
                    <RotateCcw size={12} />
                    전체 리셋 (0%)
                  </button>
                </div>
              </div>

              {/* Slider & Input */}
              <div className="flex items-center gap-4 pt-1">
                <input
                  type="range"
                  min={-50}
                  max={100}
                  step={1}
                  value={demandChangePct}
                  onChange={(e) => setDemandChangePct(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-[#D0C6BB]/40 rounded-lg appearance-none cursor-pointer accent-[#284F42]"
                />
                <div className="flex items-center gap-1 shrink-0">
                  <span className="font-mono font-black text-sm text-[#1B382E] w-16 text-right">
                    {demandChangePct > 0 ? `+${demandChangePct}` : demandChangePct}%
                  </span>
                  <span className="text-xs text-[#5A6B63] font-semibold">고객 변동</span>
                </div>
              </div>
            </div>

          </div>

          {/* 4-B. Top KPI Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Card 1: LY Baseline Revenue */}
            <div className="bg-white rounded-2xl p-5 border border-[#D0C6BB]/60 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-[#5A6B63]">
                  {baseYear}년 실적 총매출 (Top 5)
                </span>
                <span className="px-2 py-0.5 bg-[#F4F3EE] text-[#5A6B63] border border-[#D0C6BB]/60 rounded text-[10px] font-bold">
                  {baseYear}년 실측 전표 기준
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-[#1B382E] font-mono">
                  {simulationResults.lyTotalRev.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-[#5A6B63]">원</span>
              </div>
              <div className="text-[11px] text-[#5A6B63] mt-2">
                월평균: <span className="font-mono font-bold text-[#1B382E]">{simulationResults.lyMonthlyAvg.toLocaleString()}원</span> ({baseYear}년 실측)
              </div>
            </div>

            {/* Card 2: Baseline Simulation (Same Customers, Price Adjusted) */}
            <div className="bg-[#F4F3EE] rounded-2xl p-5 border border-[#D0C6BB]/70 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-[#1B382E] flex items-center gap-1.5">
                  <span>예상 연매출 ({baseYear}년 고객수 유지)</span>
                </span>
                <span className="px-2 py-0.5 bg-[#B59269] text-white rounded text-[10px] font-bold">
                  단가 변경 효과
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-[#1B382E] font-mono">
                  {simulationResults.baselineTotalRev.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-[#5A6B63]">원</span>
              </div>
              <div className="flex items-center justify-between text-[11px] mt-2">
                <span className="text-[#5A6B63]">
                  월평균: <b className="font-mono text-[#1B382E]">{simulationResults.baselineMonthlyAvg.toLocaleString()}원</b>
                </span>
                {simulationResults.baselineTotalDelta === 0 ? (
                  <span className="font-mono font-bold text-[#5A6B63] bg-white px-2 py-0.5 rounded text-[11px] border border-[#D0C6BB]/60">
                    {baseYear}년과 동일 (+0원, 0.0%)
                  </span>
                ) : (
                  <span className={`font-mono font-bold inline-flex items-center gap-0.5 ${
                    simulationResults.baselineTotalDelta > 0 ? 'text-[#1E523F]' : 'text-[#8B2635]'
                  }`}>
                    {simulationResults.baselineTotalDelta > 0 ? '+' : ''}
                    {simulationResults.baselineTotalDelta.toLocaleString()}원
                    ({simulationResults.baselineTotalDeltaPct > 0 ? '+' : ''}
                    {simulationResults.baselineTotalDeltaPct.toFixed(1)}%)
                  </span>
                )}
              </div>
              {simulationResults.baselineTotalDelta > 0 && (
                <div className="text-[10px] text-[#5A6B63] mt-1.5 font-medium">
                  ※ 고객수는 {baseYear}년과 동일하나, 티켓 단가 인상으로 매출 증가
                </div>
              )}
            </div>

            {/* Card 3: Adjusted Simulation (Demand + Price Adjusted) */}
            <div className="bg-[#E8F2EE] rounded-2xl p-5 border border-[#B4C6C1]/70 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-[#1E523F] flex items-center gap-1.5">
                  <span>예상 연매출 ({baseYear}년 대비 수요 {demandChangePct >= 0 ? `+${demandChangePct}` : demandChangePct}% 반영)</span>
                </span>
                <span className="px-2 py-0.5 bg-[#284F42] text-white rounded text-[10px] font-bold">
                  수요+단가 종합
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-[#1E523F] font-mono">
                  {simulationResults.adjustedTotalRev.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-[#1E523F]">원</span>
              </div>
              <div className="flex items-center justify-between text-[11px] mt-2">
                <span className="text-[#1E523F]/80">
                  월평균: <b className="font-mono">{simulationResults.adjustedMonthlyAvg.toLocaleString()}원</b>
                </span>
                {simulationResults.adjustedTotalDelta === 0 ? (
                  <span className="font-mono font-bold text-[#5A6B63] bg-white px-2 py-0.5 rounded text-[11px] border border-[#D0C6BB]/60">
                    {baseYear}년과 동일 (+0원, 0.0%)
                  </span>
                ) : (
                  <span className={`font-mono font-bold inline-flex items-center gap-0.5 ${
                    simulationResults.adjustedTotalDelta > 0 ? 'text-[#1E523F]' : 'text-[#8B2635]'
                  }`}>
                    {simulationResults.adjustedTotalDelta > 0 ? '+' : ''}
                    {simulationResults.adjustedTotalDelta.toLocaleString()}원
                    ({simulationResults.adjustedTotalDeltaPct > 0 ? '+' : ''}
                    {simulationResults.adjustedTotalDeltaPct.toFixed(1)}%)
                  </span>
                )}
              </div>
              {simulationResults.adjustedTotalDelta === 0 && (
                <div className="text-[10px] text-[#5A6B63] mt-1.5 font-medium">
                  ※ 단가 및 고객수 변동이 없어 {baseYear}년 실적과 100% 동일합니다.
                </div>
              )}
            </div>

          </div>

          {/* 4-C. Top 5 Products Interactive Pricing Table */}
          <div className="border border-[#D0C6BB]/75 rounded-2xl overflow-hidden shadow-2xs">
            <div className="p-4 bg-[#F4F3EE] border-b border-[#D0C6BB]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-[#1B382E] flex items-center gap-1.5">
                  <ShoppingBag size={15} className="text-[#284F42]" />
                  <span>{selectedFacility} 판매금액 Top 5 상품 상세 및 단가 변경</span>
                </span>
                <span className="px-2 py-0.5 bg-[#E8F2EE] text-[#1E523F] rounded-md text-[10px] font-bold border border-[#B4C6C1]/70">
                  {baseYear}년 누적 트랜잭션 기준
                </span>
              </div>
              <span className="text-[11px] text-[#5A6B63] font-medium">
                가장 마지막 연도({baseYear}년) 누적 중 가장 많이 팔린 트랜잭션 판매금액(순매출) 상위 5개 상품입니다.
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F4F3EE] text-[#1B382E] border-b border-[#D0C6BB]/75 font-bold">
                  <tr>
                    <th className="py-3.5 px-3 text-center w-12">순위</th>
                    <th className="py-3.5 px-4 text-left">상품명 (티켓)</th>
                    <th className="py-3.5 px-3 text-right">기준 정가 ({baseYear}년)</th>
                    <th className="py-3.5 px-4 text-center">조정 판매가</th>
                    <th className="py-3.5 px-3 text-right">{baseYear}년 수량</th>
                    <th className="py-3.5 px-4 text-right">{baseYear}년 누적 매출</th>
                    <th className="py-3.5 px-4 text-right bg-[#F4F3EE]/60">예상 연매출 ({baseYear}년 고객)</th>
                    <th className="py-3.5 px-4 text-right bg-[#E8F2EE]/50">예상 연매출 (수요반영)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D0C6BB]/30">
                  {simulationResults.items.map((item) => {
                    return (
                      <tr key={item.itemId} className="hover:bg-[#F4F3EE]/50 transition-colors">
                        <td className="py-3.5 px-3 text-center">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#F4F3EE] border border-[#D0C6BB]/60 font-mono font-bold text-[#1B382E] text-xs">
                            {item.rank}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#1B382E]">
                          <div>{item.itemName}</div>
                          <div className="text-[10px] text-[#5A6B63] font-mono font-normal">
                            ID: {item.itemId}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-[#5A6B63]">
                          {item.currentPrice.toLocaleString()}원
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              step={500}
                              value={item.adjPrice}
                              onChange={(e) => handlePriceChange(item.itemId, Number(e.target.value))}
                              className="w-24 px-2 py-1 border border-[#D0C6BB] rounded-lg text-right font-mono font-bold text-[#1B382E] focus:outline-none focus:ring-2 focus:ring-[#284F42] text-xs"
                            />
                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => handleResetSinglePrice(item.itemId, item.currentPrice)}
                                title="원복"
                                className="p-1 hover:bg-[#F4F3EE] text-[#5A6B63] hover:text-[#1B382E] rounded cursor-pointer"
                              >
                                <RotateCcw size={12} />
                              </button>
                            </div>
                          </div>
                          {item.priceDelta !== 0 && (
                            <div className={`text-[10px] font-mono font-bold mt-1 text-right pr-6 ${
                              item.priceDelta > 0 ? 'text-[#1E523F]' : 'text-[#8B2635]'
                            }`}>
                              {item.priceDelta > 0 ? '+' : ''}{item.priceDelta.toLocaleString()}원 ({item.priceDeltaPct > 0 ? '+' : ''}{item.priceDeltaPct.toFixed(1)}%)
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-[#5A6B63]">
                          {item.lySoldQty.toLocaleString()}매
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-[#1B382E]">
                          {item.lyRevenue.toLocaleString()}원
                        </td>
                        <td className="py-3.5 px-4 text-right bg-[#F4F3EE]/40">
                          <div className="font-mono font-bold text-[#1B382E]">
                            {item.baselineAnnualRev.toLocaleString()}원
                          </div>
                          <div className={`text-[10px] font-mono ${
                            item.baselineDelta >= 0 ? 'text-[#1E523F]' : 'text-[#8B2635]'
                          }`}>
                            {item.baselineDelta >= 0 ? '+' : ''}{item.baselineDelta.toLocaleString()}원
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right bg-[#E8F2EE]/30">
                          <div className="font-mono font-black text-[#1E523F]">
                            {item.adjustedAnnualRev.toLocaleString()}원
                          </div>
                          <div className={`text-[10px] font-mono font-bold ${
                            item.adjustedDelta >= 0 ? 'text-[#1E523F]' : 'text-[#8B2635]'
                          }`}>
                            {item.adjustedDelta >= 0 ? '+' : ''}{item.adjustedDelta.toLocaleString()}원
                            ({item.adjustedDeltaPct >= 0 ? '+' : ''}{item.adjustedDeltaPct.toFixed(1)}%)
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-[#F4F3EE] font-bold border-t-2 border-[#D0C6BB]/75">
                  <tr>
                    <td colSpan={5} className="py-3 px-4 text-center font-black text-[#1B382E]">
                      Top 5 상품 합계 ({baseYear}년 누적 실적)
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[#1B382E]">
                      {simulationResults.lyTotalRev.toLocaleString()}원
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[#1B382E] bg-[#F4F3EE]">
                      {simulationResults.baselineTotalRev.toLocaleString()}원
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[#1E523F] bg-[#E8F2EE] font-black">
                      {simulationResults.adjustedTotalRev.toLocaleString()}원
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 4-D. Monthly Seasonality Projection EChart */}
          <div className="border border-[#D0C6BB]/75 rounded-2xl p-5 bg-white space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-[#1B382E] flex items-center gap-1.5 flex-wrap">
                  <TrendingUp size={16} className="text-[#284F42]" />
                  <span>{selectedFacility} 월별 계절성(1~12월) 매출 시뮬레이션 추이</span>
                  <span className="px-2 py-0.5 bg-[#E8F2EE] text-[#1E523F] rounded-md text-[11px] font-bold border border-[#B4C6C1]/70">
                    {baseYear}년 실측 기준
                  </span>
                </h4>
                <p className="text-[11px] text-[#5A6B63] mt-0.5">
                  {baseYear}년 각 월의 실측 판매 비중에 따라 시뮬레이션된 월별 예상 매출을 대조합니다.
                </p>
              </div>
            </div>
            <div className="w-full h-[320px]">
              <ReactECharts option={chartOption} style={{ height: '100%', width: '100%' }} notMerge={true} />
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
