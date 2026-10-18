import { useState, useEffect, useMemo, Fragment } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  Users,
  Trophy,
  Store,
  Sparkles,
  Search,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  BedDouble,
  Receipt,
  Building2,
  Flame,
  AlertCircle,
  Moon,
  Filter
} from 'lucide-react';
import GlobalDatePicker from '../GlobalDatePicker';
import ContentDivisionNav from './ContentDivisionNav';
import { useDate } from '../../contexts/DateContext';
import { secureFetcher } from '../../lib/secureFetcher';
import { getLatestClosedDateStr } from '../../lib/dateUtils';
import type {
  GroupVenuePreferenceResponse,
  VenueGroupRankingItem,
  GroupConsumptionTrailItem,
  SegmentPreferenceMatrixItem,
  StaySurgeCorrelationItem,
  SurgeGradeType
} from '../../types/reports-v2';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

export interface GroupVenuePreferenceSectionProps {
  initialVenueCategory?: 'ALL' | 'FNB' | 'LEISURE';
  mode?: 'RANKINGS_ONLY' | 'SEGMENTS_AND_TRAILS' | 'ALL';
  isStandalonePage?: boolean;
  onVenueRankingsLoaded?: (rankings: VenueGroupRankingItem[], summary?: GroupVenuePreferenceResponse['meta']) => void;
}

type RankingSortKey = 'rank' | 'groupCount' | 'revenue' | 'avgSpend' | 'surgePct';

const SURGE_GRADE_META: Record<SurgeGradeType, { label: string; badgeClass: string; deltaClass: string }> = {
  EXPLOSIVE: {
    label: '급증 (Explosive)',
    badgeClass: 'bg-rose-600 text-white border-rose-700 shadow-2xs',
    deltaClass: 'text-rose-600 font-black'
  },
  HIGH: {
    label: '고성장 (High)',
    badgeClass: 'bg-amber-500 text-slate-950 border-amber-600',
    deltaClass: 'text-amber-700 font-extrabold'
  },
  MODERATE: {
    label: '상승 (Moderate)',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    deltaClass: 'text-emerald-700 font-bold'
  },
  STABLE: {
    label: '안정 (Stable)',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    deltaClass: 'text-slate-600 font-semibold'
  }
};

const STACKED_BAR_COLORS = [
  'bg-emerald-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-rose-500',
  'bg-teal-500'
];

