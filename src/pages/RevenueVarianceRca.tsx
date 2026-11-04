import { useState, useEffect } from 'react';
import { useDate } from '../contexts/DateContext';
import { secureFetcher } from '../lib/secureFetcher';
import GlobalDatePicker from '../components/GlobalDatePicker';
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Target,
  FileCheck2,
  Info
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

const getStatusBadge = (status: unknown) => {
  const s = String(status || '');
  if (s === 'CONFIRMED') {
    return { label: '채택 (핵심 원인)', cls: 'bg-rose-600 text-white' };
  }
  if (s === 'PARTIAL') {
    return { label: '부분 채택 (복합 요인)', cls: 'bg-amber-500 text-white' };
  }
  if (s === 'REJECTED') {
    return { label: '기각 (영향 없음)', cls: 'bg-slate-200 text-slate-700' };
  }
  return { label: fmtText(status), cls: 'bg-slate-100 text-slate-700' };
};

export default function RevenueVarianceRca() {
  const { startDate, endDate } = useDate();
  const [compareMode, setCompareMode] = useState<'YOY_DOW' | 'YOY_DATE' | 'MOM'>('YOY_DOW');
  const [showMoreDetails, setShowMoreDetails] = useState<boolean>(false);

  const [rcaData, setRcaData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchRcaData = async () => {
    setLoading(true);
    try {
      const res = await secureFetcher(
        `${API_BASE}/api/v6/report/revenue-variance-rca?startDate=${startDate}&endDate=${endDate}&compareMode=${compareMode}`
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
  }, [startDate, endDate, compareMode]);

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

  const fourFactors = rcaData?.fourFactorVerification || null;
  const calFactor = fourFactors?.calendarFactor || null;
  const weatherFactor = fourFactors?.weatherFactor || null;
  const compMarket = fourFactors?.competitorMarketFactor || null;
  const parkingBehavior = fourFactors?.parkingAndBehaviorFactor || null;
  const integrityFactor = fourFactors?.dataIntegrityFactor || null;

  const structuredReport = rcaData?.structuredReport || null;
  const top3Hypotheses: any[] = Array.isArray(structuredReport?.top3Hypotheses)
    ? structuredReport.top3Hypotheses
    : [];
  const immediateActionItems: string[] = Array.isArray(structuredReport?.immediateActionItems)
    ? structuredReport.immediateActionItems
    : [];

  const isNegative = Number(formula?.revenueDiffAmount) < 0;

  return (
    <div className="min-h-screen bg-[#F4F3EE] text-[#1B382E] p-4 md:p-6 lg:p-8 space-y-5 max-w-6xl mx-auto">
      {/* 상단 헤더 & 비교 기준 선택 */}
      <div className="bg-white rounded-2xl border border-[#1B382E]/10 shadow-xs p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-[#1B382E] tracking-tight">
              매출 증감 원인 요약
            </h1>
            {period && (
              <p className="text-xs md:text-sm text-[#6C7A73] mt-1">
                분석일: <strong className="text-[#1B382E]">{fmtText(period?.tyStartDate)} ~ {fmtText(period?.tyEndDate)}</strong>
                {' '}vs 비교일:{' '}
                <strong className="text-[#284F42]">{fmtText(period?.lyStartDate)} ~ {fmtText(period?.lyEndDate)}</strong>
                {calFactor?.operatingRegimeLabel ? ` · ${fmtText(calFactor.operatingRegimeLabel)}` : ''}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <GlobalDatePicker />
            <div className="flex items-center bg-[#F4F3EE] p-1 rounded-xl">
              {[
                { code: 'YOY_DOW' as const, label: '전년 동요일' },
                { code: 'YOY_DATE' as const, label: '전년 동일날짜' },
                { code: 'MOM' as const, label: '전월 동기' }
              ].map((mode) => (
                <button
                  key={mode.code}
                  type="button"
                  onClick={() => setCompareMode(mode.code)}
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
          1. 매출의 증감 이유는 딱 무엇인가? (핵심 결론)
         ===================================================================== */}
      <div className="bg-white rounded-2xl border-2 border-[#284F42] shadow-xs p-5 md:p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#1B382E]/10 pb-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#284F42] text-white text-xs font-bold">
              <Target size={14} />
              1. 매출 증감 결론 (Why)
            </span>
            <h2 className="text-lg md:text-xl font-black text-[#1B382E] pt-1">
              {fmtText(formula?.primaryDriverLabel)}
            </h2>
          </div>

          <div className="bg-[#F4F3EE] rounded-xl px-4 py-3 text-right shrink-0">
            <div className="text-xs text-[#6C7A73] font-semibold">
              전사 순매출 ({fmtText( fmtInt(formula?.tyTotalRevenue))}원 vs 비교기 {fmtInt(formula?.lyTotalRevenue)}원)
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

        {/* 부문별 어디서 얼마나 줄고 늘었는가? (4대 부문 직관 요약) */}
        <div>
          <div className="text-xs font-bold text-[#6C7A73] mb-2.5">
            부문별 증감 요약 (어느 부문이 매출 증감을 주도했는가)
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
                  <p className="text-xs text-[#1B382E]/85 mt-1.5 leading-snug font-medium">
                    {fmtText(row?.isolationDiagnosis)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* =====================================================================
          2. 그렇게 결정한 이유는 무엇인가? (판단 근거 데이터)
         ===================================================================== */}
      <div className="bg-white rounded-2xl border border-[#1B382E]/10 shadow-xs p-5 md:p-6 space-y-5">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#B59269] text-white text-xs font-bold">
            <FileCheck2 size={14} />
            2. 그렇게 판단한 근거 (Evidence)
          </span>
          <h2 className="text-base md:text-lg font-black text-[#1B382E] mt-2">
            수치로 검증된 2가지 핵심 근거
          </h2>
        </div>

        {/* 근거 A: 방문객 수 vs 객단가 분해 */}
        <div className="rounded-xl bg-[#F4F3EE]/70 border border-[#1B382E]/10 p-4 space-y-3">
          <div className="text-xs font-black text-[#284F42]">
            근거 ① 방문객 수(볼륨) vs 1인당 객단가 분해
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-white rounded-lg p-3 border border-[#1B382E]/10">
              <div className="text-[#6C7A73] font-semibold">방문객 수 변화 (볼륨 효과)</div>
              <div className="text-sm font-black text-[#1B382E] mt-1">
                {fmtInt(formula?.lyTotalVisitors)}명 ➔ {fmtInt(formula?.tyTotalVisitors)}명 (
                <span className={Number(formula?.visitorDiffCount) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                  {fmtSignedInt(formula?.visitorDiffCount, '명')} / {fmtPct(formula?.visitorGrowthPct)}
                </span>
                )
              </div>
              <div className="mt-1.5 pt-1.5 border-t border-[#1B382E]/10 flex justify-between">
                <span className="text-[#6C7A73]">매출 영향액</span>
                <strong className={Number(formula?.volumeEffectAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                  {fmtSignedInt(formula?.volumeEffectAmount, '원')}
                </strong>
              </div>
            </div>

            <div className="bg-white rounded-lg p-3 border border-[#1B382E]/10">
              <div className="text-[#6C7A73] font-semibold">1인당 객단가 변화 (단가 효과)</div>
              <div className="text-sm font-black text-[#1B382E] mt-1">
                {fmtInt(formula?.lySpendPerHead)}원 ➔ {fmtInt(formula?.tySpendPerHead)}원 (
                <span className={Number(formula?.spendPerHeadDiff) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                  {fmtSignedInt(formula?.spendPerHeadDiff, '원')} / {fmtPct(formula?.spendPerHeadGrowthPct)}
                </span>
                )
              </div>
              <div className="mt-1.5 pt-1.5 border-t border-[#1B382E]/10 flex justify-between">
                <span className="text-[#6C7A73]">매출 영향액</span>
                <strong className={Number(formula?.priceEffectAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                  {fmtSignedInt(formula?.priceEffectAmount, '원')}
                </strong>
              </div>
            </div>

            <div className="bg-white rounded-lg p-3 border border-[#1B382E]/10">
              <div className="text-[#6C7A73] font-semibold">단가 세부 내역 (왜 단가 방어가 제한됐는가)</div>
              <div className="space-y-1 mt-1.5">
                <div className="flex justify-between">
                  <span className="text-[#6C7A73]">· 코어 3부문 순수단가</span>
                  <strong className="text-emerald-700">
                    {fmtSignedInt(formula?.coreSegmentPurePriceEffectAmount, '원')}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6C7A73]">· 식음 부착·대관 기저</span>
                  <strong
                    className={
                      Number(formula?.fnbAttachAndBanquetEffectAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'
                    }
                  >
                    {fmtSignedInt(formula?.fnbAttachAndBanquetEffectAmount, '원')}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6C7A73]">· 방문객 구성비(Mix)</span>
                  <strong className={Number(formula?.visitorMixEffectAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                    {fmtSignedInt(formula?.visitorMixEffectAmount, '원')}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 근거 B: 채택된 3대 원인 검증 지표 */}
        {top3Hypotheses.length > 0 && (
          <div className="space-y-2.5">
            <div className="text-xs font-black text-[#284F42]">
              근거 ② 데이터 검증으로 확인된 3대 원인
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              {top3Hypotheses.map((h: any, idx: number) => {
                const badge = getStatusBadge(h?.status);
                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-[#1B382E]/15 bg-white p-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${badge.cls}`}>
                          {badge.label}
                        </span>
                        <span className="text-xs md:text-sm font-black text-[#1B382E]">
                          {fmtText(h?.category)}
                        </span>
                      </div>
                      <div className="text-xs text-[#284F42] font-bold">
                        판단 수치: {fmtText(h?.verificationMetric)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          3. 기타 참고 요인 (짧은 1줄 설명)
         ===================================================================== */}
      <div className="bg-white rounded-2xl border border-[#1B382E]/10 shadow-xs p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-black text-[#6C7A73]">
            <Info size={14} className="text-[#284F42]" />
            3. 외부 환경 및 주요 운영 지표 (한 줄 요약)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
          <div className="rounded-lg bg-[#F4F3EE]/60 px-3 py-2.5 flex items-center justify-between">
            <span className="text-[#6C7A73] font-semibold">날씨 / 공휴일</span>
            <strong className="text-[#1B382E]">
              {fmtText(weatherFactor?.tyCondition)} {fmtText(weatherFactor?.tyTempMax)}°C (비교기{' '}
              {fmtText(weatherFactor?.lyCondition)} {fmtText(weatherFactor?.lyTempMax)}°C) · 공휴일{' '}
              {fmtInt(calFactor?.tyHolidayCount)}일
            </strong>
          </div>

          <div className="rounded-lg bg-[#F4F3EE]/60 px-3 py-2.5 flex items-center justify-between">
            <span className="text-[#6C7A73] font-semibold">경쟁사 만실 여부</span>
            <strong className="text-[#1B382E]">
              충청 4사 만실 {fmtInt(compMarket?.soldOutResortCount)}/{fmtInt(compMarket?.monitoredResortCount)}곳 (최저가{' '}
              {fmtInt(compMarket?.competitorAvgMinPrice)}원, 30일비 {fmtPctOne(compMarket?.competitorPriceSurgeRatioPct, true)})
            </strong>
          </div>

          <div className="rounded-lg bg-[#F4F3EE]/60 px-3 py-2.5 flex items-center justify-between">
            <span className="text-[#6C7A73] font-semibold">콘도 열쇠 가동·수익</span>
            <strong className="text-[#1B382E]">
              물리열쇠 {fmtPctOne(condoDetail?.tyPhysicalKeyOccPct)} (기대{' '}
              {fmtPctOne(calFactor?.regimeDynamicThresholds?.expectedKeyOccPct)}) · 열쇠당{' '}
              {fmtInt(condoDetail?.tyKeyYield)}원 ({fmtPct(condoDetail?.keyYieldGrowthPct)})
            </strong>
          </div>

          <div className="rounded-lg bg-[#F4F3EE]/60 px-3 py-2.5 flex items-center justify-between">
            <span className="text-[#6C7A73] font-semibold">골퍼 미숙박 이탈</span>
            <strong className="text-[#1B382E]">
              진성타겟 {fmtInt(compMarket?.unconvertedInternalStayDemand?.coreStayConversionTargetTeams)}팀 중{' '}
              <span className="text-rose-600">
                {fmtInt(compMarket?.unconvertedInternalStayDemand?.coreStayConversionNonStayTeams)}팀 미숙박
              </span>
            </strong>
          </div>

          <div className="rounded-lg bg-[#F4F3EE]/60 px-3 py-2.5 flex items-center justify-between">
            <span className="text-[#6C7A73] font-semibold">투숙객 외부 외출</span>
            <strong className="text-[#1B382E]">
              외출 {fmtInt(parkingBehavior?.stayCarsWithOutingCount)}회 (
              <span className="text-rose-600">{fmtPctOne(parkingBehavior?.stayCarsOutingRatePct)}</span>, 경보 기준{' '}
              {fmtPctOne(calFactor?.regimeDynamicThresholds?.outingAlertThresholdPct)})
            </strong>
          </div>

          <div className="rounded-lg bg-[#F4F3EE]/60 px-3 py-2.5 flex items-center justify-between">
            <span className="text-[#6C7A73] font-semibold">정산 무결성 / 후정산</span>
            <strong className="text-[#1B382E]">
              오차 {fmtInt(integrityFactor?.gatekeeperDeltaWon)}원 · 후정산 대기{' '}
              {fmtInt(integrityFactor?.b2bDeferredSettlementAmount)}원
            </strong>
          </div>
        </div>

        {/* 필요할 때만 펼쳐보는 상세 보기 버튼 */}
        <div className="pt-2 flex justify-center">
          <button
            type="button"
            onClick={() => setShowMoreDetails((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F4F3EE] hover:bg-[#E7E5DD] text-[#1B382E] text-xs font-bold transition-colors cursor-pointer"
          >
            {showMoreDetails ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            {showMoreDetails ? '상세 설명 및 부문별 세부 수치 접기' : '필요 시 상세 설명 및 대응책 더보기'}
          </button>
        </div>

        {/* 선택적 펼침 영역: 가설 상세 설명, 부문별 세부 수치, 즉각 대응책 */}
        {showMoreDetails && (
          <div className="pt-4 border-t border-[#1B382E]/10 space-y-4 text-xs">
            {/* 가설별 보충 설명 */}
            {top3Hypotheses.length > 0 && (
              <div className="space-y-2">
                <div className="font-black text-[#284F42]">· 3대 원인 상세 설명</div>
                {top3Hypotheses.map((h: any, idx: number) => (
                  <div key={idx} className="rounded-lg bg-[#F4F3EE]/50 p-3 space-y-1">
                    <div className="font-bold text-[#1B382E]">{fmtText(h?.hypothesisTitle)}</div>
                    <p className="text-[#6C7A73] leading-relaxed">{fmtText(h?.evidenceDetail)}</p>
                  </div>
                ))}
              </div>
            )}

            {/* 4대 부문 핵심 수치 요약 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-lg border border-[#1B382E]/10 p-3 space-y-1">
                <div className="font-black text-[#1B382E]">콘도 핵심 지표</div>
                <div className="flex justify-between">
                  <span className="text-[#6C7A73]">가동객실 / ADR</span>
                  <strong>
                    {fmtInt(condoDetail?.tySoldRooms)}실 / {fmtInt(condoDetail?.tyAdr)}원
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6C7A73]">물리열쇠 소진</span>
                  <strong>
                    {fmtInt(condoDetail?.tyOccupiedPhysicalKeys)}/{fmtInt(condoDetail?.physicalKeyCapacity)}키 (
                    {fmtPctOne(condoDetail?.tyPhysicalKeyOccPct)})
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6C7A73]">객실당 인원</span>
                  <strong>{fmtText(condoDetail?.tyAvgPartySizePerRoom)}명/실</strong>
                </div>
              </div>

              <div className="rounded-lg border border-[#1B382E]/10 p-3 space-y-1">
                <div className="font-black text-[#1B382E]">골프 핵심 지표</div>
                <div className="flex justify-between">
                  <span className="text-[#6C7A73]">완주 팀 / 내장객</span>
                  <strong>
                    {fmtInt(golfDetail?.tyTotalTeams)}팀 / {fmtInt(golfDetail?.tyVisitors)}명
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6C7A73]">그린피 증감</span>
                  <strong>{fmtSignedInt(golfDetail?.greenFeeDiff, '원')}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6C7A73]">부대매출 증감</span>
                  <strong className="text-emerald-700">{fmtSignedInt(golfDetail?.ancillaryRevDiff, '원')}</strong>
                </div>
              </div>

              <div className="rounded-lg border border-[#1B382E]/10 p-3 space-y-1">
                <div className="font-black text-[#1B382E]">F&B·대관 핵심 지표</div>
                <div className="flex justify-between">
                  <span className="text-[#6C7A73]">직영 식음 매출</span>
                  <strong>{fmtInt(fnbDetail?.tyDirectFnbRevenue)}원</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6C7A73]">연회·대관 매출</span>
                  <strong>
                    {fmtInt(fnbDetail?.tyBanquetRevenue)}원 (비교기 {fmtInt(fnbDetail?.lyBanquetRevenue)}원)
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6C7A73]">식당 회전율</span>
                  <strong>
                    {fmtText(fnbDetail?.tyTableTurnoverRate)}회 (기준{' '}
                    {fmtText(calFactor?.regimeDynamicThresholds?.expectedFnbTurnover)}회)
                  </strong>
                </div>
              </div>

              <div className="rounded-lg border border-[#1B382E]/10 p-3 space-y-1">
                <div className="font-black text-[#1B382E]">체험·레저 핵심 지표</div>
                <div className="flex justify-between">
                  <span className="text-[#6C7A73]">야외 / 실내 매출</span>
                  <strong>
                    {fmtInt(leisureDetail?.tyOutdoorRevenue)}원 / {fmtInt(leisureDetail?.tyIndoorRevenue)}원
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6C7A73]">할인율</span>
                  <strong>{fmtPctOne(leisureDetail?.tyDiscountRatePct)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6C7A73]">미사용 티켓</span>
                  <strong>
                    {fmtInt(leisureDetail?.unredeemedTicketCount)}건 ({fmtInt(leisureDetail?.unredeemedTicketAmount)}원)
                  </strong>
                </div>
              </div>
            </div>

            {/* 즉각 실행 대응책 */}
            {immediateActionItems.length > 0 && (
              <div className="space-y-1.5">
                <div className="font-black text-[#8C6D46] flex items-center gap-1">
                  <CheckCircle2 size={14} />
                  권장 대응 액션
                </div>
                <ul className="space-y-1.5">
                  {immediateActionItems.map((item, idx) => (
                    <li key={idx} className="rounded-lg bg-[#F4F3EE]/50 px-3 py-2 text-[#1B382E] leading-relaxed">
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
