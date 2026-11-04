import { useState, useEffect, useMemo } from 'react';
import { useDate } from '../contexts/DateContext';
import { secureFetcher } from '../lib/secureFetcher';
import GlobalDatePicker from '../components/GlobalDatePicker';
import {
  Activity,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Users,
  Hotel,
  Ticket,
  Utensils,
  Flag,
  Calendar,
  CloudRain,
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Target,
  FileText,
  ArrowUpDown
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

const fmtInt = (val: unknown): string => {
  if (val === null || val === undefined || val === '') return '-';
  const num = typeof val === 'string' ? Number(val.replace(/,/g, '')) : Number(val);
  if (Number.isNaN(num)) return '-';
  return new Intl.NumberFormat('ko-KR').format(Math.round(num));
};

const fmtSignedInt = (val: unknown, suffix = '원'): string => {
  if (val === null || val === undefined || val === '') return '-';
  const num = typeof val === 'string' ? Number(val.replace(/,/g, '')) : Number(val);
  if (Number.isNaN(num)) return '-';
  const rounded = Math.round(num);
  const formatted = new Intl.NumberFormat('ko-KR').format(rounded);
  return `${rounded > 0 ? '+' : ''}${formatted}${suffix}`;
};

const fmtPct = (val: unknown, showPlus = true): string => {
  if (val === null || val === undefined || val === '') return '-';
  const num = Number(val);
  if (Number.isNaN(num)) return '-';
  return `${showPlus && num > 0 ? '+' : ''}${num.toFixed(2)}%`;
};

const fmtPctOne = (val: unknown, showPlus = false): string => {
  if (val === null || val === undefined || val === '') return '-';
  const num = Number(val);
  if (Number.isNaN(num)) return '-';
  return `${showPlus && num > 0 ? '+' : ''}${num.toFixed(1)}%`;
};

const fmtText = (val: unknown): string => {
  if (val === null || val === undefined || val === '') return '-';
  return String(val);
};

export default function RevenueVarianceRca() {
  const { startDate, endDate } = useDate();
  const [compareMode, setCompareMode] = useState<'YOY_DOW' | 'YOY_DATE' | 'MOM'>('YOY_DOW');
  const [activeViewTab, setActiveViewTab] = useState<'ALL' | 'REPORT' | 'FORMULA' | 'SEGMENTS' | 'FACTORS'>('ALL');
  const [selectedSegmentTab, setSelectedSegmentTab] = useState<'ALL' | 'CONDO' | 'LEISURE' | 'FNB' | 'GOLF'>('ALL');
  const [categorySortMode, setCategorySortMode] = useState<'revDesc' | 'growthAsc' | 'growthDesc'>('revDesc');

  const [rcaData, setRcaData] = useState<any>(null);
  const [revSummaryData, setRevSummaryData] = useState<any>(null);
  const [groupSalesData, setGroupSalesData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchAllRcaSources = async () => {
    setLoading(true);
    try {
      const [rcaRes, summaryRes, groupRes] = await Promise.all([
        secureFetcher(
          `${API_BASE}/api/v6/report/revenue-variance-rca?startDate=${startDate}&endDate=${endDate}&compareMode=${compareMode}`
        ).catch(() => null),
        secureFetcher(
          `${API_BASE}/api/v6/dashboard/revenue-summary?startDate=${startDate}&endDate=${endDate}`
        ).catch(() => null),
        secureFetcher(
          `${API_BASE}/api/v6/report/corporate-group-sales?startDate=${startDate}&endDate=${endDate}`
        ).catch(() => null)
      ]);

      if (rcaRes && rcaRes.success) {
        setRcaData(rcaRes.data || rcaRes);
      } else {
        setRcaData(null);
      }

      if (summaryRes && summaryRes.success) {
        setRevSummaryData(summaryRes.data || summaryRes);
      } else {
        setRevSummaryData(null);
      }

      if (groupRes && groupRes.success) {
        setGroupSalesData(groupRes.data || groupRes);
      } else {
        setGroupSalesData(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllRcaSources();
  }, [startDate, endDate, compareMode]);

  const summary = revSummaryData?.summary || null;
  const weatherCurrent = revSummaryData?.weather?.current || null;
  const weatherLastYear = revSummaryData?.weather?.lastYear || null;
  const salesByCategory: any[] = Array.isArray(revSummaryData?.salesByCategory)
    ? revSummaryData.salesByCategory
    : [];

  const period = rcaData?.period || null;
  const formula = rcaData?.formulaDecomposition || null;
  const segIsolation = rcaData?.segmentIsolation || null;
  const segmentSummaryRows: any[] = Array.isArray(segIsolation?.segmentSummaryRows)
    ? segIsolation.segmentSummaryRows
    : [];
  const condoDetail = segIsolation?.condoDetail || null;
  const leisureDetail = segIsolation?.leisureDetail || null;
  const fnbDetail = segIsolation?.fnbDetail || null;
  const golfDetail = segIsolation?.golfDetail || null;
  const fourFactors = rcaData?.fourFactorVerification || null;
  const structuredReport = rcaData?.structuredReport || null;
  const groupSummary = groupSalesData?.summary || null;

  const findCat = (name: string) =>
    salesByCategory.find((c: any) => c?.categoryName === name) || null;
  const findSegRow = (code: string) =>
    segmentSummaryRows.find((r: any) => r?.segmentCode === code) || null;

  const catCondo = findCat('콘도');
  const catGolf = findCat('골프');
  const catFnb = findCat('식음');
  const catBanquet = findCat('대관');
  const catLeisure = findCat('레저본부');
  const catMoto = findCat('모토아레나');

  const segCondoRow = findSegRow('CONDO');
  const segLeisureRow = findSegRow('LEISURE');
  const segFnbRow = findSegRow('FNB_BANQUET');

  const sortedCategories = useMemo(() => {
    const list = [...salesByCategory];
    if (categorySortMode === 'growthAsc') {
      return list.sort((a, b) => Number(a?.yoyGrowth || 0) - Number(b?.yoyGrowth || 0));
    }
    if (categorySortMode === 'growthDesc') {
      return list.sort((a, b) => Number(b?.yoyGrowth || 0) - Number(a?.yoyGrowth || 0));
    }
    return list.sort((a, b) => Number(b?.revenue || 0) - Number(a?.revenue || 0));
  }, [salesByCategory, categorySortMode]);

  const tyRevenueVal = formula?.tyTotalRevenue !== undefined ? formula.tyTotalRevenue : summary?.totalRevenue;
  const lyRevenueVal = formula?.lyTotalRevenue !== undefined ? formula.lyTotalRevenue : summary?.todayLyRevenue;
  const revDiffVal = formula?.revenueDiffAmount !== undefined ? formula.revenueDiffAmount : summary?.todayDiff;
  const revGrowthVal = formula?.revenueGrowthPct !== undefined ? formula.revenueGrowthPct : summary?.todayGrowth;

  const tyVisitorsVal = formula?.tyTotalVisitors !== undefined ? formula.tyTotalVisitors : summary?.totalVisitors;
  const lyVisitorsVal = formula?.lyTotalVisitors !== undefined ? formula.lyTotalVisitors : summary?.todayLyVisitors;
  const visitorDiffVal = formula?.visitorDiffCount;
  const visitorGrowthVal = formula?.visitorGrowthPct;

  const executiveSummaryList: string[] = Array.isArray(structuredReport?.executiveSummary)
    ? structuredReport.executiveSummary
    : [];
  const segmentImpactBullets: string[] = Array.isArray(structuredReport?.segmentImpactBullets)
    ? structuredReport.segmentImpactBullets
    : [];
  const top3Hypotheses: any[] = Array.isArray(structuredReport?.top3Hypotheses)
    ? structuredReport.top3Hypotheses
    : [];
  const immediateActionItems: string[] = Array.isArray(structuredReport?.immediateActionItems)
    ? structuredReport.immediateActionItems
    : [];

  return (
    <div className="min-h-screen bg-[#F4F3EE] text-[#1B382E] p-4 md:p-6 lg:p-8 space-y-6">
      {/* 상단 헤더 & 글로벌 컨트롤 바 */}
      <div className="bg-white rounded-2xl border border-[#1B382E]/10 shadow-xs p-5 md:p-6">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#284F42] text-white">
                <Activity size={13} />
                MECE ROOT CAUSE ANALYSIS
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#B59269]/15 text-[#8C6D46] border border-[#B59269]/30">
                Zero-Proxy · 100% SSOT 완제품 직결
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                  rcaData
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                {rcaData ? 'V6 MECE RCA 마트 실시간 연결됨' : 'V6 마트 실시간 조회 중'}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-[#1B382E] tracking-tight">
              복합 리조트 매출 증감 원인 분석 (MECE RCA 프레임워크)
            </h1>
            <p className="text-xs md:text-sm text-[#6C7A73] mt-1">
              단순 추측을 배제하고 [1차 매출 공식 분해(방문객 × 객단가)] → [2차 4대 부문 실적 격리] → [3차 4대 다각도 요인 검증] → [4단 개조식 리포트] 순으로 원인을 규명합니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <GlobalDatePicker />
            <button
              type="button"
              onClick={fetchAllRcaSources}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#284F42] hover:bg-[#1B382E] text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              실측 재조회
            </button>
          </div>
        </div>

        {/* 비교 기준 토글 & 프레임워크 뷰 탭 */}
        <div className="mt-4 pt-4 border-t border-[#1B382E]/10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-[#6C7A73] mr-1">비교 기준:</span>
            {[
              { code: 'YOY_DOW' as const, label: '전년 동요일 비교 (52주 전 SSOT)' },
              { code: 'YOY_DATE' as const, label: '전년 동일날짜 비교 (달력일 기준)' },
              { code: 'MOM' as const, label: '전월 동기 비교 (MoM)' }
            ].map((mode) => (
              <button
                key={mode.code}
                type="button"
                onClick={() => setCompareMode(mode.code)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  compareMode === mode.code
                    ? 'bg-[#284F42] text-white shadow-xs'
                    : 'bg-[#F4F3EE] text-[#1B382E]/75 hover:bg-[#E7E5DD]'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-[#6C7A73] mr-1">분석 레이어:</span>
            {[
              { code: 'ALL' as const, label: '전체 통합 프레임워크' },
              { code: 'REPORT' as const, label: '① 4단 개조식 리포트' },
              { code: 'FORMULA' as const, label: '② 매출 공식 1차 분해' },
              { code: 'SEGMENTS' as const, label: '③ 4대 부문 실적 격리' },
              { code: 'FACTORS' as const, label: '④ 4대 다각도 요인 검증' }
            ].map((tab) => (
              <button
                key={tab.code}
                type="button"
                onClick={() => setActiveViewTab(tab.code)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeViewTab === tab.code
                    ? 'bg-[#B59269] text-white shadow-xs'
                    : 'bg-[#F4F3EE] text-[#1B382E]/75 hover:bg-[#E7E5DD]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 백엔드 비교 기간 메타 배너 */}
        {period && (
          <div className="mt-3 pt-3 border-t border-[#1B382E]/10 flex flex-wrap items-center justify-between gap-2 text-xs text-[#6C7A73]">
            <div className="flex flex-wrap items-center gap-3">
              <span>
                • 분석 대상 구간(TY):{' '}
                <strong className="text-[#1B382E]">
                  {fmtText(period?.tyStartDate)} ~ {fmtText(period?.tyEndDate)} ({fmtInt(period?.dayCount)}일)
                </strong>
              </span>
              <span>
                • 비교 대조 구간({fmtText(period?.compareMode)}):{' '}
                <strong className="text-[#284F42]">
                  {fmtText(period?.lyStartDate)} ~ {fmtText(period?.lyEndDate)}
                </strong>
              </span>
              <span>
                • 전월 동기 참조 구간(MoM):{' '}
                <strong className="text-[#1B382E]">
                  {fmtText(period?.momStartDate)} ~ {fmtText(period?.momEndDate)}
                </strong>
              </span>
            </div>
            <span className="font-bold text-[#284F42]">GET /api/v6/report/revenue-variance-rca (SSOT)</span>
          </div>
        )}
      </div>

      {/* =====================================================================
          [SECTION 1] 4단 개조식 출력 리포트
          ([핵심 요약] → [부문별 영향도/낙폭 격리] → [3대 핵심 가설 및 검증 지표] → [즉각 실행 대응책])
         ===================================================================== */}
      {(activeViewTab === 'ALL' || activeViewTab === 'REPORT') && (
        <div className="bg-white rounded-2xl border border-[#1B382E]/10 shadow-xs p-5 md:p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-[#1B382E]/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#284F42] text-white flex items-center justify-center">
                <FileText size={18} />
              </div>
              <div>
                <h2 className="text-base md:text-lg font-black text-[#1B382E]">
                  [출력 형식] MECE 원인 규명 4단 개조식 브리핑
                </h2>
                <p className="text-xs text-[#6C7A73]">
                  [1. 핵심 요약] → [2. 부문별 영향도/낙폭 격리] → [3. 3대 핵심 가설 및 검증 지표] → [4. 즉각 실행 대응책]
                </p>
              </div>
            </div>
            <div className="text-xs font-semibold text-[#6C7A73]">
              비교 구간:{' '}
              <span className="font-bold text-[#1B382E]">
                {fmtText(period?.tyStartDate || startDate)} vs {fmtText(period?.lyStartDate || '-')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {/* Step 1: [핵심 요약] */}
            <div className="rounded-xl border border-[#1B382E]/15 bg-[#F4F3EE]/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#284F42] text-white text-xs font-bold">
                  1. 핵심 요약 (Executive Summary)
                </span>
                <span className="text-[11px] font-semibold text-[#6C7A73]">전사 순매출 & 볼륨·단가 요약</span>
              </div>

              <ul className="space-y-2 text-xs md:text-sm text-[#1B382E] leading-relaxed">
                {executiveSummaryList.length > 0 ? (
                  executiveSummaryList.map((line, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-[#1B382E]">
                      <span className="font-black text-[#284F42] mt-0.5">•</span>
                      <span>{line}</span>
                    </li>
                  ))
                ) : (
                  <>
                    <li className="flex items-start gap-2">
                      <span className="font-black text-[#284F42] mt-0.5">•</span>
                      <span>
                        <strong>[전사 순매출]</strong> 금년{' '}
                        <strong className="text-[#1B382E]">{fmtInt(tyRevenueVal)}원</strong> vs 비교기간{' '}
                        <strong className="text-[#1B382E]">{fmtInt(lyRevenueVal)}원</strong> (증감액{' '}
                        <strong className={Number(revDiffVal) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                          {fmtSignedInt(revDiffVal, '원')}
                        </strong>{' '}
                        / 증감률{' '}
                        <strong className={Number(revGrowthVal) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                          {fmtPct(revGrowthVal)}
                        </strong>
                        )
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-black text-[#284F42] mt-0.5">•</span>
                      <span>
                        <strong>[주도 요인 판정]</strong> {fmtText(formula?.primaryDriverLabel)}
                      </span>
                    </li>
                  </>
                )}
                <li className="flex items-start gap-2 pt-1 border-t border-[#1B382E]/10 text-xs text-[#6C7A73]">
                  <span className="font-black text-[#B59269] mt-0.5">▪</span>
                  <span>
                    <strong>[당월 누적(MTD) / 연 누적(YTD) 기조]</strong> 당월 누적(MTD){' '}
                    <strong className="text-[#1B382E]">{fmtInt(summary?.mtdRevenue)}원</strong> (전년비{' '}
                    <strong className={Number(summary?.mtdGrowth) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                      {fmtPct(summary?.mtdGrowth)}
                    </strong>
                    , {fmtSignedInt(summary?.mtdDiff, '원')}) | 연 누적(YTD){' '}
                    <strong className="text-[#1B382E]">{fmtInt(summary?.ytdRevenue)}원</strong> (전년비{' '}
                    <strong className={Number(summary?.ytdGrowth) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                      {fmtPct(summary?.ytdGrowth)}
                    </strong>
                    , {fmtSignedInt(summary?.ytdDiff, '원')})
                  </span>
                </li>
              </ul>
            </div>

            {/* Step 2: [부문별 영향도/낙폭 격리] */}
            <div className="rounded-xl border border-[#1B382E]/15 bg-[#F4F3EE]/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#284F42] text-white text-xs font-bold">
                  2. 부문별 영향도 / 낙폭 격리 (Segment Isolation)
                </span>
                <span className="text-[11px] font-semibold text-[#6C7A73]">4대 부문 개조식 격리</span>
              </div>

              {segmentImpactBullets.length > 0 ? (
                <ul className="space-y-2 text-xs md:text-sm text-[#1B382E] leading-relaxed">
                  {segmentImpactBullets.map((bullet, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="font-black text-[#284F42] mt-0.5">•</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="space-y-2 text-xs md:text-sm text-[#1B382E] leading-relaxed">
                  {salesByCategory.map((cat: any, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="font-black text-[#284F42] mt-0.5">•</span>
                      <span>
                        <strong>[{fmtText(cat?.categoryName)}]</strong> 금년{' '}
                        <strong>{fmtInt(cat?.revenue)}원</strong> vs 전년 동요일{' '}
                        <strong>{fmtInt(cat?.lyRevenue)}원</strong> (전년비{' '}
                        <strong className={Number(cat?.yoyGrowth) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                          {fmtPct(cat?.yoyGrowth)}
                        </strong>
                        )
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Step 3: [3대 핵심 가설 및 검증 지표] */}
            <div className="rounded-xl border border-[#1B382E]/15 bg-[#F4F3EE]/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#284F42] text-white text-xs font-bold">
                  3. 3대 핵심 가설 및 검증 지표 (Top 3 Hypotheses)
                </span>
                <span className="text-[11px] font-semibold text-[#6C7A73]">데이터 기반 채택/기각 검증</span>
              </div>

              {top3Hypotheses.length > 0 ? (
                <div className="space-y-2.5">
                  {top3Hypotheses.map((h: any, idx: number) => (
                    <div key={idx} className="bg-white rounded-lg p-3 border border-[#1B382E]/10 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-[#1B382E]">
                          {fmtText(h?.hypothesisTitle)}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold shrink-0 ${
                            h?.status === 'CONFIRMED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : h?.status === 'REJECTED'
                              ? 'bg-slate-100 text-slate-600 border border-slate-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {fmtText(h?.status)}
                        </span>
                      </div>
                      <p className="text-xs text-[#284F42] font-semibold">
                        검증 지표: {fmtText(h?.verificationMetric)}
                      </p>
                      <p className="text-xs text-[#6C7A73]">{fmtText(h?.evidenceDetail)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-lg p-4 border border-[#1B382E]/10 text-xs text-[#6C7A73]">
                  가설 검증 데이터: <strong>-</strong>
                </div>
              )}
            </div>

            {/* Step 4: [즉각 실행 대응책] */}
            <div className="rounded-xl border border-[#1B382E]/15 bg-[#F4F3EE]/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#B59269] text-white text-xs font-bold">
                  4. 즉각 실행 대응책 (Immediate Action Plan)
                </span>
                <span className="text-[11px] font-semibold text-[#6C7A73]">부문별 실행 처방</span>
              </div>

              {immediateActionItems.length > 0 ? (
                <ul className="space-y-2 text-xs md:text-sm text-[#1B382E] leading-relaxed">
                  {immediateActionItems.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="font-black text-[#B59269] mt-0.5">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="bg-white rounded-lg p-4 border border-[#1B382E]/10 text-xs text-[#6C7A73]">
                  즉각 실행 대응책: <strong>-</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          [SECTION 2] 1. 매출 공식 1차 분해: 전체 매출 = [방문객 수 × 객단가(Spend per Head)]
         ===================================================================== */}
      {(activeViewTab === 'ALL' || activeViewTab === 'FORMULA') && (
        <div className="bg-white rounded-2xl border border-[#1B382E]/10 shadow-xs p-5 md:p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-[#1B382E]/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#284F42] text-white flex items-center justify-center">
                <Target size={18} />
              </div>
              <div>
                <h2 className="text-base md:text-lg font-black text-[#1B382E]">
                  [Frame 1] 매출 공식 1차 분해: 볼륨(방문객 수) 감소 vs 단가(Spend per Head) 하락 격리
                </h2>
                <p className="text-xs text-[#6C7A73]">
                  전체 매출 = 방문객 수(내장객/투숙객) × 1인당 객단가(Spend per Head) 공식에 입각한 1차 원인 격리
                </p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#F4F3EE] text-[#284F42]">
              주도 요인 코드: {fmtText(formula?.primaryDriverCode)}
            </span>
          </div>

          {/* 공식 트리 3단 카드: [방문객 볼륨] × [1인당 객단가] = [전사 순매출] */}
          <div className="grid grid-cols-1 lg:grid-cols-11 gap-3 items-stretch">
            {/* 좌측: 방문객 볼륨 */}
            <div className="lg:col-span-3 rounded-xl border border-[#1B382E]/15 bg-[#F4F3EE]/60 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-[#6C7A73] mb-1">
                  <span>① 방문객 볼륨 (내장객/투숙객)</span>
                  <Users size={15} className="text-[#284F42]" />
                </div>
                <div className="text-2xl font-black text-[#1B382E]">{fmtInt(tyVisitorsVal)}명</div>
                <div className="text-xs text-[#6C7A73] mt-1">
                  비교기간 방문객: <strong className="text-[#1B382E]">{fmtInt(lyVisitorsVal)}명</strong>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-[#1B382E]/10 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#6C7A73]">방문객 증감 인원</span>
                  <strong className={Number(visitorDiffVal) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                    {fmtSignedInt(visitorDiffVal, '명')}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6C7A73]">방문객 증감률</span>
                  <strong className={Number(visitorGrowthVal) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                    {fmtPct(visitorGrowthVal)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6C7A73]">당월 누적(MTD) 방문객</span>
                  <strong className="text-[#1B382E]">
                    {fmtInt(summary?.mtdVisitors)}명 (전년 {fmtInt(summary?.mtdLyVisitors)}명)
                  </strong>
                </div>
              </div>
            </div>

            {/* 곱셈 기호 */}
            <div className="lg:col-span-1 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-[#284F42] text-white font-black text-lg flex items-center justify-center shadow-xs">
                ×
              </div>
            </div>

            {/* 중앙: 1인당 객단가 (Spend per Head) */}
            <div className="lg:col-span-3 rounded-xl border border-[#1B382E]/15 bg-[#F4F3EE]/60 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-[#6C7A73] mb-1">
                  <span>② 1인당 객단가 (Spend per Head)</span>
                  <TrendingUp size={15} className="text-[#B59269]" />
                </div>
                <div className="text-2xl font-black text-[#1B382E]">{fmtInt(formula?.tySpendPerHead)}원</div>
                <div className="text-xs text-[#6C7A73] mt-1">
                  비교기간 객단가: <strong className="text-[#1B382E]">{fmtInt(formula?.lySpendPerHead)}원</strong>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-[#1B382E]/10 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#6C7A73]">객단가 증감액</span>
                  <strong className={Number(formula?.spendPerHeadDiff) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                    {fmtSignedInt(formula?.spendPerHeadDiff, '원')}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6C7A73]">객단가 증감률</span>
                  <strong
                    className={Number(formula?.spendPerHeadGrowthPct) < 0 ? 'text-rose-600' : 'text-emerald-700'}
                  >
                    {fmtPct(formula?.spendPerHeadGrowthPct)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6C7A73]">TRevPAR (가동객실당 총매출)</span>
                  <strong className="text-[#1B382E]">
                    {fmtInt(summary?.trevPAR)}원 ({fmtPct(summary?.trevParGrowth)})
                  </strong>
                </div>
              </div>
            </div>

            {/* 등호 기호 */}
            <div className="lg:col-span-1 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-[#B59269] text-white font-black text-lg flex items-center justify-center shadow-xs">
                =
              </div>
            </div>

            {/* 우측: 전체 순매출 및 볼륨/단가 기여도 */}
            <div className="lg:col-span-3 rounded-xl border-2 border-[#284F42] bg-[#284F42]/5 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-[#284F42] mb-1">
                  <span>③ 전사 순매출 (VAT 제외)</span>
                  {Number(revDiffVal) < 0 ? (
                    <TrendingDown size={16} className="text-rose-600" />
                  ) : (
                    <TrendingUp size={16} className="text-emerald-700" />
                  )}
                </div>
                <div className="text-2xl font-black text-[#1B382E]">{fmtInt(tyRevenueVal)}원</div>
                <div className="text-xs text-[#6C7A73] mt-1">
                  비교기간 순매출: <strong className="text-[#1B382E]">{fmtInt(lyRevenueVal)}원</strong>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-[#1B382E]/15 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#6C7A73]">순매출 증감액 (Δ)</span>
                  <strong className={Number(revDiffVal) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                    {fmtSignedInt(revDiffVal, '원')} ({fmtPct(revGrowthVal)})
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6C7A73]">볼륨 효과 기여액 (비중)</span>
                  <strong className="text-[#1B382E]">
                    {fmtSignedInt(formula?.volumeEffectAmount, '원')} ({fmtPctOne(formula?.volumeEffectSharePct, true)})
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6C7A73]">단가 효과 기여액 (비중)</span>
                  <strong className="text-[#1B382E]">
                    {fmtSignedInt(formula?.priceEffectAmount, '원')} ({fmtPctOne(formula?.priceEffectSharePct, true)})
                  </strong>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-[#F4F3EE] p-3.5 text-xs flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-bold text-[#284F42] mr-2">[1차 공식 분해 판정]</span>
              <span className="font-semibold text-[#1B382E]">{fmtText(formula?.primaryDriverLabel)}</span>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          [SECTION 3] 2. 부문별 실적 격리 (Segment Isolation)
          콘도 | 체험·레저 | F&B | 골프
         ===================================================================== */}
      {(activeViewTab === 'ALL' || activeViewTab === 'SEGMENTS') && (
        <div className="bg-white rounded-2xl border border-[#1B382E]/10 shadow-xs p-5 md:p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-[#1B382E]/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#284F42] text-white flex items-center justify-center">
                <Layers size={18} />
              </div>
              <div>
                <h2 className="text-base md:text-lg font-black text-[#1B382E]">
                  [Frame 2] 4대 부문별 실적 격리 (Segment Isolation)
                </h2>
                <p className="text-xs text-[#6C7A73]">
                  콘도(OCC·ADR·RevPAR·채널 비중) · 체험·레저(야외 vs 실내) · F&B(연계율·회전율·객단가) · 골프(티오프·기상취소율)
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { code: 'ALL' as const, label: '4대 부문 전체 보기' },
                { code: 'CONDO' as const, label: '① 콘도 (객실)' },
                { code: 'LEISURE' as const, label: '② 체험·레저' },
                { code: 'FNB' as const, label: '③ F&B · 대관' },
                { code: 'GOLF' as const, label: '④ 골프 (벨포레CC)' }
              ].map((seg) => (
                <button
                  key={seg.code}
                  type="button"
                  onClick={() => setSelectedSegmentTab(seg.code)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedSegmentTab === seg.code
                      ? 'bg-[#284F42] text-white'
                      : 'bg-[#F4F3EE] text-[#1B382E]/75 hover:bg-[#E7E5DD]'
                  }`}
                >
                  {seg.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4대 부문 MECE 요약 매트릭스 (segmentSummaryRows SSOT) */}
          {segmentSummaryRows.length > 0 && (
            <div className="rounded-xl border border-[#1B382E]/15 overflow-hidden">
              <div className="px-4 py-2.5 bg-[#284F42] text-white text-xs font-bold flex items-center justify-between">
                <span>4대 핵심 부문 MECE 격리 요약표 (매출 증감액 · 전사 증감 기여율 · 볼륨 vs 객단가 진단)</span>
                <span className="text-white/80 text-[11px]">비교 모드: {fmtText(period?.compareMode || compareMode)}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F4F3EE] text-[#6C7A73] border-b border-[#1B382E]/10">
                    <tr>
                      <th className="py-2.5 px-3">부문 구분</th>
                      <th className="py-2.5 px-3 text-right">금년 매출</th>
                      <th className="py-2.5 px-3 text-right">비교기간 매출</th>
                      <th className="py-2.5 px-3 text-right">증감액 (증감률)</th>
                      <th className="py-2.5 px-3 text-right">전사 증감 기여율</th>
                      <th className="py-2.5 px-3 text-right">방문객 (증감)</th>
                      <th className="py-2.5 px-3 text-right">1인 객단가 (증감률)</th>
                      <th className="py-2.5 px-3">부문 격리 진단</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1B382E]/10 bg-white">
                    {segmentSummaryRows.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[#F4F3EE]/40">
                        <td className="py-2.5 px-3 font-black text-[#1B382E]">{fmtText(row?.segmentName)}</td>
                        <td className="py-2.5 px-3 text-right font-bold">{fmtInt(row?.tyRevenue)}원</td>
                        <td className="py-2.5 px-3 text-right text-[#6C7A73]">{fmtInt(row?.lyRevenue)}원</td>
                        <td
                          className={`py-2.5 px-3 text-right font-bold ${
                            Number(row?.diffAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {fmtSignedInt(row?.diffAmount, '원')} ({fmtPct(row?.growthPct)})
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold">{fmtPct(row?.shareOfTotalDiffPct)}</td>
                        <td className="py-2.5 px-3 text-right">
                          {row?.tyVisitors !== null && row?.tyVisitors !== undefined
                            ? `${fmtInt(row.tyVisitors)}명 (${fmtSignedInt(row?.visitorDiff, '명')})`
                            : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {row?.tySpendPerHead !== null && row?.tySpendPerHead !== undefined
                            ? `${fmtInt(row.tySpendPerHead)}원 (${fmtPct(row?.spendPerHeadGrowthPct)})`
                            : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-[#284F42] font-medium">{fmtText(row?.isolationDiagnosis)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4대 부문 상세 카드 그리드 */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {/* ① 콘도 (OCC, ADR, RevPAR, 채널별-회원/OTA/단체 비중) */}
            {(selectedSegmentTab === 'ALL' || selectedSegmentTab === 'CONDO') && (
              <div className="rounded-xl border border-[#1B382E]/15 p-4 space-y-4 bg-[#F4F3EE]/40">
                <div className="flex items-center justify-between border-b border-[#1B382E]/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Hotel size={18} className="text-[#284F42]" />
                    <h3 className="font-black text-sm md:text-base text-[#1B382E]">
                      ① 콘도 부문 격리 (OCC · ADR · RevPAR · 채널별 비중)
                    </h3>
                  </div>
                  <span
                    className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                      Number(segCondoRow?.growthPct ?? catCondo?.yoyGrowth) < 0
                        ? 'bg-rose-50 text-rose-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    증감률 {fmtPct(segCondoRow?.growthPct !== undefined ? segCondoRow.growthPct : catCondo?.yoyGrowth)}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-[#1B382E]/10">
                    <span className="text-[#6C7A73] block">콘도 순매출 (비교기간)</span>
                    <strong className="text-sm font-black text-[#1B382E] block mt-0.5">
                      {fmtInt(segCondoRow?.tyRevenue !== undefined ? segCondoRow.tyRevenue : catCondo?.revenue)}원
                    </strong>
                    <span className="text-[11px] text-[#6C7A73]">
                      비교: {fmtInt(segCondoRow?.lyRevenue !== undefined ? segCondoRow.lyRevenue : catCondo?.lyRevenue)}원
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-[#1B382E]/10">
                    <span className="text-[#6C7A73] block">가동률 OCC (판매/가용)</span>
                    <strong className="text-sm font-black text-[#1B382E] block mt-0.5">
                      {fmtPctOne(condoDetail?.tyOccPct !== undefined ? condoDetail.tyOccPct : summary?.totalOcc)}
                    </strong>
                    <span className="text-[11px] text-[#6C7A73]">
                      {fmtInt(condoDetail?.tyOccupiedRooms !== undefined ? condoDetail.tyOccupiedRooms : summary?.occupiedRooms)}실 /{' '}
                      {fmtInt(condoDetail?.operationalAvailableRooms !== undefined ? condoDetail.operationalAvailableRooms : summary?.availableRooms)}실 (비교{' '}
                      {fmtPctOne(condoDetail?.lyOccPct)})
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-[#1B382E]/10">
                    <span className="text-[#6C7A73] block">객실단가 ADR (비교기간)</span>
                    <strong className="text-sm font-black text-[#1B382E] block mt-0.5">
                      {fmtInt(condoDetail?.tyAdr !== undefined ? condoDetail.tyAdr : summary?.totalADR)}원
                    </strong>
                    <span className="text-[11px] text-[#6C7A73]">
                      비교: {fmtInt(condoDetail?.lyAdr)}원 ({fmtPct(condoDetail?.adrGrowthPct)})
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-[#1B382E]/10">
                    <span className="text-[#6C7A73] block">RevPAR / 투숙객</span>
                    <strong className="text-sm font-black text-[#1B382E] block mt-0.5">
                      {fmtInt(condoDetail?.tyRevPar !== undefined ? condoDetail.tyRevPar : summary?.revPAR)}원
                    </strong>
                    <span className="text-[11px] text-[#6C7A73]">
                      투숙객 {fmtInt(segCondoRow?.tyVisitors !== undefined ? segCondoRow.tyVisitors : summary?.totalRoomCap)}명 (비교{' '}
                      {fmtInt(segCondoRow?.lyVisitors !== undefined ? segCondoRow.lyVisitors : summary?.totalRoomCapLy)}명)
                    </span>
                  </div>
                </div>

                {/* 채널별(회원/OTA/단체/FIT) 비중 테이블 */}
                <div className="bg-white rounded-lg border border-[#1B382E]/10 overflow-hidden">
                  <div className="px-3 py-2 bg-[#284F42]/5 border-b border-[#1B382E]/10 flex items-center justify-between text-xs font-bold text-[#1B382E]">
                    <span>채널별 객실·매출 비중 (회원 / OTA / B2B단체 / 일반FIT)</span>
                    <span className="text-[11px] text-[#6C7A73]">
                      물리 고정 모수 SSOT: {fmtInt(condoDetail?.fixedCapacityRooms)}실 (공식 고정 점유율{' '}
                      {fmtPctOne(condoDetail?.fixedOccupancyRatePct)})
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#F4F3EE] text-[#6C7A73] border-b border-[#1B382E]/10">
                        <tr>
                          <th className="py-2 px-3">채널 구분</th>
                          <th className="py-2 px-3 text-right">금년 판매실수 (비중)</th>
                          <th className="py-2 px-3 text-right">비교 판매실수 (비중)</th>
                          <th className="py-2 px-3 text-right">금년 ADR</th>
                          <th className="py-2 px-3 text-right">금년 매출 (증감액)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1B382E]/10">
                        {Array.isArray(condoDetail?.channelMix) && condoDetail.channelMix.length > 0 ? (
                          condoDetail.channelMix.map((ch: any, idx: number) => (
                            <tr key={idx}>
                              <td className="py-2 px-3 font-bold text-[#1B382E]">{fmtText(ch?.channelLabel)}</td>
                              <td className="py-2 px-3 text-right font-semibold">
                                {fmtInt(ch?.tyRooms)}실 ({fmtPctOne(ch?.tySharePct)})
                              </td>
                              <td className="py-2 px-3 text-right text-[#6C7A73]">
                                {fmtInt(ch?.lyRooms)}실 ({fmtPctOne(ch?.lySharePct)})
                              </td>
                              <td className="py-2 px-3 text-right">{fmtInt(ch?.tyAdr)}원</td>
                              <td
                                className={`py-2 px-3 text-right font-bold ${
                                  Number(ch?.diffRevenue) < 0 ? 'text-rose-600' : 'text-emerald-700'
                                }`}
                              >
                                {fmtInt(ch?.tyRevenue)}원 ({fmtSignedInt(ch?.diffRevenue, '원')})
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-3 px-3 text-center text-[#6C7A73]">
                              채널별(회원/OTA/단체) 증감 분해: <strong>-</strong>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ② 체험·레저 (야외 액티비티 vs 실내 시설 이용객 편차) */}
            {(selectedSegmentTab === 'ALL' || selectedSegmentTab === 'LEISURE') && (
              <div className="rounded-xl border border-[#1B382E]/15 p-4 space-y-4 bg-[#F4F3EE]/40">
                <div className="flex items-center justify-between border-b border-[#1B382E]/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Ticket size={18} className="text-[#284F42]" />
                    <h3 className="font-black text-sm md:text-base text-[#1B382E]">
                      ② 체험·레저 격리 (야외 액티비티 vs 실내 시설 편차)
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-[#284F42]">
                    합산 {fmtPct(segLeisureRow?.growthPct)} (레저 {fmtPct(catLeisure?.yoyGrowth)} / 모토{' '}
                    {fmtPct(catMoto?.yoyGrowth)})
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-[#1B382E]/10">
                    <span className="text-[#6C7A73] block">레저본부 매출 (방문객)</span>
                    <strong className="text-sm font-black text-[#1B382E] block mt-0.5">
                      {fmtInt(catLeisure?.revenue)}원
                    </strong>
                    <span className="text-[11px] text-[#6C7A73]">
                      전년 {fmtInt(catLeisure?.lyRevenue)}원 | {fmtInt(catLeisure?.visitors)}명
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-[#1B382E]/10">
                    <span className="text-[#6C7A73] block">모토아레나 매출 (방문객)</span>
                    <strong className="text-sm font-black text-[#1B382E] block mt-0.5">
                      {fmtInt(catMoto?.revenue)}원
                    </strong>
                    <span className="text-[11px] text-[#6C7A73]">
                      전년 {fmtInt(catMoto?.lyRevenue)}원 | {fmtInt(catMoto?.visitors)}명
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-[#1B382E]/10">
                    <span className="text-[#6C7A73] block">야외 액티비티 (Outdoor)</span>
                    <strong className="text-sm font-black text-[#1B382E] block mt-0.5">
                      {fmtInt(leisureDetail?.outdoorRevenue)}원
                    </strong>
                    <span className="text-[11px] text-[#6C7A73]">
                      방문객 {fmtInt(leisureDetail?.outdoorVisitors)}명 ({fmtPct(leisureDetail?.outdoorGrowthPct)})
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-[#1B382E]/10">
                    <span className="text-[#6C7A73] block">실내 시설 (Indoor)</span>
                    <strong className="text-sm font-black text-[#1B382E] block mt-0.5">
                      {fmtInt(leisureDetail?.indoorRevenue)}원
                    </strong>
                    <span className="text-[11px] text-[#6C7A73]">
                      방문객 {fmtInt(leisureDetail?.indoorVisitors)}명 ({fmtPct(leisureDetail?.indoorGrowthPct)})
                    </span>
                  </div>
                </div>

                {/* 야외 vs 실내 업장별 편차 테이블 */}
                <div className="bg-white rounded-lg border border-[#1B382E]/10 overflow-hidden">
                  <div className="px-3 py-2 bg-[#284F42]/5 border-b border-[#1B382E]/10 text-xs font-bold text-[#1B382E]">
                    체험·레저 업장별 (야외 OUTDOOR vs 실내 INDOOR) 이용객·매출 편차
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#F4F3EE] text-[#6C7A73] border-b border-[#1B382E]/10">
                        <tr>
                          <th className="py-2 px-3">시설명</th>
                          <th className="py-2 px-3">구분</th>
                          <th className="py-2 px-3 text-right">금년 방문객 (비교)</th>
                          <th className="py-2 px-3 text-right">금년 매출 (증감액)</th>
                          <th className="py-2 px-3 text-right">증감률</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1B382E]/10">
                        {Array.isArray(leisureDetail?.venueVariances) && leisureDetail.venueVariances.length > 0 ? (
                          leisureDetail.venueVariances.map((v: any, idx: number) => (
                            <tr key={idx}>
                              <td className="py-2 px-3 font-bold text-[#1B382E]">{fmtText(v?.venueName)}</td>
                              <td className="py-2 px-3">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    v?.facilityType === 'INDOOR'
                                      ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                                  }`}
                                >
                                  {fmtText(v?.facilityType)}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right">
                                {fmtInt(v?.tyVisitors)}명 ({fmtInt(v?.lyVisitors)}명)
                              </td>
                              <td className="py-2 px-3 text-right">
                                {fmtInt(v?.tyRevenue)}원 ({fmtSignedInt(v?.diffAmount, '원')})
                              </td>
                              <td
                                className={`py-2 px-3 text-right font-bold ${
                                  Number(v?.growthPct) < 0 ? 'text-rose-600' : 'text-emerald-700'
                                }`}
                              >
                                {fmtPct(v?.growthPct)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-3 px-3 text-center text-[#6C7A73]">
                              야외 vs 실내 시설별 편차: <strong>-</strong>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ③ F&B (객실/레저 연계율, 테이블 회전율, 객단가) */}
            {(selectedSegmentTab === 'ALL' || selectedSegmentTab === 'FNB') && (
              <div className="rounded-xl border border-[#1B382E]/15 p-4 space-y-4 bg-[#F4F3EE]/40">
                <div className="flex items-center justify-between border-b border-[#1B382E]/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Utensils size={18} className="text-[#284F42]" />
                    <h3 className="font-black text-sm md:text-base text-[#1B382E]">
                      ③ F&B · 연회대관 격리 (객실/레저 연계율 · 테이블 회전율 · 객단가)
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-rose-700">
                    합산 {fmtPct(segFnbRow?.growthPct)} (식음 {fmtPct(fnbDetail?.directFnbGrowthPct)} / 대관{' '}
                    {fmtPct(fnbDetail?.banquetGrowthPct)})
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-[#1B382E]/10">
                    <span className="text-[#6C7A73] block">식음 순매출 (비교기간)</span>
                    <strong className="text-sm font-black text-[#1B382E] block mt-0.5">
                      {fmtInt(fnbDetail?.tyDirectFnbRevenue !== undefined ? fnbDetail.tyDirectFnbRevenue : catFnb?.revenue)}원
                    </strong>
                    <span className="text-[11px] text-[#6C7A73]">
                      비교: {fmtInt(fnbDetail?.lyDirectFnbRevenue !== undefined ? fnbDetail.lyDirectFnbRevenue : catFnb?.lyRevenue)}원 (
                      {fmtPct(fnbDetail?.directFnbGrowthPct !== undefined ? fnbDetail.directFnbGrowthPct : catFnb?.yoyGrowth)})
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-[#1B382E]/10">
                    <span className="text-[#6C7A73] block">연회·대관 매출 (비교기간)</span>
                    <strong className="text-sm font-black text-[#1B382E] block mt-0.5">
                      {fmtInt(fnbDetail?.tyBanquetRevenue !== undefined ? fnbDetail.tyBanquetRevenue : catBanquet?.revenue)}원
                    </strong>
                    <span className="text-[11px] text-[#6C7A73]">
                      비교: {fmtInt(fnbDetail?.lyBanquetRevenue !== undefined ? fnbDetail.lyBanquetRevenue : catBanquet?.lyRevenue)}원 (
                      {fmtPct(fnbDetail?.banquetGrowthPct !== undefined ? fnbDetail.banquetGrowthPct : catBanquet?.yoyGrowth)})
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-[#1B382E]/10">
                    <span className="text-[#6C7A73] block">객실/레저 F&B 연계율</span>
                    <strong className="text-sm font-black text-[#1B382E] block mt-0.5">
                      {fmtPctOne(fnbDetail?.fnbToRoomLinkagePct)}
                    </strong>
                    <span className="text-[11px] text-[#6C7A73]">
                      비교 연계율: {fmtPctOne(fnbDetail?.lyFnbToRoomLinkagePct)} (편차{' '}
                      {fmtPctOne(fnbDetail?.linkageDiffPctp, true)})
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-[#1B382E]/10">
                    <span className="text-[#6C7A73] block">회전율 / 영수증 객단가</span>
                    <strong className="text-sm font-black text-[#1B382E] block mt-0.5">
                      {fmtText(fnbDetail?.tyTableTurnoverRate)}회 / {fmtInt(fnbDetail?.tyAvgCheckPerReceipt)}원
                    </strong>
                    <span className="text-[11px] text-[#6C7A73]">
                      영수증: {fmtInt(fnbDetail?.tyReceiptCount)}건 (비교 {fmtInt(fnbDetail?.lyReceiptCount)}건,{' '}
                      {fmtPct(fnbDetail?.receiptCountGrowthPct)})
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-3 border border-[#1B382E]/10 text-xs text-[#6C7A73] flex flex-wrap items-center justify-between gap-2">
                  <span>
                    • 직영 식음 증감액:{' '}
                    <strong className="text-[#1B382E]">{fmtSignedInt(fnbDetail?.directFnbDiffAmount, '원')}</strong> | 연회·대관 증감액:{' '}
                    <strong className="text-[#1B382E]">{fmtSignedInt(fnbDetail?.banquetDiffAmount, '원')}</strong> | 외주식음 매출:{' '}
                    <strong className="text-[#1B382E]">
                      {fmtInt(fnbDetail?.tyOutsourcedFnbRevenue)}원 ({fmtPct(fnbDetail?.outsourcedFnbGrowthPct)})
                    </strong>
                  </span>
                  <span className="text-[11px] text-[#284F42] font-semibold">
                    ※ 영수증당 객단가 비교: 금년 {fmtInt(fnbDetail?.tyAvgCheckPerReceipt)}원 vs 비교{' '}
                    {fmtInt(fnbDetail?.lyAvgCheckPerReceipt)}원 ({fmtPct(fnbDetail?.avgCheckGrowthPct)})
                  </span>
                </div>
              </div>
            )}

            {/* ④ 골프 (티오프 수, 기상 취소율) */}
            {(selectedSegmentTab === 'ALL' || selectedSegmentTab === 'GOLF') && (
              <div className="rounded-xl border border-[#1B382E]/15 p-4 space-y-4 bg-[#F4F3EE]/40">
                <div className="flex items-center justify-between border-b border-[#1B382E]/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Flag size={18} className="text-[#284F42]" />
                    <h3 className="font-black text-sm md:text-base text-[#1B382E]">
                      ④ 골프 부문 격리 (예약/완주 티오프 팀수 · 기상 취소율 · 그린피)
                    </h3>
                  </div>
                  <span
                    className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                      Number(golfDetail?.golfRevenueGrowthPct ?? catGolf?.yoyGrowth) < 0
                        ? 'bg-rose-50 text-rose-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    증감률{' '}
                    {fmtPct(
                      golfDetail?.golfRevenueGrowthPct !== undefined
                        ? golfDetail.golfRevenueGrowthPct
                        : catGolf?.yoyGrowth
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-[#1B382E]/10">
                    <span className="text-[#6C7A73] block">골프 순매출 (비교기간)</span>
                    <strong className="text-sm font-black text-[#1B382E] block mt-0.5">
                      {fmtInt(golfDetail?.tyGolfRevenue !== undefined ? golfDetail.tyGolfRevenue : summary?.totalGolfRevenue)}원
                    </strong>
                    <span className="text-[11px] text-[#6C7A73]">
                      비교: {fmtInt(golfDetail?.lyGolfRevenue !== undefined ? golfDetail.lyGolfRevenue : summary?.todayLyGolfRevenue)}원 (
                      {fmtSignedInt(golfDetail?.golfRevenueDiff, '원')})
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-[#1B382E]/10">
                    <span className="text-[#6C7A73] block">완주 티오프 / 예약 팀수</span>
                    <strong className="text-sm font-black text-[#1B382E] block mt-0.5">
                      {fmtInt(golfDetail?.tyVisitedTeams !== undefined ? golfDetail.tyVisitedTeams : summary?.totalGolfVisitedTeams)}팀 /{' '}
                      {fmtInt(golfDetail?.tyReservedTeams !== undefined ? golfDetail.tyReservedTeams : summary?.totalGolfReservedTeams)}팀
                    </strong>
                    <span className="text-[11px] text-[#6C7A73]">
                      비교 완주: {fmtInt(golfDetail?.lyVisitedTeams)}팀 | 내장객{' '}
                      {fmtInt(golfDetail?.tyVisitors !== undefined ? golfDetail.tyVisitors : summary?.totalGolfVisitors)}명
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-[#1B382E]/10">
                    <span className="text-[#6C7A73] block">취소 팀수 / 취소율</span>
                    <strong className="text-sm font-black text-[#1B382E] block mt-0.5">
                      {fmtInt(golfDetail?.tyCanceledTeams !== undefined ? golfDetail.tyCanceledTeams : summary?.totalGolfCanceledTeams)}팀 (
                      {fmtPct(golfDetail?.tyCancelRatePct, false)})
                    </strong>
                    <span className="text-[11px] text-[#6C7A73]">
                      비교 취소율: {fmtPct(golfDetail?.lyCancelRatePct, false)} | 기상취소:{' '}
                      {fmtInt(golfDetail?.weatherCanceledTeams)}팀
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-[#1B382E]/10">
                    <span className="text-[#6C7A73] block">평균 그린피 / 1인 객단가</span>
                    <strong className="text-sm font-black text-[#1B382E] block mt-0.5">
                      {fmtInt(golfDetail?.tyAvgGreenFee !== undefined ? golfDetail.tyAvgGreenFee : summary?.golfAvgGreenFee)}원
                    </strong>
                    <span className="text-[11px] text-[#6C7A73]">
                      1인 ARPU: {fmtInt(golfDetail?.tyArpu)}원 (비교 {fmtInt(golfDetail?.lyArpu)}원)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 전사 부문별 실측 테이블 (정렬 토글 포함) */}
          <div className="rounded-xl border border-[#1B382E]/15 overflow-hidden">
            <div className="px-4 py-3 bg-[#F4F3EE] border-b border-[#1B382E]/10 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-black text-[#1B382E]">
                부문별 V6 마트 실측 원장 (salesByCategory SSOT)
              </span>
              <div className="flex items-center gap-1.5">
                <ArrowUpDown size={13} className="text-[#6C7A73]" />
                {[
                  { code: 'revDesc' as const, label: '금년 매출 높은순' },
                  { code: 'growthAsc' as const, label: '낙폭 큰순 (증감률 ↑)' },
                  { code: 'growthDesc' as const, label: '성장률 높은순 (증감률 ↓)' }
                ].map((s) => (
                  <button
                    key={s.code}
                    type="button"
                    onClick={() => setCategorySortMode(s.code)}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${
                      categorySortMode === s.code
                        ? 'bg-[#284F42] text-white'
                        : 'bg-white text-[#6C7A73] hover:text-[#1B382E]'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-white text-[#6C7A73] border-b border-[#1B382E]/10">
                  <tr>
                    <th className="py-2.5 px-4">부문명 (Category)</th>
                    <th className="py-2.5 px-4 text-right">금년 순매출</th>
                    <th className="py-2.5 px-4 text-right">전년 동요일 매출</th>
                    <th className="py-2.5 px-4 text-right">매출 증감률</th>
                    <th className="py-2.5 px-4 text-right">금년 방문객</th>
                    <th className="py-2.5 px-4 text-right">전년 방문객</th>
                    <th className="py-2.5 px-4 text-right">방문객 증감률</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1B382E]/10 bg-white">
                  {sortedCategories.map((cat: any, idx: number) => (
                    <tr key={idx} className="hover:bg-[#F4F3EE]/40">
                      <td className="py-2.5 px-4 font-bold text-[#1B382E]">{fmtText(cat?.categoryName)}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-[#1B382E]">{fmtInt(cat?.revenue)}원</td>
                      <td className="py-2.5 px-4 text-right text-[#6C7A73]">{fmtInt(cat?.lyRevenue)}원</td>
                      <td
                        className={`py-2.5 px-4 text-right font-bold ${
                          Number(cat?.yoyGrowth) < 0 ? 'text-rose-600' : 'text-emerald-700'
                        }`}
                      >
                        {fmtPct(cat?.yoyGrowth)}
                      </td>
                      <td className="py-2.5 px-4 text-right">{fmtInt(cat?.visitors)}명</td>
                      <td className="py-2.5 px-4 text-right text-[#6C7A73]">{fmtInt(cat?.lyVisitors)}명</td>
                      <td className="py-2.5 px-4 text-right font-semibold">{fmtPct(cat?.visitorYoyGrowth)}</td>
                    </tr>
                  ))}
                  {sortedCategories.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-[#6C7A73]">
                        조회된 부문별 데이터가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          [SECTION 4] 3. 4대 다각도 요인 검증 (4-Factor Multi-Angle Verification)
          ① 시계열/캘린더 | ② 외부 환경 | ③ 내부 운영/영업 | ④ 데이터 무결성
         ===================================================================== */}
      {(activeViewTab === 'ALL' || activeViewTab === 'FACTORS') && (
        <div className="bg-white rounded-2xl border border-[#1B382E]/10 shadow-xs p-5 md:p-6 space-y-5">
          <div className="flex items-center gap-2.5 border-b border-[#1B382E]/10 pb-4">
            <div className="w-9 h-9 rounded-xl bg-[#284F42] text-white flex items-center justify-center">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-black text-[#1B382E]">
                [Frame 3] 4대 다각도 요인 검증 (Multi-Angle Verification)
              </h2>
              <p className="text-xs text-[#6C7A73]">
                ① 시계열/캘린더 · ② 외부 환경(기상/경쟁) · ③ 내부 운영/영업(프로모션/알로트먼트/휴장/B2B) · ④ 데이터 무결성(PMS·POS·City Ledger)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 요인 1: 시계열 / 캘린더 */}
            <div className="rounded-xl border border-[#1B382E]/15 p-4 bg-[#F4F3EE]/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 font-black text-sm text-[#1B382E]">
                  <Calendar size={16} className="text-[#284F42]" />
                  ① 시계열 / 캘린더 요인 검증 (YoY · MoM · 요일 · 공휴일 · 학사일정)
                </span>
              </div>
              <div className="bg-white rounded-lg p-3 border border-[#1B382E]/10 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#6C7A73]">전년 동요일 대비 (YoY DoW, 52주 전)</span>
                  <strong className="text-[#1B382E]">
                    {fmtSignedInt(
                      fourFactors?.calendarFactor?.yoyDowRevenueDiff !== undefined
                        ? fourFactors.calendarFactor.yoyDowRevenueDiff
                        : summary?.todayDiff,
                      '원'
                    )}{' '}
                    (
                    {fmtPct(
                      fourFactors?.calendarFactor?.yoyDowGrowthPct !== undefined
                        ? fourFactors.calendarFactor.yoyDowGrowthPct
                        : summary?.todayGrowth
                    )}
                    )
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6C7A73]">전년 동일날짜 대비 (YoY Date, 달력일)</span>
                  <strong className="text-[#1B382E]">
                    {fmtSignedInt(fourFactors?.calendarFactor?.yoyDateRevenueDiff, '원')} (
                    {fmtPct(fourFactors?.calendarFactor?.yoyDateGrowthPct)})
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6C7A73]">전월 동기 대비 (MoM, 4주 전 동요일)</span>
                  <strong className="text-[#1B382E]">
                    {fmtSignedInt(fourFactors?.calendarFactor?.momRevenueDiff, '원')} (
                    {fmtPct(fourFactors?.calendarFactor?.momGrowthPct)})
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6C7A73]">주말 vs 평일 매출 비중 / 공휴일 일수 차이</span>
                  <strong className="text-[#1B382E]">
                    주말 {fmtPctOne(fourFactors?.calendarFactor?.weekendRevenueSharePct)} · 평일{' '}
                    {fmtPctOne(fourFactors?.calendarFactor?.weekdayRevenueSharePct)} / 공휴일 편차{' '}
                    {fmtSignedInt(fourFactors?.calendarFactor?.holidayDiffDays, '일')}
                  </strong>
                </div>
                <div className="pt-1 border-t border-[#1B382E]/10 text-[#6C7A73]">
                  학사일정/시즌성 진단:{' '}
                  <strong className="text-[#1B382E]">
                    {fmtText(fourFactors?.calendarFactor?.academicAndSeasonalityNote)}
                  </strong>
                </div>
              </div>
            </div>

            {/* 요인 2: 외부 환경 (기상 조건 / 지역 경쟁 환경) */}
            <div className="rounded-xl border border-[#1B382E]/15 p-4 bg-[#F4F3EE]/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 font-black text-sm text-[#1B382E]">
                  <CloudRain size={16} className="text-[#284F42]" />
                  ② 외부 환경 검증 (기상 민감도 · 강수/기온 · 지역 경쟁 환경)
                </span>
              </div>
              <div className="bg-white rounded-lg p-3 border border-[#1B382E]/10 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#6C7A73]">금년 기상 상태 (최고 / 최저기온)</span>
                  <strong className="text-[#1B382E]">
                    {fmtText(fourFactors?.externalEnvFactor?.tyWeatherDesc || weatherCurrent?.description)} (
                    {fmtText(fourFactors?.externalEnvFactor?.tyTempMax ?? weatherCurrent?.tempMax)}°C /{' '}
                    {fmtText(fourFactors?.externalEnvFactor?.tyTempMin ?? weatherCurrent?.tempMin)}°C)
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6C7A73]">비교기간 기상 상태 (최고 / 최저기온)</span>
                  <strong className="text-[#1B382E]">
                    {fmtText(fourFactors?.externalEnvFactor?.lyWeatherDesc || weatherLastYear?.description)} (
                    {fmtText(fourFactors?.externalEnvFactor?.lyTempMax ?? weatherLastYear?.tempMax)}°C /{' '}
                    {fmtText(fourFactors?.externalEnvFactor?.lyTempMin ?? weatherLastYear?.tempMin)}°C)
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6C7A73]">강수량 (금년 vs 비교) / 풍속</span>
                  <strong className="text-[#1B382E]">
                    {fmtText(fourFactors?.externalEnvFactor?.tyRainfallMm)}mm vs{' '}
                    {fmtText(fourFactors?.externalEnvFactor?.lyRainfallMm)}mm / 풍속{' '}
                    {fmtText(fourFactors?.externalEnvFactor?.tyWindSpeedMs)}m/s
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6C7A73]">야외 시설 기상 민감도 판정</span>
                  <strong className="text-[#1B382E]">
                    [{fmtText(fourFactors?.externalEnvFactor?.outdoorWeatherImpactGrade)}]{' '}
                    {fmtText(fourFactors?.externalEnvFactor?.outdoorWeatherImpactReason)}
                  </strong>
                </div>
                <div className="pt-1 border-t border-[#1B382E]/10 text-[#6C7A73]">
                  지역 경쟁 환경:{' '}
                  <strong className="text-[#1B382E]">
                    {fmtText(fourFactors?.externalEnvFactor?.competitorEnvNote)}
                  </strong>
                </div>
              </div>
            </div>

            {/* 요인 3: 내부 운영 / 영업 */}
            <div className="rounded-xl border border-[#1B382E]/15 p-4 bg-[#F4F3EE]/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 font-black text-sm text-[#1B382E]">
                  <Briefcase size={16} className="text-[#284F42]" />
                  ③ 내부 운영 / 영업 검증 (프로모션 공백 · 알로트먼트 · 시설점검 · B2B단체)
                </span>
              </div>
              <div className="bg-white rounded-lg p-3 border border-[#1B382E]/10 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#6C7A73]">B2B/단체 행사 건수 및 매출 비교</span>
                  <strong className="text-[#1B382E]">
                    금년 {fmtInt(fourFactors?.internalOpsFactor?.tyB2bGroupCount ?? groupSummary?.totalGroups)}건 (
                    {fmtInt(fourFactors?.internalOpsFactor?.tyB2bGroupRevenue ?? groupSummary?.totalRevenue)}원) vs 비교{' '}
                    {fmtInt(fourFactors?.internalOpsFactor?.lyB2bGroupCount)}건 (
                    {fmtInt(fourFactors?.internalOpsFactor?.lyB2bGroupRevenue)}원)
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6C7A73]">B2B/단체 행사 매출 증감액</span>
                  <strong
                    className={
                      Number(fourFactors?.internalOpsFactor?.b2bGroupDiffAmount) < 0
                        ? 'text-rose-600'
                        : 'text-emerald-700'
                    }
                  >
                    {fmtSignedInt(fourFactors?.internalOpsFactor?.b2bGroupDiffAmount, '원')}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6C7A73]">프로모션/기획전 공백 상태</span>
                  <strong className="text-[#1B382E]">
                    {fmtText(fourFactors?.internalOpsFactor?.promotionGapStatus)} (활성{' '}
                    {fmtInt(fourFactors?.internalOpsFactor?.activePromotionCount)}건 —{' '}
                    {fmtText(fourFactors?.internalOpsFactor?.promotionGapNote)})
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6C7A73]">채널 알로트먼트(Allotment) 변동</span>
                  <strong className="text-[#1B382E]">
                    {fmtText(fourFactors?.internalOpsFactor?.allotmentChangeNote)}
                  </strong>
                </div>
                <div className="pt-1 border-t border-[#1B382E]/10 text-[#6C7A73] space-y-1">
                  <div>
                    점검/휴장/단축 운영 시설:{' '}
                    <strong className="text-[#1B382E]">
                      {Array.isArray(fourFactors?.internalOpsFactor?.closedOrReducedVenues) &&
                      fourFactors.internalOpsFactor.closedOrReducedVenues.length > 0
                        ? fourFactors.internalOpsFactor.closedOrReducedVenues.join(', ')
                        : '-'}
                    </strong>
                  </div>
                  <div>
                    B2B 행사 기저 진단:{' '}
                    <strong className="text-[#284F42]">
                      {fmtText(fourFactors?.internalOpsFactor?.b2bEventEndNote)}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* 요인 4: 데이터 무결성 (PMS/POS 정산 주기, City Ledger, 선수금 이연) */}
            <div className="rounded-xl border border-[#1B382E]/15 p-4 bg-[#F4F3EE]/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 font-black text-sm text-[#1B382E]">
                  <CheckCircle2 size={16} className="text-[#284F42]" />
                  ④ 데이터 무결성 검증 (PMS/POS 정산 · City Ledger 외상매출금 · 선수금 이연)
                </span>
              </div>
              <div className="bg-white rounded-lg p-3 border border-[#1B382E]/10 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#6C7A73]">Gatekeeper PMS/POS 정산 대사 오차 (Δ)</span>
                  <strong className="text-emerald-700">
                    {fmtInt(
                      fourFactors?.dataIntegrityFactor?.reconciliationDeltaWon !== undefined
                        ? fourFactors.dataIntegrityFactor.reconciliationDeltaWon
                        : groupSummary?.audit?.discrepancyDelta
                    )}
                    원 ({fmtText(fourFactors?.dataIntegrityFactor?.gatekeeperSyncStatus)})
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6C7A73]">OTA / B2B 외상매출금(City Ledger) 후정산 대기</span>
                  <strong className="text-[#1B382E]">
                    {fmtInt(
                      fourFactors?.dataIntegrityFactor?.cityLedgerPendingCount !== undefined
                        ? fourFactors.dataIntegrityFactor.cityLedgerPendingCount
                        : groupSummary?.mice?.pendingCount
                    )}
                    건 (대기금액 {fmtInt(fourFactors?.dataIntegrityFactor?.cityLedgerPendingAmount)}원)
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6C7A73]">선수금 이연 상태 (Advance Deposit Deferral)</span>
                  <strong className="text-[#1B382E]">
                    {fmtText(fourFactors?.dataIntegrityFactor?.advanceDepositDeferralStatus)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6C7A73]">미분류 매핑 후보 (log_mapping_candidates)</span>
                  <strong className="text-[#1B382E]">
                    {fmtInt(fourFactors?.dataIntegrityFactor?.unmappedCandidateCount)}건
                  </strong>
                </div>
                <div className="pt-1 border-t border-[#1B382E]/10 text-[#6C7A73]">
                  정산 무결성 요약:{' '}
                  <strong className="text-[#1B382E]">
                    {fmtText(fourFactors?.dataIntegrityFactor?.integrityAuditSummary)}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
