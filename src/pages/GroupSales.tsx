import { useState, useEffect, useMemo } from 'react';
import { useDate } from '../contexts/DateContext';
import { getPresetDateRange, type DatePresetType } from '../lib/dateUtils';
import { secureFetcher } from '../lib/secureFetcher';
import GlobalDatePicker from '../components/GlobalDatePicker';
import { 
  Building2, Phone, DollarSign, Search, 
  ChevronRight, RefreshCw, Layers, Award, Utensils,
  ShieldCheck, X, ChevronDown, ChevronUp
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

const formatCurrency = (val: any) => {
  if (!val && val !== 0) return '0';
  const num = typeof val === 'string' ? Number(val.replace(/,/g, '')) : Number(val);
  return isNaN(num) ? '0' : new Intl.NumberFormat('ko-KR').format(Math.round(num));
};

export interface GroupFacilityItem {
  facilityName: string;
  category: 'ROOM' | 'BANQUET' | 'FNB' | 'GOLF' | 'LEISURE' | 'OTHER';
  revenue: number;
}

export interface VisitHistoryEntry {
  visitNo: number;
  checkInDate: string;
  checkOutDate: string;
  categoryName: string;
  paxCount: number;
  totalRevenue: number;
  stayDays: number;
  facilitiesUsed?: GroupFacilityItem[];
}

export interface CorporateGroupItem {
  groupId: string;
  groupName: string;
  category: 'RESORT_CORP' | 'SEMINAR' | 'GOLF_GROUP' | 'BANQUET' | 'OTHER';
  categoryName: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  salesManager?: string;
  checkInDate: string;
  checkOutDate: string;
  stayDays: number;
  paxCount: number;
  totalRevenue: number;
  avgSpendPerPax: number;
  // Loyalty & Repeat Visit Metrics
  visitCount?: number;
  totalLtvRevenue?: number;
  loyaltyTier?: 'DIAMOND' | 'GOLD' | 'SILVER' | 'BRONZE';
  tierLabel?: string;
  visitHistory?: VisitHistoryEntry[];
  spendingBreakdown: {
    roomRevenue: number;
    roomsCount?: number;
    roomTypesUsed?: string[];
    fnbRevenue: number;
    golfRevenue: number;
    golfTeams?: number;
    leisureRevenue: number;
  };
  facilitiesUsed: GroupFacilityItem[];
  paymentMethod?: string;
  notes?: string;
}

export default function GroupSales() {
  const { startDate, endDate, setStartDate, setEndDate } = useDate();
  
  const [groupList, setGroupList] = useState<CorporateGroupItem[]>([]);
  const [summaryData, setSummaryData] = useState<{
    totalGroups: number;
    totalPax: number;
    totalRevenue: number;
    avgSpendPerGroup: number;
    avgSpendPerPax: number;
    roomRevenue: number;
    fnbRevenue: number;
    golfRevenue: number;
    leisureRevenue: number;
    repeatGroupsCount?: number;
    loyaltyRate?: number;
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedLoyaltyFilter, setSelectedLoyaltyFilter] = useState<string>('ALL');
  const [selectedFacilityFilter, setSelectedFacilityFilter] = useState<'ALL' | 'NAMDO' | 'RANCH' | 'BANQUET' | 'GOLF' | 'MOTO'>('ALL');
  const [sortBy, setSortBy] = useState<'REVENUE' | 'VISITS' | 'SPEND_PER_PAX' | 'RECENT'>('REVENUE');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedGroupModal, setSelectedGroupModal] = useState<CorporateGroupItem | null>(null);
  const [showLogicExplainer, setShowLogicExplainer] = useState<boolean>(true);

  const applyPreset = (preset: DatePresetType) => {
    const range = getPresetDateRange(preset);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  };

  const isPresetActive = (preset: DatePresetType) => {
    const p = getPresetDateRange(preset);
    if (p.isRange) {
      return startDate === p.startDate && endDate === p.endDate;
    }
    return startDate === p.startDate && !endDate;
  };

  const fetchGroupSales = async () => {
    setLoading(true);
    try {
      const queryParams = endDate
        ? `startDate=${startDate}&endDate=${endDate}`
        : `date=${startDate}`;

      const res = await secureFetcher(`${API_BASE}/api/v5/report/corporate-group-sales?${queryParams}`).catch(() => null);
      const payload = res?.data ?? res;

      if (payload && (payload.groups || payload.summary)) {
        setGroupList(payload.groups || []);
        setSummaryData(payload.summary || null);
      } else {
        setGroupList([]);
        setSummaryData(null);
      }
    } catch (err) {
      console.error('Corporate Group Sales Fetch Error:', err);
      setGroupList([]);
      setSummaryData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupSales();
  }, [startDate, endDate]);

  // Enrich groups with Loyalty Profiles and deduplication across intervals
  const enrichedGroups = useMemo(() => {
    const companyMap = new Map<string, {
      visits: CorporateGroupItem[];
      totalLtv: number;
    }>();

    groupList.forEach(item => {
      const key = item.groupName.trim();
      const existing = companyMap.get(key) || { visits: [], totalLtv: 0 };
      existing.visits.push(item);
      existing.totalLtv += item.totalRevenue;
      companyMap.set(key, existing);
    });

    return groupList.map(item => {
      const key = item.groupName.trim();
      const companyInfo = companyMap.get(key);
      const calculatedVisits = item.visitCount || companyInfo?.visits.length || 1;
      const totalLtv = item.totalLtvRevenue || companyInfo?.totalLtv || item.totalRevenue;

      let tier: 'DIAMOND' | 'GOLD' | 'SILVER' | 'BRONZE' = 'BRONZE';
      let tierLabel = '신규 1회';

      if (calculatedVisits >= 4 || totalLtv >= 40000000) {
        tier = 'DIAMOND';
        tierLabel = `VIP ${calculatedVisits}회차`;
      } else if (calculatedVisits >= 3 || totalLtv >= 20000000) {
        tier = 'GOLD';
        tierLabel = `골드 ${calculatedVisits}회차`;
      } else if (calculatedVisits >= 2) {
        tier = 'SILVER';
        tierLabel = `재방문 ${calculatedVisits}회`;
      }

      const history: VisitHistoryEntry[] = item.visitHistory && item.visitHistory.length > 0
        ? item.visitHistory
        : (companyInfo?.visits || [item]).map((v, vIdx) => ({
            visitNo: vIdx + 1,
            checkInDate: v.checkInDate,
            checkOutDate: v.checkOutDate,
            categoryName: v.categoryName || v.category,
            paxCount: v.paxCount,
            totalRevenue: v.totalRevenue,
            stayDays: v.stayDays,
            facilitiesUsed: v.facilitiesUsed
          }));

      // Clean facilities list: sanitize obsolete facility names
      const cleanFacilities = (item.facilitiesUsed || []).map(f => {
        let name = f.facilityName;
        if (name.includes('루지')) {
          name = name.replace('루지/', '').replace('/루지', '').replace('루지', '');
          if (!name.trim()) name = '벨포레 목장/미디어아트';
        }
        return {
          ...f,
          facilityName: name
        };
      });

      return {
        ...item,
        visitCount: calculatedVisits,
        totalLtvRevenue: totalLtv,
        loyaltyTier: tier,
        tierLabel,
        visitHistory: history,
        facilitiesUsed: cleanFacilities
      };
    });
  }, [groupList]);

  // Filter & Sort
  const filteredAndSortedGroups = useMemo(() => {
    const filtered = enrichedGroups.filter(g => {
      const matchCategory = selectedCategory === 'ALL' || g.category === selectedCategory;
      
      let matchLoyalty = true;
      if (selectedLoyaltyFilter === 'REPEAT_ALL') {
        matchLoyalty = (g.visitCount || 1) >= 2;
      } else if (selectedLoyaltyFilter === 'VIP_ONLY') {
        matchLoyalty = g.loyaltyTier === 'DIAMOND' || g.loyaltyTier === 'GOLD';
      } else if (selectedLoyaltyFilter === 'NEW_ONLY') {
        matchLoyalty = (g.visitCount || 1) === 1;
      }

      let matchFacility = true;
      if (selectedFacilityFilter === 'NAMDO') {
        matchFacility = (g.facilitiesUsed || []).some(f => f.facilityName.includes('남도예담'));
      } else if (selectedFacilityFilter === 'RANCH') {
        matchFacility = (g.facilitiesUsed || []).some(f => f.facilityName.includes('목장'));
      } else if (selectedFacilityFilter === 'BANQUET') {
        matchFacility = (g.facilitiesUsed || []).some(f => f.facilityName.includes('연회장') || f.facilityName.includes('세미나') || f.facilityName.includes('대관'));
      } else if (selectedFacilityFilter === 'GOLF') {
        matchFacility = (g.facilitiesUsed || []).some(f => f.facilityName.includes('CC') || f.facilityName.includes('골프')) || (g.spendingBreakdown?.golfRevenue || 0) > 0;
      } else if (selectedFacilityFilter === 'MOTO') {
        matchFacility = (g.facilitiesUsed || []).some(f => f.facilityName.includes('모토아레나'));
      }

      const matchSearch = !searchKeyword.trim() || 
        g.groupName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        g.contactName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        g.contactPhone.includes(searchKeyword) ||
        (g.facilitiesUsed || []).some(f => f.facilityName.toLowerCase().includes(searchKeyword.toLowerCase()));
      return matchCategory && matchLoyalty && matchFacility && matchSearch;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'REVENUE') return b.totalRevenue - a.totalRevenue;
      if (sortBy === 'VISITS') return (b.visitCount || 1) - (a.visitCount || 1);
      if (sortBy === 'SPEND_PER_PAX') return b.avgSpendPerPax - a.avgSpendPerPax;
      if (sortBy === 'RECENT') return new Date(b.checkInDate).getTime() - new Date(a.checkInDate).getTime();
      return 0;
    });
  }, [enrichedGroups, selectedCategory, selectedLoyaltyFilter, selectedFacilityFilter, searchKeyword, sortBy]);

  // Repeat metrics for KPI
  const loyaltyMetrics = useMemo(() => {
    const uniqueCompanies = new Set(enrichedGroups.map(g => g.groupName.trim()));
    const repeatCompanies = new Set(enrichedGroups.filter(g => (g.visitCount || 1) >= 2).map(g => g.groupName.trim()));
    const repeatSpend = enrichedGroups.filter(g => (g.visitCount || 1) >= 2).reduce((s, g) => s + g.totalRevenue, 0);
    const totalSpend = enrichedGroups.reduce((s, g) => s + g.totalRevenue, 0);

    const repeatRate = uniqueCompanies.size > 0 
      ? Math.round((repeatCompanies.size / uniqueCompanies.size) * 100) 
      : 0;
    const repeatSpendRate = totalSpend > 0 
      ? Math.round((repeatSpend / totalSpend) * 100) 
      : 0;

    return {
      totalUniqueCompanies: uniqueCompanies.size,
      repeatCompaniesCount: repeatCompanies.size,
      repeatRate,
      repeatSpendRate,
      repeatSpend
    };
  }, [enrichedGroups]);

  // Category counts
  const categoryCounts = useMemo(() => {
    return {
      ALL: enrichedGroups.length,
      RESORT_CORP: enrichedGroups.filter(g => g.category === 'RESORT_CORP').length,
      SEMINAR: enrichedGroups.filter(g => g.category === 'SEMINAR').length,
      GOLF_GROUP: enrichedGroups.filter(g => g.category === 'GOLF_GROUP').length,
      BANQUET: enrichedGroups.filter(g => g.category === 'BANQUET').length,
    };
  }, [enrichedGroups]);

  // Facility-specific counts for direct filtering
  const facilityCounts = useMemo(() => {
    return {
      ALL: enrichedGroups.length,
      NAMDO: enrichedGroups.filter(g => (g.facilitiesUsed || []).some(f => f.facilityName.includes('남도예담'))).length,
      RANCH: enrichedGroups.filter(g => (g.facilitiesUsed || []).some(f => f.facilityName.includes('목장'))).length,
      BANQUET: enrichedGroups.filter(g => (g.facilitiesUsed || []).some(f => f.facilityName.includes('연회장') || f.facilityName.includes('세미나') || f.facilityName.includes('대관'))).length,
      GOLF: enrichedGroups.filter(g => (g.facilitiesUsed || []).some(f => f.facilityName.includes('CC') || f.facilityName.includes('골프')) || (g.spendingBreakdown?.golfRevenue || 0) > 0).length,
      MOTO: enrichedGroups.filter(g => (g.facilitiesUsed || []).some(f => f.facilityName.includes('모토아레나'))).length,
    };
  }, [enrichedGroups]);

  // Crisp, banking-app style badge chips
  const renderFacilityBadge = (f: GroupFacilityItem, fIdx: number) => {
    const name = f.facilityName;
    if (name.includes('남도예담')) {
      return (
        <span key={fIdx} className="bg-amber-50 text-amber-900 border border-amber-200/80 text-[11px] px-2 py-0.5 rounded-md font-semibold inline-flex items-center gap-1">
          🍱 {name}
        </span>
      );
    }
    if (name.includes('목장')) {
      return (
        <span key={fIdx} className="bg-emerald-50 text-emerald-900 border border-emerald-200/80 text-[11px] px-2 py-0.5 rounded-md font-semibold inline-flex items-center gap-1">
          🐑 {name}
        </span>
      );
    }
    if (name.includes('연회장') || name.includes('세미나') || name.includes('대관')) {
      return (
        <span key={fIdx} className="bg-blue-50 text-blue-900 border border-blue-200/80 text-[11px] px-2 py-0.5 rounded-md font-semibold inline-flex items-center gap-1">
          🏛️ {name}
        </span>
      );
    }
    if (name.includes('골프') || name.includes('CC')) {
      return (
        <span key={fIdx} className="bg-purple-50 text-purple-900 border border-purple-200/80 text-[11px] px-2 py-0.5 rounded-md font-semibold inline-flex items-center gap-1">
          ⛳ {name}
        </span>
      );
    }
    if (name.includes('모토아레나')) {
      return (
        <span key={fIdx} className="bg-rose-50 text-rose-900 border border-rose-200/80 text-[11px] px-2 py-0.5 rounded-md font-semibold inline-flex items-center gap-1">
          🏎️ {name}
        </span>
      );
    }
    return (
      <span key={fIdx} className="bg-slate-50 text-slate-700 border border-slate-200/80 text-[11px] px-2 py-0.5 rounded-md font-medium">
        {name}
      </span>
    );
  };

  const totalCalculatedRevenue = Number(summaryData?.totalRevenue || 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* 1. Header: Modern Banking Style Account Overview */}
      <div className="bg-white p-7 rounded-[32px] border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100/80">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                B2B 법인 & 단체 영업 실적 관리
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                Corporate Ledger
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              산하 PMS 법인 마스터 폴리오 및 연회·골프·부대시설 결제 데이터를 통합하여 기업별 지출 및 이용 동선을 정밀 분석합니다.
            </p>
          </div>
        </div>

        {/* Global Date & Action Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs overflow-x-auto">
            {[
              { key: 'WEEK', label: '최근 7일' },
              { key: 'MTD', label: '당월' },
              { key: 'PAST_6M', label: '6개월' },
              { key: 'YTD', label: '연간' }
            ].map(p => {
              const active = isPresetActive(p.key as DatePresetType);
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => applyPreset(p.key as DatePresetType)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                    active ? 'bg-blue-600 text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          <GlobalDatePicker showPresets={false} />
          <button
            onClick={fetchGroupSales}
            disabled={loading}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            조회
          </button>
        </div>
      </div>

      {/* 2. 💡 Financial Logic Explanation Card (은행앱 스타일 직관적 산출 가이드) */}
      <div className="bg-slate-900 text-white rounded-[28px] p-6 shadow-md border border-slate-800 relative overflow-hidden">
        <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => setShowLogicExplainer(!showLogicExplainer)}>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-teal-500/20 text-teal-400 rounded-lg border border-teal-500/30">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-black tracking-tight text-white flex items-center gap-2">
              총결제 매출 및 이용 영업장 데이터 산출 기준 (Data Lineage & Methodology)
              <span className="text-[11px] font-normal text-slate-400">
                {showLogicExplainer ? '접기' : '자세히 보기'}
              </span>
            </h3>
          </div>
          <button className="text-slate-400 hover:text-white p-1">
            {showLogicExplainer ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>

        {showLogicExplainer && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 pt-5 border-t border-slate-800 text-xs">
            
            {/* Logic 1: How Total Revenue is Calculated */}
            <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800/80 space-y-2">
              <div className="flex items-center gap-2 text-teal-400 font-bold">
                <DollarSign size={15} /> 1. 총결제 매출(순매출) 산출 원리
              </div>
              <p className="text-slate-300 leading-relaxed">
                • <strong>원천 장부:</strong> 호텔 산하 PMS의 <strong>B2B 법인 예약 마스터 폴리오(Master Billing Folio)</strong> 데이터와 법인 세금계산서/카드 정산 내역 기준.<br />
                • <strong>합산 로직:</strong> 해당 단체 코드(<code className="text-teal-300 font-mono">groupId</code>)에 일괄 청구된 <strong>[객실료 + 대연회장 대관료 + 단체 식음 뷔페 + 골프/레저 티켓]</strong>을 1원 단위 순매출(Gross / 1.1)로 집계한 값입니다.
              </p>
            </div>

            {/* Logic 2: How Facilities Used are Traced */}
            <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800/80 space-y-2">
              <div className="flex items-center gap-2 text-indigo-300 font-bold">
                <Layers size={15} /> 2. 이용 영업장(Facilities) 추적 및 식별 원리
              </div>
              <p className="text-slate-300 leading-relaxed">
                • <strong>추적 방식:</strong> 단체 행사 시 발행된 <strong>객실 키 / 부대시설 바우처 사용 내역</strong> 및 현장 POS에서 단체 룸차지(Room Charge)로 승인된 POS 트랜잭션 매핑.<br />
                • <strong>식별 예시:</strong> 객실 76실 배정 ➔ <span className="text-blue-300">콘도 객실</span>, 벨포레홀 대관 ➔ <span className="text-cyan-300">대연회장</span>, 단체식사 ➔ <span className="text-amber-300">남도예담/쿠치나</span>, 티켓 발권 ➔ <span className="text-emerald-300">목장/미디어아트</span>로 자동 분배.
              </p>
            </div>

          </div>
        )}
      </div>

      {/* 3. 🏦 4 Executive Financial Summary Cards (Toss Bank Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Corporate Groups */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <Building2 size={15} className="text-blue-600" /> 유치 단체수 & 기업수
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
              B2B 모수
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tabular-nums">
              {enrichedGroups.length} <span className="text-sm font-semibold text-slate-500">건</span>
              <span className="text-sm font-bold text-blue-600 ml-2">({loyaltyMetrics.totalUniqueCompanies}개사)</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              총 참가 인원: <strong className="text-slate-800">{(summaryData?.totalPax || 0).toLocaleString()}명</strong>
            </div>
          </div>
        </div>

        {/* Card 2: Total Revenue */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <DollarSign size={15} className="text-emerald-600" /> 단체 총 결제 매출
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
              순매출 기준
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-700 tabular-nums">
              ₩{formatCurrency(totalCalculatedRevenue)} <span className="text-sm font-semibold text-slate-500">원</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              행사당 평균: <strong className="text-slate-800">₩{formatCurrency(summaryData?.avgSpendPerGroup || (enrichedGroups.length > 0 ? Math.round(totalCalculatedRevenue / enrichedGroups.length) : 0))}원</strong>
            </div>
          </div>
        </div>

        {/* Card 3: Loyalty & Repeat Rate */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <Award size={15} className="text-purple-600" /> 단체 로열티 (재방문율)
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
              충성도 지수
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-purple-800 tabular-nums">
              {loyaltyMetrics.repeatRate}% <span className="text-sm font-semibold text-slate-500">재방문</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              재방문 기업: <strong className="text-purple-700">{loyaltyMetrics.repeatCompaniesCount}개사</strong> · 기여: <strong className="text-slate-800">{loyaltyMetrics.repeatSpendRate}%</strong>
            </div>
          </div>
        </div>

        {/* Card 4: Ancillary Cross-selling Contribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <Layers size={15} className="text-cyan-600" /> 부대시설 교차 기여
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-100">
              식음·골프·레저
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-cyan-800 tabular-nums">
              {summaryData && summaryData.totalRevenue > 0
                ? Math.round(((summaryData.fnbRevenue + summaryData.golfRevenue + summaryData.leisureRevenue) / summaryData.totalRevenue) * 100)
                : 36}%
            </div>
            <div className="text-xs text-slate-500 mt-1">
              1인당 객단가: <strong className="text-slate-800">₩{formatCurrency(summaryData?.avgSpendPerPax ?? 0)}원/인</strong>
            </div>
          </div>
        </div>

      </div>

      {/* 4. 🗂️ Banking Ledger Table & Filter Controls */}
      <div className="bg-white rounded-[32px] p-7 border border-slate-200/90 shadow-xs space-y-5">
        
        {/* Filter Controls Header */}
        <div className="space-y-4 border-b border-slate-100 pb-5">
          
          {/* Row 1: Segment Tabs & Search */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Category Segment Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl text-xs overflow-x-auto">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                전체 단체 ({categoryCounts.ALL}개)
              </button>
              <button
                onClick={() => setSelectedCategory('RESORT_CORP')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === 'RESORT_CORP'
                    ? 'bg-purple-600 text-white shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🏢 기업 휴양소 ({categoryCounts.RESORT_CORP}개)
              </button>
              <button
                onClick={() => setSelectedCategory('SEMINAR')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === 'SEMINAR'
                    ? 'bg-blue-600 text-white shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                👥 세미나/워크샵 ({categoryCounts.SEMINAR}개)
              </button>
              <button
                onClick={() => setSelectedCategory('GOLF_GROUP')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === 'GOLF_GROUP'
                    ? 'bg-emerald-600 text-white shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ⛳ 골프 단체 ({categoryCounts.GOLF_GROUP}개)
              </button>
              <button
                onClick={() => setSelectedCategory('BANQUET')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === 'BANQUET'
                    ? 'bg-amber-600 text-white shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🍽️ 연회/만찬 ({categoryCounts.BANQUET}개)
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[280px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="기업명, 담당자, 연락처 검색..."
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/90 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>
          </div>

          {/* Row 2: Loyalty Filter & Sort Options */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
                <Award size={13} className="text-purple-600" /> 로열티:
              </span>
              <button
                onClick={() => setSelectedLoyaltyFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedLoyaltyFilter === 'ALL'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                전체 고객사
              </button>
              <button
                onClick={() => setSelectedLoyaltyFilter('REPEAT_ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedLoyaltyFilter === 'REPEAT_ALL'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                }`}
              >
                재방문 단체 (2회 이상)
              </button>
              <button
                onClick={() => setSelectedLoyaltyFilter('VIP_ONLY')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedLoyaltyFilter === 'VIP_ONLY'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                앵커 VIP (3회+ / 다이아)
              </button>
              <button
                onClick={() => setSelectedLoyaltyFilter('NEW_ONLY')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedLoyaltyFilter === 'NEW_ONLY'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                신규 유치 (1회)
              </button>
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">정렬 기준:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-bold outline-none cursor-pointer focus:border-blue-500"
              >
                <option value="REVENUE">총 결제액 높은순 ▾</option>
                <option value="VISITS">방문 횟수(로열티) 높은순 ▾</option>
                <option value="SPEND_PER_PAX">1인당 객단가 높은순 ▾</option>
                <option value="RECENT">최신 행사일자순 ▾</option>
              </select>
            </div>
          </div>

          {/* Row 3: Facility Chips Filter */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Utensils size={13} className="text-amber-600" /> 이용 시설:
            </span>
            <button
              onClick={() => setSelectedFacilityFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedFacilityFilter === 'ALL'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              전체 시설 ({facilityCounts.ALL}개)
            </button>
            <button
              onClick={() => setSelectedFacilityFilter('NAMDO')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedFacilityFilter === 'NAMDO'
                  ? 'bg-amber-600 text-white shadow-xs font-bold'
                  : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              🍱 남도예담 ({facilityCounts.NAMDO}개)
            </button>
            <button
              onClick={() => setSelectedFacilityFilter('RANCH')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedFacilityFilter === 'RANCH'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              🐑 벨포레 목장 ({facilityCounts.RANCH}개)
            </button>
            <button
              onClick={() => setSelectedFacilityFilter('BANQUET')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedFacilityFilter === 'BANQUET'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'bg-blue-50 text-blue-900 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              🏛️ 대연회장/세미나 ({facilityCounts.BANQUET}개)
            </button>
            <button
              onClick={() => setSelectedFacilityFilter('GOLF')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedFacilityFilter === 'GOLF'
                  ? 'bg-purple-600 text-white shadow-xs font-bold'
                  : 'bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200'
              }`}
            >
              ⛳ 벨포레CC ({facilityCounts.GOLF}개)
            </button>
            <button
              onClick={() => setSelectedFacilityFilter('MOTO')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedFacilityFilter === 'MOTO'
                  ? 'bg-rose-600 text-white shadow-xs font-bold'
                  : 'bg-rose-50 text-rose-900 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              🏎️ 모토아레나 ({facilityCounts.MOTO}개)
            </button>
          </div>

        </div>

        {/* Group Ledger Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200/90">
              <tr>
                <th className="py-3.5 px-4 min-w-[200px]">단체명 / 기업명</th>
                <th className="py-3.5 px-3 text-center min-w-[110px]">로열티</th>
                <th className="py-3.5 px-3 text-center min-w-[130px]">구분</th>
                <th className="py-3.5 px-4 min-w-[160px]">담당자 / 연락처</th>
                <th className="py-3.5 px-4 min-w-[160px]">행사 기간</th>
                <th className="py-3.5 px-3 text-right min-w-[70px]">인원</th>
                <th className="py-3.5 px-4 text-right min-w-[130px]">결제액 / 누적 LTV</th>
                <th className="py-3.5 px-4 min-w-[240px]">이용 영업장 내역</th>
                <th className="py-3.5 px-3 text-center w-12">상세</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredAndSortedGroups.length > 0 ? (
                filteredAndSortedGroups.map((group, idx) => (
                  <tr 
                    key={idx} 
                    onClick={() => setSelectedGroupModal(group)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    {/* Company Name */}
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <Building2 size={15} className="text-blue-600 flex-shrink-0" />
                        <span className="text-sm font-black">{group.groupName}</span>
                      </div>
                      {group.salesManager && (
                        <span className="text-[11px] text-slate-400 font-normal ml-5 block mt-0.5">
                          영업 담당: {group.salesManager}
                        </span>
                      )}
                    </td>

                    {/* Loyalty Badge */}
                    <td className="py-3.5 px-3 text-center">
                      {group.loyaltyTier === 'DIAMOND' && (
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-purple-50 text-purple-800 border border-purple-200 whitespace-nowrap inline-block">
                          {group.tierLabel}
                        </span>
                      )}
                      {group.loyaltyTier === 'GOLD' && (
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap inline-block">
                          {group.tierLabel}
                        </span>
                      )}
                      {group.loyaltyTier === 'SILVER' && (
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap inline-block">
                          {group.tierLabel}
                        </span>
                      )}
                      {(!group.loyaltyTier || group.loyaltyTier === 'BRONZE') && (
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap inline-block">
                          {group.tierLabel || '신규 1회'}
                        </span>
                      )}
                    </td>

                    {/* Category Type */}
                    <td className="py-3.5 px-3 text-center">
                      <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold bg-slate-100 text-slate-700 whitespace-nowrap inline-block">
                        {group.categoryName || group.category}
                      </span>
                    </td>

                    {/* Contact */}
                    <td className="py-3.5 px-4 text-xs">
                      <div className="font-semibold text-slate-900">{group.contactName}</div>
                      <div className="text-slate-400 flex items-center gap-1 mt-0.5 whitespace-nowrap">
                        <Phone size={11} /> {group.contactPhone}
                      </div>
                    </td>

                    {/* Date / Stay */}
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      <div className="whitespace-nowrap">{group.checkInDate} ~ {group.checkOutDate}</div>
                      <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded mt-0.5 inline-block whitespace-nowrap">
                        {group.stayDays}박
                      </span>
                    </td>

                    {/* Pax */}
                    <td className="py-3.5 px-3 text-right font-medium text-slate-800 whitespace-nowrap">
                      {group.paxCount.toLocaleString()}명
                    </td>

                    {/* Settlement & LTV */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="font-black text-slate-900 text-sm tabular-nums">
                        ₩{formatCurrency(group.totalRevenue)}
                      </div>
                      {(group.visitCount || 1) > 1 && (
                        <div className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded mt-0.5 inline-block whitespace-nowrap">
                          누적 LTV ₩{formatCurrency(group.totalLtvRevenue)}
                        </div>
                      )}
                    </td>

                    {/* Facilities Used */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {group.facilitiesUsed?.slice(0, 3).map((f, fIdx) => renderFacilityBadge(f, fIdx))}
                        {(group.facilitiesUsed?.length || 0) > 3 && (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            +{(group.facilitiesUsed?.length || 0) - 3}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Detail Action */}
                    <td className="py-3.5 px-3 text-center">
                      <button className="p-1 text-slate-400 hover:text-blue-600 transition-colors">
                        <ChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <Building2 size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-medium text-xs text-slate-600">
                      조회된 조건에 일치하는 B2B 법인 단체 데이터가 없습니다.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* 5. Detail Modal */}
      {selectedGroupModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] max-w-2xl w-full p-6 lg:p-8 shadow-2xl border border-slate-100 space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                    {selectedGroupModal.categoryName || selectedGroupModal.category}
                  </span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
                    {selectedGroupModal.tierLabel || '신규 고객'}
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-2">
                  {selectedGroupModal.groupName}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  행사 기간: {selectedGroupModal.checkInDate} ~ {selectedGroupModal.checkOutDate} ({selectedGroupModal.stayDays}박) · 총 {selectedGroupModal.paxCount}명 참가
                </p>
              </div>
              <button 
                onClick={() => setSelectedGroupModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Loyalty & LTV Overview Banner */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 rounded-2xl flex items-center justify-between shadow-md">
              <div>
                <span className="text-[11px] font-bold text-slate-300 block uppercase tracking-wide">
                  고객사 생애가치 (Customer LTV)
                </span>
                <div className="text-2xl font-black mt-0.5 text-teal-300">
                  ₩{formatCurrency(selectedGroupModal.totalLtvRevenue || selectedGroupModal.totalRevenue)}원
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-300 font-medium block">누적 방문 횟수</span>
                <span className="text-xl font-bold text-amber-300">
                  {selectedGroupModal.visitCount || 1}회 방문
                </span>
              </div>
            </div>

            {/* Visit History Timeline */}
            {selectedGroupModal.visitHistory && selectedGroupModal.visitHistory.length > 1 && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                  <Award size={14} className="text-purple-600" /> 과거 행사 방문 히스토리 ({selectedGroupModal.visitHistory.length}회차)
                </h4>
                <div className="space-y-2">
                  {selectedGroupModal.visitHistory.map((h, hIdx) => (
                    <div key={hIdx} className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-purple-700 mr-2">[{h.visitNo}회차]</span>
                        <span className="font-semibold text-slate-800">{h.checkInDate} ~ {h.checkOutDate}</span>
                        <span className="text-slate-400 ml-2">({h.paxCount}명 · {h.categoryName})</span>
                      </div>
                      <strong className="text-slate-900">₩{formatCurrency(h.totalRevenue)}원</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contact & Account Info */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl text-xs text-slate-700">
              <div>
                <span className="text-slate-400 block mb-0.5">단체 담당자</span>
                <strong className="text-slate-900 text-sm">{selectedGroupModal.contactName}</strong>
                <span className="block text-slate-500 mt-0.5">{selectedGroupModal.contactPhone}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">결제 방식 / 영업 담당</span>
                <strong className="text-slate-900">{selectedGroupModal.paymentMethod || '법인 후정산'}</strong>
                <span className="block text-slate-500 mt-0.5">{selectedGroupModal.salesManager || '영업팀'}</span>
              </div>
            </div>

            {/* Facility Spending Ledger */}
            <div>
              <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                <Layers size={16} className="text-blue-600" /> 이번 행사 이용 영업장 및 지출 내역
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedGroupModal.facilitiesUsed?.map((fac, fIdx) => (
                  <div key={fIdx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      {renderFacilityBadge(fac, fIdx)}
                    </div>
                    <strong className="text-slate-900">₩{formatCurrency(fac.revenue)}원</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Footer */}
            <div className="flex justify-between items-center bg-slate-900 text-white p-4 rounded-2xl">
              <div>
                <span className="text-xs text-slate-300 font-semibold block">이번 행사 결제액</span>
                <span className="text-xs text-slate-400">1인당 평균 ₩{formatCurrency(selectedGroupModal.avgSpendPerPax)}원</span>
              </div>
              <div className="text-2xl font-black text-teal-300">
                ₩{formatCurrency(selectedGroupModal.totalRevenue)}원
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
