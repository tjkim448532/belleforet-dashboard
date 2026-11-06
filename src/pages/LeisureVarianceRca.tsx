import { useState, useEffect } from 'react';
import { useDate } from '../contexts/DateContext';
import { useAuth } from '../contexts/AuthContext';
import { secureFetcher } from '../lib/secureFetcher';
import GlobalDatePicker from '../components/GlobalDatePicker';
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldAlert
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

const fmtPctp = (val: unknown, showPlus = true): string => {
  if (val === null || val === undefined || val === '') return '-';
  const num = Number(val);
  if (Number.isNaN(num)) return '-';
  return `${showPlus && num > 0 ? '+' : ''}${num.toFixed(2)}%p`;
};

const fmtText = (val: unknown): string => {
  if (val === null || val === undefined || val === '') return '-';
  return String(val);
};

export default function LeisureVarianceRca() {
  const { isAdmin, userRole, userRoles } = useAuth();
  const hasAdminAccess = Boolean(
    isAdmin || userRole === 'admin' || (Array.isArray(userRoles) && userRoles.includes('admin'))
  );

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

  const [openAiBriefing, setOpenAiBriefing] = useState<boolean>(false);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiFetchedKey, setAiFetchedKey] = useState<string>('');
  const [openFactorAccordion, setOpenFactorAccordion] = useState<boolean>(false);
  const [openPartAccordion, setOpenPartAccordion] = useState<Record<string, boolean>>({});
  const [openAuditAccordion, setOpenAuditAccordion] = useState<boolean>(false);

  const currentQueryKey = `${dateKey}_${compareMode}`;

  const togglePart = (code: string) => {
    setOpenPartAccordion((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  const fetchLeisureRcaData = async () => {
    if (!hasAdminAccess) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await secureFetcher(
        `${API_BASE}/api/v6/report/leisure-variance-rca?startDate=${startDate}&endDate=${effectiveEndDate}&compareMode=${compareMode}&userRole=admin`,
        {
          headers: {
            'X-User-Role': 'admin'
          }
        }
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

  const handleRunAiBriefing = async (forceRefresh = false) => {
    if (!hasAdminAccess) return;
    setOpenAiBriefing(true);
    setAiLoading(true);
    try {
      const refreshParam = forceRefresh ? '&refreshAi=1' : '';
      const res = await secureFetcher(
        `${API_BASE}/api/v6/report/leisure-variance-rca?startDate=${startDate}&endDate=${effectiveEndDate}&compareMode=${compareMode}&aiBriefing=1${refreshParam}&userRole=admin`,
        {
          headers: {
            'X-User-Role': 'admin'
          }
        }
      ).catch(() => null);

      if (res && res.success) {
        setRcaData(res.data || res);
        setAiFetchedKey(currentQueryKey);
      }
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    fetchLeisureRcaData();
  }, [startDate, effectiveEndDate, compareMode, hasAdminAccess]);

  // 비관리자 직접 URL 접근 차단 (Admin-Only Guard)
  if (!hasAdminAccess) {
    return (
      <div className="min-h-screen bg-[#F4F3EE] text-[#1B382E] p-6 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-slate-200 p-8 max-w-md w-full text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <ShieldAlert size={24} />
          </div>
          <h2 className="text-lg font-black text-[#1B382E]">관리자(Admin) 전용 페이지입니다</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            레저본부 증감 원인 분석 리포트는 관리자 권한 계정으로만 열람할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  const period = rcaData?.period || null;
  const formula = rcaData?.formulaDecomposition || null;
  const aiBriefing = rcaData?.aiBriefing || rcaData?.structuredReport?.aiBriefing || null;
  const aiLabeledSentences: any[] = Array.isArray(aiBriefing?.labeledSentences)
    ? aiBriefing.labeledSentences
    : [];
  const aiSentences: string[] = Array.isArray(aiBriefing?.sentences)
    ? aiBriefing.sentences
    : [];

  const coreSheetTargets: any[] = Array.isArray(rcaData?.coreSheetVenueTargets)
    ? rcaData.coreSheetVenueTargets
    : [];

  const partIsolation = rcaData?.partIsolation || null;
  const partSummaryRows: any[] = Array.isArray(partIsolation?.partSummaryRows)
    ? partIsolation.partSummaryRows
    : [];
  const indoorOutdoor = partIsolation?.indoorVsOutdoorBreakdown || rcaData?.indoorVsOutdoorBreakdown || null;
  const venueBreakdown: any[] = Array.isArray(partIsolation?.venueBreakdown)
    ? partIsolation.venueBreakdown
    : [];

  const channelBreakdown =
    rcaData?.channelAndPackageBreakdown || partIsolation?.channelAndPackageBreakdown || null;
  const channels: any[] = Array.isArray(channelBreakdown?.channels) ? channelBreakdown.channels : [];
  const packageVsSingle = channelBreakdown?.packageVsSingle || null;

  const discountAudit =
    rcaData?.discountAndBreakageAudit || partIsolation?.discountAndBreakageAudit || null;
  const discountShops: any[] = Array.isArray(discountAudit?.shopBreakdown)
    ? discountAudit.shopBreakdown
    : [];

  const extFactors = rcaData?.externalAndSynergyFactors || null;
  const calWeather = extFactors?.calendarAndWeather || null;
  const groupSegments: any[] = Array.isArray(extFactors?.groupSegmentBreakdown?.segments)
    ? extFactors.groupSegmentBreakdown.segments
    : [];
  const walkinSynergy = extFactors?.walkinAndStaySynergy || null;

  const isNegative = Number(formula?.revenueDiffAmount) < 0;

  return (
    <div className="min-h-screen bg-[#F4F3EE] text-[#1B382E] p-4 md:p-6 lg:p-8 space-y-4 max-w-6xl mx-auto">
      {/* =====================================================================
          상단: 제목 및 날짜·비교 기준 선택
         ===================================================================== */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-[#1B382E]">레저본부 증감 원인 분석</h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-[#1B382E] border border-slate-200">
              Admin 전용
            </span>
          </div>
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
            onClick={fetchLeisureRcaData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1B382E] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            조회
          </button>
        </div>
      </div>

      {/* =====================================================================
          1. 상단 핵심 KPI 요약 카드 & AI 4문장 원인 브리핑
         ===================================================================== */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        {/* 레저본부 총매출 증감 */}
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <div className="text-xs font-bold text-slate-500">레저본부(TICKET) 총매출 증감</div>
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
            {calWeather && Number(calWeather?.calendarShiftEffectAmount) !== 0 && (
              <div>
                주말·휴일 일수 차이({fmtInt(calWeather?.lyRedDays)}➔{fmtInt(calWeather?.tyRedDays)}일) 감안 시:{' '}
                <strong
                  className={
                    Number(calWeather?.calendarAdjustedRevenueDiff) < 0 ? 'text-rose-600' : 'text-emerald-700'
                  }
                >
                  {fmtSignedInt(calWeather?.calendarAdjustedRevenueDiff, '원')}
                </strong>
              </div>
            )}
          </div>
        </div>

        {/* 4대 핵심 지표 카드 (Zero-Proxy 바인딩) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* ① 시설 티켓 이용객 (티켓 연인원) */}
          <div className="rounded-lg border border-slate-200 p-3.5">
            <div className="text-slate-500 font-semibold">시설 티켓 이용객 (티켓 연인원)</div>
            <div
              className={`text-base font-black mt-1 ${
                Number(formula?.ticketVisitorDiffCount) < 0 ? 'text-rose-600' : 'text-emerald-700'
              }`}
            >
              {fmtSignedInt(formula?.ticketVisitorDiffCount, '명')} ({fmtPct(formula?.ticketVisitorGrowthPct)})
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {fmtInt(formula?.lyTicketVisitors)}명 ➔ {fmtInt(formula?.tyTicketVisitors)}명
            </div>
          </div>

          {/* ② 레저본부 방문객 모수 (숙박[골프제외] + 나들이) */}
          <div className="rounded-lg border border-slate-200 p-3.5">
            <div className="text-slate-500 font-semibold">방문객 모수 (숙박[골프제외]+나들이)</div>
            <div
              className={`text-base font-black mt-1 ${
                Number(formula?.targetPoolDiffCount) < 0 ? 'text-rose-600' : 'text-emerald-700'
              }`}
            >
              {fmtSignedInt(formula?.targetPoolDiffCount, '명')} ({fmtPct(formula?.targetPoolGrowthPct)})
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {fmtInt(formula?.lyTargetPoolVisitors)}명 ➔ {fmtInt(formula?.tyTargetPoolVisitors)}명
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
              일반숙박(골프제외) {fmtSignedInt(formula?.pureRoomGuestsExGolfDiffCount, '명')} · 나들이{' '}
              {fmtSignedInt(formula?.walkinVisitorDiffCount, '명')} (골프동반 숙박{' '}
              {fmtInt(formula?.tyGolfSynergyStayGuests)}명 모수 제외)
            </div>
          </div>

          {/* ③ 레저 시설 이용률 (전환율) */}
          <div className="rounded-lg border border-slate-200 p-3.5">
            <div className="text-slate-500 font-semibold">레저 시설 이용률 (전환율)</div>
            <div
              className={`text-base font-black mt-1 ${
                Number(formula?.usageRateDiffPctp) < 0 ? 'text-rose-600' : 'text-emerald-700'
              }`}
            >
              {fmtPctp(formula?.usageRateDiffPctp)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {fmtPct(formula?.lyUsageRatePct, false)} ➔ {fmtPct(formula?.tyUsageRatePct, false)}
            </div>
          </div>

          {/* ④ 티켓 1인당 평균 단가 */}
          <div className="rounded-lg border border-slate-200 p-3.5">
            <div className="text-slate-500 font-semibold">티켓 1인당 평균 단가</div>
            <div
              className={`text-base font-black mt-1 ${
                Number(formula?.spendPerTicketVisitorDiff) < 0 ? 'text-rose-600' : 'text-emerald-700'
              }`}
            >
              {fmtSignedInt(formula?.spendPerTicketVisitorDiff, '원')} ({fmtPct(formula?.spendPerTicketVisitorGrowthPct)})
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {fmtInt(formula?.lySpendPerTicketVisitor)}원 ➔ {fmtInt(formula?.tySpendPerTicketVisitor)}원
            </div>
          </div>
        </div>

        {/* [버튼 클릭형] AI 레저본부 증감 원인 4문장 요약 */}
        <div className="border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[#1B382E]">
              <Sparkles size={15} className="text-[#1B382E]" />
              <span>AI로 레저본부 증감 원인 4문장 요약 보기</span>
              {aiFetchedKey === currentQueryKey && !aiLoading && (
                <span className="text-[11px] font-bold text-emerald-700 bg-white border border-slate-200 px-2 py-0.5 rounded">
                  AI 분석 완료
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleRunAiBriefing(false)}
                disabled={aiLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1B382E] hover:bg-[#142a22] text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-70"
              >
                {aiLoading ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>AI 분석 진행 중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />
                    <span>AI 분석 시작</span>
                  </>
                )}
              </button>

              {aiFetchedKey === currentQueryKey && !aiLoading && (
                <button
                  type="button"
                  onClick={() => handleRunAiBriefing(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-[#1B382E] hover:bg-slate-100 cursor-pointer"
                >
                  <RefreshCw size={12} />
                  <span>AI 다시 분석</span>
                </button>
              )}

              {aiBriefing && (
                <button
                  type="button"
                  onClick={() => setOpenAiBriefing((prev) => !prev)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:text-[#1B382E] cursor-pointer"
                >
                  <span>{openAiBriefing ? '접기' : '내용 보기'}</span>
                  {openAiBriefing ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              )}
            </div>
          </div>

          {openAiBriefing && (
            <div className="mt-2.5 rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-3 text-xs">
              {aiLoading && (
                <div className="flex items-center gap-2 rounded-md bg-[#1B382E] text-white px-3.5 py-2.5 font-bold">
                  <RefreshCw size={14} className="animate-spin shrink-0" />
                  <span>AI가 현재 조회 기간의 레저본부 증감 원인을 4문장으로 분석하고 있습니다...</span>
                </div>
              )}

              {aiBriefing?.headline && (
                <div className="font-black text-sm text-[#1B382E]">{fmtText(aiBriefing.headline)}</div>
              )}

              {aiBriefing?.oneLineTakeaway && (
                <div className="rounded-md bg-white border border-slate-200 px-3 py-2 font-bold text-[#1B382E] leading-relaxed">
                  핵심 시사점: {fmtText(aiBriefing.oneLineTakeaway)}
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

        {/* [아코디언] 원인별 금액 3단 분해 (Δ = 0원) */}
        {formula && (
          <div className="border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={() => setOpenFactorAccordion((prev) => !prev)}
              className="w-full flex items-center justify-between text-xs font-bold text-slate-600 hover:text-[#1B382E] py-1 cursor-pointer"
            >
              <span>
                원인별 금액 3단 분해 보기 (방문객 모수 효과 · 시설 이용률 효과 · 티켓 단가 효과 | 정산 오차{' '}
                {fmtInt(formula?.decompositionDeltaWon)}원)
              </span>
              {openFactorAccordion ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>

            {openFactorAccordion && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-3 text-xs">
                <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                  <div className="text-slate-500 font-semibold">① 방문객 모수 증감 효과</div>
                  <div
                    className={`text-sm font-black mt-1 ${
                      Number(formula?.poolVolumeEffectAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {fmtSignedInt(formula?.poolVolumeEffectAmount, '원')}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    숙박(골프제외)+나들이 모수({fmtSignedInt(formula?.targetPoolDiffCount, '명')}) 변화 영향
                  </div>
                </div>

                <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                  <div className="text-slate-500 font-semibold">② 시설 이용률(전환율) 증감 효과</div>
                  <div
                    className={`text-sm font-black mt-1 ${
                      Number(formula?.usageRateEffectAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {fmtSignedInt(formula?.usageRateEffectAmount, '원')}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    모수 대비 티켓 발권 전환율({fmtPctp(formula?.usageRateDiffPctp)}) 변화 영향
                  </div>
                </div>

                <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                  <div className="text-slate-500 font-semibold">③ 티켓 단가 · 권종 믹스 효과</div>
                  <div
                    className={`text-sm font-black mt-1 ${
                      Number(formula?.ticketPriceMixEffectAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {fmtSignedInt(formula?.ticketPriceMixEffectAmount, '원')}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    티켓 1인당 평균 단가({fmtSignedInt(formula?.spendPerTicketVisitorDiff, '원')}) 변화 영향
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* =====================================================================
          2. 4대 핵심 영업장 매출 · 이용률 현황 (coreSheetVenueTargets)
         ===================================================================== */}
      {coreSheetTargets.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-[#1B382E]">4대 핵심 영업장 매출 · 이용률 현황</h2>
            <span className="text-[11px] text-slate-500">
              모수 기준: 숙박(골프제외)+나들이 {fmtInt(formula?.tyTargetPoolVisitors)}명
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {coreSheetTargets.map((v: any, idx: number) => {
              const revNeg = Number(v?.revenueDiffAmount) < 0;
              const rateNeg = Number(v?.usageRateDiffPctp) < 0;
              return (
                <div key={v?.venueKey || idx} className="rounded-lg border border-slate-200 p-3.5 space-y-1.5">
                  <div className="font-black text-[#1B382E] text-sm">{fmtText(v?.venueName)}</div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-slate-500">매출 증감</span>
                    <strong className={revNeg ? 'text-rose-600' : 'text-emerald-700'}>
                      {fmtSignedInt(v?.revenueDiffAmount, '원')} ({fmtPct(v?.revenueGrowthPct)})
                    </strong>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {fmtInt(v?.lyRevenue)}원 ➔ {fmtInt(v?.tyRevenue)}원
                  </div>
                  <div className="flex items-baseline justify-between pt-1 border-t border-slate-100">
                    <span className="text-slate-500">티켓 이용객</span>
                    <strong className={Number(v?.visitorDiffCount) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                      {fmtInt(v?.lyVisitors)}➔{fmtInt(v?.tyVisitors)}명 ({fmtSignedInt(v?.visitorDiffCount, '명')})
                    </strong>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-slate-500">실제 이용률</span>
                    <strong className={rateNeg ? 'text-rose-600' : 'text-emerald-700'}>
                      {fmtPct(v?.lyUsageRatePct, false)} ➔ {fmtPct(v?.tyUsageRatePct, false)} ({fmtPctp(v?.usageRateDiffPctp)})
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          3. 레저본부 4대 파트별 매출·이용객·이용률 및 소속 영업장 상세
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {partSummaryRows.map((part: any, idx: number) => {
          const partCode = String(part?.partCode || part?.segmentCode || idx);
          const neg = Number(part?.diffAmount) < 0;
          const isOpen = Boolean(openPartAccordion[partCode]);
          const partVenues: any[] = Array.isArray(part?.venues) ? part.venues : [];

          return (
            <div key={partCode} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              {/* 파트 헤더 */}
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <div className="text-base font-black text-[#1B382E]">
                    {fmtText(part?.partName || part?.segmentName)}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {fmtInt(part?.lyRevenue)}원 ➔ {fmtInt(part?.tyRevenue)}원 · 시설 이용(티켓 연인원){' '}
                    <strong className={Number(part?.visitorDiffCount) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                      {fmtSignedInt(part?.visitorDiffCount, '명')}
                    </strong>{' '}
                    · 이용률 {fmtPct(part?.tyUsageRatePct, false)} ({fmtPctp(part?.usageRateDiffPctp)})
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-black ${neg ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {fmtSignedInt(part?.diffAmount, '원')}
                  </div>
                  <div className={`text-xs font-bold ${neg ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {fmtPct(part?.growthPct)}
                  </div>
                </div>
              </div>

              {/* 소속 영업장 리스트 */}
              <div className="divide-y divide-slate-100 text-xs">
                {partVenues.map((v: any, vIdx: number) => {
                  const vNeg = Number(v?.diffAmount) < 0;
                  return (
                    <div key={vIdx} className="flex items-center justify-between py-1.5 gap-2">
                      <div>
                        <span className="font-bold text-[#1B382E]">{fmtText(v?.venueName)}</span>
                        <span className="text-slate-500 ml-1.5">
                          ({fmtInt(v?.lyVisitors)}➔{fmtInt(v?.tyVisitors)}명 · 이용률 {fmtPct(v?.tyUsageRatePct, false)})
                        </span>
                      </div>
                      <strong className={vNeg ? 'text-rose-600' : 'text-emerald-700'}>
                        {fmtSignedInt(v?.diffAmount, '원')}
                      </strong>
                    </div>
                  );
                })}
              </div>

              {/* 파트 상세 아코디언 (단가·수량 분해 및 진단) */}
              <div className="pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => togglePart(partCode)}
                  className="w-full flex items-center justify-between text-xs font-bold text-slate-600 hover:text-[#1B382E] py-1 cursor-pointer"
                >
                  <span>영업장별 단가·수량 효과 상세 {isOpen ? '접기' : '보기'}</span>
                  {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>

                {isOpen && (
                  <div className="mt-2 pt-2.5 border-t border-slate-100 space-y-2 text-xs">
                    {part?.isolationDiagnosis && (
                      <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200 text-slate-700">
                        <strong className="text-[#1B382E]">핵심 요약: </strong>
                        {fmtText(part.isolationDiagnosis)}
                      </div>
                    )}
                    <div className="space-y-1">
                      {partVenues.map((v: any, vIdx: number) => (
                        <div key={vIdx} className="flex flex-wrap items-center justify-between text-[11px] text-slate-600 py-0.5">
                          <span className="font-semibold text-[#1B382E]">
                            • {fmtText(v?.venueName)} ({fmtText(v?.environmentLabel)})
                          </span>
                          <span>
                            평균단가 {fmtInt(v?.lyAvgPrice)}➔{fmtInt(v?.tyAvgPrice)}원 | 수량효과{' '}
                            <strong className={Number(v?.volumeEffectAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                              {fmtSignedInt(v?.volumeEffectAmount, '원')}
                            </strong>{' '}
                            / 단가효과{' '}
                            <strong className={Number(v?.priceEffectAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                              {fmtSignedInt(v?.priceEffectAmount, '원')}
                            </strong>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* =====================================================================
          4. 실내/야외 · 판매채널 · 할인·미사용 티켓 요약 & 전체 영업장 표 (아코디언)
         ===================================================================== */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {/* ① 야외 vs 실내 비교 */}
          <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 space-y-1">
            <div className="text-slate-500 font-semibold">야외 vs 실내 레저시설</div>
            <div className="flex justify-between">
              <span className="text-[#1B382E] font-bold">야외 시설 ({fmtPct(indoorOutdoor?.outdoor?.tySharePct, false)})</span>
              <strong className={Number(indoorOutdoor?.outdoor?.diffAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                {fmtSignedInt(indoorOutdoor?.outdoor?.diffAmount, '원')} ({fmtSignedInt(indoorOutdoor?.outdoor?.visitorDiffCount, '명')})
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[#1B382E] font-bold">실내 시설 ({fmtPct(indoorOutdoor?.indoor?.tySharePct, false)})</span>
              <strong className={Number(indoorOutdoor?.indoor?.diffAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                {fmtSignedInt(indoorOutdoor?.indoor?.diffAmount, '원')} ({fmtSignedInt(indoorOutdoor?.indoor?.visitorDiffCount, '명')})
              </strong>
            </div>
          </div>

          {/* ② 판매채널 및 패키지 요약 */}
          <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 space-y-1">
            <div className="text-slate-500 font-semibold">판매채널 · 패키지 구분</div>
            {channels.slice(0, 2).map((ch: any, cIdx: number) => (
              <div key={cIdx} className="flex justify-between">
                <span className="text-[#1B382E] font-bold">{fmtText(ch?.channelName)}</span>
                <strong className={Number(ch?.diffAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                  {fmtSignedInt(ch?.diffAmount, '원')}
                </strong>
              </div>
            ))}
            {packageVsSingle?.packageTicket && (
              <div className="text-[11px] text-slate-500 pt-0.5">
                객실 패키지 결합: {fmtSignedInt(packageVsSingle.packageTicket.diffAmount, '원')} (
                {fmtSignedInt(packageVsSingle.packageTicket.visitorDiffCount, '명')})
              </div>
            )}
          </div>

          {/* ③ 할인 및 미사용 티켓 점검 */}
          <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 space-y-1">
            <div className="text-slate-500 font-semibold">할인 차감 · 미사용 티켓 점검</div>
            <div className="font-bold text-[#1B382E]">
              할인액 {fmtInt(discountAudit?.tyDiscountAmount)}원 (할인율 {fmtPct(discountAudit?.tyDiscountRatePct, false)})
            </div>
            <div className="text-[11px] text-slate-600">
              미사용 티켓: <strong className="text-rose-600">{fmtInt(discountAudit?.tyUnusedCount)}건</strong> (
              {fmtInt(discountAudit?.tyUnusedAmount)}원) · 나들이 4시간+ 체류 {fmtInt(walkinSynergy?.tyWalkinLongDwellCars)}대
            </div>
          </div>
        </div>

        {/* [아코디언] 전 영업장 테이블 · 판매채널 전체 · 매장별 할인/미사용 · 단체 세그먼트 */}
        <div className="border-t border-slate-100 pt-2">
          <button
            type="button"
            onClick={() => setOpenAuditAccordion((prev) => !prev)}
            className="w-full flex items-center justify-between text-xs font-bold text-slate-600 hover:text-[#1B382E] py-1 cursor-pointer"
          >
            <span>전체 영업장 상세 표 · 판매채널 · 할인/미사용 티켓 · 단체 내역 {openAuditAccordion ? '접기' : '보기'}</span>
            {openAuditAccordion ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>

          {openAuditAccordion && (
            <div className="pt-3 space-y-4 text-xs">
              {/* 전 영업장 상세 테이블 (venueBreakdown) */}
              {venueBreakdown.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-[#1B382E] font-bold border-b border-slate-200">
                        <th className="py-2 px-3">파트</th>
                        <th className="py-2 px-3">영업장</th>
                        <th className="py-2 px-3 text-right">비교기 매출</th>
                        <th className="py-2 px-3 text-right">당기 매출</th>
                        <th className="py-2 px-3 text-right">매출 증감</th>
                        <th className="py-2 px-3 text-right">시설 이용(티켓)</th>
                        <th className="py-2 px-3 text-right">당기 이용률</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {venueBreakdown.map((v: any, idx: number) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 text-slate-600">{fmtText(v?.partName)}</td>
                          <td className="py-2 px-3 font-bold text-[#1B382E]">{fmtText(v?.venueName)}</td>
                          <td className="py-2 px-3 text-right">{fmtInt(v?.lyRevenue)}원</td>
                          <td className="py-2 px-3 text-right">{fmtInt(v?.tyRevenue)}원</td>
                          <td
                            className={`py-2 px-3 text-right font-bold ${
                              Number(v?.diffAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'
                            }`}
                          >
                            {fmtSignedInt(v?.diffAmount, '원')} ({fmtPct(v?.growthPct)})
                          </td>
                          <td className="py-2 px-3 text-right">
                            {fmtInt(v?.lyVisitors)}➔{fmtInt(v?.tyVisitors)}명 ({fmtSignedInt(v?.visitorDiffCount, '명')})
                          </td>
                          <td className="py-2 px-3 text-right font-semibold">
                            {fmtPct(v?.tyUsageRatePct, false)} ({fmtPctp(v?.usageRateDiffPctp)})
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 판매채널 전체 & 단체 세그먼트 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {channels.length > 0 && (
                  <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 space-y-1.5">
                    <div className="font-bold text-[#1B382E]">판매채널별 매출 및 이용객</div>
                    {channels.map((ch: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-slate-600">
                        <span>
                          • {fmtText(ch?.channelName)} ({fmtInt(ch?.lyVisitors)}➔{fmtInt(ch?.tyVisitors)}명)
                        </span>
                        <strong className={Number(ch?.diffAmount) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                          {fmtSignedInt(ch?.diffAmount, '원')} ({fmtPct(ch?.growthPct)})
                        </strong>
                      </div>
                    ))}
                  </div>
                )}

                {groupSegments.length > 0 && (
                  <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 space-y-1.5">
                    <div className="font-bold text-[#1B382E]">단체 고객 유형별 레저 매출</div>
                    {groupSegments.map((seg: any, idx: number) => (
                      <div key={idx} className="space-y-0.5 text-slate-600">
                        <div className="flex justify-between">
                          <span className="font-semibold text-[#1B382E]">• {fmtText(seg?.segmentName)}</span>
                          <strong>당기 {fmtInt(seg?.tyRevenue)}원</strong>
                        </div>
                        {seg?.topVenuesSummary && (
                          <div className="text-[11px] text-slate-500 pl-2.5">{fmtText(seg.topVenuesSummary)}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 매장별 할인 및 미사용 티켓 상세 */}
              {discountShops.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-[#1B382E] font-bold border-b border-slate-200">
                        <th className="py-2 px-3">매장명</th>
                        <th className="py-2 px-3">발권구분</th>
                        <th className="py-2 px-3 text-right">판매건수</th>
                        <th className="py-2 px-3 text-right">정상가 합계</th>
                        <th className="py-2 px-3 text-right">할인 차감액 (할인율)</th>
                        <th className="py-2 px-3 text-right">실매출</th>
                        <th className="py-2 px-3 text-right">미사용 티켓</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {discountShops.map((sh: any, idx: number) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-bold text-[#1B382E]">{fmtText(sh?.shopName)}</td>
                          <td className="py-2 px-3 text-slate-600">{fmtText(sh?.channelType)}</td>
                          <td className="py-2 px-3 text-right">{fmtInt(sh?.salesCount)}건</td>
                          <td className="py-2 px-3 text-right">{fmtInt(sh?.listAmount)}원</td>
                          <td className="py-2 px-3 text-right text-rose-600">
                            {fmtInt(sh?.discountAmount)}원 ({fmtPct(sh?.discountRatePct, false)})
                          </td>
                          <td className="py-2 px-3 text-right font-bold">{fmtInt(sh?.netAmount)}원</td>
                          <td className="py-2 px-3 text-right">
                            {fmtInt(sh?.unusedCount)}건 ({fmtInt(sh?.unusedAmount)}원)
                          </td>
                        </tr>
                      ))}
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
