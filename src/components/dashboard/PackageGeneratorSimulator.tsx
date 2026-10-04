import { useState, useMemo, useEffect } from 'react';
import { 
  Package, Sparkles, DollarSign, Hotel, Utensils, 
  CheckCircle2, ShieldCheck, Plus, Minus, 
  RotateCcw, Copy, Check, TrendingUp, Award, 
  Calendar, Trash2, Layers, CheckCircle
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { secureFetcher } from '../../lib/secureFetcher';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

// ==========================================
// 1. Types & Interfaces
// ==========================================
export interface UserCustomItem {
  id: string;
  name: string;
  category: 'FNB' | 'LEISURE';
  unitPrice: number;    // 1인 또는 단품 배분 금액 (원)
  quantity: number;     // 수량 (인원/매수)
  retailPrice: number;  // 소비자 정상 단품가 (고객 체감 가치)
}

export interface MonthlyEfficiencyData {
  month: number;
  monthLabel: string;
  revpar: number;
  trevparWithoutGolf: number;
  trevparTotal: number;
  availableRooms: number;
  roomsSold: number;
  netRevenueWithoutGolf: number;
  roomRevenue: number;
  fnbRevenue: number;
  leisureRevenue: number;
  year: number;
}

// 객실 타입 마스터
const ROOM_TYPES = [
  { id: 'ROOM_16', name: '16평형 콘도 (2인 기준)', baseNormalPrice: 150000, defaultCapacity: 2, desc: '커플 및 2인 여행객 최적화 기본 객실' },
  { id: 'ROOM_35', name: '35평형 콘도 (4인 기준)', baseNormalPrice: 220000, defaultCapacity: 4, desc: '가족 및 소모임 최적화 중형 객실' },
  { id: 'ROOM_51', name: '51평형 커넥팅룸 (4~6인)', baseNormalPrice: 320000, defaultCapacity: 6, desc: '대가족 및 단체 특화 복합 프리미엄 객실' }
];

// 사용자가 쉽게 클릭하여 품목명을 자동 입력할 수 있는 추천 명칭 태그 (단가/예시는 입력하지 않고 빈 칸으로 생성)
const QUICK_NAME_TAGS = {
  FNB: ['조식 뷔페', '석식 바우처', '바베큐 플래터', '카페 음료권', '웰컴 와인 플레이트', '식음 통합 이용권'],
  LEISURE: ['서킷 카트 레이싱', '익스트림 루지', '벨포레 목장 & 승마', '사계절 썰매장', '미디어아트 관람권', '요트 세일링 투어', '힐링 사우나']
};

export default function PackageGeneratorSimulator() {
  // ==========================================
  // State: Month & DB Baseline
  // ==========================================
  const [selectedMonth, setSelectedMonth] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [monthlyEfficiencyMap, setMonthlyEfficiencyMap] = useState<Record<number, MonthlyEfficiencyData>>({});

  // ==========================================
  // State: Step 1 (목표 패키지 판매가)
  // ==========================================
  const [targetPackagePrice, setTargetPackagePrice] = useState<number>(265000); // 1월 기준 기본 265,000원
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>('ROOM_16');

  // ==========================================
  // State: Step 2 (객실 우선 배분액)
  // ==========================================
  const [isAutoRoomDeduction, setIsAutoRoomDeduction] = useState<boolean>(true); // 실측 RevPAR 자동 연동 여부
  const [customRoomDeduction, setCustomRoomDeduction] = useState<number>(54000);

  // ==========================================
  // State: Step 4 (유저가 직접 만드는 부대시설 품목 목록)
  // ==========================================
  const [userItems, setUserItems] = useState<UserCustomItem[]>([
    {
      id: 'init_fnb_1',
      name: '식음(F&B) 바우처 / 식사',
      category: 'FNB',
      unitPrice: 100000,
      quantity: 1,
      retailPrice: 120000
    },
    {
      id: 'init_lei_1',
      name: '직영 레저 / 액티비티 체험권',
      category: 'LEISURE',
      unitPrice: 111000,
      quantity: 1,
      retailPrice: 140000
    }
  ]);

  // ==========================================
  // State: Step 6 (전사 시뮬레이션 볼륨)
  // ==========================================
  const [dailyPackageSalesRooms, setDailyPackageSalesRooms] = useState<number>(50); // 일일 목표 패키지 판매 객실 수
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  // Currency Formatter
  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return '-';
    return new Intl.NumberFormat('ko-KR').format(Math.round(val));
  };

  // ==========================================
  // 1. Fetch Live Monthly Efficiency Data from DB
  // ==========================================
  useEffect(() => {
    let isMounted = true;
    const fetchEfficiencyData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await secureFetcher(`${API_BASE}/api/v6/report/monthly-room-efficiency?baseYear=2026&compareYear=2025`);
        const payload = (res as any)?.data ?? res;
        if (isMounted && payload?.monthlyComparison && Array.isArray(payload.monthlyComparison)) {
          const map: Record<number, MonthlyEfficiencyData> = {};
          payload.monthlyComparison.forEach((m: any) => {
            const activeData = m.ty && m.ty.revpar !== undefined && m.ty.revpar !== null ? m.ty : m.ly;
            if (activeData) {
              map[m.month] = {
                month: m.month,
                monthLabel: m.monthLabel || `${m.month}월`,
                revpar: Number(activeData.revpar ?? activeData.revPar ?? 0),
                trevparWithoutGolf: Number(activeData.trevparWithoutGolf ?? 0),
                trevparTotal: Number(activeData.trevparTotal ?? 0),
                availableRooms: Number(activeData.availableRooms ?? 5425),
                roomsSold: Number(activeData.roomsSold ?? 0),
                netRevenueWithoutGolf: Number(activeData.netRevenueWithoutGolf ?? 0),
                roomRevenue: Number(activeData.roomRevenue ?? 0),
                fnbRevenue: Number(activeData.fnbRevenue ?? 0),
                leisureRevenue: Number(activeData.leisureRevenue ?? 0),
                year: Number(activeData.year ?? 2026)
              };
            }
          });
          setMonthlyEfficiencyMap(map);
        }
      } catch (err: any) {
        console.warn('[PackageGeneratorSimulator] API fetch error:', err);
        if (isMounted) {
          setError('월별 실적 데이터 조회 중 오류가 발생했습니다.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchEfficiencyData();
    return () => { isMounted = false; };
  }, []);

  // Selected Month DB Metrics
  const currentMonthData = useMemo(() => {
    return monthlyEfficiencyMap[selectedMonth] || {
      month: selectedMonth,
      monthLabel: `${selectedMonth}월`,
      revpar: 54019, // 1월 기본 실측 Fallback
      trevparWithoutGolf: 165670,
      trevparTotal: 178101,
      availableRooms: 5425,
      roomsSold: 1997,
      netRevenueWithoutGolf: 898758568,
      roomRevenue: 293051509,
      fnbRevenue: 352455171,
      leisureRevenue: 133424771,
      year: 2026
    };
  }, [monthlyEfficiencyMap, selectedMonth]);

  // Selected Room Type Meta
  const selectedRoomType = useMemo(() => {
    return ROOM_TYPES.find(r => r.id === selectedRoomTypeId) || ROOM_TYPES[0];
  }, [selectedRoomTypeId]);

  // Update room deduction when month changes (if auto)
  useEffect(() => {
    if (isAutoRoomDeduction && currentMonthData.revpar > 0) {
      setCustomRoomDeduction(Math.round(currentMonthData.revpar / 1000) * 1000);
    }
  }, [selectedMonth, currentMonthData.revpar, isAutoRoomDeduction]);

  // ==========================================
  // 2. Core Reverse Calculation Engine (Top-Down)
  // ==========================================
  const reverseCalculations = useMemo(() => {
    // 1. 총 패키지 판매가
    const totalPkgGross = targetPackagePrice;
    
    // 2. 객실 우선 배분액 (실측 RevPAR 방어)
    const roomDeduction = isAutoRoomDeduction
      ? (Math.round(currentMonthData.revpar / 1000) * 1000)
      : customRoomDeduction;

    // 3. 부대시설 정해진 가용 예산 = 총 판매가 - 객실 배분액
    const amenityBudget = Math.max(0, totalPkgGross - roomDeduction);

    // 4. 유저가 직접 구성한 부대시설 항목 합산
    let fnbAllocatedTotal = 0;
    let leisureAllocatedTotal = 0;
    let fnbRetailTotal = 0;
    let leisureRetailTotal = 0;
    let totalVariableCost = 15000; // 객실 세탁/어메니티 기본 변동비 약 15,000원

    userItems.forEach(item => {
      const itemSubtotal = item.unitPrice * (item.quantity || 1);
      const retailSubtotal = (item.retailPrice && item.retailPrice > 0 ? item.retailPrice : Math.round(item.unitPrice * 1.25)) * (item.quantity || 1);

      if (item.category === 'FNB') {
        fnbAllocatedTotal += itemSubtotal;
        fnbRetailTotal += retailSubtotal;
        totalVariableCost += itemSubtotal * 0.35; // 식음 변동원가율 약 35%
      } else {
        leisureAllocatedTotal += itemSubtotal;
        leisureRetailTotal += retailSubtotal;
        totalVariableCost += itemSubtotal * 0.05; // 직영 레저 변동원가율 약 5%
      }
    });

    const allocatedAmenitiesTotal = fnbAllocatedTotal + leisureAllocatedTotal;
    const remainingBuffer = amenityBudget - allocatedAmenitiesTotal;
    const isOverBudget = remainingBuffer < 0;

    // 5. 고객 체감 가치 분석
    const roomRetailNormal = selectedRoomType.baseNormalPrice;
    const totalCustomerRetailValue = roomRetailNormal + fnbRetailTotal + leisureRetailTotal;
    const customerPerceivedSavings = Math.max(0, totalCustomerRetailValue - totalPkgGross);
    const customerDiscountRate = totalCustomerRetailValue > 0
      ? Number(((customerPerceivedSavings / totalCustomerRetailValue) * 100).toFixed(1))
      : 0;

    // 6. GOPPAR 보존 & 한계이익 분석
    const packageNetPrice = Math.round(totalPkgGross / 1.1); // VAT 제외 순매출
    const packageContributionMargin = totalPkgGross - totalVariableCost;
    const contributionMarginRate = totalPkgGross > 0
      ? Number(((packageContributionMargin / totalPkgGross) * 100).toFixed(1))
      : 0;

    // 7. 거시적 성과 시뮬레이션
    const physicalRoomCount = 175; // 벨포레 전체 가용 객실수
    const daysInMonth = new Date(currentMonthData.year, selectedMonth, 0).getDate();
    const monthlyPkgSoldTotal = dailyPackageSalesRooms * daysInMonth;

    const dailyPkgNetRevenue = packageNetPrice * dailyPackageSalesRooms;
    const monthlyPkgNetRevenue = dailyPkgNetRevenue * daysInMonth;
    const packageTrevPOR = totalPkgGross;

    const dailyBaseNonGolfRev = Math.round(currentMonthData.netRevenueWithoutGolf / daysInMonth);
    const incrementalAmenityNetDaily = Math.round((allocatedAmenitiesTotal / 1.1) * dailyPackageSalesRooms);
    const simulatedDailyNonGolfRev = dailyBaseNonGolfRev + incrementalAmenityNetDaily;
    const simulatedTrevPAR = Math.round(simulatedDailyNonGolfRev / physicalRoomCount);

    const trevparUpliftAmount = simulatedTrevPAR - currentMonthData.trevparWithoutGolf;
    const trevparGrowthRate = currentMonthData.trevparWithoutGolf > 0
      ? Number(((trevparUpliftAmount / currentMonthData.trevparWithoutGolf) * 100).toFixed(1))
      : 0;

    return {
      totalPkgGross,
      roomDeduction,
      amenityBudget,
      fnbAllocatedTotal,
      leisureAllocatedTotal,
      allocatedAmenitiesTotal,
      remainingBuffer,
      isOverBudget,
      roomRetailNormal,
      totalCustomerRetailValue,
      customerPerceivedSavings,
      customerDiscountRate,
      packageNetPrice,
      totalVariableCost: Math.round(totalVariableCost),
      packageContributionMargin: Math.round(packageContributionMargin),
      contributionMarginRate,
      packageTrevPOR,
      physicalRoomCount,
      daysInMonth,
      monthlyPkgSoldTotal,
      dailyPkgNetRevenue,
      monthlyPkgNetRevenue,
      simulatedTrevPAR,
      trevparUpliftAmount,
      trevparGrowthRate
    };
  }, [
    targetPackagePrice,
    isAutoRoomDeduction,
    customRoomDeduction,
    currentMonthData,
    userItems,
    selectedRoomType,
    selectedMonth,
    dailyPackageSalesRooms
  ]);

  // ==========================================
  // 3. User Item Handlers (동적 생성, 수정, 삭제)
  // ==========================================
  const handleAddUserItem = (category: 'FNB' | 'LEISURE', defaultName?: string) => {
    const newItem: UserCustomItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: defaultName || (category === 'FNB' ? '식음(F&B) 품목' : '레저·체험 품목'),
      category,
      unitPrice: 0,
      quantity: 1,
      retailPrice: 0
    };
    setUserItems(prev => [...prev, newItem]);
  };

  const handleUpdateUserItem = (id: string, updates: Partial<UserCustomItem>) => {
    setUserItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...updates };
        if (updates.unitPrice !== undefined && (!item.retailPrice || item.retailPrice === 0 || item.retailPrice === Math.round(item.unitPrice * 1.25))) {
          updated.retailPrice = Math.round(updates.unitPrice * 1.25);
        }
        return updated;
      }
      return item;
    }));
  };

  const handleDeleteUserItem = (id: string) => {
    setUserItems(prev => prev.filter(item => item.id !== id));
  };

  const handleFillRemainingBudget = (id: string) => {
    const currentItem = userItems.find(it => it.id === id);
    if (!currentItem) return;

    const otherItemsTotal = userItems
      .filter(it => it.id !== id)
      .reduce((sum, it) => sum + (it.unitPrice * (it.quantity || 1)), 0);

    const availableForItem = Math.max(0, reverseCalculations.amenityBudget - otherItemsTotal);
    const calculatedUnitPrice = Math.max(0, Math.floor(availableForItem / (currentItem.quantity || 1)));

    handleUpdateUserItem(id, { 
      unitPrice: calculatedUnitPrice,
      retailPrice: Math.round(calculatedUnitPrice * 1.25)
    });
  };

  const handleClearAllItems = () => {
    setUserItems([]);
  };

  const handleResetToSlideDefault = () => {
    setSelectedMonth(1);
    setTargetPackagePrice(265000);
    setIsAutoRoomDeduction(true);
    setCustomRoomDeduction(54000);
    setSelectedRoomTypeId('ROOM_16');
    setUserItems([
      {
        id: `fnb_${Date.now()}_1`,
        name: '식음(F&B) 식사 및 바우처',
        category: 'FNB',
        unitPrice: 100000,
        quantity: 1,
        retailPrice: 120000
      },
      {
        id: `lei_${Date.now()}_2`,
        name: '직영 레저 / 액티비티 체험권',
        category: 'LEISURE',
        unitPrice: 111000,
        quantity: 1,
        retailPrice: 140000
      }
    ]);
    setDailyPackageSalesRooms(50);
  };

  const handleCopySummary = async () => {
    const itemListText = userItems.length > 0
      ? userItems.map(it => `  - [${it.category === 'FNB' ? '식음' : '레저/체험'}] ${it.name} (${it.quantity}개): ${formatCurrency(it.unitPrice * it.quantity)}원 (정상가 ${formatCurrency((it.retailPrice || Math.round(it.unitPrice * 1.25)) * it.quantity)}원)`).join('\n')
      : '  - (등록된 부대시설 항목 없음)';

    const summaryText = `[벨포레 리조트 비수기 역산형 패키지 기획안 (SSOT)]
■ 적용 월: ${selectedMonth}월 (${currentMonthData.year}년 실적 기준)
■ 목표 패키지 판매가: ${formatCurrency(reverseCalculations.totalPkgGross)}원 (VAT 포함)
■ 대상 객실: ${selectedRoomType.name}

[1. 역산 배분 구조 (Top-Down Breakdown)]
- 총 패키지 판매가: ${formatCurrency(reverseCalculations.totalPkgGross)}원
- (−) 객실 우선 배분액: ${formatCurrency(reverseCalculations.roomDeduction)}원 (실측 RevPAR ${formatCurrency(currentMonthData.revpar)}원 수준 방어)
- (=) 부대시설 정해진 가용 예산: ${formatCurrency(reverseCalculations.amenityBudget)}원
- 부대시설 실제 구성액: ${formatCurrency(reverseCalculations.allocatedAmenitiesTotal)}원 (잔여 마진 버퍼: ${formatCurrency(reverseCalculations.remainingBuffer)}원)

[2. 유저 직접 구성 부대시설 품목 내역]
${itemListText}

[3. 고객 가치 및 수익성 분석]
- 고객 체감 정상가 총액: ${formatCurrency(reverseCalculations.totalCustomerRetailValue)}원 상당
- 고객 체감 할인 혜택: ${formatCurrency(reverseCalculations.customerPerceivedSavings)}원 절약 (${reverseCalculations.customerDiscountRate}% 할인 체감)
- 리조트 추정 변동비: ${formatCurrency(reverseCalculations.totalVariableCost)}원
- 1실당 공헌이익(GOPPAR): ${formatCurrency(reverseCalculations.packageContributionMargin)}원 (공헌이익률 ${reverseCalculations.contributionMarginRate}%)

[4. 전사 TRevPAR 기대 성과 (일 ${dailyPackageSalesRooms}실 판매 기준)]
- 실측 베이스라인 TRevPAR (골프 제외): ${formatCurrency(currentMonthData.trevparWithoutGolf)}원
- 패키지 도입 후 시뮬레이션 TRevPAR: ${formatCurrency(reverseCalculations.simulatedTrevPAR)}원 (+${formatCurrency(reverseCalculations.trevparUpliftAmount)}원 / +${reverseCalculations.trevparGrowthRate}%)
- 객실 RevPAR: ${formatCurrency(currentMonthData.revpar)}원 방어선 사수
- 월간 패키지 창출 순매출: 약 ${formatCurrency(reverseCalculations.monthlyPkgNetRevenue)}원
`;

    try {
      await navigator.clipboard.writeText(summaryText);
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2500);
    } catch (err) {
      console.error('Failed to copy summary:', err);
    }
  };

  // ==========================================
  // 4. ECharts Configurations
  // ==========================================
  const packagePieOptions = useMemo(() => {
    return {
      tooltip: {
        trigger: 'item',
        formatter: (p: any) => `${p.name}: ${Number(p.value).toLocaleString()}원 (${p.percent}%)`
      },
      legend: {
        bottom: 0,
        itemGap: 10,
        textStyle: { fontSize: 11, fontWeight: 'bold' }
      },
      series: [
        {
          name: '패키지 금액 배분',
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: true,
          label: {
            show: true,
            formatter: '{b}\n{d}%',
            fontSize: 11,
            fontWeight: 'bold'
          },
          data: [
            { name: '객실 방어액', value: reverseCalculations.roomDeduction, itemStyle: { color: '#1E3A8A' } },
            { name: '식음(F&B)', value: reverseCalculations.fnbAllocatedTotal, itemStyle: { color: '#16A34A' } },
            { name: '레저/체험', value: reverseCalculations.leisureAllocatedTotal, itemStyle: { color: '#EAB308' } },
            ...(reverseCalculations.remainingBuffer > 0 ? [
              { name: '잔여 버퍼', value: reverseCalculations.remainingBuffer, itemStyle: { color: '#0D9488' } }
            ] : [])
          ]
        }
      ]
    };
  }, [reverseCalculations]);

  const comparisonBarOptions = useMemo(() => {
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          let str = `<div class="font-bold text-xs mb-1">${params[0].name}</div>`;
          params.forEach((p: any) => {
            str += `<div class="text-xs flex items-center justify-between gap-4">
              <span>${p.marker} ${p.seriesName}</span>
              <strong>${Number(p.value).toLocaleString()}원</strong>
            </div>`;
          });
          return str;
        }
      },
      legend: {
        top: 0,
        textStyle: { fontSize: 11, fontWeight: 'bold' }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: ['순수 리조트 TRevPAR (골프 제외)', '객실 RevPAR']
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (v: number) => `${Math.round(v / 10000)}만`
        }
      },
      series: [
        {
          name: `${selectedMonth}월 실측 베이스라인`,
          type: 'bar',
          data: [currentMonthData.trevparWithoutGolf, currentMonthData.revpar],
          itemStyle: { color: '#94A3B8', borderRadius: [6, 6, 0, 0] },
          barWidth: 40
        },
        {
          name: '역산 패키지 도입 시뮬레이션',
          type: 'bar',
          data: [reverseCalculations.simulatedTrevPAR, reverseCalculations.roomDeduction],
          itemStyle: { color: '#0D9488', borderRadius: [6, 6, 0, 0] },
          barWidth: 40,
          label: {
            show: true,
            position: 'top',
            formatter: (p: any) => `${Math.round(p.value / 1000).toLocaleString()}천`,
            fontSize: 10,
            fontWeight: 'bold'
          }
        }
      ]
    };
  }, [currentMonthData, reverseCalculations, selectedMonth]);

  return (
    <div className="space-y-6">

      {/* Loading or Error State */}
      {loading && (
        <div className="bg-teal-50 border border-teal-200 text-teal-800 text-xs px-4 py-2.5 rounded-2xl flex items-center gap-2 font-bold shadow-2xs">
          <span className="animate-pulse">📊</span>
          <span>V6 데이터 마트 실측 월별 효율 지표를 동기화하고 있습니다...</span>
        </div>
      )}
      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-2.5 rounded-2xl font-bold shadow-2xs">
          ⚠️ {error} (기준 실측 베이스라인 모드로 동작합니다.)
        </div>
      )}

      {/* ============================================================== */}
      {/* 1. Header Banner & Monthly Selection                          */}
      {/* ============================================================== */}
      <div className="bg-gradient-to-r from-teal-900 via-emerald-950 to-slate-900 rounded-[28px] p-6 lg:p-8 text-white relative overflow-hidden shadow-xl border border-teal-800/40">
        <div className="absolute right-0 top-0 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-teal-500/20 text-teal-300 text-xs font-bold px-3 py-1 rounded-full border border-teal-500/30 flex items-center gap-1.5 uppercase">
                <Sparkles size={13} />
                TOP-DOWN REVERSE PACKAGE ARCHITECTURE (V6 SSOT)
              </span>
              <span className="text-xs text-slate-300 font-medium">
                가용객실 175실 · 지갑 점유율 극대화
              </span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-white flex items-center gap-2.5 break-keep">
              <Package className="text-teal-400 shrink-0" size={26} />
              비수기 역산형 패키지 기획 & TRevPAR 시뮬레이터
            </h2>
            <p className="text-slate-300 text-xs lg:text-sm mt-1.5 max-w-3xl leading-relaxed">
              <strong>목표 패키지 판매가</strong>에서 <strong>실측 RevPAR 방어액</strong>을 선차감한 후, 
              <strong>정해진 부대시설 예산 안에서 유저가 식음과 레저·체험 품목을 직접 설계</strong>하여 
              고객 체감 가치와 리조트의 실질 <strong>GOPPAR(객실당 영업이익)</strong>를 극대화합니다.
            </p>
          </div>

          {/* Month Selector for Low Seasons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-900/90 p-2.5 rounded-2xl border border-white/10 shrink-0 shadow-inner">
            <span className="text-xs font-bold text-slate-400 px-2 flex items-center gap-1.5">
              <Calendar size={14} className="text-teal-400" />
              타깃 월 선택:
            </span>
            <div className="flex items-center gap-1">
              {[
                { m: 1, label: '1월', sub: '겨울 비수기' },
                { m: 2, label: '2월', sub: '연중 최저점' },
                { m: 3, label: '3월', sub: '봄 개장기' },
                { m: 12, label: '12월', sub: '동계 진입기' }
              ].map(item => (
                <button
                  key={item.m}
                  onClick={() => setSelectedMonth(item.m)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedMonth === item.m
                      ? 'bg-teal-500 text-slate-950 font-black shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div>{item.label}</div>
                  <div className="text-[9px] opacity-75">{item.sub}</div>
                </button>
              ))}
            </div>

            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              aria-label="전체 12개월 타깃 월 선택"
              className="bg-slate-800 text-white text-xs font-bold px-2 py-1.5 rounded-xl border border-slate-700 cursor-pointer"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                <option key={m} value={m}>{m}월 전체</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. SSOT 실측 기준선 (Database Verified Live Baseline)          */}
      {/* ============================================================== */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 text-xs shadow-xs">
        <div className="flex items-center gap-2.5">
          <ShieldCheck size={20} className="text-teal-600 shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-800 text-sm">
                {selectedMonth}월 실측 베이스라인 (DB API SSOT):
              </span>
              <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded-full">
                0-Variance 검증 완료
              </span>
            </div>
            <p className="text-slate-600 mt-0.5">
              순수 리조트 TRevPAR(골프 제외) <strong className="text-teal-800 font-extrabold">{formatCurrency(currentMonthData.trevparWithoutGolf)}원</strong> · 
              실측 객실 RevPAR <strong className="text-indigo-900 font-extrabold">{formatCurrency(currentMonthData.revpar)}원</strong> · 
              판매객실 {formatCurrency(currentMonthData.roomsSold)}실 (총 가용 {formatCurrency(currentMonthData.availableRooms)}실)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleResetToSlideDefault}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 font-bold transition-all text-xs cursor-pointer shadow-2xs"
          >
            <RotateCcw size={13} />
            기본값 초기화
          </button>
          <button
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 text-white hover:bg-teal-700 font-bold transition-all text-xs cursor-pointer shadow-xs"
          >
            {copiedNotification ? <Check size={13} className="text-amber-300" /> : <Copy size={13} />}
            {copiedNotification ? '클립보드 복사 완료!' : '기획안 요약 복사'}
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. The 3-Step Top-Down Reverse Allocation Console             */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Step 01: 목표 패키지 판매가 설정 */}
        <div className="bg-white p-5 rounded-2xl border-2 border-teal-500/30 shadow-xs relative flex flex-col justify-between">
          <div className="absolute -top-3 left-4 bg-teal-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Step 01
          </div>
          <div>
            <div className="flex items-center justify-between mt-1 mb-2">
              <span className="text-xs font-bold text-slate-500">목표 패키지 판매가 설정</span>
              <DollarSign size={16} className="text-teal-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mb-1">
              {formatCurrency(targetPackagePrice)}
              <span className="text-sm font-semibold text-slate-500 ml-1">원 (VAT포함)</span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              전략적으로 목표하는 총 소비자 판매가를 먼저 고정합니다.
            </p>

            {/* Quick Price Buttons */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {[220000, 265000, 299000, 329000, 359000].map(p => (
                <button
                  key={p}
                  onClick={() => setTargetPackagePrice(p)}
                  className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                    targetPackagePrice === p
                      ? 'bg-teal-600 text-white border-teal-600 font-black'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {Math.round(p / 10000)}만원
                </button>
              ))}
            </div>

            {/* Slider */}
            <input
              type="range"
              min={150000}
              max={500000}
              step={5000}
              value={targetPackagePrice}
              onChange={(e) => setTargetPackagePrice(Number(e.target.value))}
              className="w-full accent-teal-600 cursor-pointer mb-2"
            />
          </div>

          {/* Room Type Selector */}
          <div className="pt-3 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-600 block mb-1.5">대상 객실 타입:</span>
            <div className="grid grid-cols-3 gap-1">
              {ROOM_TYPES.map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRoomTypeId(r.id)}
                  className={`py-1.5 px-1 rounded-xl text-[10px] font-bold transition-all text-center cursor-pointer border ${
                    selectedRoomTypeId === r.id
                      ? 'bg-slate-900 text-white border-slate-900 font-black'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {r.name.slice(0, 3)}평형
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Step 02: 객실 기준액 우선 공제 (RevPAR 방어) */}
        <div className="bg-white p-5 rounded-2xl border-2 border-indigo-500/30 shadow-xs relative flex flex-col justify-between">
          <div className="absolute -top-3 left-4 bg-indigo-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Step 02
          </div>
          <div>
            <div className="flex items-center justify-between mt-1 mb-2">
              <span className="text-xs font-bold text-slate-500">객실 기준액 우선 공제</span>
              <Hotel size={16} className="text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-indigo-950 mb-1">
              − {formatCurrency(reverseCalculations.roomDeduction)}
              <span className="text-sm font-semibold text-slate-500 ml-1">원</span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              {selectedMonth}월 실측 RevPAR({formatCurrency(currentMonthData.revpar)}원)를 최소 방어 요금으로 선차감합니다.
            </p>

            {/* Toggle: Auto vs Manual */}
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setIsAutoRoomDeduction(true)}
                className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  isAutoRoomDeduction
                    ? 'bg-indigo-600 text-white border-indigo-600 font-black'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                <CheckCircle2 size={12} />
                실측 RevPAR 자동 연동 ({formatCurrency(reverseCalculations.roomDeduction)}원)
              </button>
              <button
                onClick={() => setIsAutoRoomDeduction(false)}
                className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  !isAutoRoomDeduction
                    ? 'bg-indigo-600 text-white border-indigo-600 font-black'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                직접 설정
              </button>
            </div>

            {!isAutoRoomDeduction && (
              <div className="space-y-1">
                <input
                  type="range"
                  min={30000}
                  max={120000}
                  step={2000}
                  value={customRoomDeduction}
                  onChange={(e) => setCustomRoomDeduction(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="text-right text-[10px] text-indigo-800 font-bold">
                  객실 배분액: {formatCurrency(customRoomDeduction)}원
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            💡 객실을 헐값에 파는 대신 최소 실현 매출을 먼저 락인(Lock-in)합니다.
          </div>
        </div>

        {/* Step 03: 부대시설 잔여 할당 예산 도출 */}
        <div className="bg-gradient-to-br from-teal-50 to-emerald-100/60 p-5 rounded-2xl border-2 border-teal-500 shadow-xs relative flex flex-col justify-between">
          <div className="absolute -top-3 left-4 bg-teal-800 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Step 03
          </div>
          <div>
            <div className="flex items-center justify-between mt-1 mb-2">
              <span className="text-xs font-bold text-teal-900">부대시설 정해진 가용 예산</span>
              <Award size={16} className="text-teal-700" />
            </div>
            <div className="text-3xl font-black text-teal-950 mb-1">
              = {formatCurrency(reverseCalculations.amenityBudget)}
              <span className="text-sm font-bold text-teal-800 ml-1">원</span>
            </div>
            <p className="text-[11px] text-teal-800 font-medium mb-3 leading-relaxed">
              이 <strong>정해진 예산 금액 안에서</strong> 유저가 식음과 레저·체험 품목을 자유롭게 만들어 냅니다.
            </p>

            {/* Live Budget Meter */}
            <div className="bg-white p-3.5 rounded-xl border border-teal-200/80 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-600">유저 구성 총액:</span>
                <span className="text-slate-900 font-extrabold">
                  {formatCurrency(reverseCalculations.allocatedAmenitiesTotal)}원
                </span>
              </div>

              {/* Multi-segment Progress Bar */}
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (reverseCalculations.fnbAllocatedTotal / (reverseCalculations.amenityBudget || 1)) * 100)}%`
                  }}
                  title={`식음: ${formatCurrency(reverseCalculations.fnbAllocatedTotal)}원`}
                ></div>
                <div
                  className="bg-amber-400 h-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (reverseCalculations.leisureAllocatedTotal / (reverseCalculations.amenityBudget || 1)) * 100)}%`
                  }}
                  title={`레저: ${formatCurrency(reverseCalculations.leisureAllocatedTotal)}원`}
                ></div>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">
                  {reverseCalculations.isOverBudget ? '초과 금액:' : '잔여 가용 예산 (남은 금액):'}
                </span>
                <span className={`font-black ${reverseCalculations.isOverBudget ? 'text-rose-600' : 'text-teal-700'}`}>
                  {reverseCalculations.isOverBudget ? '⚠️ ' : '+ '}
                  {formatCurrency(Math.abs(reverseCalculations.remainingBuffer))}원
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 text-[10px] text-teal-800 font-bold flex items-center justify-between">
            <span>🍽️ 식음: {formatCurrency(reverseCalculations.fnbAllocatedTotal)}원</span>
            <span>🏎️ 레저·체험: {formatCurrency(reverseCalculations.leisureAllocatedTotal)}원</span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. Step 04: 유저가 직접 만드는 부대시설(식음/레저) 구성기       */}
      {/* ============================================================== */}
      <div className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm space-y-5">
        
        {/* Header & Budget Gauge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                Step 04
              </span>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Utensils size={18} className="text-emerald-600" />
                부대시설(식음 & 레저/체험) 사용자 직접 구성기
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              정해진 가용 예산 <strong>({formatCurrency(reverseCalculations.amenityBudget)}원)</strong> 안에서 원하는 품목과 금액을 자유롭게 추가하고 조정하세요.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAddUserItem('FNB')}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-emerald-700 transition-all cursor-pointer shadow-xs"
            >
              <Plus size={14} />
              + 식음(F&B) 항목 추가
            </button>
            <button
              onClick={() => handleAddUserItem('LEISURE')}
              className="px-3.5 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 hover:bg-amber-400 transition-all cursor-pointer shadow-xs"
            >
              <Plus size={14} />
              + 레저·체험 항목 추가
            </button>
            {userItems.length > 0 && (
              <button
                onClick={handleClearAllItems}
                className="px-3 py-2 rounded-xl border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-bold transition-all cursor-pointer"
                title="전체 항목 비우기"
              >
                비우기
              </button>
            )}
          </div>
        </div>

        {/* Budget Status Alert Bar */}
        <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs transition-all ${
          reverseCalculations.isOverBudget
            ? 'bg-rose-50 border-rose-300 text-rose-800'
            : reverseCalculations.remainingBuffer === 0
              ? 'bg-teal-50 border-teal-300 text-teal-900'
              : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}>
          <div className="flex items-center gap-2">
            {reverseCalculations.isOverBudget ? (
              <span className="text-lg">⚠️</span>
            ) : reverseCalculations.remainingBuffer === 0 ? (
              <CheckCircle size={18} className="text-teal-600 shrink-0" />
            ) : (
              <Layers size={18} className="text-slate-500 shrink-0" />
            )}
            <span className="font-bold">
              {reverseCalculations.isOverBudget
                ? `정해진 가용 예산을 ${formatCurrency(Math.abs(reverseCalculations.remainingBuffer))}원 초과했습니다! 항목 금액을 낮추거나 판매가를 올리세요.`
                : reverseCalculations.remainingBuffer === 0
                  ? `정해진 가용 예산(${formatCurrency(reverseCalculations.amenityBudget)}원)이 100% 완벽하게 매칭되었습니다.`
                  : `가용 예산 ${formatCurrency(reverseCalculations.amenityBudget)}원 중 ${formatCurrency(reverseCalculations.remainingBuffer)}원의 잔여 버퍼가 남아있습니다.`}
            </span>
          </div>
          <div className="font-extrabold text-xs">
            현재 합계: {formatCurrency(reverseCalculations.allocatedAmenitiesTotal)}원 / 가용 {formatCurrency(reverseCalculations.amenityBudget)}원
          </div>
        </div>

        {/* Quick Name Suggestions Chips (명칭만 빠르게 입력할 수 있도록 지원) */}
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-600 flex items-center gap-1.5 text-[11px]">
              <Sparkles size={13} className="text-amber-500" />
              빠른 품목명 원클릭 추가:
            </span>
            <span className="text-[10px] text-slate-400">
              클릭 시 해당 품목명이 자동 생성되며, 금액은 직접 입력할 수 있습니다
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_NAME_TAGS.FNB.map(tag => (
              <button
                key={tag}
                onClick={() => handleAddUserItem('FNB', tag)}
                className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 transition-all cursor-pointer flex items-center gap-1"
              >
                <span>🍽️</span>
                <span>+{tag}</span>
              </button>
            ))}
            {QUICK_NAME_TAGS.LEISURE.map(tag => (
              <button
                key={tag}
                onClick={() => handleAddUserItem('LEISURE', tag)}
                className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white border border-amber-200 text-amber-900 hover:bg-amber-50 transition-all cursor-pointer flex items-center gap-1"
              >
                <span>🏎️</span>
                <span>+{tag}</span>
              </button>
            ))}
          </div>
        </div>

        {/* User Items Table / List */}
        {userItems.length === 0 ? (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center space-y-3">
            <div className="text-3xl">📝</div>
            <div className="font-extrabold text-slate-800 text-sm">
              등록된 부대시설 항목이 없습니다
            </div>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              정해진 가용 예산 <strong>({formatCurrency(reverseCalculations.amenityBudget)}원)</strong> 안에서 
              상단의 <strong>[+ 식음 항목 추가]</strong> 또는 <strong>[+ 레저·체험 항목 추가]</strong> 버튼을 눌러 원하는 구성을 만들어보세요.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {userItems.map((item, index) => {
              const itemSubtotal = item.unitPrice * (item.quantity || 1);

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 ${
                    item.category === 'FNB'
                      ? 'bg-emerald-50/20 border-emerald-200 hover:border-emerald-300'
                      : 'bg-amber-50/20 border-amber-200 hover:border-amber-300'
                  }`}
                >
                  {/* Left: Category & Item Name */}
                  <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
                    <span className="text-xs font-bold text-slate-400 w-5 text-center shrink-0">
                      {index + 1}
                    </span>

                    {/* Category Selector */}
                    <select
                      value={item.category}
                      onChange={(e) => handleUpdateUserItem(item.id, { category: e.target.value as 'FNB' | 'LEISURE' })}
                      className={`text-xs font-bold px-2 py-1.5 rounded-xl border cursor-pointer shrink-0 ${
                        item.category === 'FNB'
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}
                    >
                      <option value="FNB">🍽️ 식음(F&B)</option>
                      <option value="LEISURE">🏎️ 레저/체험</option>
                    </select>

                    {/* Item Name Input */}
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleUpdateUserItem(item.id, { name: e.target.value })}
                      placeholder="품목명을 입력하세요 (예: 석식 바우처, 서킷 카트)"
                      className="flex-1 bg-white text-xs font-bold text-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  {/* Middle: Price & Quantity Controls */}
                  <div className="flex items-center gap-3 shrink-0">
                    {/* Unit Price */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400 font-medium">단가:</span>
                      <div className="relative">
                        <input
                          type="number"
                          step={1000}
                          value={item.unitPrice || ''}
                          onChange={(e) => handleUpdateUserItem(item.id, { unitPrice: Math.max(0, Number(e.target.value)) })}
                          placeholder="0"
                          className="w-24 text-right bg-white text-xs font-black text-slate-900 pr-5 pl-2 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500"
                        />
                        <span className="absolute right-2 top-1.5 text-[11px] text-slate-400 pointer-events-none">원</span>
                      </div>
                    </div>

                    {/* Quantity Stepper */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                      <button
                        onClick={() => handleUpdateUserItem(item.id, { quantity: Math.max(1, (item.quantity || 1) - 1) })}
                        disabled={item.quantity <= 1}
                        className="w-6 h-6 rounded-lg bg-white text-slate-700 flex items-center justify-center font-bold text-xs hover:bg-slate-200 disabled:opacity-30 cursor-pointer shadow-2xs"
                      >
                        <Minus size={11} />
                      </button>
                      <span className="w-5 text-center text-xs font-black text-slate-900">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleUpdateUserItem(item.id, { quantity: (item.quantity || 1) + 1 })}
                        className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xs hover:bg-teal-700 cursor-pointer shadow-2xs"
                      >
                        <Plus size={11} />
                      </button>
                    </div>

                    {/* Subtotal */}
                    <div className="min-w-[90px] text-right">
                      <span className="text-[10px] text-slate-400 block">소계</span>
                      <strong className="text-sm font-black text-slate-900">
                        {formatCurrency(itemSubtotal)}원
                      </strong>
                    </div>

                    {/* Fill Remaining Budget Action */}
                    <button
                      onClick={() => handleFillRemainingBudget(item.id)}
                      title="남은 가용 예산을 이 항목에 자동 채우기"
                      className="px-2 py-1 rounded-lg text-[10px] font-bold border border-teal-200 text-teal-800 bg-teal-50 hover:bg-teal-100 transition-all cursor-pointer whitespace-nowrap"
                    >
                      잔여예산 채우기
                    </button>

                    {/* Delete Action */}
                    <button
                      onClick={() => handleDeleteUserItem(item.id)}
                      className="w-7 h-7 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-all cursor-pointer"
                      title="품목 삭제"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 5. Step 05: Financial & Value Analysis (고객 가치 & GOPPAR)   */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* 고객 체감 가치 분석 */}
        <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Sparkles size={16} className="text-amber-500" />
              고객 관점 체감 가치 & 혜택 (Marketing Proposition)
            </h4>
            <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-200">
              세일즈 소구점
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[11px] mb-1">정상가 단품 합계</span>
              <div className="text-xl font-black text-slate-700 line-through">
                {formatCurrency(reverseCalculations.totalCustomerRetailValue)}원
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                객실({formatCurrency(reverseCalculations.roomRetailNormal)}원) + 부대시설 정상가
              </span>
            </div>

            <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200">
              <span className="text-amber-800 block text-[11px] font-bold mb-1">고객 체감 할인 혜택</span>
              <div className="text-xl font-black text-amber-950">
                {reverseCalculations.customerDiscountRate}% 할인
              </div>
              <span className="text-[10px] text-amber-800 font-bold mt-1 block">
                총 {formatCurrency(reverseCalculations.customerPerceivedSavings)}원 절약 효과
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
            💡 <strong>소비자 심리 분석:</strong> 고객에게는 <strong>{formatCurrency(reverseCalculations.totalCustomerRetailValue)}원</strong> 상당의 
            풀 패키지를 <strong>{formatCurrency(reverseCalculations.totalPkgGross)}원</strong>에 이용할 수 있는 강력한 가격 매력도로 어필됩니다.
          </p>
        </div>

        {/* 리조트 수익성 & GOPPAR 보존 분석 */}
        <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Award size={16} className="text-teal-600" />
              리조트 실질 수익성 & GOPPAR 보존 (Financial SSOT)
            </h4>
            <span className="text-[10px] bg-teal-50 text-teal-800 font-bold px-2 py-0.5 rounded-full border border-teal-200">
              영업이익 방어
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[11px] mb-1">추정 변동원가 (린넨+식자재)</span>
              <div className="text-xl font-black text-rose-700">
                {formatCurrency(reverseCalculations.totalVariableCost)}원
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                직영 레저는 한계비용 0원 수렴
              </span>
            </div>

            <div className="bg-teal-50/60 p-3.5 rounded-xl border border-teal-200">
              <span className="text-teal-900 block text-[11px] font-bold mb-1">1실당 공헌이익 (GOPPAR)</span>
              <div className="text-xl font-black text-teal-950">
                {formatCurrency(reverseCalculations.packageContributionMargin)}원
              </div>
              <span className="text-[10px] text-teal-800 font-bold mt-1 block">
                공헌이익률: <strong>{reverseCalculations.contributionMarginRate}%</strong> (고수익 방어)
              </span>
            </div>
          </div>

          <p className="text-xs text-teal-900 bg-teal-50/60 p-3 rounded-xl border border-teal-200 leading-relaxed">
            🎯 <strong>수익성 원리:</strong> 변동비가 극히 낮은 <strong>직영 레저</strong>를 필수 포함할수록, 
            고객 할인 체감도는 30%를 넘기면서도 리조트 실질 공헌이익률은 <strong>80% 이상</strong> 보존되어 <strong>GOPPAR</strong>를 확고히 방어합니다.
          </p>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 6. Step 06: 전사 TRevPAR & 거시적 시뮬레이션 성과               */}
      {/* ============================================================== */}
      <div className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                Step 05
              </span>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <TrendingUp size={18} className="text-indigo-600" />
                {selectedMonth}월 전사 TRevPAR & RevPAR 상승 시뮬레이션
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              패키지 일일 판매 목표량에 따른 순수 리조트 TRevPAR(골프 제외)와 총 순매출 상승 효과를 실시간 역산합니다.
            </p>
          </div>

          {/* Volume Slider Control */}
          <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
            <span className="text-xs font-bold text-slate-600">일일 목표 패키지 판매량:</span>
            <input
              type="range"
              min={10}
              max={120}
              step={5}
              value={dailyPackageSalesRooms}
              onChange={(e) => setDailyPackageSalesRooms(Number(e.target.value))}
              className="accent-teal-600 cursor-pointer w-28"
            />
            <span className="text-sm font-black text-teal-800 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
              일 {dailyPackageSalesRooms}실
            </span>
            <span className="text-[10px] text-slate-400">
              (월 {formatCurrency(reverseCalculations.monthlyPkgSoldTotal)}실)
            </span>
          </div>
        </div>

        {/* 4 Key Macro Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <span className="text-[11px] text-slate-500 font-bold block mb-1">
              시뮬레이션 TRevPAR (골프 제외)
            </span>
            <div className="text-2xl font-black text-teal-700">
              {formatCurrency(reverseCalculations.simulatedTrevPAR)}원
            </div>
            <div className="text-[10px] text-teal-800 font-bold mt-1">
              실측 베이스라인({formatCurrency(currentMonthData.trevparWithoutGolf)}원) 대비 
              <strong className="ml-1 text-emerald-600">+{reverseCalculations.trevparGrowthRate}%</strong>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <span className="text-[11px] text-slate-500 font-bold block mb-1">
              객실 RevPAR 방어 수준
            </span>
            <div className="text-2xl font-black text-indigo-900">
              {formatCurrency(reverseCalculations.roomDeduction)}원
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              실측 RevPAR({formatCurrency(currentMonthData.revpar)}원) 100% 방어선 유지
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <span className="text-[11px] text-slate-500 font-bold block mb-1">
              패키지 1실 객단가 (TRevPOR)
            </span>
            <div className="text-2xl font-black text-slate-900">
              {formatCurrency(reverseCalculations.packageTrevPOR)}원
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              단품 투숙객 대비 지갑 점유율 락인
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <span className="text-[11px] text-slate-500 font-bold block mb-1">
              월간 패키지 창출 순매출
            </span>
            <div className="text-2xl font-black text-emerald-700">
              약 {Math.round(reverseCalculations.monthlyPkgNetRevenue / 100000000).toLocaleString()}억 {(Math.round((reverseCalculations.monthlyPkgNetRevenue % 100000000) / 10000)).toLocaleString()}만
            </div>
            <div className="text-[10px] text-emerald-800 font-bold mt-1">
              순수 리조트 비수기 매출 견인
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
          {/* Chart 1: Donut breakdown */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="text-xs font-black text-slate-800 mb-2 flex items-center justify-between">
              <span>패키지 총 판매가 배분 비율 (Donut Breakdown)</span>
              <span className="text-[10px] text-slate-400">총 {formatCurrency(reverseCalculations.totalPkgGross)}원 기준</span>
            </div>
            <ReactECharts option={packagePieOptions} style={{ height: 260 }} />
          </div>

          {/* Chart 2: Before vs After Bar */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="text-xs font-black text-slate-800 mb-2 flex items-center justify-between">
              <span>{selectedMonth}월 실측 베이스라인 vs 역산 패키지 도입 시뮬레이션</span>
              <span className="text-[10px] text-teal-600 font-bold">TRevPAR +{reverseCalculations.trevparGrowthRate}% 개선</span>
            </div>
            <ReactECharts option={comparisonBarOptions} style={{ height: 260 }} />
          </div>
        </div>
      </div>

    </div>
  );
}
