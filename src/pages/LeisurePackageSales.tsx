import { useState, useEffect, useMemo } from 'react';
import { useDate } from '../contexts/DateContext';
import { secureFetcher } from '../lib/secureFetcher';
import { 
  Package, 
  Layers, 
  Users, 
  AlertCircle, 
  Ticket, 
  RefreshCw, 
  CheckCircle2, 
  Percent,
  Search,
  Store,
  Sparkles
} from 'lucide-react';
import GlobalDatePicker from '../components/GlobalDatePicker';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

export interface PackageItemDetail {
  packageName: string;
  allocatedRevenue: number;
  visitors: number;
  salesQty: number;
  splitRatio?: number;
  revenueSharePct?: number | null;
  visitorSharePct?: number | null;
}

export interface VenuePackagePerformance {
  venueName: string;
  categoryName?: string;
  totalRevenue: number;
  packageRevenue: number;
  singleRevenue: number;
  packageRevenueSharePct: number | null;
  totalVisitors: number;
  packageVisitors: number;
  singleVisitors: number;
  packageVisitorSharePct: number | null;
  packageCount: number;
  packages: PackageItemDetail[];
}

export interface LeisurePackageSummary {
  totalLeisureRevenue: number;
  totalPackageRevenue: number;
  packageRevenueSharePct: number | null;
  totalLeisureVisitors: number;
  totalPackageVisitors: number;
  packageVisitorSharePct: number | null;
  topVenueByPackageRev: string;
  topPackageName: string;
}

export interface LeisurePackageApiResponse {
  success?: boolean;
  dateRange?: {
    startDate: string;
    endDate: string;
    isRange: boolean;
  };
  summary: LeisurePackageSummary;
  venues: VenuePackagePerformance[];
}

const parseNum = (v: any): number => {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  const cleaned = String(v).replace(/,/g, '').trim();
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
};

const formatWon = (v: any): string => {
  if (v === null || v === undefined || v === '') return '-';
  const num = parseNum(v);
  return new Intl.NumberFormat('ko-KR').format(Math.round(num));
};

const formatCount = (v: any): string => {
  if (v === null || v === undefined || v === '') return '-';
  const num = parseNum(v);
  return new Intl.NumberFormat('ko-KR').format(Math.round(num));
};

const showPct = (v: any): string => {
  if (v === null || v === undefined || v === '') return '-';
  const num = Number(v);
  if (isNaN(num)) return '-';
  return `${num.toFixed(1)}%`;
};

