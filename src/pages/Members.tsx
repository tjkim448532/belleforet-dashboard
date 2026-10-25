import { useState, useEffect } from 'react';
import { useDate } from '../contexts/DateContext';
import { secureFetcher } from '../lib/secureFetcher';
import ReactECharts from 'echarts-for-react';
import GlobalDatePicker from '../components/GlobalDatePicker';
import { 
  Calendar, RefreshCw, Hotel, 
  Award, Flag, Smartphone, Briefcase, Layers, Sparkles, UserCheck,
  Search, Building2, Coins, CheckCircle2, Info, Clock, ArrowUpDown, Filter
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

const formatNum = (val: any): string => {
  if (val === null || val === undefined || val === '') return '0';
  const num = typeof val === 'string' ? Number(val.replace(/,/g, '')) : Number(val);
  return isNaN(num) ? '0' : new Intl.NumberFormat('ko-KR').format(Math.round(num));
};

export default function Members() {
  const { startDate, endDate, isRange } = useDate();
  const isEffectiveRange = Boolean(isRange && endDate && startDate !== endDate);
  const effectiveEnd = isEffectiveRange && endDate ? endDate : startDate;

  const [loading, setLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // 1. 콘도/객실 회원권 및 요금타입별 실적 (room-rate-sales)
  const [rateRows, setRateRows] = useState<any[]>([]);
  const [ratePeriodMode, setRatePeriodMode] = useState<'today' | 'mtd' | 'ytd'>('today');
  const [showLyColumns, setShowLyColumns] = useState<boolean>(false);

  // 2. 골프 분양회원 및 회원 동반 시너지 (golf-channel-intelligence & teetime-analysis-v2)
  const [golfIntel, setGolfIntel] = useState<any>(null);
  const [golfMembershipAnalysis, setGolfMembershipAnalysis] = useState<any>(null);

  // 3. 법인 휴양소 및 재방문 단체 회원사 (corporate-group-sales)
  const [corpData, setCorpData] = useState<any>(null);
  const [corpFilter, setCorpFilter] = useState<'ALL' | 'COMPLETED' | 'PENDING'>('ALL');
  const [corpSort, setCorpSort] = useState<'rooms' | 'revenue' | 'date'>('rooms');

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

      const [rateRes, golfIntelRes, golfV2Res, corpRes, onlineRes, quotaLtvRes, dormancyRes] = await Promise.all([
        secureFetcher(`${API_BASE}/api/v6/report/room-rate-sales?${queryParams}`).catch(() => null),
        secureFetcher(`${API_BASE}/api/v6/report/golf-channel-intelligence?${queryParams}`).catch(() => null),
        secureFetcher(`${API_BASE}/api/v6/report/golf-channel-teetime-analysis-v2?${queryParams}`).catch(() => null),
        secureFetcher(`${API_BASE}/api/v6/report/corporate-group-sales?${queryParams}`).catch(() => null),
        secureFetcher(`${API_BASE}/api/v6/report/online-members?${queryParams}`).catch(() => null),
        secureFetcher(`${API_BASE}/api/v6/report/member-quota-ltv?${queryParams}`).catch(() => null),
        secureFetcher(`${API_BASE}/api/v6/report/online-member-dormancy?${queryParams}`).catch(() => null)
      ]);

      const parsedRates = rateRes?.data ?? rateRes;
      setRateRows(Array.isArray(parsedRates) ? parsedRates : []);

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
  const memberRoomRow = rateRows.find(r => 
    (r.depth === 1 || !r.isSubRow) && (
      r.rateCode === 'REGISTERED_MEMBER' || 
      r.rateName === '기명/구좌회원' || 
      r.segmentName === '기명/구좌회원' ||
      String(r.rateName || '').includes('기명/구좌회원') ||
      String(r.segmentName || '').includes('기명/구좌회원')
    )
  ) || null;

  const bearerRoomRow = rateRows.find(r => 
    (r.depth === 1 || !r.isSubRow) && (
      r.rateCode === 'BEARER_MEMBER' || 
      r.rateName === '무기명회원' || 
      r.segmentName === '무기명회원' ||
      String(r.rateName || '').includes('무기명회원') ||
      String(r.segmentName || '').includes('무기명회원')
    )
  ) || null;

  const grandTotalRoomRow = rateRows.find(r => r.isGrandTotal || r.rateName === '총합계') || null;

  const segmentRateRows = rateRows.filter(r => !r.isGrandTotal && r.rateName !== '총합계');

  const hasLyData = segmentRateRows.some(
    r => (r.todayLyRooms != null && r.todayLyRooms !== 0) || 
         (r.todayLyRevenue != null && r.todayLyRevenue !== 0) ||
         (r.lyRoomsSold != null && r.lyRoomsSold !== 0) ||
         (r.lyTotalRevenue != null && r.lyTotalRevenue !== 0)
  );

  const isMemberRateCategory = (row: any): boolean => {
    if (row?.isMemberCategory != null) return Boolean(row.isMemberCategory);
    if (row?.isMember != null) return Boolean(row.isMember);
    const name = String(row?.rateName || row?.segmentName || '');
    return name.includes('기명') || name.includes('무기명') || name.includes('회원') || name.includes('Member');
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
  const baseMemberCorpGroups = corpGroups.filter(
    g => g.b2bSegment === 'CORP_FIT' || g.category === 'RESORT_CORP'
  );

  // 정산 상태별 카운트 (순수 필터링 길이 SSOT)
  const completedCorpCount = baseMemberCorpGroups.filter(g => g.settlementStatus === 'COMPLETED').length;
  const pendingCorpCount = baseMemberCorpGroups.filter(g => g.settlementStatus === 'PENDING_POST_BILLING').length;

  // 필터 적용
  const filteredMemberCorpGroups = baseMemberCorpGroups.filter(g => {
    if (corpFilter === 'COMPLETED') return g.settlementStatus === 'COMPLETED';
    if (corpFilter === 'PENDING') return g.settlementStatus === 'PENDING_POST_BILLING';
    return true;
  });

  // 정렬 적용 (객실수 순, 매출 높은 순, 최신 순)
  const memberCorpGroups = [...filteredMemberCorpGroups].sort((a, b) => {
    if (corpSort === 'revenue') {
      return (Number(b.totalRevenue) || 0) - (Number(a.totalRevenue) || 0);
    }
    if (corpSort === 'date') {
      return String(b.checkInDate || '').localeCompare(String(a.checkInDate || ''));
    }
    // 기본: 객실수 많은 순
    return (Number(b.roomsCount) || 0) - (Number(a.roomsCount) || 0);
  });

  // --- 4. 온라인 회원 데이터 추출 ---
  const onlineSummary = onlineData?.summary || null;
  const onlineChannelBreakdown = onlineData?.channelBreakdown || null;
  const recentOnlineMembers: any[] = Array.isArray(onlineData?.recentMembers)
    ? onlineData.recentMembers
    : [];

  // 콘도 요금타입별 비교 차트 옵션
  const getCondoRateChartOption = () => {
    const validRows = segmentRateRows.filter(r => {
      // 상위 세그먼트만 차트에 표시 (하위 평형별 서브로우 중복 차트 표출 방지)
      if (r.depth > 1 || r.isSubRow) return false;
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
              color: isMemberRateCategory(validRows[idx]) ? '#284F42' : '#D0C6BB',
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
          itemStyle: { color: '#B59269' },
          lineStyle: { width: 3 }
        }
      ]
    };
  };

  return (
    <div className="w-full min-h-screen bg-[#F4F3EE] text-[#1B382E] tracking-tight pb-16 relative">
      {/* Ambient Forest Glow Banner */}
      <div className="w-full bg-[#284F42] h-[190px] absolute top-0 left-0 z-0 overflow-hidden rounded-b-[36px] border-b border-[#1B382E] shadow-xl">
        <div className="absolute -top-16 -right-16 w-96 h-96 rounded-full bg-[#2F5548] opacity-70 pointer-events-none" />
        <div className="absolute top-8 left-1/3 w-80 h-80 rounded-full bg-[#2F5548] opacity-40 blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 right-1/4 w-60 h-60 rounded-full bg-[#1B382E] opacity-60 pointer-events-none" />
      </div>

      <div className="relative z-10 max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* Top Header Card */}
        <div className="bg-white rounded-3xl p-6 lg:p-8 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] relative overflow-hidden">
          <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1B382E]/80 border border-white/20 text-white/90 text-xs font-semibold backdrop-blur-xs shadow-xs mb-3">
                <span className="w-2 h-2 rounded-full bg-[#5FB878] animate-pulse" />
                <span>BELLEFORET RESORT · MEMBERSHIP & LOYALTY INTELLIGENCE</span>
              </div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="bg-[#E8F2EE] text-[#1E523F] text-xs px-2.5 py-1 rounded-full flex items-center gap-1 border border-[#B4C6C1]/70 font-bold whitespace-nowrap">
                  <Calendar size={12} className="text-[#284F42] shrink-0" />
                  조회기간: <strong className="ml-1 text-[#1B382E]">{startDate} {isEffectiveRange && endDate ? `~ ${endDate}` : ''}</strong>
                </span>
              </div>
              
              <h1 className="text-2xl lg:text-3xl font-black text-[#1B382E] tracking-tight mt-1 flex items-center gap-3 break-keep">
                <Award className="text-[#284F42] shrink-0" size={32} />
                <span>통합 회원권 및 멤버십 분석 대시보드</span>
              </h1>
              <p className="text-sm text-[#5A6B63] mt-2 font-normal max-w-4xl break-keep">
                콘도 분양회원(기명·구좌 / 무기명), 법인 휴양소 협약 회원사, 골프장 분양회원(법인 풀구좌·콘도 구좌) 및 동반 앵커 효과, 디지털 온라인 멤버십까지 벨포레 전 부문의 회원 데이터를 통합 분석합니다.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 self-start 2xl:self-center">
              <GlobalDatePicker showPresets={true} />
              <button
                onClick={fetchAllMemberIntelligence}
                disabled={loading}
                className="px-4 py-2.5 bg-[#B59269] hover:bg-[#a38058] active:scale-95 text-white rounded-xl text-xs font-bold transition-all duration-150 shadow-2xs flex items-center justify-center gap-2 cursor-pointer select-none whitespace-nowrap shrink-0"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                새로고침
              </button>
            </div>
          </div>
        </div>

        {apiError && (
          <div className="bg-[#FDF0ED] border border-[#EAC5BD] text-[#8B2635] rounded-2xl p-4 text-sm font-semibold">
            {apiError}
          </div>
        )}

        {/* 4대 핵심 회원 그룹 요약 KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          
          {/* KPI 1: 콘도 기명/구좌회원 */}
          <div className="bg-white p-6 rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] hover:shadow-[0_12px_32px_rgba(40,79,66,0.1)] transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#5A6B63] flex items-center gap-1.5">
                  <Hotel size={16} className="text-[#284F42] shrink-0" /> 콘도 기명/구좌회원
                </span>
                <span className="text-[11px] font-bold bg-[#E8F2EE] text-[#1E523F] px-2.5 py-0.5 rounded-full border border-[#B4C6C1]/70">
                  정규 분양회원
                </span>
              </div>
              <div className="text-3xl font-black text-[#1B382E] my-1 font-financial">
                {loading ? (
                  <div className="animate-pulse h-9 w-28 bg-[#F4F3EE] rounded-lg inline-block" />
                ) : (
                  <>
                    {formatNum(memberRoomRow?.todayRooms || 0)}
                    <span className="text-sm font-semibold text-[#5A6B63] ml-1">실</span>
                    <span className="text-base font-bold text-[#284F42] ml-2.5">
                      ({formatNum(memberRoomRow?.todayRevenue || 0)}원)
                    </span>
                  </>
                )}
              </div>
              <div className="text-xs text-[#5A6B63] mt-1 font-financial">
                조회기간 객단가(ADR): <strong className="text-[#1B382E]">{formatNum(memberRoomRow?.todayAdr || 0)}원</strong>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#D0C6BB]/40 bg-[#F4F3EE]/80 -mx-6 -mb-6 p-4 rounded-b-3xl text-[11px] text-[#5A6B63] space-y-1 font-financial">
              <div className="flex justify-between">
                <span className="text-[#5A6B63]">당월 누적(MTD)</span>
                <strong className="text-[#1B382E]">
                  {formatNum(memberRoomRow?.mtdRooms || 0)}실 · {formatNum(memberRoomRow?.mtdRevenue || 0)}원
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5A6B63]">연간 누적(YTD)</span>
                <strong className="text-[#1E523F]">
                  {formatNum(memberRoomRow?.ytdRooms || 0)}실 · {formatNum(memberRoomRow?.ytdRevenue || 0)}원
                </strong>
              </div>
            </div>
          </div>

          {/* KPI 2: 콘도 무기명회원 */}
          <div className="bg-white p-6 rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] hover:shadow-[0_12px_32px_rgba(40,79,66,0.1)] transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#5A6B63] flex items-center gap-1.5">
                  <Award size={16} className="text-[#284F42] shrink-0" /> 콘도 무기명회원 (Bearer)
                </span>
                <span className="text-[11px] font-bold bg-[#F4F3EE] text-[#1B382E] px-2.5 py-0.5 rounded-full border border-[#D0C6BB]/70">
                  무기명 분양권
                </span>
              </div>
              <div className="text-3xl font-black text-[#1B382E] my-1 font-financial">
                {loading ? (
                  <div className="animate-pulse h-9 w-28 bg-[#F4F3EE] rounded-lg inline-block" />
                ) : (
                  <>
                    {formatNum(bearerRoomRow?.todayRooms || 0)}
                    <span className="text-sm font-semibold text-[#5A6B63] ml-1">실</span>
                    <span className="text-base font-bold text-[#1B382E] ml-2.5">
                      ({formatNum(bearerRoomRow?.todayRevenue || 0)}원)
                    </span>
                  </>
                )}
              </div>
              <div className="text-xs text-[#5A6B63] mt-1 font-financial">
                조회기간 객단가(ADR): <strong className="text-[#1B382E]">{formatNum(bearerRoomRow?.todayAdr || 0)}원</strong>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#D0C6BB]/40 bg-[#F4F3EE]/80 -mx-6 -mb-6 p-4 rounded-b-3xl text-[11px] text-[#5A6B63] space-y-1 font-financial">
              <div className="flex justify-between">
                <span className="text-[#5A6B63]">당월 누적(MTD)</span>
                <strong className="text-[#1B382E]">
                  {formatNum(bearerRoomRow?.mtdRooms || 0)}실 · {formatNum(bearerRoomRow?.mtdRevenue || 0)}원
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5A6B63]">연간 누적(YTD)</span>
                <strong className="text-[#1B382E]">
                  {formatNum(bearerRoomRow?.ytdRooms || 0)}실 · {formatNum(bearerRoomRow?.ytdRevenue || 0)}원
                </strong>
              </div>
            </div>
          </div>

          {/* KPI 3: 골프장 분양회원 */}
          <div className="bg-white p-6 rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] hover:shadow-[0_12px_32px_rgba(40,79,66,0.1)] transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#5A6B63] flex items-center gap-1.5">
                  <Flag size={16} className="text-[#284F42] shrink-0" /> 골프 분양회원 내장·매출
                </span>
                <span className="text-[11px] font-bold bg-[#E8F2EE] text-[#1E523F] px-2.5 py-0.5 rounded-full border border-[#B4C6C1]/70">
                  비중 {golfMemberSummary?.totalBunyangPlayerRatio ?? 0}%
                </span>
              </div>
              <div className="text-3xl font-black text-[#284F42] my-1 font-financial">
                {loading ? (
                  <div className="animate-pulse h-9 w-28 bg-[#F4F3EE] rounded-lg inline-block" />
                ) : (
                  <>
                    {formatNum(golfMemberSummary?.totalBunyangPlayers || 0)}
                    <span className="text-sm font-semibold text-[#5A6B63] ml-1">명</span>
                    <span className="text-base font-bold text-[#1E523F] ml-2">
                      ({formatNum(golfMemberSummary?.totalBunyangTeams || 0)}팀)
                    </span>
                  </>
                )}
              </div>
              <div className="text-xs text-[#5A6B63] mt-1 font-financial">
                분양회원 그린피 매출: <strong className="text-[#1B382E]">{formatNum(golfMemberSummary?.totalBunyangRevenue || 0)}원</strong>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#D0C6BB]/40 bg-[#F4F3EE]/80 -mx-6 -mb-6 p-4 rounded-b-3xl text-[11px] text-[#5A6B63] space-y-1 font-financial">
              <div className="flex justify-between">
                <span className="text-[#5A6B63]">회원 동반 비회원 앵커 매출</span>
                <strong className="text-[#1E523F]">
                  +{formatNum(golfMemberSynergy?.totalAnchorRevenue || 0)}원
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5A6B63]">회원 1인당 그린피 우대차액</span>
                <strong className="text-[#1B382E]">
                  {golfMembershipAnalysis?.greenFeeGapFormatted ? `-${golfMembershipAnalysis.greenFeeGapFormatted}원` : '-'}
                </strong>
              </div>
            </div>
          </div>

          {/* KPI 4: 디지털 온라인/모바일 회원 */}
          <div className="bg-white p-6 rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] hover:shadow-[0_12px_32px_rgba(40,79,66,0.1)] transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#5A6B63] flex items-center gap-1.5">
                  <Smartphone size={16} className="text-[#B59269] shrink-0" /> 온라인·모바일 통합 회원
                </span>
                <span className="text-[11px] font-bold bg-[#B59269]/15 text-[#B59269] px-2.5 py-0.5 rounded-full border border-[#B59269]/30">
                  활성률 {onlineSummary?.recentActiveRate ?? 0}%
                </span>
              </div>
              <div className="text-3xl font-black text-[#1B382E] my-1 font-financial">
                {loading ? (
                  <div className="animate-pulse h-9 w-28 bg-[#F4F3EE] rounded-lg inline-block" />
                ) : (
                  <>
                    {formatNum(onlineSummary?.totalCumulativeMembers || 0)}
                    <span className="text-sm font-semibold text-[#5A6B63] ml-1">명</span>
                  </>
                )}
              </div>
              <div className="text-xs text-[#5A6B63] mt-1 font-financial">
                최근 활성 회원: <strong className="text-[#284F42]">{formatNum(onlineSummary?.recentActiveMembers || 0)}명</strong> · 다회 재구매: <strong className="text-[#1B382E]">{formatNum(onlineSummary?.repeatBuyers || 0)}명</strong>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#D0C6BB]/40 bg-[#F4F3EE]/80 -mx-6 -mb-6 p-4 rounded-b-3xl text-[11px] text-[#5A6B63] space-y-1 font-financial">
              <div className="flex justify-between">
                <span className="text-[#5A6B63]">다부문 교차 이용 VIP</span>
                <strong className="text-[#284F42]">
                  {formatNum(onlineChannelBreakdown?.multiChannel || 0)}명 ({onlineChannelBreakdown?.multiChannelRatio ?? 0}%)
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5A6B63]">진성 다회 방문자 (True Repeat)</span>
                <strong className="text-[#1B382E]">
                  {formatNum(onlineSummary?.trueRepeatBuyers || 0)}명 ({onlineSummary?.trueRepeatRate ?? 0}%)
                </strong>
              </div>
            </div>
          </div>

        </div>

      {/* SECTION 1: 콘도(객실) 회원권 & 요금타입별 정밀 실적 분석 */}
      <div className="bg-white rounded-3xl p-6 lg:p-8 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#D0C6BB]/60 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]/70">
                콘도 분양회원 및 요금 유형 분석
              </span>
            </div>
            <h2 className="text-xl font-black text-[#1B382E] mt-1.5 flex items-center gap-2">
              <Hotel className="w-5 h-5 text-[#284F42]" />
              콘도 회원권(기명·무기명·휴양소·임직원) 및 요금타입별 객실 실적
            </h2>
            <p className="text-xs text-[#5A6B63] mt-1">
              산하 PMS 요금타입(Rate Type) 원장 기준 회원권 객실과 일반/비회원 객실의 조회기간·당월(MTD)·연간(YTD) 판매 객실수, 순매출, 객단가(ADR) 및 전년 동기(LY) 실적을 대조합니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            {/* 전년동기(LY) 컬럼 토글 버튼 */}
            <button
              onClick={() => setShowLyColumns(!showLyColumns)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                showLyColumns
                  ? 'bg-[#B59269] text-white border-[#B59269] shadow-2xs'
                  : 'bg-white text-[#5A6B63] border-[#D0C6BB]/80 hover:bg-[#F4F3EE]'
              }`}
              title="2025년 원천 PMS에 요금타입 분류 코드가 없어 전년동기 실적은 미제공 상태입니다."
            >
              전년동기(LY) 컬럼 {showLyColumns ? '숨김' : '표시'}
              {!hasLyData && (
                <span className="ml-1 text-[10px] opacity-80">(원천 미제공)</span>
              )}
            </button>

            <div className="flex items-center gap-1.5 bg-[#F4F3EE] p-1 rounded-xl border border-[#D0C6BB]/60">
              <button
                onClick={() => setRatePeriodMode('today')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  ratePeriodMode === 'today' ? 'bg-[#284F42] text-white shadow-2xs' : 'text-[#5A6B63] hover:text-[#1B382E]'
                }`}
              >
                조회기간 실적
              </button>
              <button
                onClick={() => setRatePeriodMode('mtd')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  ratePeriodMode === 'mtd' ? 'bg-[#284F42] text-white shadow-2xs' : 'text-[#5A6B63] hover:text-[#1B382E]'
                }`}
              >
                당월 누적 (MTD)
              </button>
              <button
                onClick={() => setRatePeriodMode('ytd')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  ratePeriodMode === 'ytd' ? 'bg-[#284F42] text-white shadow-2xs' : 'text-[#5A6B63] hover:text-[#1B382E]'
                }`}
              >
                연간 누적 (YTD)
              </button>
            </div>
          </div>
        </div>

        {/* 콘도 회원권 vs 비회원 비교 차트 */}
        {!loading && segmentRateRows.length > 0 && (
          <div className="bg-[#F4F3EE]/80 rounded-2xl p-4 border border-[#D0C6BB]/60">
            <div className="flex items-center justify-between mb-2 px-2">
              <span className="text-xs font-bold text-[#1B382E]">
                요금타입(회원권 vs 비회원) 객실 판매량 및 평균 객단가(ADR) 비교 ({ratePeriodMode === 'today' ? '조회기간' : ratePeriodMode === 'mtd' ? '당월 MTD' : '연간 YTD'})
              </span>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1 text-[#1E523F] font-bold">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#284F42] inline-block" /> 회원권/협약 그룹
                </span>
                <span className="flex items-center gap-1 text-[#5A6B63] font-semibold">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#D0C6BB] inline-block" /> 일반/비회원 그룹
                </span>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ReactECharts option={getCondoRateChartOption()} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        )}

        {/* 콘도 회원권 & 요금타입 전체 정산 테이블 */}
        <div className="overflow-x-auto rounded-2xl border border-[#D0C6BB]/75">
          <table className="w-full border-collapse text-left text-sm font-financial min-w-[1050px]">
            <thead>
              <tr className="border-b-2 border-[#1B382E] text-xs font-bold text-[#1B382E] bg-[#F4F3EE]">
                <th className="py-3.5 px-5 text-left">구분 (회원권 / 요금타입)</th>
                <th className="py-3.5 px-3 text-center">분류</th>
                <th className="py-3.5 px-4 text-right bg-[#E8F2EE]/50">조회기간 객실</th>
                <th className="py-3.5 px-4 text-right bg-[#E8F2EE]/50">조회기간 순매출</th>
                <th className="py-3.5 px-4 text-right bg-[#E8F2EE]/50">조회기간 ADR</th>
                {(showLyColumns || hasLyData) && (
                  <>
                    <th className="py-3.5 px-4 text-right bg-[#FAF6F0]">
                      <div className="flex items-center justify-end gap-1">
                        <span>전년동기(LY) 객실</span>
                        {!hasLyData && (
                          <span className="text-[10px] text-[#8B6E4E] font-normal" title="2025년 원천 PMS에 요금타입 분류 코드가 없어 미제공 상태입니다.">
                            *미제공
                          </span>
                        )}
                      </div>
                    </th>
                    <th className="py-3.5 px-4 text-right bg-[#FAF6F0]">
                      <div className="flex items-center justify-end gap-1">
                        <span>전년동기(LY) 매출</span>
                        {!hasLyData && (
                          <span className="text-[10px] text-[#8B6E4E] font-normal" title="2025년 원천 PMS에 요금타입 분류 코드가 없어 미제공 상태입니다.">
                            *미제공
                          </span>
                        )}
                      </div>
                    </th>
                  </>
                )}
                <th className="py-3.5 px-4 text-right bg-[#F4F3EE]/60">당월(MTD) 객실</th>
                <th className="py-3.5 px-4 text-right bg-[#F4F3EE]/60">당월(MTD) 매출</th>
                <th className="py-3.5 px-4 text-right bg-[#F4F3EE]/80">연간(YTD) 객실</th>
                <th className="py-3.5 px-4 text-right bg-[#F4F3EE]/80">연간(YTD) 매출</th>
                <th className="py-3.5 px-5 text-right bg-[#F4F3EE]/80">연간(YTD) ADR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D0C6BB]/30">
              {segmentRateRows.map((row, idx) => {
                const rName = String(row.rateName || row.segmentName || '-');
                const isMember = isMemberRateCategory(row);
                const lyRooms = row.todayLyRooms ?? row.lyRoomsSold ?? null;
                const lyRev = row.todayLyRevenue ?? row.lyTotalRevenue ?? null;

                return (
                  <tr
                    key={idx}
                    className={`transition-colors text-[#1B382E] ${
                      isMember ? 'bg-[#E8F2EE]/30 hover:bg-[#E8F2EE]/60' : 'hover:bg-[#F4F3EE]/50'
                    }`}
                  >
                    <td className={`py-3.5 px-5 whitespace-nowrap ${row.isSubRow ? 'pl-9 text-xs font-semibold text-[#5A6B63]' : 'font-black text-[#1B382E]'}`}>
                      {row.isSubRow && <span className="text-[#8C9E96] mr-1.5 font-normal">↳</span>}
                      {rName}
                    </td>
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      {row.isSubRow ? (
                        <span className="text-[10px] text-[#8C9E96]">
                          {row.roomType || row.pyungType || '평형별'}
                        </span>
                      ) : isMember ? (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]/70">
                          회원·협약
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#F4F3EE] text-[#5A6B63] border border-[#D0C6BB]/60">
                          일반·비회원
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#1B382E] bg-[#E8F2EE]/20 whitespace-nowrap">
                      {formatNum(row.todayRooms || 0)}실
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-[#284F42] bg-[#E8F2EE]/20 whitespace-nowrap">
                      {formatNum(row.todayRevenue || 0)}원
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-[#5A6B63] bg-[#E8F2EE]/20 whitespace-nowrap">
                      {Number(row.todayAdr || 0) > 0 
                        ? `${formatNum(row.todayAdr)}원` 
                        : Number(row.todayRooms || 0) === 0 && Number(row.todayRevenue || 0) > 0
                        ? <span title="객실 판매 실적 없는 순수 부대매출 항목으로 ADR(객실단가) 산출 제외" className="text-[#8C9E96] text-xs cursor-help">해당없음</span>
                        : '-'}
                    </td>
                    {(showLyColumns || hasLyData) && (
                      <>
                        <td className="py-3.5 px-4 text-right text-[#5A6B63] bg-[#FAF6F0]/50 whitespace-nowrap">
                          {lyRooms !== null ? `${formatNum(lyRooms)}실` : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-right text-[#5A6B63] bg-[#FAF6F0]/50 whitespace-nowrap">
                          {lyRev !== null ? `${formatNum(lyRev)}원` : '-'}
                        </td>
                      </>
                    )}
                    <td className="py-3.5 px-4 text-right font-semibold text-[#1B382E] bg-[#F4F3EE]/40 whitespace-nowrap">
                      {formatNum(row.mtdRooms || 0)}실
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#1B382E] bg-[#F4F3EE]/40 whitespace-nowrap">
                      {formatNum(row.mtdRevenue || 0)}원
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#1B382E] bg-[#F4F3EE]/60 whitespace-nowrap">
                      {formatNum(row.ytdRooms || 0)}실
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-[#284F42] bg-[#F4F3EE]/60 whitespace-nowrap">
                      {formatNum(row.ytdRevenue || 0)}원
                    </td>
                    <td className="py-3.5 px-5 text-right font-semibold text-[#5A6B63] bg-[#F4F3EE]/60 whitespace-nowrap">
                      {Number(row.ytdAdr || 0) > 0 
                        ? `${formatNum(row.ytdAdr)}원` 
                        : Number(row.ytdRooms || 0) === 0 && Number(row.ytdRevenue || 0) > 0
                        ? <span title="객실 판매 실적 없는 순수 부대매출 항목으로 ADR(객실단가) 산출 제외" className="text-[#8C9E96] text-xs cursor-help">해당없음</span>
                        : '-'}
                    </td>
                  </tr>
                );
              })}

              {/* 백엔드 공식 총합계 Row (isGrandTotal) */}
              {grandTotalRoomRow && (
                <tr className="bg-[#284F42] text-white font-bold border-t-2 border-[#1B382E]">
                  <td className="py-4 px-5 whitespace-nowrap">전체 객실 총합계</td>
                  <td className="py-4 px-3 text-center whitespace-nowrap">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/15 text-emerald-200">
                      공식 합계
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right text-emerald-200 whitespace-nowrap">
                    {formatNum(grandTotalRoomRow.todayRooms || 0)}실
                  </td>
                  <td className="py-4 px-4 text-right text-emerald-200 whitespace-nowrap">
                    {formatNum(grandTotalRoomRow.todayRevenue || 0)}원
                  </td>
                  <td className="py-4 px-4 text-right text-white whitespace-nowrap">
                    {formatNum(grandTotalRoomRow.todayAdr || 0)}원
                  </td>
                  {(showLyColumns || hasLyData) && (
                    <>
                      <td className="py-4 px-4 text-right text-[#D0C6BB] whitespace-nowrap">
                        {(grandTotalRoomRow.todayLyRooms ?? grandTotalRoomRow.lyRoomsSold) != null
                          ? `${formatNum(grandTotalRoomRow.todayLyRooms ?? grandTotalRoomRow.lyRoomsSold)}실`
                          : '-'}
                      </td>
                      <td className="py-4 px-4 text-right text-[#D0C6BB] whitespace-nowrap">
                        {(grandTotalRoomRow.todayLyRevenue ?? grandTotalRoomRow.lyTotalRevenue) != null
                          ? `${formatNum(grandTotalRoomRow.todayLyRevenue ?? grandTotalRoomRow.lyTotalRevenue)}원`
                          : '-'}
                      </td>
                    </>
                  )}
                  <td className="py-4 px-4 text-right text-white whitespace-nowrap">
                    {formatNum(grandTotalRoomRow.mtdRooms || 0)}실
                  </td>
                  <td className="py-4 px-4 text-right text-white whitespace-nowrap">
                    {formatNum(grandTotalRoomRow.mtdRevenue || 0)}원
                  </td>
                  <td className="py-4 px-4 text-right text-[#B59269] whitespace-nowrap">
                    {formatNum(grandTotalRoomRow.ytdRooms || 0)}실
                  </td>
                  <td className="py-4 px-4 text-right text-[#B59269] whitespace-nowrap">
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

        {/* 전년동기(LY) 및 객실부대 팩트 안내 배너 */}
        <div className="p-4 bg-[#FAF6F0] rounded-2xl border border-[#D0C6BB] flex items-start gap-3 text-xs text-[#1B382E]">
          <div className="p-1 bg-[#EFE9DF] rounded-lg text-[#8B6E4E] shrink-0 mt-0.5">
            <Info size={15} />
          </div>
          <div className="space-y-1">
            <div className="font-bold text-[#1B382E] flex items-center gap-1.5 flex-wrap">
              <span>콘도 요금타입별 정산 지표 표기 안내</span>
              <span className="text-[10px] font-semibold bg-[#E8F2EE] text-[#1E523F] px-1.5 py-0.2 rounded border border-[#B4C6C1]/60">
                Zero-Hallucination 실측 원칙
              </span>
            </div>
            <p className="text-[#5A6B63] leading-relaxed">
              • <b>전년동기(LY) 실적</b>: 2025년 객실 원천 데이터는 회원권·패키지 등 요금타입별 분류 코드가 부재(일반 단일 항목 덤프)하여, 세그먼트별 전년동기 실적이 제공되지 않습니다. 상단 [전년동기(LY) 컬럼 표시] 버튼으로 컬럼 토글이 가능합니다.<br />
              • <b>객실부대(기타) ADR</b>: 객실 판매 실적이 없는 순수 부대매출 항목으로, 객단가(ADR = 매출 / 판매실수)의 분모가 0이므로 '해당없음'으로 표기됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 2: 골프장 분양회원 유형별 실적 & 회원 동반(Anchor) 시너지 분석 */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Left (7 cols): 골프 분양회원 세부 유형별 내장 및 단가 분석 */}
        <div className="xl:col-span-7 bg-white rounded-3xl p-6 lg:p-8 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] space-y-6">
          <div className="border-b border-[#D0C6BB]/60 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]/70">
                GOLF MEMBERSHIP BREAKDOWN
              </span>
              <span className="text-xs text-[#5A6B63] font-mono">
                API: /api/v6/report/golf-channel-intelligence
              </span>
            </div>
            <h2 className="text-xl font-black text-[#1B382E] mt-1.5 flex items-center gap-2">
              <Flag className="w-5 h-5 text-[#284F42]" />
              골프장 분양회원(법인 풀구좌 · 콘도 구좌) vs 비회원 실적 분석
            </h2>
            <p className="text-xs text-[#5A6B63] mt-1">
              골프 내장객 중 법인 풀구좌 분양회원, 콘도 구좌 분양회원(본인/지정), 일반 대중(비회원)의 팀수·인원수·그린피 매출 및 평균 단가를 비교합니다.
            </p>
          </div>

          {/* 회원 vs 비회원 그린피 단가 비교 요약 배너 */}
          {golfMembershipAnalysis && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#F4F3EE]/80 p-4 rounded-2xl border border-[#D0C6BB]/60 font-financial">
              <div className="bg-white p-4 rounded-xl border border-[#D0C6BB]/60 shadow-2xs">
                <div className="flex items-center justify-between text-xs text-[#5A6B63] font-bold">
                  <span>골프 회원 평균 그린피</span>
                  <span className="text-[#1E523F] bg-[#E8F2EE] px-2 py-0.5 rounded-full border border-[#B4C6C1]/60">
                    인원 비중 {golfMembershipAnalysis.member?.playerRatio ?? 0}%
                  </span>
                </div>
                <div className="text-2xl font-black text-[#284F42] mt-1">
                  {golfMembershipAnalysis.member?.avgGreenFeeFormatted || '0'}원
                </div>
                <div className="text-[11px] text-[#5A6B63] mt-1">
                  내장 {golfMembershipAnalysis.member?.playersFormatted || '0'}명 · 매출 {golfMembershipAnalysis.member?.greenFeeRevenueFormatted || '0'}원
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-[#D0C6BB]/60 shadow-2xs">
                <div className="flex items-center justify-between text-xs text-[#5A6B63] font-bold">
                  <span>비회원(Public) 평균 그린피</span>
                  <span className="text-[#5A6B63] bg-[#F4F3EE] px-2 py-0.5 rounded-full border border-[#D0C6BB]/60">
                    인원 비중 {golfMembershipAnalysis.nonMember?.playerRatio ?? 0}%
                  </span>
                </div>
                <div className="text-2xl font-black text-[#1B382E] mt-1">
                  {golfMembershipAnalysis.nonMember?.avgGreenFeeFormatted || '0'}원
                </div>
                <div className="text-[11px] text-[#5A6B63] mt-1">
                  내장 {golfMembershipAnalysis.nonMember?.playersFormatted || '0'}명 · 매출 {golfMembershipAnalysis.nonMember?.greenFeeRevenueFormatted || '0'}원
                </div>
              </div>

              <div className="bg-[#284F42] text-white p-4 rounded-xl flex flex-col justify-between shadow-2xs">
                <div className="text-xs font-bold text-emerald-200">회원 1인당 그린피 우대 혜택</div>
                <div className="text-2xl font-black text-[#B59269] mt-1">
                  -{golfMembershipAnalysis.greenFeeGapFormatted || '0'}원
                </div>
                <div className="text-[11px] text-white/80 mt-1">
                  비회원가 대비 회원 평균 할인폭
                </div>
              </div>
            </div>
          )}

          {/* 분양회원 세부 유형 테이블 */}
          <div className="overflow-x-auto rounded-2xl border border-[#D0C6BB]/75">
            <table className="w-full border-collapse text-left text-sm font-financial">
              <thead>
                <tr className="border-b-2 border-[#1B382E] text-xs font-bold text-[#1B382E] bg-[#F4F3EE]">
                  <th className="py-3 px-4 text-left">회원권 구분</th>
                  <th className="py-3 px-3 text-right">라운딩 팀수</th>
                  <th className="py-3 px-3 text-right">내장 인원</th>
                  <th className="py-3 px-3 text-right">인원 점유율</th>
                  <th className="py-3 px-4 text-right">그린피 순매출</th>
                  <th className="py-3 px-4 text-right">1인 평균 그린피</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D0C6BB]/30">
                {golfMemberBreakdown.map((item, idx) => {
                  const isBunyang = item.type !== 'PUBLIC';
                  return (
                    <tr
                      key={idx}
                      className={isBunyang ? 'bg-[#E8F2EE]/30 hover:bg-[#E8F2EE]/60 text-[#1B382E]' : 'hover:bg-[#F4F3EE]/50 text-[#1B382E]'}
                    >
                      <td className="py-3.5 px-4 font-black text-[#1B382E]">
                        <div className="flex items-center gap-2">
                          <span>{item.name}</span>
                          {isBunyang && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]/70">
                              분양회원
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-[#1B382E]">
                        {formatNum(item.teams || 0)}팀 ({item.teamRatio ?? 0}%)
                      </td>
                      <td className="py-3.5 px-3 text-right font-black text-[#284F42]">
                        {formatNum(item.players || 0)}명
                      </td>
                      <td className="py-3.5 px-3 text-right font-semibold text-[#1E523F]">
                        {item.playerRatio ?? 0}%
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-[#1B382E]">
                        {formatNum(item.revenue || 0)}원
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-[#5A6B63]">
                        {formatNum(item.avgGreenFee || 0)}원
                      </td>
                    </tr>
                  );
                })}

                {golfMemberSummary && (
                  <tr className="bg-[#284F42] text-white font-bold">
                    <td className="py-3.5 px-4">분양회원 소계 (법인 + 콘도 구좌)</td>
                    <td className="py-3.5 px-3 text-right text-[#B59269]">
                      {formatNum(golfMemberSummary.totalBunyangTeams || 0)}팀 ({golfMemberSummary.totalBunyangRatio ?? 0}%)
                    </td>
                    <td className="py-3.5 px-3 text-right text-[#B59269]">
                      {formatNum(golfMemberSummary.totalBunyangPlayers || 0)}명
                    </td>
                    <td className="py-3.5 px-3 text-right text-[#B59269]">
                      {golfMemberSummary.totalBunyangPlayerRatio ?? 0}%
                    </td>
                    <td className="py-3.5 px-4 text-right text-emerald-200">
                      {formatNum(golfMemberSummary.totalBunyangRevenue || 0)}원
                    </td>
                    <td className="py-3.5 px-4 text-right text-[#D0C6BB]">
                      분양회원 전용 집계
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right (5 cols): 골프 회원 동반 비회원 앵커 효과 (Member Anchor Synergy) */}
        <div className="xl:col-span-5 bg-white rounded-3xl p-6 lg:p-8 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] flex flex-col justify-between space-y-6">
          <div>
            <div className="border-b border-[#D0C6BB]/60 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#B59269]/15 text-[#B59269] border border-[#B59269]/30">
                  MEMBER ANCHOR SYNERGY
                </span>
              </div>
              <h2 className="text-xl font-black text-[#1B382E] mt-1.5 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#B59269]" />
                회원 동반 비회원 유치(Anchor) 매출 기여도
              </h2>
              <p className="text-xs text-[#5A6B63] mt-1">
                분양회원이 라운딩 시 동반 유치한 비회원(정상가 결제)이 창출한 순수 추가 그린피 매출입니다.
              </p>
            </div>

            {/* 총 앵커 매출 하이라이트 */}
            <div className="mt-5 bg-[#284F42] text-white p-5 rounded-2xl shadow-md font-financial relative overflow-hidden">
              <div className="text-xs font-semibold text-emerald-200">
                회원이 동반 유치한 비회원 그린피 창출액 (Anchor Revenue)
              </div>
              <div className="text-3xl font-black text-[#B59269] mt-1">
                +{formatNum(golfMemberSynergy?.totalAnchorRevenue || 0)}원
              </div>
              <p className="text-[11px] text-white/80 mt-1.5">
                회원 1~2인이 포함된 팀에서 동반 비회원(2~3인)이 지불한 순수 그린피 합계
              </p>
            </div>

            {/* 팀 구성별 앵커 내역 */}
            {golfMemberSynergy && (
              <div className="mt-5 space-y-3 font-financial">
                <div className="p-4 rounded-2xl bg-[#E8F2EE] border border-[#B4C6C1]/70 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-[#1B382E]">
                      회원 1명 + 비회원 3명 동반 팀
                    </div>
                    <div className="text-xs text-[#5A6B63] mt-0.5">
                      총 <strong className="text-[#1B382E]">{formatNum(golfMemberSynergy.member1Non3?.teams || 0)}팀</strong> (전체 팀의 {golfMemberSynergy.member1Non3?.ratio ?? 0}%)
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-[#1E523F] font-bold">동반 비회원 3인 창출 매출</div>
                    <div className="text-base font-black text-[#284F42]">
                      {formatNum(golfMemberSynergy.member1Non3?.nonMemberRevenue || 0)}원
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#F4F3EE] border border-[#D0C6BB]/70 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-[#1B382E]">
                      회원 2명 + 비회원 2명 동반 팀
                    </div>
                    <div className="text-xs text-[#5A6B63] mt-0.5">
                      총 <strong className="text-[#1B382E]">{formatNum(golfMemberSynergy.member2Non2?.teams || 0)}팀</strong> (전체 팀의 {golfMemberSynergy.member2Non2?.ratio ?? 0}%)
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-[#284F42] font-bold">동반 비회원 2인 창출 매출</div>
                    <div className="text-base font-black text-[#1B382E]">
                      {formatNum(golfMemberSynergy.member2Non2?.nonMemberRevenue || 0)}원
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-[#D0C6BB]/60 flex items-center justify-between shadow-2xs">
                  <div>
                    <div className="text-sm font-bold text-[#1B382E]">
                      회원 3~4명 중심 팀
                    </div>
                    <div className="text-xs text-[#5A6B63] mt-0.5">
                      총 <strong className="text-[#1B382E]">{formatNum(golfMemberSynergy.member3to4?.teams || 0)}팀</strong> (전체 팀의 {golfMemberSynergy.member3to4?.ratio ?? 0}%)
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-[#5A6B63] font-semibold">팀 그린피 매출</div>
                    <div className="text-base font-black text-[#1B382E]">
                      {formatNum(golfMemberSynergy.member3to4?.revenue || 0)}원
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-[#D0C6BB]/60 flex items-center justify-between shadow-2xs">
                  <div>
                    <div className="text-sm font-bold text-[#1B382E]">
                      순수 비회원 4인 팀 (Public)
                    </div>
                    <div className="text-xs text-[#5A6B63] mt-0.5">
                      총 <strong className="text-[#1B382E]">{formatNum(golfMemberSynergy.pureNonMember?.teams || 0)}팀</strong> (전체 팀의 {golfMemberSynergy.pureNonMember?.ratio ?? 0}%)
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-[#5A6B63] font-semibold">팀 그린피 매출</div>
                    <div className="text-base font-black text-[#1B382E]">
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
      <div className="bg-white rounded-3xl p-6 lg:p-7 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] hover:shadow-[0_12px_32px_rgba(40,79,66,0.1)] transition-all duration-300 relative group space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#D0C6BB]/40 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#1B382E]/5 text-[#1B382E] border border-[#D0C6BB]/60">
                CORPORATE RETREAT & REPEAT MEMBER GROUPS
              </span>
              <span className="text-xs text-[#5A6B63] font-mono">
                API: /api/v6/report/corporate-group-sales
              </span>
            </div>
            <h2 className="text-xl font-bold text-[#1B382E] mt-1.5 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-[#B59269]" />
              기업 휴양소(협약 회원사) 및 다회 재방문(Loyalty) 법인·단체 이용 원장
            </h2>
            <p className="text-xs text-[#5A6B63] mt-1">
              기업 하계/연중 휴양소 계약 회원사(`CORP_FIT`) 및 올해 2회 이상 재방문한 우수 법인·단체의 객실·식음·골프·레저 통합 소비 실적입니다.
            </p>
          </div>

          {corpFitSummary && (
            <div className="flex flex-wrap items-center gap-3 font-financial">
              <div className="bg-[#F4F3EE] border border-[#D0C6BB]/60 px-4 py-2 rounded-2xl text-xs">
                <span className="text-[#5A6B63] font-semibold block">기업 휴양소 이용</span>
                <strong className="text-[#1B382E] text-sm">
                  {formatNum(corpFitSummary.groupsCount || 0)}개사 · {formatNum(corpFitSummary.roomsCount || 0)}실 ({formatNum(corpFitSummary.totalPax || 0)}명)
                </strong>
              </div>
              <div className="bg-[#E8F2EE] border border-[#B4C6C1]/70 px-4 py-2 rounded-2xl text-xs">
                <span className="text-[#1E523F] font-semibold block">정산 완료 실매출</span>
                <strong className="text-[#1B382E] text-sm">
                  {corpFitSummary.totalRevenueFormatted || formatNum(corpFitSummary.totalRevenue || 0)}원
                </strong>
                <span className="text-[10px] text-[#1E523F]/80 block font-normal mt-0.5">
                  ({formatNum(completedCorpCount)}건 수납 완료)
                </span>
              </div>
              <div className="bg-[#FFF8E6] border border-[#F5C26B]/50 px-4 py-2 rounded-2xl text-xs">
                <span className="text-[#B57C1E] font-semibold block">후정산 청구 대기</span>
                <strong className="text-[#8C5D0D] text-sm">
                  {formatNum(pendingCorpCount)}건 (외상 후불)
                </strong>
                <span className="text-[10px] text-[#8C5D0D]/80 block font-normal mt-0.5">
                  사후 월정산/계산서 청구 전
                </span>
              </div>
              <div className="bg-[#B59269]/10 border border-[#B59269]/30 px-4 py-2 rounded-2xl text-xs">
                <span className="text-[#B59269] font-semibold block">재방문 단골 단체</span>
                <strong className="text-[#1B382E] text-sm">
                  {formatNum(corpSummary?.repeatGroupsCount || 0)}곳 (재방문율 {corpSummary?.repeatGroupRate ?? 0}%)
                </strong>
              </div>
            </div>
          )}
        </div>

        {/* 필터 탭 & 정렬 컨트롤 바 */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F4F3EE]/60 p-3 rounded-2xl border border-[#D0C6BB]/50">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-[#1B382E] mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-[#B59269]" />
              정산 상태 필터:
            </span>
            <button
              type="button"
              onClick={() => setCorpFilter('ALL')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                corpFilter === 'ALL'
                  ? 'bg-[#1B382E] text-white shadow-sm'
                  : 'bg-white text-[#5A6B63] hover:bg-[#E8F2EE] border border-[#D0C6BB]/60'
              }`}
            >
              전체 ({formatNum(baseMemberCorpGroups.length)}건)
            </button>
            <button
              type="button"
              onClick={() => setCorpFilter('COMPLETED')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 ${
                corpFilter === 'COMPLETED'
                  ? 'bg-[#1E523F] text-white shadow-sm'
                  : 'bg-white text-[#1E523F] hover:bg-[#E8F2EE] border border-[#1E523F]/30'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              정산 완료 (실매출 발생 {formatNum(completedCorpCount)}건)
            </button>
            <button
              type="button"
              onClick={() => setCorpFilter('PENDING')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 ${
                corpFilter === 'PENDING'
                  ? 'bg-[#B57C1E] text-white shadow-sm'
                  : 'bg-white text-[#B57C1E] hover:bg-[#FFF8E6] border border-[#B57C1E]/30'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              후정산 청구 대기 ({formatNum(pendingCorpCount)}건)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#5A6B63] flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#B59269]" />
              정렬:
            </span>
            <div className="flex items-center rounded-xl bg-white border border-[#D0C6BB]/60 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setCorpSort('rooms')}
                className={`px-2.5 py-0.5 rounded-lg transition-colors ${
                  corpSort === 'rooms' ? 'bg-[#1B382E] text-white' : 'text-[#5A6B63] hover:text-[#1B382E]'
                }`}
              >
                객실수 순
              </button>
              <button
                type="button"
                onClick={() => setCorpSort('revenue')}
                className={`px-2.5 py-0.5 rounded-lg transition-colors ${
                  corpSort === 'revenue' ? 'bg-[#1B382E] text-white' : 'text-[#5A6B63] hover:text-[#1B382E]'
                }`}
              >
                매출 높은 순
              </button>
              <button
                type="button"
                onClick={() => setCorpSort('date')}
                className={`px-2.5 py-0.5 rounded-lg transition-colors ${
                  corpSort === 'date' ? 'bg-[#1B382E] text-white' : 'text-[#5A6B63] hover:text-[#1B382E]'
                }`}
              >
                최신 이용 순
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
          <table className="w-full border-collapse text-left text-sm font-financial min-w-[950px]">
            <thead className="sticky top-0 z-10 bg-[#F4F3EE]">
              <tr className="border-b border-[#D0C6BB]/75 text-xs font-bold text-[#1B382E]">
                <th className="py-3 px-4 text-left">입실일 ~ 퇴실일</th>
                <th className="py-3 px-4 text-left">법인 / 휴양소 협약 회원사명</th>
                <th className="py-3 px-3 text-center">회원사 분류</th>
                <th className="py-3 px-3 text-center">결제/정산 상태</th>
                <th className="py-3 px-3 text-right">객실수 (평형)</th>
                <th className="py-3 px-3 text-right">투숙 인원</th>
                <th className="py-3 px-4 text-right">객실 매출</th>
                <th className="py-3 px-4 text-right">1인당 단가</th>
                <th className="py-3 px-4 text-right">통합 발생 매출</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D0C6BB]/30">
              {memberCorpGroups.length > 0 ? (
                memberCorpGroups.slice(0, 50).map((g, idx) => (
                  <tr key={idx} className="hover:bg-[#F4F3EE]/50 transition-colors">
                    <td className="py-3 px-4 text-[#5A6B63] whitespace-nowrap">
                      {g.checkInDate || '-'}
                      {g.stayDays ? (
                        <span className="text-[11px] text-[#5A6B63]/70 ml-1">({g.stayDays}박)</span>
                      ) : null}
                    </td>
                    <td className="py-3 px-4 font-extrabold text-[#1B382E] whitespace-nowrap">
                      <div>
                        {g.groupName || g.corporateName || '-'}
                        {g.organizationTotalRevenue > 0 && (
                          <span className="block text-[11px] font-normal text-[#1E523F] mt-0.5">
                            (기업 누적 실적: {formatNum(g.organizationTotalRevenue)}원 · {g.organizationTotalRooms || 0}실)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#1B382E]/5 text-[#1B382E] border border-[#D0C6BB]/60">
                        {g.categoryName || g.b2bSegmentName || '기업 임직원 휴양소'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {g.settlementStatus === 'COMPLETED' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          정산완료 ({g.paymentMethod || '수납'})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300" title="B2B 외상 후불 계약으로 아직 세금계산서 청구(수납) 전 상태입니다.">
                          <Clock className="w-3 h-3 text-amber-600" />
                          후정산 대기 ({g.paymentMethod || '후불'})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-[#1B382E] whitespace-nowrap">
                      {formatNum(g.spendingBreakdown?.roomsCount || 0)}실
                      {g.spendingBreakdown?.roomTypesUsed?.length > 0 && (
                        <span className="text-[11px] text-[#5A6B63] ml-1">
                          ({g.spendingBreakdown.roomTypesUsed.join(', ')})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right text-[#5A6B63] whitespace-nowrap">
                      {g.paxCountFormatted || formatNum(g.paxCount || 0)}명
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-[#1B382E] whitespace-nowrap">
                      <div>
                        {formatNum(g.spendingBreakdown?.roomRevenue || 0)}원
                        {g.spendingBreakdown?.roomRevenue === 0 && g.settlementStatus === 'PENDING_POST_BILLING' && (
                          <span className="block text-[10px] text-amber-700 font-normal">
                            (사후청구 대기)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-[#5A6B63] whitespace-nowrap">
                      {formatNum(g.avgSpendPerPax || 0)}원
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-[#1E523F] whitespace-nowrap">
                      <div>
                        {g.totalRevenueFormatted || formatNum(g.totalRevenue || 0)}원
                        {g.totalRevenue === 0 && g.settlementStatus === 'PENDING_POST_BILLING' && (
                          <span className="block text-[10px] text-amber-700 font-normal">
                            (미정산)
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#5A6B63]">
                    선택하신 정산 상태 필터에 해당하는 기업 휴양소 협약 회원사 데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 상위 표시 건수 안내 & B2B 기업 휴양소 후정산 프로세스 안내 배너 */}
        <div className="space-y-3 pt-1">
          {memberCorpGroups.length > 50 && (
            <p className="text-xs text-[#5A6B63] text-right font-medium">
              * 현재 상위 50개 단체가 표시 중입니다. (전체 {formatNum(memberCorpGroups.length)}건 중)
            </p>
          )}

          <div className="bg-[#F4F3EE]/90 border border-[#D0C6BB]/75 rounded-2xl p-4 flex items-start gap-3 text-xs text-[#5A6B63] leading-relaxed">
            <Info className="w-5 h-5 text-[#B59269] flex-shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <strong className="text-[#1B382E] font-bold block text-sm">
                💡 기업 휴양소(협약 회원사) 객실 매출 '0원(후정산 대기)' 집계 기준 안내
              </strong>
              <p>
                기업 하계/연중 휴양소(서원대학교, 한양대학교, 현대제철, 베네피아 등)는 개별 임직원이 퇴실 시 현장에서 결제하지 않고, 기업 본사/총무팀 및 제휴 복지몰과 <strong>사후 월정산/시즌정산(B2B 외상 후불 청구)</strong>으로 일괄 정산됩니다.
              </p>
              <p>
                백엔드 데이터 파이프라인의 실시간 매출 집계는 <strong>실제 수납(결제 완료)이 마감된 건(`정산 완료`, {formatNum(completedCorpCount)}건 / {corpFitSummary?.totalRevenueFormatted || formatNum(corpFitSummary?.totalRevenue || 0)}원)</strong>만 우선 집계하며, 세금계산서 청구 전인 건은 <strong>`후정산 청구 대기`({formatNum(pendingCorpCount)}건)</strong>로 관리됩니다.
              </p>
              <p className="text-[#1E523F] font-semibold">
                👉 실매출이 발생한 내역을 우선 확인하시려면 상단 필터의 <strong>[정산 완료]</strong> 탭 또는 <strong>[매출 높은 순]</strong> 정렬을 클릭하십시오.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: 디지털 온라인/모바일 회원 부문별 교차 이용 & 최근 활동 회원 원장 */}
      <div className="bg-white rounded-3xl p-6 lg:p-7 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] hover:shadow-[0_12px_32px_rgba(40,79,66,0.1)] transition-all duration-300 relative group space-y-6">
        <div className="border-b border-[#D0C6BB]/40 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#1B382E]/5 text-[#1B382E] border border-[#D0C6BB]/60">
              DIGITAL ONLINE MEMBERSHIP & CRM LEDGER
            </span>
            <span className="text-xs text-[#5A6B63] font-mono">
              API: /api/v6/report/online-members
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#1B382E] mt-1.5 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#284F42]" />
            온라인·모바일 통합 회원 부문별 이용 분포 및 최근 활동 회원 명단
          </h2>
          <p className="text-xs text-[#5A6B63] mt-1">
            홈페이지 및 모바일 앱 통합 회원({formatNum(onlineSummary?.totalCumulativeMembers || 0)}명)의 부문별(객실·골프·레저·교차이용) 분포와 최근 예약/이용 활동 내역입니다.
          </p>
        </div>

        {/* 부문별 온라인 회원 분포 4대 카드 */}
        {onlineChannelBreakdown && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-financial">
            <div className="p-4 rounded-2xl bg-[#284F42] text-white shadow-xs">
              <div className="flex items-center justify-between text-xs text-[#E8F2EE] font-bold">
                <span>다부문 교차 이용 VIP 회원</span>
                <span className="bg-white/15 text-[#B59269] px-2 py-0.5 rounded-full">
                  {onlineChannelBreakdown.multiChannelRatio ?? 0}%
                </span>
              </div>
              <div className="text-2xl font-black text-[#F4F3EE] mt-1.5">
                {formatNum(onlineChannelBreakdown.multiChannel || 0)}명
              </div>
              <div className="text-[11px] text-[#E8F2EE]/80 mt-1">
                객실·골프·레저 중 2개 부문 이상 복합 이용
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#F4F3EE]/80 border border-[#D0C6BB]/60">
              <div className="flex items-center justify-between text-xs text-[#5A6B63] font-bold">
                <span>객실(콘도) 전용 이용 회원</span>
                <span className="bg-[#E8F2EE] text-[#1E523F] px-2 py-0.5 rounded-full border border-[#B4C6C1]/70">
                  {onlineChannelBreakdown.roomOnlyRatio ?? 0}%
                </span>
              </div>
              <div className="text-2xl font-black text-[#1B382E] mt-1.5">
                {formatNum(onlineChannelBreakdown.roomOnly || 0)}명
              </div>
              <div className="text-[11px] text-[#5A6B63] mt-1">
                공식 홈페이지/앱 객실 예약 회원
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#F4F3EE]/80 border border-[#D0C6BB]/60">
              <div className="flex items-center justify-between text-xs text-[#5A6B63] font-bold">
                <span>레저/티켓 전용 이용 회원</span>
                <span className="bg-[#B59269]/15 text-[#B59269] px-2 py-0.5 rounded-full border border-[#B59269]/30">
                  {onlineChannelBreakdown.ticketOnlyRatio ?? 0}%
                </span>
              </div>
              <div className="text-2xl font-black text-[#1B382E] mt-1.5">
                {formatNum(onlineChannelBreakdown.ticketOnly || 0)}명
              </div>
              <div className="text-[11px] text-[#5A6B63] mt-1">
                루지·목장·썰매장 등 온라인 티켓 구매 회원
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#F4F3EE]/80 border border-[#D0C6BB]/60">
              <div className="flex items-center justify-between text-xs text-[#5A6B63] font-bold">
                <span>골프 예약 전용 회원</span>
                <span className="bg-[#284F42]/10 text-[#284F42] px-2 py-0.5 rounded-full border border-[#284F42]/20">
                  {onlineChannelBreakdown.golfOnlyRatio ?? 0}%
                </span>
              </div>
              <div className="text-2xl font-black text-[#1B382E] mt-1.5">
                {formatNum(onlineChannelBreakdown.golfOnly || 0)}명
              </div>
              <div className="text-[11px] text-[#5A6B63] mt-1">
                벨포레 골프 CC 온라인 부킹 회원
              </div>
            </div>
          </div>
        )}

        {/* 최근 활동 온라인 회원 테이블 */}
        <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
          <table className="w-full border-collapse text-left text-sm font-financial min-w-[850px]">
            <thead className="sticky top-0 z-10 bg-[#F4F3EE]">
              <tr className="border-b border-[#D0C6BB]/75 text-xs font-bold text-[#1B382E]">
                <th className="py-3 px-4 text-left">고객번호</th>
                <th className="py-3 px-4 text-left">회원명</th>
                <th className="py-3 px-4 text-left">온라인 ID</th>
                <th className="py-3 px-4 text-left">연락처</th>
                <th className="py-3 px-3 text-center">주력 이용 부문</th>
                <th className="py-3 px-4 text-left">최초 이용일</th>
                <th className="py-3 px-4 text-left">최근 이용일</th>
                <th className="py-3 px-4 text-right">누적 예약/결제 건수</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D0C6BB]/30">
              {recentOnlineMembers.length > 0 ? (
                recentOnlineMembers.slice(0, 20).map((m, idx) => (
                  <tr key={idx} className="hover:bg-[#F4F3EE]/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-[#5A6B63]">{m.custNo || '-'}</td>
                    <td className="py-3 px-4 font-extrabold text-[#1B382E]">{m.custName || '-'}</td>
                    <td className="py-3 px-4 text-[#5A6B63] font-mono text-xs">{m.onlineId || '-'}</td>
                    <td className="py-3 px-4 text-[#5A6B63]">{m.phone || '-'}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#1B382E]/5 text-[#1B382E] border border-[#D0C6BB]/60">
                        {m.channelSource || m.firstChannel || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#5A6B63]">{m.firstActivityDate || '-'}</td>
                    <td className="py-3 px-4 font-semibold text-[#1B382E]">{m.lastActivityDate || '-'}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-[#284F42]">
                      {formatNum(m.totalBookings || 0)}건
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[#5A6B63]">
                    최근 활동 온라인 회원 내역이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 5: [Ticket 28 완제품] 콘도 분양회원 구좌별 연간 잔여박수 소진율 및 당일 방문 회원별 리조트 통합 LTV 원장 */}
      <div className="bg-white rounded-3xl p-6 lg:p-7 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] hover:shadow-[0_12px_32px_rgba(40,79,66,0.1)] transition-all duration-300 relative group space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#D0C6BB]/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#1E523F] bg-[#E8F2EE] border border-[#B4C6C1]/70 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 size={12} /> 회원 분석 집계 완료
              </span>
            </div>
            <h2 className="text-xl font-bold text-[#1B382E] mt-1.5 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#284F42]" />
              콘도 분양회원 구좌별 연간 잔여박수 소진율 및 당일 방문 회원별 리조트 통합 LTV 원장
            </h2>
            <p className="text-xs text-[#5A6B63] mt-1">
              기명·무기명·창립·법인 825개 분양구좌의 연간 부여 박수(Quota 41,190박) 실시간 소진율과, 조회기간 투숙/방문 회원의 객실·골프·식음·레저 통합 LTV 원장입니다.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2 text-xs font-bold text-[#1E523F] bg-[#E8F2EE] px-4 py-2.5 rounded-xl border border-[#B4C6C1]/70">
            <Layers size={15} className="text-[#284F42]" />
            <span>회계 및 정산 무결성 검증</span>
          </div>
        </div>

        {quotaLtvData ? (
          <div className="space-y-6">
            {/* 1. 분양구좌 전체 개요 4대 KPI 요약 카드 */}
            {quotaLtvData.accountQuotaOverview && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-financial">
                <div className="p-4 rounded-2xl bg-[#284F42] text-white shadow-xs">
                  <div className="flex items-center justify-between text-xs text-[#E8F2EE] font-bold">
                    <span>전체 분양구좌 수</span>
                    <span className="bg-white/15 text-[#B59269] px-2 py-0.5 rounded-full text-[11px]">
                      활성율 {(quotaLtvData.accountQuotaOverview as any).activeRatePct != null ? `${(quotaLtvData.accountQuotaOverview as any).activeRatePct}%` : '-'}
                    </span>
                  </div>
                  <div className="text-2xl font-black text-white mt-1.5 tabular-nums">
                    {formatNum(quotaLtvData.accountQuotaOverview.totalAccounts)}구좌
                  </div>
                  <div className="text-[11px] text-[#E8F2EE]/80 mt-1">
                    실 이용 구좌: {formatNum(quotaLtvData.accountQuotaOverview.activeAccounts)}구좌
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#F4F3EE]/80 border border-[#D0C6BB]/60">
                  <div className="flex items-center justify-between text-xs text-[#5A6B63] font-bold">
                    <span>연간 총 부여 박수 (Quota)</span>
                    <span className="bg-[#D0C6BB]/40 text-[#1B382E] px-2 py-0.5 rounded-full text-[11px]">
                      연간 기준
                    </span>
                  </div>
                  <div className="text-2xl font-black text-[#1B382E] mt-1.5 tabular-nums">
                    {formatNum(quotaLtvData.accountQuotaOverview.quotaNights)}박
                  </div>
                  <div className="text-[11px] text-[#5A6B63] mt-1">
                    잔여 박수: {formatNum(quotaLtvData.accountQuotaOverview.remainingNights)}박
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#E8F2EE] border border-[#B4C6C1]/70">
                  <div className="flex items-center justify-between text-xs text-[#1E523F] font-bold">
                    <span>연간 누적 박수 소진율</span>
                    <span className="bg-[#1E523F]/15 text-[#1E523F] px-2 py-0.5 rounded-full text-[11px] font-bold">
                      {quotaLtvData.accountQuotaOverview.burnRatePct ?? 0}% 소진
                    </span>
                  </div>
                  <div className="text-2xl font-black text-[#1E523F] mt-1.5 tabular-nums">
                    {formatNum(quotaLtvData.accountQuotaOverview.usedNights)}박 소진
                  </div>
                  <div className="text-[11px] text-[#1E523F]/80 mt-1">
                    전체 부여 41,190박 중 실 투숙 소진분
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#B59269]/10 border border-[#B59269]/30">
                  <div className="flex items-center justify-between text-xs text-[#B59269] font-bold">
                    <span>분양회원 연간 누적 통합 LTV</span>
                    <span className="bg-[#B59269]/20 text-[#B59269] px-2 py-0.5 rounded-full text-[11px] font-bold">
                      리조트 전체
                    </span>
                  </div>
                  <div className="text-2xl font-black text-[#1B382E] mt-1.5 tabular-nums">
                    {formatNum(quotaLtvData.accountQuotaOverview.ytdTotalSpend)}원
                  </div>
                  <div className="text-[11px] text-[#5A6B63] mt-1 truncate" title={`골프 ${formatNum(quotaLtvData.accountQuotaOverview.ytdGolfSpend)}원 · 객실 ${formatNum(quotaLtvData.accountQuotaOverview.ytdRoomSpend)}원`}>
                    골프 {formatNum(quotaLtvData.accountQuotaOverview.ytdGolfSpend)}원 · 객실 {formatNum(quotaLtvData.accountQuotaOverview.ytdRoomSpend)}원
                  </div>
                </div>
              </div>
            )}

            {/* 2. 분양 회원권 구분별 연간 부여박수 소진율 및 LTV 매트릭스 표 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#1B382E] flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-[#B59269]" />
                  분양 회원권 구분별(기명·무기명·창립·법인) 연간 부여박수 소진율 및 LTV 매트릭스
                </h3>
                <span className="text-[11px] text-[#5A6B63] font-medium">단위: 구좌, 박, 원</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm font-financial min-w-[960px]">
                  <thead>
                    <tr className="border-b border-[#D0C6BB]/75 text-xs font-bold text-[#1B382E] bg-[#F4F3EE]">
                      <th className="py-3 px-4 text-left">회원권 구분</th>
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
                  <tbody className="divide-y divide-[#D0C6BB]/30">
                    {quotaLtvData.accountQuotaSummary
                      .filter((row: any) => !row.isGrandTotal)
                      .map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-[#F4F3EE]/50 transition-colors">
                          <td className="py-3 px-4 font-bold text-[#1B382E]">
                            {row.accountTypeKo || row.accountType}
                          </td>
                          <td className="py-3 px-3 text-right text-[#1B382E] font-semibold">
                            {formatNum(row.totalAccounts)}구좌
                          </td>
                          <td className="py-3 px-3 text-right text-[#5A6B63]">
                            {formatNum(row.activeAccounts)}구좌
                          </td>
                          <td className="py-3 px-3 text-right text-[#5A6B63]">
                            {formatNum(row.annualQuotaNights ?? row.quotaNights)}박
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-[#1E523F]">
                            {formatNum(row.ytdUsedNights ?? row.usedNights)}박
                          </td>
                          <td className="py-3 px-3 text-right text-[#5A6B63]">
                            {formatNum(row.remainingNights)}박
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-[#1E523F]">
                            {row.burnRatePct ?? row.exhaustionRate ?? 0}%
                          </td>
                          <td className="py-3 px-3 text-right text-[#5A6B63]">
                            {formatNum(row.ytdVisitCount)}회
                          </td>
                          <td className="py-3 px-4 text-right font-black text-[#1B382E]">
                            {formatNum(row.ytdTotalSpend)}원
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-[#5A6B63]">
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
                        <tr key={idx} className="bg-[#284F42] text-white font-bold text-sm border-t-2 border-[#1B382E]">
                          <td className="py-3.5 px-4">총합계</td>
                          <td className="py-3.5 px-3 text-right text-[#B59269] font-black">
                            {formatNum(row.totalAccounts)}구좌
                          </td>
                          <td className="py-3.5 px-3 text-right text-[#E8F2EE]">
                            {formatNum(row.activeAccounts)}구좌
                          </td>
                          <td className="py-3.5 px-3 text-right text-[#E8F2EE]">
                            {formatNum(row.annualQuotaNights ?? row.quotaNights)}박
                          </td>
                          <td className="py-3.5 px-3 text-right text-[#5FB878] font-black">
                            {formatNum(row.ytdUsedNights ?? row.usedNights)}박
                          </td>
                          <td className="py-3.5 px-3 text-right text-[#E8F2EE]">
                            {formatNum(row.remainingNights)}박
                          </td>
                          <td className="py-3.5 px-3 text-right text-[#5FB878] font-black">
                            {row.burnRatePct ?? row.exhaustionRate ?? 0}%
                          </td>
                          <td className="py-3.5 px-3 text-right text-[#E8F2EE]">
                            {formatNum(row.ytdVisitCount)}회
                          </td>
                          <td className="py-3.5 px-4 text-right text-[#B59269] font-black">
                            {formatNum(row.ytdTotalSpend)}원
                          </td>
                          <td className="py-3.5 px-4 text-right text-[#E8F2EE]">
                            {formatNum(row.avgLtvPerAccount)}원
                          </td>
                        </tr>
                      ))}
                  </tfoot>
                </table>
              </div>
            </div>

            {/* 3. 당일/기간 방문 분양회원 개인별 통합 LTV 원장 (검색 및 필터 지원) */}
            <div className="space-y-4 pt-4 border-t border-[#D0C6BB]/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-[#1B382E] flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-[#284F42]" />
                    당일/기간 투숙 분양회원 개인별 리조트 통합 LTV 원장
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#1B382E]/5 text-[#1B382E] border border-[#D0C6BB]/60">
                      실시간 {quotaLtvData.visitedMembersLedger?.length || 0}건
                    </span>
                  </h3>
                  <p className="text-xs text-[#5A6B63] mt-0.5">
                    조회 기간 동안 체크인/이용한 분양회원의 구좌 번호, 평형, 소진율 및 크로스 소비(골프·객실·F&B·레저) 내역입니다.
                  </p>
                </div>

                {/* 검색창 & 필터 버튼 */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-[#5A6B63] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="회원명, 구좌번호 검색..."
                      value={memberLedgerSearch}
                      onChange={(e) => setMemberLedgerSearch(e.target.value)}
                      className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#D0C6BB] bg-white focus:outline-none focus:border-[#284F42] w-44"
                    />
                  </div>
                  <div className="flex items-center gap-1 bg-[#F4F3EE] p-1 rounded-xl text-xs font-medium border border-[#D0C6BB]/50">
                    {['ALL', '법인', '기명', '무기명', '창립'].map((f) => (
                      <button
                        key={f}
                        onClick={() => setMemberLedgerFilter(f)}
                        className={`px-2.5 py-1 rounded-lg transition-colors ${
                          memberLedgerFilter === f
                            ? 'bg-[#284F42] text-white font-bold shadow-2xs'
                            : 'text-[#5A6B63] hover:text-[#1B382E]'
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
                  <thead className="sticky top-0 z-10 bg-[#F4F3EE] shadow-2xs">
                    <tr className="border-b border-[#D0C6BB]/75 text-xs font-bold text-[#1B382E]">
                      <th className="py-3 px-4 text-left">구좌번호</th>
                      <th className="py-3 px-4 text-left">회원명</th>
                      <th className="py-3 px-3 text-center">회원 구분</th>
                      <th className="py-3 px-3 text-center">구좌 형태</th>
                      <th className="py-3 px-3 text-center">객실 평형</th>
                      <th className="py-3 px-3 text-right">부여/소진/잔여</th>
                      <th className="py-3 px-3 text-right">소진율</th>
                      <th className="py-3 px-4 text-right">기간 이용액</th>
                      <th className="py-3 px-4 text-right">연간 누적 통합 LTV</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D0C6BB]/30">
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
                          <tr key={idx} className="hover:bg-[#F4F3EE]/50 transition-colors">
                            <td className="py-3 px-4 font-mono text-xs font-bold text-[#5A6B63]">
                              {m.membershipNo || m.certNo || '-'}
                            </td>
                            <td className="py-3 px-4 font-black text-[#1B382E]">
                              {m.memberName || '-'}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                                String(m.accountType || '').includes('법인')
                                  ? 'bg-[#1B382E]/5 text-[#1B382E] border-[#D0C6BB]/60'
                                  : String(m.accountType || '').includes('무기명')
                                  ? 'bg-[#B59269]/15 text-[#B59269] border-[#B59269]/30'
                                  : 'bg-[#E8F2EE] text-[#1E523F] border-[#B4C6C1]/70'
                              }`}>
                                {m.accountTypeKo || m.accountType || '-'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center text-xs text-[#5A6B63]">
                              {m.shareType || '-'}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#F4F3EE] text-[#1B382E] border border-[#D0C6BB]/50">
                                {m.roomType || '-'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right text-xs tabular-nums text-[#5A6B63]">
                              <span>{formatNum(m.annualQuotaNights ?? m.quotaNights)}박 / </span>
                              <span className="font-bold text-[#1E523F]">{formatNum(m.ytdUsedNights ?? m.usedNights)}박 / </span>
                              <span className="text-[#5A6B63]/70">{formatNum(m.remainingNights)}박</span>
                            </td>
                            <td className="py-3 px-3 text-right font-black text-[#1E523F] text-xs">
                              {m.burnRatePct ?? m.exhaustionRate ?? 0}%
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-[#1B382E] tabular-nums">
                              {formatNum(m.periodTotalSpend || 0)}원
                            </td>
                            <td className="py-3 px-4 text-right tabular-nums">
                              <div className="font-black text-[#284F42] text-sm">
                                {formatNum(m.ytdTotalSpend || m.totalLtv || 0)}원
                              </div>
                              <div className="text-[10px] text-[#5A6B63] font-medium">
                                골프 {formatNum(golfSpend)}원 · 객실 {formatNum(roomSpend)}원
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    {(!quotaLtvData.visitedMembersLedger || quotaLtvData.visitedMembersLedger.length === 0) && (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-[#5A6B63]">
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
          <div className="py-12 text-center text-[#5A6B63] text-xs">
            분양회원 구좌별 소진율 및 통합 LTV 데이터를 불러오는 중입니다...
          </div>
        )}
      </div>

      {/* [Ticket 35] 디지털 온라인 회원 이용횟수 등급별 분포 및 6개월 미방문 휴면 단골(Win-back) 리텐션 분석 */}
      <div className="bg-white rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] hover:shadow-[0_12px_32px_rgba(40,79,66,0.1)] transition-all duration-300 relative group overflow-hidden">
        <div className="p-6 border-b border-[#D0C6BB]/40 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#F4F3EE]/40">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-[#284F42] text-white shadow-xs shrink-0 mt-0.5">
              <Smartphone size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-extrabold text-[#1B382E]">
                  온라인 통합 회원 이용횟수 등급별 분포 및 6개월 미방문 휴면 단골(Win-back) 리텐션
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]/70">
                  온라인 회원 분석
                </span>
              </div>
              <p className="text-xs text-[#5A6B63] mt-1">
                디지털 온라인 회원 데이터베이스의 누적 방문 횟수 등급(1회 단발 · 2~3회 재방문 · 4~9회 단골 · 10회+ 충성고객)과 최근 6개월 이상 미방문 휴면 단골(Win-back 핀셋 타겟)을 추적합니다.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onlineDormancyIntel ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]/70">
                <CheckCircle2 size={14} />
                정규 마트 연동 완료
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#FDF0ED] text-[#8B2635] border border-[#EAC5BD]/70">
                Fail-Stop · 조회 구간 데이터 없음 (/api/v6/report/online-member-dormancy)
              </span>
            )}
          </div>
        </div>

        {!onlineDormancyIntel ? (
          <div className="p-8 bg-[#F4F3EE]/60">
            <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-dashed border-[#D0C6BB] p-6 text-center space-y-3">
              <h4 className="text-sm font-extrabold text-[#1B382E]">
                [Zero-Fake / Fail-Stop] 온라인 단골 휴면(Churn Risk) 및 Win-back 타겟 조회 데이터 없음
              </h4>
              <p className="text-xs text-[#5A6B63] leading-relaxed">
                백엔드 <code className="px-1.5 py-0.5 bg-[#F4F3EE] rounded text-[#1B382E] font-mono border border-[#D0C6BB]/50">GET /api/v6/report/online-member-dormancy</code> 응답 데이터가 없거나 비어 있을 경우 클라이언트 임의 추론이나 가짜 숫자를 생성하지 않고 <strong>Fail-Stop(결함 노출)</strong> 상태를 유지합니다.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 text-left">
                <div className="p-3.5 rounded-xl bg-[#F4F3EE]/80 border border-[#D0C6BB]/60">
                  <div className="text-[11px] font-bold text-[#5A6B63]">단골 회원 (4~9회 방문)</div>
                  <div className="text-base font-black text-[#5A6B63] mt-1">-</div>
                  <div className="text-[10px] text-[#5A6B63] mt-0.5">6개월 미방문 휴면 비율 집계 대기</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#F4F3EE]/80 border border-[#D0C6BB]/60">
                  <div className="text-[11px] font-bold text-[#5A6B63]">충성 고객 (10회+ 방문)</div>
                  <div className="text-base font-black text-[#5A6B63] mt-1">-</div>
                  <div className="text-[10px] text-[#5A6B63] mt-0.5">최상위 VIP 이탈 감지 대기</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#F4F3EE]/80 border border-[#D0C6BB]/60">
                  <div className="text-[11px] font-bold text-[#5A6B63]">핀셋 Win-back 타겟 모수</div>
                  <div className="text-base font-black text-[#5A6B63] mt-1">-</div>
                  <div className="text-[10px] text-[#5A6B63] mt-0.5">4회+ 방문 후 6개월 미방문 단골</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#F4F3EE]/80 border border-[#D0C6BB]/60">
                  <div className="text-[11px] font-bold text-[#5A6B63]">최근 6개월 활성 유지율</div>
                  <div className="text-base font-black text-[#5A6B63] mt-1">-</div>
                  <div className="text-[10px] text-[#5A6B63] mt-0.5">등급별 리텐션 코호트 집계 대기</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-[#F4F3EE]/80 border border-[#D0C6BB]/60">
                <div className="text-xs font-bold text-[#5A6B63]">전체 온라인 통합 회원</div>
                <div className="text-xl font-black text-[#1B382E] mt-1">
                  {(onlineDormancyIntel.summary?.totalOnlineMembers ?? onlineDormancyIntel.summary?.totalMembers) != null ? `${formatNum(onlineDormancyIntel.summary?.totalOnlineMembers ?? onlineDormancyIntel.summary?.totalMembers)}명` : '-'}
                </div>
                <div className="text-[11px] text-[#5A6B63] mt-1">
                  최근 6개월 활성: {(onlineDormancyIntel.summary?.activeMembers ?? onlineDormancyIntel.summary?.activeWithin6m) != null ? `${formatNum(onlineDormancyIntel.summary?.activeMembers ?? onlineDormancyIntel.summary?.activeWithin6m)}명` : '-'}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-[#FDF0ED] border border-[#EAC5BD]/70">
                <div className="text-xs font-bold text-[#8B2635]">단골 회원 (4~9회 방문) 휴면율</div>
                <div className="text-xl font-black text-[#8B2635] mt-1">
                  {(onlineDormancyIntel.summary?.regularDormantRatePct ?? onlineDormancyIntel.tiers?.[2]?.dormancyRate ?? onlineDormancyIntel.tiers?.[2]?.dormantRatePct) != null ? `${onlineDormancyIntel.summary?.regularDormantRatePct ?? onlineDormancyIntel.tiers?.[2]?.dormancyRate ?? onlineDormancyIntel.tiers?.[2]?.dormantRatePct}%` : '-'}
                </div>
                <div className="text-[11px] text-[#8B2635]/80 mt-1">
                  휴면 단골: {onlineDormancyIntel.summary?.regularDormantCount != null ? `${formatNum(onlineDormancyIntel.summary.regularDormantCount)}명` : '-'}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-[#B59269]/10 border border-[#B59269]/30">
                <div className="text-xs font-bold text-[#B59269]">충성 고객 (10회+ 방문) 휴면율</div>
                <div className="text-xl font-black text-[#B59269] mt-1">
                  {(onlineDormancyIntel.summary?.loyalDormantRatePct ?? onlineDormancyIntel.tiers?.[3]?.dormancyRate ?? onlineDormancyIntel.tiers?.[3]?.dormantRatePct) != null ? `${onlineDormancyIntel.summary?.loyalDormantRatePct ?? onlineDormancyIntel.tiers?.[3]?.dormancyRate ?? onlineDormancyIntel.tiers?.[3]?.dormantRatePct}%` : '-'}
                </div>
                <div className="text-[11px] text-[#B59269]/80 mt-1">
                  휴면 충성고객: {onlineDormancyIntel.summary?.loyalDormantCount != null ? `${formatNum(onlineDormancyIntel.summary.loyalDormantCount)}명` : '-'}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-[#284F42]/10 border border-[#284F42]/20">
                <div className="text-xs font-bold text-[#284F42]">핵심 단골 Win-back 핀셋 타겟</div>
                <div className="text-xl font-black text-[#284F42] mt-1">
                  {(onlineDormancyIntel.summary?.winbackTargetsTotal ?? onlineDormancyIntel.summary?.winbackTargetCount) != null ? `${formatNum(onlineDormancyIntel.summary?.winbackTargetsTotal ?? onlineDormancyIntel.summary?.winbackTargetCount)}명` : '-'}
                </div>
                <div className="text-[11px] text-[#284F42]/80 mt-1">
                  4회 이상 방문 이력 보유 · 6개월 미방문
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
