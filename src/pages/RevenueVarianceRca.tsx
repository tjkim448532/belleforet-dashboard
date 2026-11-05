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
  const timeOfDayLinkages = crossMatrix?.timeOfDayCausalLinkages || null;
  const groupSegmentBreakdown: any[] = Array.isArray(crossMatrix?.groupSegmentVenueBreakdown)
    ? crossMatrix.groupSegmentVenueBreakdown
    : [];
  const banquetTopEvents = crossMatrix?.banquetTopEvents || null;

  const structuredReport = rcaData?.structuredReport || null;
  const executiveSummaryBullets: string[] = Array.isArray(structuredReport?.executiveSummary)
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
          1. 매출의 증감 이유는 딱 무엇인가? (결론)
         ===================================================================== */}
      <div className="bg-white rounded-2xl border-2 border-[#284F42] shadow-xs p-5 md:p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#1B382E]/10 pb-4">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#284F42] text-white text-xs font-bold">
              <Target size={14} />
              1. 매출 증감 이유 (결론)
            </span>
            <h2 className="text-lg md:text-xl font-black text-[#1B382E] pt-1">
              {fmtText(formula?.primaryDriverLabel)}
            </h2>
            <p className="text-xs md:text-sm text-[#6C7A73]">
              • 전체 방문객 수:{' '}
              <strong className="text-[#1B382E]">
                {fmtInt(formula?.lyTotalVisitors)}명 ➔ {fmtInt(formula?.tyTotalVisitors)}명
              </strong>{' '}
              (
              <strong className={Number(formula?.visitorDiffCount) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                {fmtSignedInt(formula?.visitorDiffCount, '명')}
              </strong>
              ) &nbsp;|&nbsp; • 손님 1인당 평균 지출:{' '}
              <strong className="text-[#1B382E]">
                {fmtInt(formula?.lySpendPerHead)}원 ➔ {fmtInt(formula?.tySpendPerHead)}원
              </strong>{' '}
              (
              <strong className={Number(formula?.spendPerHeadDiff) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                {fmtSignedInt(formula?.spendPerHeadDiff, '원')}
              </strong>
              )
            </p>
          </div>

          <div className="bg-[#F4F3EE] rounded-xl px-4 py-3 text-right shrink-0">
            <div className="text-xs text-[#6C7A73] font-semibold">
              조회기간 매출 {fmtInt(formula?.tyTotalRevenue)}원 (비교기 {fmtInt(formula?.lyTotalRevenue)}원)
            </div>
            <div
              className={`text-xl md:text-2xl font-black mt-0.5 flex items-center justify-end gap-1.5 ${
                isNegative ? 'text-rose-600' : 'text-emerald-700'
              }`}
            >
              {isNegative ? <TrendingDown size={22} /> : <TrendingUp size={22} />}
              <span>
                {fmtSignedInt(formula?.revenueDiffAmount, '원')} ({fmtPct(formula?.revenueGrowthPct)})
              </span>
            </div>
          </div>
        </div>

        {/* 공휴일·휴일 일수 차이 보정 요약 배너 (다중일 또는 공휴일 차이 발생 시 직관 표출) */}
        {(isMultiDayPeriod || Number(calFactor?.holidayDiffDays) !== 0) && calFactor && (
          <div className="rounded-xl bg-[#F4F3EE]/80 border border-[#B59269]/40 p-3.5 text-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
            <div className="space-y-0.5">
              <span className="font-black text-[#8C6D46] mr-2">[달력 공휴일 차이 보정]</span>
              <span className="text-[#1B382E]">
                법정공휴일 <strong>{fmtInt(calFactor?.lyHolidayDays)}일 ➔ {fmtInt(calFactor?.tyHolidayDays)}일</strong> (
                <strong className={Number(calFactor?.holidayDiffDays) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                  {fmtSignedInt(calFactor?.holidayDiffDays, '일')}
                </strong>
                , 총 휴일 {fmtInt(calFactor?.lyRedDays)}일 ➔ {fmtInt(calFactor?.tyRedDays)}일) 차이로 인한 달력 영향액은{' '}
                <strong className={Number(calFactor?.calendarShiftEffectAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                  {fmtSignedInt(calFactor?.calendarShiftEffectAmount, '원')}
                </strong>
                입니다.
              </span>
            </div>
            <div className="shrink-0 font-bold text-[#1B382E] bg-white px-3 py-1.5 rounded-lg border border-[#1B382E]/10">
              공휴일 차이 보정 실질 증감:{' '}
              <strong className={Number(calFactor?.calendarAdjustedRevenueDiff) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                {fmtSignedInt(calFactor?.calendarAdjustedRevenueDiff, '원')}
              </strong>
            </div>
          </div>
        )}

        {/* 매출 증감액 5대 원인 분해 (0-Variance 5단 분해를 쉬운 말로 표출) */}
        {formula && (
          <div>
            <div className="text-xs font-bold text-[#6C7A73] mb-2">
              매출 증감액({fmtSignedInt(formula?.revenueDiffAmount, '원')})의 5가지 원인별 금액
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 text-xs">
              {[
                { label: '① 방문객 수 증감', val: formula?.volumeEffectAmount },
                { label: '② 객실·골프·레저 단가', val: formula?.coreSegmentPurePriceEffectAmount },
                { label: '③ 식당 1인당 식사비', val: formula?.pureFnbAttachEffectAmount },
                { label: '④ 단체 연회·대관 행사', val: formula?.banquetBaseEffectAmount },
                { label: '⑤ 손님 유형 비중 변화', val: formula?.visitorMixEffectAmount }
              ].map((item, idx) => {
                const neg = Number(item.val) < 0;
                return (
                  <div key={idx} className="rounded-xl bg-[#F4F3EE]/60 border border-[#1B382E]/10 p-3">
                    <div className="text-[#6C7A73] font-semibold">{item.label}</div>
                    <div className={`text-sm font-black mt-1 ${neg ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {fmtSignedInt(item.val, '원')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4대 사업부별 어디서 줄고 늘었나? */}
        <div>
          <div className="text-xs font-bold text-[#6C7A73] mb-2.5">
            4대 사업부별 매출 증감 (어느 부문에서 얼마가 줄고 늘었는가)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {segmentSummaryRows.map((row: any, idx: number) => {
              const neg = Number(row?.diffAmount) < 0;
              return (
                <div
                  key={idx}
                  className={`rounded-xl p-3.5 border ${
                    neg
                      ? 'bg-rose-50/50 border-rose-200'
                      : 'bg-emerald-50/40 border-emerald-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-black text-[#1B382E]">
                    <span>{fmtText(row?.segmentName)}</span>
                    <span className={neg ? 'text-rose-600' : 'text-emerald-700'}>
                      {fmtPct(row?.growthPct)}
                    </span>
                  </div>
                  <div
                    className={`text-base font-black mt-1 ${
                      neg ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {fmtSignedInt(row?.diffAmount, '원')}
                  </div>
                  <div className="text-[11px] text-[#6C7A73] mt-0.5">
                    {fmtInt(row?.lyRevenue)}원 ➔ {fmtInt(row?.tyRevenue)}원
                  </div>
                  <p className="text-xs text-[#1B382E] mt-2 pt-2 border-t border-[#1B382E]/10 leading-snug font-semibold">
                    {fmtText(row?.isolationDiagnosis)}
                  </p>
                </div>
              );
            })}
          </div>

          {segmentImpactBullets.length > 0 && (
            <div className="mt-3 rounded-xl bg-[#F4F3EE]/60 border border-[#1B382E]/10 p-3.5 space-y-1.5">
              <div className="text-xs font-black text-[#284F42]">부문별 심층 원인 진단 (백엔드 완제품)</div>
              <ul className="space-y-1.5 text-xs text-[#1B382E] leading-relaxed">
                {segmentImpactBullets.map((bullet, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="font-black text-[#284F42] mt-0.5">•</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
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
      <div className="bg-white rounded-2xl border border-[#1B382E]/10 shadow-xs p-5 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-black text-[#6C7A73]">
          <Info size={14} className="text-[#284F42]" />
          <span>3. 외부 환경 및 주요 운영 지표 (한 줄 요약)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
          {/* [카드 1] 날씨 / 공휴일 */}
          <div className="rounded-lg bg-[#F4F3EE]/60 px-3.5 py-2.5 flex flex-col justify-between gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[#6C7A73] font-semibold shrink-0">날씨 / 공휴일</span>
              <strong className="text-[#1B382E] text-right">
                {isMultiDayPeriod ? (
                  <>
                    우천 {fmtInt(extWeather?.lyRainyDays)}➔{fmtInt(extWeather?.tyRainyDays)}일 (주말·휴일우천{' '}
                    {fmtInt(extWeather?.lyRedDayRainyDays)}➔{fmtInt(extWeather?.tyRedDayRainyDays)}일 · 평일우천{' '}
                    {fmtInt(extWeather?.lyWeekdayRainyDays)}➔{fmtInt(extWeather?.tyWeekdayRainyDays)}일) · 공휴일{' '}
                    {fmtInt(extWeather?.lyHolidayDays ?? calFactor?.lyHolidayDays)}➔
                    {fmtInt(extWeather?.tyHolidayDays ?? calFactor?.tyHolidayDays)}일(
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
              </strong>
            </div>
            {Number(calFactor?.calendarShiftEffectAmount ?? extWeather?.calendarShiftEffectAmount ?? 0) !== 0 && (
              <div className="text-[11px] font-bold text-[#8C6D46] bg-white/80 px-2.5 py-1 rounded border border-[#B59269]/40 text-right">
                달력 시프트 효과:{' '}
                {fmtSignedInt(calFactor?.calendarShiftEffectAmount ?? extWeather?.calendarShiftEffectAmount, '원')} ➔
                달력 보정 실질 영업증감:{' '}
                {fmtSignedInt(calFactor?.calendarAdjustedRevenueDiff ?? extWeather?.calendarAdjustedRevenueDiff, '원')}
              </div>
            )}
          </div>

          {/* [카드 2] 경쟁사 만실 여부 */}
          <div className="rounded-lg bg-[#F4F3EE]/60 px-3.5 py-2.5 flex items-center justify-between gap-2">
            <span className="text-[#6C7A73] font-semibold shrink-0">경쟁사 만실 여부</span>
            <strong className="text-[#1B382E] text-right">
              충청 4사 만실 {fmtInt(compMarket?.soldOutResortCount)}/{fmtInt(compMarket?.monitoredResortCount)}곳
              (최저가 {fmtInt(compMarket?.competitorAvgMinPrice)}원, 동요일 30일비{' '}
              {fmtPctOne(
                compMarket?.competitorPriceSurgeRatioPct ?? compMarket?.competitorSameClassSurgeRatioPct,
                true
              )}
              )
            </strong>
          </div>

          {/* [카드 3] 콘도 열쇠 가동·수익 */}
          <div className="rounded-lg bg-[#F4F3EE]/60 px-3.5 py-2.5 flex items-center justify-between gap-2">
            <span className="text-[#6C7A73] font-semibold shrink-0">콘도 열쇠 가동·수익</span>
            <strong className="text-[#1B382E] text-right">
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
              ) · 열쇠당 {fmtInt(condoDetail?.tyKeyYield)}원 ({fmtPct(condoDetail?.keyYieldGrowthPct)})
            </strong>
          </div>

          {/* [카드 4] 골퍼 미숙박 이탈 */}
          <div className="rounded-lg bg-[#F4F3EE]/60 px-3.5 py-2.5 flex items-center justify-between gap-2">
            <span className="text-[#6C7A73] font-semibold shrink-0">골퍼 미숙박 이탈</span>
            <strong className="text-[#1B382E] text-right">
              진성타겟 {fmtInt(compMarket?.unconvertedInternalStayDemand?.coreStayConversionTargetTeams)}팀 중{' '}
              <span className="text-rose-600">
                {fmtInt(compMarket?.unconvertedInternalStayDemand?.coreStayConversionNonStayTeams)}팀 미숙박
              </span>{' '}
              (장기체류 워크인{' '}
              {fmtInt(
                compMarket?.unconvertedInternalStayDemand?.longDwell4hPlusWalkinCars ??
                  parkingBehavior?.tyWalkinLongDwell4hPlusCars
              )}
              대)
            </strong>
          </div>

          {/* [카드 5] 투숙객 외부 외출 */}
          <div className="rounded-lg bg-[#F4F3EE]/60 px-3.5 py-2.5 flex items-center justify-between gap-2">
            <span className="text-[#6C7A73] font-semibold shrink-0">투숙객 외부 외출</span>
            <strong className="text-[#1B382E] text-right">
              외출 {fmtInt(fnbDetail?.tyStayOutingCount ?? parkingBehavior?.tyStayOutingCount)}회 (외출률{' '}
              <span className="text-rose-600">
                {fmtPctOne(
                  fnbDetail?.tyStayOutingRatePct ??
                    parkingBehavior?.tyStayOutingRatePct ??
                    calFactor?.regimeDynamicThresholds?.actualStayOutingRatePct
                )}
              </span>
              , 평균 {fmtInt(fnbDetail?.tyStayAvgOutingMinutes ?? parkingBehavior?.tyStayAvgOutingMinutes)}분 | 경보 기준{' '}
              {fmtPctOne(
                fnbDetail?.outingAlertThresholdPct ??
                  parkingBehavior?.outingAlertThresholdPct ??
                  calFactor?.regimeDynamicThresholds?.outingAlertThresholdPct
              )}
              )
            </strong>
          </div>

          {/* [카드 6] 정산 무결성 / 후정산 */}
          <div className="rounded-lg bg-[#F4F3EE]/60 px-3.5 py-2.5 flex items-center justify-between gap-2">
            <span className="text-[#6C7A73] font-semibold shrink-0">정산 무결성 / 후정산</span>
            <strong className="text-[#1B382E] text-right">
              오차{' '}
              {fmtInt(
                integrityFactor?.reconciliationDeltaWon ??
                  integrityFactor?.gatekeeperDeltaWon ??
                  integrityFactor?.gatekeeperDeltaAmount
              )}
              원 (미분류 {fmtInt(integrityFactor?.unmappedCandidateCount)}건) · 후정산 대기{' '}
              {fmtInt(integrityFactor?.cityLedgerPendingCount)}건 (
              {fmtInt(integrityFactor?.cityLedgerPendingAmount ?? integrityFactor?.b2bPostSettlementPendingAmount)}원)
            </strong>
          </div>
        </div>
      </div>

      {/* =====================================================================
          4. 30일 실증 다차원 상관계수(r) & 시간대별·세그먼트 교차 매트릭스 (crossCorrelationMatrix) 및 실행 처방
         ===================================================================== */}
      {crossMatrix && (
        <div className="bg-white rounded-2xl border border-[#1B382E]/10 shadow-xs p-5 md:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#1B382E]/10 pb-3">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1B382E] text-white text-xs font-bold">
                4. 30일 실증 다차원 상관계수(r) & 시간대별·세그먼트 교차 매트릭스 (`crossCorrelationMatrix`)
              </span>
              <h2 className="text-base md:text-lg font-black text-[#1B382E] mt-2">
                최근 {fmtInt(crossMatrix?.sampleDaysCount)}일 실측 피어슨 상관계수(r) 및 시간대별 POS · B2B 세그먼트 인과 분석
              </h2>
            </div>
          </div>

          {/* ① 도메인 간 실증 피어슨 상관계수 (pearsonCorrelations) */}
          {pearsonCorr && (
            <div className="space-y-2.5">
              <div className="text-xs font-black text-[#284F42]">
                ① 도메인 간 실증 피어슨 상관계수 (최근 {fmtInt(crossMatrix?.sampleDaysCount)}일 실측, r ∈ [-1, 1])
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                {[
                  { label: '강수량(mm) ↔ 골프 매출', val: pearsonCorr?.rRainVsGolfRev },
                  { label: '강수량 ↔ 야외 레저 매출', val: pearsonCorr?.rRainVsOutdoorLeisureRev },
                  { label: '강수량 ↔ 실내 레저 매출', val: pearsonCorr?.rRainVsIndoorLeisureRev },
                  { label: '투숙객+1부골퍼 ↔ 조식 POS(06~10시)', val: pearsonCorr?.rMorningGuestsGolfVsMorningPosRev },
                  { label: '4시간+ 워크인 ↔ 중식·오후 POS(11~17시)', val: pearsonCorr?.rWalkinLongDwellVsLunchPosRev },
                  { label: '콘도 투숙객 수 ↔ 직영 식음 매출', val: pearsonCorr?.rStayGuestsVsDirectFnbRev },
                  { label: '투숙객 인당 외출 ↔ 인당 직영 식음', val: pearsonCorr?.rStayOutingVsEveningPosRev },
                  { label: '51평(2키 소진) 비중 ↔ 열쇠 효율(Key Yield)', val: pearsonCorr?.rRoom51ShareVsKeyYield }
                ].map((item, idx) => {
                  const rVal = item.val;
                  const numR = Number(rVal);
                  return (
                    <div key={idx} className="rounded-xl bg-[#F4F3EE]/60 border border-[#1B382E]/10 p-3">
                      <div className="text-[11px] text-[#6C7A73] font-semibold">{item.label}</div>
                      <div
                        className={`text-base font-black mt-1 ${
                          Number.isNaN(numR)
                            ? 'text-[#1B382E]'
                            : numR < 0
                            ? 'text-rose-600'
                            : 'text-emerald-700'
                        }`}
                      >
                        r = {rVal !== null && rVal !== undefined ? fmtText(rVal) : '-'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ② 식음(F&B) 시간대별 POS 인과 사슬 (timeOfDayCausalLinkages) */}
          {timeOfDayLinkages && (
            <div className="space-y-2.5">
              <div className="text-xs font-black text-[#284F42]">
                ② 식음(F&B) 시간대별 POS 인과 사슬 (`timeOfDayCausalLinkages`)
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-xs">
                {[
                  {
                    title: '조식 (06~10시)',
                    node: timeOfDayLinkages?.morning06To10
                  },
                  {
                    title: '중식·오후 (11~17시)',
                    node: timeOfDayLinkages?.lunchAndAfternoon11To17
                  },
                  {
                    title: '석식 (18시+)',
                    node: timeOfDayLinkages?.evening18Plus
                  }
                ].map((slot, idx) => (
                  <div key={idx} className="rounded-xl border border-[#1B382E]/15 p-3.5 space-y-1.5 bg-[#F4F3EE]/40">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-[#1B382E]">{slot.title}</span>
                      <span className="font-black text-[#284F42]">
                        {fmtInt(slot.node?.tyRevenue)}원 (비중 {fmtPctOne(slot.node?.sharePct)})
                      </span>
                    </div>
                    <p className="text-[11px] text-[#1B382E]/85 leading-relaxed">
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
              <div className="text-xs font-black text-[#284F42]">
                ③ B2B 단체 세그먼트별 식음 vs 레저 소비 명세 (`groupSegmentVenueBreakdown`)
              </div>
              <div className="overflow-x-auto rounded-xl border border-[#1B382E]/15">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-[#284F42] text-white font-bold">
                      <th className="py-2 px-3">단체 세그먼트</th>
                      <th className="py-2 px-3 text-right">당기 식음(F&B)</th>
                      <th className="py-2 px-3 text-right">당기 레저</th>
                      <th className="py-2 px-3 text-right">당기 합계</th>
                      <th className="py-2 px-3 text-right">전년 대비 증감</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1B382E]/10 bg-white">
                    {groupSegmentBreakdown.map((seg: any, sIdx: number) => {
                      const sNeg = Number(seg?.diffRev) < 0;
                      return (
                        <tr key={seg?.segmentCode || sIdx} className="hover:bg-[#F4F3EE]/50">
                          <td className="py-2 px-3 font-black text-[#1B382E]">{fmtText(seg?.segmentLabel)}</td>
                          <td className="py-2 px-3 text-right font-semibold">{fmtInt(seg?.tyFnbRev)}원</td>
                          <td className="py-2 px-3 text-right font-semibold">{fmtInt(seg?.tyLeisureRev)}원</td>
                          <td className="py-2 px-3 text-right font-black text-[#1B382E]">{fmtInt(seg?.tyTotalRev)}원</td>
                          <td className={`py-2 px-3 text-right font-black ${sNeg ? 'text-rose-600' : 'text-emerald-700'}`}>
                            {fmtSignedInt(seg?.diffRev, '원')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {banquetTopEvents && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs pt-1">
                  <div className="rounded-xl bg-[#F4F3EE]/60 border border-[#1B382E]/10 p-3">
                    <div className="font-black text-[#1B382E] mb-1">당기 주요 대관·세미나 행사 Top 3</div>
                    <div className="text-[11px] text-[#6C7A73]">
                      {Array.isArray(banquetTopEvents?.tyEvents) && banquetTopEvents.tyEvents.length > 0
                        ? banquetTopEvents.tyEvents.join(' · ')
                        : '-'}
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#F4F3EE]/60 border border-[#1B382E]/10 p-3">
                    <div className="font-black text-[#1B382E] mb-1">비교기 주요 대관·세미나 행사 Top 3</div>
                    <div className="text-[11px] text-[#6C7A73]">
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-2 border-t border-[#1B382E]/10 text-xs">
              {executiveSummaryBullets.length > 0 && (
                <div className="rounded-xl bg-[#F4F3EE]/60 border border-[#1B382E]/10 p-3.5 space-y-1.5">
                  <div className="font-black text-[#1B382E]">경영진 핵심 요약 (`executiveSummary`)</div>
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
                <div className="rounded-xl bg-[#E8F2EE]/60 border border-[#284F42]/20 p-3.5 space-y-1.5">
                  <div className="font-black text-[#1E523F]">본부별 즉시 실행 처방 (`immediateActionItems`)</div>
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