export default function LeisurePackageSales() {
  const { startDate, endDate, isRange } = useDate();
  const [data, setData] = useState<LeisurePackageApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedVenue, setSelectedVenue] = useState<string>('ALL');

  const isRangeMode = Boolean(isRange && endDate && startDate !== endDate);

  const fetchPackageSales = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = isRangeMode
        ? `startDate=${startDate}&endDate=${endDate}`
        : `date=${startDate}`;

      const res = await secureFetcher(`${API_BASE}/api/v6/report/leisure-package-sales?${queryParams}`);
      if (res && res.summary && Array.isArray(res.venues)) {
        setData(res);
      } else if (res && res.data && res.data.summary && Array.isArray(res.data.venues)) {
        setData(res.data);
      } else {
        setData(null);
      }
    } catch (err: any) {
      setData(null);
      setError(err?.message || 'leisure-package-sales API 조회 실패');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackageSales();
  }, [startDate, endDate, isRange]);

  const summary = data?.summary || null;
  const venues = data?.venues || [];

  const filteredVenues = useMemo(() => {
    let result = venues;
    if (selectedVenue !== 'ALL') {
      result = result.filter(v => v.venueName === selectedVenue);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter(v => 
        v.venueName.toLowerCase().includes(term) ||
        v.packages?.some(p => p.packageName.toLowerCase().includes(term))
      );
    }
    return result;
  }, [venues, selectedVenue, searchTerm]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1650px] mx-auto space-y-6">
      
      {/* 1. 상단 헤더 배너 (통합 화이트 표준 스타일) */}
      <div className="bg-white p-6 sm:p-7 rounded-[32px] border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 bg-teal-50 text-teal-700 rounded-2xl border border-teal-200 shrink-0">
            <Package className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight break-keep">
                레저 영업장별 패키지(복합권) 매출 비중 & 이용객 기여도 분석
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                레저본부 · 패키지 안분 SSOT
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1 break-keep max-w-3xl leading-relaxed">
              마운틴카트 그랜드포렛, 익스트림루지 등 각 영업장 총매출 및 이용객 중 패밀리4종 패스 등 복합 패키지가 차지하는 기여도를 정밀 분석합니다.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <GlobalDatePicker />
          <button
            onClick={fetchPackageSales}
            disabled={loading}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            새로고침
          </button>
        </div>
      </div>

      {/* 2. 상단 4대 핵심 요약 패널 (소프트 슬레이트-50 패널 + 화이트 카드 표준) */}
      {summary ? (
        <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80 mb-6">
          <h4 className="font-bold text-slate-800 mb-3 border-b border-slate-200 pb-2 text-xs flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Layers size={14} className="text-teal-700" />
              레저본부 패키지 통합 기여도 요약 (매출 & 이용객 비중)
            </span>
            <span className="text-[11px] text-slate-400 font-normal">
              {isRangeMode ? `${startDate} ~ ${endDate} 누계` : `${startDate} 당일 실적`}
            </span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* KPI 1: 전체 패키지 귀속 매출 (Hero - 틸 강조) */}
            <div className="bg-white rounded-xl p-5 border border-teal-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-teal-900">패키지 총매출 (귀속분)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold bg-teal-100 text-teal-800">
                    전체 대비 {showPct(summary.packageRevenueSharePct)}
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight tabular-nums text-slate-900">
                  {formatWon(summary.totalPackageRevenue)}
                  <span className="text-xs font-normal text-slate-400 ml-1">원</span>
                </div>
                <div className="p-2 rounded-lg font-mono text-[11px] font-bold border my-2 text-center tabular-nums bg-teal-50/70 text-teal-900 border-teal-100">
                  레저 총매출: {formatWon(summary.totalLeisureRevenue)}원
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>패키지 매출 기여율</span>
                <span className="font-bold text-teal-700">{showPct(summary.packageRevenueSharePct)}</span>
              </div>
            </div>

            {/* KPI 2: 전체 패키지 유입 이용객수 */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs hover:border-slate-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700">패키지 유입 이용객수</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold bg-slate-100 text-slate-700">
                    전체 대비 {showPct(summary.packageVisitorSharePct)}
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight tabular-nums text-slate-900">
                  {formatCount(summary.totalPackageVisitors)}
                  <span className="text-xs font-normal text-slate-400 ml-1">명</span>
                </div>
                <div className="p-2 rounded-lg font-mono text-[11px] font-bold border my-2 text-center tabular-nums bg-slate-100 text-slate-800 border-slate-200/60">
                  레저 총이용객: {formatCount(summary.totalLeisureVisitors)}명
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>패키지 이용객 점유율</span>
                <span className="font-bold text-slate-800">{showPct(summary.packageVisitorSharePct)}</span>
              </div>
            </div>

            {/* KPI 3: 패키지 매출 1위 영업장 */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs hover:border-slate-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700">패키지 매출 1위 영업장</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold bg-amber-100 text-amber-800">
                    최다 기여
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 truncate" title={summary.topVenueByPackageRev || '-'}>
                  {summary.topVenueByPackageRev || '-'}
                </div>
                <div className="p-2 rounded-lg font-mono text-[11px] font-bold border my-2 text-center tabular-nums bg-slate-100 text-slate-800 border-slate-200/60">
                  복합권 최다 유치 영업장
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>연계 상품군</span>
                <span className="font-bold text-slate-800">마운틴카트·루지 등</span>
              </div>
            </div>

            {/* KPI 4: 최다 판매 패키지 권종 */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs hover:border-slate-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700">최다 판매 패키지 권종</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold bg-teal-50 text-teal-800 border border-teal-200">
                    대표 상품
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 truncate" title={summary.topPackageName || '-'}>
                  {summary.topPackageName || '-'}
                </div>
                <div className="p-2 rounded-lg font-mono text-[11px] font-bold border my-2 text-center tabular-nums bg-slate-100 text-slate-800 border-slate-200/60">
                  1:N 다중 티켓 안분 주력
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>안분 방식</span>
                <span className="font-bold text-slate-800">정규 마트 안분율 SSOT</span>
              </div>
            </div>

          </div>

          {/* 하단 공식 기준 배너 */}
          <div className="text-xs text-teal-800 bg-teal-50 p-3 rounded-xl mt-4 border border-teal-100 font-medium flex items-center justify-between flex-wrap gap-2">
            <span>
              <strong>공식 산출 기준:</strong> 복합 패키지(패밀리4종 패스, 결합권 등)는 <code className="bg-white/80 px-1 py-0.5 rounded text-teal-900 font-mono">dim_ticket_split_rule</code>의 공식 안분율에 따라 매출이 각 대상 영업장에 0-Variance로 배분되며, 이용객 수는 각 시설별 1장당 1명씩 실측 집계됩니다.
            </span>
            <span className="text-[11px] text-teal-600 font-mono font-normal">LEISURE PACKAGE SSOT</span>
          </div>
        </div>
      ) : null}

      {/* 3. 로딩 상태 또는 Fail-Stop (백엔드 API 대기 상태) 패널 */}
      {loading ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-700">레저 영업장별 패키지 매출 및 이용객 실측 데이터를 조회 중입니다...</p>
        </div>
      ) : !data || venues.length === 0 ? (
        /* Zero-Fake / Fail-Stop 원칙: 백엔드 API 미완성 시 임의의 Mock 데이터를 만들지 않고 명확히 Fail-Stop 결함 상태를 폭로 */
        <div className="bg-white rounded-3xl border border-amber-200 p-8 shadow-xs space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
              <AlertCircle size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black text-slate-900">
                  [Zero-Fake / Fail-Stop] 레저 영업장별 패키지 매출·이용객 분석 API 연동 대기
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  GET /api/v6/report/leisure-package-sales
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                대표님 절대 지침에 따라 프론트엔드 단독의 임의 사칙연산이나 가짜 숫자(Mock Data) 주입을 영구 금지하며, 백엔드 정규 마트 API 배포 전까지 <strong>Fail-Stop(결함 노출 및 대기)</strong> 상태를 유지합니다.
              </p>
              {error && (
                <div className="mt-2 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs font-semibold">
                  API 응답 메시지: {error}
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 text-xs space-y-3">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-teal-700" />
              <span>백엔드 데이터 엔지니어링팀 공식 요청 명세 ([Ticket 51])</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-800">1. 마운틴카트 그랜드포렛 패키지 분배</div>
                <p className="text-slate-500 mt-1 leading-relaxed">
                  '패밀리4종 패스' 등 복합 패키지가 판매되었을 때 <code className="font-mono text-teal-700">dim_ticket_split_rule</code>에 의해 마운틴카트 그랜드포렛에 배분된 매출액, 매출 비중(%), 그리고 유입된 이용객수(명) 및 이용객 점유율(%)을 1-Call 완제품으로 서빙합니다.
                </p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-800">2. 다중 영업장 1:N 패키지 전체 전개</div>
                <p className="text-slate-500 mt-1 leading-relaxed">
                  익스트림루지, 벨포레 목장, 사계절썰매장, 미디어아트센터, 놀이동산 등 레저본부 전 영업장의 총매출 중 패키지 차지 비율과 세부 권종 목록을 사전 연산하여 반환합니다.
                </p>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between flex-wrap gap-2">
              <span>백엔드 요청서 상세: <strong className="text-slate-800">backend_request.md [Ticket 51]</strong> 참조</span>
              <span className="font-mono text-teal-700">Status: WAITING_FOR_BACKEND</span>
            </div>
          </div>
        </div>
      ) : (
        /* 4. 데이터 정상 수신 시: 영업장별 패키지 기여도 카드 그리드 */
        <div className="space-y-4">
          
          {/* 툴바: 영업장 필터 및 검색 */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5 whitespace-nowrap">
                <Store size={15} className="text-teal-700" />
                영업장 선택:
              </span>
              <select
                value={selectedVenue}
                onChange={(e) => setSelectedVenue(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-1.5 outline-none cursor-pointer"
              >
                <option value="ALL">전체 레저 영업장 ({venues.length}개소)</option>
                {venues.map(v => (
                  <option key={v.venueName} value={v.venueName}>
                    {v.venueName}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="영업장 또는 패키지명 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* 영업장별 카드 목록 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredVenues.map((venue) => {
              const isHighlight = venue.venueName.includes('그랜드포렛') || venue.venueName.includes('마운틴카트');
              return (
                <div
                  key={venue.venueName}
                  className={`bg-white rounded-3xl p-6 border transition-all ${
                    isHighlight
                      ? 'border-teal-200/90 shadow-xs ring-1 ring-teal-100'
                      : 'border-slate-200 shadow-2xs hover:border-slate-300'
                  }`}
                >
                  {/* 카드 헤더 */}
                  <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl shrink-0 ${
                        isHighlight ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'bg-slate-100 text-slate-700'
                      }`}>
                        <Store size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black text-slate-900 truncate" title={venue.venueName}>
                            {venue.venueName}
                          </h3>
                          {isHighlight && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                              주요 분석처
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          연계 패키지 권종: {venue.packageCount || venue.packages?.length || 0}종
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">영업장 총매출</span>
                      <strong className="text-base font-black font-mono text-slate-900 tabular-nums">
                        {formatWon(venue.totalRevenue)}원
                      </strong>
                    </div>
                  </div>

                  {/* 2단 비교: 매출 점유율 vs 이용객 점유율 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    
                    {/* [매출 관점] 패키지 매출 비중 */}
                    <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 flex items-center gap-1">
                          <Percent size={13} className="text-teal-700" />
                          패키지 매출 기여
                        </span>
                        <span className="font-black font-mono text-teal-700">
                          {showPct(venue.packageRevenueSharePct)}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="text-slate-500">패키지 귀속액:</span>
                        <strong className="font-mono text-slate-900">{formatWon(venue.packageRevenue)}원</strong>
                      </div>
                      <div className="flex items-baseline justify-between text-[11px] text-slate-400">
                        <span>일반 단품 매출:</span>
                        <span className="font-mono">{formatWon(venue.singleRevenue)}원</span>
                      </div>
                      {/* 게이지 바 */}
                      <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-teal-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, Number(venue.packageRevenueSharePct || 0)))}%` }}
                        />
                      </div>
                    </div>

                    {/* [이용객 관점] 패키지 이용객 비중 */}
                    <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 flex items-center gap-1">
                          <Users size={13} className="text-emerald-700" />
                          패키지 이용객 점유
                        </span>
                        <span className="font-black font-mono text-emerald-700">
                          {showPct(venue.packageVisitorSharePct)}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="text-slate-500">패키지 유입:</span>
                        <strong className="font-mono text-slate-900">{formatCount(venue.packageVisitors)}명</strong>
                      </div>
                      <div className="flex items-baseline justify-between text-[11px] text-slate-400">
                        <span>단품 탑승/이용:</span>
                        <span className="font-mono">{formatCount(venue.singleVisitors)}명</span>
                      </div>
                      {/* 게이지 바 */}
                      <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, Number(venue.packageVisitorSharePct || 0)))}%` }}
                        />
                      </div>
                    </div>

                  </div>

                  {/* 세부 패키지 권종별 분배 테이블 */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Ticket size={13} className="text-slate-400" />
                        세부 패키지 권종별 귀속 실적 (1:N 분할)
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        단위: 원 / 명
                      </span>
                    </div>

                    {venue.packages && venue.packages.length > 0 ? (
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                            <tr>
                              <th className="py-2.5 px-3 text-left whitespace-nowrap">패키지 권종명</th>
                              <th className="py-2.5 px-3 text-right whitespace-nowrap">귀속 매출 (비중)</th>
                              <th className="py-2.5 px-3 text-right whitespace-nowrap">유입 이용객 (비중)</th>
                              <th className="py-2.5 px-3 text-center whitespace-nowrap">안분율</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono">
                            {venue.packages.map((pkg, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-2 px-3 text-left font-sans font-bold text-slate-800 truncate max-w-[180px]" title={pkg.packageName}>
                                  {pkg.packageName}
                                </td>
                                <td className="py-2 px-3 text-right tabular-nums">
                                  <span className="font-extrabold text-slate-900">{formatWon(pkg.allocatedRevenue)}원</span>
                                  {pkg.revenueSharePct !== undefined && pkg.revenueSharePct !== null && (
                                    <span className="text-[10px] text-teal-700 ml-1">({showPct(pkg.revenueSharePct)})</span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-right tabular-nums">
                                  <span className="font-extrabold text-slate-900">{formatCount(pkg.visitors)}명</span>
                                  {pkg.visitorSharePct !== undefined && pkg.visitorSharePct !== null && (
                                    <span className="text-[10px] text-emerald-700 ml-1">({showPct(pkg.visitorSharePct)})</span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-center text-slate-500 text-[11px]">
                                  {pkg.splitRatio !== undefined ? `${(pkg.splitRatio * 100).toFixed(1)}%` : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
                        연계된 패키지 상품 내역이 없습니다.
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* 5. 하단 전략 가이드 배너 */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 shrink-0">
            <Sparkles size={20} />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-900">레저 복합 패키지 수익화 및 체류시간 전략 인사이트</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              마운틴카트·루지 등 인기 앵커 시설의 패키지 묶음 판매 비중을 분석하여, 단품 객단가 방어와 리조트 전체 체류시간 증대 시너지를 도출하세요.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <span className="text-[11px] font-bold bg-teal-50 text-teal-800 px-3 py-1.5 rounded-lg border border-teal-100">
            레저본부 공식 집계
          </span>
        </div>
      </div>

    </div>
  );
}
