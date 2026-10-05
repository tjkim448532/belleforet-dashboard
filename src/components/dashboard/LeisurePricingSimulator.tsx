import { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, TrendingUp, RefreshCw, AlertCircle, Sparkles, 
  Sliders, Layers, RotateCcw, Info, ShoppingBag
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
  { key: '마운틴카트', label: '마운틴카트', color: '#ef4444' },
  { key: '사계절썰매장', label: '사계절썰매장', color: '#f59e0b' },
  { key: '벨포레 목장', label: '벨포레 목장', color: '#10b981' },
  { key: '벨포레 목장(체험)', label: '목장체험', color: '#14b8a6' },
  { key: '미디어아트센터', label: '미디어아트센터', color: '#8b5cf6' },
  { key: '마리나 클럽', label: '마리나 클럽', color: '#0284c7' },
];

const DEMAND_PRESETS = [
  { label: '작년 동일 (0%)', value: 0 },
  { label: '+10% 증가', value: 10 },
  { label: '+20% 증가', value: 20 },
  { label: '+30% 증가', value: 30 },
  { label: '-10% 감소', value: -10 },
];

export default function LeisurePricingSimulator() {
  const [selectedFacility, setSelectedFacility] = useState<string>('마운틴카트');
  const [baseYear, setBaseYear] = useState<number>(2025);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isApiPending, setIsApiPending] = useState<boolean>(false);
  const [apiResponse, setApiResponse] = useState<LeisureTopProductsResponse | null>(null);

  // Price adjustments per item: itemId -> adjusted price
  const [priceAdjustments, setPriceAdjustments] = useState<Record<string, number>>({});
  
  // Demand change percentage (-50% ~ +100%)
  const [demandChangePct, setDemandChangePct] = useState<number>(10);

  // Fetch Top 5 products when selectedFacility or baseYear changes
  const fetchTopProducts = async () => {
    setIsLoading(true);
    try {
      const url = `${API_BASE}/api/v6/report/leisure-top-products?facility=${encodeURIComponent(selectedFacility)}&baseYear=${baseYear}`;
      const res = await secureFetcher(url);
      
      const payload: LeisureTopProductsResponse = res?.data ?? res;
      if (payload?.success && Array.isArray(payload.topProducts) && payload.topProducts.length > 0) {
        setApiResponse(payload);
        setIsApiPending(false);
        // Initialize price adjustments
        const initialPrices: Record<string, number> = {};
        payload.topProducts.forEach((item) => {
          initialPrices[item.itemId] = item.currentPrice;
        });
        setPriceAdjustments(initialPrices);
      } else {
        // API not deployed yet or returned 404/empty
        setIsApiPending(true);
        setApiResponse(null);
      }
    } catch (err: any) {
      console.warn('Leisure top products API pending or error:', err);
      // Treat as API Pending to follow Zero-Mocking & Request-Only principles
      setIsApiPending(true);
      setApiResponse(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTopProducts();
  }, [selectedFacility, baseYear]);

  // Handle single item price change
  const handlePriceChange = (itemId: string, newPrice: number) => {
    const validPrice = Math.max(0, Math.round(newPrice));
    setPriceAdjustments((prev) => ({
      ...prev,
      [itemId]: validPrice,
    }));
  };

  // Quick price offset (+1,000, -1,000 etc.)
  const handleQuickPriceOffset = (itemId: string, offset: number, currentPrice: number) => {
    const currentAdj = priceAdjustments[itemId] !== undefined ? priceAdjustments[itemId] : currentPrice;
    handlePriceChange(itemId, currentAdj + offset);
  };

  // Reset single item price
  const handleResetSinglePrice = (itemId: string, defaultPrice: number) => {
    handlePriceChange(itemId, defaultPrice);
  };

  // Batch markup on all items (+5%, +10%, reset)
  const handleBatchMarkup = (ratePct: number) => {
    if (!apiResponse?.topProducts) return;
    const next: Record<string, number> = {};
    apiResponse.topProducts.forEach((item) => {
      if (ratePct === 0) {
        next[item.itemId] = item.currentPrice;
      } else {
        const factor = 1 + ratePct / 100;
        // Round to nearest 100 won
        next[item.itemId] = Math.round((item.currentPrice * factor) / 100) * 100;
      }
    });
    setPriceAdjustments(next);
  };

  // Compute Simulation Calculations
  const simulationResults = useMemo(() => {
    if (!apiResponse?.topProducts || apiResponse.topProducts.length === 0) {
      return null;
    }

    const demandFactor = 1 + demandChangePct / 100;

    let lyTotalRev = 0;
    let baselineTotalRev = 0; // 전년 고객수 유지 기준
    let adjustedTotalRev = 0; // 고객수 변동 반영 기준

    const monthlyLyTotals = new Array(12).fill(0);
    const monthlyBaselineTotals = new Array(12).fill(0);
    const monthlyAdjustedTotals = new Array(12).fill(0);

    const simulatedItems = apiResponse.topProducts.map((item) => {
      const adjPrice = priceAdjustments[item.itemId] !== undefined ? priceAdjustments[item.itemId] : item.currentPrice;
      const priceDelta = adjPrice - item.currentPrice;
      const priceDeltaPct = item.currentPrice > 0 ? (priceDelta / item.currentPrice) * 100 : 0;

      // Baseline Simulation: same customer volume as LY
      let itemBaselineAnnualRev = 0;
      let itemAdjustedAnnualRev = 0;
      const itemMonthlyBaseline: number[] = [];
      const itemMonthlyAdjusted: number[] = [];

      for (let m = 0; m < 12; m++) {
        const lyMonthlyQty = item.monthlyQty && item.monthlyQty[m] ? item.monthlyQty[m] : 0;
        const lyMonthlyRev = item.monthlyRevenue && item.monthlyRevenue[m] 
          ? item.monthlyRevenue[m] 
          : lyMonthlyQty * item.currentPrice;

        const baselineMonthlyRev = lyMonthlyQty * adjPrice;
        const adjustedMonthlyRev = Math.round(lyMonthlyQty * demandFactor * adjPrice);

        itemBaselineAnnualRev += baselineMonthlyRev;
        itemAdjustedAnnualRev += adjustedMonthlyRev;

        itemMonthlyBaseline.push(baselineMonthlyRev);
        itemMonthlyAdjusted.push(adjustedMonthlyRev);

        monthlyLyTotals[m] += lyMonthlyRev;
        monthlyBaselineTotals[m] += baselineMonthlyRev;
        monthlyAdjustedTotals[m] += adjustedMonthlyRev;
      }

      lyTotalRev += item.lyRevenue;
      baselineTotalRev += itemBaselineAnnualRev;
      adjustedTotalRev += itemAdjustedAnnualRev;

      const baselineDelta = itemBaselineAnnualRev - item.lyRevenue;
      const baselineDeltaPct = item.lyRevenue > 0 ? (baselineDelta / item.lyRevenue) * 100 : 0;

      const adjustedDelta = itemAdjustedAnnualRev - item.lyRevenue;
      const adjustedDeltaPct = item.lyRevenue > 0 ? (adjustedDelta / item.lyRevenue) * 100 : 0;

      return {
        ...item,
        adjPrice,
        priceDelta,
        priceDeltaPct,
        baselineAnnualRev: itemBaselineAnnualRev,
        baselineMonthlyAvg: Math.round(itemBaselineAnnualRev / 12),
        baselineDelta,
        baselineDeltaPct,
        adjustedAnnualRev: itemAdjustedAnnualRev,
        adjustedMonthlyAvg: Math.round(itemAdjustedAnnualRev / 12),
        adjustedDelta,
        adjustedDeltaPct,
        monthlyBaseline: itemMonthlyBaseline,
        monthlyAdjusted: itemMonthlyAdjusted,
      };
    });

    const baselineTotalDelta = baselineTotalRev - lyTotalRev;
    const baselineTotalDeltaPct = lyTotalRev > 0 ? (baselineTotalDelta / lyTotalRev) * 100 : 0;

    const adjustedTotalDelta = adjustedTotalRev - lyTotalRev;
    const adjustedTotalDeltaPct = lyTotalRev > 0 ? (adjustedTotalDelta / lyTotalRev) * 100 : 0;

    return {
      items: simulatedItems,
      lyTotalRev,
      lyMonthlyAvg: Math.round(lyTotalRev / 12),
      baselineTotalRev,
      baselineMonthlyAvg: Math.round(baselineTotalRev / 12),
      baselineTotalDelta,
      baselineTotalDeltaPct,
      adjustedTotalRev,
      adjustedMonthlyAvg: Math.round(adjustedTotalRev / 12),
      adjustedTotalDelta,
      adjustedTotalDeltaPct,
      monthlyLyTotals,
      monthlyBaselineTotals,
      monthlyAdjustedTotals,
    };
  }, [apiResponse, priceAdjustments, demandChangePct]);

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
        textStyle: { fontSize: 11, color: '#475569' },
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
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: { color: '#64748b', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (v: number) => `${Math.round(v / 10000).toLocaleString()}만원`,
          color: '#64748b',
          fontSize: 10,
        },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
      },
      series: [
        {
          name: `${baseYear}년 실적`,
          type: 'bar',
          data: simulationResults.monthlyLyTotals,
          itemStyle: { color: '#94a3b8', borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 16,
        },
        {
          name: '가격조정 (전년 고객수 동일)',
          type: 'bar',
          data: simulationResults.monthlyBaselineTotals,
          itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 16,
        },
        {
          name: `수요조정 (${demandChangePct >= 0 ? `+${demandChangePct}` : demandChangePct}%)`,
          type: 'line',
          data: simulationResults.monthlyAdjustedTotals,
          lineStyle: { width: 3, color: '#10b981' },
          itemStyle: { color: '#10b981' },
          symbolSize: 6,
        },
      ],
    };
  }, [simulationResults, baseYear, demandChangePct]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden space-y-6 p-6 lg:p-8">
      {/* 1. Header & Title */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold mb-2">
            <Sparkles size={14} />
            <span>레저본부 수익성 극대화 솔루션</span>
          </div>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Calculator className="w-6 h-6 text-emerald-600" />
            레저본부 티켓 가격 & 수요 탄력성 시뮬레이터
          </h2>
          <p className="text-xs lg:text-sm text-slate-500 mt-1">
            영업장별 매출 Top 5 티켓의 가격 인상/인하 및 고객수 변동률(+10%, +30% 등)에 따른 예상 월별·연간 매출을 실시간 시뮬레이션합니다.
          </p>
        </div>

        {/* Global Action & Refresh */}
        <div className="flex items-center gap-2 self-start lg:self-auto">
          <button
            onClick={fetchTopProducts}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>새로고침</span>
          </button>
        </div>
      </div>

      {/* 2. Facility Selection Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Layers size={14} className="text-emerald-600" />
            분석 대상 영업장 선택
          </span>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>기준 연도:</span>
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
              {[2024, 2025].map((y) => (
                <button
                  key={y}
                  onClick={() => setBaseYear(y)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                    baseYear === y
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {y}년
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {DEFAULT_FACILITIES.map((fac) => {
            const isSelected = selectedFacility === fac.key;
            return (
              <button
                key={fac.key}
                onClick={() => setSelectedFacility(fac.key)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200/80'
                }`}
              >
                {fac.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. API Pending State (Fail-Stop Principle with Official Backend Ticket Guide) */}
      {isApiPending && (
        <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/70 p-6 lg:p-8 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <AlertCircle size={22} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-amber-950 flex items-center gap-2">
                <span>📡 백엔드 P1 정규 API 배포 대기 중</span>
                <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded-md text-[11px] font-mono font-bold">
                  GET /api/v6/report/leisure-top-products
                </span>
              </h3>
              <p className="text-xs text-amber-800 leading-relaxed">
                대표님/경영진 무관용 원칙(The Bible 1조 및 Zero-Mocking 정책)에 따라 프론트엔드는 임의의 가짜 티켓명이나 단가 숫자를 하드코딩하지 않습니다.
                현재 공식 백엔드 요청서(<code>backend_request.md Section 12</code>)가 작성되었으며, 백엔드 데이터 파이프라인 배포 즉시 실측 Top 5 데이터가 화면에 자동 연동됩니다.
              </p>
            </div>
          </div>

          {/* Backend Request Spec Card */}
          <div className="bg-white rounded-xl p-4 border border-amber-200/80 text-xs text-slate-700 space-y-2">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Info size={14} className="text-amber-600" />
              <span>백엔드 요청 명세 요약 (Section 12)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div className="text-[11px] text-slate-400 font-medium">호출 엔드포인트</div>
                <div className="font-mono font-bold text-slate-800 text-[11px] mt-0.5">
                  /api/v6/report/leisure-top-products
                </div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div className="text-[11px] text-slate-400 font-medium">선택 영업장 / 기준</div>
                <div className="font-bold text-emerald-700 mt-0.5">
                  {selectedFacility} ({baseYear}년 실측 전표 기준)
                </div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div className="text-[11px] text-slate-400 font-medium">수행 기능</div>
                <div className="font-bold text-slate-800 mt-0.5">
                  판매금액 Top 5 상품 + 월별 계절성 Qty 완제품 제공
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 pt-1">
              ※ 백엔드 개발팀의 배포가 완료되면 상단 <b>[새로고침]</b> 버튼을 눌러 즉시 정밀 시뮬레이터를 이용하실 수 있습니다.
            </div>
          </div>
        </div>
      )}

      {/* 4. Active Simulator Interface (When API data is loaded) */}
      {!isApiPending && simulationResults && (
        <div className="space-y-8">
          
          {/* 4-A. Scenario & Demand Elasticity Controls */}
          <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Sliders size={14} className="text-emerald-600" />
                  고객수(수요 탄력성) 변동 시나리오 가정
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  기준 1(작년과 동일한 고객수 0%)과 기준 2(고객 비율 조정)를 동시에 비교합니다.
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
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
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
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <div className="flex items-center gap-1 shrink-0">
                <span className="font-mono font-black text-sm text-emerald-800 w-16 text-right">
                  {demandChangePct > 0 ? `+${demandChangePct}` : demandChangePct}%
                </span>
                <span className="text-xs text-slate-500 font-semibold">변동</span>
              </div>
            </div>

            {/* Batch Markup Controls */}
            <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-600 font-medium">티켓 단가 일괄 조정:</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleBatchMarkup(5)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-md font-medium"
                >
                  전체 +5% 인상
                </button>
                <button
                  onClick={() => handleBatchMarkup(10)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-md font-medium"
                >
                  전체 +10% 인상
                </button>
                <button
                  onClick={() => handleBatchMarkup(20)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-md font-medium"
                >
                  전체 +20% 인상
                </button>
                <button
                  onClick={() => handleBatchMarkup(0)}
                  className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md font-medium flex items-center gap-1"
                >
                  <RotateCcw size={12} />
                  단가 원복
                </button>
              </div>
            </div>
          </div>

          {/* 4-B. Top KPI Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Card 1: LY Baseline Revenue */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500">
                  {baseYear}년 실적 총매출 (Top 5 합계)
                </span>
                <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-bold">
                  실측 기준
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-800 font-mono">
                  {simulationResults.lyTotalRev.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-slate-500">원</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-2">
                월평균: <span className="font-mono font-bold text-slate-600">{simulationResults.lyMonthlyAvg.toLocaleString()}원</span>
              </div>
            </div>

            {/* Card 2: Baseline Simulation (Same Customers, Price Adjusted) */}
            <div className="bg-blue-50/70 rounded-2xl p-5 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-blue-900">
                  예상 연매출 (작년 고객수 동일 기준)
                </span>
                <span className="px-2 py-0.5 bg-blue-200 text-blue-900 rounded text-[10px] font-bold">
                  순수 가격효과
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-blue-950 font-mono">
                  {simulationResults.baselineTotalRev.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-blue-800">원</span>
              </div>
              <div className="flex items-center justify-between text-[11px] mt-2">
                <span className="text-blue-700">
                  월평균: <b className="font-mono">{simulationResults.baselineMonthlyAvg.toLocaleString()}원</b>
                </span>
                <span className={`font-mono font-bold inline-flex items-center gap-0.5 ${
                  simulationResults.baselineTotalDelta >= 0 ? 'text-blue-800' : 'text-rose-700'
                }`}>
                  {simulationResults.baselineTotalDelta >= 0 ? '+' : ''}
                  {simulationResults.baselineTotalDelta.toLocaleString()}원
                  ({simulationResults.baselineTotalDeltaPct >= 0 ? '+' : ''}
                  {simulationResults.baselineTotalDeltaPct.toFixed(1)}%)
                </span>
              </div>
            </div>

            {/* Card 3: Adjusted Simulation (Demand + Price Adjusted) */}
            <div className="bg-emerald-50/80 rounded-2xl p-5 border border-emerald-300 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-950">
                  예상 연매출 (수요 변동 {demandChangePct >= 0 ? `+${demandChangePct}` : demandChangePct}% 반영)
                </span>
                <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded text-[10px] font-bold">
                  수요+가격 종합
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-emerald-950 font-mono">
                  {simulationResults.adjustedTotalRev.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-emerald-900">원</span>
              </div>
              <div className="flex items-center justify-between text-[11px] mt-2">
                <span className="text-emerald-800">
                  월평균: <b className="font-mono">{simulationResults.adjustedMonthlyAvg.toLocaleString()}원</b>
                </span>
                <span className={`font-mono font-bold inline-flex items-center gap-0.5 ${
                  simulationResults.adjustedTotalDelta >= 0 ? 'text-emerald-900' : 'text-rose-700'
                }`}>
                  {simulationResults.adjustedTotalDelta >= 0 ? '+' : ''}
                  {simulationResults.adjustedTotalDelta.toLocaleString()}원
                  ({simulationResults.adjustedTotalDeltaPct >= 0 ? '+' : ''}
                  {simulationResults.adjustedTotalDeltaPct.toFixed(1)}%)
                </span>
              </div>
            </div>

          </div>

          {/* 4-C. Top 5 Products Interactive Pricing Table */}
          <div className="border border-slate-200/80 rounded-2xl overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ShoppingBag size={14} className="text-emerald-600" />
                {selectedFacility} 판매금액 Top 5 상품 상세 및 단가 변경
              </span>
              <span className="text-[11px] text-slate-500">
                각 상품의 단가를 직접 입력하거나 증감 버튼을 클릭하여 시뮬레이션할 수 있습니다.
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-slate-600 border-b border-slate-200 font-bold">
                  <tr>
                    <th className="py-3 px-3 text-center w-12">순위</th>
                    <th className="py-3 px-4">상품명 (티켓)</th>
                    <th className="py-3 px-3 text-right">기준 정가</th>
                    <th className="py-3 px-4 text-center">조정 판매가</th>
                    <th className="py-3 px-3 text-right">전년 수량</th>
                    <th className="py-3 px-4 text-right">전년 실적 매출</th>
                    <th className="py-3 px-4 text-right bg-blue-50/50">예상 연매출 (작년 고객)</th>
                    <th className="py-3 px-4 text-right bg-emerald-50/50">예상 연매출 (수요반영)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60">
                  {simulationResults.items.map((item) => {
                    return (
                      <tr key={item.itemId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-3 text-center">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 font-mono font-bold text-slate-700 text-xs">
                            {item.rank}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div>{item.itemName}</div>
                          <div className="text-[10px] text-slate-400 font-mono font-normal">
                            ID: {item.itemId}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-slate-600">
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
                              className="w-24 px-2 py-1 border border-slate-300 rounded-lg text-right font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                            />
                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => handleQuickPriceOffset(item.itemId, -1000, item.currentPrice)}
                                className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] font-bold"
                              >
                                -1천
                              </button>
                              <button
                                onClick={() => handleQuickPriceOffset(item.itemId, 1000, item.currentPrice)}
                                className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] font-bold"
                              >
                                +1천
                              </button>
                              <button
                                onClick={() => handleResetSinglePrice(item.itemId, item.currentPrice)}
                                title="원복"
                                className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded"
                              >
                                <RotateCcw size={12} />
                              </button>
                            </div>
                          </div>
                          {item.priceDelta !== 0 && (
                            <div className={`text-[10px] font-mono font-bold mt-1 text-right pr-6 ${
                              item.priceDelta > 0 ? 'text-blue-600' : 'text-rose-600'
                            }`}>
                              {item.priceDelta > 0 ? '+' : ''}{item.priceDelta.toLocaleString()}원 ({item.priceDeltaPct > 0 ? '+' : ''}{item.priceDeltaPct.toFixed(1)}%)
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-slate-700">
                          {item.lySoldQty.toLocaleString()}매
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-700">
                          {item.lyRevenue.toLocaleString()}원
                        </td>
                        <td className="py-3.5 px-4 text-right bg-blue-50/30">
                          <div className="font-mono font-bold text-blue-900">
                            {item.baselineAnnualRev.toLocaleString()}원
                          </div>
                          <div className={`text-[10px] font-mono ${
                            item.baselineDelta >= 0 ? 'text-blue-700' : 'text-rose-600'
                          }`}>
                            {item.baselineDelta >= 0 ? '+' : ''}{item.baselineDelta.toLocaleString()}원
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right bg-emerald-50/40">
                          <div className="font-mono font-black text-emerald-950">
                            {item.adjustedAnnualRev.toLocaleString()}원
                          </div>
                          <div className={`text-[10px] font-mono font-bold ${
                            item.adjustedDelta >= 0 ? 'text-emerald-800' : 'text-rose-600'
                          }`}>
                            {item.adjustedDelta >= 0 ? '+' : ''}{item.adjustedDelta.toLocaleString()}원
                            ({item.adjustedDeltaPct >= 0 ? '+' : ''}{item.adjustedDeltaPct.toFixed(1)}%)
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={5} className="py-3 px-4 text-center font-black text-slate-800">
                      Top 5 상품 합계
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-900">
                      {simulationResults.lyTotalRev.toLocaleString()}원
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-blue-950 bg-blue-100/50">
                      {simulationResults.baselineTotalRev.toLocaleString()}원
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-950 bg-emerald-100/60 font-black">
                      {simulationResults.adjustedTotalRev.toLocaleString()}원
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 4-D. Monthly Seasonality Projection EChart */}
          <div className="border border-slate-200/80 rounded-2xl p-5 bg-white space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <TrendingUp size={16} className="text-emerald-600" />
                  월별 계절성(1~12월) 매출 시뮬레이션 추이
                </h4>
                <p className="text-[11px] text-slate-500">
                  각 월의 실측 판매 비중에 따라 시뮬레이션된 월별 예상 매출을 비교합니다.
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
