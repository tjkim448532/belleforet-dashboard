import { useState, useEffect, useMemo } from 'react';
import {
  Utensils,
  Clock,
  CalendarOff,
  Trophy,
  TrendingUp,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  PieChart,
  Store,
  Sparkles,
  Phone,
  MapPin
} from 'lucide-react';
import GlobalDatePicker from '../components/GlobalDatePicker';
import ContentDivisionNav from '../components/dashboard/ContentDivisionNav';
import { useDate } from '../contexts/DateContext';
import { secureFetcher } from '../lib/secureFetcher';
import { getLatestClosedDateStr } from '../lib/dateUtils';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

export interface TopMenuItem {
  rank: number | null;
  menuName: string;
  sales: number;
  quantity: number;
  unitPrice?: number;
  venueSharePct?: number | null;
}

export interface OutsourcedFnbVenueData {
  venueName: string;
  partName?: string;
  todayActual: number;
  todayLy: number;
  todayGrowth: number | null;
  todayQuantity: number;
  mtdActual: number;
  mtdLy: number;
  mtdGrowth: number | null;
  mtdQuantity: number;
  ytdActual: number;
  ytdLy: number;
  ytdGrowth: number | null;
  ytdQuantity: number;
  todaySharePct: number | null;
  mtdSharePct: number | null;
  ytdSharePct: number | null;
  sharePct: number | null;
  topMenus: TopMenuItem[];
  closedDay: string;
  operatingHours: string;
  contact?: string;
  location?: string;
  officialUrl?: string;
  crawledMenus?: Array<{ name: string; price: string }>;
}

export interface OutsourcedFnbSummary {
  todayActual: number;
  todayLy: number;
  todayGrowth: number | null;
  mtdActual: number;
  mtdLy: number;
  mtdGrowth: number | null;
  ytdActual: number;
  ytdLy: number;
  ytdGrowth: number | null;
  totalVenuesCount: number;
}

type PeriodMetricTab = 'ytd' | 'mtd' | 'today';

export interface OutsourcedFnbDashboardProps {
  viewMode?: 'CARDS' | 'DIRECTORY';
}

const formatNum = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return '-';
  return new Intl.NumberFormat('ko-KR').format(Math.round(val));
};

const showPct = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return '-';
  return `${Number(val).toFixed(2)}%`;
};

