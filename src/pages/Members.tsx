import { useState, useEffect } from 'react';
import { useDate } from '../contexts/DateContext';
import { secureFetcher } from '../lib/secureFetcher';
import ReactECharts from 'echarts-for-react';
import GlobalDatePicker from '../components/GlobalDatePicker';
import { 
  Calendar, RefreshCw, Hotel, 
  Award, Flag, Smartphone, Briefcase, Layers, Sparkles, UserCheck,
  Search, Building2, Coins, CheckCircle2
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

const formatNum = (val: any): string => {
  if (val === null || val === undefined || val === '') return '0';
  const num = typeof val === 'string' ? Number(val.replace(/,/g, '')) : Number(val);
  return isNaN(num) ? '0' : new Intl.NumberFormat('ko-KR').format(Math.round(num));
};

const shiftYearStr = (dateStr: string, deltaYears: number): string => {
  if (!dateStr || dateStr.length < 10) return dateStr;
  const y = parseInt(dateStr.slice(0, 4), 10);
  if (isNaN(y)) return dateStr;
  return `${y + deltaYears}${dateStr.slice(4)}`;
};

export default function Members() {
  const { startDate, endDate, isRange } = useDate();
  const isEffectiveRange = Boolean(isRange && endDate && startDate !== endDate);
  const effectiveEnd = isEffectiveRange && endDate ? endDate : startDate;

  const [loading, setLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // 1. 콘도/객실 회원권 및 요금타입별 실적 (room-rate-sales)
  const [rateRows, setRateRows] = useState<any[]>([]);
  const [lyRateRows, setLyRateRows] = useState<any[]>([]);
  const [ratePeriodMode, setRatePeriodMode] = useState<'today' | 'mtd' | 'ytd'>('today');

  // 2. 골프 분양회원 및 회원 동반 시너지 (golf-channel-intelligence & teetime-analysis-v2)
  const [golfIntel, setGolfIntel] = useState<any>(null);
  const [golfMembershipAnalysis, setGolfMembershipAnalysis] = useState<any>(null);

  // 3. 법인 휴양소 및 재방문 단체 회원사 (corporate-group-sales)
  const [corpData, setCorpData] = useState<any>(null);

  // 4. 온라인/모바일 디지털 회원 (online-members)
  const [onlineData, setOnlineData] = useState<any>(null);

  // 5. [Ticket 28 완제품] 분양회원 구좌별 소진율 및 당일 방문 회원별 통합 LTV 원장 (member-quota-ltv)
  const [quotaLtvData, setQuotaLtvData] = useState<{
    accountQuotaSummary: any[];
    accountQuotaOverview: any;
    visitedMembersLedger: any[];
  } | null>(null);
  const [memberLedgerSearch, setMemberLedgerSearch] = useState<string>('');
  const [memberLedgerFilter, setMemberLedgerFilter] = useState<string>('ALL');
  // 6. [Ticket 35] 온라인 단골 회원 이용횟수 등급 및 6개월 미방문 휴면(Win-back) 분석
  const [onlineDormancyIntel, setOnlineDormancyIntel] = useState<any>(null);

  const fetchAllMemberIntelligence = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const queryParams = `startDate=${startDate}&endDate=${effectiveEnd}`;
      const lyStart = shiftYearStr(startDate, -1);
      const lyEnd = shiftYearStr(effectiveEnd, -1);
      const lyQueryParams = `startDate=${lyStart}&endDate=${lyEnd}`;

      const [rateRes, lyRateRes, golfIntelRes, golfV2Res, corpRes, onlineRes, quotaLtvRes, dormancyRes] = await Promise.all([
        secureFetcher(`${API_BASE}/api/v6/report/room-rate-sales?${queryParams}`).catch(() => null),
        secureFetcher(`${API_BASE}/api/v6/report/room-rate-sales?${lyQueryParams}`).catch(() => null),
        secureFetcher(`${API_BASE}/api/v6/report/golf-channel-intelligence?${queryParams}`).catch(() => null),
        secureFetcher(`${API_BASE}/api/v6/report/golf-channel-teetime-analysis-v2?${queryParams}`).catch(() => null),
        secureFetcher(`${API_BASE}/api/v6/report/corporate-group-sales?${queryParams}`).catch(() => null),
        secureFetcher(`${API_BASE}/api/v6/report/online-members?${queryParams}`).catch(() => null),
        secureFetcher(`${API_BASE}/api/v6/report/member-quota-ltv?${queryParams}`).catch(() => null),
        secureFetcher(`${API_BASE}/api/v6/report/online-member-dormancy?${queryParams}`).catch(() => null)
      ]);

      const parsedRates = rateRes?.data ?? rateRes;
      setRateRows(Array.isArray(parsedRates) ? parsedRates : []);

      const parsedLyRates = lyRateRes?.data ?? lyRateRes;
      setLyRateRows(Array.isArray(parsedLyRates) ? parsedLyRates : []);

      const parsedGolfIntel = golfIntelRes?.data ?? golfIntelRes;
      setGolfIntel(parsedGolfIntel || null);

      const parsedGolfV2 = golfV2Res?.data ?? golfV2Res;
      setGolfMembershipAnalysis(
        parsedGolfV2?.meta?.summary?.membershipAnalysis ||
        parsedGolfV2?.membershipAnalysis ||
        null
      );

      const parsedCorp = corpRes?.data ?? corpRes;
      setCorpData(parsedCorp || null);

      const parsedOnline = onlineRes?.data ?? onlineRes;
      setOnlineData(parsedOnline || null);

      if (dormancyRes && (dormancyRes.summary || dormancyRes.data)) {
        setOnlineDormancyIntel(dormancyRes.data || dormancyRes);
      } else {
        setOnlineDormancyIntel(null);
      }

      const parsedQuotaLtv = quotaLtvRes?.data ?? quotaLtvRes;
      if (parsedQuotaLtv && (parsedQuotaLtv.accountQuotaSummary || parsedQuotaLtv.accountQuotaOverview)) {
        setQuotaLtvData({
          accountQuotaSummary: Array.isArray(parsedQuotaLtv.accountQuotaSummary) ? parsedQuotaLtv.accountQuotaSummary : [],
          accountQuotaOverview: parsedQuotaLtv.accountQuotaOverview || null,
          visitedMembersLedger: Array.isArray(parsedQuotaLtv.visitedMembersLedger) ? parsedQuotaLtv.visitedMembersLedger : []
        });
      } else {
        setQuotaLtvData(null);
      }
    } catch (err: any) {
      console.error('Member Intelligence Fetch Error:', err);
      setApiError(err.message || '회원 분석 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startDate) {
      fetchAllMemberIntelligence();
    }
  }, [startDate, endDate, isRange]);

  // --- 1. 콘도 회원권 데이터 추출 (백엔드 완제품 직접 매핑, NO SLICE SUMMATION) ---
  const findRateRow = (rows: any[], keyword: string) =>
    rows.find(r => String(r.rateName || r.segmentName || '').includes(keyword)) || null;

  const memberRoomRow = findRateRow(rateRows, '기명/구좌회원');
  const bearerRoomRow = findRateRow(rateRows, '무기명회원');
  const grandTotalRoomRow = rateRows.find(r => r.isGrandTotal || r.rateName === '총합계') || null;

  const segmentRateRows = rateRows.filter(r => !r.isGrandTotal && r.rateName !== '총합계');

  const isMemberRateCategory = (name: string): boolean => {
    return (
      name.includes('기명') ||
      name.includes('무기명') ||
      name.includes('회원') ||
      name.includes('기업영업') ||
      name.includes('휴양소') ||
      name.includes('임직원')
    );
  };

  // --- 2. 골프 분양회원 및 앵커 데이터 추출 ---
  const golfMemberSummary = golfIntel?.membershipSummary || null;
  const golfMemberBreakdown: any[] = Array.isArray(golfIntel?.membershipBreakdown)
    ? golfIntel.membershipBreakdown
    : [];
  const golfMemberSynergy = golfIntel?.memberSynergy || null;

  // --- 3. 법인 휴양소 및 단체 회원사 데이터 추출 ---
  const corpSummary = corpData?.summary || null;
  const corpFitSummary = corpSummary?.corpFit || null;
  const corpGroups: any[] = Array.isArray(corpData?.groups) ? corpData.groups : [];
  const memberCorpGroups = corpGroups.filter(
    g => g.b2bSegment === 'CORP_FIT' || g.category === 'RESORT_CORP'
  );

  // --- 4. 온라인 회원 데이터 추출 ---
  const onlineSummary = onlineData?.summary || null;
  const onlineChannelBreakdown = onlineData?.channelBreakdown || null;
  const recentOnlineMembers: any[] = Array.isArray(onlineData?.recentMembers)
    ? onlineData.recentMembers
    : [];

  // 콘도 요금타입별 비교 차트 옵션
  const getCondoRateChartOption = () => {
    const validRows = segmentRateRows.filter(r => {
      const rooms =
        ratePeriodMode === 'today'
          ? Number(r.todayRooms || 0)
          : ratePeriodMode === 'mtd'
          ? Number(r.mtdRooms || 0)
          : Number(r.ytdRooms || 0);
      const rev =
        ratePeriodMode === 'today'
          ? Number(r.todayRevenue || 0)
          : ratePeriodMode === 'mtd'
          ? Number(r.mtdRevenue || 0)
          : Number(r.ytdRevenue || 0);
      return rooms > 0 || rev > 0;
    });

    const labels = validRows.map(r => r.rateName || r.segmentName || '-');
    const roomsData = validRows.map(r =>
      ratePeriodMode === 'today'
        ? Number(r.todayRooms || 0)
        : ratePeriodMode === 'mtd'
        ? Number(r.mtdRooms || 0)
        : Number(r.ytdRooms || 0)
    );
    const adrData = validRows.map(r =>
      ratePeriodMode === 'today'
        ? Number(r.todayAdr || 0)
        : ratePeriodMode === 'mtd'
        ? Number(r.mtdAdr || 0)
        : Number(r.ytdAdr || 0)
    );

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      legend: {
        data: ['판매 객실수 (실)', '평균 객단가 ADR (원)'],
        bottom: 0
      },
      grid: { left: '3%', right: '4%', top: '12%', bottom: '16%', containLabel: true },
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: { color: '#475569', fontWeight: 600, interval: 0, rotate: labels.length > 5 ? 15 : 0 }
      },
      yAxis: [
        {
          type: 'value',
          name: '객실수 (실)',
          position: 'left',
          axisLabel: { formatter: '{value} 실' }
        },
        {
          type: 'value',
          name: 'ADR (원)',
          position: 'right',
          axisLabel: { formatter: '{value} 원' }
        }
      ],
      series: [
        {
          name: '판매 객실수 (실)',
          type: 'bar',
          yAxisIndex: 0,
          barMaxWidth: 42,
          data: roomsData.map((val, idx) => ({
            value: val,
            itemStyle: {
              color: isMemberRateCategory(labels[idx]) ? '#00ae95' : '#94a3b8',
              borderRadius: [8, 8, 0, 0]
            }
          }))
        },
        {
          name: '평균 객단가 ADR (원)',
          type: 'line',
          yAxisIndex: 1,
          data: adrData,
          smooth: true,
          symbolSize: 8,
          itemStyle: { color: '#4f46e5' },
          lineStyle: { width: 3 }
        }
      ]
    };
  };

  return (
    <div className="p-6 lg:p-10 max-w-[1600px] mx-auto min-h-screen bg-slate-50/50 space-y-8">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-emerald-900 via-[#00ae95] to-slate-900 rounded-[32px] p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/20 tracking-wide uppercase whitespace-nowrap">
                BELLEFORET MEMBERSHIP & LOYALTY INTELLIGENCE
              </span>
              <span className="bg-white/20 text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/20 font-medium whitespace-nowrap">
                <Calendar size={12} className="text-white shrink-0" />
                조회기간: <strong className="ml-1">{startDate} {isEffectiveRange && endDate ? `~ ${endDate}` : ''}</strong>
              </span>
            </div>
            
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mt-1 flex items-center gap-3 break-keep">
              <Award className="text-white shrink-0" size={32} />
              <span className="break-keep">
                통합 회원권 및 멤버십 분석 대시보드
              </span>
            </h1>
            <p className="text-sm text-white/85 mt-2 font-normal max-w-4xl break-keep">
              콘도 분양회원(기명·구좌 / 무기명), 법인 휴양소 협약 회원사, 골프장 분양회원(법인 풀구좌·콘도 구좌) 및 동반 앵커 효과, 디지털 온라인 멤버십까지 벨포레 전 부문의 회원 데이터를 SSOT 기준으로 통합 분석합니다.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 self-start 2xl:self-center">
            <GlobalDatePicker showPresets={true} />
            <button
              onClick={fetchAllMemberIntelligence}
              disabled={loading}
              className="px-4 py-2.5 bg-brand-mint hover:bg-emerald-400 active:bg-emerald-600 active:scale-90 text-white rounded-xl text-xs font-bold transition-all duration-150 shadow-md flex items-center justify-center gap-2 cursor-pointer select-none whitespace-nowrap shrink-0"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              새로고침
            </button>
          </div>
        </div>
      </div>

      {apiError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 text-sm font-semibold">
          {apiError}
        </div>
      )}

      {/* 4대 핵심 회원 그룹 요약 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        
        {/* KPI 1: 콘도 기명/구좌회원 */}
        <div className="bg-white p-6 rounded-[28px] border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <Hotel size={16} className="text-emerald-600 shrink-0" /> 콘도 기명/구좌회원
              </span>
              <span className="text-[11px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
                정규 분양회원
              </span>
            </div>
            <div className="text-3xl font-black text-slate-900 my-1 font-financial">
              {loading ? (
                <div className="animate-pulse h-9 w-28 bg-slate-200 rounded-lg inline-block" />
              ) : (
                <>
                  {formatNum(memberRoomRow?.todayRooms || 0)}
                  <span className="text-sm font-semibold text-slate-500 ml-1">실</span>
                  <span className="text-base font-bold text-emerald-700 ml-2.5">
                    ({formatNum(memberRoomRow?.todayRevenue || 0)}원)
                  </span>
                </>
              )}
            </div>
            <div className="text-xs text-slate-600 mt-1 font-financial">
              조회기간 객단가(ADR): <strong className="text-slate-900">{formatNum(memberRoomRow?.todayAdr || 0)}원</strong>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 bg-slate-50/70 -mx-6 -mb-6 p-4 rounded-b-[28px] text-[11px] text-slate-600 space-y-1 font-financial">
            <div className="flex justify-between">
              <span className="text-slate-500">당월 누적(MTD)</span>
              <strong className="text-slate-800">
                {formatNum(memberRoomRow?.mtdRooms || 0)}실 · {formatNum(memberRoomRow?.mtdRevenue || 0)}원
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">연간 누적(YTD)</span>
              <strong className="text-emerald-700">
                {formatNum(memberRoomRow?.ytdRooms || 0)}실 · {formatNum(memberRoomRow?.ytdRevenue || 0)}원
              </strong>
            </div>
          </div>
        </div>

        {/* KPI 2: 콘도 무기명회원 */}
        <div className="bg-white p-6 rounded-[28px] border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <Award size={16} className="text-teal-600 shrink-0" /> 콘도 무기명회원 (Bearer)
              </span>
              <span className="text-[11px] font-bold bg-teal-50 text-teal-700 px-2.5 py-0.5 rounded-full border border-teal-200">
                무기명 분양권
              </span>
            </div>
            <div className="text-3xl font-black text-slate-900 my-1 font-financial">
              {loading ? (
                <div className="animate-pulse h-9 w-28 bg-slate-200 rounded-lg inline-block" />
              ) : (
                <>
                  {formatNum(bearerRoomRow?.todayRooms || 0)}
                  <span className="text-sm font-semibold text-slate-500 ml-1">실</span>
                  <span className="text-base font-bold text-teal-700 ml-2.5">
                    ({formatNum(bearerRoomRow?.todayRevenue || 0)}원)
                  </span>
                </>
              )}
            </div>
            <div className="text-xs text-slate-600 mt-1 font-financial">
              조회기간 객단가(ADR): <strong className="text-slate-900">{formatNum(bearerRoomRow?.todayAdr || 0)}원</strong>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 bg-slate-50/70 -mx-6 -mb-6 p-4 rounded-b-[28px] text-[11px] text-slate-600 space-y-1 font-financial">
            <div className="flex justify-between">
              <span className="text-slate-500">당월 누적(MTD)</span>
              <strong className="text-slate-800">
                {formatNum(bearerRoomRow?.mtdRooms || 0)}실 · {formatNum(bearerRoomRow?.mtdRevenue || 0)}원
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">연간 누적(YTD)</span>
              <strong className="text-teal-700">
                {formatNum(bearerRoomRow?.ytdRooms || 0)}실 · {formatNum(bearerRoomRow?.ytdRevenue || 0)}원
              </strong>
            </div>
          </div>
        </div>

        {/* KPI 3: 골프장 분양회원 */}
        <div className="bg-white p-6 rounded-[28px] border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <Flag size={16} className="text-blue-600 shrink-0" /> 골프 분양회원 내장·매출
              </span>
              <span className="text-[11px] font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200">
                비중 {golfMemberSummary?.totalBunyangPlayerRatio ?? 0}%
              </span>
            </div>
            <div className="text-3xl font-black text-slate-900 my-1 font-financial">
              {loading ? (
                <div className="animate-pulse h-9 w-28 bg-slate-200 rounded-lg inline-block" />
              ) : (
                <>
                  {formatNum(golfMemberSummary?.totalBunyangPlayers || 0)}
                  <span className="text-sm font-semibold text-slate-500 ml-1">명</span>
                  <span className="text-base font-bold text-blue-700 ml-2">
                    ({formatNum(golfMemberSummary?.totalBunyangTeams || 0)}팀)
                  </span>
                </>
              )}
            </div>
            <div className="text-xs text-slate-600 mt-1 font-financial">
              분양회원 그린피 매출: <strong className="text-slate-900">{formatNum(golfMemberSummary?.totalBunyangRevenue || 0)}원</strong>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 bg-slate-50/70 -mx-6 -mb-6 p-4 rounded-b-[28px] text-[11px] text-slate-600 space-y-1 font-financial">
            <div className="flex justify-between">
              <span className="text-slate-500">회원 동반 비회원 앵커 매출</span>
              <strong className="text-blue-700">
                +{formatNum(golfMemberSynergy?.totalAnchorRevenue || 0)}원
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">회원 1인당 그린피 우대차액</span>
              <strong className="text-slate-800">
                {golfMembershipAnalysis?.greenFeeGapFormatted ? `-${golfMembershipAnalysis.greenFeeGapFormatted}원` : '-'}
              </strong>
            </div>
          </div>
        </div>

        {/* KPI 4: 디지털 온라인/모바일 회원 */}
        <div className="bg-white p-6 rounded-[28px] border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <Smartphone size={16} className="text-indigo-600 shrink-0" /> 온라인·모바일 통합 회원
              </span>
              <span className="text-[11px] font-bold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-200">
                활성률 {onlineSummary?.recentActiveRate ?? 0}%
              </span>
            </div>
            <div className="text-3xl font-black text-slate-900 my-1 font-financial">
              {loading ? (
                <div className="animate-pulse h-9 w-28 bg-slate-200 rounded-lg inline-block" />
              ) : (
                <>
                  {formatNum(onlineSummary?.totalCumulativeMembers || 0)}
                  <span className="text-sm font-semibold text-slate-500 ml-1">명</span>
                </>
              )}
            </div>
            <div className="text-xs text-slate-600 mt-1 font-financial">
              최근 활성 회원: <strong className="text-indigo-700">{formatNum(onlineSummary?.recentActiveMembers || 0)}명</strong> · 다회 재구매: <strong className="text-slate-900">{formatNum(onlineSummary?.repeatBuyers || 0)}명</strong>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 bg-slate-50/70 -mx-6 -mb-6 p-4 rounded-b-[28px] text-[11px] text-slate-600 space-y-1 font-financial">
            <div className="flex justify-between">
              <span className="text-slate-500">다부문 교차 이용 VIP</span>
              <strong className="text-indigo-700">
                {formatNum(onlineChannelBreakdown?.multiChannel || 0)}명 ({onlineChannelBreakdown?.multiChannelRatio ?? 0}%)
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">진성 다회 방문자 (True Repeat)</span>
              <strong className="text-slate-800">
                {formatNum(onlineSummary?.trueRepeatBuyers || 0)}명 ({onlineSummary?.trueRepeatRate ?? 0}%)
              </strong>
            </div>
          </div>
        </div>

      </div>

      {/* SECTION 1: 콘도(객실) 회원권 & 요금타입별 정밀 실적 분석 */}
      <div className="bg-white rounded-[32px] p-6 lg:p-8 shadow-xs border border-slate-200/80 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                CONDO MEMBERSHIP & RATE TYPE SSOT
              </span>
              <span className="text-xs text-slate-400 font-mono">
                API: /api/v6/report/room-rate-sales
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1.5 flex items-center gap-2">
              <Hotel className="w-5 h-5 text-emerald-600" />
              콘도 회원권(기명·무기명·휴양소·임직원) 및 요금타입별 객실 실적
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              산하 PMS 요금타입(Rate Type) 원장 기준 회원권 객실과 일반/비회원 객실의 조회기간·당월(MTD)·연간(YTD) 판매 객실수, 순매출, 객단가(ADR) 및 전년 동기(LY) 실적을 대조합니다.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start lg:self-center">
            <button
              onClick={() => setRatePeriodMode('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                ratePeriodMode === 'today' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              조회기간 실적
            </button>
            <button
              onClick={() => setRatePeriodMode('mtd')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                ratePeriodMode === 'mtd' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              당월 누적 (MTD)
            </button>
            <button
              onClick={() => setRatePeriodMode('ytd')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                ratePeriodMode === 'ytd' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              연간 누적 (YTD)
            </button>
          </div>
        </div>

        {/* 콘도 회원권 vs 비회원 비교 차트 */}
        {!loading && segmentRateRows.length > 0 && (
          <div className="bg-slate-50/60 rounded-2xl p-4 border border-slate-100">
            <div className="flex items-center justify-between mb-2 px-2">
              <span className="text-xs font-bold text-slate-700">
                요금타입(회원권 vs 비회원) 객실 판매량 및 평균 객단가(ADR) 비교 ({ratePeriodMode === 'today' ? '조회기간' : ratePeriodMode === 'mtd' ? '당월 MTD' : '연간 YTD'})
              </span>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#00ae95] inline-block" /> 회원권/협약 그룹
                </span>
                <span className="flex items-center gap-1 text-slate-500 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-xs bg-slate-400 inline-block" /> 일반/비회원 그룹
                </span>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ReactECharts option={getCondoRateChartOption()} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        )}

        {/* 콘도 회원권 & 요금타입 전체 정산 테이블 */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm font-financial min-w-[1050px]">
            <thead>
              <tr className="border-b-2 border-slate-800 text-xs font-bold text-slate-700 bg-slate-50">
                <th className="py-3.5 px-5">구분 (회원권 / 요금타입)</th>
                <th className="py-3.5 px-3 text-center">분류</th>
                <th className="py-3.5 px-4 text-right bg-emerald-50/40">조회기간 객실</th>
                <th className="py-3.5 px-4 text-right bg-emerald-50/40">조회기간 순매출</th>
                <th className="py-3.5 px-4 text-right bg-emerald-50/40">조회기간 ADR</th>
                <th className="py-3.5 px-4 text-right">전년동기(LY) 객실</th>
                <th className="py-3.5 px-4 text-right">전년동기(LY) 매출</th>
                <th className="py-3.5 px-4 text-right bg-slate-100/60">당월(MTD) 객실</th>
                <th className="py-3.5 px-4 text-right bg-slate-100/60">당월(MTD) 매출</th>
                <th className="py-3.5 px-4 text-right bg-indigo-50/30">연간(YTD) 객실</th>
                <th className="py-3.5 px-4 text-right bg-indigo-50/30">연간(YTD) 매출</th>
                <th className="py-3.5 px-5 text-right bg-indigo-50/30">연간(YTD) ADR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {segmentRateRows.map((row, idx) => {
                const rName = String(row.rateName || row.segmentName || '-');
                const isMember = isMemberRateCategory(rName);
                const lyMatch = lyRateRows.find(
                  ly => String(ly.rateName || ly.segmentName || '') === rName
                );

                return (
                  <tr
                    key={idx}
                    className={`transition-colors ${
                      isMember ? 'bg-emerald-50/15 hover:bg-emerald-50/40' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3.5 px-5 font-extrabold text-slate-900 whitespace-nowrap">
                      {rName}
                    </td>
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      {isMember ? (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          회원·협약
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          일반·비회원
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 bg-emerald-50/20 whitespace-nowrap">
                      {formatNum(row.todayRooms || 0)}실
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-emerald-800 bg-emerald-50/20 whitespace-nowrap">
                      {formatNum(row.todayRevenue || 0)}원
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-700 bg-emerald-50/20 whitespace-nowrap">
                      {Number(row.todayAdr || 0) > 0 ? `${formatNum(row.todayAdr)}원` : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-500 whitespace-nowrap">
                      {lyMatch ? `${formatNum(lyMatch.todayRooms || 0)}실` : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-500 whitespace-nowrap">
                      {lyMatch ? `${formatNum(lyMatch.todayRevenue || 0)}원` : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-800 bg-slate-50/60 whitespace-nowrap">
                      {formatNum(row.mtdRooms || 0)}실
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 bg-slate-50/60 whitespace-nowrap">
                      {formatNum(row.mtdRevenue || 0)}원
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-indigo-900 bg-indigo-50/15 whitespace-nowrap">
                      {formatNum(row.ytdRooms || 0)}실
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-indigo-700 bg-indigo-50/15 whitespace-nowrap">
                      {formatNum(row.ytdRevenue || 0)}원
                    </td>
                    <td className="py-3.5 px-5 text-right font-semibold text-slate-700 bg-indigo-50/15 whitespace-nowrap">
                      {Number(row.ytdAdr || 0) > 0 ? `${formatNum(row.ytdAdr)}원` : '-'}
                    </td>
                  </tr>
                );
              })}

              {/* 백엔드 공식 총합계 Row (isGrandTotal) */}
              {grandTotalRoomRow && (
                <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-900">
                  <td className="py-4 px-5 whitespace-nowrap">전체 객실 총합계 (SSOT)</td>
                  <td className="py-4 px-3 text-center whitespace-nowrap">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/15 text-emerald-300">
                      0-Variance
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right text-emerald-300 whitespace-nowrap">
                    {formatNum(grandTotalRoomRow.todayRooms || 0)}실
                  </td>
                  <td className="py-4 px-4 text-right text-emerald-300 whitespace-nowrap">
                    {formatNum(grandTotalRoomRow.todayRevenue || 0)}원
                  </td>
                  <td className="py-4 px-4 text-right text-white whitespace-nowrap">
                    {formatNum(grandTotalRoomRow.todayAdr || 0)}원
                  </td>
                  <td className="py-4 px-4 text-right text-slate-300 whitespace-nowrap">
                    {(() => {
                      const lyGrand = lyRateRows.find(r => r.isGrandTotal || r.rateName === '총합계');
                      return lyGrand ? `${formatNum(lyGrand.todayRooms || 0)}실` : '-';
                    })()}
                  </td>
                  <td className="py-4 px-4 text-right text-slate-300 whitespace-nowrap">
                    {(() => {
                      const lyGrand = lyRateRows.find(r => r.isGrandTotal || r.rateName === '총합계');
                      return lyGrand ? `${formatNum(lyGrand.todayRevenue || 0)}원` : '-';
                    })()}
                  </td>
                  <td className="py-4 px-4 text-right text-white whitespace-nowrap">
                    {formatNum(grandTotalRoomRow.mtdRooms || 0)}실
                  </td>
                  <td className="py-4 px-4 text-right text-white whitespace-nowrap">
                    {formatNum(grandTotalRoomRow.mtdRevenue || 0)}원
                  </td>
                  <td className="py-4 px-4 text-right text-amber-300 whitespace-nowrap">
                    {formatNum(grandTotalRoomRow.ytdRooms || 0)}실
                  </td>
                  <td className="py-4 px-4 text-right text-amber-300 whitespace-nowrap">
                    {formatNum(grandTotalRoomRow.ytdRevenue || 0)}원
                  </td>
                  <td className="py-4 px-5 text-right text-white whitespace-nowrap">
                    {formatNum(grandTotalRoomRow.ytdAdr || 0)}원
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: 골프장 분양회원 유형별 실적 & 회원 동반(Anchor) 시너지 분석 */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Left (7 cols): 골프 분양회원 세부 유형별 내장 및 단가 분석 */}
        <div className="xl:col-span-7 bg-white rounded-[32px] p-6 lg:p-8 shadow-xs border border-slate-200/80 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                GOLF MEMBERSHIP BREAKDOWN
              </span>
              <span className="text-xs text-slate-400 font-mono">
                API: /api/v6/report/golf-channel-intelligence
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1.5 flex items-center gap-2">
              <Flag className="w-5 h-5 text-blue-600" />
              골프장 분양회원(법인 풀구좌 · 콘도 구좌) vs 비회원 실적 분석
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              골프 내장객 중 법인 풀구좌 분양회원, 콘도 구좌 분양회원(본인/지정), 일반 대중(비회원)의 팀수·인원수·그린피 매출 및 평균 단가를 비교합니다.
            </p>
          </div>

          {/* 회원 vs 비회원 그린피 단가 비교 요약 배너 */}
          {golfMembershipAnalysis && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/70 font-financial">
              <div className="bg-white p-4 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                  <span>골프 회원 평균 그린피</span>
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    인원 비중 {golfMembershipAnalysis.member?.playerRatio ?? 0}%
                  </span>
                </div>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {golfMembershipAnalysis.member?.avgGreenFeeFormatted || '0'}원
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  내장 {golfMembershipAnalysis.member?.playersFormatted || '0'}명 · 매출 {golfMembershipAnalysis.member?.greenFeeRevenueFormatted || '0'}원
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                  <span>비회원(Public) 평균 그린피</span>
                  <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                    인원 비중 {golfMembershipAnalysis.nonMember?.playerRatio ?? 0}%
                  </span>
                </div>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {golfMembershipAnalysis.nonMember?.avgGreenFeeFormatted || '0'}원
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  내장 {golfMembershipAnalysis.nonMember?.playersFormatted || '0'}명 · 매출 {golfMembershipAnalysis.nonMember?.greenFeeRevenueFormatted || '0'}원
                </div>
              </div>

              <div className="bg-blue-950 text-white p-4 rounded-xl flex flex-col justify-between">
                <div className="text-xs font-bold text-blue-200">회원 1인당 그린피 우대 혜택</div>
                <div className="text-2xl font-black text-amber-300 mt-1">
                  -{golfMembershipAnalysis.greenFeeGapFormatted || '0'}원
                </div>
                <div className="text-[11px] text-blue-200/80 mt-1">
                  비회원가 대비 회원 평균 할인폭
                </div>
              </div>
            </div>
          )}

          {/* 분양회원 세부 유형 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm font-financial">
              <thead>
                <tr className="border-b-2 border-slate-800 text-xs font-bold text-slate-700 bg-slate-50">
                  <th className="py-3 px-4">회원권 구분</th>
                  <th className="py-3 px-3 text-right">라운딩 팀수</th>
                  <th className="py-3 px-3 text-right">내장 인원</th>
                  <th className="py-3 px-3 text-right">인원 점유율</th>
                  <th className="py-3 px-4 text-right">그린피 순매출</th>
                  <th className="py-3 px-4 text-right">1인 평균 그린피</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {golfMemberBreakdown.map((item, idx) => {
                  const isBunyang = item.type !== 'PUBLIC';
                  return (
                    <tr
                      key={idx}
                      className={isBunyang ? 'bg-blue-50/20 hover:bg-blue-50/40' : 'hover:bg-slate-50'}
                    >
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{item.name}</span>
                          {isBunyang && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                              분양회원
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-slate-800">
                        {formatNum(item.teams || 0)}팀 ({item.teamRatio ?? 0}%)
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-slate-900">
                        {formatNum(item.players || 0)}명
                      </td>
                      <td className="py-3.5 px-3 text-right font-semibold text-blue-700">
                        {item.playerRatio ?? 0}%
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                        {formatNum(item.revenue || 0)}원
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-700">
                        {formatNum(item.avgGreenFee || 0)}원
                      </td>
                    </tr>
                  );
                })}

                {golfMemberSummary && (
                  <tr className="bg-slate-900 text-white font-bold">
                    <td className="py-3.5 px-4">분양회원 소계 (법인 + 콘도 구좌)</td>
                    <td className="py-3.5 px-3 text-right text-amber-300">
                      {formatNum(golfMemberSummary.totalBunyangTeams || 0)}팀 ({golfMemberSummary.totalBunyangRatio ?? 0}%)
                    </td>
                    <td className="py-3.5 px-3 text-right text-amber-300">
                      {formatNum(golfMemberSummary.totalBunyangPlayers || 0)}명
                    </td>
                    <td className="py-3.5 px-3 text-right text-amber-300">
                      {golfMemberSummary.totalBunyangPlayerRatio ?? 0}%
                    </td>
                    <td className="py-3.5 px-4 text-right text-emerald-300">
                      {formatNum(golfMemberSummary.totalBunyangRevenue || 0)}원
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-300">
                      분양회원 전용 집계
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right (5 cols): 골프 회원 동반 비회원 앵커 효과 (Member Anchor Synergy) */}
        <div className="xl:col-span-5 bg-white rounded-[32px] p-6 lg:p-8 shadow-xs border border-slate-200/80 flex flex-col justify-between space-y-6">
          <div>
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  MEMBER ANCHOR SYNERGY
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-1.5 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                회원 동반 비회원 유치(Anchor) 매출 기여도
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                분양회원이 라운딩 시 동반 유치한 비회원(정상가 결제)이 창출한 순수 추가 그린피 매출입니다.
              </p>
            </div>

            {/* 총 앵커 매출 하이라이트 */}
            <div className="mt-5 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-5 rounded-2xl shadow-md font-financial">
              <div className="text-xs font-semibold text-emerald-300">
                회원이 동반 유치한 비회원 그린피 창출액 (Anchor Revenue)
              </div>
              <div className="text-3xl font-black text-amber-300 mt-1">
                +{formatNum(golfMemberSynergy?.totalAnchorRevenue || 0)}원
              </div>
              <p className="text-[11px] text-slate-300 mt-1.5">
                회원 1~2인이 포함된 팀에서 동반 비회원(2~3인)이 지불한 순수 그린피 합계 (SSOT)
              </p>
            </div>

            {/* 팀 구성별 앵커 내역 */}
            {golfMemberSynergy && (
              <div className="mt-5 space-y-3 font-financial">
                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/70 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-extrabold text-slate-900">
                      회원 1명 + 비회원 3명 동반 팀
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      총 <strong>{formatNum(golfMemberSynergy.member1Non3?.teams || 0)}팀</strong> (전체 팀의 {golfMemberSynergy.member1Non3?.ratio ?? 0}%)
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-emerald-700 font-bold">동반 비회원 3인 창출 매출</div>
                    <div className="text-base font-black text-emerald-900">
                      {formatNum(golfMemberSynergy.member1Non3?.nonMemberRevenue || 0)}원
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-200/70 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-extrabold text-slate-900">
                      회원 2명 + 비회원 2명 동반 팀
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      총 <strong>{formatNum(golfMemberSynergy.member2Non2?.teams || 0)}팀</strong> (전체 팀의 {golfMemberSynergy.member2Non2?.ratio ?? 0}%)
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-teal-700 font-bold">동반 비회원 2인 창출 매출</div>
                    <div className="text-base font-black text-teal-900">
                      {formatNum(golfMemberSynergy.member2Non2?.nonMemberRevenue || 0)}원
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-800">
                      회원 3~4명 중심 팀
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      총 <strong>{formatNum(golfMemberSynergy.member3to4?.teams || 0)}팀</strong> (전체 팀의 {golfMemberSynergy.member3to4?.ratio ?? 0}%)
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-slate-500 font-semibold">팀 그린피 매출</div>
                    <div className="text-base font-bold text-slate-800">
                      {formatNum(golfMemberSynergy.member3to4?.revenue || 0)}원
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-800">
                      순수 비회원 4인 팀 (Public)
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      총 <strong>{formatNum(golfMemberSynergy.pureNonMember?.teams || 0)}팀</strong> (전체 팀의 {golfMemberSynergy.pureNonMember?.ratio ?? 0}%)
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-slate-500 font-semibold">팀 그린피 매출</div>
                    <div className="text-base font-bold text-slate-800">
                      {formatNum(golfMemberSynergy.pureNonMember?.revenue || 0)}원
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* SECTION 3: 법인 휴양소 협약 회원사 & 다회 재방문 단골 단체 실적 */}
      <div className="bg-white rounded-[32px] p-6 lg:p-8 shadow-xs border border-slate-200/80 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                CORPORATE RETREAT & REPEAT MEMBER GROUPS
              </span>
              <span className="text-xs text-slate-400 font-mono">
                API: /api/v6/report/corporate-group-sales
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1.5 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-purple-600" />
              기업 휴양소(협약 회원사) 및 다회 재방문(Loyalty) 법인·단체 이용 원장
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              기업 하계/연중 휴양소 계약 회원사(`CORP_FIT`) 및 올해 2회 이상 재방문한 우수 법인·단체의 객실·식음·골프·레저 통합 소비 실적입니다.
            </p>
          </div>

          {corpFitSummary && (
            <div className="flex flex-wrap items-center gap-3 font-financial">
              <div className="bg-purple-50 border border-purple-200 px-4 py-2 rounded-2xl text-xs">
                <span className="text-purple-700 font-semibold block">기업 휴양소 이용</span>
                <strong className="text-slate-900 text-sm">
                  {formatNum(corpFitSummary.groupsCount || 0)}개사 · {formatNum(corpFitSummary.roomsCount || 0)}실 ({formatNum(corpFitSummary.totalPax || 0)}명)
                </strong>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-2xl text-xs">
                <span className="text-emerald-700 font-semibold block">기업 휴양소 매출</span>
                <strong className="text-emerald-900 text-sm">
                  {corpFitSummary.totalRevenueFormatted || formatNum(corpFitSummary.totalRevenue || 0)}원
                </strong>
              </div>
              <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-2xl text-xs">
                <span className="text-amber-800 font-semibold block">재방문 단골 단체</span>
                <strong className="text-amber-900 text-sm">
                  {formatNum(corpSummary?.repeatGroupsCount || 0)}곳 (재방문율 {corpSummary?.repeatGroupRate ?? 0}%)
                </strong>
              </div>
            </div>
          )}
        </div>

        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full border-collapse text-left text-sm font-financial min-w-[950px]">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr className="border-b-2 border-slate-800 text-xs font-bold text-slate-700">
                <th className="py-3 px-4">입실일 ~ 퇴실일</th>
                <th className="py-3 px-4">법인 / 휴양소 협약 회원사명</th>
                <th className="py-3 px-3 text-center">회원사 분류</th>
                <th className="py-3 px-3 text-center">결제/정산 방식</th>
                <th className="py-3 px-3 text-right">객실수 (평형)</th>
                <th className="py-3 px-3 text-right">투숙 인원</th>
                <th className="py-3 px-4 text-right">객실 매출</th>
                <th className="py-3 px-4 text-right">1인당 단가</th>
                <th className="py-3 px-4 text-right">통합 발생 매출</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {memberCorpGroups.length > 0 ? (
                memberCorpGroups.slice(0, 30).map((g, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {g.checkInDate || '-'}
                      {g.stayDays ? (
                        <span className="text-[11px] text-slate-400 ml-1">({g.stayDays}박)</span>
                      ) : null}
                    </td>
                    <td className="py-3 px-4 font-extrabold text-slate-900 whitespace-nowrap">
                      {g.groupName || g.corporateName || '-'}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                        {g.categoryName || g.b2bSegmentName || '기업 임직원 휴양소'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {g.paymentMethod || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                      {formatNum(g.spendingBreakdown?.roomsCount || 0)}실
                      {g.spendingBreakdown?.roomTypesUsed?.length > 0 && (
                        <span className="text-[11px] text-slate-400 ml-1">
                          ({g.spendingBreakdown.roomTypesUsed.join(', ')})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700 whitespace-nowrap">
                      {g.paxCountFormatted || formatNum(g.paxCount || 0)}명
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-800 whitespace-nowrap">
                      {formatNum(g.spendingBreakdown?.roomRevenue || 0)}원
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600 whitespace-nowrap">
                      {formatNum(g.avgSpendPerPax || 0)}원
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-emerald-800 whitespace-nowrap">
                      {g.totalRevenueFormatted || formatNum(g.totalRevenue || 0)}원
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    선택하신 조회기간에 해당하는 기업 휴양소 협약 회원사 데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: 디지털 온라인/모바일 회원 부문별 교차 이용 & 최근 활동 회원 원장 */}
      <div className="bg-white rounded-[32px] p-6 lg:p-8 shadow-xs border border-slate-200/80 space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              DIGITAL ONLINE MEMBERSHIP & CRM LEDGER
            </span>
            <span className="text-xs text-slate-400 font-mono">
              API: /api/v6/report/online-members
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1.5 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-600" />
            온라인·모바일 통합 회원 부문별 이용 분포 및 최근 활동 회원 명단
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            홈페이지 및 모바일 앱 통합 회원({formatNum(onlineSummary?.totalCumulativeMembers || 0)}명)의 부문별(객실·골프·레저·교차이용) 분포와 최근 예약/이용 활동 내역입니다.
          </p>
        </div>

        {/* 부문별 온라인 회원 분포 4대 카드 */}
        {onlineChannelBreakdown && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-financial">
            <div className="p-4 rounded-2xl bg-indigo-950 text-white">
              <div className="flex items-center justify-between text-xs text-indigo-200 font-bold">
                <span>다부문 교차 이용 VIP 회원</span>
                <span className="bg-white/15 text-amber-300 px-2 py-0.5 rounded-full">
                  {onlineChannelBreakdown.multiChannelRatio ?? 0}%
                </span>
              </div>
              <div className="text-2xl font-black text-amber-300 mt-1.5">
                {formatNum(onlineChannelBreakdown.multiChannel || 0)}명
              </div>
              <div className="text-[11px] text-indigo-200/80 mt-1">
                객실·골프·레저 중 2개 부문 이상 복합 이용
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between text-xs text-slate-600 font-bold">
                <span>객실(콘도) 전용 이용 회원</span>
                <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                  {onlineChannelBreakdown.roomOnlyRatio ?? 0}%
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1.5">
                {formatNum(onlineChannelBreakdown.roomOnly || 0)}명
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                공식 홈페이지/앱 객실 예약 회원
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between text-xs text-slate-600 font-bold">
                <span>레저/티켓 전용 이용 회원</span>
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                  {onlineChannelBreakdown.ticketOnlyRatio ?? 0}%
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1.5">
                {formatNum(onlineChannelBreakdown.ticketOnly || 0)}명
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                루지·목장·썰매장 등 온라인 티켓 구매 회원
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between text-xs text-slate-600 font-bold">
                <span>골프 예약 전용 회원</span>
                <span className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full border border-teal-200">
                  {onlineChannelBreakdown.golfOnlyRatio ?? 0}%
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1.5">
                {formatNum(onlineChannelBreakdown.golfOnly || 0)}명
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                벨포레 골프 CC 온라인 부킹 회원
              </div>
            </div>
          </div>
        )}

        {/* 최근 활동 온라인 회원 테이블 */}
        <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
          <table className="w-full border-collapse text-left text-sm font-financial min-w-[850px]">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr className="border-b-2 border-slate-800 text-xs font-bold text-slate-700">
                <th className="py-3 px-4">고객번호</th>
                <th className="py-3 px-4">회원명</th>
                <th className="py-3 px-4">온라인 ID</th>
                <th className="py-3 px-4">연락처</th>
                <th className="py-3 px-3 text-center">주력 이용 부문</th>
                <th className="py-3 px-4">최초 이용일</th>
                <th className="py-3 px-4">최근 이용일</th>
                <th className="py-3 px-4 text-right">누적 예약/결제 건수</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentOnlineMembers.length > 0 ? (
                recentOnlineMembers.slice(0, 20).map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-xs text-slate-500">{m.custNo || '-'}</td>
                    <td className="py-3 px-4 font-extrabold text-slate-900">{m.custName || '-'}</td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-xs">{m.onlineId || '-'}</td>
                    <td className="py-3 px-4 text-slate-600">{m.phone || '-'}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {m.channelSource || m.firstChannel || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{m.firstActivityDate || '-'}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{m.lastActivityDate || '-'}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-indigo-700">
                      {formatNum(m.totalBookings || 0)}건
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    최근 활동 온라인 회원 내역이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 5: [Ticket 28 완제품] 콘도 분양회원 구좌별 연간 잔여박수 소진율 및 당일 방문 회원별 리조트 통합 LTV 원장 */}
      <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-sm border border-slate-200 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 size={12} /> V6 SSOT 마트 완제품
              </span>
              <span className="text-[11px] font-mono text-slate-400">API: /api/v6/report/member-quota-ltv</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1.5 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" />
              콘도 분양회원 구좌별 연간 잔여박수 소진율 및 당일 방문 회원별 리조트 통합 LTV 원장
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              기명·무기명·창립·법인 825개 분양구좌의 연간 부여 박수(Quota 41,190박) 실시간 소진율과, 조회기간 투숙/방문 회원의 객실·골프·식음·레저 통합 LTV 원장입니다.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2 text-xs font-bold text-emerald-900 bg-emerald-50 px-4 py-2.5 rounded-xl border border-emerald-200">
            <Layers size={15} className="text-emerald-600" />
            <span>0-Variance 오차 0원 검증</span>
          </div>
        </div>

        {quotaLtvData ? (
          <div className="space-y-6">
            {/* 1. 분양구좌 전체 개요 4대 KPI 요약 카드 */}
            {quotaLtvData.accountQuotaOverview && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-financial">
                <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-xs">
                  <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                    <span>전체 분양구좌 수</span>
                    <span className="bg-slate-800 text-amber-300 px-2 py-0.5 rounded-full text-[11px]">
                      활성율 {quotaLtvData.accountQuotaOverview.totalAccounts > 0 ? ((quotaLtvData.accountQuotaOverview.activeAccounts / quotaLtvData.accountQuotaOverview.totalAccounts) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="text-2xl font-black text-white mt-1.5 tabular-nums">
                    {formatNum(quotaLtvData.accountQuotaOverview.totalAccounts)}구좌
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    실 이용 구좌: {formatNum(quotaLtvData.accountQuotaOverview.activeAccounts)}구좌
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between text-xs text-slate-600 font-bold">
                    <span>연간 총 부여 박수 (Quota)</span>
                    <span className="bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-full text-[11px]">
                      연간 기준
                    </span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-1.5 tabular-nums">
                    {formatNum(quotaLtvData.accountQuotaOverview.quotaNights)}박
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    잔여 박수: {formatNum(quotaLtvData.accountQuotaOverview.remainingNights)}박
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
                  <div className="flex items-center justify-between text-xs text-emerald-900 font-bold">
                    <span>연간 누적 박수 소진율</span>
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[11px] font-bold">
                      {quotaLtvData.accountQuotaOverview.burnRatePct ?? 0}% 소진
                    </span>
                  </div>
                  <div className="text-2xl font-black text-emerald-700 mt-1.5 tabular-nums">
                    {formatNum(quotaLtvData.accountQuotaOverview.usedNights)}박 소진
                  </div>
                  <div className="text-[11px] text-emerald-800/80 mt-1">
                    전체 부여 41,190박 중 실 투숙 소진분
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80">
                  <div className="flex items-center justify-between text-xs text-amber-900 font-bold">
                    <span>분양회원 연간 누적 통합 LTV</span>
                    <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[11px] font-bold">
                      리조트 전체
                    </span>
                  </div>
                  <div className="text-2xl font-black text-amber-900 mt-1.5 tabular-nums">
                    {formatNum(quotaLtvData.accountQuotaOverview.ytdTotalSpend)}원
                  </div>
                  <div className="text-[11px] text-amber-800/80 mt-1 truncate">
                    골프 {formatNum(quotaLtvData.accountQuotaOverview.ytdGolfSpend)}원 · 객실 {formatNum(quotaLtvData.accountQuotaOverview.ytdRoomSpend)}원
                  </div>
                </div>
              </div>
            )}

            {/* 2. 분양 회원권 구분별 연간 부여박수 소진율 및 LTV 매트릭스 표 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-emerald-600" />
                  분양 회원권 구분별(기명·무기명·창립·법인) 연간 부여박수 소진율 및 LTV 매트릭스
                </h3>
                <span className="text-[11px] text-slate-500 font-medium">단위: 구좌, 박, 원</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm font-financial min-w-[960px]">
                  <thead>
                    <tr className="border-b-2 border-slate-800 text-xs font-bold text-slate-700 bg-slate-50">
                      <th className="py-3 px-4">회원권 구분</th>
                      <th className="py-3 px-3 text-right">총 구좌수</th>
                      <th className="py-3 px-3 text-right">실이용 구좌</th>
                      <th className="py-3 px-3 text-right">연간 부여박수</th>
                      <th className="py-3 px-3 text-right">실사용 박수</th>
                      <th className="py-3 px-3 text-right">잔여 박수</th>
                      <th className="py-3 px-3 text-right">소진율</th>
                      <th className="py-3 px-3 text-right">방문 횟수</th>
                      <th className="py-3 px-4 text-right">연간 누적 LTV</th>
                      <th className="py-3 px-4 text-right">구좌당 평균 LTV</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {quotaLtvData.accountQuotaSummary
                      .filter((row: any) => !row.isGrandTotal)
                      .map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {row.accountTypeKo || row.accountType}
                          </td>
                          <td className="py-3 px-3 text-right text-slate-800 font-semibold">
                            {formatNum(row.totalAccounts)}구좌
                          </td>
                          <td className="py-3 px-3 text-right text-slate-600">
                            {formatNum(row.activeAccounts)}구좌
                          </td>
                          <td className="py-3 px-3 text-right text-slate-600">
                            {formatNum(row.annualQuotaNights ?? row.quotaNights)}박
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-emerald-700">
                            {formatNum(row.ytdUsedNights ?? row.usedNights)}박
                          </td>
                          <td className="py-3 px-3 text-right text-slate-600">
                            {formatNum(row.remainingNights)}박
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-emerald-700">
                            {row.burnRatePct ?? row.exhaustionRate ?? 0}%
                          </td>
                          <td className="py-3 px-3 text-right text-slate-600">
                            {formatNum(row.ytdVisitCount)}회
                          </td>
                          <td className="py-3 px-4 text-right font-black text-slate-900">
                            {formatNum(row.ytdTotalSpend)}원
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-slate-700">
                            {formatNum(row.avgLtvPerAccount)}원
                          </td>
                        </tr>
                      ))}
                  </tbody>
                  {/* 총합계 푸터 */}
                  <tfoot>
                    {quotaLtvData.accountQuotaSummary
                      .filter((row: any) => row.isGrandTotal)
                      .map((row: any, idx: number) => (
                        <tr key={idx} className="bg-slate-900 text-white font-bold text-sm border-t-2 border-slate-950">
                          <td className="py-3.5 px-4">총합계</td>
                          <td className="py-3.5 px-3 text-right text-amber-300 font-black">
                            {formatNum(row.totalAccounts)}구좌
                          </td>
                          <td className="py-3.5 px-3 text-right text-slate-200">
                            {formatNum(row.activeAccounts)}구좌
                          </td>
                          <td className="py-3.5 px-3 text-right text-slate-200">
                            {formatNum(row.annualQuotaNights ?? row.quotaNights)}박
                          </td>
                          <td className="py-3.5 px-3 text-right text-emerald-300 font-black">
                            {formatNum(row.ytdUsedNights ?? row.usedNights)}박
                          </td>
                          <td className="py-3.5 px-3 text-right text-slate-200">
                            {formatNum(row.remainingNights)}박
                          </td>
                          <td className="py-3.5 px-3 text-right text-emerald-300 font-black">
                            {row.burnRatePct ?? row.exhaustionRate ?? 0}%
                          </td>
                          <td className="py-3.5 px-3 text-right text-slate-200">
                            {formatNum(row.ytdVisitCount)}회
                          </td>
                          <td className="py-3.5 px-4 text-right text-amber-300 font-black">
                            {formatNum(row.ytdTotalSpend)}원
                          </td>
                          <td className="py-3.5 px-4 text-right text-slate-200">
                            {formatNum(row.avgLtvPerAccount)}원
                          </td>
                        </tr>
                      ))}
                  </tfoot>
                </table>
              </div>
            </div>

            {/* 3. 당일/기간 방문 분양회원 개인별 통합 LTV 원장 (검색 및 필터 지원) */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-indigo-600" />
                    당일/기간 투숙 분양회원 개인별 리조트 통합 LTV 원장
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                      실시간 {quotaLtvData.visitedMembersLedger?.length || 0}건
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    조회 기간 동안 체크인/이용한 분양회원의 구좌 번호, 평형, 소진율 및 크로스 소비(골프·객실·F&B·레저) 내역입니다.
                  </p>
                </div>

                {/* 검색창 & 필터 버튼 */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="회원명, 구좌번호 검색..."
                      value={memberLedgerSearch}
                      onChange={(e) => setMemberLedgerSearch(e.target.value)}
                      className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-brand-mint w-44"
                    />
                  </div>
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
                    {['ALL', '법인', '기명', '무기명', '창립'].map((f) => (
                      <button
                        key={f}
                        onClick={() => setMemberLedgerFilter(f)}
                        className={`px-2.5 py-1 rounded-lg transition-colors ${
                          memberLedgerFilter === f
                            ? 'bg-white text-indigo-700 font-bold shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {f === 'ALL' ? '전체' : f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 회원 원장 테이블 */}
              <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
                <table className="w-full border-collapse text-left text-sm font-financial min-w-[980px]">
                  <thead className="sticky top-0 z-10 bg-slate-50 shadow-2xs">
                    <tr className="border-b-2 border-slate-800 text-xs font-bold text-slate-700">
                      <th className="py-3 px-4">구좌번호</th>
                      <th className="py-3 px-4">회원명</th>
                      <th className="py-3 px-3 text-center">회원 구분</th>
                      <th className="py-3 px-3 text-center">구좌 형태</th>
                      <th className="py-3 px-3 text-center">객실 평형</th>
                      <th className="py-3 px-3 text-right">부여/소진/잔여</th>
                      <th className="py-3 px-3 text-right">소진율</th>
                      <th className="py-3 px-4 text-right">기간 이용액</th>
                      <th className="py-3 px-4 text-right">연간 누적 통합 LTV</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {quotaLtvData.visitedMembersLedger
                      ?.filter((m: any) => {
                        const q = memberLedgerSearch.trim().toLowerCase();
                        const matchesSearch = !q ||
                          String(m.memberName || '').toLowerCase().includes(q) ||
                          String(m.membershipNo || '').toLowerCase().includes(q) ||
                          String(m.certNo || '').toLowerCase().includes(q);
                        const matchesFilter = memberLedgerFilter === 'ALL' ||
                          String(m.accountType || '').includes(memberLedgerFilter);
                        return matchesSearch && matchesFilter;
                      })
                      .map((m: any, idx: number) => {
                        const golfSpend = m.ytdGolfSpend || m.golfSpend || 0;
                        const roomSpend = m.ytdRoomSpend || m.roomSpend || 0;
                        return (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4 font-mono text-xs font-bold text-slate-700">
                              {m.membershipNo || m.certNo || '-'}
                            </td>
                            <td className="py-3 px-4 font-black text-slate-900">
                              {m.memberName || '-'}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                                String(m.accountType || '').includes('법인')
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : String(m.accountType || '').includes('무기명')
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                                {m.accountTypeKo || m.accountType || '-'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center text-xs text-slate-600">
                              {m.shareType || '-'}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800">
                                {m.roomType || '-'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right text-xs tabular-nums text-slate-600">
                              <span>{formatNum(m.annualQuotaNights ?? m.quotaNights)}박 / </span>
                              <span className="font-bold text-emerald-700">{formatNum(m.ytdUsedNights ?? m.usedNights)}박 / </span>
                              <span className="text-slate-400">{formatNum(m.remainingNights)}박</span>
                            </td>
                            <td className="py-3 px-3 text-right font-black text-emerald-700 text-xs">
                              {m.burnRatePct ?? m.exhaustionRate ?? 0}%
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">
                              {formatNum(m.periodTotalSpend || 0)}원
                            </td>
                            <td className="py-3 px-4 text-right tabular-nums">
                              <div className="font-black text-indigo-700 text-sm">
                                {formatNum(m.ytdTotalSpend || m.totalLtv || 0)}원
                              </div>
                              <div className="text-[10px] text-slate-500 font-medium">
                                골프 {formatNum(golfSpend)}원 · 객실 {formatNum(roomSpend)}원
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    {(!quotaLtvData.visitedMembersLedger || quotaLtvData.visitedMembersLedger.length === 0) && (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400">
                          해당 기간 방문/투숙한 분양회원 원장 데이터가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 text-xs">
            분양회원 구좌별 소진율 및 통합 LTV 데이터를 불러오는 중입니다...
          </div>
        )}
      </div>

      {/* [Ticket 35] 디지털 온라인 회원 이용횟수 등급별 분포 및 6개월 미방문 휴면 단골(Win-back) 리텐션 분석 */}
      <div className="bg-white rounded-[32px] border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-violet-50/50 via-white to-cyan-50/30">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-violet-600 text-white shadow-xs shrink-0 mt-0.5">
              <Smartphone size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-extrabold text-slate-900">
                  온라인 통합 회원 이용횟수 등급별 분포 및 6개월 미방문 휴면 단골(Win-back) 리텐션
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-violet-100 text-violet-800 border border-violet-200">
                  V6 SSOT · Ticket 35
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                디지털 온라인 회원(<code className="px-1 py-0.5 bg-slate-100 rounded text-slate-700 font-mono">dim_online_members_v6</code>)의 누적 방문 횟수 등급(1회 단발 · 2~3회 재방문 · 4~9회 단골 · 10회+ 충성고객)과 최근 6개월 이상 미방문 휴면 단골(Win-back 핀셋 타겟)을 추적합니다.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onlineDormancyIntel ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 size={14} />
                정규 마트 연동 완료
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                Fail-Stop · 백엔드 API 배포 대기 (/api/v6/report/online-member-dormancy)
              </span>
            )}
          </div>
        </div>

        {!onlineDormancyIntel ? (
          <div className="p-8 bg-slate-50/60">
            <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-dashed border-slate-300 p-6 text-center space-y-3">
              <h4 className="text-sm font-extrabold text-slate-800">
                [Zero-Fake / Fail-Stop] 온라인 단골 휴면(Churn Risk) 및 Win-back 타겟 정규 마트 API 연동 대기 중
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                백엔드 <code className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-mono">GET /api/v6/report/online-member-dormancy</code> 배포 전까지 클라이언트 임의 추론이나 가짜 숫자를 생성하지 않고 <strong>Fail-Stop(결함 노출)</strong> 상태를 유지합니다.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 text-left">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[11px] font-bold text-slate-400">단골 회원 (4~9회 방문)</div>
                  <div className="text-base font-black text-slate-400 mt-1">-</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">6개월 미방문 휴면 비율 집계 대기</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[11px] font-bold text-slate-400">충성 고객 (10회+ 방문)</div>
                  <div className="text-base font-black text-slate-400 mt-1">-</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">최상위 VIP 이탈 감지 대기</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[11px] font-bold text-slate-400">핀셋 Win-back 타겟 모수</div>
                  <div className="text-base font-black text-slate-400 mt-1">-</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">4회+ 방문 후 6개월 미방문 단골</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[11px] font-bold text-slate-400">최근 6개월 활성 유지율</div>
                  <div className="text-base font-black text-slate-400 mt-1">-</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">등급별 리텐션 코호트 집계 대기</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="text-xs font-bold text-slate-500">전체 온라인 통합 회원</div>
                <div className="text-xl font-black text-slate-900 mt-1">
                  {onlineDormancyIntel.summary?.totalMembers != null ? `${formatNum(onlineDormancyIntel.summary.totalMembers)}명` : '-'}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  최근 6개월 활성: {onlineDormancyIntel.summary?.activeWithin6m != null ? `${formatNum(onlineDormancyIntel.summary.activeWithin6m)}명` : '-'}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="text-xs font-bold text-slate-500">단골 회원 (4~9회 방문) 휴면율</div>
                <div className="text-xl font-black text-rose-600 mt-1">
                  {onlineDormancyIntel.summary?.regularDormantRatePct != null ? `${onlineDormancyIntel.summary.regularDormantRatePct}%` : '-'}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  휴면 단골: {onlineDormancyIntel.summary?.regularDormantCount != null ? `${formatNum(onlineDormancyIntel.summary.regularDormantCount)}명` : '-'}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="text-xs font-bold text-slate-500">충성 고객 (10회+ 방문) 휴면율</div>
                <div className="text-xl font-black text-amber-600 mt-1">
                  {onlineDormancyIntel.summary?.loyalDormantRatePct != null ? `${onlineDormancyIntel.summary.loyalDormantRatePct}%` : '-'}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  휴면 충성고객: {onlineDormancyIntel.summary?.loyalDormantCount != null ? `${formatNum(onlineDormancyIntel.summary.loyalDormantCount)}명` : '-'}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-violet-50/70 border border-violet-200">
                <div className="text-xs font-bold text-violet-700">핵심 단골 Win-back 핀셋 타겟</div>
                <div className="text-xl font-black text-violet-900 mt-1">
                  {onlineDormancyIntel.summary?.winbackTargetCount != null ? `${formatNum(onlineDormancyIntel.summary.winbackTargetCount)}명` : '-'}
                </div>
                <div className="text-[11px] text-violet-600 mt-1">
                  4회 이상 방문 이력 보유 · 6개월 미방문
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
