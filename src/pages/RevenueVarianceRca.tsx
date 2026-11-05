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
      <div className="bg-white rounded-2xl border-2 border-[#284F42] shadow-xs p-5 md:p-6 space-y-6">
        {(() => {
          const upSegments = segmentSummaryRows.filter((r: any) => Number(r?.diffAmount) > 0);
          const downSegments = segmentSummaryRows.filter((r: any) => Number(r?.diffAmount) < 0);

          const upSegText = upSegments
            .map((r: any) => `${fmtText(r?.segmentName).split(' ')[0]}(${fmtSignedInt(r?.diffAmount, '원')})`)
            .join(' · ');
          const downSegText = downSegments
            .map((r: any) => `${fmtText(r?.segmentName).split(' ')[0]}(${fmtSignedInt(r?.diffAmount, '원')})`)
            .join(' · ');

          // [인과 요인 1] 외부 환경(날씨·공휴일) · 고객 동선 · 상관계수(r) 기반 증가/감소 근본 원인 분류
          const positiveCausalDrivers: Array<{ badge: string; title: string; detail: string }> = [];
          const negativeCausalDrivers: Array<{ badge: string; title: string; detail: string }> = [];

          // ① 기상·우천 및 피어슨 상관계수(r)
          if (extWeather) {
            const rainDaysReduced = Number(extWeather?.rainyDaysDiff) < 0 || Number(extWeather?.redDayRainyDaysDiff) < 0;
            const rainMmIncreased = Number(extWeather?.rainfallDiffMm) > 0;
            const rainDaysIncreased = Number(extWeather?.rainyDaysDiff) > 0 || Number(extWeather?.redDayRainyDaysDiff) > 0;

            if (rainDaysReduced) {
              positiveCausalDrivers.push({
                badge: '날씨 · 기상 상관계수',
                title: `비 온 날 감소 (총 우천 ${fmtInt(extWeather?.lyRainyDays)}➔${fmtInt(extWeather?.tyRainyDays)}일 · 주말/휴일 우천 ${fmtInt(extWeather?.lyRedDayRainyDays)}➔${fmtInt(extWeather?.tyRedDayRainyDays)}일)`,
                detail: `맑은 날 일평균 ${fmtInt(extWeather?.tyClearDayAvgRevenue)}원 vs 비 온 날 ${fmtInt(extWeather?.tyRainyDayAvgRevenue)}원 | 실측 상관계수: 강수량↔골프 r=${fmtText(pearsonCorr?.rRainVsGolfRev)} · 강수량↔야외레저 r=${fmtText(pearsonCorr?.rRainVsOutdoorLeisureRev)} · 실내레저 r=${fmtText(pearsonCorr?.rRainVsIndoorLeisureRev)}`
              });
            }
            if (rainDaysIncreased || rainMmIncreased) {
              negativeCausalDrivers.push({
                badge: '날씨 · 강수 상관계수',
                title: rainDaysIncreased
                  ? `우천 일수 증가 (총 우천 ${fmtInt(extWeather?.lyRainyDays)}➔${fmtInt(extWeather?.tyRainyDays)}일 · 주말/휴일 우천 ${fmtInt(extWeather?.lyRedDayRainyDays)}➔${fmtInt(extWeather?.tyRedDayRainyDays)}일)`
                  : `우천 일수는 ${fmtInt(extWeather?.lyRainyDays)}➔${fmtInt(extWeather?.tyRainyDays)}일이나 당기 강수량 증가 (${fmtText(extWeather?.lyRainfallMm)}➔${fmtText(extWeather?.tyRainfallMm)}mm, 기온 ${fmtText(extWeather?.lyTempMax)}➔${fmtText(extWeather?.tyTempMax)}°C)`,
                detail: `비 온 날 일평균 매출(${fmtInt(extWeather?.tyRainyDayAvgRevenue)}원)이 맑은 날(${fmtInt(extWeather?.tyClearDayAvgRevenue)}원) 대비 하락 | 실측 상관계수: 강수량↔골프 r=${fmtText(pearsonCorr?.rRainVsGolfRev)} · 강수량↔야외레저 r=${fmtText(pearsonCorr?.rRainVsOutdoorLeisureRev)}`
              });
            }
          }

          // ② 공휴일·주말 달력 시프트 효과
          if (calFactor) {
            const calEffect = Number(calFactor?.calendarShiftEffectAmount ?? 0);
            const holDiff = Number(calFactor?.holidayDiffDays ?? 0);
            const redDiff = Number(calFactor?.redDayDiffDays ?? 0);

            if (calEffect > 0 || holDiff > 0 || redDiff > 0) {
              positiveCausalDrivers.push({
                badge: '공휴일 · 달력 효과',
                title: `공휴일·휴일 확대 (법정공휴일 ${fmtInt(calFactor?.lyHolidayDays)}➔${fmtInt(calFactor?.tyHolidayDays)}일 · 주말포함 총 휴일 ${fmtInt(calFactor?.lyRedDays)}➔${fmtInt(calFactor?.tyRedDays)}일)`,
                detail: `휴일 일평균 매출 ${fmtInt(calFactor?.tyRedDayAvgRevenue)}원 vs 평일 ${fmtInt(calFactor?.tyWeekdayAvgRevenue)}원 | 달력 순풍 효과: ${fmtSignedInt(calFactor?.calendarShiftEffectAmount, '원')} (달력 보정 실질 영업증감 ${fmtSignedInt(calFactor?.calendarAdjustedRevenueDiff, '원')})`
              });
            } else if (calEffect < 0 || holDiff < 0 || redDiff < 0) {
              negativeCausalDrivers.push({
                badge: '공휴일 · 달력 역풍',
                title: `주말·공휴일 일수 축소 (주말포함 총 휴일 ${fmtInt(calFactor?.lyRedDays)}➔${fmtInt(calFactor?.tyRedDays)}일 · 법정공휴일 ${fmtInt(calFactor?.lyHolidayDays)}➔${fmtInt(calFactor?.tyHolidayDays)}일)`,
                detail: `달력 휴일 축소 역풍: ${fmtSignedInt(calFactor?.calendarShiftEffectAmount, '원')} | 달력 불리 여건을 제거한 실질 영업증감: ${fmtSignedInt(calFactor?.calendarAdjustedRevenueDiff, '원')}`
              });
            }
          }

          // ③ 4시간+ 장기체류 나들이 차량 & 시간대별 식음 상관계수(r)
          const lyLongWalkin = Number(parkingBehavior?.lyWalkinLongDwell4hPlusCars ?? 0);
          const tyLongWalkin = Number(
            compMarket?.unconvertedInternalStayDemand?.longDwell4hPlusWalkinCars ??
              parkingBehavior?.tyWalkinLongDwell4hPlusCars ??
              0
          );
          if (tyLongWalkin > 0 || lyLongWalkin > 0) {
            if (tyLongWalkin >= lyLongWalkin) {
              positiveCausalDrivers.push({
                badge: '고객 체류 · 식음 상관계수',
                title: `4시간 이상 장기체류 나들이 차량 확대 (${fmtInt(lyLongWalkin)}대 ➔ ${fmtInt(tyLongWalkin)}대)`,
                detail: `실측 상관계수: 4시간+ 나들이차량↔점심·오후(11~17시) 식음 r=${fmtText(pearsonCorr?.rWalkinLongDwellVsLunchPosRev)} · 콘도 투숙객↔직영식음 r=${fmtText(pearsonCorr?.rStayGuestsVsDirectFnbRev)} · 투숙객+1부골퍼↔조식(06~10시) r=${fmtText(pearsonCorr?.rMorningGuestsGolfVsMorningPosRev)}`
              });
            } else {
              negativeCausalDrivers.push({
                badge: '고객 체류 · 식음 상관계수',
                title: `4시간 이상 장기체류 나들이 차량 감소 (${fmtInt(lyLongWalkin)}대 ➔ ${fmtInt(tyLongWalkin)}대)`,
                detail: `실측 상관계수: 4시간+ 나들이차량↔점심·오후(11~17시) 식음 r=${fmtText(pearsonCorr?.rWalkinLongDwellVsLunchPosRev)} · 콘도 투숙객↔직영식음 r=${fmtText(pearsonCorr?.rStayGuestsVsDirectFnbRev)}`
              });
            }
          }

          // ④ 콘도 열쇠 1개당 수익(Key Yield) & 51평(2키 소진) 상관계수(r)
          if (condoDetail) {
            const kyDiff = Number(condoDetail?.keyYieldDiff ?? 0);
            if (kyDiff >= 0) {
              positiveCausalDrivers.push({
                badge: '열쇠 수익 · 51평 상관계수',
                title: `콘도 방 열쇠 1개당 수익(Key Yield) 상승 (${fmtInt(condoDetail?.lyKeyYield)}원 ➔ ${fmtInt(condoDetail?.tyKeyYield)}원, ${fmtPct(condoDetail?.keyYieldGrowthPct)})`,
                detail: `객실 평균단가(ADR) ${fmtInt(condoDetail?.lyAdr)}➔${fmtInt(condoDetail?.tyAdr)}원 (${fmtPct(condoDetail?.adrGrowthPct)}) | 51평(방 2개 연결 2키 소진) 비중↔열쇠효율 상관계수 r=${fmtText(pearsonCorr?.rRoom51ShareVsKeyYield)}`
              });
            } else {
              negativeCausalDrivers.push({
                badge: '열쇠 수익 · 51평 2키 소진',
                title: `콘도 방 열쇠 1개당 수익(Key Yield) 하락 (${fmtInt(condoDetail?.lyKeyYield)}원 ➔ ${fmtInt(condoDetail?.tyKeyYield)}원, ${fmtPct(condoDetail?.keyYieldGrowthPct)})`,
                detail: `51평(방 2개 연결로 열쇠 2개 소진) 투숙 비중에 따른 열쇠 효율 저하 | 51평 비중↔열쇠효율 상관계수 r=${fmtText(pearsonCorr?.rRoom51ShareVsKeyYield)}`
              });
            }
          }

          // ⑤ 숙박객 단지 밖(외부 식당·마트) 외출 & 51평 포장취식 상관계수(r) 및 골퍼 미숙박 귀가
          if (fnbDetail || parkingBehavior) {
            const lyOut = fnbDetail?.lyStayOutingCount ?? parkingBehavior?.lyStayOutingCount;
            const tyOut = fnbDetail?.tyStayOutingCount ?? parkingBehavior?.tyStayOutingCount;
            const outRate = fnbDetail?.tyStayOutingRatePct ?? parkingBehavior?.tyStayOutingRatePct;
            const row51 = pyungMix.find((p: any) => String(p?.pyungCode || '').includes('51'));
            negativeCausalDrivers.push({
              badge: '외부 외출 · 포장취식 상관계수',
              title: `숙박객 단지 밖(외부 식당·마트) 외출 ${fmtInt(lyOut)}➔${fmtInt(tyOut)}회 (외출률 ${fmtPctOne(outRate)}) 및 51평(${fmtInt(row51?.tyRooms)}실, 방당 ${fmtText(condoDetail?.tyAvgPartySizePerRoom)}명) 객실 내 포장취식`,
              detail: `인당 외부외출↔인당 직영식음 상관계수 r=${fmtText(pearsonCorr?.rStayOutingVsEveningPosRev)} | 시간대별 식음: 아침 ${fmtInt(timeOfDayLinkages?.morning06To10?.tyRevenue)}원(${fmtPctOne(timeOfDayLinkages?.morning06To10?.sharePct)}) · 점심/오후 ${fmtInt(timeOfDayLinkages?.lunchAndAfternoon11To17?.tyRevenue)}원(${fmtPctOne(timeOfDayLinkages?.lunchAndAfternoon11To17?.sharePct)}) · 저녁 ${fmtInt(timeOfDayLinkages?.evening18Plus?.tyRevenue)}원(${fmtPctOne(timeOfDayLinkages?.evening18Plus?.sharePct)})`
            });
          }

          if (compMarket?.unconvertedInternalStayDemand) {
            negativeCausalDrivers.push({
              badge: '골퍼 미숙박 · 경쟁사 시황',
              title: `숙박 가능 진성타겟 골퍼 ${fmtInt(compMarket?.unconvertedInternalStayDemand?.coreStayConversionTargetTeams)}팀 중 ${fmtInt(compMarket?.unconvertedInternalStayDemand?.coreStayConversionNonStayTeams)}팀 콘도 미숙박 당일 귀가 (미판매 잔여 ${fmtInt(condoDetail?.tyUnsoldPhysicalKeys)}키)`,
              detail: `충청권 경쟁 4사 만실 ${fmtInt(compMarket?.soldOutResortCount)}/${fmtInt(compMarket?.monitoredResortCount)}곳 (최저가 평균 ${fmtInt(compMarket?.competitorAvgMinPrice)}원, 동요일 30일비 ${fmtPctOne(compMarket?.competitorPriceSurgeRatioPct ?? compMarket?.competitorSameClassSurgeRatioPct, true)})`
            });
          }

          // ⑥ 골프 위임·연단체 예약 및 B2B 단체 세그먼트 행동
          if (golfVisitorBehavior) {
            const lyDel = Number(golfVisitorBehavior?.lyDelegatedBookings ?? golfVisitorBehavior?.lyDelegatedGroupBookings ?? 0);
            const tyDel = Number(golfVisitorBehavior?.tyDelegatedBookings ?? golfVisitorBehavior?.tyDelegatedGroupBookings ?? 0);
            if (tyDel >= lyDel && tyDel > 0) {
              positiveCausalDrivers.push({
                badge: '골프 연단체 · 조기도착',
                title: `골프 위임·연단체 예약 확대 (${fmtInt(lyDel)}건 ➔ ${fmtInt(tyDel)}건) 및 티오프 평균 ${fmtInt(golfVisitorBehavior?.tyAvgPreTeeArrivalMinutes)}분 전 도착`,
                detail: `연단체 시상품 및 스타트하우스·클럽하우스 사전 식음 이용 연계 (여성 골퍼 비중 ${fmtPctOne(golfVisitorBehavior?.tyFemaleRatioPct ?? golfVisitorBehavior?.tyFemaleSharePct)})`
              });
            }
          }
          const positiveDetails: Array<{ category: string; name: string; sub?: string; amount: string }> = [];
          venueVariances
            .filter((v: any) => Number(v?.diffAmount) > 0)
            .slice(0, 3)
            .forEach((v: any) => {
              positiveDetails.push({
                category: '레저 매장',
                name: fmtText(v?.venueName),
                sub: `${fmtInt(v?.lyVisitors)}➔${fmtInt(v?.tyVisitors)}명`,
                amount: fmtSignedInt(v?.diffAmount, '원')
              });
            });
          channelMix
            .filter((ch: any) => Number(ch?.diffRevenue) > 0)
            .forEach((ch: any) => {
              positiveDetails.push({
                category: '콘도 객실',
                name: fmtText(ch?.channelLabel),
                sub: `${fmtInt(ch?.lyRooms)}➔${fmtInt(ch?.tyRooms)}실`,
                amount: fmtSignedInt(ch?.diffRevenue, '원')
              });
            });
          if (Number(fnbDetail?.directFnbDiffAmount) > 0) {
            positiveDetails.push({
              category: '식당(F&B)',
              name: '직영 식당 일반 매출',
              sub: `결제 ${fmtInt(fnbDetail?.lyReceiptCount)}➔${fmtInt(fnbDetail?.tyReceiptCount)}건`,
              amount: fmtSignedInt(fnbDetail?.directFnbDiffAmount, '원')
            });
          }
          if (Number(fnbDetail?.banquetDiffAmount) > 0) {
            positiveDetails.push({
              category: '연회·대관',
              name: 'B2B 세미나 · 단체 연회 대관',
              amount: fmtSignedInt(fnbDetail?.banquetDiffAmount, '원')
            });
          }
          if (Number(golfRevComp?.greenFeeDiff) > 0) {
            positiveDetails.push({
              category: '골프',
              name: '그린피 (입장료)',
              amount: fmtSignedInt(golfRevComp?.greenFeeDiff, '원')
            });
          }
          if (Number(golfRevComp?.extraRevenueDiff) > 0) {
            positiveDetails.push({
              category: '골프',
              name: '프로샵 · 스타트하우스 부대매출',
              amount: fmtSignedInt(golfRevComp?.extraRevenueDiff, '원')
            });
          }
          if (Number(golfRevComp?.cartFeeDiff) > 0) {
            positiveDetails.push({
              category: '골프',
              name: '카트 대여료',
              amount: fmtSignedInt(golfRevComp?.cartFeeDiff, '원')
            });
          }
          golfChannelMix
            .filter((gc: any) => Number(gc?.diffGreenFee) > 0)
            .slice(0, 2)
            .forEach((gc: any) => {
              positiveDetails.push({
                category: '골프 예약채널',
                name: fmtText(gc?.channelLabel),
                sub: `${fmtInt(gc?.lyPlayers)}➔${fmtInt(gc?.tyPlayers)}명`,
                amount: fmtSignedInt(gc?.diffGreenFee, '원')
              });
            });

          // 세부 감소 항목 수집 (백엔드 사전 집계 항목 중 음수만 추출 — 사칙연산 일절 없음)
          const negativeDetails: Array<{ category: string; name: string; sub?: string; amount: string }> = [];
          if (Number(golfRevComp?.greenFeeDiff) < 0) {
            negativeDetails.push({
              category: '골프',
              name: '그린피 (입장료)',
              amount: fmtSignedInt(golfRevComp?.greenFeeDiff, '원')
            });
          }
          if (Number(golfRevComp?.extraRevenueDiff) < 0) {
            negativeDetails.push({
              category: '골프',
              name: '프로샵 · 스타트하우스 부대매출',
              amount: fmtSignedInt(golfRevComp?.extraRevenueDiff, '원')
            });
          }
          if (Number(golfRevComp?.cartFeeDiff) < 0) {
            negativeDetails.push({
              category: '골프',
              name: '카트 대여료',
              amount: fmtSignedInt(golfRevComp?.cartFeeDiff, '원')
            });
          }
          golfChannelMix
            .filter((gc: any) => Number(gc?.diffGreenFee) < 0)
            .slice(0, 2)
            .forEach((gc: any) => {
              negativeDetails.push({
                category: '골프 예약채널',
                name: fmtText(gc?.channelLabel),
                sub: `${fmtInt(gc?.lyPlayers)}➔${fmtInt(gc?.tyPlayers)}명`,
                amount: fmtSignedInt(gc?.diffGreenFee, '원')
              });
            });
          venueVariances
            .filter((v: any) => Number(v?.diffAmount) < 0)
            .slice(0, 3)
            .forEach((v: any) => {
              negativeDetails.push({
                category: '레저 매장',
                name: fmtText(v?.venueName),
                sub: `${fmtInt(v?.lyVisitors)}➔${fmtInt(v?.tyVisitors)}명`,
                amount: fmtSignedInt(v?.diffAmount, '원')
              });
            });
          channelMix
            .filter((ch: any) => Number(ch?.diffRevenue) < 0)
            .forEach((ch: any) => {
              negativeDetails.push({
                category: '콘도 객실',
                name: fmtText(ch?.channelLabel),
                sub: `${fmtInt(ch?.lyRooms)}➔${fmtInt(ch?.tyRooms)}실`,
                amount: fmtSignedInt(ch?.diffRevenue, '원')
              });
            });
          if (Number(fnbDetail?.directFnbDiffAmount) < 0) {
            negativeDetails.push({
              category: '식당(F&B)',
              name: '직영 식당 일반 매출',
              sub: `결제 ${fmtInt(fnbDetail?.lyReceiptCount)}➔${fmtInt(fnbDetail?.tyReceiptCount)}건`,
              amount: fmtSignedInt(fnbDetail?.directFnbDiffAmount, '원')
            });
          }
          if (Number(fnbDetail?.banquetDiffAmount) < 0) {
            negativeDetails.push({
              category: '연회·대관',
              name: 'B2B 세미나 · 단체 연회 대관',
              amount: fmtSignedInt(fnbDetail?.banquetDiffAmount, '원')
            });
          }
          if (Number(calFactor?.calendarShiftEffectAmount) < 0) {
            negativeDetails.push({
              category: '달력 휴일 축소',
              name: `주말·공휴일 축소 (${fmtInt(calFactor?.lyRedDays)}➔${fmtInt(calFactor?.tyRedDays)}일)`,
              amount: fmtSignedInt(calFactor?.calendarShiftEffectAmount, '원')
            });
          }

          return (
            <>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-[#1B382E]/10 pb-5">
                <div className="space-y-2.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#284F42] text-white text-xs font-bold">
                    <Target size={14} />
                    1. 매출 증감 이유 (핵심 결론)
                  </span>
                  <h2 className="text-lg md:text-xl font-black text-[#1B382E] leading-snug">
                    {isNegative ? (
                      <>
                        {downSegText || '주요 부문'} 감소가 {upSegText ? `${upSegText} 증가보다 커서` : '발생하여'} 총매출이{' '}
                        <span className="text-rose-600">
                          {fmtSignedInt(formula?.revenueDiffAmount, '원')} ({fmtPct(formula?.revenueGrowthPct)}) 감소
                        </span>
                        했습니다
                      </>
                    ) : (
                      <>
                        {upSegText || '주요 부문'} 성장이 {downSegText ? `${downSegText} 감소를 넘어` : '견인하여'} 총매출이{' '}
                        <span className="text-emerald-700">
                          {fmtSignedInt(formula?.revenueDiffAmount, '원')} ({fmtPct(formula?.revenueGrowthPct)}) 증가
                        </span>
                        했습니다
                      </>
                    )}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2.5 pt-0.5 text-sm md:text-[15px]">
                    <div className="rounded-xl bg-[#F4F3EE]/80 border border-[#1B382E]/10 px-3.5 py-2">
                      <span className="text-[#5A6B63] font-medium">전체 방문객 수: </span>
                      <strong className="text-[#1B382E] font-bold">
                        {fmtInt(formula?.lyTotalVisitors)}명 ➔ {fmtInt(formula?.tyTotalVisitors)}명
                      </strong>{' '}
                      (
                      <strong className={Number(formula?.visitorDiffCount) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                        {fmtSignedInt(formula?.visitorDiffCount, '명')}
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
                        {fmtSignedInt(formula?.spendPerHeadDiff, '원')}
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
                </div>
              </div>

              {/* 무엇 때문에 늘었고 무엇 때문에 줄었는가? (날씨·공휴일·상관계수·고객행동 + 매장/채널 2열 직관 대조) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 왼쪽: 매출을 늘린 원인 (+) */}
                <div className="rounded-2xl bg-emerald-50/50 border-2 border-emerald-200 p-4 md:p-5 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2.5">
                    <div className="text-sm md:text-base font-black text-emerald-900 flex items-center gap-1.5">
                      <TrendingUp size={18} className="text-emerald-700" />
                      <span>▲ 무엇 때문에 매출이 늘었나? (증가 원인)</span>
                    </div>
                    <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      기상 · 휴일 · 상관계수 · 매장 호조
                    </span>
                  </div>

                  {/* ① 외부 환경(날씨·공휴일) · 고객 동선 · 상관계수(r) 증가 요인 */}
                  {positiveCausalDrivers.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-extrabold text-emerald-900">
                        ① 날씨 · 공휴일 · 고객 행동 · 상관계수(r) 핵심 증가 요인
                      </div>
                      <div className="space-y-2">
                        {positiveCausalDrivers.map((cd, cIdx) => (
                          <div
                            key={cIdx}
                            className="bg-white rounded-xl p-3 border border-emerald-200/90 space-y-1 text-xs md:text-[13px]"
                          >
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[11px] font-extrabold shrink-0">
                                {cd.badge}
                              </span>
                              <strong className="text-[#1B382E] font-bold leading-snug">{cd.title}</strong>
                            </div>
                            <div className="text-xs text-[#4A5D54] leading-relaxed pl-0.5">{cd.detail}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ② 매출이 늘어난 사업부 및 세부 매장·채널 */}
                  <div className="space-y-2">
                    <div className="text-xs font-extrabold text-emerald-900">
                      ② 매출이 늘어난 사업부 및 세부 매장 · 예약 채널
                    </div>
                    {upSegments.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {upSegments.map((s: any, sIdx: number) => (
                          <div
                            key={sIdx}
                            className="rounded-lg bg-white px-3 py-1.5 border border-emerald-200 text-xs font-bold text-[#1B382E]"
                          >
                            {fmtText(s?.segmentName)}:{' '}
                            <strong className="text-emerald-700">
                              {fmtSignedInt(s?.diffAmount, '원')} ({fmtPct(s?.growthPct)})
                            </strong>
                          </div>
                        ))}
                      </div>
                    )}

                    {positiveDetails.length > 0 ? (
                      <div className="bg-white rounded-xl p-3.5 border border-emerald-200/80 divide-y divide-[#1B382E]/5 text-xs md:text-[13px]">
                        {positiveDetails.slice(0, 7).map((item, pIdx) => (
                          <div key={pIdx} className="flex items-center justify-between py-1.5 first:pt-0 last:pb-0 gap-2">
                            <div>
                              <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[11px] font-bold mr-1.5">
                                {item.category}
                              </span>
                              <strong className="text-[#1B382E]">{item.name}</strong>
                              {item.sub && <span className="text-[#5A6B63] ml-1.5 text-xs">({item.sub})</span>}
                            </div>
                            <strong className="text-emerald-700 font-black shrink-0">{item.amount}</strong>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl p-3.5 border border-emerald-200/80 text-xs text-[#5A6B63]">
                        해당 기간 뚜렷한 매출 증가 세부 항목 없음
                      </div>
                    )}
                  </div>
                </div>

                {/* 오른쪽: 매출을 깎아먹은 원인 (-) */}
                <div className="rounded-2xl bg-rose-50/50 border-2 border-rose-200 p-4 md:p-5 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-rose-200/80 pb-2.5">
                    <div className="text-sm md:text-base font-black text-rose-900 flex items-center gap-1.5">
                      <TrendingDown size={18} className="text-rose-600" />
                      <span>▼ 무엇 때문에 매출이 줄었나? (감소·이탈 원인)</span>
                    </div>
                    <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                      기상 · 휴일역풍 · 외부이탈 · 매장 부진
                    </span>
                  </div>

                  {/* ① 외부 환경(날씨·공휴일) · 고객 이탈 · 상관계수(r) 감소 요인 */}
                  {negativeCausalDrivers.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-extrabold text-rose-900">
                        ① 날씨 · 공휴일 역풍 · 외부 외출/미숙박 이탈 · 상관계수(r) 감소 요인
                      </div>
                      <div className="space-y-2">
                        {negativeCausalDrivers.map((cd, cIdx) => (
                          <div
                            key={cIdx}
                            className="bg-white rounded-xl p-3 border border-rose-200/90 space-y-1 text-xs md:text-[13px]"
                          >
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[11px] font-extrabold shrink-0">
                                {cd.badge}
                              </span>
                              <strong className="text-[#1B382E] font-bold leading-snug">{cd.title}</strong>
                            </div>
                            <div className="text-xs text-[#4A5D54] leading-relaxed pl-0.5">{cd.detail}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ② 매출이 줄어든 사업부 및 세부 매장·채널 */}
                  <div className="space-y-2">
                    <div className="text-xs font-extrabold text-rose-900">
                      ② 매출이 줄어든 사업부 및 세부 매장 · 예약 채널
                    </div>
                    {downSegments.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {downSegments.map((s: any, sIdx: number) => (
                          <div
                            key={sIdx}
                            className="rounded-lg bg-white px-3 py-1.5 border border-rose-200 text-xs font-bold text-[#1B382E]"
                          >
                            {fmtText(s?.segmentName)}:{' '}
                            <strong className="text-rose-600">
                              {fmtSignedInt(s?.diffAmount, '원')} ({fmtPct(s?.growthPct)})
                            </strong>
                          </div>
                        ))}
                      </div>
                    )}

                    {negativeDetails.length > 0 ? (
                      <div className="bg-white rounded-xl p-3.5 border border-rose-200/80 divide-y divide-[#1B382E]/5 text-xs md:text-[13px]">
                        {negativeDetails.slice(0, 7).map((item, nIdx) => (
                          <div key={nIdx} className="flex items-center justify-between py-1.5 first:pt-0 last:pb-0 gap-2">
                            <div>
                              <span className="inline-block px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 text-[11px] font-bold mr-1.5">
                                {item.category}
                              </span>
                              <strong className="text-[#1B382E]">{item.name}</strong>
                              {item.sub && <span className="text-[#5A6B63] ml-1.5 text-xs">({item.sub})</span>}
                            </div>
                            <strong className="text-rose-600 font-black shrink-0">{item.amount}</strong>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl p-3.5 border border-rose-200/80 text-xs text-[#5A6B63]">
                        해당 기간 뚜렷한 매출 감소 세부 항목 없음
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 백엔드 24개 마트 교차 검증 종합 인과 결론 (항상 펼쳐서 표출) */}
              <div className="rounded-2xl bg-[#F8F7F3] border border-[#1B382E]/15 border-l-4 border-l-[#284F42] p-4 md:p-5 space-y-2.5">
                <div className="text-xs md:text-sm font-extrabold text-[#284F42]">
                  24개 데이터 마트 교차 검증 종합 인과 결론 (날씨 · 공휴일 · 상관계수 · 고객 동선 · 부문별 실적 종합)
                </div>
                <ul className="space-y-2 text-xs md:text-sm text-[#1B382E] font-medium leading-relaxed">
                  {splitTopLevelClauses(formula?.primaryDriverLabel).map((clause, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="font-black text-[#284F42] shrink-0">•</span>
                      <span>{clause}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          );
        })()}

        {/* 공휴일·휴일 일수 차이 보정 요약 배너 (다중일 또는 공휴일 차이 발생 시 직관 표출) */}
        {(isMultiDayPeriod || Number(calFactor?.holidayDiffDays) !== 0) && calFactor && (
          <div className="rounded-xl bg-[#F4F3EE]/80 border border-[#B59269]/40 p-4 text-xs md:text-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5">
            <div className="space-y-0.5 leading-relaxed">
              <span className="font-extrabold text-[#8C6D46] mr-2">[달력 공휴일 차이 보정]</span>
              <span className="text-[#1B382E]">
                법정공휴일 <strong>{fmtInt(calFactor?.lyHolidayDays)}일 ➔ {fmtInt(calFactor?.tyHolidayDays)}일</strong> (
                <strong className={Number(calFactor?.holidayDiffDays) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                  {fmtSignedInt(calFactor?.holidayDiffDays, '일')}
                </strong>
                , 주말 포함 총 휴일 {fmtInt(calFactor?.lyRedDays)}일 ➔ {fmtInt(calFactor?.tyRedDays)}일) 차이로 인한 달력 영향액은{' '}
                <strong className={Number(calFactor?.calendarShiftEffectAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                  {fmtSignedInt(calFactor?.calendarShiftEffectAmount, '원')}
                </strong>
                입니다.
              </span>
            </div>
            <div className="shrink-0 font-bold text-[#1B382E] bg-white px-3.5 py-2 rounded-lg border border-[#1B382E]/10">
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
            <div className="text-xs md:text-sm font-bold text-[#5A6B63] mb-2.5">
              매출 증감액({fmtSignedInt(formula?.revenueDiffAmount, '원')})의 5가지 원인별 금액
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: '① 방문객 수 증감', val: formula?.volumeEffectAmount },
                { label: '② 객실·골프·레저 단가', val: formula?.coreSegmentPurePriceEffectAmount },
                { label: '③ 식당 1인당 식사비', val: formula?.pureFnbAttachEffectAmount },
                { label: '④ 단체 연회·대관 행사', val: formula?.banquetBaseEffectAmount },
                { label: '⑤ 손님 유형 비중 변화', val: formula?.visitorMixEffectAmount }
              ].map((item, idx) => {
                const neg = Number(item.val) < 0;
                return (
                  <div key={idx} className="rounded-xl bg-[#F4F3EE]/70 border border-[#1B382E]/10 p-3.5">
                    <div className="text-xs md:text-[13px] text-[#5A6B63] font-bold">{item.label}</div>
                    <div className={`text-base md:text-lg font-black mt-1.5 ${neg ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {fmtSignedInt(item.val, '원')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4대 사업부별 어디서 줄고 늘었나? (직관적인 항목별 표 + 쉬운 한글 요약 구조) */}
        <div>
          <div className="text-sm md:text-base font-extrabold text-[#1B382E] mb-3">
            4대 사업부별 매출 증감 및 핵심 원인 (어느 부문에서 왜 줄고 늘었는가)
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {segmentSummaryRows.map((row: any, idx: number) => {
              const neg = Number(row?.diffAmount) < 0;
              const segCode = String(row?.segmentCode || '');
              const diagClauses = splitTopLevelClauses(row?.isolationDiagnosis);

              return (
                <div
                  key={idx}
                  className={`rounded-2xl p-4 md:p-5 border space-y-3.5 ${
                    neg
                      ? 'bg-rose-50/35 border-rose-200'
                      : 'bg-emerald-50/35 border-emerald-200'
                  }`}
                >
                  {/* 카드 상단 헤더: 사업부명 + 비교기➔당기 매출 + 증감액/증감률 */}
                  <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-[#1B382E]/10">
                    <div>
                      <div className="text-base md:text-lg font-black text-[#1B382E]">
                        {fmtText(row?.segmentName)}
                      </div>
                      <div className="text-xs md:text-[13px] text-[#5A6B63] font-medium mt-0.5">
                        매출: {fmtInt(row?.lyRevenue)}원 ➔ <strong className="text-[#1B382E]">{fmtInt(row?.tyRevenue)}원</strong>
                      </div>
                      {row?.tyVisitors !== null && row?.tyVisitors !== undefined && (
                        <div className="text-xs text-[#5A6B63] mt-0.5">
                          방문객: {fmtInt(row?.lyVisitors)}명 ➔ <strong className="text-[#1B382E]">{fmtInt(row?.tyVisitors)}명</strong> (
                          <span className={Number(row?.visitorDiff) < 0 ? 'text-rose-600 font-bold' : 'text-emerald-700 font-bold'}>
                            {fmtSignedInt(row?.visitorDiff, '명')}
                          </span>
                          ) · 1인당 {fmtInt(row?.lySpendPerHead)}➔{fmtInt(row?.tySpendPerHead)}원
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-xl md:text-2xl font-black ${
                          neg ? 'text-rose-600' : 'text-emerald-700'
                        }`}
                      >
                        {fmtSignedInt(row?.diffAmount, '원')}
                      </div>
                      <div className={`text-xs md:text-sm font-extrabold mt-0.5 ${neg ? 'text-rose-600' : 'text-emerald-700'}`}>
                        증감률 {fmtPct(row?.growthPct)}
                      </div>
                    </div>
                  </div>

                  {/* ① 콘도 (객실) 직관 요약 */}
                  {segCode === 'CONDO' && condoDetail && (
                    <div className="space-y-2.5 text-xs md:text-[13px]">
                      {channelMix.length > 0 && (
                        <div className="bg-white/90 rounded-xl p-3.5 border border-[#1B382E]/10 space-y-1.5">
                          <div className="font-extrabold text-[#284F42] text-xs mb-1">
                            예약 경로(채널)별 판매 객실 및 매출 증감
                          </div>
                          {channelMix.map((ch: any, cIdx: number) => {
                            const chNeg = Number(ch?.diffRevenue) < 0;
                            return (
                              <div key={cIdx} className="flex items-center justify-between py-1 border-b border-[#1B382E]/5 last:border-b-0">
                                <div>
                                  <span className="font-bold text-[#1B382E]">{fmtText(ch?.channelLabel)}</span>
                                  <span className="text-[#5A6B63] ml-1.5">
                                    ({fmtInt(ch?.lyRooms)}실 ➔ <strong className="text-[#1B382E]">{fmtInt(ch?.tyRooms)}실</strong>)
                                  </span>
                                </div>
                                <strong className={chNeg ? 'text-rose-600' : 'text-emerald-700'}>
                                  {fmtSignedInt(ch?.diffRevenue, '원')}
                                </strong>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {pyungMix.length > 0 && (
                        <div className="bg-white/90 rounded-xl p-3.5 border border-[#1B382E]/10 space-y-2">
                          <div className="font-extrabold text-[#284F42] text-xs">
                            객실 크기(평형)별 판매 객실수 비교
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {pyungMix.map((p: any, pIdx: number) => {
                              const pNeg = Number(p?.diffRooms) < 0;
                              const shortLabel = String(p?.pyungLabel || p?.pyungCode || '-').split(' ')[0];
                              return (
                                <div key={pIdx} className="rounded-lg bg-[#F4F3EE]/70 p-2.5 text-center border border-[#1B382E]/5">
                                  <div className="text-xs font-extrabold text-[#1B382E]">{shortLabel}</div>
                                  <div className="text-[11px] text-[#5A6B63] mt-0.5">
                                    {fmtInt(p?.lyRooms)} ➔ <strong className="text-[#1B382E]">{fmtInt(p?.tyRooms)}실</strong>
                                  </div>
                                  <div className={`text-xs font-black mt-0.5 ${pNeg ? 'text-rose-600' : 'text-emerald-700'}`}>
                                    {fmtSignedInt(p?.diffRooms, '실')}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="bg-white/90 rounded-xl p-3 border border-[#1B382E]/10 space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[#5A6B63] font-medium">방 열쇠 1개당 수익 (51평은 방 2개 연결)</span>
                          <strong className="text-[#1B382E]">
                            {fmtInt(condoDetail?.lyKeyYield)}원 ➔ {fmtInt(condoDetail?.tyKeyYield)}원 (
                            <span className={Number(condoDetail?.keyYieldGrowthPct) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                              {fmtPct(condoDetail?.keyYieldGrowthPct)}
                            </span>
                            )
                          </strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#5A6B63] font-medium">숙박 가능 골퍼 중 당일 귀가 (미숙박)</span>
                          <strong className="text-[#1B382E]">
                            대상 {fmtInt(compMarket?.unconvertedInternalStayDemand?.coreStayConversionTargetTeams)}팀 중{' '}
                            <span className="text-rose-600">
                              {fmtInt(compMarket?.unconvertedInternalStayDemand?.coreStayConversionNonStayTeams)}팀 미숙박
                            </span>
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ② 체험·레저 직관 요약 */}
                  {segCode === 'LEISURE' && leisureDetail && (
                    <div className="space-y-2.5 text-xs md:text-[13px]">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white/90 rounded-xl p-3 border border-[#1B382E]/10">
                          <div className="text-[11px] font-bold text-[#5A6B63]">야외 레저 시설 합계</div>
                          <div className={`text-sm md:text-base font-black mt-0.5 ${Number(leisureDetail?.outdoorDiffAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                            {fmtSignedInt(leisureDetail?.outdoorDiffAmount, '원')} ({fmtPct(leisureDetail?.outdoorGrowthPct)})
                          </div>
                        </div>
                        <div className="bg-white/90 rounded-xl p-3 border border-[#1B382E]/10">
                          <div className="text-[11px] font-bold text-[#5A6B63]">실내 레저 시설 합계</div>
                          <div className={`text-sm md:text-base font-black mt-0.5 ${Number(leisureDetail?.indoorDiffAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                            {fmtSignedInt(leisureDetail?.indoorDiffAmount, '원')} ({fmtPct(leisureDetail?.indoorGrowthPct)})
                          </div>
                        </div>
                      </div>

                      {venueVariances.length > 0 && (
                        <div className="bg-white/90 rounded-xl p-3.5 border border-[#1B382E]/10 space-y-1.5">
                          <div className="font-extrabold text-[#284F42] text-xs mb-1">
                            주요 매장별 매출 · 방문객 증감 (상위 5곳)
                          </div>
                          {venueVariances.slice(0, 5).map((v: any, vIdx: number) => {
                            const vNeg = Number(v?.diffAmount) < 0;
                            return (
                              <div key={vIdx} className="flex items-center justify-between py-1 border-b border-[#1B382E]/5 last:border-b-0">
                                <div>
                                  <span className="font-bold text-[#1B382E]">{fmtText(v?.venueName)}</span>
                                  <span className="text-[#5A6B63] ml-1.5 text-xs">
                                    ({fmtInt(v?.lyVisitors)}➔<strong className="text-[#1B382E]">{fmtInt(v?.tyVisitors)}명</strong>)
                                  </span>
                                </div>
                                <strong className={vNeg ? 'text-rose-600' : 'text-emerald-700'}>
                                  {fmtSignedInt(v?.diffAmount, '원')} ({fmtPct(v?.growthPct)})
                                </strong>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="bg-white/90 rounded-xl p-3 border border-[#1B382E]/10 space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[#5A6B63] font-medium">비 온 날 / 법정공휴일 변화</span>
                          <strong className="text-[#1B382E]">
                            우천 {fmtInt(extWeather?.lyRainyDays)}➔{fmtInt(extWeather?.tyRainyDays)}일 (휴일비{' '}
                            {fmtInt(extWeather?.lyRedDayRainyDays)}➔{fmtInt(extWeather?.tyRedDayRainyDays)}일) · 공휴일{' '}
                            {fmtInt(calFactor?.lyHolidayDays)}➔{fmtInt(calFactor?.tyHolidayDays)}일
                          </strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#5A6B63] font-medium">4시간 이상 머문 나들이 차량</span>
                          <strong className="text-[#1B382E]">
                            {fmtInt(parkingBehavior?.lyWalkinLongDwell4hPlusCars)}대 ➔{' '}
                            {fmtInt(
                              compMarket?.unconvertedInternalStayDemand?.longDwell4hPlusWalkinCars ??
                                parkingBehavior?.tyWalkinLongDwell4hPlusCars
                            )}
                            대
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ③ F&B · 연회대관 직관 요약 */}
                  {segCode === 'FNB_BANQUET' && fnbDetail && (
                    <div className="space-y-2.5 text-xs md:text-[13px]">
                      <div className="bg-white/90 rounded-xl p-3.5 border border-[#1B382E]/10 space-y-1.5">
                        <div className="font-extrabold text-[#284F42] text-xs mb-1">
                          직영 식당 vs 단체 세미나·연회 대관 증감
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-[#1B382E]/5">
                          <div>
                            <span className="font-bold text-[#1B382E]">직영 식당 일반 매출</span>
                            <span className="text-[#5A6B63] ml-1.5 text-xs">
                              (결제 {fmtInt(fnbDetail?.lyReceiptCount)}➔{fmtInt(fnbDetail?.tyReceiptCount)}건)
                            </span>
                          </div>
                          <strong className={Number(fnbDetail?.directFnbDiffAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                            {fmtSignedInt(fnbDetail?.directFnbDiffAmount, '원')} ({fmtPct(fnbDetail?.directFnbGrowthPct)})
                          </strong>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <div>
                            <span className="font-bold text-[#1B382E]">B2B 세미나 · 연회 대관</span>
                            <span className="text-[#5A6B63] ml-1.5 text-xs">
                              ({fmtInt(fnbDetail?.lyBanquetRevenue)}➔{fmtInt(fnbDetail?.tyBanquetRevenue)}원)
                            </span>
                          </div>
                          <strong className={Number(fnbDetail?.banquetDiffAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                            {fmtSignedInt(fnbDetail?.banquetDiffAmount, '원')} ({fmtPct(fnbDetail?.banquetGrowthPct)})
                          </strong>
                        </div>
                      </div>

                      {timeOfDayLinkages && (
                        <div className="bg-white/90 rounded-xl p-3.5 border border-[#1B382E]/10 space-y-2">
                          <div className="font-extrabold text-[#284F42] text-xs">
                            식사 시간대별 직영 식당 매출 및 비중
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { label: '아침 (06~10시)', node: timeOfDayLinkages?.morning06To10 },
                              { label: '점심·오후 (11~17시)', node: timeOfDayLinkages?.lunchAndAfternoon11To17 },
                              { label: '저녁 (18시~)', node: timeOfDayLinkages?.evening18Plus }
                            ].map((slot, sIdx) => (
                              <div key={sIdx} className="rounded-lg bg-[#F4F3EE]/70 p-2.5 text-center border border-[#1B382E]/5">
                                <div className="text-[11px] font-bold text-[#5A6B63]">{slot.label}</div>
                                <div className="text-xs font-black text-[#1B382E] mt-0.5">
                                  {fmtInt(slot.node?.tyRevenue)}원
                                </div>
                                <div className="text-[11px] font-extrabold text-[#284F42] mt-0.5">
                                  비중 {fmtPctOne(slot.node?.sharePct)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="bg-white/90 rounded-xl p-3 border border-[#1B382E]/10 space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[#5A6B63] font-medium">숙박객 단지 밖(외부 식당·마트) 외출</span>
                          <strong className="text-[#1B382E]">
                            {fmtInt(fnbDetail?.lyStayOutingCount)}회 ➔{' '}
                            <span className="text-rose-600">{fmtInt(fnbDetail?.tyStayOutingCount)}회</span> (외출률{' '}
                            {fmtPctOne(fnbDetail?.tyStayOutingRatePct)})
                          </strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#5A6B63] font-medium">영수증 1건당 평균 결제액</span>
                          <strong className="text-[#1B382E]">
                            {fmtInt(fnbDetail?.lyAvgCheckPerReceipt)}원 ➔ {fmtInt(fnbDetail?.tyAvgCheckPerReceipt)}원 (
                            {fmtPct(fnbDetail?.avgCheckGrowthPct)})
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ④ 골프 (벨포레CC) 직관 요약 */}
                  {segCode === 'GOLF' && golfDetail && (
                    <div className="space-y-2.5 text-xs md:text-[13px]">
                      {golfRevComp && (
                        <div className="bg-white/90 rounded-xl p-3.5 border border-[#1B382E]/10 space-y-1.5">
                          <div className="font-extrabold text-[#284F42] text-xs mb-1">
                            골프 항목별 매출 증감 (입장료 · 부대매출 · 카트비)
                          </div>
                          {[
                            {
                              label: '그린피 (입장료)',
                              ly: golfRevComp?.lyGreenFeeRevenue,
                              ty: golfRevComp?.tyGreenFeeRevenue,
                              diff: golfRevComp?.greenFeeDiff
                            },
                            {
                              label: '프로샵 · 스타트하우스 부대매출',
                              ly: golfRevComp?.lyProshopAndClubhouseExtraRevenue,
                              ty: golfRevComp?.tyProshopAndClubhouseExtraRevenue,
                              diff: golfRevComp?.extraRevenueDiff
                            },
                            {
                              label: '카트 대여료',
                              ly: golfRevComp?.lyCartFeeRevenue,
                              ty: golfRevComp?.tyCartFeeRevenue,
                              diff: golfRevComp?.cartFeeDiff
                            }
                          ].map((gItem, gIdx) => {
                            const gNeg = Number(gItem.diff) < 0;
                            return (
                              <div key={gIdx} className="flex items-center justify-between py-1 border-b border-[#1B382E]/5 last:border-b-0">
                                <span className="font-bold text-[#1B382E]">{gItem.label}</span>
                                <strong className={gNeg ? 'text-rose-600' : 'text-emerald-700'}>
                                  {fmtSignedInt(gItem.diff, '원')}
                                </strong>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {golfChannelMix.length > 0 && (
                        <div className="bg-white/90 rounded-xl p-3.5 border border-[#1B382E]/10 space-y-1.5">
                          <div className="font-extrabold text-[#284F42] text-xs mb-1">
                            예약 경로(채널)별 내장객 및 그린피 증감
                          </div>
                          {golfChannelMix.slice(0, 4).map((gc: any, gcIdx: number) => {
                            const gcNeg = Number(gc?.diffGreenFee) < 0;
                            return (
                              <div key={gcIdx} className="flex items-center justify-between py-1 border-b border-[#1B382E]/5 last:border-b-0">
                                <div>
                                  <span className="font-bold text-[#1B382E]">{fmtText(gc?.channelLabel)}</span>
                                  <span className="text-[#5A6B63] ml-1.5 text-xs">
                                    ({fmtInt(gc?.lyPlayers)}➔<strong className="text-[#1B382E]">{fmtInt(gc?.tyPlayers)}명</strong>)
                                  </span>
                                </div>
                                <strong className={gcNeg ? 'text-rose-600' : 'text-emerald-700'}>
                                  {fmtSignedInt(gc?.diffGreenFee, '원')}
                                </strong>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="bg-white/90 rounded-xl p-3 border border-[#1B382E]/10 space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[#5A6B63] font-medium">회원 vs 비회원 내장객</span>
                          <strong className="text-[#1B382E]">
                            회원 {fmtInt(golfDetail?.lyMemberPlayers)}➔{fmtInt(golfDetail?.tyMemberPlayers)}명 · 비회원{' '}
                            {fmtInt(golfDetail?.lyNonMemberPlayers)}➔{fmtInt(golfDetail?.tyNonMemberPlayers)}명
                          </strong>
                        </div>
                        {golfVisitorBehavior && (
                          <div className="flex items-center justify-between">
                            <span className="text-[#5A6B63] font-medium">위임·연단체 예약 / 도착 시각</span>
                            <strong className="text-[#1B382E]">
                              {fmtInt(golfVisitorBehavior?.lyDelegatedBookings ?? golfVisitorBehavior?.lyDelegatedGroupBookings)}➔
                              {fmtInt(golfVisitorBehavior?.tyDelegatedBookings ?? golfVisitorBehavior?.tyDelegatedGroupBookings)}건 · 티오프{' '}
                              {fmtInt(golfVisitorBehavior?.tyAvgPreTeeArrivalMinutes)}분 전 도착
                            </strong>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 백엔드 원문 진단 문자열 접기/펼치기 (보존) */}
                  {diagClauses.length > 0 && (
                    <details className="group pt-1">
                      <summary className="cursor-pointer text-xs font-bold text-[#5A6B63] hover:text-[#1B382E] select-none">
                        상세 종합 진단 요약문 보기 ({diagClauses.length}개 항목)
                      </summary>
                      <ul className="mt-2 space-y-1.5 text-xs text-[#1B382E]/85 bg-white/70 rounded-xl p-3 border border-[#1B382E]/10 leading-relaxed">
                        {diagClauses.map((c, cIdx) => (
                          <li key={cIdx} className="flex items-start gap-1.5">
                            <span className="font-bold text-[#284F42] shrink-0">•</span>
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              );
            })}
          </div>

          {segmentImpactBullets.length > 0 && (
            <div className="mt-4 rounded-xl bg-[#F4F3EE]/60 border border-[#1B382E]/10 p-4 space-y-2">
              <div className="text-xs md:text-sm font-black text-[#284F42]">부문별 심층 원인 진단 요약</div>
              <ul className="space-y-2 text-[13px] md:text-sm text-[#1B382E]/90 leading-relaxed">
                {segmentImpactBullets.map((bullet, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-black text-[#284F42] shrink-0">•</span>
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
