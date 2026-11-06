import { useState, useEffect } from 'react';
import { useDate } from '../contexts/DateContext';
import { secureFetcher } from '../lib/secureFetcher';
import GlobalDatePicker from '../components/GlobalDatePicker';
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Sparkles
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

  // 아코디언 상태 (기본 모두 접힘)
  const [openAiBriefing, setOpenAiBriefing] = useState<boolean>(false);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiFetchedKey, setAiFetchedKey] = useState<string>('');
  const [openFactorAccordion, setOpenFactorAccordion] = useState<boolean>(false);
  const [openSegmentAccordion, setOpenSegmentAccordion] = useState<Record<string, boolean>>({});
  const [openEnvAccordion, setOpenEnvAccordion] = useState<boolean>(false);

  const currentQueryKey = `${dateKey}_${compareMode}`;

  const toggleSegment = (code: string) => {
    setOpenSegmentAccordion((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  const fetchAiBriefing = async (queryKey: string) => {
    setAiLoading(true);
    try {
      const res = await secureFetcher(
        `${API_BASE}/api/v6/report/revenue-variance-rca?startDate=${startDate}&endDate=${effectiveEndDate}&compareMode=${compareMode}&aiBriefing=1`
      ).catch(() => null);

      if (res && res.success) {
        setRcaData(res.data || res);
        setAiFetchedKey(queryKey);
      }
    } finally {
      setAiLoading(false);
    }
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

    if (openAiBriefing) {
      fetchAiBriefing(currentQueryKey);
    }
  };

  const handleToggleAiBriefing = async () => {
    const nextOpen = !openAiBriefing;
    setOpenAiBriefing(nextOpen);

    if (nextOpen && aiFetchedKey !== currentQueryKey) {
      await fetchAiBriefing(currentQueryKey);
    }
  };

  useEffect(() => {
    fetchRcaData();
  }, [startDate, effectiveEndDate, compareMode]);

  const period = rcaData?.period || null;
  const formula = rcaData?.formulaDecomposition || null;
  const aiBriefing = rcaData?.aiBriefing || rcaData?.structuredReport?.aiBriefing || null;
  const aiLabeledSentences: any[] = Array.isArray(aiBriefing?.labeledSentences)
    ? aiBriefing.labeledSentences
    : [];
  const aiSentences: string[] = Array.isArray(aiBriefing?.sentences)
    ? aiBriefing.sentences
    : [];
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
  const timeOfDayLinkages = crossMatrix?.timeOfDayCausalLinkages || null;
  const groupSegmentBreakdown: any[] = Array.isArray(crossMatrix?.groupSegmentVenueBreakdown)
    ? crossMatrix.groupSegmentVenueBreakdown
    : [];
  const banquetTopEvents = crossMatrix?.banquetTopEvents || null;

  const isNegative = Number(formula?.revenueDiffAmount) < 0;

  return (
    <div className="min-h-screen bg-[#F4F3EE] text-[#1B382E] p-4 md:p-6 lg:p-8 space-y-4 max-w-6xl mx-auto">
      {/* =====================================================================
          상단: 제목 및 날짜 선택
         ===================================================================== */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#1B382E]">매출 증감 분석</h1>
          {period && (
            <p className="text-xs text-slate-500 mt-1">
              조회: <strong className="text-[#1B382E]">{fmtText(period?.tyStartDate)} ~ {fmtText(period?.tyEndDate)}</strong> ({fmtInt(period?.dayCount)}일)
              {' '}vs 비교: <strong className="text-[#1B382E]">{fmtText(period?.lyStartDate)} ~ {fmtText(period?.lyEndDate)}</strong>
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <GlobalDatePicker />
          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            {[
              { code: 'YOY_DOW' as const, label: '전년 동요일' },
              { code: 'YOY_DATE' as const, label: isMultiDay ? '전년 같은기간' : '전년 같은날짜' },
              { code: 'MOM' as const, label: '전월 동기' }
            ].map((mode) => (
              <button
                key={mode.code}
                type="button"
                onClick={() => setModeOverride({ key: dateKey, mode: mode.code })}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  compareMode === mode.code
                    ? 'bg-[#1B382E] text-white'
                    : 'text-slate-600 hover:text-[#1B382E]'
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
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1B382E] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            조회
          </button>
        </div>
      </div>

      {/* =====================================================================
          1. 전체 요약 (총매출 · 방문객 · 객단가)
         ===================================================================== */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        {/* 총 매출 증감 */}
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <div className="text-xs font-bold text-slate-500">전체 매출 증감</div>
            <div
              className={`text-2xl md:text-3xl font-black mt-0.5 flex items-center gap-2 ${
                isNegative ? 'text-rose-600' : 'text-emerald-700'
              }`}
            >
              {isNegative ? <TrendingDown size={24} /> : <TrendingUp size={24} />}
              <span>
                {fmtSignedInt(formula?.revenueDiffAmount, '원')} ({fmtPct(formula?.revenueGrowthPct)})
              </span>
            </div>
          </div>
          <div className="text-xs sm:text-right text-slate-500 space-y-0.5">
            <div>
              비교기 <strong className="text-[#1B382E]">{fmtInt(formula?.lyTotalRevenue)}원</strong> ➔ 당기{' '}
              <strong className="text-[#1B382E]">{fmtInt(formula?.tyTotalRevenue)}원</strong>
            </div>
            {calFactor && Number(calFactor?.calendarShiftEffectAmount) !== 0 && (
              <div>
                주말·휴일 일수 차이({fmtInt(calFactor?.lyRedDays)}➔{fmtInt(calFactor?.tyRedDays)}일) 감안 시:{' '}
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

        {/* 방문객 및 1인당 지출 핵심 숫자 4칸 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="rounded-lg border border-slate-200 p-3.5">
            <div className="text-slate-500 font-semibold">전체 방문객</div>
            <div
              className={`text-base font-black mt-1 ${
                Number(formula?.visitorDiffCount) < 0 ? 'text-rose-600' : 'text-emerald-700'
              }`}
            >
              {fmtSignedInt(formula?.visitorDiffCount, '명')} ({fmtPct(formula?.visitorGrowthPct)})
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {fmtInt(formula?.lyTotalVisitors)}명 ➔ {fmtInt(formula?.tyTotalVisitors)}명
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3.5">
            <div className="text-slate-500 font-semibold">골프 손님</div>
            <div
              className={`text-base font-black mt-1 ${
                Number(formula?.golfVisitorDiffCount) < 0 ? 'text-rose-600' : 'text-emerald-700'
              }`}
            >
              {fmtSignedInt(formula?.golfVisitorDiffCount, '명')} ({fmtPct(formula?.golfVisitorGrowthPct)})
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {fmtInt(formula?.lyGolfVisitors)}명 ➔ {fmtInt(formula?.tyGolfVisitors)}명
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3.5">
            <div className="text-slate-500 font-semibold">숙박 · 나들이 손님 (골프 제외)</div>
            <div
              className={`text-base font-black mt-1 ${
                Number(formula?.nonGolfVisitorDiffCount) < 0 ? 'text-rose-600' : 'text-emerald-700'
              }`}
            >
              {fmtSignedInt(formula?.nonGolfVisitorDiffCount, '명')} ({fmtPct(formula?.nonGolfVisitorGrowthPct)})
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              일반숙박 {fmtSignedInt(formula?.pureRoomGuestsExGolfDiffCount, '명')} · 골프숙박{' '}
              {fmtSignedInt(formula?.golfSynergyStayGuestsDiffCount, '명')} · 나들이{' '}
              {fmtSignedInt(formula?.walkinVisitorDiffCount, '명')}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3.5">
            <div className="text-slate-500 font-semibold">1인당 평균 지출</div>
            <div
              className={`text-base font-black mt-1 ${
                Number(formula?.spendPerHeadDiff) < 0 ? 'text-rose-600' : 'text-emerald-700'
              }`}
            >
              {fmtSignedInt(formula?.spendPerHeadDiff, '원')} ({fmtPct(formula?.spendPerHeadGrowthPct)})
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {fmtInt(formula?.lySpendPerHead)}원 ➔ {fmtInt(formula?.tySpendPerHead)}원
            </div>
          </div>
        </div>

        {/* [버튼 클릭형] ✨ AI 핵심 원인 4문장 브리핑 패널 */}
        <div className="border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={handleToggleAiBriefing}
            className="w-full flex items-center justify-between text-xs font-bold text-[#1B382E] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3.5 py-2.5 transition-colors cursor-pointer"
          >
            <span className="inline-flex items-center gap-1.5">
              <Sparkles size={14} className="text-[#1B382E]" />
              <span>✨ AI로 매출 증감 원인 4문장 요약 {openAiBriefing ? '접기' : '보기'}</span>
              {aiLoading && <span className="text-[11px] font-normal text-slate-500 ml-1">(AI 최신 분석 갱신 중...)</span>}
            </span>
            {openAiBriefing ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>

          {openAiBriefing && aiBriefing && (
            <div className="mt-2.5 rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-3 text-xs">
              {aiBriefing?.oneLineTakeaway && (
                <div className="rounded-md bg-white border border-slate-200 px-3 py-2 font-bold text-[#1B382E] leading-relaxed">
                  핵심 요약: {fmtText(aiBriefing.oneLineTakeaway)}
                </div>
              )}

              {aiLabeledSentences.length > 0 ? (
                <div className="space-y-2">
                  {aiLabeledSentences.map((item: any, sIdx: number) => (
                    <div key={item?.step ?? sIdx} className="leading-relaxed text-slate-700">
                      <span className="inline-block font-bold text-[#1B382E] bg-white border border-slate-200 rounded px-1.5 py-0.5 mr-1.5 text-[11px]">
                        [{fmtText(item?.step ?? sIdx + 1)}. {fmtText(item?.tag)}]
                      </span>
                      <span>{fmtText(item?.text)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                aiSentences.length > 0 && (
                  <div className="space-y-1.5">
                    {aiSentences.map((sentence: string, sIdx: number) => (
                      <div key={sIdx} className="leading-relaxed text-slate-700">
                        • {fmtText(sentence)}
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* [아코디언] 4가지 원인별 금액 분해 */}
        {formula && (
          <div className="border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={() => setOpenFactorAccordion((prev) => !prev)}
              className="w-full flex items-center justify-between text-xs font-bold text-slate-600 hover:text-[#1B382E] py-1 cursor-pointer"
            >
              <span>원인별 금액 분해 보기 (방문객 수 · 이용단가 · 식사비 · 연회행사)</span>
              {openFactorAccordion ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>

            {openFactorAccordion && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-3 text-xs">
                <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                  <div className="text-slate-500 font-semibold">① 방문객 수 변화 영향</div>
                  <div
                    className={`text-sm font-black mt-1 ${
                      Number(formula?.shapleyVolumeEffectAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {fmtSignedInt(formula?.shapleyVolumeEffectAmount, '원')}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    인원 증감 {fmtSignedInt(formula?.volumeEffectAmount, '원')} / 손님비중 차이{' '}
                    {fmtSignedInt(formula?.visitorMixEffectAmount, '원')}
                  </div>
                </div>

                <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                  <div className="text-slate-500 font-semibold">② 객실·골프·레저 단가 변화</div>
                  <div
                    className={`text-sm font-black mt-1 ${
                      Number(formula?.coreSegmentPurePriceEffectAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {fmtSignedInt(formula?.coreSegmentPurePriceEffectAmount, '원')}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">1인·1실당 평균 이용요금 차이</div>
                </div>

                <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                  <div className="text-slate-500 font-semibold">③ 식당 1인당 식사비 변화</div>
                  <div
                    className={`text-sm font-black mt-1 ${
                      Number(formula?.pureFnbAttachEffectAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {fmtSignedInt(formula?.pureFnbAttachEffectAmount, '원')}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">방문객 1인당 식당 지출 차이</div>
                </div>

                <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                  <div className="text-slate-500 font-semibold">④ 단체 연회·세미나 행사</div>
                  <div
                    className={`text-sm font-black mt-1 ${
                      Number(formula?.banquetBaseEffectAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {fmtSignedInt(formula?.banquetBaseEffectAmount, '원')}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">세미나·연회 대관 매출 차이</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* =====================================================================
          2. 4대 사업부별 매출 증감 (기본: 매장·품목 요약 / 클릭 시: 경로·상세 아코디언)
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {segmentSummaryRows.map((row: any, idx: number) => {
          const segCode = String(row?.segmentCode || idx);
          const neg = Number(row?.diffAmount) < 0;
          const isOpen = Boolean(openSegmentAccordion[segCode]);

          // 기본 노출: 매장·품목별 증감
          let mainItems: Array<{ label: string; sub?: string; diff: unknown }> = [];
          // 아코디언 노출: 예약경로·고객유형별 증감
          let subItems: Array<{ label: string; sub?: string; diff: unknown }> = [];

          if (segCode === 'CONDO') {
            mainItems = pyungMix.map((p: any) => ({
              label: fmtText(p?.pyungLabel || p?.pyungCode),
              sub: `${fmtInt(p?.lyRooms)}➔${fmtInt(p?.tyRooms)}실`,
              diff: p?.diffRevenue
            }));
            subItems = channelMix.map((ch: any) => ({
              label: fmtText(ch?.channelLabel),
              sub: `${fmtInt(ch?.lyRooms)}➔${fmtInt(ch?.tyRooms)}실 · 평균 ${fmtInt(ch?.tyAdr)}원`,
              diff: ch?.diffRevenue
            }));
          } else if (segCode === 'LEISURE') {
            mainItems = venueVariances.slice(0, 4).map((v: any) => ({
              label: fmtText(v?.venueName),
              sub: `${fmtInt(v?.lyVisitors)}➔${fmtInt(v?.tyVisitors)}명`,
              diff: v?.diffAmount
            }));
            subItems = [
              ...venueVariances.slice(4).map((v: any) => ({
                label: fmtText(v?.venueName),
                sub: `${fmtInt(v?.lyVisitors)}➔${fmtInt(v?.tyVisitors)}명`,
                diff: v?.diffAmount
              })),
              ...groupSegmentBreakdown
                .filter((g: any) => Number(g?.tyLeisureRev) > 0 || Number(g?.leisureDiffRev) !== 0)
                .map((g: any) => ({
                  label: `단체 (${fmtText(g?.segmentLabel)})`,
                  sub: `당기 ${fmtInt(g?.tyLeisureRev)}원`,
                  diff: g?.leisureDiffRev ?? g?.diffRev
                }))
            ];
          } else if (segCode === 'FNB_BANQUET') {
            mainItems = [
              {
                label: '직영 식당',
                sub: `영수증 ${fmtInt(fnbDetail?.lyReceiptCount)}➔${fmtInt(fnbDetail?.tyReceiptCount)}건`,
                diff: fnbDetail?.directFnbDiffAmount
              },
              {
                label: '단체 연회 · 세미나 대관',
                sub: `${fmtInt(fnbDetail?.lyBanquetRevenue)}➔${fmtInt(fnbDetail?.tyBanquetRevenue)}원`,
                diff: fnbDetail?.banquetDiffAmount
              }
            ];
            subItems = groupSegmentBreakdown
              .filter((g: any) => Number(g?.tyFnbRev) > 0 || Number(g?.fnbDiffRev) !== 0)
              .map((g: any) => ({
                label: `단체 (${fmtText(g?.segmentLabel)})`,
                sub: `당기 ${fmtInt(g?.tyFnbRev)}원`,
                diff: g?.fnbDiffRev ?? g?.diffRev
              }));
          } else if (segCode === 'GOLF') {
            if (golfRevComp) {
              mainItems = [
                {
                  label: '그린피 (입장료)',
                  sub: `${fmtInt(golfRevComp?.lyGreenFeeRevenue)}➔${fmtInt(golfRevComp?.tyGreenFeeRevenue)}원`,
                  diff: golfRevComp?.greenFeeDiff
                },
                {
                  label: '프로샵 · 부대매출',
                  sub: `${fmtInt(golfRevComp?.lyProshopAndClubhouseExtraRevenue)}➔${fmtInt(golfRevComp?.tyProshopAndClubhouseExtraRevenue)}원`,
                  diff: golfRevComp?.extraRevenueDiff
                },
                {
                  label: '카트 대여료',
                  sub: `${fmtInt(golfRevComp?.lyCartFeeRevenue)}➔${fmtInt(golfRevComp?.tyCartFeeRevenue)}원`,
                  diff: golfRevComp?.cartFeeDiff
                }
              ];
            }
            subItems = golfChannelMix.map((gc: any) => ({
              label: fmtText(gc?.channelLabel),
              sub: `${fmtInt(gc?.lyPlayers)}➔${fmtInt(gc?.tyPlayers)}명`,
              diff: gc?.diffGreenFee
            }));
          }

          return (
            <div key={segCode} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              {/* 사업부 헤더 */}
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <div className="text-base font-black text-[#1B382E]">{fmtText(row?.segmentName)}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {fmtInt(row?.lyRevenue)}원 ➔ {fmtInt(row?.tyRevenue)}원
                    {row?.visitorDiff !== null && row?.visitorDiff !== undefined && (
                      <span>
                        {' '}
                        · {fmtText(row?.visitorMetricLabel || (segCode === 'LEISURE' ? '시설 이용(티켓 연인원)' : '방문객'))}{' '}
                        <strong className={Number(row?.visitorDiff) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                          {fmtSignedInt(row?.visitorDiff, '명')}
                        </strong>
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-black ${neg ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {fmtSignedInt(row?.diffAmount, '원')}
                  </div>
                  <div className={`text-xs font-bold ${neg ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {fmtPct(row?.growthPct)}
                  </div>
                </div>
              </div>

              {/* 기본 노출: 주요 품목·매장 증감 */}
              <div className="divide-y divide-slate-100 text-xs">
                {mainItems.map((item, mIdx) => {
                  const itemNeg = Number(item.diff) < 0;
                  return (
                    <div key={mIdx} className="flex items-center justify-between py-1.5 gap-2">
                      <div>
                        <span className="font-bold text-[#1B382E]">{item.label}</span>
                        {item.sub && <span className="text-slate-500 ml-1.5">({item.sub})</span>}
                      </div>
                      <strong className={itemNeg ? 'text-rose-600' : 'text-emerald-700'}>
                        {fmtSignedInt(item.diff, '원')}
                      </strong>
                    </div>
                  );
                })}
              </div>

              {/* 아코디언 버튼: 예약경로 및 상세 정보 */}
              <div className="pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => toggleSegment(segCode)}
                  className="w-full flex items-center justify-between text-xs font-bold text-slate-600 hover:text-[#1B382E] py-1 cursor-pointer"
                >
                  <span>예약경로 · 시간대 · 상세 내역 {isOpen ? '접기' : '보기'}</span>
                  {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>

                {isOpen && (
                  <div className="mt-2 pt-2.5 border-t border-slate-100 space-y-2.5 text-xs">
                    {subItems.length > 0 && (
                      <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                        <div className="text-[11px] font-bold text-slate-500 mb-1">
                          예약경로 · 고객유형별 내역
                        </div>
                        {subItems.map((sItem, sIdx) => {
                          const sNeg = Number(sItem.diff) < 0;
                          return (
                            <div key={sIdx} className="flex items-center justify-between py-0.5">
                              <div>
                                <span className="font-semibold text-[#1B382E]">{sItem.label}</span>
                                {sItem.sub && <span className="text-slate-500 ml-1.5">({sItem.sub})</span>}
                              </div>
                              <strong className={sNeg ? 'text-rose-600' : 'text-emerald-700'}>
                                {fmtSignedInt(sItem.diff, '원')}
                              </strong>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* 사업부별 고유 참고 수치 (중복 없이 해당 카드에만 표시) */}
                    {segCode === 'CONDO' && (
                      <div className="text-slate-600 space-y-1 leading-relaxed">
                        <div>
                          • 판매 객실: {fmtInt(condoDetail?.lyOccupiedRooms)}➔{fmtInt(condoDetail?.tyOccupiedRooms)}실
                          (평균 객실단가 {fmtInt(condoDetail?.tyAdr)}원 · 미판매 빈방 {fmtInt(condoDetail?.tyUnsoldPhysicalKeys)}실)
                        </div>
                        {compMarket?.unconvertedInternalStayDemand && (
                          <div>
                            • 숙박 가능 골퍼 {fmtInt(compMarket?.unconvertedInternalStayDemand?.coreStayConversionTargetTeams)}팀 중{' '}
                            <strong className="text-rose-600">
                              {fmtInt(compMarket?.unconvertedInternalStayDemand?.coreStayConversionNonStayTeams)}팀 미숙박 당일 귀가
                            </strong>
                          </div>
                        )}
                      </div>
                    )}

                    {segCode === 'LEISURE' && (
                      <div className="text-slate-600 space-y-1 leading-relaxed">
                        <div>
                          • 야외 매장 합계: {fmtSignedInt(leisureDetail?.outdoorDiffAmount, '원')} / 실내 매장 합계:{' '}
                          {fmtSignedInt(leisureDetail?.indoorDiffAmount, '원')}
                        </div>
                        <div>
                          • 4시간 이상 머문 나들이 차량: {fmtInt(parkingBehavior?.lyWalkinLongDwell4hPlusCars)}➔
                          {fmtInt(parkingBehavior?.tyWalkinLongDwell4hPlusCars)}대 (평균 체류{' '}
                          {fmtInt(parkingBehavior?.tyWalkinAvgDwellMinutes)}분)
                        </div>
                      </div>
                    )}

                    {segCode === 'FNB_BANQUET' && (
                      <div className="text-slate-600 space-y-1 leading-relaxed">
                        {timeOfDayLinkages && (
                          <div>
                            • 당기 시간대별 식당 매출: 아침(06~10시){' '}
                            <strong>{fmtInt(timeOfDayLinkages?.morning06To10?.tyRevenue)}원</strong>(
                            {fmtPctOne(timeOfDayLinkages?.morning06To10?.sharePct)}) · 점심(11~17시){' '}
                            <strong>{fmtInt(timeOfDayLinkages?.lunchAndAfternoon11To17?.tyRevenue)}원</strong>(
                            {fmtPctOne(timeOfDayLinkages?.lunchAndAfternoon11To17?.sharePct)}) · 저녁(18시~){' '}
                            <strong>{fmtInt(timeOfDayLinkages?.evening18Plus?.tyRevenue)}원</strong>(
                            {fmtPctOne(timeOfDayLinkages?.evening18Plus?.sharePct)})
                          </div>
                        )}
                        <div>
                          • 숙박 차량 단지 밖 식당·마트 외출:{' '}
                          {fmtInt(fnbDetail?.lyStayOutingCount ?? parkingBehavior?.lyStayOutingCount)}➔
                          <strong className="text-rose-600">
                            {fmtInt(fnbDetail?.tyStayOutingCount ?? parkingBehavior?.tyStayOutingCount)}회
                          </strong>{' '}
                          (외출 비율 {fmtPctOne(fnbDetail?.tyStayOutingRatePct ?? parkingBehavior?.tyStayOutingRatePct)})
                        </div>
                        <div>
                          • 입점 임대매장(편의점·카페 등): {fmtInt(fnbDetail?.lyOutsourcedFnbRevenue)}➔
                          {fmtInt(fnbDetail?.tyOutsourcedFnbRevenue)}원 ({fmtPct(fnbDetail?.outsourcedFnbGrowthPct)})
                        </div>
                      </div>
                    )}

                    {segCode === 'GOLF' && (
                      <div className="text-slate-600 space-y-1 leading-relaxed">
                        <div>
                          • 내장객 구성: 회원 {fmtInt(golfDetail?.lyMemberPlayers)}➔{fmtInt(golfDetail?.tyMemberPlayers)}명 / 비회원{' '}
                          {fmtInt(golfDetail?.lyNonMemberPlayers)}➔{fmtInt(golfDetail?.tyNonMemberPlayers)}명
                        </div>
                        {golfVisitorBehavior && (
                          <div>
                            • 연단체·위임 예약:{' '}
                            {fmtInt(golfVisitorBehavior?.lyDelegatedBookings ?? golfVisitorBehavior?.lyDelegatedGroupBookings)}➔
                            {fmtInt(golfVisitorBehavior?.tyDelegatedBookings ?? golfVisitorBehavior?.tyDelegatedGroupBookings)}건
                            (티오프 평균 {fmtInt(golfVisitorBehavior?.tyAvgPreTeeArrivalMinutes)}분 전 도착)
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* =====================================================================
          3. 외부 환경 (요일 · 날씨 · 주변 리조트 · 정산) — 한 줄 요약 + 상세 아코디언
         ===================================================================== */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
            <div className="text-slate-500 font-semibold">요일 · 공휴일 비교</div>
            <div className="font-bold text-[#1B382E] mt-1">
              주말(토·일) {fmtInt(calFactor?.lyWeekendDays)}➔{fmtInt(calFactor?.tyWeekendDays)}일 · 공휴일{' '}
              {fmtInt(calFactor?.lyHolidayDays)}➔{fmtInt(calFactor?.tyHolidayDays)}일
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {Number(calFactor?.calendarShiftEffectAmount) === 0
                ? '요일·휴일 일수 차이 없음 (보정 불필요)'
                : `일수 차이 영향 ${fmtSignedInt(calFactor?.calendarShiftEffectAmount, '원')}`}
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
            <div className="text-slate-500 font-semibold">날씨 (비 온 날 · 강수량)</div>
            <div className="font-bold text-[#1B382E] mt-1">
              비 온 날 {fmtInt(extWeather?.lyRainyDays)}➔{fmtInt(extWeather?.tyRainyDays)}일 (강수량{' '}
              {fmtText(extWeather?.lyRainfallMm)}➔{fmtText(extWeather?.tyRainfallMm)}mm)
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              주말·휴일 비 {fmtInt(extWeather?.lyRedDayRainyDays)}➔{fmtInt(extWeather?.tyRedDayRainyDays)}일 · 최고기온{' '}
              {fmtText(extWeather?.tyTempMax)}°C
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
            <div className="text-slate-500 font-semibold">주변 경쟁 리조트 · 정산 점검</div>
            <div className="font-bold text-[#1B382E] mt-1">
              {Number(period?.dayCount) > 1 ? (
                <>
                  충청 4곳 평균 만실률 {fmtPctOne(compMarket?.avgCompetitorSoldOutRatePct)} (최근{' '}
                  {fmtInt(compMarket?.matchedSnapshotDays)}일 수집 · 최저가 평균{' '}
                  {fmtInt(compMarket?.competitorAvgMinPrice)}원)
                </>
              ) : (
                <>
                  충청 4곳 중 당일 만실 {fmtInt(compMarket?.soldOutResortCount)}곳 (최저가 평균{' '}
                  {fmtInt(compMarket?.competitorAvgMinPrice)}원)
                </>
              )}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              일마감 정산 오차{' '}
              {fmtInt(
                integrityFactor?.reconciliationDeltaWon ??
                  integrityFactor?.gatekeeperDeltaWon ??
                  integrityFactor?.gatekeeperDeltaAmount
              )}
              원 · 미분류 {fmtInt(integrityFactor?.unmappedCandidateCount)}건 · 외상 대기{' '}
              {fmtInt(integrityFactor?.cityLedgerPendingCount)}건
            </div>
          </div>
        </div>

        {/* [아코디언] 휴일·평일 평균 매출 및 단체 행사 상세 */}
        <div className="border-t border-slate-100 pt-2">
          <button
            type="button"
            onClick={() => setOpenEnvAccordion((prev) => !prev)}
            className="w-full flex items-center justify-between text-xs font-bold text-slate-600 hover:text-[#1B382E] py-1 cursor-pointer"
          >
            <span>휴일·평일 평균 매출 및 주변 리조트·단체 행사 상세 {openEnvAccordion ? '접기' : '보기'}</span>
            {openEnvAccordion ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>

          {openEnvAccordion && (
            <div className="pt-3 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 space-y-1">
                  <div className="font-bold text-[#1B382E]">요일 · 날씨별 하루 평균 매출</div>
                  <div className="flex justify-between text-slate-600">
                    <span>• 주말·공휴일 하루 평균</span>
                    <strong>
                      {fmtInt(calFactor?.lyRedDayAvgRevenue)}➔{fmtInt(calFactor?.tyRedDayAvgRevenue)}원 (
                      {fmtPct(calFactor?.redDayDailyAvgGrowthPct)})
                    </strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>• 평일(주중) 하루 평균</span>
                    <strong>
                      {fmtInt(calFactor?.lyWeekdayAvgRevenue)}➔{fmtInt(calFactor?.tyWeekdayAvgRevenue)}원 (
                      {fmtPct(calFactor?.weekdayDailyAvgGrowthPct)})
                    </strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>• 당기 맑은 날 vs 비 온 날 평균</span>
                    <strong>
                      맑은 날 {fmtInt(extWeather?.tyClearDayAvgRevenue)}원 / 비 온 날{' '}
                      {fmtInt(extWeather?.tyRainyDayAvgRevenue)}원
                    </strong>
                  </div>
                  {Array.isArray(compMarket?.competitorResorts) && compMarket.competitorResorts.length > 0 && (
                    <div className="pt-1.5 mt-1.5 border-t border-slate-200 text-slate-600">
                      <span className="font-semibold text-[#1B382E]">
                        • 주변 4곳 마감일수 (수집 {fmtInt(compMarket?.matchedSnapshotDays)}일 기준):{' '}
                      </span>
                      {compMarket.competitorResorts
                        .map(
                          (r: any) =>
                            `${fmtText(r?.resortName)} ${fmtInt(r?.soldOutDays)}일(${fmtPctOne(r?.soldOutRatePct)})`
                        )
                        .join(' · ')}
                    </div>
                  )}
                </div>

                {banquetTopEvents && (
                  <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 space-y-1.5">
                    <div className="font-bold text-[#1B382E]">주요 연회 · 세미나 대관 행사</div>
                    <div className="text-slate-600">
                      <span className="font-semibold text-[#1B382E]">당기: </span>
                      {Array.isArray(banquetTopEvents?.tyEvents) && banquetTopEvents.tyEvents.length > 0
                        ? banquetTopEvents.tyEvents.join(' · ')
                        : '-'}
                    </div>
                    <div className="text-slate-600">
                      <span className="font-semibold text-[#1B382E]">비교기: </span>
                      {Array.isArray(banquetTopEvents?.lyEvents) && banquetTopEvents.lyEvents.length > 0
                        ? banquetTopEvents.lyEvents.join(' · ')
                        : '-'}
                    </div>
                  </div>
                )}
              </div>

              {groupSegmentBreakdown.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-[#1B382E] font-bold border-b border-slate-200">
                        <th className="py-2 px-3">단체 고객 유형</th>
                        <th className="py-2 px-3 text-right">당기 식당</th>
                        <th className="py-2 px-3 text-right">당기 레저</th>
                        <th className="py-2 px-3 text-right">당기 합계</th>
                        <th className="py-2 px-3 text-right">비교기 대비 증감</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {groupSegmentBreakdown.map((seg: any, sIdx: number) => {
                        const sNeg = Number(seg?.diffRev) < 0;
                        return (
                          <tr key={seg?.segmentCode || sIdx}>
                            <td className="py-2 px-3 font-bold text-[#1B382E]">{fmtText(seg?.segmentLabel)}</td>
                            <td className="py-2 px-3 text-right">{fmtInt(seg?.tyFnbRev)}원</td>
                            <td className="py-2 px-3 text-right">{fmtInt(seg?.tyLeisureRev)}원</td>
                            <td className="py-2 px-3 text-right font-bold">{fmtInt(seg?.tyTotalRev)}원</td>
                            <td className={`py-2 px-3 text-right font-bold ${sNeg ? 'text-rose-600' : 'text-emerald-700'}`}>
                              {fmtSignedInt(seg?.diffRev, '원')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
