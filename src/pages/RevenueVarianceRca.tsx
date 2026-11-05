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
  Hotel
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
                {' '}vs 비교일:{' '}
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
              • 전체 방문객 수: <strong className="text-[#1B382E]">{fmtInt(formula?.lyTotalVisitors)}명 ➔ {fmtInt(formula?.tyTotalVisitors)}명</strong> (
              <strong className={Number(formula?.visitorDiffCount) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                {fmtSignedInt(formula?.visitorDiffCount, '명')}
              </strong>
              ) &nbsp;|&nbsp; • 손님 1인당 평균 지출:{' '}
              <strong className="text-[#1B382E]">{fmtInt(formula?.lySpendPerHead)}원 ➔ {fmtInt(formula?.tySpendPerHead)}원</strong> (
              <strong className={Number(formula?.spendPerHeadDiff) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                {fmtSignedInt(formula?.spendPerHeadDiff, '원')}
              </strong>
              )
            </p>
          </div>

          <div className="bg-[#F4F3EE] rounded-xl px-4 py-3 text-right shrink-0">
            <div className="text-xs text-[#6C7A73] font-semibold">
              오늘 매출 {fmtInt(formula?.tyTotalRevenue)}원 (비교일 {fmtInt(formula?.lyTotalRevenue)}원)
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

        {/* 4대 사업부별 어디서 줄고 늘었나? */}
        <div>
          <div className="text-xs font-bold text-[#6C7A73] mb-2.5">
            사업부별 매출 증감 (어느 부문에서 얼마가 줄고 늘었는가)
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
          2. 그렇게 결정한 구체적인 이유 (어느 매장·항목에서 차이나는가?)
         ===================================================================== */}
      <div className="bg-white rounded-2xl border border-[#1B382E]/10 shadow-xs p-5 md:p-6 space-y-5">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#B59269] text-white text-xs font-bold">
            <FileCheck2 size={14} />
            2. 그렇게 결정한 이유 (세부 매장·항목별 실제 증감)
          </span>
          <h2 className="text-base md:text-lg font-black text-[#1B382E] mt-2">
            각 사업부 안에서 실제로 매출이 빠지거나 늘어난 항목입니다
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
              {fmtText(extWeather?.tyWeatherDesc)} {fmtText(extWeather?.tyTempMax)}°C (비교기{' '}
              {fmtText(extWeather?.lyWeatherDesc)} {fmtText(extWeather?.lyTempMax)}°C) · 공휴일{' '}
              {fmtInt(calFactor?.tyHolidayDays)}일
            </strong>
          </div>

          {/* [카드 2] 경쟁사 만실 여부 */}
          <div className="rounded-lg bg-[#F4F3EE]/60 px-3.5 py-2.5 flex items-center justify-between gap-2">
            <span className="text-[#6C7A73] font-semibold shrink-0">경쟁사 만실 여부</span>
            <strong className="text-[#1B382E] text-right">
              충청 4사 만실 {fmtInt(compMarket?.soldOutResortCount)}/{fmtInt(compMarket?.monitoredResortCount)}곳 (최저가{' '}
              {fmtInt(compMarket?.competitorAvgMinPrice)}원, 동요일비{' '}
              {fmtPctOne(compMarket?.competitorSameClassSurgeRatioPct, true)})
            </strong>
          </div>

          {/* [카드 3] 콘도 열쇠 가동·수익 */}
          <div className="rounded-lg bg-[#F4F3EE]/60 px-3.5 py-2.5 flex items-center justify-between gap-2">
            <span className="text-[#6C7A73] font-semibold shrink-0">콘도 열쇠 가동·수익</span>
            <strong className="text-[#1B382E] text-right">
              물리열쇠{' '}
              {fmtPctOne(
                calFactor?.regimeDynamicThresholds?.actualKeyOccPct ??
                  condoDetail?.tyPhysicalKeyOccPct ??
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
              외출 {fmtInt(parkingBehavior?.tyStayOutingCount)}회 (
              <span className="text-rose-600">
                {fmtPctOne(
                  parkingBehavior?.tyStayOutingRatePct ??
                    calFactor?.regimeDynamicThresholds?.actualStayOutingRatePct
                )}
              </span>
              , 경보 기준 {fmtPctOne(calFactor?.regimeDynamicThresholds?.outingAlertThresholdPct)})
            </strong>
          </div>

          {/* [카드 6] 정산 무결성 / 후정산 */}
          <div className="rounded-lg bg-[#F4F3EE]/60 px-3.5 py-2.5 flex items-center justify-between gap-2">
            <span className="text-[#6C7A73] font-semibold shrink-0">정산 무결성 / 후정산</span>
            <strong className="text-[#1B382E] text-right">
              오차 {fmtInt(integrityFactor?.reconciliationDeltaWon)}원 · 후정산 대기{' '}
              {fmtInt(integrityFactor?.cityLedgerPendingAmount)}원 ({fmtInt(integrityFactor?.cityLedgerPendingCount)}건)
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}
