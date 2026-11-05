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

  const fourFactors = rcaData?.fourFactorVerification || null;
  const calFactor = fourFactors?.calendarFactor || null;
  const extWeather = fourFactors?.externalEnvFactor || null;
  const compMarket = fourFactors?.competitorMarketFactor || null;
  const parkingBehavior = fourFactors?.parkingAndBehaviorFactor || null;
  const integrityFactor = fourFactors?.dataIntegrityFactor || null;

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
          <div className="rounded-lg bg-[#F4F3EE]/60 px-3.5 py-2.5 flex items-center justify-between gap-2">
            <span className="text-[#6C7A73] font-semibold shrink-0">날씨 / 공휴일</span>
            <strong className="text-[#1B382E] text-right">
              {isMultiDayPeriod ? (
                <>
                  {fmtText(extWeather?.tyWeatherDesc)} {fmtText(extWeather?.tyTempMax)}°C · 우천{' '}
                  {fmtInt(extWeather?.lyRainyDays)}➔{fmtInt(extWeather?.tyRainyDays)}일 (휴일우천{' '}
                  {fmtInt(extWeather?.lyRedDayRainyDays)}➔{fmtInt(extWeather?.tyRedDayRainyDays)}일 / 평일{' '}
                  {fmtInt(extWeather?.lyWeekdayRainyDays)}➔{fmtInt(extWeather?.tyWeekdayRainyDays)}일) · 공휴일{' '}
                  {fmtInt(calFactor?.lyHolidayDays)}➔{fmtInt(calFactor?.tyHolidayDays)}일 (
                  {fmtSignedInt(calFactor?.holidayDiffDays, '일')})
                </>
              ) : (
                <>
                  {fmtText(extWeather?.tyWeatherDesc)} {fmtText(extWeather?.tyTempMax)}°C (비교기{' '}
                  {fmtText(extWeather?.lyWeatherDesc)} {fmtText(extWeather?.lyTempMax)}°C) · 공휴일{' '}
                  {fmtInt(calFactor?.tyHolidayDays)}일 (차이 {fmtSignedInt(calFactor?.holidayDiffDays, '일')})
                </>
              )}
            </strong>
          </div>

          {/* [카드 2] 경쟁사 만실 여부 */}
          <div className="rounded-lg bg-[#F4F3EE]/60 px-3.5 py-2.5 flex items-center justify-between gap-2">
            <span className="text-[#6C7A73] font-semibold shrink-0">경쟁사 만실 여부</span>
            <strong className="text-[#1B382E] text-right">
              충청 4사 만실 {fmtInt(compMarket?.soldOutResortCount)}/{fmtInt(compMarket?.monitoredResortCount)}곳 (경쟁사 최저가{' '}
              {fmtInt(compMarket?.competitorAvgMinPrice)}원, 평소 대비{' '}
              {fmtPctOne(compMarket?.competitorSameClassSurgeRatioPct, true)})
            </strong>
          </div>

          {/* [카드 3] 콘도 열쇠 가동·수익 */}
          <div className="rounded-lg bg-[#F4F3EE]/60 px-3.5 py-2.5 flex items-center justify-between gap-2">
            <span className="text-[#6C7A73] font-semibold shrink-0">콘도 열쇠 가동·수익</span>
            <strong className="text-[#1B382E] text-right">
              물리열쇠{' '}
              {fmtPctOne(
                condoDetail?.tyPhysicalKeyOccPct ??
                  calFactor?.regimeDynamicThresholds?.actualKeyOccPct ??
                  compMarket?.belleforetPhysicalKeyOccPct
              )}{' '}
              ({fmtInt(condoDetail?.tyOccupiedPhysicalKeys)}/
              {fmtInt(condoDetail?.physicalKeyCapacity ?? compMarket?.belleforetPhysicalKeyCapacity)}키, 기대{' '}
              {fmtPctOne(calFactor?.regimeDynamicThresholds?.expectedKeyOccPct)}) · 열쇠당{' '}
              {fmtInt(condoDetail?.tyKeyYield)}원 ({fmtPct(condoDetail?.keyYieldGrowthPct)})
            </strong>
          </div>

          {/* [카드 4] 골퍼 미숙박 이탈 */}
          <div className="rounded-lg bg-[#F4F3EE]/60 px-3.5 py-2.5 flex items-center justify-between gap-2">
            <span className="text-[#6C7A73] font-semibold shrink-0">골퍼 미숙박 이탈</span>
            <strong className="text-[#1B382E] text-right">
              진성타겟 {fmtInt(compMarket?.unconvertedInternalStayDemand?.coreStayConversionTargetTeams)}팀 중{' '}
              <span className="text-rose-600">
                {fmtInt(compMarket?.unconvertedInternalStayDemand?.coreStayConversionNonStayTeams)}팀 미숙박
              </span>
            </strong>
          </div>

          {/* [카드 5] 투숙객 외부 외출 */}
          <div className="rounded-lg bg-[#F4F3EE]/60 px-3.5 py-2.5 flex items-center justify-between gap-2">
            <span className="text-[#6C7A73] font-semibold shrink-0">투숙객 외부 외출</span>
            <strong className="text-[#1B382E] text-right">
              외출 {fmtInt(parkingBehavior?.tyStayOutingCount ?? fnbDetail?.tyStayOutingCount)}회 (
              <span className="text-rose-600">
                {fmtPctOne(
                  parkingBehavior?.tyStayOutingRatePct ??
                    calFactor?.regimeDynamicThresholds?.actualStayOutingRatePct
                )}
              </span>
              , 경보 기준 {fmtPctOne(calFactor?.regimeDynamicThresholds?.outingAlertThresholdPct)} · 비교기{' '}
              {fmtInt(parkingBehavior?.lyStayOutingCount)}회)
            </strong>
          </div>

          {/* [카드 6] 정산 무결성 / 후정산 */}
          <div className="rounded-lg bg-[#F4F3EE]/60 px-3.5 py-2.5 flex items-center justify-between gap-2">
            <span className="text-[#6C7A73] font-semibold shrink-0">정산 무결성 / 후정산</span>
            <strong className="text-[#1B382E] text-right">
              오차 {fmtInt(integrityFactor?.reconciliationDeltaWon ?? integrityFactor?.gatekeeperDeltaWon)}원 · 후정산 대기{' '}
              {fmtInt(integrityFactor?.cityLedgerPendingAmount ?? integrityFactor?.b2bPostSettlementPendingAmount)}원 (
              {fmtInt(integrityFactor?.cityLedgerPendingCount)}건)
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}
