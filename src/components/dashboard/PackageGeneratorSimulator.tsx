import { useState, useMemo, useEffect } from 'react';
import { 
  Package, Sparkles, DollarSign, Hotel, Utensils, 
  CheckCircle2, ShieldCheck, Plus, 
  RotateCcw, Copy, Check, TrendingUp, Award, 
  Calendar, Trash2, Layers, CheckCircle, Lock,
  AlertTriangle, Sun, Moon, ArrowRight,
  ChevronDown, ChevronUp, FileSpreadsheet, ShieldAlert
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { secureFetcher } from '../../lib/secureFetcher';
import type { PackageGeneratorResponse } from '../../types/reports-v2';

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
  weekdayRevpar: number;
  weekendRevpar: number;
  trevparWithoutGolf: number;
  weekdayTrevpar: number;
  weekendTrevpar: number;
  trevparTotal: number;
  weekdayTrevparTotal?: number;
  weekendTrevparTotal?: number;
  availableRooms: number;
  roomsSold: number;
  netRevenueWithoutGolf: number;
  roomRevenue: number;
  fnbRevenue: number;
  leisureRevenue: number;
  year: number;
  adr: number;
  overallOcc: number;
  weekdayOcc: number;
  weekendOcc: number;
  weekdayAdr: number;
  weekendAdr: number;
  isBenchmarkLy: boolean;
}

export interface LiveMonthlySummary {
  adr: number;
  revpar: number;
  weekdayRevpar: number;
  weekendRevpar: number;
  trevpar: number;
  trevparWithoutGolf: number;
  weekdayTrevpar: number;
  weekendTrevpar: number;
  weekdayTrevparTotal?: number;
  weekendTrevparTotal?: number;
  overallOcc: number;
  weekdayOcc: number;
  weekendOcc: number;
  weekdayAdr: number;
  weekendAdr: number;
  roomsSold: number;
  totalCapacity: number;
  benchmarkYear: number;
  isBenchmarkLy: boolean;
}

// 객실 타입 마스터
const ROOM_TYPES = [
  { id: 'ROOM_16', name: '16평형 콘도 (2인 기준)', baseNormalPrice: 150000, defaultCapacity: 2, desc: '커플 및 2인 여행객 최적화 기본 객실' },
  { id: 'ROOM_35', name: '35평형 콘도 (4인 기준)', baseNormalPrice: 220000, defaultCapacity: 4, desc: '가족 및 소모임 최적화 중형 객실' },
  { id: 'ROOM_51', name: '51평형 커넥팅룸 (4~6인)', baseNormalPrice: 320000, defaultCapacity: 6, desc: '대가족 및 단체 특화 복합 프리미엄 객실' }
];

// 🌟 [콘도 객실 실측 원가 분석 마스터 SSOT]
// 출처: 경영지원팀 콘도 객실 원가 분석표 (구글 스프레드시트 1AcqnpQP0giNR_lLLDkebORHXuvsWj68q)
// 노벨 경영학적 한계 변동비(Marginal Cost) 원칙: 손님이 1박 투숙할 때마다 현금이 1:1로 유출되는 실질 변동비만 반영
export interface RoomCostDetail {
  cleaningCost: number;       // 청소비 (외주 용역 단가)
  linenLaunderingCost: number;// 린넨류 세탁비 (시트, 베개피, 타올, 이불커버)
  amenityCost: number;        // 어메니티 (4종 + 비누 2EA 1세트)
  consumablesCost: number;    // 소모품비 (화장지, 각티슈, 주방세제, 수세미, 생수, 비닐)
  utilityCost: number;        // 수도광열비 (LPG 난방/온수 45% 가동률 실측 + 욕조 수도요금)
  totalCostNet: number;       // 총 실질 변동원가 (VAT 별도)
  totalCostGross: number;     // 총 실질 변동원가 (VAT 10% 포함)
  linenDetail: { item: string; unitPrice: number; qty: number; amount: number }[];
  consumableDetail: { item: string; amount: number }[];
  utilityDetail: { item: string; amount: number; note: string }[];
}

export const ROOM_COST_MASTER: Record<string, RoomCostDetail> = {
  ROOM_16: {
    cleaningCost: 12325,
    linenLaunderingCost: 3670,
    amenityCost: 1518,
    consumablesCost: 3354,
    utilityCost: 7327, // LPG 2,827원 + 수도 4,500원
    totalCostNet: 28194,
    totalCostGross: 31013,
    linenDetail: [
      { item: '시트', unitPrice: 450, qty: 2, amount: 900 },
      { item: '베개피', unitPrice: 130, qty: 3, amount: 390 },
      { item: '타올', unitPrice: 120, qty: 4, amount: 480 },
      { item: '침대이불커버', unitPrice: 950, qty: 2, amount: 1900 }
    ],
    consumableDetail: [
      { item: '롤휴지 (2개)', amount: 787 },
      { item: '각티슈 (1개)', amount: 1500 },
      { item: '생수 (2병)', amount: 1000 },
      { item: '위생 비닐봉투 (거실 48원+화장실 19원)', amount: 67 }
    ],
    utilityDetail: [
      { item: 'LPG 가스 (난방/온수)', amount: 2827, note: '1실/일 실측 가동률 45% 기준' },
      { item: '상수도 요금', amount: 4500, note: '욕조 1.344㎥ 기준' }
    ]
  },
  ROOM_35: {
    cleaningCost: 24750,
    linenLaunderingCost: 6760,
    amenityCost: 1518,
    consumablesCost: 6940,
    utilityCost: 10154, // LPG 5,654원 + 수도 4,500원
    totalCostNet: 50122,
    totalCostGross: 55134,
    linenDetail: [
      { item: '시트', unitPrice: 450, qty: 3, amount: 1350 },
      { item: '베개피', unitPrice: 130, qty: 5, amount: 650 },
      { item: '타올', unitPrice: 120, qty: 8, amount: 960 },
      { item: '침대이불커버', unitPrice: 950, qty: 2, amount: 1900 },
      { item: '한실이불커버', unitPrice: 950, qty: 1, amount: 950 },
      { item: '한실요커버', unitPrice: 950, qty: 1, amount: 950 }
    ],
    consumableDetail: [
      { item: '롤휴지 (2개)', amount: 787 },
      { item: '각티슈 (2개)', amount: 3000 },
      { item: '주방용품 (퐁퐁/수세미/행주)', amount: 1039 },
      { item: '생수 (4병)', amount: 2000 },
      { item: '위생 비닐봉투', amount: 114 }
    ],
    utilityDetail: [
      { item: 'LPG 가스 (난방/온수)', amount: 5654, note: '1실/일 실측 월평균 10,303,642원 환산' },
      { item: '상수도 요금', amount: 4500, note: '욕조 1.344㎥ 기준' }
    ]
  },
  ROOM_51: {
    cleaningCost: 37075, // 12,325 + 24,750
    linenLaunderingCost: 10430, // 3,670 + 6,760
    amenityCost: 3036, // 1,518 * 2
    consumablesCost: 10294, // 3,354 + 6,940
    utilityCost: 17481, // 7,327 + 10,154
    totalCostNet: 78316,
    totalCostGross: 86147,
    linenDetail: [
      { item: '16평 린넨 전체 세탁', unitPrice: 3670, qty: 1, amount: 3670 },
      { item: '35평 린넨 전체 세탁', unitPrice: 6760, qty: 1, amount: 6760 }
    ],
    consumableDetail: [
      { item: '16평 소모품 일체', amount: 3354 },
      { item: '35평 소모품 일체', amount: 6940 }
    ],
    utilityDetail: [
      { item: '16평 LPG 및 수도', amount: 7327, note: '16평 전용 광열비' },
      { item: '35평 LPG 및 수도', amount: 10154, note: '35평 전용 광열비' }
    ]
  }
};

// 사용자가 쉽게 클릭하여 품목명을 자동 입력할 수 있는 추천 명칭 태그
const QUICK_NAME_TAGS = {
  FNB: ['조식 뷔페', '석식 바우처', '바베큐 플래터', '카페 음료권', '웰컴 와인 플레이트', '식음 통합 이용권'],
  LEISURE: ['서킷 카트 레이싱', '익스트림 루지', '벨포레 목장 & 승마', '사계절 썰매장', '미디어아트 관람권', '요트 세일링 투어', '힐링 사우나']
};

