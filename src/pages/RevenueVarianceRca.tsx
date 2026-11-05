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
  Layers,
  Users,
  DoorOpen
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

  // 상세 펼쳐보기 토글 상태
  const [showCheckDetail, setShowCheckDetail] = useState<boolean>(false);
  const [showVolumeHelp, setShowVolumeHelp] = useState<boolean>(false);
  const [showCalendarDetail, setShowCalendarDetail] = useState<boolean>(false);
  const [showWeatherDetail, setShowWeatherDetail] = useState<boolean>(false);
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
  const redDayBucket = crossMatrix?.stratifiedByDayType?.redDayWeekendHolidayBucket || null;
  const weekdayBucket = crossMatrix?.stratifiedByDayType?.weekdayBucket || null;
  const timeOfDayLinkages = crossMatrix?.timeOfDayCausalLinkages || null;
  const groupSegmentBreakdown: any[] = Array.isArray(crossMatrix?.groupSegmentVenueBreakdown)
    ? crossMatrix.groupSegmentVenueBreakdown
    : [];
  const banquetTopEvents = crossMatrix?.banquetTopEvents || null;

  const isNegative = Number(formula?.revenueDiffAmount) < 0;
  const upSegments = segmentSummaryRows.filter((r: any) => Number(r?.diffAmount) > 0);
  const downSegments = segmentSummaryRows.filter((r: any) => Number(r?.diffAmount) < 0);

  // 사업부별 카드 렌더러 (품목축 vs 채널축 분리 + 쉬운 한국어 요약)
  const renderSegmentCard = (row: any, idx: number) => {
    const segCode = String(row?.segmentCode || idx);
    const neg = Number(row?.diffAmount) < 0;
    const isDiagOpen = Boolean(openSegmentDiag[segCode]);

    let productAxisItems: Array<{ label: string; sub?: string; diff: unknown }> = [];
    let channelAxisItems: Array<{ label: string; sub?: string; diff: unknown }> = [];

    if (segCode === 'CONDO') {
      productAxisItems = pyungMix.map((p: any) => ({
        label: fmtText(p?.pyungLabel || p?.pyungCode),
        sub: `${fmtInt(p?.lyRooms)}➔${fmtInt(p?.tyRooms)}실 (${fmtSignedInt(p?.diffRooms, '실')})`,
        diff: p?.diffRevenue
      }));
      channelAxisItems = channelMix.map((ch: any) => ({
        label: fmtText(ch?.channelLabel),
        sub: `${fmtInt(ch?.lyRooms)}➔${fmtInt(ch?.tyRooms)}실 · 평균 ${fmtInt(ch?.tyAdr)}원`,
        diff: ch?.diffRevenue
      }));
    } else if (segCode === 'LEISURE') {
      productAxisItems = venueVariances.map((v: any) => ({
        label: fmtText(v?.venueName),
        sub: `${fmtInt(v?.lyVisitors)}➔${fmtInt(v?.tyVisitors)}명`,
        diff: v?.diffAmount
      }));
      channelAxisItems = groupSegmentBreakdown
        .filter((g: any) => Number(g?.tyLeisureRev) > 0 || Number(g?.leisureDiffRev) !== 0)
        .map((g: any) => ({
          label: fmtText(g?.segmentLabel),
          sub: `당기 ${fmtInt(g?.tyLeisureRev)}원`,
          diff: g?.leisureDiffRev ?? g?.diffRev
        }));
    } else if (segCode === 'FNB_BANQUET') {
      productAxisItems = [
        {
          label: '직영 식당 일반 매출',
          sub: `결제 ${fmtInt(fnbDetail?.lyReceiptCount)}➔${fmtInt(fnbDetail?.tyReceiptCount)}건 · 건당 ${fmtInt(fnbDetail?.tyAvgCheckPerReceipt)}원`,
          diff: fnbDetail?.directFnbDiffAmount
        },
        {
          label: '단체 연회 · 세미나 대관',
          sub: `${fmtInt(fnbDetail?.lyBanquetRevenue)}➔${fmtInt(fnbDetail?.tyBanquetRevenue)}원`,
          diff: fnbDetail?.banquetDiffAmount
        }
      ];
      channelAxisItems = groupSegmentBreakdown
        .filter((g: any) => Number(g?.tyFnbRev) > 0 || Number(g?.fnbDiffRev) !== 0)
        .map((g: any) => ({
          label: fmtText(g?.segmentLabel),
          sub: `당기 ${fmtInt(g?.tyFnbRev)}원`,
          diff: g?.fnbDiffRev ?? g?.diffRev
        }));
    } else if (segCode === 'GOLF') {
      if (golfRevComp) {
        productAxisItems = [
          {
            label: '그린피 (입장료)',
            sub: `${fmtInt(golfRevComp?.lyGreenFeeRevenue)}➔${fmtInt(golfRevComp?.tyGreenFeeRevenue)}원`,
            diff: golfRevComp?.greenFeeDiff
          },
          {
            label: '프로샵 · 클럽하우스 부대매출',
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
        {/* 1) 사업부 헤더 */}
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

        {/* 콘도 / 레저 핵심 손님 구성 안내 (어려운 전문용어 없이 한 줄 표기) */}
        {segCode === 'CONDO' && formula?.pureRoomGuestsExGolfDiffCount !== undefined && (
          <div className="rounded-lg bg-amber-50/70 border border-amber-200 px-3 py-2 text-xs flex flex-wrap items-center justify-between gap-2">
            <span className="font-extrabold text-amber-950">숙박 손님 구성 변화</span>
            <span className="text-[#1B382E]">
              일반 가족·단체 숙박객{' '}
              <strong
                className={
                  Number(formula?.pureRoomGuestsExGolfDiffCount) < 0 ? 'text-rose-600' : 'text-emerald-700'
                }
              >
                {fmtInt(formula?.lyPureRoomGuestsExGolf)}➔{fmtInt(formula?.tyPureRoomGuestsExGolf)}명 (
                {fmtSignedInt(formula?.pureRoomGuestsExGolfDiffCount, '명')})
              </strong>{' '}
              / 골프 치러 온 숙박객{' '}
              <strong
                className={
                  Number(formula?.golfSynergyStayGuestsDiffCount) < 0 ? 'text-rose-600' : 'text-emerald-700'
                }
              >
                {fmtInt(formula?.lyGolfSynergyStayGuests)}➔{fmtInt(formula?.tyGolfSynergyStayGuests)}명 (
                {fmtSignedInt(formula?.golfSynergyStayGuestsDiffCount, '명')})
              </strong>
            </span>
          </div>
        )}

        {segCode === 'LEISURE' && formula?.nonGolfVisitorDiffCount !== undefined && (
          <div className="rounded-lg bg-amber-50/70 border border-amber-200 px-3 py-2 text-xs flex flex-wrap items-center justify-between gap-2">
            <span className="font-extrabold text-amber-950">레저 이용 손님(골프 제외) 변화</span>
            <span className="text-[#1B382E]">
              총{' '}
              <strong
                className={Number(formula?.nonGolfVisitorDiffCount) < 0 ? 'text-rose-600' : 'text-emerald-700'}
              >
                {fmtInt(formula?.lyNonGolfVisitors)}➔{fmtInt(formula?.tyNonGolfVisitors)}명 (
                {fmtSignedInt(formula?.nonGolfVisitorDiffCount, '명')})
              </strong>{' '}
              [일반 숙박객 {fmtSignedInt(formula?.pureRoomGuestsExGolfDiffCount, '명')} · 당일 나들이객{' '}
              {fmtSignedInt(formula?.walkinVisitorDiffCount, '명')}]
            </span>
          </div>
        )}

        {/* 2) [매장·품목별 증감] vs [예약경로·고객유형별 증감] 2축 분리 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5 text-xs">
          {productAxisItems.length > 0 && (
            <div className="rounded-lg bg-[#F8F7F3] p-3 border border-[#1B382E]/10 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-[#284F42] text-white text-[11px] font-extrabold">
                  ① 매장 · 품목별 증감
                </span>
                <span className="text-[10px] text-[#6C7A73] font-semibold">합계 = 사업부 증감액</span>
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

          {channelAxisItems.length > 0 && (
            <div className="rounded-lg bg-[#F4F3EE]/60 p-3 border border-[#B59269]/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-[#8C6D46] text-white text-[11px] font-extrabold">
                  ② 예약경로 · 고객유형별 증감
                </span>
                <span className="text-[10px] text-[#8C6D46] font-semibold">①번과 별도 분류</span>
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

        {/* 3) 클릭 시 펼쳐보는 쉬운 한국어 사업부 핵심 요약 */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => toggleSegmentDiag(segCode)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#E8F2EE]/70 hover:bg-[#E8F2EE] border border-[#284F42]/20 text-xs font-bold text-[#1E523F] transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <HelpCircle size={13} />
              <span>{fmtText(row?.segmentName)} 세부 운영지표 {isDiagOpen ? '접기' : '보기'}</span>
            </span>
            {isDiagOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {isDiagOpen && (
            <div className="mt-1.5 rounded-lg bg-[#F8F7F3] border border-[#284F42]/20 p-3 text-xs text-[#1B382E] space-y-1.5 leading-relaxed">
              {segCode === 'CONDO' && (
                <>
                  <div>
                    • <strong>전체 판매 객실 수</strong>: {fmtInt(condoDetail?.lyOccupiedRooms)}실 ➔{' '}
                    <strong>{fmtInt(condoDetail?.tyOccupiedRooms)}실</strong> (객실당 평균 단가{' '}
                    {fmtInt(condoDetail?.lyAdr)}원 ➔ <strong>{fmtInt(condoDetail?.tyAdr)}원</strong>)
                  </div>
                  <div>
                    • <strong>실제 사용된 방 개수 (51평은 방 2개 사용 반영)</strong>:{' '}
                    {fmtInt(condoDetail?.tyOccupiedPhysicalKeys)}실 사용 / 미판매 빈방{' '}
                    <strong className="text-rose-600">{fmtInt(condoDetail?.tyUnsoldPhysicalKeys)}실</strong> (방 1개당 평균 매출{' '}
                    {fmtInt(condoDetail?.lyKeyYield)}원 ➔ {fmtInt(condoDetail?.tyKeyYield)}원,{' '}
                    {fmtPct(condoDetail?.keyYieldGrowthPct)})
                  </div>
                  {compMarket?.unconvertedInternalStayDemand && (
                    <div>
                      • <strong>골프 치고 숙박하지 않은 손님</strong>: 숙박 가능 골퍼{' '}
                      {fmtInt(compMarket?.unconvertedInternalStayDemand?.coreStayConversionTargetTeams)}팀 중{' '}
                      <strong className="text-rose-600">
                        {fmtInt(compMarket?.unconvertedInternalStayDemand?.coreStayConversionNonStayTeams)}팀이 당일 귀가
                      </strong>
                    </div>
                  )}
                </>
              )}

              {segCode === 'LEISURE' && (
                <>
                  <div>
                    • <strong>야외 vs 실내 시설 증감</strong>: 야외 시설{' '}
                    <strong className={Number(leisureDetail?.outdoorDiffAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                      {fmtSignedInt(leisureDetail?.outdoorDiffAmount, '원')}
                    </strong>{' '}
                    / 실내 시설{' '}
                    <strong className={Number(leisureDetail?.indoorDiffAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                      {fmtSignedInt(leisureDetail?.indoorDiffAmount, '원')}
                    </strong>
                  </div>
                  <div>
                    • <strong>4시간 이상 오래 머문 나들이 차량</strong>:{' '}
                    {fmtInt(parkingBehavior?.lyWalkinLongDwell4hPlusCars)}대 ➔{' '}
                    <strong>{fmtInt(parkingBehavior?.tyWalkinLongDwell4hPlusCars)}대</strong> (평균 체류시간{' '}
                    {fmtInt(parkingBehavior?.lyWalkinAvgDwellMinutes)}분 ➔{' '}
                    {fmtInt(parkingBehavior?.tyWalkinAvgDwellMinutes)}분)
                  </div>
                </>
              )}

              {segCode === 'FNB_BANQUET' && (
                <>
                  <div>
                    • <strong>숙박 차량이 단지 밖 식당·마트로 외출한 횟수</strong>:{' '}
                    {fmtInt(fnbDetail?.lyStayOutingCount ?? parkingBehavior?.lyStayOutingCount)}회 ➔{' '}
                    <strong className="text-rose-600">
                      {fmtInt(fnbDetail?.tyStayOutingCount ?? parkingBehavior?.tyStayOutingCount)}회
                    </strong>{' '}
                    (숙박 차량 중 외출 비율 {fmtPctOne(fnbDetail?.tyStayOutingRatePct ?? parkingBehavior?.tyStayOutingRatePct)})
                  </div>
                  <div>
                    • <strong>단지 내 임대 매장(편의점·카페 등) 매출</strong>:{' '}
                    {fmtInt(fnbDetail?.lyOutsourcedFnbRevenue)}원 ➔{' '}
                    <strong>{fmtInt(fnbDetail?.tyOutsourcedFnbRevenue)}원</strong> (
                    {fmtPct(fnbDetail?.outsourcedFnbGrowthPct)})
                  </div>
                </>
              )}

              {segCode === 'GOLF' && (
                <>
                  <div>
                    • <strong>회원 vs 비회원 내장객 수</strong>: 회원 {fmtInt(golfDetail?.lyMemberPlayers)}명 ➔{' '}
                    <strong>{fmtInt(golfDetail?.tyMemberPlayers)}명</strong> / 비회원{' '}
                    {fmtInt(golfDetail?.lyNonMemberPlayers)}명 ➔{' '}
                    <strong>{fmtInt(golfDetail?.tyNonMemberPlayers)}명</strong>
                  </div>
                  {golfVisitorBehavior && (
                    <div>
                      • <strong>연단체·총무 위임 예약</strong>:{' '}
                      {fmtInt(golfVisitorBehavior?.lyDelegatedBookings ?? golfVisitorBehavior?.lyDelegatedGroupBookings)}건 ➔{' '}
                      <strong>
                        {fmtInt(golfVisitorBehavior?.tyDelegatedBookings ?? golfVisitorBehavior?.tyDelegatedGroupBookings)}건
                      </strong>{' '}
                      (티오프 평균 {fmtInt(golfVisitorBehavior?.tyAvgPreTeeArrivalMinutes)}분 전 도착)
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
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
              매출 증감 원인 요약
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
                { code: 'YOY_DATE' as const, label: isMultiDay ? '전년 같은기간 (월/일)' : '전년 같은날짜' },
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
          섹션 1. 한눈에 보는 핵심 결론 (왜 매출이 늘고 줄었는가?)
         ===================================================================== */}
      <div className="bg-white rounded-2xl border-2 border-[#284F42] shadow-xs p-5 md:p-6 space-y-5">
        {/* 상단 타이틀 + 우측 총매출 증감액 */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 pb-4 border-b border-[#1B382E]/10">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#284F42] text-white text-xs font-bold">
                <Target size={14} />
                1. 핵심 결론 — 왜 매출이 {isNegative ? '감소' : '증가'}했는가?
              </span>
              <span className="px-2.5 py-1 rounded-md bg-[#F4F3EE] border border-[#1B382E]/15 text-xs font-bold text-[#1B382E]">
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

            {/* 방문객 2단 분리 배지: [전체 방문객] vs [골프 손님] vs [일반 숙박 + 나들이 손님] */}
            {formula && (formula?.golfVisitorDiffCount !== undefined || formula?.nonGolfVisitorDiffCount !== undefined) && (
              <div className="rounded-xl bg-[#F8F7F3] border border-[#1B382E]/15 p-3.5 space-y-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="px-2.5 py-1.5 rounded-lg bg-white border border-[#1B382E]/15 font-bold">
                    <span className="text-[#5A6B63]">전체 방문객: </span>
                    <span className="text-[#1B382E]">
                      {fmtInt(formula?.lyTotalVisitors)}➔{fmtInt(formula?.tyTotalVisitors)}명
                    </span>{' '}
                    <strong className={Number(formula?.visitorDiffCount) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                      ({fmtSignedInt(formula?.visitorDiffCount, '명')} / {fmtPct(formula?.visitorGrowthPct)})
                    </strong>
                  </div>

                  <div className="px-2.5 py-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200 font-bold">
                    <span className="text-emerald-900">⛳ 골프 손님: </span>
                    <span className="text-[#1B382E]">
                      {fmtInt(formula?.lyGolfVisitors)}➔{fmtInt(formula?.tyGolfVisitors)}명
                    </span>{' '}
                    <strong className={Number(formula?.golfVisitorDiffCount) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                      ({fmtSignedInt(formula?.golfVisitorDiffCount, '명')} / {fmtPct(formula?.golfVisitorGrowthPct)})
                    </strong>
                  </div>

                  <div className="px-2.5 py-1.5 rounded-lg bg-amber-50/80 border-2 border-amber-300 font-bold">
                    <span className="text-amber-950 font-extrabold">
                      👨‍👩‍👧‍👦 골프 제외 방문객 (레저·식당 이용 손님):{' '}
                    </span>
                    <span className="text-[#1B382E]">
                      {fmtInt(formula?.lyNonGolfVisitors)}➔{fmtInt(formula?.tyNonGolfVisitors)}명
                    </span>{' '}
                    <strong
                      className={Number(formula?.nonGolfVisitorDiffCount) < 0 ? 'text-rose-600' : 'text-emerald-700'}
                    >
                      ({fmtSignedInt(formula?.nonGolfVisitorDiffCount, '명')} / {fmtPct(formula?.nonGolfVisitorGrowthPct)})
                    </strong>
                  </div>
                </div>

                {/* 2단: 숙박·나들이 3가지 세부 손님 분류 */}
                <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-[#1B382E]/10 text-[11px]">
                  <span className="font-extrabold text-[#284F42]">└ 세부 손님 내역:</span>

                  <div className="px-2.5 py-1 rounded bg-white border border-[#1B382E]/10">
                    <span className="text-[#5A6B63] font-semibold">① 일반 가족·단체 숙박객(골프 미이용): </span>
                    <strong className="text-[#1B382E]">
                      {fmtInt(formula?.lyPureRoomGuestsExGolf)}➔{fmtInt(formula?.tyPureRoomGuestsExGolf)}명
                    </strong>{' '}
                    <strong
                      className={
                        Number(formula?.pureRoomGuestsExGolfDiffCount) < 0 ? 'text-rose-600' : 'text-emerald-700'
                      }
                    >
                      ({fmtSignedInt(formula?.pureRoomGuestsExGolfDiffCount, '명')} /{' '}
                      {fmtPct(formula?.pureRoomGuestsExGolfGrowthPct)})
                    </strong>
                  </div>

                  <div className="px-2.5 py-1 rounded bg-white border border-[#1B382E]/10">
                    <span className="text-[#5A6B63] font-semibold">② 골프 치러 온 숙박객: </span>
                    <strong className="text-[#1B382E]">
                      {fmtInt(formula?.lyGolfSynergyStayGuests)}➔{fmtInt(formula?.tyGolfSynergyStayGuests)}명
                    </strong>{' '}
                    <strong
                      className={
                        Number(formula?.golfSynergyStayGuestsDiffCount) < 0 ? 'text-rose-600' : 'text-emerald-700'
                      }
                    >
                      ({fmtSignedInt(formula?.golfSynergyStayGuestsDiffCount, '명')} /{' '}
                      {fmtPct(formula?.golfSynergyStayGuestsGrowthPct)})
                    </strong>
                  </div>

                  <div className="px-2.5 py-1 rounded bg-white border border-[#1B382E]/10">
                    <span className="text-[#5A6B63] font-semibold">③ 당일 나들이 손님: </span>
                    <strong className="text-[#1B382E]">
                      {fmtInt(formula?.lyWalkinVisitors)}➔{fmtInt(formula?.tyWalkinVisitors)}명
                    </strong>{' '}
                    <strong
                      className={Number(formula?.walkinVisitorDiffCount) < 0 ? 'text-rose-600' : 'text-emerald-700'}
                    >
                      ({fmtSignedInt(formula?.walkinVisitorDiffCount, '명')} /{' '}
                      {fmtPct(formula?.walkinVisitorGrowthPct)})
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* 4대 사업부 한 줄 성적표 칩 */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
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
            {calFactor && Number(calFactor?.calendarShiftEffectAmount) !== 0 && (
              <div className="text-xs font-bold text-[#8C6D46] mt-1">
                {Number(calFactor?.holidayDiffDays) === 0 && Number(calFactor?.weekendDiffDays) !== 0 ? (
                  <>
                    주말 일수 차이(주말 {fmtInt(calFactor?.lyWeekendDays)}➔{fmtInt(calFactor?.tyWeekendDays)}일) 감안 실질 증감:{' '}
                  </>
                ) : (
                  <>
                    휴일 일수 차이(휴일 {fmtInt(calFactor?.lyRedDays)}➔{fmtInt(calFactor?.tyRedDays)}일) 감안 실질 증감:{' '}
                  </>
                )}
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

        {/* 주요 증감 원인 요약 (누구나 바로 읽을 수 있는 쉬운 한국어 4~6개 핵심 카드) */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs md:text-sm font-extrabold text-[#284F42]">
              주요 증감 원인 요약 (쉬운 한눈 정리)
            </span>
            <button
              type="button"
              onClick={() => setShowCheckDetail((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F4F3EE] hover:bg-[#E8F2EE] border border-[#284F42]/25 text-xs font-extrabold text-[#284F42] transition-colors cursor-pointer"
            >
              <HelpCircle size={13} />
              <span>주변 리조트 비교 · 정산 이상 유무 등 추가 점검 {showCheckDetail ? '접기' : '보기'}</span>
              {showCheckDetail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {(() => {
              const easyCards: Array<{ title: string; desc: string }> = [];

              // 1) 주말·공휴일 일수 차이가 실제로 있을 때만 표시
              if (calFactor) {
                const redDiff = Number(calFactor?.redDayDiffDays || 0);
                const holDiff = Number(calFactor?.holidayDiffDays || 0);
                const wkndDiff = Number(calFactor?.weekendDiffDays || 0);
                const shiftAmt = Number(calFactor?.calendarShiftEffectAmount || 0);

                if (redDiff !== 0 || holDiff !== 0 || wkndDiff !== 0 || shiftAmt !== 0) {
                  if (holDiff === 0 && wkndDiff !== 0) {
                    easyCards.push({
                      title: `달력 요일 차이로 주말(토·일) 일수가 다름 (주말 ${fmtInt(calFactor?.lyWeekendDays)}일 ➔ ${fmtInt(calFactor?.tyWeekendDays)}일)`,
                      desc: `법정공휴일은 둘 다 ${fmtInt(calFactor?.tyHolidayDays)}일이지만, 같은 날짜로 비교하다 보니 비교기엔 주말 ${fmtInt(calFactor?.lyWeekendDays)}일·평일 ${fmtInt(calFactor?.lyNormalWeekdayDays)}일, 올해는 주말 ${fmtInt(calFactor?.tyWeekendDays)}일·평일 ${fmtInt(calFactor?.tyNormalWeekdayDays)}일이 포함되어 ${fmtSignedInt(calFactor?.calendarShiftEffectAmount, '원')}의 요일 차이가 발생했습니다.`
                    });
                  } else {
                    easyCards.push({
                      title: `공휴일 · 주말 일수 차이 (총 휴일 ${fmtInt(calFactor?.lyRedDays)}일 ➔ ${fmtInt(calFactor?.tyRedDays)}일, ${fmtSignedInt(calFactor?.redDayDiffDays, '일')})`,
                      desc: `법정공휴일 ${fmtInt(calFactor?.lyHolidayDays)}➔${fmtInt(calFactor?.tyHolidayDays)}일, 주말 ${fmtInt(calFactor?.lyWeekendDays)}➔${fmtInt(calFactor?.tyWeekendDays)}일 차이로 인해 ${fmtSignedInt(calFactor?.calendarShiftEffectAmount, '원')}의 달력 영향이 발생했습니다. (휴일수 보정 시 실질 증감 ${fmtSignedInt(calFactor?.calendarAdjustedRevenueDiff, '원')})`
                    });
                  }
                }
              }

              // 2) 비가 온 날이 하루라도 있을 때만 날씨 카드 표시
              if (extWeather) {
                const lyRainDays = Number(extWeather?.lyRainyDays || 0);
                const tyRainDays = Number(extWeather?.tyRainyDays || 0);
                const rDaysDiff = Number(extWeather?.rainyDaysDiff || 0);
                const lyMm = Number(extWeather?.lyRainfallMm || 0);
                const tyMm = Number(extWeather?.tyRainfallMm || 0);
                const rMmDiff = Number(extWeather?.rainfallDiffMm || 0);

                if (lyRainDays > 0 || tyRainDays > 0 || rDaysDiff !== 0 || lyMm > 0 || tyMm > 0) {
                  const weatherTitle =
                    rDaysDiff < 0 && rMmDiff > 0
                      ? `비 온 날수는 감소 (${fmtInt(extWeather?.lyRainyDays)}➔${fmtInt(extWeather?.tyRainyDays)}일) · 단, 내린 비의 양은 증가 (${fmtText(extWeather?.lyRainfallMm)}➔${fmtText(extWeather?.tyRainfallMm)}mm)`
                      : rDaysDiff < 0
                      ? `비 온 날수 감소로 야외 영업 여건 개선 (${fmtInt(extWeather?.lyRainyDays)}일 ➔ ${fmtInt(extWeather?.tyRainyDays)}일)`
                      : rDaysDiff > 0
                      ? `비 온 날수 증가로 야외 영업 불리 (${fmtInt(extWeather?.lyRainyDays)}일 ➔ ${fmtInt(extWeather?.tyRainyDays)}일)`
                      : `비 온 날수 동일 (${fmtInt(extWeather?.lyRainyDays)}➔${fmtInt(extWeather?.tyRainyDays)}일, 강수량 ${fmtText(extWeather?.lyRainfallMm)}➔${fmtText(extWeather?.tyRainfallMm)}mm)`;

                  easyCards.push({
                    title: weatherTitle,
                    desc: `주말·휴일 비 온 날 ${fmtInt(extWeather?.lyRedDayRainyDays)}➔${fmtInt(extWeather?.tyRedDayRainyDays)}일, 평일 비 온 날 ${fmtInt(extWeather?.lyWeekdayRainyDays)}➔${fmtInt(extWeather?.tyWeekdayRainyDays)}일 (맑은 날 평균 매출 ${fmtInt(extWeather?.tyClearDayAvgRevenue)}원 vs 비 온 날 ${fmtInt(extWeather?.tyRainyDayAvgRevenue)}원)`
                  });
                }
              }

              // 3) 손님 구성 변화 (골프 손님 vs 일반 숙박·나들이 손님)
              if (formula?.nonGolfVisitorDiffCount !== undefined) {
                easyCards.push({
                  title: `레저·식당 이용 손님(골프 제외) ${fmtSignedInt(formula?.nonGolfVisitorDiffCount, '명')} (${fmtPct(formula?.nonGolfVisitorGrowthPct)}) 변동`,
                  desc: `골프 손님은 ${fmtInt(formula?.lyGolfVisitors)}➔${fmtInt(formula?.tyGolfVisitors)}명(${fmtSignedInt(formula?.golfVisitorDiffCount, '명')})인 반면, 레저·식당의 주 고객인 일반 숙박객은 ${fmtInt(formula?.lyPureRoomGuestsExGolf)}➔${fmtInt(formula?.tyPureRoomGuestsExGolf)}명(${fmtSignedInt(formula?.pureRoomGuestsExGolfDiffCount, '명')}), 당일 나들이객은 ${fmtInt(formula?.lyWalkinVisitors)}➔${fmtInt(formula?.tyWalkinVisitors)}명(${fmtSignedInt(formula?.walkinVisitorDiffCount, '명')})을 기록했습니다.`
                });
              }

              // 4) 4대 사업부 중 가장 크게 변한 핵심 내용 요약
              if (venueVariances.length > 0) {
                const topVenues = venueVariances
                  .slice(0, 3)
                  .map((v: any) => `${fmtText(v?.venueName)} ${fmtSignedInt(v?.diffAmount, '원')}`)
                  .join(' · ');
                easyCards.push({
                  title: `체험·레저 매장별 증감 (야외 ${fmtSignedInt(leisureDetail?.outdoorDiffAmount, '원')} / 실내 ${fmtSignedInt(leisureDetail?.indoorDiffAmount, '원')})`,
                  desc: `주요 매장: ${topVenues}`
                });
              }

              // 5) 숙박객 외부 식당·마트 외출 및 저녁 식당 영향
              if (fnbDetail || parkingBehavior) {
                easyCards.push({
                  title: `숙박객 단지 밖 외식·장보기 외출 (${fmtInt(fnbDetail?.lyStayOutingCount ?? parkingBehavior?.lyStayOutingCount)}회 ➔ ${fmtInt(fnbDetail?.tyStayOutingCount ?? parkingBehavior?.tyStayOutingCount)}회)`,
                  desc: `투숙 차량의 ${fmtPctOne(fnbDetail?.tyStayOutingRatePct ?? parkingBehavior?.tyStayOutingRatePct)}가 외부 식당·마트로 외출했으며, 직영 식당 매출은 ${fmtSignedInt(fnbDetail?.directFnbDiffAmount, '원')}, 연회·세미나 대관은 ${fmtSignedInt(fnbDetail?.banquetDiffAmount, '원')} 변동했습니다.`
                });
              }

              // 6) 골퍼 미숙박 당일 귀가 및 콘도 빈방
              if (compMarket?.unconvertedInternalStayDemand || condoDetail) {
                const targetTeams = compMarket?.unconvertedInternalStayDemand?.coreStayConversionTargetTeams;
                const nonStayTeams = compMarket?.unconvertedInternalStayDemand?.coreStayConversionNonStayTeams;
                easyCards.push({
                  title: `골프 손님 미숙박 당일 귀가 (숙박 가능 ${fmtInt(targetTeams)}팀 중 ${fmtInt(nonStayTeams)}팀 귀가)`,
                  desc: `콘도 판매 객실은 ${fmtInt(condoDetail?.lyOccupiedRooms)}➔${fmtInt(condoDetail?.tyOccupiedRooms)}실이며, 판매되지 않은 빈방은 ${fmtInt(condoDetail?.tyUnsoldPhysicalKeys)}실(51평 방 2개 사용 기준 1실당 평균 매출 ${fmtInt(condoDetail?.tyKeyYield)}원)입니다.`
                });
              }

              return easyCards.map((card, idx) => (
                <div
                  key={idx}
                  className="rounded-xl bg-[#F8F7F3] p-3.5 border border-[#1B382E]/15 flex items-start gap-2.5"
                >
                  <span className="w-5 h-5 rounded-full bg-[#284F42] text-white text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="space-y-1 min-w-0">
                    <div className="text-xs md:text-sm font-black text-[#1B382E] leading-snug">
                      {card.title}
                    </div>
                    <div className="text-xs text-[#4A5D54] leading-relaxed break-words">
                      {card.desc}
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>

          {/* 클릭 시 펼쳐지는 3가지 추가 점검 (어려운 전문용어/영문코드를 완전히 제거한 깔끔한 3단 카드) */}
          {showCheckDetail && (
            <div className="rounded-2xl bg-[#F4F3EE]/80 border border-[#284F42]/25 p-4 space-y-3 mt-2">
              <div className="text-xs font-extrabold text-[#1E523F]">
                [추가 데이터 점검 결과 — 고객 유형 · 주변 경쟁 리조트 · 정산 이상 유무]
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {/* 점검 1: 콘도 고객 유형 및 평형별 변화 */}
                <div className="rounded-xl bg-white p-3.5 border border-[#1B382E]/10 space-y-2">
                  <div className="flex items-center justify-between border-b border-[#1B382E]/10 pb-1.5">
                    <strong className="text-[#1B382E] font-black">① 콘도 예약유형 · 평형 점검</strong>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                      고객 구성 확인
                    </span>
                  </div>
                  <div className="space-y-1 text-[#4A5D54] leading-relaxed">
                    {channelMix.map((ch: any, cIdx: number) => (
                      <div key={cIdx} className="flex items-center justify-between">
                        <span>• {fmtText(ch?.channelLabel)} ({fmtInt(ch?.lyRooms)}➔{fmtInt(ch?.tyRooms)}실)</span>
                        <strong className={Number(ch?.diffRevenue) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                          {fmtSignedInt(ch?.diffRevenue, '원')}
                        </strong>
                      </div>
                    ))}
                    {pyungMix.length > 0 && (
                      <div className="pt-1 border-t border-[#1B382E]/10 text-[11px]">
                        평형별 판매:{' '}
                        {pyungMix
                          .map((p: any) => `${fmtText(p?.pyungLabel || p?.pyungCode)} ${fmtInt(p?.lyRooms)}➔${fmtInt(p?.tyRooms)}실`)
                          .join(' · ')}
                      </div>
                    )}
                  </div>
                </div>

                {/* 점검 2: 주변 경쟁 리조트 시황 및 골퍼 미숙박 */}
                <div className="rounded-xl bg-white p-3.5 border border-[#1B382E]/10 space-y-2">
                  <div className="flex items-center justify-between border-b border-[#1B382E]/10 pb-1.5">
                    <strong className="text-[#1B382E] font-black">② 주변 경쟁 리조트 비교</strong>
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[11px] font-bold">
                      외부 시황 점검
                    </span>
                  </div>
                  <div className="space-y-1.5 text-[#4A5D54] leading-relaxed">
                    <div>
                      • <strong>충청권 4대 경쟁 리조트 만실 수</strong>:{' '}
                      <strong className="text-[#1B382E]">
                        {fmtInt(compMarket?.soldOutResortCount)}곳 / {fmtInt(compMarket?.monitoredResortCount)}곳
                      </strong>
                    </div>
                    <div>
                      • <strong>경쟁사 평균 최저가</strong>: {fmtInt(compMarket?.competitorAvgMinPrice)}원 (최근 30일 대비{' '}
                      <strong>
                        {fmtPctOne(
                          compMarket?.competitorPriceSurgeRatioPct ?? compMarket?.competitorSameClassSurgeRatioPct,
                          true
                        )}
                      </strong>
                      )
                    </div>
                    <div>
                      • <strong>우리 리조트 빈방 및 골퍼 이탈</strong>: 빈방{' '}
                      <strong className="text-rose-600">{fmtInt(condoDetail?.tyUnsoldPhysicalKeys)}실</strong> / 숙박 가능 골퍼{' '}
                      {fmtInt(compMarket?.unconvertedInternalStayDemand?.coreStayConversionTargetTeams)}팀 중{' '}
                      <strong className="text-rose-600">
                        {fmtInt(compMarket?.unconvertedInternalStayDemand?.coreStayConversionNonStayTeams)}팀 당일 귀가
                      </strong>
                    </div>
                  </div>
                </div>

                {/* 점검 3: 정산 누락 및 단체 외상(후불) 점검 */}
                <div className="rounded-xl bg-white p-3.5 border border-[#1B382E]/10 space-y-2">
                  <div className="flex items-center justify-between border-b border-[#1B382E]/10 pb-1.5">
                    <strong className="text-[#1B382E] font-black">③ 정산 누락 · 외상 대기 점검</strong>
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-[11px] font-bold">
                      {Number(integrityFactor?.reconciliationDeltaWon ?? integrityFactor?.gatekeeperDeltaWon ?? 0) === 0
                        ? '정산 이상 없음'
                        : '정산 확인 필요'}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-[#4A5D54] leading-relaxed">
                    <div>
                      • <strong>일마감 정산 오차 금액</strong>:{' '}
                      <strong className="text-[#1B382E]">
                        {fmtInt(
                          integrityFactor?.reconciliationDeltaWon ??
                            integrityFactor?.gatekeeperDeltaWon ??
                            integrityFactor?.gatekeeperDeltaAmount
                        )}
                        원
                      </strong>{' '}
                      (미분류 항목 {fmtInt(integrityFactor?.unmappedCandidateCount)}건)
                    </div>
                    <div>
                      • <strong>단체 후불(외상) 미결제 대기</strong>:{' '}
                      <strong className="text-[#1B382E]">
                        {fmtInt(integrityFactor?.cityLedgerPendingCount)}건 (
                        {fmtInt(
                          integrityFactor?.cityLedgerPendingAmount ??
                            integrityFactor?.b2bPostSettlementPendingAmount
                        )}
                        원)
                      </strong>
                    </div>
                    <div>
                      • <strong>단체 연회·세미나 행사 증감</strong>:{' '}
                      <strong
                        className={Number(fnbDetail?.banquetDiffAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'}
                      >
                        {fmtSignedInt(fnbDetail?.banquetDiffAmount, '원')}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================================
          섹션 2. 외부 여건(달력·날씨) 및 4가지 원인별 금액 분해
         ===================================================================== */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 좌측: 달력 주말·공휴일 일수 비교 */}
          {calFactor && (
            <div className="bg-white rounded-2xl border border-[#B59269]/40 shadow-xs p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-[#B59269]/25 pb-2.5">
                <div className="flex items-center gap-2">
                  <Calendar size={17} className="text-[#8C6D46]" />
                  <h2 className="text-sm md:text-base font-black text-[#1B382E]">
                    달력 주말(토·일) · 법정공휴일 일수 비교
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

              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="rounded-xl bg-[#F8F7F3] p-2.5 border border-[#1B382E]/10">
                  <div className="text-[11px] text-[#5A6B63] font-semibold">주말+공휴일 (총 휴일수)</div>
                  <div className="text-sm font-black text-[#1B382E] mt-0.5">
                    {fmtInt(calFactor?.lyRedDays)}➔{fmtInt(calFactor?.tyRedDays)}일{' '}
                    <span className={Number(calFactor?.redDayDiffDays) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                      ({fmtSignedInt(calFactor?.redDayDiffDays, '일')})
                    </span>
                  </div>
                  <div className="text-[10px] text-[#6C7A73]">
                    주말 {fmtInt(calFactor?.lyWeekendDays)}➔{fmtInt(calFactor?.tyWeekendDays)}일 · 공휴일{' '}
                    {fmtInt(calFactor?.lyHolidayDays)}➔{fmtInt(calFactor?.tyHolidayDays)}일
                  </div>
                </div>

                <div className="rounded-xl bg-[#F8F7F3] p-2.5 border border-[#1B382E]/10">
                  <div className="text-[11px] text-[#5A6B63] font-semibold">요일·휴일 일수 차이 영향</div>
                  {Number(calFactor?.calendarShiftEffectAmount) === 0 ? (
                    <>
                      <div className="text-sm font-black text-[#1B382E] mt-0.5">0원 (차이 없음)</div>
                      <div className="text-[10px] text-[#6C7A73]">주말·휴일 일수 동일</div>
                    </>
                  ) : (
                    <>
                      <div
                        className={`text-sm font-black mt-0.5 ${
                          Number(calFactor?.calendarShiftEffectAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'
                        }`}
                      >
                        {fmtSignedInt(calFactor?.calendarShiftEffectAmount, '원')}
                      </div>
                      <div className="text-[10px] text-[#6C7A73]">
                        {Number(calFactor?.holidayDiffDays) === 0
                          ? `주말 ${fmtInt(calFactor?.lyWeekendDays)}➔${fmtInt(calFactor?.tyWeekendDays)}일 차이 반영`
                          : `총 휴일 ${fmtInt(calFactor?.lyRedDays)}➔${fmtInt(calFactor?.tyRedDays)}일 차이 반영`}
                      </div>
                    </>
                  )}
                </div>

                <div className="rounded-xl bg-[#F4F3EE] p-2.5 border border-[#B59269]/40">
                  <div className="text-[11px] text-[#8C6D46] font-extrabold">
                    {Number(calFactor?.calendarShiftEffectAmount) === 0
                      ? '요일수 보정 여부'
                      : '일수 차이 보정 실질 증감'}
                  </div>
                  {Number(calFactor?.calendarShiftEffectAmount) === 0 ? (
                    <>
                      <div className="text-sm font-black text-[#1B382E] mt-0.5">보정 불필요</div>
                      <div className="text-[10px] text-[#8C6D46]">실제 증감액과 동일</div>
                    </>
                  ) : (
                    <>
                      <div
                        className={`text-sm font-black mt-0.5 ${
                          Number(calFactor?.calendarAdjustedRevenueDiff) < 0 ? 'text-rose-600' : 'text-emerald-700'
                        }`}
                      >
                        {fmtSignedInt(calFactor?.calendarAdjustedRevenueDiff, '원')}
                      </div>
                      <div className="text-[10px] text-[#8C6D46]">동일 휴일수 기준 증감</div>
                    </>
                  )}
                </div>
              </div>

              {showCalendarDetail && (
                <div className="rounded-xl bg-[#F8F7F3] p-3 border border-[#1B382E]/10 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#5A6B63]">주말·공휴일 하루 평균 매출</span>
                    <strong className="text-[#1B382E]">
                      {fmtInt(calFactor?.lyRedDayAvgRevenue)}원 ➔ {fmtInt(calFactor?.tyRedDayAvgRevenue)}원 (
                      {fmtPct(calFactor?.redDayDailyAvgGrowthPct)})
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#5A6B63]">평일(주중) 하루 평균 매출</span>
                    <strong className="text-[#1B382E]">
                      {fmtInt(calFactor?.lyWeekdayAvgRevenue)}원 ➔ {fmtInt(calFactor?.tyWeekdayAvgRevenue)}원 (
                      {fmtPct(calFactor?.weekdayDailyAvgGrowthPct)})
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#5A6B63]">공휴일 명칭</span>
                    <strong className="text-[#1B382E]">
                      당기 [{fmtText(calFactor?.tyHolidayNames)}] vs 비교기 [{fmtText(calFactor?.lyHolidayNames)}]
                    </strong>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 우측: 날씨(비 온 날) 비교 및 날씨·동선 영향도 */}
          {(extWeather || pearsonCorr) && (
            <div className="bg-white rounded-2xl border border-[#284F42]/30 shadow-xs p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-[#284F42]/15 pb-2.5">
                <div className="flex items-center gap-2">
                  <CloudRain size={17} className="text-[#1E523F]" />
                  <h2 className="text-sm md:text-base font-black text-[#1B382E]">
                    날씨(비 온 날) 비교 및 부문 간 영향도
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWeatherDetail((prev) => !prev)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#E8F2EE] hover:bg-[#D5E8E0] text-[11px] font-bold text-[#1E523F] cursor-pointer"
                >
                  <HelpCircle size={12} />
                  <span>{showWeatherDetail ? '영향도 설명 접기' : '부문 간 영향도(상관계수) 보기'}</span>
                  {showWeatherDetail ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              </div>

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
                    평일 비 {fmtInt(extWeather?.lyWeekdayRainyDays)}➔{fmtInt(extWeather?.tyWeekdayRainyDays)}일
                  </div>
                </div>

                <div className="rounded-xl bg-[#F8F7F3] p-2.5 border border-[#1B382E]/10">
                  <div className="text-[11px] text-[#5A6B63] font-semibold">총 비 온 날 (강수량)</div>
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
                  <div className="text-[11px] text-[#1E523F] font-extrabold">맑은 날 vs 비 온 날 매출</div>
                  <div className="text-xs font-black text-[#1B382E] mt-0.5">
                    맑은날 {fmtInt(extWeather?.tyClearDayAvgRevenue)}원
                  </div>
                  <div className="text-[10px] text-[#5A6B63] font-bold">
                    비온날 {fmtInt(extWeather?.tyRainyDayAvgRevenue)}원
                  </div>
                </div>
              </div>

              {showWeatherDetail && pearsonCorr && (
                <div className="rounded-xl bg-[#F8F7F3] p-3.5 border border-[#284F42]/20 space-y-2.5 text-xs">
                  <div className="rounded-lg bg-white p-2.5 border border-[#1B382E]/10 text-[11px] text-[#4A5D54] leading-relaxed">
                    <strong className="text-[#1B382E]">💡 영향도 지수(상관계수 r) 읽는 법:</strong>{' '}
                    <strong className="text-emerald-700">+1에 가까울수록 함께 증가</strong>하고,{' '}
                    <strong className="text-rose-600">-1에 가까울수록 반대로 감소</strong>하는 관계를 뜻합니다. (요일별 손님 수 차이를 보정한 순수 영향도)
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      {
                        label: '비 온 양 ↔ 골프 매출',
                        val: pearsonCorr?.rRainVsGolfRev,
                        sub: redDayBucket ? `휴일 ${fmtText(redDayBucket?.rRainVsGolfRev)}` : undefined
                      },
                      {
                        label: '비 온 양 ↔ 야외 레저',
                        val: pearsonCorr?.rRainVsOutdoorLeisureRev,
                        sub: redDayBucket ? `휴일 ${fmtText(redDayBucket?.rRainVsOutdoorLeisureRev)}` : undefined
                      },
                      {
                        label: '비 온 양 ↔ 실내 레저',
                        val: pearsonCorr?.rRainVsIndoorLeisureRev
                      },
                      {
                        label: '숙박·1부골퍼 ↔ 아침식당',
                        val: pearsonCorr?.rMorningGuestsGolfVsMorningPosRev
                      },
                      {
                        label: '장기체류 나들이 ↔ 점심식당',
                        val: pearsonCorr?.rWalkinLongDwellVsLunchPosRev
                      },
                      {
                        label: '콘도 숙박객 ↔ 직영식당',
                        val: pearsonCorr?.rStayGuestsVsDirectFnbRev
                      },
                      {
                        label: '숙박객 외출 ↔ 저녁식당',
                        val: pearsonCorr?.rStayOutingVsEveningPosRev,
                        sub: weekdayBucket ? `평일 ${fmtText(weekdayBucket?.rStayOutingVsEveningPosRev)}` : undefined
                      },
                      {
                        label: '51평(방2개) 비중 ↔ 1실당 매출',
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
                            {fmtText(cItem.val)}
                          </div>
                          {cItem.sub && <div className="text-[10px] text-[#6C7A73]">{cItem.sub}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 하단: 매출 증감액의 4가지 원인별 금액 분해 */}
        {formula && (
          <div className="bg-white rounded-2xl border border-[#1B382E]/15 shadow-xs p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded bg-[#284F42] text-white text-xs font-bold">
                  4대 원인 금액 분해
                </span>
                <h2 className="text-sm md:text-base font-black text-[#1B382E]">
                  매출 증감액({fmtSignedInt(formula?.revenueDiffAmount, '원')})은 어디서 얼마씩 발생했는가?
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowVolumeHelp((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-xs font-bold text-amber-900 cursor-pointer"
              >
                <HelpCircle size={13} />
                <span>①번 방문객 효과 계산 기준 설명 {showVolumeHelp ? '접기' : '보기'}</span>
                {showVolumeHelp ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </div>

            {showVolumeHelp && (
              <div className="rounded-xl bg-amber-50/90 border border-amber-200 p-3.5 text-xs text-amber-950 leading-relaxed">
                <strong className="font-extrabold text-amber-900 mr-1.5">[방문객 증감 효과 계산 설명]</strong>
                숙박·골프 손님(고단가)과 당일 나들이 손님(저단가)의 비중이 달라질 때 단순 총인원으로만 계산하면 금액이 왜곡되므로, 손님 유형별 비중 변화를 함께 반영한 실질 방문객 효과(
                <strong>{fmtSignedInt(formula?.shapleyVolumeEffectAmount, '원')}</strong> = 단순 인원 효과{' '}
                {fmtSignedInt(formula?.volumeEffectAmount, '원')} + 손님 유형 비중 보정{' '}
                {fmtSignedInt(formula?.visitorMixEffectAmount, '원')})로 표시합니다.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl bg-[#F8F7F3] border-2 border-[#284F42]/30 p-3.5 space-y-1">
                <div className="text-xs font-extrabold text-[#284F42]">
                  ① 방문객 수 변화에 따른 증감
                </div>
                <div
                  className={`text-lg font-black ${
                    Number(formula?.shapleyVolumeEffectAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {fmtSignedInt(formula?.shapleyVolumeEffectAmount, '원')}
                </div>
                <div className="text-[11px] text-[#5A6B63] pt-1 border-t border-[#1B382E]/10 leading-snug">
                  단순 인원 {fmtSignedInt(formula?.volumeEffectAmount, '원')} / 손님 유형 비중 보정{' '}
                  {fmtSignedInt(formula?.visitorMixEffectAmount, '원')}
                </div>
              </div>

              <div className="rounded-xl bg-[#F8F7F3] border border-[#1B382E]/10 p-3.5 space-y-1">
                <div className="text-xs font-bold text-[#5A6B63]">② 객실 · 골프 · 레저 단가 변화</div>
                <div
                  className={`text-lg font-black ${
                    Number(formula?.coreSegmentPurePriceEffectAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {fmtSignedInt(formula?.coreSegmentPurePriceEffectAmount, '원')}
                </div>
                <div className="text-[11px] text-[#5A6B63] pt-1 border-t border-[#1B382E]/10 leading-snug">
                  각 사업부 내 1인당·1실당 평균 이용요금 변동분
                </div>
              </div>

              <div className="rounded-xl bg-[#F8F7F3] border border-[#1B382E]/10 p-3.5 space-y-1">
                <div className="text-xs font-bold text-[#5A6B63]">③ 식당(F&B) 1인당 식사비 변화</div>
                <div
                  className={`text-lg font-black ${
                    Number(formula?.pureFnbAttachEffectAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {fmtSignedInt(formula?.pureFnbAttachEffectAmount, '원')}
                </div>
                <div className="text-[11px] text-[#5A6B63] pt-1 border-t border-[#1B382E]/10 leading-snug">
                  방문객 1인당 직영 식당 지출액 변동 및 외출 영향
                </div>
              </div>

              <div className="rounded-xl bg-[#F8F7F3] border border-[#1B382E]/10 p-3.5 space-y-1">
                <div className="text-xs font-bold text-[#5A6B63]">④ 단체 연회 · 세미나 행사 증감</div>
                <div
                  className={`text-lg font-black ${
                    Number(formula?.banquetBaseEffectAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {fmtSignedInt(formula?.banquetBaseEffectAmount, '원')}
                </div>
                <div className="text-[11px] text-[#5A6B63] pt-1 border-t border-[#1B382E]/10 leading-snug">
                  기업 세미나·워크샵 및 단체 연회 대관 매출 증감분
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          섹션 3. 사업부별 증가 ▲ vs 감소 ▼ 상세 내역
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 좌측: ▲ 매출 증가 사업부 */}
        <div className="rounded-2xl bg-emerald-50/50 border-2 border-emerald-200 p-4 md:p-5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2.5">
            <div className="text-sm md:text-base font-black text-emerald-900 flex items-center gap-1.5">
              <TrendingUp size={18} className="text-emerald-700" />
              <span>▲ 매출 증가 사업부 ({upSegments.length}곳)</span>
            </div>
            <span className="text-[11px] font-bold text-emerald-800">
              매장·품목별 / 예약경로별 분리
            </span>
          </div>

          {upSegments.length > 0 ? (
            <div className="space-y-3">
              {upSegments.map((row: any, idx: number) => renderSegmentCard(row, idx))}
            </div>
          ) : (
            <div className="bg-white rounded-xl p-4 border border-emerald-200 text-xs text-[#5A6B63]">
              해당 기간 매출이 증가한 사업부가 없습니다.
            </div>
          )}
        </div>

        {/* 우측: ▼ 매출 감소 사업부 */}
        <div className="rounded-2xl bg-rose-50/50 border-2 border-rose-200 p-4 md:p-5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-rose-200/80 pb-2.5">
            <div className="text-sm md:text-base font-black text-rose-900 flex items-center gap-1.5">
              <TrendingDown size={18} className="text-rose-600" />
              <span>▼ 매출 감소 사업부 ({downSegments.length}곳)</span>
            </div>
            <span className="text-[11px] font-bold text-rose-800">
              매장·품목별 / 예약경로별 분리
            </span>
          </div>

          {downSegments.length > 0 ? (
            <div className="space-y-3">
              {downSegments.map((row: any, idx: number) => renderSegmentCard(row, idx))}
            </div>
          ) : (
            <div className="bg-white rounded-xl p-4 border border-rose-200 text-xs text-[#5A6B63]">
              해당 기간 매출이 감소한 사업부가 없습니다.
            </div>
          )}

          {/* 단지 밖 외출 및 골퍼 당일 귀가 요약 */}
          <div className="bg-white rounded-xl p-3.5 border border-rose-200 space-y-1.5 text-xs">
            <div className="font-extrabold text-rose-900">
              [단지 밖 외출 및 미숙박 당일 귀가 현황]
            </div>
            <div className="text-[#1B382E] leading-relaxed">
              • <strong>숙박 차량 외부 식당·마트 외출</strong>:{' '}
              {fmtInt(fnbDetail?.lyStayOutingCount ?? parkingBehavior?.lyStayOutingCount)}회 ➔{' '}
              <strong className="text-rose-600">
                {fmtInt(fnbDetail?.tyStayOutingCount ?? parkingBehavior?.tyStayOutingCount)}회
              </strong>{' '}
              (숙박 차량 중 외출 비율 {fmtPctOne(fnbDetail?.tyStayOutingRatePct ?? parkingBehavior?.tyStayOutingRatePct)})
            </div>
            <div className="text-[#1B382E] leading-relaxed">
              • <strong>골프 손님 미숙박 당일 귀가</strong>: 숙박 가능 골퍼{' '}
              {fmtInt(compMarket?.unconvertedInternalStayDemand?.coreStayConversionTargetTeams)}팀 중{' '}
              <strong className="text-rose-600">
                {fmtInt(compMarket?.unconvertedInternalStayDemand?.coreStayConversionNonStayTeams)}팀 당일 귀가
              </strong>{' '}
              (콘도 미판매 빈방 {fmtInt(condoDetail?.tyUnsoldPhysicalKeys)}실)
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          섹션 4. 식사 시간대별 식당 매출 & 단지 내 손님 흐름 요약
         ===================================================================== */}
      {timeOfDayLinkages && (
        <div className="bg-white rounded-2xl border border-[#1B382E]/15 shadow-xs p-5 space-y-3">
          <div className="flex items-center gap-2 border-b border-[#1B382E]/10 pb-2.5">
            <Utensils size={16} className="text-[#284F42]" />
            <h2 className="text-sm md:text-base font-black text-[#1B382E]">
              시간대별 직영 식당 매출 및 주요 이용 손님
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* 아침 (06~10시) */}
            <div className="rounded-xl bg-[#F8F7F3] p-4 border border-[#1B382E]/10 space-y-1.5">
              <div className="flex items-center justify-between">
                <strong className="text-[#1B382E] text-sm font-black">아침 식사 (06~10시)</strong>
                <span className="px-2 py-0.5 rounded bg-[#E8F2EE] text-[#1E523F] text-[11px] font-extrabold">
                  식당 매출의 {fmtPctOne(timeOfDayLinkages?.morning06To10?.sharePct)}
                </span>
              </div>
              <div className="text-lg font-black text-[#284F42]">
                {fmtInt(timeOfDayLinkages?.morning06To10?.tyRevenue)}원
              </div>
              <p className="text-xs text-[#4A5D54] leading-relaxed pt-1 border-t border-[#1B382E]/10">
                콘도 숙박객({fmtInt(condoDetail?.lyRoomGuests ?? formula?.lyPureRoomGuestsExGolf)}➔
                {fmtInt(condoDetail?.tyRoomGuests ?? formula?.tyPureRoomGuestsExGolf)}명) 및 아침 1부 골프 손님(티오프 평균{' '}
                {fmtInt(golfVisitorBehavior?.tyAvgPreTeeArrivalMinutes)}분 전 도착)이 주로 이용합니다.
              </p>
            </div>

            {/* 점심·오후 (11~17시) */}
            <div className="rounded-xl bg-[#F8F7F3] p-4 border border-[#1B382E]/10 space-y-1.5">
              <div className="flex items-center justify-between">
                <strong className="text-[#1B382E] text-sm font-black">점심 · 오후 (11~17시)</strong>
                <span className="px-2 py-0.5 rounded bg-[#E8F2EE] text-[#1E523F] text-[11px] font-extrabold">
                  식당 매출의 {fmtPctOne(timeOfDayLinkages?.lunchAndAfternoon11To17?.sharePct)}
                </span>
              </div>
              <div className="text-lg font-black text-[#284F42]">
                {fmtInt(timeOfDayLinkages?.lunchAndAfternoon11To17?.tyRevenue)}원
              </div>
              <p className="text-xs text-[#4A5D54] leading-relaxed pt-1 border-t border-[#1B382E]/10">
                4시간 이상 머문 나들이 차량({fmtInt(parkingBehavior?.lyWalkinLongDwell4hPlusCars)}➔
                {fmtInt(parkingBehavior?.tyWalkinLongDwell4hPlusCars)}대)과 단체 방문객이 점심 식사 및 카페를 이용한 금액입니다.
              </p>
            </div>

            {/* 저녁 (18시~) */}
            <div className="rounded-xl bg-[#F8F7F3] p-4 border border-[#1B382E]/10 space-y-1.5">
              <div className="flex items-center justify-between">
                <strong className="text-[#1B382E] text-sm font-black">저녁 식사 (18시 이후)</strong>
                <span className="px-2 py-0.5 rounded bg-[#E8F2EE] text-[#1E523F] text-[11px] font-extrabold">
                  식당 매출의 {fmtPctOne(timeOfDayLinkages?.evening18Plus?.sharePct)}
                </span>
              </div>
              <div className="text-lg font-black text-[#284F42]">
                {fmtInt(timeOfDayLinkages?.evening18Plus?.tyRevenue)}원
              </div>
              <p className="text-xs text-[#4A5D54] leading-relaxed pt-1 border-t border-[#1B382E]/10">
                숙박 차량의 외부 식당·마트 외출({fmtInt(fnbDetail?.lyStayOutingCount ?? parkingBehavior?.lyStayOutingCount)}➔
                {fmtInt(fnbDetail?.tyStayOutingCount ?? parkingBehavior?.tyStayOutingCount)}회, 외출률{' '}
                {fmtPctOne(fnbDetail?.tyStayOutingRatePct ?? parkingBehavior?.tyStayOutingRatePct)}) 및 객실 내 포장 식사에 영향을 받습니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          섹션 5. 클릭 시 펼쳐보는 단체 손님별 소비 표 · 대관 행사 · 운영 지표
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
                단체 손님 유형별 소비 표 · 주요 대관 행사 · 6대 운영 지표
              </span>
              <span className="ml-2 text-xs text-[#6C7A73] font-semibold">
                (클릭하여 {showDeepReference ? '접기' : '펼쳐보기'})
              </span>
            </div>
          </div>
          {showDeepReference ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {showDeepReference && (
          <div className="p-5 pt-0 border-t border-[#1B382E]/10 space-y-5 mt-4">
            {/* 1) 단체 세그먼트별 식음 vs 레저 소비 표 */}
            {groupSegmentBreakdown.length > 0 && (
              <div className="space-y-2.5">
                <div className="text-xs md:text-sm font-black text-[#284F42] flex items-center gap-1.5">
                  <Users size={15} />
                  <span>① 단체 손님 유형별 식당(F&B) · 레저 이용 금액</span>
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

            {/* 2) 6대 외부 환경 및 운영 지표 */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs md:text-sm font-black text-[#284F42]">
                <Info size={15} />
                <span>② 외부 환경 · 콘도 객실 가동 · 정산 점검 6대 지표</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                <div className="rounded-xl bg-[#F4F3EE]/60 border border-[#1B382E]/10 p-3.5 space-y-1">
                  <div className="text-[11px] font-bold text-[#6C7A73]">날씨 / 휴일 요약</div>
                  <div className="font-bold text-[#1B382E] leading-relaxed">
                    비 온 날 {fmtInt(extWeather?.lyRainyDays)}➔{fmtInt(extWeather?.tyRainyDays)}일 (휴일 비{' '}
                    {fmtInt(extWeather?.lyRedDayRainyDays)}➔{fmtInt(extWeather?.tyRedDayRainyDays)}일) · 총 휴일{' '}
                    {fmtInt(calFactor?.lyRedDays)}➔{fmtInt(calFactor?.tyRedDays)}일
                  </div>
                </div>

                <div className="rounded-xl bg-[#F4F3EE]/60 border border-[#1B382E]/10 p-3.5 space-y-1">
                  <div className="text-[11px] font-bold text-[#6C7A73]">주변 경쟁 리조트 만실 수</div>
                  <div className="font-bold text-[#1B382E]">
                    충청 4개 리조트 중 만실 {fmtInt(compMarket?.soldOutResortCount)}/{fmtInt(compMarket?.monitoredResortCount)}곳 · 평균 최저가{' '}
                    {fmtInt(compMarket?.competitorAvgMinPrice)}원 (
                    {fmtPctOne(
                      compMarket?.competitorPriceSurgeRatioPct ?? compMarket?.competitorSameClassSurgeRatioPct,
                      true
                    )}
                    )
                  </div>
                </div>

                <div className="rounded-xl bg-[#F4F3EE]/60 border border-[#1B382E]/10 p-3.5 space-y-1">
                  <div className="text-[11px] font-bold text-[#6C7A73]">콘도 객실 가동 · 1실당 평균 매출 (51평=2실 기준)</div>
                  <div className="font-bold text-[#1B382E]">
                    사용 객실 {fmtInt(condoDetail?.tyOccupiedPhysicalKeys)}/
                    {fmtInt(condoDetail?.physicalKeyCapacity ?? compMarket?.belleforetPhysicalKeyCapacity)}실 (
                    {fmtPctOne(condoDetail?.tyPhysicalKeyOccPct)}) · 1실당 매출 {fmtInt(condoDetail?.tyKeyYield)}원 (
                    {fmtPct(condoDetail?.keyYieldGrowthPct)})
                  </div>
                </div>

                <div className="rounded-xl bg-[#F4F3EE]/60 border border-[#1B382E]/10 p-3.5 space-y-1">
                  <div className="text-[11px] font-bold text-[#6C7A73]">골퍼 미숙박 & 4시간+ 나들이 차량</div>
                  <div className="font-bold text-[#1B382E]">
                    숙박 가능 골퍼 {fmtInt(compMarket?.unconvertedInternalStayDemand?.coreStayConversionTargetTeams)}팀 중{' '}
                    <span className="text-rose-600">
                      {fmtInt(compMarket?.unconvertedInternalStayDemand?.coreStayConversionNonStayTeams)}팀 미숙박
                    </span>{' '}
                    · 4시간+ 나들이 차량{' '}
                    {fmtInt(
                      compMarket?.unconvertedInternalStayDemand?.longDwell4hPlusWalkinCars ??
                        parkingBehavior?.tyWalkinLongDwell4hPlusCars
                    )}
                    대
                  </div>
                </div>

                <div className="rounded-xl bg-[#F4F3EE]/60 border border-[#1B382E]/10 p-3.5 space-y-1">
                  <div className="text-[11px] font-bold text-[#6C7A73] flex items-center gap-1">
                    <DoorOpen size={12} />
                    <span>숙박객 단지 밖 외출</span>
                  </div>
                  <div className="font-bold text-[#1B382E]">
                    외출 {fmtInt(fnbDetail?.tyStayOutingCount ?? parkingBehavior?.tyStayOutingCount)}회 (외출 비율{' '}
                    <span className="text-rose-600">
                      {fmtPctOne(fnbDetail?.tyStayOutingRatePct ?? parkingBehavior?.tyStayOutingRatePct)}
                    </span>
                    , 평균 {fmtInt(fnbDetail?.tyStayAvgOutingMinutes ?? parkingBehavior?.tyStayAvgOutingMinutes)}분)
                  </div>
                </div>

                <div className="rounded-xl bg-[#F4F3EE]/60 border border-[#1B382E]/10 p-3.5 space-y-1">
                  <div className="text-[11px] font-bold text-[#6C7A73]">일마감 정산 / 후불(외상) 대기</div>
                  <div className="font-bold text-[#1B382E]">
                    정산 오차{' '}
                    {fmtInt(
                      integrityFactor?.reconciliationDeltaWon ??
                        integrityFactor?.gatekeeperDeltaWon ??
                        integrityFactor?.gatekeeperDeltaAmount
                    )}
                    원 (미분류 {fmtInt(integrityFactor?.unmappedCandidateCount)}건) · 후불 대기{' '}
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
