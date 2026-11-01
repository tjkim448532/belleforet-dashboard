import { useState, useEffect } from 'react';
import {
  Hotel, Calendar, RefreshCw, Search, Filter, Radio,
  Tag, Sparkles, ChevronDown, ChevronUp, ExternalLink,
  AlertCircle, Layers, TrendingUp, ShoppingBag, Building2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { secureFetcher } from '../lib/secureFetcher';
import { getLatestClosedDateStr } from '../lib/dateUtils';
import type {
  RoomDynamicPricingResponse,
  DailyCalendarItem,
  CompetitorResortDetail
} from './RoomDynamicPricing';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

export interface CompetitorOfferItem {
  offerId?: string;
  channelName?: string;
  roomName?: string;
  packageName?: string;
  roomTier?: string;
  offerType?: 'PACKAGE' | 'ROOM_ONLY' | string;
  price?: number | null;
  originalPrice?: number | null;
  discountRatePct?: number | null;
  isSoldOut?: boolean;
}

type ExtendedResortDetail = CompetitorResortDetail & {
  offers?: CompetitorOfferItem[];
  rawOffers?: CompetitorOfferItem[];
};

const formatNum = (val: number | null | undefined): string => {
  if (val === null || val === undefined || Number.isNaN(Number(val))) return '-';
  return Number(val).toLocaleString('ko-KR');
};

const formatWon = (val: number | null | undefined): string => {
  if (val === null || val === undefined || Number.isNaN(Number(val))) return '-';
  return `${Number(val).toLocaleString('ko-KR')}원`;
};

const formatSignedWon = (val: number | null | undefined): string => {
  if (val === null || val === undefined || Number.isNaN(Number(val))) return '-';
  const num = Number(val);
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toLocaleString('ko-KR')}원`;
};

const formatPct = (val: number | null | undefined): string => {
  if (val === null || val === undefined || Number.isNaN(Number(val))) return '-';
  return `${Number(val).toFixed(1)}%`;
};

const isPackageProductName = (roomName: string | undefined | null): boolean => {
  if (!roomName) return false;
  const s = String(roomName);
  return (
    s.includes('패키지') ||
    s.includes('PKG') ||
    s.includes('스파') ||
    s.includes('조식') ||
    s.includes('세트') ||
    s.includes('드링크') ||
    s.includes('워터') ||
    s.includes('사우나')
  );
};

export default function CompetitorDailyProducts() {
  const navigate = useNavigate();

  const [baseDate, setBaseDate] = useState<string>(() => getLatestClosedDateStr());
  const [days, setDays] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RoomDynamicPricingResponse | null>(null);

  // 상단 뷰 모드 ('DAILY_CATALOG': 일별 카드 보드 | 'MATRIX_TABLE': 일자×4대 타사 비교표 | 'MONTHLY_SUMMARY': 월별·요일별 통계)
  const [viewMode, setViewMode] = useState<'DAILY_CATALOG' | 'MATRIX_TABLE' | 'MONTHLY_SUMMARY'>('DAILY_CATALOG');

  // 필터 상태
  const [selectedResort, setSelectedResort] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SELLING' | 'SOLD_OUT' | 'PACKAGE' | 'ROOM_ONLY'>('ALL');
  const [dayFilter, setDayFilter] = useState<'ALL' | 'WEEKEND' | 'WEEKDAY'>('ALL');
  const [channelFilter, setChannelFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 특정 일자·리조트 상세 상품 드릴다운 상태 (`${date}__${resortName}`)
  const [expandedCardKey, setExpandedCardKey] = useState<string | null>(null);

  const fetchCompetitorCatalog = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `${API_BASE}/api/v6/report/room-dynamic-pricing?date=${encodeURIComponent(baseDate)}&days=${days}&roomType=ALL&track=MARKET_ADAPTIVE`;
      const res = await secureFetcher(url);
      const payload: RoomDynamicPricingResponse = res?.data ? res.data : res;

      if (!payload || payload.success === false) {
        throw new Error('타사 일별 판매상품 데이터를 불러올 수 없습니다.');
      }

      setData(payload);
    } catch (err: any) {
      console.error('Failed to load competitor daily products:', err);
      setError(err?.message || '데이터 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompetitorCatalog();
  }, [baseDate, days]);

  const competitorMarket = data?.summary?.competitorMarket;
  const dbMeta = competitorMarket?.dbMetadata;
  const spillover = competitorMarket?.empiricalSpilloverAnalysis;
  const targetResorts: string[] = competitorMarket?.targetResorts || [
    '소노벨 단양',
    '롯데리조트 부여',
    '레스트리 리솜',
    '포레스트 리솜'
  ];
  const weekdayBaselines = competitorMarket?.weekdayBaselineMinPrices || {};
  const yearlyMonthlySummary = competitorMarket?.yearlyMonthlySummary || [];
  const dailyCalendar: DailyCalendarItem[] = data?.dailyCalendar || [];

  // 수집된 판매채널 목록 추출
  const availableChannels = Array.from(
    new Set(
      dailyCalendar.flatMap((d) =>
        (d.competitorBenchmark?.resorts || [])
          .map((r) => r.lowestChannel)
          .filter((ch): ch is string => Boolean(ch && ch !== '-'))
      )
    )
  );

  // 리조트 개별 항목이 필터 조건에 맞는지 검사
  const matchesResortCardFilter = (r: ExtendedResortDetail): boolean => {
    if (selectedResort !== 'ALL' && r.resortName !== selectedResort) return false;
    if (channelFilter !== 'ALL' && r.lowestChannel !== channelFilter) return false;

    if (statusFilter === 'SELLING' && r.isSoldOut) return false;
    if (statusFilter === 'SOLD_OUT' && !r.isSoldOut) return false;
    if (statusFilter === 'PACKAGE' && (r.isSoldOut || !isPackageProductName(r.lowestRoomName))) return false;
    if (statusFilter === 'ROOM_ONLY' && (r.isSoldOut || isPackageProductName(r.lowestRoomName))) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const rName = String(r.resortName || '').toLowerCase();
      const prodName = String(r.lowestRoomName || '').toLowerCase();
      const chName = String(r.lowestChannel || '').toLowerCase();
      if (!rName.includes(q) && !prodName.includes(q) && !chName.includes(q)) {
        return false;
      }
    }

    return true;
  };

  // 일자별 필터링된 캘린더 목록
  const filteredDays = dailyCalendar.filter((day) => {
    if (dayFilter === 'WEEKEND' && !day.isWeekend && !day.isHoliday) return false;
    if (dayFilter === 'WEEKDAY' && (day.isWeekend || day.isHoliday)) return false;

    const resorts = (day.competitorBenchmark?.resorts || []) as ExtendedResortDetail[];
    const matchingResorts = resorts.filter(matchesResortCardFilter);
    return matchingResorts.length > 0;
  });

  // 월별 요약 테이블 필터링
  const filteredMonthlyRows = yearlyMonthlySummary.filter((row) => {
    if (selectedResort !== 'ALL' && row.resortName !== selectedResort) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      return (
        String(row.resortName || '').toLowerCase().includes(q) ||
        String(row.stayYearMonth || '').toLowerCase().includes(q) ||
        String(row.dayType || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="w-full min-h-screen bg-[#F4F3EE] text-[#1B382E] tracking-tight pb-16 relative">
      {/* Ambient Forest Glow Banner */}
      <div className="w-full bg-[#284F42] h-[190px] absolute top-0 left-0 z-0 overflow-hidden rounded-b-[36px] border-b border-[#1B382E] shadow-xl">
        <div className="absolute -top-16 -right-16 w-96 h-96 rounded-full bg-[#2F5548] opacity-70 pointer-events-none" />
        <div className="absolute top-8 left-1/3 w-80 h-80 rounded-full bg-[#2F5548] opacity-40 blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 right-1/4 w-60 h-60 rounded-full bg-[#1B382E] opacity-60 pointer-events-none" />
      </div>

      <div className="relative z-10 max-w-[1620px] mx-auto px-5 sm:px-7 lg:px-10 pt-6 lg:pt-8 space-y-6">
        {/* 1. 상단 헤더 카드 */}
        <div className="bg-white rounded-3xl p-6 lg:p-8 border border-[#D0C6BB] shadow-[0_4px_24px_rgba(40,79,66,0.06)] flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]/75">
                <Radio size={13} />
                COMPETITOR DAILY PRODUCT & OTA INTELLIGENCE
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FAF6F0] text-[#8B6E4E] border border-[#D0C6BB]">
                충청권 4대 경쟁 리조트 · S3 시계열 DB ({formatNum(dbMeta?.totalRawOffersStored)}건 누적 수집)
              </span>
              {competitorMarket?.snapshotCollectedAt && (
                <span className="text-xs font-semibold text-[#5A6B63]">
                  최신 수집: <strong className="text-[#1B382E]">{competitorMarket.snapshotCollectedAt}</strong>
                </span>
              )}
            </div>

            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-[#1B382E] flex items-center gap-2.5">
              <ShoppingBag className="text-[#284F42] shrink-0" size={28} />
              <span>타사 일별 판매상품 · 패키지 구성 & OTA 채널별 요금 현황</span>
            </h1>
            <p className="text-xs lg:text-sm text-[#5A6B63]">
              충청권 주요 경쟁사(<strong>소노벨 단양 · 롯데리조트 부여 · 레스트리 리솜 · 포레스트 리솜</strong>)가 일별로 어떤 객실·패키지 상품을 어느 OTA 채널에서 얼마에 판매 중인지 추적합니다.
            </p>
          </div>

          {/* 우측 날짜·기간·새로고침 컨트롤 */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-2 bg-[#F4F3EE] px-3 py-2 rounded-xl border border-[#D0C6BB]">
              <Calendar size={14} className="text-[#284F42]" />
              <span className="text-xs font-bold text-[#5A6B63]">기준일:</span>
              <input
                type="date"
                value={baseDate}
                onChange={(e) => setBaseDate(e.target.value)}
                className="text-xs font-bold text-[#1B382E] bg-transparent focus:outline-none cursor-pointer"
              />
            </div>

            <div className="flex items-center bg-[#F4F3EE] p-1 rounded-xl border border-[#D0C6BB] text-xs font-bold">
              {[
                { val: 30, label: '향후 30일' },
                { val: 60, label: '향후 60일' }
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setDays(opt.val)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    days === opt.val
                      ? 'bg-[#284F42] text-white shadow-2xs'
                      : 'text-[#5A6B63] hover:text-[#1B382E]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={fetchCompetitorCatalog}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#284F42] text-white text-xs font-bold hover:bg-[#1B382E] transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>새로고침</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/condo/dynamic-pricing')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#FAF6F0] text-[#8B6E4E] hover:bg-[#EFE9DF] border border-[#D0C6BB] text-xs font-bold transition-colors cursor-pointer"
            >
              <Sparkles size={13} />
              <span>객실 추천 요금 보드</span>
              <ExternalLink size={12} />
            </button>
          </div>
        </div>

        {/* 2. 상단 4대 요약 KPI 카드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 font-financial">
          <div className="bg-[#284F42] text-white rounded-3xl p-5 border border-[#1B382E] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-emerald-200">
                <span>수집 경쟁사 & 누적 판매상품 DB</span>
                <span className="px-2 py-0.5 rounded-full bg-white/15 text-[#B59269] font-black">
                  4개 리조트
                </span>
              </div>
              <div className="text-3xl font-black text-white mt-2 tabular-nums">
                {formatNum(dbMeta?.totalRawOffersStored)}개 상품
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-white/15 flex items-center justify-between text-xs text-white/85">
              <span>일별 마트: {formatNum(dbMeta?.totalDailyMartRows)}행</span>
              <span className="text-emerald-200 font-bold">S3 영구 시계열 보관</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-[#D0C6BB] shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-[#5A6B63]">
                <span>주변 경쟁사 품절(만실) 집중일</span>
                <span className="px-2 py-0.5 rounded-full bg-[#FDF0ED] text-[#8B2635] border border-[#EAC5BD] font-black">
                  만실 감지기
                </span>
              </div>
              <div className="text-3xl font-black text-[#8B2635] mt-2 tabular-nums">
                {formatNum(competitorMarket?.highCompressionDaysCount)}일
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-[#D0C6BB]/50 flex items-center justify-between text-xs text-[#5A6B63]">
              <span>단가 급등 포착일: <strong className="text-[#1B382E]">{formatNum(competitorMarket?.momentumSurgeDaysCount)}일</strong></span>
              <span>평일 특가 투매: <strong className="text-[#1B382E]">{formatNum(competitorMarket?.weekdayDumpingAlertDaysCount)}일</strong></span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-[#D0C6BB] shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-[#5A6B63]">
                <span>타사 만실 시 벨포레 예약 유입 속도</span>
                <span className="px-2 py-0.5 rounded-full bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1] font-black">
                  낙수효과 실측
                </span>
              </div>
              <div className="text-3xl font-black text-[#1E523F] mt-2 tabular-nums">
                {spillover?.spilloverPickupVelocityRatio != null ? `${spillover.spilloverPickupVelocityRatio}배 증가` : '-'}
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-[#D0C6BB]/50 flex items-center justify-between text-xs text-[#5A6B63]">
              <span>만실일 유입: <strong className="text-[#1B382E]">{spillover?.highCompressionGroup?.avgRecent7dPickupRoomsPerDay ?? '-'}실/일</strong></span>
              <span>평시 유입: <strong className="text-[#1B382E]">{spillover?.normalMarketGroup?.avgRecent7dPickupRoomsPerDay ?? '-'}실/일</strong></span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-[#D0C6BB] shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-[#5A6B63] mb-2">
              <span>4대 타사 평일 기준 최저가 벤치마크</span>
              <Tag size={14} className="text-[#B59269]" />
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              {targetResorts.map((rName) => (
                <div key={rName} className="bg-[#F4F3EE]/80 px-2.5 py-1.5 rounded-xl flex items-center justify-between">
                  <span className="text-[#5A6B63] truncate mr-1">{rName.replace('리조트 ', '').replace(' 리솜', '')}</span>
                  <strong className="text-[#1B382E] shrink-0">{formatWon(weekdayBaselines[rName])}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. 뷰 모드 전환 탭 & 다중 필터 컨트롤 바 */}
        <div className="bg-white rounded-3xl p-5 border border-[#D0C6BB] shadow-2xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#D0C6BB]/50 pb-4">
            {/* 뷰 모드 전환 탭 */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'DAILY_CATALOG', label: '① 일별 × 4대 타사 판매상품 & 패키지 상세 보드', icon: <ShoppingBag size={15} /> },
                { id: 'MATRIX_TABLE', label: '② 일자별 × 4대 타사 최저가 상품 한눈에 비교표', icon: <Layers size={15} /> },
                { id: 'MONTHLY_SUMMARY', label: '③ 타사별 · 월별 · 요일별 평균가 & 품절률 추이', icon: <TrendingUp size={15} /> }
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setViewMode(t.id as any)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs lg:text-sm font-black transition-all cursor-pointer ${
                    viewMode === t.id
                      ? 'bg-[#284F42] text-white shadow-sm'
                      : 'bg-[#F4F3EE] text-[#5A6B63] hover:text-[#1B382E]'
                  }`}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            {/* 검색창 */}
            <div className="relative shrink-0">
              <Search className="w-4 h-4 text-[#5A6B63] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="상품명(스파, 조식, G50, 패밀리), 채널 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 text-xs rounded-xl border border-[#D0C6BB] bg-[#F4F3EE]/60 focus:bg-white focus:outline-none focus:border-[#284F42] w-full sm:w-72 font-medium"
              />
            </div>
          </div>

          {/* 세부 필터 바 (경쟁사 선택 / 상품유형·품절상태 / 요일 / 판매채널) */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* 경쟁사 필터 */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-[#1B382E] mr-1 flex items-center gap-1">
                <Building2 size={14} className="text-[#B59269]" />
                타사 선택:
              </span>
              {['ALL', ...targetResorts].map((rName) => (
                <button
                  key={rName}
                  type="button"
                  onClick={() => setSelectedResort(rName)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedResort === rName
                      ? 'bg-[#1B382E] text-white shadow-2xs'
                      : 'bg-[#F4F3EE] text-[#5A6B63] hover:text-[#1B382E] border border-[#D0C6BB]/60'
                  }`}
                >
                  {rName === 'ALL' ? '전체 4개 타사' : rName}
                </button>
              ))}
            </div>

            {/* 상품 상태 / 요일 / 채널 필터 */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-[#F4F3EE] p-1 rounded-xl border border-[#D0C6BB]/60 text-xs font-semibold">
                <Filter size={13} className="text-[#B59269] mx-1.5" />
                {[
                  { id: 'ALL', label: '전체 상태' },
                  { id: 'SELLING', label: '판매중' },
                  { id: 'PACKAGE', label: '패키지 상품' },
                  { id: 'ROOM_ONLY', label: '룸온리(단품)' },
                  { id: 'SOLD_OUT', label: '품절 마감' }
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setStatusFilter(st.id as any)}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      statusFilter === st.id
                        ? 'bg-[#284F42] text-white font-bold'
                        : 'text-[#5A6B63] hover:text-[#1B382E]'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center bg-[#F4F3EE] p-1 rounded-xl border border-[#D0C6BB]/60 text-xs font-semibold">
                {[
                  { id: 'ALL', label: '전 요일' },
                  { id: 'WEEKEND', label: '주말·공휴일' },
                  { id: 'WEEKDAY', label: '평일(일~목)' }
                ].map((df) => (
                  <button
                    key={df.id}
                    type="button"
                    onClick={() => setDayFilter(df.id as any)}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      dayFilter === df.id
                        ? 'bg-[#B59269] text-white font-bold'
                        : 'text-[#5A6B63] hover:text-[#1B382E]'
                    }`}
                  >
                    {df.label}
                  </button>
                ))}
              </div>

              {availableChannels.length > 0 && (
                <select
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-[#F4F3EE] border border-[#D0C6BB] text-xs font-bold text-[#1B382E] focus:outline-none cursor-pointer"
                >
                  <option value="ALL">전체 OTA 채널 ({availableChannels.length})</option>
                  {availableChannels.map((ch) => (
                    <option key={ch} value={ch}>
                      🛒 {ch}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* 로딩 및 에러 처리 */}
        {loading ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-[#D0C6BB] shadow-2xs space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-[#284F42] mx-auto" />
            <p className="text-sm font-bold text-[#1B382E]">
              충청권 4대 경쟁 리조트의 일별 판매상품 및 OTA 가격 스냅샷을 불러오는 중입니다...
            </p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-3xl p-6 text-sm font-bold flex items-center gap-3">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        ) : (
          <>
            {/* ================================================================================= */}
            {/* VIEW 1: 일별 × 4대 타사 판매상품 & 패키지 상세 보드 */}
            {/* ================================================================================= */}
            {viewMode === 'DAILY_CATALOG' && (
              <div className="space-y-4">
                {filteredDays.length > 0 ? (
                  filteredDays.map((day) => {
                    const cb = day.competitorBenchmark;
                    const resorts = ((cb?.resorts || []) as ExtendedResortDetail[]).filter(matchesResortCardFilter);
                    const isWknd = day.isWeekend || day.isHoliday;

                    return (
                      <div
                        key={day.date}
                        className="bg-white rounded-3xl p-5 lg:p-6 border border-[#D0C6BB] shadow-[0_4px_20px_rgba(40,79,66,0.05)] space-y-4"
                      >
                        {/* 일자 헤더 & 벨포레 기준 지표 요약 */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#D0C6BB]/50 pb-3.5">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span
                              className={`px-3 py-1 rounded-xl text-sm font-black font-financial ${
                                isWknd
                                  ? 'bg-[#8B2635] text-white'
                                  : 'bg-[#284F42] text-white'
                              }`}
                            >
                              {day.date} ({day.dayOfWeek})
                            </span>
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#F4F3EE] text-[#5A6B63] border border-[#D0C6BB]/70">
                              {day.dayTypeLabel || day.dayType}
                            </span>
                            {day.holidayName && (
                              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                🎌 {day.holidayName}
                              </span>
                            )}
                            {cb?.uiBadge && (
                              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-[#FAF6ED] text-[#8C6D3B] border border-[#E5DAC1]">
                                {cb.uiBadge.badgeLabel}
                              </span>
                            )}
                          </div>

                          {/* 당일 벨포레 기준가 & 예약률 비교 바 */}
                          <div className="flex flex-wrap items-center gap-3 text-xs font-financial bg-[#F4F3EE]/80 px-3.5 py-2 rounded-2xl border border-[#D0C6BB]/60">
                            <span>
                              벨포레 현재 예약:{' '}
                              <strong className="text-[#1B382E]">
                                {formatNum(day.inventory?.otbRoomsBooked)}실 ({formatPct(day.inventory?.currentOtbOccupancyPct)})
                              </strong>
                            </span>
                            <span className="text-[#D0C6BB]">|</span>
                            <span>
                              벨포레 추천 ADR:{' '}
                              <strong className="text-[#284F42]">{formatWon(day.pricing?.recommendedAdr)}</strong>
                            </span>
                            {cb?.tierComparison?.tier16_35?.competitorMinPrice != null && (
                              <>
                                <span className="text-[#D0C6BB]">|</span>
                                <span>
                                  타사 중형 최저가:{' '}
                                  <strong className="text-[#8B6E4E]">
                                    {formatWon(cb.tierComparison.tier16_35.competitorMinPrice)} ({cb.tierComparison.tier16_35.lowestCompetitorName})
                                  </strong>
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* 해당 일자 4대 타사 판매상품 카드 그리드 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                          {resorts.map((r) => {
                            const cardKey = `${day.date}__${r.resortName}`;
                            const isExpanded = expandedCardKey === cardKey;
                            const isPkg = isPackageProductName(r.lowestRoomName);
                            const gap = r.vsBelleforetGapKrw ?? 0;
                            const offerList: CompetitorOfferItem[] = Array.isArray(r.offers || r.rawOffers)
                              ? (r.offers || r.rawOffers || [])
                              : [];

                            return (
                              <div
                                key={r.resortName}
                                className={`rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                                  r.isSoldOut
                                    ? 'bg-[#FAF6F5] border-[#EAC5BD]/80'
                                    : 'bg-[#FAF9F6] border-[#D0C6BB] hover:border-[#284F42]'
                                }`}
                              >
                                <div className="space-y-3">
                                  {/* 리조트명 & 판매상태 배지 */}
                                  <div className="flex items-center justify-between gap-2">
                                    <h3 className="text-sm font-black text-[#1B382E] flex items-center gap-1.5">
                                      <Hotel size={15} className="text-[#284F42]" />
                                      <span>{r.resortName}</span>
                                    </h3>
                                    {r.isSoldOut ? (
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#FDF0ED] text-[#8B2635] border border-[#EAC5BD]">
                                        {r.isNewlySoldOut ? '🔥 당일 신규마감' : '품절 마감'}
                                      </span>
                                    ) : (
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]">
                                        판매중 ({formatNum(r.offerCount)}개 상품)
                                      </span>
                                    )}
                                  </div>

                                  {/* 판매 채널 & 패키지/룸온리 구분 배지 */}
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="px-2.5 py-0.5 rounded-lg bg-white border border-[#D0C6BB]/80 text-[11px] font-bold text-[#1B382E]">
                                      🛒 최저가 채널: <strong className="text-[#284F42]">{r.lowestChannel || '-'}</strong>
                                    </span>
                                    {!r.isSoldOut && (
                                      <span
                                        className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold border ${
                                          isPkg
                                            ? 'bg-[#FAF6ED] text-[#8C6D3B] border-[#E5DAC1]'
                                            : 'bg-white text-[#5A6B63] border-[#D0C6BB]/70'
                                        }`}
                                      >
                                        {isPkg ? '🎁 패키지 결합상품' : '🛏️ 룸온리/기본객실'}
                                      </span>
                                    )}
                                  </div>

                                  {/* 대표 판매 상품명 박스 */}
                                  <div className="bg-white p-3 rounded-xl border border-[#D0C6BB]/70 min-h-[68px] flex flex-col justify-center">
                                    <span className="text-[10px] font-bold text-[#5A6B63] block">
                                      당일 최저가 대표 판매상품명
                                    </span>
                                    <p
                                      className="text-xs font-black text-[#1B382E] mt-1 leading-snug break-keep"
                                      title={r.lowestRoomName || ''}
                                    >
                                      {r.isSoldOut
                                        ? '전 판매채널 객실 품절 마감'
                                        : r.lowestRoomName || '-'}
                                    </p>
                                  </div>

                                  {/* 평형별/중간가 가격 매트릭스 */}
                                  <div className="grid grid-cols-3 gap-1.5 text-[10px] font-financial bg-white/80 p-2.5 rounded-xl border border-[#D0C6BB]/50">
                                    <div>
                                      <span className="text-[#5A6B63] block">중형(16~35평)</span>
                                      <strong className="text-[#1B382E] text-xs">
                                        {formatWon(r.tier16_35MinPrice ?? r.tier16_35Price)}
                                      </strong>
                                    </div>
                                    <div>
                                      <span className="text-[#5A6B63] block">대형(51평급)</span>
                                      <strong className="text-[#1B382E] text-xs">
                                        {formatWon(r.tier51MinPrice ?? r.tier51Price)}
                                      </strong>
                                    </div>
                                    <div>
                                      <span className="text-[#5A6B63] block">전체 중간가</span>
                                      <strong className="text-[#5A6B63] text-xs">
                                        {formatWon(r.medianPrice)}
                                      </strong>
                                    </div>
                                  </div>
                                </div>

                                {/* 하단 최저가 · 전일대비 변동 · 벨포레 대비 격차 & 상품 전체보기 버튼 */}
                                <div className="mt-3 pt-3 border-t border-[#D0C6BB]/60 space-y-2 font-financial">
                                  <div className="flex items-baseline justify-between">
                                    <span className="text-xs font-bold text-[#5A6B63]">당일 최저 판매가</span>
                                    <div className="text-right">
                                      <strong className="text-lg font-black text-[#1B382E]">
                                        {r.isSoldOut ? '품절' : formatWon(r.minPrice)}
                                      </strong>
                                      {r.priceChange1dKrw != null && r.priceChange1dKrw !== 0 && (
                                        <span
                                          className={`block text-[10px] font-bold ${
                                            r.priceChange1dKrw > 0 ? 'text-rose-700' : 'text-blue-700'
                                          }`}
                                        >
                                          전일대비 {formatSignedWon(r.priceChange1dKrw)} ({r.priceChange1dPct ?? 0}%)
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {r.vsBelleforetGapKrw != null && (
                                    <div className="flex items-center justify-between text-[11px] bg-[#E8F2EE]/70 px-2.5 py-1.5 rounded-lg">
                                      <span className="text-[#5A6B63] font-sans font-semibold">벨포레 추천가 대비</span>
                                      <strong
                                        className={`font-black ${
                                          gap > 0 ? 'text-[#1E523F]' : gap < 0 ? 'text-[#8B2635]' : 'text-[#5A6B63]'
                                        }`}
                                      >
                                        {gap > 0
                                          ? `타사가 +${formatWon(gap)} 비쌈`
                                          : gap < 0
                                          ? `타사가 -${formatWon(Math.abs(gap))} 저렴`
                                          : '동일 가격'}
                                      </strong>
                                    </div>
                                  )}

                                  {!r.isSoldOut && (
                                    <button
                                      type="button"
                                      onClick={() => setExpandedCardKey(isExpanded ? null : cardKey)}
                                      className="w-full py-1.5 px-3 rounded-xl bg-white hover:bg-[#F4F3EE] border border-[#D0C6BB] text-[11px] font-bold text-[#1B382E] flex items-center justify-between transition-colors cursor-pointer font-sans"
                                    >
                                      <span>
                                        등록 판매상품 상세 ({formatNum(r.offerCount)}개)
                                      </span>
                                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                    </button>
                                  )}

                                  {isExpanded && (
                                    <div className="mt-2 p-3 rounded-xl bg-white border border-[#284F42]/30 space-y-2 font-sans text-xs">
                                      <div className="font-black text-[#1B382E] flex items-center justify-between border-b border-[#D0C6BB]/40 pb-1.5">
                                        <span>📋 {r.resortName} 일별 수집 상품 내역</span>
                                        <span className="text-[10px] text-[#284F42] font-mono">
                                          총 {formatNum(r.offerCount)}건
                                        </span>
                                      </div>

                                      {offerList.length > 0 ? (
                                        <div className="divide-y divide-[#D0C6BB]/30 max-h-56 overflow-y-auto">
                                          {offerList.map((ofItem, oIdx) => (
                                            <div key={oIdx} className="py-1.5 flex items-center justify-between gap-2">
                                              <div className="min-w-0">
                                                <div className="text-[11px] font-bold text-[#1B382E] truncate">
                                                  {ofItem.roomName || ofItem.packageName || '-'}
                                                </div>
                                                <div className="text-[10px] text-[#5A6B63]">
                                                  {ofItem.channelName || r.lowestChannel} · {ofItem.roomTier || '일반'}
                                                </div>
                                              </div>
                                              <strong className="text-xs font-black font-financial text-[#284F42] shrink-0">
                                                {formatWon(ofItem.price)}
                                              </strong>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="space-y-1.5 text-[11px] text-[#5A6B63]">
                                          <div className="flex justify-between">
                                            <span>• 최저가 대표상품:</span>
                                            <strong className="text-[#1B382E]">{r.lowestRoomName}</strong>
                                          </div>
                                          <div className="flex justify-between">
                                            <span>• 최저가 / 중간가:</span>
                                            <strong className="text-[#1B382E] font-financial">
                                              {formatWon(r.minPrice)} / {formatWon(r.medianPrice)}
                                            </strong>
                                          </div>
                                          <p className="text-[10px] text-[#8B6E4E] bg-[#FAF6F0] p-2 rounded-lg border border-[#D0C6BB]/60 mt-1">
                                            💡 S3 SQLite DB에 저장된 당일 {formatNum(r.offerCount)}개 전체 개별 상품 배열(`offers[]`)은 백엔드 <strong>Ticket 77</strong> 배포 시 이곳에 전수 리스트업됩니다.
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="bg-white rounded-3xl p-12 text-center border border-[#D0C6BB] text-sm text-[#5A6B63] font-bold">
                    선택하신 필터 또는 검색어에 해당하는 타사 일별 판매상품 내역이 없습니다.
                  </div>
                )}
              </div>
            )}

            {/* ================================================================================= */}
            {/* VIEW 2: 일자별 × 4대 타사 최저가 판매상품 한눈에 비교 매트릭스 테이블 */}
            {/* ================================================================================= */}
            {viewMode === 'MATRIX_TABLE' && (
              <div className="bg-white rounded-3xl p-6 border border-[#D0C6BB] shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D0C6BB]/50 pb-4">
                  <div>
                    <h2 className="text-lg font-black text-[#1B382E] flex items-center gap-2">
                      <Layers size={18} className="text-[#284F42]" />
                      <span>일자별 × 4대 경쟁 리조트 최저가 판매상품 & 채널 비교 매트릭스</span>
                    </h2>
                    <p className="text-xs text-[#5A6B63] mt-0.5">
                      벨포레 추천 단가 및 예약률과 4대 타사의 일별 대표 판매상품명·판매채널·최저가를 한눈에 대조합니다.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#5A6B63]">
                    표시 일수: {formatNum(filteredDays.length)}일
                  </span>
                </div>

                <div className="overflow-x-auto max-h-[680px] overflow-y-auto rounded-2xl border border-[#D0C6BB]/75">
                  <table className="w-full border-collapse text-left text-xs font-financial min-w-[1180px]">
                    <thead className="sticky top-0 z-10 bg-[#F4F3EE] border-b-2 border-[#1B382E] text-[#1B382E] font-bold">
                      <tr>
                        <th className="py-3.5 px-4">일자 (요일)</th>
                        <th className="py-3.5 px-4 bg-[#E8F2EE]/60">벨포레 예약률 / 추천가</th>
                        {targetResorts
                          .filter((rName) => selectedResort === 'ALL' || rName === selectedResort)
                          .map((rName) => (
                            <th key={rName} className="py-3.5 px-4 border-l border-[#D0C6BB]/60">
                              {rName} (최저가 상품 · 채널 · 상품수)
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D0C6BB]/40">
                      {filteredDays.map((day) => {
                        const resortsMap = new Map<string, ExtendedResortDetail>();
                        (day.competitorBenchmark?.resorts || []).forEach((r) => {
                          resortsMap.set(r.resortName, r as ExtendedResortDetail);
                        });
                        const isWknd = day.isWeekend || day.isHoliday;

                        return (
                          <tr key={day.date} className="hover:bg-[#F4F3EE]/50 transition-colors">
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className={`font-black text-sm ${isWknd ? 'text-[#8B2635]' : 'text-[#1B382E]'}`}>
                                {day.date} ({day.dayOfWeek})
                              </div>
                              <div className="text-[10px] text-[#5A6B63] font-sans">
                                {day.holidayName || day.dayTypeLabel || day.dayType}
                              </div>
                            </td>

                            <td className="py-3.5 px-4 bg-[#E8F2EE]/25 whitespace-nowrap">
                              <div className="font-black text-sm text-[#284F42]">
                                {formatWon(day.pricing?.recommendedAdr)}
                              </div>
                              <div className="text-[11px] text-[#5A6B63]">
                                예약 {formatNum(day.inventory?.otbRoomsBooked)}실 ({formatPct(day.inventory?.currentOtbOccupancyPct)})
                              </div>
                            </td>

                            {targetResorts
                              .filter((rName) => selectedResort === 'ALL' || rName === selectedResort)
                              .map((rName) => {
                                const r = resortsMap.get(rName);
                                if (!r) {
                                  return (
                                    <td key={rName} className="py-3.5 px-4 border-l border-[#D0C6BB]/40 text-[#5A6B63]">
                                      -
                                    </td>
                                  );
                                }
                                return (
                                  <td key={rName} className="py-3.5 px-4 border-l border-[#D0C6BB]/40 align-top max-w-[260px]">
                                    {r.isSoldOut ? (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#FDF0ED] text-[#8B2635] border border-[#EAC5BD] font-sans">
                                        {r.isNewlySoldOut ? '🔥 신규 품절 마감' : '품절 마감'}
                                      </span>
                                    ) : (
                                      <div className="space-y-1">
                                        <div className="flex items-center justify-between gap-2">
                                          <strong className="text-sm font-black text-[#1B382E]">
                                            {formatWon(r.minPrice)}
                                          </strong>
                                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#E8F2EE] text-[#1E523F] font-sans">
                                            {r.lowestChannel} · {formatNum(r.offerCount)}개
                                          </span>
                                        </div>
                                        <p
                                          className="text-[11px] font-semibold text-[#5A6B63] font-sans line-clamp-2 break-keep"
                                          title={r.lowestRoomName || ''}
                                        >
                                          {r.lowestRoomName}
                                        </p>
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ================================================================================= */}
            {/* VIEW 3: 타사별 · 월별 · 요일별 평균 판매가 및 품절률 요약 */}
            {/* ================================================================================= */}
            {viewMode === 'MONTHLY_SUMMARY' && (
              <div className="bg-white rounded-3xl p-6 border border-[#D0C6BB] shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D0C6BB]/50 pb-4">
                  <div>
                    <h2 className="text-lg font-black text-[#1B382E] flex items-center gap-2">
                      <TrendingUp size={18} className="text-[#284F42]" />
                      <span>4대 경쟁 리조트 월별 · 요일구분별 평균 판매가 및 품절률 요약</span>
                    </h2>
                    <p className="text-xs text-[#5A6B63] mt-0.5">
                      S3 영구 시계열 DB에 누적된 타사별·월별·요일구분(평일/금요일/토요일/일요일) 평균 최저가, 중간가 및 품절 마감 비율입니다.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#5A6B63]">
                    총 {formatNum(filteredMonthlyRows.length)}개 구간
                  </span>
                </div>

                <div className="overflow-x-auto max-h-[640px] overflow-y-auto rounded-2xl border border-[#D0C6BB]/75">
                  <table className="w-full border-collapse text-left text-sm font-financial min-w-[960px]">
                    <thead className="sticky top-0 z-10 bg-[#F4F3EE] border-b-2 border-[#1B382E] text-xs font-bold text-[#1B382E]">
                      <tr>
                        <th className="py-3.5 px-4">연월</th>
                        <th className="py-3.5 px-4">경쟁 리조트명</th>
                        <th className="py-3.5 px-3 text-center">요일 구분</th>
                        <th className="py-3.5 px-3 text-right">관측 일수</th>
                        <th className="py-3.5 px-3 text-right">품절 마감률</th>
                        <th className="py-3.5 px-4 text-right">평균 최저가</th>
                        <th className="py-3.5 px-4 text-right">평균 중간가</th>
                        <th className="py-3.5 px-4 text-right">중형(16~35평) 평균가</th>
                        <th className="py-3.5 px-4 text-right">대형(51평급) 평균가</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D0C6BB]/30">
                      {filteredMonthlyRows.length > 0 ? (
                        filteredMonthlyRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-[#F4F3EE]/50 transition-colors">
                            <td className="py-3 px-4 font-bold text-[#1B382E]">{row.stayYearMonth}</td>
                            <td className="py-3 px-4 font-black text-[#1B382E]">{row.resortName}</td>
                            <td className="py-3 px-3 text-center">
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F4F3EE] text-[#1B382E] border border-[#D0C6BB]/60">
                                {row.dayType}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right text-[#5A6B63]">{formatNum(row.observations)}일</td>
                            <td className="py-3 px-3 text-right font-black text-[#8B2635]">
                              {formatPct(row.soldOutRatePct)}
                            </td>
                            <td className="py-3 px-4 text-right font-black text-[#284F42]">
                              {formatWon(row.avgMinPrice)}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-[#5A6B63]">
                              {formatWon(row.avgMedianPrice)}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-[#1B382E]">
                              {formatWon(row.avgTier16_35Price)}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-[#1B382E]">
                              {formatWon(row.avgTier51Price)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-[#5A6B63]">
                            표시할 월별·요일별 타사 통계 데이터가 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