export default function PackageGeneratorSimulator() {
  // ==========================================
  // State: Year, Month & Target Classification
  // ==========================================
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(1);
  const [targetType, setTargetType] = useState<'WEEKDAY' | 'WEEKEND'>('WEEKDAY');

  const [loading, setLoading] = useState<boolean>(true);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [monthlyEfficiencyMap, setMonthlyEfficiencyMap] = useState<Record<number, MonthlyEfficiencyData>>({});
  const [liveSummary, setLiveSummary] = useState<LiveMonthlySummary | null>(null);

  // ==========================================
  // State: Step 1 (목표 패키지 판매가)
  // ==========================================
  const [targetPackagePrice, setTargetPackagePrice] = useState<number>(0);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>('ROOM_16');

  // ==========================================
  // State: Step 2 (객실 우선 배분액)
  // ==========================================
  // 모드: 'COST' (경영지원팀 실측 객실원가 보전형) | 'REVPAR' (월별 실측 RevPAR 방어형) | 'CUSTOM' (직접 설정)
  const [roomDeductionMode, setRoomDeductionMode] = useState<'COST' | 'REVPAR' | 'CUSTOM'>('COST');
  const [customRoomDeduction, setCustomRoomDeduction] = useState<number>(0);

  // ==========================================
  // State: Step 4 (유저가 직접 만드는 부대시설 품목 목록)
  // ==========================================
  const [userItems, setUserItems] = useState<UserCustomItem[]>([]);

  // ==========================================
  // State: Step 6 (전사 시뮬레이션 볼륨)
  // ==========================================
  const [dailyPackageSalesRooms, setDailyPackageSalesRooms] = useState<number>(0); // 일일 목표 패키지 판매 객실 수
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);
  const [showRoomCostDetail, setShowRoomCostDetail] = useState<boolean>(false); // 🌟 실측 객실 원가 분석 아코디언 토글

  // Currency Formatter
  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return '-';
    return new Intl.NumberFormat('ko-KR').format(Math.round(val));
  };

  // Server Simulator Integration: POST /api/v6/simulator/package-generator
  const [serverPackageData, setServerPackageData] = useState<PackageGeneratorResponse | null>(null);
  const [isPackageComputing, setIsPackageComputing] = useState<boolean>(false);
  const [packageNotice, setPackageNotice] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const runPackageSim = async () => {
      setIsPackageComputing(true);
      try {
        const roomKey = selectedRoomTypeId.replace('ROOM_', '');
        const res: PackageGeneratorResponse = await secureFetcher(`${API_BASE}/api/v6/simulator/package-generator`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            year: selectedYear,
            month: selectedMonth,
            targetType,
            roomTypeId: roomKey,
            selectedRoomTypeId,
            targetPackagePrice,
            roomDeductionMode,
            customRoomDeduction,
            userItems,
            dailyPackageSalesRooms,
            nights: 1,
            adults: 2,
            children: 0,
            selectedFacilityIds: userItems.map(i => i.id),
            targetDiscountPct: 10
          })
        });

        if (!isMounted) return;

        if ((res as any)?.isPowerSaving || res?.error?.includes('심야 절전')) {
          setPackageNotice('🌙 심야 절전 운영 시간(20:00 ~ 08:00)에는 서버리스 계산 엔진이 대기 상태입니다. 매일 아침 08:00에 정상 가동됩니다.');
          setServerPackageData(null);
        } else if (res?.success || res?.recommendedSellingPrice !== undefined) {
          setServerPackageData(res);
          setPackageNotice(null);
        }
      } catch (err: any) {
        if (!isMounted) return;
        if (err?.message?.includes('심야 절전') || String(err).includes('500')) {
          setPackageNotice('🌙 심야 절전 운영 시간(20:00 ~ 08:00)에는 서버리스 계산 엔진이 대기 상태입니다. 매일 아침 08:00에 정상 가동됩니다.');
        }
      } finally {
        if (isMounted) setIsPackageComputing(false);
      }
    };

    runPackageSim();
    return () => { isMounted = false; };
  }, [selectedYear, selectedMonth, targetType, selectedRoomTypeId, targetPackagePrice, roomDeductionMode, customRoomDeduction, userItems, dailyPackageSalesRooms]);

  // ==========================================
  // 1. Fetch 12-Month Efficiency Table from DB (Deployed SSOT)
  // ==========================================
  useEffect(() => {
    let isMounted = true;
    const fetchEfficiencyData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await secureFetcher(`${API_BASE}/api/v6/report/monthly-room-efficiency?baseYear=${selectedYear}`);
        const payload = (res as any)?.data ?? res;
        if (isMounted && payload?.monthlyComparison && Array.isArray(payload.monthlyComparison)) {
          const map: Record<number, MonthlyEfficiencyData> = {};
          payload.monthlyComparison.forEach((m: any) => {
            const hasTyData = Boolean(m.ty && m.ty.roomsSold && m.ty.roomsSold > 0);
            const activeData = hasTyData ? m.ty : m.ly;
            if (activeData) {
              const revpar = Number(activeData.revpar ?? activeData.revPar ?? 0);
              const trevparWithoutGolf = Number(activeData.trevparWithoutGolf ?? 0);
              const trevparTotal = Number(activeData.trevparTotal ?? 0);
              const weekdayOcc = Number(activeData.weekdayOcc ?? 0);
              const weekendOcc = Number(activeData.weekendOcc ?? 0);
              const weekdayAdr = Number(activeData.weekdayAdr ?? 0);
              const weekendAdr = Number(activeData.weekendAdr ?? 0);

              const weekdayRevpar = Number(activeData.weekdayRevpar ?? 0);
              const weekendRevpar = Number(activeData.weekendRevpar ?? 0);
              const weekdayTrevpar = Number(activeData.weekdayTrevpar ?? activeData.weekdayTrevparWithoutGolf ?? 0);
              const weekendTrevpar = Number(activeData.weekendTrevpar ?? activeData.weekendTrevparWithoutGolf ?? 0);

              map[m.month] = {
                month: m.month,
                monthLabel: m.monthLabel || `${m.month}월`,
                revpar,
                weekdayRevpar,
                weekendRevpar,
                trevparWithoutGolf,
                weekdayTrevpar,
                weekendTrevpar,
                trevparTotal,
                weekdayTrevparTotal: Number(activeData.weekdayTrevparTotal ?? 0),
                weekendTrevparTotal: Number(activeData.weekendTrevparTotal ?? 0),
                availableRooms: Number(activeData.availableRooms ?? 0),
                roomsSold: Number(activeData.roomsSold ?? 0),
                netRevenueWithoutGolf: Number(activeData.netRevenueWithoutGolf ?? 0),
                roomRevenue: Number(activeData.roomRevenue ?? 0),
                fnbRevenue: Number(activeData.fnbRevenue ?? 0),
                leisureRevenue: Number(activeData.leisureRevenue ?? 0),
                year: Number(activeData.year ?? selectedYear),
                adr: Number(activeData.adr ?? 0),
                overallOcc: Number(activeData.overallOcc ?? 0),
                weekdayOcc,
                weekendOcc,
                weekdayAdr,
                weekendAdr,
                isBenchmarkLy: !hasTyData
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
  }, [selectedYear]);

  // Synchronize liveSummary immediately from preloaded monthlyEfficiencyMap (0ms instant switch)
  useEffect(() => {
    const eff = monthlyEfficiencyMap[selectedMonth];
    if (eff && eff.weekdayOcc > 0) {
      setLiveSummary({
        adr: eff.adr,
        revpar: eff.revpar,
        weekdayRevpar: eff.weekdayRevpar,
        weekendRevpar: eff.weekendRevpar,
        trevpar: eff.trevparTotal,
        trevparWithoutGolf: eff.trevparWithoutGolf,
        weekdayTrevpar: eff.weekdayTrevpar,
        weekendTrevpar: eff.weekendTrevpar,
        weekdayTrevparTotal: eff.weekdayTrevparTotal,
        weekendTrevparTotal: eff.weekendTrevparTotal,
        overallOcc: eff.overallOcc,
        weekdayOcc: eff.weekdayOcc,
        weekendOcc: eff.weekendOcc,
        weekdayAdr: eff.weekdayAdr,
        weekendAdr: eff.weekendAdr,
        roomsSold: eff.roomsSold,
        totalCapacity: eff.availableRooms,
        benchmarkYear: eff.year,
        isBenchmarkLy: eff.isBenchmarkLy
      });
    }
  }, [monthlyEfficiencyMap, selectedMonth]);

  // ==========================================
  // 2. Fetch Selected Month Exact Metrics (Single Call — Zero LY Double Call)
  // ==========================================
  useEffect(() => {
    let isMounted = true;
    const fetchMonthSummary = async () => {
      setLoadingSummary(true);
      try {
        const start = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
        const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
        const end = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        const res = await secureFetcher(`${API_BASE}/api/v6/dashboard/revenue-summary?startDate=${start}&endDate=${end}`).catch(() => null);

        const ls = res?.lodgingStats || {};
        const sum = res?.summary || {};
        const effData = monthlyEfficiencyMap[selectedMonth];
        const hasLiveRooms = Boolean(ls.roomsSold && ls.roomsSold > 0);

        const weekdayAdr = (hasLiveRooms ? ls.weekdayAdr : undefined) || effData?.weekdayAdr || 0;
        const weekendAdr = (hasLiveRooms ? ls.weekendAdr : undefined) || effData?.weekendAdr || 0;
        const weekdayOcc = (hasLiveRooms ? ls.weekdayOcc : undefined) || effData?.weekdayOcc || 0;
        const weekendOcc = (hasLiveRooms ? ls.weekendOcc : undefined) || effData?.weekendOcc || 0;

        const weekdayRevpar = effData?.weekdayRevpar ?? 0;
        const weekendRevpar = effData?.weekendRevpar ?? 0;
        const weekdayTrevparTotal = effData?.weekdayTrevparTotal ?? 0;
        const weekendTrevparTotal = effData?.weekendTrevparTotal ?? 0;
        const weekdayTrevpar = effData?.weekdayTrevpar ?? 0;
        const weekendTrevpar = effData?.weekendTrevpar ?? 0;
        const trevparWithoutGolf = effData?.trevparWithoutGolf ?? sum.trevParExGolf ?? sum.trevPar ?? 0;

        if (isMounted) {
          setLiveSummary({
            adr: (hasLiveRooms ? ls.adr : undefined) || effData?.adr || sum.totalADR || 0,
            revpar: (hasLiveRooms ? sum.revPAR : undefined) || effData?.revpar || 0,
            weekdayRevpar,
            weekendRevpar,
            trevpar: (hasLiveRooms ? sum.trevPar : undefined) || effData?.trevparTotal || 0,
            trevparWithoutGolf,
            weekdayTrevpar,
            weekendTrevpar,
            weekdayTrevparTotal,
            weekendTrevparTotal,
            overallOcc: (hasLiveRooms ? ls.physicalOccRate : undefined) || effData?.overallOcc || sum.totalOcc || 0,
            weekdayOcc,
            weekendOcc,
            weekdayAdr,
            weekendAdr,
            roomsSold: (hasLiveRooms ? ls.roomsSold : undefined) || effData?.roomsSold || sum.totalRooms || 0,
            totalCapacity: ls.totalCapacity ?? effData?.availableRooms ?? 0,
            benchmarkYear: effData?.year ?? selectedYear,
            isBenchmarkLy: !hasLiveRooms && Boolean(effData?.isBenchmarkLy)
          });
        }
      } catch (err) {
        console.warn('[PackageGeneratorSimulator] fetchMonthSummary error:', err);
      } finally {
        if (isMounted) setLoadingSummary(false);
      }
    };

    fetchMonthSummary();
    return () => { isMounted = false; };
  }, [selectedYear, selectedMonth, monthlyEfficiencyMap]);

  // Selected Month Efficiency Baseline
  const currentMonthData = useMemo(() => {
    return monthlyEfficiencyMap[selectedMonth] || {
      month: selectedMonth,
      monthLabel: `${selectedMonth}월`,
      revpar: liveSummary?.revpar ?? 0,
      weekdayRevpar: liveSummary?.weekdayRevpar ?? 0,
      weekendRevpar: liveSummary?.weekendRevpar ?? 0,
      trevparWithoutGolf: liveSummary?.trevparWithoutGolf ?? 0,
      weekdayTrevpar: liveSummary?.weekdayTrevpar ?? 0,
      weekendTrevpar: liveSummary?.weekendTrevpar ?? 0,
      trevparTotal: liveSummary?.trevpar ?? 0,
      availableRooms: liveSummary?.totalCapacity ?? 0,
      roomsSold: liveSummary?.roomsSold ?? 0,
      netRevenueWithoutGolf: 0,
      roomRevenue: 0,
      fnbRevenue: 0,
      leisureRevenue: 0,
      year: selectedYear,
      adr: liveSummary?.adr ?? 0,
      overallOcc: liveSummary?.overallOcc ?? 0,
      weekdayOcc: liveSummary?.weekdayOcc ?? 0,
      weekendOcc: liveSummary?.weekendOcc ?? 0,
      weekdayAdr: liveSummary?.weekdayAdr ?? 0,
      weekendAdr: liveSummary?.weekendAdr ?? 0,
      isBenchmarkLy: Boolean(liveSummary?.isBenchmarkLy)
    };
  }, [monthlyEfficiencyMap, selectedMonth, liveSummary, selectedYear]);

  // Selected Room Type Meta
  const selectedRoomType = useMemo(() => {
    return ROOM_TYPES.find(r => r.id === selectedRoomTypeId) || ROOM_TYPES[0];
  }, [selectedRoomTypeId]);

  // Active target metrics based on Weekday vs Weekend/Holiday selection
  const activeMetrics = useMemo(() => {
    const isWd = targetType === 'WEEKDAY';
    const targetAdr = isWd 
      ? (liveSummary?.weekdayAdr || currentMonthData.weekdayAdr || 0)
      : (liveSummary?.weekendAdr || currentMonthData.weekendAdr || 0);

    const targetOccPct = isWd
      ? (liveSummary?.weekdayOcc ?? currentMonthData.weekdayOcc ?? 0)
      : (liveSummary?.weekendOcc ?? currentMonthData.weekendOcc ?? 0);

    const targetRevpar = isWd
      ? (liveSummary?.weekdayRevpar || currentMonthData.weekdayRevpar || 0)
      : (liveSummary?.weekendRevpar || currentMonthData.weekendRevpar || 0);

    const targetTrevpar = isWd
      ? (liveSummary?.weekdayTrevpar || currentMonthData.weekdayTrevpar || liveSummary?.trevparWithoutGolf || currentMonthData.trevparWithoutGolf || 0)
      : (liveSummary?.weekendTrevpar || currentMonthData.weekendTrevpar || liveSummary?.trevparWithoutGolf || currentMonthData.trevparWithoutGolf || 0);

    return {
      targetAdr,
      targetRevpar,
      targetTrevpar,
      targetOccPct,
      targetLabel: isWd ? '주중' : '주말·공휴일',
      targetFullLabel: isWd ? '주중(일~목)' : '주말(금~토/공휴일)',
      isWeekday: isWd
    };
  }, [targetType, liveSummary, currentMonthData]);

  // Update targetPackagePrice to start from active target TRevPAR
  useEffect(() => {
    const baseTrevpar = activeMetrics.targetTrevpar;
    if (baseTrevpar > 0) {
      setTargetPackagePrice(baseTrevpar);
    }
  }, [selectedMonth, targetType, activeMetrics.targetTrevpar]);

  // Update room deduction when month, targetType, roomType or mode changes
  useEffect(() => {
    if (roomDeductionMode === 'COST') {
      const cost = ROOM_COST_MASTER[selectedRoomTypeId] || ROOM_COST_MASTER['ROOM_16'];
      setCustomRoomDeduction(cost.totalCostGross);
    } else if (roomDeductionMode === 'REVPAR') {
      const baseRevpar = activeMetrics.targetRevpar;
      if (baseRevpar > 0) {
        setCustomRoomDeduction(baseRevpar);
      }
    }
  }, [selectedMonth, targetType, selectedRoomTypeId, roomDeductionMode, activeMetrics.targetRevpar]);

  // ==========================================
  // 3. RM Quota & Safe Allotment (1:1 Bound from Backend Server Simulator)
  // ==========================================
  const allotmentCalculations = useMemo(() => {
    const srvAllotment = (serverPackageData as any)?.allotment ?? serverPackageData ?? {};
    const totalPhysicalRooms = Number(srvAllotment.totalPhysicalRooms ?? 0);
    const targetOccPct = Number(srvAllotment.targetOccPct ?? activeMetrics.targetOccPct ?? 0);
    const lockedRegularRooms = Number(srvAllotment.lockedRegularRooms ?? 0);
    const maxPackageAllotment = Number(srvAllotment.maxPackageAllotment ?? srvAllotment.safeAllotmentRooms ?? 0);
    const maxPackagePct = Number(srvAllotment.maxPackagePct ?? 0);

    const recommendationText = srvAllotment.recommendationText
      || `해당 월 [${activeMetrics.targetLabel}]의 기본 점유율은 ${targetOccPct.toFixed(1)}%이므로, 정가 객실 ${lockedRegularRooms}실을 우선 락(Lock) 걸고, 역산형 패키지는 하루 최대 ${maxPackageAllotment}실까지만 배정하는 것이 안전합니다.`;

    return {
      totalPhysicalRooms,
      targetOccPct,
      occTarget: Number(srvAllotment.occTarget ?? 0),
      lockedRegularRooms,
      maxPackageAllotment,
      maxPackagePct,
      targetLabel: activeMetrics.targetLabel,
      targetFullLabel: activeMetrics.targetFullLabel,
      recommendationText,
      targetAdr: activeMetrics.targetAdr,
      targetRevpar: activeMetrics.targetRevpar,
      targetTrevpar: activeMetrics.targetTrevpar
    };
  }, [serverPackageData, activeMetrics]);

  // ==========================================
  // 4. Core Reverse Calculation (1:1 Bound from Backend Server Simulator)
  // ==========================================
  const reverseCalculations = useMemo(() => {
    const srv = (serverPackageData as any)?.reverseCalculations ?? serverPackageData ?? {};
    const currentRoomCost = ROOM_COST_MASTER[selectedRoomTypeId] || ROOM_COST_MASTER['ROOM_16'];
    const roomVariableCostNet = Number(srv.roomVariableCostNet ?? currentRoomCost.totalCostNet);
    const roomVariableCostGross = Number(srv.roomVariableCostGross ?? currentRoomCost.totalCostGross);

    const targetRevpar = activeMetrics.targetRevpar > 0
      ? activeMetrics.targetRevpar
      : (liveSummary?.revpar || currentMonthData.revpar);

    const defaultDeduction = roomDeductionMode === 'COST'
      ? roomVariableCostGross
      : roomDeductionMode === 'REVPAR'
      ? targetRevpar
      : (customRoomDeduction > 0 ? customRoomDeduction : roomVariableCostGross);

    return {
      totalPkgGross: Number(srv.totalPkgGross ?? targetPackagePrice ?? 0),
      roomDeduction: Number(srv.roomDeduction ?? defaultDeduction ?? 0),
      amenityBudget: Number(srv.amenityBudget ?? 0),
      fnbAllocatedTotal: Number(srv.fnbAllocatedTotal ?? 0),
      leisureAllocatedTotal: Number(srv.leisureAllocatedTotal ?? 0),
      allocatedAmenitiesTotal: Number(srv.allocatedAmenitiesTotal ?? 0),
      fnbBudgetSharePct: Number(srv.fnbBudgetSharePct ?? 0),
      leisureBudgetSharePct: Number(srv.leisureBudgetSharePct ?? 0),
      remainingBuffer: Number(srv.remainingBuffer ?? 0),
      isOverBudget: Boolean(srv.isOverBudget),
      roomRetailNormal: Number(srv.roomRetailNormal ?? selectedRoomType.baseNormalPrice),
      totalCustomerRetailValue: Number(srv.totalCustomerRetailValue ?? selectedRoomType.baseNormalPrice),
      customerPerceivedSavings: Number(srv.customerPerceivedSavings ?? 0),
      customerDiscountRate: Number(srv.customerDiscountRate ?? 0),
      packageNetPrice: Number(srv.packageNetPrice ?? 0),
      currentRoomCost,
      roomVariableCostNet,
      roomVariableCostGross,
      fnbVariableCostNet: Number(srv.fnbVariableCostNet ?? 0),
      leisureVariableCostNet: Number(srv.leisureVariableCostNet ?? 0),
      amenityVariableCostNet: Number(srv.amenityVariableCostNet ?? 0),
      totalVariableCost: Number(srv.totalVariableCostNet ?? roomVariableCostNet),
      totalVariableCostNet: Number(srv.totalVariableCostNet ?? roomVariableCostNet),
      totalVariableCostGross: Number(srv.totalVariableCostGross ?? roomVariableCostGross),
      packageContributionMargin: Number(srv.packageContributionMargin ?? srv.estimatedMarginAmount ?? 0),
      contributionMarginRate: Number(srv.contributionMarginRate ?? srv.estimatedMarginPct ?? 0),
      isNegativeMargin: Boolean(srv.isNegativeMargin),
      breakEvenFloorGross: Number(srv.breakEvenFloorGross ?? roomVariableCostGross),
      packageTrevPOR: Number(srv.packageTrevPOR ?? targetPackagePrice ?? 0),
      physicalRoomCount: Number(srv.physicalRoomCount ?? 0),
      daysInMonth: Number(srv.daysInMonth ?? 0),
      monthlyPkgSoldTotal: Number(srv.monthlyPkgSoldTotal ?? 0),
      dailyPkgNetRevenue: Number(srv.dailyPkgNetRevenue ?? 0),
      monthlyPkgNetRevenue: Number(srv.monthlyPkgNetRevenue ?? 0),
      simulatedTrevPAR: Number(srv.simulatedTrevPAR ?? activeMetrics.targetTrevpar ?? 0),
      trevparUpliftAmount: Number(srv.trevparUpliftAmount ?? 0),
      trevparGrowthRate: Number(srv.trevparGrowthRate ?? 0)
    };
  }, [
    serverPackageData,
    targetPackagePrice,
    roomDeductionMode,
    customRoomDeduction,
    currentMonthData,
    liveSummary,
    selectedRoomType,
    selectedRoomTypeId,
    activeMetrics
  ]);

  // ==========================================
  // 5. User Item Handlers (동적 생성, 수정, 삭제)
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
    setUserItems(prev => prev.map(item => (item.id === id ? { ...item, ...updates } : item)));
  };

  const handleDeleteUserItem = (id: string) => {
    setUserItems(prev => prev.filter(item => item.id !== id));
  };

  const handleFillRemainingBudget = (id: string) => {
    const availableForItem = Math.max(0, reverseCalculations.remainingBuffer);
    handleUpdateUserItem(id, { 
      unitPrice: availableForItem,
      retailPrice: availableForItem
    });
  };

  const handleClearAllItems = () => {
    setUserItems([]);
  };

  const handleResetToSlideDefault = () => {
    setSelectedMonth(1);
    setTargetType('WEEKDAY');
    const baseTrevpar = liveSummary?.weekdayTrevpar || monthlyEfficiencyMap[1]?.weekdayTrevpar || activeMetrics.targetTrevpar || 0;
    const effectiveTrev = baseTrevpar > 0 ? baseTrevpar : (liveSummary?.trevparWithoutGolf ?? 0);
    setTargetPackagePrice(effectiveTrev);
    setRoomDeductionMode('COST');
    setCustomRoomDeduction(ROOM_COST_MASTER['ROOM_16'].totalCostGross);
    setSelectedRoomTypeId('ROOM_16');
    setUserItems([]);
    setDailyPackageSalesRooms(0);
  };

  const handleApplySafeAllotment = () => {
    setDailyPackageSalesRooms(allotmentCalculations.maxPackageAllotment);
  };

  const handleCopySummary = async () => {
    const itemListText = userItems.length > 0
      ? userItems.map(it => `  - [${it.category === 'FNB' ? '식음' : '레저/체험'}] ${it.name} (${it.quantity}개): 단가 ${formatCurrency(it.unitPrice)}원`).join('\n')
      : '  - (등록된 부대시설 항목 없음)';

    const summaryText = `[벨포레 리조트 수익 관리(RM) 및 역산형 패키지 쿼터 기획안]
■ 적용 대상: ${selectedYear}년 ${selectedMonth}월 (${liveSummary?.isBenchmarkLy ? `${liveSummary.benchmarkYear}년 동월 벤치마크 적용` : `${selectedYear}년 실적 기준`})
■ 패키지 타겟 구분: ${allotmentCalculations.targetFullLabel}
■ 목표 패키지 판매가: ${formatCurrency(reverseCalculations.totalPkgGross)}원 (VAT 포함)
■ 대상 객실: ${selectedRoomType.name} (물리 가용 총 175실)

[1. 리조트 수익 관리(RM) 안전 할당 쿼터 (Allotment)]
- 대상 구분 점유율(OCC): ${allotmentCalculations.targetOccPct.toFixed(1)}%
- 일반 객실 방어 수량: ${allotmentCalculations.lockedRegularRooms}실 (정가 잠식 방지 Lock-in)
- 패키지 최대 할당 마지노선: 하루 최대 ${allotmentCalculations.maxPackageAllotment}실
- 권고 사항: "${allotmentCalculations.recommendationText}"

[2. 기준 월 실적 지표 (주중/주말 분리)]
- 객실 ADR: ${formatCurrency(activeMetrics.targetAdr)}원 (주중: ${formatCurrency(liveSummary?.weekdayAdr)}원 / 주말: ${formatCurrency(liveSummary?.weekendAdr)}원)
- 객실 RevPAR: ${formatCurrency(activeMetrics.targetRevpar)}원 (주중: ${formatCurrency(liveSummary?.weekdayRevpar)}원 / 주말: ${formatCurrency(liveSummary?.weekendRevpar)}원)
- 순수 리조트 TRevPAR: ${formatCurrency(activeMetrics.targetTrevpar)}원 (주중: ${formatCurrency(liveSummary?.weekdayTrevpar)}원 / 주말: ${formatCurrency(liveSummary?.weekendTrevpar)}원)
- 점유율(OCC): 전체 ${(liveSummary?.overallOcc ?? 0).toFixed(1)}% | 주중 ${(liveSummary?.weekdayOcc ?? 0).toFixed(1)}% | 주말 ${(liveSummary?.weekendOcc ?? 0).toFixed(1)}%

[3. 역산 배분 구조 (Top-Down Breakdown)]
- 총 패키지 판매가: ${formatCurrency(reverseCalculations.totalPkgGross)}원
- (−) 객실 우선 배분액: ${formatCurrency(reverseCalculations.roomDeduction)}원 ([${activeMetrics.targetLabel}] 실측 RevPAR 수준 방어)
- (=) 부대시설 정해진 가용 예산: ${formatCurrency(reverseCalculations.amenityBudget)}원
- 부대시설 실제 구성액: ${formatCurrency(reverseCalculations.allocatedAmenitiesTotal)}원 (잔여 마진 버퍼: ${formatCurrency(reverseCalculations.remainingBuffer)}원)

[4. 유저 직접 구성 부대시설 품목 내역]
${itemListText}

[5. 고객 가치 및 수익성 분석]
- 고객 체감 정상가 총액: ${formatCurrency(reverseCalculations.totalCustomerRetailValue)}원 상당
- 고객 체감 할인 혜택: ${formatCurrency(reverseCalculations.customerPerceivedSavings)}원 절약 (${reverseCalculations.customerDiscountRate}% 할인 체감)
- 리조트 추정 변동비: ${formatCurrency(reverseCalculations.totalVariableCost)}원
- 1실당 공헌이익(GOPPAR): ${formatCurrency(reverseCalculations.packageContributionMargin)}원 (공헌이익률 ${reverseCalculations.contributionMarginRate}%)

[6. 전사 TRevPAR 기대 성과 (일 ${dailyPackageSalesRooms}실 판매 기준)]
- [${activeMetrics.targetLabel}] 실측 베이스라인 TRevPAR: ${formatCurrency(activeMetrics.targetTrevpar)}원
- 패키지 도입 후 시뮬레이션 TRevPAR: ${formatCurrency(reverseCalculations.simulatedTrevPAR)}원 (+${formatCurrency(reverseCalculations.trevparUpliftAmount)}원 / +${reverseCalculations.trevparGrowthRate}%)
- 객실 RevPAR: ${formatCurrency(reverseCalculations.roomDeduction)}원 방어선 사수
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
  // 6. ECharts Configurations
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
    const baseTargetTrevpar = activeMetrics.targetTrevpar > 0
      ? activeMetrics.targetTrevpar
      : (liveSummary?.trevparWithoutGolf || currentMonthData.trevparWithoutGolf);
    const baseTargetRevpar = activeMetrics.targetRevpar > 0
      ? activeMetrics.targetRevpar
      : (liveSummary?.revpar || currentMonthData.revpar);

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
        data: [`순수 TRevPAR [${activeMetrics.targetLabel}]`, `객실 RevPAR [${activeMetrics.targetLabel}]`]
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (v: number) => `${v.toLocaleString()}원`
        }
      },
      series: [
        {
          name: `${selectedMonth}월 [${activeMetrics.targetLabel}] 실측 베이스라인`,
          type: 'bar',
          data: [baseTargetTrevpar, baseTargetRevpar],
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
            formatter: (p: any) => `${Number(p.value || 0).toLocaleString()}원`,
            fontSize: 10,
            fontWeight: 'bold'
          }
        }
      ]
    };
  }, [currentMonthData, liveSummary, reverseCalculations, selectedMonth, activeMetrics]);

  return (
    <div className="space-y-6">

      {/* Loading or Error State */}
      {(loading || loadingSummary) && (
        <div className="bg-teal-50 border border-teal-200 text-teal-800 text-xs px-4 py-2.5 rounded-2xl flex items-center gap-2 font-bold shadow-2xs">
          <span className="animate-pulse">📊</span>
          <span>실측 월별 ADR·RevPAR·TRevPAR 및 주중/주말 점유율을 실시간 동기화하고 있습니다...</span>
        </div>
      )}
      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-2.5 rounded-2xl font-bold shadow-2xs">
          ⚠️ {error} (기준 실측 베이스라인 모드로 동작합니다.)
        </div>
      )}

      {/* ============================================================== */}
      {/* 1. Header Banner & Target Year/Month Selection                */}
      {/* ============================================================== */}
      <div className="bg-[#284F42] rounded-[28px] p-6 lg:p-8 text-white relative overflow-hidden shadow-xl border border-[#1B382E]">
        <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="bg-white/10 text-[#D0C6BB] text-xs font-bold px-3 py-1 rounded-full border border-white/20 flex items-center gap-1.5 uppercase">
                <Sparkles size={13} />
                수익 관리 & 패키지 쿼터 기획 엔진
              </span>
              <span className="text-xs text-white/80 font-medium bg-white/10 px-2.5 py-0.5 rounded-full">
                물리 가용 객실수 175실 고정 · 일반 정가 판매 잠식(Cannibalization) 방지
              </span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-white flex items-center gap-2.5 break-keep">
              <Package className="text-[#B59269] shrink-0" size={26} />
              리조트 수익 관리(RM) 및 역산형 패키지 쿼터 시뮬레이터
            </h2>
            <p className="text-white/80 text-xs lg:text-sm mt-1.5 max-w-3xl leading-relaxed">
              분석 대상 월의 <strong>ADR, RevPAR, TRevPAR 및 점유율(전체/주중/주말)</strong>을 조회하여, 
              일반 정가 판매를 방어하는 <strong>안전 판매 마지노선(Allotment)</strong>을 자동 제안받고 
              <strong>정해진 부대시설 예산 안에서 식음과 레저·체험 품목을 직접 설계</strong>합니다.
            </p>
          </div>

          {/* Target Year & Month Selector */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-[#1B382E]/90 p-2.5 rounded-2xl border border-white/10 shrink-0 shadow-inner">
            {/* Year Selector */}
            <div className="flex items-center gap-1 bg-[#284F42]/80 p-1 rounded-xl border border-white/10">
              {[2026, 2025].map(y => (
                <button
                  key={y}
                  onClick={() => setSelectedYear(y)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedYear === y
                      ? 'bg-[#B59269] text-white font-black shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {y}년
                </button>
              ))}
            </div>

            <span className="text-xs font-bold text-slate-300 px-1 flex items-center gap-1">
              <Calendar size={13} className="text-[#B59269]" />
              월:
            </span>

            {/* Quick Season Buttons */}
            <div className="flex items-center gap-1">
              {[
                { m: 1, label: '1월', sub: '겨울비수기' },
                { m: 2, label: '2월', sub: '연중최저' },
                { m: 3, label: '3월', sub: '봄개장' },
                { m: 12, label: '12월', sub: '동계진입' }
              ].map(item => (
                <button
                  key={item.m}
                  onClick={() => setSelectedMonth(item.m)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedMonth === item.m
                      ? 'bg-[#B59269] text-white font-black shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div>{item.label}</div>
                  <div className="text-[9px] opacity-75">{item.sub}</div>
                </button>
              ))}
            </div>

            {/* All Months Dropdown */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              aria-label="전체 12개월 타깃 월 선택"
              className="bg-[#284F42] text-white text-xs font-bold px-2 py-1.5 rounded-xl border border-white/20 cursor-pointer"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                <option key={m} value={m}>{m}월 전체</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. 기준 월 실적 지표 출력 & 점유율(OCC) 3분할 콘솔 (Uniform)   */}
      {/* ============================================================== */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-teal-600 shrink-0" />
            <span className="font-extrabold text-slate-800 text-sm">
              {selectedYear}년 {selectedMonth}월 기본 실적 지표 & 점유율(OCC) 3분할
            </span>
            <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded-full">
              {liveSummary?.isBenchmarkLy ? `${liveSummary.benchmarkYear}년 동월 벤치마크 적용` : '실측 DB 기준'}
            </span>
          </div>

          <div className="flex items-center gap-2">
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

        {/* Uniform 4 KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
          
          {/* Card 1: ADR */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between h-full min-h-[145px]">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-1">
                <span>ADR (객실 평균 판매 단가)</span>
                <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-1.5 py-0.5 rounded">
                  {activeMetrics.targetLabel} 기준
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 tracking-tight font-financial">
                {formatCurrency(activeMetrics.targetAdr || liveSummary?.adr)}
                <span className="text-xs font-semibold text-slate-500 ml-1 font-sans">원</span>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-2.5 mt-2 flex items-center justify-between text-[11px] text-slate-600 font-financial">
              <span>주중: <strong className="text-teal-700">{formatCurrency(liveSummary?.weekdayAdr)}원</strong></span>
              <span>주말: <strong className="text-[#284F42]">{formatCurrency(liveSummary?.weekendAdr)}원</strong></span>
            </div>
          </div>

          {/* Card 2: RevPAR */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between h-full min-h-[145px]">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-1">
                <span>RevPAR (가용객실당 객실매출)</span>
                <span className="text-[10px] bg-teal-50 text-teal-700 font-bold px-1.5 py-0.5 rounded">
                  {activeMetrics.targetLabel} 기준
                </span>
              </div>
              <div className="text-2xl font-black text-teal-800 tracking-tight font-financial">
                {formatCurrency(activeMetrics.targetRevpar || liveSummary?.revpar)}
                <span className="text-xs font-semibold text-slate-500 ml-1 font-sans">원</span>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-2.5 mt-2 flex items-center justify-between text-[11px] text-slate-600 font-financial">
              <span>주중: <strong className="text-teal-700">{formatCurrency(liveSummary?.weekdayRevpar)}원</strong></span>
              <span>주말: <strong className="text-[#284F42]">{formatCurrency(liveSummary?.weekendRevpar)}원</strong></span>
            </div>
          </div>

          {/* Card 3: TRevPAR */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between h-full min-h-[145px]">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-1">
                <span>TRevPAR (가용객실당 총매출)</span>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded">
                  {activeMetrics.targetLabel} 기준
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-800 tracking-tight font-financial">
                {formatCurrency(activeMetrics.targetTrevpar || liveSummary?.trevparWithoutGolf || liveSummary?.trevpar)}
                <span className="text-xs font-semibold text-slate-500 ml-1 font-sans">원</span>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-2.5 mt-2 flex items-center justify-between text-[11px] text-slate-600 font-financial">
              <span>주중: <strong className="text-teal-700">{formatCurrency(liveSummary?.weekdayTrevpar)}원</strong></span>
              <span>주말: <strong className="text-[#284F42]">{formatCurrency(liveSummary?.weekendTrevpar)}원</strong></span>
            </div>
          </div>

          {/* Card 4: 점유율 (OCC) 3분할 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between h-full min-h-[145px]">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-1">
                <span>점유율 (OCC) 3분할</span>
                <span className="text-[10px] bg-[#284F42]/10 text-[#284F42] border border-[#284F42]/20 font-bold px-1.5 py-0.5 rounded">
                  {activeMetrics.targetLabel} {(activeMetrics.targetOccPct).toFixed(1)}%
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-center py-0.5">
                <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-bold">전체</div>
                  <div className="text-sm font-black text-slate-900">
                    {(liveSummary?.overallOcc ?? 0).toFixed(1)}%
                  </div>
                </div>
                <div className={`p-1.5 rounded-xl border transition-all ${
                  targetType === 'WEEKDAY'
                    ? 'bg-teal-100/90 border-teal-400 ring-2 ring-teal-500/20 shadow-2xs'
                    : 'bg-teal-50/70 border-teal-100'
                }`}>
                  <div className="text-[10px] text-teal-700 font-bold">주중</div>
                  <div className="text-sm font-black text-teal-800">
                    {(liveSummary?.weekdayOcc ?? 0).toFixed(1)}%
                  </div>
                </div>
                <div className={`p-1.5 rounded-xl border transition-all ${
                  targetType === 'WEEKEND'
                    ? 'bg-[#284F42] text-white border-[#1B382E] ring-2 ring-[#284F42]/20 shadow-2xs'
                    : 'bg-[#284F42]/10 border-[#284F42]/20'
                }`}>
                  <div className={`text-[10px] font-bold ${targetType === 'WEEKEND' ? 'text-white/90' : 'text-[#284F42]'}`}>주말</div>
                  <div className={`text-sm font-black ${targetType === 'WEEKEND' ? 'text-white' : 'text-[#1B382E]'}`}>
                    {(liveSummary?.weekendOcc ?? 0).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-2.5 mt-2 flex items-center justify-between text-[11px] text-slate-600">
              <span>가용 175실 기준</span>
              <span className="font-bold text-slate-700">선택: {activeMetrics.targetLabel} ({activeMetrics.targetOccPct.toFixed(1)}%)</span>
            </div>
          </div>

        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. 패키지 타겟 구분 선택 & 안전 판매 마지노선(Allotment) 제안   */}
      {/* ============================================================== */}
      <div className="bg-white rounded-[28px] border border-[#D0C6BB]/75 p-6 shadow-[0_4px_24px_rgba(40,79,66,0.06)] space-y-5">
        
        {/* Header & Target Selector */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-[#284F42] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                RM Quota Engine
              </span>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Lock size={18} className="text-[#284F42]" />
                역산형 패키지 타겟 구분 & 안전 판매 마지노선(Allotment) 자동 산출
              </h3>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              생성하려는 패키지 타깃을 선택하면, DB에서 비교 벤치마크 점유율(OCC<sub>target</sub>)을 자동 로드하여 
              <strong>정가 잠식 방어 객실 수</strong>와 <strong>하루 최대 안전 배정 마지노선</strong>을 계산합니다.
            </p>
          </div>

          {/* Toggle: 주중용 vs 주말용 */}
          <div className="flex items-center gap-2 bg-[#1B382E] p-1.5 rounded-2xl shrink-0 shadow-inner">
            <button
              onClick={() => setTargetType('WEEKDAY')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                targetType === 'WEEKDAY'
                  ? 'bg-teal-500 text-slate-950 shadow-md scale-102'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <Sun size={15} />
              <span>[주중용] 패키지 (일~목)</span>
              <span className="text-[10px] bg-slate-950/20 px-1.5 py-0.5 rounded-md">
                {(liveSummary?.weekdayOcc ?? 0).toFixed(1)}%
              </span>
            </button>

            <button
              onClick={() => setTargetType('WEEKEND')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                targetType === 'WEEKEND'
                  ? 'bg-[#B59269] text-white shadow-md scale-102'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <Moon size={15} />
              <span>[주말용] 패키지 (금~토)</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-md">
                {(liveSummary?.weekendOcc ?? 0).toFixed(1)}%
              </span>
            </button>
          </div>
        </div>

        {/* Quota Metric Visual Box */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
          
          {/* Card A: 비교 벤치마크 점유율 */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 block mb-1">
                비교 벤치마크 점유율 (OCC<sub>target</sub>)
              </span>
              <div className="text-2xl font-black text-slate-900">
                {allotmentCalculations.targetOccPct.toFixed(1)}%
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {liveSummary?.isBenchmarkLy
                  ? `${liveSummary.benchmarkYear}년 ${selectedMonth}월 [${allotmentCalculations.targetLabel}] 전년 실측`
                  : `${selectedYear}년 ${selectedMonth}월 [${allotmentCalculations.targetLabel}] 당해 실측`}
              </p>
            </div>
            <div className="border-t border-slate-100 pt-2 mt-2 text-[10px] text-slate-400">
              해당 구분 평균 판매단가: {formatCurrency(allotmentCalculations.targetAdr)}원
            </div>
          </div>

          {/* Card B: 일반 객실 방어 수량 */}
          <div className="bg-white p-4 rounded-2xl border-2 border-[#1B382E]/20 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#1B382E]">
                  일반 객실 방어 수량 (정가 Lock-in)
                </span>
                <Lock size={14} className="text-[#284F42]" />
              </div>
              <div className="text-2xl font-black text-[#1B382E] mt-1">
                {allotmentCalculations.lockedRegularRooms}
                <span className="text-xs font-semibold text-slate-500 ml-1">실</span>
              </div>
              <p className="text-[11px] text-[#5A6B63] font-medium mt-1">
                수식: ROUND(175 × {allotmentCalculations.targetOccPct.toFixed(1)}%)
              </p>
            </div>
            <div className="border-t border-[#D0C6BB]/40 pt-2 mt-2 text-[10px] text-[#284F42] font-bold">
              🔒 정가 판매 잠식(Cannibalization) 전면 차단
            </div>
          </div>

          {/* Card C: 패키지 최대 할당 마지노선 */}
          <div className="bg-[#E8F2EE] p-4 rounded-2xl border-2 border-[#284F42] shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-[#1B382E]">
                  패키지 최대 할당 마지노선 (Allotment)
                </span>
                <CheckCircle2 size={15} className="text-[#284F42]" />
              </div>
              <div className="text-2xl font-black text-[#1B382E] mt-1">
                하루 최대 {allotmentCalculations.maxPackageAllotment}
                <span className="text-xs font-semibold text-slate-500 ml-1">실</span>
              </div>
              <p className="text-[11px] text-[#5A6B63] font-medium mt-1">
                수식: 175실 − {allotmentCalculations.lockedRegularRooms}실
              </p>
            </div>
            <div className="border-t border-[#B4C6C1] pt-2 mt-2 text-[10px] text-[#284F42] font-extrabold flex items-center justify-between">
              <span>🎯 안전 쿼터 준수</span>
              <button
                onClick={handleApplySafeAllotment}
                className="text-[10px] bg-[#284F42] text-white px-2 py-0.5 rounded-lg hover:bg-[#1B382E] transition-all cursor-pointer font-bold"
                title="시뮬레이터 일일 판매량에 이 수량을 즉시 적용합니다"
              >
                마지노선 적용
              </button>
            </div>
          </div>

        </div>

        {/* Stacked Visual Bar (175 Rooms SSOT) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-600">
              전체 객실 175실 쿼터 배분 구조:
            </span>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1.5 text-[#1B382E]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#284F42] inline-block"></span>
                일반 정가 방어 {allotmentCalculations.lockedRegularRooms}실 ({allotmentCalculations.targetOccPct.toFixed(1)}%)
              </span>
              <span className="flex items-center gap-1.5 text-[#B59269]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#B59269] inline-block"></span>
                패키지 마지노선 {allotmentCalculations.maxPackageAllotment}실 ({allotmentCalculations.maxPackagePct.toFixed(1)}%)
              </span>
            </div>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden flex shadow-inner">
            <div
              className="bg-[#284F42] h-full transition-all duration-300"
              style={{ width: `${Math.min(100, allotmentCalculations.targetOccPct)}%` }}
              title={`일반 객실 방어: ${allotmentCalculations.lockedRegularRooms}실`}
            ></div>
            <div
              className="bg-[#B59269] h-full transition-all duration-300"
              style={{ width: `${Math.min(100, allotmentCalculations.maxPackagePct)}%` }}
              title={`패키지 최대 할당 마지노선: ${allotmentCalculations.maxPackageAllotment}실`}
            ></div>
          </div>
        </div>

        {/* Official Recommendation Banner */}
        <div className="bg-gradient-to-r from-[#284F42] to-[#1B382E] text-white p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md border border-[#1B382E]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center shrink-0">
              <Award size={20} className="text-teal-300" />
            </div>
            <div>
              <span className="text-[10px] text-teal-300 font-bold uppercase tracking-wider block">
                RM POLICY ADVISORY (권고문구)
              </span>
              <p className="text-xs sm:text-sm font-black text-white leading-relaxed mt-0.5">
                "{allotmentCalculations.recommendationText}"
              </p>
            </div>
          </div>

          <button
            onClick={handleApplySafeAllotment}
            className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-black text-xs hover:bg-teal-400 transition-all cursor-pointer shrink-0 flex items-center justify-center gap-1.5 shadow-sm"
          >
            <span>일 {allotmentCalculations.maxPackageAllotment}실로 시뮬레이션 동기화</span>
            <ArrowRight size={13} />
          </button>
        </div>

      </div>

      {/* Server Power-saving / Operational Notice */}
      {packageNotice && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-xs font-semibold text-amber-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-600 shrink-0" />
            <span>{packageNotice}</span>
          </div>
          <span className="text-[10px] text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded font-mono">
            절전 모드 대기
          </span>
        </div>
      )}

      {/* Server Package Generator Summary Bar */}
      {serverPackageData && (
        <div className="bg-teal-50/80 border border-teal-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-teal-700" />
            <span className="text-xs font-bold text-teal-950">서버리스 패키지 원가·마진 생성기 연동</span>
            {isPackageComputing && <span className="text-[11px] text-teal-600 font-semibold animate-pulse">연산 중...</span>}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            {serverPackageData.recommendedSellingPrice !== undefined && (
              <div>
                <span className="text-slate-500 font-medium">서버 추천 판매가: </span>
                <b className="font-mono text-teal-900 font-black">{serverPackageData.recommendedSellingPrice.toLocaleString()}원</b>
                <button
                  onClick={() => setTargetPackagePrice(serverPackageData.recommendedSellingPrice!)}
                  className="ml-2 px-2 py-0.5 bg-teal-600 text-white rounded text-[10px] font-bold hover:bg-teal-700"
                >
                  적용
                </button>
              </div>
            )}
            {serverPackageData.estimatedMarginAmount !== undefined && (
              <div>
                <span className="text-slate-500 font-medium">예상 마진: </span>
                <b className="font-mono text-emerald-800 font-bold">{serverPackageData.estimatedMarginAmount.toLocaleString()}원</b>
                {serverPackageData.estimatedMarginPct !== undefined && (
                  <span className="ml-1 text-[11px] text-emerald-700 font-bold">({serverPackageData.estimatedMarginPct}%)</span>
                )}
              </div>
            )}
            {serverPackageData.breakEvenRooms !== undefined && (
              <div>
                <span className="text-slate-500 font-medium">손익분기: </span>
                <b className="font-mono text-slate-800">{serverPackageData.breakEvenRooms}실</b>
              </div>
            )}
          </div>
        </div>
      )}

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
            <div className="flex items-center justify-between mt-1 mb-1.5">
              <span className="text-xs font-bold text-slate-500">목표 패키지 판매가 설정</span>
              <DollarSign size={16} className="text-teal-600" />
            </div>

            {/* TRevPAR Baseline Callout */}
            <div className="flex items-center justify-between text-[11px] text-slate-600 mb-2 bg-teal-50/70 p-2 rounded-xl border border-teal-100">
              <span>
                {selectedMonth}월 [{activeMetrics.targetLabel}] TRevPAR: <strong>{formatCurrency(activeMetrics.targetTrevpar)}원</strong>
              </span>
              <button
                onClick={() => setTargetPackagePrice(activeMetrics.targetTrevpar)}
                className="text-[10px] font-bold text-teal-800 bg-white px-2 py-0.5 rounded-lg border border-teal-200 hover:bg-teal-100 transition-all cursor-pointer shadow-2xs"
                title={`${activeMetrics.targetLabel} 실측 TRevPAR 금액으로 즉시 복귀`}
              >
                {activeMetrics.targetLabel} TRevPAR 시작
              </button>
            </div>

            {/* Price Display & Direct Input */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="text-2xl font-black text-slate-900">
                {formatCurrency(targetPackagePrice)}
                <span className="text-xs font-semibold text-slate-500 ml-1">원 (VAT포함)</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] text-slate-400 font-bold">직접입력:</span>
                <input
                  type="number"
                  step={1000}
                  value={targetPackagePrice || ''}
                  onChange={(e) => setTargetPackagePrice(Math.max(0, Number(e.target.value)))}
                  className="w-24 text-right bg-slate-50 text-xs font-black text-slate-900 px-2 py-1 rounded-xl border border-slate-300 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <p className="text-[10px] text-slate-500 mb-2.5">
              실측 {activeMetrics.targetLabel} TRevPAR({formatCurrency(activeMetrics.targetTrevpar)}원)에서 시작하여 원하는 목표 단가로 자유롭게 변경합니다.
            </p>

            {/* Dynamic Buttons Starting from TRevPAR */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {[
                { label: 'TRevPAR 기준', price: activeMetrics.targetTrevpar },
                { label: '15만원', price: 150000 },
                { label: '20만원', price: 200000 },
                { label: '25만원', price: 250000 },
                { label: '30만원', price: 300000 },
                { label: '35만원', price: 350000 }
              ].map(opt => {
                const isSelected = targetPackagePrice === opt.price;

                return (
                  <button
                    key={opt.label}
                    onClick={() => setTargetPackagePrice(opt.price)}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-teal-600 text-white border-teal-600 font-black shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label} ({formatCurrency(opt.price)}원)
                  </button>
                );
              })}
            </div>

            {/* Slider */}
            <input
              type="range"
              min={30000}
              max={500000}
              step={2000}
              value={targetPackagePrice}
              onChange={(e) => setTargetPackagePrice(Number(e.target.value))}
              className="w-full accent-teal-600 cursor-pointer mb-2"
            />
          </div>

          {/* Room Type Selector with SSOT Cost Badge */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-600">대상 객실 타입:</span>
              <span className="text-[10px] text-teal-700 font-extrabold flex items-center gap-1">
                <FileSpreadsheet size={11} className="text-teal-600" />
                실측 변동원가 연동
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {ROOM_TYPES.map(r => {
                const cost = ROOM_COST_MASTER[r.id];
                const isSelected = selectedRoomTypeId === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRoomTypeId(r.id)}
                    className={`py-2 px-1 rounded-xl text-center cursor-pointer border transition-all flex flex-col items-center justify-center gap-0.5 ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-[11px] font-black">{r.name.slice(0, 3)}평형</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                      isSelected ? 'bg-teal-500/20 text-teal-300' : 'bg-slate-200/70 text-slate-500'
                    }`}>
                      원가 {formatCurrency(cost?.totalCostNet)}원
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Step 02: 객실 기준액 우선 공제 (실측 원가 보전형 or RevPAR 방어형) */}
        <div className="bg-white p-5 rounded-2xl border-2 border-[#284F42]/30 shadow-xs relative flex flex-col justify-between">
          <div className="absolute -top-3 left-4 bg-[#284F42] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Step 02
          </div>
          <div>
            <div className="flex items-center justify-between mt-1 mb-2">
              <span className="text-xs font-bold text-slate-500">객실 기준액 우선 공제</span>
              <Hotel size={16} className="text-[#284F42]" />
            </div>
            <div className="text-2xl font-black text-[#1B382E] mb-1">
              − {formatCurrency(reverseCalculations.roomDeduction)}
              <span className="text-sm font-semibold text-slate-500 ml-1">원</span>
            </div>

            {/* Mode Description */}
            <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
              {roomDeductionMode === 'COST'
                ? `경영지원팀 실측 객실 변동원가(${formatCurrency(reverseCalculations.roomDeduction)}원, VAT포함)를 선차감하여 객실 손실을 0원으로 완벽 방어합니다.`
                : roomDeductionMode === 'REVPAR'
                ? `${selectedMonth}월 [${activeMetrics.targetLabel}] 실측 RevPAR(${formatCurrency(activeMetrics.targetRevpar)}원)를 최소 방어 요금으로 선차감합니다.`
                : `사용자 지정 객실 배분액(${formatCurrency(reverseCalculations.roomDeduction)}원)을 선차감합니다.`}
            </p>

            {/* 3 Mode Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 mb-3">
              <button
                type="button"
                onClick={() => setRoomDeductionMode('COST')}
                className={`py-2 px-1.5 rounded-xl text-[10.5px] font-bold border transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                  roomDeductionMode === 'COST'
                    ? 'bg-teal-700 text-white border-teal-700 font-black shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1">
                  <CheckCircle2 size={11} className={roomDeductionMode === 'COST' ? 'text-teal-200' : 'text-slate-400'} />
                  <span>실측 원가 보전형</span>
                </div>
                <span className={`text-[9px] ${roomDeductionMode === 'COST' ? 'text-teal-100' : 'text-slate-500'}`}>
                  {formatCurrency(reverseCalculations.currentRoomCost.totalCostGross)}원 (추천)
                </span>
              </button>
              <button
                type="button"
                onClick={() => setRoomDeductionMode('REVPAR')}
                className={`py-2 px-1.5 rounded-xl text-[10.5px] font-bold border transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                  roomDeductionMode === 'REVPAR'
                    ? 'bg-[#284F42] text-white border-[#284F42] font-black shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1">
                  <CheckCircle2 size={11} className={roomDeductionMode === 'REVPAR' ? 'text-white/80' : 'text-slate-400'} />
                  <span>실측 RevPAR 방어형</span>
                </div>
                <span className={`text-[9px] ${roomDeductionMode === 'REVPAR' ? 'text-white/90' : 'text-slate-500'}`}>
                  {formatCurrency(activeMetrics.targetRevpar)}원
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRoomDeductionMode('CUSTOM');
                  if (customRoomDeduction === 0) setCustomRoomDeduction(reverseCalculations.currentRoomCost.totalCostGross);
                }}
                className={`py-2 px-1.5 rounded-xl text-[10.5px] font-bold border transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                  roomDeductionMode === 'CUSTOM'
                    ? 'bg-slate-800 text-white border-slate-800 font-black shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1">
                  <CheckCircle2 size={11} className={roomDeductionMode === 'CUSTOM' ? 'text-slate-300' : 'text-slate-400'} />
                  <span>직접 설정</span>
                </div>
                <span className={`text-[9px] ${roomDeductionMode === 'CUSTOM' ? 'text-slate-300' : 'text-slate-500'}`}>
                  슬라이더 조절
                </span>
              </button>
            </div>

            {/* 실측 원가 모드 세부 견적 요약 바 */}
            {roomDeductionMode === 'COST' && (
              <div className="bg-teal-50/80 border border-teal-200 rounded-xl p-2.5 mb-2 text-[11px] space-y-1">
                <div className="flex items-center justify-between font-bold text-teal-950">
                  <span className="flex items-center gap-1">
                    <FileSpreadsheet size={12} className="text-teal-700" />
                    경영지원팀 5대 원가 기준 연동
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowRoomCostDetail(true)}
                    className="text-[10px] text-teal-800 underline hover:text-teal-950 cursor-pointer font-bold"
                  >
                    원가 상세표 보기 ↓
                  </button>
                </div>
                <div className="text-[10px] text-teal-800 leading-tight">
                  청소 {formatCurrency(reverseCalculations.currentRoomCost.cleaningCost)} · 린넨 {formatCurrency(reverseCalculations.currentRoomCost.linenLaunderingCost)} · 어메니티 {formatCurrency(reverseCalculations.currentRoomCost.amenityCost)} · 소모품 {formatCurrency(reverseCalculations.currentRoomCost.consumablesCost)} · 광열비 {formatCurrency(reverseCalculations.currentRoomCost.utilityCost)}
                </div>
                <div className="text-[10px] text-slate-500 pt-0.5">
                  * 순원가 {formatCurrency(reverseCalculations.currentRoomCost.totalCostNet)}원 + 부가세 10% = <strong>{formatCurrency(reverseCalculations.currentRoomCost.totalCostGross)}원</strong>
                </div>
              </div>
            )}

            {roomDeductionMode === 'CUSTOM' && (
              <div className="space-y-1 mb-2">
                <input
                  type="range"
                  min={Math.min(30000, reverseCalculations.currentRoomCost.totalCostGross)}
                  max={150000}
                  step={1000}
                  value={customRoomDeduction}
                  onChange={(e) => setCustomRoomDeduction(Number(e.target.value))}
                  className="w-full accent-[#284F42] cursor-pointer"
                />
                <div className="flex items-center justify-between text-[10px]">
                  <span className={customRoomDeduction < reverseCalculations.currentRoomCost.totalCostGross ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                    {customRoomDeduction < reverseCalculations.currentRoomCost.totalCostGross 
                      ? `⚠️ 실측 원가(${formatCurrency(reverseCalculations.currentRoomCost.totalCostGross)}원) 미달 (역마진 위험)` 
                      : `최소 실측 원가: ${formatCurrency(reverseCalculations.currentRoomCost.totalCostGross)}원`}
                  </span>
                  <span className="text-[#284F42] font-bold">
                    배분액: {formatCurrency(customRoomDeduction)}원
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            💡 객실을 헐값에 파는 대신 최소 실현 매출 또는 실측 원가를 먼저 락인(Lock-in)합니다.
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
                    width: `${Math.min(100, reverseCalculations.fnbBudgetSharePct)}%`
                  }}
                  title={`식음: ${formatCurrency(reverseCalculations.fnbAllocatedTotal)}원`}
                ></div>
                <div
                  className="bg-amber-400 h-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, reverseCalculations.leisureBudgetSharePct)}%`
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
      {/* 5. Step 04: 유저가 직접 만드는 부대시설(식음/레저) 구성기       */}
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

        {/* Quick Name Suggestions Chips */}
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
            {userItems.map((item) => {
              const itemSubtotal = (item as any).subtotal ?? item.unitPrice;

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
                      •
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

                    {/* Quantity Selector */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                      <span className="text-[10px] text-slate-500 px-1 font-bold">수량:</span>
                      <select
                        value={item.quantity || 1}
                        onChange={(e) => handleUpdateUserItem(item.id, { quantity: Number(e.target.value) })}
                        className="bg-white text-xs font-black text-slate-900 px-2 py-1 rounded-lg border border-slate-200 cursor-pointer"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((q) => (
                          <option key={q} value={q}>{q}</option>
                        ))}
                      </select>
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

        {/* 🌟 리조트 실질 수익성 & 노벨 경영학적 한계 공헌이익(Contribution Margin) 분석 */}
        <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Award size={16} className="text-teal-600" />
              리조트 실질 수익성 & GOPPAR 보존
            </h4>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] bg-teal-50 text-teal-800 font-extrabold px-2 py-0.5 rounded-full border border-teal-200 flex items-center gap-1">
                <FileSpreadsheet size={11} className="text-teal-600" />
                원가 분석표 기준 연동
              </span>
              <span className="text-[10px] bg-[#284F42]/10 text-[#284F42] font-extrabold px-2 py-0.5 rounded-full border border-[#284F42]/20">
                한계비용(MC) 원칙
              </span>
            </div>
          </div>

          {/* 역마진 위험 경고 (Fail-Loudly) */}
          {reverseCalculations.isNegativeMargin && (
            <div className="bg-rose-50 border-2 border-rose-500 rounded-2xl p-4 flex items-start gap-3 text-rose-900 shadow-sm">
              <ShieldAlert size={20} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <div className="font-black text-rose-800 text-sm flex items-center gap-1.5">
                  🚨 [역마진 손익분기 방어선 붕괴 경고]
                </div>
                <p className="leading-relaxed text-slate-700">
                  현재 설정된 패키지 판매가(<strong>{formatCurrency(reverseCalculations.totalPkgGross)}원</strong>)는 객실+부대시설의 실질 한계변동비(<strong>{formatCurrency(reverseCalculations.totalVariableCostGross)}원</strong>, VAT포함)에 미달합니다.
                  투숙이 발생할 때마다 <strong>1실당 {formatCurrency(Math.abs(reverseCalculations.packageContributionMargin))}원의 현금 손실</strong>이 발생합니다.
                </p>
                <div className="text-[11px] font-bold text-rose-800 bg-rose-100/70 px-2.5 py-1 rounded-lg inline-block mt-1">
                  절대 손익분기 마지노선: 최소 {formatCurrency(reverseCalculations.breakEvenFloorGross)}원 (VAT 포함) 이상으로 책정하십시오.
                </div>
              </div>
            </div>
          )}

          {/* 3대 한계원가 및 공헌이익 핵심 지표 카드 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* 1. 객실 실측 변동원가 */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-500 text-[11px] font-bold">객실 실측 변동원가 (Room MC)</span>
                <Hotel size={13} className="text-slate-400" />
              </div>
              <div className="text-xl font-black text-slate-900">
                {formatCurrency(reverseCalculations.roomVariableCostNet)}원
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                VAT포함 {formatCurrency(reverseCalculations.roomVariableCostGross)}원 ({selectedRoomType.name.slice(0, 3)}평형 기준)
              </div>
            </div>

            {/* 2. 부대시설 변동원가 */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-500 text-[11px] font-bold">부대시설 변동원가 (Amenity MC)</span>
                <Utensils size={13} className="text-slate-400" />
              </div>
              <div className="text-xl font-black text-slate-900">
                {formatCurrency(reverseCalculations.amenityVariableCostNet)}원
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                식음 {formatCurrency(reverseCalculations.fnbVariableCostNet)}원{'(35%)'} + 레저 {formatCurrency(reverseCalculations.leisureVariableCostNet)}원{'(5%)'}
              </div>
            </div>

            {/* 3. 1실당 순 공헌이익 */}
            <div className={`p-3.5 rounded-xl border ${
              reverseCalculations.isNegativeMargin 
                ? 'bg-rose-50 border-rose-300' 
                : 'bg-teal-50/70 border-teal-200'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[11px] font-bold ${reverseCalculations.isNegativeMargin ? 'text-rose-900' : 'text-teal-900'}`}>
                  1실당 순 공헌이익 (CM / GOPPAR)
                </span>
                <Award size={13} className={reverseCalculations.isNegativeMargin ? 'text-rose-600' : 'text-teal-600'} />
              </div>
              <div className={`text-xl font-black ${reverseCalculations.isNegativeMargin ? 'text-rose-700' : 'text-teal-950'}`}>
                {formatCurrency(reverseCalculations.packageContributionMargin)}원
              </div>
              <div className={`text-[10px] font-bold mt-1 ${reverseCalculations.isNegativeMargin ? 'text-rose-700' : 'text-teal-800'}`}>
                공헌이익률: <strong>{reverseCalculations.contributionMarginRate}%</strong> (순매출 대비)
              </div>
            </div>
          </div>

          {/* 🌟 [경영지원팀 SSOT 콘도 객실 원가 분석 아코디언] */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
            <button
              type="button"
              onClick={() => setShowRoomCostDetail(!showRoomCostDetail)}
              className="w-full px-4 py-3 bg-slate-100/80 hover:bg-slate-100 transition-colors flex items-center justify-between text-left cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={15} className="text-teal-700" />
                <span className="text-xs font-black text-slate-800">
                  [경영지원팀] 콘도 객실 원가 분석 5대 항목 실측 상세표 ({selectedRoomType.name.slice(0, 3)}평형)
                </span>
                <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded-full border border-teal-200">
                  실측 합계 {formatCurrency(reverseCalculations.currentRoomCost.totalCostNet)}원 (VAT별도)
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                <span>{showRoomCostDetail ? '접기' : '상세보기'}</span>
                {showRoomCostDetail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </button>

            {showRoomCostDetail && (
              <div className="p-4 space-y-4 bg-white border-t border-slate-200 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
                  {/* 1. 청소비 */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="text-[10px] text-slate-500 font-bold mb-1">1. 청소비 (외주 용역)</div>
                    <div className="text-sm font-black text-slate-900">
                      {formatCurrency(reverseCalculations.currentRoomCost.cleaningCost)}원
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {selectedRoomTypeId === 'ROOM_16' ? '16평 외주단가' : selectedRoomTypeId === 'ROOM_35' ? '35평 외주단가' : '16평+35평 합산'}
                    </div>
                  </div>

                  {/* 2. 린넨류 세탁비 */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="text-[10px] text-slate-500 font-bold mb-1">2. 린넨류 세탁비</div>
                    <div className="text-sm font-black text-slate-900">
                      {formatCurrency(reverseCalculations.currentRoomCost.linenLaunderingCost)}원
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      시트, 베개피, 타올, 이불커버 등
                    </div>
                  </div>

                  {/* 3. 어메니티 */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="text-[10px] text-slate-500 font-bold mb-1">3. 객실 어메니티</div>
                    <div className="text-sm font-black text-slate-900">
                      {formatCurrency(reverseCalculations.currentRoomCost.amenityCost)}원
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      샴푸/린스/바디/로션+비누
                    </div>
                  </div>

                  {/* 4. 소모품비 */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="text-[10px] text-slate-500 font-bold mb-1">4. 객실 소모품비</div>
                    <div className="text-sm font-black text-slate-900">
                      {formatCurrency(reverseCalculations.currentRoomCost.consumablesCost)}원
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      롤휴지, 각티슈, 생수, 위생용품
                    </div>
                  </div>

                  {/* 5. 수도광열비 */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="text-[10px] text-slate-500 font-bold mb-1">5. 수도광열비 (실측)</div>
                    <div className="text-sm font-black text-slate-900">
                      {formatCurrency(reverseCalculations.currentRoomCost.utilityCost)}원
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      LPG 난방/온수 + 욕조 상수도
                    </div>
                  </div>
                </div>

                {/* 세부 명세 그리드 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-[11px]">
                  {/* 린넨류 세부 */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                    <span className="font-bold text-slate-700 block mb-1.5 flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-teal-600" />
                      린넨류 세탁 규격 (단가×수량)
                    </span>
                    <div className="space-y-1">
                      {reverseCalculations.currentRoomCost.linenDetail.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-slate-600">
                          <span>{item.item} ({formatCurrency(item.unitPrice)}원 × {item.qty}EA)</span>
                          <span className="font-semibold">{formatCurrency(item.amount)}원</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 소모품 세부 */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                    <span className="font-bold text-slate-700 block mb-1.5 flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-teal-600" />
                      객실 소모품 구성 내역
                    </span>
                    <div className="space-y-1">
                      {reverseCalculations.currentRoomCost.consumableDetail.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-slate-600">
                          <span>{item.item}</span>
                          <span className="font-semibold">{formatCurrency(item.amount)}원</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 광열비 산출 근거 */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                    <span className="font-bold text-slate-700 block mb-1.5 flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-teal-600" />
                      수도광열비 실측 산출 기준
                    </span>
                    <div className="space-y-1">
                      {reverseCalculations.currentRoomCost.utilityDetail.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-slate-600">
                          <div>
                            <div>{item.item}</div>
                            <div className="text-[9px] text-slate-400">{item.note}</div>
                          </div>
                          <span className="font-semibold">{formatCurrency(item.amount)}원</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                  <span>* 출처: 경영지원팀 콘도 객실 원가 분석표</span>
                  <span className="font-bold text-slate-700">
                    총 변동원가: 순액 {formatCurrency(reverseCalculations.currentRoomCost.totalCostNet)}원 / 부가세 포함 {formatCurrency(reverseCalculations.currentRoomCost.totalCostGross)}원
                  </span>
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200 leading-relaxed">
            🎯 <strong>노벨 경영학적 한계 공헌이익(Contribution Margin) 원리:</strong> 비수기 유휴 객실은 당일이 지나면 가치가 소멸하는 소멸성 자산입니다.
            건물 감가상각과 고정인건비는 이미 지출된 매몰비용(Sunk Cost)이므로, 패키지 순판매가가 실측 한계변동비(객실 실측원가 {formatCurrency(reverseCalculations.roomVariableCostNet)}원 + 부대시설 변동비)를 초과하기만 하면,
            초과분인 <strong>{formatCurrency(reverseCalculations.packageContributionMargin)}원</strong> 전체가 리조트 고정비 회수에 기여하여 <strong>GOPPAR와 영업이익을 실질적으로 방어</strong>합니다.
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
              <span className="bg-[#284F42]/10 text-[#284F42] border border-[#284F42]/20 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                Step 05
              </span>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <TrendingUp size={18} className="text-[#284F42]" />
                {selectedMonth}월 [{activeMetrics.targetLabel}] 전사 TRevPAR & RevPAR 상승 시뮬레이션
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              패키지 일일 판매 목표량에 따른 순수 리조트 TRevPAR(골프 제외)와 총 순매출 상승 효과를 실시간 역산합니다.
            </p>
          </div>

          {/* Volume Slider Control with Allotment Warning */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">일일 목표 패키지 판매량:</span>
              <input
                type="range"
                min={5}
                max={175}
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

            {/* Warning or Success Badge */}
            {dailyPackageSalesRooms > allotmentCalculations.maxPackageAllotment ? (
              <span className="text-[10px] bg-amber-100 text-amber-900 font-extrabold px-2 py-1 rounded-xl border border-amber-300 flex items-center gap-1">
                <AlertTriangle size={12} className="text-amber-700" />
                안전 마지노선({allotmentCalculations.maxPackageAllotment}실) 초과 (잠식 위험)
              </span>
            ) : (
              <span className="text-[10px] bg-teal-100 text-teal-900 font-extrabold px-2 py-1 rounded-xl border border-teal-300 flex items-center gap-1">
                <CheckCircle2 size={12} className="text-teal-700" />
                안전 마지노선({allotmentCalculations.maxPackageAllotment}실) 준수
              </span>
            )}
          </div>
        </div>

        {/* 4 Key Macro Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between h-full min-h-[145px]">
            <div>
              <span className="text-[11px] text-slate-500 font-bold block mb-1">
                시뮬레이션 TRevPAR (골프 제외)
              </span>
              <div className="text-2xl font-black text-teal-700 tracking-tight">
                {formatCurrency(reverseCalculations.simulatedTrevPAR)}원
              </div>
            </div>
            <div className="border-t border-slate-200/80 pt-2.5 mt-2 text-[10px] text-teal-800 font-bold">
              [{activeMetrics.targetLabel}] 실측({formatCurrency(activeMetrics.targetTrevpar)}원) 대비 
              <strong className="ml-1 text-emerald-600">+{reverseCalculations.trevparGrowthRate}%</strong>
            </div>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between h-full min-h-[145px]">
            <div>
              <span className="text-[11px] text-slate-500 font-bold block mb-1">
                객실 RevPAR 방어 수준
              </span>
              <div className="text-2xl font-black text-[#1B382E] tracking-tight">
                {formatCurrency(reverseCalculations.roomDeduction)}원
              </div>
            </div>
            <div className="border-t border-slate-200/80 pt-2.5 mt-2 text-[10px] text-slate-500">
              [{activeMetrics.targetLabel}] 실측({formatCurrency(activeMetrics.targetRevpar)}원) 100% 방어선 유지
            </div>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between h-full min-h-[145px]">
            <div>
              <span className="text-[11px] text-slate-500 font-bold block mb-1">
                패키지 1실 객단가 (TRevPOR)
              </span>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {formatCurrency(reverseCalculations.packageTrevPOR)}원
              </div>
            </div>
            <div className="border-t border-slate-200/80 pt-2.5 mt-2 text-[10px] text-slate-500">
              단품 투숙객 대비 지갑 점유율 락인
            </div>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between h-full min-h-[145px]">
            <div>
              <span className="text-[11px] text-slate-500 font-bold block mb-1">
                월간 패키지 창출 순매출
              </span>
              <div className="text-2xl font-black text-emerald-700 tracking-tight">
                {formatCurrency(reverseCalculations.monthlyPkgNetRevenue)}원
              </div>
            </div>
            <div className="border-t border-slate-200/80 pt-2.5 mt-2 text-[10px] text-emerald-800 font-bold">
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
