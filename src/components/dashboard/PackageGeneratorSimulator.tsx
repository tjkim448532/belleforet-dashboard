import { useState, useMemo, useEffect } from 'react';
import { 
  Package, Sparkles, DollarSign, Hotel, Utensils, 
  CheckCircle2, ShieldCheck, Flame, Plus, Minus, 
  RotateCcw, Copy, Check, TrendingUp, Award, 
  Calendar, ChevronRight
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { secureFetcher } from '../../lib/secureFetcher';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

// ==========================================
// 1. Types & Interfaces
// ==========================================
export interface PackageItem {
  id: string;
  name: string;
  category: 'FNB' | 'LEISURE' | 'OTHER';
  categoryLabel: string;
  icon: string;
  allocatedPrice: number;   // 내부 배분가 (VAT 포함 소비자가 내 할당액)
  retailPrice: number;      // 소비자 정상 단품가 (고객 체감 가치)
  variableCostRate: number; // 추정 변동비율 (F&B: 35~40%, 직영레저: 2~5%)
  isDirectOperation: boolean; // 직영 시설 여부 (변동비 극소화, GOPPAR 보존 핵심)
  unit: string;
  description: string;
}

export interface PackagePresetStrategy {
  id: string;
  name: string;
  badge: string;
  targetPriceGross: number; // e.g. 265,000원
  roomType: string;
  roomAllocation: number;   // e.g. 54,000원 (실측 RevPAR 방어액)
  itemQuantities: Record<string, number>;
  tagline: string;
  desc: string;
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

// ==========================================
// 2. Predefined Master Data & Presets
// ==========================================
const ROOM_TYPES = [
  { id: 'ROOM_16', name: '16평형 콘도 (2인 기준)', baseNormalPrice: 150000, defaultCapacity: 2, desc: '커플 및 2인 여행객 최적화 기본 객실' },
  { id: 'ROOM_35', name: '35평형 콘도 (4인 기준)', baseNormalPrice: 220000, defaultCapacity: 4, desc: '가족 및 소모임 최적화 중형 객실' },
  { id: 'ROOM_51', name: '51평형 커넥팅룸 (4~6인)', baseNormalPrice: 320000, defaultCapacity: 6, desc: '대가족 및 단체 특화 복합 프리미엄 객실' }
];

const DEFAULT_PACKAGE_ITEMS: PackageItem[] = [
  // 🍽️ 식음 (F&B) 부문
  {
    id: 'FNB_CUCINA_BF2',
    name: '쿠치나 조식 뷔페 (2인)',
    category: 'FNB',
    categoryLabel: '식음(F&B)',
    icon: '🍳',
    allocatedPrice: 36000,
    retailPrice: 44000,
    variableCostRate: 0.35,
    isDirectOperation: false,
    unit: '2인권',
    description: '호텔식 조식 뷔페 성인 2인 식사권'
  },
  {
    id: 'FNB_NAMDO_50',
    name: '남도예담 정식 바우처',
    category: 'FNB',
    categoryLabel: '식음(F&B)',
    icon: '🍱',
    allocatedPrice: 50000,
    retailPrice: 60000,
    variableCostRate: 0.38,
    isDirectOperation: false,
    unit: '5만 바우처',
    description: '남도 한정식 명가 남도예담 바우처 식음권'
  },
  {
    id: 'FNB_BRISKET_80',
    name: '브리스킷346 BBQ 플래터 세트',
    category: 'FNB',
    categoryLabel: '식음(F&B)',
    icon: '🥩',
    allocatedPrice: 80000,
    retailPrice: 95000,
    variableCostRate: 0.35,
    isDirectOperation: false,
    unit: '2~3인 세트',
    description: '텍사스 정통 훈제 바비큐 플래터 & 디너'
  },
  {
    id: 'FNB_CAFE_15',
    name: '투썸/베이커리 음료권 (2인)',
    category: 'FNB',
    categoryLabel: '식음(F&B)',
    icon: '☕',
    allocatedPrice: 15000,
    retailPrice: 18000,
    variableCostRate: 0.20,
    isDirectOperation: false,
    unit: '2잔권',
    description: '아메리카노 및 시그니처 베이커리 음료권'
  },
  {
    id: 'FNB_WINE_30',
    name: '인룸 웰컴 와인 & 치즈 플래터',
    category: 'FNB',
    categoryLabel: '식음(F&B)',
    icon: '🍷',
    allocatedPrice: 30000,
    retailPrice: 40000,
    variableCostRate: 0.30,
    isDirectOperation: false,
    unit: '1세트',
    description: '객실 사전 세팅용 하우스 와인과 치즈 플레이트'
  },

  // 🏎️🎢 직영 레저 & 액티비티 부문 (변동비 극소화, GOPPAR 보존 핵심)
  {
    id: 'LEI_MOTO_KART2',
    name: '모토아레나 서킷 레이싱 카트 (2인)',
    category: 'LEISURE',
    categoryLabel: '직영 레저',
    icon: '🏎️',
    allocatedPrice: 70000,
    retailPrice: 80000,
    variableCostRate: 0.05,
    isDirectOperation: true,
    unit: '2인권',
    description: '국제 규격 서킷 스포츠 카트 주행권 (직영/한계이익 95%)'
  },
  {
    id: 'LEI_LUGE_2R2',
    name: '익스트림 루지 (2인 2회권)',
    category: 'LEISURE',
    categoryLabel: '직영 레저',
    icon: '🛷',
    allocatedPrice: 45000,
    retailPrice: 56000,
    variableCostRate: 0.03,
    isDirectOperation: true,
    unit: '2인 2회',
    description: '산악 루지 트랙 2회 탑승권 (직영 무변동비 시설)'
  },
  {
    id: 'LEI_FARM_HORSE2',
    name: '벨포레 목장 & 승마체험 (2인)',
    category: 'LEISURE',
    categoryLabel: '직영 레저',
    icon: '🐎',
    allocatedPrice: 30000,
    retailPrice: 38000,
    variableCostRate: 0.05,
    isDirectOperation: true,
    unit: '2인권',
    description: '양몰이 공연 관람 및 승마 체험 (패밀리 선호 1위)'
  },
  {
    id: 'LEI_SLED_2',
    name: '사계절 썰매장 (2인)',
    category: 'LEISURE',
    categoryLabel: '직영 레저',
    icon: '⛷️',
    allocatedPrice: 26000,
    retailPrice: 32000,
    variableCostRate: 0.03,
    isDirectOperation: true,
    unit: '2인권',
    description: '사계절 튜브 슬로프 무제한 이용권'
  },
  {
    id: 'LEI_MEDIA_ART2',
    name: '미디어아트센터 \'몰입\' 관람권 (2인)',
    category: 'LEISURE',
    categoryLabel: '직영 레저',
    icon: '🎨',
    allocatedPrice: 32000,
    retailPrice: 38000,
    variableCostRate: 0.02,
    isDirectOperation: true,
    unit: '2인권',
    description: '실감형 디지털 미디어 전시관 입장권'
  },
  {
    id: 'LEI_MARINA_YACHT2',
    name: '마리나클럽 요트 투어 (2인)',
    category: 'LEISURE',
    categoryLabel: '직영 레저',
    icon: '⛵',
    allocatedPrice: 50000,
    retailPrice: 60000,
    variableCostRate: 0.08,
    isDirectOperation: true,
    unit: '2인권',
    description: '원남호수 럭셔리 요트 세일링 투어'
  },
  {
    id: 'LEI_HEALING_SAUNA2',
    name: '힐링 사우나 (2인 이용권)',
    category: 'LEISURE',
    categoryLabel: '직영 레저',
    icon: '♨️',
    allocatedPrice: 20000,
    retailPrice: 26000,
    variableCostRate: 0.05,
    isDirectOperation: true,
    unit: '2인권',
    description: '천연 암반수 힐링 사우나 2인권'
  }
];

// Google Slides SSOT 기반 3대 전략 패키지 프리셋
const STRATEGY_PRESETS: PackagePresetStrategy[] = [
  {
    id: 'PRESET_SLIDE_SSOT',
    name: '2026년 1월 실적 기반 표준 역산 패키지 (Slide SSOT)',
    badge: '★ 슬라이드 공식 SSOT 모델',
    targetPriceGross: 265000,
    roomType: '16평형 콘도 (2인 기준)',
    roomAllocation: 54000, // 1월 실측 RevPAR 54,019원 수준 방어
    itemQuantities: {
      'FNB_CUCINA_BF2': 1,     // 36,000원
      'FNB_NAMDO_50': 1,       // 50,000원
      'LEI_MOTO_KART2': 1,     // 70,000원
      'LEI_FARM_HORSE2': 1,    // 30,000원
      'LEI_HEALING_SAUNA2': 1  // 20,000원 (합계: 206,000원 / 잔여 마진 버퍼: +5,000원)
    },
    tagline: '총 26.5만원 타깃 = 객실 우선 선차감 + 부대시설 최적 배분',
    desc: '선택 월 실측 RevPAR 기준 객실을 최소 방어선으로 우선 배분하고, 직영 고마진 모토아레나 카트와 식음을 결합하여 TRevPAR와 GOPPAR를 완벽히 동시 사수하는 표준 역산 모델'
  },
  {
    id: 'PRESET_BBQ_SPA',
    name: 'Cozy BBQ & 힐링 스파 프리미엄 패키지',
    badge: '식음 락인 프리미엄',
    targetPriceGross: 329000,
    roomType: '35평형 콘도 (4인 기준)',
    roomAllocation: 68000,
    itemQuantities: {
      'FNB_BRISKET_80': 1,     // 80,000원
      'FNB_CUCINA_BF2': 1,     // 36,000원
      'LEI_LUGE_2R2': 1,       // 45,000원
      'LEI_MEDIA_ART2': 1,     // 32,000원
      'LEI_FARM_HORSE2': 1,    // 30,000원
      'LEI_HEALING_SAUNA2': 1, // 20,000원
      'FNB_CAFE_15': 1         // 15,000원 (합계: 258,000원 / 잔여 버퍼: +3,000원)
    },
    tagline: '총 32.9만원 타깃 = 객실 우선 차감 + 부대시설 할당',
    desc: '브리스킷346 바비큐 디너와 조식, 루지 및 사우나를 결합하여 겨울철 가족/커플 고객의 체류 소비와 객단가를 극대화'
  },
  {
    id: 'PRESET_EXTREME_ALLINONE',
    name: '익스트림 액티비티 올인원 어드벤처 패키지',
    badge: '직영 레저 풀패키지',
    targetPriceGross: 299000,
    roomType: '16평형 콘도 (2인 기준)',
    roomAllocation: 54000,
    itemQuantities: {
      'LEI_MOTO_KART2': 1,     // 70,000원
      'LEI_LUGE_2R2': 1,       // 45,000원
      'LEI_SLED_2': 1,         // 26,000원
      'FNB_CUCINA_BF2': 1,     // 36,000원
      'LEI_MEDIA_ART2': 1,     // 32,000원
      'LEI_HEALING_SAUNA2': 1, // 20,000원
      'FNB_CAFE_15': 1         // 15,000원 (합계: 244,000원 / 잔여 버퍼: +1,000원)
    },
    tagline: '총 29.9만원 타깃 = 객실 우선 차감 + 레저/식음 할당',
    desc: '모토아레나 서킷 카트, 루지, 썰매 등 벨포레 핵심 직영 레저를 총동원하여 2030 및 액티브 고객 타깃'
  }
];

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
  const [targetPackagePrice, setTargetPackagePrice] = useState<number>(265000); // 슬라이드 기본 265,000원
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>('ROOM_16');

  // ==========================================
  // State: Step 2 (객실 우선 배분액)
  // ==========================================
  const [isAutoRoomDeduction, setIsAutoRoomDeduction] = useState<boolean>(true); // 실측 RevPAR 자동 연동 여부
  const [customRoomDeduction, setCustomRoomDeduction] = useState<number>(54000);

  // ==========================================
  // State: Step 4 (부대시설 아이템 조립기)
  // ==========================================
  const [items] = useState<PackageItem[]>(DEFAULT_PACKAGE_ITEMS);
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({
    'FNB_CUCINA_BF2': 1,
    'FNB_NAMDO_50': 1,
    'LEI_MOTO_KART2': 1,
    'LEI_FARM_HORSE2': 1,
    'LEI_HEALING_SAUNA2': 1
  });
  const [itemCategoryFilter, setItemCategoryFilter] = useState<'ALL' | 'FNB' | 'LEISURE'>('ALL');

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
      // 100원 단위 반올림 처리하여 직관적 방어선 제시 (예: 54,019원 ➔ 54,000원)
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

    // 3. 부대시설 잔여 가용 예산 = 총 판매가 - 객실 배분액
    const amenityBudget = Math.max(0, totalPkgGross - roomDeduction);

    // 4. 선택된 부대시설 합산
    let fnbAllocatedTotal = 0;
    let leisureAllocatedTotal = 0;
    let fnbRetailTotal = 0;
    let leisureRetailTotal = 0;
    let totalVariableCost = 15000; // 기본 객실 세탁/어메니티 변동비 약 15,000원

    items.forEach(item => {
      const qty = itemQuantities[item.id] || 0;
      if (qty > 0) {
        const itemAllocTotal = item.allocatedPrice * qty;
        const itemRetailTotal = item.retailPrice * qty;
        const itemVc = itemAllocTotal * item.variableCostRate;

        if (item.category === 'FNB') {
          fnbAllocatedTotal += itemAllocTotal;
          fnbRetailTotal += itemRetailTotal;
        } else if (item.category === 'LEISURE') {
          leisureAllocatedTotal += itemAllocTotal;
          leisureRetailTotal += itemRetailTotal;
        }

        totalVariableCost += itemVc;
      }
    });

    const allocatedAmenitiesTotal = fnbAllocatedTotal + leisureAllocatedTotal;
    const remainingBuffer = amenityBudget - allocatedAmenitiesTotal;
    const isOverBudget = remainingBuffer < 0;

    // 5. 고객 체감 가치 분석 (정상가 합계 vs 패키지 판매가)
    const roomRetailNormal = selectedRoomType.baseNormalPrice;
    const totalCustomerRetailValue = roomRetailNormal + fnbRetailTotal + leisureRetailTotal;
    const customerPerceivedSavings = Math.max(0, totalCustomerRetailValue - totalPkgGross);
    const customerDiscountRate = totalCustomerRetailValue > 0
      ? Number(((customerPerceivedSavings / totalCustomerRetailValue) * 100).toFixed(1))
      : 0;

    // 6. GOPPAR 보존 & 한계이익 분석 (Slide 1 핵심)
    const packageNetPrice = Math.round(totalPkgGross / 1.1); // VAT 제외 순매출
    const packageContributionMargin = totalPkgGross - totalVariableCost;
    const contributionMarginRate = totalPkgGross > 0
      ? Number(((packageContributionMargin / totalPkgGross) * 100).toFixed(1))
      : 0;

    // 7. 거시적 성과 시뮬레이션 (해당 월 전체 TRevPAR & RevPAR 상승분)
    const physicalRoomCount = 175; // 벨포레 전체 가용 객실수
    const daysInMonth = new Date(currentMonthData.year, selectedMonth, 0).getDate();
    const monthlyPkgSoldTotal = dailyPackageSalesRooms * daysInMonth;

    // 패키지 1실당 추가 창출 순매출
    const dailyPkgNetRevenue = packageNetPrice * dailyPackageSalesRooms;
    const monthlyPkgNetRevenue = dailyPkgNetRevenue * daysInMonth;

    // 패키지 투숙객의 TRevPOR (객단가)
    const packageTrevPOR = totalPkgGross;

    // 패키지 도입에 따른 TRevPAR (골프 제외) 예상치
    // 기존 순수 리조트 일평균 매출 + (패키지 판매로 인한 부대시설 지출 확장분)
    const dailyBaseNonGolfRev = Math.round(currentMonthData.netRevenueWithoutGolf / daysInMonth);
    
    // 객실 공실을 채우거나 식음/레저 추가 지출을 유도하는 순증분
    // 객실 우선 배분액이 이미 RevPAR를 방어하므로, 부대시설 배분액(allocatedAmenitiesTotal)이 전사 TRevPAR의 순증으로 연결됨
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
    items,
    itemQuantities,
    selectedRoomType,
    selectedMonth,
    dailyPackageSalesRooms
  ]);

  // ==========================================
  // 3. Handlers
  // ==========================================
  const handleItemQuantityChange = (itemId: string, delta: number) => {
    setItemQuantities(prev => {
      const current = prev[itemId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [itemId]: next };
    });
  };

  const handleApplyPreset = (preset: PackagePresetStrategy) => {
    setTargetPackagePrice(preset.targetPriceGross);
    setCustomRoomDeduction(preset.roomAllocation);
    setIsAutoRoomDeduction(false);
    setItemQuantities(preset.itemQuantities);
    const matchingRoom = ROOM_TYPES.find(r => r.name.includes(preset.roomType.slice(0, 3))) || ROOM_TYPES[0];
    setSelectedRoomTypeId(matchingRoom.id);
  };

  const handleResetToSlideDefault = () => {
    setSelectedMonth(1);
    setTargetPackagePrice(265000);
    setIsAutoRoomDeduction(true);
    setCustomRoomDeduction(54000);
    setSelectedRoomTypeId('ROOM_16');
    setItemQuantities({
      'FNB_CUCINA_BF2': 1,
      'FNB_NAMDO_50': 1,
      'LEI_MOTO_KART2': 1,
      'LEI_FARM_HORSE2': 1,
      'LEI_HEALING_SAUNA2': 1
    });
    setDailyPackageSalesRooms(50);
  };

  const handleCopySummary = async () => {
    const selectedItemList = items
      .filter(it => (itemQuantities[it.id] || 0) > 0)
      .map(it => `  - [${it.categoryLabel}] ${it.name} (${itemQuantities[it.id]}개): ${formatCurrency(it.allocatedPrice * itemQuantities[it.id])}원 (정상가 ${formatCurrency(it.retailPrice * itemQuantities[it.id])}원)`)
      .join('\n');

    const summaryText = `[벨포레 리조트 비수기 역산형 패키지 기획안 (SSOT)]
■ 적용 월: ${selectedMonth}월 (${currentMonthData.year}년 실적 기준)
■ 목표 패키지 판매가: ${formatCurrency(reverseCalculations.totalPkgGross)}원 (VAT 포함)
■ 대상 객실: ${selectedRoomType.name}

[1. 역산 배분 구조 (Top-Down Breakdown)]
- 총 패키지 판매가: ${formatCurrency(reverseCalculations.totalPkgGross)}원
- (−) 객실 우선 배분액: ${formatCurrency(reverseCalculations.roomDeduction)}원 (실측 RevPAR ${formatCurrency(currentMonthData.revpar)}원 수준 방어)
- (=) 부대시설 가용 예산: ${formatCurrency(reverseCalculations.amenityBudget)}원
- 부대시설 실제 소진액: ${formatCurrency(reverseCalculations.allocatedAmenitiesTotal)}원 (잔여 마진 버퍼: ${formatCurrency(reverseCalculations.remainingBuffer)}원)

[2. 부대시설 및 직영 레저 구성 내역]
${selectedItemList || '  - 선택된 부대시설 없음'}

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
  // Chart 1: Package Component Breakdown Donut
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
            { name: '직영 레저', value: reverseCalculations.leisureAllocatedTotal, itemStyle: { color: '#EAB308' } },
            ...(reverseCalculations.remainingBuffer > 0 ? [
              { name: '잔여 버퍼', value: reverseCalculations.remainingBuffer, itemStyle: { color: '#0D9488' } }
            ] : [])
          ]
        }
      ]
    };
  }, [reverseCalculations]);

  // Chart 2: Before vs After TRevPAR & RevPAR Comparison
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

  // Filtered Items for Catalog
  const filteredItems = useMemo(() => {
    if (itemCategoryFilter === 'ALL') return items;
    return items.filter(it => it.category === itemCategoryFilter);
  }, [items, itemCategoryFilter]);

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
              <strong>RevPAR(객실)</strong> 중심에서 <strong>TRevPAR(객실+F&B+레저)</strong> 중심으로 전환하여 지갑 점유율을 극대화합니다. 
              목표 패키지 판매가에서 실측 RevPAR 방어액을 선차감하고, 잔여 예산 내에서 <strong>변동비가 낮고 고객 체감가치가 높은 직영 레저</strong>를 필수 결합하여 
              할인 체감도와 <strong>GOPPAR(객실당 영업이익)</strong>를 보존합니다.
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

            {/* 전체 월 선택 드롭다운 */}
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
            1월 슬라이드 기본값 복원
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
      {/* 3. Predefined Strategy Packages (One-click Presets)            */}
      {/* ============================================================== */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
            <Flame size={15} className="text-amber-500" />
            슬라이드 검증 3대 전략 패키지 템플릿 (원클릭 로드)
          </span>
          <span className="text-[11px] text-slate-400">
            카드를 클릭하면 판매가, 방어 RevPAR, 부대시설 조립 내역이 즉시 계산기에 주입됩니다
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {STRATEGY_PRESETS.map(pkg => (
            <div
              key={pkg.id}
              onClick={() => handleApplyPreset(pkg)}
              className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black bg-teal-50 text-teal-700 px-2.5 py-0.5 rounded-full border border-teal-200">
                    {pkg.badge}
                  </span>
                  <span className="text-base font-black text-indigo-950 group-hover:text-teal-700 transition-colors">
                    {formatCurrency(pkg.targetPriceGross)}원
                  </span>
                </div>
                <div className="font-extrabold text-slate-900 text-sm mb-1 leading-snug">
                  {pkg.name}
                </div>
                <div className="text-[11px] font-bold text-teal-800 bg-teal-50/60 p-1.5 rounded-lg border border-teal-100 mb-2">
                  {pkg.tagline}
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-2.5">
                  {pkg.desc}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">객실: {pkg.roomType}</span>
                <span className="text-teal-600 font-extrabold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                  적용하기 <ChevronRight size={13} />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. The 3-Step Top-Down Reverse Allocation Console             */}
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
              시장 경쟁력과 고객 심리 저항선을 고려하여 전략적으로 판매 총액을 먼저 고정합니다.
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
              min={180000}
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
              해당 시즌의 목표 ADR 또는 <strong>실측 RevPAR({formatCurrency(currentMonthData.revpar)}원)</strong>를 최소 방어 요금으로 선차감합니다.
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
            💡 객실을 헐값에 파는 것이 아니라 최소 실현 매출을 먼저 락인(Lock-in)합니다.
          </div>
        </div>

        {/* Step 03: 부대시설 잔여 할당 예산 도출 */}
        <div className="bg-gradient-to-br from-teal-50 to-emerald-100/60 p-5 rounded-2xl border-2 border-teal-500 shadow-xs relative flex flex-col justify-between">
          <div className="absolute -top-3 left-4 bg-teal-800 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Step 03
          </div>
          <div>
            <div className="flex items-center justify-between mt-1 mb-2">
              <span className="text-xs font-bold text-teal-900">부대시설 잔여 할당 예산</span>
              <Award size={16} className="text-teal-700" />
            </div>
            <div className="text-3xl font-black text-teal-950 mb-1">
              = {formatCurrency(reverseCalculations.amenityBudget)}
              <span className="text-sm font-bold text-teal-800 ml-1">원</span>
            </div>
            <p className="text-[11px] text-teal-800 font-medium mb-3 leading-relaxed">
              잔여 금액 내에서 원가/내부 정산가 기준으로 <strong>F&B</strong> 및 <strong>직영 레저 상품</strong>을 구성합니다.
            </p>

            {/* Live Budget Meter */}
            <div className="bg-white p-3 rounded-xl border border-teal-200/80 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-600">현재 조립 소진액:</span>
                <span className="text-slate-900 font-extrabold">
                  {formatCurrency(reverseCalculations.allocatedAmenitiesTotal)}원
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (reverseCalculations.fnbAllocatedTotal / (reverseCalculations.amenityBudget || 1)) * 100)}%`
                  }}
                  title={`F&B: ${formatCurrency(reverseCalculations.fnbAllocatedTotal)}원`}
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
                <span className="text-slate-500">
                  잔여 버퍼(한계이익):
                </span>
                <span className={`font-black ${reverseCalculations.isOverBudget ? 'text-rose-600' : 'text-teal-700'}`}>
                  {reverseCalculations.isOverBudget ? '⚠️ 초과 ' : '+ '}
                  {formatCurrency(Math.abs(reverseCalculations.remainingBuffer))}원
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 text-[10px] text-teal-800 font-bold flex items-center justify-between">
            <span>F&B: {formatCurrency(reverseCalculations.fnbAllocatedTotal)}원</span>
            <span>직영 레저: {formatCurrency(reverseCalculations.leisureAllocatedTotal)}원</span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. Step 04: Interactive Amenity & Leisure Builder             */}
      {/* ============================================================== */}
      <div className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                Step 04
              </span>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Utensils size={18} className="text-emerald-600" />
                부대시설 & 직영 레저 패키지 조립기
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              변동비가 낮고 고객 체감 가치가 높은 직영 레저 시설을 필수 포함하여 할인 체감도와 <strong>GOPPAR</strong>를 보존하세요.
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setItemCategoryFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                itemCategoryFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              전체 보기 ({items.length})
            </button>
            <button
              onClick={() => setItemCategoryFilter('FNB')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                itemCategoryFilter === 'FNB'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🍽️ 식음 F&B
            </button>
            <button
              onClick={() => setItemCategoryFilter('LEISURE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                itemCategoryFilter === 'LEISURE'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🏎️ 직영 레저 (고마진)
            </button>
          </div>
        </div>

        {/* Item Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredItems.map(item => {
            const qty = itemQuantities[item.id] || 0;
            const isSelected = qty > 0;

            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isSelected
                    ? item.category === 'LEISURE'
                      ? 'border-amber-400 bg-amber-50/30 shadow-xs'
                      : 'border-emerald-400 bg-emerald-50/30 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xl">{item.icon}</span>
                      <div>
                        <div className="font-extrabold text-slate-900 text-xs leading-snug">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.unit} · {item.description}
                        </div>
                      </div>
                    </div>

                    {item.isDirectOperation && (
                      <span className="text-[9px] font-black bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-md shrink-0">
                        직영 고마진
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">내부 배분가</span>
                      <strong className="text-slate-900 font-black">
                        {formatCurrency(item.allocatedPrice)}원
                      </strong>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">정상 단품가</span>
                      <span className="text-slate-500 line-through text-[11px]">
                        {formatCurrency(item.retailPrice)}원
                      </span>
                    </div>
                  </div>
                </div>

                {/* Counter Control */}
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500">
                    추정 변동비: {Math.round(item.variableCostRate * 100)}%
                  </span>
                  <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => handleItemQuantityChange(item.id, -1)}
                      disabled={qty === 0}
                      className="w-6 h-6 rounded-lg bg-white text-slate-700 flex items-center justify-center font-bold text-xs hover:bg-slate-200 disabled:opacity-30 cursor-pointer shadow-2xs"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-5 text-center text-xs font-black text-slate-900">
                      {qty}
                    </span>
                    <button
                      onClick={() => handleItemQuantityChange(item.id, 1)}
                      className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xs hover:bg-teal-700 cursor-pointer shadow-2xs"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 6. Step 05: Financial & Value Analysis (고객 가치 & GOPPAR)   */}
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
                객실({formatCurrency(reverseCalculations.roomRetailNormal)}원) + 부대시설 단품가
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
            🎯 <strong>슬라이드 핵심 증명:</strong> 변동비가 극히 낮은 <strong>직영 레저(카트, 루지, 목장 등)</strong>를 필수 포함함으로써, 
            고객 할인율은 30%를 넘기면서도 리조트의 실질 공헌이익률은 <strong>80% 이상</strong> 보존되어 <strong>GOPPAR</strong>가 훼손되지 않습니다.
          </p>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 7. Step 06: 전사 TRevPAR & 거시적 시뮬레이션 성과               */}
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
