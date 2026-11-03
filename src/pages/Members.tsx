import { useState, useEffect, Fragment } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDate } from '../contexts/DateContext';
import { secureFetcher } from '../lib/secureFetcher';
import ReactECharts from 'echarts-for-react';
import GlobalDatePicker from '../components/GlobalDatePicker';
import {
  Calendar, RefreshCw, Hotel,
  Award, Flag, Smartphone, Briefcase, Sparkles, UserCheck,
  Search, Building2, Coins, CheckCircle2, Info, Clock, ArrowUpDown, Filter,
  ChevronDown, ChevronUp, CreditCard, Utensils, Compass, ExternalLink,
  ShieldAlert, HeartHandshake
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

const formatNum = (val: any): string => {
  if (val === null || val === undefined || val === '') return '0';
  const num = typeof val === 'string' ? Number(val.replace(/,/g, '')) : Number(val);
  return isNaN(num) ? '0' : new Intl.NumberFormat('ko-KR').format(Math.round(num));
};

export default function Members() {
  const { startDate, endDate, isRange } = useDate();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const isEffectiveRange = Boolean(isRange && endDate && startDate !== endDate);
  const effectiveEnd = isEffectiveRange && endDate ? endDate : startDate;

  // 상단 메인 탭 ('membership': 분양회원 실사용 & 영업장 이용 분석 | 'corporate': 기업 휴양소 B2B 정산 & 재방문 원장)
  const tabParam = searchParams.get('tab');
  const [activeMainTab, setActiveMainTab] = useState<'membership' | 'corporate'>(
    tabParam === 'corporate' ? 'corporate' : 'membership'
  );

  useEffect(() => {
    if (tabParam === 'corporate') {
      setActiveMainTab('corporate');
    } else if (tabParam === 'membership' || !tabParam) {
      setActiveMainTab('membership');
    }
  }, [tabParam]);

  const handleMainTabChange = (nextTab: 'membership' | 'corporate') => {
    setActiveMainTab(nextTab);
    if (nextTab === 'corporate') {
      setSearchParams({ tab: 'corporate' });
    } else {
      setSearchParams({});
    }
  };

  const [loading, setLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // 1. 콘도/객실 회원권 및 요금타입별 실적 (room-rate-sales)
  const [rateRows, setRateRows] = useState<any[]>([]);
  const [ratePeriodMode, setRatePeriodMode] = useState<'today' | 'mtd' | 'ytd'>('today');
  const [showLyColumns, setShowLyColumns] = useState<boolean>(false);

  // 2. 골프 분양회원 및 회원 동반 시너지 (golf-channel-intelligence & teetime-analysis-v2)
  const [golfIntel, setGolfIntel] = useState<any>(null);
  const [golfMembershipAnalysis, setGolfMembershipAnalysis] = useState<any>(null);

  // 3. 법인 휴양소 및 재방문 단체 회원사 (corporate-group-sales)
  const [corpData, setCorpData] = useState<any>(null);
  const [corpFilter, setCorpFilter] = useState<'ALL' | 'COMPLETED' | 'PENDING'>('ALL');
  const [corpSort, setCorpSort] = useState<'rooms' | 'revenue' | 'contract' | 'date'>('rooms');
  const [corpSearch, setCorpSearch] = useState<string>('');

  // 4. 분양회원 구좌별 소진율 및 방문 회원별 통합 LTV · 보증금 반환 리스크 · 이용 만족도 원장 (member-quota-ltv)
  const [quotaLtvData, setQuotaLtvData] = useState<{
    accountQuotaSummary: any[];
    accountQuotaOverview: any;
    visitedMembersLedger: any[];
    depositRedemptionSummary: any;
    usageSatisfactionSummary: any;
  } | null>(null);

  // 분양회원 개인/구좌별 원장 필터·정렬·드릴다운 상태
  const [memberLedgerSearch, setMemberLedgerSearch] = useState<string>('');
  const [memberLedgerFilter, setMemberLedgerFilter] = useState<string>('ALL');
  const [ledgerSegment, setLedgerSegment] = useState<'ALL' | 'HIGH_RISK' | 'LOW_BURN' | 'VIP_VISIT' | 'GOLF_ACTIVE' | 'MULTI_DEPT'>('ALL');
  const [ledgerSort, setLedgerSort] = useState<'burnDesc' | 'visitDesc' | 'expiryAsc' | 'ltvDesc' | 'periodDesc'>('burnDesc');
  const [expandedMemberKey, setExpandedMemberKey] = useState<string | null>(null);

  const fetchAllMemberIntelligence = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const queryParams = `startDate=${startDate}&endDate=${effectiveEnd}`;

      const [rateRes, golfIntelRes, golfV2Res, corpRes, quotaLtvRes] = await Promise.all([
        secureFetcher(`${API_BASE}/api/v6/report/room-rate-sales?${queryParams}`).catch(() => null),
        secureFetcher(`${API_BASE}/api/v6/report/golf-channel-intelligence?${queryParams}`).catch(() => null),
        secureFetcher(`${API_BASE}/api/v6/report/golf-channel-teetime-analysis-v2?${queryParams}`).catch(() => null),
        secureFetcher(`${API_BASE}/api/v6/report/corporate-group-sales?${queryParams}`).catch(() => null),
        secureFetcher(`${API_BASE}/api/v6/report/member-quota-ltv?${queryParams}`).catch(() => null)
      ]);

      const parsedRates = rateRes?.data ?? rateRes;
      setRateRows(Array.isArray(parsedRates) ? parsedRates : []);

      const parsedGolfIntel = golfIntelRes?.data ?? golfIntelRes;
      setGolfIntel(parsedGolfIntel || null);

      const parsedGolfV2 = golfV2Res?.data ?? golfV2Res;
      setGolfMembershipAnalysis(
        parsedGolfV2?.meta?.summary?.membershipAnalysis ||
        parsedGolfV2?.membershipAnalysis ||
        null
      );

      const parsedCorp = corpRes?.data ?? corpRes;
      setCorpData(parsedCorp || null);

      const parsedQuotaLtv = quotaLtvRes?.data ?? quotaLtvRes;
      if (parsedQuotaLtv && (parsedQuotaLtv.accountQuotaSummary || parsedQuotaLtv.accountQuotaOverview)) {
        const ledgerList = Array.isArray(parsedQuotaLtv.visitedMembersLedger)
          ? parsedQuotaLtv.visitedMembersLedger
          : [];
        setQuotaLtvData({
          accountQuotaSummary: Array.isArray(parsedQuotaLtv.accountQuotaSummary) ? parsedQuotaLtv.accountQuotaSummary : [],
          accountQuotaOverview: parsedQuotaLtv.accountQuotaOverview || null,
          visitedMembersLedger: ledgerList,
          depositRedemptionSummary: parsedQuotaLtv.depositRedemptionSummary || null,
          usageSatisfactionSummary: parsedQuotaLtv.usageSatisfactionSummary || null
        });
        if (ledgerList.length > 0 && !expandedMemberKey) {
          const firstKey = String(ledgerList[0].membershipNo || ledgerList[0].certNo || '0');
          setExpandedMemberKey(firstKey);
        }
      } else {
        setQuotaLtvData(null);
      }
    } catch (err: any) {
      console.error('Member Intelligence Fetch Error:', err);
      setApiError(err.message || '회원 분석 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startDate) {
      fetchAllMemberIntelligence();
    }
  }, [startDate, endDate, isRange]);

  // --- 1. 콘도 회원권 데이터 추출 (백엔드 완제품 직접 매핑, NO SLICE SUMMATION) ---
  const memberRoomRow = rateRows.find(r =>
    (r.depth === 1 || !r.isSubRow) && (
      r.rateCode === 'REGISTERED_MEMBER' ||
      r.rateName === '기명/구좌회원' ||
      r.segmentName === '기명/구좌회원' ||
      String(r.rateName || '').includes('기명/구좌회원') ||
      String(r.segmentName || '').includes('기명/구좌회원')
    )
  ) || null;

  const bearerRoomRow = rateRows.find(r =>
    (r.depth === 1 || !r.isSubRow) && (
      r.rateCode === 'BEARER_MEMBER' ||
      r.rateName === '무기명회원' ||
      r.segmentName === '무기명회원' ||
      String(r.rateName || '').includes('무기명회원') ||
      String(r.segmentName || '').includes('무기명회원')
    )
  ) || null;

  const grandTotalRoomRow = rateRows.find(r => r.isGrandTotal || r.rateName === '총합계') || null;
  const segmentRateRows = rateRows.filter(r => !r.isGrandTotal && r.rateName !== '총합계');

  const hasLyData = segmentRateRows.some(
    r => (r.todayLyRooms != null && r.todayLyRooms !== 0) ||
         (r.todayLyRevenue != null && r.todayLyRevenue !== 0) ||
         (r.lyRoomsSold != null && r.lyRoomsSold !== 0) ||
         (r.lyTotalRevenue != null && r.lyTotalRevenue !== 0)
  );

  const isMemberRateCategory = (row: any): boolean => {
    if (row?.isMemberCategory != null) return Boolean(row.isMemberCategory);
    if (row?.isMember != null) return Boolean(row.isMember);
    const name = String(row?.rateName || row?.segmentName || '');
    return name.includes('기명') || name.includes('무기명') || name.includes('회원') || name.includes('Member');
  };

  // --- 2. 골프 분양회원 및 앵커 데이터 추출 ---
  const golfMemberSummary = golfIntel?.membershipSummary || null;
  const golfMemberBreakdown: any[] = Array.isArray(golfIntel?.membershipBreakdown)
    ? golfIntel.membershipBreakdown
    : [];
  const golfMemberSynergy = golfIntel?.memberSynergy || null;

  // --- 3. 법인 휴양소 및 단체 회원사 데이터 추출 ---
  const corpSummary = corpData?.summary || null;
  const corpFitSummary = corpSummary?.corpFit || null;
  const corpGroups: any[] = Array.isArray(corpData?.groups) ? corpData.groups : [];
  const baseMemberCorpGroups = corpGroups.filter(
    g => g.b2bSegment === 'CORP_FIT' || g.category === 'RESORT_CORP'
  );

  const completedCorpCount = corpFitSummary?.completedCount ?? baseMemberCorpGroups.filter(g => g.settlementStatus === 'COMPLETED').length;
  const pendingCorpCount = corpFitSummary?.pendingCount ?? baseMemberCorpGroups.filter(g => g.settlementStatus === 'PENDING_POST_BILLING').length;

  const filteredMemberCorpGroups = baseMemberCorpGroups.filter(g => {
    if (corpFilter === 'COMPLETED' && g.settlementStatus !== 'COMPLETED') return false;
    if (corpFilter === 'PENDING' && g.settlementStatus !== 'PENDING_POST_BILLING') return false;
    if (corpSearch.trim()) {
      const q = corpSearch.trim().toLowerCase();
      const gName = String(g.groupName || g.corporateName || '').toLowerCase();
      const cName = String(g.categoryName || g.b2bSegmentName || '').toLowerCase();
      return gName.includes(q) || cName.includes(q);
    }
    return true;
  });

  const memberCorpGroups = [...filteredMemberCorpGroups].sort((a, b) => {
    if (corpSort === 'revenue') {
      return (Number(b.totalRevenue) || 0) - (Number(a.totalRevenue) || 0);
    }
    if (corpSort === 'contract') {
      return (Number(b.contractRevenue || b.spendingBreakdown?.contractRevenue) || 0) - (Number(a.contractRevenue || a.spendingBreakdown?.contractRevenue) || 0);
    }
    if (corpSort === 'date') {
      return String(b.checkInDate || '').localeCompare(String(a.checkInDate || ''));
    }
    return (Number(b.roomsCount) || 0) - (Number(a.roomsCount) || 0);
  });

  // --- 4. 분양회원 개인/구좌별 원장 필터링 & 정렬 ---
  const rawVisitedLedger: any[] = quotaLtvData?.visitedMembersLedger || [];

  const isMultiDeptMember = (m: any): boolean => {
    const activeFlags = [
      (Number(m.ytdRoomSpend || m.periodRoomSpend || 0) > 0 || Number(m.usedNights || m.periodUsedNights || 0) > 0),
      Number(m.ytdGolfSpend || m.periodGolfSpend || 0) > 0,
      Number(m.ytdFnbSpend || m.periodFnbSpend || 0) > 0,
      Number(m.ytdLeisureSpend || m.periodLeisureSpend || 0) > 0
    ].filter(Boolean).length;
    return activeFlags >= 2;
  };

  const filteredVisitedLedger = rawVisitedLedger
    .filter((m: any) => {
      const q = memberLedgerSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        String(m.memberName || '').toLowerCase().includes(q) ||
        String(m.membershipNo || '').toLowerCase().includes(q) ||
        String(m.certNo || '').toLowerCase().includes(q) ||
        String(m.memberNo || '').toLowerCase().includes(q) ||
        String(m.prevCertNo || '').toLowerCase().includes(q);

      const matchesAccountType =
        memberLedgerFilter === 'ALL' ||
        String(m.accountType || '').includes(memberLedgerFilter);

      let matchesSegment = true;
      if (ledgerSegment === 'HIGH_RISK') {
        matchesSegment =
          m.redemptionRiskGrade === 'HIGH_RISK' || Number(m.burnRatePct ?? 0) < 5;
      } else if (ledgerSegment === 'VIP_VISIT') {
        matchesSegment = Number(m.ytdVisitCount || 0) >= 10;
      } else if (ledgerSegment === 'LOW_BURN') {
        matchesSegment = Number(m.burnRatePct ?? 0) < 10;
      } else if (ledgerSegment === 'GOLF_ACTIVE') {
        matchesSegment = Number(m.ytdGolfSpend || m.periodGolfSpend || 0) > 0;
      } else if (ledgerSegment === 'MULTI_DEPT') {
        matchesSegment = isMultiDeptMember(m);
      }

      return matchesSearch && matchesAccountType && matchesSegment;
    })
    .sort((a: any, b: any) => {
      if (ledgerSort === 'expiryAsc') {
        const aDays = a.daysUntilExpiry != null ? Number(a.daysUntilExpiry) : 999999;
        const bDays = b.daysUntilExpiry != null ? Number(b.daysUntilExpiry) : 999999;
        if (aDays !== bDays) return aDays - bDays;
        return Number(a.burnRatePct || 0) - Number(b.burnRatePct || 0);
      }
      if (ledgerSort === 'periodDesc') {
        return Number(b.periodTotalSpend || 0) - Number(a.periodTotalSpend || 0);
      }
      if (ledgerSort === 'burnDesc') {
        return Number(b.burnRatePct || 0) - Number(a.burnRatePct || 0);
      }
      if (ledgerSort === 'visitDesc') {
        return Number(b.ytdVisitCount || 0) - Number(a.ytdVisitCount || 0);
      }
      return Number(b.totalLtv || b.ytdTotalSpend || 0) - Number(a.totalLtv || a.ytdTotalSpend || 0);
    });

  // 콘도 요금타입별 비교 차트 옵션
  const getCondoRateChartOption = () => {
    const validRows = segmentRateRows.filter(r => {
      if (r.depth > 1 || r.isSubRow) return false;
      const rooms =
        ratePeriodMode === 'today'
          ? Number(r.todayRooms || 0)
          : ratePeriodMode === 'mtd'
          ? Number(r.mtdRooms || 0)
          : Number(r.ytdRooms || 0);
      const rev =
        ratePeriodMode === 'today'
          ? Number(r.todayRevenue || 0)
          : ratePeriodMode === 'mtd'
          ? Number(r.mtdRevenue || 0)
          : Number(r.ytdRevenue || 0);
      return rooms > 0 || rev > 0;
    });

    const labels = validRows.map(r => r.rateName || r.segmentName || '-');
    const roomsData = validRows.map(r =>
      ratePeriodMode === 'today'
        ? Number(r.todayRooms || 0)
        : ratePeriodMode === 'mtd'
        ? Number(r.mtdRooms || 0)
        : Number(r.ytdRooms || 0)
    );
    const adrData = validRows.map(r =>
      ratePeriodMode === 'today'
        ? Number(r.todayAdr || 0)
        : ratePeriodMode === 'mtd'
        ? Number(r.mtdAdr || 0)
        : Number(r.ytdAdr || 0)
    );

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      legend: {
        data: ['판매 객실수 (실)', '평균 객단가 ADR (원)'],
        bottom: 0
      },
      grid: { left: '3%', right: '4%', top: '12%', bottom: '16%', containLabel: true },
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: { color: '#475569', fontWeight: 600, interval: 0, rotate: labels.length > 5 ? 15 : 0 }
      },
      yAxis: [
        {
          type: 'value',
          name: '객실수 (실)',
          position: 'left',
          axisLabel: { formatter: '{value} 실' }
        },
        {
          type: 'value',
          name: 'ADR (원)',
          position: 'right',
          axisLabel: { formatter: '{value} 원' }
        }
      ],
      series: [
        {
          name: '판매 객실수 (실)',
          type: 'bar',
          yAxisIndex: 0,
          barMaxWidth: 42,
          data: roomsData.map((val, idx) => ({
            value: val,
            itemStyle: {
              color: isMemberRateCategory(validRows[idx]) ? '#284F42' : '#D0C6BB',
              borderRadius: [8, 8, 0, 0]
            }
          }))
        },
        {
          name: '평균 객단가 ADR (원)',
          type: 'line',
          yAxisIndex: 1,
          data: adrData,
          smooth: true,
          symbolSize: 8,
          itemStyle: { color: '#B59269' },
          lineStyle: { width: 3 }
        }
      ]
    };
  };

  const overview = quotaLtvData?.accountQuotaOverview || null;
  const depositRedemption = quotaLtvData?.depositRedemptionSummary || null;
  const usageSatisfaction = quotaLtvData?.usageSatisfactionSummary || null;
  const grandTotalQuotaRow =
    quotaLtvData?.accountQuotaSummary?.find((r: any) => r.isGrandTotal) || null;

  return (
    <div className="w-full min-h-screen bg-[#F4F3EE] text-[#1B382E] tracking-tight pb-16 relative">
      {/* Ambient Forest Glow Banner */}
      <div className="w-full bg-[#284F42] h-[190px] absolute top-0 left-0 z-0 overflow-hidden rounded-b-[36px] border-b border-[#1B382E] shadow-xl">
        <div className="absolute -top-16 -right-16 w-96 h-96 rounded-full bg-[#2F5548] opacity-70 pointer-events-none" />
        <div className="absolute top-8 left-1/3 w-80 h-80 rounded-full bg-[#2F5548] opacity-40 blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 right-1/4 w-60 h-60 rounded-full bg-[#1B382E] opacity-60 pointer-events-none" />
      </div>

      <div className="relative z-10 max-w-[1620px] mx-auto px-5 sm:px-7 lg:px-10 pt-6 lg:pt-8 space-y-6">
        {/* HEADER BAR */}
      <div className="bg-white rounded-3xl p-6 lg:p-8 border border-[#D0C6BB] shadow-[0_4px_24px_rgba(40,79,66,0.06)] flex flex-col xl:flex-row xl:items-center justify-between gap-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]/75">
              <Award size={13} />
              V6 MEMBERSHIP RETENTION & DEPOSIT CARE INTELLIGENCE (SSOT)
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FAF6F0] text-[#8B6E4E] border border-[#D0C6BB]">
              16)분양회원 825구좌 · 보증금 반환 방어 · 실사용 만족도 & 1:N 카드 통합 관리
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-[#1B382E]">
            분양회원 구좌 관리 · 보증금 반환 리스크 방어 & 실사용 만족도 분석
          </h1>
          <p className="text-xs lg:text-sm text-[#5A6B63]">
            단순 매출액보다 중요한 <strong>분양구좌(825구좌) 보증금 만기 반환(Redemption) 리스크 관리</strong>와 회원이 <strong>얼마나 자주 방문하고 다양한 시설(객실·골프·식음·레저)에 만족하고 있는지</strong>를 중심으로 구좌별 실사용 건강도를 진단합니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <GlobalDatePicker />
          <button
            type="button"
            onClick={fetchAllMemberIntelligence}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#284F42] text-white text-xs font-bold hover:bg-[#1B382E] transition-all cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            새로고침
          </button>
        </div>
      </div>

      {/* 상단 비즈니스 뷰 전환 탭 & 온라인 회원 바로가기 배너 */}
      <div className="bg-white rounded-2xl p-3 border border-[#D0C6BB] shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleMainTabChange('membership')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs lg:text-sm font-black transition-all cursor-pointer ${
              activeMainTab === 'membership'
                ? 'bg-[#284F42] text-white shadow-sm'
                : 'bg-[#F4F3EE] text-[#5A6B63] hover:text-[#1B382E]'
            }`}
          >
            <Building2 size={16} />
            <span>① 분양회원 보증금 반환 방어 & 실사용·만족도 관리</span>
            {overview?.totalAccounts != null && (
              <span className={`px-2 py-0.5 rounded-full text-[11px] ${
                activeMainTab === 'membership' ? 'bg-white/20 text-[#E8F2EE]' : 'bg-white text-[#1B382E]'
              }`}>
                {formatNum(overview.totalAccounts)}구좌 · 활성 {formatNum(overview.activeAccounts)}구좌
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleMainTabChange('corporate')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs lg:text-sm font-black transition-all cursor-pointer ${
              activeMainTab === 'corporate'
                ? 'bg-[#284F42] text-white shadow-sm'
                : 'bg-[#F4F3EE] text-[#5A6B63] hover:text-[#1B382E]'
            }`}
          >
            <Briefcase size={16} />
            <span>② 기업 휴양소(B2B 협약 회원사) 정산 & 재방문 원장</span>
            {corpFitSummary?.groupsCount != null && (
              <span className={`px-2 py-0.5 rounded-full text-[11px] ${
                activeMainTab === 'corporate' ? 'bg-[#B59269] text-white' : 'bg-white text-[#1B382E]'
              }`}>
                {formatNum(corpFitSummary.groupsCount)}건 · {corpFitSummary.totalRevenueFormatted || '4.5억'}원
              </span>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={() => navigate('/online-members')}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#FAF6F0] text-[#8B6E4E] hover:bg-[#EFE9DF] border border-[#D0C6BB] transition-colors cursor-pointer shrink-0"
        >
          <Smartphone size={14} />
          <span>온라인 회원 증가·실구매 전환 & 인기 상품 분석 바로가기</span>
          <ExternalLink size={12} />
        </button>
      </div>

      {/* 에러 배너 */}
      {apiError && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 text-sm font-medium">
          ⚠️ {apiError}
        </div>
      )}

      {/* ===================================================================================== */}
      {/* TAB 1: 분양회원 보증금 반환 방어 & 실사용·만족도 관리 */}
      {/* ===================================================================================== */}
      {activeMainTab === 'membership' && (
        <div className="space-y-6">
          {/* SECTION 1: 825구좌 실사용 만족도 & 보증금 반환 방어 핵심 4대 지표 (Executive Retention & Satisfaction Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 font-financial">
            {/* 카드 1: 전체 분양구좌 실사용 활성율 & 미방문 휴면 관리 */}
            <div className="bg-[#284F42] text-white rounded-3xl p-5 border border-[#1B382E] shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-emerald-200">
                  <span>전체 분양구좌 실사용 활성율</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-[#B59269] font-black">
                    활성 {overview?.activeRatePct != null ? `${overview.activeRatePct}%` : '-'}
                  </span>
                </div>
                <div className="text-3xl font-black text-white mt-2 tabular-nums">
                  {overview ? `${formatNum(overview.activeAccounts)} / ${formatNum(overview.totalAccounts)}구좌` : '-'}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs text-white/85">
                <span>연간 미방문(0회) 휴면 구좌</span>
                <span className="font-bold text-amber-300">
                  {usageSatisfaction?.dormantZeroVisitAccounts != null
                    ? `${formatNum(usageSatisfaction.dormantZeroVisitAccounts)}구좌 (${usageSatisfaction.dormantAccountRatePct ?? '-'}%)`
                    : 'Ticket 82 연동 (미방문 구좌 케어)'}
                </span>
              </div>
            </div>

            {/* 카드 2: 연간 부여박수(Quota) 실사용률 & 체감 이용 만족도 */}
            <div className="bg-white rounded-3xl p-5 border border-[#D0C6BB] shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-[#5A6B63]">
                  <span>연간 부여박수(Quota) 실사용률</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]/70 font-black">
                    소진율 {overview?.burnRatePct != null ? `${overview.burnRatePct}%` : '-'}
                  </span>
                </div>
                <div className="text-3xl font-black text-[#1B382E] mt-2 tabular-nums">
                  {overview ? `${formatNum(overview.usedNights)}박 실사용` : '-'}
                </div>
                <div className="w-full h-2 bg-[#F4F3EE] rounded-full overflow-hidden mt-2.5 border border-[#D0C6BB]/50">
                  <div
                    className="h-full bg-[#284F42] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Number(overview?.burnRatePct || 0))}%` }}
                  />
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-[#D0C6BB]/50 flex items-center justify-between text-xs text-[#5A6B63]">
                <span>부여: <strong className="text-[#1B382E]">{overview ? `${formatNum(overview.quotaNights)}박` : '-'}</strong></span>
                <span>미소진 잔여: <strong className="text-[#8B2635]">{overview ? `${formatNum(overview.remainingNights)}박` : '-'}</strong></span>
              </div>
            </div>

            {/* 카드 3: 연간 총 방문 빈도 & 리조트 다부문 경험 만족도 */}
            <div className="bg-white rounded-3xl p-5 border border-[#D0C6BB] shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-[#5A6B63]">
                  <span>연간 방문 빈도 & 재방문 만족도</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]/70 font-bold">
                    조회기간 {formatNum(rawVisitedLedger.length)}구좌 방문
                  </span>
                </div>
                <div className="text-3xl font-black text-[#284F42] mt-2 tabular-nums">
                  {grandTotalQuotaRow?.ytdVisitCount != null
                    ? `연 ${formatNum(grandTotalQuotaRow.ytdVisitCount)}회 방문`
                    : '-'}
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-[#D0C6BB]/50 flex items-center justify-between text-xs text-[#5A6B63]">
                <span>활성구좌 평균 방문: <strong className="text-[#1B382E]">{usageSatisfaction?.avgAnnualVisitsPerActiveAccount != null ? `${usageSatisfaction.avgAnnualVisitsPerActiveAccount}회` : '-'}</strong></span>
                <span>2회+ 재방문율: <strong className="text-[#1E523F]">{usageSatisfaction?.repeatVisitRetentionRatePct != null ? `${usageSatisfaction.repeatVisitRetentionRatePct}%` : '-'}</strong></span>
              </div>
            </div>

            {/* 카드 4: 보증금 만기 도래 & 반환(Redemption) 고위험군 방어 */}
            <div className="bg-[#FDF0ED] rounded-3xl p-5 border border-[#EAC5BD] shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-[#8B2635]">
                  <span>보증금 반환(Redemption) 리스크 관리</span>
                  <ShieldAlert size={16} className="text-[#8B2635]" />
                </div>
                <div className="text-2xl xl:text-3xl font-black text-[#8B2635] mt-2 tabular-nums">
                  {depositRedemption?.redemptionRiskMatrix?.highRiskRedemption?.accountsCount != null
                    ? `고위험 ${formatNum(depositRedemption.redemptionRiskMatrix.highRiskRedemption.accountsCount)}구좌`
                    : depositRedemption?.expiringWithin1Year?.accountsCount != null
                    ? `1년내 만기 ${formatNum(depositRedemption.expiringWithin1Year.accountsCount)}구좌`
                    : '-'}
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-[#EAC5BD]/70 flex items-center justify-between text-xs text-[#8B2635]">
                <span>1년 내 만기 도래: <strong>{depositRedemption?.expiringWithin1Year?.accountsCount != null ? `${formatNum(depositRedemption.expiringWithin1Year.accountsCount)}구좌` : '-'}</strong></span>
                <span>재연장 유지율: <strong>{depositRedemption?.rolloverHistory?.rolloverRetentionRatePct != null ? `${depositRedemption.rolloverHistory.rolloverRetentionRatePct}%` : '-'}</strong></span>
              </div>
            </div>
          </div>

          {/* SECTION 1.5: 분양구좌 보증금 반환(Redemption) 리스크 방어 & 회원 실사용·체감 만족도 경영 진단 보드 */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* 좌측 6컬럼: 보증금 만기 도래 구간 & 실사용률 기반 반환(Redemption) 위험군 3단계 분류 */}
            <div className="xl:col-span-6 bg-white rounded-3xl p-6 lg:p-7 border border-[#D0C6BB] shadow-[0_4px_24px_rgba(40,79,66,0.06)] space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3 border-b border-[#D0C6BB]/60 pb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#FDF0ED] text-[#8B2635] border border-[#EAC5BD]">
                        DEPOSIT REDEMPTION RISK & EXPIRY DEFENSE
                      </span>
                      <span className="text-xs text-[#5A6B63] font-mono">
                        16)분양회원 만기일 · 보증금 · 박수 소진율 교차 진단
                      </span>
                    </div>
                    <h2 className="text-lg lg:text-xl font-black text-[#1B382E] mt-1.5 flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-[#8B2635]" />
                      보증금 만기 도래 현황 & 실사용률 기반 반환(Redemption) 위험군 분류
                    </h2>
                    <p className="text-xs text-[#5A6B63] mt-1">
                      회원권 이용 빈도와 박수 소진율이 낮을수록 만기 도래 시 보증금 반환(해지) 청구 가능성이 급증합니다. 만기 도래 구간별 저소진 구좌를 선제 파악하여 컨시어지 해피콜 및 바우처 케어를 집행합니다.
                    </p>
                  </div>
                </div>

                {/* 만기 도래 구간별 구좌 & 보증금 요약 (6개월 / 1년 / 2년 내) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-financial">
                  <div className="p-4 rounded-2xl bg-[#FDF0ED]/70 border border-[#EAC5BD]">
                    <div className="flex items-center justify-between text-xs font-bold text-[#8B2635]">
                      <span>6개월 내 만기 도래</span>
                      <span className="px-2 py-0.5 rounded-full bg-white text-[#8B2635] text-[10px] font-black">긴급 방어</span>
                    </div>
                    <div className="text-xl font-black text-[#8B2635] mt-1.5">
                      {depositRedemption?.expiringWithin6Months?.accountsCount != null
                        ? `${formatNum(depositRedemption.expiringWithin6Months.accountsCount)}구좌`
                        : '-'}
                    </div>
                    <div className="text-[11px] text-[#5A6B63] mt-1">
                      보증금: <strong className="text-[#1B382E]">{depositRedemption?.expiringWithin6Months?.depositAmount != null ? `${formatNum(depositRedemption.expiringWithin6Months.depositAmount)}원` : '-'}</strong>
                    </div>
                    <div className="text-[10px] text-[#8B2635] font-bold mt-0.5">
                      저이용 반환위험: {depositRedemption?.expiringWithin6Months?.highRiskCount != null ? `${formatNum(depositRedemption.expiringWithin6Months.highRiskCount)}구좌` : '-'}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#D0C6BB]">
                    <div className="flex items-center justify-between text-xs font-bold text-[#8B6E4E]">
                      <span>1년 내 만기 도래</span>
                      <span className="px-2 py-0.5 rounded-full bg-white text-[#8B6E4E] text-[10px] font-black">사전 케어</span>
                    </div>
                    <div className="text-xl font-black text-[#1B382E] mt-1.5">
                      {depositRedemption?.expiringWithin1Year?.accountsCount != null
                        ? `${formatNum(depositRedemption.expiringWithin1Year.accountsCount)}구좌`
                        : '-'}
                    </div>
                    <div className="text-[11px] text-[#5A6B63] mt-1">
                      보증금: <strong className="text-[#1B382E]">{depositRedemption?.expiringWithin1Year?.depositAmount != null ? `${formatNum(depositRedemption.expiringWithin1Year.depositAmount)}원` : '-'}</strong>
                    </div>
                    <div className="text-[10px] text-[#8B6E4E] font-bold mt-0.5">
                      저이용 반환위험: {depositRedemption?.expiringWithin1Year?.highRiskCount != null ? `${formatNum(depositRedemption.expiringWithin1Year.highRiskCount)}구좌` : '-'}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F4F3EE] border border-[#D0C6BB]">
                    <div className="flex items-center justify-between text-xs font-bold text-[#5A6B63]">
                      <span>2년 내 만기 도래</span>
                      <span className="px-2 py-0.5 rounded-full bg-white text-[#1B382E] text-[10px] font-bold">중기 관리</span>
                    </div>
                    <div className="text-xl font-black text-[#1B382E] mt-1.5">
                      {depositRedemption?.expiringWithin2Years?.accountsCount != null
                        ? `${formatNum(depositRedemption.expiringWithin2Years.accountsCount)}구좌`
                        : '-'}
                    </div>
                    <div className="text-[11px] text-[#5A6B63] mt-1">
                      보증금: <strong className="text-[#1B382E]">{depositRedemption?.expiringWithin2Years?.depositAmount != null ? `${formatNum(depositRedemption.expiringWithin2Years.depositAmount)}원` : '-'}</strong>
                    </div>
                    <div className="text-[10px] text-[#5A6B63] font-bold mt-0.5">
                      저이용 반환위험: {depositRedemption?.expiringWithin2Years?.highRiskCount != null ? `${formatNum(depositRedemption.expiringWithin2Years.highRiskCount)}구좌` : '-'}
                    </div>
                  </div>
                </div>

                {/* 실사용률 기반 보증금 반환 위험군 3단계 분류 매트릭스 */}
                <div className="space-y-2.5 font-financial">
                  <div className="text-xs font-extrabold text-[#1B382E] flex items-center justify-between">
                    <span>실사용률(박수 소진·방문빈도) 기반 보증금 반환 위험도 3단계 진단</span>
                    <span className="text-[11px] text-[#5A6B63]">전체 분양보증금 총액: {depositRedemption?.totalDepositAmount != null ? `${formatNum(depositRedemption.totalDepositAmount)}원` : '-'}</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#FDF0ED]/60 border border-[#EAC5BD] flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-black text-[#8B2635]">
                        🚨 보증금 반환 고위험군 (연간 미방문 휴면 또는 박수 소진율 5% 미만)
                      </div>
                      <div className="text-[11px] text-[#5A6B63] mt-0.5">
                        회원권 체감 효용 부재로 만기 시 즉각 반환 청구 우려 — 전담 매니저 1:1 초청 바우처 발송 대상
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-black text-[#8B2635]">
                        {depositRedemption?.redemptionRiskMatrix?.highRiskRedemption?.accountsCount != null
                          ? `${formatNum(depositRedemption.redemptionRiskMatrix.highRiskRedemption.accountsCount)}구좌 (${depositRedemption.redemptionRiskMatrix.highRiskRedemption.sharePct ?? '-'}%)`
                          : '-'}
                      </div>
                      <div className="text-[11px] text-[#5A6B63]">
                        보증금 {depositRedemption?.redemptionRiskMatrix?.highRiskRedemption?.depositAmount != null ? `${formatNum(depositRedemption.redemptionRiskMatrix.highRiskRedemption.depositAmount)}원` : '-'}
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#FAF6F0] border border-[#D0C6BB] flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-black text-[#8B6E4E]">
                        ⚠️ 이용 독려·집중 케어군 (연간 소진율 5~15% · 단일 시설만 단편 이용)
                      </div>
                      <div className="text-[11px] text-[#5A6B63] mt-0.5">
                        콘도 숙박 외 골프·레저·식음 교차 이용 유도 시 재연장 전환 가능군
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-black text-[#1B382E]">
                        {depositRedemption?.redemptionRiskMatrix?.careNeededGroup?.accountsCount != null
                          ? `${formatNum(depositRedemption.redemptionRiskMatrix.careNeededGroup.accountsCount)}구좌 (${depositRedemption.redemptionRiskMatrix.careNeededGroup.sharePct ?? '-'}%)`
                          : '-'}
                      </div>
                      <div className="text-[11px] text-[#5A6B63]">
                        보증금 {depositRedemption?.redemptionRiskMatrix?.careNeededGroup?.depositAmount != null ? `${formatNum(depositRedemption.redemptionRiskMatrix.careNeededGroup.depositAmount)}원` : '-'}
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#E8F2EE]/60 border border-[#B4C6C1] flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-black text-[#1E523F]">
                        ✅ 만기 재연장 유력·고만족군 (연간 소진율 15%+ · 다부문 시설 지속 애용)
                      </div>
                      <div className="text-[11px] text-[#5A6B63] mt-0.5">
                        높은 시설 만족도로 만기 도래 시 자동 재연장(Rollover) 및 추가 구좌 추천 유력군
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-black text-[#1E523F]">
                        {depositRedemption?.redemptionRiskMatrix?.safeRolloverGroup?.accountsCount != null
                          ? `${formatNum(depositRedemption.redemptionRiskMatrix.safeRolloverGroup.accountsCount)}구좌 (${depositRedemption.redemptionRiskMatrix.safeRolloverGroup.sharePct ?? '-'}%)`
                          : '-'}
                      </div>
                      <div className="text-[11px] text-[#5A6B63]">
                        보증금 {depositRedemption?.redemptionRiskMatrix?.safeRolloverGroup?.depositAmount != null ? `${formatNum(depositRedemption.redemptionRiskMatrix.safeRolloverGroup.depositAmount)}원` : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {!depositRedemption && (
                <div className="p-3.5 rounded-2xl bg-[#F4F3EE] border border-dashed border-[#D0C6BB] text-xs text-[#5A6B63] flex items-start gap-2.5">
                  <Info size={15} className="text-[#8B2635] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#1B382E]">백엔드 Ticket 82 연동 대기 (`depositRedemptionSummary`):</strong>{' '}
                    현재 실측 확인된 구좌별 이용률(전체 825구좌 중 창립회원 활성율 <strong className="text-[#8B2635]">86/168구좌, 소진율 6.4%</strong> 등)과 <code className="font-mono text-[#1B382E]">16)분양회원</code>의 계약만기일·보증금을 결합한 만기 구간별 반환 위험군 완제품이 배포되면 즉시 표출됩니다.
                  </div>
                </div>
              )}
            </div>

            {/* 우측 6컬럼: 분양회원이 얼마나 자주 이용하고 만족하는지 (이용 빈도 · 박수 소진 분포 · 다부문 경험 폭 · 1:N 카드 가동률) */}
            <div className="xl:col-span-6 bg-white rounded-3xl p-6 lg:p-7 border border-[#D0C6BB] shadow-[0_4px_24px_rgba(40,79,66,0.06)] space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3 border-b border-[#D0C6BB]/60 pb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]">
                        MEMBER USAGE FREQUENCY & SATISFACTION SCOREBOARD
                      </span>
                      <span className="text-xs text-[#5A6B63] font-mono">
                        박수 소진 분포 · 4대 부문 경험 폭 · 1:N 카드 활성율
                      </span>
                    </div>
                    <h2 className="text-lg lg:text-xl font-black text-[#1B382E] mt-1.5 flex items-center gap-2">
                      <HeartHandshake className="w-5 h-5 text-[#284F42]" />
                      분양회원 실사용 빈도 & 리조트 시설 체감 만족도 진단
                    </h2>
                    <p className="text-xs text-[#5A6B63] mt-1">
                      분양회원의 만족도는 <strong>① 부여박수를 얼마나 꾸준히 소진하는지</strong>, <strong>② 1:N 발급카드를 가족·임직원이 함께 활용하는지</strong>, <strong>③ 객실 외 골프·식음·레저까지 다양하게 즐기는지</strong>로 나타납니다.
                    </p>
                  </div>
                </div>

                {/* 현재 실측 구좌 유형별 활성율 & 소진율 만족도 바로미터 (백엔드 accountQuotaSummary 100% 직결) */}
                {quotaLtvData && quotaLtvData.accountQuotaSummary.length > 0 && (
                  <div className="space-y-2 font-financial">
                    <div className="text-xs font-extrabold text-[#1B382E] flex items-center justify-between">
                      <span>회원권 구분별 실사용 활성 구좌 및 연간 박수 소진율 (실측 SSOT)</span>
                      <span className="text-[11px] text-[#5A6B63]">낮은 활성율·소진율 = 중점 만족도 개선 타겟</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {quotaLtvData.accountQuotaSummary
                        .filter((r: any) => !r.isGrandTotal)
                        .map((r: any, idx: number) => {
                          const burnPct = Number(r.burnRatePct ?? r.exhaustionRate ?? 0);
                          const isLowSatisfactionRisk = burnPct < 10;
                          return (
                            <div
                              key={idx}
                              className={`p-3.5 rounded-2xl border ${
                                isLowSatisfactionRisk
                                  ? 'bg-[#FDF0ED]/50 border-[#EAC5BD]'
                                  : 'bg-[#F4F3EE]/80 border-[#D0C6BB]/80'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-[#1B382E]">
                                  {r.accountTypeKo || r.accountType}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isLowSatisfactionRisk
                                    ? 'bg-[#8B2635] text-white'
                                    : 'bg-[#284F42] text-white'
                                }`}>
                                  소진율 {burnPct}%
                                </span>
                              </div>
                              <div className="mt-1.5 flex items-baseline justify-between text-xs">
                                <span className="text-[#5A6B63]">
                                  실사용 활성: <strong className="text-[#1B382E]">{formatNum(r.activeAccounts)} / {formatNum(r.totalAccounts)}구좌</strong>
                                </span>
                                <span className="font-bold text-[#1E523F]">
                                  연 {formatNum(r.ytdVisitCount)}회 방문
                                </span>
                              </div>
                              <div className="mt-1 text-[11px] text-[#5A6B63] flex items-center justify-between">
                                <span>실사용 {formatNum(r.ytdUsedNights ?? r.usedNights)}박 / 부여 {formatNum(r.annualQuotaNights ?? r.quotaNights)}박</span>
                                <span className="text-[#8B2635] font-semibold">미소진 {formatNum(r.remainingNights)}박</span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* 다부문 시설 경험 폭(multiFacilityBreadth) & 1:N 발급카드 가동률(cardUtilization) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-financial">
                  <div className="p-4 rounded-2xl bg-[#F4F3EE]/70 border border-[#D0C6BB] space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-[#1B382E]">
                      <span>1:N 발급카드 실사용 가동률</span>
                      <CreditCard size={14} className="text-[#B59269]" />
                    </div>
                    <div className="text-xl font-black text-[#284F42]">
                      {usageSatisfaction?.cardUtilization?.cardActiveRatePct != null
                        ? `${usageSatisfaction.cardUtilization.cardActiveRatePct}% 가동`
                        : '-'}
                    </div>
                    <div className="text-[11px] text-[#5A6B63]">
                      실사용 카드: <strong className="text-[#1B382E]">{usageSatisfaction?.cardUtilization?.activeUsedCards != null ? `${formatNum(usageSatisfaction.cardUtilization.activeUsedCards)}매` : '-'}</strong> / 총 발급 {usageSatisfaction?.cardUtilization?.totalIssuedCards != null ? `${formatNum(usageSatisfaction.cardUtilization.totalIssuedCards)}매` : '-'}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#E8F2EE]/60 border border-[#B4C6C1] space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-[#1E523F]">
                      <span>다부문(객실+골프+식음+레저) 경험 폭</span>
                      <Sparkles size={14} className="text-[#1E523F]" />
                    </div>
                    {Array.isArray(usageSatisfaction?.multiFacilityBreadth) && usageSatisfaction.multiFacilityBreadth.length > 0 ? (
                      <div className="space-y-1 text-[11px]">
                        {usageSatisfaction.multiFacilityBreadth.map((b: any, bIdx: number) => (
                          <div key={bIdx} className="flex items-center justify-between">
                            <span className="text-[#1B382E] font-medium">{b.label}</span>
                            <strong className="text-[#1E523F]">{formatNum(b.accountsCount)}구좌 ({b.sharePct}%)</strong>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-[#5A6B63] pt-1">
                        <div>다부문 복합 경험 분포: <strong className="text-[#1B382E]">-</strong></div>
                        <div className="text-[11px] mt-0.5">하단 원장 [2개 부문+ 복합 이용] 필터로 즉시 조회 가능</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 박수 소진율 구간 분포(burnRateDistribution) & 분양회원 최다 이용 선호 영업장(topPreferredVenues) 1:1 바인딩 */}
                {(Array.isArray(usageSatisfaction?.burnRateDistribution) && usageSatisfaction.burnRateDistribution.length > 0) && (
                  <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#D0C6BB] space-y-2 font-financial">
                    <div className="text-xs font-extrabold text-[#1B382E] flex items-center justify-between">
                      <span>연간 박수 소진율 구간별 구좌 분포 (`burnRateDistribution`)</span>
                      <span className="text-[11px] text-[#5A6B63]">실사용구좌 평균 {usageSatisfaction?.avgUsedNightsPerActiveAccount ?? '-'}박 소진</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                      {usageSatisfaction.burnRateDistribution.map((b: any, bIdx: number) => (
                        <div key={b.bucketCode || bIdx} className="bg-white p-2.5 rounded-xl border border-[#D0C6BB]/70">
                          <div className="text-[10px] text-[#5A6B63] font-bold truncate">{b.bucketLabel}</div>
                          <div className="text-sm font-black text-[#1B382E] mt-0.5">{formatNum(b.accountsCount)}구좌</div>
                          <div className="text-[10px] text-[#1E523F] font-semibold">비중 {b.sharePct ?? '-'}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(Array.isArray(usageSatisfaction?.topPreferredVenues) && usageSatisfaction.topPreferredVenues.length > 0) && (
                  <div className="p-4 rounded-2xl bg-[#F4F3EE]/80 border border-[#D0C6BB] space-y-2 font-financial">
                    <div className="text-xs font-extrabold text-[#1B382E] flex items-center justify-between">
                      <span>분양회원 최다 방문 선호 영업장 Top 랭킹 (`topPreferredVenues`)</span>
                      <span className="text-[11px] text-[#5A6B63]">구좌 침투율 · 재방문율</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {usageSatisfaction.topPreferredVenues.slice(0, 6).map((v: any, vIdx: number) => (
                        <div key={vIdx} className="bg-white p-2.5 rounded-xl border border-[#D0C6BB]/70 flex items-center justify-between">
                          <div>
                            <span className="font-black text-[#284F42] mr-1.5">{v.rank ?? vIdx + 1}위</span>
                            <span className="font-bold text-[#1B382E]">{v.venueName}</span>
                          </div>
                          <div className="text-right text-[11px] text-[#5A6B63]">
                            <strong className="text-[#1E523F]">{formatNum(v.visitedAccountsCount ?? v.visitedAccountCount)}구좌</strong> ({v.accountPenetrationPct ?? '-'}%) · {formatNum(v.totalVisitCount)}회
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {!usageSatisfaction && (
                <div className="p-3.5 rounded-2xl bg-[#F4F3EE] border border-dashed border-[#D0C6BB] text-xs text-[#5A6B63] flex items-start gap-2.5">
                  <Info size={15} className="text-[#284F42] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#1B382E]">백엔드 Ticket 82 연동 대기 (`usageSatisfactionSummary`):</strong>{' '}
                    구좌별 박수 소진율 구간 분포(`burnRateDistribution`), 1:N 발급카드 활성화율(`cardUtilization`), 분양회원 선호 영업장 Top 10(`topPreferredVenues`) 완제품이 배포되면 즉시 표출됩니다.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: 분양 회원권 구분별(기명·무기명·창립·법인) 실사용 소진율 & LTV 매트릭스 */}
          {quotaLtvData && quotaLtvData.accountQuotaSummary.length > 0 && (
            <div className="bg-white rounded-3xl p-6 lg:p-7 border border-[#D0C6BB] shadow-[0_4px_24px_rgba(40,79,66,0.06)] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D0C6BB]/50 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]/70">
                      MEMBERSHIP TIER QUOTA & SPEND MATRIX
                    </span>
                    <span className="text-xs text-[#5A6B63] font-mono">
                      API: /api/v6/report/member-quota-ltv
                    </span>
                  </div>
                  <h2 className="text-lg lg:text-xl font-black text-[#1B382E] mt-1.5 flex items-center gap-2">
                    <Coins className="w-5 h-5 text-[#B59269]" />
                    회원권 구분별(기명 · 무기명 · 창립 · 법인) 연간 박수 소진율 및 부문별 소비 매트릭스
                  </h2>
                </div>
                <span className="text-xs text-[#5A6B63] font-medium">
                  단위: 구좌, 박, 회, 원 (1:N 발급카드 통합 귀속)
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-[#D0C6BB]/75">
                <table className="w-full border-collapse text-left text-sm font-financial min-w-[980px]">
                  <thead>
                    <tr className="border-b-2 border-[#1B382E] text-xs font-bold text-[#1B382E] bg-[#F4F3EE]">
                      <th className="py-3.5 px-4 text-left">회원권 구분</th>
                      <th className="py-3.5 px-3 text-right">총 구좌수</th>
                      <th className="py-3.5 px-3 text-right">실사용 활성 구좌</th>
                      <th className="py-3.5 px-3 text-right">연간 부여박수</th>
                      <th className="py-3.5 px-3 text-right">실사용 박수</th>
                      <th className="py-3.5 px-3 text-right">미소진 잔여박수</th>
                      <th className="py-3.5 px-4 text-right">연간 소진율</th>
                      <th className="py-3.5 px-3 text-right">연간 방문횟수</th>
                      <th className="py-3.5 px-4 text-right">연간 누적 통합 LTV</th>
                      <th className="py-3.5 px-4 text-right">1구좌당 평균 LTV</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D0C6BB]/30">
                    {quotaLtvData.accountQuotaSummary
                      .filter((row: any) => !row.isGrandTotal)
                      .map((row: any, idx: number) => {
                        const burnPct = Number(row.burnRatePct ?? row.exhaustionRate ?? 0);
                        return (
                          <tr key={idx} className="hover:bg-[#F4F3EE]/50 transition-colors">
                            <td className="py-3.5 px-4 font-black text-[#1B382E]">
                              {row.accountTypeKo || row.accountType}
                            </td>
                            <td className="py-3.5 px-3 text-right font-bold text-[#1B382E]">
                              {formatNum(row.totalAccounts)}구좌
                            </td>
                            <td className="py-3.5 px-3 text-right font-semibold text-[#1E523F]">
                              {formatNum(row.activeAccounts)}구좌
                            </td>
                            <td className="py-3.5 px-3 text-right text-[#5A6B63]">
                              {formatNum(row.annualQuotaNights ?? row.quotaNights)}박
                            </td>
                            <td className="py-3.5 px-3 text-right font-black text-[#284F42]">
                              {formatNum(row.ytdUsedNights ?? row.usedNights)}박
                            </td>
                            <td className="py-3.5 px-3 text-right text-[#5A6B63]">
                              {formatNum(row.remainingNights)}박
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 h-2 bg-[#F4F3EE] rounded-full overflow-hidden border border-[#D0C6BB]/50">
                                  <div
                                    className="h-full bg-[#284F42] rounded-full"
                                    style={{ width: `${Math.min(100, burnPct)}%` }}
                                  />
                                </div>
                                <span className="font-black text-[#1E523F] w-12 text-right">{burnPct}%</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-3 text-right font-semibold text-[#1B382E]">
                              {formatNum(row.ytdVisitCount)}회
                            </td>
                            <td className="py-3.5 px-4 text-right font-black text-[#1B382E]">
                              {formatNum(row.ytdTotalSpend)}원
                            </td>
                            <td className="py-3.5 px-4 text-right font-semibold text-[#5A6B63]">
                              {formatNum(row.avgLtvPerAccount)}원
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                  <tfoot>
                    {quotaLtvData.accountQuotaSummary
                      .filter((row: any) => row.isGrandTotal)
                      .map((row: any, idx: number) => (
                        <tr key={idx} className="bg-[#284F42] text-white font-bold text-sm border-t-2 border-[#1B382E]">
                          <td className="py-3.5 px-4">전체 분양구좌 총합계</td>
                          <td className="py-3.5 px-3 text-right text-[#B59269] font-black">
                            {formatNum(row.totalAccounts)}구좌
                          </td>
                          <td className="py-3.5 px-3 text-right text-[#E8F2EE]">
                            {formatNum(row.activeAccounts)}구좌
                          </td>
                          <td className="py-3.5 px-3 text-right text-[#E8F2EE]">
                            {formatNum(row.annualQuotaNights ?? row.quotaNights)}박
                          </td>
                          <td className="py-3.5 px-3 text-right text-emerald-300 font-black">
                            {formatNum(row.ytdUsedNights ?? row.usedNights)}박
                          </td>
                          <td className="py-3.5 px-3 text-right text-[#E8F2EE]">
                            {formatNum(row.remainingNights)}박
                          </td>
                          <td className="py-3.5 px-4 text-right text-emerald-300 font-black">
                            {row.burnRatePct ?? row.exhaustionRate ?? 0}%
                          </td>
                          <td className="py-3.5 px-3 text-right text-[#E8F2EE]">
                            {formatNum(row.ytdVisitCount)}회
                          </td>
                          <td className="py-3.5 px-4 text-right text-[#B59269] font-black">
                            {formatNum(row.ytdTotalSpend)}원
                          </td>
                          <td className="py-3.5 px-4 text-right text-[#E8F2EE]">
                            {formatNum(row.avgLtvPerAccount)}원
                          </td>
                        </tr>
                      ))}
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* SECTION 3: 분양회원 개인/구좌별 실사용 원장 & 어떤 영업장을 이용하는지 상세 동선 분석 (Interactive Drill-down) */}
          <div className="bg-white rounded-3xl p-6 lg:p-7 border border-[#D0C6BB] shadow-[0_4px_24px_rgba(40,79,66,0.06)] space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#D0C6BB]/50 pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#284F42] text-white">
                    MEMBER ACCOUNT USAGE & VENUE FOOTPRINT DRILL-DOWN
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#FAF6F0] text-[#8B6E4E] border border-[#D0C6BB]">
                    행 클릭 시 구좌별 4대 부문 · 세부 영업장 · 1:N 카드 이용 내역 상세 펼침
                  </span>
                </div>
                <h2 className="text-xl font-black text-[#1B382E] mt-1.5 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-[#284F42]" />
                  분양회원 구좌별 실사용 현황 & 이용 영업장(객실·골프·식음·레저) 상세 분석
                </h2>
                <p className="text-xs text-[#5A6B63] mt-1">
                  각 분양회원 구좌가 실제로 몇 박을 소진했는지, 리조트 방문 시 어떤 영업장 부문(콘도 객실, 골프장, 식음 매장, 레저 시설)을 주로 이용하는지 회원별로 추적합니다.
                </p>
              </div>

              {/* 검색창 */}
              <div className="relative shrink-0">
                <Search className="w-4 h-4 text-[#5A6B63] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="회원명, 구좌번호, 카드번호 검색..."
                  value={memberLedgerSearch}
                  onChange={(e) => setMemberLedgerSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 text-xs rounded-xl border border-[#D0C6BB] bg-[#F4F3EE]/50 focus:bg-white focus:outline-none focus:border-[#284F42] w-full sm:w-64 font-medium"
                />
              </div>
            </div>

            {/* 비즈니스 세그먼트 필터 + 회원권 구분 필터 + 정렬 컨트롤 바 */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-[#F4F3EE]/70 p-3.5 rounded-2xl border border-[#D0C6BB]/60">
              {/* 비즈니스 세그먼트 필터 */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-[#1B382E] mr-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-[#B59269]" />
                  관리 타겟 필터:
                </span>
                {[
                  { id: 'ALL', label: `전체 분양구좌 (${rawVisitedLedger.length})` },
                  { id: 'HIGH_RISK', label: '🚨 반환 고위험 (<5% 극저소진)' },
                  { id: 'LOW_BURN', label: '⚠️ 박수 소진 저조 (<10% 독려대상)' },
                  { id: 'VIP_VISIT', label: '다회 방문 고만족 (연 10회+)' },
                  { id: 'MULTI_DEPT', label: '2개 부문+ 복합 만족' },
                  { id: 'GOLF_ACTIVE', label: '골프장 이용 회원' }
                ].map((seg) => (
                  <button
                    key={seg.id}
                    type="button"
                    onClick={() => setLedgerSegment(seg.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      ledgerSegment === seg.id
                        ? 'bg-[#284F42] text-white shadow-2xs'
                        : 'bg-white text-[#5A6B63] hover:text-[#1B382E] border border-[#D0C6BB]/60'
                    }`}
                  >
                    {seg.label}
                  </button>
                ))}
              </div>

              {/* 회원권 구분 필터 & 정렬 */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl text-xs font-semibold border border-[#D0C6BB]/60">
                  {['ALL', '법인', '기명', '무기명', '창립'].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setMemberLedgerFilter(f)}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        memberLedgerFilter === f
                          ? 'bg-[#1B382E] text-white font-bold'
                          : 'text-[#5A6B63] hover:text-[#1B382E]'
                      }`}
                    >
                      {f === 'ALL' ? '전체 구분' : f}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 bg-white p-1 rounded-xl text-xs font-semibold border border-[#D0C6BB]/60">
                  <ArrowUpDown className="w-3.5 h-3.5 text-[#B59269] ml-1.5" />
                  {[
                    { id: 'burnDesc', label: '박수 소진율순' },
                    { id: 'visitDesc', label: '방문횟수순' },
                    { id: 'expiryAsc', label: '보증금 만기임박순' },
                    { id: 'ltvDesc', label: '누적 이용액순' },
                    { id: 'periodDesc', label: '기간 이용액순' }
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setLedgerSort(s.id as any)}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        ledgerSort === s.id
                          ? 'bg-[#B59269] text-white font-bold'
                          : 'text-[#5A6B63] hover:text-[#1B382E]'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 분양회원 구좌별 실사용 & 이용 영업장 원장 테이블 (Expandable Drill-down) */}
            <div className="overflow-x-auto max-h-[620px] overflow-y-auto rounded-2xl border border-[#D0C6BB]/75">
              <table className="w-full border-collapse text-left text-sm font-financial min-w-[1080px]">
                <thead className="sticky top-0 z-10 bg-[#F4F3EE] shadow-2xs">
                  <tr className="border-b-2 border-[#1B382E] text-xs font-bold text-[#1B382E]">
                    <th className="py-3.5 px-3 text-center w-10">상세</th>
                    <th className="py-3.5 px-4 text-left">구좌번호 (1:N 카드·승계)</th>
                    <th className="py-3.5 px-4 text-left">회원명 (법인/개인)</th>
                    <th className="py-3.5 px-3 text-center">회원권 구분</th>
                    <th className="py-3.5 px-3 text-center">평형 (형태)</th>
                    <th className="py-3.5 px-3 text-right">연간 박수 소진 (부여/사용/잔여)</th>
                    <th className="py-3.5 px-3 text-right">연간 방문수</th>
                    <th className="py-3.5 px-4 text-left">이용 영업장 부문 (실사용 동선)</th>
                    <th className="py-3.5 px-4 text-right">조회기간 소비액</th>
                    <th className="py-3.5 px-4 text-right">연간 누적 통합 LTV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D0C6BB]/40">
                  {filteredVisitedLedger.length > 0 ? (
                    filteredVisitedLedger.map((m: any, idx: number) => {
                      const rowKey = String(m.membershipNo || m.certNo || idx);
                      const isExpanded = expandedMemberKey === rowKey;

                      const ytdRoom = Number(m.ytdRoomSpend || m.roomSpend || 0);
                      const ytdGolf = Number(m.ytdGolfSpend || m.golfSpend || 0);
                      const ytdFnb = Number(m.ytdFnbSpend || m.fnbSpend || 0);
                      const ytdLeisure = Number(m.ytdLeisureSpend || m.leisureSpend || 0);

                      const periodRoom = Number(m.periodRoomSpend || 0);
                      const periodGolf = Number(m.periodGolfSpend || 0);
                      const periodFnb = Number(m.periodFnbSpend || 0);
                      const periodLeisure = Number(m.periodLeisureSpend || 0);

                      const burnPct = Number(m.burnRatePct ?? 0);
                      const venueList: any[] = Array.isArray(m.venueBreakdown || m.venues)
                        ? (m.venueBreakdown || m.venues)
                        : [];
                      const cardList: any[] = Array.isArray(m.cardBreakdown || m.cards)
                        ? (m.cardBreakdown || m.cards)
                        : [];

                      return (
                        <Fragment key={rowKey}>
                          <tr
                            onClick={() => setExpandedMemberKey(isExpanded ? null : rowKey)}
                            className={`transition-colors cursor-pointer ${
                              isExpanded
                                ? 'bg-[#E8F2EE]/60'
                                : 'hover:bg-[#F4F3EE]/60'
                            }`}
                          >
                            <td className="py-3.5 px-3 text-center">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-white border border-[#D0C6BB] text-[#284F42]">
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-xs font-bold text-[#1B382E]">
                              <div>{m.membershipNo || m.certNo || '-'}</div>
                              <div className="flex flex-wrap gap-1 mt-1 font-sans">
                                {m.registeredCardCount != null && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#E8F2EE] text-[#1E523F] font-bold">
                                    발급카드 {m.registeredCardCount}매
                                  </span>
                                )}
                                {m.joinType && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F4F3EE] text-[#5A6B63] border border-[#D0C6BB]/60">
                                    {m.joinType}
                                  </span>
                                )}
                                {m.prevCertNo && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                    구:{m.prevCertNo}
                                  </span>
                                )}
                                {m.redemptionRiskGrade && (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                    m.redemptionRiskGrade === 'HIGH_RISK'
                                      ? 'bg-[#FDF0ED] text-[#8B2635] border border-[#EAC5BD]'
                                      : m.redemptionRiskGrade === 'CARE_NEEDED'
                                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                      : 'bg-[#E8F2EE] text-[#1E523F]'
                                  }`}>
                                    {m.redemptionRiskGrade === 'HIGH_RISK' ? '반환고위험' : m.redemptionRiskGrade === 'CARE_NEEDED' ? '케어대상' : '재연장유력'}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-black text-[#1B382E]">{m.memberName || '-'}</div>
                              <div className="text-[11px] text-[#5A6B63] mt-0.5">
                                최근방문: {m.lastVisitDate || m.visitDate || '-'}
                                {m.expiryDate && (
                                  <span className="ml-1.5 text-[#8B2635] font-semibold">
                                    · 만기: {m.expiryDate}{m.daysUntilExpiry != null ? ` (D-${m.daysUntilExpiry})` : ''}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-3 text-center whitespace-nowrap">
                              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#1B382E]/5 text-[#1B382E] border border-[#D0C6BB]/60">
                                {m.accountType || '-'}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-center whitespace-nowrap">
                              <span className="font-bold text-[#1B382E]">{m.roomType ? `${m.roomType}평` : '-'}</span>
                              {m.shareType && (
                                <span className="block text-[10px] text-[#5A6B63]">{m.shareType}</span>
                              )}
                            </td>
                            <td className="py-3.5 px-3 text-right whitespace-nowrap">
                              <div className="text-xs font-bold text-[#1B382E]">
                                {formatNum(m.quotaNights || 0)}박 중 <span className="text-[#1E523F]">{formatNum(m.usedNights || 0)}박</span> 사용
                              </div>
                              <div className="flex items-center justify-end gap-1.5 mt-1">
                                <span className="text-[10px] text-[#5A6B63]">잔여 {formatNum(m.remainingNights || 0)}박</span>
                                <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                                  burnPct >= 50
                                    ? 'bg-[#E8F2EE] text-[#1E523F]'
                                    : burnPct < 10
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                    : 'bg-[#F4F3EE] text-[#1B382E]'
                                }`}>
                                  {burnPct}%
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-3 text-right whitespace-nowrap">
                              <div className="font-black text-[#1B382E]">{formatNum(m.ytdVisitCount || 0)}회</div>
                              {Number(m.periodVisitCount || 0) > 0 && (
                                <div className="text-[10px] text-[#1E523F] font-semibold">
                                  (기간 내 {formatNum(m.periodVisitCount)}회)
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex flex-wrap gap-1">
                                {(ytdRoom > 0 || Number(m.usedNights || 0) > 0) && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]/60">
                                    🏨 콘도객실 {ytdRoom > 0 ? `${formatNum(ytdRoom)}원` : `${formatNum(m.usedNights)}박`}
                                  </span>
                                )}
                                {ytdGolf > 0 && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-[#284F42] text-white">
                                    ⛳ 골프CC {formatNum(ytdGolf)}원
                                  </span>
                                )}
                                {ytdFnb > 0 && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-[#FAF6F0] text-[#8B6E4E] border border-[#D0C6BB]">
                                    🍽️ 식음매장 {formatNum(ytdFnb)}원
                                  </span>
                                )}
                                {ytdLeisure > 0 && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-[#B59269]/15 text-[#7D5A38] border border-[#B59269]/30">
                                    🛷 레저시설 {formatNum(ytdLeisure)}원
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-[#1B382E] whitespace-nowrap">
                              {formatNum(m.periodTotalSpend || 0)}원
                            </td>
                            <td className="py-3.5 px-4 text-right font-black text-[#284F42] whitespace-nowrap">
                              {formatNum(m.totalLtv || m.ytdTotalSpend || 0)}원
                            </td>
                          </tr>

                          {/* 클릭 시 펼쳐지는 회원/구좌별 영업장 이용 상세 동선 & 1:N 카드 드릴다운 패널 */}
                          {isExpanded && (
                            <tr className="bg-[#FAF9F6] border-b-2 border-[#284F42]/30">
                              <td colSpan={10} className="p-5 lg:p-6">
                                <div className="space-y-5">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D0C6BB]/60 pb-3">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="px-2.5 py-1 rounded-lg bg-[#284F42] text-white text-xs font-black">
                                        구좌 상세 리포트: {m.membershipNo || m.certNo}
                                      </span>
                                      <h4 className="text-base font-black text-[#1B382E]">
                                        {m.memberName} ({m.accountType} · {m.roomType ? `${m.roomType}평` : '평형미상'}) 실사용 만족도 & 보증금 만기 관리
                                      </h4>
                                      {m.redemptionRiskGrade && (
                                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                                          m.redemptionRiskGrade === 'HIGH_RISK'
                                            ? 'bg-[#FDF0ED] text-[#8B2635] border border-[#EAC5BD]'
                                            : m.redemptionRiskGrade === 'CARE_NEEDED'
                                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                            : 'bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]'
                                        }`}>
                                          {m.redemptionRiskGrade === 'HIGH_RISK'
                                            ? '🚨 보증금 반환 고위험'
                                            : m.redemptionRiskGrade === 'CARE_NEEDED'
                                            ? '⚠️ 이용 독려 케어군'
                                            : '✅ 만기 재연장 유력'}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-[#5A6B63] flex flex-wrap items-center gap-3">
                                      <span>지정 회원번호: <strong className="text-[#1B382E] font-mono">{m.memberNo || '-'}</strong></span>
                                      <span>계약/만기일: <strong className="text-[#1B382E] font-mono">{m.contractDate || '-'} ~ {m.expiryDate || '-'}</strong>{m.daysUntilExpiry != null ? ` (D-${m.daysUntilExpiry})` : ''}</span>
                                      <span>분양보증금: <strong className="text-[#1B382E]">{m.depositAmt != null ? `${formatNum(m.depositAmt)}원` : '-'}</strong></span>
                                    </div>
                                  </div>

                                  {/* 4대 부문별(콘도·골프·식음·레저) 기간 vs 연간 누적 상세 비교 카드 */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                                    <div className="bg-white p-4 rounded-2xl border border-[#D0C6BB]/80 shadow-2xs">
                                      <div className="flex items-center justify-between text-xs font-bold text-[#1E523F]">
                                        <span className="flex items-center gap-1.5"><Hotel size={14} /> 콘도 객실 이용</span>
                                        <span>연간 {formatNum(m.usedNights || 0)}박 소진</span>
                                      </div>
                                      <div className="text-lg font-black text-[#1B382E] mt-1.5">
                                        연간 {formatNum(ytdRoom)}원
                                      </div>
                                      <div className="text-[11px] text-[#5A6B63] mt-1 flex items-center justify-between">
                                        <span>조회기간: {formatNum(periodRoom)}원 ({formatNum(m.periodUsedNights || 0)}박)</span>
                                        <span>잔여 {formatNum(m.remainingNights || 0)}박</span>
                                      </div>
                                    </div>

                                    <div className="bg-white p-4 rounded-2xl border border-[#D0C6BB]/80 shadow-2xs">
                                      <div className="flex items-center justify-between text-xs font-bold text-[#284F42]">
                                        <span className="flex items-center gap-1.5"><Flag size={14} /> 벨포레 골프CC 이용</span>
                                        <span>그린피·카트 정산</span>
                                      </div>
                                      <div className="text-lg font-black text-[#284F42] mt-1.5">
                                        연간 {formatNum(ytdGolf)}원
                                      </div>
                                      <div className="text-[11px] text-[#5A6B63] mt-1">
                                        조회기간 골프 소비: {formatNum(periodGolf)}원
                                      </div>
                                    </div>

                                    <div className="bg-white p-4 rounded-2xl border border-[#D0C6BB]/80 shadow-2xs">
                                      <div className="flex items-center justify-between text-xs font-bold text-[#8B6E4E]">
                                        <span className="flex items-center gap-1.5"><Utensils size={14} /> 식음(F&B) 영업장 이용</span>
                                        <span>직영·외주 F&B</span>
                                      </div>
                                      <div className="text-lg font-black text-[#1B382E] mt-1.5">
                                        연간 {formatNum(ytdFnb)}원
                                      </div>
                                      <div className="text-[11px] text-[#5A6B63] mt-1">
                                        조회기간 식음 소비: {formatNum(periodFnb)}원
                                      </div>
                                    </div>

                                    <div className="bg-white p-4 rounded-2xl border border-[#D0C6BB]/80 shadow-2xs">
                                      <div className="flex items-center justify-between text-xs font-bold text-[#B59269]">
                                        <span className="flex items-center gap-1.5"><Compass size={14} /> 레저·부대 영업장 이용</span>
                                        <span>카트·목장·사우나 등</span>
                                      </div>
                                      <div className="text-lg font-black text-[#1B382E] mt-1.5">
                                        연간 {formatNum(ytdLeisure)}원
                                      </div>
                                      <div className="text-[11px] text-[#5A6B63] mt-1">
                                        조회기간 레저 소비: {formatNum(periodLeisure)}원
                                      </div>
                                    </div>
                                  </div>

                                  {/* 세부 영업장(매장) 방문 내역 & 1:N 발급카드별 이용 내역 */}
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {/* 좌측: 세부 영업장별 방문·결제 내역 */}
                                    <div className="bg-white rounded-2xl p-4 border border-[#D0C6BB]/80 space-y-2.5">
                                      <div className="flex items-center justify-between">
                                        <h5 className="text-xs font-black text-[#1B382E] flex items-center gap-1.5">
                                          <Building2 size={14} className="text-[#284F42]" />
                                          회원 방문 세부 영업장(Shop) 이용 내역
                                        </h5>
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#E8F2EE] text-[#1E523F]">
                                          영업장 동선 추적
                                        </span>
                                      </div>
                                      {venueList.length > 0 ? (
                                        <div className="divide-y divide-[#D0C6BB]/40 text-xs">
                                          {venueList.map((v: any, vIdx: number) => (
                                            <div key={vIdx} className="py-2 flex items-center justify-between">
                                              <div>
                                                <span className="font-bold text-[#1B382E]">{v.venueName || v.shopName || '-'}</span>
                                                <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-[#F4F3EE] text-[#5A6B63]">
                                                  {v.category || v.divisionName || '영업장'}
                                                </span>
                                              </div>
                                              <div className="text-right">
                                                <span className="font-black text-[#284F42]">{formatNum(v.spendAmount || v.revenue || 0)}원</span>
                                                {v.visitCount != null && (
                                                  <span className="ml-2 text-[11px] text-[#5A6B63]">({formatNum(v.visitCount)}회)</span>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="text-xs text-[#5A6B63] bg-[#F4F3EE]/60 rounded-xl p-3 leading-relaxed">
                                          현재 구좌는 부문별 통합 원장(<strong>콘도 {formatNum(ytdRoom)}원 · 골프 {formatNum(ytdGolf)}원 · 식음 {formatNum(ytdFnb)}원 · 레저 {formatNum(ytdLeisure)}원</strong>)으로 집계되어 있습니다. 개별 매장명(브리스킷346, 마운틴카트 등) 단위 세부 배열(`venueBreakdown[]`)은 백엔드 <strong>Ticket 75</strong> 연동 시 자동 표출됩니다.
                                        </div>
                                      )}
                                    </div>

                                    {/* 우측: 16)분양회원 1:N 발급카드별 이용 내역 */}
                                    <div className="bg-white rounded-2xl p-4 border border-[#D0C6BB]/80 space-y-2.5">
                                      <div className="flex items-center justify-between">
                                        <h5 className="text-xs font-black text-[#1B382E] flex items-center gap-1.5">
                                          <CreditCard size={14} className="text-[#B59269]" />
                                          구좌 산하 1:N 발급 회원카드(본인·지정·임직원) 이용 현황
                                        </h5>
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#FAF6F0] text-[#8B6E4E] border border-[#D0C6BB]">
                                          16)분양회원 카드 매핑
                                        </span>
                                      </div>
                                      {cardList.length > 0 ? (
                                        <div className="divide-y divide-[#D0C6BB]/40 text-xs">
                                          {cardList.map((c: any, cIdx: number) => (
                                            <div key={cIdx} className="py-2 flex items-center justify-between">
                                              <div>
                                                <span className="font-mono font-bold text-[#1B382E]">{c.memberNo || c.cardNo || '-'}</span>
                                                <span className="ml-2 font-semibold text-[#1B382E]">{c.holderName || c.memberName || ''}</span>
                                                {c.cardRole && (
                                                  <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-[#E8F2EE] text-[#1E523F]">
                                                    {c.cardRole}
                                                  </span>
                                                )}
                                              </div>
                                              <div className="text-right font-bold text-[#1B382E]">
                                                {formatNum(c.spendAmount || c.totalSpend || 0)}원
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="text-xs text-[#5A6B63] bg-[#F4F3EE]/60 rounded-xl p-3 leading-relaxed">
                                          대표 회원카드(<strong className="text-[#1B382E] font-mono">{m.memberNo || m.membershipNo || '-'}</strong>) 및 구좌 산하 1:N 지정카드 이용 실적이 본 구좌 LTV(<strong>{formatNum(m.totalLtv || m.ytdTotalSpend || 0)}원</strong>)에 100% 통합 귀속되어 있습니다.
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-[#5A6B63]">
                        선택하신 필터 조건에 해당하는 분양회원 방문 구좌 내역이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 4: 골프장 분양회원 내장·동반 비회원 앵커 시너지 & 콘도 회원권 요금타입별 객실 실적 */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* 좌측 7컬럼: 골프장 분양회원 세부 유형별 내장 및 그린피 분석 */}
            <div className="xl:col-span-7 bg-white rounded-3xl p-6 lg:p-7 border border-[#D0C6BB] shadow-[0_4px_24px_rgba(40,79,66,0.06)] space-y-5">
              <div className="border-b border-[#D0C6BB]/60 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]/70">
                    GOLF MEMBERSHIP BREAKDOWN
                  </span>
                  <span className="text-xs text-[#5A6B63] font-mono">
                    API: /api/v6/report/golf-channel-intelligence
                  </span>
                </div>
                <h2 className="text-lg lg:text-xl font-black text-[#1B382E] mt-1.5 flex items-center gap-2">
                  <Flag className="w-5 h-5 text-[#284F42]" />
                  골프장 분양회원(법인 풀구좌 · 콘도 구좌) vs 비회원 내장 실적
                </h2>
              </div>

              {golfMembershipAnalysis && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-[#F4F3EE]/80 p-4 rounded-2xl border border-[#D0C6BB]/60 font-financial">
                  <div className="bg-white p-3.5 rounded-xl border border-[#D0C6BB]/60">
                    <div className="flex items-center justify-between text-xs text-[#5A6B63] font-bold">
                      <span>골프 회원 평균 그린피</span>
                      <span className="text-[#1E523F] bg-[#E8F2EE] px-2 py-0.5 rounded-full text-[10px]">
                        비중 {golfMembershipAnalysis.member?.playerRatio ?? 0}%
                      </span>
                    </div>
                    <div className="text-xl font-black text-[#284F42] mt-1">
                      {golfMembershipAnalysis.member?.avgGreenFeeFormatted || '0'}원
                    </div>
                    <div className="text-[11px] text-[#5A6B63] mt-1">
                      내장 {golfMembershipAnalysis.member?.playersFormatted || '0'}명 · {golfMembershipAnalysis.member?.greenFeeRevenueFormatted || '0'}원
                    </div>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-[#D0C6BB]/60">
                    <div className="flex items-center justify-between text-xs text-[#5A6B63] font-bold">
                      <span>비회원(Public) 평균 그린피</span>
                      <span className="text-[#5A6B63] bg-[#F4F3EE] px-2 py-0.5 rounded-full text-[10px]">
                        비중 {golfMembershipAnalysis.nonMember?.playerRatio ?? 0}%
                      </span>
                    </div>
                    <div className="text-xl font-black text-[#1B382E] mt-1">
                      {golfMembershipAnalysis.nonMember?.avgGreenFeeFormatted || '0'}원
                    </div>
                    <div className="text-[11px] text-[#5A6B63] mt-1">
                      내장 {golfMembershipAnalysis.nonMember?.playersFormatted || '0'}명 · {golfMembershipAnalysis.nonMember?.greenFeeRevenueFormatted || '0'}원
                    </div>
                  </div>

                  <div className="bg-[#284F42] text-white p-3.5 rounded-xl flex flex-col justify-between">
                    <div className="text-xs font-bold text-emerald-200">회원 1인당 그린피 우대 혜택</div>
                    <div className="text-xl font-black text-[#B59269] mt-1">
                      -{golfMembershipAnalysis.greenFeeGapFormatted || '0'}원
                    </div>
                    <div className="text-[11px] text-white/80 mt-1">
                      비회원가 대비 회원 평균 우대폭
                    </div>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto rounded-2xl border border-[#D0C6BB]/75">
                <table className="w-full border-collapse text-left text-sm font-financial">
                  <thead>
                    <tr className="border-b-2 border-[#1B382E] text-xs font-bold text-[#1B382E] bg-[#F4F3EE]">
                      <th className="py-3 px-4 text-left">회원권 구분</th>
                      <th className="py-3 px-3 text-right">라운딩 팀수</th>
                      <th className="py-3 px-3 text-right">내장 인원</th>
                      <th className="py-3 px-3 text-right">인원 점유율</th>
                      <th className="py-3 px-4 text-right">그린피 순매출</th>
                      <th className="py-3 px-4 text-right">1인 평균 그린피</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D0C6BB]/30">
                    {golfMemberBreakdown.map((item, idx) => {
                      const isBunyang = item.type !== 'PUBLIC';
                      return (
                        <tr
                          key={idx}
                          className={isBunyang ? 'bg-[#E8F2EE]/30 hover:bg-[#E8F2EE]/60' : 'hover:bg-[#F4F3EE]/50'}
                        >
                          <td className="py-3 px-4 font-black text-[#1B382E]">
                            <div className="flex items-center gap-2">
                              <span>{item.name}</span>
                              {isBunyang && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]/70">
                                  분양회원
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-[#1B382E]">
                            {formatNum(item.teams || 0)}팀 ({item.teamRatio ?? 0}%)
                          </td>
                          <td className="py-3 px-3 text-right font-black text-[#284F42]">
                            {formatNum(item.players || 0)}명
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-[#1E523F]">
                            {item.playerRatio ?? 0}%
                          </td>
                          <td className="py-3 px-4 text-right font-black text-[#1B382E]">
                            {formatNum(item.revenue || 0)}원
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-[#5A6B63]">
                            {formatNum(item.avgGreenFee || 0)}원
                          </td>
                        </tr>
                      );
                    })}
                    {golfMemberSummary && (
                      <tr className="bg-[#284F42] text-white font-bold">
                        <td className="py-3 px-4">분양회원 소계 (법인 + 콘도 구좌)</td>
                        <td className="py-3 px-3 text-right text-[#B59269]">
                          {formatNum(golfMemberSummary.totalBunyangTeams || 0)}팀 ({golfMemberSummary.totalBunyangRatio ?? 0}%)
                        </td>
                        <td className="py-3 px-3 text-right text-[#B59269]">
                          {formatNum(golfMemberSummary.totalBunyangPlayers || 0)}명
                        </td>
                        <td className="py-3 px-3 text-right text-[#B59269]">
                          {golfMemberSummary.totalBunyangPlayerRatio ?? 0}%
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-200">
                          {formatNum(golfMemberSummary.totalBunyangRevenue || 0)}원
                        </td>
                        <td className="py-3 px-4 text-right text-[#D0C6BB]">
                          분양회원 전용 집계
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 우측 5컬럼: 골프 회원 동반 비회원 유치(Anchor) 매출 기여도 */}
            <div className="xl:col-span-5 bg-white rounded-3xl p-6 lg:p-7 border border-[#D0C6BB] shadow-[0_4px_24px_rgba(40,79,66,0.06)] flex flex-col justify-between space-y-5">
              <div>
                <div className="border-b border-[#D0C6BB]/60 pb-4">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#B59269]/15 text-[#B59269] border border-[#B59269]/30">
                    MEMBER ANCHOR SYNERGY
                  </span>
                  <h2 className="text-lg lg:text-xl font-black text-[#1B382E] mt-1.5 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#B59269]" />
                    회원 동반 비회원 유치(Anchor) 매출 기여도
                  </h2>
                  <p className="text-xs text-[#5A6B63] mt-1">
                    분양회원이 라운딩 시 동반 유치한 비회원(정상가 결제)이 창출한 추가 그린피 매출입니다.
                  </p>
                </div>

                <div className="mt-4 bg-[#284F42] text-white p-5 rounded-2xl shadow-sm font-financial">
                  <div className="text-xs font-semibold text-emerald-200">
                    회원이 동반 유치한 비회원 그린피 창출액 (Anchor Revenue)
                  </div>
                  <div className="text-3xl font-black text-[#B59269] mt-1">
                    +{formatNum(golfMemberSynergy?.totalAnchorRevenue || 0)}원
                  </div>
                  <p className="text-[11px] text-white/80 mt-1">
                    회원 1~2인 포함 팀에서 동반 비회원(2~3인)이 지불한 순수 그린피 합계
                  </p>
                </div>

                {golfMemberSynergy && (
                  <div className="mt-4 space-y-2.5 font-financial">
                    <div className="p-3.5 rounded-2xl bg-[#E8F2EE] border border-[#B4C6C1]/70 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-[#1B382E]">회원 1명 + 비회원 3명 동반 팀</div>
                        <div className="text-[11px] text-[#5A6B63] mt-0.5">
                          총 <strong className="text-[#1B382E]">{formatNum(golfMemberSynergy.member1Non3?.teams || 0)}팀</strong> ({golfMemberSynergy.member1Non3?.ratio ?? 0}%)
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-[#1E523F] font-bold">동반 비회원 3인 매출</div>
                        <div className="text-sm font-black text-[#284F42]">
                          {formatNum(golfMemberSynergy.member1Non3?.nonMemberRevenue || 0)}원
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#F4F3EE] border border-[#D0C6BB]/70 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-[#1B382E]">회원 2명 + 비회원 2명 동반 팀</div>
                        <div className="text-[11px] text-[#5A6B63] mt-0.5">
                          총 <strong className="text-[#1B382E]">{formatNum(golfMemberSynergy.member2Non2?.teams || 0)}팀</strong> ({golfMemberSynergy.member2Non2?.ratio ?? 0}%)
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-[#284F42] font-bold">동반 비회원 2인 매출</div>
                        <div className="text-sm font-black text-[#1B382E]">
                          {formatNum(golfMemberSynergy.member2Non2?.nonMemberRevenue || 0)}원
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white border border-[#D0C6BB]/60 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-[#1B382E]">회원 3~4명 중심 팀</div>
                        <div className="text-[11px] text-[#5A6B63] mt-0.5">
                          총 <strong className="text-[#1B382E]">{formatNum(golfMemberSynergy.member3to4?.teams || 0)}팀</strong> ({golfMemberSynergy.member3to4?.ratio ?? 0}%)
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-[#5A6B63] font-semibold">팀 그린피 매출</div>
                        <div className="text-sm font-black text-[#1B382E]">
                          {formatNum(golfMemberSynergy.member3to4?.revenue || 0)}원
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 5: 콘도 회원권(기명·무기명) vs 일반 요금타입별 객실 판매 & ADR 비교 */}
          <div className="bg-white rounded-3xl p-6 lg:p-7 border border-[#D0C6BB] shadow-[0_4px_24px_rgba(40,79,66,0.06)] space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#D0C6BB]/50 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]/70">
                    CONDO RATE TYPE & MEMBER ROOM PERFORMANCE
                  </span>
                  <span className="text-xs text-[#5A6B63] font-mono">
                    API: /api/v6/report/room-rate-sales
                  </span>
                </div>
                <h2 className="text-lg lg:text-xl font-black text-[#1B382E] mt-1.5 flex items-center gap-2">
                  <Hotel className="w-5 h-5 text-[#284F42]" />
                  콘도 회원권(기명·무기명) vs 비회원 요금타입별 객실 판매량 및 ADR 비교
                </h2>
                <p className="text-xs text-[#5A6B63] mt-1">
                  기명회원({formatNum(memberRoomRow?.todayRooms || 0)}실 · {formatNum(memberRoomRow?.todayRevenue || 0)}원) 및 무기명회원({formatNum(bearerRoomRow?.todayRooms || 0)}실 · {formatNum(bearerRoomRow?.todayRevenue || 0)}원)의 객실 이용 비중과 평균 객단가(ADR)를 비교합니다.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-[#F4F3EE] p-1 rounded-xl border border-[#D0C6BB]/60 text-xs font-bold">
                  {[
                    { id: 'today', label: '조회기간' },
                    { id: 'mtd', label: '당월(MTD)' },
                    { id: 'ytd', label: '연간(YTD)' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setRatePeriodMode(m.id as any)}
                      className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                        ratePeriodMode === m.id
                          ? 'bg-[#284F42] text-white'
                          : 'text-[#5A6B63] hover:text-[#1B382E]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setShowLyColumns(!showLyColumns)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    showLyColumns
                      ? 'bg-[#1B382E] text-white border-[#1B382E]'
                      : 'bg-white text-[#5A6B63] border-[#D0C6BB] hover:text-[#1B382E]'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 inline mr-1" />
                  {showLyColumns ? '전년동기(LY) 숨기기' : '전년동기(LY) 컬럼 표시'}
                </button>
              </div>
            </div>

            {!loading && segmentRateRows.length > 0 && (
              <div className="bg-[#F4F3EE]/80 rounded-2xl p-4 border border-[#D0C6BB]/60">
                <div className="h-[280px] w-full">
                  <ReactECharts option={getCondoRateChartOption()} style={{ height: '100%', width: '100%' }} />
                </div>
              </div>
            )}

            <div className="overflow-x-auto rounded-2xl border border-[#D0C6BB]/75">
              <table className="w-full border-collapse text-left text-sm font-financial min-w-[1000px]">
                <thead>
                  <tr className="border-b-2 border-[#1B382E] text-xs font-bold text-[#1B382E] bg-[#F4F3EE]">
                    <th className="py-3 px-4 text-left">구분 (회원권 / 요금타입)</th>
                    <th className="py-3 px-3 text-center">분류</th>
                    <th className="py-3 px-4 text-right bg-[#E8F2EE]/50">조회기간 객실</th>
                    <th className="py-3 px-4 text-right bg-[#E8F2EE]/50">조회기간 순매출</th>
                    <th className="py-3 px-4 text-right bg-[#E8F2EE]/50">조회기간 ADR</th>
                    {(showLyColumns || hasLyData) && (
                      <>
                        <th className="py-3 px-4 text-right bg-[#FAF6F0]">전년동기(LY) 객실</th>
                        <th className="py-3 px-4 text-right bg-[#FAF6F0]">전년동기(LY) 매출</th>
                      </>
                    )}
                    <th className="py-3 px-4 text-right">당월(MTD) 객실</th>
                    <th className="py-3 px-4 text-right">당월(MTD) 매출</th>
                    <th className="py-3 px-4 text-right">연간(YTD) 객실</th>
                    <th className="py-3 px-4 text-right">연간(YTD) 매출</th>
                    <th className="py-3 px-4 text-right">연간(YTD) ADR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D0C6BB]/30">
                  {segmentRateRows.map((row, idx) => {
                    const rName = String(row.rateName || row.segmentName || '-');
                    const isMember = isMemberRateCategory(row);
                    const lyRooms = row.todayLyRooms ?? row.lyRoomsSold ?? null;
                    const lyRev = row.todayLyRevenue ?? row.lyTotalRevenue ?? null;

                    return (
                      <tr
                        key={idx}
                        className={isMember ? 'bg-[#E8F2EE]/30 hover:bg-[#E8F2EE]/60' : 'hover:bg-[#F4F3EE]/50'}
                      >
                        <td className={`py-3 px-4 whitespace-nowrap ${row.isSubRow ? 'pl-8 text-xs font-semibold text-[#5A6B63]' : 'font-black text-[#1B382E]'}`}>
                          {row.isSubRow && <span className="text-[#8C9E96] mr-1">↳</span>}
                          {rName}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {row.isSubRow ? (
                            <span className="text-[10px] text-[#8C9E96]">{row.roomType || row.pyungType || '평형별'}</span>
                          ) : isMember ? (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]/70">
                              회원·협약
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#F4F3EE] text-[#5A6B63] border border-[#D0C6BB]/60">
                              일반·비회원
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-[#1B382E] bg-[#E8F2EE]/20 whitespace-nowrap">
                          {formatNum(row.todayRooms || 0)}실
                        </td>
                        <td className="py-3 px-4 text-right font-black text-[#284F42] bg-[#E8F2EE]/20 whitespace-nowrap">
                          {formatNum(row.todayRevenue || 0)}원
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-[#5A6B63] bg-[#E8F2EE]/20 whitespace-nowrap">
                          {Number(row.todayAdr || 0) > 0 ? `${formatNum(row.todayAdr)}원` : '-'}
                        </td>
                        {(showLyColumns || hasLyData) && (
                          <>
                            <td className="py-3 px-4 text-right text-[#5A6B63] bg-[#FAF6F0]/50 whitespace-nowrap">
                              {lyRooms !== null ? `${formatNum(lyRooms)}실` : '-'}
                            </td>
                            <td className="py-3 px-4 text-right text-[#5A6B63] bg-[#FAF6F0]/50 whitespace-nowrap">
                              {lyRev !== null ? `${formatNum(lyRev)}원` : '-'}
                            </td>
                          </>
                        )}
                        <td className="py-3 px-4 text-right font-semibold text-[#1B382E] whitespace-nowrap">
                          {formatNum(row.mtdRooms || 0)}실
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-[#1B382E] whitespace-nowrap">
                          {formatNum(row.mtdRevenue || 0)}원
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-[#1B382E] whitespace-nowrap">
                          {formatNum(row.ytdRooms || 0)}실
                        </td>
                        <td className="py-3 px-4 text-right font-black text-[#284F42] whitespace-nowrap">
                          {formatNum(row.ytdRevenue || 0)}원
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-[#5A6B63] whitespace-nowrap">
                          {Number(row.ytdAdr || 0) > 0 ? `${formatNum(row.ytdAdr)}원` : '-'}
                        </td>
                      </tr>
                    );
                  })}

                  {grandTotalRoomRow && (
                    <tr className="bg-[#284F42] text-white font-bold border-t-2 border-[#1B382E]">
                      <td className="py-3.5 px-4 whitespace-nowrap">전체 객실 총합계</td>
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-white/15 text-emerald-200">공식 합계</span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-emerald-200 whitespace-nowrap">
                        {formatNum(grandTotalRoomRow.todayRooms || 0)}실
                      </td>
                      <td className="py-3.5 px-4 text-right text-emerald-200 whitespace-nowrap">
                        {formatNum(grandTotalRoomRow.todayRevenue || 0)}원
                      </td>
                      <td className="py-3.5 px-4 text-right text-white whitespace-nowrap">
                        {formatNum(grandTotalRoomRow.todayAdr || 0)}원
                      </td>
                      {(showLyColumns || hasLyData) && (
                        <>
                          <td className="py-3.5 px-4 text-right text-[#D0C6BB] whitespace-nowrap">
                            {(grandTotalRoomRow.todayLyRooms ?? grandTotalRoomRow.lyRoomsSold) != null
                              ? `${formatNum(grandTotalRoomRow.todayLyRooms ?? grandTotalRoomRow.lyRoomsSold)}실`
                              : '-'}
                          </td>
                          <td className="py-3.5 px-4 text-right text-[#D0C6BB] whitespace-nowrap">
                            {(grandTotalRoomRow.todayLyRevenue ?? grandTotalRoomRow.lyTotalRevenue) != null
                              ? `${formatNum(grandTotalRoomRow.todayLyRevenue ?? grandTotalRoomRow.lyTotalRevenue)}원`
                              : '-'}
                          </td>
                        </>
                      )}
                      <td className="py-3.5 px-4 text-right text-white whitespace-nowrap">
                        {formatNum(grandTotalRoomRow.mtdRooms || 0)}실
                      </td>
                      <td className="py-3.5 px-4 text-right text-white whitespace-nowrap">
                        {formatNum(grandTotalRoomRow.mtdRevenue || 0)}원
                      </td>
                      <td className="py-3.5 px-4 text-right text-[#B59269] whitespace-nowrap">
                        {formatNum(grandTotalRoomRow.ytdRooms || 0)}실
                      </td>
                      <td className="py-3.5 px-4 text-right text-[#B59269] whitespace-nowrap">
                        {formatNum(grandTotalRoomRow.ytdRevenue || 0)}원
                      </td>
                      <td className="py-3.5 px-4 text-right text-white whitespace-nowrap">
                        {formatNum(grandTotalRoomRow.ytdAdr || 0)}원
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================================== */}
      {/* TAB 2: 기업 휴양소(B2B 협약 회원사) 정산 & 재방문 원장 */}
      {/* ===================================================================================== */}
      {activeMainTab === 'corporate' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 lg:p-7 border border-[#D0C6BB] shadow-[0_4px_24px_rgba(40,79,66,0.06)] space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#D0C6BB]/40 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#1B382E]/5 text-[#1B382E] border border-[#D0C6BB]/60">
                    CORPORATE RETREAT & REPEAT MEMBER GROUPS
                  </span>
                  <span className="text-xs text-[#5A6B63] font-mono">
                    API: /api/v6/report/corporate-group-sales
                  </span>
                </div>
                <h2 className="text-xl font-black text-[#1B382E] mt-1.5 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-[#B59269]" />
                  기업 휴양소(B2B 협약 회원사) 정산 상태 및 다회 재방문 원장
                </h2>
                <p className="text-xs text-[#5A6B63] mt-1">
                  기업 하계/연중 휴양소 계약 회원사(`CORP_FIT`)의 정산 완료 수납액, 후정산 청구 대기 건수 및 협약 계약 총가치(발생주의)를 관리합니다.
                </p>
              </div>

              {corpFitSummary && (
                <div className="flex flex-wrap items-center gap-3 font-financial">
                  <div className="bg-[#F4F3EE] border border-[#D0C6BB]/60 px-4 py-2 rounded-2xl text-xs">
                    <span className="text-[#5A6B63] font-semibold block">기업 휴양소 이용</span>
                    <strong className="text-[#1B382E] text-sm">
                      {formatNum(corpFitSummary.groupsCount || 0)}건 · {formatNum(corpFitSummary.roomsCount || 0)}실 ({formatNum(corpFitSummary.totalPax || 0)}명)
                    </strong>
                  </div>
                  <div className="bg-[#E8F2EE] border border-[#B4C6C1]/70 px-4 py-2 rounded-2xl text-xs">
                    <span className="text-[#1E523F] font-semibold block">정산 완료 실매출</span>
                    <strong className="text-[#1B382E] text-sm">
                      {corpFitSummary.totalRevenueFormatted || formatNum(corpFitSummary.totalRevenue || 0)}원
                    </strong>
                    <span className="text-[10px] text-[#1E523F]/80 block font-normal mt-0.5">
                      ({formatNum(completedCorpCount)}건 수납 완료)
                    </span>
                  </div>
                  <div className="bg-[#FFF8E6] border border-[#F5C26B]/50 px-4 py-2 rounded-2xl text-xs">
                    <span className="text-[#B57C1E] font-semibold block">후정산 청구 대기</span>
                    <strong className="text-[#8C5D0D] text-sm">
                      {formatNum(pendingCorpCount)}건 (외상 후불)
                    </strong>
                    <span className="text-[10px] text-[#8C5D0D]/80 block font-normal mt-0.5">
                      사후 월정산/계산서 청구 전
                    </span>
                  </div>
                  <div className="bg-[#F4F1EA] border border-[#B59269]/40 px-4 py-2 rounded-2xl text-xs">
                    <span className="text-[#7D5A38] font-semibold block">협약 계약 총가치</span>
                    <strong className="text-[#1B382E] text-sm">
                      {corpFitSummary.contractRevenueFormatted || formatNum(corpFitSummary.contractRevenue || 0)}원
                    </strong>
                    <span className="text-[10px] text-[#7D5A38]/80 block font-normal mt-0.5">
                      발생주의: {corpFitSummary.accrualRevenueFormatted || formatNum(corpFitSummary.accrualRevenue || 0)}원
                    </span>
                  </div>
                  <div className="bg-[#B59269]/10 border border-[#B59269]/30 px-4 py-2 rounded-2xl text-xs">
                    <span className="text-[#B59269] font-semibold block">재방문 단골 단체</span>
                    <strong className="text-[#1B382E] text-sm">
                      {formatNum(corpSummary?.repeatGroupsCount || 0)}곳 (재방문율 {corpSummary?.repeatGroupRate ?? 0}%)
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {/* 필터 탭 & 검색 & 정렬 컨트롤 바 */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F4F3EE]/60 p-3.5 rounded-2xl border border-[#D0C6BB]/50">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-[#1B382E] mr-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-[#B59269]" />
                  정산 상태 필터:
                </span>
                <button
                  type="button"
                  onClick={() => setCorpFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    corpFilter === 'ALL'
                      ? 'bg-[#1B382E] text-white shadow-2xs'
                      : 'bg-white text-[#5A6B63] hover:bg-[#E8F2EE] border border-[#D0C6BB]/60'
                  }`}
                >
                  전체 ({formatNum(corpFitSummary?.groupsCount || baseMemberCorpGroups.length)}건)
                </button>
                <button
                  type="button"
                  onClick={() => setCorpFilter('COMPLETED')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                    corpFilter === 'COMPLETED'
                      ? 'bg-[#1E523F] text-white shadow-2xs'
                      : 'bg-white text-[#1E523F] hover:bg-[#E8F2EE] border border-[#1E523F]/30'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  정산 완료 ({formatNum(completedCorpCount)}건 / {corpFitSummary?.totalRevenueFormatted || '4.5억'}원)
                </button>
                <button
                  type="button"
                  onClick={() => setCorpFilter('PENDING')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                    corpFilter === 'PENDING'
                      ? 'bg-[#B57C1E] text-white shadow-2xs'
                      : 'bg-white text-[#B57C1E] hover:bg-[#FFF8E6] border border-[#B57C1E]/30'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  후정산 청구 대기 ({formatNum(pendingCorpCount)}건)
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#5A6B63] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="기업/휴양소 회원사 검색..."
                    value={corpSearch}
                    onChange={(e) => setCorpSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#D0C6BB] bg-white focus:outline-none focus:border-[#284F42] w-48"
                  />
                </div>

                <div className="flex items-center rounded-xl bg-white border border-[#D0C6BB]/60 p-1 text-xs font-semibold">
                  <ArrowUpDown className="w-3.5 h-3.5 text-[#B59269] mx-1.5" />
                  {[
                    { id: 'rooms', label: '객실수 순' },
                    { id: 'revenue', label: '실수납 매출순' },
                    { id: 'contract', label: '협약 계약순' },
                    { id: 'date', label: '최신 이용 순' }
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setCorpSort(s.id as any)}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        corpSort === s.id ? 'bg-[#1B382E] text-white font-bold' : 'text-[#5A6B63] hover:text-[#1B382E]'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 기업 휴양소 원장 테이블 */}
            <div className="overflow-x-auto max-h-[540px] overflow-y-auto rounded-2xl border border-[#D0C6BB]/75">
              <table className="w-full border-collapse text-left text-sm font-financial min-w-[950px]">
                <thead className="sticky top-0 z-10 bg-[#F4F3EE]">
                  <tr className="border-b-2 border-[#1B382E] text-xs font-bold text-[#1B382E]">
                    <th className="py-3.5 px-4 text-left">입실일 ~ 퇴실일</th>
                    <th className="py-3.5 px-4 text-left">법인 / 휴양소 협약 회원사명</th>
                    <th className="py-3.5 px-3 text-center">회원사 분류</th>
                    <th className="py-3.5 px-3 text-center">결제/정산 상태</th>
                    <th className="py-3.5 px-3 text-right">객실수 (평형)</th>
                    <th className="py-3.5 px-3 text-right">투숙 인원</th>
                    <th className="py-3.5 px-4 text-right">객실 매출 (계약가)</th>
                    <th className="py-3.5 px-4 text-right">1인당 단가</th>
                    <th className="py-3.5 px-4 text-right">통합 발생 매출</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D0C6BB]/30">
                  {memberCorpGroups.length > 0 ? (
                    memberCorpGroups.slice(0, 100).map((g, idx) => (
                      <tr key={idx} className="hover:bg-[#F4F3EE]/50 transition-colors">
                        <td className="py-3 px-4 text-[#5A6B63] whitespace-nowrap">
                          {g.checkInDate || '-'}
                          {g.stayDays ? (
                            <span className="text-[11px] text-[#5A6B63]/70 ml-1">({g.stayDays}박)</span>
                          ) : null}
                        </td>
                        <td className="py-3 px-4 font-extrabold text-[#1B382E] whitespace-nowrap">
                          <div>
                            {g.groupName || g.corporateName || '-'}
                            <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-normal mt-0.5">
                              {g.organizationTotalRevenue > 0 && (
                                <span className="text-[#1E523F]">
                                  (누적 수납: {formatNum(g.organizationTotalRevenue)}원 · {g.organizationTotalRooms || 0}실)
                                </span>
                              )}
                              {g.organizationContractRevenue > 0 && g.organizationContractRevenue !== g.organizationTotalRevenue && (
                                <span className="text-[#7D5A38]">
                                  · 계약: {formatNum(g.organizationContractRevenue)}원
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#1B382E]/5 text-[#1B382E] border border-[#D0C6BB]/60">
                            {g.categoryName || g.b2bSegmentName || '기업 임직원 휴양소'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {g.settlementStatus === 'COMPLETED' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              정산완료 ({g.paymentMethod || '수납'})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
                              <Clock className="w-3 h-3 text-amber-600" />
                              후정산 대기 ({g.paymentMethod || '후불'})
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-[#1B382E] whitespace-nowrap">
                          {formatNum(g.spendingBreakdown?.roomsCount || 0)}실
                          {g.spendingBreakdown?.roomTypesUsed?.length > 0 && (
                            <span className="text-[11px] text-[#5A6B63] ml-1">
                              ({g.spendingBreakdown.roomTypesUsed.join(', ')})
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right text-[#5A6B63] whitespace-nowrap">
                          {g.paxCountFormatted || formatNum(g.paxCount || 0)}명
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-[#1B382E] whitespace-nowrap">
                          <div>
                            {g.settlementStatus === 'COMPLETED' ? (
                              <>
                                <span>{formatNum(g.spendingBreakdown?.roomRevenue || 0)}원</span>
                                {g.contractRevenue && g.contractRevenue !== g.spendingBreakdown?.roomRevenue ? (
                                  <span className="block text-[10px] text-[#5A6B63] font-normal">
                                    (계약: {g.contractRevenueFormatted || formatNum(g.contractRevenue)}원)
                                  </span>
                                ) : null}
                              </>
                            ) : (
                              <>
                                <span className="text-amber-800">
                                  {g.contractRevenueFormatted || formatNum(g.contractRevenue || 0)}원
                                </span>
                                <span className="block text-[10px] text-amber-700 font-normal">
                                  (청구대기 · 계약ADR {g.contractAdrFormatted || formatNum(g.contractAdr || 0)}원)
                                </span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-[#5A6B63] whitespace-nowrap">
                          {formatNum(g.avgSpendPerPax || 0)}원
                        </td>
                        <td className="py-3 px-4 text-right font-extrabold text-[#1E523F] whitespace-nowrap">
                          <div>
                            {g.settlementStatus === 'COMPLETED' ? (
                              <span>{g.totalRevenueFormatted || formatNum(g.totalRevenue || 0)}원</span>
                            ) : (
                              <>
                                <span className="text-amber-900">
                                  {g.accrualRevenueFormatted || formatNum(g.accrualRevenue || g.totalRevenue || 0)}원
                                </span>
                                <span className="block text-[10px] text-amber-700 font-normal">
                                  (발생주의 계약가)
                                </span>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-[#5A6B63]">
                        선택하신 정산 상태 또는 검색어에 해당하는 기업 휴양소 협약 회원사 데이터가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-[#F4F3EE]/90 border border-[#D0C6BB]/75 rounded-2xl p-4 flex items-start gap-3 text-xs text-[#5A6B63] leading-relaxed">
              <Info className="w-5 h-5 text-[#B59269] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="text-[#1B382E] font-bold block text-sm">
                  💡 기업 휴양소(협약 회원사) 정산 상태 및 계약 가치(발생주의) 집계 기준
                </strong>
                <p>
                  기업 하계/연중 휴양소(서원대학교, 한양대학교, 현대제철, 베네피아 등)는 기업 본사/총무팀 및 제휴 복지몰과 <strong>사후 월정산/시즌정산(B2B 외상 후불 청구)</strong>으로 일괄 정산됩니다. 전체 {formatNum(corpFitSummary?.groupsCount || 0)}건 중 <strong>{formatNum(completedCorpCount)}건({corpFitSummary?.totalRevenueFormatted || formatNum(corpFitSummary?.totalRevenue || 0)}원)이 수납 완료</strong>되었으며, <strong>{formatNum(pendingCorpCount)}건</strong>은 확정 협약 단가 기준 발생주의 계약 가치로 관리됩니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