export default function OutsourcedFnbDashboard({ viewMode = 'CARDS' }: OutsourcedFnbDashboardProps) {
  const { startDate, endDate, isRange } = useDate();
  const isRangeMode = Boolean(isRange && endDate && startDate !== endDate);

  const [metricTab, setMetricTab] = useState<PeriodMetricTab>('ytd');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDedicatedApiLive, setIsDedicatedApiLive] = useState<boolean>(false);
  const [catalogLastUpdated, setCatalogLastUpdated] = useState<string>('공식 웹 정보 기준');

  const [summary, setSummary] = useState<OutsourcedFnbSummary | null>(null);
  const [venues, setVenues] = useState<OutsourcedFnbVenueData[]>([]);

  useEffect(() => {
    let isCancelled = false;

    const fetchAllData = async () => {
      setLoading(true);
      setError(null);

      const latestClosed = getLatestClosedDateStr();
      const query = isRangeMode
        ? `startDate=${startDate || latestClosed}&endDate=${endDate || latestClosed}`
        : `date=${startDate || latestClosed}`;

      try {
        const dedicatedRes = await secureFetcher(`${API_BASE}/api/v6/report/outsourced-fnb-sales?${query}`);

        if (isCancelled) return;

        const dedicatedPayload = dedicatedRes?.data ?? dedicatedRes;
        const rawUpdated =
          dedicatedPayload?.metadata?.lastUpdated ||
          dedicatedPayload?.lastUpdated ||
          dedicatedPayload?.summary?.lastUpdated;
        if (rawUpdated) {
          setCatalogLastUpdated(`${String(rawUpdated).replace('T', ' ').substring(0, 16)} (공식 웹 정보 동기화)`);
        }

        if (
          dedicatedPayload &&
          dedicatedPayload.summary &&
          Array.isArray(dedicatedPayload.venues) &&
          dedicatedPayload.venues.length > 0
        ) {
          setIsDedicatedApiLive(true);
          const s = dedicatedPayload.summary;
          setSummary({
            todayActual: Number(s.todayActual ?? s.periodActual ?? 0),
            todayLy: Number(s.todayLy ?? s.periodLy ?? 0),
            todayGrowth: s.todayGrowth ?? s.periodGrowth ?? null,
            mtdActual: Number(s.mtdActual ?? 0),
            mtdLy: Number(s.mtdLy ?? 0),
            mtdGrowth: s.mtdGrowth ?? null,
            ytdActual: Number(s.ytdActual ?? 0),
            ytdLy: Number(s.ytdLy ?? 0),
            ytdGrowth: s.ytdGrowth ?? null,
            totalVenuesCount: Number(s.totalVenuesCount ?? dedicatedPayload.venues.length)
          });

          const mappedVenues: OutsourcedFnbVenueData[] = dedicatedPayload.venues.map((v: any) => {
            const rawTopMenus = Array.isArray(v.topMenus) ? v.topMenus.slice(0, 3) : [];
            return {
              venueName: v.venueName,
              partName: v.partName || '식음',
              todayActual: Number(v.todayActual ?? v.periodActual ?? 0),
              todayLy: Number(v.todayLy ?? v.periodLy ?? 0),
              todayGrowth: v.todayGrowth ?? v.periodGrowth ?? null,
              todayQuantity: Number(v.todayQuantity ?? v.periodQuantity ?? 0),
              mtdActual: Number(v.mtdActual ?? 0),
              mtdLy: Number(v.mtdLy ?? 0),
              mtdGrowth: v.mtdGrowth ?? null,
              mtdQuantity: Number(v.mtdQuantity ?? 0),
              ytdActual: Number(v.ytdActual ?? 0),
              ytdLy: Number(v.ytdLy ?? 0),
              ytdGrowth: v.ytdGrowth ?? null,
              ytdQuantity: Number(v.ytdQuantity ?? 0),
              todaySharePct: v.todaySharePct ?? v.periodSharePct ?? null,
              mtdSharePct: v.mtdSharePct ?? null,
              ytdSharePct: v.ytdSharePct ?? null,
              sharePct: v.sharePct ?? null,
              topMenus: rawTopMenus.map((m: any) => ({
                rank: m.rank != null ? Number(m.rank) : null,
                menuName: m.menuName || m.itemName || '-',
                sales: Number(m.sales ?? m.totalSales ?? 0),
                quantity: Number(m.quantity ?? m.qty ?? 0),
                unitPrice: m.unitPrice !== undefined ? Number(m.unitPrice) : undefined,
                venueSharePct: m.venueSharePct ?? m.sharePct ?? null
              })),
              closedDay: v.closedDay || '-',
              operatingHours: v.operatingHours || '-',
              contact: v.contact || undefined,
              location: v.location || undefined,
              officialUrl: v.officialUrl || undefined,
              crawledMenus: Array.isArray(v.crawledMenus) ? v.crawledMenus : []
            };
          });

          setVenues(mappedVenues);
          return;
        }

        setIsDedicatedApiLive(false);
        setSummary(null);
        setVenues([]);
        setError('콘텐츠기획본부(외주식음) 정산 데이터를 찾을 수 없습니다.');
      } catch (err: any) {
        if (!isCancelled) {
          setError(err?.message || '외주식음 데이터를 불러오는 중 오류가 발생했습니다.');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchAllData();
    return () => {
      isCancelled = true;
    };
  }, [startDate, endDate, isRangeMode]);

  // 선택된 탭(YTD / MTD / Today)에 따라 매출 내림차순 정렬
  const sortedVenues = useMemo(() => {
    return [...venues].sort((a, b) => {
      if (metricTab === 'today') return b.todayActual - a.todayActual;
      if (metricTab === 'mtd') return b.mtdActual - a.mtdActual;
      return b.ytdActual - a.ytdActual;
    });
  }, [venues, metricTab]);

  const getActiveRevenue = (v: OutsourcedFnbVenueData) => {
    if (metricTab === 'today') return v.todayActual;
    if (metricTab === 'mtd') return v.mtdActual;
    return v.ytdActual;
  };

  const getActiveLyRevenue = (v: OutsourcedFnbVenueData) => {
    if (metricTab === 'today') return v.todayLy;
    if (metricTab === 'mtd') return v.mtdLy;
    return v.ytdLy;
  };

  const getActiveGrowth = (v: OutsourcedFnbVenueData) => {
    if (metricTab === 'today') return v.todayGrowth;
    if (metricTab === 'mtd') return v.mtdGrowth;
    return v.ytdGrowth;
  };

  const getActiveSharePct = (v: OutsourcedFnbVenueData) => {
    if (metricTab === 'today') return v.todaySharePct;
    if (metricTab === 'mtd') return v.mtdSharePct;
    return v.ytdSharePct ?? v.sharePct;
  };

  const isDirectoryMode = viewMode === 'DIRECTORY';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1650px] mx-auto space-y-6">
      {/* 1. 상단 헤더 배너 (통합 화이트 표준 스타일) */}
      <div className="bg-white p-6 sm:p-7 rounded-[32px] border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 bg-teal-50 text-teal-700 rounded-2xl border border-teal-200 shrink-0">
            <Utensils className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight break-keep">
                {isDirectoryMode
                  ? '외주식음 영업장 종합 일람표 및 정기 휴무일·운영안내'
                  : '외주식음 영업장별 매출 · 점유비율 및 인기 메뉴 Top 3'}
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                컨텐츠기획본부 · 외주식음
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1 break-keep max-w-3xl leading-relaxed">
              {isDirectoryMode
                ? '전체 외주식음 영업장의 당일·당월·연간 매출 및 점유비율을 표로 한눈에 대조하고, 공식 홈페이지 크롤링 기반 정기 휴무일·운영시간·연락처 정보를 안내합니다.'
                : '당일·당월·연간 외주식음 총매출 현황과 각 영업장의 외주식음 내 매출 비중(%), 영업장별 매출 상위 메뉴 Top 3를 집중 분석합니다.'}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <GlobalDatePicker />
        </div>
      </div>

      {/* 컨텐츠기획본부 4대 페이지 상단 탭 네비게이션 */}
      <ContentDivisionNav />

      {/* 2. 크롤링 휴무일 동기화 배지 & 상태 안내 */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-5 py-3.5 rounded-2xl border border-slate-200/90 shadow-2xs text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
            <CheckCircle2 size={14} className="text-emerald-600" />
            휴무일 크롤링 동기화: {catalogLastUpdated}
          </span>
          <span className="text-slate-600 font-medium flex flex-wrap items-center gap-1.5">
            <span>정기 휴무 매장:</span>
            {venues.filter((v) => v.closedDay && (v.closedDay.includes('휴무') || v.closedDay.includes('휴장')))
              .length > 0 ? (
              venues
                .filter((v) => v.closedDay && (v.closedDay.includes('휴무') || v.closedDay.includes('휴장')))
                .map((v, i, arr) => (
                  <span key={v.venueName} className="inline-flex items-center">
                    <strong className="text-rose-600">
                      {v.venueName}({v.closedDay})
                    </strong>
                    {i < arr.length - 1 && <span className="text-slate-400 mx-1">·</span>}
                  </span>
                ))
            ) : (
              <span className="text-slate-400">-</span>
            )}
          </span>
        </div>

        {isDedicatedApiLive && !loading ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">
            <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
            <span>외주식음 매출 현황 및 Top 3 메뉴 실시간 연동</span>
          </div>
        ) : !loading ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-semibold">
            <AlertCircle size={14} className="text-amber-600 shrink-0" />
            <span>점유비율(%) 및 POS 실매출 Top 3 메뉴 데이터 연동 준비 중</span>
          </div>
        ) : null}
      </div>

      {/* 3. 전체 외주식음 요약 KPI 카드 (3종: 당일/선택기간, 당월 MTD, 올해 누적 YTD) */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white rounded-2xl p-6 border border-slate-200 h-36 animate-pulse flex flex-col justify-between"
            >
              <div className="h-4 w-32 bg-slate-200 rounded" />
              <div className="h-8 w-48 bg-slate-200 rounded" />
              <div className="h-3 w-40 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-2xl flex items-center gap-3 font-bold">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      ) : summary ? (
        <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80 mb-6">
          {/* 소프트 슬레이트 패널 (사용자 지정 SSOT 스타일) */}
          <h4 className="font-bold text-slate-800 mb-3 border-b border-slate-200 pb-2 text-xs flex items-center justify-between">
            <span>외주식음 매출 및 누계 실적 (당일 · 당월 MTD · 올해 YTD)</span>
            <span className="text-[11px] text-slate-400 font-normal">카드를 클릭하여 조회 기준을 변경할 수 있습니다</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* KPI 1: 당일 / 선택 기간 총매출 */}
            <div
              onClick={() => setMetricTab('today')}
              className={`cursor-pointer rounded-xl p-5 border transition-all flex flex-col justify-between ${
                metricTab === 'today'
                  ? 'bg-white border-teal-200/80 shadow-xs'
                  : 'bg-white border-slate-200 shadow-2xs hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold ${metricTab === 'today' ? 'text-teal-900' : 'text-slate-700'}`}>
                    {isRangeMode ? '선택 기간 외주식음 총매출' : '당일 외주식음 총매출 (Today)'}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                      metricTab === 'today' ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {metricTab === 'today' ? '선택됨' : '클릭하여 전환'}
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight tabular-nums text-slate-900">
                  {formatNum(summary.todayActual)}
                  <span className="text-xs font-normal text-slate-400 ml-1">원</span>
                </div>
                <div className={`p-2 rounded-lg font-mono text-[11px] font-bold border my-2 text-center tabular-nums ${
                  metricTab === 'today' ? 'bg-teal-50/70 text-teal-900 border-teal-100' : 'bg-slate-100 text-slate-800 border-slate-200/60'
                }`}>
                  {isRangeMode ? '선택 기간 합산' : '금일 확정 마감 실적'}
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  전년 동기: {formatNum(summary.todayLy)}원
                </span>
                {summary.todayGrowth !== null && summary.todayGrowth !== undefined ? (
                  <span
                    className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${
                      summary.todayGrowth >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
                    }`}
                  >
                    {summary.todayGrowth >= 0 ? '▲' : '▼'} {Math.abs(summary.todayGrowth).toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </div>
            </div>

            {/* KPI 2: 당월 누계 (MTD) */}
            <div
              onClick={() => setMetricTab('mtd')}
              className={`cursor-pointer rounded-xl p-5 border transition-all flex flex-col justify-between ${
                metricTab === 'mtd'
                  ? 'bg-white border-teal-200/80 shadow-xs'
                  : 'bg-white border-slate-200 shadow-2xs hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold ${metricTab === 'mtd' ? 'text-teal-900' : 'text-slate-700'}`}>
                    당월 누적 외주식음 총매출 (MTD)
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                      metricTab === 'mtd' ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {metricTab === 'mtd' ? '선택됨' : '클릭하여 전환'}
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight tabular-nums text-slate-900">
                  {formatNum(summary.mtdActual)}
                  <span className="text-xs font-normal text-slate-400 ml-1">원</span>
                </div>
                <div className={`p-2 rounded-lg font-mono text-[11px] font-bold border my-2 text-center tabular-nums ${
                  metricTab === 'mtd' ? 'bg-teal-50/70 text-teal-900 border-teal-100' : 'bg-slate-100 text-slate-800 border-slate-200/60'
                }`}>
                  당월 1일부터 현재까지 누적 합산
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  전년 당월: {formatNum(summary.mtdLy)}원
                </span>
                {summary.mtdGrowth !== null && summary.mtdGrowth !== undefined ? (
                  <span
                    className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${
                      summary.mtdGrowth >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
                    }`}
                  >
                    {summary.mtdGrowth >= 0 ? '▲' : '▼'} {Math.abs(summary.mtdGrowth).toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </div>
            </div>

            {/* KPI 3: 올해 누적 (YTD) */}
            <div
              onClick={() => setMetricTab('ytd')}
              className={`cursor-pointer rounded-xl p-5 border transition-all flex flex-col justify-between ${
                metricTab === 'ytd'
                  ? 'bg-white border-teal-200/80 shadow-xs'
                  : 'bg-white border-slate-200 shadow-2xs hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold ${metricTab === 'ytd' ? 'text-teal-900' : 'text-slate-700'}`}>
                    연간 누적 외주식음 총매출 (YTD)
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                      metricTab === 'ytd' ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {metricTab === 'ytd' ? '선택됨 (기본)' : '클릭하여 전환'}
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight tabular-nums text-slate-900">
                  {formatNum(summary.ytdActual)}
                  <span className="text-xs font-normal text-slate-400 ml-1">원</span>
                </div>
                <div className={`p-2 rounded-lg font-mono text-[11px] font-bold border my-2 text-center tabular-nums ${
                  metricTab === 'ytd' ? 'bg-teal-50/70 text-teal-900 border-teal-100' : 'bg-slate-100 text-slate-800 border-slate-200/60'
                }`}>
                  올해 1월 1일부터 현재까지 누적 실적
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  전년 누적: {formatNum(summary.ytdLy)}원
                </span>
                {summary.ytdGrowth !== null && summary.ytdGrowth !== undefined ? (
                  <span
                    className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${
                      summary.ytdGrowth >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
                    }`}
                  >
                    {summary.ytdGrowth >= 0 ? '▲' : '▼'} {Math.abs(summary.ytdGrowth).toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </div>
            </div>
          </div>

          {/* 하단 공식 기준 배너 */}
          <div className="text-xs text-teal-800 bg-teal-50 p-3 rounded-xl mt-4 border border-teal-100 font-medium flex items-center justify-between flex-wrap gap-2">
            <span><strong>공식 산출 기준:</strong> 외주식음 매출 및 점유비율(%)은 벨포레 단지 내 공식 입점 식음 영업장들의 확정 실적을 기준으로 산출됩니다.</span>
            <span className="text-[11px] text-teal-600 font-mono font-normal">F&B SSOT</span>
          </div>
        </div>
      ) : null}

      {/* ================================================================= */}
      {/* [PAGE 1 모드: CARDS] 영업장별 매출 + 점유비율 + Top 3 메뉴 카드 그리드 */}
      {/* ================================================================= */}
      {!isDirectoryMode && !loading && sortedVenues.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Store size={20} className="text-emerald-600" />
              <span>외주식음 영업장별 매출 · 점유비율 · Top 3 메뉴 · 휴무일 상세</span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                총 {sortedVenues.length}개 영업장
              </span>
            </h2>

            <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setMetricTab('ytd')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  metricTab === 'ytd' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                올해 누적 (YTD) 기준
              </button>
              <button
                type="button"
                onClick={() => setMetricTab('mtd')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  metricTab === 'mtd' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                당월 누적 (MTD) 기준
              </button>
              <button
                type="button"
                onClick={() => setMetricTab('today')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  metricTab === 'today' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {isRangeMode ? '선택 기간 기준' : '당일 (Today) 기준'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {sortedVenues.map((venue, idx) => {
              const activeRev = getActiveRevenue(venue);
              const activeLyRev = getActiveLyRevenue(venue);
              const activeGrowth = getActiveGrowth(venue);
              const activeSharePct = getActiveSharePct(venue);
              const hasRegularClosedDay =
                venue.closedDay.includes('휴무') || venue.closedDay.includes('휴장');

              return (
                <div
                  key={venue.venueName}
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all p-6 flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-4">
                    {/* 카드 상단: 순위, 영업장명, 휴무일 배지 */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-extrabold shrink-0 ${
                            idx === 0
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : idx === 1
                              ? 'bg-slate-200 text-slate-800'
                              : idx === 2
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div>
                          <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                            {venue.venueName}
                          </h3>
                          {venue.location && (
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin size={11} className="text-slate-400 shrink-0" />
                              <span className="truncate" title={venue.location}>
                                {venue.location}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>

                      {venue.officialUrl && (
                        <a
                          href={venue.officialUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-slate-400 hover:text-emerald-600 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                          title="공식 홈페이지 매장 상세 보기"
                        >
                          <ExternalLink size={15} />
                        </a>
                      )}
                    </div>

                    {/* 크롤링 기반 휴무일 및 운영시간 박스 */}
                    <div
                      className={`p-3 rounded-2xl border text-xs space-y-1.5 ${
                        hasRegularClosedDay
                          ? 'bg-rose-50/70 border-rose-200/80'
                          : 'bg-slate-50 border-slate-200/70'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          <CalendarOff
                            size={13}
                            className={hasRegularClosedDay ? 'text-rose-600' : 'text-emerald-600'}
                          />
                          휴무일 (크롤링)
                        </span>
                        <span
                          className={`font-extrabold px-2 py-0.5 rounded-md ${
                            hasRegularClosedDay
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {venue.closedDay}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Clock size={12} className="text-slate-400" />
                          운영시간
                        </span>
                        <span
                          className="font-mono font-semibold text-slate-800 truncate"
                          title={venue.operatingHours}
                        >
                          {venue.operatingHours}
                        </span>
                      </div>
                    </div>

                    {/* 매출 및 전체 외주식음 내 차지 비율(%) 박스 */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600 font-bold">
                          {metricTab === 'ytd'
                            ? '올해 누적 매출 (YTD)'
                            : metricTab === 'mtd'
                            ? '당월 누적 매출 (MTD)'
                            : '당일/기간 매출'}
                        </span>
                        {activeGrowth !== null && activeGrowth !== undefined && (
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-md border ${
                              activeGrowth >= 0
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-600 border-rose-200'
                            }`}
                          >
                            전년비 {activeGrowth >= 0 ? '▲' : '▼'} {Math.abs(activeGrowth).toFixed(1)}%
                          </span>
                        )}
                      </div>

                      <div className="flex items-baseline justify-between gap-2">
                        <div className="text-2xl font-black font-mono tracking-tight text-slate-900 tabular-nums">
                          {formatNum(activeRev)}
                          <span className="text-xs font-normal text-slate-400 ml-1">원</span>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-slate-500 font-medium">전체 외주식음 내 비중</div>
                          <div className="text-base font-black text-teal-700 font-mono flex items-center justify-end gap-1">
                            <PieChart size={13} />
                            <span>{showPct(activeSharePct)}</span>
                          </div>
                        </div>
                      </div>

                      {/* 비중 프로그레스 바 */}
                      {activeSharePct !== null && activeSharePct !== undefined ? (
                        <div className="w-full bg-slate-200/70 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-teal-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, Number(activeSharePct)))}%` }}
                          />
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200">
                          <span>전년 실적: {formatNum(activeLyRev)}원</span>
                          <span>비율(%): 집계 데이터 없음</span>
                        </div>
                      )}
                    </div>

                    {/* 매출 상위 메뉴 Top 3 섹션 */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                          <Trophy size={14} className="text-amber-500" />
                          매출 상위 메뉴 Top 3
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {venue.topMenus.length > 0 ? 'POS 실측 판매금액 순' : 'POS 단일 정산'}
                        </span>
                      </div>

                      {venue.topMenus.length > 0 ? (
                        <div className="space-y-1.5">
                          {venue.topMenus.slice(0, 3).map((menu, mIdx) => (
                            <div
                              key={`${venue.venueName}-menu-${mIdx}`}
                              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0 ${
                                    mIdx === 0
                                      ? 'bg-amber-400 text-slate-950'
                                      : mIdx === 1
                                      ? 'bg-slate-300 text-slate-800'
                                      : 'bg-amber-700/20 text-amber-900'
                                  }`}
                                >
                                  {menu.rank ?? '-'}
                                </span>
                                <span className="font-bold text-slate-800 truncate" title={menu.menuName}>
                                  {menu.menuName}
                                </span>
                              </div>
                              <div className="text-right shrink-0 font-mono">
                                <span className="font-extrabold text-slate-900">{formatNum(menu.sales)}원</span>
                                <span className="text-[10px] text-slate-500 ml-1.5">
                                  ({formatNum(menu.quantity)}건)
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-xs space-y-2">
                          <div className="text-slate-700 font-semibold flex items-center gap-1.5">
                            <Sparkles size={13} className="text-amber-500 shrink-0" />
                            <span>POS 단일 정산 매장 (개별 메뉴 미집계)</span>
                          </div>
                          {venue.crawledMenus && venue.crawledMenus.length > 0 && (
                            <div className="pt-1.5 border-t border-slate-200/80 space-y-1">
                              <div className="text-[10px] font-bold text-slate-400">
                                공식 홈페이지 크롤링 대표 메뉴 (참고용 · 매출액 미집계)
                              </div>
                              {venue.crawledMenus.slice(0, 3).map((cm, cIdx) => (
                                <div
                                  key={cIdx}
                                  className="flex items-center justify-between text-[11px] text-slate-600"
                                >
                                  <span className="truncate" title={cm.name}>
                                    • {cm.name}
                                  </span>
                                  <span className="font-mono text-slate-500 shrink-0 ml-2">{cm.price}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 하단 당일 / 당월 / 연누적 3단 요약 푸터 */}
                  <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-[11px]">
                    <div className="bg-slate-50 p-2 rounded-xl">
                      <div className="text-slate-400 font-medium">{isRangeMode ? '기간' : '당일'}</div>
                      <div
                        className="font-bold text-slate-800 font-mono mt-0.5 truncate"
                        title={`${formatNum(venue.todayActual)}원`}
                      >
                        {formatNum(venue.todayActual)}원
                      </div>
                      {venue.todayGrowth !== null && venue.todayGrowth !== undefined ? (
                        <div
                          className={`text-[10px] font-bold mt-0.5 ${
                            venue.todayGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          전년비 {venue.todayGrowth >= 0 ? '▲' : '▼'}
                          {Math.abs(venue.todayGrowth).toFixed(1)}%
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 mt-0.5">-</div>
                      )}
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl">
                      <div className="text-slate-400 font-medium">당월(MTD)</div>
                      <div
                        className="font-bold text-blue-800 font-mono mt-0.5 truncate"
                        title={`${formatNum(venue.mtdActual)}원`}
                      >
                        {formatNum(venue.mtdActual)}원
                      </div>
                      {venue.mtdGrowth !== null && venue.mtdGrowth !== undefined ? (
                        <div
                          className={`text-[10px] font-bold mt-0.5 ${
                            venue.mtdGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          전년비 {venue.mtdGrowth >= 0 ? '▲' : '▼'}
                          {Math.abs(venue.mtdGrowth).toFixed(1)}%
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 mt-0.5">-</div>
                      )}
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl">
                      <div className="text-slate-400 font-medium">연간(YTD)</div>
                      <div
                        className="font-bold text-indigo-800 font-mono mt-0.5 truncate"
                        title={`${formatNum(venue.ytdActual)}원`}
                      >
                        {formatNum(venue.ytdActual)}원
                      </div>
                      {venue.ytdGrowth !== null && venue.ytdGrowth !== undefined ? (
                        <div
                          className={`text-[10px] font-bold mt-0.5 ${
                            venue.ytdGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          전년비 {venue.ytdGrowth >= 0 ? '▲' : '▼'}
                          {Math.abs(venue.ytdGrowth).toFixed(1)}%
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 mt-0.5">-</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* [PAGE 4 모드: DIRECTORY] 전체 외주식음 영업장 종합 일람표 & 휴무일 안내 */}
      {/* ================================================================= */}
      {isDirectoryMode && !loading && sortedVenues.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-600" />
                <span>외주식음 영업장별 매출 · 점유비율 · Top 3 메뉴 · 휴무일 종합 일람표</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                모든 수치는 정산 집계 데이터 및 공식 홈페이지 안내 정보를 기준으로 표출합니다.
              </p>
            </div>

            <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setMetricTab('ytd')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  metricTab === 'ytd' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                올해 누적 (YTD) 순
              </button>
              <button
                type="button"
                onClick={() => setMetricTab('mtd')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  metricTab === 'mtd' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                당월 누적 (MTD) 순
              </button>
              <button
                type="button"
                onClick={() => setMetricTab('today')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  metricTab === 'today' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {isRangeMode ? '선택 기간 순' : '당일 (Today) 순'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200">
                  <th className="py-3.5 px-4 text-center">순위</th>
                  <th className="py-3.5 px-4 text-left">영업장명 / 연락처</th>
                  <th className="py-3.5 px-4 text-left">휴무일 (크롤링)</th>
                  <th className="py-3.5 px-4 text-left">운영시간</th>
                  <th className="py-3.5 px-4 text-right">
                    <div>{isRangeMode ? '선택기간 매출' : '당일 매출'}</div>
                    <div className="text-[10px] text-slate-400 font-normal">금액 / 전년비(%)</div>
                  </th>
                  <th className="py-3.5 px-4 text-right">
                    <div>당월 누적 (MTD)</div>
                    <div className="text-[10px] text-blue-500 font-normal">금액 / 전년비(%)</div>
                  </th>
                  <th className="py-3.5 px-4 text-right">
                    <div>연간 누적 (YTD)</div>
                    <div className="text-[10px] text-indigo-500 font-normal">금액 / 전년비(%)</div>
                  </th>
                  <th className="py-3.5 px-4 text-right">
                    <div>외주식음 내 비율(%)</div>
                    {!isDedicatedApiLive && (
                      <div className="text-[10px] text-slate-400 font-normal">비율 집계 준비 중</div>
                    )}
                  </th>
                  <th className="py-3.5 px-4 text-left">매출 상위 메뉴 Top 3</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedVenues.map((v, i) => {
                  const hasClosed = v.closedDay.includes('휴무') || v.closedDay.includes('휴장');
                  return (
                    <tr key={v.venueName} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 text-center font-extrabold text-slate-700">{i + 1}</td>
                      <td className="py-3.5 px-4 text-left font-extrabold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{v.venueName}</span>
                          {v.contact && (
                            <span className="text-[10px] font-normal text-slate-400 flex items-center gap-0.5">
                              <Phone size={10} />
                              {v.contact}
                            </span>
                          )}
                        </div>
                        {v.location && (
                          <div className="text-[10px] font-normal text-slate-400 mt-0.5">{v.location}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-left">
                        <span
                          className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${
                            hasClosed ? 'bg-rose-100 text-rose-800' : 'bg-emerald-50 text-emerald-800'
                          }`}
                        >
                          {v.closedDay}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-left font-mono text-slate-600">{v.operatingHours}</td>
                      <td className="py-3.5 px-4 text-right font-mono">
                        <div className="font-bold text-slate-800">{formatNum(v.todayActual)}원</div>
                        {v.todayGrowth !== null && v.todayGrowth !== undefined ? (
                          <div
                            className={`text-[11px] font-semibold mt-0.5 ${
                              v.todayGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            전년비 {v.todayGrowth >= 0 ? '▲' : '▼'} {Math.abs(v.todayGrowth).toFixed(1)}%
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 mt-0.5">-</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono">
                        <div className="font-bold text-blue-800">{formatNum(v.mtdActual)}원</div>
                        {v.mtdGrowth !== null && v.mtdGrowth !== undefined ? (
                          <div
                            className={`text-[11px] font-semibold mt-0.5 ${
                              v.mtdGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            전년비 {v.mtdGrowth >= 0 ? '▲' : '▼'} {Math.abs(v.mtdGrowth).toFixed(1)}%
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 mt-0.5">-</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono">
                        <div className="font-extrabold text-indigo-900">{formatNum(v.ytdActual)}원</div>
                        {v.ytdGrowth !== null && v.ytdGrowth !== undefined ? (
                          <div
                            className={`text-[11px] font-semibold mt-0.5 ${
                              v.ytdGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            전년비 {v.ytdGrowth >= 0 ? '▲' : '▼'} {Math.abs(v.ytdGrowth).toFixed(1)}%
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 mt-0.5">-</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono">
                        {getActiveSharePct(v) !== null && getActiveSharePct(v) !== undefined ? (
                          <span className="font-extrabold text-emerald-700">{showPct(getActiveSharePct(v))}</span>
                        ) : (
                          <span className="text-slate-400 font-normal" title="점유비율 집계 준비 중">
                            -
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-left">
                        {v.topMenus.length > 0 ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {v.topMenus.slice(0, 3).map((m, idx2) => (
                              <span
                                key={idx2}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 font-semibold text-[11px]"
                              >
                                <strong>{m.rank != null ? `${m.rank}위` : '-'}</strong> {m.menuName} (
                                {formatNum(m.sales)}원)
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium text-[11px]">
                              POS 단일 정산 매장 (개별 메뉴 미집계)
                            </span>
                            {v.crawledMenus && v.crawledMenus.length > 0 && (
                              <span className="text-[10px] text-slate-400">
                                (홈페이지 대표: {v.crawledMenus.slice(0, 2).map((c) => c.name).join(', ')})
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {summary && (
                <tfoot>
                  <tr className="bg-slate-900 text-white font-extrabold text-xs">
                    <td colSpan={4} className="py-4 px-4 text-center">
                      [콘텐츠기획본부 외주식음 전체 총합]
                    </td>
                    <td className="py-4 px-4 text-right font-mono">
                      <div>{formatNum(summary.todayActual)}원</div>
                      {summary.todayGrowth !== null && summary.todayGrowth !== undefined && (
                        <div
                          className={`text-[11px] font-bold ${
                            summary.todayGrowth >= 0 ? 'text-emerald-300' : 'text-rose-300'
                          }`}
                        >
                          전년비 {summary.todayGrowth >= 0 ? '▲' : '▼'}{' '}
                          {Math.abs(summary.todayGrowth).toFixed(1)}%
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right font-mono">
                      <div className="text-emerald-300">{formatNum(summary.mtdActual)}원</div>
                      {summary.mtdGrowth !== null && summary.mtdGrowth !== undefined && (
                        <div
                          className={`text-[11px] font-bold ${
                            summary.mtdGrowth >= 0 ? 'text-emerald-300' : 'text-rose-300'
                          }`}
                        >
                          전년비 {summary.mtdGrowth >= 0 ? '▲' : '▼'}{' '}
                          {Math.abs(summary.mtdGrowth).toFixed(1)}%
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right font-mono">
                      <div className="text-amber-300">{formatNum(summary.ytdActual)}원</div>
                      {summary.ytdGrowth !== null && summary.ytdGrowth !== undefined && (
                        <div
                          className={`text-[11px] font-bold ${
                            summary.ytdGrowth >= 0 ? 'text-emerald-300' : 'text-rose-300'
                          }`}
                        >
                          전년비 {summary.ytdGrowth >= 0 ? '▲' : '▼'}{' '}
                          {Math.abs(summary.ytdGrowth).toFixed(1)}%
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-slate-400">
                      {isDedicatedApiLive ? showPct(100) : '-'}
                    </td>
                    <td className="py-4 px-4 text-slate-300 font-normal">외주식음 전체 합계</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
