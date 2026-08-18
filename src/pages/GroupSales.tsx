import { useState, useEffect, useMemo } from 'react';
import { useDate } from '../contexts/DateContext';
import { getPresetDateRange, type DatePresetType } from '../lib/dateUtils';
import { secureFetcher } from '../lib/secureFetcher';
import GlobalDatePicker from '../components/GlobalDatePicker';
import { 
  Building2, Phone, DollarSign, Search, 
  ChevronRight, RefreshCw, Layers, Award, Calendar, Check
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

const formatCurrency = (val: any) => {
  if (!val) return '0';
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
  const [sortBy, setSortBy] = useState<'REVENUE' | 'VISITS' | 'SPEND_PER_PAX' | 'RECENT'>('REVENUE');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedGroupModal, setSelectedGroupModal] = useState<CorporateGroupItem | null>(null);

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
        // API 대기 상태 - 빈 배열로 안전 초기화 (가짜 데이터 표시 금지)
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
    // 1. Group by Corporate Name / Phone to calculate visit count and LTV
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
        tierLabel = `👑 VIP ${calculatedVisits}회차`;
      } else if (calculatedVisits >= 3 || totalLtv >= 20000000) {
        tier = 'GOLD';
        tierLabel = `🥇 골드 ${calculatedVisits}회차`;
      } else if (calculatedVisits >= 2) {
        tier = 'SILVER';
        tierLabel = `🥈 재방문 ${calculatedVisits}회`;
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

      return {
        ...item,
        visitCount: calculatedVisits,
        totalLtvRevenue: totalLtv,
        loyaltyTier: tier,
        tierLabel,
        visitHistory: history
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

      const matchSearch = !searchKeyword.trim() || 
        g.groupName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        g.contactName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        g.contactPhone.includes(searchKeyword);
      return matchCategory && matchLoyalty && matchSearch;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'REVENUE') return b.totalRevenue - a.totalRevenue;
      if (sortBy === 'VISITS') return (b.visitCount || 1) - (a.visitCount || 1);
      if (sortBy === 'SPEND_PER_PAX') return b.avgSpendPerPax - a.avgSpendPerPax;
      if (sortBy === 'RECENT') return new Date(b.checkInDate).getTime() - new Date(a.checkInDate).getTime();
      return 0;
    });
  }, [enrichedGroups, selectedCategory, selectedLoyaltyFilter, searchKeyword, sortBy]);

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

  return (
    <div className="p-6 lg:p-10 max-w-[1600px] mx-auto min-h-screen bg-slate-50/50">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-[32px] p-8 text-white mb-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="bg-indigo-400/20 text-indigo-300 text-xs font-semibold px-3 py-1 rounded-full border border-indigo-400/30 tracking-wide uppercase">
                B2B CORPORATE & GROUP SALES INTELLIGENCE
              </span>
              <span className="bg-white/10 text-slate-200 text-xs px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/10">
                <Building2 size={12} className="text-indigo-400" /> 단체 고객 정밀 분석
              </span>
              <span className="bg-indigo-500/30 text-indigo-200 text-xs px-2.5 py-1 rounded-full flex items-center gap-1 border border-indigo-400/30 font-medium">
                <Calendar size={12} className="text-indigo-300" />
                조회 기간: <strong>{startDate} {endDate ? `~ ${endDate}` : '(1일)'}</strong>
              </span>
            </div>
            
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mt-1 flex items-center gap-3">
              <Building2 className="text-indigo-400" size={32} />
              영업 / 단체(B2B) 실적 및 이용 동선 분석
            </h1>
            <p className="text-indigo-100 mt-2 text-sm lg:text-base font-normal max-w-3xl">
              기업 휴양소, 세미나/워크샵, 골프 단체, 만찬 연회 등 B2B 단체별 담당자 연락처, 총 매출 지출액, 객실·식음·골프·레저 교차 이용 동선을 6개월/1년 단위로 전수 분석합니다.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <GlobalDatePicker showPresets={false} />
            <button
              onClick={fetchGroupSales}
              disabled={loading}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 active:scale-90 text-white rounded-xl text-xs font-bold transition-all duration-150 shadow-md flex items-center justify-center gap-2 cursor-pointer select-none"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              새로고침
            </button>
          </div>
        </div>

        {/* 6개월 / 1년 빠른 기간 선택 퀵 바 */}
        <div className="mt-6 pt-5 border-t border-white/10 flex items-center gap-2 flex-wrap text-xs">
          <span className="text-indigo-300 font-bold mr-1 flex items-center gap-1">
            <Calendar size={14} /> 빠른 기간 선택:
          </span>

          {[
            { key: 'TODAY', label: '오늘(어제)' },
            { key: 'WEEK', label: '최근 7일' },
            { key: 'MTD', label: '금월(당월)' },
            { key: 'H1', label: '상반기 (1~6월)' },
            { key: 'PAST_6M', label: '📅 최근 6개월 (180일 누적)' },
            { key: 'YTD', label: '📊 연간 누적 (1월~현재)' },
            { key: 'PAST_1Y', label: '🏆 최근 1년 (365일 전수)' },
          ].map(p => {
            const active = isPresetActive(p.key as DatePresetType);
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => applyPreset(p.key as DatePresetType)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all duration-150 active:scale-90 cursor-pointer select-none flex items-center gap-1.5 ${
                  active
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 ring-2 ring-emerald-300 ring-offset-2 ring-offset-slate-900 scale-105'
                    : 'bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white border border-white/10 hover:border-white/25'
                }`}
              >
                {active && <Check size={13} className="text-white" />}
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Overview Summary (4-Grid with Loyalty Sub-Metrics) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Card 1: Total Groups & Corporate Count */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <Building2 size={16} className="text-indigo-600" /> 유치 단체수 & 기업수
              </span>
              <span className="text-xs font-bold text-indigo-800 bg-indigo-100 px-2.5 py-0.5 rounded-full">
                B2B 모수
              </span>
            </div>
            <div className="text-3xl font-black text-slate-900 my-1 tabular-nums">
              {enrichedGroups.length} <span className="text-sm font-normal text-slate-500">건</span>
              <span className="text-sm font-bold text-indigo-600 ml-2">({loyaltyMetrics.totalUniqueCompanies}개사)</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100 tabular-nums">
            총 참가 인원: <strong className="text-slate-800">{(summaryData?.totalPax || enrichedGroups.reduce((s, g) => s + g.paxCount, 0)).toLocaleString()}명</strong>
          </p>
        </div>

        {/* Card 2: Total B2B Revenue */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <DollarSign size={16} className="text-emerald-600" /> 단체 총 결제 매출
              </span>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                순매출 기준
              </span>
            </div>
            <div className="text-3xl font-black text-emerald-600 my-1 tabular-nums">
              ₩{formatCurrency(summaryData?.totalRevenue || enrichedGroups.reduce((s, g) => s + g.totalRevenue, 0))} <span className="text-sm font-normal text-slate-500">원</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100 tabular-nums">
            행사당 평균: <strong className="text-slate-800">₩{formatCurrency(summaryData?.avgSpendPerGroup || (enrichedGroups.length > 0 ? Math.round(enrichedGroups.reduce((s, g) => s + g.totalRevenue, 0) / enrichedGroups.length) : 0))}원</strong>
          </p>
        </div>

        {/* Card 3: 🏆 고객사 로열티 & 재방문율 */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <Award size={16} className="text-purple-600" /> 단체 로열티 (재방문율)
              </span>
              <span className="text-xs font-bold text-purple-800 bg-purple-100 px-2.5 py-0.5 rounded-full">
                충성도 지수
              </span>
            </div>
            <div className="text-3xl font-black text-purple-700 my-1 tabular-nums">
              {loyaltyMetrics.repeatRate}% <span className="text-sm font-normal text-slate-500">재방문</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100 tabular-nums">
            재방문 기업: <strong className="text-purple-700">{loyaltyMetrics.repeatCompaniesCount}개사</strong> · 매출 기여: <strong className="text-slate-800">{loyaltyMetrics.repeatSpendRate}%</strong>
          </p>
        </div>

        {/* Card 4: 부대시설 교차 매출 비중 (TRevPAG) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <Layers size={16} className="text-cyan-600" /> 부대시설 교차 기여
              </span>
              <span className="text-xs font-bold text-cyan-800 bg-cyan-100 px-2.5 py-0.5 rounded-full">
                식음·골프·레저
              </span>
            </div>
            <div className="text-3xl font-black text-cyan-600 my-1 tabular-nums">
              {summaryData && summaryData.totalRevenue > 0
                ? Math.round(((summaryData.fnbRevenue + summaryData.golfRevenue + summaryData.leisureRevenue) / summaryData.totalRevenue) * 100)
                : 0}%
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100 tabular-nums">
            1인당 평균 객단가: <strong className="text-slate-800">₩{formatCurrency(summaryData?.avgSpendPerPax || 0)}원/인</strong>
          </p>
        </div>
      </div>

      {/* Main Section: Search, Filters & Group Ledger Table */}
      <div className="bg-white rounded-[32px] p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 mb-8">
        
        {/* Controls Bar 1: Category & Loyalty Filters */}
        <div className="space-y-4 border-b border-slate-100 pb-6 mb-6">
          
          {/* Segment Filter Tabs */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 active:scale-90 cursor-pointer select-none ${
                  selectedCategory === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400 ring-offset-1 scale-105'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                전체 단체 ({categoryCounts.ALL}개)
              </button>
              <button
                onClick={() => setSelectedCategory('RESORT_CORP')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 active:scale-90 cursor-pointer select-none ${
                  selectedCategory === 'RESORT_CORP'
                    ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-400 ring-offset-1 scale-105'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                🏢 기업 휴양소 ({categoryCounts.RESORT_CORP}개)
              </button>
              <button
                onClick={() => setSelectedCategory('SEMINAR')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 active:scale-90 cursor-pointer select-none ${
                  selectedCategory === 'SEMINAR'
                    ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400 ring-offset-1 scale-105'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                👥 세미나/워크샵 ({categoryCounts.SEMINAR}개)
              </button>
              <button
                onClick={() => setSelectedCategory('GOLF_GROUP')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 active:scale-90 cursor-pointer select-none ${
                  selectedCategory === 'GOLF_GROUP'
                    ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400 ring-offset-1 scale-105'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                ⛳ 골프 단체 ({categoryCounts.GOLF_GROUP}개)
              </button>
              <button
                onClick={() => setSelectedCategory('BANQUET')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 active:scale-90 cursor-pointer select-none ${
                  selectedCategory === 'BANQUET'
                    ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400 ring-offset-1 scale-105'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                🍽️ 연회/만찬 ({categoryCounts.BANQUET}개)
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[280px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="기업명, 담당자, 연락처 검색..."
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>
          </div>

          {/* Controls Bar 2: Loyalty Tier Filters & Sorting Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100/70">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
                <Award size={14} className="text-purple-600" /> 로열티 필터:
              </span>
              <button
                onClick={() => setSelectedLoyaltyFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedLoyaltyFilter === 'ALL'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                전체 고객사
              </button>
              <button
                onClick={() => setSelectedLoyaltyFilter('REPEAT_ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedLoyaltyFilter === 'REPEAT_ALL'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                }`}
              >
                🔁 재방문 단체 (2회 이상)
              </button>
              <button
                onClick={() => setSelectedLoyaltyFilter('VIP_ONLY')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedLoyaltyFilter === 'VIP_ONLY'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                👑 앵커 VIP (3회+ / 다이아)
              </button>
              <button
                onClick={() => setSelectedLoyaltyFilter('NEW_ONLY')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedLoyaltyFilter === 'NEW_ONLY'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                🆕 신규 유치 (1회)
              </button>
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">정렬 기준:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-bold outline-none cursor-pointer focus:border-indigo-500"
              >
                <option value="REVENUE">총 결제액 높은순 ▾</option>
                <option value="VISITS">방문 횟수(로열티) 높은순 ▾</option>
                <option value="SPEND_PER_PAX">1인당 객단가 높은순 ▾</option>
                <option value="RECENT">최신 행사일자순 ▾</option>
              </select>
            </div>
          </div>

        </div>

        {/* Group Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3.5 px-6 rounded-l-xl">단체명 / 기업명</th>
                <th className="py-3.5 px-4">로열티 (방문 횟수)</th>
                <th className="py-3.5 px-4">구분</th>
                <th className="py-3.5 px-4">담당자 / 연락처</th>
                <th className="py-3.5 px-4">행사 기간 (체류)</th>
                <th className="py-3.5 px-4 text-right">인원 (명)</th>
                <th className="py-3.5 px-6 text-right">결제액 / 누적 LTV</th>
                <th className="py-3.5 px-6">이용 영업장 내역</th>
                <th className="py-3.5 px-4 text-center rounded-r-xl">상세</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredAndSortedGroups.length > 0 ? (
                filteredAndSortedGroups.map((group, idx) => (
                  <tr 
                    key={idx} 
                    onClick={() => setSelectedGroupModal(group)}
                    className="hover:bg-indigo-50/30 transition-colors cursor-pointer"
                  >
                    <td className="py-4 px-6 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-indigo-600 flex-shrink-0" />
                        <span>{group.groupName}</span>
                      </div>
                      {group.salesManager && (
                        <span className="text-[11px] text-slate-400 font-normal ml-6 block">
                          영업 담당: {group.salesManager}
                        </span>
                      )}
                    </td>

                    {/* Loyalty Badge */}
                    <td className="py-4 px-4">
                      {group.loyaltyTier === 'DIAMOND' && (
                        <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-purple-100 text-purple-800 border border-purple-200 inline-flex items-center gap-1 shadow-xs">
                          {group.tierLabel}
                        </span>
                      )}
                      {group.loyaltyTier === 'GOLD' && (
                        <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1 shadow-xs">
                          {group.tierLabel}
                        </span>
                      )}
                      {group.loyaltyTier === 'SILVER' && (
                        <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
                          {group.tierLabel}
                        </span>
                      )}
                      {(!group.loyaltyTier || group.loyaltyTier === 'BRONZE') && (
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-slate-100 text-slate-600 border border-slate-200 inline-flex items-center gap-1">
                          {group.tierLabel || '신규 1회'}
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {group.categoryName || group.category}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-xs text-slate-700">
                      <div className="font-semibold text-slate-900">{group.contactName}</div>
                      <div className="text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone size={11} /> {group.contactPhone}
                      </div>
                    </td>

                    <td className="py-4 px-4 text-xs text-slate-600">
                      <div>{group.checkInDate} ~ {group.checkOutDate}</div>
                      <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50/80 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                        {group.stayDays}박
                      </span>
                    </td>

                    <td className="py-4 px-4 text-right font-medium text-slate-800">
                      {group.paxCount.toLocaleString()}명
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="font-extrabold text-slate-900 text-sm">
                        ₩{formatCurrency(group.totalRevenue)}
                      </div>
                      {(group.visitCount || 1) > 1 && (
                        <div className="text-[11px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                          누적 LTV ₩{formatCurrency(group.totalLtvRevenue)}
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1 flex-wrap">
                        {group.facilitiesUsed?.slice(0, 3).map((f, fIdx) => (
                          <span key={fIdx} className="bg-slate-100 text-slate-700 text-[11px] px-2 py-0.5 rounded-md font-medium">
                            {f.facilityName}
                          </span>
                        ))}
                        {(group.facilitiesUsed?.length || 0) > 3 && (
                          <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                            +{(group.facilitiesUsed?.length || 0) - 3}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <button className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                        <ChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <div className="max-w-md mx-auto space-y-3">
                      <Building2 size={36} className="mx-auto text-slate-300" />
                      <p className="font-medium text-sm text-slate-600">
                        조회된 기간 내 B2B 단체 실적 데이터가 없거나 백엔드 API 연동 준비 중입니다.
                      </p>
                      <p className="text-xs text-slate-400">
                        산하 PMS 및 연회/골프 POS 단체 원천 데이터를 연결하면 본 테이블에 실시간 집계됩니다.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Group Detail Modal (With Loyalty Profile & Multi-Visit History Timeline) */}
      {selectedGroupModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] max-w-2xl w-full p-6 lg:p-8 shadow-2xl border border-slate-100 space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
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
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* 🏆 Loyalty & LTV Overview Banner */}
            <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white p-4 rounded-2xl flex items-center justify-between shadow-md">
              <div>
                <span className="text-[11px] font-bold text-purple-200 block uppercase tracking-wide">
                  고객사 생애가치 (Customer LTV)
                </span>
                <div className="text-2xl font-black mt-0.5">
                  ₩{formatCurrency(selectedGroupModal.totalLtvRevenue || selectedGroupModal.totalRevenue)}원
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-purple-200 font-medium block">누적 방문 횟수</span>
                <span className="text-xl font-bold text-amber-300">
                  {selectedGroupModal.visitCount || 1}회 방문
                </span>
              </div>
            </div>

            {/* Visit History Timeline (If repeat customer) */}
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
                <Layers size={16} className="text-indigo-600" /> 이번 행사 이용 영업장 및 지출 내역
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedGroupModal.facilitiesUsed?.map((fac, fIdx) => (
                  <div key={fIdx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 text-xs">
                    <span className="font-semibold text-slate-800">{fac.facilityName}</span>
                    <strong className="text-slate-900">₩{formatCurrency(fac.revenue)}원</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Footer */}
            <div className="flex justify-between items-center bg-indigo-50/70 p-4 rounded-2xl text-indigo-950 border border-indigo-100">
              <div>
                <span className="text-xs text-indigo-700 font-semibold block">이번 행사 결제액</span>
                <span className="text-xs text-slate-500">1인당 평균 ₩{formatCurrency(selectedGroupModal.avgSpendPerPax)}원</span>
              </div>
              <div className="text-2xl font-black text-indigo-900">
                ₩{formatCurrency(selectedGroupModal.totalRevenue)}원
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
