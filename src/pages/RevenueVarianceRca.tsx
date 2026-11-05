import { useState, useEffect } from 'react';
import { useDate } from '../contexts/DateContext';
import { secureFetcher } from '../lib/secureFetcher';
import GlobalDatePicker from '../components/GlobalDatePicker';
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Target,
  FileCheck2,
  Info,
  Ticket,
  Utensils,
  Flag,
  Hotel,
  Calendar,
  CloudRain
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

  return (
    <div className="min-h-screen bg-[#F4F3EE] text-[#1B382E] p-4 md:p-6 lg:p-8 space-y-5 max-w-6xl mx-auto">
      {/* 상단 날짜 및 비교 기준 선택 */}
      <div className="bg-white rounded-2xl border border-[#1B382E]/10 shadow-xs p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-[#1B382E] tracking-tight">
              매출 증감 원인 요약
            </h1>
            {period && (
              <p className="text-xs md:text-sm text-[#6C7A73] mt-1">
                조회일: <strong className="text-[#1B382E]">{fmtText(period?.tyStartDate)} ~ {fmtText(period?.tyEndDate)}</strong>
                {' '}({fmtInt(period?.dayCount)}일) vs 비교일:{' '}
                <strong className="text-[#284F42]">{fmtText(period?.lyStartDate)} ~ {fmtText(period?.lyEndDate)}</strong>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <GlobalDatePicker />
            <div className="flex items-center bg-[#F4F3EE] p-1 rounded-xl">
              {[
                { code: 'YOY_DOW' as const, label: '전년 동요일' },
                { code: 'YOY_DATE' as const, label: isMultiDay ? '전년 동기간 (월/일 기준)' : '전년 같은날짜' },
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
          1. 매출의 증감 이유는 딱 무엇인가? (결론 — 인과관계 Why 중심)
         ===================================================================== */}
      <div className="bg-white rounded-2xl border-2 border-[#284F42] shadow-xs p-5 md:p-6 space-y-6">
        {(() => {
          const upSegments = segmentSummaryRows.filter((r: any) => Number(r?.diffAmount) > 0);
          const downSegments = segmentSummaryRows.filter((r: any) => Number(r?.diffAmount) < 0);

          // 각 본부별 [품목·매장축] vs [예약채널·고객유형축] 분리 렌더러 (품목축과 채널축 중복 합산 착시 원천 차단)
          const renderSegmentDualAxisCard = (row: any, idx: number) => {
            const segCode = String(row?.segmentCode || '');
            const neg = Number(row?.diffAmount) < 0;

            // 축 1: 품목·매장별 증감 (수익원 분해)
            let productAxisItems: Array<{ label: string; sub?: string; diff: unknown; pct?: unknown }> = [];
            // 축 2: 예약채널·고객유형별 증감 (유입경로 분해)
            let channelAxisItems: Array<{ label: string; sub?: string; diff: unknown; pct?: unknown }> = [];

            if (segCode === 'CONDO') {
              productAxisItems = pyungMix.map((p: any) => ({
                label: fmtText(p?.pyungLabel || p?.pyungCode),
                sub: `${fmtInt(p?.lyRooms)}➔${fmtInt(p?.tyRooms)}실 (${fmtSignedInt(p?.diffRooms, '실')})`,
                diff: p?.diffRevenue
              }));
              channelAxisItems = channelMix.map((ch: any) => ({
                label: fmtText(ch?.channelLabel),
                sub: `${fmtInt(ch?.lyRooms)}➔${fmtInt(ch?.tyRooms)}실 (ADR ${fmtInt(ch?.tyAdr)}원)`,
                diff: ch?.diffRevenue
              }));
            } else if (segCode === 'LEISURE') {
              productAxisItems = venueVariances.slice(0, 6).map((v: any) => ({
                label: fmtText(v?.venueName),
                sub: `방문객 ${fmtInt(v?.lyVisitors)}➔${fmtInt(v?.tyVisitors)}명`,
                diff: v?.diffAmount,
                pct: v?.growthPct
              }));
              channelAxisItems = groupSegmentBreakdown
                .filter((g: any) => Number(g?.tyLeisureRev) > 0 || Number(g?.leisureDiffRev) !== 0)
                .map((g: any) => ({
                  label: `${fmtText(g?.segmentLabel)} (레저 소비)`,
                  sub: `당기 레저 ${fmtInt(g?.tyLeisureRev)}원`,
                  diff: g?.leisureDiffRev ?? g?.diffRev
                }));
            } else if (segCode === 'FNB_BANQUET') {
              productAxisItems = [
                {
                  label: '직영 식당 일반 매출',
                  sub: `영수증 ${fmtInt(fnbDetail?.lyReceiptCount)}➔${fmtInt(fnbDetail?.tyReceiptCount)}건 · 객단가 ${fmtInt(fnbDetail?.lyAvgCheckPerReceipt)}➔${fmtInt(fnbDetail?.tyAvgCheckPerReceipt)}원`,
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
                  label: `${fmtText(g?.segmentLabel)} (식음 소비)`,
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
                    label: '프로샵 · 스타트하우스 부대매출',
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
                key={segCode || idx}
                className="bg-white rounded-xl p-4 border border-[#1B382E]/15 shadow-2xs space-y-3"
              >
                {/* 1) 본부 그룹 헤더 */}
                <div className="flex flex-wrap items-baseline justify-between gap-2 pb-2.5 border-b border-[#1B382E]/10">
                  <div>
                    <span className="text-sm md:text-base font-black text-[#1B382E]">
                      {fmtText(row?.segmentName)}
                    </span>
                    <span
                      className={`ml-2 text-sm md:text-base font-black ${
                        neg ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      {fmtSignedInt(row?.diffAmount, '원')} ({fmtPct(row?.growthPct)})
                    </span>
                  </div>
                  <div className="text-xs font-bold text-[#5A6B63]">
                    {row?.visitorDiff !== null && row?.visitorDiff !== undefined ? (
                      <>
                        방문객{' '}
                        <strong className={Number(row?.visitorDiff) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                          {fmtSignedInt(row?.visitorDiff, '명')}({fmtPct(row?.visitorGrowthPct)})
                        </strong>{' '}
                        · 1인당 단가{' '}
                        <strong
                          className={Number(row?.spendPerHeadGrowthPct) < 0 ? 'text-rose-600' : 'text-emerald-700'}
                        >
                          {fmtPct(row?.spendPerHeadGrowthPct)}
                        </strong>
                      </>
                    ) : (
                      <>
                        비교기 {fmtInt(row?.lyRevenue)}원 ➔ 당기 {fmtInt(row?.tyRevenue)}원
                      </>
                    )}
                  </div>
                </div>

                {/* 2) [품목·매장별 증감] vs [예약채널·고객유형별 증감] 2축 분리 */}
                <div className="grid grid-cols-1 gap-2.5 text-xs">
                  {productAxisItems.length > 0 && (
                    <div className="rounded-lg bg-[#F8F7F3] p-3 border border-[#1B382E]/10 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#284F42] text-white text-[11px] font-extrabold">
                          [품목 · 매장별 증감] (수익원 분해)
                        </span>
                        <span className="text-[11px] text-[#6C7A73] font-semibold">품목 합계 = 본부 증감액</span>
                      </div>
                      <div className="divide-y divide-[#1B382E]/5 pt-1">
                        {productAxisItems.map((pItem, pIdx) => {
                          const pNeg = Number(pItem.diff) < 0;
                          return (
                            <div key={pIdx} className="flex items-center justify-between py-1 gap-2">
                              <div>
                                <strong className="text-[#1B382E]">{pItem.label}</strong>
                                {pItem.sub && <span className="text-[#5A6B63] ml-1.5 text-[11px]">({pItem.sub})</span>}
                              </div>
                              <strong className={`shrink-0 ${pNeg ? 'text-rose-600' : 'text-emerald-700'}`}>
                                {fmtSignedInt(pItem.diff, '원')}
                                {pItem.pct !== undefined && pItem.pct !== null ? ` (${fmtPct(pItem.pct)})` : ''}
                              </strong>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {channelAxisItems.length > 0 && (
                    <div className="rounded-lg bg-[#F4F3EE]/60 p-3 border border-[#B59269]/30 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#8C6D46] text-white text-[11px] font-extrabold">
                          [예약채널 · 고객유형별 증감] (유입경로 분해)
                        </span>
                        <span className="text-[11px] text-[#8C6D46] font-semibold">※ 위 품목축과 별도 차원(중복 합산 금지)</span>
                      </div>
                      <div className="divide-y divide-[#1B382E]/5 pt-1">
                        {channelAxisItems.map((cItem, cIdx) => {
                          const cNeg = Number(cItem.diff) < 0;
                          return (
                            <div key={cIdx} className="flex items-center justify-between py-1 gap-2">
                              <div>
                                <strong className="text-[#1B382E]">{cItem.label}</strong>
                                {cItem.sub && <span className="text-[#5A6B63] ml-1.5 text-[11px]">({cItem.sub})</span>}
                              </div>
                              <strong className={`shrink-0 ${cNeg ? 'text-rose-600' : 'text-emerald-700'}`}>
                                {fmtSignedInt(cItem.diff, '원')}
                              </strong>
                            </div>
                          );
                        })}
                      </div>
                      {segCode === 'GOLF' && golfDetail && (
                        <div className="pt-1.5 border-t border-[#1B382E]/10 text-[11px] text-[#4A5D54] flex flex-wrap items-center justify-between gap-2">
                          <span>
                            회원 vs 비회원: <strong>회원 {fmtInt(golfDetail?.lyMemberPlayers)}➔{fmtInt(golfDetail?.tyMemberPlayers)}명</strong> ·{' '}
                            <strong>비회원 {fmtInt(golfDetail?.lyNonMemberPlayers)}➔{fmtInt(golfDetail?.tyNonMemberPlayers)}명</strong>
                          </span>
                          {golfVisitorBehavior && (
                            <span>
                              위임·연단체 예약:{' '}
                              <strong>
                                {fmtInt(golfVisitorBehavior?.lyDelegatedBookings ?? golfVisitorBehavior?.lyDelegatedGroupBookings)}➔
                                {fmtInt(golfVisitorBehavior?.tyDelegatedBookings ?? golfVisitorBehavior?.tyDelegatedGroupBookings)}건
                              </strong>{' '}
                              (티오프 평균 {fmtInt(golfVisitorBehavior?.tyAvgPreTeeArrivalMinutes)}분 전 도착)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 3) 본부 카드 하단 백엔드 완제품 원인 진단 한 줄 (isolationDiagnosis) 상시 표출 */}
                {row?.isolationDiagnosis && (
                  <div className="rounded-lg bg-[#E8F2EE]/60 border border-[#284F42]/20 px-3 py-2 text-xs text-[#1B382E] leading-relaxed">
                    <span className="font-extrabold text-[#1E523F] mr-1.5">[원인 진단 요약]</span>
                    <span>{fmtText(row?.isolationDiagnosis)}</span>
                  </div>
                )}
              </div>
            );
          };

          return (
            <>
              {/* [개편 1] 상단 메인 결론 타이틀 아래에 primaryDriverLabel을 핵심 원인 요약 배지/박스로 즉시 노출 & executiveSummary 기본 펼침 */}
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 border-b border-[#1B382E]/10 pb-5">
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#284F42] text-white text-xs font-bold">
                      <Target size={14} />
                      1. 매출 증감 이유 (핵심 결론)
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-[#F4F3EE] border border-[#1B382E]/15 text-xs font-extrabold text-[#284F42]">
                      24개 정규 마트 교차 검증 · 인과관계(Why) 종합 진단
                    </span>
                  </div>

                  {/* primaryDriverLabel 핵심 원인 요약 배지/박스 즉시 노출 */}
                  <div className="rounded-2xl bg-[#F8F7F3] border-2 border-[#284F42]/30 border-l-4 border-l-[#284F42] p-4 space-y-2">
                    <div className="text-xs font-extrabold text-[#284F42]">
                      최우선 핵심 증감 원인 (백엔드 종합 인과 진단)
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {splitTopLevelClauses(formula?.primaryDriverLabel).map((clause, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl bg-white px-3.5 py-2 border border-[#1B382E]/15 text-xs md:text-sm font-bold text-[#1B382E] leading-relaxed shadow-2xs"
                        >
                          <span className="text-[#284F42] font-black mr-1.5">#{idx + 1}</span>
                          {clause}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* structuredReport.executiveSummary 3개 핵심 문단 상단 요약 카드 안에 기본 노출 (Expanded) */}
                  {executiveSummaryBullets.length > 0 && (
                    <div className="rounded-xl bg-[#F4F3EE]/70 border border-[#1B382E]/10 p-4 space-y-2">
                      <div className="text-xs font-extrabold text-[#1B382E]">
                        경영진 3대 핵심 인과 요약 (`executiveSummary` — 기본 펼침)
                      </div>
                      <ul className="space-y-1.5 text-xs md:text-[13px] text-[#1B382E]/95 leading-relaxed">
                        {executiveSummaryBullets.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="font-black text-[#284F42] shrink-0">{idx + 1}.</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2.5 pt-0.5 text-sm">
                    <div className="rounded-xl bg-[#F4F3EE]/80 border border-[#1B382E]/10 px-3.5 py-2">
                      <span className="text-[#5A6B63] font-medium">전체 방문객 수: </span>
                      <strong className="text-[#1B382E] font-bold">
                        {fmtInt(formula?.lyTotalVisitors)}명 ➔ {fmtInt(formula?.tyTotalVisitors)}명
                      </strong>{' '}
                      (
                      <strong className={Number(formula?.visitorDiffCount) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                        {fmtSignedInt(formula?.visitorDiffCount, '명')} / {fmtPct(formula?.visitorGrowthPct)}
                      </strong>
                      )
                    </div>
                    <div className="rounded-xl bg-[#F4F3EE]/80 border border-[#1B382E]/10 px-3.5 py-2">
                      <span className="text-[#5A6B63] font-medium">손님 1인당 평균 지출: </span>
                      <strong className="text-[#1B382E] font-bold">
                        {fmtInt(formula?.lySpendPerHead)}원 ➔ {fmtInt(formula?.tySpendPerHead)}원
                      </strong>{' '}
                      (
                      <strong className={Number(formula?.spendPerHeadDiff) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                        {fmtSignedInt(formula?.spendPerHeadDiff, '원')} / {fmtPct(formula?.spendPerHeadGrowthPct)}
                      </strong>
                      )
                    </div>
                  </div>
                </div>

                <div className="bg-[#F4F3EE] rounded-2xl px-5 py-4 text-right shrink-0 border border-[#1B382E]/10">
                  <div className="text-xs md:text-sm text-[#5A6B63] font-semibold">
                    조회기간 매출 {fmtInt(formula?.tyTotalRevenue)}원 (비교기 {fmtInt(formula?.lyTotalRevenue)}원)
                  </div>
                  <div
                    className={`text-2xl md:text-3xl font-black mt-1 flex items-center justify-end gap-2 ${
                      isNegative ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {isNegative ? <TrendingDown size={26} /> : <TrendingUp size={26} />}
                    <span>
                      {fmtSignedInt(formula?.revenueDiffAmount, '원')} ({fmtPct(formula?.revenueGrowthPct)})
                    </span>
                  </div>
                  {calFactor && (
                    <div className="text-xs font-bold text-[#8C6D46] mt-1.5">
                      달력 보정 실질 영업증감:{' '}
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

              {/* [개편 4] [달력 공휴일 차이 보정] 옆에 [기상(주말·휴일 vs 평일 우천) 및 요일 통제(FWL) 순수 상관관계(r)] 패널 나란히 배치 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 좌측 패널: [달력 공휴일 차이 보정] */}
                {calFactor && (
                  <div className="rounded-2xl bg-[#F4F3EE]/80 border border-[#B59269]/40 p-4 space-y-2.5 text-xs md:text-[13px]">
                    <div className="flex items-center justify-between border-b border-[#B59269]/30 pb-2">
                      <span className="font-black text-sm text-[#8C6D46] flex items-center gap-1.5">
                        <Calendar size={16} />
                        [달력 공휴일 · 주말 일수 차이 보정]
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white border border-[#B59269]/40 text-[11px] font-bold text-[#8C6D46]">
                        {fmtText(calFactor?.operatingRegimeLabel || calFactor?.operatingRegimeCode)}
                      </span>
                    </div>
                    <div className="space-y-1.5 leading-relaxed">
                      <div className="flex items-center justify-between">
                        <span className="text-[#5A6B63] font-semibold">법정공휴일 / 주말포함 총 휴일</span>
                        <strong className="text-[#1B382E]">
                          공휴일 {fmtInt(calFactor?.lyHolidayDays)}➔{fmtInt(calFactor?.tyHolidayDays)}일 (
                          <span className={Number(calFactor?.holidayDiffDays) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                            {fmtSignedInt(calFactor?.holidayDiffDays, '일')}
                          </span>
                          ) · 총 휴일 {fmtInt(calFactor?.lyRedDays)}➔{fmtInt(calFactor?.tyRedDays)}일 (
                          {fmtSignedInt(calFactor?.redDayDiffDays, '일')})
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#5A6B63] font-semibold">주말·공휴일 vs 평일 일평균 매출</span>
                        <strong className="text-[#1B382E]">
                          휴일 {fmtInt(calFactor?.tyRedDayAvgRevenue)}원 ({fmtPct(calFactor?.redDayDailyAvgGrowthPct)}) / 평일{' '}
                          {fmtInt(calFactor?.tyWeekdayAvgRevenue)}원 ({fmtPct(calFactor?.weekdayDailyAvgGrowthPct)})
                        </strong>
                      </div>
                      <div className="rounded-xl bg-white p-2.5 border border-[#B59269]/30 flex flex-wrap items-center justify-between gap-2 mt-1">
                        <span>
                          달력 휴일수 차이 효과:{' '}
                          <strong
                            className={
                              Number(calFactor?.calendarShiftEffectAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'
                            }
                          >
                            {fmtSignedInt(calFactor?.calendarShiftEffectAmount, '원')}
                          </strong>
                        </span>
                        <span>
                          ➔ 공휴일 차이 보정 실질 증감:{' '}
                          <strong
                            className={
                              Number(calFactor?.calendarAdjustedRevenueDiff) < 0 ? 'text-rose-600' : 'text-emerald-700'
                            }
                          >
                            {fmtSignedInt(calFactor?.calendarAdjustedRevenueDiff, '원')}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 우측 패널: [기상 여건 및 요일 통제(FWL) 순수 상관성] */}
                {(extWeather || pearsonCorr) && (
                  <div className="rounded-2xl bg-[#E8F2EE]/60 border border-[#284F42]/30 p-4 space-y-2.5 text-xs md:text-[13px]">
                    <div className="flex items-center justify-between border-b border-[#284F42]/20 pb-2">
                      <span className="font-black text-sm text-[#1E523F] flex items-center gap-1.5">
                        <CloudRain size={16} />
                        [기상 여건 및 요일 통제(FWL) 순수 상관성]
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-extrabold ${
                          extWeather?.outdoorWeatherImpactGrade === 'POSITIVE'
                            ? 'bg-emerald-600 text-white'
                            : extWeather?.outdoorWeatherImpactGrade === 'NEGATIVE'
                            ? 'bg-rose-600 text-white'
                            : 'bg-white text-[#284F42] border border-[#284F42]/30'
                        }`}
                      >
                        기상 영향: {fmtText(extWeather?.outdoorWeatherImpactGrade)}
                      </span>
                    </div>

                    {extWeather && (
                      <div className="space-y-1 leading-relaxed">
                        <div className="flex items-center justify-between">
                          <span className="text-[#4A5D54] font-semibold">총 우천일 (누적 강수량)</span>
                          <strong className="text-[#1B382E]">
                            {fmtInt(extWeather?.lyRainyDays)}일({fmtText(extWeather?.lyRainfallMm)}mm) ➔{' '}
                            {fmtInt(extWeather?.tyRainyDays)}일({fmtText(extWeather?.tyRainfallMm)}mm) (
                            {fmtSignedInt(extWeather?.rainyDaysDiff, '일')})
                          </strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#4A5D54] font-semibold">주말·휴일 우천 vs 주중 평일 우천</span>
                          <strong className="text-[#1B382E]">
                            주말·휴일 {fmtInt(extWeather?.lyRedDayRainyDays)}➔{fmtInt(extWeather?.tyRedDayRainyDays)}일 (
                            {fmtSignedInt(extWeather?.redDayRainyDaysDiff, '일')}, {fmtText(extWeather?.tyRedDayAvgTempMax)}°C) / 평일{' '}
                            {fmtInt(extWeather?.lyWeekdayRainyDays)}➔{fmtInt(extWeather?.tyWeekdayRainyDays)}일 (
                            {fmtSignedInt(extWeather?.weekdayRainyDaysDiff, '일')}, {fmtText(extWeather?.tyWeekdayAvgTempMax)}°C)
                          </strong>
                        </div>
                      </div>
                    )}

                    {pearsonCorr && (
                      <div className="rounded-xl bg-white p-2.5 border border-[#284F42]/20 space-y-1 text-xs">
                        <div className="font-extrabold text-[#284F42] text-[11px]">
                          요일·계절 교란 제거 순수 상관계수 (`FWL` 편차 상관계수 & 주중/주말 층화)
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
                          <div>
                            • 강수 ↔ 골프매출:{' '}
                            <strong className="text-rose-600">r = {fmtText(pearsonCorr?.rRainVsGolfRev)}</strong>
                            {redDayBucket && (
                              <span className="text-[#5A6B63] text-[11px]">
                                {' '}
                                (휴일 r={fmtText(redDayBucket?.rRainVsGolfRev)} / 평일 r={fmtText(weekdayBucket?.rRainVsGolfRev)})
                              </span>
                            )}
                          </div>
                          <div>
                            • 투숙객 ↔ 직영식음:{' '}
                            <strong className="text-emerald-700">r = {fmtText(pearsonCorr?.rStayGuestsVsDirectFnbRev)}</strong>
                            {redDayBucket && (
                              <span className="text-[#5A6B63] text-[11px]">
                                {' '}
                                (휴일 r={fmtText(redDayBucket?.rStayGuestsVsDirectFnbRev)})
                              </span>
                            )}
                          </div>
                          <div>
                            • 4시간+ 나들이 ↔ 중식POS:{' '}
                            <strong className="text-emerald-700">r = {fmtText(pearsonCorr?.rWalkinLongDwellVsLunchPosRev)}</strong>
                            {redDayBucket && (
                              <span className="text-[#5A6B63] text-[11px]">
                                {' '}
                                (휴일 r={fmtText(redDayBucket?.rWalkinLongDwellVsLunchPosRev)})
                              </span>
                            )}
                          </div>
                          <div>
                            • 숙박외출 ↔ 석식POS:{' '}
                            <strong className="text-rose-600">r = {fmtText(pearsonCorr?.rStayOutingVsEveningPosRev)}</strong>
                            {rawCorr && (
                              <span className="text-[#5A6B63] text-[11px]">
                                {' '}
                                (단순왜곡 {fmtText(rawCorr?.rStayOutingVsEveningPosRev)} 교정)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* [개편 2] 좌·우 ▲ 증가 원인 / ▼ 감소·이탈 원인 박스의 '품목축 vs 채널축 중복 나열' 분리 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 좌측: ▲ 증가 원인 (성장 본부 그룹) */}
                <div className="rounded-2xl bg-emerald-50/50 border-2 border-emerald-200 p-4 md:p-5 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2.5">
                    <div className="text-sm md:text-base font-black text-emerald-900 flex items-center gap-1.5">
                      <TrendingUp size={18} className="text-emerald-700" />
                      <span>▲ 매출 증가 본부 및 원인 분해 (품목축 vs 채널축 분리)</span>
                    </div>
                    <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      성장 견인 본부 ({upSegments.length}곳)
                    </span>
                  </div>

                  {upSegments.length > 0 ? (
                    <div className="space-y-3">
                      {upSegments.map((row: any, idx: number) => renderSegmentDualAxisCard(row, idx))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl p-4 border border-emerald-200 text-xs text-[#5A6B63]">
                      해당 조회 기간 매출이 순증가한 사업부가 없습니다.
                    </div>
                  )}
                </div>

                {/* 우측: ▼ 감소·이탈 원인 (하락 본부 그룹 + 외부 이탈) */}
                <div className="rounded-2xl bg-rose-50/50 border-2 border-rose-200 p-4 md:p-5 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-rose-200/80 pb-2.5">
                    <div className="text-sm md:text-base font-black text-rose-900 flex items-center gap-1.5">
                      <TrendingDown size={18} className="text-rose-600" />
                      <span>▼ 매출 감소·이탈 본부 및 원인 분해 (품목축 vs 채널축 분리)</span>
                    </div>
                    <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                      하락·이탈 본부 ({downSegments.length}곳)
                    </span>
                  </div>

                  {downSegments.length > 0 ? (
                    <div className="space-y-3">
                      {downSegments.map((row: any, idx: number) => renderSegmentDualAxisCard(row, idx))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl p-4 border border-rose-200 text-xs text-[#5A6B63]">
                      해당 조회 기간 매출이 순감소한 사업부가 없습니다.
                    </div>
                  )}

                  {/* 단지 외부 유출(외출·미숙박) 및 경쟁사 시황 요약 카드 */}
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
                      • <strong>진성타겟 골퍼 콘도 미숙박 당일 귀가</strong>: 숙박 가능 골퍼{' '}
                      {fmtInt(compMarket?.unconvertedInternalStayDemand?.coreStayConversionTargetTeams)}팀 중{' '}
                      <strong className="text-rose-600">
                        {fmtInt(compMarket?.unconvertedInternalStayDemand?.coreStayConversionNonStayTeams)}팀 미숙박 이탈
                      </strong>{' '}
                      (콘도 미판매 잔여 {fmtInt(condoDetail?.tyUnsoldPhysicalKeys)}키)
                    </div>
                  </div>
                </div>
              </div>

              {/* [개편 3] 원인별 금액 카드의 '방문객 부풀림 착시(심슨의 역설)' 보정 표시 */}
              {formula && (
                <div className="rounded-2xl bg-[#FAF9F6] border border-[#1B382E]/15 p-4 md:p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="text-sm md:text-base font-extrabold text-[#1B382E]">
                      매출 증감액({fmtSignedInt(formula?.revenueDiffAmount, '원')})의 원인별 분해 (심슨의 역설 · 방문객 부풀림 착시 보정)
                    </div>
                    <span className="px-2.5 py-0.5 rounded bg-[#284F42] text-white text-xs font-bold shrink-0">
                      0-Variance 정합 분해
                    </span>
                  </div>

                  {/* simpsonParadoxNote 직결 안내 배너 */}
                  {formula?.simpsonParadoxNote && (
                    <div className="rounded-xl bg-amber-50/80 border border-amber-200 px-3.5 py-2.5 text-xs md:text-[13px] text-amber-950 font-medium leading-relaxed">
                      <strong className="font-extrabold text-amber-900 mr-1.5">[심슨의 역설 보정 안내]</strong>
                      {fmtText(formula?.simpsonParadoxNote)}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* 카드 1: 실질 방문객 증감 효과 (유입트랙 가중 · 볼륨 + 믹스 병기) */}
                    <div className="rounded-xl bg-white border-2 border-[#284F42]/30 p-3.5 space-y-1.5">
                      <div className="text-xs font-extrabold text-[#284F42]">
                        ① 실질 방문객 증감 효과 (유입트랙 가중)
                      </div>
                      <div className="text-base md:text-lg font-black text-emerald-700">
                        샤플리 볼륨 {fmtSignedInt(formula?.shapleyVolumeEffectAmount, '원')}
                      </div>
                      <div className="text-[11px] text-[#5A6B63] leading-relaxed pt-1 border-t border-[#1B382E]/10">
                        <div>
                          • 단순 총인원 효과:{' '}
                          <strong className="text-emerald-700">{fmtSignedInt(formula?.volumeEffectAmount, '원')}</strong>
                        </div>
                        <div>
                          • 저단가 나들이객 비중 확대 보정:{' '}
                          <strong className="text-rose-600">{fmtSignedInt(formula?.visitorMixEffectAmount, '원')}</strong>
                        </div>
                      </div>
                    </div>

                    {/* 카드 2: 3대 부문(객실·골프·레저) 순수 단가 효과 */}
                    <div className="rounded-xl bg-white border border-[#1B382E]/10 p-3.5 space-y-1.5">
                      <div className="text-xs font-bold text-[#5A6B63]">
                        ② 객실 · 골프 · 레저 순수 단가 효과
                      </div>
                      <div
                        className={`text-base md:text-lg font-black ${
                          Number(formula?.coreSegmentPurePriceEffectAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'
                        }`}
                      >
                        {fmtSignedInt(formula?.coreSegmentPurePriceEffectAmount, '원')}
                      </div>
                      <div className="text-[11px] text-[#5A6B63] pt-1 border-t border-[#1B382E]/10">
                        나들이객 비중 희석을 제거한 각 부문 내 순수 가격·상품단가 변동분
                      </div>
                    </div>

                    {/* 카드 3: 식당 1인당 식사비 (순수 식음 부착 효과) */}
                    <div className="rounded-xl bg-white border border-[#1B382E]/10 p-3.5 space-y-1.5">
                      <div className="text-xs font-bold text-[#5A6B63]">
                        ③ 식당(F&B) 1인당 식사비 부착 효과
                      </div>
                      <div
                        className={`text-base md:text-lg font-black ${
                          Number(formula?.pureFnbAttachEffectAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'
                        }`}
                      >
                        {fmtSignedInt(formula?.pureFnbAttachEffectAmount, '원')}
                      </div>
                      <div className="text-[11px] text-[#5A6B63] pt-1 border-t border-[#1B382E]/10">
                        리조트 방문객 1인당 직영 식당 소비액 변동 및 외부 외출 영향
                      </div>
                    </div>

                    {/* 카드 4: 단체 연회·대관 행사 기저 효과 */}
                    <div className="rounded-xl bg-white border border-[#1B382E]/10 p-3.5 space-y-1.5">
                      <div className="text-xs font-bold text-[#5A6B63]">
                        ④ B2B 단체 연회 · 세미나 대관 효과
                      </div>
                      <div
                        className={`text-base md:text-lg font-black ${
                          Number(formula?.banquetBaseEffectAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'
                        }`}
                      >
                        {fmtSignedInt(formula?.banquetBaseEffectAmount, '원')}
                      </div>
                      <div className="text-[11px] text-[#5A6B63] pt-1 border-t border-[#1B382E]/10">
                        기업 세미나·워크샵 및 단체 연회 대관 행사 매출 순증감분
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* [개편 5] 시간대별 POS 동선(조식/중식·오후/석식) 및 경영 액션 지침(immediateActionItems) 상단 직결 노출 */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* 좌측 7컬럼: 시간대별 POS 동선 인과관계 (timeOfDayCausalLinkages) */}
                {timeOfDayLinkages && (
                  <div className="lg:col-span-7 rounded-2xl bg-[#F8F7F3] border border-[#1B382E]/15 p-4 space-y-3">
                    <div className="text-xs md:text-sm font-extrabold text-[#284F42] flex items-center gap-1.5">
                      <Utensils size={15} />
                      <span>시간대별 식음(POS) 고객 동선 및 상관계수 인과 사슬 (`timeOfDayCausalLinkages`)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      {[
                        { title: '조식 (06~10시)', node: timeOfDayLinkages?.morning06To10 },
                        { title: '중식·오후 (11~17시)', node: timeOfDayLinkages?.lunchAndAfternoon11To17 },
                        { title: '석식 (18시~)', node: timeOfDayLinkages?.evening18Plus }
                      ].map((slot, sIdx) => (
                        <div key={sIdx} className="rounded-xl bg-white p-3 border border-[#1B382E]/10 space-y-1.5">
                          <div className="flex items-center justify-between border-b border-[#1B382E]/10 pb-1.5">
                            <strong className="text-[#1B382E] font-black">{slot.title}</strong>
                            <span className="px-1.5 py-0.5 rounded bg-[#E8F2EE] text-[#1E523F] text-[11px] font-extrabold">
                              비중 {fmtPctOne(slot.node?.sharePct)}
                            </span>
                          </div>
                          <div className="text-sm font-black text-[#284F42]">
                            {fmtInt(slot.node?.tyRevenue)}원
                          </div>
                          <p className="text-[11px] text-[#4A5D54] leading-relaxed">
                            {fmtText(slot.node?.causalDrivers)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 우측 5컬럼: 본부별 즉시 실행 처방 (immediateActionItems 4대 실무 처방) */}
                {immediateActionItems.length > 0 && (
                  <div className="lg:col-span-5 rounded-2xl bg-[#E8F2EE]/70 border-2 border-[#284F42]/30 p-4 space-y-2.5">
                    <div className="text-xs md:text-sm font-extrabold text-[#1E523F]">
                      본부별 즉시 실행 처방 (`immediateActionItems` — 4대 실무 액션)
                    </div>
                    <ul className="space-y-2 text-xs text-[#1B382E] leading-relaxed">
                      {immediateActionItems.map((action, aIdx) => (
                        <li
                          key={aIdx}
                          className="rounded-xl bg-white p-2.5 border border-[#284F42]/15 flex items-start gap-2 shadow-2xs"
                        >
                          <span className="font-black text-[#1E523F] shrink-0">✓</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          );
        })()}
      </div>

      {/* =====================================================================
          2. 그렇게 결정한 구체적인 이유 (어느 매장·항목·날씨·휴일에서 차이나는가?)
         ===================================================================== */}
      <div className="bg-white rounded-2xl border border-[#1B382E]/10 shadow-xs p-5 md:p-6 space-y-5">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#B59269] text-white text-xs font-bold">
            <FileCheck2 size={14} />
            2. 그렇게 결정한 이유 (세부 매장·항목 및 공휴일·우천 실측 근거)
          </span>
          <h2 className="text-base md:text-lg font-black text-[#1B382E] mt-2">
            각 사업부 세부 항목과 공휴일·비 온 날 차이가 실제 매출에 미친 내역입니다
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* ① 체험·레저 시설별 증감 */}
          <div className="rounded-xl border border-[#1B382E]/15 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1B382E]/10 pb-2.5">
              <div className="flex items-center gap-2 font-black text-sm text-[#1B382E]">
                <Ticket size={16} className="text-[#284F42]" />
                <span>① 체험·레저 매장별 증감 내역</span>
              </div>
              <span className="text-xs font-bold text-[#6C7A73]">
                야외 {fmtSignedInt(leisureDetail?.outdoorDiffAmount, '원')} / 실내 {fmtSignedInt(leisureDetail?.indoorDiffAmount, '원')}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {venueVariances.map((v: any, idx: number) => {
                const neg = Number(v?.diffAmount) < 0;
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-1.5 border-b border-[#1B382E]/5 last:border-b-0"
                  >
                    <div>
                      <span className="font-bold text-[#1B382E]">{fmtText(v?.venueName)}</span>
                      <span className="text-[#6C7A73] ml-2">
                        (손님 {fmtInt(v?.lyVisitors)}명 ➔ {fmtInt(v?.tyVisitors)}명)
                      </span>
                    </div>
                    <div className="text-right">
                      <strong className={neg ? 'text-rose-600' : 'text-emerald-700'}>
                        {fmtSignedInt(v?.diffAmount, '원')}
                      </strong>
                      <span className="text-[#6C7A73] ml-1.5">
                        ({fmtInt(v?.lyRevenue)} ➔ {fmtInt(v?.tyRevenue)}원)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ② 식당(F&B) 및 연회·대관 증감 */}
          <div className="rounded-xl border border-[#1B382E]/15 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1B382E]/10 pb-2.5">
              <div className="flex items-center gap-2 font-black text-sm text-[#1B382E]">
                <Utensils size={16} className="text-[#284F42]" />
                <span>② 식당(F&B) · 연회대관 증감 내역</span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="rounded-lg bg-[#F4F3EE]/60 p-3 flex items-center justify-between">
                <div>
                  <div className="font-bold text-[#1B382E]">직영 식당 일반 매출</div>
                  <div className="text-[#6C7A73] mt-0.5">
                    결제 건수 {fmtInt(fnbDetail?.lyReceiptCount)}건 ➔ {fmtInt(fnbDetail?.tyReceiptCount)}건 · 영수증당 평균{' '}
                    {fmtInt(fnbDetail?.lyAvgCheckPerReceipt)}원 ➔ {fmtInt(fnbDetail?.tyAvgCheckPerReceipt)}원
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div
                    className={`text-sm font-black ${
                      Number(fnbDetail?.directFnbDiffAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {fmtSignedInt(fnbDetail?.directFnbDiffAmount, '원')}
                  </div>
                  <div className="text-[#6C7A73]">
                    {fmtInt(fnbDetail?.lyDirectFnbRevenue)} ➔ {fmtInt(fnbDetail?.tyDirectFnbRevenue)}원
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-[#F4F3EE]/60 p-3 flex items-center justify-between">
                <div>
                  <div className="font-bold text-[#1B382E]">단체 연회 · 세미나 대관 매출</div>
                  <div className="text-[#6C7A73] mt-0.5">기업 세미나 및 단체 연회 행사 매출 비교</div>
                </div>
                <div className="text-right shrink-0">
                  <div
                    className={`text-sm font-black ${
                      Number(fnbDetail?.banquetDiffAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {fmtSignedInt(fnbDetail?.banquetDiffAmount, '원')}
                  </div>
                  <div className="text-[#6C7A73]">
                    {fmtInt(fnbDetail?.lyBanquetRevenue)} ➔ {fmtInt(fnbDetail?.tyBanquetRevenue)}원
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-[#F4F3EE]/60 p-3 flex items-center justify-between">
                <div>
                  <div className="font-bold text-[#1B382E]">입점 매장 (편의점·카페 등)</div>
                  <div className="text-[#6C7A73] mt-0.5">단지 내 임대/수수료 매장 매출</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-[#1B382E]">
                    {fmtInt(fnbDetail?.lyOutsourcedFnbRevenue)} ➔ {fmtInt(fnbDetail?.tyOutsourcedFnbRevenue)}원 (
                    {fmtPct(fnbDetail?.outsourcedFnbGrowthPct)})
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ③ 골프 항목별 증감 */}
          <div className="rounded-xl border border-[#1B382E]/15 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1B382E]/10 pb-2.5">
              <div className="flex items-center gap-2 font-black text-sm text-[#1B382E]">
                <Flag size={16} className="text-[#284F42]" />
                <span>③ 골프 (벨포레CC) 항목별 증감 내역</span>
              </div>
              <span className="text-xs font-bold text-[#6C7A73]">
                {fmtInt(golfDetail?.lyVisitedTeams)}팀({fmtInt(golfDetail?.lyVisitors)}명) ➔{' '}
                {fmtInt(golfDetail?.tyVisitedTeams)}팀({fmtInt(golfDetail?.tyVisitors)}명)
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-[#1B382E]/5">
                <div>
                  <span className="font-bold text-[#1B382E]">그린피 (입장료)</span>
                  <span className="text-[#6C7A73] ml-2">
                    (회원 {fmtInt(golfDetail?.lyMemberPlayers)}➔{fmtInt(golfDetail?.tyMemberPlayers)}명 / 비회원{' '}
                    {fmtInt(golfDetail?.lyNonMemberPlayers)}➔{fmtInt(golfDetail?.tyNonMemberPlayers)}명)
                  </span>
                </div>
                <div className="text-right">
                  <strong className={Number(golfRevComp?.greenFeeDiff) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                    {fmtSignedInt(golfRevComp?.greenFeeDiff, '원')}
                  </strong>
                  <span className="text-[#6C7A73] ml-1.5">
                    ({fmtInt(golfRevComp?.lyGreenFeeRevenue)} ➔ {fmtInt(golfRevComp?.tyGreenFeeRevenue)}원)
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-[#1B382E]/5">
                <div>
                  <span className="font-bold text-[#1B382E]">카트 대여료</span>
                </div>
                <div className="text-right">
                  <strong className={Number(golfRevComp?.cartFeeDiff) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                    {fmtSignedInt(golfRevComp?.cartFeeDiff, '원')}
                  </strong>
                  <span className="text-[#6C7A73] ml-1.5">
                    ({fmtInt(golfRevComp?.lyCartFeeRevenue)} ➔ {fmtInt(golfRevComp?.tyCartFeeRevenue)}원)
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between py-1.5">
                <div>
                  <span className="font-bold text-[#1B382E]">프로샵 · 클럽하우스 부대매출</span>
                </div>
                <div className="text-right">
                  <strong className={Number(golfRevComp?.extraRevenueDiff) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                    {fmtSignedInt(golfRevComp?.extraRevenueDiff, '원')}
                  </strong>
                  <span className="text-[#6C7A73] ml-1.5">
                    ({fmtInt(golfRevComp?.lyProshopAndClubhouseExtraRevenue)} ➔{' '}
                    {fmtInt(golfRevComp?.tyProshopAndClubhouseExtraRevenue)}원)
                  </span>
                </div>
              </div>

              {/* 골프 5대 예약채널 변동 및 연단체·조기도착 행동 분석 */}
              {golfChannelMix.length > 0 && (
                <div className="pt-2 mt-2 border-t border-[#1B382E]/10 space-y-1.5">
                  <div className="text-[11px] font-black text-[#284F42]">5대 예약채널별 내장객 · 그린피 증감</div>
                  {golfChannelMix.map((gc: any, gIdx: number) => {
                    const gNeg = Number(gc?.diffGreenFee) < 0;
                    return (
                      <div key={gc?.channelCode || gIdx} className="flex items-center justify-between text-[11px] py-0.5">
                        <span className="text-[#1B382E] font-semibold">
                          {fmtText(gc?.channelLabel)} ({fmtInt(gc?.lyPlayers)}➔{fmtInt(gc?.tyPlayers)}명,{' '}
                          {fmtSignedInt(gc?.diffPlayers, '명')})
                        </span>
                        <strong className={gNeg ? 'text-rose-600' : 'text-emerald-700'}>
                          {fmtSignedInt(gc?.diffGreenFee, '원')}
                        </strong>
                      </div>
                    );
                  })}
                </div>
              )}

              {golfVisitorBehavior && (
                <div className="pt-2 mt-1 border-t border-[#1B382E]/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#6C7A73]">
                  <span>
                    위임·연단체 예약:{' '}
                    <strong className="text-[#1B382E]">
                      {fmtInt(golfVisitorBehavior?.lyDelegatedBookings ?? golfVisitorBehavior?.lyDelegatedGroupBookings)}➔
                      {fmtInt(golfVisitorBehavior?.tyDelegatedBookings ?? golfVisitorBehavior?.tyDelegatedGroupBookings)}건
                    </strong>
                  </span>
                  <span>
                    티오프 전 평균 도착:{' '}
                    <strong className="text-[#1B382E]">
                      {fmtInt(golfVisitorBehavior?.lyAvgPreTeeArrivalMinutes)}➔
                      {fmtInt(golfVisitorBehavior?.tyAvgPreTeeArrivalMinutes)}분 전
                    </strong>
                  </span>
                  <span>
                    여성 골퍼 비중:{' '}
                    <strong className="text-[#1B382E]">
                      {fmtPctOne(golfVisitorBehavior?.tyFemaleRatioPct ?? golfVisitorBehavior?.tyFemaleSharePct)}
                    </strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ④ 콘도 객실 고객 유형별 증감 */}
          <div className="rounded-xl border border-[#1B382E]/15 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1B382E]/10 pb-2.5">
              <div className="flex items-center gap-2 font-black text-sm text-[#1B382E]">
                <Hotel size={16} className="text-[#284F42]" />
                <span>④ 콘도 객실 예약 유형별 증감 내역</span>
              </div>
              <span className="text-xs font-bold text-[#6C7A73]">
                판매 {fmtInt(condoDetail?.lyOccupiedRooms)}실 ➔ {fmtInt(condoDetail?.tyOccupiedRooms)}실 (평균{' '}
                {fmtInt(condoDetail?.tyAdr)}원)
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {channelMix.map((ch: any, idx: number) => {
                const neg = Number(ch?.diffRevenue) < 0;
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-1.5 border-b border-[#1B382E]/5 last:border-b-0"
                  >
                    <div>
                      <span className="font-bold text-[#1B382E]">{fmtText(ch?.channelLabel)}</span>
                      <span className="text-[#6C7A73] ml-2">
                        ({fmtInt(ch?.lyRooms)}실 ➔ {fmtInt(ch?.tyRooms)}실)
                      </span>
                    </div>
                    <div className="text-right">
                      <strong className={neg ? 'text-rose-600' : 'text-emerald-700'}>
                        {fmtSignedInt(ch?.diffRevenue, '원')}
                      </strong>
                      <span className="text-[#6C7A73] ml-1.5">
                        ({fmtInt(ch?.lyRevenue)} ➔ {fmtInt(ch?.tyRevenue)}원)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ⑤ 공휴일·휴일 일수 차이 및 달력 영향 */}
          {calFactor && (
            <div className="rounded-xl border border-[#1B382E]/15 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#1B382E]/10 pb-2.5">
                <div className="flex items-center gap-2 font-black text-sm text-[#1B382E]">
                  <Calendar size={16} className="text-[#284F42]" />
                  <span>⑤ 공휴일 · 주말 일수 차이 영향</span>
                </div>
                <span className="text-xs font-bold text-[#6C7A73]">
                  공휴일 {fmtInt(calFactor?.lyHolidayDays)}일 ➔ {fmtInt(calFactor?.tyHolidayDays)}일 (
                  {fmtSignedInt(calFactor?.holidayDiffDays, '일')})
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-[#1B382E]/5">
                  <span className="text-[#6C7A73]">법정공휴일 명칭</span>
                  <strong className="text-[#1B382E] text-right">
                    올해 [{fmtText(calFactor?.tyHolidayNames)}] vs 비교기 [{fmtText(calFactor?.lyHolidayNames)}]
                  </strong>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#1B382E]/5">
                  <span className="text-[#6C7A73]">주말+공휴일(휴일) 하루 평균 매출</span>
                  <strong className="text-[#1B382E]">
                    {fmtInt(calFactor?.lyRedDayAvgRevenue)}원 ➔ {fmtInt(calFactor?.tyRedDayAvgRevenue)}원 (
                    <span className={Number(calFactor?.redDayDailyAvgGrowthPct) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                      {fmtPct(calFactor?.redDayDailyAvgGrowthPct)}
                    </span>
                    )
                  </strong>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#1B382E]/5">
                  <span className="text-[#6C7A73]">평일(주중) 하루 평균 매출</span>
                  <strong className="text-[#1B382E]">
                    {fmtInt(calFactor?.lyWeekdayAvgRevenue)}원 ➔ {fmtInt(calFactor?.tyWeekdayAvgRevenue)}원 (
                    <span className={Number(calFactor?.weekdayDailyAvgGrowthPct) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                      {fmtPct(calFactor?.weekdayDailyAvgGrowthPct)}
                    </span>
                    )
                  </strong>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="font-bold text-[#1B382E]">달력 휴일수 차이 영향 / 보정 후 실질 증감</span>
                  <strong className="text-[#1B382E]">
                    <span className={Number(calFactor?.calendarShiftEffectAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                      {fmtSignedInt(calFactor?.calendarShiftEffectAmount, '원')}
                    </span>{' '}
                    / 실질{' '}
                    <span className={Number(calFactor?.calendarAdjustedRevenueDiff) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                      {fmtSignedInt(calFactor?.calendarAdjustedRevenueDiff, '원')}
                    </span>
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* ⑥ 비가 온 날 (주말·휴일 비 vs 평일 비) 비교 */}
          {extWeather && (
            <div className="rounded-xl border border-[#1B382E]/15 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#1B382E]/10 pb-2.5">
                <div className="flex items-center gap-2 font-black text-sm text-[#1B382E]">
                  <CloudRain size={16} className="text-[#284F42]" />
                  <span>⑥ 비 온 날 (주말·휴일 우천 vs 평일 우천) 비교</span>
                </div>
                <span className="text-xs font-bold text-[#6C7A73]">
                  총 우천일 {fmtInt(extWeather?.lyRainyDays)}일 ➔ {fmtInt(extWeather?.tyRainyDays)}일 (
                  {fmtSignedInt(extWeather?.rainyDaysDiff, '일')})
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-[#1B382E]/5">
                  <span className="text-[#6C7A73]">주말·공휴일에 비 온 날 (매출 영향 큼)</span>
                  <strong className="text-[#1B382E]">
                    {fmtInt(extWeather?.lyRedDayRainyDays)}일 ➔ {fmtInt(extWeather?.tyRedDayRainyDays)}일 (
                    <span className={Number(extWeather?.redDayRainyDaysDiff) <= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                      {fmtSignedInt(extWeather?.redDayRainyDaysDiff, '일')}
                    </span>
                    , 강수 {fmtText(extWeather?.tyRedDayRainfallMm)}mm)
                  </strong>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#1B382E]/5">
                  <span className="text-[#6C7A73]">평일(주중)에 비 온 날</span>
                  <strong className="text-[#1B382E]">
                    {fmtInt(extWeather?.lyWeekdayRainyDays)}일 ➔ {fmtInt(extWeather?.tyWeekdayRainyDays)}일 (
                    {fmtSignedInt(extWeather?.weekdayRainyDaysDiff, '일')}, 강수 {fmtText(extWeather?.tyWeekdayRainfallMm)}mm)
                  </strong>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#1B382E]/5">
                  <span className="text-[#6C7A73]">올해 맑은 날 vs 비 온 날 하루 평균 매출</span>
                  <strong className="text-[#1B382E]">
                    맑은 날 {fmtInt(extWeather?.tyClearDayAvgRevenue)}원 vs 비 온 날 {fmtInt(extWeather?.tyRainyDayAvgRevenue)}원
                  </strong>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-[#6C7A73]">평균 최고기온 (휴일 / 평일)</span>
                  <strong className="text-[#1B382E]">
                    전체 {fmtText(extWeather?.tyTempMax)}°C (휴일 {fmtText(extWeather?.tyRedDayAvgTempMax)}°C / 평일{' '}
                    {fmtText(extWeather?.tyWeekdayAvgTempMax)}°C)
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 근거 ③ 데이터 검증으로 확인된 3대 원인 카드 */}
        {top3Hypotheses.length > 0 && (
          <div className="pt-2 space-y-2.5">
            <div className="text-xs font-black text-[#284F42]">
              근거 ③ 데이터 검증으로 확인된 3대 원인
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              {top3Hypotheses.map((h: any, idx: number) => (
                <div
                  key={idx}
                  className="rounded-xl border border-[#1B382E]/15 bg-[#F4F3EE]/50 p-3.5 space-y-1"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs md:text-sm font-black text-[#1B382E]">
                      {h?.hypothesisTitle ? `${fmtText(h.hypothesisTitle)} (${fmtText(h?.category)})` : fmtText(h?.category)}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
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
                  <div className="text-xs text-[#284F42] font-bold">
                    검증 수치: {fmtText(h?.verificationMetric)}
                  </div>
                  <p className="text-xs text-[#1B382E]/85 leading-relaxed">
                    {fmtText(h?.evidenceDetail)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          3. 외부 환경 및 주요 운영 지표 (한 줄 요약 — 6대 카드)
         ===================================================================== */}
      <div className="bg-white rounded-2xl border border-[#1B382E]/10 shadow-xs p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-1.5 text-sm font-black text-[#284F42]">
          <Info size={16} className="text-[#284F42]" />
          <span>3. 외부 환경 및 주요 운영 지표 요약</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
          {/* [카드 1] 날씨 / 공휴일 */}
          <div className="rounded-xl bg-[#F4F3EE]/60 border border-[#1B382E]/10 p-4 flex flex-col justify-between gap-2">
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-[#6C7A73]">날씨 / 공휴일</div>
              <div className="text-[13px] md:text-sm font-bold text-[#1B382E] leading-relaxed">
                {isMultiDayPeriod ? (
                  <>
                    우천 {fmtInt(extWeather?.lyRainyDays)}➔{fmtInt(extWeather?.tyRainyDays)}일 (주말·휴일우천{' '}
                    {fmtInt(extWeather?.lyRedDayRainyDays)}➔{fmtInt(extWeather?.tyRedDayRainyDays)}일 · 평일우천{' '}
                    {fmtInt(extWeather?.lyWeekdayRainyDays)}➔{fmtInt(extWeather?.tyWeekdayRainyDays)}일)
                    <br />
                    공휴일 {fmtInt(extWeather?.lyHolidayDays ?? calFactor?.lyHolidayDays)}➔
                    {fmtInt(extWeather?.tyHolidayDays ?? calFactor?.tyHolidayDays)}일 (
                    {fmtSignedInt(extWeather?.holidayDiffDays ?? calFactor?.holidayDiffDays, '일')}, 달력효과{' '}
                    {fmtSignedInt(extWeather?.calendarShiftEffectAmount ?? calFactor?.calendarShiftEffectAmount, '원')})
                  </>
                ) : (
                  <>
                    {fmtText(extWeather?.tyWeatherDesc)} {fmtText(extWeather?.tyTempMax)}°C (강수{' '}
                    {fmtText(extWeather?.tyRainfallMm)}mm, 비교기 {fmtText(extWeather?.lyWeatherDesc)}{' '}
                    {fmtText(extWeather?.lyTempMax)}°C) · 공휴일{' '}
                    {fmtInt(extWeather?.tyHolidayDays ?? calFactor?.tyHolidayDays)}일(비교기{' '}
                    {fmtInt(extWeather?.lyHolidayDays ?? calFactor?.lyHolidayDays)}일)
                  </>
                )}
              </div>
            </div>
            {Number(calFactor?.calendarShiftEffectAmount ?? extWeather?.calendarShiftEffectAmount ?? 0) !== 0 && (
              <div className="text-xs font-bold text-[#8C6D46] bg-white/90 px-3 py-1.5 rounded-lg border border-[#B59269]/40">
                달력 시프트 효과:{' '}
                {fmtSignedInt(calFactor?.calendarShiftEffectAmount ?? extWeather?.calendarShiftEffectAmount, '원')} ➔
                달력 보정 실질 영업증감:{' '}
                {fmtSignedInt(calFactor?.calendarAdjustedRevenueDiff ?? extWeather?.calendarAdjustedRevenueDiff, '원')}
              </div>
            )}
          </div>

          {/* [카드 2] 경쟁사 만실 여부 */}
          <div className="rounded-xl bg-[#F4F3EE]/60 border border-[#1B382E]/10 p-4 flex flex-col justify-between gap-1.5">
            <div className="text-xs font-bold text-[#6C7A73]">경쟁사 만실 여부</div>
            <div className="text-[13px] md:text-sm font-bold text-[#1B382E] leading-relaxed">
              충청 4사 만실 {fmtInt(compMarket?.soldOutResortCount)}/{fmtInt(compMarket?.monitoredResortCount)}곳
              <div className="text-xs font-medium text-[#4A5D54] mt-0.5">
                평균 최저가 {fmtInt(compMarket?.competitorAvgMinPrice)}원 · 동요일 30일 대비{' '}
                <strong className="text-[#1B382E]">
                  {fmtPctOne(
                    compMarket?.competitorPriceSurgeRatioPct ?? compMarket?.competitorSameClassSurgeRatioPct,
                    true
                  )}
                </strong>
              </div>
            </div>
          </div>

          {/* [카드 3] 콘도 열쇠 가동·수익 */}
          <div className="rounded-xl bg-[#F4F3EE]/60 border border-[#1B382E]/10 p-4 flex flex-col justify-between gap-1.5">
            <div className="text-xs font-bold text-[#6C7A73]">콘도 열쇠 가동 · 수익</div>
            <div className="text-[13px] md:text-sm font-bold text-[#1B382E] leading-relaxed">
              물리열쇠 {fmtInt(condoDetail?.tyOccupiedPhysicalKeys)}/
              {fmtInt(condoDetail?.physicalKeyCapacity ?? compMarket?.belleforetPhysicalKeyCapacity)}개 (
              {fmtPctOne(
                condoDetail?.tyPhysicalKeyOccPct ??
                  calFactor?.regimeDynamicThresholds?.actualKeyOccPct ??
                  compMarket?.belleforetPhysicalKeyOccPct
              )}{' '}
              | 기대{' '}
              {fmtPctOne(
                condoDetail?.expectedKeyOccPct ?? calFactor?.regimeDynamicThresholds?.expectedKeyOccPct
              )}
              )
              <div className="text-xs font-medium text-[#4A5D54] mt-0.5">
                열쇠당 수익(Key Yield) <strong className="text-[#1B382E]">{fmtInt(condoDetail?.tyKeyYield)}원</strong> (
                {fmtPct(condoDetail?.keyYieldGrowthPct)})
              </div>
            </div>
          </div>

          {/* [카드 4] 골퍼 미숙박 이탈 */}
          <div className="rounded-xl bg-[#F4F3EE]/60 border border-[#1B382E]/10 p-4 flex flex-col justify-between gap-1.5">
            <div className="text-xs font-bold text-[#6C7A73]">골퍼 미숙박 이탈</div>
            <div className="text-[13px] md:text-sm font-bold text-[#1B382E] leading-relaxed">
              진성타겟 {fmtInt(compMarket?.unconvertedInternalStayDemand?.coreStayConversionTargetTeams)}팀 중{' '}
              <span className="text-rose-600">
                {fmtInt(compMarket?.unconvertedInternalStayDemand?.coreStayConversionNonStayTeams)}팀 미숙박
              </span>
              <div className="text-xs font-medium text-[#4A5D54] mt-0.5">
                4시간+ 장기체류 워크인 차량:{' '}
                <strong className="text-[#1B382E]">
                  {fmtInt(
                    compMarket?.unconvertedInternalStayDemand?.longDwell4hPlusWalkinCars ??
                      parkingBehavior?.tyWalkinLongDwell4hPlusCars
                  )}
                  대
                </strong>
              </div>
            </div>
          </div>

          {/* [카드 5] 투숙객 외부 외출 */}
          <div className="rounded-xl bg-[#F4F3EE]/60 border border-[#1B382E]/10 p-4 flex flex-col justify-between gap-1.5">
            <div className="text-xs font-bold text-[#6C7A73]">투숙객 외부 외출</div>
            <div className="text-[13px] md:text-sm font-bold text-[#1B382E] leading-relaxed">
              외출 {fmtInt(fnbDetail?.tyStayOutingCount ?? parkingBehavior?.tyStayOutingCount)}회 (외출률{' '}
              <span className="text-rose-600">
                {fmtPctOne(
                  fnbDetail?.tyStayOutingRatePct ??
                    parkingBehavior?.tyStayOutingRatePct ??
                    calFactor?.regimeDynamicThresholds?.actualStayOutingRatePct
                )}
              </span>
              )
              <div className="text-xs font-medium text-[#4A5D54] mt-0.5">
                평균 외출 {fmtInt(fnbDetail?.tyStayAvgOutingMinutes ?? parkingBehavior?.tyStayAvgOutingMinutes)}분 · 경보 기준{' '}
                {fmtPctOne(
                  fnbDetail?.outingAlertThresholdPct ??
                    parkingBehavior?.outingAlertThresholdPct ??
                    calFactor?.regimeDynamicThresholds?.outingAlertThresholdPct
                )}
              </div>
            </div>
          </div>

          {/* [카드 6] 정산 무결성 / 후정산 */}
          <div className="rounded-xl bg-[#F4F3EE]/60 border border-[#1B382E]/10 p-4 flex flex-col justify-between gap-1.5">
            <div className="text-xs font-bold text-[#6C7A73]">정산 무결성 / 후정산</div>
            <div className="text-[13px] md:text-sm font-bold text-[#1B382E] leading-relaxed">
              정산 오차{' '}
              {fmtInt(
                integrityFactor?.reconciliationDeltaWon ??
                  integrityFactor?.gatekeeperDeltaWon ??
                  integrityFactor?.gatekeeperDeltaAmount
              )}
              원 (미분류 {fmtInt(integrityFactor?.unmappedCandidateCount)}건)
              <div className="text-xs font-medium text-[#4A5D54] mt-0.5">
                후정산 대기 {fmtInt(integrityFactor?.cityLedgerPendingCount)}건 (
                {fmtInt(integrityFactor?.cityLedgerPendingAmount ?? integrityFactor?.b2bPostSettlementPendingAmount)}원)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          4. 날씨·시간대·단체유형별 교차 분석 및 본부별 실행 처방
         ===================================================================== */}
      {crossMatrix && (
        <div className="bg-white rounded-2xl border border-[#1B382E]/10 shadow-xs p-5 md:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#1B382E]/10 pb-3">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1B382E] text-white text-xs font-bold">
                4. 날씨 · 식사 시간대 · 단체 고객 교차 분석 및 실행 처방
              </span>
              <h2 className="text-base md:text-lg font-black text-[#1B382E] mt-2">
                최근 {fmtInt(crossMatrix?.sampleDaysCount)}일 실측 기준 부문 간 영향도 및 시간대별·단체별 상세 내역
              </h2>
            </div>
          </div>

          {/* ① 부문 간 영향도 지수 (pearsonCorrelations) */}
          {pearsonCorr && (
            <div className="space-y-2.5">
              <div className="text-xs md:text-sm font-black text-[#284F42]">
                ① 날씨·투숙객·외출이 매출에 미친 상관관계 (최근 {fmtInt(crossMatrix?.sampleDaysCount)}일 실측, +1에 가까울수록 동반 상승 / -1에 가까울수록 반대 이동)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                {[
                  { label: '비 온 양(mm) ↔ 골프 매출', val: pearsonCorr?.rRainVsGolfRev },
                  { label: '비 온 양(mm) ↔ 야외 레저 매출', val: pearsonCorr?.rRainVsOutdoorLeisureRev },
                  { label: '비 온 양(mm) ↔ 실내 레저 매출', val: pearsonCorr?.rRainVsIndoorLeisureRev },
                  { label: '숙박객+1부골퍼 ↔ 아침 식음 매출', val: pearsonCorr?.rMorningGuestsGolfVsMorningPosRev },
                  { label: '4시간+ 나들이차량 ↔ 점심·오후 식음', val: pearsonCorr?.rWalkinLongDwellVsLunchPosRev },
                  { label: '콘도 투숙객 수 ↔ 직영 식당 매출', val: pearsonCorr?.rStayGuestsVsDirectFnbRev },
                  { label: '투숙객 외부 외출 ↔ 저녁 식당 매출', val: pearsonCorr?.rStayOutingVsEveningPosRev },
                  { label: '51평(방 2개 연결) 비중 ↔ 열쇠 1개당 수익', val: pearsonCorr?.rRoom51ShareVsKeyYield }
                ].map((item, idx) => {
                  const rVal = item.val;
                  const numR = Number(rVal);
                  return (
                    <div key={idx} className="rounded-xl bg-[#F4F3EE]/60 border border-[#1B382E]/10 p-3.5">
                      <div className="text-xs text-[#5A6B63] font-bold">{item.label}</div>
                      <div
                        className={`text-base md:text-lg font-black mt-1 ${
                          Number.isNaN(numR)
                            ? 'text-[#1B382E]'
                            : numR < 0
                            ? 'text-rose-600'
                            : 'text-emerald-700'
                        }`}
                      >
                        상관계수 {rVal !== null && rVal !== undefined ? fmtText(rVal) : '-'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ② 식음(F&B) 시간대별 매출 원인 (timeOfDayCausalLinkages) */}
          {timeOfDayLinkages && (
            <div className="space-y-2.5">
              <div className="text-xs md:text-sm font-black text-[#284F42]">
                ② 아침 · 점심 · 저녁 시간대별 직영 식당 매출 및 주요 고객층
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-xs">
                {[
                  {
                    title: '아침 식사 (06~10시)',
                    node: timeOfDayLinkages?.morning06To10
                  },
                  {
                    title: '점심 · 오후 (11~17시)',
                    node: timeOfDayLinkages?.lunchAndAfternoon11To17
                  },
                  {
                    title: '저녁 식사 (18시 이후)',
                    node: timeOfDayLinkages?.evening18Plus
                  }
                ].map((slot, idx) => (
                  <div key={idx} className="rounded-xl border border-[#1B382E]/15 p-4 space-y-2 bg-[#F4F3EE]/40">
                    <div className="flex items-center justify-between border-b border-[#1B382E]/10 pb-2">
                      <span className="text-xs md:text-sm font-black text-[#1B382E]">{slot.title}</span>
                      <span className="text-xs md:text-sm font-black text-[#284F42]">
                        {fmtInt(slot.node?.tyRevenue)}원 ({fmtPctOne(slot.node?.sharePct)})
                      </span>
                    </div>
                    <p className="text-xs md:text-[13px] text-[#1B382E]/90 leading-relaxed">
                      {fmtText(slot.node?.causalDrivers)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ③ B2B 단체 세그먼트별 식음 vs 레저 소비 명세 및 대관 행사 Top 3 */}
          {groupSegmentBreakdown.length > 0 && (
            <div className="space-y-2.5">
              <div className="text-xs md:text-sm font-black text-[#284F42]">
                ③ 단체 고객 유형별 식당(F&B) · 레저 이용 금액 비교
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs md:text-[13px] pt-1">
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

          {/* ④ 경영진 핵심 요약 및 본부별 즉시 실행 처방 */}
          {(executiveSummaryBullets.length > 0 || immediateActionItems.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 pt-2 border-t border-[#1B382E]/10 text-xs md:text-[13px]">
              {executiveSummaryBullets.length > 0 && (
                <div className="rounded-xl bg-[#F4F3EE]/60 border border-[#1B382E]/10 p-4 space-y-2">
                  <div className="text-sm font-black text-[#1B382E]">경영진 핵심 요약</div>
                  <ul className="space-y-1.5 leading-relaxed text-[#1B382E]/90">
                    {executiveSummaryBullets.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="font-black text-[#284F42]">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {immediateActionItems.length > 0 && (
                <div className="rounded-xl bg-[#E8F2EE]/60 border border-[#284F42]/20 p-4 space-y-2">
                  <div className="text-sm font-black text-[#1E523F]">본부별 즉시 실행 처방</div>
                  <ul className="space-y-1.5 leading-relaxed text-[#1B382E]/90">
                    {immediateActionItems.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="font-black text-[#1E523F]">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
