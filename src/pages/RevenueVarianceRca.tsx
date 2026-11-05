import { useState, useEffect } from 'react';
import { useDate } from '../contexts/DateContext';
import { secureFetcher } from '../lib/secureFetcher';
import GlobalDatePicker from '../components/GlobalDatePicker';
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Target,
  Info,
  Utensils,
  Calendar,
  CloudRain,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  CheckCircle2,
  Layers
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

// 최상위 구분자(' + ', ' · ', ' | ', ' — ') 기준 절 분리 (괄호 내부는 보존)
const splitTopLevelClauses = (val: unknown): string[] => {
  if (val === null || val === undefined || val === '') return [];
  const str = String(val).trim();
  if (!str) return [];
  const result: string[] = [];
  let current = '';
  let depth = 0;
  let i = 0;
  while (i < str.length) {
    const ch = str[i];
    if (ch === '(' || ch === '[') {
      depth++;
      current += ch;
      i++;
    } else if (ch === ')' || ch === ']') {
      depth = Math.max(0, depth - 1);
      current += ch;
      i++;
    } else if (
      depth === 0 &&
      (str.startsWith(' + ', i) ||
        str.startsWith(' · ', i) ||
        str.startsWith(' | ', i) ||
        str.startsWith(' — ', i))
    ) {
      if (current.trim()) result.push(current.trim());
      current = '';
      i += 3;
    } else {
      current += ch;
      i++;
    }
  }
  if (current.trim()) result.push(current.trim());
  return result.length > 0 ? result : [str];
};

// 절 내부에서 첫 괄호 앞의 '핵심 제목'과 괄호 안의 '세부 근거'를 시각적으로 분리 (원문 100% 보존)
const splitHeadlineAndDetail = (clause: string): { headline: string; detail: string | null } => {
  const idx = clause.indexOf('(');
  if (idx <= 0) return { headline: clause, detail: null };
  return {
    headline: clause.slice(0, idx).trim(),
    detail: clause.slice(idx).trim()
  };
};

// 문장 앞의 '[태그]'를 분리하여 배지로 렌더링 (원문 100% 보존)
const splitLeadingTag = (text: string): { tag: string | null; body: string } => {
  const trimmed = String(text || '').trim();
  if (trimmed.startsWith('[')) {
    const closeIdx = trimmed.indexOf(']');
    if (closeIdx > 1) {
      return {
        tag: trimmed.slice(1, closeIdx).trim(),
        body: trimmed.slice(closeIdx + 1).trim()
      };
    }
  }
  return { tag: null, body: trimmed };
};