export default function GroupVenuePreferenceSection({
  initialVenueCategory = 'ALL',
  mode = 'ALL',
  isStandalonePage = false,
  onVenueRankingsLoaded
}: GroupVenuePreferenceSectionProps) {
  const { startDate, endDate } = useDate();

  const [venueCategory, setVenueCategory] = useState<string>(initialVenueCategory);
  const [groupSegment, setGroupSegment] = useState<string>('ALL');
  const [searchInput, setSearchInput] = useState<string>('');
  const [appliedSearch, setAppliedSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<RankingSortKey>('rank');
  const [internalTab, setInternalTab] = useState<'RANKINGS' | 'SEGMENTS'>('RANKINGS');
  const [expandedGroupCodes, setExpandedGroupCodes] = useState<Record<string, boolean>>({});

  const [data, setData] = useState<GroupVenuePreferenceResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSleeping, setIsSleeping] = useState<boolean>(false);
  const [refreshTick, setRefreshTick] = useState<number>(0);

  useEffect(() => {
    let isCancelled = false;

    const fetchGroupPreference = async () => {
      setLoading(true);
      setError(null);
      setIsSleeping(false);

      const latestClosed = getLatestClosedDateStr();
      const defaultStart = `${latestClosed.substring(0, 7)}-01`;
      const queryStart = startDate || defaultStart;
      const queryEnd = endDate || latestClosed;

      const params = new URLSearchParams();
      params.set('startDate', queryStart);
      params.set('endDate', queryEnd);
      if (venueCategory && venueCategory !== 'ALL') params.set('venueCategory', venueCategory);
      if (groupSegment && groupSegment !== 'ALL') params.set('groupSegment', groupSegment);
      if (appliedSearch.trim()) params.set('search', appliedSearch.trim());

      try {
        const res = await secureFetcher(`${API_BASE}/api/v6/report/group-venue-preference?${params.toString()}`);
        if (isCancelled) return;

        const payload: GroupVenuePreferenceResponse = res?.data && res?.data?.venueRankings ? res.data : res;

        if (payload?.isPowerSaving || payload?.status === 'SERVER_SLEEPING') {
          setIsSleeping(true);
          setData(null);
          return;
        }

        if (payload && (Array.isArray(payload.venueRankings) || payload.meta?.summary)) {
          setData(payload);
          if (onVenueRankingsLoaded && Array.isArray(payload.venueRankings)) {
            onVenueRankingsLoaded(payload.venueRankings, payload.meta);
          }
          if (Array.isArray(payload.groupTrails) && payload.groupTrails.length > 0) {
            const initialExpanded: Record<string, boolean> = {};
            payload.groupTrails.slice(0, 3).forEach((g) => {
              const key = g.groupCode || g.groupName;
              if (key) initialExpanded[key] = true;
            });
            setExpandedGroupCodes(initialExpanded);
          }
        } else {
          setData(null);
          setError(payload?.message || payload?.error || '단체 영업장 선호도 및 평균 매출 리포트 데이터를 불러올 수 없습니다.');
        }
      } catch (err: any) {
        if (!isCancelled) {
          if (err?.status === 503 || String(err?.message || '').includes('503')) {
            setIsSleeping(true);
          } else {
            setError('백엔드 단체 영업장 선호도 API(/api/v6/report/group-venue-preference) 연동 준비 중이거나 응답을 확인할 수 없습니다.');
          }
          setData(null);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchGroupPreference();
    return () => {
      isCancelled = true;
    };
  }, [startDate, endDate, venueCategory, groupSegment, appliedSearch, refreshTick]);

  // 단순 정렬만 수행 (클라이언트 사칙연산 일체 없음)
  const sortedVenueRankings = useMemo(() => {
    const list = data?.venueRankings ? [...data.venueRankings] : [];
    return list.sort((a, b) => {
      if (sortBy === 'groupCount') return (b.totalGroupCount || 0) - (a.totalGroupCount || 0);
      if (sortBy === 'revenue') return (b.totalGroupRevenue || 0) - (a.totalGroupRevenue || 0);
      if (sortBy === 'avgSpend') return (b.b2bAvgSpendPerGroup || 0) - (a.b2bAvgSpendPerGroup || 0);
      if (sortBy === 'surgePct') return (b.revenueSurgePct || 0) - (a.revenueSurgePct || 0);
      return (a.rank || 0) - (b.rank || 0);
    });
  }, [data?.venueRankings, sortBy]);

  const toggleGroupTrail = (key: string) => {
    setExpandedGroupCodes((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const expandAllTrails = (expand: boolean) => {
    if (!data?.groupTrails) return;
    if (!expand) {
      setExpandedGroupCodes({});
      return;
    }
    const next: Record<string, boolean> = {};
    data.groupTrails.forEach((g) => {
      const k = g.groupCode || g.groupName;
      if (k) next[k] = true;
    });
    setExpandedGroupCodes(next);
  };

  const handleResetFilters = () => {
    setVenueCategory('ALL');
    setGroupSegment('ALL');
    setSearchInput('');
    setAppliedSearch('');
    setSortBy('rank');
  };

  // ⑤ 숙박 단체 규모별 식음 고액 영수증 급증 상관관계 차트 옵션
  const staySurgeChartOption = useMemo(() => {
    const items: StaySurgeCorrelationItem[] = data?.staySurgeCorrelation || [];
    if (items.length === 0) return null;

    const labels = items.map((item) => item.tierName || '-');
    const dailyFnbSeries = items.map((item) => item.avgDailyFnbRevenue ?? 0);
    const bigTicketRevSeries = items.map((item) => item.avgBigTicketRevenue ?? 0);
    const bigTicketCntSeries = items.map((item) => item.avgBigTicketCount ?? 0);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      legend: {
        data: ['식음 전체 일평균 매출', '고액 영수증 일평균 매출', '고액 영수증 일평균 건수'],
        bottom: 0
      },
      grid: { left: '3%', right: '4%', bottom: '15%', top: '12%', containLabel: true },
      xAxis: [
        {
          type: 'category',
          data: labels,
          axisLabel: { fontWeight: 'bold', color: '#334155' }
        }
      ],
      yAxis: [
        {
          type: 'value',
          name: '일평균 매출 (원)',
          axisLabel: {
            formatter: (v: number) => {
              if (Math.abs(v) >= 100000000) return `${Math.round(v / 100000000)}억`;
              if (Math.abs(v) >= 10000) return `${Math.round(v / 10000)}만`;
              return `${v}`;
            }
          }
        },
        {
          type: 'value',
          name: '일평균 건수 (건)',
          axisLabel: {
            formatter: (v: number) => `${v}건`
          }
        }
      ],
      series: [
        {
          name: '식음 전체 일평균 매출',
          type: 'bar',
          data: dailyFnbSeries,
          itemStyle: { color: '#0f172a', borderRadius: [6, 6, 0, 0] },
          barMaxWidth: 36
        },
        {
          name: '고액 영수증 일평균 매출',
          type: 'bar',
          data: bigTicketRevSeries,
          itemStyle: { color: '#10b981', borderRadius: [6, 6, 0, 0] },
          barMaxWidth: 36
        },
        {
          name: '고액 영수증 일평균 건수',
          type: 'line',
          yAxisIndex: 1,
          data: bigTicketCntSeries,
          itemStyle: { color: '#f59e0b' },
          lineStyle: { width: 3 },
          symbolSize: 8
        }
      ]
    };
  }, [data?.staySurgeCorrelation]);

  const summary = data?.meta?.summary;
  const period = data?.meta?.period;
  const venueRankings: VenueGroupRankingItem[] = sortedVenueRankings;
  const segmentMatrix: SegmentPreferenceMatrixItem[] = data?.segmentPreferenceMatrix || [];
  const groupTrails: GroupConsumptionTrailItem[] = data?.groupTrails || [];
  const staySurgeList: StaySurgeCorrelationItem[] = data?.staySurgeCorrelation || [];

  const highTicketThresholdLabel = '단체 고액 결제';

  const showRankings =
    mode === 'RANKINGS_ONLY' || (mode === 'ALL' && internalTab === 'RANKINGS');
  const showSegmentsAndTrails =
    mode === 'SEGMENTS_AND_TRAILS' || (mode === 'ALL' && internalTab === 'SEGMENTS');

  const headerTitle =
    mode === 'RANKINGS_ONLY'
      ? '영업장별 단체 방문 순위 · 단체 방문 시 평균 매출 및 급증률'
      : mode === 'SEGMENTS_AND_TRAILS'
      ? '단체 유형별 선호 매장 · 평균 매출 및 리조트 내 방문 동선'
      : '영업장별 단체 방문 순위 · 단체 유형별 선호도 · 단체 방문 시 평균 매출 & 급증률';

  const headerDesc =
    mode === 'RANKINGS_ONLY'
      ? '각 식음·부대 영업장에 단체가 얼마나 많이 방문하는지(유치 순위), 단체가 왔을 때 1팀당 평균 매출과 매장 일평균 매출 급증률은 얼마인지 정리합니다.'
      : mode === 'SEGMENTS_AND_TRAILS'
      ? '어떤 단체 종류(대기업·공공기관·학교·여행사)가 방문했을 때 매출이 크게 늘어나는지, 단체별 선호 영업장 공식과 1:N 실제 매장 방문 동선을 분석합니다.'
      : '각 영업장에 단체가 얼마나 방문하는지(순위), 어떤 단체 종류가 방문했을 때 매출이 늘어나는지, 단체 방문 시 평균 매출을 종합 분석합니다.';

  return (
    <section
      id="group-venue-preference-section"
      className={
        isStandalonePage
          ? 'p-4 sm:p-6 lg:p-8 max-w-[1650px] mx-auto space-y-6'
          : 'space-y-6 pt-4 border-t-2 border-slate-200/90'
      }
    >
      {/* 섹션 헤더 배너 */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-emerald-950 rounded-3xl p-6 sm:p-8 text-white shadow-lg">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-bold">
              <Users size={14} />
              <span>컨텐츠기획본부 · 숙박·연회 단체 × 식음/부대 영업장 분석</span>
              {period?.startDate && period?.endDate && (
                <span className="text-emerald-300 font-mono ml-1">
                  ({period.startDate} ~ {period.endDate}
                  {period.totalDays != null ? ` · ${period.totalDays}일간` : ''})
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight flex flex-wrap items-center gap-2.5">
              <span>{headerTitle}</span>
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-4xl leading-relaxed">
              {headerDesc}
            </p>
          </div>

          {isStandalonePage && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <GlobalDatePicker />
            </div>
          )}
        </div>
      </div>

      {/* 단독 페이지일 때 컨텐츠기획본부 4대 페이지 상단 탭 네비게이션 */}
      {isStandalonePage && <ContentDivisionNav />}

      {/* 필터 컨트롤 바 & (ALL 모드일 때) 뷰 전환 스위치 */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 mr-1">
            <Filter size={14} className="text-emerald-600" />
            <span>분석 조건 필터</span>
          </div>

          {/* 매장 구분 */}
          <select
            value={venueCategory}
            onChange={(e) => setVenueCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="ALL">전체 매장 (식음+레저)</option>
            <option value="FNB">식음 매장 (F&B)</option>
            <option value="LEISURE">레저/부대시설</option>
          </select>

          {/* 단체 유형 */}
          <select
            value={groupSegment}
            onChange={(e) => setGroupSegment(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="ALL">전체 단체 유형</option>
            <option value="ENTERPRISE">대기업/중견기업</option>
            <option value="PUBLIC">공공/교육청/군/협회</option>
            <option value="SCHOOL">초·중·고/대학</option>
            <option value="TRAVEL">여행사/패스</option>
          </select>

          {/* 키워드 검색 */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setAppliedSearch(searchInput);
              }}
              placeholder="단체명·영업장 검색 (예: 네패스)"
              className="bg-transparent text-slate-800 text-xs px-3 py-2 outline-none w-48 placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={() => setAppliedSearch(searchInput)}
              className="px-2.5 py-2 text-slate-500 hover:text-emerald-600 transition-colors cursor-pointer"
              title="검색 실행"
            >
              <Search size={14} />
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetFilters}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            title="필터 초기화"
          >
            <RotateCcw size={13} />
            <span>초기화</span>
          </button>
        </div>

        {mode === 'ALL' && (
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold gap-1">
            <button
              type="button"
              onClick={() => setInternalTab('RANKINGS')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                internalTab === 'RANKINGS'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🏆 영업장별 단체 순위 & 평균매출
            </button>
            <button
              type="button"
              onClick={() => setInternalTab('SEGMENTS')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                internalTab === 'SEGMENTS'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🏢 단체 유형별 선호도 & 방문동선
            </button>
          </div>
        )}
      </div>

      {/* 로딩 / 절전 / 에러 / 대기 상태 처리 */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="bg-white rounded-2xl p-5 border border-slate-200 animate-pulse space-y-3">
              <div className="h-3.5 w-28 bg-slate-200 rounded" />
              <div className="h-7 w-36 bg-slate-200 rounded" />
              <div className="h-3 w-32 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : isSleeping ? (
        <div className="bg-slate-900 text-white rounded-3xl p-8 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
              <Moon size={24} />
            </div>
            <div>
              <h3 className="text-lg font-extrabold">심야 데이터베이스 절전 모드 안내</h3>
              <p className="text-xs text-slate-300 mt-1">
                현재 심야 절전 시간대로 인해 실시간 단체 영업장 선호도 분석 조회가 일시 대기 중입니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setRefreshTick((t) => t + 1)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold transition-colors cursor-pointer shrink-0"
          >
            다시 시도
          </button>
        </div>
      ) : error || !data ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
              <AlertCircle size={22} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                단체 × 식음/부대 영업장 선호도 및 평균 매출 리포트 연동 대기 중
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {error || '백엔드 단체 분석 API 배포가 완료되면 영업장별 단체 방문 순위·단체 유형별 선호도·평균 매출 및 급증률이 즉시 표출됩니다.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setRefreshTick((t) => t + 1)}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <RotateCcw size={13} />
            <span>데이터 다시 확인</span>
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* ================================================================= */}
          {/* ① 상단 KPI 요약 카드 (5열 배너 — meta.summary 바인딩) */}
          {/* ================================================================= */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
              {/* 카드 1: 총 방문 단체 수 / 총 부대지출 */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-500">총 방문 단체 / 부대지출</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                    {summary.totalUniqueGroupsFormatted ?? '-'}
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 tracking-tight">
                  {summary.totalGroupSpendFormatted ? `${summary.totalGroupSpendFormatted}원` : '-'}
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>총 단체 결제 전표</span>
                  <strong className="font-mono text-slate-800">{summary.totalGroupTxCountFormatted ?? '-'}</strong>
                </div>
              </div>

              {/* 카드 2: 단체 1팀당 평균 부대 매출 */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-500">단체 1팀당 평균 부대매출</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                    팀당 평균
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-emerald-700 tracking-tight">
                  {summary.avgSpendPerGroupFormatted ? `${summary.avgSpendPerGroupFormatted}원` : '-'}
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>전표 1건당 평균 금액</span>
                  <strong className="font-mono text-slate-800">
                    {summary.avgSpendPerTxFormatted ? `${summary.avgSpendPerTxFormatted}원` : '-'}
                  </strong>
                </div>
              </div>

              {/* 카드 3: 단체 매출 1위 영업장 */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-500">단체 매출 1위 영업장</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    🏆 {summary.topRevenueVenue?.venueName ?? '-'}
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 tracking-tight">
                  {summary.topRevenueVenue?.groupSpendFormatted
                    ? `${summary.topRevenueVenue.groupSpendFormatted}원`
                    : '-'}
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>B2B 1팀당 평균</span>
                  <strong className="font-mono text-amber-800">
                    {summary.topRevenueVenue?.b2bAvgSpendPerGroupFormatted
                      ? `${summary.topRevenueVenue.b2bAvgSpendPerGroupFormatted}원`
                      : '-'}
                  </strong>
                </div>
              </div>

              {/* 카드 4: 최다 단체 방문 영업장 */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-500">최다 단체 방문 영업장</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                    👥 방문 1위
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-lg sm:text-xl font-black text-slate-900 truncate" title={summary.topGroupCountVenue?.venueName ?? '-'}>
                    {summary.topGroupCountVenue?.venueName ?? '-'}
                  </span>
                  <span className="text-base font-extrabold font-mono text-blue-700 shrink-0">
                    {summary.topGroupCountVenue?.groupCount != null
                      ? `${summary.topGroupCountVenue.groupCount}개 팀`
                      : '-'}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>해당 영업장 단체 매출</span>
                  <strong className="font-mono text-slate-800">
                    {summary.topGroupCountVenue?.groupSpendFormatted
                      ? `${summary.topGroupCountVenue.groupSpendFormatted}원`
                      : '-'}
                  </strong>
                </div>
              </div>

              {/* 카드 5: 단체 방문 시 매출 급증 1위 */}
              <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-5 border border-slate-800 shadow-sm flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-200">단체 방문 시 매출 급증 1위</span>
                  <span className="text-xs font-black px-2 py-0.5 rounded-full bg-rose-500 text-white">
                    {summary.topSurgeVenue?.surgePctFormatted ?? '-'}
                  </span>
                </div>
                <div className="text-lg sm:text-xl font-black text-white truncate" title={summary.topSurgeVenue?.venueName ?? '-'}>
                  {summary.topSurgeVenue?.venueName ?? '-'}
                </div>
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300 font-mono">
                  <span>평소 {summary.topSurgeVenue?.avgDailyRevWithoutGroupFormatted ?? '-'}원</span>
                  <span className="text-emerald-300 font-bold">
                    ➔ {summary.topSurgeVenue?.avgDailyRevWithGroupFormatted ?? '-'}원
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* ② 영업장별 단체 유치 실적 & 평균 매출/급증률 리더보드 테이블 */}
          {/* ================================================================= */}
          {showRankings && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <Trophy size={19} className="text-amber-500" />
                    <span>영업장별 단체 방문 순위 · 단체 방문 시 평균 매출 및 매출 급증률 리더보드</span>
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                      {venueRankings.length}개 영업장
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    각 영업장이 유치한 단체 수(B2B 정산 + 객실후불), 단체 1팀당 평균 지출액, 그리고 단체가 방문한 날의 매장 전체 일평균 매출 급증 효과를 비교합니다.
                  </p>
                </div>

                {/* 정렬 기준 스위치 */}
                <div className="inline-flex flex-wrap items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold gap-1">
                  {[
                    { key: 'rank', label: '기본 순위' },
                    { key: 'groupCount', label: '단체 방문 많은 순' },
                    { key: 'revenue', label: '단체 총매출 순' },
                    { key: 'avgSpend', label: '팀당 평균매출 순' },
                    { key: 'surgePct', label: '방문일 매출 급증률 순' }
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setSortBy(tab.key as RankingSortKey)}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        sortBy === tab.key
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200">
                      <th className="py-3.5 px-4 text-center">순위</th>
                      <th className="py-3.5 px-4 text-left">영업장명 / 구분</th>
                      <th className="py-3.5 px-4 text-right">
                        <div>유치 단체 수</div>
                        <div className="text-[10px] text-slate-400 font-normal">B2B / 객실후불</div>
                      </th>
                      <th className="py-3.5 px-4 text-right">
                        <div>단체 총매출</div>
                        <div className="text-[10px] text-slate-400 font-normal">전체 단체매출 내 비중(%)</div>
                      </th>
                      <th className="py-3.5 px-4 text-right">
                        <div>B2B 단체 1팀당 평균 매출</div>
                        <div className="text-[10px] text-emerald-600 font-normal">전표 건당 / 전체 팀당 평균</div>
                      </th>
                      <th className="py-3.5 px-4 text-right">
                        <div>단체 방문일 vs 평소 일평균 매출</div>
                        <div className="text-[10px] text-blue-600 font-normal">방문일수 / 미방문일수</div>
                      </th>
                      <th className="py-3.5 px-4 text-right">
                        <div>단체 방문 효과 (매출 급증률)</div>
                        <div className="text-[10px] text-rose-500 font-normal">일평균 순증액 / 급증 등급</div>
                      </th>
                      <th className="py-3.5 px-4 text-left">주요 방문 단체 Top 3</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {venueRankings.map((item) => {
                      const gradeMeta =
                        SURGE_GRADE_META[item.revenueSurgeGrade] || SURGE_GRADE_META.STABLE;
                      return (
                        <tr key={item.venueName} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-lg font-extrabold text-xs ${
                                item.rank === 1
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : item.rank === 2
                                  ? 'bg-slate-200 text-slate-800'
                                  : item.rank === 3
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {item.rank ?? '-'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-left">
                            <div className="font-extrabold text-slate-900 text-sm">{item.venueName}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  item.venueCategory === 'FNB'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                }`}
                              >
                                {item.venueCategoryName || item.venueCategory || '-'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono">
                            <div className="font-extrabold text-slate-900 text-sm">
                              {item.totalGroupCountFormatted ?? '-'}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              B2B {item.b2bGroupCount ?? '-'}팀 · 객실후불 {item.roomChargeGroupCount ?? '-'}팀
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono">
                            <div className="font-extrabold text-indigo-950 text-sm">
                              {item.totalGroupRevenueFormatted ? `${item.totalGroupRevenueFormatted}원` : '-'}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              비중{' '}
                              <strong className="text-emerald-700">
                                {item.shareOfGroupSalesPct != null ? `${item.shareOfGroupSalesPct}%` : '-'}
                              </strong>
                              {' '}({item.totalTxCount ?? '-'}건)
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono bg-emerald-50/30">
                            <div className="font-black text-emerald-800 text-sm">
                              {item.b2bAvgSpendPerGroupFormatted ? `${item.b2bAvgSpendPerGroupFormatted}원` : '-'}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              건당 {item.b2bAvgSpendPerTxFormatted ? `${item.b2bAvgSpendPerTxFormatted}원` : '-'} · 전체평균{' '}
                              {item.avgSpendPerGroupFormatted ? `${item.avgSpendPerGroupFormatted}원` : '-'}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono">
                            <div className="font-extrabold text-slate-900">
                              방문일 {item.avgDailyRevWithGroupFormatted ? `${item.avgDailyRevWithGroupFormatted}원` : '-'}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              평소 {item.avgDailyRevWithoutGroupFormatted ? `${item.avgDailyRevWithoutGroupFormatted}원` : '-'}
                              <span className="text-slate-400 ml-1">
                                ({item.groupVisitDays ?? '-'}일 vs {item.nonGroupVisitDays ?? '-'}일)
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono">
                            <div className="flex items-center justify-end gap-1.5">
                              <span className={`px-2 py-0.5 rounded-md border text-[11px] font-extrabold ${gradeMeta.badgeClass}`}>
                                {item.revenueSurgePctFormatted ?? '-'}
                              </span>
                            </div>
                            <div className={`text-[11px] mt-1 ${gradeMeta.deltaClass}`}>
                              {item.revenueSurgeDeltaFormatted ? `${item.revenueSurgeDeltaFormatted}원` : '-'} ({gradeMeta.label})
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-left">
                            {Array.isArray(item.topVisitingGroups) && item.topVisitingGroups.length > 0 ? (
                              <div className="flex flex-wrap items-center gap-1.5">
                                {item.topVisitingGroups.slice(0, 3).map((g, gIdx) => (
                                  <span
                                    key={`${item.venueName}-topg-${gIdx}`}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-semibold"
                                  >
                                    <strong className="text-indigo-700">{gIdx + 1}위</strong>
                                    <span>{g.groupName}</span>
                                    <span className="font-mono text-slate-600">
                                      ({g.spendFormatted ? `${g.spendFormatted}원` : '-'})
                                    </span>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* ③ 단체 성향(유형)별 선호 매장 매트릭스 & 평균 지출 카드 */}
          {/* ================================================================= */}
          {showSegmentsAndTrails && segmentMatrix.length > 0 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Building2 size={19} className="text-indigo-600" />
                  <span>단체 종류(유형)별 선호 영업장 순위 및 방문 시 평균 매출 분석</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  대기업 워크숍, 공공기관/교육청/군, 학교 단체, 여행사 등 어떤 단체 종류가 방문했을 때 1팀당 평균 매출이 가장 높고 어느 영업장을 집중 이용하는지 보여줍니다.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {segmentMatrix.map((seg) => (
                  <div
                    key={seg.groupSegment}
                    className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      {/* 유형 카드 상단 헤더 */}
                      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100">
                        <div>
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-extrabold mb-1">
                            <span>{seg.groupSegment}</span>
                            <span>·</span>
                            <span>{seg.groupCount != null ? `${seg.groupCount}개 단체 방문` : '-'}</span>
                          </div>
                          <h4 className="text-lg font-extrabold text-slate-900">{seg.groupSegmentName}</h4>
                        </div>
                        <div className="text-right font-mono">
                          <div className="text-[11px] text-slate-400 font-sans">유형 식음 총매출</div>
                          <div className="text-base font-black text-slate-900">
                            {seg.totalFnbSpendFormatted ? `${seg.totalFnbSpendFormatted}원` : '-'}
                          </div>
                        </div>
                      </div>

                      {/* 단체 1팀당 평균 매출 비교 박스 */}
                      <div className="grid grid-cols-2 gap-3 bg-slate-900 text-white p-4 rounded-2xl">
                        <div>
                          <div className="text-[11px] text-slate-300 font-medium">단체 1팀당 평균 식음 매출</div>
                          <div className="text-lg sm:text-xl font-black font-mono text-emerald-400 mt-0.5">
                            {seg.avgFnbSpendPerGroupFormatted ? `${seg.avgFnbSpendPerGroupFormatted}원` : '-'}
                          </div>
                        </div>
                        <div className="border-l border-slate-700 pl-3">
                          <div className="text-[11px] text-slate-300 font-medium">1팀당 평균 총 부대매출 (식음+레저)</div>
                          <div className="text-lg sm:text-xl font-black font-mono text-amber-300 mt-0.5">
                            {seg.avgTotalSpendPerGroupFormatted ? `${seg.avgTotalSpendPerGroupFormatted}원` : '-'}
                          </div>
                        </div>
                      </div>

                      {/* 최애 매장 공식 Top 3 */}
                      <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2">
                        <div className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                          <Sparkles size={14} className="text-indigo-600 shrink-0" />
                          <span>선호 영업장 Top 3 동선 공식</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold">
                          <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300">
                            🥇 1위 {seg.top1Venue || '-'}
                          </span>
                          <ArrowRight size={13} className="text-slate-400" />
                          <span className="px-2.5 py-1 rounded-lg bg-white text-slate-800 border border-slate-200">
                            🥈 2위 {seg.top2Venue || '-'}
                          </span>
                          <ArrowRight size={13} className="text-slate-400" />
                          <span className="px-2.5 py-1 rounded-lg bg-white text-slate-800 border border-slate-200">
                            🥉 3위 {seg.top3Venue || '-'}
                          </span>
                        </div>
                        {seg.patternDescription && (
                          <p className="text-xs text-slate-600 leading-relaxed pt-1">
                            {seg.patternDescription}
                          </p>
                        )}
                      </div>

                      {/* 매장별 지출 비중 가로 누적 바 (Stacked Bar) */}
                      {Array.isArray(seg.venueShares) && seg.venueShares.length > 0 && (
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-extrabold text-slate-700">영업장별 매출 비중 및 팀당 평균 지출</span>
                            <span className="text-[11px] text-slate-400">유형 내 점유율(%)</span>
                          </div>

                          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                            {seg.venueShares.map((vs, vIdx) => (
                              <div
                                key={`${seg.groupSegment}-bar-${vs.venueName}`}
                                className={`${STACKED_BAR_COLORS[vIdx % STACKED_BAR_COLORS.length]} h-full transition-all`}
                                style={{ width: `${Math.min(100, Math.max(0, Number(vs.sharePct || 0)))}%` }}
                                title={`${vs.venueName}: ${vs.sharePct ?? '-'}% (${vs.spendFormatted ?? '-'}원)`}
                              />
                            ))}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {seg.venueShares.slice(0, 6).map((vs, vIdx) => (
                              <div
                                key={`${seg.groupSegment}-vs-${vs.venueName}`}
                                className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/70 text-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                      STACKED_BAR_COLORS[vIdx % STACKED_BAR_COLORS.length]
                                    }`}
                                  />
                                  <span className="font-bold text-slate-800 truncate" title={vs.venueName}>
                                    {vs.venueName}
                                  </span>
                                  <span className="text-[10px] text-slate-500 shrink-0">
                                    ({vs.groupCount ?? '-'}팀)
                                  </span>
                                </div>
                                <div className="text-right font-mono shrink-0">
                                  <span className="font-extrabold text-slate-900">
                                    {vs.sharePct != null ? `${vs.sharePct}%` : '-'}
                                  </span>
                                  <span className="text-[10px] text-slate-500 ml-1">
                                    (팀당 {vs.avgSpendPerGroupFormatted ? `${vs.avgSpendPerGroupFormatted}원` : '-'})
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* ⑤ 숙박 단체 규모별 식음 고액 영수증 급증 상관관계 차트 & 카드 */}
          {/* ================================================================= */}
          {showSegmentsAndTrails && staySurgeList.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <Flame size={19} className="text-rose-500" />
                    <span>숙박 단체 투숙 규모별 식음 일평균 매출 및 고액 영수증({highTicketThresholdLabel}) 급증 상관관계</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    현장 법인카드 결제 단체까지 모두 포착하기 위해 대규모 단체 투숙일(15실 이상), 중소 단체 투숙일(3~14실), 일반일(0~2실) 구간별 식음 전체 일평균 매출과 고액 결제 건수를 대조합니다.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-center">
                {/* 좌측 3단 비교 카드 */}
                <div className="xl:col-span-5 space-y-3">
                  {staySurgeList.map((tier) => {
                    const isLarge = tier.tierCode === 'LARGE_GROUP_DAY';
                    const isMedium = tier.tierCode === 'MEDIUM_GROUP_DAY';
                    return (
                      <div
                        key={tier.tierCode}
                        className={`p-5 rounded-2xl border space-y-3 ${
                          isLarge
                            ? 'bg-slate-900 text-white border-slate-800 shadow-sm'
                            : isMedium
                            ? 'bg-indigo-50/50 border-indigo-200 text-slate-900'
                            : 'bg-slate-50 border-slate-200 text-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-extrabold text-sm flex items-center gap-1.5">
                            {isLarge ? '🔥' : isMedium ? '📈' : '📅'} {tier.tierName}
                          </span>
                          <span
                            className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full ${
                              isLarge ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white text-slate-700 border border-slate-200'
                            }`}
                          >
                            {tier.daysCount ?? '-'}일 · 평균 단체객실 {tier.avgGroupRooms ?? '-'}실
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div>
                            <div className={`text-[11px] ${isLarge ? 'text-slate-300' : 'text-slate-500'}`}>
                              식음 전체 일평균 매출
                            </div>
                            <div className="text-base sm:text-lg font-black font-mono mt-0.5">
                              {tier.avgDailyFnbRevenueFormatted ? `${tier.avgDailyFnbRevenueFormatted}원` : '-'}
                            </div>
                          </div>
                          <div>
                            <div className={`text-[11px] ${isLarge ? 'text-slate-300' : 'text-slate-500'}`}>
                              고액 영수증({highTicketThresholdLabel}) 일평균
                            </div>
                            <div className={`text-base sm:text-lg font-black font-mono mt-0.5 ${isLarge ? 'text-emerald-400' : 'text-emerald-700'}`}>
                              {tier.avgBigTicketRevenueFormatted ? `${tier.avgBigTicketRevenueFormatted}원` : '-'}
                              <span className="text-xs font-bold ml-1">
                                ({tier.avgBigTicketCount ?? '-'}건)
                              </span>
                            </div>
                          </div>
                        </div>

                        {tier.venueAvgDailyRevenue && Object.keys(tier.venueAvgDailyRevenue).length > 0 && (
                          <div className={`pt-2.5 border-t flex flex-wrap items-center gap-2 text-[11px] ${
                            isLarge ? 'border-slate-800 text-slate-300' : 'border-slate-200 text-slate-600'
                          }`}>
                            <Receipt size={12} className="shrink-0" />
                            {Object.entries(tier.venueAvgDailyRevenue)
                              .slice(0, 4)
                              .map(([vName, vObj]) => (
                                <span key={vName} className="font-mono">
                                  <strong>{vName}</strong>: {vObj?.avgRevenueFormatted ? `${vObj.avgRevenueFormatted}원` : '-'}
                                </span>
                              ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 우측 ECharts 비교 차트 */}
                <div className="xl:col-span-7 bg-slate-50/70 rounded-2xl p-4 border border-slate-200/80">
                  {staySurgeChartOption ? (
                    <ReactECharts
                      key={`stay-surge-chart-${venueCategory}-${groupSegment}`}
                      option={staySurgeChartOption}
                      notMerge={true}
                      lazyUpdate={true}
                      style={{ height: '340px', width: '100%' }}
                    />
                  ) : (
                    <div className="p-12 text-center text-xs text-slate-400">
                      상관관계 차트 데이터가 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* ④ 단체별 리조트 내 실제 매장 방문 동선 (1:N Trail) 익스팬더블 테이블 */}
          {/* ================================================================= */}
          {showSegmentsAndTrails && groupTrails.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <Store size={19} className="text-emerald-600" />
                    <span>방문 단체별 리조트 내 매장 이용 동선 (1:N 소비 내역)</span>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      {groupTrails.length}개 단체
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    개별 단체가 체류 기간 중 어떤 식음·레저 영업장을 함께 방문하고 각각 얼마를 지출했는지 상세 동선을 확인합니다. (행 클릭 시 동선 펼침)
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => expandAllTrails(true)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    전체 동선 펼치기
                  </button>
                  <button
                    type="button"
                    onClick={() => expandAllTrails(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    전체 접기
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200">
                      <th className="py-3.5 px-4 text-center">순위</th>
                      <th className="py-3.5 px-4 text-left">단체명 / 유형</th>
                      <th className="py-3.5 px-4 text-left">방문일자 / 객실매칭</th>
                      <th className="py-3.5 px-4 text-center">방문 매장 수</th>
                      <th className="py-3.5 px-4 text-right">총 부대 지출액</th>
                      <th className="py-3.5 px-4 text-right">식음 / 레저 지출</th>
                      <th className="py-3.5 px-4 text-right">매장 1곳당 평균</th>
                      <th className="py-3.5 px-4 text-left">최다 지출 영업장</th>
                      <th className="py-3.5 px-4 text-center">동선 상세</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {groupTrails.map((trail) => {
                      const rowKey = trail.groupCode || trail.groupName || String(trail.rank);
                      const isExpanded = Boolean(expandedGroupCodes[rowKey]);
                      return (
                        <Fragment key={rowKey}>
                          <tr
                            onClick={() => toggleGroupTrail(rowKey)}
                            className="hover:bg-slate-50/90 transition-colors cursor-pointer"
                          >
                            <td className="py-3.5 px-4 text-center font-extrabold text-slate-700">
                              {trail.rank ?? '-'}
                            </td>
                            <td className="py-3.5 px-4 text-left">
                              <div className="font-extrabold text-slate-900 text-sm">{trail.groupName}</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                  {trail.groupSegmentName || trail.groupSegment}
                                </span>
                                {trail.groupCode && (
                                  <span className="text-[10px] font-mono text-slate-400">#{trail.groupCode}</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-left">
                              <div className="font-mono text-slate-700 font-semibold">
                                {Array.isArray(trail.visitDates) && trail.visitDates.length > 0
                                  ? trail.visitDates.length > 1
                                    ? `${trail.visitDates[0]} ~ ${trail.visitDates[trail.visitDates.length - 1]} (${trail.visitDates.length}일)`
                                    : trail.visitDates[0]
                                  : '-'}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                                {trail.roomStayMatched ? (
                                  <span className="text-indigo-700 font-semibold flex items-center gap-1">
                                    <BedDouble size={12} />
                                    객실 {trail.roomsCount ?? '-'}실
                                    {trail.paxCount != null ? ` · ${trail.paxCount}명` : ''}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">당일/연회 방문</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono">
                              <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-800 font-extrabold">
                                {trail.visitedVenueCount != null ? `${trail.visitedVenueCount}곳` : '-'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 text-sm">
                              {trail.totalGroupSpendFormatted ? `${trail.totalGroupSpendFormatted}원` : '-'}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono">
                              <div className="text-emerald-700 font-bold">
                                식음 {trail.fnbSpendFormatted ? `${trail.fnbSpendFormatted}원` : '-'}
                              </div>
                              <div className="text-[11px] text-indigo-600 mt-0.5">
                                레저 {trail.leisureSpendFormatted ? `${trail.leisureSpendFormatted}원` : '-'}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800">
                              {trail.avgSpendPerVenueFormatted ? `${trail.avgSpendPerVenueFormatted}원` : '-'}
                            </td>
                            <td className="py-3.5 px-4 text-left">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {trail.favoriteFnbVenue && (
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-[11px]">
                                    🍽️ {trail.favoriteFnbVenue}
                                  </span>
                                )}
                                {trail.favoriteLeisureVenue && (
                                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 font-bold text-[11px]">
                                    🎡 {trail.favoriteLeisureVenue}
                                  </span>
                                )}
                                {!trail.favoriteFnbVenue && !trail.favoriteLeisureVenue && (
                                  <span className="text-slate-400">-</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px]"
                              >
                                <span>{isExpanded ? '접기' : '동선 보기'}</span>
                                {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                              </button>
                            </td>
                          </tr>

                          {isExpanded && Array.isArray(trail.venueBreakdown) && trail.venueBreakdown.length > 0 && (
                            <tr className="bg-slate-50/90">
                              <td colSpan={9} className="px-6 py-4 text-left">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs font-extrabold text-slate-600 mr-2">
                                    📍 [{trail.groupName}] 매장별 지출 동선:
                                  </span>
                                  {trail.venueBreakdown.map((vb, vbIdx) => (
                                    <Fragment key={`${rowKey}-vb-${vb.venueName}-${vbIdx}`}>
                                      <div
                                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs shadow-2xs ${
                                          vb.venueCategory === 'FNB'
                                            ? 'bg-white border-emerald-200 text-slate-900'
                                            : 'bg-white border-indigo-200 text-slate-900'
                                        }`}
                                      >
                                        <span
                                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                                            vb.venueCategory === 'FNB'
                                              ? 'bg-emerald-100 text-emerald-800'
                                              : 'bg-indigo-100 text-indigo-800'
                                          }`}
                                        >
                                          {vbIdx + 1}
                                        </span>
                                        <span className="font-extrabold">{vb.venueName}</span>
                                        <span className="font-mono font-bold text-slate-800">
                                          {vb.spendFormatted ? `${vb.spendFormatted}원` : '-'}
                                        </span>
                                        <span className="text-[11px] font-mono text-emerald-700 font-bold">
                                          ({vb.sharePct != null ? `${vb.sharePct}%` : '-'} · {vb.txCount ?? '-'}건)
                                        </span>
                                      </div>
                                      {vbIdx < trail.venueBreakdown.length - 1 && (
                                        <ArrowRight size={14} className="text-slate-400 shrink-0" />
                                      )}
                                    </Fragment>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
