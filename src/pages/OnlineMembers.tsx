import { useState, useEffect, useMemo } from 'react';
import { useDate } from '../contexts/DateContext';
import { getLatestClosedDateStr } from '../lib/dateUtils';
import { secureFetcher } from '../lib/secureFetcher';
import GlobalDatePicker from '../components/GlobalDatePicker';
import {
  Users,
  TrendingUp,
  UserPlus,
  RefreshCw,
  Activity,
  CalendarDays,
  PieChart,
  TableProperties,
  BarChart3,
  Search,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  MapPin,
  MailCheck,
  Sparkles,
  Clock,
  ShoppingBag,
  Award
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

const formatCurrency = (val: any) => {
  if (val === null || val === undefined || val === '') return '0';
  const num = typeof val === 'string' ? Number(val.replace(/,/g, '')) : Number(val);
  return isNaN(num) ? '0' : new Intl.NumberFormat('ko-KR').format(Math.round(num));
};

export default function OnlineMembers() {
  const { startDate, endDate, isRange } = useDate();
  const [data, setData] = useState<any>(null);
  const [dormancyIntel, setDormancyIntel] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 1. 가입자 변화 추세 3단 타임라인 탭 ('daily' | 'monthly' | 'yearly')
  const [trendTab, setTrendTab] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [dailySortMode, setDailySortMode] = useState<'dateDesc' | 'dateAsc' | 'joinedDesc'>('dateDesc');
  const [dailyChannelHighlight, setDailyChannelHighlight] = useState<'ALL' | 'TICKET' | 'ROOM' | 'GOLF'>('ALL');
  const [monthlyViewMode, setMonthlyViewMode] = useState<'both' | 'table' | 'chart'>('both');

  // 2. Win-back 핀셋 타겟 필터 & 정렬 & 검색
  const [winbackTierFilter, setWinbackTierFilter] = useState<'ALL' | 'LOYAL' | 'REGULAR'>('ALL');
  const [winbackChannelFilter, setWinbackChannelFilter] = useState<string>('ALL');
  const [winbackConsentFilter, setWinbackConsentFilter] = useState<'ALL' | 'SMS_Y'>('ALL');
  const [winbackSortMode, setWinbackSortMode] = useState<'bookingsDesc' | 'dormantDesc' | 'recentActivity'>('bookingsDesc');
  const [winbackSearch, setWinbackSearch] = useState<string>('');

  // 3. 최근 가입/활동 회원 검색 & 채널 필터
  const [recentChannelFilter, setRecentChannelFilter] = useState<string>('ALL');
  const [recentSearch, setRecentSearch] = useState<string>('');

  // 4. 온라인 회원 인기 구매 상품 카테고리 필터
  const [popularCategoryFilter, setPopularCategoryFilter] = useState<'ALL' | 'TICKET' | 'ROOM' | 'GOLF' | 'PACKAGE'>('ALL');

  const isRangeMode = Boolean(endDate && startDate !== endDate);

  const fetchOnlineMembers = async () => {
    setLoading(true);
    try {
      const queryParams = isRangeMode
        ? `startDate=${startDate}&endDate=${endDate}&date=${endDate}`
        : `startDate=${startDate}&endDate=${startDate}&date=${startDate}`;

      const [res, dormancyRes] = await Promise.all([
        secureFetcher(`${API_BASE}/api/v6/report/online-members?${queryParams}`).catch(() => null),
        secureFetcher(`${API_BASE}/api/v6/report/online-member-dormancy?${queryParams}`).catch(() => null)
      ]);
      const payload = res?.data ?? res;
      setData(payload || null);
      if (dormancyRes && (dormancyRes.summary || dormancyRes.data)) {
        setDormancyIntel(dormancyRes.data || dormancyRes);
      } else {
        setDormancyIntel(null);
      }
    } catch (err) {
      console.error('Online Members Fetch Error:', err);
      setData(null);
      setDormancyIntel(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startDate) {
      fetchOnlineMembers();
    }
  }, [startDate, endDate, isRange]);

  const summary = data?.summary || {};
  const dailyTrends: any[] = Array.isArray(data?.dailyTrends)
    ? data.dailyTrends
    : Array.isArray(data?.trends?.daily)
      ? data.trends.daily
      : [];
  const monthlyTrends: any[] = Array.isArray(data?.monthlyTrends)
    ? data.monthlyTrends
    : Array.isArray(data?.trends?.monthly)
      ? data.trends.monthly
      : [];
  const yearlyTrends: any[] = Array.isArray(data?.yearlyTrends)
    ? data.yearlyTrends
    : Array.isArray(data?.trends?.yearly)
      ? data.trends.yearly
      : [];
  const demographics = data?.demographics || dormancyIntel?.demographics || null;
  const channelBreakdown = data?.channelBreakdown || {};
  const recentMembers: any[] = Array.isArray(data?.recentMembers) ? data.recentMembers : [];
  const purchaseConversion = data?.purchaseConversionFunnel || null;
  const popularProducts: any[] = Array.isArray(data?.popularProducts) ? data.popularProducts : [];
  const popularVenues: any[] = Array.isArray(data?.popularVenues) ? data.popularVenues : [];
  const peakJoinSeasonality = data?.peakJoinSeasonality || null;

  const filteredPopularProducts = useMemo(() => {
    if (popularCategoryFilter === 'ALL') return popularProducts;
    return popularProducts.filter(
      (p) => String(p.category || '').toUpperCase() === popularCategoryFilter
    );
  }, [popularProducts, popularCategoryFilter]);

  const effectiveRefDate = (isRangeMode && endDate ? endDate : startDate) || getLatestClosedDateStr();
  const currentYearStr = effectiveRefDate.slice(0, 4);
  const prevYearStr = String(Number(currentYearStr) - 1);
  const currentMonthNum = parseInt(effectiveRefDate.slice(5, 7), 10);

  // 일별 테이블 정렬 및 필터
  const sortedDailyRows = useMemo(() => {
    const rows = [...dailyTrends];
    if (dailySortMode === 'dateDesc') {
      return rows.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    }
    if (dailySortMode === 'dateAsc') {
      return rows.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
    }
    return rows.sort((a, b) => {
      const aVal =
        dailyChannelHighlight === 'TICKET'
          ? Number(a.ticketJoined || 0)
          : dailyChannelHighlight === 'ROOM'
            ? Number(a.roomJoined || 0)
            : dailyChannelHighlight === 'GOLF'
              ? Number(a.golfJoined || 0)
              : Number(a.joined || 0);
      const bVal =
        dailyChannelHighlight === 'TICKET'
          ? Number(b.ticketJoined || 0)
          : dailyChannelHighlight === 'ROOM'
            ? Number(b.roomJoined || 0)
            : dailyChannelHighlight === 'GOLF'
              ? Number(b.golfJoined || 0)
              : Number(b.joined || 0);
      return bVal - aVal;
    });
  }, [dailyTrends, dailySortMode, dailyChannelHighlight]);

  // Win-back 타겟 필터 및 정렬
  const rawWinbackTargets: any[] = Array.isArray(dormancyIntel?.winbackTargets)
    ? dormancyIntel.winbackTargets
    : Array.isArray(dormancyIntel?.winbackLedger)
      ? dormancyIntel.winbackLedger
      : [];

  const filteredWinbackTargets = useMemo(() => {
    const q = winbackSearch.trim().toLowerCase();
    return rawWinbackTargets
      .filter((t) => {
        if (winbackTierFilter !== 'ALL' && t.tierCode !== winbackTierFilter) return false;
        if (winbackChannelFilter !== 'ALL') {
          const ch = String(t.channelSource || t.firstChannel || '').toUpperCase();
          if (ch !== winbackChannelFilter) return false;
        }
        if (winbackConsentFilter === 'SMS_Y' && t.smsConsent !== 'Y') return false;
        if (q) {
          const matchName = String(t.custName || '').toLowerCase().includes(q);
          const matchId = String(t.onlineId || '').toLowerCase().includes(q);
          const matchPhone = String(t.maskedPhone || t.phone || '').toLowerCase().includes(q);
          const matchRegion = String(t.regionSido || '').toLowerCase().includes(q);
          if (!matchName && !matchId && !matchPhone && !matchRegion) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (winbackSortMode === 'dormantDesc') {
          return Number(b.dormantDays || 0) - Number(a.dormantDays || 0);
        }
        if (winbackSortMode === 'recentActivity') {
          return String(b.lastActivityDate || '').localeCompare(String(a.lastActivityDate || ''));
        }
        return Number(b.totalBookings || 0) - Number(a.totalBookings || 0);
      });
  }, [rawWinbackTargets, winbackTierFilter, winbackChannelFilter, winbackConsentFilter, winbackSortMode, winbackSearch]);

  // 최근 가입/활동 회원 필터
  const filteredRecentMembers = useMemo(() => {
    const q = recentSearch.trim().toLowerCase();
    return recentMembers.filter((m) => {
      if (recentChannelFilter !== 'ALL') {
        const ch = String(m.firstChannel || m.channelSource || '').toUpperCase();
        if (ch !== recentChannelFilter) return false;
      }
      if (q) {
        const matchName = String(m.custName || '').toLowerCase().includes(q);
        const matchPhone = String(m.phone || '').toLowerCase().includes(q);
        const matchId = String(m.onlineId || '').toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchId) return false;
      }
      return true;
    });
  }, [recentMembers, recentChannelFilter, recentSearch]);

  // ECharts: 일별 신규 가입(채널별 스택) vs 전년 동요일 가입 & 일일 실활동(DAU)
  const dailyChartOptions = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    legend: { top: 0, textStyle: { color: '#5A6B63', fontSize: 11 } },
    grid: { top: '16%', left: '3%', right: '3%', bottom: '6%', containLabel: true },
    xAxis: {
      type: 'category',
      data: dailyTrends.map((d: any) => String(d.date || '').slice(5)),
      axisLine: { lineStyle: { color: '#D0C6BB' } },
      axisLabel: { color: '#5A6B63', fontSize: 11 }
    },
    yAxis: [
      {
        type: 'value',
        name: '일별 신규 가입 (명)',
        position: 'left',
        splitLine: { lineStyle: { type: 'dashed', color: '#E5E0D8' } },
        axisLabel: { color: '#5A6B63' },
        nameTextStyle: { color: '#5A6B63', fontSize: 10 }
      },
      {
        type: 'value',
        name: '실활동 DAU (명)',
        position: 'right',
        splitLine: { show: false },
        axisLabel: { color: '#284F42', fontWeight: 'bold' },
        nameTextStyle: { color: '#284F42', fontSize: 10 }
      }
    ],
    series: [
      {
        name: '티켓 가입',
        type: 'bar',
        stack: 'JoinedTotal',
        itemStyle: { color: '#B59269', opacity: dailyChannelHighlight === 'ALL' || dailyChannelHighlight === 'TICKET' ? 1 : 0.25 },
        data: dailyTrends.map((d: any) => d.ticketJoined || 0)
      },
      {
        name: '객실 가입',
        type: 'bar',
        stack: 'JoinedTotal',
        itemStyle: { color: '#5F8D7B', opacity: dailyChannelHighlight === 'ALL' || dailyChannelHighlight === 'ROOM' ? 1 : 0.25 },
        data: dailyTrends.map((d: any) => d.roomJoined || 0)
      },
      {
        name: '골프 가입',
        type: 'bar',
        stack: 'JoinedTotal',
        itemStyle: { color: '#284F42', borderRadius: [4, 4, 0, 0], opacity: dailyChannelHighlight === 'ALL' || dailyChannelHighlight === 'GOLF' ? 1 : 0.25 },
        data: dailyTrends.map((d: any) => d.golfJoined || 0)
      },
      {
        name: '전년 동요일 가입',
        type: 'line',
        yAxisIndex: 0,
        smooth: true,
        symbolSize: 5,
        itemStyle: { color: '#8B2635' },
        lineStyle: { width: 2, type: 'dashed' },
        data: dailyTrends.map((d: any) => d.lyJoined ?? 0)
      },
      {
        name: '일일 실활동(DAU)',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        symbolSize: 6,
        itemStyle: { color: '#1B382E' },
        lineStyle: { width: 2.5 },
        data: dailyTrends.map((d: any) => d.active || 0)
      }
    ]
  };

  // ECharts: 월별 신규 가입 (당해 vs 전년 동월)
  const monthlyChartOptions = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { top: 0, textStyle: { color: '#5A6B63', fontSize: 11 } },
    grid: { top: '16%', left: '3%', right: '3%', bottom: '6%', containLabel: true },
    xAxis: {
      type: 'category',
      data: Array.from({ length: 12 }, (_, i) => `${i + 1}월`),
      axisLine: { lineStyle: { color: '#D0C6BB' } },
      axisLabel: { color: '#1B382E', fontWeight: 'bold' }
    },
    yAxis: [
      {
        type: 'value',
        name: '월간 가입자 (명)',
        position: 'left',
        splitLine: { lineStyle: { type: 'dashed', color: '#E5E0D8' } },
        axisLabel: { color: '#5A6B63' }
      },
      {
        type: 'value',
        name: '전년비 증감률 (%)',
        position: 'right',
        splitLine: { show: false },
        axisLabel: { color: '#B59269', formatter: '{value}%' }
      }
    ],
    series: [
      {
        name: `${prevYearStr}년 가입자`,
        type: 'bar',
        barGap: '15%',
        itemStyle: { color: '#D0C6BB', borderRadius: [4, 4, 0, 0] },
        data: Array.from({ length: 12 }, (_, i) => {
          const moStr = i + 1 < 10 ? `0${i + 1}` : `${i + 1}`;
          const item = monthlyTrends.find((m: any) => String(m.month || '').endsWith(moStr));
          return item?.lyJoined ?? 0;
        })
      },
      {
        name: `${currentYearStr}년 가입자`,
        type: 'bar',
        itemStyle: { color: '#284F42', borderRadius: [4, 4, 0, 0] },
        data: Array.from({ length: 12 }, (_, i) => {
          const moStr = i + 1 < 10 ? `0${i + 1}` : `${i + 1}`;
          const item = monthlyTrends.find((m: any) => String(m.month || '').endsWith(moStr));
          return item?.joined ?? 0;
        })
      },
      {
        name: '전년비 성장률(%)',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        symbolSize: 6,
        itemStyle: { color: '#B59269' },
        lineStyle: { width: 2.5 },
        data: Array.from({ length: 12 }, (_, i) => {
          const moStr = i + 1 < 10 ? `0${i + 1}` : `${i + 1}`;
          const item = monthlyTrends.find((m: any) => String(m.month || '').endsWith(moStr));
          return item?.growthRate ?? null;
        })
      }
    ]
  };

  // ECharts: 채널별 도넛 차트
  const pieOptions = {
    tooltip: { trigger: 'item', formatter: '{b}: {c}명 ({d}%)' },
    color: ['#B59269', '#5F8D7B', '#3D6C5C', '#1B382E'],
    series: [
      {
        name: '가입 채널',
        type: 'pie',
        radius: ['45%', '74%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: {
          show: true,
          position: 'outside',
          formatter: '{b}\n{d}%',
          fontWeight: 'bold',
          color: '#1B382E'
        },
        data: [
          { value: channelBreakdown.ticketOnly || 0, name: '티켓 전용' },
          { value: channelBreakdown.roomOnly || 0, name: '객실 전용' },
          { value: channelBreakdown.golfOnly || 0, name: '골프 전용' },
          {
            value: channelBreakdown.multiChannel || 0,
            name: '👑 복합 이용 VIP',
            label: { color: '#284F42', fontSize: 12, fontWeight: '900' }
          }
        ]
      }
    ]
  };

  // ECharts: 고객 충성도 퍼널
  const funnelOptions = {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => `${params.name} : ${formatCurrency(params.value)}명`
    },
    color: ['#1B382E', '#284F42', '#3D6C5C', '#5F8D7B', '#B59269'],
    series: [
      {
        name: '고객 충성도 퍼널',
        type: 'funnel',
        top: 14,
        bottom: 14,
        left: '4%',
        width: '46%',
        maxSize: '100%',
        minSize: '16%',
        sort: 'descending',
        gap: 6,
        label: {
          show: true,
          position: 'right',
          formatter: (params: any) => `${params.name} · ${formatCurrency(params.value)}명`,
          fontSize: 12,
          color: '#1B382E',
          fontWeight: 'bold'
        },
        labelLine: {
          length: 14,
          lineStyle: { width: 1.5 }
        },
        itemStyle: { borderColor: '#fff', borderWidth: 1, borderRadius: 6 },
        data: [
          { value: summary.totalActiveMembers || 0, name: '전체 고유 회원' },
          { value: summary.repeatBuyers || 0, name: '2회 이상 재구매' },
          { value: summary.recentActiveMembers || 0, name: '최근 1년 실활동' },
          { value: summary.trueRepeatBuyers || 0, name: '찐 재방문 (5일+)' },
          { value: channelBreakdown.multiChannel || 0, name: '2개+ 채널 복합 VIP' }
        ]
      }
    ]
  };

  return (
    <div className="w-full min-h-screen bg-[#F4F3EE] text-[#1B382E] tracking-tight pb-16 relative">
      {/* Deep Forest Ambient Banner */}
      <div className="w-full bg-[#284F42] h-[195px] absolute top-0 left-0 z-0 overflow-hidden rounded-b-[36px] border-b border-[#1B382E] shadow-xl">
        <div className="absolute -top-16 -right-16 w-96 h-96 rounded-full bg-[#2F5548] opacity-70 pointer-events-none" />
        <div className="absolute top-8 left-1/3 w-80 h-80 rounded-full bg-[#2F5548] opacity-40 blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 right-1/4 w-60 h-60 rounded-full bg-[#1B382E] opacity-60 pointer-events-none" />
      </div>

      <div className="max-w-[1620px] mx-auto px-5 sm:px-7 lg:px-10 pt-6 lg:pt-8 space-y-6 relative z-10">
        {/* 1. Top Header Banner */}
        <div className="bg-[#284F42] rounded-3xl p-6 lg:p-8 text-white shadow-xl border border-[#1B382E] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1B382E]/80 border border-white/20 text-white/95 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-[#5FB878] animate-pulse" />
                BELLEFORET DIGITAL CRM · 15)고객 마스터 통합 SSOT
              </span>
              <span className="px-2.5 py-1 rounded-full bg-[#B59269]/25 border border-[#B59269]/50 text-[#F4F3EE] text-xs font-semibold">
                피크 가입 기간/시즌 · 가입➔실구매 전환 퍼널 · 인기 상품 Top 랭킹
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white">
              온라인 회원 증가 · 실구매 전환율 · 인기 상품 & 피크 가입 기간 분석
            </h1>
            <p className="text-sm text-white/80 mt-1">
              <strong>① 어떤 기간(월별·시즌별·요일별)에 회원이 많이 증가하는지</strong>, <strong>② 회원 증가가 실제 구매(예약·발권) 및 재구매로 이어지는지</strong>, <strong>③ 온라인 회원에게 어떤 상품·권종·영업장이 가장 인기가 있는지</strong>를 통합 분석합니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <GlobalDatePicker />
            <button
              type="button"
              onClick={fetchOnlineMembers}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#1B382E] rounded-xl hover:bg-[#F4F3EE] transition-colors shadow-xs font-bold text-xs cursor-pointer"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin text-[#284F42]' : 'text-[#284F42]'} />
              <span>새로고침</span>
            </button>
          </div>
        </div>

        {loading && !data ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-[#D0C6BB]/75 shadow-xs space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-[#284F42] mx-auto" />
            <p className="text-sm font-bold text-[#1B382E]">온라인 회원 가입 추세 및 CRM 코호트 마트를 불러오는 중입니다...</p>
          </div>
        ) : !data ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-[#D0C6BB]/75 text-[#8B2635] font-bold">
            데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
          </div>
        ) : (
          <>
            {/* 2. Top 6 KPI Bento Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 font-financial">
              <div className="bg-[#284F42] text-white p-5 rounded-3xl border border-[#1B382E] shadow-md flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-emerald-200 font-bold">
                  <span>전체 누적 온라인 회원</span>
                  <Users size={16} className="text-[#B59269]" />
                </div>
                <div className="my-2">
                  <div className="text-2xl xl:text-3xl font-black text-white">
                    {formatCurrency(summary.totalCumulativeMembers ?? summary.totalActiveMembers)}명
                  </div>
                  <div className="text-[11px] text-white/80 mt-1">
                    누적 이용 건수: {formatCurrency(summary.totalTransactions)}건
                  </div>
                </div>
                <div className="text-[11px] px-2.5 py-1 rounded-lg bg-white/10 text-emerald-100 font-medium">
                  고유 식별 회원 100% 중복 제거
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-[#D0C6BB]/75 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-[#5A6B63] font-bold">
                  <span>{isRangeMode ? '선택 기간 신규 가입' : '당월 누적 신규 가입'}</span>
                  <UserPlus size={16} className="text-[#284F42]" />
                </div>
                <div className="my-2">
                  <div className="text-2xl xl:text-3xl font-black text-[#1E523F]">
                    +{formatCurrency(summary.periodJoinedMembers)}명
                  </div>
                  <div className="text-[11px] text-[#5A6B63] mt-1">
                    전년 동기: {summary.lyPeriodJoinedMembers != null ? `${formatCurrency(summary.lyPeriodJoinedMembers)}명` : '-'}
                    {summary.growthRate != null && (
                      <span className={`ml-1.5 font-bold ${Number(summary.growthRate) >= 0 ? 'text-[#1E523F]' : 'text-[#8B2635]'}`}>
                        ({Number(summary.growthRate) >= 0 ? '▲' : '▼'}{Math.abs(Number(summary.growthRate))}%)
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-[10px] px-2 py-1 rounded-lg bg-[#E8F2EE] text-[#1E523F] font-bold truncate">
                  티켓 {formatCurrency(summary.periodTicketJoined)} · 객실 {formatCurrency(summary.periodRoomJoined)} · 골프 {formatCurrency(summary.periodGolfJoined)}
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-[#D0C6BB]/75 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-[#5A6B63] font-bold">
                  <span>기준일 당일 신규 가입</span>
                  <CalendarDays size={16} className="text-[#B59269]" />
                </div>
                <div className="my-2">
                  <div className="text-2xl xl:text-3xl font-black text-[#1B382E]">
                    +{formatCurrency(summary.todayJoinedMembers)}명
                  </div>
                  <div className="text-[11px] text-[#5A6B63] mt-1">
                    기간 실활동(Active): {formatCurrency(summary.periodActiveMembers)}명
                  </div>
                </div>
                <div className="text-[11px] px-2.5 py-1 rounded-lg bg-[#F4F3EE] text-[#5A6B63] font-medium">
                  기준일: {effectiveRefDate}
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-[#D0C6BB]/75 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-[#5A6B63] font-bold">
                  <span>최근 1년 실활동 회원</span>
                  <Activity size={16} className="text-[#284F42]" />
                </div>
                <div className="my-2">
                  <div className="text-2xl xl:text-3xl font-black text-[#1B382E]">
                    {formatCurrency(summary.recentActiveMembers)}명
                  </div>
                  <div className="text-[11px] text-[#5A6B63] mt-1">
                    활성 유지율: <strong className="text-[#1E523F]">{summary.recentActiveRate ?? '-'}%</strong>
                  </div>
                </div>
                <div className="text-[11px] px-2.5 py-1 rounded-lg bg-[#F4F3EE] text-[#5A6B63] font-medium">
                  1년+ 미활동: {formatCurrency(summary.dormantMembers)}명 ({summary.dormantRate ?? '-'}%)
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-[#D0C6BB]/75 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-[#5A6B63] font-bold">
                  <span>찐 재방문 단골 (5일+ 간격)</span>
                  <TrendingUp size={16} className="text-[#B59269]" />
                </div>
                <div className="my-2">
                  <div className="text-2xl xl:text-3xl font-black text-[#B59269]">
                    {formatCurrency(summary.trueRepeatBuyers)}명
                  </div>
                  <div className="text-[11px] text-[#5A6B63] mt-1">
                    진성 재방문율: <strong className="text-[#1B382E]">{summary.trueRepeatRate ?? '-'}%</strong>
                  </div>
                </div>
                <div className="text-[11px] px-2.5 py-1 rounded-lg bg-[#F4F3EE] text-[#5A6B63] font-medium">
                  2회+ 다회구매: {formatCurrency(summary.repeatBuyers)}명
                </div>
              </div>

              <div className="bg-[#FDF0ED] p-5 rounded-3xl border border-[#EAC5BD] shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-[#8B2635] font-bold">
                  <span>핀셋 Win-back 타겟</span>
                  <Sparkles size={16} className="text-[#8B2635]" />
                </div>
                <div className="my-2">
                  <div className="text-2xl xl:text-3xl font-black text-[#8B2635]">
                    {dormancyIntel?.summary?.winbackTargetsTotal != null
                      ? `${formatCurrency(dormancyIntel.summary.winbackTargetsTotal)}명`
                      : '-'}
                  </div>
                  <div className="text-[11px] text-[#8B2635]/85 mt-1">
                    4회+ 방문 후 6개월 이상 미방문
                  </div>
                </div>
                <div className="text-[10px] px-2 py-1 rounded-lg bg-white/80 text-[#8B2635] font-bold truncate">
                  충성(10회+) {formatCurrency(dormancyIntel?.summary?.loyalDormantCount)}명 · 단골(4~9회) {formatCurrency(dormancyIntel?.summary?.regularDormantCount)}명
                </div>
              </div>
            </div>

            {/* 2.5 SECTION 0: 온라인 회원 3대 핵심 경영 인텔리전스 (가입➔실구매 전환 · 피크 가입 기간/시즌 · 인기 상품 Top 랭킹) */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {/* 좌측 6칸: ① 회원 증가가 실제 구매(예약·발권) 및 재구매로 이어지는지 (가입➔첫구매➔재구매 전환 퍼널) */}
              <div className="xl:col-span-6 bg-white rounded-3xl p-6 lg:p-7 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="border-b border-[#D0C6BB]/60 pb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#284F42] text-white">
                        SIGNUP ➔ ACTUAL PURCHASE CONVERSION
                      </span>
                      <span className="text-xs text-[#5A6B63] font-mono">
                        회원 증가 ➔ 실구매 및 재구매 전환 검증
                      </span>
                    </div>
                    <h2 className="text-lg lg:text-xl font-extrabold text-[#1B382E] mt-1.5 flex items-center gap-2">
                      <CheckCircle2 size={20} className="text-[#284F42]" />
                      ① 온라인 회원 증가가 실제 구매 및 재방문으로 이어지는가?
                    </h2>
                    <p className="text-xs text-[#5A6B63] mt-0.5">
                      신규 가입자 중 실제 예약·발권(구매)으로 전환된 비율, 가입 후 첫 구매까지 걸리는 기간, 그리고 1회 단발 구매에서 2회+ 다회 재구매 단골로 이어지는 전환율을 진단합니다.
                    </p>
                  </div>

                  {/* 가입 ➔ 첫구매 ➔ 재구매 핵심 전환 지표 카드 */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-financial">
                    <div className="p-4 rounded-2xl bg-[#E8F2EE] border border-[#B4C6C1]">
                      <div className="text-xs font-bold text-[#1E523F]">전체 가입 ➔ 실구매 전환율</div>
                      <div className="text-2xl font-black text-[#1E523F] mt-1">
                        {purchaseConversion?.signupToPurchaseConversionRatePct != null
                          ? `${purchaseConversion.signupToPurchaseConversionRatePct}%`
                          : '-'}
                      </div>
                      <div className="text-[11px] text-[#1B382E] mt-1">
                        실구매 완료: <strong>{formatCurrency(purchaseConversion?.purchasedMembersCount ?? summary.totalActiveMembers)}명</strong>
                      </div>
                      <div className="text-[10px] text-[#5A6B63] mt-0.5">
                        미구매(0건) 가입자: {purchaseConversion?.neverPurchasedMembersCount != null ? `${formatCurrency(purchaseConversion.neverPurchasedMembersCount)}명` : '-'}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#D0C6BB]">
                      <div className="text-xs font-bold text-[#8B6E4E]">신규 가입 당일(D+0) 즉시 구매율</div>
                      <div className="text-2xl font-black text-[#1B382E] mt-1">
                        {purchaseConversion?.sameDayPurchaseRatePct != null
                          ? `${purchaseConversion.sameDayPurchaseRatePct}%`
                          : '-'}
                      </div>
                      <div className="text-[11px] text-[#5A6B63] mt-1">
                        기간 가입 {formatCurrency(summary.periodJoinedMembers)}명 중 실구매:{' '}
                        <strong className="text-[#1B382E]">
                          {purchaseConversion?.periodJoinedAndPurchasedCount != null
                            ? `${formatCurrency(purchaseConversion.periodJoinedAndPurchasedCount)}명`
                            : '-'}
                        </strong>
                      </div>
                      <div className="text-[10px] text-[#8B6E4E] font-bold mt-0.5">
                        첫 구매 평균 소요일: {purchaseConversion?.avgDaysToFirstPurchase != null ? `${purchaseConversion.avgDaysToFirstPurchase}일` : '-'}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#F4F3EE] border border-[#D0C6BB]">
                      <div className="text-xs font-bold text-[#1B382E]">실구매 회원 누적 거래·재구매</div>
                      <div className="text-2xl font-black text-[#284F42] mt-1">
                        {formatCurrency(summary.totalTransactions)}건
                      </div>
                      <div className="text-[11px] text-[#5A6B63] mt-1">
                        2회+ 재구매 회원: <strong className="text-[#1E523F]">{formatCurrency(summary.repeatBuyers)}명</strong>
                      </div>
                      <div className="text-[10px] text-[#1B382E] font-bold mt-0.5">
                        5일+ 간격 찐 단골: {formatCurrency(summary.trueRepeatBuyers)}명 ({summary.trueRepeatRate ?? '-'}%)
                      </div>
                    </div>
                  </div>

                  {/* 실측 구매 회원 여정 단계별 브레이크다운 (백엔드 summary & channelBreakdown 100% 직결) */}
                  <div className="p-4 rounded-2xl bg-[#F4F3EE]/70 border border-[#D0C6BB] space-y-2.5 font-financial">
                    <div className="text-xs font-extrabold text-[#1B382E] flex items-center justify-between">
                      <span>실구매 온라인 회원({formatCurrency(summary.totalActiveMembers)}명) 구매 깊이 & 재방문 전환 구조</span>
                      <span className="text-[11px] text-[#5A6B63]">총 {formatCurrency(summary.totalTransactions)}건 예약·발권 완료</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="bg-white p-3 rounded-xl border border-[#D0C6BB]/70">
                        <div className="text-[11px] text-[#5A6B63]">① 1회 단발 구매</div>
                        <div className="text-base font-black text-[#1B382E] mt-0.5">
                          {formatCurrency(summary.oneTimeBuyers)}명
                        </div>
                        <div className="text-[10px] text-[#8B6E4E]">재구매 유도 타겟</div>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-[#D0C6BB]/70">
                        <div className="text-[11px] text-[#1E523F] font-bold">② 2회+ 다회 구매</div>
                        <div className="text-base font-black text-[#1E523F] mt-0.5">
                          {formatCurrency(summary.repeatBuyers)}명
                        </div>
                        <div className="text-[10px] text-[#1E523F]">반복 구매 안착</div>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-[#D0C6BB]/70">
                        <div className="text-[11px] text-[#284F42] font-bold">③ 5일+ 진성 재방문</div>
                        <div className="text-base font-black text-[#284F42] mt-0.5">
                          {formatCurrency(summary.trueRepeatBuyers)}명
                        </div>
                        <div className="text-[10px] text-[#5A6B63]">비중 {summary.trueRepeatRate ?? '-'}%</div>
                      </div>
                      <div className="bg-[#284F42] text-white p-3 rounded-xl">
                        <div className="text-[11px] text-emerald-200 font-bold">④ 2개+ 부문 복합 VIP</div>
                        <div className="text-base font-black text-[#B59269] mt-0.5">
                          {formatCurrency(channelBreakdown.multiChannel)}명
                        </div>
                        <div className="text-[10px] text-white/80">객실·골프·티켓 교차구매</div>
                      </div>
                    </div>
                  </div>
                </div>

                {!purchaseConversion && (
                  <div className="p-3 rounded-2xl bg-[#F4F3EE] border border-dashed border-[#D0C6BB] text-xs text-[#5A6B63] flex items-center justify-between gap-2">
                    <span>
                      <strong className="text-[#1B382E]">백엔드 Ticket 82 연동 대기 (`purchaseConversionFunnel`):</strong>{' '}
                      미구매(0건) 순수가입자 모수 포함 가입➔첫구매 전환율(`%`), 당일(D+0) 즉시구매율, 첫구매 평균 소요일이 배포 즉시 자동 표출됩니다.
                    </span>
                  </div>
                )}
              </div>

              {/* 우측 6칸: ② 어떤 기간(시즌·월·요일)에 온라인 회원이 많이 증가하는지 (피크 가입 기간 & 시즌성 분석) */}
              <div className="xl:col-span-6 bg-white rounded-3xl p-6 lg:p-7 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="border-b border-[#D0C6BB]/60 pb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]">
                        PEAK SIGNUP PERIOD & SEASONALITY
                      </span>
                      <span className="text-xs text-[#5A6B63] font-mono">
                        언제(시즌·월·요일) 어떤 목적으로 회원이 급증하는가
                      </span>
                    </div>
                    <h2 className="text-lg lg:text-xl font-extrabold text-[#1B382E] mt-1.5 flex items-center gap-2">
                      <CalendarDays size={20} className="text-[#B59269]" />
                      ② 어떤 기간(시즌·월별·요일별)에 온라인 회원이 많이 느는가?
                    </h2>
                    <p className="text-xs text-[#5A6B63] mt-0.5">
                      연중 회원이 가장 폭발적으로 증가하는 성수기 피크 월/시즌, 주말 vs 평일 가입 집중도, 그리고 조회 기간 내 최다 가입 일자 Top 3를 확인합니다.
                    </p>
                  </div>

                  {/* 피크 가입 월 · 피크 요일 · 주말 vs 평일 가입 비중 */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-financial">
                    <div className="p-4 rounded-2xl bg-[#284F42] text-white">
                      <div className="text-xs font-bold text-emerald-200">연중 최다 가입 피크 월</div>
                      <div className="text-xl font-black text-[#B59269] mt-1">
                        {peakJoinSeasonality?.peakMonth?.monthLabel || peakJoinSeasonality?.peakMonth?.month || '-'}
                      </div>
                      <div className="text-[11px] text-white/90 mt-1">
                        가입자: <strong>{peakJoinSeasonality?.peakMonth?.joinedCount != null ? `+${formatCurrency(peakJoinSeasonality.peakMonth.joinedCount)}명` : '-'}</strong>
                        {peakJoinSeasonality?.peakMonth?.shareOfYearPct != null ? ` (연간 ${peakJoinSeasonality.peakMonth.shareOfYearPct}%)` : ''}
                      </div>
                      <div className="text-[10px] text-emerald-200 mt-0.5 truncate">
                        주력 유입: {peakJoinSeasonality?.peakMonth?.topTriggerProduct || '-'}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#F4F3EE] border border-[#D0C6BB]">
                      <div className="text-xs font-bold text-[#5A6B63]">최다 가입 요일 & 주말 비중</div>
                      <div className="text-xl font-black text-[#1B382E] mt-1">
                        {peakJoinSeasonality?.peakDayOfWeek?.dayLabel || '-'}
                        {peakJoinSeasonality?.peakDayOfWeek?.sharePct != null ? ` (${peakJoinSeasonality.peakDayOfWeek.sharePct}%)` : ''}
                      </div>
                      <div className="text-[11px] text-[#5A6B63] mt-1">
                        주말 가입 비중: <strong className="text-[#1E523F]">{peakJoinSeasonality?.weekendVsWeekday?.weekendSharePct != null ? `${peakJoinSeasonality.weekendVsWeekday.weekendSharePct}%` : '-'}</strong>
                      </div>
                      <div className="text-[10px] text-[#5A6B63] mt-0.5">
                        평일 가입 비중: {peakJoinSeasonality?.weekendVsWeekday?.weekdaySharePct != null ? `${peakJoinSeasonality.weekendVsWeekday.weekdaySharePct}%` : '-'}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#E8F2EE] border border-[#B4C6C1]">
                      <div className="text-xs font-bold text-[#1E523F]">조회기간 유입 채널 구성</div>
                      <div className="text-xl font-black text-[#1E523F] mt-1">
                        +{formatCurrency(summary.periodJoinedMembers)}명 신규
                      </div>
                      <div className="text-[11px] text-[#1B382E] mt-1">
                        티켓 <strong>{formatCurrency(summary.periodTicketJoined)}명</strong> · 객실 <strong>{formatCurrency(summary.periodRoomJoined)}명</strong>
                      </div>
                      <div className="text-[10px] text-[#5A6B63] mt-0.5">
                        골프 온라인 가입: {formatCurrency(summary.periodGolfJoined)}명
                      </div>
                    </div>
                  </div>

                  {/* 시즌별 가입 분포 또는 조회기간 내 최다 가입 피크 일자 Top 4 (실측 dailyTrends 100% 직결) */}
                  {Array.isArray(peakJoinSeasonality?.seasonalBreakdown) && peakJoinSeasonality.seasonalBreakdown.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-financial text-xs">
                      {peakJoinSeasonality.seasonalBreakdown.map((s: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-2xl bg-[#F4F3EE]/80 border border-[#D0C6BB]">
                          <div className="font-bold text-[#1B382E]">{s.seasonLabel}</div>
                          <div className="text-base font-black text-[#1E523F] mt-1">
                            +{formatCurrency(s.joinedCount)}명 ({s.sharePct}%)
                          </div>
                          <div className="text-[10px] text-[#5A6B63] mt-0.5 truncate">
                            구매전환 {s.conversionRatePct ?? '-'}% · {s.topPopularProduct || '-'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-[#F4F3EE]/70 border border-[#D0C6BB] space-y-2 font-financial">
                      <div className="text-xs font-extrabold text-[#1B382E] flex items-center justify-between">
                        <span>조회 기간 내 신규 회원이 가장 많이 증가한 피크 일자 Top 4 (실측 일별 원장)</span>
                        <span className="text-[11px] text-[#5A6B63]">티켓·객실·골프 유입 내역</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[...dailyTrends]
                          .sort((a, b) => Number(b.joined || 0) - Number(a.joined || 0))
                          .slice(0, 4)
                          .map((d: any, idx: number) => (
                            <div key={d.date || idx} className="bg-white p-2.5 rounded-xl border border-[#D0C6BB]/70 flex items-center justify-between text-xs">
                              <div>
                                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#284F42] text-white text-[10px] font-bold mr-1.5">
                                  {idx + 1}
                                </span>
                                <span className="font-mono font-bold text-[#1B382E]">{d.date}</span>
                              </div>
                              <div className="text-right">
                                <span className="font-black text-[#1E523F]">+{formatCurrency(d.joined)}명</span>
                                <span className="text-[10px] text-[#5A6B63] ml-1.5">
                                  (티켓 {formatCurrency(d.ticketJoined)} · 객실 {formatCurrency(d.roomJoined)} · 골프 {formatCurrency(d.golfJoined)})
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                  {/* 요일별(월~일) 신규 가입 비중 및 실구매 전환율 (`byDayOfWeekJoin[]` 1:1 바인딩) */}
                  {Array.isArray(peakJoinSeasonality?.byDayOfWeekJoin) && peakJoinSeasonality.byDayOfWeekJoin.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-[#FAF6F0] border border-[#D0C6BB] space-y-2 font-financial">
                      <div className="text-xs font-extrabold text-[#1B382E] flex items-center justify-between">
                        <span>요일별(`월~일`) 온라인 신규 가입 비중 & 실구매 전환율</span>
                        <span className="text-[10px] text-[#5A6B63]">주말·평일 요일별 집중도</span>
                      </div>
                      <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
                        {peakJoinSeasonality.byDayOfWeekJoin.map((dow: any, dIdx: number) => (
                          <div key={dow.dayCode || dIdx} className="bg-white p-2 rounded-xl border border-[#D0C6BB]/70">
                            <div className="text-[11px] font-bold text-[#1B382E]">{dow.dayLabel || dow.dayCode}</div>
                            <div className="text-xs font-black text-[#1E523F] mt-0.5">+{formatCurrency(dow.joinedCount)}명</div>
                            <div className="text-[10px] text-[#5A6B63]">{dow.sharePct ?? '-'}%</div>
                            {dow.conversionRatePct != null && (
                              <div className="text-[9px] text-[#8B6E4E] font-bold">구매 {dow.conversionRatePct}%</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {!peakJoinSeasonality && (
                  <div className="p-3 rounded-2xl bg-[#F4F3EE] border border-dashed border-[#D0C6BB] text-xs text-[#5A6B63]">
                    <strong className="text-[#1B382E]">백엔드 Ticket 82 연동 대기 (`peakJoinSeasonality`):</strong>{' '}
                    봄·여름·가을·겨울 4계절 가입 집중도 및 요일별(`월~일`) 가입 비중·실구매 전환율 완제품이 배포되면 즉시 표출됩니다.
                  </div>
                )}
              </div>
            </div>

            {/* 2.6 SECTION 0.5: ③ 온라인 회원에게 어떤 상품·권종·영업장이 가장 인기가 있는지 (인기 상품 Top 랭킹 & 부문별 구매 수요) */}
            <div className="bg-white rounded-3xl p-6 lg:p-7 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#D0C6BB]/60 pb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#B59269] text-white">
                      ONLINE MEMBER POPULAR PRODUCTS & VENUES
                    </span>
                    <span className="text-xs text-[#5A6B63] font-mono">
                      온라인 회원 실제 구매 인기 상품 · 권종 · 영업장 리더보드
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-[#1B382E] mt-1.5 flex items-center gap-2">
                    <ShoppingBag size={20} className="text-[#284F42]" />
                    ③ 온라인 회원에게 어떤 상품(티켓 권종 · 객실 평형/패키지 · 골프)이 인기가 있는가?
                  </h2>
                  <p className="text-xs text-[#5A6B63] mt-0.5">
                    온라인 회원이 가입 후 실제로 가장 많이 예약·발권하는 인기 상품/권종 순위와 신규 회원 가입을 견인하는 대표 효자 상품(Acquisition Magnet)을 분석합니다.
                  </p>
                </div>

                {/* 카테고리 필터 버튼 */}
                <div className="flex flex-wrap items-center gap-1.5 bg-[#F4F3EE] p-1.5 rounded-2xl border border-[#D0C6BB]/70 self-start lg:self-center">
                  {(
                    [
                      { id: 'ALL', label: '전체 인기상품' },
                      { id: 'TICKET', label: '🛷 레저·티켓 권종' },
                      { id: 'ROOM', label: '🏨 콘도 객실·패키지' },
                      { id: 'GOLF', label: '⛳ 골프 티타임' },
                      { id: 'PACKAGE', label: '🎁 복합 패키지' }
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setPopularCategoryFilter(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        popularCategoryFilter === cat.id
                          ? 'bg-[#284F42] text-white shadow-2xs'
                          : 'text-[#5A6B63] hover:text-[#1B382E]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 현재 실측 부문별 온라인 구매 회원 수요 요약 (channelBreakdown 100% 직결) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 font-financial">
                <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#D0C6BB] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[#8B6E4E]">🛷 레저·티켓 온라인 구매 회원</div>
                    <div className="text-xl font-black text-[#1B382E] mt-1">
                      {formatCurrency(channelBreakdown.ticketOnly)}명
                    </div>
                    <div className="text-[11px] text-[#5A6B63] mt-0.5">
                      기간 신규 티켓 가입: +{formatCurrency(summary.periodTicketJoined)}명
                    </div>
                  </div>
                  <Award size={28} className="text-[#B59269]/60" />
                </div>

                <div className="p-4 rounded-2xl bg-[#E8F2EE]/70 border border-[#B4C6C1] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[#1E523F]">🏨 콘도 객실 온라인 예약 회원</div>
                    <div className="text-xl font-black text-[#1B382E] mt-1">
                      {formatCurrency(channelBreakdown.roomOnly)}명
                    </div>
                    <div className="text-[11px] text-[#5A6B63] mt-0.5">
                      기간 신규 객실 가입: +{formatCurrency(summary.periodRoomJoined)}명
                    </div>
                  </div>
                  <Users size={28} className="text-[#284F42]/50" />
                </div>

                <div className="p-4 rounded-2xl bg-[#F4F3EE] border border-[#D0C6BB] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[#5A6B63]">⛳ 골프 티타임 온라인 예약 회원</div>
                    <div className="text-xl font-black text-[#1B382E] mt-1">
                      {formatCurrency(channelBreakdown.golfOnly)}명
                    </div>
                    <div className="text-[11px] text-[#5A6B63] mt-0.5">
                      기간 신규 골프 가입: +{formatCurrency(summary.periodGolfJoined)}명
                    </div>
                  </div>
                  <TrendingUp size={28} className="text-[#5A6B63]/50" />
                </div>

                <div className="p-4 rounded-2xl bg-[#284F42] text-white flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-emerald-200">👑 다부문(객실+티켓+골프) 복합 구매</div>
                    <div className="text-xl font-black text-[#B59269] mt-1">
                      {formatCurrency(channelBreakdown.multiChannel)}명
                    </div>
                    <div className="text-[11px] text-white/80 mt-0.5">
                      2개 이상 부문 교차 구매 핵심 고객층
                    </div>
                  </div>
                  <Sparkles size={28} className="text-[#B59269]" />
                </div>
              </div>

              {/* 온라인 회원 인기 구매 상품 Top 랭킹 테이블 (`popularProducts[]` 1:1 바인딩) */}
              {filteredPopularProducts.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-[#D0C6BB]/75">
                  <table className="w-full text-xs whitespace-nowrap font-financial">
                    <thead className="bg-[#F4F3EE] text-[#1B382E] font-bold border-b-2 border-[#1B382E]">
                      <tr>
                        <th className="py-3 px-4 text-center w-14">순위</th>
                        <th className="py-3 px-4 text-left">인기 상품 / 권종명</th>
                        <th className="py-3 px-3 text-center">부문</th>
                        <th className="py-3 px-4 text-left">영업장</th>
                        <th className="py-3 px-4 text-right">구매 회원수 (명)</th>
                        <th className="py-3 px-3 text-right">구매회원 비중</th>
                        <th className="py-3 px-4 text-right">총 구매 건수 (건)</th>
                        <th className="py-3 px-4 text-right">재구매 회원 비율</th>
                        <th className="py-3 px-4 text-right">신규가입 첫구매 유입</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D0C6BB]/40">
                      {filteredPopularProducts.map((p: any, idx: number) => (
                        <tr key={p.productCode || idx} className="hover:bg-[#F4F3EE]/50 transition-colors">
                          <td className="py-3 px-4 text-center font-black text-[#1B382E]">
                            {p.rank ?? idx + 1}위
                          </td>
                          <td className="py-3 px-4 font-bold text-[#1B382E]">
                            <span>{p.productName || '-'}</span>
                            {p.isTopAcquisitionProduct && (
                              <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-black bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]">
                                🔥 신규가입 유입 효자상품
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-lg bg-[#F4F3EE] text-[#1B382E] font-bold text-[11px]">
                              {p.categoryLabel || p.category || '-'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[#5A6B63] font-semibold">
                            {p.venueName || '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-[#1E523F]">
                            {p.uniqueBuyerCount != null ? `${formatCurrency(p.uniqueBuyerCount)}명` : '-'}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-[#1B382E]">
                            {p.buyerSharePct != null ? `${p.buyerSharePct}%` : '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-[#1B382E]">
                            {p.purchaseCount != null ? `${formatCurrency(p.purchaseCount)}건` : '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-[#284F42]">
                            {p.repeatBuyerRatePct != null ? `${p.repeatBuyerRatePct}%` : '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-[#8B6E4E]">
                            {p.newMemberFirstBuyCount != null ? `${formatCurrency(p.newMemberFirstBuyCount)}명` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-[#F4F3EE]/80 border border-dashed border-[#D0C6BB] text-xs text-[#5A6B63] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="font-bold text-[#1B382E] flex items-center gap-1.5">
                      <ShoppingBag size={15} className="text-[#284F42]" />
                      온라인 회원 인기 구매 상품/권종 Top 15 (`popularProducts[]`) & 인기 영업장 Top 10 (`popularVenues[]`) — 백엔드 Ticket 82 연동 대기 (`'-'`)
                    </div>
                    <p className="leading-relaxed">
                      Zero-Proxy 및 Fail-Loudly 원칙에 따라 가짜 상품 순위를 생성하지 않으며, 백엔드 <code className="font-mono text-[#1B382E]">GET /api/v6/report/online-members</code>에 온라인 회원 실제 구매 원장 기반 <code className="font-mono text-[#1B382E]">popularProducts[]</code> (상품명, 구매 회원수, 구매 건수, 재구매율, 신규가입 첫구매 유입수)가 배포되는 즉시 본 리더보드에 1:1 자동 표출됩니다.
                    </p>
                  </div>
                  {popularVenues.length > 0 && (
                    <span className="px-3 py-1.5 rounded-xl bg-white border border-[#D0C6BB] font-bold text-[#1B382E] shrink-0">
                      인기 영업장 {popularVenues.length}개 수신됨
                    </span>
                  )}
                </div>
              )}

              {/* 온라인 회원 인기 영업장 Top 10 (`popularVenues[]` 1:1 바인딩) */}
              {popularVenues.length > 0 && (
                <div className="p-4 rounded-2xl bg-[#F4F3EE]/70 border border-[#D0C6BB] space-y-2.5 font-financial">
                  <div className="text-xs font-extrabold text-[#1B382E] flex items-center justify-between">
                    <span>온라인 회원이 가장 많이 이용하는 인기 영업장 Top 10 (`popularVenues[]`)</span>
                    <span className="text-[11px] text-[#5A6B63]">구매회원수 · 비중(%) · 재구매율(%)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
                    {popularVenues.slice(0, 10).map((v: any, vIdx: number) => (
                      <div key={v.venueName || vIdx} className="bg-white p-3 rounded-xl border border-[#D0C6BB]/80 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-[#284F42]">{v.rank ?? vIdx + 1}위</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F4F3EE] text-[#5A6B63]">{v.category || '영업장'}</span>
                        </div>
                        <div className="font-bold text-[#1B382E] mt-1 truncate">{v.venueName || '-'}</div>
                        <div className="mt-1.5 pt-1.5 border-t border-[#D0C6BB]/40 flex items-center justify-between text-[11px]">
                          <strong className="text-[#1E523F]">{formatCurrency(v.uniqueBuyerCount)}명 ({v.buyerSharePct ?? '-'}%)</strong>
                          <span className="text-[#8B6E4E]">재구매 {v.repeatBuyerRatePct ?? '-'}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. SECTION 1: 온라인 가입자 변화 추세 3단 타임라인 (일별 · 월별 · 연도별) */}
            <div className="bg-white rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] overflow-hidden">
              <div className="p-6 border-b border-[#D0C6BB]/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#F4F3EE]/50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#284F42] text-white">
                      GROWTH TIMELINE
                    </span>
                    <span className="text-xs text-[#5A6B63] font-mono">
                      API: /api/v6/report/online-members
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-[#1B382E] mt-1.5">
                    온라인 가입회원 증가 추이 및 변화 추세 (일별 · 월별 · 연도별)
                  </h2>
                  <p className="text-xs text-[#5A6B63] mt-0.5">
                    매일 몇 명의 신규 회원이 유입되는지(일별), 월별 계절성 유입과 전년 동월 대비 성장률(월별), 그리고 연도별 중장기 회원 증가 추세(연도별)를 분석합니다.
                  </p>
                </div>

                {/* 3단 타임라인 전환 탭 */}
                <div className="flex items-center bg-[#EAE6DF] p-1 rounded-2xl border border-[#D0C6BB]/80 self-start lg:self-center">
                  <button
                    type="button"
                    onClick={() => setTrendTab('daily')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      trendTab === 'daily'
                        ? 'bg-[#284F42] text-white shadow-xs'
                        : 'text-[#5A6B63] hover:text-[#1B382E]'
                    }`}
                  >
                    ① 일별 가입자 추이 ({dailyTrends.length}일)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrendTab('monthly')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      trendTab === 'monthly'
                        ? 'bg-[#284F42] text-white shadow-xs'
                        : 'text-[#5A6B63] hover:text-[#1B382E]'
                    }`}
                  >
                    ② 월별 가입자 추세 (1~12월)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrendTab('yearly')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      trendTab === 'yearly'
                        ? 'bg-[#284F42] text-white shadow-xs'
                        : 'text-[#5A6B63] hover:text-[#1B382E]'
                    }`}
                  >
                    ③ 연도별 변화 추세
                  </button>
                </div>
              </div>

              {/* TAB 1: 일별(Daily) 신규 가입 추이 및 일자별 상세 증감 표 */}
              {trendTab === 'daily' && (
                <div className="p-6 space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-bold text-[#1B382E] mr-1 flex items-center gap-1">
                        <Filter size={14} className="text-[#284F42]" /> 유입 채널 하이라이트:
                      </span>
                      {(
                        [
                          { key: 'ALL', label: '전체 합계' },
                          { key: 'TICKET', label: '티켓(레저) 가입' },
                          { key: 'ROOM', label: '객실(콘도) 가입' },
                          { key: 'GOLF', label: '골프 가입' }
                        ] as const
                      ).map((ch) => (
                        <button
                          key={ch.key}
                          type="button"
                          onClick={() => setDailyChannelHighlight(ch.key)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                            dailyChannelHighlight === ch.key
                              ? 'bg-[#284F42] text-white border-[#284F42]'
                              : 'bg-[#F4F3EE] text-[#5A6B63] border-[#D0C6BB]/60 hover:text-[#1B382E]'
                          }`}
                        >
                          {ch.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-[#5A6B63] font-semibold flex items-center gap-1">
                        <ArrowUpDown size={13} className="text-[#B59269]" /> 표 정렬:
                      </span>
                      <button
                        type="button"
                        onClick={() => setDailySortMode('dateDesc')}
                        className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                          dailySortMode === 'dateDesc' ? 'bg-[#1B382E] text-white' : 'bg-[#F4F3EE] text-[#5A6B63]'
                        }`}
                      >
                        최신 일자순
                      </button>
                      <button
                        type="button"
                        onClick={() => setDailySortMode('joinedDesc')}
                        className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                          dailySortMode === 'joinedDesc' ? 'bg-[#1B382E] text-white' : 'bg-[#F4F3EE] text-[#5A6B63]'
                        }`}
                      >
                        가입자 많은 날 순
                      </button>
                      <button
                        type="button"
                        onClick={() => setDailySortMode('dateAsc')}
                        className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                          dailySortMode === 'dateAsc' ? 'bg-[#1B382E] text-white' : 'bg-[#F4F3EE] text-[#5A6B63]'
                        }`}
                      >
                        과거 일자순
                      </button>
                    </div>
                  </div>

                  {/* 일별 가입 추이 차트 */}
                  <div className="h-[340px] w-full bg-[#F4F3EE]/40 p-4 rounded-2xl border border-[#D0C6BB]/50">
                    {dailyTrends.length > 0 ? (
                      <ReactECharts option={dailyChartOptions} style={{ height: '100%', width: '100%' }} />
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-[#5A6B63]">
                        조회 기간 일별 가입 추이 데이터가 없습니다.
                      </div>
                    )}
                  </div>

                  {/* 일자별 신규 가입자 수 상세 원장 표 */}
                  <div className="rounded-2xl border border-[#D0C6BB]/75 overflow-hidden">
                    <div className="px-4 py-3 bg-[#F4F3EE] border-b border-[#D0C6BB]/75 flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-extrabold text-[#1B382E]">
                        일자별 온라인 신규 가입자 증감 및 누적 회원수 상세 대조표
                      </span>
                      <span className="text-[11px] text-[#5A6B63]">
                        기간 총 신규 가입: <strong className="text-[#1E523F]">+{formatCurrency(summary.periodJoinedMembers)}명</strong> (전년 동기 {formatCurrency(summary.lyPeriodJoinedMembers)}명)
                      </span>
                    </div>
                    <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                      <table className="w-full text-xs whitespace-nowrap font-financial">
                        <thead className="sticky top-0 z-10 bg-[#F4F3EE] text-[#1B382E] font-bold border-b border-[#D0C6BB]/75">
                          <tr>
                            <th className="py-3 px-4 text-left">일자</th>
                            <th className="py-3 px-4 text-right bg-[#E8F2EE]/70 text-[#1E523F]">일별 신규 가입 (+명)</th>
                            <th className="py-3 px-3 text-right">티켓 유입</th>
                            <th className="py-3 px-3 text-right">객실 유입</th>
                            <th className="py-3 px-3 text-right">골프 유입</th>
                            <th className="py-3 px-3 text-right">전년 동요일 가입</th>
                            <th className="py-3 px-3 text-right">전년 대비 증감</th>
                            <th className="py-3 px-3 text-right">일일 실활동(DAU)</th>
                            <th className="py-3 px-4 text-right">누적 온라인 회원수</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#D0C6BB]/30">
                          {sortedDailyRows.map((d: any, idx: number) => {
                            const diff = d.joinedDiff;
                            const rate = d.growthRate;
                            return (
                              <tr key={d.date || idx} className="hover:bg-[#F4F3EE]/50 transition-colors">
                                <td className="py-2.5 px-4 font-mono font-bold text-[#1B382E]">{d.date}</td>
                                <td className="py-2.5 px-4 text-right font-black text-sm text-[#1E523F] bg-[#E8F2EE]/30">
                                  +{formatCurrency(d.joined)}명
                                </td>
                                <td className="py-2.5 px-3 text-right text-[#8C6839] font-semibold">
                                  {formatCurrency(d.ticketJoined)}명
                                </td>
                                <td className="py-2.5 px-3 text-right text-[#284F42] font-semibold">
                                  {formatCurrency(d.roomJoined)}명
                                </td>
                                <td className="py-2.5 px-3 text-right text-[#1B382E] font-semibold">
                                  {formatCurrency(d.golfJoined)}명
                                </td>
                                <td className="py-2.5 px-3 text-right text-[#5A6B63]">
                                  {d.lyJoined != null ? `${formatCurrency(d.lyJoined)}명` : '-'}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  {diff != null ? (
                                    <span className={`font-bold ${Number(diff) >= 0 ? 'text-[#1E523F]' : 'text-[#8B2635]'}`}>
                                      {Number(diff) > 0 ? `+${formatCurrency(diff)}` : formatCurrency(diff)}명
                                      {rate != null ? ` (${Number(rate) >= 0 ? '+' : ''}${rate}%)` : ''}
                                    </span>
                                  ) : (
                                    <span className="text-[#5A6B63]/50">-</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-[#1B382E]">
                                  {formatCurrency(d.active)}명
                                </td>
                                <td className="py-2.5 px-4 text-right font-extrabold text-[#1B382E]">
                                  {d.cumulative != null ? `${formatCurrency(d.cumulative)}명` : '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: 월별(Monthly) 1~12월 가입자 추세 및 전년 동월 대조표 */}
              {trendTab === 'monthly' && (
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-sm font-extrabold text-[#1B382E] flex items-center gap-2">
                      <CalendarDays size={16} className="text-[#284F42]" />
                      {currentYearStr}년 vs {prevYearStr}년 월별 온라인 신규 가입자 변화 추세 (1월~12월)
                    </h3>
                    <div className="flex items-center gap-1 bg-[#F4F3EE] p-1 rounded-xl border border-[#D0C6BB]/60 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setMonthlyViewMode('both')}
                        className={`px-3 py-1 rounded-lg cursor-pointer ${
                          monthlyViewMode === 'both' ? 'bg-[#284F42] text-white' : 'text-[#5A6B63]'
                        }`}
                      >
                        차트 + 표 통합
                      </button>
                      <button
                        type="button"
                        onClick={() => setMonthlyViewMode('table')}
                        className={`px-3 py-1 rounded-lg cursor-pointer flex items-center gap-1 ${
                          monthlyViewMode === 'table' ? 'bg-[#284F42] text-white' : 'text-[#5A6B63]'
                        }`}
                      >
                        <TableProperties size={13} /> 표만 보기
                      </button>
                      <button
                        type="button"
                        onClick={() => setMonthlyViewMode('chart')}
                        className={`px-3 py-1 rounded-lg cursor-pointer flex items-center gap-1 ${
                          monthlyViewMode === 'chart' ? 'bg-[#284F42] text-white' : 'text-[#5A6B63]'
                        }`}
                      >
                        <BarChart3 size={13} /> 차트만 보기
                      </button>
                    </div>
                  </div>

                  {(monthlyViewMode === 'both' || monthlyViewMode === 'chart') && (
                    <div className="h-[340px] w-full bg-[#F4F3EE]/40 p-4 rounded-2xl border border-[#D0C6BB]/50">
                      <ReactECharts option={monthlyChartOptions} style={{ height: '100%', width: '100%' }} />
                    </div>
                  )}

                  {(monthlyViewMode === 'both' || monthlyViewMode === 'table') && (
                    <div className="overflow-x-auto rounded-2xl border border-[#D0C6BB]/75">
                      <table className="w-full text-xs text-right border-collapse whitespace-nowrap font-financial">
                        <thead>
                          <tr className="bg-[#F4F3EE] text-[#1B382E] border-b border-[#D0C6BB]/75">
                            <th className="px-4 py-3 text-left font-bold sticky left-0 bg-[#F4F3EE] z-10">구분</th>
                            {Array.from({ length: 12 }, (_, i) => (
                              <th key={i} className="px-3 py-3 font-bold">{i + 1}월</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#D0C6BB]/40">
                          <tr className="hover:bg-[#F4F3EE]/40">
                            <td className="px-4 py-3 text-left font-bold text-[#5A6B63] sticky left-0 bg-white">
                              {prevYearStr}년 가입자 (전년)
                            </td>
                            {Array.from({ length: 12 }, (_, i) => {
                              const moStr = i + 1 < 10 ? `0${i + 1}` : `${i + 1}`;
                              const item = monthlyTrends.find((m: any) => String(m.month || '').endsWith(moStr));
                              return (
                                <td key={i} className="px-3 py-3 text-[#5A6B63]">
                                  {item?.lyJoined != null ? `${formatCurrency(item.lyJoined)}명` : '-'}
                                </td>
                              );
                            })}
                          </tr>
                          <tr className="bg-[#E8F2EE]/30 hover:bg-[#E8F2EE]/60">
                            <td className="px-4 py-3 text-left font-extrabold text-[#1E523F] sticky left-0 bg-[#E8F2EE] z-10">
                              {currentYearStr}년 가입자 (당해)
                            </td>
                            {Array.from({ length: 12 }, (_, i) => {
                              const moStr = i + 1 < 10 ? `0${i + 1}` : `${i + 1}`;
                              const item = monthlyTrends.find((m: any) => String(m.month || '').endsWith(moStr));
                              const isFuture = i + 1 > currentMonthNum;
                              return (
                                <td key={i} className="px-3 py-3 font-black text-[#1B382E]">
                                  {!isFuture && item?.joined != null ? `${formatCurrency(item.joined)}명` : '-'}
                                </td>
                              );
                            })}
                          </tr>
                          <tr className="hover:bg-[#F4F3EE]/40">
                            <td className="px-4 py-3 text-left font-bold text-[#1B382E] sticky left-0 bg-white">
                              전년 동월 대비 증감률(%)
                            </td>
                            {Array.from({ length: 12 }, (_, i) => {
                              const moStr = i + 1 < 10 ? `0${i + 1}` : `${i + 1}`;
                              const item = monthlyTrends.find((m: any) => String(m.month || '').endsWith(moStr));
                              const isFuture = i + 1 > currentMonthNum;
                              const rate = item?.growthRate ?? null;
                              return (
                                <td key={i} className="px-3 py-3">
                                  {!isFuture && rate !== null ? (
                                    <span className={`px-1.5 py-0.5 rounded font-bold ${
                                      Number(rate) > 0
                                        ? 'bg-[#E8F2EE] text-[#1E523F]'
                                        : Number(rate) < 0
                                          ? 'bg-[#FDF0ED] text-[#8B2635]'
                                          : 'bg-[#F4F3EE] text-[#5A6B63]'
                                    }`}>
                                      {Number(rate) > 0 ? `▲${rate}%` : Number(rate) < 0 ? `▼${Math.abs(Number(rate))}%` : '0%'}
                                    </span>
                                  ) : (
                                    <span className="text-[#5A6B63]/40">-</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: 연도별(Yearly) 변화 추세 */}
              {trendTab === 'yearly' && (
                <div className="p-6 space-y-6">
                  {/* 당해 vs 전년 동기간 실측 비교 카드 (현재 API 제공 완제품) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-financial">
                    <div className="p-5 rounded-2xl bg-[#F4F3EE] border border-[#D0C6BB]/75">
                      <div className="text-xs font-bold text-[#5A6B63]">{prevYearStr}년 동기간 신규 가입자 (LY)</div>
                      <div className="text-2xl font-black text-[#1B382E] mt-1">
                        {summary.lyPeriodJoinedMembers != null ? `${formatCurrency(summary.lyPeriodJoinedMembers)}명` : '-'}
                      </div>
                      <div className="text-[11px] text-[#5A6B63] mt-1">전년 동기 실측 유입 인원</div>
                    </div>
                    <div className="p-5 rounded-2xl bg-[#E8F2EE] border border-[#B4C6C1]/80">
                      <div className="text-xs font-bold text-[#1E523F]">{currentYearStr}년 동기간 신규 가입자 (TY)</div>
                      <div className="text-2xl font-black text-[#1E523F] mt-1">
                        {summary.periodJoinedMembers != null ? `${formatCurrency(summary.periodJoinedMembers)}명` : '-'}
                      </div>
                      <div className="text-[11px] text-[#1E523F] mt-1">
                        티켓 {formatCurrency(summary.periodTicketJoined)} · 객실 {formatCurrency(summary.periodRoomJoined)} · 골프 {formatCurrency(summary.periodGolfJoined)}
                      </div>
                    </div>
                    <div className="p-5 rounded-2xl bg-white border border-[#D0C6BB]/75">
                      <div className="text-xs font-bold text-[#5A6B63]">연간 동기 대비 가입 성장률 (YoY)</div>
                      <div className={`text-2xl font-black mt-1 ${Number(summary.growthRate || 0) >= 0 ? 'text-[#1E523F]' : 'text-[#8B2635]'}`}>
                        {summary.growthRate != null
                          ? `${Number(summary.growthRate) >= 0 ? '▲' : '▼'} ${Math.abs(Number(summary.growthRate))}%`
                          : '-'}
                      </div>
                      <div className="text-[11px] text-[#5A6B63] mt-1">
                        현재 전체 누적 회원: {formatCurrency(summary.totalCumulativeMembers ?? summary.totalActiveMembers)}명
                      </div>
                    </div>
                  </div>

                  {yearlyTrends.length > 0 ? (
                    <div className="overflow-x-auto rounded-2xl border border-[#D0C6BB]/75">
                      <table className="w-full text-xs whitespace-nowrap font-financial">
                        <thead className="bg-[#F4F3EE] text-[#1B382E] font-bold border-b border-[#D0C6BB]/75">
                          <tr>
                            <th className="py-3 px-4 text-left">연도</th>
                            <th className="py-3 px-4 text-right">연간 신규 가입자</th>
                            <th className="py-3 px-4 text-right">티켓 가입</th>
                            <th className="py-3 px-4 text-right">객실 가입</th>
                            <th className="py-3 px-4 text-right">골프 가입</th>
                            <th className="py-3 px-4 text-right">연말 누적 회원수</th>
                            <th className="py-3 px-4 text-right">전년 대비 성장률</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#D0C6BB]/30">
                          {yearlyTrends.map((yr: any, idx: number) => (
                            <tr key={yr.year || idx} className="hover:bg-[#F4F3EE]/50">
                              <td className="py-3 px-4 font-extrabold text-[#1B382E]">{yr.year}년</td>
                              <td className="py-3 px-4 text-right font-black text-[#1E523F]">+{formatCurrency(yr.joined)}명</td>
                              <td className="py-3 px-4 text-right">{formatCurrency(yr.ticketJoined)}명</td>
                              <td className="py-3 px-4 text-right">{formatCurrency(yr.roomJoined)}명</td>
                              <td className="py-3 px-4 text-right">{formatCurrency(yr.golfJoined)}명</td>
                              <td className="py-3 px-4 text-right font-bold text-[#1B382E]">{formatCurrency(yr.cumulative)}명</td>
                              <td className="py-3 px-4 text-right font-bold">
                                {yr.growthRate != null ? `${yr.growthRate}%` : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-5 rounded-2xl bg-[#F4F3EE]/80 border border-dashed border-[#D0C6BB] text-xs text-[#5A6B63] flex items-start gap-3">
                      <Clock size={16} className="text-[#284F42] shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-[#1B382E]">
                          다개년(2023~2026년) 연도별 가입 추세 완제품 배열(`yearlyTrends[]`) — 백엔드 Ticket 75 요청 등록 완료
                        </div>
                        <p className="mt-1 leading-relaxed">
                          Zero-Proxy 원칙에 따라 클라이언트에서 월별 배열을 임의 합산하지 않으며, 백엔드 <code className="font-mono text-[#1B382E]">GET /api/v6/report/online-members</code>에 <code className="font-mono text-[#1B382E]">yearlyTrends[]</code> 배열이 추가 배포되는 즉시 다개년 연도별 비교 표가 자동 활성화됩니다.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 4. SECTION 2: 유입 채널 구성 · 충성도 퍼널 · 15)고객 인구통계 프로파일 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* 좌측 4칸: 최초 유입 채널 및 복합 이용 VIP 도넛 */}
              <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-[#D0C6BB]/75 shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-[#1B382E] flex items-center gap-2">
                    <PieChart size={18} className="text-[#284F42]" />
                    이용 부문별 회원 구성 & 복합 VIP
                  </h3>
                  <p className="text-xs text-[#5A6B63] mt-0.5">
                    단일 부문 이용객 vs 2개 이상 부문(객실+골프+티켓) 교차 이용 VIP 비중
                  </p>
                </div>
                <div className="h-[250px] w-full my-2">
                  <ReactECharts option={pieOptions} style={{ height: '100%', width: '100%' }} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-financial">
                  <div className="p-2.5 rounded-xl bg-[#F4F3EE] border border-[#D0C6BB]/60 flex justify-between">
                    <span className="text-[#5A6B63]">티켓 전용</span>
                    <strong className="text-[#1B382E]">{formatCurrency(channelBreakdown.ticketOnly)}명</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F4F3EE] border border-[#D0C6BB]/60 flex justify-between">
                    <span className="text-[#5A6B63]">객실 전용</span>
                    <strong className="text-[#1B382E]">{formatCurrency(channelBreakdown.roomOnly)}명</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F4F3EE] border border-[#D0C6BB]/60 flex justify-between">
                    <span className="text-[#5A6B63]">골프 전용</span>
                    <strong className="text-[#1B382E]">{formatCurrency(channelBreakdown.golfOnly)}명</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#E8F2EE] border border-[#284F42]/30 flex justify-between">
                    <span className="text-[#1E523F] font-bold">👑 복합 VIP</span>
                    <strong className="text-[#1E523F]">{formatCurrency(channelBreakdown.multiChannel)}명</strong>
                  </div>
                </div>
              </div>

              {/* 중앙 4칸: 고객 충성도 전환 퍼널 */}
              <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-[#D0C6BB]/75 shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-[#1B382E] flex items-center gap-2">
                    <TrendingUp size={18} className="text-[#B59269]" />
                    온라인 회원 재방문 & 충성도 퍼널
                  </h3>
                  <p className="text-xs text-[#5A6B63] mt-0.5">
                    1회 단발 방문객이 진성 재방문 단골 및 복합 채널 VIP로 전환되는 비율
                  </p>
                </div>
                <div className="h-[280px] w-full my-2">
                  <ReactECharts option={funnelOptions} style={{ height: '100%', width: '100%' }} />
                </div>
                <div className="p-3 rounded-xl bg-[#F4F3EE] border border-[#D0C6BB]/60 text-xs text-[#5A6B63] flex items-center justify-between font-financial">
                  <span>1회 단발 구매 회원: <strong className="text-[#1B382E]">{formatCurrency(summary.oneTimeBuyers)}명</strong></span>
                  <span>2회+ 재구매 전환: <strong className="text-[#1E523F]">{formatCurrency(summary.repeatBuyers)}명</strong></span>
                </div>
              </div>

              {/* 우측 4칸: 15)고객 마스터 프로파일 (거주 권역 · 연령대 · 마케팅 수신동의) */}
              <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-[#D0C6BB]/75 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-extrabold text-[#1B382E] flex items-center gap-2">
                      <MapPin size={18} className="text-[#284F42]" />
                      15)고객 마스터 프로파일 & 수신동의
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]">
                      dim_customer_master_v6
                    </span>
                  </div>
                  <p className="text-xs text-[#5A6B63] mt-0.5">
                    거주 권역(시/도), 연령대 분포 및 SMS·이메일 마케팅 수신동의 모수
                  </p>
                </div>

                {demographics ? (
                  <div className="space-y-3 my-3 font-financial text-xs">
                    {demographics.consentSummary && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 rounded-xl bg-[#E8F2EE] border border-[#B4C6C1]/70">
                          <div className="text-[11px] text-[#1E523F] font-bold">SMS 마케팅 동의(Y)</div>
                          <div className="text-lg font-black text-[#1B382E] mt-0.5">
                            {formatCurrency(demographics.consentSummary.smsConsentCount)}명
                          </div>
                          <div className="text-[10px] text-[#1E523F]">동의율 {demographics.consentSummary.smsConsentRatePct ?? '-'}%</div>
                        </div>
                        <div className="p-3 rounded-xl bg-[#F4F3EE] border border-[#D0C6BB]/70">
                          <div className="text-[11px] text-[#5A6B63] font-bold">이메일 수신동의(Y)</div>
                          <div className="text-lg font-black text-[#1B382E] mt-0.5">
                            {formatCurrency(demographics.consentSummary.emailConsentCount)}명
                          </div>
                          <div className="text-[10px] text-[#5A6B63]">동의율 {demographics.consentSummary.emailConsentRatePct ?? '-'}%</div>
                        </div>
                      </div>
                    )}
                    {Array.isArray(demographics.byRegion) && demographics.byRegion.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[11px] font-bold text-[#1B382E]">주요 거주 권역 Top 분포</div>
                        {demographics.byRegion.slice(0, 4).map((r: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-[#D0C6BB]/30">
                            <span className="font-semibold text-[#1B382E]">{r.regionSido}</span>
                            <span className="text-[#5A6B63]">{formatCurrency(r.memberCount)}명 ({r.sharePct}%)</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="my-4 p-4 rounded-2xl bg-[#F4F3EE]/80 border border-dashed border-[#D0C6BB] text-xs space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-[#1B382E]">
                      <MailCheck size={15} className="text-[#284F42]" />
                      <span>15)고객 마스터 DB 적재 완료 · API 응답 필드 연결 대기 (Ticket 74/75)</span>
                    </div>
                    <p className="text-[11px] text-[#5A6B63] leading-relaxed">
                      백엔드 <code className="font-mono text-[#1B382E]">dim_customer_master_v6</code> 테이블에 성별·연령대(<code className="font-mono">age_group</code>)·거주권역(<code className="font-mono">region_sido</code>)·수신동의(<code className="font-mono">sms_consent</code>) 정규화가 완료되었으며, API 응답 노출(Ticket 74/75) 즉시 본 영역에 실측 분포가 표시됩니다.
                    </p>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-[#E8F2EE]/70 border border-[#B4C6C1]/60 text-[11px] text-[#1E523F] font-medium">
                  하단 Win-back 타겟 원장에서 등급·채널·수신동의별 핀셋 타겟팅이 가능합니다.
                </div>
              </div>
            </div>

            {/* 5. SECTION 3: 이용횟수 등급별 휴면율 & 실행형 Win-back 핀셋 타겟 추출기 */}
            <div className="bg-white rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] overflow-hidden">
              <div className="p-6 border-b border-[#D0C6BB]/60 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#F4F3EE]/40">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#8B2635] text-white">
                      CHURN & WIN-BACK CRM
                    </span>
                    <span className="text-xs text-[#5A6B63] font-mono">
                      API: /api/v6/report/online-member-dormancy
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-[#1B382E] mt-1.5">
                    이용횟수 등급별 휴면 전환율 및 실행형 Win-back 핀셋 타겟 원장
                  </h2>
                  <p className="text-xs text-[#5A6B63] mt-0.5">
                    4회 이상 방문한 검증된 단골/충성 고객 중 최근 6개월 이상 발길이 끊긴 휴면 고객({formatCurrency(dormancyIntel?.summary?.winbackTargetsTotal)}명)을 등급·채널·마케팅 동의별로 추출합니다.
                  </p>
                </div>
                {dormancyIntel && (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]">
                    <CheckCircle2 size={14} />
                    dim_online_members_v6 정규 마트 연동
                  </span>
                )}
              </div>

              {!dormancyIntel ? (
                <div className="p-8 text-center text-xs text-[#5A6B63]">
                  휴면 단골 분석 데이터를 불러올 수 없습니다 (/api/v6/report/online-member-dormancy).
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  {/* 이용 횟수 등급별 코호트 테이블 */}
                  <div className="rounded-2xl border border-[#D0C6BB]/75 overflow-hidden">
                    <div className="px-4 py-3 bg-[#F4F3EE] border-b border-[#D0C6BB]/75 flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-extrabold text-[#1B382E]">
                        이용 횟수 등급별 회원 분포 및 6개월 미방문 휴면 전환율
                      </span>
                      <span className="text-[11px] text-[#5A6B63]">
                        전체 휴면율: <strong className="text-[#8B2635]">{dormancyIntel.summary?.overallDormancyRate ?? '-'}%</strong> ({formatCurrency(dormancyIntel.summary?.dormantMembers)}명)
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs font-financial whitespace-nowrap">
                        <thead className="bg-[#F4F3EE]/80 text-[#1B382E] font-bold border-b border-[#D0C6BB]/75">
                          <tr>
                            <th className="py-2.5 px-4 text-left">이용 횟수 등급</th>
                            <th className="py-2.5 px-4 text-right">전체 회원수</th>
                            <th className="py-2.5 px-4 text-right">회원 비중</th>
                            <th className="py-2.5 px-4 text-right">최근 6개월 활성</th>
                            <th className="py-2.5 px-4 text-right">6개월+ 미방문 휴면</th>
                            <th className="py-2.5 px-4 text-right">휴면 전환율</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#D0C6BB]/30">
                          {(dormancyIntel.tiers || []).map((tier: any, idx: number) => (
                            <tr key={tier.tierCode || idx} className="hover:bg-[#F4F3EE]/50 text-[#1B382E]">
                              <td className="py-3 px-4 font-bold text-[#1B382E]">{tier.tierName ?? '-'}</td>
                              <td className="py-3 px-4 text-right font-semibold">
                                {tier.totalMembers != null ? `${formatCurrency(tier.totalMembers)}명` : '-'}
                              </td>
                              <td className="py-3 px-4 text-right text-[#5A6B63]">
                                {tier.memberShare != null ? `${tier.memberShare}%` : '-'}
                              </td>
                              <td className="py-3 px-4 text-right text-[#1E523F] font-semibold">
                                {tier.activeMembers != null ? `${formatCurrency(tier.activeMembers)}명` : '-'}
                              </td>
                              <td className="py-3 px-4 text-right text-[#8B2635] font-bold">
                                {tier.dormantMembers != null ? `${formatCurrency(tier.dormantMembers)}명` : '-'}
                              </td>
                              <td className="py-3 px-4 text-right font-black text-[#8B2635]">
                                {tier.dormancyRate != null ? `${tier.dormancyRate}%` : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 실행형 Win-back 핀셋 타겟 필터 & 원장 */}
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-[#F4F3EE]/80 border border-[#D0C6BB]/70 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-extrabold text-[#1B382E] flex items-center gap-1">
                          <Filter size={14} className="text-[#8B2635]" /> 등급 필터:
                        </span>
                        {(
                          [
                            { key: 'ALL', label: `전체 타겟 (${rawWinbackTargets.length}명)` },
                            { key: 'LOYAL', label: '👑 10회+ 충성 휴면' },
                            { key: 'REGULAR', label: '4~9회 단골 휴면' }
                          ] as const
                        ).map((tab) => (
                          <button
                            key={tab.key}
                            type="button"
                            onClick={() => setWinbackTierFilter(tab.key)}
                            className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                              winbackTierFilter === tab.key
                                ? 'bg-[#8B2635] text-white'
                                : 'bg-white text-[#5A6B63] border border-[#D0C6BB]/70 hover:text-[#1B382E]'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}

                        <span className="text-xs font-extrabold text-[#1B382E] ml-2">채널:</span>
                        {['ALL', 'MULTI', 'GOLF', 'ROOM', 'TICKET'].map((ch) => (
                          <button
                            key={ch}
                            type="button"
                            onClick={() => setWinbackChannelFilter(ch)}
                            className={`px-2.5 py-1 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                              winbackChannelFilter === ch
                                ? 'bg-[#284F42] text-white'
                                : 'bg-white text-[#5A6B63] border border-[#D0C6BB]/70 hover:text-[#1B382E]'
                            }`}
                          >
                            {ch === 'ALL' ? '전체' : ch === 'MULTI' ? '복합VIP' : ch}
                          </button>
                        ))}

                        <button
                          type="button"
                          onClick={() => setWinbackConsentFilter((prev) => (prev === 'ALL' ? 'SMS_Y' : 'ALL'))}
                          className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer transition-colors border ${
                            winbackConsentFilter === 'SMS_Y'
                              ? 'bg-[#1E523F] text-white border-[#1E523F]'
                              : 'bg-white text-[#1E523F] border-[#1E523F]/40'
                          }`}
                        >
                          SMS 수신동의(Y)만
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6B63]" />
                          <input
                            type="text"
                            value={winbackSearch}
                            onChange={(e) => setWinbackSearch(e.target.value)}
                            placeholder="고객명, ID, 연락처 검색..."
                            className="pl-8 pr-3 py-1.5 rounded-xl bg-white border border-[#D0C6BB] text-xs text-[#1B382E] focus:outline-none focus:border-[#284F42] w-48"
                          />
                        </div>
                        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#D0C6BB]/70 text-xs font-bold">
                          <button
                            type="button"
                            onClick={() => setWinbackSortMode('bookingsDesc')}
                            className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                              winbackSortMode === 'bookingsDesc' ? 'bg-[#1B382E] text-white' : 'text-[#5A6B63]'
                            }`}
                          >
                            이용횟수순
                          </button>
                          <button
                            type="button"
                            onClick={() => setWinbackSortMode('dormantDesc')}
                            className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                              winbackSortMode === 'dormantDesc' ? 'bg-[#1B382E] text-white' : 'text-[#5A6B63]'
                            }`}
                          >
                            휴면경과일순
                          </button>
                          <button
                            type="button"
                            onClick={() => setWinbackSortMode('recentActivity')}
                            className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                              winbackSortMode === 'recentActivity' ? 'bg-[#1B382E] text-white' : 'text-[#5A6B63]'
                            }`}
                          >
                            최근방문순
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#D0C6BB]/75 overflow-hidden">
                      <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                        <table className="w-full text-xs whitespace-nowrap font-financial">
                          <thead className="sticky top-0 z-10 bg-[#F4F3EE] text-[#1B382E] font-bold border-b border-[#D0C6BB]/75">
                            <tr>
                              <th className="py-3 px-4 text-left">고객명 (온라인ID)</th>
                              <th className="py-3 px-3 text-left">연락처</th>
                              <th className="py-3 px-3 text-center">등급</th>
                              <th className="py-3 px-3 text-center">이용 채널 (최초유입)</th>
                              <th className="py-3 px-3 text-right">누적 이용횟수</th>
                              <th className="py-3 px-3 text-center">최초 ~ 최종 활동일</th>
                              <th className="py-3 px-3 text-right">휴면 경과일</th>
                              <th className="py-3 px-4 text-left">15)고객 마스터 속성 (동의/권역/연령)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#D0C6BB]/30">
                            {filteredWinbackTargets.map((t: any, idx: number) => (
                              <tr key={t.memberKey || idx} className="hover:bg-[#F4F3EE]/50 text-[#1B382E]">
                                <td className="py-2.5 px-4 font-bold text-[#1B382E]">
                                  {t.custName || '-'}
                                  {t.onlineId && t.onlineId !== '-' && (
                                    <span className="ml-1.5 text-[10px] font-mono text-[#5A6B63]">({t.onlineId})</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-[#5A6B63]">{t.maskedPhone || t.phone || '-'}</td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    t.tierCode === 'LOYAL'
                                      ? 'bg-[#B59269]/15 text-[#8C6839] border-[#B59269]/40'
                                      : 'bg-[#E8F2EE] text-[#1E523F] border-[#B4C6C1]/70'
                                  }`}>
                                    {t.tierName || t.tierCode || '-'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className="font-bold text-[#1B382E]">{t.channelSource || '-'}</span>
                                  {t.firstChannel && t.firstChannel !== t.channelSource && (
                                    <span className="text-[10px] text-[#5A6B63] ml-1">(최초:{t.firstChannel})</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right font-black text-[#1B382E]">
                                  {t.totalBookings != null ? `${formatCurrency(t.totalBookings)}회` : '-'}
                                </td>
                                <td className="py-2.5 px-3 text-center text-[#5A6B63]">
                                  <div>{t.firstActivityDate || '-'} ~ <strong className="text-[#1B382E]">{t.lastActivityDate || '-'}</strong></div>
                                  {t.lastLoginAt && (
                                    <div className="text-[10px] text-[#1E523F]">최종로그인: {String(t.lastLoginAt).substring(0, 10)}</div>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right font-black text-[#8B2635]">
                                  {t.dormantDays != null ? `${formatCurrency(t.dormantDays)}일` : '-'}
                                </td>
                                <td className="py-2.5 px-4 text-left">
                                  {t.smsConsent || t.emailConsent || t.regionSido || t.ageGroup ? (
                                    <div className="flex flex-wrap gap-1">
                                      {t.smsConsent && (
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${t.smsConsent === 'Y' ? 'bg-[#E8F2EE] text-[#1E523F]' : 'bg-[#F4F3EE] text-[#5A6B63]'}`}>
                                          SMS:{t.smsConsent}
                                        </span>
                                      )}
                                      {t.emailConsent && (
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${t.emailConsent === 'Y' ? 'bg-[#E8F2EE] text-[#1E523F]' : 'bg-[#F4F3EE] text-[#5A6B63]'}`}>
                                          Email:{t.emailConsent}
                                        </span>
                                      )}
                                      {t.regionSido && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#F4F3EE] text-[#1B382E] border border-[#D0C6BB]/60">
                                          {t.regionSido}
                                        </span>
                                      )}
                                      {t.ageGroup && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#F4F3EE] text-[#5A6B63]">
                                          {t.ageGroup}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-[#5A6B63]/60">Ticket 74 연동 대기</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                            {filteredWinbackTargets.length === 0 && (
                              <tr>
                                <td colSpan={8} className="py-10 text-center text-[#5A6B63]">
                                  선택한 필터 조건에 해당하는 Win-back 타겟 회원이 없습니다.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 6. SECTION 4: 최근 가입/활동 온라인 회원 실시간 명단 */}
            <div className="bg-white p-6 rounded-3xl border border-[#D0C6BB]/75 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-[#1B382E] flex items-center gap-2">
                    <Users size={18} className="text-[#284F42]" />
                    최근 신규 가입 및 활동 회원 실시간 명단 ({filteredRecentMembers.length}명)
                  </h3>
                  <p className="text-xs text-[#5A6B63] mt-0.5">
                    최근 리조트 온라인 채널(티켓·객실·골프)에 가입하거나 예약/결제한 회원 목록입니다.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 bg-[#F4F3EE] p-1 rounded-xl border border-[#D0C6BB]/60 text-xs font-bold">
                    {['ALL', 'TICKET', 'ROOM', 'GOLF'].map((ch) => (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => setRecentChannelFilter(ch)}
                        className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                          recentChannelFilter === ch ? 'bg-[#284F42] text-white' : 'text-[#5A6B63]'
                        }`}
                      >
                        {ch === 'ALL' ? '전체' : ch}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6B63]" />
                    <input
                      type="text"
                      value={recentSearch}
                      onChange={(e) => setRecentSearch(e.target.value)}
                      placeholder="회원명, 연락처 검색..."
                      className="pl-8 pr-3 py-1.5 rounded-xl bg-[#F4F3EE] border border-[#D0C6BB] text-xs text-[#1B382E] focus:outline-none focus:bg-white w-44"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-[#D0C6BB]/75">
                <table className="w-full text-left text-xs whitespace-nowrap font-financial">
                  <thead className="bg-[#F4F3EE] text-[#1B382E] font-bold border-b border-[#D0C6BB]/75">
                    <tr>
                      <th className="px-4 py-3">고객명 (온라인ID)</th>
                      <th className="px-4 py-3">연락처</th>
                      <th className="px-4 py-3 text-center">최초 유입 채널</th>
                      <th className="px-4 py-3 text-center">최초 활동일</th>
                      <th className="px-4 py-3 text-center">최근 활동일</th>
                      <th className="px-4 py-3 text-right">누적 예약 건수</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D0C6BB]/30">
                    {filteredRecentMembers.slice(0, 20).map((m: any, idx: number) => (
                      <tr key={m.memberKey || idx} className="hover:bg-[#F4F3EE]/50 text-[#1B382E] transition-colors">
                        <td className="px-4 py-3 font-bold text-[#1B382E]">
                          {m.custName}
                          {m.onlineId && m.onlineId !== '-' && (
                            <span className="ml-1.5 text-[10px] font-mono text-[#5A6B63]">({m.onlineId})</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[#5A6B63] font-mono">{m.phone}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]/70 rounded-md font-bold">
                            {m.firstChannel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-[#5A6B63]">{m.firstActivityDate}</td>
                        <td className="px-4 py-3 text-center font-semibold text-[#1B382E]">{m.lastActivityDate || m.firstActivityDate}</td>
                        <td className="px-4 py-3 text-right font-bold text-[#1E523F]">
                          {m.totalBookings != null ? `${formatCurrency(m.totalBookings)}건` : '-'}
                        </td>
                      </tr>
                    ))}
                    {filteredRecentMembers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-[#5A6B63]">
                          조회된 회원 내역이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