export default function RevenueVarianceRca() {
  const { startDate, endDate, isRange } = useDate();
  const effectiveEndDate = isRange && endDate ? endDate : startDate;
  const isMultiDay = effectiveEndDate !== startDate;
  const dateKey = `${startDate}_${effectiveEndDate}`;

  const [modeOverride, setModeOverride] = useState<{
    key: string;
    mode: 'YOY_DOW' | 'YOY_DATE' | 'MOM';
  } | null>(null);

  const defaultCompareMode: 'YOY_DOW' | 'YOY_DATE' = isMultiDay ? 'YOY_DATE' : 'YOY_DOW';
  const compareMode: 'YOY_DOW' | 'YOY_DATE' | 'MOM' =
    modeOverride && modeOverride.key === dateKey ? modeOverride.mode : defaultCompareMode;

  const [rcaData, setRcaData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // 설명/상세 토글 상태 (필요할 때 클릭하여 펼쳐보기)
  const [showExecDetail, setShowExecDetail] = useState<boolean>(false);
  const [showSimpsonHelp, setShowSimpsonHelp] = useState<boolean>(false);
  const [showCalendarDetail, setShowCalendarDetail] = useState<boolean>(false);
  const [showWeatherCorrDetail, setShowWeatherCorrDetail] = useState<boolean>(false);
  const [openSegmentDiag, setOpenSegmentDiag] = useState<Record<string, boolean>>({});
  const [showDeepReference, setShowDeepReference] = useState<boolean>(false);

  const toggleSegmentDiag = (code: string) => {
    setOpenSegmentDiag((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  const fetchRcaData = async () => {
    setLoading(true);
    try {
      const res = await secureFetcher(
        `${API_BASE}/api/v6/report/revenue-variance-rca?startDate=${startDate}&endDate=${effectiveEndDate}&compareMode=${compareMode}`
      ).catch(() => null);

      if (res && res.success) {
        setRcaData(res.data || res);
      } else {
        setRcaData(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRcaData();
  }, [startDate, effectiveEndDate, compareMode]);

  const period = rcaData?.period || null;
  const isMultiDayPeriod = Number(period?.dayCount) > 1 || isMultiDay;
  const formula = rcaData?.formulaDecomposition || null;
  const segIsolation = rcaData?.segmentIsolation || null;
  const segmentSummaryRows: any[] = Array.isArray(segIsolation?.segmentSummaryRows)
    ? segIsolation.segmentSummaryRows
    : [];
  const condoDetail = segIsolation?.condoDetail || null;
  const golfDetail = segIsolation?.golfDetail || null;
  const fnbDetail = segIsolation?.fnbDetail || null;
  const leisureDetail = segIsolation?.leisureDetail || null;

  const venueVariances: any[] = Array.isArray(leisureDetail?.venueVariances)
    ? leisureDetail.venueVariances
    : [];
  const channelMix: any[] = Array.isArray(condoDetail?.channelMix)
    ? condoDetail.channelMix
    : [];
  const pyungMix: any[] = Array.isArray(condoDetail?.pyungMix)
    ? condoDetail.pyungMix
    : Array.isArray(condoDetail?.roomTypeMix)
      ? condoDetail.roomTypeMix
      : [];
  const golfRevComp = golfDetail?.revenueComponents || null;
  const golfChannelMix: any[] = Array.isArray(golfDetail?.bookingChannelMix)
    ? golfDetail.bookingChannelMix
    : Array.isArray(golfDetail?.channelMix)
      ? golfDetail.channelMix
      : [];
  const golfVisitorBehavior = golfDetail?.visitorBehavior || null;

  const fourFactors = rcaData?.fourFactorVerification || null;
  const calFactor = fourFactors?.calendarFactor || null;
  const extWeather = fourFactors?.externalEnvFactor || null;
  const compMarket = fourFactors?.competitorMarketFactor || null;
  const parkingBehavior = fourFactors?.parkingAndBehaviorFactor || fourFactors?.stayVsWalkinLprFactor || null;
  const integrityFactor = fourFactors?.dataIntegrityFactor || fourFactors?.accountingIntegrityFactor || null;

  const crossMatrix = rcaData?.crossCorrelationMatrix || null;
  const pearsonCorr = crossMatrix?.pearsonCorrelations || null;
  const rawCorr = crossMatrix?.rawUnadjustedCorrelations || null;
  const stratifiedByDayType = crossMatrix?.stratifiedByDayType || null;
  const redDayBucket = stratifiedByDayType?.redDayWeekendHolidayBucket || null;
  const weekdayBucket = stratifiedByDayType?.weekdayBucket || null;
  const timeOfDayLinkages = crossMatrix?.timeOfDayCausalLinkages || null;
  const groupSegmentBreakdown: any[] = Array.isArray(crossMatrix?.groupSegmentVenueBreakdown)
    ? crossMatrix.groupSegmentVenueBreakdown
    : [];
  const banquetTopEvents = crossMatrix?.banquetTopEvents || null;

  const structuredReport = rcaData?.structuredReport || null;
  const executiveSummaryBullets: string[] = Array.isArray(structuredReport?.executiveSummary)
    ? structuredReport.executiveSummary
    : [];
  const top3Hypotheses: any[] = Array.isArray(structuredReport?.top3Hypotheses)
    ? structuredReport.top3Hypotheses
    : [];
  const immediateActionItems: string[] = Array.isArray(structuredReport?.immediateActionItems)
    ? structuredReport.immediateActionItems
    : [];

  const isNegative = Number(formula?.revenueDiffAmount) < 0;
  const upSegments = segmentSummaryRows.filter((r: any) => Number(r?.diffAmount) > 0);
  const downSegments = segmentSummaryRows.filter((r: any) => Number(r?.diffAmount) < 0);
  const primaryClauses = splitTopLevelClauses(formula?.primaryDriverLabel);

  // 본부별 [품목·매장축] vs [예약채널·고객유형축] 2축 분리 카드 + 상세 해설 토글
  const renderSegmentCard = (row: any, idx: number) => {
    const segCode = String(row?.segmentCode || idx);
    const neg = Number(row?.diffAmount) < 0;
    const isDiagOpen = Boolean(openSegmentDiag[segCode]);

    let productAxisItems: Array<{ label: string; sub?: string; diff: unknown; pct?: unknown }> = [];
    let channelAxisItems: Array<{ label: string; sub?: string; diff: unknown; pct?: unknown }> = [];

    if (segCode === 'CONDO') {
      productAxisItems = pyungMix.map((p: any) => ({
        label: fmtText(p?.pyungLabel || p?.pyungCode),
        sub: `${fmtInt(p?.lyRooms)}➔${fmtInt(p?.tyRooms)}실 (${fmtSignedInt(p?.diffRooms, '실')})`,
        diff: p?.diffRevenue
      }));
      channelAxisItems = channelMix.map((ch: any) => ({
        label: fmtText(ch?.channelLabel),
        sub: `${fmtInt(ch?.lyRooms)}➔${fmtInt(ch?.tyRooms)}실 · ADR ${fmtInt(ch?.tyAdr)}원`,
        diff: ch?.diffRevenue
      }));
    } else if (segCode === 'LEISURE') {
      productAxisItems = venueVariances.map((v: any) => ({
        label: fmtText(v?.venueName),
        sub: `${fmtInt(v?.lyVisitors)}➔${fmtInt(v?.tyVisitors)}명`,
        diff: v?.diffAmount,
        pct: v?.growthPct
      }));
      channelAxisItems = groupSegmentBreakdown
        .filter((g: any) => Number(g?.tyLeisureRev) > 0 || Number(g?.leisureDiffRev) !== 0)
        .map((g: any) => ({
          label: fmtText(g?.segmentLabel),
          sub: `당기 레저 ${fmtInt(g?.tyLeisureRev)}원`,
          diff: g?.leisureDiffRev ?? g?.diffRev
        }));
    } else if (segCode === 'FNB_BANQUET') {
      productAxisItems = [
        {
          label: '직영 식당 일반 매출',
          sub: `영수증 ${fmtInt(fnbDetail?.lyReceiptCount)}➔${fmtInt(fnbDetail?.tyReceiptCount)}건 · 단가 ${fmtInt(fnbDetail?.tyAvgCheckPerReceipt)}원`,
          diff: fnbDetail?.directFnbDiffAmount,
          pct: fnbDetail?.directFnbGrowthPct
        },
        {
          label: 'B2B 세미나 · 단체 연회 대관',
          sub: `${fmtInt(fnbDetail?.lyBanquetRevenue)}➔${fmtInt(fnbDetail?.tyBanquetRevenue)}원`,
          diff: fnbDetail?.banquetDiffAmount,
          pct: fnbDetail?.banquetGrowthPct
        }
      ];
      channelAxisItems = groupSegmentBreakdown
        .filter((g: any) => Number(g?.tyFnbRev) > 0 || Number(g?.fnbDiffRev) !== 0)
        .map((g: any) => ({
          label: fmtText(g?.segmentLabel),
          sub: `당기 식음 ${fmtInt(g?.tyFnbRev)}원`,
          diff: g?.fnbDiffRev ?? g?.diffRev
        }));
    } else if (segCode === 'GOLF') {
      if (golfRevComp) {
        productAxisItems = [
          {
            label: '순수 그린피 (입장료)',
            sub: `${fmtInt(golfRevComp?.lyGreenFeeRevenue)}➔${fmtInt(golfRevComp?.tyGreenFeeRevenue)}원`,
            diff: golfRevComp?.greenFeeDiff
          },
          {
            label: '프로샵 · 클럽하우스 부대매출',
            sub: `${fmtInt(golfRevComp?.lyProshopAndClubhouseExtraRevenue)}➔${fmtInt(golfRevComp?.tyProshopAndClubhouseExtraRevenue)}원`,
            diff: golfRevComp?.extraRevenueDiff,
            pct: golfRevComp?.extraRevenueGrowthPct
          },
          {
            label: '카트 대여료',
            sub: `${fmtInt(golfRevComp?.lyCartFeeRevenue)}➔${fmtInt(golfRevComp?.tyCartFeeRevenue)}원`,
            diff: golfRevComp?.cartFeeDiff
          }
        ];
      }
      channelAxisItems = golfChannelMix.map((gc: any) => ({
        label: fmtText(gc?.channelLabel),
        sub: `${fmtInt(gc?.lyPlayers)}➔${fmtInt(gc?.tyPlayers)}명 (${fmtSignedInt(gc?.diffPlayers, '명')})`,
        diff: gc?.diffGreenFee
      }));
    }

    return (
      <div
        key={segCode}
        className="bg-white rounded-xl p-4 border border-[#1B382E]/15 shadow-2xs space-y-3"
      >
        {/* 1) 본부 헤더 */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#1B382E]/10">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-black text-[#1B382E]">{fmtText(row?.segmentName)}</span>
            <span className={`text-base font-black ${neg ? 'text-rose-600' : 'text-emerald-700'}`}>
              {fmtSignedInt(row?.diffAmount, '원')} ({fmtPct(row?.growthPct)})
            </span>
          </div>
          <div className="text-xs font-bold text-[#5A6B63]">
            {row?.visitorDiff !== null && row?.visitorDiff !== undefined ? (
              <span>
                방문객{' '}
                <strong className={Number(row?.visitorDiff) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                  {fmtSignedInt(row?.visitorDiff, '명')}({fmtPct(row?.visitorGrowthPct)})
                </strong>{' '}
                · 1인당 단가{' '}
                <strong className={Number(row?.spendPerHeadGrowthPct) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                  {fmtPct(row?.spendPerHeadGrowthPct)}
                </strong>
              </span>
            ) : (
              <span>
                {fmtInt(row?.lyRevenue)}원 ➔ {fmtInt(row?.tyRevenue)}원
              </span>
            )}
          </div>
        </div>

        {/* 2) [품목·매장축] vs [예약채널·고객유형축] 2축 시각적 분리 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5 text-xs">
          {/* 축 A: 품목·매장별 증감 */}
          {productAxisItems.length > 0 && (
            <div className="rounded-lg bg-[#F8F7F3] p-3 border border-[#1B382E]/10 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-[#284F42] text-white text-[11px] font-extrabold">
                  ① 품목 · 매장별 증감 (수익원)
                </span>
                <span className="text-[10px] text-[#6C7A73] font-semibold">합계 = 본부 증감액</span>
              </div>
              <div className="divide-y divide-[#1B382E]/5 pt-0.5">
                {productAxisItems.map((pItem, pIdx) => {
                  const pNeg = Number(pItem.diff) < 0;
                  return (
                    <div key={pIdx} className="flex items-center justify-between py-1 gap-2">
                      <div className="min-w-0">
                        <strong className="text-[#1B382E]">{pItem.label}</strong>
                        {pItem.sub && <span className="text-[#5A6B63] ml-1 text-[11px]">({pItem.sub})</span>}
                      </div>
                      <strong className={`shrink-0 ${pNeg ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {fmtSignedInt(pItem.diff, '원')}
                      </strong>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 축 B: 예약채널·고객유형별 증감 */}
          {channelAxisItems.length > 0 && (
            <div className="rounded-lg bg-[#F4F3EE]/60 p-3 border border-[#B59269]/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-[#8C6D46] text-white text-[11px] font-extrabold">
                  ② 예약채널 · 고객유형별 (유입경로)
                </span>
                <span className="text-[10px] text-[#8C6D46] font-semibold">품목축과 별도 차원</span>
              </div>
              <div className="divide-y divide-[#1B382E]/5 pt-0.5">
                {channelAxisItems.map((cItem, cIdx) => {
                  const cNeg = Number(cItem.diff) < 0;
                  return (
                    <div key={cIdx} className="flex items-center justify-between py-1 gap-2">
                      <div className="min-w-0">
                        <strong className="text-[#1B382E]">{cItem.label}</strong>
                        {cItem.sub && <span className="text-[#5A6B63] ml-1 text-[11px]">({cItem.sub})</span>}
                      </div>
                      <strong className={`shrink-0 ${cNeg ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {fmtSignedInt(cItem.diff, '원')}
                      </strong>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 3) 클릭 시 펼쳐지는 본부 상세 인과 진단 (isolationDiagnosis) */}
        {row?.isolationDiagnosis && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => toggleSegmentDiag(segCode)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#E8F2EE]/70 hover:bg-[#E8F2EE] border border-[#284F42]/20 text-xs font-bold text-[#1E523F] transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <HelpCircle size={13} />
                <span>{fmtText(row?.segmentName)} 상세 원인 진단 해설 {isDiagOpen ? '접기' : '보기'}</span>
              </span>
              {isDiagOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {isDiagOpen && (
              <div className="mt-1.5 rounded-lg bg-[#F8F7F3] border border-[#284F42]/20 p-3 text-xs text-[#1B382E] space-y-1.5 leading-relaxed">
                {splitTopLevelClauses(row?.isolationDiagnosis).map((diagClause, dIdx) => (
                  <div key={dIdx} className="flex items-start gap-1.5">
                    <span className="text-[#284F42] font-black shrink-0">•</span>
                    <span>{diagClause}</span>
                  </div>
                ))}
                {segCode === 'GOLF' && golfVisitorBehavior && (
                  <div className="pt-1.5 mt-1 border-t border-[#1B382E]/10 text-[11px] text-[#5A6B63]">
                    • 위임·연단체 예약:{' '}
                    <strong className="text-[#1B382E]">
                      {fmtInt(golfVisitorBehavior?.lyDelegatedBookings ?? golfVisitorBehavior?.lyDelegatedGroupBookings)}➔
                      {fmtInt(golfVisitorBehavior?.tyDelegatedBookings ?? golfVisitorBehavior?.tyDelegatedGroupBookings)}건
                    </strong>{' '}
                    | 티오프 전 평균 도착:{' '}
                    <strong className="text-[#1B382E]">
                      {fmtInt(golfVisitorBehavior?.tyAvgPreTeeArrivalMinutes)}분 전
                    </strong>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F4F3EE] text-[#1B382E] p-4 md:p-6 lg:p-8 space-y-5 max-w-6xl mx-auto">
      {/* =====================================================================
          상단 날짜 및 비교 기준 선택 바
         ===================================================================== */}
      <div className="bg-white rounded-2xl border border-[#1B382E]/10 shadow-xs p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-[#1B382E] tracking-tight">
              매출 증감 원인 분석 (RCA)
            </h1>
            {period && (
              <p className="text-xs md:text-sm text-[#6C7A73] mt-1">
                조회기간: <strong className="text-[#1B382E]">{fmtText(period?.tyStartDate)} ~ {fmtText(period?.tyEndDate)}</strong>
                {' '}({fmtInt(period?.dayCount)}일) vs 비교기간:{' '}
                <strong className="text-[#284F42]">{fmtText(period?.lyStartDate)} ~ {fmtText(period?.lyEndDate)}</strong>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <GlobalDatePicker />
            <div className="flex items-center bg-[#F4F3EE] p-1 rounded-xl">
              {[
                { code: 'YOY_DOW' as const, label: '전년 동요일' },
                { code: 'YOY_DATE' as const, label: isMultiDay ? '전년 동기간 (월/일)' : '전년 같은날짜' },
                { code: 'MOM' as const, label: '전월 동기' }
              ].map((mode) => (
                <button
                  key={mode.code}
                  type="button"
                  onClick={() => setModeOverride({ key: dateKey, mode: mode.code })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    compareMode === mode.code
                      ? 'bg-[#284F42] text-white shadow-xs'
                      : 'text-[#1B382E]/75 hover:text-[#1B382E]'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={fetchRcaData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#284F42] hover:bg-[#1B382E] text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              재조회
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          섹션 1. 한눈에 보는 핵심 결론 (무엇 때문에 매출이 증감했는가?)
         ===================================================================== */}
      <div className="bg-white rounded-2xl border-2 border-[#284F42] shadow-xs p-5 md:p-6 space-y-5">
        {/* 상단 타이틀 + 총 매출 증감액 헤더 */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-[#1B382E]/10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#284F42] text-white text-xs font-bold">
                <Target size={14} />
                1. 핵심 결론 — 왜 매출이 {isNegative ? '감소' : '증가'}했는가?
              </span>
              <span className="text-xs font-bold text-[#5A6B63]">
                전체 방문객{' '}
                <strong className={Number(formula?.visitorDiffCount) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                  {fmtSignedInt(formula?.visitorDiffCount, '명')}({fmtPct(formula?.visitorGrowthPct)})
                </strong>{' '}
                · 1인당 평균 지출{' '}
                <strong className={Number(formula?.spendPerHeadDiff) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                  {fmtSignedInt(formula?.spendPerHeadDiff, '원')}({fmtPct(formula?.spendPerHeadGrowthPct)})
                </strong>
              </span>
            </div>

            {/* 4대 사업부 한 줄 성적표 칩 */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {segmentSummaryRows.map((seg: any, sIdx: number) => {
                const sNeg = Number(seg?.diffAmount) < 0;
                return (
                  <div
                    key={seg?.segmentCode || sIdx}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
                      sNeg
                        ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                        : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                    }`}
                  >
                    <span>{fmtText(seg?.segmentName)}</span>
                    <strong className={sNeg ? 'text-rose-600' : 'text-emerald-700'}>
                      {fmtSignedInt(seg?.diffAmount, '원')} ({fmtPct(seg?.growthPct)})
                    </strong>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 우측 총 매출 증감액 박스 */}
          <div className="bg-[#F4F3EE] rounded-2xl px-5 py-3.5 text-right shrink-0 border border-[#1B382E]/10">
            <div className="text-xs text-[#5A6B63] font-semibold">
              당기 {fmtInt(formula?.tyTotalRevenue)}원 (비교기 {fmtInt(formula?.lyTotalRevenue)}원)
            </div>
            <div
              className={`text-2xl md:text-3xl font-black mt-0.5 flex items-center justify-end gap-2 ${
                isNegative ? 'text-rose-600' : 'text-emerald-700'
              }`}
            >
              {isNegative ? <TrendingDown size={24} /> : <TrendingUp size={24} />}
              <span>
                {fmtSignedInt(formula?.revenueDiffAmount, '원')} ({fmtPct(formula?.revenueGrowthPct)})
              </span>
            </div>
            {calFactor && (
              <div className="text-xs font-bold text-[#8C6D46] mt-1">
                공휴일 차이 보정 실질 증감:{' '}
                <strong
                  className={
                    Number(calFactor?.calendarAdjustedRevenueDiff) < 0 ? 'text-rose-600' : 'text-emerald-700'
                  }
                >
                  {fmtSignedInt(calFactor?.calendarAdjustedRevenueDiff, '원')}
                </strong>
              </div>
            )}
          </div>
        </div>

        {/* 핵심 원인 요약 카드 그리드 (primaryDriverLabel 절별 헤드라인 + 세부수치 분리) */}
        {primaryClauses.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs md:text-sm font-extrabold text-[#284F42]">
                주요 증감 원인 요약 (핵심 요인별 분해)
              </span>
              <button
                type="button"
                onClick={() => setShowExecDetail((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F4F3EE] hover:bg-[#E8F2EE] border border-[#284F42]/25 text-xs font-extrabold text-[#284F42] transition-colors cursor-pointer"
              >
                <HelpCircle size={13} />
                <span>경영진 3대 인과 해설 & 검증 근거 {showExecDetail ? '접기' : '펼쳐보기'}</span>
                {showExecDetail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {primaryClauses.map((clause, idx) => {
                const { headline, detail } = splitHeadlineAndDetail(clause);
                return (
                  <div
                    key={idx}
                    className="rounded-xl bg-[#F8F7F3] p-3.5 border border-[#1B382E]/15 flex items-start gap-2.5"
                  >
                    <span className="w-5 h-5 rounded-full bg-[#284F42] text-white text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="space-y-1 min-w-0">
                      <div className="text-xs md:text-sm font-black text-[#1B382E] leading-snug">
                        {headline}
                      </div>
                      {detail && (
                        <div className="text-xs text-[#4A5D54] leading-relaxed break-words">
                          {detail}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 클릭 시 펼쳐지는 경영진 3대 인과 요약(executiveSummary) + 데이터 검증 3대 가설(top3Hypotheses) */}
            {showExecDetail && (
              <div className="rounded-2xl bg-[#F4F3EE]/80 border border-[#284F42]/25 p-4 space-y-4 mt-2">
                {executiveSummaryBullets.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-extrabold text-[#1E523F]">
                      [경영진 3대 핵심 인과 해설]
                    </div>
                    <div className="space-y-2">
                      {executiveSummaryBullets.map((item, idx) => {
                        const { tag, body } = splitLeadingTag(item);
                        return (
                          <div
                            key={idx}
                            className="rounded-xl bg-white p-3 border border-[#1B382E]/10 text-xs md:text-[13px] leading-relaxed text-[#1B382E]"
                          >
                            {tag && (
                              <span className="inline-block px-2 py-0.5 rounded bg-[#284F42] text-white text-[11px] font-bold mr-2 mb-1">
                                {tag}
                              </span>
                            )}
                            <span>{body}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {top3Hypotheses.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-[#1B382E]/10">
                    <div className="text-xs font-extrabold text-[#1E523F]">
                      [데이터 검증으로 확인된 3대 핵심 근거]
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      {top3Hypotheses.map((h: any, idx: number) => (
                        <div
                          key={idx}
                          className="rounded-xl bg-white p-3 border border-[#1B382E]/10 space-y-1.5 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <strong className="text-[#1B382E] font-black">
                              {fmtText(h?.hypothesisTitle || h?.category)}
                            </strong>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                                h?.status === 'CONFIRMED'
                                  ? 'bg-rose-600 text-white'
                                  : h?.status === 'PARTIAL'
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {fmtText(h?.status)}
                            </span>
                          </div>
                          <div className="text-[11px] font-bold text-[#284F42]">
                            {fmtText(h?.verificationMetric)}
                          </div>
                          <p className="text-[11px] text-[#5A6B63] leading-relaxed">
                            {fmtText(h?.evidenceDetail)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* =====================================================================
          섹션 2. 외부 환경(달력·날씨·상관관계) 및 4대 원인별 금액 분해
         ===================================================================== */}
      <div className="space-y-4">
        {/* 상단 2열: [달력 공휴일 차이 보정] vs [기상 여건 및 요일 통제 순수 상관관계(r)] */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 좌측: 달력 공휴일 차이 보정 */}
          {calFactor && (
            <div className="bg-white rounded-2xl border border-[#B59269]/40 shadow-xs p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-[#B59269]/25 pb-2.5">
                <div className="flex items-center gap-2">
                  <Calendar size={17} className="text-[#8C6D46]" />
                  <h2 className="text-sm md:text-base font-black text-[#1B382E]">
                    달력 공휴일 · 주말 일수 차이 보정
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCalendarDetail((prev) => !prev)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F4F3EE] hover:bg-[#EAE7DF] text-[11px] font-bold text-[#8C6D46] cursor-pointer"
                >
                  <span>{showCalendarDetail ? '상세 접기' : '휴일·평일 평균매출 보기'}</span>
                  {showCalendarDetail ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              </div>

              {/* 핵심 3대 수치 요약 */}
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="rounded-xl bg-[#F8F7F3] p-2.5 border border-[#1B382E]/10">
                  <div className="text-[11px] text-[#5A6B63] font-semibold">법정공휴일 (총 휴일)</div>
                  <div className="text-sm font-black text-[#1B382E] mt-0.5">
                    {fmtInt(calFactor?.lyHolidayDays)}➔{fmtInt(calFactor?.tyHolidayDays)}일{' '}
                    <span className={Number(calFactor?.holidayDiffDays) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                      ({fmtSignedInt(calFactor?.holidayDiffDays, '일')})
                    </span>
                  </div>
                  <div className="text-[10px] text-[#6C7A73]">
                    주말포함 {fmtInt(calFactor?.lyRedDays)}➔{fmtInt(calFactor?.tyRedDays)}일
                  </div>
                </div>

                <div className="rounded-xl bg-[#F8F7F3] p-2.5 border border-[#1B382E]/10">
                  <div className="text-[11px] text-[#5A6B63] font-semibold">달력 휴일수 차이 효과</div>
                  <div
                    className={`text-sm font-black mt-0.5 ${
                      Number(calFactor?.calendarShiftEffectAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {fmtSignedInt(calFactor?.calendarShiftEffectAmount, '원')}
                  </div>
                  <div className="text-[10px] text-[#6C7A73]">달력 구조상 유불리</div>
                </div>

                <div className="rounded-xl bg-[#F4F3EE] p-2.5 border border-[#B59269]/40">
                  <div className="text-[11px] text-[#8C6D46] font-extrabold">보정 후 실질 영업증감</div>
                  <div
                    className={`text-sm font-black mt-0.5 ${
                      Number(calFactor?.calendarAdjustedRevenueDiff) < 0 ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {fmtSignedInt(calFactor?.calendarAdjustedRevenueDiff, '원')}
                  </div>
                  <div className="text-[10px] text-[#8C6D46]">순수 영업 기초체력</div>
                </div>
              </div>

              {/* 클릭 시 펼쳐지는 달력 상세 */}
              {showCalendarDetail && (
                <div className="rounded-xl bg-[#F8F7F3] p-3 border border-[#1B382E]/10 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#5A6B63]">주말·공휴일 일평균 매출</span>
                    <strong className="text-[#1B382E]">
                      {fmtInt(calFactor?.lyRedDayAvgRevenue)}원 ➔ {fmtInt(calFactor?.tyRedDayAvgRevenue)}원 (
                      {fmtPct(calFactor?.redDayDailyAvgGrowthPct)})
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#5A6B63]">평일(주중) 일평균 매출</span>
                    <strong className="text-[#1B382E]">
                      {fmtInt(calFactor?.lyWeekdayAvgRevenue)}원 ➔ {fmtInt(calFactor?.tyWeekdayAvgRevenue)}원 (
                      {fmtPct(calFactor?.weekdayDailyAvgGrowthPct)})
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#5A6B63]">공휴일 명칭 비교</span>
                    <strong className="text-[#1B382E]">
                      당기 [{fmtText(calFactor?.tyHolidayNames)}] vs 비교기 [{fmtText(calFactor?.lyHolidayNames)}]
                    </strong>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 우측: 기상 여건 및 요일 통제(FWL) 순수 상관관계(r) */}
          {(extWeather || pearsonCorr) && (
            <div className="bg-white rounded-2xl border border-[#284F42]/30 shadow-xs p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-[#284F42]/15 pb-2.5">
                <div className="flex items-center gap-2">
                  <CloudRain size={17} className="text-[#1E523F]" />
                  <h2 className="text-sm md:text-base font-black text-[#1B382E]">
                    기상(우천) 여건 및 요일 통제 순수 상관관계(r)
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWeatherCorrDetail((prev) => !prev)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#E8F2EE] hover:bg-[#D5E8E0] text-[11px] font-bold text-[#1E523F] cursor-pointer"
                >
                  <HelpCircle size={12} />
                  <span>{showWeatherCorrDetail ? '상관계수 상세 접기' : '8대 상관계수·설명 보기'}</span>
                  {showWeatherCorrDetail ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              </div>

              {/* 핵심 3대 기상·상관 요약 */}
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="rounded-xl bg-[#F8F7F3] p-2.5 border border-[#1B382E]/10">
                  <div className="text-[11px] text-[#5A6B63] font-semibold">주말·공휴일 비 온 날</div>
                  <div className="text-sm font-black text-[#1B382E] mt-0.5">
                    {fmtInt(extWeather?.lyRedDayRainyDays)}➔{fmtInt(extWeather?.tyRedDayRainyDays)}일{' '}
                    <span
                      className={Number(extWeather?.redDayRainyDaysDiff) <= 0 ? 'text-emerald-700' : 'text-rose-600'}
                    >
                      ({fmtSignedInt(extWeather?.redDayRainyDaysDiff, '일')})
                    </span>
                  </div>
                  <div className="text-[10px] text-[#6C7A73]">
                    평일 우천 {fmtInt(extWeather?.lyWeekdayRainyDays)}➔{fmtInt(extWeather?.tyWeekdayRainyDays)}일
                  </div>
                </div>

                <div className="rounded-xl bg-[#F8F7F3] p-2.5 border border-[#1B382E]/10">
                  <div className="text-[11px] text-[#5A6B63] font-semibold">총 우천일 (강수량)</div>
                  <div className="text-sm font-black text-[#1B382E] mt-0.5">
                    {fmtInt(extWeather?.lyRainyDays)}➔{fmtInt(extWeather?.tyRainyDays)}일{' '}
                    <span>({fmtSignedInt(extWeather?.rainyDaysDiff, '일')})</span>
                  </div>
                  <div className="text-[10px] text-[#6C7A73]">
                    {fmtText(extWeather?.lyRainfallMm)}➔{fmtText(extWeather?.tyRainfallMm)}mm · 최고{' '}
                    {fmtText(extWeather?.tyTempMax)}°C
                  </div>
                </div>

                <div className="rounded-xl bg-[#E8F2EE]/60 p-2.5 border border-[#284F42]/25">
                  <div className="text-[11px] text-[#1E523F] font-extrabold">요일통제 핵심 상관계수</div>
                  <div className="text-xs font-black text-rose-600 mt-0.5">
                    강수↔골프 r={fmtText(pearsonCorr?.rRainVsGolfRev)}
                  </div>
                  <div className="text-[10px] text-[#1E523F] font-bold">
                    외출↔석식 r={fmtText(pearsonCorr?.rStayOutingVsEveningPosRev)}
                  </div>
                </div>
              </div>

              {/* 클릭 시 펼쳐지는 상관계수 설명 + 8대 전체 상관계수 및 주중/주말 층화 비교 */}
              {showWeatherCorrDetail && (
                <div className="rounded-xl bg-[#F8F7F3] p-3.5 border border-[#284F42]/20 space-y-3 text-xs">
                  <div className="rounded-lg bg-white p-2.5 border border-[#1B382E]/10 text-[11px] text-[#4A5D54] leading-relaxed">
                    <strong className="text-[#1B382E]">💡 상관계수(r) 읽는 법:</strong> 주말에 손님도 많고 외출도 함께 늘어나는{' '}
                    <strong>요일 착시(교란효과)를 제거한 순수 인과 지수(FWL Partial r)</strong>입니다.{' '}
                    <strong className="text-emerald-700">+1에 가까울수록 동반 상승</strong>,{' '}
                    <strong className="text-rose-600">-1에 가까울수록 매출을 깎아먹는 역상관</strong>을 뜻합니다.
                    {rawCorr && (
                      <span>
                        {' '}
                        (예: 숙박외출↔석식매출 단순 상관계수는 {fmtText(rawCorr?.rStayOutingVsEveningPosRev)}이나 요일 통제 후 실제 순수 상관성은{' '}
                        <strong className="text-rose-600">{fmtText(pearsonCorr?.rStayOutingVsEveningPosRev)}</strong>)
                      </span>
                    )}
                  </div>

                  {pearsonCorr && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        {
                          label: '강수량 ↔ 골프매출',
                          val: pearsonCorr?.rRainVsGolfRev,
                          sub: redDayBucket ? `휴일 ${fmtText(redDayBucket?.rRainVsGolfRev)}` : undefined
                        },
                        {
                          label: '강수량 ↔ 야외레저',
                          val: pearsonCorr?.rRainVsOutdoorLeisureRev,
                          sub: redDayBucket ? `휴일 ${fmtText(redDayBucket?.rRainVsOutdoorLeisureRev)}` : undefined
                        },
                        {
                          label: '강수량 ↔ 실내레저',
                          val: pearsonCorr?.rRainVsIndoorLeisureRev
                        },
                        {
                          label: '조식골퍼/투숙 ↔ 조식POS',
                          val: pearsonCorr?.rMorningGuestsGolfVsMorningPosRev
                        },
                        {
                          label: '4h+ 나들이 ↔ 중식POS',
                          val: pearsonCorr?.rWalkinLongDwellVsLunchPosRev,
                          sub: redDayBucket ? `휴일 ${fmtText(redDayBucket?.rWalkinLongDwellVsLunchPosRev)}` : undefined
                        },
                        {
                          label: '투숙객 ↔ 직영식음',
                          val: pearsonCorr?.rStayGuestsVsDirectFnbRev,
                          sub: redDayBucket ? `휴일 ${fmtText(redDayBucket?.rStayGuestsVsDirectFnbRev)}` : undefined
                        },
                        {
                          label: '숙박외출 ↔ 석식POS',
                          val: pearsonCorr?.rStayOutingVsEveningPosRev,
                          sub: weekdayBucket ? `평일 ${fmtText(weekdayBucket?.rStayOutingVsEveningPosRev)}` : undefined
                        },
                        {
                          label: '51평 비중 ↔ 열쇠효율',
                          val: pearsonCorr?.rRoom51ShareVsKeyYield
                        }
                      ].map((cItem, cIdx) => {
                        const numR = Number(cItem.val);
                        return (
                          <div key={cIdx} className="rounded-lg bg-white p-2 border border-[#1B382E]/10">
                            <div className="text-[11px] font-bold text-[#5A6B63]">{cItem.label}</div>
                            <div
                              className={`text-sm font-black mt-0.5 ${
                                Number.isNaN(numR)
                                  ? 'text-[#1B382E]'
                                  : numR < 0
                                  ? 'text-rose-600'
                                  : 'text-emerald-700'
                              }`}
                            >
                              r = {fmtText(cItem.val)}
                            </div>
                            {cItem.sub && <div className="text-[10px] text-[#6C7A73]">{cItem.sub}</div>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {extWeather && (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-[#5A6B63]">
                      <span>
                        맑은 날 평균 매출: <strong className="text-[#1B382E]">{fmtInt(extWeather?.tyClearDayAvgRevenue)}원</strong> vs 비 온 날:{' '}
                        <strong className="text-[#1B382E]">{fmtInt(extWeather?.tyRainyDayAvgRevenue)}원</strong>
                      </span>
                      <span>
                        평균 최고기온: 휴일 <strong className="text-[#1B382E]">{fmtText(extWeather?.tyRedDayAvgTempMax)}°C</strong> / 평일{' '}
                        <strong className="text-[#1B382E]">{fmtText(extWeather?.tyWeekdayAvgTempMax)}°C</strong>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 하단: 매출 증감액의 4대 원인별 금액 분해 (심슨의 역설 보정) */}
        {formula && (
          <div className="bg-white rounded-2xl border border-[#1B382E]/15 shadow-xs p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded bg-[#284F42] text-white text-xs font-bold">
                  4대 원인 금액 분해
                </span>
                <h2 className="text-sm md:text-base font-black text-[#1B382E]">
                  매출 증감액({fmtSignedInt(formula?.revenueDiffAmount, '원')})은 어떤 요인에서 발생했는가?
                </h2>
              </div>
              {formula?.simpsonParadoxNote && (
                <button
                  type="button"
                  onClick={() => setShowSimpsonHelp((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-xs font-bold text-amber-900 cursor-pointer"
                >
                  <HelpCircle size={13} />
                  <span>왜 단순 방문객 효과와 실질 효과가 다른가요? (심슨의 역설 설명)</span>
                  {showSimpsonHelp ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              )}
            </div>

            {showSimpsonHelp && formula?.simpsonParadoxNote && (
              <div className="rounded-xl bg-amber-50/90 border border-amber-200 p-3.5 text-xs text-amber-950 leading-relaxed">
                <strong className="font-extrabold text-amber-900 mr-1.5">[방문객 부풀림 착시(심슨의 역설) 해설]</strong>
                {fmtText(formula?.simpsonParadoxNote)}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* ① 실질 방문객 증감 효과 (유입트랙 가중) */}
              <div className="rounded-xl bg-[#F8F7F3] border-2 border-[#284F42]/30 p-3.5 space-y-1">
                <div className="text-xs font-extrabold text-[#284F42]">
                  ① 실질 방문객 증감 효과 (유입트랙 가중)
                </div>
                <div
                  className={`text-lg font-black ${
                    Number(formula?.shapleyVolumeEffectAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {fmtSignedInt(formula?.shapleyVolumeEffectAmount, '원')}
                </div>
                <div className="text-[11px] text-[#5A6B63] pt-1 border-t border-[#1B382E]/10 leading-snug">
                  단순 총인원 {fmtSignedInt(formula?.volumeEffectAmount, '원')} / 나들이객 비중 보정{' '}
                  {fmtSignedInt(formula?.visitorMixEffectAmount, '원')}
                </div>
              </div>

              {/* ② 객실·골프·레저 순수 단가 효과 */}
              <div className="rounded-xl bg-[#F8F7F3] border border-[#1B382E]/10 p-3.5 space-y-1">
                <div className="text-xs font-bold text-[#5A6B63]">② 객실 · 골프 · 레저 순수 단가</div>
                <div
                  className={`text-lg font-black ${
                    Number(formula?.coreSegmentPurePriceEffectAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {fmtSignedInt(formula?.coreSegmentPurePriceEffectAmount, '원')}
                </div>
                <div className="text-[11px] text-[#5A6B63] pt-1 border-t border-[#1B382E]/10 leading-snug">
                  유입 비중 희석을 제외한 각 사업부 내 순수 객단가 변동
                </div>
              </div>

              {/* ③ 식당(F&B) 1인당 식사비 부착 효과 */}
              <div className="rounded-xl bg-[#F8F7F3] border border-[#1B382E]/10 p-3.5 space-y-1">
                <div className="text-xs font-bold text-[#5A6B63]">③ 식당(F&B) 1인당 식사비 효과</div>
                <div
                  className={`text-lg font-black ${
                    Number(formula?.pureFnbAttachEffectAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {fmtSignedInt(formula?.pureFnbAttachEffectAmount, '원')}
                </div>
                <div className="text-[11px] text-[#5A6B63] pt-1 border-t border-[#1B382E]/10 leading-snug">
                  방문객 1인당 직영 식당 지출액 변동 및 외부 외출 영향
                </div>
              </div>

              {/* ④ B2B 단체 연회·세미나 대관 효과 */}
              <div className="rounded-xl bg-[#F8F7F3] border border-[#1B382E]/10 p-3.5 space-y-1">
                <div className="text-xs font-bold text-[#5A6B63]">④ B2B 단체 연회 · 세미나 대관</div>
                <div
                  className={`text-lg font-black ${
                    Number(formula?.banquetBaseEffectAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {fmtSignedInt(formula?.banquetBaseEffectAmount, '원')}
                </div>
                <div className="text-[11px] text-[#5A6B63] pt-1 border-t border-[#1B382E]/10 leading-snug">
                  기업 세미나·워크샵 및 단체 연회 대관 행사 매출 순증감
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          섹션 3. 본부별 증가 ▲ vs 감소 ▼ 상세 분해 (품목축 vs 채널축 분리)
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 좌측: ▲ 매출 증가 본부 */}
        <div className="rounded-2xl bg-emerald-50/50 border-2 border-emerald-200 p-4 md:p-5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2.5">
            <div className="text-sm md:text-base font-black text-emerald-900 flex items-center gap-1.5">
              <TrendingUp size={18} className="text-emerald-700" />
              <span>▲ 매출 증가 본부 ({upSegments.length}곳)</span>
            </div>
            <span className="text-[11px] font-bold text-emerald-800">
              품목축(수익원) · 채널축(유입경로) 분리
            </span>
          </div>

          {upSegments.length > 0 ? (
            <div className="space-y-3">
              {upSegments.map((row: any, idx: number) => renderSegmentCard(row, idx))}
            </div>
          ) : (
            <div className="bg-white rounded-xl p-4 border border-emerald-200 text-xs text-[#5A6B63]">
              해당 기간 매출이 순증가한 본부가 없습니다.
            </div>
          )}
        </div>

        {/* 우측: ▼ 매출 감소·이탈 본부 */}
        <div className="rounded-2xl bg-rose-50/50 border-2 border-rose-200 p-4 md:p-5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-rose-200/80 pb-2.5">
            <div className="text-sm md:text-base font-black text-rose-900 flex items-center gap-1.5">
              <TrendingDown size={18} className="text-rose-600" />
              <span>▼ 매출 감소 · 이탈 본부 ({downSegments.length}곳)</span>
            </div>
            <span className="text-[11px] font-bold text-rose-800">
              품목축(수익원) · 채널축(유입경로) 분리
            </span>
          </div>

          {downSegments.length > 0 ? (
            <div className="space-y-3">
              {downSegments.map((row: any, idx: number) => renderSegmentCard(row, idx))}
            </div>
          ) : (
            <div className="bg-white rounded-xl p-4 border border-rose-200 text-xs text-[#5A6B63]">
              해당 기간 매출이 순감소한 본부가 없습니다.
            </div>
          )}

          {/* 단지 외부 유출(외출·미숙박) 핵심 요약 */}
          <div className="bg-white rounded-xl p-3.5 border border-rose-200 space-y-1.5 text-xs">
            <div className="font-extrabold text-rose-900">
              [단지 외부 소비 유출 및 미숙박 이탈 실측]
            </div>
            <div className="text-[#1B382E] leading-relaxed">
              • <strong>숙박차량 외부 식당·마트 외출</strong>:{' '}
              {fmtInt(fnbDetail?.lyStayOutingCount ?? parkingBehavior?.lyStayOutingCount)}회 ➔{' '}
              <strong className="text-rose-600">
                {fmtInt(fnbDetail?.tyStayOutingCount ?? parkingBehavior?.tyStayOutingCount)}회
              </strong>{' '}
              (외출률 {fmtPctOne(fnbDetail?.tyStayOutingRatePct ?? parkingBehavior?.tyStayOutingRatePct)}, 순수 상관계수{' '}
              <strong>r = {fmtText(pearsonCorr?.rStayOutingVsEveningPosRev)}</strong>)
            </div>
            <div className="text-[#1B382E] leading-relaxed">
              • <strong>진성타겟 골퍼 콘도 미숙박 귀가</strong>: 숙박 가능 골퍼{' '}
              {fmtInt(compMarket?.unconvertedInternalStayDemand?.coreStayConversionTargetTeams)}팀 중{' '}
              <strong className="text-rose-600">
                {fmtInt(compMarket?.unconvertedInternalStayDemand?.coreStayConversionNonStayTeams)}팀 미숙박 이탈
              </strong>{' '}
              (콘도 미판매 잔여 {fmtInt(condoDetail?.tyUnsoldPhysicalKeys)}키)
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          섹션 4. 시간대별 식음(POS) 고객 동선 & 본부별 즉시 실행 처방
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* 좌측 7컬럼: 시간대별 식음(POS) 고객 동선 */}
        {timeOfDayLinkages && (
          <div className="lg:col-span-7 bg-white rounded-2xl border border-[#1B382E]/15 shadow-xs p-5 space-y-3">
            <div className="flex items-center gap-2 border-b border-[#1B382E]/10 pb-2.5">
              <Utensils size={16} className="text-[#284F42]" />
              <h2 className="text-sm md:text-base font-black text-[#1B382E]">
                시간대별 직영 식음(POS) 매출 비중 및 고객 동선 인과
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {[
                { title: '조식 (06~10시)', node: timeOfDayLinkages?.morning06To10 },
                { title: '중식·오후 (11~17시)', node: timeOfDayLinkages?.lunchAndAfternoon11To17 },
                { title: '석식 (18시~)', node: timeOfDayLinkages?.evening18Plus }
              ].map((slot, sIdx) => (
                <div key={sIdx} className="rounded-xl bg-[#F8F7F3] p-3.5 border border-[#1B382E]/10 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <strong className="text-[#1B382E] font-black">{slot.title}</strong>
                    <span className="px-2 py-0.5 rounded bg-[#E8F2EE] text-[#1E523F] text-[11px] font-extrabold">
                      비중 {fmtPctOne(slot.node?.sharePct)}
                    </span>
                  </div>
                  <div className="text-base font-black text-[#284F42]">
                    {fmtInt(slot.node?.tyRevenue)}원
                  </div>
                  <p className="text-[11px] text-[#4A5D54] leading-relaxed pt-1 border-t border-[#1B382E]/10">
                    {fmtText(slot.node?.causalDrivers)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 우측 5컬럼: 본부별 즉시 실행 처방 (4대 실무 액션) */}
        {immediateActionItems.length > 0 && (
          <div className="lg:col-span-5 bg-white rounded-2xl border-2 border-[#284F42]/30 shadow-xs p-5 space-y-3">
            <div className="flex items-center gap-2 border-b border-[#1B382E]/10 pb-2.5">
              <CheckCircle2 size={16} className="text-[#1E523F]" />
              <h2 className="text-sm md:text-base font-black text-[#1E523F]">
                본부별 즉시 실행 처방 (4대 실무 액션)
              </h2>
            </div>
            <ul className="space-y-2 text-xs text-[#1B382E] leading-relaxed">
              {immediateActionItems.map((action, aIdx) => {
                const { tag, body } = splitLeadingTag(action);
                return (
                  <li
                    key={aIdx}
                    className="rounded-xl bg-[#F8F7F3] p-3 border border-[#284F42]/15 space-y-1"
                  >
                    {tag && (
                      <span className="inline-block px-2 py-0.5 rounded bg-[#284F42] text-white text-[11px] font-extrabold mr-1.5">
                        {tag}
                      </span>
                    )}
                    <span>{body}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* =====================================================================
          섹션 5. 클릭 시 펼쳐보는 심층 데이터 레퍼런스 (단체 세그먼트 표 · 대관 Top 3 · 운영/정산 지표)
         ===================================================================== */}
      <div className="bg-white rounded-2xl border border-[#1B382E]/15 shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setShowDeepReference((prev) => !prev)}
          className="w-full flex items-center justify-between p-4 md:p-5 bg-white hover:bg-[#F8F7F3] transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-2">
            <Layers size={17} className="text-[#284F42]" />
            <div>
              <span className="text-sm md:text-base font-black text-[#1B382E]">
                단체 세그먼트별 소비 명세 · 주요 대관 Top 3 · 6대 운영/정산 무결성 지표
              </span>
              <span className="ml-2 text-xs text-[#6C7A73] font-semibold">
                (클릭하여 상세 표 {showDeepReference ? '접기' : '펼쳐보기'})
              </span>
            </div>
          </div>
          {showDeepReference ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {showDeepReference && (
          <div className="p-5 pt-0 border-t border-[#1B382E]/10 space-y-5 mt-4">
            {/* 1) B2B 단체 세그먼트별 식음 vs 레저 소비 명세 */}
            {groupSegmentBreakdown.length > 0 && (
              <div className="space-y-2.5">
                <div className="text-xs md:text-sm font-black text-[#284F42]">
                  ① 단체 고객 유형별 식당(F&B) · 레저 이용 금액 비교
                </div>
                <div className="overflow-x-auto rounded-xl border border-[#1B382E]/15">
                  <table className="w-full text-xs md:text-[13px] text-left border-collapse">
                    <thead>
                      <tr className="bg-[#284F42] text-white font-bold">
                        <th className="py-2.5 px-3.5">단체 고객 유형</th>
                        <th className="py-2.5 px-3.5 text-right">당기 식당(F&B)</th>
                        <th className="py-2.5 px-3.5 text-right">당기 레저</th>
                        <th className="py-2.5 px-3.5 text-right">당기 합계</th>
                        <th className="py-2.5 px-3.5 text-right">비교기 대비 증감</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1B382E]/10 bg-white">
                      {groupSegmentBreakdown.map((seg: any, sIdx: number) => {
                        const sNeg = Number(seg?.diffRev) < 0;
                        return (
                          <tr key={seg?.segmentCode || sIdx} className="hover:bg-[#F4F3EE]/50">
                            <td className="py-2.5 px-3.5 font-black text-[#1B382E]">{fmtText(seg?.segmentLabel)}</td>
                            <td className="py-2.5 px-3.5 text-right font-semibold">{fmtInt(seg?.tyFnbRev)}원</td>
                            <td className="py-2.5 px-3.5 text-right font-semibold">{fmtInt(seg?.tyLeisureRev)}원</td>
                            <td className="py-2.5 px-3.5 text-right font-black text-[#1B382E]">{fmtInt(seg?.tyTotalRev)}원</td>
                            <td className={`py-2.5 px-3.5 text-right font-black ${sNeg ? 'text-rose-600' : 'text-emerald-700'}`}>
                              {fmtSignedInt(seg?.diffRev, '원')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {banquetTopEvents && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                    <div className="rounded-xl bg-[#F4F3EE]/60 border border-[#1B382E]/10 p-3.5">
                      <div className="font-black text-[#1B382E] mb-1">당기 주요 대관 · 세미나 행사 Top 3</div>
                      <div className="text-xs text-[#4A5D54] leading-relaxed">
                        {Array.isArray(banquetTopEvents?.tyEvents) && banquetTopEvents.tyEvents.length > 0
                          ? banquetTopEvents.tyEvents.join(' · ')
                          : '-'}
                      </div>
                    </div>
                    <div className="rounded-xl bg-[#F4F3EE]/60 border border-[#1B382E]/10 p-3.5">
                      <div className="font-black text-[#1B382E] mb-1">비교기 주요 대관 · 세미나 행사 Top 3</div>
                      <div className="text-xs text-[#4A5D54] leading-relaxed">
                        {Array.isArray(banquetTopEvents?.lyEvents) && banquetTopEvents.lyEvents.length > 0
                          ? banquetTopEvents.lyEvents.join(' · ')
                          : '-'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2) 6대 외부 환경 및 운영·정산 무결성 요약 카드 */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs md:text-sm font-black text-[#284F42]">
                <Info size={15} />
                <span>② 외부 환경 · 콘도 열쇠 · 정산 무결성 6대 운영 지표</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                {/* 날씨 / 공휴일 */}
                <div className="rounded-xl bg-[#F4F3EE]/60 border border-[#1B382E]/10 p-3.5 space-y-1">
                  <div className="text-[11px] font-bold text-[#6C7A73]">날씨 / 공휴일 요약</div>
                  <div className="font-bold text-[#1B382E] leading-relaxed">
                    {isMultiDayPeriod ? (
                      <>
                        우천 {fmtInt(extWeather?.lyRainyDays)}➔{fmtInt(extWeather?.tyRainyDays)}일 (휴일우천{' '}
                        {fmtInt(extWeather?.lyRedDayRainyDays)}➔{fmtInt(extWeather?.tyRedDayRainyDays)}일) · 공휴일{' '}
                        {fmtInt(calFactor?.lyHolidayDays)}➔{fmtInt(calFactor?.tyHolidayDays)}일
                      </>
                    ) : (
                      <>
                        {fmtText(extWeather?.tyWeatherDesc)} {fmtText(extWeather?.tyTempMax)}°C (강수{' '}
                        {fmtText(extWeather?.tyRainfallMm)}mm) · 공휴일 {fmtInt(calFactor?.tyHolidayDays)}일
                      </>
                    )}
                  </div>
                </div>

                {/* 경쟁사 만실 여부 */}
                <div className="rounded-xl bg-[#F4F3EE]/60 border border-[#1B382E]/10 p-3.5 space-y-1">
                  <div className="text-[11px] font-bold text-[#6C7A73]">경쟁사 만실 여부</div>
                  <div className="font-bold text-[#1B382E]">
                    충청 4사 만실 {fmtInt(compMarket?.soldOutResortCount)}/{fmtInt(compMarket?.monitoredResortCount)}곳 · 평균 최저가{' '}
                    {fmtInt(compMarket?.competitorAvgMinPrice)}원 (
                    {fmtPctOne(
                      compMarket?.competitorPriceSurgeRatioPct ?? compMarket?.competitorSameClassSurgeRatioPct,
                      true
                    )}
                    )
                  </div>
                </div>

                {/* 콘도 열쇠 가동·수익 */}
                <div className="rounded-xl bg-[#F4F3EE]/60 border border-[#1B382E]/10 p-3.5 space-y-1">
                  <div className="text-[11px] font-bold text-[#6C7A73]">콘도 열쇠 가동 · 수익 (Key Yield)</div>
                  <div className="font-bold text-[#1B382E]">
                    물리열쇠 {fmtInt(condoDetail?.tyOccupiedPhysicalKeys)}/
                    {fmtInt(condoDetail?.physicalKeyCapacity ?? compMarket?.belleforetPhysicalKeyCapacity)}개 (
                    {fmtPctOne(condoDetail?.tyPhysicalKeyOccPct)}) · Key Yield {fmtInt(condoDetail?.tyKeyYield)}원 (
                    {fmtPct(condoDetail?.keyYieldGrowthPct)})
                  </div>
                </div>

                {/* 골퍼 미숙박 & 나들이 장기체류 */}
                <div className="rounded-xl bg-[#F4F3EE]/60 border border-[#1B382E]/10 p-3.5 space-y-1">
                  <div className="text-[11px] font-bold text-[#6C7A73]">골퍼 미숙박 & 장기체류 차량</div>
                  <div className="font-bold text-[#1B382E]">
                    진성타겟 {fmtInt(compMarket?.unconvertedInternalStayDemand?.coreStayConversionTargetTeams)}팀 중{' '}
                    <span className="text-rose-600">
                      {fmtInt(compMarket?.unconvertedInternalStayDemand?.coreStayConversionNonStayTeams)}팀 미숙박
                    </span>{' '}
                    · 4h+ 나들이 차량{' '}
                    {fmtInt(
                      compMarket?.unconvertedInternalStayDemand?.longDwell4hPlusWalkinCars ??
                        parkingBehavior?.tyWalkinLongDwell4hPlusCars
                    )}
                    대
                  </div>
                </div>

                {/* 투숙객 외부 외출 */}
                <div className="rounded-xl bg-[#F4F3EE]/60 border border-[#1B382E]/10 p-3.5 space-y-1">
                  <div className="text-[11px] font-bold text-[#6C7A73]">투숙객 외부 외출</div>
                  <div className="font-bold text-[#1B382E]">
                    외출 {fmtInt(fnbDetail?.tyStayOutingCount ?? parkingBehavior?.tyStayOutingCount)}회 (외출률{' '}
                    <span className="text-rose-600">
                      {fmtPctOne(fnbDetail?.tyStayOutingRatePct ?? parkingBehavior?.tyStayOutingRatePct)}
                    </span>
                    , 평균 {fmtInt(fnbDetail?.tyStayAvgOutingMinutes ?? parkingBehavior?.tyStayAvgOutingMinutes)}분)
                  </div>
                </div>

                {/* 정산 무결성 / 후정산 */}
                <div className="rounded-xl bg-[#F4F3EE]/60 border border-[#1B382E]/10 p-3.5 space-y-1">
                  <div className="text-[11px] font-bold text-[#6C7A73]">정산 무결성 / 후정산</div>
                  <div className="font-bold text-[#1B382E]">
                    정산 오차{' '}
                    {fmtInt(
                      integrityFactor?.reconciliationDeltaWon ??
                        integrityFactor?.gatekeeperDeltaWon ??
                        integrityFactor?.gatekeeperDeltaAmount
                    )}
                    원 (미분류 {fmtInt(integrityFactor?.unmappedCandidateCount)}건) · 후정산 대기{' '}
                    {fmtInt(integrityFactor?.cityLedgerPendingCount)}건
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
